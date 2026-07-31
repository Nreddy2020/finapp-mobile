import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Star, Bell, Clock, CheckCircle2, Coffee, Sparkles } from 'lucide-react-native';

export default function GuestExperience({ visible, onClose }) {
    const [requests, setRequests] = useState([
        { id: 1, room: '101', type: 'Room Service', detail: '2x Club Sandwich, 1x Coke', time: '5m ago', status: 'pending' },
        { id: 2, room: '106', type: 'Housekeeping', detail: 'Extra Towels', time: '12m ago', status: 'pending' },
        { id: 3, room: '103', type: 'Spa Booking', detail: 'Couple Massage @ 4PM', time: '1h ago', status: 'done' },
    ]);

    const markDone = (id) => {
        setRequests(requests.map(r => r.id === id ? { ...r, status: 'done' } : r));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Star size={24} color="#A78BFA" />
                            <Text style={styles.title}>Guest Experience</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Manage guest requests and digital concierge.</Text>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {requests.map((req) => (
                            <View key={req.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.roomBadge}>
                                        <Text style={styles.roomText}>Room {req.room}</Text>
                                    </View>
                                    <View style={styles.timeTag}>
                                        <Clock size={12} color="#71717A" />
                                        <Text style={styles.timeText}>{req.time}</Text>
                                    </View>
                                </View>

                                <View style={styles.content}>
                                    <View style={styles.iconBox}>
                                        {req.type === 'Room Service' ? <Coffee size={20} color="#FFF" /> : <Sparkles size={20} color="#FFF" />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.reqType}>{req.type}</Text>
                                        <Text style={styles.reqDetail}>{req.detail}</Text>
                                    </View>
                                </View>

                                {req.status === 'pending' ? (
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => markDone(req.id)}>
                                        <Text style={styles.actionText}>Mark Complete</Text>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.doneBadge}>
                                        <CheckCircle2 size={14} color="#10B981" />
                                        <Text style={styles.doneText}>Completed</Text>
                                    </View>
                                )}
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
    container: { backgroundColor: '#18181B', height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    list: { flex: 1 },
    card: { backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    roomBadge: { backgroundColor: '#3B82F620', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    roomText: { color: '#3B82F6', fontWeight: '700', fontSize: 12 },
    timeTag: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    timeText: { color: '#71717A', fontSize: 12 },
    content: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' },
    reqType: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    reqDetail: { color: '#A1A1AA', fontSize: 13 },
    actionBtn: { backgroundColor: '#3B82F6', padding: 12, borderRadius: 12, alignItems: 'center' },
    actionText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    doneBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: 0.5 },
    doneText: { color: '#10B981', fontWeight: '700', fontSize: 14 }
});
