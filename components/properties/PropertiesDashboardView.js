/**
 * @file PropertiesDashboardView.js
 * @description Screen 1: Real Estate Dashboard & Portfolio Overview View.
 * Implements 10-Screen Mockup Parity for Screen 1 matching media_1788839572783.jpg:
 * 1. Real Estate Portfolio Hero Card (Total Family Real Estate, Your Share vs Family Value, Net Equity vs Debt, Active/Rented/Rent/LTV footer, Growth Badge).
 * 2. Property Allocation Breakdown (Segmented proportion bar, center portfolio total, Category cards with BPS percentages & amounts).
 * 3. Growth / Valuation Trend Banner (Unrealized gains, appreciation rate, valuation benchmarks).
 * 4. Rental Cashflow & Tenancy Card (Gross rent, Net income, Deposits Held explicitly badged as [LIABILITY], Tenancy status).
 * 5. Reconciliation Certified Banner (Dashboard Hero equals sum of active properties, Gap: ₹0).
 * 6. Recent Activity & Audit Feed (Valuation updates, lease agreements, property tax & documents).
 * 7. Active Portfolio Assets Preview (Top 2 properties with View All navigation to Portfolio tab).
 * 8. Quick Actions (+ Add Property).
 *
 * Invariant: ZERO financial calculations performed in this component.
 * Consumes pre-computed ViewModels from propertyPresentationAdapter.js.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  Building2,
  ShieldCheck,
  TrendingUp,
  Key,
  AlertTriangle,
  ChevronRight,
  CheckCircle2,
  ArrowUpRight,
  PieChart,
  Clock,
  Plus
} from 'lucide-react-native';

export default function PropertiesDashboardView({
  viewModel,
  onSelectProperty,
  onNavigateTab
}) {
  if (!viewModel) return null;

  const {
    hero,
    allocationDonut,
    growthBanner,
    rentalBanner,
    reconciliation,
    recentActivity = [],
    previewPropertyCards = [],
    propertyCards = []
  } = viewModel;

  const previewCards = previewPropertyCards.length > 0
    ? previewPropertyCards
    : propertyCards.slice(0, 2);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. Real Estate Portfolio Hero Card                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        {/* Top bar: Brand tag & Growth Badge */}
        <View style={styles.heroTopBar}>
          <View style={styles.heroTagRow}>
            <View style={styles.heroIconBadge}>
              <Building2 size={18} color="#3B82F6" />
            </View>
            <Text style={styles.heroTagText}>REAL ESTATE PORTFOLIO</Text>
          </View>

          {hero.growthBadge && (
            <View style={styles.growthBadgeChip}>
              <TrendingUp size={12} color="#10B981" />
              <Text style={styles.growthBadgeText}>{hero.growthBadge}</Text>
            </View>
          )}
        </View>

        {/* Total Family Real Estate Hero Number */}
        <Text style={styles.heroSubHeader}>Total Family Real Estate</Text>
        <Text style={styles.heroValue}>{hero.totalFamilyRealEstateLabel || hero.familyMarketValueLabel}</Text>

        {/* 2x2 Comparison Grid: Your Property Share vs Family Property Value, Personal Net Equity vs Attributed Debt */}
        <View style={styles.comparisonGrid}>
          {/* Row 1: Your Property Share vs Family Property Value */}
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonLabel}>Your Property Share</Text>
              <Text style={[styles.comparisonValue, { color: '#60A5FA' }]}>
                {hero.yourPropertyShareLabel || hero.yourShareLabel || hero.familyMarketValueLabel}
              </Text>
            </View>
            <View style={styles.gridDividerV} />
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonLabel}>Family Property Value</Text>
              <Text style={styles.comparisonValue}>
                {hero.familyPropertyValueLabel || hero.familyValueLabel || hero.familyMarketValueLabel}
              </Text>
            </View>
          </View>

          <View style={styles.gridDividerH} />

          {/* Row 2: Personal Net Equity vs Personal Attributed Debt */}
          <View style={styles.comparisonRow}>
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonLabel}>Personal Net Equity</Text>
              <Text style={[styles.comparisonValue, { color: '#10B981' }]}>
                {hero.personalNetEquityLabel || hero.personalEquityLabel}
              </Text>
            </View>
            <View style={styles.gridDividerV} />
            <View style={styles.comparisonCol}>
              <Text style={styles.comparisonLabel}>Personal Attributed Debt</Text>
              <Text style={[styles.comparisonValue, { color: hero.personalAttributedDebtLabel === '₹ 0' || hero.personalAttributedDebtLabel === '₹0' ? '#94A3B8' : '#F59E0B' }]}>
                {hero.personalAttributedDebtLabel || hero.familyDebtLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Hero Footer Bar: Active Properties, Rented Properties, Monthly Rent, LTV */}
        <View style={styles.heroFooterBar}>
          <View style={styles.footerMetric}>
            <Text style={styles.footerMetricLabel}>Active Assets</Text>
            <Text style={styles.footerMetricValue}>{hero.activePropertiesCount} Properties</Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerMetric}>
            <Text style={styles.footerMetricLabel}>Rented</Text>
            <Text style={styles.footerMetricValue}>
              {hero.rentedPropertiesCount ?? 0} {hero.rentedPropertiesCount === 1 ? 'Property' : 'Properties'}
            </Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerMetric}>
            <Text style={styles.footerMetricLabel}>Monthly Rent</Text>
            <Text style={[styles.footerMetricValue, { color: '#06B6D4' }]}>
              {hero.monthlyRentLabel || '₹ 0'}
            </Text>
          </View>
          <View style={styles.footerDivider} />
          <View style={styles.footerMetric}>
            <Text style={styles.footerMetricLabel}>LTV</Text>
            <Text style={styles.footerMetricValue}>{hero.ltvLabel || '0.00%'}</Text>
          </View>
        </View>

        {hero.isPartiallyResolved && (
          <View style={styles.warningBanner}>
            <AlertTriangle size={15} color="#F59E0B" />
            <Text style={styles.warningText}>Some linked mortgage balances are offline/unavailable</Text>
          </View>
        )}
      </View>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. Property Allocation Breakdown (Donut Simulation & Category Grid) */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {allocationDonut && allocationDonut.hasAllocation && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <PieChart size={18} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Property Allocation</Text>
            </View>
            <Text style={styles.sectionMeta}>{allocationDonut.centerAmountLabel}</Text>
          </View>

          {/* Segmented Proportional Visual Bar */}
          <View style={styles.allocationBarContainer}>
            {allocationDonut.categories.map((cat) => (
              <View
                key={cat.key}
                style={[
                  styles.allocationBarSegment,
                  {
                    flex: cat.flexWeight,
                    backgroundColor: cat.color
                  }
                ]}
              />
            ))}
          </View>

          {/* Categories Grid */}
          <View style={styles.categoriesGrid}>
            {allocationDonut.categories.map((cat) => (
              <View key={cat.key} style={styles.categoryCard}>
                <View style={styles.categoryTopRow}>
                  <View style={[styles.colorDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.categoryName} numberOfLines={1}>
                    {cat.label} ({cat.count})
                  </Text>
                </View>
                <View style={styles.categoryBottomRow}>
                  <Text style={styles.categoryValue}>{cat.valueLabel}</Text>
                  <Text style={[styles.categoryShare, { color: cat.color }]}>
                    {cat.sharePercentLabel}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. Growth / Valuation Trend Banner                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {growthBanner && (
        <View style={styles.growthCard}>
          <View style={styles.growthLeftIcon}>
            <TrendingUp size={20} color="#10B981" />
          </View>
          <View style={styles.growthTextCol}>
            <View style={styles.growthTitleRow}>
              <Text style={styles.growthHeadline}>{growthBanner.headline}</Text>
              <View style={styles.trendBadge}>
                <Text style={styles.trendBadgeText}>Trend</Text>
              </View>
            </View>
            <Text style={styles.growthSubtext}>{growthBanner.subtext}</Text>
          </View>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. Rental Cashflow & Tenancy Card                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <View style={styles.rentalCard}>
        <View style={styles.rentalHeader}>
          <View style={styles.rentalTitleRow}>
            <Key size={18} color="#06B6D4" />
            <Text style={styles.rentalCardTitle}>Rental Cashflow & Tenancy</Text>
          </View>
          <View style={styles.liabilityBadge}>
            <Text style={styles.liabilityBadgeText}>{rentalBanner.liabilityBadge}</Text>
          </View>
        </View>

        <View style={styles.rentalMetricsRow}>
          <View style={styles.rentalMetric}>
            <Text style={styles.rentalMetricLabel}>Annual Gross Rent</Text>
            <Text style={styles.rentalMetricValue}>{rentalBanner.annualGrossRentLabel}</Text>
          </View>
          <View style={styles.rentalMetric}>
            <Text style={styles.rentalMetricLabel}>Net Rental Income</Text>
            <Text style={[styles.rentalMetricValue, { color: '#10B981' }]}>
              {rentalBanner.annualNetRentLabel}
            </Text>
          </View>
          <View style={styles.rentalMetric}>
            <Text style={styles.rentalMetricLabel}>Deposits Held [Liability]</Text>
            <Text style={[styles.rentalMetricValue, { color: '#F59E0B' }]}>
              {rentalBanner.securityDepositsLiabilityLabel}
            </Text>
          </View>
        </View>

        {rentalBanner.tenancyStatusText && (
          <View style={styles.tenancyFooter}>
            <Text style={styles.tenancyFooterText}>{rentalBanner.tenancyStatusText}</Text>
          </View>
        )}
      </View>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. Reconciliation Assurance Banner                                  */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <View style={[styles.reconciliationCard, reconciliation.isReconciled ? styles.reconciledOk : styles.reconciledWarn]}>
        <View style={styles.reconLeft}>
          <CheckCircle2 size={18} color={reconciliation.isReconciled ? '#10B981' : '#F59E0B'} />
          <View style={styles.reconTextCol}>
            <Text style={styles.reconTitle}>
              {reconciliation.reconciliationBadge || (reconciliation.isReconciled ? 'Reconciliation Certified' : 'Reconciliation Pending')}
            </Text>
            <Text style={styles.reconSub}>
              {reconciliation.message || `Dashboard Hero equals sum of active properties (Gap: ${reconciliation.gapLabel})`}
            </Text>
          </View>
        </View>
      </View>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 6. Recent Activity & Audit Ledger                                   */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {recentActivity.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleRow}>
              <Clock size={16} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Recent Activity & Audit</Text>
            </View>
            <Text style={styles.sectionMeta}>{recentActivity.length} Events</Text>
          </View>

          <View style={styles.activityList}>
            {recentActivity.map((act, idx) => (
              <View
                key={act.id}
                style={[
                  styles.activityRow,
                  idx === recentActivity.length - 1 && { borderBottomWidth: 0 }
                ]}
              >
                <View style={[styles.activityDot, { backgroundColor: act.tagColor }]} />
                <View style={styles.activityInfoCol}>
                  <Text style={styles.activityTitle}>{act.title}</Text>
                  <Text style={styles.activitySub}>{act.propertyDisplayName}</Text>
                </View>
                <View style={styles.activityRightCol}>
                  <View style={[styles.activityTagPill, { backgroundColor: act.tagColor + '20' }]}>
                    <Text style={[styles.activityTagText, { color: act.tagColor }]}>{act.tag}</Text>
                  </View>
                  <Text style={styles.activityDate}>{act.date}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 7. Active Portfolio Assets (Preview of Top 2 Properties)            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <View style={styles.sectionHeaderRowOuter}>
        <Text style={styles.sectionTitleLarge}>Active Portfolio Assets</Text>
        <TouchableOpacity
          onPress={() => onNavigateTab && onNavigateTab('Portfolio')}
          style={styles.viewAllBtn}
          activeOpacity={0.7}
        >
          <Text style={styles.viewAllText}>View All ({propertyCards.length})</Text>
          <ChevronRight size={16} color="#3B82F6" />
        </TouchableOpacity>
      </View>

      {previewCards.map((card) => (
        <TouchableOpacity
          key={card.propertyId}
          style={styles.propertyCard}
          onPress={() => onSelectProperty && onSelectProperty(card.propertyId)}
          activeOpacity={0.7}
        >
          <View style={styles.cardTopRow}>
            <View style={[styles.typePill, { backgroundColor: card.typeColor + '20' }]}>
              <Text style={[styles.typePillText, { color: card.typeColor }]}>{card.typeLabel}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: card.badgeColor }]}>
              <Text style={styles.statusBadgeText}>{card.statusLabel}</Text>
            </View>
          </View>

          <Text style={styles.propertyTitle}>{card.displayName}</Text>

          <View style={styles.cardBottomRow}>
            <View>
              <Text style={styles.cardValLabel}>Current Valuation</Text>
              <Text style={styles.cardValAmount}>{card.marketValueLabel}</Text>
            </View>

            <View style={styles.cardActionRow}>
              <View style={[styles.riskPill, { borderColor: card.riskColor }]}>
                <ShieldCheck size={12} color={card.riskColor} />
                <Text style={[styles.riskPillText, { color: card.riskColor }]}>{card.riskLabel}</Text>
              </View>
              <ArrowUpRight size={18} color="#94A3B8" />
            </View>
          </View>
        </TouchableOpacity>
      ))}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 8. Quick Actions: Add Property                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      <TouchableOpacity
        style={styles.addPropertyBtn}
        onPress={() => onNavigateTab && onNavigateTab('Portfolio')}
        activeOpacity={0.8}
      >
        <Plus size={18} color="#FFFFFF" />
        <Text style={styles.addPropertyBtnText}>Add Real Estate Asset</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090B'
  },
  content: {
    padding: 16,
    paddingBottom: 48
  },

  // 1. Hero Portfolio Card
  heroCard: {
    backgroundColor: '#121829',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }
  },
  heroTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14
  },
  heroTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  heroIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  heroTagText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.8
  },
  growthBadgeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  growthBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700'
  },
  heroSubHeader: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 4
  },
  heroValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16
  },
  comparisonGrid: {
    backgroundColor: '#0A0E1A',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  comparisonCol: {
    flex: 1
  },
  comparisonLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 3
  },
  comparisonValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
  gridDividerV: {
    width: 1,
    height: 32,
    backgroundColor: '#1E293B',
    marginHorizontal: 12
  },
  gridDividerH: {
    height: 1,
    backgroundColor: '#1E293B',
    marginVertical: 10
  },
  heroFooterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B'
  },
  footerMetric: {
    flex: 1,
    alignItems: 'center'
  },
  footerMetricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2
  },
  footerMetricValue: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700'
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: '#1E293B'
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    padding: 10,
    borderRadius: 8,
    marginTop: 12,
    gap: 8
  },
  warningText: {
    color: '#F59E0B',
    fontSize: 12,
    flex: 1
  },

  // 2. Section Card & Allocation Breakdown
  sectionCard: {
    backgroundColor: '#121829',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  sectionMeta: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  allocationBarContainer: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    backgroundColor: '#1E293B',
    marginBottom: 14
  },
  allocationBarSegment: {
    height: '100%',
    marginRight: 2
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#0A0E1A',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  categoryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  categoryName: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    flex: 1
  },
  categoryBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  categoryValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  categoryShare: {
    fontSize: 11,
    fontWeight: '700'
  },

  // 3. Growth Banner
  growthCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    marginBottom: 14,
    gap: 12
  },
  growthLeftIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  growthTextCol: {
    flex: 1
  },
  growthTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2
  },
  growthHeadline: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
    marginRight: 6
  },
  trendBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  trendBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase'
  },
  growthSubtext: {
    color: '#94A3B8',
    fontSize: 11
  },

  // 4. Rental Card
  rentalCard: {
    backgroundColor: '#121829',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 14
  },
  rentalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  rentalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  rentalCardTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  liabilityBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  liabilityBadgeText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700'
  },
  rentalMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  rentalMetric: {
    flex: 1
  },
  rentalMetricLabel: {
    color: '#64748B',
    fontSize: 11,
    marginBottom: 2
  },
  rentalMetricValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700'
  },
  tenancyFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1E293B'
  },
  tenancyFooterText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500'
  },

  // 5. Reconciliation Card
  reconciliationCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1
  },
  reconciledOk: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.25)'
  },
  reconciledWarn: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.25)'
  },
  reconLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  reconTextCol: {
    flex: 1
  },
  reconTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '700'
  },
  reconSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 1
  },

  // 6. Recent Activity Feed
  activityList: {
    marginTop: 4
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 10
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4
  },
  activityInfoCol: {
    flex: 1
  },
  activityTitle: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600'
  },
  activitySub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 1
  },
  activityRightCol: {
    alignItems: 'flex-end',
    gap: 2
  },
  activityTagPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  activityTagText: {
    fontSize: 10,
    fontWeight: '700'
  },
  activityDate: {
    color: '#64748B',
    fontSize: 10
  },

  // 7. Preview Properties List
  sectionHeaderRowOuter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12
  },
  sectionTitleLarge: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2
  },
  viewAllText: {
    color: '#3B82F6',
    fontSize: 13,
    fontWeight: '600'
  },
  propertyCard: {
    backgroundColor: '#121829',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 12
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6
  },
  statusBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700'
  },
  propertyTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B'
  },
  cardValLabel: {
    color: '#64748B',
    fontSize: 11
  },
  cardValAmount: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  cardActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  riskPillText: {
    fontSize: 10,
    fontWeight: '600'
  },

  // 8. Add Property Button
  addPropertyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 6,
    marginBottom: 16
  },
  addPropertyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  }
});
