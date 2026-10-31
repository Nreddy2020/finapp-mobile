/**
 * services/life/lifeGoalsService.js
 *
 * Personal life goals with milestones, optional money targets and contribution ledgers.
 * Tasks link to goals through a typed reference {domain: 'life', id}; the goal never
 * copies task status, and removing a goal never deletes its tasks.
 */
import { createStore, newId, nowIso, clone, text, money, optionalDate, oneOf, isDate, daysBetween } from './storeKit.js';
import { tasksForGoal } from './taskViews.js';

export const LIFE_GOALS_STORAGE_KEY = 'finlife_life_goals_v1';
export const GOAL_CATEGORIES = ['financial', 'health', 'learning', 'family', 'career', 'home', 'travel', 'community', 'other'];
export const GOAL_STATUSES = ['active', 'paused', 'achieved', 'dropped'];

export function emptyGoals() { return { version: 1, goals: [] }; }

export function validateGoal(goal) {
    if (!goal || typeof goal.id !== 'string' || !goal.id || typeof goal.title !== 'string' || !goal.title.trim()) throw new Error('Saved goals could not be read. Retry without replacing them.');
    if (!GOAL_CATEGORIES.includes(goal.category) || !GOAL_STATUSES.includes(goal.status)) throw new Error('Saved goals contain an unknown category or status.');
    if (goal.targetDate !== null && !isDate(goal.targetDate)) throw new Error('Saved goal has an invalid target date.');
    if (goal.targetAmount !== null && (!Number.isFinite(goal.targetAmount) || goal.targetAmount < 0)) throw new Error('Saved goal has an invalid target amount.');
    if (!Array.isArray(goal.milestones) || !Array.isArray(goal.contributions)) throw new Error('Saved goal is incomplete.');
    return goal;
}
export function validateGoals(doc) {
    if (!doc || doc.version !== 1 || !Array.isArray(doc.goals)) throw new Error('Saved goals format is unsupported or incomplete.');
    const ids = new Set();
    for (const goal of doc.goals) { validateGoal(goal); if (ids.has(goal.id)) throw new Error('Duplicate saved goal.'); ids.add(goal.id); }
    return doc;
}

const store = createStore({ key: LIFE_GOALS_STORAGE_KEY, empty: emptyGoals, validate: validateGoals, label: 'goals' });

function fields(input, current = {}) {
    const next = { ...current };
    if (input.title !== undefined || !current.title) next.title = text(input.title, 'a goal title', { max: 160 });
    if (input.why !== undefined) next.why = text(input.why, 'why this matters', { max: 500, required: false });
    if (input.category !== undefined || !current.category) next.category = oneOf(input.category || 'other', GOAL_CATEGORIES, 'category');
    if (input.targetDate !== undefined || current.targetDate === undefined) next.targetDate = optionalDate(input.targetDate, 'target date');
    if (input.targetAmount !== undefined || current.targetAmount === undefined) next.targetAmount = money(input.targetAmount, 'target amount', { allowNull: true });
    if (input.status !== undefined) next.status = oneOf(input.status, GOAL_STATUSES, 'status');
    return next;
}

export function goalSaved(goal) { return (goal.contributions || []).reduce((sum, c) => sum + Number(c.amount || 0), 0); }

/** Progress from money, milestones and linked tasks (each present dimension weighted equally). */
export function goalProgress(goal, tasks = []) {
    const parts = [];
    if (goal.targetAmount) parts.push(Math.min(1, goalSaved(goal) / goal.targetAmount));
    if (goal.milestones.length) parts.push(goal.milestones.filter(m => m.done).length / goal.milestones.length);
    const linked = tasksForGoal(tasks, { domain: 'life', id: goal.id });
    if (linked.length) parts.push(linked.filter(t => t.status === 'completed').length / linked.length);
    if (goal.status === 'achieved') return 100;
    if (!parts.length) return 0;
    return Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);
}

/** Pace guidance for a goal as of `today` (YYYY-MM-DD). Never invents numbers the user did not enter. */
export function goalPlan(goal, today) {
    const saved = goalSaved(goal);
    const remainingAmount = goal.targetAmount ? Math.max(0, goal.targetAmount - saved) : null;
    const daysLeft = goal.targetDate ? daysBetween(today, goal.targetDate) : null;
    const monthsLeft = daysLeft === null ? null : Math.max(0, daysLeft / 30.4375);
    let monthlyNeeded = null;
    if (remainingAmount !== null && monthsLeft !== null) monthlyNeeded = monthsLeft < 1 ? remainingAmount : Math.round((remainingAmount / monthsLeft) * 100) / 100;
    let pace = 'on-track';
    if (goal.status === 'achieved') pace = 'achieved';
    else if (daysLeft !== null && daysLeft < 0) pace = 'past-due';
    else if (remainingAmount !== null && monthsLeft !== null && monthsLeft < 1 && remainingAmount > 0) pace = 'due-now';
    return { saved, remainingAmount, daysLeft, monthsLeft: monthsLeft === null ? null : Math.round(monthsLeft * 10) / 10, monthlyNeeded, pace };
}

export const LifeGoalsService = {
    load: () => store.load(),
    list: async () => (await store.load()).goals,
    add: input => store.mutate(doc => {
        const goal = { id: newId('goal'), ...fields({ category: 'other', ...input }), status: 'active', milestones: [], contributions: [], createdAt: nowIso(), updatedAt: nowIso() };
        if (!goal.why) goal.why = '';
        return { ...doc, goals: [goal, ...doc.goals] };
    }),
    update: (id, changes) => store.mutate(doc => {
        const goal = doc.goals.find(g => g.id === id);
        if (!goal) throw new Error('This goal is no longer available. Refresh the list.');
        const next = { ...goal, ...fields(changes, goal), updatedAt: nowIso() };
        return { ...doc, goals: doc.goals.map(g => (g.id === id ? next : g)) };
    }),
    setStatus: (id, status) => LifeGoalsService.update(id, { status }),
    remove: id => store.mutate(doc => ({ ...doc, goals: doc.goals.filter(g => g.id !== id) })),
    addMilestone: (id, title) => store.mutate(doc => {
        const goal = doc.goals.find(g => g.id === id);
        if (!goal) throw new Error('This goal is no longer available. Refresh the list.');
        const milestone = { id: newId('ms'), title: text(title, 'a milestone', { max: 160 }), done: false, doneAt: null };
        return { ...doc, goals: doc.goals.map(g => (g.id === id ? { ...g, milestones: [...g.milestones, milestone], updatedAt: nowIso() } : g)) };
    }),
    toggleMilestone: (id, milestoneId) => store.mutate(doc => {
        const goal = doc.goals.find(g => g.id === id);
        if (!goal) throw new Error('This goal is no longer available. Refresh the list.');
        const milestones = goal.milestones.map(m => (m.id === milestoneId ? { ...m, done: !m.done, doneAt: m.done ? null : nowIso() } : m));
        return { ...doc, goals: doc.goals.map(g => (g.id === id ? { ...g, milestones, updatedAt: nowIso() } : g)) };
    }),
    removeMilestone: (id, milestoneId) => store.mutate(doc => ({ ...doc, goals: doc.goals.map(g => (g.id === id ? { ...g, milestones: g.milestones.filter(m => m.id !== milestoneId) } : g)) })),
    addContribution: (id, { amount, date, note = '' }) => store.mutate(doc => {
        const goal = doc.goals.find(g => g.id === id);
        if (!goal) throw new Error('This goal is no longer available. Refresh the list.');
        const entry = { id: newId('ctr'), amount: money(amount, 'contribution', { min: -1e13 }), date: optionalDate(date, 'contribution date') || nowIso().slice(0, 10), note: text(note, 'a note', { max: 200, required: false }) };
        if (entry.amount === 0) throw new Error('Enter a contribution amount.');
        return { ...doc, goals: doc.goals.map(g => (g.id === id ? { ...g, contributions: [entry, ...g.contributions], updatedAt: nowIso() } : g)) };
    }),
    removeContribution: (id, contributionId) => store.mutate(doc => ({ ...doc, goals: doc.goals.map(g => (g.id === id ? { ...g, contributions: g.contributions.filter(c => c.id !== contributionId) } : g)) })),
    /** Read-only snapshot for other modules (planner goal picker, insights). */
    summary: async (tasks = [], today = nowIso().slice(0, 10)) => {
        const goals = (await store.load()).goals;
        return goals.map(goal => ({ ...clone(goal), progress: goalProgress(goal, tasks), plan: goalPlan(goal, today) }));
    }
};
