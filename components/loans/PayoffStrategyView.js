/**
 * components/loans/PayoffStrategyView.js
 * 
 * Formal Bank Loans V1 — Debt Payoff Strategy View Component.
 * Implements interactive strategy switcher:
 * - Avalanche (Highest APR)
 * - Snowball (Smallest Balance)
 * - Cash-Flow Optimizer (Balanced Score)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { toRupeesFormatted, DEBT_PAYOFF_METHOD } from '../../services/loans/loanContracts.js';

export default function PayoffStrategyView({ strategies }) {
    const [selectedMethod, setSelectedMethod] = useState(DEBT_PAYOFF_METHOD.AVALANCHE);

    if (!strategies) return null;

    let activeList = [];
    let methodDescription = '';

    if (selectedMethod === DEBT_PAYOFF_METHOD.AVALANCHE) {
        activeList = strategies.avalanche || [];
        methodDescription = 'Target debts with the highest interest rates first. Mathematically minimizes total interest paid.';
    } else if (selectedMethod === DEBT_PAYOFF_METHOD.SNOWBALL) {
        activeList = strategies.snowball || [];
        methodDescription = 'Target debts with the smallest balances first. Eliminates facilities rapidly to build psychological momentum.';
    } else {
        activeList = strategies.cashFlowOptimizer || [];
        methodDescription = 'Balances immediate monthly cash flow relief, interest savings, and payoff speed with transparent scoring.';
    }

    return (
        <View style={styles.container}>
            <Text style={styles.sectionHeader}>DEBT PAYOFF ACCELERATOR</Text>

            {/* Strategy Segmented Switcher */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[styles.tabButton, selectedMethod === DEBT_PAYOFF_METHOD.AVALANCHE && styles.tabActive]}
                    onPress={() => setSelectedMethod(DEBT_PAYOFF_METHOD.AVALANCHE)}
                >
                    <Text style={[styles.tabText, selectedMethod === DEBT_PAYOFF_METHOD.AVALANCHE && styles.tabTextActive]}>
                        Avalanche
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, selectedMethod === DEBT_PAYOFF_METHOD.SNOWBALL && styles.tabActive]}
                    onPress={() => setSelectedMethod(DEBT_PAYOFF_METHOD.SNOWBALL)}
                >
                    <Text style={[styles.tabText, selectedMethod === DEBT_PAYOFF_METHOD.SNOWBALL && styles.tabTextActive]}>
                        Snowball
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.tabButton, selectedMethod === DEBT_PAYOFF_METHOD.CASH_FLOW_OPTIMIZER && styles.tabActive]}
                    onPress={() => setSelectedMethod(DEBT_PAYOFF_METHOD.CASH_FLOW_OPTIMIZER)}
                >
                    <Text style={[styles.tabText, selectedMethod === DEBT_PAYOFF_METHOD.CASH_FLOW_OPTIMIZER && styles.tabTextActive]}>
                        Optimizer
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Explanatory Banner */}
            <Text style={styles.methodDesc}>{methodDescription}</Text>

            {/* Ranked Facility List */}
            {activeList.map((item) => (
                <View key={item.facilityId} style={styles.rankCard}>
                    <View style={styles.cardHeader}>
                        <View style={styles.rankBadge}>
                            <Text style={styles.rankBadgeText}>#{item.priorityRank}</Text>
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={styles.facilityTitle}>{item.facilityName}</Text>
                            <Text style={styles.facilitySubtitle}>{item.lender} • {item.annualRatePercent}% p.a.</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.balanceText}>{toRupeesFormatted(item.outstandingPrincipalPaise)}</Text>
                            <Text style={styles.emiText}>{toRupeesFormatted(item.monthlyEmiPaise)}/mo</Text>
                        </View>
                    </View>

                    {/* Reasoning Footer */}
                    <View style={styles.reasonBox}>
                        <Text style={styles.reasonText}>💡 {item.reason}</Text>
                    </View>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        marginBottom: 24
    },
    sectionHeader: {
        color: '#6F799E',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 10
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#121422',
        borderRadius: 10,
        padding: 4,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1E2337'
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8
    },
    tabActive: {
        backgroundColor: '#6C5CE7'
    },
    tabText: {
        color: '#717B9E',
        fontSize: 12,
        fontWeight: '700'
    },
    tabTextActive: {
        color: '#FFFFFF'
    },
    methodDesc: {
        color: '#8A92B2',
        fontSize: 11,
        lineHeight: 16,
        marginBottom: 12
    },
    rankCard: {
        backgroundColor: '#121422',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1F243A'
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    rankBadge: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(108, 92, 231, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#6C5CE7'
    },
    rankBadgeText: {
        color: '#A29BFE',
        fontSize: 13,
        fontWeight: '800'
    },
    facilityTitle: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    facilitySubtitle: {
        color: '#717B9E',
        fontSize: 11,
        marginTop: 2
    },
    balanceText: {
        color: '#FF7675',
        fontSize: 14,
        fontWeight: '700'
    },
    emiText: {
        color: '#B0B8D9',
        fontSize: 11,
        marginTop: 2
    },
    reasonBox: {
        marginTop: 10,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#171A2B'
    },
    reasonText: {
        color: '#8A92B2',
        fontSize: 11,
        fontStyle: 'italic'
    }
});
