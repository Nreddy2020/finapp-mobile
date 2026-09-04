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
import { View, Text, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function CashActivitySection({
    data,
    onOpenAddModal,
    onSelectTransaction,
    onReviewTransaction
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'needs_review' | 'expense' | 'income'

    const transactions = data?.transactions || [];
    const counts = data?.counts || { all: 0, needsReview: 0, expense: 0, income: 0 };

    // 1. Filter by Tab
    const tabFiltered = transactions.filter((tx) => {
        if (activeTab === 'needs_review') return tx.isReviewNeeded;
        if (activeTab === 'expense') return tx.type === 'EXPENSE';
        if (activeTab === 'income') return tx.type === 'INCOME';
        return true;
    });

    // 2. Filter by Search Query
    const searchFiltered = tabFiltered.filter((tx) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
            (tx.merchant && tx.merchant.toLowerCase().includes(q)) ||
            (tx.category && tx.category.toLowerCase().includes(q)) ||
            (tx.accountName && tx.accountName.toLowerCase().includes(q))
        );
    });

    // 3. Group by Date Group
    const groups = ['Today', 'Yesterday', 'Older'];
    const groupedData = {};
    for (const g of groups) {
        groupedData[g] = [];
    }

    for (const tx of searchFiltered) {
        const g = tx.dateGroup || 'Older';
        if (!groupedData[g]) groupedData[g] = [];
        groupedData[g].push(tx);
    }

    return (
        <View style={mfStyles.card}>
            {/* Header */}
            <View style={mfStyles.activityHeader}>
                <Text style={mfStyles.sectionTitle}>Cash Activity</Text>
                <TouchableOpacity
                    style={mfStyles.addActivityBtn}
                    onPress={() => onOpenAddModal && onOpenAddModal('EXPENSE')}
                    accessibilityRole="button"
                    accessibilityLabel="Add cash activity"
                >
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={mfStyles.addActivityBtnText}>Add Activity</Text>
                </TouchableOpacity>
            </View>

            {/* Filter Tabs */}
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
                            Needs Review
                        </Text>
                        {counts.needsReview > 0 && (
                            <View style={mfStyles.filterTabBadge}>
                                <Text style={mfStyles.filterTabBadgeText}>{counts.needsReview}</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Expenses */}
                    <TouchableOpacity
                        style={[mfStyles.filterTab, activeTab === 'expense' && mfStyles.filterTabActive]}
                        onPress={() => setActiveTab('expense')}
                        activeOpacity={0.7}
                    >
                        <Text style={[mfStyles.filterTabText, activeTab === 'expense' && mfStyles.filterTabTextActive]}>
                            Expenses
                        </Text>
                    </TouchableOpacity>

                    {/* Income */}
                    <TouchableOpacity
                        style={[mfStyles.filterTab, activeTab === 'income' && mfStyles.filterTabActive]}
                        onPress={() => setActiveTab('income')}
                        activeOpacity={0.7}
                    >
                        <Text style={[mfStyles.filterTabText, activeTab === 'income' && mfStyles.filterTabTextActive]}>
                            Income
                        </Text>
                    </TouchableOpacity>
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

            {/* Grouped Transactions List */}
            {searchFiltered.length === 0 ? (
                <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Ionicons name="receipt-outline" size={32} color={MF_COLORS.textMuted} style={{ marginBottom: 8 }} />
                    <Text style={{ color: MF_COLORS.textMuted, fontSize: 13 }}>
                        No transactions found matching criteria
                    </Text>
                </View>
            ) : (
                groups.map((groupName) => {
                    const groupItems = groupedData[groupName] || [];
                    if (groupItems.length === 0) return null;

                    return (
                        <View key={groupName}>
                            {/* Date Group Header */}
                            <View style={mfStyles.dateGroupHeader}>
                                <Text style={mfStyles.dateGroupHeaderText}>{groupName}</Text>
                            </View>

                            {/* Group Items */}
                            {groupItems.map((tx) => {
                                const isIncome = tx.type === 'INCOME';
                                const isTransfer = tx.type === 'TRANSFER';
                                const amountColor = isIncome
                                    ? MF_COLORS.successGreenLight
                                    : (isTransfer ? MF_COLORS.textSecondary : MF_COLORS.textPrimary);

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
                                                    { backgroundColor: isIncome ? MF_COLORS.successGreenBg : MF_COLORS.cardBgElevated }
                                                ]}
                                            >
                                                <Text style={mfStyles.activityEmojiText}>
                                                    {tx.categoryEmoji || (isIncome ? '💰' : '💳')}
                                                </Text>
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
                                            <Text style={[mfStyles.activityAmount, { color: amountColor }]}>
                                                {tx.amountFormatted}
                                            </Text>
                                            {tx.isReviewNeeded ? (
                                                <TouchableOpacity
                                                    style={mfStyles.statusBadgeReview}
                                                    onPress={() => onReviewTransaction && onReviewTransaction(tx.rawTransaction)}
                                                >
                                                    <Text style={mfStyles.statusBadgeReviewText}>⚠ Review</Text>
                                                </TouchableOpacity>
                                            ) : (
                                                <View style={mfStyles.statusBadgeSorted}>
                                                    <Text style={mfStyles.statusBadgeSortedText}>✓ Sorted</Text>
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
        </View>
    );
}
