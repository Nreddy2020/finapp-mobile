/**
 * components/cashbook/TransactionFilterBar.js
 * 
 * Filter bar supporting Type selector (All, Income, Expense, Transfer)
 * and Account filter pills with FinLife light theme styling.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FilterType } from '../../services/cashbook/cashbookViewModel.js';

export default function TransactionFilterBar({
    activeFilter = FilterType.ALL,
    onSelectFilter,
    accounts = [],
    selectedAccountId = null,
    onSelectAccount
}) {
    const filterTabs = [
        { id: FilterType.ALL, label: 'All' },
        { id: FilterType.INCOME, label: 'Income' },
        { id: FilterType.EXPENSE, label: 'Expense' },
        { id: FilterType.TRANSFER, label: 'Transfers' }
    ];

    return (
        <View style={styles.container}>
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
        paddingVertical: 8,
        backgroundColor: '#F8FAFC',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    tabRow: {
        flexDirection: 'row',
        backgroundColor: '#E2E8F0',
        borderRadius: 12,
        padding: 3,
        marginBottom: 8
    },
    tabButton: {
        flex: 1,
        paddingVertical: 7,
        alignItems: 'center',
        borderRadius: 10
    },
    tabButtonActive: {
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 1
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B'
    },
    tabTextActive: {
        color: '#6366F1',
        fontWeight: '700'
    },
    accountsRow: {
        gap: 8,
        paddingVertical: 2
    },
    accountPill: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    accountPillActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366F1'
    },
    accountPillText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '500'
    },
    accountPillTextActive: {
        color: '#6366F1',
        fontWeight: '700'
    }
});
