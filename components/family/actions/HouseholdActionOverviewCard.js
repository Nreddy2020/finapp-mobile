import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, Zap, Calendar, Eye, DollarSign, FileText, CheckSquare, Shield } from 'lucide-react-native';

/**
 * HouseholdActionOverviewCard
 * 
 * Executive summary card for Phase 7 Action & Renewal Horizon.
 * Displays filter-dependent counts across all 4 urgency tiers and 4 domains.
 */
export default function HouseholdActionOverviewCard({ summary }) {
    if (!summary) return null;

    const {
        totalActionCount = 0,
        overdueCount = 0,
        immediateCount = 0,
        upcomingCount = 0,
        lookingAheadCount = 0,
        domainBreakdown = { financial: 0, document: 0, operation: 0, protection: 0 },
        totalMonetaryAmount = null,
        monetaryCurrency = null
    } = summary;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={{flex: 1, minWidth: 0}}>
                    <Text style={styles.badgeText}>60-SECOND COORDINATION</Text>
                    <Text style={styles.title}>Action & Renewal Horizon</Text>
                </View>
                <View style={styles.totalBadge}>
                    <Text style={styles.totalCount}>{totalActionCount}</Text>
                    <Text style={styles.totalLabel}>TOTAL</Text>
                </View>
            </View>

            {/* Urgency Tiers Grid */}
            <View style={styles.grid}>
                {/* Overdue */}
                <View style={[styles.tierBox, styles.tierOverdue]}>
                    <View style={styles.tierHeader}>
                        <AlertCircle size={14} color="#EF4444" />
                        <Text style={[styles.tierLabel, { color: '#EF4444' }]}>Overdue</Text>
                    </View>
                    <Text style={[styles.tierValue, { color: '#EF4444' }]}>{overdueCount}</Text>
                    <Text style={styles.tierSub}>Past due</Text>
                </View>

                {/* Immediate */}
                <View style={[styles.tierBox, styles.tierImmediate]}>
                    <View style={styles.tierHeader}>
                        <Zap size={14} color="#F59E0B" />
                        <Text style={[styles.tierLabel, { color: '#F59E0B' }]}>Immediate</Text>
                    </View>
                    <Text style={[styles.tierValue, { color: '#F59E0B' }]}>{immediateCount}</Text>
                    <Text style={styles.tierSub}>Next 7 days</Text>
                </View>

                {/* Upcoming */}
                <View style={[styles.tierBox, styles.tierUpcoming]}>
                    <View style={styles.tierHeader}>
                        <Calendar size={14} color="#3B82F6" />
                        <Text style={[styles.tierLabel, { color: '#3B82F6' }]}>Upcoming</Text>
                    </View>
                    <Text style={[styles.tierValue, { color: '#3B82F6' }]}>{upcomingCount}</Text>
                    <Text style={styles.tierSub}>8 to 30 days</Text>
                </View>

                {/* Looking Ahead */}
                <View style={[styles.tierBox, styles.tierLookingAhead]}>
                    <View style={styles.tierHeader}>
                        <Eye size={14} color="#8B5CF6" />
                        <Text style={[styles.tierLabel, { color: '#8B5CF6' }]}>Ahead</Text>
                    </View>
                    <Text style={[styles.tierValue, { color: '#8B5CF6' }]}>{lookingAheadCount}</Text>
                    <Text style={styles.tierSub}>31 to 90 days</Text>
                </View>
            </View>

            {/* Optional Unambiguous Monetary Total */}
            {totalMonetaryAmount !== null && (
                <View style={styles.monetaryBanner}>
                    <DollarSign size={16} color="#10B981" />
                    <Text style={styles.monetaryText}>
                        Total Active Commitments: <Text style={styles.monetaryAmount}>{monetaryCurrency} {totalMonetaryAmount.toLocaleString()}</Text>
                    </Text>
                </View>
            )}

            {/* Domain Breakdown Pills */}
            <View style={styles.domainRow}>
                <View style={styles.domainPill}>
                    <DollarSign size={12} color="#10B981" />
                    <Text style={styles.domainText}>Finance: {domainBreakdown.financial || 0}</Text>
                </View>
                <View style={styles.domainPill}>
                    <FileText size={12} color="#38BDF8" />
                    <Text style={styles.domainText}>Vault: {domainBreakdown.document || 0}</Text>
                </View>
                <View style={styles.domainPill}>
                    <CheckSquare size={12} color="#F59E0B" />
                    <Text style={styles.domainText}>Ops: {domainBreakdown.operation || 0}</Text>
                </View>
                <View style={styles.domainPill}>
                    <Shield size={12} color="#A855F7" />
                    <Text style={styles.domainText}>Protection: {domainBreakdown.protection || 0}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#27272A',
        marginBottom: 16
    },
    headerRow: {
        gap: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#EC4899',
        letterSpacing: 0.8,
        marginBottom: 2
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    totalBadge: {
        backgroundColor: '#27272A',
        borderRadius: 12,
        paddingVertical: 6,
        paddingHorizontal: 12,
        alignItems: 'center'
    },
    totalCount: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    totalLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    grid: {
        flexWrap: 'wrap',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 14,
        gap: 8
    },
    tierBox: {
        flexGrow: 1,
        flexBasis: '46%',
        borderRadius: 12,
        padding: 10,
        borderWidth: 1
    },
    tierOverdue: {
        backgroundColor: 'rgba(239, 68, 68, 0.08)',
        borderColor: 'rgba(239, 68, 68, 0.25)'
    },
    tierImmediate: {
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderColor: 'rgba(245, 158, 11, 0.25)'
    },
    tierUpcoming: {
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        borderColor: 'rgba(59, 130, 246, 0.25)'
    },
    tierLookingAhead: {
        backgroundColor: 'rgba(139, 92, 246, 0.08)',
        borderColor: 'rgba(139, 92, 246, 0.25)'
    },
    tierHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
    },
    tierLabel: {
        fontSize: 11,
        fontWeight: '700'
    },
    tierValue: {
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 2
    },
    tierSub: {
        fontSize: 9,
        color: '#71717A'
    },
    monetaryBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 1,
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        gap: 8,
        marginBottom: 12
    },
    monetaryText: {
        fontSize: 12,
        color: '#D1D5DB'
    },
    monetaryAmount: {
        fontWeight: '700',
        color: '#10B981'
    },
    domainRow: {
        flexWrap: 'wrap',
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#27272A',
        paddingTop: 10,
        gap: 6
    },
    domainPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27272A',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        gap: 4
    },
    domainText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#D4D4D8'
    }
});
