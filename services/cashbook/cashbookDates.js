/**
 * services/cashbook/cashbookDates.js
 *
 * Local-calendar date helpers for the Cashbook module.
 *
 * Why: `new Date().toISOString().split('T')[0]` returns the UTC date. For a user
 * in IST (UTC+05:30) that is YESTERDAY between 00:00 and 05:30 local time, which
 * mis-files transactions, shows the wrong "Today" group and closes the wrong day.
 * All cashbook "today" logic must use the device's local calendar date.
 */

function pad2(n) {
    return String(n).padStart(2, '0');
}

/** Formats a Date as YYYY-MM-DD in LOCAL time. */
export function toLocalDateString(d = new Date()) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Today's local calendar date (YYYY-MM-DD). */
export function todayLocal() {
    return toLocalDateString(new Date());
}

/** Yesterday's local calendar date (YYYY-MM-DD). */
export function yesterdayLocal() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toLocalDateString(d);
}

/**
 * Strictly validates a YYYY-MM-DD string (rejects 2025-02-31, 2025-13-01, '2025-1-5').
 */
export function isValidDateString(s) {
    if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
    const [y, m, d] = s.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
