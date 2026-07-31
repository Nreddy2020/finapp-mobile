import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, Modal, Alert, FlatList } from 'react-native';
import { Users, ChevronLeft, Award, Calendar, CheckCircle, Clock, Plus, DollarSign } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import LuxuryEmptyState from '../components/ui/LuxuryEmptyState';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CommunityService } from '../services/community';

export default function CommunitySavingsScreen() {
    const router = useRouter();
    const [pools, setPools] = useState([]);
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [monthlyContribution, setMonthlyContribution] = useState('');
    const [durationMonths, setDurationMonths] = useState('12');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await CommunityService.getPools();
        setPools(data);
        setLoading(false);
    };

    const handleCreate = async () => {
        if (!name || !monthlyContribution) {
            Alert.alert('Missing Fields', 'Name and Monthly Contribution are required.');
            return;
        }

        const newPool = {
            name,
            targetAmount,
            monthlyContribution,
            durationMonths,
            members: ['You', 'Member 2', 'Member 3'] // Mock members for now
        };

        const updated = await CommunityService.createPool(newPool);
        setPools(updated);
        setModalVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setTargetAmount('');
        setMonthlyContribution('');
        setDurationMonths('12');
    };

    const handleDelete = async (id) => {
        Alert.alert('Delete Pool', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const updated = await CommunityService.deletePool(id);
                    setPools(updated);
                }
            }
        ]);
    };

    const getStatusColor = (status) => {
        if (status === 'Active') return '#10B981';
        if (status === 'Completed') return '#3B82F6';
        return '#71717A';
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Community Savings</Text>
                <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {pools.length === 0 ? (
                    <LuxuryEmptyState
                        title="No Active Groups"
                        subtitle="Join or create a Chit Fund / ROSCA group to save together."
                        icon={Users}
                        themeColor="#4F46E5"
                    />
                ) : (
                    pools.map((pool, index) => {
                        const details = CommunityService.getPoolDetails(pool);
                        return (
                            <View key={pool.id}>
                                {/* Hero Card for first pool (Primary) */}
                                {index === 0 && (
                                    <LuxuryCard style={styles.heroCard} onPress={() => handleDelete(pool.id)}>
                                        <LinearGradient
                                            colors={['#4F46E520', '#000000']}
                                            style={styles.heroGradient}
                                        />
                                        <View style={styles.heroHeader}>
                                            <Award size={24} color="#F59E0B" />
                                            <Text style={styles.heroTitle}>{pool.name}</Text>
                                        </View>
                                        <Text style={styles.payoutAmount}>₹{details.potValue.toLocaleString()}</Text>
                                        <Text style={styles.payoutSub}>Total Pot Value</Text>
                                        <View style={styles.trustBadge}>
                                            <Text style={styles.trustText}>🛡️ Cycle {pool.currentCycle}/{pool.durationMonths}</Text>
                                        </View>
                                    </LuxuryCard>
                                )}

                                {/* List Item for others (or same if only one) */}
                                {index > 0 && (
                                    <LuxuryCard style={styles.groupCard} onPress={() => handleDelete(pool.id)}>
                                        <View style={styles.groupRow}>
                                            <View style={styles.groupIcon}>
                                                <Users size={20} color="#FFF" />
                                            </View>
                                            <View style={styles.groupInfo}>
                                                <Text style={styles.groupName}>{pool.name}</Text>
                                                <Text style={styles.groupMeta}>
                                                    ₹{pool.monthlyContribution}/mo • {pool.members.length} Members
                                                </Text>
                                            </View>
                                            <View style={styles.activeTag}>
                                                <Text style={styles.activeText}>{pool.status}</Text>
                                            </View>
                                        </View>
                                    </LuxuryCard>
                                )}
                            </View>
                        );
                    })
                )}

                {/* Contribution History (Mock for now, visible if active pools exist) */}
                {pools.length > 0 && (
                    <>
                        <Text style={styles.sectionTitle}>Contribution Cycle</Text>
                        <View style={styles.list}>
                            {[1, 2, 3].map((month) => (
                                <LuxuryCard key={month} style={styles.cycleCard}>
                                    <View style={styles.cycleRow}>
                                        <View style={styles.monthBox}>
                                            <Text style={styles.monthNum}>{month}</Text>
                                            <Text style={styles.monthLabel}>Month</Text>
                                        </View>

                                        <View style={styles.cycleDetails}>
                                            <Text style={styles.cycleDate}>Payment Due</Text>
                                            <View style={[styles.statusBadge, { backgroundColor: '#10B98120' }]}>
                                                <Text style={[styles.statusText, { color: '#10B981' }]}>Paid</Text>
                                            </View>
                                        </View>
                                        <CheckCircle size={24} color="#10B981" />
                                    </View>
                                </LuxuryCard>
                            ))}
                        </View>
                    </>
                )}

            </ScrollView>

            {/* Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Create Savings Group</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Group Name (e.g. Family Chit)"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Monthly Contribution (₹)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={monthlyContribution}
                                onChangeText={setMonthlyContribution}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Duration (Months)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={durationMonths}
                                onChangeText={setDurationMonths}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleCreate}>
                                <Text style={styles.btnText}>Create Pool</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

// ... styles remain mostly same, added modal styles
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#4F46E5' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },
    heroCard: { padding: 24, alignItems: 'center', marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#4F46E550' },
    heroGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    heroHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
    heroTitle: { color: '#F59E0B', fontWeight: '700', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1 },
    payoutAmount: { color: '#FFF', fontSize: 42, fontWeight: '900', marginBottom: 4 },
    payoutSub: { color: '#A1A1AA', fontSize: 14, marginBottom: 16 },
    trustBadge: { backgroundColor: '#10B98120', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#10B98150' },
    trustText: { color: '#10B981', fontWeight: '700', fontSize: 12 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    groupCard: { padding: 16, marginBottom: 12, backgroundColor: '#18181B' },
    groupRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    groupIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#4F46E5', justifyContent: 'center', alignItems: 'center' },
    groupInfo: { flex: 1 },
    groupName: { color: '#FFF', fontWeight: '700', fontSize: 16, marginBottom: 4 },
    groupMeta: { color: '#A1A1AA', fontSize: 12 },
    activeTag: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#10B98120', borderRadius: 6 },
    activeText: { color: '#10B981', fontSize: 10, fontWeight: '700' },
    list: { gap: 12 },
    cycleCard: { padding: 16, backgroundColor: '#18181B' },
    cycleRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    monthBox: { width: 40, alignItems: 'center' },
    monthNum: { color: '#FFF', fontWeight: '700', fontSize: 18 },
    monthLabel: { color: '#71717A', fontSize: 10, textTransform: 'uppercase' },
    cycleDetails: { flex: 1 },
    cycleDate: { color: '#FFF', fontSize: 14, fontWeight: '600', marginBottom: 4 },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: '700' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: '#4F46E5', borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
