import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity } from 'react-native';
import { X, Activity, Gauge, TrendingUp } from 'lucide-react-native';

export default function OEEDashboard({ visible, onClose }) {
    const metrics = [
        { label: 'Availability', value: 92, color: '#10B981' },
        { label: 'Performance', value: 88, color: '#3B82F6' },
        { label: 'Quality', value: 96, color: '#A78BFA' },
    ];

    const oee = Math.round((0.92 * 0.88 * 0.96) * 100);

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Activity size={24} color="#10B981" />
                            <Text style={styles.title}>OEE Dashboard</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Overall Equipment Effectiveness metrics.</Text>

                    <View style={styles.mainGauge}>
                        <View style={styles.gaugeCircle}>
                            <Text style={styles.gaugeValue}>{oee}%</Text>
                            <Text style={styles.gaugeLabel}>World Class OEE</Text>
                        </View>
                    </View>

                    <View style={styles.metricsContainer}>
                        {metrics.map((m, i) => (
                            <View key={i} style={styles.metricCard}>
                                <Text style={[styles.metricValue, { color: m.color }]}>{m.value}%</Text>
                                <Text style={styles.metricLabel}>{m.label}</Text>
                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, { width: `${m.value}%`, backgroundColor: m.color }]} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 32 },
    mainGauge: { alignItems: 'center', marginBottom: 40 },
    gaugeCircle: { width: 160, height: 160, borderRadius: 80, borderWidth: 8, borderColor: '#10B981', alignItems: 'center', justifyContent: 'center', shadowColor: '#10B981', shadowOpacity: 0.2, shadowRadius: 20 },
    gaugeValue: { fontSize: 48, fontWeight: '900', color: '#FFF' },
    gaugeLabel: { fontSize: 12, color: '#10B981', fontWeight: '700', marginTop: 4 },
    metricsContainer: { gap: 20 },
    metricCard: { gap: 8 },
    metricValue: { fontSize: 24, fontWeight: '800' },
    metricLabel: { fontSize: 14, color: '#A1A1AA' },
    barBg: { height: 8, backgroundColor: '#27272A', borderRadius: 4, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 4 }
});
