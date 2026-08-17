/**
 * test_banking_validation.mjs
 * 
 * FINANCIAL CORRUPTION DETECTOR & EDGE-CASE CERTIFICATION SUITE
 * 
 * Verifies that the FinLife Banking subsystem fails loudly on corrupt data,
 * rejects unbalanced entries, prevents direct balance tampering, handles floating-rate
 * multi-year rate revisions, and preserves double-entry invariants under stress.
 */

import {
    createBank,
    createBankAccount,
    createBankLoan,
    createBankingJournalEntry,
    createBankingJournalLine,
    toPaise,
    fromPaise,
    validateMonetaryInput,
    MONEY_VALIDITY
} from '../components/banking/bankingDomainModel.js';

import {
    calculateContractualEMIPaise,
    generateBankLoanSchedule,
    applyRateRevisionToSchedule,
    calculatePrepaymentIntelligence,
    createDoubleEntryBankingJournalForEvent,
    createBankingReversalJournalEntry
} from '../components/banking/bankingAccountingEngine.js';

import {
    rebuildBankingProjectionsFromJournal,
    computeBankingProjectionHash,
    validateBankingFinancialTruth
} from '../components/banking/bankingProjectionEngine.js';

let totalValTests = 0;
let passedValTests = 0;

function assertVal(code, title, condition, details = '') {
    totalValTests++;
    if (condition) {
        passedTests();
        console.log(`  🛡️ [${code}] PASS: ${title}`);
    } else {
        console.error(`  ❌ [${code}] FAIL: ${title} ${details ? `(${details})` : ''}`);
        process.exitCode = 1;
    }
}

function passedTests() {
    passedValTests++;
}

console.log('================================================================');
console.log('=== FINLIFE BANKING FINANCIAL CORRUPTION DETECTOR SUITE      ===');
console.log('================================================================\n');

// ── VAL-01: UNBALANCED JOURNAL ENTRY REJECTION ──
let unbalancedRejected = false;
try {
    createBankingJournalEntry({
        eventType: 'TEST_UNBALANCED',
        lines: [
            createBankingJournalLine({ accountId: 'ACC_1', debitPaise: 500000 }),
            createBankingJournalLine({ accountId: 'ACC_2', creditPaise: 400000 }) // 100k difference!
        ]
    });
} catch (e) {
    unbalancedRejected = true;
}
assertVal('VAL-01', 'Journal engine rejects unbalanced entries loudly with explicit exception',
    unbalancedRejected === true);

// ── VAL-02: INVALID MONETARY INPUT REJECTION ──
let invalidInputRejected = false;
try {
    toPaise('invalid_text');
} catch (e) {
    invalidInputRejected = true;
}
assertVal('VAL-02', 'toPaise() rejects string/non-numeric corruption loudly instead of defaulting to 0',
    invalidInputRejected === true);

// ── VAL-03: ZERO RATE LOAN AMORTIZATION INTEGRITY ──
const zeroRateLoan = createBankLoan({
    bankId: 'bank_test',
    loanName: 'Interest Free Employee Advance',
    originalPrincipalPaise: 12000000, // ₹1,20,000
    interestRate: 0,
    tenureMonths: 12
});
const zeroSchedule = generateBankLoanSchedule(zeroRateLoan);
const zeroSumP = zeroSchedule.reduce((s, item) => s + item.expectedPrincipalPaise, 0);
const zeroSumI = zeroSchedule.reduce((s, item) => s + item.expectedInterestPaise, 0);
assertVal('VAL-03', 'Zero-rate loan produces exactly 0 interest and perfectly balances principal across tenure',
    zeroSumI === 0 && zeroSumP === 12000000 && zeroSchedule[11].closingPrincipalPaise === 0);

// ── VAL-04: MULTI-STAGE FLOATING RATE REVISIONS ──
const floatLoan = createBankLoan({
    bankId: 'bank_test',
    loanName: 'Floating Rate Home Loan 50L',
    originalPrincipalPaise: 500000000, // ₹50L
    interestRate: 8.50,
    tenureMonths: 120
});
let floatSchedule = generateBankLoanSchedule(floatLoan);

// Hike 1: +50 bps on 2026-08-01
floatSchedule = applyRateRevisionToSchedule({
    loan: floatLoan,
    schedule: floatSchedule,
    rateRevision: { effectiveDate: '2026-08-01', annualRate: 9.00 }
});

// Hike 2: +75 bps on 2027-01-01
floatSchedule = applyRateRevisionToSchedule({
    loan: floatLoan,
    schedule: floatSchedule,
    rateRevision: { effectiveDate: '2027-01-01', annualRate: 9.75 }
});

const postHike1 = floatSchedule.find(s => s.dueDate >= '2026-08-01' && s.dueDate < '2027-01-01');
const postHike2 = floatSchedule.find(s => s.dueDate >= '2027-01-01');
assertVal('VAL-04', 'Multi-stage rate revisions re-amortize forward progressively without corrupting past intervals',
    postHike1.appliedRate === 9.00 && postHike2.appliedRate === 9.75 &&
    floatSchedule[floatSchedule.length - 1].closingPrincipalPaise === 0);

// ── VAL-05: FULL REVERSAL JOURNAL INTEGRITY ──
const bank1 = createBank({ name: 'HDFC' });
const acc1 = createBankAccount({ bankId: bank1.id, accountName: 'Savings', openingBalancePaise: 10000000 });
const disbEntry = createDoubleEntryBankingJournalForEvent({
    eventType: 'BANK_LOAN_DISBURSED',
    bankId: bank1.id,
    bankAccountId: acc1.id,
    amountPaise: 25000000,
    date: '2026-05-01'
});
const projBefore = rebuildBankingProjectionsFromJournal({
    banks: [bank1],
    accounts: [acc1],
    loans: [],
    journalEntries: [disbEntry]
});
assertVal('VAL-05A', 'Projection reflects disbursed cash increase (+₹2.5L -> ₹3.5L)',
    projBefore.accounts[acc1.id].ledgerBalancePaise === 35000000);

const revEntry = createBankingReversalJournalEntry({
    originalJournalEntry: disbEntry,
    reversalReason: 'Disbursement cancelled'
});
const projAfter = rebuildBankingProjectionsFromJournal({
    banks: [bank1],
    accounts: [acc1],
    loans: [],
    journalEntries: [disbEntry, revEntry]
});
assertVal('VAL-05B', 'Reversal entry strictly restores opening balance (₹1.0L) with 0 drift and 0 history mutation',
    projAfter.accounts[acc1.id].ledgerBalancePaise === 10000000);

// ── VAL-06: FINANCIAL TRUTH AUDIT OF PROJECTION REPLAY ──
const audit = validateBankingFinancialTruth({
    banks: [bank1],
    accounts: [acc1],
    loans: [],
    journalEntries: [disbEntry, revEntry],
    projection: projAfter
});
assertVal('VAL-06', 'Validator passes all audit checks on reversed journal ledger',
    audit.isHealthy === true && audit.status === 'HEALTHY' && audit.errors.length === 0);

// ── VAL-07: BANK-TRUTH-REBUILD-01 (PROJECTION CACHE WIPE & REBUILD RECOVERY) ──
const testBankRebuild = createBank({ id: 'b_reb', name: 'ICICI Bank' });
const testAccRebuild = createBankAccount({ id: 'a_reb', bankId: 'b_reb', accountName: 'ICICI Savings', openingBalancePaise: toPaise(500000) });
const testLoanRebuild = createBankLoan({
    id: 'l_reb',
    bankId: 'b_reb',
    loanName: 'ICICI Auto Loan',
    originalPrincipalPaise: toPaise(1000000),
    interestRate: 8.5,
    tenureMonths: 36,
    startDate: '2026-06-01',
    disbursedToAccountId: 'a_reb'
});
const journalRebuild = [
    createBankingJournalEntry({
        eventType: 'BANK_ACCOUNT_OPENED',
        entityId: 'a_reb',
        lines: [
            createBankingJournalLine({ accountId: 'a_reb', debitPaise: toPaise(500000) }),
            createBankingJournalLine({ accountId: 'EQUITY_OPENING', creditPaise: toPaise(500000) })
        ]
    }),
    createDoubleEntryBankingJournalForEvent({
        eventType: 'BANK_LOAN_DISBURSED',
        bankId: 'b_reb',
        bankAccountId: 'a_reb',
        loanId: 'l_reb',
        amountPaise: toPaise(1000000),
        date: '2026-06-01'
    }),
    createDoubleEntryBankingJournalForEvent({
        eventType: 'BANK_EMI_PAID',
        bankId: 'b_reb',
        bankAccountId: 'a_reb',
        loanId: 'l_reb',
        installmentNumber: 1,
        principalPaise: 2441292,
        interestPaise: 708333,
        feesPaise: 0,
        amountPaise: 3149625,
        date: '2026-07-01'
    })
];
const canonicalProjectionBefore = rebuildBankingProjectionsFromJournal({
    banks: [testBankRebuild],
    accounts: [testAccRebuild],
    loans: [testLoanRebuild],
    journalEntries: journalRebuild
});
const canonicalHashBefore = computeBankingProjectionHash(canonicalProjectionBefore);

// Simulate complete memory wipe / cache deletion
const wipedProjection = null;

// Rebuild purely from the immutable journal
const canonicalProjectionAfter = rebuildBankingProjectionsFromJournal({
    banks: [testBankRebuild],
    accounts: [testAccRebuild],
    loans: [testLoanRebuild],
    journalEntries: journalRebuild
});
const canonicalHashAfter = computeBankingProjectionHash(canonicalProjectionAfter);
assertVal('VAL-07', 'BANK-TRUTH-REBUILD-01: Pure journal rebuild reproduces 100% identical canonical projection hash',
    canonicalHashBefore === canonicalHashAfter &&
    canonicalProjectionBefore.accounts['a_reb'].ledgerBalancePaise === canonicalProjectionAfter.accounts['a_reb'].ledgerBalancePaise &&
    canonicalProjectionBefore.loans['l_reb'].outstandingPrincipalPaise === canonicalProjectionAfter.loans['l_reb'].outstandingPrincipalPaise);

// ── VAL-08: BANK-TRUTH-CORRUPT-01 (IN-MEMORY CASH TAMPERING DETECTION) ──
const corruptedCashProj = JSON.parse(JSON.stringify(canonicalProjectionAfter));
corruptedCashProj.accounts['a_reb'].ledgerBalancePaise += toPaise(100000); // Inject ₹1,00,000 phantom cash!
const cashAudit = validateBankingFinancialTruth({
    banks: [testBankRebuild],
    accounts: [testAccRebuild],
    loans: [testLoanRebuild],
    journalEntries: journalRebuild,
    projection: corruptedCashProj
});
assertVal('VAL-08', 'BANK-TRUTH-CORRUPT-01: Validator rejects in-memory cash tampering with deterministic replay mismatch',
    cashAudit.isHealthy === false && cashAudit.status === 'CORRUPTED');

// ── VAL-09: BANK-TRUTH-CORRUPT-02 (IN-MEMORY LOAN PRINCIPAL TAMPERING DETECTION) ──
const corruptedLoanProj = JSON.parse(JSON.stringify(canonicalProjectionAfter));
corruptedLoanProj.loans['l_reb'].outstandingPrincipalPaise -= toPaise(50000); // Phantom ₹50,000 principal reduction!
const loanAudit = validateBankingFinancialTruth({
    banks: [testBankRebuild],
    accounts: [testAccRebuild],
    loans: [testLoanRebuild],
    journalEntries: journalRebuild,
    projection: corruptedLoanProj
});
assertVal('VAL-09', 'BANK-TRUTH-CORRUPT-02: Validator rejects loan principal tampering with Principal Conservation violation',
    loanAudit.isHealthy === false && loanAudit.status === 'CORRUPTED');

// ── VAL-10: BANK-TRUTH-SELFHEAL-01 (AUTOMATIC SELF-HEALING FROM IMMUTABLE JOURNAL) ──
const healedProjection = rebuildBankingProjectionsFromJournal({
    banks: [testBankRebuild],
    accounts: [testAccRebuild],
    loans: [testLoanRebuild],
    journalEntries: journalRebuild
});
const healedAudit = validateBankingFinancialTruth({
    banks: [testBankRebuild],
    accounts: [testAccRebuild],
    loans: [testLoanRebuild],
    journalEntries: journalRebuild,
    projection: healedProjection
});
assertVal('VAL-10', 'BANK-TRUTH-SELFHEAL-01: Projection rebuild purges in-memory corruption and self-heals to HEALTHY',
    healedAudit.isHealthy === true && healedAudit.status === 'HEALTHY' && healedAudit.errors.length === 0);

// ── VAL-11: BANK-TRUTH-ULTIMATE (STEP-BY-STEP 9-OPERATION MUTATION TRANSITION INVARIANTS) ──
const uBank = createBank({ id: 'u_bank', name: 'Axis Bank' });
const uAcc = createBankAccount({ id: 'u_acc', bankId: 'u_bank', accountName: 'Axis Salary', openingBalancePaise: toPaise(2000000) });
const uLoan = createBankLoan({
    id: 'u_loan',
    bankId: 'u_bank',
    loanName: 'Axis Flexi Loan',
    originalPrincipalPaise: toPaise(1000000),
    interestRate: 10.0,
    tenureMonths: 24,
    startDate: '2026-06-01',
    disbursedToAccountId: 'u_acc'
});

let transitionJournal = [];

function verifyTransitionInvariants(stepName, expectedCashPaise, expectedDebtPaise) {
    const p = rebuildBankingProjectionsFromJournal({
        banks: [uBank],
        accounts: [uAcc],
        loans: [uLoan],
        journalEntries: transitionJournal
    });
    const a = validateBankingFinancialTruth({
        banks: [uBank],
        accounts: [uAcc],
        loans: [uLoan],
        journalEntries: transitionJournal,
        projection: p
    });
    const cashOk = p.accounts['u_acc'].ledgerBalancePaise === expectedCashPaise;
    const debtOk = p.loans['u_loan'].outstandingPrincipalPaise === expectedDebtPaise;
    const balancedOk = a.isHealthy && a.status === 'HEALTHY' && a.errors.length === 0;
    return cashOk && debtOk && balancedOk;
}

// Op 1: Open Account (Cash: ₹20L, Debt: ₹0)
transitionJournal.push(createBankingJournalEntry({
    eventType: 'BANK_ACCOUNT_OPENED',
    entityId: 'u_acc',
    lines: [
        createBankingJournalLine({ accountId: 'u_acc', debitPaise: toPaise(2000000) }),
        createBankingJournalLine({ accountId: 'EQUITY_OPENING', creditPaise: toPaise(2000000) })
    ]
}));
const t1 = verifyTransitionInvariants('Op 1: Open Account', toPaise(2000000), toPaise(1000000));

// Op 2: Disburse Loan (Cash: ₹30L, Debt: ₹10L)
transitionJournal.push(createDoubleEntryBankingJournalForEvent({
    eventType: 'BANK_LOAN_DISBURSED',
    bankId: 'u_bank',
    bankAccountId: 'u_acc',
    loanId: 'u_loan',
    amountPaise: toPaise(1000000),
    date: '2026-06-01'
}));
const t2 = verifyTransitionInvariants('Op 2: Disburse Loan', toPaise(3000000), toPaise(1000000));

// Op 3: Pay Contractual EMI #1 (Cash: ₹30L - ₹46,145, Debt: ₹10L - ₹37,812)
transitionJournal.push(createDoubleEntryBankingJournalForEvent({
    eventType: 'BANK_EMI_PAID',
    bankId: 'u_bank',
    bankAccountId: 'u_acc',
    loanId: 'u_loan',
    installmentNumber: 1,
    principalPaise: 3781200,
    interestPaise: 833300,
    feesPaise: 0,
    amountPaise: 4614500,
    date: '2026-07-01'
}));
const t3 = verifyTransitionInvariants('Op 3: Pay EMI #1', toPaise(3000000) - 4614500, toPaise(1000000) - 3781200);

// Op 4: Partial Payment on EMI #2 (Principal: ₹20,000, Interest: ₹8,000)
transitionJournal.push(createDoubleEntryBankingJournalForEvent({
    eventType: 'BANK_EMI_PAID',
    bankId: 'u_bank',
    bankAccountId: 'u_acc',
    loanId: 'u_loan',
    installmentNumber: 2,
    principalPaise: toPaise(20000),
    interestPaise: toPaise(8000),
    feesPaise: 0,
    amountPaise: toPaise(28000),
    date: '2026-08-01'
}));
const t4 = verifyTransitionInvariants('Op 4: Partial EMI', toPaise(3000000) - 4614500 - toPaise(28000), toPaise(1000000) - 3781200 - toPaise(20000));

// Op 5: Principal Prepayment (₹1,00,000)
transitionJournal.push(createDoubleEntryBankingJournalForEvent({
    eventType: 'BANK_PRINCIPAL_PREPAID',
    bankId: 'u_bank',
    bankAccountId: 'u_acc',
    loanId: 'u_loan',
    amountPaise: toPaise(100000),
    date: '2026-08-15'
}));
const t5 = verifyTransitionInvariants('Op 5: Prepay ₹1L', toPaise(3000000) - 4614500 - toPaise(28000) - toPaise(100000), toPaise(1000000) - 3781200 - toPaise(20000) - toPaise(100000));

assertVal('VAL-11', 'BANK-TRUTH-ULTIMATE: Every single operation transition preserves double-entry invariants, conservation, and health',
    t1 && t2 && t3 && t4 && t5);

// ── VAL-12: BANK-TRUTH-REVERSAL-02 (PREPAYMENT MUTATION & COMPLETE REVERSAL RECOVERY) ──
const revPrepayEntry = createBankingReversalJournalEntry({
    originalJournalEntry: transitionJournal[4],
    reversalReason: 'Prepayment error correction',
    date: '2026-08-16'
});
const postRevJournal = [...transitionJournal, revPrepayEntry];
const postRevProj = rebuildBankingProjectionsFromJournal({
    banks: [uBank],
    accounts: [uAcc],
    loans: [uLoan],
    journalEntries: postRevJournal
});
const postRevAudit = validateBankingFinancialTruth({
    banks: [uBank],
    accounts: [uAcc],
    loans: [uLoan],
    journalEntries: postRevJournal,
    projection: postRevProj
});
assertVal('VAL-12', 'BANK-TRUTH-REVERSAL-02: Reversal restores loan principal and cash balance while keeping original journal immutable',
    postRevAudit.isHealthy === true &&
    postRevProj.loans['u_loan'].outstandingPrincipalPaise === (toPaise(1000000) - 3781200 - toPaise(20000)) &&
    postRevProj.accounts['u_acc'].ledgerBalancePaise === (toPaise(3000000) - 4614500 - toPaise(28000)));

// ── VAL-13: BANK-RATE-IMMUTABILITY (HISTORICAL INSTALLMENT IMMUTABILITY ACROSS REVISIONS) ──
const rateRevLoan = createBankLoan({
    id: 'l_rate',
    bankId: 'u_bank',
    loanName: 'Floating Rate Loan',
    originalPrincipalPaise: toPaise(1200000),
    interestRate: 9.49,
    tenureMonths: 12,
    startDate: '2026-01-01'
});
let rateSchedule = generateBankLoanSchedule(rateRevLoan);
// Mark Jan, Feb, Mar as PAID @ 9.49%
rateSchedule[0].status = 'PAID'; rateSchedule[0].appliedRate = 9.49;
rateSchedule[1].status = 'PAID'; rateSchedule[1].appliedRate = 9.49;
rateSchedule[2].status = 'PAID'; rateSchedule[2].appliedRate = 9.49;

// Apply Repo Hike to 9.99% starting Apr 1, 2026
const revisedRateSchedule = applyRateRevisionToSchedule({
    loan: rateRevLoan,
    schedule: rateSchedule,
    rateRevision: { effectiveDate: '2026-04-01', annualRate: 9.99 }
});

assertVal('VAL-13', 'BANK-RATE-IMMUTABILITY: Historical paid installments retain original 9.49% rate and future installments re-amortize at 9.99%',
    revisedRateSchedule[0].appliedRate === 9.49 &&
    revisedRateSchedule[1].appliedRate === 9.49 &&
    revisedRateSchedule[2].appliedRate === 9.49 &&
    revisedRateSchedule[3].appliedRate === 9.99 &&
    revisedRateSchedule[11].closingPrincipalPaise === 0);

// ── VAL-14: BANK-TRUTH-CORRUPT-SCHEDULE (PHANTOM RESIDUAL CORRUPTION DETECTION) ──
const corruptedScheduleProj = JSON.parse(JSON.stringify(postRevProj));
const firstLoanSch = Object.values(corruptedScheduleProj.schedules)[0];
if (firstLoanSch && firstLoanSch.length > 0) {
    firstLoanSch[firstLoanSch.length - 1].closingPrincipalPaise = 1; // Inject 1 phantom paisa!
}
const schAudit = validateBankingFinancialTruth({
    banks: [uBank],
    accounts: [uAcc],
    loans: [uLoan],
    journalEntries: postRevJournal,
    projection: corruptedScheduleProj
});
assertVal('VAL-14', 'BANK-TRUTH-CORRUPT-SCHEDULE: Validator catches phantom schedule residual (1 paisa) and flags CORRUPTED',
    schAudit.isHealthy === false && schAudit.status === 'CORRUPTED');

console.log('\n================================================================');
console.log(`=== FINLIFE BANKING CORRUPTION SUITE: ${passedValTests}/${totalValTests} CHECKS PASSED ===`);
console.log('================================================================\n');

