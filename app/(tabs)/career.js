import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, TextInput } from 'react-native';
import { Briefcase, Plus, Target, Sparkles, TrendingUp, DollarSign, ChevronDown, ChevronUp } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getCareerGoals } from '../../services/api';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { COLORS } from '../../constants/theme';

export default function CareerScreen() {
    const [goals, setGoals] = useState([]);
    const [refreshing, setRefreshing] = useState(false);
    const [expandedGoal, setExpandedGoal] = useState(null);

    const fetchGoals = async () => {
        try {
            const data = await getCareerGoals();
            setGoals(data);
        } catch (error) {
            console.error('Error fetching career goals:', error);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchGoals();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchGoals();
    };

    const toggleFinancials = (id) => {
        setExpandedGoal(expandedGoal === id ? null : id);
    }

    const activeGoals = goals.filter(g => g.status === 'In Progress' || g.status === 'Planning').length; // Corrected status matching
    const THEME_COLOR = '#E11D48'; // Rose/Red

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [newGoal, setNewGoal] = useState({ goal: '', target_date: '', investment: '', progress: '0' });

    const handleAddGoal = async () => {
        if (!newGoal.goal || !newGoal.investment) {
            alert("Please fill in required fields");
            return;
        }

        const goalEntry = {
            id: Date.now().toString(),
            status: 'Planning',
            ...newGoal,
            target_date: newGoal.target_date || new Date(Date.now() + 31536000000).toISOString(), // +1 year default
            progress: parseInt(newGoal.progress) || 0
        };

        const updatedGoals = [goalEntry, ...goals];
        setGoals(updatedGoals);

        // Persist
        await import('../../services/storage').then(mod => mod.updateCareerStats(updatedGoals));

        setModalVisible(false);
        setNewGoal({ goal: '', target_date: '', investment: '', progress: '0' });
    };

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
                <StackHeader title="Career" subtitle="Ambitions" />

                {/* Hero Card */}
                <View style={styles.heroCardWrapper}>
                    <View style={styles.heroCard}>
                        <LinearGradient
                            colors={[`${THEME_COLOR}60`, '#00000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroGlow}
                        />
                        <View style={styles.heroContent}>
                            <Text style={styles.heroLabel}>Active Targets</Text>
                            <Text style={styles.heroAmount}>{activeGoals}</Text>
                            <View style={styles.heroFooter}>
                                <View style={styles.heroIconBadge}>
                                    <Target size={14} color="#FFFFFF" strokeWidth={2.5} />
                                </View>
                                <Text style={styles.heroSubtext}>goals for professional growth</Text>
                            </View>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Milestones</Text>

                    {goals.length === 0 ? (
                        <View style={styles.emptyCard}>
                            <View style={styles.emptyIconContainer}>
                                <Briefcase size={32} color={THEME_COLOR} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyText}>No goals set</Text>
                            <Text style={styles.emptySubtext}>Define your path to success</Text>
                        </View>
                    ) : (
                        goals.map((goal, index) => {
                            const investment = parseFloat(goal.investment || 0);
                            const remaining = investment * (1 - (goal.progress / 100));

                            return (
                                <LuxuryCard
                                    key={index}
                                    index={index}
                                    style={styles.goalCard}
                                    onPress={() => toggleFinancials(goal.id)}
                                >
                                    <View style={styles.cardHeader}>
                                        <View style={styles.cardIcon}>
                                            <TrendingUp size={24} color={THEME_COLOR} strokeWidth={2.5} />
                                        </View>
                                        <View style={styles.headerContent}>
                                            <Text style={styles.goalName}>{goal.goal || goal.title || goal.name || 'Career Goal'}</Text>
                                            <Text style={styles.targetDate}>
                                                Target: {(() => {
                                                    const rawDate = goal.target_date || goal.targetDate || goal.deadline;
                                                    if (!rawDate) return 'Dec 2026';
                                                    const parsed = new Date(rawDate);
                                                    return isNaN(parsed.getTime()) ? String(rawDate) : parsed.toLocaleDateString();
                                                })()}
                                            </Text>
                                        </View>
                                        <View style={styles.headerRight}>
                                            <View style={styles.progressBadge}>
                                                <Text style={styles.progressText}>{goal.progress}%</Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `${goal.progress || 0}%`, backgroundColor: THEME_COLOR }]} />
                                    </View>

                                    {/* Collapsible Financial Section */}
                                    {expandedGoal === goal.id && (
                                        <View style={styles.financialSection}>
                                            <View style={styles.divider} />
                                            <View style={styles.finHeader}>
                                                <Text style={styles.finTitle}>Financial Plan</Text>
                                                <DollarSign size={14} color="#10B981" />
                                            </View>
                                            <View style={styles.finRow}>
                                                <View>
                                                    <Text style={styles.finLabel}>Total Required</Text>
                                                    <Text style={styles.finValue}>₹{investment.toLocaleString('en-IN')}</Text>
                                                </View>
                                                <View style={{ alignItems: 'flex-end' }}>
                                                    <Text style={styles.finLabel}>Remaining</Text>
                                                    <Text style={[styles.finValue, { color: '#F59E0B' }]}>₹{remaining.toLocaleString('en-IN')}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.actionBtn}>
                                                <Text style={styles.actionBtnText}>Add Funds</Text>
                                            </View>
                                        </View>
                                    )}

                                    <View style={styles.expandHint}>
                                        <Text style={styles.expandText}>{expandedGoal === goal.id ? 'Close Financials' : 'View Financials'}</Text>
                                        {expandedGoal === goal.id ? <ChevronUp size={14} color="#71717A" /> : <ChevronDown size={14} color="#71717A" />}
                                    </View>
                                </LuxuryCard>
                            );
                        })
                    )}
                </View>

                <LuxuryCard
                    style={styles.addButton}
                    onPress={() => setModalVisible(true)}
                    index={goals.length + 1}
                >
                    <Plus size={24} color={THEME_COLOR} strokeWidth={2.5} />
                    <Text style={styles.addButtonText}>Set New Goal</Text>
                </LuxuryCard>

                {/* ADD GOAL MODAL */}
                <React.Fragment>
                    {modalVisible && (
                        <View style={styles.modalOverlay}>
                            <View style={styles.modalContent}>
                                <Text style={styles.modalTitle}>New Career Goal</Text>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>GOAL NAME</Text>
                                    <View style={styles.textInputWrapper}>
                                        <Briefcase size={20} color={COLORS.gray400} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="e.g. Senior Developer"
                                            placeholderTextColor={COLORS.gray500}
                                            value={newGoal.goal}
                                            onChangeText={(t) => setNewGoal({ ...newGoal, goal: t })}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.inputLabel}>ESTIMATED COST / SALARY INCREASE (₹)</Text>
                                    <View style={styles.textInputWrapper}>
                                        <DollarSign size={20} color={COLORS.gray400} />
                                        <TextInput
                                            style={styles.textInput}
                                            placeholder="1,00,000"
                                            placeholderTextColor={COLORS.gray500}
                                            keyboardType="numeric"
                                            value={newGoal.investment}
                                            onChangeText={(t) => setNewGoal({ ...newGoal, investment: t })}
                                        />
                                    </View>
                                </View>

                                <View style={styles.modalActions}>
                                    <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                                        <Text style={styles.cancelBtnText}>Cancel</Text>
                                    </Pressable>
                                    <Pressable style={styles.saveBtn} onPress={handleAddGoal}>
                                        <LinearGradient
                                            colors={[THEME_COLOR, '#BE123C']}
                                            style={styles.saveBtnGradient}
                                        >
                                            <Text style={styles.saveBtnText}>Save Goal</Text>
                                        </LinearGradient>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    )}
                </React.Fragment>
            </ScrollView>
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
    heroIconBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#E11D48', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF20' },
    heroSubtext: { fontSize: 13, color: '#FFFFFF80', fontWeight: '600', letterSpacing: 0.5 },
    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 13, fontWeight: '800', color: '#71717A', marginBottom: 20, letterSpacing: 2, textTransform: 'uppercase' },

    goalCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#FFFFFF08', overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    cardIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: '#E11D4810', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 1, borderColor: '#E11D4820' },
    headerContent: { flex: 1 },
    goalName: { fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginBottom: 4, letterSpacing: -0.3 },
    targetDate: { fontSize: 13, color: '#71717A', fontWeight: '500' },
    headerRight: { alignItems: 'flex-end' },
    progressBadge: { backgroundColor: '#E11D4820', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    progressText: { color: '#E11D48', fontSize: 12, fontWeight: '800' },
    progressBarBg: { height: 6, backgroundColor: '#FFFFFF10', borderRadius: 3, width: '100%', marginBottom: 12 },
    progressBarFill: { height: '100%', borderRadius: 3 },

    financialSection: { marginTop: 8 },
    divider: { height: 1, backgroundColor: '#FFFFFF10', marginBottom: 16 },
    finHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    finTitle: { color: '#10B981', fontWeight: '700', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 },
    finRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    finLabel: { color: '#A1A1AA', fontSize: 12, marginBottom: 4 },
    finValue: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    actionBtn: { backgroundColor: '#10B98120', paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
    actionBtnText: { color: '#10B981', fontWeight: '700', fontSize: 13 },

    expandHint: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 12, gap: 4 },
    expandText: { color: '#71717A', fontSize: 11, fontWeight: '500' },

    emptyCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 48, alignItems: 'center', borderWidth: 1, borderColor: '#FFFFFF08', borderStyle: 'dashed' },
    emptyIconContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E11D4808', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#E11D4815' },
    emptyText: { fontSize: 17, color: '#FFFFFF', fontWeight: '700', marginBottom: 8 },
    emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', fontWeight: '500', lineHeight: 20 },
    addButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#18181B', marginHorizontal: 24, marginBottom: 24, padding: 20, borderRadius: 24, gap: 12, borderWidth: 1, borderColor: '#E11D4850' },
    addButtonText: { fontSize: 16, fontWeight: '700', color: '#E11D48', letterSpacing: 0.5 },

    // Modal Styles
    modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 24 },
    modalContent: { width: '100%', backgroundColor: '#18181B', borderRadius: 32, padding: 32, borderWidth: 1, borderColor: '#FFFFFF10' },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 32, textAlign: 'center' },
    inputContainer: { marginBottom: 24 },
    inputLabel: { color: '#71717A', fontSize: 12, fontWeight: '700', marginBottom: 12, letterSpacing: 1 },
    textInputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', borderRadius: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: '#FFFFFF10', height: 56 },
    textInput: { flex: 1, color: '#FFF', fontSize: 16, fontWeight: '600', marginLeft: 12 },
    modalActions: { flexDirection: 'row', gap: 16, marginTop: 16 },
    cancelBtn: { flex: 1, height: 56, justifyContent: 'center', alignItems: 'center', borderRadius: 16, backgroundColor: '#FFFFFF10' },
    cancelBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
    saveBtn: { flex: 1, height: 56, borderRadius: 16, overflow: 'hidden' },
    saveBtnGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 }
});
