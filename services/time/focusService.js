/**
 * services/time/focusService.js
 *
 * Restart-safe focus sessions. Elapsed time is derived from persisted timestamps,
 * never from interval ticks, so the app can be killed and reopened without losing
 * or inventing minutes. At most one session is active at any time. A finished
 * session never completes its task automatically; the user decides in Tasks.
 */
import { createStore, newId, nowIso, text, integer } from '../life/storeKit.js';
import { localDateAt } from './plannerContracts.js';

export const FOCUS_STORAGE_KEY = 'finlife_time_focus_v1';
export const SESSION_STATES = ['running', 'paused', 'completed', 'cancelled'];
/** A running segment older than this is flagged for the user to reconcile. */
export const STALE_SEGMENT_MS = 12 * 60 * 60 * 1000;

export function emptyFocus() { return { version: 1, sessions: [] }; }
export function validateFocus(doc) {
    if (!doc || doc.version !== 1 || !Array.isArray(doc.sessions)) throw new Error('Saved focus history is unsupported or incomplete.');
    const ids = new Set(); let active = 0;
    for (const s of doc.sessions) {
        if (!s || typeof s.id !== 'string' || !s.id || !SESSION_STATES.includes(s.state) || !Array.isArray(s.segments) || s.taskRef?.domain !== 'todo') throw new Error('Saved focus history could not be read. Retry without replacing it.');
        if (ids.has(s.id)) throw new Error('Duplicate saved focus session.');
        ids.add(s.id);
        if (s.state === 'running' || s.state === 'paused') active++;
        for (const seg of s.segments) {
            if (!Number.isFinite(Date.parse(seg.startUtc)) || (seg.endUtc !== null && (!Number.isFinite(Date.parse(seg.endUtc)) || Date.parse(seg.endUtc) < Date.parse(seg.startUtc)))) throw new Error('Saved focus session has an invalid time segment.');
        }
    }
    if (active > 1) throw new Error('Saved focus history has more than one active session.');
    return doc;
}
const store = createStore({ key: FOCUS_STORAGE_KEY, empty: emptyFocus, validate: validateFocus, label: 'focus session' });

export function elapsedMs(session, now = nowIso()) {
    const end = Date.parse(now);
    return session.segments.reduce((total, seg) => {
        const start = Date.parse(seg.startUtc);
        const finish = seg.endUtc === null ? end : Date.parse(seg.endUtc);
        return total + Math.max(0, finish - start);
    }, 0);
}
export function elapsedMinutes(session, now) { return Math.floor(elapsedMs(session, now) / 60000); }
export function isStale(session, now = nowIso()) {
    const open = session.segments.find(seg => seg.endUtc === null);
    return !!open && Date.parse(now) - Date.parse(open.startUtc) > STALE_SEGMENT_MS;
}
export function activeSession(doc) { return doc.sessions.find(s => s.state === 'running' || s.state === 'paused') || null; }

/** Minutes recorded per local date and per task for review, splitting segments that cross midnight. */
export function reviewSummary(sessions, zone, dates) {
    const byDate = Object.fromEntries(dates.map(d => [d, 0]));
    const byTask = {};
    for (const session of sessions) {
        if (session.state === 'cancelled') continue;
        for (const seg of session.segments) {
            if (seg.endUtc === null) continue;
            let cursor = Date.parse(seg.startUtc);
            const end = Date.parse(seg.endUtc);
            while (cursor < end) {
                const date = localDateAt(cursor, zone);
                const nextMidnight = (() => { let probe = cursor; while (localDateAt(probe, zone) === date) probe += 60000; return probe; })();
                const stop = Math.min(end, nextMidnight);
                const minutes = (stop - cursor) / 60000;
                if (date in byDate) byDate[date] += minutes;
                if (date in byDate) byTask[session.taskRef.id] = (byTask[session.taskRef.id] || 0) + minutes;
                cursor = stop;
            }
        }
    }
    for (const d of dates) byDate[d] = Math.round(byDate[d]);
    for (const k of Object.keys(byTask)) byTask[k] = Math.round(byTask[k]);
    return { byDate, byTask, totalMinutes: Object.values(byDate).reduce((a, b) => a + b, 0) };
}

export const FocusService = {
    load: () => store.load(),
    current: async () => activeSession(await store.load()),
    start: (taskId, plannedMinutes = 25, now = nowIso()) => store.mutate(doc => {
        if (activeSession(doc)) throw new Error('A focus session is already active. Finish or cancel it first.');
        if (!((typeof taskId === 'string' && taskId) || (Number.isSafeInteger(taskId) && taskId >= 0))) throw new Error('Choose a task to focus on.');
        const planned = integer(plannedMinutes, 'Planned minutes', { min: 1, max: 480 });
        const session = { id: newId('focus'), taskRef: { domain: 'todo', id: taskId }, plannedMinutes: planned, state: 'running', segments: [{ startUtc: now, endUtc: null }], breaks: 0, note: '', createdAt: now, endedAt: null };
        return { ...doc, sessions: [session, ...doc.sessions] };
    }),
    pause: (now = nowIso()) => store.mutate(doc => {
        const session = activeSession(doc);
        if (!session || session.state !== 'running') return doc;
        const segments = session.segments.map(seg => (seg.endUtc === null ? { ...seg, endUtc: now } : seg));
        return { ...doc, sessions: doc.sessions.map(s => (s.id === session.id ? { ...s, state: 'paused', segments, breaks: s.breaks + 1 } : s)) };
    }),
    resume: (now = nowIso()) => store.mutate(doc => {
        const session = activeSession(doc);
        if (!session || session.state !== 'paused') return doc;
        return { ...doc, sessions: doc.sessions.map(s => (s.id === session.id ? { ...s, state: 'running', segments: [...s.segments, { startUtc: now, endUtc: null }] } : s)) };
    }),
    stop: ({ note = '', now = nowIso() } = {}) => store.mutate(doc => {
        const session = activeSession(doc);
        if (!session) return doc;
        const segments = session.segments.map(seg => (seg.endUtc === null ? { ...seg, endUtc: now } : seg));
        return { ...doc, sessions: doc.sessions.map(s => (s.id === session.id ? { ...s, state: 'completed', segments, note: text(note, 'a note', { max: 300, required: false }), endedAt: now } : s)) };
    }),
    /** Discards unobserved time: closes the open segment at `endUtc` (a time the user confirms) then completes. */
    reconcile: ({ endUtc, now = nowIso() }) => store.mutate(doc => {
        const session = activeSession(doc);
        if (!session) return doc;
        const open = session.segments.find(seg => seg.endUtc === null);
        if (!open) return doc;
        const end = Date.parse(endUtc);
        if (!Number.isFinite(end) || end < Date.parse(open.startUtc) || end > Date.parse(now)) throw new Error('Choose an end time after the session started and not in the future.');
        const segments = session.segments.map(seg => (seg.endUtc === null ? { ...seg, endUtc: new Date(end).toISOString() } : seg));
        return { ...doc, sessions: doc.sessions.map(s => (s.id === session.id ? { ...s, state: 'completed', segments, endedAt: now } : s)) };
    }),
    cancel: (now = nowIso()) => store.mutate(doc => {
        const session = activeSession(doc);
        if (!session) return doc;
        const segments = session.segments.map(seg => (seg.endUtc === null ? { ...seg, endUtc: now } : seg));
        return { ...doc, sessions: doc.sessions.map(s => (s.id === session.id ? { ...s, state: 'cancelled', segments, endedAt: now } : s)) };
    }),
    removeSession: id => store.mutate(doc => ({ ...doc, sessions: doc.sessions.filter(s => s.id !== id) }))
};
