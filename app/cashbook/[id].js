import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { loadData, saveData, STORAGE_KEYS } from '../../services/storage';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight, Plus, Trash2, Calendar, FileText } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function CashbookDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [book, setBook] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // 'all', 'in', 'out'

    // Transaction Form State
    const [modalVisible, setModalVisible] = useState(false);
    const [txType, setTxType] = useState('in'); // 'in' or 'out'
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');

    const fetchBook = async () => {
        const allBooks = await loadData(STORAGE_KEYS.CASHBOOKS, []);
        const foundBook = allBooks.find(b => b.id === id);
        if (foundBook) {
            setBook(foundBook);
            setTransactions(foundBook.transactions || []);
        } else {
            Alert.alert('Error', 'Cashbook not found');
            router.back();
        }
        setLoading(false);
    };

    useEffect(() => {
        if (id) fetchBook();
    }, [id]);

    const handleAddTransaction = async () => {
        if (!amount || isNaN(amount)) {
            Alert.alert('Invalid Amount', 'Please enter a valid number');
            return;
        }

        const newTx = {
            id: Date.now().toString(),
            type: txType,
            amount: parseFloat(amount),
            note: note || (txType === 'in' ? 'Cash In' : 'Cash Out'),
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
        };

        const updatedTxs = [newTx, ...transactions];

        // Update Balance
        const currentBalance = parseFloat(book.balance || 0);
        const txAmount = parseFloat(amount);
        const newBalance = txType === 'in' ? currentBalance + txAmount : currentBalance - txAmount;

        // Update Totals
        const totalIn = txType === 'in' ? parseFloat(book.total_in || 0) + txAmount : parseFloat(book.total_in || 0);
        const totalOut = txType === 'out' ? parseFloat(book.total_out || 0) + txAmount : parseFloat(book.total_out || 0);

        const updatedBook = {
            ...book,
            balance: newBalance,
            transactions: updatedTxs,
            total_in: totalIn,
            total_out: totalOut,
            last_updated: new Date().toLocaleDateString()
        };

        // Save to Storage
        const allBooks = await loadData(STORAGE_KEYS.CASHBOOKS, []);
        const updatedBooks = allBooks.map(b => b.id === id ? updatedBook : b);
        await saveData(STORAGE_KEYS.CASHBOOKS, updatedBooks);

        setBook(updatedBook);
        setTransactions(updatedTxs);
        setModalVisible(false);
        setAmount('');
        setNote('');
    };

    const handleDeleteTx = async (txId) => {
        const txToDelete = transactions.find(t => t.id === txId);
        if (!txToDelete) return;

        const txAmount = parseFloat(txToDelete.amount);
        const newBalance = txToDelete.type === 'in' ? book.balance - txAmount : book.balance + txAmount;

        const updatedTxs = transactions.filter(t => t.id !== txId);
        const updatedBook = { ...book, balance: newBalance, transactions: updatedTxs };

        const allBooks = await loadData(STORAGE_KEYS.CASHBOOKS, []);
        const updatedBooks = allBooks.map(b => b.id === id ? updatedBook : b);
        await saveData(STORAGE_KEYS.CASHBOOKS, updatedBooks);

        setBook(updatedBook);
        setTransactions(updatedTxs);
    };

    if (loading || !book) return <View style={styles.container}><Text style={{ color: '#fff', marginTop: 50, textAlign: 'center' }}>Loading...</Text></View>;

    // Filter transactions
    const filteredTxs = transactions.filter(t => {
        if (filter === 'all') return true;
        return t.type === filter;
    });

    // Group transactions
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const groupedTxs = { Today: [], Yesterday: [], Earlier: [] };
    filteredTxs.forEach(t => {
        if (t.date === todayStr) groupedTxs.Today.push(t);
        else if (t.date === yesterdayStr) groupedTxs.Yesterday.push(t);
        else groupedTxs.Earlier.push(t);
    });

    return (
        <AnimatedScreen style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>{book.name}</Text>
                    <Text style={styles.headerSubtitle}>{book.type.toUpperCase()} LEDGER</Text>
                </View>
                <View style={{ width: 40 }} />
            </View>

            {/* Balance Card */}
            <View style={styles.balanceCard}>
                <LinearGradient
                    colors={['#4F46E540', '#00000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGlow}
                />
                <Text style={styles.balanceLabel}>Current Balance</Text>
                <Text style={[styles.balanceValue, { color: book.balance < 0 ? '#EF4444' : '#10B981' }]}>
                    {book.currency}{book.balance.toLocaleString()}
                </Text>
                <View style={styles.statsRow}>
                    <View style={styles.stat}>
                        <ArrowDownLeft size={16} color="#10B981" />
                        <Text style={styles.statText}>In: {book.currency}{book.total_in?.toLocaleString()}</Text>
                    </View>
                    <View style={styles.stat}>
                        <ArrowUpRight size={16} color="#EF4444" />
                        <Text style={styles.statText}>Out: {book.currency}{book.total_out?.toLocaleString()}</Text>
                    </View>
                </View>
            </View>

            {/* Filters Row */}
            <View style={styles.filterRow}>
                {['all', 'in', 'out'].map(f => (
                    <TouchableOpacity 
                        key={f} 
                        style={[styles.filterChip, filter === f && styles.filterChipActive]} 
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                            {f === 'all' ? 'All' : f === 'in' ? 'Cash In' : 'Cash Out'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Transactions List */}
            <ScrollView style={styles.list}>
                {filteredTxs.length === 0 ? (
                    <Text style={styles.emptyText}>No matching transactions found.</Text>
                ) : (
                    ['Today', 'Yesterday', 'Earlier'].map(group => {
                        const items = groupedTxs[group];
                        if (items.length === 0) return null;
                        return (
                            <View key={group}>
                                <Text style={styles.dateGroupHeader}>{group}</Text>
                                {items.map((tx) => (
                                    <LuxuryCard key={tx.id} style={styles.txCard}>
                                        <View style={[styles.txIcon, { backgroundColor: tx.type === 'in' ? '#10B98120' : '#EF444420' }]}>
                                            {tx.type === 'in' ? <ArrowDownLeft size={20} color="#10B981" /> : <ArrowUpRight size={20} color="#EF4444" />}
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.txNote}>{tx.note}</Text>
                                            <Text style={styles.txDate}>{tx.date}</Text>
                                        </View>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={[styles.txAmount, { color: tx.type === 'in' ? '#10B981' : '#EF4444' }]}>
                                                {tx.type === 'in' ? '+' : '-'}{book.currency}{tx.amount.toLocaleString()}
                                            </Text>
                                            <TouchableOpacity onPress={() => handleDeleteTx(tx.id)}>
                                                <Trash2 size={14} color="#52525B" style={{ marginTop: 8 }} />
                                            </TouchableOpacity>
                                        </View>
                                    </LuxuryCard>
                                ))}
                            </View>
                        );
                    })
                )}
                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ABSOLUTE BOTTOM ACTION BAR */}
            <View style={styles.actionBar}>
                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#10B98120', borderColor: '#10B98150' }]}
                    onPress={() => { setTxType('in'); setModalVisible(true); }}
                >
                    <ArrowDownLeft size={20} color="#10B981" />
                    <Text style={[styles.actionBtnText, { color: '#10B981' }]}>Cash In</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: '#EF444420', borderColor: '#EF444450' }]}
                    onPress={() => { setTxType('out'); setModalVisible(true); }}
                >
                    <ArrowUpRight size={20} color="#EF4444" />
                    <Text style={[styles.actionBtnText, { color: '#EF4444' }]}>Cash Out</Text>
                </TouchableOpacity>
            </View>

            {/* INPUT MODAL */}
            {modalVisible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{txType === 'in' ? 'Received Cash' : 'Paid Cash'}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Amount"
                            placeholderTextColor="#52525B"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            autoFocus
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Note (Optional)"
                            placeholderTextColor="#52525B"
                            value={note}
                            onChangeText={setNote}
                        />
                        <View style={styles.modalActions}>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAddTransaction} style={styles.saveBtn}>
                                <Text style={styles.saveText}>Save Transaction</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
    backBtn: { padding: 8, backgroundColor: '#18181B', borderRadius: 12 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    headerSubtitle: { fontSize: 10, color: '#A1A1AA', textAlign: 'center', letterSpacing: 1 },
    balanceCard: { margin: 24, padding: 32, backgroundColor: '#18181B', borderRadius: 24, overflow: 'hidden', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    cardGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    balanceLabel: { color: '#A1A1AA', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    balanceValue: { fontSize: 42, fontWeight: '900', color: '#FFF', marginBottom: 24 },
    statsRow: { flexDirection: 'row', gap: 24 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statText: { color: '#D4D4D8', fontSize: 13, fontWeight: '600' },
    filterRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: 24, marginBottom: 16 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    filterChipActive: { backgroundColor: '#4F46E5', borderColor: '#4F46E5' },
    filterChipText: { color: '#A1A1AA', fontSize: 13, fontWeight: '700' },
    filterChipTextActive: { color: '#FFF' },
    list: { flex: 1, paddingHorizontal: 24 },
    dateGroupHeader: { color: '#71717A', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5, marginTop: 16, marginBottom: 12 },
    emptyText: { color: '#52525B', fontStyle: 'italic', textAlign: 'center', marginTop: 40 },
    txCard: { flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 12, backgroundColor: '#18181B', borderRadius: 16, gap: 16 },
    txIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    txNote: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    txDate: { color: '#71717A', fontSize: 12 },
    txAmount: { fontSize: 16, fontWeight: '800' },
    actionBar: { padding: 24, flexDirection: 'row', gap: 16, borderTopWidth: 1, borderTopColor: '#FFFFFF10', backgroundColor: '#000' },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
    actionBtnText: { fontWeight: '800', fontSize: 15 },
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 24 },
    modalContent: { backgroundColor: '#18181B', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF20' },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: '#000', color: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, fontSize: 16, borderWidth: 1, borderColor: '#3F3F46' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#27272A', borderRadius: 12 },
    cancelText: { color: '#FFF', fontWeight: '700' },
    saveBtn: { flex: 1, padding: 16, alignItems: 'center', backgroundColor: '#4F46E5', borderRadius: 12 },
    saveText: { color: '#FFF', fontWeight: '700' }
});
