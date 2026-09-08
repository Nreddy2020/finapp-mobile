/**
 * components/cashbook/LoansDashboardView.js
 * 
 * Purpose-Built Dashboard for LOANS_TAKEN_REGISTER and LOANS_GIVEN_REGISTER.
 * Displays Outstanding Principal, Upcoming EMI, Amortization breakdown (Principal vs Interest),
 * Due dates, and Prepayment actions.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    ArrowDownRight,
    ArrowUpRight,
    ArrowDownLeft,
    Calendar,
    Clock,
    Percent,
    ShieldAlert,
    CreditCard,
    ChevronRight,
    FileText
} from 'lucide-react-native';

export default function LoansDashboardView({
    metrics,
    profile,
    onQuickAction,
    onNavigateTab,
    activeBook,
    recentTransactions = [],
    onSelectTransaction
}) {
    if (!metrics) return null;

    const isLiability = profile?.bookType === 'LOANS_TAKEN';

    // Metrics for Loans Taken
    const {
        outstandingPrincipalFormatted = '₹0',
        upcomingEMIFormatted = '₹0',
        principalPaidMonthFormatted = '₹0',
        interestPaidMonthFormatted = '₹0',
        nextDueDate = '10th'
    } = isLiability ? metrics : {};

    // Metrics for Loans Given
    const {
        totalPrincipalOutstandingFormatted = '₹0',
        receivedThisMonthFormatted = '₹0',
        expectedThisMonthFormatted = '₹0'
    } = !isLiability ? metrics : {};

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* 1. Hero Loan Position Card */}
            <View style={styles.heroCardContainer}>
                <LinearGradient
                    colors={['#0F172A', '#1E293B', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroHeader}>
                        <View style={[styles.badgeWrap, isLiability ? styles.badgeLiability : styles.badgeReceivable]}>
                            {isLiability ? (
                                <ArrowDownRight size={12} color="#F43F5E" />
                            ) : (
                                <ArrowUpRight size={12} color="#10B981" />
                            )}
                            <Text style={[styles.badgeText, { color: isLiability ? '#F43F5E' : '#10B981' }]}>
                                {isLiability ? 'DEBT & EMI OBLIGATIONS' : 'LENDING & RECEIVABLES'}
                            </Text>
                        </View>
                        <Text style={styles.bookNameText}>{activeBook?.name || (isLiability ? 'Home Loan' : 'Lending')}</Text>
                    </View>

                    <View style={styles.balanceSection}>
                        <Text style={styles.balanceLabel}>
                            {isLiability ? 'OUTSTANDING PRINCIPAL DEBT' : 'OUTSTANDING RECEIVABLE OWED'}
                        </Text>
                        <Text style={[styles.balanceValue, { color: isLiability ? '#F43F5E' : '#10B981' }]}>
                            {isLiability ? outstandingPrincipalFormatted : totalPrincipalOutstandingFormatted}
                        </Text>
                        <Text style={styles.balanceHint}>
                            {isLiability ? 'Principal balance owed to lender' : 'Principal balance owed by borrowers'}
                        </Text>
                    </View>

                    {/* Breakdown / EMI Row */}
                    {isLiability ? (
                        <View style={styles.metricsRow}>
                            <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>UPCOMING EMI</Text>
                                <Text style={[styles.metricValue, { color: '#F8FAFC' }]}>
                                    {upcomingEMIFormatted}
                                </Text>
                                <Text style={styles.metricSub}>{nextDueDate}</Text>
                            </View>

                            <View style={styles.metricDivider} />

                            <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>PRINCIPAL REPAID</Text>
                                <Text style={[styles.metricValue, { color: '#10B981' }]}>
                                    {principalPaidMonthFormatted}
                                </Text>
                                <Text style={styles.metricSub}>This month</Text>
                            </View>

                            <View style={styles.metricDivider} />

                            <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>INTEREST PAID</Text>
                                <Text style={[styles.metricValue, { color: '#F59E0B' }]}>
                                    {interestPaidMonthFormatted}
                                </Text>
                                <Text style={styles.metricSub}>Finance charge</Text>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.metricsRow}>
                            <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>EXPECTED THIS MONTH</Text>
                                <Text style={[styles.metricValue, { color: '#38BDF8' }]}>
                                    {expectedThisMonthFormatted}
                                </Text>
                            </View>

                            <View style={styles.metricDivider} />

                            <View style={styles.metricBox}>
                                <Text style={styles.metricLabel}>RECEIVED THIS MONTH</Text>
                                <Text style={[styles.metricValue, { color: '#10B981' }]}>
                                    +{receivedThisMonthFormatted}
                                </Text>
                            </View>
                        </View>
                    )}
                </LinearGradient>
            </View>

            {/* 2. Quick Actions */}
            <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>LOAN ACTIONS</Text>
                <View style={styles.actionsGrid}>
                    {isLiability ? (
                        <>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onQuickAction && onQuickAction('RECORD_EMI')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                                    <CreditCard size={16} color="#F43F5E" />
                                </View>
                                <Text style={styles.actionLabel}>Pay EMI</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onQuickAction && onQuickAction('PREPAY_LOAN')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                                    <ArrowDownRight size={16} color="#38BDF8" />
                                </View>
                                <Text style={styles.actionLabel}>Prepayment</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onQuickAction && onQuickAction('GIVE_LOAN')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                                    <ArrowUpRight size={16} color="#F43F5E" />
                                </View>
                                <Text style={styles.actionLabel}>Disburse Loan</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.actionBtn}
                                onPress={() => onQuickAction && onQuickAction('RECORD_REPAYMENT')}
                                activeOpacity={0.8}
                            >
                                <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                    <ArrowDownLeft size={16} color="#10B981" />
                                </View>
                                <Text style={styles.actionLabel}>Collect Payment</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* 3. Amortization Policy Card */}
            <View style={styles.policySection}>
                <View style={styles.policyCard}>
                    <View style={styles.policyHeader}>
                        <FileText size={16} color="#38BDF8" />
                        <Text style={styles.policyTitle}>ACCOUNTING POLICY: PRINCIPAL VS INTEREST</Text>
                    </View>
                    <Text style={styles.policyText}>
                        {isLiability
                            ? 'Every EMI payment strictly amortizes: the Principal portion directly reduces your outstanding loan liability, while Interest is recognized separately as finance expense (not operating expense).'
                            : 'Every repayment collected strictly settles borrower receivables: principal directly reduces the outstanding receivable asset, while interest received is recognized separately as finance income.'}
                    </Text>
                </View>
            </View>

            {/* 4. Recent Repayments / Disbursals */}
            <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>RECENT LOAN OPERATIONS</Text>
                    {onNavigateTab && (
                        <TouchableOpacity onPress={() => onNavigateTab('LEDGER')}>
                            <Text style={styles.seeAllText}>Amortization Log</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {recentTransactions.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Clock size={28} color="#475569" />
                        <Text style={styles.emptyText}>No loan entries recorded yet</Text>
                    </View>
                ) : (
                    recentTransactions.slice(0, 5).map(txn => {
                        const hasSplit = Boolean(txn.loanSplit);
                        return (
                            <TouchableOpacity
                                key={txn.id}
                                style={styles.txnRow}
                                onPress={() => onSelectTransaction && onSelectTransaction(txn)}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.txnIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                                    <CreditCard size={16} color="#38BDF8" />
                                </View>
                                <View style={styles.txnDetails}>
                                    <Text style={styles.txnDesc} numberOfLines={1}>{txn.description || 'Loan Transaction'}</Text>
                                    <Text style={styles.txnCategory}>
                                        {hasSplit ? `P: ₹${Number(txn.loanSplit.principal?.paise || 0) / 100} • I: ₹${Number(txn.loanSplit.interest?.paise || 0) / 100}` : (txn.category || 'Loan')} • {txn.date}
                                    </Text>
                                </View>
                                <View style={styles.txnAmountWrap}>
                                    <Text style={styles.txnAmount}>
                                        {txn.amountFormatted || `₹${Number(txn.amount?.paise || 0) / 100}`}
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
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1
    },
    badgeLiability: {
        backgroundColor: 'rgba(244, 63, 94, 0.12)',
        borderColor: 'rgba(244, 63, 94, 0.25)'
    },
    badgeReceivable: {
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderColor: 'rgba(16, 185, 129, 0.25)'
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.6
    },
    bookNameText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600'
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
    metricLabel: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    metricValue: {
        fontSize: 13,
        fontWeight: '700'
    },
    metricSub: {
        color: '#64748B',
        fontSize: 10,
        marginTop: 2
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
        color: '#38BDF8',
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
        color: '#F8FAFC',
        fontSize: 14,
        fontWeight: '700'
    }
});
