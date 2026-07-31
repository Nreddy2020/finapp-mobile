import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, Alert, Modal } from 'react-native';
import { Shield, TrendingUp, AlertTriangle, ChevronLeft, Plus, Target, Clock, X } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import StatCard from '../components/ui/StatCard';
import { PlanningService } from '../services/planning';
import { StorageService, STORAGE_KEYS } from '../services/storage';

export default function EmergencyFundScreen() {
    const router = useRouter();
    const [stats, setStats] = useState({
        monthlyExpenses: 0,
        monthsRequired: 6,
        currentFund: 0
    });
    const [showEditModal, setShowEditModal] = useState(false);
    const [tempExpenses, setTempExpenses] = useState('');
    const [tempMonths, setTempMonths] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Try to pre-fill expenses from Storage if available (mock integration)
        const budgetData = await StorageService.load(STORAGE_KEYS.BUDGETS);
        const estimatedExpenses = budgetData ? budgetData.reduce((sum, b) => sum + b.limit, 0) : 40000;

        const data = await PlanningService.getEmergencyFund();

        // If first time, suggest estimated expenses
        if (data.monthlyExpenses === 0 && estimatedExpenses > 0) {
            data.monthlyExpenses = estimatedExpenses;
            await PlanningService.saveEmergencyFund(data);
        }

        setStats(data);
    };

    const updateFund = async (amountDelta) => {
        const newData = { ...stats, currentFund: stats.currentFund + amountDelta };
        await PlanningService.saveEmergencyFund(newData);
        setStats(newData);
    };

    const handleSaveSettings = async () => {
        if (!tempExpenses || !tempMonths) return;
        const newData = {
            ...stats,
            monthlyExpenses: parseFloat(tempExpenses),
            monthsRequired: parseInt(tempMonths)
        };
        await PlanningService.saveEmergencyFund(newData);
        setStats(newData);
        setShowEditModal(false);
    };

    const openSettings = () => {
        setTempExpenses(stats.monthlyExpenses.toString());
        setTempMonths(stats.monthsRequired.toString());
        setShowEditModal(true);
    };

    const targetAmount = stats.monthlyExpenses * stats.monthsRequired;
    const monthsRunway = stats.monthlyExpenses > 0 ? (stats.currentFund / stats.monthlyExpenses).toFixed(1) : 0;
    const progress = Math.min(100, (stats.currentFund / targetAmount) * 100);
    const isSafe = parseFloat(monthsRunway) >= 3;

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Emergency Fund</Text>
                <Pressable onPress={openSettings} style={styles.settingsBtn}>
                    <Text style={styles.settingsText}>Edit Goal</Text>
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Main Status Card */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={[isSafe ? '#10B98120' : '#EF444420', '#000000']}
                        style={styles.heroBackground}
                    />
                    <View style={styles.ringContainer}>
                        <View style={[styles.ring, { borderColor: isSafe ? '#10B981' : '#EF4444' }]}>
                            <View style={styles.innerRing}>
                                <Shield size={48} color={isSafe ? '#10B981' : '#EF4444'} />
                                <Text style={styles.runwayText}>{monthsRunway} Months</Text>
                                <Text style={styles.runwayLabel}>Survival Time</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={styles.statusTitle}>
                        {isSafe ? 'You are Safe! 🛡️' : 'Action Needed ⚠️'}
                    </Text>
                    <Text style={styles.statusDesc}>
                        {isSafe
                            ? `You have enough savings to cover ${parseInt(monthsRunway)} months of expenses.`
                            : `Aim for at least 3 months (₹${(stats.monthlyExpenses * 3).toLocaleString()}) to stay secure.`}
                    </Text>
                </View>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <StatCard
                        label="Current Fund"
                        value={`₹${stats.currentFund.toLocaleString()}`}
                        icon={Shield}
                        iconColor="#6366F1"
                    />
                    <StatCard
                        label={`Target (${stats.monthsRequired} Mo)`}
                        value={`₹${targetAmount.toLocaleString()}`}
                        icon={Target}
                        iconColor="#F59E0B"
                    />
                </View>

                {/* Monthly Burn Rate */}
                <LuxuryCard style={styles.burnCard}>
                    <View style={styles.row}>
                        <View style={styles.iconBox}>
                            <Clock size={24} color="#A1A1AA" />
                        </View>
                        <View>
                            <Text style={styles.label}>Monthly Expenses</Text>
                            <Text style={styles.value}>₹{stats.monthlyExpenses.toLocaleString()}/mo</Text>
                        </View>
                    </View>
                </LuxuryCard>

                {/* Quick Add Buttons */}
                <View style={styles.quickAddRow}>
                    <Pressable style={styles.quickBtn} onPress={() => updateFund(1000)}>
                        <Text style={styles.quickText}>+ ₹1k</Text>
                    </Pressable>
                    <Pressable style={styles.quickBtn} onPress={() => updateFund(5000)}>
                        <Text style={styles.quickText}>+ ₹5k</Text>
                    </Pressable>
                    <Pressable style={styles.quickBtn} onPress={() => updateFund(10000)}>
                        <Text style={styles.quickText}>+ ₹10k</Text>
                    </Pressable>
                </View>

                {/* Action Button */}
                <Pressable
                    style={styles.actionButton}
                    onPress={() => {
                        Alert.prompt('Add Custom Amount', 'Enter amount to save', [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Add', onPress: val => updateFund(parseFloat(val)) }
                        ], 'plain-text', '', 'numeric');
                    }}
                >
                    <LinearGradient
                        colors={['#6366F1', '#4F46E5']}
                        style={styles.gradientBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Plus color="#FFF" size={20} />
                        <Text style={styles.btnText}>Add Funds</Text>
                    </LinearGradient>
                </Pressable>
            </ScrollView>

            {/* Edit Goal Modal */}
            <Modal visible={showEditModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Configure Goals</Text>

                        <Text style={styles.inputLabel}>Monthly Expenses (₹)</Text>
                        <TextInput
                            style={styles.input}
                            value={tempExpenses}
                            onChangeText={setTempExpenses}
                            keyboardType="numeric"
                        />

                        <Text style={styles.inputLabel}>Target Months</Text>
                        <TextInput
                            style={styles.input}
                            value={tempMonths}
                            onChangeText={setTempMonths}
                            keyboardType="numeric"
                        />

                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setShowEditModal(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleSaveSettings}>
                                <Text style={styles.btnText}>Save</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    settingsBtn: { padding: 8 },
    settingsText: { color: '#F59E0B', fontWeight: '600' },

    content: { padding: 20 },
    heroSection: { alignItems: 'center', marginBottom: 32, padding: 24, borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10' },
    heroBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    ringContainer: { marginBottom: 20 },
    ring: { width: 180, height: 180, borderRadius: 90, borderWidth: 8, justifyContent: 'center', alignItems: 'center', borderStyle: 'solid' },
    innerRing: { alignItems: 'center' },
    runwayText: { fontSize: 32, fontWeight: '900', color: '#FFF', marginTop: 12 },
    runwayLabel: { fontSize: 14, color: '#A1A1AA', fontWeight: '500' },
    statusTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 8 },
    statusDesc: { fontSize: 14, color: '#A1A1AA', textAlign: 'center', lineHeight: 20 },
    statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    burnCard: { padding: 20, marginBottom: 24 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center' },
    label: { fontSize: 14, color: '#A1A1AA', marginBottom: 4 },
    value: { fontSize: 20, fontWeight: '700', color: '#FFF' },

    quickAddRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    quickBtn: { flex: 1, padding: 12, backgroundColor: '#18181B', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    quickText: { color: '#10B981', fontWeight: '700' },

    actionButton: { borderRadius: 16, overflow: 'hidden', marginTop: 8 },
    gradientBtn: { padding: 18, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 24, textAlign: 'center' },
    inputLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 4, marginLeft: 4 },
    input: { backgroundColor: '#27272A', color: '#FFF', padding: 16, borderRadius: 16, marginBottom: 16, fontSize: 16 },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
    cancelBtn: { flex: 1, padding: 16, backgroundColor: '#333', borderRadius: 16, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 16, backgroundColor: '#6366F1', borderRadius: 16, alignItems: 'center' },
    btnText: { fontSize: 16, fontWeight: '700', color: '#FFF' }
});
