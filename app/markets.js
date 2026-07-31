import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, TrendingUp, AlertTriangle, ShieldCheck, HelpCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function MarketsScreen() {
    const router = useRouter();

    // 1. Markets & Asset indices
    const [indices] = useState([
        { id: '1', name: 'BSE SENSEX Index', value: '82,145.20', change: '+1.2%', sparkline: [10, 15, 8, 20, 18, 25, 30] },
        { id: '2', name: '24K Gold Price (10g)', value: '₹74,800.00', change: '+0.4%', sparkline: [12, 14, 13, 15, 17, 16, 18] }
    ]);

    // 2. High-Risk Derivatives Leverage Calculator Simulator
    const [collateral, setCollateral] = useState('10000');
    const [leverage, setLeverage] = useState('10');
    const [marketMove, setMarketMove] = useState('-5'); // 5% drop

    const getSimulatedLoss = () => {
        const principal = parseFloat(collateral) || 0;
        const levFactor = parseFloat(leverage) || 1;
        const movePct = parseFloat(marketMove) || 0;
        
        // Loss = Principal * (Move % * Leverage) / 100
        const lossAmount = principal * (Math.abs(movePct) * levFactor) / 100;
        return Math.min(principal, lossAmount); // cannot lose more than collateral
    };

    return (
        <View style={styles.container}>
            <View style={styles.statusBarSpacer} />
            
            {/* Header */}
            <View style={styles.header}>
                <Pressable style={styles.backBtn} onPress={() => router.back()}>
                    <ArrowLeft size={24} color="#FFF" />
                </Pressable>
                <Text style={styles.headerTitle}>Markets & Guard</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
                {/* Sentiment Advisor */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Algorithmic Sentiment Advisor</Text>
                    {indices.map(ind => (
                        <View key={ind.id} style={styles.indexRow}>
                            <View>
                                <Text style={styles.indexName}>{ind.name}</Text>
                                <Text style={styles.indexVal}>{ind.value} ({ind.change})</Text>
                            </View>
                            {/* Sparkline Drawing Simulation with Flex Layout */}
                            <View style={styles.sparklineContainer}>
                                {ind.sparkline.map((h, i) => (
                                    <View key={i} style={[styles.sparkBar, { height: h }]} />
                                ))}
                            </View>
                        </View>
                    ))}
                    
                    <View style={styles.guardBanner}>
                        <ShieldCheck size={20} color="#10B981" style={{ marginTop: 2 }} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.guardTitle}>Guard Advisory Recommendation</Text>
                            <Text style={styles.guardText}>
                                General market volatility is currently low. Diverting 20% of free inflows to the emergency vault is recommended to safeguard capital against option traps.
                            </Text>
                        </View>
                    </View>
                </View>

                {/* High Leverage Warning Calculator */}
                <View style={[styles.card, { marginTop: 20 }]}>
                    <View style={styles.row}>
                        <AlertTriangle size={20} color="#F59E0B" />
                        <Text style={[styles.cardTitle, { marginLeft: 10, marginBottom: 0 }]}>Derivatives Leverage Guard</Text>
                    </View>
                    
                    <Text style={styles.infoText}>
                        Simulate the extreme loss impact of trading derivatives with high leverage factors to avoid liquidation events.
                    </Text>

                    <View style={styles.form}>
                        <Text style={styles.label}>Margin Collateral (₹)</Text>
                        <TextInput 
                            placeholder="Collateral Margin (₹)" 
                            placeholderTextColor="#52525B" 
                            style={styles.input}
                            keyboardType="numeric"
                            value={collateral}
                            onChangeText={setCollateral}
                        />

                        <Text style={styles.label}>Leverage Factor (Multiplier)</Text>
                        <TextInput 
                            placeholder="Leverage (e.g. 5, 10, 20)" 
                            placeholderTextColor="#52525B" 
                            style={styles.input}
                            keyboardType="numeric"
                            value={leverage}
                            onChangeText={setLeverage}
                        />

                        <Text style={styles.label}>Simulated Market Move Against Position (%)</Text>
                        <TextInput 
                            placeholder="Market Drop %" 
                            placeholderTextColor="#52525B" 
                            style={styles.input}
                            keyboardType="numeric"
                            value={marketMove}
                            onChangeText={setMarketMove}
                        />
                    </View>

                    <View style={styles.marginCard}>
                        <Text style={styles.marginTitle}>Simulated Liquidation Loss</Text>
                        <Text style={[styles.marginVal, { color: '#EF4444' }]}>
                            - ₹{getSimulatedLoss().toLocaleString()}
                        </Text>
                        <Text style={styles.dangerLabel}>
                            {getSimulatedLoss() >= parseFloat(collateral) ? '⚠️ TOTAL COLLATERAL LIQUIDATED!' : '⚠️ High Volatility Risk Area'}
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    statusBarSpacer: { height: 40 },
    header: { height: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20 },
    backBtn: { padding: 8 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '850' },
    contentScroll: { flex: 1, padding: 20 },
    card: { backgroundColor: '#101012', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#FFFFFF05' },
    cardTitle: { color: '#FFF', fontSize: 16, fontWeight: '800', marginBottom: 16 },
    indexRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05', alignItems: 'center' },
    indexName: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    indexVal: { color: '#FFF', fontSize: 14, fontWeight: '850', marginTop: 4 },
    sparklineContainer: { flexDirection: 'row', alignItems: 'flex-end', height: 30, gap: 3 },
    sparkBar: { width: 4, backgroundColor: '#10B981', borderRadius: 2 },
    guardBanner: { flexDirection: 'row', marginTop: 20, backgroundColor: '#10B98110', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#10B98120' },
    guardTitle: { color: '#10B981', fontSize: 13, fontWeight: '800' },
    guardText: { color: '#D4D4D8', fontSize: 11, lineHeight: 16, marginTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    infoText: { color: '#71717A', fontSize: 12, lineHeight: 18, marginBottom: 16 },
    form: { gap: 10, marginBottom: 16 },
    label: { color: '#A1A1AA', fontSize: 11, fontWeight: '700', marginBottom: 2 },
    input: { backgroundColor: '#000', color: '#FFF', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#27272A', fontSize: 13 },
    marginCard: { backgroundColor: '#18181B', padding: 16, borderRadius: 14, marginVertical: 10 },
    marginTitle: { color: '#A1A1AA', fontSize: 12, fontWeight: '700' },
    marginVal: { fontSize: 24, fontWeight: '900', marginTop: 4 },
    dangerLabel: { color: '#EF4444', fontSize: 11, fontWeight: '850', marginTop: 6 }
});
