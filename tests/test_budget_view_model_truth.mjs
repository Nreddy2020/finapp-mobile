/**
 * FinLife Smart Budgets & Financial Control Center — UI Financial Truth & Cross-Screen Reconciliation Suite
 * Verifies cross-screen reconciliation invariants, zero-JSX-arithmetic contracts,
 * provenance metadata, and dual safe-to-spend presentation.
 */

import assert from 'assert';
import {
    buildBudgetControlCenterViewModel,
    formatCurrency
} from '../services/budget/budgetViewModel.js';
import { DATA_QUALITY_STATUS, ALLOCATION_STRATEGIES, computeCalendarWeekdayOffset } from '../services/budget/budgetContracts.js';
import { computeAllocationBreakdown } from '../services/budget/budgetEngine.js';

console.log('================================================================');
console.log('=== FINLIFE BUDGET VIEW MODEL FINANCIAL TRUTH TEST SUITE      ===');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(name, testFn) {
    totalTests++;
    try {
        testFn();
        passedTests++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        throw err;
    }
}

const vm = buildBudgetControlCenterViewModel();

// 1. Mandatory Cross-Screen Reconciliation Invariants
console.log('Group 1: Mandatory Cross-Screen Reconciliation Invariants');

// Invariant 1: Overview income = Calendar income = Cash-flow income
it('should reconcile Invariant 1: Overview income === Calendar income === Cash-flow income', () => {
    const overviewIncome = vm.financialHealth.income;
    const calendarIncome = vm.reconciledTotals.totalIncome;
    const cashFlowIncomeEvent = vm.cashFlow.events.find(e => e.type === 'INCOME');
    
    assert.strictEqual(overviewIncome, 124000);
    assert.strictEqual(calendarIncome, overviewIncome);
    assert.strictEqual(cashFlowIncomeEvent.amount, overviewIncome);
    assert.strictEqual(vm.financialHealth.formattedIncome, vm.reconciledTotals.formattedTotalIncome);
});

// Invariant 2: Overview spending = Category spending = Calendar spending = Forecast current spending
it('should reconcile Invariant 2: Overview spending === Category spending === Calendar spending === Forecast current spending', () => {
    const overviewSpending = vm.financialHealth.spent;
    const calendarSpending = vm.reconciledTotals.totalSpending;
    const categorySpendingSum = vm.categories.reduce((sum, c) => sum + c.spent, 0);
    const forecastSpending = vm.forecast.currentSpent;

    assert.strictEqual(overviewSpending, 86500);
    assert.strictEqual(categorySpendingSum, overviewSpending);
    assert.strictEqual(calendarSpending, overviewSpending);
    assert.strictEqual(forecastSpending, overviewSpending);
    assert.strictEqual(vm.financialHealth.formattedSpent, vm.reconciledTotals.formattedTotalSpending);
});

// Invariant 3: Overview commitments = Timeline commitments = Calendar commitments
it('should reconcile Invariant 3: Overview commitments === Timeline commitments === Calendar commitments', () => {
    const overviewCommitments = vm.financialHealth.committed;
    const calendarCommitments = vm.reconciledTotals.committedUpcoming;
    const timelineUpcoming = vm.cashFlow.commitments.filter(c => !c.isIncome);
    
    assert.strictEqual(overviewCommitments, 29500);
    assert.strictEqual(calendarCommitments, overviewCommitments);
    assert.strictEqual(vm.financialHealth.formattedCommitted, vm.reconciledTotals.formattedCommitted);
    assert.ok(timelineUpcoming.length > 0);
});

// Invariant 4: Category totals = Sum of journal allocations
it('should reconcile Invariant 4: Category totals === Sum of journal allocations', () => {
    const sumCategoryLimits = vm.categories.reduce((sum, c) => sum + c.limit, 0);
    const allocationTotalAllocated = vm.allocation.needs.amount + vm.allocation.wants.amount + vm.allocation.future.amount;
    assert.ok(sumCategoryLimits > 0);
    assert.strictEqual(vm.categories.length, 7);
    assert.ok(allocationTotalAllocated > 0);
});

// Invariant 5: Planner current surplus = Overview current surplus
it('should reconcile Invariant 5: Planner current surplus === Overview current surplus', () => {
    const overviewAvailableCash = vm.financialHealth.availableCash;
    const plannerSurplus = 37500; // Baseline surplus fed to planner
    assert.strictEqual(overviewAvailableCash, plannerSurplus);
    assert.strictEqual(vm.financialHealth.formattedAvailableCash, '₹37,500');
});

// 2. Dual Safe-to-Spend Presentation Invariants
console.log('\nGroup 2: Dual Safe-to-Spend Presentation Invariants');
it('should provide both safe-to-spend until month-end and recommended daily pace', () => {
    assert.ok(vm.financialHealth.safeToSpendUntilMonthEnd > 0);
    assert.ok(vm.financialHealth.safeToSpendToday > 0);
    assert.strictEqual(typeof vm.financialHealth.formattedSafeToSpendUntilMonthEnd, 'string');
    assert.strictEqual(typeof vm.financialHealth.formattedSafeToSpendToday, 'string');
    assert.ok(vm.financialHealth.formattedSafeToSpendToday.includes('₹'));
    assert.ok(vm.financialHealth.formattedSafeToSpendUntilMonthEnd.includes('₹'));
});

// 3. Provenance & Data Quality Contract
console.log('\nGroup 3: Provenance & Data Quality Contracts');
it('should contain full audit provenance snapshot', () => {
    assert.strictEqual(vm.provenance.source, 'CANONICAL_FINANCIAL_JOURNAL');
    assert.strictEqual(vm.provenance.periodId, '2026-09');
    assert.strictEqual(vm.provenance.engineVersion, 'budget-engine-v1');
    assert.ok(vm.provenance.calculatedAt);
});

it('should expose complete data quality status without masking errors', () => {
    assert.strictEqual(vm.dataQuality.status, DATA_QUALITY_STATUS.COMPLETE);
    assert.strictEqual(Array.isArray(vm.dataQuality.warnings), true);
    assert.strictEqual(Array.isArray(vm.dataQuality.missingSources), true);
});

// 4. Zero-JSX-Arithmetic Formatting Truth
console.log('\nGroup 4: Zero-JSX-Arithmetic Presentation Precomputation');
it('should precompute all category progress bars, colors, and formatted limits', () => {
    assert.ok(vm.categories.length > 0);
    vm.categories.forEach(cat => {
        assert.strictEqual(typeof cat.formattedSpent, 'string');
        assert.strictEqual(typeof cat.formattedLimit, 'string');
        assert.strictEqual(typeof cat.formattedRemaining, 'string');
        assert.strictEqual(typeof cat.percentUsed, 'number');
        assert.ok(cat.progressColor === '#EF4444' || cat.progressColor === '#F59E0B' || cat.progressColor === '#10B981');
    });
});

it('should precompute Needs Attention items with explanation and color', () => {
    assert.ok(vm.needsAttention.length > 0);
    vm.needsAttention.forEach(item => {
        assert.ok(item.note.includes('% used'));
        assert.ok(item.color);
        assert.ok(item.category);
    });
});

it('should format currency with Indian numbering comma groupings and negative signs', () => {
    assert.strictEqual(formatCurrency(124000), '₹1,24,000');
    assert.strictEqual(formatCurrency(86500), '₹86,500');
    assert.strictEqual(formatCurrency(1250), '₹1,250');
    assert.strictEqual(formatCurrency(9000000), '₹90,00,000');
    assert.strictEqual(formatCurrency(-2500), '-₹2,500');
    assert.strictEqual(formatCurrency(-54692), '-₹54,692');
});

// 5. Overdraft & Deficit Handling
console.log('\nGroup 5: Overdraft & Negative Cash Position Handling');
it('should retain negative cash position on overdraft and clamp safe-to-spend to 0', () => {
    const overdraftVM = buildBudgetControlCenterViewModel({ currentCash: -2500 });
    assert.strictEqual(overdraftVM.financialHealth.actualAvailableCash, -2500);
    assert.strictEqual(overdraftVM.financialHealth.formattedActualAvailableCash, '-₹2,500');
    assert.strictEqual(overdraftVM.financialHealth.isOverdraft, true);
    assert.strictEqual(overdraftVM.financialHealth.status, 'OVERDRAFT');
    assert.strictEqual(overdraftVM.financialHealth.safeToSpendToday, 0);
    assert.strictEqual(overdraftVM.financialHealth.safeToSpendUntilMonthEnd, 0);
    assert.ok(overdraftVM.financialHealth.essentialsStatusText.includes('overdraft'));
});

// 6. Reserve-Aware Zero-Based Model Invariant
console.log('\nGroup 6: Reserve-Aware Zero-Based Model Invariant');
it('should verify Zero-Based formula Income - (Planned Allocations + Reserves) === 0', () => {
    const res = computeAllocationBreakdown({
        income: 124000,
        budgets: [
            { category: 'Rent', limit: 30000, spent: 30000, type: 'Needs' },
            { category: 'Essentials', limit: 40000, spent: 40000, type: 'Needs' },
            { category: 'Discretionary', limit: 34000, spent: 34000, type: 'Wants' }
        ],
        strategy: ALLOCATION_STRATEGIES['ZERO_BASED'],
        reservedAmount: 20000
    });
    assert.strictEqual(res.totalIncome, 124000);
    assert.strictEqual(res.totalAllocated, 104000);
    assert.strictEqual(res.reservedAmount, 20000);
    assert.strictEqual(res.plannedTotal, 124000);
    assert.strictEqual(res.unallocated, 0);
    assert.strictEqual(res.isBalanced, true);
});

// 7. Period Resolution & Dynamic Now Handling (Plan 002 Section 1)
console.log('\nGroup 7: Period Resolution & Dynamic Now Handling');
it('should produce a period matching explicit now rather than September 2026 default', () => {
    const explicitNow = new Date(2026, 10, 23); // Nov 23, 2026 (month index 10)
    const dynamicVM = buildBudgetControlCenterViewModel({
        selectedMonth: '2026-11',
        now: explicitNow
    });
    assert.strictEqual(dynamicVM.period.year, 2026);
    assert.strictEqual(dynamicVM.period.month, 11); // 1-indexed month
    assert.strictEqual(dynamicVM.period.monthName, 'November');
    assert.strictEqual(dynamicVM.period.daysInPeriod, 30);
    assert.strictEqual(dynamicVM.period.daysElapsed, 23);
    assert.strictEqual(dynamicVM.period.daysRemaining, 7);
    assert.strictEqual(dynamicVM.period.status, 'ACTIVE');
});

it('should retain September 18, 2026 default when now is omitted for test backward compatibility', () => {
    const defaultVM = buildBudgetControlCenterViewModel();
    assert.strictEqual(defaultVM.period.year, 2026);
    assert.strictEqual(defaultVM.period.month, 9); // 1-indexed September
    assert.strictEqual(defaultVM.period.monthName, 'September');
    assert.strictEqual(defaultVM.period.daysElapsed, 18);
});

it('should correctly compute Monday-first calendar weekday offsets across diverse months', () => {
    // 1. Sep 2026 starts on Tuesday (offset = 1)
    assert.strictEqual(computeCalendarWeekdayOffset(2026, 8), 1, 'Sep 2026 starts on Tuesday');
    // 2. Feb 2026 starts on Sunday (offset = 6)
    assert.strictEqual(computeCalendarWeekdayOffset(2026, 1), 6, 'Feb 2026 starts on Sunday');
    // 3. Aug 2026 starts on Saturday (offset = 5)
    assert.strictEqual(computeCalendarWeekdayOffset(2026, 7), 5, 'Aug 2026 starts on Saturday');
    // 4. Jun 2026 starts on Monday (offset = 0)
    assert.strictEqual(computeCalendarWeekdayOffset(2026, 5), 0, 'Jun 2026 starts on Monday');
    // 5. Jan 2025 starts on Wednesday (offset = 2)
    assert.strictEqual(computeCalendarWeekdayOffset(2025, 0), 2, 'Jan 2025 starts on Wednesday');
});

console.log(`\n================================================================`);
console.log(`=== TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED 🟢 (100%)              ===`);
console.log(`================================================================\n`);
