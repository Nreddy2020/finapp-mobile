import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { GraduationCap, TrendingUp, Calendar, AlertCircle, Plus, Sparkles, BookOpen } from 'lucide-react-native';
import LuxuryCard from '../ui/LuxuryCard';
import { DataAvailabilityState, FamilyRole } from '../../services/family/familyContracts';

export default function ChildrenEducationView({
    educationSummary = {},
    persons = [],
    onSelectGoal = () => {},
    onAddGoal = () => {}
}) {
    const { goalsList = [], totalProjectedCostDisplay = '—', goalsCount = 0 } = educationSummary;

    const children = persons.filter(p => (p.core?.role || p.role) === FamilyRole.CHILD);

    return (
        <View style={styles.container}>
            {/* Header Hero Banner */}
            <LuxuryCard style={styles.heroCard}>
                <View style={styles.heroHeader}>
                    <View style={styles.heroIconWrap}>
                        <GraduationCap size={22} color="#14B8A6" />
                    </View>
                    <View style={styles.heroTextWrap}>
                        <Text style={styles.heroTitle}>Education Horizon Planning</Text>
                        <Text style={styles.heroSub}>
                            {goalsCount} Goal(s) Modeled • Total Horizon: {totalProjectedCostDisplay}
                        </Text>
                    </View>
                </View>

                {/* Children overview chips */}
                <View style={styles.childrenChipsRow}>
                    {children.map(c => (
                        <View key={c.core?.id || c.id} style={styles.childChip}>
                            <BookOpen size={13} color="#14B8A6" />
                            <Text style={styles.childChipText}>
                                {c.core?.preferredName || c.core?.name} ({c.profile?.occupation || 'Student'})
                            </Text>
                        </View>
                    ))}
                </View>
            </LuxuryCard>

            {/* Goals Stack */}
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>COLLEGE & HIGHER EDUCATION GOALS</Text>
                <Pressable style={styles.addGoalBtn} onPress={onAddGoal}>
                    <Plus size={14} color="#14B8A6" />
                    <Text style={styles.addGoalBtnText}>Model Goal</Text>
                </Pressable>
            </View>

            <View style={styles.goalsStack}>
                {goalsList.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <GraduationCap size={32} color="#71717A" />
                        <Text style={styles.emptyTitle}>No Education Goals Modeled</Text>
                        <Text style={styles.emptySub}>Add future undergraduate or career goals with custom inflation modeling.</Text>
                    </View>
                ) : (
                    goalsList.map(g => {
                        const proj = g.projection;
                        const isConfigured = proj.assumptionStatus === DataAvailabilityState.AVAILABLE;

                        return (
                            <LuxuryCard key={g.id} style={styles.goalCard} onPress={() => onSelectGoal(g)}>
                                <View style={styles.goalCardTop}>
                                    <View style={styles.childTag}>
                                        <Text style={styles.childTagText}>{g.childName}</Text>
                                    </View>
                                    {isConfigured ? (
                                        <View style={styles.inflationBadge}>
                                            <TrendingUp size={11} color="#14B8A6" />
                                            <Text style={styles.inflationText}>+{proj.inflationRatePercent} Inflation p.a.</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.unconfiguredBadge}>
                                            <AlertCircle size={11} color="#F59E0B" />
                                            <Text style={styles.unconfiguredText}>NOT CONFIGURED</Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.goalTitle}>{g.goalTitle}</Text>

                                {isConfigured ? (
                                    <>
                                        {/* Cost Comparison Grid */}
                                        <View style={styles.costGrid}>
                                            <View style={styles.costBox}>
                                                <Text style={styles.costBoxLabel}>Current Cost Today</Text>
                                                <Text style={styles.costBoxVal}>{proj.currentCostDisplay}</Text>
                                            </View>
                                            <View style={styles.costBoxDivider} />
                                            <View style={styles.costBox}>
                                                <Text style={[styles.costBoxLabel, { color: '#14B8A6' }]}>
                                                    Projected Cost ({proj.targetYear})
                                                </Text>
                                                <Text style={[styles.costBoxVal, { color: '#14B8A6' }]}>
                                                    {proj.projectedCostDisplay}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Shortfall & Savings Progress */}
                                        <View style={styles.shortfallRow}>
                                            <Text style={styles.shortfallLabel}>
                                                Dedicated Savings: <Text style={styles.shortfallVal}>{proj.currentSavingsDisplay}</Text>
                                            </Text>
                                            <Text style={styles.shortfallLabel}>
                                                Shortfall: <Text style={[styles.shortfallVal, { color: '#F59E0B' }]}>{proj.projectedShortfallDisplay}</Text>
                                            </Text>
                                        </View>

                                        <Text style={styles.notesText}>{proj.notes}</Text>
                                    </>
                                ) : (
                                    <View style={styles.unconfiguredBox}>
                                        <Text style={styles.unconfiguredNotice}>
                                            Target year or current cost not configured. Tap to configure inflation parameters.
                                        </Text>
                                    </View>
                                )}
                            </LuxuryCard>
                        );
                    })
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24
    },
    heroCard: {
        padding: 16,
        marginBottom: 16
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12
    },
    heroIconWrap: {
        width: 42,
        height: 42,
        borderRadius: 12,
        backgroundColor: '#14B8A620',
        justifyContent: 'center',
        alignItems: 'center'
    },
    heroTextWrap: {
        flex: 1
    },
    heroTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    heroSub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    childrenChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#27272A'
    },
    childChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#18181B',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8
    },
    childChipText: {
        color: '#D1D5DB',
        fontSize: 11,
        fontWeight: '500'
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4
    },
    sectionTitle: {
        color: '#71717A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1
    },
    addGoalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    addGoalBtnText: {
        color: '#14B8A6',
        fontSize: 12,
        fontWeight: '600'
    },
    goalsStack: {
        gap: 12
    },
    goalCard: {
        padding: 14
    },
    goalCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    childTag: {
        backgroundColor: '#27272A',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    childTagText: {
        color: '#E4E4E7',
        fontSize: 11,
        fontWeight: '600'
    },
    inflationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#14B8A620',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    inflationText: {
        color: '#14B8A6',
        fontSize: 10,
        fontWeight: '700'
    },
    unconfiguredBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F59E0B20',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6
    },
    unconfiguredText: {
        color: '#F59E0B',
        fontSize: 10,
        fontWeight: '700'
    },
    goalTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12
    },
    costGrid: {
        flexDirection: 'row',
        backgroundColor: '#18181B',
        borderRadius: 10,
        padding: 12,
        marginBottom: 10
    },
    costBox: {
        flex: 1,
        alignItems: 'center'
    },
    costBoxDivider: {
        width: 1,
        backgroundColor: '#27272A'
    },
    costBoxLabel: {
        color: '#71717A',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4
    },
    costBoxVal: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700'
    },
    shortfallRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8
    },
    shortfallLabel: {
        color: '#9CA3AF',
        fontSize: 11
    },
    shortfallVal: {
        color: '#FFFFFF',
        fontWeight: '600'
    },
    notesText: {
        color: '#71717A',
        fontSize: 10,
        fontStyle: 'italic'
    },
    unconfiguredBox: {
        backgroundColor: '#18181B',
        borderRadius: 8,
        padding: 12
    },
    unconfiguredNotice: {
        color: '#9CA3AF',
        fontSize: 12
    },
    emptyCard: {
        padding: 32,
        alignItems: 'center',
        backgroundColor: '#18181B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#27272A'
    },
    emptyTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
        marginTop: 10,
        marginBottom: 4
    },
    emptySub: {
        color: '#71717A',
        fontSize: 12,
        textAlign: 'center'
    }
});
