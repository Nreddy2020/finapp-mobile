/**
 * services/tax/taxEngine.js
 *
 * Deterministic Indian personal income-tax engine (individuals), covering both regimes,
 * FY 2024-25 and FY 2025-26 slabs, rebate u/s 87A with marginal relief, surcharge, cess,
 * capped deductions, HRA exemption, capital gains (post 23 July 2024 rates) and the
 * advance-tax calendar. Pure functions only; amounts in rupees.
 *
 * This is a planning aid, not a filing tool. Rules are encoded per financial year so the
 * app stays correct as the user moves between years.
 */
const r0 = n => Math.round(n);

export const FINANCIAL_YEARS = ['2024-25', '2025-26'];
export const RULES = {
    '2024-25': {
        newRegime: { slabs: [[300000, 0], [700000, 0.05], [1000000, 0.10], [1200000, 0.15], [1500000, 0.20], [Infinity, 0.30]], standardDeduction: 75000, rebateLimit: 700000, rebateMax: 25000, surchargeCap: 0.25 },
        oldRegime: { slabs: [[250000, 0], [500000, 0.05], [1000000, 0.20], [Infinity, 0.30]], seniorBasic: 300000, superSeniorBasic: 500000, standardDeduction: 50000, rebateLimit: 500000, rebateMax: 12500 },
        cess: 0.04,
        caps: { '80C': 150000, '80CCD1B': 50000, '80D_self': 25000, '80D_self_senior': 50000, '80D_parents': 25000, '80D_parents_senior': 50000, '80TTA': 10000, '80TTB': 50000, '24B': 200000 },
        capitalGains: { equityStcg: 0.20, equityLtcg: 0.125, equityLtcgExemption: 125000, otherLtcg: 0.125 },
        advanceTax: [['06-15', 0.15], ['09-15', 0.45], ['12-15', 0.75], ['03-15', 1.00]], advanceTaxThreshold: 10000
    },
    '2025-26': {
        newRegime: { slabs: [[400000, 0], [800000, 0.05], [1200000, 0.10], [1600000, 0.15], [2000000, 0.20], [2400000, 0.25], [Infinity, 0.30]], standardDeduction: 75000, rebateLimit: 1200000, rebateMax: 60000, surchargeCap: 0.25 },
        oldRegime: { slabs: [[250000, 0], [500000, 0.05], [1000000, 0.20], [Infinity, 0.30]], seniorBasic: 300000, superSeniorBasic: 500000, standardDeduction: 50000, rebateLimit: 500000, rebateMax: 12500 },
        cess: 0.04,
        caps: { '80C': 150000, '80CCD1B': 50000, '80D_self': 25000, '80D_self_senior': 50000, '80D_parents': 25000, '80D_parents_senior': 50000, '80TTA': 10000, '80TTB': 50000, '24B': 200000 },
        capitalGains: { equityStcg: 0.20, equityLtcg: 0.125, equityLtcgExemption: 125000, otherLtcg: 0.125 },
        advanceTax: [['06-15', 0.15], ['09-15', 0.45], ['12-15', 0.75], ['03-15', 1.00]], advanceTaxThreshold: 10000
    }
};
export const SURCHARGE = [[5000000, 0], [10000000, 0.10], [20000000, 0.15], [50000000, 0.25], [Infinity, 0.37]];

export function defaultProfile() {
    return {
        fy: '2025-26', regime: 'New', age: 30, salaried: true,
        income: 0, otherIncome: 0, interestIncome: 0, rentalIncome: 0,
        deductions: { '80C': 0, '80CCD1B': 0, '80CCD2': 0, '80D': 0, '80D_parents': 0, '80E': 0, '80G': 0, '80TTA': 0, '24B': 0, 'HRA': 0, 'Standard': 50000 },
        hra: { basic: 0, hraReceived: 0, rentPaid: 0, metro: false },
        parentsSenior: false,
        capitalGains: { equityStcg: 0, equityLtcg: 0, otherLtcg: 0, otherStcg: 0 },
        tdsPaid: 0, advanceTaxPaid: 0
    };
}
export function normalizeProfile(input = {}) {
    const base = defaultProfile();
    const p = { ...base, ...input, deductions: { ...base.deductions, ...(input.deductions || {}) }, hra: { ...base.hra, ...(input.hra || {}) }, capitalGains: { ...base.capitalGains, ...(input.capitalGains || {}) } };
    if (!FINANCIAL_YEARS.includes(p.fy)) p.fy = base.fy;
    p.regime = p.regime === 'Old' ? 'Old' : 'New';
    for (const k of ['income', 'otherIncome', 'interestIncome', 'rentalIncome', 'tdsPaid', 'advanceTaxPaid', 'age']) p[k] = Math.max(0, Number(p[k]) || 0);
    for (const k of Object.keys(p.deductions)) p.deductions[k] = Math.max(0, Number(p.deductions[k]) || 0);
    for (const k of ['basic', 'hraReceived', 'rentPaid']) p.hra[k] = Math.max(0, Number(p.hra[k]) || 0);
    for (const k of Object.keys(p.capitalGains)) p.capitalGains[k] = Math.max(0, Number(p.capitalGains[k]) || 0);
    return p;
}

function slabTax(amount, slabs, basicExemption = null) {
    let tax = 0, lower = 0;
    const table = basicExemption ? slabs.map(([limit, rate], i) => (i === 0 ? [basicExemption, rate] : [limit, rate])) : slabs;
    for (const [limit, rate] of table) { if (amount > lower) tax += (Math.min(amount, limit) - lower) * rate; lower = limit; if (amount <= limit) break; }
    return tax;
}
function surchargeFor(taxableIncome, tax, cap = 0.37) {
    let rate = 0; for (const [limit, r] of SURCHARGE) { if (taxableIncome <= limit) break; rate = r; }
    rate = Math.min(rate, cap);
    if (!rate) return 0;
    return r0(tax * rate);
}
export function hraExemption({ basic, hraReceived, rentPaid, metro }) {
    const b = Number(basic) || 0, h = Number(hraReceived) || 0, r = Number(rentPaid) || 0;
    if (!h || !r) return 0;
    return Math.max(0, r0(Math.min(h, r - 0.1 * b, (metro ? 0.5 : 0.4) * b)));
}
export function capitalGainsTax(cg, rules) {
    const equityLtcgTaxable = Math.max(0, (cg.equityLtcg || 0) - rules.equityLtcgExemption);
    const equityStcgTax = (cg.equityStcg || 0) * rules.equityStcg;
    const equityLtcgTax = equityLtcgTaxable * rules.equityLtcg;
    const otherLtcgTax = (cg.otherLtcg || 0) * rules.otherLtcg;
    return { equityStcgTax: r0(equityStcgTax), equityLtcgTax: r0(equityLtcgTax), equityLtcgTaxable: r0(equityLtcgTaxable), otherLtcgTax: r0(otherLtcgTax), otherStcgAtSlab: cg.otherStcg || 0, total: r0(equityStcgTax + equityLtcgTax + otherLtcgTax) };
}

/** Full computation for one regime. */
export function computeRegime(profileInput, regime) {
    const p = normalizeProfile(profileInput);
    const rules = RULES[p.fy];
    const gross = p.income + p.otherIncome + p.interestIncome + p.rentalIncome + (p.capitalGains.otherStcg || 0);
    const applied = {};
    let deductions = 0;
    const senior = p.age >= 60, superSenior = p.age >= 80;
    if (regime === 'New') {
        applied.Standard = p.salaried ? Math.min(rules.newRegime.standardDeduction, p.income) : 0;
        applied['80CCD2'] = p.deductions['80CCD2'];
        deductions = applied.Standard + applied['80CCD2'];
    } else {
        applied.Standard = p.salaried ? Math.min(rules.oldRegime.standardDeduction, p.income) : 0;
        applied.HRA = Math.min(p.deductions.HRA || hraExemption(p.hra), p.income);
        applied['80C'] = Math.min(p.deductions['80C'], rules.caps['80C']);
        applied['80CCD1B'] = Math.min(p.deductions['80CCD1B'], rules.caps['80CCD1B']);
        applied['80CCD2'] = p.deductions['80CCD2'];
        applied['80D'] = Math.min(p.deductions['80D'], senior ? rules.caps['80D_self_senior'] : rules.caps['80D_self']) + Math.min(p.deductions['80D_parents'], p.parentsSenior ? rules.caps['80D_parents_senior'] : rules.caps['80D_parents']);
        applied['80E'] = p.deductions['80E'];
        applied['80G'] = p.deductions['80G'];
        applied['80TTA'] = Math.min(p.deductions['80TTA'] || p.interestIncome, senior ? rules.caps['80TTB'] : rules.caps['80TTA']);
        applied['24B'] = Math.min(p.deductions['24B'], rules.caps['24B']);
        deductions = Object.values(applied).reduce((a, b) => a + b, 0);
    }
    const taxableIncome = Math.max(0, r0(gross - deductions));
    const basic = regime === 'Old' ? (superSenior ? rules.oldRegime.superSeniorBasic : senior ? rules.oldRegime.seniorBasic : null) : null;
    let slab = slabTax(taxableIncome, regime === 'New' ? rules.newRegime.slabs : rules.oldRegime.slabs, basic);
    const regimeRules = regime === 'New' ? rules.newRegime : rules.oldRegime;
    let rebate = 0;
    if (taxableIncome <= regimeRules.rebateLimit) rebate = Math.min(slab, regimeRules.rebateMax);
    else if (regime === 'New') { const over = taxableIncome - regimeRules.rebateLimit; if (slab > over) rebate = slab - over; }
    let taxAfterRebate = Math.max(0, slab - rebate);
    const cg = capitalGainsTax(p.capitalGains, rules.capitalGains);
    const taxBeforeSurcharge = taxAfterRebate + cg.total;
    const surcharge = surchargeFor(taxableIncome + (p.capitalGains.equityLtcg || 0) + (p.capitalGains.equityStcg || 0), taxBeforeSurcharge, regime === 'New' ? rules.newRegime.surchargeCap : 0.37);
    const cess = r0((taxBeforeSurcharge + surcharge) * rules.cess);
    const totalTax = r0(taxBeforeSurcharge + surcharge + cess);
    const effectiveRate = gross > 0 ? Math.round((totalTax / gross) * 1000) / 10 : 0;
    const balance = totalTax - p.tdsPaid - p.advanceTaxPaid;
    return { fy: p.fy, regime, grossIncome: r0(gross), deductionsApplied: applied, totalDeductions: r0(deductions), taxableIncome, slabTax: r0(slab), rebate: r0(rebate), taxAfterRebate: r0(taxAfterRebate), capitalGains: cg, surcharge, cess, totalTax, effectiveRatePercent: effectiveRate, monthlyTax: r0(totalTax / 12), taxPaid: p.tdsPaid + p.advanceTaxPaid, balancePayable: balance > 0 ? r0(balance) : 0, refundDue: balance < 0 ? r0(-balance) : 0, advanceTaxRequired: balance > rules.advanceTaxThreshold };
}

export function compareRegimes(profile) {
    const oldR = computeRegime(profile, 'Old'), newR = computeRegime(profile, 'New');
    const better = newR.totalTax <= oldR.totalTax ? 'New' : 'Old';
    return { old: oldR, new: newR, recommended: better, saving: Math.abs(newR.totalTax - oldR.totalTax) };
}

/** Where extra deductions could still reduce old-regime tax; each item is a real gap in the user's entries. */
export function deductionOpportunities(profileInput) {
    const p = normalizeProfile(profileInput);
    const rules = RULES[p.fy];
    const items = [];
    const push = (section, used, cap, how) => { const room = Math.max(0, cap - used); if (room > 0) items.push({ section, used: r0(used), cap, room: r0(room), how }); };
    push('80C', p.deductions['80C'], rules.caps['80C'], 'PPF, EPF, ELSS, life insurance premium, home-loan principal, tuition fees, 5-year FD.');
    push('80CCD(1B)', p.deductions['80CCD1B'], rules.caps['80CCD1B'], 'Extra NPS contribution over and above 80C.');
    push('80D (self)', p.deductions['80D'], p.age >= 60 ? rules.caps['80D_self_senior'] : rules.caps['80D_self'], 'Health insurance premium for self and family, plus preventive check-ups up to 5,000.');
    push('80D (parents)', p.deductions['80D_parents'], p.parentsSenior ? rules.caps['80D_parents_senior'] : rules.caps['80D_parents'], 'Health insurance premium paid for parents.');
    if (p.hra.rentPaid > 0 && !p.deductions.HRA && !p.hra.hraReceived) items.push({ section: 'HRA / 80GG', used: 0, cap: null, room: null, how: 'You pay rent; claim HRA through your employer or 80GG if no HRA is received.' });
    push('24(b)', p.deductions['24B'], rules.caps['24B'], 'Interest on a home loan for a self-occupied house.');
    push('80TTA/80TTB', p.deductions['80TTA'] || p.interestIncome, p.age >= 60 ? rules.caps['80TTB'] : rules.caps['80TTA'], 'Savings-account interest (80TTA) or all deposit interest for seniors (80TTB).');
    const totalRoom = items.reduce((s, i) => s + (i.room || 0), 0);
    const marginalRate = (() => { const t = computeRegime(p, 'Old').taxableIncome; return t > 1000000 ? 0.3 : t > 500000 ? 0.2 : t > 250000 ? 0.05 : 0; })();
    return { items, totalRoom: r0(totalRoom), potentialSaving: r0(totalRoom * marginalRate * 1.04), marginalRatePercent: marginalRate * 100, note: 'Deductions apply under the Old regime only (except employer NPS under the New regime).' };
}

/** Advance-tax instalments for the balance payable in the chosen year. */
export function advanceTaxSchedule(profileInput, regime = null, today = null) {
    const p = normalizeProfile(profileInput);
    const result = computeRegime(p, regime || p.regime);
    const rules = RULES[p.fy];
    const startYear = Number(p.fy.slice(0, 4));
    const liability = Math.max(0, result.totalTax - p.tdsPaid);
    const required = liability > rules.advanceTaxThreshold;
    const paid = p.advanceTaxPaid;
    const instalments = rules.advanceTax.map(([md, share], i) => {
        const year = md.startsWith('03') ? startYear + 1 : startYear;
        const dueDate = `${year}-${md}`;
        const cumulative = r0(liability * share);
        const thisInstalment = cumulative - (i === 0 ? 0 : r0(liability * rules.advanceTax[i - 1][1]));
        return { dueDate, label: ['15 June', '15 September', '15 December', '15 March'][i], sharePercent: share * 100, cumulative, amount: thisInstalment, status: !required ? 'not-required' : paid >= cumulative ? 'paid' : today && dueDate < today ? 'overdue' : 'upcoming' };
    });
    return { required, liability: r0(liability), paid, remaining: r0(Math.max(0, liability - paid)), instalments, note: required ? 'Interest under sections 234B/234C applies when instalments are short or late.' : 'Advance tax is not required when tax after TDS is 10,000 or less.' };
}

export function filingChecklist(profileInput) {
    const p = normalizeProfile(profileInput);
    const items = [{ id: 'form16', label: 'Form 16 from employer', needed: p.salaried }, { id: 'ais', label: 'AIS / Form 26AS reconciled with TDS', needed: true }, { id: 'interest', label: 'Interest certificates from banks', needed: p.interestIncome > 0 || true }, { id: 'rent', label: 'Rent receipts and landlord PAN (if rent above 1 lakh a year)', needed: p.hra.rentPaid > 0 }, { id: 'homeLoan', label: 'Home-loan interest certificate', needed: p.deductions['24B'] > 0 }, { id: '80c', label: 'Proofs for 80C investments', needed: p.regime === 'Old' && p.deductions['80C'] > 0 }, { id: '80d', label: 'Health insurance premium receipts', needed: p.regime === 'Old' && (p.deductions['80D'] > 0 || p.deductions['80D_parents'] > 0) }, { id: 'cg', label: 'Capital gains statements from broker / fund house', needed: Object.values(p.capitalGains).some(v => v > 0) }, { id: 'donations', label: 'Donation receipts with 80G registration', needed: p.deductions['80G'] > 0 }];
    return items.filter(i => i.needed);
}
