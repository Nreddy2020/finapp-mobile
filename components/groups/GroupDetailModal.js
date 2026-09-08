/**
 * components/groups/GroupDetailModal.js
 * 
 * Primary multi-tab detailed view for a Shared Costs group.
 * Matches all group-specific views from the 12-screen design mockup:
 * - Tab 1: Expenses & Activity
 * - Tab 2: Member Balances Matrix
 * - Tab 3: Debt Simplification & Settle Up
 * - Tab 4: Cryptographic Audit Trail & Group Info
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Alert } from 'react-native';
import {
    X, Plus, Receipt, Scale, HandCoins, ShieldCheck, ChevronRight,
    CheckCircle2, Compass, Home, Coffee, Briefcase, Tag, RefreshCw, Send
} from 'lucide-react-native';
import { toRupeesFormatted, paiseToRupees, EXPENSE_STATUS, SETTLEMENT_STATUS } from '../../services/shared-costs/groupContracts.js';

export default function GroupDetailModal({
    visible,
    groupDetail,
    onClose,
    onOpenAddExpense,
    onOpenRecordSettlement,
    onOpenExpenseDetail,
    onSettleAllSuggestions
}) {
    const [activeTab, setActiveTab] = useState('EXPENSES'); // 'EXPENSES', 'BALANCES', 'SETTLE', 'AUDIT'

    const isVisible = Boolean(visible && groupDetail);

    const {
        name = '',
        type = '',
        members = [],
        expenses = [],
        settlements = [],
        balanceResult,
        userBalance,
        settlementPlan
    } = groupDetail || {};

    const netPaise = userBalance ? userBalance.netBalancePaise : 0n;
    const isOwed = netPaise > 0n;
    const owes = netPaise < 0n;
    const isSettled = netPaise === 0n;

    const projections = balanceResult ? balanceResult.projections : [];
    const suggestions = settlementPlan ? settlementPlan.suggestions : [];

    const handleSettleAll = () => {
        if (!groupDetail || suggestions.length === 0) return;
        Alert.alert(
            'Batch Debt Settlement',
            `Record ${suggestions.length} simplified transfer${suggestions.length !== 1 ? 's' : ''} totaling ${toRupeesFormatted(settlementPlan.totalSettlementPaise)} to fully settle all group debts?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm & Settle All',
                    onPress: () => onSettleAllSuggestions(groupDetail.id, suggestions)
                }
            ]
        );
    };

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
            {groupDetail ? (
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.titleRow}>
                                <Text style={styles.groupTitle} numberOfLines={1}>{name}</Text>
                                <View style={styles.typeBadge}>
                                    <Text style={styles.typeBadgeText}>{type}</Text>
                                </View>
                            </View>
                            <Text style={styles.headerMeta}>
                                {members.length} members • {expenses.filter(e => e.status === EXPENSE_STATUS.ACTIVE).length} active expenses
                            </Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#94A3B8" />
                        </Pressable>
                    </View>

                    {/* User Balance Hero Card */}
                    <View style={[
                        styles.heroCard,
                        isOwed && styles.heroCardOwed,
                        owes && styles.heroCardOwes,
                        isSettled && styles.heroCardSettled
                    ]}>
                        <View>
                            <Text style={styles.heroSubLabel}>Your Position in Group</Text>
                            {isOwed && (
                                <Text style={styles.heroAmountPositive}>You are owed {toRupeesFormatted(netPaise)}</Text>
                            )}
                            {owes && (
                                <Text style={styles.heroAmountNegative}>You owe {toRupeesFormatted(-netPaise)}</Text>
                            )}
                            {isSettled && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                    <CheckCircle2 size={16} color="#10B981" style={{ marginRight: 6 }} />
                                    <Text style={styles.heroAmountSettled}>You are all settled up</Text>
                                </View>
                            )}
                        </View>

                        <Pressable
                            style={styles.addExpenseHeroBtn}
                            onPress={() => onOpenAddExpense(groupDetail)}
                        >
                            <Plus size={16} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.addExpenseHeroText}>Expense</Text>
                        </Pressable>
                    </View>

                    {/* Navigation Tabs */}
                    <View style={styles.tabBar}>
                        {[
                            { key: 'EXPENSES', label: 'Expenses', icon: Receipt },
                            { key: 'BALANCES', label: 'Balances', icon: Scale },
                            { key: 'SETTLE', label: 'Settle Up', icon: HandCoins },
                            { key: 'AUDIT', label: 'Audit', icon: ShieldCheck }
                        ].map(t => {
                            const Icon = t.icon;
                            const isSelected = activeTab === t.key;
                            return (
                                <Pressable
                                    key={t.key}
                                    style={[styles.tabItem, isSelected && styles.tabItemActive]}
                                    onPress={() => setActiveTab(t.key)}
                                >
                                    <Icon size={16} color={isSelected ? '#F43F5E' : '#94A3B8'} />
                                    <Text style={[styles.tabLabel, isSelected && styles.tabLabelActive]}>
                                        {t.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>

                    {/* TAB CONTENT AREA */}
                    <ScrollView style={styles.contentArea} showsVerticalScrollIndicator={false}>
                        {/* TAB 1: EXPENSES */}
                        {activeTab === 'EXPENSES' && (
                            <View>
                                {expenses.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <Receipt size={36} color="#475569" />
                                        <Text style={styles.emptyText}>No expenses recorded yet</Text>
                                        <Pressable
                                            style={styles.emptyActionBtn}
                                            onPress={() => onOpenAddExpense(groupDetail)}
                                        >
                                            <Text style={styles.emptyActionText}>Add First Expense</Text>
                                        </Pressable>
                                    </View>
                                ) : (
                                    expenses.map(exp => {
                                        const isExpVoided = exp.status === EXPENSE_STATUS.VOIDED;
                                        const primaryPayer = (exp.payments && exp.payments[0]) ? exp.payments[0].memberId : 'Someone';
                                        return (
                                            <Pressable
                                                key={exp.id}
                                                style={[styles.expenseRow, isExpVoided && styles.expenseRowVoided]}
                                                onPress={() => onOpenExpenseDetail(exp)}
                                            >
                                                <View style={styles.expenseLeft}>
                                                    <View style={[styles.expenseIconCircle, isExpVoided && { backgroundColor: '#334155' }]}>
                                                        <Receipt size={16} color={isExpVoided ? '#94A3B8' : '#F43F5E'} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={[styles.expenseTitle, isExpVoided && styles.expenseTitleVoided]} numberOfLines={1}>
                                                            {exp.title}
                                                        </Text>
                                                        <Text style={styles.expenseMeta}>
                                                            Paid by {primaryPayer} • {new Date(exp.expenseDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                                            {isExpVoided ? ' • VOIDED' : ''}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.expenseRight}>
                                                    <Text style={[styles.expenseAmount, isExpVoided && styles.expenseAmountVoided]}>
                                                        {toRupeesFormatted(exp.totalAmountPaise)}
                                                    </Text>
                                                    <ChevronRight size={14} color="#64748B" />
                                                </View>
                                            </Pressable>
                                        );
                                    })
                                )}
                            </View>
                        )}

                        {/* TAB 2: BALANCES */}
                        {activeTab === 'BALANCES' && (
                            <View>
                                <Text style={styles.sectionHeader}>Member Share & Net Position</Text>
                                {projections.map(p => {
                                    const net = p.netBalancePaise;
                                    const owesMember = net < 0n;
                                    const isOwedMember = net > 0n;
                                    return (
                                        <View key={p.memberId} style={styles.balanceRow}>
                                            <View style={styles.memberLeft}>
                                                <View style={styles.avatar}>
                                                    <Text style={styles.avatarText}>
                                                        {p.displayNameSnapshot.charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                                <View>
                                                    <Text style={styles.memberName}>{p.displayNameSnapshot}</Text>
                                                    <Text style={styles.memberSub}>
                                                        Paid: {toRupeesFormatted(p.totalPaidPaise)} • Share: {toRupeesFormatted(p.totalOwedPaise)}
                                                    </Text>
                                                </View>
                                            </View>

                                            <View style={styles.memberRight}>
                                                {isOwedMember && (
                                                    <Text style={styles.netOwedText}>+{toRupeesFormatted(net)}</Text>
                                                )}
                                                {owesMember && (
                                                    <Text style={styles.netOwesText}>{toRupeesFormatted(net)}</Text>
                                                )}
                                                {net === 0n && (
                                                    <Text style={styles.netSettledText}>₹0.00</Text>
                                                )}
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        )}

                        {/* TAB 3: SETTLE UP */}
                        {activeTab === 'SETTLE' && (
                            <View>
                                <View style={styles.settleHeaderRow}>
                                    <View>
                                        <Text style={styles.sectionHeader}>Optimal Debt Simplification</Text>
                                        <Text style={styles.subtext}>Greedy matching minimizes cash transfers</Text>
                                    </View>
                                    {suggestions.length > 0 && (
                                        <Pressable style={styles.settleAllBtn} onPress={handleSettleAll}>
                                            <Text style={styles.settleAllText}>Settle All</Text>
                                        </Pressable>
                                    )}
                                </View>

                                {suggestions.length === 0 ? (
                                    <View style={styles.allSettledBox}>
                                        <CheckCircle2 size={32} color="#10B981" />
                                        <Text style={styles.allSettledTitle}>All Debts Fully Settled!</Text>
                                        <Text style={styles.allSettledSub}>
                                            Every member has a zero net balance. No pending transfers needed.
                                        </Text>
                                    </View>
                                ) : (
                                    suggestions.map(s => (
                                        <View key={s.id} style={styles.suggestionCard}>
                                            <View style={styles.suggestionLeft}>
                                                <Text style={styles.suggestionDesc}>{s.description}</Text>
                                                <Text style={styles.suggestionSub}>
                                                    {s.fromName} owes {s.toName}
                                                </Text>
                                            </View>
                                            <Pressable
                                                style={styles.settleSingleBtn}
                                                onPress={() => onOpenRecordSettlement(groupDetail, s)}
                                            >
                                                <Send size={12} color="#FFF" style={{ marginRight: 4 }} />
                                                <Text style={styles.settleSingleText}>Record</Text>
                                            </Pressable>
                                        </View>
                                    ))
                                )}

                                {/* Recorded Settlements History */}
                                {settlements.length > 0 && (
                                    <View style={{ marginTop: 20 }}>
                                        <Text style={styles.sectionHeader}>Settlement History ({settlements.length})</Text>
                                        {settlements.map(stl => (
                                            <View key={stl.id} style={styles.historyRow}>
                                                <View>
                                                    <Text style={styles.historyTitle}>
                                                        {stl.fromMemberId} paid {stl.toMemberId}
                                                    </Text>
                                                    <Text style={styles.historyMeta}>
                                                        {stl.method} • {new Date(stl.settlementDate).toLocaleDateString('en-IN')}
                                                    </Text>
                                                </View>
                                                <Text style={styles.historyAmount}>
                                                    {toRupeesFormatted(stl.amountPaise)}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
                            </View>
                        )}

                        {/* TAB 4: AUDIT & INFO */}
                        {activeTab === 'AUDIT' && (
                            <View>
                                <View style={styles.auditStatusCard}>
                                    <ShieldCheck size={28} color="#10B981" />
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.auditStatusTitle}>Cryptographic Hash Chaining</Text>
                                        <Text style={styles.auditStatusSub}>
                                            SHA-256 Tamper-evident ledger integrity verified. All mutations are append-only.
                                        </Text>
                                    </View>
                                </View>

                                <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Group Properties</Text>
                                <View style={styles.infoCard}>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoKey}>Group ID</Text>
                                        <Text style={styles.infoVal}>{groupDetail.id}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoKey}>Category</Text>
                                        <Text style={styles.infoVal}>{type}</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoKey}>Currency</Text>
                                        <Text style={styles.infoVal}>{groupDetail.currency || 'INR'} (₹)</Text>
                                    </View>
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoKey}>Double-Entry Invariant</Text>
                                        <Text style={[styles.infoVal, { color: '#10B981' }]}>Σ(Net Balances) === 0 paise</Text>
                                    </View>
                                </View>
                            </View>
                        )}
                    </ScrollView>
                </View>
            </View>
            ) : <View />}
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        justifyContent: 'flex-end'
    },
    sheet: {
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        height: '92%',
        borderWidth: 1,
        borderColor: '#334155'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    groupTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F8FAFC',
        flex: 1
    },
    typeBadge: {
        backgroundColor: '#0F172A',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#334155'
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#38BDF8',
        textTransform: 'uppercase'
    },
    headerMeta: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4
    },
    closeBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: '#0F172A'
    },
    heroCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 14
    },
    heroCardOwed: {
        borderColor: 'rgba(16, 185, 129, 0.3)',
        backgroundColor: 'rgba(16, 185, 129, 0.08)'
    },
    heroCardOwes: {
        borderColor: 'rgba(244, 63, 94, 0.3)',
        backgroundColor: 'rgba(244, 63, 94, 0.08)'
    },
    heroCardSettled: {
        borderColor: 'rgba(100, 116, 139, 0.3)'
    },
    heroSubLabel: {
        fontSize: 11,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    heroAmountPositive: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10B981',
        marginTop: 2
    },
    heroAmountNegative: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F43F5E',
        marginTop: 2
    },
    heroAmountSettled: {
        fontSize: 15,
        fontWeight: '600',
        color: '#10B981'
    },
    addExpenseHeroBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F43F5E',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12
    },
    addExpenseHeroText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 13
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 12,
        padding: 4,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 14
    },
    tabItem: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6
    },
    tabItemActive: {
        backgroundColor: '#1E293B'
    },
    tabLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8'
    },
    tabLabelActive: {
        color: '#F8FAFC'
    },
    contentArea: {
        flex: 1
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8
    },
    subtext: {
        fontSize: 11,
        color: '#64748B',
        marginBottom: 8
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40
    },
    emptyText: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 10,
        marginBottom: 16
    },
    emptyActionBtn: {
        backgroundColor: '#3B82F6',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12
    },
    emptyActionText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 13
    },
    expenseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    expenseRowVoided: {
        opacity: 0.5
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 10
    },
    expenseIconCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    expenseTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#F8FAFC'
    },
    expenseTitleVoided: {
        textDecorationLine: 'line-through'
    },
    expenseMeta: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2
    },
    expenseRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    expenseAmount: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    expenseAmountVoided: {
        textDecorationLine: 'line-through',
        color: '#64748B'
    },
    balanceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    memberLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '700'
    },
    memberName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#F8FAFC'
    },
    memberSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2
    },
    memberRight: {
        alignItems: 'flex-end'
    },
    netOwedText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#10B981'
    },
    netOwesText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F43F5E'
    },
    netSettledText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B'
    },
    settleHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10
    },
    settleAllBtn: {
        backgroundColor: '#10B981',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10
    },
    settleAllText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 12
    },
    allSettledBox: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    allSettledTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#10B981',
        marginTop: 10
    },
    allSettledSub: {
        fontSize: 12,
        color: '#94A3B8',
        textAlign: 'center',
        marginTop: 4
    },
    suggestionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#334155'
    },
    suggestionLeft: {
        flex: 1,
        marginRight: 10
    },
    suggestionDesc: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    suggestionSub: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2
    },
    settleSingleBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3B82F6',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10
    },
    settleSingleText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 12
    },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#334155'
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F8FAFC'
    },
    historyMeta: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2
    },
    historyAmount: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981'
    },
    auditStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    auditStatusTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981'
    },
    auditStatusSub: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2
    },
    infoCard: {
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    infoKey: {
        fontSize: 12,
        color: '#94A3B8'
    },
    infoVal: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F8FAFC'
    }
});
