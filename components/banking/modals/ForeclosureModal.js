/**
 * FinLife Banking Relationship Intelligence — Foreclosure Modal (Action 3)
 * 
 * Computes complete foreclosure settlement quote and commits closing journal entry.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { X, ShieldAlert, CheckCircle2 } from 'lucide-react-native';
import { BankingService } from '../../../services/bankingService';
import { toPaise } from '../bankingDomainModel';
import { calculateForeclosureQuote } from '../bankingAccountingEngine';
import { formatPaise } from '../bankingPresentationAdapter';

export default function ForeclosureModal({
    visible,
    loan,
    outstandingPrincipalPaise,
    bank,
    onClose,
    onForeclosureExecuted
}) {
    const [accruedInterest, setAccruedInterest] = useState('0');
    const [waiver, setWaiver] = useState('0');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);

    if (!visible || !loan) return null;

    const accruedPaise = toPaise(accruedInterest || 0);
    const waiverPaise = toPaise(waiver || 0);

    const quote = calculateForeclosureQuote({
        outstandingPrincipalPaise,
        accruedInterestPaise: accruedPaise,
        prepaymentPenaltyPct: loan.prepaymentPenaltyPct || 0,
        waiverAmountPaise: waiverPaise
    });

    const handleExecute = async () => {
        try {
            setLoading(true);
            await BankingService.forecloseLoan({
                loanId: loan.id,
                accruedInterestPaise: accruedPaise,
                prepaymentPenaltyPct: loan.prepaymentPenaltyPct || 0,
                waiverPaise,
                date
            });

            Alert.alert('Loan Foreclosed', `Loan ${loan.loanName} has been successfully settled and closed.`);
            onForeclosureExecuted?.();
            onClose();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to foreclose loan.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <ScrollView style={styles.modalCard} contentContainerStyle={{ gap: 12, paddingBottom: 24 }}>
                    <View style={styles.modalHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <ShieldAlert size={20} color="#EF4444" />
                            <Text style={styles.modalTitle}>Foreclose & Settle Loan</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><X size={20} color="#94A3B8" /></TouchableOpacity>
                    </View>

                    <Text style={styles.loanInfo}>{loan.loanName} • {bank?.name}</Text>

                    {/* Settlement Quote Breakdown Card */}
                    <View style={styles.quoteCard}>
                        <Text style={styles.quoteTitle}>FINAL SETTLEMENT QUOTE</Text>
                        <View style={styles.quoteRow}>
                            <Text style={styles.quoteLabel}>Outstanding Principal</Text>
                            <Text style={styles.quoteVal}>{formatPaise(quote.outstandingPrincipalPaise)}</Text>
                        </View>
                        <View style={styles.quoteRow}>
                            <Text style={styles.quoteLabel}>Prepayment Penalty ({loan.prepaymentPenaltyPct}%)</Text>
                            <Text style={styles.quoteVal}>{formatPaise(quote.prepaymentPenaltyPaise)}</Text>
                        </View>
                        <View style={styles.quoteRow}>
                            <Text style={styles.quoteLabel}>Accrued Unbilled Interest</Text>
                            <Text style={styles.quoteVal}>{formatPaise(quote.accruedInterestPaise)}</Text>
                        </View>
                        {quote.waiverAmountPaise > 0 && (
                            <View style={styles.quoteRow}>
                                <Text style={[styles.quoteLabel, { color: '#10B981' }]}>Bank Waiver / Discount</Text>
                                <Text style={[styles.quoteVal, { color: '#10B981' }]}>-{formatPaise(quote.waiverAmountPaise)}</Text>
                            </View>
                        )}
                        <View style={styles.quoteDivider} />
                        <View style={styles.quoteRow}>
                            <Text style={styles.quoteFinalLabel}>TOTAL SETTLEMENT AMOUNT</Text>
                            <Text style={styles.quoteFinalVal}>{formatPaise(quote.finalSettlementAmountPaise)}</Text>
                        </View>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>ACCRUED UNBILLED INTEREST (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={accruedInterest}
                            onChangeText={setAccruedInterest}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>BANK WAIVER / DISCOUNT (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={waiver}
                            onChangeText={setWaiver}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor="#71717A"
                        />
                    </View>

                    <TouchableOpacity style={styles.submitBtn} onPress={handleExecute} disabled={loading}>
                        <Text style={styles.submitBtnText}>{loading ? 'Executing...' : 'Confirm & Close Loan'}</Text>
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
    loanInfo: {
        color: '#818CF8',
        fontSize: 12,
        fontWeight: '700'
    },
    quoteCard: {
        backgroundColor: '#16182E',
        borderColor: '#DC2626',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 6
    },
    quoteTitle: {
        color: '#EF4444',
        fontSize: 10,
        fontWeight: '800',
        marginBottom: 4
    },
    quoteRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    quoteLabel: {
        color: '#94A3B8',
        fontSize: 11
    },
    quoteVal: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '700'
    },
    quoteDivider: {
        height: 1,
        backgroundColor: '#232548',
        marginVertical: 4
    },
    quoteFinalLabel: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '800'
    },
    quoteFinalVal: {
        color: '#EF4444',
        fontSize: 15,
        fontWeight: '900'
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
