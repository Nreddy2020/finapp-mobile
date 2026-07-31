import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { X, Package, ChevronRight, CheckCircle2, Clock, PlayCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function BatchTracking({ visible, onClose }) {
    const [batches, setBatches] = useState([
        { id: 'B-102', item: 'Cotton Shirts', stage: 'Sewing', progress: 65, status: 'active' },
        { id: 'B-103', item: 'Denim Jeans', stage: 'Cutting', progress: 30, status: 'active' },
        { id: 'B-104', item: 'Silk Scarves', stage: 'Finishing', progress: 90, status: 'active' },
    ]);

    const stages = ['Cutting', 'Sewing', 'Finishing', 'Packaging', 'Completed'];

    const advanceStage = (id) => {
        setBatches(batches.map(b => {
            if (b.id === id) {
                const currentIndex = stages.indexOf(b.stage);
                if (currentIndex < stages.length - 1) {
                    const nextStage = stages[currentIndex + 1];
                    const newProgress = Math.round(((currentIndex + 1) / (stages.length - 1)) * 100);
                    return { ...b, stage: nextStage, progress: newProgress, status: nextStage === 'Completed' ? 'done' : 'active' };
                }
            }
            return b;
        }));
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <Package size={24} color="#D97706" />
                            <Text style={styles.title}>Batch Tracking</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#A1A1AA" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Track production flow and stage progress.</Text>

                    <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                        {batches.map((batch) => (
                            <View key={batch.id} style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.batchId}>{batch.id}</Text>
                                    <View style={styles.itemBadge}>
                                        <Text style={styles.itemText}>{batch.item}</Text>
                                    </View>
                                </View>

                                <View style={styles.stageContainer}>
                                    <View style={styles.stageInfo}>
                                        <Text style={styles.stageLabel}>Current Stage</Text>
                                        <Text style={styles.stageValue}>{batch.stage}</Text>
                                    </View>
                                    <View style={styles.progressRing}>
                                        <Text style={styles.progressText}>{batch.progress}%</Text>
                                    </View>
                                </View>

                                <View style={styles.progressBarBg}>
                                    <View style={[styles.progressBarFill, { width: `${batch.progress}%` }]} />
                                </View>

                                {batch.status !== 'done' ? (
                                    <TouchableOpacity style={styles.advanceBtn} onPress={() => advanceStage(batch.id)}>
                                        <LinearGradient
                                            colors={['#27272A', '#27272A']}
                                            style={styles.btnGradient}
                                        >
                                            <Text style={styles.btnText}>Advance Stage</Text>
                                            <ChevronRight size={16} color="#D97706" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                ) : (
                                    <View style={styles.doneBadge}>
                                        <CheckCircle2 size={16} color="#10B981" />
                                        <Text style={styles.doneText}>Batch Completed</Text>
                                    </View>
                                )}
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: '#00000080', justifyContent: 'flex-end' },
    container: { backgroundColor: '#18181B', height: '85%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    subtitle: { color: '#A1A1AA', fontSize: 13, marginBottom: 24 },
    list: { flex: 1 },
    card: { backgroundColor: '#27272A', padding: 16, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    batchId: { color: '#FFF', fontWeight: '800', fontSize: 18 },
    itemBadge: { backgroundColor: '#D9770620', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    itemText: { color: '#D97706', fontWeight: '700', fontSize: 12 },
    stageContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    stageLabel: { color: '#71717A', fontSize: 12, marginBottom: 4 },
    stageValue: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    progressRing: { width: 40, height: 40, borderRadius: 20, borderWidth: 3, borderColor: '#D97706', alignItems: 'center', justifyContent: 'center' },
    progressText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    progressBarBg: { height: 6, backgroundColor: '#3F3F46', borderRadius: 3, marginBottom: 16, overflow: 'hidden' },
    progressBarFill: { height: '100%', backgroundColor: '#D97706', borderRadius: 3 },
    advanceBtn: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: '#D9770650' },
    btnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 12, gap: 8 },
    btnText: { color: '#D97706', fontWeight: '700', fontSize: 14 },
    doneBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: '#10B98110', borderRadius: 12 },
    doneText: { color: '#10B981', fontWeight: '700' }
});
