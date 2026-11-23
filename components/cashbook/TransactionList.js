/**
 * components/cashbook/TransactionList.js
 * 
 * FinLife Universal Cashbook — Grouped Transactions Ledger (Screen 3).
 * 
 * Features:
 * - Search bar with filter icon (matching mockup)
 * - Date-grouped SectionList with formatted date headers ("Tue, Jan 28, 2025")
 * - Sticky section headers
 * - Smooth pull-to-refresh
 * - Clean light styling matching FinLife specification (#FFFFFF, #F8FAFC)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity, TextInput } from 'react-native';
import { Calendar, Plus, Search, SlidersHorizontal } from 'lucide-react-native';
import TransactionRow from './TransactionRow.js';
import { formatDateHeader } from '../../services/cashbook/cashbookPresentation.js';

export { formatDateHeader };

export default function TransactionList({
    sections = [],
    refreshing = false,
    onRefresh,
    onPressRow,
    onAddPress,
    onFilter,
    ListHeaderComponent
}) {
    const [searchText, setSearchText] = useState('');

    const filteredSections = searchText.trim()
        ? sections
            .map(section => ({
                ...section,
                data: section.data.filter(item =>
                    (item.description || '').toLowerCase().includes(searchText.toLowerCase()) ||
                    (item.accountDisplay || '').toLowerCase().includes(searchText.toLowerCase())
                )
            }))
            .filter(section => section.data.length > 0)
        : sections;

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

    const SearchHeader = (
        <View style={styles.searchBar}>
            <View style={styles.searchInputWrap}>
                <Search size={16} color="#94A3B8" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search transactions..."
                    placeholderTextColor="#94A3B8"
                    value={searchText}
                    onChangeText={setSearchText}
                    returnKeyType="search"
                />
            </View>
            <TouchableOpacity
                style={styles.filterBtn}
                onPress={onFilter}
                activeOpacity={0.7}
                accessibilityLabel="Filter transactions"
            >
                <SlidersHorizontal size={18} color="#64748B" />
            </TouchableOpacity>
        </View>
    );

    return (
        <SectionList
            sections={filteredSections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListHeaderComponent={
                <>
                    {SearchHeader}
                    {ListHeaderComponent}
                </>
            }
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled
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
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F8FAFC'
    },
    searchInputWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 8
    },
    searchIcon: {
        // small offset handled by gap
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: '#0F172A',
        padding: 0
    },
    filterBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
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
