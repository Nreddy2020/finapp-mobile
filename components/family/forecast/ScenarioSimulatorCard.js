import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Sliders, AlertCircle, RefreshCw, Zap, Users, ArrowRight } from 'lucide-react-native';

export default function ScenarioSimulatorCard({
    members = [],
    scenarioParams,
    simulationResult,
    onUpdateIncomeAdjustment,
    onToggleExpenseShock,
    onSelectDefaultingContributor,
    onResetScenario
}) {
    const incomeOptions = [
        { label: 'Normal (0%)', value: 0 },
        { label: '-10%', value: -10 },
        { label: '-20%', value: -20 },
        { label: '-50%', value: -50 },
        { label: '-100%', value: -100 }
    ];

    const hasActivePerturbation =
        scenarioParams.incomeAdjustmentPercent !== 0 ||
        scenarioParams.expenseShocks.length > 0 ||
        scenarioParams.defaultingContributorId !== null;

    return (
        <View style={styles.card}>
            {/* Header */}
            <View style={styles.headerRow}>
                <View>
                    <Text style={styles.badgeText}>WHAT-IF STRESS TESTING</Text>
                    <Text style={styles.title}>Scenario Planning</Text>
                    <Text style={styles.subtitle}>Non-mutating liquidity perturbations & resilience</Text>
                </View>
                {hasActivePerturbation && (
                    <TouchableOpacity style={styles.resetBtn} onPress={onResetScenario} activeOpacity={0.7}>
                        <RefreshCw size={12} color="#6366F1" style={{ marginRight: 4 }} />
                        <Text style={styles.resetBtnText}>Reset</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Income Perturbation Selector */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>INCOME SHOCK PERTURBATION</Text>
                <View style={styles.btnRow}>
                    {incomeOptions.map(opt => {
                        const isSelected = scenarioParams.incomeAdjustmentPercent === opt.value;
                        return (
                            <TouchableOpacity
                                key={opt.value}
                                style={[styles.optionBtn, isSelected && styles.optionBtnActive]}
                                onPress={() => onUpdateIncomeAdjustment(opt.value)}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.optionBtnText, isSelected && styles.optionBtnTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Discrete Expense Shock */}
            <View style={styles.section}>
                <Text style={styles.sectionLabel}>ONE-TIME DISCRETE EXPENSE SHOCK</Text>
                <View style={styles.btnRow}>
                    <TouchableOpacity
                        style={[styles.shockBtn, scenarioParams.expenseShocks.length === 0 && styles.shockBtnActive]}
                        onPress={() => onToggleExpenseShock(0)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.shockBtnText, scenarioParams.expenseShocks.length === 0 && styles.shockBtnTextActive]}>
                            None
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.shockBtn, scenarioParams.expenseShocks.some(s => s.amount === 25000) && styles.shockBtnActive]}
                        onPress={() => onToggleExpenseShock(25000)}
                        activeOpacity={0.7}
                    >
                        <Zap size={12} color={scenarioParams.expenseShocks.some(s => s.amount === 25000) ? '#FFFFFF' : '#EF4444'} style={{ marginRight: 4 }} />
                        <Text style={[styles.shockBtnText, scenarioParams.expenseShocks.some(s => s.amount === 25000) && styles.shockBtnTextActive]}>
                            +₹25k Emergency
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.shockBtn, scenarioParams.expenseShocks.some(s => s.amount === 50000) && styles.shockBtnActive]}
                        onPress={() => onToggleExpenseShock(50000)}
                        activeOpacity={0.7}
                    >
                        <Zap size={12} color={scenarioParams.expenseShocks.some(s => s.amount === 50000) ? '#FFFFFF' : '#EF4444'} style={{ marginRight: 4 }} />
                        <Text style={[styles.shockBtnText, scenarioParams.expenseShocks.some(s => s.amount === 50000) && styles.shockBtnTextActive]}>
                            +₹50k Major Shock
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Contributor Default Simulation */}
            {members && members.length > 1 && (
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>SIMULATE CONTRIBUTOR DEFAULT (PHASE 9 POOLS)</Text>
                    <View style={styles.btnRow}>
                        <TouchableOpacity
                            style={[styles.memberBtn, scenarioParams.defaultingContributorId === null && styles.memberBtnActive]}
                            onPress={() => onSelectDefaultingContributor(null)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.memberBtnText, scenarioParams.defaultingContributorId === null && styles.memberBtnTextActive]}>
                                None (All Pay)
                            </Text>
                        </TouchableOpacity>
                        {members.map(m => {
                            const isSelected = scenarioParams.defaultingContributorId === m.id;
                            return (
                                <TouchableOpacity
                                    key={m.id}
                                    style={[styles.memberBtn, isSelected && styles.memberBtnActive]}
                                    onPress={() => onSelectDefaultingContributor(m.id)}
                                    activeOpacity={0.7}
                                >
                                    <Users size={12} color={isSelected ? '#FFFFFF' : '#9CA3AF'} style={{ marginRight: 4 }} />
                                    <Text style={[styles.memberBtnText, isSelected && styles.memberBtnTextActive]}>
                                        {m.displayName || m.name || `Member ${m.id.substring(0, 4)}`}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            )}

            {/* Contributor Default Reallocation Advisory Banner */}
            {simulationResult && simulationResult.contributorDefaultReallocation && (
                <View style={styles.reallocContainer}>
                    <View style={styles.reallocHeader}>
                        <AlertCircle size={16} color="#F59E0B" />
                        <Text style={styles.reallocTitle}>
                            {simulationResult.contributorDefaultReallocation.label}
                        </Text>
                    </View>
                    <Text style={styles.reallocSub}>
                        Defaulting Contributor: {simulationResult.contributorDefaultReallocation.defaultingContributorId} • Shortfall: ₹{simulationResult.contributorDefaultReallocation.totalShortfall?.toLocaleString()}
                    </Text>

                    <View style={styles.reallocList}>
                        {simulationResult.contributorDefaultReallocation.reallocatedContributors.map((rc, idx) => (
                            <View key={idx} style={styles.reallocItem}>
                                <Text style={styles.reallocMemberId}>{rc.personId}:</Text>
                                <Text style={styles.reallocDetail}>
                                    ₹{rc.originalShare} <ArrowRight size={10} color="#9CA3AF" /> ₹{rc.newShare} (+₹{rc.additionalShare})
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Simulated Comparison Summary */}
            {hasActivePerturbation && simulationResult && (
                <View style={styles.resultBox}>
                    <Text style={styles.resultTitle}>SIMULATION IMPACT</Text>
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Baseline Delta:</Text>
                        <Text style={styles.resultValue}>
                            ₹{simulationResult.baselineSummary?.netProjectedLiquidityDelta?.toLocaleString() || '—'}
                        </Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Simulated Delta:</Text>
                        <Text style={[styles.resultValue, { color: (simulationResult.simulatedSummary?.netProjectedLiquidityDelta || 0) >= 0 ? '#10B981' : '#EF4444' }]}>
                            ₹{simulationResult.simulatedSummary?.netProjectedLiquidityDelta?.toLocaleString() || '—'}
                        </Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Net Variance:</Text>
                        <Text style={[styles.resultValue, { color: '#EF4444', fontWeight: '800' }]}>
                            {simulationResult.simulatedSummary?.netProjectedLiquidityDelta !== null && simulationResult.baselineSummary?.netProjectedLiquidityDelta !== null
                                ? `₹${(simulationResult.simulatedSummary.netProjectedLiquidityDelta - simulationResult.baselineSummary.netProjectedLiquidityDelta).toLocaleString()}`
                                : '—'}
                        </Text>
                    </View>
                    {simulationResult.simulatedSummary?.deficitOnsetTimestampUtc && (
                        <View style={styles.resultRow}>
                            <Text style={styles.resultLabel}>Simulated Deficit Onset:</Text>
                            <Text style={[styles.resultValue, { color: '#F59E0B' }]}>
                                {new Date(simulationResult.simulatedSummary.deficitOnsetTimestampUtc).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#171721',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 14
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#A855F7',
        letterSpacing: 1,
        marginBottom: 2
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    subtitle: {
        fontSize: 11,
        color: '#9CA3AF',
        marginTop: 2
    },
    resetBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#6366F1'
    },
    resetBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#818CF8'
    },
    section: {
        marginBottom: 14
    },
    sectionLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.8,
        marginBottom: 6
    },
    btnRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6
    },
    optionBtn: {
        backgroundColor: '#252532',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#374151'
    },
    optionBtnActive: {
        backgroundColor: '#6366F1',
        borderColor: '#818CF8'
    },
    optionBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D1D5DB'
    },
    optionBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    shockBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#252532',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#374151'
    },
    shockBtnActive: {
        backgroundColor: '#DC2626',
        borderColor: '#EF4444'
    },
    shockBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D1D5DB'
    },
    shockBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    memberBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#252532',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#374151'
    },
    memberBtnActive: {
        backgroundColor: '#D97706',
        borderColor: '#F59E0B'
    },
    memberBtnText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D1D5DB'
    },
    memberBtnTextActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    reallocContainer: {
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.4)'
    },
    reallocHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4
    },
    reallocTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F59E0B',
        marginLeft: 6,
        flex: 1
    },
    reallocSub: {
        fontSize: 11,
        color: '#D1D5DB',
        marginBottom: 8
    },
    reallocList: {
        gap: 4
    },
    reallocItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#232330',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    reallocMemberId: {
        fontSize: 11,
        fontWeight: '600',
        color: '#F3F4F6',
        marginRight: 6
    },
    reallocDetail: {
        fontSize: 11,
        color: '#9CA3AF'
    },
    resultBox: {
        backgroundColor: '#232330',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    resultTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: '#A855F7',
        letterSpacing: 0.8,
        marginBottom: 6
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2
    },
    resultLabel: {
        fontSize: 11,
        color: '#9CA3AF'
    },
    resultValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F3F4F6'
    }
});
