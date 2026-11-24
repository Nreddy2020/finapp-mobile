/**
 * tests/test_banking_local_date_defaults.mjs
 *
 * Regression test: Banking "today" defaults must use the LOCAL calendar date, not UTC.
 *
 * India is UTC+05:30, so `new Date().toISOString().split('T')[0]` is the previous day for the first
 * 5.5 hours after local midnight. This pins the clock to 01:30 IST on 24 Nov 2026 and checks both
 * entity defaults and the overdue/upcoming classification, which used the UTC date.
 */

import assert from 'assert';

process.env.TZ = 'Asia/Kolkata';

// 2026-11-24 01:30 IST == 2026-11-23 20:00 UTC
const RealDate = Date;
const FIXED = RealDate.parse('2026-11-23T20:00:00Z');
class FakeDate extends RealDate {
    constructor(...args) {
        if (args.length === 0) super(FIXED);
        else super(...args);
    }
    static now() { return FIXED; }
}
global.Date = FakeDate;

console.log('--- [BANKING] Testing local-date defaults across the IST midnight window ---');

assert.strictEqual(new Date().toISOString().split('T')[0], '2026-11-23', 'Sanity: UTC date must be the previous day');
assert.strictEqual(new Date().getDate(), 24, 'Sanity: process timezone must be IST');

const { createBankLoan } = await import('../components/banking/bankingDomainModel.js');
const { evaluateRepaymentStatus } = await import('../services/banking-credit/bankingCreditContracts.js');

const loan = createBankLoan({ id: 'loan_date_test', bankId: 'b1', loanName: 'Date Test', originalPrincipalPaise: 100000n });
assert.strictEqual(loan.startDate, '2026-11-24', `Loan startDate default must be the local date, got ${loan.startDate}`);
console.log('✓ createBankLoan default startDate is the local date');

// An installment due on the 23rd is overdue on the (local) 24th. The old UTC logic said UPCOMING.
const overdue = evaluateRepaymentStatus({ dueDate: '2026-11-23', status: 'PENDING', expectedTotalPaise: 100000n, paidTotalPaise: 0n });
assert.strictEqual(overdue.category, 'OVERDUE', `Installment due the 23rd must be OVERDUE on the local 24th, got ${overdue.category}`);
assert.strictEqual(overdue.isOverdue, true);
console.log('✓ evaluateRepaymentStatus classifies yesterday-due as OVERDUE at 01:30 IST');

// Due today is still upcoming (not overdue).
const dueToday = evaluateRepaymentStatus({ dueDate: '2026-11-24', status: 'PENDING', expectedTotalPaise: 100000n, paidTotalPaise: 0n });
assert.strictEqual(dueToday.category, 'UPCOMING', `Installment due today must be UPCOMING, got ${dueToday.category}`);
console.log('✓ evaluateRepaymentStatus keeps due-today as UPCOMING');

// An explicit YYYY-MM-DD asOfDate must be honoured as-is, independent of timezone.
const explicit = evaluateRepaymentStatus({ dueDate: '2026-01-05', status: 'PENDING', expectedTotalPaise: 100000n, paidTotalPaise: 0n, asOfDate: '2026-01-06' });
assert.strictEqual(explicit.category, 'OVERDUE');
console.log('✓ explicit YYYY-MM-DD asOfDate is honoured exactly');

global.Date = RealDate;
console.log('--- [BANKING] Local-date default invariants passed ---');
