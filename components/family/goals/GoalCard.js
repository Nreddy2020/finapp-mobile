import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Target, CheckCircle2, AlertCircle, Clock, TrendingUp, Calendar, ChevronRight, Award } from 'lucide-react-native';

export default function GoalCard({ goalWithEval, onPress, onSimulate }) {
    if (!goalWithEval) return null;
    const { goal, evaluation } = goalWithEval;

    const formatCurrency = (amount, curr = 'INR') => {
        if (typeof amount !== 'number') return '—';
        const sym = curr === 'INR' ? '₹' : (curr === 'USD' ? '$' : (curr === 'EUR' ? '€' : `${curr} `));
        return `${sym}${amount.toLocaleString()}`;
    };

    const getHealthBadge = (health) => {
        switch (health) {
            case 'COMPLETED':
                return { label: 'COMPLETED', bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: '#10B981' };
            case 'AHEAD':
                return { label: 'AHEAD', bg: 'rgba(59, 130, 246, 0.15)', text: '#3B82F6', border: '#3B82F6' };
            case 'ON_TRACK':
                return { label: 'ON TRACK', bg: 'rgba(16, 185, 129, 0.15)', text: '#10B981', border: '#10B981' };
            case 'BEHIND':
                return { label: 'BEHIND', bg: 'rgba(245, 158, 11, 0.15)', text: '#F59E0B', border: '#F59E0B' };
            case 'AT_RISK':
                return { label: 'AT RISK', bg: 'rgba(239, 68, 68, 0.15)', text: '#EF4444', border: '#EF4444' };
            case 'PAST_DUE':
                return { label: 'PAST DUE', bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', border: '#EF4444' };
            default:
                return { label: 'NO PACE', bg: 'rgba(156, 163, 175, 0.15)', text: '#9CA3AF', border: '#9CA3AF' };
        }
    };

    const healthStyle = getHealthBadge(evaluation.paceHealth);
    const progress = evaluation.progressPercentage || 0;

    return (
        <View style={styles.card}>
            {/* Header: Category, Priority, Health Badge */}
            <View style={styles.headerRow}>
                <View style={styles.titleArea}>
                    <View style={styles.badgeRow}>
                        <Text style={styles.categoryBadge}>{goal.category}</Text>
                        <Text style={[styles.priorityBadge, goal.priority === 'CRITICAL' && styles.criticalBadge]}>
                            {goal.priority}
                        </Text>
                    </View>
                    <Text style={styles.title}>{goal.title}</Text>
                </View>
                <View style={[styles.healthBadge, { backgroundColor: healthStyle.bg, borderColor: healthStyle.border }]}>
                    <Text style={[styles.healthBadgeText, { color: healthStyle.text }]}>{healthStyle.label}</Text>
                </View>
            </View>

            {/* Target vs Accumulated */}
            <View style={styles.amountRow}>
                <View>
                    <Text style={styles.label}>ACCUMULATED</Text>
                    <Text style={styles.accumulatedAmount}>{formatCurrency(evaluation.effectiveAccumulatedAmount, goal.currency)}</Text>
                </View>
                <View style={styles.targetCol}>
                    <Text style={styles.label}>TARGET</Text>
                    <Text style={styles.targetAmount}>{formatCurrency(goal.targetAmount, goal.currency)}</Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBarFill, { width: `${Math.min(100, Math.max(3, progress))}%` }]} />
            </View>
            <View style={styles.progressLabelRow}>
                <Text style={styles.progressPercentText}>{progress}% funded</Text>
                <Text style={styles.remainingText}>{formatCurrency(evaluation.remainingTargetAmount, goal.currency)} to go</Text>
            </View>

            {/* Pacing & ETA Details */}
            <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Required Pace</Text>
                    <Text style={styles.metricValue}>{formatCurrency(evaluation.requiredMonthlyPace, goal.currency)}/mo</Text>
                </View>
                <View style={styles.metricItem}>
                    <Text style={styles.metricLabel}>Effective Pace</Text>
                    <Text style={styles.metricValue}>{formatCurrency(evaluation.effectiveMonthlyPace, goal.currency)}/mo</Text>
                </View>
            </View>

            {/* Projected ETA Banner */}
            <View style={styles.etaBanner}>
                <Calendar size={14} color="#38BDF8" />
                <Text style={styles.etaText}>{evaluation.etaLabel}</Text>
            </View>

            {/* Milestones count preview */}
            {Array.isArray(evaluation.milestones) && evaluation.milestones.length > 0 && (
                <View style={styles.milestonesPreview}>
                    <Award size={13} color="#A78BFA" />
                    <Text style={styles.milestonesText}>
                        {evaluation.milestones.filter(m => m.status === 'REACHED').length} of {evaluation.milestones.length} milestones reached
                    </Text>
                </View>
            )}

            {/* Actions */}
            {onSimulate && (
                <TouchableOpacity style={styles.simulateButton} onPress={() => onSimulate(goalWithEval)}>
                    <TrendingUp size={14} color="#38BDF8" />
                    <Text style={styles.simulateButtonText}>Simulate "What-If" Scenario</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#232330',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#334155'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    titleArea: {
        flex: 1,
        marginRight: 8
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    categoryBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
        backgroundColor: 'rgba(148, 163, 184, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    priorityBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#38BDF8',
        letterSpacing: 0.5,
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    criticalBadge: {
        color: '#EF4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)'
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    healthBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1
    },
    healthBadgeText: {
        fontSize: 11,
        fontWeight: '700'
    },
    amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        color: '#64748B',
        marginBottom: 2
    },
    accumulatedAmount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#10B981'
    },
    targetCol: {
        alignItems: 'flex-end'
    },
    targetAmount: {
        fontSize: 20,
        fontWeight: '800',
        color: '#F8FAFC'
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#334155',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 6
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#10B981',
        borderRadius: 3
    },
    progressLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12
    },
    progressPercentText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8'
    },
    remainingText: {
        fontSize: 11,
        color: '#64748B'
    },
    metricsGrid: {
        flexDirection: 'row',
        backgroundColor: '#121219',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10
    },
    metricItem: {
        flex: 1
    },
    metricLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2
    },
    metricValue: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F1F5F9'
    },
    etaBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(56, 189, 248, 0.08)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        marginBottom: 8
    },
    etaText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#38BDF8'
    },
    milestonesPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8
    },
    milestonesText: {
        fontSize: 11,
        color: '#C4B5FD'
    },
    simulateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        paddingVertical: 8,
        borderRadius: 8,
        gap: 6,
        marginTop: 4
    },
    simulateButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#38BDF8'
    }
});
