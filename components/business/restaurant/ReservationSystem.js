import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, CalendarDays, Armchair, Clock, UserCheck } from 'lucide-react-native';

export default function ReservationSystem({ visible, onClose }) {
    const [tables, setTables] = useState([
        { id: 1, capacity: 4, status: 'occupied' },
        { id: 2, capacity: 2, status: 'free' },
        { id: 3, capacity: 6, status: 'reserved' },
        { id: 4, capacity: 4, status: 'free' },
        { id: 5, capacity: 2, status: 'free' },
        { id: 6, capacity: 8, status: 'reserved' },
    ]);

    const bookTable = (id) => {
        setTables(tables.map(t => t.id === id ? { ...t, status: 'reserved' } : t));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <CalendarDays size={24} color="#F97316" />
                            <Text style={styles.title}>Reservations</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Table management and bookings.</Text>

                    <View style={styles.grid}>
                        {tables.map((table) => (
                            <TouchableOpacity
                                key={table.id}
                                style={[
                                    styles.table,
                                    table.status === 'occupied' ? styles.occupied :
                                        table.status === 'reserved' ? styles.reserved : styles.free
                                ]}
                                onPress={() => table.status === 'free' && bookTable(table.id)}
                                disabled={table.status !== 'free'}
                            >
                                <View style={styles.chairs}>
                                    {[...Array(table.capacity)].map((_, i) => (
                                        <View key={i} style={styles.chairDot} />
                                    ))}
                                </View>
                                <Text style={styles.tableId}>T-{table.id}</Text>
                                <Text style={styles.statusText}>{table.status}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#22c55e' }]} />
                            <Text style={styles.legendText}>Available</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#F97316' }]} />
                            <Text style={styles.legendText}>Reserved</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                            <Text style={styles.legendText}>Occupied</Text>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginBottom: 24 },
    table: { width: '30%', height: 100, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    free: { backgroundColor: '#22c55e10', borderColor: '#22c55e30' },
    reserved: { backgroundColor: '#F9731610', borderColor: '#F9731630' },
    occupied: { backgroundColor: '#EF444410', borderColor: '#EF444430' },
    tableId: { color: '#FFF', fontWeight: '800', fontSize: 16 },
    statusText: { fontSize: 10, textTransform: 'uppercase', marginTop: 4, color: '#A1A1AA' },
    chairs: { flexDirection: 'row', gap: 4, position: 'absolute', top: 8 },
    chairDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FFFFFF50' },
    legend: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' }
});
