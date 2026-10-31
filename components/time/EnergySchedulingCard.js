import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Zap } from 'lucide-react-native';

export default function EnergySchedulingCard() {
    const BANDS = [
        {
            time: 'Morning',
            level: 'High Energy',
            activity: '(Deep work)',
            activeBars: 8,
            totalBars: 8,
            barColor: '#10B981',
            textColor: '#10B981'
        },
        {
            time: 'Afternoon',
            level: 'Medium Energy',
            activity: '(Practice / Revision)',
            activeBars: 5,
            totalBars: 8,
            barColor: '#F59E0B',
            textColor: '#F59E0B'
        },
        {
            time: 'Evening',
            level: 'Low Energy',
            activity: '(Reading / Simple tasks)',
            activeBars: 3,
            totalBars: 8,
            barColor: '#A855F7',
            textColor: '#A855F7'
        },
    ];

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View style={styles.iconWrap}>
                    <Zap size={16} color="#F59E0B" />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Energy-Based Scheduling</Text>
                    <Text style={styles.cardDesc}>We schedule based on your energy levels</Text>
                </View>
            </View>

            {/* 3 Energy Bands */}
            <View style={styles.bandsList}>
                {BANDS.map(b => (
                    <View key={b.time} style={styles.bandRow}>
                        <View style={styles.bandInfoCol}>
                            <Text style={styles.bandTime}>{b.time}</Text>
                            <Text style={[styles.bandLevel, { color: b.textColor }]}>{b.level}</Text>
                            <Text style={styles.bandActivity}>{b.activity}</Text>
                        </View>

                        <View style={styles.segmentedMeter}>
                            {Array.from({ length: b.totalBars }).map((_, idx) => (
                                <View
                                    key={idx}
                                    style={[
                                        styles.meterBar,
                                        {
                                            backgroundColor: idx < b.activeBars ? b.barColor : '#1E293B'
                                        }
                                    ]}
                                />
                            ))}
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#0F172A',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1E293B',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16,
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: '#F59E0B15',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F59E0B30',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    cardDesc: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    bandsList: {
        gap: 14,
    },
    bandRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1E293B40',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#33415540',
    },
    bandInfoCol: {
        flex: 1,
    },
    bandTime: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F8FAFC',
    },
    bandLevel: {
        fontSize: 11,
        fontWeight: '600',
        marginTop: 1,
    },
    bandActivity: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 1,
    },
    segmentedMeter: {
        flexDirection: 'row',
        gap: 3,
        alignItems: 'center',
    },
    meterBar: {
        width: 6,
        height: 22,
        borderRadius: 2,
    },
});
