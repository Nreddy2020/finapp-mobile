import assert from 'node:assert/strict';
import { inspectBreakHealth, insertRecoveryBreak } from '../../services/time/breakProtectionEngine.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }

const mkBlock = (id, startH, startM, durationM, isFixed = false) => {
    const s = new Date(Date.UTC(2026, 8, 12, startH, startM)).toISOString();
    const e = new Date(Date.UTC(2026, 8, 12, startH, startM + durationM)).toISOString();
    return { id, startUtc: s, endUtc: e, isFixed };
};

await test('Gaps under 15 min maintain continuous strain without inflating work tally', async () => {
    // 09:00 - 10:00 (60m work)
    // 10m gap (10:00 - 10:10) -> does not reset accumulator, but is NOT counted as work
    // 10:10 - 11:10 (60m work) -> accumulator = 120m (60 + 60)
    const b1 = mkBlock('1', 9, 0, 60);
    const b2 = mkBlock('2', 10, 10, 60);
    const health1 = inspectBreakHealth([b1, b2]);
    assert.equal(health1.continuousMinutes, 120, 'Sub-15m gap must not be added to work minutes');
    assert.equal(health1.hasRisk, false); // 120m < 150m threshold

    // 60m work + 10m gap + 60m work + 10m gap + 30m work = 150m continuous work -> triggers risk!
    const b3 = mkBlock('3', 11, 20, 30);
    const health150 = inspectBreakHealth([b1, b2, b3]);
    assert.equal(health150.continuousMinutes, 150, '60m + 60m + 30m must accumulate to exactly 150m');
    assert.equal(health150.hasRisk, true, '150m continuous work must trigger burnout risk');

    // Now test a 15-minute gap: 09:00 - 10:00 (60m), 15m gap (10:00 - 10:15), 10:15 - 11:15 (60m)
    const bReset = mkBlock('reset', 10, 15, 60);
    const health2 = inspectBreakHealth([b1, bReset]);
    assert.equal(health2.continuousMinutes, 60, 'Gap >= 15 min must reset accumulator');
    assert.equal(health2.hasRisk, false);
});

await test('Continuous strain >= 150 min triggers burnout risk and suggests break point', async () => {
    // 3 blocks of 60m with 0m gaps = 180 min
    const b1 = mkBlock('1', 9, 0, 60);
    const b2 = mkBlock('2', 10, 0, 60);
    const b3 = mkBlock('3', 11, 0, 60);
    const health = inspectBreakHealth([b1, b2, b3]);

    assert.equal(health.hasRisk, true);
    assert.equal(health.continuousMinutes, 180);
    assert.ok(health.warning.includes('3h 0m continuous block detected'));
    assert.ok(health.suggestedBreakStartUtc !== null);
});

await test('Break insertion shifts movable blocks forward without moving fixed blocks', async () => {
    const b1 = mkBlock('b1', 9, 0, 60); // 09:00 - 10:00
    const fixedBlock = mkBlock('fixed', 11, 0, 60, true); // 11:00 - 12:00 (FIXED)
    const b2 = mkBlock('b2', 10, 0, 60); // 10:00 - 11:00

    const breakStart = new Date(Date.UTC(2026, 8, 12, 10, 0)).toISOString();
    const result = insertRecoveryBreak([b1, b2, fixedBlock], {
        breakStartUtc: breakStart,
        breakDurationMinutes: 15
    });

    const breakItem = result.blocks.find(b => b.isBreak);
    assert.ok(breakItem, 'Break block must be present');
    assert.equal(breakItem.startUtc, breakStart);

    // Fixed block must NOT have shifted
    const foundFixed = result.blocks.find(b => b.id === 'fixed');
    assert.equal(foundFixed.startUtc, fixedBlock.startUtc);

    // b2 was at 10:00, shifted to 10:15 and truncated at 11:00 before the fixed block (45m fit = 75%)
    const shiftedB2 = result.blocks.find(b => b.id === 'b2');
    assert.equal(shiftedB2.startUtc, new Date(Date.UTC(2026, 8, 12, 10, 15)).toISOString());
    assert.equal(shiftedB2.endUtc, fixedBlock.startUtc, 'Movable block must truncate before fixed block start');
    assert.equal(result.overflowedTasks[0].action, 'PARTIAL_TRUNCATION');
});

await test('BREAK INSERTION + FIXED COLLISION: break seeks valid free slot and preserves invariant', async () => {
    // Given: 09:00 - 10:30 movable, 10:30 - 11:00 fixed
    const movable1 = mkBlock('movable1', 9, 0, 90);
    const fixedAppt = mkBlock('fixedAppt', 10, 30, 30, true);

    // Insert recovery break at 10:30 (exact start of the fixed block!)
    const breakStart = new Date(Date.UTC(2026, 8, 12, 10, 30)).toISOString();
    const result = insertRecoveryBreak([movable1, fixedAppt], {
        breakStartUtc: breakStart,
        breakDurationMinutes: 15
    });

    // 1. Fixed block remains completely untouched
    const preservedFixed = result.blocks.find(b => b.id === 'fixedAppt');
    assert.equal(preservedFixed.startUtc, fixedAppt.startUtc);
    assert.equal(preservedFixed.endUtc, fixedAppt.endUtc);

    // 2. Break is moved to a valid recovery slot immediately following the fixed block (11:00 - 11:15)
    const breakBlock = result.blocks.find(b => b.isBreak);
    assert.ok(breakBlock, 'Break must be present');
    assert.equal(breakBlock.startUtc, fixedAppt.endUtc, 'Break must start after the fixed block');
    assert.equal(breakBlock.endUtc, new Date(Date.UTC(2026, 8, 12, 11, 15)).toISOString());

    // 3. Strict non-overlap invariant: for every pair (a, b), a.end <= b.start
    for (let i = 0; i < result.blocks.length - 1; i++) {
        const a = result.blocks[i];
        const b = result.blocks[i + 1];
        assert.ok(Date.parse(a.endUtc) <= Date.parse(b.startUtc), `Overlap detected between ${a.id} and ${b.id}`);
    }
});

await test('Movable block straddling break insertion point is cleanly split', async () => {
    // 09:00 - 11:00 movable (120m)
    const longBlock = mkBlock('deep-work', 9, 0, 120);
    // Request break at 10:00 (midway through)
    const breakStart = new Date(Date.UTC(2026, 8, 12, 10, 0)).toISOString();
    const result = insertRecoveryBreak([longBlock], {
        breakStartUtc: breakStart,
        breakDurationMinutes: 15
    });

    assert.equal(result.blocks.length, 3); // Pre-break, break, post-break
    const pre = result.blocks[0];
    const brk = result.blocks[1];
    const post = result.blocks[2];

    assert.equal(pre.endUtc, breakStart);
    assert.equal(brk.startUtc, breakStart);
    assert.equal(post.startUtc, brk.endUtc);
    assert.equal(pre.durationMinutes + post.durationMinutes, 120, 'Total work minutes preserved');
});

await test('End-of-day overflow handles truncation (>=50% fit) and backlog return (<50% fit)', async () => {
    // Cutoff at 21:30 UTC
    const cutoff = new Date(Date.UTC(2026, 8, 12, 21, 30)).toISOString();
    
    // Block from 20:30 to 21:30 (60m)
    const bTail = mkBlock('tail', 20, 30, 60);
    const breakStart = new Date(Date.UTC(2026, 8, 12, 20, 0)).toISOString();

    // Inserting 15m break pushes bTail to 20:45 - 21:45
    // From 20:45 to cutoff 21:30 is 45 min out of 60 min (75% fit) -> Should truncate to 45m!
    const res1 = insertRecoveryBreak([bTail], {
        breakStartUtc: breakStart,
        breakDurationMinutes: 15,
        cutoffUtc: cutoff
    });

    const truncated = res1.blocks.find(b => b.id === 'tail');
    assert.ok(truncated, 'Tail block should be truncated and kept');
    assert.equal(truncated.endUtc, cutoff);
    assert.equal(res1.overflowedTasks[0].action, 'PARTIAL_TRUNCATION');
    assert.equal(res1.overflowedTasks[0].remainingMinutes, 15);

    // Now test < 50% fit: block from 21:15 to 22:15 (60m). Shifted to 21:30 to 22:30 -> 0% fits!
    const bLate = mkBlock('late', 21, 15, 60);
    const res2 = insertRecoveryBreak([bLate], {
        breakStartUtc: breakStart,
        breakDurationMinutes: 15,
        cutoffUtc: cutoff
    });

    const foundLate = res2.blocks.find(b => b.id === 'late');
    assert.equal(foundLate, undefined, 'Block with < 50% fit must not be placed past cutoff');
    assert.equal(res2.overflowedTasks[0].action, 'RETURN_TO_BACKLOG');

    // Movable block sitting adjacent to a fixed event right at the cutoff
    const fixedEvening = mkBlock('fixed-night', 21, 0, 30, true); // 21:00 - 21:30 (FIXED)
    const movablePre = mkBlock('movable-pre', 20, 0, 60);         // 20:00 - 21:00 (Movable)
    const movablePost = mkBlock('movable-overflow', 21, 30, 45);  // 21:30 - 22:15 (Movable beyond cutoff)
    
    const res3 = insertRecoveryBreak([movablePre, fixedEvening, movablePost], {
        breakStartUtc: new Date(Date.UTC(2026, 8, 12, 20, 30)).toISOString(),
        breakDurationMinutes: 15,
        cutoffUtc: cutoff
    });

    const fixedStillThere = res3.blocks.find(b => b.id === 'fixed-night');
    assert.ok(fixedStillThere);
    assert.equal(fixedStillThere.startUtc, fixedEvening.startUtc, 'Fixed night block must never move');
    assert.equal(res3.overflowedTasks.length >= 1, true, 'Trailing movable block must overflow to backlog');
});

await test('Fallback bedtime cutoff resolves local calendar date in user timezone across UTC midnight boundary', async () => {
    // 2026-09-12T19:00:00.000Z is 2026-09-13 00:30:00 in Asia/Kolkata (UTC+5:30)
    const lateNightBreakStart = '2026-09-12T19:00:00.000Z';
    // Movable block: 2026-09-12T19:15:00.000Z to 20:15:00.000Z (00:45 to 01:45 IST on Sept 13)
    const bNight = {
        id: 'night-study',
        startUtc: '2026-09-12T19:15:00.000Z',
        endUtc: '2026-09-12T20:15:00.000Z',
        timeZone: 'Asia/Kolkata'
    };

    // Calling insertRecoveryBreak without explicit cutoffUtc
    const res = insertRecoveryBreak([bNight], {
        breakStartUtc: lateNightBreakStart,
        breakDurationMinutes: 15,
        timeZone: 'Asia/Kolkata'
    });

    // The bedtime cutoff for local date 2026-09-13 in Asia/Kolkata is 21:30 IST (16:00 UTC on Sept 13)
    // The shifted block ends at 20:30 UTC on Sept 12 (02:00 IST on Sept 13), well before 21:30 IST!
    // It should fit without being truncated by a stale Sept 12 UTC date
    assert.equal(res.blocks.length, 2);
    const shifted = res.blocks.find(b => b.id === 'night-study');
    assert.ok(shifted, 'Shifted block must be scheduled');
    assert.equal(shifted.isTruncated, undefined, 'Block should not be prematurely truncated by UTC date mismatch');
});

console.log(`ALL ${count} BREAK PROTECTION ENGINE TESTS PASSED`);
