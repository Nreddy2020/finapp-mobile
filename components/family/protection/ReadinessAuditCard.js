import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
    Shield, 
    ShieldCheck, 
    ShieldAlert, 
    CheckCircle2, 
    AlertTriangle, 
    XCircle, 
    ChevronDown, 
    ChevronUp,
    Info
} from 'lucide-react-native';
import { ReadinessLevel, DimensionStatus } from '../../../services/family/familyContracts.js';

/**
 * ReadinessAuditCard
 * 
 * Displays the explainable, pure-deterministic Family Readiness evaluation.
 * ZERO arbitrary weights or black-box formulas.
 * Evaluates 5 explicit, verifiable dimensions into explainable tiers.
 */
export default function ReadinessAuditCard({ readiness, onRefresh }) {
    const [expanded, setExpanded] = useState(false);

    if (!readiness) return null;

    const {
        readinessLevel = ReadinessLevel.CRITICAL_GAPS,
        passedCriteriaCount = 0,
        totalCriteriaCount = 5,
        scorePercentage = 0,
        dimensions = [],
        actionableGaps = []
    } = readiness;

    // Visual theme based on deterministic level
    const getLevelTheme = (level) => {
        switch (level) {
            case ReadinessLevel.COMPREHENSIVE:
                return {
                    title: 'Comprehensive Readiness',
                    subtitle: 'All 5 critical protection standards verified and current',
                    color: '#10B981',
                    bg: 'rgba(16, 185, 129, 0.12)',
                    border: 'rgba(16, 185, 129, 0.35)',
                    icon: ShieldCheck
                };
            case ReadinessLevel.SUBSTANTIAL:
                return {
                    title: 'Substantial Readiness',
                    subtitle: 'Key directives and contacts active; minor gaps remaining',
                    color: '#3B82F6',
                    bg: 'rgba(59, 130, 246, 0.12)',
                    border: 'rgba(59, 130, 246, 0.35)',
                    icon: Shield
                };
            case ReadinessLevel.BASIC:
                return {
                    title: 'Basic Readiness',
                    subtitle: 'Foundational items registered; directives or safe audit needed',
                    color: '#F59E0B',
                    bg: 'rgba(245, 158, 11, 0.12)',
                    border: 'rgba(245, 158, 11, 0.35)',
                    icon: ShieldAlert
                };
            case ReadinessLevel.CRITICAL_GAPS:
            default:
                return {
                    title: 'Critical Protection Gaps',
                    subtitle: 'Household lacks verified dispatch contacts or legal directives',
                    color: '#EF4444',
                    bg: 'rgba(239, 68, 68, 0.12)',
                    border: 'rgba(239, 68, 68, 0.35)',
                    icon: ShieldAlert
                };
        }
    };

    const theme = getLevelTheme(readinessLevel);
    const StatusIcon = theme.icon;

    const getDimensionIcon = (status) => {
        switch (status) {
            case DimensionStatus.COMPLETE:
                return <CheckCircle2 size={16} color="#10B981" />;
            case DimensionStatus.PARTIAL:
                return <AlertTriangle size={16} color="#F59E0B" />;
            case DimensionStatus.CRITICAL_GAP:
            default:
                return <XCircle size={16} color="#EF4444" />;
        }
    };

    const getDimensionStatusBadge = (status) => {
        switch (status) {
            case DimensionStatus.COMPLETE:
                return { text: 'COMPLETE', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
            case DimensionStatus.PARTIAL:
                return { text: 'PARTIAL', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)' };
            case DimensionStatus.CRITICAL_GAP:
            default:
                return { text: 'GAP', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
        }
    };

    return (
        <View style={[styles.card, { borderColor: theme.border }]}>
            {/* Header / Main Tier Banner */}
            <View style={[styles.headerBanner, { backgroundColor: theme.bg }]}>
                <View style={styles.headerRow}>
                    <View style={[styles.iconContainer, { backgroundColor: `${theme.color}25` }]}>
                        <StatusIcon size={24} color={theme.color} />
                    </View>
                    <View style={styles.headerTextCol}>
                        <View style={styles.tierPillRow}>
                            <View style={[styles.tierPill, { backgroundColor: theme.color }]}>
                                <Text style={styles.tierPillText}>{theme.title}</Text>
                            </View>
                            <Text style={styles.percentageText}>{scorePercentage}%</Text>
                        </View>
                        <Text style={styles.criteriaSubtext}>
                            {passedCriteriaCount} of {totalCriteriaCount} Standards Verified
                        </Text>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressTrack}>
                    <View 
                        style={[
                            styles.progressFill, 
                            { 
                                width: `${scorePercentage}%`,
                                backgroundColor: theme.color 
                            }
                        ]} 
                    />
                </View>
                <Text style={styles.headerSubtitle}>{theme.subtitle}</Text>
            </View>

            {/* Expand / Collapse Control */}
            <TouchableOpacity 
                style={styles.toggleRow}
                onPress={() => setExpanded(!expanded)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Toggle dimension details"
            >
                <Text style={styles.toggleText}>
                    {expanded ? 'Hide 5 Readiness Standards' : 'View 5 Readiness Standards & Gaps'}
                </Text>
                {expanded ? (
                    <ChevronUp size={16} color="#A1A1AA" />
                ) : (
                    <ChevronDown size={16} color="#A1A1AA" />
                )}
            </TouchableOpacity>

            {/* Detailed Dimensions List */}
            {expanded && (
                <View style={styles.dimensionsList}>
                    {dimensions.map((dim, idx) => {
                        const badge = getDimensionStatusBadge(dim.status);
                        return (
                            <View 
                                key={dim.id || idx} 
                                style={[
                                    styles.dimensionItem,
                                    idx < dimensions.length - 1 && styles.dimensionItemBorder
                                ]}
                            >
                                <View style={styles.dimHeaderRow}>
                                    <View style={styles.dimIconTitle}>
                                        {getDimensionIcon(dim.status)}
                                        <Text style={styles.dimTitle}>{dim.title}</Text>
                                    </View>
                                    <View style={[styles.dimStatusBadge, { backgroundColor: badge.bg }]}>
                                        <Text style={[styles.dimStatusText, { color: badge.color }]}>
                                            {badge.text}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.dimExplanation}>{dim.explanation}</Text>

                                {dim.actionRequired && (
                                    <View style={styles.actionCallout}>
                                        <Info size={12} color="#F59E0B" style={styles.calloutIcon} />
                                        <Text style={styles.actionText}>{dim.actionRequired}</Text>
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#171721',
        borderRadius: 14,
        borderWidth: 1,
        overflow: 'hidden',
        marginBottom: 20
    },
    headerBanner: {
        padding: 16
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12
    },
    headerTextCol: {
        flex: 1
    },
    tierPillRow: {
        flexWrap: 'wrap',
        gap: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    tierPill: {
        flexShrink: 1,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    tierPillText: {
        color: '#0B1220',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.1
    },
    percentageText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '800'
    },
    criteriaSubtext: {
        color: '#A1A1AA',
        fontSize: 12,
        fontWeight: '500'
    },
    progressTrack: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginVertical: 10
    },
    progressFill: {
        height: '100%',
        borderRadius: 3
    },
    headerSubtitle: {
        color: '#D4D4D8',
        fontSize: 12,
        lineHeight: 16
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#27272A',
        borderTopWidth: 1,
        borderTopColor: '#3F3F46'
    },
    toggleText: {
        flex: 1,
        marginRight: 8,
        color: '#E4E4E7',
        fontSize: 12,
        fontWeight: '600'
    },
    dimensionsList: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#18181B'
    },
    dimensionItem: {
        paddingVertical: 12
    },
    dimensionItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: '#27272A'
    },
    dimHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    dimIconTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8
    },
    dimTitle: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
        marginLeft: 8,
        flex: 1
    },
    dimStatusBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4
    },
    dimStatusText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5
    },
    dimExplanation: {
        color: '#A1A1AA',
        fontSize: 12,
        lineHeight: 16,
        marginLeft: 24,
        marginBottom: 4
    },
    actionCallout: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(245, 158, 11, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.25)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        marginLeft: 24,
        marginTop: 4
    },
    calloutIcon: {
        marginRight: 6,
        marginTop: 1
    },
    actionText: {
        color: '#FBBF24',
        fontSize: 11,
        fontWeight: '500',
        flex: 1,
        lineHeight: 15
    }
});
