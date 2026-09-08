/**
 * app/(tabs)/banking-credit.js
 * 
 * FinLife Banking & Credit Unified Experience Screen.
 * 
 * Consolidates Banking, Formal Loans, and EMI Tracker into a single parent module:
 * - Overview: 5 calm metric cards (Bank Balance, Loan Debt, Upcoming, Overdue, Net Position)
 * - Accounts: Bank accounts, balance history, and delegated management
 * - Loans: Formal loan facilities, amortizations, prepayment simulator
 * - Repayments: Upcoming / Paid / Overdue installments projected from authoritative loan contracts
 * 
 * Guarantees:
 * - Zero domain mutations during render or refresh.
 * - Exact 64-bit BigInt paise arithmetic.
 * - Two-tier back navigation.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, BackHandler, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, Menu } from 'lucide-react-native';

import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { BankingCreditViewModel } from '../../services/banking-credit/bankingCreditViewModel.js';
import { BANKING_CREDIT_TABS, resolveBankingCreditRoute } from '../../services/banking-credit/bankingCreditContracts.js';

import BankingCreditOverview from '../../components/banking-credit/BankingCreditOverview.js';
import AccountsView from '../../components/banking-credit/AccountsView.js';
import LoansView from '../../components/banking-credit/LoansView.js';
import RepaymentsView from '../../components/banking-credit/RepaymentsView.js';

export default function BankingCreditScreen({ initialTab = null }) {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();

    const [activeTab, setActiveTab] = useState(initialTab || params?.tab || BANKING_CREDIT_TABS.OVERVIEW);
    const [repaymentInitialFilter, setRepaymentInitialFilter] = useState('UPCOMING');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [vmData, setVmData] = useState(null);

    // Sync tab from query parameters if present
    useEffect(() => {
        if (params?.tab) {
            const resolved = resolveBankingCreditRoute('banking-credit', { tab: params.tab });
            if (resolved.targetTab) {
                setActiveTab(resolved.targetTab);
            }
        }
    }, [params?.tab]);

    const loadData = useCallback(async () => {
        try {
            const data = await BankingCreditViewModel.getUnifiedOverview();
            setVmData(data);
        } catch (error) {
            console.error('[BankingCreditScreen] Error loading unified data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Two-tier back navigation contract (BC-INV-12)
    const handleBack = useCallback(() => {
        if (activeTab !== BANKING_CREDIT_TABS.OVERVIEW) {
            setActiveTab(BANKING_CREDIT_TABS.OVERVIEW);
            return true;
        }
        if (router.canGoBack()) {
            router.back();
            return true;
        }
        router.replace('/(tabs)');
        return true;
    }, [activeTab, router]);

    useEffect(() => {
        const onBackPress = () => handleBack();
        const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
        return () => subscription.remove();
    }, [handleBack]);

    const handleSelectTabFromCard = (tabId, optionalFilter = null) => {
        if (optionalFilter) {
            setRepaymentInitialFilter(optionalFilter);
        }
        setActiveTab(tabId);
    };

    return (
        <AnimatedScreen style={styles.container}>
            {/* Top Navigation Bar */}
            <View style={[styles.topNav, { paddingTop: Math.max(insets?.top || 0, 48) + 8 }]}>
                <TouchableOpacity
                    onPress={handleBack}
                    style={styles.navBtn}
                    activeOpacity={0.7}
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <ChevronLeft size={24} color="#F8FAFC" />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <Text style={styles.screenTitle}>Banking & Credit</Text>
                    <Text style={styles.screenSubtitle}>
                        {activeTab === BANKING_CREDIT_TABS.OVERVIEW && 'Consolidated Overview'}
                        {activeTab === BANKING_CREDIT_TABS.ACCOUNTS && 'Bank Accounts & Balances'}
                        {activeTab === BANKING_CREDIT_TABS.LOANS && 'Formal Loans & Debt'}
                        {activeTab === BANKING_CREDIT_TABS.REPAYMENTS && 'EMI Repayment Calendar'}
                    </Text>
                </View>

                <View style={styles.navPlaceholder} />
            </View>

            {/* Segmented Top Switcher: [Overview] [Accounts] [Loans] [Repayments] */}
            <View style={styles.segmentedTabBar}>
                {[
                    { id: BANKING_CREDIT_TABS.OVERVIEW, label: 'Overview' },
                    { id: BANKING_CREDIT_TABS.ACCOUNTS, label: 'Accounts' },
                    { id: BANKING_CREDIT_TABS.LOANS, label: 'Loans' },
                    { id: BANKING_CREDIT_TABS.REPAYMENTS, label: 'Repayments' }
                ].map(tab => {
                    const isSelected = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                            onPress={() => setActiveTab(tab.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabButtonText, isSelected && styles.tabButtonTextActive]}>
                                {tab.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Content Area */}
            {loading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#38BDF8" />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#38BDF8"
                            colors={['#38BDF8']}
                            progressBackgroundColor="#0F172A"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    {activeTab === BANKING_CREDIT_TABS.OVERVIEW && (
                        <BankingCreditOverview
                            overview={vmData?.overview}
                            diagnostics={vmData?.diagnostics}
                            onSelectTab={handleSelectTabFromCard}
                        />
                    )}

                    {activeTab === BANKING_CREDIT_TABS.ACCOUNTS && (
                        <AccountsView
                            accounts={vmData?.accounts || []}
                            totalBankBalanceFormatted={vmData?.overview?.formattedTotalBankBalance || '₹0'}
                            onAccountAdded={loadData}
                        />
                    )}

                    {activeTab === BANKING_CREDIT_TABS.LOANS && (
                        <LoansView
                            loans={vmData?.loans || []}
                            totalLoanOutstandingFormatted={vmData?.overview?.formattedTotalLoanOutstanding || '₹0'}
                            onLoanAdded={loadData}
                        />
                    )}

                    {activeTab === BANKING_CREDIT_TABS.REPAYMENTS && (
                        <RepaymentsView
                            repayments={vmData?.repayments || []}
                            initialFilter={repaymentInitialFilter}
                            onRepaymentPaid={loadData}
                        />
                    )}
                </ScrollView>
            )}
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
        paddingBottom: 12
    },
    navBtn: {
        width: 44,
        height: 44,
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
    screenSubtitle: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2
    },
    navPlaceholder: {
        width: 44
    },
    segmentedTabBar: {
        flexDirection: 'row',
        backgroundColor: '#0F172A',
        borderRadius: 14,
        padding: 4,
        marginHorizontal: 16,
        marginBottom: 12,
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
        fontSize: 12,
        fontWeight: '600'
    },
    tabButtonTextActive: {
        color: '#F8FAFC',
        fontWeight: '700'
    },
    scrollView: {
        flex: 1
    },
    scrollContent: {
        paddingBottom: 40
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
