/**
 * components/commitments/CommitmentFilterPills.js
 * 
 * Filter pills for commitments: All, Subscriptions, Loans & EMIs, Bills & Rent, Annual.
 */

import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { CommitmentFilterPill } from '../../services/commitments/commitmentViewModel.js';

export default function CommitmentFilterPills({
    selectedFilter,
    onSelectFilter,
    counts = {}
}) {
    const filters = [
        { id: CommitmentFilterPill.ALL, label: 'All', count: counts.all || 0 },
        { id: CommitmentFilterPill.SUBSCRIPTIONS, label: 'Subscriptions', count: counts.subscriptions || 0 },
        { id: CommitmentFilterPill.LOANS, label: 'Loans & EMIs', count: counts.loans || 0 },
        { id: CommitmentFilterPill.BILLS, label: 'Bills & Rent', count: counts.bills || 0 },
        { id: CommitmentFilterPill.ANNUAL, label: 'Annual', count: counts.annual || 0 }
    ];

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.container}
        >
            {filters.map(filter => {
                const isActive = selectedFilter === filter.id;
                return (
                    <TouchableOpacity
                        key={filter.id}
                        style={[styles.pill, isActive && styles.pillActive]}
                        onPress={() => onSelectFilter(filter.id)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                            {filter.label}
                        </Text>
                        {filter.count > 0 && (
                            <View style={[styles.badge, isActive && styles.badgeActive]}>
                                <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                                    {filter.count}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 8,
        flexDirection: 'row',
        alignItems: 'center'
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1E1B2E',
        borderWidth: 1,
        borderColor: '#2D2845',
        gap: 6
    },
    pillActive: {
        backgroundColor: '#701A75',
        borderColor: '#D946EF'
    },
    pillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#94A3B8'
    },
    pillTextActive: {
        color: '#FFFFFF'
    },
    badge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: '#2D2845'
    },
    badgeActive: {
        backgroundColor: '#A21CAF'
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#CBD5E1'
    },
    badgeTextActive: {
        color: '#FFFFFF'
    }
});
