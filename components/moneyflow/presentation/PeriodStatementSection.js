/**
 * PeriodStatementSection.js
 * 
 * CONTINUOUS CASH FLOW STATEMENT LAYER
 * 
 * Invariants:
 * - MONEYFLOW-VIEW-01: Every displayed financial value originates strictly from the ViewModel.
 * - MONEYFLOW-VIEW-02: Zero financial arithmetic inside JSX.
 * - MONEYFLOW-VIEW-04: Transfers remain neutral to income/expense/net-movement.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function PeriodStatementSection({ data }) {
    if (!data) return null;

    const netColor = data.isNetPositive ? MF_COLORS.successGreenLight : MF_COLORS.dangerRedLight;

    return (
        <View style={mfStyles.card}>
            <View style={mfStyles.sectionTitleRow}>
                <Text style={mfStyles.sectionTitle}>{data.periodLabel}</Text>
            </View>

            {/* Vertical Statement Layout */}
            <View style={styles.statementRowsContainer}>
                {/* Income */}
                <View style={styles.statementRow}>
                    <Text style={styles.statementRowLabel}>Income</Text>
                    <Text style={[styles.statementRowValue, { color: MF_COLORS.successGreenLight }]}>
                        {data.totalIncomeFormatted}
                    </Text>
                </View>

                {/* Expenses */}
                <View style={styles.statementRow}>
                    <Text style={styles.statementRowLabel}>Expenses</Text>
                    <Text style={styles.statementRowValue}>
                        {data.totalExpensesFormatted}
                    </Text>
                </View>

                {/* Transfers */}
                <View style={styles.statementRow}>
                    <Text style={styles.statementRowLabel}>Transfers</Text>
                    <Text style={[styles.statementRowValue, { color: MF_COLORS.textMuted }]}>
                        {data.totalTransfersFormatted || '₹0'}
                    </Text>
                </View>

                {/* Divider Line */}
                <View style={styles.dividerLine} />

                {/* Net Movement */}
                <View style={[styles.statementRow, { marginTop: 4 }]}>
                    <Text style={[styles.statementRowLabel, { fontWeight: '700', color: MF_COLORS.textPrimary }]}>
                        Net Movement
                    </Text>
                    <Text style={[styles.statementRowValue, { fontWeight: '800', color: netColor, fontSize: 16 }]}>
                        {data.netMovementFormatted}
                    </Text>
                </View>
            </View>

            {/* Savings Rate Badge */}
            <View style={styles.savingsRateRow}>
                <View style={mfStyles.savingsRateBadge}>
                    <Text style={mfStyles.savingsRateText}>✓ {data.savingsRateSummary}</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    statementRowsContainer: {
        paddingVertical: 4,
    },
    statementRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
    },
    statementRowLabel: {
        fontSize: 14,
        color: MF_COLORS.textSecondary,
        fontWeight: '500',
    },
    statementRowValue: {
        fontSize: 15,
        fontWeight: '700',
        color: MF_COLORS.textPrimary,
    },
    dividerLine: {
        height: 1,
        backgroundColor: MF_COLORS.borderSubtle,
        marginVertical: 8,
    },
    savingsRateRow: {
        marginTop: 10,
        alignItems: 'flex-start',
    },
});
