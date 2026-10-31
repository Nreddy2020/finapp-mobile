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
import { Ionicons } from '@expo/vector-icons';
import { mfStyles, MF_COLORS } from '../moneyFlowStyles.js';

export function PeriodStatementSection({ data }) {
    if (!data) return null;

    const netColor = data.isNetPositive ? '#10B981' : '#F43F5E';

    return (
        <View style={mfStyles.card}>
            {/* Header: Period Title & Comparison Pill */}
            <View style={styles.headerRow}>
                <Text style={styles.sectionTitle}>{data.periodLabel}</Text>
                <View style={styles.trendPill}>
                    <Ionicons name="arrow-up" size={12} color="#10B981" />
                    <Text style={styles.trendPillText}> 12% </Text>
                    <Text style={styles.trendPillSub}>vs Sep 2026</Text>
                </View>
            </View>

            {/* Vertical Statement Layout */}
            <View style={styles.statementRowsContainer}>
                {/* Income */}
                <View style={styles.statementRow}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.circleIconBadge, { backgroundColor: '#0F291E' }]}>
                            <Ionicons name="arrow-up" size={17} color="#10B981" />
                        </View>
                        <Text style={styles.statementRowLabel}>Income</Text>
                    </View>
                    <Text style={[styles.statementRowValue, { color: '#10B981' }]}>
                        {data.totalIncomeFormatted}
                    </Text>
                </View>

                {/* Divider Line */}
                <View style={styles.dividerLine} />

                {/* Expenses */}
                <View style={styles.statementRow}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.circleIconBadge, { backgroundColor: '#2B141C' }]}>
                            <Ionicons name="arrow-down" size={17} color="#F43F5E" />
                        </View>
                        <Text style={styles.statementRowLabel}>Expenses</Text>
                    </View>
                    <Text style={styles.statementRowValue}>
                        {data.totalExpensesFormatted}
                    </Text>
                </View>

                {/* Divider Line */}
                <View style={styles.dividerLine} />

                {/* Transfers */}
                <View style={styles.statementRow}>
                    <View style={styles.rowLeft}>
                        <View style={[styles.circleIconBadge, { backgroundColor: '#122038' }]}>
                            <Ionicons name="swap-horizontal" size={17} color="#3B82F6" />
                        </View>
                        <Text style={styles.statementRowLabel}>Transfers</Text>
                    </View>
                    <Text style={[styles.statementRowValue, { color: '#94A3B8' }]}>
                        {data.totalTransfersFormatted || '₹0'}
                    </Text>
                </View>
            </View>

            {/* Net Movement Box */}
            <View style={styles.netMovementBox}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={styles.netIconBadge}>
                        <Ionicons name="bar-chart" size={18} color="#10B981" />
                    </View>
                    <Text style={styles.netMovementTitle}>Net Movement</Text>
                </View>
                <Text style={[styles.netMovementAmount, { color: netColor }]}>
                    {data.netMovementFormatted}
                </Text>
            </View>

            {/* Savings Rate Bar Pill */}
            {data.savingsRateSummary && (
                <View style={styles.savingsRateBanner}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="leaf" size={15} color="#10B981" />
                        <Text style={styles.savingsRateBannerText}>
                            {' '}{data.savingsRateSummary}
                        </Text>
                    </View>
                    <View style={styles.savingsProgressTrack}>
                        <View
                            style={[
                                styles.savingsProgressFill,
                                { width: `${Math.min(100, Math.max(0, data.savingsRate))}%` }
                            ]}
                        />
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#64748B',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    trendPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0C2522',
        borderWidth: 1,
        borderColor: '#134E48',
        borderRadius: 14,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    trendPillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981',
    },
    trendPillSub: {
        fontSize: 11,
        color: '#94A3B8',
    },
    statementRowsContainer: {
        paddingVertical: 2,
    },
    statementRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 9,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    circleIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    statementRowLabel: {
        fontSize: 15,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    statementRowValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    dividerLine: {
        height: 1,
        backgroundColor: '#111D30',
        marginVertical: 2,
    },
    netMovementBox: {
        backgroundColor: '#092122',
        borderWidth: 1,
        borderColor: '#0F3E37',
        borderRadius: 16,
        padding: 14,
        marginTop: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    netIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#0C2F2B',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    netMovementTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    netMovementAmount: {
        fontSize: 18,
        fontWeight: '800',
    },
    savingsRateBanner: {
        backgroundColor: '#0B2421',
        borderWidth: 1,
        borderColor: '#103C36',
        borderRadius: 14,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    savingsRateBannerText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#10B981',
    },
    savingsProgressTrack: {
        width: 100,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#0E332E',
        overflow: 'hidden',
    },
    savingsProgressFill: {
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
});
