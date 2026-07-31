import React from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Truck, Gauge, Fuel, AlertTriangle } from 'lucide-react-native';

export default function FleetTracker({ visible, onClose }) {
    const fleet = [
        { id: 'TRK-05', driver: 'Vikram M.', status: 'moving', speed: 65, fuel: 45, location: 'NH-48', alert: null },
        { id: 'TRK-08', driver: 'Amit S.', status: 'idle', speed: 0, fuel: 20, location: 'Pune Depot', alert: 'Low Fuel' },
        { id: 'TRK-12', driver: 'Rahul K.', status: 'moving', speed: 82, fuel: 60, location: 'Expressway', alert: 'Over Speed' },
    ];

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Truck size={24} color="#F59E0B" />
                            <Text style={styles.title}>Live Fleet Status</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Real-time telemetry and alerts.</Text>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {fleet.map((vehicle) => (
                            <View key={vehicle.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View>
                                        <Text style={styles.vehicleId}>{vehicle.id}</Text>
                                        <Text style={styles.driverName}>{vehicle.driver}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: vehicle.status === 'moving' ? '#10B98120' : '#71717A20' }]}>
                                        <Text style={[styles.statusText, { color: vehicle.status === 'moving' ? '#10B981' : '#71717A' }]}>
                                            {vehicle.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                {vehicle.alert && (
                                    <View style={styles.alertBox}>
                                        <AlertTriangle size={14} color="#EF4444" />
                                        <Text style={styles.alertText}>{vehicle.alert}</Text>
                                    </View>
                                )}

                                <View style={styles.telemetryRow}>
                                    <View style={styles.telemetryItem}>
                                        <Gauge size={16} color="#A1A1AA" />
                                        <Text style={styles.telemetryValue}>{vehicle.speed} km/h</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <View style={styles.telemetryItem}>
                                        <Fuel size={16} color="#A1A1AA" />
                                        <Text style={styles.telemetryValue}>{vehicle.fuel}%</Text>
                                    </View>
                                    <View style={styles.divider} />
                                    <Text style={styles.location}>{vehicle.location}</Text>
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    list: { flex: 1 },
    card: { backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    vehicleId: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    driverName: { color: '#A1A1AA', fontSize: 12 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: '700' },
    alertBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF444420', padding: 8, borderRadius: 8, marginBottom: 12 },
    alertText: { color: '#EF4444', fontSize: 12, fontWeight: '700' },
    telemetryRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    telemetryItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    telemetryValue: { color: '#FFF', fontWeight: '600', fontSize: 13 },
    divider: { width: 1, height: 16, backgroundColor: '#FFFFFF10' },
    location: { color: '#A1A1AA', fontSize: 13, marginLeft: 'auto' }
});
