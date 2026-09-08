/**
 * components/reports/CashFlowBarChart.js
 * 
 * High-precision Income vs Expenses dual bar chart matching Screen 3 of mockup.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CashFlowBarChart({ data = [], isEmpty = false }) {
    const isActuallyEmpty = isEmpty || data.length === 0 || data.every(d => (Number(d.income) || 0) === 0 && (Number(d.expense) || 0) === 0);

    // Find max value to normalize bar heights
    let maxVal = 200000;
    data.forEach(d => {
        if (d.income > maxVal) maxVal = d.income;
        if (d.expense > maxVal) maxVal = d.expense;
    });

    const CHART_HEIGHT = 140;

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.title}>Income vs Expenses</Text>
                {!isActuallyEmpty && (
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>Income</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
                            <Text style={styles.legendText}>Expenses</Text>
                        </View>
                    </View>
                )}
            </View>

            {isActuallyEmpty ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>No Cash-Flow Activity</Text>
                    <Text style={styles.emptySubtitle}>No income or expense transactions recorded in this period.</Text>
                </View>
            ) : (
                <View style={styles.chartBody}>
                {/* Y-Axis Labels */}
                <View style={styles.yAxis}>
                    <Text style={styles.axisText}>₹2L</Text>
                    <Text style={styles.axisText}>₹1L</Text>
                    <Text style={styles.axisText}>₹0</Text>
                </View>

                {/* Bars Area */}
                <View style={styles.barsArea}>
                    {/* Horizontal Grid lines */}
                    <View style={[styles.gridLine, { top: 0 }]} />
                    <View style={[styles.gridLine, { top: CHART_HEIGHT / 2 }]} />
                    <View style={[styles.gridLine, { top: CHART_HEIGHT }]} />

                    <View style={styles.barsContainer}>
                        {data.map((item, index) => {
                            const incomeHeight = maxVal > 0 ? (item.income / maxVal) * CHART_HEIGHT : 0;
                            const expenseHeight = maxVal > 0 ? (item.expense / maxVal) * CHART_HEIGHT : 0;

                            return (
                                <View key={index} style={styles.barGroup}>
                                    <View style={styles.barsPair}>
                                        {item.income > 0 && (
                                            <View
                                                style={[
                                                    styles.bar,
                                                    styles.incomeBar,
                                                    { height: Math.max(incomeHeight, 4) }
                                                ]}
                                            />
                                        )}
                                        {item.expense > 0 && (
                                            <View
                                                style={[
                                                    styles.bar,
                                                    styles.expenseBar,
                                                    { height: Math.max(expenseHeight, 4) }
                                                ]}
                                            />
                                        )}
                                    </View>
                                    <Text style={styles.barLabel}>{item.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>
            </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    emptyContainer: {
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#E4E4E7',
        marginBottom: 4
    },
    emptySubtitle: {
        fontSize: 12,
        color: '#71717A',
        textAlign: 'center'
    },
    container: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    title: {
        fontSize: 15,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    legendRow: {
        flexDirection: 'row',
        gap: 12
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    legendText: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    chartBody: {
        flexDirection: 'row',
        height: 170
    },
    yAxis: {
        width: 32,
        height: 140,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingRight: 6
    },
    axisText: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '600'
    },
    barsArea: {
        flex: 1,
        position: 'relative'
    },
    gridLine: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: '#27272A80'
    },
    barsContainer: {
        height: 140,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end'
    },
    barGroup: {
        alignItems: 'center'
    },
    barsPair: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 3,
        height: 140
    },
    bar: {
        width: 10,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4
    },
    incomeBar: {
        backgroundColor: '#10B981'
    },
    expenseBar: {
        backgroundColor: '#EF4444'
    },
    barLabel: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '600',
        marginTop: 8
    }
});
