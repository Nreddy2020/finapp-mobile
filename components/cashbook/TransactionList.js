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
import { Plus, Search, SlidersHorizontal, X } from 'lucide-react-native';
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
    filterActive = false,
    ListHeaderComponent,
    // Controlled search (owned by the screen so it is filtered once, in the view
    // model, and is reset when the book changes). Falls back to local state when
    // used standalone.
    searchQuery,
    onSearchChange
}) {
    const [localSearch, setLocalSearch] = useState('');
    const isControlled = typeof onSearchChange === 'function';
    const searchText = isControlled ? (searchQuery || '') : localSearch;
    const setSearchText = isControlled ? onSearchChange : setLocalSearch;

    // When controlled, the view model has already applied the query.
    const needle = searchText.trim().toLowerCase();
    const filteredSections = !isControlled && needle
        ? sections
            .map(section => ({
                ...section,
                data: section.data.filter(item =>
                    (item.description || '').toLowerCase().includes(needle) ||
                    (item.accountDisplay || '').toLowerCase().includes(needle)
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
            <Text style={styles.emptyTitle}>
                {needle || filterActive ? 'No Matching Transactions' : 'No Transactions Yet'}
            </Text>
            <Text style={styles.emptySubtext}>
                {needle || filterActive
                    ? 'Nothing matches your current search or filters.'
                    : 'Record your first transaction to start this book.'}
            </Text>
            {onAddPress && !needle && !filterActive && (
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
                    autoCorrect={false}
                    autoCapitalize="none"
                />
                {searchText.length > 0 && (
                    <TouchableOpacity
                        onPress={() => setSearchText('')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        accessibilityLabel="Clear search"
                    >
                        <X size={16} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>
            <TouchableOpacity
                style={[styles.filterBtn, filterActive && styles.filterBtnActive]}
                onPress={onFilter}
                activeOpacity={0.7}
                accessibilityLabel="Filter transactions"
            >
                <SlidersHorizontal size={18} color={filterActive ? '#6366F1' : '#64748B'} />
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
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
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
        paddingBottom: 110,
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
    filterBtnActive: {
        backgroundColor: '#EEF2FF',
        borderColor: '#6366F1'
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
