import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { 
    CheckCircle2, 
    Circle, 
    Clock, 
    Calendar, 
    Repeat, 
    User, 
    Home, 
    Edit2, 
    Archive, 
    Trash2,
    Shield
} from 'lucide-react-native';
import { TaskStatus, TaskPriority, TaskDueStatus, TaskRecurrence } from '../../../services/family/familyContracts.js';

export default function TaskItemCard({
    task,
    onToggleStatus,
    onEdit,
    onArchive,
    onDelete
}) {
    if (!task) return null;

    const isCompleted = task.status === TaskStatus.COMPLETED;
    const isArchived = task.status === TaskStatus.ARCHIVED;
    const isCancelled = task.status === TaskStatus.CANCELLED;

    // Priority color mapping
    const getPriorityStyle = (priority) => {
        switch (priority) {
            case TaskPriority.URGENT:
                return { bg: '#EF444420', border: '#EF444460', text: '#EF4444', label: 'URGENT' };
            case TaskPriority.HIGH:
                return { bg: '#F9731620', border: '#F9731660', text: '#F97316', label: 'HIGH' };
            case TaskPriority.MEDIUM:
                return { bg: '#3B82F620', border: '#3B82F660', text: '#60A5FA', label: 'MED' };
            case TaskPriority.LOW:
            default:
                return { bg: '#27272A', border: '#3F3F46', text: '#A1A1AA', label: 'LOW' };
        }
    };

    // Due Status color mapping
    const getDueStatusBadge = () => {
        if (!task.dueDate) return null;
        switch (task.dueStatus) {
            case TaskDueStatus.OVERDUE:
                return {
                    bg: '#EF444420',
                    border: '#EF4444',
                    text: '#F87171',
                    label: task.daysRemaining === -1 ? 'Overdue (Yesterday)' : `Overdue (${Math.abs(task.daysRemaining)}d)`
                };
            case TaskDueStatus.DUE_TODAY:
                return {
                    bg: '#F59E0B20',
                    border: '#F59E0B',
                    text: '#FBBF24',
                    label: 'Due Today'
                };
            case TaskDueStatus.DUE_SOON:
                return {
                    bg: '#10B98120',
                    border: '#10B981',
                    text: '#34D399',
                    label: `Due in ${task.daysRemaining}d`
                };
            case TaskDueStatus.UPCOMING:
            default:
                return {
                    bg: '#27272A',
                    border: '#3F3F46',
                    text: '#A1A1AA',
                    label: task.dueDate
                };
        }
    };

    const pri = getPriorityStyle(task.priority);
    const dueBadge = getDueStatusBadge();

    return (
        <View style={[styles.card, (isCompleted || isArchived || isCancelled) && styles.cardDimmed]}>
            {/* Top row: Status/Priority pills and due badge */}
            <View style={styles.topRow}>
                <View style={styles.badgeGroup}>
                    <View style={[styles.priorityPill, { backgroundColor: pri.bg, borderColor: pri.border }]}>
                        <Text style={[styles.priorityText, { color: pri.text }]}>{pri.label}</Text>
                    </View>

                    {task.recurrence && task.recurrence !== TaskRecurrence.NONE && (
                        <View style={styles.recurrencePill}>
                            <Repeat size={10} color="#A78BFA" />
                            <Text style={styles.recurrenceText}>{task.recurrence}</Text>
                        </View>
                    )}

                    {isArchived && (
                        <View style={styles.archivedPill}>
                            <Text style={styles.archivedText}>ARCHIVED</Text>
                        </View>
                    )}

                    {isCancelled && (
                        <View style={styles.cancelledPill}>
                            <Text style={styles.cancelledText}>CANCELLED</Text>
                        </View>
                    )}
                </View>

                {dueBadge && (
                    <View style={[styles.dueBadge, { backgroundColor: dueBadge.bg, borderColor: dueBadge.border }]}>
                        <Clock size={10} color={dueBadge.text} />
                        <Text style={[styles.dueBadgeText, { color: dueBadge.text }]}>{dueBadge.label}</Text>
                    </View>
                )}
            </View>

            {/* Main content row with completion toggle */}
            <View style={styles.bodyRow}>
                {!isArchived && (
                    <TouchableOpacity
                        accessibilityRole="checkbox"
                        accessibilityLabel={(isCompleted ? 'Reopen ' : 'Complete ') + task.title}
                        accessibilityState={{ checked: isCompleted }}
                        onPress={() => onToggleStatus && onToggleStatus(task)}
                        style={styles.checkboxButton}
                        activeOpacity={0.7}
                    >
                        {isCompleted ? (
                            <CheckCircle2 size={22} color="#10B981" />
                        ) : (
                            <Circle size={22} color="#71717A" />
                        )}
                    </TouchableOpacity>
                )}

                <View style={styles.contentCol}>
                    <Text
                        style={[
                            styles.title,
                            isCompleted && styles.titleCompleted,
                            isCancelled && styles.titleCancelled
                        ]}
                        numberOfLines={2}
                    >
                        {task.title}
                    </Text>

                    {task.description ? (
                        <Text style={styles.description} numberOfLines={2}>
                            {task.description}
                        </Text>
                    ) : null}
                </View>
            </View>

            {/* Meta Row: Assignee, Ownership, Domain */}
            <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                    {task.assignedPersonId ? (
                        <User size={12} color="#A1A1AA" />
                    ) : (
                        <Home size={12} color="#A1A1AA" />
                    )}
                    <Text style={styles.metaText}>{task.assigneeName}</Text>
                </View>

                {task.responsibilityTitle ? (
                    <View style={styles.metaItem}>
                        <Shield size={12} color="#818CF8" />
                        <Text style={styles.domainText}>{task.responsibilityTitle}</Text>
                    </View>
                ) : null}

                {task.dueTime ? (
                    <View style={styles.metaItem}>
                        <Clock size={12} color="#71717A" />
                        <Text style={styles.timeText}>{task.dueTime}</Text>
                    </View>
                ) : null}
            </View>

            {/* Action Buttons Row */}
            <View style={styles.actionsRow}>
                {!isArchived && onEdit && (
                    <TouchableOpacity onPress={() => onEdit(task)} style={styles.actionBtn}>
                        <Edit2 size={13} color="#A1A1AA" />
                        <Text style={styles.actionBtnText}>Edit</Text>
                    </TouchableOpacity>
                )}

                {!isArchived && onArchive && (
                    <TouchableOpacity onPress={() => onArchive(task)} style={styles.actionBtn}>
                        <Archive size={13} color="#A1A1AA" />
                        <Text style={styles.actionBtnText}>Archive</Text>
                    </TouchableOpacity>
                )}

                {onDelete && (
                    <TouchableOpacity onPress={() => onDelete(task)} style={styles.actionBtn}>
                        <Trash2 size={13} color="#EF4444" />
                        <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Delete</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#18181B',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 14,
        marginBottom: 10
    },
    cardDimmed: {
        opacity: 0.65,
        borderColor: '#3F3F46'
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    badgeGroup: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    priorityPill: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1
    },
    priorityText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    recurrencePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#8B5CF620',
        borderWidth: 1,
        borderColor: '#8B5CF660',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    recurrenceText: {
        fontSize: 10,
        color: '#A78BFA',
        fontWeight: '700'
    },
    archivedPill: {
        backgroundColor: '#3F3F4630',
        borderWidth: 1,
        borderColor: '#71717A50',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    archivedText: {
        color: '#A1A1AA',
        fontSize: 9,
        fontWeight: '800'
    },
    cancelledPill: {
        backgroundColor: '#EF444415',
        borderWidth: 1,
        borderColor: '#EF444440',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    cancelledText: {
        color: '#F87171',
        fontSize: 9,
        fontWeight: '800'
    },
    dueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 12,
        borderWidth: 1
    },
    dueBadgeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    bodyRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 10
    },
    checkboxButton: {
        paddingTop: 1
    },
    contentCol: {
        flex: 1
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        lineHeight: 20
    },
    titleCompleted: {
        textDecorationLine: 'line-through',
        color: '#71717A'
    },
    titleCancelled: {
        textDecorationLine: 'line-through',
        color: '#EF444480'
    },
    description: {
        fontSize: 12,
        color: '#A1A1AA',
        marginTop: 4,
        lineHeight: 16
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        marginBottom: 8
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    metaText: {
        fontSize: 11,
        color: '#D4D4D8',
        fontWeight: '500'
    },
    domainText: {
        fontSize: 11,
        color: '#A5B4FC',
        fontWeight: '600'
    },
    timeText: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '500'
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 12,
        marginTop: 2
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 3,
        paddingHorizontal: 6
    },
    actionBtnText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600'
    }
});
