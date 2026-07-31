import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { X, Calculator, TrendingUp, Home } from 'lucide-react-native';

export default function RentVsBuy({ visible, onClose }) {
    const [monthlyRent, setMonthlyRent] = useState('25000');
    const [homePrice, setHomePrice] = useState('8000000');
    const [years, setYears] = useState(10);

    const calculateNetWorth = () => {
        // Simplified Simulation
        const rentCost = parseInt(monthlyRent) * 12 * years * 1.05; // 5% rent inflation
        const homeValue = parseInt(homePrice) * Math.pow(1.04, years); // 4% appreciation
        const interest = parseInt(homePrice) * 0.08 * years; // 8% loan interest

        const rentingCost = rentCost + (parseInt(homePrice) * 0.2); // Invested downpayment opportunity cost excluded for simplicity
        const buyingCost = interest + (parseInt(homePrice) * 0.01 * years); // Maintenance

        return {
            renting: rentingCost,
            buying: buyingCost,
            homeValue: homeValue
        };
    };

    const result = calculateNetWorth();

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Calculator size={24} color="#F43F5E" />
                            <Text style={styles.title}>Rent vs Buy Calculator</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.content}>
                        <View style={styles.inputRow}>
                            <View style={styles.inputCol}>
                                <Text style={styles.label}>Monthly Rent (₹)</Text>
                                <TextInput style={styles.input} value={monthlyRent} onChangeText={setMonthlyRent} keyboardType="numeric" />
                            </View>
                            <View style={styles.inputCol}>
                                <Text style={styles.label}>Home Price (₹)</Text>
                                <TextInput style={styles.input} value={homePrice} onChangeText={setHomePrice} keyboardType="numeric" />
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>10-Year Projection</Text>

                        <View style={styles.comparisonCard}>
                            <View style={styles.option}>
                                <Text style={styles.optionTitle}>Renting</Text>
                                <Text style={styles.optionValue}>-₹{(result.renting / 100000).toFixed(1)}L</Text>
                                <Text style={styles.optionSub}>Total Sunk Cost</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.option}>
                                <Text style={[styles.optionTitle, { color: '#10B981' }]}>Buying</Text>
                                <Text style={styles.optionValue}>+₹{(result.homeValue / 100000).toFixed(1)}L</Text>
                                <Text style={styles.optionSub}>Asset Value</Text>
                            </View>
                        </View>

                        <View style={styles.recommendation}>
                            <Home size={20} color="#FFF" />
                            <Text style={styles.recText}>
                                {parseInt(monthlyRent) * 300 < parseInt(homePrice) ? "Renting is financially better right now." : "Buying is a good long-term wealth builder."}
                            </Text>
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '60%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    content: { flex: 1 },
    inputRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    inputCol: { flex: 1 },
    label: { color: '#71717A', fontSize: 12, marginBottom: 8 },
    input: { backgroundColor: '#27272A', padding: 12, borderRadius: 12, color: '#FFF', fontSize: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    sectionTitle: { color: '#71717A', fontSize: 13, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
    comparisonCard: { flexDirection: 'row', backgroundColor: '#27272A', borderRadius: 16, padding: 20, marginBottom: 20 },
    option: { flex: 1, alignItems: 'center' },
    optionTitle: { color: '#F43F5E', fontWeight: '700', marginBottom: 4 },
    optionValue: { color: '#FFF', fontSize: 18, fontWeight: '700', marginBottom: 2 },
    optionSub: { color: '#71717A', fontSize: 11 },
    divider: { width: 1, backgroundColor: '#FFFFFF10', marginHorizontal: 10 },
    recommendation: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#10B98120', padding: 16, borderRadius: 12 },
    recText: { color: '#10B981', flex: 1, fontWeight: '600' }
});
