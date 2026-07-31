import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Modal, TextInput } from 'react-native';
import { Calendar as CalendarIcon, ChevronLeft, TrendingUp, DollarSign, Plus, X } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import StatCard from '../components/ui/StatCard';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { IncomeCalendarService } from '../services/income-calendar';

export default function IncomeCalendarScreen() {
    const router = useRouter();
    const [stats, setStats] = useState({ totalIncome: 0, workDays: 0, avgDaily: 0, entries: [] });
    const [loading, setLoading] = useState(true);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState('Gig');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Load stats for current month (naive implementation: assumes all loaded entries are relevant for now)
        // ideally we filter by YYYY-MM
        const currentMonth = new Date().toISOString().slice(0, 7);
        const data = await IncomeCalendarService.getMonthStats(currentMonth);
        setStats(data);
        setLoading(false);
    };

    const handleAddIncome = async () => {
        if (!amount || isNaN(amount)) return;
        await IncomeCalendarService.addEntry({
            date,
            amount,
            source,
            note: ''
        });
        setModalVisible(false);
        setAmount('');
        loadData();
    };

    // Generate calendar grid (simple 30 days visualization for demo)
    const renderCalendarGrid = () => {
        const grid = [];
        // Map entries to days
        const entryMap = {};
        stats.entries.forEach(e => {
            const day = parseInt(e.date.split('-')[2]);
            if (!entryMap[day]) entryMap[day] = 0;
            entryMap[day] += e.amount;
        });

        for (let i = 1; i <= 30; i++) {
            const val = entryMap[i] || 0;
            let statusColor = '#27272A'; // Default
            if (val > 1000) statusColor = '#10B981'; // Good
            else if (val > 0) statusColor = '#F59E0B'; // Low

            grid.push(
                <View key={i} style={[styles.dayCell, { backgroundColor: statusColor + '20', borderColor: val > 0 ? statusColor : '#FFFFFF10' }]}>
                    <Text style={[styles.dayNum, { color: val > 0 ? '#FFF' : '#52525B' }]}>{i}</Text>
                    {val > 0 && <Text style={styles.dayAmt}>₹{val}</Text>}
                </View>
            );
        }
        return grid;
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Income Tracker</Text>
                <Pressable onPress={() => setModalVisible(true)} style={styles.addButton}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Stats Header */}
                <View style={styles.statsGrid}>
                    <StatCard
                        label="Total Earnings"
                        value={`₹${stats.totalIncome.toLocaleString()}`}
                        icon={DollarSign}
                        iconColor="#10B981"
                    />
                    <StatCard
                        label="Avg / Work Day"
                        value={`₹${stats.avgDaily.toFixed(0)}`}
                        icon={TrendingUp}
                        iconColor="#6366F1"
                    />
                </View>

                {/* Calendar Grid */}
                <LuxuryCard style={styles.calendarCard}>
                    <View style={styles.calHeader}>
                        <CalendarIcon size={20} color="#A1A1AA" />
                        <Text style={styles.calTitle}>Current Month</Text>
                    </View>

                    <View style={styles.grid}>
                        {renderCalendarGrid()}
                    </View>

                    <View style={styles.legend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>High (₹1k+)</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
                            <Text style={styles.legendText}>Low (&lt;₹1k)</Text>
                        </View>
                    </View>
                </LuxuryCard>

                {/* Recent Entries */}
                <Text style={styles.sectionTitle}>Recent Entries</Text>
                {stats.entries.slice().reverse().slice(0, 5).map((entry, index) => (
                    <LuxuryCard key={entry.id} index={index} style={styles.entryCard}>
                        <View style={styles.entryRow}>
                            <View>
                                <Text style={styles.entryDate}>{entry.date}</Text>
                                <Text style={styles.entrySource}>{entry.source}</Text>
                            </View>
                            <Text style={styles.entryAmount}>+₹{entry.amount}</Text>
                        </View>
                    </LuxuryCard>
                ))}
            </ScrollView>

            {/* Add Modal */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Log Daily Income</Text>
                            <Pressable onPress={() => setModalVisible(false)}><X color="#FFF" size={24} /></Pressable>
                        </View>

                        <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                        />

                        <Text style={styles.inputLabel}>Amount (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                            placeholder="e.g. 1500"
                            placeholderTextColor="#555"
                        />

                        <Text style={styles.inputLabel}>Source</Text>
                        <View style={styles.chipRow}>
                            {['Gig', 'Wage', 'Freelance', 'Gift'].map(s => (
                                <Pressable
                                    key={s}
                                    style={[styles.chip, source === s && styles.chipActive]}
                                    onPress={() => setSource(s)}
                                >
                                    <Text style={[styles.chipText, source === s && { color: '#FFF' }]}>{s}</Text>
                                </Pressable>
                            ))}
                        </View>

                        <Pressable style={styles.saveBtn} onPress={handleAddIncome}>
                            <Text style={styles.btnText}>Save Entry</Text>
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
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#6366F1' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    calendarCard: { padding: 16, marginBottom: 24 },
    calHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    calTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayCell: { width: '13%', aspectRatio: 1, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    dayNum: { fontSize: 12, fontWeight: '600' },
    dayAmt: { fontSize: 9, color: '#A1A1AA' },
    legend: { flexDirection: 'row', gap: 16, marginTop: 16, justifyContent: 'center' },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: '#A1A1AA', fontSize: 12 },

    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    entryCard: { padding: 16, marginBottom: 12 },
    entryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    entryDate: { color: '#FFF', fontWeight: '600', fontSize: 14 },
    entrySource: { color: '#6366F1', fontSize: 12, marginTop: 2 },
    entryAmount: { color: '#10B981', fontWeight: '700', fontSize: 16 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 8 },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 14, borderRadius: 12, marginBottom: 16, fontSize: 16 },
    chipRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#27272A', borderWidth: 1, borderColor: '#333' },
    chipActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    chipText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    saveBtn: { backgroundColor: '#6366F1', padding: 16, borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 }
});
