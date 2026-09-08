/**
 * tests/test_cashbook_view_model.mjs
 * 
 * Test Suite 7: View Model Presentation Transformation, Filters, and Date Grouping.
 */

import assert from 'assert';
import {
    buildCashbookViewModel,
    FilterType
} from '../services/cashbook/cashbookViewModel.js';
import {
    buildDemoCashbookFixtures,
    FROZEN_DEMO_VECTOR
} from '../services/cashbook/cashbookMigration.js';

console.log('--- START TEST SUITE: CASHBOOK VIEW MODEL ---');
let assertionsPassed = 0;

function it(desc, fn) {
    fn();
    assertionsPassed++;
    console.log(`  [PASS] ${desc}`);
}

const demo = buildDemoCashbookFixtures();

it('buildCashbookViewModel produces formatted balance summary matching demo vector', () => {
    const vm = buildCashbookViewModel({
        accounts: demo.accounts,
        transactions: demo.transactions
    });

    assert.strictEqual(vm.balanceSummaryCard.openingBalanceFormatted, '₹25,000');
    assert.strictEqual(vm.balanceSummaryCard.totalIncomeFormatted, '₹87,000');
    assert.strictEqual(vm.balanceSummaryCard.totalExpenseFormatted, '₹30,500');
    assert.strictEqual(vm.balanceSummaryCard.netCashFlowFormatted, '₹56,500');
    assert.strictEqual(vm.balanceSummaryCard.isNetPositive, true);
    assert.strictEqual(vm.balanceSummaryCard.transferVolumeFormatted, '₹5,000');
    assert.strictEqual(vm.balanceSummaryCard.transferCount, 1);
    assert.strictEqual(vm.balanceSummaryCard.closingBalanceFormatted, '₹81,500');
});

it('buildCashbookViewModel correctly filters by transaction type (Income only)', () => {
    const vm = buildCashbookViewModel({
        accounts: demo.accounts,
        transactions: demo.transactions,
        activeFilter: FilterType.INCOME
    });

    assert.strictEqual(vm.filteredCount, 2); // Salary + Consulting
    for (const sec of vm.sections) {
        for (const row of sec.data) {
            assert.strictEqual(row.rawTxn.transactionType, 'INCOME');
            assert.ok(row.formattedAmount.startsWith('+₹'));
        }
    }
});

it('buildCashbookViewModel correctly filters by account (Cash account)', () => {
    const vm = buildCashbookViewModel({
        accounts: demo.accounts,
        transactions: demo.transactions,
        selectedAccountId: 'demo_acc_cash'
    });

    // Opening balance of cash + HDFC-to-Cash transfer = 2 transactions
    assert.strictEqual(vm.filteredCount, 2);
});

it('buildCashbookViewModel correctly filters by search query (e.g. "Blinkit")', () => {
    const vm = buildCashbookViewModel({
        accounts: demo.accounts,
        transactions: demo.transactions,
        searchQuery: 'Blinkit'
    });

    assert.strictEqual(vm.filteredCount, 1);
    assert.strictEqual(vm.sections[0].data[0].category, 'food');
});

it('buildCashbookViewModel groups transactions into date sections', () => {
    const vm = buildCashbookViewModel({
        accounts: demo.accounts,
        transactions: demo.transactions
    });

    assert.ok(vm.sections.length > 0);
    for (const sec of vm.sections) {
        assert.ok(sec.title);
        assert.ok(Array.isArray(sec.data));
    }
});

console.log(`--- CASHBOOK VIEW MODEL SUITE PASSED (${assertionsPassed} assertions) ---\n`);
