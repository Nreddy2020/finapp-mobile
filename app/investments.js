import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, Modal, Alert, FlatList } from 'react-native';
import { TrendingUp, ChevronLeft, Plus, DollarSign, PieChart, ArrowUpRight, ArrowDownRight, Briefcase } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import LuxuryEmptyState from '../components/ui/LuxuryEmptyState';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { InvestmentsService } from '../services/investments';

export default function InvestmentsScreen() {
    const router = useRouter();
    const [investments, setInvestments] = useState([]);
    const [stats, setStats] = useState({ totalInvested: 0, totalValue: 0, totalProfitChange: 0, totalProfitPercent: 0 });
    const [loading, setLoading] = useState(true);

    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState('');
    const [ticker, setTicker] = useState('');
    const [type, setType] = useState('Stock');
    const [investedAmount, setInvestedAmount] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [quantity, setQuantity] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const data = await InvestmentsService.getInvestments();
        setInvestments(data);
        setStats(InvestmentsService.calculatePortfolioStats(data));
        setLoading(false);
    };

    const handleAdd = async () => {
        if (!name || !investedAmount || !currentValue) {
            Alert.alert('Missing Fields', 'Name, Invested Amount, and Current Value are required.');
            return;
        }

        const newInv = {
            name,
            ticker,
            type,
            investedAmount,
            currentValue,
            quantity
        };

        const updated = await InvestmentsService.addInvestment(newInv);
        setInvestments(updated);
        setStats(InvestmentsService.calculatePortfolioStats(updated));
        setModalVisible(false);
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setTicker('');
        setType('Stock');
        setInvestedAmount('');
        setCurrentValue('');
        setQuantity('');
    };

    const handleDelete = async (id) => {
        Alert.alert('Delete Investment', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    const updated = await InvestmentsService.deleteInvestment(id);
                    setInvestments(updated);
                    setStats(InvestmentsService.calculatePortfolioStats(updated));
                }
            }
        ]);
    };

    const getProfitColor = (change) => change >= 0 ? '#10B981' : '#EF4444';

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Investments</Text>
                <Pressable style={styles.addButton} onPress={() => setModalVisible(true)}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Portfolio Summary */}
                <LuxuryCard style={styles.summaryCard}>
                    <View style={styles.summaryHeader}>
                        <Text style={styles.summaryLabel}>TOTAL PORTFOLIO</Text>
                        <View style={[styles.badge, { backgroundColor: getProfitColor(stats.totalProfitChange) + '20' }]}>
                            {stats.totalProfitChange >= 0 ? <ArrowUpRight size={14} color={getProfitColor(stats.totalProfitChange)} /> : <ArrowDownRight size={14} color={getProfitColor(stats.totalProfitChange)} />}
                            <Text style={[styles.badgeText, { color: getProfitColor(stats.totalProfitChange) }]}>
                                {stats.totalProfitPercent.toFixed(2)}%
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.summaryValue}>₹{stats.totalValue.toLocaleString()}</Text>

                    <View style={styles.summaryFooter}>
                        <Text style={styles.FooterLabel}>Invested: </Text>
                        <Text style={styles.FooterValue}>₹{stats.totalInvested.toLocaleString()}</Text>
                        <Text style={[styles.FooterLabel, { marginLeft: 12 }]}>P/L: </Text>
                        <Text style={[styles.FooterValue, { color: getProfitColor(stats.totalProfitChange) }]}>
                            {stats.totalProfitChange >= 0 ? '+' : ''}₹{stats.totalProfitChange.toLocaleString()}
                        </Text>
                    </View>
                </LuxuryCard>

                <Text style={styles.sectionTitle}>Holdings</Text>

                {investments.length === 0 ? (
                    <LuxuryEmptyState
                        title="Empty Portfolio"
                        subtitle="Start building your wealth. Add Stocks, Mutual Funds, or Crypto."
                        icon={TrendingUp}
                        themeColor="#10B981"
                    />
                ) : (
                    investments.map((inv, index) => {
                        const change = inv.currentValue - inv.investedAmount;
                        const percent = (change / inv.investedAmount) * 100;

                        return (
                            <LuxuryCard key={inv.id} index={index} style={styles.invCard} onPress={() => handleDelete(inv.id)}>
                                <View style={styles.cardRow}>
                                    <View style={styles.iconContainer}>
                                        <Text style={styles.iconText}>{inv.name[0]}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.invName}>{inv.name}</Text>
                                        <Text style={styles.invType}>{inv.type} {inv.ticker ? `• ${inv.ticker}` : ''}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.currValue}>₹{parseFloat(inv.currentValue).toLocaleString()}</Text>
                                        <Text style={[styles.changeText, { color: getProfitColor(change) }]}>
                                            {change >= 0 ? '+' : ''}{percent.toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            </LuxuryCard>
                        );
                    })
                )}
            </ScrollView>

            {/* Modal */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Investment</Text>

                        <TextInput
                            style={styles.input}
                            placeholder="Name (e.g. Reliance, Bitcoin)"
                            placeholderTextColor="#666"
                            value={name}
                            onChangeText={setName}
                        />

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Ticker (Optional)"
                                placeholderTextColor="#666"
                                value={ticker}
                                onChangeText={setTicker}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Quantity (Optional)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={quantity}
                                onChangeText={setQuantity}
                            />
                        </View>

                        <View style={styles.typeRow}>
                            {['Stock', 'Mutual Fund', 'Crypto', 'FD', 'Gold'].map(t => (
                                <Pressable
                                    key={t}
                                    style={[styles.typeChip, type === t && styles.activeTypeChip]}
                                    onPress={() => setType(t)}
                                >
                                    <Text style={[styles.typeChipText, type === t && { color: '#FFF' }]}>{t}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Invested (₹)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={investedAmount}
                                onChangeText={setInvestedAmount}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1 }]}
                                placeholder="Current Value (₹)"
                                placeholderTextColor="#666"
                                keyboardType="numeric"
                                value={currentValue}
                                onChangeText={setCurrentValue}
                            />
                        </View>

                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleAdd}>
                                <Text style={styles.btnText}>Save</Text>
                            </Pressable>
                        </View>
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
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#10B981' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },

    summaryCard: { padding: 24, marginBottom: 32, backgroundColor: '#18181B' },
    summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    summaryLabel: { fontSize: 13, color: '#A1A1AA', letterSpacing: 1, fontWeight: '700' },
    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontSize: 12, fontWeight: '700' },
    summaryValue: { fontSize: 40, fontWeight: '900', color: '#FFF', marginBottom: 16 },
    summaryFooter: { flexDirection: 'row', alignItems: 'center' },
    FooterLabel: { fontSize: 13, color: '#A1A1AA' },
    FooterValue: { fontSize: 14, color: '#FFF', fontWeight: '600' },

    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },

    invCard: { padding: 16, marginBottom: 12, backgroundColor: '#18181B' },
    cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center' },
    iconText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    invName: { fontSize: 16, fontWeight: '600', color: '#FFF', marginBottom: 2 },
    invType: { fontSize: 12, color: '#71717A' },
    currValue: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    changeText: { fontSize: 12, fontWeight: '600' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
    typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#333' },
    activeTypeChip: { backgroundColor: '#10B981', borderColor: '#10B981' },
    typeChipText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: '#10B981', borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
