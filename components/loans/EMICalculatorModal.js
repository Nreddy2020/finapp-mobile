import React, { useState, useEffect } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { X, Calculator, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';

export default function EMICalculatorModal({ visible, onClose }) {
    const [amount, setAmount] = useState('500000');
    const [rate, setRate] = useState('10.5'); // % per annum
    const [tenure, setTenure] = useState('60'); // Months
    const [emi, setEmi] = useState(0);

    const calculateEMI = () => {
        const P = parseFloat(amount);
        const R = parseFloat(rate) / 12 / 100; // Monthly Interest
        const N = parseFloat(tenure);

        if (!P || !R || !N) {
            setEmi(0);
            return;
        }

        // EMI = [P x R x (1+R)^N]/[(1+R)^N-1]
        const emiValue = (P * R * Math.pow(1 + R, N)) / (Math.pow(1 + R, N) - 1);
        setEmi(emiValue);
    };

    useEffect(() => {
        calculateEMI();
    }, [amount, rate, tenure]);

    const totalPayment = emi * parseFloat(tenure || 0);
    const totalInterest = totalPayment - parseFloat(amount || 0);

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={styles.titleRow}>
                            <Calculator size={24} color={COLORS.primary} />
                            <Text style={styles.title}>EMI Calculator</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.resultCard}>
                        <LinearGradient
                            colors={[COLORS.primary + '20', COLORS.primary + '05']}
                            style={styles.resultGradient}
                        />
                        <Text style={styles.resultLabel}>Monthly EMI</Text>
                        <Text style={styles.resultValue}>₹{Math.round(emi).toLocaleString('en-IN')}</Text>

                        <View style={styles.breakdownRow}>
                            <View>
                                <Text style={styles.breakdownLabel}>Total Interest</Text>
                                <Text style={[styles.breakdownValue, { color: '#EF4444' }]}>+₹{Math.round(totalInterest).toLocaleString('en-IN')}</Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.breakdownLabel}>Total Payment</Text>
                                <Text style={styles.breakdownValue}>₹{Math.round(totalPayment).toLocaleString('en-IN')}</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.inputs}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Loan Amount (₹)</Text>
                            <TextInput
                                style={styles.input}
                                value={amount}
                                onChangeText={setAmount}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Interest Rate (%)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={rate}
                                    onChangeText={setRate}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Tenure (Months)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={tenure}
                                    onChangeText={setTenure}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity onPress={onClose} style={styles.closeActionBtn}>
                        <Text style={styles.closeActionText}>Close Calculator</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 24 },
    container: { backgroundColor: '#18181B', borderRadius: 32, padding: 24, borderWidth: 1, borderColor: '#FFFFFF10' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    title: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    closeBtn: { padding: 4, backgroundColor: '#FFFFFF10', borderRadius: 20 },

    resultCard: { position: 'relative', borderRadius: 24, padding: 24, marginBottom: 24, overflow: 'hidden', borderWidth: 1, borderColor: COLORS.primary + '40' },
    resultGradient: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    resultLabel: { color: COLORS.primary, fontWeight: '700', fontSize: 13, textTransform: 'uppercase', marginBottom: 8 },
    resultValue: { fontSize: 36, fontWeight: '900', color: '#FFF', marginBottom: 20 },
    breakdownRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#FFFFFF10', paddingTop: 16 },
    breakdownLabel: { fontSize: 12, color: '#A1A1AA', marginBottom: 4 },
    breakdownValue: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    inputs: { gap: 16 },
    inputGroup: { gap: 8 },
    label: { color: '#A1A1AA', fontSize: 13, fontWeight: '600' },
    input: { backgroundColor: '#000', borderRadius: 12, padding: 14, color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF20' },
    row: { flexDirection: 'row', gap: 12 },

    closeActionBtn: { marginTop: 24, backgroundColor: '#27272A', padding: 16, borderRadius: 16, alignItems: 'center' },
    closeActionText: { color: '#FFF', fontWeight: '700' }
});
