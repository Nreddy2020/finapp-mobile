/**
 * components/investments/AssetAllocationCard.js
 * 
 * Stage C.5.2 Asset Allocation Breakdown & Visualizer Card.
 * Consumes C.4.2 getAssetAllocationSummary strictly read-only.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart, Layers } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import ConcentrationRiskGauge from './ConcentrationRiskGauge';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

const ASSET_TYPE_COLORS = {
    STOCK: '#3B82F6',
    MUTUAL_FUND: '#10B981',
    MF: '#10B981',
    CRYPTO: '#F59E0B',
    GOLD: '#EAB308',
    COMMODITY: '#EAB308',
    BOND: '#8B5CF6',
    DEBT: '#8B5CF6',
    REAL_ESTATE: '#EC4899',
    OTHER: '#64748B'
};

export default function AssetAllocationCard({
    allocationSummary = null,
    loading = false
}) {
    const [viewMode, setViewMode] = useState('MARKET'); // 'MARKET' or 'COST'

    if (loading && !allocationSummary) {
        return (
            <LuxuryCard style={styles.card}>
                <View style={styles.skeletonContainer}>
                    <View style={[styles.skeleton, styles.skeletonTitle]} />
                    <View style={[styles.skeleton, styles.skeletonBar]} />
                </View>
            </LuxuryCard>
        );
    }

    const {
        assetAllocation = [],
        concentration = {},
        valuationBasis = 'EMPTY',
        quoteCoverage = null
    } = allocationSummary || {};

    const isEmpty = !assetAllocation || assetAllocation.length === 0;

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const getAssetColor = (assetType) => {
        const key = (assetType || '').toUpperCase();
        return ASSET_TYPE_COLORS[key] || ASSET_TYPE_COLORS.OTHER;
    };

    const formatAssetName = (assetType) => {
        const map = {
            STOCK: 'Stocks / Equities',
            MUTUAL_FUND: 'Mutual Funds',
            MF: 'Mutual Funds',
            CRYPTO: 'Crypto Assets',
            GOLD: 'Precious Metals / Gold',
            COMMODITY: 'Commodities',
            BOND: 'Bonds / Debt',
            DEBT: 'Fixed Income / Debt',
            REAL_ESTATE: 'Real Estate',
            OTHER: 'Other Assets'
        };
        return map[(assetType || '').toUpperCase()] || assetType || 'Other';
    };

    return (
        <LuxuryCard style={styles.card}>
            {/* Header: Title & View Mode Toggle (Market vs Cost) */}
            <View style={styles.headerRow}>
                <View style={styles.titleWithIcon}>
                    <PieChart size={18} color={COLORS.primaryLight || '#6366F1'} style={styles.titleIcon} />
                    <Text style={styles.title}>Asset Allocation</Text>
                </View>

                {/* Weight Toggle: Market vs Cost */}
                {!isEmpty && (
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, viewMode === 'MARKET' && styles.toggleBtnActive]}
                            onPress={() => setViewMode('MARKET')}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel="View Market Value Weights"
                            accessibilityState={{ selected: viewMode === 'MARKET' }}
                        >
                            <Text style={[styles.toggleText, viewMode === 'MARKET' && styles.toggleTextActive]}>Market</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, viewMode === 'COST' && styles.toggleBtnActive]}
                            onPress={() => setViewMode('COST')}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel="View Cost Basis Weights"
                            accessibilityState={{ selected: viewMode === 'COST' }}
                        >
                            <Text style={[styles.toggleText, viewMode === 'COST' && styles.toggleTextActive]}>Cost</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            {/* Empty State */}
            {isEmpty ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No asset allocation data available.</Text>
                </View>
            ) : (
                <>
                    {/* Multi-Segment Stacked Allocation Bar */}
                    <View style={styles.stackedBar}>
                        {assetAllocation.map((item, idx) => {
                            const weight = viewMode === 'MARKET' ? item.marketWeightPercent : item.costWeightPercent;
                            if (weight <= 0) return null;
                            return (
                                <View
                                    key={item.assetType || idx}
                                    style={[
                                        styles.barSegment,
                                        {
                                            width: `${weight}%`,
                                            backgroundColor: getAssetColor(item.assetType)
                                        }
                                    ]}
                                    accessible={true}
                                    accessibilityRole="text"
                                    accessibilityLabel={`${formatAssetName(item.assetType)}: ${weight.toFixed(1)}%`}
                                />
                            );
                        })}
                    </View>

                    {/* Breakdown List */}
                    <View style={styles.breakdownList}>
                        {assetAllocation.map((item, idx) => {
                            const weight = viewMode === 'MARKET' ? item.marketWeightPercent : item.costWeightPercent;
                            const amount = viewMode === 'MARKET' ? item.marketValue : item.costBasis;
                            const color = getAssetColor(item.assetType);

                            return (
                                <View key={item.assetType || idx} style={styles.breakdownRow}>
                                    <View style={styles.assetLeft}>
                                        <View style={[styles.colorDot, { backgroundColor: color }]} />
                                        <View>
                                            <Text style={styles.assetName}>{formatAssetName(item.assetType)}</Text>
                                            <Text style={styles.holdingCountText}>{item.holdingCount} holding{item.holdingCount > 1 ? 's' : ''}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.assetRight}>
                                        <Text style={styles.assetWeight}>{weight.toFixed(1)}%</Text>
                                        <Text style={styles.assetAmount}>{formatCurrency(amount)}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Concentration & Risk Gauges */}
                    <ConcentrationRiskGauge concentration={concentration} />
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
        marginBottom: SPACING.md
    },
    titleWithIcon: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    titleIcon: {
        marginRight: 6
    },
    title: {
        fontSize: TYPOGRAPHY.h4 || 18,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF',
        letterSpacing: 0.2
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 12,
        padding: 2
    },
    toggleBtn: {
        paddingHorizontal: SPACING.sm + 2,
        paddingVertical: 3,
        borderRadius: 10
    },
    toggleBtnActive: {
        backgroundColor: COLORS.primary || '#4F46E5'
    },
    toggleText: {
        fontSize: TYPOGRAPHY.caption || 11,
        color: COLORS.textSecondary || '#A1A1AA',
        fontWeight: '600'
    },
    toggleTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    stackedBar: {
        height: 12,
        borderRadius: 6,
        flexDirection: 'row',
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.06)',
        marginBottom: SPACING.md
    },
    barSegment: {
        height: '100%'
    },
    breakdownList: {
        gap: SPACING.sm
    },
    breakdownRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2
    },
    assetLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    colorDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: SPACING.sm
    },
    assetName: {
        fontSize: TYPOGRAPHY.bodySmall || 13,
        fontWeight: '600',
        color: COLORS.textPrimary || '#FFFFFF'
    },
    holdingCountText: {
        fontSize: 10,
        color: COLORS.textTertiary || '#71717A'
    },
    assetRight: {
        alignItems: 'flex-end'
    },
    assetWeight: {
        fontSize: TYPOGRAPHY.bodySmall || 13,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF'
    },
    assetAmount: {
        fontSize: 10,
        color: COLORS.textSecondary || '#A1A1AA'
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border || 'rgba(255,255,255,0.06)',
        marginVertical: SPACING.sm + 4
    },
    emptyContainer: {
        paddingVertical: SPACING.md,
        alignItems: 'center'
    },
    emptyText: {
        fontSize: TYPOGRAPHY.bodySmall || 13,
        color: COLORS.textSecondary || '#A1A1AA'
    },
    skeletonContainer: {
        paddingVertical: SPACING.sm
    },
    skeleton: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 8
    },
    skeletonTitle: {
        width: 140,
        height: 16,
        marginBottom: SPACING.md
    },
    skeletonBar: {
        width: '100%',
        height: 12
    }
});
