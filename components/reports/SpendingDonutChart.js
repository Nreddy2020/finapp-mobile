/**
 * components/reports/SpendingDonutChart.js
 * 
 * Donut chart visualization for spending analysis matching Screen 4 of mockup.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SpendingDonutChart({ totalFormatted = '₹0', categories = [], isEmpty = false }) {
    const isActuallyEmpty = isEmpty || categories.length === 0;

    return (
        <View style={styles.container}>
            {/* Visual Ring Simulator */}
            <View style={[styles.donutWrapper, isActuallyEmpty && styles.donutWrapperEmpty]}>
                <View style={[styles.donutRing, isActuallyEmpty && styles.donutRingEmpty]}>
                    <View style={styles.centerHole}>
                        <Text style={styles.totalValue}>{totalFormatted}</Text>
                        <Text style={styles.totalLabel}>
                            {isActuallyEmpty ? 'No Spending' : 'Total Spending'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Category Segment Bar below the donut ring */}
            <View style={styles.segmentBar}>
                {isActuallyEmpty ? (
                    <View style={[styles.segmentSlice, { flex: 1, backgroundColor: '#27272A' }]} />
                ) : (
                    categories.map((cat, idx) => (
                        <View
                            key={idx}
                            style={[
                                styles.segmentSlice,
                                {
                                    flex: Math.max(cat.percentage, 4),
                                    backgroundColor: cat.color || '#71717A'
                                }
                            ]}
                        />
                    ))
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: 20
    },
    donutWrapper: {
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: '#27272A50',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 6,
        borderColor: '#3B82F6',
        borderTopColor: '#F97316',
        borderRightColor: '#06B6D4',
        borderBottomColor: '#10B981',
        marginBottom: 20
    },
    donutWrapperEmpty: {
        borderColor: '#27272A',
        borderTopColor: '#27272A',
        borderRightColor: '#27272A',
        borderBottomColor: '#27272A'
    },
    donutRing: {
        width: 156,
        height: 156,
        borderRadius: 78,
        backgroundColor: '#09090B',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#EC489950',
        borderLeftColor: '#8B5CF6'
    },
    donutRingEmpty: {
        borderColor: '#18181B',
        borderLeftColor: '#18181B'
    },
    centerHole: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    totalValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    totalLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#A1A1AA',
        marginTop: 2
    },
    segmentBar: {
        flexDirection: 'row',
        height: 8,
        width: '100%',
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: '#27272A'
    },
    segmentSlice: {
        height: '100%'
    }
});
