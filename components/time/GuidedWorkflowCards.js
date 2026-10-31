import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView } from 'react-native';
import { Target, ListChecks, CalendarClock, RefreshCw, BarChart2, Check, ArrowRight, AlertTriangle } from 'lucide-react-native';
import { calculateDeadlinePace, DEADLINE_STATUS } from '../../services/time/deadlineEngine.js';

export default function GuidedWorkflowCards({
    onScheduleTasks,
    dailyCapacityMinutes = 480,
    plannedMinutes = 0,
}) {
    const [currentStep, setCurrentStep] = useState(1);

    // Step 1: Goal input state
    const [goalText, setGoalText] = useState('I want to complete Algebra in 10 days.');
    const [selectedSubject, setSelectedSubject] = useState('Mathematics');
    const [targetDate, setTargetDate] = useState('2026-09-23');

    // Step 2: Subtasks state
    const [subtasks, setSubtasks] = useState([
        { id: 't1', title: 'Learn concepts', minutes: 60, selected: true },
        { id: 't2', title: 'Study examples', minutes: 45, selected: true },
        { id: 't3', title: 'Solve exercises', minutes: 90, selected: true },
        { id: 't4', title: 'Take practice test', minutes: 60, selected: true },
        { id: 't5', title: 'Revision', minutes: 45, selected: true },
    ]);

    // Step 3: Recommended plan state
    const [recommendedTasks, setRecommendedTasks] = useState([
        { id: 'r1', title: 'Physics', minutes: 90, selected: true },
        { id: 'r2', title: 'Mathematics', minutes: 60, selected: true },
        { id: 'r3', title: 'English', minutes: 30, selected: true },
        { id: 'r4', title: 'Revision (Move to tomorrow)', minutes: 45, selected: false },
    ]);

    // Step 4: Missed task adaptive rescheduling state
    const [adaptiveAccepted, setAdaptiveAccepted] = useState(false);

    const toggleSubtask = (id) => {
        setSubtasks(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
    };

    const toggleRecommended = (id) => {
        setRecommendedTasks(prev => prev.map(t => t.id === id ? { ...t, selected: !t.selected } : t));
    };

    const totalSubtaskMinutes = subtasks.filter(t => t.selected).reduce((acc, t) => acc + t.minutes, 0);
    const availableTodayHours = Math.max(0, Math.round(((dailyCapacityMinutes - plannedMinutes) / 60) * 10) / 10);

    // Step 4: Real deadline engine calculation for adaptive rescheduling
    const deadlineResult = calculateDeadlinePace({
        totalRequiredMinutes: 60,
        completedMinutes: 25,
        targetDate: '2026-09-23',
        currentDate: '2026-09-13',
        dailyCapacityMinutes: dailyCapacityMinutes
    });

    const STEPS = [
        { num: 1, title: 'Create Goal', icon: Target },
        { num: 2, title: 'Break into Tasks', icon: ListChecks },
        { num: 3, title: 'Intelligent Scheduling', icon: CalendarClock },
        { num: 4, title: 'Adaptive Rescheduling', icon: RefreshCw },
        { num: 5, title: 'Weekly Plan & Analytics', icon: BarChart2 },
    ];

    return (
        <View style={styles.container}>
            {/* Step Navigation Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stepBar} contentContainerStyle={styles.stepBarContent}>
                {STEPS.map((s) => {
                    const isActive = currentStep === s.num;
                    const Icon = s.icon;
                    return (
                        <Pressable
                            key={s.num}
                            onPress={() => setCurrentStep(s.num)}
                            style={[styles.stepTab, isActive && styles.stepTabActive]}
                        >
                            <View style={[styles.stepNumBadge, isActive && styles.stepNumBadgeActive]}>
                                <Text style={[styles.stepNumText, isActive && styles.stepNumTextActive]}>{s.num}</Text>
                            </View>
                            <Text style={[styles.stepTabText, isActive && styles.stepTabTextActive]}>
                                {s.title}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Active Step Content */}
            <View style={styles.card}>
                {/* STEP 1: CREATE GOAL */}
                {currentStep === 1 && (
                    <View>
                        <View style={styles.cardHeader}>
                            <View style={[styles.badge, { backgroundColor: '#38BDF820' }]}>
                                <Text style={[styles.badgeText, { color: '#38BDF8' }]}>1</Text>
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Create Goal</Text>
                                <Text style={styles.cardDesc}>Set what you want to achieve</Text>
                            </View>
                        </View>

                        <View style={styles.fieldGroup}>
                            <Text style={styles.fieldLabel}>Goal Description</Text>
                            <TextInput
                                style={styles.input}
                                value={goalText}
                                onChangeText={setGoalText}
                                placeholder="e.g. Complete Algebra in 10 days"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.fieldGroup, { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>Subject</Text>
                                <View style={styles.pillSelector}>
                                    {['Mathematics', 'Physics', 'Chemistry'].map(sub => (
                                        <Pressable
                                            key={sub}
                                            onPress={() => setSelectedSubject(sub)}
                                            style={[styles.subPill, selectedSubject === sub && styles.subPillActive]}
                                        >
                                            <Text style={[styles.subPillText, selectedSubject === sub && styles.subPillTextActive]}>{sub}</Text>
                                        </Pressable>
                                    ))}
                                </View>
                            </View>

                            <View style={[styles.fieldGroup, { flex: 0.9, marginLeft: 12 }]}>
                                <Text style={styles.fieldLabel}>Target Date</Text>
                                <TextInput
                                    style={styles.input}
                                    value={targetDate}
                                    onChangeText={setTargetDate}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#64748B"
                                />
                            </View>
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Generate Plan"
                            onPress={() => setCurrentStep(2)}
                            style={styles.primaryBtn}
                        >
                            <Text style={styles.primaryBtnText}>Generate Plan</Text>
                            <ArrowRight size={14} color="#FFFFFF" />
                        </Pressable>
                    </View>
                )}

                {/* STEP 2: BREAK INTO TASKS */}
                {currentStep === 2 && (
                    <View>
                        <View style={styles.cardHeader}>
                            <View style={[styles.badge, { backgroundColor: '#A855F720' }]}>
                                <Text style={[styles.badgeText, { color: '#C084FC' }]}>2</Text>
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Break into Tasks</Text>
                                <Text style={styles.cardDesc}>AI converts your goal into actionable tasks</Text>
                            </View>
                        </View>

                        <View style={styles.taskList}>
                            {subtasks.map(task => (
                                <Pressable
                                    key={task.id}
                                    onPress={() => toggleSubtask(task.id)}
                                    style={styles.taskItem}
                                >
                                    <View style={[styles.checkbox, task.selected && styles.checkboxChecked]}>
                                        {task.selected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                                    </View>
                                    <Text style={[styles.taskTitle, !task.selected && styles.taskTitleMuted]}>
                                        {task.title}
                                    </Text>
                                    <Text style={styles.taskDuration}>{task.minutes} min</Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={styles.taskFooterRow}>
                            <Text style={styles.totalTimeLabel}>Total Estimated Time</Text>
                            <Text style={styles.totalTimeVal}>{Math.round(totalSubtaskMinutes / 60 * 10) / 10} hours ({totalSubtaskMinutes}m)</Text>
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Proceed to Intelligent Scheduling"
                            onPress={() => setCurrentStep(3)}
                            style={styles.primaryBtn}
                        >
                            <Text style={styles.primaryBtnText}>Proceed to Scheduling</Text>
                            <ArrowRight size={14} color="#FFFFFF" />
                        </Pressable>
                    </View>
                )}

                {/* STEP 3: INTELLIGENT SCHEDULING */}
                {currentStep === 3 && (
                    <View>
                        <View style={styles.cardHeader}>
                            <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                                <Text style={[styles.badgeText, { color: '#10B981' }]}>3</Text>
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Intelligent Scheduling</Text>
                                <Text style={styles.cardDesc}>We plan based on your time, priority and deadlines</Text>
                            </View>
                        </View>

                        <View style={styles.capacityBadge}>
                            <Text style={styles.capacityBadgeText}>
                                Available today: {availableTodayHours > 0 ? `${availableTodayHours} hours` : '3 hours'}
                            </Text>
                        </View>

                        <Text style={styles.sectionSub}>Recommended Plan:</Text>
                        <View style={styles.taskList}>
                            {recommendedTasks.map(task => (
                                <Pressable
                                    key={task.id}
                                    onPress={() => toggleRecommended(task.id)}
                                    style={styles.taskItem}
                                >
                                    <View style={[styles.checkbox, task.selected && styles.checkboxChecked]}>
                                        {task.selected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                                    </View>
                                    <Text style={[styles.taskTitle, !task.selected && styles.taskTitleMuted]}>
                                        {task.title}
                                    </Text>
                                    <Text style={styles.taskDuration}>{task.minutes} min</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Proceed to Adaptive Rescheduling"
                            onPress={() => setCurrentStep(4)}
                            style={styles.primaryBtn}
                        >
                            <Text style={styles.primaryBtnText}>Test Adaptive Reschedule</Text>
                            <ArrowRight size={14} color="#FFFFFF" />
                        </Pressable>
                    </View>
                )}

                {/* STEP 4: ADAPTIVE RESCHEDULING */}
                {currentStep === 4 && (
                    <View>
                        <View style={styles.cardHeader}>
                            <View style={[styles.badge, { backgroundColor: '#F59E0B20' }]}>
                                <Text style={[styles.badgeText, { color: '#FBBF24' }]}>4</Text>
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Adaptive Rescheduling</Text>
                                <Text style={styles.cardDesc}>If you miss a task, we adjust automatically</Text>
                            </View>
                        </View>

                        {/* Missed Task Box */}
                        <View style={styles.missedAlertBox}>
                            <AlertTriangle size={16} color="#F43F5E" />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.missedTitle}>Physics - 2:00 PM (60 min)</Text>
                                <Text style={styles.missedDesc}>Only 25 minutes completed.</Text>
                            </View>
                        </View>

                        {/* Dynamic Pacing Suggestion */}
                        <View style={styles.suggestionBox}>
                            <Text style={styles.remainingText}>
                                Remaining: <Text style={{ fontWeight: '700', color: '#F8FAFC' }}>35 minutes</Text>
                            </Text>
                            <Text style={styles.newTimeSlot}>
                                Suggested new time: 📅 5:30 PM – 6:05 PM
                            </Text>
                            <Text style={styles.engineRecalcNote}>
                                Dynamic pace recalculated: {deadlineResult.standardPaceMinutesPerDay} min/day ({deadlineResult.status})
                            </Text>
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Accept Suggestion"
                            onPress={() => {
                                setAdaptiveAccepted(true);
                                setTimeout(() => setCurrentStep(5), 600);
                            }}
                            style={[styles.primaryBtn, adaptiveAccepted && { backgroundColor: '#10B981' }]}
                        >
                            <Text style={styles.primaryBtnText}>
                                {adaptiveAccepted ? '✓ Suggestion Accepted!' : 'Accept Suggestion'}
                            </Text>
                            {!adaptiveAccepted && <ArrowRight size={14} color="#FFFFFF" />}
                        </Pressable>
                    </View>
                )}

                {/* STEP 5: WEEKLY PLAN & ANALYTICS */}
                {currentStep === 5 && (
                    <View>
                        <View style={styles.cardHeader}>
                            <View style={[styles.badge, { backgroundColor: '#38BDF820' }]}>
                                <Text style={[styles.badgeText, { color: '#38BDF8' }]}>5</Text>
                            </View>
                            <View>
                                <Text style={styles.cardTitle}>Weekly Plan & Analytics</Text>
                                <Text style={styles.cardDesc}>Track your progress and improve</Text>
                            </View>
                        </View>

                        {/* Summary Metrics */}
                        <View style={styles.weeklyMetricsRow}>
                            <View style={styles.metricItem}>
                                <Text style={styles.metricItemVal}>24h</Text>
                                <Text style={styles.metricItemLbl}>Planned</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={[styles.metricItemVal, { color: '#10B981' }]}>19h 35m</Text>
                                <Text style={styles.metricItemLbl}>Completed</Text>
                            </View>
                            <View style={styles.metricItem}>
                                <Text style={[styles.metricItemVal, { color: '#38BDF8' }]}>81%</Text>
                                <Text style={styles.metricItemLbl}>Completion</Text>
                            </View>
                        </View>

                        {/* Dual Bar Chart (Mon - Sun) */}
                        <View style={styles.barChartContainer}>
                            {[
                                { day: 'Mon', p: 70, c: 50 },
                                { day: 'Tue', p: 85, c: 75 },
                                { day: 'Wed', p: 95, c: 90 },
                                { day: 'Thu', p: 80, c: 65 },
                                { day: 'Fri', p: 75, c: 70 },
                                { day: 'Sat', p: 90, c: 80 },
                                { day: 'Sun', p: 60, c: 55 },
                            ].map(item => (
                                <View key={item.day} style={styles.barCol}>
                                    <View style={styles.barsPair}>
                                        <View style={[styles.singleBar, { height: item.p * 0.7, backgroundColor: '#38BDF8' }]} />
                                        <View style={[styles.singleBar, { height: item.c * 0.7, backgroundColor: '#10B981' }]} />
                                    </View>
                                    <Text style={styles.barDayText}>{item.day}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.legendRow}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: '#38BDF8' }]} />
                                <Text style={styles.legendLabel}>Planned</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
                                <Text style={styles.legendLabel}>Completed</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    stepBar: {
        marginBottom: 12,
    },
    stepBarContent: {
        gap: 8,
        paddingHorizontal: 2,
    },
    stepTab: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 10,
        backgroundColor: '#1E293B60',
        borderWidth: 1,
        borderColor: '#33415560',
    },
    stepTabActive: {
        backgroundColor: '#2563EB20',
        borderColor: '#2563EB',
    },
    stepNumBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepNumBadgeActive: {
        backgroundColor: '#2563EB',
    },
    stepNumText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
    },
    stepNumTextActive: {
        color: '#FFFFFF',
    },
    stepTabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    stepTabTextActive: {
        color: '#F8FAFC',
    },
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    badge: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '800',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    cardDesc: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 1,
    },
    fieldGroup: {
        marginBottom: 12,
    },
    fieldLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#1E293B',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 9,
        color: '#F8FAFC',
        fontSize: 13,
        borderWidth: 1,
        borderColor: '#334155',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    pillSelector: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
    },
    subPill: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 8,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
    },
    subPillActive: {
        backgroundColor: '#38BDF820',
        borderColor: '#38BDF8',
    },
    subPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    subPillTextActive: {
        color: '#38BDF8',
    },
    primaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#2563EB',
        paddingVertical: 11,
        borderRadius: 10,
        marginTop: 10,
    },
    primaryBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    taskList: {
        backgroundColor: '#1E293B40',
        borderRadius: 12,
        padding: 6,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#33415550',
    },
    taskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 9,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B60',
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 5,
        borderWidth: 1.5,
        borderColor: '#64748B',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    taskTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#F8FAFC',
        flex: 1,
    },
    taskTitleMuted: {
        color: '#64748B',
        textDecorationLine: 'line-through',
    },
    taskDuration: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    taskFooterRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    totalTimeLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    totalTimeVal: {
        fontSize: 13,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    capacityBadge: {
        backgroundColor: '#38BDF815',
        borderColor: '#38BDF840',
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        marginBottom: 12,
        alignSelf: 'flex-start',
    },
    capacityBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#38BDF8',
    },
    sectionSub: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E2E8F0',
        marginBottom: 8,
    },
    missedAlertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#F43F5E15',
        borderColor: '#F43F5E40',
        borderWidth: 1,
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
    },
    missedTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F43F5E',
    },
    missedDesc: {
        fontSize: 11,
        color: '#FDA4AF',
        marginTop: 2,
    },
    suggestionBox: {
        backgroundColor: '#1E293B60',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#33415560',
        marginBottom: 12,
    },
    remainingText: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 4,
    },
    newTimeSlot: {
        fontSize: 13,
        fontWeight: '700',
        color: '#38BDF8',
        marginBottom: 4,
    },
    engineRecalcNote: {
        fontSize: 10,
        color: '#64748B',
    },
    weeklyMetricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#1E293B50',
        borderRadius: 12,
        paddingVertical: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#33415550',
    },
    metricItem: {
        alignItems: 'center',
    },
    metricItemVal: {
        fontSize: 16,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    metricItemLbl: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 2,
    },
    barChartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 100,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#33415560',
        marginBottom: 10,
    },
    barCol: {
        alignItems: 'center',
    },
    barsPair: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 75,
    },
    singleBar: {
        width: 10,
        borderTopLeftRadius: 3,
        borderTopRightRadius: 3,
    },
    barDayText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 6,
    },
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendColor: {
        width: 10,
        height: 10,
        borderRadius: 2,
    },
    legendLabel: {
        fontSize: 11,
        color: '#94A3B8',
    },
});
