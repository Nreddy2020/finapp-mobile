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
import { DATA_QUALITY_STATUS } from '../services/budget/budgetContracts.js';

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

// 1. Cross-Screen Reconciliation Invariants
console.log('Group 1: Cross-Screen Reconciliation Invariants');
it('should reconcile income identically between Overview and Calendar', () => {
    assert.strictEqual(vm.financialHealth.income, vm.reconciledTotals.totalIncome);
    assert.strictEqual(vm.financialHealth.formattedIncome, vm.reconciledTotals.formattedTotalIncome);
});

it('should reconcile committed amount identically between Overview, Cash Flow, and Calendar', () => {
    assert.strictEqual(vm.financialHealth.committed, vm.reconciledTotals.committedUpcoming);
    assert.strictEqual(vm.financialHealth.formattedCommitted, vm.reconciledTotals.formattedCommitted);
    assert.strictEqual(vm.cashFlow.commitments.filter(c => !c.isIncome).length > 0, true);
});

it('should reconcile projected month-end surplus identically between Overview and Calendar', () => {
    assert.strictEqual(vm.financialHealth.projectedMonthEndBalance, vm.reconciledTotals.projectedMonthEnd);
    assert.strictEqual(vm.financialHealth.formattedProjectedMonthEndBalance, vm.reconciledTotals.formattedProjectedMonthEnd);
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

it('should format currency with Indian numbering comma groupings', () => {
    assert.strictEqual(formatCurrency(124000), '₹1,24,000');
    assert.strictEqual(formatCurrency(86500), '₹86,500');
    assert.strictEqual(formatCurrency(1250), '₹1,250');
    assert.strictEqual(formatCurrency(9000000), '₹90,00,000');
});

console.log(`\n================================================================`);
console.log(`=== TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED 🟢 (100%)              ===`);
console.log(`================================================================\n`);
