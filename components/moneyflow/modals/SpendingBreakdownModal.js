import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function SpendingBreakdownModal({ visible, onClose, data }) {
    if (!data || !data.categories) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={mfStyles.modalOverlay}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
                <View style={mfStyles.modalContent}>
                    <View style={mfStyles.modalHeader}>
                        <Text style={mfStyles.modalTitle}>All Spending Categories</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Ionicons name="close" size={24} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        {data.categories.map((cat, idx) => (
                            <View key={idx} style={styles.catRow}>
                                <View style={styles.catHeader}>
                                    <Text style={styles.catName}>{cat.name}</Text>
                                    <Text style={styles.catAmount}>{cat.amountFormatted} ({cat.percentage}%)</Text>
                                </View>
                                <View style={mfStyles.spendingBarTrack}>
                                    <View
                                        style={[
                                            mfStyles.spendingBarFill,
                                            {
                                                width: `${Math.min(100, Math.max(4, cat.percentage))}%`,
                                                backgroundColor: cat.color || MF_COLORS.primaryBlue
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    catRow: {
        marginBottom: 16,
    },
    catHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    catName: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.textPrimary,
    },
    catAmount: {
        fontSize: 13,
        fontWeight: '600',
        color: MF_COLORS.textSecondary,
    },
});
