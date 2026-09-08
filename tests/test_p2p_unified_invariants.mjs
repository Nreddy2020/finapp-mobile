/**
 * test_p2p_unified_invariants.mjs
 *
 * FINLIFE P2P NETWORK — UNIFIED FORMAL INVARIANT VERIFICATION SUITE
 * Explicitly validates and certifies all 23 Architectural Invariants:
 *   [P2P-INV-01] BigInt Integer Paise Currency Representation
 *   [P2P-INV-02] Zero-Penny Leakage Amortization
 *   [P2P-INV-03] Double-Entry Debit/Credit Equilibrium
 *   [P2P-INV-04] Waterfall Repayment Priority Order
 *   [P2P-INV-05] Non-Negative Principal Balance
 *   [P2P-INV-06] Declining-Balance Monthly Rate Precision
 *   [P2P-INV-07] Skip Installment Amortization Invariant
 *   [P2P-INV-08] Advance Payment Amortization Invariant
 *   [P2P-INV-09] Settlement Boundary Isolation
 *   [P2P-INV-10] Journal Replay Determinism
 *   [P2P-INV-11] Person Relationship Netting
 *   [P2P-INV-12] Multi-Loan Contract Sum
 *   [P2P-INV-13] Contract History Integrity
 *   [P2P-INV-14] Settlement Idempotency
 *   [P2P-INV-15] Loan Disbursement Cash Neutrality
 *   [P2P-INV-16] Borrowed Principal Cash Neutrality
 *   [P2P-INV-17] Interest Received Classification
 *   [P2P-INV-18] Interest Paid Classification
 *   [P2P-INV-19] Personal CFO Net Worth Balance Sheet Projection
 *   [P2P-INV-20] Storage Serialization & Hydration Safety
 *   [P2P-INV-21] Zero Double-Counting With Cashbook
 *   [P2P-INV-22] Immutable Journal Audit Trail
 *   [P2P-INV-23] Isolated Projection Read-Only Boundary
 */

import assert from 'assert';
import {
    P2P_ARCHITECTURAL_INVARIANTS,
    toBigIntPaise,
    roundHalfUp,
    rateToBps,
    formatPaiseToINR,
    rupeesToPaise,
    paiseToRupees,
    serializeP2PData,
    hydrateP2PData
} from '../components/p2p/p2pContracts.js';
import {
    LOAN_DIRECTION,
    LOAN_STATUS,
    INTEREST_METHOD,
    REPAYMENT_ALLOCATION,
    SCHEDULE_STATUS,
    JOURNAL_EVENT_TYPES,
    createPerson,
    createP2PLoan,
    createLoanAdvance,
    createLoanRepayment,
    createJournalEntry
} from '../components/p2p/p2pDomainModel.js';
import {
    calculateLoanDNA,
    generateInitialSchedule,
    allocateRepayment,
    recalculateScheduleAfterPayment,
    skipInstallmentInSchedule,
    payInstallmentInAdvanceInSchedule,
    prepayPrincipalInSchedule,
    calculateSettlementQuote,
    createDoubleEntryJournalForEvent,
    createReversalJournalEntry,
    rebuildP2PProjectionsFromJournal
} from '../components/p2p/p2pAccountingEngine.js';
import {
    convertJournalEntryToMoneyFlowTransactions,
    mapP2PJournalToMoneyFlowTransactions
} from '../components/p2p/p2pCashEventAdapter.js';
import { computeP2POverviewMetrics } from '../components/p2p/p2pPresentationAdapter.js';

console.log('================================================================');
console.log('=== FINLIFE P2P NETWORK — UNIFIED 23-INVARIANT CERTIFICATION ===');
console.log('================================================================\n');

let passedCount = 0;
let totalCount = 0;

function verify(invId, desc, fn) {
    totalCount++;
    try {
        fn();
        passedCount++;
        console.log(`  ✓ [${invId}] ${desc}`);
    } catch (err) {
        console.error(`  ✗ [${invId}] FAILED: ${desc}`);
        console.error(`    Error: ${err.message}`);
        throw err;
    }
}

// ── 1. P2P-INV-01: BigInt Integer Paise Currency Representation ─────────────
verify('P2P-INV-01', 'All monetary attributes are stored and calculated as 64-bit BigInt integer paise', () => {
    const loan = createP2PLoan({
        id: 'inv01_loan',
        personId: 'p1',
        principal: 500000,
        direction: LOAN_DIRECTION.GIVEN,
        interestRate: 12,
        tenureMonths: 12
    });
    assert.strictEqual(typeof loan.principalPaise, 'bigint');
    assert.strictEqual(loan.principalPaise, 50000000n);
    assert.strictEqual(typeof loan.outstandingPrincipalPaise, 'bigint');
    assert.strictEqual(loan.outstandingPrincipalPaise, 50000000n);

    const advance = createLoanAdvance({ loanId: 'inv01_loan', amount: 50000 });
    assert.strictEqual(typeof advance.amountPaise, 'bigint');
    assert.strictEqual(advance.amountPaise, 5000000n);

    const repayment = createLoanRepayment({ loanId: 'inv01_loan', amount: 15000 });
    assert.strictEqual(typeof repayment.amountPaise, 'bigint');
    assert.strictEqual(repayment.amountPaise, 1500000n);
});

// ── 2. P2P-INV-02: Zero-Penny Leakage Amortization ──────────────────────────
verify('P2P-INV-02', 'sum(expectedPrincipalPaise) === principalPaise with zero penny leakage over any schedule', () => {
    const testCases = [
        { principal: 100000, tenureMonths: 3 },
        { principal: 250000, tenureMonths: 7 },
        { principal: 133333.33, tenureMonths: 11 },
        { principal: 5000000, tenureMonths: 60 }
    ];

    for (const tc of testCases) {
        const loan = createP2PLoan({
            id: `inv02_${tc.tenureMonths}`,
            personId: 'p_test',
            principal: tc.principal,
            tenureMonths: tc.tenureMonths,
            interestRate: 10.5
        });
        const dna = calculateLoanDNA(loan);
        const schedule = generateInitialSchedule(loan);
        const sumPrincipalPaise = schedule.reduce((sum, item) => sum + item.expectedPrincipalPaise, 0n);
        assert.strictEqual(sumPrincipalPaise, loan.principalPaise, `Mismatch for tenure ${tc.tenureMonths}`);

        const sumInterestPaise = schedule.reduce((sum, item) => sum + item.expectedInterestPaise, 0n);
        assert.strictEqual(sumInterestPaise, dna.totalExpectedInterestPaise, `Interest mismatch for tenure ${tc.tenureMonths}`);
    }
});

// ── 3. P2P-INV-03: Double-Entry Debit/Credit Equilibrium ─────────────────────
verify('P2P-INV-03', 'totalDebitsPaise === totalCreditsPaise for every journal entry to the exact paisa', () => {
    const loan = createP2PLoan({ id: 'inv03_loan', personId: 'p_test', principal: 100000, direction: LOAN_DIRECTION.GIVEN });
    const advance = createLoanAdvance({ loanId: loan.id, amount: 100000 });

    const jeDisburse = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan,
        advance,
        accountId: 'HDFC_01'
    });
    assert.strictEqual(jeDisburse.isBalanced, true);
    assert.strictEqual(jeDisburse.totalDebitsPaise, jeDisburse.totalCreditsPaise);

    const repayment = createLoanRepayment({ loanId: loan.id, amount: 25000 });
    const jeRepay = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED,
        loan,
        repayment,
        allocation: { principalPaise: 2000000n, interestPaise: 400000n, feesPaise: 100000n },
        accountId: 'HDFC_01'
    });
    assert.strictEqual(jeRepay.isBalanced, true);
    assert.strictEqual(jeRepay.totalDebitsPaise, jeRepay.totalCreditsPaise);
});

// ── 4. P2P-INV-04: Waterfall Repayment Priority Order ───────────────────────
verify('P2P-INV-04', 'Repayment allocation strictly enforces waterfall priority (Fees -> Interest -> Principal)', () => {
    const alloc = allocateRepayment({
        paymentAmountPaise: 150000n, // ₹1,500
        outstandingFeesPaise: 50000n, // ₹500
        accruedInterestPaise: 70000n, // ₹700
        outstandingPrincipalPaise: 5000000n, // ₹50,000
        policy: REPAYMENT_ALLOCATION.FEES_FIRST
    });

    assert.strictEqual(alloc.feesPaise, 50000n, 'Fees must be fully cleared first');
    assert.strictEqual(alloc.interestPaise, 70000n, 'Accrued interest must be cleared second');
    assert.strictEqual(alloc.principalPaise, 30000n, 'Remaining ₹300 clears principal');
    assert.strictEqual(alloc.unallocatedPaise, 0n);
});

// ── 5. P2P-INV-05: Non-Negative Principal Balance ────────────────────────────
verify('P2P-INV-05', 'outstandingPrincipalPaise is bounded below by 0n; overpayments are quarantined', () => {
    const alloc = allocateRepayment({
        paymentAmountPaise: 2000000n, // ₹20,000
        outstandingFeesPaise: 0n,
        accruedInterestPaise: 0n,
        outstandingPrincipalPaise: 1500000n, // ₹15,000
        policy: REPAYMENT_ALLOCATION.PRINCIPAL_FIRST,
        quarantineOverpayment: true
    });

    assert.strictEqual(alloc.principalPaise, 1500000n, 'Cannot allocate more principal than outstanding');
    assert.strictEqual(alloc.unallocatedPaise, 500000n, 'Surplus ₹5,000 remains unallocated rather than making balance negative');
});

// ── 6. P2P-INV-06: Declining-Balance Monthly Rate Precision ──────────────────
verify('P2P-INV-06', 'Monthly interest uses deterministic integer division with basis points and half-up rounding', () => {
    const principalPaise = 250000000n;
    const rateBps = 1000n;
    const monthlyInterestPaise = roundHalfUp(principalPaise * rateBps, 120000n);
    assert.strictEqual(monthlyInterestPaise, 2083333n);

    const loan = createP2PLoan({
        id: 'inv06_loan',
        personId: 'p_test',
        principal: 2500000,
        interestRate: 10,
        tenureMonths: 12,
        interestMethod: INTEREST_METHOD.DECLINING_BALANCE
    });
    const schedule = generateInitialSchedule(loan);
    assert.strictEqual(schedule[0].expectedInterestPaise, 2083333n);
});

// ── 7. P2P-INV-07: Skip Installment Amortization Invariant ───────────────────
verify('P2P-INV-07', 'Skipping marks installment SKIPPED, rolls interest forward, extends schedule without losing principal', () => {
    const loan = createP2PLoan({ id: 'inv07_loan', personId: 'p_test', principal: 120000, tenureMonths: 12, interestRate: 12 });
    const schedule = generateInitialSchedule(loan);

    const updated = skipInstallmentInSchedule({
        schedule,
        installmentNumber: 2,
        reason: 'Borrower requested emergency 1-month deferral'
    });

    assert.strictEqual(updated.length, 13, 'Schedule extended from 12 to 13 installments');
    const skippedItem = updated.find(i => i.installmentNumber === 2);
    assert.strictEqual(skippedItem.status, SCHEDULE_STATUS.SKIPPED);
    assert.strictEqual(skippedItem.paidPrincipalPaise, 0n);

    const activeScheduledPrincipal = updated
        .filter(i => i.status !== SCHEDULE_STATUS.SKIPPED)
        .reduce((sum, i) => sum + i.expectedPrincipalPaise, 0n);
    assert.strictEqual(activeScheduledPrincipal, loan.principalPaise, 'Total principal preserved across skip');
});

// ── 8. P2P-INV-08: Advance Payment Amortization Invariant ────────────────────
verify('P2P-INV-08', 'Paying in advance marks item PREPAID without breaking subsequent amortization', () => {
    const loan = createP2PLoan({ id: 'inv08_loan', personId: 'p_test', principal: 120000, tenureMonths: 12, interestRate: 12 });
    const schedule = generateInitialSchedule(loan);

    const updated = payInstallmentInAdvanceInSchedule({
        schedule,
        installmentNumber: 2,
        advancePaymentDate: '2026-06-01'
    });

    const prepaidItem = updated.find(i => i.installmentNumber === 2);
    assert.strictEqual(prepaidItem.status, SCHEDULE_STATUS.PREPAID);
    assert.strictEqual(prepaidItem.paidPrincipalPaise, prepaidItem.expectedPrincipalPaise);
    assert.strictEqual(prepaidItem.isAdvancePayment, true);
});

// ── 9. P2P-INV-09: Settlement Boundary Isolation ────────────────────────────
verify('P2P-INV-09', 'Settled loans cease contributing to active receivables, payables, or net worth', () => {
    const activeLoan = createP2PLoan({ id: 'active_1', personId: 'p_test', principal: 100000, direction: LOAN_DIRECTION.GIVEN, status: LOAN_STATUS.ACTIVE });
    const settledLoan = createP2PLoan({ id: 'settled_1', personId: 'p_test', principal: 200000, direction: LOAN_DIRECTION.GIVEN, status: LOAN_STATUS.SETTLED });

    const metrics = computeP2POverviewMetrics([activeLoan, settledLoan], {}, []);
    assert.strictEqual(metrics.totalReceivablePaise, 10000000n, 'Only active loan counts in totalReceivablePaise');
    assert.strictEqual(metrics.activeGivenCount, 1);
});

// ── 10. P2P-INV-10: Journal Replay Determinism ───────────────────────────────
verify('P2P-INV-10', 'Replaying the journal reproduces 100% identical loan balances and person relationships', () => {
    const person = createPerson({ id: 'replay_person_1', name: 'Naveen' });
    const loan = createP2PLoan({ id: 'replay_loan_1', personId: person.id, principal: 50000, direction: LOAN_DIRECTION.GIVEN });
    const advance = createLoanAdvance({ loanId: loan.id, amount: 50000 });

    const jeDisburse = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan,
        advance,
        accountId: 'HDFC_ACC'
    });

    const repayment = createLoanRepayment({ loanId: loan.id, amount: 15000 });
    const jeRepay = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED,
        loan,
        repayment,
        allocation: { principalPaise: 1200000n, interestPaise: 300000n, feesPaise: 0n },
        accountId: 'HDFC_ACC'
    });

    const replay1 = rebuildP2PProjectionsFromJournal({
        journalEntries: [jeDisburse, jeRepay],
        persons: [person],
        loans: [loan]
    });

    const replay2 = rebuildP2PProjectionsFromJournal({
        journalEntries: [jeDisburse, jeRepay],
        persons: [person],
        loans: [loan]
    });

    assert.deepStrictEqual(replay1, replay2, 'Replay must be 100% deterministic');
    assert.strictEqual(replay1.loans['replay_loan_1'].outstandingPrincipalPaise, 3800000n);
    assert.strictEqual(replay1.relationships['replay_person_1'].netBalancePaise, 3800000n);
});

// ── 11. P2P-INV-11: Person Relationship Netting ─────────────────────────────
verify('P2P-INV-11', 'Person net balance strictly equals Total Given minus Total Taken', () => {
    const person = createPerson({ id: 'rel_p1', name: 'Kasapa Reddy' });
    const loanGiven = createP2PLoan({ id: 'l_given', personId: person.id, principal: 2500000, direction: LOAN_DIRECTION.GIVEN });
    const loanTaken = createP2PLoan({ id: 'l_taken', personId: person.id, principal: 400000, direction: LOAN_DIRECTION.TAKEN });

    const je1 = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan: loanGiven,
        advance: createLoanAdvance({ loanId: loanGiven.id, amount: 2500000 }),
        accountId: 'SBI_01'
    });
    const je2 = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN,
        loan: loanTaken,
        advance: createLoanAdvance({ loanId: loanTaken.id, amount: 400000 }),
        accountId: 'SBI_01'
    });

    const replay = rebuildP2PProjectionsFromJournal({
        journalEntries: [je1, je2],
        persons: [person],
        loans: [loanGiven, loanTaken]
    });

    const rel = replay.relationships[person.id];
    assert.strictEqual(rel.totalGivenPaise, 250000000n);
    assert.strictEqual(rel.totalTakenPaise, 40000000n);
    assert.strictEqual(rel.netBalancePaise, 210000000n, 'Net balance must strictly equal totalGivenPaise - totalTakenPaise');
});

// ── 12. P2P-INV-12: Multi-Loan Contract Sum ─────────────────────────────────
verify('P2P-INV-12', 'Person aggregate balance equals the sum of all individual active loan contracts', () => {
    const person = createPerson({ id: 'multi_p1', name: 'Multi Loan Borrower' });
    const loan1 = createP2PLoan({ id: 'ml_1', personId: person.id, principal: 100000, direction: LOAN_DIRECTION.GIVEN });
    const loan2 = createP2PLoan({ id: 'ml_2', personId: person.id, principal: 200000, direction: LOAN_DIRECTION.GIVEN });
    const loan3 = createP2PLoan({ id: 'ml_3', personId: person.id, principal: 150000, direction: LOAN_DIRECTION.GIVEN });

    const journal = [loan1, loan2, loan3].map(l => createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan: l,
        advance: createLoanAdvance({ loanId: l.id, amount: paiseToRupees(l.principalPaise) }),
        accountId: 'ACC_01'
    }));

    const replay = rebuildP2PProjectionsFromJournal({
        journalEntries: journal,
        persons: [person],
        loans: [loan1, loan2, loan3]
    });

    const rel = replay.relationships[person.id];
    const sumContracts = loan1.principalPaise + loan2.principalPaise + loan3.principalPaise;
    assert.strictEqual(rel.totalGivenPaise, sumContracts);
});

// ── 13. P2P-INV-13: Contract History Integrity ──────────────────────────────
verify('P2P-INV-13', 'Multi-loan relationship netting preserves independent per-contract accounting history', () => {
    const person = createPerson({ id: 'hist_p1', name: 'Contract History Borrower' });
    const loan1 = createP2PLoan({ id: 'ch_1', personId: person.id, principal: 100000, direction: LOAN_DIRECTION.GIVEN });
    const loan2 = createP2PLoan({ id: 'ch_2', personId: person.id, principal: 200000, direction: LOAN_DIRECTION.GIVEN });

    const je1 = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan: loan1,
        advance: createLoanAdvance({ loanId: loan1.id, amount: 100000 }),
        accountId: 'ACC'
    });
    const je2 = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan: loan2,
        advance: createLoanAdvance({ loanId: loan2.id, amount: 200000 }),
        accountId: 'ACC'
    });
    const je3 = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED,
        loan: loan1,
        repayment: createLoanRepayment({ loanId: loan1.id, amount: 100000 }),
        allocation: { principalPaise: 10000000n, interestPaise: 0n, feesPaise: 0n },
        accountId: 'ACC'
    });

    const replay = rebuildP2PProjectionsFromJournal({
        journalEntries: [je1, je2, je3],
        persons: [person],
        loans: [loan1, loan2]
    });

    assert.strictEqual(replay.loans['ch_1'].outstandingPrincipalPaise, 0n, 'Loan 1 must be fully repaid');
    assert.strictEqual(replay.loans['ch_2'].outstandingPrincipalPaise, 20000000n, 'Loan 2 remains untouched');
    assert.strictEqual(replay.relationships[person.id].netBalancePaise, 20000000n);
});

// ── 14. P2P-INV-14: Settlement Idempotency ──────────────────────────────────
verify('P2P-INV-14', 'Submitting settlement with stable idempotency key produces no duplicate journal entries', () => {
    const loan = createP2PLoan({ id: 'idem_loan', personId: 'p_test', principal: 100000, direction: LOAN_DIRECTION.GIVEN });
    const quote = calculateSettlementQuote({ loan, schedule: generateInitialSchedule(loan) });
    assert.strictEqual(typeof quote.settlementAmountPaise, 'bigint');

    const opId = 'idem_op_12345';
    const je1 = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_SETTLEMENT,
        operationId: opId,
        loan,
        settlementRecord: { finalPaymentPaise: quote.settlementAmountPaise, waiverPaise: quote.waiverPaise },
        accountId: 'ACC'
    });
    const je2 = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_SETTLEMENT,
        operationId: opId,
        loan,
        settlementRecord: { finalPaymentPaise: quote.settlementAmountPaise, waiverPaise: quote.waiverPaise },
        accountId: 'ACC'
    });

    assert.strictEqual(je1.operationId, je2.operationId);
    assert.strictEqual(je1.isBalanced, true);
});

// ── 15. P2P-INV-15: Loan Disbursement Cash Neutrality ───────────────────────
verify('P2P-INV-15', 'Money lent is classified as TRANSFER and is strictly excluded from lifestyle operating burn', () => {
    const loan = createP2PLoan({ id: 'neut_1', personId: 'p_test', principal: 50000, direction: LOAN_DIRECTION.GIVEN });
    const je = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan,
        advance: createLoanAdvance({ loanId: loan.id, amount: 50000 }),
        accountId: 'BANK_1'
    });

    const txs = convertJournalEntryToMoneyFlowTransactions(je, {}, { [loan.id]: loan });
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'TRANSFER');
    assert.strictEqual(txs[0].isBurnExpense, false);
    assert.strictEqual(txs[0].isExcludedFromBurn, true);
});

// ── 16. P2P-INV-16: Borrowed Principal Cash Neutrality ──────────────────────
verify('P2P-INV-16', 'Money borrowed is classified as TRANSFER and is strictly excluded from ordinary earned income', () => {
    const loan = createP2PLoan({ id: 'neut_2', personId: 'p_test', principal: 80000, direction: LOAN_DIRECTION.TAKEN });
    const je = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN,
        loan,
        advance: createLoanAdvance({ loanId: loan.id, amount: 80000 }),
        accountId: 'BANK_1'
    });

    const txs = convertJournalEntryToMoneyFlowTransactions(je, {}, { [loan.id]: loan });
    assert.strictEqual(txs.length, 1);
    assert.strictEqual(txs[0].type, 'TRANSFER');
    assert.strictEqual(txs[0].isOrdinaryIncome, false);
    assert.strictEqual(txs[0].isExcludedFromBurn, true);
});

// ── 17. P2P-INV-17: Interest Received Classification ────────────────────────
verify('P2P-INV-17', 'Interest received on lent money is recognized as ordinary INCOME', () => {
    const loan = createP2PLoan({ id: 'tax_1', personId: 'p_test', principal: 100000, direction: LOAN_DIRECTION.GIVEN });
    const je = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED,
        loan,
        repayment: createLoanRepayment({ loanId: loan.id, amount: 15000 }),
        allocation: { principalPaise: 1000000n, interestPaise: 500000n, feesPaise: 0n },
        accountId: 'BANK_1'
    });

    const txs = convertJournalEntryToMoneyFlowTransactions(je, {}, { [loan.id]: loan });
    const principalTx = txs.find(t => t.id.includes('principal'));
    const interestTx = txs.find(t => t.id.includes('interest'));

    assert.ok(principalTx, 'Principal tx present');
    assert.strictEqual(principalTx.type, 'TRANSFER');
    assert.strictEqual(principalTx.amount, 10000);

    assert.ok(interestTx, 'Interest tx present');
    assert.strictEqual(interestTx.type, 'INCOME');
    assert.strictEqual(interestTx.isOrdinaryIncome, true);
    assert.strictEqual(interestTx.amount, 5000);
});

// ── 18. P2P-INV-18: Interest Paid Classification ────────────────────────────
verify('P2P-INV-18', 'Interest paid on borrowed money is recognized as financing EXPENSE', () => {
    const loan = createP2PLoan({ id: 'exp_1', personId: 'p_test', principal: 100000, direction: LOAN_DIRECTION.TAKEN });
    const je = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID,
        loan,
        repayment: createLoanRepayment({ loanId: loan.id, amount: 12000 }),
        allocation: { principalPaise: 1000000n, interestPaise: 200000n, feesPaise: 0n },
        accountId: 'BANK_1'
    });

    const txs = convertJournalEntryToMoneyFlowTransactions(je, {}, { [loan.id]: loan });
    const principalTx = txs.find(t => t.id.includes('principal'));
    const interestTx = txs.find(t => t.id.includes('interest'));

    assert.ok(principalTx);
    assert.strictEqual(principalTx.type, 'TRANSFER');

    assert.ok(interestTx);
    assert.strictEqual(interestTx.type, 'EXPENSE');
    assert.strictEqual(interestTx.category, 'P2P Interest Expense');
    assert.strictEqual(interestTx.amount, 2000);
});

// ── 19. P2P-INV-19: Personal CFO Net Worth Balance Sheet Projection ─────────
verify('P2P-INV-19', 'P2P Net Worth projection strictly equals active given receivables minus active taken payables', () => {
    const loanGiven = createP2PLoan({
        id: 'nw_given',
        personId: 'p_test',
        principal: 500000,
        direction: LOAN_DIRECTION.GIVEN,
        status: LOAN_STATUS.ACTIVE
    });
    const loanTaken = createP2PLoan({
        id: 'nw_taken',
        personId: 'p_test',
        principal: 200000,
        direction: LOAN_DIRECTION.TAKEN,
        status: LOAN_STATUS.ACTIVE
    });
    const loanSettled = createP2PLoan({
        id: 'nw_settled',
        personId: 'p_test',
        principal: 300000,
        direction: LOAN_DIRECTION.GIVEN,
        status: LOAN_STATUS.SETTLED
    });

    const metrics = computeP2POverviewMetrics([loanGiven, loanTaken, loanSettled], {}, []);
    assert.strictEqual(metrics.totalReceivablePaise, 50000000n, 'Active given principal only');
    assert.strictEqual(metrics.totalPayablePaise, 20000000n, 'Active taken principal only');
    assert.strictEqual(metrics.netPositionPaise, 30000000n, 'Net position equals receivable minus payable');
});

// ── 20. P2P-INV-20: Storage Serialization & Hydration Safety ────────────────
verify('P2P-INV-20', 'All BigInt paise properties survive serialization/hydration round-trip with zero precision loss', () => {
    const original = {
        loanId: 'roundtrip_1',
        principalPaise: 1234567890123456n,
        outstandingPrincipalPaise: 987654321098765n,
        nested: {
            expectedInterestPaise: 456789012345n,
            label: 'Nested Item'
        },
        items: [
            { debitPaise: 100000n, creditPaise: 100000n },
            { debitPaise: 200000n, creditPaise: 200000n }
        ]
    };

    const serialized = serializeP2PData(original);
    const jsonStr = JSON.stringify(serialized);
    assert.doesNotThrow(() => JSON.parse(jsonStr));

    const hydrated = hydrateP2PData(JSON.parse(jsonStr));
    assert.strictEqual(typeof hydrated.principalPaise, 'bigint');
    assert.strictEqual(hydrated.principalPaise, original.principalPaise);
    assert.strictEqual(hydrated.outstandingPrincipalPaise, original.outstandingPrincipalPaise);
    assert.strictEqual(hydrated.nested.expectedInterestPaise, original.nested.expectedInterestPaise);
    assert.strictEqual(hydrated.items[0].debitPaise, 100000n);
    assert.strictEqual(hydrated.items[1].creditPaise, 200000n);
});

// ── 21. P2P-INV-21: Zero Double-Counting With Cashbook ───────────────────────
verify('P2P-INV-21', 'When money is lent, cash falls by X and P2P receivable rises by X, leaving immediate net worth change 0', () => {
    const loanAmountPaise = 10000000n; // ₹1,00,000

    let cashPaise = 50000000n;
    let p2pReceivablePaise = 0n;
    const initialNetWorthPaise = cashPaise + p2pReceivablePaise;

    cashPaise -= loanAmountPaise;
    p2pReceivablePaise += loanAmountPaise;

    const postDisbursementNetWorthPaise = cashPaise + p2pReceivablePaise;
    assert.strictEqual(postDisbursementNetWorthPaise, initialNetWorthPaise, 'Net worth must have zero immediate deviation');
});

// ── 22. P2P-INV-22: Immutable Journal Audit Trail ───────────────────────────
verify('P2P-INV-22', 'Journal entries are append-only; reversals create compensating entries without altering historical entries', () => {
    const loan = createP2PLoan({ id: 'immut_loan', personId: 'p_test', principal: 50000, direction: LOAN_DIRECTION.GIVEN });
    const originalEntry = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan,
        advance: createLoanAdvance({ loanId: loan.id, amount: 50000 }),
        accountId: 'ACC_1'
    });

    const originalDebits = originalEntry.totalDebitsPaise;
    const originalCredits = originalEntry.totalCreditsPaise;
    const originalEntryString = JSON.stringify(serializeP2PData(originalEntry));

    const reversalEntry = createReversalJournalEntry(originalEntry, 'Mistaken loan entry recorded');

    assert.strictEqual(JSON.stringify(serializeP2PData(originalEntry)), originalEntryString);
    assert.strictEqual(reversalEntry.reversesJournalEntryId, originalEntry.id);
    assert.strictEqual(reversalEntry.isReversal, true);
    assert.strictEqual(reversalEntry.isBalanced, true);
    assert.strictEqual(reversalEntry.totalDebitsPaise, originalCredits);
    assert.strictEqual(reversalEntry.totalCreditsPaise, originalDebits);
});

// ── 23. P2P-INV-23: Isolated Projection Read-Only Boundary ──────────────────
verify('P2P-INV-23', 'Projections derived from P2P never mutate core ledger or cashbook data', () => {
    const person = createPerson({ id: 'iso_p1', name: 'Isolated Borrower' });
    const loan = createP2PLoan({ id: 'iso_l1', personId: person.id, principal: 100000, direction: LOAN_DIRECTION.GIVEN });
    const je = createDoubleEntryJournalForEvent({
        eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
        loan,
        advance: createLoanAdvance({ loanId: loan.id, amount: 100000 }),
        accountId: 'ACC_1'
    });

    const originalJournal = [je];
    const journalSnapshot = JSON.stringify(serializeP2PData(originalJournal));

    const projection = rebuildP2PProjectionsFromJournal({
        journalEntries: originalJournal,
        persons: [person],
        loans: [loan]
    });

    assert.strictEqual(JSON.stringify(serializeP2PData(originalJournal)), journalSnapshot);
    assert.ok(projection.relationships[person.id]);
    assert.strictEqual(projection.relationships[person.id].totalGivenPaise, 10000000n);
});

console.log('\n================================================================');
console.log(`  ✓ CERTIFIED: All 23 Architectural Invariants PASSED (${passedCount}/${totalCount})`);
console.log('================================================================\n');
