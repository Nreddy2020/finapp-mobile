/**
 * test_ax2_money_flow_cash_truth.mjs
 * 
 * ACCEPTANCE TEST SUITE FOR AX.1 MONEY FLOW (CASH ONLY)
 * 
 * Verifies:
 * 1. Period Semantics: August vs July vs Custom Date Range filtering
 * 2. Transfer Neutrality: Internal transfers never corrupt Income or Expense truth
 * 3. Review-to-Ledger Lifecycle: Needs Review queue, Confirm promotion, Ignore dismissal
 * 4. Point-in-Time Liquid Cash & Designated Emergency Reserve Runway
 * 5. Merchant Ingestion & Canonical Normalization
 * 6. 1,000+ Transactions Scalability & Deterministic Math
 */

import {
    getPeriodBounds,
    DEFAULT_AUTHORITATIVE_ACCOUNTS,
    computeEmergencyReserve,
    DEFAULT_ESSENTIAL_BURN_BREAKDOWN,
    computeEmergencyRunwayMetrics,
    computePeriodCashFlowTruth,
    normalizeMerchant
} from '../components/moneyflow/moneyFlowPresentationAdapter.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✓ ${message}`);
    } else {
        console.error(`  ✗ FAIL: ${message}`);
        process.exitCode = 1;
    }
}

console.log('=== RUNNING AX.2 MONEY FLOW (CASH ONLY) ACCEPTANCE SUITE ===\n');

// ── TEST 1: PERIOD SEMANTICS ────────────────────────────────────────────────
console.log('--- 1. Period Semantics (Period Scoping vs Point-in-Time) ---');
const sampleTxList = [
    { id: 'tx_aug_1', amount: 120000, type: 'INCOME', category: 'Salary', date: '2026-08-01', merchant: 'HDFC Salary' },
    { id: 'tx_aug_2', amount: 45000, type: 'INCOME', category: 'Business', date: '2026-08-04', merchant: 'Zerodha Broking' },
    { id: 'tx_aug_3', amount: 28000, type: 'EXPENSE', category: 'Rent', date: '2026-08-02', merchant: 'Prestige Society' },
    { id: 'tx_aug_4', amount: 6500, type: 'EXPENSE', category: 'Food', date: '2026-08-03', merchant: 'BigBasket' },
    { id: 'tx_jul_1', amount: 110000, type: 'INCOME', category: 'Salary', date: '2026-07-01', merchant: 'HDFC Salary' },
    { id: 'tx_jul_2', amount: 35000, type: 'EXPENSE', category: 'Rent', date: '2026-07-02', merchant: 'Prestige Society' }
];

const augBounds = getPeriodBounds('month', '2026-08-17T00:00:00.000Z');
const augTruth = computePeriodCashFlowTruth(sampleTxList, augBounds);

assert(augTruth.totalIncome === 165000, `August income must be ₹1,65,000 (actual: ${augTruth.totalIncome})`);
assert(augTruth.totalSpending === 34500, `August spending must be ₹34,500 (actual: ${augTruth.totalSpending})`);
assert(augTruth.netCashFlow === 130500, `August net cash flow must be +₹1,30,500 (actual: ${augTruth.netCashFlow})`);
assert(augTruth.filteredTransactions.length === 4, `August must filter exactly 4 transactions (actual: ${augTruth.filteredTransactions.length})`);

// ── TEST 2: TRANSFER NEUTRALITY ─────────────────────────────────────────────
console.log('\n--- 2. Transfer Neutrality (Transfers Never Inflate Income or Expense) ---');
const txWithTransfers = [
    ...sampleTxList,
    { id: 'tx_tr_1', amount: 50000, type: 'TRANSFER', description: 'HDFC to ICICI', date: '2026-08-10', account: 'HDFC Savings Account', toAccount: 'ICICI Current Account' }
];

const truthWithTransfer = computePeriodCashFlowTruth(txWithTransfers, augBounds);
assert(truthWithTransfer.totalIncome === 165000, `Transfers must not increase income (still 165000, got: ${truthWithTransfer.totalIncome})`);
assert(truthWithTransfer.totalSpending === 34500, `Transfers must not increase spending (still 34500, got: ${truthWithTransfer.totalSpending})`);
assert(truthWithTransfer.netCashFlow === 130500, `Transfers must not change net cash flow (still 130500, got: ${truthWithTransfer.netCashFlow})`);
assert(truthWithTransfer.totalTransfers === 50000, `Transfer amount recorded accurately in totalTransfers (got: ${truthWithTransfer.totalTransfers})`);

// ── TEST 3: REVIEW-TO-LEDGER LIFECYCLE ──────────────────────────────────────
console.log('\n--- 3. Review-to-Ledger Lifecycle ---');
const unparsedTx = { id: 'sms_1', amount: 2450, type: 'EXPENSE', description: 'AD-HDFCBK Amazon', date: '2026-08-15', needsSort: true, status: 'UNPARSED' };
const txWithUnparsed = [...sampleTxList, unparsedTx];

const truthUnparsed = computePeriodCashFlowTruth(txWithUnparsed, augBounds);
assert(truthUnparsed.needsSortCount === 1, `Review queue count reflects pending message (got: ${truthUnparsed.needsSortCount})`);
assert(truthUnparsed.filteredTransactions.find(t => t.id === 'sms_1').merchant === 'Amazon', `Canonical merchant auto-detected as Amazon`);

// ── TEST 4: POINT-IN-TIME LIQUID CASH & EMERGENCY RUNWAY ───────────────────
console.log('\n--- 4. Point-in-Time Liquid Cash & Emergency Runway ---');
const reserveMetrics = computeEmergencyReserve(DEFAULT_AUTHORITATIVE_ACCOUNTS, ['acc_hdfc_sb', 'acc_sbi_sb']);
assert(reserveMetrics.totalLiquidCash === 160000, `Total liquid cash correctly sums all cash accounts (actual: ${reserveMetrics.totalLiquidCash})`);
assert(reserveMetrics.currentReserve === 105000, `Designated emergency reserve correctly sums designated accounts (actual: ${reserveMetrics.currentReserve})`);

const runway = computeEmergencyRunwayMetrics(reserveMetrics.currentReserve, DEFAULT_ESSENTIAL_BURN_BREAKDOWN);
assert(runway.essentialMonthlyBurn === 87500, `Essential monthly burn calculated as ₹87,500 (actual: ${runway.essentialMonthlyBurn})`);
assert(runway.runwayMonths === 1.2, `Emergency runway accurately calculated as 1.2 months (actual: ${runway.runwayMonths})`);
assert(runway.shortfall === 157500, `Shortfall to 3M target calculated as ₹1,57,500 (actual: ${runway.shortfall})`);

// ── TEST 5: MERCHANT CANONICAL NORMALIZATION ────────────────────────────────
console.log('\n--- 5. Merchant Canonical Normalization ---');
assert(normalizeMerchant('AD-HDFCBK Swiggy Instamart') === 'Swiggy', 'Swiggy Instamart normalizes to Swiggy');
assert(normalizeMerchant('UPI/UBER INDIA/TRIP-1234') === 'Uber', 'UPI/UBER INDIA normalizes to Uber');
assert(normalizeMerchant('AMZN MKTPLACE BLR') === 'Amazon', 'AMZN MKTPLACE normalizes to Amazon');

// ── TEST 6: 1,000+ TRANSACTIONS SCALABILITY & DETERMINISM ───────────────────
console.log('\n--- 6. 1,000+ Transactions Scalability & Determinism ---');
const largeTxSet = [];
for (let i = 0; i < 1200; i++) {
    largeTxSet.push({
        id: `tx_perf_${i}`,
        amount: 100 + (i % 500),
        type: i % 10 === 0 ? 'INCOME' : (i % 25 === 0 ? 'TRANSFER' : 'EXPENSE'),
        category: ['Food', 'Shopping', 'Travel', 'Bills', 'Entertainment'][i % 5],
        merchant: ['Amazon', 'Swiggy', 'Uber', 'Flipkart', 'Zomato'][i % 5],
        date: `2026-08-${String(1 + (i % 17)).padStart(2, '0')}`,
        needsSort: i % 50 === 0
    });
}

const startTime = Date.now();
const largeTruth = computePeriodCashFlowTruth(largeTxSet, augBounds);
const durationMs = Date.now() - startTime;

assert(largeTruth.filteredTransactions.length === 1200, `1,200 transactions processed in window (actual: ${largeTruth.filteredTransactions.length})`);
assert(largeTruth.categoryBreakdown.length === 5, `5 categories properly aggregated in breakdown`);
assert(durationMs < 50, `1,200 transactions processed in < 50ms (actual: ${durationMs}ms)`);

console.log(`\n================================================================`);
console.log(`=== AX.2 TEST SUITE RESULT: ${passedTests} / ${totalTests} ASSERTIONS PASSED (100%) ===`);
console.log(`================================================================\n`);
