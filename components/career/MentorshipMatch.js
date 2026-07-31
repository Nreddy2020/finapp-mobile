import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { X, Users, MessageCircle, Star } from 'lucide-react-native';
import { CareerService } from '../../services/career';

export default function MentorshipMatch({ visible, onClose }) {
    const [mentors, setMentors] = useState([]);

    useEffect(() => {
        if (visible) loadMentors();
    }, [visible]);

    const loadMentors = async () => {
        const data = await CareerService.getMentors();
        setMentors(data);
    };

    const handleAction = async (id) => {
        const mentor = mentors.find(m => m.id === id);
        let newStatus = mentor.status;

        if (mentor.status === 'connect') newStatus = 'pending';
        else if (mentor.status === 'pending') newStatus = 'connected';

        const updated = await CareerService.updateMentorStatus(id, newStatus);
        setMentors(updated);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Users size={24} color="#8B5CF6" />
                            <Text style={styles.title}>Mentorship Match</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Connect with industry veterans.</Text>

                    <ScrollView style={styles.list}>
                        {mentors.map((mentor) => (
                            <View key={mentor.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={styles.avatar}>
                                        <Text style={{ fontSize: 24 }}>{mentor.avatar}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.name}>{mentor.name}</Text>
                                        <Text style={styles.role}>{mentor.role} at {mentor.company}</Text>
                                    </View>
                                    <View style={styles.rating}>
                                        <Star size={12} color="#F59E0B" fill="#F59E0B" />
                                        <Text style={styles.ratingText}>4.9</Text>
                                    </View>
                                </View>

                                <View style={styles.actions}>
                                    {mentor.status === 'connect' && (
                                        <TouchableOpacity style={styles.connectBtn} onPress={() => handleAction(mentor.id)}>
                                            <Text style={styles.connectText}>Request Mentorship</Text>
                                        </TouchableOpacity>
                                    )}

                                    {mentor.status === 'pending' && (
                                        <TouchableOpacity style={styles.pendingBtn} onPress={() => handleAction(mentor.id)}>
                                            <Text style={styles.pendingText}>Request Sent (Tap to Sim Accept)</Text>
                                        </TouchableOpacity>
                                    )}

                                    {mentor.status === 'connected' && (
                                        <TouchableOpacity style={styles.chatBtn}>
                                            <MessageCircle size={16} color="#FFF" />
                                            <Text style={styles.chatText}>Chat Now</Text>
                                        </TouchableOpacity>
                                    )}
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
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    list: { gap: 16 },
    card: { backgroundColor: '#27272A', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3F3F46', alignItems: 'center', justifyContent: 'center' },
    name: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    role: { color: '#A1A1AA', fontSize: 12 },
    rating: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F59E0B20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start' },
    ratingText: { color: '#F59E0B', fontSize: 10, fontWeight: '700' },
    actions: { borderTopWidth: 1, borderTopColor: '#FFFFFF10', paddingTop: 12 },
    connectBtn: { backgroundColor: '#6366F1', padding: 10, borderRadius: 8, alignItems: 'center' },
    connectText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    pendingBtn: { backgroundColor: '#3F3F46', padding: 10, borderRadius: 8, alignItems: 'center' },
    pendingText: { color: '#A1A1AA', fontWeight: '600', fontSize: 12 },
    chatBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', padding: 10, borderRadius: 8 },
    chatText: { color: '#FFF', fontWeight: '700', fontSize: 12 }
});
