import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function ReserveCalculationModal({ visible, onClose, reserveData }) {
    if (!reserveData) return null;

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
                        <Text style={mfStyles.modalTitle}>Emergency Reserve Logic</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Ionicons name="close" size={24} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.summaryBox}>
                            <Text style={styles.summaryLabel}>Current Reserve</Text>
                            <Text style={styles.summaryAmount}>{reserveData.amountFormatted}</Text>
                            <Text style={styles.summaryRunway}>{reserveData.runwayMonthsFormatted} of essential burn</Text>
                        </View>

                        <Text style={styles.sectionHeader}>HOW IT IS CALCULATED</Text>
                        <View style={styles.calcStep}>
                            <Text style={styles.stepTitle}>1. Designated Liquid Accounts</Text>
                            <Text style={styles.stepDesc}>
                                Strictly liquid balances in designated savings accounts are counted toward your safety cushion.
                            </Text>
                        </View>

                        <View style={styles.calcStep}>
                            <Text style={styles.stepTitle}>2. Monthly Essential Burn</Text>
                            <Text style={styles.stepDesc}>
                                Estimated at {reserveData.monthlyBurnFormatted}/month for housing, debt obligations, utilities, and groceries.
                            </Text>
                        </View>

                        <View style={styles.calcStep}>
                            <Text style={styles.stepTitle}>3. Runway Multiplier</Text>
                            <Text style={styles.stepDesc}>
                                Total Reserve ÷ Monthly Essential Burn = {reserveData.runwayMonthsFormatted}
                            </Text>
                        </View>

                        <View style={styles.recommendationBox}>
                            <Ionicons name="bulb-outline" size={20} color={MF_COLORS.warningAmber} />
                            <View style={{ marginLeft: 10, flex: 1 }}>
                                <Text style={styles.recTitle}>CFO Recommendation</Text>
                                <Text style={styles.recDesc}>{reserveData.recommendation || reserveData.recommendedTargetText}</Text>
                            </View>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    summaryBox: {
        backgroundColor: MF_COLORS.cardBgElevated,
        borderRadius: 14,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    summaryLabel: {
        fontSize: 12,
        color: MF_COLORS.textMuted,
        textTransform: 'uppercase',
    },
    summaryAmount: {
        fontSize: 26,
        fontWeight: '800',
        color: MF_COLORS.textPrimary,
        marginVertical: 4,
    },
    summaryRunway: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.purple,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: MF_COLORS.textMuted,
        letterSpacing: 0.8,
        marginBottom: 12,
    },
    calcStep: {
        marginBottom: 14,
        paddingLeft: 4,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: MF_COLORS.textPrimary,
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: 13,
        color: MF_COLORS.textSecondary,
        lineHeight: 18,
    },
    recommendationBox: {
        flexDirection: 'row',
        backgroundColor: MF_COLORS.warningAmberBg,
        borderRadius: 12,
        padding: 14,
        marginTop: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },
    recTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: MF_COLORS.warningAmber,
        marginBottom: 2,
    },
    recDesc: {
        fontSize: 12,
        color: MF_COLORS.textPrimary,
        lineHeight: 16,
    },
});
