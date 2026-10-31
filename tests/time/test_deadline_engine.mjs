import assert from 'node:assert/strict';
import { calculateDeadlinePace, DEADLINE_STATUS } from '../../services/time/deadlineEngine.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }

await test('Completed goal short-circuits to COMPLETED with 0 pace and 0 extension', async () => {
    const result = calculateDeadlinePace({
        totalRequiredMinutes: 300,
        completedMinutes: 350,
        targetDate: '2026-09-20',
        currentDate: '2026-09-12'
    });
    assert.equal(result.status, DEADLINE_STATUS.COMPLETED);
    assert.equal(result.remainingMinutes, 0);
    assert.equal(result.standardPaceMinutesPerDay, 0);
    assert.equal(result.recommendedExtensionDays, 0);
    assert.equal(result.isPaceFeasible, true);
});

await test('Zero remaining days or zero capacity guards against division by zero', async () => {
    // Current date is after target date (deadline already passed)
    const resultPast = calculateDeadlinePace({
        totalRequiredMinutes: 120,
        completedMinutes: 0,
        targetDate: '2026-09-10',
        currentDate: '2026-09-12',
        dailyCapacityMinutes: 60
    });
    assert.equal(resultPast.status, DEADLINE_STATUS.IMMEDIATE_DEFICIT);
    assert.equal(Number.isFinite(resultPast.standardPaceMinutesPerDay), true);
    assert.equal(resultPast.isPaceFeasible, false);
    assert.equal(resultPast.recommendedExtensionDays, 2); // 120 / 60 = 2 days

    // Future deadline, but all remaining days have C(d) = 0 (all rest days)
    const resultAllZero = calculateDeadlinePace({
        totalRequiredMinutes: 180,
        completedMinutes: 0,
        targetDate: '2026-09-14',
        currentDate: '2026-09-12',
        dailyCapacityMinutes: 60,
        dailyAvailabilityCoefficients: {
            '2026-09-12': 0.0,
            '2026-09-13': 0.0,
            '2026-09-14': 0.0
        }
    });
    assert.equal(resultAllZero.status, DEADLINE_STATUS.IMMEDIATE_DEFICIT);
    assert.equal(Number.isFinite(resultAllZero.standardPaceMinutesPerDay), true);
    assert.equal(resultAllZero.isPaceFeasible, false);
    assert.equal(resultAllZero.recommendedExtensionDays, 3); // 180 / 60 = 3 days
});

await test('Standardized pace scales day-specific targets by availability coefficient C(d)', async () => {
    // 3 days: Day 1 (C=1.0), Day 2 (C=1.0), Day 3 (C=0.5). Sum C = 2.5
    // Total remaining = 200 min. Standard pace = 200 / 2.5 = 80 min/day
    const result = calculateDeadlinePace({
        totalRequiredMinutes: 200,
        completedMinutes: 0,
        targetDate: '2026-09-14',
        currentDate: '2026-09-12',
        dailyAvailabilityCoefficients: {
            '2026-09-12': 1.0,
            '2026-09-13': 1.0,
            '2026-09-14': 0.5
        }
    });

    assert.equal(result.standardPaceMinutesPerDay, 80);
    assert.equal(result.dailyAllocations['2026-09-12'], 80);
    assert.equal(result.dailyAllocations['2026-09-13'], 80);
    assert.equal(result.dailyAllocations['2026-09-14'], 40); // 80 * 0.5 = 40
});

await test('Missed day recalculates higher pace without throwing errors', async () => {
    // Target: 240 min over 4 days (Day 1..4, all C=1.0) -> 60 min/day
    const initial = calculateDeadlinePace({
        totalRequiredMinutes: 240,
        completedMinutes: 0,
        targetDate: '2026-09-15',
        currentDate: '2026-09-12',
        dailyAvailabilityCoefficients: { '2026-09-12': 1, '2026-09-13': 1, '2026-09-14': 1, '2026-09-15': 1 }
    });
    assert.equal(initial.standardPaceMinutesPerDay, 60);

    // After missing Day 1 (0 min completed, current date advances to 2026-09-13)
    // 240 min over 3 days -> 80 min/day (1h 20m/day)
    const afterMissedDay = calculateDeadlinePace({
        totalRequiredMinutes: 240,
        completedMinutes: 0,
        targetDate: '2026-09-15',
        currentDate: '2026-09-13',
        dailyAvailabilityCoefficients: { '2026-09-13': 1, '2026-09-14': 1, '2026-09-15': 1 }
    });
    assert.equal(afterMissedDay.standardPaceMinutesPerDay, 80);
    assert.equal(afterMissedDay.status, DEADLINE_STATUS.ON_TRACK);
});

await test('Unrealistic pace triggers infeasibility and non-negative recommended extension', async () => {
    // 1000 min needed over 1 day with 120 min capacity. 1.5 * 120 = 180 min max feasible.
    const result = calculateDeadlinePace({
        totalRequiredMinutes: 1000,
        completedMinutes: 0,
        targetDate: '2026-09-12',
        currentDate: '2026-09-12',
        dailyCapacityMinutes: 120,
        dailyAvailabilityCoefficients: { '2026-09-12': 1.0 }
    });

    assert.equal(result.isPaceFeasible, false);
    assert.equal(result.status, DEADLINE_STATUS.UNREALISTIC_PACE);
    // Deficit = 1000 - 180 = 820 min. Extension = ceil(820 / 120) = 7 days
    assert.equal(result.recommendedExtensionDays, 7);
});

console.log(`ALL ${count} DEADLINE ENGINE TESTS PASSED`);
