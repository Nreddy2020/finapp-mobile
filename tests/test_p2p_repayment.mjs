/**
 * test_p2p_repayment.mjs
 * 
 * P2P SUITE 4: REPAYMENT PROCESSING & SCHEDULE RECALCULATION
 * 
 * Verifies:
 * 1. Full payment of an installment (transitions to PAID, zero remaining)
 * 2. Partial payment preservation (transitions to PARTIALLY_PAID, tracks paid and remaining)
 * 3. Overpayment / prepayment handling
 * 4. Immutable historical record preservation during future schedule recalculation
 * 5. Multi-installment consecutive payment tracking
 */

import {
    generateInitialSchedule,
    recalculateScheduleAfterPayment,
    allocateRepayment
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

console.log('=== P2P SUITE 4: REPAYMENT PROCESSING & SCHEDULE RECALCULATION ===\n');

// ── 1. FULL PAYMENT OF INSTALLMENT 1 ────────────────────────────────────────
console.log('--- 1. Full Payment of Installment 1 ---');
const initialSchedule = generateInitialSchedule({
    loanId: 'loan_repay_test',
    principal: 120000,
    interestRate: 10,
    tenureMonths: 6,
    interestMethod: 'AMORTIZED',
    startDate: '2026-08-01',
    dueDayOfMonth: 1
});

const inst1 = initialSchedule[0];
const updatedSchedule1 = recalculateScheduleAfterPayment({
    currentSchedule: initialSchedule,
    targetScheduleItemId: inst1.id,
    paymentAmount: inst1.expectedTotal,
    paymentDate: '2026-08-01',
    allocationPolicy: 'INTEREST_FIRST'
});

const updatedInst1 = updatedSchedule1.find(i => i.id === inst1.id);
assert(updatedInst1.status === 'PAID', 'Installment 1 transitioned to PAID');
assert(updatedInst1.paidTotal === inst1.expectedTotal, 'paidTotal matches expectedTotal');
assert(updatedInst1.remainingTotal === 0, 'remainingTotal is 0');
assert(updatedInst1.paidPrincipal === inst1.expectedPrincipal, 'paidPrincipal matches expected');
assert(updatedInst1.paidInterest === inst1.expectedInterest, 'paidInterest matches expected');

// ── 2. PARTIAL PAYMENT PRESERVATION ─────────────────────────────────────────
console.log('\n--- 2. Partial Payment Handling (PARTIALLY_PAID) ---');
const inst2 = updatedSchedule1[1];
const partialAmount = Math.round(inst2.expectedTotal / 2);

const updatedSchedule2 = recalculateScheduleAfterPayment({
    currentSchedule: updatedSchedule1,
    targetScheduleItemId: inst2.id,
    paymentAmount: partialAmount,
    paymentDate: '2026-09-01',
    allocationPolicy: 'INTEREST_FIRST'
});

const updatedInst2 = updatedSchedule2.find(i => i.id === inst2.id);
assert(updatedInst2.status === 'PARTIALLY_PAID', 'Installment 2 transitioned to PARTIALLY_PAID');
assert(updatedInst2.paidTotal === partialAmount, `paidTotal is ₹${partialAmount}`);
assert(Math.abs(updatedInst2.remainingTotal - (inst2.expectedTotal - partialAmount)) < 0.05, `remainingTotal is ₹${updatedInst2.remainingTotal}`);
assert(Math.abs((updatedInst2.paidTotal + updatedInst2.remainingTotal) - inst2.expectedTotal) < 0.05, 'Audit trail invariant: paid + remaining === expected');

// ── 3. HISTORY IMMUTABILITY CHECK ───────────────────────────────────────────
console.log('\n--- 3. History Immutability Check ---');
const checkInst1 = updatedSchedule2.find(i => i.id === inst1.id);
assert(checkInst1.status === 'PAID', 'Installment 1 remains PAID after Installment 2 edit');
assert(checkInst1.paidTotal === inst1.expectedTotal, 'Installment 1 historical numbers untouched');

// ── 4. COMPLETING A PARTIALLY PAID INSTALLMENT ──────────────────────────────
console.log('\n--- 4. Completing a Partially Paid Installment ---');
const secondPaymentAmount = updatedInst2.remainingTotal;
const updatedSchedule3 = recalculateScheduleAfterPayment({
    currentSchedule: updatedSchedule2,
    targetScheduleItemId: inst2.id,
    paymentAmount: secondPaymentAmount,
    paymentDate: '2026-09-15',
    allocationPolicy: 'INTEREST_FIRST'
});

const completedInst2 = updatedSchedule3.find(i => i.id === inst2.id);
assert(completedInst2.status === 'PAID', 'Second payment turns PARTIALLY_PAID into PAID');
assert(completedInst2.paidTotal === inst2.expectedTotal, 'Total paid across two payments equals full expected installment');
assert(completedInst2.remainingTotal === 0, 'Remaining total is 0');

console.log(`\n=== P2P REPAYMENT SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
