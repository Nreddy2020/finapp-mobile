import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Target, TrendingUp, Calendar, CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function GoalProgressCard({ goal, onViewTasks }) {
    const getProgressColor = () => {
        if (goal.progress >= 75) return '#10B981';
        if (goal.progress >= 50) return '#F59E0B';
        if (goal.progress >= 25) return '#EAB308';
        return '#EF4444';
    };

    const progressColor = getProgressColor();
    const progressWidth = `${Math.min(100, goal.progress)}%`;

    const getDaysLeft = () => {
        if (!goal.deadline) return null;
        const deadline = new Date(goal.deadline);
        const now = new Date();
        const diffTime = deadline - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const daysLeft = getDaysLeft();

    return (
        <View style={styles.card}>
            <LinearGradient
                colors={[`${progressColor}15`, '#00000000']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradient}
            />

            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: `${progressColor}20` }]}>
                    <Target size={24} color={progressColor} strokeWidth={2.5} />
                </View>
                <View style={styles.headerText}>
                    <Text style={styles.category}>{goal.category.toUpperCase()}</Text>
                    <Text style={styles.goal}>{goal.goal}</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                    <View
                        style={[
                            styles.progressFill,
                            { width: progressWidth, backgroundColor: progressColor }
                        ]}
                    />
                </View>
                <Text style={[styles.progressText, { color: progressColor }]}>
                    {goal.progress}%
                </Text>
            </View>

            {/* Financial Goals */}
            {goal.target_amount && (
                <View style={styles.amountContainer}>
                    <Text style={styles.currentAmount}>
                        ₹{goal.current_amount?.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.separator}>/</Text>
                    <Text style={styles.targetAmount}>
                        ₹{goal.target_amount.toLocaleString('en-IN')}
                    </Text>
                </View>
            )}

            {/* Income Goals */}
            {goal.target_income && (
                <View style={styles.amountContainer}>
                    <Text style={styles.currentAmount}>
                        ₹{goal.current_income?.toLocaleString('en-IN')}
                    </Text>
                    <TrendingUp size={16} color="#10B981" />
                    <Text style={styles.targetAmount}>
                        ₹{goal.target_income.toLocaleString('en-IN')}
                    </Text>
                </View>
            )}

            {/* Status */}
            <View style={styles.statusRow}>
                {goal.on_track ? (
                    <View style={styles.statusBadge}>
                        <CheckCircle size={14} color="#10B981" />
                        <Text style={styles.onTrackText}>On Track!</Text>
                    </View>
                ) : (
                    <View style={[styles.statusBadge, { backgroundColor: '#EF444420' }]}>
                        <Text style={styles.offTrackText}>⚠️ Behind Schedule</Text>
                    </View>
                )}

                {daysLeft !== null && (
                    <View style={styles.daysContainer}>
                        <Calendar size={14} color="#71717A" />
                        <Text style={styles.daysText}>
                            {daysLeft > 0 ? `${daysLeft} days left` : 'Overdue'}
                        </Text>
                    </View>
                )}
            </View>

            {/* Daily Target */}
            {goal.monthly_target && (
                <View style={styles.targetContainer}>
                    <Text style={styles.targetLabel}>Monthly Target:</Text>
                    <Text style={styles.targetValue}>
                        ₹{goal.monthly_target.toLocaleString('en-IN')}
                    </Text>
                </View>
            )}

            {goal.daily_time && (
                <View style={styles.targetContainer}>
                    <Text style={styles.targetLabel}>Daily Commitment:</Text>
                    <Text style={styles.targetValue}>{goal.daily_time}</Text>
                </View>
            )}

            {/* Tasks */}
            {goal.tasks && goal.tasks.length > 0 && (
                <View style={styles.tasksContainer}>
                    <Text style={styles.tasksTitle}>Next Steps:</Text>
                    {goal.tasks.slice(0, 2).map((task, index) => (
                        <View key={index} style={styles.taskRow}>
                            <Text style={styles.taskBullet}>•</Text>
                            <Text style={styles.taskText}>{task}</Text>
                        </View>
                    ))}
                    {goal.tasks.length > 2 && (
                        <Text style={styles.moreTasksText}>
                            +{goal.tasks.length - 2} more tasks
                        </Text>
                    )}
                </View>
            )}

            {onViewTasks && (
                <Pressable
                    style={[styles.button, { backgroundColor: `${progressColor}20` }]}
                    onPress={() => onViewTasks(goal)}
                >
                    <Text style={[styles.buttonText, { color: progressColor }]}>
                        View All Tasks
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        position: 'relative',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        overflow: 'hidden',
    },
    gradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    category: {
        fontSize: 11,
        fontWeight: '900',
        color: '#71717A',
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    goal: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        lineHeight: 20,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    progressBackground: {
        flex: 1,
        height: 8,
        backgroundColor: '#FFFFFF10',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '900',
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    currentAmount: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    separator: {
        fontSize: 16,
        color: '#71717A',
        fontWeight: '700',
    },
    targetAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#71717A',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#10B98120',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    onTrackText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#10B981',
    },
    offTrackText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#EF4444',
    },
    daysContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    daysText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717A',
    },
    targetContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFFFFF05',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    targetLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717A',
    },
    targetValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    tasksContainer: {
        backgroundColor: '#FFFFFF05',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
    },
    tasksTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    taskRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    taskBullet: {
        fontSize: 12,
        color: '#71717A',
        marginRight: 6,
    },
    taskText: {
        flex: 1,
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA',
        lineHeight: 16,
    },
    moreTasksText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#71717A',
        marginTop: 4,
        fontStyle: 'italic',
    },
    button: {
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '900',
    },
});
