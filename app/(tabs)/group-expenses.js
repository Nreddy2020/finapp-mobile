import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, TextInput, Modal, Alert } from 'react-native';
import { Users, Plus, TrendingUp, Sparkles, Receipt, ChevronRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import LuxuryEmptyState from '../../components/ui/LuxuryEmptyState';
import { GroupService } from '../../services/groups';

export default function GroupExpensesScreen() {
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Modals
    const [createGroupVisible, setCreateGroupVisible] = useState(false);
    const [addExpenseVisible, setAddExpenseVisible] = useState(false);

    // Form States
    const [groupName, setGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [expenseDesc, setExpenseDesc] = useState('');
    const [expenseAmount, setExpenseAmount] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await GroupService.getGroups();
        setGroups(data);
        setLoading(false);
        setRefreshing(false);
    };

    const handleCreateGroup = async () => {
        if (!groupName) return;
        const newGroup = { name: groupName, members: ['You', 'Friend 1'] }; // Mock members
        const updated = await GroupService.createGroup(newGroup);
        setGroups(updated);
        setCreateGroupVisible(false);
        setGroupName('');
    };

    const handleAddExpense = async () => {
        if (!selectedGroup || !expenseDesc || !expenseAmount) return;
        const expense = {
            description: expenseDesc,
            amount: expenseAmount,
            paidBy: 'You'
        };
        const updated = await GroupService.addExpense(selectedGroup.id, expense);
        setGroups(updated);
        setAddExpenseVisible(false);
        setExpenseDesc('');
        setExpenseAmount('');
    };

    const handleDeleteGroup = async (id) => {
        Alert.alert('Delete Group', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const updated = await GroupService.deleteGroup(id);
                    setGroups(updated);
                }
            }
        ]);
    };

    const getTotalShare = () => {
        return groups.reduce((total, group) => {
            const balances = GroupService.calculateBalances(group);
            return total + (balances['You'] || 0);
        }, 0);
    };

    const totalShare = getTotalShare();
    const THEME_COLOR = '#F43F5E';

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerLabel}>Shared Costs</Text>
                    <Text style={styles.title}>Groups</Text>
                </View>
                <Pressable style={styles.addBtnSmall} onPress={() => setCreateGroupVisible(true)}>
                    <Plus size={24} color="#FFF" />
                </Pressable>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={THEME_COLOR} />}
            >
                {/* Hero Summary */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Net Balance</Text>
                            <Text style={[styles.heroAmount, { color: totalShare >= 0 ? '#10B981' : '#F43F5E' }]}>
                                {totalShare >= 0 ? '+' : ''}₹{Math.abs(totalShare).toLocaleString()}
                            </Text>
                            <Text style={styles.heroSubtext}>across {groups.length} active groups</Text>
                        </View>
                    </View>
                </View>

                {groups.length === 0 ? (
                    <LuxuryEmptyState
                        title="No Groups"
                        subtitle="Create a group to split bills for trips, rent, or dining."
                        icon={Users}
                        themeColor={THEME_COLOR}
                    />
                ) : (
                    groups.map((group, index) => (
                        <LuxuryCard key={group.id} index={index} style={styles.groupCard} onPress={() => {
                            setSelectedGroup(group);
                            setAddExpenseVisible(true);
                        }} onLongPress={() => handleDeleteGroup(group.id)}>
                            <View style={styles.groupHeader}>
                                <Users size={20} color={THEME_COLOR} />
                                <Text style={styles.groupName}>{group.name}</Text>
                                <ChevronRight size={16} color="#71717A" style={{ marginLeft: 'auto' }} />
                            </View>

                            <View style={styles.expenseList}>
                                {group.expenses.length === 0 ? (
                                    <Text style={styles.noExpenses}>No expenses yet</Text>
                                ) : (
                                    group.expenses.slice(0, 3).map(exp => (
                                        <View key={exp.id} style={styles.miniExpense}>
                                            <Text style={styles.miniDesc}>{exp.description}</Text>
                                            <Text style={styles.miniAmount}>₹{exp.amount}</Text>
                                        </View>
                                    ))
                                )}
                            </View>

                            <View style={styles.footer}>
                                <Text style={styles.memberCount}>{group.members.length} members</Text>
                                <Text style={styles.totalExp}>Total: ₹{group.expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</Text>
                            </View>
                        </LuxuryCard>
                    ))
                )}
            </ScrollView>

            {/* Create Group Modal */}
            <Modal visible={createGroupVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Group</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Group Name (e.g. Goa Trip)"
                            placeholderTextColor="#666"
                            value={groupName}
                            onChangeText={setGroupName}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setCreateGroupVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleCreateGroup}>
                                <Text style={styles.btnText}>Create</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Expense Modal */}
            <Modal visible={addExpenseVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Expense to {selectedGroup?.name}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Description (e.g. Dinner)"
                            placeholderTextColor="#666"
                            value={expenseDesc}
                            onChangeText={setExpenseDesc}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Amount (₹)"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={expenseAmount}
                            onChangeText={setExpenseAmount}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setAddExpenseVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleAddExpense}>
                                <Text style={styles.btnText}>Add Split</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    addBtnSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F43F5E', justifyContent: 'center', alignItems: 'center' },

    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 42, fontWeight: '900', color: '#FFFFFF', marginBottom: 8, letterSpacing: -1 },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600' },

    groupCard: { marginHorizontal: 24, marginBottom: 16, padding: 20, backgroundColor: '#18181B' },
    groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    groupName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    expenseList: { gap: 8, marginBottom: 16 },
    noExpenses: { color: '#52525B', fontStyle: 'italic', fontSize: 13 },
    miniExpense: { flexDirection: 'row', justifyContent: 'space-between' },
    miniDesc: { color: '#A1A1AA', fontSize: 14 },
    miniAmount: { color: '#FFF', fontWeight: '600' },
    footer: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#333', paddingTop: 12 },
    memberCount: { color: '#52525B', fontSize: 12 },
    totalExp: { color: '#F43F5E', fontWeight: '700', fontSize: 12 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: '#F43F5E', borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
