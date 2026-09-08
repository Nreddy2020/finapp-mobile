/**
 * components/loans/PrepaymentSimulator.js
 * 
 * Formal Bank Loans V1 — Prepayment & Foreclosure Simulator Modal Component.
 * Allows user to test lump-sum prepayments and compares:
 * 1. Status Quo
 * 2. Tenure Reduction (Maximizes total interest saved)
 * 3. EMI Reduction (Maximizes immediate monthly cash flow)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { toRupeesFormatted, toPaise } from '../../services/loans/loanContracts.js';
import { simulatePrepayment } from '../../services/loans/loanPrepaymentSimulator.js';

export default function PrepaymentSimulator({ visible, facility, onClose }) {
    if (!visible || !facility) return null;

    const outstandingPaise = BigInt(facility.outstandingPrincipalPaise !== undefined ? facility.outstandingPrincipalPaise : facility.principalPaise);

    const [prepaymentInput, setPrepaymentInput] = useState('100000'); // Default ₹1 Lakh
    const [selectedQuickPreset, setSelectedQuickPreset] = useState(100000);

    // Run simulation
    let simResult = null;
    let errorMessage = null;

    try {
        const prepayAmountPaise = toPaise(Number(prepaymentInput || 0));
        if (prepayAmountPaise > 0n && prepayAmountPaise <= outstandingPaise) {
            simResult = simulatePrepayment(facility, {
                prepaymentPaise: prepayAmountPaise
            });
        }
    } catch (e) {
        errorMessage = e.message;
    }

    const applyQuickAmount = (amount) => {
        setSelectedQuickPreset(amount);
        setPrepaymentInput(String(amount));
    };

    const applyForeclosure = () => {
        const fullRupees = Number(outstandingPaise) / 100;
        setSelectedQuickPreset('FULL');
        setPrepaymentInput(String(fullRupees));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Prepayment & Foreclosure Simulator</Text>
                            <Text style={styles.subtitle}>{facility.name} • Balance: {toRupeesFormatted(outstandingPaise)}</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollArea}>
                        {/* Prepayment Input */}
                        <View style={styles.inputSection}>
                            <Text style={styles.inputLabel}>LUMP-SUM PREPAYMENT AMOUNT (₹)</Text>
                            <TextInput
                                style={styles.textInput}
                                keyboardType="numeric"
                                value={prepaymentInput}
                                onChangeText={(text) => {
                                    setPrepaymentInput(text);
                                    setSelectedQuickPreset(null);
                                }}
                                placeholder="e.g. 100000"
                                placeholderTextColor="#555C75"
                            />

                            {/* Quick Presets */}
                            <View style={styles.presetRow}>
                                {[25000, 50000, 100000, 200000].map((amt) => (
                                    <TouchableOpacity
                                        key={amt}
                                        style={[styles.presetChip, selectedQuickPreset === amt && styles.presetChipActive]}
                                        onPress={() => applyQuickAmount(amt)}
                                    >
                                        <Text style={[styles.presetText, selectedQuickPreset === amt && styles.presetTextActive]}>
                                            ₹{amt / 1000}k
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    style={[styles.presetChip, selectedQuickPreset === 'FULL' && styles.presetChipActive]}
                                    onPress={applyForeclosure}
                                >
                                    <Text style={[styles.presetText, selectedQuickPreset === 'FULL' && styles.presetTextActive]}>
                                        Full Close
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {errorMessage && (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>{errorMessage}</Text>
                            </View>
                        )}

                        {simResult && (
                            <View style={styles.comparisonContainer}>
                                <Text style={styles.comparisonHeader}>COMPARATIVE IMPACT ANALYSIS</Text>

                                {/* Option 1: Tenure Reduction Card */}
                                <View style={[styles.optionCard, styles.recommendedCard]}>
                                    <View style={styles.badgeRow}>
                                        <Text style={styles.optionTitle}>Option A: Tenure Reduction</Text>
                                        <View style={styles.recBadge}>
                                            <Text style={styles.recBadgeText}>MAX INTEREST SAVED</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.optionDesc}>Keep monthly EMI unchanged; close loan earlier.</Text>

                                    <View style={styles.statsGrid}>
                                        <View style={styles.statCol}>
                                            <Text style={styles.statLabel}>MONTHS SAVED</Text>
                                            <Text style={[styles.statValue, styles.highlightGreen]}>
                                                {simResult.tenureReduction.monthsSaved} Months
                                            </Text>
                                        </View>
                                        <View style={styles.statCol}>
                                            <Text style={styles.statLabel}>NET COST BENEFIT</Text>
                                            <Text style={[styles.statValue, styles.highlightGreen]}>
                                                {toRupeesFormatted(simResult.tenureReduction.netCostReductionPaise)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.maturityNote}>
                                        Revised Payoff: {simResult.tenureReduction.revisedMaturityDate}
                                    </Text>
                                </View>

                                {/* Option 2: EMI Reduction Card */}
                                <View style={styles.optionCard}>
                                    <View style={styles.badgeRow}>
                                        <Text style={styles.optionTitle}>Option B: EMI Reduction</Text>
                                        <View style={styles.cashBadge}>
                                            <Text style={styles.cashBadgeText}>MONTHLY RELIEF</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.optionDesc}>Keep tenure unchanged; lower monthly obligation.</Text>

                                    <View style={styles.statsGrid}>
                                        <View style={styles.statCol}>
                                            <Text style={styles.statLabel}>MONTHLY EMI RELIEF</Text>
                                            <Text style={[styles.statValue, styles.highlightPurple]}>
                                                {toRupeesFormatted(simResult.emiReduction.monthlyEmiReliefPaise || 0n)}/mo
                                            </Text>
                                        </View>
                                        <View style={styles.statCol}>
                                            <Text style={styles.statLabel}>REVISED EMI</Text>
                                            <Text style={styles.statValue}>
                                                {toRupeesFormatted(simResult.emiReduction.revisedEmiPaise || 0n)}
                                            </Text>
                                        </View>
                                    </View>

                                    <Text style={styles.maturityNote}>
                                        Net Interest Saved: {toRupeesFormatted(simResult.emiReduction.grossInterestSavedPaise || 0n)}
                                    </Text>
                                </View>
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer */}
                    <View style={styles.footer}>
                        <Text style={styles.disclaimerText}>
                            Simulation is read-only and does not mutate your loan record.
                        </Text>
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
        height: '80%',
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
    subtitle: {
        color: '#8A92B2',
        fontSize: 12,
        marginTop: 2
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
    inputSection: {
        backgroundColor: '#121422',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F243A'
    },
    inputLabel: {
        color: '#717B9E',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: 0.5
    },
    textInput: {
        backgroundColor: '#0A0C16',
        borderRadius: 10,
        padding: 12,
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#242A42'
    },
    presetRow: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap'
    },
    presetChip: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: '#1A1E30'
    },
    presetChipActive: {
        backgroundColor: '#6C5CE7'
    },
    presetText: {
        color: '#8A92B2',
        fontSize: 12,
        fontWeight: '600'
    },
    presetTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    comparisonContainer: {
        marginBottom: 20
    },
    comparisonHeader: {
        color: '#6F799E',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 10
    },
    optionCard: {
        backgroundColor: '#121422',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1F243A'
    },
    recommendedCard: {
        borderColor: 'rgba(52, 199, 89, 0.4)',
        backgroundColor: 'rgba(52, 199, 89, 0.05)'
    },
    badgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    optionTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    recBadge: {
        backgroundColor: 'rgba(52, 199, 89, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4
    },
    recBadgeText: {
        color: '#34C759',
        fontSize: 9,
        fontWeight: '800'
    },
    cashBadge: {
        backgroundColor: 'rgba(108, 92, 231, 0.2)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4
    },
    cashBadgeText: {
        color: '#A29BFE',
        fontSize: 9,
        fontWeight: '800'
    },
    optionDesc: {
        color: '#8A92B2',
        fontSize: 11,
        marginBottom: 12
    },
    statsGrid: {
        flexDirection: 'row',
        backgroundColor: '#0A0C16',
        borderRadius: 8,
        padding: 10,
        marginBottom: 8
    },
    statCol: {
        flex: 1
    },
    statLabel: {
        color: '#555C75',
        fontSize: 10,
        fontWeight: '600'
    },
    statValue: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
        marginTop: 2
    },
    highlightGreen: {
        color: '#34C759'
    },
    highlightPurple: {
        color: '#A29BFE'
    },
    maturityNote: {
        color: '#717B9E',
        fontSize: 11
    },
    errorBox: {
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16
    },
    errorText: {
        color: '#FF6B6B',
        fontSize: 12
    },
    footer: {
        padding: 14,
        borderTopWidth: 1,
        borderTopColor: '#171A2B',
        alignItems: 'center'
    },
    disclaimerText: {
        color: '#555C75',
        fontSize: 11
    }
});
