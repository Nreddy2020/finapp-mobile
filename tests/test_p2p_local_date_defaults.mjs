/**
 * tests/test_p2p_local_date_defaults.mjs
 *
 * Regression test: P2P "today" defaults must use the LOCAL calendar date, not UTC.
 *
 * India is UTC+05:30, so `new Date().toISOString().split('T')[0]` returns the previous day for
 * the first 5.5 hours after local midnight. A loan created or a repayment recorded at 01:30 IST
 * on 24 Nov would be stamped 23 Nov. This test pins the clock to exactly that instant and checks
 * the defaults, independent of the real wall clock and the machine's timezone.
 */

import assert from 'assert';

process.env.TZ = 'Asia/Kolkata';

// Pin "now" to 2026-11-24 01:30 IST == 2026-11-23 20:00 UTC.
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

console.log('--- [P2P] Testing local-date defaults across the IST midnight window ---');

// Prove the scenario really exercises the boundary: UTC and local calendar dates differ here.
assert.strictEqual(new Date().toISOString().split('T')[0], '2026-11-23', 'Sanity: UTC date must be the previous day');
assert.strictEqual(new Date().getDate(), 24, 'Sanity: process timezone must be IST (local date is the 24th)');

const { createP2PLoan, createLoanAdvance } = await import('../components/p2p/p2pDomainModel.js');
const { computeP2POverviewMetrics } = await import('../components/p2p/p2pPresentationAdapter.js');

const loan = createP2PLoan({ id: 'loan_date_test', personId: 'p1', principal: 1000 });
assert.strictEqual(loan.startDate, '2026-11-24', `Loan startDate default must be the local date, got ${loan.startDate}`);
console.log('✓ createP2PLoan default startDate is the local date');

const advance = createLoanAdvance({ loanId: 'loan_date_test', amount: 500 });
assert.strictEqual(advance.date, '2026-11-24', `Advance date default must be the local date, got ${advance.date}`);
console.log('✓ createLoanAdvance default date is the local date');

// The presentation adapter's default asOfDate must resolve without error at this instant.
// (Overdue classification itself is covered by the P2P health/UI suites with explicit dates.)
const loans = [{ ...loan, id: 'loan_ov', status: 'ACTIVE' }];
const schedules = {
    loan_ov: [{
        id: 'sch_1', loanId: 'loan_ov', installmentNumber: 1,
        dueDate: '2026-11-23', status: 'PENDING',
        expectedPaise: 100000n, principalPaise: 90000n, interestPaise: 10000n, paidPaise: 0n
    }]
};
let threw = null;
let metrics = null;
try { metrics = computeP2POverviewMetrics(loans, [], [], schedules); } catch (e) { threw = e; }
assert.strictEqual(threw, null, `computeP2POverviewMetrics default asOfDate must not throw: ${threw && threw.message}`);
assert.ok(metrics, 'computeP2POverviewMetrics must return metrics with its default asOfDate');
console.log('✓ computeP2POverviewMetrics runs with the local-date default');

global.Date = RealDate;
console.log('--- [P2P] Local-date default invariants passed ---');
