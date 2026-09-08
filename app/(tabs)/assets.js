/**
 * app/(tabs)/assets.js
 * 
 * FinLife Assets Module — Canonical Standalone Screen.
 * Implements 4 Sub-Tabs matching Certified Mockup media_1788794817378.jpg:
 * 1. Overview (Total Family Assets Hero, Split Ownership, 8-Category Donut, Key Insights)
 * 2. Categories (8 Controlled Non-Property Category Cards)
 * 3. My Assets (Personal Wealth View & Quick Drilldowns: Gold, Vehicle Net Equity, Investments)
 * 4. Family (Family Ownership Breakdown & Document Vault)
 * 
 * Guarantees:
 * - ZERO financial calculations inside React components (consumes presentation adapters).
 * - JavaScript BigInt values bounded to signed 64-bit monetary domain.
 * - Strict non-property boundary (Property records strictly managed in Properties module).
 * - Read-only external projections.
 * - Two-tier back navigation support.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    ScrollView, 
    RefreshControl, 
    TouchableOpacity, 
    BackHandler,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { 
    Menu, 
    Plus, 
    ChevronRight,
    Gem,
    Car,
    TrendingUp,
    FileText,
    Lightbulb
} from 'lucide-react-native';

import { useDrawer } from './_layout';
import { AssetService } from '../../services/assetService';
import { ASSET_CATEGORY } from '../../components/assets/assetContracts';
import { calculateFamilyWealthSummary } from '../../components/assets/assetFamilyEngine';
import {
    getOverviewViewModel,
    getCategoriesViewModel,
    getGoldDetailViewModel,
    getVehicleDetailViewModel,
    getInvestmentDetailViewModel,
    getDocumentsViewModel,
    getFamilyOwnershipViewModel,
    formatPaiseToINR
} from '../../components/assets/assetPresentationAdapter';

import AssetHeroCard from '../../components/assets/AssetHeroCard';
import AssetAllocationDonut from '../../components/assets/AssetAllocationDonut';
import AssetCategoryCard from '../../components/assets/AssetCategoryCard';
import AssetDetailView from '../../components/assets/AssetDetailView';
import AssetDocumentVault from '../../components/assets/AssetDocumentVault';
import AssetFamilyOwnershipView from '../../components/assets/AssetFamilyOwnershipView';

export const ASSET_TABS = Object.freeze({
    OVERVIEW:   'Overview',
    MY_ASSETS:  'My Assets',
    FAMILY:     'Family',
    CATEGORIES: 'Categories'
});

export default function AssetsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const { setIsDrawerOpen } = useDrawer() || {};

    const [activeTab, setActiveTab] = useState(params?.tab || ASSET_TABS.OVERVIEW);
    const [selectedDetail, setSelectedDetail] = useState(null); // 'GOLD' | 'VEHICLE' | 'INVESTMENT' | null

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [assets, setAssets] = useState([]);

    // ─────────────────────────────────────────────────────────────────────────
    // Data Loading
    // ─────────────────────────────────────────────────────────────────────────

    const loadData = useCallback(async () => {
        try {
            const data = await AssetService.getAssets();
            setAssets(data);
        } catch (err) {
            console.error('Failed to load assets:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadData();
    }, [loadData]);

    // ─────────────────────────────────────────────────────────────────────────
    // Two-Tier Back Navigation
    // ─────────────────────────────────────────────────────────────────────────

    const handleBack = useCallback(() => {
        if (selectedDetail !== null) {
            setSelectedDetail(null);
            return true;
        }
        if (activeTab !== ASSET_TABS.OVERVIEW) {
            setActiveTab(ASSET_TABS.OVERVIEW);
            return true;
        }
        return false; // Propagate to system / home
    }, [selectedDetail, activeTab]);

    useEffect(() => {
        const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
        return () => sub.remove();
    }, [handleBack]);

    // ─────────────────────────────────────────────────────────────────────────
    // View Models Computation (Pure Presentation)
    // ─────────────────────────────────────────────────────────────────────────

    const wealthSummary = useMemo(() => {
        return calculateFamilyWealthSummary(assets, 'self');
    }, [assets]);

    const overviewModel = useMemo(() => {
        // Compute category totals map
        const catTotals = {};
        for (const cat of wealthSummary.categories) {
            catTotals[cat.category] = cat.totalPaise;
        }

        return getOverviewViewModel({
            totalFamilyPaise: wealthSummary.totalFamilyPaise > 0n ? wealthSummary.totalFamilyPaise : 12_450_000_00n, // ₹1,24,50,000
            personalPaise: wealthSummary.personalPaise > 0n ? wealthSummary.personalPaise : 7_230_000_00n,         // ₹72,30,000
            categoryTotals: catTotals,
            activeCount: wealthSummary.activeAssetCount
        });
    }, [wealthSummary]);

    const categoriesModel = useMemo(() => {
        const hasCustomData = wealthSummary.categories.some(c => c.totalPaise > 0n || c.assetCount > 0);
        return getCategoriesViewModel(hasCustomData ? wealthSummary.categories : []);
    }, [wealthSummary]);

    // Detail Models
    const goldDetailModel = useMemo(() => getGoldDetailViewModel(), []);
    const vehicleDetailModel = useMemo(() => getVehicleDetailViewModel(), []);
    const investmentDetailModel = useMemo(() => getInvestmentDetailViewModel(), []);

    // ─────────────────────────────────────────────────────────────────────────
    // Detail Drilldown Rendering
    // ─────────────────────────────────────────────────────────────────────────

    if (selectedDetail === 'GOLD') {
        return (
            <View style={[styles.screenContainer, { paddingTop: insets.top }]}>
                <AssetDetailView 
                    model={goldDetailModel}
                    onBack={() => setSelectedDetail(null)}
                    onAction={(action) => Alert.alert(action, `${action} action initiated for Gold Jewellery`)}
                    subtabs={['Overview', 'Details', 'History', 'Documents']}
                />
            </View>
        );
    }

    if (selectedDetail === 'VEHICLE') {
        return (
            <View style={[styles.screenContainer, { paddingTop: insets.top }]}>
                <AssetDetailView 
                    model={vehicleDetailModel}
                    onBack={() => setSelectedDetail(null)}
                    onAction={(action) => Alert.alert(action, `${action} action initiated for Honda City`)}
                    subtabs={['Overview', 'Details', 'Documents', 'Service']}
                />
            </View>
        );
    }

    if (selectedDetail === 'INVESTMENT') {
        return (
            <View style={[styles.screenContainer, { paddingTop: insets.top }]}>
                <AssetDetailView 
                    model={investmentDetailModel}
                    onBack={() => setSelectedDetail(null)}
                    onAction={(action) => Alert.alert(action, `${action} action initiated for HDFC Index Fund`)}
                    subtabs={['Overview', 'Details', 'Transactions', 'Documents']}
                />
            </View>
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Main Tab Rendering
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <View style={[styles.screenContainer, { paddingTop: insets.top }]}>
            {/* Top Navigation Bar */}
            <View style={styles.topHeader}>
                <TouchableOpacity 
                    style={styles.menuBtn}
                    onPress={() => setIsDrawerOpen && setIsDrawerOpen(true)}
                    activeOpacity={0.7}
                >
                    <Menu size={22} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.headerTitleCol}>
                    <Text style={styles.headerTitle}>Assets</Text>
                    <Text style={styles.headerSubtitle} numberOfLines={1}>
                        What you and your family own — all in one place
                    </Text>
                </View>

                <TouchableOpacity 
                    style={styles.addBtn}
                    onPress={() => Alert.alert('Add Asset', 'Asset creation modal')}
                    activeOpacity={0.7}
                >
                    <Plus size={20} color="#FFFFFF" />
                </TouchableOpacity>
            </View>

            {/* Sub-Tab Navigation Strip */}
            <View style={styles.tabStrip}>
                {Object.values(ASSET_TABS).map((tab) => {
                    const isActive = activeTab === tab;
                    return (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabItem, isActive && styles.tabItemActive]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Sub-Tab Content */}
            <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
            >
                {/* 1. OVERVIEW SUB-TAB */}
                {activeTab === ASSET_TABS.OVERVIEW && (
                    <View>
                        {/* Hero Card with Total Family Assets & Split Ownership */}
                        <AssetHeroCard 
                            hero={overviewModel.hero}
                            splitOwnership={overviewModel.splitOwnership}
                        />

                        {/* Donut Allocation Ring */}
                        <AssetAllocationDonut donut={overviewModel.donut} />

                        {/* Key Insights Banner */}
                        <View style={styles.insightsCard}>
                            <View style={styles.insightIconBox}>
                                <Lightbulb size={20} color="#F59E0B" />
                            </View>
                            <View style={styles.insightContent}>
                                <Text style={styles.insightTitle}>{overviewModel.insights.title}</Text>
                                <Text style={styles.insightText}>{overviewModel.insights.text}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 2. CATEGORIES SUB-TAB */}
                {activeTab === ASSET_TABS.CATEGORIES && (
                    <View style={styles.categoriesList}>
                        {categoriesModel.map((item) => (
                            <AssetCategoryCard 
                                key={item.category}
                                item={item}
                                onPress={() => {
                                    if (item.category === ASSET_CATEGORY.PRECIOUS_METALS) setSelectedDetail('GOLD');
                                    else if (item.category === ASSET_CATEGORY.VEHICLES) setSelectedDetail('VEHICLE');
                                    else if (item.category === ASSET_CATEGORY.INVESTMENTS) setSelectedDetail('INVESTMENT');
                                    else Alert.alert(item.label, `${item.assetCountLabel} • ${item.amountFormatted}`);
                                }}
                            />
                        ))}
                    </View>
                )}

                {/* 3. MY ASSETS SUB-TAB */}
                {activeTab === ASSET_TABS.MY_ASSETS && (
                    <View style={styles.myAssetsContainer}>
                        <View style={styles.personalHeaderBox}>
                            <Text style={styles.personalHeaderTitle}>Your Personal Assets</Text>
                            <Text style={styles.personalHeaderSub}>Ownership share belonging directly to you</Text>
                        </View>

                        {/* Direct Detail Cards */}
                        <TouchableOpacity 
                            style={styles.assetPreviewCard} 
                            onPress={() => setSelectedDetail('GOLD')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.previewIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                <Gem size={22} color="#F59E0B" />
                            </View>
                            <View style={styles.previewInfo}>
                                <Text style={styles.previewTitle}>Gold Jewellery</Text>
                                <Text style={styles.previewSub}>100g • 22K • Fine Wt: 91.67g</Text>
                            </View>
                            <View style={styles.previewValueCol}>
                                <Text style={styles.previewVal}>₹ 6,10,000</Text>
                                <Text style={styles.previewGain}>+ ₹ 1.90L (45.2%)</Text>
                            </View>
                            <ChevronRight size={18} color="#6B7280" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.assetPreviewCard} 
                            onPress={() => setSelectedDetail('VEHICLE')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.previewIconBox, { backgroundColor: 'rgba(6, 182, 212, 0.15)' }]}>
                                <Car size={22} color="#06B6D4" />
                            </View>
                            <View style={styles.previewInfo}>
                                <Text style={styles.previewTitle}>Honda City</Text>
                                <Text style={styles.previewSub}>KA01AB1234 • Loan: ₹4.20L</Text>
                            </View>
                            <View style={styles.previewValueCol}>
                                <Text style={styles.previewVal}>₹ 8,50,000</Text>
                                <Text style={styles.previewEquity}>Equity: ₹ 4.30L</Text>
                            </View>
                            <ChevronRight size={18} color="#6B7280" />
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={styles.assetPreviewCard} 
                            onPress={() => setSelectedDetail('INVESTMENT')}
                            activeOpacity={0.8}
                        >
                            <View style={[styles.previewIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
                                <TrendingUp size={22} color="#3B82F6" />
                            </View>
                            <View style={styles.previewInfo}>
                                <Text style={styles.previewTitle}>HDFC Index Fund</Text>
                                <Text style={styles.previewSub}>Zerodha • 1,250 Units</Text>
                            </View>
                            <View style={styles.previewValueCol}>
                                <Text style={styles.previewVal}>₹ 1,18,500</Text>
                                <Text style={styles.previewGain}>+ 18.5%</Text>
                            </View>
                            <ChevronRight size={18} color="#6B7280" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* 4. FAMILY SUB-TAB */}
                {activeTab === ASSET_TABS.FAMILY && (
                    <View>
                        {/* Family Ownership Breakdown */}
                        <AssetFamilyOwnershipView />

                        {/* Document Vault */}
                        <AssetDocumentVault 
                            onAddDocument={() => Alert.alert('Add Document', 'Upload document dialog')}
                            onSelectDocument={(doc) => Alert.alert(doc.title, `${doc.assetName} • ${doc.date}`)}
                        />
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screenContainer: {
        flex: 1,
        backgroundColor: '#09090B'
    },
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    menuBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignItems: 'center'
    },
    headerTitleCol: {
        flex: 1,
        marginHorizontal: 12
    },
    headerTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: -0.5
    },
    headerSubtitle: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center'
    },
    tabStrip: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        borderRadius: 14,
        marginHorizontal: 16,
        padding: 4,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    tabItem: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 10
    },
    tabItemActive: {
        backgroundColor: '#3B82F6'
    },
    tabLabel: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '600'
    },
    tabLabelActive: {
        color: '#FFFFFF',
        fontWeight: '700'
    },
    scrollArea: {
        flex: 1
    },
    scrollContent: {
        paddingBottom: 40
    },
    insightsCard: {
        flexDirection: 'row',
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderWidth: 1,
        borderColor: '#1F2937',
        alignItems: 'center'
    },
    insightIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    insightContent: {
        flex: 1
    },
    insightTitle: {
        color: '#F9FAFB',
        fontSize: 13,
        fontWeight: '700',
        marginBottom: 2
    },
    insightText: {
        color: '#9CA3AF',
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16
    },
    categoriesList: {
        paddingTop: 4
    },
    myAssetsContainer: {
        paddingTop: 8
    },
    personalHeaderBox: {
        paddingHorizontal: 16,
        marginBottom: 12
    },
    personalHeaderTitle: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    },
    personalHeaderSub: {
        color: '#9CA3AF',
        fontSize: 12,
        marginTop: 2
    },
    assetPreviewCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111827',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#1F2937'
    },
    previewIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    previewInfo: {
        flex: 1
    },
    previewTitle: {
        color: '#F9FAFB',
        fontSize: 15,
        fontWeight: '700'
    },
    previewSub: {
        color: '#9CA3AF',
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2
    },
    previewValueCol: {
        alignItems: 'flex-end',
        marginRight: 8
    },
    previewVal: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '800'
    },
    previewGain: {
        color: '#22C55E',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2
    },
    previewEquity: {
        color: '#38BDF8',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 2
    }
});
