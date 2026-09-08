/**
 * components/reports/BudgetRadialGauge.js
 * 
 * Circular gauge and summary for Budget Performance matching Screen 5 of mockup.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BudgetRadialGauge({
    utilizationPercent = 78,
    spentFormatted = '₹1,48,500',
    totalBudgetFormatted = '₹1,90,000',
    remainingFormatted = '₹41,500'
}) {
    const isOver = utilizationPercent > 100;
    const ringColor = isOver ? '#EF4444' : (utilizationPercent > 85 ? '#F59E0B' : '#10B981');

    return (
        <View style={styles.container}>
            {/* Circular Badge */}
            <View style={[styles.circleOuter, { borderColor: ringColor }]}>
                <View style={styles.circleInner}>
                    <Text style={[styles.percentValue, { color: ringColor }]}>{utilizationPercent}%</Text>
                    <Text style={styles.percentLabel}>Budget Utilized</Text>
                </View>
            </View>

            {/* Metrics Info */}
            <View style={styles.infoArea}>
                <View style={styles.infoRow}>
                    <Text style={styles.spentAmount}>{spentFormatted}</Text>
                    <Text style={styles.totalBudget}>of {totalBudgetFormatted}</Text>
                </View>

                <View style={styles.remainingBadge}>
                    <Text style={styles.remainingValue}>{remainingFormatted}</Text>
                    <Text style={styles.remainingLabel}>Remaining</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#27272A',
        gap: 20
    },
    circleOuter: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#09090B'
    },
    circleInner: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    percentValue: {
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    percentLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#71717A',
        textTransform: 'uppercase',
        marginTop: 2
    },
    infoArea: {
        flex: 1,
        justifyContent: 'center'
    },
    infoRow: {
        marginBottom: 8
    },
    spentAmount: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    totalBudget: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '600'
    },
    remainingBadge: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 6
    },
    remainingValue: {
        fontSize: 15,
        fontWeight: '800',
        color: '#10B981'
    },
    remainingLabel: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600'
    }
});
