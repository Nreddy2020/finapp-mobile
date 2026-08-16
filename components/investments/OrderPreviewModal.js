/**
 * components/investments/OrderPreviewModal.js
 * 
 * Stage C.6.4 Order Preview & Tax Audit Modal.
 * Pure Read-Only Presentation Layer for Phase C.6.
 * 
 * Invariants:
 * 1. Zero UI financial formulas.
 * 2. 100% semantic COLORS.* tokens from constants/theme.js.
 * 3. Zero execution/ledger/wallet mutations.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, ArrowUpRight, ArrowDownRight, ShieldCheck, AlertTriangle, Layers, Percent, FileText, ChevronDown, ChevronUp } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING, SIZES } from '../../constants/theme';

export default function OrderPreviewModal({
    visible = false,
    onClose = () => {},
    rebalancingSummary = null,
    onRefreshQuotes = null
}) {
    const [activeTab, setActiveTab] = useState('ORDERS'); // 'ORDERS' | 'TAX' | 'LOTS'
    const [expandedLots, setExpandedLots] = useState({});

    if (!rebalancingSummary) return null;

    const {
        sourceRebalancingSummary = {},
        selectedTaxLots = [],
        optimizedEstimatedTaxLiability = 0,
        naiveEstimatedTaxLiability = 0,
        estimatedTaxSavings = 0,
        taxDragPercentage = 0,
        harvestedLosses = 0,
        effectiveOffsettableLosses = 0,
        taxBenefitFromLosses = 0,
        annualLtcgExemption = 125000,
        exemptionConsumedPrior = 0,
        exemptionConsumedCurrent = 0,
        remainingExemptionAfterSale = 125000,
        optimizationStatus = 'OPTIMAL',
        optimizationWarnings = []
    } = rebalancingSummary;

    const {
        recommendations = [],
        executableBuyNotional = 0,
        executableSellNotional = 0,
        roundingResidual = 0
    } = sourceRebalancingSummary;

    const toggleLotExpand = (lotId) => {
        setExpandedLots(prev => ({ ...prev, [lotId]: !prev[lotId] }));
    };

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatPercent = (val) => {
        const num = Number(val) || 0;
        return `${num.toFixed(1)}%`;
    };

    const executableOrders = recommendations.filter(r => r.action !== 'HOLD' && r.isExecutable && r.roundedTradeQuantity > 0);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Modal Header */}
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.headerTitle}>Optimized Order Preview</Text>
                            <Text style={styles.headerSubtitle}>Pure Decision Support • Zero Auto-Execution</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <X size={SIZES.icon.medium} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Tab Navigation */}
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'ORDERS' && styles.tabButtonActive]}
                            onPress={() => setActiveTab('ORDERS')}
                        >
                            <Layers size={SIZES.icon.tiny} color={activeTab === 'ORDERS' ? COLORS.primaryLight : COLORS.textTertiary} />
                            <Text style={[styles.tabText, activeTab === 'ORDERS' && styles.tabTextActive]}>
                                Orders ({executableOrders.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'TAX' && styles.tabButtonActive]}
                            onPress={() => setActiveTab('TAX')}
                        >
                            <Percent size={SIZES.icon.tiny} color={activeTab === 'TAX' ? COLORS.primaryLight : COLORS.textTertiary} />
                            <Text style={[styles.tabText, activeTab === 'TAX' && styles.tabTextActive]}>
                                Tax Impact
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.tabButton, activeTab === 'LOTS' && styles.tabButtonActive]}
                            onPress={() => setActiveTab('LOTS')}
                        >
                            <FileText size={SIZES.icon.tiny} color={activeTab === 'LOTS' ? COLORS.primaryLight : COLORS.textTertiary} />
                            <Text style={[styles.tabText, activeTab === 'LOTS' && styles.tabTextActive]}>
                                Selected Lots ({selectedTaxLots.length})
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Content Area */}
                    <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
                        {/* Tab 1: Orders */}
                        {activeTab === 'ORDERS' && (
                            <View>
                                {executableOrders.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <ShieldCheck size={SIZES.icon.large} color={COLORS.success} />
                                        <Text style={styles.emptyStateTitle}>Portfolio is in Target Balance</Text>
                                        <Text style={styles.emptyStateSubtitle}>No rebalancing trades are currently required.</Text>
                                    </View>
                                ) : (
                                    executableOrders.map((ord, idx) => {
                                        const isBuy = ord.action === 'BUY';
                                        return (
                                            <View key={`${ord.symbol}_${idx}`} style={styles.orderCard}>
                                                <View style={styles.orderHeader}>
                                                    <View style={styles.orderSymbolRow}>
                                                        <View style={[styles.actionBadge, { backgroundColor: isBuy ? COLORS.card : COLORS.card, borderColor: isBuy ? COLORS.success : COLORS.error }]}>
                                                            {isBuy ? (
                                                                <ArrowUpRight size={SIZES.icon.tiny} color={COLORS.success} />
                                                            ) : (
                                                                <ArrowDownRight size={SIZES.icon.tiny} color={COLORS.error} />
                                                            )}
                                                            <Text style={[styles.actionBadgeText, { color: isBuy ? COLORS.success : COLORS.error }]}>
                                                                {ord.action}
                                                            </Text>
                                                        </View>
                                                        <Text style={styles.orderSymbol}>{ord.symbol}</Text>
                                                        <Text style={styles.assetTypeTag}>{ord.assetType}</Text>
                                                    </View>

                                                    <View style={[styles.quoteBadge, { borderColor: ord.quoteStatus !== 'LIVE' ? COLORS.warning : COLORS.border }]}>
                                                        <Text style={[styles.quoteBadgeText, { color: ord.quoteStatus !== 'LIVE' ? COLORS.warning : COLORS.textSecondary }]}>
                                                            {ord.quoteStatus === 'LIVE' ? 'LIVE' : 'REFRESH NEEDED'}
                                                        </Text>
                                                    </View>
                                                </View>

                                                <View style={styles.orderMetrics}>
                                                    <View style={styles.orderMetricItem}>
                                                        <Text style={styles.orderMetricLabel}>Quantity</Text>
                                                        <Text style={styles.orderMetricValue}>{ord.roundedTradeQuantity}</Text>
                                                    </View>
                                                    <View style={styles.orderMetricItem}>
                                                        <Text style={styles.orderMetricLabel}>Ref. Price</Text>
                                                        <Text style={styles.orderMetricValue}>{formatCurrency(ord.referencePrice)}</Text>
                                                    </View>
                                                    <View style={styles.orderMetricItem}>
                                                        <Text style={styles.orderMetricLabel}>Executable Notional</Text>
                                                        <Text style={styles.orderMetricValue}>
                                                            {formatCurrency(ord.roundedTradeQuantity * ord.referencePrice)}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        );
                                    })
                                )}

                                {/* Rounding Residual Notice */}
                                {roundingResidual > 0 && (
                                    <View style={styles.infoBanner}>
                                        <Text style={styles.infoBannerText}>
                                            Rounding Residual: {formatCurrency(roundingResidual)} preserved due to discrete trading unit constraints.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Tab 2: Tax Impact */}
                        {activeTab === 'TAX' && (
                            <View>
                                <View style={styles.taxSummaryCard}>
                                    <Text style={styles.taxCardTitle}>Tax Optimization Summary</Text>
                                    
                                    <View style={styles.taxRow}>
                                        <Text style={styles.taxLabel}>Optimized Tax Liability</Text>
                                        <Text style={[styles.taxValue, { color: optimizedEstimatedTaxLiability > 0 ? COLORS.warning : COLORS.success }]}>
                                            {formatCurrency(optimizedEstimatedTaxLiability)}
                                        </Text>
                                    </View>

                                    <View style={styles.taxRow}>
                                        <Text style={styles.taxLabel}>Naive FIFO Tax Liability</Text>
                                        <Text style={[styles.taxValue, { color: COLORS.textSecondary }]}>
                                            {formatCurrency(naiveEstimatedTaxLiability)}
                                        </Text>
                                    </View>

                                    <View style={[styles.taxRow, styles.taxRowHighlight]}>
                                        <Text style={styles.taxSavingsLabel}>Estimated Tax Savings</Text>
                                        <Text style={styles.taxSavingsValue}>
                                            {formatCurrency(estimatedTaxSavings)}
                                        </Text>
                                    </View>

                                    <View style={styles.taxRow}>
                                        <Text style={styles.taxLabel}>Tax Drag</Text>
                                        <Text style={[styles.taxValue, { color: COLORS.textPrimary }]}>
                                            {formatPercent(taxDragPercentage)} of proceeds
                                        </Text>
                                    </View>
                                </View>

                                {/* Annual LTCG Exemption Meter */}
                                <View style={styles.exemptionCard}>
                                    <Text style={styles.exemptionTitle}>Annual LTCG Exemption Meter (FY24-25)</Text>
                                    <View style={styles.exemptionMetrics}>
                                        <Text style={styles.exemptionText}>Limit: {formatCurrency(annualLtcgExemption)}</Text>
                                        <Text style={styles.exemptionText}>Used Today: {formatCurrency(exemptionConsumedCurrent)}</Text>
                                        <Text style={styles.exemptionText}>Remaining: {formatCurrency(remainingExemptionAfterSale)}</Text>
                                    </View>
                                </View>

                                {/* Loss Harvesting Card */}
                                {harvestedLosses > 0 && (
                                    <View style={styles.lossCard}>
                                        <Text style={styles.lossCardTitle}>Tax-Loss Harvesting</Text>
                                        <Text style={styles.lossCardText}>
                                            Harvested {formatCurrency(harvestedLosses)} in capital losses to offset gains and minimize total tax drag.
                                        </Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {/* Tab 3: Selected Lots */}
                        {activeTab === 'LOTS' && (
                            <View>
                                {selectedTaxLots.length === 0 ? (
                                    <View style={styles.emptyState}>
                                        <ShieldCheck size={SIZES.icon.large} color={COLORS.success} />
                                        <Text style={styles.emptyStateTitle}>Zero Tax Lots Sold</Text>
                                        <Text style={styles.emptyStateSubtitle}>No sell recommendations required.</Text>
                                    </View>
                                ) : (
                                    selectedTaxLots.map((lot) => {
                                        const isExpanded = expandedLots[lot.lotId];
                                        return (
                                            <TouchableOpacity
                                                key={lot.lotId}
                                                style={styles.lotCard}
                                                onPress={() => toggleLotExpand(lot.lotId)}
                                                activeOpacity={0.8}
                                            >
                                                <View style={styles.lotHeader}>
                                                    <View style={styles.lotTitleCol}>
                                                        <Text style={styles.lotSymbol}>{lot.symbol}</Text>
                                                        <Text style={styles.lotSub}>Held {lot.holdingPeriodDays} days</Text>
                                                    </View>

                                                    <View style={styles.lotBadgeCol}>
                                                        <View style={[styles.tierBadge, { borderColor: lot.taxCategory === 'LOSS' ? COLORS.success : (lot.taxCategory === 'LTCG' ? COLORS.primaryLight : COLORS.warning) }]}>
                                                            <Text style={[styles.tierBadgeText, { color: lot.taxCategory === 'LOSS' ? COLORS.success : (lot.taxCategory === 'LTCG' ? COLORS.primaryLight : COLORS.warning) }]}>
                                                                {lot.selectionTier}
                                                            </Text>
                                                        </View>
                                                        {isExpanded ? (
                                                            <ChevronUp size={SIZES.icon.small} color={COLORS.textSecondary} />
                                                        ) : (
                                                            <ChevronDown size={SIZES.icon.small} color={COLORS.textSecondary} />
                                                        )}
                                                    </View>
                                                </View>

                                                <Text style={styles.lotReason}>{lot.selectionReason}</Text>

                                                {isExpanded && (
                                                    <View style={styles.lotExpanded}>
                                                        <View style={styles.lotDetailRow}>
                                                            <Text style={styles.lotDetailLabel}>Sold Quantity</Text>
                                                            <Text style={styles.lotDetailValue}>{lot.soldQuantity} (Rem: {lot.remainingQuantityAfterSale})</Text>
                                                        </View>
                                                        <View style={styles.lotDetailRow}>
                                                            <Text style={styles.lotDetailLabel}>Sold Proceeds</Text>
                                                            <Text style={styles.lotDetailValue}>{formatCurrency(lot.soldProceeds)}</Text>
                                                        </View>
                                                        <View style={styles.lotDetailRow}>
                                                            <Text style={styles.lotDetailLabel}>Cost Basis</Text>
                                                            <Text style={styles.lotDetailValue}>{formatCurrency(lot.soldCostBasis)}</Text>
                                                        </View>
                                                        <View style={styles.lotDetailRow}>
                                                            <Text style={styles.lotDetailLabel}>Realized Gain/Loss</Text>
                                                            <Text style={[styles.lotDetailValue, { color: lot.realizedGain >= 0 ? COLORS.success : COLORS.error }]}>
                                                                {formatCurrency(lot.realizedGain)}
                                                            </Text>
                                                        </View>
                                                        <View style={styles.lotDetailRow}>
                                                            <Text style={styles.lotDetailLabel}>Exemption Applied</Text>
                                                            <Text style={styles.lotDetailValue}>{formatCurrency(lot.exemptionApplied)}</Text>
                                                        </View>
                                                        <View style={styles.lotDetailRow}>
                                                            <Text style={styles.lotDetailLabel}>Net Tax</Text>
                                                            <Text style={[styles.lotDetailValue, { color: lot.netTaxLiability > 0 ? COLORS.warning : COLORS.success }]}>
                                                                {formatCurrency(lot.netTaxLiability)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    })
                                )}
                            </View>
                        )}
                    </ScrollView>

                    {/* Footer Close Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
                            <Text style={styles.doneButtonText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: COLORS.background,
        justifyContent: 'flex-end'
    },
    modalContent: {
        height: '90%',
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: SIZES.radius.large,
        borderTopRightRadius: SIZES.radius.large,
        borderTopWidth: 1,
        borderColor: COLORS.border,
        paddingTop: SPACING.md
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.h4,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    },
    headerSubtitle: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary,
        marginTop: 2
    },
    closeButton: {
        padding: SPACING.xs
    },
    tabBar: {
        flexDirection: 'row',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.xs,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        backgroundColor: COLORS.card
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.xs,
        paddingVertical: SPACING.sm,
        borderRadius: SIZES.radius.small
    },
    tabButtonActive: {
        backgroundColor: COLORS.surface
    },
    tabText: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary
    },
    tabTextActive: {
        color: COLORS.primaryLight,
        fontWeight: 'bold'
    },
    scrollArea: {
        flex: 1
    },
    scrollContent: {
        padding: SPACING.md
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.xl
    },
    emptyStateTitle: {
        fontSize: TYPOGRAPHY.h4,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginTop: SPACING.md
    },
    emptyStateSubtitle: {
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs
    },
    orderCard: {
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.sm,
        marginBottom: SPACING.sm
    },
    orderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.xs
    },
    orderSymbolRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs
    },
    actionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: SIZES.radius.small,
        borderWidth: 1
    },
    actionBadgeText: {
        fontSize: TYPOGRAPHY.caption,
        fontWeight: 'bold'
    },
    orderSymbol: {
        fontSize: TYPOGRAPHY.body,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    },
    assetTypeTag: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary
    },
    quoteBadge: {
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: SIZES.radius.small,
        borderWidth: 1
    },
    quoteBadgeText: {
        fontSize: TYPOGRAPHY.caption,
        fontWeight: 'bold'
    },
    orderMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.xs,
        marginTop: SPACING.xs
    },
    orderMetricItem: {
        alignItems: 'center'
    },
    orderMetricLabel: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary
    },
    orderMetricValue: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    },
    infoBanner: {
        padding: SPACING.sm,
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        marginTop: SPACING.xs
    },
    infoBannerText: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        textAlign: 'center'
    },
    taxSummaryCard: {
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        marginBottom: SPACING.md
    },
    taxCardTitle: {
        fontSize: TYPOGRAPHY.body,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.sm
    },
    taxRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: SPACING.xs
    },
    taxRowHighlight: {
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: COLORS.border,
        marginVertical: SPACING.xs,
        paddingVertical: SPACING.sm
    },
    taxLabel: {
        fontSize: TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary
    },
    taxValue: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontWeight: 'bold'
    },
    taxSavingsLabel: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontWeight: 'bold',
        color: COLORS.success
    },
    taxSavingsValue: {
        fontSize: TYPOGRAPHY.body,
        fontWeight: 'bold',
        color: COLORS.success
    },
    exemptionCard: {
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md,
        marginBottom: SPACING.md
    },
    exemptionTitle: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs
    },
    exemptionMetrics: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    exemptionText: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textSecondary
    },
    lossCard: {
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.md
    },
    lossCardTitle: {
        fontSize: TYPOGRAPHY.bodySmall,
        fontWeight: 'bold',
        color: COLORS.primaryLight,
        marginBottom: SPACING.xs
    },
    lossCardText: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textSecondary
    },
    lotCard: {
        backgroundColor: COLORS.card,
        borderRadius: SIZES.radius.small,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.sm,
        marginBottom: SPACING.sm
    },
    lotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    lotTitleCol: {},
    lotSymbol: {
        fontSize: TYPOGRAPHY.body,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    },
    lotSub: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary
    },
    lotBadgeCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.xs
    },
    tierBadge: {
        paddingHorizontal: SPACING.xs,
        paddingVertical: 2,
        borderRadius: SIZES.radius.small,
        borderWidth: 1
    },
    tierBadgeText: {
        fontSize: TYPOGRAPHY.caption,
        fontWeight: 'bold'
    },
    lotReason: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textSecondary,
        marginTop: SPACING.xs
    },
    lotExpanded: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: SPACING.xs,
        marginTop: SPACING.xs
    },
    lotDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2
    },
    lotDetailLabel: {
        fontSize: TYPOGRAPHY.caption,
        color: COLORS.textTertiary
    },
    lotDetailValue: {
        fontSize: TYPOGRAPHY.caption,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    },
    footer: {
        padding: SPACING.md,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        backgroundColor: COLORS.surface
    },
    doneButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SPACING.sm,
        borderRadius: SIZES.radius.small,
        alignItems: 'center'
    },
    doneButtonText: {
        fontSize: TYPOGRAPHY.button,
        fontWeight: 'bold',
        color: COLORS.textPrimary
    }
});
