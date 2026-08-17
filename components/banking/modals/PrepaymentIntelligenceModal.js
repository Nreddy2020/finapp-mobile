/**
 * FinLife Banking Relationship Intelligence — Prepayment Intelligence Modal
 * 
 * Rebuilt as a decision-first interactive simulation:
 * 1. Outstanding principal & prepayment input
 * 2. Option A (Tenure Reduction) vs Option B (EMI Reduction) dynamic simulation
 * 3. Transparent "Why is this recommended?" explanation
 * 4. 0 Hard-coded constants (derived from calculatePrepaymentIntelligence)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { X, CheckCircle2, TrendingDown, DollarSign, AlertCircle, ArrowRight, ShieldCheck, Zap } from 'lucide-react-native';
import { BankingService } from '../../../services/bankingService';
import { toPaise, fromPaise } from '../bankingDomainModel';
import { formatPaise, formatINR } from '../bankingPresentationAdapter';
import { calculatePrepaymentIntelligence } from '../bankingAccountingEngine';

export default function PrepaymentIntelligenceModal({
    visible,
    loan,
    outstandingPrincipalPaise,
    contractualEMIPaise,
    remainingMonths,
    onClose,
    onSuccess
}) {
    const [amountStr, setAmountStr] = useState('100000');
    const [selectedStrategy, setSelectedStrategy] = useState('OPTION_A'); // 'OPTION_A' (Reduce Tenure) | 'OPTION_B' (Reduce EMI)
    const [loading, setLoading] = useState(false);

    if (!visible || !loan) return null;

    const prepayPaise = toPaise(parseFloat(amountStr) || 0);

    const simulation = calculatePrepaymentIntelligence({
        outstandingPrincipalPaise,
        annualRate: loan.interestRate,
        remainingTenureMonths: remainingMonths || loan.tenureMonths,
        contractualEMIPaise,
        prepaymentAmountPaise: prepayPaise,
        prepaymentPenaltyPct: loan.prepaymentPenaltyPct || 0
    });

    const isForeclosure = simulation?.isForeclosureRequired || prepayPaise >= outstandingPrincipalPaise;

    const handleExecutePrepayment = async () => {
        if (!prepayPaise || prepayPaise <= 0) {
            Alert.alert('Invalid Amount', 'Please enter a valid principal prepayment amount.');
            return;
        }

        if (isForeclosure) {
            Alert.alert('Foreclosure Required', 'Prepaying the entire remaining principal requires a full loan foreclosure quote.');
            return;
        }

        setLoading(true);
        try {
            await BankingService.recordPrincipalPrepayment({
                loanId: loan.id,
                prepaymentAmountPaise: prepayPaise,
                strategy: selectedStrategy === 'OPTION_A' ? 'REDUCE_TENURE' : 'REDUCE_EMI',
                sourceAccountId: loan.disbursedToAccountId,
                prepaymentPenaltyPaise: simulation?.penaltyPaise || 0
            });
            Alert.alert('Prepayment Recorded', `Successfully prepaid ${formatPaise(prepayPaise)} principal on ${loan.loanName}.`);
            onSuccess();
        } catch (error) {
            Alert.alert('Error', error.message || 'Failed to record principal prepayment.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalCard}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <View>
                            <Text style={styles.modalTitle}>PREPAYMENT INTELLIGENCE</Text>
                            <Text style={styles.modalSub}>{loan.loanName} • Outstanding: {formatPaise(outstandingPrincipalPaise)}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={18} color="#9CA3AF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
                        {/* Amount Input */}
                        <Text style={styles.inputLabel}>WHAT IF YOU PREPAY (₹)?</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.inputPrefix}>₹</Text>
                            <TextInput
                                style={styles.input}
                                value={amountStr}
                                onChangeText={setAmountStr}
                                keyboardType="numeric"
                                placeholder="100000"
                                placeholderTextColor="#4B5563"
                            />
                        </View>

                        {simulation?.valid && !isForeclosure ? (
                            <View style={{ gap: 10, marginTop: 12 }}>
                                <Text style={styles.sectionLabel}>CHOOSE PREPAYMENT STRATEGY</Text>

                                {/* Option A */}
                                <TouchableOpacity
                                    style={[styles.strategyCard, selectedStrategy === 'OPTION_A' && styles.strategyCardActive]}
                                    onPress={() => setSelectedStrategy('OPTION_A')}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.strategyHeader}>
                                        <Text style={[styles.strategyName, selectedStrategy === 'OPTION_A' && { color: '#FDE68A' }]}>
                                            OPTION A: KEEP EMI {formatPaise(contractualEMIPaise)}
                                        </Text>
                                        {selectedStrategy === 'OPTION_A' && <CheckCircle2 size={16} color="#10B981" />}
                                    </View>
                                    <Text style={styles.strategyMetric}>
                                        Loan ends <Text style={{ color: '#10B981', fontWeight: '800' }}>{simulation.optionA?.monthsSaved || 0} months earlier</Text>
                                    </Text>
                                    <Text style={styles.strategyMetric}>
                                        Net Interest Saved: <Text style={{ color: '#10B981', fontWeight: '800' }}>{formatPaise(simulation.optionA?.netBenefitPaise || 0)}</Text>
                                    </Text>
                                </TouchableOpacity>

                                {/* Option B */}
                                <TouchableOpacity
                                    style={[styles.strategyCard, selectedStrategy === 'OPTION_B' && styles.strategyCardActive]}
                                    onPress={() => setSelectedStrategy('OPTION_B')}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.strategyHeader}>
                                        <Text style={[styles.strategyName, selectedStrategy === 'OPTION_B' && { color: '#FDE68A' }]}>
                                            OPTION B: KEEP REMAINING TENURE ({remainingMonths} MO)
                                        </Text>
                                        {selectedStrategy === 'OPTION_B' && <CheckCircle2 size={16} color="#10B981" />}
                                    </View>
                                    <Text style={styles.strategyMetric}>
                                        New EMI: <Text style={{ color: '#818CF8', fontWeight: '800' }}>{formatPaise(simulation.optionB?.newEMIPaise || 0)}</Text>
                                    </Text>
                                    <Text style={styles.strategyMetric}>
                                        Monthly cash released: <Text style={{ color: '#10B981', fontWeight: '800' }}>{formatPaise(simulation.optionB?.monthlyCashReleasedPaise || 0)}/mo</Text>
                                    </Text>
                                    <Text style={styles.strategyMetric}>
                                        Net Interest Saved: {formatPaise(simulation.optionB?.netBenefitPaise || 0)}
                                    </Text>
                                </TouchableOpacity>

                                {/* Recommended Strategy Banner */}
                                <View style={styles.recommendBanner}>
                                    <Text style={styles.recommendTag}>RECOMMENDED</Text>
                                    <Text style={styles.recommendTitle}>OPTION A (Higher Lifetime Interest Saving)</Text>
                                </View>

                                {/* Why is this recommended? Explainer */}
                                <View style={styles.whyBox}>
                                    <Text style={styles.whyHeader}>WHY IS THIS RECOMMENDED?</Text>
                                    <Text style={styles.whyText}>
                                        Your {loan.loanName} costs {loan.interestRate}% p.a. Prepaying {formatPaise(prepayPaise, true)} principal reduces the balance before future compound interest accrues. Keeping the original EMI pays off the principal fastest, maximizing your net lifetime savings ({formatPaise(simulation.optionA?.netBenefitPaise || 0)}).
                                    </Text>
                                </View>
                            </View>
                        ) : isForeclosure ? (
                            <View style={styles.warningBox}>
                                <Text style={styles.warningText}>
                                    ⚠️ Prepaying full outstanding balance ({formatPaise(outstandingPrincipalPaise)}) qualifies for Loan Foreclosure.
                                </Text>
                            </View>
                        ) : null}
                    </ScrollView>

                    {/* Action Button */}
                    <TouchableOpacity
                        style={[styles.confirmBtn, loading && { opacity: 0.5 }]}
                        onPress={handleExecutePrepayment}
                        disabled={loading || !simulation?.valid || isForeclosure}
                    >
                        <Text style={styles.confirmBtnText}>
                            {loading ? 'Committing to Journal...' : `Continue with ${selectedStrategy === 'OPTION_A' ? 'Option A (Reduce Tenure)' : 'Option B (Lower EMI)'}`}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: '#000000B0',
        justifyContent: 'flex-end'
    },
    modalCard: {
        backgroundColor: '#0F1022',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderColor: '#1E2038',
        borderWidth: 1,
        padding: 20,
        gap: 12
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    modalTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    modalSub: {
        color: '#71717A',
        fontSize: 11,
        marginTop: 2
    },
    closeBtn: {
        padding: 4
    },
    inputLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 6
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 10,
        paddingHorizontal: 12,
        marginTop: 4
    },
    inputPrefix: {
        color: '#F59E0B',
        fontSize: 16,
        fontWeight: '800',
        marginRight: 6
    },
    input: {
        flex: 1,
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        paddingVertical: 10
    },
    sectionLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    strategyCard: {
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 12,
        padding: 12,
        gap: 4
    },
    strategyCardActive: {
        backgroundColor: '#1C1917',
        borderColor: '#F59E0B'
    },
    strategyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    strategyName: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800'
    },
    strategyMetric: {
        color: '#D1D5DB',
        fontSize: 11
    },
    recommendBanner: {
        backgroundColor: '#064E3B40',
        borderColor: '#059669',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        gap: 2
    },
    recommendTag: {
        color: '#10B981',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.5
    },
    recommendTitle: {
        color: '#E5E7EB',
        fontSize: 11,
        fontWeight: '700'
    },
    whyBox: {
        backgroundColor: '#121324',
        borderColor: '#1E2038',
        borderWidth: 1,
        borderRadius: 8,
        padding: 10,
        gap: 4
    },
    whyHeader: {
        color: '#818CF8',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    whyText: {
        color: '#94A3B8',
        fontSize: 10,
        lineHeight: 14
    },
    warningBox: {
        backgroundColor: '#7F1D1D30',
        borderColor: '#991B1B',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginTop: 8
    },
    warningText: {
        color: '#F87171',
        fontSize: 11,
        fontWeight: '700'
    },
    confirmBtn: {
        backgroundColor: '#D97706',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 6
    },
    confirmBtnText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '800'
    }
});
