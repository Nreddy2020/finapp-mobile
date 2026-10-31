import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

/**
 * ActionHorizonFilterBar
 * 
 * Interactive filter pills for status tier, domain, and person.
 */
export default function ActionHorizonFilterBar({
    activeStatus = 'ALL',
    activeDomain = 'ALL',
    onSelectStatus,
    onSelectDomain
}) {
    const statusFilters = [
        { key: 'ALL', label: 'All Tiers' },
        { key: 'OVERDUE', label: 'Overdue' },
        { key: 'IMMEDIATE', label: 'Immediate (0-7d)' },
        { key: 'UPCOMING', label: 'Upcoming (8-30d)' },
        { key: 'LOOKING_AHEAD', label: 'Ahead (31-90d)' }
    ];

    const domainFilters = [
        { key: 'ALL', label: 'All Domains' },
        { key: 'FINANCIAL', label: 'Financial' },
        { key: 'DOCUMENT', label: 'Vault' },
        { key: 'OPERATION', label: 'Operations' },
        { key: 'PROTECTION', label: 'Protection' }
    ];

    return (
        <View style={styles.container}>
            {/* Status Tier Filters */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.scrollRow}
            >
                {statusFilters.map((s) => {
                    const isSelected = activeStatus === s.key;
                    return (
                        <TouchableOpacity
                            key={s.key}
                            style={[styles.pill, isSelected && styles.activePill]}
                            onPress={() => onSelectStatus(s.key)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.pillText, isSelected && styles.activePillText]}>
                                {s.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Domain Filters */}
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={[styles.scrollRow, { marginTop: 6 }]}
            >
                {domainFilters.map((d) => {
                    const isSelected = activeDomain === d.key;
                    return (
                        <TouchableOpacity
                            key={d.key}
                            style={[styles.domainPill, isSelected && styles.activeDomainPill]}
                            onPress={() => onSelectDomain(d.key)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.domainPillText, isSelected && styles.activeDomainPillText]}>
                                {d.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16
    },
    scrollRow: {
        gap: 8,
        paddingHorizontal: 2
    },
    pill: {
        backgroundColor: '#27272A',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#3F3F46'
    },
    activePill: {
        backgroundColor: '#DB2777',
        borderColor: '#EC4899'
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    activePillText: {
        color: '#FFFFFF'
    },
    domainPill: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        paddingVertical: 5,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    activeDomainPill: {
        backgroundColor: '#2563EB',
        borderColor: '#3B82F6'
    },
    domainPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#71717A'
    },
    activeDomainPillText: {
        color: '#FFFFFF'
    }
});
