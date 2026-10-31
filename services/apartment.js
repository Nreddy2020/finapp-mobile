import { StorageService, STORAGE_KEYS } from './storage';
import { createStore, newId, nowIso, text, money, optionalDate, integer, isDate } from './life/storeKit.js';

/**
 * Personal apartment (the home you live in): society dues you pay, your lease,
 * flatmates and shared bills. The business-side society ledger lives in
 * services/business/apartmentSocietyService.js.
 */
export const APARTMENT_HOME_STORAGE_KEY = 'finlife_apartment_home_v1';
export function emptyHome() { return { version: 1, lease: null, flatmates: [], sharedBills: [] }; }
export function validateHome(doc) {
    if (!doc || doc.version !== 1 || !Array.isArray(doc.flatmates) || !Array.isArray(doc.sharedBills)) throw new Error('Saved home data is unsupported or incomplete.');
    return doc;
}
const home = createStore({ key: APARTMENT_HOME_STORAGE_KEY, empty: emptyHome, validate: validateHome, label: 'home data' });

/** Lease facts derived for today: days to end, notice deadline, deposit. */
export function leaseStatus(lease, today) {
    if (!lease) return null;
    const days = d => Math.round((Date.parse(`${d}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
    const daysToEnd = lease.endDate ? days(lease.endDate) : null;
    const noticeBy = lease.endDate && lease.noticeDays ? new Date(Date.parse(`${lease.endDate}T12:00:00Z`) - lease.noticeDays * 86400000).toISOString().slice(0, 10) : null;
    const daysToNotice = noticeBy ? days(noticeBy) : null;
    const nextRentDue = (() => { if (!lease.rentDueDay) return null; const [y, m] = today.split('-').map(Number); const thisMonth = `${today.slice(0, 7)}-${String(lease.rentDueDay).padStart(2, '0')}`; if (thisMonth >= today) return thisMonth; const next = new Date(Date.UTC(y, m, 1)); return `${next.toISOString().slice(0, 7)}-${String(lease.rentDueDay).padStart(2, '0')}`; })();
    const state = daysToEnd === null ? 'open' : daysToEnd < 0 ? 'ended' : daysToEnd <= (lease.noticeDays || 30) ? 'renewal-window' : 'active';
    const yearlyRent = (lease.rent || 0) * 12;
    return { daysToEnd, noticeBy, daysToNotice, nextRentDue, state, yearlyRent, depositMonths: lease.rent ? Math.round(((lease.deposit || 0) / lease.rent) * 10) / 10 : null, escalatedRent: lease.escalationPercent ? Math.round(lease.rent * (1 + lease.escalationPercent / 100)) : null };
}
/** Who owes whom for shared bills in a month, settled to the fewest transfers. */
export function settleShared(bills, members) {
    const people = [...new Set([...members, ...bills.flatMap(b => [b.paidBy, ...(b.participants || [])])])].filter(Boolean);
    const balance = Object.fromEntries(people.map(p => [p, 0]));
    for (const b of bills) {
        const parts = (b.participants && b.participants.length ? b.participants : people).filter(p => p in balance);
        if (!parts.length) continue;
        const share = b.amount / parts.length;
        balance[b.paidBy] = (balance[b.paidBy] || 0) + b.amount;
        for (const p of parts) balance[p] -= share;
    }
    const creditors = Object.entries(balance).filter(([, v]) => v > 0.005).map(([p, v]) => ({ p, v })).sort((a, b) => b.v - a.v);
    const debtors = Object.entries(balance).filter(([, v]) => v < -0.005).map(([p, v]) => ({ p, v: -v })).sort((a, b) => b.v - a.v);
    const transfers = [];
    let i = 0, j = 0;
    while (i < creditors.length && j < debtors.length) {
        const amount = Math.min(creditors[i].v, debtors[j].v);
        transfers.push({ from: debtors[j].p, to: creditors[i].p, amount: Math.round(amount * 100) / 100 });
        creditors[i].v -= amount; debtors[j].v -= amount;
        if (creditors[i].v <= 0.005) i++; if (debtors[j].v <= 0.005) j++;
    }
    const total = bills.reduce((s, b) => s + b.amount, 0);
    return { total: Math.round(total * 100) / 100, perPerson: people.length ? Math.round((total / people.length) * 100) / 100 : 0, balances: Object.fromEntries(Object.entries(balance).map(([p, v]) => [p, Math.round(v * 100) / 100])), transfers };
}

export const ApartmentService = {
    getMaintenanceLogs: async () => {
        return await StorageService.load(STORAGE_KEYS.APARTMENT_DATA) || [];
    },

    addMaintenanceLog: async (log) => {
        const logs = await ApartmentService.getMaintenanceLogs();
        const amount = money(log.amount, 'amount');
        if (!String(log.month || '').trim()) throw new Error('Enter the month.');
        if (log.due_date && !isDate(log.due_date)) throw new Error('Enter the due date as YYYY-MM-DD.');
        const newLog = {
            id: newId('dues'),
            month: String(log.month).trim(),
            year: String(log.year || new Date().getFullYear()),
            amount,
            status: log.status || 'pending',
            due_date: log.due_date || null,
            paid_date: log.status === 'paid' ? nowIso().split('T')[0] : null
        };
        const updated = [newLog, ...logs];
        const saved = await StorageService.save(STORAGE_KEYS.APARTMENT_DATA, updated, { atomic: true });
        if (!saved?.success) throw new Error('Your dues could not be saved. Keep your changes and retry.');
        return updated;
    },

    updateLogStatus: async (id, status) => {
        const logs = await ApartmentService.getMaintenanceLogs();
        const updated = logs.map(l =>
            l.id === id ? { ...l, status: status, paid_date: status === 'paid' ? nowIso().split('T')[0] : null } : l
        );
        await StorageService.save(STORAGE_KEYS.APARTMENT_DATA, updated, { atomic: true });
        return updated;
    },

    removeLog: async (id) => {
        const logs = await ApartmentService.getMaintenanceLogs();
        const updated = logs.filter(l => l.id !== id);
        await StorageService.save(STORAGE_KEYS.APARTMENT_DATA, updated, { atomic: true });
        return updated;
    },

    /** Kept for compatibility: returns saved logs and never fabricates sample data. */
    seedDefaults: async () => ApartmentService.getMaintenanceLogs(),

    // --- Home: lease, flatmates, shared bills ---
    getHome: () => home.load(),
    saveLease: lease => home.mutate(doc => ({ ...doc, lease: lease === null ? null : {
        address: text(lease.address, 'the address', { max: 200 }),
        landlordName: text(lease.landlordName, 'landlord name', { max: 80, required: false }),
        landlordPhone: text(lease.landlordPhone, 'landlord phone', { max: 20, required: false }),
        rent: money(lease.rent, 'monthly rent'),
        deposit: money(lease.deposit ?? 0, 'deposit'),
        startDate: optionalDate(lease.startDate, 'start date'),
        endDate: optionalDate(lease.endDate, 'end date'),
        noticeDays: integer(lease.noticeDays ?? 30, 'Notice period (days)', { min: 0, max: 365 }),
        rentDueDay: integer(lease.rentDueDay ?? 1, 'Rent due day', { min: 1, max: 28 }),
        escalationPercent: money(lease.escalationPercent ?? 0, 'escalation'),
        notes: text(lease.notes, 'notes', { max: 1000, required: false }),
        updatedAt: nowIso()
    } })),
    setFlatmates: names => home.mutate(doc => ({ ...doc, flatmates: [...new Set(names.map(n => String(n || '').trim()).filter(Boolean))].slice(0, 20) })),
    addSharedBill: input => home.mutate(doc => ({ ...doc, sharedBills: [{ id: newId('bill'), name: text(input.name, 'a bill name', { max: 80 }), amount: money(input.amount, 'amount'), paidBy: text(input.paidBy, 'who paid', { max: 40 }), month: /^\d{4}-\d{2}$/.test(input.month || '') ? input.month : nowIso().slice(0, 7), participants: Array.isArray(input.participants) ? input.participants.filter(Boolean) : [], createdAt: nowIso() }, ...doc.sharedBills] })),
    removeSharedBill: id => home.mutate(doc => ({ ...doc, sharedBills: doc.sharedBills.filter(b => b.id !== id) }))
};
