/**
 * components/commitments/RecordPaymentModal.js
 * 
 * Confirmation modal for recording payment against an occurrence.
 * Supports exact actual amount adjustment, payment method tracking,
 * and ledger linking.
 */

import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert
} from 'react-native';
import { X, CheckCircle, CreditCard } from 'lucide-react-native';
import { rupeesToMoneyPaise, moneyToRupees } from '../../services/commitments/commitmentContracts.js';

const PAYMENT_METHODS = ['UPI', 'Net Banking', 'Debit Card', 'Credit Card', 'Cash'];

export default function RecordPaymentModal({
    visible,
    occurrence,
    onClose,
    onConfirmPayment
}) {
    if (!occurrence) return null;

    const initialRupees = occurrence.expectedAmount
        ? moneyToRupees(occurrence.expectedAmount).toString()
        : '0';

    const [amountRupees, setAmountRupees] = useState(initialRupees);
    const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
    const [paymentMethod, setPaymentMethod] = useState('UPI');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (occurrence?.expectedAmount) {
            setAmountRupees(moneyToRupees(occurrence.expectedAmount).toString());
            setPaidDate(new Date().toISOString().split('T')[0]);
        }
    }, [occurrence]);

    const handleConfirm = () => {
        const numRupees = parseFloat(amountRupees);
        if (isNaN(numRupees) || numRupees <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid paid amount.');
            return;
        }

        try {
            const actualAmountPaise = rupeesToMoneyPaise(numRupees);
            onConfirmPayment(occurrence.id, {
                actualAmount: actualAmountPaise,
                actualPaidDate: paidDate,
                paymentMethod,
                notes: notes.trim()
            });
            onClose();
        } catch (err) {
            Alert.alert('Error', err.message);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.sheet}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerSubtitle}>RECORD PAYMENT</Text>
                            <Text style={styles.headerTitle}>{occurrence.commitmentName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                            <X size={20} color="#94A3B8" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
                        {/* Summary Info */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryLabel}>Scheduled Due Date</Text>
                            <Text style={styles.summaryValue}>{occurrence.scheduledDate}</Text>
                        </View>

                        {/* Amount Input */}
                        <View>
                            <Text style={styles.inputLabel}>Actual Amount Paid (₹)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={amountRupees}
                                onChangeText={setAmountRupees}
                                placeholder="0"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        {/* Date Paid */}
                        <View>
                            <Text style={styles.inputLabel}>Date Paid (YYYY-MM-DD)</Text>
                            <TextInput
                                style={styles.input}
                                value={paidDate}
                                onChangeText={setPaidDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        {/* Payment Method Selector */}
                        <View>
                            <Text style={styles.inputLabel}>Payment Method</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.methodScroll}>
                                {PAYMENT_METHODS.map(m => {
                                    const isSelected = paymentMethod === m;
                                    return (
                                        <TouchableOpacity
                                            key={m}
                                            style={[styles.methodChip, isSelected && styles.methodChipActive]}
                                            onPress={() => setPaymentMethod(m)}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.methodChipText, isSelected && styles.methodChipTextActive]}>
                                                {m}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>

                        {/* Notes */}
                        <View>
                            <Text style={styles.inputLabel}>Reference / Notes (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                value={notes}
                                onChangeText={setNotes}
                                placeholder="e.g. UTR / Transaction ID"
                                placeholderTextColor="#64748B"
                            />
                        </View>

                        {/* Confirm Button */}
                        <TouchableOpacity
                            style={styles.confirmBtn}
                            onPress={handleConfirm}
                            activeOpacity={0.8}
                        >
                            <CheckCircle size={18} color="#FFFFFF" />
                            <Text style={styles.confirmBtnText}>Confirm & Mark Paid</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'flex-end'
    },
    sheet: {
        backgroundColor: '#161426',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        maxHeight: '85%',
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#242038'
    },
    headerSubtitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#10B981',
        letterSpacing: 1,
        marginBottom: 4
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#242038',
        alignItems: 'center',
        justifyContent: 'center'
    },
    body: {
        paddingHorizontal: 20
    },
    bodyContent: {
        paddingVertical: 18,
        gap: 14
    },
    summaryCard: {
        backgroundColor: '#1F1B38',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#2D2845'
    },
    summaryLabel: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500'
    },
    summaryValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F8FAFC',
        marginTop: 2
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 6
    },
    input: {
        backgroundColor: '#1E1B2E',
        borderWidth: 1,
        borderColor: '#2D2845',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: '#FFFFFF',
        fontSize: 14
    },
    methodScroll: {
        flexDirection: 'row'
    },
    methodChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#1E1B2E',
        borderWidth: 1,
        borderColor: '#2D2845',
        marginRight: 8
    },
    methodChipActive: {
        backgroundColor: '#065F46',
        borderColor: '#10B981'
    },
    methodChipText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600'
    },
    methodChipTextActive: {
        color: '#34D399'
    },
    confirmBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#10B981',
        paddingVertical: 14,
        borderRadius: 14,
        gap: 8,
        marginTop: 10
    },
    confirmBtnText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF'
    }
});
