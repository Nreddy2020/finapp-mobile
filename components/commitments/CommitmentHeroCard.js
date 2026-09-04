/**
 * components/commitments/CommitmentHeroCard.js
 * 
 * High-fidelity luxury hero card for Recurring Commitments.
 * Displays normalized monthly liability, visual nature breakdown,
 * 4 key financial metrics, and app mode indicator (Demo/Production).
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Repeat, AlertCircle, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react-native';

export default function CommitmentHeroCard({
    heroMetrics,
    appMode = 'DEMO',
    onToggleMode
}) {
    if (!heroMetrics) return null;

    const {
        monthlyObligationFormatted,
        annualRunRateFormatted,
        overdueTotalFormatted,
        hasOverdue,
        totalActiveCount,
        breakdownPercentages = { expense: 0, debt: 0, investment: 0 }
    } = heroMetrics;

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#4C0519', '#3B0764', '#1E1035']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
            >
                {/* Header Row: Title & Mode Badge */}
                <View style={styles.headerRow}>
                    <View style={styles.titleWrap}>
                        <Repeat size={16} color="#F472B6" />
                        <Text style={styles.cardSubtitle}>TOTAL RECURRING COMMITMENTS</Text>
                    </View>

                    {onToggleMode && (
                        <TouchableOpacity
                            onPress={onToggleMode}
                            style={[
                                styles.modeBadge,
                                appMode === 'DEMO' ? styles.modeBadgeDemo : styles.modeBadgeProd
                            ]}
                            activeOpacity={0.8}
                        >
                            <Sparkles size={11} color={appMode === 'DEMO' ? '#F472B6' : '#34D399'} />
                            <Text style={[
                                styles.modeText,
                                appMode === 'DEMO' ? styles.modeTextDemo : styles.modeTextProd
                            ]}>
                                {appMode === 'DEMO' ? 'DEMO DATA' : 'PRODUCTION'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Main Monthly Liability Headline */}
                <View style={styles.headlineSection}>
                    <Text style={styles.headlineLabel}>Monthly Liability</Text>
                    <Text style={styles.headlineAmount}>{monthlyObligationFormatted}</Text>
                    <Text style={styles.headlineSub}>
                        {totalActiveCount} active commitments scheduled
                    </Text>
                </View>

                {/* Distribution Ratio Bar */}
                <View style={styles.ratioBarContainer}>
                    <View style={styles.ratioBarTrack}>
                        {breakdownPercentages.expense > 0 && (
                            <View style={[styles.ratioBarSegment, {
                                flex: breakdownPercentages.expense,
                                backgroundColor: '#EC4899'
                            }]} />
                        )}
                        {breakdownPercentages.debt > 0 && (
                            <View style={[styles.ratioBarSegment, {
                                flex: breakdownPercentages.debt,
                                backgroundColor: '#8B5CF6'
                            }]} />
                        )}
                        {breakdownPercentages.investment > 0 && (
                            <View style={[styles.ratioBarSegment, {
                                flex: breakdownPercentages.investment,
                                backgroundColor: '#10B981'
                            }]} />
                        )}
                    </View>
                    <View style={styles.ratioLegend}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#EC4899' }]} />
                            <Text style={styles.legendText}>Expenses {breakdownPercentages.expense}%</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#8B5CF6' }]} />
                            <Text style={styles.legendText}>EMIs & Debt {breakdownPercentages.debt}%</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.legendText}>Investments {breakdownPercentages.investment}%</Text>
                        </View>
                    </View>
                </View>

                {/* 4-Metric Grid */}
                <View style={styles.metricGrid}>
                    <View style={styles.metricCell}>
                        <Text style={styles.metricLabel}>Annual Run-rate</Text>
                        <Text style={styles.metricValue}>{annualRunRateFormatted}</Text>
                    </View>

                    <View style={styles.metricCell}>
                        <View style={styles.overdueHeaderRow}>
                            <Text style={styles.metricLabel}>Overdue Arrears</Text>
                            {hasOverdue && <AlertCircle size={12} color="#EF4444" />}
                        </View>
                        <Text style={[styles.metricValue, hasOverdue && styles.metricValueOverdue]}>
                            {overdueTotalFormatted}
                        </Text>
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
        marginVertical: 12,
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(217, 70, 239, 0.25)',
        shadowColor: '#EC4899',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8
    },
    cardGradient: {
        padding: 20
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    titleWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    cardSubtitle: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: '#F472B6'
    },
    modeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 5
    },
    modeBadgeDemo: {
        backgroundColor: 'rgba(244, 114, 182, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(244, 114, 182, 0.3)'
    },
    modeBadgeProd: {
        backgroundColor: 'rgba(52, 211, 153, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(52, 211, 153, 0.3)'
    },
    modeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.6
    },
    modeTextDemo: {
        color: '#F472B6'
    },
    modeTextProd: {
        color: '#34D399'
    },
    headlineSection: {
        marginBottom: 16
    },
    headlineLabel: {
        fontSize: 13,
        color: '#CBD5E1',
        fontWeight: '500',
        marginBottom: 4
    },
    headlineAmount: {
        fontSize: 34,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    headlineSub: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 4
    },
    ratioBarContainer: {
        marginBottom: 16
    },
    ratioBarTrack: {
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        flexDirection: 'row',
        overflow: 'hidden',
        marginBottom: 8
    },
    ratioBarSegment: {
        height: '100%'
    },
    ratioLegend: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4
    },
    legendText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500'
    },
    metricGrid: {
        flexDirection: 'row',
        paddingTop: 14,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'space-between'
    },
    metricCell: {
        flex: 1
    },
    overdueHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    metricLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginBottom: 4,
        fontWeight: '500'
    },
    metricValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#F1F5F9'
    },
    metricValueOverdue: {
        color: '#F87171'
    }
});
