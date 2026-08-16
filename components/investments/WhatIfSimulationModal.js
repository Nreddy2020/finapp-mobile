/**
 * WhatIfSimulationModal (Stage C.8.8)
 * Master Architectural Standard: C8_V1
 * 
 * Interactive Before vs After simulation visualizer card/modal.
 * Displays authoritative Before vs After impact metrics from Stage C.8.6 without recalculation.
 * 
 * STRICT INVARIANT: Pure presentation component. Zero financial recalculations.
 */

import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowRight, CheckCircle2, TrendingUp, AlertTriangle, X, Shield, Activity, DollarSign, Flag } from 'lucide-react-native';

export default function WhatIfSimulationModal({
    visible = false,
    simulationViewModel = null,
    onClose = null,
    onReviewAction = null
}) {
    if (!simulationViewModel || !visible) return null;

    const ratingTheme = simulationViewModel.impactRatingTheme;
    const health = simulationViewModel.healthScoreComparison;
    const pillar = simulationViewModel.primaryPillarDelta;
    const runway = simulationViewModel.runwayComparison;
    const solvency = simulationViewModel.solvencyComparison;
    const tax = simulationViewModel.taxFriction;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={[styles.ratingBadge, { backgroundColor: ratingTheme.bg, borderColor: ratingTheme.border }]}>
                                <Text style={[styles.ratingText, { color: ratingTheme.color }]}>
                                    {ratingTheme.label}
                                </Text>
                            </View>
                            <Text style={styles.headerTitle}>What-If Impact Preview</Text>
                        </View>
                        {onClose && (
                            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                <X size={20} color="#64748B" />
                            </TouchableOpacity>
                        )}
                    </View>

                    <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                        {/* 1. Health Score Before vs After Hero */}
                        <View style={styles.heroCard}>
                            <Text style={styles.heroLabel}>PROJECTED FINANCIAL HEALTH SHIFT</Text>
                            <View style={styles.heroComparisonRow}>
                                <View style={styles.scoreBox}>
                                    <Text style={styles.scoreBoxLabel}>BEFORE</Text>
                                    <Text style={styles.scoreBoxValue}>{health.beforeFormatted}</Text>
                                </View>

                                <View style={styles.arrowBox}>
                                    <ArrowRight size={22} color="#64748B" />
                                    <View style={[styles.deltaBadge, { backgroundColor: health.isImprovement ? '#ECFDF5' : '#FEF2F2' }]}>
                                        <Text style={[styles.deltaText, { color: health.isImprovement ? '#10B981' : '#EF4444' }]}>
                                            {health.deltaFormatted}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.scoreBox, styles.afterScoreBox]}>
                                    <Text style={styles.scoreBoxLabel}>AFTER</Text>
                                    <Text style={[styles.scoreBoxValue, { color: '#0F172A' }]}>{health.afterFormatted}</Text>
                                </View>
                            </View>
                        </View>

                        {/* 2. Key Metric Impact Grid */}
                        <View style={styles.gridSection}>
                            <Text style={styles.sectionHeader}>MULTI-DIMENSION IMPACT ANALYSIS</Text>

                            {/* Primary Pillar Impact */}
                            <View style={styles.metricRow}>
                                <View style={styles.metricLeft}>
                                    <Activity size={18} color="#6366F1" style={{ marginRight: 8 }} />
                                    <View>
                                        <Text style={styles.metricTitle}>Primary Improvement Pillar</Text>
                                        <Text style={styles.metricSub}>{pillar.pillar}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.metricDelta, { color: '#10B981' }]}>
                                    {pillar.deltaFormatted}
                                </Text>
                            </View>

                            {/* Liquidity Runway */}
                            <View style={styles.metricRow}>
                                <View style={styles.metricLeft}>
                                    <Shield size={18} color="#06B6D4" style={{ marginRight: 8 }} />
                                    <View>
                                        <Text style={styles.metricTitle}>Liquidity Runway</Text>
                                        <Text style={styles.metricSub}>{runway.summary}</Text>
                                    </View>
                                </View>
                                <Text style={styles.metricValue}>
                                    {runway.deltaMonths >= 0 ? `+${runway.deltaMonths.toFixed(1)} mo` : `${runway.deltaMonths.toFixed(1)} mo`}
                                </Text>
                            </View>

                            {/* Goal Solvency */}
                            <View style={styles.metricRow}>
                                <View style={styles.metricLeft}>
                                    <Flag size={18} color="#3B82F6" style={{ marginRight: 8 }} />
                                    <View>
                                        <Text style={styles.metricTitle}>Goal Solvency Index</Text>
                                        <Text style={styles.metricSub}>{solvency.beforeScore.toFixed(0)}% → {solvency.afterScore.toFixed(0)}%</Text>
                                    </View>
                                </View>
                                <Text style={[styles.metricDelta, { color: solvency.delta >= 0 ? '#10B981' : '#EF4444' }]}>
                                    {solvency.deltaFormatted}
                                </Text>
                            </View>

                            {/* Goal Specific Deltas */}
                            {simulationViewModel.goalDeltas && simulationViewModel.goalDeltas.length > 0 && (
                                <View style={styles.goalDeltasBox}>
                                    <Text style={styles.goalDeltasTitle}>Impacted Goals</Text>
                                    {simulationViewModel.goalDeltas.map((gd, idx) => (
                                        <View key={idx} style={styles.goalDeltaRow}>
                                            <Text style={styles.goalDeltaId}>{gd.goalId}</Text>
                                            <View style={styles.goalDeltaRight}>
                                                <Text style={styles.goalDeltaGap}>Gap reduction: {gd.gapReductionFormatted}</Text>
                                                <Text style={styles.goalDeltaStatus}>{gd.statusTransition}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>

                        {/* 3. Tax Friction Disclosure */}
                        <View style={styles.taxCard}>
                            <View style={styles.taxHeader}>
                                <DollarSign size={16} color="#D97706" style={{ marginRight: 6 }} />
                                <Text style={styles.taxTitle}>Tax & Friction Analysis</Text>
                            </View>
                            <Text style={styles.taxRealized}>
                                Realized Capital Gains Tax: <Text style={{ fontWeight: '700' }}>{tax.capitalGainsTaxRealizedFormatted}</Text>
                            </Text>
                            <Text style={styles.taxExplanation}>{tax.explanation}</Text>
                        </View>

                        {/* Disclaimer */}
                        <Text style={styles.disclaimerText}>{simulationViewModel.disclaimer}</Text>
                    </ScrollView>

                    {/* Footer Buttons */}
                    <View style={styles.footer}>
                        {onReviewAction && (
                            <TouchableOpacity
                                style={styles.reviewButton}
                                onPress={() => {
                                    onReviewAction(simulationViewModel);
                                    if (onClose) onClose();
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.reviewButtonText}>Review & Prepare Action</Text>
                            </TouchableOpacity>
                        )}
                        {onClose && (
                            <TouchableOpacity style={styles.closeFooterButton} onPress={onClose}>
                                <Text style={styles.closeFooterButtonText}>Close Preview</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        paddingBottom: 24
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    ratingBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1
    },
    ratingText: {
        fontSize: 11,
        fontWeight: '800'
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    closeButton: {
        padding: 4
    },
    body: {
        padding: 20
    },
    heroCard: {
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    heroLabel: {
        fontSize: 11,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
        marginBottom: 12
    },
    heroComparisonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        paddingHorizontal: 12
    },
    scoreBox: {
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minWidth: 85
    },
    afterScoreBox: {
        borderColor: '#10B981',
        backgroundColor: '#F0FDF4'
    },
    scoreBoxLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '700',
        marginBottom: 4
    },
    scoreBoxValue: {
        fontSize: 22,
        fontWeight: '900',
        color: '#334155'
    },
    arrowBox: {
        alignItems: 'center',
        gap: 4
    },
    deltaBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12
    },
    deltaText: {
        fontSize: 12,
        fontWeight: '800'
    },
    gridSection: {
        marginBottom: 20
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '700',
        color: '#64748B',
        letterSpacing: 0.5,
        marginBottom: 10
    },
    metricRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8
    },
    metricLeft: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    metricTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0F172A'
    },
    metricSub: {
        fontSize: 11,
        color: '#64748B'
    },
    metricDelta: {
        fontSize: 13,
        fontWeight: '700'
    },
    metricValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#334155'
    },
    goalDeltasBox: {
        backgroundColor: '#EFF6FF',
        borderRadius: 10,
        padding: 12,
        marginTop: 6
    },
    goalDeltasTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1D4ED8',
        marginBottom: 6
    },
    goalDeltaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4
    },
    goalDeltaId: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1E293B'
    },
    goalDeltaRight: {
        alignItems: 'flex-end'
    },
    goalDeltaGap: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '600'
    },
    goalDeltaStatus: {
        fontSize: 10,
        color: '#64748B'
    },
    taxCard: {
        backgroundColor: '#FFFBEB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#FDE68A',
        marginBottom: 16
    },
    taxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    taxTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#B45309'
    },
    taxRealized: {
        fontSize: 12,
        color: '#78350F',
        marginBottom: 2
    },
    taxExplanation: {
        fontSize: 11,
        color: '#92400E',
        lineHeight: 15
    },
    disclaimerText: {
        fontSize: 10,
        color: '#94A3B8',
        textAlign: 'center',
        lineHeight: 14,
        marginBottom: 8
    },
    footer: {
        paddingHorizontal: 20,
        gap: 8
    },
    reviewButton: {
        backgroundColor: '#0F172A',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    reviewButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    closeFooterButton: {
        paddingVertical: 10,
        alignItems: 'center'
    },
    closeFooterButtonText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '600'
    }
});
