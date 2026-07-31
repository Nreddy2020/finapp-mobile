import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Briefcase, TrendingUp, Globe, Monitor, Award, X } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

const SCENARIOS = [
    { id: 'promotion', label: 'Promotion', icon: TrendingUp, color: '#10B981', boost: 0.20, type: 'percent', desc: '+20% Salary Hike' },
    { id: 'side_hustle', label: 'Side Hustle', icon: Monitor, color: '#8B5CF6', boost: 25000, type: 'fixed', desc: '+₹25k Freelance' },
    { id: 'new_skill', label: 'Upskill', icon: Award, color: '#F59E0B', boost: 500000, type: 'yearly', desc: '+₹5L/yr Package' },
    { id: 'relocate', label: 'Relocate (US)', icon: Globe, color: '#3B82F6', boost: 0, type: 'currency', desc: 'Earnings in USD' },
];

export default function CareerSimulator({ isPotentialMode, activeScenarios, onToggleScenario, scenarioValues, onUpdateValue }) {
    if (!isPotentialMode) return null;

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Career Simulator</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollList}>
                {SCENARIOS.map((item, index) => {
                    const isActive = activeScenarios.includes(item.id);
                    const Icon = item.icon;
                    const currentValue = scenarioValues?.[item.id];

                    return (
                        <TouchableOpacity
                            key={item.id}
                            onPress={() => onToggleScenario(item.id)}
                            style={[styles.cardWrapper, isActive && { width: 220 }]} // Expand if active
                        >
                            <LuxuryCard
                                style={[
                                    styles.card,
                                    isActive && { borderColor: item.color, backgroundColor: `${item.color}10`, alignItems: 'flex-start' }
                                ]}
                                index={index}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%' }}>
                                    <View style={[styles.iconBox, { backgroundColor: `${item.color}20` }]}>
                                        <Icon size={20} color={item.color} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.label, isActive && { color: '#FFF' }]}>{item.label}</Text>
                                        <Text style={styles.desc}>{item.desc}</Text>
                                    </View>
                                    {isActive && (
                                        <View style={[styles.activeBadge, { backgroundColor: item.color }]}>
                                            <X size={10} color="#FFF" />
                                        </View>
                                    )}
                                </View>

                                {isActive && item.id === 'promotion' && (
                                    <View style={styles.sliderContainer}>
                                        <Text style={[styles.sliderValue, { color: item.color }]}>+{(currentValue * 100).toFixed(0)}% Hike</Text>
                                        <View style={styles.sliderTrack}>
                                            <View style={[styles.sliderFill, { width: `${(currentValue / 0.50) * 100}%`, backgroundColor: item.color }]} />
                                        </View>
                                        {/* Simple tap targets for simulator */}
                                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                                            {[0.10, 0.20, 0.30, 0.50].map(v => (
                                                <TouchableOpacity
                                                    key={v}
                                                    onPress={(e) => { e.stopPropagation(); onUpdateValue(item.id, v); }}
                                                    style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: currentValue === v ? item.color : '#333', borderRadius: 8 }}
                                                >
                                                    <Text style={{ fontSize: 10, color: '#FFF', fontWeight: '700' }}>{v * 100}%</Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>
                                )}
                            </LuxuryCard>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { marginBottom: 24 },
    title: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1, paddingHorizontal: 24 },
    scrollList: { paddingHorizontal: 24, gap: 12 },
    cardWrapper: { width: 120 },
    card: { height: 110, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 6 },
    iconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    label: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', textAlign: 'center' },
    desc: { color: '#52525B', fontSize: 10, textAlign: 'left', fontWeight: '500' },
    activeBadge: { width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },

    // Slider Styles
    sliderContainer: { width: '100%', marginTop: 12 },
    sliderValue: { fontSize: 13, fontWeight: '800', marginBottom: 6 },
    sliderTrack: { height: 4, backgroundColor: '#333', borderRadius: 2, overflow: 'hidden' },
    sliderFill: { height: '100%' }
});
