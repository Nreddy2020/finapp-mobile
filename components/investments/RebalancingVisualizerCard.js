/**
 * components/investments/RebalancingVisualizerCard.js
 * 
 * Stage C.6.4 Rebalancing Visualizer & Decision Support Card.
 * Pure Read-Only Presentation Layer for Phase C.6.
 * 
 * Invariants:
 * 1. Zero UI financial formulas (computations delegated to TaxOptimizedRebalancingService).
 * 2. Service-driven fresh cash simulation with Latest-Request-Wins guard.
 * 3. 100% semantic COLORS.* tokens from constants/theme.js.
 * 4. Zero state/ledger mutations.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Sliders, CheckCircle, AlertTriangle, RefreshCw, ChevronRight, ShieldCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { COLORS, TYPOGRAPHY, SPACING, SIZES } from '../../constants/theme';
import TaxOptimizedRebalancingService from '../../services/taxOptimizedRebalancingService';
import TargetAllocationService from '../../services/targetAllocationService';

export default function RebalancingVisualizerCard({
    portfolioId = null,
    policy = null,
    asOfDate = new Date(),
    availableLiquidity = 0,
    onOpenOrderPreview = null,
    onPolicyChange = null
}) {
    const [rebalancingSummary, setRebalancingSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [simulatedCash, setSimulatedCash] = useState(String(availableLiquidity || 0));
    const [simulating, setSimulating] = useState(false);
    const [selectedModelKey, setSelectedModelKey] = useState('MODERATE_BALANCED');
    
    // Concurrency Guard: Latest Request Sequence ID
    const requestSequenceRef = useRef(0);

    const modelPortfolios = TargetAllocationService.getModelPortfolios();

    const fetchRebalancingData = async (cashAmount, policyToUse) => {
        const requestId = ++requestSequenceRef.current;
        setSimulating(true);
        try {
            const effectivePolicy = policyToUse || policy || TargetAllocationService.getModelPortfolio(selectedModelKey);
            const summary = await TaxOptimizedRebalancingService.calculateTaxOptimizedRebalancing({
                portfolioId,
                policy: effectivePolicy,
                asOfDate,
                availableLiquidity: Number(cashAmount) || 0
            });

            // Latest-Request-Wins Guard
            if (requestId === requestSequenceRef.current) {
                setRebalancingSummary(summary);
                setLoading(false);
                setSimulating(false);
            }
        } catch (err) {
            if (requestId === requestSequenceRef.current) {
                setLoading(false);
                setSimulating(false);
            }
        }
    };

    useEffect(() => {
        fetchRebalancingData(simulatedCash);
    }, [portfolioId, policy, asOfDate, selectedModelKey]);

    const handleCashChange = (text) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        setSimulatedCash(cleaned);
        fetchRebalancingData(cleaned);
    };

    const handleModelSelect = (key) => {
        setSelectedModelKey(key);
        if (onPolicyChange) {
            onPolicyChange(key);
        }
    };

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatPercent = (val) => {
        const num = Number(val) || 0;
        return `${num.toFixed(1)}%`;
    };

    if (loading && !rebalancingSummary) {
        return (
            <LuxuryCard style={styles.card}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color={COLORS.primaryLight} />
                    <Text style={styles.loadingText}>Analyzing Portfolio Allocation & Drift...</Text>
                </View>
            </LuxuryCard>
        );
    }

    const {
        sourceRebalancingSummary = {},
        requestedSellNotional = 0,
        selectedSellNotional = 0,
        optimizedEstimatedTaxLiability = 0,
        estimatedTaxSavings = 0,
        taxDragPercentage = 0,
        harvestedLosses = 0,
        driftGaugePercentage = 0,
        optimizationStatus = 'OPTIMAL',
        optimizationWarnings = []
    } = rebalancingSummary || {};

    const {
        rebalancingStatus = 'BALANCED',
        residualDriftPercentagePoints = 0,
        currentAllocation = [],
        targetAllocation = [],
        projectedAllocation = [],
        executableBuyNotional = 0,
        roundingResidual = 0
    } = sourceRebalancingSummary;

    const isBalanced = rebalancingStatus === 'BALANCED' || optimizationStatus === 'ZERO_SELLS_REQUIRED';
    const isPriceStale = rebalancingStatus === 'PRICE_REFRESH_REQUIRED';

    const getStatusBadge = () => {
        if (isPriceStale) {
            return { label: 'PRICE REFRESH REQUIRED', bg: COLORS.card, color: COLORS.warning, icon: AlertTriangle };
        }
        if (isBalanced) {
            return { label: 'IN-BAND BALANCED', bg: COLORS.card, color: COLORS.success, icon: CheckCircle };
        }
        return { label: 'ACTION RECOMMENDED', bg: COLORS.card, color: COLORS.primaryLight, icon: Sliders };
    };

    const statusInfo = getStatusBadge();
    const StatusIcon = statusInfo.icon;

    return (
        <LuxuryCard style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <Sliders size={SIZES.icon.medium} color={COLORS.primaryLight} />
                    <Text style={styles.title}>Portfolio Rebalancing</Text>
                </View>
                <View style={[styles.statusBadge, { borderColor: statusInfo.color }]}>
                    <StatusIcon size={SIZES.icon.tiny} color={statusInfo.color} />
                    <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                </View>
            </View>

            {/* Target Model Selector Pills */}
            <View style={styles.modelSelectorContainer}>
                {modelPortfolios.map((m) => {
                    const isSelected = m.policyId === selectedModelKey;
                    return (
                        <TouchableOpacity
                            key={m.policyId}
                            style={[styles.modelPill, isSelected && styles.modelPillActive]}
                            onPress={() => handleModelSelect(m.policyId)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.modelPillText, isSelected && styles.modelPillTextActive]}>
                                {m.policyName}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Drift Gauge */}
            <View style={styles.driftSection}>
                <View style={styles.driftHeader}>
                    <Text style={styles.driftLabel}>Max Allocation Drift</Text>
                    <Text style={[styles.driftValue, { color: isBalanced ? COLORS.success : COLORS.warning }]}>
                        {formatPercent(residualDriftPercentagePoints)}
                    </Text>
                </View>
                <View style={styles.driftTrack}>
                    <View style={[styles.driftFill, { 
                        width: `${driftGaugePercentage}%`,
                        backgroundColor: isBalanced ? COLORS.success : COLORS.warning
                    }]} />
                </View>
            </View>

            {/* 3-Way Allocation Comparison */}
            <View style={styles.allocationComparison}>
                <View style={styles.allocHeaderRow}>
                    <Text style={[styles.allocColHeader, { flex: 2 }]}>Asset Class</Text>
                    <Text style={styles.allocColHeader}>Current</Text>
                    <Text style={styles.allocColHeader}>Target</Text>
                    <Text style={styles.allocColHeader}>Projected</Text>
                </View>

                {currentAllocation.filter(a => a.currentMarketValue > 0 || (targetAllocation.find(t => t.assetType === a.assetType)?.targetWeightPercent || 0) > 0).map((item) => {
                    const target = targetAllocation.find(t => t.assetType === item.assetType);
                    const projected = projectedAllocation.find(p => p.assetType === item.assetType);
                    const targetPct = target ? target.targetWeightPercent : 0;
                    const projPct = projected ? projected.projectedWeightPercent : item.currentWeightPercent;

                    return (
                        <View key={item.assetType} style={styles.allocRow}>
                            <Text style={[styles.allocCell, { flex: 2, color: COLORS.textPrimary }]}>{item.assetType}</Text>
                            <Text style={[styles.allocCell, { color: COLORS.textSecondary }]}>{formatPercent(item.currentWeightPercent)}</Text>
                            <Text style={[styles.allocCell, { color: COLORS.primaryLight }]}>{formatPercent(targetPct)}</Text>
                            <Text style={[styles.allocCell, { color: COLORS.success }]}>{formatPercent(projPct)}</Text>
                        </View>
                    );
                })}
            </View>

            {/* Decision Support Metrics */}
            <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                    <View style={styles.metricIconRow}>
                        <ArrowUpRight size={SIZES.icon.tiny} color={COLORS.success} />
                        <Text style={styles.metricLabel}>Planned Buys</Text>
                    </View>
                    <Text style={styles.metricValue}>{formatCurrency(executableBuyNotional)}</Text>
                </View>

                <View style={styles.metricCard}>
                    <View style={styles.metricIconRow}>
                        <ArrowDownRight size={SIZES.icon.tiny} color={COLORS.error} />
                        <Text style={styles.metricLabel}>Planned Sells</Text>
                    </View>
                    <Text style={styles.metricValue}>{formatCurrency(selectedSellNotional)}</Text>
                </View>

                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Est. Tax Liability</Text>
                    <Text style={[styles.metricValue, { color: optimizedEstimatedTaxLiability > 0 ? COLORS.warning : COLORS.success }]}>
                        {formatCurrency(optimizedEstimatedTaxLiability)}
                    </Text>
                </View>

                <View style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Tax Savings</Text>
                    <Text style={[styles.metricValue, { color: COLORS.success }]}>
                        {formatCurrency(estimatedTaxSavings)}
                    </Text>
                </View>
            </View>

            {/* Interactive Fresh Cash Simulator */}
            <View style={styles.simulatorSection}>
                <View style={styles.simulatorHeader}>
                    <Text style={styles.simulatorTitle}>Fresh Cash Simulator (₹)</Text>
                    {simulating && <ActivityIndicator size="small" color={COLORS.primaryLight} />}
                </View>
                <TextInput
                    style={styles.cashInput}
                    value={simulatedCash}
                    onChangeText={handleCashChange}
                    keyboardType="numeric"
                    placeholder="Enter available liquidity"
                    placeholderTextColor={COLORS.textTertiary}
                />
                <Text style={styles.simulatorHint}>
                    Simulate how deploying cash rebalances your portfolio without triggering capital gains taxes.
                </Text>
            </View>

            {/* Warnings */}
            {optimizationWarnings.length > 0 && (
                <View style={styles.warningContainer}>
                    <AlertTriangle size={SIZES.icon.small} color={COLORS.warning} />
                    <Text style={styles.warningText}>{optimizationWarnings[0]}</Text>
                </View>
            )}

            {/* Action Trigger */}
            <TouchableOpacity
                style={styles.actionButton}
                onPress={onOpenOrderPreview}
                activeOpacity={0.8}
            >
                <Text style={styles.actionButtonText}>Preview Optimized Orders</Text>
                <ChevronRight size={SIZES.icon.medium} color={COLORS.textPrimary} />
            </TouchableOpacity>
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    card: {
        marginBottom: SPACING.md,
        padding: SPACING.md,
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        borderRadius: SIZES.radius.medium
    },
    loadingContainer: {
        padding: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingText: {
        marginTop: SPACING.sm,
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.md
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs
    },
    title: {
        fontSize: TYPOGRAPHY.h4,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: SIZES.radius.small,
        borderWidth: 1,
        backgroundColor: COLORS.card
    },
    statusText: {
        fontSize: TYPOGRAPHY.caption,
        fontWeight: 'bold'
    },
    modelSelectorContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.md
    },
    modelPill: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        borderRadius: SIZES.radius.small,
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    modelPillActive: {
        backgroundColor: COLORS.primaryDark,
        borderColor: COLORS.primaryLight
    },
    modelPillText: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textSecondary
    },
    modelPillTextActive: {
        color: COLORS.textPrimary,
        fontWeight: 'bold'
    },
    driftSection: {
        marginBottom: SPACING.md,
        padding: SPACING.sm,
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small
    },
    driftHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SPACING.xs
    },
    driftLabel: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textSecondary
    },
    driftValue: {
        fontSize: TYPOGRAPHY.caption,
        fontWeight: 'bold'
    },
    driftTrack: {
        height: 6,
        backgroundColor: COLORS.surface,
        borderRadius: 3,
        overflow: 'hidden'
    },
    driftFill: {
        height: '100%',
        borderRadius: 3
    },
    allocationComparison: {
        marginBottom: SPACING.md,
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        padding: SPACING.sm
    },
    allocHeaderRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: SPACING.xs,
        marginBottom: SPACING.xs
    },
    allocColHeader: {
        flex: 1,
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary,
        textAlign: 'right'
    },
    allocRow: {
        flexDirection: 'row',
        paddingVertical: 2
    },
    allocCell: {
        flex: 1,
        fontSize: TYPOGRAPHY.caption,
        textAlign: 'right'
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.xs,
        marginBottom: SPACING.md
    },
    metricCard: {
        flex: 1,
        minWidth: '45%',
        padding: SPACING.sm,
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    metricIconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        marginBottom: 2
    },
    metricLabel: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary
    },
    metricValue: {
        fontSize: TYPOGRAPHY.body,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    },
    simulatorSection: {
        marginBottom: SPACING.md,
        padding: SPACING.sm,
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    simulatorHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs
    },
    simulatorTitle: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    },
    cashInput: {
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SIZES.radius.small,
        paddingHorizontal: SPACING.sm,
        paddingVertical: SPACING.xs,
        fontSize: TYPOGRAPHY.body,
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs
    },
    simulatorHint: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs,
        padding: SPACING.sm,
        backgroundColor: COLORS.card,
        borderColor: COLORS.warning,
        borderWidth: 1,
        borderRadius: SIZES.radius.small,
        marginBottom: SPACING.md
    },
    warningText: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.warning,
        flex: 1
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        borderRadius: SIZES.radius.small
    },
    actionButtonText: {
        fontSize: TYPOGRAPHY.button,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    }
});
