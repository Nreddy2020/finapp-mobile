/**
 * components/cashbook/PersonalDashboardView.js
 * 
 * Purpose-Built Dashboard for PERSONAL_FINANCE_BOOK.
 * Presents household financial diary, liquid savings, today's cash flow,
 * monthly savings movement, quick action pills, and purpose category cards.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Wallet,
    ArrowDownLeft,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
    Home,
    Users,
    Coffee,
    Car,
    CreditCard,
    Plus,
    Calendar,
    Sparkles,
    ChevronRight
} from 'lucide-react-native';

export default function PersonalDashboardView({
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
        availableBalanceFormatted = '₹0',
        isBalanceNegative = false,
        todayReceivedFormatted = '₹0',
        todaySpentFormatted = '₹0',
        monthIncomeFormatted = '₹0',
        monthExpenseFormatted = '₹0',
        monthSavingsMovementFormatted = '₹0',
        isSavingsNegative = false
    } = metrics;

    const quickActions = profile?.quickActions || [];

    const getActionIcon = (actionId) => {
        switch (actionId) {
            case 'ADD_INCOME': return <ArrowDownLeft size={16} color="#10B981" />;
            case 'ADD_EXPENSE': return <ArrowUpRight size={16} color="#F43F5E" />;
            case 'TRANSFER': return <Wallet size={16} color="#38BDF8" />;
            case 'PAY_BILL': return <CreditCard size={16} color="#F59E0B" />;
            default: return <Plus size={16} color="#38BDF8" />;
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* 1. Hero Available Cash & Diary Card */}
            <View style={styles.heroCardContainer}>
                <LinearGradient
                    colors={['#0F172A', '#1E293B', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroHeader}>
                        <View style={styles.badgeWrap}>
                            <Sparkles size={12} color="#38BDF8" />
                            <Text style={styles.badgeText}>HOUSEHOLD FINANCIAL DIARY</Text>
                        </View>
                        <Text style={styles.bookNameText}>{activeBook?.name || 'Personal Savings'}</Text>
                    </View>

                    <View style={styles.balanceSection}>
                        <Text style={styles.balanceLabel}>AVAILABLE LIQUID CASH</Text>
                        <Text style={[styles.balanceValue, isBalanceNegative && styles.balanceNegative]}>
                            {availableBalanceFormatted}
                        </Text>
                        <Text style={styles.balanceHint}>Ready for household spending & bills</Text>
                    </View>

                    {/* Today Flow Row */}
                    <View style={styles.metricsRow}>
                        <View style={styles.metricBox}>
                            <View style={styles.metricLabelRow}>
                                <ArrowDownLeft size={12} color="#10B981" />
                                <Text style={styles.metricLabel}>TODAY IN</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#10B981' }]}>
                                +{todayReceivedFormatted}
                            </Text>
                        </View>

                        <View style={styles.metricDivider} />

                        <View style={styles.metricBox}>
                            <View style={styles.metricLabelRow}>
                                <ArrowUpRight size={12} color="#F43F5E" />
                                <Text style={styles.metricLabel}>TODAY SPENT</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: '#F43F5E' }]}>
                                -{todaySpentFormatted}
                            </Text>
                        </View>

                        <View style={styles.metricDivider} />

                        <View style={styles.metricBox}>
                            <View style={styles.metricLabelRow}>
                                {isSavingsNegative ? (
                                    <TrendingDown size={12} color="#F43F5E" />
                                ) : (
                                    <TrendingUp size={12} color="#38BDF8" />
                                )}
                                <Text style={styles.metricLabel}>MONTH NET</Text>
                            </View>
                            <Text style={[styles.metricValue, { color: isSavingsNegative ? '#F43F5E' : '#38BDF8' }]}>
                                {isSavingsNegative ? '-' : '+'}{monthSavingsMovementFormatted}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* 2. Quick Actions Bar */}
            <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>QUICK ACTIONS</Text>
                <View style={styles.actionsGrid}>
                    {quickActions.map(action => (
                        <TouchableOpacity
                            key={action.actionId}
                            style={styles.actionButton}
                            onPress={() => onQuickAction && onQuickAction(action.actionId)}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.actionIconWrap, { backgroundColor: `${action.color || '#38BDF8'}20` }]}>
                                {getActionIcon(action.actionId)}
                            </View>
                            <Text style={styles.actionLabel}>{action.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 3. Purpose Category Cards */}
            <View style={styles.purposeSection}>
                <View style={styles.purposeHeader}>
                    <Text style={styles.sectionTitle}>HOUSEHOLD PURPOSES</Text>
                    {onNavigateTab && (
                        <TouchableOpacity onPress={() => onNavigateTab('SECTIONS')}>
                            <Text style={styles.seeAllText}>View All</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.purposeGrid}>
                    <View style={styles.purposeCard}>
                        <View style={[styles.purposeIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                            <Home size={16} color="#38BDF8" />
                        </View>
                        <Text style={styles.purposeName}>Home & Utilities</Text>
                        <Text style={styles.purposeDesc}>Rent, Groceries, Electricity, Wifi</Text>
                    </View>

                    <View style={styles.purposeCard}>
                        <View style={[styles.purposeIconWrap, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                            <Users size={16} color="#A855F7" />
                        </View>
                        <Text style={styles.purposeName}>Family & Kids</Text>
                        <Text style={styles.purposeDesc}>School fees, Medical, Activities</Text>
                    </View>

                    <View style={styles.purposeCard}>
                        <View style={[styles.purposeIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                            <Coffee size={16} color="#F59E0B" />
                        </View>
                        <Text style={styles.purposeName}>Lifestyle & Fun</Text>
                        <Text style={styles.purposeDesc}>Dining, OTT, Shopping, Grooming</Text>
                    </View>

                    <View style={styles.purposeCard}>
                        <View style={[styles.purposeIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <CreditCard size={16} color="#10B981" />
                        </View>
                        <Text style={styles.purposeName}>Obligations</Text>
                        <Text style={styles.purposeDesc}>Loan EMIs, CC Bills, Insurance</Text>
                    </View>
                </View>
            </View>

            {/* 4. Recent Diary Entries */}
            <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                    {onNavigateTab && (
                        <TouchableOpacity onPress={() => onNavigateTab('LEDGER')}>
                            <Text style={styles.seeAllText}>Full Passbook</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {recentTransactions.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Calendar size={28} color="#475569" />
                        <Text style={styles.emptyText}>No household transactions recorded yet</Text>
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
                                    <Text style={styles.txnDesc} numberOfLines={1}>{txn.description || 'Transaction'}</Text>
                                    <Text style={styles.txnCategory}>{txn.category || 'General'} • {txn.date}</Text>
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
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
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.25)'
    },
    badgeText: {
        color: '#38BDF8',
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
        color: '#F8FAFC',
        fontSize: 34,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    balanceNegative: {
        color: '#F43F5E'
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
        letterSpacing: 0.5
    },
    metricValue: {
        fontSize: 14,
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
    actionButton: {
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
    purposeSection: {
        paddingHorizontal: 16,
        marginTop: 20
    },
    purposeHeader: {
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
    purposeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    purposeCard: {
        width: '48.5%',
        backgroundColor: '#111827',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    purposeIconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    purposeName: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2
    },
    purposeDesc: {
        color: '#64748B',
        fontSize: 11,
        lineHeight: 15
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
