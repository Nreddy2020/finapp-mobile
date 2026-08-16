/**
 * components/investments/PortfolioOverviewCard.js
 * 
 * Stage C.5.1 Executive Valuation Hero Card.
 * Consumes C.4.1 PortfolioSummary directly with zero UI recalculations.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, ArrowUpRight, Plus, RefreshCw } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import ValuationStatusBadge from './ValuationStatusBadge';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

export default function PortfolioOverviewCard({
    portfolioSummary = null,
    loading = false,
    refreshing = false,
    onAddHolding = () => {},
    onRefresh = () => {}
}) {
    if (loading && !portfolioSummary) {
        return (
            <LuxuryCard style={styles.card}>
                <View style={styles.skeletonContainer}>
                    <View style={[styles.skeleton, styles.skeletonTitle]} />
                    <View style={[styles.skeleton, styles.skeletonAmount]} />
                    <View style={[styles.skeleton, styles.skeletonSub]} />
                </View>
            </LuxuryCard>
        );
    }

    const {
        totalMarketValue = 0,
        totalCurrentCostBasis = 0,
        unrealizedGain = 0,
        unrealizedReturnPercent = 0,
        netEconomicReturn = 0,
        netEconomicReturnPercent = 0,
        valuationBasis = 'EMPTY',
        quoteCoverage = null,
        totalHoldingsCount = 0
    } = portfolioSummary || {};

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const isPositiveUnrealized = unrealizedGain >= 0;
    const isPositiveNet = netEconomicReturn >= 0;
    const isEmpty = totalHoldingsCount === 0 && totalCurrentCostBasis === 0 && totalMarketValue === 0;

    return (
        <LuxuryCard style={styles.card}>
            {/* Header: Label & Valuation Status Pill */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.subtitle}>Current Portfolio Value</Text>
                </View>
                <View style={styles.badgeWrapper}>
                    <ValuationStatusBadge
                        valuationBasis={valuationBasis}
                        quoteCoverage={quoteCoverage}
                    />
                </View>
            </View>

            {/* Total Market Value */}
            <View style={styles.valueRow}>
                <Text
                    style={styles.mainValue}
                    accessible={true}
                    accessibilityRole="text"
                    accessibilityLabel={`Total Portfolio Value: ${formatCurrency(totalMarketValue)}`}
                >
                    {formatCurrency(totalMarketValue)}
                </Text>
                {refreshing && (
                    <RefreshCw size={16} color={COLORS.textTertiary || '#71717A'} style={styles.spinningIcon} />
                )}
            </View>

            {/* Empty State Onboarding CTA */}
            {isEmpty ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No active investments in this portfolio.</Text>
                    <TouchableOpacity
                        style={styles.addBtn}
                        onPress={onAddHolding}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel="Add First Holding"
                    >
                        <Plus size={16} color="#FFFFFF" style={styles.btnIcon} />
                        <Text style={styles.addBtnText}>Add First Holding</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    {/* Performance Indicators Row */}
                    <View style={styles.statsRow}>
                        {/* 1. Unrealized P&L Pill */}
                        <View
                            style={[
                                styles.pill,
                                isPositiveUnrealized ? styles.gainPill : styles.lossPill
                            ]}
                            accessible={true}
                            accessibilityRole="text"
                            accessibilityLabel={`Unrealized Gain: ${isPositiveUnrealized ? '+' : '-'}${formatCurrency(unrealizedGain)}, ${isPositiveUnrealized ? '+' : ''}${unrealizedReturnPercent}%`}
                        >
                            {isPositiveUnrealized ? (
                                <TrendingUp size={14} color="#10B981" style={styles.pillIcon} />
                            ) : (
                                <TrendingDown size={14} color="#EF4444" style={styles.pillIcon} />
                            )}
                            <Text
                                style={[
                                    styles.pillText,
                                    isPositiveUnrealized ? styles.gainText : styles.lossText
                                ]}
                            >
                                {isPositiveUnrealized ? '+' : '-'}{formatCurrency(unrealizedGain)} ({isPositiveUnrealized ? '+' : ''}{unrealizedReturnPercent.toFixed(2)}%)
                            </Text>
                        </View>

                        <Text style={styles.unrealizedLabel}>Unrealized P&L</Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Bottom Metrics Breakdown */}
                    <View style={styles.bottomRow}>
                        {/* Invested Cost Basis */}
                        <View style={styles.metricItem}>
                            <Text style={styles.metricLabel}>Total Invested</Text>
                            <Text style={styles.metricValue}>{formatCurrency(totalCurrentCostBasis)}</Text>
                        </View>

                        {/* Net Lifetime Economic Return */}
                        <View style={[styles.metricItem, styles.metricRight]}>
                            <Text style={styles.metricLabel}>Net Lifetime Return</Text>
                            <Text
                                style={[
                                    styles.metricValue,
                                    isPositiveNet ? styles.gainText : styles.lossText
                                ]}
                                accessible={true}
                                accessibilityRole="text"
                                accessibilityLabel={`Net Lifetime Economic Return: ${isPositiveNet ? '+' : '-'}${formatCurrency(netEconomicReturn)}`}
                            >
                                {isPositiveNet ? '+' : '-'}{formatCurrency(netEconomicReturn)}
                            </Text>
                        </View>
                    </View>
                </>
            )}
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: SPACING.md,
        borderRadius: 20,
        marginBottom: SPACING.md,
        backgroundColor: COLORS.card || '#18181B',
        borderWidth: 1,
        borderColor: COLORS.border || 'rgba(255,255,255,0.08)'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs
    },
    subtitle: {
        fontSize: TYPOGRAPHY.bodySmall || 13,
        color: COLORS.textSecondary || '#A1A1AA',
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.8
    },
    badgeWrapper: {
        alignSelf: 'flex-end'
    },
    valueRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SPACING.xs
    },
    mainValue: {
        fontSize: TYPOGRAPHY.display || 32,
        fontWeight: '800',
        color: COLORS.textPrimary || '#FFFFFF',
        letterSpacing: -0.5
    },
    spinningIcon: {
        marginLeft: SPACING.sm
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SPACING.xs,
        marginBottom: SPACING.sm
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: 8,
        marginRight: SPACING.sm
    },
    gainPill: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)'
    },
    lossPill: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)'
    },
    pillIcon: {
        marginRight: 4
    },
    pillText: {
        fontSize: TYPOGRAPHY.bodySmall || 13,
        fontWeight: '700'
    },
    gainText: {
        color: '#10B981'
    },
    lossText: {
        color: '#EF4444'
    },
    unrealizedLabel: {
        fontSize: TYPOGRAPHY.caption || 11,
        color: COLORS.textTertiary || '#71717A'
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border || 'rgba(255,255,255,0.06)',
        marginVertical: SPACING.sm + 2
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    metricItem: {
        flex: 1
    },
    metricRight: {
        alignItems: 'flex-end'
    },
    metricLabel: {
        fontSize: TYPOGRAPHY.caption || 11,
        color: COLORS.textTertiary || '#71717A',
        marginBottom: 2
    },
    metricValue: {
        fontSize: TYPOGRAPHY.body || 15,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF'
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: SPACING.md
    },
    emptyText: {
        fontSize: TYPOGRAPHY.bodySmall || 13,
        color: COLORS.textSecondary || '#A1A1AA',
        marginBottom: SPACING.md
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary || '#4F46E5',
        paddingHorizontal: SPACING.md + 4,
        paddingVertical: SPACING.sm + 2,
        borderRadius: 14
    },
    btnIcon: {
        marginRight: 6
    },
    addBtnText: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: TYPOGRAPHY.bodySmall || 13
    },
    skeletonContainer: {
        paddingVertical: SPACING.sm
    },
    skeleton: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 8
    },
    skeletonTitle: {
        width: 120,
        height: 14,
        marginBottom: SPACING.sm
    },
    skeletonAmount: {
        width: 200,
        height: 36,
        marginBottom: SPACING.sm
    },
    skeletonSub: {
        width: 160,
        height: 20
    }
});
