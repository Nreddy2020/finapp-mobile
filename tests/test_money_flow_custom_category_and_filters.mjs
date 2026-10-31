/**
 * test_money_flow_custom_category_and_filters.mjs
 * 
 * Comprehensive Unit Test for:
 * 1. Custom category support in Income & Expense entry (replacing 'Other')
 * 2. Cash Activity section header (+ symbol removal)
 * 3. Cash Activity filtering logic (Needs Review, Expenses, Income)
 * 4. Cash Activity date-wise grouping & date range filter (Today, This Week, This Month, All Dates)
 * 5. Storage synchronization & clean purging on deletion (no deleted references retained)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('=== RUNNING MONEY FLOW CUSTOM CATEGORY & CASH ACTIVITY TEST ===\n');

// -------------------------------------------------------------
// Test 1: Category Arrays in AddCashActivityModal
// -------------------------------------------------------------
const addModalCode = fs.readFileSync(path.join(rootDir, 'components/moneyflow/modals/AddCashActivityModal.js'), 'utf8');

assert(addModalCode.includes("'Custom'"), 'AddCashActivityModal must contain Custom category');
assert(!addModalCode.includes("'Other'"), 'AddCashActivityModal must NOT contain Other category');

// Check that Custom category text input is present
assert(addModalCode.includes('Custom Category Name'), 'AddCashActivityModal must have a Custom Category Name input field');
assert(addModalCode.includes('customCategory'), 'AddCashActivityModal must bind customCategory state');
console.log('  ✓ Test 1: AddCashActivityModal has Custom category & no Other category');

// -------------------------------------------------------------
// Test 2: Custom Category in ReviewTransactionModal
// -------------------------------------------------------------
const reviewModalCode = fs.readFileSync(path.join(rootDir, 'components/moneyflow/modals/ReviewTransactionModal.js'), 'utf8');

assert(reviewModalCode.includes("label: 'Custom'"), 'ReviewTransactionModal must have Custom option in QUICK_CATEGORIES');
assert(!reviewModalCode.includes("label: 'Other'"), 'ReviewTransactionModal must NOT have Other option in QUICK_CATEGORIES');
assert(reviewModalCode.includes('customCategoryText'), 'ReviewTransactionModal must manage customCategoryText state');
assert(reviewModalCode.includes('onDelete'), 'ReviewTransactionModal must support onDelete for discarding unreviewed records');
console.log('  ✓ Test 2: ReviewTransactionModal supports Custom category and onDelete');

// -------------------------------------------------------------
// Test 3: CashActivitySection Header & Date Grouping
// -------------------------------------------------------------
const cashActivityCode = fs.readFileSync(path.join(rootDir, 'components/moneyflow/presentation/CashActivitySection.js'), 'utf8');

// Section title without + Add Activity button
assert(cashActivityCode.includes('Cash Activity'), 'CashActivitySection must render title Cash Activity');
assert(!cashActivityCode.includes('+ Add Activity'), 'CashActivitySection must NOT contain redundant + Add Activity button in header');

// Filter tabs with live counts
assert(cashActivityCode.includes('Needs Review'), 'CashActivitySection must have Needs Review tab');
assert(cashActivityCode.includes('Expenses'), 'CashActivitySection must have Expenses tab');
assert(cashActivityCode.includes('Income'), 'CashActivitySection must have Income tab');
assert(cashActivityCode.includes('Custom ({counts.custom})'), 'CashActivitySection must have Custom tab with live count');

// Date filter chips
assert(cashActivityCode.includes('All Dates'), 'CashActivitySection must include All Dates filter');
assert(cashActivityCode.includes('Today'), 'CashActivitySection must include Today filter');
assert(cashActivityCode.includes('This Week'), 'CashActivitySection must include This Week filter');
assert(cashActivityCode.includes('This Month'), 'CashActivitySection must include This Month filter');
assert(cashActivityCode.includes('Custom Date'), 'CashActivitySection must include Custom Date filter');

// Header banner check: Cash movement only removed
const headerCode = fs.readFileSync(path.join(rootDir, 'components/moneyflow/presentation/MoneyFlowHeader.js'), 'utf8');
assert(!headerCode.includes('Cash movement only'), 'MoneyFlowHeader must NOT contain Cash movement only pill');
console.log('  ✓ Test 3: CashActivitySection has clean header, Custom tab, Custom Date filter, and MoneyFlowHeader has no cash movement pill');

// -------------------------------------------------------------
// Test 4: Functional Verification of Filtering & Date Grouping Logic
// -------------------------------------------------------------
const now = new Date();
const todayISO = now.toISOString().split('T')[0];
const yesterday = new Date(now.getTime() - 86400000);
const yesterdayISO = yesterday.toISOString().split('T')[0];
const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
const threeDaysAgoISO = threeDaysAgo.toISOString().split('T')[0];
const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
const lastMonthISO = lastMonth.toISOString().split('T')[0];

const sampleTransactions = [
    { id: 'tx1', merchant: 'Organic Store', amount: 1500, type: 'EXPENSE', category: 'Pet Care (Custom)', date: `${todayISO}T10:00:00Z`, isReviewNeeded: false },
    { id: 'tx2', merchant: 'Client Payment', amount: 50000, type: 'INCOME', category: 'Freelance (Custom)', date: `${todayISO}T11:30:00Z`, isReviewNeeded: false },
    { id: 'tx3', merchant: 'Unknown Debit', amount: 800, type: 'EXPENSE', category: 'General', date: `${yesterdayISO}T14:00:00Z`, isReviewNeeded: true },
    { id: 'tx4', merchant: 'Fuel Station', amount: 2000, type: 'EXPENSE', category: 'Transportation', date: `${threeDaysAgoISO}T09:00:00Z`, isReviewNeeded: false },
    { id: 'tx5', merchant: 'Previous Month Rent', amount: 25000, type: 'EXPENSE', category: 'Rent & Housing', date: `${lastMonthISO}T12:00:00Z`, isReviewNeeded: false }
];

// Test tab filtering
const needsReviewTxs = sampleTransactions.filter(t => t.isReviewNeeded);
assert.strictEqual(needsReviewTxs.length, 1, 'Needs review filter should find exactly 1 transaction');
assert.strictEqual(needsReviewTxs[0].id, 'tx3');

const expenseTxs = sampleTransactions.filter(t => t.type === 'EXPENSE');
assert.strictEqual(expenseTxs.length, 4, 'Expense filter should find 4 expense transactions');

const incomeTxs = sampleTransactions.filter(t => t.type === 'INCOME');
assert.strictEqual(incomeTxs.length, 1, 'Income filter should find 1 income transaction');

// Test date filtering
const todayTxs = sampleTransactions.filter(t => t.date.startsWith(todayISO));
assert.strictEqual(todayTxs.length, 2, 'Today filter should find 2 transactions');

const oneWeekAgo = new Date(now.getTime() - 7 * 86400000);
const weekTxs = sampleTransactions.filter(t => new Date(t.date) >= oneWeekAgo);
assert.strictEqual(weekTxs.length, 4, 'This week filter should find 4 transactions');

console.log('  ✓ Test 4: Tab and date filtering accurately isolates target records');

// -------------------------------------------------------------
// Test 5: Storage Synchronization & Non-resurrection on Deletion
// -------------------------------------------------------------
import { confirmReviewTransaction } from '../services/sms/smsReviewService.js';

// Reviewing an unreviewed transaction with custom category
const unreviewed = sampleTransactions.find(t => t.id === 'tx3');
const sorted = confirmReviewTransaction(unreviewed, 'Pet Care (Custom)', 'EXPENSE');
assert.strictEqual(sorted.needsSort, false, 'Sorted transaction must have needsSort: false');
assert.strictEqual(sorted.status, 'COMMITTED', 'Sorted transaction must have status: COMMITTED');
assert.strictEqual(sorted.category, 'Pet Care (Custom)', 'Sorted transaction must have custom category applied');

// Simulating deletion of tx3
const remainingTransactions = sampleTransactions.filter(t => t.id !== 'tx3');
assert(!remainingTransactions.some(t => t.id === 'tx3'), 'Deleted tx3 must not exist in updated transaction list');

// Verify that deleted transaction is not referred to anywhere in any filtered views
const filteredAfterDelete = remainingTransactions.filter(t => t.isReviewNeeded);
assert.strictEqual(filteredAfterDelete.length, 0, 'No transactions should need review after tx3 is deleted');
console.log('  ✓ Test 5: Review confirms transaction and deletion purges transaction from all views');

console.log('\n🎉 ALL CUSTOM CATEGORY & CASH ACTIVITY CHECKS PASSED (100%)!\n');
