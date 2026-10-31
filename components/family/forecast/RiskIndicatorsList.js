import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AlertCircle, AlertTriangle, Info, Clock, Flame, UserCheck, ShieldAlert } from 'lucide-react-native';

export default function RiskIndicatorsList({ riskIndicators = [] }) {
    if (!riskIndicators || riskIndicators.length === 0) {
        return (
            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.sectionTitle}>Risk & Stress Indicators</Text>
                    <View style={styles.safeBadge}>
                        <Text style={styles.safeBadgeText}>CLEAR</Text>
                    </View>
                </View>
                <View style={styles.emptyContainer}>
                    <ShieldAlert size={24} color="#10B981" style={{ marginBottom: 6 }} />
                    <Text style={styles.emptyTitle}>No Projected Cash-Flow Risks</Text>
                    <Text style={styles.emptySubtitle}>
                        Inflows adequately cover prorated pools and commitment schedules across the evaluated horizon.
                    </Text>
                </View>
            </View>
        );
    }

    const getSeverityMeta = (sev) => {
        switch (sev) {
            case 'HIGH':
                return { bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: '#EF4444', icon: Flame };
            case 'MEDIUM':
                return { bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: '#F59E0B', icon: AlertTriangle };
            case 'LOW':
                return { bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: '#3B82F6', icon: AlertCircle };
            default:
                return { bg: 'rgba(139, 92, 246, 0.15)', text: '#A78BFA', border: '#8B5CF6', icon: Info };
        }
    };

    return (
        <View style={styles.card}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.sectionBadge}>PREDICTIVE STRESS ANALYSIS</Text>
                    <Text style={styles.sectionTitle}>Risk & Stress Indicators</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{riskIndicators.length}</Text>
                    <Text style={styles.countLabel}>ACTIVE</Text>
                </View>
            </View>

            <View style={styles.list}>
                {riskIndicators.map((risk, index) => {
                    const meta = getSeverityMeta(risk.severity);
                    const IconComp = meta.icon;

                    return (
                        <View key={`${risk.riskType}_${index}`} style={[styles.riskItem, { borderColor: meta.border }]}>
                            <View style={styles.riskTopRow}>
                                <View style={styles.riskTitleContainer}>
                                    <IconComp size={16} color={meta.text} style={{ marginRight: 6 }} />
                                    <Text style={styles.riskType}>{risk.riskType.replace(/_/g, ' ')}</Text>
                                </View>
                                <View style={[styles.severityPill, { backgroundColor: meta.bg, borderColor: meta.border }]}>
                                    <Text style={[styles.severityText, { color: meta.text }]}>{risk.severity}</Text>
                                </View>
                            </View>

                            <Text style={styles.riskDesc}>{risk.description}</Text>

                            {/* Contextual Metric Details */}
                            {risk.deficitAmount !== undefined && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Deficit Amount:</Text>
                                    <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                                        ₹{risk.deficitAmount.toLocaleString()}
                                    </Text>
                                </View>
                            )}

                            {risk.depletionDay !== undefined && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Pace Depletion Day:</Text>
                                    <Text style={[styles.detailValue, { color: '#F59E0B' }]}>
                                        Day {risk.depletionDay} of month
                                    </Text>
                                </View>
                            )}

                            {risk.occurrenceCount !== undefined && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Clustering Density:</Text>
                                    <Text style={styles.detailValue}>
                                        {risk.occurrenceCount} commitments in 72h window
                                    </Text>
                                </View>
                            )}

                            {risk.incomePercentage !== undefined && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Income Dependency:</Text>
                                    <Text style={[styles.detailValue, { color: '#3B82F6' }]}>
                                        {risk.incomePercentage}% by single earner
                                    </Text>
                                </View>
                            )}

                            {risk.missingFactors && risk.missingFactors.length > 0 && (
                                <View style={styles.missingTagsRow}>
                                    {risk.missingFactors.map((f, fi) => (
                                        <View key={fi} style={styles.miniTag}>
                                            <Text style={styles.miniTagText}>{f.replace(/_/g, ' ')}</Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    );
                })}
            </View>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14
    },
    sectionBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#F59E0B',
        letterSpacing: 1,
        marginBottom: 2
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    countBadge: {
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)'
    },
    countText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#EF4444'
    },
    countLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#EF4444'
    },
    safeBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#10B981'
    },
    safeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#10B981'
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12
    },
    emptyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4
    },
    emptySubtitle: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        lineHeight: 16
    },
    list: {
        gap: 10
    },
    riskItem: {
        backgroundColor: '#252532',
        borderRadius: 12,
        padding: 12,
        borderLeftWidth: 4,
        borderWidth: 1,
        borderColor: '#374151'
    },
    riskTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    riskTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1
    },
    riskType: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F3F4F6',
        textTransform: 'capitalize'
    },
    severityPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1
    },
    severityText: {
        fontSize: 10,
        fontWeight: '800'
    },
    riskDesc: {
        fontSize: 12,
        color: '#D1D5DB',
        lineHeight: 16,
        marginBottom: 6
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 3,
        borderTopWidth: 1,
        borderTopColor: '#374151',
        marginTop: 2
    },
    detailLabel: {
        fontSize: 11,
        color: '#9CA3AF'
    },
    detailValue: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F3F4F6'
    },
    missingTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 6
    },
    miniTag: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)'
    },
    miniTagText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#C4B5FD'
    }
});
