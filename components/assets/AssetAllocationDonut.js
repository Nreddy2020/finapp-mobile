/**
 * components/assets/AssetAllocationDonut.js
 * 
 * FinLife Assets Module — Asset Allocation Donut / Circle Chart with Legend.
 * Matching Screen 1 in mockup media_1788794817378.jpg.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AssetAllocationDonut({ donut }) {
    if (!donut) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Asset Allocation</Text>

            <View style={styles.contentRow}>
                {/* Donut Simulation with Center Text */}
                <View style={styles.donutWrapper}>
                    <View style={styles.outerRing}>
                        <View style={styles.innerRing}>
                            <Text style={styles.centerAmount}>{donut.centerAmount}</Text>
                            <Text style={styles.centerSubtext}>{donut.centerSubtext}</Text>
                        </View>
                    </View>
                </View>

                {/* Legend Column */}
                <View style={styles.legendContainer}>
                    {donut.segments.map((seg) => (
                        <View key={seg.category} style={styles.legendRow}>
                            <View style={[styles.colorDot, { backgroundColor: seg.color }]} />
                            <Text style={styles.legendLabel} numberOfLines={1}>{seg.label}</Text>
                            <Text style={styles.legendPct}>{seg.percentage}%</Text>
                        </View>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#111827',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F9FAFB',
        marginBottom: 16
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    donutWrapper: {
        width: 140,
        height: 140,
        justifyContent: 'center',
        alignItems: 'center'
    },
    outerRing: {
        width: 130,
        height: 130,
        borderRadius: 65,
        borderWidth: 10,
        borderColor: '#3B82F6',
        borderTopColor: '#F59E0B',
        borderRightColor: '#06B6D4',
        borderBottomColor: '#8B5CF6',
        justifyContent: 'center',
        alignItems: 'center'
    },
    innerRing: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#111827',
        justifyContent: 'center',
        alignItems: 'center'
    },
    centerAmount: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    centerSubtext: {
        color: '#9CA3AF',
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2
    },
    legendContainer: {
        flex: 1,
        gap: 6
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    colorDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6
    },
    legendLabel: {
        flex: 1,
        color: '#D1D5DB',
        fontSize: 11,
        fontWeight: '500'
    },
    legendPct: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '700',
        marginLeft: 4
    }
});
