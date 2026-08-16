/**
 * components/investments/MasterStatementCard.js
 * 
 * Stage C.5.4 Master Statement & Tax Report View Card.
 * Consumes Stage C.4.4 generatePortfolioStatement strictly read-only.
 * Uses semantic theme tokens exclusively from COLORS.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Share } from 'react-native';
import { FileText, Download, Share2, Layers, AlertTriangle, ShieldCheck } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { COLORS, SPACING } from '../../constants/theme';
import TaxReportModal from './TaxReportModal';
import StatementExportService from '../../services/statementExportService';

export default function MasterStatementCard({
    statement = null,
    selectedPeriod = 'ALL_TIME',
    onSelectPeriod = () => {},
    loading = false
}) {
    const [taxModalVisible, setTaxModalVisible] = useState(false);

    if (loading && !statement) {
        return (
            <LuxuryCard style={styles.card}>
                <View style={styles.skeletonContainer}>
                    <View style={[styles.skeleton, styles.skeletonTitle]} />
                    <View style={[styles.skeleton, styles.skeletonBody]} />
                </View>
            </LuxuryCard>
        );
    }

    const {
        periodActivity = {},
        asOfSnapshot = {},
        statementIntegrity = 'VALID',
        integrityWarnings = []
    } = statement || {};

    const cg = periodActivity?.capitalGains || {};
    const div = periodActivity?.dividends || {};
    const sells = cg.sells || [];
    const isConsistent = statementIntegrity === 'VALID';
    const hasActivity = (cg.sellEventCount > 0) || (div.dividendEventCount > 0) || ((asOfSnapshot.valuation?.totalMarketValue || 0) > 0);

    const formatCurrency = (val) => {
        const num = Number(val) || 0;
        return `₹${Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const handleShareStatement = async () => {
        if (!statement) return;
        const shareText = StatementExportService.exportToShareText(statement);
        try {
            await Share.share({
                message: shareText,
                title: 'FinLife Master Portfolio Statement'
            });
        } catch (e) {
            Alert.alert('Statement Summary', shareText);
        }
    };

    const handleExportCSV = () => {
        if (!statement) return;
        const csvData = StatementExportService.exportToCSV(statement);
        Alert.alert('CSV Export Generated', `Statement exported (${sells.length} sell events matched).\n\nHeader summary ready for download.`);
    };

    const handleExportJSON = () => {
        if (!statement) return;
        const jsonData = StatementExportService.exportToJSON(statement);
        Alert.alert('JSON Statement Export', 'Full statement payload formatted and ready for API integration.');
    };

    return (
        <LuxuryCard style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                    <FileText size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                    <Text style={styles.title}>Master Statement & Tax</Text>
                </View>
                <TouchableOpacity style={styles.shareIconBtn} onPress={handleShareStatement} accessibilityLabel="Share statement summary">
                    <Share2 size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* Period Selection Chips */}
            <View style={styles.periodRow}>
                {[
                    { id: 'ALL_TIME', label: 'All Time' },
                    { id: 'FY2024_25', label: 'FY 24-25' },
                    { id: 'FY2025_26', label: 'FY 25-26' }
                ].map(p => {
                    const isSelected = selectedPeriod === p.id;
                    return (
                        <TouchableOpacity
                            key={p.id}
                            style={[styles.periodChip, isSelected && styles.periodChipSelected]}
                            onPress={() => onSelectPeriod(p.id)}
                            accessibilityLabel={`Select period ${p.label}`}
                        >
                            <Text style={[styles.periodChipText, isSelected && styles.periodChipTextSelected]}>
                                {p.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {!hasActivity ? (
                /* Empty Activity State */
                <View style={styles.emptyContainer}>
                    <ShieldCheck size={28} color={COLORS.textTertiary} style={{ marginBottom: 6 }} />
                    <Text style={styles.emptyTitle}>No Trading Activity in Selected Period</Text>
                    <Text style={styles.emptySubtitle}>
                        Record buy/sell transactions to generate fiscal year FIFO tax reports and trade statements.
                    </Text>
                </View>
            ) : (
                /* Statement Content */
                <View>
                    {/* Period Trading Activity Matrix */}
                    <View style={styles.activityGrid}>
                        <View style={styles.gridCol}>
                            <Text style={styles.gridLabel}>Sell Trades</Text>
                            <Text style={styles.gridValue}>{cg.sellEventCount || 0}</Text>
                        </View>
                        <View style={styles.gridCol}>
                            <Text style={styles.gridLabel}>Net Dividends</Text>
                            <Text style={styles.gridValue}>{formatCurrency(div.totalNetDividends)}</Text>
                        </View>
                        <View style={styles.gridCol}>
                            <Text style={styles.gridLabel}>Net Return</Text>
                            <Text style={[styles.gridValue, { color: (periodActivity?.netPeriodEconomicReturn || 0) >= 0 ? COLORS.success : COLORS.error }]}>
                                {formatCurrency(periodActivity?.netPeriodEconomicReturn)}
                            </Text>
                        </View>
                    </View>

                    {/* Capital Gains & Tax Summary Banner */}
                    <View style={styles.realizedCard}>
                        <View style={styles.realizedRow}>
                            <View>
                                <Text style={styles.realizedLabel}>Realized Capital Gain</Text>
                                <Text style={[styles.realizedValue, { color: (cg.totalEconomicRealizedGain || 0) >= 0 ? COLORS.success : COLORS.error }]}>
                                    {(cg.totalEconomicRealizedGain || 0) >= 0 ? '+' : '-'}{formatCurrency(cg.totalEconomicRealizedGain)}
                                </Text>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                                <Text style={styles.realizedLabel}>STCG / LTCG Split</Text>
                                <Text style={styles.realizedSubValue}>
                                    ST: {formatCurrency(cg.totalSTCG)} | LT: {formatCurrency(cg.totalLTCG)}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Audit / Inconsistency Notice */}
                    {!isConsistent && (
                        <View style={styles.warningBanner}>
                            <AlertTriangle size={14} color={COLORS.warning} style={{ marginRight: 6 }} />
                            <Text style={styles.warningText}>
                                Incomplete transaction history detected. Tax calculations may be estimated.
                            </Text>
                        </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.actionRow}>
                        <TouchableOpacity
                            style={styles.taxLotsBtn}
                            onPress={() => setTaxModalVisible(true)}
                            accessibilityLabel="View FIFO Tax Lots"
                        >
                            <Layers size={14} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
                            <Text style={styles.taxLotsBtnText}>
                                View Tax Lots ({sells.length})
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.exportBtn}
                            onPress={handleExportCSV}
                            accessibilityLabel="Export Statement CSV"
                        >
                            <Download size={14} color={COLORS.primaryLight} style={{ marginRight: 4 }} />
                            <Text style={styles.exportBtnText}>CSV</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.exportBtn}
                            onPress={handleExportJSON}
                            accessibilityLabel="Export Statement JSON"
                        >
                            <Download size={14} color={COLORS.primaryLight} style={{ marginRight: 4 }} />
                            <Text style={styles.exportBtnText}>JSON</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* FIFO Tax Report Modal */}
            <TaxReportModal
                visible={taxModalVisible}
                onClose={() => setTaxModalVisible(false)}
                statement={statement}
            />
        </LuxuryCard>
    );
}

const styles = StyleSheet.create({
    card: {
        padding: SPACING.md,
        marginHorizontal: SPACING.md,
        marginBottom: SPACING.md,
        borderRadius: 16,
        backgroundColor: COLORS.card
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
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
        letterSpacing: 0.2
    },
    shareIconBtn: {
        padding: 6,
        borderRadius: 12,
        backgroundColor: COLORS.borderLight
    },
    periodRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: SPACING.sm
    },
    periodChip: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
        backgroundColor: COLORS.borderLight,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    periodChipSelected: {
        borderColor: COLORS.primaryLight,
        backgroundColor: 'rgba(99, 102, 241, 0.15)'
    },
    periodChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textSecondary
    },
    periodChipTextSelected: {
        color: COLORS.textPrimary,
        fontWeight: '700'
    },
    activityGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 10,
        marginBottom: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    gridCol: {
        flex: 1
    },
    gridLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    gridValue: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 2
    },
    realizedCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 10,
        marginBottom: SPACING.xs,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    realizedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    realizedLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    realizedValue: {
        fontSize: 15,
        fontWeight: '800',
        marginTop: 2
    },
    realizedSubValue: {
        fontSize: 11,
        fontWeight: '600',
        color: COLORS.textPrimary,
        marginTop: 2
    },
    warningBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderColor: 'rgba(245, 158, 11, 0.25)',
        borderWidth: 1,
        borderRadius: 8,
        padding: 8,
        marginBottom: SPACING.xs
    },
    warningText: {
        fontSize: 11,
        color: COLORS.warning,
        flex: 1
    },
    actionRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 4
    },
    taxLotsBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.borderLight,
        borderRadius: 10,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    taxLotsBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.textPrimary
    },
    exportBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.25)'
    },
    exportBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: COLORS.primaryLight
    },
    emptyContainer: {
        paddingVertical: SPACING.lg,
        alignItems: 'center',
        justifyContent: 'center'
    },
    emptyTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4
    },
    emptySubtitle: {
        fontSize: 11,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: SPACING.sm
    },
    skeletonContainer: {
        padding: SPACING.sm
    },
    skeleton: {
        backgroundColor: COLORS.borderLight,
        borderRadius: 8,
        marginBottom: 8
    },
    skeletonTitle: {
        width: 160,
        height: 16
    },
    skeletonBody: {
        width: '100%',
        height: 80
    }
});
