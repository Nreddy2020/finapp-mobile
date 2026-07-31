import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingDown, Car } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function DepreciationCard() {
    // Mock Data for a vehicle
    const vehicle = {
        name: 'Tesla Model 3',
        purchasePrice: 4500000,
        purchaseYear: 2023,
        currentValue: 3800000,
        depreciationRate: 15 // % per year
    };

    const loss = vehicle.purchasePrice - vehicle.currentValue;
    const lossPercentage = (loss / vehicle.purchasePrice) * 100;

    return (
        <LuxuryCard style={styles.section} index={0}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: '#EF444420' }]}>
                    <TrendingDown size={16} color="#EF4444" />
                </View>
                <View>
                    <Text style={styles.title}>Asset Depreciation</Text>
                    <Text style={styles.subtitle}>Real-time value tracking</Text>
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.assetInfo}>
                    <View style={styles.assetIcon}>
                        <Car size={20} color="#FFF" />
                    </View>
                    <View>
                        <Text style={styles.assetName}>{vehicle.name}</Text>
                        <Text style={styles.assetYear}>{vehicle.purchaseYear} Model</Text>
                    </View>
                </View>

                <View style={styles.valueRow}>
                    <View>
                        <Text style={styles.label}>Purchase Price</Text>
                        <Text style={styles.value}>₹{(vehicle.purchasePrice / 100000).toFixed(1)}L</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.label}>Current Value</Text>
                        <Text style={styles.currentValue}>₹{(vehicle.currentValue / 100000).toFixed(1)}L</Text>
                    </View>
                </View>

                {/* Visual Bar */}
                <View style={styles.barContainer}>
                    <View style={[styles.barFill, { width: `${100 - lossPercentage}%` }]} />
                </View>
                <View style={styles.barLabels}>
                    <Text style={styles.lossText}>-{lossPercentage.toFixed(1)}% Depreciation</Text>
                    <Text style={styles.lossValue}>-₹{(loss / 100000).toFixed(1)}L Value Lost</Text>
                </View>
            </View>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24, paddingHorizontal: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    content: { backgroundColor: '#27272A', borderRadius: 16, padding: 16 },
    assetInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    assetIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' },
    assetName: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    assetYear: { color: '#A1A1AA', fontSize: 12 },
    valueRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    label: { color: '#A1A1AA', fontSize: 11, marginBottom: 4 },
    value: { color: '#A1A1AA', fontSize: 14, fontWeight: '600', textDecorationLine: 'line-through' },
    currentValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    barContainer: { height: 6, backgroundColor: '#3F3F46', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
    barFill: { height: '100%', backgroundColor: '#10B981', borderRadius: 3 },
    barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
    lossText: { color: '#EF4444', fontSize: 11, fontWeight: '700' },
    lossValue: { color: '#EF4444', fontSize: 11 }
});
