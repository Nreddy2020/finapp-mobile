/**
 * components/investments/PerformanceGrowthTimelineCard.js
 * 
 * Stage C.5.3 Performance & XIRR Growth Timeline Visualizer Card.
 * Consumes Stage C.4.3 getPerformanceMetrics strictly read-only.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { TrendingUp, TrendingDown, Clock, Calendar, AlertTriangle, CheckCircle2, ChevronRight, Activity } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

export default function PerformanceGrowthTimelineCard({
    performanceMetrics = null,
    timeline = [],
    loading = false
}) {
    const [selectedPointIndex, setSelectedPointIndex] = useState(null);

    if (loading && !performanceMetrics) {
        return (
            <LuxuryCard style={styles.card}>
                <View style={styles.skeletonContainer}>
                    <View style={[styles.skeleton, styles.skeletonTitle]} />
                    <View style={[styles.skeleton, styles.skeletonHero]} />
                    <View style={[styles.skeleton, styles.skeletonTimeline]} />
                </View>
            </LuxuryCard>
        );
    }

    const {
        xirrPercent = 0,
        xirrStatus = 'INSUFFICIENT_CASH_FLOWS',
        cagrPercent = 0,
        absoluteReturnPercent = 0,
        performanceType = 'ABSOLUTE',
        holdingPeriodDays = 0,
        holdingPeriodYears = 0,
        cashFlowSummary = {},
        performanceIntegrity = 'VALID',
        integrityWarnings = [],
        valuationBasis = 'EMPTY',
        quoteCoverage = null
    } = performanceMetrics || {};

    const isInsufficient = xirrStatus === 'INSUFFICIENT_CASH_FLOWS' || (!cashFlowSummary?.historicalOutflows && !cashFlowSummary?.terminalMarketValue);

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatPercent = (val) => {
        const num = Number(val) || 0;
        const sign = num > 0 ? '+' : '';
        return `${sign}${num.toFixed(2)}%`;
    };

    // Hero metric selection based on performanceType
    const heroReturn = performanceType === 'CAGR' ? xirrPercent : absoluteReturnPercent;
    const isPositive = heroReturn > 0;
    const isNegative = heroReturn < 0;
    const returnColor = isPositive ? (COLORS.success || '#10B981') : isNegative ? (COLORS.error || '#EF4444') : (COLORS.textMuted || '#94A3B8');

    // Selected timeline milestone or latest
    const activePoint = (selectedPointIndex !== null && timeline[selectedPointIndex]) ? timeline[selectedPointIndex] : null;

    // Cash flow reconciliation components
    const deployed = cashFlowSummary?.historicalOutflows || 0;
    const inflows = cashFlowSummary?.historicalInflows || 0;
    const terminalVal = cashFlowSummary?.terminalMarketValue || 0;
    const reconciledDelta = (terminalVal + inflows) - deployed;
    const isReconciledPositive = reconciledDelta >= 0;

    return (
        <LuxuryCard style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <Activity size={18} color={COLORS.primary || '#D4AF37'} style={styles.headerIcon} />
                    <Text style={styles.title}>Performance & Growth</Text>
                </View>
                {!isInsufficient && (
                    <View style={[styles.typeBadge, performanceType === 'CAGR' ? styles.cagrBadge : styles.absBadge]}>
                        <Clock size={11} color={performanceType === 'CAGR' ? '#10B981' : '#3B82F6'} style={{ marginRight: 4 }} />
                        <Text style={[styles.typeBadgeText, performanceType === 'CAGR' ? styles.cagrBadgeText : styles.absBadgeText]}>
                            {performanceType === 'CAGR' ? 'CAGR (Annualized)' : 'Absolute (<1 Year)'}
                        </Text>
                    </View>
                )}
            </View>

            {isInsufficient ? (
                /* Empty / Insufficient Flows State */
                <View style={styles.emptyContainer}>
                    <Clock size={32} color={COLORS.textMuted || '#64748B'} style={{ marginBottom: SPACING.xs }} />
                    <Text style={styles.emptyTitle}>Insufficient Performance History</Text>
                    <Text style={styles.emptySubtitle}>
                        Record investment transactions or buy holdings to initiate money-weighted return (XIRR) and growth timeline tracking.
                    </Text>
                </View>
            ) : (
                /* Active Performance Content */
                <View>
                    {/* Hero Return & Horizon Banner */}
                    <View style={styles.heroContainer}>
                        <View style={styles.heroMain}>
                            <Text style={styles.heroLabel}>
                                {performanceType === 'CAGR' ? 'Money-Weighted Return (XIRR)' : 'Holding Period Return'}
                            </Text>
                            <View style={styles.heroValueRow}>
                                {isPositive ? (
                                    <TrendingUp size={24} color={returnColor} style={{ marginRight: 6 }} />
                                ) : isNegative ? (
                                    <TrendingDown size={24} color={returnColor} style={{ marginRight: 6 }} />
                                ) : null}
                                <Text
                                    style={[styles.heroValue, { color: returnColor }]}
                                    accessibilityLabel={`Overall return: ${formatPercent(heroReturn)}`}
                                >
                                    {formatPercent(heroReturn)}
                                </Text>
                            </View>
                        </View>
                        <View style={styles.horizonContainer}>
                            <Text style={styles.horizonLabel}>Horizon</Text>
                            <Text style={styles.horizonValue}>
                                {holdingPeriodYears >= 1 ? `${holdingPeriodYears.toFixed(1)} Yrs` : `${holdingPeriodDays} Days`}
                            </Text>
                        </View>
                    </View>

                    {/* Timeline Milestones Visualizer */}
                    {timeline && timeline.length > 1 && (
                        <View style={styles.timelineSection}>
                            <View style={styles.timelineHeaderRow}>
                                <Text style={styles.sectionSubtitle}>Growth Timeline Milestones</Text>
                                {activePoint && (
                                    <TouchableOpacity onPress={() => setSelectedPointIndex(null)}>
                                        <Text style={styles.resetTimelineText}>Show Latest</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.timelineScroll}>
                                {timeline.map((pt, idx) => {
                                    const isSelected = selectedPointIndex === idx || (selectedPointIndex === null && idx === timeline.length - 1);
                                    const ptGain = (pt.terminalMarketValue || 0) - (pt.historicalOutflows || 0);
                                    const ptIsPositive = ptGain >= 0;

                                    return (
                                        <TouchableOpacity
                                            key={`pt_${pt.timestamp}_${idx}`}
                                            style={[styles.timelineNode, isSelected && styles.timelineNodeSelected]}
                                            onPress={() => setSelectedPointIndex(idx)}
                                            accessibilityLabel={`Milestone ${pt.date}: Valuation ${formatCurrency(pt.terminalMarketValue)}, Return ${formatPercent(pt.xirrPercent)}`}
                                        >
                                            <View style={[styles.nodeDot, isSelected && styles.nodeDotSelected, { backgroundColor: ptIsPositive ? '#10B981' : '#EF4444' }]} />
                                            <Text style={[styles.nodeDate, isSelected && styles.nodeDateSelected]}>
                                                {pt.date ? pt.date.slice(5) : `T${idx}`}
                                            </Text>
                                            <Text style={styles.nodeVal}>{formatCurrency(pt.terminalMarketValue)}</Text>
                                            <Text style={[styles.nodeReturn, { color: pt.xirrPercent >= 0 ? '#10B981' : '#EF4444' }]}>
                                                {formatPercent(pt.xirrPercent)}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Cash Flow Reconciliation Matrix */}
                    <View style={styles.reconciliationCard}>
                        <Text style={styles.reconciliationTitle}>Cash Flow Reconciliation</Text>
                        <View style={styles.gridRow}>
                            <View style={styles.gridCol}>
                                <Text style={styles.gridLabel}>Capital Deployed</Text>
                                <Text style={styles.gridValue}>{formatCurrency(deployed)}</Text>
                            </View>
                            <View style={styles.gridCol}>
                                <Text style={styles.gridLabel}>Realized Inflows</Text>
                                <Text style={styles.gridValue}>{formatCurrency(inflows)}</Text>
                            </View>
                        </View>
                        <View style={[styles.gridRow, { marginTop: SPACING.xs }]}>
                            <View style={styles.gridCol}>
                                <Text style={styles.gridLabel}>Current Valuation</Text>
                                <Text style={styles.gridValue}>{formatCurrency(terminalVal)}</Text>
                            </View>
                            <View style={styles.gridCol}>
                                <Text style={styles.gridLabel}>Net Reconciled Delta</Text>
                                <Text style={[styles.gridValue, { color: isReconciledPositive ? '#10B981' : '#EF4444' }]}>
                                    {isReconciledPositive ? '+' : '-'}{formatCurrency(reconciledDelta)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Fallback / Warning Notice */}
                    {performanceIntegrity === 'INCOMPLETE' && (
                        <View style={styles.warningBanner}>
                            <AlertTriangle size={14} color="#F59E0B" style={{ marginRight: 6 }} />
                            <Text style={styles.warningText}>
                                Ledger Incomplete: Missing buy history for some sell events. Returns are estimated.
                            </Text>
                        </View>
                    )}

                    {valuationBasis === 'PARTIAL_FALLBACK' && quoteCoverage && (
                        <Text style={styles.fallbackNote}>
                            * Partial quote fallback active ({quoteCoverage.marketValued}/{quoteCoverage.totalHoldings} live quotes)
                        </Text>
                    )}
                    {valuationBasis === 'COST_BASIS_FALLBACK' && (
                        <Text style={styles.fallbackNote}>
                            * Valued on cost basis (market quotes unavailable)
                        </Text>
                    )}
                </View>
            )}
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: SPACING.md,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        borderRadius: 16,
        backgroundColor: COLORS.surface || '#1E293B'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    headerIcon: {
        marginRight: 8
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF',
        letterSpacing: 0.2
    },
    typeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12
    },
    cagrBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderWidth: 1
    },
    absBadge: {
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        borderColor: 'rgba(59, 130, 246, 0.3)',
        borderWidth: 1
    },
    typeBadgeText: {
        fontSize: 11,
        fontWeight: '600'
    },
    cagrBadgeText: {
        color: '#10B981'
    },
    absBadgeText: {
        color: '#3B82F6'
    },
    heroContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: SPACING.sm
    },
    heroMain: {
        flex: 1
    },
    heroLabel: {
        fontSize: 12,
        color: COLORS.textMuted || '#94A3B8',
        marginBottom: 2
    },
    heroValueRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    heroValue: {
        fontSize: 26,
        fontWeight: '800',
        letterSpacing: -0.5
    },
    horizonContainer: {
        alignItems: 'flex-end',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8
    },
    horizonLabel: {
        fontSize: 10,
        color: COLORS.textMuted || '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    horizonValue: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF',
        marginTop: 2
    },
    timelineSection: {
        marginBottom: SPACING.sm
    },
    timelineHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    sectionSubtitle: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textMuted || '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    resetTimelineText: {
        fontSize: 11,
        color: COLORS.primary || '#D4AF37',
        fontWeight: '600'
    },
    timelineScroll: {
        paddingVertical: 4,
        gap: 8
    },
    timelineNode: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        minWidth: 85,
        alignItems: 'center'
    },
    timelineNodeSelected: {
        borderColor: COLORS.primary || '#D4AF37',
        backgroundColor: 'rgba(212, 175, 55, 0.08)'
    },
    nodeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginBottom: 4
    },
    nodeDotSelected: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    nodeDate: {
        fontSize: 11,
        color: COLORS.textMuted || '#94A3B8',
        fontWeight: '500'
    },
    nodeDateSelected: {
        color: COLORS.textPrimary || '#FFFFFF',
        fontWeight: '700'
    },
    nodeVal: {
        fontSize: 11,
        color: COLORS.textPrimary || '#FFFFFF',
        fontWeight: '600',
        marginTop: 2
    },
    nodeReturn: {
        fontSize: 10,
        fontWeight: '700',
        marginTop: 2
    },
    reconciliationCard: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        borderRadius: 12,
        padding: 10,
        marginTop: 4
    },
    reconciliationTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textMuted || '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 8
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    gridCol: {
        flex: 1
    },
    gridLabel: {
        fontSize: 11,
        color: COLORS.textMuted || '#94A3B8'
    },
    gridValue: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF',
        marginTop: 1
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.25)',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginTop: SPACING.xs
    },
    warningText: {
        fontSize: 11,
        color: '#F59E0B',
        flex: 1
    },
    fallbackNote: {
        fontSize: 10,
        color: COLORS.textMuted || '#94A3B8',
        marginTop: 6,
        fontStyle: 'italic'
    },
    emptyContainer: {
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF',
        marginBottom: 4
    },
    emptySubtitle: {
        fontSize: 12,
        color: COLORS.textMuted || '#94A3B8',
        textAlign: 'center',
        lineHeight: 18,
        paddingHorizontal: SPACING.md
    },
    skeletonContainer: {
        padding: SPACING.sm
    },
    skeleton: {
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        borderRadius: 8,
        marginBottom: 8
    },
    skeletonTitle: {
        width: 140,
        height: 16
    },
    skeletonHero: {
        width: '100%',
        height: 50
    },
    skeletonTimeline: {
        width: '100%',
        height: 60
    }
});
