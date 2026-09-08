/**
 * app/(tabs)/investments.js
 *
 * FinLife Investments Module V1 — Canonical Standalone Screen (Phase 5).
 * Connects the certified Phase 1–4 backend engines to a production-grade UI layer.
 *
 * Implements 4 Sub-Tabs:
 * 1. Overview (Hero Portfolio Card, Freshness Banner, Asset Class Allocation, Key Metrics)
 * 2. Holdings (Filterable securities list by asset class, holding cards with P&L badges)
 * 3. Tax Lots & Audit (Tax lot inspector, FIFO depletions, Section 55(2)(aa) bonus shares, isolation audit)
 * 4. Personal CFO (Consolidated Balance Sheet Card with Personal vs Family BPS split)
 *
 * Guarantees:
 * - ZERO financial calculations inside React components (consumes presentation adapters).
 * - ZERO raw BigInt leaks into UI props.
 * - Exact UI state model: LOADING, EMPTY, AVAILABLE, STALE, PARTIAL, UNAVAILABLE, ERROR.
 * - Deterministic two-tier hardware/header back navigation.
 * - Strictly guarded development-only fixture seeding.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  BackHandler,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Menu,
  TrendingUp,
  Briefcase,
  Layers,
  PieChart,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Plus
} from 'lucide-react-native';

import { useDrawer } from './_layout';
import { InvestmentService } from '../../services/investmentService.js';
import {
  UI_STATE,
  getInvestmentsOverviewViewModel,
  getHoldingsListViewModel,
  getHoldingDetailViewModel,
  getCFOIntegrationViewModel
} from '../../components/investments/investmentUIPresentationAdapter.js';

import InvestmentHeroCard from '../../components/investments/InvestmentHeroCard.js';
import InvestmentHoldingCard from '../../components/investments/InvestmentHoldingCard.js';
import InvestmentHoldingDetailModal from '../../components/investments/InvestmentHoldingDetailModal.js';
import InvestmentAssetAllocationCard from '../../components/investments/InvestmentAssetAllocationCard.js';
import InvestmentCFOCard from '../../components/investments/InvestmentCFOCard.js';
import InvestmentTaxLotsAuditView from '../../components/investments/InvestmentTaxLotsAuditView.js';
import { COLORS, SPACING } from '../../constants/theme';

export const INVESTMENTS_TABS = Object.freeze({
  OVERVIEW: 'Overview',
  HOLDINGS: 'Holdings',
  TAX_LOTS: 'Tax Lots',
  PERSONAL_CFO: 'Personal CFO'
});

const HOLDING_FILTERS = [
  { id: 'ALL', label: 'All' },
  { id: 'EQUITY', label: 'Equities' },
  { id: 'MUTUAL_FUND', label: 'Mutual Funds' },
  { id: 'GOLD_ETF', label: 'Gold / SGB' },
  { id: 'REIT_INVIT', label: 'REITs' },
  { id: 'GOVERNMENT_SECURITY', label: 'Govt Debt' }
];

export default function InvestmentsScreen() {
  const insets = useSafeAreaInsets();
  const { setIsDrawerOpen } = useDrawer() || {};

  // Tab & Navigation State
  const [activeTab, setActiveTab] = useState(INVESTMENTS_TABS.OVERVIEW);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [selectedHoldingId, setSelectedHoldingId] = useState(null);
  const [ownershipMode, setOwnershipMode] = useState('PERSONAL');

  // Authoritative Domain Data State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const [portfolioValuation, setPortfolioValuation] = useState(null);
  const [taxLots, setTaxLots] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cfoSnapshot, setCfoSnapshot] = useState(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Data Loading Pipeline
  // ───────────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      setErrorMessage(null);

      // Fetch authoritative records from InvestmentService
      const [insts, accs, lots, rawHoldings, latestCfo] = await Promise.all([
        InvestmentService.getInstruments(),
        InvestmentService.getAccounts(),
        InvestmentService.getTaxLots(),
        InvestmentService.getHoldings(),
        InvestmentService.getLatestCFOSnapshot()
      ]);

      setInstruments(insts || []);
      setAccounts(accs || []);
      setTaxLots(lots || []);

      // If holdings exist, compute valuation snapshot
      if (rawHoldings && rawHoldings.length > 0) {
        const asOfDate = new Date().toISOString().split('T')[0];
        const valSnapshot = await InvestmentService.captureValuationSnapshot(asOfDate, {
          allowStale: true
        });
        setPortfolioValuation(valSnapshot);
      } else {
        setPortfolioValuation(null);
      }

      // Update or capture CFO Snapshot
      if (latestCfo) {
        setCfoSnapshot(latestCfo);
      } else {
        // Capture initial CFO snapshot
        const newCfo = await InvestmentService.captureCFOSnapshot({
          ownershipMode: 'PERSONAL'
        });
        setCfoSnapshot(newCfo);
      }
    } catch (err) {
      console.error('[InvestmentsScreen] Error loading authoritative data:', err);
      setErrorMessage(err.message || 'Failed to load investments ledger.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setIsRefreshing(true);
    loadData();
  }, [loadData]);

  // Explicit development-only fixture seeder (strictly blocked in production unless demo mode)
  const handleSeedDevelopmentFixtures = useCallback(async () => {
    const isDemoPermitted = Boolean(__DEV__) || process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE === 'true';
    if (!isDemoPermitted) {
      return; // Absolute production guard
    }
    setIsLoading(true);
    try {
      await InvestmentService.seedDemoPortfolio();
      await loadData();
    } catch (err) {
      console.error('[InvestmentsScreen] Seed fixtures error:', err);
      setErrorMessage(err.message);
      setIsLoading(false);
    }
  }, [loadData]);

  // ───────────────────────────────────────────────────────────────────────────
  // Hardware Back-Handler Support (Two-Tier Navigation)
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const onBackPress = () => {
      // Tier 1: If Holding Detail modal is open, close it
      if (selectedHoldingId) {
        setSelectedHoldingId(null);
        return true;
      }
      // Tier 2: If active tab is not OVERVIEW, return to OVERVIEW
      if (activeTab !== INVESTMENTS_TABS.OVERVIEW) {
        setActiveTab(INVESTMENTS_TABS.OVERVIEW);
        return true;
      }
      // Otherwise, allow default navigation / exit
      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [selectedHoldingId, activeTab]);

  // ───────────────────────────────────────────────────────────────────────────
  // Pure Presentation View Models (Zero BigInt, Zero Math in React)
  // ─────────────────────────────────────────────────────────────────────────

  const overviewVM = useMemo(() => {
    return getInvestmentsOverviewViewModel({
      portfolioValuation,
      asOfDate: portfolioValuation?.asOfDate,
      uiState: isLoading ? UI_STATE.LOADING : (portfolioValuation ? UI_STATE.AVAILABLE : UI_STATE.EMPTY)
    });
  }, [portfolioValuation, isLoading]);

  const holdingsVM = useMemo(() => {
    return getHoldingsListViewModel({
      portfolioValuation,
      instruments,
      accounts,
      selectedFilter
    });
  }, [portfolioValuation, instruments, accounts, selectedFilter]);

  const holdingDetailVM = useMemo(() => {
    if (!selectedHoldingId) return null;
    return getHoldingDetailViewModel({
      holdingId: selectedHoldingId,
      portfolioValuation,
      taxLots,
      instruments,
      accounts
    });
  }, [selectedHoldingId, portfolioValuation, taxLots, instruments, accounts]);

  const cfoVM = useMemo(() => {
    return getCFOIntegrationViewModel({
      cfoSnapshot,
      ownershipMode
    });
  }, [cfoSnapshot, ownershipMode]);

  // ───────────────────────────────────────────────────────────────────────────
  // Sub-Tab Rendering Logic
  // ───────────────────────────────────────────────────────────────────────────

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading authoritative investment ledgers...</Text>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.centerContainer}>
          <AlertTriangle size={36} color="#EF4444" style={{ marginBottom: 12 }} />
          <Text style={styles.errorTitle}>Ledger Verification Error</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <RefreshCw size={14} color="#F9FAFB" style={{ marginRight: 6 }} />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // EMPTY State across all views if no holdings exist
    const hasHoldings = portfolioValuation && portfolioValuation.holdingsCount > 0;

    switch (activeTab) {
      case INVESTMENTS_TABS.OVERVIEW:
        return (
          <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          >
            <InvestmentHeroCard
              hero={overviewVM.hero}
              freshnessBanner={overviewVM.freshnessBanner}
            />

            {overviewVM.assetAllocation?.length > 0 && (
              <InvestmentAssetAllocationCard allocation={overviewVM.assetAllocation} />
            )}

            {!hasHoldings && (
              <View style={styles.emptyCard}>
                <Briefcase size={32} color="#6B7280" style={{ marginBottom: 10 }} />
                <Text style={styles.emptyCardTitle}>No Securities Recorded</Text>
                <Text style={styles.emptyCardDesc}>
                  Your investment ledger is currently empty. Authoritative buys, SIP purchases, and holdings will appear here once booked.
                </Text>
                {(Boolean(__DEV__) || process.env.EXPO_PUBLIC_ENABLE_DEMO_MODE === 'true') && (
                  <TouchableOpacity style={styles.devSeedBtn} onPress={handleSeedDevelopmentFixtures}>
                    <Plus size={14} color="#3B82F6" style={{ marginRight: 6 }} />
                    <Text style={styles.devSeedText}>Seed Demo Portfolio</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        );

      case INVESTMENTS_TABS.HOLDINGS:
        return (
          <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          >
            {/* Filter Chips Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
              {HOLDING_FILTERS.map(f => {
                const isSelected = selectedFilter === f.id;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.filterChip, isSelected && styles.filterChipActive]}
                    onPress={() => setSelectedFilter(f.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.filterText, isSelected && styles.filterTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Holdings Cards */}
            {holdingsVM.holdings?.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyCardTitle}>No Matching Securities</Text>
                <Text style={styles.emptyCardDesc}>
                  No holdings found under filter: {selectedFilter}.
                </Text>
              </View>
            ) : (
              holdingsVM.holdings.map(h => (
                <InvestmentHoldingCard
                  key={h.holdingId}
                  holding={h}
                  onPress={(item) => setSelectedHoldingId(item.holdingId)}
                />
              ))
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        );

      case INVESTMENTS_TABS.TAX_LOTS:
        return (
          <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          >
            <InvestmentTaxLotsAuditView
              holdings={holdingsVM.holdings || []}
              taxLots={taxLots}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        );

      case INVESTMENTS_TABS.PERSONAL_CFO:
        return (
          <ScrollView
            style={styles.tabContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#3B82F6" />}
          >
            <InvestmentCFOCard
              cfo={cfoVM}
              ownershipMode={ownershipMode}
              onToggleOwnership={(mode) => setOwnershipMode(mode)}
              onRefresh={loadData}
            />
            <View style={{ height: 40 }} />
          </ScrollView>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#12141A" />

      {/* Top Navigation Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={() => setIsDrawerOpen && setIsDrawerOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Open Navigation Drawer"
        >
          <Menu size={22} color="#F9FAFB" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.appTitle}>WealthWise</Text>
          <Text style={styles.screenSubtitle}>INVESTMENTS</Text>
        </View>

        <View style={styles.rightPlaceholder} />
      </View>

      {/* Sub-Tabs Selector */}
      <View style={styles.subTabsContainer}>
        {Object.values(INVESTMENTS_TABS).map(tab => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.subTabItem, isActive && styles.subTabItemActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.subTabText, isActive && styles.subTabTextActive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Tab Content Body */}
      {renderContent()}

      {/* Holding & Tax Lots Drilldown Modal */}
      <InvestmentHoldingDetailModal
        visible={Boolean(selectedHoldingId)}
        detail={holdingDetailVM}
        onClose={() => setSelectedHoldingId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#12141A'
  },
  topNav: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  menuButton: {
    padding: 6,
    borderRadius: 8
  },
  titleContainer: {
    alignItems: 'center'
  },
  appTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 0.5
  },
  screenSubtitle: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#60A5FA'
  },
  rightPlaceholder: {
    width: 32
  },
  subTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: '#161920',
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  subTabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8
  },
  subTabItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)'
  },
  subTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF'
  },
  subTabTextActive: {
    color: '#60A5FA',
    fontWeight: '800'
  },
  tabContent: {
    flex: 1,
    padding: SPACING.md
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg
  },
  loadingText: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 12
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#EF4444',
    marginBottom: 6
  },
  errorText: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginBottom: 16
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3B82F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  emptyCard: {
    backgroundColor: '#1E222B',
    borderRadius: 16,
    padding: SPACING.lg,
    alignItems: 'center',
    marginVertical: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  emptyCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#F9FAFB',
    marginBottom: 6
  },
  emptyCardDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 12
  },
  devSeedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  devSeedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#60A5FA'
  },
  filtersRow: {
    flexDirection: 'row',
    marginBottom: SPACING.md
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1E222B',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)'
  },
  filterChipActive: {
    backgroundColor: '#2A2F3D',
    borderColor: '#3B82F6'
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF'
  },
  filterTextActive: {
    color: '#F9FAFB',
    fontWeight: '700'
  }
});
