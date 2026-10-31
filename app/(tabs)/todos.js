/**
 * app/(tabs)/todos.js — Tasks & Goals
 *
 * Today view (overdue / today / next 7 days / someday), full list with search,
 * and life goals with milestones, money targets and linked tasks. Every write goes
 * through the canonical TodoService / LifeGoalsService and shows honest errors.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, BackHandler } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Plus, CheckCircle2, Circle, Target } from 'lucide-react-native';
import { Screen, Card, Btn, Field, MoneyField, DateField, Choice, Chip, Sheet, Notice, Empty, Badge, Stat, Progress, ListItem, KeyValue, useAsyncAction, useMoney, ui, palette, todayLocal, confirm } from '../../components/ui/ModuleUI';
import { TodoService } from '../../services/todos';
import { groupTasks, taskStats, subtaskProgress, searchTasks, TASK_CATEGORIES, RECURRENCES, taskDueDate } from '../../services/life/taskViews';
import { LifeGoalsService, goalProgress, goalPlan, GOAL_CATEGORIES, GOAL_STATUSES } from '../../services/life/lifeGoalsService';

const emptyTaskForm = () => ({ task: '', dueDate: '', priority: 'normal', category: 'personal', recurrence: 'none', notes: '', amount: '', estimatedMinutes: '', goalId: '', subtasks: [], newSubtask: '' });
const emptyGoalForm = () => ({ title: '', category: 'financial', why: '', targetDate: '', targetAmount: '' });

export default function TasksAndGoalsScreen() {
    const router = useRouter();
    const { returnTo, tab: initialTab } = useLocalSearchParams();
    const money = useMoney();
    const { busy, error, setError, run } = useAsyncAction();
    const [tab, setTab] = useState(initialTab === 'goals' ? 'goals' : 'today');
    const [tasks, setTasks] = useState([]);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState('pending');
    const [taskSheet, setTaskSheet] = useState(null); // {id|null, form}
    const [goalSheet, setGoalSheet] = useState(null);
    const [goalDetail, setGoalDetail] = useState(null);
    const [contribution, setContribution] = useState({ amount: '', note: '' });
    const [milestone, setMilestone] = useState('');
    const today = todayLocal();

    const handleBack = useCallback(() => {
        if (returnTo === 'time-management') { router.replace('/(tabs)/time-management'); return; }
        if (router.canGoBack()) router.back(); else router.replace('/(tabs)');
    }, [router, returnTo]);
    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            if (taskSheet) { setTaskSheet(null); return true; }
            if (goalSheet) { setGoalSheet(null); return true; }
            if (goalDetail) { setGoalDetail(null); return true; }
            handleBack(); return true;
        });
        return () => sub.remove();
    }, [taskSheet, goalSheet, goalDetail, handleBack]);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [t, g] = await Promise.all([TodoService.getTodos(), LifeGoalsService.list()]);
            setTasks(t); setGoals(g); setError('');
        } catch (e) { setError(e.message || 'Tasks could not be loaded. Retry.'); }
        finally { setLoading(false); }
    }, [setError]);
    useFocusEffect(useCallback(() => { load(); }, [load]));

    const groups = useMemo(() => groupTasks(tasks, today), [tasks, today]);
    const stats = useMemo(() => taskStats(tasks, today), [tasks, today]);
    const goalName = ref => (ref?.domain === 'life' ? goals.find(g => g.id === ref.id)?.title || 'Removed goal' : ref?.domain === 'career' ? 'Career goal' : ref?.domain === 'family' ? 'Family goal' : null);

    const openTask = task => setTaskSheet({ id: task?.id ?? null, form: task ? { ...emptyTaskForm(), task: task.task, dueDate: task.dueDate || '', priority: task.priority || 'normal', category: task.category || 'personal', recurrence: task.recurrence || 'none', notes: task.notes || '', amount: task.amount != null ? String(task.amount) : '', estimatedMinutes: task.estimatedMinutes ? String(task.estimatedMinutes) : '', goalId: task.goalRef?.domain === 'life' ? task.goalRef.id : '', subtasks: task.subtasks || [] } : emptyTaskForm() });
    const setForm = patch => setTaskSheet(s => ({ ...s, form: { ...s.form, ...patch } }));
    const saveTask = () => run(async () => {
        const f = taskSheet.form;
        const payload = { task: f.task, dueDate: f.dueDate || null, priority: f.priority, category: f.category, recurrence: f.recurrence, notes: f.notes, amount: f.amount === '' ? null : f.amount, estimatedMinutes: f.estimatedMinutes === '' ? null : Number(f.estimatedMinutes), goalRef: f.goalId ? { domain: 'life', id: f.goalId } : null, subtasks: f.subtasks };
        setTasks(taskSheet.id ? await TodoService.updateTodo(taskSheet.id, payload) : await TodoService.addTodo(payload));
        setTaskSheet(null);
    });
    const complete = task => run(async () => setTasks(task.status === 'completed' ? await TodoService.setStatus(task.id, 'pending') : await TodoService.completeTodo(task.id)));
    const removeTask = id => confirm('Delete task', 'This removes the task permanently. Time blocks keep a note that it is missing.', () => run(async () => { setTasks(await TodoService.deleteTodo(id)); setTaskSheet(null); }), 'Delete');

    const saveGoal = () => run(async () => {
        const f = goalSheet.form;
        const doc = goalSheet.id ? await LifeGoalsService.update(goalSheet.id, { title: f.title, category: f.category, why: f.why, targetDate: f.targetDate || null, targetAmount: f.targetAmount === '' ? null : f.targetAmount }) : await LifeGoalsService.add({ title: f.title, category: f.category, why: f.why, targetDate: f.targetDate || null, targetAmount: f.targetAmount === '' ? null : f.targetAmount });
        setGoals(doc.goals); setGoalSheet(null); if (goalDetail) setGoalDetail(doc.goals.find(g => g.id === goalDetail.id) || null);
    });
    const goalAction = fn => run(async () => { const doc = await fn(); setGoals(doc.goals); setGoalDetail(doc.goals.find(g => g.id === goalDetail?.id) || null); });

    const TaskRow = ({ task }) => {
        const done = task.status === 'completed', due = taskDueDate(task), sub = subtaskProgress(task);
        return (
            <ListItem>
                <View style={[ui.row, { alignItems: 'flex-start' }]}>
                    <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={`${done ? 'Reopen' : 'Complete'} ${task.task}`} onPress={() => complete(task)} disabled={busy} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                        {done ? <CheckCircle2 size={24} color={palette.success} /> : <Circle size={24} color={task.priority === 'high' ? palette.danger : '#71717A'} />}
                    </TouchableOpacity>
                    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Edit ${task.task}`} style={ui.flex} onPress={() => openTask(task)}>
                        <Text style={[ui.text, { fontWeight: '700' }, done && { textDecorationLine: 'line-through', color: palette.muted }]}>{task.task}</Text>
                        <Text style={ui.muted}>{[due ? (due < today && !done ? `Overdue · ${due}` : due === today ? 'Today' : due) : 'No date', task.category, task.recurrence && task.recurrence !== 'none' ? `Repeats ${task.recurrence}` : null, goalName(task.goalRef), sub ? `${sub.done}/${sub.total} steps` : null, task.amount ? money.format(task.amount) : null, task.estimatedMinutes ? `${task.estimatedMinutes} min` : null].filter(Boolean).join(' · ')}</Text>
                    </TouchableOpacity>
                    {task.priority === 'high' && !done && <Badge text="HIGH" color={palette.danger} />}
                </View>
            </ListItem>
        );
    };
    const Section = ({ title, list, hint }) => (
        <Card title={`${title} (${list.length})`}>
            {!list.length && <Text style={ui.muted}>{hint}</Text>}
            {list.map(t => <TaskRow key={String(t.id)} task={t} />)}
        </Card>
    );

    const filtered = useMemo(() => searchTasks(tasks, query).filter(t => filter === 'all' || (filter === 'pending' ? t.status !== 'completed' : filter === 'completed' ? t.status === 'completed' : t.priority === 'high' && t.status !== 'completed')), [tasks, query, filter]);
    const activeGoals = goals.filter(g => g.status === 'active');

    return (
        <Screen title="Tasks & Goals" subtitle="What matters today, and where it leads." onBack={handleBack} loading={loading} error={error} retry={load}
            tabs={[{ value: 'today', label: 'Today' }, { value: 'all', label: 'All tasks' }, { value: 'goals', label: `Goals (${activeGoals.length})` }]} tab={tab} onTab={setTab}
            right={<TouchableOpacity accessibilityRole="button" accessibilityLabel={tab === 'goals' ? 'Add goal' : 'Add task'} onPress={() => (tab === 'goals' ? setGoalSheet({ id: null, form: emptyGoalForm() }) : openTask(null))} style={ui.back}><Plus color="#F4F4F5" size={22} /></TouchableOpacity>}>
            {tab === 'today' && <>
                <View style={ui.wrap}>
                    <Stat label="Overdue" value={String(stats.overdue)} color={stats.overdue ? palette.danger : undefined} />
                    <Stat label="Due today" value={String(stats.dueToday)} />
                    <Stat label="Done, 7 days" value={String(stats.completedLast7Days)} color={palette.success} />
                </View>
                {!tasks.length && <Empty title="No tasks yet" body="Add one thing you want done. Give it a date and it shows up here on the right day." action="Add task" onAction={() => openTask(null)} />}
                {stats.overdue > 0 && <Section title="Overdue" list={groups.overdue} hint="" />}
                <Section title="Today" list={groups.today} hint="Nothing due today. Pick something from Upcoming or enjoy the space." />
                <Section title="Upcoming" list={groups.upcoming.filter(t => taskDueDate(t) <= shift(today, 7))} hint="Nothing due in the next 7 days." />
                <Section title="Someday" list={groups.someday} hint="Undated ideas live here until you give them a date." />
                <Btn title="Plan time for these tasks" secondary onPress={() => router.push('/(tabs)/time-management')} />
            </>}
            {tab === 'all' && <>
                <Field label="Search" value={query} onChangeText={setQuery} placeholder="Search tasks and notes" />
                <View style={ui.wrap}>{[['pending', 'Pending'], ['high', 'High priority'], ['completed', 'Completed'], ['all', 'Everything']].map(([v, l]) => <Chip key={v} label={l} active={filter === v} onPress={() => setFilter(v)} />)}</View>
                <Card title={`${filtered.length} task${filtered.length === 1 ? '' : 's'}`}>
                    {!filtered.length && <Text style={ui.muted}>No tasks match.</Text>}
                    {filtered.map(t => <TaskRow key={String(t.id)} task={t} />)}
                </Card>
            </>}
            {tab === 'goals' && <>
                {!goals.length && <Empty title="No goals yet" body="A goal is a direction with a date or an amount. Tasks and savings attach to it so you can see progress honestly." action="Add goal" onAction={() => setGoalSheet({ id: null, form: emptyGoalForm() })} />}
                {[...activeGoals, ...goals.filter(g => g.status !== 'active')].map(goal => {
                    const progress = goalProgress(goal, tasks), plan = goalPlan(goal, today);
                    return (
                        <TouchableOpacity key={goal.id} accessibilityRole="button" accessibilityLabel={`Open goal ${goal.title}`} onPress={() => setGoalDetail(goal)} style={ui.card}>
                            <View style={[ui.row, { justifyContent: 'space-between' }]}>
                                <Text style={[ui.heading, ui.flex]}>{goal.title}</Text>
                                <Badge text={goal.status.toUpperCase()} color={goal.status === 'active' ? palette.info : goal.status === 'achieved' ? palette.success : palette.muted} />
                            </View>
                            <Text style={ui.muted}>{[goal.category, goal.targetDate ? `by ${goal.targetDate}` : null, goal.targetAmount ? `${money.format(plan.saved)} of ${money.format(goal.targetAmount)}` : null].filter(Boolean).join(' · ')}</Text>
                            <Progress value={progress} color={plan.pace === 'past-due' ? palette.danger : palette.primary} label={plan.pace === 'past-due' ? 'Past target date' : plan.monthlyNeeded ? `${money.format(plan.monthlyNeeded)} per month needed` : plan.daysLeft !== null ? `${plan.daysLeft} days left` : 'No deadline'} />
                        </TouchableOpacity>
                    );
                })}
            </>}

            {/* Task sheet */}
            <Sheet visible={!!taskSheet} title={taskSheet?.id ? 'Edit task' : 'New task'} onClose={() => setTaskSheet(null)}>
                {taskSheet && <>
                    <Notice>{error}</Notice>
                    <Field label="What needs doing" value={taskSheet.form.task} onChangeText={v => setForm({ task: v })} placeholder="e.g. Renew car insurance" autoFocus />
                    <DateField label="Due date" value={taskSheet.form.dueDate} onChangeText={v => setForm({ dueDate: v })} />
                    <Choice label="Priority" options={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: 'High' }]} value={taskSheet.form.priority} onChange={v => setForm({ priority: v })} />
                    <Choice label="Category" options={TASK_CATEGORIES} value={taskSheet.form.category} onChange={v => setForm({ category: v })} />
                    <Choice label="Repeat" options={RECURRENCES.map(r => ({ value: r, label: r === 'none' ? 'Does not repeat' : r }))} value={taskSheet.form.recurrence} onChange={v => setForm({ recurrence: v })} />
                    {!!activeGoals.length && <Choice label="Part of a goal" options={[{ value: '', label: 'None' }, ...activeGoals.map(g => ({ value: g.id, label: g.title }))]} value={taskSheet.form.goalId} onChange={v => setForm({ goalId: v })} />}
                    <View style={ui.row}>
                        <View style={ui.flex}><MoneyField label="Money involved" value={taskSheet.form.amount} onChangeText={v => setForm({ amount: v })} /></View>
                        <View style={ui.flex}><Field label="Estimate (min)" numeric value={taskSheet.form.estimatedMinutes} onChangeText={v => setForm({ estimatedMinutes: v })} placeholder="30" /></View>
                    </View>
                    <Field label="Notes" multiline value={taskSheet.form.notes} onChangeText={v => setForm({ notes: v })} placeholder="Details, links, phone numbers" />
                    <Text style={ui.label}>Steps</Text>
                    {taskSheet.form.subtasks.map((s, i) => (
                        <View key={s.id || i} style={ui.row}>
                            <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: !!s.done }} accessibilityLabel={`Step ${s.title}`} onPress={() => setForm({ subtasks: taskSheet.form.subtasks.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{s.done ? <CheckCircle2 size={22} color={palette.success} /> : <Circle size={22} color="#71717A" />}</TouchableOpacity>
                            <Text style={[ui.text, ui.flex, s.done && { textDecorationLine: 'line-through', color: palette.muted }]}>{s.title}</Text>
                            <Chip label="Remove" onPress={() => setForm({ subtasks: taskSheet.form.subtasks.filter((_, j) => j !== i) })} />
                        </View>
                    ))}
                    <View style={ui.row}>
                        <View style={ui.flex}><Field value={taskSheet.form.newSubtask} onChangeText={v => setForm({ newSubtask: v })} placeholder="Add a step" /></View>
                        <Btn title="Add step" secondary onPress={() => { if (taskSheet.form.newSubtask.trim()) setForm({ subtasks: [...taskSheet.form.subtasks, { title: taskSheet.form.newSubtask.trim(), done: false }], newSubtask: '' }); }} />
                    </View>
                    <Btn title={busy ? 'Saving…' : 'Save task'} disabled={busy} onPress={saveTask} />
                    {taskSheet.id && <View style={ui.row}>
                        <View style={ui.flex}><Btn title="Plan time" secondary onPress={() => { setTaskSheet(null); router.push('/(tabs)/time-management'); }} /></View>
                        <View style={ui.flex}><Btn title="Delete" danger onPress={() => removeTask(taskSheet.id)} /></View>
                    </View>}
                </>}
            </Sheet>

            {/* Goal sheet */}
            <Sheet visible={!!goalSheet} title={goalSheet?.id ? 'Edit goal' : 'New goal'} onClose={() => setGoalSheet(null)}>
                {goalSheet && <>
                    <Notice>{error}</Notice>
                    <Field label="Goal" value={goalSheet.form.title} onChangeText={v => setGoalSheet(s => ({ ...s, form: { ...s.form, title: v } }))} placeholder="e.g. Six-month emergency fund" autoFocus />
                    <Choice label="Area of life" options={GOAL_CATEGORIES} value={goalSheet.form.category} onChange={v => setGoalSheet(s => ({ ...s, form: { ...s.form, category: v } }))} />
                    <Field label="Why it matters" multiline value={goalSheet.form.why} onChangeText={v => setGoalSheet(s => ({ ...s, form: { ...s.form, why: v } }))} placeholder="One honest sentence keeps you going" />
                    <DateField label="Target date" value={goalSheet.form.targetDate} onChangeText={v => setGoalSheet(s => ({ ...s, form: { ...s.form, targetDate: v } }))} />
                    <MoneyField label="Money target" value={goalSheet.form.targetAmount} onChangeText={v => setGoalSheet(s => ({ ...s, form: { ...s.form, targetAmount: v } }))} hint="Leave empty for goals that are not about money." />
                    <Btn title={busy ? 'Saving…' : 'Save goal'} disabled={busy} onPress={saveGoal} />
                </>}
            </Sheet>

            {/* Goal detail */}
            <Sheet visible={!!goalDetail} title={goalDetail?.title || 'Goal'} onClose={() => setGoalDetail(null)}>
                {goalDetail && (() => { const g = goals.find(x => x.id === goalDetail.id) || goalDetail; const plan = goalPlan(g, today); const linked = tasks.filter(t => t.goalRef?.domain === 'life' && t.goalRef.id === g.id); return <>
                    <Notice>{error}</Notice>
                    {!!g.why && <Text style={ui.text}>{g.why}</Text>}
                    <Progress value={goalProgress(g, tasks)} label="overall progress" />
                    {g.targetAmount != null && <Card title="Money">
                        <KeyValue label="Saved so far" value={money.format(plan.saved)} color={palette.success} />
                        <KeyValue label="Remaining" value={money.format(plan.remainingAmount)} />
                        {plan.monthlyNeeded !== null && <KeyValue label="Needed per month" value={money.format(plan.monthlyNeeded)} color={palette.warning} />}
                        <View style={ui.row}>
                            <View style={ui.flex}><MoneyField label="Add contribution" value={contribution.amount} onChangeText={v => setContribution(c => ({ ...c, amount: v }))} /></View>
                            <View style={ui.flex}><Field label="Note" value={contribution.note} onChangeText={v => setContribution(c => ({ ...c, note: v }))} placeholder="Optional" /></View>
                        </View>
                        <Btn title="Record contribution" secondary disabled={busy} onPress={() => goalAction(async () => { const doc = await LifeGoalsService.addContribution(g.id, { amount: contribution.amount, note: contribution.note }); setContribution({ amount: '', note: '' }); return doc; })} />
                        {g.contributions.slice(0, 5).map(c => <KeyValue key={c.id} label={`${c.date}${c.note ? ` · ${c.note}` : ''}`} value={money.format(c.amount)} />)}
                    </Card>}
                    <Card title="Milestones">
                        {!g.milestones.length && <Text style={ui.muted}>Break the goal into 2–5 visible steps.</Text>}
                        {g.milestones.map(m => (
                            <View key={m.id} style={ui.row}>
                                <TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: m.done }} accessibilityLabel={`Milestone ${m.title}`} disabled={busy} onPress={() => goalAction(() => LifeGoalsService.toggleMilestone(g.id, m.id))} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>{m.done ? <CheckCircle2 size={22} color={palette.success} /> : <Circle size={22} color="#71717A" />}</TouchableOpacity>
                                <Text style={[ui.text, ui.flex, m.done && { textDecorationLine: 'line-through', color: palette.muted }]}>{m.title}</Text>
                                <Chip label="Remove" onPress={() => goalAction(() => LifeGoalsService.removeMilestone(g.id, m.id))} />
                            </View>
                        ))}
                        <View style={ui.row}>
                            <View style={ui.flex}><Field value={milestone} onChangeText={setMilestone} placeholder="New milestone" /></View>
                            <Btn title="Add" secondary disabled={busy || !milestone.trim()} onPress={() => goalAction(async () => { const doc = await LifeGoalsService.addMilestone(g.id, milestone); setMilestone(''); return doc; })} />
                        </View>
                    </Card>
                    <Card title={`Linked tasks (${linked.length})`}>
                        {!linked.length && <Text style={ui.muted}>Create a task and choose this goal under “Part of a goal”.</Text>}
                        {linked.map(t => <TaskRow key={String(t.id)} task={t} />)}
                        <Btn title="Add a task for this goal" secondary onPress={() => { setGoalDetail(null); setTaskSheet({ id: null, form: { ...emptyTaskForm(), goalId: g.id, category: g.category === 'financial' ? 'money' : 'personal' } }); }} />
                    </Card>
                    <Choice label="Status" options={GOAL_STATUSES} value={g.status} onChange={v => goalAction(() => LifeGoalsService.setStatus(g.id, v))} />
                    <View style={ui.row}>
                        <View style={ui.flex}><Btn title="Edit" secondary onPress={() => setGoalSheet({ id: g.id, form: { title: g.title, category: g.category, why: g.why || '', targetDate: g.targetDate || '', targetAmount: g.targetAmount != null ? String(g.targetAmount) : '' } })} /></View>
                        <View style={ui.flex}><Btn title="Delete goal" danger onPress={() => confirm('Delete goal', 'Linked tasks are kept and will show “Removed goal”.', () => goalAction(async () => { const doc = await LifeGoalsService.remove(g.id); setGoalDetail(null); return doc; }), 'Delete')} /></View>
                    </View>
                </>; })()}
            </Sheet>
        </Screen>
    );
}
function shift(date, days) { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
