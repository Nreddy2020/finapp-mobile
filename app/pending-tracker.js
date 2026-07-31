import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { ChevronLeft, Plus, ArrowUpRight, ArrowDownLeft, Clock, AlertTriangle, X, Check } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { useRouter } from 'expo-router';
import { PendingService } from '../services/pending';

export default function PendingTrackerScreen() {
    const router = useRouter();
    const [tab, setTab] = useState('collect'); // 'collect' | 'pay'
    const [items, setItems] = useState([]);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('collect');

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = async () => {
        const data = await PendingService.getItems();
        setItems(data);
    };

    const handleAddItem = async () => {
        if (!name || !amount) return;
        await PendingService.addItem({
            name,
            amount,
            type: tab, // use current tab as default type
            priority: 'medium',
            dueDate: 'Usually Flexible'
        });
        setModalVisible(false);
        setName('');
        setAmount('');
        loadItems();
    };

    const handleSettle = async (id) => {
        await PendingService.deleteItem(id);
        loadItems();
    };

    const filteredData = items.filter(i => i.type === tab);
    const totalAmount = filteredData.reduce((sum, item) => sum + item.amount, 0);
    const themeColor = tab === 'collect' ? '#10B981' : '#EF4444';

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Pending Payments</Text>
                <Pressable onPress={() => { setType(tab); setModalVisible(true); }} style={[styles.addButton, { backgroundColor: themeColor }]}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <View style={styles.tabs}>
                <Pressable
                    style={[styles.tab, tab === 'collect' && { backgroundColor: '#10B98120', borderColor: '#10B981' }]}
                    onPress={() => setTab('collect')}
                >
                    <ArrowDownLeft size={20} color={tab === 'collect' ? '#10B981' : '#71717A'} />
                    <Text style={[styles.tabText, tab === 'collect' && { color: '#10B981' }]}>To Collect</Text>
                </Pressable>
                <Pressable
                    style={[styles.tab, tab === 'pay' && { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}
                    onPress={() => setTab('pay')}
                >
                    <ArrowUpRight size={20} color={tab === 'pay' ? '#EF4444' : '#71717A'} />
                    <Text style={[styles.tabText, tab === 'pay' && { color: '#EF4444' }]}>To Pay</Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <LuxuryCard style={[styles.summaryCard, { borderColor: themeColor + '30' }]}>
                    <Text style={styles.summaryLabel}>Total {tab === 'collect' ? 'Receivable' : 'Payable'}</Text>
                    <Text style={[styles.summaryValue, { color: themeColor }]}>₹{totalAmount.toLocaleString()}</Text>
                </LuxuryCard>

                <View style={styles.list}>
                    {filteredData.length === 0 ? (
                        <Text style={styles.emptyText}>No pending items here.</Text>
                    ) : (
                        filteredData.map((item, index) => (
                            <LuxuryCard key={item.id} index={index} style={styles.itemCard}>
                                <View style={styles.row}>
                                    <View style={[styles.iconBox, { backgroundColor: themeColor + '20' }]}>
                                        <Clock size={20} color={themeColor} />
                                    </View>
                                    <View style={styles.details}>
                                        <Text style={styles.name}>{item.name}</Text>
                                        <Text style={styles.date}>{item.dueDate}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end', gap: 8 }}>
                                        <Text style={styles.amount}>₹{item.amount}</Text>
                                        <Pressable style={styles.settleBtn} onPress={() => handleSettle(item.id)}>
                                            <Check size={12} color="#A1A1AA" />
                                            <Text style={styles.settleText}>Settle</Text>
                                        </Pressable>
                                    </View>
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>
            </ScrollView>

            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Add {tab === 'collect' ? 'Collection' : 'Debt'}</Text>
                            <Pressable onPress={() => setModalVisible(false)}><X color="#FFF" size={24} /></Pressable>
                        </View>

                        <Text style={styles.inputLabel}>Name (Person/Shop)</Text>
                        <TextInput style={styles.input} value={name} onChangeText={setName} />

                        <Text style={styles.inputLabel}>Amount (₹)</Text>
                        <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="numeric" />

                        <Pressable style={[styles.saveBtn, { backgroundColor: themeColor }]} onPress={handleAddItem}>
                            <Text style={styles.btnText}>Add Item</Text>
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
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    tabs: { flexDirection: 'row', padding: 20, gap: 12 },
    tab: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10', gap: 8 },
    tabText: { color: '#71717A', fontWeight: '600', fontSize: 14 },
    content: { padding: 20, paddingTop: 0 },
    summaryCard: { padding: 24, alignItems: 'center', marginBottom: 24, backgroundColor: '#18181B', borderWidth: 1 },
    summaryLabel: { fontSize: 14, color: '#A1A1AA', marginBottom: 8, textTransform: 'uppercase' },
    summaryValue: { fontSize: 36, fontWeight: '700' },
    list: { gap: 12 },
    itemCard: { padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    details: { flex: 1 },
    name: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 4 },
    date: { fontSize: 12, color: '#A1A1AA' },
    amount: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    settleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    settleText: { fontSize: 10, color: '#A1A1AA' },
    emptyText: { color: '#555', textAlign: 'center', marginTop: 20 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 8 },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 16 },
    saveBtn: { padding: 16, borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
