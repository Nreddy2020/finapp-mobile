import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { TrendingUp, TrendingDown, Minus, Calendar, Target, AlertCircle } from 'lucide-react-native';

export default function IncomeForecast({ income, currency, formatAmount }) {
    // Calculate historical averages
    const calculateHistoricalData = () => {
        if (income.length === 0) return { avgMonthly: 0, trend: 'stable', growth: 0 };

        const totalIncome = income.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
        const avgMonthly = totalIncome; // Current month total (simplified for now)

        // Simple trend calculation based on income count and amounts
        // In production, this would analyze multiple months of data
        const recentIncome = income.slice(0, 3);
        const olderIncome = income.slice(3, 6);

        const recentAvg = recentIncome.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) / Math.max(recentIncome.length, 1);
        const olderAvg = olderIncome.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) / Math.max(olderIncome.length, 1);

        const growth = olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;

        let trend = 'stable';
        if (growth > 5) trend = 'increasing';
        else if (growth < -5) trend = 'declining';

        return { avgMonthly, trend, growth };
    };

    const { avgMonthly, trend, growth } = calculateHistoricalData();

    // Forecast future income based on trend
    const forecastIncome = (months) => {
        const growthRate = growth / 100;
        const forecasts = [];

        for (let i = 1; i <= months; i++) {
            const forecastAmount = avgMonthly * Math.pow(1 + (growthRate / 12), i);
            forecasts.push({
                month: i,
                amount: forecastAmount,
                confidence: Math.max(100 - (i * 10), 50) // Confidence decreases over time
            });
        }

        return forecasts;
    };

    const forecast3Month = forecastIncome(3);
    const forecast6Month = forecastIncome(6);
    const forecast12Month = forecastIncome(12);

    // Calculate total forecasted income
    const total3Month = forecast3Month.reduce((sum, f) => sum + f.amount, 0);
    const total6Month = forecast6Month.reduce((sum, f) => sum + f.amount, 0);
    const total12Month = forecast12Month.reduce((sum, f) => sum + f.amount, 0);

    // Trend indicator
    const TrendIcon = trend === 'increasing' ? TrendingUp : trend === 'declining' ? TrendingDown : Minus;
    const trendColor = trend === 'increasing' ? '#10B981' : trend === 'declining' ? '#EF4444' : '#71717A';
    const trendLabel = trend === 'increasing' ? 'Growing' : trend === 'declining' ? 'Declining' : 'Stable';

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Current Trend Card */}
            <View style={styles.trendCard}>
                <LinearGradient
                    colors={[`${trendColor}20`, '#00000000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.trendGradient}
                />
                <View style={styles.trendHeader}>
                    <View style={[styles.trendIconContainer, { backgroundColor: `${trendColor}20` }]}>
                        <TrendIcon size={24} color={trendColor} strokeWidth={2.5} />
                    </View>
                    <View style={styles.trendInfo}>
                        <Text style={styles.trendLabel}>Income Trend</Text>
                        <Text style={[styles.trendValue, { color: trendColor }]}>{trendLabel}</Text>
                    </View>
                </View>
                <View style={styles.growthRow}>
                    <Text style={styles.growthLabel}>Growth Rate</Text>
                    <Text style={[styles.growthValue, { color: trendColor }]}>
                        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                    </Text>
                </View>
            </View>

            {/* Forecast Periods */}
            <Text style={styles.sectionTitle}>Income Projections</Text>

            {/* 3-Month Forecast */}
            <View style={styles.forecastCard}>
                <View style={styles.forecastHeader}>
                    <View style={styles.forecastIconContainer}>
                        <Calendar size={20} color="#8B5CF6" />
                    </View>
                    <View style={styles.forecastInfo}>
                        <Text style={styles.forecastPeriod}>Next 3 Months</Text>
                        <Text style={styles.forecastAmount}>{formatAmount(total3Month, 0)}</Text>
                    </View>
                    <View style={styles.confidenceBadge}>
                        <Text style={styles.confidenceText}>
                            {forecast3Month[2]?.confidence || 70}% confidence
                        </Text>
                    </View>
                </View>
                <View style={styles.monthlyBreakdown}>
                    {forecast3Month.map((f, idx) => (
                        <View key={idx} style={styles.monthRow}>
                            <Text style={styles.monthLabel}>Month {f.month}</Text>
                            <View style={styles.monthBar}>
                                <View
                                    style={[
                                        styles.monthBarFill,
                                        {
                                            width: `${(f.amount / Math.max(...forecast3Month.map(x => x.amount))) * 100}%`,
                                            backgroundColor: '#8B5CF6'
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.monthAmount}>{formatAmount(f.amount, 0)}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* 6-Month Forecast */}
            <View style={styles.forecastCard}>
                <View style={styles.forecastHeader}>
                    <View style={[styles.forecastIconContainer, { backgroundColor: '#3B82F620' }]}>
                        <Target size={20} color="#3B82F6" />
                    </View>
                    <View style={styles.forecastInfo}>
                        <Text style={styles.forecastPeriod}>Next 6 Months</Text>
                        <Text style={styles.forecastAmount}>{formatAmount(total6Month, 0)}</Text>
                    </View>
                    <View style={[styles.confidenceBadge, { backgroundColor: '#3B82F620' }]}>
                        <Text style={[styles.confidenceText, { color: '#3B82F6' }]}>
                            {forecast6Month[5]?.confidence || 50}% confidence
                        </Text>
                    </View>
                </View>
            </View>

            {/* 12-Month Forecast */}
            <View style={styles.forecastCard}>
                <View style={styles.forecastHeader}>
                    <View style={[styles.forecastIconContainer, { backgroundColor: '#F59E0B20' }]}>
                        <Calendar size={20} color="#F59E0B" />
                    </View>
                    <View style={styles.forecastInfo}>
                        <Text style={styles.forecastPeriod}>Next 12 Months (Annual)</Text>
                        <Text style={styles.forecastAmount}>{formatAmount(total12Month, 0)}</Text>
                    </View>
                    <View style={[styles.confidenceBadge, { backgroundColor: '#F59E0B20' }]}>
                        <Text style={[styles.confidenceText, { color: '#F59E0B' }]}>
                            {forecast12Month[11]?.confidence || 50}% confidence
                        </Text>
                    </View>
                </View>
            </View>

            {/* Disclaimer */}
            <View style={styles.disclaimerCard}>
                <AlertCircle size={16} color="#71717A" />
                <Text style={styles.disclaimerText}>
                    Forecasts are based on historical patterns and current trends. Actual income may vary.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    },
    trendCard: {
        backgroundColor: '#18181B',
        borderRadius: 24,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFFFFF08',
        overflow: 'hidden',
        position: 'relative'
    },
    trendGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
    },
    trendHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    trendIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    trendInfo: {
        flex: 1
    },
    trendLabel: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    trendValue: {
        fontSize: 24,
        fontWeight: '900',
        marginTop: 4
    },
    growthRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF10'
    },
    growthLabel: {
        fontSize: 14,
        color: '#A1A1AA',
        fontWeight: '600'
    },
    growthValue: {
        fontSize: 20,
        fontWeight: '800'
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#71717A',
        marginBottom: 16,
        letterSpacing: 2,
        textTransform: 'uppercase'
    },
    forecastCard: {
        backgroundColor: '#18181B',
        borderRadius: 20,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    forecastHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    forecastIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        backgroundColor: '#8B5CF620',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    forecastInfo: {
        flex: 1
    },
    forecastPeriod: {
        fontSize: 13,
        color: '#A1A1AA',
        fontWeight: '600',
        marginBottom: 4
    },
    forecastAmount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#FFFFFF'
    },
    confidenceBadge: {
        backgroundColor: '#8B5CF620',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    confidenceText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8B5CF6'
    },
    monthlyBreakdown: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF10'
    },
    monthRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    monthLabel: {
        fontSize: 12,
        color: '#A1A1AA',
        fontWeight: '600',
        width: 60
    },
    monthBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#27272A',
        borderRadius: 4,
        marginHorizontal: 12,
        overflow: 'hidden'
    },
    monthBarFill: {
        height: '100%',
        borderRadius: 4
    },
    monthAmount: {
        fontSize: 12,
        color: '#FFFFFF',
        fontWeight: '700',
        width: 80,
        textAlign: 'right'
    },
    disclaimerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27272A',
        padding: 12,
        borderRadius: 12,
        marginTop: 12,
        gap: 8
    },
    disclaimerText: {
        flex: 1,
        fontSize: 11,
        color: '#71717A',
        fontWeight: '500',
        lineHeight: 16
    }
});
