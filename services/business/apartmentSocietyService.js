/**
 * services/business/apartmentSocietyService.js
 *
 * Apartment / housing-society management for committees, managers and small owners:
 * units and residents, monthly maintenance billing with idempotent invoice generation,
 * payments and late fees, expenses, vendors and AMC contracts, complaint tickets,
 * notices, meetings and decisions, visitor log, amenity bookings, reserve funds and
 * collection / profit reports. All amounts are in the user's currency units.
 */
import { createStore, newId, nowIso, text, money, optionalDate, integer, oneOf, isDate, daysBetween, addMonths } from '../life/storeKit.js';

export const APARTMENT_SOCIETY_STORAGE_KEY = 'finlife_business_apartment_v1';
export const OCCUPANCY = ['owner', 'tenant', 'vacant'];
export const INVOICE_STATUS = ['due', 'partial', 'paid', 'waived'];
export const EXPENSE_CATEGORIES = ['Security', 'Housekeeping', 'Electricity (common)', 'Water', 'Lift / AMC', 'Repairs', 'Gardening', 'Salaries', 'Insurance', 'Legal / Audit', 'Festival / Events', 'Other'];
export const TICKET_CATEGORIES = ['Plumbing', 'Electrical', 'Lift', 'Security', 'Cleanliness', 'Parking', 'Noise', 'Water', 'Other'];
export const TICKET_STATUS = ['open', 'in_progress', 'resolved', 'closed'];
export const TICKET_PRIORITY = ['low', 'normal', 'high', 'urgent'];
export const FUND_TYPES = ['maintenance', 'corpus', 'sinking'];
export const PAYMENT_MODES = ['cash', 'upi', 'bank', 'cheque', 'card', 'other'];

export const ADHOC_CATEGORIES = ['advance', 'lift', 'parking', 'function_hall', 'penalty', 'other'];

export function emptySociety() {
    return { version: 1, society: { name: '', address: '', maintenanceModel: 'flat', flatAmount: 0, ratePerSqft: 0, dueDay: 10, lateFeeType: 'none', lateFeeValue: 0, graceDays: 0, openingBalances: { maintenance: 0, corpus: 0, sinking: 0 } }, units: [], invoices: [], expenses: [], vendors: [], tickets: [], notices: [], meetings: [], visitors: [], amenities: [], bookings: [], funds: [], termDeposits: [], amcRecords: [], adhocCharges: [] };
}
const COLLECTIONS = ['units', 'invoices', 'expenses', 'vendors', 'tickets', 'notices', 'meetings', 'visitors', 'amenities', 'bookings', 'funds', 'termDeposits', 'amcRecords', 'adhocCharges'];
export function validateSociety(doc) {
    if (!doc || doc.version !== 1 || !doc.society || typeof doc.society !== 'object') throw new Error('Saved society data is unsupported or incomplete.');
    doc.termDeposits = doc.termDeposits || [];
    doc.amcRecords = doc.amcRecords || [];
    doc.adhocCharges = doc.adhocCharges || [];
    for (const key of COLLECTIONS) {
        if (!Array.isArray(doc[key])) doc[key] = [];
        const ids = new Set();
        for (const row of doc[key]) { if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error('Saved society data could not be read. Retry without replacing it.'); ids.add(row.id); }
    }
    return doc;
}
const store = createStore({ key: APARTMENT_SOCIETY_STORAGE_KEY, empty: emptySociety, validate: validateSociety, label: 'society data' });
function must(rows, id, what) { const row = rows.find(r => r.id === id); if (!row) throw new Error(`This ${what} is no longer available. Refresh the list.`); return row; }
function replace(doc, key, id, update, what = 'record') { must(doc[key], id, what); return { ...doc, [key]: doc[key].map(r => (r.id === id ? update(r) : r)) }; }
function remove(doc, key, id) { return { ...doc, [key]: doc[key].filter(r => r.id !== id) }; }
function period(value) { if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(value || '')) throw new Error('Enter a billing month as YYYY-MM.'); return value; }

/* ------------------------------ pure calculations ------------------------------ */
export function unitCharge(society, unit) {
    if (society.maintenanceModel === 'per_sqft') return Math.round(Number(unit.sqft || 0) * Number(society.ratePerSqft || 0) * 100) / 100;
    return Number(unit.customAmount ?? society.flatAmount ?? 0);
}
export function invoiceId(periodKey, unitId) { return `inv-${periodKey}-${unitId}`; }
export function invoicePaid(inv) { return Math.round(inv.payments.reduce((s, p) => s + p.amount, 0) * 100) / 100; }
export function invoiceBalance(inv) { return inv.status === 'waived' ? 0 : Math.max(0, Math.round((inv.amount + (inv.lateFee || 0) - invoicePaid(inv)) * 100) / 100); }
export function invoiceStatus(inv) { if (inv.status === 'waived') return 'waived'; const paid = invoicePaid(inv); if (paid <= 0) return 'due'; return paid >= inv.amount + (inv.lateFee || 0) ? 'paid' : 'partial'; }
export function lateFeeFor(society, inv, today) {
    if (society.lateFeeType === 'none' || inv.status === 'waived') return 0;
    const overdueDays = daysBetween(inv.dueDate, today) - (society.graceDays || 0);
    if (overdueDays <= 0 || invoiceStatus(inv) === 'paid') return inv.lateFee || 0;
    if (society.lateFeeType === 'flat') return money(society.lateFeeValue, 'late fee');
    return Math.round(inv.amount * (Number(society.lateFeeValue) / 100) * 100) / 100;
}
/** Deterministic, idempotent invoice generation for one billing month. */
export function generateInvoices(doc, periodKey, today) {
    period(periodKey);
    const dueDay = Math.min(28, Math.max(1, Number(doc.society.dueDay) || 10));
    const dueDate = `${periodKey}-${String(dueDay).padStart(2, '0')}`;
    const created = [];
    for (const unit of doc.units.filter(u => u.active !== false)) {
        const id = invoiceId(periodKey, unit.id);
        if (doc.invoices.some(i => i.id === id)) continue;
        const amount = unitCharge(doc.society, unit);
        if (amount <= 0) continue;
        created.push({ id, unitId: unit.id, period: periodKey, amount, lateFee: 0, dueDate, status: 'due', payments: [], createdAt: today ? `${today}T00:00:00.000Z` : nowIso() });
    }
    return { ...doc, invoices: [...created, ...doc.invoices] };
}
export function applyLateFees(doc, today) {
    return { ...doc, invoices: doc.invoices.map(inv => { const fee = lateFeeFor(doc.society, inv, today); return fee === (inv.lateFee || 0) ? inv : { ...inv, lateFee: fee }; }) };
}
export function collectionReport(doc, periodKey, today) {
    const invoices = doc.invoices.filter(i => i.period === periodKey);
    const billed = invoices.reduce((s, i) => s + (i.status === 'waived' ? 0 : i.amount + (i.lateFee || 0)), 0);
    const collected = invoices.reduce((s, i) => s + invoicePaid(i), 0);
    const outstanding = invoices.reduce((s, i) => s + invoiceBalance(i), 0);
    const defaulters = invoices.filter(i => invoiceBalance(i) > 0 && today && i.dueDate < today).map(i => ({ invoice: i, unit: doc.units.find(u => u.id === i.unitId) || null, balance: invoiceBalance(i), overdueDays: daysBetween(i.dueDate, today) }));
    return { period: periodKey, invoices: invoices.length, billed: r2(billed), collected: r2(collected), outstanding: r2(outstanding), efficiency: billed > 0 ? Math.round((collected / billed) * 100) : null, defaulters: defaulters.sort((a, b) => b.balance - a.balance) };
}
export function unitStatement(doc, unitId) {
    const invoices = doc.invoices.filter(i => i.unitId === unitId).sort((a, b) => b.period.localeCompare(a.period));
    return { unit: doc.units.find(u => u.id === unitId) || null, invoices, totalDue: r2(invoices.reduce((s, i) => s + invoiceBalance(i), 0)), totalPaid: r2(invoices.reduce((s, i) => s + invoicePaid(i), 0)) };
}
export function expenseReport(doc, periodKey) {
    const rows = doc.expenses.filter(e => e.date.startsWith(periodKey));
    const byCategory = {};
    for (const e of rows) byCategory[e.category] = r2((byCategory[e.category] || 0) + e.amount);
    return { period: periodKey, total: r2(rows.reduce((s, e) => s + e.amount, 0)), byCategory: Object.entries(byCategory).map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount), count: rows.length };
}
export function profitAndLoss(doc, periodKey, today) {
    const collection = collectionReport(doc, periodKey, today);
    const paymentsInPeriod = doc.invoices.flatMap(i => i.payments).filter(p => p.date.startsWith(periodKey)).reduce((s, p) => s + p.amount, 0);
    const expenses = expenseReport(doc, periodKey);
    const otherIncome = doc.funds.filter(f => f.type === 'maintenance' && f.direction === 'in' && f.date.startsWith(periodKey)).reduce((s, f) => s + f.amount, 0);
    return { period: periodKey, billed: collection.billed, cashCollected: r2(paymentsInPeriod), otherIncome: r2(otherIncome), expenses: expenses.total, surplus: r2(paymentsInPeriod + otherIncome - expenses.total), collectionEfficiency: collection.efficiency };
}
export function fundBalances(doc) {
    const opening = doc.society.openingBalances || {};
    const balances = Object.fromEntries(FUND_TYPES.map(t => [t, Number(opening[t] || 0)]));
    for (const f of doc.funds) balances[f.type] += f.direction === 'in' ? f.amount : -f.amount;
    balances.maintenance += doc.invoices.reduce((s, i) => s + invoicePaid(i), 0);
    for (const e of doc.expenses) balances[e.paidFrom || 'maintenance'] -= e.amount;
    for (const t of FUND_TYPES) balances[t] = r2(balances[t]);
    return balances;
}
export function occupancySummary(doc) {
    const active = doc.units.filter(u => u.active !== false);
    const counts = { owner: 0, tenant: 0, vacant: 0 };
    for (const u of active) counts[u.occupancy || 'vacant']++;
    return { total: active.length, ...counts, occupancyRate: active.length ? Math.round(((counts.owner + counts.tenant) / active.length) * 100) : null };
}
export function vendorAlerts(doc, today, leadDays = 30) {
    return doc.vendors.filter(v => v.active !== false && v.contractEnd).map(v => ({ vendor: v, daysLeft: daysBetween(today, v.contractEnd) })).filter(a => a.daysLeft <= leadDays).sort((a, b) => a.daysLeft - b.daysLeft);
}
export function ticketSummary(doc) {
    const open = doc.tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
    return { open: open.length, urgent: open.filter(t => t.priority === 'urgent' || t.priority === 'high').length, resolvedThisMonth: doc.tickets.filter(t => t.resolvedAt && t.resolvedAt.slice(0, 7) === nowIso().slice(0, 7)).length };
}
export function dashboard(doc, today) {
    const periodKey = today.slice(0, 7);
    return { occupancy: occupancySummary(doc), collection: collectionReport(doc, periodKey, today), previous: collectionReport(doc, addMonths(`${periodKey}-01`, -1).slice(0, 7), today), pnl: profitAndLoss(doc, periodKey, today), funds: fundBalances(doc), tickets: ticketSummary(doc), vendorAlerts: vendorAlerts(doc, today), visitorsInside: doc.visitors.filter(v => !v.outAt).length, pinnedNotices: doc.notices.filter(n => n.pinned && (!n.expiresOn || n.expiresOn >= today)), upcomingBookings: doc.bookings.filter(b => b.status === 'booked' && b.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5) };
}
export function generateBalanceSheet(doc, periodKey) {
    period(periodKey);
    const openingMaintenance = Number(doc.society.openingBalances?.maintenance || 0);

    // Invoices collected in this period
    const paymentsInPeriod = doc.invoices.flatMap(i => (i.payments || []).map(p => ({
        ...p,
        invoiceId: i.id,
        unitId: i.unitId,
        invoicePeriod: i.period
    }))).filter(p => p.date && p.date.startsWith(periodKey));

    // Group maintenance collections by Block
    const blockMap = {};
    for (const p of paymentsInPeriod) {
        const u = doc.units.find(x => x.id === p.unitId);
        const blockName = u?.block ? `${u.block} Block` : 'General';
        if (!blockMap[blockName]) blockMap[blockName] = { block: blockName, amount: 0, count: 0, units: new Set() };
        blockMap[blockName].amount += p.amount;
        blockMap[blockName].count += 1;
        if (u) blockMap[blockName].units.add(u.number);
    }
    const blockCollections = Object.values(blockMap).map(b => ({
        block: b.block,
        amount: r2(b.amount),
        count: b.count,
        unitCount: b.units.size
    })).sort((a, b) => a.block.localeCompare(b.block));

    const totalMaintenanceCollected = r2(paymentsInPeriod.reduce((s, p) => s + p.amount, 0));

    // Adhoc charges collected in this period (advances, lift, parking, function hall, etc.)
    const adhocPaidInPeriod = (doc.adhocCharges || []).filter(c => c.status === 'paid' && c.paidDate && c.paidDate.startsWith(periodKey));

    const advances = adhocPaidInPeriod.filter(c => c.category === 'advance');
    const liftCollections = adhocPaidInPeriod.filter(c => c.category === 'lift');
    const parkingCollections = adhocPaidInPeriod.filter(c => c.category === 'parking');
    const otherAdhoc = adhocPaidInPeriod.filter(c => !['advance', 'lift', 'parking'].includes(c.category));

    const totalAdvances = r2(advances.reduce((s, c) => s + c.amount, 0));
    const totalLift = r2(liftCollections.reduce((s, c) => s + c.amount, 0));
    const totalParking = r2(parkingCollections.reduce((s, c) => s + c.amount, 0));
    const totalOtherAdhoc = r2(otherAdhoc.reduce((s, c) => s + c.amount, 0));

    const totalCollectionsThisMonth = r2(totalMaintenanceCollected + totalAdvances + totalLift + totalParking + totalOtherAdhoc);
    const totalInflows = r2(openingMaintenance + totalCollectionsThisMonth);

    // Expenditures for this period
    const expensesInPeriod = (doc.expenses || []).filter(e => e.date && e.date.startsWith(periodKey));
    const totalExpenditure = r2(expensesInPeriod.reduce((s, e) => s + e.amount, 0));

    // Categorized breakdown of expenditures
    const expCategoryMap = {};
    for (const e of expensesInPeriod) {
        const cat = e.category || 'Other';
        if (!expCategoryMap[cat]) expCategoryMap[cat] = { category: cat, amount: 0, items: [] };
        expCategoryMap[cat].amount += e.amount;
        expCategoryMap[cat].items.push(e);
    }
    const categorizedExpenditure = Object.values(expCategoryMap).map(c => ({
        category: c.category,
        amount: r2(c.amount),
        items: c.items
    })).sort((a, b) => b.amount - a.amount);

    // Closing cash balance
    const closingBalance = r2(totalInflows - totalExpenditure);

    // Corpus Fund Term Deposits
    const termDeposits = (doc.termDeposits || []).filter(td => td.active !== false);
    const totalPrincipal = r2(termDeposits.reduce((s, td) => s + Number(td.principalAmount || 0), 0));
    const totalMaturity = r2(termDeposits.reduce((s, td) => s + Number(td.maturityAmount || 0), 0));
    const totalProjectedInterest = r2(totalMaturity - totalPrincipal);

    // AMC Collections vs Pending
    const currentYear = periodKey.slice(0, 4);
    const amcInYear = (doc.amcRecords || []).filter(r => String(r.year) === currentYear);
    const amcPaid = amcInYear.filter(r => r.status === 'paid');
    const amcCollected = r2(amcPaid.reduce((s, r) => s + Number(r.amount || 0), 0));
    const amcPending = amcInYear.filter(r => r.status === 'due');

    // Multi-month chronic defaulters
    const defaultersMap = {};
    for (const inv of (doc.invoices || [])) {
        const bal = invoiceBalance(inv);
        if (bal > 0) {
            if (!defaultersMap[inv.unitId]) defaultersMap[inv.unitId] = { unitId: inv.unitId, unpaidInvoices: [], adhocDue: 0 };
            defaultersMap[inv.unitId].unpaidInvoices.push(inv);
        }
    }
    for (const chg of (doc.adhocCharges || [])) {
        if (chg.status === 'due' && chg.unitId) {
            if (!defaultersMap[chg.unitId]) defaultersMap[chg.unitId] = { unitId: chg.unitId, unpaidInvoices: [], adhocDue: 0 };
            defaultersMap[chg.unitId].adhocDue += chg.amount;
        }
    }

    const defaultersLedger = Object.values(defaultersMap).map(d => {
        const unit = doc.units.find(u => u.id === d.unitId) || { number: d.unitId, block: '' };
        const maintenanceDue = r2(d.unpaidInvoices.reduce((s, i) => s + invoiceBalance(i), 0));
        const adhocDue = r2(d.adhocDue);
        const totalDue = r2(maintenanceDue + adhocDue);
        const periods = d.unpaidInvoices.map(i => i.period).sort();
        const monthCount = periods.length;
        const periodRange = monthCount > 1
            ? `${periods[0]} to ${periods[periods.length - 1]} (${monthCount} mos)`
            : monthCount === 1
                ? `${periods[0]} (1 mo)`
                : 'Adhoc only';
        return {
            unit,
            unitLabel: unit.block ? `${unit.block}-${unit.number}` : unit.number,
            monthCount,
            periodRange,
            maintenanceDue,
            adhocDue,
            totalDue,
            unpaidInvoices: d.unpaidInvoices
        };
    }).sort((a, b) => b.totalDue - a.totalDue);

    // Convenience UI mappings
    const blocks = {};
    for (const b of blockCollections) {
        const key = b.block.replace(/ Block$/, '').trim();
        blocks[key] = { count: b.count, collected: b.amount, flatCount: b.unitCount };
    }

    const groupedExpenditures = {};
    for (const c of categorizedExpenditure) {
        groupedExpenditures[c.category] = c.items;
    }

    const totalEligibleFlats = (amcPaid.length || 0) + (amcPending.length || 0);
    const paidPercentage = totalEligibleFlats ? Math.round((amcPaid.length / totalEligibleFlats) * 100) : 0;

    return {
        period: periodKey,
        openingBalance: openingMaintenance,
        receipts: {
            blockCollections,
            blocks,
            advances: {
                total: totalAdvances,
                items: advances.map(a => ({
                    ...a,
                    unitLabel: (() => {
                        const u = doc.units.find(x => x.id === a.unitId);
                        return u ? (u.block ? `${u.block}-${u.number}` : u.number) : a.title;
                    })()
                }))
            },
            liftCharges: {
                total: totalLift,
                items: liftCollections.map(l => ({
                    ...l,
                    unitLabel: (() => {
                        const u = doc.units.find(x => x.id === l.unitId);
                        return u ? (u.block ? `${u.block}-${u.number}` : u.number) : l.title;
                    })()
                }))
            },
            parkingRent: {
                total: totalParking,
                items: parkingCollections.map(p => ({
                    ...p,
                    description: p.title
                }))
            },
            otherAdhoc,
            totalMaintenanceCollected,
            totalAdvances,
            totalLift,
            totalParking,
            totalOtherAdhoc,
            totalCollections: totalCollectionsThisMonth,
            totalCollectionsThisMonth,
            totalInflows
        },
        expenditure: {
            categorized: categorizedExpenditure,
            grouped: groupedExpenditures,
            items: expensesInPeriod,
            totalExpenditure
        },
        closingBalance,
        termDeposits: {
            items: termDeposits,
            totalPrincipal,
            totalMaturity,
            totalYield: totalProjectedInterest,
            totalProjectedInterest
        },
        amc: {
            year: currentYear,
            collected: amcCollected,
            totalCollected: amcCollected,
            paidCount: amcPaid.length,
            paidFlatsCount: amcPaid.length,
            pendingCount: amcPending.length,
            pendingFlatsCount: amcPending.length,
            totalEligibleFlats,
            paidPercentage,
            pendingFlats: amcPending.map(p => {
                const u = doc.units.find(x => x.id === p.unitId);
                return u ? (u.block ? `${u.block}-${u.number}` : u.number) : p.unitId;
            })
        },
        defaultersLedger
    };
}

export function seedReferenceSociety(prevDoc) {
    const doc = emptySociety();
    doc.society = {
        name: 'Sri Venkateswara Enclave Flat Owners Welfare Association',
        address: 'Brodipet 4th Lane, Guntur, Andhra Pradesh 522002',
        maintenanceModel: 'flat',
        flatAmount: 2500,
        ratePerSqft: 0,
        dueDay: 10,
        lateFeeType: 'flat',
        lateFeeValue: 100,
        graceDays: 5,
        openingBalances: { maintenance: 29151, corpus: 584267, sinking: 50000 }
    };

    // Create Units for 3 Blocks: A (35), B (42), C (30) = 107 flats
    const units = [];
    const blockConfigs = [
        { block: 'A', count: 35, floors: 5 },
        { block: 'B', count: 42, floors: 6 },
        { block: 'C', count: 30, floors: 5 }
    ];

    for (const cfg of blockConfigs) {
        let created = 0;
        for (let fl = 1; fl <= cfg.floors && created < cfg.count; fl++) {
            const flatsPerFloor = Math.ceil(cfg.count / cfg.floors);
            for (let num = 1; num <= flatsPerFloor && created < cfg.count; num++) {
                const number = `${fl}${String(num).padStart(2, '0')}`;
                const id = `unit-${cfg.block}-${number}`;
                units.push({
                    id,
                    number,
                    block: cfg.block,
                    floor: String(fl),
                    sqft: 1100 + (num % 3) * 150,
                    ownerName: `Owner ${cfg.block}-${number}`,
                    ownerPhone: `98480${String(10000 + units.length).slice(1)}`,
                    occupancy: num === 2 ? 'tenant' : num === 6 ? 'vacant' : 'owner',
                    tenantName: num === 2 ? `Tenant ${cfg.block}-${number}` : '',
                    tenantPhone: num === 2 ? '9849012345' : '',
                    parking: `P-${cfg.block}${number}`,
                    customAmount: null,
                    notes: '',
                    active: true,
                    createdAt: '2026-01-01T00:00:00.000Z'
                });
                created++;
            }
        }
    }
    doc.units = units;

    // Generate Jan 2026 Invoices
    const invoices = [];
    for (const u of units) {
        const id = invoiceId('2026-01', u.id);
        invoices.push({
            id,
            unitId: u.id,
            period: '2026-01',
            amount: 2500,
            lateFee: 0,
            dueDate: '2026-01-10',
            status: 'due',
            payments: [],
            createdAt: '2026-01-01T00:00:00.000Z'
        });
    }

    // Allocate maintenance collections for Jan 2026:
    // A Block Collections: exactly ₹52,000
    // 20 flats * 2500 = 50,000 + 1 flat paying 2000 = 52,000
    let aTarget = 52000;
    const aInvs = invoices.filter(i => {
        const u = units.find(x => x.id === i.unitId);
        return u?.block === 'A';
    });
    for (const inv of aInvs) {
        if (aTarget <= 0) break;
        const payAmt = Math.min(aTarget, aTarget === 2000 ? 2000 : 2500);
        inv.payments.push({
            id: newId('pay'),
            amount: payAmt,
            date: '2026-01-08',
            mode: 'upi',
            reference: 'UPI/2601/A'
        });
        inv.status = payAmt === 2500 ? 'paid' : 'partial';
        aTarget -= payAmt;
    }

    // B Block Collections: exactly ₹68,900
    // 27 flats * 2500 = 67,500 + 1 flat paying 1400 = 68,900
    let bTarget = 68900;
    const bInvs = invoices.filter(i => {
        const u = units.find(x => x.id === i.unitId);
        return u?.block === 'B';
    });
    for (const inv of bInvs) {
        if (bTarget <= 0) break;
        const payAmt = Math.min(bTarget, bTarget < 2500 ? bTarget : 2500);
        inv.payments.push({
            id: newId('pay'),
            amount: payAmt,
            date: '2026-01-09',
            mode: 'bank',
            reference: 'NEFT/2601/B'
        });
        inv.status = payAmt === 2500 ? 'paid' : 'partial';
        bTarget -= payAmt;
    }

    // C Block Collections: exactly ₹34,500
    // 13 flats * 2500 = 32,500 + 1 flat paying 2000 = 34,500
    let cTarget = 34500;
    const cInvs = invoices.filter(i => {
        const u = units.find(x => x.id === i.unitId);
        return u?.block === 'C';
    });
    for (const inv of cInvs) {
        if (cTarget <= 0) break;
        const payAmt = Math.min(cTarget, cTarget < 2500 ? cTarget : 2500);
        inv.payments.push({
            id: newId('pay'),
            amount: payAmt,
            date: '2026-01-10',
            mode: 'cash',
            reference: 'REC/2601/C'
        });
        inv.status = payAmt === 2500 ? 'paid' : 'partial';
        cTarget -= payAmt;
    }

    // Previous multi-month arrears for chronic defaulters:
    // A-201: 11 months pending (Feb '25 – Dec '25) @ ₹2,500 = ₹27,500
    const uA201 = units.find(u => u.block === 'A' && u.number === '201');
    if (uA201) {
        const months = ['2025-02', '2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
        for (const m of months) {
            invoices.push({
                id: invoiceId(m, uA201.id),
                unitId: uA201.id,
                period: m,
                amount: 2500,
                lateFee: 0,
                dueDate: `${m}-10`,
                status: 'due',
                payments: [],
                createdAt: `${m}-01T00:00:00.000Z`
            });
        }
    }

    // A-407: 10 months pending (Mar '25 – Dec '25) = ₹25,000
    const uA407 = units.find(u => u.block === 'A' && u.number === '407');
    if (uA407) {
        const months = ['2025-03', '2025-04', '2025-05', '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
        for (const m of months) {
            invoices.push({
                id: invoiceId(m, uA407.id),
                unitId: uA407.id,
                period: m,
                amount: 2500,
                lateFee: 0,
                dueDate: `${m}-10`,
                status: 'due',
                payments: [],
                createdAt: `${m}-01T00:00:00.000Z`
            });
        }
    }

    // B-203: 6 months pending (Jul '25 – Dec '25) = ₹15,000
    const uB203 = units.find(u => u.block === 'B' && u.number === '203');
    if (uB203) {
        const months = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12'];
        for (const m of months) {
            invoices.push({
                id: invoiceId(m, uB203.id),
                unitId: uB203.id,
                period: m,
                amount: 2500,
                lateFee: 0,
                dueDate: `${m}-10`,
                status: 'due',
                payments: [],
                createdAt: `${m}-01T00:00:00.000Z`
            });
        }
    }

    // C-302: 4 months pending (Sep '25 – Dec '25) = ₹10,000
    const uC302 = units.find(u => u.block === 'C' && u.number === '302');
    if (uC302) {
        const months = ['2025-09', '2025-10', '2025-11', '2025-12'];
        for (const m of months) {
            invoices.push({
                id: invoiceId(m, uC302.id),
                unitId: uC302.id,
                period: m,
                amount: 2500,
                lateFee: 0,
                dueDate: `${m}-10`,
                status: 'due',
                payments: [],
                createdAt: `${m}-01T00:00:00.000Z`
            });
        }
    }

    // A-206: ₹14,100 pending maintenance
    const uA206 = units.find(u => u.block === 'A' && u.number === '206');
    if (uA206) {
        const months = ['2025-07', '2025-08', '2025-09', '2025-10', '2025-11'];
        for (const m of months) {
            invoices.push({
                id: invoiceId(m, uA206.id),
                unitId: uA206.id,
                period: m,
                amount: 2500,
                lateFee: 0,
                dueDate: `${m}-10`,
                status: 'due',
                payments: [],
                createdAt: `${m}-01T00:00:00.000Z`
            });
        }
        // One partial invoice for ₹1,600 balance (total 5*2500 + 1600 = 14,100)
        invoices.push({
            id: invoiceId('2025-12', uA206.id),
            unitId: uA206.id,
            period: '2025-12',
            amount: 2500,
            lateFee: 0,
            dueDate: '2025-12-10',
            status: 'partial',
            payments: [{ id: newId('pay'), amount: 900, date: '2025-12-15', mode: 'upi' }],
            createdAt: '2025-12-01T00:00:00.000Z'
        });
    }

    doc.invoices = invoices;

    // Adhoc Charges (Advances, Lift, Parking, Function Hall)
    const uA306 = units.find(u => u.block === 'A' && u.number === '306');
    const uB404 = units.find(u => u.block === 'B' && u.number === '404');
    const uA301 = units.find(u => u.block === 'A' && u.number === '301');

    doc.adhocCharges = [
        { id: 'adhoc-adv-a306', unitId: uA306?.id || null, category: 'advance', title: 'Maintenance advance A-306', period: '2026-01', amount: 2500, date: '2026-01-08', status: 'paid', paidDate: '2026-01-08', paymentMode: 'upi', notes: 'Prepaid for Feb 2026' },
        { id: 'adhoc-adv-b404', unitId: uB404?.id || null, category: 'advance', title: 'Maintenance advance B-404', period: '2026-01', amount: 2600, date: '2026-01-10', status: 'paid', paidDate: '2026-01-10', paymentMode: 'bank', notes: 'Prepaid for Feb 2026' },
        { id: 'adhoc-lift-a301', unitId: uA301?.id || null, category: 'lift', title: 'Lift usage charges A-301', period: '2026-01', amount: 500, date: '2026-01-05', status: 'paid', paidDate: '2026-01-05', paymentMode: 'cash', notes: 'Materials transport' },
        { id: 'adhoc-lift-a306', unitId: uA306?.id || null, category: 'lift', title: 'Lift usage charges A-306', period: '2026-01', amount: 500, date: '2026-01-08', status: 'paid', paidDate: '2026-01-08', paymentMode: 'cash', notes: 'Renovation shifting' },
        { id: 'adhoc-park-genshed', unitId: null, category: 'parking', title: 'Parking rent (Gen.shed Jan-Feb 2026)', period: '2026-01', amount: 1100, date: '2026-01-04', status: 'paid', paidDate: '2026-01-04', paymentMode: 'cash', notes: '2 months advance shed rent' },
        { id: 'adhoc-fn-a206', unitId: uA206?.id || null, category: 'function_hall', title: 'Community hall booking charges A-206', period: '2026-01', amount: 500, date: '2026-01-15', status: 'due', paidDate: null, paymentMode: null, notes: 'Family gathering event' }
    ];

    // January 2026 Expenditures matching reference sheet:
    // Total = ₹1,65,882
    doc.expenses = [
        // Salaries (₹52,500)
        { id: 'exp-sal-mariadas', date: '2026-01-05', category: 'Salaries', description: 'Watchman Mariadas Salary', amount: 11000, paidFrom: 'maintenance', recurring: true, createdAt: '2026-01-05T10:00:00.000Z' },
        { id: 'exp-sal-manohar', date: '2026-01-05', category: 'Salaries', description: 'Watchman Manohar Salary', amount: 10500, paidFrom: 'maintenance', recurring: true, createdAt: '2026-01-05T10:00:00.000Z' },
        { id: 'exp-sal-sup', date: '2026-01-05', category: 'Salaries', description: 'Society Supervisor Monthly Salary', amount: 9000, paidFrom: 'maintenance', recurring: true, createdAt: '2026-01-05T10:00:00.000Z' },
        { id: 'exp-sec-agency', date: '2026-01-06', category: 'Security', description: 'Security Agency Monthly Contract', amount: 18000, paidFrom: 'maintenance', recurring: true, createdAt: '2026-01-06T10:00:00.000Z' },
        { id: 'exp-plum-elec', date: '2026-01-10', category: 'Repairs', description: 'Common Plumber & Electrician Monthly Retainer', amount: 4000, paidFrom: 'maintenance', recurring: true, createdAt: '2026-01-10T10:00:00.000Z' },

        // Power & Electricity (₹38,170)
        { id: 'exp-cur-a', date: '2026-01-12', category: 'Electricity (common)', description: 'Current Bill A-Block Common Meters', amount: 12450, paidFrom: 'maintenance', recurring: true, createdAt: '2026-01-12T10:00:00.000Z' },
        { id: 'exp-cur-b', date: '2026-01-12', category: 'Electricity (common)', description: 'Current Bill B-Block Common Meters', amount: 16800, paidFrom: 'maintenance', recurring: true, createdAt: '2026-01-12T10:00:00.000Z' },
        { id: 'exp-cur-c', date: '2026-01-12', category: 'Electricity (common)', description: 'Current Bill C-Block Common Meters', amount: 8920, paidFrom: 'maintenance', recurring: true, createdAt: '2026-01-12T10:00:00.000Z' },

        // Sanitation, Water & Plumbing (₹34,450)
        { id: 'exp-septic', date: '2026-01-14', category: 'Housekeeping', description: 'Septic Tank Cleaning (3 Blocks)', amount: 14500, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-14T10:00:00.000Z' },
        { id: 'exp-wtank-valve', date: '2026-01-16', category: 'Water', description: 'Overhead Water Tank Valve & Pipe Fittings', amount: 6850, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-16T10:00:00.000Z' },
        { id: 'exp-salt-c', date: '2026-01-18', category: 'Water', description: 'Water Softener Salt (Salt C-Block Plant)', amount: 3200, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-18T10:00:00.000Z' },
        { id: 'exp-manhole', date: '2026-01-20', category: 'Housekeeping', description: 'Manhole & Underground Drainage Cleaning', amount: 4500, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-20T10:00:00.000Z' },
        { id: 'exp-pump-valve', date: '2026-01-22', category: 'Repairs', description: 'Borewell Pump Valve Replacement', amount: 5400, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-22T10:00:00.000Z' },

        // Community & Festivals (₹10,300)
        { id: 'exp-rep-day', date: '2026-01-26', category: 'Festival / Events', description: 'Republic Day Celebrations & Sweets Distribution', amount: 6500, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-26T10:00:00.000Z' },
        { id: 'exp-sankranti', date: '2026-01-14', category: 'Festival / Events', description: 'Sankranti Rangoli Competition & Prizes', amount: 3800, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-14T10:00:00.000Z' },

        // Admin & Facilities (₹30,462)
        { id: 'exp-xerox', date: '2026-01-08', category: 'Other', description: 'Xerox, Notices & Society Stationery', amount: 1650, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-08T10:00:00.000Z' },
        { id: 'exp-torch', date: '2026-01-09', category: 'Security', description: 'Security Heavy-duty Torch Lights & Rechargeable Cells', amount: 2400, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-09T10:00:00.000Z' },
        { id: 'exp-swing', date: '2026-01-24', category: 'Repairs', description: 'Children Play Area Swing (Vuyyala) Repairs', amount: 4812, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-24T10:00:00.000Z' },
        { id: 'exp-welding', date: '2026-01-28', category: 'Repairs', description: 'Machine Work, Main Gate Welding & Iron Fabrication', amount: 21600, paidFrom: 'maintenance', recurring: false, createdAt: '2026-01-28T10:00:00.000Z' }
    ];

    // Term Deposits (Corpus FDs totaling Principal: ₹5,84,267, Maturity: ₹6,20,732 @ 6.1%)
    doc.termDeposits = [
        {
            id: 'td-sbi-1',
            bank: 'State Bank of India',
            accountOrCertNo: 'SBI-FD-98214',
            depositDate: '2025-06-15',
            maturityDate: '2026-06-15',
            principalAmount: 150000,
            interestRate: 6.1,
            maturityAmount: 159150,
            fundType: 'corpus',
            active: true,
            notes: 'Corpus Reserve Fixed Deposit 1'
        },
        {
            id: 'td-sbi-2',
            bank: 'State Bank of India',
            accountOrCertNo: 'SBI-FD-98432',
            depositDate: '2025-08-20',
            maturityDate: '2026-08-20',
            principalAmount: 200000,
            interestRate: 6.1,
            maturityAmount: 212200,
            fundType: 'corpus',
            active: true,
            notes: 'Corpus Reserve Fixed Deposit 2'
        },
        {
            id: 'td-ubi-1',
            bank: 'Union Bank of India',
            accountOrCertNo: 'UBI-FD-55410',
            depositDate: '2025-10-10',
            maturityDate: '2026-10-10',
            principalAmount: 134267,
            interestRate: 6.1,
            maturityAmount: 142457,
            fundType: 'corpus',
            active: true,
            notes: 'Corpus Reserve Fixed Deposit 3'
        },
        {
            id: 'td-ubi-2',
            bank: 'Union Bank of India',
            accountOrCertNo: 'UBI-FD-55872',
            depositDate: '2025-11-05',
            maturityDate: '2026-11-05',
            principalAmount: 100000,
            interestRate: 6.1,
            maturityAmount: 106925,
            fundType: 'corpus',
            active: true,
            notes: 'Corpus Reserve Fixed Deposit 4'
        }
    ];

    // AMC Records (₹1,000 / flat, 92 paid = ₹92,000, 5 pending)
    const amcRecords = [];
    const pendingAmcUnits = new Set(['unit-A-201', 'unit-A-206', 'unit-B-105', 'unit-B-302', 'unit-C-104']);
    let paidCount = 0;
    for (const u of units) {
        if (pendingAmcUnits.has(u.id)) {
            amcRecords.push({
                id: `amc-2026-${u.id}`,
                unitId: u.id,
                year: '2026',
                amount: 1000,
                status: 'due',
                paidDate: null,
                receiptNo: '',
                notes: 'Pending annual sinking fund levy'
            });
        } else if (paidCount < 92) {
            amcRecords.push({
                id: `amc-2026-${u.id}`,
                unitId: u.id,
                year: '2026',
                amount: 1000,
                status: 'paid',
                paidDate: '2026-01-15',
                receiptNo: `AMC-26-${String(paidCount + 1).padStart(3, '0')}`,
                notes: 'Annual sinking fund levy'
            });
            paidCount++;
        }
    }
    doc.amcRecords = amcRecords;

    // Vendors & Contracts
    doc.vendors = [
        { id: 'ven-sec', name: 'SafeGuard Security Solutions', service: 'Security Agency (3 guards 24/7)', phone: '9848011223', contractStart: '2025-04-01', contractEnd: '2026-03-31', monthlyCost: 18000, notes: 'Day & Night shifts', active: true, createdAt: '2025-04-01T00:00:00.000Z' },
        { id: 'ven-lift', name: 'Johnson Lifts & Escalators', service: 'Annual Maintenance Contract (AMC)', phone: '0863-2233445', contractStart: '2025-02-01', contractEnd: '2026-01-31', monthlyCost: 6500, notes: 'Comprehensive AMC for 3 Passenger Lifts', active: true, createdAt: '2025-02-01T00:00:00.000Z' }
    ];

    // Notices
    doc.notices = [
        { id: 'ntc-1', title: 'Annual General Body Meeting (AGM) Notice', body: 'Monthly general body meeting on Sunday 25th Jan at 10 AM in the clubhouse to review Jan 2026 balance sheet and elevator AMC renewal.', date: '2026-01-15', pinned: true, expiresOn: '2026-01-31', createdAt: '2026-01-15T10:00:00.000Z' },
        { id: 'ntc-2', title: 'Republic Day Celebration at 8:30 AM', body: 'All residents are invited with family for flag hoisting followed by sweets and rangoli competition awards ceremony.', date: '2026-01-20', pinned: true, expiresOn: '2026-01-27', createdAt: '2026-01-20T10:00:00.000Z' }
    ];

    return doc;
}

function r2(n) { return Math.round(n * 100) / 100; }

/* ------------------------------ service ------------------------------ */
export const ApartmentSocietyService = {
    load: () => store.load(),
    updateSociety: changes => store.mutate(doc => {
        const s = { ...doc.society };
        if (changes.name !== undefined) s.name = text(changes.name, 'a society name', { max: 120, required: false });
        if (changes.address !== undefined) s.address = text(changes.address, 'address', { max: 300, required: false });
        if (changes.maintenanceModel !== undefined) s.maintenanceModel = oneOf(changes.maintenanceModel, ['flat', 'per_sqft'], 'maintenance model');
        if (changes.flatAmount !== undefined) s.flatAmount = money(changes.flatAmount, 'monthly maintenance');
        if (changes.ratePerSqft !== undefined) s.ratePerSqft = money(changes.ratePerSqft, 'rate per sq ft');
        if (changes.dueDay !== undefined) s.dueDay = integer(changes.dueDay, 'Due day', { min: 1, max: 28 });
        if (changes.lateFeeType !== undefined) s.lateFeeType = oneOf(changes.lateFeeType, ['none', 'flat', 'percent'], 'late fee type');
        if (changes.lateFeeValue !== undefined) s.lateFeeValue = money(changes.lateFeeValue, 'late fee');
        if (changes.graceDays !== undefined) s.graceDays = integer(changes.graceDays, 'Grace days', { min: 0, max: 60 });
        if (changes.openingBalances !== undefined) s.openingBalances = Object.fromEntries(FUND_TYPES.map(t => [t, money(changes.openingBalances[t] ?? 0, `${t} opening balance`, { min: -1e13 })]));
        return { ...doc, society: s };
    }),
    addUnit: input => store.mutate(doc => {
        const number = text(input.number, 'a unit number', { max: 20 });
        if (doc.units.some(u => u.number.toLowerCase() === number.toLowerCase() && (u.block || '') === (input.block || '').trim())) throw new Error('A unit with this number already exists in that block.');
        return { ...doc, units: [...doc.units, { id: newId('unit'), number, block: text(input.block, 'block', { max: 20, required: false }), floor: text(input.floor, 'floor', { max: 10, required: false }), sqft: integer(input.sqft ?? 0, 'Area (sq ft)', { min: 0, max: 100000 }), ownerName: text(input.ownerName, 'owner name', { max: 80, required: false }), ownerPhone: text(input.ownerPhone, 'owner phone', { max: 20, required: false }), occupancy: oneOf(input.occupancy || 'owner', OCCUPANCY, 'occupancy'), tenantName: text(input.tenantName, 'tenant name', { max: 80, required: false }), tenantPhone: text(input.tenantPhone, 'tenant phone', { max: 20, required: false }), parking: text(input.parking, 'parking', { max: 40, required: false }), customAmount: money(input.customAmount, 'custom maintenance', { allowNull: true }), notes: text(input.notes, 'notes', { max: 500, required: false }), active: true, createdAt: nowIso() }].sort((a, b) => a.block.localeCompare(b.block) || a.number.localeCompare(b.number, undefined, { numeric: true })) };
    }),
    updateUnit: (id, changes) => store.mutate(doc => replace(doc, 'units', id, u => {
        const n = { ...u };
        for (const [key, max] of [['number', 20], ['block', 20], ['floor', 10], ['ownerName', 80], ['ownerPhone', 20], ['tenantName', 80], ['tenantPhone', 20], ['parking', 40], ['notes', 500]]) if (changes[key] !== undefined) n[key] = text(changes[key], key, { max, required: key === 'number' });
        if (changes.sqft !== undefined) n.sqft = integer(changes.sqft, 'Area (sq ft)', { min: 0, max: 100000 });
        if (changes.occupancy !== undefined) n.occupancy = oneOf(changes.occupancy, OCCUPANCY, 'occupancy');
        if (changes.customAmount !== undefined) n.customAmount = money(changes.customAmount, 'custom maintenance', { allowNull: true });
        if (changes.active !== undefined) n.active = !!changes.active;
        return n;
    }, 'unit')),
    removeUnit: id => store.mutate(doc => { if (doc.invoices.some(i => i.unitId === id)) throw new Error('This unit has billing history. Mark it inactive instead of deleting.'); return remove(doc, 'units', id); }),
    generateInvoices: (periodKey, today = nowIso().slice(0, 10)) => store.mutate(doc => applyLateFees(generateInvoices(doc, periodKey, today), today)),
    refreshLateFees: (today = nowIso().slice(0, 10)) => store.mutate(doc => applyLateFees(doc, today)),
    recordPayment: (invoiceIdValue, { amount, date, mode = 'upi', reference = '' }) => store.mutate(doc => replace(doc, 'invoices', invoiceIdValue, inv => {
        const value = money(amount, 'payment amount');
        if (value <= 0) throw new Error('Enter a payment amount.');
        if (inv.status === 'waived') throw new Error('This invoice was waived.');
        if (value > invoiceBalance(inv) + 0.005) throw new Error('Payment exceeds the outstanding balance.');
        const payment = { id: newId('pay'), amount: value, date: optionalDate(date, 'payment date') || nowIso().slice(0, 10), mode: oneOf(mode, PAYMENT_MODES, 'payment mode'), reference: text(reference, 'reference', { max: 60, required: false }) };
        const next = { ...inv, payments: [...inv.payments, payment] };
        return { ...next, status: invoiceStatus(next) };
    }, 'invoice')),
    waiveInvoice: (invoiceIdValue, reason = '') => store.mutate(doc => replace(doc, 'invoices', invoiceIdValue, inv => ({ ...inv, status: 'waived', waivedReason: text(reason, 'a reason', { max: 200, required: false }) }), 'invoice')),
    removeInvoice: id => store.mutate(doc => { const inv = must(doc.invoices, id, 'invoice'); if (inv.payments.length) throw new Error('This invoice has payments. Waive it instead of deleting.'); return remove(doc, 'invoices', id); }),
    addExpense: input => store.mutate(doc => ({ ...doc, expenses: [{ id: newId('exp'), date: optionalDate(input.date, 'expense date') || nowIso().slice(0, 10), category: oneOf(input.category || 'Other', EXPENSE_CATEGORIES, 'category'), vendorId: input.vendorId || null, description: text(input.description, 'a description', { max: 200 }), amount: money(input.amount, 'amount'), paidFrom: oneOf(input.paidFrom || 'maintenance', FUND_TYPES, 'fund'), recurring: !!input.recurring, createdAt: nowIso() }, ...doc.expenses] })),
    removeExpense: id => store.mutate(doc => remove(doc, 'expenses', id)),
    addVendor: input => store.mutate(doc => ({ ...doc, vendors: [...doc.vendors, { id: newId('ven'), name: text(input.name, 'a vendor name', { max: 100 }), service: text(input.service, 'service', { max: 80, required: false }), phone: text(input.phone, 'phone', { max: 20, required: false }), contractStart: optionalDate(input.contractStart, 'contract start'), contractEnd: optionalDate(input.contractEnd, 'contract end'), monthlyCost: money(input.monthlyCost, 'monthly cost', { allowNull: true }), notes: text(input.notes, 'notes', { max: 500, required: false }), active: true, createdAt: nowIso() }] })),
    updateVendor: (id, changes) => store.mutate(doc => replace(doc, 'vendors', id, v => ({ ...v, ...(changes.active !== undefined ? { active: !!changes.active } : {}), ...(changes.contractEnd !== undefined ? { contractEnd: optionalDate(changes.contractEnd, 'contract end') } : {}), ...(changes.monthlyCost !== undefined ? { monthlyCost: money(changes.monthlyCost, 'monthly cost', { allowNull: true }) } : {}), ...(changes.notes !== undefined ? { notes: text(changes.notes, 'notes', { max: 500, required: false }) } : {}) }), 'vendor')),
    removeVendor: id => store.mutate(doc => remove(doc, 'vendors', id)),
    addTicket: input => store.mutate(doc => ({ ...doc, tickets: [{ id: newId('tkt'), unitId: input.unitId || null, title: text(input.title, 'a complaint title', { max: 160 }), category: oneOf(input.category || 'Other', TICKET_CATEGORIES, 'category'), priority: oneOf(input.priority || 'normal', TICKET_PRIORITY, 'priority'), status: 'open', description: text(input.description, 'description', { max: 1000, required: false }), updates: [], createdAt: nowIso(), resolvedAt: null }, ...doc.tickets] })),
    updateTicket: (id, { status, note = '', priority }) => store.mutate(doc => replace(doc, 'tickets', id, t => {
        const nextStatus = status !== undefined ? oneOf(status, TICKET_STATUS, 'status') : t.status;
        const update = { id: newId('upd'), date: nowIso(), status: nextStatus, text: text(note, 'a note', { max: 500, required: false }) };
        return { ...t, status: nextStatus, priority: priority !== undefined ? oneOf(priority, TICKET_PRIORITY, 'priority') : t.priority, updates: [...t.updates, update], resolvedAt: ['resolved', 'closed'].includes(nextStatus) ? (t.resolvedAt || nowIso()) : null };
    }, 'ticket')),
    removeTicket: id => store.mutate(doc => remove(doc, 'tickets', id)),
    addNotice: input => store.mutate(doc => ({ ...doc, notices: [{ id: newId('ntc'), title: text(input.title, 'a title', { max: 160 }), body: text(input.body, 'notice text', { max: 3000, required: false }), date: optionalDate(input.date, 'date') || nowIso().slice(0, 10), pinned: !!input.pinned, expiresOn: optionalDate(input.expiresOn, 'expiry date'), createdAt: nowIso() }, ...doc.notices] })),
    togglePin: id => store.mutate(doc => replace(doc, 'notices', id, n => ({ ...n, pinned: !n.pinned }), 'notice')),
    removeNotice: id => store.mutate(doc => remove(doc, 'notices', id)),
    addMeeting: input => store.mutate(doc => ({ ...doc, meetings: [{ id: newId('mtg'), date: optionalDate(input.date, 'meeting date') || nowIso().slice(0, 10), title: text(input.title, 'a meeting title', { max: 160 }), agenda: text(input.agenda, 'agenda', { max: 3000, required: false }), minutes: text(input.minutes, 'minutes', { max: 5000, required: false }), decisions: [], createdAt: nowIso() }, ...doc.meetings].sort((a, b) => b.date.localeCompare(a.date)) })),
    updateMeeting: (id, changes) => store.mutate(doc => replace(doc, 'meetings', id, m => ({ ...m, ...(changes.minutes !== undefined ? { minutes: text(changes.minutes, 'minutes', { max: 5000, required: false }) } : {}), ...(changes.agenda !== undefined ? { agenda: text(changes.agenda, 'agenda', { max: 3000, required: false }) } : {}) }), 'meeting')),
    addDecision: (meetingId, { text: decisionText, ownerName = '', dueDate }) => store.mutate(doc => replace(doc, 'meetings', meetingId, m => ({ ...m, decisions: [...m.decisions, { id: newId('dec'), text: text(decisionText, 'a decision', { max: 500 }), ownerName: text(ownerName, 'owner', { max: 80, required: false }), dueDate: optionalDate(dueDate, 'due date'), done: false }] }), 'meeting')),
    toggleDecision: (meetingId, decisionId) => store.mutate(doc => replace(doc, 'meetings', meetingId, m => ({ ...m, decisions: m.decisions.map(d => (d.id === decisionId ? { ...d, done: !d.done } : d)) }), 'meeting')),
    removeMeeting: id => store.mutate(doc => remove(doc, 'meetings', id)),
    checkInVisitor: input => store.mutate(doc => ({ ...doc, visitors: [{ id: newId('vis'), unitId: input.unitId || null, name: text(input.name, 'a visitor name', { max: 80 }), purpose: text(input.purpose, 'purpose', { max: 120, required: false }), vehicle: text(input.vehicle, 'vehicle', { max: 20, required: false }), inAt: nowIso(), outAt: null }, ...doc.visitors] })),
    checkOutVisitor: id => store.mutate(doc => replace(doc, 'visitors', id, v => ({ ...v, outAt: v.outAt || nowIso() }), 'visitor')),
    removeVisitor: id => store.mutate(doc => remove(doc, 'visitors', id)),
    addAmenity: input => store.mutate(doc => ({ ...doc, amenities: [...doc.amenities, { id: newId('amn'), name: text(input.name, 'an amenity name', { max: 80 }), fee: money(input.fee ?? 0, 'booking fee'), slots: (input.slots && String(input.slots).trim()) ? String(input.slots).split(',').map(s => s.trim()).filter(Boolean) : ['Morning', 'Afternoon', 'Evening'], createdAt: nowIso() }] })),
    removeAmenity: id => store.mutate(doc => remove(doc, 'amenities', id)),
    bookAmenity: input => store.mutate(doc => {
        const amenity = must(doc.amenities, input.amenityId, 'amenity');
        const date = optionalDate(input.date, 'booking date'); if (!date) throw new Error('Enter the booking date.');
        const slot = text(input.slot, 'a slot', { max: 40 });
        if (!amenity.slots.includes(slot)) throw new Error('Choose one of the available slots.');
        if (doc.bookings.some(b => b.amenityId === amenity.id && b.date === date && b.slot === slot && b.status === 'booked')) throw new Error('That slot is already booked.');
        return { ...doc, bookings: [{ id: newId('bkg'), amenityId: amenity.id, unitId: input.unitId || null, date, slot, fee: amenity.fee, status: 'booked', createdAt: nowIso() }, ...doc.bookings] };
    }),
    cancelBooking: id => store.mutate(doc => replace(doc, 'bookings', id, b => ({ ...b, status: 'cancelled' }), 'booking')),
    addFundEntry: input => store.mutate(doc => ({ ...doc, funds: [{ id: newId('fnd'), type: oneOf(input.type || 'corpus', FUND_TYPES, 'fund'), direction: oneOf(input.direction || 'in', ['in', 'out'], 'direction'), date: optionalDate(input.date, 'date') || nowIso().slice(0, 10), amount: money(input.amount, 'amount'), note: text(input.note, 'a note', { max: 200, required: false }), unitId: input.unitId || null, createdAt: nowIso() }, ...doc.funds] })),
    removeFundEntry: id => store.mutate(doc => remove(doc, 'funds', id)),
    addTermDeposit: input => store.mutate(doc => ({
        ...doc,
        termDeposits: [
            {
                id: newId('td'),
                bank: text(input.bank, 'bank name', { max: 100 }),
                accountOrCertNo: text(input.accountOrCertNo, 'certificate or account number', { max: 60, required: false }),
                depositDate: optionalDate(input.depositDate, 'deposit date') || nowIso().slice(0, 10),
                maturityDate: optionalDate(input.maturityDate, 'maturity date') || nowIso().slice(0, 10),
                principalAmount: money(input.principalAmount, 'principal amount'),
                interestRate: Number(input.interestRate || 0),
                maturityAmount: money(input.maturityAmount, 'maturity amount'),
                fundType: oneOf(input.fundType || 'corpus', FUND_TYPES, 'fund type'),
                active: true,
                notes: text(input.notes, 'notes', { max: 500, required: false }),
                createdAt: nowIso()
            },
            ...(doc.termDeposits || [])
        ]
    })),
    updateTermDeposit: (id, changes) => store.mutate(doc => replace(doc, 'termDeposits', id, td => ({
        ...td,
        ...(changes.bank !== undefined ? { bank: text(changes.bank, 'bank name', { max: 100 }) } : {}),
        ...(changes.accountOrCertNo !== undefined ? { accountOrCertNo: text(changes.accountOrCertNo, 'certificate number', { max: 60, required: false }) } : {}),
        ...(changes.depositDate !== undefined ? { depositDate: optionalDate(changes.depositDate, 'deposit date') } : {}),
        ...(changes.maturityDate !== undefined ? { maturityDate: optionalDate(changes.maturityDate, 'maturity date') } : {}),
        ...(changes.principalAmount !== undefined ? { principalAmount: money(changes.principalAmount, 'principal amount') } : {}),
        ...(changes.interestRate !== undefined ? { interestRate: Number(changes.interestRate || 0) } : {}),
        ...(changes.maturityAmount !== undefined ? { maturityAmount: money(changes.maturityAmount, 'maturity amount') } : {}),
        ...(changes.active !== undefined ? { active: !!changes.active } : {}),
        ...(changes.notes !== undefined ? { notes: text(changes.notes, 'notes', { max: 500, required: false }) } : {})
    }), 'term deposit')),
    removeTermDeposit: id => store.mutate(doc => remove(doc, 'termDeposits', id)),
    addAdhocCharge: input => store.mutate(doc => ({
        ...doc,
        adhocCharges: [
            {
                id: newId('chg'),
                unitId: input.unitId || null,
                category: oneOf(input.category || 'other', ADHOC_CATEGORIES, 'category'),
                title: text(input.title, 'charge title', { max: 160 }),
                period: input.period ? period(input.period) : nowIso().slice(0, 7),
                amount: money(input.amount, 'amount'),
                date: optionalDate(input.date, 'date') || nowIso().slice(0, 10),
                status: input.status === 'paid' ? 'paid' : 'due',
                paidDate: input.status === 'paid' ? (optionalDate(input.paidDate, 'paid date') || nowIso().slice(0, 10)) : null,
                paymentMode: input.paymentMode ? oneOf(input.paymentMode, PAYMENT_MODES, 'payment mode') : 'cash',
                notes: text(input.notes, 'notes', { max: 500, required: false }),
                createdAt: nowIso()
            },
            ...(doc.adhocCharges || [])
        ]
    })),
    recordAdhocPayment: (id, { date, mode = 'cash', reference = '' }) => store.mutate(doc => replace(doc, 'adhocCharges', id, chg => ({
        ...chg,
        status: 'paid',
        paidDate: optionalDate(date, 'paid date') || nowIso().slice(0, 10),
        paymentMode: oneOf(mode, PAYMENT_MODES, 'payment mode'),
        reference: text(reference, 'reference', { max: 60, required: false })
    }), 'adhoc charge')),
    removeAdhocCharge: id => store.mutate(doc => remove(doc, 'adhocCharges', id)),
    recordAmcPayment: input => store.mutate(doc => {
        const year = String(input.year || new Date().getFullYear());
        const existingIdx = (doc.amcRecords || []).findIndex(r => r.unitId === input.unitId && String(r.year) === year);
        const record = {
            id: existingIdx >= 0 ? doc.amcRecords[existingIdx].id : newId('amc'),
            unitId: text(input.unitId, 'unit', { max: 60 }),
            year,
            amount: money(input.amount || 1000, 'AMC amount'),
            status: input.status === 'due' ? 'due' : 'paid',
            paidDate: input.status === 'due' ? null : (optionalDate(input.paidDate, 'paid date') || nowIso().slice(0, 10)),
            receiptNo: text(input.receiptNo, 'receipt no', { max: 40, required: false }),
            notes: text(input.notes, 'notes', { max: 300, required: false })
        };
        const updated = existingIdx >= 0
            ? doc.amcRecords.map((r, i) => i === existingIdx ? record : r)
            : [record, ...(doc.amcRecords || [])];
        return { ...doc, amcRecords: updated };
    }),
    removeAmcRecord: id => store.mutate(doc => remove(doc, 'amcRecords', id)),
    seedReferenceSociety: () => store.mutate(doc => seedReferenceSociety(doc)),
    balanceSheet: async (periodKey) => generateBalanceSheet(await store.load(), periodKey),
    dashboard: async (today = nowIso().slice(0, 10)) => dashboard(await store.load(), today)
};
