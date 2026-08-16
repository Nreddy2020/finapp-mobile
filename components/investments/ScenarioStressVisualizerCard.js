/**
 * ScenarioStressVisualizerCard (Stage C.7.8)
 * 
 * Displays interactive scenario stress simulations (2008 GFC, COVID-19,
 * Macro Stagflation, Tech Drawdowns, etc.), projected dollar loss,
 * asset-class loss attribution, post-stress runway compression,
 * and reverse stress resilience multiplier.
 * 
 * STRICT INVARIANT: Pure presentation component. Zero financial recalculations.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function ScenarioStressVisualizerCard({ viewModel, onSelectScenario }) {
    if (!viewModel || !viewModel.hasData) return null;

    const {
        availableScenarios = [],
        activeScenarioId,
        activeScenarioData,
        reverseStress
    } = viewModel;

    const [selectedTab, setSelectedTab] = useState(activeScenarioId || availableScenarios[0]?.id);

    const handleSelect = (id) => {
        setSelectedTab(id);
        if (onSelectScenario) {
            onSelectScenario(id);
        }
    };

    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Scenario Stress Explorer</Text>
                <Text style={styles.cardSubtitle}>Multi-Factor Macro & Market Shocks</Text>
            </View>

            {/* Horizontal Scenario Pill Selector */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.pillsScrollContainer}
            >
                {availableScenarios.map((sc) => {
                    const isSelected = sc.id === selectedTab;
                    return (
                        <TouchableOpacity
                            key={sc.id}
                            onPress={() => handleSelect(sc.id)}
                            style={[styles.pillButton, isSelected && styles.pillButtonActive]}
                        >
                            <Text style={[styles.pillText, isSelected && styles.pillTextActive]}>
                                {sc.name.replace(' (Proxy)', '')}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Active Scenario Impact Summary */}
            {activeScenarioData && (
                <View style={styles.scenarioDetailsContainer}>
                    <View style={styles.scenarioHeaderRow}>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.categoryText}>{activeScenarioData.category}</Text>
                        </View>
                        <View style={[
                            styles.resilienceBadge,
                            activeScenarioData.resilienceRating === 'CRITICAL' ? styles.bgCritical : styles.bgModerate
                        ]}>
                            <Text style={[
                                styles.resilienceText,
                                activeScenarioData.resilienceRating === 'CRITICAL' ? styles.textCritical : styles.textModerate
                            ]}>
                                {activeScenarioData.resilienceRating} RESILIENCE
                            </Text>
                        </View>
                    </View>

                    {/* Loss & Value Metrics */}
                    <View style={styles.metricsGrid}>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Projected Loss</Text>
                            <Text style={styles.metricValueRed}>{activeScenarioData.dollarLossFormatted}</Text>
                            <Text style={styles.metricSubtext}>({activeScenarioData.percentageLossFormatted})</Text>
                        </View>
                        <View style={styles.metricBox}>
                            <Text style={styles.metricLabel}>Stressed Portfolio</Text>
                            <Text style={styles.metricValue}>{activeScenarioData.stressedValueFormatted}</Text>
                            <Text style={styles.metricSubtext}>Post-Stress Value</Text>
                        </View>
                    </View>

                    {/* Post-Stress Runway Compression */}
                    <View style={styles.runwayBox}>
                        <Text style={styles.runwayLabel}>Post-Stress Emergency Runway:</Text>
                        <Text style={styles.runwayValue}>{activeScenarioData.postStressRunwayFormatted}</Text>
                        <Text style={styles.compressionText}>({activeScenarioData.runwayCompressionFormatted})</Text>
                    </View>

                    {/* Asset Class Loss Attribution Breakdown */}
                    {activeScenarioData.lossAttribution && activeScenarioData.lossAttribution.length > 0 && (
                        <View style={styles.lossAttrContainer}>
                            <Text style={styles.lossAttrTitle}>Loss Contribution by Asset Class</Text>
                            {activeScenarioData.lossAttribution.map((attr, idx) => (
                                <View key={idx} style={styles.attrRow}>
                                    <Text style={styles.attrClassText}>{attr.assetClass}</Text>
                                    <Text style={styles.attrLossText}>{attr.dollarLossFormatted}</Text>
                                    <View style={styles.attrShareBadge}>
                                        <Text style={styles.attrShareText}>{attr.sharePercentFormatted}</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

            {/* Reverse Stress Testing Box */}
            {reverseStress && (
                <View style={styles.reverseStressBox}>
                    <View style={styles.revHeaderRow}>
                        <Text style={styles.revIcon}>🎯</Text>
                        <Text style={styles.revTitle}>Reverse Stress Testing</Text>
                    </View>
                    <Text style={styles.revText}>
                        Market Drop to Trigger 20% Loss: <Text style={styles.revHighlight}>{reverseStress.lambda20Text}</Text>
                    </Text>
                    <Text style={styles.revSubtext}>
                        Critical Vulnerability: {reverseStress.criticalVulnerability}
                    </Text>
                </View>
            )}
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
    cardHeader: {
        marginBottom: 12
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    cardSubtitle: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2
    },
    pillsScrollContainer: {
        paddingVertical: 4,
        gap: 8,
        marginBottom: 16
    },
    pillButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F1F5F9'
    },
    pillButtonActive: {
        backgroundColor: '#0F172A'
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569'
    },
    pillTextActive: {
        color: '#FFFFFF'
    },
    scenarioDetailsContainer: {
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 14
    },
    scenarioHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    categoryBadge: {
        backgroundColor: '#E2E8F0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    categoryText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#334155'
    },
    resilienceBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    bgCritical: { backgroundColor: '#FEE2E2' },
    bgModerate: { backgroundColor: '#FEF3C7' },
    resilienceText: {
        fontSize: 10,
        fontWeight: '800'
    },
    textCritical: { color: '#991B1B' },
    textModerate: { color: '#92400E' },
    metricsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12
    },
    metricBox: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    metricLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600'
    },
    metricValueRed: {
        fontSize: 16,
        fontWeight: '800',
        color: '#DC2626',
        marginTop: 2
    },
    metricValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0F172A',
        marginTop: 2
    },
    metricSubtext: {
        fontSize: 10,
        color: '#94A3B8',
        marginTop: 1
    },
    runwayBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginBottom: 12
    },
    runwayLabel: {
        fontSize: 11,
        color: '#475569',
        fontWeight: '600'
    },
    runwayValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#0F172A'
    },
    compressionText: {
        fontSize: 11,
        color: '#DC2626',
        fontWeight: '600'
    },
    lossAttrContainer: {
        marginTop: 4
    },
    lossAttrTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 6
    },
    attrRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
        borderBottomWidth: 1,
        borderBottomColor: '#EDF2F7'
    },
    attrClassText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569'
    },
    attrLossText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#DC2626'
    },
    attrShareBadge: {
        backgroundColor: '#FEE2E2',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4
    },
    attrShareText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#991B1B'
    },
    reverseStressBox: {
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#DBEAFE'
    },
    revHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4
    },
    revIcon: {
        fontSize: 14
    },
    revTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#1E40AF'
    },
    revText: {
        fontSize: 12,
        color: '#1E3A8A'
    },
    revHighlight: {
        fontWeight: '700',
        color: '#1D4ED8'
    },
    revSubtext: {
        fontSize: 11,
        color: '#3B82F6',
        marginTop: 2
    }
});
