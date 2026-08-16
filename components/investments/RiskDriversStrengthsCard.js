/**
 * RiskDriversStrengthsCard (Stage C.7.8)
 * 
 * Displays ranked primary risk drivers (deficit model #1, #2, #3)
 * alongside key portfolio strengths (dimensions >= 80/100) with
 * factual, objective explanations synthesized from C.7.7 DTO.
 * 
 * STRICT INVARIANT: Pure presentation component. Zero financial recalculations.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function RiskDriversStrengthsCard({ viewModel }) {
    if (!viewModel) return null;

    const { hasDrivers, riskDrivers = [], hasStrengths, strengths = [] } = viewModel;

    return (
        <View style={styles.cardContainer}>
            {/* Primary Risk Drivers Section */}
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Primary Risk Drivers</Text>
                    <Text style={styles.sectionSubtitle}>Ranked by Weighted Score Deficit</Text>
                </View>

                {hasDrivers ? (
                    riskDrivers.map((driver) => (
                        <View key={driver.dimensionId} style={styles.driverCard}>
                            <View style={styles.driverTopRow}>
                                <View style={styles.rankBadge}>
                                    <Text style={styles.rankText}>#{driver.rank}</Text>
                                </View>
                                <Text style={styles.driverName}>{driver.dimensionName}</Text>
                                <View style={styles.deficitBadge}>
                                    <Text style={styles.deficitText}>{driver.deficitPointsFormatted}</Text>
                                </View>
                            </View>
                            <Text style={styles.explanationText}>{driver.explanationText}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No critical vulnerabilities detected.</Text>
                    </View>
                )}
            </View>

            {/* Key Portfolio Strengths Section */}
            <View style={[styles.sectionContainer, styles.strengthsDivider]}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Key Portfolio Strengths</Text>
                    <Text style={styles.sectionSubtitle}>Resilient Pillars (Score ≥ 80)</Text>
                </View>

                {hasStrengths ? (
                    strengths.map((s) => (
                        <View key={s.dimensionId} style={styles.strengthCard}>
                            <View style={styles.strengthTopRow}>
                                <Text style={styles.strengthIcon}>🛡️</Text>
                                <Text style={styles.strengthName}>{s.dimensionName}</Text>
                                <View style={styles.strengthScoreBadge}>
                                    <Text style={styles.strengthScoreText}>{s.scoreFormatted}</Text>
                                </View>
                            </View>
                            <Text style={styles.strengthExplanationText}>{s.strengthText}</Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No dimensions currently meet the strength threshold (≥ 80).</Text>
                    </View>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 16,
        marginTop: 16,
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9'
    },
    sectionContainer: {
        marginBottom: 16
    },
    strengthsDivider: {
        marginTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        paddingTop: 16,
        marginBottom: 0
    },
    sectionHeader: {
        marginBottom: 12
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    sectionSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2
    },
    driverCard: {
        backgroundColor: '#FFF7ED',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#FFEDD5'
    },
    driverTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6
    },
    rankBadge: {
        backgroundColor: '#EA580C',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    rankText: {
        color: '#FFFFFF',
        fontSize: 10,
        fontWeight: '800'
    },
    driverName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#9A3412'
    },
    deficitBadge: {
        backgroundColor: '#FFEDD5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    deficitText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#C2410C'
    },
    explanationText: {
        fontSize: 12,
        color: '#7C2D12',
        lineHeight: 16
    },
    strengthCard: {
        backgroundColor: '#F0FDF4',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#DCFCE7'
    },
    strengthTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6
    },
    strengthIcon: {
        fontSize: 14
    },
    strengthName: {
        flex: 1,
        fontSize: 13,
        fontWeight: '700',
        color: '#166534'
    },
    strengthScoreBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    strengthScoreText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#15803D'
    },
    strengthExplanationText: {
        fontSize: 12,
        color: '#14532D',
        lineHeight: 16
    },
    emptyCard: {
        padding: 12,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    emptyText: {
        fontSize: 12,
        color: '#64748B',
        fontStyle: 'italic'
    }
});
