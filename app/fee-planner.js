import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { ChevronLeft, Plus, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { useRouter } from 'expo-router';
import { FeeService } from '../services/fees';

export default function FeePlannerScreen() {
    const router = useRouter();
    const [fees, setFees] = useState([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');

    useEffect(() => {
        loadFees();
    }, []);

    const loadFees = async () => {
        const data = await FeeService.getFees();
        setFees(data);
    };

    const handleAddFee = async () => {
        if (!title || !amount) return;
        await FeeService.addFee({ title, amount, dueDate: dueDate || '2026-01-01' });
        setModalVisible(false);
        setTitle('');
        setAmount('');
        setDueDate('');
        loadFees();
    };

    const handleStatusUpdate = async (id, status) => {
        await FeeService.updateStatus(id, status);
        loadFees();
    };

    const getStatusColor = (status) => {
        if (status === 'Paid') return '#10B981';
        if (status === 'Overdue') return '#EF4444';
        return '#F59E0B';
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Fee Planner</Text>
                <Pressable onPress={() => setModalVisible(true)} style={styles.addButton}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {fees.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No fees planned yet.</Text>
                        <Text style={styles.emptySub}>Add tuition, exams, or other educational costs.</Text>
                    </View>
                ) : (
                    <View style={styles.timeline}>
                        <View style={styles.line} />
                        {fees.map((item, index) => (
                            <LuxuryCard key={item.id} index={index} style={styles.eventCard}>
                                <View style={styles.row}>
                                    <Pressable
                                        onPress={() => handleStatusUpdate(item.id, item.status === 'Paid' ? 'Upcoming' : 'Paid')}
                                        style={[styles.dot, { backgroundColor: getStatusColor(item.status) }]}
                                    >
                                        {item.status === 'Paid' ? <CheckCircle size={12} color="#000" /> : <Clock size={12} color="#000" />}
                                    </Pressable>

                                    <View style={styles.details}>
                                        <View style={styles.headerRow}>
                                            <Text style={styles.title}>{item.title}</Text>
                                            <Text style={[styles.status, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                                        </View>
                                        <Text style={styles.date}>Due: {item.dueDate}</Text>
                                    </View>
                                    <Text style={styles.amount}>₹{item.amount.toLocaleString()}</Text>
                                </View>
                            </LuxuryCard>
                        ))}
                    </View>
                )}

            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add New Fee</Text>
                            <Pressable onPress={() => setModalVisible(false)}><X color="#FFF" size={24} /></Pressable>
                        </View>

                        <Text style={styles.inputLabel}>Title</Text>
                        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Term 1 Fee" placeholderTextColor="#555" />

                        <Text style={styles.inputLabel}>Amount (₹)</Text>
                        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />

                        <Text style={styles.inputLabel}>Due Date (YYYY-MM-DD)</Text>
                        <TextInput style={styles.input} value={dueDate} onChangeText={setDueDate} placeholder="2026-03-15" placeholderTextColor="#555" />

                        <Pressable style={styles.saveBtn} onPress={handleAddFee}>
                            <Text style={styles.btnText}>Add Fee</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#EF4444' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },

    emptyState: { alignItems: 'center', marginTop: 80, opacity: 0.6 },
    emptyText: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 8 },
    emptySub: { color: '#A1A1AA', textAlign: 'center' },

    timeline: { paddingLeft: 12 },
    line: { position: 'absolute', left: 28, top: 20, bottom: 20, width: 2, backgroundColor: '#FFFFFF10' },
    eventCard: { padding: 16, marginBottom: 16, marginLeft: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    dot: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', position: 'absolute', left: -44, zIndex: 1 },
    details: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, paddingRight: 8 },
    title: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    status: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    date: { color: '#52525B', fontSize: 12 },
    amount: { color: '#FFF', fontWeight: '700', fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 8 },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 16 },
    saveBtn: { backgroundColor: '#EF4444', padding: 16, borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
