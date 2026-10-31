import assert from 'node:assert/strict';
import { computeTimeAnalytics } from '../../services/time/timeAnalyticsService.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }

const T = (d, h, m) => new Date(Date.UTC(2026, 8, d, h, m)).toISOString();

await test('Computes planned vs actual, completion rate, and category breakdown', async () => {
    // 2 blocks: 60m + 60m = 120m planned
    const blocks = [
        { localDate: '2026-09-08', startUtc: T(8, 9, 0), endUtc: T(8, 10, 0) },
        { localDate: '2026-09-09', startUtc: T(9, 14, 0), endUtc: T(9, 15, 0) }
    ];

    // 2 completed sessions: 60m + 30m = 90m actual
    const sessions = [
        {
            state: 'completed',
            taskRef: { id: 't1' },
            plannedMinutes: 60,
            segments: [{ startUtc: T(8, 9, 0), endUtc: T(8, 10, 0) }] // 60 min
        },
        {
            state: 'completed',
            taskRef: { id: 't2' },
            plannedMinutes: 25,
            segments: [{ startUtc: T(9, 14, 0), endUtc: T(9, 14, 30) }] // 30 min (+5m delay)
        }
    ];

    const tasksMap = {
        't1': { title: 'Algebra Homework', subject: 'Study' },
        't2': { title: 'Chemistry formulas', subject: 'Revision' }
    };

    const analytics = computeTimeAnalytics({
        sessions,
        blocks,
        timeZone: 'UTC',
        referenceDate: '2026-09-10',
        tasksMap
    });

    assert.equal(analytics.totalPlannedMinutes, 120);
    assert.equal(analytics.totalActualMinutes, 90);
    assert.equal(analytics.completionRatePercent, 75); // 90 / 120 = 75%
    assert.equal(analytics.categoryMinutes.Study, 60);
    assert.equal(analytics.categoryMinutes.Revision, 30);
    assert.equal(analytics.mostDelayedSubject, 'Chemistry formulas');
    assert.equal(analytics.maxDelayMinutes, 5);
    assert.ok(analytics.accuracyPercent > 70);
});

console.log(`ALL ${count} TIME ANALYTICS TESTS PASSED`);
