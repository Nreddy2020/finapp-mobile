import assert from 'node:assert/strict';
import { calculatePriorityScore, rankTasks, PRIORITY_TIERS } from '../../services/time/priorityEngine.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }

const T0 = '2026-09-12T10:00:00.000Z';

await test('Score is strictly bounded in [0, 100] across extreme inputs', async () => {
    const minTask = { importance: 0, cognitiveDifficulty: 0, downstreamTaskCount: 0 };
    const maxTask = { dueDate: '2026-09-12T09:59:00.000Z', importance: 1, cognitiveDifficulty: 1, downstreamTaskCount: 10, goalId: 'goal-1', isCoreGoal: true };
    
    const minScore = calculatePriorityScore(minTask, { now: T0 });
    const maxScore = calculatePriorityScore(maxTask, { now: T0 });

    assert.ok(minScore.score >= 0 && minScore.score <= 100, `Min score ${minScore.score} out of bounds`);
    assert.ok(maxScore.score >= 0 && maxScore.score <= 100, `Max score ${maxScore.score} out of bounds`);
    assert.equal(maxScore.score, 100);
});

await test('Overdue tasks never return NaN and outrank identical not-yet-due tasks', async () => {
    const dueTomorrow = { id: 1, dueDate: '2026-09-13T10:00:00.000Z', importance: 0.8, cognitiveDifficulty: 0.7 };
    const overdue1Day = { id: 2, dueDate: '2026-09-11T10:00:00.000Z', importance: 0.8, cognitiveDifficulty: 0.7 };
    const overdue4Days = { id: 3, dueDate: '2026-09-08T10:00:00.000Z', importance: 0.8, cognitiveDifficulty: 0.7 };
    const overdue10Days = { id: 4, dueDate: '2026-09-02T10:00:00.000Z', importance: 0.8, cognitiveDifficulty: 0.7 };

    const scoreDue = calculatePriorityScore(dueTomorrow, { now: T0 });
    const scoreOver1 = calculatePriorityScore(overdue1Day, { now: T0 });
    const scoreOver4 = calculatePriorityScore(overdue4Days, { now: T0 });
    const scoreOver10 = calculatePriorityScore(overdue10Days, { now: T0 });

    assert.equal(Number.isNaN(scoreOver1.score), false);
    assert.equal(Number.isNaN(scoreOver4.score), false);
    assert.ok(scoreOver1.score >= scoreDue.score, '1-day overdue should score at least as high as due tomorrow');
    assert.ok(scoreOver4.score >= scoreOver1.score, '4-day overdue should receive the bounded increment over 1-day overdue');
    assert.equal(scoreOver4.normalizedFactors.urgency, 1.20, '4-day overdue urgency must saturate at exactly 1.20');
    assert.equal(scoreOver10.normalizedFactors.urgency, 1.20, '10-day overdue urgency must saturate at exactly 1.20');
    assert.equal(scoreOver4.score, scoreOver10.score, '4-day and 10-day overdue scores must be identical due to saturation');
});

await test('Intrinsic difficulty is independent of duration and calibration factors', async () => {
    const shortProof = { title: 'Math proof', cognitiveDifficulty: 0.9, estimatedMinutes: 15 };
    const longCopying = { title: 'Copy notes', cognitiveDifficulty: 0.2, estimatedMinutes: 180 };

    const proofEval = calculatePriorityScore(shortProof, { now: T0 });
    const copyEval = calculatePriorityScore(longCopying, { now: T0 });

    assert.ok(proofEval.breakdown.difficulty > copyEval.breakdown.difficulty, 'Proof difficulty component must exceed copying despite shorter duration');
    assert.equal(proofEval.breakdown.difficulty, 18); // 20 * 0.9 = 18
    assert.equal(copyEval.breakdown.difficulty, 4);   // 20 * 0.2 = 4
});

await test('Breakdown factors sum accurately and map to correct tiers with secondary goal 0.50', async () => {
    const task = {
        dueDate: '2026-09-12T10:00:00.000Z', // U = 1.0 (due now) -> 35
        importance: 1.0,                     // I = 1.0 -> 25
        cognitiveDifficulty: 0.8,            // D = 0.8 -> 16
        downstreamTaskCount: 4,              // C = 1.0 -> 10
        goalId: 'g1', isCoreGoal: false      // G = 0.5 -> 5
    };
    const res = calculatePriorityScore(task, { now: T0 });
    assert.equal(res.score, 91);
    assert.equal(res.tier, PRIORITY_TIERS.URGENT);
    assert.equal(res.breakdown.urgency, 35);
    assert.equal(res.breakdown.importance, 25);
    assert.equal(res.breakdown.difficulty, 16);
    assert.equal(res.breakdown.dependency, 10);
    assert.equal(res.breakdown.goalRelevance, 5);
    const sumBreakdown = Object.values(res.breakdown).reduce((a, b) => a + b, 0);
    assert.equal(sumBreakdown, res.score, 'Breakdown sum must exactly equal score');
});

await test('Breakdown reconciliation: sum of breakdown equals score unconditionally across edge cases and random inputs', async () => {
    // 1. Overdue maxed task (raw sum > 100, score clamped to 100)
    const overdueMax = {
        dueDate: '2026-09-01T10:00:00.000Z', // Overdue > 4 days -> U = 1.20 (42 pts)
        importance: 1.0,                     // 25 pts
        cognitiveDifficulty: 1.0,            // 20 pts
        downstreamTaskCount: 4,              // 10 pts
        goalId: 'g1', isCoreGoal: true       // 10 pts
        // Total raw = 107
    };
    const maxRes = calculatePriorityScore(overdueMax, { now: T0 });
    assert.equal(maxRes.score, 100);
    const maxSum = Object.values(maxRes.breakdown).reduce((a, b) => a + b, 0);
    assert.equal(maxSum, 100, 'Overdue maxed task breakdown must sum to 100');

    // 2. Zero-score task
    const zeroTask = { importance: 0, cognitiveDifficulty: 0, downstreamTaskCount: 0 };
    const zeroRes = calculatePriorityScore(zeroTask, { now: T0 });
    const zeroSum = Object.values(zeroRes.breakdown).reduce((a, b) => a + b, 0);
    assert.equal(zeroSum, zeroRes.score, 'Zero task breakdown must sum to score');

    // 3. Property test: 50 arbitrary variations with fractional inputs
    for (let i = 0; i < 50; i++) {
        const randTask = {
            importance: Math.random(),
            cognitiveDifficulty: Math.random(),
            downstreamTaskCount: Math.floor(Math.random() * 6),
            dueDate: Math.random() > 0.3 ? '2026-09-12T10:00:00.000Z' : null,
            goalId: Math.random() > 0.5 ? 'g-rand' : null,
            isCoreGoal: Math.random() > 0.5
        };
        const r = calculatePriorityScore(randTask, { now: T0 });
        const sum = Object.values(r.breakdown).reduce((a, b) => a + b, 0);
        assert.equal(sum, r.score, `Invariant violation: breakdown sum (${sum}) !== score (${r.score})`);
    }
});

await test('calculatePriorityScore throws on invalid now timestamp', async () => {
    const task = { importance: 0.5 };
    assert.throws(() => {
        calculatePriorityScore(task, { now: 'invalid-date-string' });
    }, /Invalid 'now' timestamp/);
});

await test('rankTasks orders by score descending with deterministic tiebreaker', async () => {
    const t1 = { id: 'task-c', importance: 0.4, dueDate: '2026-09-15T10:00:00.000Z' };
    const t2 = { id: 'task-a', importance: 0.9, dueDate: '2026-09-12T12:00:00.000Z' };
    const t3 = { id: 'task-b', importance: 0.9, dueDate: '2026-09-12T12:00:00.000Z' };

    const ranked = rankTasks([t1, t2, t3], { now: T0 });
    assert.equal(ranked[0].id, 'task-a'); // Equal score, equal deadline -> ID tiebreaker 'task-a' < 'task-b'
    assert.equal(ranked[1].id, 'task-b');
    assert.equal(ranked[2].id, 'task-c');
});

console.log(`ALL ${count} PRIORITY ENGINE TESTS PASSED`);
