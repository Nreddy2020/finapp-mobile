/**
 * app/(tabs)/group-expenses.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Main Screen.
 * 
 * Implements the 12-screen design mockup layout:
 * - Net Balance Hero Overview (You Owe, You Are Owed, Total Net)
 * - Category & Status Filter Chips
 * - Group Cards with Live Invariant Balances & Avatar Stacks
 * - Comprehensive Modals for Create Group, Add Expense, Group Detail,
 *   Settle Up, Expense Detail, and Cryptographic Audit Verification.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, RefreshControl, Text, StyleSheet, Pressable, Alert, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Users, Plus, TrendingUp, Sparkles, Receipt, RefreshCw, Compass, Home, Coffee, Briefcase, Filter } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import GroupCard from '../../components/groups/GroupCard';
import CreateGroupModal from '../../components/groups/CreateGroupModal';
import AddExpenseModal from '../../components/groups/AddExpenseModal';
import RecordSettlementModal from '../../components/groups/RecordSettlementModal';
import GroupDetailModal from '../../components/groups/GroupDetailModal';
import ExpenseDetailModal from '../../components/groups/ExpenseDetailModal';
import { GroupViewModel } from '../../services/shared-costs/groupViewModel.js';
import { GroupRepository } from '../../services/shared-costs/groupRepository.js';

export default function GroupExpensesScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('ALL'); // 'ALL', 'ACTIVE', 'SETTLED', 'TRIP', 'HOME'

    // Modals
    const [createGroupVisible, setCreateGroupVisible] = useState(false);
    const [addExpenseVisible, setAddExpenseVisible] = useState(false);
    const [groupDetailVisible, setGroupDetailVisible] = useState(false);
    const [recordSettlementVisible, setRecordSettlementVisible] = useState(false);
    const [expenseDetailVisible, setExpenseDetailVisible] = useState(false);

    // Active Selection State
    const [activeGroup, setActiveGroup] = useState(null);
    const [activeGroupDetail, setActiveGroupDetail] = useState(null);
    const [prefilledSettlement, setPrefilledSettlement] = useState(null);
    const [activeExpense, setActiveExpense] = useState(null);

    const loadData = useCallback(async () => {
        try {
            let data = await GroupViewModel.getDashboardData('You');
            if (!data || data.groups.length === 0) {
                data = await GroupViewModel.seedMockupDemoData();
            }
            setDashboardData(data);
        } catch (err) {
            console.error('[GroupExpensesScreen] Error loading data:', err);
            Alert.alert('Error Loading Groups', err.message);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    const handleBack = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    }, [router]);

    useEffect(() => {
        const onBackPress = () => {
            if (expenseDetailVisible) {
                setExpenseDetailVisible(false);
                return true;
            }
            if (recordSettlementVisible) {
                setRecordSettlementVisible(false);
                return true;
            }
            if (addExpenseVisible) {
                setAddExpenseVisible(false);
                return true;
            }
            if (createGroupVisible) {
                setCreateGroupVisible(false);
                return true;
            }
            if (groupDetailVisible) {
                setGroupDetailVisible(false);
                return true;
            }
            handleBack();
            return true;
        };

        const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => sub.remove();
    }, [expenseDetailVisible, recordSettlementVisible, addExpenseVisible, createGroupVisible, groupDetailVisible, handleBack]);

    const handleResetDemoData = async () => {
        Alert.alert(
            'Reset Demo Data',
            'Restore default mockup demo dataset (Goa Trip, Home Expenses, Office Friends)?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset Demo Data',
                    style: 'destructive',
                    onPress: async () => {
                        setLoading(true);
                        await GroupViewModel.seedMockupDemoData();
                        await loadData();
                    }
                }
            ]
        );
    };

    const handleOpenGroupDetail = async (group) => {
        try {
            const detail = await GroupViewModel.getGroupDetail(group.id, 'You');
            setActiveGroup(group);
            setActiveGroupDetail(detail);
            setGroupDetailVisible(true);
        } catch (err) {
            Alert.alert('Error', err.message);
        }
    };

    const handleCreateGroup = async (groupInput) => {
        try {
            await GroupViewModel.createGroup(groupInput);
            await loadData();
        } catch (err) {
            Alert.alert('Create Group Error', err.message);
        }
    };

    const handleAddExpense = async (expenseInput) => {
        if (!activeGroup) return;
        try {
            await GroupViewModel.addExpense(activeGroup.id, expenseInput);
            await loadData();
            // Refresh active detail if modal is open
            if (groupDetailVisible) {
                const updatedDetail = await GroupViewModel.getGroupDetail(activeGroup.id, 'You');
                setActiveGroupDetail(updatedDetail);
            }
        } catch (err) {
            Alert.alert('Add Expense Error', err.message);
        }
    };

    const handleRecordSettlement = async (settlementInput) => {
        if (!activeGroup) return;
        try {
            await GroupViewModel.recordSettlement(activeGroup.id, settlementInput);
            await loadData();
            if (groupDetailVisible) {
                const updatedDetail = await GroupViewModel.getGroupDetail(activeGroup.id, 'You');
                setActiveGroupDetail(updatedDetail);
            }
        } catch (err) {
            Alert.alert('Record Settlement Error', err.message);
        }
    };

    const handleSettleAllSuggestions = async (groupId, suggestions) => {
        try {
            await GroupViewModel.settleAllSuggestions(groupId, suggestions);
            await loadData();
            const updatedDetail = await GroupViewModel.getGroupDetail(groupId, 'You');
            setActiveGroupDetail(updatedDetail);
            Alert.alert('Settled!', 'All suggested debts recorded and settled successfully.');
        } catch (err) {
            Alert.alert('Batch Settle Error', err.message);
        }
    };

    const handleVoidExpense = async (expenseId, reason) => {
        if (!activeGroup) return;
        try {
            await GroupRepository.voidExpense(activeGroup.id, expenseId, reason);
            await loadData();
            if (groupDetailVisible) {
                const updatedDetail = await GroupViewModel.getGroupDetail(activeGroup.id, 'You');
                setActiveGroupDetail(updatedDetail);
            }
            Alert.alert('Expense Voided', 'The expense has been voided non-destructively.');
        } catch (err) {
            Alert.alert('Void Error', err.message);
        }
    };

    // Filter Logic
    const groups = dashboardData ? dashboardData.groups : [];
    const filteredGroups = groups.filter(g => {
        if (selectedFilter === 'ALL') return true;
        if (selectedFilter === 'ACTIVE') return !g.isSettled;
        if (selectedFilter === 'SETTLED') return g.isSettled;
        if (selectedFilter === 'TRIP') return g.type === 'TRIP';
        if (selectedFilter === 'HOME') return g.type === 'HOME' || g.type === 'RENT';
        return true;
    });

    const userSummary = dashboardData ? dashboardData.userSummary : {
        youOweFormatted: '₹0.00',
        youAreOwedFormatted: '₹0.00',
        netBalanceFormatted: '₹0.00',
        netBalancePaise: 0n
    };

    const isNetPositive = userSummary.netBalancePaise > 0n;
    const isNetNegative = userSummary.netBalancePaise < 0n;

    return (
        <AnimatedScreen style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
                <View style={styles.headerLeft}>
                    <Pressable
                        onPress={handleBack}
                        style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        accessibilityLabel="Go back"
                        accessibilityRole="button"
                    >
                        <ArrowLeft size={20} color="#F8FAFC" />
                    </Pressable>
                    <View>
                        <Text style={styles.headerLabel}>FinLife Universal</Text>
                        <Text style={styles.title}>Shared Costs</Text>
                    </View>
                </View>

                <View style={styles.headerActions}>
                    <Pressable style={styles.iconActionBtn} onPress={handleResetDemoData}>
                        <RefreshCw size={18} color="#94A3B8" />
                    </Pressable>
                    <Pressable style={styles.addBtnSmall} onPress={() => setCreateGroupVisible(true)}>
                        <Plus size={20} color="#FFF" />
                    </Pressable>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#F43F5E" />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Summary Card */}
                <View style={styles.heroCardWrapper}>
                    <LinearGradient
                        colors={['#1E293B', '#0F172A']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.heroGradient}
                    >
                        <View style={styles.heroTopRow}>
                            <View>
                                <Text style={styles.heroLabel}>Total Net Balance</Text>
                                <Text style={[
                                    styles.heroNetBalance,
                                    isNetPositive && styles.textEmerald,
                                    isNetNegative && styles.textRose
                                ]}>
                                    {userSummary.netBalanceFormatted}
                                </Text>
                            </View>

                            <View style={[
                                styles.heroBadge,
                                isNetPositive && styles.badgeEmerald,
                                isNetNegative && styles.badgeRose
                            ]}>
                                <Text style={[
                                    styles.heroBadgeText,
                                    isNetPositive && styles.textEmerald,
                                    isNetNegative && styles.textRose
                                ]}>
                                    {isNetPositive ? 'Overall Creditor' : isNetNegative ? 'Overall Debtor' : 'All Settled'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.heroDivider} />

                        {/* Split Columns */}
                        <View style={styles.heroColumns}>
                            <View style={styles.heroCol}>
                                <Text style={styles.colLabel}>You Are Owed</Text>
                                <Text style={styles.colAmountPositive}>{userSummary.youAreOwedFormatted}</Text>
                            </View>
                            <View style={styles.colSeparator} />
                            <View style={styles.heroCol}>
                                <Text style={styles.colLabel}>You Owe</Text>
                                <Text style={styles.colAmountNegative}>{userSummary.youOweFormatted}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* Filter Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
                    {[
                        { key: 'ALL', label: 'All Groups' },
                        { key: 'ACTIVE', label: 'Active Debts' },
                        { key: 'SETTLED', label: 'Settled' },
                        { key: 'TRIP', label: 'Trips' },
                        { key: 'HOME', label: 'Household' }
                    ].map(f => {
                        const isSelected = selectedFilter === f.key;
                        return (
                            <Pressable
                                key={f.key}
                                style={[styles.filterChip, isSelected && styles.filterChipActive]}
                                onPress={() => setSelectedFilter(f.key)}
                            >
                                <Text style={[styles.filterChipText, isSelected && styles.filterChipTextActive]}>
                                    {f.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>

                {/* Groups Section */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Your Groups ({filteredGroups.length})</Text>
                    <Pressable onPress={() => setCreateGroupVisible(true)}>
                        <Text style={styles.newGroupLink}>+ New Group</Text>
                    </Pressable>
                </View>

                {filteredGroups.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Users size={40} color="#475569" />
                        <Text style={styles.emptyTitle}>No matching groups</Text>
                        <Text style={styles.emptySub}>Create a new group or change filter</Text>
                    </View>
                ) : (
                    filteredGroups.map(group => (
                        <GroupCard
                            key={group.id}
                            group={group}
                            currentUserId="You"
                            onPress={() => handleOpenGroupDetail(group)}
                        />
                    ))
                )}
            </ScrollView>

            {/* MODALS */}
            <CreateGroupModal
                visible={createGroupVisible}
                onClose={() => setCreateGroupVisible(false)}
                onCreateGroup={handleCreateGroup}
            />

            <AddExpenseModal
                visible={addExpenseVisible}
                group={activeGroup}
                onClose={() => setAddExpenseVisible(false)}
                onAddExpense={handleAddExpense}
            />

            <GroupDetailModal
                visible={groupDetailVisible}
                groupDetail={activeGroupDetail}
                onClose={() => setGroupDetailVisible(false)}
                onOpenAddExpense={(group) => {
                    setActiveGroup(group);
                    setAddExpenseVisible(true);
                }}
                onOpenRecordSettlement={(group, sugg) => {
                    setActiveGroup(group);
                    setPrefilledSettlement(sugg);
                    setRecordSettlementVisible(true);
                }}
                onOpenExpenseDetail={(exp) => {
                    setActiveExpense(exp);
                    setExpenseDetailVisible(true);
                }}
                onSettleAllSuggestions={handleSettleAllSuggestions}
            />

            <RecordSettlementModal
                visible={recordSettlementVisible}
                group={activeGroup}
                prefilledSettlement={prefilledSettlement}
                onClose={() => {
                    setRecordSettlementVisible(false);
                    setPrefilledSettlement(null);
                }}
                onRecordSettlement={handleRecordSettlement}
            />

            <ExpenseDetailModal
                visible={expenseDetailVisible}
                expense={activeExpense}
                onClose={() => {
                    setExpenseDetailVisible(false);
                    setActiveExpense(null);
                }}
                onVoidExpense={handleVoidExpense}
            />
        </AnimatedScreen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A'
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    backBtnPressed: {
        backgroundColor: '#334155'
    },
    headerLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#F43F5E',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    title: {
        fontSize: 26,
        fontWeight: '800',
        color: '#F8FAFC'
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    iconActionBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#1E293B',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#334155'
    },
    addBtnSmall: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#F43F5E',
        alignItems: 'center',
        justifyContent: 'center'
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40
    },
    heroCardWrapper: {
        marginTop: 8,
        marginBottom: 16,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#334155'
    },
    heroGradient: {
        padding: 20
    },
    heroTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    heroLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    heroNetBalance: {
        fontSize: 32,
        fontWeight: '800',
        color: '#F8FAFC',
        marginTop: 2
    },
    heroBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: 'rgba(100, 116, 139, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(100, 116, 139, 0.3)'
    },
    heroBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#94A3B8'
    },
    badgeEmerald: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderColor: 'rgba(16, 185, 129, 0.3)'
    },
    badgeRose: {
        backgroundColor: 'rgba(244, 63, 94, 0.15)',
        borderColor: 'rgba(244, 63, 94, 0.3)'
    },
    textEmerald: {
        color: '#10B981'
    },
    textRose: {
        color: '#F43F5E'
    },
    heroDivider: {
        height: 1,
        backgroundColor: '#334155',
        marginVertical: 16
    },
    heroColumns: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    heroCol: {
        flex: 1
    },
    colSeparator: {
        width: 1,
        height: 30,
        backgroundColor: '#334155',
        marginHorizontal: 16
    },
    colLabel: {
        fontSize: 11,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    colAmountPositive: {
        fontSize: 18,
        fontWeight: '700',
        color: '#10B981',
        marginTop: 2
    },
    colAmountNegative: {
        fontSize: 18,
        fontWeight: '700',
        color: '#F43F5E',
        marginTop: 2
    },
    filterBar: {
        flexDirection: 'row',
        marginBottom: 16
    },
    filterChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: '#1E293B',
        borderWidth: 1,
        borderColor: '#334155',
        marginRight: 8
    },
    filterChipActive: {
        backgroundColor: '#F43F5E',
        borderColor: '#F43F5E'
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#94A3B8'
    },
    filterChipTextActive: {
        color: '#FFFFFF'
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#F8FAFC'
    },
    newGroupLink: {
        fontSize: 13,
        fontWeight: '600',
        color: '#38BDF8'
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 50,
        backgroundColor: '#1E293B',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#334155',
        borderStyle: 'dashed'
    },
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#94A3B8',
        marginTop: 12
    },
    emptySub: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 4
    }
});
