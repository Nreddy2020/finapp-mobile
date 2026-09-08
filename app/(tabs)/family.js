import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    ScrollView,
    RefreshControl,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TextInput,
    TouchableOpacity,
    Alert,
    Linking
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import {
    Users,
    Plus,
    Shield,
    GitBranch,
    UserCheck,
    CheckSquare,
    GraduationCap,
    HeartHandshake,
    Activity,
    TrendingUp,
    FileText,
    X,
    Trash2,
    Home,
    Phone,
    Check,
    AlertCircle
} from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import StackHeader from '../../components/ui/StackHeader';

// Domain Services & Adapters
import { FamilyRepository } from '../../services/family/familyRepository';
import { FamilyProtectionService } from '../../services/family/familyProtectionService';
import { FamilyResponsibilityService } from '../../services/family/familyResponsibilityService';
import { FamilyEducationService } from '../../services/family/familyEducationService';
import { FamilyCareService } from '../../services/family/familyCareService';
import { FamilyHealthService } from '../../services/family/familyHealthService';
import { FamilyFinancialAdapter } from '../../services/family/familyFinancialAdapter';
import { FamilyReportViewModel } from '../../services/family/familyReportViewModel';
import { FamilyDashboardViewModel } from '../../services/family/familyDashboardViewModel';
import { CommitmentsService } from '../../services/commitments/commitmentsService';
import { getFamilyObligationsBreakdown } from '../../services/commitments/familyCommitmentBridge';
import { BudgetService } from '../../services/budgets';
import { buildRecurringCommitmentsViewModel } from '../../services/commitments/commitmentViewModel';
import {
    CircleCategory,
    FamilyRole,
    RelationshipType,
    ResponsibilityCategory,
    ResponsibilityPriority,
    ResponsibilityStatus,
    DEFAULT_EMERGENCY_CONFIG,
    createPerson
} from '../../services/family/familyContracts';

// Sub-Hub Views
import FamilyDashboardView from '../../components/family/FamilyDashboardView';
import FamilyTreeView from '../../components/family/FamilyTreeView';
import PeopleTrustedCircleView from '../../components/family/PeopleTrustedCircleView';
import FamilyProtectionView from '../../components/family/FamilyProtectionView';
import FamilyResponsibilitiesView from '../../components/family/FamilyResponsibilitiesView';
import ChildrenEducationView from '../../components/family/ChildrenEducationView';
import ParentsElderCareView from '../../components/family/ParentsElderCareView';
import HealthCareView from '../../components/family/HealthCareView';
import FamilyFinancialsView from '../../components/family/FamilyFinancialsView';
import FamilyReportsView from '../../components/family/FamilyReportsView';
import AddCommitmentModal from '../../components/commitments/AddCommitmentModal';
import PersonProfileModal from '../../components/family/PersonProfileModal';
import AddEditPersonModal from '../../components/family/AddEditPersonModal';
import AddRelationshipModal from '../../components/family/AddRelationshipModal';

const TABS = [
    { id: 'Dashboard', label: 'Dashboard', icon: Shield },
    { id: 'Tree', label: 'Family Tree', icon: GitBranch },
    { id: 'Circle', label: 'Circle', icon: Users },
    { id: 'Protection', label: 'Protection', icon: Shield },
    { id: 'Tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'Education', label: 'Education', icon: GraduationCap },
    { id: 'Elder Care', label: 'Elder Care', icon: HeartHandshake },
    { id: 'Health', label: 'Health', icon: Activity },
    { id: 'Financials', label: 'Financials', icon: TrendingUp },
    { id: 'Reports', label: 'Reports', icon: FileText }
];

export default function FamilyScreen() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('Dashboard');
    const [refreshing, setRefreshing] = useState(false);

    // Domain data
    const [envelopeData, setEnvelopeData] = useState({
        persons: [],
        relationships: [],
        policies: [],
        responsibilities: [],
        educationGoals: [],
        elderCarePlans: [],
        documents: []
    });

    const [netWorthSnapshot, setNetWorthSnapshot] = useState(null);
    const [runwayMetrics, setRunwayMetrics] = useState(null);
    const [familyObligations, setFamilyObligations] = useState(null);
    const [commitments, setCommitments] = useState([]);
    const [occurrences, setOccurrences] = useState([]);
    const [safeToSpendDisplay, setSafeToSpendDisplay] = useState('Not configured');
    const [households, setHouseholds] = useState([]);
    const [activeHousehold, setActiveHousehold] = useState(null);
    const [activityLogs, setActivityLogs] = useState([]);

    // Modals
    const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
    const [editingPerson, setEditingPerson] = useState(null);
    const [addRelationshipModalVisible, setAddRelationshipModalVisible] = useState(false);
    const [relationshipSourcePerson, setRelationshipSourcePerson] = useState(null);
    const [addTaskModalVisible, setAddTaskModalVisible] = useState(false);
    const [addObligationModalVisible, setAddObligationModalVisible] = useState(false);
    const [householdModalVisible, setHouseholdModalVisible] = useState(false);
    const [sosModalVisible, setSosModalVisible] = useState(false);
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [newHouseholdName, setNewHouseholdName] = useState('');

    // New Member Form State
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState(FamilyRole.MEMBER);
    const [newMemberCategory, setNewMemberCategory] = useState(CircleCategory.FAMILY);
    const [newMemberPhone, setNewMemberPhone] = useState('');
    const [newMemberBloodGroup, setNewMemberBloodGroup] = useState('');

    // New Task Form State
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState(ResponsibilityPriority.MEDIUM);
    const [newTaskCategory, setNewTaskCategory] = useState(ResponsibilityCategory.HOME);
    const [newTaskDueDate, setNewTaskDueDate] = useState('');
    const [newTaskAmount, setNewTaskAmount] = useState('');

    const loadAllData = useCallback(async () => {
        try {
            const envelope = await FamilyRepository.loadFamilyEnvelope();
            const data = envelope.data || {};
            setEnvelopeData(data);

            // Fetch households & activity logs
            const hhs = await FamilyRepository.getHouseholds();
            const actHh = await FamilyRepository.getActiveHousehold();
            const logs = await FamilyRepository.getFamilyActivityLog();
            setHouseholds(hhs);
            setActiveHousehold(actHh);
            setActivityLogs(logs);

            // Fetch authoritative financial snapshot
            const nw = await FamilyFinancialAdapter.getFamilyNetWorthSnapshot();
            setNetWorthSnapshot(nw);

            // Fetch authoritative commitments & occurrences
            let loadedCommitments = [];
            let loadedOccurrences = [];
            try {
                const commData = await CommitmentsService.load();
                loadedCommitments = commData.commitments || [];
                loadedOccurrences = commData.occurrences || [];
            } catch (cErr) {
                console.warn('[FamilyScreen] Commitments load failed, fallback empty:', cErr);
            }
            setCommitments(loadedCommitments);
            setOccurrences(loadedOccurrences);

            const breakdown = getFamilyObligationsBreakdown({
                commitments: loadedCommitments,
                familyPersons: data.persons || []
            });
            setFamilyObligations(breakdown);

            // Compute Discretionary Safe-to-Spend
            try {
                const headroom = await BudgetService.getSafeToSpendHeadroom({
                    periodKey: new Date().toISOString().substring(0, 7)
                });
                if (headroom && headroom.monthlyIncomePaise > 0n) {
                    setSafeToSpendDisplay(headroom.discretionarySafeToSpendFormatted);
                } else {
                    setSafeToSpendDisplay('Not configured');
                }
            } catch (sErr) {
                setSafeToSpendDisplay('Not configured');
            }

            // Dynamic emergency liquidity runway based on real commitments
            const liquidPaise = BigInt(nw.liquidPaiseStr || '0');
            const totalMonthlyPaise = BigInt(breakdown.totalFamilyMonthlyCommitted?.paise || '0');

            let runway;
            if (loadedCommitments.length === 0) {
                runway = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(
                    liquidPaise,
                    0n,
                    { status: 'NOT_CONFIGURED', commitmentsCount: 0 }
                );
            } else if (totalMonthlyPaise === 0n) {
                runway = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(
                    liquidPaise,
                    0n,
                    { status: 'NO_COMMITTED_OUTFLOW' }
                );
            } else {
                runway = FamilyFinancialAdapter.computeEmergencyLiquidityRunway(
                    liquidPaise,
                    totalMonthlyPaise,
                    { status: 'AVAILABLE' }
                );
            }
            setRunwayMetrics(runway);
        } catch (err) {
            console.error('[FamilyScreen] Failed to load family data:', err);
        } finally {
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    useFocusEffect(
        useCallback(() => {
            loadAllData();
        }, [loadAllData])
    );

    const onRefresh = () => {
        setRefreshing(true);
        loadAllData();
    };

    // Synthesized view models
    const reportsData = React.useMemo(() => {
        return FamilyReportViewModel.buildReportsData({
            persons: envelopeData.persons || [],
            relationships: envelopeData.relationships || [],
            policies: envelopeData.policies || [],
            responsibilities: envelopeData.responsibilities || [],
            educationGoals: envelopeData.educationGoals || [],
            elderCarePlans: envelopeData.elderCarePlans || [],
            documents: envelopeData.documents || [],
            netWorthSnapshot,
            runwayMetrics
        });
    }, [envelopeData, netWorthSnapshot, runwayMetrics]);

    // Commitments presentation view model
    const commitmentsViewModel = useMemo(() => {
        return buildRecurringCommitmentsViewModel({
            commitments,
            occurrences,
            asOfDate: new Date().toISOString().split('T')[0]
        });
    }, [commitments, occurrences]);

    // Complete Dashboard View Model Synthesizer
    const dashboardViewModel = useMemo(() => {
        return FamilyDashboardViewModel.build({
            household: activeHousehold,
            households,
            persons: envelopeData.persons || [],
            relationships: envelopeData.relationships || [],
            commitments,
            occurrences,
            commitmentsViewModel,
            familyObligations,
            safeToSpendDisplay,
            netWorthSnapshot,
            runwayMetrics,
            emergencyReadiness: reportsData.emergencyReadiness,
            protectionSummary: reportsData.protectionSummary,
            responsibilities: envelopeData.responsibilities || [],
            activityLogs,
            educationGoals: envelopeData.educationGoals || [],
            elderCarePlans: envelopeData.elderCarePlans || []
        });
    }, [
        activeHousehold,
        households,
        envelopeData,
        commitments,
        occurrences,
        commitmentsViewModel,
        familyObligations,
        safeToSpendDisplay,
        netWorthSnapshot,
        runwayMetrics,
        reportsData,
        activityLogs
    ]);

    // Handle Switch Household
    const handleSwitchHousehold = async (hhId) => {
        try {
            await FamilyRepository.setActiveHousehold(hhId);
            setHouseholdModalVisible(false);
            await loadAllData();
        } catch (err) {
            Alert.alert('Error', err.message || 'Could not switch household');
        }
    };

    // Handle Create Household
    const handleCreateHousehold = async () => {
        if (!newHouseholdName.trim()) return;
        try {
            await FamilyRepository.saveHousehold({ name: newHouseholdName.trim() });
            setNewHouseholdName('');
            setHouseholdModalVisible(false);
            await loadAllData();
        } catch (err) {
            Alert.alert('Error', err.message || 'Could not create household');
        }
    };

    // Handle Save Obligation
    const handleSaveObligation = async (newCommitment) => {
        try {
            await CommitmentsService.saveCommitment(newCommitment);
            setAddObligationModalVisible(false);
            await loadAllData();
        } catch (err) {
            Alert.alert('Save Failed', err.message || 'Could not save obligation');
        }
    };

    // Handle Save Person (Create or Edit)
    const handleSavePerson = async (personData, isEdit) => {
        try {
            if (isEdit) {
                const pId = personData.id;
                await FamilyRepository.updatePerson(pId, personData);
            } else {
                const newPerson = createPerson(personData);
                await FamilyRepository.savePerson(newPerson);
            }
            setEditingPerson(null);
            setAddMemberModalVisible(false);
            await loadAllData();
        } catch (err) {
            Alert.alert('Save Failed', err.message || 'Could not save member');
        }
    };

    // Handle Save Relationship
    const handleSaveRelationship = async (relData) => {
        try {
            await FamilyRepository.saveRelationship(relData);
            setAddRelationshipModalVisible(false);
            setRelationshipSourcePerson(null);
            await loadAllData();
        } catch (err) {
            Alert.alert('Cannot Link Relationship', err.message || 'Relationship validation failed');
        }
    };

    // Handle Delete Member
    const handleDeleteMember = async (personId) => {
        if (!personId) return;
        try {
            await FamilyRepository.deletePerson(personId);
            setSelectedPerson(null);
            await loadAllData();
        } catch (err) {
            Alert.alert('Delete Failed', err.message || 'Could not delete member');
        }
    };

    // Handle Create Task
    const handleSaveTask = async () => {
        if (!newTaskTitle.trim()) return;
        const paise = newTaskAmount.trim() ? BigInt(Math.round(parseFloat(newTaskAmount.trim()) * 100)) : 0n;
        const newTask = {
            title: newTaskTitle.trim(),
            priority: newTaskPriority,
            category: newTaskCategory,
            status: ResponsibilityStatus.PENDING,
            dueDate: newTaskDueDate.trim() || new Date().toISOString().split('T')[0],
            estimatedAmountPaise: paise
        };
        await FamilyRepository.saveResponsibility(newTask);
        setNewTaskTitle('');
        setNewTaskAmount('');
        setNewTaskDueDate('');
        setAddTaskModalVisible(false);
        loadAllData();
    };

    // Handle Task Status Toggle
    const handleToggleTaskStatus = async (task) => {
        const nextStatus = task.status === ResponsibilityStatus.COMPLETED ?
            ResponsibilityStatus.PENDING : ResponsibilityStatus.COMPLETED;
        await FamilyRepository.saveResponsibility({ ...task, status: nextStatus });
        loadAllData();
    };

    return (
        <AnimatedScreen style={styles.container}>
            <StackHeader title="FinLife Family" subtitle="Protect, Plan & Care" />

            {/* Horizontal Sub-Hub Navigation Bar */}
            <View style={styles.subHubNavWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.subHubScroll}
                >
                    {TABS.map(tab => {
                        const IconComp = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <Pressable
                                key={tab.id}
                                style={[styles.subHubPill, isActive && styles.subHubPillActive]}
                                onPress={() => setActiveTab(tab.id)}
                            >
                                <IconComp size={13} color={isActive ? '#FFFFFF' : '#71717A'} />
                                <Text style={[styles.subHubText, isActive && styles.subHubTextActive]}>
                                    {tab.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Active Sub-Hub Screen Body */}
            <ScrollView
                style={styles.contentScrollView}
                contentContainerStyle={styles.contentScroll}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#3B82F6"
                        colors={['#3B82F6']}
                        progressBackgroundColor="#18181B"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                {activeTab === 'Dashboard' && (
                    <FamilyDashboardView
                        dashboardViewModel={dashboardViewModel}
                        emergencyReadiness={reportsData.emergencyReadiness}
                        protectionSummary={reportsData.protectionSummary}
                        responsibilitiesSummary={reportsData.responsibilitiesSummary}
                        educationSummary={reportsData.educationSummary}
                        careSummary={reportsData.careSummary}
                        netWorthSnapshot={netWorthSnapshot}
                        runwayMetrics={runwayMetrics}
                        persons={envelopeData.persons || []}
                        commitments={commitments}
                        occurrences={occurrences}
                        commitmentsViewModel={commitmentsViewModel}
                        familyObligations={familyObligations}
                        safeToSpendDisplay={safeToSpendDisplay}
                        onNavigateTab={(tabId) => setActiveTab(tabId)}
                        onOpenAddMember={() => setAddMemberModalVisible(true)}
                        onOpenAddTask={() => setAddTaskModalVisible(true)}
                        onOpenAddObligation={() => setAddObligationModalVisible(true)}
                        onNavigateToRecurring={() => router.push('/recurring')}
                        onOpenHouseholdSelector={() => setHouseholdModalVisible(true)}
                        onOpenEmergencySOS={() => setSosModalVisible(true)}
                    />
                )}

                {activeTab === 'Tree' && (
                    <FamilyTreeView
                        persons={envelopeData.persons || []}
                        relationships={envelopeData.relationships || []}
                        households={households}
                        activeHousehold={activeHousehold}
                        onSelectPerson={(p) => setSelectedPerson(p)}
                        onAddMember={() => {
                            setEditingPerson(null);
                            setAddMemberModalVisible(true);
                        }}
                    />
                )}

                {activeTab === 'Circle' && (
                    <PeopleTrustedCircleView
                        persons={envelopeData.persons || []}
                        onSelectPerson={(p) => setSelectedPerson(p)}
                        onAddPerson={() => {
                            setEditingPerson(null);
                            setAddMemberModalVisible(true);
                        }}
                    />
                )}

                {activeTab === 'Protection' && (
                    <FamilyProtectionView
                        protectionSummary={reportsData.protectionSummary}
                        persons={envelopeData.persons || []}
                        onSelectPolicy={() => {}}
                        onAddPolicy={() => {}}
                    />
                )}

                {activeTab === 'Tasks' && (
                    <FamilyResponsibilitiesView
                        responsibilitiesSummary={reportsData.responsibilitiesSummary}
                        persons={envelopeData.persons || []}
                        onSelectTask={() => {}}
                        onToggleTaskStatus={handleToggleTaskStatus}
                        onAddTask={() => setAddTaskModalVisible(true)}
                    />
                )}

                {activeTab === 'Education' && (
                    <ChildrenEducationView
                        educationSummary={reportsData.educationSummary}
                        persons={envelopeData.persons || []}
                        onSelectGoal={() => {}}
                        onAddGoal={() => {}}
                    />
                )}

                {activeTab === 'Elder Care' && (
                    <ParentsElderCareView
                        careSummary={reportsData.careSummary}
                        persons={envelopeData.persons || []}
                        onSelectCarePlan={() => {}}
                        onAddCarePlan={() => {}}
                    />
                )}

                {activeTab === 'Health' && (
                    <HealthCareView
                        healthOverview={reportsData.healthSummary}
                        onSelectMemberHealth={() => {}}
                        onAddMedicalRecord={() => {}}
                    />
                )}

                {activeTab === 'Financials' && (
                    <FamilyFinancialsView
                        netWorthSnapshot={netWorthSnapshot}
                        runwayMetrics={runwayMetrics}
                        familyObligations={familyObligations}
                    />
                )}

                {activeTab === 'Reports' && (
                    <FamilyReportsView
                        reportsData={reportsData}
                        onNavigateTab={(tabId) => setActiveTab(tabId)}
                    />
                )}
            </ScrollView>



            {/* Add Task Modal */}
            <Modal
                visible={addTaskModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setAddTaskModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Family Responsibility</Text>
                            <Pressable onPress={() => setAddTaskModalVisible(false)}>
                                <X size={20} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        <Text style={styles.inputLabel}>Task Title</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. Term 2 School Fees Payment"
                            placeholderTextColor="#71717A"
                            value={newTaskTitle}
                            onChangeText={setNewTaskTitle}
                        />

                        <Text style={styles.inputLabel}>Priority</Text>
                        <View style={styles.pillSelectionRow}>
                            {[ResponsibilityPriority.URGENT, ResponsibilityPriority.HIGH, ResponsibilityPriority.MEDIUM, ResponsibilityPriority.LOW].map(p => (
                                <Pressable
                                    key={p}
                                    style={[styles.pillSelect, newTaskPriority === p && styles.pillSelectActive]}
                                    onPress={() => setNewTaskPriority(p)}
                                >
                                    <Text style={[styles.pillSelectText, newTaskPriority === p && styles.pillSelectTextActive]}>
                                        {p}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="2026-09-28"
                            placeholderTextColor="#71717A"
                            value={newTaskDueDate}
                            onChangeText={setNewTaskDueDate}
                        />

                        <Text style={styles.inputLabel}>Estimated Amount (₹ Optional)</Text>
                        <TextInput
                            style={styles.textInput}
                            placeholder="e.g. 50000"
                            placeholderTextColor="#71717A"
                            value={newTaskAmount}
                            onChangeText={setNewTaskAmount}
                            keyboardType="numeric"
                        />

                        <Pressable style={styles.primaryModalBtn} onPress={handleSaveTask}>
                            <Text style={styles.primaryModalBtnText}>Create Responsibility</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Person Profile Modal */}
            <PersonProfileModal
                visible={!!selectedPerson}
                person={selectedPerson}
                allPersons={envelopeData.persons || []}
                relationships={envelopeData.relationships || []}
                households={households}
                activeHousehold={activeHousehold}
                onClose={() => setSelectedPerson(null)}
                onEditPerson={(p) => {
                    setEditingPerson(p);
                    setAddMemberModalVisible(true);
                }}
                onDeletePerson={handleDeleteMember}
                onAddRelationship={(p) => {
                    setRelationshipSourcePerson(p);
                    setAddRelationshipModalVisible(true);
                }}
                onSelectRelatedPerson={(personId) => {
                    const found = (envelopeData.persons || []).find(p => (p.core?.id || p.id) === personId);
                    if (found) setSelectedPerson(found);
                }}
                onSwitchHousehold={handleSwitchHousehold}
            />

            {/* Add / Edit Person Modal */}
            <AddEditPersonModal
                visible={addMemberModalVisible}
                person={editingPerson}
                households={households}
                activeHousehold={activeHousehold}
                onClose={() => {
                    setAddMemberModalVisible(false);
                    setEditingPerson(null);
                }}
                onSave={handleSavePerson}
            />

            {/* Add Relationship Modal */}
            <AddRelationshipModal
                visible={addRelationshipModalVisible}
                sourcePerson={relationshipSourcePerson || selectedPerson}
                allPersons={envelopeData.persons || []}
                existingRelationships={envelopeData.relationships || []}
                onClose={() => {
                    setAddRelationshipModalVisible(false);
                    setRelationshipSourcePerson(null);
                }}
                onSave={handleSaveRelationship}
            />

            {/* Add Recurring Obligation Modal */}
            <AddCommitmentModal
                visible={addObligationModalVisible}
                onClose={() => setAddObligationModalVisible(false)}
                onSave={handleSaveObligation}
            />

            {/* Household Selector & Creation Modal */}
            <Modal
                visible={householdModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setHouseholdModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Family Households</Text>
                            <Pressable onPress={() => setHouseholdModalVisible(false)}>
                                <X size={20} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        <Text style={styles.inputLabel}>Active Household</Text>
                        <View style={{ gap: 8, marginBottom: 16 }}>
                            {households.map(h => {
                                const isActive = activeHousehold?.id === h.id;
                                return (
                                    <Pressable
                                        key={h.id}
                                        style={[styles.householdItemRow, isActive && styles.householdItemRowActive]}
                                        onPress={() => handleSwitchHousehold(h.id)}
                                    >
                                        <View style={[styles.householdItemIcon, isActive && { backgroundColor: '#3B82F625' }]}>
                                            <Home size={16} color={isActive ? '#3B82F6' : '#71717A'} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.householdItemName, isActive && { color: '#FFFFFF' }]}>{h.name}</Text>
                                            <Text style={styles.householdItemSub}>
                                                {(h.memberPersonIds || []).length} assigned members {h.isPrimary ? '• Primary' : ''}
                                            </Text>
                                        </View>
                                        {isActive && <Check size={18} color="#3B82F6" />}
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.inputLabel}>Create New Household</Text>
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            <TextInput
                                style={[styles.textInput, { flex: 1, marginBottom: 0 }]}
                                placeholder="e.g. Vacation Villa / Ancestral Home"
                                placeholderTextColor="#71717A"
                                value={newHouseholdName}
                                onChangeText={setNewHouseholdName}
                            />
                            <Pressable style={styles.householdAddBtn} onPress={handleCreateHousehold}>
                                <Plus size={16} color="#FFFFFF" />
                                <Text style={styles.householdAddBtnText}>Add</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Emergency SOS Modal */}
            <Modal
                visible={sosModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSosModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <View style={[styles.iconWrap, { backgroundColor: '#EF444420', width: 28, height: 28 }]}>
                                    <AlertCircle size={16} color="#EF4444" />
                                </View>
                                <Text style={styles.modalTitle}>Emergency Care & SOS</Text>
                            </View>
                            <Pressable onPress={() => setSosModalVisible(false)}>
                                <X size={20} color="#FFFFFF" />
                            </Pressable>
                        </View>

                        {/* Speed Dial Banner */}
                        <View style={styles.speedDialBanner}>
                            <Text style={styles.speedDialTitle}>
                                {DEFAULT_EMERGENCY_CONFIG.countryCode === 'IN' ? 'NATIONAL SPEED DIAL' : 'EMERGENCY SPEED DIAL'}
                            </Text>
                            <View style={styles.speedDialRow}>
                                {DEFAULT_EMERGENCY_CONFIG.emergencyServices.map(srv => (
                                    <Pressable
                                        key={srv.id}
                                        style={styles.speedDialBox}
                                        onPress={() => Linking.openURL(`tel:${srv.number}`).catch(() => {})}
                                    >
                                        <Text style={styles.speedDialNum}>{srv.number}</Text>
                                        <Text style={styles.speedDialLabel}>{srv.label}</Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Emergency Contacts on File */}
                        <Text style={styles.inputLabel}>Emergency Contacts On File</Text>
                        <ScrollView style={{ maxHeight: 180, marginBottom: 16 }}>
                            {envelopeData.persons?.filter(p => p.emergencyProfile?.isEmergencyContact || p.isEmergencyContact).length === 0 ? (
                                <Text style={styles.emptyPromptText}>No emergency contacts designated. Edit a family profile to set priority.</Text>
                            ) : (
                                envelopeData.persons?.filter(p => p.emergencyProfile?.isEmergencyContact || p.isEmergencyContact).map(p => (
                                    <View key={p.id || p.core?.id} style={styles.emergencyContactRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.emergencyContactName}>{p.name || p.core?.name}</Text>
                                            <Text style={styles.emergencyContactPhone}>{p.contact?.phone || 'No phone recorded'}</Text>
                                        </View>
                                        <View style={styles.bloodBadge}>
                                            <Text style={styles.bloodBadgeText}>{p.profile?.bloodGroup || p.medicalProfile?.bloodGroup || '—'}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        <Pressable style={[styles.primaryModalBtn, { backgroundColor: '#EF4444' }]} onPress={() => setSosModalVisible(false)}>
                            <Text style={styles.primaryModalBtnText}>Close SOS Drawer</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B'
    },
    subHubNavWrapper: {
        backgroundColor: '#121215',
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
        paddingVertical: 10
    },
    subHubScroll: {
        paddingHorizontal: 16,
        gap: 8
    },
    subHubPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    subHubPillActive: {
        backgroundColor: '#3B82F6',
        borderColor: '#60A5FA'
    },
    subHubText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600'
    },
    subHubTextActive: {
        color: '#FFFFFF'
    },
    contentScrollView: {
        flex: 1
    },
    contentScroll: {
        padding: 16,
        paddingBottom: 40
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end'
    },
    modalContainer: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#27272A',
        maxHeight: '90%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
        paddingBottom: 12
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    inputLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6
    },
    textInput: {
        backgroundColor: '#27272A',
        color: '#FFFFFF',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        marginBottom: 14
    },
    pillSelectionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14
    },
    pillSelect: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#27272A'
    },
    pillSelectActive: {
        backgroundColor: '#3B82F6'
    },
    pillSelectText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '600'
    },
    pillSelectTextActive: {
        color: '#FFFFFF'
    },
    primaryModalBtn: {
        backgroundColor: '#3B82F6',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8
    },
    primaryModalBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    personDetailBody: {
        marginBottom: 20,
        gap: 8
    },
    detailText: {
        color: '#9CA3AF',
        fontSize: 13
    },
    detailValText: {
        color: '#FFFFFF',
        fontWeight: '600'
    },
    deleteModalBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EF444415',
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#EF444430'
    },
    deleteModalBtnText: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '600'
    },
    // Household & SOS modal styles
    householdItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    householdItemRowActive: {
        borderColor: '#3B82F6',
        backgroundColor: '#1E293B'
    },
    householdItemIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#27272A',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10
    },
    householdItemName: {
        color: '#D1D5DB',
        fontSize: 14,
        fontWeight: '600'
    },
    householdItemSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    householdAddBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        gap: 4
    },
    householdAddBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    speedDialBanner: {
        backgroundColor: '#27272A',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EF444430'
    },
    speedDialTitle: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 8
    },
    speedDialRow: {
        flexDirection: 'row',
        gap: 8
    },
    speedDialBox: {
        flex: 1,
        backgroundColor: '#18181B',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    speedDialNum: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    speedDialLabel: {
        color: '#9CA3AF',
        fontSize: 10,
        marginTop: 2
    },
    emergencyContactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    emergencyContactName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    emergencyContactPhone: {
        color: '#3B82F6',
        fontSize: 12,
        marginTop: 2
    },
    bloodBadge: {
        backgroundColor: '#EF444420',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    bloodBadgeText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '700'
    },
    emptyPromptText: {
        color: '#71717A',
        fontSize: 12,
        fontStyle: 'italic',
        paddingVertical: 10
    }
});
