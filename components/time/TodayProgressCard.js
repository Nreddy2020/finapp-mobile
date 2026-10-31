import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Clock, CheckCircle2, ListTodo, Flame, Sparkles, Check, Play, CircleDot } from 'lucide-react-native';

function formatMinutesToLabel(m) {
    const safe = Math.max(0, Math.round(m || 0));
    const h = Math.floor(safe / 60);
    const mins = safe % 60;
    if (h > 0) return `${h}h ${mins > 0 ? `${mins}m` : ''}`.trim();
    return `${mins}m`;
}

export default function TodayProgressCard({
    date,
    dayPlan,
    tasks = [],
    focusSessions = [],
    onPlanWithAi,
    onInspectPriority,
    onEditBlock,
    onFocusBlock,
    timeZone = 'UTC'
}) {
    const plannedMinutes = dayPlan?.plannedMinutes || 0;
    
    // Completed minutes from recorded focus sessions for this day
    const completedFocusMinutes = focusSessions
        .filter(s => s.state === 'stopped' && (s.startUtc?.slice(0, 10) === date || s.endUtc?.slice(0, 10) === date))
        .reduce((sum, s) => {
            const start = Date.parse(s.startUtc);
            const end = Date.parse(s.endUtc);
            return sum + (end > start ? Math.round((end - start) / 60000) : 0);
        }, 0);

    const totalTasksCount = dayPlan?.blocks?.length || tasks.length || 0;
    const completedTasksCount = tasks.filter(t => t.status === 'completed').length;
    const focusSessionCount = focusSessions.filter(s => s.state === 'stopped').length;

    // Completion percentage derived strictly from real recorded time / planned time
    const rawProgress = plannedMinutes > 0 ? Math.round((completedFocusMinutes / plannedMinutes) * 100) : (totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0);
    const progressPercent = Math.min(100, Math.max(0, rawProgress));

    // SVG Circular Meter math
    const radius = 42;
    const strokeWidth = 9;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (circumference * progressPercent) / 100;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.cardTitle}>Today</Text>
                    <Text style={styles.dateSubtitle}>{date || 'Today'}</Text>
                </View>
                {onPlanWithAi && (
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Plan with AI"
                        onPress={onPlanWithAi}
                        style={styles.aiButton}
                    >
                        <Sparkles size={14} color="#38BDF8" />
                        <Text style={styles.aiButtonText}>Plan with AI</Text>
                    </Pressable>
                )}
            </View>

            {/* Top Metrics Banner */}
            <View style={styles.metricsWrapper}>
                {/* Progress Circle */}
                <View style={styles.circleContainer}>
                    <Svg width={104} height={104} viewBox="0 0 100 100">
                        <Circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="#1E293B"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        <Circle
                            cx="50"
                            cy="50"
                            r={radius}
                            stroke="#10B981"
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="none"
                            transform="rotate(-90 50 50)"
                        />
                    </Svg>
                    <View style={styles.circleCenter}>
                        <Text style={styles.percentText}>{progressPercent}%</Text>
                        <Text style={styles.percentLabel}>Today's Progress</Text>
                    </View>
                </View>

                {/* 4 Key Stat Chips */}
                <View style={styles.statsGrid}>
                    <View style={styles.statChip}>
                        <View style={[styles.statIconWrap, { backgroundColor: '#38BDF820' }]}>
                            <Clock size={15} color="#38BDF8" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{formatMinutesToLabel(plannedMinutes)}</Text>
                            <Text style={styles.statLabel}>Planned</Text>
                        </View>
                    </View>

                    <View style={styles.statChip}>
                        <View style={[styles.statIconWrap, { backgroundColor: '#10B98120' }]}>
                            <CheckCircle2 size={15} color="#10B981" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{formatMinutesToLabel(completedFocusMinutes)}</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </View>
                    </View>

                    <View style={styles.statChip}>
                        <View style={[styles.statIconWrap, { backgroundColor: '#A855F720' }]}>
                            <ListTodo size={15} color="#A855F7" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{completedTasksCount} / {Math.max(totalTasksCount, completedTasksCount)}</Text>
                            <Text style={styles.statLabel}>Tasks</Text>
                        </View>
                    </View>

                    <View style={styles.statChip}>
                        <View style={[styles.statIconWrap, { backgroundColor: '#F9731620' }]}>
                            <Flame size={15} color="#F97316" />
                        </View>
                        <View>
                            <Text style={styles.statValue}>{focusSessionCount}</Text>
                            <Text style={styles.statLabel}>Focus Sessions</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Schedule Table */}
            <View style={styles.tableContainer}>
                <View style={styles.tableHeader}>
                    <Text style={[styles.colHeader, { flex: 2 }]}>Time</Text>
                    <Text style={[styles.colHeader, { flex: 3.5 }]}>Task</Text>
                    <Text style={[styles.colHeader, { flex: 2, textAlign: 'center' }]}>Priority</Text>
                    <Text style={[styles.colHeader, { flex: 2.2, textAlign: 'right' }]}>Status</Text>
                </View>

                {(!dayPlan?.blocks || dayPlan.blocks.length === 0) ? (
                    <View style={styles.emptyTableRow}>
                        <Text style={styles.emptyTableText}>No time blocks scheduled for this day yet.</Text>
                    </View>
                ) : (
                    dayPlan.blocks.map((block, idx) => {
                        const start = block.startUtc ? new Date(block.startUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '09:00';
                        const end = block.endUtc ? new Date(block.endUtc).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '09:30';
                        const pScore = block.task?.priorityScore ?? (block.isBreak ? 32 : 60);
                        const pTier = block.task?.priorityTier || (pScore >= 80 ? 'Urgent' : pScore >= 60 ? 'High' : pScore >= 40 ? 'Medium' : 'Low');

                        const isDone = block.task?.status === 'completed';
                        const isBreak = block.isBreak || block.taskRef?.status === 'break';
                        const statusLabel = isDone ? 'Completed' : (idx === 0 && !isBreak ? 'In Progress' : 'Upcoming');
                        const statusColor = isDone ? '#10B981' : (statusLabel === 'In Progress' ? '#38BDF8' : '#64748B');

                        return (
                            <Pressable
                                key={block.id || idx}
                                style={styles.tableRow}
                                onPress={() => onEditBlock && onEditBlock(block.task, block)}
                            >
                                <Text style={[styles.cellText, styles.timeCell, { flex: 2 }]}>
                                    {start}–{end}
                                </Text>
                                <Text numberOfLines={1} style={[styles.cellText, styles.taskCell, { flex: 3.5 }]}>
                                    {block.task?.task || block.title || 'Recovery Break'}
                                </Text>
                                
                                <View style={{ flex: 2, alignItems: 'center' }}>
                                    {block.task ? (
                                        <Pressable
                                            onPress={() => onInspectPriority && onInspectPriority(block.task)}
                                            style={[
                                                styles.priorityPill,
                                                pTier === 'Urgent' ? styles.pillUrgent : (pTier === 'High' ? styles.pillHigh : (pTier === 'Medium' ? styles.pillMed : styles.pillLow))
                                            ]}
                                        >
                                            <Text style={styles.priorityPillText}>{pTier}</Text>
                                        </Pressable>
                                    ) : (
                                        <Text style={styles.mutedDash}>—</Text>
                                    )}
                                </View>

                                <View style={{ flex: 2.2, alignItems: 'flex-end' }}>
                                    <View style={[styles.statusBadge, { borderColor: `${statusColor}40`, backgroundColor: `${statusColor}15` }]}>
                                        {isDone ? (
                                            <Check size={11} color="#10B981" strokeWidth={3} />
                                        ) : statusLabel === 'In Progress' ? (
                                            <CircleDot size={11} color="#38BDF8" />
                                        ) : (
                                            <View style={[styles.upcomingDot, { backgroundColor: statusColor }]} />
                                        )}
                                        <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
                                    </View>
                                </View>
                            </Pressable>
                        );
                    })
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    dateSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 1,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#38BDF815',
        borderColor: '#38BDF840',
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    aiButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#38BDF8',
    },
    metricsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        flexWrap: 'wrap',
    },
    circleContainer: {
        position: 'relative',
        width: 104,
        height: 104,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleCenter: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    percentText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#F8FAFC',
    },
    percentLabel: {
        fontSize: 9,
        fontWeight: '500',
        color: '#94A3B8',
        marginTop: 1,
        textAlign: 'center',
        width: 70,
    },
    statsGrid: {
        flex: 1,
        minWidth: 180,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    statChip: {
        flexBasis: '47%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#1E293B60',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#33415550',
    },
    statIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    statValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    statLabel: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '500',
    },
    tableContainer: {
        backgroundColor: '#1E293B40',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#33415560',
    },
    tableHeader: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 10,
        backgroundColor: '#1E293B80',
        borderBottomWidth: 1,
        borderBottomColor: '#33415580',
    },
    colHeader: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 11,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B60',
    },
    cellText: {
        fontSize: 12,
        color: '#E2E8F0',
    },
    timeCell: {
        fontWeight: '500',
        color: '#94A3B8',
    },
    taskCell: {
        fontWeight: '600',
        color: '#F8FAFC',
    },
    mutedDash: {
        color: '#64748B',
        fontSize: 12,
    },
    priorityPill: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
    },
    pillUrgent: {
        backgroundColor: '#EF444420',
    },
    pillHigh: {
        backgroundColor: '#F9731620',
    },
    pillMed: {
        backgroundColor: '#EAB30820',
    },
    pillLow: {
        backgroundColor: '#10B98120',
    },
    priorityPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    upcomingDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    emptyTableRow: {
        padding: 16,
        alignItems: 'center',
    },
    emptyTableText: {
        fontSize: 12,
        color: '#64748B',
    },
});
