/**
 * CashActivitySection.js
 * 
 * CASH ACTIVITY JOURNAL WITH REVIEW QUEUE & DATE GROUPING
 * 
 * Invariants:
 * - MONEYFLOW-VIEW-01: Values originate strictly from ViewModel.
 * - MONEYFLOW-VIEW-02: Zero financial math in JSX.
 * - SMS-03: Needs Review queue directly accessible with 1-tap resolution.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';
import { STANDARD_CATEGORIES } from '../moneyFlowPresentationAdapter.js';

function getActivityIconConfig(tx) {
    const merchant = (tx.merchant || '').toLowerCase();
    const category = (tx.category || '').toLowerCase();

    if (merchant.includes('netflix') || category.includes('entertain')) {
        return { icon: 'film', color: '#CBD5E1', bg: '#121E36' };
    }
    if (merchant.includes('swiggy') || merchant.includes('zomato') || category.includes('grocer') || category.includes('food')) {
        if (merchant.includes('bigbasket') || merchant.includes('blinkit') || merchant.includes('zepto')) {
            return { icon: 'cart', color: '#F43F5E', bg: '#1A1B2E' };
        }
        return { icon: 'restaurant', color: '#F59E0B', bg: '#1C1C28' };
    }
    if (merchant.includes('amazon') || category.includes('shopping')) {
        return { icon: 'bag-handle', color: '#10B981', bg: '#13242E' };
    }
    if (merchant.includes('shell') || merchant.includes('fuel') || category.includes('transport')) {
        return { icon: 'car', color: '#38BDF8', bg: '#0E2238' };
    }
    if (tx.type === 'INCOME' || category.includes('salary')) {
        return { icon: 'cash', color: '#10B981', bg: '#0F291E' };
    }
    if (tx.type === 'TRANSFER' || category.includes('transfer')) {
        return { icon: 'swap-horizontal', color: '#3B82F6', bg: '#122038' };
    }
    return { icon: 'pricetag', color: '#60A5FA', bg: '#111D33' };
}

export function CashActivitySection({
    data,
    onOpenAddModal,
    onSelectTransaction,
    onReviewTransaction
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'needs_review' | 'expense' | 'income' | 'custom'
    const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'week' | 'month' | 'custom'
    const [customDateFilter, setCustomDateFilter] = useState(null); // 'YYYY-MM-DD'
    const [showCustomDateModal, setShowCustomDateModal] = useState(false);
    const [manualDateInput, setManualDateInput] = useState('');

    const transactions = data?.transactions || [];

    const isCustomTx = (tx) => {
        if (tx.isCustom) return true;
        if (tx.rawTransaction?.isCustom) return true;
        if (!tx.category) return false;
        return !STANDARD_CATEGORIES.has(tx.category);
    };
    
    // Derive live counts across all transactions for tabs
    const liveCounts = {
        all: transactions.length,
        needsReview: transactions.filter(t => t.isReviewNeeded || t.needsSort || t.status === 'NEEDS_REVIEW').length,
        expense: transactions.filter(t => t.type === 'EXPENSE').length,
        income: transactions.filter(t => t.type === 'INCOME').length,
        custom: transactions.filter(isCustomTx).length
    };
    const counts = {
        all: data?.counts?.all ?? liveCounts.all,
        needsReview: data?.counts?.needsReview ?? liveCounts.needsReview,
        expense: data?.counts?.expense ?? liveCounts.expense,
        income: data?.counts?.income ?? liveCounts.income,
        custom: data?.counts?.custom ?? liveCounts.custom
    };

    // 1. Filter by Tab
    const tabFiltered = transactions.filter((tx) => {
        if (activeTab === 'needs_review') return tx.isReviewNeeded || tx.needsSort || tx.status === 'NEEDS_REVIEW';
        if (activeTab === 'expense') return tx.type === 'EXPENSE';
        if (activeTab === 'income') return tx.type === 'INCOME';
        if (activeTab === 'custom') return isCustomTx(tx);
        return true;
    });

    // 2. Filter by Date Range
    const now = new Date();
    const todayISO = now.toISOString().split('T')[0];
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const weekStart = new Date(todayStart.getTime() - 7 * 86400000);
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();

    const dateFiltered = tabFiltered.filter((tx) => {
        if (dateFilter === 'all') return true;
        if (!tx.date) return false;
        const txDate = new Date(tx.date);
        const txDateISO = tx.date.split('T')[0];

        if (dateFilter === 'today') {
            return txDateISO === todayISO || (txDate >= todayStart && txDate <= todayEnd);
        }
        if (dateFilter === 'week') {
            return txDate >= weekStart && txDate <= todayEnd;
        }
        if (dateFilter === 'month') {
            return txDate.getFullYear() === curYear && txDate.getMonth() === curMonth;
        }
        if (dateFilter === 'custom' && customDateFilter) {
            return txDateISO === customDateFilter;
        }
        return true;
    });

    // 3. Filter by Search Query
    const searchFiltered = dateFiltered.filter((tx) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (tx.merchant && tx.merchant.toLowerCase().includes(q)) ||
            (tx.category && tx.category.toLowerCase().includes(q)) ||
            (tx.accountName && tx.accountName.toLowerCase().includes(q))
        );
    });

    // 4. Group by Day, sorted newest first
    const dateGroupsMap = {};
    for (const tx of searchFiltered) {
        const rawDate = tx.date ? tx.date.split('T')[0] : 'undated';
        if (!dateGroupsMap[rawDate]) {
            dateGroupsMap[rawDate] = {
                dateKey: rawDate,
                items: [],
                totalAmount: 0
            };
        }
        dateGroupsMap[rawDate].items.push(tx);
        if (tx.type === 'EXPENSE') {
            dateGroupsMap[rawDate].totalAmount += Number(tx.amount || 0);
        }
    }

    const sortedDateKeys = Object.keys(dateGroupsMap).sort((a, b) => {
        if (a === 'undated') return 1;
        if (b === 'undated') return -1;
        return new Date(b).getTime() - new Date(a).getTime();
    });

    const formatDateGroupTitle = (dateKey) => {
        if (dateKey === 'undated') return 'Unspecified Date';
        try {
            const d = new Date(dateKey + 'T00:00:00Z');
            const now = new Date();
            const todayKey = now.toISOString().split('T')[0];
            const yesterdayKey = new Date(now.getTime() - 86400000).toISOString().split('T')[0];

            const dateFormatted = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
            if (dateKey === todayKey) return `Today · ${dateFormatted}`;
            if (dateKey === yesterdayKey) return `Yesterday · ${dateFormatted}`;
            return dateFormatted;
        } catch {
            return dateKey;
        }
    };

    const formatCustomDateChip = (dStr) => {
        if (!dStr) return '';
        try {
            const d = new Date(dStr + 'T00:00:00Z');
            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
        } catch {
            return dStr;
        }
    };

    const availableDates = Array.from(new Set(
        transactions.map(t => t.date ? t.date.split('T')[0] : null).filter(Boolean)
    )).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return (
        <View style={mfStyles.card}>
            {/* Header: Clean section title */}
            <View style={mfStyles.activityHeader}>
                <Text style={mfStyles.sectionTitle}>Cash Activity</Text>
            </View>

            {/* Type / Status Filter Tabs with Live Counts */}
            <View style={mfStyles.filterTabsScroll}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mfStyles.filterTabsContainer}>
                    {/* All */}
                    <TouchableOpacity
                        style={[mfStyles.filterTab, activeTab === 'all' && mfStyles.filterTabActive]}
                        onPress={() => setActiveTab('all')}
                        activeOpacity={0.7}
                    >
                        <Text style={[mfStyles.filterTabText, activeTab === 'all' && mfStyles.filterTabTextActive]}>
                            All ({counts.all})
                        </Text>
                    </TouchableOpacity>

                    {/* Expenses */}
                    <TouchableOpacity
                        style={[mfStyles.filterTab, activeTab === 'expense' && mfStyles.filterTabActive]}
                        onPress={() => setActiveTab('expense')}
                        activeOpacity={0.7}
                    >
                        <Text style={[mfStyles.filterTabText, activeTab === 'expense' && mfStyles.filterTabTextActive]}>
                            Expenses ({counts.expense})
                        </Text>
                    </TouchableOpacity>

                    {/* Income */}
                    <TouchableOpacity
                        style={[mfStyles.filterTab, activeTab === 'income' && mfStyles.filterTabActive]}
                        onPress={() => setActiveTab('income')}
                        activeOpacity={0.7}
                    >
                        <Text style={[mfStyles.filterTabText, activeTab === 'income' && mfStyles.filterTabTextActive]}>
                            Income ({counts.income})
                        </Text>
                    </TouchableOpacity>

                    {/* Custom Category Entries */}
                    <TouchableOpacity
                        style={[
                            mfStyles.filterTab,
                            activeTab === 'custom' && mfStyles.filterTabActive,
                            counts.custom > 0 && { borderColor: MF_COLORS.primaryBlueLight }
                        ]}
                        onPress={() => setActiveTab('custom')}
                        activeOpacity={0.7}
                    >
                        <Text style={[mfStyles.filterTabText, activeTab === 'custom' && mfStyles.filterTabTextActive]}>
                            Custom ({counts.custom})
                        </Text>
                    </TouchableOpacity>

                    {/* Needs Review */}
                    <TouchableOpacity
                        style={[
                            mfStyles.filterTab,
                            activeTab === 'needs_review' && mfStyles.filterTabActive,
                            counts.needsReview > 0 && { borderColor: MF_COLORS.warningAmber }
                        ]}
                        onPress={() => setActiveTab('needs_review')}
                        activeOpacity={0.7}
                    >
                        <Text style={[mfStyles.filterTabText, activeTab === 'needs_review' && mfStyles.filterTabTextActive]}>
                            Needs Review ({counts.needsReview})
                        </Text>
                        {counts.needsReview > 0 && (
                            <View style={mfStyles.filterTabBadge}>
                                <Text style={mfStyles.filterTabBadgeText}>{counts.needsReview}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Date Range Sub-Filters */}
            <View style={localStyles.dateFilterRow}>
                <Text style={localStyles.dateFilterLabel}>DATE:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={localStyles.dateFilterScroll}>
                    {[
                        { id: 'all', label: 'All Dates' },
                        { id: 'today', label: 'Today' },
                        { id: 'week', label: 'This Week' },
                        { id: 'month', label: 'This Month' },
                        { id: 'custom', label: customDateFilter ? `Custom: ${formatCustomDateChip(customDateFilter)}` : 'Custom Date' }
                    ].map(df => {
                        const isSelected = dateFilter === df.id;
                        return (
                            <TouchableOpacity
                                key={df.id}
                                style={[
                                    localStyles.datePill,
                                    isSelected && localStyles.datePillActive
                                ]}
                                onPress={() => {
                                    if (df.id === 'custom') {
                                        setShowCustomDateModal(true);
                                    } else {
                                        setDateFilter(df.id);
                                        setCustomDateFilter(null);
                                    }
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    localStyles.datePillText,
                                    isSelected && localStyles.datePillTextActive
                                ]}>
                                    {df.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            {/* Search Input */}
            <View style={mfStyles.searchContainer}>
                <Ionicons name="search" size={16} color={MF_COLORS.textMuted} />
                <TextInput
                    style={mfStyles.searchInput}
                    placeholder="Search transactions, merchants, accounts..."
                    placeholderTextColor={MF_COLORS.textMuted}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={16} color={MF_COLORS.textMuted} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Date-Wise Grouped Transactions List */}
            {searchFiltered.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={32} color={MF_COLORS.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ color: MF_COLORS.textMuted, fontSize: 13 }}>
                        No transactions found matching criteria
                    </Text>
                </View>
            ) : (
                sortedDateKeys.map((dateKey) => {
                    const group = dateGroupsMap[dateKey];
                    if (!group || group.items.length === 0) return null;

                    return (
                        <View key={dateKey} style={localStyles.dateGroupBlock}>
                            {/* Date Group Header */}
                            <View style={localStyles.dateGroupHeader}>
                                <Text style={localStyles.dateGroupTitle}>
                                    {formatDateGroupTitle(group.dateKey)}
                                </Text>
                                <Text style={localStyles.dateGroupMeta}>
                                    {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                                    {group.totalAmount > 0 ? ` · ₹${group.totalAmount.toLocaleString('en-IN')}` : ''}
                                </Text>
                            </View>

                            {/* Group Items */}
                            {group.items.map((tx) => {
                                const isIncome = tx.type === 'INCOME';
                                const isTransfer = tx.type === 'TRANSFER';
                                const amountColor = isIncome
                                    ? MF_COLORS.successGreenLight
                                    : (isTransfer ? MF_COLORS.textSecondary : MF_COLORS.textPrimary);

                                const iconCfg = getActivityIconConfig(tx);

                                return (
                                    <TouchableOpacity
                                        key={tx.id}
                                        style={mfStyles.activityItem}
                                        onPress={() => {
                                            if (tx.isReviewNeeded && onReviewTransaction) {
                                                onReviewTransaction(tx.rawTransaction);
                                            } else if (onSelectTransaction) {
                                                onSelectTransaction(tx.rawTransaction);
                                            }
                                        }}
                                        activeOpacity={0.7}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${tx.merchant}, ${tx.amountFormatted}`}
                                    >
                                        <View style={mfStyles.activityLeft}>
                                            <View
                                                style={[
                                                    mfStyles.activityEmojiBox,
                                                    { backgroundColor: iconCfg.bg }
                                                ]}
                                            >
                                                <Ionicons name={iconCfg.icon} size={20} color={iconCfg.color} />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={mfStyles.activityMerchant} numberOfLines={1}>
                                                    {tx.merchant}
                                                </Text>
                                                <Text style={mfStyles.activityDate}>
                                                    {tx.dateFormatted} · {tx.category} · {tx.accountName}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={mfStyles.activityRight}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <Text style={[mfStyles.activityAmount, { color: amountColor }]}>
                                                    {tx.amountFormatted}
                                                </Text>
                                                <Ionicons name="chevron-forward" size={16} color="#3B82F6" style={{ marginLeft: 6 }} />
                                            </View>
                                            {tx.isReviewNeeded ? (
                                                <TouchableOpacity
                                                    style={mfStyles.statusBadgeReview}
                                                    onPress={() => onReviewTransaction && onReviewTransaction(tx.rawTransaction)}
                                                >
                                                    <Text style={mfStyles.statusBadgeReviewText}>{tx.statusTag || '⚠ Review · SMS'}</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={mfStyles.statusBadgeSorted}>
                                                    <Text style={mfStyles.statusBadgeSortedText}>{tx.statusTag || '✓ Sorted · SMS'}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    );
                })
            )}

            {/* Custom Date Selector Modal */}
            <Modal
                visible={showCustomDateModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCustomDateModal(false)}
            >
                <View style={mfStyles.modalOverlay}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setShowCustomDateModal(false)} activeOpacity={1} />
                    <View style={[mfStyles.modalContent, { maxHeight: 520 }]}>
                        <View style={mfStyles.modalHeader}>
                            <Text style={mfStyles.modalTitle}>Filter by Date</Text>
                            <TouchableOpacity onPress={() => setShowCustomDateModal(false)} style={mfStyles.modalCloseBtn}>
                                <Ionicons name="close" size={24} color={MF_COLORS.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <Text style={{ fontSize: 13, color: MF_COLORS.textSecondary, marginBottom: 12 }}>
                            Enter a specific date or pick from recorded activity:
                        </Text>

                        {/* Manual Date Input */}
                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                            <TextInput
                                style={[mfStyles.searchInput, { flex: 1, backgroundColor: MF_COLORS.cardBgElevated, borderRadius: 10, paddingHorizontal: 12, height: 44, color: MF_COLORS.textPrimary }]}
                                placeholder="YYYY-MM-DD (e.g. 2026-10-25)"
                                placeholderTextColor={MF_COLORS.textMuted}
                                value={manualDateInput}
                                onChangeText={setManualDateInput}
                            />
                            <TouchableOpacity
                                style={{ backgroundColor: MF_COLORS.primaryBlue, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}
                                onPress={() => {
                                    if (manualDateInput.trim()) {
                                        setCustomDateFilter(manualDateInput.trim());
                                        setDateFilter('custom');
                                        setShowCustomDateModal(false);
                                    }
                                }}
                            >
                                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>Set</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Quick Dates from Transactions */}
                        <Text style={[localStyles.dateFilterLabel, { marginBottom: 8 }]}>ACTIVITY DATES:</Text>
                        <ScrollView style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
                            {availableDates.map(dStr => {
                                const isPicked = customDateFilter === dStr;
                                return (
                                    <TouchableOpacity
                                        key={dStr}
                                        style={[
                                            localStyles.dateOptionRow,
                                            isPicked && localStyles.dateOptionRowActive
                                        ]}
                                        onPress={() => {
                                            setCustomDateFilter(dStr);
                                            setDateFilter('custom');
                                            setShowCustomDateModal(false);
                                        }}
                                    >
                                        <Text style={[
                                            localStyles.dateOptionText,
                                            isPicked && localStyles.dateOptionTextActive
                                        ]}>
                                            {formatDateGroupTitle(dStr)} ({dStr})
                                        </Text>
                                        {isPicked && (
                                            <Ionicons name="checkmark-circle" size={18} color={MF_COLORS.primaryBlueLight} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>

                        {/* Reset Filter Button */}
                        <TouchableOpacity
                            style={{ marginTop: 14, paddingVertical: 12, alignItems: 'center' }}
                            onPress={() => {
                                setCustomDateFilter(null);
                                setDateFilter('all');
                                setShowCustomDateModal(false);
                            }}
                        >
                            <Text style={{ color: MF_COLORS.dangerRedLight, fontSize: 13, fontWeight: '600' }}>
                                Clear Date Filter (Show All Dates)
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const localStyles = StyleSheet.create({
    dateFilterRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 2,
    },
    dateFilterLabel: {
        fontSize: 12,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.8,
        marginRight: 10,
    },
    dateFilterScroll: {
        gap: 6,
    },
    datePill: {
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 12,
        backgroundColor: '#091426',
        borderWidth: 1,
        borderColor: '#14223B',
        marginRight: 6,
    },
    datePillActive: {
        backgroundColor: '#2563EB',
        borderColor: '#2563EB',
    },
    datePillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
    },
    datePillTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    dateOptionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#1E293B',
        marginBottom: 6,
    },
    dateOptionRowActive: {
        backgroundColor: '#1E3A8A',
        borderWidth: 1,
        borderColor: '#3B82F6',
    },
    dateOptionText: {
        fontSize: 13,
        color: '#94A3B8',
    },
    dateOptionTextActive: {
        color: '#FFFFFF',
        fontWeight: '700',
    },
    dateGroupBlock: {
        marginBottom: 10,
    },
    dateGroupHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 4,
        marginTop: 6,
        marginBottom: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#0E1A2E',
    },
    dateGroupTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateGroupMeta: {
        fontSize: 13,
        fontWeight: '500',
        color: '#64748B',
    },
});
