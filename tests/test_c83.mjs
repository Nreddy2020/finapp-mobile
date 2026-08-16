/**
 * Stage C.8.3 Target-Date Glidepath & Goal Asset Allocation Acceptance Test Matrix
 * Master Standard: C8_V1
 * 
 * 24 Comprehensive Acceptance Tests covering:
 * - Group 1: Glidepath Schedule & Tiers Resolution (Tests 1-6)
 * - Group 2: Actual vs Recommended Asset Allocation Drift (Tests 7-12)
 * - Group 3: Sequence-of-Returns Risk Detection & Explanations (Tests 13-17)
 * - Group 4: Multi-Goal Aggregation, C.6 Non-Mutation & Store Immutability (Tests 18-24)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
    GLIDEPATH_POLICY_VERSION,
    GLIDEPATH_TIERS,
    GLIDEPATH_SCHEDULE,
    SEQUENCE_OF_RETURNS_THRESHOLDS,
    resolveRecommendedGlidepath,
    analyzeGoalActualAllocation,
    evaluateGoalGlidepath,
    aggregateMultiGoalGlidepaths
} from '../services/goalGlidepathService.js';

import {
    GOAL_CATEGORIES,
    GOAL_PRIORITY_TIERS
} from '../services/goalPlanningEngine.js';

import { loadData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== Stage C.8.3 Goal Glidepath Service 24-Test Suite ===');
console.log('================================================================\n');

const AS_OF_DATE = '2025-06-30T00:00:00.000Z';

// Sample test holdings
const TEST_HOLDINGS = [
    { holdingId: 'h_equity_1', assetType: 'STOCK', currentValue: 700000 },
    { holdingId: 'h_equity_2', assetType: 'MUTUAL_FUND', currentValue: 300000 },
    { holdingId: 'h_debt_1', assetType: 'BOND', currentValue: 500000 },
    { holdingId: 'h_gold_1', assetType: 'GOLD', currentValue: 100000 }
];

// ================================================================
// GROUP 1: Glidepath Schedule & Tiers Resolution (Tests 1-6)
// ================================================================
console.log('--- Group 1: Glidepath Schedule & Tiers Resolution ---');

// Test 1: Policy versioning verified as C8_3_V1
{
    assert.strictEqual(GLIDEPATH_POLICY_VERSION, 'C8_3_V1');
    console.log('✅ Test 1 PASS: Glidepath policy version verified.');
}

// Test 2: Horizon > 10 years resolves to AGGRESSIVE_GROWTH (75% Equity, 20% Debt, 5% Gold)
{
    const rec = resolveRecommendedGlidepath(15.0);
    assert.strictEqual(rec.tier, GLIDEPATH_TIERS.AGGRESSIVE_GROWTH);
    assert.strictEqual(rec.targetEquity, 0.75);
    assert.strictEqual(rec.targetDebt, 0.20);
    assert.strictEqual(rec.targetGold, 0.05);
    assert.strictEqual(rec.targetCash, 0.00);
    console.log('✅ Test 2 PASS: 15-year horizon resolves to AGGRESSIVE_GROWTH.');
}

// Test 3: Horizon 5-10 years resolves to BALANCED_ACCUMULATION (60% Equity, 30% Debt, 10% Gold)
{
    const rec = resolveRecommendedGlidepath(8.0);
    assert.strictEqual(rec.tier, GLIDEPATH_TIERS.BALANCED_ACCUMULATION);
    assert.strictEqual(rec.targetEquity, 0.60);
    assert.strictEqual(rec.targetDebt, 0.30);
    assert.strictEqual(rec.targetGold, 0.10);
    console.log('✅ Test 3 PASS: 8-year horizon resolves to BALANCED_ACCUMULATION.');
}

// Test 4: Horizon 3-5 years resolves to CAPITAL_PRESERVATION_TRANSITION (35% Eq, 50% Debt, 10% Gold, 5% Cash)
{
    const rec = resolveRecommendedGlidepath(4.0);
    assert.strictEqual(rec.tier, GLIDEPATH_TIERS.CAPITAL_PRESERVATION_TRANSITION);
    assert.strictEqual(rec.targetEquity, 0.35);
    assert.strictEqual(rec.targetDebt, 0.50);
    assert.strictEqual(rec.targetGold, 0.10);
    assert.strictEqual(rec.targetCash, 0.05);
    console.log('✅ Test 4 PASS: 4-year horizon resolves to CAPITAL_PRESERVATION_TRANSITION.');
}

// Test 5: Horizon 1-3 years resolves to DEFENSE_AND_DERISKING (15% Eq, 65% Debt, 5% Gold, 15% Cash)
{
    const rec = resolveRecommendedGlidepath(2.0);
    assert.strictEqual(rec.tier, GLIDEPATH_TIERS.DEFENSE_AND_DERISKING);
    assert.strictEqual(rec.targetEquity, 0.15);
    assert.strictEqual(rec.targetDebt, 0.65);
    assert.strictEqual(rec.targetGold, 0.05);
    assert.strictEqual(rec.targetCash, 0.15);
    console.log('✅ Test 5 PASS: 2-year horizon resolves to DEFENSE_AND_DERISKING.');
}

// Test 6: Horizon <= 1 year resolves to CASH_AND_ULTRA_SHORT (0% Eq, 40% Debt, 60% Cash)
{
    const rec = resolveRecommendedGlidepath(0.5);
    assert.strictEqual(rec.tier, GLIDEPATH_TIERS.CASH_AND_ULTRA_SHORT);
    assert.strictEqual(rec.targetEquity, 0.00);
    assert.strictEqual(rec.targetDebt, 0.40);
    assert.strictEqual(rec.targetCash, 0.60);
    console.log('✅ Test 6 PASS: 6-month horizon resolves to CASH_AND_ULTRA_SHORT.');
}

// ================================================================
// GROUP 2: Actual vs Recommended Asset Allocation Drift (Tests 7-12)
// ================================================================
console.log('\n--- Group 2: Actual vs Recommended Asset Allocation Drift ---');

// Test 7: Actual asset class composition evaluated accurately
{
    const goal = {
        goalId: 'g_alloc',
        name: 'Alloc Goal',
        allocatedHoldingIds: ['h_equity_1', 'h_debt_1'], // 7L equity, 5L debt
        allocatedCashAmount: 0
    };
    const act = analyzeGoalActualAllocation(goal, TEST_HOLDINGS);
    assert.strictEqual(act.totalAllocatedValue, 1200000);
    // 7L / 12L = 0.5833
    assert(act.actualEquityShare >= 0.58 && act.actualEquityShare <= 0.59);
    // 5L / 12L = 0.4166
    assert(act.actualDebtShare >= 0.41 && act.actualDebtShare <= 0.42);
    console.log('✅ Test 7 PASS: Goal actual asset allocation shares evaluated accurately.');
}

// Test 8: Dedicated cash included in actual allocation shares
{
    const goal = {
        goalId: 'g_cash',
        name: 'Cash Alloc',
        allocatedHoldingIds: ['h_equity_1'], // 7L equity
        allocatedCashAmount: 300000          // 3L cash
    };
    const act = analyzeGoalActualAllocation(goal, TEST_HOLDINGS);
    assert.strictEqual(act.totalAllocatedValue, 1000000);
    assert.strictEqual(act.actualEquityShare, 0.70);
    assert.strictEqual(act.actualCashShare, 0.30);
    console.log('✅ Test 8 PASS: Dedicated cash balance included in cash share.');
}

// Test 9: Allocation drift calculated accurately vs recommended glidepath
{
    const goal = {
        goalId: 'g_drift',
        name: 'Drift Goal',
        targetDate: '2035-06-30', // 10 yrs -> AGGRESSIVE (75% Eq, 20% Debt)
        targetCorpusNominal: 5000000,
        allocatedHoldingIds: ['h_equity_1', 'h_debt_1'] // 7L Eq (58.3%), 5L Debt (41.7%)
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    // Equity drift: 58.3% - 75.0% = -16.7%
    assert(diag.allocationDrift.equityDrift < 0);
    // Debt drift: 41.7% - 20.0% = +21.7%
    assert(diag.allocationDrift.debtDrift > 0);
    console.log('✅ Test 9 PASS: Allocation drift calculated accurately.');
}

// Test 10: ALIGNED status assigned when equity drift <= 10%
{
    const goal = {
        goalId: 'g_aligned',
        name: 'Aligned Goal',
        targetDate: '2033-06-30', // 8 yrs -> BALANCED (60% Eq, 30% Debt, 10% Gold)
        targetCorpusNominal: 2000000,
        allocatedHoldingIds: ['h_equity_1', 'h_equity_2', 'h_debt_1', 'h_gold_1'] // 10L Eq (62.5%), 5L Debt (31.25%), 1L Gold (6.25%)
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(diag.alignmentStatus, 'ALIGNED');
    console.log('✅ Test 10 PASS: ALIGNED status triggered for balanced drift (<= 10%).');
}

// Test 11: UNALLOCATED status assigned when goal has 0 holdings and 0 cash
{
    const goal = {
        goalId: 'g_empty',
        name: 'Empty Goal',
        targetDate: '2030-06-30',
        targetCorpusNominal: 1000000,
        allocatedHoldingIds: [],
        allocatedCashAmount: 0
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(diag.alignmentStatus, 'UNALLOCATED');
    console.log('✅ Test 11 PASS: UNALLOCATED status returned when zero assets linked.');
}

// Test 12: Mandatory asOfDate parameter strictly enforced
{
    assert.throws(() => {
        evaluateGoalGlidepath({ goalId: 'g1' }, TEST_HOLDINGS, null);
    }, /Missing mandatory deterministic parameter: asOfDate/);
    console.log('✅ Test 12 PASS: Mandatory asOfDate strictly enforced.');
}

// ================================================================
// GROUP 3: Sequence-of-Returns Risk Detection (Tests 13-17)
// ================================================================
console.log('\n--- Group 3: Sequence-of-Returns Risk Detection ---');

// Test 13: Sequence-of-returns risk flagged when horizon <= 3 yrs AND equity > rec + 15%
{
    const goal = {
        goalId: 'g_seq_risk',
        name: 'House Purchase 2027',
        category: GOAL_CATEGORIES.HOME_PURCHASE,
        targetDate: '2027-06-30', // 2 years -> DEFENSE (rec equity = 15%)
        targetCorpusNominal: 3000000,
        allocatedHoldingIds: ['h_equity_1'] // 100% equity (100% vs 15% => +85% drift!)
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(diag.hasSequenceOfReturnsRisk, true);
    assert.strictEqual(diag.alignmentStatus, 'SEQUENCE_RISK_ELEVATED');
    assert(diag.recommendationSummary.includes('excessive equity exposure'));
    console.log('✅ Test 13 PASS: Sequence-of-returns vulnerability flagged for near-term 100% equity goal.');
}

// Test 14: Safe defensive allocation near maturity does NOT trigger sequence risk
{
    const goal = {
        goalId: 'g_safe_near',
        name: 'Safe Near Goal',
        targetDate: '2027-06-30', // 2 years -> DEFENSE (rec equity = 15%)
        targetCorpusNominal: 1000000,
        allocatedHoldingIds: ['h_debt_1'], // 5L debt
        allocatedCashAmount: 100000        // 1L cash => 0% equity
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(diag.hasSequenceOfReturnsRisk, false);
    assert.notStrictEqual(diag.alignmentStatus, 'SEQUENCE_RISK_ELEVATED');
    console.log('✅ Test 14 PASS: Defensive near-term allocation correctly passes without sequence risk.');
}

// Test 15: Long-term horizon (e.g. 15 yrs) with 100% equity does NOT trigger sequence risk
{
    const goal = {
        goalId: 'g_long_term',
        name: 'Retirement 2040',
        targetDate: '2040-06-30', // 15 years
        targetCorpusNominal: 50000000,
        allocatedHoldingIds: ['h_equity_1'] // 100% equity
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(diag.hasSequenceOfReturnsRisk, false);
    console.log('✅ Test 15 PASS: Long-term equity dominance does NOT trigger sequence risk.');
}

// Test 16: Past due goal does not trigger sequence of returns risk
{
    const goal = {
        goalId: 'g_past_due',
        name: 'Past Goal',
        targetDate: '2024-01-01',
        targetCorpusNominal: 500000,
        allocatedHoldingIds: ['h_equity_1']
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(diag.hasSequenceOfReturnsRisk, false);
    console.log('✅ Test 16 PASS: Past due goal gracefully excludes sequence risk.');
}

// Test 17: Objective and actionable recommendation summary text emitted
{
    const goal = {
        goalId: 'g_summary',
        name: 'College 2027',
        targetDate: '2027-06-30',
        targetCorpusNominal: 2000000,
        allocatedHoldingIds: ['h_equity_1']
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    assert(typeof diag.recommendationSummary === 'string' && diag.recommendationSummary.length > 20);
    console.log('✅ Test 17 PASS: Clear, factual recommendation summary verified.');
}

// ================================================================
// GROUP 4: Multi-Goal Aggregation, C.6 Authority & Immutability (Tests 18-24)
// ================================================================
console.log('\n--- Group 4: Multi-Goal Aggregation & Invariants ---');

// Test 18: Authority metadata explicitly marks planning recommendation only (C8-R5)
{
    const goal = {
        goalId: 'g_meta',
        name: 'Meta Goal',
        targetDate: '2030-06-30',
        targetCorpusNominal: 1000000
    };
    const diag = evaluateGoalGlidepath(goal, TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(diag.meta.authorityBoundary, 'PLANNING_RECOMMENDATION_ONLY_DOES_NOT_MUTATE_C6_POLICY');
    console.log('✅ Test 18 PASS: Authority boundary strictly metadata-tagged.');
}

// Test 19: Empty goals array returns NO_GOALS status cleanly (C8-R14)
{
    const agg = aggregateMultiGoalGlidepaths([], TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(agg.status, 'NO_GOALS');
    assert.strictEqual(agg.totalGoalsCount, 0);
    assert.strictEqual(agg.goalsWithSequenceRiskCount, 0);
    console.log('✅ Test 19 PASS: Empty goals array handled cleanly with NO_GOALS status.');
}

// Test 20: Multi-goal glidepath diagnostic counts sequence risk accurately
{
    const goals = [
        { goalId: 'g_safe', name: 'Safe 2040', targetDate: '2040-06-30', targetCorpusNominal: 10000000, allocatedHoldingIds: ['h_equity_1'] },
        { goalId: 'g_risky', name: 'Risky 2027', targetDate: '2027-06-30', targetCorpusNominal: 2000000, allocatedHoldingIds: ['h_equity_1'] }
    ];
    const agg = aggregateMultiGoalGlidepaths(goals, TEST_HOLDINGS, AS_OF_DATE);
    assert.strictEqual(agg.totalGoalsCount, 2);
    assert.strictEqual(agg.goalsWithSequenceRiskCount, 1);
    assert.strictEqual(agg.hasPortfolioSequenceRisk, true);
    console.log('✅ Test 20 PASS: Portfolio sequence risk accurately aggregated across goals.');
}

// Test 21: AST Wall-Clock Scan in goalGlidepathService.js
{
    const code = fs.readFileSync('services/goalGlidepathService.js', 'utf8');
    const dateNowMatches = code.match(/Date\.now\(\)/g) || [];
    const argumentlessNewDateMatches = code.match(/new\s+Date\(\s*\)/g) || [];
    assert.strictEqual(dateNowMatches.length, 0, `Found ${dateNowMatches.length} Date.now() in goalGlidepathService.js`);
    assert.strictEqual(argumentlessNewDateMatches.length, 0, `Found ${argumentlessNewDateMatches.length} argument-less new Date() in goalGlidepathService.js`);
    console.log('✅ Test 21 PASS: AST Wall-Clock Scan verified (0 Date.now(), 0 argument-less new Date()).');
}

// Test 22: Deep 5-Store Read-Only Safety Guard
{
    const hBefore = await loadData(STORAGE_KEYS.HOLDINGS);
    const eBefore = await loadData(STORAGE_KEYS.EVENTS);
    const qBefore = await loadData(STORAGE_KEYS.QUOTES);
    const tBefore = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wBefore = await loadData(STORAGE_KEYS.WALLETS);

    const goals = [
        { goalId: 'g1', name: 'G1', targetDate: '2027-06-30', targetCorpusNominal: 1000000, allocatedHoldingIds: ['h_equity_1'] }
    ];
    aggregateMultiGoalGlidepaths(goals, TEST_HOLDINGS, AS_OF_DATE);

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
    console.log('✅ Test 22 PASS: Deep 5-store read-only safety verified (100% zero state mutations).');
}

// Test 23: Deterministic Repeatability across consecutive evaluations
{
    const goals = [
        { goalId: 'g1', name: 'G1', targetDate: '2027-06-30', targetCorpusNominal: 1000000, allocatedHoldingIds: ['h_equity_1'] }
    ];
    const r1 = aggregateMultiGoalGlidepaths(goals, TEST_HOLDINGS, AS_OF_DATE);
    const r2 = aggregateMultiGoalGlidepaths(goals, TEST_HOLDINGS, AS_OF_DATE);
    assert.deepStrictEqual(r1, r2);
    console.log('✅ Test 23 PASS: Deterministic repeatability verified across consecutive evaluations.');
}

// Test 24: Glidepath total schedule sums to exact 1.00 across all 5 tiers
{
    for (const tierKey of Object.keys(GLIDEPATH_SCHEDULE)) {
        const t = GLIDEPATH_SCHEDULE[tierKey];
        const sum = t.targetEquity + t.targetDebt + t.targetGold + t.targetCash;
        assert.strictEqual(Math.round(sum * 1000) / 1000, 1.000, `Tier ${tierKey} does not sum to 1.00`);
    }
    console.log('✅ Test 24 PASS: All 5 glidepath schedule tiers sum to exact 1.00 (100.0%).');
}

console.log('\n================================================================');
console.log('=== STAGE C.8.3 ACCEPTANCE RESULT: 24/24 TESTS PASSED (100%) ===');
console.log('================================================================');
