import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Star, CheckCircle2, UserCheck, Trophy } from 'lucide-react-native';

export default function ChoreRewards({ visible, onClose }) {
    const [chores, setChores] = useState([
        { id: 1, title: 'Wash the Car', reward: 100, status: 'available', assignee: null },
        { id: 2, title: 'Clean Your Room', reward: 50, status: 'pending', assignee: 'Rohan' },
        { id: 3, title: 'Walk the Dog', reward: 30, status: 'approved', assignee: 'Aisha' },
    ]);

    const claimChore = (id) => {
        setChores(chores.map(c => c.id === id ? { ...c, status: 'pending', assignee: 'Me' } : c));
    };

    const approveChore = (id) => {
        setChores(chores.map(c => c.id === id ? { ...c, status: 'approved' } : c));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Trophy size={24} color="#F59E0B" />
                            <Text style={styles.title}>Chore Rewards</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Incentivize tasks with instant rewards.</Text>

                    <ScrollView style={styles.list}>
                        {chores.map((chore) => (
                            <View key={chore.id} style={styles.card}>
                                <View style={styles.cardLeft}>
                                    <View style={[styles.iconBox,
                                    chore.status === 'approved' ? styles.iconGreen :
                                        chore.status === 'pending' ? styles.iconYellow : styles.iconGray
                                    ]}>
                                        <Star size={16} color={chore.status === 'approved' ? '#10B981' : chore.status === 'pending' ? '#F59E0B' : '#A1A1AA'} fill={chore.status === 'approved' ? '#10B981' : 'transparent'} />
                                    </View>
                                    <View>
                                        <Text style={styles.choreTitle}>{chore.title}</Text>
                                        <Text style={styles.rewardText}>Reward: ₹{chore.reward}</Text>
                                    </View>
                                </View>

                                {chore.status === 'available' && (
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => claimChore(chore.id)}>
                                        <Text style={styles.btnText}>Claim</Text>
                                    </TouchableOpacity>
                                )}

                                {chore.status === 'pending' && (
                                    <TouchableOpacity style={[styles.actionBtn, styles.btnApprove]} onPress={() => approveChore(chore.id)}>
                                        <Text style={styles.btnText}>Approve</Text>
                                    </TouchableOpacity>
                                )}

                                {chore.status === 'approved' && (
                                    <View style={styles.doneBadge}>
                                        <CheckCircle2 size={14} color="#10B981" />
                                        <Text style={styles.doneText}>Paid to {chore.assignee}</Text>
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
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    list: { gap: 12 },
    card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#FFFFFF08' },
    cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    iconGray: { backgroundColor: '#3F3F46' },
    iconYellow: { backgroundColor: '#F59E0B20' },
    iconGreen: { backgroundColor: '#10B98120' },
    choreTitle: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    rewardText: { color: '#F59E0B', fontSize: 12, fontWeight: '600' },
    actionBtn: { backgroundColor: '#3F3F46', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    btnApprove: { backgroundColor: '#10B981' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
    doneBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10B98110', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    doneText: { color: '#10B981', fontSize: 10, fontWeight: '600' }
});
