/**
 * services/life/storeKit.js
 *
 * Small durable-document toolkit shared by the life-planning, validity, career,
 * apartment-society, markets and tax modules.
 *
 * Guarantees for every store created here:
 *  - Reads are strict: a corrupt or unreadable document throws and is never replaced.
 *  - Writes are serialized per store, validated before persistence, atomic, and only
 *    reported as successful when the storage layer confirms the save.
 *  - Callers always receive deep copies so returned data can never mutate saved state.
 *  - IDs are unique per process and collision-checked by callers where needed.
 */
import { StorageService } from '../storage.js';

let sequence = 0;
export const clone = value => JSON.parse(JSON.stringify(value));
export function newId(prefix = 'id') {
    return `${prefix}-${Date.now().toString(36)}-${(++sequence).toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
export function nowIso() { return new Date().toISOString(); }
export function isDate(value) {
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}
export function assertDate(value, label = 'date') {
    if (!isDate(value)) throw new Error(`Enter a valid ${label} as YYYY-MM-DD.`);
    return value;
}
export function optionalDate(value, label = 'date') {
    if (value === undefined || value === null || value === '') return null;
    return assertDate(value, label);
}
export function addDays(date, days) {
    const value = new Date(`${date}T12:00:00Z`);
    value.setUTCDate(value.getUTCDate() + days);
    return value.toISOString().slice(0, 10);
}
export function addMonths(date, months) {
    const value = new Date(`${date}T12:00:00Z`);
    const day = value.getUTCDate();
    value.setUTCDate(1);
    value.setUTCMonth(value.getUTCMonth() + months);
    const lastDay = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + 1, 0)).getUTCDate();
    value.setUTCDate(Math.min(day, lastDay));
    return value.toISOString().slice(0, 10);
}
export function daysBetween(from, to) {
    return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
}
export function todayLocal(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function text(value, label, { max = 200, required = true } = {}) {
    const result = typeof value === 'string' ? value.trim() : '';
    if (required && !result) throw new Error(`Enter ${label}.`);
    if (result.length > max) throw new Error(`Keep ${label} within ${max} characters.`);
    return result;
}
export function money(value, label = 'amount', { min = 0, allowNull = false } = {}) {
    if ((value === undefined || value === null || value === '') && allowNull) return null;
    const amount = typeof value === 'string' ? Number(value.replace(/[,\s]/g, '')) : Number(value);
    if (!Number.isFinite(amount) || amount < min) throw new Error(`Enter a valid ${label}.`);
    if (amount > 1e13) throw new Error(`${label} is unrealistically large.`);
    return Math.round(amount * 100) / 100;
}
export function integer(value, label, { min = 0, max = Number.MAX_SAFE_INTEGER, allowNull = false } = {}) {
    if ((value === undefined || value === null || value === '') && allowNull) return null;
    const number = Number(value);
    if (!Number.isInteger(number) || number < min || number > max) throw new Error(`${label} must be a whole number between ${min} and ${max}.`);
    return number;
}
export function oneOf(value, options, label) {
    if (!options.includes(value)) throw new Error(`Choose a valid ${label}.`);
    return value;
}

/**
 * Creates a serialized, validated document store.
 * @param {{key:string, empty:() => object, validate:(doc:object) => object, label?:string}} config
 */
export function createStore({ key, empty, validate, label = 'data' }) {
    let queue = Promise.resolve();
    async function read() {
        const saved = await StorageService.load(key, null, { strict: true });
        return clone(validate(saved === null ? empty() : saved));
    }
    function mutate(work) {
        const result = queue.then(async () => {
            const current = await read();
            const next = await work(current);
            validate(next);
            const saved = await StorageService.save(key, next, { atomic: true });
            if (!saved?.success) throw new Error(`Your ${label} could not be saved. Keep your changes and retry.`);
            return clone(next);
        });
        queue = result.catch(() => {});
        return result;
    }
    return {
        key,
        load: async () => { await queue; return read(); },
        mutate
    };
}
