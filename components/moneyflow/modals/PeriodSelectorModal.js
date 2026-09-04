import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

const PERIOD_OPTIONS = [
    { key: 'today', label: 'Today', desc: 'Cash movement for today' },
    { key: 'week', label: 'This Week', desc: 'Monday to Sunday' },
    { key: 'month', label: 'This Month', desc: 'Current calendar month' },
    { key: 'quarter', label: 'This Quarter', desc: 'Current 3-month cycle' },
    { key: 'year', label: 'This Year', desc: 'Current calendar year' }
];

export function PeriodSelectorModal({ visible, onClose, selectedPeriod, onSelectPeriod }) {
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
                        <Text style={mfStyles.modalTitle}>Select Time Period</Text>
                        <TouchableOpacity onPress={onClose} style={mfStyles.modalCloseBtn} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Ionicons name="close" size={24} color={MF_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {PERIOD_OPTIONS.map((item) => {
                        const isSelected = selectedPeriod === item.key;
                        return (
                            <TouchableOpacity
                                key={item.key}
                                style={[
                                    styles.periodItem,
                                    isSelected && styles.periodItemActive
                                ]}
                                onPress={() => {
                                    onSelectPeriod(item.key);
                                    onClose();
                                }}
                            >
                                <View>
                                    <Text style={[styles.periodLabel, isSelected && styles.periodLabelActive]}>
                                        {item.label}
                                    </Text>
                                    <Text style={styles.periodDesc}>{item.desc}</Text>
                                </View>
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={20} color={MF_COLORS.primaryBlueLight} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    periodItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 8,
        backgroundColor: MF_COLORS.cardBgElevated,
        borderWidth: 1,
        borderColor: MF_COLORS.borderSubtle,
    },
    periodItemActive: {
        borderColor: MF_COLORS.primaryBlue,
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
    },
    periodLabel: {
        fontSize: 15,
        fontWeight: '600',
        color: MF_COLORS.textPrimary,
    },
    periodLabelActive: {
        color: MF_COLORS.primaryBlueLight,
    },
    periodDesc: {
        fontSize: 12,
        color: MF_COLORS.textMuted,
        marginTop: 2,
    },
});
