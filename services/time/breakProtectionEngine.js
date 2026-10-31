/**
 * services/time/breakProtectionEngine.js
 *
 * Break protection and burnout defense engine.
 * Inspects timeline density over half-open [start, end) blocks.
 *
 * Key Invariants:
 * - Unified 15-minute gap threshold: gaps < 15m are treated as continuous strain.
 * - Trigger: cumulative work >= 150 min (2.5 hours) with no gap >= 15 min.
 * - Fixed blocks (`isFixed: true`) NEVER move.
 * - End-of-day overflow handling: trailing blocks pushed past daily cutoff
 *   are either truncated (if >= 50% fits) or returned to the backlog.
 */

import { localDateAt, resolveLocalTime } from './plannerContracts.js';

export const BREAK_CONFIG = {
    STRAIN_THRESHOLD_MINUTES: 150, // 2.5 hours continuous
    MIN_RECOVERY_GAP_MINUTES: 15,  // Threshold that resets the continuous accumulator
    DEFAULT_BREAK_DURATION_MINUTES: 15,
    DEFAULT_BEDTIME_CUTOFF: '21:30' // 9:30 PM local cutoff
};

/**
 * Inspects a set of chronologically sorted blocks for burnout risk.
 */
export function inspectBreakHealth(blocks = [], {
    strainThreshold = BREAK_CONFIG.STRAIN_THRESHOLD_MINUTES,
    gapThreshold = BREAK_CONFIG.MIN_RECOVERY_GAP_MINUTES
} = {}) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
        return { hasRisk: false, continuousMinutes: 0, warning: null, suggestedBreakStartUtc: null };
    }

    const sorted = [...blocks].sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
    
    let currentStreakMinutes = 0;
    let maxStreakMinutes = 0;
    let streakStartUtc = null;
    let suggestedBreakStartUtc = null;

    for (let i = 0; i < sorted.length; i++) {
        const b = sorted[i];
        const startMs = Date.parse(b.startUtc);
        const endMs = Date.parse(b.endUtc);
        const blockDurationMinutes = Math.max(0, Math.round((endMs - startMs) / 60000));

        if (i === 0) {
            currentStreakMinutes = blockDurationMinutes;
            streakStartUtc = b.startUtc;
        } else {
            const prevEndMs = Date.parse(sorted[i - 1].endUtc);
            const gapMinutes = Math.round((startMs - prevEndMs) / 60000);

            if (gapMinutes >= gapThreshold) {
                // Gap >= 15 min resets the continuous accumulator
                currentStreakMinutes = blockDurationMinutes;
                streakStartUtc = b.startUtc;
            } else {
                // Gap < 15 min fails to provide recovery; work duration continues to accumulate (gap is not work)
                currentStreakMinutes += blockDurationMinutes;
            }
        }

        if (currentStreakMinutes > maxStreakMinutes) {
            maxStreakMinutes = currentStreakMinutes;
        }

        if (currentStreakMinutes >= strainThreshold && !suggestedBreakStartUtc) {
            // Suggest break at the end of this block or halfway through
            suggestedBreakStartUtc = b.endUtc;
        }
    }

    const hasRisk = maxStreakMinutes >= strainThreshold;
    const warning = hasRisk 
        ? `${Math.floor(maxStreakMinutes / 60)}h ${maxStreakMinutes % 60}m continuous block detected without a 15m recovery gap.`
        : null;

    return {
        hasRisk,
        continuousMinutes: maxStreakMinutes,
        warning,
        suggestedBreakStartUtc
    };
}

/**
 * Asserts that no two blocks in the collection have overlapping intervals.
 * Invariant: for every pair (a, b) where a.start <= b.start, a.end <= b.start.
 */
export function assertNoOverlaps(blocks = []) {
    const sorted = [...blocks].sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
    for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i];
        const b = sorted[i + 1];
        const aEnd = Date.parse(a.endUtc);
        const bStart = Date.parse(b.startUtc);
        if (aEnd > bStart) {
            throw new Error(`Interval collision detected: '${a.title || a.id}' [${a.startUtc} - ${a.endUtc}] overlaps '${b.title || b.id}' [${b.startUtc} - ${b.endUtc}]`);
        }
    }
    return true;
}

/**
 * Inserts a recovery break and ripples subsequent non-fixed blocks forward.
 * Guarantees:
 * - Fixed blocks NEVER move.
 * - Recovery break never collides with fixed blocks (seeks earliest free slot >= breakStartUtc).
 * - Shifted movable blocks never overlap fixed blocks (fixed block start acts as an overflow boundary).
 * - Movable blocks straddling breakStartUtc are cleanly split across the break.
 * - Final schedule strictly satisfies assertNoOverlaps.
 */
export function insertRecoveryBreak(blocks = [], {
    breakStartUtc,
    breakDurationMinutes = BREAK_CONFIG.DEFAULT_BREAK_DURATION_MINUTES,
    cutoffUtc = null,
    timeZone = null,
    makeBreakId = () => `break-${Date.now()}`
} = {}) {
    if (!breakStartUtc) throw new Error('breakStartUtc is required to insert a recovery break.');

    const sorted = [...blocks].sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
    const fixedBlocks = sorted.filter(b => b.isFixed).sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));
    const zone = timeZone || blocks.find(b => b.timeZone)?.timeZone || 'UTC';

    // Default cutoff to local bedtime cutoff in the appropriate timezone
    let cutoffMs = Infinity;
    if (cutoffUtc) {
        cutoffMs = Date.parse(cutoffUtc);
    } else if (BREAK_CONFIG.DEFAULT_BEDTIME_CUTOFF) {
        const breakStartMs = Date.parse(breakStartUtc);
        const localDate = localDateAt(breakStartMs, zone);
        const cutoffIso = resolveLocalTime(localDate, BREAK_CONFIG.DEFAULT_BEDTIME_CUTOFF, zone);
        cutoffMs = Date.parse(cutoffIso);
    }

    // 1. Resolve break position so it never overlaps any fixed block
    let breakStartMs = Date.parse(breakStartUtc);
    const breakDurationMs = breakDurationMinutes * 60000;
    let breakEndMs = breakStartMs + breakDurationMs;

    let breakCollided = true;
    while (breakCollided) {
        breakCollided = false;
        for (const fb of fixedBlocks) {
            const fbStart = Date.parse(fb.startUtc);
            const fbEnd = Date.parse(fb.endUtc);
            // Half-open interval overlap check: max(start) < min(end)
            if (Math.max(breakStartMs, fbStart) < Math.min(breakEndMs, fbEnd)) {
                // Collision! Move break to start at the end of this fixed block
                breakStartMs = fbEnd;
                breakEndMs = breakStartMs + breakDurationMs;
                breakCollided = true;
                break;
            }
        }
    }

    const finalBreakStartUtc = new Date(breakStartMs).toISOString();
    const finalBreakEndUtc = new Date(breakEndMs).toISOString();

    const newBreakBlock = {
        id: makeBreakId(),
        isBreak: true,
        title: 'Coffee & Recovery Break',
        timeZone: zone,
        localDate: localDateAt(breakStartMs, zone),
        startUtc: finalBreakStartUtc,
        endUtc: finalBreakEndUtc,
        durationMinutes: breakDurationMinutes
    };

    const resultBlocks = [];
    const overflowedTasks = [];
    const shiftDeltaMs = breakDurationMs;

    // Helper: find nearest upcoming fixed block start at or after a given time
    const getNextFixedStart = (fromMs) => {
        for (const fb of fixedBlocks) {
            const fbStart = Date.parse(fb.startUtc);
            if (fbStart >= fromMs) return fbStart;
        }
        return Infinity;
    };

    // 2. Process all existing blocks
    for (const b of sorted) {
        const bStartMs = Date.parse(b.startUtc);
        const bEndMs = Date.parse(b.endUtc);
        const originalDurationMin = Math.max(1, Math.round((bEndMs - bStartMs) / 60000));

        // Fixed blocks NEVER move
        if (b.isFixed) {
            resultBlocks.push(b);
            continue;
        }

        // Movable blocks ending at or before breakStartMs stay where they are
        if (bEndMs <= breakStartMs) {
            resultBlocks.push(b);
            continue;
        }

        // Check if block straddles the break insertion point
        let scheduledStartMs = bStartMs;
        let scheduledDurationMin = originalDurationMin;

        if (bStartMs < breakStartMs && bEndMs > breakStartMs) {
            // Block straddles break: keep pre-break portion
            const preBreakMinutes = Math.round((breakStartMs - bStartMs) / 60000);
            if (preBreakMinutes > 0) {
                const bZone = b.timeZone || zone;
                resultBlocks.push({
                    ...b,
                    id: `${b.id}-pre`,
                    startUtc: b.startUtc,
                    endUtc: new Date(breakStartMs).toISOString(),
                    localDate: localDateAt(bStartMs, bZone),
                    timeZone: bZone,
                    durationMinutes: preBreakMinutes
                });
            }
            // Post-break portion shifts after the break
            scheduledStartMs = breakEndMs;
            scheduledDurationMin = originalDurationMin - preBreakMinutes;
            if (scheduledDurationMin <= 0) continue;
        } else {
            // Block was scheduled at or after break: shift by delta
            scheduledStartMs = Math.max(bStartMs + shiftDeltaMs, breakEndMs);
        }

        // If scheduledStart falls inside any fixed block, advance it past that fixed block
        for (const fb of fixedBlocks) {
            const fbStart = Date.parse(fb.startUtc);
            const fbEnd = Date.parse(fb.endUtc);
            if (scheduledStartMs >= fbStart && scheduledStartMs < fbEnd) {
                scheduledStartMs = fbEnd;
            }
        }

        const scheduledEndMs = scheduledStartMs + scheduledDurationMin * 60000;
        const bZone = b.timeZone || zone;

        // Upcoming boundary is the earlier of cutoff or next fixed block start
        const nextFixedStart = getNextFixedStart(scheduledStartMs);
        const effectiveBoundaryMs = Math.min(cutoffMs, nextFixedStart);

        if (scheduledEndMs > effectiveBoundaryMs) {
            const fitMinutes = Math.max(0, Math.floor((effectiveBoundaryMs - scheduledStartMs) / 60000));
            const fitRatio = fitMinutes / scheduledDurationMin;

            if (fitRatio >= 0.50 && fitMinutes >= 15) {
                // Truncate to fit boundary and record unscheduled remainder
                resultBlocks.push({
                    ...b,
                    startUtc: new Date(scheduledStartMs).toISOString(),
                    endUtc: new Date(effectiveBoundaryMs).toISOString(),
                    localDate: localDateAt(scheduledStartMs, bZone),
                    timeZone: bZone,
                    durationMinutes: fitMinutes,
                    isTruncated: true
                });
                overflowedTasks.push({
                    taskId: b.taskId || b.id,
                    title: b.title,
                    action: 'PARTIAL_TRUNCATION',
                    allocatedMinutes: fitMinutes,
                    remainingMinutes: scheduledDurationMin - fitMinutes
                });
            } else {
                // Exceeded boundary with <50% fit -> un-schedule and return to backlog
                overflowedTasks.push({
                    taskId: b.taskId || b.id,
                    title: b.title,
                    action: 'RETURN_TO_BACKLOG',
                    allocatedMinutes: 0,
                    remainingMinutes: scheduledDurationMin
                });
            }
        } else {
            resultBlocks.push({
                ...b,
                startUtc: new Date(scheduledStartMs).toISOString(),
                endUtc: new Date(scheduledEndMs).toISOString(),
                localDate: localDateAt(scheduledStartMs, bZone),
                timeZone: bZone,
                durationMinutes: scheduledDurationMin
            });
        }
    }

    resultBlocks.push(newBreakBlock);
    resultBlocks.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));

    // Guarantee non-overlap invariant across all returned blocks
    assertNoOverlaps(resultBlocks);

    return {
        blocks: resultBlocks,
        breakBlock: newBreakBlock,
        overflowedTasks
    };
}
