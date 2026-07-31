import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Dimensions, ScrollView } from 'react-native';
import { X, TrendingUp, History, Clock, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { COLORS } from '../../constants/theme';

const { width } = Dimensions.get('window');

export default function TimeMachine({ visible, onClose }) {
    const [monthlyInvestment, setMonthlyInvestment] = useState('5000');
    const [years, setYears] = useState('10');
    const [assetClass, setAssetClass] = useState('NIFTY'); // NIFTY, GOLD, FD

    const calculateWealth = () => {
        const p = parseFloat(monthlyInvestment) || 0;
        const t = parseFloat(years) || 0;
        let rate = 12; // Nifty default
        if (assetClass === 'GOLD') rate = 8;
        if (assetClass === 'FD') rate = 6;

        // FV = P * [((1+r)^n - 1) / r] * (1+r)
        const r = rate / 100 / 12;
        const n = t * 12;

        const investedAmount = p * n;
        const futureValue = p * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);

        return {
            invested: investedAmount,
            value: futureValue,
            profit: futureValue - investedAmount,
            multiplier: futureValue / investedAmount
        };
    };

    const result = calculateWealth();
    const assets = [
        { id: 'NIFTY', label: 'Nifty 50', rate: '12%' },
        { id: 'GOLD', label: 'Gold', rate: '8%' },
        { id: 'FD', label: 'Fixed Dep', rate: '6%' }
    ];

    return (
        <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
            <View style={styles.container}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
                    <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />
                </TouchableOpacity>

                <View style={styles.modalContent}>
                    <LinearGradient colors={['#18181B', '#09090B']} style={styles.cardGradient}>

                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.headerTitleRow}>
                                <History size={20} color={COLORS.primary} />
                                <Text style={styles.title}>Time Machine</Text>
                            </View>
                            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                                <X size={20} color="#A1A1AA" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.subtitle}>
                            See what happens if you invested in the past (or started today).
                        </Text>

                        {/* Controls */}
                        <View style={styles.controls}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Monthly (₹)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={monthlyInvestment}
                                    onChangeText={setMonthlyInvestment}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>Years</Text>
                                <TextInput
                                    style={styles.input}
                                    value={years}
                                    onChangeText={setYears}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>

                        {/* Asset Selector */}
                        <View style={styles.assetRow}>
                            {assets.map(asset => (
                                <TouchableOpacity
                                    key={asset.id}
                                    style={[styles.assetBtn, assetClass === asset.id && styles.assetBtnActive]}
                                    onPress={() => setAssetClass(asset.id)}
                                >
                                    <Text style={[styles.assetLabel, assetClass === asset.id && styles.assetLabelActive]}>
                                        {asset.label} ({asset.rate})
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Results */}
                        <View style={styles.resultBox}>
                            <View style={styles.resultRow}>
                                <Text style={styles.resultLabel}>Invested</Text>
                                <Text style={styles.resultValuePlain}>₹{(result.invested / 100000).toFixed(2)} Lakhs</Text>
                            </View>

                            <View style={styles.divider} />

                            <View style={styles.resultRow}>
                                <View>
                                    <Text style={styles.resultLabelBig}>Final Value</Text>
                                    <Text style={styles.multiplier}>{result.multiplier.toFixed(1)}x Growth</Text>
                                </View>
                                <Text style={styles.resultValueBig}>₹{(result.value / 100000).toFixed(2)} Lakhs</Text>
                            </View>

                            <View style={styles.barContainer}>
                                <View style={[styles.barInvested, { flex: 1 }]} />
                                <View style={[styles.barProfit, { flex: result.multiplier - 1 }]} />
                            </View>
                            <View style={styles.barLabels}>
                                <Text style={styles.barLabelText}>Principal</Text>
                                <Text style={[styles.barLabelText, { color: '#10B981' }]}>Interest Earned</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.ctaBtn} onPress={onClose}>
                            <LinearGradient colors={[COLORS.primary, '#4F46E5']} style={styles.btnGradient}>
                                <Text style={styles.btnText}>Start Investing Now</Text>
                                <ArrowRight size={18} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>

                    </LinearGradient>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)' },
    modalContent: { width: width * 0.9, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#FFFFFF15' },
    cardGradient: { padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    title: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    closeBtn: { padding: 4, backgroundColor: '#27272A', borderRadius: 12 },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24, lineHeight: 18 },

    controls: { flexDirection: 'row', gap: 12, marginBottom: 20 },
    inputGroup: { flex: 1 },
    label: { color: '#71717A', fontSize: 11, textTransform: 'uppercase', marginBottom: 8, fontWeight: '700' },
    input: { backgroundColor: '#27272A', borderRadius: 12, padding: 12, color: '#FFF', fontSize: 16, fontWeight: '700', borderWidth: 1, borderColor: '#FFFFFF10' },

    assetRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
    assetBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#27272A', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF05' },
    assetBtnActive: { backgroundColor: '#4F46E520', borderColor: '#4F46E5' },
    assetLabel: { color: '#A1A1AA', fontSize: 11, fontWeight: '600' },
    assetLabelActive: { color: '#4F46E5' },

    resultBox: { backgroundColor: '#00000040', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#FFFFFF10', marginBottom: 24 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultLabel: { color: '#A1A1AA', fontSize: 13 },
    resultValuePlain: { color: '#FFF', fontSize: 16, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#FFFFFF10', marginVertical: 12 },
    resultLabelBig: { color: '#A1A1AA', fontSize: 12, textTransform: 'uppercase', fontWeight: '700' },
    resultValueBig: { color: '#10B981', fontSize: 24, fontWeight: '800' },
    multiplier: { color: '#10B981', fontSize: 11, fontWeight: '700', marginTop: 2 },

    barContainer: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', marginTop: 16, gap: 2 },
    barInvested: { backgroundColor: '#52525B' },
    barProfit: { backgroundColor: '#10B981' },
    barLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
    barLabelText: { fontSize: 10, color: '#71717A' },

    ctaBtn: { borderRadius: 16, overflow: 'hidden' },
    btnGradient: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 15 }
});
