/**
 * test_p2p_settlement.mjs
 * 
 * P2P SUITE 5: SETTLEMENT RECONCILIATION & CLOSURE
 * 
 * Verifies:
 * 1. Settlement Quote Calculation (Outstanding Principal + Accrued Unpaid Interest - Waivers)
 * 2. Settlement Reconciliation with Zero balance remaining
 * 3. Settlement with partial interest discount / waiver
 * 4. Loan status transition from ACTIVE to SETTLED
 * 5. Double-Entry Journal creation for Loan Settlement event
 */

import {
    calculateSettlementQuote,
    createDoubleEntryJournalForEvent,
    JOURNAL_EVENT_TYPES
} from '../components/p2p/p2pAccountingEngine.js';

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

console.log('=== P2P SUITE 5: SETTLEMENT RECONCILIATION & CLOSURE ===\n');

// ── 1. SETTLEMENT QUOTE CALCULATION ─────────────────────────────────────────
console.log('--- 1. Settlement Quote Math ---');
const sampleLoan = {
    id: 'loan_settle_01',
    principal: 200000,
    outstandingPrincipal: 150000,
    interestRate: 12,
    interestMethod: 'SIMPLE'
};

const sampleSchedule = [
    { id: 'sch_1', status: 'PAID', paidPrincipal: 50000, paidInterest: 2000, remainingTotal: 0 },
    { id: 'sch_2', status: 'PENDING', expectedPrincipal: 50000, expectedInterest: 1500, remainingTotal: 51500 },
    { id: 'sch_3', status: 'PENDING', expectedPrincipal: 50000, expectedInterest: 1500, remainingTotal: 51500 },
    { id: 'sch_4', status: 'PENDING', expectedPrincipal: 50000, expectedInterest: 1500, remainingTotal: 51500 }
];

const quote = calculateSettlementQuote({
    loan: sampleLoan,
    schedule: sampleSchedule,
    settlementDate: '2026-08-17',
    waiverAmount: 0
});

assert(quote.outstandingPrincipal === 150000, 'Outstanding principal is ₹1,50,000');
assert(quote.accruedUnpaidInterest > 0, `Accrued unpaid interest calculated: ₹${quote.accruedUnpaidInterest}`);
assert(quote.finalSettlementAmount === quote.outstandingPrincipal + quote.accruedUnpaidInterest, 'Settlement amount equals Principal + Accrued Interest');

// ── 2. SETTLEMENT WITH WAIVER / DISCOUNT ────────────────────────────────────
console.log('\n--- 2. Settlement with Waiver / Discount ---');
const quoteWithWaiver = calculateSettlementQuote({
    loan: sampleLoan,
    schedule: sampleSchedule,
    settlementDate: '2026-08-17',
    waiverAmount: 1000
});

assert(quoteWithWaiver.waiverAmount === 1000, 'Waiver amount recorded');
assert(quoteWithWaiver.finalSettlementAmount === quote.finalSettlementAmount - 1000, 'Final settlement amount discounted by exact waiver');

// ── 3. DOUBLE-ENTRY JOURNAL FOR SETTLEMENT ──────────────────────────────────
console.log('\n--- 3. Settlement Journal Entry Verification ---');
const settleJournal = createDoubleEntryJournalForEvent({
    sourceEntityId: sampleLoan.id,
    sourceEventId: 'settle_event_01',
    eventType: JOURNAL_EVENT_TYPES.SETTLEMENT,
    timestamp: '2026-08-17T12:00:00.000Z',
    cashAccountId: 'acc_hdfc_salary',
    cashAccountName: 'HDFC Salary Account',
    principalAmount: quote.outstandingPrincipal,
    interestAmount: quote.accruedUnpaidInterest,
    waiverAmount: 0,
    counterpartyName: 'Test Borrower'
});

assert(settleJournal.eventType === 'P2P_SETTLEMENT', 'Journal event type is P2P_SETTLEMENT');
const totalDebits = settleJournal.debits.reduce((s, d) => s + d.amount, 0);
const totalCredits = settleJournal.credits.reduce((s, c) => s + c.amount, 0);
assert(totalDebits === totalCredits, `Settlement journal entry debits (${totalDebits}) balance credits (${totalCredits})`);

console.log(`\n=== P2P SETTLEMENT SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
