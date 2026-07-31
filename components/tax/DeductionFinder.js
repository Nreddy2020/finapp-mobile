import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Coins, CheckCircle } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function DeductionFinder() {
    const [deductionChecklist, setDeductionChecklist] = useState([
        { id: 1, label: '80C (LIC/PPF)', checked: true },
        { id: 2, label: '80D (Health Ins.)', checked: false },
        { id: 3, label: 'HRA Exemption', checked: true },
        { id: 4, label: 'NPS (Tier 1)', checked: false },
        { id: 5, label: 'Education Loan Int.', checked: false },
    ]);

    return (
        <LuxuryCard style={styles.section} index={2}>
            <View style={styles.header}>
                <View style={styles.iconContainer}>
                    <Coins size={16} color="#F97316" />
                </View>
                <View>
                    <Text style={styles.title}>Deduction Finder</Text>
                    <Text style={styles.subtitle}>Don't miss these common tax headers</Text>
                </View>
            </View>

            <View style={styles.listContainer}>
                {deductionChecklist.map((item) => (
                    <Pressable
                        key={item.id}
                        onPress={() => {
                            setDeductionChecklist(prev => prev.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i));
                        }}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: item.checked ? '#F97316' : '#27272A',
                                borderColor: item.checked ? '#F97316' : '#FFFFFF20'
                            }
                        ]}
                    >
                        {item.checked ? <CheckCircle size={12} color="#FFF" /> : <View style={styles.uncheckedCircle} />}
                        <Text style={[styles.chipText, { color: item.checked ? '#FFF' : '#A1A1AA' }]}>{item.label}</Text>
                    </Pressable>
                ))}
            </View>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { paddingHorizontal: 24, marginBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F9731620', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    listContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
        borderWidth: 1
    },
    uncheckedCircle: { width: 12, height: 12, borderRadius: 6, borderWidth: 1.5, borderColor: '#A1A1AA' },
    chipText: { fontSize: 12, fontWeight: '600' }
});
