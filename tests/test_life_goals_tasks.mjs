/**
 * tests/test_life_goals_tasks.mjs
 * Tasks & Goals (Goals & Life Planning): extended task attributes, recurrence,
 * subtasks, grouping views and life goals with milestones and contributions.
 * Runs on fixture storage only (mock localStorage).
 */
import assert from 'node:assert/strict';
import { StorageService, STORAGE_KEYS, clearAllData } from '../services/storage.js';
import { TodoService } from '../services/todos.js';
import { groupTasks, taskStats, nextOccurrence, subtaskProgress, tasksForGoal, searchTasks } from '../services/life/taskViews.js';
import { LifeGoalsService, goalProgress, goalPlan, LIFE_GOALS_STORAGE_KEY } from '../services/life/lifeGoalsService.js';

let count = 0;
async function test(name, fn) { await fn(); count++; console.log('PASS ' + name); }
await clearAllData();

await test('Task with due date, category, notes, subtasks and amount saves and adapts', async () => {
    const rows = await TodoService.addTodo({ task: 'Pay school fees', dueDate: '2026-10-05', category: 'money', notes: 'Term 2', amount: '12,500', subtasks: [{ title: 'Collect challan' }, { title: 'Pay online' }] });
    const t = rows[0];
    assert.equal(t.dueDate, '2026-10-05'); assert.equal(t.deadline, '2026-10-05'); assert.equal(t.category, 'money'); assert.equal(t.amount, 12500);
    assert.equal(t.subtasks.length, 2); assert.equal(subtaskProgress(t).percent, 0);
});
await test('Invalid due date, category, repeat-without-date and bad goal link reject without write', async () => {
    const before = await TodoService.getTodos();
    await assert.rejects(TodoService.addTodo({ task: 'x', dueDate: '2026-02-30' }), /valid due date/);
    await assert.rejects(TodoService.addTodo({ task: 'x', category: 'nonsense' }), /valid category/);
    await assert.rejects(TodoService.addTodo({ task: 'x', recurrence: 'weekly' }), /needs a due date/);
    await assert.rejects(TodoService.addTodo({ task: 'x', goalRef: { domain: 'planet', id: '1' } }), /valid goal/);
    assert.deepEqual(await TodoService.getTodos(), before);
});
await test('updateTodo edits attributes, keeps deadline in sync and preserves unknown fields', async () => {
    const id = (await TodoService.getTodos())[0].id;
    const saved = await StorageService.load(STORAGE_KEYS.TODOS, []);
    await StorageService.save(STORAGE_KEYS.TODOS, saved.map(r => (r.id === id ? { ...r, legacyExtra: { keep: true } } : r)));
    const rows = await TodoService.updateTodo(id, { task: 'Pay school fees (term 2)', dueDate: '2026-10-10', priority: 'high' });
    const t = rows.find(r => r.id === id);
    assert.equal(t.task, 'Pay school fees (term 2)'); assert.equal(t.deadline, '2026-10-10'); assert.equal(t.priority, 'high'); assert.deepEqual(t.legacyExtra, { keep: true });
});
await test('Subtask toggle persists and progress is reported', async () => {
    const t = (await TodoService.getTodos())[0];
    const rows = await TodoService.toggleSubtask(t.id, t.subtasks[0].id);
    assert.equal(subtaskProgress(rows.find(r => r.id === t.id)).percent, 50);
});
await test('Completing a repeating task creates exactly one next occurrence, never twice', async () => {
    const rows = await TodoService.addTodo({ task: 'Water plants', dueDate: '2026-09-11', recurrence: 'weekly' });
    const id = rows[0].id;
    const after = await TodoService.completeTodo(id);
    const next = after.filter(r => r.task === 'Water plants' && r.status === 'pending');
    assert.equal(next.length, 1); assert.equal(next[0].dueDate, '2026-09-18'); assert.equal(next[0].recurrenceParentId, id);
    const again = await TodoService.completeTodo(id);
    assert.equal(again.filter(r => r.task === 'Water plants' && r.status === 'pending').length, 1);
    assert.equal(nextOccurrence('2026-01-31', 'monthly'), '2026-02-28'); assert.equal(nextOccurrence('2026-12-31', 'yearly'), '2027-12-31');
});
await test('Today view groups overdue, today, upcoming, someday and completed', async () => {
    await TodoService.addTodo({ task: 'Overdue thing', dueDate: '2026-09-01' });
    await TodoService.addTodo({ task: 'Today thing', dueDate: '2026-09-11' });
    await TodoService.addTodo({ task: 'Someday thing' });
    const tasks = await TodoService.getTodos();
    const g = groupTasks(tasks, '2026-09-11');
    assert.ok(g.overdue.some(t => t.task === 'Overdue thing')); assert.ok(g.today.some(t => t.task === 'Today thing'));
    assert.ok(g.upcoming.some(t => t.task === 'Water plants')); assert.ok(g.someday.some(t => t.task === 'Someday thing')); assert.equal(g.completed.length, 1);
    const stats = taskStats(tasks, '2026-09-11');
    assert.equal(stats.overdue, 1); assert.equal(stats.dueToday, 1); assert.equal(stats.completed, 1);
    assert.equal(searchTasks(tasks, 'plants').length, 2);
});
await test('Life goal add, milestones, contributions and progress', async () => {
    let doc = await LifeGoalsService.add({ title: 'Emergency fund', category: 'financial', targetAmount: 120000, targetDate: '2027-09-11', why: 'Sleep well' });
    const goal = doc.goals[0];
    assert.equal(goal.status, 'active'); assert.equal(goalProgress(goal), 0);
    doc = await LifeGoalsService.addMilestone(goal.id, 'Open separate account');
    doc = await LifeGoalsService.addMilestone(goal.id, 'Reach half');
    doc = await LifeGoalsService.toggleMilestone(goal.id, doc.goals[0].milestones[0].id);
    doc = await LifeGoalsService.addContribution(goal.id, { amount: 30000, date: '2026-09-11', note: 'Bonus' });
    const g = doc.goals[0];
    assert.equal(goalProgress(g), Math.round(((30000 / 120000 + 0.5) / 2) * 100));
    const plan = goalPlan(g, '2026-09-11');
    assert.equal(plan.saved, 30000); assert.equal(plan.remainingAmount, 90000); assert.equal(plan.daysLeft, 365); assert.ok(plan.monthlyNeeded > 7000 && plan.monthlyNeeded < 8000);
});
await test('Tasks link to goals by reference and goal progress counts linked tasks', async () => {
    const goal = (await LifeGoalsService.list())[0];
    await TodoService.addTodo({ task: 'Set up auto transfer', goalRef: { domain: 'life', id: goal.id } });
    const tasks = await TodoService.getTodos();
    assert.equal(tasksForGoal(tasks, { domain: 'life', id: goal.id }).length, 1);
    const before = goalProgress(goal, []);
    assert.ok(goalProgress(goal, tasks) < before);
    await LifeGoalsService.remove(goal.id);
    assert.equal((await TodoService.getTodos()).some(t => t.task === 'Set up auto transfer'), true, 'removing a goal never deletes tasks');
});
await test('Goal validation rejects blanks, bad dates and unknown status; corrupt store never overwritten', async () => {
    await assert.rejects(LifeGoalsService.add({ title: ' ' }), /goal title/);
    await assert.rejects(LifeGoalsService.add({ title: 'x', targetDate: 'soon' }), /target date/);
    const doc = await LifeGoalsService.add({ title: 'Learn to swim', category: 'health' });
    await assert.rejects(LifeGoalsService.setStatus(doc.goals[0].id, 'flying'), /status/);
    await StorageService.save(LIFE_GOALS_STORAGE_KEY, { version: 9 });
    await assert.rejects(LifeGoalsService.add({ title: 'x' }), /unsupported/);
    assert.deepEqual(await StorageService.load(LIFE_GOALS_STORAGE_KEY), { version: 9 });
});
console.log(count + ' tasks & goals cases passed using fixture storage only.');
