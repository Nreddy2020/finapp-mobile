/**
 * app/(tabs)/properties.js
 *
 * FinLife Properties Module — Canonical Standalone Screen.
 * Implements Top-Level Navigation & 10-Screen Mockup Parity matching properties_mockups.jpg:
 * 1. Real Estate Dashboard (Hero Portfolio Card, Rental Cashflow Bar, Active Asset Cards, Exact Reconciliation Check)
 * 2. Multi-Type Portfolio List (Filterable by Houses, Flats, Plots, Commercial, Rented, Sold)
 * 3. Property Detail Drilldowns (Screens 3 to 10 via PropertyDetailView with 8 Sub-Tabs:
 *    Overview, Financials, Rental, Documents, Ownership, Location, Timeline, Risk)
 *
 * Guarantees:
 * - ZERO financial calculations inside React components (consumes presentation adapters).
 * - JavaScript BigInt values bounded to signed 64-bit monetary domain.
 * - Strict non-property boundary (Property records strictly managed in Properties module).
 * - Read-only external projections.
 * - Two-tier hardware/header back navigation.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  BackHandler,
  ActivityIndicator,
  StatusBar
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Menu,
  Building2,
  Layers,
  LayoutDashboard,
  Sparkles
} from 'lucide-react-native';

import { useDrawer } from './_layout';
import { PropertyService } from '../../services/propertyService.js';
import { getRealEstateCFOProjection } from '../../components/properties/propertyCFOAdapter.js';
import { getLinkedPropertyLoanProjection } from '../../components/properties/propertyIntegrationAdapters.js';
import {
  getDashboardViewModel,
  getPropertiesListViewModel
} from '../../components/properties/propertyPresentationAdapter.js';

import PropertiesDashboardView from '../../components/properties/PropertiesDashboardView.js';
import PropertiesListView from '../../components/properties/PropertiesListView.js';
import PropertyDetailView from '../../components/properties/PropertyDetailView.js';

export const PROPERTIES_TABS = Object.freeze({
  DASHBOARD: 'Dashboard',
  PORTFOLIO: 'Portfolio'
});

export default function PropertiesScreen() {
  const insets = useSafeAreaInsets();
  const { setIsDrawerOpen } = useDrawer() || {};

  const [activeTab, setActiveTab] = useState(PROPERTIES_TABS.DASHBOARD);
  const [properties, setProperties] = useState([]);
  const [cfoProjection, setCfoProjection] = useState(null);
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [selectedLoanProjection, setSelectedLoanProjection] = useState(null);
  const [currentFilter, setCurrentFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // ───────────────────────────────────────────────────────────────────────────
  // Data Loading & Cold Seed Assurance
  // ───────────────────────────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    try {
      // Seed canonical properties on initial launch if registry is empty
      const list = await PropertyService.seedCanonicalProperties();
      setProperties(list);

      // Compute authoritative CFO projection
      const proj = await getRealEstateCFOProjection({
        propertiesList: list,
        targetMemberId: 'self'
      });
      setCfoProjection(proj);
    } catch (err) {
      console.error('Failed to load properties data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ───────────────────────────────────────────────────────────────────────────
  // Two-Tier Back Navigation
  // ───────────────────────────────────────────────────────────────────────────

  const handleBack = useCallback(() => {
    if (selectedProperty !== null) {
      setSelectedProperty(null);
      setSelectedLoanProjection(null);
      return true;
    }
    if (activeTab !== PROPERTIES_TABS.DASHBOARD) {
      setActiveTab(PROPERTIES_TABS.DASHBOARD);
      return true;
    }
    return false; // Let OS propagate back
  }, [selectedProperty, activeTab]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => sub.remove();
  }, [handleBack]);

  // ───────────────────────────────────────────────────────────────────────────
  // Property Selection Handler
  // ───────────────────────────────────────────────────────────────────────────

  const handleSelectProperty = useCallback(async (propertyId) => {
    const prop = properties.find(p => p.propertyId === propertyId);
    if (!prop) return;

    setSelectedProperty(prop);

    if (prop.linkedLoanId) {
      try {
        const loanProj = await getLinkedPropertyLoanProjection(prop.linkedLoanId);
        setSelectedLoanProjection(loanProj);
      } catch {
        setSelectedLoanProjection(null);
      }
    } else {
      setSelectedLoanProjection(null);
    }
  }, [properties]);

  // ───────────────────────────────────────────────────────────────────────────
  // Pure Presentation ViewModels (ZERO Financial Math in React)
  // ───────────────────────────────────────────────────────────────────────────

  const dashboardViewModel = useMemo(() => {
    return getDashboardViewModel({
      propertiesList: properties,
      cfoProjection,
      targetMemberId: 'self'
    });
  }, [properties, cfoProjection]);

  const listViewModel = useMemo(() => {
    return getPropertiesListViewModel({
      propertiesList: properties,
      filterCategory: currentFilter,
      targetMemberId: 'self'
    });
  }, [properties, currentFilter]);

  // ───────────────────────────────────────────────────────────────────────────
  // Render: Detail Drilldown (Screens 3 to 10)
  // ───────────────────────────────────────────────────────────────────────────

  if (selectedProperty) {
    return (
      <View style={[styles.screenContainer, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor="#09090B" />
        <PropertyDetailView
          property={selectedProperty}
          loanProjection={selectedLoanProjection}
          onBack={() => {
            setSelectedProperty(null);
            setSelectedLoanProjection(null);
          }}
          targetMemberId="self"
        />
      </View>
    );
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Render: Main Screen (Screens 1 & 2)
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screenContainer, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#09090B" />

      {/* Top Header */}
      <View style={styles.topHeader}>
        <View style={styles.headerLeftRow}>
          <TouchableOpacity
            onPress={() => setIsDrawerOpen && setIsDrawerOpen(true)}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <Menu size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleCol}>
            <View style={styles.brandBadgeRow}>
              <Building2 size={16} color="#3B82F6" />
              <Text style={styles.headerTitle}>Properties</Text>
            </View>
            <Text style={styles.headerSubtitle}>Authoritative Real Estate Ledger</Text>
          </View>
        </View>

        <View style={styles.certifiedChip}>
          <Sparkles size={12} color="#10B981" />
          <Text style={styles.certifiedChipText}>Sealed</Text>
        </View>
      </View>

      {/* Top-Level Tab Switcher: Dashboard (Screen 1) vs Portfolio (Screen 2) */}
      <View style={styles.tabSwitcherContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === PROPERTIES_TABS.DASHBOARD && styles.tabButtonActive]}
          onPress={() => setActiveTab(PROPERTIES_TABS.DASHBOARD)}
          activeOpacity={0.7}
        >
          <LayoutDashboard
            size={16}
            color={activeTab === PROPERTIES_TABS.DASHBOARD ? '#3B82F6' : '#71717A'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === PROPERTIES_TABS.DASHBOARD && styles.tabButtonTextActive
            ]}
          >
            Dashboard
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === PROPERTIES_TABS.PORTFOLIO && styles.tabButtonActive]}
          onPress={() => setActiveTab(PROPERTIES_TABS.PORTFOLIO)}
          activeOpacity={0.7}
        >
          <Layers
            size={16}
            color={activeTab === PROPERTIES_TABS.PORTFOLIO ? '#3B82F6' : '#71717A'}
          />
          <Text
            style={[
              styles.tabButtonText,
              activeTab === PROPERTIES_TABS.PORTFOLIO && styles.tabButtonTextActive
            ]}
          >
            Portfolio ({properties.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3B82F6" />
          <Text style={styles.loadingText}>Loading Real Estate Ledger...</Text>
        </View>
      ) : activeTab === PROPERTIES_TABS.DASHBOARD ? (
        <PropertiesDashboardView
          viewModel={dashboardViewModel}
          onSelectProperty={handleSelectProperty}
          onNavigateTab={(tab) => {
            if (tab === 'Portfolio') setActiveTab(PROPERTIES_TABS.PORTFOLIO);
          }}
        />
      ) : (
        <PropertiesListView
          viewModel={listViewModel}
          onSelectProperty={handleSelectProperty}
          onSelectFilter={setCurrentFilter}
          currentFilter={currentFilter}
        />
      )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B'
  },
  headerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  menuButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#18181B'
  },
  headerTitleCol: {
    justifyContent: 'center'
  },
  brandBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3
  },
  headerSubtitle: {
    color: '#71717A',
    fontSize: 11,
    marginTop: 1
  },
  certifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  certifiedChipText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700'
  },
  tabSwitcherContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#09090B',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#18181B'
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#18181B'
  },
  tabButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.4)'
  },
  tabButtonText: {
    color: '#71717A',
    fontSize: 13,
    fontWeight: '600'
  },
  tabButtonTextActive: {
    color: '#3B82F6',
    fontWeight: '700'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12
  },
  loadingText: {
    color: '#71717A',
    fontSize: 13
  }
});
