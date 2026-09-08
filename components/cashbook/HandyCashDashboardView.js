/**
 * components/cashbook/HandyCashDashboardView.js
 * 
 * Purpose-Built Dashboard for HANDY_CASH_REGISTER.
 * Focuses on Physical Cash Till, Cash In/Out, Drawer Denomination Count,
 * Shortage/Excess tracking, and Daily Handover.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Store,
    ArrowDownLeft,
    ArrowUpRight,
    Calculator,
    CheckCircle2,
    AlertTriangle,
    Clock,
    Plus,
    ChevronRight,
    Lock
} from 'lucide-react-native';

export default function HandyCashDashboardView({
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
        openingCashFormatted = '₹0',
        cashReceivedTodayFormatted = '₹0',
        cashPaidTodayFormatted = '₹0',
        expectedClosingFormatted = '₹0',
        countedCashFormatted = '₹0',
        differenceFormatted = '₹0',
        differenceStatus = 'BALANCED',
        isLocked = false
    } = metrics;

    const hasCounted = countedCashFormatted !== '₹0' || differenceStatus !== 'BALANCED';

    const getDiffColor = () => {
        if (differenceStatus === 'EXCESS') return '#38BDF8';
        if (differenceStatus === 'SHORTAGE') return '#F43F5E';
        return '#10B981';
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* 1. Hero Till Status Card */}
            <View style={styles.heroCardContainer}>
                <LinearGradient
                    colors={['#0F172A', '#1E293B', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroHeader}>
                        <View style={styles.badgeWrap}>
                            <Store size={12} color="#F59E0B" />
                            <Text style={styles.badgeText}>PHYSICAL CASH DRAWER</Text>
                        </View>
                        {isLocked ? (
                            <View style={styles.lockedBadge}>
                                <Lock size={10} color="#94A3B8" />
                                <Text style={styles.lockedText}>LOCKED</Text>
                            </View>
                        ) : (
                            <View style={styles.openBadge}>
                                <Text style={styles.openText}>TILL ACTIVE</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.balanceSection}>
                        <Text style={styles.balanceLabel}>EXPECTED CASH IN DRAWER</Text>
                        <Text style={styles.balanceValue}>{expectedClosingFormatted}</Text>
                        <Text style={styles.balanceHint}>Based on recorded receipts & payouts</Text>
                    </View>

                    {/* Today In / Out Metrics */}
                    <View style={styles.metricsRow}>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>OPENING CASH</Text>
                            <Text style={[styles.metricValue, { color: '#94A3B8' }]}>
                                {openingCashFormatted}
                            </Text>
                        </View>

                        <View style={styles.metricDivider} />

                        <View style={styles.metricBox}>
                            <View style={styles.metricLabelRow}>
                                <ArrowDownLeft size={11} color="#10B981" />
                                <Text style={styles.metricLabel}>RECEIVED</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#10B981' }]}>
                                +{cashReceivedTodayFormatted}
                            </Text>
                        </View>

                        <View style={styles.metricDivider} />

                        <View style={styles.metricBox}>
                            <View style={styles.metricLabelRow}>
                                <ArrowUpRight size={11} color="#F43F5E" />
                                <Text style={styles.metricLabel}>PAID OUT</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#F43F5E' }]}>
                                -{cashPaidTodayFormatted}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* 2. Till Count & Discrepancy Status Card */}
            <View style={styles.countSection}>
                <View style={styles.countCard}>
                    <View style={styles.countHeader}>
                        <View style={styles.countTitleRow}>
                            <Calculator size={16} color="#38BDF8" />
                            <Text style={styles.countTitle}>PHYSICAL TILL VERIFICATION</Text>
                        </View>
                        {hasCounted && (
                            <View style={[styles.diffBadge, { backgroundColor: `${getDiffColor()}20`, borderColor: `${getDiffColor()}50` }]}>
                                <Text style={[styles.diffBadgeText, { color: getDiffColor() }]}>
                                    {differenceStatus === 'BALANCED' ? 'BALANCED' : `${differenceStatus}: ${differenceFormatted}`}
                                </Text>
                            </View>
                        )}
                    </View>

                    {hasCounted ? (
                        <View style={styles.countBody}>
                            <View style={styles.countRow}>
                                <Text style={styles.countLabel}>Physical Counted Total:</Text>
                                <Text style={styles.countValue}>{countedCashFormatted}</Text>
                            </View>
                            <View style={styles.countRow}>
                                <Text style={styles.countLabel}>System Expected Total:</Text>
                                <Text style={styles.countValue}>{expectedClosingFormatted}</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.recountBtn}
                                onPress={() => onNavigateTab && onNavigateTab('CLOSING')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.recountBtnText}>Update Denomination Count</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.uncountedBody}>
                            <AlertTriangle size={20} color="#F59E0B" />
                            <View style={styles.uncountedTextWrap}>
                                <Text style={styles.uncountedTitle}>Drawer Not Counted Today</Text>
                                <Text style={styles.uncountedDesc}>Count ₹500, ₹200, ₹100 notes to verify against register.</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.startCountBtn}
                                onPress={() => onNavigateTab && onNavigateTab('CLOSING')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.startCountText}>Count Now</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>

            {/* 3. Quick Actions */}
            <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>TILL ACTIONS</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onQuickAction && onQuickAction('RECEIVE_CASH')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <ArrowDownLeft size={16} color="#10B981" />
                        </View>
                        <Text style={styles.actionLabel}>Receive Cash</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onQuickAction && onQuickAction('PAY_CASH')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                            <ArrowUpRight size={16} color="#F43F5E" />
                        </View>
                        <Text style={styles.actionLabel}>Pay Cash</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onNavigateTab && onNavigateTab('CLOSING')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                            <Calculator size={16} color="#38BDF8" />
                        </View>
                        <Text style={styles.actionLabel}>Denom Count</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onNavigateTab && onNavigateTab('CLOSING')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                            <Lock size={16} color="#A855F7" />
                        </View>
                        <Text style={styles.actionLabel}>Close Register</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 4. Recent Cash Movements */}
            <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>RECENT CASH MOVEMENTS</Text>
                    {onNavigateTab && (
                        <TouchableOpacity onPress={() => onNavigateTab('LEDGER')}>
                            <Text style={styles.seeAllText}>Full Cash Log</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {recentTransactions.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Clock size={28} color="#475569" />
                        <Text style={styles.emptyText}>No cash transactions recorded today</Text>
                    </View>
                ) : (
                    recentTransactions.slice(0, 5).map(txn => {
                        const isIncome = txn.transactionType === 'INCOME';
                        return (
                            <TouchableOpacity
                                key={txn.id}
                                style={styles.txnRow}
                                onPress={() => onSelectTransaction && onSelectTransaction(txn)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.txnIconWrap, { backgroundColor: isIncome ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)' }]}>
                                    {isIncome ? <ArrowDownLeft size={16} color="#10B981" /> : <ArrowUpRight size={16} color="#F43F5E" />}
                                </View>
                                <View style={styles.txnDetails}>
                                    <Text style={styles.txnDesc} numberOfLines={1}>{txn.description || 'Cash Movement'}</Text>
                                    <Text style={styles.txnCategory}>{txn.category || 'Handy Cash'} • {txn.date}</Text>
                                </View>
                                <View style={styles.txnAmountWrap}>
                                    <Text style={[styles.txnAmount, { color: isIncome ? '#10B981' : '#F43F5E' }]}>
                                        {isIncome ? '+' : '-'}{txn.amountFormatted || `₹${Number(txn.amount?.paise || 0) / 100}`}
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
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.25)'
    },
    badgeText: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6
    },
    openBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8
    },
    openText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: '700'
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
        fontSize: 10,
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
    balanceHint: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 4
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
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 4
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
    countSection: {
        paddingHorizontal: 16,
        marginTop: 12
    },
    countCard: {
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    countHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    countTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    countTitle: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.6
    },
    diffBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1
    },
    diffBadgeText: {
        fontSize: 10,
        fontWeight: '700'
    },
    countBody: {
        gap: 8
    },
    countRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    countLabel: {
        color: '#94A3B8',
        fontSize: 12
    },
    countValue: {
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    },
    recountBtn: {
        marginTop: 8,
        backgroundColor: '#1E293B',
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center'
    },
    recountBtnText: {
        color: '#38BDF8',
        fontSize: 12,
        fontWeight: '600'
    },
    uncountedBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    uncountedTextWrap: {
        flex: 1
    },
    uncountedTitle: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '700'
    },
    uncountedDesc: {
        color: '#64748B',
        fontSize: 11,
        marginTop: 2
    },
    startCountBtn: {
        backgroundColor: '#F59E0B',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8
    },
    startCountText: {
        color: '#090D16',
        fontSize: 12,
        fontWeight: '700'
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
        fontSize: 14,
        fontWeight: '700'
    }
});
