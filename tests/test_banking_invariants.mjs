/**
 * test_banking_invariants.mjs
 * 
 * AUTHORITATIVE BANKING SUB-SYSTEM INVARIANT TEST SUITE (BANK-01 to BANK-35)
 * 
 * Verifies that the FinLife Banking subsystem satisfies all mathematical, double-entry accounting,
 * projection replay, integer-paise, prepayment intelligence, and isolation invariants.
 */

import {
    toPaise,
    fromPaise,
    validateMonetaryInput,
    MONEY_VALIDITY,
    createBank,
    createBankAccount,
    createBankLoan,
    createLoanInstallment,
    createLoanRateRevision,
    createBankingJournalLine,
    createBankingJournalEntry,
    BANK_TYPE,
    BANK_ACCOUNT_TYPE,
    BANK_LOAN_TYPE,
    INTEREST_METHOD,
    INSTALLMENT_STATUS,
    BANKING_JOURNAL_EVENT_TYPES
} from '../components/banking/bankingDomainModel.js';

import {
    calculateContractualEMIPaise,
    generateBankLoanSchedule,
    applyRateRevisionToSchedule,
    allocateEMIPayment,
    recalculateScheduleAfterEMIPayment,
    calculatePrepaymentIntelligence,
    applyPrepaymentToSchedule,
    calculateForeclosureQuote,
    createDoubleEntryBankingJournalForEvent,
    createBankingReversalJournalEntry
} from '../components/banking/bankingAccountingEngine.js';

import {
    rebuildBankingProjectionsFromJournal,
    computeBankingProjectionHash,
    validateBankingFinancialTruth
} from '../components/banking/bankingProjectionEngine.js';

import {
    convertBankingJournalEntryToMoneyFlowTransactions,
    mapBankingJournalToMoneyFlowTransactions
} from '../components/banking/bankingCashEventAdapter.js';

let totalTests = 0;
let passedTests = 0;

function assertInvariant(code, title, condition, details = '') {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  ✓ [${code}] ${title}`);
    } else {
        console.error(`  ✗ [${code}] FAIL: ${title} ${details ? `(${details})` : ''}`);
        process.exitCode = 1;
    }
}

console.log('================================================================');
console.log('=== FINLIFE BANKING AUTHORITATIVE INVARIANTS (BANK-01..35)   ===');
console.log('================================================================\n');

// ── BANK-01: INTEGER-PAISE INPUT VALIDATION ─────────────────────────────────
console.log('--- 1. Monetary Primitives & Integer-Paise Invariants ---');
const vPos = validateMonetaryInput(2500000.50);
const vZero = validateMonetaryInput(0);
const vInvalid = validateMonetaryInput('invalid_amt');
const paiseVal = toPaise(2500000.50);
const inrVal = fromPaise(250000050);

assertInvariant('BANK-01', 'Monetary validator distinguishes positive, zero, and rejects invalid inputs',
    vPos.validity === MONEY_VALIDITY.VALID_POSITIVE &&
    vZero.validity === MONEY_VALIDITY.VALID_ZERO &&
    vInvalid.validity === MONEY_VALIDITY.INVALID &&
    paiseVal === 250000050 &&
    inrVal === 2500000.50);

// ── BANK-02: BANK ENTITY FACTORY ────────────────────────────────────────────
const testBank = createBank({
    id: 'bank_hdfc',
    name: 'HDFC Bank',
    shortName: 'HDFC',
    type: BANK_TYPE.PRIVATE
});
assertInvariant('BANK-02', 'Bank entity factory creates valid bank with structured metadata',
    testBank.id === 'bank_hdfc' && testBank.name === 'HDFC Bank' && testBank.type === 'PRIVATE');

// ── BANK-03: BANK ACCOUNT ENTITY FACTORY ────────────────────────────────────
const testAccount = createBankAccount({
    id: 'bacc_hdfc_salary',
    bankId: 'bank_hdfc',
    accountType: BANK_ACCOUNT_TYPE.SAVINGS,
    accountName: 'HDFC Salary Advantage',
    maskedAccountNumber: '•••• 4821',
    openingBalancePaise: 50000000, // ₹5,00,000.00
    isPrimary: true
});
assertInvariant('BANK-03', 'Bank Account stores integer-paise opening balance and masks account number',
    testAccount.openingBalancePaise === 50000000 && testAccount.maskedAccountNumber === '•••• 4821');

// ── BANK-04: BANK LOAN ENTITY FACTORY ───────────────────────────────────────
const testLoan = createBankLoan({
    id: 'bloan_hdfc_personal_25L',
    bankId: 'bank_hdfc',
    loanType: BANK_LOAN_TYPE.PERSONAL,
    loanName: 'HDFC Personal Loan 25L',
    originalPrincipalPaise: 250000000, // ₹25,00,000.00
    interestRate: 9.99,
    interestMethod: INTEREST_METHOD.AMORTIZED,
    tenureMonths: 60,
    startDate: '2026-05-01',
    repaymentAccountId: 'bacc_hdfc_salary',
    prepaymentPenaltyPct: 2.0
});
assertInvariant('BANK-04', 'Bank Loan stores exact original principal (25Cr paise / ₹25L) and amortized method',
    testLoan.originalPrincipalPaise === 250000000 && testLoan.interestRate === 9.99 && testLoan.tenureMonths === 60);

// ── BANK-05: CONTRACTUAL EMI FORMULA ────────────────────────────────────────
const emiPaise = calculateContractualEMIPaise(250000000, 9.99, 60);
// Standard Amortized EMI on ₹25L @ 9.99% for 60 months = ₹53,105.31 -> 5310531 paise
assertInvariant('BANK-05', 'Contractual EMI formula computes exact amortized monthly installment in paise',
    emiPaise === 5310531);

// ── BANK-06: ZERO-RATE LOAN HANDLING ────────────────────────────────────────
const zeroRateEMI = calculateContractualEMIPaise(12000000, 0, 12); // ₹1,20,000 / 12 = ₹10,000
assertInvariant('BANK-06', 'Zero-rate loan calculation avoids division-by-zero and yields exact integer quotient',
    zeroRateEMI === 1000000);

// ── BANK-07: AMORTIZATION SCHEDULE GENERATION ───────────────────────────────
const initialSchedule = generateBankLoanSchedule(testLoan);
assertInvariant('BANK-07', 'Schedule generation creates exactly 60 structured monthly installments',
    initialSchedule.length === 60 && initialSchedule[0].installmentNumber === 1);

// ── BANK-08: PRINCIPAL CONSERVATION IN SCHEDULE ─────────────────────────────
const sumExpectedPrincipalPaise = initialSchedule.reduce((s, item) => s + item.expectedPrincipalPaise, 0);
assertInvariant('BANK-08', 'Sum of expected principal across all installments strictly equals original principal',
    sumExpectedPrincipalPaise === testLoan.originalPrincipalPaise);

// ── BANK-09: FINAL INSTALLMENT ZEROING ──────────────────────────────────────
const finalInstallment = initialSchedule[initialSchedule.length - 1];
assertInvariant('BANK-09', 'Final installment closing principal is strictly 0 paise with zero phantom residual',
    finalInstallment.closingPrincipalPaise === 0);

// ── BANK-10: DOUBLE-ENTRY JOURNAL BALANCE ───────────────────────────────────
console.log('\n--- 2. Double-Entry Journal & Allocation Invariants ---');
const disbJournal = createDoubleEntryBankingJournalForEvent({
    eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_DISBURSED,
    bankId: testBank.id,
    bankAccountId: testAccount.id,
    loanId: testLoan.id,
    amountPaise: testLoan.originalPrincipalPaise,
    date: '2026-05-01'
});
const debitsDisb = disbJournal.lines.reduce((s, l) => s + l.debitPaise, 0);
const creditsDisb = disbJournal.lines.reduce((s, l) => s + l.creditPaise, 0);
assertInvariant('BANK-10', 'Loan disbursement journal entry satisfies sum(Debits) === sum(Credits)',
    debitsDisb === creditsDisb && debitsDisb === 250000000);

// ── BANK-11: SCHEDULED EMI PAYMENT ALLOCATION WATERFALL ─────────────────────
const item1 = initialSchedule[0];
const emiAllocation = allocateEMIPayment({
    paymentAmountPaise: item1.expectedTotalPaise,
    expectedPrincipalPaise: item1.expectedPrincipalPaise,
    expectedInterestPaise: item1.expectedInterestPaise,
    expectedFeesPaise: 0,
    expectedPenaltyPaise: 0
});
assertInvariant('BANK-11', 'EMI allocation waterfall splits full expected installment into principal and interest slices',
    emiAllocation.paidInterestPaise === item1.expectedInterestPaise &&
    emiAllocation.paidPrincipalPaise === item1.expectedPrincipalPaise &&
    emiAllocation.isFullySatisfied === true);

// ── BANK-12: PARTIAL PAYMENT HANDLING ───────────────────────────────────────
const partialSchedule = recalculateScheduleAfterEMIPayment({
    loan: testLoan,
    schedule: initialSchedule,
    installmentId: item1.id,
    paymentAmountPaise: 2500000, // ₹25,000 partial payment
    paymentDate: '2026-06-01'
});
assertInvariant('BANK-12', 'Partial payment transitions installment to PARTIALLY_PAID and tracks paidTotal accurately',
    partialSchedule[0].status === INSTALLMENT_STATUS.PARTIALLY_PAID &&
    partialSchedule[0].paidTotalPaise === 2500000);

// ── BANK-13: FULL PAYMENT HANDLING ──────────────────────────────────────────
const fullSchedule = recalculateScheduleAfterEMIPayment({
    loan: testLoan,
    schedule: initialSchedule,
    installmentId: item1.id,
    paymentAmountPaise: item1.expectedTotalPaise,
    paymentDate: '2026-06-01'
});
assertInvariant('BANK-13', 'Full payment transitions installment to PAID with exact completion date',
    fullSchedule[0].status === INSTALLMENT_STATUS.PAID &&
    fullSchedule[0].paidTotalPaise === item1.expectedTotalPaise);

// ── BANK-14: PREPAYMENT IMPOSSIBLE-CASE GUARD ───────────────────────────────
console.log('\n--- 3. Prepayment Decision Intelligence Invariants ---');
const invalidPrepay = calculatePrepaymentIntelligence({
    outstandingPrincipalPaise: 250000000,
    annualRate: 9.99,
    remainingTenureMonths: 60,
    contractualEMIPaise: 100000, // Impossibly low EMI (₹1,000 vs ~₹20.8k monthly interest)
    prepaymentAmountPaise: 10000000
});
assertInvariant('BANK-14', 'Prepayment engine rejects impossible scenario where EMI <= P * r with PREPAYMENT_SCENARIO_INVALID',
    invalidPrepay.valid === false && invalidPrepay.error === 'PREPAYMENT_SCENARIO_INVALID');

// ── BANK-15: PREPAYMENT FORECLOSURE TRIGGER ─────────────────────────────────
const fullPrepay = calculatePrepaymentIntelligence({
    outstandingPrincipalPaise: 250000000,
    annualRate: 9.99,
    remainingTenureMonths: 60,
    contractualEMIPaise: 5307349,
    prepaymentAmountPaise: 250000000 // Equal to outstanding
});
assertInvariant('BANK-15', 'Prepayment of entire outstanding automatically signals isForeclosureRequired: true',
    fullPrepay.valid === true && fullPrepay.isForeclosureRequired === true);

// ── BANK-16: PREPAYMENT OPTION A (TENURE REDUCTION) ─────────────────────────
const prepay5L = calculatePrepaymentIntelligence({
    outstandingPrincipalPaise: 250000000, // ₹25L
    annualRate: 9.99,
    remainingTenureMonths: 60,
    contractualEMIPaise: 5307349,
    prepaymentAmountPaise: 50000000,      // ₹5L
    prepaymentPenaltyPct: 2.0
});
assertInvariant('BANK-16', 'Option A reduces tenure from 60 months and computes gross interest saved',
    prepay5L.valid === true &&
    prepay5L.optionA.newTenureMonths < 60 &&
    prepay5L.optionA.monthsSaved > 0 &&
    prepay5L.optionA.grossInterestSavedPaise > 0);

// ── BANK-17: PREPAYMENT OPTION B (EMI REDUCTION) ────────────────────────────
assertInvariant('BANK-17', 'Option B keeps tenure at 60 months and lowers monthly EMI',
    prepay5L.optionB.newTenureMonths === 60 &&
    prepay5L.optionB.newEMIPaise < prepay5L.currentEMIPaise &&
    prepay5L.optionB.monthlyCashReleasedPaise > 0);

// ── BANK-18: NET BENEFIT CALCULATION ────────────────────────────────────────
assertInvariant('BANK-18', 'Net financial benefit deducts prepayment penalty (2% on ₹5L = ₹10k) from gross interest saved',
    prepay5L.prepaymentChargesPaise === 1000000 &&
    prepay5L.optionA.netBenefitPaise === (prepay5L.optionA.grossInterestSavedPaise - 1000000));

// ── BANK-19: PREPAYMENT RE-AMORTIZATION IN SCHEDULE ─────────────────────────
const prepaySchedule = applyPrepaymentToSchedule({
    loan: testLoan,
    schedule: initialSchedule,
    prepaymentAmountPaise: 50000000,
    prepaymentDate: '2026-06-15',
    strategy: 'REDUCE_TENURE'
});
assertInvariant('BANK-19', 'Applying prepayment to schedule reduces tenure count while keeping historical installments',
    prepaySchedule.length < 60 && prepaySchedule[0].openingPrincipalPaise === 250000000);

// ── BANK-20: COMPLETE FORECLOSURE QUOTE ─────────────────────────────────────
console.log('\n--- 4. Foreclosure, Reversals & Money Flow Invariants ---');
const foreQuote = calculateForeclosureQuote({
    outstandingPrincipalPaise: 245833333,
    accruedInterestPaise: 2081250,
    prepaymentPenaltyPct: 2.0,
    outstandingFeesPaise: 50000,
    penaltyChargesPaise: 0,
    waiverAmountPaise: 100000
});
const expectedGross = 245833333 + 2081250 + Math.round(245833333 * 0.02) + 50000;
assertInvariant('BANK-20', 'Foreclosure quote computes exact sum of principal, accrued interest, penalty, fees minus waiver',
    foreQuote.grossSettlementPaise === expectedGross &&
    foreQuote.finalSettlementAmountPaise === (expectedGross - 100000));

// ── BANK-21: FORECLOSURE JOURNAL ENTRY ──────────────────────────────────────
const foreJournal = createDoubleEntryBankingJournalForEvent({
    eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_FORECLOSED,
    bankId: testBank.id,
    bankAccountId: testAccount.id,
    loanId: testLoan.id,
    foreclosureQuote: foreQuote,
    date: '2026-08-01'
});
const debitsFore = foreJournal.lines.reduce((s, l) => s + l.debitPaise, 0);
const creditsFore = foreJournal.lines.reduce((s, l) => s + l.creditPaise, 0);
assertInvariant('BANK-21', 'Foreclosure double-entry journal is balanced across principal, interest, fees, waiver, and cash',
    debitsFore === creditsFore && debitsFore > 0);

// ── BANK-22: REVERSAL JOURNAL ENTRY ─────────────────────────────────────────
const reversalJournal = createBankingReversalJournalEntry({
    originalJournalEntry: disbJournal,
    reversalReason: 'Accidental duplicate disbursement entry'
});
assertInvariant('BANK-22', 'Reversal entry creates inverted balanced journal line without mutating history',
    reversalJournal.reversesJournalEntryId === disbJournal.id &&
    reversalJournal.lines[0].debitPaise === disbJournal.lines[0].creditPaise &&
    reversalJournal.lines[0].creditPaise === disbJournal.lines[0].debitPaise);

// ── BANK-23: MONEY FLOW DISBURSEMENT CLASSIFICATION ─────────────────────────
const mfDisb = convertBankingJournalEntryToMoneyFlowTransactions(disbJournal, { [testBank.id]: testBank }, { [testAccount.id]: testAccount }, { [testLoan.id]: testLoan });
assertInvariant('BANK-23', 'Loan disbursement maps to TRANSFER with isBurnExpense: false and isOrdinaryIncome: false',
    mfDisb[0].type === 'TRANSFER' && mfDisb[0].isBurnExpense === false && mfDisb[0].isOrdinaryIncome === false);

// ── BANK-24: MONEY FLOW PRINCIPAL REPAYMENT CLASSIFICATION ──────────────────
const emiJournal = createDoubleEntryBankingJournalForEvent({
    eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_EMI_PAID,
    bankId: testBank.id,
    bankAccountId: testAccount.id,
    loanId: testLoan.id,
    principalPaise: 4166667, // ₹41,666.67
    interestPaise: 2081250,  // ₹20,812.50
    feePaise: 50000,         // ₹500.00
    date: '2026-06-01'
});
const mfEMI = convertBankingJournalEntryToMoneyFlowTransactions(emiJournal, { [testBank.id]: testBank }, { [testAccount.id]: testAccount }, { [testLoan.id]: testLoan });
const pTx = mfEMI.find(t => t.transferType === 'BANK_LOAN_PRINCIPAL');
assertInvariant('BANK-24', 'Principal repayment maps to TRANSFER with isBurnExpense: false and isDebtService: true',
    pTx.type === 'TRANSFER' && pTx.isBurnExpense === false && pTx.isDebtService === true && pTx.amount === 41666.67);

// ── BANK-25: MONEY FLOW INTEREST & FEE CLASSIFICATION ───────────────────────
const iTx = mfEMI.find(t => t.category === 'Bank Loan Interest');
const fTx = mfEMI.find(t => t.category === 'Bank Loan Fee');
assertInvariant('BANK-25', 'Interest and Fees map to EXPENSE with isBurnExpense: true and isDebtService: true',
    iTx.type === 'EXPENSE' && iTx.isBurnExpense === true && iTx.isDebtService === true &&
    fTx.type === 'EXPENSE' && fTx.isBurnExpense === true && fTx.isDebtService === true);

// ── BANK-26: RATE REVISION INTEGRITY ────────────────────────────────────────
console.log('\n--- 5. Rate Revision & Historical Immutability Invariants ---');
const rateRev = createLoanRateRevision({
    loanId: testLoan.id,
    effectiveDate: '2026-08-01',
    annualRate: 11.50,
    reason: 'Repo rate hike +151 bps'
});
const revisedSchedule = applyRateRevisionToSchedule({
    loan: testLoan,
    schedule: fullSchedule, // Installment 1 is PAID @ 9.99%
    rateRevision: rateRev
});
assertInvariant('BANK-26', 'Historical paid installments retain original applied rate (9.99%) after revision',
    revisedSchedule[0].appliedRate === 9.99 && revisedSchedule[0].status === INSTALLMENT_STATUS.PAID);

// ── BANK-27: RATE REVISION PROJECTION ───────────────────────────────────────
const futureItem = revisedSchedule.find(s => s.dueDate >= '2026-08-01');
assertInvariant('BANK-27', 'Future installments reflect revised rate (11.50%) and re-amortize interest burden',
    futureItem.appliedRate === 11.50 && futureItem.expectedInterestPaise > initialSchedule[3].expectedInterestPaise);

// ── BANK-28: PRINCIPAL CONSERVATION IN PROJECTIONS ──────────────────────────
console.log('\n--- 6. Replay, Conservation & Validator Invariants ---');
const projection1 = rebuildBankingProjectionsFromJournal({
    banks: [testBank],
    accounts: [testAccount],
    loans: [testLoan],
    journalEntries: [disbJournal, emiJournal]
});
const loanP = projection1.loans[testLoan.id];
assertInvariant('BANK-28', 'Principal conservation invariant holds: Original === Principal Paid + Outstanding',
    loanP.originalPrincipalPaise === (loanP.principalPaidPaise + loanP.outstandingPrincipalPaise) &&
    loanP.principalPaidPaise === 4166667);

// ── BANK-29: INTEREST CONSERVATION ──────────────────────────────────────────
assertInvariant('BANK-29', 'Interest conservation invariant holds: Total interest paid in projection matches journal debits',
    loanP.interestPaidPaise === 2081250);

// ── BANK-30: EMI ALLOCATION INVARIANT ───────────────────────────────────────
assertInvariant('BANK-30', 'EMI allocation balances: Total cash paid equals Principal + Interest + Fees',
    (4166667 + 2081250 + 50000) === (pTx.amountPaise + iTx.amountPaise + fTx.amountPaise));

// ── BANK-31: NO BALANCE MUTATION (DERIVED FROM JOURNAL) ──────────────────────
const accP = projection1.accounts[testAccount.id];
const expectedAccPaise = 50000000 + 250000000 - (4166667 + 2081250 + 50000);
assertInvariant('BANK-31', 'Account balance is strictly derived from journal debits and credits with zero direct mutation',
    accP.ledgerBalancePaise === expectedAccPaise,
    `actual=${accP.ledgerBalancePaise}, expected=${expectedAccPaise}`);

// ── BANK-32: BANK RELATIONSHIP NET POSITION ─────────────────────────────────
const bankP = projection1.bankRelationships[testBank.id];
const expectedNetPaise = accP.ledgerBalancePaise - loanP.outstandingPrincipalPaise;
assertInvariant('BANK-32', 'Bank Relationship Net Position strictly equals Sum(Cash Assets) - Sum(Loan Debt)',
    bankP.totalCashPaise === accP.ledgerBalancePaise &&
    bankP.totalDebtPaise === loanP.outstandingPrincipalPaise &&
    bankP.netPositionPaise === expectedNetPaise);

// ── BANK-33: MONEY FLOW IDEMPOTENCY ─────────────────────────────────────────
const allMfTxs = mapBankingJournalToMoneyFlowTransactions([disbJournal, emiJournal]);
const txIdSet = new Set(allMfTxs.map(t => t.id));
assertInvariant('BANK-33', 'Money flow transaction generation produces unique, deterministic IDs with 0 duplicates',
    allMfTxs.length === txIdSet.size && txIdSet.has(`mf_bank_${emiJournal.id}_principal`));

// ── BANK-34: PROJECTION HASH & DETERMINISTIC REPLAY ─────────────────────────
const projection2 = rebuildBankingProjectionsFromJournal({
    banks: [testBank],
    accounts: [testAccount],
    loans: [testLoan],
    journalEntries: [disbJournal, emiJournal]
});
const hash1 = computeBankingProjectionHash(projection1);
const hash2 = computeBankingProjectionHash(projection2);
assertInvariant('BANK-34', 'Deterministic projection replay produces identical canonical hashes (hash1 === hash2)',
    hash1 === hash2 && hash1.startsWith('hash_bproj_'));

// ── BANK-35: FINANCIAL TRUTH VALIDATOR SANITY ───────────────────────────────
const truthValidation = validateBankingFinancialTruth({
    banks: [testBank],
    accounts: [testAccount],
    loans: [testLoan],
    journalEntries: [disbJournal, emiJournal],
    projection: projection1
});
assertInvariant('BANK-35', 'Financial Truth Validator certifies system health (HEALTHY, 0 errors, all checks passed)',
    truthValidation.isHealthy === true && truthValidation.status === 'HEALTHY' && truthValidation.errors.length === 0);

console.log('\n================================================================');
console.log(`=== FINLIFE BANKING INVARIANTS: ${passedTests}/${totalTests} TESTS PASSED ===`);
console.log('================================================================\n');
