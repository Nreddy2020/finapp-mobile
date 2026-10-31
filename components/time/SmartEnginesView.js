import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { EstimateLearningEngine } from '../../services/time/estimateLearningEngine.js';

export default function SmartEnginesView() {
    const [baselines, setBaselines] = useState({});
    const [calibratedMap, setCalibratedMap] = useState({});

    useEffect(() => {
        EstimateLearningEngine.getBaselines().then(b => setBaselines(b || {})).catch(() => {});
    }, []);

    const handleAcceptCalibration = async (subjectKey, biasFactor) => {
        await EstimateLearningEngine.acceptCalibration(subjectKey);
        const updated = await EstimateLearningEngine.getBaselines();
        setBaselines(updated || {});
        setCalibratedMap(prev => ({ ...prev, [subjectKey]: true }));
    };

    const handleDismissCalibration = async (subjectKey) => {
        await EstimateLearningEngine.dismissCalibration(subjectKey);
        const updated = await EstimateLearningEngine.getBaselines();
        setBaselines(updated || {});
    };

    const handleSimulateOverruns = async () => {
        for (let i = 0; i < 4; i++) {
            await EstimateLearningEngine.recordSession({
                subject: 'Calculus',
                plannedMinutes: 30,
                actualMinutes: 45
            });
        }
        const updated = await EstimateLearningEngine.getBaselines();
        setBaselines(updated || {});
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.heading}>4 Smart Intelligence Engines</Text>
                <Text style={styles.subheading}>Self-correcting, adaptive planning algorithms active in the background.</Text>
            </View>

            {/* Engine 1: Priority Scoring */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.engineTag}>Engine 1</Text>
                    <Text style={styles.cardTitle}>Priority Scoring Formula</Text>
                </View>
                <Text style={styles.cardDesc}>
                    Eliminates the black box by combining 5 independent factors:
                </Text>
                <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricPts}>35 pts</Text>
                        <Text style={styles.metricLabel}>Urgency (48h exponential)</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricPts}>25 pts</Text>
                        <Text style={styles.metricLabel}>Curriculum Importance</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricPts}>20 pts</Text>
                        <Text style={styles.metricLabel}>Intrinsic Difficulty</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricPts}>10 pts</Text>
                        <Text style={styles.metricLabel}>Block Dependency</Text>
                    </View>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricPts}>10 pts</Text>
                        <Text style={styles.metricLabel}>Goal Relevance</Text>
                    </View>
                </View>
                <Text style={styles.footerNote}>✓ Overdue tasks receive bounded increment (+0.05/day up to 4 days, capped at 100).</Text>
            </View>

            {/* Engine 2: Break Protection Guard */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.engineTag, { backgroundColor: '#F59E0B20', color: '#FBBF24' }]}>Engine 2</Text>
                    <Text style={styles.cardTitle}>Burnout & Break Protection</Text>
                </View>
                <Text style={styles.cardDesc}>
                    Scans continuous density over half-open time blocks [start, end).
                </Text>
                <View style={styles.pillRow}>
                    <View style={styles.infoPill}><Text style={styles.infoPillText}>Strain Threshold: 150m (2.5h)</Text></View>
                    <View style={styles.infoPill}><Text style={styles.infoPillText}>Recovery Gap: ≥ 15 min</Text></View>
                    <View style={styles.infoPill}><Text style={styles.infoPillText}>Bedtime Cutoff: 21:30</Text></View>
                </View>
                <Text style={styles.footerNote}>✓ Auto-ripple shifts movable blocks down by 15m; fixed appointments never move.</Text>
            </View>

            {/* Engine 3: Deadline Intelligence & Dynamic Pacing */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.engineTag, { backgroundColor: '#38BDF820', color: '#38BDF8' }]}>Engine 3</Text>
                    <Text style={styles.cardTitle}>Deadline Pacing Recalculator</Text>
                </View>
                <Text style={styles.cardDesc}>
                    Dynamically recalculates pace when days are missed:
                </Text>
                <View style={styles.equationBox}>
                    <Text style={styles.equationText}>
                        Pace = Remaining Work ÷ (Available Remaining Days × C(d))
                    </Text>
                </View>
                <Text style={styles.footerNote}>✓ Flags unrealistic demands (&gt; 1.5× daily capacity) and suggests honest date extensions.</Text>
            </View>

            {/* Engine 4: Estimate Learning Engine */}
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.engineTag, { backgroundColor: '#A855F720', color: '#C084FC' }]}>Engine 4</Text>
                    <Text style={styles.cardTitle}>Estimate Learning (Planning Fallacy)</Text>
                </View>
                <Text style={styles.cardDesc}>
                    Exponential Moving Average calibration (η = 0.25) tracking historical duration overrun:
                </Text>

                {Object.keys(baselines).length === 0 ? (
                    <View style={styles.emptyBaselines}>
                        <Text style={styles.emptyText}>Complete 4 focus sessions on any subject to activate self-learning.</Text>
                        <Pressable onPress={handleSimulateOverruns} style={[styles.calibrateBtn, { alignSelf: 'center', marginTop: 10, paddingHorizontal: 16 }]}>
                            <Text style={styles.calibrateBtnText}>Simulate 4 Calculus Sessions</Text>
                        </Pressable>
                    </View>
                ) : (
                    Object.entries(baselines).map(([key, data]) => {
                        const isCalibrated = calibratedMap[key];
                        return (
                            <View key={key} style={styles.baselineItem}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.baselineTitle}>{key.toUpperCase()}</Text>
                                    <Text style={styles.baselineDetail}>
                                        Bias Factor: {data.biasFactor}x • {data.sessionCount} sessions • {data.consecutiveOverrunCount} overruns
                                    </Text>
                                </View>
                                {data.shouldSuggestCalibration && !isCalibrated && (
                                    <View style={{ flexDirection: 'row', gap: 6 }}>
                                        <Pressable
                                            onPress={() => handleAcceptCalibration(key, data.biasFactor)}
                                            style={styles.calibrateBtn}
                                        >
                                            <Text style={styles.calibrateBtnText}>Calibrate ({data.biasFactor}x)</Text>
                                        </Pressable>
                                        <Pressable
                                            onPress={() => handleDismissCalibration(key)}
                                            style={[styles.calibrateBtn, { backgroundColor: '#2B2B38' }]}
                                        >
                                            <Text style={[styles.calibrateBtnText, { color: '#AAAABB' }]}>Dismiss</Text>
                                        </Pressable>
                                    </View>
                                )}
                                {isCalibrated && (
                                    <Text style={styles.calibratedTag}>✓ Calibrated</Text>
                                )}
                            </View>
                        );
                    })
                )}
                <Text style={styles.footerNote}>✓ Neutral zone in [0.90, 1.15] prevents erratic over-adjustments.</Text>
            </View>

            {/* Circadian Energy Curve Visualization */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Circadian Energy Curve</Text>
                <Text style={styles.cardDesc}>Matches task cognitive intensity to biological peak performance:</Text>
                <View style={styles.energyTimeline}>
                    <View style={[styles.energyBlock, { backgroundColor: '#10B98120', borderColor: '#10B98150' }]}>
                        <Text style={[styles.energyTime, { color: '#34D399' }]}>07:00 – 12:00</Text>
                        <Text style={styles.energyLabel}>Morning Deep Work (0.90)</Text>
                    </View>
                    <View style={[styles.energyBlock, { backgroundColor: '#38BDF820', borderColor: '#38BDF850' }]}>
                        <Text style={[styles.energyTime, { color: '#38BDF8' }]}>13:00 – 17:00</Text>
                        <Text style={styles.energyLabel}>Afternoon Practice (0.65)</Text>
                    </View>
                    <View style={[styles.energyBlock, { backgroundColor: '#A855F720', borderColor: '#A855F750' }]}>
                        <Text style={[styles.energyTime, { color: '#C084FC' }]}>18:00 – 21:30</Text>
                        <Text style={styles.energyLabel}>Evening Revision (0.45)</Text>
                    </View>
                    <View style={[styles.energyBlock, { backgroundColor: '#181824', borderColor: '#2E2E40' }]}>
                        <Text style={[styles.energyTime, { color: '#71717A' }]}>21:30 – 07:00</Text>
                        <Text style={styles.energyLabel}>Sleep & Wind-down (0.00)</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { gap: 14, paddingVertical: 8 },
    header: { marginBottom: 6 },
    heading: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    subheading: { color: '#A1A1B5', fontSize: 12, marginTop: 2 },
    card: { backgroundColor: '#14141E', borderRadius: 16, borderWidth: 1, borderColor: '#272738', padding: 16, gap: 10 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    engineTag: { backgroundColor: '#F43F5E20', color: '#FB7185', fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    cardTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
    cardDesc: { color: '#A1A1AA', fontSize: 12, lineHeight: 17 },
    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    metricItem: { backgroundColor: '#1B1B28', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, minWidth: '45%', flex: 1 },
    metricPts: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
    metricLabel: { color: '#71717A', fontSize: 10, marginTop: 1 },
    footerNote: { color: '#6EE7B7', fontSize: 11, fontStyle: 'italic', marginTop: 2 },
    pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    infoPill: { backgroundColor: '#1B1B28', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    infoPillText: { color: '#E4E4E7', fontSize: 11, fontWeight: '500' },
    equationBox: { backgroundColor: '#09090F', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#222230' },
    equationText: { color: '#38BDF8', fontSize: 12, fontFamily: 'monospace', textAlign: 'center' },
    emptyBaselines: { padding: 12, backgroundColor: '#09090F', borderRadius: 8, alignItems: 'center' },
    emptyText: { color: '#71717A', fontSize: 11, textAlign: 'center' },
    baselineItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1A1A27', padding: 10, borderRadius: 8 },
    baselineTitle: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    baselineDetail: { color: '#A1A1AA', fontSize: 11, marginTop: 2 },
    calibrateBtn: { backgroundColor: '#9333EA', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
    calibrateBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
    calibratedTag: { color: '#34D399', fontSize: 12, fontWeight: '600' },
    energyTimeline: { gap: 6, marginTop: 4 },
    energyBlock: { borderWidth: 1, borderRadius: 8, padding: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    energyTime: { fontSize: 11, fontWeight: '700', fontFamily: 'monospace' },
    energyLabel: { color: '#D4D4D8', fontSize: 11, fontWeight: '500' }
});
