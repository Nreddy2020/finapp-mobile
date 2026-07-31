import React, { useState, useMemo } from 'react';
import { View, ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { ChevronLeft, Save, Zap, Scissors, AlertTriangle } from 'lucide-react-native';
import AnimatedScreen from '../components/ui/AnimatedScreen';
import LuxuryCard from '../components/ui/LuxuryCard';
import { useRouter } from 'expo-router';
import ScenarioControls from '../components/budget/ScenarioControls';
import LifeEvents from '../components/budget/LifeEvents';

import { useGlobalFinance } from '../components/context/GlobalFinanceContext';
import { Heart, Gift, Baby, Users, Briefcase, Home } from 'lucide-react-native';

const EVENTS_DATA = {
    marriage: {
        monthlyImpact: 15000,
        oneTimeCost: 500000,
        category: 'Personal',
        name: 'Marriage Planning',
        icon: Heart,
        desc: 'Sip for Wedding + Post-marriage costs'
    },
    birthday: {
        monthlyImpact: 2000,
        oneTimeCost: 20000,
        category: 'Personal',
        name: 'Birthday Bash',
        icon: Gift,
        desc: 'Party fund & Gifts'
    },
    family: {
        monthlyImpact: 10000,
        category: 'Family',
        name: 'New Family Support',
        icon: Users,
        desc: 'Insurance & Healthcare'
    },
    kid: {
        monthlyImpact: 15000,
        category: 'Education',
        name: 'New Kid Planning',
        icon: Baby,
        desc: 'Diapers, Food & Future Edu'
    },
    business: {
        monthlyImpact: 25000,
        oneTimeCost: 200000,
        category: 'Business',
        name: 'New Business',
        icon: Briefcase,
        desc: 'Capital Loan EMI + Opex'
    },
    house: {
        monthlyImpact: 45000,
        oneTimeCost: 1000000,
        category: 'Housing',
        name: 'New House',
        icon: Home,
        desc: 'Home Loan EMI + Maintenance'
    }
};

export default function BudgetPlannerScreen() {
    const router = useRouter();
    const { formatAmount, currency } = useGlobalFinance();

    // Base State
    const [income, setIncome] = useState(85000); // Increased based on context
    const [allocations, setAllocations] = useState({
        Rent: 15000,
        Food: 12000,
        Utilities: 3000,
        Medicine: 2000,
        Education: 5000,
        Transport: 4000,
        Savings: 15000,
    });

    // Scenario State
    const [isScenarioMode, setIsScenarioMode] = useState(false);
    const [inflationYear, setInflationYear] = useState(0);
    const [activeEvents, setActiveEvents] = useState([]);

    // Derived Calculations
    const { projectedAllocations, projectedIncome, totalExpenses, remaining, inflationMultiplier } = useMemo(() => {
        let mult = Math.pow(1.06, inflationYear); // 6% Inflation
        let tempIncome = income * (inflationYear > 0 ? Math.pow(1.03, inflationYear) : 1); // 3% Income Growth assumption
        let tempAllocations = { ...allocations };

        // 1. Apply Inflation
        // We inflate expenses, assuming income grows slower or matches logic above
        Object.keys(tempAllocations).forEach(key => {
            if (key !== 'Savings') { // Savings don't inflate effectively, they are what's left
                tempAllocations[key] *= mult;
            }
        });

        // 2. Apply Events
        activeEvents.forEach(eventId => {
            const event = EVENTS_DATA[eventId];
            if (event) {
                if (event.monthlyImpact) {
                    const cat = event.category || 'Other';
                    tempAllocations[cat] = (tempAllocations[cat] || 0) + event.monthlyImpact;
                }
                if (event.incomeImpact) {
                    tempIncome += event.incomeImpact;
                }
            }
        });

        const totalExp = Object.values(tempAllocations).reduce((a, b) => a + b, 0);
        const rem = tempIncome - totalExp;

        return {
            projectedAllocations: tempAllocations,
            projectedIncome: tempIncome,
            totalExpenses: totalExp,
            remaining: rem,
            inflationMultiplier: mult
        };
    }, [income, allocations, inflationYear, activeEvents]);

    const handleToggleEvent = (id) => {
        setActiveEvents(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]);
    };

    const isDeficit = remaining < 0;

    return (
        <AnimatedScreen style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <ChevronLeft color="#FFFFFF" size={24} />
                </Pressable>
                <Text style={styles.headerTitle}>Budget Planner</Text>
                <Pressable style={styles.saveButton}>
                    <Save color="#FFFFFF" size={20} />
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Scenario Controls */}
                <ScenarioControls
                    isScenarioMode={isScenarioMode}
                    setIsScenarioMode={setIsScenarioMode}
                    inflationYear={inflationYear}
                    setInflationYear={setInflationYear}
                />

                {/* Life Events (Only Scenario Mode) */}
                <LifeEvents
                    isScenarioMode={isScenarioMode}
                    activeEvents={activeEvents}
                    onToggleEvent={handleToggleEvent}
                />

                {/* Status Card - Dynamic */}
                <LuxuryCard style={[styles.statusCard, { borderColor: isDeficit ? '#EF4444' : (remaining === 0 ? '#10B981' : '#F59E0B') }]}>
                    <Text style={styles.statusLabel}>
                        {isScenarioMode ? 'Projected Remaining' : 'Remaining to Assign'}
                    </Text>
                    <Text style={[styles.statusValue, { color: isDeficit ? '#EF4444' : (remaining === 0 ? '#10B981' : '#F59E0B') }]}>
                        {isDeficit ? '-' : ''}{formatAmount(Math.abs(remaining), 0)}
                    </Text>
                    <Text style={styles.statusSub}>
                        {isScenarioMode
                            ? (isDeficit ? "CRITICAL: You will be in debt!" : "You can afford this lifestyle.")
                            : (remaining === 0 ? "Perfect! Zero-based budget." : "Assign surplus to Goals.")}
                    </Text>
                    {isScenarioMode && inflationYear > 0 && (
                        <View style={styles.inflationTag}>
                            <Zap size={10} color="#000" />
                            <Text style={styles.inflationTagText}>Adjusted for {inflationYear}y Inflation</Text>
                        </View>
                    )}
                </LuxuryCard>

                {/* Categories */}
                <Text style={styles.sectionTitle}>
                    {isScenarioMode ? `Projected Expenses (${(inflationMultiplier * 100 - 100).toFixed(0)}% Inflation)` : 'Allocations'}
                </Text>

                <View style={styles.grid}>
                    {Object.entries(projectedAllocations).map(([key, val], idx) => {
                        const originalVal = allocations[key] || 0;
                        const diff = val - originalVal;
                        const isHigher = val > originalVal;

                        return (
                            <LuxuryCard key={key} style={[styles.allocCard, isScenarioMode && isHigher && styles.allocCardWarning]} index={idx}>
                                <Text style={styles.catName}>{key}</Text>
                                <Text style={styles.catAmount}>{formatAmount(val, 0)}</Text>

                                {isScenarioMode && Math.abs(diff) > 1 && (
                                    <View style={styles.diffTag}>
                                        <Text style={[styles.diffText, { color: diff > 0 ? '#EF4444' : '#10B981' }]}>
                                            {diff > 0 ? '+' : ''}{diff.toFixed(0)}
                                        </Text>
                                    </View>
                                )}
                            </LuxuryCard>
                        );
                    })}
                </View>

                {/* Sacrifice Engine (Context Aware) */}
                <LuxuryCard style={styles.sacrificeCard} delay={300}>
                    <View style={styles.sacHeader}>
                        {isDeficit ? <AlertTriangle size={20} color="#EF4444" /> : <Scissors size={20} color="#F59E0B" />}
                        <Text style={[styles.sacTitle, isDeficit && { color: '#EF4444' }]}>
                            {isDeficit ? 'Deficit Warning' : 'Optimization Tip'}
                        </Text>
                    </View>
                    <Text style={styles.sacDesc}>
                        {isDeficit
                            ? `You need to cut expenses by ${formatAmount(Math.abs(remaining), 0)} or increase income.`
                            : `Reduce Food by ${formatAmount(500, 0)} to boost Emergency Fund?`}
                    </Text>
                    {isDeficit && (
                        <Pressable style={styles.sacBtn}>
                            <Text style={styles.sacBtnText}>Auto-Fix (Reduce Wants)</Text>
                        </Pressable>
                    )}
                </LuxuryCard>

            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
    backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#18181B' },
    saveButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20, backgroundColor: '#6366F1' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    content: { paddingBottom: 20 },

    statusCard: { marginHorizontal: 20, padding: 24, alignItems: 'center', marginBottom: 24, backgroundColor: '#18181B', borderWidth: 1 },
    statusLabel: { color: '#A1A1AA', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    statusValue: { fontSize: 36, fontWeight: '900', marginBottom: 8 },
    statusSub: { color: '#71717A', fontSize: 12 },
    inflationTag: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F59E0B', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    inflationTagText: { color: '#000', fontSize: 10, fontWeight: '700' },

    sectionTitle: { fontSize: 13, fontWeight: '700', color: '#71717A', marginBottom: 16, textTransform: 'uppercase', letterSpacing: 1, marginHorizontal: 20 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24, paddingHorizontal: 20 },
    allocCard: { width: '47%', padding: 16, backgroundColor: '#18181B' },
    allocCardWarning: { borderColor: '#EF444450', backgroundColor: '#EF444405' },
    catName: { color: '#A1A1AA', fontSize: 14, marginBottom: 4 },
    catAmount: { color: '#FFF', fontSize: 18, fontWeight: '700' },
    diffTag: { marginTop: 8 },
    diffText: { fontSize: 12, fontWeight: '700' },

    sacrificeCard: { marginHorizontal: 20, padding: 16, borderColor: '#F59E0B30', backgroundColor: '#F59E0B05' },
    sacHeader: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 },
    sacTitle: { color: '#F59E0B', fontWeight: '700', fontSize: 14 },
    sacDesc: { color: '#A1A1AA', fontSize: 14, lineHeight: 20, marginBottom: 12 },
    sacBtn: { backgroundColor: '#EF4444', padding: 12, borderRadius: 8, alignItems: 'center' },
    sacBtnText: { color: '#FFF', fontWeight: '700', fontSize: 12 }
});
