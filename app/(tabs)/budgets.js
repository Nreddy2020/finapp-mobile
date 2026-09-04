import React, { useState, useEffect } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { ChevronLeft, Calendar as CalendarIcon, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';

import AnimatedScreen from '../../components/ui/AnimatedScreen';
import FinancialHealthCard from '../../components/budget/FinancialHealthCard';
import NeedsAttentionList from '../../components/budget/NeedsAttentionList';
import AllocationStrategyCard from '../../components/budget/AllocationStrategyCard';
import CashFlowTimelineCard from '../../components/budget/CashFlowTimelineCard';
import BudgetCategoriesList from '../../components/budget/BudgetCategoriesList';
import CategoryDetailModal from '../../components/budget/CategoryDetailModal';
import SpendingForecastCard from '../../components/budget/SpendingForecastCard';
import AdvancedWhatIfPlanner from '../../components/budget/AdvancedWhatIfPlanner';
import BudgetCalendarModal from '../../components/budget/BudgetCalendarModal';
import AddBudgetModal from '../../components/budget/AddBudgetModal';

import { buildBudgetControlCenterViewModel } from '../../services/budget/budgetViewModel.js';
import { BudgetService } from '../../services/budgets.js';

export default function BudgetsScreen() {
    const [activeTab, setActiveTab] = useState('Overview'); // 'Overview' | 'Categories' | 'Planner'
    const [selectedStrategyId, setSelectedStrategyId] = useState('50/30/20');
    const [selectedMonth, setSelectedMonth] = useState('2026-09');
    
    // Modal states
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [addBudgetVisible, setAddBudgetVisible] = useState(false);
    
    const [refreshing, setRefreshing] = useState(false);
    const [userBudgets, setUserBudgets] = useState([]);

    const loadData = async () => {
        try {
            const storedBudgets = await BudgetService.getBudgets();
            if (storedBudgets && storedBudgets.length > 0) {
                setUserBudgets(storedBudgets);
            }
        } catch (e) {
            console.warn('Error loading budgets:', e);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Construct unified view model
    const vm = buildBudgetControlCenterViewModel({
        budgets: userBudgets,
        selectedMonth,
        selectedStrategyId
    });

    const handleSaveBudget = async (newBudgetData) => {
        try {
            let updated;
            const exists = userBudgets.some(b => b.id === newBudgetData.id);
            if (exists) {
                updated = await BudgetService.updateBudget(newBudgetData);
            } else {
                updated = await BudgetService.createBudget(newBudgetData);
            }
            setUserBudgets(updated);
        } catch (e) {
            console.error('Error saving budget:', e);
        } finally {
            setAddBudgetVisible(false);
        }
    };

    const handleBack = () => {
        if (selectedCategory) {
            setSelectedCategory(null);
            return true;
        }
        if (calendarVisible) {
            setCalendarVisible(false);
            return true;
        }
        if (addBudgetVisible) {
            setAddBudgetVisible(false);
            return true;
        }
        if (activeTab !== 'Overview') {
            setActiveTab('Overview');
            return true;
        }
        if (router.canGoBack()) {
            router.back();
            return true;
        }
        router.replace('/(tabs)');
        return true;
    };

    useEffect(() => {
        const onBackPress = () => handleBack();
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [selectedCategory, calendarVisible, addBudgetVisible, activeTab]);

    return (
        <AnimatedScreen style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={styles.topNav}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.navBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <ChevronLeft size={24} color="#F8FAFC" />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle}>Smart Budgets</Text>
                    <TouchableOpacity style={styles.monthSelector} activeOpacity={0.7} onPress={() => setCalendarVisible(true)}>
                        <Text style={styles.monthText}>{vm.period.label}</Text>
                        <ChevronRight size={14} color="#94A3B8" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.calendarBtn}
                    onPress={() => setCalendarVisible(true)}
                    activeOpacity={0.7}
                >
                    <CalendarIcon size={20} color="#F8FAFC" />
                </TouchableOpacity>
            </View>

            {/* Segmented Top Tabs: [Overview] [Categories] [Planner] */}
            <View style={styles.segmentedTabBar}>
                {['Overview', 'Categories', 'Planner'].map(tab => {
                    const isSelected = activeTab === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Main Content Area */}
            {activeTab === 'Planner' ? (
                <AdvancedWhatIfPlanner onBack={() => setActiveTab('Overview')} />
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#3B82F6"
                            colors={['#3B82F6']}
                            progressBackgroundColor="#0F172A"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === 'Overview' && (
                        <>
                            {/* Screen 1: Financial Health Overview */}
                            <FinancialHealthCard
                                financialHealth={vm.financialHealth}
                                onSeeDetails={() => setActiveTab('Categories')}
                            />

                            {/* Screen 1 lower: Needs Attention */}
                            <NeedsAttentionList
                                items={vm.needsAttention}
                                onSelectCategory={(cat) => setSelectedCategory(cat)}
                                onSeeAll={() => setActiveTab('Categories')}
                            />

                            {/* Screen 2: Allocation Strategy */}
                            <AllocationStrategyCard
                                allocation={vm.allocation}
                                onChangeStrategy={(stratId) => setSelectedStrategyId(stratId)}
                            />

                            {/* Screen 3: Cash Flow & Commitments */}
                            <CashFlowTimelineCard
                                cashFlow={vm.cashFlow}
                                onSelectLowBalance={() => setCalendarVisible(true)}
                                onSelectCommitment={() => setCalendarVisible(true)}
                                onSeeAll={() => setCalendarVisible(true)}
                            />

                            {/* Screen 6: Forecast & Recommendations */}
                            <SpendingForecastCard
                                forecast={vm.forecast}
                                onSelectRecommendation={(rec) => {
                                    if (rec.category) {
                                        const found = vm.categories.find(c => c.category === rec.category);
                                        if (found) setSelectedCategory(found);
                                    }
                                }}
                                onSeeAll={() => setActiveTab('Categories')}
                            />
                        </>
                    )}

                    {activeTab === 'Categories' && (
                        /* Screen 4: All Budget Categories */
                        <BudgetCategoriesList
                            categories={vm.categories}
                            onSelectCategory={(cat) => setSelectedCategory(cat)}
                            onAddBudget={() => setAddBudgetVisible(true)}
                        />
                    )}
                </ScrollView>
            )}

            {/* Screen 5: Category Detail with Insights Modal */}
            <CategoryDetailModal
                visible={!!selectedCategory}
                category={selectedCategory}
                onClose={() => setSelectedCategory(null)}
                onAdjustBudget={(cat) => {
                    setSelectedCategory(null);
                    setAddBudgetVisible(true);
                }}
                onViewTransactions={() => {
                    setSelectedCategory(null);
                    router.push('/(tabs)/transactions');
                }}
            />

            {/* Screen 8: Calendar View & Month Summary Modal */}
            <BudgetCalendarModal
                visible={calendarVisible}
                onClose={() => setCalendarVisible(false)}
                calendarData={vm.calendar}
                reconciledTotals={vm.reconciledTotals}
            />

            {/* Add / Edit Budget Modal */}
            <AddBudgetModal
                visible={addBudgetVisible}
                onClose={() => setAddBudgetVisible(false)}
                onSave={handleSaveBudget}
            />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#030712'
    },
    topNav: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 10
    },
    navBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center'
    },
    titleContainer: {
        alignItems: 'center'
    },
    screenTitle: {
        color: '#F8FAFC',
        fontSize: 17,
        fontWeight: '700'
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 2
    },
    monthText: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '500'
    },
    calendarBtn: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    segmentedTabBar: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 4,
        marginHorizontal: 16,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10
    },
    tabButtonActive: {
        backgroundColor: '#1E293B'
    },
    tabButtonText: {
        color: '#64748B',
        fontSize: 13,
        fontWeight: '600'
    },
    tabButtonTextActive: {
        color: '#F8FAFC'
    },
    scrollView: {
        flex: 1
    },
    scrollContent: {
        paddingBottom: 36
    }
});
