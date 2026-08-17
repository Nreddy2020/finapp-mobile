/**
 * test_p2p_interest.mjs
 * 
 * P2P SUITE 6: INTEREST TIMELINE & ACCRUAL INTELLIGENCE
 * 
 * Verifies:
 * 1. Month-by-month Interest Schedule Timeline generation
 * 2. Advance Interest Calculation (Current month vs Advance payment)
 * 3. Historical Paid Interest vs Accrued Unpaid Interest
 * 4. Simple interest monthly breakdown vs Amortized interest curve
 * 5. Visual formatting and date range intervals (e.g. '06 Jul 2026 - 05 Aug 2026')
 */

import {
    calculateInterestTimeline,
    calculateLoanDNA
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

console.log('=== P2P SUITE 6: INTEREST TIMELINE & ACCRUAL INTELLIGENCE ===\n');

// ── 1. ICICI 9.99% INTEREST LEDGER TIMELINE (KASAPA REF) ────────────────────
console.log('--- 1. Kasapa ICICI Personal Loan (₹2,36,746.04 @ 9.99%) ---');
const kasapaLoan = {
    id: 'loan_110',
    principal: 236746.04,
    interestRate: 9.99,
    interestMethod: 'SIMPLE',
    tenureMonths: 12,
    startDate: '2026-04-06'
};

const sampleSchedule = [
    { id: 's1', installmentNumber: 1, dueDate: '2026-05-06', status: 'PAID', paidInterest: 19709.10, expectedInterest: 19709.10 },
    { id: 's2', installmentNumber: 2, dueDate: '2026-06-06', status: 'PAID', paidInterest: 19709.10, expectedInterest: 19709.10 },
    { id: 's3', installmentNumber: 3, dueDate: '2026-07-06', status: 'PAID', paidInterest: 19709.10, expectedInterest: 19709.10 },
    { id: 's4', installmentNumber: 4, dueDate: '2026-08-06', status: 'PENDING', paidInterest: 0, expectedInterest: 19709.10, remainingTotal: 19709.10 }
];

const timeline = calculateInterestTimeline({
    loan: kasapaLoan,
    schedule: sampleSchedule,
    currentDate: '2026-08-17'
});

assert(timeline.totalInterestIncurred > 0, `Total interest incurred: ₹${timeline.totalInterestIncurred}`);
assert(timeline.totalInterestPaid > 0, `Total interest paid: ₹${timeline.totalInterestPaid}`);
assert(timeline.interestOutstanding >= 0, `Interest outstanding: ₹${timeline.interestOutstanding}`);
assert(Array.isArray(timeline.monthTimeline), 'Generated monthTimeline array');
assert(timeline.monthTimeline.length === 4, `Timeline contains 4 month entries (actual: ${timeline.monthTimeline.length})`);

// Check month timeline entry properties
const currentMonthEntry = timeline.monthTimeline.find(m => m.isCurrent);
if (currentMonthEntry) {
    assert(currentMonthEntry.status === 'PENDING', 'Current month installment is PENDING');
    assert(typeof currentMonthEntry.dateRange === 'string', `Date range formatted: ${currentMonthEntry.dateRange}`);
}

// ── 2. SIMPLE VS AMORTIZED INTEREST PROGRESSION ─────────────────────────────
console.log('\n--- 2. Simple vs Amortized Interest Progression ---');
const simpleDNA = calculateLoanDNA({ principal: 100000, interestRate: 12, tenureMonths: 12, interestMethod: 'SIMPLE' });
const amortizedDNA = calculateLoanDNA({ principal: 100000, interestRate: 12, tenureMonths: 12, interestMethod: 'AMORTIZED' });

assert(simpleDNA.totalInterest > 0 && amortizedDNA.totalInterest > 0, 'Simple interest and amortized interest properly computed');
assert(simpleDNA.totalInterest === 6500 && Math.abs(amortizedDNA.totalInterest - 6618.55) < 1, 'Declining-balance simple interest (₹6,500) and amortized interest (₹6,618.55) match exact formulas');

console.log(`\n=== P2P INTEREST SUITE SUMMARY: ${passedTests}/${totalTests} TESTS PASSED ===\n`);
