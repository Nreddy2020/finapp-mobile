import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { PieChart as PieIcon, AlertTriangle, TrendingUp, ShieldAlert, Plus, ArrowRight, Wallet, Target, CreditCard } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';

import AnimatedScreen from '../../components/ui/AnimatedScreen';
import LuxuryCard from '../../components/ui/LuxuryCard';
import StackHeader from '../../components/ui/StackHeader';
import { getBudgets, getIncome } from '../../services/api';

const { width } = Dimensions.get('window');
const COLORS = {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
};

export default function BudgetsScreen() {
    const [budgets, setBudgets] = useState([]);
    const [income, setIncome] = useState(0);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = async () => {
        try {
            const budgetData = await getBudgets();
            const incomeData = await getIncome();
            // Simplify income calculation for demo
            const totalIncome = incomeData.reduce((sum, item) => sum + item.amount, 0) || 125000; // Fallback to mock total

            setBudgets(budgetData);
            setIncome(totalIncome);
        } catch (error) {
            console.error('Error fetching budget data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    // --- Calculations for 50/30/20 Rule ---
    const needsBudgets = budgets.filter(b => b.type === 'Needs');
    const wantsBudgets = budgets.filter(b => b.type === 'Wants');

    const totalNeedsSpent = needsBudgets.reduce((sum, b) => sum + b.spent, 0);
    const totalWantsSpent = wantsBudgets.reduce((sum, b) => sum + b.spent, 0);

    // Assuming Savings is calculated as (Income - Expenses) or tracked separately. 
    // For this visualization, let's use a derived value or mock savings if not explicitly tracked in budgets.
    const mockSavings = income * 0.25; // 25% savings rate mock

    const needsIdeally = income * 0.5;
    const wantsIdeally = income * 0.3;
    const savingsIdeally = income * 0.2;

    const needsStatus = totalNeedsSpent / needsIdeally; // > 1 means over budget
    const wantsStatus = totalWantsSpent / wantsIdeally;

    // --- Emergency Buffer Logic ---
    const totalBudgetLimit = budgets.reduce((sum, b) => sum + b.limit, 0);
    const totalSpent = budgets.reduce((sum, b) => sum + b.spent, 0);
    const totalRemaining = totalBudgetLimit - totalSpent;
    const spendPercentage = (totalSpent / totalBudgetLimit) * 100;

    const isEmergency = spendPercentage > 90;
    const atRiskBudgets = budgets.filter(b => (b.spent / b.limit) > 0.9);

    return (
        <AnimatedScreen style={styles.container}>
            <StackHeader title="Smart Budgets" subtitle="Priority Allocation & Alerts" />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} progressBackgroundColor="#18181B" />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* 1. Emergency Buffer Alert (Empathy Feature) */}
                {isEmergency && (
                    <LuxuryCard style={styles.alertCard}>
                        <View style={styles.alertHeader}>
                            <View style={styles.alertIconBg}>
                                <ShieldAlert size={24} color="#EF4444" strokeWidth={2.5} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.alertTitle}>Emergency Buffer Breach!</Text>
                                <Text style={styles.alertText}>
                                    You've used <Text style={{ fontWeight: '700', color: '#EF4444' }}>{spendPercentage.toFixed(0)}%</Text> of your monthly budget.
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.alertSubtext}>
                            Only ₹{totalRemaining.toLocaleString()} remaining. Switch to "Essential Spending Only" mode recommended.
                        </Text>
                    </LuxuryCard>
                )}

                {/* 2. 50/30/20 Rule Visualization */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>50/30/20 Analysis</Text>
                    <TouchableOpacity onPress={() => router.push('/budget-planner')}>
                        <Text style={styles.linkText}>Open Planner</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsRow}>
                    {/* Needs Card */}
                    <LuxuryCard style={[styles.statCard, { width: width * 0.7 }]}>
                        <View style={[styles.iconBox, { backgroundColor: '#3B82F620' }]}>
                            <Wallet size={20} color="#3B82F6" />
                        </View>
                        <Text style={styles.cardLabel}>Needs (50%)</Text>
                        <Text style={styles.cardAmount}>₹{totalNeedsSpent.toLocaleString()}</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(needsStatus * 100, 100)}%`, backgroundColor: needsStatus > 1 ? '#EF4444' : '#3B82F6' }]} />
                        </View>
                        <Text style={styles.cardFooter}>
                            {needsStatus > 1 ? 'Over Budget!' : `${(needsStatus * 100).toFixed(0)}% of recommended limit`}
                        </Text>
                    </LuxuryCard>

                    {/* Wants Card */}
                    <LuxuryCard style={[styles.statCard, { width: width * 0.7 }]}>
                        <View style={[styles.iconBox, { backgroundColor: '#8B5CF620' }]}>
                            <Target size={20} color="#8B5CF6" />
                        </View>
                        <Text style={styles.cardLabel}>Wants (30%)</Text>
                        <Text style={styles.cardAmount}>₹{totalWantsSpent.toLocaleString()}</Text>
                        <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${Math.min(wantsStatus * 100, 100)}%`, backgroundColor: wantsStatus > 1 ? '#EF4444' : '#8B5CF6' }]} />
                        </View>
                        <Text style={styles.cardFooter}>
                            {wantsStatus > 1 ? 'Cut back on non-essentials' : 'Within healthy limits'}
                        </Text>
                    </LuxuryCard>
                </ScrollView>

                {/* 3. At-Risk Categories */}
                {atRiskBudgets.length > 0 && (
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: '#EF4444' }]}>Critical Categories</Text>
                        {atRiskBudgets.map((budget, index) => (
                            <LuxuryCard key={index} style={styles.categoryCard}>
                                <View style={styles.catHeader}>
                                    <Text style={styles.catName}>{budget.category}</Text>
                                    <Text style={[styles.catPercent, { color: '#EF4444' }]}>
                                        {((budget.spent / budget.limit) * 100).toFixed(0)}% Used
                                    </Text>
                                </View>
                                <View style={styles.progressBarBgMini}>
                                    <View style={[styles.progressBarFill, { width: `${Math.min((budget.spent / budget.limit) * 100, 100)}%`, backgroundColor: '#EF4444' }]} />
                                </View>
                                <Text style={styles.catMeta}>
                                    Spent ₹{budget.spent.toLocaleString()} of ₹{budget.limit.toLocaleString()}
                                </Text>
                            </LuxuryCard>
                        ))}
                    </View>
                )}

                {/* 4. All Budgets List */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>All Budgets</Text>
                        <TouchableOpacity style={styles.addButton}>
                            <Plus size={16} color={COLORS.primary} />
                        </TouchableOpacity>
                    </View>

                    {budgets.map((budget, index) => {
                        const percent = (budget.spent / budget.limit) * 100;
                        const color = percent > 100 ? '#EF4444' : (percent > 80 ? '#F59E0B' : '#10B981');

                        return (
                            <LuxuryCard key={index} style={styles.budgetRow}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={[styles.dot, { backgroundColor: color }]} />
                                        <Text style={styles.budgetName}>{budget.category}</Text>
                                        <View style={styles.tag}>
                                            <Text style={styles.tagText}>{budget.type || 'General'}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.budgetAmount}>₹{budget.limit.toLocaleString()}</Text>
                                </View>

                                <View style={styles.progressBarBgMini}>
                                    <View style={[styles.progressBarFill, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
                                </View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}>
                                    <Text style={styles.budgetMeta}>₹{budget.spent.toLocaleString()} spent</Text>
                                    <Text style={[styles.budgetMeta, { color: color }]}>{percent.toFixed(0)}%</Text>
                                </View>
                            </LuxuryCard>
                        );
                    })}
                </View>

                {/* 5. Tool Link */}
                <TouchableOpacity onPress={() => router.push('/budget-planner')}>
                    <LinearGradient
                        colors={['#27272A', '#18181B']}
                        style={styles.toolCard}
                    >
                        <View style={[styles.iconBox, { backgroundColor: '#F59E0B20' }]}>
                            <TrendingUp size={24} color="#F59E0B" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.toolTitle}>Advanced Budget Planner</Text>
                            <Text style={styles.toolDesc}>Simulate life events like Marriage, Buying a House, etc.</Text>
                        </View>
                        <ArrowRight size={20} color="#71717A" />
                    </LinearGradient>
                </TouchableOpacity>

            </ScrollView>
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000000' },
    headerContainer: { paddingTop: 20 }, // Adjust for Header component
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40 },

    alertCard: { margin: 24, marginTop: 10, backgroundColor: '#EF444410', borderColor: '#EF444440', padding: 20 },
    alertHeader: { flexDirection: 'row', gap: 16, marginBottom: 12 },
    alertIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#EF444420', alignItems: 'center', justifyContent: 'center' },
    alertTitle: { fontSize: 18, fontWeight: '800', color: '#EF4444', marginBottom: 4 },
    alertText: { fontSize: 14, color: '#FFFFFF', lineHeight: 20 },
    alertSubtext: { fontSize: 13, color: '#FFFFFF80', fontStyle: 'italic' },

    section: { paddingHorizontal: 24, marginBottom: 24 },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.5 },
    linkText: { fontSize: 13, color: COLORS.primary, fontWeight: '700' },

    cardsRow: { paddingHorizontal: 24, gap: 16, paddingBottom: 24 },
    statCard: { padding: 20, backgroundColor: '#18181B' },
    iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
    cardLabel: { fontSize: 14, color: '#A1A1AA', fontWeight: '600', marginBottom: 8 },
    cardAmount: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', marginBottom: 16 },
    progressBarBg: { height: 6, backgroundColor: '#27272A', borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
    progressBarFill: { height: '100%', borderRadius: 3 },
    cardFooter: { fontSize: 12, color: '#71717A' },

    categoryCard: { marginBottom: 12, padding: 16, borderColor: '#EF444440' },
    catHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    catName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    catPercent: { fontSize: 14, fontWeight: '800' },
    progressBarBgMini: { height: 4, backgroundColor: '#27272A', borderRadius: 2, overflow: 'hidden' },
    catMeta: { fontSize: 12, color: '#71717A', marginTop: 8 },

    budgetRow: { marginBottom: 12, padding: 16, backgroundColor: '#18181B' },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    budgetName: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    tag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#27272A', marginLeft: 10 },
    tagText: { fontSize: 10, color: '#A1A1AA', fontWeight: '600' },
    budgetAmount: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
    budgetMeta: { fontSize: 12, color: '#71717A' },

    addButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#27272A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#FFFFFF10' },

    toolCard: { marginHorizontal: 24, flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, gap: 16, borderWidth: 1, borderColor: '#FFFFFF10' },
    toolTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF', marginBottom: 4 },
    toolDesc: { fontSize: 12, color: '#A1A1AA' }
});
