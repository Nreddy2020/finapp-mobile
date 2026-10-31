/**
 * services/time/schedulingEngine.js
 *
 * Energy-based greedy scheduling heuristic engine.
 * Matches task difficulty to human biological circadian energy curves
 * while respecting capacity, non-overlap, and sleep boundary constraints.
 */

import { rankTasks } from './priorityEngine.js';
import { assertDate, assertZone, localDateAt, localTimeAt, resolveLocalTime } from './plannerContracts.js';

export const ENERGY_CURVE_24H = [
    { start: '00:00', end: '07:00', multiplier: 0.00, label: 'Sleep', allowed: false },
    { start: '07:00', end: '12:00', multiplier: 0.90, label: 'Morning Deep Work', allowed: true },
    { start: '12:00', end: '13:00', multiplier: 0.20, label: 'Lunch & Recharge', allowed: true },
    { start: '13:00', end: '17:00', multiplier: 0.65, label: 'Afternoon Practice', allowed: true },
    { start: '17:00', end: '18:00', multiplier: 0.30, label: 'Transition & Rest', allowed: true },
    { start: '18:00', end: '21:30', multiplier: 0.45, label: 'Evening Revision', allowed: true },
    { start: '21:30', end: '24:00', multiplier: 0.00, label: 'Night Wind-down', allowed: false }
];

export const ENERGY_SEGMENT_BOUNDARIES = [
    420,  // 07:00 Morning Deep Work (0.90)
    720,  // 12:00 Lunch & Recharge (0.20)
    780,  // 13:00 Afternoon Practice (0.65)
    1020, // 17:00 Transition & Rest (0.30)
    1080  // 18:00 Evening Revision (0.45)
];

export function getEnergyMultiplierAt(timeStr) {
    for (const seg of ENERGY_CURVE_24H) {
        if (timeStr >= seg.start && timeStr < seg.end) {
            return seg.multiplier;
        }
    }
    return 0.00;
}

function parseTimeToMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function minutesToTime(mins) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Calculates the exact duration-weighted average energy multiplier across [startMins, startMins + durationMins).
 */
export function getAverageEnergyMultiplier(startMins, durationMins) {
    if (!durationMins || durationMins <= 0) return getEnergyMultiplierAt(minutesToTime(startMins));

    const endMins = startMins + durationMins;
    let weightedSum = 0;

    for (const seg of ENERGY_CURVE_24H) {
        const segStart = parseTimeToMinutes(seg.start);
        const segEnd = parseTimeToMinutes(seg.end);

        const overlap = Math.max(0, Math.min(endMins, segEnd) - Math.max(startMins, segStart));
        if (overlap > 0) {
            weightedSum += overlap * seg.multiplier;
        }
    }

    return Number((weightedSum / durationMins).toFixed(4));
}

/**
 * Greedily assigns tasks to best-fit energy slots.
 * Features:
 * - Timezone-aware: converts local slot times to UTC using planner contracts.
 * - Energy-boundary scanning: evaluates candidate start times across all energy-segment boundaries within viable intervals.
 * - Respects sleep boundaries and daily capacity limits.
 */
export function generateIntelligentSchedule({
    tasks = [],
    date, // YYYY-MM-DD
    existingBlocks = [],
    dailyCapacityMinutes = 480,
    timeZone = 'UTC',
    makeBlockId = () => `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
}) {
    assertDate(date);
    assertZone(timeZone);

    // 1. Rank tasks by Priority Score descending
    const sortedTasks = rankTasks(tasks, { now: resolveLocalTime(date, '07:00', timeZone) });

    // 2. Build initial free slots between 07:00 (420m) and 21:30 (1290m) local time
    const windowStart = 420; // 07:00
    const windowEnd = 1290;  // 21:30
    
    // Carve out existing blocks from the available local day window
    let freeIntervals = [{ start: windowStart, end: windowEnd }];

    for (const b of existingBlocks) {
        const bStartMs = Date.parse(b.startUtc);
        const bEndMs = Date.parse(b.endUtc);
        if (!Number.isFinite(bStartMs) || !Number.isFinite(bEndMs)) continue;

        // Verify if block intersects the target local date
        const blockStartDate = localDateAt(bStartMs, timeZone);
        const blockEndDate = localDateAt(bEndMs - 1, timeZone);

        if (blockStartDate > date || blockEndDate < date) continue;

        let blockStartMins = 0;
        if (blockStartDate === date) {
            const [sh, sm] = localTimeAt(bStartMs, timeZone).split(':').map(Number);
            blockStartMins = sh * 60 + sm;
        }

        let blockEndMins = 1440;
        if (blockEndDate === date) {
            const [eh, em] = localTimeAt(bEndMs, timeZone).split(':').map(Number);
            blockEndMins = eh * 60 + em;
        }

        const nextIntervals = [];
        for (const slot of freeIntervals) {
            if (blockEndMins <= slot.start || blockStartMins >= slot.end) {
                // No overlap
                nextIntervals.push(slot);
            } else {
                // Overlap: split slot
                if (slot.start < blockStartMins) {
                    nextIntervals.push({ start: slot.start, end: blockStartMins });
                }
                if (blockEndMins < slot.end) {
                    nextIntervals.push({ start: blockEndMins, end: slot.end });
                }
            }
        }
        freeIntervals = nextIntervals;
    }

    const scheduledBlocks = [];
    const overflowBacklog = [];
    let scheduledMinutes = 0;

    // 3. Greedy placement for each task
    for (const task of sortedTasks) {
        const duration = Math.max(15, Math.min(240, Number(task.estimatedMinutes) || 45));
        const difficulty = task.cognitiveDifficulty ?? (task.priorityEvaluation?.normalizedFactors?.difficulty ?? 0.50);

        if (scheduledMinutes + duration > dailyCapacityMinutes) {
            overflowBacklog.push({ task, reason: 'CAPACITY_EXCEEDED' });
            continue;
        }

        // Find candidate slots that can fit this duration
        const viableSlots = freeIntervals.filter(s => (s.end - s.start) >= duration);

        if (viableSlots.length === 0) {
            overflowBacklog.push({ task, reason: 'NO_SUITABLE_TIME_SLOT' });
            continue;
        }

        // Multi-point scanning: test slot start AND all energy segment boundaries inside the slot
        let bestSlot = null;
        let bestStartMins = null;
        let bestFitness = -Infinity;

        for (const slot of viableSlots) {
            const candidateStarts = new Set();
            candidateStarts.add(slot.start);

            for (const boundary of ENERGY_SEGMENT_BOUNDARIES) {
                if (boundary > slot.start && (boundary + duration) <= slot.end) {
                    candidateStarts.add(boundary);
                }
            }

            for (const candidateStart of candidateStarts) {
                const energy = getAverageEnergyMultiplier(candidateStart, duration);
                const fitness = 1.0 - Math.abs(difficulty - energy);

                // Prefer highest fitness; tie-breaker: earlier start time
                if (fitness > bestFitness || (Math.abs(fitness - bestFitness) < 1e-6 && (bestStartMins === null || candidateStart < bestStartMins))) {
                    bestFitness = fitness;
                    bestSlot = slot;
                    bestStartMins = candidateStart;
                }
            }
        }

        const slotStartMins = bestStartMins;
        const slotEndMins = slotStartMins + duration;

        // Resolve timezone-accurate UTC timestamps
        const startTimeStr = minutesToTime(slotStartMins);
        const startUtc = resolveLocalTime(date, startTimeStr, timeZone);
        const endUtc = new Date(Date.parse(startUtc) + duration * 60000).toISOString();

        const newBlock = {
            id: makeBlockId(),
            taskRef: { domain: 'todo', id: task.id },
            title: task.title || task.task,
            localDate: date,
            timeZone,
            startUtc,
            endUtc,
            durationMinutes: duration,
            priorityScore: task.priorityEvaluation?.score ?? 50,
            energyMultiplier: getAverageEnergyMultiplier(slotStartMins, duration)
        };

        scheduledBlocks.push(newBlock);
        scheduledMinutes += duration;

        // Consume slot from freeIntervals, preserving any remaining slices before or after
        const updatedIntervals = [];
        for (const s of freeIntervals) {
            if (s === bestSlot) {
                if (slotStartMins > s.start) {
                    updatedIntervals.push({ start: s.start, end: slotStartMins });
                }
                if (slotEndMins < s.end) {
                    updatedIntervals.push({ start: slotEndMins, end: s.end });
                }
            } else {
                updatedIntervals.push(s);
            }
        }
        freeIntervals = updatedIntervals;
    }

    // Sort scheduled blocks chronologically
    scheduledBlocks.sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc));

    return {
        scheduledBlocks,
        overflowBacklog,
        totalScheduledMinutes: scheduledMinutes,
        remainingCapacityMinutes: Math.max(0, dailyCapacityMinutes - scheduledMinutes)
    };
}
