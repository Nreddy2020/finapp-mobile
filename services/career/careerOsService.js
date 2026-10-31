/**
 * services/career/careerOsService.js
 *
 * Career operating system: profile, goals with milestones, skills gap, learning with
 * budgets, certifications, a job-application pipeline and income history. Everything
 * is user-entered; nothing is fabricated or seeded. The legacy services/career.js
 * remains for older screens and is not written to from here.
 */
import { createStore, newId, nowIso, text, money, optionalDate, integer, oneOf, daysBetween, isDate } from '../life/storeKit.js';

export const CAREER_STORAGE_KEY = 'finlife_career_v1';
export const GOAL_TYPES = ['promotion', 'switch', 'skill', 'certification', 'income', 'business', 'other'];
export const GOAL_STATUSES = ['active', 'achieved', 'dropped'];
export const LEARNING_STATUSES = ['planned', 'in-progress', 'done', 'dropped'];
export const APPLICATION_STAGES = ['saved', 'applied', 'interview', 'offer', 'accepted', 'rejected', 'withdrawn'];

export function emptyCareer() {
    return { version: 1, profile: { role: '', company: '', industry: '', startDate: null, monthlyIncome: null, targetMonthlyIncome: null, notes: '' }, goals: [], skills: [], learning: [], certifications: [], applications: [], incomeHistory: [] };
}
function list(doc, key) { if (!Array.isArray(doc[key])) throw new Error('Saved career data is incomplete.'); return doc[key]; }
export function validateCareer(doc) {
    if (!doc || doc.version !== 1 || !doc.profile || typeof doc.profile !== 'object') throw new Error('Saved career data is unsupported or incomplete.');
    for (const key of ['goals', 'skills', 'learning', 'certifications', 'applications', 'incomeHistory']) {
        const ids = new Set();
        for (const row of list(doc, key)) { if (!row || typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error('Saved career data could not be read. Retry without replacing it.'); ids.add(row.id); }
    }
    return doc;
}
const store = createStore({ key: CAREER_STORAGE_KEY, empty: emptyCareer, validate: validateCareer, label: 'career data' });
function replace(doc, key, id, update) {
    const rows = list(doc, key); if (!rows.some(r => r.id === id)) throw new Error('This record is no longer available. Refresh the list.');
    return { ...doc, [key]: rows.map(r => (r.id === id ? update(r) : r)) };
}
function remove(doc, key, id) { return { ...doc, [key]: list(doc, key).filter(r => r.id !== id) }; }

/* ------------------------------ pure calculations ------------------------------ */
export function skillGap(skill) { return Math.max(0, (skill.target || 0) - (skill.current || 0)); }
export function goalProgress(goal) {
    if (goal.status === 'achieved') return 100;
    if (!goal.milestones.length) return 0;
    return Math.round((goal.milestones.filter(m => m.done).length / goal.milestones.length) * 100);
}
/** Payback of a learning investment. `monthlyIncrease` is the extra monthly income it unlocks. */
export function learningRoi({ cost, monthlyIncrease, years = 5 }) {
    const c = money(cost, 'cost'), inc = money(monthlyIncrease, 'monthly increase');
    const paybackMonths = inc > 0 ? Math.ceil(c / inc) : null;
    const total = inc * 12 * years;
    return { cost: c, monthlyIncrease: inc, paybackMonths, gainOverYears: total, netOverYears: total - c, years, worthIt: paybackMonths !== null && paybackMonths <= years * 12 };
}
/** Salary negotiation anchors from user-entered market range. */
export function negotiationPlan({ currentMonthly, marketLow, marketHigh, targetRaisePercent = 20 }) {
    const current = money(currentMonthly, 'current income'), low = money(marketLow, 'market low'), high = money(marketHigh, 'market high');
    if (high < low) throw new Error('Market high must be at least the market low.');
    const target = Math.max(current * (1 + targetRaisePercent / 100), (low + high) / 2);
    return { current, walkAway: Math.max(low, current), target: Math.round(target), anchor: Math.round(Math.min(high, target * 1.1)), raisePercent: current > 0 ? Math.round(((target - current) / current) * 100) : null, talkingPoints: ['Lead with measurable outcomes from the last 12 months.', 'Quote the market range you researched, not a personal need.', 'Ask for the anchor, be ready to accept the target, never go below the walk-away.', 'If money is fixed, negotiate title, learning budget, leave or review timing.'] };
}
export function incomeGrowth(history) {
    const rows = [...history].filter(r => isDate(r.date)).sort((a, b) => a.date.localeCompare(b.date));
    if (rows.length < 2) return { first: rows[0] || null, latest: rows[rows.length - 1] || null, growthPercent: null, cagrPercent: null };
    const first = rows[0], latest = rows[rows.length - 1];
    const years = Math.max(1 / 12, daysBetween(first.date, latest.date) / 365.25);
    const growth = first.monthlyAmount > 0 ? ((latest.monthlyAmount - first.monthlyAmount) / first.monthlyAmount) * 100 : null;
    const cagr = first.monthlyAmount > 0 && latest.monthlyAmount > 0 ? (Math.pow(latest.monthlyAmount / first.monthlyAmount, 1 / years) - 1) * 100 : null;
    return { first, latest, growthPercent: growth === null ? null : Math.round(growth), cagrPercent: cagr === null ? null : Math.round(cagr * 10) / 10 };
}
export function careerSummary(doc, today) {
    const activeGoals = doc.goals.filter(g => g.status === 'active');
    const skills = doc.skills;
    const avgGap = skills.length ? Math.round((skills.reduce((s, k) => s + skillGap(k), 0) / skills.length) * 10) / 10 : null;
    const learningSpend = doc.learning.filter(l => l.status !== 'dropped').reduce((s, l) => s + (l.cost || 0), 0);
    const learningHours = doc.learning.filter(l => l.status !== 'dropped').reduce((s, l) => s + (l.hours || 0), 0);
    const pipeline = Object.fromEntries(APPLICATION_STAGES.map(st => [st, doc.applications.filter(a => a.stage === st).length]));
    const expiringCerts = doc.certifications.filter(c => c.expiryDate && daysBetween(today, c.expiryDate) <= 60);
    const growth = incomeGrowth(doc.incomeHistory);
    const nextGoal = activeGoals.filter(g => g.targetDate).sort((a, b) => a.targetDate.localeCompare(b.targetDate))[0] || activeGoals[0] || null;
    return { activeGoals: activeGoals.length, achievedGoals: doc.goals.filter(g => g.status === 'achieved').length, avgGap, biggestGap: skills.slice().sort((a, b) => skillGap(b) - skillGap(a))[0] || null, learningSpend, learningHours, pipeline, activeApplications: doc.applications.filter(a => ['applied', 'interview', 'offer'].includes(a.stage)).length, expiringCerts, growth, nextGoal, incomeGapToTarget: doc.profile.targetMonthlyIncome && doc.profile.monthlyIncome ? doc.profile.targetMonthlyIncome - doc.profile.monthlyIncome : null };
}

/* ------------------------------ service ------------------------------ */
export const CareerOsService = {
    load: () => store.load(),
    updateProfile: changes => store.mutate(doc => {
        const p = { ...doc.profile };
        if (changes.role !== undefined) p.role = text(changes.role, 'role', { max: 80, required: false });
        if (changes.company !== undefined) p.company = text(changes.company, 'company', { max: 80, required: false });
        if (changes.industry !== undefined) p.industry = text(changes.industry, 'industry', { max: 80, required: false });
        if (changes.startDate !== undefined) p.startDate = optionalDate(changes.startDate, 'start date');
        if (changes.monthlyIncome !== undefined) p.monthlyIncome = money(changes.monthlyIncome, 'monthly income', { allowNull: true });
        if (changes.targetMonthlyIncome !== undefined) p.targetMonthlyIncome = money(changes.targetMonthlyIncome, 'target income', { allowNull: true });
        if (changes.notes !== undefined) p.notes = text(changes.notes, 'notes', { max: 1000, required: false });
        return { ...doc, profile: p };
    }),
    addGoal: input => store.mutate(doc => ({ ...doc, goals: [{ id: newId('cg'), title: text(input.title, 'a goal title', { max: 160 }), type: oneOf(input.type || 'other', GOAL_TYPES, 'goal type'), targetDate: optionalDate(input.targetDate, 'target date'), notes: text(input.notes, 'notes', { max: 1000, required: false }), status: 'active', milestones: [], createdAt: nowIso() }, ...doc.goals] })),
    updateGoal: (id, changes) => store.mutate(doc => replace(doc, 'goals', id, g => ({ ...g, ...(changes.title !== undefined ? { title: text(changes.title, 'a goal title', { max: 160 }) } : {}), ...(changes.type !== undefined ? { type: oneOf(changes.type, GOAL_TYPES, 'goal type') } : {}), ...(changes.targetDate !== undefined ? { targetDate: optionalDate(changes.targetDate, 'target date') } : {}), ...(changes.notes !== undefined ? { notes: text(changes.notes, 'notes', { max: 1000, required: false }) } : {}), ...(changes.status !== undefined ? { status: oneOf(changes.status, GOAL_STATUSES, 'status') } : {}) }))),
    removeGoal: id => store.mutate(doc => remove(doc, 'goals', id)),
    addMilestone: (goalId, title) => store.mutate(doc => replace(doc, 'goals', goalId, g => ({ ...g, milestones: [...g.milestones, { id: newId('ms'), title: text(title, 'a milestone', { max: 160 }), done: false }] }))),
    toggleMilestone: (goalId, milestoneId) => store.mutate(doc => replace(doc, 'goals', goalId, g => ({ ...g, milestones: g.milestones.map(m => (m.id === milestoneId ? { ...m, done: !m.done } : m)) }))),
    addSkill: input => store.mutate(doc => ({ ...doc, skills: [...doc.skills, { id: newId('sk'), name: text(input.name, 'a skill name', { max: 80 }), current: integer(input.current ?? 0, 'Current level', { min: 0, max: 10 }), target: integer(input.target ?? 10, 'Target level', { min: 0, max: 10 }), evidence: text(input.evidence, 'evidence', { max: 300, required: false }), updatedAt: nowIso() }] })),
    updateSkill: (id, changes) => store.mutate(doc => replace(doc, 'skills', id, s => ({ ...s, ...(changes.name !== undefined ? { name: text(changes.name, 'a skill name', { max: 80 }) } : {}), ...(changes.current !== undefined ? { current: integer(changes.current, 'Current level', { min: 0, max: 10 }) } : {}), ...(changes.target !== undefined ? { target: integer(changes.target, 'Target level', { min: 0, max: 10 }) } : {}), ...(changes.evidence !== undefined ? { evidence: text(changes.evidence, 'evidence', { max: 300, required: false }) } : {}), updatedAt: nowIso() }))),
    removeSkill: id => store.mutate(doc => remove(doc, 'skills', id)),
    addLearning: input => store.mutate(doc => ({ ...doc, learning: [{ id: newId('lr'), title: text(input.title, 'a course or resource', { max: 160 }), provider: text(input.provider, 'provider', { max: 80, required: false }), cost: money(input.cost ?? 0, 'cost'), hours: integer(input.hours ?? 0, 'Hours', { min: 0, max: 100000 }), status: oneOf(input.status || 'planned', LEARNING_STATUSES, 'status'), skillId: input.skillId || null, startDate: optionalDate(input.startDate, 'start date'), endDate: optionalDate(input.endDate, 'end date'), monthlyIncrease: money(input.monthlyIncrease, 'monthly increase', { allowNull: true }), notes: text(input.notes, 'notes', { max: 500, required: false }), createdAt: nowIso() }, ...doc.learning] })),
    updateLearning: (id, changes) => store.mutate(doc => replace(doc, 'learning', id, l => ({ ...l, ...(changes.status !== undefined ? { status: oneOf(changes.status, LEARNING_STATUSES, 'status') } : {}), ...(changes.cost !== undefined ? { cost: money(changes.cost, 'cost') } : {}), ...(changes.hours !== undefined ? { hours: integer(changes.hours, 'Hours', { min: 0, max: 100000 }) } : {}), ...(changes.title !== undefined ? { title: text(changes.title, 'a course or resource', { max: 160 }) } : {}), ...(changes.notes !== undefined ? { notes: text(changes.notes, 'notes', { max: 500, required: false }) } : {}) }))),
    removeLearning: id => store.mutate(doc => remove(doc, 'learning', id)),
    addCertification: input => store.mutate(doc => ({ ...doc, certifications: [{ id: newId('cert'), name: text(input.name, 'a certification name', { max: 160 }), issuer: text(input.issuer, 'issuer', { max: 80, required: false }), obtainedDate: optionalDate(input.obtainedDate, 'obtained date'), expiryDate: optionalDate(input.expiryDate, 'expiry date'), validityItemId: input.validityItemId || null, cost: money(input.cost, 'cost', { allowNull: true }), createdAt: nowIso() }, ...doc.certifications] })),
    removeCertification: id => store.mutate(doc => remove(doc, 'certifications', id)),
    addApplication: input => store.mutate(doc => ({ ...doc, applications: [{ id: newId('app'), company: text(input.company, 'a company', { max: 80 }), role: text(input.role, 'a role', { max: 80 }), stage: oneOf(input.stage || 'saved', APPLICATION_STAGES, 'stage'), appliedDate: optionalDate(input.appliedDate, 'applied date'), offeredMonthly: money(input.offeredMonthly, 'offered income', { allowNull: true }), link: text(input.link, 'link', { max: 300, required: false }), notes: text(input.notes, 'notes', { max: 1000, required: false }), history: [{ date: nowIso(), stage: oneOf(input.stage || 'saved', APPLICATION_STAGES, 'stage') }], updatedAt: nowIso() }, ...doc.applications] })),
    setApplicationStage: (id, stage, extra = {}) => store.mutate(doc => replace(doc, 'applications', id, a => ({ ...a, stage: oneOf(stage, APPLICATION_STAGES, 'stage'), ...(extra.offeredMonthly !== undefined ? { offeredMonthly: money(extra.offeredMonthly, 'offered income', { allowNull: true }) } : {}), ...(extra.notes !== undefined ? { notes: text(extra.notes, 'notes', { max: 1000, required: false }) } : {}), history: [...a.history, { date: nowIso(), stage }], updatedAt: nowIso() }))),
    removeApplication: id => store.mutate(doc => remove(doc, 'applications', id)),
    addIncomeRecord: input => store.mutate(doc => {
        const entry = { id: newId('inc'), date: optionalDate(input.date, 'date') || nowIso().slice(0, 10), monthlyAmount: money(input.monthlyAmount, 'monthly income'), note: text(input.note, 'a note', { max: 200, required: false }) };
        const history = [...doc.incomeHistory, entry].sort((a, b) => a.date.localeCompare(b.date));
        const latest = history[history.length - 1];
        return { ...doc, incomeHistory: history, profile: { ...doc.profile, monthlyIncome: latest.monthlyAmount } };
    }),
    removeIncomeRecord: id => store.mutate(doc => remove(doc, 'incomeHistory', id)),
    summary: async (today = nowIso().slice(0, 10)) => careerSummary(await store.load(), today)
};
