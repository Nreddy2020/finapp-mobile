import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { TrendingUp, TrendingDown, Minus, Play, X, ShieldAlert } from 'lucide-react-native';
import { GoalScenarioClassification, GoalScenarioType } from '../../../services/family/familyContracts.js';

export default function GoalScenarioSimulatorCard({ goalWithEval, onSimulate, onClose }) {
    if (!goalWithEval) return null;
    const { goal, evaluation } = goalWithEval;

    const [lumpSum, setLumpSum] = useState('');
    const [pledgeDelta, setPledgeDelta] = useState('');
    const [simulationResult, setSimulationResult] = useState(null);
    const [errorMsg, setErrorMsg] = useState(null);

    const handleRunSimulation = () => {
        setErrorMsg(null);
        try {
            const parsedLump = lumpSum ? parseFloat(lumpSum) : 0;
            const parsedPledge = pledgeDelta ? parseFloat(pledgeDelta) : 0;

            if (isNaN(parsedLump) || isNaN(parsedPledge)) {
                setErrorMsg('Please enter valid numbers');
                return;
            }

            const scenarioType = parsedPledge < 0 ? GoalScenarioType.PLEDGE_REDUCTION : GoalScenarioType.STANDARD;

            const sim = onSimulate({
                scenarioName: 'User Interactive Simulation',
                scenarioType,
                hypotheticalLumpSum: parsedLump,
                hypotheticalMonthlyPledgeDelta: parsedPledge
            });

            setSimulationResult(sim);
        } catch (err) {
            setErrorMsg(err.message || 'Simulation error');
        }
    };

    const getClassificationBadge = (classification) => {
        switch (classification) {
            case GoalScenarioClassification.ACCELERATION:
                return { label: 'ACCELERATION', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', icon: TrendingUp };
            case GoalScenarioClassification.DECELERATION:
                return { label: 'DECELERATION', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', icon: TrendingDown };
            default:
                return { label: 'NEUTRAL', color: '#94A3B8', bg: 'rgba(148, 163, 184, 0.15)', icon: Minus };
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerBadge}>WHAT-IF SIMULATION</Text>
                    <Text style={styles.title}>{goal.title}</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <X size={18} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            {errorMsg && (
                <View style={styles.errorBox}>
                    <ShieldAlert size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                </View>
            )}

            {/* Inputs */}
            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Hypothetical Lump Sum Injection ({goal.currency}):</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 50000"
                    placeholderTextColor="#64748B"
                    keyboardType="numeric"
                    value={lumpSum}
                    onChangeText={setLumpSum}
                />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Monthly Pledge Change Delta (+ / -):</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g. 2000 or -1000"
                    placeholderTextColor="#64748B"
                    keyboardType="numbers-and-punctuation"
                    value={pledgeDelta}
                    onChangeText={setPledgeDelta}
                />
            </View>

            <TouchableOpacity style={styles.runBtn} onPress={handleRunSimulation}>
                <Play size={15} color="#0F172A" />
                <Text style={styles.runBtnText}>Run Ephemeral Simulation</Text>
            </TouchableOpacity>

            {/* Simulation Result */}
            {simulationResult && (
                <View style={styles.resultBox}>
                    <View style={styles.resultHeader}>
                        <Text style={styles.resultTitle}>Simulation Outcome</Text>
                        {(() => {
                            const badge = getClassificationBadge(simulationResult.classification);
                            const IconComponent = badge.icon;
                            return (
                                <View style={[styles.classBadge, { backgroundColor: badge.bg }]}>
                                    <IconComponent size={12} color={badge.color} />
                                    <Text style={[styles.classBadgeText, { color: badge.color }]}>{badge.label}</Text>
                                </View>
                            );
                        })()}
                    </View>

                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Baseline Pace:</Text>
                        <Text style={styles.resultVal}>{evaluation.effectiveMonthlyPace.toLocaleString()} {goal.currency}/mo</Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Simulated Pace:</Text>
                        <Text style={styles.resultVal}>{simulationResult.simulatedResult.effectiveMonthlyPace.toLocaleString()} {goal.currency}/mo</Text>
                    </View>
                    <View style={styles.resultRow}>
                        <Text style={styles.resultLabel}>Simulated ETA:</Text>
                        <Text style={[styles.resultVal, { color: '#38BDF8' }]}>
                            {simulationResult.simulatedResult.etaLabel}
                        </Text>
                    </View>
                    <Text style={styles.advisoryNote}>
                        * Advisory simulation only. Zero changes written to goals, ledgers, or banking rails.
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#121219',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#38BDF8'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12
    },
    headerBadge: {
        fontSize: 10,
        fontWeight: '700',
        color: '#38BDF8',
        letterSpacing: 0.5,
        marginBottom: 2
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    closeBtn: {
        padding: 4
    },
    errorBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        padding: 8,
        borderRadius: 8,
        marginBottom: 10
    },
    errorText: {
        fontSize: 11,
        color: '#EF4444'
    },
    inputGroup: {
        marginBottom: 10
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
        marginBottom: 4
    },
    input: {
        backgroundColor: '#232330',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        color: '#F8FAFC',
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#334155'
    },
    runBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#38BDF8',
        borderRadius: 8,
        paddingVertical: 10,
        gap: 6,
        marginTop: 4,
        marginBottom: 12
    },
    runBtnText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0F172A'
    },
    resultBox: {
        backgroundColor: '#232330',
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: '#334155'
    },
    resultHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    resultTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    classBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6
    },
    classBadgeText: {
        fontSize: 10,
        fontWeight: '700'
    },
    resultRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4
    },
    resultLabel: {
        fontSize: 11,
        color: '#94A3B8'
    },
    resultVal: {
        fontSize: 12,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    advisoryNote: {
        fontSize: 10,
        fontStyle: 'italic',
        color: '#64748B',
        marginTop: 8
    }
});
