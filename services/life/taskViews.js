/**
 * services/life/taskViews.js
 *
 * Pure helpers that turn saved tasks into what a person needs to see today:
 * overdue, due today, coming up, someday and done. No storage access.
 */
import { isDate, addDays, addMonths, daysBetween } from './storeKit.js';

export const TASK_CATEGORIES = ['personal', 'money', 'family', 'health', 'work', 'home', 'learning', 'errand', 'other'];
export const RECURRENCES = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
export const PRIORITIES = ['normal', 'high'];

export function taskDueDate(task) {
    if (isDate(task?.dueDate)) return task.dueDate;
    if (isDate(task?.deadline)) return task.deadline;
    return null;
}

export function nextOccurrence(date, recurrence) {
    if (!isDate(date)) throw new Error('A recurring task needs a valid due date.');
    switch (recurrence) {
        case 'daily': return addDays(date, 1);
        case 'weekly': return addDays(date, 7);
        case 'monthly': return addMonths(date, 1);
        case 'yearly': return addMonths(date, 12);
        default: return null;
    }
}

/** Groups tasks for the Today view. `today` is a local YYYY-MM-DD date. */
export function groupTasks(tasks, today) {
    const groups = { overdue: [], today: [], upcoming: [], someday: [], completed: [] };
    for (const task of tasks || []) {
        if (task.status === 'completed') { groups.completed.push(task); continue; }
        const due = taskDueDate(task);
        if (!due) groups.someday.push(task);
        else if (due < today) groups.overdue.push(task);
        else if (due === today) groups.today.push(task);
        else groups.upcoming.push(task);
    }
    const byDue = (a, b) => (taskDueDate(a) || '9999').localeCompare(taskDueDate(b) || '9999') || (a.priority === 'high' ? -1 : 0) - (b.priority === 'high' ? -1 : 0);
    groups.overdue.sort(byDue); groups.today.sort(byDue); groups.upcoming.sort(byDue);
    groups.completed.sort((a, b) => String(b.completedAt || '').localeCompare(String(a.completedAt || '')));
    return groups;
}

export function subtaskProgress(task) {
    const list = Array.isArray(task?.subtasks) ? task.subtasks : [];
    if (!list.length) return null;
    const done = list.filter(s => s.done).length;
    return { done, total: list.length, percent: Math.round((done / list.length) * 100) };
}

export function taskStats(tasks, today) {
    const groups = groupTasks(tasks, today);
    const total = (tasks || []).length;
    const completed = groups.completed.length;
    const doneLast7 = groups.completed.filter(t => t.completedAt && daysBetween(String(t.completedAt).slice(0, 10), today) <= 7 && daysBetween(String(t.completedAt).slice(0, 10), today) >= 0).length;
    return {
        total, completed, pending: total - completed,
        overdue: groups.overdue.length, dueToday: groups.today.length, upcoming: groups.upcoming.length, someday: groups.someday.length,
        completedLast7Days: doneLast7,
        completionRate: total ? Math.round((completed / total) * 100) : 0
    };
}

/** Tasks linked to a goal reference {domain, id}. */
export function tasksForGoal(tasks, ref) {
    if (!ref) return [];
    return (tasks || []).filter(t => t.goalRef && t.goalRef.domain === ref.domain && String(t.goalRef.id) === String(ref.id));
}

export function searchTasks(tasks, query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return tasks || [];
    return (tasks || []).filter(t => [t.task, t.notes, t.category].some(v => String(v || '').toLowerCase().includes(q)));
}
