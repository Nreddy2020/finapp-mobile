/**
 * services/time/deadlineEngine.js
 *
 * Deadline intelligence & dynamic pacing engine.
 * Calculates daily requirements and recalculates pace when days are missed.
 *
 * Key Invariants:
 * - Zero remaining work short-circuits to COMPLETED with 0 pace and 0 extension.
 * - Zero remaining capacity strictly guards against division by zero (IMMEDIATE_DEFICIT).
 * - Distinguishes between standardized 1.0-capacity pace and specific day targets C(d).
 * - Recommended extension days uses capacity-weighted subtraction and is never negative.
 */

import { addDays, assertDate } from './plannerContracts.js';

export const DEADLINE_STATUS = {
    COMPLETED: 'COMPLETED',
    ON_TRACK: 'ON_TRACK',
    UNREALISTIC_PACE: 'UNREALISTIC_PACE',
    IMMEDIATE_DEFICIT: 'IMMEDIATE_DEFICIT'
};

/**
 * Calculates deadline pacing metrics.
 *
 * @param {Object} options
 * @param {number} options.totalRequiredMinutes - Total estimated minutes for the goal
 * @param {number} options.completedMinutes - Minutes already logged/finished
 * @param {string} options.targetDate - Target completion date YYYY-MM-DD
 * @param {string} options.currentDate - Current reference date YYYY-MM-DD
 * @param {number} [options.dailyCapacityMinutes=480] - Standard daily capacity (default 8 hours)
 * @param {Object.<string, number>} [options.dailyAvailabilityCoefficients={}] - Map of YYYY-MM-DD -> C(d) in [0, 1]
 */
export function calculateDeadlinePace({
    totalRequiredMinutes,
    completedMinutes = 0,
    targetDate,
    currentDate,
    dailyCapacityMinutes = 480,
    dailyAvailabilityCoefficients = {}
}) {
    assertDate(targetDate);
    assertDate(currentDate);

    const total = Math.max(0, Math.round(totalRequiredMinutes || 0));
    const completed = Math.max(0, Math.round(completedMinutes || 0));
    const remainingMinutes = Math.max(0, total - completed);

    // 1. Short-circuit: Goal is already completed
    if (remainingMinutes <= 0) {
        return {
            status: DEADLINE_STATUS.COMPLETED,
            remainingMinutes: 0,
            daysRemaining: 0,
            standardPaceMinutesPerDay: 0,
            isPaceFeasible: true,
            recommendedExtensionDays: 0,
            dailyAllocations: {}
        };
    }

    // Determine list of remaining dates from currentDate to targetDate (inclusive)
    const remainingDates = [];
    let cursor = currentDate;
    while (cursor <= targetDate) {
        remainingDates.push(cursor);
        cursor = addDays(cursor, 1);
    }

    // Sum capacity coefficients C(d)
    let sumCoefficients = 0;
    let totalAvailableCapacityMinutes = 0;
    const dateCoefficients = {};

    for (const d of remainingDates) {
        // Default coefficient: 1.0 for weekdays, 0.75 for weekends unless specified
        let c = dailyAvailabilityCoefficients[d];
        if (typeof c !== 'number' || !Number.isFinite(c)) {
            const dayOfWeek = new Date(d + 'T12:00:00Z').getUTCDay();
            c = (dayOfWeek === 0 || dayOfWeek === 6) ? 0.75 : 1.0;
        }
        c = Math.max(0, Math.min(1.0, c));
        dateCoefficients[d] = c;
        sumCoefficients += c;
        totalAvailableCapacityMinutes += dailyCapacityMinutes * c;
    }

    // 2. Guard against division by zero (deadline passed or zero available capacity)
    if (sumCoefficients <= 0 || remainingDates.length === 0) {
        const extensionDays = Math.max(1, Math.ceil(remainingMinutes / dailyCapacityMinutes));
        return {
            status: DEADLINE_STATUS.IMMEDIATE_DEFICIT,
            remainingMinutes,
            daysRemaining: 0,
            standardPaceMinutesPerDay: remainingMinutes,
            isPaceFeasible: false,
            recommendedExtensionDays: extensionDays,
            dailyAllocations: {}
        };
    }

    // 3. Calculate standardized 1.0-capacity pace
    const standardPace = Math.round(remainingMinutes / sumCoefficients);

    // 4. Calculate day-specific allocations
    const dailyAllocations = {};
    for (const d of remainingDates) {
        dailyAllocations[d] = Math.round(standardPace * dateCoefficients[d]);
    }

    // 5. Feasibility Check (Pace threshold: 1.5x of daily capacity)
    const maxFeasibleCapacity = 1.5 * totalAvailableCapacityMinutes;
    const isPaceFeasible = remainingMinutes <= maxFeasibleCapacity;

    let recommendedExtensionDays = 0;
    let status = DEADLINE_STATUS.ON_TRACK;

    if (!isPaceFeasible) {
        status = DEADLINE_STATUS.UNREALISTIC_PACE;
        const deficitMinutes = remainingMinutes - maxFeasibleCapacity;
        recommendedExtensionDays = Math.max(1, Math.ceil(deficitMinutes / dailyCapacityMinutes));
    }

    return {
        status,
        remainingMinutes,
        daysRemaining: remainingDates.length,
        standardPaceMinutesPerDay: standardPace,
        isPaceFeasible,
        recommendedExtensionDays,
        dailyAllocations
    };
}
