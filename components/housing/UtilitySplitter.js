import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { X, Receipt, Users, Plus, Zap } from 'lucide-react-native';

export default function UtilitySplitter({ visible, onClose }) {
    const [bills, setBills] = useState([
        { id: 1, name: 'Electricity', amount: 3500, paidBy: 'You' },
        { id: 2, name: 'WiFi', amount: 1200, paidBy: 'Rahul' },
        { id: 3, name: 'Maid', amount: 4000, paidBy: 'Sneha' },
    ]);

    const total = bills.reduce((sum, b) => sum + b.amount, 0);
    const perPerson = (total / 3).toFixed(0);

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Zap size={24} color="#F59E0B" />
                            <Text style={styles.title}>Utility Splitter</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.summaryBox}>
                        <View>
                            <Text style={styles.summaryLabel}>Total Monthly Bills</Text>
                            <Text style={styles.summaryValue}>₹{total}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.summaryLabel}>Share Per Person</Text>
                            <Text style={styles.summaryValue}>₹{perPerson}</Text>
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Active Bills</Text>

                    <ScrollView style={styles.list}>
                        {bills.map((bill) => (
                            <View key={bill.id} style={styles.billRow}>
                                <View style={styles.billIcon}>
                                    <Receipt size={16} color="#FFF" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.billName}>{bill.name}</Text>
                                    <Text style={styles.paidBy}>Paid by {bill.paidBy}</Text>
                                </View>
                                <Text style={styles.billAmount}>₹{bill.amount}</Text>
                            </View>
                        ))}
                    </ScrollView>

                    <TouchableOpacity style={styles.addBtn}>
                        <Plus size={20} color="#000" />
                        <Text style={styles.addBtnText}>Add Bill</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    summaryBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#27272A', padding: 20, borderRadius: 16, marginBottom: 24 },
    summaryLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 4 },
    summaryValue: { color: '#FFF', fontSize: 24, fontWeight: '700' },
    sectionTitle: { color: '#71717A', fontSize: 13, marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    list: { flex: 1 },
    billRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF08' },
    billIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#F59E0B20', alignItems: 'center', justifyContent: 'center' },
    billName: { color: '#FFF', fontSize: 15, fontWeight: '600' },
    paidBy: { color: '#71717A', fontSize: 12 },
    billAmount: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#F59E0B', padding: 16, borderRadius: 12 },
    addBtnText: { color: '#000', fontWeight: '700' }
});
