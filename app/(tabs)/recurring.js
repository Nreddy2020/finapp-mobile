import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { Repeat, Plus, Calendar, CreditCard, Trash2, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { RecurringService } from '../../services/recurring';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';

export default function RecurringScreen() {
    const [subs, setSubs] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);

    // Form
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [frequency, setFrequency] = useState('Monthly');
    const [nextDate, setNextDate] = useState('');

    const fetchSubs = async () => {
        const data = await RecurringService.getSubscriptions();
        setSubs(data);
        setRefreshing(false);
    };

    useEffect(() => {
        fetchSubs();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchSubs();
    };

    const handleAdd = async () => {
        if (!name || !amount) return;
        await RecurringService.addSubscription({ name, amount, frequency, nextDate });
        setModalVisible(false);
        setName('');
        setAmount('');
        fetchSubs();
    };

    const handleDelete = async (id) => {
        await RecurringService.deleteSubscription(id);
        fetchSubs();
    };

    const totalMonthly = subs.reduce((sum, s) => sum + (s.frequency === 'Monthly' ? s.amount : s.amount / 12), 0);
    const THEME_COLOR = '#EC4899'; // Pink

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME_COLOR} />
                }
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerLabel}>Commitments</Text>
                        <Text style={styles.title}>Recurring</Text>
                    </View>
                </View>

                {/* Hero Stats */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Monthly Liability</Text>
                            <Text style={styles.heroAmount}>₹{totalMonthly.toFixed(0)}</Text>
                            <View style={styles.heroFooter}>
                                <View style={styles.heroIconBadge}>
                                    <Repeat size={14} color="#FFFFFF" />
                                </View>
                                <Text style={styles.heroSubtext}>{subs.length} Active Subscriptions</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Subscription List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Subscriptions</Text>

                    {subs.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Repeat size={32} color={THEME_COLOR} />
                            </View>
                            <Text style={styles.emptyText}>No subscriptions</Text>
                        </View>
                    ) : (
                        subs.map((sub, index) => (
                            <LuxuryCard key={sub.id} index={index} style={styles.card}>
                                <View style={styles.cardIcon}>
                                    <Repeat size={24} color={THEME_COLOR} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.subName}>{sub.name}</Text>
                                    <Text style={styles.subDetails}>{sub.frequency} • Next: {sub.nextDate || 'TBD'}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 8 }}>
                                    <Text style={styles.subAmount}>₹{sub.amount}</Text>
                                    <TouchableOpacity onPress={() => handleDelete(sub.id)}>
                                        <Trash2 size={16} color="#52525B" />
                                    </TouchableOpacity>
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                >
                    <Plus size={24} color={THEME_COLOR} />
                    <Text style={styles.addButtonText}>Add Subscription</Text>
                </LuxuryCard>
            </ScrollView>

            {/* Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Subscription</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.inputLabel}>Name</Text>
                        <TextInput style={styles.input} placeholder="Netflix, Gym, etc." placeholderTextColor="#52525B" value={name} onChangeText={setName} />

                        <Text style={styles.inputLabel}>Amount (₹)</Text>
                        <TextInput style={styles.input} placeholder="1000" placeholderTextColor="#52525B" keyboardType="numeric" value={amount} onChangeText={setAmount} />

                        <Text style={styles.inputLabel}>Cycle</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                            {['Monthly', 'Yearly'].map(f => (
                                <TouchableOpacity key={f} onPress={() => setFrequency(f)} style={[styles.freqBtn, frequency === f && styles.freqBtnActive]}>
                                    <Text style={[styles.freqText, frequency === f && { color: '#FFF' }]}>{f}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.inputLabel}>Next Payment Date</Text>
                        <TextInput style={styles.input} placeholder="YYYY-MM-DD" placeholderTextColor="#52525B" value={nextDate} onChangeText={setNextDate} />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleAdd}>
                            <Text style={styles.saveBtnText}>Save</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    scrollView: { flex: 1 },
    header: { padding: 24, paddingTop: 60 },
    headerLabel: { fontSize: 13, color: '#71717A', fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFF' },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { backgroundColor: '#18181B', borderRadius: 32, padding: 32, position: 'relative', overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF10' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    heroLabel: { color: '#A1A1AA', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    heroAmount: { fontSize: 42, fontWeight: '900', color: '#FFF', marginVertical: 12 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    heroIconBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#EC4899', alignItems: 'center', justifyContent: 'center' },
    heroSubtext: { color: '#FFFFFF80', fontWeight: '600' },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', padding: 20, borderRadius: 24, marginBottom: 12, gap: 16 },
    cardIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#EC489915', alignItems: 'center', justifyContent: 'center' },
    subName: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    subDetails: { color: '#71717A', fontSize: 12, marginTop: 4 },
    subAmount: { color: '#EC4899', fontSize: 16, fontWeight: '700' },
    emptyCard: { padding: 40, alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#333', borderRadius: 24 },
    emptyText: { color: '#666', marginTop: 16, fontWeight: '700' },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#EC489950' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#EC4899' },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#18181B', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', justifyConent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#FFF' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
    input: { backgroundColor: '#000', color: '#FFF', padding: 16, borderRadius: 12, marginBottom: 20, fontSize: 16, borderWidth: 1, borderColor: '#3F3F46' },
    saveBtn: { backgroundColor: '#EC4899', padding: 16, borderRadius: 12, alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    freqBtn: { flex: 1, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#333', alignItems: 'center' },
    freqBtnActive: { backgroundColor: '#EC4899', borderColor: '#EC4899' },
    freqText: { color: '#777', fontWeight: '700' },
});
