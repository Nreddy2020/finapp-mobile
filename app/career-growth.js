import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, TextInput, Modal, Alert, FlatList } from 'react-native';
import { TrendingUp, ChevronLeft, Home, Calculator, CheckSquare, Star, FileText, Briefcase, Users, Plus, Trash2 } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { CareerService } from '../services/career';
import { FamilyService } from '../services/family'; // Bonus: maybe future integration
import LuxuryEmptyState from '../components/ui/LuxuryEmptyState';

// New Components
import SkillsGap from '../components/career/SkillsGap';
import ResumeBuilder from '../components/career/ResumeBuilder';
import MentorshipMatch from '../components/career/MentorshipMatch';

export default function CareerGrowthScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [goals, setGoals] = useState([]);
    const [roiHistory, setRoiHistory] = useState([]);

    const [roiCost, setRoiCost] = useState('5000');
    const [roiIncrease, setRoiIncrease] = useState('2000');
    const [roiResult, setRoiResult] = useState(null);

    // Feature Modals
    const [showSkills, setShowSkills] = useState(false);
    const [showResume, setShowResume] = useState(false);
    const [showMentors, setShowMentors] = useState(false);
    const [showAddGoal, setShowAddGoal] = useState(false);

    // Form State
    const [newGoalTitle, setNewGoalTitle] = useState('');
    const [newGoalDate, setNewGoalDate] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { goals: g, roiHistory: r } = await CareerService.getData();
        setGoals(g);
        setRoiHistory(r);
        setLoading(false);
    };

    // Skill ROI logic
    const calculateROI = async () => {
        const cost = parseFloat(roiCost);
        const increase = parseFloat(roiIncrease);
        if (!cost || !increase) return;

        const monthsToRecover = (cost / increase).toFixed(1);
        setRoiResult(monthsToRecover);

        // Save to history
        const updated = await CareerService.saveROI('Custom Skill', cost, increase, monthsToRecover);
        setRoiHistory(updated);
    };

    const handleAddGoal = async () => {
        if (!newGoalTitle.trim()) return;
        const updated = await CareerService.addGoal(newGoalTitle, newGoalDate || 'Ongoing');
        setGoals(updated);
        setShowAddGoal(false);
        setNewGoalTitle('');
        setNewGoalDate('');
    };

    const toggleGoal = async (id) => {
        const updated = await CareerService.toggleGoal(id);
        setGoals(updated);
    };

    const deleteGoal = async (id) => {
        const updated = await CareerService.deleteGoal(id);
        setGoals(updated);
    };

    const schemes = [
        { id: 1, name: 'PM Kaushal Vikas Yojana', benefit: 'Free Training + Certificate', sector: 'Technical' },
        { id: 2, name: 'Digital India Internship', benefit: '₹10k Stipend', sector: 'IT/Admin' },
    ];

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Career Growth</Text>
                <Pressable style={[styles.addButton, { backgroundColor: '#10B98120' }]} onPress={() => setShowAddGoal(true)}>
                    <Plus color="#10B981" size={20} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Skill ROI Calculator */}
                <LuxuryCard style={styles.roiCard}>
                    <View style={styles.roiHeader}>
                        <Calculator size={20} color="#F59E0B" />
                        <Text style={styles.roiTitle}>Skill ROI Calculator</Text>
                    </View>
                    <Text style={styles.roiDesc}>Is that course worth it?</Text>

                    <View style={styles.inputRow}>
                        <View style={styles.inputCol}>
                            <Text style={styles.label}>Course Cost (₹)</Text>
                            <TextInput
                                style={styles.input}
                                value={roiCost}
                                onChangeText={setRoiCost}
                                keyboardType="numeric"
                            />
                        </View>
                        <View style={styles.inputCol}>
                            <Text style={styles.label}>Salary Hike/Mo (₹)</Text>
                            <TextInput
                                style={styles.input}
                                value={roiIncrease}
                                onChangeText={setRoiIncrease}
                                keyboardType="numeric"
                            />
                        </View>
                    </View>

                    <Pressable style={styles.calcBtn} onPress={calculateROI}>
                        <Text style={styles.calcBtnText}>Calculate & Save</Text>
                    </Pressable>

                    {roiResult && (
                        <View style={styles.resultBox}>
                            <Text style={styles.resultLabel}>Recovery Time</Text>
                            <Text style={styles.resultValue}>{roiResult} Months</Text>
                            <Text style={styles.resultSub}>After that, it's pure profit!</Text>
                        </View>
                    )}
                </LuxuryCard>

                {/* Career Tools */}
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: 24, marginTop: 24 }}>
                    <Pressable style={styles.toolBtn} onPress={() => setShowSkills(true)}>
                        <LinearGradient colors={['#18181B', '#18181B']} style={styles.toolGradient}>
                            <TrendingUp size={20} color="#6366F1" />
                            <Text style={styles.toolText}>Skills Gap</Text>
                        </LinearGradient>
                    </Pressable>
                    <Pressable style={styles.toolBtn} onPress={() => setShowResume(true)}>
                        <LinearGradient colors={['#18181B', '#18181B']} style={styles.toolGradient}>
                            <FileText size={20} color="#F59E0B" />
                            <Text style={styles.toolText}>Resume</Text>
                        </LinearGradient>
                    </Pressable>
                    <Pressable style={styles.toolBtn} onPress={() => setShowMentors(true)}>
                        <LinearGradient colors={['#18181B', '#18181B']} style={styles.toolGradient}>
                            <Users size={20} color="#8B5CF6" />
                            <Text style={styles.toolText}>Mentors</Text>
                        </LinearGradient>
                    </Pressable>
                </View>

                {/* Government Schemes */}
                <Text style={styles.sectionTitle}>Govt Skill Programs</Text>
                <View style={styles.list}>
                    {schemes.map((s, i) => (
                        <LuxuryCard key={s.id} index={i} style={styles.schemeCard}>
                            <View style={styles.row}>
                                <View style={styles.iconBox}>
                                    <Home size={20} color="#6366F1" />
                                </View>
                                <View style={styles.details}>
                                    <Text style={styles.schemeName}>{s.name}</Text>
                                    <Text style={styles.schemeBenefit}>{s.benefit}</Text>
                                </View>
                                <View style={styles.tag}>
                                    <Text style={styles.tagText}>{s.sector}</Text>
                                </View>
                            </View>
                        </LuxuryCard>
                    ))}
                </View>

                {/* Career Goals */}
                <Text style={styles.sectionTitle}>My Career Path</Text>
                <LuxuryCard style={styles.goalCard}>
                    <View style={styles.goalHeader}>
                        <CheckSquare size={24} color="#10B981" />
                        <Text style={styles.goalTitleMain}>Milestones</Text>
                    </View>

                    import LuxuryEmptyState from '../components/ui/LuxuryEmptyState'; // Ensure import at top

                    // ... inside component ...

                    {goals.length === 0 ? (
                        <LuxuryEmptyState
                            title="No goals set yet"
                            subtitle="Set a career milestone to track your progress!"
                            themeColor="#10B981"
                            icon={CheckSquare}
                        />
                    ) : (
                        goals.map(g => (
                            <View key={g.id} style={styles.milestone}>
                                <Pressable
                                    style={[styles.checkCircle, g.completed && { backgroundColor: '#10B981' }]}
                                    onPress={() => toggleGoal(g.id)}
                                >
                                    {g.completed && <Text style={styles.check}>✓</Text>}
                                </Pressable>
                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.milestoneText, g.completed && { color: '#71717A', textDecorationLine: 'line-through' }]}>
                                        {g.title}
                                    </Text>
                                    <Text style={styles.milestoneDate}>{g.targetDate}</Text>
                                </View>
                                <Pressable onPress={() => deleteGoal(g.id)}>
                                    <Trash2 size={16} color="#EF4444" />
                                </Pressable>
                            </View>
                        ))
                    )}
                </LuxuryCard>

            </ScrollView>

            {/* Add Goal Modal */}
            <Modal visible={showAddGoal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>New Career Goal</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Goal (e.g., Learn Python)"
                            placeholderTextColor="#666"
                            value={newGoalTitle}
                            onChangeText={setNewGoalTitle}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="Target Date (Optional)"
                            placeholderTextColor="#666"
                            value={newGoalDate}
                            onChangeText={setNewGoalDate}
                        />
                        <View style={styles.modalActions}>
                            <Pressable style={styles.cancelBtn} onPress={() => setShowAddGoal(false)}>
                                <Text style={styles.btnText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.saveBtn} onPress={handleAddGoal}>
                                <Text style={styles.btnText}>Add</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <SkillsGap visible={showSkills} onClose={() => setShowSkills(false)} />
            <ResumeBuilder visible={showResume} onClose={() => setShowResume(false)} />
            <MentorshipMatch visible={showMentors} onClose={() => setShowMentors(false)} />
        </AnimatedScreen >
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#10B98120' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },
    roiCard: { padding: 20, marginBottom: 24, backgroundColor: '#18181B' },
    roiHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
    roiTitle: { color: '#F59E0B', fontWeight: '700', fontSize: 16 },
    roiDesc: { color: '#A1A1AA', fontSize: 12, marginBottom: 16 },
    inputRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    inputCol: { flex: 1 },
    label: { color: '#71717A', fontSize: 10, marginBottom: 4 },
    input: { backgroundColor: '#27272A', borderRadius: 8, padding: 10, color: '#FFF', fontWeight: '700' },
    calcBtn: { backgroundColor: '#F59E0B', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 16 },
    calcBtnText: { color: '#000', fontWeight: '700' },
    resultBox: { backgroundColor: '#F59E0B20', padding: 12, borderRadius: 12, alignItems: 'center' },
    resultLabel: { color: '#F59E0B', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    resultValue: { color: '#FFF', fontSize: 24, fontWeight: '900', marginVertical: 4 },
    resultSub: { color: '#A1A1AA', fontSize: 10 },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    list: { gap: 12, marginBottom: 24 },
    schemeCard: { padding: 16 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#6366F120', justifyContent: 'center', alignItems: 'center' },
    details: { flex: 1 },
    schemeName: { color: '#FFF', fontWeight: '700' },
    schemeBenefit: { color: '#A1A1AA', fontSize: 12 },
    tag: { backgroundColor: '#FFFFFF10', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    tagText: { color: '#FFF', fontSize: 10 },
    goalCard: { padding: 20 },
    goalHeader: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 16 },
    goalTitleMain: { color: '#FFF', fontWeight: '700', fontSize: 16 },
    milestone: { flexDirection: 'row', gap: 12, alignItems: 'center', marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' },
    checkCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#27272A', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' },
    check: { color: '#000', fontSize: 14, fontWeight: '900' },
    milestoneText: { color: '#FFF', fontSize: 16 },
    milestoneDate: { color: '#71717A', fontSize: 12 },
    toolBtn: { flex: 1, height: 60, borderRadius: 12, overflow: 'hidden' },
    toolGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#FFFFFF10', borderRadius: 12 },
    toolText: { color: '#FFF', fontSize: 11, fontWeight: '700' },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', backgroundColor: '#18181B', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#333' },
    modalTitle: { fontSize: 20, fontWeight: '700', color: '#FFF', marginBottom: 20, textAlign: 'center' },
    modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
    cancelBtn: { flex: 1, padding: 14, backgroundColor: '#333', borderRadius: 12, alignItems: 'center' },
    saveBtn: { flex: 1, padding: 14, backgroundColor: '#10B981', borderRadius: 12, alignItems: 'center' },
    btnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
