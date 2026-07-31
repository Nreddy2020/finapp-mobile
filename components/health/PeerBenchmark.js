import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TrendingUp } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';

export default function PeerBenchmark() {
    const [benchmarkView, setBenchmarkView] = useState('networth'); // 'networth' or 'savings'

    return (
        <LuxuryCard style={styles.section}>
            <View style={styles.header}>
                <View style={[styles.iconContainer, { backgroundColor: '#F59E0B20' }]}>
                    <TrendingUp size={16} color="#F59E0B" />
                </View>
                <View>
                    <Text style={styles.title}>Peer Benchmarking</Text>
                    <Text style={styles.subtitle}>You vs Top 10% of 28-35 year olds</Text>
                </View>
            </View>

            <View style={styles.toggleContainer}>
                <Pressable
                    onPress={() => setBenchmarkView('networth')}
                    style={[
                        styles.toggleButton,
                        {
                            backgroundColor: benchmarkView === 'networth' ? '#F59E0B20' : '#27272A',
                            borderColor: benchmarkView === 'networth' ? '#F59E0B' : 'transparent'
                        }
                    ]}
                >
                    <Text style={[styles.toggleText, { color: benchmarkView === 'networth' ? '#F59E0B' : '#A1A1AA' }]}>NET WORTH</Text>
                </Pressable>
                <Pressable
                    onPress={() => setBenchmarkView('savings')}
                    style={[
                        styles.toggleButton,
                        {
                            backgroundColor: benchmarkView === 'savings' ? '#F59E0B20' : '#27272A',
                            borderColor: benchmarkView === 'savings' ? '#F59E0B' : 'transparent'
                        }
                    ]}
                >
                    <Text style={[styles.toggleText, { color: benchmarkView === 'savings' ? '#F59E0B' : '#A1A1AA' }]}>SAVINGS RATE</Text>
                </Pressable>
            </View>

            <View style={styles.chartContainer}>
                {/* You Bar */}
                <View style={styles.barGroup}>
                    <Text style={styles.barLabel}>{benchmarkView === 'networth' ? '₹12.5L' : '32%'}</Text>
                    <View style={[styles.bar, { height: 80, backgroundColor: '#10B981' }]} />
                    <Text style={styles.barTitle}>YOU</Text>
                </View>

                {/* Peer Bar */}
                <View style={styles.barGroup}>
                    <Text style={[styles.barLabel, { color: '#A1A1AA' }]}>{benchmarkView === 'networth' ? '₹8.4L' : '22%'}</Text>
                    <View style={[styles.bar, { height: 50, backgroundColor: '#3F3F46' }]} />
                    <Text style={styles.barTitle}>AVG</Text>
                </View>

                {/* Top 10% Bar */}
                <View style={styles.barGroup}>
                    <Text style={[styles.barLabel, { color: '#F59E0B' }]}>{benchmarkView === 'networth' ? '₹45L' : '55%'}</Text>
                    <View style={[styles.bar, { height: 110, backgroundColor: '#F59E0B', opacity: 0.8 }]} />
                    <Text style={styles.barTitle}>TOP 10%</Text>
                </View>
            </View>

            <Text style={styles.summaryText}>
                You are in the <Text style={{ color: '#10B981', fontWeight: '700' }}>Top 18%</Text> of your age group! 🏆
            </Text>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    section: { marginBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconContainer: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    title: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1AA', fontSize: 12 },
    toggleContainer: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    toggleButton: { flex: 1, padding: 8, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
    toggleText: { fontSize: 11, fontWeight: '700' },
    chartContainer: { height: 120, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingBottom: 24 },
    barGroup: { alignItems: 'center', gap: 8 },
    barLabel: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    bar: { width: 40, borderRadius: 8 },
    barTitle: { color: '#52525B', fontSize: 10, fontWeight: '700' },
    summaryText: { textAlign: 'center', color: '#A1A1AA', fontSize: 11 }
});
