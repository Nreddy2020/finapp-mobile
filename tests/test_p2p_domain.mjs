/**
 * test_p2p_domain.mjs
 * 
 * P2P SUITE 1: DOMAIN ENTITY VALIDATION & SCHEMA INVARIANCE
 * 
 * Verifies:
 * 1. Person entity creation, validation, phone formatting, contact linkage
 * 2. P2PLoan factory with all required fields, valid defaults, and enum constraints
 * 3. LoanAdvance & LoanRepayment factories with strict types
 * 4. RepaymentScheduleItem state machine (PENDING, PAID, PARTIALLY_PAID, WAIVED, OVERDUE)
 * 5. Double-Entry JournalEntry structure with balanced debits & credits, idempotency keys
 * 6. Isolated demo fixture integrity (P2P_DEMO_DATA_ENABLED compliance)
 */

import {
    createPerson,
    createP2PLoan,
    createLoanAdvance,
    createLoanRepayment,
    createRepaymentScheduleItem,
    createJournalEntry,
    LOAN_TYPES,
    INTEREST_METHODS,
    REPAYMENT_FREQUENCIES,
    LOAN_STATUSES,
    SCHEDULE_STATUSES,
    REPAYMENT_ALLOCATIONS,
    JOURNAL_EVENT_TYPES,
    DEMO_KASAPA_PERSON,
    DEMO_KASAPA_SUB_LOANS
} from '../components/p2p/p2pDomainModel.js';

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

console.log('=== P2P SUITE 1: DOMAIN ENTITY VALIDATION & SCHEMA INVARIANCE ===\n');

// ── 1. PERSON ENTITY VALIDATION ─────────────────────────────────────────────
console.log('--- 1. Person Entity Validation ---');
const person1 = createPerson({
    id: 'person_001',
    name: 'Kasapa Reddy Bava',
    phone: '+91 98765 43210',
    relationship: 'Brother-in-Law',
    notes: 'Family trusted counterparty'
});

assert(person1.id === 'person_001', 'Person has valid id');
assert(person1.name === 'Kasapa Reddy Bava', 'Person has valid name');
assert(person1.phone === '+91 98765 43210', 'Person has valid phone');
assert(person1.relationship === 'Brother-in-Law', 'Person relationship stored');
assert(Array.isArray(person1.loanIds), 'Person has loanIds array');
assert(typeof person1.createdAt === 'string', 'Person has ISO createdAt timestamp');

// ── 2. P2P LOAN CREATION & CONSTRAINTS ──────────────────────────────────────
console.log('\n--- 2. P2P Loan Factory & Constraints ---');
const loan1 = createP2PLoan({
    id: 'p2p_loan_101',
    personId: 'person_001',
    personName: 'Kasapa Reddy Bava',
    type: LOAN_TYPES.GIVEN,
    principal: 250000,
    interestRate: 9.99,
    interestMethod: INTEREST_METHODS.SIMPLE,
    tenureMonths: 12,
    repaymentFrequency: REPAYMENT_FREQUENCIES.MONTHLY,
    repaymentAllocation: REPAYMENT_ALLOCATIONS.INTEREST_FIRST,
    startDate: '2026-08-01',
    cashAccountId: 'acc_hdfc_salary',
    cashAccountName: 'HDFC Salary Account'
});

assert(loan1.id === 'p2p_loan_101', 'Loan ID correctly initialized');
assert(loan1.type === 'GIVEN', 'Loan type is GIVEN');
assert(loan1.principal === 250000, 'Principal matches input');
assert(loan1.interestRate === 9.99, 'Interest rate is 9.99%');
assert(loan1.interestMethod === 'SIMPLE', 'Interest method is SIMPLE');
assert(loan1.repaymentAllocation === 'INTEREST_FIRST', 'Repayment allocation is INTEREST_FIRST');
assert(loan1.status === LOAN_STATUSES.ACTIVE, 'Loan default status is ACTIVE');
assert(loan1.cashAccountId === 'acc_hdfc_salary', 'Linked cash account ID stored');

// ── 3. LOAN ADVANCE & REPAYMENT ENTITIES ────────────────────────────────────
console.log('\n--- 3. Loan Advance & Repayment Entities ---');
const advance1 = createLoanAdvance({
    loanId: 'p2p_loan_101',
    amount: 250000,
    disbursementDate: '2026-08-01',
    cashAccountId: 'acc_hdfc_salary',
    notes: 'Initial principal disbursement'
});

assert(advance1.loanId === 'p2p_loan_101', 'Advance links to parent loan');
assert(advance1.amount === 250000, 'Advance amount matches');
assert(advance1.id.startsWith('adv_'), 'Advance generates unique ID');

const repayment1 = createLoanRepayment({
    loanId: 'p2p_loan_101',
    amount: 53519,
    principalPaid: 33810,
    interestPaid: 19709,
    paymentDate: '2026-09-06',
    cashAccountId: 'acc_hdfc_salary',
    sourceScheduleItemId: 'sch_p2p_loan_101_1'
});

assert(repayment1.amount === 53519, 'Repayment total amount matches');
assert(repayment1.principalPaid === 33810, 'Repayment principal component recorded');
assert(repayment1.interestPaid === 19709, 'Repayment interest component recorded');
assert(repayment1.principalPaid + repayment1.interestPaid === repayment1.amount, 'Principal + Interest equals total repayment');

// ── 4. REPAYMENT SCHEDULE ITEM STATES ───────────────────────────────────────
console.log('\n--- 4. Repayment Schedule Item State Machine ---');
const schItem = createRepaymentScheduleItem({
    loanId: 'p2p_loan_101',
    installmentNumber: 1,
    dueDate: '2026-09-06',
    expectedTotal: 53519,
    expectedPrincipal: 33810,
    expectedInterest: 19709,
    status: SCHEDULE_STATUSES.PARTIALLY_PAID,
    paidTotal: 30000,
    paidPrincipal: 10291,
    paidInterest: 19709,
    remainingTotal: 23519
});

assert(schItem.status === 'PARTIALLY_PAID', 'Schedule item supports PARTIALLY_PAID status');
assert(schItem.paidTotal === 30000, 'Schedule item tracks paidTotal accurately');
assert(schItem.remainingTotal === 23519, 'Schedule item tracks remaining balance');
assert(schItem.paidTotal + schItem.remainingTotal === schItem.expectedTotal, 'Paid + Remaining equals expected amount');

// ── 5. JOURNAL ENTRY STRUCTURE & IDEMPOTENCY ────────────────────────────────
console.log('\n--- 5. Double-Entry Journal Structure & Invariants ---');
const journalEntry = createJournalEntry({
    journalEntryId: 'jrn_p2p_001',
    sourceEntityId: 'p2p_loan_101',
    sourceEventId: 'rep_001',
    eventType: JOURNAL_EVENT_TYPES.REPAYMENT_RECEIVED,
    timestamp: '2026-09-06T10:00:00.000Z',
    debits: [{ account: 'ASSET_CASH_HDFC', amount: 53519 }],
    credits: [
        { account: 'ASSET_P2P_RECEIVABLE', amount: 33810 },
        { account: 'INCOME_P2P_INTEREST', amount: 19709 }
    ],
    idempotencyKey: 'idemp_p2p_repay_001'
});

assert(journalEntry.journalEntryId === 'jrn_p2p_001', 'Journal entry has explicit journalEntryId');
assert(journalEntry.sourceEntityId === 'p2p_loan_101', 'Journal entry links to source loan');
assert(journalEntry.sourceEventId === 'rep_001', 'Journal entry links to source event');
assert(journalEntry.idempotencyKey === 'idemp_p2p_repay_001', 'Journal entry contains idempotencyKey');

const totalDebits = journalEntry.debits.reduce((s, d) => s + d.amount, 0);
const totalCredits = journalEntry.credits.reduce((s, c) => s + c.amount, 0);
assert(totalDebits === totalCredits, `Accounting equation holds: Debits (${totalDebits}) === Credits (${totalCredits})`);

// ── 6. ISOLATED DEMO FIXTURE INTEGRITY ──────────────────────────────────────
console.log('\n--- 6. Isolated Demo Fixtures ---');
assert(DEMO_KASAPA_PERSON.name === 'Kasapa Reddy Bava', 'Demo person fixture available');
assert(DEMO_KASAPA_SUB_LOANS.length === 4, 'Kasapa has exactly 4 structured sub-loans in fixture');
const totalKasapaPrincipal = DEMO_KASAPA_SUB_LOANS.reduce((s, l) => s + l.principal, 0);
assert(totalKasapaPrincipal === 1067000, `Demo Kasapa total principal is ₹10,67,000 (actual: ₹${totalKasapaPrincipal})`);

console.log(`\n=== P2P DOMAIN SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
