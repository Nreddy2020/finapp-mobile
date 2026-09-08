/**
 * components/cashbook/TransactionList.js
 * 
 * SectionList grouped by date with sticky section headers,
 * clean empty state card, and pull-to-refresh.
 */

import React from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity } from 'react-native';
import { Calendar, PlusCircle } from 'lucide-react-native';
import TransactionRow from './TransactionRow.js';

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
            <Calendar size={12} color="#64748B" />
            <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
    );

    const renderItem = ({ item }) => (
        <TransactionRow item={item} onPress={onPressRow} />
    );

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtext}>
                No cashbook transactions match your active filters.
            </Text>
            {onAddPress && (
                <TouchableOpacity
                    style={styles.emptyButton}
                    onPress={onAddPress}
                    activeOpacity={0.8}
                >
                    <PlusCircle size={14} color="#0F172A" />
                    <Text style={styles.emptyButtonText}>Add Transaction</Text>
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
            refreshControl={
                onRefresh ? (
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#38BDF8"
                        colors={['#38BDF8']}
                    />
                ) : undefined
            }
        />
    );
}

const styles = StyleSheet.create({
    listContent: {
        paddingBottom: 90
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: 6,
        backgroundColor: '#0F172A'
    },
    sectionHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#64748B',
        textTransform: 'uppercase'
    },
    emptyContainer: {
        alignItems: 'center',
        padding: 36,
        marginHorizontal: 16,
        marginVertical: 20,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155'
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 6
    },
    emptySubtext: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 16
    },
    emptyButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#38BDF8',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12
    },
    emptyButtonText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A'
    }
});
