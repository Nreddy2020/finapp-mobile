import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { TrendingUp, Activity, Lock, Unlock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LuxuryCard from '../ui/LuxuryCard';

export default function ScenarioControls({ isScenarioMode, setIsScenarioMode, inflationYear, setInflationYear }) {
    return (
        <View style={styles.container}>
            {/* Mode Toggle */}
            <LuxuryCard style={styles.card}>
                <View style={styles.row}>
                    <View style={styles.iconBox}>
                        {isScenarioMode ? (
                            <Activity size={20} color="#F59E0B" />
                        ) : (
                            <Lock size={20} color="#10B981" />
                        )}
                    </View>
                    <View style={styles.textColumn}>
                        <Text style={styles.label}>Budget Mode</Text>
                        <Text style={[styles.status, { color: isScenarioMode ? '#F59E0B' : '#10B981' }]}>
                            {isScenarioMode ? 'Scenario / What-If' : 'Actual / Locked'}
                        </Text>
                    </View>
                    <Switch
                        value={isScenarioMode}
                        onValueChange={setIsScenarioMode}
                        trackColor={{ false: '#18181B', true: '#F59E0B50' }}
                        thumbColor={isScenarioMode ? '#F59E0B' : '#71717A'}
                    />
                </View>
            </LuxuryCard>

            {/* Inflation Time Machine (Only visible in Scenario Mode) */}
            {isScenarioMode && (
                <LuxuryCard style={styles.inflationCard} delay={200}>
                    <View style={styles.headerRow}>
                        <TrendingUp size={16} color="#EC4899" />
                        <Text style={styles.inflationTitle}>Time Machine (Inflation @ 6%)</Text>
                    </View>
                    <View style={styles.sliderContainer}>
                        {[0, 5, 10, 20].map((year) => (
                            <TouchableOpacity
                                key={year}
                                style={[styles.yearBtn, inflationYear === year && styles.yearBtnActive]}
                                onPress={() => setInflationYear(year)}
                            >
                                <Text style={[styles.yearText, inflationYear === year && styles.yearTextActive]}>
                                    {year === 0 ? 'Now' : `+${year} Yrs`}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.inflationHint}>
                        Values adjusted for purchasing power in {new Date().getFullYear() + inflationYear}.
                    </Text>
                </LuxuryCard>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 16, marginBottom: 24 },
    card: { padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF05', justifyContent: 'center', alignItems: 'center' },
    textColumn: { flex: 1 },
    label: { color: '#A1A1AA', fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
    status: { fontSize: 16, fontWeight: '700' },

    inflationCard: { padding: 16, backgroundColor: '#EC489910', borderColor: '#EC489930' },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    inflationTitle: { color: '#EC4899', fontWeight: '700', fontSize: 14 },
    sliderContainer: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#00000030', padding: 4, borderRadius: 12, marginBottom: 8 },
    yearBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    yearBtnActive: { backgroundColor: '#EC4899', shadowColor: '#EC4899', shadowOpacity: 0.5, shadowRadius: 10 },
    yearText: { color: '#71717A', fontWeight: '600', fontSize: 13 },
    yearTextActive: { color: '#FFF', fontWeight: '700' },
    inflationHint: { color: '#EC489980', fontSize: 11, textAlign: 'center', fontStyle: 'italic' }
});
