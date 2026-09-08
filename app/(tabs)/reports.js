/**
 * app/(tabs)/reports.js
 * 
 * FinLife Reports V1 — Read-Only Financial Intelligence Layer.
 * 
 * Implements the 8-screen design mockup flow:
 * 1. Navigation Drawer integration (under Money Flow & Cash)
 * 2. Financial Overview Dashboard with period selector & interactive cards
 * 3. Cash Flow Report (Income vs Expenses chart, transfer/refund breakdown, net flow)
 * 4. Spending Analysis (Donut breakdown, by category/merchant/account, largest transactions)
 * 5. Budget Performance (Radial utilization %, category progress bars, over-budget warnings)
 * 6. Recurring Payments Report (Monthly total, active/upcoming commitments, annualized cost)
 * 7. Loan & Debt Report (Outstanding principal, monthly EMI, principal vs interest, reduction trend)
 * 8. Shared Costs & Groups Report (You owe vs others owe you, net group positions, recent settlements)
 * 
 * Guaranteed Back Navigation:
 * - Prominent visual Back button (<ArrowLeft />) with router fallback.
 * - Hardware BackHandler listener: pops from detail report to Overview before exiting.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    RefreshControl,
    Text,
    StyleSheet,
    TouchableOpacity,
    BackHandler,
    ActivityIndicator
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
    ArrowLeft,
    Menu,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    ArrowDownLeft,
    Repeat,
    RotateCcw,
    Shield,
    Users,
    CreditCard,
    DollarSign,
    Lightbulb,
    Home,
    GraduationCap,
    Play,
    CheckCircle2,
    Clock,
    AlertTriangle
} from 'lucide-react-native';
import { useDrawer } from './_layout';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import PeriodSelector from '../../components/reports/PeriodSelector';
import ReportsSegmentedTabs from '../../components/reports/ReportsSegmentedTabs';
import CashFlowBarChart from '../../components/reports/CashFlowBarChart';
import SpendingDonutChart from '../../components/reports/SpendingDonutChart';
import BudgetRadialGauge from '../../components/reports/BudgetRadialGauge';
import DebtReductionChart from '../../components/reports/DebtReductionChart';
import CategoryProgressBar from '../../components/reports/CategoryProgressBar';
import { ReportViewModel } from '../../services/reports/reportViewModel.js';
import { ReportSection } from '../../services/reports/reportContracts.js';

export default function ReportsScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const { setIsDrawerOpen } = useDrawer();

    const [selectedPeriod, setSelectedPeriod] = useState('2026-09');
    const [activeSection, setActiveSection] = useState(ReportSection.OVERVIEW);
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Detail view sub-tab states
    const [cashFlowSubTab, setCashFlowSubTab] = useState('Summary');
    const [spendingSubTab, setSpendingSubTab] = useState('By Category');
    const [budgetSubTab, setBudgetSubTab] = useState('Overview');
    const [recurringSubTab, setRecurringSubTab] = useState('Active');
    const [debtSubTab, setDebtSubTab] = useState('Summary');
    const [groupSubTab, setGroupSubTab] = useState('Summary');

    // ── Navigation & Back Handler ──────────────────────────────────
    const handleBack = useCallback(() => {
        if (activeSection !== ReportSection.OVERVIEW) {
            // Return from detailed report to Overview
            setActiveSection(ReportSection.OVERVIEW);
        } else {
            // Exit back to Personal CFO / Home
            if (router.canGoBack()) {
                router.back();
            } else {
                router.replace('/(tabs)');
            }
        }
    }, [activeSection, router]);

    useEffect(() => {
        const onBackPress = () => {
            handleBack();
            return true;
        };
        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [handleBack]);

    // ── Data Fetching ──────────────────────────────────────────────
    const loadFinancialIntelligence = async (periodKey = selectedPeriod) => {
        try {
            const data = await ReportViewModel.getFullFinancialIntelligence(periodKey);
            setReportData(data);
        } catch (err) {
            console.error('[ReportsScreen] Failed to load financial intelligence:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadFinancialIntelligence(selectedPeriod);
    }, [selectedPeriod]);

    const onRefresh = () => {
        setRefreshing(true);
        loadFinancialIntelligence(selectedPeriod);
    };

    if (loading || !reportData) {
        return (
            <AnimatedScreen style={styles.container}>
                <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
                    <TouchableOpacity
                        onPress={handleBack}
                        style={styles.navBtn}
                        accessibilityLabel="Go back"
                    >
                        <ArrowLeft size={20} color="#F8FAFC" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Reports</Text>
                    <View style={{ width: 38 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#3B82F6" />
                    <Text style={styles.loadingText}>Generating financial intelligence...</Text>
                </View>
            </AnimatedScreen>
        );
    }

    const { overview, cashFlow, spending, budget, recurring, loans, groups, period, diagnostics, state: reportState } = reportData;

    return (
        <AnimatedScreen style={styles.container}>
            {/* Top Navigation Header with Back Button and Period Selector */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) + 12 }]}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.navBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <ArrowLeft size={20} color="#F8FAFC" />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <Text style={styles.headerTitle}>Reports</Text>
                    <PeriodSelector
                        currentPeriodKey={selectedPeriod}
                        onSelectPeriod={setSelectedPeriod}
                    />
                </View>

                <TouchableOpacity
                    onPress={() => setIsDrawerOpen(true)}
                    style={styles.navBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    accessibilityLabel="Open drawer menu"
                    accessibilityRole="button"
                >
                    <Menu size={20} color="#F8FAFC" />
                </TouchableOpacity>
            </View>

            {/* Segmented Section Switcher */}
            <ReportsSegmentedTabs
                activeSection={activeSection}
                onSelectSection={setActiveSection}
            />

            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#3B82F6"
                        colors={['#3B82F6']}
                    />
                }
            >
                {/* 1. OVERVIEW DASHBOARD */}
                {activeSection === ReportSection.OVERVIEW && (
                    <View style={styles.sectionContainer}>
                        {/* Net Worth Hero Card & Multi-Domain Synchronized Health */}
                        {overview.netWorth && (
                            <View style={styles.netWorthCard}>
                                <View style={styles.netWorthHeaderRow}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <View style={[styles.iconSmallBadge, { backgroundColor: '#6366F120' }]}>
                                            <Shield size={16} color="#818CF8" />
                                        </View>
                                        <Text style={styles.netWorthLabel}>TOTAL NET WORTH</Text>
                                    </View>
                                    <View style={[
                                        styles.statusBadgeSmall,
                                        { backgroundColor: overview.netWorth.status === 'AVAILABLE' ? '#10B98120' : '#F59E0B20' }
                                    ]}>
                                        <Text style={[
                                            styles.statusBadgeTextSmall,
                                            { color: overview.netWorth.status === 'AVAILABLE' ? '#10B981' : '#F59E0B' }
                                        ]}>
                                            {overview.netWorth.status}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.netWorthValueText}>{overview.netWorth.amountFormatted}</Text>
                                {overview.netWorth.reason && (
                                    <View style={styles.partialBanner}>
                                        <AlertTriangle size={12} color="#F59E0B" />
                                        <Text style={styles.partialBannerText}>{overview.netWorth.reason}</Text>
                                    </View>
                                )}
                                <View style={styles.assetsLiabilitiesGrid}>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridItemLabel}>Liquid Cash</Text>
                                        <Text style={styles.gridItemValue}>{overview.liquidCash?.amountFormatted || '—'}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridItemLabel}>Investments</Text>
                                        <Text style={styles.gridItemValue}>{overview.investments?.amountFormatted || '—'}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridItemLabel}>Assets</Text>
                                        <Text style={styles.gridItemValue}>{overview.physicalAssets?.amountFormatted || '—'}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridItemLabel}>Properties</Text>
                                        <Text style={styles.gridItemValue}>{overview.properties?.amountFormatted || '—'}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridItemLabel}>Formal Debt</Text>
                                        <Text style={[styles.gridItemValue, { color: '#EF4444' }]}>{overview.formalDebt?.amountFormatted || '—'}</Text>
                                    </View>
                                    <View style={styles.gridItem}>
                                        <Text style={styles.gridItemLabel}>P2P Net</Text>
                                        <Text style={styles.gridItemValue}>{overview.p2pReceivables?.amountFormatted || '—'}</Text>
                                    </View>
                                </View>
                                {overview.dataAvailabilitySummary && (
                                    <View style={styles.syncStatusFooter}>
                                        <CheckCircle2 size={12} color="#10B981" />
                                        <Text style={styles.syncStatusText}>
                                            {overview.dataAvailabilitySummary.availableCount} of {overview.dataAvailabilitySummary.totalSources} financial modules synchronized
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Partial State Alert Hero Banner */}
                        {overview.status === 'PARTIAL' && overview.unavailableSources && overview.unavailableSources.length > 0 && (
                            <View style={styles.partialAlertCard}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                    <AlertTriangle size={16} color="#F59E0B" />
                                    <Text style={styles.partialAlertTitle}>Partial Reporting Data</Text>
                                </View>
                                <Text style={styles.partialAlertSubtitle}>
                                    The following modules could not be fully loaded into this report:
                                </Text>
                                {overview.unavailableSources.map((src, idx) => (
                                    <Text key={idx} style={styles.partialAlertItem}>
                                        • {src.name}: {src.errorReason}
                                    </Text>
                                ))}
                            </View>
                        )}

                        {/* Dual Row: Net Cash Flow + Total Spending */}
                        <View style={styles.dualCardRow}>
                            {/* Net Cash Flow Card */}
                            <TouchableOpacity
                                style={[styles.metricCard, styles.flex1]}
                                onPress={() => setActiveSection(ReportSection.CASH_FLOW)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardHeaderSmall}>
                                    <View style={[styles.iconSmallBadge, { backgroundColor: '#10B98115' }]}>
                                        <TrendingUp size={14} color="#10B981" />
                                    </View>
                                    <Text style={styles.cardLabelSmall}>Net Cash Flow</Text>
                                </View>
                                <Text style={styles.metricBigGreen}>{overview.netCashFlow.amountFormatted}</Text>
                                {overview.netCashFlow.comparisonAvailable ? (
                                    <View style={styles.badgeRow}>
                                        <View style={[
                                            styles.growthBadge,
                                            overview.netCashFlow.direction === 'DOWN' && { backgroundColor: '#EF444420' }
                                        ]}>
                                            <Text style={[
                                                styles.growthBadgeText,
                                                overview.netCashFlow.direction === 'DOWN' && { color: '#EF4444' }
                                            ]}>
                                                {overview.netCashFlow.growthPercentFormatted}
                                            </Text>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.comparisonUnavailableRow}>
                                        <Text style={styles.comparisonUnavailableText}>
                                            {overview.netCashFlow.isEmpty ? 'No cash flow recorded' : 'Previous-period comparison unavailable'}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.cardFootnote}>
                                    <Text style={styles.subtleText}>Income {overview.netCashFlow.incomeFormatted}</Text>
                                    <Text style={styles.subtleText}>Expenses {overview.netCashFlow.expenseFormatted}</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Total Spending Card */}
                            <TouchableOpacity
                                style={[styles.metricCard, styles.flex1]}
                                onPress={() => setActiveSection(ReportSection.SPENDING)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardHeaderSmall}>
                                    <View style={[styles.iconSmallBadge, { backgroundColor: '#F9731615' }]}>
                                        <DollarSign size={14} color="#F97316" />
                                    </View>
                                    <Text style={styles.cardLabelSmall}>Total Spending</Text>
                                </View>
                                <Text style={styles.metricBigWhite}>{overview.spending.totalFormatted}</Text>
                                {overview.spending.comparisonAvailable ? (
                                    <>
                                        <View style={styles.badgeRow}>
                                            <View style={[
                                                styles.declineBadge,
                                                overview.spending.direction === 'UP' && { backgroundColor: '#EF444420' }
                                            ]}>
                                                <Text style={[
                                                    styles.declineBadgeText,
                                                    overview.spending.direction === 'UP' && { color: '#EF4444' }
                                                ]}>
                                                    {overview.spending.percentFormatted} {overview.spending.direction === 'UP' ? 'higher' : 'lower'}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={styles.subtleTextRight}>{overview.spending.vsPeriod}</Text>
                                    </>
                                ) : (
                                    <View style={styles.comparisonUnavailableRow}>
                                        <Text style={styles.comparisonUnavailableText}>
                                            {overview.spending.isEmpty ? 'No spending recorded' : 'Previous-period comparison unavailable'}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>

                        {/* Dual Row: Debt Position + Group Position */}
                        <View style={styles.dualCardRow}>
                            {/* Debt Position */}
                            <TouchableOpacity
                                style={[styles.metricCard, styles.flex1]}
                                onPress={() => setActiveSection(ReportSection.DEBT)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardHeaderSmall}>
                                    <View style={[styles.iconSmallBadge, { backgroundColor: '#EF444415' }]}>
                                        <CreditCard size={14} color="#EF4444" />
                                    </View>
                                    <Text style={styles.cardLabelSmall}>Debt Position</Text>
                                </View>
                                <Text style={styles.metricMidBlue}>{overview.debtPosition.outstandingFormatted}</Text>
                                <Text style={styles.subtleLabel}>Outstanding</Text>
                                <View style={styles.dividerThin} />
                                <Text style={styles.subtleText}>EMI this month {overview.debtPosition.emiThisMonthFormatted}</Text>
                            </TouchableOpacity>

                            {/* Group Position */}
                            <TouchableOpacity
                                style={[styles.metricCard, styles.flex1]}
                                onPress={() => setActiveSection(ReportSection.GROUPS)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.cardHeaderSmall}>
                                    <View style={[styles.iconSmallBadge, { backgroundColor: '#8B5CF615' }]}>
                                        <Users size={14} color="#8B5CF6" />
                                    </View>
                                    <Text style={styles.cardLabelSmall}>Group Position</Text>
                                </View>
                                <View style={styles.groupOweRow}>
                                    <Text style={styles.groupOweSubtle}>You owe</Text>
                                    <Text style={styles.groupOweRed}>{overview.groupPosition.youOweFormatted}</Text>
                                </View>
                                <View style={styles.groupOweRow}>
                                    <Text style={styles.groupOweSubtle}>Others owe you</Text>
                                    <Text style={styles.groupOweGreen}>{overview.groupPosition.othersOweYouFormatted}</Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Top Spending Categories Card */}
                        <TouchableOpacity
                            style={styles.cardLarge}
                            onPress={() => setActiveSection(ReportSection.SPENDING)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cardSectionTitle}>Top Spending Categories</Text>
                            {overview.topCategories && overview.topCategories.length > 0 ? (
                                overview.topCategories.map((cat, idx) => (
                                    <View key={idx} style={styles.categoryRow}>
                                        <View style={styles.categoryLeft}>
                                            <View style={[styles.catIconCircle, { backgroundColor: `${cat.color}20` }]}>
                                                <Text style={styles.catEmoji}>{_getCategoryEmoji(cat.name)}</Text>
                                            </View>
                                            <Text style={styles.catNameText}>{cat.name}</Text>
                                        </View>
                                        <View style={styles.categoryRight}>
                                            <Text style={styles.catAmountText}>{cat.amountFormatted}</Text>
                                            <Text style={styles.catPctText}>{cat.percentage}%</Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <View style={styles.emptyInlineBox}>
                                    <Text style={styles.emptyInlineText}>No categorized expenses in this period</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                )}

                {/* 2. CASH FLOW REPORT */}
                {activeSection === ReportSection.CASH_FLOW && (
                    <View style={styles.sectionContainer}>
                        {/* Sub-tabs */}
                        <View style={styles.subTabRow}>
                            {['Summary', 'Trends', 'By Account'].map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.subTabPill, cashFlowSubTab === tab && styles.subTabPillActive]}
                                    onPress={() => setCashFlowSubTab(tab)}
                                >
                                    <Text style={[styles.subTabText, cashFlowSubTab === tab && styles.subTabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Empty notice if no cash flow */}
                        {cashFlow.isEmpty && (
                            <View style={styles.emptyNoticeBox}>
                                <AlertTriangle size={16} color="#3B82F6" />
                                <Text style={styles.emptyNoticeText}>
                                    No cash flow transactions recorded for this period. Cash flow intervals will populate as income or expenses are added.
                                </Text>
                            </View>
                        )}

                        {/* Income vs Expenses Bar Chart */}
                        <CashFlowBarChart data={cashFlow.chartData} isEmpty={cashFlow.isEmpty} />

                        {/* Metrics Breakdown Table */}
                        <View style={styles.cardLarge}>
                            <View style={styles.metricTableRow}>
                                <View style={styles.rowLeft}>
                                    <ArrowUpRight size={18} color="#10B981" />
                                    <Text style={styles.tableRowLabel}>Income</Text>
                                </View>
                                <Text style={styles.tableRowAmount}>{cashFlow.incomeFormatted}</Text>
                            </View>
                            <View style={styles.dividerThin} />

                            <View style={styles.metricTableRow}>
                                <View style={styles.rowLeft}>
                                    <ArrowDownLeft size={18} color="#EF4444" />
                                    <Text style={styles.tableRowLabel}>Expenses</Text>
                                </View>
                                <Text style={styles.tableRowAmount}>{cashFlow.expenseFormatted}</Text>
                            </View>
                            <View style={styles.dividerThin} />

                            <View style={styles.metricTableRow}>
                                <View style={styles.rowLeft}>
                                    <Repeat size={18} color="#3B82F6" />
                                    <Text style={styles.tableRowLabel}>Transfers</Text>
                                </View>
                                <Text style={styles.tableRowAmount}>{cashFlow.transfersFormatted}</Text>
                            </View>
                            <View style={styles.dividerThin} />

                            <View style={styles.metricTableRow}>
                                <View style={styles.rowLeft}>
                                    <RotateCcw size={18} color="#F59E0B" />
                                    <Text style={styles.tableRowLabel}>Refunds</Text>
                                </View>
                                <Text style={styles.tableRowAmount}>{cashFlow.refundsFormatted}</Text>
                            </View>
                            <View style={styles.dividerThin} />

                            <View style={[styles.metricTableRow, styles.highlightRow]}>
                                <Text style={styles.netFlowTitle}>Net Cash Flow</Text>
                                <Text style={styles.netFlowGreen}>{cashFlow.netFlowFormatted}</Text>
                            </View>
                        </View>

                        {/* Transfer Isolation Notice */}
                        <View style={styles.disclaimerBox}>
                            <Lightbulb size={16} color="#3B82F6" />
                            <Text style={styles.disclaimerText}>{cashFlow.disclaimer}</Text>
                        </View>
                    </View>
                )}

                {/* 3. SPENDING ANALYSIS */}
                {activeSection === ReportSection.SPENDING && (
                    <View style={styles.sectionContainer}>
                        {/* Sub-tabs */}
                        <View style={styles.subTabRow}>
                            {['By Category', 'By Merchant', 'By Account'].map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.subTabPill, spendingSubTab === tab && styles.subTabPillActive]}
                                    onPress={() => setSpendingSubTab(tab)}
                                >
                                    <Text style={[styles.subTabText, spendingSubTab === tab && styles.subTabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {spending.isEmpty ? (
                            <View style={styles.emptyStateCard}>
                                <DollarSign size={28} color="#71717A" />
                                <Text style={styles.emptyStateTitle}>No Spending Data</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    No expenses found for {period?.label || 'this period'}. Log an expense in Money Flow to see your category and merchant breakdown.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Donut Chart */}
                                <SpendingDonutChart
                                    totalFormatted={spending.totalFormatted}
                                    categories={spending.categories}
                                    isEmpty={spending.isEmpty}
                                />

                                {/* Category List */}
                                <View style={styles.cardLarge}>
                                    {spending.categories.map((cat, idx) => (
                                        <View key={idx} style={styles.catDetailRow}>
                                            <View style={styles.catDetailLeft}>
                                                <View style={[styles.dotSmall, { backgroundColor: cat.color }]} />
                                                <Text style={styles.catDetailName}>{cat.name}</Text>
                                            </View>
                                            <View style={styles.catDetailRight}>
                                                <Text style={styles.catDetailAmount}>{cat.amountFormatted}</Text>
                                                <Text style={styles.catDetailPct}>{cat.percentage}%</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                {/* Largest Transactions */}
                                <View style={styles.cardLarge}>
                                    <View style={styles.sectionHeaderBetween}>
                                        <Text style={styles.cardSectionTitle}>Largest Transactions</Text>
                                        <Text style={styles.seeAllLink}>See All</Text>
                                    </View>

                                    {spending.largestTransactions && spending.largestTransactions.length > 0 ? (
                                        spending.largestTransactions.map((tx, idx) => (
                                            <View key={idx} style={styles.txnRow}>
                                                <View style={styles.merchantLogoCircle}>
                                                    <Text style={styles.merchantLogoText}>{tx.merchant[0]}</Text>
                                                </View>
                                                <View style={styles.txnCenter}>
                                                    <Text style={styles.txnMerchant}>{tx.merchant}</Text>
                                                    <Text style={styles.txnDate}>{tx.date}</Text>
                                                </View>
                                                <Text style={styles.txnAmount}>{tx.amountFormatted}</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.emptyInlineBox}>
                                            <Text style={styles.emptyInlineText}>No individual transactions in this period</Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* 4. BUDGET PERFORMANCE */}
                {activeSection === ReportSection.BUDGET && (
                    <View style={styles.sectionContainer}>
                        {/* Sub-tabs */}
                        <View style={styles.subTabRow}>
                            {['Overview', 'By Category', 'Forecast'].map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.subTabPill, budgetSubTab === tab && styles.subTabPillActive]}
                                    onPress={() => setBudgetSubTab(tab)}
                                >
                                    <Text style={[styles.subTabText, budgetSubTab === tab && styles.subTabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {budget.isEmpty ? (
                            <View style={styles.emptyStateCard}>
                                <AlertTriangle size={28} color="#F59E0B" />
                                <Text style={styles.emptyStateTitle}>No Active Budgets</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    No category budgets configured for {period?.label || 'this period'}. Set spending limits in the Budget module to monitor performance and track variances.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Provenance Banner */}
                                <View style={styles.budgetProvenanceBanner}>
                                    <CheckCircle2 size={14} color="#10B981" />
                                    <Text style={styles.budgetProvenanceText}>
                                        Actual spending from {budget.source || 'Cashbook'} · Period: {budget.periodLabel || period?.label}
                                    </Text>
                                </View>

                                {/* Radial Gauge */}
                                <BudgetRadialGauge
                                    utilizationPercent={budget.utilizationPercent}
                                    spentFormatted={budget.totalSpentFormatted}
                                    totalBudgetFormatted={budget.totalBudgetFormatted}
                                    remainingFormatted={budget.remainingFormatted}
                                />

                                {/* Category Progress Bars */}
                                <View style={styles.cardLarge}>
                                    {budget.categories.map((c, idx) => (
                                        <CategoryProgressBar
                                            key={idx}
                                            category={c.category}
                                            spentFormatted={c.spentFormatted}
                                            limitFormatted={c.limitFormatted}
                                            utilizationPercent={c.utilizationPercent}
                                            isOverBudget={c.isOverBudget}
                                            color={c.color}
                                        />
                                    ))}
                                </View>

                                {/* Unmatched Operating Expenses Box */}
                                {budget.unmatchedCount > 0 && (
                                    <View style={styles.unmatchedBox}>
                                        <AlertTriangle size={16} color="#F59E0B" />
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.unmatchedTitle}>
                                                Unbudgeted Operating Expenses: {budget.unmatchedExpensesFormatted}
                                            </Text>
                                            <Text style={styles.unmatchedSubtitle}>
                                                {budget.unmatchedCount} transaction(s) were not matched to any configured budget category and are tracked separately.
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Advisory Insight Box */}
                                <View style={styles.advisoryBox}>
                                    <Lightbulb size={18} color="#F59E0B" />
                                    <Text style={styles.advisoryText}>{budget.advisoryInsight}</Text>
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* 5. RECURRING PAYMENTS REPORT */}
                {activeSection === ReportSection.RECURRING && (
                    <View style={styles.sectionContainer}>
                        {/* Sub-tabs */}
                        <View style={styles.subTabRow}>
                            {['Active', 'Upcoming', 'Overdue', 'History'].map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.subTabPill, recurringSubTab === tab && styles.subTabPillActive]}
                                    onPress={() => setRecurringSubTab(tab)}
                                >
                                    <Text style={[styles.subTabText, recurringSubTab === tab && styles.subTabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {recurring.isEmpty ? (
                            <View style={styles.emptyStateCard}>
                                <Repeat size={28} color="#6366F1" />
                                <Text style={styles.emptyStateTitle}>No Recurring Commitments</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    No active subscriptions, utility bills, or recurring commitments tracked. Add commitments in the Recurring Commitments module to project your monthly and annualized obligations.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Monthly Recurring Total Card */}
                                <View style={styles.cardHighlight}>
                                    <Text style={styles.cardLabelSmall}>Monthly Recurring Total</Text>
                                    <Text style={styles.metricBigGreen}>{recurring.monthlyTotalFormatted}</Text>
                                </View>

                                {/* Commitments List */}
                                <View style={styles.cardLarge}>
                                    {recurring.commitments.map((item, idx) => (
                                        <View key={idx} style={styles.recurringItemRow}>
                                            <View style={[styles.recIconBox, { backgroundColor: `${item.color}20` }]}>
                                                {_renderIcon(item.icon, item.color)}
                                            </View>
                                            <View style={styles.recCenter}>
                                                <Text style={styles.recName}>{item.name}</Text>
                                                <Text style={styles.recAmount}>{item.amountFormatted} {item.period}</Text>
                                                <Text style={styles.recNext}>Next: {item.nextDate}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>

                                {/* Status Summary */}
                                <View style={styles.cardLarge}>
                                    <Text style={styles.cardSectionTitle}>Status Summary</Text>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                                        <Text style={styles.statusLabel}>Active</Text>
                                        <Text style={styles.statusCount}>{recurring.activeCount}</Text>
                                    </View>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                                        <Text style={styles.statusLabel}>Upcoming (next 30 days)</Text>
                                        <Text style={styles.statusCount}>{recurring.upcomingCount}</Text>
                                    </View>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                                        <Text style={styles.statusLabel}>Overdue</Text>
                                        <Text style={styles.statusCount}>{recurring.overdueCount}</Text>
                                    </View>
                                    <View style={styles.statusRow}>
                                        <View style={[styles.dot, { backgroundColor: '#71717A' }]} />
                                        <Text style={styles.statusLabel}>Cancelled</Text>
                                        <Text style={styles.statusCount}>{recurring.cancelledCount}</Text>
                                    </View>
                                </View>

                                {/* Annualized Cost */}
                                <View style={styles.cardHighlightBlue}>
                                    <Text style={styles.cardLabelSmall}>Annualized Recurring Cost</Text>
                                    <Text style={styles.metricBigBlue}>{recurring.annualizedCostFormatted}</Text>
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* 6. LOAN & DEBT REPORT */}
                {activeSection === ReportSection.DEBT && (
                    <View style={styles.sectionContainer}>
                        {/* Sub-tabs */}
                        <View style={styles.subTabRow}>
                            {['Summary', 'Loan Details', 'Payments'].map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.subTabPill, debtSubTab === tab && styles.subTabPillActive]}
                                    onPress={() => setDebtSubTab(tab)}
                                >
                                    <Text style={[styles.subTabText, debtSubTab === tab && styles.subTabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {loans.isEmpty ? (
                            <View style={styles.emptyStateCard}>
                                <CreditCard size={28} color="#10B981" />
                                <Text style={styles.emptyStateTitle}>No Active Debt or Loans</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    No formal loans or debt facilities recorded. You have zero debt liabilities for {period?.label || 'this period'}.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Total Outstanding Card */}
                                <View style={styles.cardHighlightRed}>
                                    <Text style={styles.cardLabelSmall}>Total Outstanding</Text>
                                    <Text style={styles.metricBigRed}>{loans.totalOutstandingFormatted}</Text>
                                </View>

                                {/* Period Metrics */}
                                <View style={styles.cardLarge}>
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Total Monthly EMI</Text>
                                        <Text style={styles.tableRowAmount}>{loans.monthlyEmiFormatted}</Text>
                                    </View>
                                    <View style={styles.dividerThin} />
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Principal Paid (This Period)</Text>
                                        <Text style={styles.tableRowAmount}>{loans.principalPaidFormatted}</Text>
                                    </View>
                                    <View style={styles.dividerThin} />
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Interest Paid (This Period)</Text>
                                        <Text style={styles.tableRowAmount}>{loans.interestPaidFormatted}</Text>
                                    </View>
                                    <View style={styles.dividerThin} />
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Contractual Tenure</Text>
                                        <Text style={styles.tableRowAmount}>{loans.contractualTenureFormatted || '—'}</Text>
                                    </View>
                                    <View style={styles.dividerThin} />
                                    <View style={styles.metricTableRow}>
                                        <View>
                                            <Text style={styles.tableRowLabel}>Remaining Tenure</Text>
                                            {loans.tenureNote && (
                                                <Text style={styles.tenureNoteText}>{loans.tenureNote}</Text>
                                            )}
                                        </View>
                                        <Text style={styles.tableRowAmount}>
                                            {loans.repaymentScheduleAvailable ? loans.remainingTenureFormatted : '—'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Loan-wise Outstanding */}
                                <View style={styles.cardLarge}>
                                    <Text style={styles.cardSectionTitle}>Loan-wise Outstanding</Text>
                                    {loans.facilities && loans.facilities.length > 0 ? (
                                        loans.facilities.map((fac, idx) => (
                                            <View key={idx} style={styles.loanRow}>
                                                <View style={styles.loanIconBox}>
                                                    <CreditCard size={18} color="#3B82F6" />
                                                </View>
                                                <View style={styles.loanCenter}>
                                                    <Text style={styles.loanName}>{fac.name}</Text>
                                                    <Text style={styles.loanEmi}>EMI: {fac.emiFormatted}</Text>
                                                </View>
                                                <Text style={styles.loanAmount}>{fac.outstandingFormatted}</Text>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.emptyInlineBox}>
                                            <Text style={styles.emptyInlineText}>No individual loan facilities listed</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Debt Reduction Trend */}
                                <DebtReductionChart trend={loans.debtReductionTrend} trendAvailable={loans.trendAvailable} />
                            </>
                        )}
                    </View>
                )}

                {/* 7. SHARED COSTS & GROUPS REPORT */}
                {activeSection === ReportSection.GROUPS && (
                    <View style={styles.sectionContainer}>
                        {/* Sub-tabs */}
                        <View style={styles.subTabRow}>
                            {['Summary', 'By Group', 'By Member'].map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.subTabPill, groupSubTab === tab && styles.subTabPillActive]}
                                    onPress={() => setGroupSubTab(tab)}
                                >
                                    <Text style={[styles.subTabText, groupSubTab === tab && styles.subTabTextActive]}>
                                        {tab}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {groups.isEmpty ? (
                            <View style={styles.emptyStateCard}>
                                <Users size={28} color="#EC4899" />
                                <Text style={styles.emptyStateTitle}>No Group Expenses</Text>
                                <Text style={styles.emptyStateSubtitle}>
                                    No shared expense groups or split settlements found for {period?.label || 'this period'}. Create a group in Shared Costs to track group balances and settlements.
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* Badges: You owe | Others owe you */}
                                <View style={styles.dualCardRow}>
                                    <View style={[styles.metricCard, styles.flex1]}>
                                        <Text style={styles.groupBadgeLabel}>You owe</Text>
                                        <Text style={styles.metricBigRed}>{groups.youOweFormatted}</Text>
                                    </View>
                                    <View style={[styles.metricCard, styles.flex1]}>
                                        <Text style={styles.groupBadgeLabel}>Others owe you</Text>
                                        <Text style={styles.metricBigGreen}>{groups.othersOweYouFormatted}</Text>
                                    </View>
                                </View>

                                {/* Signed Position Formula Diagnostic Card */}
                                <View style={styles.formulaCard}>
                                    <Text style={styles.formulaTitle}>Net Position Calculation</Text>
                                    <Text style={styles.formulaEquation}>
                                        Contributions ({groups.userContributionsFormatted}) − Share ({groups.userShareFormatted}) + Received ({groups.settlementsReceivedFormatted}) − Paid ({groups.settlementsPaidFormatted})
                                    </Text>
                                    <View style={styles.formulaResultRow}>
                                        <Text style={styles.formulaResultLabel}>Net Group Position:</Text>
                                        <Text style={[
                                            styles.formulaResultValue,
                                            { color: groups.netPositionDirection === 'RECEIVABLE' ? '#10B981' : '#EF4444' }
                                        ]}>
                                            {groups.netGroupPositionFormatted} ({groups.netPositionDirection === 'RECEIVABLE' ? 'You are owed' : 'You owe'})
                                        </Text>
                                    </View>
                                </View>

                                {/* Period Summary */}
                                <View style={styles.cardLarge}>
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Total Group Expenses</Text>
                                        <Text style={styles.tableRowAmount}>{groups.totalExpensesFormatted}</Text>
                                    </View>
                                    <View style={styles.dividerThin} />
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Your Contributions</Text>
                                        <Text style={styles.tableRowAmount}>{groups.userContributionsFormatted}</Text>
                                    </View>
                                    <View style={styles.dividerThin} />
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Your Share</Text>
                                        <Text style={styles.tableRowAmount}>{groups.userShareFormatted}</Text>
                                    </View>
                                    <View style={styles.dividerThin} />
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Settlements Paid</Text>
                                        <Text style={styles.tableRowAmount}>{groups.settlementsPaidFormatted}</Text>
                                    </View>
                                    <View style={styles.dividerThin} />
                                    <View style={styles.metricTableRow}>
                                        <Text style={styles.tableRowLabel}>Settlements Received</Text>
                                        <Text style={styles.tableRowAmount}>{groups.settlementsReceivedFormatted}</Text>
                                    </View>
                                </View>

                                {/* Group-wise Summary */}
                                <View style={styles.cardLarge}>
                                    <Text style={styles.cardSectionTitle}>Group-wise Summary</Text>
                                    {groups.groups && groups.groups.length > 0 ? (
                                        groups.groups.map((grp, idx) => (
                                            <View key={idx} style={styles.groupRow}>
                                                <View style={styles.groupAvatarCircle}>
                                                    <Users size={16} color="#EC4899" />
                                                </View>
                                                <View style={styles.groupRowCenter}>
                                                    <Text style={styles.groupRowName}>{grp.name}</Text>
                                                    <Text style={[styles.groupRowStatus, grp.netBalancePaise < 0 ? styles.textRed : styles.textGreen]}>
                                                        {grp.statusText}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.emptyInlineBox}>
                                            <Text style={styles.emptyInlineText}>No active groups found</Text>
                                        </View>
                                    )}
                                </View>

                                {/* Recent Settlements */}
                                <View style={styles.cardLarge}>
                                    <Text style={styles.cardSectionTitle}>Recent Settlements</Text>
                                    {groups.recentSettlements && groups.recentSettlements.length > 0 ? (
                                        groups.recentSettlements.map((stl, idx) => (
                                            <View key={idx} style={styles.settlementRow}>
                                                <View style={styles.settlementAvatar}>
                                                    <Text style={styles.settlementAvatarText}>{stl.from[0]}</Text>
                                                </View>
                                                <View style={styles.settlementCenter}>
                                                    <Text style={styles.settlementParty}>{stl.from} → {stl.to}</Text>
                                                    <Text style={styles.settlementDate}>{stl.date}</Text>
                                                </View>
                                                <View style={styles.settlementRight}>
                                                    <Text style={styles.settlementAmount}>{stl.amountFormatted}</Text>
                                                    <View style={styles.settlementMethodBadge}>
                                                        <Text style={styles.settlementMethodText}>Paid via {stl.method}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))
                                    ) : (
                                        <View style={styles.emptyInlineBox}>
                                            <Text style={styles.emptyInlineText}>No settlements recorded in this period</Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        )}
                    </View>
                )}

                {/* 8. RECONCILIATION DIAGNOSTICS & LEDGER HEALTH (8TH SCREEN) */}
                {activeSection === ReportSection.DIAGNOSTICS && diagnostics && (
                    <View style={styles.sectionContainer}>
                        {/* Health Status Card */}
                        <View style={[styles.cardHighlight, { borderColor: diagnostics.allInvariantsSatisfied ? '#10B981' : '#EF4444', borderWidth: 1 }]}>
                            <View style={styles.diagHeaderRow}>
                                <Shield size={22} color={diagnostics.allInvariantsSatisfied ? '#10B981' : '#EF4444'} />
                                <Text style={[styles.diagStatusTitle, { color: diagnostics.allInvariantsSatisfied ? '#10B981' : '#EF4444' }]}>
                                    {diagnostics.allInvariantsSatisfied ? 'Ledger Reconciled & Healthy' : 'Reconciliation Discrepancy Detected'}
                                </Text>
                            </View>
                            <Text style={styles.subtleText}>
                                {diagnostics.allInvariantsSatisfied
                                    ? 'Confirms all seven reporting invariants pass with exact integer paise precision.'
                                    : `${diagnostics.passedChecksCount} of ${diagnostics.totalChecksCount} reporting invariants verified with exact integer paise precision.`}
                            </Text>
                        </View>

                        {/* Accounting Breakdown Summary */}
                        <View style={styles.cardLarge}>
                            <Text style={styles.cardSectionTitle}>Reconciliation Balance Ledger</Text>
                            <View style={styles.metricTableRow}>
                                <Text style={styles.tableRowLabel}>Categorized Expenses</Text>
                                <Text style={styles.tableRowAmount}>{diagnostics.categorizedExpensesFormatted}</Text>
                            </View>
                            <View style={styles.dividerThin} />
                            <View style={styles.metricTableRow}>
                                <Text style={styles.tableRowLabel}>Uncategorized Expenses</Text>
                                <Text style={styles.tableRowAmount}>{diagnostics.uncategorizedExpensesFormatted}</Text>
                            </View>
                            <View style={styles.dividerThin} />
                            <View style={styles.metricTableRow}>
                                <Text style={styles.tableRowLabel}>Total Operating Expenses</Text>
                                <Text style={[styles.tableRowAmount, { color: '#EF4444' }]}>{diagnostics.totalExpensesFormatted}</Text>
                            </View>
                            <View style={styles.dividerThin} />
                            <View style={styles.metricTableRow}>
                                <Text style={styles.tableRowLabel}>Net Cash Flow</Text>
                                <Text style={[styles.tableRowAmount, { color: '#10B981' }]}>{diagnostics.netCashFlowFormatted}</Text>
                            </View>
                        </View>

                        {/* Invariants Audit Table */}
                        <View style={styles.cardLarge}>
                            <Text style={styles.cardSectionTitle}>Mathematical Invariants Checklist</Text>
                            {diagnostics.checks.map((check, idx) => (
                                <View key={idx} style={styles.diagCheckItem}>
                                    <View style={styles.diagCheckTop}>
                                        <View style={[styles.diagIconBadge, { backgroundColor: check.passed ? '#10B98120' : '#EF444420' }]}>
                                            {check.passed ? <CheckCircle2 size={16} color="#10B981" /> : <AlertTriangle size={16} color="#EF4444" />}
                                        </View>
                                        <View style={styles.diagCheckInfo}>
                                            <Text style={styles.diagCheckName}>{check.name}</Text>
                                            <Text style={styles.diagCheckId}>{check.id}</Text>
                                        </View>
                                        <View style={[styles.diagBadge, { backgroundColor: check.passed ? '#10B98115' : '#EF444415' }]}>
                                            <Text style={[styles.diagBadgeText, { color: check.passed ? '#10B981' : '#EF4444' }]}>
                                                {check.passed ? 'PASSED' : 'FAILED'}
                                            </Text>
                                        </View>
                                    </View>
                                    {check.differencePaise && check.differencePaise !== '0' && (
                                        <Text style={styles.diagDiffText}>Discrepancy: {check.differencePaise} paise</Text>
                                    )}
                                    {idx < diagnostics.checks.length - 1 && <View style={styles.dividerThin} />}
                                </View>
                            ))}
                        </View>

                        {/* Timestamps & Cache Provenance */}
                        <View style={styles.cardLarge}>
                            <Text style={styles.cardSectionTitle}>Query & Cache Provenance</Text>
                            <View style={styles.metricTableRow}>
                                <Text style={styles.tableRowLabel}>Reporting Period</Text>
                                <Text style={styles.tableRowAmount}>{diagnostics.reportingPeriod || period?.label}</Text>
                            </View>
                            <View style={styles.dividerThin} />
                            <View style={styles.metricTableRow}>
                                <Text style={styles.tableRowLabel}>Query Executed At</Text>
                                <Text style={styles.tableRowAmountSubtle}>{diagnostics.queryExecutedAt || 'Realtime'}</Text>
                            </View>
                            <View style={styles.dividerThin} />
                            <View style={styles.metricTableRow}>
                                <Text style={styles.tableRowLabel}>Cache Generated At</Text>
                                <Text style={styles.tableRowAmountSubtle}>{diagnostics.cacheGeneratedAt || 'Realtime'}</Text>
                            </View>
                        </View>

                        {/* Domain Source Health (11 Modules) */}
                        <View style={styles.cardLarge}>
                            <Text style={styles.cardSectionTitle}>Domain Source Health (11 Modules)</Text>
                            {(diagnostics.domainSources || []).map((dom, idx) => (
                                <View key={idx} style={styles.domainSourceItem}>
                                    <View style={styles.domainSourceTop}>
                                        <Text style={styles.domainSourceName}>{dom.name}</Text>
                                        <View style={[
                                            styles.statusBadgeSmall,
                                            { backgroundColor: dom.status === 'AVAILABLE' ? '#10B98120' : (dom.status === 'EMPTY' ? '#3B82F620' : '#F59E0B20') }
                                        ]}>
                                            <Text style={[
                                                styles.statusBadgeTextSmall,
                                                { color: dom.status === 'AVAILABLE' ? '#10B981' : (dom.status === 'EMPTY' ? '#3B82F6' : '#F59E0B') }
                                            ]}>
                                                {dom.status}
                                            </Text>
                                        </View>
                                    </View>
                                    <View style={styles.domainSourceDetails}>
                                        <Text style={styles.domainSourceMeta}>
                                            Records: {dom.recordsProcessedCount !== null && dom.recordsProcessedCount !== undefined ? dom.recordsProcessedCount : '—'}
                                        </Text>
                                        <Text style={styles.domainSourceMeta}>
                                            Last Sync: {dom.lastSynchronizedAt || '—'}
                                        </Text>
                                    </View>
                                    {dom.errorReason && (
                                        <Text style={styles.domainSourceError}>Reason: {dom.errorReason}</Text>
                                    )}
                                    {idx < (diagnostics.domainSources.length - 1) && <View style={styles.dividerThin} />}
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>
        </AnimatedScreen>
    );
}

// ── Emoji & Icon Helpers ──────────────────────────────────────────
function _getCategoryEmoji(name) {
    switch (name) {
        case 'Housing': return '🏠';
        case 'Food': return '🍽️';
        case 'Transport': return '🚗';
        case 'Education': return '🎓';
        case 'Health': return '💊';
        default: return '📦';
    }
}

function _renderIcon(iconName, color) {
    switch (iconName) {
        case 'Home': return <Home size={18} color={color} />;
        case 'CreditCard': return <CreditCard size={18} color={color} />;
        case 'GraduationCap': return <GraduationCap size={18} color={color} />;
        case 'Play': return <Play size={18} color={color} />;
        default: return <Clock size={18} color={color} />;
    }
}

// ── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#09090B'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 16
    },
    navBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    headerCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF'
    },
    scrollArea: {
        flex: 1
    },
    scrollContent: {
        paddingHorizontal: 20
    },
    sectionContainer: {
        gap: 16
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12
    },
    loadingText: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600'
    },

    // Sub Tabs
    subTabRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 8
    },
    subTabPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#18181B',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    subTabPillActive: {
        backgroundColor: '#27272A',
        borderColor: '#3B82F6'
    },
    subTabText: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600'
    },
    subTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },

    // Cards
    dualCardRow: {
        flexDirection: 'row',
        gap: 12
    },
    flex1: {
        flex: 1
    },
    metricCard: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    cardLarge: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    cardHighlight: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#10B98140'
    },
    cardHighlightBlue: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#3B82F640'
    },
    cardHighlightRed: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#EF444440'
    },
    cardHeaderSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8
    },
    iconSmallBadge: {
        width: 22,
        height: 22,
        borderRadius: 6,
        alignItems: 'center',
        justifyContent: 'center'
    },
    cardLabelSmall: {
        fontSize: 11,
        color: '#A1A1AA',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    metricBigGreen: {
        fontSize: 22,
        fontWeight: '900',
        color: '#10B981',
        letterSpacing: -0.5
    },
    metricBigWhite: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    metricBigBlue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#60A5FA',
        letterSpacing: -0.5
    },
    metricBigRed: {
        fontSize: 22,
        fontWeight: '900',
        color: '#EF4444',
        letterSpacing: -0.5
    },
    metricMidBlue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#60A5FA',
        letterSpacing: -0.5
    },
    subtleLabel: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '600',
        marginBottom: 8
    },
    subtleText: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '500'
    },
    subtleTextRight: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '500',
        textAlign: 'right',
        marginTop: 4
    },
    badgeRow: {
        flexDirection: 'row',
        marginVertical: 4
    },
    growthBadge: {
        backgroundColor: '#10B98120',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6
    },
    growthBadgeText: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '700'
    },
    declineBadge: {
        backgroundColor: '#F9731620',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6
    },
    declineBadgeText: {
        fontSize: 10,
        color: '#F97316',
        fontWeight: '700'
    },
    progressBarWrapper: {
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 8
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3
    },
    cardFootnote: {
        marginTop: 8,
        gap: 2
    },
    dividerThin: {
        height: 1,
        backgroundColor: '#27272A',
        marginVertical: 8
    },
    groupOweRow: {
        marginTop: 6
    },
    groupOweSubtle: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '600'
    },
    groupOweRed: {
        fontSize: 14,
        fontWeight: '800',
        color: '#EF4444'
    },
    groupOweGreen: {
        fontSize: 14,
        fontWeight: '800',
        color: '#10B981'
    },
    groupBadgeLabel: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '700',
        marginBottom: 4
    },

    // Category List
    cardSectionTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 14
    },
    sectionHeaderBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    seeAllLink: {
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '700'
    },
    categoryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8
    },
    categoryLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    catIconCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    catEmoji: {
        fontSize: 14
    },
    catNameText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    categoryRight: {
        alignItems: 'flex-end'
    },
    catAmountText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    catPctText: {
        fontSize: 11,
        color: '#71717A',
        fontWeight: '600'
    },

    // Table Row
    metricTableRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    tableRowLabel: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    tableRowAmount: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    highlightRow: {
        backgroundColor: '#10B98110',
        marginHorizontal: -16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 6
    },
    netFlowTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    netFlowGreen: {
        fontSize: 18,
        fontWeight: '900',
        color: '#10B981'
    },
    disclaimerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#1E3A8A20',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1E40AF40'
    },
    disclaimerText: {
        flex: 1,
        fontSize: 12,
        color: '#93C5FD',
        fontWeight: '500',
        lineHeight: 16
    },

    // Category Detail Rows
    catDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 10
    },
    catDetailLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    dotSmall: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    catDetailName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF'
    },
    catDetailRight: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'center'
    },
    catDetailAmount: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    catDetailPct: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600',
        width: 32,
        textAlign: 'right'
    },

    // Transactions List
    txnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    merchantLogoCircle: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#F59E0B20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    merchantLogoText: {
        fontSize: 16,
        fontWeight: '800',
        color: '#F59E0B'
    },
    txnCenter: {
        flex: 1
    },
    txnMerchant: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    txnDate: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 2
    },
    txnAmount: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF'
    },

    // Advisory Box
    advisoryBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#F59E0B15',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F59E0B30'
    },
    advisoryText: {
        flex: 1,
        fontSize: 12,
        color: '#FCD34D',
        fontWeight: '600',
        lineHeight: 16
    },

    // Recurring Items
    recurringItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    recIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14
    },
    recCenter: {
        flex: 1
    },
    recName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    recAmount: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
        marginTop: 2
    },
    recNext: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 2
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 10
    },
    statusLabel: {
        flex: 1,
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    statusCount: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF'
    },

    // Loans
    loanRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    loanIconBox: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: '#3B82F615',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    loanCenter: {
        flex: 1
    },
    loanName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    loanEmi: {
        fontSize: 12,
        color: '#71717A',
        marginTop: 2
    },
    loanAmount: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF'
    },

    // Groups
    groupRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    groupAvatarCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#EC489915',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    groupRowCenter: {
        flex: 1
    },
    groupRowName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    groupRowStatus: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 2
    },
    textRed: {
        color: '#EF4444'
    },
    textGreen: {
        color: '#10B981'
    },
    settlementRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10
    },
    settlementAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3B82F620',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    settlementAvatarText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#60A5FA'
    },
    settlementCenter: {
        flex: 1
    },
    settlementParty: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    settlementDate: {
        fontSize: 11,
        color: '#71717A',
        marginTop: 2
    },
    settlementRight: {
        alignItems: 'flex-end',
        gap: 4
    },
    settlementAmount: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    settlementMethodBadge: {
        backgroundColor: '#10B98115',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6
    },
    settlementMethodText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '700'
    },

    // Diagnostics View
    diagHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8
    },
    diagStatusTitle: {
        fontSize: 16,
        fontWeight: '800'
    },
    diagCheckItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    diagCheckTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    diagIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    diagCheckInfo: {
        flex: 1
    },
    diagCheckName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F4F4F5'
    },
    diagCheckId: {
        fontSize: 11,
        fontWeight: '600',
        color: '#71717A',
        marginTop: 2
    },
    diagBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    diagBadgeText: {
        fontSize: 11,
        fontWeight: '800'
    },
    diagDiffText: {
        fontSize: 12,
        color: '#EF4444',
        marginTop: 4,
        fontWeight: '600'
    },
    netWorthCard: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 16
    },
    netWorthHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    netWorthLabel: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#A1A1AA'
    },
    statusBadgeSmall: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    statusBadgeTextSmall: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8
    },
    netWorthValueText: {
        fontSize: 28,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5,
        marginBottom: 12
    },
    partialBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F59E0B15',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        marginBottom: 12
    },
    partialBannerText: {
        fontSize: 11,
        color: '#F59E0B',
        fontWeight: '600'
    },
    assetsLiabilitiesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    gridItem: {
        width: '31%',
        paddingVertical: 6
    },
    gridItemLabel: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '700',
        marginBottom: 2
    },
    gridItemValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#E4E4E7'
    },
    syncStatusFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    syncStatusText: {
        fontSize: 10,
        color: '#10B981',
        fontWeight: '600'
    },
    emptyStateCard: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 16
    },
    emptyStateTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 12,
        marginBottom: 6
    },
    emptyStateSubtitle: {
        fontSize: 12,
        color: '#71717A',
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 280
    },
    emptyInlineBox: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyInlineText: {
        fontSize: 12,
        color: '#71717A',
        fontStyle: 'italic'
    },
    emptyNoticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#3B82F615',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#3B82F630'
    },
    emptyNoticeText: {
        flex: 1,
        fontSize: 12,
        color: '#93C5FD',
        lineHeight: 16
    },
    partialAlertCard: {
        backgroundColor: '#F59E0B10',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#F59E0B30',
        marginBottom: 16
    },
    partialAlertTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#F59E0B'
    },
    partialAlertSubtitle: {
        fontSize: 11,
        color: '#A1A1AA',
        marginBottom: 6
    },
    partialAlertItem: {
        fontSize: 11,
        color: '#FCD34D',
        lineHeight: 16
    },
    comparisonUnavailableRow: {
        marginTop: 6,
        marginBottom: 6
    },
    comparisonUnavailableText: {
        fontSize: 11,
        color: '#71717A',
        fontStyle: 'italic'
    },
    budgetProvenanceBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#10B98115',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#10B98130'
    },
    budgetProvenanceText: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '600'
    },
    unmatchedBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#F59E0B10',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F59E0B30'
    },
    unmatchedTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F59E0B',
        marginBottom: 2
    },
    unmatchedSubtitle: {
        fontSize: 11,
        color: '#A1A1AA',
        lineHeight: 15
    },
    tenureNoteText: {
        fontSize: 10,
        color: '#F59E0B',
        marginTop: 2,
        fontStyle: 'italic'
    },
    formulaCard: {
        backgroundColor: '#18181B',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 16
    },
    formulaTitle: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
        color: '#A1A1AA',
        textTransform: 'uppercase',
        marginBottom: 6
    },
    formulaEquation: {
        fontSize: 11,
        color: '#71717A',
        lineHeight: 16,
        marginBottom: 8
    },
    formulaResultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    formulaResultLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E4E4E7'
    },
    formulaResultValue: {
        fontSize: 13,
        fontWeight: '800'
    },
    tableRowAmountSubtle: {
        fontSize: 11,
        color: '#71717A',
        fontFamily: 'monospace'
    },
    domainSourceItem: {
        paddingVertical: 10
    },
    domainSourceTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    domainSourceName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F4F4F5'
    },
    domainSourceDetails: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12
    },
    domainSourceMeta: {
        fontSize: 11,
        color: '#71717A'
    },
    domainSourceError: {
        fontSize: 11,
        color: '#EF4444',
        marginTop: 4
    }
});
