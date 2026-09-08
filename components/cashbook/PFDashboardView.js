/**
 * components/cashbook/PFDashboardView.js
 * 
 * Purpose-Built Dashboard for PROVIDENT_FUND_REGISTER.
 * Displays Total Restricted Retirement Wealth, Employee Share vs Employer Share,
 * Accumulated Compound Interest, and Provenance Contributions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Shield,
    Lock,
    TrendingUp,
    User,
    Building2,
    Percent,
    Plus,
    Clock,
    ChevronRight,
    Award
} from 'lucide-react-native';

export default function PFDashboardView({
    metrics,
    profile,
    onQuickAction,
    onNavigateTab,
    activeBook,
    recentTransactions = [],
    onSelectTransaction
}) {
    if (!metrics) return null;

    const {
        totalPFValueFormatted = '₹0',
        restrictedBalanceFormatted = '₹0',
        availableBalanceFormatted = '₹0',
        employeeShareFormatted = '₹0',
        employerShareFormatted = '₹0',
        accumulatedInterestFormatted = '₹0',
        currentYearContributionFormatted = '₹0'
    } = metrics;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* 1. Hero PF Retirement Portfolio Card */}
            <View style={styles.heroCardContainer}>
                <LinearGradient
                    colors={['#0F172A', '#1E293B', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroHeader}>
                        <View style={styles.badgeWrap}>
                            <Shield size={12} color="#10B981" />
                            <Text style={styles.badgeText}>EPFO RETIREMENT WEALTH</Text>
                        </View>
                        <View style={styles.lockedBadge}>
                            <Lock size={10} color="#94A3B8" />
                            <Text style={styles.lockedText}>RESTRICTED ASSET</Text>
                        </View>
                    </View>

                    <View style={styles.balanceSection}>
                        <Text style={styles.balanceLabel}>TOTAL PF VALUE (RESTRICTED WEALTH)</Text>
                        <Text style={styles.balanceValue}>{totalPFValueFormatted}</Text>
                        <View style={styles.availabilityPill}>
                            <Text style={styles.availabilityPillText}>Available Personal Cash: ₹0</Text>
                        </View>
                        <Text style={styles.balanceHint}>
                            Available for ordinary daily spending: ₹0 by default. PF value is classified as restricted retirement wealth and is not included in personal available cash.
                        </Text>
                    </View>

                    {/* Provenance Row */}
                    <View style={styles.metricsRow}>
                        <View style={styles.metricBox}>
                            <View style={styles.metricLabelRow}>
                                <User size={10} color="#38BDF8" />
                                <Text style={styles.metricLabel}>EMPLOYEE</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
                                {employeeShareFormatted}
                            </Text>
                        </View>

                        <View style={styles.metricDivider} />

                        <View style={styles.metricBox}>
                            <View style={styles.metricLabelRow}>
                                <Building2 size={10} color="#A855F7" />
                                <Text style={styles.metricLabel}>EMPLOYER</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#A855F7' }]}>
                                {employerShareFormatted}
                            </Text>
                        </View>

                        <View style={styles.metricDivider} />

                        <View style={styles.metricBox}>
                            <View style={styles.metricLabelRow}>
                                <Percent size={10} color="#10B981" />
                                <Text style={styles.metricLabel}>INTEREST</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#10B981' }]}>
                                {accumulatedInterestFormatted}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* 2. Quick Actions */}
            <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>PF WORKFLOWS</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onQuickAction && onQuickAction('ADD_CONTRIBUTION')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <Plus size={16} color="#10B981" />
                        </View>
                        <Text style={styles.actionLabel}>Add Contribution</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onQuickAction && onQuickAction('ADD_INTEREST')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                            <TrendingUp size={16} color="#38BDF8" />
                        </View>
                        <Text style={styles.actionLabel}>Credit Interest</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 3. Provenance & Compliance Card */}
            <View style={styles.policySection}>
                <View style={styles.policyCard}>
                    <View style={styles.policyHeader}>
                        <Award size={16} color="#F59E0B" />
                        <Text style={styles.policyTitle}>EPFO STATUTORY PROVENANCE</Text>
                    </View>
                    <Text style={styles.policyText}>
                        Tax-relevant employee and employer contribution provenance is preserved to support reporting and statutory review. Available for ordinary daily spending: ₹0 by default. PF value is classified as restricted retirement wealth and is not included in personal available cash.
                    </Text>
                </View>
            </View>

            {/* 4. Recent Contributions */}
            <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>RECENT CONTRIBUTIONS & CREDITS</Text>
                    {onNavigateTab && (
                        <TouchableOpacity onPress={() => onNavigateTab('LEDGER')}>
                            <Text style={styles.seeAllText}>Full History</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {recentTransactions.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Clock size={28} color="#475569" />
                        <Text style={styles.emptyText}>No PF contributions recorded yet</Text>
                    </View>
                ) : (
                    recentTransactions.slice(0, 5).map(txn => {
                        const hasProv = Boolean(txn.provenance);
                        return (
                            <TouchableOpacity
                                key={txn.id}
                                style={styles.txnRow}
                                onPress={() => onSelectTransaction && onSelectTransaction(txn)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.txnIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                    <Shield size={16} color="#10B981" />
                                </View>
                                <View style={styles.txnDetails}>
                                    <Text style={styles.txnDesc} numberOfLines={1}>{txn.description || 'PF Credit'}</Text>
                                    <Text style={styles.txnCategory}>
                                        {hasProv ? `EE: ₹${Number(txn.provenance.employee?.paise || 0) / 100} • ER: ₹${Number(txn.provenance.employer?.paise || 0) / 100}` : (txn.category || 'EPF')} • {txn.date}
                                    </Text>
                                </View>
                                <View style={styles.txnAmountWrap}>
                                    <Text style={styles.txnAmount}>
                                        +{txn.amountFormatted || `₹${Number(txn.amount?.paise || 0) / 100}`}
                                    </Text>
                                    <ChevronRight size={14} color="#64748B" />
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#090D16'
    },
    heroCardContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8
    },
    heroCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#1E293B',
        elevation: 6
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    badgeWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.25)'
    },
    badgeText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#334155',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8
    },
    lockedText: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700'
    },
    balanceSection: {
        alignItems: 'center',
        marginVertical: 8
    },
    balanceLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 4
    },
    balanceValue: {
        color: '#F8FAFC',
        fontSize: 34,
        fontWeight: '800'
    },
    availabilityPill: {
        marginTop: 6,
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    availabilityPillText: {
        color: '#F87171',
        fontSize: 11,
        fontWeight: '700'
    },
    balanceHint: {
        color: '#94A3B8',
        fontSize: 11,
        marginTop: 6,
        textAlign: 'center',
        paddingHorizontal: 12
    },
    metricsRow: {
        flexDirection: 'row',
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    metricBox: {
        flex: 1,
        alignItems: 'center'
    },
    metricLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
    },
    metricLabel: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    metricValue: {
        fontSize: 13,
        fontWeight: '700'
    },
    metricDivider: {
        width: 1,
        backgroundColor: '#334155',
        marginVertical: 4
    },
    actionsSection: {
        paddingHorizontal: 16,
        marginTop: 16
    },
    sectionTitle: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 10
    },
    actionsGrid: {
        flexDirection: 'row',
        gap: 10
    },
    actionBtn: {
        flex: 1,
        backgroundColor: '#131D31',
        borderRadius: 14,
        paddingVertical: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    actionIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6
    },
    actionLabel: {
        color: '#E2E8F0',
        fontSize: 11,
        fontWeight: '600'
    },
    policySection: {
        paddingHorizontal: 16,
        marginTop: 20
    },
    policyCard: {
        backgroundColor: '#111827',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    policyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8
    },
    policyTitle: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    policyText: {
        color: '#94A3B8',
        fontSize: 11,
        lineHeight: 16
    },
    recentSection: {
        paddingHorizontal: 16,
        marginTop: 20,
        marginBottom: 40
    },
    recentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    seeAllText: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '600'
    },
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: 32,
        backgroundColor: '#111827',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1E293B',
        gap: 8
    },
    emptyText: {
        color: '#64748B',
        fontSize: 13
    },
    txnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        padding: 12,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    txnIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    txnDetails: {
        flex: 1
    },
    txnDesc: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2
    },
    txnCategory: {
        color: '#64748B',
        fontSize: 11
    },
    txnAmountWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    txnAmount: {
        color: '#10B981',
        fontSize: 14,
        fontWeight: '700'
    }
});
