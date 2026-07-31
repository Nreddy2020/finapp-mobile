import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { X, Calculator, PieChart, TrendingDown, PiggyBank, ArrowRight, CircleDollarSign, Clock } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import LuxuryCard from '../ui/LuxuryCard';

const { width } = Dimensions.get('window');

export default function LoanDetailModal({ visible, onClose, loan }) {
    if (!loan) return null;

    const [extraPayment, setExtraPayment] = useState(0);

    // Loan Constants
    const P = parseFloat(loan.outstanding_amount || 0);
    const R = parseFloat(loan.interest_rate || 9) / 12 / 100; // Monthly Rate
    const EMI = parseFloat(loan.emi_amount || (P * R * Math.pow(1 + R, 240)) / (Math.pow(1 + R, 240) - 1)); // Estimated if missing

    // Simple Interest / Tenure logic for demo
    const remainingTenureMonths = loan.remaining_tenure || 180;
    const totalRemainingPayment = EMI * remainingTenureMonths;
    const totalInterest = totalRemainingPayment - P;

    // Simulation Logic
    // If we pay 'extraPayment' monthly, how much interest is saved?
    // Simplified Approximation: 
    // New Tenure = -log(1 - (P*R)/ (EMI + Extra)) / log(1+R)

    const newEMI = EMI + extraPayment;
    const newTenureMonths = Math.log(newEMI / (newEMI - P * R)) / Math.log(1 + R);
    const newTotalPayment = newEMI * newTenureMonths;
    const newTotalInterest = newTotalPayment - P;

    const savings = Math.max(0, totalInterest - newTotalInterest);
    const monthsSaved = Math.max(0, remainingTenureMonths - newTenureMonths);

    // Chart Data
    const totalPie = P + totalInterest;
    const principalPct = (P / totalPie) * 100;
    const interestPct = (totalInterest / totalPie) * 100;

    // Donut Chart Config
    const radius = 60;
    const strokeWidth = 20;
    const circumference = 2 * Math.PI * radius;
    const principalStroke = (principalPct / 100) * circumference;
    const interestStroke = circumference - principalStroke;

    const formatCurrency = (amount) => {
        return '₹' + Math.round(amount).toLocaleString('en-IN');
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.overlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.bankName}>{loan.name || 'Personal Loan'}</Text>
                            <Text style={styles.accountType}>Outstanding: {formatCurrency(P)}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <X size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>

                        {/* Visualization Section */}
                        <View style={styles.chartContainer}>
                            <View style={styles.chartWrapper}>
                                <Svg height="160" width="160" viewBox="0 0 160 160">
                                    <G rotation="-90" origin="80, 80">
                                        {/* Background Circle (Interest) */}
                                        <Circle
                                            cx="80"
                                            cy="80"
                                            r={radius}
                                            stroke="#EF4444"
                                            strokeWidth={strokeWidth}
                                            fill="transparent"
                                            strokeOpacity={0.2}
                                        />
                                        {/* Filled Circle (Principal) */}
                                        <Circle
                                            cx="80"
                                            cy="80"
                                            r={radius}
                                            stroke="#10B981"
                                            strokeWidth={strokeWidth}
                                            fill="transparent"
                                            strokeDasharray={`${principalStroke} ${circumference}`}
                                            strokeLinecap="round"
                                        />
                                    </G>
                                </Svg>
                                <View style={styles.chartLegend}>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                                        <Text style={styles.legendText}>Principal ({Math.round(principalPct)}%)</Text>
                                    </View>
                                    <View style={styles.legendItem}>
                                        <View style={[styles.dot, { backgroundColor: '#EF444450' }]} />
                                        <Text style={styles.legendText}>Interest ({Math.round(interestPct)}%)</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.statsRow}>
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Current EMI</Text>
                                    <Text style={styles.statValue}>{formatCurrency(EMI)}</Text>
                                </View>
                                <View style={styles.separator} />
                                <View style={styles.statBox}>
                                    <Text style={styles.statLabel}>Tenure Left</Text>
                                    <Text style={styles.statValue}>{Math.round(remainingTenureMonths)}m</Text>
                                </View>
                            </View>
                        </View>

                        {/* Payoff Time Machine (World Class Feature) */}
                        <LuxuryCard style={styles.strategyCard}>
                            <View style={styles.strategyHeader}>
                                <View style={styles.iconBox}>
                                    <Clock size={20} color="#F59E0B" />
                                </View>
                                <View>
                                    <Text style={styles.strategyTitle}>Payoff Time Machine</Text>
                                    <Text style={styles.strategySubtitle}>Travel forward in time to your debt-free date.</Text>
                                </View>
                            </View>

                            {/* Custom Slider for Extra EMI */}
                            <View style={styles.inputContainer}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                                    <Text style={styles.inputLabel}>Extra Monthly Payment</Text>
                                    <Text style={{ color: '#F59E0B', fontWeight: '700' }}>+ {formatCurrency(extraPayment)}</Text>
                                </View>

                                <View style={styles.sliderTrack}>
                                    {[0, 2000, 5000, 10000, 20000].map((val, index) => (
                                        <TouchableOpacity
                                            key={val}
                                            onPress={() => setExtraPayment(val)}
                                            style={[styles.sliderTick, extraPayment >= val && styles.sliderTickActive]}
                                        >
                                            <View style={[styles.tickDot, extraPayment === val && styles.tickDotActive]} />
                                            <Text style={[styles.tickLabel, extraPayment === val && styles.tickLabelActive]}>
                                                {val === 0 ? '0' : `${val / 1000}k`}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                    <View style={[styles.sliderFill, { width: `${(extraPayment / 20000) * 100}%` }]} />
                                </View>
                            </View>

                            {/* Freedom Date Visualizer */}
                            <View style={[styles.impactBox, extraPayment > 0 && { backgroundColor: '#10B98110', borderColor: '#10B98130' }]}>
                                <Text style={styles.impactLabel}>NEW FREEDOM DATE</Text>
                                <Text style={styles.freedomDate}>
                                    {new Date(new Date().setMonth(new Date().getMonth() + newTenureMonths)).toDateString().split(' ').slice(1).join(' ')}
                                </Text>

                                {extraPayment > 0 ? (
                                    <View style={{ marginTop: 12 }}>
                                        <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>
                                            🎉 You buy back <Text style={{ fontSize: 16 }}>{(monthsSaved / 12).toFixed(1)} Years</Text> of your life!
                                        </Text>
                                        <Text style={{ color: '#10B98180', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                                            And save {formatCurrency(savings)} in interest.
                                        </Text>
                                    </View>
                                ) : (
                                    <Text style={{ color: '#71717A', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
                                        Move the slider to see how fast you can be free.
                                    </Text>
                                )}
                            </View>
                        </LuxuryCard>

                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'flex-end' },
    modalContainer: { height: '85%', backgroundColor: '#18181B', borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
    header: { padding: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' },
    bankName: { fontSize: 22, fontWeight: '700', color: '#FFF' },
    accountType: { color: '#EF4444', fontSize: 14, fontWeight: '600', marginTop: 4 },
    closeBtn: { padding: 8, backgroundColor: '#27272A', borderRadius: 20 },
    scrollContent: { padding: 24 },
    chartContainer: { alignItems: 'center', marginBottom: 32 },
    chartWrapper: { alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    chartLegend: { marginTop: 16, flexDirection: 'row', gap: 24 },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row', backgroundColor: '#27272A', padding: 16, borderRadius: 16, width: '100%', justifyContent: 'space-between' },
    statBox: { flex: 1, alignItems: 'center' },
    separator: { width: 1, backgroundColor: '#FFFFFF10' },
    statLabel: { color: '#71717A', fontSize: 12, textTransform: 'uppercase', marginBottom: 6, fontWeight: '700' },
    statValue: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    strategyCard: { backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10', padding: 20 },
    strategyHeader: { flexDirection: 'row', gap: 16, marginBottom: 24 },
    iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#F59E0B20', justifyContent: 'center', alignItems: 'center' },
    strategyTitle: { color: '#FFF', fontSize: 16, fontWeight: '700', marginBottom: 4 },
    strategySubtitle: { color: '#A1A1AA', fontSize: 13, flexWrap: 'wrap', maxWidth: 220 },
    inputContainer: { marginBottom: 24 },
    inputLabel: { color: '#A1A1AA', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
    buttonsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    amtButton: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#27272A', alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },
    amtButtonActive: { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' },
    amtText: { color: '#A1A1AA', fontWeight: '600', fontSize: 13 },
    amtText: { color: '#A1A1AA', fontWeight: '600', fontSize: 13 },
    amtTextActive: { color: '#F59E0B', fontWeight: '700' },

    // Slider Styles
    sliderTrack: { height: 40, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#27272A', borderRadius: 20, paddingHorizontal: 10, position: 'relative' },
    sliderFill: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#F59E0B20', borderRadius: 20, zIndex: -1 },
    sliderTick: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
    tickDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#52525B', marginBottom: 4 },
    tickDotActive: { backgroundColor: '#F59E0B', width: 6, height: 6, borderRadius: 3 },
    tickLabel: { fontSize: 10, color: '#52525B', fontWeight: '600' },
    tickLabelActive: { color: '#F59E0B' },

    impactBox: { backgroundColor: '#27272A', padding: 20, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF10', alignItems: 'center', marginTop: 8 },
    impactLabel: { color: '#71717A', fontSize: 11, fontWeight: '800', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 1 },
    freedomDate: { fontSize: 28, fontWeight: '900', color: '#FFF', letterSpacing: -0.5 },
    impactValueSuccess: { color: '#10B981', fontSize: 18, fontWeight: '800' },
    impactBar: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#10B98130', alignItems: 'center' },
    impactBarText: { color: '#10B981', fontWeight: '700', fontSize: 12 }
});
