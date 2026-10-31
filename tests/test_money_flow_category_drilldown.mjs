import assert from 'node:assert';
import { buildMoneyFlowViewModel } from '../components/moneyflow/moneyFlowViewModel.js';

console.log('=== RUNNING MONEY FLOW CATEGORY DRILLDOWN UNIT TEST ===\n');

const testTransactions = [
    { id: 'tx1', amount: 28000, type: 'EXPENSE', category: 'Rent & Housing', date: '2026-10-02', merchant: 'Prestige Society', account: 'HDFC Savings Account' },
    { id: 'tx2', amount: 6500, type: 'EXPENSE', category: 'Groceries & Food', date: '2026-10-03', merchant: 'BigBasket', account: 'HDFC Savings Account' },
    { id: 'tx3', amount: 1450, type: 'EXPENSE', category: 'Groceries & Food', date: '2026-10-04', merchant: 'Swiggy', account: 'HDFC Savings Account' },
    { id: 'tx4', amount: 4200, type: 'EXPENSE', category: 'Transportation', date: '2026-10-03', merchant: 'Shell Fuel', account: 'SBI Savings Account' }
];

const vm = buildMoneyFlowViewModel({
    transactions: testTransactions,
    periodType: 'month',
    referenceDate: '2026-10-15T00:00:00.000Z'
});

const where = vm.whereDidMyCashGo;
assert.ok(where, 'whereDidMyCashGo must exist in ViewModel');
assert.strictEqual(where.byCategory.length, 3, 'Must have 3 spending categories');

const groceries = where.byCategory.find(c => c.name === 'Groceries & Food');
assert.ok(groceries, 'Groceries & Food category must exist');
assert.strictEqual(groceries.amount, 7950, 'Groceries & Food amount must be 7950');
assert.strictEqual(groceries.transactions.length, 2, 'Groceries & Food must have exactly 2 underlying transactions');

const txBigBasket = groceries.transactions.find(t => t.merchant === 'BigBasket');
assert.ok(txBigBasket, 'BigBasket transaction must exist in Groceries breakdown');
assert.strictEqual(txBigBasket.amount, 6500);
assert.strictEqual(txBigBasket.accountName, 'HDFC Savings Account');

const txSwiggy = groceries.transactions.find(t => t.merchant === 'Swiggy');
assert.ok(txSwiggy, 'Swiggy transaction must exist in Groceries breakdown');
assert.strictEqual(txSwiggy.amount, 1450);

console.log('  ✓ Category transactions mapped accurately to underlying records');
console.log('  ✓ Groceries & Food breakdown exposes BigBasket (₹6,500) and Swiggy (₹1,450)');
console.log('\n🎉 ALL CATEGORY DRILLDOWN CHECKS PASSED (100%)!');
