import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { X, ArrowRightLeft, FileText, Settings, ShieldCheck, TrendingUp, Wallet, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useGlobalFinance } from '../context/GlobalFinanceContext';
import LuxuryCard from '../ui/LuxuryCard';

const { width } = Dimensions.get('window');

export default function AccountDetailModal({ visible, onClose, account }) {
    if (!account) return null;

    const { formatAmount, inflationRate } = useGlobalFinance();
    const [simulatedTransfer, setSimulatedTransfer] = useState(0);

    // FD Rate assumption for simulator (e.g., 7.0%)
    const FD_RATE = 7.0;
    const SAVINGS_RATE = account.interest_rate || 3.0;
    const RATE_DIFF = FD_RATE - SAVINGS_RATE;

    const potentialGain = (simulatedTransfer * (RATE_DIFF / 100)); // Per year

    const handleSetPercent = (percent) => {
        setSimulatedTransfer(account.balance * percent);
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.bankName}>{account.bank_name}</Text>
                            <Text style={styles.accountType}>{account.type} • {account.account_number.slice(-4)}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Balance Hero */}
                        <View style={styles.heroSection}>
                            <Text style={styles.heroLabel}>Total Balance</Text>
                            <Text style={styles.heroAmount}>{formatAmount(account.balance)}</Text>
                            {account.interest_rate > 0 && (
                                <View style={styles.interestBadge}>
                                    <TrendingUp size={14} color="#10B981" />
                                    <Text style={styles.interestText}>Earning {account.interest_rate}% APY</Text>
                                </View>
                            )}
                        </View>

                        {/* Actions Grid */}
                        <View style={styles.actionsGrid}>
                            <ActionButton icon={ArrowRightLeft} label="Transfer" color="#3B82F6" />
                            <ActionButton icon={FileText} label="Statement" color="#8B5CF6" />
                            <ActionButton icon={ShieldCheck} label="Freeze" color="#EF4444" />
                            <ActionButton icon={Settings} label="Settings" color="#71717A" />
                        </View>

                        {/* Yield Optimizer Sandbox (World Class Feature) */}
                        <LuxuryCard style={styles.simulatorCard}>
                            <View style={styles.simulatorHeader}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#8B5CF620', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                                    <Sparkles size={16} color="#8B5CF6" />
                                </View>
                                <Text style={styles.simulatorTitle}>Yield Optimizer Sandbox</Text>
                            </View>

                            <Text style={styles.simulatorDesc}>
                                Move idle cash to Fixed Deposits (7%) to beat inflation.
                            </Text>

                            {/* Custom Slider / Selector */}
                            <View style={styles.sliderContainer}>
                                <Text style={styles.sliderLabel}>Simulate Transfer Amount: <Text style={{ color: '#8B5CF6' }}>{formatAmount(simulatedTransfer)}</Text></Text>
                                <View style={styles.percentRow}>
                                    {[0.1, 0.25, 0.5, 0.75].map((p) => (
                                        <TouchableOpacity
                                            key={p}
                                            onPress={() => handleSetPercent(p)}
                                            style={[styles.percentBtn, simulatedTransfer === account.balance * p && styles.percentBtnActive]}
                                        >
                                            <Text style={[styles.percentText, simulatedTransfer === account.balance * p && styles.percentTextActive]}>{(p * 100).toFixed(0)}%</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Real-time Result Box */}
                            <View style={styles.resultBox}>
                                <Text style={styles.resultLabel}>Extra Yearly Income</Text>
                                <Text style={styles.resultAmount}>+₹{formatAmount(potentialGain).replace('₹', '')}</Text>
                                <Text style={styles.resultSub}>if you optimize today</Text>
                            </View>

                            {/* Liquidity Risk Indicator */}
                            {simulatedTransfer > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, justifyContent: 'center' }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: simulatedTransfer > account.balance * 0.5 ? '#EF4444' : '#10B981' }} />
                                    <Text style={{ fontSize: 12, color: '#A1A1AA', fontWeight: '600' }}>
                                        Liquidity Impact: <Text style={{ color: simulatedTransfer > account.balance * 0.5 ? '#EF4444' : '#10B981' }}>{simulatedTransfer > account.balance * 0.5 ? 'High' : 'Low'}</Text>
                                    </Text>
                                </View>
                            )}
                        </LuxuryCard>

                        {/* Inflation Erosion Monitor (World Class Feature) */}
                        <LuxuryCard style={[styles.simulatorCard, { borderColor: '#EF444430', backgroundColor: '#18181B' }]}>
                            <View style={styles.simulatorHeader}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#EF444420', justifyContent: 'center', alignItems: 'center', marginRight: 8 }}>
                                    <TrendingUp size={16} color="#EF4444" style={{ transform: [{ rotate: '180deg' }] }} />
                                </View>
                                <Text style={[styles.simulatorTitle, { color: '#EF4444' }]}>Inflation Erosion Monitor</Text>
                            </View>

                            <Text style={styles.simulatorDesc}>
                                At {inflationRate?.toFixed(1)}% inflation, the real purchasing power of your <Text style={{ color: '#FFF', fontWeight: '700' }}>{formatAmount(account.balance)}</Text> is dropping every second.
                            </Text>

                            <InflationTicker balance={account.balance} />

                            <Text style={{ fontSize: 11, color: '#71717A', marginTop: 12, textAlign: 'center', fontStyle: 'italic' }}>
                                "Cash is not a safe haven. It's a melting ice cube."
                            </Text>
                        </LuxuryCard>

                        {/* Features List */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Account Benefits</Text>
                            {account.features && account.features.map((feature, i) => (
                                <View key={i} style={styles.featureRow}>
                                    <View style={styles.featureDot} />
                                    <Text style={styles.featureText}>{feature}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const ActionButton = ({ icon: Icon, label, color }) => (
    <TouchableOpacity style={styles.actionBtn}>
        <View style={[styles.actionIcon, { backgroundColor: `${color}20`, borderColor: color }]}>
            <Icon size={24} color={color} />
        </View>
        <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
);

// Sub-component for Real-time Inflation
function InflationTicker({ balance }) {
    const { formatAmount, inflationRate } = useGlobalFinance();
    const [realValue, setRealValue] = useState(balance);

    useEffect(() => {
        // Inflation rate from context (dynamic)
        // Loss per second = Balance * (inflationRate/100) / 365 / 24 / 3600
        const lossPerSecond = (balance * (inflationRate / 100)) / 31536000;

        const interval = setInterval(() => {
            setRealValue(prev => Math.max(0, prev - lossPerSecond));
        }, 1000); // Update every second

        return () => clearInterval(interval);
    }, [balance, inflationRate]);

    const lostAmount = balance - realValue;

    return (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
            <Text style={{ fontSize: 12, color: '#A1A1AA', textTransform: 'uppercase', letterSpacing: 1, fontWeight: '700', marginBottom: 4 }}>
                Real Value (Live)
            </Text>
            <Text style={{ fontSize: 32, fontWeight: '900', color: '#EF4444', fontVariant: ['tabular-nums'] }}>
                {formatAmount(realValue, 4)}
            </Text>
            <Text style={{ fontSize: 13, color: '#EF444480', fontWeight: '600', marginTop: 4 }}>
                You've lost ₹{lostAmount.toFixed(4)} to inflation
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContainer: { height: '90%', backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' },
    bankName: { fontSize: 24, fontWeight: '700', color: '#FFF' },
    accountType: { color: '#A1A1AA', fontSize: 14 },
    closeBtn: { padding: 8, backgroundColor: '#27272A', borderRadius: 20 },
    scrollContent: { padding: 24 },
    heroSection: { alignItems: 'center', marginBottom: 32 },
    heroLabel: { color: '#A1A1AA', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
    heroAmount: { fontSize: 42, fontWeight: '900', color: '#FFF', marginVertical: 8 },
    interestBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#10B98120', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    interestText: { color: '#10B981', fontWeight: '700', fontSize: 12 },
    actionsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
    actionBtn: { alignItems: 'center', gap: 8 },
    actionIcon: { width: 56, height: 56, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    actionLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    simulatorCard: { backgroundColor: '#27272A', padding: 20, marginBottom: 32 },
    simulatorHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    simulatorTitle: { color: '#F59E0B', fontSize: 16, fontWeight: '700' },
    simulatorDesc: { color: '#A1A1AA', fontSize: 13, marginBottom: 16, lineHeight: 20, fontWeight: '500' },
    sliderContainer: { marginBottom: 20 },
    sliderLabel: { color: '#FFF', fontWeight: '600', marginBottom: 12, fontSize: 13 },
    percentRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, gap: 8 },
    percentBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#FFFFFF08', borderWidth: 1, borderColor: '#FFFFFF10', alignItems: 'center' },
    percentBtnActive: { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' },
    percentText: { color: '#71717A', fontWeight: '600', fontSize: 13 },
    percentTextActive: { color: '#8B5CF6', fontWeight: '700' },
    resultBox: { backgroundColor: '#10B98110', padding: 16, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#10B98130' },
    resultLabel: { color: '#10B981', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
    resultAmount: { fontSize: 32, fontWeight: '900', color: '#10B981', marginVertical: 4, letterSpacing: -1 },
    resultSub: { color: '#10B98180', fontSize: 11, fontWeight: '600' },
    section: { marginBottom: 40 },
    sectionTitle: { color: '#71717A', fontWeight: '700', marginBottom: 16, textTransform: 'uppercase' },
    featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF05' },
    featureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    featureText: { color: '#D4D4D8', fontSize: 15 }
});
