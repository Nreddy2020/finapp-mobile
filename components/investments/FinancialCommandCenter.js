/**
 * FinancialCommandCenter (Stage C.8.8)
 * Master Architectural Standard: C8_V1
 * 
 * Master container screen for the FinLife Financial Command Center.
 * Integrates 5 Core Decision Intelligence Sections:
 * 1. Where Am I? (Financial Health & Solvency Overview)
 * 2. What Needs Attention? (Vulnerabilities & Diagnostic Opportunities)
 * 3. What Should I Consider Doing? (Next Best Actions with 4-Part Narratives)
 * 4. What Happens If I Do It? (Interactive What-If Simulation Impact Modal)
 * 5. What Are My Goals? (Goal Solvency & Glidepaths List)
 * 
 * STRICT INVARIANT: Pure presentation container. Zero financial recalculations.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { BrainCircuit, ShieldAlert, Sparkles, Activity, AlertTriangle, ChevronRight, Eye, RefreshCw } from 'lucide-react-native';
import FinancialActionCard from './FinancialActionCard.js';
import WhatIfSimulationModal from './WhatIfSimulationModal.js';
import GoalSolvencyListCard from './GoalSolvencyListCard.js';
import { adaptFinancialCommandCenterViewModel, adaptWhatIfImpactViewModel } from './decisionPresentationAdapter.js';

export default function FinancialCommandCenter({
    healthScoreDTO = null,
    multiGoalSolvencyDTO = null,
    glidepathsDTO = null,
    opportunitiesDTO = null,
    nextBestActionsDTO = null,
    activeSimulationDTO = null,
    asOfDate = '2026-08-16',
    isLoading = false,
    onRefresh = null,
    error = null,
    onExecuteAction = null
}) {
    const [selectedActionId, setSelectedActionId] = useState(null);
    const [simulationModalVisible, setSimulationModalVisible] = useState(false);
    const [dismissedActionIds, setDismissedActionIds] = useState(new Set());

    // Loading State
    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0F172A" />
                <Text style={styles.loadingText}>Synthesizing Decision Intelligence...</Text>
            </View>
        );
    }

    // Error State
    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Decision Intelligence Error</Text>
                <Text style={styles.errorSubtitle}>{String(error)}</Text>
            </View>
        );
    }

    // Build Master ViewModel via Certified Presentation Adapter
    const viewModel = adaptFinancialCommandCenterViewModel({
        healthScoreDTO,
        multiGoalSolvencyDTO,
        glidepathsDTO,
        opportunitiesDTO,
        nextBestActionsDTO,
        activeSimulationDTO,
        asOfDate
    });

    const handleSeeImpact = (actionVM) => {
        setSelectedActionId(actionVM.actionId);
        setSimulationModalVisible(true);
    };

    const handleDismissAction = (actionVM) => {
        setDismissedActionIds(prev => {
            const next = new Set(prev);
            next.add(actionVM.actionId);
            return next;
        });
    };

    // Filter active actions
    const visibleActions = (viewModel.topActions.items || []).filter(a => !dismissedActionIds.has(a.actionId));

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} /> : undefined}
            showsVerticalScrollIndicator={false}
        >
            {/* Command Center Title Header */}
            <View style={styles.commandHeader}>
                <View style={styles.commandTitleRow}>
                    <BrainCircuit size={22} color="#0F172A" style={{ marginRight: 8 }} />
                    <Text style={styles.commandTitle}>Financial Command Center</Text>
                </View>
                <Text style={styles.asOfDateText}>As of {viewModel.asOfDateFormatted}</Text>
            </View>

            {/* SECTION 1: WHERE AM I? (Health & Solvency Overview) */}
            <View style={styles.heroSection}>
                <Text style={styles.sectionEyebrow}>1. WHERE AM I?</Text>
                <View style={styles.healthHeroCard}>
                    <View style={styles.healthHeroTop}>
                        <View>
                            <Text style={styles.healthScoreTitle}>Financial Health Score</Text>
                            <View style={styles.scoreRow}>
                                <Text style={styles.healthScoreNumber}>{viewModel.healthOverview.scoreFormatted}</Text>
                                <Text style={styles.scoreTotal}>/100</Text>
                                <View style={[styles.gradeBadge, { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' }]}>
                                    <Text style={[styles.gradeText, { color: '#16A34A' }]}>GRADE {viewModel.healthOverview.grade}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.runwayBox}>
                            <Text style={styles.runwayLabel}>Liquidity Runway</Text>
                            <Text style={styles.runwayValue}>{viewModel.healthOverview.runwayMonthsFormatted}</Text>
                        </View>
                    </View>

                    <View style={styles.solvencyHeroRow}>
                        <View style={styles.solvencyHeroItem}>
                            <Text style={styles.solvencyHeroLabel}>Goal Solvency</Text>
                            <Text style={styles.solvencyHeroValue}>{viewModel.goalsOverview.overallSolvencyScoreFormatted}%</Text>
                        </View>
                        <View style={styles.solvencyHeroItem}>
                            <Text style={styles.solvencyHeroLabel}>Total Funding Gap</Text>
                            <Text style={styles.solvencyHeroValue}>{viewModel.goalsOverview.totalFundingGapCompact}</Text>
                        </View>
                        <View style={styles.solvencyHeroItem}>
                            <Text style={styles.solvencyHeroLabel}>Total Required SIP</Text>
                            <Text style={styles.solvencyHeroValue}>{viewModel.goalsOverview.totalRequiredSipFormatted}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* SECTION 2: WHAT NEEDS ATTENTION? (Top Vulnerabilities & Opportunities) */}
            {viewModel.opportunities && viewModel.opportunities.count > 0 && (
                <View style={styles.section}>
                    <Text style={styles.sectionEyebrow}>2. WHAT NEEDS ATTENTION?</Text>
                    <View style={styles.opportunitiesCard}>
                        <View style={styles.opportunitiesHeader}>
                            <ShieldAlert size={16} color="#DC2626" style={{ marginRight: 6 }} />
                            <Text style={styles.opportunitiesTitle}>Identified Diagnostic Vulnerabilities</Text>
                        </View>
                        {viewModel.opportunities.items.map((opp, idx) => (
                            <View key={opp.findingId || idx} style={styles.opportunityItem}>
                                <View style={styles.oppTopRow}>
                                    <View style={[styles.oppUrgencyBadge, { backgroundColor: opp.urgencyTheme.bg, borderColor: opp.urgencyTheme.border }]}>
                                        <Text style={[styles.oppUrgencyText, { color: opp.urgencyTheme.color }]}>{opp.urgencyTheme.label}</Text>
                                    </View>
                                    <Text style={styles.oppDomain}>{opp.domainSource}</Text>
                                </View>
                                <Text style={styles.oppStatement}>{opp.evidenceStatement}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* SECTION 3: WHAT SHOULD I CONSIDER DOING? (Next Best Actions) */}
            <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionEyebrow}>3. WHAT SHOULD I CONSIDER DOING?</Text>
                    <Text style={styles.actionCountText}>{visibleActions.length} Actions</Text>
                </View>

                {visibleActions.length === 0 ? (
                    <View style={styles.emptyActionsCard}>
                        <Sparkles size={24} color="#10B981" style={{ marginBottom: 8 }} />
                        <Text style={styles.emptyActionsTitle}>No Action Required</Text>
                        <Text style={styles.emptyActionsText}>Your portfolio and goals are currently aligned with optimal financial parameters.</Text>
                    </View>
                ) : (
                    visibleActions.map((actionVM) => (
                        <FinancialActionCard
                            key={actionVM.actionId}
                            actionViewModel={actionVM}
                            narrativeViewModel={viewModel.topActions.primaryActionNarrative}
                            onSeeImpact={handleSeeImpact}
                            onReview={onExecuteAction}
                            onDismiss={handleDismissAction}
                            isDismissed={dismissedActionIds.has(actionVM.actionId)}
                        />
                    ))
                )}
            </View>

            {/* SECTION 4: WHAT ARE MY GOALS? (Goal Solvency & Glidepaths) */}
            <View style={styles.section}>
                <Text style={styles.sectionEyebrow}>4. WHAT ARE MY GOALS?</Text>
                <GoalSolvencyListCard goalsOverview={viewModel.goalsOverview} />
            </View>

            {/* SECTION 5: WHAT-IF SIMULATION MODAL (C.8.6 Before vs After Visualizer) */}
            {viewModel.whatIfSimulation && (
                <WhatIfSimulationModal
                    visible={simulationModalVisible}
                    simulationViewModel={viewModel.whatIfSimulation}
                    onClose={() => setSimulationModalVisible(false)}
                    onReviewAction={onExecuteAction}
                />
            )}

            <View style={styles.bottomSpacer} />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC'
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        backgroundColor: '#F8FAFC'
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#64748B',
        fontWeight: '600'
    },
    errorIcon: {
        fontSize: 36,
        marginBottom: 12
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A'
    },
    errorSubtitle: {
        fontSize: 13,
        color: '#EF4444',
        textAlign: 'center',
        marginTop: 4
    },
    commandHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0'
    },
    commandTitleRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    commandTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#0F172A'
    },
    asOfDateText: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600'
    },
    section: {
        marginBottom: 20
    },
    heroSection: {
        marginBottom: 20
    },
    sectionEyebrow: {
        fontSize: 11,
        fontWeight: '800',
        color: '#64748B',
        letterSpacing: 0.8,
        marginBottom: 8
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    actionCountText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#3B82F6'
    },
    healthHeroCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2
    },
    healthHeroTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9'
    },
    healthScoreTitle: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 4
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'baseline'
    },
    healthScoreNumber: {
        fontSize: 32,
        fontWeight: '900',
        color: '#0F172A'
    },
    scoreTotal: {
        fontSize: 14,
        fontWeight: '700',
        color: '#94A3B8',
        marginRight: 10
    },
    gradeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1
    },
    gradeText: {
        fontSize: 11,
        fontWeight: '800'
    },
    runwayBox: {
        alignItems: 'flex-end'
    },
    runwayLabel: {
        fontSize: 11,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2
    },
    runwayValue: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0284C7'
    },
    solvencyHeroRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12
    },
    solvencyHeroItem: {
        flex: 1
    },
    solvencyHeroLabel: {
        fontSize: 10,
        color: '#64748B',
        fontWeight: '600',
        marginBottom: 2
    },
    solvencyHeroValue: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1E293B'
    },
    opportunitiesCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#FECACA',
        shadowColor: '#DC2626',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 1
    },
    opportunitiesHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    opportunitiesTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#991B1B'
    },
    opportunityItem: {
        backgroundColor: '#FEF2F2',
        borderRadius: 10,
        padding: 10,
        marginBottom: 8
    },
    oppTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4
    },
    oppUrgencyBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1
    },
    oppUrgencyText: {
        fontSize: 10,
        fontWeight: '800'
    },
    oppDomain: {
        fontSize: 10,
        color: '#7F1D1D',
        fontWeight: '600'
    },
    oppStatement: {
        fontSize: 12,
        color: '#450A0A',
        lineHeight: 16
    },
    emptyActionsCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    emptyActionsTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 4
    },
    emptyActionsText: {
        fontSize: 12,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 16
    },
    bottomSpacer: {
        height: 24
    }
});
