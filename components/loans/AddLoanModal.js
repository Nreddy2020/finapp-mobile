/**
 * components/loans/AddLoanModal.js
 * 
 * Formal Bank Loans V1 — Add New Loan Facility Modal.
 * Collects facility details, provides live preview of reducing-balance EMI,
 * and persists via LoanRepository.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { LOAN_TYPES, RATE_TYPES, LOAN_STATUS, toPaise, toRupeesFormatted } from '../../services/loans/loanContracts.js';
import { calculateMonthlyEmiPaise } from '../../services/loans/loanEngine.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';

export default function AddLoanModal({ visible, onClose, onLoanAdded }) {
    const [name, setName] = useState('');
    const [lender, setLender] = useState('');
    const [loanType, setLoanType] = useState(LOAN_TYPES.PERSONAL);
    const [principalStr, setPrincipalStr] = useState('');
    const [rateStr, setRateStr] = useState('10.5');
    const [tenureStr, setTenureStr] = useState('36');
    const [dueDayStr, setDueDayStr] = useState('5');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!visible) return null;

    // Calculate live preview EMI
    let liveEmiFormatted = '—';
    try {
        const p = toPaise(Number(principalStr || 0));
        const r = Number(rateStr || 0);
        const t = Number(tenureStr || 0);
        if (p > 0n && r >= 0 && t > 0) {
            const emi = calculateMonthlyEmiPaise(p, r, t);
            liveEmiFormatted = toRupeesFormatted(emi);
        }
    } catch (e) {
        liveEmiFormatted = '—';
    }

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Validation Error', 'Please enter a loan facility name');
            return;
        }
        if (!lender.trim()) {
            Alert.alert('Validation Error', 'Please enter the lender name or bank');
            return;
        }

        try {
            setIsSubmitting(true);
            const principalPaise = toPaise(Number(principalStr));
            const annualRatePercent = Number(rateStr);
            const tenureMonths = Number(tenureStr);
            const emiDueDayOfMonth = Number(dueDayStr) || 5;

            const facility = {
                id: `LN_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: name.trim(),
                lender: lender.trim(),
                loanType,
                rateType: RATE_TYPES.FIXED,
                status: LOAN_STATUS.ACTIVE,
                principalPaise,
                outstandingPrincipalPaise: principalPaise,
                annualRatePercent,
                tenureMonths,
                emiDueDayOfMonth,
                startDate: new Date().toISOString().split('T')[0]
            };

            await LoanRepository.saveFacility(facility);
            if (onLoanAdded) onLoanAdded(facility);
            onClose();
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Add Bank Loan Facility</Text>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollArea}>
                        {/* Name & Lender */}
                        <Text style={styles.inputLabel}>FACILITY NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. HDFC Home Loan"
                            placeholderTextColor="#555C75"
                        />

                        <Text style={styles.inputLabel}>LENDER / BANK</Text>
                        <TextInput
                            style={styles.input}
                            value={lender}
                            onChangeText={setLender}
                            placeholder="e.g. HDFC Bank"
                            placeholderTextColor="#555C75"
                        />

                        {/* Loan Type Selector */}
                        <Text style={styles.inputLabel}>LOAN TYPE</Text>
                        <View style={styles.typeRow}>
                            {Object.values(LOAN_TYPES).map((type) => (
                                <TouchableOpacity
                                    key={type}
                                    style={[styles.typeChip, loanType === type && styles.typeChipActive]}
                                    onPress={() => setLoanType(type)}
                                >
                                    <Text style={[styles.typeText, loanType === type && styles.typeTextActive]}>
                                        {type}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Principal Amount */}
                        <Text style={styles.inputLabel}>SANCTIONED PRINCIPAL (₹)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={principalStr}
                            onChangeText={setPrincipalStr}
                            placeholder="e.g. 2500000"
                            placeholderTextColor="#555C75"
                        />

                        {/* Rate & Tenure */}
                        <View style={styles.splitRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.inputLabel}>ANNUAL RATE (% p.a.)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={rateStr}
                                    onChangeText={setRateStr}
                                    placeholder="8.5"
                                    placeholderTextColor="#555C75"
                                />
                            </View>

                            <View style={{ flex: 1, marginLeft: 10 }}>
                                <Text style={styles.inputLabel}>TENURE (MONTHS)</Text>
                                <TextInput
                                    style={styles.input}
                                    keyboardType="numeric"
                                    value={tenureStr}
                                    onChangeText={setTenureStr}
                                    placeholder="240"
                                    placeholderTextColor="#555C75"
                                />
                            </View>
                        </View>

                        {/* Due Day */}
                        <Text style={styles.inputLabel}>EMI DUE DAY OF MONTH (1 - 31)</Text>
                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={dueDayStr}
                            onChangeText={setDueDayStr}
                            placeholder="5"
                            placeholderTextColor="#555C75"
                        />

                        {/* Live EMI Preview */}
                        <View style={styles.previewBox}>
                            <Text style={styles.previewLabel}>CALCULATED MONTHLY EMI</Text>
                            <Text style={styles.previewAmount}>{liveEmiFormatted}</Text>
                            <Text style={styles.previewNote}>Mode A: Standard Reducing Balance</Text>
                        </View>
                    </ScrollView>

                    {/* Footer Submit */}
                    <View style={styles.footer}>
                        <TouchableOpacity 
                            style={[styles.submitButton, isSubmitting && { opacity: 0.6 }]} 
                            onPress={handleSave}
                            disabled={isSubmitting}
                        >
                            <Text style={styles.submitText}>Save Loan Facility</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#0E101D',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: '85%',
        borderWidth: 1,
        borderColor: '#1E2337'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#171A2B'
    },
    title: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '800'
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1E2337',
        justifyContent: 'center',
        alignItems: 'center'
    },
    closeBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    scrollArea: {
        padding: 20
    },
    inputLabel: {
        color: '#717B9E',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 6,
        letterSpacing: 0.5
    },
    input: {
        backgroundColor: '#121422',
        borderRadius: 10,
        padding: 12,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#242A42'
    },
    typeRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 14
    },
    typeChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#151829',
        borderWidth: 1,
        borderColor: '#242A42'
    },
    typeChipActive: {
        backgroundColor: '#6C5CE7',
        borderColor: '#6C5CE7'
    },
    typeText: {
        color: '#8A92B2',
        fontSize: 11,
        fontWeight: '700'
    },
    typeTextActive: {
        color: '#FFFFFF'
    },
    splitRow: {
        flexDirection: 'row',
        marginBottom: 4
    },
    previewBox: {
        backgroundColor: 'rgba(108, 92, 231, 0.1)',
        borderRadius: 12,
        padding: 14,
        alignItems: 'center',
        marginVertical: 10,
        borderWidth: 1,
        borderColor: 'rgba(108, 92, 231, 0.3)'
    },
    previewLabel: {
        color: '#A29BFE',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    previewAmount: {
        color: '#FFFFFF',
        fontSize: 22,
        fontWeight: '800',
        marginVertical: 4
    },
    previewNote: {
        color: '#717B9E',
        fontSize: 10
    },
    footer: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#171A2B'
    },
    submitButton: {
        backgroundColor: '#6C5CE7',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center'
    },
    submitText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700'
    }
});
