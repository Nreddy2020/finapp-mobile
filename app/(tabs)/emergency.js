import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, Modal, Share, TextInput, FlatList, Alert } from 'react-native';
import { AlertCircle, Shield, TrendingUp, Phone, Heart, X, CheckCircle, AlertTriangle, Users, Copy, MessageCircle, Plus, Minus, History, Eye, EyeOff, Lock } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StatCard from '../../components/ui/StatCard';
import StackHeader from '../../components/ui/StackHeader';
import { loadData, saveData, STORAGE_KEYS } from '../../services/storage';

export default function EmergencyScreen() {
    const router = useRouter();
    const [emergencyFund, setEmergencyFund] = useState({
        current_balance: 0,
        target_amount: 50000,
        transactions: []
    });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [crisisModalVisible, setCrisisModalVisible] = useState(false);
    const [manageModalVisible, setManageModalVisible] = useState(false);
    const [transactionAmount, setTransactionAmount] = useState('');
    const [transactionNote, setTransactionNote] = useState('');
    const [transactionType, setTransactionType] = useState('DEPOSIT');
    const [isPrivate, setIsPrivate] = useState(false);

    const [contacts, setContacts] = useState([
        { id: 1, name: 'Mom', relation: 'Family', phone: '9876543210' },
        { id: 2, name: 'Rahul (Brother)', relation: 'Family', phone: '9876543211' }
    ]);

    const THEME_COLOR = '#EF4444'; // Red for emergency
    const MONTHLY_EXPENSES = 15000; // Hardcoded for now, could be dynamic

    useEffect(() => {
        loadEmergencyFund();
    }, []);

    const loadEmergencyFund = async () => {
        try {
            const data = await loadData(STORAGE_KEYS.EMERGENCY_FUND, null);
            if (data) {
                setEmergencyFund(data);
            } else {
                // Initialize default
                const initialData = {
                    current_balance: 0,
                    target_amount: 50000,
                    transactions: []
                };
                setEmergencyFund(initialData);
                await saveData(STORAGE_KEYS.EMERGENCY_FUND, initialData);
            }
        } catch (error) {
            console.error('Error loading emergency fund:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadEmergencyFund();
    };

    const calculateProgress = () => {
        if (!emergencyFund || !emergencyFund.target_amount) return 0;
        return ((emergencyFund.current_balance ?? 0) / emergencyFund.target_amount) * 100;
    };

    const handleTransaction = async () => {
        if (!transactionAmount) return;

        // Validation: Withdrawals must have a note
        if (transactionType === 'WITHDRAW' && !transactionNote.trim()) {
            Alert.alert('Reason Required', 'Please add a note explaining why you are withdrawing from the emergency fund.');
            return;
        }

        const amount = parseInt(transactionAmount);
        if (isNaN(amount) || amount <= 0) return;

        const newTransaction = {
            id: Date.now(),
            type: transactionType,
            amount: amount,
            date: new Date().toISOString(),
            note: transactionNote || (transactionType === 'DEPOSIT' ? 'Manual Deposit' : 'Withdrawal')
        };

        const newBalance = transactionType === 'DEPOSIT'
            ? emergencyFund.current_balance + amount
            : emergencyFund.current_balance - amount;

        const updatedData = {
            ...emergencyFund,
            current_balance: Math.max(0, newBalance),
            transactions: [newTransaction, ...emergencyFund.transactions]
        };

        setEmergencyFund(updatedData);
        await saveData(STORAGE_KEYS.EMERGENCY_FUND, updatedData);

        setManageModalVisible(false);
        setTransactionAmount('');
        setTransactionNote('');
    };

    const quickAddFund = async (amount) => {
        const newTransaction = {
            id: Date.now(),
            type: 'DEPOSIT',
            amount: amount,
            date: new Date().toISOString(),
            note: 'Quick Add'
        };

        const updatedData = {
            ...emergencyFund,
            current_balance: emergencyFund.current_balance + amount,
            transactions: [newTransaction, ...emergencyFund.transactions]
        };

        setEmergencyFund(updatedData);
        await saveData(STORAGE_KEYS.EMERGENCY_FUND, updatedData);
    };

    const handleRecurringDeposit = () => {
        Alert.alert(
            "Setup Recurring Deposit",
            "This will simulate a monthly deduction of ₹5,000.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm", onPress: () => {
                        Alert.alert("Success", "Recurring deposit active! Next deduction: 1st of next month.");
                        // Simulate setup (in real app, use BackgroundFetch)
                    }
                }
            ]
        );
    };

    const SCHEMES = [
        { id: 1, name: "Atal Pension Yojana", eligibility: "Age 18-40", benefit: "Pension ₹1k-5k" },
        { id: 2, name: "PM Jeevan Jyoti", eligibility: "Age 18-50", benefit: "Life cover ₹2 Lakh" },
        { id: 3, name: "PM Suraksha Bima", eligibility: "Age 18-70", benefit: "Accidental cover ₹2 Lakh" }
    ];

    const checkeligibility = (scheme) => {
        Alert.alert(
            "Checking Eligibility...",
            ` Analyzing profile for ${scheme.name}...`,
            [
                { text: "Cancel", style: "cancel" },
                { text: "Simulate Success", onPress: () => Alert.alert("You are Eligible! ✅", `You meet the criteria for ${scheme.name}. Apply via your bank.`) },
                { text: "Simulate Fail", onPress: () => Alert.alert("Not Eligible ❌", "You do not meet the age requirements.") }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <Shield size={48} color={THEME_COLOR} />
                <Text style={styles.loadingText}>Loading emergency fund...</Text>
            </View>
        );
    }

    const progress = calculateProgress();
    const daysCovered = Math.floor((emergencyFund?.current_balance ?? 0) / (MONTHLY_EXPENSES / 30));

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME_COLOR} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <StackHeader title="Emergency" subtitle="Your Safety Net">
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                        <Pressable
                            style={[styles.crisisButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#FFFFFF20' }]}
                            onPress={() => setIsPrivate(!isPrivate)}
                        >
                            {isPrivate ? <EyeOff size={20} color="#71717A" /> : <Eye size={20} color="#71717A" />}
                        </Pressable>
                        <Pressable
                            style={styles.crisisButton}
                            onPress={() => setCrisisModalVisible(true)}
                        >
                            <AlertCircle size={24} color="#FFFFFF" strokeWidth={2.5} />
                            <Text style={styles.crisisButtonText}>Crisis Mode</Text>
                        </Pressable>
                    </View>
                </StackHeader>

                {/* Emergency Fund Progress */}
                <View style={styles.heroSection}>
                    <LuxuryCard style={styles.heroCard} index={0}>
                        <LinearGradient
                            colors={['#EF444420', '#18181B']}
                            style={styles.heroGradient}
                        >
                            <View style={styles.heroContent}>
                                <View style={styles.progressContainer}>
                                    <View style={styles.circularProgress}>
                                        <Text style={styles.progressPercentage}>
                                            {isPrivate ? '•••' : `${Math.round(progress)}%`}
                                        </Text>
                                        <Text style={styles.progressLabel}>Protected</Text>
                                    </View>
                                </View>

                                <View style={styles.fundDetails}>
                                    <Text style={styles.fundLabel}>Emergency Fund Balance</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <Text style={styles.fundAmount}>
                                            {isPrivate ? '₹ ••••••' : `₹${(emergencyFund?.current_balance ?? 0).toLocaleString('en-IN')}`}
                                        </Text>
                                        {isPrivate && <Lock size={16} color="#71717A" />}
                                    </View>
                                    <Text style={styles.fundTarget}>Target: ₹{(emergencyFund?.target_amount ?? 50000).toLocaleString('en-IN')}</Text>

                                    <View style={styles.daysCovered}>
                                        <Shield size={20} color={progress > 50 ? '#10B981' : '#F59E0B'} />
                                        <Text style={[styles.daysText, { color: progress > 50 ? '#10B981' : '#F59E0B' }]}>
                                            {daysCovered} days covered
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            {/* Actions */}
                            <View style={styles.quickAddSection}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <Text style={styles.quickAddLabel}>Quick Actions</Text>
                                    <Pressable onPress={() => { setTransactionType('DEPOSIT'); setManageModalVisible(true); }}>
                                        <Text style={{ color: '#6366F1', fontWeight: '700', fontSize: 13 }}>+ Custom Deposit</Text>
                                    </Pressable>
                                </View>
                                <View style={styles.quickAddButtons}>
                                    <Pressable style={styles.quickAddButton} onPress={() => quickAddFund(100)}>
                                        <Text style={styles.quickAddButtonText}>+₹100</Text>
                                    </Pressable>
                                    <Pressable style={styles.quickAddButton} onPress={handleRecurringDeposit}>
                                        <Text style={styles.quickAddButtonText}>Auto-Save</Text>
                                    </Pressable>
                                    <Pressable style={[styles.quickAddButton, { borderColor: '#6366F1', backgroundColor: '#6366F120' }]} onPress={() => { setTransactionType('WITHDRAW'); setManageModalVisible(true); }}>
                                        <Text style={[styles.quickAddButtonText, { color: '#6366F1' }]}>Withdraw</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </LinearGradient>
                    </LuxuryCard>
                </View>

                {/* Recent Transactions */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    {emergencyFund.transactions.length === 0 ? (
                        <Text style={{ color: '#555', fontStyle: 'italic' }}>No transactions yet.</Text>
                    ) : (
                        emergencyFund.transactions.slice(0, 5).map((tx) => (
                            <LuxuryCard key={tx.id} style={styles.txCard}>
                                <View style={styles.txRow}>
                                    <View style={[styles.txIcon, { backgroundColor: tx.type === 'DEPOSIT' ? '#10B98120' : '#EF444420' }]}>
                                        {tx.type === 'DEPOSIT' ? <Plus size={16} color="#10B981" /> : <Minus size={16} color="#EF4444" />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.txNote}>{tx.note}</Text>
                                        <Text style={styles.txDate}>{new Date(tx.date).toLocaleDateString()}</Text>
                                    </View>
                                    <Text style={[styles.txAmount, { color: tx.type === 'DEPOSIT' ? '#10B981' : '#EF4444' }]}>
                                        {tx.type === 'DEPOSIT' ? '+' : '-'}₹{tx.amount}
                                    </Text>
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                {/* Stats */}
                <View style={styles.statsSection}>
                    <StatCard
                        icon={TrendingUp}
                        label="Recommended Target"
                        value={`₹${(MONTHLY_EXPENSES * 3).toLocaleString('en-IN')}`}
                        subtitle="3 months expenses"
                        color="#10B981"
                    />
                    <StatCard
                        icon={Heart}
                        label="Peace of Mind"
                        value={progress > 50 ? "Good" : "Building"}
                        subtitle={progress > 50 ? "You're protected" : "Keep saving"}
                        color={progress > 50 ? "#10B981" : "#F59E0B"}
                    />
                </View>

                {/* Government Schemes */}
                <View style={styles.schemesSection}>
                    <Text style={styles.sectionTitle}>Government Security Schemes</Text>
                    {SCHEMES.map((scheme, index) => (
                        <LuxuryCard key={scheme.id} index={index + 2} style={[styles.schemeCard, { marginBottom: 12 }]}>
                            <View style={styles.schemeHeader}>
                                <Shield size={24} color="#6366F1" />
                                <View>
                                    <Text style={styles.schemeName}>{scheme.name}</Text>
                                    <Text style={{ color: '#A1A1AA', fontSize: 12 }}>{scheme.eligibility}</Text>
                                </View>
                            </View>
                            <Text style={styles.schemeDescription}>Benefit: {scheme.benefit}</Text>
                            <Pressable style={styles.schemeButton} onPress={() => checkeligibility(scheme)}>
                                <Text style={styles.schemeButtonText}>Check Eligibility</Text>
                            </Pressable>
                        </LuxuryCard>
                    ))}
                </View>

                {/* Why Emergency Fund */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>Why Emergency Fund?</Text>
                    <LuxuryCard style={styles.infoCard} index={1}>
                        <View style={styles.infoItem}>
                            <CheckCircle size={20} color="#10B981" />
                            <Text style={styles.infoText}>Medical emergencies without debt</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <CheckCircle size={20} color="#10B981" />
                            <Text style={styles.infoText}>Job loss protection</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <CheckCircle size={20} color="#10B981" />
                            <Text style={styles.infoText}>Unexpected repairs covered</Text>
                        </View>
                        <View style={styles.infoItem}>
                            <CheckCircle size={20} color="#10B981" />
                            <Text style={styles.infoText}>Peace of mind for family</Text>
                        </View>
                    </LuxuryCard>
                </View>

            </ScrollView>

            {/* Manage Fund Modal */}
            <Modal
                transparent={true}
                visible={manageModalVisible}
                animationType="slide"
                onRequestClose={() => setManageModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.manageModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.manageTitle}>{transactionType === 'DEPOSIT' ? 'Add Funds' : 'Withdraw Funds'}</Text>
                            <Pressable onPress={() => setManageModalVisible(false)}>
                                <X color="#FFF" size={24} />
                            </Pressable>
                        </View>

                        <Text style={styles.label}>Amount (₹)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter amount"
                            placeholderTextColor="#555"
                            keyboardType="numeric"
                            value={transactionAmount}
                            onChangeText={setTransactionAmount}
                        />

                        <Text style={styles.label}>Note (Optional)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder={transactionType === 'DEPOSIT' ? "e.g. Salary Saving" : "e.g. Medical Bill"}
                            placeholderTextColor="#555"
                            value={transactionNote}
                            onChangeText={setTransactionNote}
                        />

                        <Pressable
                            style={[styles.saveBtn, { backgroundColor: transactionType === 'DEPOSIT' ? '#10B981' : '#EF4444' }]}
                            onPress={handleTransaction}
                        >
                            <Text style={styles.saveBtnText}>{transactionType === 'DEPOSIT' ? 'Add to Fund' : 'Withdraw Funds'}</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Crisis Mode Modal - Kept same as before but connected to real data */}
            <Modal
                visible={crisisModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setCrisisModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.crisisModal}>
                        <View style={styles.crisisHeader}>
                            <AlertTriangle size={32} color="#EF4444" />
                            <Text style={styles.crisisTitle}>Crisis Mode</Text>
                            <Pressable onPress={() => setCrisisModalVisible(false)}>
                                <X size={24} color="#A1A1AA" />
                            </Pressable>
                        </View>

                        <ScrollView style={styles.crisisContent}>
                            <Text style={styles.crisisSubtitle}>Immediate Actions</Text>

                            <View style={styles.crisisAction}>
                                <Text style={styles.crisisActionTitle}>1. Check Your Resources</Text>
                                <Text style={styles.crisisActionText}>
                                    Emergency Fund: ₹{(emergencyFund?.current_balance ?? 0).toLocaleString('en-IN')}
                                </Text>
                                {emergencyFund.current_balance > 0 && (
                                    <Pressable
                                        style={{ backgroundColor: '#EF444420', padding: 8, borderRadius: 8, marginTop: 8, alignItems: 'center' }}
                                        onPress={() => { setCrisisModalVisible(false); setTransactionType('WITHDRAW'); setManageModalVisible(true); }}
                                    >
                                        <Text style={{ color: '#EF4444', fontWeight: '700' }}>Withdraw Funds Now</Text>
                                    </Pressable>
                                )}
                            </View>

                            <View style={styles.crisisAction}>
                                <Text style={styles.crisisActionTitle}>2. Quick Loan Options</Text>
                                <Text style={styles.crisisActionText}>Gold Loan: Same day, 10-12% interest</Text>
                                <Text style={styles.crisisActionText}>Personal Loan: 2-3 days, 12-18% interest</Text>
                            </View>

                            {/* ... kept other crisis items ... */}
                            <View style={styles.crisisAction}>
                                <Text style={styles.crisisActionTitle}>3. Ask for Help (Crowdfunding)</Text>
                                <Pressable
                                    style={styles.crowdButton}
                                    onPress={async () => {
                                        try {
                                            await Share.share({
                                                message: `Hi, I'm currently facing a temporary financial emergency and need ₹5,000 urgently for a medical expense. I will return this by next month. Any help is appreciated.`,
                                            });
                                        } catch (error) {
                                            console.log(error);
                                        }
                                    }}
                                >
                                    <MessageCircle size={16} color="#FFFFFF" />
                                    <Text style={styles.crowdButtonText}>Generate WhatsApp Message</Text>
                                </Pressable>
                            </View>
                        </ScrollView>

                        <Pressable
                            style={styles.closeButton}
                            onPress={() => setCrisisModalVisible(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    loadingContainer: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', gap: 16 },
    loadingText: { color: '#71717A', fontSize: 16, fontWeight: '600' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 6, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 28, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    crisisButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, gap: 8 },
    crisisButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    heroSection: { paddingHorizontal: 24, marginBottom: 24 },
    heroCard: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF10' },
    heroGradient: { padding: 24 },
    heroContent: { flexDirection: 'row', gap: 24, marginBottom: 24 },
    progressContainer: { alignItems: 'center' },
    circularProgress: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#18181B', borderWidth: 8, borderColor: '#EF4444', justifyContent: 'center', alignItems: 'center' },
    progressPercentage: { fontSize: 32, fontWeight: '900', color: '#FFFFFF' },
    progressLabel: { fontSize: 12, color: '#71717A', fontWeight: '600' },
    fundDetails: { flex: 1 },
    fundLabel: { fontSize: 13, color: '#71717A', fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 },
    fundAmount: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', marginBottom: 4 },
    fundTarget: { fontSize: 14, color: '#A1A1AA', fontWeight: '600', marginBottom: 16 },
    daysCovered: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF08', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start' },
    daysText: { fontSize: 14, fontWeight: '700' },
    quickAddSection: { borderTopWidth: 1, borderTopColor: '#FFFFFF10', paddingTop: 20 },
    quickAddLabel: { fontSize: 13, color: '#71717A', fontWeight: '700', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' },
    quickAddButtons: { flexDirection: 'row', gap: 12 },
    quickAddButton: { flex: 1, backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF4444', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    quickAddButtonText: { color: '#EF4444', fontSize: 14, fontWeight: '700' },
    statsSection: { flexDirection: 'row', gap: 16, paddingHorizontal: 24, marginBottom: 24 },
    infoSection: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 16, letterSpacing: 2, textTransform: 'uppercase' },
    infoCard: { backgroundColor: '#18181B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FFFFFF08', gap: 16 },
    infoItem: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    infoText: { fontSize: 15, color: '#E5E5E5', fontWeight: '600', flex: 1 },
    schemesSection: { paddingHorizontal: 24, marginBottom: 24 },
    schemeCard: { backgroundColor: '#18181B', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#6366F120' },
    schemeHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    schemeName: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
    schemeDescription: { fontSize: 14, color: '#A1A1AA', fontWeight: '600', marginBottom: 16 },
    schemeButton: { backgroundColor: '#6366F1', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
    schemeButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    modalOverlay: { flex: 1, backgroundColor: '#00000090', justifyContent: 'flex-end' },
    crisisModal: { backgroundColor: '#18181B', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '80%' },
    manageModal: { backgroundColor: '#18181B', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
    crisisHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
    crisisTitle: { fontSize: 24, fontWeight: '900', color: '#FFFFFF', flex: 1, marginLeft: 12 },
    manageTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
    crisisContent: { padding: 24 },
    crisisSubtitle: { fontSize: 16, fontWeight: '800', color: '#A1A1AA', marginBottom: 20, letterSpacing: 1, textTransform: 'uppercase' },
    crisisAction: { marginBottom: 24 },
    crisisActionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
    crisisActionText: { fontSize: 14, color: '#A1A1AA', fontWeight: '600', marginBottom: 4 },
    helplineButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 8, marginTop: 8 },
    helplineText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    crowdButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#6366F1', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, gap: 8, marginTop: 8 },
    crowdButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    contactsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    contactChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, gap: 6 },
    addContactChip: { borderStyle: 'dashed', borderColor: '#FFFFFF30' },
    contactName: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
    addContactText: { color: '#71717A', fontSize: 13, fontWeight: '600' },
    closeButton: { backgroundColor: '#EF4444', margin: 24, paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
    closeButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    label: { fontSize: 13, color: '#A1A1AA', marginBottom: 8, fontWeight: '600' },
    input: { backgroundColor: '#000', borderRadius: 12, padding: 16, color: '#FFF', marginBottom: 20, borderWidth: 1, borderColor: '#333' },
    saveBtn: { borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 10 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    txCard: { marginBottom: 12, padding: 16, backgroundColor: '#18181B', borderRadius: 16 },
    txRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    txIcon: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    txNote: { color: '#FFF', fontWeight: '600', fontSize: 14, marginBottom: 2 },
    txDate: { color: '#555', fontSize: 11 },
    txAmount: { fontSize: 15, fontWeight: '700' }
});
