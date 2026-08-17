/**
 * MoneyFlowView.js
 * 
 * WORLD-CLASS PERSONAL FINANCIAL DECISION ASSISTANT
 * Flow: Money Flow → Financial Truth → Health → What Matters → Action → What-If → Decision
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'expo-router';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    TextInput,
    Alert,
    Dimensions,
    Pressable,
    FlatList
} from 'react-native';
import * as Haptics from 'expo-haptics';
import {
    Calendar,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    TrendingUp,
    TrendingDown,
    Shield,
    Sparkles,
    ArrowUpRight,
    ArrowRight,
    Info,
    CheckCircle2,
    Clock,
    Plus,
    X,
    Utensils,
    Plane,
    ShoppingBag,
    MoreHorizontal,
    Search,
    Filter,
    Check,
    Repeat,
    AlertTriangle,
    Eye,
    Landmark,
    Building2,
    DollarSign,
    Layers,
    ArrowLeftRight,
    FileText
} from 'lucide-react-native';

import {
    getPeriodBounds,
    DEFAULT_AUTHORITATIVE_ACCOUNTS,
    computeEmergencyReserve,
    DEFAULT_ESSENTIAL_BURN_BREAKDOWN,
    computeEmergencyRunwayMetrics,
    computePeriodCashFlowTruth,
    runAuthoritativeWhatIfSimulation,
    getUpcomingOutflows,
    getHistoricalCashFlowTrend,
    normalizeMerchant
} from './moneyFlowPresentationAdapter';

import { formatCurrencyINR, formatCompactCurrencyINR } from '../../components/investments/decisionPresentationAdapter';

const { width } = Dimensions.get('window');

export default function MoneyFlowView({
    transactions = [],
    onAddTransaction,
    onCategorizeTransaction,
    onDeleteTransaction,
    asOfDate = '2026-08-17T00:00:00.000Z'
}) {
    const router = useRouter();

    const safeHaptic = (type = 'light') => {
        try {
            if (type === 'success') {
                Haptics.notificationAsync?.(Haptics.NotificationFeedbackType.Success)?.catch(() => {});
            } else if (type === 'medium') {
                Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Medium)?.catch(() => {});
            } else {
                Haptics.impactAsync?.(Haptics.ImpactFeedbackStyle.Light)?.catch(() => {});
            }
        } catch (e) {}
    };

    // ── 1. ACTIVE STATE ──────────────────────────────────────────────────────
    const [periodType, setPeriodType] = useState('month'); // 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
    const [referenceDate, setReferenceDate] = useState(asOfDate);
    const [customRange, setCustomRange] = useState({ start: '2026-08-01', end: '2026-08-17' });
    const [customStartDateInput, setCustomStartDateInput] = useState('2026-08-01');
    const [customEndDateInput, setCustomEndDateInput] = useState('2026-08-17');
    const [selectedYear, setSelectedYear] = useState(2026);

    const MONTH_LABELS = [
        { key: 0, short: 'Jan', name: 'January' },
        { key: 1, short: 'Feb', name: 'February' },
        { key: 2, short: 'Mar', name: 'March' },
        { key: 3, short: 'Apr', name: 'April' },
        { key: 4, short: 'May', name: 'May' },
        { key: 5, short: 'Jun', name: 'June' },
        { key: 6, short: 'Jul', name: 'July' },
        { key: 7, short: 'Aug', name: 'August' },
        { key: 8, short: 'Sep', name: 'September' },
        { key: 9, short: 'Oct', name: 'October' },
        { key: 10, short: 'Nov', name: 'November' },
        { key: 11, short: 'Dec', name: 'December' }
    ];

    const [designatedAccountIds, setDesignatedAccountIds] = useState(['acc_hdfc_sb', 'acc_sbi_sb']);
    const [accounts, setAccounts] = useState(DEFAULT_AUTHORITATIVE_ACCOUNTS);

    // Filter & Search
    const [feedSearch, setFeedSearch] = useState('');
    const [feedFilter, setFeedFilter] = useState('ALL'); // 'ALL' | 'NEEDS_SORT' | 'INCOME' | 'EXPENSE' | 'TRANSFER'

    // Active Tab in "Where Is My Money?"
    const [breakdownTab, setBreakdownTab] = useState('category'); // 'category' | 'merchant' | 'account'
    const [selectedMerchantDetail, setSelectedMerchantDetail] = useState(null);

    // Modals
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showMathModal, setShowMathModal] = useState(false);
    const [showDesignateModal, setShowDesignateModal] = useState(false);
    const [showWhatIfModal, setShowWhatIfModal] = useState(false);
    const [showLoggerModal, setShowLoggerModal] = useState(false);
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);
    const [showNeedsSortInbox, setShowNeedsSortInbox] = useState(false);
    const [showTrendModal, setShowTrendModal] = useState(false);

    // Simulation Slider State
    const [simulationAmount, setSimulationAmount] = useState(30000);

    // Logger Form State
    const [txType, setTxType] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME' | 'TRANSFER'
    const [txDesc, setTxDesc] = useState('');
    const [txAmount, setTxAmount] = useState('');
    const [txCategory, setTxCategory] = useState('Food');
    const [txAccount, setTxAccount] = useState('HDFC Savings Account');
    const [txToAccount, setTxToAccount] = useState('ICICI Current Account');
    const [txMerchant, setTxMerchant] = useState('');
    const [txDate, setTxDate] = useState('2026-08-17');
    const [txIsRecurring, setTxIsRecurring] = useState(false);

    // ── 2. COMPUTED FINANCIAL VIEWMODELS ─────────────────────────────────────
    const periodBounds = useMemo(() => {
        return getPeriodBounds(periodType, referenceDate, customRange.start, customRange.end);
    }, [periodType, referenceDate, customRange]);

    const reserveData = useMemo(() => {
        return computeEmergencyReserve(accounts, designatedAccountIds);
    }, [accounts, designatedAccountIds]);

    const runwayMetrics = useMemo(() => {
        return computeEmergencyRunwayMetrics(reserveData.currentReserve, DEFAULT_ESSENTIAL_BURN_BREAKDOWN);
    }, [reserveData.currentReserve]);

    const cashFlowTruth = useMemo(() => {
        return computePeriodCashFlowTruth(transactions, periodBounds);
    }, [transactions, periodBounds]);

    const simulationResult = useMemo(() => {
        return runAuthoritativeWhatIfSimulation({
            allocationAmount: simulationAmount,
            currentReserve: reserveData.currentReserve,
            essentialMonthlyBurn: runwayMetrics.essentialMonthlyBurn,
            asOfDate
        });
    }, [simulationAmount, reserveData.currentReserve, runwayMetrics.essentialMonthlyBurn, asOfDate]);

    const upcomingData = useMemo(() => getUpcomingOutflows(), []);
    const trendData = useMemo(() => getHistoricalCashFlowTrend(), []);

    // ── 3. FILTERED & GROUPED FEED ───────────────────────────────────────────
    const processedFeed = useMemo(() => {
        let list = cashFlowTruth.filteredTransactions;

        if (feedFilter === 'NEEDS_SORT') {
            list = list.filter(t => t.needsSort);
        } else if (feedFilter === 'INCOME') {
            list = list.filter(t => t.type === 'INCOME');
        } else if (feedFilter === 'EXPENSE') {
            list = list.filter(t => t.type === 'EXPENSE');
        } else if (feedFilter === 'TRANSFER') {
            list = list.filter(t => t.type === 'TRANSFER');
        }

        if (feedSearch.trim()) {
            const q = feedSearch.toLowerCase();
            list = list.filter(t =>
                t.rawDescription.toLowerCase().includes(q) ||
                t.merchant.toLowerCase().includes(q) ||
                t.category.toLowerCase().includes(q) ||
                String(t.amount).includes(q)
            );
        }

        // Group by Date
        const groups = {};
        for (const t of list) {
            const d = t.date || '2026-08-17';
            if (!groups[d]) groups[d] = [];
            groups[d].push(t);
        }

        return Object.entries(groups).map(([date, txList]) => ({
            date,
            txList
        }));
    }, [cashFlowTruth.filteredTransactions, feedFilter, feedSearch]);

    // ── 4. HANDLERS ──────────────────────────────────────────────────────────
    const handleAddTransaction = () => {
        if (!txDesc.trim() || !txAmount || isNaN(Number(txAmount))) {
            Alert.alert('Invalid Entry', 'Please provide a valid description and amount.');
            return;
        }

        const amt = Number(txAmount);
        const newTx = {
            id: `tx_${Date.now()}`,
            description: txDesc.trim(),
            amount: amt,
            type: txType,
            category: txType === 'TRANSFER' ? 'Transfer' : txCategory,
            account: txAccount,
            toAccount: txType === 'TRANSFER' ? txToAccount : null,
            merchant: txMerchant ? normalizeMerchant(txMerchant) : normalizeMerchant(txDesc),
            date: txDate,
            isRecurring: txIsRecurring,
            needsSort: false
        };

        if (onAddTransaction) {
            onAddTransaction(newTx);
        }

        setShowLoggerModal(false);
        setTxDesc('');
        setTxAmount('');
        setTxMerchant('');
        safeHaptic('success');
        Alert.alert('Transaction Logged', `${txType === 'TRANSFER' ? 'Transfer' : txType === 'INCOME' ? 'Income' : 'Expense'} of ₹${amt.toLocaleString()} recorded successfully.`);
    };

    const handleToggleAccountDesignation = (accId) => {
        setDesignatedAccountIds(prev => {
            if (prev.includes(accId)) {
                if (prev.length === 1) {
                    Alert.alert('Warning', 'You must have at least one designated liquid account for Emergency Reserve.');
                    return prev;
                }
                return prev.filter(id => id !== accId);
            } else {
                return [...prev, accId];
            }
        });
        safeHaptic('light');
    };

    const handleApplyCategoryToAllSimilar = (merchantName, categoryName) => {
        if (onCategorizeTransaction) {
            cashFlowTruth.filteredTransactions.forEach(t => {
                if (t.merchant === merchantName && t.needsSort) {
                    onCategorizeTransaction(t.id, categoryName);
                }
            });
        }
        safeHaptic('success');
        Alert.alert('Bulk Categorization', `Assigned "${categoryName}" to all transactions from ${merchantName}.`);
    };

    const handleApplyCustomRange = (start = customStartDateInput, end = customEndDateInput) => {
        const s = start.trim() || '2026-08-01';
        const e = end.trim() || '2026-08-17';
        setCustomRange({ start: s, end: e });
        setPeriodType('custom');
        setShowPeriodModal(false);
        safeHaptic('success');
        Alert.alert('Timeframe Updated', `Displaying cash flow from ${s} to ${e}.`);
    };

    const handleSelectPeriodPreset = (type, customDates = null) => {
        if (type === 'custom' && customDates) {
            setCustomStartDateInput(customDates.start);
            setCustomEndDateInput(customDates.end);
            setCustomRange(customDates);
            setPeriodType('custom');
        } else {
            setPeriodType(type);
        }
        setShowPeriodModal(false);
        safeHaptic('light');
    };

    const handleSelectSpecificMonth = (monthIndex, year = selectedYear) => {
        const monthNum = String(monthIndex + 1).padStart(2, '0');
        const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
        const start = `${year}-${monthNum}-01`;
        const end = `${year}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
        setCustomStartDateInput(start);
        setCustomEndDateInput(end);
        setCustomRange({ start, end });
        setPeriodType('custom');
        setShowPeriodModal(false);
        safeHaptic('success');
        Alert.alert('Month Selected', `Displaying cash flow for ${MONTH_LABELS[monthIndex].name} ${year}.`);
    };

    return (
        <View style={styles.container}>
            {/* ── HEADER & PERIOD SELECTOR ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.headerTitle}>Money Flow</Text>
                    <Text style={styles.headerSubtitle}>Live cash flow powering your financial decisions</Text>
                </View>

                {/* Period Selector Dropdown Trigger */}
                <TouchableOpacity
                    style={styles.periodPill}
                    onPress={() => setShowPeriodModal(true)}
                >
                    <Calendar size={13} color="#818CF8" />
                    <Text style={styles.periodPillText}>{periodBounds.periodSubtitle}</Text>
                    <ChevronDown size={13} color="#818CF8" />
                </TouchableOpacity>
            </View>

            {/* ── 2. PERIOD CASH FLOW HERO CARD ── */}
            <View style={styles.heroCard}>
                <View style={styles.heroHeaderRow}>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>PERIOD CASH FLOW ({periodBounds.label})</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.trendTriggerBtn}
                        onPress={() => setShowTrendModal(true)}
                    >
                        <TrendingUp size={13} color="#818CF8" />
                        <Text style={styles.trendTriggerText}>6M Trend</Text>
                    </TouchableOpacity>
                </View>

                {/* 3-Column Period Numbers */}
                <View style={styles.heroMetricsGrid}>
                    <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>Total Income</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Text style={styles.incomeValue}>{cashFlowTruth.totalIncomeFormatted}</Text>
                            <TrendingUp size={12} color="#10B981" />
                        </View>
                    </View>

                    <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>Total Spending</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Text style={styles.expenseValue}>{cashFlowTruth.totalSpendingFormatted}</Text>
                            <TrendingDown size={12} color="#EF4444" />
                        </View>
                    </View>

                    <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>Net Cash Flow</Text>
                        <Text style={[styles.netFlowValue, { color: cashFlowTruth.netCashFlow >= 0 ? '#10B981' : '#EF4444' }]}>
                            {cashFlowTruth.netCashFlowFormatted}
                        </Text>
                    </View>
                </View>

                {/* Dynamic Surplus / Cash Flow Status Banner */}
                {(() => {
                    const isZeroActivity = cashFlowTruth.totalIncome === 0 && cashFlowTruth.totalSpending === 0;
                    const isPureExpense = cashFlowTruth.totalIncome === 0 && cashFlowTruth.totalSpending > 0;
                    const isPureIncome = cashFlowTruth.totalIncome > 0 && cashFlowTruth.totalSpending === 0;
                    const isSurplus = cashFlowTruth.netCashFlow > 0;
                    const isDeficit = cashFlowTruth.netCashFlow < 0;

                    let bannerText = 'No cash activity recorded for this period.';
                    let bannerStyle = styles.surplusBannerNeutral;
                    let textStyle = styles.surplusBannerTextNeutral;

                    if (isZeroActivity) {
                        bannerText = 'No cash transactions recorded for this period yet.';
                        bannerStyle = styles.surplusBannerNeutral;
                        textStyle = styles.surplusBannerTextNeutral;
                    } else if (isPureIncome) {
                        bannerText = `100% savings rate! ${cashFlowTruth.totalIncomeFormatted} income preserved as surplus.`;
                        bannerStyle = styles.surplusBannerPositive;
                        textStyle = styles.surplusBannerTextPositive;
                    } else if (isPureExpense) {
                        bannerText = `Net deficit of ${cashFlowTruth.totalSpendingFormatted} (No income logged this period).`;
                        bannerStyle = styles.surplusBannerNegative;
                        textStyle = styles.surplusBannerTextNegative;
                    } else if (isSurplus) {
                        bannerText = `Surplus is healthy! ${cashFlowTruth.savingsRate}% savings rate this period.`;
                        bannerStyle = styles.surplusBannerPositive;
                        textStyle = styles.surplusBannerTextPositive;
                    } else if (isDeficit) {
                        bannerText = `Deficit detected this period. Spending exceeded income.`;
                        bannerStyle = styles.surplusBannerNegative;
                        textStyle = styles.surplusBannerTextNegative;
                    } else {
                        bannerText = 'Broke even: Income exactly matches spending this period.';
                        bannerStyle = styles.surplusBannerNeutral;
                        textStyle = styles.surplusBannerTextNeutral;
                    }

                    return (
                        <View style={[styles.surplusBannerBase, bannerStyle]}>
                            <Text style={[styles.surplusBannerTextBase, textStyle]}>
                                {bannerText}
                            </Text>
                        </View>
                    );
                })()}
            </View>

            {/* ── 3. TRANSPARENT EMERGENCY RESERVE CARD ── */}
            {/* ── 3. UNIFIED EMERGENCY RUNWAY & PERSONAL CFO INTELLIGENCE CARD ── */}
            <View style={styles.cfoCard}>
                {/* Header Row: Emergency Reserve & Runway + Status Badge */}
                <View style={styles.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Shield size={16} color="#818CF8" />
                        <Text style={styles.emergencyTitle}>🛡 Emergency Reserve & Runway</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${runwayMetrics.statusColor}20`, borderColor: runwayMetrics.statusColor }]}>
                        <Text style={[styles.statusBadgeText, { color: runwayMetrics.statusColor }]}>
                            {runwayMetrics.statusLabel}
                        </Text>
                    </View>
                </View>

                {/* Expose Reserve vs Burn Formula Inputs */}
                <View style={styles.emergencyStatsRow}>
                    <View style={styles.emergencyStatItem}>
                        <Text style={styles.emergencyStatLabel}>Designated Reserve</Text>
                        <Text style={styles.emergencyStatVal}>{runwayMetrics.currentReserveFormatted}</Text>
                        <Text style={styles.emergencyStatSub}>{reserveData.designatedAccounts.length} accounts</Text>
                    </View>

                    <View style={styles.mathSignCol}>
                        <Text style={styles.mathSignText}>÷</Text>
                    </View>

                    <View style={styles.emergencyStatItem}>
                        <Text style={styles.emergencyStatLabel}>Essential Monthly Burn</Text>
                        <Text style={styles.emergencyStatVal}>{runwayMetrics.essentialMonthlyBurnFormatted}</Text>
                        <Text style={styles.emergencyStatSub}>Rent, EMIs, Food</Text>
                    </View>

                    <View style={styles.mathSignCol}>
                        <Text style={styles.mathSignText}>=</Text>
                    </View>

                    <View style={styles.emergencyStatItem}>
                        <Text style={styles.emergencyStatLabel}>Emergency Runway</Text>
                        <Text style={[styles.emergencyStatVal, { color: runwayMetrics.statusColor }]}>
                            {runwayMetrics.runwayMonths} mo
                        </Text>
                        <Text style={styles.emergencyStatSub}>Target: 3–6 mo</Text>
                    </View>
                </View>

                {/* Progress Bar & Shortfall */}
                <View style={styles.runwayProgressTrack}>
                    <View
                        style={[
                            styles.runwayProgressBar,
                            {
                                width: `${Math.min(100, (runwayMetrics.runwayMonths / 6) * 100)}%`,
                                backgroundColor: runwayMetrics.statusColor
                            }
                        ]}
                    />
                </View>

                {runwayMetrics.shortfall > 0 && (
                    <View style={styles.shortfallRow}>
                        <AlertTriangle size={13} color="#F59E0B" />
                        <Text style={styles.shortfallText}>
                            Shortfall to Minimum 3M Target: <Text style={{ fontWeight: '800', color: '#FFF' }}>{runwayMetrics.shortfallFormatted}</Text>
                        </Text>
                    </View>
                )}

                {/* Action CTAs: See Math & Designate Accounts */}
                <View style={styles.emergencyBtnRow}>
                    <TouchableOpacity
                        style={styles.mathExplanationBtn}
                        onPress={() => setShowMathModal(true)}
                    >
                        <Info size={13} color="#818CF8" />
                        <Text style={styles.mathExplanationBtnText}>See Calculation Math</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.designateBtn}
                        onPress={() => setShowDesignateModal(true)}
                    >
                        <Building2 size={13} color="#A1A1AA" />
                        <Text style={styles.designateBtnText}>Designate Accounts</Text>
                    </TouchableOpacity>
                </View>

                {/* Embedded Divider */}
                <View style={styles.mergedSectionDivider} />

                {/* Personal CFO Intelligence Sub-section */}
                <View style={styles.cfoHeaderRow}>
                    <Sparkles size={14} color="#818CF8" />
                    <Text style={styles.cfoHeaderLabel}>PERSONAL CFO INTELLIGENCE</Text>
                </View>

                <Text style={styles.cfoPriorityTitle}>🏅 Your #1 Priority Right Now</Text>
                <Text style={styles.cfoPriorityDesc}>
                    Increase emergency reserve to achieve 3-month peace of mind and lower liquidity stress.
                </Text>

                <View style={styles.tagPillRow}>
                    <View style={[styles.tagPill, { backgroundColor: '#F59E0B15', borderColor: '#F59E0B40' }]}>
                        <Text style={[styles.tagPillText, { color: '#F59E0B' }]}>High Impact</Text>
                    </View>
                    <View style={[styles.tagPill, { backgroundColor: '#0EA5E915', borderColor: '#0EA5E940' }]}>
                        <Text style={[styles.tagPillText, { color: '#38BDF8' }]}>Liquidity</Text>
                    </View>
                    <View style={[styles.tagPill, { backgroundColor: '#10B98115', borderColor: '#10B98140' }]}>
                        <Text style={[styles.tagPillText, { color: '#10B981' }]}>Low Effort</Text>
                    </View>
                </View>

                <View style={styles.cfoMetricsRow}>
                    <View style={styles.cfoMetricBox}>
                        <Text style={styles.cfoMetricLabel}>Health Score</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Text style={styles.cfoMetricScore}>72.8 / 100</Text>
                            <View style={styles.gradeBadge}>
                                <Text style={styles.gradeBadgeText}>B</Text>
                            </View>
                        </View>
                        <Text style={styles.cfoMetricSub}>Authoritative C.7 Engine</Text>
                    </View>

                    <View style={styles.cfoMetricBox}>
                        <Text style={styles.cfoMetricLabel}>Potential improvement</Text>
                        <Text style={styles.cfoMetricImprovement}>+{simulationResult.deltas.healthScoreDelta} pts</Text>
                        <Text style={styles.cfoMetricSub}>Simulated via C.8.6</Text>
                    </View>
                </View>

                {/* Primary CTA: See Authoritative What-If Simulation */}
                <TouchableOpacity
                    style={styles.seeImpactCTA}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowWhatIfModal(true);
                    }}
                >
                    <Text style={styles.seeImpactCTAText}>See Authoritative What-If Simulation</Text>
                    <ArrowUpRight size={18} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 10 }}
                    onPress={() => router.push('/investments')}
                >
                    <Text style={{ color: '#818CF8', fontSize: 11, fontWeight: '700' }}>View All Recommendations</Text>
                    <ChevronRight size={13} color="#818CF8" />
                </TouchableOpacity>
            </View>

            {/* ── 5. WHERE IS MY MONEY? (CATEGORY, MERCHANT, ACCOUNT) ── */}
            <View style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionCardTitle}>Where Is My Money?</Text>
                    <TouchableOpacity onPress={() => setShowBreakdownModal(true)}>
                        <Eye size={16} color="#71717A" />
                    </TouchableOpacity>
                </View>

                {/* Triad Tabs: Category (What) | Merchant (Who) | Account (Where) */}
                <View style={styles.triadTabRow}>
                    {[
                        { key: 'category', label: 'By Category' },
                        { key: 'merchant', label: 'By Merchant' },
                        { key: 'account', label: 'By Account' }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.triadTabBtn, breakdownTab === tab.key && styles.triadTabBtnActive]}
                            onPress={() => {
                                setBreakdownTab(tab.key);
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                        >
                            <Text style={[styles.triadTabText, breakdownTab === tab.key && styles.triadTabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Tab 1: Category Bars */}
                {breakdownTab === 'category' && (
                    cashFlowTruth.categoryBreakdown.length > 0 ? (
                        <View style={styles.categoryList}>
                            {cashFlowTruth.categoryBreakdown.slice(0, 5).map((item, idx) => {
                                const colors = ['#10B981', '#F97316', '#0EA5E9', '#8B5CF6', '#71717A'];
                                const color = colors[idx % colors.length];
                                return (
                                    <View key={item.category} style={styles.categoryRow}>
                                        <View style={styles.categoryHeader}>
                                            <View style={styles.categoryNameContainer}>
                                                <View style={[styles.categoryDot, { backgroundColor: color }]} />
                                                <Text style={styles.categoryName}>{item.category}</Text>
                                            </View>
                                            <View style={styles.categoryAmountContainer}>
                                                <Text style={styles.categoryPercent}>{item.percentage}%</Text>
                                                <Text style={styles.categoryAmount}>{item.amountFormatted}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.categoryProgressTrack}>
                                            <View style={[styles.categoryProgressBar, { width: `${item.percentage}%`, backgroundColor: color }]} />
                                        </View>
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyBreakdownCard}>
                            <Info size={16} color="#71717A" />
                            <Text style={styles.emptyBreakdownTitle}>No spending in this timeframe</Text>
                            <Text style={styles.emptyBreakdownSub}>Switch to "This Month" or select another period from the date picker above.</Text>
                        </View>
                    )
                )}

                {/* Tab 2: Normalized Merchant List */}
                {breakdownTab === 'merchant' && (
                    cashFlowTruth.merchantBreakdown.length > 0 ? (
                        <View style={styles.categoryList}>
                            {cashFlowTruth.merchantBreakdown.slice(0, 5).map((m, idx) => (
                                <TouchableOpacity
                                    key={m.merchant}
                                    style={styles.merchantRow}
                                    onPress={() => setSelectedMerchantDetail(m)}
                                >
                                    <View style={styles.merchantLeft}>
                                        <View style={styles.merchantAvatar}>
                                            <Text style={styles.merchantAvatarText}>{m.merchant.charAt(0)}</Text>
                                        </View>
                                        <View>
                                            <Text style={styles.merchantName}>{m.merchant}</Text>
                                            <Text style={styles.merchantSub}>{m.transactionCount} transactions</Text>
                                        </View>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.merchantAmount}>{m.amountFormatted}</Text>
                                        <Text style={styles.merchantPercent}>{m.percentage}% of spend</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    ) : (
                        <View style={styles.emptyBreakdownCard}>
                            <Info size={16} color="#71717A" />
                            <Text style={styles.emptyBreakdownTitle}>No merchant activity in this timeframe</Text>
                            <Text style={styles.emptyBreakdownSub}>Switch to "This Month" or select another period from the date picker above.</Text>
                        </View>
                    )
                )}

                {/* Tab 3: Account Where Money Resides */}
                {breakdownTab === 'account' && (
                    <View style={styles.categoryList}>
                        {accounts.map(acc => (
                            <View key={acc.id} style={styles.accountRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Building2 size={16} color={acc.isDesignated ? '#10B981' : '#71717A'} />
                                    <View>
                                        <Text style={styles.accountName}>{acc.name}</Text>
                                        <Text style={styles.accountSub}>{acc.type.replace('_', ' ')}</Text>
                                    </View>
                                </View>
                                <Text style={styles.accountBalance}>{formatCurrencyINR(acc.balance, false)}</Text>
                            </View>
                        ))}
                    </View>
                )}

                <TouchableOpacity
                    style={styles.viewBreakdownBtn}
                    onPress={() => setShowBreakdownModal(true)}
                >
                    <Text style={styles.viewBreakdownBtnText}>View Full Visual Breakdown</Text>
                    <ChevronRight size={14} color="#71717A" />
                </TouchableOpacity>
            </View>

            {/* ── 7. QUICK TRANSACTION LOGGER (INCOME, EXPENSE, TRANSFER) ── */}
            <View style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionCardTitle}>Quick Transaction Logger</Text>
                    <Text style={styles.addInstantlyText}>Add instantly</Text>
                </View>

                {/* Quick 1-tap shortcuts */}
                <View style={styles.quickIconRow}>
                    {[
                        { icon: Utensils, label: 'Food', color: '#F97316' },
                        { icon: Plane, label: 'Travel', color: '#0EA5E9' },
                        { icon: ShoppingBag, label: 'Shopping', color: '#EC4899' },
                        { icon: MoreHorizontal, label: 'Other', color: '#8B5CF6' }
                    ].map(item => (
                        <TouchableOpacity
                            key={item.label}
                            style={styles.quickIconItem}
                            onPress={() => {
                                setTxCategory(item.label);
                                setTxType('EXPENSE');
                                setShowLoggerModal(true);
                            }}
                        >
                            <View style={[styles.quickIconCircle, { backgroundColor: `${item.color}20` }]}>
                                <item.icon size={20} color={item.color} />
                            </View>
                            <Text style={styles.quickIconLabel}>{item.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity
                    style={styles.addCustomBtn}
                    onPress={() => {
                        setTxType('EXPENSE');
                        setShowLoggerModal(true);
                    }}
                >
                    <Plus size={16} color="#818CF8" />
                    <Text style={styles.addCustomBtnText}>+ Log Expense / Income / Transfer</Text>
                </TouchableOpacity>
            </View>

            {/* ── 8. SCALABLE SMART TRANSACTION FEED ── */}
            <View style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionCardTitle}>Smart Transaction Feed</Text>
                    {cashFlowTruth.needsSortCount > 0 && (
                        <TouchableOpacity
                            style={styles.needsSortTrigger}
                            onPress={() => setShowNeedsSortInbox(true)}
                        >
                            <Text style={styles.needsSortTriggerText}>
                                🔴 Needs Sort ({cashFlowTruth.needsSortCount})
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Search Bar */}
                <View style={styles.searchBar}>
                    <Search size={14} color="#71717A" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search description, merchant, amount..."
                        placeholderTextColor="#71717A"
                        value={feedSearch}
                        onChangeText={setFeedSearch}
                    />
                    {feedSearch.length > 0 && (
                        <TouchableOpacity onPress={() => setFeedSearch('')}>
                            <X size={14} color="#71717A" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feedFilterRow}>
                    {[
                        { key: 'ALL', label: 'All' },
                        { key: 'NEEDS_SORT', label: `Needs Sort (${cashFlowTruth.needsSortCount})` },
                        { key: 'EXPENSE', label: 'Expenses' },
                        { key: 'INCOME', label: 'Income' },
                        { key: 'TRANSFER', label: 'Transfers' }
                    ].map(f => (
                        <TouchableOpacity
                            key={f.key}
                            style={[styles.feedFilterPill, feedFilter === f.key && styles.feedFilterPillActive]}
                            onPress={() => setFeedFilter(f.key)}
                        >
                            <Text style={[styles.feedFilterText, feedFilter === f.key && styles.feedFilterTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Grouped Chronological Feed */}
                {processedFeed.length === 0 ? (
                    <View style={styles.emptyStateBox}>
                        <FileText size={24} color="#52525B" />
                        <Text style={styles.emptyStateText}>No transactions found for this filter & period</Text>
                    </View>
                ) : (
                    processedFeed.map(group => (
                        <View key={group.date} style={styles.dateGroupContainer}>
                            <View style={styles.dateGroupHeader}>
                                <Text style={styles.dateGroupTitle}>{group.date}</Text>
                                <Text style={styles.dateGroupCount}>{group.txList.length} transactions</Text>
                            </View>

                            {group.txList.map(tx => (
                                <View key={tx.id} style={styles.feedTxCard}>
                                    <View style={styles.feedTxLeft}>
                                        <View style={[
                                            styles.feedTxAvatar,
                                            { backgroundColor: tx.type === 'INCOME' ? '#10B98120' : tx.type === 'TRANSFER' ? '#818CF820' : '#27272A' }
                                        ]}>
                                            {tx.type === 'TRANSFER' ? (
                                                <ArrowLeftRight size={16} color="#818CF8" />
                                            ) : tx.type === 'INCOME' ? (
                                                <TrendingUp size={16} color="#10B981" />
                                            ) : (
                                                <Building2 size={16} color="#A1A1AA" />
                                            )}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.feedTxTitle} numberOfLines={1}>{tx.merchant}</Text>
                                            <Text style={styles.feedTxSub} numberOfLines={1}>
                                                {tx.category} • {tx.account}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[
                                            styles.feedTxAmount,
                                            { color: tx.type === 'INCOME' ? '#10B981' : tx.type === 'TRANSFER' ? '#818CF8' : '#FFF' }
                                        ]}>
                                            {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '⇄ ' : '-'}₹{Math.round(tx.amount).toLocaleString()}
                                        </Text>
                                        {tx.needsSort ? (
                                            <View style={styles.needsSortChip}>
                                                <Text style={styles.needsSortChipText}>Needs Sort</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.sortedStatusText}>Sorted ✓</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    ))
                )}
            </View>

            {/* ── MODAL 0: PERIOD & CUSTOM DATE RANGE PICKER ── */}
            <Modal
                visible={showPeriodModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowPeriodModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Calendar size={18} color="#818CF8" />
                                <Text style={styles.modalTitle}>Select Financial Period</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                            {/* Current Active Span Preview */}
                            <View style={styles.periodPreviewBanner}>
                                <Text style={styles.periodPreviewLabel}>ACTIVE TIMEFRAME</Text>
                                <Text style={styles.periodPreviewDates}>{periodBounds.periodSubtitle}</Text>
                            </View>

                            {/* Section 1: Month-by-Month Selection Grid */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, marginBottom: 8 }}>
                                <Text style={styles.periodSectionHeading}>SELECT MONTH</Text>
                                <View style={styles.yearSwitcherContainer}>
                                    <TouchableOpacity
                                        style={styles.yearNavBtn}
                                        onPress={() => {
                                            setSelectedYear(y => y - 1);
                                            safeHaptic('light');
                                        }}
                                    >
                                        <ChevronLeft size={14} color="#A5B4FC" />
                                    </TouchableOpacity>
                                    <Text style={styles.yearSwitcherText}>{selectedYear}</Text>
                                    <TouchableOpacity
                                        style={styles.yearNavBtn}
                                        onPress={() => {
                                            setSelectedYear(y => y + 1);
                                            safeHaptic('light');
                                        }}
                                    >
                                        <ChevronRight size={14} color="#A5B4FC" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* 12-Month Interactive Grid */}
                            <View style={styles.monthsGrid}>
                                {MONTH_LABELS.map(m => {
                                    const monthNum = String(m.key + 1).padStart(2, '0');
                                    const isMonthActive = periodType === 'custom' && customRange.start.startsWith(`${selectedYear}-${monthNum}`);
                                    return (
                                        <TouchableOpacity
                                            key={m.key}
                                            style={[styles.monthGridCard, isMonthActive && styles.monthGridCardActive]}
                                            onPress={() => handleSelectSpecificMonth(m.key, selectedYear)}
                                        >
                                            <Text style={[styles.monthGridShort, isMonthActive && styles.monthGridShortActive]}>
                                                {m.short}
                                            </Text>
                                            <Text style={styles.monthGridYear}>{selectedYear}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>

                            {/* Section 2: Standard Presets */}
                            <Text style={styles.periodSectionHeading}>STANDARD PRESETS</Text>
                            <View style={styles.periodPresetsGrid}>
                                {[
                                    { key: 'today', label: 'Today', desc: 'Current 24-hr day' },
                                    { key: 'week', label: 'This Week', desc: 'Mon – Sun' },
                                    { key: 'month', label: 'This Month', desc: 'Aug 1 – Aug 31' },
                                    { key: 'quarter', label: 'This Quarter', desc: 'Jul 1 – Sep 30' },
                                    { key: 'year', label: 'This Year', desc: 'Jan 1 – Dec 31' }
                                ].map(p => (
                                    <TouchableOpacity
                                        key={p.key}
                                        style={[styles.presetOptionCard, periodType === p.key && styles.presetOptionCardActive]}
                                        onPress={() => handleSelectPeriodPreset(p.key)}
                                    >
                                        <Text style={[styles.presetOptionTitle, periodType === p.key && styles.presetOptionTitleActive]}>
                                            {p.label}
                                        </Text>
                                        <Text style={styles.presetOptionDesc}>{p.desc}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Section B: Quick Custom Range Shortcuts */}
                            <Text style={styles.periodSectionHeading}>CUSTOM DATE SHORTCUTS</Text>
                            <View style={styles.quickShortcutsRow}>
                                {[
                                    { label: 'Last 7D', start: '2026-08-10', end: '2026-08-17' },
                                    { label: 'Last 30D', start: '2026-07-18', end: '2026-08-17' },
                                    { label: 'Last 90D', start: '2026-05-19', end: '2026-08-17' },
                                    { label: 'July 2026', start: '2026-07-01', end: '2026-07-31' },
                                    { label: 'Year to Date', start: '2026-01-01', end: '2026-08-17' }
                                ].map((q, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        style={styles.quickShortcutPill}
                                        onPress={() => {
                                            setCustomStartDateInput(q.start);
                                            setCustomEndDateInput(q.end);
                                            handleApplyCustomRange(q.start, q.end);
                                        }}
                                    >
                                        <Text style={styles.quickShortcutPillText}>{q.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Section C: Direct Date Input */}
                            <Text style={styles.periodSectionHeading}>CUSTOM DATE RANGE</Text>
                            <View style={styles.customDateInputsRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.customDateInputLabel}>Start Date (YYYY-MM-DD)</Text>
                                    <TextInput
                                        style={styles.customDateInputField}
                                        value={customStartDateInput}
                                        onChangeText={setCustomStartDateInput}
                                        placeholder="2026-08-01"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.customDateInputLabel}>End Date (YYYY-MM-DD)</Text>
                                    <TextInput
                                        style={styles.customDateInputField}
                                        value={customEndDateInput}
                                        onChangeText={setCustomEndDateInput}
                                        placeholder="2026-08-17"
                                        placeholderTextColor="#52525B"
                                    />
                                </View>
                            </View>
                        </ScrollView>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                            <TouchableOpacity
                                style={[styles.modalSecondaryBtn, { flex: 1 }]}
                                onPress={() => setShowPeriodModal(false)}
                            >
                                <Text style={styles.modalSecondaryBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalPrimaryBtn, { flex: 2 }]}
                                onPress={() => handleApplyCustomRange()}
                            >
                                <Text style={styles.modalPrimaryBtnText}>Apply Date Range</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 1: CALCULATION MATH BREAKDOWN ── */}
            <Modal
                visible={showMathModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMathModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>How Runway Is Calculated</Text>
                            <TouchableOpacity onPress={() => setShowMathModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 420 }}>
                            <View style={styles.mathCard}>
                                <Text style={styles.mathFormulaTitle}>AUTHORITATIVE FORMULA</Text>
                                <Text style={styles.mathFormulaLarge}>
                                    Runway = Designated Reserve ÷ Essential Monthly Burn
                                </Text>
                                <Text style={styles.mathResultRow}>
                                    ₹1,05,000 ÷ ₹87,500 = <Text style={{ color: '#EF4444', fontWeight: '800' }}>1.20 Months</Text>
                                </Text>
                            </View>

                            <Text style={styles.breakdownSectionTitle}>Essential Monthly Burn Components</Text>
                            {Object.entries(DEFAULT_ESSENTIAL_BURN_BREAKDOWN).map(([key, val]) => (
                                <View key={key} style={styles.mathBreakdownRow}>
                                    <Text style={styles.mathBreakdownLabel}>
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </Text>
                                    <Text style={styles.mathBreakdownVal}>{formatCurrencyINR(val, false)}</Text>
                                </View>
                            ))}

                            <View style={styles.mathTotalRow}>
                                <Text style={{ color: '#FFF', fontWeight: '800' }}>Total Essential Burn</Text>
                                <Text style={{ color: '#10B981', fontWeight: '800' }}>₹87,500 / month</Text>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowMathModal(false)}>
                            <Text style={styles.modalPrimaryBtnText}>Understood</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 2: DESIGNATE EMERGENCY ACCOUNTS ── */}
            <Modal
                visible={showDesignateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDesignateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Designate Emergency Accounts</Text>
                            <TouchableOpacity onPress={() => setShowDesignateModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ color: '#A1A1AA', fontSize: 12, marginBottom: 12 }}>
                            Only liquid accounts should be designated. Equity, Mutual Funds, Gold, and EPF/PPF are excluded.
                        </Text>

                        <ScrollView style={{ maxHeight: 350 }}>
                            <Text style={styles.accountGroupHeader}>ELIGIBLE LIQUID ACCOUNTS</Text>
                            {accounts.filter(a => a.isEligibleReserve).map(acc => {
                                const isChecked = designatedAccountIds.includes(acc.id);
                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        style={styles.designateAccountRow}
                                        onPress={() => handleToggleAccountDesignation(acc.id)}
                                    >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                                                {isChecked && <Check size={14} color="#FFF" />}
                                            </View>
                                            <View>
                                                <Text style={styles.accountName}>{acc.name}</Text>
                                                <Text style={styles.accountSub}>{formatCurrencyINR(acc.balance, false)}</Text>
                                            </View>
                                        </View>
                                        <Text style={{ color: isChecked ? '#10B981' : '#71717A', fontSize: 11, fontWeight: '700' }}>
                                            {isChecked ? 'Designated' : 'Excluded'}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}

                            <Text style={[styles.accountGroupHeader, { marginTop: 16 }]}>EXCLUDED NON-LIQUID ASSETS</Text>
                            {accounts.filter(a => !a.isEligibleReserve).map(acc => (
                                <View key={acc.id} style={[styles.designateAccountRow, { opacity: 0.5 }]}>
                                    <View>
                                        <Text style={styles.accountName}>{acc.name}</Text>
                                        <Text style={styles.accountSub}>{acc.type} • {formatCurrencyINR(acc.balance, false)}</Text>
                                    </View>
                                    <Text style={{ color: '#71717A', fontSize: 10 }}>🔒 Excluded</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowDesignateModal(false)}>
                            <Text style={styles.modalPrimaryBtnText}>Save Designation</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 3: AUTHORITATIVE WHAT-IF SIMULATION (C.8.6) ── */}
            <Modal
                visible={showWhatIfModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowWhatIfModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Sparkles size={16} color="#818CF8" />
                                <Text style={styles.modalTitle}>Authoritative What-If Simulation</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowWhatIfModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 450 }}>
                            {/* Monthly Surplus Context */}
                            <View style={styles.surplusContextCard}>
                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700' }}>CURRENT MONTHLY SURPLUS</Text>
                                <Text style={{ color: '#10B981', fontSize: 18, fontWeight: '800', marginVertical: 2 }}>
                                    {cashFlowTruth.netCashFlowFormatted}
                                </Text>
                                <Text style={{ color: '#71717A', fontSize: 10 }}>Available to fund reserve without debt</Text>
                            </View>

                            {/* Simulation Allocation Selector */}
                            <Text style={styles.scenarioSelectorTitle}>Scenario: How much surplus to allocate?</Text>
                            <View style={styles.scenarioPillsRow}>
                                {[30000, 50000, 100000, 150000].map(amt => (
                                    <TouchableOpacity
                                        key={amt}
                                        style={[styles.scenarioPill, simulationAmount === amt && styles.scenarioPillActive]}
                                        onPress={() => setSimulationAmount(amt)}
                                    >
                                        <Text style={[styles.scenarioPillText, simulationAmount === amt && styles.scenarioPillTextActive]}>
                                            ₹{(amt / 1000).toFixed(0)}K
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Before vs After Grid */}
                            <View style={styles.impactGrid}>
                                <View style={styles.impactRowHeader}>
                                    <Text style={styles.impactHeaderLabel}>METRIC</Text>
                                    <Text style={styles.impactHeaderLabel}>BEFORE</Text>
                                    <Text style={styles.impactHeaderLabel}>AFTER</Text>
                                </View>

                                <View style={styles.impactRow}>
                                    <Text style={styles.impactMetricName}>Emergency Reserve</Text>
                                    <Text style={styles.impactMetricBefore}>{simulationResult.before.reserveFormatted}</Text>
                                    <Text style={[styles.impactMetricAfter, { color: '#10B981' }]}>{simulationResult.after.reserveFormatted}</Text>
                                </View>

                                <View style={styles.impactRow}>
                                    <Text style={styles.impactMetricName}>Emergency Runway</Text>
                                    <Text style={[styles.impactMetricBefore, { color: '#EF4444' }]}>{simulationResult.before.runway}</Text>
                                    <Text style={[styles.impactMetricAfter, { color: '#10B981' }]}>{simulationResult.after.runway}</Text>
                                </View>

                                <View style={styles.impactRow}>
                                    <Text style={styles.impactMetricName}>Health Score (C.7)</Text>
                                    <Text style={styles.impactMetricBefore}>{simulationResult.before.healthScore} [{simulationResult.before.healthGrade}]</Text>
                                    <Text style={[styles.impactMetricAfter, { color: '#818CF8' }]}>{simulationResult.after.healthScore} [{simulationResult.after.healthGrade}]</Text>
                                </View>

                                <View style={styles.impactRow}>
                                    <Text style={styles.impactMetricName}>Financial Security</Text>
                                    <Text style={[styles.impactMetricBefore, { color: '#EF4444' }]}>{simulationResult.before.financialSecurity}</Text>
                                    <Text style={[styles.impactMetricAfter, { color: '#10B981' }]}>{simulationResult.after.financialSecurity}</Text>
                                </View>
                            </View>

                            <Text style={styles.todoHeader}>What You Need To Do:</Text>
                            {simulationResult.toDoChecklist.map((todo, idx) => (
                                <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 4 }}>
                                    <CheckCircle2 size={14} color="#10B981" />
                                    <Text style={{ color: '#D4D4D8', fontSize: 12, flex: 1 }}>{todo}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowWhatIfModal(false)}>
                            <Text style={styles.modalPrimaryBtnText}>Got It</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 4: ADVANCED TRANSACTION LOGGER ── */}
            <Modal
                visible={showLoggerModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowLoggerModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Log Transaction</Text>
                            <TouchableOpacity onPress={() => setShowLoggerModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        {/* Expense / Income / Transfer Toggle */}
                        <View style={styles.txTypeToggleRow}>
                            {[
                                { key: 'EXPENSE', label: 'Expense', color: '#EF4444' },
                                { key: 'INCOME', label: 'Income', color: '#10B981' },
                                { key: 'TRANSFER', label: 'Transfer', color: '#818CF8' }
                            ].map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.txTypeBtn, txType === t.key && { backgroundColor: t.color }]}
                                    onPress={() => setTxType(t.key)}
                                >
                                    <Text style={[styles.txTypeBtnText, txType === t.key && { color: '#FFF' }]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <ScrollView style={{ maxHeight: 380 }}>
                            <Text style={styles.inputLabel}>Description</Text>
                            <TextInput
                                style={styles.formInput}
                                placeholder="e.g. Organic Groceries, Salary, HDFC to ICICI"
                                placeholderTextColor="#71717A"
                                value={txDesc}
                                onChangeText={setTxDesc}
                            />

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.inputLabel}>Amount (₹)</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="0.00"
                                        placeholderTextColor="#71717A"
                                        keyboardType="numeric"
                                        value={txAmount}
                                        onChangeText={setTxAmount}
                                    />
                                </View>

                                {txType !== 'TRANSFER' && (
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>Category</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={txCategory}
                                            onChangeText={setTxCategory}
                                        />
                                    </View>
                                )}
                            </View>

                            {txType === 'TRANSFER' ? (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>From Account</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={txAccount}
                                            onChangeText={setTxAccount}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>To Account</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={txToAccount}
                                            onChangeText={setTxToAccount}
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={{ flexDirection: 'row', gap: 10 }}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>Account / Wallet</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            value={txAccount}
                                            onChangeText={setTxAccount}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.inputLabel}>Merchant</Text>
                                        <TextInput
                                            style={styles.formInput}
                                            placeholder="Optional"
                                            placeholderTextColor="#71717A"
                                            value={txMerchant}
                                            onChangeText={setTxMerchant}
                                        />
                                    </View>
                                </View>
                            )}

                            {/* Recurring Toggle */}
                            <TouchableOpacity
                                style={styles.recurringToggleRow}
                                onPress={() => setTxIsRecurring(!txIsRecurring)}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <Repeat size={15} color={txIsRecurring ? '#10B981' : '#71717A'} />
                                    <Text style={{ color: '#FFF', fontSize: 12 }}>Recurring Monthly Transaction</Text>
                                </View>
                                <View style={[styles.toggleCheckbox, txIsRecurring && styles.toggleCheckboxActive]}>
                                    {txIsRecurring && <Check size={12} color="#FFF" />}
                                </View>
                            </TouchableOpacity>
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleAddTransaction}>
                            <Text style={styles.modalPrimaryBtnText}>
                                {txType === 'TRANSFER' ? 'Log Transfer' : txType === 'INCOME' ? 'Log Income' : 'Log Expense'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 5: MERCHANT DETAIL ACTION SHEET ── */}
            <Modal
                visible={Boolean(selectedMerchantDetail)}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setSelectedMerchantDetail(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        {selectedMerchantDetail && (
                            <>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>{selectedMerchantDetail.merchant}</Text>
                                        <Text style={{ color: '#10B981', fontSize: 16, fontWeight: '800', marginTop: 2 }}>
                                            {selectedMerchantDetail.amountFormatted} • {selectedMerchantDetail.transactionCount} transactions
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedMerchantDetail(null)}>
                                        <X size={20} color="#A1A1AA" />
                                    </TouchableOpacity>
                                </View>

                                <ScrollView style={{ maxHeight: 320 }}>
                                    <Text style={styles.accountGroupHeader}>CATEGORY BREAKDOWN FOR THIS MERCHANT</Text>
                                    {selectedMerchantDetail.categoryDistribution.map(c => (
                                        <View key={c.category} style={styles.mathBreakdownRow}>
                                            <Text style={styles.mathBreakdownLabel}>{c.category}</Text>
                                            <Text style={styles.mathBreakdownVal}>{c.amountFormatted}</Text>
                                        </View>
                                    ))}

                                    <Text style={[styles.accountGroupHeader, { marginTop: 14 }]}>RECENT TRANSACTIONS</Text>
                                    {selectedMerchantDetail.transactions.map(t => (
                                        <View key={t.id} style={styles.miniTxRow}>
                                            <Text style={{ color: '#D4D4D8', fontSize: 12 }}>{t.date} • {t.rawDescription}</Text>
                                            <Text style={{ color: '#FFF', fontWeight: '700' }}>₹{t.amount.toLocaleString()}</Text>
                                        </View>
                                    ))}
                                </ScrollView>

                                <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setSelectedMerchantDetail(null)}>
                                    <Text style={styles.modalPrimaryBtnText}>Close</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 6: 6-MONTH CASH FLOW TREND ── */}
            <Modal
                visible={showTrendModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowTrendModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Cash Flow Trend (Last 6 Months)</Text>
                            <TouchableOpacity onPress={() => setShowTrendModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }}>
                            <View style={styles.trendSummaryGrid}>
                                <View style={styles.trendSummaryCol}>
                                    <Text style={styles.trendSummaryLabel}>Avg. Monthly Surplus</Text>
                                    <Text style={[styles.trendSummaryVal, { color: '#10B981' }]}>{trendData.averageMonthlySurplusFormatted}</Text>
                                </View>
                                <View style={styles.trendSummaryCol}>
                                    <Text style={styles.trendSummaryLabel}>Average Savings Rate</Text>
                                    <Text style={[styles.trendSummaryVal, { color: '#818CF8' }]}>{trendData.averageSavingsRate}%</Text>
                                </View>
                            </View>

                            <Text style={styles.accountGroupHeader}>MONTH-BY-MONTH HISTORY</Text>
                            {trendData.months.map(m => (
                                <View key={m.month} style={styles.trendMonthRow}>
                                    <Text style={{ color: '#FFF', width: 40, fontWeight: '700' }}>{m.month}</Text>
                                    <View style={{ flex: 1, gap: 4 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: '#10B981', fontSize: 11 }}>In: ₹{(m.income / 1000).toFixed(0)}K</Text>
                                            <Text style={{ color: '#EF4444', fontSize: 11 }}>Out: ₹{(m.expense / 1000).toFixed(0)}K</Text>
                                            <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>Net: +₹{(m.netFlow / 1000).toFixed(0)}K</Text>
                                        </View>
                                        <View style={styles.trendBarTrack}>
                                            <View style={[styles.trendBarFill, { width: `${m.savingsRate}%` }]} />
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowTrendModal(false)}>
                            <Text style={styles.modalPrimaryBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 7: FULL VISUAL BREAKDOWN MODAL ── */}
            <Modal
                visible={showBreakdownModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowBreakdownModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Where Is My Money Breakdown</Text>
                            <TouchableOpacity onPress={() => setShowBreakdownModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 400 }}>
                            <View style={styles.donutPlaceholderCard}>
                                <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700' }}>TOTAL PERIOD SPEND</Text>
                                <Text style={{ color: '#EF4444', fontSize: 24, fontWeight: '900', marginVertical: 4 }}>
                                    {cashFlowTruth.totalSpendingFormatted}
                                </Text>
                                <Text style={{ color: '#71717A', fontSize: 11 }}>Across {cashFlowTruth.categoryBreakdown.length} categories & {cashFlowTruth.merchantBreakdown.length} merchants</Text>
                            </View>

                            <Text style={styles.accountGroupHeader}>CATEGORIES</Text>
                            {cashFlowTruth.categoryBreakdown.map(c => (
                                <View key={c.category} style={styles.mathBreakdownRow}>
                                    <Text style={styles.mathBreakdownLabel}>{c.category} ({c.percentage}%)</Text>
                                    <Text style={styles.mathBreakdownVal}>{c.amountFormatted}</Text>
                                </View>
                            ))}

                            <Text style={[styles.accountGroupHeader, { marginTop: 14 }]}>TOP MERCHANTS</Text>
                            {cashFlowTruth.merchantBreakdown.map(m => (
                                <View key={m.merchant} style={styles.mathBreakdownRow}>
                                    <Text style={styles.mathBreakdownLabel}>{m.merchant} ({m.percentage}%)</Text>
                                    <Text style={styles.mathBreakdownVal}>{m.amountFormatted}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowBreakdownModal(false)}>
                            <Text style={styles.modalPrimaryBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingBottom: 40
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    headerLeft: {
        flex: 1,
        marginRight: 10
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    headerSubtitle: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 2
    },
    periodPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1E1B4B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#4338CA'
    },
    periodPillText: {
        color: '#A5B4FC',
        fontSize: 11,
        fontWeight: '700'
    },
    periodTabRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 14,
        overflow: 'hidden'
    },
    periodTabBtn: {
        flex: 1,
        paddingVertical: 6,
        backgroundColor: '#18181B',
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    periodTabBtnActive: {
        backgroundColor: '#6366F1',
        borderColor: '#818CF8'
    },
    periodTabText: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700'
    },
    periodTabTextActive: {
        color: '#FFFFFF'
    },
    balanceSheetCard: {
        backgroundColor: '#121215',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 12
    },
    balanceSheetTitle: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '700'
    },
    netWorthHighlight: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800'
    },
    balanceSheetGrid: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10
    },
    balanceCol: {
        flex: 1,
        alignItems: 'center'
    },
    balanceDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#27272A'
    },
    balanceLabel: {
        color: '#71717A',
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2
    },
    balanceValue: {
        fontSize: 12,
        fontWeight: '800'
    },
    heroCard: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 12
    },
    heroHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981'
    },
    liveText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '800'
    },
    trendTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1E1B4B',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    trendTriggerText: {
        color: '#A5B4FC',
        fontSize: 10,
        fontWeight: '800'
    },
    heroMetricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    heroMetricCol: {
        flex: 1
    },
    heroMetricLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 4
    },
    incomeValue: {
        color: '#10B981',
        fontSize: 15,
        fontWeight: '900'
    },
    expenseValue: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '900'
    },
    netFlowValue: {
        fontSize: 15,
        fontWeight: '900'
    },
    surplusBannerBase: {
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        alignItems: 'center'
    },
    surplusBannerPositive: {
        backgroundColor: '#10B98115',
        borderColor: '#10B98130'
    },
    surplusBannerNegative: {
        backgroundColor: '#EF444415',
        borderColor: '#EF444430'
    },
    surplusBannerNeutral: {
        backgroundColor: '#27272A50',
        borderColor: '#3F3F46'
    },
    surplusBannerTextBase: {
        fontSize: 11,
        fontWeight: '700'
    },
    surplusBannerTextPositive: {
        color: '#34D399'
    },
    surplusBannerTextNegative: {
        color: '#F87171'
    },
    surplusBannerTextNeutral: {
        color: '#A1A1AA'
    },
    emergencyCard: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 12
    },
    emergencyTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1
    },
    statusBadgeText: {
        fontSize: 9,
        fontWeight: '800'
    },
    emergencyStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginVertical: 12
    },
    emergencyStatItem: {
        flex: 1,
        alignItems: 'center'
    },
    emergencyStatLabel: {
        color: '#71717A',
        fontSize: 9,
        fontWeight: '700',
        marginBottom: 2
    },
    emergencyStatVal: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    emergencyStatSub: {
        color: '#52525B',
        fontSize: 8,
        marginTop: 2
    },
    mathSignCol: {
        paddingHorizontal: 2
    },
    mathSignText: {
        color: '#71717A',
        fontSize: 14,
        fontWeight: '800'
    },
    runwayProgressTrack: {
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden',
        marginVertical: 8
    },
    runwayProgressBar: {
        height: '100%',
        borderRadius: 3
    },
    shortfallRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F59E0B15',
        padding: 8,
        borderRadius: 8,
        marginBottom: 10
    },
    shortfallText: {
        color: '#FBBF24',
        fontSize: 11
    },
    emergencyBtnRow: {
        flexDirection: 'row',
        gap: 8
    },
    mathExplanationBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#1E1B4B',
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#4338CA'
    },
    mathExplanationBtnText: {
        color: '#A5B4FC',
        fontSize: 11,
        fontWeight: '700'
    },
    designateBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#27272A',
        paddingVertical: 8,
        borderRadius: 8
    },
    designateBtnText: {
        color: '#E4E4E7',
        fontSize: 11,
        fontWeight: '700'
    },
    mergedSectionDivider: {
        height: 1,
        backgroundColor: '#27272A',
        marginVertical: 14
    },
    cfoCard: {
        backgroundColor: '#0F0E17',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#4338CA',
        marginBottom: 12
    },
    cfoHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6
    },
    cfoHeaderLabel: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    cfoPriorityTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4
    },
    cfoPriorityDesc: {
        color: '#A1A1AA',
        fontSize: 12,
        lineHeight: 16,
        marginBottom: 10
    },
    tagPillRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12
    },
    tagPill: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1
    },
    tagPillText: {
        fontSize: 10,
        fontWeight: '700'
    },
    cfoMetricsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12
    },
    cfoMetricBox: {
        flex: 1,
        backgroundColor: '#18181B',
        padding: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    cfoMetricLabel: {
        color: '#71717A',
        fontSize: 9,
        fontWeight: '700'
    },
    cfoMetricScore: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    gradeBadge: {
        backgroundColor: '#10B98120',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4
    },
    gradeBadgeText: {
        color: '#10B981',
        fontSize: 9,
        fontWeight: '800'
    },
    cfoMetricSub: {
        color: '#52525B',
        fontSize: 8,
        marginTop: 2
    },
    cfoMetricImprovement: {
        color: '#818CF8',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 2
    },
    seeImpactCTA: {
        backgroundColor: '#6366F1',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 10
    },
    seeImpactCTAText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    sectionCard: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 12
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    sectionCardTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    triadTabRow: {
        flexDirection: 'row',
        backgroundColor: '#121215',
        borderRadius: 8,
        padding: 2,
        marginBottom: 12
    },
    triadTabBtn: {
        flex: 1,
        paddingVertical: 6,
        alignItems: 'center',
        borderRadius: 6
    },
    triadTabBtnActive: {
        backgroundColor: '#27272A'
    },
    triadTabText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700'
    },
    triadTabTextActive: {
        color: '#FFFFFF'
    },
    categoryList: {
        gap: 10
    },
    categoryRow: {
        gap: 4
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    categoryNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    categoryDot: {
        width: 6,
        height: 6,
        borderRadius: 3
    },
    categoryName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    categoryAmountContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    categoryPercent: {
        color: '#71717A',
        fontSize: 11
    },
    categoryAmount: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    categoryProgressTrack: {
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 2,
        overflow: 'hidden'
    },
    categoryProgressBar: {
        height: '100%',
        borderRadius: 2
    },
    merchantRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    merchantLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    merchantAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    merchantAvatarText: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '800'
    },
    merchantName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    merchantSub: {
        color: '#71717A',
        fontSize: 10
    },
    merchantAmount: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    merchantPercent: {
        color: '#71717A',
        fontSize: 10
    },
    accountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    accountName: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    accountSub: {
        color: '#71717A',
        fontSize: 10
    },
    accountBalance: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '800'
    },
    viewBreakdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: 12,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    viewBreakdownBtnText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700'
    },
    obligationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121215',
        padding: 8,
        borderRadius: 8
    },
    obligationTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    obligationDate: {
        color: '#71717A',
        fontSize: 10,
        marginTop: 1
    },
    obligationAmount: {
        color: '#EF4444',
        fontSize: 12,
        fontWeight: '800'
    },
    obligationBadge: {
        color: '#F59E0B',
        fontSize: 9,
        fontWeight: '700'
    },
    addInstantlyText: {
        color: '#71717A',
        fontSize: 10
    },
    quickIconRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    quickIconItem: {
        alignItems: 'center',
        gap: 4
    },
    quickIconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center'
    },
    quickIconLabel: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '700'
    },
    addCustomBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#1E1B4B',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#4338CA'
    },
    addCustomBtnText: {
        color: '#A5B4FC',
        fontSize: 11,
        fontWeight: '800'
    },
    needsSortTrigger: {
        backgroundColor: '#EF444420',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6
    },
    needsSortTriggerText: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '800'
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#121215',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 11,
        padding: 0
    },
    feedFilterRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 10
    },
    feedFilterPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#121215',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#27272A',
        marginRight: 6
    },
    feedFilterPillActive: {
        backgroundColor: '#6366F1',
        borderColor: '#818CF8'
    },
    feedFilterText: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700'
    },
    feedFilterTextActive: {
        color: '#FFFFFF'
    },
    dateGroupContainer: {
        marginBottom: 12
    },
    dateGroupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A',
        marginBottom: 6
    },
    dateGroupTitle: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    dateGroupCount: {
        color: '#52525B',
        fontSize: 9
    },
    feedTxCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121215',
        padding: 8,
        borderRadius: 8,
        marginBottom: 4
    },
    feedTxLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1
    },
    feedTxAvatar: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    feedTxTitle: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700'
    },
    feedTxSub: {
        color: '#71717A',
        fontSize: 9
    },
    feedTxAmount: {
        fontSize: 12,
        fontWeight: '800'
    },
    needsSortChip: {
        backgroundColor: '#EF444420',
        paddingHorizontal: 4,
        paddingVertical: 1,
        borderRadius: 4,
        marginTop: 2
    },
    needsSortChipText: {
        color: '#EF4444',
        fontSize: 8,
        fontWeight: '800'
    },
    sortedStatusText: {
        color: '#10B981',
        fontSize: 8,
        marginTop: 2
    },
    emptyStateBox: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 6
    },
    emptyStateText: {
        color: '#71717A',
        fontSize: 11
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end'
    },
    modalContainer: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 16,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800'
    },
    modalPrimaryBtn: {
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 14
    },
    modalPrimaryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    mathCard: {
        backgroundColor: '#1E1B4B',
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#4338CA',
        marginBottom: 12
    },
    mathFormulaTitle: {
        color: '#A5B4FC',
        fontSize: 9,
        fontWeight: '800',
        marginBottom: 4
    },
    mathFormulaLarge: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 6
    },
    mathResultRow: {
        color: '#A5B4FC',
        fontSize: 13
    },
    breakdownSectionTitle: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '800',
        marginVertical: 8
    },
    mathBreakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    mathBreakdownLabel: {
        color: '#D4D4D8',
        fontSize: 11
    },
    mathBreakdownVal: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700'
    },
    mathTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#3F3F46',
        marginTop: 6
    },
    accountGroupHeader: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 8
    },
    designateAccountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#52525B',
        alignItems: 'center',
        justifyContent: 'center'
    },
    checkboxActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981'
    },
    surplusContextCard: {
        backgroundColor: '#121215',
        padding: 10,
        borderRadius: 8,
        marginBottom: 12
    },
    scenarioSelectorTitle: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        marginBottom: 8
    },
    scenarioPillsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14
    },
    scenarioPill: {
        flex: 1,
        paddingVertical: 8,
        backgroundColor: '#27272A',
        borderRadius: 8,
        alignItems: 'center'
    },
    scenarioPillActive: {
        backgroundColor: '#6366F1'
    },
    scenarioPillText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '800'
    },
    scenarioPillTextActive: {
        color: '#FFFFFF'
    },
    impactGrid: {
        backgroundColor: '#121215',
        borderRadius: 10,
        padding: 10,
        marginBottom: 12
    },
    impactRowHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    impactHeaderLabel: {
        color: '#71717A',
        fontSize: 9,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center'
    },
    impactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    impactMetricName: {
        color: '#D4D4D8',
        fontSize: 11,
        flex: 1.2
    },
    impactMetricBefore: {
        color: '#A1A1AA',
        fontSize: 11,
        flex: 1,
        textAlign: 'center'
    },
    impactMetricAfter: {
        fontSize: 11,
        fontWeight: '800',
        flex: 1,
        textAlign: 'center'
    },
    todoHeader: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        marginTop: 6,
        marginBottom: 4
    },
    txTypeToggleRow: {
        flexDirection: 'row',
        backgroundColor: '#121215',
        borderRadius: 8,
        padding: 2,
        marginBottom: 12
    },
    txTypeBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6
    },
    txTypeBtnText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '800'
    },
    inputLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 4,
        marginTop: 8
    },
    formInput: {
        backgroundColor: '#121215',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 8,
        color: '#FFFFFF',
        fontSize: 12,
        paddingHorizontal: 10,
        paddingVertical: 8
    },
    recurringToggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#121215',
        padding: 10,
        borderRadius: 8,
        marginTop: 12
    },
    toggleCheckbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#52525B',
        alignItems: 'center',
        justifyContent: 'center'
    },
    toggleCheckboxActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981'
    },
    miniTxRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    trendSummaryGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12
    },
    trendSummaryCol: {
        flex: 1,
        backgroundColor: '#121215',
        padding: 10,
        borderRadius: 8
    },
    trendSummaryLabel: {
        color: '#71717A',
        fontSize: 9,
        fontWeight: '700'
    },
    trendSummaryVal: {
        fontSize: 14,
        fontWeight: '800',
        marginTop: 2
    },
    trendMonthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    trendBarTrack: {
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 2,
        overflow: 'hidden'
    },
    trendBarFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 2
    },
    donutPlaceholderCard: {
        backgroundColor: '#121215',
        padding: 14,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 12
    },
    periodPreviewBanner: {
        backgroundColor: '#1E1B4B',
        padding: 12,
        borderRadius: 10,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#4338CA'
    },
    periodPreviewLabel: {
        color: '#818CF8',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    periodPreviewDates: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 3
    },
    periodSectionHeading: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 6
    },
    periodPresetsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14
    },
    presetOptionCard: {
        width: '48%',
        backgroundColor: '#18181B',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    presetOptionCardActive: {
        backgroundColor: '#312E81',
        borderColor: '#6366F1'
    },
    presetOptionTitle: {
        color: '#D4D4D8',
        fontSize: 12,
        fontWeight: '700'
    },
    presetOptionTitleActive: {
        color: '#A5B4FC'
    },
    presetOptionDesc: {
        color: '#71717A',
        fontSize: 9,
        marginTop: 2
    },
    quickShortcutsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 14
    },
    quickShortcutPill: {
        backgroundColor: '#18181B',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    quickShortcutPillText: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '700'
    },
    customDateInputsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 8
    },
    customDateInputLabel: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 4
    },
    customDateInputField: {
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600'
    },
    yearSwitcherContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#18181B',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    yearNavBtn: {
        padding: 4,
        alignItems: 'center',
        justifyContent: 'center'
    },
    yearSwitcherText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800',
        paddingHorizontal: 4
    },
    monthsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 14
    },
    monthGridCard: {
        width: '23%',
        backgroundColor: '#18181B',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    monthGridCardActive: {
        backgroundColor: '#312E81',
        borderColor: '#6366F1'
    },
    monthGridShort: {
        color: '#D4D4D8',
        fontSize: 12,
        fontWeight: '800'
    },
    monthGridShortActive: {
        color: '#A5B4FC'
    },
    monthGridYear: {
        color: '#71717A',
        fontSize: 8,
        marginTop: 2
    },
    emptyBreakdownCard: {
        backgroundColor: '#121215',
        borderRadius: 10,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 6,
        borderWidth: 1,
        borderColor: '#27272A',
        gap: 4
    },
    emptyBreakdownTitle: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 4
    },
    emptyBreakdownSub: {
        color: '#52525B',
        fontSize: 10,
        textAlign: 'center',
        paddingHorizontal: 12
    }
});
