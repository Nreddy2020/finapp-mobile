/**
 * components/investments/ConcentrationRiskGauge.js
 * 
 * Stage C.5.2 Concentration Risk Gauges & HHI Diversification Index.
 * Consumes concentration metrics directly from C.4.2 without UI recalculations.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Shield, ShieldAlert, ShieldCheck, AlertCircle } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY, SPACING } from '../../constants/theme';

export default function ConcentrationRiskGauge({ concentration = null }) {
    const {
        top1Percent = 0,
        top3Percent = 0,
        top5Percent = 0,
        hhi = 0,
        riskTier = 'EMPTY'
    } = concentration || {};

    const getTierConfig = (tier) => {
        switch (tier) {
            case 'BALANCED':
                return {
                    label: 'Balanced Risk',
                    color: '#10B981',
                    bgColor: 'rgba(16, 185, 129, 0.15)',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    Icon: ShieldCheck,
                    accessibilityLabel: 'Risk Tier: Balanced. Well diversified portfolio.'
                };
            case 'MODERATE':
                return {
                    label: 'Moderate Risk',
                    color: '#F59E0B',
                    bgColor: 'rgba(245, 158, 11, 0.15)',
                    borderColor: 'rgba(245, 158, 11, 0.3)',
                    Icon: AlertCircle,
                    accessibilityLabel: 'Risk Tier: Moderate concentration risk.'
                };
            case 'HIGH':
                return {
                    label: 'High Concentration',
                    color: '#EF4444',
                    bgColor: 'rgba(239, 68, 68, 0.15)',
                    borderColor: 'rgba(239, 68, 68, 0.3)',
                    Icon: ShieldAlert,
                    accessibilityLabel: 'Risk Tier: High concentration risk.'
                };
            default:
                return {
                    label: 'No Holdings',
                    color: '#94A3B8',
                    bgColor: 'rgba(148, 163, 184, 0.15)',
                    borderColor: 'rgba(148, 163, 184, 0.3)',
                    Icon: Shield,
                    accessibilityLabel: 'Risk Tier: No active holdings.'
                };
        }
    };

    const tierConfig = getTierConfig(riskTier);
    const { Icon, label, color, bgColor, borderColor, accessibilityLabel } = tierConfig;

    return (
        <View style={styles.container}>
            {/* Header: Title & Risk Tier Badge */}
            <View style={styles.headerRow}>
                <Text style={styles.title}>Concentration & Risk</Text>
                <View
                    style={[styles.tierBadge, { backgroundColor: bgColor, borderColor }]}
                    accessible={true}
                    accessibilityRole="text"
                    accessibilityLabel={accessibilityLabel}
                >
                    <Icon size={12} color={color} style={styles.badgeIcon} />
                    <Text style={[styles.tierBadgeText, { color }]}>{label}</Text>
                </View>
            </View>

            {/* HHI Metric Box */}
            <View style={styles.hhiCard}>
                <View style={styles.hhiHeader}>
                    <Text style={styles.hhiLabel}>Herfindahl Index (HHI)</Text>
                    <Text style={styles.hhiValue}>{hhi.toLocaleString()}</Text>
                </View>
                {/* HHI Visual Range Bar (0 - 10000) */}
                <View style={styles.barBackground}>
                    <View
                        style={[
                            styles.barFill,
                            {
                                width: `${Math.min(100, Math.max(0, (hhi / 10000) * 100))}%`,
                                backgroundColor: color
                            }
                        ]}
                    />
                </View>
                <View style={styles.hhiFooter}>
                    <Text style={styles.rangeText}>0 (Perfect)</Text>
                    <Text style={styles.rangeText}>2,500 (Moderate)</Text>
                    <Text style={styles.rangeText}>10,000 (Single Asset)</Text>
                </View>
            </View>

            {/* Top-N Concentration Bars */}
            <View style={styles.topNContainer}>
                {/* Top 1 */}
                <View style={styles.metricRow}>
                    <Text style={styles.metricName}>Top Holding</Text>
                    <View style={styles.progressWrapper}>
                        <View style={styles.barBackground}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: `${Math.min(100, top1Percent)}%`,
                                        backgroundColor: top1Percent > 40 ? '#EF4444' : '#3B82F6'
                                    }
                                ]}
                            />
                        </View>
                    </View>
                    <Text style={styles.percentText}>{top1Percent.toFixed(1)}%</Text>
                </View>

                {/* Top 3 */}
                <View style={styles.metricRow}>
                    <Text style={styles.metricName}>Top 3 Holdings</Text>
                    <View style={styles.progressWrapper}>
                        <View style={styles.barBackground}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: `${Math.min(100, top3Percent)}%`,
                                        backgroundColor: top3Percent > 75 ? '#EF4444' : '#10B981'
                                    }
                                ]}
                            />
                        </View>
                    </View>
                    <Text style={styles.percentText}>{top3Percent.toFixed(1)}%</Text>
                </View>

                {/* Top 5 */}
                <View style={styles.metricRow}>
                    <Text style={styles.metricName}>Top 5 Holdings</Text>
                    <View style={styles.progressWrapper}>
                        <View style={styles.barBackground}>
                            <View
                                style={[
                                    styles.barFill,
                                    {
                                        width: `${Math.min(100, top5Percent)}%`,
                                        backgroundColor: '#6366F1'
                                    }
                                ]}
                            />
                        </View>
                    </View>
                    <Text style={styles.percentText}>{top5Percent.toFixed(1)}%</Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: SPACING.md,
        paddingTop: SPACING.sm
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm
    },
    title: {
        fontSize: TYPOGRAPHY.body || 15,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF'
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.sm,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1
    },
    badgeIcon: {
        marginRight: 4
    },
    tierBadgeText: {
        fontSize: TYPOGRAPHY.caption || 11,
        fontWeight: '700'
    },
    hhiCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: SPACING.sm + 2,
        marginBottom: SPACING.sm,
        borderWidth: 1,
        borderColor: COLORS.border || 'rgba(255,255,255,0.06)'
    },
    hhiHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    hhiLabel: {
        fontSize: TYPOGRAPHY.caption || 11,
        color: COLORS.textSecondary || '#A1A1AA',
        fontWeight: '500'
    },
    hhiValue: {
        fontSize: TYPOGRAPHY.bodySmall || 13,
        fontWeight: '800',
        color: COLORS.textPrimary || '#FFFFFF'
    },
    barBackground: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 3,
        overflow: 'hidden'
    },
    barFill: {
        height: '100%',
        borderRadius: 3
    },
    hhiFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 4
    },
    rangeText: {
        fontSize: 9,
        color: COLORS.textTertiary || '#71717A'
    },
    topNContainer: {
        marginTop: 4
    },
    metricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 4
    },
    metricName: {
        width: 100,
        fontSize: TYPOGRAPHY.caption || 11,
        color: COLORS.textSecondary || '#A1A1AA',
        fontWeight: '500'
    },
    progressWrapper: {
        flex: 1,
        marginHorizontal: SPACING.sm
    },
    percentText: {
        width: 48,
        textAlign: 'right',
        fontSize: TYPOGRAPHY.caption || 11,
        fontWeight: '700',
        color: COLORS.textPrimary || '#FFFFFF'
    }
});
