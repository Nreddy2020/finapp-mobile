import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable, Image } from 'react-native';
import { Target, ChevronLeft, Plus, Trophy, TrendingUp, Lock } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function SavingsGoalsScreen() {
    const router = useRouter();

    const [goals, setGoals] = useState([
        { id: 1, name: 'Emergency Fund', target: 270000, saved: 125000, icon: Lock, color: '#10B981', date: 'Dec 2025', locked: true }, // Locked
        { id: 2, name: 'New Bike', target: 120000, saved: 45000, icon: Trophy, color: '#F59E0B', date: 'Oct 2025', locked: false },
        { id: 3, name: 'Gold Chain', target: 60000, saved: 12000, icon: Target, color: '#EC4899', date: 'Nov 2025', locked: false },
    ]);

    const totalSaved = goals.reduce((sum, g) => sum + g.saved, 0);
    const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);

    const renderGoal = (goal, index) => {
        const progress = (goal.saved / goal.target) * 100;
        return (
            <LuxuryCard key={goal.id} index={index} style={styles.goalCard}>
                <View style={styles.cardHeader}>
                    <View style={[styles.iconBox, { backgroundColor: `${goal.color}20` }]}>
                        <goal.icon size={24} color={goal.color} />
                    </View>
                    <View style={styles.headerText}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={styles.goalName}>{goal.name}</Text>
                            {goal.locked && <Lock size={12} color="#A1A1AA" />}
                        </View>
                        <Text style={styles.goalDate}>Goal: {goal.date}</Text>
                    </View>
                    <Text style={styles.percentage}>{progress.toFixed(0)}%</Text>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBarBg}>
                        <LinearGradient
                            colors={[goal.color, goal.color + '80']}
                            style={[styles.progressBarFill, { width: `${progress}%` }]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        />
                    </View>
                </View>

                <View style={styles.amountsRow}>
                    <Text style={styles.savedAmount}>₹{goal.saved.toLocaleString()}</Text>
                    <Text style={styles.targetAmount}>of ₹{goal.target.toLocaleString()}</Text>
                </View>

                <Pressable style={[styles.contributeBtn, goal.locked && { opacity: 0.5 }]}>
                    {goal.locked ? (
                        <>
                            <Lock size={16} color="#A1A1AA" />
                            <Text style={[styles.contributeText, { color: '#A1A1AA' }]}>Funds Locked</Text>
                        </>
                    ) : (
                        <>
                            <Plus size={16} color="#FFF" />
                            <Text style={styles.contributeText}>Add Money</Text>
                        </>
                    )}
                </Pressable>
            </LuxuryCard>
        );
    };

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Savings Goals</Text>
                <Pressable style={styles.addButton}>
                    <Plus color="#FFFFFF" size={24} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Total Portfolio */}
                <View style={styles.heroSection}>
                    <LinearGradient
                        colors={['#6366F120', '#000000']}
                        style={styles.heroBackground}
                    />
                    <Text style={styles.heroLabel}>Total Saved</Text>
                    <Text style={styles.heroValue}>₹{totalSaved.toLocaleString()}</Text>
                    <Text style={styles.heroSub}>Target: ₹{totalTarget.toLocaleString()}</Text>
                </View>

                {/* Round Up Feature */}
                <LuxuryCard style={styles.roundUpCard}>
                    <View style={styles.ruContent}>
                        <View style={styles.ruIcon}>
                            <TrendingUp size={20} color="#000" />
                        </View>
                        <View style={styles.ruTextCol}>
                            <Text style={styles.ruTitle}>Auto Round-Ups</Text>
                            <Text style={styles.ruDesc}>Save small change from every transaction.</Text>
                        </View>
                        <View style={styles.switch}>
                            <View style={styles.switchKnob} />
                        </View>
                    </View>
                </LuxuryCard>

                <Text style={styles.sectionTitle}>Your Buckets</Text>

                <View style={styles.list}>
                    {goals.map((goal, idx) => renderGoal(goal, idx))}
                </View>

                {/* Motivation Card */}
                <LuxuryCard style={styles.motivationCard} delay={300}>
                    <View style={styles.motoContent}>
                        <TrendingUp size={24} color="#10B981" />
                        <Text style={styles.motoText}>Tip: Saving ₹50/day adds up to ₹18,000/year!</Text>
                    </View>
                </LuxuryCard>

            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    addButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#6366F1' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { padding: 20 },
    heroSection: { alignItems: 'center', marginBottom: 32, padding: 32, borderRadius: 32, overflow: 'hidden', backgroundColor: '#18181B', borderWidth: 1, borderColor: '#FFFFFF10' },
    heroBackground: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    heroLabel: { fontSize: 14, color: '#A1A1AA', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    heroValue: { fontSize: 42, fontWeight: '900', color: '#FFF', marginBottom: 4 },
    heroSub: { fontSize: 14, color: '#6366F1' },
    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1 },
    list: { gap: 16, marginBottom: 24 },
    goalCard: { padding: 20 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
    iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    headerText: { flex: 1 },
    goalName: { fontSize: 17, fontWeight: '700', color: '#FFF', marginBottom: 4 },
    goalDate: { fontSize: 12, color: '#A1A1AA' },
    percentage: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    progressContainer: { marginBottom: 12 },
    progressBarBg: { height: 8, backgroundColor: '#FFFFFF10', borderRadius: 4, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 4 },
    amountsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    savedAmount: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    targetAmount: { fontSize: 14, color: '#A1A1AA' },
    contributeBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, backgroundColor: '#FFFFFF05', borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF10', gap: 8 },
    contributeText: { color: '#FFF', fontWeight: '600', fontSize: 13 },
    motivationCard: { padding: 16, backgroundColor: '#10B98110', borderColor: '#10B98130' },
    motoContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    motoText: { color: '#10B981', fontSize: 14, fontWeight: '600', flex: 1 },
    roundUpCard: { padding: 16, marginBottom: 24, backgroundColor: '#FFF' },
    ruContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    ruIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' },
    ruTextCol: { flex: 1 },
    ruTitle: { color: '#000', fontWeight: '700', fontSize: 14 },
    ruDesc: { color: '#52525B', fontSize: 12 },
    switch: { width: 40, height: 24, borderRadius: 12, backgroundColor: '#10B981', padding: 2 },
    switchKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#FFF', alignSelf: 'flex-end' }
});
