/**
 * services/time/habitsService.js
 *
 * Daily routines and habits with honest streaks. A habit is due on the days the
 * user chose; streaks count only due days and never penalise days that were
 * not scheduled. Check-ins are per local date and can be undone.
 */
import { createStore, newId, nowIso, text, integer, isDate, addDays, oneOf } from '../life/storeKit.js';

export const HABITS_STORAGE_KEY = 'finlife_time_habits_v1';
export const HABIT_SCHEDULES = ['daily', 'weekdays', 'weekends', 'custom'];

export function emptyHabits() { return { version: 1, habits: [] }; }
export function validateHabits(doc) {
    if (!doc || doc.version !== 1 || !Array.isArray(doc.habits)) throw new Error('Saved habits are unsupported or incomplete.');
    const ids = new Set();
    for (const h of doc.habits) {
        if (!h || typeof h.id !== 'string' || !h.id || typeof h.title !== 'string' || !HABIT_SCHEDULES.includes(h.schedule?.type) || !Array.isArray(h.schedule.days) || typeof h.checkins !== 'object' || h.checkins === null) throw new Error('Saved habits could not be read. Retry without replacing them.');
        if (ids.has(h.id)) throw new Error('Duplicate saved habit.');
        ids.add(h.id);
        for (const [date, count] of Object.entries(h.checkins)) if (!isDate(date) || !Number.isInteger(count) || count < 0) throw new Error('Saved habit has an invalid check-in.');
    }
    return doc;
}
const store = createStore({ key: HABITS_STORAGE_KEY, empty: emptyHabits, validate: validateHabits, label: 'habits' });

function weekday(date) { return new Date(`${date}T12:00:00Z`).getUTCDay(); }
export function isDue(habit, date) {
    if (habit.archived) return false;
    if (habit.startDate && date < habit.startDate) return false;
    const day = weekday(date);
    switch (habit.schedule.type) {
        case 'daily': return true;
        case 'weekdays': return day >= 1 && day <= 5;
        case 'weekends': return day === 0 || day === 6;
        default: return habit.schedule.days.includes(day);
    }
}
export function isDone(habit, date) { return (habit.checkins[date] || 0) >= (habit.targetPerDay || 1); }

/** Consecutive due days completed, counting back from `today` (today counts only if done). */
export function streak(habit, today) {
    let count = 0, date = today, guard = 0;
    if (isDue(habit, today) && !isDone(habit, today)) date = addDays(today, -1);
    while (guard++ < 3660) {
        if (habit.startDate && date < habit.startDate) break;
        if (isDue(habit, date)) { if (isDone(habit, date)) count++; else break; }
        date = addDays(date, -1);
    }
    return count;
}
export function completionRate(habit, dates) {
    const due = dates.filter(d => isDue(habit, d));
    if (!due.length) return null;
    return Math.round((due.filter(d => isDone(habit, d)).length / due.length) * 100);
}
export function dueToday(habits, date) { return habits.filter(h => isDue(h, date)); }

function scheduleFrom(input) {
    const type = oneOf(input?.type || 'daily', HABIT_SCHEDULES, 'schedule');
    const days = type === 'custom' ? [...new Set((input.days || []).map(Number))].filter(d => Number.isInteger(d) && d >= 0 && d <= 6).sort() : [];
    if (type === 'custom' && !days.length) throw new Error('Choose at least one day for a custom schedule.');
    return { type, days };
}

export const HabitsService = {
    load: () => store.load(),
    list: async () => (await store.load()).habits,
    add: input => store.mutate(doc => {
        const habit = {
            id: newId('habit'), title: text(input.title, 'a habit name', { max: 120 }), schedule: scheduleFrom(input.schedule),
            targetPerDay: integer(input.targetPerDay ?? 1, 'Times per day', { min: 1, max: 50 }), reminder: input.reminder || '', archived: false,
            startDate: isDate(input.startDate) ? input.startDate : nowIso().slice(0, 10), checkins: {}, createdAt: nowIso()
        };
        return { ...doc, habits: [...doc.habits, habit] };
    }),
    update: (id, changes) => store.mutate(doc => {
        const habit = doc.habits.find(h => h.id === id);
        if (!habit) throw new Error('This habit is no longer available. Refresh the list.');
        const next = { ...habit };
        if (changes.title !== undefined) next.title = text(changes.title, 'a habit name', { max: 120 });
        if (changes.schedule !== undefined) next.schedule = scheduleFrom(changes.schedule);
        if (changes.targetPerDay !== undefined) next.targetPerDay = integer(changes.targetPerDay, 'Times per day', { min: 1, max: 50 });
        if (changes.archived !== undefined) next.archived = !!changes.archived;
        if (changes.reminder !== undefined) next.reminder = String(changes.reminder || '');
        return { ...doc, habits: doc.habits.map(h => (h.id === id ? next : h)) };
    }),
    checkin: (id, date, delta = 1) => store.mutate(doc => {
        const habit = doc.habits.find(h => h.id === id);
        if (!habit) throw new Error('This habit is no longer available. Refresh the list.');
        if (!isDate(date)) throw new Error('Enter a valid date as YYYY-MM-DD.');
        if (date > nowIso().slice(0, 10) && delta > 0) throw new Error('You cannot check in a future day.');
        const count = Math.max(0, (habit.checkins[date] || 0) + delta);
        const checkins = { ...habit.checkins };
        if (count === 0) delete checkins[date]; else checkins[date] = count;
        return { ...doc, habits: doc.habits.map(h => (h.id === id ? { ...h, checkins } : h)) };
    }),
    remove: id => store.mutate(doc => ({ ...doc, habits: doc.habits.filter(h => h.id !== id) }))
};
