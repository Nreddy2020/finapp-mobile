import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet } from 'react-native';

export default function PriorityBreakdownModal({ visible, task, evaluation, onClose }) {
    if (!visible || !evaluation) return null;

    const { score, tier, breakdown, normalizedFactors } = evaluation;
    const title = task?.task || task?.title || 'Task Priority Details';

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>{title}</Text>
                            <Text style={styles.subtitle}>Composite Multi-Factor Scoring</Text>
                        </View>
                        <Pressable accessibilityRole="button" accessibilityLabel="Close priority details" onPress={onClose} style={styles.closeBtn}>
                            <Text style={styles.closeText}>✕</Text>
                        </Pressable>
                    </View>

                    <View style={styles.scoreBox}>
                        <Text style={styles.scoreLabel}>Total Priority Index</Text>
                        <Text style={[styles.scoreValue, tier === 'Urgent' ? styles.urgentText : styles.highText]}>
                            {score} <Text style={styles.scoreMax}>/ 100 ({tier})</Text>
                        </Text>
                    </View>

                    <View style={styles.factorsList}>
                        <View style={styles.factorRow}>
                            <View style={styles.factorLabelGroup}>
                                <Text style={styles.factorName}>1. Deadline Urgency</Text>
                                <Text style={styles.factorPts}>+{breakdown.urgency} pts</Text>
                            </View>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${(breakdown.urgency / 35) * 100}%`, backgroundColor: '#F43F5E' }]} />
                            </View>
                        </View>

                        <View style={styles.factorRow}>
                            <View style={styles.factorLabelGroup}>
                                <Text style={styles.factorName}>2. Importance & Impact</Text>
                                <Text style={styles.factorPts}>+{breakdown.importance} pts</Text>
                            </View>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${(breakdown.importance / 25) * 100}%`, backgroundColor: '#F59E0B' }]} />
                            </View>
                        </View>

                        <View style={styles.factorRow}>
                            <View style={styles.factorLabelGroup}>
                                <Text style={styles.factorName}>3. Intrinsic Difficulty</Text>
                                <Text style={styles.factorPts}>+{breakdown.difficulty} pts</Text>
                            </View>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${(breakdown.difficulty / 20) * 100}%`, backgroundColor: '#A855F7' }]} />
                            </View>
                        </View>

                        <View style={styles.factorRow}>
                            <View style={styles.factorLabelGroup}>
                                <Text style={styles.factorName}>4. Pipeline Dependency</Text>
                                <Text style={styles.factorPts}>+{breakdown.dependency} pts</Text>
                            </View>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${(breakdown.dependency / 10) * 100}%`, backgroundColor: '#38BDF8' }]} />
                            </View>
                        </View>

                        <View style={styles.factorRow}>
                            <View style={styles.factorLabelGroup}>
                                <Text style={styles.factorName}>5. Goal Relevance</Text>
                                <Text style={styles.factorPts}>+{breakdown.goalRelevance} pts</Text>
                            </View>
                            <View style={styles.barBg}>
                                <View style={[styles.barFill, { width: `${(breakdown.goalRelevance / 10) * 100}%`, backgroundColor: '#10B981' }]} />
                            </View>
                        </View>
                    </View>

                    <Text style={styles.explainer}>
                        Formula: 35×Urgency + 25×Importance + 20×Difficulty + 10×Dependency + 10×Goal.
                        High-scoring tasks are placed in peak morning focus hours.
                    </Text>

                    <Pressable accessibilityRole="button" accessibilityLabel="Done" onPress={onClose} style={styles.doneBtn}>
                        <Text style={styles.doneBtnText}>Close</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(9, 9, 15, 0.85)', justifyContent: 'center', alignItems: 'center', padding: 16 },
    container: { width: '100%', maxWidth: 440, backgroundColor: '#181824', borderRadius: 20, borderWidth: 1, borderColor: '#2E2E40', padding: 20 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    title: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    subtitle: { color: '#A1A1B5', fontSize: 12, marginTop: 2 },
    closeBtn: { padding: 6 },
    closeText: { color: '#71717A', fontSize: 16, fontWeight: 'bold' },
    scoreBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#10101A', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#272738', marginBottom: 16 },
    scoreLabel: { color: '#A1A1AA', fontSize: 13, fontWeight: '500' },
    scoreValue: { fontSize: 20, fontWeight: '800' },
    scoreMax: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    urgentText: { color: '#FB7185' },
    highText: { color: '#F472B6' },
    factorsList: { gap: 12, marginBottom: 16 },
    factorRow: { gap: 4 },
    factorLabelGroup: { flexDirection: 'row', justifyContent: 'space-between' },
    factorName: { color: '#E4E4E7', fontSize: 12, fontWeight: '500' },
    factorPts: { color: '#A1A1AA', fontSize: 12, fontWeight: '600' },
    barBg: { height: 6, backgroundColor: '#272738', borderRadius: 3, overflow: 'hidden' },
    barFill: { height: '100%', borderRadius: 3 },
    explainer: { color: '#71717A', fontSize: 11, lineHeight: 16, textAlign: 'center', marginBottom: 16 },
    doneBtn: { backgroundColor: '#4F46E5', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
    doneBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' }
});
