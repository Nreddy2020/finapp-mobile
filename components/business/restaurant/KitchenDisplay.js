import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, ChefHat, Clock, Bell, CheckCircle2 } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function KitchenDisplay({ visible, onClose }) {
    const [orders, setOrders] = useState([
        { id: 101, table: 'T-4', items: ['Butter Chicken', '2x Naan', 'Coke'], time: 12, status: 'cooking' },
        { id: 102, table: 'T-7', items: ['Paneer Tikka', 'Masala Pappad'], time: 5, status: 'prep' },
        { id: 103, table: 'T-2', items: ['Dal Makhani', 'Rice'], time: 18, status: 'ready' },
    ]);

    const markReady = (id) => {
        setOrders(orders.map(o => o.id === id ? { ...o, status: 'ready' } : o));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <ChefHat size={24} color="#F97316" />
                            <Text style={styles.title}>Kitchen Display System</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Real-time order queue for kitchen staff.</Text>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kanban}>
                        {orders.map((order) => (
                            <View key={order.id} style={[styles.card, order.status === 'ready' && styles.cardReady]}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.tableText}>{order.table}</Text>
                                    <View style={styles.timer}>
                                        <Clock size={12} color="#A1A1AA" />
                                        <Text style={[styles.timerText, order.time > 15 && { color: '#EF4444' }]}>{order.time}m</Text>
                                    </View>
                                </View>

                                <View style={styles.divider} />

                                <View style={styles.itemsList}>
                                    {order.items.map((item, idx) => (
                                        <Text key={idx} style={styles.itemText}>• {item}</Text>
                                    ))}
                                </View>

                                <TouchableOpacity
                                    style={[styles.actionBtn, order.status === 'ready' ? styles.btnReady : styles.btnCook]}
                                    onPress={() => markReady(order.id)}
                                    disabled={order.status === 'ready'}
                                >
                                    {order.status === 'ready' ? (
                                        <>
                                            <Bell size={16} color="#FFF" />
                                            <Text style={styles.btnText}>Waiter Notified</Text>
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 size={16} color="#FFF" />
                                            <Text style={styles.btnText}>Mark Ready</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
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
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    kanban: { gap: 16, paddingRight: 24 },
    card: { width: 200, backgroundColor: '#27272A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFFFFF08', justifyContent: 'space-between' },
    cardReady: { borderColor: '#10B98150', backgroundColor: '#10B98110' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    tableText: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    timer: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#3F3F46', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    timerText: { color: '#A1A1AA', fontSize: 12, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#FFFFFF10', marginBottom: 12 },
    itemsList: { gap: 8, marginBottom: 20 },
    itemText: { color: '#E4E4E7', fontSize: 14, fontWeight: '500' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10 },
    btnCook: { backgroundColor: '#EA580C' },
    btnReady: { backgroundColor: '#10B981' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 12 }
});
