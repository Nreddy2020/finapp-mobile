import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Modal, Pressable, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { Calendar, Plus, Clock, Sparkles, TrendingDown, AlertCircle, CheckCircle, X, History, Timer, Activity, Zap, Shield, ChevronRight, TrendingUp, Users, Settings, UserPlus, Info, Banknote, Percent, Calculator, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { EMIService } from '../../services/emi';
import { loadData, saveData, STORAGE_KEYS } from '../../services/storage';
import { NotificationService } from '../../services/notificationService';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import StatCard from '../../components/ui/StatCard';
import FilterChips from '../../components/ui/FilterChips';

export default function EMIsScreen() {
    const [emis, setEmis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Add Loan Form States
    const [newLoanAmount, setNewLoanAmount] = useState('');
    const [newLoanRate, setNewLoanRate] = useState('');
    const [newLoanTenure, setNewLoanTenure] = useState('');
    const [newLoanFee, setNewLoanFee] = useState('');
    const [feeType, setFeeType] = useState('FIXED');
    const [newLoanDate, setNewLoanDate] = useState('');
    const [newEmiDate, setNewEmiDate] = useState('');
    const [newLoanName, setNewLoanName] = useState(''); // Added Name field
    const [newLoanType, setNewLoanType] = useState('BANK');

    const [selectedEMI, setSelectedEMI] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchEmis = async () => {
        try {
            // Load from persistent storage
            const savedEmis = await loadData(STORAGE_KEYS.EMIS, []) || [];

            // If empty, maybe seed from API?
            // For now, if empty, we just show empty state or seed if we want
            if (savedEmis.length === 0) {
                const apiEmis = await EMIService.getEMIs();
                if (apiEmis && apiEmis.length > 0) {
                    const seededEmis = apiEmis.map(e => ({
                        ...e,
                        id: Date.now() + Math.random(),
                        transactions: [], // Initialize history
                        status: 'pending'
                    }));
                    await saveData(STORAGE_KEYS.EMIS, seededEmis);
                    setEmis(seededEmis);
                    return;
                }
            }
            setEmis(savedEmis);
        } catch (error) {
            console.error('Error fetching EMIs:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchEmis();
        NotificationService.requestPermissions();
    }, []);

    const [timeLeft, setTimeLeft] = useState({ d: 14, h: 5, m: 30, s: 0 });
    const [prepayAmount, setPrepayAmount] = useState(0);
    const [simulateMissed, setSimulateMissed] = useState(false);
    const [refinanceRate, setRefinanceRate] = useState(0);

    // Sharing Logic
    const [sharingConfig, setSharingConfig] = useState({
        mode: 'SOLO',
        members: ['Me'],
        groupName: 'Dokra Group'
    });
    const [showSharingHub, setShowSharingHub] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');

    const [showAddLoan, setShowAddLoan] = useState(false);
    const [showSchedule, setShowSchedule] = useState(false);

    // Helpers
    const formatDateInput = (text, setValue) => {
        const cleaned = text.replace(/\D/g, '');
        let formatted = cleaned;
        if (cleaned.length >= 2) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        if (cleaned.length >= 4) formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
        setValue(formatted.slice(0, 10));
    };

    const parseNum = (val) => parseFloat(String(val).replace(/,/g, '')) || 0;
    const fmt = (num) => `₹${(parseFloat(num || 0) / 1000).toFixed(1)}k`;
    const fmtL = (num) => `₹${(parseFloat(num || 0) / 100000).toFixed(2)}L`;

    const calculateLoanDNA = (loan) => {
        const P = parseNum(loan.principal) || parseNum(loan.amount * 60) || 0;
        const R = parseNum(loan.interest_rate) || 10;
        const RemainingMonths = parseNum(loan.remaining_months) || 12;
        const Outstanding = parseNum(loan.outstanding) || P;
        const PrincipalPaid = Math.max(0, P - Outstanding);
        const FutureInterest = (Outstanding * (R / 100) * (RemainingMonths / 12));
        const PastInterest = Outstanding > 0 ? ((FutureInterest / Outstanding) * PrincipalPaid) : 0;

        return {
            principalPaid: PrincipalPaid,
            interestPaid: PastInterest,
            principalPending: Outstanding,
            interestPending: FutureInterest,
            totalCost: PrincipalPaid + PastInterest + Outstanding + FutureInterest,
            processingFees: parseNum(loan.processing_fee) || 0,
            interestRate: R,
            remainingMonths: RemainingMonths
        };
    };

    const generateAmortizationSchedule = (P, R, N) => {
        let balance = P;
        const schedule = [];
        const monthlyRate = (R / 12) / 100;
        const numerator = P * monthlyRate * Math.pow(1 + monthlyRate, N);
        const denominator = Math.pow(1 + monthlyRate, N) - 1;
        const standardEMI = denominator === 0 ? 0 : numerator / denominator;

        for (let month = 1; month <= N; month++) {
            const interest = balance * monthlyRate;
            const principal = standardEMI - interest;
            balance = Math.max(0, balance - principal);
            schedule.push({ month, principal, interest, balance, emi: standardEMI });
            if (balance <= 0) break;
        }
        return schedule;
    };

    const toggleSharingMode = (mode) => {
        if (mode === 'SOLO') setSharingConfig({ mode: 'SOLO', members: ['Me'], groupName: '' });
        if (mode === 'PARTNER') setSharingConfig({ mode: 'PARTNER', members: ['Me', 'Partner'], groupName: 'Partner & Me' });
        if (mode === 'GROUP') setSharingConfig({ mode: 'GROUP', members: ['Me', 'Ravi', 'Anjali'], groupName: 'Dokra Group' });
    };

    const addGroupMember = () => {
        if (newMemberName.trim()) {
            setSharingConfig(prev => ({ ...prev, members: [...prev.members, newMemberName], mode: 'GROUP' }));
            setNewMemberName('');
        }
    };

    const handleAddLoan = async () => {
        if (!newLoanAmount || !newLoanRate || !newLoanTenure) {
            alert('Please fill in all required fields');
            return;
        }

        const principal = parseNum(newLoanAmount);
        const rate = parseFloat(newLoanRate);
        const tenure = parseInt(newLoanTenure);

        let processingFee = 0;
        if (newLoanFee) {
            const feeValue = parseFloat(newLoanFee);
            processingFee = feeType === 'PERCENTAGE' ? (principal * feeValue) / 100 : feeValue;
        }

        const monthlyRate = (rate / 12) / 100;
        const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, tenure);
        const denominator = Math.pow(1 + monthlyRate, tenure) - 1;
        const emi = denominator === 0 ? 0 : numerator / denominator;

        const newLoanObj = {
            id: Date.now(),
            name: newLoanName || `New ${newLoanType === 'BANK' ? 'Bank' : 'Private'} Loan`,
            type: newLoanType,
            principal: principal,
            amount: emi,
            outstanding: principal,
            interest_rate: rate,
            remaining_months: tenure,
            rate: rate,
            tenure: tenure,
            processing_fee: processingFee,
            due_date: new Date().getDate(), // Default to today's day
            status: 'pending',
            loan_date: newLoanDate,
            emi_start_date: newEmiDate,
            transactions: []
        };

        const updatedEmis = [...emis, newLoanObj];
        setEmis(updatedEmis);
        await saveData(STORAGE_KEYS.EMIS, updatedEmis);

        // Schedule Notification
        // Notify 3 days before due date (simple approximation)
        // In real app, we'd use local notifications specific scheduling
        const dueDay = newLoanObj.due_date;
        // NotificationService.scheduleMonthlyReminder(...)

        setNewLoanAmount(''); setNewLoanRate(''); setNewLoanTenure(''); setNewLoanFee(''); setNewLoanName('');
        setFeeType('FIXED'); setNewLoanDate(''); setNewEmiDate('');
        setShowAddLoan(false);
    };



    const handlePayEMI = async (id) => {
        const updatedLoans = await EMIService.payEMI(id);
        setEmis(updatedLoans);
    };

    const handleDeleteEMI = async (id) => {
        const updatedLoans = await EMIService.deleteEMI(id);
        setEmis(updatedLoans);
        setModalVisible(false); // If there's a modal that triggers this
        setAmortizationVisible(false);
    }

    const openAmortization = (loan) => {
        setSelectedLoan(loan);
        setAmortizationVisible(true);
    };

    // Fix Memory Leak: Countdown Timer
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                let { d, h, m, s } = prev;
                s--;
                if (s < 0) { s = 59; m--; }
                if (m < 0) { m = 59; h--; }
                if (h < 0) { h = 23; d--; }
                if (d < 0) { d = 14; }
                return { d, h, m, s };
            });
        }, 1000);
        return () => clearInterval(timer); // Cleanup is crucial
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const totalMonthlyEMI = emis.reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
    const totalOutstanding = emis.reduce((sum, l) => sum + (parseFloat(l.outstanding) || 0), 0);
    const memberCount = sharingConfig.members.length;
    const filteredEmis = filterStatus === 'all' ? emis : emis.filter(emi => emi.status === filterStatus);
    const THEME_COLOR = '#F59E0B';
    const getStatusColor = (status) => {
        switch (status) {
            case 'paid': return '#10B981';
            case 'overdue': return '#EF4444';
            case 'pending': return '#F59E0B';
            default: return '#71717A';
        }
    };
    const getStatusIcon = (status) => (status === 'paid' ? CheckCircle : (status === 'overdue' ? AlertCircle : Clock));

    // Simulation Data
    const monthlyIncome = 150000;
    const currentDTI = (totalMonthlyEMI / monthlyIncome) * 100;
    const projectedCreditScore = simulateMissed ? 650 : 780;
    const scoreDrop = simulateMissed ? 130 : 0;
    const lateFees = simulateMissed ? emis.length * 750 : 0;
    const healthColor = currentDTI < 30 ? '#10B981' : (currentDTI < 50 ? '#F59E0B' : '#EF4444');


    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME_COLOR} colors={[THEME_COLOR]} progressBackgroundColor="#18181B" />
                }
                showsVerticalScrollIndicator={false}
            >
                <StackHeader title="EMIs" subtitle="Monthly Pipeline">
                    <TouchableOpacity
                        style={[styles.splitToggle, sharingConfig.mode !== 'SOLO' && { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' }]}
                        onPress={() => setShowSharingHub(true)}
                    >
                        <Users size={16} color={sharingConfig.mode !== 'SOLO' ? '#F59E0B' : '#71717A'} />
                        <Text style={[styles.splitText, sharingConfig.mode !== 'SOLO' && { color: '#F59E0B' }]}>
                            {sharingConfig.mode === 'SOLO' ? 'Solo Mode' : (sharingConfig.mode === 'PARTNER' ? 'Partner Mode' : `${sharingConfig.members.length} People`)}
                        </Text>
                    </TouchableOpacity>
                </StackHeader>

                {/* Hero Card */}
                <View style={[styles.heroCardWrapper, simulateMissed && { opacity: 0.8 }]}>
                    <View style={[styles.heroCard, simulateMissed && { borderColor: '#EF4444' }]}>
                        <LinearGradient
                            colors={simulateMissed ? ['#EF444440', '#00000000'] : [`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={[styles.heroLabel, simulateMissed && { color: '#EF4444' }]}>
                                    {simulateMissed ? 'MISSED PAYMENT CRISIS' : (sharingConfig.mode !== 'SOLO' ? `MY SHARE (${sharingConfig.groupName})` : 'NEXT DUE IN')}
                                </Text>
                                <View style={styles.liveBadge}><View style={styles.dot} /><Text style={styles.liveText}>LIVE</Text></View>
                            </View>

                            <View style={styles.timerRow}>
                                <View style={styles.timerBlock}><Text style={styles.timerVal}>{timeLeft.d}</Text><Text style={styles.timerUnit}>DAY</Text></View>
                                <Text style={styles.timerSep}>:</Text>
                                <View style={styles.timerBlock}><Text style={styles.timerVal}>{timeLeft.h}</Text><Text style={styles.timerUnit}>HR</Text></View>
                                <Text style={styles.timerSep}>:</Text>
                                <View style={styles.timerBlock}><Text style={styles.timerVal}>{timeLeft.m}</Text><Text style={styles.timerUnit}>MIN</Text></View>
                                <Text style={styles.timerSep}>:</Text>
                                <View style={styles.timerBlock}><Text style={[styles.timerVal, { color: THEME_COLOR }]}>{timeLeft.s}</Text><Text style={styles.timerUnit}>SEC</Text></View>
                            </View>

                            <View style={styles.heroFooter}>
                                <View style={[styles.heroIconBadge, simulateMissed && { backgroundColor: '#EF4444' }]}>
                                    {simulateMissed ? <AlertCircle size={14} color="#FFF" /> : <Clock size={14} color="#FFFFFF" strokeWidth={2.5} />}
                                </View>
                                <Text style={[styles.heroSubtext, simulateMissed && { color: '#EF4444' }]}>
                                    {simulateMissed ? `Late Fees Applied: ₹${lateFees}` : (sharingConfig.mode !== 'SOLO' ? `Total Liability: ₹${totalMonthlyEMI.toLocaleString()}` : `Total ₹${totalMonthlyEMI.toLocaleString()} due soon`)}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Simulators */}
                <View style={styles.simSection}>
                    <LuxuryCard style={styles.healthCard}>
                        <View style={styles.healthHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={[styles.iconBox, { backgroundColor: '#10B98120' }]}>
                                    <Shield size={20} color="#10B981" />
                                </View>
                                <View>
                                    <Text style={styles.healthTitle}>Credit Pulse</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={[styles.healthScore, { color: simulateMissed ? '#EF4444' : '#FFF' }]}>{projectedCreditScore}</Text>
                                        {simulateMissed && <Text style={{ color: '#EF4444', fontSize: 12, fontWeight: '700' }}>(-{scoreDrop})</Text>}
                                    </View>
                                </View>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.dtiLabel}>DTI Ratio</Text>
                                <Text style={[styles.dtiValue, { color: healthColor }]}>{currentDTI.toFixed(1)}%</Text>
                            </View>
                        </View>
                        <View style={styles.barBg}>
                            <View style={[styles.barFill, { width: `${Math.min(100, currentDTI)}%`, backgroundColor: healthColor }]} />
                        </View>
                        <Text style={styles.healthMsg}>
                            {currentDTI < 30 ? 'Excellent! Low debt stress.' : 'Warning: High debt obligation.'}
                        </Text>
                        <TouchableOpacity
                            style={[styles.simToggle, simulateMissed && { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}
                            onPress={() => setSimulateMissed(!simulateMissed)}
                        >
                            <AlertCircle size={16} color={simulateMissed ? '#EF4444' : '#71717A'} />
                            <Text style={[styles.simToggleText, simulateMissed && { color: '#EF4444' }]}>
                                {simulateMissed ? 'Simulating Missed Payment Impact' : 'Simulate Missed Payment?'}
                            </Text>
                        </TouchableOpacity>
                    </LuxuryCard>
                </View>

                {/* EMIs List */}
                <View style={styles.section}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <Text style={styles.sectionTitle}>Active EMIs</Text>
                        <FilterChips
                            options={[
                                { label: 'All', value: 'all' },
                                { label: 'Pending', value: 'pending' },
                                { label: 'Paid', value: 'paid' }
                            ]}
                            selected={filterStatus}
                            onSelect={setFilterStatus}
                            color={THEME_COLOR}
                        />
                    </View>

                    {filteredEmis.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Sparkles size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No EMIs found</Text>
                        </View>
                    ) : (
                        filteredEmis.map((emi, index) => {
                            const StatusIcon = getStatusIcon(emi.status);
                            const statusColor = getStatusColor(emi.status);
                            const displayAmount = parseFloat(emi.amount) / memberCount;

                            return (
                                <LuxuryCard
                                    key={index}
                                    index={index}
                                    style={styles.emiCard}
                                    onPress={() => setSelectedEMI(emi)}
                                >
                                    <View style={styles.cardIcon}>
                                        <Calendar size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                    </View>
                                    <View style={styles.cardContent}>
                                        <View style={styles.emiHeader}>
                                            <Text style={styles.emiName}>{emi.name}</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                                                <StatusIcon size={10} color={statusColor} strokeWidth={3} />
                                                <Text style={[styles.statusText, { color: statusColor }]}>
                                                    {emi.status?.toUpperCase()}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.dueDate}>Due on {emi.due_date}th</Text>
                                        <View style={styles.emiFooter}>
                                            <Text style={styles.remainingText}>{emi.remaining_months}m left</Text>
                                        </View>
                                    </View>
                                    <View style={styles.cardRight}>
                                        <Text style={styles.amount}>₹{displayAmount.toLocaleString('en-IN')}</Text>
                                        {/* Pay Now Button */}
                                        {emi.status !== 'paid' && (
                                            <TouchableOpacity
                                                style={{ marginTop: 8, backgroundColor: '#10B981', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                                                onPress={() => handlePayEMI(emi.id)}
                                            >
                                                <CheckCircle2 size={12} color="#000" />
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: '#000' }}>PAY NOW</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </LuxuryCard>
                            );
                        })
                    )}
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setShowAddLoan(true)}
                    index={emis.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Add New Loan</Text>
                </LuxuryCard>
            </ScrollView>

            {/* Modals */}
            <Modal visible={selectedEMI !== null} transparent animationType="slide" onRequestClose={() => setSelectedEMI(null)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <View>
                                <Text style={styles.modalTitle}>{selectedEMI?.name}</Text>
                                <Text style={styles.modalSubtitle}>Details & History</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedEMI(null)} style={styles.closeButton}><X size={24} color="#FFF" /></TouchableOpacity>
                        </View>
                        <ScrollView style={styles.modalScroll}>
                            {/* Stats */}
                            <View style={styles.modalStats}>
                                <View style={styles.modalStatItem}><Text style={styles.modalStatLabel}>Rate</Text><Text style={styles.modalStatValue}>{selectedEMI?.interest_rate}%</Text></View>
                                <View style={styles.modalStatItem}><Text style={styles.modalStatLabel}>Outstanding</Text><Text style={styles.modalStatValue}>{fmtL(selectedEMI?.outstanding)}</Text></View>
                            </View>

                            {/* History */}
                            <Text style={styles.historyTitle}>Payment History</Text>
                            {selectedEMI?.transactions?.length > 0 ? (
                                selectedEMI.transactions.map((t, i) => (
                                    <View key={i} style={styles.historyItem}>
                                        <View style={[styles.historyIcon, { backgroundColor: '#10B98115' }]}><CheckCircle size={16} color="#10B981" /></View>
                                        <View>
                                            <Text style={styles.historyMonth}>{t.month || new Date(t.date).toLocaleDateString()}</Text>
                                            <Text style={styles.historyDate}>{new Date(t.date).toLocaleDateString()}</Text>
                                        </View>
                                        <Text style={[styles.historyAmount, { marginLeft: 'auto' }]}>{fmt(t.amount)}</Text>
                                    </View>
                                ))
                            ) : (
                                <Text style={{ color: '#71717A', marginBottom: 20 }}>No payment history yet.</Text>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Add Loan Modal */}
            <Modal visible={showAddLoan} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddLoan(false)}>
                <View style={[styles.container, { paddingTop: 24 }]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>New Loan</Text>
                        <TouchableOpacity onPress={() => setShowAddLoan(false)} style={styles.closeButton}><X size={24} color="#FFF" /></TouchableOpacity>
                    </View>
                    <ScrollView style={styles.modalScroll}>
                        <Text style={styles.sectionLabel}>NAME</Text>
                        <TextInput style={styles.modalInput} placeholder="Home Loan" placeholderTextColor="#52525B" value={newLoanName} onChangeText={setNewLoanName} />

                        <View style={{ height: 16 }} />

                        <Text style={styles.sectionLabel}>AMOUNT</Text>
                        <TextInput style={styles.modalInput} placeholder="500000" placeholderTextColor="#52525B" keyboardType="numeric" value={newLoanAmount} onChangeText={setNewLoanAmount} />

                        <View style={{ height: 16 }} />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionLabel}>RATE (%)</Text>
                                <TextInput style={styles.modalInput} placeholder="10.5" placeholderTextColor="#52525B" keyboardType="numeric" value={newLoanRate} onChangeText={setNewLoanRate} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionLabel}>TENURE (M)</Text>
                                <TextInput style={styles.modalInput} placeholder="60" placeholderTextColor="#52525B" keyboardType="numeric" value={newLoanTenure} onChangeText={setNewLoanTenure} />
                            </View>
                        </View>

                        <View style={{ height: 32 }} />
                        <TouchableOpacity style={styles.hubSaveBtn} onPress={handleAddLoan}>
                            <Text style={styles.hubSaveText}>Confirm & Add</Text>
                        </TouchableOpacity>
                        <View style={{ height: 100 }} />
                    </ScrollView>
                </View>
            </Modal>

            {/* Sharing Hub Modal (Simplified) */}
            <Modal visible={showSharingHub} transparent animationType="fade" onRequestClose={() => setShowSharingHub(false)}>
                <View style={styles.hubOverlay}>
                    <View style={styles.hubContent}>
                        <Text style={styles.hubTitle}>Sharing Hub 🤝</Text>
                        {['SOLO', 'PARTNER', 'GROUP'].map(mode => (
                            <TouchableOpacity
                                key={mode}
                                style={[styles.modeChip, sharingConfig.mode === mode && { backgroundColor: '#F59E0B', borderColor: '#F59E0B' }, { marginBottom: 8 }]}
                                onPress={() => toggleSharingMode(mode)}
                            >
                                <Text style={[styles.modeText, sharingConfig.mode === mode && { color: '#000' }]}>{mode}</Text>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={[styles.hubSaveBtn, { marginTop: 16 }]} onPress={() => setShowSharingHub(false)}>
                            <Text style={styles.hubSaveText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    memberStack: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 4 },
    memberAvatar: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#18181B' },
    memberInitials: { fontSize: 10, fontWeight: '800', color: '#000' },
    sharedByText: { marginLeft: 8, fontSize: 11, color: '#A1A1AA', fontStyle: 'italic' },

    breakdownSection: { marginBottom: 24, backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05' },
    breakdownLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    memberAvatarSmall: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    memberInitialsSmall: { fontSize: 12, fontWeight: '700' },
    breakdownName: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    breakdownAmount: { color: '#FFF', fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },

    hubOverlay: { flex: 1, backgroundColor: '#00000095', justifyContent: 'center', padding: 24 },
    hubContent: { backgroundColor: '#18181B', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
    hubHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    hubTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    hubSubtitle: { fontSize: 13, color: '#A1A1AA', marginBottom: 24 },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    modeChip: { flex: 1, paddingVertical: 12, alignItems: 'center', backgroundColor: '#27272A', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10' },
    modeText: { fontSize: 12, fontWeight: '700', color: '#A1A1AA' },
    groupSection: { marginBottom: 24 },
    groupLabel: { fontSize: 12, color: '#71717A', fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
    membersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    memberTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#27272A', borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    memberTagText: { fontSize: 13, color: '#FFF' },
    addMemberRow: { flexDirection: 'row', gap: 8 },
    peerInput: { flex: 1, backgroundColor: '#000', borderRadius: 12, paddingHorizontal: 16, color: '#FFF', borderWidth: 1, borderColor: '#FFFFFF10', height: 48 },
    addPeerBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center' },
    hubSaveBtn: { backgroundColor: '#F59E0B', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    hubSaveText: { fontSize: 14, fontWeight: '700', color: '#000' },

    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 150 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    splitToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#27272A', borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10' },
    splitText: { fontSize: 11, fontWeight: '700', color: '#71717A' },
    splitSubtext: { fontSize: 10, color: '#F59E0B', fontWeight: '700', textAlign: 'right', marginTop: 2 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    emiCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: '#F59E0B10', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#F59E0B20' },
    cardContent: { flex: 1 },
    emiName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    dueDate: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end' },
    amount: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F59E0B08', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F59E0B15' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#F59E0B50' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#F59E0B', letterSpacing: 0.5 },
    statsRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginBottom: 24 },
    statCard: { flex: 1 },
    filterSection: { marginBottom: 24 },
    filterChips: { marginBottom: 0 },
    emiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
    emiFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    remainingText: { fontSize: 11, color: '#A1A1AA', fontWeight: '600' },
    outstandingText: { fontSize: 11, color: '#71717A', fontWeight: '600' },
    historyButton: { marginTop: 8, padding: 8, backgroundColor: '#18181B', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10' },
    modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#09090B', borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '80%', paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 24, borderBottomWidth: 1, borderBottomColor: '#FFFFFF08' },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    modalSubtitle: { fontSize: 13, color: '#71717A', marginTop: 4, fontWeight: '600' },
    closeButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    modalScroll: { padding: 24 },
    modalStats: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    modalStatItem: { flex: 1, backgroundColor: '#18181B', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    modalStatLabel: { fontSize: 11, color: '#A1A1AA', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    modalStatValue: { fontSize: 18, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    sectionLabel: { fontSize: 11, color: '#A1A1AA', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    modalInput: { backgroundColor: '#18181B', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFF', borderWidth: 1, borderColor: '#FFFFFF10', fontSize: 15, fontWeight: '600' },
    historyTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' },
    historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    historyIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    historyContent: { flex: 1 },
    historyMonth: { fontSize: 15, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    historyDate: { fontSize: 12, color: '#71717A', fontWeight: '500' },
    historyAmount: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    // Countdown & Sim Styles
    timerRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-start', gap: 6, marginBottom: 20 },
    timerBlock: { alignItems: 'center' },
    timerVal: { fontSize: 32, fontWeight: '900', color: '#FFF', lineHeight: 36, fontVariant: ['tabular-nums'] },
    timerUnit: { fontSize: 9, color: '#71717A', fontWeight: '700', marginTop: 2 },
    timerSep: { fontSize: 24, fontWeight: '700', color: '#71717A', marginBottom: 12 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#EF444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    liveText: { fontSize: 10, color: '#EF4444', fontWeight: '800' },

    simSection: { paddingHorizontal: 24, marginBottom: 24, gap: 16 },
    healthCard: { padding: 20, backgroundColor: '#18181B', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF08' },
    healthHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    healthTitle: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    healthScore: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    dtiLabel: { color: '#71717A', fontSize: 11, marginBottom: 2 },
    dtiValue: { fontSize: 16, fontWeight: '700' },
    barBg: { height: 6, backgroundColor: '#27272A', borderRadius: 3, overflow: 'hidden', marginBottom: 12 },
    barFill: { height: 100, borderRadius: 3 },
    healthMsg: { color: '#A1A1AA', fontSize: 13, marginBottom: 16 },
    simToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#27272A50', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10' },
    simToggleText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },

    prepayCard: { padding: 20, backgroundColor: '#18181B', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF08' },
    prepayHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    sliderContainer: { marginBottom: 16 },
    sliderLabel: { color: '#A1A1AA', fontSize: 13, marginBottom: 8 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#FFFFFF10', marginRight: 8 },
    chipText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    savingsResult: { backgroundColor: '#10B98110', padding: 12, borderRadius: 12, gap: 8, borderWidth: 1, borderColor: '#10B98120' },
    savingsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    savingsText: { color: '#A1A1AA', fontSize: 13 },
});
