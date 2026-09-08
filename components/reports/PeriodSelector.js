/**
 * components/reports/PeriodSelector.js
 * 
 * Interactive Period Selector Dropdown for FinLife Reports.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable } from 'react-native';
import { Calendar, ChevronDown, Check } from 'lucide-react-native';

const AVAILABLE_PERIODS = [
    { key: '2026-09', label: 'September 2026' },
    { key: '2026-08', label: 'August 2026' },
    { key: '2026-07', label: 'July 2026' }
];

export default function PeriodSelector({ currentPeriodKey = '2026-09', onSelectPeriod }) {
    const [modalVisible, setModalVisible] = useState(false);
    const activePeriod = AVAILABLE_PERIODS.find(p => p.key === currentPeriodKey) || AVAILABLE_PERIODS[0];

    const handleSelect = (key) => {
        onSelectPeriod(key);
        setModalVisible(false);
    };

    return (
        <View>
            <TouchableOpacity
                style={styles.pillButton}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Selected period: ${activePeriod.label}`}
            >
                <Calendar size={14} color="#A1A1AA" />
                <Text style={styles.pillText}>{activePeriod.label}</Text>
                <ChevronDown size={14} color="#A1A1AA" />
            </TouchableOpacity>

            <Modal visible={modalVisible} transparent animationType="fade">
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Reporting Period</Text>
                        <Text style={styles.modalSubtitle}>All charts and reconciliations align to half-open intervals</Text>

                        <View style={styles.optionsList}>
                            {AVAILABLE_PERIODS.map(period => {
                                const isSelected = period.key === currentPeriodKey;
                                return (
                                    <TouchableOpacity
                                        key={period.key}
                                        style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                        onPress={() => handleSelect(period.key)}
                                    >
                                        <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                            {period.label}
                                        </Text>
                                        {isSelected && <Check size={18} color="#10B981" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    pillButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#18181B',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    pillText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '600'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4
    },
    modalSubtitle: {
        fontSize: 12,
        color: '#71717A',
        marginBottom: 16
    },
    optionsList: {
        gap: 8
    },
    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 14,
        backgroundColor: '#27272A50',
        borderWidth: 1,
        borderColor: '#27272A'
    },
    optionItemSelected: {
        backgroundColor: '#10B98115',
        borderColor: '#10B98140'
    },
    optionText: {
        fontSize: 15,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    optionTextSelected: {
        color: '#10B981',
        fontWeight: '700'
    }
});
