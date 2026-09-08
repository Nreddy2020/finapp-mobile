/**
 * components/loans/LoanAssumptionPanel.js
 * 
 * Formal Bank Loans V1 — Engine Assumptions & Governance Panel.
 * Discloses mathematical formulas, rounding policy, and regulatory disclaimers.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function LoanAssumptionPanel() {
    const [expanded, setExpanded] = useState(false);

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.header} onPress={() => setExpanded(!expanded)}>
                <Text style={styles.headerTitle}>📐 Mathematical Models & Assumptions</Text>
                <Text style={styles.expandIcon}>{expanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {expanded && (
                <View style={styles.body}>
                    <View style={styles.bulletItem}>
                        <Text style={styles.bulletTitle}>• Mode A Monthly Amortization:</Text>
                        <Text style={styles.bulletText}>
                            Calculated using standard monthly compounding reducing-balance formula E = P·r·(1+r)ⁿ / ((1+r)ⁿ - 1).
                        </Text>
                    </View>

                    <View style={styles.bulletItem}>
                        <Text style={styles.bulletTitle}>• Scaled Integer Precision (10⁸):</Text>
                        <Text style={styles.bulletText}>
                            All intermediate rate arithmetic operates with 8 decimal places of integer scaling; financial outputs are denominated strictly in BigInt paise.
                        </Text>
                    </View>

                    <View style={styles.bulletItem}>
                        <Text style={styles.bulletTitle}>• Final-Period Residual Absorption:</Text>
                        <Text style={styles.bulletText}>
                            To prevent accumulated rounding drift, the final scheduled installment absorbs any remainder so closing balance strictly equals ₹0.00.
                        </Text>
                    </View>

                    <View style={styles.bulletItem}>
                        <Text style={styles.bulletTitle}>• Lender Variance Notice:</Text>
                        <Text style={styles.bulletText}>
                            Bank statements may slightly differ if your lender uses daily accrual conventions (30/360 or Actual/365). Mode B day-count extensions are scheduled for V1.1.
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#10121F',
        borderRadius: 12,
        padding: 14,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#1C2033'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: {
        color: '#8A92B2',
        fontSize: 12,
        fontWeight: '700'
    },
    expandIcon: {
        color: '#8A92B2',
        fontSize: 11
    },
    body: {
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#171A2B'
    },
    bulletItem: {
        marginBottom: 8
    },
    bulletTitle: {
        color: '#A29BFE',
        fontSize: 11,
        fontWeight: '700',
        marginBottom: 2
    },
    bulletText: {
        color: '#717B9E',
        fontSize: 11,
        lineHeight: 16
    }
});
