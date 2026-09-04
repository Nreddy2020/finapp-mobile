import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';
import { formatCurrencyINR } from '../moneyFlowPresentationAdapter.js';

export function TransactionDetailModal({ visible, onClose, transaction, onDelete }) {
    if (!transaction) return null;

    const isIncome = transaction.type === 'INCOME';
    const amountColor = isIncome ? MF_COLORS.successGreenLight : MF_COLORS.textPrimary;

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent
            onRequestClose={onClose}
        >
            <View style={mfStyles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={mfStyles.modalContent}>
                    <View style={mfStyles.modalHeader}>
                        <Text style={mfStyles.modalTitle}>Transaction Details</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Ionicons name="close" size={24} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.detailCard}>
                        <Text style={styles.detailMerchant}>{transaction.merchant || transaction.description}</Text>
                        <Text style={[styles.detailAmount, { color: amountColor }]}>
                            {transaction.amountFormatted || `${isIncome ? '+' : '-'}${formatCurrencyINR(transaction.amount, false)}`}
                        </Text>
                    </View>

                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Category</Text>
                        <Text style={styles.infoValue}>{transaction.category || 'Uncategorized'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Type</Text>
                        <Text style={styles.infoValue}>{transaction.type}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Account</Text>
                        <Text style={styles.infoValue}>{transaction.accountName || 'Primary Account'}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Date</Text>
                        <Text style={styles.infoValue}>{new Date(transaction.date).toLocaleString('en-IN')}</Text>
                    </View>

                    {onDelete && (
                        <TouchableOpacity
                            style={styles.deleteBtn}
                            onPress={() => {
                                onDelete(transaction.id);
                                onClose();
                            }}
                        >
                            <Ionicons name="trash-outline" size={18} color={MF_COLORS.dangerRedLight} />
                            <Text style={styles.deleteBtnText}>Delete Transaction</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    detailCard: {
        alignItems: 'center',
        paddingVertical: 16,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: MF_COLORS.borderSubtle,
    },
    detailMerchant: {
        fontSize: 18,
        fontWeight: '700',
        color: MF_COLORS.textPrimary,
        marginBottom: 8,
    },
    detailAmount: {
        fontSize: 26,
        fontWeight: '800',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: MF_COLORS.borderSubtle,
    },
    infoLabel: {
        fontSize: 13,
        color: MF_COLORS.textMuted,
    },
    infoValue: {
        fontSize: 13,
        fontWeight: '600',
        color: MF_COLORS.textPrimary,
    },
    deleteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: MF_COLORS.dangerRedBg,
        borderRadius: 12,
        paddingVertical: 14,
        marginTop: 24,
        marginBottom: 10,
    },
    deleteBtnText: {
        color: MF_COLORS.dangerRedLight,
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
});
