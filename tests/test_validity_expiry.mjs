/**
 * tests/test_validity_expiry.mjs
 * Validities & Expiries: legacy adaptation, derived status, renewals, calendar, summary.
 */
import assert from 'node:assert/strict';
import { clearAllData, StorageService, STORAGE_KEYS } from '../services/storage.js';
import { ValidityService, statusOf, statusLabel, summary, renewalCalendar, sortByUrgency, reminderDates, normalizeItem } from '../services/validity/validityService.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();
const today = '2026-09-11';

await test('Legacy records adapt on read without a write', async () => {
    await StorageService.save(STORAGE_KEYS.VALIDITY, [{ id: 1, item: 'Old Passport', expiry_date: '2026-09-20', days_left: 3, category: 'Passport', members: ['Asha'], auto_renew: true, renewalPrice: 3500 }, { id: 2, item: 'Gym', expiry_date: 'Dec 2026', category: 'Subscription' }]);
    const before = JSON.stringify(await StorageService.load(STORAGE_KEYS.VALIDITY));
    const rows = await ValidityService.list();
    assert.equal(rows[0].title, 'Old Passport'); assert.equal(rows[0].expiryDate, '2026-09-20'); assert.equal(rows[0].holder, 'Asha'); assert.equal(rows[0].autoRenew, true); assert.equal(rows[0].renewalCost, 3500);
    assert.equal(statusOf(rows[0], today), 'expiring'); assert.equal(statusLabel(rows[0], today), '9 days left');
    assert.equal(rows[1].expiryDate, '2026-12-01');
    assert.equal(JSON.stringify(await StorageService.load(STORAGE_KEYS.VALIDITY)), before);
    assert.throws(() => normalizeItem({ id: 3 }), /could not be read/);
});
await test('Add validity and expiry items with compatibility fields written', async () => {
    await ValidityService.add({ kind: 'validity', title: 'Car insurance', category: 'Vehicle Insurance', expiryDate: '2026-09-15', renewalCost: '8,400', identifier: 'POL123456789', renewalLeadDays: 45 });
    await ValidityService.add({ kind: 'expiry', title: 'Paracetamol strip', category: 'Medicine', expiryDate: '2026-09-05', quantity: 10 });
    await ValidityService.add({ kind: 'expiry', title: 'Store voucher', category: 'Voucher / Coupon', expiryDate: '2026-10-01', value: 500 });
    const raw = await StorageService.load(STORAGE_KEYS.VALIDITY);
    const ins = raw.find(r => r.title === 'Car insurance');
    assert.equal(ins.item, 'Car insurance'); assert.equal(ins.expiry_date, '2026-09-15'); assert.equal(typeof ins.days_left, 'number'); assert.equal(ins.identifier, '••••6789');
    await assert.rejects(ValidityService.add({ title: 'Bad', issueDate: '2026-10-01', expiryDate: '2026-09-01' }), /before the issue date/);
    await assert.rejects(ValidityService.add({ title: 'Bad', kind: 'expiry', category: 'Passport' }), /category/);
});
await test('Status, urgency ordering and summary are derived at read time', async () => {
    const rows = await ValidityService.list();
    const med = rows.find(r => r.title === 'Paracetamol strip');
    assert.equal(statusOf(med, today), 'expired'); assert.equal(statusLabel(med, today), 'Expired 6 days ago');
    const order = sortByUrgency(rows, today).map(r => r.title);
    assert.equal(order[0], 'Paracetamol strip'); assert.equal(order[1], 'Car insurance');
    const s = summary(rows, today);
    assert.equal(s.expired, 1); assert.equal(s.critical, 1); assert.equal(s.expiring, 2); assert.equal(s.needsAction, 4); assert.equal(s.renewalCost30, 3500 + 8400); assert.equal(summary(rows, today, 'expiry').valueAtRisk, 500);
    assert.equal(s.next.title, 'Paracetamol strip');
});
await test('Renewal keeps history, moves expiry forward and rejects backward dates', async () => {
    const ins = (await ValidityService.list()).find(r => r.title === 'Car insurance');
    await assert.rejects(ValidityService.renew(ins.id, { newExpiryDate: '2026-09-10' }), /after the current/);
    const rows = await ValidityService.renew(ins.id, { newExpiryDate: '2027-09-15', cost: 9000, note: 'Renewed online', date: today });
    const next = rows.find(r => r.id === ins.id);
    assert.equal(next.expiryDate, '2027-09-15'); assert.equal(next.history.length, 1); assert.equal(next.history[0].previousExpiry, '2026-09-15'); assert.equal(next.renewalCost, 9000);
    assert.equal(statusOf(next, today), 'valid');
});
await test('Calendar groups by month with overdue first; reminders only in the future', async () => {
    const rows = await ValidityService.list();
    const cal = renewalCalendar(rows, today, 4);
    assert.equal(cal[0].key, 'overdue'); assert.ok(cal.some(g => g.key === '2026-09' && g.items.some(i => i.title === 'Old Passport')));
    const passport = rows.find(r => r.title === 'Old Passport');
    const reminders = reminderDates(passport, today);
    assert.deepEqual(reminders.map(r => r.daysBefore), [7, 1, 0]);
});
await test('Consume, archive and remove', async () => {
    const med = (await ValidityService.list()).find(r => r.title === 'Paracetamol strip');
    let rows = await ValidityService.consume(med.id, 10);
    assert.equal(rows.find(r => r.id === med.id).archived, true);
    rows = await ValidityService.setArchived(med.id, false);
    assert.equal(rows.find(r => r.id === med.id).archived, false);
    rows = await ValidityService.remove(med.id);
    assert.equal(rows.some(r => r.id === med.id), false);
    await assert.rejects(ValidityService.update('missing', { title: 'x' }), /no longer available/);
});
console.log(count + ' validity and expiry cases passed using fixture storage only.');
