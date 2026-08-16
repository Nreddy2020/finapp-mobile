/**
 * RiskIntelligenceDashboard (Stage C.7.8)
 * 
 * Master container screen for Portfolio Intelligence, Risk Diagnostics & Stress Testing.
 * Integrates HealthScoreHeroCard, RiskDimensionsCard, RiskDriversStrengthsCard,
 * ScenarioStressVisualizerCard, and factual executive summary callouts.
 * 
 * STRICT INVARIANT: Pure presentation container. Zero financial recalculations.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import HealthScoreHeroCard from './HealthScoreHeroCard.js';
import RiskDimensionsCard from './RiskDimensionsCard.js';
import RiskDriversStrengthsCard from './RiskDriversStrengthsCard.js';
import ScenarioStressVisualizerCard from './ScenarioStressVisualizerCard.js';
import { adaptRiskDashboardViewModel } from './riskPresentationAdapter.js';

export default function RiskIntelligenceDashboard({
    healthDTO,
    stressDTO,
    isLoading = false,
    onRefresh,
    error = null
}) {
    const [activeScenarioId, setActiveScenarioId] = useState('HIST_2008_GFC');

    // Loading State
    if (isLoading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color="#0F172A" />
                <Text style={styles.loadingText}>Evaluating Portfolio Intelligence...</Text>
            </View>
        );
    }

    // Error State
    if (error) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorTitle}>Risk Evaluation Error</Text>
                <Text style={styles.errorSubtitle}>{String(error)}</Text>
            </View>
        );
    }

    // Adapt ViewModels
    const viewModel = adaptRiskDashboardViewModel(healthDTO, stressDTO, activeScenarioId);

    // Empty Portfolio State
    if (viewModel.status === 'EMPTY_PORTFOLIO' || !healthDTO) {
        return (
            <ScrollView
                contentContainerStyle={styles.centerContainer}
                refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} /> : undefined}
            >
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyTitle}>No Holdings Found</Text>
                <Text style={styles.emptySubtitle}>
                    Add your investment holdings to generate your real-time Risk Intelligence & Stress Test Report.
                </Text>
            </ScrollView>
        );
    }

    // Insufficient Data State
    if (viewModel.status === 'INSUFFICIENT_DATA') {
        return (
            <ScrollView
                contentContainerStyle={styles.centerContainer}
                refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} /> : undefined}
            >
                <Text style={styles.emptyIcon}>🔍</Text>
                <Text style={styles.emptyTitle}>Insufficient Diagnostic Data</Text>
                <Text style={styles.emptySubtitle}>
                    Two or more diagnostic modules are missing. Please complete full portfolio synchronization.
                </Text>
            </ScrollView>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={onRefresh ? <RefreshControl refreshing={false} onRefresh={onRefresh} /> : undefined}
        >
            {/* 1. Health Score Hero Gauge */}
            <HealthScoreHeroCard viewModel={viewModel.hero} />

            {/* 2. Executive Summary Callout */}
            {viewModel.explanations && viewModel.explanations.length > 0 && (
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Executive Insight</Text>
                    {viewModel.explanations.map((exp, idx) => (
                        <Text key={idx} style={styles.summaryText}>• {exp}</Text>
                    ))}
                </View>
            )}

            {/* 3. 5 Orthogonal Risk Dimensions */}
            <RiskDimensionsCard dimensions={viewModel.dimensions} />

            {/* 4. Risk Drivers & Key Strengths */}
            <RiskDriversStrengthsCard viewModel={viewModel.driversAndStrengths} />

            {/* 5. Interactive Scenario Stress Explorer */}
            <ScenarioStressVisualizerCard
                viewModel={viewModel.stress}
                onSelectScenario={(id) => setActiveScenarioId(id)}
            />

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
        paddingBottom: 32
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
        color: '#DC2626',
        textAlign: 'center',
        marginTop: 4
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: 12
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A'
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18
    },
    summaryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    summaryTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A',
        marginBottom: 6
    },
    summaryText: {
        fontSize: 12,
        color: '#334155',
        lineHeight: 18
    },
    bottomSpacer: {
        height: 24
    }
});
