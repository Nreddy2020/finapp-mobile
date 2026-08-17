import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { P2PService } from '../../services/p2pService';
import { computeP2POverviewMetrics, computePersonP2PSummary } from './p2pPresentationAdapter';
import P2POverviewSection from './P2POverviewSection';
import P2PLoanListView from './P2PLoanListView';
import P2PPersonDetailView from './P2PPersonDetailView';
import P2PLoanDetailView from './P2PLoanDetailView';
import P2PAddLoanModal from './P2PAddLoanModal';
import P2PRecordPaymentModal from './P2PRecordPaymentModal';
import P2PTopUpModal from './P2PTopUpModal';
import P2PSettlementModal from './P2PSettlementModal';
import P2PIntelligenceCard from './P2PIntelligenceCard';

export default function P2PMainView({
    onMoneyFlowSync,
    onNavigateMoneyFlow
}) {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Data State
    const [persons, setPersons] = useState([]);
    const [loans, setLoans] = useState([]);
    const [advances, setAdvances] = useState([]);
    const [repayments, setRepayments] = useState([]);
    const [schedules, setSchedules] = useState({});
    const [journal, setJournal] = useState([]);

    // Navigation Sub-View State
    const [activeLoanTab, setActiveLoanTab] = useState('GIVEN'); // 'GIVEN' | 'TAKEN' | 'SETTLED'
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [selectedLoan, setSelectedLoan] = useState(null);

    // Modal Visibility State
    const [showAddLoanModal, setShowAddLoanModal] = useState(false);
    const [showRecordPayModal, setShowRecordPayModal] = useState(false);
    const [activePayScheduleItem, setActivePayScheduleItem] = useState(null);
    const [showTopUpModal, setShowTopUpModal] = useState(false);
    const [showSettleModal, setShowSettleModal] = useState(false);

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

            // If empty, seed initial isolated fixtures
            if (p.length === 0 && l.length === 0) {
                await P2PService.loadDemoFixtures();
                const [p2, l2, a2, r2, j2] = await Promise.all([
                    P2PService.getPersons(),
                    P2PService.getLoans(),
                    P2PService.getAdvances(),
                    P2PService.getRepayments(),
                    P2PService.getJournalEntries()
                ]);
                setPersons(p2);
                setLoans(l2);
                setAdvances(a2);
                setRepayments(r2);
                setJournal(j2);
            } else {
                setPersons(p);
                setLoans(l);
                setAdvances(a);
                setRepayments(r);
                setJournal(j);
            }

            const currentLoans = (p.length === 0 && l.length === 0) ? l2 : l;
            const schedObj = {};
            for (const loan of (currentLoans || [])) {
                schedObj[loan.id] = await P2PService.getSchedule(loan.id);
            }
            setSchedules(schedObj);
        } catch (e) {
            console.error('Error loading P2P data:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadAllData();
    }, [loadAllData]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
    };

    // Computed Overview & Person Summaries
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

    // Handlers for Add, Repay, TopUp, Settle
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
        Alert.alert('Loan Settled', 'Loan has been fully settled and marked closed.');
    };

    const handleUpdateNotesTags = async (updatedLoan) => {
        await P2PService.updateLoan(updatedLoan);
        await loadAllData();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Loading P2P Money Management...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* ── 1. LOAN DETAIL VIEW (IF SELECTED) ── */}
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
                    onAddTopUp={(l) => setShowTopUpModal(true)}
                    onSettleLoan={(l) => setShowSettleModal(true)}
                    onUpdateNotesTags={handleUpdateNotesTags}
                />
            ) : selectedPerson ? (
                /* ── 2. PERSON DETAIL VIEW (IF SELECTED) ── */
                <P2PPersonDetailView
                    personSummary={selectedPersonSummary}
                    onBack={() => setSelectedPerson(null)}
                    onSelectLoan={(l) => setSelectedLoan(l)}
                    onAddLoanForPerson={(p) => {
                        setShowAddLoanModal(true);
                    }}
                />
            ) : (
                /* ── 3. ROOT P2P DASHBOARD (OVERVIEW + LOANS LIST) ── */
                <View style={{ gap: 14 }}>
                    {/* Position Card & Safety Indicators */}
                    <P2POverviewSection
                        metrics={overviewMetrics}
                        onAddLoan={() => setShowAddLoanModal(true)}
                        onNavigateTab={(tab) => setActiveLoanTab(tab)}
                    />

                    {/* Decision Intelligence */}
                    <P2PIntelligenceCard
                        overviewMetrics={overviewMetrics}
                        personSummaries={personSummaries}
                        onSelectPerson={(p) => setSelectedPerson(p)}
                    />

                    {/* Filtered Loans List with Person Grouping */}
                    <P2PLoanListView
                        personSummaries={personSummaries}
                        activeTab={activeLoanTab}
                        onSelectTab={(tab) => setActiveLoanTab(tab)}
                        onSelectPerson={(p) => setSelectedPerson(p)}
                        onSelectLoan={(l) => setSelectedLoan(l)}
                        onAddLoan={() => setShowAddLoanModal(true)}
                    />
                </View>
            )}

            {/* ── MODALS ── */}
            <P2PAddLoanModal
                visible={showAddLoanModal}
                persons={persons}
                initialPerson={selectedPerson}
                onClose={() => setShowAddLoanModal(false)}
                onCreateLoan={handleCreateLoan}
                onAddPerson={handleAddPerson}
            />

            <P2PRecordPaymentModal
                visible={showRecordPayModal}
                loan={selectedLoan}
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
                onClose={() => setShowTopUpModal(false)}
                onConfirmTopUp={handleConfirmTopUp}
            />

            <P2PSettlementModal
                visible={showSettleModal}
                loan={selectedLoan}
                advances={advances.filter(a => a.loanId === (selectedLoan ? selectedLoan.id : ''))}
                repayments={repayments.filter(r => r.loanId === (selectedLoan ? selectedLoan.id : ''))}
                onClose={() => setShowSettleModal(false)}
                onConfirmSettlement={handleConfirmSettlement}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 20
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10
    },
    loadingText: {
        color: '#94A3B8',
        fontSize: 13,
        fontWeight: '600'
    }
});
