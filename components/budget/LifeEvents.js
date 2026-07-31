import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { Check, Plus } from 'lucide-react-native';

const EVENTS_DATA = {
    marriage: {
        monthlyImpact: 15000,
        oneTimeCost: 500000,
        category: 'Personal',
        name: 'Marriage Planning',
        desc: 'Sip for Wedding + Post-marriage costs'
    },
    birthday: {
        monthlyImpact: 2000,
        oneTimeCost: 20000,
        category: 'Personal',
        name: 'Birthday Bash',
        desc: 'Party fund & Gifts'
    },
    family: {
        monthlyImpact: 10000,
        category: 'Family',
        name: 'New Family Support',
        desc: 'Insurance & Healthcare'
    },
    kid: {
        monthlyImpact: 15000,
        category: 'Education',
        name: 'New Kid Planning',
        desc: 'Diapers, Food & Future Edu'
    },
    business: {
        monthlyImpact: 25000,
        oneTimeCost: 200000,
        category: 'Business',
        name: 'New Business',
        desc: 'Capital Loan EMI + Opex'
    },
    house: {
        monthlyImpact: 45000,
        oneTimeCost: 1000000,
        category: 'Housing',
        name: 'New House',
        desc: 'Home Loan EMI + Maintenance'
    }
};

export default function LifeEvents({ isScenarioMode, activeEvents, onToggleEvent }) {
    if (!isScenarioMode) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Life Event Simulators</Text>
            <Text style={styles.subtitle}>Select events to see real-time impact on your budget</Text>

            <View style={styles.grid}>
                {Object.entries(EVENTS_DATA).map(([key, event], idx) => {
                    const isActive = activeEvents.includes(key);

                    return (
                        <LuxuryCard
                            key={key}
                            style={[styles.card, isActive && styles.cardActive]}
                            onPress={() => onToggleEvent(key)}
                            index={idx}
                        >
                            <View style={styles.header}>
                                <Text style={[styles.eventName, isActive && styles.activeText]}>{event.name}</Text>
                                <View style={[styles.checkbox, isActive && styles.checkboxActive]}>
                                    {isActive ? <Check size={12} color="#000" strokeWidth={3} /> : <Plus size={12} color="#52525B" />}
                                </View>
                            </View>

                            <Text style={styles.desc}>{event.desc}</Text>

                            {isActive && (
                                <View style={styles.impactTag}>
                                    <Text style={styles.impactText}>+ Expenses</Text>
                                </View>
                            )}
                        </LuxuryCard>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 24, paddingHorizontal: 20 },
    title: { color: '#F59E0B', fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
    subtitle: { color: '#71717A', fontSize: 12, marginBottom: 16 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    card: { width: '48%', padding: 12, backgroundColor: '#18181B', minHeight: 100 },
    cardActive: { backgroundColor: '#F59E0B10', borderColor: '#F59E0B50' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    eventName: { color: '#A1A1AA', fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
    activeText: { color: '#F59E0B' },
    checkbox: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#52525B', alignItems: 'center', justifyContent: 'center' },
    checkboxActive: { backgroundColor: '#F59E0B', borderColor: '#F59E0B' },
    desc: { color: '#52525B', fontSize: 11, lineHeight: 15 },
    impactTag: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: '#EF444420', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    impactText: { color: '#EF4444', fontSize: 10, fontWeight: '700' }
});
