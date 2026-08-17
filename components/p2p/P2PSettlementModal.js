import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { X, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { calculateSettlementQuote } from './p2pAccountingEngine';
import { formatINR } from './p2pPresentationAdapter';

export default function P2PSettlementModal({
    visible,
    loan,
    advances = [],
    repayments = [],
    onClose,
    onConfirmSettlement
}) {
    if (!loan) return null;

    const [waiverInput, setWaiverInput] = useState('0');
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [accountInput, setAccountInput] = useState(loan.accountId || 'HDFC Savings Account');
    const [noteInput, setNoteInput] = useState('Full settlement & closure');

    const waiver = parseFloat(waiverInput) || 0;

    const quote = useMemo(() => {
        return calculateSettlementQuote({
            loan,
            advances,
            repayments,
            waiverAmount: waiver
        });
    }, [loan, advances, repayments, waiver]);

    const handleConfirm = async () => {
        await onConfirmSettlement({
            loanId: loan.id,
            waiverAmount: waiver,
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
                            <Text style={styles.title}>Settle Loan #{loan.id.replace('loan_', '')}</Text>
                            <Text style={styles.sub}>Reconciliation & Closure Flow</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={20} color="#71717A" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.quoteCard}>
                        <View style={styles.quoteRow}>
                            <Text style={styles.quoteLabel}>Principal Outstanding</Text>
                            <Text style={styles.quoteVal}>{formatINR(quote.principalOutstanding)}</Text>
                        </View>
                        <View style={styles.quoteRow}>
                            <Text style={styles.quoteLabel}>Interest Outstanding</Text>
                            <Text style={[styles.quoteVal, { color: '#818CF8' }]}>{formatINR(quote.interestOutstanding)}</Text>
                        </View>
                        <View style={styles.quoteRow}>
                            <Text style={styles.quoteLabel}>Waiver / Discount</Text>
                            <Text style={[styles.quoteVal, { color: '#10B981' }]}>-{formatINR(quote.waiverAmount)}</Text>
                        </View>
                        <View style={[styles.quoteRow, { borderBottomWidth: 0, paddingTop: 8 }]}>
                            <Text style={[styles.quoteLabel, { fontWeight: '800', color: '#FFF' }]}>Final Settlement Amount</Text>
                            <Text style={[styles.quoteVal, { fontSize: 18, fontWeight: '900', color: '#10B981' }]}>
                                {formatINR(quote.settlementAmount)}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.inputLabel}>Adjustment / Waiver (₹)</Text>
                    <TextInput
                        value={waiverInput}
                        onChangeText={setWaiverInput}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#71717A"
                        style={styles.textInput}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Settlement Date (YYYY-MM-DD)</Text>
                    <TextInput
                        value={dateInput}
                        onChangeText={setDateInput}
                        placeholder="2026-08-17"
                        placeholderTextColor="#71717A"
                        style={styles.textInput}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 10 }]}>Settlement Account</Text>
                    <TextInput
                        value={accountInput}
                        onChangeText={setAccountInput}
                        placeholder="HDFC Savings Account"
                        placeholderTextColor="#71717A"
                        style={styles.textInput}
                    />

                    <View style={styles.alertBox}>
                        <AlertTriangle size={14} color="#F59E0B" />
                        <Text style={styles.alertText}>
                            Settling this loan will close all future schedules and record the final balancing journal entry.
                        </Text>
                    </View>

                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 14 }}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={styles.cancelBtnText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
                            <CheckCircle size={15} color="#FFF" />
                            <Text style={styles.confirmBtnText}>Record Settlement</Text>
                        </TouchableOpacity>
                    </View>
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
        marginBottom: 12
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
    quoteCard: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        marginBottom: 12
    },
    quoteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 5,
        borderBottomWidth: 1,
        borderBottomColor: '#1E2038'
    },
    quoteLabel: {
        color: '#94A3B8',
        fontSize: 12
    },
    quoteVal: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
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
        paddingVertical: 9,
        color: '#FFFFFF',
        fontSize: 13
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#78350F25',
        borderColor: '#F59E0B40',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginTop: 10
    },
    alertText: {
        color: '#F59E0B',
        fontSize: 11,
        flex: 1
    },
    cancelBtn: {
        flex: 1,
        backgroundColor: '#181930',
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: 'center'
    },
    cancelBtnText: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '700'
    },
    confirmBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#10B981',
        borderRadius: 10,
        paddingVertical: 12
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    }
});
