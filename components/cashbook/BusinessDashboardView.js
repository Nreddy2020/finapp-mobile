/**
 * components/cashbook/BusinessDashboardView.js
 * 
 * Purpose-Built Dashboard for BUSINESS_OPERATIONS_CASHBOOK.
 * Presents Business Operating Cycle: Available Operating Cash, Customer Receivables,
 * Supplier Payables, Today Sales & Purchases, and Working Capital movements.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Briefcase,
    ArrowDownLeft,
    ArrowUpRight,
    TrendingUp,
    TrendingDown,
    Users,
    Truck,
    ShoppingBag,
    CreditCard,
    DollarSign,
    ChevronRight,
    Clock
} from 'lucide-react-native';

export default function BusinessDashboardView({
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
        availableCashFormatted = '₹0',
        isCashNegative = false,
        customerReceivablesFormatted = '₹0',
        supplierPayablesFormatted = '₹0',
        todaySalesFormatted = '₹0',
        todayPurchasesFormatted = '₹0',
        todayExpensesFormatted = '₹0',
        netOperatingMovementFormatted = '₹0',
        isNetMovementNegative = false
    } = metrics;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* 1. Hero Operating Cash & Working Capital Card */}
            <View style={styles.heroCardContainer}>
                <LinearGradient
                    colors={['#0F172A', '#1E293B', '#0F172A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroCard}
                >
                    <View style={styles.heroHeader}>
                        <View style={styles.badgeWrap}>
                            <Briefcase size={12} color="#38BDF8" />
                            <Text style={styles.badgeText}>BUSINESS OPERATING CYCLE</Text>
                        </View>
                        <Text style={styles.bookNameText}>{activeBook?.name || 'Business Operations'}</Text>
                    </View>

                    <View style={styles.balanceSection}>
                        <Text style={styles.balanceLabel}>AVAILABLE OPERATING CASH</Text>
                        <Text style={[styles.balanceValue, isCashNegative && styles.balanceNegative]}>
                            {availableCashFormatted}
                        </Text>
                        <Text style={styles.balanceHint}>Cash + Bank + Wallets strictly (excludes Customer Receivables & Inventory)</Text>
                    </View>

                    {/* Receivables & Payables Split */}
                    <View style={styles.obligationsRow}>
                        <View style={styles.obligationBox}>
                            <View style={styles.obligationHeader}>
                                <Users size={12} color="#10B981" />
                                <Text style={styles.obligationLabel}>CUSTOMER RECEIVABLES</Text>
                            </View>
                            <Text style={[styles.obligationValue, { color: '#10B981' }]}>
                                {customerReceivablesFormatted}
                            </Text>
                            <Text style={styles.obligationHint}>Money owed by customers</Text>
                        </View>

                        <View style={styles.obligationDivider} />

                        <View style={styles.obligationBox}>
                            <View style={styles.obligationHeader}>
                                <Truck size={12} color="#F43F5E" />
                                <Text style={styles.obligationLabel}>SUPPLIER PAYABLES</Text>
                            </View>
                            <Text style={[styles.obligationValue, { color: '#F43F5E' }]}>
                                {supplierPayablesFormatted}
                            </Text>
                            <Text style={styles.obligationHint}>Money owed to vendors</Text>
                        </View>
                    </View>

                    {/* Today Operations Bar */}
                    <View style={styles.todayOpsRow}>
                        <View style={styles.opsItem}>
                            <Text style={styles.opsLabel}>TODAY SALES</Text>
                            <Text style={[styles.opsValue, { color: '#10B981' }]}>+{todaySalesFormatted}</Text>
                        </View>
                        <View style={styles.opsItem}>
                            <Text style={styles.opsLabel}>TODAY PURCHASES</Text>
                            <Text style={[styles.opsValue, { color: '#F43F5E' }]}>-{todayPurchasesFormatted}</Text>
                        </View>
                        <View style={styles.opsItem}>
                            <Text style={styles.opsLabel}>NET MOVEMENT</Text>
                            <Text style={[styles.opsValue, { color: isNetMovementNegative ? '#F43F5E' : '#38BDF8' }]}>
                                {isNetMovementNegative ? '-' : '+'}{netOperatingMovementFormatted}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </View>

            {/* 2. Quick Actions */}
            <View style={styles.actionsSection}>
                <Text style={styles.sectionTitle}>OPERATIONS WORKFLOWS</Text>
                <View style={styles.actionsGrid}>
                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onQuickAction && onQuickAction('RECORD_SALE')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <ArrowDownLeft size={16} color="#10B981" />
                        </View>
                        <Text style={styles.actionLabel}>Record Sale</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onQuickAction && onQuickAction('RECORD_PURCHASE')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                            <ArrowUpRight size={16} color="#F43F5E" />
                        </View>
                        <Text style={styles.actionLabel}>Record Purchase</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onQuickAction && onQuickAction('RECEIVE_PAYMENT')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                            <Users size={16} color="#38BDF8" />
                        </View>
                        <Text style={styles.actionLabel}>Customer Recv</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onQuickAction && onQuickAction('PAY_SUPPLIER')}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.actionIconWrap, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                            <Truck size={16} color="#F59E0B" />
                        </View>
                        <Text style={styles.actionLabel}>Pay Supplier</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* 3. Operational Cycle Categories */}
            <View style={styles.opsCategoriesSection}>
                <Text style={styles.sectionTitle}>OPERATIONAL ACCOUNTS</Text>
                <View style={styles.opsCatGrid}>
                    <View style={styles.opsCatCard}>
                        <View style={[styles.opsCatIcon, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                            <ShoppingBag size={16} color="#10B981" />
                        </View>
                        <Text style={styles.opsCatName}>Sales & Revenue</Text>
                        <Text style={styles.opsCatDesc}>Cash Sales, Invoices, Advances</Text>
                    </View>

                    <View style={styles.opsCatCard}>
                        <View style={[styles.opsCatIcon, { backgroundColor: 'rgba(244, 63, 94, 0.15)' }]}>
                            <Truck size={16} color="#F43F5E" />
                        </View>
                        <Text style={styles.opsCatName}>Purchases & Stock</Text>
                        <Text style={styles.opsCatDesc}>Raw Materials, Vendor Bills</Text>
                    </View>

                    <View style={styles.opsCatCard}>
                        <View style={[styles.opsCatIcon, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                            <CreditCard size={16} color="#F59E0B" />
                        </View>
                        <Text style={styles.opsCatName}>Operating Costs</Text>
                        <Text style={styles.opsCatDesc}>Staff Salaries, Shop Rent, Power</Text>
                    </View>

                    <View style={styles.opsCatCard}>
                        <View style={[styles.opsCatIcon, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}>
                            <DollarSign size={16} color="#A855F7" />
                        </View>
                        <Text style={styles.opsCatName}>Owner & Capital</Text>
                        <Text style={styles.opsCatDesc}>Capital Introduced, Drawings</Text>
                    </View>
                </View>
            </View>

            {/* 4. Recent Journal Records */}
            <View style={styles.recentSection}>
                <View style={styles.recentHeader}>
                    <Text style={styles.sectionTitle}>RECENT JOURNAL ENTRIES</Text>
                    {onNavigateTab && (
                        <TouchableOpacity onPress={() => onNavigateTab('LEDGER')}>
                            <Text style={styles.seeAllText}>Full Journal</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {recentTransactions.length === 0 ? (
                    <View style={styles.emptyWrap}>
                        <Clock size={28} color="#475569" />
                        <Text style={styles.emptyText}>No business entries recorded yet</Text>
                    </View>
                ) : (
                    recentTransactions.slice(0, 5).map(txn => {
                        const isIncome = txn.transactionType === 'INCOME';
                        const isCredit = Boolean(txn.metadata?.isCredit);
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
                                    <View style={styles.txnTitleRow}>
                                        <Text style={styles.txnDesc} numberOfLines={1}>{txn.description || 'Business Entry'}</Text>
                                        {isCredit && (
                                            <View style={styles.creditBadge}>
                                                <Text style={styles.creditBadgeText}>CREDIT</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.txnCategory}>
                                        {txn.metadata?.counterparty ? `${txn.metadata.counterparty} • ` : ''}{txn.category || 'Business'} • {txn.date}
                                    </Text>
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
        fontWeight: '800'
    },
    balanceNegative: {
        color: '#F43F5E'
    },
    balanceHint: {
        color: '#64748B',
        fontSize: 12,
        marginTop: 4
    },
    obligationsRow: {
        flexDirection: 'row',
        marginTop: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    obligationBox: {
        flex: 1,
        alignItems: 'center'
    },
    obligationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4
    },
    obligationLabel: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    obligationValue: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2
    },
    obligationHint: {
        color: '#64748B',
        fontSize: 10
    },
    obligationDivider: {
        width: 1,
        backgroundColor: '#334155',
        marginVertical: 2
    },
    todayOpsRow: {
        flexDirection: 'row',
        marginTop: 14,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    opsItem: {
        flex: 1,
        alignItems: 'center'
    },
    opsLabel: {
        color: '#94A3B8',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    opsValue: {
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
    opsCategoriesSection: {
        paddingHorizontal: 16,
        marginTop: 20
    },
    opsCatGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10
    },
    opsCatCard: {
        width: '48.5%',
        backgroundColor: '#111827',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    opsCatIcon: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    opsCatName: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2
    },
    opsCatDesc: {
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
    txnTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    txnDesc: {
        color: '#F8FAFC',
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 2
    },
    creditBadge: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderRadius: 4
    },
    creditBadgeText: {
        color: '#F59E0B',
        fontSize: 9,
        fontWeight: '700'
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
