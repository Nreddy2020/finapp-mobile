/**
 * tests/shared-costs/test_sc08_recurring_expenses.mjs
 * 
 * SC-08: Recurring Expense Templates & Duplicate-Proof Generation.
 */

import assert from 'assert';
import { RecurringExpenseEngine } from '../../services/shared-costs/recurringExpenseEngine.js';
import { RECURRING_FREQUENCIES, SPLIT_METHODS } from '../../services/shared-costs/groupContracts.js';

console.log('--- [SC-08] Testing Recurring Expense Engine & Idempotency ---');

// 1. Cadence Date Calculations
const baseDate = new Date('2026-01-15T10:00:00.000Z');

const nextWeekly = RecurringExpenseEngine.calculateNextOccurrence(RECURRING_FREQUENCIES.WEEKLY, baseDate);
assert.strictEqual(new Date(nextWeekly).getDate(), 22, 'Weekly advances by 7 days');

const nextMonthly = RecurringExpenseEngine.calculateNextOccurrence(RECURRING_FREQUENCIES.MONTHLY, baseDate);
assert.strictEqual(new Date(nextMonthly).getMonth(), 1, 'Monthly advances by 1 month (Feb)');

const nextQuarterly = RecurringExpenseEngine.calculateNextOccurrence(RECURRING_FREQUENCIES.QUARTERLY, baseDate);
assert.strictEqual(new Date(nextQuarterly).getMonth(), 3, 'Quarterly advances by 3 months (April)');

const nextAnnual = RecurringExpenseEngine.calculateNextOccurrence(RECURRING_FREQUENCIES.ANNUALLY, baseDate);
assert.strictEqual(new Date(nextAnnual).getFullYear(), 2027, 'Annually advances by 1 year (2027)');
console.log('✓ Invariant 1: All recurring cadence intervals calculate accurately');

// 2. Due Date Check
const template = {
    id: 'tmpl_wifi',
    groupId: 'grp_home',
    title: 'ACT Fibernet 300 Mbps',
    totalAmountPaise: 150000n,
    frequency: RECURRING_FREQUENCIES.MONTHLY,
    status: 'ACTIVE',
    nextOccurrenceDate: '2026-02-01T00:00:00.000Z',
    defaultPayerMemberId: 'm_ravi'
};

assert.strictEqual(RecurringExpenseEngine.isOccurrenceDue(template, '2026-01-25'), false, 'Not due before nextOccurrenceDate');
assert.strictEqual(RecurringExpenseEngine.isOccurrenceDue(template, '2026-02-01'), true, 'Due on nextOccurrenceDate');
assert.strictEqual(RecurringExpenseEngine.isOccurrenceDue(template, '2026-02-05'), true, 'Due after nextOccurrenceDate');
console.log('✓ Invariant 2: Template due evaluation respects target dates');

// 3. Occurrence Generation
const members = [
    { id: 'm_ravi', displayNameSnapshot: 'Ravi' },
    { id: 'm_priya', displayNameSnapshot: 'Priya' },
    { id: 'm_amit', displayNameSnapshot: 'Amit' }
];

const gen1 = RecurringExpenseEngine.generateOccurrence(template, members, '2026-02-01T09:00:00.000Z');
const exp1 = gen1.expense;
const updatedTmpl = gen1.updatedTemplate;

assert.strictEqual(exp1.totalAmountPaise, 150000n, 'Expense amount matches template (₹1,500)');
assert.strictEqual(exp1.payments[0].memberId, 'm_ravi', 'Default payer assigned');
assert.strictEqual(exp1.shares.length, 3, 'Split equally among 3 members');
assert.strictEqual(exp1.shares[0].amountPaise, 50000n, 'Each owes ₹500');
assert.strictEqual(exp1.source, 'RECURRING_TEMPLATE');

// Template advanced
assert.ok(updatedTmpl.lastGeneratedDate.includes('2026-02-01'), 'lastGeneratedDate set');
assert.ok(new Date(updatedTmpl.nextOccurrenceDate) > new Date('2026-02-01'), 'nextOccurrenceDate advanced to March');
console.log('✓ Invariant 3: Generated occurrence has valid shares and advances template schedule');

// 4. Duplicate Protection (Deterministic Idempotency Key)
const gen2 = RecurringExpenseEngine.generateOccurrence(template, members, '2026-02-01T15:00:00.000Z');
assert.strictEqual(gen1.expense.idempotencyKey, gen2.expense.idempotencyKey, 'Same date generates identical idempotencyKey');
assert.strictEqual(gen1.expense.id, gen2.expense.id, 'Deterministic expense ID prevents storage duplication');
console.log('✓ Invariant 4: Duplicate occurrence generation prevented via stable idempotency keys');

console.log('✅ SC-08 PASSED: All recurring engine checks verified.');
