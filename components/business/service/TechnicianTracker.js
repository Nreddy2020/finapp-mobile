import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { X, MapPin, User, Navigation } from 'lucide-react-native';

export default function TechnicianTracker({ visible, onClose }) {
    const technicians = [
        { id: 1, name: 'John Doe', status: 'On Route', location: { top: '30%', left: '40%' } },
        { id: 2, name: 'Jane Smith', status: 'Working', location: { top: '60%', left: '70%' } },
    ];

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <MapPin size={24} color="#3B82F6" />
                            <Text style={styles.title}>Team Live Map</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Real-time tracking of field technicians.</Text>

                    <View style={styles.mapContainer}>
                        {/* Simulated Map Background */}
                        <View style={styles.mapBg}>
                            <View style={styles.gridLineV} />
                            <View style={[styles.gridLineV, { left: '60%' }]} />
                            <View style={styles.gridLineH} />
                            <View style={[styles.gridLineH, { top: '70%' }]} />
                        </View>

                        {technicians.map((tech) => (
                            <View key={tech.id} style={[styles.marker, { top: tech.location.top, left: tech.location.left }]}>
                                <View style={styles.markerDot}>
                                    <User size={12} color="#FFF" />
                                </View>
                                <View style={styles.markerLabel}>
                                    <Text style={styles.markerText}>{tech.name}</Text>
                                    <Text style={styles.markerStatus}>{tech.status}</Text>
                                </View>
                            </View>
                        ))}
                    </View>

                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
                            <Text style={styles.legendText}>Active Job</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>Available</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '90%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    mapContainer: { flex: 1, backgroundColor: '#1F2937', borderRadius: 24, marginBottom: 24, overflow: 'hidden', position: 'relative' },
    mapBg: { ...StyleSheet.absoluteFillObject, opacity: 0.3 },
    gridLineV: { position: 'absolute', top: 0, bottom: 0, left: '30%', width: 1, backgroundColor: '#4B5563' },
    gridLineH: { position: 'absolute', left: 0, right: 0, top: '40%', height: 1, backgroundColor: '#4B5563' },
    marker: { position: 'absolute', alignItems: 'center', gap: 4 },
    markerDot: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFF' },
    markerLabel: { backgroundColor: '#27272A', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignItems: 'center' },
    markerText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
    markerStatus: { color: '#10B981', fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' }
});
