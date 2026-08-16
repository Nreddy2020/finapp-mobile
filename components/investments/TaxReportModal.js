/**
 * components/investments/TaxReportModal.js
 * 
 * Stage C.5.4 Tax Report & FIFO Lot Matching Modal.
 * Authoritatively presents FIFO Tax Cost Basis, Tax Realized Gains, and Holding Days.
 * Consumes Stage C.4.4 generatePortfolioStatement strictly read-only.
 * Uses semantic theme tokens exclusively from COLORS.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { X, FileText, AlertTriangle, ShieldCheck, Tag } from 'lucide-react-native';
import { COLORS, SPACING } from '../../constants/theme';

export default function TaxReportModal({
    visible = false,
    onClose = () => {},
    statement = null
}) {
    if (!statement) return null;

    const {
        portfolioId = null,
        period = 'ALL_TIME',
        periodActivity = {},
        statementIntegrity = 'VALID',
        integrityWarnings = []
    } = statement;

    const cg = periodActivity?.capitalGains || {};
    const sells = cg.sells || [];
    const isConsistent = statementIntegrity === 'VALID';

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const renderIntegrityWarning = (w, idx) => {
        if (!w) return null;
        if (typeof w === 'string') {
            return (
                <Text key={idx} style={styles.warningText}>
                    • {w}
                </Text>
            );
        }
        const warningType = w.type || 'DATA_INCONSISTENCY';
        const warningMsg = w.message || w.reason || JSON.stringify(w);
        const symbolTag = w.symbol ? ` [${w.symbol}]` : '';
        return (
            <Text key={idx} style={styles.warningText}>
                • {warningType}{symbolTag}: {warningMsg}
            </Text>
        );
    };

    const totalTaxGain = cg.totalTaxRealizedGain !== undefined ? cg.totalTaxRealizedGain : (cg.totalEconomicRealizedGain || 0);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerTitleRow}>
                            <FileText size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                            <View>
                                <Text style={styles.title}>FIFO Tax Report</Text>
                                <Text style={styles.subtitle}>
                                    {portfolioId ? `Portfolio: ${portfolioId.toUpperCase()}` : 'All Portfolios'} • {period}
                                </Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose} accessibilityLabel="Close Tax Report">
                            <X size={20} color={COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
                        {/* Realized Capital Gains Header Card */}
                        <View style={styles.summaryCard}>
                            <Text style={styles.summaryTitle}>FIFO Realized Tax Gains</Text>
                            <View style={styles.summaryRow}>
                                <View style={styles.summaryCol}>
                                    <Text style={styles.summaryLabel}>Total Tax Realized Gain</Text>
                                    <Text style={[styles.summaryValue, { color: totalTaxGain >= 0 ? COLORS.success : COLORS.error }]}>
                                        {totalTaxGain >= 0 ? '+' : '-'}{formatCurrency(totalTaxGain)}
                                    </Text>
                                </View>
                                <View style={styles.summaryCol}>
                                    <Text style={styles.summaryLabel}>Sell Trades</Text>
                                    <Text style={styles.summarySubValue}>{cg.sellEventCount || 0} Trades</Text>
                                </View>
                            </View>
                            <View style={[styles.summaryRow, { marginTop: SPACING.sm }]}>
                                <View style={styles.summaryCol}>
                                    <Text style={styles.summaryLabel}>Short-Term Gain (STCG)</Text>
                                    <Text style={styles.summarySubValue}>{formatCurrency(cg.totalSTCG)}</Text>
                                </View>
                                <View style={styles.summaryCol}>
                                    <Text style={styles.summaryLabel}>Long-Term Gain (LTCG)</Text>
                                    <Text style={styles.summarySubValue}>{formatCurrency(cg.totalLTCG)}</Text>
                                </View>
                            </View>
                        </View>

                        {/* Audit / Consistency Notice */}
                        {!isConsistent && (
                            <View style={styles.warningBanner}>
                                <AlertTriangle size={16} color={COLORS.warning} style={{ marginRight: 6 }} />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.warningTitle}>Ledger Inconsistency Detected</Text>
                                    {integrityWarnings.map((w, idx) => renderIntegrityWarning(w, idx))}
                                </View>
                            </View>
                        )}

                        {/* FIFO Lots Section */}
                        <View style={styles.sectionHeader}>
                            <Tag size={15} color={COLORS.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={styles.sectionTitle}>
                                Matched FIFO Sell Trades ({sells.length})
                            </Text>
                        </View>

                        {sells.length === 0 ? (
                            <View style={styles.emptyLotsContainer}>
                                <ShieldCheck size={32} color={COLORS.textTertiary} style={{ marginBottom: 6 }} />
                                <Text style={styles.emptyLotsText}>No realized sell trades in this statement period.</Text>
                            </View>
                        ) : (
                            sells.map((sell, idx) => {
                                const isSTCG = sell.gainType === 'STCG';
                                // Authoritative FIFO values
                                const fifoTaxGain = sell.taxRealizedGain !== undefined ? sell.taxRealizedGain : (sell.economicRealizedGain || 0);
                                const isGain = fifoTaxGain >= 0;
                                const fifoCostBasis = sell.fifoCostBasisOfSold !== undefined ? sell.fifoCostBasisOfSold : (sell.wacCostBasisOfSold || 0);

                                return (
                                    <View key={`sell_${idx}`} style={styles.lotCard}>
                                        <View style={styles.lotHeader}>
                                            <View>
                                                <Text style={styles.lotSymbol}>{sell.symbol}</Text>
                                                <Text style={styles.lotAssetType}>{sell.assetType || 'STOCK'} • Qty: {sell.quantity || sell.quantitySold}</Text>
                                            </View>
                                            <View style={[styles.badge, isSTCG ? styles.stcgBadge : styles.ltcgBadge]}>
                                                <Text style={[styles.badgeText, isSTCG ? styles.stcgBadgeText : styles.ltcgBadgeText]}>
                                                    {sell.gainType} ({sell.holdingDays || 0}d)
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={styles.lotGrid}>
                                            <View style={styles.lotGridCol}>
                                                <Text style={styles.lotLabel}>Sell Price</Text>
                                                <Text style={styles.lotValue}>{formatCurrency(sell.sellPrice)}</Text>
                                            </View>
                                            <View style={styles.lotGridCol}>
                                                <Text style={styles.lotLabel}>Acquisition Date</Text>
                                                <Text style={styles.lotValue}>{sell.acquisitionDate ? sell.acquisitionDate.slice(0, 10) : 'N/A'}</Text>
                                            </View>
                                            <View style={styles.lotGridCol}>
                                                <Text style={styles.lotLabel}>Holding</Text>
                                                <Text style={styles.lotValue}>{sell.holdingDays || 0} days</Text>
                                            </View>
                                        </View>

                                        <View style={[styles.lotGrid, { marginTop: 6, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 6 }]}>
                                            <View style={styles.lotGridCol}>
                                                <Text style={styles.lotLabel}>FIFO Cost Basis</Text>
                                                <Text style={styles.lotValue}>{formatCurrency(fifoCostBasis)}</Text>
                                            </View>
                                            <View style={styles.lotGridCol}>
                                                <Text style={styles.lotLabel}>Gross Proceeds</Text>
                                                <Text style={styles.lotValue}>{formatCurrency(sell.grossProceeds)}</Text>
                                            </View>
                                            <View style={styles.lotGridCol}>
                                                <Text style={styles.lotLabel}>Tax Realized Gain</Text>
                                                <Text style={[styles.lotValue, { color: isGain ? COLORS.success : COLORS.error }]}>
                                                    {isGain ? '+' : '-'}{formatCurrency(fifoTaxGain)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </ScrollView>
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
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: SPACING.sm,
        marginBottom: SPACING.sm
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary
    },
    subtitle: {
        fontSize: 11,
        color: COLORS.textSecondary,
        marginTop: 1
    },
    closeBtn: {
        padding: 6,
        borderRadius: 16,
        backgroundColor: COLORS.borderLight
    },
    scrollBody: {
        paddingBottom: SPACING.xl
    },
    summaryCard: {
        backgroundColor: COLORS.card,
        borderRadius: 14,
        padding: SPACING.md,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.md
    },
    summaryTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: SPACING.xs
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    summaryCol: {
        flex: 1
    },
    summaryLabel: {
        fontSize: 11,
        color: COLORS.textSecondary
    },
    summaryValue: {
        fontSize: 16,
        fontWeight: '800',
        marginTop: 2
    },
    summarySubValue: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 1
    },
    warningBanner: {
        flexDirection: 'row',
        backgroundColor: COLORS.borderLight,
        borderColor: COLORS.warning,
        borderWidth: 1,
        borderRadius: 10,
        padding: SPACING.sm,
        marginBottom: SPACING.md
    },
    warningTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.warning,
        marginBottom: 2
    },
    warningText: {
        fontSize: 11,
        color: COLORS.warning,
        lineHeight: 16
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SPACING.sm
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    emptyLotsContainer: {
        paddingVertical: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyLotsText: {
        fontSize: 12,
        color: COLORS.textTertiary,
        textAlign: 'center'
    },
    lotCard: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: SPACING.xs
    },
    lotHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    lotSymbol: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary
    },
    lotAssetType: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: 1
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        borderWidth: 1
    },
    stcgBadge: {
        backgroundColor: COLORS.borderLight,
        borderColor: COLORS.error
    },
    ltcgBadge: {
        backgroundColor: COLORS.borderLight,
        borderColor: COLORS.success
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700'
    },
    stcgBadgeText: {
        color: COLORS.error
    },
    ltcgBadgeText: {
        color: COLORS.success
    },
    lotGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    lotGridCol: {
        flex: 1
    },
    lotLabel: {
        fontSize: 10,
        color: COLORS.textTertiary
    },
    lotValue: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 1
    }
});
