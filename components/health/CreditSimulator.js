import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function CreditSimulator() {
    const [simulatedPayoff, setSimulatedPayoff] = useState(0);

    return (
        <LuxuryCard style={styles.section}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
                    <TrendingUp size={16} color="#3B82F6" />
                </View>
                <View>
                    <Text style={styles.title}>Credit Simulator</Text>
                    <Text style={styles.subtitle}>See how paying debt boosts your score</Text>
                </View>
            </View>

            <View style={styles.scoreContainer}>
                <View>
                    <Text style={styles.label}>Current Score</Text>
                    <Text style={styles.scoreValue}>750</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>Projected</Text>
                    <View style={styles.projectedValueContainer}>
                        <Text style={styles.projectedValue}>{750 + (simulatedPayoff > 0 ? 35 : 0)}</Text>
                        {simulatedPayoff > 0 && <Text style={styles.boostValue}>(+35)</Text>}
                    </View>
                </View>
            </View>

            <Text style={styles.payoffLabel}>Pay Off Amount: <Text style={{ color: '#FFF' }}>₹{simulatedPayoff.toLocaleString()}</Text></Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.payoffOptions}>
                {[0, 10000, 50000, 100000].map(val => (
                    <Pressable
                        key={val}
                        onPress={() => setSimulatedPayoff(val)}
                        style={[
                            styles.optionButton,
                            {
                                backgroundColor: simulatedPayoff === val ? '#3B82F6' : '#27272A',
                                borderColor: simulatedPayoff === val ? '#3B82F6' : '#FFFFFF10'
                            }
                        ]}
                    >
                        <Text style={[styles.optionText, { color: simulatedPayoff === val ? '#FFF' : '#A1A1AA' }]}>
                            {val === 0 ? 'None' : `₹${val / 1000}k`}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
            {simulatedPayoff > 0 && (
                <View style={styles.insightBox}>
                    <Text style={styles.insightText}>
                        🚀 Paying ₹{simulatedPayoff.toLocaleString()} could boost your score to <Text style={{ fontWeight: '800' }}>785</Text> within 45 days.
                    </Text>
                </View>
            )}
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    scoreContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    label: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    scoreValue: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    projectedValueContainer: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    projectedValue: { color: '#3B82F6', fontSize: 24, fontWeight: '900' },
    boostValue: { color: '#10B981', fontWeight: '700' },
    payoffLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 8 },
    payoffOptions: { gap: 8, marginBottom: 16 },
    optionButton: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1
    },
    optionText: { fontSize: 12, fontWeight: '700' },
    insightBox: { backgroundColor: '#3B82F615', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#3B82F630' },
    insightText: { color: '#3B82F6', fontSize: 12, lineHeight: 18 }
});
