import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { CheckSquare, Calendar, User, AlertCircle, Plus, CheckCircle2, Clock } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { ResponsibilityPriority, ResponsibilityStatus } from '../../services/family/familyContracts';

export default function FamilyResponsibilitiesView({
    responsibilitiesSummary = {},
    persons = [],
    currentUserId = null,
    onSelectTask = () => {},
    onToggleTaskStatus = () => {},
    onAddTask = () => {}
}) {
    const [activeFilter, setActiveFilter] = useState('ALL'); // 'ALL' | 'MY_TASKS' | 'URGENT'

    const { tasks = [], pendingCount = 0, urgentCount = 0, overdueCount = 0 } = responsibilitiesSummary;

    const displayedTasks = tasks.filter(t => {
        if (activeFilter === 'MY_TASKS' && currentUserId) {
            return t.assignedPersonId === currentUserId;
        }
        if (activeFilter === 'URGENT') {
            return t.priority === ResponsibilityPriority.URGENT || t.isOverdue;
        }
        return true;
    });

    const getPriorityBadgeStyle = (priority) => {
        switch (priority) {
            case ResponsibilityPriority.URGENT:
                return { bg: '#EF444420', text: '#EF4444' };
            case ResponsibilityPriority.HIGH:
                return { bg: '#F59E0B20', text: '#F59E0B' };
            case ResponsibilityPriority.MEDIUM:
                return { bg: '#3B82F620', text: '#60A5FA' };
            default:
                return { bg: '#27272A', text: '#9CA3AF' };
        }
    };

    return (
        <View style={styles.container}>
            {/* Filter Tabs Row */}
            <View style={styles.filterRow}>
                {[
                    { id: 'ALL', label: `All Tasks (${tasks.length})` },
                    { id: 'MY_TASKS', label: 'My Tasks' },
                    { id: 'URGENT', label: `Urgent (${urgentCount + overdueCount})` }
                ].map(f => {
                    const isActive = activeFilter === f.id;
                    return (
                        <Pressable
                            key={f.id}
                            style={[styles.filterChip, isActive && styles.filterChipActive]}
                            onPress={() => setActiveFilter(f.id)}
                        >
                            <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                                {f.label}
                            </Text>
                        </Pressable>
                    );
                })}
            </View>

            {/* Task Stats Strip */}
            <View style={styles.statsStrip}>
                <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Pending</Text>
                    <Text style={styles.statNum}>{pendingCount}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: '#EF4444' }]}>Overdue</Text>
                    <Text style={[styles.statNum, { color: '#EF4444' }]}>{overdueCount}</Text>
                </View>
                <View style={styles.statBox}>
                    <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Urgent</Text>
                    <Text style={[styles.statNum, { color: '#F59E0B' }]}>{urgentCount}</Text>
                </View>
                <Pressable style={styles.addTaskBtn} onPress={onAddTask}>
                    <Plus size={16} color="#FFFFFF" />
                    <Text style={styles.addTaskBtnText}>New Task</Text>
                </Pressable>
            </View>

            {/* Task Cards Stack */}
            <View style={styles.tasksStack}>
                {displayedTasks.length === 0 ? (
                    <View style={styles.emptyState}>
                        <CheckCircle2 size={32} color="#10B981" />
                        <Text style={styles.emptyTitle}>All Caught Up!</Text>
                        <Text style={styles.emptySub}>No pending tasks match the selected filter.</Text>
                    </View>
                ) : (
                    displayedTasks.map(t => {
                        const prio = getPriorityBadgeStyle(t.priority);
                        const isDone = t.status === ResponsibilityStatus.COMPLETED;

                        return (
                            <LuxuryCard key={t.id} style={[styles.taskCard, isDone && styles.taskCardDone]} onPress={() => onSelectTask(t)}>
                                <View style={styles.taskCardHeader}>
                                    <View style={styles.taskCardHeaderLeft}>
                                        <View style={[styles.prioBadge, { backgroundColor: prio.bg }]}>
                                            <Text style={[styles.prioText, { color: prio.text }]}>{t.priority}</Text>
                                        </View>
                                        {t.isOverdue && (
                                            <View style={styles.overdueBadge}>
                                                <Clock size={10} color="#EF4444" />
                                                <Text style={styles.overdueText}>OVERDUE</Text>
                                            </View>
                                        )}
                                        <Text style={styles.categoryTag}>{t.category}</Text>
                                    </View>

                                    <Pressable
                                        style={[styles.checkCircle, isDone && styles.checkCircleChecked]}
                                        onPress={() => onToggleTaskStatus(t)}
                                    >
                                        {isDone && <CheckCircle2 size={18} color="#10B981" />}
                                    </Pressable>
                                </View>

                                <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>{t.title}</Text>
                                {t.notes ? (
                                    <Text style={styles.taskNotes} numberOfLines={2}>{t.notes}</Text>
                                ) : null}

                                <View style={styles.taskFooter}>
                                    <View style={styles.personTagRow}>
                                        <User size={12} color="#9CA3AF" />
                                        <Text style={styles.personTagText}>
                                            {t.assignedPersonName} → {t.affectedPersonName}
                                        </Text>
                                    </View>

                                    <View style={styles.taskFooterRight}>
                                        {t.estimatedAmountDisplay && (
                                            <Text style={styles.amountText}>{t.estimatedAmountDisplay}</Text>
                                        )}
                                        {t.dueDate && (
                                            <View style={styles.dueDateRow}>
                                                <Calendar size={11} color="#71717A" />
                                                <Text style={styles.dueDateText}>{t.dueDate}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </LuxuryCard>
                        );
                    })
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24
    },
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    filterChipActive: {
        backgroundColor: '#27272A',
        borderColor: '#3B82F6'
    },
    filterText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600'
    },
    filterTextActive: {
        color: '#FFFFFF'
    },
    statsStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 14,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    statBox: {
        flex: 1,
        alignItems: 'center'
    },
    statLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 2
    },
    statNum: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    },
    addTaskBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        gap: 4
    },
    addTaskBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600'
    },
    tasksStack: {
        gap: 10
    },
    taskCard: {
        padding: 14
    },
    taskCardDone: {
        opacity: 0.6
    },
    taskCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    taskCardHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    prioBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    prioText: {
        fontSize: 10,
        fontWeight: '700'
    },
    overdueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#EF444420',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    overdueText: {
        color: '#EF4444',
        fontSize: 9,
        fontWeight: '800'
    },
    categoryTag: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600'
    },
    checkCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: '#71717A',
        justifyContent: 'center',
        alignItems: 'center'
    },
    checkCircleChecked: {
        borderColor: '#10B981'
    },
    taskTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4
    },
    taskTitleDone: {
        textDecorationLine: 'line-through',
        color: '#9CA3AF'
    },
    taskNotes: {
        color: '#9CA3AF',
        fontSize: 12,
        marginBottom: 10
    },
    taskFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    personTagRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    personTagText: {
        color: '#9CA3AF',
        fontSize: 11
    },
    taskFooterRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    amountText: {
        color: '#E4E4E7',
        fontSize: 12,
        fontWeight: '700'
    },
    dueDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    dueDateText: {
        color: '#71717A',
        fontSize: 11
    },
    emptyState: {
        padding: 32,
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 4
    },
    emptySub: {
        color: '#71717A',
        fontSize: 12
    }
});
