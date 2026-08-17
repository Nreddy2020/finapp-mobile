/**
 * MoneyFlowView.js
 * 
 * AUTHORITATIVE FINLIFE MONEY FLOW SUBSYSTEM (CASH ONLY)
 * Architecture:
 * 1. Capture Cash Activity (Expense, Income, Transfer)
 * 2. Ingest & Review Bank Messages (Needs Review Workflow + Apply to Similar)
 * 3. Understand Cash Outflows (Category, Merchant, Cash Accounts)
 * 4. Cash Safety & Runway (Point-in-Time Liquid Cash, Designated Reserve, Essential Burn, Runway)
 * 5. Feed Authoritative Cash Truth to Personal CFO
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
    FileText,
    Trash2,
    Tag,
    MessageSquare,
    Edit3,
    Zap,
    HelpCircle
} from 'lucide-react-native';

import {
    getPeriodBounds,
    DEFAULT_AUTHORITATIVE_ACCOUNTS,
    computeEmergencyReserve,
    DEFAULT_ESSENTIAL_BURN_BREAKDOWN,
    computeEmergencyRunwayMetrics,
    computePeriodCashFlowTruth,
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
    onUpdateTransaction,
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

    // Active Tab in "Where Did My Cash Go?"
    const [breakdownTab, setBreakdownTab] = useState('category'); // 'category' | 'merchant' | 'account'
    const [selectedMerchantDetail, setSelectedMerchantDetail] = useState(null);

    // Modals
    const [showPeriodModal, setShowPeriodModal] = useState(false);
    const [showMathModal, setShowMathModal] = useState(false);
    const [showDesignateModal, setShowDesignateModal] = useState(false);
    const [showAddActivityModal, setShowAddActivityModal] = useState(false);
    const [showReviewWizardModal, setShowReviewWizardModal] = useState(false);
    const [reviewWizardIndex, setReviewWizardIndex] = useState(0);
    const [showBreakdownModal, setShowBreakdownModal] = useState(false);
    const [showTrendModal, setShowTrendModal] = useState(false);
    const [selectedTxDetail, setSelectedTxDetail] = useState(null);
    const [customCatInput, setCustomCatInput] = useState('');
    const [isEditingCustomCat, setIsEditingCustomCat] = useState(false);
    const [customCategoriesList, setCustomCategoriesList] = useState(['Gym', 'Healthcare', 'Subscriptions', 'Education', 'Bills']);
    const [isFeedExpanded, setIsFeedExpanded] = useState(true);

    // Unified Add Activity State
    const [addActivityMode, setAddActivityMode] = useState('EXPENSE'); // 'EXPENSE' | 'INCOME' | 'TRANSFER'
    const [txDesc, setTxDesc] = useState('');
    const [txAmount, setTxAmount] = useState('');
    const [txCategory, setTxCategory] = useState('Food');
    const [txAccount, setTxAccount] = useState('HDFC Savings Account');
    const [txToAccount, setTxToAccount] = useState('ICICI Current Account');
    const [txMerchant, setTxMerchant] = useState('');
    const [txIncomeSource, setTxIncomeSource] = useState('Salary');
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

    // Review Queue (Items needing classification)
    const reviewQueue = useMemo(() => {
        return transactions.filter(t => t.needsSort || t.status === 'UNPARSED');
    }, [transactions]);

    const currentReviewItem = useMemo(() => {
        if (reviewQueue.length === 0) return null;
        const validIdx = Math.min(reviewWizardIndex, reviewQueue.length - 1);
        return reviewQueue[validIdx] || null;
    }, [reviewQueue, reviewWizardIndex]);

    const matchingSimilarReviewItems = useMemo(() => {
        if (!currentReviewItem) return [];
        const canonical = currentReviewItem.merchant || normalizeMerchant(currentReviewItem.description || currentReviewItem.text || currentReviewItem.smsBody || '');
        return reviewQueue.filter(t => {
            if (t.id === currentReviewItem.id) return false;
            const otherCanonical = t.merchant || normalizeMerchant(t.description || t.text || t.smsBody || '');
            return otherCanonical.toLowerCase() === canonical.toLowerCase();
        });
    }, [currentReviewItem, reviewQueue]);

    const upcomingData = useMemo(() => getUpcomingOutflows(), []);
    const trendData = useMemo(() => getHistoricalCashFlowTrend(), []);

    // Filter only Cash/Savings/Current Accounts for Money Flow display
    const cashOnlyAccounts = useMemo(() => {
        return accounts.filter(acc => acc.type === 'LIQUID_SAVINGS' || acc.type === 'LIQUID_CURRENT' || acc.type === 'PHYSICAL_CASH');
    }, [accounts]);

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

        if (feedSearch.trim().length > 0) {
            const q = feedSearch.toLowerCase().trim();
            list = list.filter(t =>
                (t.merchant && t.merchant.toLowerCase().includes(q)) ||
                (t.rawDescription && t.rawDescription.toLowerCase().includes(q)) ||
                (t.category && t.category.toLowerCase().includes(q)) ||
                (t.amount && String(t.amount).includes(q))
            );
        }

        // Group by Date
        const groups = {};
        for (const tx of list) {
            const d = tx.date || 'Undated';
            if (!groups[d]) groups[d] = [];
            groups[d].push(tx);
        }

        return Object.entries(groups).map(([date, txList]) => {
            let displayDate = date;
            if (date === '2026-08-17') displayDate = 'Today';
            else if (date === '2026-08-16') displayDate = 'Yesterday';

            return {
                date: displayDate,
                rawDate: date,
                txList
            };
        }).sort((a, b) => b.rawDate.localeCompare(a.rawDate));
    }, [cashFlowTruth.filteredTransactions, feedFilter, feedSearch]);

    // ── 4. HANDLERS ──────────────────────────────────────────────────────────
    const handleSaveCashActivity = () => {
        const amt = parseFloat(txAmount);
        if (!amt || isNaN(amt) || amt <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid cash amount.');
            return;
        }

        const newTx = {
            id: `tx_cash_${Date.now()}`,
            amount: amt,
            type: addActivityMode,
            category: addActivityMode === 'INCOME' ? (txIncomeSource || 'Salary') : (addActivityMode === 'TRANSFER' ? 'Transfer' : (txCategory || 'Other')),
            description: txDesc.trim() || (addActivityMode === 'TRANSFER' ? `Transfer: ${txAccount} → ${txToAccount}` : (addActivityMode === 'INCOME' ? `Income: ${txIncomeSource}` : (txMerchant || 'Manual Expense'))),
            merchant: addActivityMode === 'EXPENSE' ? (txMerchant.trim() || normalizeMerchant(txDesc) || 'General') : (addActivityMode === 'INCOME' ? txIncomeSource : 'Internal Transfer'),
            account: txAccount,
            toAccount: addActivityMode === 'TRANSFER' ? txToAccount : undefined,
            date: txDate || new Date().toISOString().split('T')[0],
            isRecurring: txIsRecurring,
            needsSort: false,
            status: 'CONFIRMED'
        };

        if (onAddTransaction) {
            onAddTransaction(newTx);
        }

        safeHaptic('success');
        setShowAddActivityModal(false);
        setTxAmount('');
        setTxDesc('');
        setTxMerchant('');

        Alert.alert(
            'Activity Recorded',
            addActivityMode === 'TRANSFER'
                ? `Transferred ₹${amt.toLocaleString()} from ${txAccount} to ${txToAccount}. Total cash remains preserved.`
                : `${addActivityMode === 'INCOME' ? 'Income' : 'Expense'} of ₹${amt.toLocaleString()} recorded to ${txAccount}.`
        );
    };

    // Review Wizard Actions
    const handleConfirmReviewItem = (chosenCategory, chosenAccount) => {
        if (!currentReviewItem) return;
        const updated = {
            ...currentReviewItem,
            category: chosenCategory || currentReviewItem.category || 'Other',
            account: chosenAccount || currentReviewItem.account || 'HDFC Savings Account',
            needsSort: false,
            status: 'CONFIRMED'
        };

        if (onUpdateTransaction) {
            onUpdateTransaction(updated);
        } else if (onCategorizeTransaction) {
            onCategorizeTransaction(currentReviewItem.id, chosenCategory);
        }

        safeHaptic('success');
        if (reviewWizardIndex >= reviewQueue.length - 1) {
            setReviewWizardIndex(0);
            setShowReviewWizardModal(false);
            Alert.alert('Review Complete', 'All pending bank messages have been classified into financial truth.');
        }
    };

    const handleIgnoreReviewItem = () => {
        if (!currentReviewItem) return;
        const updated = {
            ...currentReviewItem,
            needsSort: false,
            status: 'IGNORED'
        };

        if (onUpdateTransaction) {
            onUpdateTransaction(updated);
        }

        safeHaptic('medium');
        if (reviewWizardIndex >= reviewQueue.length - 1) {
            setReviewWizardIndex(0);
            setShowReviewWizardModal(false);
        }
    };

    const handleApplyToSimilar = (chosenCategory, chosenAccount) => {
        if (!currentReviewItem) return;
        const canonical = currentReviewItem.merchant || normalizeMerchant(currentReviewItem.description || currentReviewItem.text || currentReviewItem.smsBody || '');

        // Confirm current item
        handleConfirmReviewItem(chosenCategory, chosenAccount);

        // Confirm all similar items
        matchingSimilarReviewItems.forEach(sim => {
            const updated = {
                ...sim,
                category: chosenCategory,
                account: chosenAccount || sim.account || 'HDFC Savings Account',
                merchant: canonical,
                needsSort: false,
                status: 'CONFIRMED'
            };
            if (onUpdateTransaction) {
                onUpdateTransaction(updated);
            }
        });

        safeHaptic('success');
        Alert.alert(
            'Applied to Similar',
            `Applied "${chosenCategory}" to ${matchingSimilarReviewItems.length + 1} "${canonical}" transactions.`
        );
    };

    const handleToggleAccountDesignation = (accountId) => {
        setDesignatedAccountIds(prev => {
            const exists = prev.includes(accountId);
            let next;
            if (exists) {
                if (prev.length === 1) {
                    Alert.alert('Minimum Reserve Account', 'You must maintain at least one designated emergency cash account.');
                    return prev;
                }
                next = prev.filter(id => id !== accountId);
            } else {
                next = [...prev, accountId];
            }
            safeHaptic('light');
            return next;
        });
    };

    return (
        <View style={styles.container}>
            {/* ── HEADER & PERIOD SELECTOR ── */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.headerTitle}>💸 Money Flow</Text>
                        <View style={styles.cashOnlyBadge}>
                            <Text style={styles.cashOnlyBadgeText}>CASH ONLY</Text>
                        </View>
                    </View>
                    <Text style={styles.headerSubtitle}>Authoritative Cash Movement & Safety</Text>
                </View>

                {/* Period Selector Pill */}
                <TouchableOpacity
                    style={styles.periodPill}
                    onPress={() => setShowPeriodModal(true)}
                    activeOpacity={0.7}
                >
                    <Calendar size={13} color="#818CF8" />
                    <Text style={styles.periodPillText}>{periodBounds.label}</Text>
                    <ChevronDown size={13} color="#818CF8" />
                </TouchableOpacity>
            </View>

            {/* ── 2. PERIOD CASH FLOW 3-COLUMN HERO CARD ── */}
            <View style={styles.heroCard}>
                <View style={styles.heroHeaderRow}>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>CASH FLOW ({periodBounds.periodSubtitle})</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.trendTriggerBtn}
                        onPress={() => setShowTrendModal(true)}
                    >
                        <TrendingUp size={13} color="#818CF8" />
                        <Text style={styles.trendTriggerText}>6M Trend</Text>
                    </TouchableOpacity>
                </View>

                {/* 3-Column Numbers: Income | Out | Net */}
                <View style={styles.heroMetricsGrid}>
                    <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>INCOME</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Text style={styles.incomeValue}>{cashFlowTruth.totalIncomeFormatted}</Text>
                            <TrendingUp size={12} color="#10B981" />
                        </View>
                    </View>

                    <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>EXPENSE</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                            <Text style={styles.expenseValue}>{cashFlowTruth.totalSpendingFormatted}</Text>
                            <TrendingDown size={12} color="#EF4444" />
                        </View>
                    </View>

                    <View style={styles.heroMetricCol}>
                        <Text style={styles.heroMetricLabel}>NET FLOW</Text>
                        <Text style={[styles.netFlowValue, { color: cashFlowTruth.netCashFlow >= 0 ? '#10B981' : '#EF4444' }]}>
                            {cashFlowTruth.netCashFlowFormatted}
                        </Text>
                    </View>
                </View>

                {/* Surplus / Cash Flow Status Banner */}
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
                    } else if (isPureIncome) {
                        bannerText = `🟢 100% savings rate! ${cashFlowTruth.totalIncomeFormatted} income preserved as surplus.`;
                        bannerStyle = styles.surplusBannerPositive;
                        textStyle = styles.surplusBannerTextPositive;
                    } else if (isPureExpense) {
                        bannerText = `🔴 Net deficit of ${cashFlowTruth.totalSpendingFormatted} (No income logged this period).`;
                        bannerStyle = styles.surplusBannerNegative;
                        textStyle = styles.surplusBannerTextNegative;
                    } else if (isSurplus) {
                        bannerText = `🟢 Cash surplus is healthy! ${cashFlowTruth.savingsRate}% savings rate this period.`;
                        bannerStyle = styles.surplusBannerPositive;
                        textStyle = styles.surplusBannerTextPositive;
                    } else if (isDeficit) {
                        bannerText = `🔴 Deficit detected this period. Spending exceeded income.`;
                        bannerStyle = styles.surplusBannerNegative;
                        textStyle = styles.surplusBannerTextNegative;
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

            {/* ── 3. UNIFIED "+ ADD CASH ACTIVITY" BAR ── */}
            <View style={styles.addActivityCard}>
                <TouchableOpacity
                    style={styles.addActivityPrimaryBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                        safeHaptic('medium');
                        setShowAddActivityModal(true);
                    }}
                >
                    <Plus size={18} color="#FFFFFF" />
                    <Text style={styles.addActivityPrimaryText}>+ Add Cash Activity</Text>
                </TouchableOpacity>

                {/* 3 Shortcut Action Buttons */}
                <View style={styles.addActivityShortcutRow}>
                    <TouchableOpacity
                        style={[styles.shortcutBtn, { borderColor: '#EF444440', backgroundColor: '#EF444410' }]}
                        onPress={() => {
                            setAddActivityMode('EXPENSE');
                            setShowAddActivityModal(true);
                        }}
                    >
                        <Text style={[styles.shortcutBtnText, { color: '#EF4444' }]}>💸 Expense</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.shortcutBtn, { borderColor: '#10B98140', backgroundColor: '#10B98110' }]}
                        onPress={() => {
                            setAddActivityMode('INCOME');
                            setShowAddActivityModal(true);
                        }}
                    >
                        <Text style={[styles.shortcutBtnText, { color: '#10B981' }]}>💰 Income</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.shortcutBtn, { borderColor: '#818CF840', backgroundColor: '#818CF810' }]}
                        onPress={() => {
                            setAddActivityMode('TRANSFER');
                            setShowAddActivityModal(true);
                        }}
                    >
                        <Text style={[styles.shortcutBtnText, { color: '#818CF8' }]}>🔄 Transfer</Text>
                    </TouchableOpacity>
                </View>

                {/* 1-Tap Category Quick Chips */}
                <View style={styles.quickChipsRow}>
                    {[
                        { label: 'Food', icon: '🍔' },
                        { label: 'Travel', icon: '✈️' },
                        { label: 'Shopping', icon: '🛍' },
                        { label: 'Bills', icon: '⚡' },
                        { label: 'Other', icon: '⋯' }
                    ].map(chip => (
                        <TouchableOpacity
                            key={chip.label}
                            style={styles.quickChipItem}
                            onPress={() => {
                                setAddActivityMode('EXPENSE');
                                setTxCategory(chip.label);
                                setShowAddActivityModal(true);
                            }}
                        >
                            <Text style={styles.quickChipText}>{chip.icon} {chip.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* ── 4. REVIEW CENTER ("NEEDS REVIEW" BANNER) ── */}
            {reviewQueue.length > 0 && (
                <View style={styles.reviewBannerCard}>
                    <View style={styles.reviewBannerLeft}>
                        <View style={styles.reviewPulseDot} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.reviewBannerTitle}>🔴 {reviewQueue.length} Need Review</Text>
                            <Text style={styles.reviewBannerSub}>Bank messages awaiting classification</Text>
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.reviewBannerBtn}
                        onPress={() => {
                            safeHaptic('medium');
                            setReviewWizardIndex(0);
                            setShowReviewWizardModal(true);
                        }}
                    >
                        <Text style={styles.reviewBannerBtnText}>Review Now ➔</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ── 5. WHERE DID MY CASH GO? (PURE CASH BREAKDOWNS) ── */}
            <View style={styles.sectionCard}>
                <View style={styles.cardHeaderRow}>
                    <Text style={styles.sectionCardTitle}>Where Did My Cash Go?</Text>
                    <TouchableOpacity onPress={() => setShowBreakdownModal(true)}>
                        <Eye size={16} color="#71717A" />
                    </TouchableOpacity>
                </View>

                {/* Triad Tabs: Category (What) | Merchant (Who) | Cash Account (Where) */}
                <View style={styles.triadTabRow}>
                    {[
                        { key: 'category', label: 'Category' },
                        { key: 'merchant', label: 'Merchant' },
                        { key: 'account', label: 'Cash Account' }
                    ].map(tab => (
                        <TouchableOpacity
                            key={tab.key}
                            style={[styles.triadTabBtn, breakdownTab === tab.key && styles.triadTabBtnActive]}
                            onPress={() => {
                                setBreakdownTab(tab.key);
                                safeHaptic('light');
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
                            <Text style={styles.emptyBreakdownTitle}>No spending recorded in this period</Text>
                            <Text style={styles.emptyBreakdownSub}>Log an expense or choose another timeframe from the date picker.</Text>
                        </View>
                    )
                )}

                {/* Tab 2: Normalized Merchant List */}
                {breakdownTab === 'merchant' && (
                    cashFlowTruth.merchantBreakdown.length > 0 ? (
                        <View style={styles.categoryList}>
                            {cashFlowTruth.merchantBreakdown.slice(0, 5).map((m) => (
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
                            <Text style={styles.emptyBreakdownTitle}>No merchant activity in this period</Text>
                            <Text style={styles.emptyBreakdownSub}>Switch timeframe or log cash activity above.</Text>
                        </View>
                    )
                )}

                {/* Tab 3: Liquid Cash Accounts Only */}
                {breakdownTab === 'account' && (
                    <View style={styles.categoryList}>
                        {cashOnlyAccounts.map(acc => (
                            <View key={acc.id} style={styles.accountRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Building2 size={16} color={acc.isDesignated ? '#10B981' : '#71717A'} />
                                    <View>
                                        <Text style={styles.accountName}>{acc.name}</Text>
                                        <Text style={styles.accountSub}>{acc.isDesignated ? '🛡 Designated Reserve' : 'Liquid Cash'}</Text>
                                    </View>
                                </View>
                                <Text style={styles.accountBalance}>{formatCurrencyINR(acc.balance, false)}</Text>
                            </View>
                        ))}

                        {/* Liquid Cash Sum Total Banner */}
                        <View style={styles.liquidTotalRow}>
                            <Text style={styles.liquidTotalLabel}>Total Liquid Cash (Point-in-Time)</Text>
                            <Text style={styles.liquidTotalVal}>{reserveData.totalLiquidCashFormatted}</Text>
                        </View>
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

            {/* ── 6. CASH SAFETY & RUNWAY (CASH ONLY) ── */}
            <View style={styles.safetyCard}>
                <View style={styles.cardHeaderRow}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Shield size={16} color="#10B981" />
                        <Text style={styles.safetyTitle}>🛡 Cash Safety & Runway</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${runwayMetrics.statusColor}20`, borderColor: runwayMetrics.statusColor }]}>
                        <Text style={[styles.statusBadgeText, { color: runwayMetrics.statusColor }]}>
                            {runwayMetrics.statusLabel}
                        </Text>
                    </View>
                </View>

                {/* Point-in-Time Metrics Table */}
                <View style={styles.safetyStatsTable}>
                    <View style={styles.safetyStatRow}>
                        <Text style={styles.safetyStatLabel}>Liquid Cash</Text>
                        <Text style={styles.safetyStatVal}>{reserveData.totalLiquidCashFormatted}</Text>
                    </View>
                    <View style={styles.safetyStatRow}>
                        <Text style={styles.safetyStatLabel}>Designated Emergency Cash</Text>
                        <Text style={[styles.safetyStatVal, { color: '#10B981' }]}>{reserveData.currentReserveFormatted}</Text>
                    </View>
                    <View style={styles.safetyStatRow}>
                        <Text style={styles.safetyStatLabel}>Essential Monthly Burn</Text>
                        <Text style={styles.safetyStatVal}>{runwayMetrics.essentialMonthlyBurnFormatted}/mo</Text>
                    </View>
                    <View style={[styles.safetyStatRow, { borderBottomWidth: 0 }]}>
                        <Text style={styles.safetyStatLabel}>Emergency Runway</Text>
                        <Text style={[styles.safetyStatVal, { color: runwayMetrics.statusColor, fontWeight: '800' }]}>
                            {runwayMetrics.runwayMonths} months ⚠️
                        </Text>
                    </View>
                </View>

                {/* Shortfall Alert */}
                {runwayMetrics.shortfall > 0 && (
                    <View style={styles.shortfallRow}>
                        <AlertTriangle size={14} color="#F59E0B" />
                        <Text style={styles.shortfallText}>
                            Shortfall to Minimum 3M Target: <Text style={{ fontWeight: '800', color: '#FFF' }}>{runwayMetrics.shortfallFormatted}</Text>
                        </Text>
                    </View>
                )}

                {/* Actions: See Calculation Math & Designate Accounts */}
                <View style={styles.safetyActionRow}>
                    <TouchableOpacity
                        style={styles.safetyActionBtn}
                        onPress={() => setShowMathModal(true)}
                    >
                        <Info size={13} color="#818CF8" />
                        <Text style={styles.safetyActionBtnText}>How is this calculated?</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.safetyActionBtnSecondary}
                        onPress={() => setShowDesignateModal(true)}
                    >
                        <Building2 size={13} color="#A1A1AA" />
                        <Text style={styles.safetyActionBtnSecondaryText}>Designate Cash</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* ── 7. CASH ACTIVITY FEED (SMART COLLAPSIBLE FEED) ── */}
            <View style={styles.sectionCard}>
                <TouchableOpacity
                    style={styles.cardHeaderRow}
                    activeOpacity={0.7}
                    onPress={() => {
                        safeHaptic('light');
                        setIsFeedExpanded(prev => !prev);
                    }}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.sectionCardTitle}>📱 Cash Activity</Text>
                        <View style={styles.feedCountBadge}>
                            <Text style={styles.feedCountBadgeText}>
                                {processedFeed.reduce((acc, g) => acc + g.txList.length, 0)}
                            </Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {cashFlowTruth.needsSortCount > 0 && (
                            <View style={styles.needsSortBadge}>
                                <Text style={styles.needsSortBadgeText}>🔴 {cashFlowTruth.needsSortCount} Review</Text>
                            </View>
                        )}
                        {isFeedExpanded ? (
                            <ChevronDown size={20} color="#A1A1AA" />
                        ) : (
                            <ChevronRight size={20} color="#A1A1AA" />
                        )}
                    </View>
                </TouchableOpacity>

                {isFeedExpanded && (
                    <View style={{ marginTop: 8 }}>
                        {/* Search Bar */}
                        <View style={styles.searchBar}>
                            <Search size={14} color="#71717A" />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search merchant, description, amount..."
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

                        {/* Filter Tabs */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feedFilterRow}>
                            {[
                                { key: 'ALL', label: 'All' },
                                { key: 'NEEDS_SORT', label: `Needs Review (${cashFlowTruth.needsSortCount})` },
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
                                <Text style={styles.emptyStateText}>No cash activity found for this filter & period</Text>
                            </View>
                        ) : (
                            processedFeed.map(group => (
                                <View key={group.date} style={styles.dateGroupContainer}>
                                    <View style={styles.dateGroupHeader}>
                                        <Text style={styles.dateGroupTitle}>{group.date.toUpperCase()}</Text>
                                        <Text style={styles.dateGroupCount}>{group.txList.length} activities</Text>
                                    </View>

                                    {group.txList.map(tx => (
                                        <TouchableOpacity
                                            key={tx.id}
                                            style={styles.feedTxCard}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                safeHaptic('light');
                                                setSelectedTxDetail(tx);
                                            }}
                                        >
                                            <View style={styles.feedTxLeft}>
                                                <View style={[
                                                    styles.feedTxAvatar,
                                                    { backgroundColor: tx.type === 'INCOME' ? '#10B98120' : tx.type === 'TRANSFER' ? '#818CF820' : '#EF444420' }
                                                ]}>
                                                    {tx.type === 'TRANSFER' ? (
                                                        <ArrowLeftRight size={16} color="#818CF8" />
                                                    ) : tx.type === 'INCOME' ? (
                                                        <TrendingUp size={16} color="#10B981" />
                                                    ) : (
                                                        <TrendingDown size={16} color="#EF4444" />
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
                                                    { color: tx.type === 'INCOME' ? '#10B981' : tx.type === 'TRANSFER' ? '#818CF8' : '#EF4444' }
                                                ]}>
                                                    {tx.type === 'INCOME' ? '+' : tx.type === 'TRANSFER' ? '⇄ ' : '-'}₹{Math.round(tx.amount).toLocaleString()}
                                                </Text>
                                                {tx.needsSort ? (
                                                    <View style={styles.needsSortChip}>
                                                        <Text style={styles.needsSortChipText}>Needs Review</Text>
                                                    </View>
                                                ) : (
                                                    <Text style={styles.sortedStatusText}>✓ Sorted</Text>
                                                )}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            ))
                        )}
                    </View>
                )}
            </View>

            {/* ── MODAL 1: PERIOD PICKER ── */}
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
                                <Text style={styles.modalTitle}>Select Cash Flow Period</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowPeriodModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
                            {/* Preset Buttons */}
                            <Text style={styles.periodSectionHeading}>PRESETS</Text>
                            <View style={styles.presetGrid}>
                                {[
                                    { key: 'month', label: 'This Month' },
                                    { key: 'today', label: 'Today' },
                                    { key: 'week', label: 'This Week' },
                                    { key: 'quarter', label: 'This Quarter' },
                                    { key: 'year', label: 'This Year' }
                                ].map(p => (
                                    <TouchableOpacity
                                        key={p.key}
                                        style={[styles.presetBtn, periodType === p.key && styles.presetBtnActive]}
                                        onPress={() => {
                                            setPeriodType(p.key);
                                            setShowPeriodModal(false);
                                            safeHaptic('light');
                                        }}
                                    >
                                        <Text style={[styles.presetBtnText, periodType === p.key && styles.presetBtnTextActive]}>
                                            {p.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            {/* Month Grid */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 8 }}>
                                <Text style={styles.periodSectionHeading}>MONTH IN {selectedYear}</Text>
                                <View style={styles.yearSwitcherContainer}>
                                    <TouchableOpacity
                                        style={styles.yearNavBtn}
                                        onPress={() => setSelectedYear(y => y - 1)}
                                    >
                                        <ChevronLeft size={14} color="#FFF" />
                                    </TouchableOpacity>
                                    <Text style={styles.yearText}>{selectedYear}</Text>
                                    <TouchableOpacity
                                        style={styles.yearNavBtn}
                                        onPress={() => setSelectedYear(y => y + 1)}
                                    >
                                        <ChevronRight size={14} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.monthGrid}>
                                {MONTH_LABELS.map(m => (
                                    <TouchableOpacity
                                        key={m.key}
                                        style={styles.monthGridItem}
                                        onPress={() => {
                                            const monthNum = String(m.key + 1).padStart(2, '0');
                                            const lastDay = new Date(Date.UTC(selectedYear, m.key + 1, 0)).getUTCDate();
                                            const start = `${selectedYear}-${monthNum}-01`;
                                            const end = `${selectedYear}-${monthNum}-${String(lastDay).padStart(2, '0')}`;
                                            setCustomRange({ start, end });
                                            setPeriodType('custom');
                                            setShowPeriodModal(false);
                                            safeHaptic('success');
                                        }}
                                    >
                                        <Text style={styles.monthGridText}>{m.short}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowPeriodModal(false)}>
                            <Text style={styles.modalPrimaryBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 2: UNIFIED "+ ADD CASH ACTIVITY" MODAL ── */}
            <Modal
                visible={showAddActivityModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAddActivityModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>+ Add Cash Activity</Text>
                            <TouchableOpacity onPress={() => setShowAddActivityModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        {/* 3-Mode Segmented Control */}
                        <View style={styles.txTypeToggleRow}>
                            {[
                                { key: 'EXPENSE', label: '💸 Expense', color: '#EF4444' },
                                { key: 'INCOME', label: '💰 Income', color: '#10B981' },
                                { key: 'TRANSFER', label: '🔄 Transfer', color: '#818CF8' }
                            ].map(t => (
                                <TouchableOpacity
                                    key={t.key}
                                    style={[styles.txTypeBtn, addActivityMode === t.key && { backgroundColor: t.color }]}
                                    onPress={() => {
                                        setAddActivityMode(t.key);
                                        safeHaptic('light');
                                    }}
                                >
                                    <Text style={[styles.txTypeBtnText, addActivityMode === t.key && { color: '#FFF', fontWeight: '800' }]}>
                                        {t.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                            {/* Fast Amount Input */}
                            <Text style={styles.inputLabel}>Amount (₹)</Text>
                            <TextInput
                                style={styles.amountInputHero}
                                placeholder="0"
                                placeholderTextColor="#71717A"
                                keyboardType="numeric"
                                value={txAmount}
                                onChangeText={setTxAmount}
                            />

                            {/* EXPENSE FLOW */}
                            {addActivityMode === 'EXPENSE' && (
                                <>
                                    <Text style={styles.inputLabel}>What was it? / Merchant</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        placeholder="e.g. Amazon, Swiggy, Uber, Fuel..."
                                        placeholderTextColor="#71717A"
                                        value={txMerchant}
                                        onChangeText={setTxMerchant}
                                    />

                                    <Text style={styles.inputLabel}>Category</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                        {['Food', 'Shopping', 'Travel', 'Bills', 'Entertainment', 'Rent', 'Other'].map(cat => (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.modalCatChip, txCategory === cat && styles.modalCatChipActive]}
                                                onPress={() => setTxCategory(cat)}
                                            >
                                                <Text style={[styles.modalCatChipText, txCategory === cat && styles.modalCatChipTextActive]}>
                                                    {cat}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    <Text style={styles.inputLabel}>Cash Account / Card</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                        {cashOnlyAccounts.map(acc => (
                                            <TouchableOpacity
                                                key={acc.id}
                                                style={[styles.modalAccChip, txAccount === acc.name && styles.modalAccChipActive]}
                                                onPress={() => setTxAccount(acc.name)}
                                            >
                                                <Text style={[styles.modalAccChipText, txAccount === acc.name && styles.modalAccChipTextActive]}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            )}

                            {/* INCOME FLOW */}
                            {addActivityMode === 'INCOME' && (
                                <>
                                    <Text style={styles.inputLabel}>Income Source</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                        {['Salary', 'Bonus', 'Dividend', 'Interest', 'Rental', 'Business', 'Refund', 'Other'].map(src => (
                                            <TouchableOpacity
                                                key={src}
                                                style={[styles.modalCatChip, txIncomeSource === src && styles.modalCatChipActive]}
                                                onPress={() => setTxIncomeSource(src)}
                                            >
                                                <Text style={[styles.modalCatChipText, txIncomeSource === src && styles.modalCatChipTextActive]}>
                                                    {src}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>

                                    {txIncomeSource === 'Salary' && (
                                        <View style={styles.recurringSalaryAlert}>
                                            <Sparkles size={14} color="#10B981" />
                                            <Text style={styles.recurringSalaryAlertText}>
                                                Recurring Income intelligence: Will be mapped as monthly recurring salary.
                                            </Text>
                                        </View>
                                    )}

                                    <Text style={styles.inputLabel}>Deposited To Account</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginBottom: 12 }}>
                                        {cashOnlyAccounts.map(acc => (
                                            <TouchableOpacity
                                                key={acc.id}
                                                style={[styles.modalAccChip, txAccount === acc.name && styles.modalAccChipActive]}
                                                onPress={() => setTxAccount(acc.name)}
                                            >
                                                <Text style={[styles.modalAccChipText, txAccount === acc.name && styles.modalAccChipTextActive]}>
                                                    {acc.name}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </>
                            )}

                            {/* TRANSFER FLOW */}
                            {addActivityMode === 'TRANSFER' && (
                                <>
                                    <View style={styles.transferNeutralNotice}>
                                        <Info size={14} color="#818CF8" />
                                        <Text style={styles.transferNeutralNoticeText}>
                                            Transfers move cash between your accounts. They do not inflate income or spending.
                                        </Text>
                                    </View>

                                    <Text style={styles.inputLabel}>From Account</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={txAccount}
                                        onChangeText={setTxAccount}
                                    />

                                    <Text style={styles.inputLabel}>To Account</Text>
                                    <TextInput
                                        style={styles.formInput}
                                        value={txToAccount}
                                        onChangeText={setTxToAccount}
                                    />
                                </>
                            )}

                            {/* Date */}
                            <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.formInput}
                                value={txDate}
                                onChangeText={setTxDate}
                            />
                        </ScrollView>

                        <TouchableOpacity
                            style={[
                                styles.modalPrimaryBtn,
                                { backgroundColor: addActivityMode === 'INCOME' ? '#10B981' : addActivityMode === 'TRANSFER' ? '#818CF8' : '#EF4444' }
                            ]}
                            onPress={handleSaveCashActivity}
                        >
                            <Text style={styles.modalPrimaryBtnText}>
                                {addActivityMode === 'TRANSFER' ? 'Transfer Cash' : (addActivityMode === 'INCOME' ? 'Save Income' : 'Save Expense')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 3: STEP-BY-STEP REVIEW WIZARD MODAL ── */}
            <Modal
                visible={showReviewWizardModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowReviewWizardModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MessageSquare size={18} color="#EF4444" />
                                <Text style={styles.modalTitle}>Needs Review</Text>
                            </View>
                            <TouchableOpacity onPress={() => setShowReviewWizardModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        {currentReviewItem ? (
                            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                                {/* Progress Header */}
                                <View style={styles.reviewWizardProgressBar}>
                                    <Text style={styles.reviewWizardProgressText}>
                                        {reviewWizardIndex + 1} of {reviewQueue.length} remaining
                                    </Text>
                                </View>

                                {/* Transaction Card */}
                                <View style={styles.reviewCardHero}>
                                    <Text style={styles.reviewMerchantTitle}>
                                        {currentReviewItem.merchant || normalizeMerchant(currentReviewItem.rawDescription)}
                                    </Text>
                                    <Text style={styles.reviewAmountHero}>
                                        ₹{Math.round(currentReviewItem.amount).toLocaleString()}
                                    </Text>
                                    <Text style={styles.reviewDateSub}>{currentReviewItem.date} • {currentReviewItem.account}</Text>
                                </View>

                                {/* Raw SMS Message Box */}
                                {currentReviewItem.smsBody && (
                                    <View style={styles.rawSmsBox}>
                                        <Text style={styles.rawSmsLabel}>RAW BANK ALERT</Text>
                                        <Text style={styles.rawSmsText}>"{currentReviewItem.smsBody}"</Text>
                                    </View>
                                )}

                                {/* Category Classification */}
                                <Text style={styles.inputLabel}>Suggested Category</Text>
                                <View style={styles.categoryChipsGrid}>
                                    {['Shopping', 'Food', 'Travel', 'Bills', 'Entertainment', 'Rent', 'Other'].map(cat => (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.wizardCatChip,
                                                (currentReviewItem.category === cat || (!currentReviewItem.category && cat === 'Shopping')) && styles.wizardCatChipActive
                                            ]}
                                            onPress={() => handleConfirmReviewItem(cat, currentReviewItem.account)}
                                        >
                                            <Text style={styles.wizardCatChipText}>{cat}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {/* Action Buttons */}
                                <View style={{ gap: 8, marginTop: 16 }}>
                                    <TouchableOpacity
                                        style={styles.confirmReviewBtn}
                                        onPress={() => handleConfirmReviewItem(currentReviewItem.category || 'Shopping', currentReviewItem.account)}
                                    >
                                        <Check size={16} color="#FFF" />
                                        <Text style={styles.confirmReviewBtnText}>✓ Confirm & Add to Ledger</Text>
                                    </TouchableOpacity>

                                    {matchingSimilarReviewItems.length > 0 && (
                                        <TouchableOpacity
                                            style={styles.applySimilarBtn}
                                            onPress={() => handleApplyToSimilar(currentReviewItem.category || 'Shopping', currentReviewItem.account)}
                                        >
                                            <Zap size={15} color="#818CF8" />
                                            <Text style={styles.applySimilarBtnText}>
                                                ⚡ Apply to all {matchingSimilarReviewItems.length + 1} similar
                                            </Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={styles.ignoreReviewBtn}
                                        onPress={handleIgnoreReviewItem}
                                    >
                                        <Text style={styles.ignoreReviewBtnText}>Ignore Message</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        ) : (
                            <View style={styles.emptyReviewBox}>
                                <CheckCircle2 size={40} color="#10B981" />
                                <Text style={styles.emptyReviewTitle}>All Caught Up!</Text>
                                <Text style={styles.emptyReviewSub}>All bank messages have been reviewed and classified into financial truth.</Text>
                                <TouchableOpacity
                                    style={styles.modalPrimaryBtn}
                                    onPress={() => setShowReviewWizardModal(false)}
                                >
                                    <Text style={styles.modalPrimaryBtnText}>Close</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 4: CALCULATION MATH MODAL ── */}
            <Modal
                visible={showMathModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowMathModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Emergency Runway Formula</Text>
                            <TouchableOpacity onPress={() => setShowMathModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 380 }}>
                            <View style={styles.formulaBox}>
                                <Text style={styles.formulaText}>
                                    Emergency Runway = Designated Reserve ÷ Essential Monthly Burn
                                </Text>
                            </View>

                            <Text style={styles.accountGroupHeader}>STEP 1: DESIGNATED CASH</Text>
                            {reserveData.designatedAccounts.map(acc => (
                                <View key={acc.id} style={styles.mathBreakdownRow}>
                                    <Text style={styles.mathBreakdownLabel}>{acc.name}</Text>
                                    <Text style={styles.mathBreakdownVal}>{formatCurrencyINR(acc.balance, false)}</Text>
                                </View>
                            ))}
                            <View style={styles.mathTotalRow}>
                                <Text style={styles.mathTotalLabel}>Total Designated Reserve</Text>
                                <Text style={styles.mathTotalVal}>{reserveData.currentReserveFormatted}</Text>
                            </View>

                            <Text style={[styles.accountGroupHeader, { marginTop: 14 }]}>STEP 2: ESSENTIAL MONTHLY BURN</Text>
                            {Object.entries(runwayMetrics.essentialBurnBreakdown).map(([k, v]) => (
                                <View key={k} style={styles.mathBreakdownRow}>
                                    <Text style={styles.mathBreakdownLabel}>{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</Text>
                                    <Text style={styles.mathBreakdownVal}>{formatCurrencyINR(v, false)}</Text>
                                </View>
                            ))}
                            <View style={styles.mathTotalRow}>
                                <Text style={styles.mathTotalLabel}>Essential Monthly Burn</Text>
                                <Text style={styles.mathTotalVal}>{runwayMetrics.essentialMonthlyBurnFormatted}/mo</Text>
                            </View>

                            <Text style={[styles.accountGroupHeader, { marginTop: 14 }]}>FINAL RUNWAY RESULT</Text>
                            <View style={styles.mathResultBanner}>
                                <Text style={styles.mathResultText}>
                                    {reserveData.currentReserveFormatted} ÷ {runwayMetrics.essentialMonthlyBurnFormatted} = <Text style={{ color: runwayMetrics.statusColor, fontWeight: '900' }}>{runwayMetrics.runwayMonths} months</Text>
                                </Text>
                            </View>
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowMathModal(false)}>
                            <Text style={styles.modalPrimaryBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ── MODAL 5: DESIGNATE CASH ACCOUNTS MODAL ── */}
            <Modal
                visible={showDesignateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDesignateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Designate Cash Accounts</Text>
                            <TouchableOpacity onPress={() => setShowDesignateModal(false)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={{ maxHeight: 380 }}>
                            <Text style={styles.modalSubDesc}>
                                Select which cash and savings accounts form your dedicated emergency reserve.
                            </Text>

                            {cashOnlyAccounts.map(acc => {
                                const isDes = designatedAccountIds.includes(acc.id);
                                return (
                                    <TouchableOpacity
                                        key={acc.id}
                                        style={[styles.designateItemRow, isDes && styles.designateItemRowActive]}
                                        onPress={() => handleToggleAccountDesignation(acc.id)}
                                    >
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.designateItemName}>{acc.name}</Text>
                                            <Text style={styles.designateItemBal}>{formatCurrencyINR(acc.balance, false)}</Text>
                                        </View>
                                        <View style={[styles.checkbox, isDes && styles.checkboxActive]}>
                                            {isDes && <Check size={14} color="#FFF" />}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setShowDesignateModal(false)}>
                            <Text style={styles.modalPrimaryBtnText}>Done</Text>
                        </TouchableOpacity>
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

                        <ScrollView style={{ maxHeight: 380 }}>
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
                            <Text style={styles.modalTitle}>Where Did My Cash Go?</Text>
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
                                <Text style={{ color: '#71717A', fontSize: 11 }}>
                                    Across {cashFlowTruth.categoryBreakdown.length} categories & {cashFlowTruth.merchantBreakdown.length} merchants
                                </Text>
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

            {/* ── MODAL 8: TRANSACTION & MESSAGE DETAILS MODAL SHEET ── */}
            <Modal
                visible={selectedTxDetail !== null}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setSelectedTxDetail(null)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <MessageSquare size={18} color="#818CF8" />
                                <Text style={styles.modalTitle}>Transaction & Message Details</Text>
                            </View>
                            <TouchableOpacity onPress={() => setSelectedTxDetail(null)}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        {selectedTxDetail && (
                            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                                <View style={styles.txDetailHeroCard}>
                                    <Text style={styles.txDetailMerchant}>{selectedTxDetail.merchant || selectedTxDetail.desc || 'Transaction'}</Text>
                                    <Text style={[
                                        styles.txDetailAmount,
                                        { color: selectedTxDetail.type === 'INCOME' ? '#10B981' : selectedTxDetail.type === 'TRANSFER' ? '#818CF8' : '#EF4444' }
                                    ]}>
                                        {selectedTxDetail.type === 'INCOME' ? '+' : selectedTxDetail.type === 'TRANSFER' ? '⇄ ' : '-'}₹{Math.round(selectedTxDetail.amount).toLocaleString()}
                                    </Text>
                                    <Text style={styles.txDetailDate}>{selectedTxDetail.date} • {selectedTxDetail.account}</Text>
                                </View>

                                {/* Raw Bank SMS Alert */}
                                {selectedTxDetail.smsBody ? (
                                    <View style={styles.txDetailSmsCard}>
                                        <View style={styles.txDetailSmsHeader}>
                                            <MessageSquare size={14} color="#818CF8" />
                                            <Text style={styles.txDetailSmsTitle}>Original Bank Alert / SMS</Text>
                                        </View>
                                        <Text style={styles.txDetailSmsBody}>"{selectedTxDetail.smsBody}"</Text>
                                        <TouchableOpacity
                                            style={styles.deleteSmsOnlyBtn}
                                            onPress={() => {
                                                if (onUpdateTransaction) {
                                                    onUpdateTransaction({ ...selectedTxDetail, smsBody: undefined });
                                                }
                                                setSelectedTxDetail(prev => prev ? { ...prev, smsBody: undefined } : null);
                                                safeHaptic('medium');
                                                Alert.alert('Message Removed', 'The raw SMS has been cleared while keeping the sorted financial record intact.');
                                            }}
                                        >
                                            <Trash2 size={13} color="#EF4444" />
                                            <Text style={styles.deleteSmsOnlyBtnText}>Delete Message Only (Keep Sorted Record)</Text>
                                        </TouchableOpacity>
                                    </View>
                                ) : null}

                                {/* Change Category */}
                                <Text style={[styles.accountGroupHeader, { marginTop: 12 }]}>CATEGORIZE THIS ACTIVITY</Text>
                                <View style={styles.categoryChipsGrid}>
                                    {['Food', 'Shopping', 'Travel', 'Bills', 'Entertainment', 'Rent', 'Salary', 'Other', ...customCategoriesList].map(cat => {
                                        const isSelected = selectedTxDetail.category === cat;
                                        return (
                                            <TouchableOpacity
                                                key={cat}
                                                style={[styles.wizardCatChip, isSelected && styles.wizardCatChipActive]}
                                                onPress={() => {
                                                    const updated = { ...selectedTxDetail, category: cat, needsSort: false };
                                                    if (onUpdateTransaction) onUpdateTransaction(updated);
                                                    setSelectedTxDetail(updated);
                                                    safeHaptic('light');
                                                }}
                                            >
                                                <Text style={[styles.wizardCatChipText, isSelected && { color: '#FFF', fontWeight: '800' }]}>{cat}</Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        )}

                        <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setSelectedTxDetail(null)}>
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
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 4
    },
    headerLeft: {
        flex: 1
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    headerSubtitle: {
        fontSize: 12,
        color: '#71717A',
        marginTop: 2
    },
    cashOnlyBadge: {
        backgroundColor: '#10B98120',
        borderColor: '#10B98140',
        borderWidth: 1,
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 2
    },
    cashOnlyBadgeText: {
        color: '#10B981',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    periodPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1E1B4B',
        borderColor: '#312E81',
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 12,
        paddingVertical: 7
    },
    periodPillText: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '700'
    },
    heroCard: {
        backgroundColor: '#111827',
        borderColor: '#1F2937',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14
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
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#10B981'
    },
    liveText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#10B981',
        letterSpacing: 0.5
    },
    trendTriggerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#1E1B4B',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12
    },
    trendTriggerText: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
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
        fontSize: 10,
        fontWeight: '700',
        color: '#71717A',
        textTransform: 'uppercase',
        marginBottom: 2
    },
    incomeValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#10B981'
    },
    expenseValue: {
        fontSize: 18,
        fontWeight: '900',
        color: '#EF4444'
    },
    netFlowValue: {
        fontSize: 18,
        fontWeight: '900'
    },
    surplusBannerBase: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginTop: 4
    },
    surplusBannerPositive: {
        backgroundColor: '#10B98115',
        borderColor: '#10B98130',
        borderWidth: 1
    },
    surplusBannerNegative: {
        backgroundColor: '#EF444415',
        borderColor: '#EF444430',
        borderWidth: 1
    },
    surplusBannerNeutral: {
        backgroundColor: '#27272A',
        borderColor: '#3F3F46',
        borderWidth: 1
    },
    surplusBannerTextBase: {
        fontSize: 11,
        fontWeight: '600',
        textAlign: 'center'
    },
    surplusBannerTextPositive: {
        color: '#10B981'
    },
    surplusBannerTextNegative: {
        color: '#EF4444'
    },
    surplusBannerTextNeutral: {
        color: '#A1A1AA'
    },
    addActivityCard: {
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 16,
        padding: 14,
        marginBottom: 14
    },
    addActivityPrimaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        paddingVertical: 12,
        marginBottom: 10
    },
    addActivityPrimaryText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    },
    addActivityShortcutRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 10
    },
    shortcutBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1
    },
    shortcutBtnText: {
        fontSize: 12,
        fontWeight: '700'
    },
    quickChipsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    quickChipItem: {
        backgroundColor: '#27272A',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 14
    },
    quickChipText: {
        color: '#D4D4D8',
        fontSize: 11,
        fontWeight: '600'
    },
    reviewBannerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#7F1D1D25',
        borderColor: '#EF444440',
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
        marginBottom: 14
    },
    reviewBannerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1
    },
    reviewPulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444'
    },
    reviewBannerTitle: {
        color: '#EF4444',
        fontSize: 13,
        fontWeight: '800'
    },
    reviewBannerSub: {
        color: '#A1A1AA',
        fontSize: 10
    },
    reviewBannerBtn: {
        backgroundColor: '#EF4444',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8
    },
    reviewBannerBtnText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800'
    },
    sectionCard: {
        backgroundColor: '#18181B',
        borderColor: '#27272A',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14
    },
    sectionCardTitle: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    cardHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    triadTabRow: {
        flexDirection: 'row',
        backgroundColor: '#27272A',
        borderRadius: 10,
        padding: 3,
        marginBottom: 12
    },
    triadTabBtn: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        borderRadius: 8
    },
    triadTabBtnActive: {
        backgroundColor: '#3F3F46'
    },
    triadTabText: {
        fontSize: 12,
        color: '#71717A',
        fontWeight: '600'
    },
    triadTabTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
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
        width: 8,
        height: 8,
        borderRadius: 4
    },
    categoryName: {
        fontSize: 13,
        color: '#E4E4E7',
        fontWeight: '600'
    },
    categoryAmountContainer: {
        flexDirection: 'row',
        gap: 6
    },
    categoryPercent: {
        fontSize: 12,
        color: '#71717A'
    },
    categoryAmount: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    categoryProgressTrack: {
        height: 5,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden'
    },
    categoryProgressBar: {
        height: '100%',
        borderRadius: 3
    },
    merchantRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4
    },
    merchantLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    merchantAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#27272A',
        alignItems: 'center',
        justifyContent: 'center'
    },
    merchantAvatarText: {
        color: '#818CF8',
        fontWeight: '800',
        fontSize: 14
    },
    merchantName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    merchantSub: {
        color: '#71717A',
        fontSize: 11
    },
    merchantAmount: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    merchantPercent: {
        color: '#71717A',
        fontSize: 10
    },
    accountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6
    },
    accountName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    accountSub: {
        color: '#71717A',
        fontSize: 11
    },
    accountBalance: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    liquidTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopColor: '#27272A',
        borderTopWidth: 1,
        paddingTop: 10,
        marginTop: 4
    },
    liquidTotalLabel: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700'
    },
    liquidTotalVal: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '900'
    },
    viewBreakdownBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: 12,
        paddingTop: 10,
        borderTopColor: '#27272A',
        borderTopWidth: 1
    },
    viewBreakdownBtnText: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    },
    safetyCard: {
        backgroundColor: '#0F172A',
        borderColor: '#1E293B',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 14
    },
    safetyTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800'
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1
    },
    statusBadgeText: {
        fontSize: 10,
        fontWeight: '800'
    },
    safetyStatsTable: {
        backgroundColor: '#1E293B50',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10
    },
    safetyStatRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
        borderBottomColor: '#33415550',
        borderBottomWidth: 1
    },
    safetyStatLabel: {
        color: '#94A3B8',
        fontSize: 12
    },
    safetyStatVal: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    shortfallRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#78350F25',
        borderColor: '#F59E0B40',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginBottom: 10
    },
    shortfallText: {
        color: '#F59E0B',
        fontSize: 11,
        flex: 1
    },
    safetyActionRow: {
        flexDirection: 'row',
        gap: 8
    },
    safetyActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#1E1B4B',
        paddingVertical: 8,
        borderRadius: 8
    },
    safetyActionBtnText: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    },
    safetyActionBtnSecondary: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#334155',
        paddingVertical: 8,
        borderRadius: 8
    },
    safetyActionBtnSecondaryText: {
        color: '#E2E8F0',
        fontSize: 11,
        fontWeight: '700'
    },
    feedCountBadge: {
        backgroundColor: '#27272A',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2
    },
    feedCountBadgeText: {
        color: '#A1A1AA',
        fontSize: 10,
        fontWeight: '700'
    },
    needsSortBadge: {
        backgroundColor: '#7F1D1D30',
        borderColor: '#EF444440',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 6,
        paddingVertical: 2
    },
    needsSortBadgeText: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '800'
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#27272A',
        borderRadius: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        marginBottom: 10
    },
    searchInput: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 12,
        padding: 0
    },
    feedFilterRow: {
        flexDirection: 'row',
        marginBottom: 12
    },
    feedFilterPill: {
        backgroundColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        marginRight: 8
    },
    feedFilterPillActive: {
        backgroundColor: '#4F46E5'
    },
    feedFilterText: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '600'
    },
    feedFilterTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
    },
    emptyStateBox: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30,
        gap: 8
    },
    emptyStateText: {
        color: '#71717A',
        fontSize: 12
    },
    dateGroupContainer: {
        marginBottom: 14
    },
    dateGroupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    dateGroupTitle: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    dateGroupCount: {
        color: '#52525B',
        fontSize: 10
    },
    feedTxCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E1E24',
        borderRadius: 10,
        padding: 10,
        marginBottom: 6
    },
    feedTxLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1
    },
    feedTxAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center'
    },
    feedTxTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    feedTxSub: {
        color: '#71717A',
        fontSize: 11
    },
    feedTxAmount: {
        fontSize: 14,
        fontWeight: '900'
    },
    needsSortChip: {
        backgroundColor: '#7F1D1D40',
        borderRadius: 4,
        paddingHorizontal: 4,
        paddingVertical: 1,
        marginTop: 2
    },
    needsSortChipText: {
        color: '#EF4444',
        fontSize: 9,
        fontWeight: '800'
    },
    sortedStatusText: {
        color: '#10B981',
        fontSize: 9,
        fontWeight: '700',
        marginTop: 2
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end'
    },
    modalContainer: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '90%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    modalPrimaryBtn: {
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 14
    },
    modalPrimaryBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    txTypeToggleRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14
    },
    txTypeBtn: {
        flex: 1,
        backgroundColor: '#27272A',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center'
    },
    txTypeBtnText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700'
    },
    amountInputHero: {
        backgroundColor: '#27272A',
        borderRadius: 12,
        padding: 12,
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        textAlign: 'center',
        marginBottom: 12
    },
    inputLabel: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4
    },
    formInput: {
        backgroundColor: '#27272A',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        color: '#FFFFFF',
        fontSize: 13,
        marginBottom: 10
    },
    modalCatChip: {
        backgroundColor: '#27272A',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        marginRight: 6
    },
    modalCatChipActive: {
        backgroundColor: '#4F46E5'
    },
    modalCatChipText: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '600'
    },
    modalCatChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
    },
    modalAccChip: {
        backgroundColor: '#27272A',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        marginRight: 6
    },
    modalAccChipActive: {
        backgroundColor: '#10B981'
    },
    modalAccChipText: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '600'
    },
    modalAccChipTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
    },
    recurringSalaryAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#10B98115',
        borderColor: '#10B98130',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginBottom: 10
    },
    recurringSalaryAlertText: {
        color: '#10B981',
        fontSize: 11,
        flex: 1
    },
    transferNeutralNotice: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#1E1B4B',
        borderColor: '#312E81',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginBottom: 10
    },
    transferNeutralNoticeText: {
        color: '#818CF8',
        fontSize: 11,
        flex: 1
    },
    reviewWizardProgressBar: {
        backgroundColor: '#27272A',
        borderRadius: 6,
        paddingVertical: 4,
        alignItems: 'center',
        marginBottom: 12
    },
    reviewWizardProgressText: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '700'
    },
    reviewCardHero: {
        backgroundColor: '#27272A',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 10
    },
    reviewMerchantTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4
    },
    reviewAmountHero: {
        fontSize: 26,
        fontWeight: '900',
        color: '#EF4444',
        marginBottom: 4
    },
    reviewDateSub: {
        color: '#71717A',
        fontSize: 11
    },
    rawSmsBox: {
        backgroundColor: '#1F1F23',
        borderColor: '#333338',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12
    },
    rawSmsLabel: {
        color: '#71717A',
        fontSize: 9,
        fontWeight: '800',
        marginBottom: 2
    },
    rawSmsText: {
        color: '#D4D4D8',
        fontSize: 11,
        fontFamily: 'monospace'
    },
    categoryChipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    wizardCatChip: {
        backgroundColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8
    },
    wizardCatChipActive: {
        backgroundColor: '#4F46E5'
    },
    wizardCatChipText: {
        color: '#D4D4D8',
        fontSize: 12,
        fontWeight: '600'
    },
    confirmReviewBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#10B981',
        borderRadius: 10,
        paddingVertical: 10
    },
    confirmReviewBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    },
    applySimilarBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#1E1B4B',
        borderColor: '#818CF8',
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 10
    },
    applySimilarBtnText: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '800'
    },
    ignoreReviewBtn: {
        alignItems: 'center',
        paddingVertical: 8
    },
    ignoreReviewBtnText: {
        color: '#71717A',
        fontSize: 12,
        fontWeight: '600'
    },
    emptyReviewBox: {
        alignItems: 'center',
        paddingVertical: 30,
        gap: 8
    },
    emptyReviewTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    emptyReviewSub: {
        color: '#71717A',
        fontSize: 12,
        textAlign: 'center',
        paddingHorizontal: 20
    },
    formulaBox: {
        backgroundColor: '#1E1B4B',
        borderColor: '#312E81',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        marginBottom: 12
    },
    formulaText: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700',
        textAlign: 'center'
    },
    accountGroupHeader: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 6
    },
    mathBreakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 4
    },
    mathBreakdownLabel: {
        color: '#D4D4D8',
        fontSize: 12
    },
    mathBreakdownVal: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    mathTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopColor: '#27272A',
        borderTopWidth: 1,
        paddingTop: 4,
        marginTop: 4
    },
    mathTotalLabel: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700'
    },
    mathTotalVal: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '800'
    },
    mathResultBanner: {
        backgroundColor: '#27272A',
        borderRadius: 8,
        padding: 10,
        alignItems: 'center'
    },
    mathResultText: {
        color: '#FFFFFF',
        fontSize: 13
    },
    modalSubDesc: {
        color: '#A1A1AA',
        fontSize: 12,
        marginBottom: 12
    },
    designateItemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#27272A',
        borderRadius: 10,
        padding: 10,
        marginBottom: 6
    },
    designateItemRowActive: {
        borderColor: '#10B981',
        borderWidth: 1
    },
    designateItemName: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    designateItemBal: {
        color: '#71717A',
        fontSize: 11
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderColor: '#52525B',
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center'
    },
    checkboxActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981'
    },
    trendSummaryGrid: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 14
    },
    trendSummaryCol: {
        flex: 1,
        backgroundColor: '#27272A',
        borderRadius: 8,
        padding: 10,
        alignItems: 'center'
    },
    trendSummaryLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700',
        marginBottom: 2
    },
    trendSummaryVal: {
        fontSize: 15,
        fontWeight: '900'
    },
    trendMonthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10
    },
    trendBarTrack: {
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 2,
        overflow: 'hidden'
    },
    trendBarFill: {
        height: '100%',
        backgroundColor: '#818CF8',
        borderRadius: 2
    },
    donutPlaceholderCard: {
        backgroundColor: '#27272A',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 12
    },
    txDetailHeroCard: {
        backgroundColor: '#27272A',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginBottom: 12
    },
    txDetailMerchant: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4
    },
    txDetailAmount: {
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 4
    },
    txDetailDate: {
        color: '#71717A',
        fontSize: 11
    },
    txDetailSmsCard: {
        backgroundColor: '#1F1F23',
        borderColor: '#333338',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 12
    },
    txDetailSmsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    txDetailSmsTitle: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '700'
    },
    txDetailSmsBody: {
        color: '#D4D4D8',
        fontSize: 11,
        fontFamily: 'monospace',
        marginBottom: 8
    },
    deleteSmsOnlyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingTop: 6,
        borderTopColor: '#27272A',
        borderTopWidth: 1
    },
    deleteSmsOnlyBtnText: {
        color: '#EF4444',
        fontSize: 11,
        fontWeight: '700'
    },
    periodSectionHeading: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginBottom: 8
    },
    presetGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    presetBtn: {
        backgroundColor: '#27272A',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8
    },
    presetBtnActive: {
        backgroundColor: '#4F46E5'
    },
    presetBtnText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '600'
    },
    presetBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
    },
    yearSwitcherContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    yearNavBtn: {
        backgroundColor: '#27272A',
        padding: 4,
        borderRadius: 4
    },
    yearText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    monthGridItem: {
        width: (width - 88) / 4,
        backgroundColor: '#27272A',
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8
    },
    monthGridText: {
        color: '#D4D4D8',
        fontSize: 12,
        fontWeight: '700'
    },
    emptyBreakdownCard: {
        alignItems: 'center',
        paddingVertical: 20,
        gap: 4
    },
    emptyBreakdownTitle: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700'
    },
    emptyBreakdownSub: {
        color: '#71717A',
        fontSize: 10,
        textAlign: 'center'
    }
});
