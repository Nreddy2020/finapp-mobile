/**
 * @file PropertyDetailView.js
 * @description Screens 3 to 10: Unified Property Drilldown Container.
 * Features 8 Sub-Tabs covering:
 * - Overview (Screen 3)
 * - Financials (Screen 4)
 * - Rental & Tenancy (Screen 5)
 * - Documents Vault (Screen 6)
 * - Ownership & Co-Owners (Screen 7)
 * - Location & Layout (Screen 8)
 * - Timeline & Valuations (Screen 9)
 * - Risk & Compliance (Screen 10)
 *
 * Invariant: ZERO financial calculations performed in this component.
 * Consumes pre-computed ViewModels from propertyPresentationAdapter.js.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import {
  Building2,
  DollarSign,
  Key,
  FileText,
  Users,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Archive,
  ArrowLeft,
  ExternalLink
} from 'lucide-react-native';
import {
  getPropertyOverviewViewModel,
  getPropertyFinancialsViewModel,
  getPropertyRentalViewModel,
  getPropertyDocumentsViewModel,
  getPropertyOwnershipViewModel,
  getPropertyLocationViewModel,
  getPropertyTimelineViewModel,
  getPropertyRiskViewModel
} from './propertyPresentationAdapter.js';

export const PROPERTY_DETAIL_TABS = Object.freeze({
  OVERVIEW:    'Overview',
  FINANCIALS:  'Financials',
  RENTAL:      'Rental',
  DOCUMENTS:   'Documents',
  OWNERSHIP:   'Ownership',
  LOCATION:    'Location',
  TIMELINE:    'Timeline',
  RISK:        'Risk'
});

export default function PropertyDetailView({
  property,
  loanProjection = null,
  onBack,
  targetMemberId = 'self'
}) {
  const [activeTab, setActiveTab] = useState(PROPERTY_DETAIL_TABS.OVERVIEW);

  if (!property) return null;

  // Pre-computed ViewModels (ZERO financial math performed in component!)
  const overviewVm = getPropertyOverviewViewModel({ property, loanProjection, targetMemberId });
  const financialsVm = getPropertyFinancialsViewModel({ property, loanProjection });
  const rentalVm = getPropertyRentalViewModel({ property, tenancy: property.tenancy, expensesList: property.operatingExpenses || [] });
  const docsVm = getPropertyDocumentsViewModel({ property });
  const ownershipVm = getPropertyOwnershipViewModel({ property, targetMemberId });
  const locationVm = getPropertyLocationViewModel({ property });
  const timelineVm = getPropertyTimelineViewModel({ property });
  const riskVm = getPropertyRiskViewModel({ property });

  const tabs = [
    { id: PROPERTY_DETAIL_TABS.OVERVIEW, label: 'Overview', icon: Building2 },
    { id: PROPERTY_DETAIL_TABS.FINANCIALS, label: 'Financials', icon: DollarSign },
    { id: PROPERTY_DETAIL_TABS.RENTAL, label: 'Rental', icon: Key },
    { id: PROPERTY_DETAIL_TABS.DOCUMENTS, label: 'Documents', icon: FileText },
    { id: PROPERTY_DETAIL_TABS.OWNERSHIP, label: 'Ownership', icon: Users },
    { id: PROPERTY_DETAIL_TABS.LOCATION, label: 'Location', icon: MapPin },
    { id: PROPERTY_DETAIL_TABS.TIMELINE, label: 'Timeline', icon: Clock },
    { id: PROPERTY_DETAIL_TABS.RISK, label: 'Risk & Legal', icon: ShieldCheck }
  ];

  return (
    <View style={styles.container}>
      {/* Top Header with Back Navigation */}
      <View style={styles.navHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.navTitleCol}>
          <Text style={styles.navTitle} numberOfLines={1}>{property.displayName || 'Property Details'}</Text>
          <Text style={styles.navSub}>{overviewVm.typeLabel} • {overviewVm.statusLabel}</Text>
        </View>
      </View>

      {/* Terminal Banner */}
      {overviewVm.isTerminal && (
        <View style={styles.historicalBanner}>
          <Archive size={14} color="#94A3B8" />
          <Text style={styles.historicalText}>{overviewVm.historicalIndicator}</Text>
        </View>
      )}

      {/* Horizontal Sub-Tab Switcher */}
      <View style={styles.tabScrollContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {tabs.map(t => {
            const isSelected = activeTab === t.id;
            const Icon = t.icon;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabButton, isSelected && styles.tabButtonActive]}
                onPress={() => setActiveTab(t.id)}
                activeOpacity={0.7}
              >
                <Icon size={14} color={isSelected ? '#FFFFFF' : '#94A3B8'} />
                <Text style={[styles.tabText, isSelected && styles.tabTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sub-Tab Content */}
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* TAB 1: OVERVIEW (Screen 3) */}
        {activeTab === PROPERTY_DETAIL_TABS.OVERVIEW && (
          <View style={styles.tabSection}>
            <View style={styles.overviewHeroCard}>
              <Text style={styles.cardSubTitle}>Estimated Market Value</Text>
              <Text style={styles.heroAmount}>{overviewVm.marketValueLabel}</Text>
              <View style={styles.heroPillRow}>
                <View style={[styles.statusPill, { backgroundColor: overviewVm.statusBadgeColor }]}>
                  <Text style={styles.statusPillText}>{overviewVm.statusLabel}</Text>
                </View>
                <View style={[styles.riskPill, { borderColor: overviewVm.riskColor }]}>
                  <ShieldCheck size={12} color={overviewVm.riskColor} />
                  <Text style={[styles.riskPillText, { color: overviewVm.riskColor }]}>{overviewVm.riskLabel}</Text>
                </View>
              </View>
            </View>

            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Property Specifications</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Built-up Area</Text>
                <Text style={styles.specValue}>{overviewVm.areaLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Personal Stake</Text>
                <Text style={styles.specValue}>{overviewVm.personalShareLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Personal Value</Text>
                <Text style={styles.specValue}>{overviewVm.personalValueLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Valuation Method</Text>
                <Text style={styles.specValue}>{overviewVm.valuationMethodLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Valuation Date</Text>
                <Text style={styles.specValue}>{overviewVm.valuationDateLabel}</Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 2: FINANCIALS (Screen 4) */}
        {activeTab === PROPERTY_DETAIL_TABS.FINANCIALS && (
          <View style={styles.tabSection}>
            {/* Underwater Banner */}
            {financialsVm.debtAndEquity.isUnderwater && (
              <View style={styles.underwaterCard}>
                <AlertTriangle size={18} color="#EF4444" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.underwaterTitle}>UNDERWATER MORTGAGE</Text>
                  <Text style={styles.underwaterSub}>
                    Outstanding loan principal exceeds estimated market value. Net equity is negative.
                  </Text>
                </View>
              </View>
            )}

            {/* Debt and Net Equity */}
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Debt & Net Equity</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Current Market Value</Text>
                <Text style={styles.specValue}>{financialsVm.marketValueLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Outstanding Mortgage</Text>
                <Text style={styles.specValue}>{financialsVm.debtAndEquity.loanLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Net Property Equity</Text>
                <Text style={[
                  styles.specValue,
                  financialsVm.debtAndEquity.isUnderwater && { color: '#EF4444' }
                ]}>
                  {financialsVm.debtAndEquity.netEquityLabel}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Loan-to-Value (LTV)</Text>
                <Text style={styles.specValue}>{financialsVm.debtAndEquity.ltvLabel}</Text>
              </View>
            </View>

            {/* Acquisition Cost Basis Waterfall */}
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Acquisition Cost Basis Waterfall</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Purchase Price</Text>
                <Text style={styles.specValue}>{financialsVm.costBasis.purchasePriceLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Stamp Duty</Text>
                <Text style={styles.specValue}>{financialsVm.costBasis.stampDutyLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Registration Charges</Text>
                <Text style={styles.specValue}>{financialsVm.costBasis.registrationLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Brokerage & Agency</Text>
                <Text style={styles.specValue}>{financialsVm.costBasis.brokerageLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Legal & Documentation</Text>
                <Text style={styles.specValue}>{financialsVm.costBasis.legalFeesLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Capitalized Improvements</Text>
                <Text style={styles.specValue}>{financialsVm.costBasis.improvementsLabel}</Text>
              </View>
              <View style={[styles.specRow, styles.specRowTotal]}>
                <Text style={styles.specTotalLabel}>Total Cost Basis</Text>
                <Text style={styles.specTotalValue}>{financialsVm.costBasis.totalCostBasisLabel}</Text>
              </View>
            </View>

            {/* Appreciation */}
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Unrealized Appreciation</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Gain / Loss</Text>
                <Text style={[styles.specValue, { color: financialsVm.appreciation.isGain ? '#10B981' : '#EF4444' }]}>
                  {financialsVm.appreciation.gainLossLabel}
                </Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Appreciation Rate</Text>
                <Text style={styles.specValue}>{financialsVm.appreciation.appreciationRateLabel}</Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 3: RENTAL (Screen 5) */}
        {activeTab === PROPERTY_DETAIL_TABS.RENTAL && (
          <View style={styles.tabSection}>
            {/* Tenancy Header Card */}
            <View style={styles.specsCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.sectionHeader}>Active Tenancy</Text>
                <View style={[styles.statusPill, { backgroundColor: '#06B6D4' }]}>
                  <Text style={styles.statusPillText}>{rentalVm.tenancyStatus}</Text>
                </View>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Tenant Name</Text>
                <Text style={styles.specValue}>{rentalVm.tenantName}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Lease Period</Text>
                <Text style={styles.specValue}>{rentalVm.leasePeriod}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Monthly Rent</Text>
                <Text style={[styles.specValue, { color: '#3B82F6', fontWeight: '700' }]}>
                  {rentalVm.monthlyRentLabel}
                </Text>
              </View>
            </View>

            {/* Security Deposit Liability Card */}
            <View style={styles.depositCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.depositTitle}>Security Deposit Held</Text>
                <View style={styles.liabilityTag}>
                  <Text style={styles.liabilityTagText}>LIABILITY</Text>
                </View>
              </View>
              <Text style={styles.depositAmount}>{rentalVm.securityDeposit.amountLabel}</Text>
              <Text style={styles.depositSub}>{rentalVm.securityDeposit.explanation}</Text>
            </View>

            {/* Yield & Economics */}
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Rental Economics & Yields</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Annual Contractual Rent</Text>
                <Text style={styles.specValue}>{rentalVm.annualContractualRentLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Operating Expenses (OpEx)</Text>
                <Text style={styles.specValue}>{rentalVm.totalOperatingExpensesLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Net Rental Income</Text>
                <Text style={[styles.specValue, { color: '#10B981' }]}>{rentalVm.netRentalIncomeLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Gross Rental Yield</Text>
                <Text style={styles.specValue}>{rentalVm.grossYieldLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Net Rental Yield</Text>
                <Text style={styles.specValue}>{rentalVm.netYieldLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Rental Margin</Text>
                <Text style={styles.specValue}>{rentalVm.rentalMarginLabel}</Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 4: DOCUMENTS (Screen 6) */}
        {activeTab === PROPERTY_DETAIL_TABS.DOCUMENTS && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Document Vault ({docsVm.documentsCount})</Text>
            </View>
            {docsVm.items.length === 0 ? (
              <View style={styles.emptyState}>
                <FileText size={32} color="#475569" />
                <Text style={styles.emptyTitle}>No Documents Uploaded</Text>
              </View>
            ) : (
              docsVm.items.map((doc) => (
                <View key={doc.documentId} style={styles.docCard}>
                  <View style={styles.docIconBadge}>
                    <FileText size={18} color="#3B82F6" />
                  </View>
                  <View style={styles.docTextCol}>
                    <Text style={styles.docTitle}>{doc.title}</Text>
                    <Text style={styles.docSub}>{doc.uploadDateLabel} • {doc.fileSizeLabel}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: doc.statusColor + '20' }]}>
                    <Text style={[styles.statusPillText, { color: doc.statusColor }]}>
                      {doc.verificationStatus}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* TAB 5: OWNERSHIP (Screen 7) */}
        {activeTab === PROPERTY_DETAIL_TABS.OWNERSHIP && (
          <View style={styles.tabSection}>
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Ownership Structure ({ownershipVm.totalOwnersCount} Co-Owners)</Text>
              {ownershipVm.ownerCards.map((owner) => (
                <View key={owner.ownerId} style={styles.ownerCard}>
                  <View style={styles.ownerTop}>
                    <View style={styles.ownerNameCol}>
                      <Text style={styles.ownerName}>{owner.ownerName}</Text>
                      <Text style={styles.ownerRelation}>{owner.relation}</Text>
                    </View>
                    <View style={styles.ownerShareBadge}>
                      <Text style={styles.ownerShareText}>{owner.sharePercentLabel}</Text>
                    </View>
                  </View>
                  <View style={styles.specRow}>
                    <Text style={styles.specLabel}>Allocated Property Value</Text>
                    <Text style={styles.specValue}>{owner.allocatedValueLabel}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 6: LOCATION (Screen 8) */}
        {activeTab === PROPERTY_DETAIL_TABS.LOCATION && (
          <View style={styles.tabSection}>
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Address & Zoning</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Address</Text>
                <Text style={[styles.specValue, { maxWidth: '60%' }]}>{locationVm.address}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>City / State</Text>
                <Text style={styles.specValue}>{locationVm.city}, {locationVm.state}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Pincode</Text>
                <Text style={styles.specValue}>{locationVm.pincode}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Zoning</Text>
                <Text style={styles.specValue}>{locationVm.zoning}</Text>
              </View>
            </View>

            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Area Breakdown</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Built-up Area</Text>
                <Text style={styles.specValue}>{locationVm.builtUpAreaLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Carpet Area</Text>
                <Text style={styles.specValue}>{locationVm.carpetAreaLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Plot Area</Text>
                <Text style={styles.specValue}>{locationVm.plotAreaLabel}</Text>
              </View>
            </View>
          </View>
        )}

        {/* TAB 7: TIMELINE (Screen 9) */}
        {activeTab === PROPERTY_DETAIL_TABS.TIMELINE && (
          <View style={styles.tabSection}>
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Valuation History & Timeline</Text>
              {timelineVm.valuationItems.map((val, idx) => (
                <View key={val.valuationId} style={styles.valItem}>
                  <View style={styles.valItemHeader}>
                    <Text style={styles.valDate}>{val.valuationDateLabel}</Text>
                    <Text style={styles.valAmount}>{val.compactMarketValueLabel}</Text>
                  </View>
                  <Text style={styles.valMethod}>{val.valuationMethod} • Confidence: {val.confidence}</Text>
                  {Boolean(val.notes) && <Text style={styles.valNotes}>{val.notes}</Text>}
                </View>
              ))}
            </View>
          </View>
        )}

        {/* TAB 8: RISK & COMPLIANCE (Screen 10) */}
        {activeTab === PROPERTY_DETAIL_TABS.RISK && (
          <View style={styles.tabSection}>
            <View style={styles.specsCard}>
              <Text style={styles.sectionHeader}>Risk & Legal Assessment</Text>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Title Status</Text>
                <View style={[styles.riskPill, { borderColor: riskVm.riskColor }]}>
                  <ShieldCheck size={12} color={riskVm.riskColor} />
                  <Text style={[styles.riskPillText, { color: riskVm.riskColor }]}>{riskVm.riskLabel}</Text>
                </View>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Encumbrance Check</Text>
                <Text style={styles.specValue}>{riskVm.encumbranceStatusLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Property Tax Status</Text>
                <Text style={styles.specValue}>{riskVm.propertyTaxStatusLabel}</Text>
              </View>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Legal Audit Date</Text>
                <Text style={styles.specValue}>{riskVm.legalAuditDateLabel}</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A'
  },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F1629'
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  navTitleCol: {
    flex: 1
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  navSub: {
    color: '#94A3B8',
    fontSize: 12
  },
  historicalBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8
  },
  historicalText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '700'
  },
  tabScrollContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    backgroundColor: '#0F1629'
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#1E293B'
  },
  tabButtonActive: {
    backgroundColor: '#3B82F6'
  },
  tabText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600'
  },
  tabTextActive: {
    color: '#FFFFFF'
  },
  content: {
    padding: 16,
    paddingBottom: 40
  },
  tabSection: {
    gap: 14
  },
  overviewHeroCard: {
    backgroundColor: '#121829',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center'
  },
  cardSubTitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6
  },
  heroAmount: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
    marginBottom: 12
  },
  heroPillRow: {
    flexDirection: 'row',
    gap: 8
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700'
  },
  riskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  riskPillText: {
    fontSize: 11,
    fontWeight: '600'
  },
  specsCard: {
    backgroundColor: '#121829',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1E293B'
  },
  sectionHeader: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  specRowTotal: {
    borderBottomWidth: 0,
    paddingTop: 12
  },
  specLabel: {
    color: '#94A3B8',
    fontSize: 13
  },
  specValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  specTotalLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  specTotalValue: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: '700'
  },
  underwaterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    gap: 12
  },
  underwaterTitle: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 2
  },
  underwaterSub: {
    color: '#F87171',
    fontSize: 11
  },
  depositCard: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.25)'
  },
  depositTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700'
  },
  depositAmount: {
    color: '#F59E0B',
    fontSize: 24,
    fontWeight: '800',
    marginVertical: 4
  },
  depositSub: {
    color: '#94A3B8',
    fontSize: 11
  },
  liabilityTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4
  },
  liabilityTagText: {
    color: '#F59E0B',
    fontSize: 10,
    fontWeight: '700'
  },
  sectionHeaderRow: {
    marginBottom: 8
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  docCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#121829',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
    marginBottom: 10,
    gap: 12
  },
  docIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  docTextCol: {
    flex: 1
  },
  docTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  docSub: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2
  },
  ownerCard: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  ownerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6
  },
  ownerNameCol: {
    flex: 1
  },
  ownerName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  ownerRelation: {
    color: '#64748B',
    fontSize: 11
  },
  ownerShareBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  ownerShareText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700'
  },
  valItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B'
  },
  valItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2
  },
  valDate: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  valAmount: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '700'
  },
  valMethod: {
    color: '#64748B',
    fontSize: 11
  },
  valNotes: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic'
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8
  },
  emptyTitle: {
    color: '#64748B',
    fontSize: 14
  }
});
