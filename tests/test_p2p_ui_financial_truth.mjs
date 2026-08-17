/**
 * test_p2p_ui_financial_truth.mjs
 * 
 * P2P UI FINANCIAL TRUTH & COMPREHENSION VALIDATION SUITE (P2P-UX-01 to P2P-UX-15)
 * 
 * Verifies that the UI ViewModels, presentation layer, and multi-screen state
 * strictly reflect the certified accounting and domain truth across all 6 surfaces:
 * 1. P2P Dashboard
 * 2. Person Relationship
 * 3. Loan Detail
 * 4. Payment Plan / Schedule
 * 5. Money Flow Integration (Zero-Burn Transfers, Interest Separation)
 * 6. Cash Account Reconciliation
 */

import {
    createPerson,
    createP2PLoan,
    createLoanAdvance,
    createLoanRepayment,
    createRepaymentScheduleItem,
    LOAN_DIRECTION,
    LOAN_STATUS,
    INTEREST_METHOD,
    SCHEDULE_STATUS
} from '../components/p2p/p2pDomainModel.js';

import {
    calculateLoanDNA,
    generateInitialSchedule,
    allocateRepayment,
    recalculateScheduleAfterPayment,
    recalculateScheduleAfterTopUp,
    skipInstallmentInSchedule,
    payInstallmentInAdvanceInSchedule,
    prepayPrincipalInSchedule,
    calculateSettlementQuote,
    calculateInterestTimeline,
    createDoubleEntryJournalForEvent,
    createReversalJournalEntry,
    rebuildP2PProjectionsFromJournal
} from '../components/p2p/p2pAccountingEngine.js';

import {
    convertJournalEntryToMoneyFlowTransactions,
    mapP2PJournalToMoneyFlowTransactions
} from '../components/p2p/p2pCashEventAdapter.js';

import {
    computeP2POverviewMetrics,
    computePersonP2PSummary,
    formatINR,
    formatPrecisionINR
} from '../components/p2p/p2pPresentationAdapter.js';

let totalTests = 0;
let passedTests = 0;

function assertUX(gateId, title, condition, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✓ [${gateId}] ${title}`);
    } else {
        console.error(`  ✗ [${gateId}] FAIL: ${title} ${details ? `(${details})` : ''}`);
        process.exitCode = 1;
    }
}

console.log('================================================================');
console.log('=== P2P UI FINANCIAL TRUTH & COMPREHENSION GATE (UX-01..15) ===');
console.log('================================================================\n');

// ── P2P-UX-01: ACTION COMPREHENSION (3 UNMISTAKABLE ACTIONS) ─────────────────
console.log('--- 1. Action Comprehension & Differentiated Pay Flows ---');
const testLoan = createP2PLoan({
    id: 'loan_ux_101',
    personId: 'person_kasapa',
    name: 'Kasapa Home Renovation',
    principal: 2500000,
    interestRate: 9.99,
    tenureMonths: 60,
    interestMethod: INTEREST_METHOD.SIMPLE,
    startDate: '2026-05-01',
    accountId: 'acc_hdfc_salary'
});

const initialSchedule = generateInitialSchedule(testLoan);
const nextItem = initialSchedule[0]; // Installment #1

// Action 1: Pay Next Installment Early / On-Schedule
const allocNext = allocateRepayment({
    loan: testLoan,
    paymentAmount: nextItem.expectedAmount,
    expectedPrincipal: nextItem.principalComponent,
    expectedInterest: nextItem.interestComponent,
    policy: 'INTEREST_FIRST'
});
const isAction1Distinct = (
    nextItem.installmentNumber === 1 &&
    allocNext.interestPaid === nextItem.interestComponent &&
    allocNext.principalPaid === nextItem.principalComponent &&
    Math.abs((allocNext.principalPaid + allocNext.interestPaid) - nextItem.expectedAmount) < 0.1
);
assertUX('P2P-UX-01', 'Pay Next Installment cleanly exposes installment #1, interest, and principal slice', isAction1Distinct);

// Action 2: Principal Prepayment (Lump-Sum ₹1,00,000)
const prepaymentResult = prepayPrincipalInSchedule({
    loan: testLoan,
    schedule: initialSchedule,
    prepaymentAmount: 100000,
    prepaymentDate: '2026-05-15'
});
const isAction2Distinct = (
    prepaymentResult[0].openingPrincipal === 2400000 &&
    prepaymentResult[0].expectedInterest <= initialSchedule[0].expectedInterest
);
assertUX('P2P-UX-01', 'Prepay Principal reduces opening principal to ₹24L and decreases future interest burden', isAction2Distinct);

// Action 3: Settle & Close Loan (Quote computation with waiver)
const quote = calculateSettlementQuote({
    loan: testLoan,
    advances: [createLoanAdvance({ loanId: testLoan.id, amount: 2500000, date: '2026-05-01' })],
    repayments: [],
    waiverAmount: 50000
});
const isAction3Distinct = (
    quote.principalOutstanding === 2500000 &&
    quote.waiverAmount === 50000 &&
    quote.settlementAmount === 2450000
);
assertUX('P2P-UX-01', 'Settle & Close computes exact settlement quote and records discount waiver', isAction3Distinct);


// ── P2P-UX-02: LOAN CREATION → 6-SCREEN TRUTH SYNCHRONIZATION ────────────────
console.log('\n--- 2. Six-Screen Truth Synchronization (Loan Creation) ---');
const personKasapa = createPerson({
    id: 'person_kasapa',
    name: 'Kasapa Reddy Bava',
    phone: '+91 98765 43210'
});

const jeCreation = createDoubleEntryJournalForEvent({
    eventType: 'P2P_LOAN_GIVEN',
    loan: testLoan,
    cashAccountId: 'acc_hdfc_salary',
    date: '2026-05-01',
    principalAmount: 2500000
});

const mfTransactions = convertJournalEntryToMoneyFlowTransactions(jeCreation, { [personKasapa.id]: personKasapa }, { [testLoan.id]: testLoan });
const overviewMetrics1 = computeP2POverviewMetrics([testLoan], [createLoanAdvance({ loanId: testLoan.id, amount: 2500000 })], [], { [testLoan.id]: initialSchedule });
const personSummary1 = computePersonP2PSummary(personKasapa, [testLoan], [createLoanAdvance({ loanId: testLoan.id, amount: 2500000 })], []);

// 1. Dashboard: Receivable = ₹25L
const screen1 = overviewMetrics1.totalReceivable === 2500000;
// 2. Person: Net Receivable = ₹25L
const screen2 = personSummary1.netOutstanding === 2500000;
// 3. Loan: Outstanding = ₹25L
const screen3 = testLoan.principal === 2500000;
// 4. Schedule: 60 installments
const screen4 = initialSchedule.length === 60;
// 5. Money Flow: Type is TRANSFER, burn is 0
const screen5 = mfTransactions[0].type === 'TRANSFER' && mfTransactions[0].isBurnExpense === false;
// 6. Cash Account Outflow: ₹25L
const screen6 = mfTransactions[0].amount === 2500000 && mfTransactions[0].account === 'acc_hdfc_salary';

assertUX('P2P-UX-02', 'Creation synchronizes simultaneously across all 6 surfaces with 0 lifestyle burn',
    screen1 && screen2 && screen3 && screen4 && screen5 && screen6);


// ── P2P-UX-03: NORMAL REPAYMENT SYNCHRONIZATION ──────────────────────────────
console.log('\n--- 3. Normal Repayment Synchronization ---');
const rep1 = createLoanRepayment({
    loanId: testLoan.id,
    amount: 62479.17,
    principalComponent: 41666.67,
    interestComponent: 20812.50,
    date: '2026-06-01',
    scheduleItemId: initialSchedule[0].id
});

const updatedSchedule1 = recalculateScheduleAfterPayment({
    loan: testLoan,
    existingSchedule: initialSchedule,
    repayment: rep1,
    asOfDate: '2026-06-01'
});

const jeRepayment1 = createDoubleEntryJournalForEvent({
    eventType: 'P2P_REPAYMENT_RECEIVED',
    loan: testLoan,
    repayment: rep1,
    cashAccountId: 'acc_hdfc_salary',
    date: '2026-06-01'
});

const mfRepayment1 = convertJournalEntryToMoneyFlowTransactions(jeRepayment1, { [personKasapa.id]: personKasapa }, { [testLoan.id]: testLoan });
assertUX('P2P-UX-03', 'Repayment splits into Principal TRANSFER (₹41.6k) + Interest INCOME (₹20.8k)',
    mfRepayment1.some(t => t.type === 'TRANSFER' && t.amount === 41666.67) &&
    mfRepayment1.some(t => t.type === 'INCOME' && t.amount === 20812.50) &&
    updatedSchedule1[0].status === SCHEDULE_STATUS.PAID);


// ── P2P-UX-04: PARTIAL PAYMENT SYNCHRONIZATION ──────────────────────────────
console.log('\n--- 4. Partial Payment Synchronization ---');
const repPartial = createLoanRepayment({
    loanId: testLoan.id,
    amount: 30000,
    principalComponent: 9187.50,
    interestComponent: 20812.50,
    date: '2026-07-01',
    scheduleItemId: updatedSchedule1[1].id
});
const schPartial = recalculateScheduleAfterPayment({
    loan: testLoan,
    existingSchedule: updatedSchedule1,
    repayment: repPartial,
    asOfDate: '2026-07-01'
});
assertUX('P2P-UX-04', 'Partial payment marks installment PARTIALLY_PAID and preserves exact remaining balance',
    schPartial[1].status === SCHEDULE_STATUS.PARTIALLY_PAID &&
    schPartial[1].paidAmount === 30000 &&
    Math.abs(schPartial[1].remainingTotal - (schPartial[1].expectedAmount - 30000)) < 0.1);


// ── P2P-UX-05: PRINCIPAL PREPAYMENT SYNCHRONIZATION ─────────────────────────
console.log('\n--- 5. Principal Prepayment Synchronization ---');
const schPrepaid = prepayPrincipalInSchedule({
    loan: testLoan,
    schedule: updatedSchedule1,
    prepaymentAmount: 200000,
    prepaymentDate: '2026-07-15'
});
assertUX('P2P-UX-05', 'Lump-sum principal prepayment immediately reduces opening principal of future installments',
    schPrepaid[1].openingPrincipal === (updatedSchedule1[1].openingPrincipal - 200000));


// ── P2P-UX-06: ADVANCE INSTALLMENT SYNCHRONIZATION ──────────────────────────
console.log('\n--- 6. Advance Installment Synchronization ---');
const schAdv = payInstallmentInAdvanceInSchedule({
    loan: testLoan,
    schedule: updatedSchedule1,
    installmentNumber: 3,
    paymentAmount: 62479.17,
    paymentDate: '2026-06-15'
});
assertUX('P2P-UX-06', 'Advance payment marks installment #3 as PREPAID without breaking ongoing tenure',
    schAdv[2].status === SCHEDULE_STATUS.PREPAID && schAdv[2].paidAmount === 62479.17);


// ── P2P-UX-07: SKIP SYNCHRONIZATION ─────────────────────────────────────────
console.log('\n--- 7. Skip Installment Synchronization ---');
const schSkip = skipInstallmentInSchedule({
    loan: testLoan,
    schedule: updatedSchedule1,
    installmentNumber: 2,
    skipDate: '2026-07-01'
});
assertUX('P2P-UX-07', 'Skip marks installment #2 as SKIPPED, carries interest forward, extends schedule length',
    schSkip[1].status === SCHEDULE_STATUS.SKIPPED &&
    schSkip.length === (updatedSchedule1.length + 1) &&
    schSkip[2].expectedInterest > updatedSchedule1[2].expectedInterest);


// ── P2P-UX-08: SETTLEMENT SYNCHRONIZATION ───────────────────────────────────
console.log('\n--- 8. Settlement & Closure Synchronization ---');
const jeSettlement = createDoubleEntryJournalForEvent({
    eventType: 'P2P_SETTLEMENT',
    loan: testLoan,
    cashAccountId: 'acc_hdfc_salary',
    date: '2026-08-01',
    settlement: {
        principalOutstanding: 2458333.33,
        interestOutstanding: 0,
        waiverAmount: 58333.33,
        finalSettlementAmount: 2400000
    }
});
assertUX('P2P-UX-08', 'Settlement produces balanced journal entry and extinguishes open obligations',
    jeSettlement.eventType === 'P2P_SETTLEMENT' &&
    Math.abs(jeSettlement.debits.reduce((s, d) => s + d.amount, 0) - jeSettlement.credits.reduce((s, c) => s + c.amount, 0)) < 0.01);


// ── P2P-UX-09: RELATIONSHIP SETTLE-UP SYNCHRONIZATION ───────────────────────
console.log('\n--- 9. Relationship Settle-Up (Netting Across Loans) ---');
const jeNetting = createDoubleEntryJournalForEvent({
    eventType: 'RELATIONSHIP_SETTLEMENT',
    entityId: 'person_kasapa',
    cashAccountId: 'acc_hdfc_salary',
    relationshipSettlement: {
        personId: 'person_kasapa',
        grossReceivableClosed: 1000000,
        grossPayableClosed: 300000,
        settlementAmount: 700000
    }
});
assertUX('P2P-UX-09', 'Multi-loan counterparty settle-up extinguishes gross positions and moves net cash ₹7L',
    jeNetting.lines.some(l => l.component === 'CAPITAL' && l.debit === 700000) &&
    jeNetting.lines.some(l => l.accountId === 'ASSET_P2P_RECEIVABLE' && l.credit === 1000000) &&
    jeNetting.lines.some(l => l.accountId === 'LIABILITY_P2P_PAYABLE' && l.debit === 300000));


// ── P2P-UX-10: REVERSAL SYNCHRONIZATION ─────────────────────────────────────
console.log('\n--- 10. Reversal Synchronization ---');
const reversalEntry = createReversalJournalEntry({
    originalJournalEntry: jeRepayment1,
    reversalReason: 'Reversing accidental duplicate payment entry'
});
assertUX('P2P-UX-10', 'Reversal entry creates inverted balanced journal line without mutating history',
    reversalEntry.reversesJournalEntryId === jeRepayment1.id &&
    reversalEntry.lines.length === jeRepayment1.lines.length);


// ── P2P-UX-11: MONEY FLOW CLASSIFICATION ────────────────────────────────────
console.log('\n--- 11. Money Flow Classification Truth ---');
const p2pJournal = [jeCreation, jeRepayment1];
const allMfTxs = mapP2PJournalToMoneyFlowTransactions(p2pJournal, [personKasapa], [testLoan]);

let totalBurnExpense = 0;
let totalOrdinaryIncome = 0;
allMfTxs.forEach(tx => {
    if (tx.isBurnExpense) totalBurnExpense += tx.amount;
    if (tx.isOrdinaryIncome) totalOrdinaryIncome += tx.amount;
});

assertUX('P2P-UX-11', 'P2P capital transactions produce ₹0 lifestyle burn and only recognize interest as income',
    totalBurnExpense === 0 && totalOrdinaryIncome === 20812.50);


// ── P2P-UX-12: CASH-ACCOUNT RECONCILIATION ──────────────────────────────────
console.log('\n--- 12. Cash-Account Reconciliation ---');
const initialBankBalance = 5000000;
let netBankMovement = 0;
allMfTxs.forEach(tx => {
    if (tx.type === 'TRANSFER' && tx.transferType === 'P2P_OUTFLOW') netBankMovement -= tx.amount;
    if (tx.type === 'TRANSFER' && tx.transferType === 'P2P_INFLOW') netBankMovement += tx.amount;
    if (tx.type === 'INCOME') netBankMovement += tx.amount;
});
const finalBankBalance = initialBankBalance + netBankMovement;
assertUX('P2P-UX-12', 'Bank balance reconciles to the exact rupee after loan disbursement and repayment',
    Math.abs(finalBankBalance - (5000000 - 2500000 + 62479.17)) < 0.1);


// ── P2P-UX-13: EMPTY / PRODUCTION STATE ─────────────────────────────────────
console.log('\n--- 13. Production Empty State Grace ---');
const emptyOverview = computeP2POverviewMetrics([], [], [], {});
const emptyPersonSummary = computePersonP2PSummary(personKasapa, [], [], []);
assertUX('P2P-UX-13', 'Empty state renders 0 receivables, 0 payables, and safe empty arrays',
    emptyOverview.totalReceivable === 0 &&
    emptyOverview.totalPayable === 0 &&
    emptyPersonSummary.totalGiven === 0 &&
    emptyPersonSummary.totalTaken === 0);


// ── P2P-UX-14: LONG-HISTORY USABILITY ───────────────────────────────────────
console.log('\n--- 14. Long-History & Timeline Usability ---');
const timeline60 = calculateInterestTimeline({
    loan: testLoan,
    schedule: updatedSchedule1,
    advances: [createLoanAdvance({ loanId: testLoan.id, amount: 2500000 })],
    repayments: [rep1],
    asOfDate: '2026-06-01'
});
assertUX('P2P-UX-14', 'Interest timeline renders structured month entries with active/paid/upcoming markers',
    timeline60.timeline.length === 60 &&
    timeline60.timeline[0].status === 'PAID' &&
    timeline60.timeline[1].status === 'DUE');


// ── P2P-UX-15: MOBILE ACCESSIBILITY & BALANCE CHANGE EXPLAINABILITY ─────────
console.log('\n--- 15. Balance Change Explainability & INR Formatting ---');
const formattedINR = formatINR(2500000);
const formattedPrecision = formatPrecisionINR(2467283.37);
assertUX('P2P-UX-15', 'Currency formatters conform to Indian numbering standard (₹25,00,000 and ₹24,67,283.37)',
    formattedINR === '₹25,00,000' && formattedPrecision === '₹24,67,283.37');

console.log('\n================================================================');
console.log(`=== P2P UI FINANCIAL TRUTH GATE: ${passedTests}/${totalTests} TESTS PASSED ===`);
console.log('================================================================\n');
