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
import { View, Text } from 'react-native';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function PeriodStatementSection({ data }) {
    if (!data) return null;

    const netColor = data.isNetPositive ? MF_COLORS.successGreenLight : MF_COLORS.dangerRedLight;

    return (
        <View style={mfStyles.card}>
            <View style={mfStyles.sectionTitleRow}>
                <Text style={mfStyles.sectionTitle}>{data.periodLabel}</Text>
            </View>

            <View style={mfStyles.statementGrid}>
                {/* Income */}
                <View style={mfStyles.statementCol}>
                    <Text style={mfStyles.statementLabel}>Income</Text>
                    <Text style={mfStyles.statementIncome}>{data.totalIncomeFormatted}</Text>
                </View>

                {/* Expenses */}
                <View style={mfStyles.statementCol}>
                    <Text style={mfStyles.statementLabel}>Expenses</Text>
                    <Text style={mfStyles.statementExpense}>{data.totalExpensesFormatted}</Text>
                </View>

                {/* Transfers */}
                <View style={mfStyles.statementCol}>
                    <Text style={mfStyles.statementLabel}>Transfers</Text>
                    <Text style={mfStyles.statementTransfer}>{data.totalTransfersFormatted || '₹0'}</Text>
                </View>

                {/* Net Movement */}
                <View style={mfStyles.statementCol}>
                    <Text style={mfStyles.statementLabel}>Net Movement</Text>
                    <Text style={[mfStyles.statementNet, { color: netColor }]}>
                        {data.netMovementFormatted}
                    </Text>
                </View>
            </View>

            <View style={mfStyles.statementDivider} />

            <View style={mfStyles.savingsRateRow}>
                <View style={mfStyles.savingsRateBadge}>
                    <Text style={mfStyles.savingsRateText}>✓ {data.savingsRateSummary}</Text>
                </View>
            </View>
        </View>
    );
}
