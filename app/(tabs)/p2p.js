/**
 * app/(tabs)/p2p.js
 * 
 * FinLife P2P Network — Canonical Standalone Screen.
 * Implements 5 Sub-Tabs matching Certified Mockup:
 * 1. Overview (Twin calm metric cards, net position, 2x2 grid, health gauge, fast actions)
 * 2. Given (Money lent to counterparties, amortization schedules, repayment progress)
 * 3. Taken (Money borrowed from counterparties, obligations, upcoming EMIs)
 * 4. People (Counterparties directory with multi-contract netting & health)
 * 5. Settlements (Settled loans, debt consolidation, quotes, and closures)
 * 
 * Guarantees:
 * - 64-bit BigInt integer paise precision across all arithmetic.
 * - Two-tier back navigation contract.
 * - Non-breaking drawer integration and backward-compatible route redirects.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    RefreshControl, 
    TouchableOpacity, 
    TextInput, 
    ActivityIndicator, 
    Alert, 
    BackHandler 
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    Menu, 
    ArrowLeft, 
    Plus, 
    Search, 
    ChevronRight, 
    Clock, 
    AlertCircle, 
    CheckCircle2, 
    Users, 
    CheckCircle,
    UserCheck,
    Tag,
    Handshake
} from 'lucide-react-native';

import { useDrawer } from './_layout';
import { P2PService } from '../../services/p2pService';
import { P2P_TABS } from '../../components/p2p/p2pContracts';
import { LOAN_DIRECTION, LOAN_STATUS } from '../../components/p2p/p2pDomainModel';
import { computeP2POverviewMetrics, computePersonP2PSummary, formatINR } from '../../components/p2p/p2pPresentationAdapter';

import P2POverviewSection from '../../components/p2p/P2POverviewSection';
import P2PIntelligenceCard from '../../components/p2p/P2PIntelligenceCard';
import P2PLoanListView from '../../components/p2p/P2PLoanListView';
import P2PPersonDetailView from '../../components/p2p/P2PPersonDetailView';
import P2PLoanDetailView from '../../components/p2p/P2PLoanDetailView';
import P2PAddLoanModal from '../../components/p2p/P2PAddLoanModal';
import P2PRecordPaymentModal from '../../components/p2p/P2PRecordPaymentModal';
import P2PTopUpModal from '../../components/p2p/P2PTopUpModal';
import P2PSettlementModal from '../../components/p2p/P2PSettlementModal';

export default function P2PScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { setIsDrawerOpen } = useDrawer() || {};

    // Sub-tab selection state (Overview | Given | Taken | People | Settlements)
    const [activeTab, setActiveTab] = useState(params?.tab || P2P_TABS.OVERVIEW);

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Core Data State
    const [persons, setPersons] = useState([]);
    const [loans, setLoans] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [repayments, setRepayments] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [journal, setJournal] = useState([]);

    // Drilldown Navigation State
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [selectedLoan, setSelectedLoan] = useState(null);

    // Modal Visibility State
    const [showAddLoanModal, setShowAddLoanModal] = useState(false);
    const [addLoanInitialDirection, setAddLoanInitialDirection] = useState(LOAN_DIRECTION.GIVEN);
    const [showRecordPayModal, setShowRecordPayModal] = useState(false);
    const [activePayScheduleItem, setActivePayScheduleItem] = useState(null);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);

    // Filter & Search states for sub-tabs
    const [peopleSearch, setPeopleSearch] = useState('');
    const [peopleFilter, setPeopleFilter] = useState('ALL'); // 'ALL' | 'LENDERS' | 'BORROWERS' | 'AT_RISK'
    const [loanListFilter, setLoanListFilter] = useState('ALL'); // 'ALL' | 'DUE_SOON' | 'OVERDUE'

    // Load Data
    const loadAllData = useCallback(async () => {
        try {
            const [p, l, a, r, j] = await Promise.all([
                P2PService.getPersons(),
                P2PService.getLoans(),
                P2PService.getAdvances(),
                P2PService.getRepayments(),
                P2PService.getJournalEntries()
            ]);

            let activePersons = p;
            let activeLoans = l;
            let activeAdvances = a;
            let activeRepayments = r;
            let activeJournal = j;

            // Seed demo fixtures if completely empty
            if (p.length === 0 && l.length === 0) {
                await P2PService.loadDemoFixtures();
                const [p2, l2, a2, r2, j2] = await Promise.all([
                    P2PService.getPersons(),
                    P2PService.getLoans(),
                    P2PService.getAdvances(),
                    P2PService.getRepayments(),
                    P2PService.getJournalEntries()
                ]);
                activePersons = p2;
                activeLoans = l2;
                activeAdvances = a2;
                activeRepayments = r2;
                activeJournal = j2;
            }

            setPersons(activePersons);
            setLoans(activeLoans);
            setAdvances(activeAdvances);
            setRepayments(activeRepayments);
            setJournal(activeJournal);

            const schedObj = {};
            for (const loan of activeLoans) {
                schedObj[loan.id] = await P2PService.getSchedule(loan.id);
            }
            setSchedules(schedObj);
        } catch (e) {
            console.error('[P2PScreen] Error loading data:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    // Handle parameter changes (e.g. from deep links)
    useEffect(() => {
        if (params?.tab) {
            const lowerTab = params.tab.toLowerCase();
            if (Object.values(P2P_TABS).includes(lowerTab)) {
                setActiveTab(lowerTab);
            }
        }
    }, [params?.tab]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
    };

    // Two-Tier Back Navigation Contract
    const handleBack = useCallback(() => {
        if (selectedLoan) {
            setSelectedLoan(null);
            return true;
        }
        if (selectedPerson) {
            setSelectedPerson(null);
            return true;
        }
        if (activeTab !== P2P_TABS.OVERVIEW) {
            setActiveTab(P2P_TABS.OVERVIEW);
            return true;
        }
        if (router.canGoBack()) {
            router.back();
            return true;
        }
        router.replace('/(tabs)');
        return true;
    }, [selectedLoan, selectedPerson, activeTab, router]);

    useEffect(() => {
        const onBackPress = () => handleBack();
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [handleBack]);

    // Computed Presentation Models
    const overviewMetrics = useMemo(() => {
        return computeP2POverviewMetrics(loans, advances, repayments, schedules);
    }, [loans, advances, repayments, schedules]);

    const personSummaries = useMemo(() => {
        return persons.map(p => computePersonP2PSummary(p, loans, advances, repayments, schedules));
    }, [persons, loans, advances, repayments, schedules]);

    const selectedPersonSummary = useMemo(() => {
        if (!selectedPerson) return null;
        return personSummaries.find(ps => ps.person.id === selectedPerson.id) || null;
    }, [selectedPerson, personSummaries]);

    // Action Dispatcher for Fast Actions
    const handleFastAction = (actionType) => {
        if (actionType === 'LEND') {
            setAddLoanInitialDirection(LOAN_DIRECTION.GIVEN);
            setShowAddLoanModal(true);
        } else if (actionType === 'BORROW') {
            setAddLoanInitialDirection(LOAN_DIRECTION.TAKEN);
            setShowAddLoanModal(true);
        } else if (actionType === 'REPAY') {
            setShowRecordPayModal(true);
        } else if (actionType === 'SETTLE') {
            setShowSettleModal(true);
        }
    };

    // Mutation Handlers
    const handleCreateLoan = async (loanData) => {
        await P2PService.addLoan(loanData);
        await loadAllData();
        Alert.alert('Loan Created', 'P2P loan created and double-entry journal posted.');
    };

    const handleAddPerson = async (personData) => {
        const created = await P2PService.addPerson(personData);
        await loadAllData();
        return created;
    };

    const handleConfirmRepayment = async (payData) => {
        await P2PService.recordRepayment(payData);
        await loadAllData();
        Alert.alert('Repayment Recorded', 'Repayment posted and amortization schedule updated.');
    };

    const handleConfirmTopUp = async (topUpData) => {
        await P2PService.addAdvance(topUpData);
        await loadAllData();
        Alert.alert('Top-Up Advance Added', 'Loan principal increased and journal posted.');
    };

    const handleConfirmSettlement = async (settleData) => {
        await P2PService.settleLoan(settleData);
        await loadAllData();
        Alert.alert('Loan Settled', 'Loan has been fully settled and closed.');
    };

    const handleUpdateNotesTags = async (updatedLoan) => {
        await P2PService.updateLoan(updatedLoan);
        await loadAllData();
    };

    // Filtered People Directory
    const filteredPeople = useMemo(() => {
        return personSummaries.filter(summary => {
            const name = (summary.person.name || '').toLowerCase();
            const tags = (summary.person.tags || []).map(t => t.toLowerCase());
            const q = peopleSearch.toLowerCase().trim();

            const matchesSearch = !q || name.includes(q) || tags.some(t => t.includes(q));
            if (!matchesSearch) return false;

            if (peopleFilter === 'LENDERS') {
                return summary.subLoans.some(l => l.direction === LOAN_DIRECTION.TAKEN && l.status === LOAN_STATUS.ACTIVE);
            }
            if (peopleFilter === 'BORROWERS') {
                return summary.subLoans.some(l => l.direction === LOAN_DIRECTION.GIVEN && l.status === LOAN_STATUS.ACTIVE);
            }
            if (peopleFilter === 'AT_RISK') {
                return summary.subLoans.some(l => l.isOverdue || (l.daysOverdue && l.daysOverdue > 0));
            }
            return true;
        });
    }, [personSummaries, peopleSearch, peopleFilter]);

    // Settled Loans List
    const settledLoans = useMemo(() => {
        return loans.filter(l => l.status === LOAN_STATUS.SETTLED);
    }, [loans]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loadingText}>Loading P2P Network...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.screen, { paddingTop: insets.top }]}>
            {/* ── Top App Bar ── */}
            <View style={styles.appBar}>
                <View style={styles.appBarLeft}>
                    {selectedLoan || selectedPerson ? (
                        <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
                            <ArrowLeft size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setIsDrawerOpen && setIsDrawerOpen(true)} style={styles.iconBtn}>
                            <Menu size={22} color="#FFFFFF" />
                        </TouchableOpacity>
                    )}
                    <Text style={styles.screenTitle}>P2P Network</Text>
                </View>

                <View style={styles.appBarRight}>
                    <TouchableOpacity 
                        style={styles.addQuickHeaderBtn}
                        onPress={() => {
                            setAddLoanInitialDirection(LOAN_DIRECTION.GIVEN);
                            setShowAddLoanModal(true);
                        }}
                    >
                        <Plus size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── 5-Segment Sub-Tab Switcher ── */}
            {!selectedLoan && !selectedPerson && (
                <View style={styles.tabBarWrap}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false} 
                        contentContainerStyle={styles.tabScrollContent}
                    >
                        {[
                            { key: P2P_TABS.OVERVIEW, label: 'Overview' },
                            { key: P2P_TABS.GIVEN, label: 'Given' },
                            { key: P2P_TABS.TAKEN, label: 'Taken' },
                            { key: P2P_TABS.PEOPLE, label: 'People' },
                            { key: P2P_TABS.SETTLEMENTS, label: 'Settlements' }
                        ].map(t => {
                            const isSelected = activeTab === t.key;
                            return (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.tabPill, isSelected && styles.tabPillActive]}
                                    onPress={() => setActiveTab(t.key)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[styles.tabPillText, isSelected && styles.tabPillTextActive]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* ── Main Scroll View Content ── */}
            <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={[styles.contentInner, { paddingBottom: insets.bottom + 30 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />}
            >
                {/* 1. LOAN DETAIL DRILLDOWN */}
                {selectedLoan ? (
                    <P2PLoanDetailView
                        loan={selectedLoan}
                        person={persons.find(p => p.id === selectedLoan.personId) || { name: 'Counterparty' }}
                        advances={advances.filter(a => a.loanId === selectedLoan.id)}
                        repayments={repayments.filter(r => r.loanId === selectedLoan.id)}
                        schedule={schedules[selectedLoan.id] || []}
                        onBack={() => setSelectedLoan(null)}
                        onRecordPayment={(l, sch) => {
                            setActivePayScheduleItem(sch);
                            setShowRecordPayModal(true);
                        }}
                        onAddTopUp={() => setShowTopUpModal(true)}
                        onSettleLoan={() => setShowSettleModal(true)}
                        onUpdateNotesTags={handleUpdateNotesTags}
                    />
                ) : selectedPerson ? (
                    /* 2. PERSON DETAIL DRILLDOWN */
                    <P2PPersonDetailView
                        personSummary={selectedPersonSummary}
                        onBack={() => setSelectedPerson(null)}
                        onSelectLoan={(l) => setSelectedLoan(l)}
                        onAddLoanForPerson={() => setShowAddLoanModal(true)}
                    />
                ) : (
                    /* 3. SUB-TAB SCREENS */
                    <>
                        {/* ── A. OVERVIEW SUB-TAB ── */}
                        {activeTab === P2P_TABS.OVERVIEW && (
                            <View style={{ gap: 14 }}>
                                <P2POverviewSection
                                    metrics={overviewMetrics}
                                    onAddLoan={(direction) => {
                                        setAddLoanInitialDirection(direction || LOAN_DIRECTION.GIVEN);
                                        setShowAddLoanModal(true);
                                    }}
                                    onNavigateTab={(tab) => setActiveTab(tab)}
                                    onAction={handleFastAction}
                                />

                                <P2PIntelligenceCard
                                    overviewMetrics={overviewMetrics}
                                    personSummaries={personSummaries}
                                    onSelectPerson={(p) => setSelectedPerson(p)}
                                />
                            </View>
                        )}

                        {/* ── B. GIVEN SUB-TAB ── */}
                        {activeTab === P2P_TABS.GIVEN && (
                            <P2PLoanListView
                                personSummaries={personSummaries}
                                activeTab="GIVEN"
                                onSelectTab={(t) => setActiveTab(t.toLowerCase())}
                                onSelectPerson={(p) => setSelectedPerson(p)}
                                onSelectLoan={(l) => setSelectedLoan(l)}
                                onAddLoan={() => {
                                    setAddLoanInitialDirection(LOAN_DIRECTION.GIVEN);
                                    setShowAddLoanModal(true);
                                }}
                            />
                        )}

                        {/* ── C. TAKEN SUB-TAB ── */}
                        {activeTab === P2P_TABS.TAKEN && (
                            <P2PLoanListView
                                personSummaries={personSummaries}
                                activeTab="TAKEN"
                                onSelectTab={(t) => setActiveTab(t.toLowerCase())}
                                onSelectPerson={(p) => setSelectedPerson(p)}
                                onSelectLoan={(l) => setSelectedLoan(l)}
                                onAddLoan={() => {
                                    setAddLoanInitialDirection(LOAN_DIRECTION.TAKEN);
                                    setShowAddLoanModal(true);
                                }}
                            />
                        )}

                        {/* ── D. PEOPLE DIRECTORY SUB-TAB ── */}
                        {activeTab === P2P_TABS.PEOPLE && (
                            <View style={styles.peopleContainer}>
                                {/* Search Bar */}
                                <View style={styles.searchBar}>
                                    <Search size={16} color="#71717A" />
                                    <TextInput
                                        placeholder="Search people, phone, tag..."
                                        placeholderTextColor="#71717A"
                                        value={peopleSearch}
                                        onChangeText={setPeopleSearch}
                                        style={styles.searchInput}
                                    />
                                </View>

                                {/* Filter Pills */}
                                <View style={styles.filterPillsRow}>
                                    {[
                                        { key: 'ALL', label: 'All' },
                                        { key: 'BORROWERS', label: 'Borrowers' },
                                        { key: 'LENDERS', label: 'Lenders' },
                                        { key: 'AT_RISK', label: 'At Risk' }
                                    ].map(pill => (
                                        <TouchableOpacity
                                            key={pill.key}
                                            style={[styles.filterPill, peopleFilter === pill.key && styles.filterPillActive]}
                                            onPress={() => setPeopleFilter(pill.key)}
                                        >
                                            <Text style={[styles.filterPillText, peopleFilter === pill.key && styles.filterPillTextActive]}>
                                                {pill.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* People List */}
                                {filteredPeople.length === 0 ? (
                                    <View style={styles.emptyStateBox}>
                                        <Text style={styles.emptyStateIcon}>👥</Text>
                                        <Text style={styles.emptyStateTitle}>No counterparties found</Text>
                                        <Text style={styles.emptyStateSub}>Add a counterparty or adjust search filter.</Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        {filteredPeople.map(item => {
                                            const netPaise = item.person?.netBalancePaise !== undefined 
                                                ? item.person.netBalancePaise 
                                                : BigInt(Math.round((item.netOutstanding || 0) * 100));
                                            const isPositive = netPaise >= 0n;
                                            const formattedNet = `${isPositive ? '+' : '-'}${formatINR(Math.abs(Number(netPaise) / 100), true)}`;

                                            return (
                                                <TouchableOpacity
                                                    key={item.person.id}
                                                    style={styles.personItemCard}
                                                    activeOpacity={0.7}
                                                    onPress={() => setSelectedPerson(item.person)}
                                                >
                                                    <View style={styles.personItemAvatar}>
                                                        <Text style={styles.avatarLetter}>
                                                            {item.person.name.substring(0, 2).toUpperCase()}
                                                        </Text>
                                                    </View>

                                                    <View style={{ flex: 1 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                            <Text style={styles.personItemName}>{item.person.name}</Text>
                                                        </View>
                                                        <Text style={styles.personItemTags}>
                                                            {item.person.tags?.join(' • ') || 'Contact'} • {item.subLoans.length} loan{item.subLoans.length > 1 ? 's' : ''}
                                                        </Text>
                                                    </View>

                                                    <View style={{ alignItems: 'flex-end' }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                            <Text style={[styles.personItemBalance, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                                                                {formattedNet}
                                                            </Text>
                                                            <ChevronRight size={16} color="#71717A" />
                                                        </View>
                                                        <Text style={styles.personItemBalLabel}>
                                                            {isPositive ? 'Owes you' : 'You owe'}
                                                        </Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* ── E. SETTLEMENTS SUB-TAB ── */}
                        {activeTab === P2P_TABS.SETTLEMENTS && (
                            <View style={styles.settlementsContainer}>
                                <View style={styles.settleBanner}>
                                    <Handshake size={24} color="#818CF8" />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.settleBannerTitle}>Loan Settlements & Debt Consolidation</Text>
                                        <Text style={styles.settleBannerSub}>
                                            Generate formal settlement quotes, record waivers, and close completed facilities.
                                        </Text>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.settleActionHeroBtn}
                                    onPress={() => setShowSettleModal(true)}
                                    activeOpacity={0.8}
                                >
                                    <CheckCircle size={18} color="#FFFFFF" />
                                    <Text style={styles.settleActionHeroText}>Settle Active Loan Facility</Text>
                                </TouchableOpacity>

                                <Text style={styles.settledSectionHeader}>CLOSED & SETTLED FACILITIES ({settledLoans.length})</Text>

                                {settledLoans.length === 0 ? (
                                    <View style={styles.emptyStateBox}>
                                        <Text style={styles.emptyStateIcon}>🤝</Text>
                                        <Text style={styles.emptyStateTitle}>No settled loans yet</Text>
                                        <Text style={styles.emptyStateSub}>Loans marked fully settled will appear in this audited archive.</Text>
                                    </View>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        {settledLoans.map(loan => {
                                            const person = persons.find(p => p.id === loan.personId) || { name: 'Counterparty' };
                                            return (
                                                <TouchableOpacity
                                                    key={loan.id}
                                                    style={styles.settledCard}
                                                    onPress={() => setSelectedLoan(loan)}
                                                    activeOpacity={0.7}
                                                >
                                                    <View style={styles.settledCardHeader}>
                                                        <View>
                                                            <Text style={styles.settledLoanTitle}>{loan.name || loan.id}</Text>
                                                            <Text style={styles.settledLoanSub}>{person.name} • {loan.direction}</Text>
                                                        </View>
                                                        <View style={styles.settledBadge}>
                                                            <CheckCircle2 size={12} color="#10B981" />
                                                            <Text style={styles.settledBadgeText}>SETTLED</Text>
                                                        </View>
                                                    </View>
                                                    <View style={styles.settledCardFooter}>
                                                        <Text style={styles.settledPrincipal}>Principal: {formatINR(loan.principal)}</Text>
                                                        <Text style={styles.settledDate}>{loan.settledAt || 'Completed'}</Text>
                                                    </View>
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* ── MODALS ── */}
            <P2PAddLoanModal
                visible={showAddLoanModal}
                persons={persons}
                initialPerson={selectedPerson}
                initialDirection={addLoanInitialDirection}
                onClose={() => setShowAddLoanModal(false)}
                onCreateLoan={handleCreateLoan}
                onAddPerson={handleAddPerson}
            />

            <P2PRecordPaymentModal
                visible={showRecordPayModal}
                loan={selectedLoan}
                loans={loans.filter(l => l.status === LOAN_STATUS.ACTIVE)}
                scheduleItem={activePayScheduleItem}
                onClose={() => {
                    setShowRecordPayModal(false);
                    setActivePayScheduleItem(null);
                }}
                onConfirmPayment={handleConfirmRepayment}
            />

            <P2PTopUpModal
                visible={showTopUpModal}
                loan={selectedLoan}
                loans={loans.filter(l => l.status === LOAN_STATUS.ACTIVE)}
                onClose={() => setShowTopUpModal(false)}
                onConfirmTopUp={handleConfirmTopUp}
            />

            <P2PSettlementModal
                visible={showSettleModal}
                loan={selectedLoan}
                loans={loans.filter(l => l.status === LOAN_STATUS.ACTIVE)}
                advances={advances}
                repayments={repayments}
                onClose={() => setShowSettleModal(false)}
                onConfirmSettlement={handleConfirmSettlement}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#09090B'
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#09090B',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12
    },
    loadingText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600'
    },
    appBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#18181B'
    },
    appBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    iconBtn: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: '#18181B'
    },
    screenTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.3
    },
    appBarRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    addQuickHeaderBtn: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center'
    },
    tabBarWrap: {
        backgroundColor: '#09090B',
        borderBottomWidth: 1,
        borderBottomColor: '#18181B',
        paddingVertical: 8
    },
    tabScrollContent: {
        paddingHorizontal: 16,
        gap: 8
    },
    tabPill: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    tabPillActive: {
        backgroundColor: '#6366F1',
        borderColor: '#6366F1'
    },
    tabPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#A1A1AA'
    },
    tabPillTextActive: {
        color: '#FFFFFF'
    },
    contentScroll: {
        flex: 1
    },
    contentInner: {
        padding: 16
    },
    peopleContainer: {
        gap: 12
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 13
    },
    filterPillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginVertical: 4
    },
    filterPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    filterPillActive: {
        backgroundColor: '#6366F120',
        borderColor: '#6366F1'
    },
    filterPillText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#71717A'
    },
    filterPillTextActive: {
        color: '#818CF8'
    },
    personItemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14
    },
    personItemAvatar: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#312E81',
        justifyContent: 'center',
        alignItems: 'center'
    },
    avatarLetter: {
        color: '#C7D2FE',
        fontSize: 14,
        fontWeight: '900'
    },
    personItemName: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    personItemTags: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2
    },
    personItemBalance: {
        fontSize: 15,
        fontWeight: '900'
    },
    personItemBalLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2
    },
    settlementsContainer: {
        gap: 14
    },
    settleBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#1E1B4B30',
        borderColor: '#4338CA40',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14
    },
    settleBannerTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    settleBannerSub: {
        color: '#A5B4FC',
        fontSize: 11,
        marginTop: 2
    },
    settleActionHeroBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#059669',
        paddingVertical: 12,
        borderRadius: 12
    },
    settleActionHeroText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    settledSectionHeader: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 8
    },
    settledCard: {
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 14,
        padding: 14,
        gap: 8
    },
    settledCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    settledLoanTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    settledLoanSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    settledBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#10B98120',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    settledBadgeText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '800'
    },
    settledCardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 8
    },
    settledPrincipal: {
        color: '#D4D4D8',
        fontSize: 12,
        fontWeight: '600'
    },
    settledDate: {
        color: '#71717A',
        fontSize: 11
    },
    emptyStateBox: {
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 14
    },
    emptyStateIcon: {
        fontSize: 28,
        marginBottom: 8
    },
    emptyStateTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    emptyStateSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center'
    }
});
