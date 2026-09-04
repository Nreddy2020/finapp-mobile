/**
 * ReviewTransactionModal.js
 * 
 * RAPID TRANSACTION RESOLUTION MODAL
 * 
 * Invariants:
 * - SMS-03 / SMS-04: Confirms uncertain SMS transactions into the canonical ledger.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

const QUICK_CATEGORIES = [
    { label: 'Salary / Income', emoji: '💰', type: 'INCOME' },
    { label: 'Internal Transfer', emoji: '🔄', type: 'TRANSFER' },
    { label: 'Refund / Reversal', emoji: '↩️', type: 'INCOME' },
    { label: 'Investment Return', emoji: '📈', type: 'INCOME' },
    { label: 'Groceries & Food', emoji: '🍔', type: 'EXPENSE' },
    { label: 'Rent & Housing', emoji: '🏠', type: 'EXPENSE' },
    { label: 'Utilities & Bills', emoji: '⚡', type: 'EXPENSE' },
    { label: 'Shopping', emoji: '🛍️', type: 'EXPENSE' },
    { label: 'Travel & Fuel', emoji: '🚗', type: 'EXPENSE' },
    { label: 'General Cash Outflow', emoji: '📋', type: 'EXPENSE' }
];

export function ReviewTransactionModal({
    visible,
    onClose,
    transaction,
    onConfirmReview
}) {
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [selectedType, setSelectedType] = useState(null);

    useEffect(() => {
        if (transaction) {
            setSelectedCategory(transaction.category || 'Salary / Income');
            setSelectedType(transaction.type || 'INCOME');
        }
    }, [transaction]);

    if (!transaction) return null;

    const rawSnippet = transaction.rawSource?.rawBody || transaction.rawDescription || null;

    const handleConfirm = () => {
        if (onConfirmReview) {
            onConfirmReview(transaction.id, selectedCategory, selectedType);
        }
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={mfStyles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={mfStyles.modalContent}>
                    {/* Header */}
                    <View style={mfStyles.modalHeader}>
                        <View>
                            <Text style={mfStyles.modalTitle}>Review Transaction</Text>
                            <Text style={{ fontSize: 12, color: MF_COLORS.textMuted, marginTop: 2 }}>
                                Help FinLife accurately classify this cash movement
                            </Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn}>
                            <Ionicons name="close" size={22} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {/* Transaction Card */}
                        <View style={{
                            backgroundColor: MF_COLORS.cardBgElevated,
                            borderRadius: 14,
                            padding: 14,
                            marginBottom: 16,
                            borderWidth: 1,
                            borderColor: 'rgba(245, 158, 11, 0.3)'
                        }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                                <Text style={{ fontSize: 15, fontWeight: '700', color: MF_COLORS.textPrimary }}>
                                    {transaction.merchant || 'Bank Transaction'}
                                </Text>
                                <Text style={{ fontSize: 16, fontWeight: '800', color: transaction.type === 'INCOME' ? MF_COLORS.successGreenLight : MF_COLORS.textPrimary }}>
                                    {transaction.amountFormatted || `₹${transaction.amount}`}
                                </Text>
                            </View>

                            <Text style={{ fontSize: 12, color: MF_COLORS.textMuted }}>
                                {transaction.accountName || transaction.account} · {transaction.dateFormatted || transaction.date}
                            </Text>

                            {rawSnippet && (
                                <View style={{
                                    marginTop: 10,
                                    padding: 8,
                                    backgroundColor: '#0E1522',
                                    borderRadius: 8,
                                    borderWidth: 1,
                                    borderColor: MF_COLORS.borderSubtle
                                }}>
                                    <Text style={{ fontSize: 11, color: MF_COLORS.textSecondary, fontFamily: 'monospace' }}>
                                        💬 "{rawSnippet}"
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Category Selector */}
                        <Text style={{ fontSize: 13, fontWeight: '700', color: MF_COLORS.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                            What was this transaction?
                        </Text>

                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                            {QUICK_CATEGORIES.map((cat) => {
                                const isSelected = selectedCategory === cat.label;
                                return (
                                    <TouchableOpacity
                                        key={cat.label}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingHorizontal: 12,
                                            paddingVertical: 8,
                                            borderRadius: 10,
                                            backgroundColor: isSelected ? MF_COLORS.primaryBlue : MF_COLORS.cardBgElevated,
                                            borderWidth: 1,
                                            borderColor: isSelected ? MF_COLORS.primaryBlueLight : MF_COLORS.borderSubtle
                                        }}
                                        onPress={() => {
                                            setSelectedCategory(cat.label);
                                            setSelectedType(cat.type);
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={{ fontSize: 14, marginRight: 6 }}>{cat.emoji}</Text>
                                        <Text style={{
                                            fontSize: 13,
                                            fontWeight: isSelected ? '700' : '500',
                                            color: isSelected ? '#FFFFFF' : MF_COLORS.textPrimary
                                        }}>
                                            {cat.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            style={mfStyles.primaryActionBtn}
                            onPress={handleConfirm}
                            activeOpacity={0.8}
                        >
                            <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                            <Text style={mfStyles.primaryActionBtnText}>Confirm & Sort Cash Flow</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}
