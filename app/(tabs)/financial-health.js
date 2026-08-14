import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable, ActivityIndicator } from 'react-native';
import { Brain, TrendingUp, AlertTriangle, MessageSquare, Sparkles, FileText } from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import api, { getFinancialHealthMetrics } from '../../services/api';
import { useGlobalFinance } from '../../components/context/GlobalFinanceContext';
import HealthScoreGauge from '../../components/health/HealthScoreGauge';
import StressTestSimulator from '../../components/health/StressTestSimulator';
import LuxuryCard from '../../components/ui/LuxuryCard';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import StackHeader from '../../components/ui/StackHeader';

// New Components
import CreditSimulator from '../../components/health/CreditSimulator';
import PeerBenchmark from '../../components/health/PeerBenchmark';
import VisaCertificate from '../../components/health/VisaCertificate';
import RetirementReality from '../../components/health/RetirementReality';

// Restoring Analysis Services
import financialHealthAnalyzer from '../../services/financialHealthAnalyzer';
import smsParser from '../../services/smsParser';
import { saveFinancialData } from '../../services/storage';
import ProblemCard from '../../components/analyzer/ProblemCard';
import SolutionCard from '../../components/analyzer/SolutionCard';

export default function FinancialHealthScreen() {
    const { formatAmount } = useGlobalFinance();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState(null);
    const [stressScenarios, setStressScenarios] = useState({
        jobLoss: false,
        medicalEmergency: false
    });

    // Deep Analysis State (Restored)
    const [analysis, setAnalysis] = useState(null);
    const [smsStats, setSmsStats] = useState(null);
    const [smsLoading, setSmsLoading] = useState(false);
    const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0, status: '' });

    const loadData = async () => {
        setLoading(true);
        const data = await getFinancialHealthMetrics();
        setMetrics(data);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // RESTORED: Deep Analysis Logic
    const analyzeHealth = async () => {
        setSmsLoading(true);
        try {
            const result = await financialHealthAnalyzer.analyzeFinancialHealth('user_1');
            setAnalysis(result);
        } catch (error) {
            console.error('Analysis error:', error);
        } finally {
            setSmsLoading(false);
        }
    };

    const connectSMS = async () => {
        setSmsLoading(true);
        setProgress({ current: 0, total: 0, percentage: 0, status: 'Requesting SMS permission...' });

        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            setProgress({ current: 0, total: 0, percentage: 5, status: 'Loading SMS messages...' });

            const transactions = await smsParser.readBankSMS(3650);
            const totalMessages = transactions.length;

            if (totalMessages === 0) {
                alert('No bank/UPI SMS messages found.');
                setSmsLoading(false);
                return;
            }

            setProgress({ current: totalMessages, total: totalMessages, percentage: 60, status: `Found ${totalMessages} transactions!` });
            await new Promise(resolve => setTimeout(resolve, 500));

            const stats = smsParser.getStatistics(transactions);
            setSmsStats(stats);
            await saveFinancialData({ ...stats, all_transactions: transactions });

            setProgress({ current: totalMessages, total: totalMessages, percentage: 95, status: 'Running financial analysis...' });

            await analyzeHealth();
            // Reload basic metrics too as we have new data
            await loadData();

        } catch (error) {
            console.error('SMS error:', error);
            alert('Error reading SMS. Ensure permissions are granted.');
        } finally {
            setTimeout(() => {
                setSmsLoading(false);
                setProgress({ current: 0, total: 0, percentage: 0, status: '' });
            }, 1000);
        }
    };

    // Derived Logic for Stress Tests
    const getProjectedRunway = () => {
        if (!metrics) return 0;

        let availableCash = metrics.liquidAssets;
        let monthlyBurn = metrics.monthlyExpenses + metrics.monthlyDebtService;
        let monthlyInc = metrics.monthlyIncome;

        if (stressScenarios.medicalEmergency) {
            availableCash -= 500000;
        }
        if (stressScenarios.jobLoss) {
            monthlyInc = 0;
        }

        const netBurn = monthlyBurn - monthlyInc;

        if (netBurn <= 0) return 999;
        if (availableCash <= 0) return 0;

        return availableCash / netBurn;
    };

    const runwayMonths = getProjectedRunway();

    // Calculate Health Score (Simplified Logic)
    const calculateScore = () => {
        if (!metrics) return 0;
        let score = 50;
        if (metrics.savingsRate > 20) score += 20;
        else if (metrics.savingsRate > 10) score += 10;
        else if (metrics.savingsRate < 0) score -= 10;

        if (metrics.dti < 30) score += 20;
        else if (metrics.dti < 40) score += 10;
        else score -= 10;

        const baseRunway = (metrics.liquidAssets / (metrics.monthlyExpenses || 1));
        if (baseRunway > 6) score += 10;

        return Math.min(100, Math.max(0, score));
    };

    const healthScore = calculateScore();

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#10B981" />}
            >
                {/* Header */}
                <StackHeader title="Financial Health" subtitle="Real-time diagnostic & stress testing" />

                {/* Score Gauge */}
                <HealthScoreGauge score={healthScore} />

                {/* Key Metrics Grid */}
                {metrics && (
                    <View style={styles.grid}>
                        <LuxuryCard style={styles.metricCard} index={0}>
                            <Text style={styles.metricLabel}>Net Worth</Text>
                            <Text style={styles.metricValue}>{formatAmount((metrics?.totalAssets || 0) - (metrics?.totalDebt || 0), 0)}</Text>
                        </LuxuryCard>
                        <LuxuryCard style={styles.metricCard} index={1}>
                            <Text style={styles.metricLabel}>Savings Rate</Text>
                            <Text style={[styles.metricValue, { color: (metrics.savingsRate || 0) > 0 ? '#10B981' : '#EF4444' }]}>
                                {(metrics.savingsRate || 0).toFixed(1)}%
                            </Text>
                        </LuxuryCard>
                        <LuxuryCard style={styles.metricCard} index={2}>
                            <Text style={styles.metricLabel}>Debt-to-Income</Text>
                            <Text style={[styles.metricValue, { color: (metrics.dti || 0) < 35 ? '#10B981' : '#F59E0B' }]}>
                                {(metrics.dti || 0).toFixed(1)}%
                            </Text>
                        </LuxuryCard>
                        <LuxuryCard style={styles.metricCard} index={3}>
                            <Text style={styles.metricLabel}>Monthly Burn</Text>
                            <Text style={styles.metricValue}>{formatAmount((metrics?.monthlyExpenses || 0) + (metrics?.monthlyDebtService || 0), 0)}</Text>
                        </LuxuryCard>
                    </View>
                )}

                {/* Stress Test Simulator */}
                <StressTestSimulator
                    scenarios={stressScenarios}
                    onToggleScenario={(key) => setStressScenarios(prev => ({ ...prev, [key]: !prev[key] }))}
                />

                {/* Runway Visualization */}
                <LuxuryCard style={[styles.runwayCard, runwayMonths < 3 && styles.runwayCritical]} index={4}>
                    <View style={styles.runwayHeader}>
                        <TrendingUp size={20} color={runwayMonths < 3 ? '#EF4444' : '#10B981'} />
                        <Text style={styles.runwayTitle}>Survival Runway</Text>
                    </View>
                    <Text style={styles.runwayValue}>
                        {runwayMonths >= 999 ? '> 5 Years' : `${runwayMonths.toFixed(1)} Months`}
                    </Text>
                    <Text style={styles.runwayDesc}>
                        {runwayMonths < 3
                            ? "CRITICAL: You are vulnerable to shocks. Increase liquidity immediately."
                            : "You have a solid safety net."}
                    </Text>
                    {stressScenarios.jobLoss && (
                        <View style={styles.alertTag}>
                            <AlertTriangle size={12} color="#FFF" />
                            <Text style={styles.alertText}>Job Loss Simulated</Text>
                        </View>
                    )}
                </LuxuryCard>

                {/* Retirement Reality Check (World Class Feature) */}
                <RetirementReality metrics={metrics} />

                {/* Credit Simulator (New Feature) */}
                <CreditSimulator />

                {/* Peer Benchmarking (New Feature) */}
                <PeerBenchmark />

                {/* Visa Certificate Generator (Utility) */}
                <VisaCertificate />

                {/* RESTORED: Deep Analysis Section */}
                <View style={styles.divider} />
                <Text style={styles.sectionTitle}>Deep Dive Analysis</Text>
                <Text style={styles.sectionSubtitle}>Connect SMS for granular insights & automated recommendations.</Text>

                {!analysis && !smsLoading && (
                    <View style={styles.actionGrid}>
                        <Pressable style={styles.actionCard} onPress={connectSMS}>
                            <View style={[styles.iconBox, { backgroundColor: '#10B98120' }]}>
                                <MessageSquare color="#10B981" size={24} />
                            </View>
                            <Text style={styles.actionTitle}>Connect SMS</Text>
                            <Text style={styles.actionDesc}>Auto-read 10 years of history</Text>
                        </Pressable>

                        <Pressable style={styles.actionCard} onPress={analyzeHealth}>
                            <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                                <Sparkles color="#F59E0B" size={24} />
                            </View>
                            <Text style={styles.actionTitle}>Quick Scan</Text>
                            <Text style={styles.actionDesc}>Analyze current app data</Text>
                        </Pressable>
                    </View>
                )}

                {/* Analysis Loading State */}
                {smsLoading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator color="#10B981" size="large" />
                        <Text style={styles.loadingText}>{progress.status || 'Analyzing...'}</Text>
                        {progress.percentage > 0 && <Text style={styles.loadingPercent}>{progress.percentage}%</Text>}
                    </View>
                )}

                {/* Analysis Results */}
                {analysis && (
                    <View>
                        {analysis.problems && analysis.problems.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.subHeader}>🚨 Detected Issues</Text>
                                {analysis.problems.map((problem, index) => (
                                    <ProblemCard key={index} problem={problem} onViewSolution={() => { }} />
                                ))}
                            </View>
                        )}

                        {analysis.solutions && analysis.solutions.length > 0 && (
                            <View style={styles.section}>
                                <Text style={styles.subHeader}>💡 Recommendations</Text>
                                <Text style={styles.savingPotential}>
                                    Save up to {formatAmount(analysis.solutions.reduce((sum, s) => sum + (s.monthly_savings || 0), 0) * 12, 0)}/year
                                </Text>
                                {analysis.solutions.map((solution, index) => (
                                    <SolutionCard
                                        key={index}
                                        solution={solution}
                                        onStart={() => alert(`Reviewing: ${solution.action}`)}
                                    />
                                ))}
                            </View>
                        )}

                        <Pressable style={styles.reanalyzeBtn} onPress={analyzeHealth}>
                            <Text style={styles.reanalyzeText}>Re-Run Analysis</Text>
                        </Pressable>
                    </View>
                )}

            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { padding: 20, paddingBottom: 100 },
    header: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 24, marginTop: 40 },
    title: { fontSize: 28, fontWeight: '900', color: '#FFF' },
    subtitle: { fontSize: 13, color: '#71717A' },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
    metricCard: { width: '48%', padding: 16, backgroundColor: '#18181B' },
    metricLabel: { color: '#71717A', fontSize: 12, marginBottom: 4, textTransform: 'uppercase' },
    metricValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },

    runwayCard: { padding: 20, backgroundColor: '#18181B', marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#10B981' },
    runwayCritical: { borderLeftColor: '#EF4444', backgroundColor: '#EF444410' },
    runwayHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    runwayTitle: { color: '#FFF', fontWeight: '700' },
    runwayValue: { color: '#FFF', fontSize: 32, fontWeight: '900', marginBottom: 4 },
    runwayDesc: { color: '#A1A1AA', fontSize: 13 },
    alertTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EF4444', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginTop: 12 },
    alertText: { color: '#FFF', fontSize: 10, fontWeight: '700' },

    divider: { height: 1, backgroundColor: '#27272A', marginBottom: 24 },
    sectionTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 4 },
    sectionSubtitle: { fontSize: 13, color: '#71717A', marginBottom: 16 },

    actionGrid: { flexDirection: 'row', gap: 12 },
    actionCard: { flex: 1, backgroundColor: '#18181B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#27272A' },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    actionTitle: { color: '#FFF', fontWeight: '700', marginBottom: 4 },
    actionDesc: { color: '#71717A', fontSize: 11 },

    loadingContainer: { padding: 20, alignItems: 'center' },
    loadingText: { color: '#FFF', marginTop: 12 },
    loadingPercent: { color: '#10B981', fontSize: 20, fontWeight: '800', marginTop: 4 },

    section: { marginBottom: 24 },
    subHeader: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 12, marginTop: 8 },
    savingPotential: { color: '#10B981', fontSize: 14, fontWeight: '600', marginBottom: 12 },
    reanalyzeText: { color: '#FFF', fontWeight: '700' },
    impactBox: { padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginTop: 8 }
});
