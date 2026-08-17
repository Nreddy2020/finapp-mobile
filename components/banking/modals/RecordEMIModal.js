/**
 * FinLife Banking Relationship Intelligence — Record EMI Modal (Action 1)
 * 
 * Allows the user to execute an EMI payment, with explicit principal, interest,
 * and fee breakdown committed to the immutable double-entry journal.
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { X, CheckCircle2, DollarSign, Calendar } from 'lucide-react-native';
import { BankingService } from '../../../services/bankingService';
import { fromPaise, toPaise } from '../bankingDomainModel';
import { formatPaise, formatPrecisionINR } from '../bankingPresentationAdapter';

export default function RecordEMIModal({
    visible,
    loan,
    installment,
    bank,
    onClose,
    onPaymentRecorded
}) {
    const [amount, setAmount] = useState('');
    const [principal, setPrincipal] = useState('');
    const [interest, setInterest] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (installment) {
            const expTot = fromPaise(installment.expectedTotalPaise);
            const expP = fromPaise(installment.expectedPrincipalPaise);
            const expI = fromPaise(installment.expectedInterestPaise);
            setAmount(expTot.toString());
            setPrincipal(expP.toString());
            setInterest(expI.toString());
        }
    }, [installment]);

    const handleRecord = async () => {
        try {
            setLoading(true);
            const pPaise = toPaise(principal || 0);
            const iPaise = toPaise(interest || 0);
            const totPaise = toPaise(amount || 0);

            await BankingService.payScheduledEMI({
                loanId: loan.id,
                installmentId: installment?.id || null,
                amountPaise: totPaise,
                principalPaise: pPaise,
                interestPaise: iPaise,
                date
            });

            Alert.alert('Payment Recorded', `EMI payment of ₹${amount} successfully posted to financial journal.`);
            onPaymentRecorded?.();
            onClose();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to record EMI payment.');
        } finally {
            setLoading(false);
        }
    };

    if (!visible || !loan) return null;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <CheckCircle2 size={20} color="#10B981" />
                            <Text style={styles.modalTitle}>Pay Scheduled EMI</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><X size={20} color="#94A3B8" /></TouchableOpacity>
                    </View>

                    <Text style={styles.loanInfo}>{loan.loanName} • {bank?.name}</Text>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>TOTAL PAYMENT AMOUNT (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <View style={styles.splitRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>PRINCIPAL SLICE (₹)</Text>
                            <TextInput
                                style={styles.input}
                                value={principal}
                                onChangeText={setPrincipal}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#71717A"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.inputLabel}>INTEREST SLICE (₹)</Text>
                            <TextInput
                                style={styles.input}
                                value={interest}
                                onChangeText={setInterest}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor="#71717A"
                            />
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>PAYMENT DATE (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleRecord} disabled={loading}>
                        <Text style={styles.submitBtnText}>{loading ? 'Posting to Journal...' : 'Confirm EMI Payment'}</Text>
                    </TouchableOpacity>
                </View>
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
        gap: 12
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
    loanInfo: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 4
    },
    inputGroup: {
        gap: 4
    },
    inputLabel: {
        color: '#94A3B8',
        fontSize: 10,
        fontWeight: '700'
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
        backgroundColor: '#059669',
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8
    },
    submitBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '800'
    }
});
