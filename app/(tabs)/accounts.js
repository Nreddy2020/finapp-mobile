import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, Modal, TextInput, TouchableOpacity, Alert } from 'react-native';
import { Building2, Plus, CreditCard, Sparkles, MessageSquare, Check, X, Bell, Eye, EyeOff, ShieldAlert, Snowflake, Lock, Save } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { SIZES } from '../../constants/theme';
import { AccountsService } from '../../services/accounts';

export default function AccountsScreen() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showHidden, setShowHidden] = useState(false);
    const [mockHiddenAccount] = useState({
        id: 999, bank_name: 'Swiss Vault', type: 'Secret Stash', balance: 500000, isHidden: true
    });

    // Add Account Modal State
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [newAccount, setNewAccount] = useState({
        bankName: '',
        type: 'Savings',
        accountNumber: '',
        balance: ''
    });

    const [pendingTransactions, setPendingTransactions] = useState([
        { id: 1, merchant: 'Netflix', amount: 649, date: 'Today, 9:41 AM', message: 'Debit of ₹649 for Netflix...' },
        { id: 2, merchant: 'Uber Eats', amount: 450, date: 'Yesterday, 8:30 PM', message: 'Paid ₹450 to Uber Eats...' }
    ]);

    const fetchAccounts = async () => {
        try {
            const data = await AccountsService.getAccounts();
            setAccounts(data);
        } catch (error) {
            console.error('Error fetching accounts:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAccounts();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchAccounts();
    };

    const handleApprove = (id) => {
        setPendingTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleReject = (id) => {
        setPendingTransactions(prev => prev.filter(t => t.id !== id));
    };

    const handleAddAccount = async () => {
        if (!newAccount.bankName || !newAccount.balance) {
            Alert.alert('Error', 'Please enter Bank Name and Balance');
            return;
        }

        await AccountsService.addAccount(newAccount);
        setAddModalVisible(false);
        setNewAccount({
            bankName: '',
            type: 'Savings',
            accountNumber: '',
            balance: ''
        });
        fetchAccounts();
    };

    const handleDeleteAccount = async (id) => {
        Alert.alert(
            "Delete Account",
            "Are you sure you want to remove this account?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        await AccountsService.deleteAccount(id);
                        fetchAccounts();
                    }
                }
            ]
        );
    };

    const displayAccounts = showHidden ? [...accounts, mockHiddenAccount] : accounts;
    const totalBalance = displayAccounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
    const THEME_COLOR = '#4F46E5'; // Indigo/Blue

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={THEME_COLOR}
                        colors={[THEME_COLOR]}
                        progressBackgroundColor="#18181B"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <StackHeader title="Accounts" subtitle="Total Balance">
                    <Pressable
                        onPress={() => setShowHidden(!showHidden)}
                        style={{
                            width: 40, height: 40, borderRadius: 20,
                            backgroundColor: '#18181B', justifyContent: 'center', alignItems: 'center',
                            borderWidth: 1, borderColor: '#FFFFFF10'
                        }}
                    >
                        {showHidden ? <EyeOff size={20} color="#FFFFFF" /> : <Eye size={20} color="#FFFFFF" />}
                    </Pressable>
                </StackHeader>

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={['#4F46E560', '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Net Worth</Text>
                            <Text style={styles.heroAmount}>₹{totalBalance.toLocaleString('en-IN')}</Text>
                            <View style={styles.heroFooter}>
                                <View style={styles.heroIconBadge}>
                                    <Sparkles size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>across {accounts.length} active accounts</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Fee Analyzer (World Class Feature) */}
                <View style={{ marginHorizontal: 24, marginBottom: 24, flexDirection: 'row', gap: 12 }}>
                    <LuxuryCard style={{ flex: 1, backgroundColor: '#18181B', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#EF444440' }}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <ShieldAlert size={16} color="#EF4444" />
                        </View>
                        <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Fee Risks</Text>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFF', marginVertical: 4 }}>₹1,200</Text>
                        <Text style={{ fontSize: 10, color: '#71717A' }}>potential monthly fees detected</Text>
                    </LuxuryCard>

                    <LuxuryCard style={{ flex: 1, backgroundColor: '#18181B', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#10B98140' }}>
                        <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#10B98120', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <Sparkles size={16} color="#10B981" />
                        </View>
                        <Text style={{ color: '#A1A1AA', fontSize: 11, fontWeight: '700', textTransform: 'uppercase' }}>Optimized</Text>
                        <Text style={{ fontSize: 20, fontWeight: '800', color: '#FFF', marginVertical: 4 }}>100%</Text>
                        <Text style={{ fontSize: 10, color: '#71717A' }}>of accounts active and healthy</Text>
                    </LuxuryCard>
                </View>

                {/* Pending Approvals Section */}
                {pendingTransactions.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Pending Approvals</Text>
                            <View style={styles.pendingBadge}>
                                <Text style={styles.pendingBadgeText}>{pendingTransactions.length}</Text>
                            </View>
                        </View>
                        {pendingTransactions.map((tx, index) => (
                            <LuxuryCard key={tx.id} index={index} style={styles.pendingCard}>
                                <View style={styles.pendingRow}>
                                    <View style={styles.pendingIcon}>
                                        <MessageSquare size={20} color="#F59E0B" />
                                    </View>
                                    <View style={styles.pendingContent}>
                                        <Text style={styles.pendingMerchant}>{tx.merchant}</Text>
                                        <Text style={styles.pendingAmount}>₹{tx.amount}</Text>
                                        <Text style={styles.pendingDate}>{tx.date}</Text>
                                    </View>
                                    <View style={styles.actionButtons}>
                                        <Pressable style={styles.rejectBtn} onPress={() => handleReject(tx.id)}>
                                            <X size={18} color="#EF4444" />
                                        </Pressable>
                                        <Pressable style={styles.approveBtn} onPress={() => handleApprove(tx.id)}>
                                            <Check size={18} color="#10B981" />
                                        </Pressable>
                                    </View>
                                </View>
                            </LuxuryCard>
                        ))}
                    </View>
                )}

                {/* Accounts List */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Accounts</Text>

                    {displayAccounts.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Building2 size={SIZES.icon.xl} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No accounts linked</Text>
                            <Text style={styles.emptySubtext}>Add a bank account to track funds</Text>
                        </View>
                    ) : (
                        displayAccounts.map((acc, index) => (
                            <LuxuryCard
                                key={index}
                                index={index + pendingTransactions.length}
                                style={[styles.accountCard, acc.isHidden && { borderColor: '#F59E0B60' }]}
                                onPress={() => { }}
                                onLongPress={() => handleDeleteAccount(acc.id)}
                            >
                                <LinearGradient
                                    colors={acc.isHidden ? ['#F59E0B20', '#0000'] : ['#4F46E510', '#00000000']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.cardGlow}
                                />
                                <View style={[styles.cardIcon, acc.isHidden && { backgroundColor: '#F59E0B10', borderColor: '#F59E0B40' }]}>
                                    {acc.isHidden ? <Lock size={24} color="#F59E0B" /> : <Building2 size={SIZES.icon.medium} color="#4F46E5" strokeWidth={2.5} />}
                                </View>
                                <View style={styles.cardContent}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                        <Text style={styles.bankName}>{acc.bank_name}</Text>
                                        {acc.isHidden && <View style={{ backgroundColor: '#F59E0B20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}><Text style={{ fontSize: 8, color: '#F59E0B', fontWeight: '800' }}>SECRET</Text></View>}
                                    </View>
                                    <Text style={styles.accountType}>{acc.type} •••• {acc.account_number?.slice(-4) || '****'}</Text>
                                </View>
                                <View style={styles.cardRight}>
                                    <Text style={styles.balance}>₹{parseFloat(acc.balance).toLocaleString('en-IN')}</Text>
                                    <Pressable onPress={(e) => {
                                        e.stopPropagation();
                                        alert(`❄️ Frozen!\n\n${acc.bank_name} is now temporarily locked.`);
                                    }}>
                                        <Snowflake size={14} color="#52525B" style={{ marginTop: 4, alignSelf: 'flex-end' }} />
                                    </Pressable>
                                </View>
                            </LuxuryCard>
                        ))
                    )}
                </View>

                {/* Add Button */}
                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setAddModalVisible(true)}
                    index={accounts.length + pendingTransactions.length + 1}
                >
                    <Plus size={SIZES.icon.large} color="#4F46E5" strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Link Account</Text>
                </LuxuryCard>
            </ScrollView>

            {/* Add Account Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={addModalVisible}
                onRequestClose={() => setAddModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.addModalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Link Bank Account</Text>
                            <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                                <X size={24} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Bank Name</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="e.g., HDFC Bank"
                                    placeholderTextColor="#52525B"
                                    value={newAccount.bankName}
                                    onChangeText={(text) => setNewAccount({ ...newAccount, bankName: text })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Account Type</Text>
                                <View style={styles.categoryRow}>
                                    {['Savings', 'Current', 'Credit Card'].map((type) => (
                                        <TouchableOpacity
                                            key={type}
                                            style={[
                                                styles.categoryChip,
                                                newAccount.type === type && { backgroundColor: '#4F46E5', borderColor: '#4F46E5' }
                                            ]}
                                            onPress={() => setNewAccount({ ...newAccount, type })}
                                        >
                                            <Text style={[
                                                styles.categoryText,
                                                newAccount.type === type && { color: '#000' }
                                            ]}>{type}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Account Number (Last 4 digits)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="****"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    maxLength={4}
                                    value={newAccount.accountNumber}
                                    onChangeText={(text) => setNewAccount({ ...newAccount, accountNumber: text })}
                                />
                            </View>

                            <View style={styles.inputContainer}>
                                <Text style={styles.inputLabel}>Current Balance (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="0"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={newAccount.balance}
                                    onChangeText={(text) => setNewAccount({ ...newAccount, balance: text })}
                                />
                            </View>

                            <TouchableOpacity style={[styles.saveButton, { backgroundColor: '#4F46E5' }]} onPress={handleAddAccount}>
                                <Save size={20} color="#000000" />
                                <Text style={styles.saveButtonText}>Link Account</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', letterSpacing: 2, textTransform: 'uppercase' },
    pendingBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    pendingBadgeText: { color: '#000', fontSize: 12, fontWeight: '800' },

    pendingCard: { backgroundColor: '#18181B', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F59E0B40' },
    pendingRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    pendingIcon: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F59E0B20', justifyContent: 'center', alignItems: 'center' },
    pendingContent: { flex: 1 },
    pendingMerchant: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    pendingAmount: { color: '#F59E0B', fontWeight: '600', fontSize: 14 },
    pendingDate: { color: '#71717A', fontSize: 12, marginTop: 2 },
    actionButtons: { flexDirection: 'row', gap: 12 },
    rejectBtn: { padding: 8, backgroundColor: '#EF444420', borderRadius: 10 },
    approveBtn: { padding: 8, backgroundColor: '#10B98120', borderRadius: 10 },

    accountCard: { position: 'relative', flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardIcon: { width: SIZES.iconContainer.medium, height: SIZES.iconContainer.medium, borderRadius: SIZES.radius.medium, backgroundColor: '#4F46E510', justifyContent: 'center', alignItems: 'center', marginRight: 20, borderWidth: 1, borderColor: '#4F46E520' },
    cardContent: { flex: 1 },
    bankName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.3 },
    accountType: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    cardRight: { alignItems: 'flex-end' },
    balance: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: SIZES.iconContainer.xl, height: SIZES.iconContainer.xl, borderRadius: SIZES.radius.large, backgroundColor: '#4F46E508', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#4F46E515' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#4F46E550' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#4F46E5', letterSpacing: 0.5 },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    addModalContent: { backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '85%', borderTopWidth: 1, borderColor: '#FFFFFF10' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    modalTitle: { fontSize: 20, fontWeight: '900', color: '#FFFFFF', letterSpacing: -0.5 },
    inputContainer: { marginBottom: 20 },
    inputLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
    input: { backgroundColor: '#000000', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    categoryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    categoryChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF20', backgroundColor: '#000000' },
    categoryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
    saveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 20, borderRadius: 24, marginTop: 20, gap: 10 },
    saveButtonText: { color: '#000000', fontSize: 16, fontWeight: '800' }
});
