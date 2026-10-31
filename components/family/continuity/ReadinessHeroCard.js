/**
 * components/family/continuity/ReadinessHeroCard.js
 * 
 * Executive Family Readiness Hero Card for Phase 8.
 * Displays total Readiness Score (0-100), Resilience Tier badge with glowing aesthetics,
 * and 4-pillar resilience progress meters.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ShieldCheck, ShieldAlert, AlertTriangle, HeartPulse, CheckCircle2 } from 'lucide-react-native';
import { FAMILY_READINESS_TIER } from '../../../services/family/familyContracts';

export default function ReadinessHeroCard({ viewModel }) {
    if (!viewModel) return null;

    const { score = 0, tier = FAMILY_READINESS_TIER.CRITICAL, pillars = {} } = viewModel;

    const getTierConfig = (t) => {
        switch (t) {
            case FAMILY_READINESS_TIER.RESILIENT:
                return {
                    label: 'FULLY RESILIENT',
                    color: '#10B981',
                    bgGradient: ['#064E3B', '#061D15'],
                    borderColor: '#059669',
                    Icon: ShieldCheck
                };
            case FAMILY_READINESS_TIER.PROTECTED:
                return {
                    label: 'SUBSTANTIALLY PROTECTED',
                    color: '#38BDF8',
                    bgGradient: ['#0C4A6E', '#081D2E'],
                    borderColor: '#0284C7',
                    Icon: ShieldCheck
                };
            case FAMILY_READINESS_TIER.VULNERABLE:
                return {
                    label: 'VULNERABLE (KEY GAPS)',
                    color: '#F59E0B',
                    bgGradient: ['#451A03', '#1A0E04'],
                    borderColor: '#D97706',
                    Icon: AlertTriangle
                };
            case FAMILY_READINESS_TIER.CRITICAL:
            default:
                return {
                    label: 'CRITICAL DEFICIT',
                    color: '#EF4444',
                    bgGradient: ['#4C0519', '#1A040A'],
                    borderColor: '#E11D48',
                    Icon: ShieldAlert
                };
        }
    };

    const cfg = getTierConfig(tier);
    const TierIcon = cfg.Icon;

    return (
        <View style={styles.cardContainer}>
            <LinearGradient
                colors={cfg.bgGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gradientBg, { borderColor: cfg.borderColor }]}
            >
                {/* Header Badge */}
                <View style={styles.headerRow}>
                    <View style={[styles.tierBadge, { borderColor: cfg.color, backgroundColor: `${cfg.color}20` }]}>
                        <TierIcon size={14} color={cfg.color} />
                        <Text style={[styles.tierText, { color: cfg.color }]}>{cfg.label}</Text>
                    </View>
                    <Text style={styles.headerSub}>0–100 Emergency Readiness</Text>
                </View>

                {/* Score Dial and Title */}
                <View style={styles.scoreHeroRow}>
                    <View style={[styles.scoreCircle, { borderColor: cfg.color }]}>
                        <Text style={[styles.scoreNumber, { color: cfg.color }]}>{score}</Text>
                        <Text style={styles.scoreOutOf}>/ 100</Text>
                    </View>
                    <View style={styles.scoreTextCol}>
                        <Text style={styles.scoreTitle}>Household Readiness Score</Text>
                        <Text style={styles.scoreDesc}>
                            {score >= 90
                                ? 'All vital emergency safeguards, medical proxies, and documents are synchronized.'
                                : score >= 70
                                ? 'Substantial coverage active with minor documentation or backup gaps.'
                                : score >= 50
                                ? 'Household is vulnerable to operational disruption during life-safety crises.'
                                : 'Critical gaps in emergency contacts, medical directives, and legal custody.'}
                        </Text>
                    </View>
                </View>

                {/* 4 Pillars Progress Meters */}
                <View style={styles.pillarDivider} />
                <View style={styles.pillarsGrid}>
                    {Object.entries(pillars).map(([key, p]) => {
                        const pct = Math.min(100, Math.round(((p.score || 0) / (p.maxScore || 25)) * 100));
                        const isComplete = (p.score || 0) >= (p.maxScore || 25);
                        return (
                            <View key={key} style={styles.pillarItem}>
                                <View style={styles.pillarHeaderRow}>
                                    <Text style={styles.pillarLabel} numberOfLines={1}>{p.label}</Text>
                                    <Text style={[styles.pillarScoreText, { color: isComplete ? '#10B981' : '#F59E0B' }]}>
                                        {p.score}/{p.maxScore}
                                    </Text>
                                </View>
                                <View style={styles.progressBarBg}>
                                    <View
                                        style={[
                                            styles.progressBarFill,
                                            {
                                                width: `${pct}%`,
                                                backgroundColor: isComplete ? '#10B981' : pct > 50 ? '#38BDF8' : '#F59E0B'
                                            }
                                        ]}
                                    />
                                </View>
                            </View>
                        );
                    })}
                </View>
            </LinearGradient>
        </View>
    );
}

const styles = StyleSheet.create({
    cardContainer: {
        borderRadius: 20,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginVertical: 10,
        backgroundColor: '#09090B'
    },
    gradientBg: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1.5
    },
    headerRow: {
        flexWrap: 'wrap',
        gap: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1
    },
    tierText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    headerSub: {
        color: '#A1A1AA',
        fontSize: 11,
        fontWeight: '600'
    },
    scoreHeroRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginBottom: 18
    },
    scoreCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#18181B'
    },
    scoreNumber: {
        fontSize: 26,
        fontWeight: '900',
        lineHeight: 30
    },
    scoreOutOf: {
        fontSize: 10,
        fontWeight: '700',
        color: '#71717A'
    },
    scoreTextCol: {
        flex: 1
    },
    scoreTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800',
        marginBottom: 4
    },
    scoreDesc: {
        color: '#D4D4D8',
        fontSize: 12,
        lineHeight: 17
    },
    pillarDivider: {
        height: 1,
        backgroundColor: '#27272A',
        marginBottom: 14
    },
    pillarsGrid: {
        gap: 10
    },
    pillarItem: {
        gap: 4
    },
    pillarHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    pillarLabel: {
        color: '#E4E4E7',
        fontSize: 12,
        fontWeight: '600',
        flex: 1
    },
    pillarScoreText: {
        fontSize: 12,
        fontWeight: '800'
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#27272A',
        borderRadius: 3,
        overflow: 'hidden'
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3
    }
});
