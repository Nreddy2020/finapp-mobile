/**
 * GoalSolvencyListCard (Stage C.8.8)
 * Master Architectural Standard: C8_V1
 * 
 * Displays goal progress bars, funded ratios, status badges (OVERFUNDED, FULLY_FUNDED,
 * ON_TRACK, AT_RISK, UNDERFUNDED), funding gaps, required SIPs, and glidepath sequence risk alerts.
 * 
 * STRICT INVARIANT: Pure presentation component. Zero financial recalculations.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flag, AlertTriangle, CheckCircle2, TrendingUp, AlertOctagon, Clock, XCircle, ShieldAlert } from 'lucide-react-native';

const STATUS_ICONS = {
    OVERFUNDED: CheckCircle2,
    FULLY_FUNDED: CheckCircle2,
    ON_TRACK: TrendingUp,
    AT_RISK: AlertTriangle,
    UNDERFUNDED: AlertOctagon,
    NOT_STARTED: Clock,
    PAST_DUE: XCircle
};

export default function GoalSolvencyListCard({
    goalsOverview = null,
    onSelectGoal = null
}) {
    if (!goalsOverview) return null;

    if (goalsOverview.status === 'NO_GOALS' || !goalsOverview.goals || goalsOverview.goals.length === 0) {
        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Flag size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                    <Text style={styles.cardTitle}>Goal Solvency & Glidepaths</Text>
                </View>
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No financial planning goals linked.</Text>
                    <Text style={styles.emptySubText}>Add goals to unlock target-date glidepaths and solvency simulations.</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.card}>
            {/* Header with Summary Stats */}
            <View style={styles.cardHeader}>
                <View style={styles.headerTitleRow}>
                    <Flag size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                    <Text style={styles.cardTitle}>Goal Planning & Solvency</Text>
                </View>
                <View style={styles.scorePill}>
                    <Text style={styles.scorePillText}>Solvency: {goalsOverview.overallSolvencyScoreFormatted}%</Text>
                </View>
            </View>

            {/* Summary Count Row */}
            <View style={styles.summaryStatsRow}>
                <View style={styles.summaryStatItem}>
                    <Text style={styles.statLabel}>Total Goals</Text>
                    <Text style={styles.statValue}>{goalsOverview.totalGoalsCount}</Text>
                </View>
                <View style={styles.summaryStatItem}>
                    <Text style={styles.statLabel}>On Track</Text>
                    <Text style={[styles.statValue, { color: '#10B981' }]}>{goalsOverview.onTrackCount}</Text>
                </View>
                <View style={styles.summaryStatItem}>
                    <Text style={styles.statLabel}>At Risk / Gap</Text>
                    <Text style={[styles.statValue, { color: '#EF4444' }]}>{goalsOverview.underfundedCount + goalsOverview.atRiskCount}</Text>
                </View>
                <View style={styles.summaryStatItem}>
                    <Text style={styles.statLabel}>Total Gap</Text>
                    <Text style={styles.statValue}>{goalsOverview.totalFundingGapCompact}</Text>
                </View>
            </View>

            {/* Goals List */}
            <View style={styles.goalsList}>
                {goalsOverview.goals.map((goal, idx) => {
                    const theme = goal.statusTheme;
                    const StatusIcon = STATUS_ICONS[goal.fundingStatus] || AlertTriangle;

                    return (
                        <View key={goal.goalId || idx} style={styles.goalItem}>
                            {/* Top row: Name, Category & Status Pill */}
                            <View style={styles.goalTopRow}>
                                <View style={styles.goalNameBox}>
                                    <Text style={styles.goalName}>{goal.goalName}</Text>
                                    <Text style={styles.goalTargetDate}>Target: {goal.targetDate} ({goal.horizonMonths} mo)</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: theme.bg, borderColor: theme.border }]}>
                                    <StatusIcon size={12} color={theme.color} style={{ marginRight: 4 }} />
                                    <Text style={[styles.statusText, { color: theme.color }]}>{goal.statusLabel}</Text>
                                </View>
                            </View>

                            {/* Progress Bar */}
                            <View style={styles.progressContainer}>
                                <View style={styles.progressBarBackground}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${Math.min(goal.progressPercent, 100)}%`,
                                                backgroundColor: theme.color
                                            }
                                        ]}
                                    />
                                </View>
                                <Text style={[styles.progressRatioText, { color: theme.color }]}>
                                    {goal.progressPercent.toFixed(0)}%
                                </Text>
                            </View>

                            {/* Numbers Breakdown */}
                            <View style={styles.numbersRow}>
                                <Text style={styles.corpusText}>
                                    Corpus: <Text style={styles.boldText}>{goal.currentCorpusFormatted}</Text> / {goal.targetCorpusFutureFormatted}
                                </Text>
                                {goal.hasFundingGap && (
                                    <Text style={styles.gapText}>
                                        Gap: <Text style={[styles.boldText, { color: '#EF4444' }]}>{goal.fundingGapCompact}</Text>
                                    </Text>
                                )}
                            </View>

                            {/* SIP Breakdown */}
                            <View style={styles.sipRow}>
                                <Text style={styles.sipText}>
                                    Current SIP: <Text style={styles.boldText}>{goal.currentSipFormatted}</Text>/mo
                                </Text>
                                {goal.requiredSipFormatted !== '₹0' && (
                                    <Text style={styles.reqSipText}>
                                        Required SIP: <Text style={[styles.boldText, { color: '#1D4ED8' }]}>{goal.requiredSipFormatted}</Text>/mo
                                    </Text>
                                )}
                            </View>

                            {/* Sequence of Returns Risk Alert */}
                            {goal.hasSequenceRisk && (
                                <View style={styles.sequenceRiskCard}>
                                    <ShieldAlert size={14} color="#DC2626" style={{ marginRight: 6 }} />
                                    <Text style={styles.sequenceRiskText}>
                                        {goal.sequenceRiskMessage || 'Sequence-of-returns vulnerability flagged near maturity.'}
                                    </Text>
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
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    scorePill: {
        backgroundColor: '#EFF6FF',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    scorePillText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2563EB'
    },
    summaryStatsRow: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 10,
        justifyContent: 'space-between',
        marginBottom: 14
    },
    summaryStatItem: {
        alignItems: 'center',
        flex: 1
    },
    statLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2
    },
    statValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0F172A'
    },
    goalsList: {
        gap: 12
    },
    goalItem: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    goalTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8
    },
    goalNameBox: {
        flex: 1,
        marginRight: 8
    },
    goalName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A'
    },
    goalTargetDate: {
        fontSize: 11,
        color: '#64748B'
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700'
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8
    },
    progressBarBackground: {
        flex: 1,
        height: 6,
        backgroundColor: '#E2E8F0',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    progressRatioText: {
        fontSize: 11,
        fontWeight: '800',
        minWidth: 32
    },
    numbersRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    corpusText: {
        fontSize: 12,
        color: '#475569'
    },
    gapText: {
        fontSize: 12,
        color: '#475569'
    },
    sipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    sipText: {
        fontSize: 11,
        color: '#64748B'
    },
    reqSipText: {
        fontSize: 11,
        color: '#64748B'
    },
    boldText: {
        fontWeight: '700',
        color: '#0F172A'
    },
    sequenceRiskCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        borderRadius: 6,
        padding: 6,
        marginTop: 6,
        borderWidth: 1,
        borderColor: '#FECACA'
    },
    sequenceRiskText: {
        fontSize: 11,
        color: '#B91C1C',
        flex: 1,
        lineHeight: 14
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 16
    },
    emptyText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 4
    },
    emptySubText: {
        fontSize: 11,
        color: '#94A3B8',
        textAlign: 'center'
    }
});
