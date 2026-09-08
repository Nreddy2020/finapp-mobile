/**
 * components/reports/DebtReductionChart.js
 * 
 * Line trend component for debt reduction payoff matching Screen 7 of mockup.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function DebtReductionChart({ trend = [], trendAvailable = true }) {
    const hasData = trendAvailable && Array.isArray(trend) && trend.length > 0;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Debt Reduction Trend</Text>

            {!hasData ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyTitle}>Trend Data Unavailable</Text>
                    <Text style={styles.emptySubtitle}>
                        Historical debt reduction trend will appear once loan repayments and amortization milestones are recorded.
                    </Text>
                </View>
            ) : (
                <View style={styles.chartArea}>
                    {/* Y-axis markers */}
                    <View style={styles.yAxis}>
                        <Text style={styles.yAxisText}>₹60L</Text>
                        <Text style={styles.yAxisText}>₹40L</Text>
                        <Text style={styles.yAxisText}>₹20L</Text>
                        <Text style={styles.yAxisText}>₹0</Text>
                    </View>

                    <View style={styles.graphBody}>
                        {/* Trend Line Visual Simulation */}
                        <View style={styles.lineContainer}>
                            <View style={styles.slantedLine} />
                            {trend.map((pt, idx) => (
                                <View key={idx} style={[styles.dataDot, { left: `${idx * 30 + 5}%` }]} />
                            ))}
                        </View>

                        {/* X-axis labels */}
                        <View style={styles.xAxis}>
                            {trend.map((pt, idx) => (
                                <Text key={idx} style={styles.xAxisText}>{pt.label}</Text>
                            ))}
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 16
    },
    chartArea: {
        flexDirection: 'row',
        height: 120
    },
    yAxis: {
        width: 36,
        justifyContent: 'space-between',
        paddingRight: 6
    },
    yAxisText: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '600'
    },
    graphBody: {
        flex: 1,
        justifyContent: 'space-between'
    },
    lineContainer: {
        flex: 1,
        position: 'relative',
        justifyContent: 'center'
    },
    slantedLine: {
        position: 'absolute',
        left: 0,
        right: 10,
        top: 25,
        bottom: 25,
        borderBottomWidth: 2,
        borderBottomColor: '#3B82F6',
        transform: [{ rotate: '-8deg' }]
    },
    dataDot: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#60A5FA',
        borderWidth: 2,
        borderColor: '#FFFFFF'
    },
    xAxis: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingRight: 10,
        paddingTop: 6
    },
    xAxisText: {
        fontSize: 10,
        color: '#71717A',
        fontWeight: '600'
    },
    emptyContainer: {
        paddingVertical: 24,
        paddingHorizontal: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090B40',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#27272A',
        borderStyle: 'dashed'
    },
    emptyTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#A1A1AA',
        marginBottom: 6
    },
    emptySubtitle: {
        fontSize: 11,
        color: '#71717A',
        textAlign: 'center',
        lineHeight: 16
    }
});

