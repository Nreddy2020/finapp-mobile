import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet } from 'react-native';
import { Target, Plus, TrendingUp, Sparkles, Coins, ArrowRight, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getSavingsGoals } from '../../services/api';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { useGlobalFinance } from '../../components/context/GlobalFinanceContext';

import { saveData, loadData, STORAGE_KEYS } from '../../services/storage';
import AddGoalModal from '../../components/savings/AddGoalModal';

// Service
import { SavingsService } from '../../services/savings';

export default function SavingsGoalsScreen() {
    const { inflationRate, formatAmount } = useGlobalFinance();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [showInflationImpact, setShowInflationImpact] = useState(true);

    const fetchGoals = async () => {
        try {
            const data = await SavingsService.getGoals();
            setGoals(data);
        } catch (error) {
            console.error('Error fetching goals:', error);
            setGoals([]);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    // No need for persist effect, service handles it

    const onRefresh = () => {
        setRefreshing(true);
        fetchGoals();
    };

    const totalSaved = SavingsService.calculateTotalSaved(goals);
    const THEME_COLOR = '#14B8A6'; // Teal

    return (
        <AnimatedScreen style={styles.container}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={THEME_COLOR}
                        colors={[THEME_COLOR]}
                        progressBackgroundColor="#18181B"
                    />
                }
                showsVerticalScrollIndicator={false}
            >
                <StackHeader title="Savings" subtitle="Achievements" />

                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Total Saved</Text>
                            <Text style={styles.heroAmount}>₹{totalSaved.toLocaleString('en-IN')}</Text>

                            {/* Survival Months Logic */}
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
                                <View style={{ backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#10B98140' }}>
                                    <Text style={{ color: '#10B981', fontWeight: '800', fontSize: 12 }}>
                                        {(totalSaved / 50000).toFixed(1)} Months of Survival
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.heroFooter, { marginTop: 24 }]}>
                                <View style={styles.heroIconBadge}>
                                    <Target size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>towards {goals.length} aspirational goals</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Goals</Text>

                    {goals.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Sparkles size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No goals set</Text>
                            <Text style={styles.emptySubtext}>Save for what truly matters</Text>
                        </View>
                    ) : (
                        goals.map((goal, index) => {
                            const current = parseFloat(goal.current_amount || 0);
                            const target = parseFloat(goal.target_amount || 1);
                            const progress = Math.min(current / target, 1);

                            // Calculate inflation-adjusted values
                            const yearsToGoal = goal.target_date ?
                                (new Date(goal.target_date) - new Date()) / (365 * 24 * 60 * 60 * 1000) : 5;
                            const inflationAdjustedTarget = target * Math.pow(1 + (inflationRate / 100), Math.max(yearsToGoal, 0));
                            const realValue = current / Math.pow(1 + (inflationRate / 100), 1); // Current value adjusted for 1 year inflation
                            const purchasingPowerLoss = current - realValue;

                            return (
                                <LuxuryCard
                                    key={index}
                                    index={index}
                                    style={styles.goalCard}
                                    onPress={() => {
                                        setEditingGoal(goal);
                                        setModalVisible(true);
                                    }}
                                >
                                    <LinearGradient
                                        colors={[`${THEME_COLOR}10`, '#00000000']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={styles.cardGlow}
                                    />
                                    <View style={styles.cardHeader}>
                                        <Text style={styles.goalName}>{goal.name}</Text>
                                        <Text style={styles.amountText}>
                                            ₹{current.toLocaleString('en-IN')} <Text style={styles.limitText}>/ ₹{target.toLocaleString('en-IN')}</Text>
                                        </Text>
                                    </View>
                                    <View style={styles.progressContainer}>
                                        <View style={styles.progressBar}>
                                            <LinearGradient
                                                colors={[THEME_COLOR, '#5EEAD4']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={[styles.progressFill, { width: `${progress * 100}%` }]}
                                            />
                                        </View>
                                        <Text style={styles.progressLabel}>{Math.round(progress * 100)}%</Text>
                                    </View>

                                    {/* Inflation Impact Warning */}
                                    {showInflationImpact && yearsToGoal > 0 && (
                                        <View style={{ marginTop: 12, backgroundColor: '#F59E0B10', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#F59E0B30' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                <AlertTriangle size={14} color="#F59E0B" />
                                                <Text style={{ fontSize: 11, color: '#F59E0B', fontWeight: '700' }}>Inflation Impact</Text>
                                            </View>
                                            <Text style={{ fontSize: 11, color: '#A1A1AA', lineHeight: 16 }}>
                                                Due to {inflationRate.toFixed(1)}% inflation, you'll need ₹{inflationAdjustedTarget.toLocaleString('en-IN')} in {Math.round(yearsToGoal)} years to match today's ₹{target.toLocaleString('en-IN')} purchasing power.
                                            </Text>
                                        </View>
                                    )}
                                </LuxuryCard>
                            );
                        })
                    )}
                </View>

                {/* Smart Auto-Save Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Boost Your Savings</Text>
                    <LuxuryCard style={{ backgroundColor: '#18181B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: isAutoSaveEnabled ? '#14B8A6' : '#FFFFFF08' }} onPress={() => setIsAutoSaveEnabled(!isAutoSaveEnabled)}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: isAutoSaveEnabled ? '#14B8A620' : '#27272A', justifyContent: 'center', alignItems: 'center' }}>
                                    <Coins size={20} color={isAutoSaveEnabled ? '#14B8A6' : '#71717A'} />
                                </View>
                                <View>
                                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#FFF' }}>Smart Auto-Save</Text>
                                    <Text style={{ fontSize: 13, color: '#A1A1AA' }}>Round up daily purchases</Text>
                                </View>
                            </View>
                            <View style={{ width: 48, height: 28, borderRadius: 16, backgroundColor: isAutoSaveEnabled ? '#14B8A6' : '#27272A', alignItems: isAutoSaveEnabled ? 'flex-end' : 'flex-start', justifyContent: 'center', paddingHorizontal: 4 }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFF' }} />
                            </View>
                        </View>

                        {isAutoSaveEnabled && (
                            <View style={{ backgroundColor: '#14B8A610', borderRadius: 16, padding: 16 }}>
                                <Text style={{ color: '#14B8A6', fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
                                    You're saving ≈ ₹1,240/mo extra!
                                </Text>
                                <Text style={{ color: '#A1A1AA', fontSize: 12 }}>
                                    Based on your last 30 transactions.
                                </Text>
                            </View>
                        )}
                    </LuxuryCard>
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => {
                        setEditingGoal(null);
                        setModalVisible(true);
                    }}
                    index={goals.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Set New Goal</Text>
                </LuxuryCard>
            </ScrollView>

            <AddGoalModal
                visible={modalVisible}
                onClose={() => {
                    setModalVisible(false);
                    setEditingGoal(null);
                }}
                editingGoal={editingGoal}
                onSave={async (newGoal) => {
                    let updatedGoals;
                    if (editingGoal) {
                        updatedGoals = await SavingsService.updateGoal(newGoal);
                    } else {
                        updatedGoals = await SavingsService.addGoal(newGoal);
                    }
                    setGoals(updatedGoals);
                    setModalVisible(false);
                    setEditingGoal(null);
                }}
                onDelete={async (id) => {
                    const updatedGoals = await SavingsService.deleteGoal(id);
                    setGoals(updatedGoals);
                    setModalVisible(false);
                    setEditingGoal(null);
                }}
            />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    header: { padding: 24, paddingTop: 60, paddingBottom: 24 },
    headerLabel: { fontSize: 13, color: '#71717A', marginBottom: 8, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase' },
    title: { fontSize: 36, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 },
    heroCardWrapper: { marginHorizontal: 24, marginBottom: 40 },
    heroCard: { position: 'relative', borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF08' },
    heroGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.6 },
    heroContent: { padding: 32 },
    heroLabel: { fontSize: 13, color: '#A1A1AA', marginBottom: 16, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase' },
    heroAmount: { fontSize: 52, fontWeight: '900', color: '#FFFFFF', marginBottom: 24, letterSpacing: -2 },
    heroFooter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#14B8A6', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },
    goalCard: { position: 'relative', backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: 0, left: 0, bottom: 0, width: 140, opacity: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    goalName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
    amountText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    limitText: { color: '#71717A', fontWeight: '500' },
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    progressBar: { flex: 1, height: 6, backgroundColor: '#27272A', borderRadius: 999, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 999 },
    progressLabel: { fontSize: 12, fontWeight: '800', color: '#14B8A6', width: 32, textAlign: 'right' },
    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#14B8A608', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#14B8A615' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#14B8A650' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#14B8A6', letterSpacing: 0.5 },
});
