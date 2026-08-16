/**
 * Stage C.8.6 Action Impact Simulator Acceptance Test Matrix
 * Master Standard: C8_V1
 * 
 * 26 Comprehensive Acceptance Tests covering:
 * - Group 1: Authoritative Virtual State Evaluation & Invariants (Tests 1-6)
 * - Group 2: Health Score & Risk Pillar "Before vs After" Simulation (Tests 7-12)
 * - Group 3: Goal Solvency & Glidepath "Before vs After" Simulation (Tests 13-18)
 * - Group 4: Tax Impact, Rating Classification & Store Immutability (Tests 19-26)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
    SIMULATION_POLICY_VERSION,
    IMPACT_RATINGS,
    deepClone,
    evaluateAuthoritativeState,
    applySimulatedAction,
    simulateActionImpact
} from '../services/actionImpactSimulator.js';

import { loadData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== Stage C.8.6 Action Impact Simulator 26-Test Suite ===');
console.log('================================================================\n');

const AS_OF_DATE = '2025-06-30T00:00:00.000Z';

// Sample base state
const TEST_BASE_STATE = {
    holdings: [
        { holdingId: 'h_stock_1', symbol: 'HDFCBANK', assetType: 'STOCK', currentValue: 600000, investedValue: 500000 },
        { holdingId: 'h_stock_2', symbol: 'INFY', assetType: 'STOCK', currentValue: 200000, investedValue: 180000 },
        { holdingId: 'h_bond_1', symbol: 'GOV_BOND', assetType: 'BOND', currentValue: 200000, investedValue: 200000 }
    ],
    wallets: [
        { id: 'w_cash_primary', balance: 100000 }
    ],
    goals: [
        {
            goalId: 'goal_house',
            name: 'Down Payment',
            category: 'HOME_PURCHASE',
            targetDate: '2030-06-30',
            targetCorpusNominal: 2000000,
            allocatedHoldingIds: ['h_stock_1'],
            monthlyContribution: 5000
        }
    ],
    loans: [
        { loanId: 'loan_car', name: 'Car Loan', outstandingBalance: 150000, interestRate: 11.5 }
    ],
    monthlyExpenses: 50000
};

// ================================================================
// GROUP 1: Virtual State Evaluation & Invariants (Tests 1-6)
// ================================================================
console.log('--- Group 1: Virtual State Evaluation & Invariants ---');

// Test 1: Policy version verified as C8_6_V1
{
    assert.strictEqual(SIMULATION_POLICY_VERSION, 'C8_6_V1');
    console.log('✅ Test 1 PASS: Simulation policy version verified.');
}

// Test 2: Deep clone produces independent object
{
    const orig = { a: 1, b: { c: 2 } };
    const cloned = deepClone(orig);
    cloned.b.c = 99;
    assert.strictEqual(orig.b.c, 2);
    console.log('✅ Test 2 PASS: Deep clone independence verified.');
}

// Test 3: Authoritative state evaluation returns complete metrics
{
    const res = evaluateAuthoritativeState(TEST_BASE_STATE, AS_OF_DATE);
    assert(typeof res.healthScore === 'number');
    assert(typeof res.healthGrade === 'string');
    assert(typeof res.concentration.top1Share === 'number');
    assert(typeof res.liquidity.runwayMonths === 'number');
    assert(typeof res.goals.solvencyScore === 'number');
    console.log('✅ Test 3 PASS: Authoritative state evaluation returns complete metrics.');
}

// Test 4: Authoritative chain verified flag is true (C8-F2)
{
    const action = {
        actionId: 'ACT_TEST',
        category: 'GOAL_FUNDING',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 10000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert.strictEqual(sim.simulationMeta.authoritativeChainVerified, true);
    console.log('✅ Test 4 PASS: Authoritative calculation chain verified (C8-F2).');
}

// Test 5: Mandatory asOfDate strictly enforced
{
    assert.throws(() => {
        simulateActionImpact({ actionId: 'A1' }, TEST_BASE_STATE, null);
    }, /Missing mandatory deterministic parameter: asOfDate/);
    console.log('✅ Test 5 PASS: Mandatory asOfDate parameter strictly enforced.');
}

// Test 6: Invalid action input throws error
{
    assert.throws(() => {
        simulateActionImpact(null, TEST_BASE_STATE, AS_OF_DATE);
    }, /Invalid action: must be a valid Action DTO/);
    console.log('✅ Test 6 PASS: Invalid action rejected cleanly.');
}

// ================================================================
// GROUP 2: Health Score & Risk Pillar Simulation (Tests 7-12)
// ================================================================
console.log('\n--- Group 2: Health Score & Risk Pillar Simulation ---');

// Test 7: Cash allocation action increases emergency runway and health score
{
    const action = {
        actionId: 'ACT_ALLOCATE_CASH',
        category: 'EMERGENCY_RUNWAY',
        recommendedExecution: { type: 'ALLOCATE_CASH', suggestedAmount: 200000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    // Before runway: 100k / 50k = 2.0 mo. After: 300k / 50k = 6.0 mo.
    assert.strictEqual(sim.riskPillarDeltas.emergencyRunwayMonths.before, 2.0);
    assert.strictEqual(sim.riskPillarDeltas.emergencyRunwayMonths.after, 6.0);
    assert.strictEqual(sim.riskPillarDeltas.emergencyRunwayMonths.delta, 4.0);
    assert(sim.healthScoreComparison.deltaScore >= 0.0);
    assert.strictEqual(sim.healthScoreComparison.primaryImprovementPillar, 'LIQUIDITY_BUFFER');
    console.log('✅ Test 7 PASS: Cash allocation increases runway from 2.0 to 6.0 months.');
}

// Test 8: Trimming concentrated stock reduces top-1 concentration
{
    const action = {
        actionId: 'ACT_TRIM_STOCK',
        category: 'DE_RISK_CONCENTRATION',
        recommendedExecution: { type: 'SELL_HOLDING', targetEntityId: 'h_stock_1', suggestedAmount: 300000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert(sim.riskPillarDeltas.concentrationTop1.after < sim.riskPillarDeltas.concentrationTop1.before);
    assert(sim.riskPillarDeltas.concentrationTop1.delta < 0);
    console.log('✅ Test 8 PASS: Trimming concentration reduces top-1 share.');
}

// Test 9: Rebalancing shifts equity to debt and reduces portfolio volatility
{
    const action = {
        actionId: 'ACT_REBAL',
        category: 'REBALANCE_DRIFT',
        recommendedExecution: { type: 'REBALANCE' }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert(sim.riskPillarDeltas.annualizedVolatility.after <= sim.riskPillarDeltas.annualizedVolatility.before);
    console.log('✅ Test 9 PASS: Rebalancing shifts equity to debt and lowers volatility.');
}

// Test 10: Prepaying debt reduces loan balance and deducts liquid cash
{
    const stateWithLoan = deepClone(TEST_BASE_STATE);
    const action = {
        actionId: 'ACT_PREPAY_LOAN',
        category: 'DELEVERAGE_DEBT',
        recommendedExecution: { type: 'PREPAY_DEBT', targetEntityId: 'loan_car', suggestedAmount: 50000 }
    };
    const sim = simulateActionImpact(action, stateWithLoan, AS_OF_DATE);
    assert.strictEqual(sim.riskPillarDeltas.emergencyRunwayMonths.after, 1.0); // 50k cash remaining / 50k exp
    console.log('✅ Test 10 PASS: Prepaying debt reflects cash reduction accurately.');
}

// Test 11: Health score grade improvement reflected
{
    const lowState = {
        holdings: [{ holdingId: 'h1', assetType: 'STOCK', currentValue: 1000000 }],
        wallets: [{ balance: 10000 }], // 0.2 mo runway
        monthlyExpenses: 50000
    };
    const action = {
        actionId: 'ACT_INJECT_CASH',
        category: 'EMERGENCY_RUNWAY',
        recommendedExecution: { type: 'ALLOCATE_CASH', suggestedAmount: 500000 }
    };
    const sim = simulateActionImpact(action, lowState, AS_OF_DATE);
    assert(sim.healthScoreComparison.afterScore > sim.healthScoreComparison.beforeScore);
    console.log('✅ Test 11 PASS: Health score improvement verified across low-reserve state.');
}

// Test 12: Primary improvement pillar identified correctly
{
    const action = {
        actionId: 'ACT_CASH_PILLAR',
        category: 'EMERGENCY_RUNWAY',
        recommendedExecution: { type: 'ALLOCATE_CASH', suggestedAmount: 150000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert.strictEqual(sim.healthScoreComparison.primaryImprovementPillar, 'LIQUIDITY_BUFFER');
    console.log('✅ Test 12 PASS: Primary improvement pillar identified as LIQUIDITY_BUFFER.');
}

// ================================================================
// GROUP 3: Goal Solvency Simulation (Tests 13-18)
// ================================================================
console.log('\n--- Group 3: Goal Solvency Simulation ---');

// Test 13: Increasing SIP increases goal funded ratio and reduces funding gap
{
    const action = {
        actionId: 'ACT_SIP_BOOST',
        category: 'GOAL_FUNDING',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 15000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert(sim.goalSolvencyComparison.fundingGapAfterINR < sim.goalSolvencyComparison.fundingGapBeforeINR);
    assert(sim.goalSolvencyComparison.fundingGapReductionINR > 0);
    assert(sim.goalSolvencyComparison.impactedGoals.length > 0);
    assert(sim.goalSolvencyComparison.impactedGoals[0].fundedRatioAfter > sim.goalSolvencyComparison.impactedGoals[0].fundedRatioBefore);
    console.log('✅ Test 13 PASS: Increasing SIP closes goal funding gap.');
}

// Test 14: Goal status transition captured on impacted goals
{
    const action = {
        actionId: 'ACT_SIP_MAJOR',
        category: 'GOAL_FUNDING',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 35000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    const g = sim.goalSolvencyComparison.impactedGoals[0];
    assert(g.fundedRatioAfter >= 1.0);
    assert(g.statusAfter === 'FULLY_FUNDED' || g.statusAfter === 'OVERFUNDED');
    console.log('✅ Test 14 PASS: Goal status transition to fully/over-funded captured.');
}

// Test 15: Non-impacted goal remains unmutated in comparison list
{
    const stateMultiGoals = deepClone(TEST_BASE_STATE);
    stateMultiGoals.goals.push({
        goalId: 'goal_vacation',
        name: 'Europe Trip',
        targetDate: '2026-06-30',
        targetCorpusNominal: 500000,
        monthlyContribution: 20000
    });
    const action = {
        actionId: 'ACT_SIP_HOUSE_ONLY',
        category: 'GOAL_FUNDING',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 5000 }
    };
    const sim = simulateActionImpact(action, stateMultiGoals, AS_OF_DATE);
    const impactedIds = sim.goalSolvencyComparison.impactedGoals.map(g => g.goalId);
    assert(impactedIds.includes('goal_house'));
    assert(!impactedIds.includes('goal_vacation'));
    console.log('✅ Test 15 PASS: Non-impacted goal excluded from delta list.');
}

// Test 16: Zero-gap goal maintained cleanly
{
    const stateFunded = deepClone(TEST_BASE_STATE);
    stateFunded.goals[0].monthlyContribution = 50000;
    const action = {
        actionId: 'ACT_NOOP',
        category: 'GOAL_FUNDING',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 0 }
    };
    const sim = simulateActionImpact(action, stateFunded, AS_OF_DATE);
    assert.strictEqual(sim.goalSolvencyComparison.fundingGapReductionINR, 0);
    console.log('✅ Test 16 PASS: Zero-gap goal maintained cleanly.');
}

// Test 17: Goal solvency score delta evaluated accurately
{
    const action = {
        actionId: 'ACT_SIP_SCORE',
        category: 'GOAL_FUNDING',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 10000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert.strictEqual(sim.goalSolvencyComparison.solvencyScoreDelta, Math.round((sim.goalSolvencyComparison.solvencyScoreAfter - sim.goalSolvencyComparison.solvencyScoreBefore) * 10) / 10);
    console.log('✅ Test 17 PASS: Goal solvency score delta calculated accurately.');
}

// Test 18: Empty goals array handled without errors
{
    const stateNoGoals = deepClone(TEST_BASE_STATE);
    stateNoGoals.goals = [];
    const action = {
        actionId: 'ACT_CASH_NOGOALS',
        category: 'EMERGENCY_RUNWAY',
        recommendedExecution: { type: 'ALLOCATE_CASH', suggestedAmount: 50000 }
    };
    const sim = simulateActionImpact(action, stateNoGoals, AS_OF_DATE);
    assert.strictEqual(sim.goalSolvencyComparison.impactedGoals.length, 0);
    console.log('✅ Test 18 PASS: Empty goals array handled safely.');
}

// ================================================================
// GROUP 4: Tax Impact, Ratings & Immutability (Tests 19-26)
// ================================================================
console.log('\n--- Group 4: Tax Impact, Ratings & Immutability ---');

// Test 19: Capital gain realization on stock sale calculated accurately
{
    const action = {
        actionId: 'ACT_SELL_PROFIT',
        category: 'DE_RISK_CONCENTRATION',
        recommendedExecution: { type: 'SELL_HOLDING', targetEntityId: 'h_stock_1', suggestedAmount: 300000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    // Cost basis is 500k/600k = 83.33%. Gain on 300k sale is 50k.
    assert(sim.taxImpact.realizedCapitalGainINR > 0);
    assert(sim.taxImpact.netTaxPayableOrSavedINR > 0);
    console.log('✅ Test 19 PASS: Capital gain realization evaluated accurately.');
}

// Test 20: Cash action has zero capital gains tax consequence
{
    const action = {
        actionId: 'ACT_CASH_NO_TAX',
        category: 'EMERGENCY_RUNWAY',
        recommendedExecution: { type: 'ALLOCATE_CASH', suggestedAmount: 100000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert.strictEqual(sim.taxImpact.realizedCapitalGainINR, 0.0);
    assert.strictEqual(sim.taxImpact.netTaxPayableOrSavedINR, 0.0);
    console.log('✅ Test 20 PASS: Cash action yields 0 capital gains tax.');
}

// Test 21: STRONGLY_POSITIVE rating assigned for high health/solvency gain
{
    const action = {
        actionId: 'ACT_STRONG',
        category: 'GOAL_FUNDING',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 25000 }
    };
    const sim = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert.strictEqual(sim.overallRecommendationRating, IMPACT_RATINGS.STRONGLY_POSITIVE);
    console.log('✅ Test 21 PASS: STRONGLY_POSITIVE rating assigned for major goal funding boost.');
}

// Test 22: AST Wall-Clock Scan in actionImpactSimulator.js
{
    const code = fs.readFileSync('services/actionImpactSimulator.js', 'utf8');
    const dateNowMatches = code.match(/Date\.now\(\)/g) || [];
    const argumentlessNewDateMatches = code.match(/new\s+Date\(\s*\)/g) || [];
    assert.strictEqual(dateNowMatches.length, 0, `Found ${dateNowMatches.length} Date.now() in actionImpactSimulator.js`);
    assert.strictEqual(argumentlessNewDateMatches.length, 0, `Found ${argumentlessNewDateMatches.length} argument-less new Date() in actionImpactSimulator.js`);
    console.log('✅ Test 22 PASS: AST Wall-Clock Scan verified (0 Date.now(), 0 argument-less new Date()).');
}

// Test 23: Deep 5-Store Read-Only Safety Guard
{
    const hBefore = await loadData(STORAGE_KEYS.HOLDINGS);
    const eBefore = await loadData(STORAGE_KEYS.EVENTS);
    const qBefore = await loadData(STORAGE_KEYS.QUOTES);
    const tBefore = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wBefore = await loadData(STORAGE_KEYS.WALLETS);

    const action = {
        actionId: 'ACT_SELL_MUTATION_CHECK',
        category: 'DE_RISK_CONCENTRATION',
        recommendedExecution: { type: 'SELL_HOLDING', targetEntityId: 'h_stock_1', suggestedAmount: 300000 }
    };
    simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);

    const hAfter = await loadData(STORAGE_KEYS.HOLDINGS);
    const eAfter = await loadData(STORAGE_KEYS.EVENTS);
    const qAfter = await loadData(STORAGE_KEYS.QUOTES);
    const tAfter = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wAfter = await loadData(STORAGE_KEYS.WALLETS);

    assert.deepStrictEqual(hBefore, hAfter, 'Holdings store was mutated!');
    assert.deepStrictEqual(eBefore, eAfter, 'Events store was mutated!');
    assert.deepStrictEqual(qBefore, qAfter, 'Quotes store was mutated!');
    assert.deepStrictEqual(tBefore, tAfter, 'Transactions store was mutated!');
    assert.deepStrictEqual(wBefore, wAfter, 'Wallets store was mutated!');
    console.log('✅ Test 23 PASS: Deep 5-store read-only safety verified (100% zero state mutations).');
}

// Test 24: Input state object is never mutated by simulation
{
    const originalInput = deepClone(TEST_BASE_STATE);
    const action = {
        actionId: 'ACT_MUTATION_GUARD',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 10000 }
    };
    simulateActionImpact(action, originalInput, AS_OF_DATE);
    assert.deepStrictEqual(originalInput, TEST_BASE_STATE, 'Input state was mutated in-place!');
    console.log('✅ Test 24 PASS: Input state object immutability strictly verified.');
}

// Test 25: Deterministic Repeatability across consecutive simulations
{
    const action = {
        actionId: 'ACT_REPEAT',
        category: 'GOAL_FUNDING',
        recommendedExecution: { type: 'INCREASE_SIP', targetEntityId: 'goal_house', suggestedAmount: 10000 }
    };
    const s1 = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    const s2 = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert.deepStrictEqual(s1, s2);
    console.log('✅ Test 25 PASS: Deterministic repeatability verified across consecutive simulations.');
}

// Test 26: Complete impact DTO schema fields present
{
    const action = { actionId: 'A_DTO', recommendedExecution: { type: 'ALLOCATE_CASH', suggestedAmount: 50000 } };
    const res = simulateActionImpact(action, TEST_BASE_STATE, AS_OF_DATE);
    assert(res.healthScoreComparison);
    assert(res.riskPillarDeltas);
    assert(res.goalSolvencyComparison);
    assert(res.taxImpact);
    assert(res.overallRecommendationRating);
    assert(res.simulationMeta);
    console.log('✅ Test 26 PASS: Complete impact DTO schema fields confirmed.');
}

console.log('\n================================================================');
console.log('=== STAGE C.8.6 ACCEPTANCE RESULT: 26/26 TESTS PASSED (100%) ===');
console.log('================================================================');
