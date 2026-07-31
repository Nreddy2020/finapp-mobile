import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { X, Check, Building2, User, Calendar, DollarSign, Percent } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants/theme';

export default function AddLoanModal({ visible, onClose, onSave }) {
    const [type, setType] = useState('borrowing'); // 'borrowing' | 'lending'

    // Form State
    const [name, setName] = useState('');
    const [provider, setProvider] = useState(''); // Bank name or Person name
    const [amount, setAmount] = useState('');
    const [interestRate, setInterestRate] = useState('');
    const [tenure, setTenure] = useState('');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

    const handleSave = () => {
        if (!name || !amount) return;

        const loanData = {
            id: Date.now().toString(),
            name,
            provider,
            outstanding_amount: parseFloat(amount),
            original_amount: parseFloat(amount),
            interest_rate: parseFloat(interestRate) || 0,
            tenure_months: parseFloat(tenure) || 12,
            start_date: startDate,
            is_lending: type === 'lending',
            status: 'active',
            type: 'Personal' // Default type for now
        };

        // Auto-calculate EMI if borrowing
        if (type === 'borrowing' && loanData.interest_rate > 0) {
            const r = loanData.interest_rate / 12 / 100;
            const n = loanData.tenure_months;
            const emi = (loanData.original_amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
            loanData.emi_amount = emi.toFixed(2);
        }

        onSave(loanData);
        resetForm();
    };

    const resetForm = () => {
        setName('');
        setProvider('');
        setAmount('');
        setInterestRate('');
        setTenure('');
        setType('borrowing');
    };

    const THEME_COLOR = type === 'lending' ? COLORS.success : COLORS.primary;

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Add New {type === 'lending' ? 'Asset' : 'Liability'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* Type Toggle */}
                    <View style={styles.toggleRow}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, type === 'borrowing' && { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary }]}
                            onPress={() => setType('borrowing')}
                        >
                            <Building2 size={16} color={type === 'borrowing' ? COLORS.primary : '#71717A'} />
                            <Text style={[styles.toggleText, type === 'borrowing' && { color: COLORS.primary }]}>Borrowing</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, type === 'lending' && { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }]}
                            onPress={() => setType('lending')}
                        >
                            <User size={16} color={type === 'lending' ? COLORS.success : '#71717A'} />
                            <Text style={[styles.toggleText, type === 'lending' && { color: COLORS.success }]}>Lending</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{type === 'lending' ? 'Borrower Name' : 'Loan Name'}</Text>
                            <TextInput
                                style={[styles.input, { borderColor: THEME_COLOR + '40' }]}
                                placeholder={type === 'lending' ? "e.g. John Doe" : "e.g. Home Loan"}
                                placeholderTextColor="#52525B"
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>{type === 'lending' ? 'Relation/Note' : 'Bank/Lender'}</Text>
                            <TextInput
                                style={[styles.input, { borderColor: THEME_COLOR + '40' }]}
                                placeholder={type === 'lending' ? "e.g. Friend" : "e.g. HDFC Bank"}
                                placeholderTextColor="#52525B"
                                value={provider}
                                onChangeText={setProvider}
                            />
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Amount (₹)</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: THEME_COLOR + '40' }]}
                                    placeholder="0.00"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={amount}
                                    onChangeText={setAmount}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Interest Rate (%)</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: THEME_COLOR + '40' }]}
                                    placeholder="0%"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={interestRate}
                                    onChangeText={setInterestRate}
                                />
                            </View>
                        </View>

                        <View style={styles.row}>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Tenure (Months)</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: THEME_COLOR + '40' }]}
                                    placeholder="12"
                                    placeholderTextColor="#52525B"
                                    keyboardType="numeric"
                                    value={tenure}
                                    onChangeText={setTenure}
                                />
                            </View>
                            <View style={[styles.inputGroup, { flex: 1 }]}>
                                <Text style={styles.label}>Start Date</Text>
                                <TextInput
                                    style={[styles.input, { borderColor: THEME_COLOR + '40' }]}
                                    placeholder="YYYY-MM-DD"
                                    placeholderTextColor="#52525B"
                                    value={startDate}
                                    onChangeText={setStartDate}
                                />
                            </View>
                        </View>

                        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                            <LinearGradient
                                colors={[THEME_COLOR, THEME_COLOR + '80']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>Save Record</Text>
                                <Check size={20} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, height: '85%', borderWidth: 1, borderColor: '#FFFFFF10' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    title: { fontSize: 24, fontWeight: '800', color: '#FFF' },
    closeBtn: { padding: 4, backgroundColor: '#FFFFFF10', borderRadius: 20 },

    toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10', gap: 8 },
    toggleText: { fontWeight: '700', color: '#71717A' },

    form: { flex: 1 },
    inputGroup: { marginBottom: 20 },
    label: { color: '#A1A1AA', fontSize: 13, fontWeight: '600', marginBottom: 8, marginLeft: 4 },
    input: { backgroundColor: '#000', borderRadius: 16, padding: 16, color: '#FFF', fontSize: 16, borderWidth: 1 },
    row: { flexDirection: 'row', gap: 16 },

    saveBtn: { marginTop: 12, marginBottom: 40, overflow: 'hidden', borderRadius: 20 },
    saveGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 18, gap: 8 },
    saveText: { color: '#FFF', fontSize: 18, fontWeight: '700' }
});
