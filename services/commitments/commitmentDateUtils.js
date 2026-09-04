/**
 * services/commitments/commitmentDateUtils.js
 * 
 * Deterministic calendar calculations for recurrence intervals.
 * 
 * Invariants:
 * - Month-end preservation: A commitment set on the 31st clamps to 28/29 in Feb,
 *   then restores to 31st for 31-day months (never irreversibly decays to 28).
 * - Leap year accuracy: Feb 29 on leap years (2024, 2028, 2032...), 28 otherwise.
 * - Deterministic string-based (YYYY-MM-DD) date manipulation.
 */

import { RecurrenceFrequency } from './commitmentContracts.js';

export function isLeapYear(year) {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function getDaysInMonth(year, month1Indexed) {
    if (month1Indexed === 2) {
        return isLeapYear(year) ? 29 : 28;
    }
    if ([4, 6, 9, 11].includes(month1Indexed)) {
        return 30;
    }
    return 31;
}

export function parseISODate(dateStr) {
    const parts = dateStr.split('-');
    if (parts.length !== 3) throw new Error(`Invalid date format (expected YYYY-MM-DD): ${dateStr}`);
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error(`Invalid date components in: ${dateStr}`);
    }
    return { year, month, day };
}

export function formatISODate(year, month, day) {
    const yStr = year.toString().padStart(4, '0');
    const mStr = month.toString().padStart(2, '0');
    const dStr = day.toString().padStart(2, '0');
    return `${yStr}-${mStr}-${dStr}`;
}

/**
 * Calculates next scheduled occurrence date based on frequency and target day of month.
 * @param {string} currentDueDate YYYY-MM-DD
 * @param {string} frequency 
 * @param {number} targetDayOfMonth Original intended day of month (e.g. 31)
 * @returns {string} Next date YYYY-MM-DD
 */
export function getNextOccurrenceDate(currentDueDate, frequency, targetDayOfMonth = null) {
    const { year, month, day } = parseISODate(currentDueDate);
    const intendedDay = targetDayOfMonth || day;

    switch (frequency) {
        case RecurrenceFrequency.WEEKLY: {
            const d = new Date(Date.UTC(year, month - 1, day));
            d.setUTCDate(d.getUTCDate() + 7);
            return d.toISOString().split('T')[0];
        }
        case RecurrenceFrequency.FORTNIGHTLY: {
            const d = new Date(Date.UTC(year, month - 1, day));
            d.setUTCDate(d.getUTCDate() + 14);
            return d.toISOString().split('T')[0];
        }
        case RecurrenceFrequency.MONTHLY: {
            let nextYear = year;
            let nextMonth = month + 1;
            if (nextMonth > 12) {
                nextYear += 1;
                nextMonth = 1;
            }
            const maxDays = getDaysInMonth(nextYear, nextMonth);
            const clampedDay = Math.min(intendedDay, maxDays);
            return formatISODate(nextYear, nextMonth, clampedDay);
        }
        case RecurrenceFrequency.QUARTERLY: {
            let nextYear = year;
            let nextMonth = month + 3;
            if (nextMonth > 12) {
                nextYear += Math.floor((nextMonth - 1) / 12);
                nextMonth = ((nextMonth - 1) % 12) + 1;
            }
            const maxDays = getDaysInMonth(nextYear, nextMonth);
            const clampedDay = Math.min(intendedDay, maxDays);
            return formatISODate(nextYear, nextMonth, clampedDay);
        }
        case RecurrenceFrequency.HALF_YEARLY: {
            let nextYear = year;
            let nextMonth = month + 6;
            if (nextMonth > 12) {
                nextYear += Math.floor((nextMonth - 1) / 12);
                nextMonth = ((nextMonth - 1) % 12) + 1;
            }
            const maxDays = getDaysInMonth(nextYear, nextMonth);
            const clampedDay = Math.min(intendedDay, maxDays);
            return formatISODate(nextYear, nextMonth, clampedDay);
        }
        case RecurrenceFrequency.YEARLY: {
            const nextYear = year + 1;
            const maxDays = getDaysInMonth(nextYear, month);
            const clampedDay = Math.min(intendedDay, maxDays);
            return formatISODate(nextYear, month, clampedDay);
        }
        case RecurrenceFrequency.CUSTOM:
        default: {
            // Default step monthly
            let nextYear = year;
            let nextMonth = month + 1;
            if (nextMonth > 12) {
                nextYear += 1;
                nextMonth = 1;
            }
            const maxDays = getDaysInMonth(nextYear, nextMonth);
            const clampedDay = Math.min(intendedDay, maxDays);
            return formatISODate(nextYear, nextMonth, clampedDay);
        }
    }
}
