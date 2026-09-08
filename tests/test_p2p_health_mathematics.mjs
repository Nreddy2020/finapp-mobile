/**
 * tests/test_p2p_health_mathematics.mjs
 * 
 * FinLife P2P Network — Deterministic Fixed-Point Relationship Health Mathematics Suite.
 * 
 * Verifies:
 * 1. Basis points arithmetic (zero floating-point operations).
 * 2. Mandatory zero-loan rule: Zero active + zero historical -> NO_DATA (score: null, display: '--').
 * 3. All historical settled rule: Zero active + all historical settled -> ALL_SETTLED (score: 100, display: '100%').
 * 4. Active loans with on-time vs overdue schedule items.
 * 5. Deterministic half-up integer division rounding.
 * 6. Source-unavailable handling.
 * 7. Deterministic multi-factor counterparty sorting (Risk -> Net Balance -> Name).
 */

import assert from 'assert';
import {
    computePortfolioHealth,
    sortCounterpartiesDeterministically,
    HEALTH_WEIGHTS,
    HEALTH_THRESHOLDS,
    HEALTH_CATEGORY
} from '../components/p2p/p2pHealthEngine.js';
import { P2P_STATE } from '../components/p2p/p2pContracts.js';
import { LOAN_STATUS } from '../components/p2p/p2pDomainModel.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
    total++;
    try {
        fn();
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${desc}`);
        console.error(err);
        throw err;
    }
}

export function runHealthMathematicsTests() {
    passed = 0;
    total = 0;

    // 1. Basis Points Weights & Scale Freeze
    it('Health engine weights strictly sum to 10,000 basis points (100%)', () => {
        const sum = HEALTH_WEIGHTS.WEIGHT_ONTIME_BPS + HEALTH_WEIGHTS.WEIGHT_OVERDUE_BPS + HEALTH_WEIGHTS.WEIGHT_RISK_BPS;
        assert.strictEqual(sum, 10000n);
        assert.strictEqual(HEALTH_WEIGHTS.SCALE_BPS, 10000n);
    });

    // 2. Mandatory Zero-Loan Rule: No Data must NEVER appear as 100% healthy
    it('No active and no historical loans returns state NO_DATA with null score and display "--"', () => {
        const res = computePortfolioHealth([]);
        assert.strictEqual(res.state, P2P_STATE.NO_DATA);
        assert.strictEqual(res.score, null);
        assert.strictEqual(res.scoreBps, null);
        assert.strictEqual(res.displayPct, '--');
        assert.strictEqual(res.category, HEALTH_CATEGORY.NO_DATA);
    });

    // 3. All Historical Settled Rule: Settled relationships exhibit 100% health
    it('Zero active loans where all historical loans are SETTLED returns ALL_SETTLED and 100%', () => {
        const loans = [
            { id: 'loan_s1', status: LOAN_STATUS.SETTLED, personId: 'p1' },
            { id: 'loan_s2', status: LOAN_STATUS.SETTLED, personId: 'p2' }
        ];

        const res = computePortfolioHealth(loans, [], {});
        assert.strictEqual(res.state, 'ALL_SETTLED');
        assert.strictEqual(res.score, 100);
        assert.strictEqual(res.scoreBps, 10000n);
        assert.strictEqual(res.displayPct, '100%');
        assert.strictEqual(res.category, HEALTH_CATEGORY.HEALTHY);
        assert.strictEqual(res.settledCount, 2);
    });

    // 4. Fully On-Time Active Portfolio
    it('Active loans with 100% on-time installments achieve 10,000 bps (100%)', () => {
        const asOfDate = '2026-06-01';
        const loans = [
            { id: 'l1', status: LOAN_STATUS.ACTIVE, personId: 'p1' }
        ];
        const schedules = {
            l1: [
                { id: 's1', dueDate: '2026-05-01', status: 'PAID' },
                { id: 's2', dueDate: '2026-06-01', status: 'PAID' },
                { id: 's3', dueDate: '2026-07-01', status: 'PENDING' }
            ]
        };

        const res = computePortfolioHealth(loans, [], schedules, asOfDate);
        assert.strictEqual(res.state, 'ACTIVE');
        assert.strictEqual(res.score, 100);
        assert.strictEqual(res.scoreBps, 10000n);
        assert.strictEqual(res.category, HEALTH_CATEGORY.HEALTHY);
    });

    // 5. Mixed Overdue Portfolio with Mathematical Determinism
    it('Portfolio with overdue installments penalizes score according to basis-point formula', () => {
        const asOfDate = '2026-06-01';
        const loans = [
            { id: 'l1', status: LOAN_STATUS.ACTIVE, personId: 'p1' },
            { id: 'l2', status: LOAN_STATUS.ACTIVE, personId: 'p2' }
        ];
        // l1 has 1 overdue item; l2 has 0 overdue items
        const schedules = {
            l1: [
                { id: 's1', dueDate: '2026-05-01', status: 'PENDING' }, // Overdue!
                { id: 's2', dueDate: '2026-07-01', status: 'PENDING' }  // Upcoming
            ],
            l2: [
                { id: 's3', dueDate: '2026-05-01', status: 'PAID' },    // On-time
                { id: 's4', dueDate: '2026-07-01', status: 'PENDING' }  // Upcoming
            ]
        };

        const res = computePortfolioHealth(loans, [], schedules, asOfDate);
        // Total items: 4. On-time: 3, Overdue: 1.
        // rOnTimeBps = (3 * 10000) / 4 = 7500 bps
        // rOverdueBps = (1 * 10000) / 4 = 2500 bps
        // rRiskBps = (1 overdue loan / 2 active loans) = 5000 bps
        // Weighted calculation:
        // termOntime = 5000 * 7500 = 37,500,000
        // termOverdue = 3000 * (10000 - 2500) = 3000 * 7500 = 22,500,000
        // termRisk = 2000 * (10000 - 5000) = 2000 * 5000 = 10,000,000
        // sum = 70,000,000
        // scoreBps = 70,000,000 / 10,000 = 7000 bps
        // scorePct = roundHalfUp(7000, 100) = 70%
        assert.strictEqual(res.scoreBps, 7000n);
        assert.strictEqual(res.score, 70);
        assert.strictEqual(res.displayPct, '70%');
        assert.strictEqual(res.category, HEALTH_CATEGORY.NEED_FOLLOW_UP);
    });

    // 6. Severely Distressed Portfolio (<50% -> AT_RISK)
    it('Severely distressed portfolio with all loans overdue triggers AT_RISK category', () => {
        const asOfDate = '2026-06-01';
        const loans = [
            { id: 'l1', status: LOAN_STATUS.ACTIVE, personId: 'p1' }
        ];
        const schedules = {
            l1: [
                { id: 's1', dueDate: '2026-04-01', status: 'OVERDUE' },
                { id: 's2', dueDate: '2026-05-01', status: 'OVERDUE' }
            ]
        };

        const res = computePortfolioHealth(loans, [], schedules, asOfDate);
        // OnTime = 0, Overdue = 2/2 (10000 bps), Risk = 1/1 (10000 bps)
        // Score = 0 bps -> 0%
        assert.strictEqual(res.score, 0);
        assert.strictEqual(res.category, HEALTH_CATEGORY.AT_RISK);
    });

    // 7. Source Unavailable Resilience
    it('Source-unavailable input returns SOURCE_UNAVAILABLE and neutral display "--"', () => {
        const res = computePortfolioHealth(null);
        assert.strictEqual(res.state, P2P_STATE.SOURCE_UNAVAILABLE);
        assert.strictEqual(res.score, null);
        assert.strictEqual(res.displayPct, '--');
    });

    // 8. Deterministic Counterparty Sorting
    it('sortCounterpartiesDeterministically orders strictly by Risk Severity -> Net Balance -> Name', () => {
        const counterparties = [
            { id: 'c1', name: 'Zoya Khan', riskCategory: HEALTH_CATEGORY.HEALTHY, netBalancePaise: 5000000n },
            { id: 'c2', name: 'Aarav Gupta', riskCategory: HEALTH_CATEGORY.AT_RISK, netBalancePaise: 1000000n },
            { id: 'c3', name: 'Bhavna Sharma', riskCategory: HEALTH_CATEGORY.AT_RISK, netBalancePaise: 2000000n },
            { id: 'c4', name: 'Alok Patel', riskCategory: HEALTH_CATEGORY.NEED_FOLLOW_UP, netBalancePaise: 8000000n }
        ];

        const sorted = sortCounterpartiesDeterministically(counterparties);
        // Expected order:
        // 1. c3: AT_RISK with 2000000n
        // 2. c2: AT_RISK with 1000000n
        // 3. c4: NEED_FOLLOW_UP with 8000000n
        // 4. c1: HEALTHY with 5000000n
        assert.strictEqual(sorted[0].id, 'c3');
        assert.strictEqual(sorted[1].id, 'c2');
        assert.strictEqual(sorted[2].id, 'c4');
        assert.strictEqual(sorted[3].id, 'c1');
    });

    return { passed, total, name: 'P2P Fixed-Point Health Mathematics' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    const res = runHealthMathematicsTests();
    console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`);
}
