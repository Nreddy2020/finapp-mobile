import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, PieChart, Wallet, CreditCard, ArrowRight, Activity } from 'lucide-react-native';

export default function EnhancedAnalytics({ income, expenses, currency, formatAmount }) {
    // 1. Calculate Totals
    const totalIncome = income.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
    const disposableIncome = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((disposableIncome / totalIncome) * 100) : 0;

    // 2. Year-over-Year Growth (Mocked as we don't have historical data yet)
    // In a real app, this would filter income by year
    const currentYearIncome = totalIncome;
    const lastYearIncome = totalIncome * 0.85; // Mock: 15% growth
    const yoyGrowth = ((currentYearIncome - lastYearIncome) / lastYearIncome) * 100;

    // 3. Month-over-Month Growth (Mocked)
    const currentMonthIncome = totalIncome;
    const lastMonthIncome = totalIncome * 0.92; // Mock: 8% growth
    const momGrowth = ((currentMonthIncome - lastMonthIncome) / lastMonthIncome) * 100;

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Health Score Card */}
            <View style={styles.healthCard}>
                <LinearGradient
                    colors={['#10B98120', '#00000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientOverlay}
                />
                <View style={styles.healthHeader}>
                    <Activity size={24} color="#10B981" />
                    <Text style={styles.cardTitle}>Financial Health</Text>
                </View>

                <View style={styles.healthMetrics}>
                    <View>
                        <Text style={styles.metricLabel}>Savings Rate</Text>
                        <Text style={styles.metricValue}>{savingsRate.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.healthStatus}>
                        <Text style={styles.healthText}>
                            {savingsRate > 20 ? 'Excellent' : savingsRate > 10 ? 'Good' : 'Needs Work'}
                        </Text>
                    </View>
                </View>

                {/* Progress Bar for Savings Rate */}
                <View style={styles.progressBarBg}>
                    <View style={[styles.progressBarFill, { width: `${Math.min(savingsRate, 100)}%` }]} />
                </View>
            </View>

            {/* Disposable Income (In My Pocket) */}
            <View style={styles.pocketCard}>
                <View style={styles.pocketHeader}>
                    <Wallet size={20} color="#8B5CF6" />
                    <Text style={styles.pocketTitle}>In My Pocket</Text>
                </View>
                <Text style={styles.pocketAmount}>{formatAmount(disposableIncome, 0)}</Text>
                <Text style={styles.pocketSubtitle}>Disposable income after expenses</Text>

                <View style={styles.comparisonRow}>
                    <View style={styles.comparisonItem}>
                        <Text style={styles.compLabel}>Income</Text>
                        <Text style={[styles.compValue, { color: '#10B981' }]}>{formatAmount(totalIncome, 0)}</Text>
                    </View>
                    <ArrowRight size={16} color="#71717A" />
                    <View style={styles.comparisonItem}>
                        <Text style={styles.compLabel}>Expenses</Text>
                        <Text style={[styles.compValue, { color: '#EF4444' }]}>{formatAmount(totalExpenses, 0)}</Text>
                    </View>
                </View>
            </View>

            {/* Growth Metrics */}
            <Text style={styles.sectionTitle}>Growth Trends</Text>

            <View style={styles.growthRow}>
                {/* YoY Growth */}
                <View style={styles.growthCard}>
                    <View style={styles.growthIconBg}>
                        <TrendingUp size={20} color="#10B981" />
                    </View>
                    <Text style={styles.growthLabel}>Year over Year</Text>
                    <Text style={styles.growthValue}>+{yoyGrowth.toFixed(1)}%</Text>
                    <Text style={styles.growthSub}>vs {formatAmount(lastYearIncome, 0)}</Text>
                </View>

                {/* MoM Growth */}
                <View style={styles.growthCard}>
                    <View style={[styles.growthIconBg, { backgroundColor: '#3B82F620' }]}>
                        <TrendingUp size={20} color="#3B82F6" />
                    </View>
                    <Text style={styles.growthLabel}>Month over Month</Text>
                    <Text style={styles.growthValue}>+{momGrowth.toFixed(1)}%</Text>
                    <Text style={styles.growthSub}>vs {formatAmount(lastMonthIncome, 0)}</Text>
                </View>
            </View>

            {/* Income Composition Pie Chart Placeholder */}
            {/* In a real app with chart library, we'd render a Pie Chart here */}
            {/* For now using a visual representation with bars */}
            <Text style={styles.sectionTitle}>Expense Ratio</Text>
            <View style={styles.ratioCard}>
                <View style={styles.ratioRow}>
                    <View style={styles.ratioLabelContainer}>
                        <Text style={styles.ratioLabel}>Expenses</Text>
                        <Text style={styles.ratioPercent}>{((totalExpenses / totalIncome) * 100).toFixed(1)}%</Text>
                    </View>
                    <View style={styles.ratioBarBg}>
                        <View
                            style={[
                                styles.ratioBarFill,
                                { width: `${Math.min((totalExpenses / totalIncome) * 100, 100)}%`, backgroundColor: '#EF4444' }
                            ]}
                        />
                    </View>
                </View>
                <View style={styles.ratioRow}>
                    <View style={styles.ratioLabelContainer}>
                        <Text style={styles.ratioLabel}>Savings</Text>
                        <Text style={styles.ratioPercent}>{savingsRate.toFixed(1)}%</Text>
                    </View>
                    <View style={styles.ratioBarBg}>
                        <View
                            style={[
                                styles.ratioBarFill,
                                { width: `${Math.min(savingsRate, 100)}%`, backgroundColor: '#10B981' }
                            ]}
                        />
                    </View>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    healthCard: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#10B98130',
        overflow: 'hidden',
        position: 'relative'
    },
    gradientOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    healthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 16
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    healthMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 12
    },
    metricLabel: {
        fontSize: 13,
        color: '#A1A1AA',
        marginBottom: 4
    },
    metricValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#10B981'
    },
    healthStatus: {
        backgroundColor: '#10B98120',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20
    },
    healthText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10B981'
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#27272A',
        borderRadius: 4,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 4
    },
    pocketCard: {
        backgroundColor: '#27272A',
        borderRadius: 20,
        padding: 20,
        marginBottom: 24
    },
    pocketHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12
    },
    pocketTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#A1A1AA'
    },
    pocketAmount: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4
    },
    pocketSubtitle: {
        fontSize: 12,
        color: '#71717A',
        marginBottom: 16
    },
    comparisonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#18181B',
        padding: 12,
        borderRadius: 12
    },
    comparisonItem: {
        flex: 1
    },
    compLabel: {
        fontSize: 11,
        color: '#71717A',
        marginBottom: 2
    },
    compValue: {
        fontSize: 14,
        fontWeight: '700'
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#71717A',
        marginBottom: 16,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    growthRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 24
    },
    growthCard: {
        flex: 1,
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    growthIconBg: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#10B98120',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12
    },
    growthLabel: {
        fontSize: 12,
        color: '#A1A1AA',
        marginBottom: 4
    },
    growthValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF',
        marginBottom: 4
    },
    growthSub: {
        fontSize: 11,
        color: '#71717A'
    },
    ratioCard: {
        backgroundColor: '#18181B',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    ratioRow: {
        marginBottom: 16
    },
    ratioLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    ratioLabel: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    ratioPercent: {
        fontSize: 13,
        color: '#FFFFFF',
        fontWeight: '700'
    },
    ratioBarBg: {
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden'
    },
    ratioBarFill: {
        height: '100%',
        borderRadius: 3
    }
});
