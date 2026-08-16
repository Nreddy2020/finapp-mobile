/**
 * FinancialActionCard (Stage C.8.8)
 * Master Architectural Standard: C8_V1
 * 
 * Renders an individual ranked Next Best Action card with rank badge, category icon,
 * composite score, urgency tag, interactive action buttons, and expandable 4-part narrative.
 * 
 * STRICT INVARIANT: Pure presentation component. Zero financial recalculations.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ShieldAlert, TrendingDown, Flag, Sliders, Percent, RefreshCw, PieChart, Zap, ChevronDown, ChevronUp, Eye, CheckCircle2, X } from 'lucide-react-native';

const CATEGORY_ICONS = {
    EMERGENCY_RUNWAY: ShieldAlert,
    DELEVERAGE_DEBT: TrendingDown,
    GOAL_FUNDING: Flag,
    GLIDEPATH_ADJUST: Sliders,
    TAX_LOSS_HARVEST: Percent,
    REBALANCE_DRIFT: RefreshCw,
    DE_RISK_CONCENTRATION: PieChart,
    DEFAULT: Zap
};

export default function FinancialActionCard({
    actionViewModel,
    narrativeViewModel = null,
    onSeeImpact = null,
    onReview = null,
    onDismiss = null,
    isDismissed = false
}) {
    const [expanded, setExpanded] = useState(false);

    if (!actionViewModel || isDismissed) return null;

    const IconComponent = CATEGORY_ICONS[actionViewModel.actionCategory] || CATEGORY_ICONS.DEFAULT;
    const catTheme = actionViewModel.categoryTheme;
    const urgTheme = actionViewModel.urgencyTheme;

    return (
        <View style={[styles.card, { borderColor: catTheme.border }]}>
            {/* Header: Rank, Category & Urgency */}
            <View style={styles.headerRow}>
                <View style={styles.leftHeader}>
                    <View style={[styles.rankBadge, { backgroundColor: catTheme.color }]}>
                        <Text style={styles.rankText}>{actionViewModel.rankBadge}</Text>
                    </View>
                    <View style={[styles.iconContainer, { backgroundColor: catTheme.bg }]}>
                        <IconComponent size={18} color={catTheme.color} />
                    </View>
                    <Text style={[styles.categoryLabel, { color: catTheme.color }]}>
                        {catTheme.label}
                    </Text>
                </View>

                <View style={[styles.urgencyBadge, { backgroundColor: urgTheme.bg, borderColor: urgTheme.border }]}>
                    <Text style={[styles.urgencyText, { color: urgTheme.color }]}>
                        {urgTheme.label}
                    </Text>
                </View>
            </View>

            {/* Title & Rationale */}
            <Text style={styles.title}>{actionViewModel.title}</Text>
            <Text style={styles.rationale}>{actionViewModel.rationale}</Text>

            {/* Factor Scores Grid */}
            <View style={styles.scoreRow}>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Priority Score</Text>
                    <Text style={[styles.scoreValue, { color: catTheme.color }]}>
                        {actionViewModel.compositeScoreFormatted}/100
                    </Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Urgency</Text>
                    <Text style={styles.scoreSubValue}>{actionViewModel.urgencyScore.toFixed(0)}</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Risk Reduction</Text>
                    <Text style={styles.scoreSubValue}>{actionViewModel.riskReductionScore.toFixed(0)}</Text>
                </View>
                <View style={styles.scoreItem}>
                    <Text style={styles.scoreLabel}>Goal Impact</Text>
                    <Text style={styles.scoreSubValue}>{actionViewModel.goalImpactScore.toFixed(0)}</Text>
                </View>
            </View>

            {/* Expandable 4-Part Narrative Standard */}
            {narrativeViewModel && (
                <View style={styles.narrativeContainer}>
                    <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => setExpanded(!expanded)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.expandButtonText}>
                            {expanded ? 'Hide Decision Evidence' : 'Show 4-Part Decision Evidence'}
                        </Text>
                        {expanded ? <ChevronUp size={16} color="#64748B" /> : <ChevronDown size={16} color="#64748B" />}
                    </TouchableOpacity>

                    {expanded && (
                        <View style={styles.narrativeContent}>
                            {narrativeViewModel.narrativeItems.map((item, idx) => (
                                <View key={idx} style={[styles.narrativeItem, { borderLeftColor: item.theme.color }]}>
                                    <View style={styles.narrativeHeaderRow}>
                                        <View style={[styles.pillarTag, { backgroundColor: item.theme.bg }]}>
                                            <Text style={[styles.pillarTagText, { color: item.theme.color }]}>
                                                {item.header}
                                            </Text>
                                        </View>
                                        <Text style={styles.pillarSubTag}>{item.tag}</Text>
                                    </View>
                                    <Text style={styles.narrativeStatement}>{item.statement}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
                {onSeeImpact && (
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: catTheme.color }]}
                        onPress={() => onSeeImpact(actionViewModel)}
                        activeOpacity={0.8}
                    >
                        <Eye size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                        <Text style={styles.primaryButtonText}>{actionViewModel.primaryActionLabel}</Text>
                    </TouchableOpacity>
                )}

                {onReview && (
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => onReview(actionViewModel)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.secondaryButtonText}>{actionViewModel.secondaryActionLabel}</Text>
                    </TouchableOpacity>
                )}

                {onDismiss && (
                    <TouchableOpacity
                        style={styles.dismissButton}
                        onPress={() => onDismiss(actionViewModel)}
                        activeOpacity={0.7}
                    >
                        <X size={16} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    leftHeader: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    rankBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginRight: 8
    },
    rankText: {
        color: '#FFFFFF',
        fontWeight: '800',
        fontSize: 12
    },
    iconContainer: {
        width: 28,
        height: 28,
        borderRadius: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8
    },
    categoryLabel: {
        fontSize: 13,
        fontWeight: '700'
    },
    urgencyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1
    },
    urgencyText: {
        fontSize: 11,
        fontWeight: '700'
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 6
    },
    rationale: {
        fontSize: 13,
        color: '#475569',
        lineHeight: 18,
        marginBottom: 12
    },
    scoreRow: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 10,
        justifyContent: 'space-between',
        marginBottom: 12
    },
    scoreItem: {
        alignItems: 'center',
        flex: 1
    },
    scoreLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2
    },
    scoreValue: {
        fontSize: 14,
        fontWeight: '800'
    },
    scoreSubValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155'
    },
    narrativeContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 8,
        marginBottom: 12
    },
    expandButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 6
    },
    expandButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569'
    },
    narrativeContent: {
        marginTop: 8,
        gap: 8
    },
    narrativeItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        padding: 8,
        borderLeftWidth: 3
    },
    narrativeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    pillarTag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    pillarTagText: {
        fontSize: 10,
        fontWeight: '800'
    },
    pillarSubTag: {
        fontSize: 10,
        color: '#94A3B8',
        fontWeight: '600'
    },
    narrativeStatement: {
        fontSize: 12,
        color: '#334155',
        lineHeight: 16
    },
    buttonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    primaryButton: {
        flex: 2,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8
    },
    primaryButtonText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700'
    },
    secondaryButton: {
        flex: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#F1F5F9'
    },
    secondaryButtonText: {
        color: '#334155',
        fontSize: 12,
        fontWeight: '600'
    },
    dismissButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 8,
        backgroundColor: '#F8FAFC'
    }
});
