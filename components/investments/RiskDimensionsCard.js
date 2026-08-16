/**
 * RiskDimensionsCard (Stage C.7.8)
 * 
 * Displays the 5 orthogonal risk dimensions (Concentration 20%, Volatility 20%,
 * Correlation 15%, Liquidity 25%, Stress 20%) with progress bars, weights,
 * scores, and expandable factual metric drilldowns.
 * 
 * STRICT INVARIANT: Pure presentation component. Zero financial recalculations.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function RiskDimensionsCard({ dimensions = [] }) {
    const [expandedId, setExpandedId] = useState(null);

    const toggleExpand = (id) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    if (!dimensions || dimensions.length === 0) return null;

    return (
        <View style={styles.cardContainer}>
            <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Risk Dimension Breakdown</Text>
                <Text style={styles.cardSubtitle}>5 Orthogonal Pillars (100% Weighted)</Text>
            </View>

            {dimensions.map((dim) => {
                const isExpanded = expandedId === dim.id;

                return (
                    <View key={dim.id} style={styles.dimensionRow}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => toggleExpand(dim.id)}
                            style={styles.dimensionHeader}
                        >
                            <View style={styles.dimensionTitleCol}>
                                <Text style={styles.dimensionTitle}>{dim.title}</Text>
                                <View style={styles.badgeRow}>
                                    <View style={styles.weightBadge}>
                                        <Text style={styles.weightText}>{dim.weightPercent} Weight</Text>
                                    </View>
                                    {dim.isImputed && (
                                        <View style={styles.imputedBadge}>
                                            <Text style={styles.imputedText}>Imputed</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            <View style={styles.scoreCol}>
                                <Text style={styles.scoreText}>{dim.scoreFormatted}</Text>
                                <Text style={styles.chevronText}>{isExpanded ? '▲' : '▼'}</Text>
                            </View>
                        </TouchableOpacity>

                        {/* Progress Bar */}
                        <View style={styles.progressBarBackground}>
                            <View
                                style={[
                                    styles.progressBarFill,
                                    {
                                        width: `${Math.round(dim.progressRatio * 100)}%`,
                                        backgroundColor: dim.barColor
                                    }
                                ]}
                            />
                        </View>

                        {/* Expandable Key Metrics Drilldown */}
                        {isExpanded && dim.keyMetrics && dim.keyMetrics.length > 0 && (
                            <View style={styles.drilldownContainer}>
                                {dim.keyMetrics.map((metric, idx) => (
                                    <Text key={idx} style={styles.metricBulletText}>
                                        • {metric}
                                    </Text>
                                ))}
                            </View>
                        )}
                    </View>
                );
            })}
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
        marginBottom: 16
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
    dimensionRow: {
        marginBottom: 16
    },
    dimensionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6
    },
    dimensionTitleCol: {
        flex: 1
    },
    dimensionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1E293B'
    },
    badgeRow: {
        flexDirection: 'row',
        gap: 6,
        marginTop: 2
    },
    weightBadge: {
        backgroundColor: '#F1F5F9',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    weightText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#475569'
    },
    imputedBadge: {
        backgroundColor: '#FEF3C7',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    imputedText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#92400E'
    },
    scoreCol: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    scoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0F172A'
    },
    chevronText: {
        fontSize: 10,
        color: '#94A3B8'
    },
    progressBarBackground: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    },
    drilldownContainer: {
        marginTop: 8,
        padding: 10,
        backgroundColor: '#F8FAFC',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E2E8F0'
    },
    metricBulletText: {
        fontSize: 12,
        color: '#334155',
        lineHeight: 18
    }
});
