import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Users, Sparkles, Bell, CalendarClock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function WaitlistAI({ visible, onClose }) {
    const [notified, setNotified] = useState(false);
    const [waitlist, setWaitlist] = useState([
        { id: 1, name: 'Alice Wong', service: 'Consultation', status: 'waiting' },
        { id: 2, name: 'Ravi Kumar', service: 'Tax Audit', status: 'waiting' },
        { id: 3, name: 'SecureOps Ltd', service: 'Retainer', status: 'waiting' },
    ]);

    const notifyClients = () => {
        setNotified(true);
        setTimeout(() => setNotified(false), 2000);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Users size={24} color="#A78BFA" />
                            <Text style={styles.title}>Waitlist AI</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Automatically fill cancellation gaps.</Text>

                    <View style={styles.aiCard}>
                        <LinearGradient
                            colors={['#7C3AED', '#5B21B6']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.gradientCard}
                        >
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <Sparkles size={24} color="#FFF" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.aiTitle}>Smart Opportunity</Text>
                                    <Text style={styles.aiText}>2 slots opened up for tomorrow afternoon. Notify high-value clients?</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={styles.notifyBtn} onPress={notifyClients}>
                                {notified ? (
                                    <Text style={[styles.notifyText, { color: '#10B981' }]}>Notified!</Text>
                                ) : (
                                    <>
                                        <Bell size={16} color="#7C3AED" />
                                        <Text style={styles.notifyText}>Notify All</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>

                    <Text style={styles.listHeader}>Active Waitlist ({waitlist.length})</Text>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {waitlist.map((client) => (
                            <View key={client.id} style={styles.clientCard}>
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{client.name[0]}</Text>
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.clientName}>{client.name}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                        <CalendarClock size={12} color="#A1A1AA" />
                                        <Text style={styles.serviceText}>{client.service}</Text>
                                    </View>
                                </View>
                                <View style={styles.priorityBadge}>
                                    <Text style={styles.priorityText}>HIGH</Text>
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
    container: { backgroundColor: '#18181B', height: '80%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    aiCard: { marginBottom: 24 },
    gradientCard: { borderRadius: 16, padding: 20 },
    aiTitle: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    aiText: { color: '#E9D5FF', fontSize: 13, lineHeight: 20, marginBottom: 16 },
    notifyBtn: { backgroundColor: '#FFFFFF', paddingVertical: 10, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    notifyText: { color: '#7C3AED', fontWeight: '700', fontSize: 14 },
    listHeader: { color: '#A1A1AA', fontWeight: '700', marginBottom: 16 },
    list: { flex: 1 },
    clientCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#27272A', padding: 12, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    clientName: { color: '#FFF', fontWeight: '700', fontSize: 14, marginBottom: 2 },
    serviceText: { color: '#A1A1AA', fontSize: 12 },
    priorityBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    priorityText: { color: '#F59E0B', fontSize: 10, fontWeight: '800' }
});
