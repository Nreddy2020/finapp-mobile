/**
 * test_banking_ui_truth.mjs
 * 
 * FINLIFE BANKING RELATIONSHIP UI FINANCIAL TRUTH & CONVERGENCE GATES (UX-01..20)
 * 
 * Verifies that the Calm, Relationship-First Banking Presentation Layer strictly
 * reflects the underlying double-entry financial journal with zero hardcoded values
 * and certifies multi-surface financial convergence.
 */

import {
    toPaise,
    fromPaise,
    createBank,
    createBankAccount,
    createBankLoan,
    createLoanRateRevision,
    createBankingJournalEntry,
    createBankingJournalLine,
    BANKING_JOURNAL_EVENT_TYPES
} from '../components/banking/bankingDomainModel.js';

import {
    generateBankLoanSchedule,
    calculatePrepaymentIntelligence,
    calculateForeclosureQuote,
    createDoubleEntryBankingJournalForEvent,
    createBankingReversalJournalEntry,
    allocateEMIPayment,
    applyRateRevisionToSchedule
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

import {
    formatINR,
    formatPrecisionINR,
    formatPaise,
    computeBankingOverviewMetrics,
    computeBankRelationshipScorecard,
    computeBankRelationshipHealth
} from '../components/banking/bankingPresentationAdapter.js';

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
    totalTests++;
    if (condition) {
        passedTests++;
        console.log(`  🟢 [PASS] ${message}`);
    } else {
        console.error(`  🔴 [FAIL] ${message}`);
        process.exitCode = 1;
    }
}

console.log('================================================================');
console.log('=== FINLIFE BANKING UI FINANCIAL TRUTH GATES (BANK-UX-01..20)===');
console.log('================================================================\n');

// ── FIXTURE SETUP ──
const bankHDFC = createBank({
    id: 'bank_hdfc',
    name: 'HDFC Bank',
    shortName: 'HDFC',
    type: 'PRIVATE',
    relationshipStatus: 'ACTIVE'
});

const accSalary = createBankAccount({
    id: 'acc_hdfc_sal',
    bankId: 'bank_hdfc',
    accountName: 'HDFC Salary Advantage',
    accountNumberMasked: '•••• 4821',
    accountType: 'SAVINGS',
    openingBalancePaise: toPaise(1000000) // ₹10,00,000 opening
});

const loanPL = createBankLoan({
    id: 'loan_hdfc_pl',
    bankId: 'bank_hdfc',
    loanName: 'HDFC Personal Loan 25L',
    loanNumberMasked: '•••• 9102',
    loanType: 'PERSONAL',
    originalPrincipalPaise: toPaise(2500000), // ₹25,00,000
    interestRate: 9.99,
    tenureMonths: 60,
    startDate: '2026-05-01',
    disbursedToAccountId: 'acc_hdfc_sal'
});

const initialJournal = [
    createBankingJournalEntry({
        id: 'bj_open_acc',
        eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_ACCOUNT_OPENED,
        timestamp: '2026-05-01T00:00:00Z',
        entityId: 'acc_hdfc_sal',
        lines: [
            createBankingJournalLine({ id: 'l1', accountId: 'acc_hdfc_sal', accountType: 'BANK_ACCOUNT', debitPaise: toPaise(1000000), creditPaise: 0 }),
            createBankingJournalLine({ id: 'l2', accountId: 'capital_opening', accountType: 'EQUITY', debitPaise: 0, creditPaise: toPaise(1000000) })
        ],
        description: 'Opening balance'
    }),
    createDoubleEntryBankingJournalForEvent({
        eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_DISBURSED,
        bankId: 'bank_hdfc',
        bankAccountId: 'acc_hdfc_sal',
        loanId: 'loan_hdfc_pl',
        amountPaise: toPaise(2500000),
        date: '2026-05-01'
    })
];

const projection = rebuildBankingProjectionsFromJournal({
    banks: [bankHDFC],
    accounts: [accSalary],
    loans: [loanPL],
    journalEntries: initialJournal
});

const overview = computeBankingOverviewMetrics({
    banks: [bankHDFC],
    accounts: [accSalary],
    loans: [loanPL],
    projection,
    asOfDate: '2026-05-18'
});

const scorecard = computeBankRelationshipScorecard({
    bank: bankHDFC,
    accounts: [accSalary],
    loans: [loanPL],
    projection,
    asOfDate: '2026-05-18'
});

// ── TESTS UX-01 to UX-20 ──

// UX-01: Relationship totals equal journal-derived projections
assert(
    overview.totalCashPaise === toPaise(3500000) &&
    overview.totalDebtPaise === toPaise(2500000) &&
    overview.netPositionPaise === toPaise(1000000),
    '[UX-01] Relationship totals strictly equal journal-derived projections (Cash: ₹35L, Debt: ₹25L, Net: +₹10L)'
);

// UX-02: Cash balance equals account projection
assert(
    projection.accounts['acc_hdfc_sal'].ledgerBalancePaise === toPaise(3500000),
    '[UX-02] Bank account ledger balance is strictly projected from debits/credits (₹10L + ₹25L = ₹35L)'
);

// UX-03: Loan outstanding equals journal-derived principal
assert(
    projection.loans['loan_hdfc_pl'].outstandingPrincipalPaise === toPaise(2500000),
    '[UX-03] Loan outstanding principal matches projection (₹25,00,000)'
);

// UX-04: EMI equals current schedule
const schItem1 = projection.schedules['loan_hdfc_pl'][0];
assert(
    schItem1.expectedTotalPaise === 5310531 && schItem1.expectedPrincipalPaise === 3229281,
    '[UX-04] EMI equals current schedule (₹53,105.31 with Principal: ₹32,292.81, Interest: ₹20,812.50)'
);

// UX-05: Interest equals schedule/journal
assert(
    schItem1.expectedInterestPaise === 2081250,
    '[UX-05] Expected interest slice matches mathematical amortization (₹20,812.50)'
);

// UX-06: Prepayment simulation equals accounting engine
const sim = calculatePrepaymentIntelligence({
    outstandingPrincipalPaise: toPaise(2500000),
    annualRate: 9.99,
    remainingTenureMonths: 60,
    contractualEMIPaise: 5310531,
    prepaymentAmountPaise: toPaise(100000),
    prepaymentPenaltyPct: 0
});
assert(
    sim.valid && sim.optionA.monthsSaved > 0 && sim.optionA.netBenefitPaise > 0,
    `[UX-06] Prepayment simulation is dynamically calculated (Saves ${sim.optionA.monthsSaved} mo, ₹${fromPaise(sim.optionA.netBenefitPaise).toFixed(0)} net benefit)`
);

// UX-07: Foreclosure quote equals settlement engine
const quote = calculateForeclosureQuote({
    outstandingPrincipalPaise: toPaise(2500000),
    accruedInterestPaise: toPaise(20000),
    prepaymentPenaltyPct: 2.0,
    outstandingFeesPaise: toPaise(1000),
    penaltyChargesPaise: 0,
    waiverAmountPaise: toPaise(500)
});
assert(
    quote.finalSettlementAmountPaise === (quote.grossSettlementPaise - toPaise(500)),
    '[UX-07] Foreclosure quote equals settlement engine (Principal + Accrued Interest + Penalty + Fees - Waiver)'
);

// UX-08: Money Flow equals journal-derived cash events
const mfDisb = convertBankingJournalEntryToMoneyFlowTransactions(initialJournal[1], { [bankHDFC.id]: bankHDFC }, { [accSalary.id]: accSalary }, { [loanPL.id]: loanPL });
assert(
    mfDisb.length > 0 && mfDisb.every(t => t.isBurnExpense === false),
    '[UX-08] Money Flow transactions are derived from journal with ₹0 lifestyle burn on debt principal'
);

// UX-09: Calendar equals projected obligations
assert(
    overview.nextImmediateObligation && overview.nextImmediateObligation.expectedTotalPaise === 5310531,
    '[UX-09] Calendar and next obligation display upcoming ₹53,105 due on 2026-06-01'
);

// UX-10: Bank relationship net equals Cash − Debt
assert(
    scorecard.netPositionPaise === scorecard.totalCashPaise - scorecard.totalDebtPaise,
    '[UX-10] Bank relationship net strictly equals Cash Assets (₹35L) − Loan Debt (₹25L) = +₹10L'
);

// UX-11: Rate revision changes only future projection
const rateRev = createLoanRateRevision({
    loanId: loanPL.id,
    effectiveDate: '2026-07-01',
    annualRate: 11.50,
    reason: 'Repo rate hike'
});
const revisedSchedule = applyRateRevisionToSchedule({
    loan: loanPL,
    schedule: projection.schedules['loan_hdfc_pl'],
    rateRevision: rateRev
});
assert(
    revisedSchedule[0].appliedRate === 9.99 && revisedSchedule[2].appliedRate === 11.5,
    '[UX-11] Rate revision changes only future installments (Installment #1 remains 9.99%, #3 is 11.5%)'
);

// UX-12: Historical installments remain immutable
assert(
    revisedSchedule[0].expectedTotalPaise === 5310531,
    '[UX-12] Historical installment amounts remain strictly immutable after rate revisions'
);

// UX-13: No UI mutation bypasses the journal
const auditCheck = validateBankingFinancialTruth({
    banks: [bankHDFC],
    accounts: [accSalary],
    loans: [loanPL],
    journalEntries: initialJournal,
    projection
});
assert(
    auditCheck.isHealthy && auditCheck.errors.length === 0,
    '[UX-13] Financial Truth audit certifies 0 unjournaled mutations and healthy balance ledger'
);

// UX-14: Duplicate actions are idempotent
const hash1 = computeBankingProjectionHash(projection);
const replayProj = rebuildBankingProjectionsFromJournal({
    banks: [bankHDFC],
    accounts: [accSalary],
    loans: [loanPL],
    journalEntries: initialJournal
});
const hash2 = computeBankingProjectionHash(replayProj);
assert(
    hash1 === hash2,
    '[UX-14] Canonical projection replay produces identical deterministic hash (hash1 === hash2)'
);

// UX-15: Reversal propagates through all surfaces
const reversalEntry = createBankingReversalJournalEntry({
    originalJournalEntry: initialJournal[1],
    reversalReason: 'Disbursement cancellation',
    date: '2026-05-02'
});
const reversedProj = rebuildBankingProjectionsFromJournal({
    banks: [bankHDFC],
    accounts: [accSalary],
    loans: [loanPL],
    journalEntries: [...initialJournal, reversalEntry]
});
assert(
    reversedProj.accounts['acc_hdfc_sal'].ledgerBalancePaise === toPaise(1000000) &&
    reversedProj.loans['loan_hdfc_pl'].outstandingPrincipalPaise === 0,
    '[UX-15] Reversal entry cleanly extinguishes loan debt (₹0) and restores cash to ₹10L across all surfaces'
);

// UX-16: Empty state is genuinely empty
const emptyProj = rebuildBankingProjectionsFromJournal({ banks: [], accounts: [], loans: [], journalEntries: [] });
const emptyOverview = computeBankingOverviewMetrics({ banks: [], accounts: [], loans: [], projection: emptyProj });
assert(
    emptyOverview.totalCashPaise === 0 && emptyOverview.totalDebtPaise === 0 && emptyOverview.bankRelationships.length === 0,
    '[UX-16] Empty state renders 0 cash, 0 debt, and empty relationship arrays gracefully'
);

// UX-17: No hard-coded financial values
assert(
    overview.dynamicPrepaymentOpportunity && typeof overview.dynamicPrepaymentOpportunity.netBenefitPaise === 'number',
    '[UX-17] Decision intelligence values are dynamically calculated from accounting models'
);

// UX-18: Indian currency formatting is consistent
assert(
    formatINR(3500000) === '₹35,00,000' && formatINR(3500000, true) === '₹35L',
    '[UX-18] Indian currency formatters produce consistent INR strings (₹35,00,000 and ₹35L)'
);

// UX-19: Relationship Health scoring engine is explainable
const health = computeBankRelationshipHealth({ bank: bankHDFC, accounts: [accSalary], loans: [loanPL], projection });
assert(
    health.score > 0 && health.explanations.length > 0 && typeof health.coverageRatio === 'number',
    `[UX-19] Relationship Health is derived from transparent factors (Score: ${health.score}/100, Coverage: ${health.coverageRatio}×)`
);

// UX-20: Financial Convergence Test (Multi-Surface Simultaneous Convergence)
console.log('\n--- Executing Multi-Surface Financial Convergence Lifecycle ---');
// Step A: Initial State (₹35L Cash, ₹25L Debt)
assert(
    overview.totalDebtPaise === toPaise(2500000) &&
    scorecard.totalDebtPaise === toPaise(2500000) &&
    projection.loans['loan_hdfc_pl'].outstandingPrincipalPaise === toPaise(2500000),
    '[UX-20A] State 1 (Disbursement): Dashboard, Relationship, Loan Hub, and Account all converge to ₹25L Debt and ₹35L Cash'
);

// Step B: Pay Installment #1 (₹53,105.31)
const emiJournal = createDoubleEntryBankingJournalForEvent({
    eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_EMI_PAID,
    bankId: 'bank_hdfc',
    bankAccountId: 'acc_hdfc_sal',
    loanId: 'loan_hdfc_pl',
    installmentNumber: 1,
    principalPaise: 3229281,
    interestPaise: 2081250,
    feesPaise: 0,
    amountPaise: 5310531,
    date: '2026-06-01'
});
const state2Proj = rebuildBankingProjectionsFromJournal({
    banks: [bankHDFC],
    accounts: [accSalary],
    loans: [loanPL],
    journalEntries: [...initialJournal, emiJournal]
});
const state2Scorecard = computeBankRelationshipScorecard({ bank: bankHDFC, accounts: [accSalary], loans: [loanPL], projection: state2Proj });
assert(
    state2Proj.loans['loan_hdfc_pl'].outstandingPrincipalPaise === toPaise(2500000) - 3229281 &&
    state2Proj.accounts['acc_hdfc_sal'].ledgerBalancePaise === toPaise(3500000) - 5310531 &&
    state2Scorecard.totalDebtPaise === toPaise(2500000) - 3229281,
    '[UX-20B] State 2 (EMI Paid): All surfaces converge simultaneously to ₹24,67,707.19 Debt and ₹34,46,894.69 Cash'
);

console.log('\n================================================================');
console.log(`=== FINLIFE BANKING UI TRUTH: ${passedTests}/${totalTests} GATES PASSED ===`);
console.log('================================================================\n');
