import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, PieChart, Plus, DollarSign, TrendingUp } from 'lucide-react-native';

export default function TravelBudget({ visible, onClose }) {
    const [expenses, setExpenses] = useState([
        { id: 1, category: 'Flights', amount: 45000, color: '#3B82F6' },
        { id: 2, category: 'Hotels', amount: 32000, color: '#8B5CF6' },
        { id: 3, category: 'Food', amount: 12500, color: '#F59E0B' },
        { id: 4, category: 'Activities', amount: 8000, color: '#10B981' },
    ]);

    const total = expenses.reduce((sum, item) => sum + item.amount, 0);
    const budget = 120000;
    const remaining = budget - total;

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <PieChart size={24} color="#F59E0B" />
                            <Text style={styles.title}>Trip Budget</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    {/* Summary Card */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryRow}>
                            <View>
                                <Text style={styles.summaryLabel}>Total Budget</Text>
                                <Text style={styles.summaryValue}>₹{budget.toLocaleString()}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.summaryLabel}>Remaining</Text>
                                <Text style={[styles.summaryValue, { color: remaining > 0 ? '#10B981' : '#EF4444' }]}>
                                    ₹{remaining.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${(total / budget) * 100}%` }]} />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Expense Interaction</Text>

                    <ScrollView style={styles.list}>
                        {expenses.map((item) => (
                            <View key={item.id} style={styles.itemRow}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                                    <Text style={styles.categoryName}>{item.category}</Text>
                                </View>
                                <Text style={styles.amount}>₹{item.amount.toLocaleString()}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.addBtn}>
                        <Plus size={20} color="#000" />
                        <Text style={styles.addBtnText}>Add Expense</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '65%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    summaryCard: { backgroundColor: '#27272A', padding: 20, borderRadius: 16, marginBottom: 24 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    summaryLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 4 },
    summaryValue: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    progressBarBg: { height: 8, backgroundColor: '#3F3F46', borderRadius: 4 },
    progressBarFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 4 },
    sectionTitle: { color: '#71717A', fontSize: 13, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    list: { flex: 1 },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF08' },
    dot: { width: 10, height: 10, borderRadius: 5 },
    categoryName: { color: '#FFF', fontSize: 16 },
    amount: { color: '#A1A1AA', fontSize: 16, fontWeight: '600' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', padding: 16, borderRadius: 12 },
    addBtnText: { color: '#000', fontWeight: '700' }
});
