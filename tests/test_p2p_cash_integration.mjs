/**
 * test_p2p_cash_integration.mjs
 * 
 * P2P SUITE 3: DOUBLE-ENTRY ACCOUNTING INVARIANTS & MONEY FLOW CASH TRUTH
 * 
 * Verifies User-Approved Accounting Contracts:
 * 1. P2P Loan Given Contract:
 *    - Cash Account (HDFC) = -₹2,50,000
 *    - P2P Receivable Asset = +₹2,50,000
 *    - Ordinary Expense (Burn) = ₹0 (CRITICAL: Asset swap, never false expense)
 * 2. P2P Repayment Received Contract:
 *    - Cash Account (HDFC) = +₹53,519
 *    - P2P Receivable Asset = -₹33,810 (Principal portion)
 *    - Interest Income = +₹19,709 (Taxable / P&L income)
 * 3. P2P Loan Taken Contract:
 *    - Cash Account = +₹1,00,000
 *    - P2P Payable Liability = +₹1,00,000
 *    - Ordinary Income = ₹0 (CRITICAL: Debt inflow, never false revenue)
 * 4. P2P Repayment Paid Contract:
 *    - Cash Account = -₹25,000
 *    - P2P Payable Liability = -₹20,000 (Principal reduction)
 *    - Interest Expense = +₹5,000 (Financing cost)
 * 5. Money Flow Integration Adapter produces schema-compliant transaction records
 */

import {
    createDoubleEntryJournalForEvent,
    JOURNAL_EVENT_TYPES
} from '../components/p2p/p2pAccountingEngine.js';

import {
    adaptJournalEntryToMoneyFlowTx,
    generateMoneyFlowTransactionsForLoan
} from '../components/p2p/p2pCashEventAdapter.js';

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

console.log('=== P2P SUITE 3: DOUBLE-ENTRY ACCOUNTING & MONEY FLOW CASH TRUTH ===\n');

// ── 1. CONTRACT 1: LOAN GIVEN (ASSET SWAP, ZERO BURN) ──────────────────────
console.log('--- 1. Contract 1: P2P Loan Given (₹2.5L to Kasapa) ---');
const loanGivenJournal = createDoubleEntryJournalForEvent({
    sourceEntityId: 'p2p_loan_kasapa_1',
    sourceEventId: 'adv_kasapa_init',
    eventType: JOURNAL_EVENT_TYPES.LOAN_GIVEN,
    timestamp: '2026-08-01T10:00:00.000Z',
    cashAccountId: 'acc_hdfc_salary',
    cashAccountName: 'HDFC Salary Account',
    principalAmount: 250000,
    counterpartyName: 'Kasapa Reddy Bava'
});

assert(loanGivenJournal.journalEntryId.startsWith('jrn_') || loanGivenJournal.journalEntryId.startsWith('je_'), 'Journal entry ID generated');
assert(loanGivenJournal.eventType === 'P2P_LOAN_GIVEN', 'Event type is P2P_LOAN_GIVEN');

const lgDebits = loanGivenJournal.debits;
const lgCredits = loanGivenJournal.credits;
assert(lgDebits.length === 1 && lgDebits[0].account === 'ASSET_P2P_RECEIVABLE' && lgDebits[0].amount === 250000, 'Debit: ASSET_P2P_RECEIVABLE ₹2,50,000');
assert(lgCredits.length === 1 && lgCredits[0].account === 'acc_hdfc_salary' && lgCredits[0].amount === 250000, 'Credit: acc_hdfc_salary ₹2,50,000');

// Adapt to Money Flow
const mfLoanGiven = adaptJournalEntryToMoneyFlowTx(loanGivenJournal);
assert(mfLoanGiven !== null, 'Adapter converted journal entry to Money Flow item');
assert(mfLoanGiven.amount === 250000, 'Money flow amount is ₹2,50,000');
assert(mfLoanGiven.type === 'EXPENSE' || mfLoanGiven.type === 'TRANSFER', 'Flow type is outflow/transfer');
assert(mfLoanGiven.isBurnExpense === false, 'CRITICAL PROTECTED: isBurnExpense is false (Not ordinary burn)');
assert(mfLoanGiven.isP2P === true, 'Flagged as isP2P');
assert(mfLoanGiven.category === 'P2P_LOAN_GIVEN', 'Category is semantic P2P_LOAN_GIVEN');

// ── 2. CONTRACT 2: REPAYMENT RECEIVED (CASH + RECEIVABLE REDUCTION + INCOME) ─
console.log('\n--- 2. Contract 2: Repayment Received (₹53,519 installment) ---');
const repayJournal = createDoubleEntryJournalForEvent({
    sourceEntityId: 'p2p_loan_kasapa_1',
    sourceEventId: 'rep_kasapa_inst1',
    eventType: JOURNAL_EVENT_TYPES.REPAYMENT_RECEIVED,
    timestamp: '2026-09-06T10:00:00.000Z',
    cashAccountId: 'acc_hdfc_salary',
    cashAccountName: 'HDFC Salary Account',
    principalAmount: 33810,
    interestAmount: 19709,
    counterpartyName: 'Kasapa Reddy Bava'
});

const rDebits = repayJournal.debits;
const rCredits = repayJournal.credits;
assert(rDebits.length === 1 && rDebits[0].account === 'acc_hdfc_salary' && rDebits[0].amount === 53519, 'Debit: acc_hdfc_salary +₹53,519');
assert(rCredits.some(c => c.account === 'ASSET_P2P_RECEIVABLE' && c.amount === 33810), 'Credit: ASSET_P2P_RECEIVABLE -₹33,810');
assert(rCredits.some(c => c.account === 'INCOME_P2P_INTEREST' && c.amount === 19709), 'Credit: INCOME_P2P_INTEREST +₹19,709');

const mfRepay = adaptJournalEntryToMoneyFlowTx(repayJournal);
assert(mfRepay.amount === 53519, 'Repayment money flow amount is ₹53,519');
assert(mfRepay.type === 'INCOME', 'Type is INCOME');
assert(mfRepay.principalAmount === 33810, 'Metadata preserves principal reduction portion');
assert(mfRepay.interestAmount === 19709, 'Metadata preserves interest income portion');
assert(mfRepay.isOrdinaryIncome === false, 'CRITICAL PROTECTED: Principal portion is not ordinary business revenue');

// ── 3. CONTRACT 3: LOAN TAKEN (INFLOW LIABILITY, ZERO INCOME) ───────────────
console.log('\n--- 3. Contract 3: P2P Loan Taken (₹1,00,000 from Rahul) ---');
const loanTakenJournal = createDoubleEntryJournalForEvent({
    sourceEntityId: 'p2p_loan_rahul_1',
    sourceEventId: 'adv_rahul_init',
    eventType: JOURNAL_EVENT_TYPES.LOAN_TAKEN,
    timestamp: '2026-08-10T10:00:00.000Z',
    cashAccountId: 'acc_icici_savings',
    cashAccountName: 'ICICI Savings Account',
    principalAmount: 100000,
    counterpartyName: 'Rahul Varma'
});

assert(loanTakenJournal.debits[0].account === 'acc_icici_savings' && loanTakenJournal.debits[0].amount === 100000, 'Debit: Cash +₹1,00,000');
assert(loanTakenJournal.credits[0].account === 'LIABILITY_P2P_PAYABLE' && loanTakenJournal.credits[0].amount === 100000, 'Credit: LIABILITY_P2P_PAYABLE +₹1,00,000');

const mfLoanTaken = adaptJournalEntryToMoneyFlowTx(loanTakenJournal);
assert(mfLoanTaken.isOrdinaryIncome === false, 'CRITICAL PROTECTED: Debt inflow is not ordinary income');

// ── 4. CONTRACT 4: REPAYMENT PAID (LIABILITY REDUCTION + INTEREST EXPENSE) ─
console.log('\n--- 4. Contract 4: P2P Repayment Paid (₹25,000 to Rahul) ---');
const repayPaidJournal = createDoubleEntryJournalForEvent({
    sourceEntityId: 'p2p_loan_rahul_1',
    sourceEventId: 'rep_rahul_inst1',
    eventType: JOURNAL_EVENT_TYPES.REPAYMENT_PAID,
    timestamp: '2026-09-10T10:00:00.000Z',
    cashAccountId: 'acc_icici_savings',
    cashAccountName: 'ICICI Savings Account',
    principalAmount: 20000,
    interestAmount: 5000,
    counterpartyName: 'Rahul Varma'
});

assert(repayPaidJournal.debits.some(d => d.account === 'LIABILITY_P2P_PAYABLE' && d.amount === 20000), 'Debit: LIABILITY_P2P_PAYABLE ₹20,000');
assert(repayPaidJournal.debits.some(d => d.account === 'EXPENSE_P2P_INTEREST' && d.amount === 5000), 'Debit: EXPENSE_P2P_INTEREST ₹5,000');
assert(repayPaidJournal.credits[0].account === 'acc_icici_savings' && repayPaidJournal.credits[0].amount === 25000, 'Credit: acc_icici_savings ₹25,000');

// ── 5. BATCH LOAN JOURNAL GENERATOR ─────────────────────────────────────────
console.log('\n--- 5. Batch Adapter Integrity ---');
const batchTx = generateMoneyFlowTransactionsForLoan([loanGivenJournal, repayJournal]);
assert(batchTx.length === 2, 'Batch generator returns both transactions');
assert(batchTx[0].category === 'P2P_LOAN_GIVEN', 'First tx is P2P_LOAN_GIVEN');
assert(batchTx[1].category === 'P2P_REPAYMENT_RECEIVED', 'Second tx is P2P_REPAYMENT_RECEIVED');

console.log(`\n=== P2P CASH INTEGRATION SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
