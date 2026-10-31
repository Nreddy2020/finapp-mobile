export const PLANNER_STORAGE_KEY = 'finlife_time_planning_v1';
const formatters = new Map();
export const validTaskId = id => (typeof id === 'string' && !!id) || (Number.isSafeInteger(id) && id >= 0);
export function assertDate(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || new Date(date + 'T12:00:00Z').toISOString().slice(0, 10) !== date) throw new Error('Enter a valid date as YYYY-MM-DD.');
    return date;
}
export function addDays(date, days) { assertDate(date); const value = new Date(date + 'T12:00:00Z'); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
export function assertZone(zone) { try { new Intl.DateTimeFormat('en-US', {timeZone: zone}).format(); } catch { throw new Error('The planning time zone is unavailable.'); } if (typeof zone !== 'string' || !zone) throw new Error('Choose a planning time zone.'); return zone; }
function parts(instant, zone) {
    if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-GB', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}));
    const values = formatters.get(zone).formatToParts(new Date(instant));
    return Object.fromEntries(values.filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
export function localDateAt(instant, zone) { const p = parts(instant, zone); return `${p.year}-${p.month}-${p.day}`; }
export function localTimeAt(instant, zone) { const p = parts(instant, zone); return `${p.hour}:${p.minute}`; }
// Find actual instants matching a wall time. DST gaps have none; folds have two.
export function localTimeCandidates(date, time, zone) {
    assertDate(date); assertZone(zone);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '')) throw new Error('Enter a time as HH:MM (24-hour).');
    const wall = Date.parse(`${date}T${time}:00Z`), offsets = new Set();
    for (let h = -36; h <= 36; h += 6) {
        const sample = wall + h * 3600000, p = parts(sample, zone);
        offsets.add(Date.parse(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`) - sample);
    }
    return [...offsets].map(offset => wall - offset).filter(value => localDateAt(value, zone) === date && localTimeAt(value, zone) === time).sort((a, b) => a - b).map(value => new Date(value).toISOString());
}
export function resolveLocalTime(date, time, zone, occurrence = null) {
    const candidates = localTimeCandidates(date, time, zone);
    if (!candidates.length) throw new Error('This local time does not exist because the clock changes. Choose another time.');
    if (candidates.length > 1 && !['earlier', 'later'].includes(occurrence)) throw new Error('This local time occurs twice. Choose the earlier or later occurrence.');
    return occurrence === 'later' ? candidates[candidates.length - 1] : candidates[0];
}
export function emptyPlanner(zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') { return {version: 1, settings: {timeZone: assertZone(zone), dailyCapacityMinutes: 480, weekStartsOn: 1}, blocks: []}; }
export function validateBlock(block) {
    if (!block || typeof block.id !== 'string' || !block.id) throw new Error('Invalid saved time block or task reference.');
    if (!block.isBreak && (block.taskRef?.domain !== 'todo' || !validTaskId(block.taskRef?.id))) throw new Error('Invalid saved time block or task reference.');
    assertZone(block.timeZone); assertDate(block.localDate);
    const start = Date.parse(block.startUtc), end = Date.parse(block.endUtc);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || end - start > 86400000 || !/Z$/.test(block.startUtc) || !/Z$/.test(block.endUtc)) throw new Error('A time block must last between 1 minute and 24 hours.');
    if ((end - start) % 60000 !== 0 || end - start < 60000 || localDateAt(start, block.timeZone) !== block.localDate) throw new Error('Invalid time block date or duration.');
    return block;
}
export function validatePlanner(data) {
    if (!data || data.version !== 1 || !data.settings || !Array.isArray(data.blocks)) throw new Error('Saved planner format is unsupported or incomplete.');
    if (Object.keys(data).some(key => !['version', 'settings', 'blocks'].includes(key))) throw new Error('Saved planner contains unsupported data.');
    assertZone(data.settings.timeZone);
    if (!Number.isInteger(data.settings.dailyCapacityMinutes) || data.settings.dailyCapacityMinutes < 0 || data.settings.dailyCapacityMinutes > 1440 || !Number.isInteger(data.settings.weekStartsOn) || data.settings.weekStartsOn < 0 || data.settings.weekStartsOn > 6) throw new Error('Invalid planner capacity or week start.');
    const ids = new Set();
    for (const block of data.blocks) { validateBlock(block); if (ids.has(block.id)) throw new Error('Duplicate saved time block.'); ids.add(block.id); }
    return data;
}
export function blockFromLocal({id, taskId, date, time, durationMinutes, timeZone, occurrence = null}) {
    const duration = Number(durationMinutes);
    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) throw new Error('Enter a duration from 1 to 1440 minutes.');
    const startUtc = resolveLocalTime(date, time, timeZone, occurrence);
    return validateBlock({id, taskRef: {domain: 'todo', id: taskId}, localDate: date, timeZone, startUtc, endUtc: new Date(Date.parse(startUtc) + duration * 60000).toISOString()});
}
export function conflictsFor(block, blocks) { return blocks.filter(other => other.id !== block.id && Date.parse(block.startUtc) < Date.parse(other.endUtc) && Date.parse(other.startUtc) < Date.parse(block.endUtc)); }
function startOfDay(date, zone) {
    for (let minute = 0; minute < 1440; minute++) {
        const time = `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
        const candidates = localTimeCandidates(date, time, zone);
        if (candidates.length) return Date.parse(candidates[0]);
    }
    throw new Error('This date does not exist in the planning time zone.');
}
export function daySummary(data, date, tasks = []) {
    validatePlanner(data); assertDate(date);
    const zone = data.settings.timeZone, start = startOfDay(date, zone), end = startOfDay(addDays(date, 1), zone);
    const blocks = data.blocks.filter(b => Date.parse(b.startUtc) < end && Date.parse(b.endUtc) > start).sort((a, b) => Date.parse(a.startUtc) - Date.parse(b.startUtc)).map(block => {
        if (block.isBreak) {
            return {
                ...block,
                task: { id: block.id, task: block.title || 'Recovery Break', status: 'break' },
                sourceMissing: false,
                minutes: (Math.min(end, Date.parse(block.endUtc)) - Math.max(start, Date.parse(block.startUtc))) / 60000,
                conflicts: conflictsFor(block, data.blocks).length
            };
        }
        const task = tasks.find(t => t.id === block.taskRef?.id);
        return {...block, task, sourceMissing: !task, minutes: (Math.min(end, Date.parse(block.endUtc)) - Math.max(start, Date.parse(block.startUtc))) / 60000, conflicts: conflictsFor(block, data.blocks).length};
    });
    const plannedMinutes = blocks.reduce((total, block) => total + block.minutes, 0);
    return {date, blocks, plannedMinutes, capacityMinutes: data.settings.dailyCapacityMinutes, remainingMinutes: data.settings.dailyCapacityMinutes - plannedMinutes};
}
export function weekDates(date, firstWeekday = 1) { assertDate(date); const weekday = new Date(date + 'T12:00:00Z').getUTCDay(); const first = addDays(date, -((weekday - firstWeekday + 7) % 7)); return Array.from({length: 7}, (_, i) => addDays(first, i)); }
