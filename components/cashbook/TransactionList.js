/**
 * components/cashbook/TransactionList.js
 * 
 * FinLife Universal Cashbook — Grouped Transactions Ledger (Screen 3).
 * 
 * Features:
 * - Date-grouped SectionList with formatted date headers ("Tue, Jan 28, 2025")
 * - Sticky section headers
 * - Smooth pull-to-refresh
 * - Clean light styling matching FinLife specification (#FFFFFF, #F8FAFC)
 */

import React from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity } from 'react-native';
import { Calendar, Plus } from 'lucide-react-native';
import TransactionRow from './TransactionRow.js';
import { formatDateHeader } from '../../services/cashbook/cashbookPresentation.js';

export { formatDateHeader };

export default function TransactionList({
    sections = [],
    refreshing = false,
    onRefresh,
    onPressRow,
    onAddPress,
    ListHeaderComponent
}) {
    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{formatDateHeader(title)}</Text>
        </View>
    );

    const renderItem = ({ item }) => (
        <TransactionRow item={item} onPress={onPressRow} />
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtext}>
                No cashbook transactions match your active search or filters.
            </Text>
            {onAddPress && (
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={onAddPress}
                    activeOpacity={0.8}
                >
                    <Plus size={14} color="#FFFFFF" />
                    <Text style={styles.emptyButtonText}>Add First Transaction</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={ListHeaderComponent}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#6366F1"
                        colors={['#6366F1']}
                    />
                ) : undefined
            }
        />
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: 90,
        backgroundColor: '#F8FAFC'
    },
    sectionHeader: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 8,
        backgroundColor: '#F8FAFC'
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#64748B'
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 36,
        marginHorizontal: 20,
        marginVertical: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 6
    },
    emptySubtext: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#6366F1',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20
    },
    emptyButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF'
    }
});
