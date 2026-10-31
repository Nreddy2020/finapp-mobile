import {useFamilySelection} from '../../components/family/navigation/FamilySelection.js';
import React, { useState, useRef, useCallback } from 'react';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    TouchableOpacity, 
    RefreshControl,
    Alert 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
    CheckSquare, 
    Shield, 
    Plus, 
    Clock, 
    AlertTriangle, 
    CheckCircle2, 
    Filter,
    Layers
} from 'lucide-react-native';
import FamilyHeader from '../../components/family/navigation/FamilyHeader.js';
import FamilyEmptyState from '../../components/family/navigation/FamilyEmptyState.js';
import TaskItemCard from '../../components/family/operations/TaskItemCard.js';
import TaskFormModal from '../../components/family/operations/TaskFormModal.js';
import ResponsibilityCard from '../../components/family/operations/ResponsibilityCard.js';
import ResponsibilityFormModal from '../../components/family/operations/ResponsibilityFormModal.js';
import { 
    FamilyHouseholdService, 
    FamilyOperationsService,
    FamilyRepository,
    TaskStatus,
    TaskPriority,
    ResponsibilityStatus
} from '../../services/family/index.js';

/**
 * Phase 4 Family Operations, Tasks & Responsibilities Hub (/family/operations)
 * Coordinates household domains, actionable chores, due dates, and recurrence lifecycles.
 */
export default function FamilyOperationsScreen() {
    const {householdId: sharedHouseholdId} = useFamilySelection();
    const { householdId: routeHouseholdId, fromLifeEvent } = useLocalSearchParams();
    const [selectedHouseholdId, setSelectedHouseholdId] = useState(null);
    const [households, setHouseholds] = useState([]);
    const requestedHouseholdId = sharedHouseholdId;
    const [household, setHousehold] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Active tab: 'tasks' | 'responsibilities'
    const [activeTab, setActiveTab] = useState('tasks');

    // Data lists & summary
    const [tasks, setTasks] = useState([]);
    const [responsibilities, setResponsibilities] = useState([]);
    const [members, setMembers] = useState([]);
    const [summary, setSummary] = useState({
        totalActiveTasks: 0,
        overdueTasks: 0,
        dueToday: 0,
        dueSoon: 0,
        completedThisWeek: 0,
        openResponsibilities: 0
    });

    // Filters
    const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL', 'TODO', 'IN_PROGRESS', 'COMPLETED'
    const [priorityFilter, setPriorityFilter] = useState('ALL');

    // Modals
    const [taskModalVisible, setTaskModalVisible] = useState(false);
    const [editingTask, setEditingTask] = useState(null);

    const [respModalVisible, setRespModalVisible] = useState(false);
    const [editingResp, setEditingResp] = useState(null);
    const loadGeneration = useRef(0);
    const [loadError, setLoadError] = useState('');

    const loadData = useCallback(async () => {
        const version = ++loadGeneration.current;
        setLoading(true);
        setLoadError('');
        try {
            const hhList = await FamilyHouseholdService.listHouseholds();
            if (version !== loadGeneration.current) return;
            setHouseholds(hhList.filter(h => h.status === 'ACTIVE'));
            const activeHh = hhList.find(h => h.id === requestedHouseholdId && h.status === 'ACTIVE') || null;
            setHousehold(activeHh);

            if (activeHh) {
                const [taskList, respList, opsSummary, peopleList] = await Promise.all([
                    FamilyOperationsService.listTasks({ householdId: activeHh.id, includeArchived: false }),
                    FamilyOperationsService.listResponsibilities({ householdId: activeHh.id, includeArchived: false }),
                    FamilyOperationsService.getOperationalSummary(activeHh.id),
                    FamilyRepository.getMembers(activeHh.id)
                ]);

                if (version !== loadGeneration.current) return;
                setTasks(taskList);
                setResponsibilities(respList);
                setSummary(opsSummary);
                setMembers(peopleList);
            } else {
                setTasks([]);
                setResponsibilities([]);
                setMembers([]);
            }
        } catch (err) {
            if (version !== loadGeneration.current) return;
            setTasks([]);
            setResponsibilities([]);
            setMembers([]);
            setHousehold(null);
            setLoadError('Could not load Operations. Pull down to retry.');
            console.error('Error loading operations data:', err);
        } finally {
            if (version === loadGeneration.current) {
                setLoading(false);
                setRefreshing(false);
            }
        }
    }, [requestedHouseholdId]);

    useFocusEffect(useCallback(() => { loadData(); return () => { loadGeneration.current++; }; }, [loadData]));

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Task Actions
    const handleToggleTaskStatus = async (task) => {
        if (!task) return;
        try {
            const newStatus = task.status === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
            const primaryMember = null; // Device-local action; do not invent a completing person.
            await FamilyOperationsService.transitionTaskStatus(task.id, newStatus, primaryMember);
            await loadData();
        } catch (err) {
            Alert.alert('Action Failed', err.message);
        }
    };

    const handleSaveTaskRecord = async (taskData) => {
        try {
            await FamilyOperationsService.saveTask(taskData);
            setTaskModalVisible(false);
            setEditingTask(null);
            await loadData();
        } catch (err) {
            throw err;
        }
    };

    const handleArchiveTaskRecord = async (task) => {
        try {
            await FamilyOperationsService.transitionTaskStatus(task.id, TaskStatus.ARCHIVED);
            await loadData();
        } catch (err) {
            Alert.alert('Archive Failed', err.message);
        }
    };

    const handleDeleteTaskRecord = async (task) => {
        try {
            await FamilyRepository.deleteTask(task.id);
            await loadData();
        } catch (err) {
            Alert.alert('Delete Failed', err.message);
        }
    };

    // Responsibility Actions
    const handleSaveResponsibilityRecord = async (respData) => {
        try {
            await FamilyOperationsService.saveResponsibility(respData);
            setRespModalVisible(false);
            setEditingResp(null);
            await loadData();
        } catch (err) {
            throw err;
        }
    };

    const handleArchiveResponsibilityRecord = async (resp) => {
        try {
            await FamilyOperationsService.archiveResponsibility(resp.id);
            await loadData();
        } catch (err) {
            Alert.alert('Archive Failed', err.message);
        }
    };

    const handleDeleteResponsibilityRecord = async (resp) => {
        try {
            await FamilyOperationsService.deleteResponsibility(resp.id);
            await loadData();
        } catch (err) {
            Alert.alert('Cannot Delete', err.message);
        }
    };

    // Filtered Tasks
    const filteredTasks = tasks.filter(t => {
        if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
        if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
        return true;
    });

    return (
        <SafeAreaView style={styles.safeArea} edges={[]}>
            <FamilyHeader 
                title="Operations" 
                subtitle="Tasks & Responsibilities"
                household={household}
                showBack={fromLifeEvent === '1'}
                showContextBanner={true}
                showTopTabs={true}
            />

            <ScrollView 
                style={styles.container}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A1A1AA" />
                }
            >
                {loading ? <Text style={{ color: '#A1A1AA' }}>Loading Operations...</Text> : loadError ? <Text accessibilityRole="alert" style={{ color: '#FCA5A5' }}>{loadError}</Text> : !household ? (
                    households.length ? <Text style={{ color: '#A1A1AA' }}>Select a household to view its Operations tasks.</Text> : <FamilyEmptyState />
                ) : (
                    <>
                        {/* Metrics Bar */}
                        <View style={styles.metricsBar}>
                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>ACTIVE</Text>
                                <Text style={styles.metricValue}>{summary.totalActiveTasks}</Text>
                            </View>

                            <View style={[styles.metricCard, summary.overdueTasks > 0 && styles.metricAlertCard]}>
                                <Text style={[styles.metricLabel, summary.overdueTasks > 0 && styles.metricAlertLabel]}>OVERDUE</Text>
                                <Text style={[styles.metricValue, summary.overdueTasks > 0 && styles.metricAlertValue]}>{summary.overdueTasks}</Text>
                            </View>

                            <View style={[styles.metricCard, summary.dueToday > 0 && styles.metricWarnCard]}>
                                <Text style={[styles.metricLabel, summary.dueToday > 0 && styles.metricWarnLabel]}>DUE TODAY</Text>
                                <Text style={[styles.metricValue, summary.dueToday > 0 && styles.metricWarnValue]}>{summary.dueToday}</Text>
                            </View>

                            <View style={styles.metricCard}>
                                <Text style={styles.metricLabel}>DONE / WEEK</Text>
                                <Text style={[styles.metricValue, { color: '#34D399' }]}>{summary.completedThisWeek}</Text>
                            </View>
                        </View>

                        {/* Navigation / Segment Switcher */}
                        <View style={styles.tabSwitcherRow}>
                            <View style={styles.segmentedControl}>
                                <TouchableOpacity
                                    onPress={() => setActiveTab('tasks')}
                                    style={[styles.segmentBtn, activeTab === 'tasks' && styles.segmentBtnActive]}
                                >
                                    <CheckSquare size={14} color={activeTab === 'tasks' ? '#FFFFFF' : '#A1A1AA'} />
                                    <Text style={[styles.segmentBtnText, activeTab === 'tasks' && styles.segmentBtnTextActive]}>
                                        Tasks ({tasks.length})
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    onPress={() => setActiveTab('responsibilities')}
                                    style={[styles.segmentBtn, activeTab === 'responsibilities' && styles.segmentBtnActive]}
                                >
                                    <Shield size={14} color={activeTab === 'responsibilities' ? '#FFFFFF' : '#A1A1AA'} />
                                    <Text style={[styles.segmentBtnText, activeTab === 'responsibilities' && styles.segmentBtnTextActive]}>
                                        Domains ({responsibilities.length})
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Add Item Action Button */}
                            {activeTab === 'tasks' ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditingTask(null);
                                        setTaskModalVisible(true);
                                    }}
                                    style={styles.addBtn}
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                    <Text style={styles.addBtnText}>Add Task</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditingResp(null);
                                        setRespModalVisible(true);
                                    }}
                                    style={[styles.addBtn, { backgroundColor: '#8B5CF6' }]}
                                >
                                    <Plus size={16} color="#FFFFFF" />
                                    <Text style={styles.addBtnText}>Add Domain</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Content Area */}
                        {activeTab === 'tasks' ? (
                            <>
                                {/* Task Status Filter Pills */}
                                <View style={styles.filterBar}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                        {['ALL', TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED].map(st => (
                                            <TouchableOpacity
                                                key={st}
                                                onPress={() => setStatusFilter(st)}
                                                style={[styles.filterPill, statusFilter === st && styles.filterPillActive]}
                                            >
                                                <Text style={[styles.filterPillText, statusFilter === st && styles.filterPillTextActive]}>
                                                    {st === 'ALL' ? 'All Tasks' : st === TaskStatus.TODO ? 'To Do' : st === TaskStatus.IN_PROGRESS ? 'In Progress' : 'Completed'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>

                                {/* Task List */}
                                {filteredTasks.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Layers size={32} color="#52525B" />
                                        <Text style={styles.emptyTitle}>No tasks found</Text>
                                        <Text style={styles.emptyDesc}>
                                            {statusFilter !== 'ALL' 
                                                ? 'No tasks match the active filter criteria.' 
                                                : 'Keep the household aligned by tracking discrete chores and assignments.'}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setEditingTask(null);
                                                setTaskModalVisible(true);
                                            }}
                                            style={styles.emptyCta}
                                        >
                                            <Plus size={14} color="#3B82F6" />
                                            <Text style={styles.emptyCtaText}>Add First Task</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    filteredTasks.map(t => (
                                        <TaskItemCard
                                            key={t.id}
                                            task={t}
                                            onToggleStatus={handleToggleTaskStatus}
                                            onEdit={(task) => {
                                                setEditingTask(task);
                                                setTaskModalVisible(true);
                                            }}
                                            onArchive={handleArchiveTaskRecord}
                                            onDelete={handleDeleteTaskRecord}
                                        />
                                    ))
                                )}
                            </>
                        ) : (
                            /* Responsibilities List */
                            <>
                                {responsibilities.length === 0 ? (
                                    <View style={styles.emptyCard}>
                                        <Shield size={32} color="#52525B" />
                                        <Text style={styles.emptyTitle}>No responsibility domains defined</Text>
                                        <Text style={styles.emptyDesc}>
                                            Define clear areas of accountability like Home Maintenance, Health & Wellness, or Chores.
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => {
                                                setEditingResp(null);
                                                setRespModalVisible(true);
                                            }}
                                            style={[styles.emptyCta, { borderColor: '#8B5CF6' }]}
                                        >
                                            <Plus size={14} color="#A78BFA" />
                                            <Text style={[styles.emptyCtaText, { color: '#A78BFA' }]}>Add First Domain</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    responsibilities.map(r => (
                                        <ResponsibilityCard
                                            key={r.id}
                                            responsibility={r}
                                            onEdit={(resp) => {
                                                setEditingResp(resp);
                                                setRespModalVisible(true);
                                            }}
                                            onArchive={handleArchiveResponsibilityRecord}
                                            onDelete={handleDeleteResponsibilityRecord}
                                        />
                                    ))
                                )}
                            </>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Task Form Modal */}
            <TaskFormModal
                visible={taskModalVisible}
                onClose={() => {
                    setTaskModalVisible(false);
                    setEditingTask(null);
                }}
                onSave={handleSaveTaskRecord}
                initialTask={editingTask}
                householdId={household ? household.id : ''}
                householdMembers={members}
                responsibilities={responsibilities}
            />

            {/* Responsibility Form Modal */}
            <ResponsibilityFormModal
                visible={respModalVisible}
                onClose={() => {
                    setRespModalVisible(false);
                    setEditingResp(null);
                }}
                onSave={handleSaveResponsibilityRecord}
                initialResponsibility={editingResp}
                householdId={household ? household.id : ''}
                householdMembers={members}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    container: {
        flex: 1,
        backgroundColor: '#09090F'
    },
    content: {
        padding: 16,
        paddingBottom: 36
    },
    metricsBar: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#171721',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#27272A',
        paddingVertical: 10,
        paddingHorizontal: 8,
        alignItems: 'center'
    },
    metricAlertCard: {
        backgroundColor: '#EF444415',
        borderColor: '#EF444450'
    },
    metricWarnCard: {
        backgroundColor: '#F59E0B15',
        borderColor: '#F59E0B50'
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#71717A',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    metricAlertLabel: {
        color: '#EF4444'
    },
    metricWarnLabel: {
        color: '#F59E0B'
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    metricAlertValue: {
        color: '#F87171'
    },
    metricWarnValue: {
        color: '#FBBF24'
    },
    tabSwitcherRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12
    },
    segmentedControl: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#171721',
        borderRadius: 10,
        padding: 3,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        borderRadius: 8
    },
    segmentBtnActive: {
        backgroundColor: '#27272A'
    },
    segmentBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    segmentBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#3B82F6',
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 10
    },
    addBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    filterBar: {
        marginBottom: 12
    },
    filterPill: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 16,
        backgroundColor: '#171721',
        borderWidth: 1,
        borderColor: '#27272A',
        marginRight: 8
    },
    filterPillActive: {
        backgroundColor: '#3B82F620',
        borderColor: '#3B82F6'
    },
    filterPillText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    filterPillTextActive: {
        color: '#60A5FA',
        fontWeight: '700'
    },
    emptyCard: {
        backgroundColor: '#171721',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        padding: 24,
        alignItems: 'center',
        marginTop: 10
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 12,
        marginBottom: 4
    },
    emptyDesc: {
        fontSize: 12,
        color: '#71717A',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16,
        maxWidth: 280
    },
    emptyCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#3B82F6',
        backgroundColor: '#3B82F615'
    },
    emptyCtaText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#60A5FA'
    }
});
