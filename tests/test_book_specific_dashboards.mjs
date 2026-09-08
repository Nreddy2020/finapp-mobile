/**
 * tests/test_book_specific_dashboards.mjs
 * 
 * Test Suite: Purpose-Built Dashboard Metric Reducers.
 * Verifies domain arithmetic for Personal, Handy Cash, Business, Loans, and PF.
 */

import assert from 'assert';
import {
    computePersonalDashboardMetrics,
    computeHandyCashDashboardMetrics,
    computeBusinessDashboardMetrics,
    computeLoanLiabilityDashboardMetrics,
    computeLoanReceivableDashboardMetrics,
    computePFDashboardMetrics
} from '../services/cashbook/cashbookEngine.js';
import {
    createMoneyPaise,
    TransactionType,
    TransactionStatus
} from '../services/cashbook/cashbookContracts.js';

console.log('=== TEST SUITE: PURPOSE-BUILT DASHBOARD METRIC REDUCERS ===\n');

const CURRENT_DATE = '2026-09-06';

// Test 1: Personal Dashboard Metrics
console.log('Test 1: Personal Dashboard Metrics');
const personalTxns = [
    {
        id: 't1',
        transactionType: TransactionType.INCOME,
        amount: createMoneyPaise('7500000'), // ₹75,000 salary
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    },
    {
        id: 't2',
        transactionType: TransactionType.EXPENSE,
        amount: createMoneyPaise('2500000'), // ₹25,000 rent
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    },
    {
        id: 't3',
        transactionType: TransactionType.EXPENSE,
        amount: createMoneyPaise('120000'), // ₹1,200 groceries
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    }
];

const personalMetrics = computePersonalDashboardMetrics({
    transactions: personalTxns,
    currentDate: CURRENT_DATE
});

assert.strictEqual(personalMetrics.availableBalancePaise, '4880000'); // ₹48,800
assert.strictEqual(personalMetrics.todayReceivedPaise, '7500000');
assert.strictEqual(personalMetrics.todaySpentPaise, '2620000'); // 25,000 + 1,200
assert.strictEqual(personalMetrics.monthSavingsMovementPaise, '4880000');
assert.strictEqual(personalMetrics.isSavingsNegative, false);
console.log('  ✅ Personal dashboard correctly computes liquid cash, daily flow, and monthly savings movement');

// Test 2: Handy Cash Till Metrics & Discrepancies
console.log('\nTest 2: Handy Cash Till Metrics');
const handyTxns = [
    {
        id: 'hc1',
        transactionType: TransactionType.INCOME,
        amount: createMoneyPaise('1500000'), // ₹15,000 cash received
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    },
    {
        id: 'hc2',
        transactionType: TransactionType.EXPENSE,
        amount: createMoneyPaise('300000'), // ₹3,000 cash paid
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    }
];

// 2a. Expected closing with opening cash of ₹5,000
const handyMetricsNoClosing = computeHandyCashDashboardMetrics({
    transactions: handyTxns,
    openingBalance: '500000', // ₹5,000
    dailyClosings: [],
    currentDate: CURRENT_DATE
});
// Expected = 5,000 + 15,000 - 3,000 = ₹17,000
assert.strictEqual(handyMetricsNoClosing.expectedClosingPaise, '1700000');

// 2b. Drawer closing with shortage
const handyClosings = [
    {
        date: CURRENT_DATE,
        countedClosing: createMoneyPaise('1680000'), // ₹16,800 counted (₹200 shortage)
        status: 'CLOSED'
    }
];
const handyMetricsWithShortage = computeHandyCashDashboardMetrics({
    transactions: handyTxns,
    openingBalance: '500000',
    dailyClosings: handyClosings,
    currentDate: CURRENT_DATE
});
assert.strictEqual(handyMetricsWithShortage.differenceStatus, 'SHORTAGE');
assert.strictEqual(handyMetricsWithShortage.differencePaise, '-20000');
console.log('  ✅ Handy cash till correctly computes expected closing and shortage/excess difference');

// Test 3: Business Operations Dashboard Metrics
console.log('\nTest 3: Business Operating Metrics');
const bizTxns = [
    {
        id: 'b1',
        transactionType: TransactionType.INCOME,
        amount: createMoneyPaise('5000000'), // ₹50,000 cash sale
        metadata: { actionId: 'RECORD_SALE', isCredit: false },
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    },
    {
        id: 'b2',
        transactionType: TransactionType.INCOME,
        amount: createMoneyPaise('3000000'), // ₹30,000 credit sale (receivable)
        metadata: { actionId: 'RECORD_SALE', isCredit: true },
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    },
    {
        id: 'b3',
        transactionType: TransactionType.EXPENSE,
        amount: createMoneyPaise('2000000'), // ₹20,000 credit purchase (payable)
        metadata: { actionId: 'RECORD_PURCHASE', isCredit: true },
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    },
    {
        id: 'b4',
        transactionType: TransactionType.EXPENSE,
        amount: createMoneyPaise('500000'), // ₹5,000 cash expenses
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    }
];

const bizMetrics = computeBusinessDashboardMetrics({
    transactions: bizTxns,
    currentDate: CURRENT_DATE
});

// Available cash = +50,000 (cash sale) - 5,000 (expense) = ₹45,000
assert.strictEqual(bizMetrics.availableCashPaise, '4500000');
// Receivables = ₹30,000
assert.strictEqual(bizMetrics.customerReceivablesPaise, '3000000');
// Payables = ₹20,000
assert.strictEqual(bizMetrics.supplierPayablesPaise, '2000000');
// Today Sales = 50,000 + 30,000 = ₹80,000
assert.strictEqual(bizMetrics.todaySalesPaise, '8000000');
// Today Purchases = ₹20,000
assert.strictEqual(bizMetrics.todayPurchasesPaise, '2000000');
console.log('  ✅ Business operations correctly isolates operating cash, customer receivables, and supplier payables');

// Test 4: Loan Liability Metrics
console.log('\nTest 4: Loan Liability Metrics');
const loanTxns = [
    {
        id: 'l1',
        category: 'loan_disbursed',
        amount: createMoneyPaise('50000000'), // ₹5,00,000 disbursed
        date: '2026-08-01',
        status: TransactionStatus.POSTED
    },
    {
        id: 'l2',
        transactionType: TransactionType.EXPENSE,
        amount: createMoneyPaise('2500000'), // ₹25,000 EMI
        loanSplit: {
            principal: createMoneyPaise('1800000'), // ₹18,000
            interest: createMoneyPaise('700000'),   // ₹7,000
            total: createMoneyPaise('2500000')
        },
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    }
];

const loanMetrics = computeLoanLiabilityDashboardMetrics({
    transactions: loanTxns,
    currentDate: CURRENT_DATE
});

// Outstanding principal = 5,00,000 - 18,000 = ₹4,82,000
assert.strictEqual(loanMetrics.outstandingPrincipalPaise, '48200000');
assert.strictEqual(loanMetrics.principalPaidMonthPaise, '1800000');
assert.strictEqual(loanMetrics.interestPaidMonthPaise, '700000');
console.log('  ✅ Loan liability correctly tracks outstanding debt reducing only by principal');

// Test 5: Provident Fund Metrics
console.log('\nTest 5: Provident Fund Metrics');
const pfTxns = [
    {
        id: 'pf1',
        amount: createMoneyPaise('1000000'), // ₹10,000 total
        provenance: {
            employee: createMoneyPaise('500000'), // ₹5,000
            employer: createMoneyPaise('500000'), // ₹5,000
            pension: createMoneyPaise('0')
        },
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    },
    {
        id: 'pf2',
        category: 'epfo_interest',
        amount: createMoneyPaise('82500'), // ₹825 interest
        date: CURRENT_DATE,
        status: TransactionStatus.POSTED
    }
];

const pfMetrics = computePFDashboardMetrics({
    transactions: pfTxns,
    currentDate: CURRENT_DATE
});

// Total PF value = 10,000 + 825 = ₹10,825
assert.strictEqual(pfMetrics.totalPFValuePaise, '1082500');
assert.strictEqual(pfMetrics.restrictedBalancePaise, '1082500');
assert.strictEqual(pfMetrics.availableBalancePaise, '0'); // ZERO liquid balance!
assert.strictEqual(pfMetrics.employeeSharePaise, '500000');
assert.strictEqual(pfMetrics.employerSharePaise, '500000');
assert.strictEqual(pfMetrics.accumulatedInterestPaise, '82500');
console.log('  ✅ Provident Fund correctly locks retirement wealth with zero liquid daily cash');

console.log('\n🎉 ALL PURPOSE-BUILT DASHBOARD METRIC REDUCER TESTS PASSED!\n');
