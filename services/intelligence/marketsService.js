/**
 * services/intelligence/marketsService.js
 *
 * Markets for real people: a watchlist with user-entered or feed prices, price alerts,
 * concentration and sentiment read from the user's own list, a leverage guard, and
 * honest calculators (SIP, lump sum, required SIP, FD/RD, inflation, real return).
 * No live trading, no advice to buy specific securities.
 */
import { createStore, newId, nowIso, text, money, oneOf, optionalDate } from '../life/storeKit.js';

export const MARKETS_STORAGE_KEY = 'finlife_markets_v1';
export const INSTRUMENT_TYPES = ['stock', 'mutual-fund', 'etf', 'gold', 'silver', 'crypto', 'bond', 'fd', 'other'];
export const RISK_PROFILES = ['conservative', 'balanced', 'aggressive'];
const r2 = n => Math.round(n * 100) / 100;

export function emptyMarkets() { return { version: 1, watchlist: [], alerts: [], settings: { riskProfile: 'balanced', inflationPct: 6 } }; }
export function validateMarkets(doc) {
    if (!doc || doc.version !== 1 || !Array.isArray(doc.watchlist) || !Array.isArray(doc.alerts) || !doc.settings) throw new Error('Saved market data is unsupported or incomplete.');
    for (const key of ['watchlist', 'alerts']) { const ids = new Set(); for (const row of doc[key]) { if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error('Saved market data could not be read. Retry without replacing it.'); ids.add(row.id); } }
    return doc;
}
const store = createStore({ key: MARKETS_STORAGE_KEY, empty: emptyMarkets, validate: validateMarkets, label: 'market data' });

/* ------------------------------ calculators ------------------------------ */
export function sipFutureValue({ monthly, annualRatePct, years }) {
    const m = money(monthly, 'monthly amount'), r = Number(annualRatePct) / 1200, n = Math.round(Number(years) * 12);
    if (!Number.isFinite(r) || n <= 0) throw new Error('Enter a valid rate and number of years.');
    const invested = m * n;
    const value = r === 0 ? invested : m * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
    return { invested: r2(invested), value: r2(value), gain: r2(value - invested), months: n };
}
export function lumpsumFutureValue({ amount, annualRatePct, years }) {
    const p = money(amount, 'amount'), r = Number(annualRatePct) / 100, y = Number(years);
    if (!Number.isFinite(r) || !(y > 0)) throw new Error('Enter a valid rate and number of years.');
    const value = p * Math.pow(1 + r, y);
    return { invested: p, value: r2(value), gain: r2(value - p), doublingYears: r > 0 ? r2(72 / (r * 100)) : null };
}
export function requiredSip({ target, annualRatePct, years }) {
    const t = money(target, 'target'), r = Number(annualRatePct) / 1200, n = Math.round(Number(years) * 12);
    if (!Number.isFinite(r) || n <= 0) throw new Error('Enter a valid rate and number of years.');
    const monthly = r === 0 ? t / n : t / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    return { monthly: r2(monthly), months: n, invested: r2(monthly * n) };
}
export function fdMaturity({ principal, annualRatePct, years, compoundingPerYear = 4 }) {
    const p = money(principal, 'principal'), r = Number(annualRatePct) / 100, y = Number(years), k = Number(compoundingPerYear) || 4;
    if (!Number.isFinite(r) || !(y > 0)) throw new Error('Enter a valid rate and tenure.');
    const value = p * Math.pow(1 + r / k, k * y);
    return { principal: p, maturity: r2(value), interest: r2(value - p) };
}
export function rdMaturity({ monthly, annualRatePct, years }) {
    const m = money(monthly, 'monthly deposit'), r = Number(annualRatePct) / 100, n = Math.round(Number(years) * 12);
    if (!Number.isFinite(r) || n <= 0) throw new Error('Enter a valid rate and tenure.');
    let value = 0;
    for (let i = 0; i < n; i++) value += m * Math.pow(1 + r / 4, (4 * (n - i)) / 12);
    return { invested: r2(m * n), maturity: r2(value), interest: r2(value - m * n) };
}
export function inflationAdjusted({ amount, years, inflationPct = 6 }) {
    const a = money(amount, 'amount'), y = Number(years), i = Number(inflationPct) / 100;
    return { todayValue: a, futureCost: r2(a * Math.pow(1 + i, y)), purchasingPowerOfSameMoney: r2(a / Math.pow(1 + i, y)) };
}
export function realReturn(nominalPct, inflationPct) { return r2(((1 + Number(nominalPct) / 100) / (1 + Number(inflationPct) / 100) - 1) * 100); }
export function leverageLoss({ collateral, leverage, movePct }) {
    const c = money(collateral, 'collateral'), l = Math.max(1, Number(leverage) || 1), m = Math.abs(Number(movePct) || 0);
    const loss = Math.min(c, (c * m * l) / 100);
    return { loss: r2(loss), liquidated: loss >= c, liquidationMovePct: r2(100 / l), remaining: r2(c - loss) };
}

/* ------------------------------ watchlist analytics ------------------------------ */
export function positionSummary(item) {
    const qty = Number(item.quantity) || 0, buy = Number(item.buyPrice) || 0, price = Number(item.price) || 0;
    const invested = qty * buy, value = qty * price;
    const history = item.priceHistory || [];
    const prev = history.length >= 2 ? Number(history[history.length - 2].price) : null;
    return { invested: r2(invested), value: r2(value), pnl: r2(value - invested), pnlPct: invested > 0 ? r2(((value - invested) / invested) * 100) : null, dayChangePct: prev ? r2(((price - prev) / prev) * 100) : null };
}
export function concentration(watchlist) {
    const values = watchlist.map(w => ({ id: w.id, name: w.name || w.symbol, type: w.type, value: positionSummary(w).value })).filter(v => v.value > 0);
    const total = values.reduce((s, v) => s + v.value, 0);
    if (!total) return { total: 0, top: null, topShare: null, byType: [], warning: null };
    const top = values.sort((a, b) => b.value - a.value)[0];
    const byType = Object.values(values.reduce((acc, v) => { acc[v.type] = acc[v.type] || { type: v.type, value: 0 }; acc[v.type].value += v.value; return acc; }, {})).map(t => ({ ...t, share: r2((t.value / total) * 100) })).sort((a, b) => b.value - a.value);
    const topShare = r2((top.value / total) * 100);
    const warning = topShare > 40 ? `${top.name} is ${topShare}% of your tracked holdings. A single bad year there hurts everything.` : byType[0] && byType[0].share > 80 && byType.length > 1 ? `${byType[0].share}% sits in ${byType[0].type}. Consider spreading across types.` : null;
    return { total: r2(total), top, topShare, byType, warning };
}
/** Sentiment from the user's own watchlist moves, not from news. */
export function sentiment(watchlist) {
    const moves = watchlist.map(w => positionSummary(w).dayChangePct).filter(v => v !== null);
    if (!moves.length) return { label: 'No signal yet', score: null, advice: 'Update prices on two different days to see how your list is moving.' };
    const avg = moves.reduce((a, b) => a + b, 0) / moves.length;
    const up = moves.filter(m => m > 0).length;
    const label = avg > 2 ? 'Euphoric' : avg > 0.5 ? 'Optimistic' : avg > -0.5 ? 'Calm' : avg > -2 ? 'Nervous' : 'Fearful';
    const advice = avg > 2 ? 'Strong rises invite chasing. Stick to your plan; do not add leverage.' : avg < -2 ? 'Falls feel worse than they are. Keep the emergency fund untouched and continue regular investing.' : 'Quiet markets are the best time to automate contributions.';
    return { label, score: r2(avg), breadth: `${up} of ${moves.length} up`, advice };
}
export function evaluateAlerts(doc) {
    const triggered = [];
    for (const alert of doc.alerts) {
        if (!alert.active) continue;
        const item = doc.watchlist.find(w => w.id === alert.watchId);
        if (!item || !Number.isFinite(Number(item.price))) continue;
        const price = Number(item.price);
        if ((alert.direction === 'above' && price >= alert.price) || (alert.direction === 'below' && price <= alert.price)) triggered.push({ alert, item, price });
    }
    return triggered;
}

/* ------------------------------ service ------------------------------ */
export const MarketsService = {
    load: () => store.load(),
    addWatch: input => store.mutate(doc => ({ ...doc, watchlist: [...doc.watchlist, { id: newId('w'), symbol: text(input.symbol, 'a symbol or name', { max: 30 }).toUpperCase(), name: text(input.name, 'name', { max: 80, required: false }), type: oneOf(input.type || 'stock', INSTRUMENT_TYPES, 'type'), quantity: money(input.quantity, 'quantity', { allowNull: true }), buyPrice: money(input.buyPrice, 'buy price', { allowNull: true }), price: money(input.price, 'price', { allowNull: true }), priceUpdatedAt: input.price !== undefined && input.price !== null && input.price !== '' ? nowIso() : null, priceHistory: input.price !== undefined && input.price !== null && input.price !== '' ? [{ date: nowIso().slice(0, 10), price: money(input.price, 'price') }] : [], notes: text(input.notes, 'notes', { max: 300, required: false }), createdAt: nowIso() }] })),
    updateWatch: (id, changes) => store.mutate(doc => {
        if (!doc.watchlist.some(w => w.id === id)) throw new Error('This item is no longer in your watchlist.');
        return { ...doc, watchlist: doc.watchlist.map(w => (w.id !== id ? w : { ...w, ...(changes.name !== undefined ? { name: text(changes.name, 'name', { max: 80, required: false }) } : {}), ...(changes.type !== undefined ? { type: oneOf(changes.type, INSTRUMENT_TYPES, 'type') } : {}), ...(changes.quantity !== undefined ? { quantity: money(changes.quantity, 'quantity', { allowNull: true }) } : {}), ...(changes.buyPrice !== undefined ? { buyPrice: money(changes.buyPrice, 'buy price', { allowNull: true }) } : {}), ...(changes.notes !== undefined ? { notes: text(changes.notes, 'notes', { max: 300, required: false }) } : {}) })) };
    }),
    setPrice: (id, price, date) => store.mutate(doc => {
        if (!doc.watchlist.some(w => w.id === id)) throw new Error('This item is no longer in your watchlist.');
        const value = money(price, 'price'); const day = optionalDate(date, 'price date') || nowIso().slice(0, 10);
        return { ...doc, watchlist: doc.watchlist.map(w => (w.id !== id ? w : { ...w, price: value, priceUpdatedAt: nowIso(), priceHistory: [...(w.priceHistory || []).filter(h => h.date !== day), { date: day, price: value }].sort((a, b) => a.date.localeCompare(b.date)).slice(-120) })) };
    }),
    removeWatch: id => store.mutate(doc => ({ ...doc, watchlist: doc.watchlist.filter(w => w.id !== id), alerts: doc.alerts.filter(a => a.watchId !== id) })),
    addAlert: input => store.mutate(doc => { if (!doc.watchlist.some(w => w.id === input.watchId)) throw new Error('Choose a watchlist item for the alert.'); return { ...doc, alerts: [...doc.alerts, { id: newId('al'), watchId: input.watchId, direction: oneOf(input.direction || 'below', ['above', 'below'], 'direction'), price: money(input.price, 'alert price'), active: true, triggeredAt: null, createdAt: nowIso() }] }; }),
    toggleAlert: id => store.mutate(doc => ({ ...doc, alerts: doc.alerts.map(a => (a.id === id ? { ...a, active: !a.active, triggeredAt: a.active ? a.triggeredAt : null } : a)) })),
    removeAlert: id => store.mutate(doc => ({ ...doc, alerts: doc.alerts.filter(a => a.id !== id) })),
    /** Marks alerts whose condition is met; returns the triggered list. */
    checkAlerts: async () => { const doc = await store.load(); const hits = evaluateAlerts(doc); if (!hits.length) return []; await store.mutate(d => ({ ...d, alerts: d.alerts.map(a => (hits.some(h => h.alert.id === a.id) ? { ...a, triggeredAt: a.triggeredAt || nowIso() } : a)) })); return hits; },
    updateSettings: changes => store.mutate(doc => ({ ...doc, settings: { ...doc.settings, ...(changes.riskProfile !== undefined ? { riskProfile: oneOf(changes.riskProfile, RISK_PROFILES, 'risk profile') } : {}), ...(changes.inflationPct !== undefined ? { inflationPct: money(changes.inflationPct, 'inflation rate') } : {}) } }))
};
