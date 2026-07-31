import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { X, Calculator, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import LuxuryCard from '../ui/LuxuryCard';

export default function CashTallyModal({ visible, onClose, systemBalance, currency = '₹' }) {
    const [denominations, setDenominations] = useState([
        { value: 2000, count: '' },
        { value: 500, count: '' },
        { value: 200, count: '' },
        { value: 100, count: '' },
        { value: 50, count: '' },
        { value: 20, count: '' },
        { value: 10, count: '' },
        { value: 5, count: '' },
        { value: 1, count: '' },
    ]);

    const [physicalTotal, setPhysicalTotal] = useState(0);

    useEffect(() => {
        const total = denominations.reduce((sum, item) => {
            return sum + (item.value * (parseInt(item.count) || 0));
        }, 0);
        setPhysicalTotal(total);
    }, [denominations]);

    const handleCountChange = (index, text) => {
        const newDenoms = [...denominations];
        newDenoms[index].count = text;
        setDenominations(newDenoms);
    };

    const difference = physicalTotal - systemBalance;
    const isMatch = Math.abs(difference) < 1;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <Calculator size={20} color="#4F46E5" />
                            <Text style={styles.title}>Physical Cash Tally</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                        {/* Summary Card */}
                        <LuxuryCard style={styles.summaryCard}>
                            <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>System Balance</Text>
                                <Text style={styles.summaryValue}>{currency}{systemBalance.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={[styles.summaryRow, { marginTop: 12 }]}>
                                <Text style={styles.summaryLabel}>Physical Count</Text>
                                <Text style={styles.summaryValue}>{currency}{physicalTotal.toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.resultRow}>
                                <View style={[styles.statusBadge, isMatch ? styles.statusMatch : styles.statusDiff]}>
                                    {isMatch ? <CheckCircle size={14} color="#10B981" /> : <AlertCircle size={14} color="#EF4444" />}
                                    <Text style={[styles.statusText, { color: isMatch ? '#10B981' : '#EF4444' }]}>
                                        {isMatch ? 'PERFECT MATCH' : 'DISCREPANCY'}
                                    </Text>
                                </View>
                                {!isMatch && (
                                    <Text style={[styles.diffAmount, { color: difference > 0 ? '#10B981' : '#EF4444' }]}>
                                        {difference > 0 ? '+' : ''}{currency}{difference.toLocaleString('en-IN')}
                                    </Text>
                                )}
                            </View>
                        </LuxuryCard>

                        <Text style={styles.sectionTitle}>Denominations</Text>

                        <View style={styles.denomGrid}>
                            {denominations.map((denom, index) => (
                                <View key={denom.value} style={styles.denomRow}>
                                    <View style={styles.denomLabelBox}>
                                        <Text style={styles.denomLabel}>{currency}{denom.value}</Text>
                                    </View>
                                    <Text style={styles.multiply}>×</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="0"
                                        placeholderTextColor="#52525B"
                                        keyboardType="numeric"
                                        value={denom.count}
                                        onChangeText={(text) => handleCountChange(index, text)}
                                    />
                                    <Text style={styles.equals}>=</Text>
                                    <Text style={styles.denomTotal}>
                                        {currency}{(denom.value * (parseInt(denom.count) || 0)).toLocaleString('en-IN')}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.resetBtn} onPress={() => {
                            setDenominations(denominations.map(d => ({ ...d, count: '' })));
                        }}>
                            <RefreshCw size={16} color="#A1A1AA" />
                            <Text style={styles.resetText}>Reset</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
                            <Text style={styles.doneText}>Finish Reconciliation</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
    modalContainer: { height: '85%', backgroundColor: '#09090B', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: 20, fontWeight: '800', color: '#fff' },
    closeBtn: { padding: 8, backgroundColor: '#27272A', borderRadius: 20 },
    content: { flex: 1, padding: 24 },
    summaryCard: { padding: 20, backgroundColor: '#18181B', borderRadius: 24, borderWidth: 1, borderColor: '#FFFFFF10', marginBottom: 32 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    summaryValue: { color: '#fff', fontSize: 16, fontWeight: '700' },
    divider: { height: 1, backgroundColor: '#FFFFFF10', marginVertical: 16 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#000' },
    statusText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
    statusMatch: { backgroundColor: '#10B98115', borderWidth: 1, borderColor: '#10B98130' },
    statusDiff: { backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF444430' },
    diffAmount: { fontSize: 16, fontWeight: '800' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    denomGrid: { gap: 12, paddingBottom: 40 },
    denomRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    denomLabelBox: { width: 60, height: 40, backgroundColor: '#27272A', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    denomLabel: { color: '#fff', fontWeight: '700', fontSize: 14 },
    multiply: { color: '#52525B', fontSize: 16 },
    input: { flex: 1, height: 44, backgroundColor: '#000', borderRadius: 12, borderWidth: 1, borderColor: '#3F3F46', color: '#fff', textAlign: 'center', fontSize: 16, fontWeight: '700' },
    equals: { color: '#52525B', fontSize: 16 },
    denomTotal: { width: 70, textAlign: 'right', color: '#A1A1AA', fontSize: 14, fontWeight: '600' },
    footer: { padding: 24, borderTopWidth: 1, borderTopColor: '#FFFFFF10', flexDirection: 'row', gap: 16 },
    resetBtn: { padding: 16, borderRadius: 16, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
    resetText: { color: '#A1A1AA', fontWeight: '600' },
    doneBtn: { flex: 1, padding: 16, borderRadius: 16, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },
    doneText: { color: '#fff', fontWeight: '700', fontSize: 16 }
});
