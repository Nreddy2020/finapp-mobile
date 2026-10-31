/**
 * services/validity/validityService.js
 *
 * One honest owner for everything that runs out:
 *  - kind 'validity': documents, licences, insurance, subscriptions, warranties, agreements.
 *  - kind 'expiry'  : medicines, food, gift cards, vouchers, points, prepaid recharges, offers.
 *
 * Status is always derived from the saved expiry date at read time, never from a stale
 * stored counter. Legacy records (item / expiry_date / days_left) are adapted on read
 * without rewriting them and compatibility fields are maintained on write so older
 * consumers keep working.
 */
import { StorageService, STORAGE_KEYS } from '../storage.js';
import { clone, newId, nowIso, text, money, optionalDate, isDate, daysBetween, addMonths, integer, oneOf } from '../life/storeKit.js';

export const VALIDITY_STORAGE_KEY = STORAGE_KEYS.VALIDITY;
export const KINDS = ['validity', 'expiry'];
export const VALIDITY_CATEGORIES = ['Passport', 'Visa', 'Driving Licence', 'Vehicle Insurance', 'Vehicle Registration', 'Pollution Certificate', 'Health Insurance', 'Life Insurance', 'Property Insurance', 'ID Card', 'Professional Licence', 'Certificate', 'Subscription', 'Membership', 'Domain / Hosting', 'Warranty / AMC', 'Lease / Agreement', 'Other'];
export const EXPIRY_CATEGORIES = ['Medicine', 'Food & Grocery', 'Gift Card', 'Voucher / Coupon', 'Loyalty Points', 'Prepaid Recharge', 'Cashback / Offer', 'Cosmetics', 'Battery / Filter', 'Other'];
export const STATUSES = ['expired', 'critical', 'expiring', 'valid', 'unknown', 'archived'];
/** Practical guidance on what a lapse costs, so the reminder explains why it matters. */
export const LAPSE_GUIDANCE = {
    'Passport': 'Travel and visas stop; renewals after expiry take longer and cost more.',
    'Visa': 'Overstaying can mean fines, bans or deportation.',
    'Driving Licence': 'Driving on an expired licence risks fines and voids insurance claims.',
    'Vehicle Insurance': 'A gap loses your no-claim bonus and any accident becomes fully your cost.',
    'Vehicle Registration': 'Unregistered vehicles attract fines and cannot be sold or insured.',
    'Pollution Certificate': 'Fines apply and insurance renewals may be refused.',
    'Health Insurance': 'A lapse resets waiting periods and leaves medical bills unprotected.',
    'Life Insurance': 'Cover ends; revival needs fresh medicals and back-premium with interest.',
    'Property Insurance': 'Fire, flood or theft damage becomes entirely your loss.',
    'Subscription': 'Unwanted auto-renewals quietly drain money; wanted ones stop service.',
    'Warranty / AMC': 'Repairs after expiry are fully paid by you.',
    'Lease / Agreement': 'Missing notice periods can forfeit deposits.',
    'Medicine': 'Expired medicine can be ineffective or unsafe.',
    'Food & Grocery': 'Wasted food is wasted money.',
    'Gift Card': 'Unused balance is lost forever.',
    'Voucher / Coupon': 'The discount is lost after the date.',
    'Loyalty Points': 'Points vanish silently at expiry.',
    'Prepaid Recharge': 'Service stops and reconnection may cost extra.',
    'Cashback / Offer': 'The offer lapses if not claimed in time.'
};

function parseLooseDate(value) {
    if (isDate(value)) return value;
    if (typeof value !== 'string' || !value.trim()) return null;
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return null;
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
}

/** Adapts any saved record (legacy or current) to the current shape without writing. */
export function normalizeItem(row) {
    if (!row || typeof row !== 'object') throw new Error('Saved documents could not be read. Retry without replacing them.');
    const id = row.id !== undefined && row.id !== null ? String(row.id) : null;
    if (!id) throw new Error('Saved documents could not be read. Retry without replacing them.');
    const title = row.title ?? row.item ?? row.name ?? '';
    if (typeof title !== 'string' || !title.trim()) throw new Error('Saved documents could not be read. Retry without replacing them.');
    const kind = KINDS.includes(row.kind) ? row.kind : 'validity';
    const expiryDate = isDate(row.expiryDate) ? row.expiryDate : parseLooseDate(row.expiry_date);
    return {
        ...row,
        id, kind, title,
        category: typeof row.category === 'string' && row.category ? row.category : 'Other',
        issueDate: isDate(row.issueDate) ? row.issueDate : null,
        expiryDate,
        expiryText: expiryDate ? null : (row.expiry_date || row.expiryText || null),
        renewalCost: Number.isFinite(Number(row.renewalCost ?? row.renewalPrice)) && (row.renewalCost ?? row.renewalPrice) !== null && (row.renewalCost ?? row.renewalPrice) !== undefined ? Number(row.renewalCost ?? row.renewalPrice) : null,
        renewalLeadDays: Number.isInteger(row.renewalLeadDays) ? row.renewalLeadDays : 30,
        autoRenew: !!(row.autoRenew ?? row.auto_renew),
        holder: typeof row.holder === 'string' ? row.holder : (Array.isArray(row.members) && row.members.length ? String(row.members[0]) : ''),
        familyPersonId: row.familyPersonId || null,
        identifier: typeof row.identifier === 'string' ? row.identifier : '',
        notes: typeof row.notes === 'string' ? row.notes : '',
        image: row.image || null,
        quantity: Number.isFinite(Number(row.quantity)) && row.quantity !== null && row.quantity !== undefined ? Number(row.quantity) : null,
        value: Number.isFinite(Number(row.value)) && row.value !== null && row.value !== undefined ? Number(row.value) : null,
        history: Array.isArray(row.history) ? row.history : [],
        archived: !!row.archived,
        createdAt: row.createdAt || null,
        updatedAt: row.updatedAt || null
    };
}
export function validateItems(rows) {
    if (!Array.isArray(rows)) throw new Error('Saved documents could not be read. Retry without replacing them.');
    const ids = new Set();
    const items = rows.map(normalizeItem);
    for (const item of items) { if (ids.has(item.id)) throw new Error('Duplicate saved document.'); ids.add(item.id); }
    return items;
}

/** Compatibility fields so legacy consumers (family sync, exports) still read the record. */
function withCompat(item, today) {
    const days = item.expiryDate ? daysBetween(today, item.expiryDate) : null;
    return { ...item, item: item.title, expiry_date: item.expiryDate || item.expiryText || '', days_left: days === null ? 999 : days, auto_renew: item.autoRenew, ...(item.renewalCost != null ? { renewalPrice: item.renewalCost } : {}) };
}

export function daysUntil(item, today) { return item.expiryDate ? daysBetween(today, item.expiryDate) : null; }
export function statusOf(item, today) {
    if (item.archived) return 'archived';
    const days = daysUntil(item, today);
    if (days === null) return 'unknown';
    if (days < 0) return 'expired';
    if (days <= 7) return 'critical';
    if (days <= (item.renewalLeadDays || 30)) return 'expiring';
    return 'valid';
}
export const STATUS_COLORS = { expired: '#EF4444', critical: '#F97316', expiring: '#F59E0B', valid: '#10B981', unknown: '#71717A', archived: '#52525B' };
export function statusLabel(item, today) {
    const status = statusOf(item, today), days = daysUntil(item, today);
    if (status === 'expired') return days === -1 ? 'Expired yesterday' : `Expired ${-days} days ago`;
    if (status === 'critical' || status === 'expiring') return days === 0 ? 'Expires today' : days === 1 ? 'Expires tomorrow' : `${days} days left`;
    if (status === 'valid') return days > 365 ? `${Math.floor(days / 365)}y ${days % 365}d left` : `${days} days left`;
    if (status === 'archived') return 'Archived';
    return 'No expiry date';
}
const RANK = { expired: 0, critical: 1, expiring: 2, unknown: 3, valid: 4, archived: 5 };
export function sortByUrgency(items, today) {
    return [...items].sort((a, b) => RANK[statusOf(a, today)] - RANK[statusOf(b, today)] || (daysUntil(a, today) ?? 1e9) - (daysUntil(b, today) ?? 1e9) || a.title.localeCompare(b.title));
}
export function summary(items, today, kind = null) {
    const list = items.filter(i => !i.archived && (!kind || i.kind === kind));
    const counts = { expired: 0, critical: 0, expiring: 0, valid: 0, unknown: 0 };
    let renewalCost30 = 0, renewalCost90 = 0, valueAtRisk = 0;
    for (const item of list) {
        const status = statusOf(item, today); counts[status]++;
        const days = daysUntil(item, today);
        if (days !== null && days >= 0 && item.renewalCost) { if (days <= 30) renewalCost30 += item.renewalCost; if (days <= 90) renewalCost90 += item.renewalCost; }
        if (item.kind === 'expiry' && item.value && days !== null && days >= 0 && days <= 30) valueAtRisk += item.value;
    }
    const sorted = sortByUrgency(list, today);
    return { total: list.length, ...counts, needsAction: counts.expired + counts.critical + counts.expiring, next: sorted.find(i => statusOf(i, today) !== 'unknown') || null, renewalCost30, renewalCost90, valueAtRisk };
}
/** Items grouped by expiry month for the next `months` months (plus overdue). */
export function renewalCalendar(items, today, months = 6) {
    const groups = [];
    const overdue = items.filter(i => !i.archived && statusOf(i, today) === 'expired');
    if (overdue.length) groups.push({ key: 'overdue', label: 'Overdue', items: sortByUrgency(overdue, today) });
    for (let m = 0; m < months; m++) {
        const start = m === 0 ? today : addMonths(today.slice(0, 8) + '01', m);
        const end = addMonths(today.slice(0, 8) + '01', m + 1);
        const bucket = items.filter(i => !i.archived && i.expiryDate && i.expiryDate >= start && i.expiryDate < end);
        if (bucket.length) groups.push({ key: start.slice(0, 7), label: new Date(`${start}T12:00:00Z`).toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' }), items: sortByUrgency(bucket, today), cost: bucket.reduce((s, i) => s + (i.renewalCost || 0), 0) });
    }
    return groups;
}
/** Reminder dates before expiry (lead, 7, 1 and 0 days) that are still in the future. */
export function reminderDates(item, today) {
    if (!item.expiryDate) return [];
    const offsets = [...new Set([item.renewalLeadDays || 30, 7, 1, 0])].sort((a, b) => b - a);
    return offsets.map(o => ({ daysBefore: o, date: new Date(Date.parse(`${item.expiryDate}T12:00:00Z`) - o * 86400000).toISOString().slice(0, 10) })).filter(r => r.date >= today);
}

let queue = Promise.resolve();
async function read() { const saved = await StorageService.load(VALIDITY_STORAGE_KEY, [], { strict: true }); return clone(validateItems(saved === null ? [] : saved)); }
function mutate(work) {
    const result = queue.then(async () => {
        const rows = await read();
        const next = validateItems(await work(rows));
        const today = nowIso().slice(0, 10);
        const compat = next.map(item => withCompat(item, today));
        const saved = await StorageService.save(VALIDITY_STORAGE_KEY, compat, { atomic: true });
        if (!saved?.success) throw new Error('Your documents could not be saved. Keep your changes and retry.');
        return clone(next);
    });
    queue = result.catch(() => {});
    return result;
}
function fields(input, current = {}) {
    const next = { ...current };
    const kind = input.kind !== undefined ? oneOf(input.kind, KINDS, 'kind') : (current.kind || 'validity');
    next.kind = kind;
    if (input.title !== undefined || !current.title) next.title = text(input.title, 'a name', { max: 160 });
    if (input.category !== undefined || !current.category) next.category = oneOf(input.category || 'Other', kind === 'expiry' ? EXPIRY_CATEGORIES : VALIDITY_CATEGORIES, 'category');
    if (input.issueDate !== undefined) next.issueDate = optionalDate(input.issueDate, 'issue date');
    if (input.expiryDate !== undefined) { next.expiryDate = optionalDate(input.expiryDate, 'expiry date'); if (next.expiryDate) next.expiryText = null; }
    if (next.issueDate && next.expiryDate && next.expiryDate < next.issueDate) throw new Error('Expiry date cannot be before the issue date.');
    if (input.renewalCost !== undefined) next.renewalCost = money(input.renewalCost, 'renewal cost', { allowNull: true });
    if (input.renewalLeadDays !== undefined) next.renewalLeadDays = integer(input.renewalLeadDays, 'Reminder lead days', { min: 0, max: 365 });
    if (input.autoRenew !== undefined) next.autoRenew = !!input.autoRenew;
    if (input.holder !== undefined) next.holder = text(input.holder, 'holder', { max: 80, required: false });
    if (input.familyPersonId !== undefined) next.familyPersonId = input.familyPersonId || null;
    if (input.identifier !== undefined) { const raw = text(input.identifier, 'identifier', { max: 60, required: false }); next.identifier = raw.length > 4 ? `••••${raw.slice(-4)}` : raw; }
    if (input.notes !== undefined) next.notes = text(input.notes, 'notes', { max: 1000, required: false });
    if (input.image !== undefined) next.image = input.image || null;
    if (input.quantity !== undefined) next.quantity = integer(input.quantity, 'Quantity', { min: 0, max: 100000, allowNull: true });
    if (input.value !== undefined) next.value = money(input.value, 'value', { allowNull: true });
    return next;
}

export const ValidityService = {
    load: async () => { await queue; return read(); },
    list: async (kind = null) => { const rows = await ValidityService.load(); return kind ? rows.filter(r => r.kind === kind) : rows; },
    add: input => mutate(rows => [{ id: newId('doc'), renewalLeadDays: 30, autoRenew: false, holder: '', identifier: '', notes: '', image: null, quantity: null, value: null, issueDate: null, expiryDate: null, ...fields(input), history: [], archived: false, createdAt: nowIso(), updatedAt: nowIso() }, ...rows]),
    update: (id, changes) => mutate(rows => {
        const current = rows.find(r => r.id === String(id));
        if (!current) throw new Error('This record is no longer available. Refresh the list.');
        return rows.map(r => (r.id === current.id ? { ...current, ...fields(changes, current), updatedAt: nowIso() } : r));
    }),
    /** Records a renewal: keeps the old expiry in history and moves the expiry forward. */
    renew: (id, { newExpiryDate, cost, note = '', date }) => mutate(rows => {
        const current = rows.find(r => r.id === String(id));
        if (!current) throw new Error('This record is no longer available. Refresh the list.');
        const expiry = optionalDate(newExpiryDate, 'new expiry date');
        if (!expiry) throw new Error('Enter the new expiry date.');
        if (current.expiryDate && expiry <= current.expiryDate) throw new Error('The new expiry date must be after the current one.');
        const entry = { id: newId('ren'), date: optionalDate(date, 'renewal date') || nowIso().slice(0, 10), previousExpiry: current.expiryDate, newExpiry: expiry, cost: money(cost, 'renewal cost', { allowNull: true }), note: text(note, 'a note', { max: 300, required: false }) };
        return rows.map(r => (r.id === current.id ? { ...current, expiryDate: expiry, expiryText: null, renewalCost: entry.cost ?? current.renewalCost, history: [entry, ...current.history], archived: false, updatedAt: nowIso() } : r));
    }),
    setArchived: (id, archived) => mutate(rows => rows.map(r => (r.id === String(id) ? { ...r, archived: !!archived, updatedAt: nowIso() } : r))),
    remove: id => mutate(rows => rows.filter(r => r.id !== String(id))),
    /** Convenience for expiry items: consume some quantity; archives automatically at zero. */
    consume: (id, amount = 1) => mutate(rows => rows.map(r => {
        if (r.id !== String(id)) return r;
        const quantity = Math.max(0, (r.quantity ?? 1) - integer(amount, 'Quantity', { min: 1, max: 100000 }));
        return { ...r, quantity, archived: quantity === 0 ? true : r.archived, updatedAt: nowIso() };
    }))
};
