import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, AlertTriangle, CheckCircle2, DollarSign, PieChart } from 'lucide-react-native';

export default function BudgetOverviewCard({ summary }) {
    if (!summary) return null;

    const {
        evaluationPeriod = '',
        timezone = 'UTC',
        currency = null,
        totalCeiling = null,
        totalSpent = null,
        totalRemainingBuffer = null,
        overallUtilizationPercent = null,
        overallStatus = 'ON_TRACK',
        overallNumericalStatus = 'ON_TRACK',
        reviewRequired = false,
        currencyDivergenceWarning = null,
        activePoolsCount = 0
    } = summary;

    const formatAmount = (val, curr) => {
        if (typeof val !== 'number' || isNaN(val)) return '—';
        const sym = curr === 'INR' ? '₹' : (curr === 'USD' ? '$' : (curr ? `${curr} ` : ''));
        return `${sym}${Math.abs(val).toLocaleString()}`;
    };

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.badgeText}>60-SECOND COLLECTIVE GOVERNANCE</Text>
                    <Text style={styles.title}>Family Budget Pools</Text>
                    <Text style={styles.subtitle}>Period: {evaluationPeriod} • {timezone}</Text>
                </View>
                <View style={styles.poolCountBadge}>
                    <Text style={styles.poolCountText}>{activePoolsCount}</Text>
                    <Text style={styles.poolCountLabel}>POOLS</Text>
                </View>
            </View>

            {/* Currency Divergence Warning or Aggregates */}
            {currencyDivergenceWarning ? (
                <View style={styles.warningContainer}>
                    <View style={styles.warningHeader}>
                        <AlertTriangle size={16} color="#F59E0B" />
                        <Text style={styles.warningTitle}>Currency Divergence</Text>
                    </View>
                    <Text style={styles.warningText}>{currencyDivergenceWarning}</Text>
                </View>
            ) : (
                <>
                    {/* Financial Metrics Grid */}
                    <View style={styles.grid}>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Total Ceiling</Text>
                            <Text style={styles.metricValue}>{formatAmount(totalCeiling, currency)}</Text>
                            <Text style={styles.metricSub}>Monthly target</Text>
                        </View>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Total Spent</Text>
                            <Text style={[styles.metricValue, { color: totalSpent > totalCeiling ? '#EF4444' : '#F3F4F6' }]}>
                                {formatAmount(totalSpent, currency)}
                            </Text>
                            <Text style={styles.metricSub}>All active pools</Text>
                        </View>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Buffer</Text>
                            <Text style={[styles.metricValue, { color: (totalRemainingBuffer ?? 0) < 0 ? '#EF4444' : '#10B981' }]}>
                                {(totalRemainingBuffer ?? 0) < 0 ? '-' : ''}{formatAmount(totalRemainingBuffer, currency)}
                            </Text>
                            <Text style={styles.metricSub}>{(totalRemainingBuffer ?? 0) < 0 ? 'Deficit' : 'Remaining'}</Text>
                        </View>
                    </View>

                    {/* Progress & Utilization Bar */}
                    {totalCeiling !== null && totalCeiling > 0 && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressRow}>
                                <Text style={styles.progressLabel}>Utilization: {overallUtilizationPercent}%</Text>
                                <Text style={[styles.progressStatus, {
                                    color: overallNumericalStatus === 'OVER_BUDGET' ? '#EF4444' :
                                           overallNumericalStatus === 'APPROACHING_LIMIT' ? '#F59E0B' : '#10B981'
                                }]}>
                                    {overallNumericalStatus === 'OVER_BUDGET' ? 'OVER BUDGET' :
                                     overallNumericalStatus === 'APPROACHING_LIMIT' ? 'APPROACHING LIMIT' : 'ON TRACK'}
                                </Text>
                            </View>
                            <View style={styles.progressBarTrack}>
                                <View style={[styles.progressBarFill, {
                                    width: `${Math.min(100, Math.max(0, overallUtilizationPercent || 0))}%`,
                                    backgroundColor: overallNumericalStatus === 'OVER_BUDGET' ? '#EF4444' :
                                                     overallNumericalStatus === 'APPROACHING_LIMIT' ? '#F59E0B' : '#10B981'
                                }]} />
                            </View>
                        </View>
                    )}
                </>
            )}

            {/* Review Required Alert */}
            {reviewRequired && !currencyDivergenceWarning && (
                <View style={styles.reviewBanner}>
                    <AlertCircle size={14} color="#F59E0B" />
                    <Text style={styles.reviewBannerText}>
                        Data Review Required: One or more pools have orphaned members or ratio mismatches. Spend totals remain accurate.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#171721',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    badgeText: {
        color: '#60A5FA',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 2
    },
    title: {
        color: '#F9FAFB',
        fontSize: 18,
        fontWeight: '700'
    },
    subtitle: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    poolCountBadge: {
        backgroundColor: '#252532',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#374151'
    },
    poolCountText: {
        color: '#F3F4F6',
        fontSize: 16,
        fontWeight: '800'
    },
    poolCountLabel: {
        color: '#9CA3AF',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    grid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    metricBox: {
        flex: 1,
        backgroundColor: '#252532',
        borderRadius: 10,
        padding: 10,
        marginHorizontal: 3,
        borderWidth: 1,
        borderColor: '#374151'
    },
    metricLabel: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4
    },
    metricValue: {
        color: '#F3F4F6',
        fontSize: 15,
        fontWeight: '800'
    },
    metricSub: {
        color: '#6B7280',
        fontSize: 9,
        marginTop: 2
    },
    progressContainer: {
        backgroundColor: '#252532',
        borderRadius: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#374151'
    },
    progressRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6
    },
    progressLabel: {
        color: '#D1D5DB',
        fontSize: 12,
        fontWeight: '600'
    },
    progressStatus: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    progressBarTrack: {
        height: 6,
        backgroundColor: '#374151',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    warningContainer: {
        backgroundColor: '#78350F25',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F59E0B50'
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    warningTitle: {
        color: '#F59E0B',
        fontSize: 13,
        fontWeight: '700'
    },
    warningText: {
        color: '#FDE68A',
        fontSize: 12,
        lineHeight: 18
    },
    reviewBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#78350F25',
        borderRadius: 8,
        padding: 8,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#F59E0B40'
    },
    reviewBannerText: {
        color: '#FDE68A',
        fontSize: 11,
        flex: 1,
        lineHeight: 15
    }
});
