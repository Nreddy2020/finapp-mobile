/**
 * components/cashbook/BalanceSummaryCard.js
 * 
 * Luxury financial summary hero card for FinLife Cashbook.
 * Displays Opening Balance, Income (+), Expense (-), Transfers (neutral), Net Cash Flow, and Closing Balance.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BookOpen, ArrowDownLeft, ArrowUpRight, ArrowLeftRight, Wallet, Sparkles } from 'lucide-react-native';

export default function BalanceSummaryCard({
    summary,
    appMode = 'DEMO',
    onToggleMode,
    onManageAccounts
}) {
    if (!summary) return null;

    const {
        openingBalanceFormatted = '₹0',
        totalIncomeFormatted = '₹0',
        totalExpenseFormatted = '₹0',
        netCashFlowFormatted = '₹0',
        isNetPositive = true,
        transferVolumeFormatted = '₹0',
        transferCount = 0,
        closingBalanceFormatted = '₹0'
    } = summary;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#0F172A', '#1E293B', '#0F172A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                {/* Header Row: Title & Mode Switcher */}
                <View style={styles.headerRow}>
                    <View style={styles.titleWrap}>
                        <BookOpen size={16} color="#38BDF8" />
                        <Text style={styles.cardSubtitle}>CASHBOOK LEDGER</Text>
                    </View>

                    <View style={styles.headerActions}>
                        {onManageAccounts && (
                            <TouchableOpacity
                                onPress={onManageAccounts}
                                style={styles.accountsButton}
                                activeOpacity={0.8}
                            >
                                <Wallet size={12} color="#94A3B8" />
                                <Text style={styles.accountsButtonText}>Accounts</Text>
                            </TouchableOpacity>
                        )}

                        {onToggleMode && (
                            <TouchableOpacity
                                onPress={onToggleMode}
                                style={[
                                    styles.modeBadge,
                                    appMode === 'DEMO' ? styles.modeBadgeDemo : styles.modeBadgeProd
                                ]}
                                activeOpacity={0.8}
                            >
                                <Sparkles size={11} color={appMode === 'DEMO' ? '#38BDF8' : '#34D399'} />
                                <Text style={[
                                    styles.modeText,
                                    appMode === 'DEMO' ? styles.modeTextDemo : styles.modeTextProd
                                ]}>
                                    {appMode === 'DEMO' ? 'DEMO' : 'PROD'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Primary Closing Balance Display */}
                <View style={styles.primaryBalanceWrap}>
                    <Text style={styles.balanceLabel}>CLOSING NET POSITION</Text>
                    <Text style={styles.balanceAmount}>{closingBalanceFormatted}</Text>
                    <View style={styles.openingWrap}>
                        <Text style={styles.openingLabel}>Opening Balance: </Text>
                        <Text style={styles.openingValue}>{openingBalanceFormatted}</Text>
                    </View>
                </View>

                {/* Metrics Grid: Income, Expense, Net Flow, Transfers */}
                <View style={styles.metricsGrid}>
                    {/* Income */}
                    <View style={styles.metricBox}>
                        <View style={styles.metricHeader}>
                            <ArrowDownLeft size={13} color="#10B981" />
                            <Text style={styles.metricLabel}>INCOME</Text>
                        </View>
                        <Text style={[styles.metricValue, { color: '#10B981' }]}>
                            +{totalIncomeFormatted}
                        </Text>
                    </View>

                    {/* Expense */}
                    <View style={styles.metricBox}>
                        <View style={styles.metricHeader}>
                            <ArrowUpRight size={13} color="#EF4444" />
                            <Text style={styles.metricLabel}>EXPENSE</Text>
                        </View>
                        <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                            -{totalExpenseFormatted}
                        </Text>
                    </View>

                    {/* Net Cash Flow */}
                    <View style={styles.metricBox}>
                        <View style={styles.metricHeader}>
                            <Text style={styles.metricLabel}>NET FLOW</Text>
                        </View>
                        <Text style={[
                            styles.metricValue,
                            { color: isNetPositive ? '#38BDF8' : '#F59E0B' }
                        ]}>
                            {netCashFlowFormatted}
                        </Text>
                    </View>

                    {/* Transfers (Net Zero Invariant) */}
                    <View style={styles.metricBox}>
                        <View style={styles.metricHeader}>
                            <ArrowLeftRight size={13} color="#60A5FA" />
                            <Text style={styles.metricLabel}>TRANSFERS</Text>
                        </View>
                        <Text style={[styles.metricValue, { color: '#94A3B8' }]}>
                            {transferVolumeFormatted}
                        </Text>
                        <Text style={styles.metricSubtext}>Net-zero movement</Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(56, 189, 248, 0.2)',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10
    },
    cardGradient: {
        padding: 20
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    titleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    cardSubtitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: '#94A3B8'
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    accountsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(30, 41, 59, 0.8)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.2)'
    },
    accountsButtonText: {
        fontSize: 11,
        color: '#E2E8F0',
        fontWeight: '600'
    },
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        borderWidth: 1
    },
    modeBadgeDemo: {
        backgroundColor: 'rgba(56, 189, 248, 0.15)',
        borderColor: 'rgba(56, 189, 248, 0.35)'
    },
    modeBadgeProd: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.35)'
    },
    modeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8
    },
    modeTextDemo: {
        color: '#38BDF8'
    },
    modeTextProd: {
        color: '#34D399'
    },
    primaryBalanceWrap: {
        marginBottom: 18
    },
    balanceLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#64748B',
        letterSpacing: 1.2,
        marginBottom: 4
    },
    balanceAmount: {
        fontSize: 34,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    openingWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4
    },
    openingLabel: {
        fontSize: 12,
        color: '#64748B'
    },
    openingValue: {
        fontSize: 12,
        color: '#CBD5E1',
        fontWeight: '600'
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(148, 163, 184, 0.15)'
    },
    metricBox: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)'
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginBottom: 4
    },
    metricLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        color: '#64748B'
    },
    metricValue: {
        fontSize: 15,
        fontWeight: '700'
    },
    metricSubtext: {
        fontSize: 9,
        color: '#475569',
        marginTop: 2
    }
});
