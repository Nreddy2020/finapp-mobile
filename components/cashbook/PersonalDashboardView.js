/**
 * components/cashbook/PersonalDashboardView.js
 * 
 * FinLife Universal Cashbook — Purpose-Built Personal Dashboard (Screen 2).
 * 
 * Visual Hierarchy:
 * - Date Range Chip (e.g. "Jan 1, 2025 – Jan 31, 2025 ∨")
 * - Closing Balance Hero Card with +8.4% trend badge and green wallet graphic
 * - 2x2 Metric Grid:
 *   [ Income: ₹ 80,000      | Expense: ₹ 27,700       ]
 *   [ Transfers: ₹ 10,000   | Net Cash Flow: ₹ 52,300 ]
 * - Account Balances with "View All >"
 *   (Bank - HDFC, Cash Handy, UPI)
 * - Floating Purple Pill Button: "+ Add Transaction"
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView
} from 'react-native';
import {
    Wallet,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    Layers,
    Landmark,
    Phone,
    CreditCard,
    Plus,
    Calendar,
    ChevronDown,
    ChevronRight,
    CheckCircle2
} from 'lucide-react-native';

export default function PersonalDashboardView({
    metrics = {},
    summary = {},
    activeBook,
    accounts = [],
    recentTransactions = [],
    onQuickAction,
    onNavigateTab,
    onAddTransaction,
    onSelectTransaction
}) {
    // Derived ledger metrics from authoritative engine
    const closingBalance = summary?.closingBalanceFormatted || metrics?.availableBalanceFormatted || '₹ 0';
    const isNegative = metrics?.isBalanceNegative || false;

    const incomeFormatted = summary?.totalIncomeFormatted || metrics?.monthIncomeFormatted || '₹ 0';
    const expenseFormatted = summary?.totalExpenseFormatted || metrics?.monthExpenseFormatted || '₹ 0';
    const transferVolumeFormatted = summary?.transferVolumeFormatted || '₹ 0';
    const netCashFlowFormatted = summary?.netCashFlowFormatted || metrics?.monthSavingsMovementFormatted || '₹ 0';

    // Filter accounts associated with active book (or show first 3 liquid accounts)
    const bookAccounts = accounts.filter(a => !a.bookId || a.bookId === activeBook?.id).slice(0, 4);

    const getAccountIcon = (acc) => {
        const type = (acc.type || '').toUpperCase();
        const name = (acc.name || '').toLowerCase();

        if (type === 'BANK' || name.includes('bank') || name.includes('hdfc') || name.includes('sbi')) {
            return { comp: Landmark, color: '#3B82F6', bg: '#EFF6FF' };
        }
        if (type === 'CASH' || name.includes('cash') || name.includes('handy')) {
            return { comp: Wallet, color: '#10B981', bg: '#ECFDF5' };
        }
        if (type === 'CREDIT_CARD' || name.includes('card')) {
            return { comp: CreditCard, color: '#F59E0B', bg: '#FEF3C7' };
        }
        return { comp: Phone, color: '#6366F1', bg: '#EEF2FF' };
    };

    return (
        <View style={styles.outerContainer}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Date Range Filter Chip */}
                <View style={styles.dateChipWrap}>
                    <TouchableOpacity style={styles.dateChip} activeOpacity={0.7}>
                        <Text style={styles.dateChipText}>Jan 1, 2025 – Jan 31, 2025</Text>
                        <ChevronDown size={14} color="#64748B" />
                    </TouchableOpacity>
                </View>

                {/* 2. Closing Balance Hero Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroLeft}>
                        <Text style={styles.heroLabel}>Closing Balance</Text>
                        <Text style={[styles.heroAmount, isNegative && styles.heroAmountNegative]}>
                            {closingBalance}
                        </Text>
                        <View style={styles.trendBadge}>
                            <ArrowUpRight size={13} color="#059669" />
                            <Text style={styles.trendBadgeText}>+8.4%</Text>
                            <Text style={styles.trendBadgeSub}>vs last month</Text>
                        </View>
                    </View>

                    {/* Right 3D-Styled Wallet Graphic */}
                    <View style={styles.walletGraphicWrap}>
                        <View style={styles.walletOuterCircle}>
                            <View style={styles.walletInnerCircle}>
                                <Wallet size={28} color="#10B981" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* 3. 2x2 Metric Grid */}
                <View style={styles.metricGrid}>
                    {/* Income */}
                    <View style={styles.metricCard}>
                        <View style={styles.metricCardHeader}>
                            <View style={[styles.metricIconWrap, { backgroundColor: '#ECFDF5' }]}>
                                <ArrowUpRight size={16} color="#10B981" />
                            </View>
                            <Text style={styles.metricCardLabel}>Income</Text>
                        </View>
                        <Text style={styles.metricCardValue}>{incomeFormatted}</Text>
                    </View>

                    {/* Expense */}
                    <View style={styles.metricCard}>
                        <View style={styles.metricCardHeader}>
                            <View style={[styles.metricIconWrap, { backgroundColor: '#FEF2F2' }]}>
                                <ArrowDownLeft size={16} color="#EF4444" />
                            </View>
                            <Text style={styles.metricCardLabel}>Expense</Text>
                        </View>
                        <Text style={styles.metricCardValue}>{expenseFormatted}</Text>
                    </View>

                    {/* Transfers */}
                    <View style={styles.metricCard}>
                        <View style={styles.metricCardHeader}>
                            <View style={[styles.metricIconWrap, { backgroundColor: '#EFF6FF' }]}>
                                <Layers size={16} color="#3B82F6" />
                            </View>
                            <Text style={styles.metricCardLabel}>Transfers</Text>
                        </View>
                        <Text style={styles.metricCardValue}>{transferVolumeFormatted}</Text>
                        <Text style={styles.metricCardSub}>Net-zero movement</Text>
                    </View>

                    {/* Net Cash Flow */}
                    <View style={styles.metricCard}>
                        <View style={styles.metricCardHeader}>
                            <View style={[styles.metricIconWrap, { backgroundColor: '#EFF6FF' }]}>
                                <TrendingUp size={16} color="#3B82F6" />
                            </View>
                            <Text style={styles.metricCardLabel}>Net Cash Flow</Text>
                        </View>
                        <Text style={styles.metricCardValue}>{netCashFlowFormatted}</Text>
                    </View>
                </View>

                {/* 4. Section: Account Balances */}
                <View style={styles.accountsSection}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Account Balances</Text>
                        <TouchableOpacity
                            onPress={() => onNavigateTab && onNavigateTab('ACCOUNTS')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.viewAllLink}>View All &gt;</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.accountList}>
                        {bookAccounts.length === 0 ? (
                            <View style={styles.emptyAccountsCard}>
                                <Text style={styles.emptyAccountsText}>No active accounts registered for this book</Text>
                            </View>
                        ) : (
                            bookAccounts.map((acc) => {
                                const meta = getAccountIcon(acc);
                                const IconComp = meta.comp;
                                return (
                                    <View key={acc.id} style={styles.accountRow}>
                                        <View style={styles.accountLeft}>
                                            <View style={[styles.accountIconWrap, { backgroundColor: meta.bg }]}>
                                                <IconComp size={18} color={meta.color} />
                                            </View>
                                            <Text style={styles.accountName}>{acc.name}</Text>
                                        </View>
                                        <Text style={styles.accountBalance}>
                                            {acc.formattedBalance || '₹ 0'}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>
            </ScrollView>

            {/* 5. Floating Purple Action Pill Button */}
            <View style={styles.fabContainer}>
                <TouchableOpacity
                    style={styles.fabButton}
                    onPress={onAddTransaction}
                    activeOpacity={0.85}
                >
                    <Plus size={18} color="#FFFFFF" />
                    <Text style={styles.fabText}>Add Transaction</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    scrollView: {
        flex: 1
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 90
    },
    dateChipWrap: {
        alignItems: 'center',
        marginBottom: 12
    },
    dateChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    dateChipText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600'
    },
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    heroLeft: {
        flex: 1
    },
    heroLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 4
    },
    heroAmount: {
        fontSize: 28,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.6
    },
    heroAmountNegative: {
        color: '#EF4444'
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ECFDF5',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#A7F3D0',
        marginTop: 8
    },
    trendBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669'
    },
    trendBadgeSub: {
        fontSize: 10,
        color: '#059669',
        fontWeight: '500'
    },
    walletGraphicWrap: {
        marginLeft: 12
    },
    walletOuterCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F0FDF4',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#DCFCE7'
    },
    walletInnerCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#DCFCE7',
        alignItems: 'center',
        justifyContent: 'center'
    },
    metricGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 20
    },
    metricCard: {
        width: '48%',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
        elevation: 1
    },
    metricCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8
    },
    metricIconWrap: {
        width: 26,
        height: 26,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center'
    },
    metricCardLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B'
    },
    metricCardValue: {
        fontSize: 17,
        fontWeight: '800',
        color: '#0F172A',
        letterSpacing: -0.3
    },
    metricCardSub: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 2
    },
    accountsSection: {
        marginBottom: 16
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    viewAllLink: {
        fontSize: 13,
        fontWeight: '700',
        color: '#6366F1'
    },
    accountList: {
        gap: 8
    },
    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    accountLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    accountIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center'
    },
    accountName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0F172A'
    },
    accountBalance: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981'
    },
    emptyAccountsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    emptyAccountsText: {
        fontSize: 12,
        color: '#94A3B8'
    },
    fabContainer: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center'
    },
    fabButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#6366F1',
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 24,
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 5
    },
    fabText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    }
});
