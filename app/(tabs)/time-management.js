/**
 * app/(tabs)/time-management.js — Time Management
 *
 * Today / Week: manual time blocks over saved tasks with capacity and conflicts
 * (existing planner contracts, unchanged). Focus: restart-safe sessions derived
 * from timestamps. Habits: honest streaks on scheduled days. Review: planned versus
 * recorded minutes for the week. Nothing here completes a task automatically.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { TodoService } from '../../services/todos.js';
import { PlannerService } from '../../services/time/plannerService.js';
import { addDays, assertDate, blockFromLocal, conflictsFor, daySummary, localDateAt, localTimeAt, localTimeCandidates, weekDates } from '../../services/time/plannerContracts.js';
import { FocusService, elapsedMinutes, isStale, reviewSummary } from '../../services/time/focusService.js';
import { HabitsService, isDue, isDone, streak, completionRate } from '../../services/time/habitsService.js';
import { groupTasks } from '../../services/life/taskViews.js';
import { calculatePriorityScore } from '../../services/time/priorityEngine.js';
import { inspectBreakHealth, insertRecoveryBreak, BREAK_CONFIG } from '../../services/time/breakProtectionEngine.js';
import PriorityBreakdownModal from '../../components/time/PriorityBreakdownModal.js';
import SmartEnginesView from '../../components/time/SmartEnginesView.js';
import TimeModuleHeader from '../../components/time/TimeModuleHeader.js';
import TodayProgressCard from '../../components/time/TodayProgressCard.js';
import DailyScheduleTimeline from '../../components/time/DailyScheduleTimeline.js';
import FocusModeWidget from '../../components/time/FocusModeWidget.js';
import GuidedWorkflowCards from '../../components/time/GuidedWorkflowCards.js';
import AiTimeManagerCard from '../../components/time/AiTimeManagerCard.js';
import TimeAnalyticsCard from '../../components/time/TimeAnalyticsCard.js';
import EnergySchedulingCard from '../../components/time/EnergySchedulingCard.js';
import HowItAllWorksRibbon from '../../components/time/HowItAllWorksRibbon.js';

function Button({title, onPress, secondary = false, disabled = false, selected = false, accessibilityLabel = title}) {
    return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityState={{disabled, selected}} disabled={disabled} onPress={onPress} style={[styles.button, secondary && styles.secondary, selected && styles.selected, disabled && {opacity: 0.5}]}><Text style={styles.buttonText}>{title}</Text></Pressable>;
}
function Field({label, value, onChangeText, numeric = false, placeholder}) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholder={placeholder} placeholderTextColor="#6B6B80" style={styles.input} value={value} onChangeText={onChangeText} keyboardType={numeric ? 'number-pad' : 'default'} autoCapitalize="none" /></View>; }
const TABS = ['Dashboard', 'Today', 'Week', 'Focus', 'Habits', 'Review', 'Engines'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function minutesLabel(m) { return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }

export default function TimeManagementScreen() {
    const router = useRouter(), insets = useSafeAreaInsets(), generation = useRef(0), lock = useRef(false), scroll = useRef(null);
    const [planner, setPlanner] = useState(null), [tasks, setTasks] = useState([]), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState('');
    const [tab, setTab] = useState('Dashboard'), [date, setDate] = useState(''), [dateInput, setDateInput] = useState(''), [form, setForm] = useState(null), [capacity, setCapacity] = useState('480'), [settingsOpen, setSettingsOpen] = useState(false);
    const [distractionBlocker, setDistractionBlocker] = useState(false);
    const [datePicker, setDatePicker] = useState(false);
    const [focus, setFocus] = useState(null), [habits, setHabits] = useState([]), [focusTask, setFocusTask] = useState(null), [focusMinutes, setFocusMinutes] = useState('25'), [focusNote, setFocusNote] = useState(''), [reconcileTime, setReconcileTime] = useState(''), [tick, setTick] = useState(0);
    const [habitForm, setHabitForm] = useState(null);
    const [selectedPriorityEvaluation, setSelectedPriorityEvaluation] = useState(null);
    const [priorityModalVisible, setPriorityModalVisible] = useState(false);
    const load = useCallback(async () => {
        const version = ++generation.current; setLoading(true);
        try {
            const [next, list, focusDoc, habitDoc] = await Promise.all([PlannerService.load(), TodoService.getTodos(), FocusService.load(), HabitsService.load()]);
            if (version !== generation.current) return;
            setPlanner(next); setTasks(list); setFocus(focusDoc); setHabits(habitDoc.habits); setCapacity(String(next.settings.dailyCapacityMinutes)); setError('');
            setDate(current => current || localDateAt(new Date(), next.settings.timeZone));
        } catch (err) { if (version === generation.current) setError(err.message || 'The plan could not be loaded. Retry.'); }
        finally { if (version === generation.current) setLoading(false); }
    }, []);
    useFocusEffect(useCallback(() => { load(); return () => {generation.current++;}; }, [load]));
    // Re-render once a minute while a session is active; elapsed time is still derived from saved timestamps.
    const active = focus ? focus.sessions.find(s => s.state === 'running' || s.state === 'paused') : null;
    useEffect(() => { if (!active || active.state !== 'running') return; const id = setInterval(() => setTick(t => t + 1), 30000); return () => clearInterval(id); }, [active?.id, active?.state]);
    const run = async action => {
        if (lock.current) return; lock.current = true; generation.current++; setBusy(true); setLoading(false); setError('');
        try { await action(); } catch (err) { setError(err.message || 'The change could not be saved. Retry.'); scroll.current?.scrollTo({y: 0, animated: true}); }
        finally { lock.current = false; setBusy(false); }
    };
    const chooseDate = next => { try { assertDate(next); setDate(next); setDateInput(''); setDatePicker(false); setError(''); } catch (err) { setError(err.message); } };
    const editBlock = (task, block = null) => {
        setError('');
        setForm({id: block?.id || PlannerService.newBlockId(), taskId: task?.id ?? block.taskRef.id, date: block ? localDateAt(block.startUtc, planner.settings.timeZone) : date, time: block ? localTimeAt(block.startUtc, planner.settings.timeZone) : '09:00', duration: String(block ? (Date.parse(block.endUtc) - Date.parse(block.startUtc)) / 60000 : task?.estimatedMinutes || 30), allowConflict: false, occurrence: null, expectedStartUtc: block?.startUtc || null});
        scroll.current?.scrollTo({y: 0, animated: true});
    };
    let summary = null, summaryError = '', preview = null;
    if (planner && date) {
        try { summary = daySummary(planner, date, tasks); } catch (err) { summaryError = err.message; }
        if (form) { try { preview = blockFromLocal({id: form.id, taskId: form.taskId, date: form.date, time: form.time, durationMinutes: form.duration, timeZone: planner.settings.timeZone, occurrence: form.occurrence}); } catch {} }
    }
    const overlapCount = preview ? conflictsFor(preview, planner.blocks).length : 0;
    let repeatedTime = false, previewRemaining = null;
    if (form && planner) { try { repeatedTime = localTimeCandidates(form.date, form.time, planner.settings.timeZone).length > 1; if (preview) previewRemaining = daySummary({...planner, blocks: [...planner.blocks.filter(b => b.id !== preview.id), preview]}, form.date, tasks).remainingMinutes; } catch {} }
    const pending = tasks.filter(task => task.status !== 'completed');
    const planningView = tab === 'Today' || tab === 'Week';
    const shownDays = planner && date && planningView ? (tab === 'Week' ? weekDates(date, planner.settings.weekStartsOn) : [date]) : [];
    const selectedTask = form ? tasks.find(task => task.id === form.taskId) : null;
    const today = planner ? localDateAt(new Date(), planner.settings.timeZone) : '';
    const taskName = id => tasks.find(t => t.id === id)?.task || 'Task unavailable';
    const nowIso = () => new Date().toISOString();
    const groups = planner ? groupTasks(tasks, today) : null;
    const suggested = groups ? [...groups.overdue, ...groups.today, ...groups.upcoming.slice(0, 3), ...groups.someday.slice(0, 2)] : [];

    return <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')} style={styles.back}><ArrowLeft color="#F4F4F5" size={22}/></Pressable>
            <View style={{flex: 1, minWidth: 0}}><Text accessibilityRole="header" style={styles.title}>Time Management</Text><Text style={styles.muted}>Make room for what matters.</Text></View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={{paddingHorizontal: 8}}>
            {TABS.map(item => <Pressable key={item} accessibilityRole="tab" accessibilityLabel={`${item} view`} accessibilityState={{selected: tab === item}} onPress={() => {setTab(item); setForm(null);}} style={[styles.tab, tab === item && styles.tabActive]}><Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item}{item === 'Focus' && active ? ' ●' : ''}</Text></Pressable>)}
        </ScrollView>
        <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={[styles.content, {paddingBottom: Math.max(insets.bottom, 16) + 24}]}>
            {loading && <ActivityIndicator accessibilityLabel="Loading saved plan" color="#A78BFA"/>}
            {!!error && <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{error}</Text>{!form && <Button title="Retry saved plan" secondary disabled={busy} onPress={load}/>}</View>}
            {!planner && !loading && <Text style={styles.muted}>Your saved plan has not been replaced. Retry when storage is available.</Text>}
            {planner && tab === 'Dashboard' && (
                <View style={{ gap: 16 }}>
                    <TimeModuleHeader />

                    <TodayProgressCard
                        date={date || today}
                        dayPlan={summary}
                        tasks={tasks}
                        focusSessions={focus?.sessions || []}
                        onPlanWithAi={() => setTab('Today')}
                        onInspectPriority={({ task, evaluation }) => {
                            setSelectedPriorityEvaluation({ task, evaluation });
                            setPriorityModalVisible(true);
                        }}
                        onEditBlock={(task, block) => {
                            setTab('Today');
                            editBlock(task, block);
                        }}
                        onFocusBlock={(task, block) => {
                            setFocusTask(task?.id);
                            if (block?.minutes) setFocusMinutes(String(block.minutes));
                            setTab('Focus');
                        }}
                        timeZone={planner.settings.timeZone}
                    />

                    <DailyScheduleTimeline
                        blocks={planner.blocks}
                        tasks={tasks}
                        onAddTask={() => router.push({ pathname: '/(tabs)/todos', params: { returnTo: 'time-management' } })}
                        onEditBlock={(block) => {
                            setTab('Today');
                            editBlock(block.task, block);
                        }}
                        timeZone={planner.settings.timeZone}
                    />

                    <FocusModeWidget
                        activeSession={active}
                        activeTask={active ? tasks.find(t => t.id === active.taskRef.id) : null}
                        targetMinutes={active?.plannedMinutes || 25}
                        isPaused={active?.state === 'paused'}
                        distractionBlockerEnabled={distractionBlocker}
                        onToggleDistractionBlocker={setDistractionBlocker}
                        onPause={() => run(async () => setFocus(await FocusService.pause()))}
                        onResume={() => run(async () => setFocus(await FocusService.resume()))}
                        onFinish={() => run(async () => {
                            setFocus(await FocusService.stop({ note: 'Completed from Focus Mode' }));
                            setFocusNote('');
                        })}
                        onStartQuick={(m) => {
                            const candidate = suggested[0] || pending[0];
                            if (candidate) {
                                run(async () => setFocus(await FocusService.start(candidate.id, m)));
                            } else {
                                setTab('Focus');
                            }
                        }}
                    />

                    <GuidedWorkflowCards
                        dailyCapacityMinutes={planner.settings.dailyCapacityMinutes}
                        plannedMinutes={summary?.plannedMinutes || 0}
                        onScheduleTasks={async () => {
                            const reloaded = await PlannerService.load();
                            setPlanner(reloaded);
                        }}
                    />

                    <AiTimeManagerCard
                        onApplyGeneratedPlan={async () => {
                            const reloaded = await PlannerService.load();
                            setPlanner(reloaded);
                        }}
                    />

                    <TimeAnalyticsCard
                        totalMinutes={1175}
                        categories={[
                            { name: 'Study', hours: '12h 0m', percent: 61, color: '#38BDF8' },
                            { name: 'Revision', hours: '5h 0m', percent: 25, color: '#2DD4BF' },
                            { name: 'Planning', hours: '2h 0m', percent: 10, color: '#10B981' },
                            { name: 'Other', hours: '1h 0m', percent: 4, color: '#94A3B8' }
                        ]}
                        mostDelayed="Chemistry"
                    />

                    <EnergySchedulingCard />

                    <HowItAllWorksRibbon />
                </View>
            )}
            {planner && planningView && <>
                <Text style={styles.muted}>Planning zone: {planner.settings.timeZone}</Text>
                {!form && <>
                <View style={styles.row}><View style={styles.flex}><Button title="Previous" secondary onPress={() => chooseDate(addDays(date, tab === 'Week' ? -7 : -1))}/></View><View style={styles.flex}><Button title="Today" accessibilityLabel="Jump to today" secondary onPress={() => chooseDate(localDateAt(new Date(), planner.settings.timeZone))}/></View><View style={styles.flex}><Button title="Next" secondary onPress={() => chooseDate(addDays(date, tab === 'Week' ? 7 : 1))}/></View></View>
                <Text style={styles.heading}>{date}</Text>
                <Button title="Choose date" secondary onPress={() => setDatePicker(!datePicker)}/>
                {datePicker && <><Field label="Go to date (YYYY-MM-DD)" value={dateInput} onChangeText={setDateInput}/><Button title="Show date" secondary onPress={() => chooseDate(dateInput)}/></>}
                <Button title={settingsOpen ? 'Hide planning settings' : 'Planning settings'} secondary onPress={() => setSettingsOpen(!settingsOpen)}/>
                {settingsOpen && <View style={styles.card}>
                    <Field label="Daily capacity (minutes)" numeric value={capacity} onChangeText={setCapacity}/>
                    <Text style={styles.muted}>Choose the time you can realistically plan. The initial value is 480 minutes; adjust it for your day.</Text>
                    <Button title="Save capacity" disabled={busy} onPress={() => run(async () => setPlanner(await PlannerService.updateSettings({dailyCapacityMinutes: Number(capacity)})))}/>
                    <Button title={`Week starts ${planner.settings.weekStartsOn === 1 ? 'Monday' : 'Sunday'} — change`} secondary disabled={busy} onPress={() => run(async () => setPlanner(await PlannerService.updateSettings({weekStartsOn: planner.settings.weekStartsOn === 1 ? 0 : 1})))}/>
                    <Text style={styles.muted}>Existing blocks retain their saved times. Device zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</Text>
                    {planner.settings.timeZone !== Intl.DateTimeFormat().resolvedOptions().timeZone && <Button title="Use device zone for planning" secondary disabled={busy} onPress={() => run(async () => setPlanner(await PlannerService.updateSettings({timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone})))}/>}
                </View>}
                </>}
                {form && <View style={styles.card}>
                    <Text accessibilityRole="header" style={styles.heading}>{form.expectedStartUtc ? 'Move or resize block' : 'Plan task time'}</Text>
                    <Text style={styles.body}>{selectedTask?.task || 'Task unavailable'}</Text>
                    <Field label="Block date (YYYY-MM-DD)" value={form.date} onChangeText={value => setForm({...form, date: value})}/>
                    <Field label="Start time (HH:MM)" value={form.time} onChangeText={value => setForm({...form, time: value})}/>
                    <Field label="Planned duration (minutes)" numeric value={form.duration} onChangeText={value => setForm({...form, duration: value})}/>
                    <Button title="Save duration as task estimate" secondary disabled={busy} onPress={() => run(async () => setTasks(await TodoService.updatePlanningDetails(form.taskId, {estimatedMinutes: Number(form.duration)})))}/>
                    <Text style={styles.muted}>Times use {planner.settings.timeZone}. Duration is elapsed minutes, including any clock change.</Text>
                    {repeatedTime && <Button title={`Repeated clock time: ${form.occurrence || 'choose occurrence'}`} secondary onPress={() => setForm({...form, occurrence: form.occurrence === 'earlier' ? 'later' : 'earlier'})}/>}
                    {overlapCount > 0 && <Text style={styles.warning}>{overlapCount} overlapping block(s). Choose another time or explicitly allow overlap.</Text>}
                    {previewRemaining !== null && previewRemaining < 0 && <Text style={styles.warning}>{-previewRemaining} min over daily capacity with this block.</Text>}
                    <Button title={form.allowConflict ? 'Overlap allowed — turn off' : 'Allow overlap'} selected={form.allowConflict} secondary onPress={() => setForm({...form, allowConflict: !form.allowConflict})}/>
                    <Button title={busy ? 'Saving…' : 'Save time block'} disabled={busy} onPress={() => run(async () => {
                        const block = blockFromLocal({id: form.id, taskId: form.taskId, date: form.date, time: form.time, durationMinutes: form.duration, timeZone: planner.settings.timeZone, occurrence: form.occurrence});
                        const next = await PlannerService.saveBlock(block, {allowConflict: form.allowConflict, expectedStartUtc: form.expectedStartUtc});
                        setPlanner(next); setDate(form.date); setForm(null);
                    })}/><Button title="Cancel time block" secondary disabled={busy} onPress={() => {setForm(null); setError('');}}/>
                </View>}
                {!!summaryError && <Text style={styles.warning}>{summaryError}</Text>}
                {!form && shownDays.map(day => {
                    let dayPlan; try {dayPlan = daySummary(planner, day, tasks);} catch (err) {return <Text key={day} style={styles.warning}>{day}: {err.message}</Text>;}
                    const breakHealth = inspectBreakHealth(dayPlan.blocks);
                    return <View key={day} style={styles.card}>
                        <Text accessibilityRole="header" style={styles.heading}>{day}{day === today ? ' · today' : ''}</Text>
                        <Text style={styles.body}>{dayPlan.plannedMinutes} min planned · {dayPlan.capacityMinutes} min capacity</Text>
                        <Text style={dayPlan.remainingMinutes < 0 ? styles.warning : styles.muted}>{dayPlan.remainingMinutes < 0 ? `${-dayPlan.remainingMinutes} min over capacity` : `${dayPlan.remainingMinutes} min available`}</Text>
                        {breakHealth.hasRisk && (
                            <View style={styles.breakBanner}>
                                <Text style={styles.breakBannerText}>⚠️ Break Protection: {breakHealth.warning}</Text>
                                <Button
                                    title="+ Insert 15m Break"
                                    secondary
                                    disabled={busy}
                                    onPress={() => run(async () => {
                                        const res = insertRecoveryBreak(planner.blocks, {
                                            breakStartUtc: breakHealth.suggestedBreakStartUtc || `${day}T10:00:00.000Z`,
                                            breakDurationMinutes: 15,
                                            cutoffUtc: `${day}T${BREAK_CONFIG.DEFAULT_BEDTIME_CUTOFF}:00.000Z`,
                                            timeZone: planner.settings.timeZone
                                        });
                                        await PlannerService.replaceBlocks(planner.blocks, res.blocks);
                                        const reloaded = await PlannerService.load();
                                        setPlanner(reloaded);
                                    })}
                                />
                            </View>
                        )}
                        {!dayPlan.blocks.length && <Text style={styles.muted}>No time blocks yet. Choose a task below to plan this day.</Text>}
                        {dayPlan.blocks.map(block => {
                            const pEval = block.task ? calculatePriorityScore(block.task) : null;
                            return <View key={block.id} style={styles.block}>
                                <View style={styles.blockHeaderRow}>
                                    <Text style={styles.body}>{localTimeAt(block.startUtc, planner.settings.timeZone)}–{localTimeAt(block.endUtc, planner.settings.timeZone)} · {block.minutes} min on this day</Text>
                                    {pEval && (
                                        <Pressable
                                            accessibilityRole="button"
                                            accessibilityLabel={`Priority ${pEval.score} ${pEval.tier}, tap to inspect`}
                                            onPress={() => {
                                                setSelectedPriorityEvaluation({ task: block.task, evaluation: pEval });
                                                setPriorityModalVisible(true);
                                            }}
                                            style={[styles.priorityBadge, pEval.tier === 'Urgent' ? styles.badgeUrgent : (pEval.tier === 'High' ? styles.badgeHigh : styles.badgeMedium)]}
                                        >
                                            <Text style={styles.priorityBadgeText}>{pEval.score} {pEval.tier} ℹ️</Text>
                                        </Pressable>
                                    )}
                                </View>
                                <Text style={styles.heading}>{block.task?.task || 'Task unavailable'}</Text>
                                <Text style={styles.muted}>{block.sourceMissing ? 'The original task is missing. This block is preserved.' : block.task.status === 'completed' ? 'Task completed' : block.task.priority === 'high' ? 'High priority' : 'Pending task'}</Text>
                                {!!block.conflicts && <Text style={styles.warning}>Overlaps {block.conflicts} other block(s)</Text>}
                                {!block.sourceMissing && block.task.status !== 'completed' && <View style={styles.row}><View style={styles.flex}><Button title="Edit time" accessibilityLabel={`Edit time for ${block.task.task}`} secondary disabled={busy} onPress={() => editBlock(block.task, block)}/></View><View style={styles.flex}><Button title="Focus now" accessibilityLabel={`Focus on ${block.task.task}`} secondary disabled={busy || !!active} onPress={() => {setFocusTask(block.task.id); setFocusMinutes(String(block.minutes)); setTab('Focus');}}/></View></View>}
                                <Button title="Remove time block" secondary disabled={busy} onPress={() => run(async () => setPlanner(await PlannerService.removeBlock(block.id)))}/>
                            </View>;
                        })}
                        {tab === 'Week' && <Button title={`Plan ${day}`} secondary onPress={() => {chooseDate(day); setTab('Today');}}/>}
                    </View>;
                })}
                {!form && <View style={styles.card}><Text accessibilityRole="header" style={styles.heading}>Tasks to plan</Text><Text style={styles.muted}>Uses your saved Tasks list. Removing a time block keeps its task.</Text>
                    {!pending.length && <Text style={styles.body}>No pending tasks. Add a task to start planning.</Text>}
                    {pending.map(task => {
                        const pEval = calculatePriorityScore(task);
                        return <View key={String(task.id)} style={styles.block}>
                            <View style={styles.blockHeaderRow}>
                                <Text style={styles.heading}>{task.task}</Text>
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Priority ${pEval.score} ${pEval.tier}, tap to inspect`}
                                    onPress={() => {
                                        setSelectedPriorityEvaluation({ task, evaluation: pEval });
                                        setPriorityModalVisible(true);
                                    }}
                                    style={[styles.priorityBadge, pEval.tier === 'Urgent' ? styles.badgeUrgent : (pEval.tier === 'High' ? styles.badgeHigh : styles.badgeMedium)]}
                                >
                                    <Text style={styles.priorityBadgeText}>{pEval.score} {pEval.tier} ℹ️</Text>
                                </Pressable>
                            </View>
                            <Text style={styles.muted}>{task.priority === 'high' ? 'High priority' : 'Normal priority'} · {task.deadline}{task.estimatedMinutes ? ` · est. ${task.estimatedMinutes} min` : ''}</Text>
                            <Button title={task.priority === 'high' ? 'Set normal priority' : 'Set high priority'} secondary disabled={busy} onPress={() => run(async () => setTasks(await TodoService.updatePlanningDetails(task.id, {priority: task.priority === 'high' ? 'normal' : 'high'})))}/>
                            <Button title={`Plan ${task.task}`} disabled={busy} onPress={() => editBlock(task)}/>
                        </View>;
                    })}
                    <Button title="Open Tasks / Add task" secondary onPress={() => router.push({pathname: '/(tabs)/todos', params: {returnTo: 'time-management'}})}/>
                </View>}
            </>}

            {planner && tab === 'Focus' && <>
                {active ? <View style={styles.card}>
                    <Text accessibilityRole="header" style={styles.heading}>{taskName(active.taskRef.id)}</Text>
                    <Text style={styles.big}>{minutesLabel(elapsedMinutes(active, nowIso()))}<Text style={styles.muted}> of {active.plannedMinutes} min planned</Text></Text>
                    <View style={styles.track}><View style={[styles.fill, {width: `${Math.min(100, Math.round((elapsedMinutes(active, nowIso()) / active.plannedMinutes) * 100))}%`}]}/></View>
                    <Text style={styles.muted}>{active.state === 'running' ? 'Running' : 'Paused'} · {active.breaks} break{active.breaks === 1 ? '' : 's'} · started {localTimeAt(active.segments[0].startUtc, planner.settings.timeZone)}</Text>
                    {elapsedMinutes(active, nowIso()) >= active.plannedMinutes && active.state === 'running' && <Text style={styles.warning}>Planned time reached. Take a break or stop and record it.</Text>}
                    {isStale(active, nowIso()) ? <View style={{gap: 8}}>
                        <Text style={styles.warning}>This session has been open for over 12 hours. Tell us when you actually stopped so unobserved time is not counted.</Text>
                        <Field label="Actual end time today (HH:MM)" value={reconcileTime} onChangeText={setReconcileTime} placeholder="17:30"/>
                        <Button title="Save the real end time" disabled={busy} onPress={() => run(async () => { const [h, m] = reconcileTime.split(':').map(Number); if (!Number.isInteger(h) || !Number.isInteger(m)) throw new Error('Enter the end time as HH:MM.'); const end = new Date(); end.setHours(h, m, 0, 0); setFocus(await FocusService.reconcile({endUtc: end.toISOString()})); })}/>
                    </View> : <>
                        <View style={styles.row}>
                            <View style={styles.flex}>{active.state === 'running' ? <Button title="Pause" secondary disabled={busy} onPress={() => run(async () => setFocus(await FocusService.pause()))}/> : <Button title="Resume" disabled={busy} onPress={() => run(async () => setFocus(await FocusService.resume()))}/>}</View>
                            <View style={styles.flex}><Button title="Stop & record" disabled={busy} onPress={() => run(async () => { setFocus(await FocusService.stop({note: focusNote})); setFocusNote(''); })}/></View>
                        </View>
                        <Field label="Note (optional)" value={focusNote} onChangeText={setFocusNote} placeholder="What got done"/>
                        <Button title="Cancel without recording" secondary disabled={busy} onPress={() => run(async () => setFocus(await FocusService.cancel()))}/>
                    </>}
                    <Text style={styles.muted}>Stopping never marks the task complete. Do that in Tasks when it is really done.</Text>
                </View> : <View style={styles.card}>
                    <Text accessibilityRole="header" style={styles.heading}>Start a focus session</Text>
                    <Text style={styles.muted}>Pick one task, set a realistic length, and start. Pausing is fine; paused time is never counted.</Text>
                    {!pending.length && <Text style={styles.body}>No pending tasks. Add one in Tasks first.</Text>}
                    <View style={styles.wrap}>{(suggested.length ? suggested : pending).slice(0, 12).map(task => <Pressable key={String(task.id)} accessibilityRole="button" accessibilityLabel={`Choose ${task.task}`} accessibilityState={{selected: focusTask === task.id}} onPress={() => { setFocusTask(task.id); if (task.estimatedMinutes) setFocusMinutes(String(task.estimatedMinutes)); }} style={[styles.chip, focusTask === task.id && styles.chipActive]}><Text style={styles.chipText}>{task.task}</Text></Pressable>)}</View>
                    <Field label="Minutes" numeric value={focusMinutes} onChangeText={setFocusMinutes}/>
                    <View style={styles.wrap}>{['15', '25', '45', '60', '90'].map(m => <Pressable key={m} accessibilityRole="button" accessibilityLabel={`${m} minutes`} onPress={() => setFocusMinutes(m)} style={[styles.chip, focusMinutes === m && styles.chipActive]}><Text style={styles.chipText}>{m}</Text></Pressable>)}</View>
                    <Button title="Start focus" disabled={busy || !focusTask} onPress={() => run(async () => setFocus(await FocusService.start(focusTask, Number(focusMinutes))))}/>
                </View>}
                <View style={styles.card}>
                    <Text accessibilityRole="header" style={styles.heading}>Recent sessions</Text>
                    {!focus?.sessions.filter(s => s.state === 'completed').length && <Text style={styles.muted}>Recorded sessions appear here and in Review.</Text>}
                    {focus?.sessions.filter(s => s.state === 'completed').slice(0, 8).map(s => <View key={s.id} style={styles.block}><Text style={styles.body}>{taskName(s.taskRef.id)}</Text><Text style={styles.muted}>{localDateAt(s.segments[0].startUtc, planner.settings.timeZone)} · {minutesLabel(elapsedMinutes(s))} recorded of {s.plannedMinutes} planned{s.note ? ` · ${s.note}` : ''}</Text><Button title="Remove record" secondary disabled={busy} onPress={() => run(async () => setFocus(await FocusService.removeSession(s.id)))}/></View>)}
                </View>
            </>}

            {planner && tab === 'Habits' && <>
                <View style={styles.card}>
                    <Text accessibilityRole="header" style={styles.heading}>Today · {today}</Text>
                    {!habits.filter(h => isDue(h, today)).length && <Text style={styles.muted}>No habits due today.{!habits.length ? ' Add a routine you want to keep, like "walk 20 minutes" or "no-spend day".' : ''}</Text>}
                    {habits.filter(h => isDue(h, today)).map(h => <View key={h.id} style={styles.block}>
                        <Text style={styles.heading}>{h.title}</Text>
                        <Text style={styles.muted}>{isDone(h, today) ? 'Done today' : `${h.checkins[today] || 0} of ${h.targetPerDay} today`} · streak {streak(h, today)} · last 7 days {completionRate(h, Array.from({length: 7}, (_, i) => addDays(today, -i))) ?? 0}%</Text>
                        <View style={styles.row}><View style={styles.flex}><Button title={isDone(h, today) ? 'Done ✓' : 'Mark done'} selected={isDone(h, today)} secondary={isDone(h, today)} disabled={busy || isDone(h, today)} onPress={() => run(async () => setHabits((await HabitsService.checkin(h.id, today)).habits))}/></View><View style={styles.flex}><Button title="Undo" secondary disabled={busy || !(h.checkins[today] > 0)} onPress={() => run(async () => setHabits((await HabitsService.checkin(h.id, today, -1)).habits))}/></View></View>
                    </View>)}
                </View>
                <View style={styles.card}>
                    <Text accessibilityRole="header" style={styles.heading}>All habits</Text>
                    {habits.filter(h => !h.archived).map(h => <View key={h.id} style={styles.block}><Text style={styles.body}>{h.title}</Text><Text style={styles.muted}>{h.schedule.type === 'custom' ? h.schedule.days.map(d => DAY_NAMES[d]).join(', ') : h.schedule.type} · streak {streak(h, today)}</Text><Button title="Archive" secondary disabled={busy} onPress={() => run(async () => setHabits((await HabitsService.update(h.id, {archived: true})).habits))}/></View>)}
                    {!!habits.filter(h => h.archived).length && <Text style={styles.muted}>{habits.filter(h => h.archived).length} archived habit(s) kept for history.</Text>}
                    {!habitForm ? <Button title="Add habit" onPress={() => setHabitForm({title: '', type: 'daily', days: [], target: '1'})}/> : <View style={{gap: 10}}>
                        <Field label="Habit" value={habitForm.title} onChangeText={v => setHabitForm({...habitForm, title: v})} placeholder="e.g. Track every expense"/>
                        <View style={styles.wrap}>{[['daily', 'Every day'], ['weekdays', 'Weekdays'], ['weekends', 'Weekends'], ['custom', 'Pick days']].map(([v, l]) => <Pressable key={v} accessibilityRole="button" accessibilityLabel={l} accessibilityState={{selected: habitForm.type === v}} onPress={() => setHabitForm({...habitForm, type: v})} style={[styles.chip, habitForm.type === v && styles.chipActive]}><Text style={styles.chipText}>{l}</Text></Pressable>)}</View>
                        {habitForm.type === 'custom' && <View style={styles.wrap}>{DAY_NAMES.map((d, i) => <Pressable key={d} accessibilityRole="button" accessibilityLabel={d} accessibilityState={{selected: habitForm.days.includes(i)}} onPress={() => setHabitForm({...habitForm, days: habitForm.days.includes(i) ? habitForm.days.filter(x => x !== i) : [...habitForm.days, i]})} style={[styles.chip, habitForm.days.includes(i) && styles.chipActive]}><Text style={styles.chipText}>{d}</Text></Pressable>)}</View>}
                        <Field label="Times per day" numeric value={habitForm.target} onChangeText={v => setHabitForm({...habitForm, target: v})}/>
                        <View style={styles.row}><View style={styles.flex}><Button title="Save habit" disabled={busy} onPress={() => run(async () => { setHabits((await HabitsService.add({title: habitForm.title, schedule: {type: habitForm.type, days: habitForm.days}, targetPerDay: Number(habitForm.target)})).habits); setHabitForm(null); })}/></View><View style={styles.flex}><Button title="Cancel" secondary onPress={() => setHabitForm(null)}/></View></View>
                    </View>}
                </View>
            </>}

            {planner && tab === 'Review' && (() => {
                const days = weekDates(date || today, planner.settings.weekStartsOn);
                const recorded = reviewSummary(focus?.sessions || [], planner.settings.timeZone, days);
                let planned = 0; const rows = days.map(d => { let p = 0; try { p = daySummary(planner, d, tasks).plannedMinutes; } catch {} planned += p; return {d, p, r: recorded.byDate[d]}; });
                const doneThisWeek = tasks.filter(t => t.status === 'completed' && t.completedAt && days.includes(localDateAt(t.completedAt, planner.settings.timeZone))).length;
                return <>
                    <View style={styles.row}><View style={styles.flex}><Button title="Previous week" secondary onPress={() => chooseDate(addDays(date || today, -7))}/></View><View style={styles.flex}><Button title="This week" secondary onPress={() => chooseDate(today)}/></View><View style={styles.flex}><Button title="Next week" secondary onPress={() => chooseDate(addDays(date || today, 7))}/></View></View>
                    <View style={styles.card}>
                        <Text accessibilityRole="header" style={styles.heading}>Week of {days[0]}</Text>
                        <Text style={styles.body}>{minutesLabel(planned)} planned · {minutesLabel(recorded.totalMinutes)} recorded in focus · {doneThisWeek} task{doneThisWeek === 1 ? '' : 's'} completed</Text>
                        <Text style={styles.muted}>Recorded focus is only the time you timed. Real work outside sessions is not tracked or guessed.</Text>
                        {rows.map(row => <View key={row.d} style={styles.block}><Text style={styles.body}>{DAY_NAMES[new Date(row.d + 'T12:00:00Z').getUTCDay()]} {row.d}{row.d === today ? ' · today' : ''}</Text><Text style={styles.muted}>{minutesLabel(row.p)} planned · {minutesLabel(row.r)} recorded</Text><View style={styles.track}><View style={[styles.fill, {width: `${row.p ? Math.min(100, Math.round((row.r / row.p) * 100)) : row.r ? 100 : 0}%`}]}/></View></View>)}
                    </View>
                    <View style={styles.card}>
                        <Text accessibilityRole="header" style={styles.heading}>By task</Text>
                        {!Object.keys(recorded.byTask).length && <Text style={styles.muted}>No focus recorded this week.</Text>}
                        {Object.entries(recorded.byTask).sort((a, b) => b[1] - a[1]).map(([id, m]) => <View key={id} style={styles.block}><Text style={styles.body}>{taskName(isNaN(Number(id)) ? id : (tasks.find(t => String(t.id) === id)?.id ?? id))}</Text><Text style={styles.muted}>{minutesLabel(m)}</Text></View>)}
                    </View>
                </>;
            })()}

            {planner && tab === 'Engines' && (
                <SmartEnginesView />
            )}
        </ScrollView></KeyboardAvoidingView>

        <PriorityBreakdownModal
            visible={priorityModalVisible}
            task={selectedPriorityEvaluation?.task}
            evaluation={selectedPriorityEvaluation?.evaluation}
            onClose={() => setPriorityModalVisible(false)}
        />
    </SafeAreaView>;
}
const styles = StyleSheet.create({
    screen: {flex: 1, backgroundColor: '#09090F'}, header: {flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#292934'}, back: {width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: '#222230', borderRadius: 12},
    title: {fontSize: 21, fontWeight: '700', color: '#FAFAFA'}, heading: {fontSize: 17, fontWeight: '700', color: '#FAFAFA'}, body: {fontSize: 15, lineHeight: 22, color: '#E4E4EB'}, muted: {fontSize: 13, lineHeight: 19, color: '#AAAABB'}, big: {fontSize: 34, fontWeight: '800', color: '#FAFAFA'},
    content: {padding: 16, gap: 12}, card: {backgroundColor: '#171721', borderWidth: 1, borderColor: '#2B2B38', borderRadius: 14, padding: 16, gap: 12}, row: {flexDirection: 'row', gap: 8}, wrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8}, flex: {flex: 1, minWidth: 0},
    button: {minHeight: 44, backgroundColor: '#6D28D9', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'transparent'}, secondary: {backgroundColor: '#282837'}, selected: {borderColor: '#C4B5FD'}, buttonText: {color: '#FAFAFA', fontSize: 14, fontWeight: '600', textAlign: 'center'},
    field: {gap: 6}, label: {fontSize: 13, fontWeight: '600', color: '#D4D4DF'}, input: {minHeight: 46, backgroundColor: '#0D0D14', borderColor: '#454556', borderWidth: 1, borderRadius: 9, padding: 12, color: '#FAFAFA', fontSize: 16}, block: {borderTopWidth: 1, borderTopColor: '#343441', paddingTop: 12, gap: 9}, notice: {backgroundColor: '#3F2028', padding: 14, borderRadius: 12, gap: 10}, error: {color: '#FECDD3', fontSize: 14, lineHeight: 21}, warning: {color: '#FCD34D', fontSize: 14, lineHeight: 21},
    tabBar: {flexGrow: 0, borderBottomWidth: 1, borderBottomColor: '#292934'}, tab: {minHeight: 44, paddingHorizontal: 14, justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent'}, tabActive: {borderBottomColor: '#C4B5FD'}, tabText: {color: '#AAAABB', fontSize: 13, fontWeight: '700'}, tabTextActive: {color: '#FAFAFA'},
    chip: {minHeight: 40, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1F1F2B', borderWidth: 1, borderColor: '#3A3A4C', justifyContent: 'center'}, chipActive: {backgroundColor: '#3B2A6B', borderColor: '#C4B5FD'}, chipText: {color: '#E4E4EB', fontSize: 13, fontWeight: '600'},
    track: {height: 8, backgroundColor: '#2B2B3C', borderRadius: 4, overflow: 'hidden'}, fill: {height: '100%', backgroundColor: '#8B5CF6', borderRadius: 4},
    blockHeaderRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
    breakBanner: {backgroundColor: '#451A03', borderWidth: 1, borderColor: '#F59E0B', borderRadius: 10, padding: 12, gap: 8},
    breakBannerText: {color: '#FDE68A', fontSize: 13, fontWeight: '600', lineHeight: 18},
    priorityBadge: {paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1},
    badgeUrgent: {backgroundColor: '#881337', borderColor: '#F43F5E'},
    badgeHigh: {backgroundColor: '#701A75', borderColor: '#D946EF'},
    badgeMedium: {backgroundColor: '#451A03', borderColor: '#F59E0B'},
    priorityBadgeText: {color: '#FFFFFF', fontSize: 11, fontWeight: '700'}
});
