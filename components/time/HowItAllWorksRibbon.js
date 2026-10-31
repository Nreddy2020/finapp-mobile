import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Target, ListTodo, Clock, Calendar, Play, BarChart2, Settings, ArrowRight } from 'lucide-react-native';

export default function HowItAllWorksRibbon() {
    const STAGES = [
        { title: 'Set Goals', sub: '(What to achieve)', icon: Target, color: '#38BDF8' },
        { title: 'Break into Tasks', sub: '(What to do)', icon: ListTodo, color: '#818CF8' },
        { title: 'Estimate Time', sub: '(How long)', icon: Clock, color: '#A78BFA' },
        { title: 'Smart Scheduling', sub: '(When to do)', icon: Calendar, color: '#F472B6' },
        { title: 'Execute', sub: '(Focus & Track)', icon: Play, color: '#34D399' },
        { title: 'Analyze', sub: '(See progress)', icon: BarChart2, color: '#38BDF8' },
        { title: 'Adapt & Improve', sub: '(Better plans)', icon: Settings, color: '#FBBF24' },
    ];

    return (
        <View style={styles.ribbonCard}>
            <Text style={styles.sectionHeading}>How It All Works</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stagesContainer}>
                {STAGES.map((s, idx) => {
                    const Icon = s.icon;
                    return (
                        <View key={s.title} style={styles.stageWrapper}>
                            <View style={styles.stageItem}>
                                <View style={[styles.iconBox, { backgroundColor: `${s.color}15` }]}>
                                    <Icon size={14} color={s.color} />
                                </View>
                                <View>
                                    <Text style={styles.stageTitle}>{s.title}</Text>
                                    <Text style={styles.stageSub}>{s.sub}</Text>
                                </View>
                            </View>
                            {idx < STAGES.length - 1 && (
                                <View style={styles.arrowBox}>
                                    <ArrowRight size={12} color="#475569" />
                                </View>
                            )}
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    ribbonCard: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    sectionHeading: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F8FAFC',
        marginBottom: 12,
    },
    stagesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
    },
    stageWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#1E293B60',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#33415560',
    },
    iconBox: {
        width: 26,
        height: 26,
        borderRadius: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stageTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    stageSub: {
        fontSize: 9,
        fontWeight: '500',
        color: '#94A3B8',
        marginTop: 1,
    },
    arrowBox: {
        paddingHorizontal: 6,
    },
});
