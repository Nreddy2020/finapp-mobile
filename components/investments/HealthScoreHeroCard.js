/**
 * HealthScoreHeroCard (Stage C.7.8)
 * 
 * Displays the primary portfolio Health Score gauge (0-100),
 * institutional health grade badge (A/B/C/D/F), health status title,
 * confidence level indicator, and degraded warning banners.
 * 
 * STRICT INVARIANT: Pure presentation component. Zero financial recalculations.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function HealthScoreHeroCard({ viewModel }) {
    if (!viewModel) return null;

    const {
        hasData,
        asOfDateFormatted,
        displayHealthScoreText,
        healthGrade,
        healthStatusText,
        gradeTheme,
        confidenceTheme,
        imputationApplied,
        warningBannerText
    } = viewModel;

    return (
        <View style={styles.cardContainer}>
            {/* Header: Title & As-Of Date */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.headerTitle}>Portfolio Health Score</Text>
                    <Text style={styles.asOfText}>As of {asOfDateFormatted}</Text>
                </View>
                {/* Confidence Badge */}
                <View style={[styles.confidenceBadge, { backgroundColor: confidenceTheme.bg }]}>
                    <Text style={[styles.confidenceText, { color: confidenceTheme.text }]}>
                        {confidenceTheme.label}
                    </Text>
                </View>
            </View>

            {/* Hero Score Display */}
            <View style={styles.scoreRow}>
                <View style={[styles.gaugeContainer, { borderColor: gradeTheme.border, backgroundColor: gradeTheme.bg }]}>
                    <Text style={[styles.scoreNumber, { color: gradeTheme.text }]}>
                        {displayHealthScoreText}
                    </Text>
                    <Text style={[styles.scoreOutOf, { color: gradeTheme.text }]}>/ 100</Text>
                </View>

                <View style={styles.statusDetails}>
                    <View style={[styles.gradeBadge, { backgroundColor: gradeTheme.text }]}>
                        <Text style={styles.gradeBadgeText}>GRADE {healthGrade || '—'}</Text>
                    </View>
                    <Text style={styles.statusCategoryText}>{healthStatusText}</Text>
                    <Text style={styles.statusSubtext}>
                        {hasData 
                            ? 'Holistic multi-factor risk assessment across 5 dimensions.' 
                            : 'Add assets to calculate health score.'}
                    </Text>
                </View>
            </View>

            {/* Imputation / Degraded Warning Banner */}
            {imputationApplied && warningBannerText && (
                <View style={styles.warningBanner}>
                    <Text style={styles.warningIcon}>⚠️</Text>
                    <Text style={styles.warningText}>{warningBannerText}</Text>
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
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#0F172A'
    },
    asOfText: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2
    },
    confidenceBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20
    },
    confidenceText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    gaugeContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center'
    },
    scoreNumber: {
        fontSize: 28,
        fontWeight: '800'
    },
    scoreOutOf: {
        fontSize: 10,
        fontWeight: '600',
        marginTop: -2
    },
    statusDetails: {
        flex: 1
    },
    gradeBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginBottom: 4
    },
    gradeBadgeText: {
        color: '#FFFFFF',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    statusCategoryText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0F172A'
    },
    statusSubtext: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
        lineHeight: 16
    },
    warningBanner: {
        marginTop: 16,
        padding: 10,
        backgroundColor: '#FFFBEB',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FDE68A',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    warningIcon: {
        fontSize: 14
    },
    warningText: {
        flex: 1,
        fontSize: 12,
        color: '#92400E',
        lineHeight: 16
    }
});
