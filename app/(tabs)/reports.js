import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, Modal, Dimensions } from 'react-native';
import { FileBarChart, Calendar, Sparkles, TrendingUp, TrendingDown, Landmark, PieChart as PieIcon, RefreshCw } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StatCard from '../../components/ui/StatCard';
import BarChart from '../../components/charts/BarChart';
import PieChart from '../../components/charts/PieChart';
import StackHeader from '../../components/ui/StackHeader';
import { ReportsService } from '../../services/reports';

export default function ReportsScreen() {
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [chartMode, setChartMode] = useState('BAR'); // 'BAR' or 'PIE'

    const fetchReport = async () => {
        try {
            const data = await ReportsService.generateReport();
            setReportData(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchReport();
    };

    if (loading || !reportData) {
        return (
            <AnimatedScreen style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>Reports</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <RefreshCw size={32} color="#6366F1" style={{ opacity: 0.5 }} />
                </View>
            </AnimatedScreen>
        );
    }

    const {
        netWorth, totalAssets, totalLiabilities,
        monthlyIncome, monthlyExpense,
        incomeVsExpense, expenseByCategory, healthScore
    } = reportData;

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366F1" />
                }
                contentContainerStyle={styles.content}
            >
                {/* Header */}
                <StackHeader title="Reports" subtitle="Financial Overview" />

                {/* Net Worth Card */}
                <LinearGradient
                    colors={['#4F46E5', '#3730A3']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={styles.netWorthCard}
                >
                    <View style={styles.nwHeader}>
                        <Sparkles size={20} color="#818CF8" />
                        <Text style={styles.nwLabel}>TOTAL NET WORTH</Text>
                    </View>
                    <Text style={styles.nwValue}>₹{netWorth.toLocaleString()}</Text>

                    <View style={styles.nwStats}>
                        <View>
                            <Text style={styles.nwStatLabel}>Assets</Text>
                            <Text style={styles.nwStatValue}>₹{totalAssets.toLocaleString()}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View>
                            <Text style={styles.nwStatLabel}>Liabilities</Text>
                            <Text style={styles.nwStatValue}>₹{totalLiabilities.toLocaleString()}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View>
                            <Text style={styles.nwStatLabel}>Health Score</Text>
                            <Text style={[styles.nwStatValue, { color: healthScore > 70 ? '#10B981' : '#F59E0B' }]}>
                                {healthScore}/100
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* Monthly Overview */}
                <View style={styles.statsRow}>
                    <StatCard
                        label="Monthly Income"
                        value={`₹${monthlyIncome.toLocaleString()}`}
                        icon={TrendingUp}
                        iconColor="#10B981"
                    />
                    <StatCard
                        label="Monthly Expense"
                        value={`₹${monthlyExpense.toLocaleString()}`}
                        icon={TrendingDown}
                        iconColor="#EF4444"
                    />
                </View>

                {/* Chart Section */}
                <LuxuryCard style={styles.chartCard} delay={200}>
                    <View style={styles.chartHeader}>
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                            {chartMode === 'BAR' ? <FileBarChart size={20} color="#A1A1AA" /> : <PieIcon size={20} color="#A1A1AA" />}
                            <Text style={styles.chartTitle}>
                                {chartMode === 'BAR' ? 'Income vs Expense' : 'Expense Breakdown'}
                            </Text>
                        </View>
                        <View style={styles.chartToggle}>
                            <Pressable
                                style={[styles.chartBtn, chartMode === 'BAR' && styles.chartBtnActive]}
                                onPress={() => setChartMode('BAR')}
                            >
                                <FileBarChart size={16} color={chartMode === 'BAR' ? '#FFF' : '#71717A'} />
                            </Pressable>
                            <Pressable
                                style={[styles.chartBtn, chartMode === 'PIE' && styles.chartBtnActive]}
                                onPress={() => setChartMode('PIE')}
                            >
                                <PieIcon size={16} color={chartMode === 'PIE' ? '#FFF' : '#71717A'} />
                            </Pressable>
                        </View>
                    </View>

                    {chartMode === 'BAR' ? (
                        <View>
                            <BarChart
                                data={incomeVsExpense}
                                width={Dimensions.get('window').width - 80}
                                height={220}
                            />
                            <View style={styles.legendRow}>
                                <View style={styles.legendItem}>
                                    <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
                                    <Text style={styles.legendText}>Income</Text>
                                </View>
                                <View style={styles.legendItem}>
                                    <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
                                    <Text style={styles.legendText}>Expense</Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <PieChart
                            data={expenseByCategory}
                            size={220}
                        />
                    )}
                </LuxuryCard>

                {/* Tax Estimate (Mock) */}
                <LuxuryCard style={styles.taxCard} delay={300}>
                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Landmark size={24} color="#A1A1AA" />
                        </View>
                        <View>
                            <Text style={styles.taxLabel}>Estimated Tax Tax (Old Regime)</Text>
                            <Text style={styles.taxValue}>₹{(monthlyIncome * 12 * 0.1).toLocaleString()}</Text>
                            <Text style={styles.taxSub}>Approx 10% of annual projected</Text>
                        </View>
                    </View>
                </LuxuryCard>

            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    content: { padding: 20, paddingBottom: 100 },
    header: { paddingTop: 60, paddingBottom: 24 },
    headerLabel: { color: '#6366F1', fontWeight: '700', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' },
    title: { color: '#FFF', fontSize: 32, fontWeight: '900' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    netWorthCard: { borderRadius: 24, padding: 24, marginBottom: 24 },
    nwHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 },
    nwLabel: { color: '#818CF8', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    nwValue: { color: '#FFF', fontSize: 36, fontWeight: '900', marginBottom: 24 },
    nwStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.2)', padding: 16, borderRadius: 16 },
    nwStatLabel: { color: '#A5B4FC', fontSize: 12, marginBottom: 4 },
    nwStatValue: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    divider: { width: 1, backgroundColor: 'rgba(255,255,255,0.1)' },

    statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },

    chartCard: { padding: 24, marginBottom: 24, alignItems: 'center' },
    chartHeader: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 24 },
    chartTitle: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    chartToggle: { flexDirection: 'row', backgroundColor: '#27272A', borderRadius: 8, padding: 2 },
    chartBtn: { padding: 8, borderRadius: 6 },
    chartBtnActive: { backgroundColor: '#6366F1' },

    legendRow: { flexDirection: 'row', gap: 16, marginTop: 16 },
    legendItem: { flexDirection: 'row', gap: 6, alignItems: 'center' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    legendText: { color: '#A1A1AA', fontSize: 12 },

    taxCard: { padding: 20 },
    row: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center' },
    taxLabel: { color: '#A1A1AA', fontSize: 14, marginBottom: 4 },
    taxValue: { color: '#FFF', fontSize: 20, fontWeight: '700' },
    taxSub: { color: '#52525B', fontSize: 12 }
});
