import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AlertTriangle, TrendingUp, TrendingDown, ArrowDownLeft, ArrowUpRight, ShieldCheck, ShieldAlert } from 'lucide-react-native';

export default function ForecastOverviewCard({
    showHorizons = true,
    summary,
    selectedHorizon,
    onSelectHorizon,
    divergenceWarning
}) {
    if (!summary) return null;

    const {
        horizonDays = 30,
        currency = 'INR',
        projectedInflow = null,
        projectedOutflow = null,
        netProjectedLiquidityDelta = null,
        confidenceScore = { score: 100, rating: 'HIGH', missingFactors: [] }
    } = summary;

    const formatAmount = (val, curr) => {
        if (typeof val !== 'number' || isNaN(val)) return '—';
        const sym = curr === 'INR' ? '₹' : (curr === 'USD' ? '$' : (curr ? `${curr} ` : ''));
        const formatted = Math.abs(val).toLocaleString();
        return `${val < 0 ? '-' : ''}${sym}${formatted}`;
    };

    const horizons = [
        { key: 7, label: '7D' },
        { key: 30, label: '30D' },
        { key: 90, label: '90D' },
        { key: 365, label: '365D' }
    ];

    const isPositiveDelta = (netProjectedLiquidityDelta || 0) >= 0;

    const getConfidenceBadgeColor = (rating) => {
        switch (rating) {
            case 'HIGH': return { bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: '#10B981' };
            case 'MEDIUM': return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: '#F59E0B' };
            default: return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: '#EF4444' };
        }
    };

    const confColors = getConfidenceBadgeColor(confidenceScore.rating);

    return (
        <View style={styles.card}>
            {/* Header with Title and Horizon Switcher */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.badgeText}>CASH FLOW ESTIMATE</Text>
                    <Text style={styles.title}>Projected cash flow</Text>
                    <Text style={styles.subtitle}>Expected income minus planned expenses</Text>
                </View>

                {/* Horizon Switcher */}
                {showHorizons && <View style={styles.horizonContainer}>
                    {horizons.map(h => {
                        const isSelected = selectedHorizon === h.key;
                        return (
                            <TouchableOpacity
                                key={h.key}
                                style={[styles.horizonBtn, isSelected && styles.horizonBtnActive]}
                                onPress={() => onSelectHorizon(h.key)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.horizonBtnText, isSelected && styles.horizonBtnTextActive]}>
                                    {h.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>}
            </View>

            {/* Currency Divergence Warning or Net Liquidity Card */}
            {divergenceWarning ? (
                <View style={styles.warningContainer}>
                    <View style={styles.warningHeader}>
                        <AlertTriangle size={16} color="#F59E0B" />
                        <Text style={styles.warningTitle}>Currency Divergence</Text>
                    </View>
                    <Text style={styles.warningText}>{divergenceWarning}</Text>
                    <Text style={styles.warningSubText}>
                        Itemized obligations and incomes retain their native currencies. Totals are shown separately by currency.
                    </Text>
                </View>
            ) : null}

            {/* Main Net Liquidity Delta Hero */}
            <View style={[styles.heroBox, !divergenceWarning && (isPositiveDelta ? styles.heroPositive : styles.heroNegative)]}>
                <View style={styles.heroTopRow}>
                    <Text style={styles.heroLabel}>ESTIMATED CASH CHANGE ({horizonDays} DAYS)</Text>
                    <View style={[styles.confidenceBadge, { backgroundColor: confColors.bg, borderColor: confColors.border }]}>
                        {confidenceScore.rating === 'HIGH' ? (
                            <ShieldCheck size={12} color={confColors.text} style={{ marginRight: 4 }} />
                        ) : (
                            <ShieldAlert size={12} color={confColors.text} style={{ marginRight: 4 }} />
                        )}
                        <Text style={[styles.confidenceText, { color: confColors.text }]}>
                            {confidenceScore.score}% • {confidenceScore.rating}
                        </Text>
                    </View>
                </View>

                <View style={styles.heroAmountRow}>
                    {divergenceWarning ? (
                        <Text style={styles.heroAmountDivergent}>—</Text>
                    ) : (
                        <>
                            {isPositiveDelta ? (
                                <TrendingUp size={28} color="#10B981" style={{ marginRight: 8 }} />
                            ) : (
                                <TrendingDown size={28} color="#EF4444" style={{ marginRight: 8 }} />
                            )}
                            <Text style={[styles.heroAmount, { color: isPositiveDelta ? '#10B981' : '#EF4444' }]}>
                                {formatAmount(netProjectedLiquidityDelta, currency)}
                            </Text>
                        </>
                    )}
                </View>
                <Text style={styles.heroNote}>
                    {divergenceWarning 
                        ? 'Aggregates unavailable across mixed currencies' 
                        : (netProjectedLiquidityDelta === 0 ? 'No projected cash change in saved records' : isPositiveDelta ? 'Projected cash surplus over forecast window' : 'Projected cash deficit over forecast window')}
                </Text>
            </View>

            {/* Inflows and Outflows Breakdown Grid */}
            <View style={styles.grid}>
                <View style={styles.metricBox}>
                    <View style={styles.metricHeader}>
                        <ArrowDownLeft size={16} color="#10B981" />
                        <Text style={styles.metricLabel}>Projected Inflows</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: '#10B981' }]}>
                        {divergenceWarning ? '—' : formatAmount(projectedInflow, currency)}
                    </Text>
                    <Text style={styles.metricSub}>Member scheduled incomes</Text>
                </View>

                <View style={styles.metricBox}>
                    <View style={styles.metricHeader}>
                        <ArrowUpRight size={16} color="#EF4444" />
                        <Text style={styles.metricLabel}>Projected Outflows</Text>
                    </View>
                    <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                        {divergenceWarning ? '—' : formatAmount(projectedOutflow, currency)}
                    </Text>
                    <Text style={styles.metricSub}>Commitments, pools & renewals</Text>
                </View>
            </View>

            {/* Missing Factors Diagnostics if Confidence < 100 */}
            {confidenceScore.missingFactors && confidenceScore.missingFactors.length > 0 && (
                <View style={styles.missingFactorsContainer}>
                    <Text style={styles.missingFactorsTitle}>MISSING INFORMATION</Text>
                    <View style={styles.factorsRow}>
                        {confidenceScore.missingFactors.map((factor, idx) => (
                            <View key={idx} style={styles.factorTag}>
                                <Text style={styles.factorTagText}>{factor.replace(/_/g, ' ')}</Text>
                            </View>
                        ))}
                    </View>
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
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    headerRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6366F1',
        letterSpacing: 1,
        marginBottom: 2
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    subtitle: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2
    },
    horizonContainer: {
        flexDirection: 'row',
        backgroundColor: '#252532',
        borderRadius: 8,
        padding: 2
    },
    horizonBtn: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6
    },
    horizonBtnActive: {
        backgroundColor: '#6366F1'
    },
    horizonBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF'
    },
    horizonBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    warningContainer: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14
    },
    warningHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    warningTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F59E0B',
        marginLeft: 6
    },
    warningText: {
        fontSize: 12,
        color: '#FCD34D',
        lineHeight: 16,
        fontWeight: '600'
    },
    warningSubText: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 4,
        lineHeight: 15
    },
    heroBox: {
        backgroundColor: '#232330',
        borderRadius: 12,
        padding: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    heroPositive: {
        borderColor: 'rgba(16, 185, 129, 0.3)',
        backgroundColor: 'rgba(16, 185, 129, 0.05)'
    },
    heroNegative: {
        borderColor: 'rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.05)'
    },
    heroTopRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5
    },
    confidenceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
        borderWidth: 1
    },
    confidenceText: {
        fontSize: 10,
        fontWeight: '700'
    },
    heroAmountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    heroAmount: {
        fontSize: 28,
        fontWeight: '800'
    },
    heroAmountDivergent: {
        fontSize: 28,
        fontWeight: '800',
        color: '#9CA3AF'
    },
    heroNote: {
        fontSize: 12,
        color: '#9CA3AF'
    },
    grid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8
    },
    metricBox: {
        flex: 1,
        backgroundColor: '#252532',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#374151'
    },
    metricHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6
    },
    metricLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#9CA3AF',
        marginLeft: 4
    },
    metricValue: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 2
    },
    metricSub: {
        fontSize: 10,
        color: '#6B7280'
    },
    missingFactorsContainer: {
        marginTop: 6,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#1F2937'
    },
    missingFactorsTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: '#F59E0B',
        letterSpacing: 0.8,
        marginBottom: 6
    },
    factorsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    factorTag: {
        backgroundColor: 'rgba(245, 158, 11, 0.12)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)'
    },
    factorTagText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#FBBF24'
    }
});
