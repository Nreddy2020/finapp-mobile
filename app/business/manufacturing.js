import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Factory, Package, Wrench, AlertTriangle, Plus, ArrowLeft, MoreVertical, TrendingUp, CheckCircle2, X, Activity } from 'lucide-react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { updateBusinessStats } from '../../services/storage';

// New Components
import BatchTracking from '../../components/business/manufacturing/BatchTracking';
import OEEDashboard from '../../components/business/manufacturing/OEEDashboard';
import MaintenanceAI from '../../components/business/manufacturing/MaintenanceAI';

export default function ManufacturingModule() {
    const router = useRouter();
    const [modalVisible, setModalVisible] = useState(false);
    const [showBatches, setShowBatches] = useState(false);
    const [showOEE, setShowOEE] = useState(false);
    const [showMaintenance, setShowMaintenance] = useState(false);

    // Mock Data
    const [productionLog, setProductionLog] = useState([
        { id: 1, batch: 'B-102', item: 'Cotton Shirts', units: 500, status: 'completed', defects: 2 },
        { id: 2, batch: 'B-103', item: 'Denim Jeans', units: 200, status: 'in-progress', defects: 0 },
        { id: 3, batch: 'B-104', item: 'Cotton Shirts', units: 500, status: 'scheduled', defects: 0 },
        { id: 4, batch: 'B-105', item: 'Silk Scarves', units: 100, status: 'completed', defects: 5 },
    ]);

    // New Batch Form State
    const [newBatch, setNewBatch] = useState({ item: '', units: '', batchId: '' });

    // Derived Stats
    const stats = useMemo(() => {
        const totalUnits = productionLog.reduce((sum, batch) => sum + batch.units, 0);
        const totalDefects = productionLog.reduce((sum, batch) => sum + batch.defects, 0);
        const completedBatches = productionLog.filter(b => b.status === 'completed').length;

        // Mock calculations
        const defectRate = totalUnits > 0 ? ((totalDefects / totalUnits) * 100).toFixed(1) : 0;
        const efficiency = completedBatches > 0 ? 94 : 100; // Mock efficiency logic
        const materialCost = totalUnits * 45; // Approx cost per unit

        return {
            dailyOutput: totalUnits, // Showing cumulative for demo
            efficiency: efficiency,
            defectsRate: defectRate,
            materialCost: materialCost
        };
    }, [productionLog]);

    // Persist Stats
    React.useEffect(() => {
        updateBusinessStats('manufacturing', {
            calculatedRevenue: stats.dailyOutput * 120, // Est revenue per unit
            ...stats
        });
    }, [stats]);

    const handleAddBatch = () => {
        if (!newBatch.item || !newBatch.units || !newBatch.batchId) return;

        const batch = {
            id: Date.now(),
            batch: newBatch.batchId,
            item: newBatch.item,
            units: parseInt(newBatch.units),
            status: 'scheduled',
            defects: 0
        };

        setProductionLog([batch, ...productionLog]);
        setNewBatch({ item: '', units: '', batchId: '' });
        setModalVisible(false);
    };

    return (
        <AnimatedScreen style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                        <ArrowLeft size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.headerLabel}>Business Module</Text>
                        <Text style={styles.title}>Production</Text>
                    </View>
                    <TouchableOpacity style={styles.menuButton}>
                        <MoreVertical size={24} color="#FFFFFF" />
                    </TouchableOpacity>
                </View>

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <LinearGradient
                        colors={['#D97706', '#B45309']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroCard}
                    >
                        <View style={styles.heroHeader}>
                            <View style={styles.iconBadge}>
                                <Factory size={20} color="#FFFFFF" />
                            </View>
                            <Text style={styles.heroTitle}>Sunrise Garments</Text>
                        </View>

                        <View style={styles.mainStat}>
                            <Text style={styles.mainStatLabel}>Total Output</Text>
                            <Text style={styles.mainStatValue}>{stats.dailyOutput} Units</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Efficiency</Text>
                                <Text style={styles.miniStatValue}>{stats.efficiency}%</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Defects</Text>
                                <Text style={styles.miniStatValue}>{stats.defectsRate}%</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.miniStat}>
                                <Text style={styles.miniStatLabel}>Mat. Cost</Text>
                                <Text style={styles.miniStatValue}>₹{(stats.materialCost / 1000).toFixed(1)}k</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowBatches(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Package size={24} color="#D97706" />
                            <Text style={styles.actionText}>Track Batches</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowOEE(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Activity size={24} color="#D97706" />
                            <Text style={styles.actionText}>OEE Stats</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButton} onPress={() => setShowMaintenance(true)}>
                        <LinearGradient
                            colors={['#18181B', '#18181B']}
                            style={styles.actionGradient}
                        >
                            <Wrench size={24} color="#D97706" />
                            <Text style={styles.actionText}>Health AI</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Production Log */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Active Batches</Text>
                        <TouchableOpacity style={styles.filterButton} onPress={() => setModalVisible(true)}>
                            <Plus size={14} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.filterText}>New Batch</Text>
                        </TouchableOpacity>
                    </View>

                    {productionLog.map((batch) => (
                        <View key={batch.id} style={styles.batchCard}>
                            <View style={styles.batchHeader}>
                                <View style={styles.batchId}>
                                    <Text style={styles.batchIdText}>{batch.batch}</Text>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    batch.status === 'completed' ? styles.statusSuccess :
                                        batch.status === 'in-progress' ? styles.statusProgress : styles.statusPending
                                ]}>
                                    <Text style={[
                                        styles.statusText,
                                        batch.status === 'completed' ? styles.textSuccess :
                                            batch.status === 'in-progress' ? styles.textProgress : styles.textPending
                                    ]}>{batch.status}</Text>
                                </View>
                            </View>

                            <Text style={styles.itemName}>{batch.item}</Text>

                            <View style={styles.batchMeta}>
                                <View style={styles.metaItem}>
                                    <Package size={14} color="#71717A" />
                                    <Text style={styles.metaText}>{batch.units} Units</Text>
                                </View>
                                {batch.defects > 0 && (
                                    <View style={styles.metaItem}>
                                        <AlertTriangle size={14} color="#EF4444" />
                                        <Text style={[styles.metaText, { color: '#EF4444' }]}>{batch.defects} Defects</Text>
                                    </View>
                                )}
                            </View>

                            {batch.status === 'in-progress' && (
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: '60%' }]} />
                                </View>
                            )}
                        </View>
                    ))}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* New Batch Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>New Production Batch</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <X size={24} color="#FFFFFF" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Batch ID</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. B-105"
                                placeholderTextColor="#52525B"
                                value={newBatch.batchId}
                                onChangeText={(text) => setNewBatch({ ...newBatch, batchId: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Item Name</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. Linen Trousers"
                                placeholderTextColor="#52525B"
                                value={newBatch.item}
                                onChangeText={(text) => setNewBatch({ ...newBatch, item: text })}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <Text style={styles.inputLabel}>Units</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g. 1000"
                                placeholderTextColor="#52525B"
                                keyboardType="numeric"
                                value={newBatch.units}
                                onChangeText={(text) => setNewBatch({ ...newBatch, units: text })}
                            />
                        </View>

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleAddBatch}
                        >
                            <LinearGradient
                                colors={['#D97706', '#B45309']}
                                style={styles.saveGradient}
                            >
                                <Text style={styles.saveText}>Schedule Batch</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Feature Modals */}
            <BatchTracking visible={showBatches} onClose={() => setShowBatches(false)} />
            <OEEDashboard visible={showOEE} onClose={() => setShowOEE(false)} />
            <MaintenanceAI visible={showMaintenance} onClose={() => setShowMaintenance(false)} />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingTop: 60,
        paddingBottom: 40,
    },
    header: {
        paddingHorizontal: 24,
        marginBottom: 24,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    menuButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#18181B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#FFFFFF10',
        marginLeft: 'auto'
    },
    headerLabel: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '700',
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 4
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    heroCardWrapper: {
        paddingHorizontal: 24,
        marginBottom: 24
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        position: 'relative'
    },
    heroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24
    },
    iconBadge: {
        width: 32,
        height: 32,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center'
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    mainStat: {
        marginBottom: 24
    },
    mainStatLabel: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 4
    },
    mainStatValue: {
        fontSize: 36,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -1
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.2)',
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between'
    },
    miniStat: {
        alignItems: 'center',
        flex: 1
    },
    miniStatLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.6)',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '600'
    },
    miniStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    actionsRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        gap: 12,
        marginBottom: 32
    },
    actionButton: {
        flex: 1,
        height: 70,
        borderRadius: 16,
        overflow: 'hidden'
    },
    actionGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#FFFFFF10',
        borderRadius: 16
    },
    actionText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    section: {
        paddingHorizontal: 24
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#27272A',
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    filterText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#A1A1AA'
    },
    batchCard: {
        backgroundColor: '#18181B',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#FFFFFF08'
    },
    batchHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    batchId: {
        backgroundColor: '#27272A',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6
    },
    batchIdText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#A1A1AA'
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1
    },
    statusSuccess: { backgroundColor: '#10B98115', borderColor: '#10B98130' },
    statusProgress: { backgroundColor: '#3B82F615', borderColor: '#3B82F630' },
    statusPending: { backgroundColor: '#71717A15', borderColor: '#71717A30' },
    statusText: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    textSuccess: { color: '#10B981' },
    textProgress: { color: '#3B82F6' },
    textPending: { color: '#71717A' },
    itemName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 8
    },
    batchMeta: {
        flexDirection: 'row',
        gap: 16
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6
    },
    metaText: {
        fontSize: 13,
        color: '#71717A',
        fontWeight: '500'
    },
    progressBar: {
        height: 4,
        backgroundColor: '#27272A',
        borderRadius: 2,
        marginTop: 12,
        overflow: 'hidden'
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 2
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#18181B',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 1,
        borderTopColor: '#FFFFFF10'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '900',
        color: '#FFFFFF',
        letterSpacing: -0.5
    },
    inputContainer: {
        marginBottom: 20
    },
    inputLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#71717A',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    input: {
        backgroundColor: '#27272A',
        borderRadius: 16,
        padding: 16,
        fontSize: 16,
        color: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#FFFFFF10'
    },
    saveButton: {
        marginTop: 12,
        height: 56,
        borderRadius: 16,
        overflow: 'hidden'
    },
    saveGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    saveText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF'
    }
});
