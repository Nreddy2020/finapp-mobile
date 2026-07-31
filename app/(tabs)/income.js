import React, { useState, useEffect, useMemo } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { IndianRupee, DollarSign, Euro, PoundSterling, JapaneseYen, Plus, TrendingUp, Clock, Timer, Trash2, Edit3, BarChart3, X, Download, Eye, EyeOff, Globe, Settings, Activity, CloudRain, Sun, Car, Percent, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getIncome, getExpenses } from '../../services/api';
import { exportToCSV } from '../../utils/exportHelper';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import CelebrationOverlay from '../../components/ui/CelebrationOverlay';
import ProgressBar from '../../components/ui/ProgressBar';
import AddIncomeModal from '../../components/income/AddIncomeModal';
import { INCOME_CATEGORIES } from '../../components/income/IncomeCategorySelector';
import CareerSimulator from '../../components/income/CareerSimulator';
import FinancialFreedom from '../../components/income/FinancialFreedom';
import ToastNotification from '../../components/ui/ToastNotification';
import IncomeCategoryBreakdown from '../../components/income/IncomeCategoryBreakdown';
import IncomeForecast from '../../components/income/IncomeForecast';
import TaxEstimator from '../../components/income/TaxEstimator';
import EnhancedAnalytics from '../../components/income/EnhancedAnalytics';
import AccountsCarousel from '../../components/bank/AccountsCarousel';


import { useGlobalFinance } from '../../components/context/GlobalFinanceContext';

// Local helpers moved to Context or kept if UI specific but CURRENCIES is definitely removed

const SCENARIO_DATA = {
    promotion: { type: 'percent', val: 0.20 },
    side_hustle: { type: 'fixed', val: 25000 },
    new_skill: { type: 'yearly', val: 500000 },
};

const PAY_FREQUENCIES = [
    { id: 'monthly', label: 'Monthly' },
    { id: 'bi-weekly', label: 'Bi-Weekly' },
    { id: 'weekly', label: 'Weekly' }
];

import { saveData, loadData, STORAGE_KEYS } from '../../services/storage';
import { IncomeService } from '../../services/income';

export default function IncomeScreen() {
    const [income, setIncome] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Universal State (Now Global)
    const { currency, currencyCode, toggleCurrency, formatAmount, privacyMode, setPrivacyMode, inflationRate, setInflationRate, freedomGoal, marketReturnRate } = useGlobalFinance();
    const [payFrequency, setPayFrequency] = useState('monthly');
    const [settingsVisible, setSettingsVisible] = useState(false);

    // Scenario State
    const [isPotentialMode, setIsPotentialMode] = useState(false);
    const [activeScenarios, setActiveScenarios] = useState([]);
    const [scenarioValues, setScenarioValues] = useState({
        promotion: 0.20, // 20% default
        side_hustle: 25000,
        new_skill: 500000,
    });

    const [showNetIncome, setShowNetIncome] = useState(false); // Tax Estimator Toggle
    const [notification, setNotification] = useState({ visible: false, message: '', type: 'info' });
    const [celebrationVisible, setCelebrationVisible] = useState(false);
    const [celebrationMessage, setCelebrationMessage] = useState('');
    const [addIncomeVisible, setAddIncomeVisible] = useState(false);
    const [analyticsVisible, setAnalyticsVisible] = useState(false);
    const [analyticsTab, setAnalyticsTab] = useState('breakdown');
    const [isLive, setIsLive] = useState(true);
    const [sessionEarnings, setSessionEarnings] = useState(0); // Mock session earnings
    const [editingIncome, setEditingIncome] = useState(null);

    // Service
    // Service

    const fetchIncome = async () => {
        try {
            const data = await IncomeService.getIncomeSources();
            setIncome(data || []);
        } catch (error) {
            console.error('Error fetching income:', error);
            setIncome([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchIncome();
    }, []);

    // No need for separate persist effect as Service handles it

    // ... (Memo logic stays same) ...

    const totalMonthlyIncome = useMemo(() => (income || []).reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0), [income]);
    const displayedIncome = isPotentialMode ? totalMonthlyIncome * (1 + scenarioValues.promotion) + scenarioValues.side_hustle : totalMonthlyIncome;

    useEffect(() => {
        if (!isLive) return;
        const interval = setInterval(() => {
            // Simulate earning per second (Approx for 1L/month = ~0.04/sec)
            const incomePerSecond = totalMonthlyIncome / (30 * 24 * 3600);
            setSessionEarnings(prev => prev + incomePerSecond);
        }, 1000);
        return () => clearInterval(interval);
    }, [isLive, totalMonthlyIncome]);

    return (
        <AnimatedScreen style={styles.container}>
            {/* Header */}
            <StackHeader title="Income" subtitle="Earnings">
                <View style={styles.headerControls}>
                    <TouchableOpacity onPress={() => setSettingsVisible(true)} style={[styles.iconButton, settingsVisible && styles.activeBtn]}>
                        <Settings size={20} color={settingsVisible ? '#F59E0B' : '#FFFFFF'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleCurrency} style={styles.iconButton}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#10B981' }}>{currency?.symbol || '₹'}</Text>
                        <Text style={styles.currencyCode}>{currencyCode}</Text>
                    </TouchableOpacity>
                </View>
            </StackHeader>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchIncome} tintColor="#10B981" />}
            >
                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={isPotentialMode ? ['#F59E0B60', '#F59E0B00'] : ['#10B98160', '#10B98100']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.heroLabel}>{isPotentialMode ? 'Potential Income' : 'Total Monthly Income'}</Text>
                                {isPotentialMode && (
                                    <View style={styles.scenarioBadge}>
                                        <Text style={styles.scenarioText}>SIMULATION</Text>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.heroAmount}>{formatAmount ? formatAmount(displayedIncome) : `₹${displayedIncome}`}</Text>

                            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                                <View style={styles.paydayBadge}>
                                    <Clock size={12} color="#10B981" />
                                    <Text style={styles.paydayText}>Payday in 12 days</Text>
                                </View>
                                <TouchableOpacity onPress={() => setIsPotentialMode(!isPotentialMode)} style={[styles.paydayBadge, { borderColor: '#F59E0B40', backgroundColor: '#F59E0B10' }]}>
                                    <Sparkles size={12} color="#F59E0B" />
                                    <Text style={[styles.paydayText, { color: '#F59E0B' }]}>Simulate Potential</Text>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setAnalyticsVisible(true)} style={[styles.paydayBadge, { borderColor: '#3B82F640', backgroundColor: '#3B82F610' }]}>
                                    <Activity size={12} color="#3B82F6" />
                                    <Text style={[styles.paydayText, { color: '#3B82F6' }]}>Analytics</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Live Ticker */}
                <View style={styles.liveTickerWrapper}>
                    <View style={styles.liveTickerCard}>
                        <View style={styles.liveTickerIcon}>
                            <Timer size={20} color="#10B981" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.liveTickerLabel}>Session Earnings</Text>
                            <Text style={styles.liveTickerValue}>+{formatAmount(sessionEarnings)}</Text>
                        </View>
                        <View style={styles.liveIndicator}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>
                </View>

                {/* Financial Freedom Progress */}
                <View style={{ marginHorizontal: 24, marginBottom: 24 }}>
                    <View style={styles.progressLabelRow}>
                        <Text style={styles.progressLabel}>Financial Freedom Goal</Text>
                        <Text style={styles.progressValue}>15%</Text>
                    </View>
                    <ProgressBar progress={0.15} color="#10B981" />
                </View>

                {/* Income List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Income Sources</Text>
                    {income.length === 0 ? (
                        <Text style={{ color: '#71717A', textAlign: 'center', marginTop: 20 }}>No income sources added.</Text>
                    ) : (
                        income.map((item, index) => (
                            <LuxuryCard
                                key={item.id || index}
                                style={[styles.incomeCard, item.isNew && styles.newIncomeCard]}
                                delay={index * 100}
                                onPress={() => {
                                    setEditingIncome(item);
                                    setAddIncomeVisible(true);
                                }}
                            >
                                <View style={styles.sourceRow}>
                                    <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center' }}>
                                        <DollarSign size={20} color="#10B981" />
                                    </View>
                                    <View style={styles.cardContent}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                            <Text style={styles.sourceName}>{item.name}</Text>
                                            {item.isNew && (
                                                <View style={styles.newBadge}>
                                                    <Text style={styles.newBadgeText}>NEW</Text>
                                                </View>
                                            )}
                                        </View>
                                        <Text style={{ color: '#71717A', fontSize: 12 }}>{item.frequency || 'Monthly'}</Text>
                                    </View>
                                    <Text style={styles.amount}>{formatAmount(item.amount)}</Text>
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                <AccountsCarousel />

            </ScrollView>

            <TouchableOpacity style={styles.fab} onPress={() => setAddIncomeVisible(true)}>
                <LinearGradient colors={['#10B981', '#059669']} style={styles.fabGradient}>
                    <Plus size={24} color="#FFF" />
                </LinearGradient>
            </TouchableOpacity>

            <AddIncomeModal
                visible={addIncomeVisible}
                onClose={() => {
                    setAddIncomeVisible(false);
                    setEditingIncome(null);
                }}
                editingIncome={editingIncome}
                onSave={async (newIncome) => {
                    let updatedIncome;
                    if (editingIncome) {
                        updatedIncome = await IncomeService.updateIncome(newIncome);
                        setCelebrationMessage('Income Updated!');
                    } else {
                        updatedIncome = await IncomeService.addIncome(newIncome);
                        setCelebrationMessage('New Income Added!');
                    }

                    setIncome(updatedIncome);
                    setCelebrationVisible(true);
                    setAddIncomeVisible(false);
                    setEditingIncome(null);
                }}
                onDelete={async (id) => {
                    const updatedIncome = await IncomeService.deleteIncome(id);
                    setIncome(updatedIncome);
                    setAddIncomeVisible(false);
                    setEditingIncome(null);
                    setNotification({ visible: true, message: 'Income Deleted', type: 'info' });
                }}
            />

            {/* Analytics Modal */}
            <Modal visible={analyticsVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { maxHeight: '90%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Income Analytics</Text>
                            <TouchableOpacity onPress={() => setAnalyticsVisible(false)} style={styles.closeIconButton}>
                                <X size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        {/* Analytics Tabs */}
                        <View style={styles.tabsContainer}>
                            <TouchableOpacity
                                style={[styles.tab, analyticsTab === 'breakdown' && styles.tabActive]}
                                onPress={() => setAnalyticsTab('breakdown')}
                            >
                                <Text style={[styles.tabText, analyticsTab === 'breakdown' && styles.tabTextActive]}>Breakdown</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, analyticsTab === 'forecast' && styles.tabActive]}
                                onPress={() => setAnalyticsTab('forecast')}
                            >
                                <Text style={[styles.tabText, analyticsTab === 'forecast' && styles.tabTextActive]}>Forecast</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, analyticsTab === 'tax' && styles.tabActive]}
                                onPress={() => setAnalyticsTab('tax')}
                            >
                                <Text style={[styles.tabText, analyticsTab === 'tax' && styles.tabTextActive]}>Tax</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, analyticsTab === 'insights' && styles.tabActive]}
                                onPress={() => setAnalyticsTab('insights')}
                            >
                                <Text style={[styles.tabText, analyticsTab === 'insights' && styles.tabTextActive]}>Insights</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.analyticsScroll} showsVerticalScrollIndicator={false}>
                            {analyticsTab === 'breakdown' && (
                                <IncomeCategoryBreakdown
                                    income={income}
                                    currency={currency}
                                    formatAmount={formatAmount}
                                />
                            )}
                            {analyticsTab === 'forecast' && (
                                <IncomeForecast
                                    income={income}
                                    currency={currency}
                                    formatAmount={formatAmount}
                                />
                            )}
                            {analyticsTab === 'tax' && (
                                <TaxEstimator
                                    income={income}
                                    currency={currency}
                                    formatAmount={formatAmount}
                                    customTotalIncome={isPotentialMode ? displayedIncome : undefined}
                                />
                            )}
                            {analyticsTab === 'insights' && (
                                <EnhancedAnalytics
                                    income={income}
                                    expenses={expenses}
                                    currency={currency}
                                    formatAmount={formatAmount}
                                />
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, flexDirection: 'row', justifyContent: 'space-between' },
    headerLabel: { color: '#71717A', fontWeight: '700', letterSpacing: 1 },
    title: { fontSize: 36, fontWeight: '900', color: '#FFF' },
    headerControls: { flexDirection: 'row', gap: 12 },
    iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#18181B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    activeBtn: { borderColor: '#F59E0B', backgroundColor: '#F59E0B10' },
    currencyCode: { fontSize: 10, position: 'absolute', bottom: -12, color: '#10B981', fontWeight: '700' },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 24 },
    heroCard: { borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { color: '#A1A1AA', fontWeight: '700', textTransform: 'uppercase' },
    scenarioBadge: { position: 'absolute', right: 0, top: 0, backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    paydayBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#10B98140' },
    paydayText: { fontSize: 11, color: '#10B981', fontWeight: '700' },
    scenarioText: { fontSize: 10, fontWeight: '800', color: '#000' },
    heroAmount: { fontSize: 42, fontWeight: '900', color: '#FFF', marginVertical: 16 },
    gainText: { color: '#F59E0B', fontWeight: '700', fontSize: 13 },
    progressContainer: { marginBottom: 24 },
    progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    progressLabel: { fontSize: 12, color: '#71717A', fontWeight: '600' },
    progressValue: { fontSize: 12, color: '#FFFFFF', fontWeight: '700' },
    liveTickerWrapper: { marginHorizontal: 24, marginBottom: 32 },
    liveTickerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10', gap: 16 },
    liveTickerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#10B98120', justifyContent: 'center', alignItems: 'center' },
    liveTickerLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    liveTickerValue: { fontSize: 20, color: '#10B981', fontWeight: '700' },
    liveIndicator: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    liveText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
    section: { paddingHorizontal: 24, paddingBottom: 100 },
    sectionTitle: { color: '#71717A', fontWeight: '700', marginBottom: 16, textTransform: 'uppercase' },
    incomeCard: { padding: 20, marginBottom: 12, backgroundColor: '#18181B' },
    newIncomeCard: { borderColor: '#10B98150', backgroundColor: '#10B98105' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 100, opacity: 0.5 },
    cardContent: { flex: 1, marginLeft: 16 }, // Adjusted layout for icon
    sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    sourceName: { color: '#FFF', fontWeight: '600', fontSize: 16 },
    newBadge: { backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    newBadgeText: { fontSize: 8, fontWeight: '800', color: '#000' },
    amount: { color: '#10B981', fontWeight: '700', fontSize: 16 },
    fab: { position: 'absolute', right: 24, bottom: 24, width: 56, height: 56, borderRadius: 28, elevation: 8 },
    fabGradient: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 28 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { width: '100%', backgroundColor: '#18181B', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
    closeIconButton: { padding: 4, backgroundColor: '#FFFFFF10', borderRadius: 20 },
    modalLabel: { fontSize: 12, color: '#A1A1AA', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    pillsRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
    pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#FFFFFF10' },
    pillActive: { backgroundColor: '#10B98120', borderColor: '#10B981' },
    pillText: { fontSize: 14, color: '#A1A1AA', fontWeight: '600' },
    pillTextActive: { color: '#10B981' },
    closeButton: { backgroundColor: '#10B981', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    closeButtonText: { color: '#000000', fontWeight: 'bold', fontSize: 16 },
    tabsContainer: { flexDirection: 'row', marginBottom: 16, backgroundColor: '#27272A', padding: 4, borderRadius: 12 },
    tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    tabActive: { backgroundColor: '#18181B' },
    tabText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '700' },
    analyticsScroll: { maxHeight: 500 }
});
