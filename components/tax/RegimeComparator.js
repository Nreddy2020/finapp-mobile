import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Scale, Sparkles } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function RegimeComparator() {
    const [regime, setRegime] = useState('new'); // 'new' | 'old'
    const [income, setIncome] = useState(1500000); // Mock Income 15L
    const [deductionsInput, setDeductionsInput] = useState(150000); // Mock 80C

    return (
        <LuxuryCard style={styles.section} index={0}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Scale size={16} color="#F97316" />
                </View>
                <View>
                    <Text style={styles.title}>Regime Comparator</Text>
                    <Text style={styles.subtitle}>Compare Old vs New Tax Regime</Text>
                </View>
            </View>

            <View style={styles.toggleContainer}>
                <Pressable
                    onPress={() => setRegime('old')}
                    style={[styles.toggleBtn, { backgroundColor: regime === 'old' ? '#F97316' : 'transparent' }]}
                >
                    <Text style={[styles.toggleText, { color: regime === 'old' ? '#FFF' : '#A1A1AA' }]}>OLD REGIME</Text>
                </Pressable>
                <Pressable
                    onPress={() => setRegime('new')}
                    style={[styles.toggleBtn, { backgroundColor: regime === 'new' ? '#F97316' : 'transparent' }]}
                >
                    <Text style={[styles.toggleText, { color: regime === 'new' ? '#FFF' : '#A1A1AA' }]}>NEW REGIME</Text>
                </Pressable>
            </View>

            <View style={styles.statsContainer}>
                <View>
                    <Text style={styles.label}>Gross Income</Text>
                    <Text style={styles.value}>₹{(income / 100000).toFixed(1)}L</Text>
                </View>
                <View>
                    <Text style={styles.label}>Deductions</Text>
                    <Text style={styles.value}>₹{(deductionsInput / 1000).toFixed(0)}k</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.label}>Tax Liability</Text>
                    <Text style={[styles.liabilityValue, { color: regime === 'new' ? '#10B981' : '#F97316' }]}>
                        {regime === 'new' ? '₹1.45L' : '₹1.58L'}
                    </Text>
                </View>
            </View>

            {regime === 'new' && (
                <View style={styles.savingsAlert}>
                    <Sparkles size={16} color="#10B981" />
                    <Text style={styles.savingsText}>
                        You save ₹13,000 with the NEW Regime!
                    </Text>
                </View>
            )}
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 24, marginBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9731620', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    toggleContainer: { flexDirection: 'row', backgroundColor: '#27272A', borderRadius: 12, padding: 4, marginBottom: 16 },
    toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    toggleText: { fontWeight: '700', fontSize: 12 },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    label: { color: '#A1A1AA', fontSize: 12 },
    value: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    liabilityValue: { fontSize: 18, fontWeight: '900' },
    savingsAlert: { backgroundColor: '#10B98115', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#10B98130' },
    savingsText: { color: '#10B981', fontWeight: '700', fontSize: 12 }
});
