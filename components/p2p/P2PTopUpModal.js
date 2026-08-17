import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { X, Plus, Check } from 'lucide-react-native';
import { formatINR } from './p2pPresentationAdapter';

export default function P2PTopUpModal({
    visible,
    loan,
    onClose,
    onConfirmTopUp
}) {
    if (!loan) return null;

    const [amountInput, setAmountInput] = useState('50000');
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [accountInput, setAccountInput] = useState(loan.accountId || 'HDFC Savings Account');
    const [noteInput, setNoteInput] = useState('Additional Top-Up Advance');

    const handleConfirm = async () => {
        const parsedAmount = parseFloat(amountInput);
        if (isNaN(parsedAmount) || parsedAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter an amount greater than 0.');
            return;
        }

        await onConfirmTopUp({
            loanId: loan.id,
            amount: parsedAmount,
            date: dateInput,
            accountId: accountInput,
            note: noteInput
        });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Add Top-Up Advance</Text>
                            <Text style={styles.sub}>Loan #{loan.id.replace('loan_', '')} • Current Principal: {formatINR(loan.principal)}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={20} color="#71717A" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.inputLabel}>Top-Up Amount (₹)</Text>
                    <TextInput
                        value={amountInput}
                        onChangeText={setAmountInput}
                        keyboardType="numeric"
                        placeholder="50000"
                        placeholderTextColor="#71717A"
                        style={[styles.textInput, { fontSize: 18, fontWeight: '900' }]}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Date (YYYY-MM-DD)</Text>
                    <TextInput
                        value={dateInput}
                        onChangeText={setDateInput}
                        placeholder="2026-08-17"
                        placeholderTextColor="#71717A"
                        style={styles.textInput}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Funding Account</Text>
                    <TextInput
                        value={accountInput}
                        onChangeText={setAccountInput}
                        placeholder="HDFC Savings Account"
                        placeholderTextColor="#71717A"
                        style={styles.textInput}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 12 }]}>Note</Text>
                    <TextInput
                        value={noteInput}
                        onChangeText={setNoteInput}
                        placeholder="e.g. Additional equipment finance"
                        placeholderTextColor="#71717A"
                        style={styles.textInput}
                    />

                    <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.8} onPress={handleConfirm}>
                        <Plus size={16} color="#FFF" />
                        <Text style={styles.confirmBtnText}>Add Advance & Recalculate</Text>
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
        borderColor: '#2D2F54',
        borderTopWidth: 1.5,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 18
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
    },
    title: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800'
    },
    sub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    inputLabel: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 4
    },
    textInput: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#FFFFFF',
        fontSize: 13
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: 14
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    }
});
