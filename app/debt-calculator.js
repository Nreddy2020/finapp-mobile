import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, Alert } from 'react-native';
import { Calculator, ChevronLeft, TrendingDown, Calendar } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { useRouter } from 'expo-router';
import { PlanningService } from '../services/planning';

export default function DebtCalculatorScreen() {
    const router = useRouter();

    const [debts, setDebts] = useState([]);
    const [monthlyPayment, setMonthlyPayment] = useState('5000');
    const [strategy, setStrategy] = useState('AVALANCHE'); // AVALANCHE or SNOWBALL
    const [result, setResult] = useState(null);

    // New Debt Form
    const [newDebtName, setNewDebtName] = useState('');
    const [newDebtAmount, setNewDebtAmount] = useState('');
    const [newDebtRate, setNewDebtRate] = useState('');

    useEffect(() => {
        loadDebts();
    }, []);

    const loadDebts = async () => {
        const data = await PlanningService.getDebts();
        setDebts(data);
    };

    const handleAddDebt = async () => {
        if (!newDebtName || !newDebtAmount || !newDebtRate) {
            Alert.alert('Error', 'Please fill all fields');
            return;
        }

        const newDebt = {
            id: Date.now(),
            name: newDebtName,
            amount: parseFloat(newDebtAmount),
            rate: parseFloat(newDebtRate),
            minPayment: (parseFloat(newDebtAmount) * 0.02) // Approx 2% min payment
        };

        const updated = [...debts, newDebt];
        await PlanningService.saveDebts(updated);
        setDebts(updated);

        // Reset form
        setNewDebtName('');
        setNewDebtAmount('');
        setNewDebtRate('');
    };

    const handleDeleteDebt = async (id) => {
        const updated = debts.filter(d => d.id !== id);
        await PlanningService.saveDebts(updated);
        setDebts(updated);
    };

    useEffect(() => {
        if (debts.length > 0 && monthlyPayment) {
            const res = PlanningService.calculatePayoff(debts, monthlyPayment, strategy);
            setResult(res);
        }
    }, [debts, monthlyPayment, strategy]);

    const getPayoffDate = (months) => {
        const date = new Date();
        date.setMonth(date.getMonth() + months);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Debt Repayment Tool</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Result Card */}
                {result && (
                    <LuxuryCard style={styles.resultCard}>
                        <View style={styles.resultHeader}>
                            <Calendar size={24} color="#10B981" />
                            <Text style={styles.resultLabel}>Debt Free By</Text>
                        </View>
                        <Text style={styles.resultValue}>{getPayoffDate(result.months)}</Text>
                        <Text style={styles.resultSub}>
                            Total Interest: ₹{result.totalInterest.toFixed(0)}
                        </Text>
                    </LuxuryCard>
                )}

                {/* Add Debt Section */}
                <LuxuryCard style={styles.inputCard}>
                    <Text style={styles.cardTitle}>Add Loan / Debt</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Loan Name (e.g. Car Loan)"
                        placeholderTextColor="#666"
                        value={newDebtName}
                        onChangeText={setNewDebtName}
                    />
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Amount (₹)"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={newDebtAmount}
                            onChangeText={setNewDebtAmount}
                        />
                        <TextInput
                            style={[styles.input, { flex: 1 }]}
                            placeholder="Rate (%)"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={newDebtRate}
                            onChangeText={setNewDebtRate}
                        />
                    </View>
                    <Pressable style={styles.addBtn} onPress={handleAddDebt}>
                        <Text style={styles.btnText}>Add Debt</Text>
                    </Pressable>
                </LuxuryCard>

                {/* Strategy Control */}
                <View style={styles.strategyRow}>
                    <Text style={styles.label}>Monthly Budget:</Text>
                    <TextInput
                        style={styles.smallInput}
                        value={monthlyPayment}
                        onChangeText={setMonthlyPayment}
                        keyboardType="numeric"
                    />
                </View>

                <View style={styles.tabs}>
                    <Pressable
                        style={[styles.tab, strategy === 'AVALANCHE' && styles.activeTab]}
                        onPress={() => setStrategy('AVALANCHE')}
                    >
                        <Text style={[styles.tabText, strategy === 'AVALANCHE' && styles.activeTabText]}>Avalanche (Save Interest)</Text>
                    </Pressable>
                    <Pressable
                        style={[styles.tab, strategy === 'SNOWBALL' && styles.activeTab]}
                        onPress={() => setStrategy('SNOWBALL')}
                    >
                        <Text style={[styles.tabText, strategy === 'SNOWBALL' && styles.activeTabText]}>Snowball (Momentum)</Text>
                    </Pressable>
                </View>

                {/* Debt List */}
                <View style={styles.list}>
                    {debts.map((d) => (
                        <View key={d.id} style={styles.debtItem}>
                            <View>
                                <Text style={styles.debtName}>{d.name}</Text>
                                <Text style={styles.debtDetails}>₹{d.amount} @ {d.rate}%</Text>
                            </View>
                            <Pressable onPress={() => handleDeleteDebt(d.id)}>
                                <Text style={{ color: '#EF4444' }}>Remove</Text>
                            </Pressable>
                        </View>
                    ))}
                </View>

            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },

    resultCard: { padding: 24, alignItems: 'center', marginBottom: 24, backgroundColor: '#10B98110', borderColor: '#10B98150' },
    resultHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
    resultLabel: { color: '#10B981', fontWeight: '700', fontSize: 14, textTransform: 'uppercase' },
    resultValue: { color: '#FFF', fontSize: 32, fontWeight: '900', marginBottom: 4 },
    resultSub: { color: '#A1A1AA', fontSize: 14 },

    inputCard: { padding: 20, marginBottom: 24, backgroundColor: '#18181B' },
    cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 16 },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 12, borderRadius: 12, marginBottom: 12 },
    addBtn: { backgroundColor: '#F59E0B', padding: 12, borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#000', fontWeight: '700' },

    strategyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    label: { color: '#FFF', fontSize: 16 },
    smallInput: { backgroundColor: '#27272A', color: '#FFF', padding: 8, borderRadius: 8, width: 100, textAlign: 'center' },

    tabs: { flexDirection: 'row', marginBottom: 24, backgroundColor: '#18181B', borderRadius: 12, padding: 4 },
    tab: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8 },
    activeTab: { backgroundColor: '#F59E0B' },
    tabText: { color: '#71717A', fontWeight: '600', fontSize: 12 },
    activeTabText: { color: '#000' },

    list: { gap: 12 },
    debtItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#18181B', borderRadius: 12, borderWidth: 1, borderColor: '#333' },
    debtName: { color: '#FFF', fontWeight: '600' },
    debtDetails: { color: '#A1A1AA', fontSize: 12 }
});
