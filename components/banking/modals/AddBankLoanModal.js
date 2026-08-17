/**
 * FinLife Banking Relationship Intelligence — Add Bank Loan Modal
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { X, DollarSign, Calendar } from 'lucide-react-native';
import { BankingService } from '../../../services/bankingService';
import { createBankLoan, BANK_LOAN_TYPE, toPaise } from '../bankingDomainModel';

export default function AddBankLoanModal({ visible, banks = [], accounts = [], onClose, onLoanAdded }) {
    const [selectedBankId, setSelectedBankId] = useState(banks[0]?.id || '');
    const [loanName, setLoanName] = useState('');
    const [principal, setPrincipal] = useState('2500000');
    const [rate, setRate] = useState('9.99');
    const [tenure, setTenure] = useState('60');
    const [penalty, setPenalty] = useState('2.0');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!selectedBankId) {
            Alert.alert('Validation Error', 'Please select a bank.');
            return;
        }
        if (!loanName.trim()) {
            Alert.alert('Validation Error', 'Loan name is required.');
            return;
        }
        try {
            setLoading(true);
            const pPaise = toPaise(principal);
            const loan = createBankLoan({
                bankId: selectedBankId,
                loanName,
                originalPrincipalPaise: pPaise,
                interestRate: Number(rate) || 0,
                tenureMonths: parseInt(tenure, 10) || 12,
                prepaymentPenaltyPct: Number(penalty) || 0,
                startDate
            });

            await BankingService.saveLoan(loan);
            Alert.alert('Loan Created', `${loan.loanName} added with amortized schedule and journal entry.`);
            onLoanAdded?.();
            onClose();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to create loan.');
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <ScrollView style={styles.modalCard} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <DollarSign size={20} color="#F87171" />
                            <Text style={styles.modalTitle}>Add Bank Loan / Debt</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><X size={20} color="#94A3B8" /></TouchableOpacity>
                    </View>

                    {/* Bank Selection */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>SELECT BANK</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ gap: 6 }}>
                            {banks.map(b => (
                                <TouchableOpacity
                                    key={b.id}
                                    style={[styles.bankPill, (selectedBankId || banks[0]?.id) === b.id && styles.bankPillActive]}
                                    onPress={() => setSelectedBankId(b.id)}
                                >
                                    <Text style={[styles.bankPillText, (selectedBankId || banks[0]?.id) === b.id && styles.bankPillTextActive]}>
                                        {b.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>LOAN NAME</Text>
                        <TextInput
                            style={styles.input}
                            value={loanName}
                            onChangeText={setLoanName}
                            placeholder="e.g. Home Loan / Personal Loan"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <View style={styles.splitRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>PRINCIPAL (₹)</Text>
                            <TextInput
                                style={styles.input}
                                value={principal}
                                onChangeText={setPrincipal}
                                keyboardType="numeric"
                                placeholder="2500000"
                                placeholderTextColor="#71717A"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>RATE (%)</Text>
                            <TextInput
                                style={styles.input}
                                value={rate}
                                onChangeText={setRate}
                                keyboardType="numeric"
                                placeholder="9.99"
                                placeholderTextColor="#71717A"
                            />
                        </View>
                    </View>

                    <View style={styles.splitRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>TENURE (MONTHS)</Text>
                            <TextInput
                                style={styles.input}
                                value={tenure}
                                onChangeText={setTenure}
                                keyboardType="numeric"
                                placeholder="60"
                                placeholderTextColor="#71717A"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>PENALTY (%)</Text>
                            <TextInput
                                style={styles.input}
                                value={penalty}
                                onChangeText={setPenalty}
                                keyboardType="numeric"
                                placeholder="2.0"
                                placeholderTextColor="#71717A"
                            />
                        </View>
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleSave} disabled={loading}>
                        <Text style={styles.submitBtnText}>{loading ? 'Creating...' : 'Create Loan'}</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'flex-end'
    },
    modalCard: {
        backgroundColor: '#0F1026',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderColor: '#232548',
        borderWidth: 1,
        padding: 20,
        maxHeight: '85%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    inputGroup: {
        gap: 4
    },
    inputLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700'
    },
    bankPill: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: '#16182E',
        borderWidth: 1,
        borderColor: '#232548',
        marginRight: 6
    },
    bankPillActive: {
        backgroundColor: '#3730A3',
        borderColor: '#6366F1'
    },
    bankPillText: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700'
    },
    bankPillTextActive: {
        color: '#FFFFFF'
    },
    input: {
        backgroundColor: '#16182E',
        borderColor: '#232548',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    splitRow: {
        flexDirection: 'row',
        gap: 10
    },
    submitBtn: {
        backgroundColor: '#DC2626',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 10
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    }
});
