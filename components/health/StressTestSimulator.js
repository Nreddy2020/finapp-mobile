import React from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { AlertOctagon, Activity, Briefcase } from 'lucide-react-native';

export default function StressTestSimulator({ scenarios, onToggleScenario }) {

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <AlertOctagon size={18} color="#EF4444" />
                <Text style={styles.title}>Stress Test / War Gaming</Text>
            </View>
            <Text style={styles.subtitle}>Simulate worst-case scenarios to test your resilience.</Text>

            <View style={styles.list}>
                {/* Scenario 1: Job Loss */}
                <LuxuryCard style={styles.scenarioCard} index={0}>
                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Briefcase size={20} color="#F59E0B" />
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>Income Shock (Job Loss)</Text>
                            <Text style={styles.desc}>Sets Active Income to 0 immediately.</Text>
                        </View>
                        <Switch
                            value={scenarios.jobLoss}
                            onValueChange={() => onToggleScenario('jobLoss')}
                            trackColor={{ false: '#27272A', true: '#EF4444' }}
                            thumbColor="#FFF"
                        />
                    </View>
                </LuxuryCard>

                {/* Scenario 2: Medical Emergency */}
                <LuxuryCard style={styles.scenarioCard} index={1}>
                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Activity size={20} color="#EF4444" />
                        </View>
                        <View style={styles.info}>
                            <Text style={styles.name}>Medical Emergency</Text>
                            <Text style={styles.desc}>Deducts ₹5L from Liquid Assets.</Text>
                        </View>
                        <Switch
                            value={scenarios.medicalEmergency}
                            onValueChange={() => onToggleScenario('medicalEmergency')}
                            trackColor={{ false: '#27272A', true: '#EF4444' }}
                            thumbColor="#FFF"
                        />
                    </View>
                </LuxuryCard>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 24, paddingHorizontal: 20 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    title: { color: '#EF4444', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    subtitle: { color: '#71717A', fontSize: 13, marginBottom: 16 },
    list: { gap: 12 },
    scenarioCard: { padding: 16, backgroundColor: '#18181B' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center' },
    info: { flex: 1 },
    name: { color: '#FFF', fontSize: 15, fontWeight: '600', marginBottom: 2 },
    desc: { color: '#71717A', fontSize: 12 }
});
