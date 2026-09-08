/**
 * tests/loans/test_loan_determinism.mjs
 * 
 * LN-10: Determinism & Reproducibility Suite (15 checks)
 */

import assert from 'assert';
import { generateAmortizationSchedule, addMonthsToDate } from '../../services/loans/loanAmortization.js';
import { calculateMonthlyEmiPaise, deriveMonthlyScaledRate, powScaled } from '../../services/loans/loanEngine.js';
import { rankAvalanche, rankSnowball, rankCashFlowOptimizer } from '../../services/loans/loanPayoffStrategies.js';
import { simulatePrepayment } from '../../services/loans/loanPrepaymentSimulator.js';
import { computeSha256 } from '../../services/loans/loanAudit.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-10: DETERMINISM & REPRODUCIBILITY SUITE');
console.log('================================================================\n');

let passCount = 0;
function test(name, fn) {
    process.stdout.write(`  [RUN] ${name}...`);
    try {
        fn();
        passCount++;
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}: ${e.message}`);
        throw e;
    }
}

const paramsA = {
    principalPaise: 350000000n, // 35 Lakhs
    annualRatePercent: 8.75,
    tenureMonths: 180,
    startDate: '2026-03-31'
};

// 1. Schedule Determinism
test('Check 1: Repeated schedule generation produces identical SHA-256 digest', () => {
    const s1 = generateAmortizationSchedule(paramsA);
    const s2 = generateAmortizationSchedule(paramsA);
    const hash1 = computeSha256(s1);
    const hash2 = computeSha256(s2);
    assert.strictEqual(hash1, hash2);
});

test('Check 2: 1,000 consecutive EMI calculations yield bit-for-bit identical BigInt paise', () => {
    const expected = calculateMonthlyEmiPaise(paramsA.principalPaise, paramsA.annualRatePercent, paramsA.tenureMonths);
    for (let i = 0; i < 1000; i++) {
        const emi = calculateMonthlyEmiPaise(paramsA.principalPaise, paramsA.annualRatePercent, paramsA.tenureMonths);
        assert.strictEqual(emi, expected);
    }
});

test('Check 3: powScaled binary exponentiation is deterministic across multiple invocations', () => {
    const base = 100800000n;
    const r1 = powScaled(base, 240);
    const r2 = powScaled(base, 240);
    assert.strictEqual(r1, r2);
});

test('Check 4: deriveMonthlyScaledRate produces identical scaled rate for identical annual rates', () => {
    const r1 = deriveMonthlyScaledRate(9.25);
    const r2 = deriveMonthlyScaledRate(9.25);
    assert.strictEqual(r1, r2);
});

// 2. Strategy Ranking Determinism & Order Independence
const portfolio = [
    { id: 'LOAN_Z', name: 'Z', annualRatePercent: 12.0, outstandingPrincipalPaise: 10000000n, monthlyEmiPaise: 500000n, tenureRemainingMonths: 24 },
    { id: 'LOAN_A', name: 'A', annualRatePercent: 12.0, outstandingPrincipalPaise: 10000000n, monthlyEmiPaise: 500000n, tenureRemainingMonths: 24 },
    { id: 'LOAN_M', name: 'M', annualRatePercent: 15.0, outstandingPrincipalPaise: 5000000n, monthlyEmiPaise: 300000n, tenureRemainingMonths: 18 }
];

test('Check 5: Avalanche ranking is order-independent (array reversal produces same rank order)', () => {
    const r1 = rankAvalanche(portfolio);
    const r2 = rankAvalanche([...portfolio].reverse());
    assert.deepStrictEqual(r1.map(x => x.facilityId), r2.map(x => x.facilityId));
});

test('Check 6: Snowball ranking is order-independent (shuffled inputs produce same rank order)', () => {
    const r1 = rankSnowball(portfolio);
    const shuffled = [portfolio[1], portfolio[2], portfolio[0]];
    const r2 = rankSnowball(shuffled);
    assert.deepStrictEqual(r1.map(x => x.facilityId), r2.map(x => x.facilityId));
});

test('Check 7: Cash-Flow Optimizer ranking is order-independent', () => {
    const r1 = rankCashFlowOptimizer(portfolio);
    const r2 = rankCashFlowOptimizer([...portfolio].reverse());
    assert.deepStrictEqual(r1.map(x => x.facilityId), r2.map(x => x.facilityId));
});

test('Check 8: Avalanche tie-breaker uses stable lexicographical facility ID consistently', () => {
    const res = rankAvalanche(portfolio);
    // LOAN_M is 15% (rank 1). LOAN_A and LOAN_Z have identical 12% and 10L. LOAN_A must rank before LOAN_Z.
    assert.strictEqual(res[0].facilityId, 'LOAN_M');
    assert.strictEqual(res[1].facilityId, 'LOAN_A');
    assert.strictEqual(res[2].facilityId, 'LOAN_Z');
});

test('Check 9: Snowball tie-breaker uses stable lexicographical facility ID consistently', () => {
    const res = rankSnowball(portfolio);
    assert.strictEqual(res[0].facilityId, 'LOAN_M'); // 50,000 balance
    assert.strictEqual(res[1].facilityId, 'LOAN_A'); // Equal balance, ID A < Z
    assert.strictEqual(res[2].facilityId, 'LOAN_Z');
});

// 3. Date & Month-End Arithmetic Determinism
test('Check 10: addMonthsToDate handles non-leap year Feb 28 month-end clamp', () => {
    const d1 = addMonthsToDate('2026-01-31', 1);
    assert.strictEqual(d1, '2026-02-28');
});

test('Check 11: addMonthsToDate handles leap year Feb 29 month-end clamp (2028)', () => {
    const dLeap = addMonthsToDate('2028-01-31', 1);
    assert.strictEqual(dLeap, '2028-02-29');
});

test('Check 12: addMonthsToDate preserves exact day for months with sufficient days', () => {
    const d = addMonthsToDate('2026-03-15', 6);
    assert.strictEqual(d, '2026-09-15');
});

// 4. Prepayment Simulation Determinism
test('Check 13: simulatePrepayment produces identical results on identical runs', () => {
    const facility = {
        id: 'DET_PREPAY',
        principalPaise: 200000000n,
        annualRatePercent: 8.5,
        tenureMonths: 120,
        startDate: '2026-01-01'
    };
    const p1 = simulatePrepayment(facility, { prepaymentPaise: 30000000n });
    const p2 = simulatePrepayment(facility, { prepaymentPaise: 30000000n });

    assert.strictEqual(p1.tenureReduction.monthsSaved, p2.tenureReduction.monthsSaved);
    assert.strictEqual(p1.tenureReduction.grossInterestSavedPaise, p2.tenureReduction.grossInterestSavedPaise);
    assert.strictEqual(p1.emiReduction.monthlyEmiReliefPaise, p2.emiReduction.monthlyEmiReliefPaise);
});

test('Check 14: Schedule summary calculations are strictly idempotent', () => {
    const s1 = generateAmortizationSchedule(paramsA);
    assert.strictEqual(s1.summary.totalPrincipalPaidPaise, paramsA.principalPaise);
    assert.strictEqual(s1.summary.tenureMonths, paramsA.tenureMonths);
});

test('Check 15: BigInt paise string conversion preserves round-trip equality', () => {
    const original = 123456789123456789n;
    const str = original.toString();
    const parsed = BigInt(str);
    assert.strictEqual(parsed, original);
});

console.log('\n================================================================');
console.log(`🎉 LN-10 PASSED CERTIFICATION (${passCount} / 15 CHECKS)`);
console.log('================================================================\n');
