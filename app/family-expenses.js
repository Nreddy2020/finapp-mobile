import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, TouchableOpacity, Modal, Alert, FlatList } from 'react-native';
import { Users, ChevronLeft, Plus, DollarSign, ArrowUpRight, ArrowDownLeft, CheckSquare, PiggyBank, Trophy, Shield, X, UserPlus, Receipt } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { FamilyService } from '../services/family';
import LuxuryEmptyState from '../components/ui/LuxuryEmptyState';

// Valid Components
import AllowanceManager from '../components/family/AllowanceManager';
import ChoreRewards from '../components/family/ChoreRewards';
import FamilyVault from '../components/family/FamilyVault';

export default function FamilyExpensesScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState([]);
    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState({});

    // Modals
    const [showAllowance, setShowAllowance] = useState(false);
    const [showChores, setShowChores] = useState(false);
    const [showVault, setShowVault] = useState(false);

    // CRUD Modals
    const [addMemberModal, setAddMemberModal] = useState(false);
    const [addExpenseModal, setAddExpenseModal] = useState(false);

    // Form State
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberRole, setNewMemberRole] = useState('Member');

    const [expTitle, setExpTitle] = useState('');
    const [expAmount, setExpAmount] = useState('');
    const [expPaidBy, setExpPaidBy] = useState('');
    const [expSplit, setExpSplit] = useState([]); // Array of IDs

    useEffect(() => {
        loadFamilyData();
    }, []);

    const loadFamilyData = async () => {
        const { members: m, expenses: e } = await FamilyService.getData();
        // If empty, maybe add default "Me"
        if (m.length === 0) {
            const initialMembers = await FamilyService.addMember('Me', 'Admin');
            setMembers(initialMembers);
            setExpenses(e);
            setBalances(FamilyService.calculateBalances(initialMembers, e));
        } else {
            setMembers(m);
            setExpenses(e);
            setBalances(FamilyService.calculateBalances(m, e));
        }
        setLoading(false);
    };

    const handleAddMember = async () => {
        if (!newMemberName.trim()) return;
        const updated = await FamilyService.addMember(newMemberName, newMemberRole);
        setMembers(updated);
        setBalances(FamilyService.calculateBalances(updated, expenses));
        setAddMemberModal(false);
        setNewMemberName('');
    };

    const handleAddExpense = async () => {
        if (!expTitle || !expAmount || !expPaidBy) {
            Alert.alert("Missing Fields", "Please fill distinct fields.");
            return;
        }

        // Default split: All members if none selected
        const splitWith = expSplit.length > 0 ? expSplit : members.map(m => m.id);

        const updated = await FamilyService.addExpense(expTitle, expAmount, expPaidBy, splitWith);
        setExpenses(updated);
        setBalances(FamilyService.calculateBalances(members, updated));
        setAddExpenseModal(false);
        setExpTitle('');
        setExpAmount('');
        setExpSplit([]);
    };

    const toggleSplitMember = (id) => {
        if (expSplit.includes(id)) {
            setExpSplit(expSplit.filter(m => m !== id));
        } else {
            setExpSplit([...expSplit, id]);
        }
    };

    const getCategoryColor = (cat) => {
        switch (cat) {
            case 'Education': return '#8B5CF6'; // Violet
            case 'Health': return '#EF4444'; // Red
            default: return '#71717A'; // Grey
        }
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Family Expenses</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Pressable style={[styles.addButton, { backgroundColor: '#10B98120' }]} onPress={() => setAddMemberModal(true)}>
                        <UserPlus color="#10B981" size={20} />
                    </Pressable>
                    <Pressable style={styles.addButton} onPress={() => setAddExpenseModal(true)}>
                        <Plus color="#FFFFFF" size={24} />
                    </Pressable>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Net Balances Card */}
                <LuxuryCard style={styles.balanceCard}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Text style={styles.cardTitle}>Net Balances</Text>
                        <TouchableOpacity onPress={async () => {
                            Alert.alert('Settle Debts?', 'Clear all expenses and reset balances?', [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Settle', style: 'destructive', onPress: async () => {
                                        await FamilyService.settleDebts();
                                        loadFamilyData(); // Refresh
                                    }
                                }
                            ]);
                        }}>
                            <Text style={{ color: '#A1A1AA', fontSize: 12, textDecorationLine: 'underline' }}>Settle All</Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.balanceList}>
                        {members.length === 0 ? (
                            <LuxuryEmptyState
                                title="No Family Members"
                                subtitle="Add family members to start tracking expenses."
                                themeColor="#6366F1"
                                icon={Users}
                            />
                        ) : members.map(member => {
                            const bal = balances[member.id] || 0;
                            return (
                                <View key={member.id} style={styles.balanceRow}>
                                    <View style={styles.memberInfo}>
                                        <View style={[styles.avatar, { backgroundColor: member.color || '#333' }]}>
                                            <Text style={styles.avatarText}>{member.name[0]}</Text>
                                        </View>
                                        <Text style={styles.memberName}>{member.name}</Text>
                                    </View>
                                    <View style={styles.amountCol}>
                                        <Text style={[styles.amount, { color: bal >= 0 ? '#10B981' : '#EF4444' }]}>
                                            {bal >= 0 ? `Gets back ₹${bal.toFixed(0)}` : `Owes ₹${Math.abs(bal).toFixed(0)}`}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                </LuxuryCard>

                {/* Family Tools */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24 }}>
                    <TouchableOpacity style={styles.toolBtn} onPress={() => setShowAllowance(true)}>
                        <LinearGradient colors={['#18181B', '#18181B']} style={styles.toolGradient}>
                            <PiggyBank size={20} color="#6366F1" />
                            <Text style={styles.toolText}>Allowance</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn} onPress={() => setShowChores(true)}>
                        <LinearGradient colors={['#18181B', '#18181B']} style={styles.toolGradient}>
                            <Trophy size={20} color="#F59E0B" />
                            <Text style={styles.toolText}>Chores</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.toolBtn} onPress={() => setShowVault(true)}>
                        <LinearGradient colors={['#18181B', '#18181B']} style={styles.toolGradient}>
                            <Shield size={20} color="#8B5CF6" />
                            <Text style={styles.toolText}>Vault</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Recent Expenses */}
                <Text style={styles.sectionTitle}>Recent Expenses</Text>
                <View style={styles.list}>
                    {expenses.length === 0 ? (
                        <LuxuryEmptyState
                            title="No expenses recorded"
                            subtitle="Tap + to add your first shared expense."
                            themeColor="#EF4444"
                            icon={Receipt}
                        />
                    ) : (
                        expenses.map((exp, index) => {
                            const payer = members.find(m => m.id === exp.paidBy);
                            return (
                                <LuxuryCard key={exp.id} index={index} style={styles.expenseCard}>
                                    <View style={styles.expRow}>
                                        <View style={styles.dateBox}>
                                            <Receipt size={16} color="#A1A1AA" />
                                        </View>
                                        <View style={styles.expDetails}>
                                            <Text style={styles.expTitle}>{exp.title}</Text>
                                            <Text style={styles.expPaidBy}>Paid by {payer?.name || 'Unknown'}</Text>
                                        </View>
                                        <Text style={styles.expAmount}>₹{exp.amount}</Text>
                                    </View>
                                </LuxuryCard>
                            );
                        })
                    )}
                </View>
            </ScrollView>

            {/* Add Member Modal */}
            <Modal visible={addMemberModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Family Member</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Name (e.g., Mom)"
                            placeholderTextColor="#666"
                            value={newMemberName}
                            onChangeText={setNewMemberName}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setAddMemberModal(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleAddMember}>
                                <Text style={styles.btnText}>Add</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Add Expense Modal */}
            <Modal visible={addExpenseModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Expense</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Title (e.g., Groceries)"
                            placeholderTextColor="#666"
                            value={expTitle}
                            onChangeText={setExpTitle}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Amount (₹)"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={expAmount}
                            onChangeText={setExpAmount}
                        />

                        <Text style={styles.label}>Paid By:</Text>
                        <ScrollView horizontal style={{ maxHeight: 50, marginBottom: 12 }}>
                            {members.map(m => (
                                <Pressable
                                    key={m.id}
                                    style={[styles.chip, expPaidBy === m.id && styles.activeChip]}
                                    onPress={() => setExpPaidBy(m.id)}
                                >
                                    <Text style={[styles.chipText, expPaidBy === m.id && { color: '#FFF' }]}>{m.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Split With (Select multiple):</Text>
                        <ScrollView horizontal style={{ maxHeight: 50, marginBottom: 20 }}>
                            {members.map(m => (
                                <Pressable
                                    key={m.id}
                                    style={[styles.chip, expSplit.includes(m.id) && styles.activeChip]}
                                    onPress={() => toggleSplitMember(m.id)}
                                >
                                    <Text style={[styles.chipText, expSplit.includes(m.id) && { color: '#FFF' }]}>{m.name}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>

                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setAddExpenseModal(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleAddExpense}>
                                <Text style={styles.btnText}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <AllowanceManager visible={showAllowance} onClose={() => setShowAllowance(false)} />
            <ChoreRewards visible={showChores} onClose={() => setShowChores(false)} />
            <FamilyVault visible={showVault} onClose={() => setShowVault(false)} />
        </AnimatedScreen >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#6366F1' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },
    balanceCard: { padding: 20, marginBottom: 24, backgroundColor: '#18181B' },
    cardTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12 },
    balanceList: { gap: 16 },
    balanceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05' },
    memberInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatar: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 14 },
    memberName: { fontSize: 16, color: '#A1A1AA' },
    amount: { fontSize: 16, fontWeight: '700' },
    toolBtn: { flex: 1, height: 60, borderRadius: 12, overflow: 'hidden' },
    toolGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#FFFFFF10', borderRadius: 12 },
    toolText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    list: { gap: 12 },
    expenseCard: { padding: 16 },
    expRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    dateBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center' },
    expDetails: { flex: 1 },
    expTitle: { fontSize: 16, fontWeight: '600', color: '#FFF' },
    expPaidBy: { fontSize: 12, color: '#A1A1AA' },
    expAmount: { fontSize: 16, fontWeight: '700', color: '#FFF' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 20, textAlign: 'center' },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 12, borderRadius: 12, marginBottom: 16, fontSize: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    cancelBtn: { flex: 1, padding: 14, backgroundColor: '#333', borderRadius: 12, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 14, backgroundColor: '#6366F1', borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    label: { color: '#A1A1AA', fontSize: 12, marginBottom: 8, marginTop: 4 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#27272A', marginRight: 8, borderWidth: 1, borderColor: '#333' },
    activeChip: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    chipText: { color: '#A1A1AA', fontSize: 14 }
});
