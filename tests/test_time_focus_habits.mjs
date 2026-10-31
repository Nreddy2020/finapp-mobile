/**
 * tests/test_time_focus_habits.mjs
 * Time Management: restart-safe focus sessions and honest habit streaks.
 */
import assert from 'node:assert/strict';
import { clearAllData, StorageService } from '../services/storage.js';
import { FocusService, elapsedMinutes, isStale, reviewSummary, FOCUS_STORAGE_KEY } from '../services/time/focusService.js';
import { HabitsService, isDue, streak, completionRate, dueToday } from '../services/time/habitsService.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();
const T = m => new Date(Date.UTC(2026, 8, 10, 4, m)).toISOString(); // 2026-09-10 04:mm UTC = 09:mm IST

await test('Start, pause, resume, stop derive elapsed time from timestamps only', async () => {
    await FocusService.start('task-1', 25, T(0));
    await assert.rejects(FocusService.start('task-2', 25, T(1)), /already active/);
    await FocusService.pause(T(10));
    let s = await FocusService.current();
    assert.equal(s.state, 'paused'); assert.equal(elapsedMinutes(s, T(30)), 10, 'paused time is excluded');
    await FocusService.resume(T(30));
    s = await FocusService.current(); assert.equal(elapsedMinutes(s, T(45)), 25);
    const doc = await FocusService.stop({ note: 'Done', now: T(45) });
    assert.equal(doc.sessions[0].state, 'completed'); assert.equal(await FocusService.current(), null);
});
await test('Repeated pause/resume/stop taps are idempotent', async () => {
    await FocusService.start('task-1', 10, T(60));
    await FocusService.pause(T(61)); const a = await FocusService.load(); await FocusService.pause(T(62)); const b = await FocusService.load();
    assert.deepEqual(a, b);
    await FocusService.stop({ now: T(70) }); const c = await FocusService.load(); await FocusService.stop({ now: T(80) }); assert.deepEqual(c, await FocusService.load());
});
await test('Stale open session is flagged and reconciled to a user-chosen end, never asserted as work', async () => {
    await FocusService.start('task-3', 25, T(0));
    const s = await FocusService.current();
    assert.equal(isStale(s, T(60)), false); assert.equal(isStale(s, new Date(Date.UTC(2026, 8, 11, 4, 0)).toISOString()), true);
    await assert.rejects(FocusService.reconcile({ endUtc: T(-5), now: T(120) }), /after the session started/);
    await FocusService.reconcile({ endUtc: T(20), now: new Date(Date.UTC(2026, 8, 11, 4, 0)).toISOString() });
    const doc = await FocusService.load();
    assert.equal(doc.sessions[0].state, 'completed'); assert.equal(elapsedMinutes(doc.sessions[0]), 20);
});
await test('Review splits a session across local midnight exactly', async () => {
    await FocusService.start('task-4', 60, '2026-09-10T18:00:00.000Z'); // 23:30 IST
    await FocusService.stop({ now: '2026-09-10T19:00:00.000Z' }); // 00:30 IST next day
    const doc = await FocusService.load();
    const review = reviewSummary(doc.sessions, 'Asia/Kolkata', ['2026-09-10', '2026-09-11']);
    assert.equal(review.byDate['2026-09-10'], 25 + 1 + 20 + 30, 'paused minutes never count'); assert.equal(review.byDate['2026-09-11'], 30); assert.equal(review.byTask['task-4'], 60);
});
await test('Corrupt focus history and two active sessions are rejected without overwrite', async () => {
    const good = await StorageService.load(FOCUS_STORAGE_KEY);
    await StorageService.save(FOCUS_STORAGE_KEY, { version: 1, sessions: [{ id: 'a', state: 'running', segments: [], taskRef: { domain: 'todo', id: 1 } }, { id: 'b', state: 'paused', segments: [], taskRef: { domain: 'todo', id: 1 } }] });
    await assert.rejects(FocusService.start('x', 5), /more than one active/);
    await StorageService.save(FOCUS_STORAGE_KEY, good);
});
await test('Habits: due days, check-ins, streaks and completion rate', async () => {
    let doc = await HabitsService.add({ title: 'Walk 20 minutes', schedule: { type: 'weekdays' }, startDate: '2026-08-31' });
    const h = doc.habits[0];
    assert.equal(isDue(h, '2026-09-05'), false, 'Saturday not due'); assert.equal(isDue(h, '2026-09-07'), true);
    for (const d of ['2026-09-07', '2026-09-08', '2026-09-09']) doc = await HabitsService.checkin(h.id, d);
    assert.equal(streak(doc.habits[0], '2026-09-10'), 3, 'today not yet done still counts previous run');
    assert.equal(streak(doc.habits[0], '2026-09-11'), 0, 'a missed due day breaks the streak');
    doc = await HabitsService.checkin(h.id, '2026-09-10');
    assert.equal(streak(doc.habits[0], '2026-09-10'), 4);
    assert.equal(completionRate(doc.habits[0], ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10', '2026-09-11', '2026-09-12']), 80);
    doc = await HabitsService.checkin(h.id, '2026-09-10', -1);
    assert.equal(doc.habits[0].checkins['2026-09-10'], undefined);
    await assert.rejects(HabitsService.checkin(h.id, '2099-01-01'), /future/);
    await assert.rejects(HabitsService.add({ title: 'x', schedule: { type: 'custom', days: [] } }), /at least one day/);
    assert.equal(dueToday(doc.habits, '2026-09-12').length, 0);
});
console.log(count + ' focus and habit cases passed using fixture storage only.');
