import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Clock, Target, AlertTriangle, TrendingUp, Calendar } from 'lucide-react-native';
import DailyScheduleCard from '../../components/time/DailyScheduleCard';
import ProcrastinationAlertCard from '../../components/time/ProcrastinationAlertCard';
import GoalProgressCard from '../../components/time/GoalProgressCard';
import taskPrioritizer from '../../services/taskPrioritizer';
import timetableGenerator from '../../services/timetableGenerator';
import procrastinationDetector from '../../services/procrastinationDetector';
import { getMockTasks, getMockUserActivity, getMockLifeGoals } from '../../services/timeManagementData';

export default function TimeManagementScreen() {
    const [loading, setLoading] = useState(true);
    const [tasks, setTasks] = useState([]);
    const [schedule, setSchedule] = useState(null);
    const [procrastinationData, setProcrastinationData] = useState(null);
    const [lifeGoals, setLifeGoals] = useState(null);
    const [activeTab, setActiveTab] = useState('schedule'); // schedule, alerts, goals

    useEffect(() => {
        // Auto-load data when component mounts
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load all data
            const [tasksData, activityData, goalsData] = await Promise.all([
                getMockTasks(),
                getMockUserActivity(),
                getMockLifeGoals()
            ]);

            // Prioritize tasks
            const prioritizedTasks = taskPrioritizer.prioritizeTasks(tasksData);
            setTasks(prioritizedTasks);

            // Generate schedule
            const dailySchedule = timetableGenerator.generateDailySchedule(prioritizedTasks);
            setSchedule(dailySchedule);

            // Detect procrastination
            const procrastination = procrastinationDetector.detectProcrastination({
                tasks: tasksData,
                activity: activityData
            });
            setProcrastinationData(procrastination);

            // Set goals
            setLifeGoals(goalsData);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartTask = (slot) => {
        alert(`Starting: ${slot.activity}\n\nSet a timer and focus!`);
    };

    const handleTakeAction = (alert) => {
        alert(`Action for: ${alert.task || alert.type}\n\n${alert.action}`);
    };

    const handleViewGoalTasks = (goal) => {
        alert(`Tasks for: ${goal.goal}\n\n${goal.tasks.join('\n')}`);
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerIcon}>
                        <Clock size={32} color="#10B981" strokeWidth={2.5} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={styles.title}>Time Management</Text>
                        <Text style={styles.subtitle}>
                            Stop wasting time, start achieving
                        </Text>
                    </View>
                </View>

                {/* Loading */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#10B981" />
                        <Text style={styles.loadingText}>
                            Creating your perfect schedule...
                        </Text>
                    </View>
                )}

                {/* Tabs */}
                {!loading && (
                    <View style={styles.tabs}>
                        <Pressable
                            style={[styles.tab, activeTab === 'schedule' && styles.activeTab]}
                            onPress={() => setActiveTab('schedule')}
                        >
                            <Calendar size={18} color={activeTab === 'schedule' ? '#10B981' : '#71717A'} />
                            <Text style={[styles.tabText, activeTab === 'schedule' && styles.activeTabText]}>
                                Schedule
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
                            onPress={() => setActiveTab('alerts')}
                        >
                            <AlertTriangle size={18} color={activeTab === 'alerts' ? '#F59E0B' : '#71717A'} />
                            <Text style={[styles.tabText, activeTab === 'alerts' && styles.activeTabText]}>
                                Alerts ({procrastinationData?.alerts?.length || 0})
                            </Text>
                        </Pressable>

                        <Pressable
                            style={[styles.tab, activeTab === 'goals' && styles.activeTab]}
                            onPress={() => setActiveTab('goals')}
                        >
                            <Target size={18} color={activeTab === 'goals' ? '#3B82F6' : '#71717A'} />
                            <Text style={[styles.tabText, activeTab === 'goals' && styles.activeTabText]}>
                                Goals
                            </Text>
                        </Pressable>
                    </View>
                )}

                {/* Schedule Tab */}
                {!loading && activeTab === 'schedule' && schedule && (
                    <>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                📅 Today's Perfect Schedule
                            </Text>
                            <Text style={styles.sectionSubtitle}>
                                {schedule.summary.total_productive_hours} hours productive time
                            </Text>
                        </View>

                        {schedule.slots.map((slot, index) => (
                            <DailyScheduleCard
                                key={index}
                                slot={slot}
                                onStart={handleStartTask}
                            />
                        ))}

                        {/* Summary */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>Daily Summary</Text>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Productive Hours:</Text>
                                <Text style={styles.summaryValue}>
                                    {schedule.summary.total_productive_hours}h
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Critical Tasks:</Text>
                                <Text style={styles.summaryValue}>
                                    {schedule.summary.critical_tasks}
                                </Text>
                            </View>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>Learning Time:</Text>
                                <Text style={styles.summaryValue}>
                                    {schedule.summary.learning_time}h
                                </Text>
                            </View>
                        </View>
                    </>
                )}

                {/* Alerts Tab */}
                {!loading && activeTab === 'alerts' && procrastinationData && (
                    <>
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>
                                ⚠️ Procrastination Alerts
                            </Text>
                            <Text style={styles.sectionSubtitle}>
                                Procrastination Score: {procrastinationData.procrastination_score}/100
                            </Text>
                        </View>

                        {procrastinationData.alerts.length === 0 ? (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyIcon}>✅</Text>
                                <Text style={styles.emptyTitle}>No Alerts!</Text>
                                <Text style={styles.emptyText}>
                                    You're on track. Keep up the good work!
                                </Text>
                            </View>
                        ) : (
                            procrastinationData.alerts.map((alert, index) => (
                                <ProcrastinationAlertCard
                                    key={index}
                                    alert={alert}
                                    onTakeAction={handleTakeAction}
                                />
                            ))
                        )}

                        {/* Recommendations */}
                        {procrastinationData.recommendations && procrastinationData.recommendations.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    💡 Recommendations
                                </Text>
                                {procrastinationData.recommendations.map((rec, index) => (
                                    <View key={index} style={styles.recommendationCard}>
                                        <Text style={styles.recTitle}>{rec.title}</Text>
                                        <Text style={styles.recPriority}>
                                            Priority: {rec.priority.toUpperCase()}
                                        </Text>
                                        {rec.actions.map((action, i) => (
                                            <Text key={i} style={styles.recAction}>
                                                • {action}
                                            </Text>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Goals Tab */}
                {!loading && activeTab === 'goals' && lifeGoals && (
                    <>
                        {/* Financial Goals */}
                        {lifeGoals.financial && lifeGoals.financial.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    💰 Financial Goals
                                </Text>
                                {lifeGoals.financial.map((goal) => (
                                    <GoalProgressCard
                                        key={goal.id}
                                        goal={goal}
                                        onViewTasks={handleViewGoalTasks}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Learning Goals */}
                        {lifeGoals.learning && lifeGoals.learning.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    📚 Learning Goals
                                </Text>
                                {lifeGoals.learning.map((goal) => (
                                    <GoalProgressCard
                                        key={goal.id}
                                        goal={goal}
                                        onViewTasks={handleViewGoalTasks}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Career Goals */}
                        {lifeGoals.career && lifeGoals.career.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>
                                    💼 Career Goals
                                </Text>
                                {lifeGoals.career.map((goal) => (
                                    <GoalProgressCard
                                        key={goal.id}
                                        goal={goal}
                                        onViewTasks={handleViewGoalTasks}
                                    />
                                ))}
                            </View>
                        )}
                    </>
                )}

                {/* Refresh Button */}
                {!loading && (
                    <Pressable
                        style={styles.refreshButton}
                        onPress={loadData}
                    >
                        <Text style={styles.refreshText}>
                            Refresh Data
                        </Text>
                    </Pressable>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B',
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerIcon: {
        width: 64,
        height: 64,
        borderRadius: 18,
        backgroundColor: '#10B98120',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    headerText: {
        flex: 1,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#71717A',
        fontWeight: '600',
    },
    loadingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    loadingText: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600',
        marginTop: 12,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: '#18181B',
        borderRadius: 12,
        padding: 4,
        marginBottom: 20,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#FFFFFF08',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717A',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    section: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '600',
        marginBottom: 12,
    },
    summaryCard: {
        backgroundColor: '#18181B',
        borderRadius: 12,
        padding: 16,
        marginTop: 8,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 12,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#71717A',
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '800',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#71717A',
        fontWeight: '600',
        textAlign: 'center',
    },
    recommendationCard: {
        backgroundColor: '#18181B',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#10B98130',
    },
    recTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    recPriority: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F59E0B',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    recAction: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 18,
    },
    refreshButton: {
        backgroundColor: '#FFFFFF08',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 16,
    },
    refreshText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
    },
});
