/**
 * components/cashbook/TransactionFilterBar.js
 * 
 * Filter bar supporting Type selector (All, Income, Expense, Transfer),
 * Account filter pills, and Search query input.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Search, X } from 'lucide-react-native';
import { FilterType } from '../../services/cashbook/cashbookViewModel.js';

export default function TransactionFilterBar({
    activeFilter = FilterType.ALL,
    onSelectFilter,
    accounts = [],
    selectedAccountId = null,
    onSelectAccount,
    searchQuery = '',
    onSearchChange
}) {
    const filterTabs = [
        { id: FilterType.ALL, label: 'All' },
        { id: FilterType.INCOME, label: 'Income' },
        { id: FilterType.EXPENSE, label: 'Expense' },
        { id: FilterType.TRANSFER, label: 'Transfers' }
    ];

    return (
        <View style={styles.container}>
            {/* Search Input */}
            <View style={styles.searchBar}>
                <Search size={14} color="#64748B" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by description or category..."
                    placeholderTextColor="#64748B"
                    value={searchQuery}
                    onChangeText={onSearchChange}
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => onSearchChange('')}>
                        <X size={14} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Type Filter Tabs */}
            <View style={styles.tabRow}>
                {filterTabs.map(tab => {
                    const isActive = activeFilter === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            onPress={() => onSelectFilter(tab.id)}
                            style={[styles.tabButton, isActive && styles.tabButtonActive]}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Account Pills (if accounts exist) */}
            {accounts.length > 0 && (
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.accountsRow}
                >
                    <TouchableOpacity
                        onPress={() => onSelectAccount(null)}
                        style={[
                            styles.accountPill,
                            !selectedAccountId && styles.accountPillActive
                        ]}
                    >
                        <Text style={[
                            styles.accountPillText,
                            !selectedAccountId && styles.accountPillTextActive
                        ]}>
                            All Accounts
                        </Text>
                    </TouchableOpacity>

                    {accounts.map(acc => {
                        const isSelected = selectedAccountId === acc.id;
                        return (
                            <TouchableOpacity
                                key={acc.id}
                                onPress={() => onSelectAccount(isSelected ? null : acc.id)}
                                style={[styles.accountPill, isSelected && styles.accountPillActive]}
                            >
                                <Text style={[
                                    styles.accountPillText,
                                    isSelected && styles.accountPillTextActive
                                ]}>
                                    {acc.name} ({acc.formattedBalance})
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingBottom: 8
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1E293B',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 38,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 10,
        gap: 8
    },
    searchInput: {
        flex: 1,
        color: '#F8FAFC',
        fontSize: 13,
        padding: 0
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 10,
        padding: 3,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 10
    },
    tabButton: {
        flex: 1,
        paddingVertical: 7,
        alignItems: 'center',
        borderRadius: 8
    },
    tabButtonActive: {
        backgroundColor: '#1E293B'
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B'
    },
    tabTextActive: {
        color: '#F8FAFC'
    },
    accountsRow: {
        gap: 8,
        paddingVertical: 2
    },
    accountPill: {
        backgroundColor: '#1E293B',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    accountPillActive: {
        backgroundColor: 'rgba(56, 189, 248, 0.2)',
        borderColor: '#38BDF8'
    },
    accountPillText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500'
    },
    accountPillTextActive: {
        color: '#38BDF8',
        fontWeight: '700'
    }
});
