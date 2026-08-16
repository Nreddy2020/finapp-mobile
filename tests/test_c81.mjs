/**
 * Stage C.8.1 Goal Schema, Priority Hierarchy & Inflation Policy Acceptance Test Matrix
 * Master Standard: C8_V1
 * 
 * 24 Comprehensive Acceptance Tests covering:
 * - Group 1: Schema Validation & Normalization (Tests 1-6)
 * - Group 2: Inflation Rate Resolution & Future Corpus Mathematics (Tests 7-12)
 * - Group 3: 4-Tier Goal Precedence Sorting & Multi-Goal Tie-Breaking (Tests 13-18)
 * - Group 4: Monthly Savings Waterfall Allocation & Edge Cases (Tests 19-24)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
    GOAL_PLANNING_POLICY_VERSION,
    GOAL_CATEGORIES,
    GOAL_PRIORITY_TIERS,
    PRIORITY_TIER_RANK,
    GOAL_STATUS,
    INFLATION_POLICY,
    validateAndNormalizeGoal,
    sortGoalsByPrecedence,
    allocateSavingsCapacityWaterfall
} from '../services/goalPlanningEngine.js';

import { loadData, saveData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== Stage C.8.1 Goal Planning Engine 24-Test Suite ===');
console.log('================================================================\n');

const AS_OF_DATE = '2025-06-30T00:00:00.000Z';

// ================================================================
// GROUP 1: Schema Validation & Normalization (Tests 1-6)
// ================================================================
console.log('--- Group 1: Schema Validation & Normalization ---');

// Test 1: Policy versioning verified as C8_1_V1
{
    assert.strictEqual(GOAL_PLANNING_POLICY_VERSION, 'C8_1_V1');
    console.log('✅ Test 1 PASS: Policy version verified as C8_1_V1.');
}

// Test 2: Valid goal definition normalizes cleanly
{
    const goalInput = {
        goalId: 'g_retire',
        name: 'Retirement Corpus',
        category: GOAL_CATEGORIES.RETIREMENT,
        priorityTier: GOAL_PRIORITY_TIERS.HIGH_TIER_2,
        targetDate: '2045-06-30',
        targetCorpusNominal: 50000000, // 5 Crores
        monthlyContribution: 50000
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.goalId, 'g_retire');
    assert.strictEqual(norm.priorityRank, 2);
    assert.strictEqual(norm.targetCorpusNominal, 50000000);
    assert.strictEqual(norm.inflationRate, 0.06);
    assert.strictEqual(norm.status, GOAL_STATUS.ACTIVE);
    console.log('✅ Test 2 PASS: Valid goal definition normalizes cleanly.');
}

// Test 3: Missing goalId or name throws validation error
{
    assert.throws(() => {
        validateAndNormalizeGoal({ name: 'No ID' }, AS_OF_DATE);
    }, /Invalid goal: goalId must be a non-empty string/);

    assert.throws(() => {
        validateAndNormalizeGoal({ goalId: 'g1', name: '' }, AS_OF_DATE);
    }, /name must be a non-empty string/);
    console.log('✅ Test 3 PASS: Missing goalId or name strictly rejected.');
}

// Test 4: Invalid/negative target corpus rejected
{
    assert.throws(() => {
        validateAndNormalizeGoal({ goalId: 'g1', name: 'Test', targetCorpusNominal: -1000 }, AS_OF_DATE);
    }, /targetCorpusNominal must be a positive number/);

    assert.throws(() => {
        validateAndNormalizeGoal({ goalId: 'g1', name: 'Test', targetCorpusNominal: 0 }, AS_OF_DATE);
    }, /targetCorpusNominal must be a positive number/);
    console.log('✅ Test 4 PASS: Non-positive target corpus rejected.');
}

// Test 5: NOT_STARTED status assigned when no funding activity exists (C8-F3)
{
    const goalInput = {
        goalId: 'g_vacation',
        name: 'Europe Trip',
        category: GOAL_CATEGORIES.CUSTOM,
        targetDate: '2027-06-30',
        targetCorpusNominal: 500000,
        allocatedHoldingIds: [],
        allocatedCashAmount: 0,
        monthlyContribution: 0
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.status, GOAL_STATUS.NOT_STARTED);
    console.log('✅ Test 5 PASS: NOT_STARTED status assigned when zero funding activity exists.');
}

// Test 6: PAST_DUE status assigned for elapsed target date
{
    const goalInput = {
        goalId: 'g_old',
        name: 'Past Goal',
        targetDate: '2024-01-01',
        targetCorpusNominal: 100000
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.status, GOAL_STATUS.PAST_DUE);
    assert.strictEqual(norm.isPastDue, true);
    assert.strictEqual(norm.targetCorpusFuture, 100000); // Past due corpus un-inflated
    console.log('✅ Test 6 PASS: PAST_DUE status correctly assigned for past dates.');
}

// ================================================================
// GROUP 2: Inflation Rate Resolution & Future Corpus Math (Tests 7-12)
// ================================================================
console.log('\n--- Group 2: Inflation Rate Resolution & Future Corpus Math ---');

// Test 7: Child Education category defaults to 8.0% education inflation
{
    const goalInput = {
        goalId: 'g_edu',
        name: 'College Fund',
        category: GOAL_CATEGORIES.CHILD_EDUCATION,
        targetDate: '2035-06-30',
        targetCorpusNominal: 2000000 // 20 Lakhs
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.inflationRate, 0.08);
    // 20L * (1.08)^10 = 20L * 2.158925 = 4,317,849.99
    assert(norm.targetCorpusFuture > 4300000 && norm.targetCorpusFuture < 4350000);
    console.log('✅ Test 7 PASS: Child education defaults to 8% inflation with compound future corpus.');
}

// Test 8: Healthcare category defaults to 8.0% medical inflation
{
    const goalInput = {
        goalId: 'g_health',
        name: 'Medical Buffer',
        category: GOAL_CATEGORIES.HEALTHCARE,
        targetDate: '2030-06-30',
        targetCorpusNominal: 1000000
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.inflationRate, 0.08);
    console.log('✅ Test 8 PASS: Healthcare category defaults to 8% inflation.');
}

// Test 9: Default macro inflation (6.0%) applied to general categories
{
    const goalInput = {
        goalId: 'g_home',
        name: 'Home Downpayment',
        category: GOAL_CATEGORIES.HOME_PURCHASE,
        targetDate: '2030-06-30',
        targetCorpusNominal: 3000000
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.inflationRate, 0.06);
    console.log('✅ Test 9 PASS: Home purchase defaults to 6% macro inflation.');
}

// Test 10: User-provided explicit inflation rate overrides category policy
{
    const goalInput = {
        goalId: 'g_custom_inf',
        name: 'Custom Inflation Goal',
        category: GOAL_CATEGORIES.RETIREMENT,
        targetDate: '2035-06-30',
        targetCorpusNominal: 10000000,
        inflationRate: 0.10 // 10% user override
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.inflationRate, 0.10);
    console.log('✅ Test 10 PASS: User inflation rate (10%) cleanly overrides policy default.');
}

// Test 11: Zero inflation boundary (i = 0.0) yields exact nominal corpus
{
    const goalInput = {
        goalId: 'g_zero_inf',
        name: 'Zero Inflation Goal',
        targetDate: '2040-06-30',
        targetCorpusNominal: 5000000,
        inflationRate: 0.0
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.inflationRate, 0.0);
    assert.strictEqual(norm.targetCorpusFuture, 5000000);
    console.log('✅ Test 11 PASS: Zero inflation boundary yields exact nominal corpus identity.');
}

// Test 12: Inflation rate clamped safely within [0.0, 0.25]
{
    const goalHigh = {
        goalId: 'g_high_inf',
        name: 'High Inflation',
        targetDate: '2030-06-30',
        targetCorpusNominal: 1000000,
        inflationRate: 0.50 // Out of bounds
    };
    const normHigh = validateAndNormalizeGoal(goalHigh, AS_OF_DATE);
    assert.strictEqual(normHigh.inflationRate, 0.25);
    console.log('✅ Test 12 PASS: Out-of-bounds inflation clamped safely to 25.0%.');
}

// ================================================================
// GROUP 3: 4-Tier Goal Precedence Sorting & Tie-Breaking (Tests 13-18)
// ================================================================
console.log('\n--- Group 3: 4-Tier Goal Precedence Sorting ---');

// Test 13: Tier 1 (Critical) takes precedence over Tier 2, 3, and 4
{
    const goals = [
        { goalId: 'g_vacation', name: 'Vacation', priorityTier: GOAL_PRIORITY_TIERS.LOW_TIER_4, targetDate: '2026-06-30', targetCorpusNominal: 200000 },
        { goalId: 'g_retire', name: 'Retirement', priorityTier: GOAL_PRIORITY_TIERS.HIGH_TIER_2, targetDate: '2045-06-30', targetCorpusNominal: 50000000 },
        { goalId: 'g_emergency', name: 'Emergency Fund', priorityTier: GOAL_PRIORITY_TIERS.CRITICAL_TIER_1, targetDate: '2025-12-31', targetCorpusNominal: 500000 },
        { goalId: 'g_edu', name: 'Child Edu', priorityTier: GOAL_PRIORITY_TIERS.MEDIUM_TIER_3, targetDate: '2035-06-30', targetCorpusNominal: 3000000 }
    ];
    const sorted = sortGoalsByPrecedence(goals, AS_OF_DATE);
    assert.strictEqual(sorted[0].goalId, 'g_emergency'); // Tier 1
    assert.strictEqual(sorted[1].goalId, 'g_retire');    // Tier 2
    assert.strictEqual(sorted[2].goalId, 'g_edu');       // Tier 3
    assert.strictEqual(sorted[3].goalId, 'g_vacation');  // Tier 4
    console.log('✅ Test 13 PASS: 4-Tier priority waterfall sorts strictly by tier rank (1 -> 2 -> 3 -> 4).');
}

// Test 14: Target date breaks tie within same priority tier (Sooner before later)
{
    const goals = [
        { goalId: 'g_retire_late', name: 'Retirement 2050', priorityTier: GOAL_PRIORITY_TIERS.HIGH_TIER_2, targetDate: '2050-06-30', targetCorpusNominal: 50000000 },
        { goalId: 'g_house_soon', name: 'House Downpayment 2028', priorityTier: GOAL_PRIORITY_TIERS.HIGH_TIER_2, targetDate: '2028-06-30', targetCorpusNominal: 3000000 }
    ];
    const sorted = sortGoalsByPrecedence(goals, AS_OF_DATE);
    assert.strictEqual(sorted[0].goalId, 'g_house_soon'); // 2028 before 2050
    assert.strictEqual(sorted[1].goalId, 'g_retire_late');
    console.log('✅ Test 14 PASS: Sooner target date takes precedence within same priority tier.');
}

// Test 15: Lexicographical goalId breaks tie for identical tier and target date
{
    const goals = [
        { goalId: 'g_zeta', name: 'Zeta Goal', priorityTier: GOAL_PRIORITY_TIERS.MEDIUM_TIER_3, targetDate: '2030-06-30', targetCorpusNominal: 1000000 },
        { goalId: 'g_alpha', name: 'Alpha Goal', priorityTier: GOAL_PRIORITY_TIERS.MEDIUM_TIER_3, targetDate: '2030-06-30', targetCorpusNominal: 1000000 }
    ];
    const sorted = sortGoalsByPrecedence(goals, AS_OF_DATE);
    assert.strictEqual(sorted[0].goalId, 'g_alpha');
    assert.strictEqual(sorted[1].goalId, 'g_zeta');
    console.log('✅ Test 15 PASS: Deterministic goalId tie-breaking verified.');
}

// Test 16: Empty goals array returns empty array safely
{
    const sorted = sortGoalsByPrecedence([], AS_OF_DATE);
    assert.deepStrictEqual(sorted, []);
    console.log('✅ Test 16 PASS: Empty goals array handled safely.');
}

// Test 17: Emergency fund category automatically assigned Tier 1 priority
{
    const goalInput = {
        goalId: 'g_emer',
        name: 'Emergency Fund',
        category: GOAL_CATEGORIES.EMERGENCY_FUND,
        targetDate: '2026-06-30',
        targetCorpusNominal: 600000
    };
    const norm = validateAndNormalizeGoal(goalInput, AS_OF_DATE);
    assert.strictEqual(norm.priorityTier, GOAL_PRIORITY_TIERS.CRITICAL_TIER_1);
    assert.strictEqual(norm.priorityRank, 1);
    console.log('✅ Test 17 PASS: Emergency fund category defaults to Critical Tier 1 priority.');
}

// Test 18: Mandatory asOfDate strictly enforced in sorting
{
    assert.throws(() => {
        sortGoalsByPrecedence([{ goalId: 'g1' }], null);
    }, /Missing mandatory deterministic parameter: asOfDate/);
    console.log('✅ Test 18 PASS: Mandatory asOfDate parameter strictly enforced.');
}

// ================================================================
// GROUP 4: Monthly Savings Waterfall Allocation (Tests 19-24)
// ================================================================
console.log('\n--- Group 4: Monthly Savings Waterfall Allocation ---');

// Test 19: Full savings capacity satisfied when capacity >= total requested
{
    const goals = [
        { goalId: 'g_emergency', name: 'Emergency', priorityTier: GOAL_PRIORITY_TIERS.CRITICAL_TIER_1, targetDate: '2026-06-30', targetCorpusNominal: 300000, monthlyContribution: 20000 },
        { goalId: 'g_retire', name: 'Retirement', priorityTier: GOAL_PRIORITY_TIERS.HIGH_TIER_2, targetDate: '2045-06-30', targetCorpusNominal: 30000000, monthlyContribution: 30000 }
    ];
    const res = allocateSavingsCapacityWaterfall(goals, 60000, AS_OF_DATE);
    assert.strictEqual(res.totalSavingsCapacity, 60000);
    assert.strictEqual(res.allocatedSavingsTotal, 50000);
    assert.strictEqual(res.unallocatedSavingsTotal, 10000);
    assert.strictEqual(res.goalAllocations[0].allocatedMonthlySavings, 20000);
    assert.strictEqual(res.goalAllocations[1].allocatedMonthlySavings, 30000);
    console.log('✅ Test 19 PASS: Savings capacity satisfied with unallocated surplus.');
}

// Test 20: Constrained capacity waterfall funds Tier 1 first, partially funds Tier 2
{
    const goals = [
        { goalId: 'g_emergency', name: 'Emergency', priorityTier: GOAL_PRIORITY_TIERS.CRITICAL_TIER_1, targetDate: '2026-06-30', targetCorpusNominal: 300000, monthlyContribution: 25000 },
        { goalId: 'g_retire', name: 'Retirement', priorityTier: GOAL_PRIORITY_TIERS.HIGH_TIER_2, targetDate: '2045-06-30', targetCorpusNominal: 30000000, monthlyContribution: 30000 },
        { goalId: 'g_vacation', name: 'Vacation', priorityTier: GOAL_PRIORITY_TIERS.LOW_TIER_4, targetDate: '2027-06-30', targetCorpusNominal: 200000, monthlyContribution: 10000 }
    ];
    const res = allocateSavingsCapacityWaterfall(goals, 40000, AS_OF_DATE); // 40k total capacity
    assert.strictEqual(res.goalAllocations[0].allocatedMonthlySavings, 25000); // Tier 1 gets full 25k
    assert.strictEqual(res.goalAllocations[1].allocatedMonthlySavings, 15000); // Tier 2 gets remaining 15k
    assert.strictEqual(res.goalAllocations[2].allocatedMonthlySavings, 0.0);   // Tier 4 gets 0
    assert.strictEqual(res.unallocatedSavingsTotal, 0.0);
    console.log('✅ Test 20 PASS: Constrained savings waterfall strictly protects Tier 1 before Tier 2 and Tier 4.');
}

// Test 21: Overdue goals excluded from absorbing monthly savings capacity
{
    const goals = [
        { goalId: 'g_overdue', name: 'Old Goal', priorityTier: GOAL_PRIORITY_TIERS.CRITICAL_TIER_1, targetDate: '2024-01-01', targetCorpusNominal: 100000, monthlyContribution: 10000 },
        { goalId: 'g_active', name: 'Active Goal', priorityTier: GOAL_PRIORITY_TIERS.HIGH_TIER_2, targetDate: '2028-06-30', targetCorpusNominal: 1000000, monthlyContribution: 15000 }
    ];
    const res = allocateSavingsCapacityWaterfall(goals, 20000, AS_OF_DATE);
    assert.strictEqual(res.goalAllocations[0].allocatedMonthlySavings, 0.0);
    assert.strictEqual(res.goalAllocations[0].reason, 'GOAL_PAST_DUE');
    assert.strictEqual(res.goalAllocations[1].allocatedMonthlySavings, 15000);
    console.log('✅ Test 21 PASS: Overdue goal excluded from absorbing recurring SIP capacity.');
}

// Test 22: AST Wall-Clock Scan in goalPlanningEngine.js
{
    const code = fs.readFileSync('services/goalPlanningEngine.js', 'utf8');
    const dateNowMatches = code.match(/Date\.now\(\)/g) || [];
    const argumentlessNewDateMatches = code.match(/new\s+Date\(\s*\)/g) || [];
    assert.strictEqual(dateNowMatches.length, 0, `Found ${dateNowMatches.length} Date.now() in goalPlanningEngine.js`);
    assert.strictEqual(argumentlessNewDateMatches.length, 0, `Found ${argumentlessNewDateMatches.length} argument-less new Date() in goalPlanningEngine.js`);
    console.log('✅ Test 22 PASS: AST Wall-Clock Scan verified (0 Date.now(), 0 argument-less new Date()).');
}

// Test 23: Deep 5-Store Read-Only Safety Guard
{
    const hBefore = await loadData(STORAGE_KEYS.HOLDINGS);
    const eBefore = await loadData(STORAGE_KEYS.EVENTS);
    const qBefore = await loadData(STORAGE_KEYS.QUOTES);
    const tBefore = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wBefore = await loadData(STORAGE_KEYS.WALLETS);

    const testGoals = [
        { goalId: 'g1', name: 'Goal 1', targetDate: '2030-06-30', targetCorpusNominal: 1000000, monthlyContribution: 10000 }
    ];
    allocateSavingsCapacityWaterfall(testGoals, 20000, AS_OF_DATE);

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

// Test 24: Deterministic Repeatability across consecutive executions
{
    const testGoals = [
        { goalId: 'g1', name: 'Goal 1', targetDate: '2030-06-30', targetCorpusNominal: 1000000, monthlyContribution: 10000 },
        { goalId: 'g2', name: 'Goal 2', targetDate: '2028-06-30', targetCorpusNominal: 500000, monthlyContribution: 15000 }
    ];
    const r1 = allocateSavingsCapacityWaterfall(testGoals, 20000, AS_OF_DATE);
    const r2 = allocateSavingsCapacityWaterfall(testGoals, 20000, AS_OF_DATE);
    assert.deepStrictEqual(r1, r2);
    console.log('✅ Test 24 PASS: Deterministic repeatability across consecutive waterfall evaluations.');
}

console.log('\n================================================================');
console.log('=== STAGE C.8.1 ACCEPTANCE RESULT: 24/24 TESTS PASSED (100%) ===');
console.log('================================================================');
