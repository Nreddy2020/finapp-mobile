/**
 * components/loans/LoanSummary.js
 * 
 * Formal Bank Loans V1 — Debt Portfolio Summary Component.
 * Aggregates total debt, monthly EMI burden, and blended APR.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function LoanSummary({ summary }) {
    if (!summary) return null;

    return (
        <View style={styles.container}>
            {/* Top Stat: Total Outstanding Debt */}
            <View style={styles.mainBox}>
                <Text style={styles.label}>TOTAL OUTSTANDING DEBT</Text>
                <Text style={styles.heroAmount}>{summary.totalOutstandingFormatted || '₹0.00'}</Text>
                <Text style={styles.subtext}>
                    Across {summary.activeCount || 0} active bank {summary.activeCount === 1 ? 'facility' : 'facilities'}
                </Text>
            </View>

            {/* Split Metrics: Monthly EMI & Blended APR */}
            <View style={styles.gridRow}>
                <View style={styles.metricCard}>
                    <Text style={styles.gridLabel}>MONTHLY EMI BURDEN</Text>
                    <Text style={styles.gridValue}>{summary.totalMonthlyEmiFormatted || '₹0.00'}</Text>
                    <Text style={styles.gridNote}>Total commitment</Text>
                </View>

                <View style={styles.metricCard}>
                    <Text style={styles.gridLabel}>BLENDED APR</Text>
                    <Text style={[styles.gridValue, styles.aprValue]}>
                        {summary.blendedAnnualRatePercent || 0}% p.a.
                    </Text>
                    <Text style={styles.gridNote}>Weighted interest</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 16
    },
    mainBox: {
        backgroundColor: 'rgba(235, 87, 87, 0.08)',
        borderColor: 'rgba(235, 87, 87, 0.25)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 18,
        alignItems: 'center',
        marginBottom: 10
    },
    label: {
        color: '#FF7675',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
        marginBottom: 6
    },
    heroAmount: {
        color: '#FFFFFF',
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    subtext: {
        color: '#9E9E9E',
        fontSize: 12,
        marginTop: 4
    },
    gridRow: {
        flexDirection: 'row',
        gap: 10
    },
    metricCard: {
        flex: 1,
        backgroundColor: '#121422',
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: '#1E2337'
    },
    gridLabel: {
        color: '#717B9E',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        marginBottom: 6
    },
    gridValue: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    aprValue: {
        color: '#FDCB6E'
    },
    gridNote: {
        color: '#555C75',
        fontSize: 10,
        marginTop: 4
    }
});
