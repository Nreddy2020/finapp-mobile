import assert from 'node:assert/strict';
import { generateIntelligentSchedule, getEnergyMultiplierAt, getAverageEnergyMultiplier } from '../../services/time/schedulingEngine.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }

const today = '2026-09-12';

await test('Energy curve function returns valid multipliers and blocks sleep periods', async () => {
    assert.equal(getEnergyMultiplierAt('02:00'), 0.00); // Sleep
    assert.equal(getEnergyMultiplierAt('09:00'), 0.90); // Morning deep work
    assert.equal(getEnergyMultiplierAt('14:00'), 0.65); // Afternoon practice
    assert.equal(getEnergyMultiplierAt('19:00'), 0.45); // Evening revision
    assert.equal(getEnergyMultiplierAt('23:00'), 0.00); // Night wind-down
});

await test('Greedy assignment matches high-difficulty tasks to morning high-energy slots', async () => {
    const hardTask = { id: 'math-proof', title: 'Advanced Calculus', estimatedMinutes: 60, cognitiveDifficulty: 0.90, importance: 0.9 };
    const easyTask = { id: 'read-notes', title: 'Review Slides', estimatedMinutes: 60, cognitiveDifficulty: 0.35, importance: 0.4 };

    const plan = generateIntelligentSchedule({
        tasks: [easyTask, hardTask], // Provide in reverse order
        date: today,
        dailyCapacityMinutes: 300
    });

    assert.equal(plan.scheduledBlocks.length, 2);
    const scheduledHard = plan.scheduledBlocks.find(b => b.taskRef.id === 'math-proof');
    const scheduledEasy = plan.scheduledBlocks.find(b => b.taskRef.id === 'read-notes');

    // Hard task (priority higher) should be placed in the 07:00 slot (energy 0.90)
    assert.equal(scheduledHard.startUtc, `${today}T07:00:00.000Z`);
    assert.equal(scheduledHard.energyMultiplier, 0.90);
});

await test('Generated blocks never overlap with each other or existing blocks', async () => {
    const existing = [
        { id: 'ext-1', startUtc: `${today}T08:00:00.000Z`, endUtc: `${today}T09:00:00.000Z` }
    ];

    const tasks = [
        { id: 't1', title: 'Task 1', estimatedMinutes: 60, importance: 0.8 },
        { id: 't2', title: 'Task 2', estimatedMinutes: 60, importance: 0.7 },
        { id: 't3', title: 'Task 3', estimatedMinutes: 60, importance: 0.6 }
    ];

    const plan = generateIntelligentSchedule({
        tasks,
        date: today,
        existingBlocks: existing,
        dailyCapacityMinutes: 300
    });

    const allBlocks = [...existing, ...plan.scheduledBlocks].sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));

    for (let i = 0; i < allBlocks.length - 1; i++) {
        const currentEnd = Date.parse(allBlocks[i].endUtc);
        const nextStart = Date.parse(allBlocks[i + 1].startUtc);
        assert.ok(currentEnd <= nextStart, `Overlap detected between ${allBlocks[i].id} and ${allBlocks[i + 1].id}`);
    }
});

await test('Capacity guard routes overflow tasks to backlog without scheduling them', async () => {
    const tasks = [
        { id: 't1', title: 'Task 1', estimatedMinutes: 90, importance: 0.9 },
        { id: 't2', title: 'Task 2', estimatedMinutes: 60, importance: 0.8 },
        { id: 't3', title: 'Task 3', estimatedMinutes: 60, importance: 0.7 }
    ];

    // Capacity is only 120 minutes: t1 (90m) fits, t2 (60m) overflows!
    const plan = generateIntelligentSchedule({
        tasks,
        date: today,
        dailyCapacityMinutes: 120
    });

    assert.equal(plan.scheduledBlocks.length, 1);
    assert.equal(plan.scheduledBlocks[0].taskRef.id, 't1');
    assert.equal(plan.overflowBacklog.length, 2);
    assert.equal(plan.overflowBacklog[0].task.id, 't2');
    assert.equal(plan.overflowBacklog[0].reason, 'CAPACITY_EXCEEDED');
});

await test('Timezone-aware scheduling converts local hours to accurate UTC timestamps', async () => {
    // User in Asia/Kolkata (UTC + 05:30)
    const task = { id: 'morning-run', title: 'Morning Math', estimatedMinutes: 60, importance: 0.9, cognitiveDifficulty: 0.9 };
    const plan = generateIntelligentSchedule({
        tasks: [task],
        date: today,
        timeZone: 'Asia/Kolkata',
        dailyCapacityMinutes: 300
    });

    assert.equal(plan.scheduledBlocks.length, 1);
    const b = plan.scheduledBlocks[0];
    assert.equal(b.timeZone, 'Asia/Kolkata');
    // Local start is 07:00 IST -> 07:00 - 05:30 = 01:30 UTC!
    assert.equal(b.startUtc, `${today}T01:30:00.000Z`);
    assert.equal(b.endUtc, `${today}T02:30:00.000Z`);
});

await test('Energy-boundary scanning selects peak-fit boundary within wide free interval', async () => {
    // Existing block fills morning until 12:30. Next block starts at 18:00.
    // Wide free interval: 12:30 to 18:00.
    // 12:30 - 13:00 has lunch energy (0.20)
    // 13:00 - 17:00 has afternoon practice energy (0.65)
    const existing = [
        { id: 'morning-block', startUtc: `${today}T07:00:00.000Z`, endUtc: `${today}T12:30:00.000Z` },
        { id: 'evening-block', startUtc: `${today}T18:00:00.000Z`, endUtc: `${today}T21:30:00.000Z` }
    ];

    const afternoonTask = {
        id: 'coding-practice',
        title: 'Coding Practice',
        estimatedMinutes: 60,
        cognitiveDifficulty: 0.65, // Exactly matches afternoon energy 0.65!
        importance: 0.8
    };

    const plan = generateIntelligentSchedule({
        tasks: [afternoonTask],
        date: today,
        existingBlocks: existing,
        dailyCapacityMinutes: 300
    });

    assert.equal(plan.scheduledBlocks.length, 1);
    const b = plan.scheduledBlocks[0];
    // Must choose 13:00 (afternoon boundary) where energy is 0.65, rather than 12:30 (lunch energy 0.20)!
    assert.equal(b.startUtc, `${today}T13:00:00.000Z`);
    assert.equal(b.energyMultiplier, 0.65);
});

await test('getAverageEnergyMultiplier computes duration-weighted average energy across segment boundaries', async () => {
    // 11:00 to 12:30 (90 min):
    // 11:00 to 12:00 (60m) at morning deep work (0.90) = 54
    // 12:00 to 12:30 (30m) at lunch dip (0.20) = 6
    // Weighted average = (54 + 6) / 90 = 60 / 90 = 0.6667
    const avg = getAverageEnergyMultiplier(660, 90);
    assert.equal(avg, 0.6667);
});

console.log(`ALL ${count} SCHEDULING ENGINE TESTS PASSED`);
