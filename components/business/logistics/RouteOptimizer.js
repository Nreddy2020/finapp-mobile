import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Map, Zap, CheckCircle2, MoreVertical, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function RouteOptimizer({ visible, onClose }) {
    const [optimized, setOptimized] = useState(false);
    const [stops, setStops] = useState([
        { id: 1, location: 'Warehouse A', time: '09:00 AM' },
        { id: 2, location: 'City Center Hub', time: '10:30 AM' },
        { id: 3, location: 'North Dist. Center', time: '01:00 PM' },
        { id: 4, location: 'Eastside Outlet', time: '02:45 PM' },
    ]);

    const optimizeRoute = () => {
        // Mock optimization: swap middle stops
        const newStops = [...stops];
        const temp = newStops[1];
        newStops[1] = newStops[2];
        newStops[2] = temp;
        setStops(newStops);
        setOptimized(true);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Map size={24} color="#06B6D4" />
                            <Text style={styles.title}>Route Optimizer</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>AI-driven route planning for maximum fleet efficiency.</Text>

                    {optimized && (
                        <View style={styles.savingsCard}>
                            <View style={styles.savingsRow}>
                                <View style={styles.savingItem}>
                                    <Text style={styles.savingLabel}>Time Saved</Text>
                                    <Text style={styles.savingValue}>45 mins</Text>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.savingItem}>
                                    <Text style={styles.savingLabel}>Fuel Saved</Text>
                                    <Text style={styles.savingValue}>3.2 L</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {stops.map((stop, index) => (
                            <View key={stop.id} style={styles.stopCard}>
                                <View style={styles.stopTimeline}>
                                    <View style={styles.stopDot} />
                                    {index < stops.length - 1 && <View style={styles.stopLine} />}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.stopLocation}>{stop.location}</Text>
                                    <Text style={styles.stopTime}>{stop.time}</Text>
                                </View>
                                <MoreVertical size={20} color="#71717A" />
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.optimizeBtn} onPress={optimizeRoute} disabled={optimized}>
                        <LinearGradient
                            colors={optimized ? ['#164E63', '#164E63'] : ['#0891B2', '#06B6D4']}
                            style={styles.btnGradient}
                        >
                            {optimized ? (
                                <>
                                    <CheckCircle2 size={20} color="#06B6D4" />
                                    <Text style={[styles.btnText, { color: '#06B6D4' }]}>Route Optimized</Text>
                                </>
                            ) : (
                                <>
                                    <Zap size={20} color="#FFF" />
                                    <Text style={styles.btnText}>Optimize Route</Text>
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    savingsCard: { backgroundColor: '#06B6D410', borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: '#06B6D430' },
    savingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
    savingItem: { alignItems: 'center' },
    savingLabel: { color: '#06B6D4', fontSize: 12, marginBottom: 4, fontWeight: '700', textTransform: 'uppercase' },
    savingValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    divider: { width: 1, height: 30, backgroundColor: '#06B6D430' },
    list: { flex: 1, marginBottom: 24 },
    stopCard: { flexDirection: 'row', gap: 16, paddingBottom: 32 },
    stopTimeline: { alignItems: 'center', width: 24 },
    stopDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#06B6D4', borderWidth: 2, borderColor: '#18181B', zIndex: 10 },
    stopLine: { position: 'absolute', top: 12, bottom: -32, width: 2, backgroundColor: '#27272A' },
    stopLocation: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    stopTime: { color: '#A1A1AA', fontSize: 13 },
    optimizeBtn: { height: 56, borderRadius: 16, overflow: 'hidden' },
    btnGradient: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
