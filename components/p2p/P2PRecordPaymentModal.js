import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, Alert, ScrollView } from 'react-native';
import { X, CheckCircle, ArrowRight, DollarSign, Calendar, Sliders } from 'lucide-react-native';
import { REPAYMENT_ALLOCATION } from './p2pDomainModel';
import { allocateRepayment } from './p2pAccountingEngine';
import { formatINR } from './p2pPresentationAdapter';

export default function P2PRecordPaymentModal({
    visible,
    loan,
    scheduleItem = null,
    onClose,
    onConfirmPayment
}) {
    if (!loan) return null;

    const defaultAmount = scheduleItem 
        ? String(Number((scheduleItem.expectedAmount - (scheduleItem.paidAmount || 0)).toFixed(2)))
        : String(loan.principal ? Number(((loan.principal / (loan.tenureMonths || 12)) + ((loan.principal * (loan.interestRate || 0)) / 1200)).toFixed(2)) : '0');

    const [amountInput, setAmountInput] = useState(defaultAmount);
    const [dateInput, setDateInput] = useState(new Date().toISOString().split('T')[0]);
    const [accountInput, setAccountInput] = useState(loan.accountId || 'HDFC Savings Account');
    const [noteInput, setNoteInput] = useState('Monthly Installment Payment');
    const [allocationPolicy, setAllocationPolicy] = useState(loan.repaymentAllocation || REPAYMENT_ALLOCATION.INTEREST_FIRST);

    const parsedAmount = parseFloat(amountInput) || 0;

    const allocationPreview = useMemo(() => {
        const expectedInterest = scheduleItem ? scheduleItem.interestComponent : ((loan.principal * (loan.interestRate / 100)) / 12);
        return allocateRepayment({
            loan,
            amount: parsedAmount,
            currentOutstandingPrincipal: loan.principal,
            unpaidAccruedInterest: expectedInterest,
            allocationPolicy
        });
    }, [loan, scheduleItem, parsedAmount, allocationPolicy]);

    const isPartial = scheduleItem && parsedAmount < (scheduleItem.expectedAmount - (scheduleItem.paidAmount || 0) - 1);

    const handleConfirm = async () => {
        if (parsedAmount <= 0) {
            Alert.alert('Invalid Amount', 'Please enter an amount greater than 0.');
            return;
        }

        await onConfirmPayment({
            loanId: loan.id,
            amount: parsedAmount,
            date: dateInput,
            accountId: accountInput,
            note: noteInput,
            scheduleItemId: scheduleItem ? scheduleItem.id : null,
            allocationPolicy
        });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.modalCard}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Record Loan Repayment</Text>
                            <Text style={styles.sub}>Loan #{loan.id.replace('loan_', '')} • {loan.direction}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={20} color="#71717A" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                        {scheduleItem && (
                            <View style={styles.expectedCard}>
                                <Text style={styles.expectedLabel}>Scheduled Installment</Text>
                                <Text style={styles.expectedVal}>{formatINR(scheduleItem.expectedAmount)}</Text>
                                <Text style={styles.expectedDate}>Due Date: {scheduleItem.dueDate}</Text>
                            </View>
                        )}

                        <Text style={styles.inputLabel}>Amount Paid (₹)</Text>
                        <TextInput
                            value={amountInput}
                            onChangeText={setAmountInput}
                            keyboardType="numeric"
                            placeholder="53519"
                            placeholderTextColor="#71717A"
                            style={[styles.textInput, { fontSize: 18, fontWeight: '900' }]}
                        />

                        {/* Partial Payment Alert */}
                        {isPartial && (
                            <View style={styles.partialAlert}>
                                <Text style={styles.partialAlertText}>
                                    ⚠️ Partial Payment: Balance of {formatINR(scheduleItem.expectedAmount - parsedAmount)} will remain scheduled.
                                </Text>
                            </View>
                        )}

                        {/* Split Allocation Preview */}
                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Double-Entry Allocation Split</Text>
                        <View style={styles.splitBox}>
                            <View style={styles.splitRow}>
                                <Text style={styles.splitLabel}>Principal Component</Text>
                                <Text style={[styles.splitVal, { color: '#10B981' }]}>{formatINR(allocationPreview.principalComponent)}</Text>
                            </View>
                            <View style={styles.splitRow}>
                                <Text style={styles.splitLabel}>Interest Component</Text>
                                <Text style={[styles.splitVal, { color: '#818CF8' }]}>{formatINR(allocationPreview.interestComponent)}</Text>
                            </View>
                            <View style={[styles.splitRow, { borderBottomWidth: 0 }]}>
                                <Text style={styles.splitLabel}>Total Outflow / Inflow</Text>
                                <Text style={[styles.splitVal, { fontWeight: '900', color: '#FFF' }]}>{formatINR(parsedAmount)}</Text>
                            </View>
                        </View>

                        {/* Allocation Policy */}
                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Repayment Allocation Policy</Text>
                        <View style={{ flexDirection: 'row', gap: 6 }}>
                            {[
                                { key: REPAYMENT_ALLOCATION.INTEREST_FIRST, label: 'Interest First' },
                                { key: REPAYMENT_ALLOCATION.PRINCIPAL_FIRST, label: 'Principal First' },
                                { key: REPAYMENT_ALLOCATION.PROPORTIONAL, label: 'Proportional' }
                            ].map(p => (
                                <TouchableOpacity
                                    key={p.key}
                                    style={[styles.policyBtn, allocationPolicy === p.key && styles.policyBtnActive]}
                                    onPress={() => setAllocationPolicy(p.key)}
                                >
                                    <Text style={[styles.policyBtnText, allocationPolicy === p.key && styles.policyBtnTextActive]}>
                                        {p.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Payment Date (YYYY-MM-DD)</Text>
                        <TextInput
                            value={dateInput}
                            onChangeText={setDateInput}
                            placeholder="2026-08-17"
                            placeholderTextColor="#71717A"
                            style={styles.textInput}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Cash Account</Text>
                        <TextInput
                            value={accountInput}
                            onChangeText={setAccountInput}
                            placeholder="HDFC Savings Account"
                            placeholderTextColor="#71717A"
                            style={styles.textInput}
                        />

                        <Text style={[styles.inputLabel, { marginTop: 12 }]}>Notes</Text>
                        <TextInput
                            value={noteInput}
                            onChangeText={setNoteInput}
                            placeholder="e.g. August Installment"
                            placeholderTextColor="#71717A"
                            style={styles.textInput}
                        />
                    </ScrollView>

                    <TouchableOpacity style={styles.confirmBtn} activeOpacity={0.8} onPress={handleConfirm}>
                        <CheckCircle size={16} color="#FFF" />
                        <Text style={styles.confirmBtnText}>Confirm & Post Journal</Text>
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
    expectedCard: {
        backgroundColor: '#161836',
        borderColor: '#3730A3',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10,
        marginBottom: 12
    },
    expectedLabel: {
        color: '#818CF8',
        fontSize: 10,
        fontWeight: '700'
    },
    expectedVal: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '900',
        marginTop: 2
    },
    expectedDate: {
        color: '#94A3B8',
        fontSize: 10,
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
    partialAlert: {
        backgroundColor: '#78350F30',
        borderColor: '#F59E0B50',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginTop: 8
    },
    partialAlertText: {
        color: '#F59E0B',
        fontSize: 11
    },
    splitBox: {
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 10,
        padding: 10
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#1E2038'
    },
    splitLabel: {
        color: '#94A3B8',
        fontSize: 11
    },
    splitVal: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700'
    },
    policyBtn: {
        flex: 1,
        backgroundColor: '#121324',
        borderColor: '#232542',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        alignItems: 'center'
    },
    policyBtnActive: {
        backgroundColor: '#4F46E5',
        borderColor: '#818CF8'
    },
    policyBtnText: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '700'
    },
    policyBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '800'
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#4F46E5',
        borderRadius: 12,
        paddingVertical: 12,
        marginTop: 12
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    }
});
