/**
 * components/groups/ExpenseDetailModal.js
 * 
 * Detailed breakdown modal for a specific group expense.
 * Shows payers, share obligations, revision status, and non-destructive voiding action.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { X, Calendar, User, Tag, Trash2, RotateCcw, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import { toRupeesFormatted, EXPENSE_STATUS } from '../../services/shared-costs/groupContracts.js';

export default function ExpenseDetailModal({
    visible,
    expense,
    onClose,
    onVoidExpense
}) {
    const isVisible = Boolean(visible && expense);
    const isVoided = expense?.status === EXPENSE_STATUS.VOIDED;
    const payments = Array.isArray(expense?.payments) ? expense.payments : [];
    const shares = Array.isArray(expense?.shares) ? expense.shares : [];

    const handleConfirmVoid = () => {
        if (!expense) return;
        Alert.alert(
            'Void Expense',
            'Are you sure you want to void this expense? This action is recorded non-destructively in the audit trail.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Void Expense',
                    style: 'destructive',
                    onPress: () => {
                        onVoidExpense(expense.id, 'User voided via details view');
                        onClose();
                    }
                }
            ]
        );
    };

    const formattedDate = expense ? new Date(expense.expenseDate || expense.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    }) : '';

    return (
        <Modal visible={isVisible} animationType="slide" transparent onRequestClose={onClose}>
            {expense ? (
            <View style={styles.backdrop}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <View style={styles.titleRow}>
                                <Text style={[styles.title, isVoided && styles.titleVoided]} numberOfLines={1}>
                                    {expense.title}
                                </Text>
                                {isVoided && (
                                    <View style={styles.voidBadge}>
                                        <Text style={styles.voidBadgeText}>VOIDED</Text>
                                    </View>
                                )}
                            </View>
                            <Text style={styles.metaText}>{formattedDate} • {expense.category || 'General'}</Text>
                        </View>
                        <Pressable onPress={onClose} style={styles.closeBtn}>
                            <X size={20} color="#94A3B8" />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                        {/* Total Amount Hero */}
                        <View style={[styles.amountHero, isVoided && styles.amountHeroVoided]}>
                            <Text style={styles.amountLabel}>Total Expense</Text>
                            <Text style={[styles.amountText, isVoided && styles.amountTextVoided]}>
                                {toRupeesFormatted(expense.totalAmountPaise)}
                            </Text>
                            <Text style={styles.splitMethodText}>
                                Split: {expense.splitMethod || 'EQUAL'}
                                {expense.revision > 1 ? ` • Rev ${expense.revision}` : ''}
                            </Text>
                        </View>

                        {/* Paid By Breakdown */}
                        <Text style={styles.sectionLabel}>Paid By ({payments.length})</Text>
                        <View style={styles.cardBox}>
                            {payments.map((p, idx) => (
                                <View key={p.id || idx} style={styles.rowItem}>
                                    <View style={styles.rowLeft}>
                                        <View style={styles.avatarMini}>
                                            <Text style={styles.avatarMiniText}>
                                                {(p.displayNameSnapshot || p.memberId || 'P').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.personName}>{p.displayNameSnapshot || p.memberId}</Text>
                                    </View>
                                    <Text style={styles.paidAmountText}>
                                        {toRupeesFormatted(p.amountPaise)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Split Shares Breakdown */}
                        <Text style={styles.sectionLabel}>Shared By ({shares.length})</Text>
                        <View style={styles.cardBox}>
                            {shares.map((s, idx) => (
                                <View key={s.id || idx} style={styles.rowItem}>
                                    <View style={styles.rowLeft}>
                                        <View style={[styles.avatarMini, { backgroundColor: '#334155' }]}>
                                            <Text style={styles.avatarMiniText}>
                                                {(s.displayNameSnapshot || s.memberId || 'M').charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                        <Text style={styles.personName}>{s.displayNameSnapshot || s.memberId}</Text>
                                    </View>
                                    <Text style={styles.shareAmountText}>
                                        {toRupeesFormatted(s.amountPaise)}
                                    </Text>
                                </View>
                            ))}
                        </View>

                        {/* Audit Stamp */}
                        <View style={styles.auditBox}>
                            <ShieldCheck size={16} color="#10B981" />
                            <Text style={styles.auditText}>
                                Immutable ledger record • ID: {expense.id.substring(0, 14)}...
                            </Text>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    <View style={styles.footer}>
                        {!isVoided ? (
                            <Pressable style={styles.voidBtn} onPress={handleConfirmVoid}>
                                <Trash2 size={16} color="#F43F5E" style={{ marginRight: 6 }} />
                                <Text style={styles.voidBtnText}>Void Expense</Text>
                            </Pressable>
                        ) : (
                            <View style={styles.voidedNotice}>
                                <Text style={styles.voidedNoticeText}>
                                    Voided: {expense.voidReason || 'Reversed by user'}
                                </Text>
                            </View>
                        )}
                        <Pressable style={styles.closeActionBtn} onPress={onClose}>
                            <Text style={styles.closeActionText}>Close</Text>
                        </Pressable>
                    </View>
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
        maxHeight: '88%',
        borderWidth: 1,
        borderColor: '#334155'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F8FAFC',
        flex: 1
    },
    titleVoided: {
        textDecorationLine: 'line-through',
        color: '#94A3B8'
    },
    voidBadge: {
        backgroundColor: 'rgba(244, 63, 94, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(244, 63, 94, 0.4)'
    },
    voidBadgeText: {
        color: '#F43F5E',
        fontSize: 10,
        fontWeight: '700'
    },
    metaText: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 4
    },
    closeBtn: {
        padding: 6,
        borderRadius: 20,
        backgroundColor: '#0F172A'
    },
    scrollArea: {
        maxHeight: 460
    },
    amountHero: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 16
    },
    amountHeroVoided: {
        opacity: 0.6
    },
    amountLabel: {
        fontSize: 11,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4
    },
    amountText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#F43F5E'
    },
    amountTextVoided: {
        textDecorationLine: 'line-through',
        color: '#64748B'
    },
    splitMethodText: {
        fontSize: 12,
        color: '#CBD5E1',
        marginTop: 4
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#CBD5E1',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8,
        marginTop: 6
    },
    cardBox: {
        backgroundColor: '#0F172A',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 14
    },
    rowItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B'
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    avatarMini: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#3B82F6',
        alignItems: 'center',
        justifyContent: 'center'
    },
    avatarMiniText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: '700'
    },
    personName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#F8FAFC'
    },
    paidAmountText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#10B981'
    },
    shareAmountText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#E2E8F0'
    },
    auditBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        marginTop: 4
    },
    auditText: {
        fontSize: 11,
        color: '#10B981',
        flex: 1
    },
    footer: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#334155'
    },
    voidBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F43F5E',
        backgroundColor: 'rgba(244, 63, 94, 0.1)'
    },
    voidBtnText: {
        color: '#F43F5E',
        fontWeight: '600',
        fontSize: 14
    },
    voidedNotice: {
        flex: 1,
        justifyContent: 'center'
    },
    voidedNoticeText: {
        color: '#94A3B8',
        fontSize: 12,
        fontStyle: 'italic'
    },
    closeActionBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#334155',
        alignItems: 'center',
        justifyContent: 'center'
    },
    closeActionText: {
        color: '#FFFFFF',
        fontWeight: '600',
        fontSize: 14
    }
});
