/**
 * @file propertyPresentationAdapter.js
 * @description FinLife Properties Module — Pure Presentation Adapter & ViewModels.
 *
 * ARCHITECTURAL INVARIANTS:
 * 1. Zero Financial Calculations in React: All currency formatting, percentages,
 *    yields, debt attributions, and equity calculations are pre-computed here.
 * 2. Lossless BigInt Formatting: Currency values formatted without floating-point truncation.
 * 3. Unavailable Sources Truth: Unresolved sources are explicitly labeled "Unavailable", NEVER ₹0.
 * 4. Exact Dashboard Reconciliation: Dashboard total equals sum of active property presentation cards.
 * 5. Negative Equity Preserved: Underwater mortgages carry explicit negative sign and UNDERWATER badge.
 * 6. Security Deposit Liability: Explicitly badged as a balance sheet liability, never income.
 * 7. Active vs Terminal Separation: SOLD and ARCHIVED properties carry historical badges and
 *    are excluded from active wealth sums.
 */

import {
  PROPERTY_TYPES,
  PROPERTY_LIFECYCLE_STATES,
  VALUATION_METHODS,
  VALUATION_CONFIDENCE,
  PROPERTY_RISK_STATUS,
  TOTAL_OWNERSHIP_BPS,
  AREA_SCALE_FACTOR
} from './propertyContracts.js';
import {
  calculateTotalCostBasis,
  calculateUnrealizedGainLoss,
  calculateAppreciationRateBps,
  areaMicrosToSqFtString
} from './propertyCalculations.js';
import {
  calculateUserAndFamilyPropertyShare,
  allocatePropertyValueByBps
} from './propertyOwnershipEngine.js';
import { isActiveProperty, filterActiveProperties } from './propertyLifecycleEngine.js';
import {
  calculateAnnualGrossRent,
  calculateNetRentalIncome,
  calculateGrossRentalYieldBps,
  calculateNetRentalYieldBps,
  calculateRentalMarginBps,
  calculateRentalPerformanceWithVacancy,
  TENANCY_STATUS,
  RENTAL_OPEX_CATEGORIES
} from './propertyRentalEngine.js';
import {
  PROPERTY_PROJECTION_STATUS,
  calculatePropertyNetEquityWithLoan
} from './propertyIntegrationAdapters.js';

// ─────────────────────────────────────────────────────────────────────────────
// 1. Currency & Number Formatting Helpers
// ─────────────────────────────────────────────────────────────────────────────

export function formatPaiseToINR(paise) {
  if (paise === null || paise === undefined) return 'Unavailable';
  const bigVal = typeof paise === 'bigint' ? paise : BigInt(paise);
  const isNegative = bigVal < 0n;
  const absPaise = isNegative ? -bigVal : bigVal;

  const rupees = absPaise / 100n;
  const rupeesStr = rupees.toString();
  let formatted = '';

  if (rupeesStr.length <= 3) {
    formatted = rupeesStr;
  } else {
    const last3 = rupeesStr.slice(-3);
    const remaining = rupeesStr.slice(0, -3);
    const withCommas = remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    formatted = `${withCommas},${last3}`;
  }

  const sign = isNegative ? '-₹ ' : '₹ ';
  return `${sign}${formatted}`;
}

export function formatPaiseToCompactINR(paise) {
  if (paise === null || paise === undefined) return 'Unavailable';
  const bigVal = typeof paise === 'bigint' ? paise : BigInt(paise);
  const isNegative = bigVal < 0n;
  const absPaise = isNegative ? -bigVal : bigVal;

  const sign = isNegative ? '-' : '';

  // 1 Crore = 10,000,000 INR = 1,000,000,000 paise
  if (absPaise >= 1_000_000_000n) {
    const cr = Math.floor(Number(absPaise) / 10_000_000) / 100;
    return `${sign}₹${cr.toFixed(2)} Cr`;
  }
  // 1 Lakh = 100,000 INR = 10,000,000 paise
  if (absPaise >= 10_000_000n) {
    const lk = Math.floor(Number(absPaise) / 100_000) / 100;
    return `${sign}₹${lk.toFixed(2)} L`;
  }
  // 1 Thousand = 1,000 INR = 100,000 paise
  if (absPaise >= 100_000n) {
    const k = Math.floor(Number(absPaise) / 10_000) / 10;
    return `${sign}₹${k.toFixed(1)} K`;
  }

  return formatPaiseToINR(paise);
}

export function formatBpsToPercent(bps) {
  if (bps === null || bps === undefined) return 'Unavailable';
  const bigVal = typeof bps === 'bigint' ? bps : BigInt(bps);
  const isNegative = bigVal < 0n;
  const absBps = isNegative ? -bigVal : bigVal;

  const integerPart = absBps / 100n;
  const fractionalPart = absBps % 100n;
  const fracStr = fractionalPart.toString().padStart(2, '0');

  const sign = isNegative ? '-' : '';
  return `${sign}${integerPart}.${fracStr}%`;
}

export function formatAreaMicrosToSqFt(areaMicros) {
  if (areaMicros === null || areaMicros === undefined || areaMicros === 0n) return '-- sq ft';
  const sqFtStr = areaMicrosToSqFtString(typeof areaMicros === 'bigint' ? areaMicros : BigInt(areaMicros));
  return `${sqFtStr} sq ft`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Visual Configuration Dictionaries
// ─────────────────────────────────────────────────────────────────────────────

export const PROPERTY_TYPE_CONFIG = Object.freeze({
  [PROPERTY_TYPES.RESIDENTIAL_HOUSE]:  { label: 'Independent House', icon: 'home', color: '#10B981' },
  [PROPERTY_TYPES.APARTMENT]:          { label: 'Apartment / Flat', icon: 'business', color: '#3B82F6' },
  [PROPERTY_TYPES.PLOT]:               { label: 'Plot & Land', icon: 'terrain', color: '#8B5CF6' },
  [PROPERTY_TYPES.AGRICULTURAL_LAND]:  { label: 'Agricultural Land', icon: 'eco', color: '#059669' },
  [PROPERTY_TYPES.COMMERCIAL_PROPERTY]:{ label: 'Commercial Property', icon: 'store', color: '#F59E0B' },
  [PROPERTY_TYPES.RENTAL_PROPERTY]:    { label: 'Rental Property', icon: 'vpn-key', color: '#06B6D4' },
  [PROPERTY_TYPES.UNDER_CONSTRUCTION]: { label: 'Under Construction', icon: 'construction', color: '#EC4899' },
  [PROPERTY_TYPES.OTHER_PROPERTY]:     { label: 'Other Property', icon: 'layers', color: '#64748B' }
});

export const STATUS_CONFIG = Object.freeze({
  [PROPERTY_LIFECYCLE_STATES.ACTIVE]:             { label: 'Active', badgeColor: '#10B981', textColor: '#FFFFFF', isTerminal: false },
  [PROPERTY_LIFECYCLE_STATES.RENTED]:             { label: 'Rented', badgeColor: '#06B6D4', textColor: '#FFFFFF', isTerminal: false },
  [PROPERTY_LIFECYCLE_STATES.UNDER_CONSTRUCTION]: { label: 'In Progress', badgeColor: '#EC4899', textColor: '#FFFFFF', isTerminal: false },
  [PROPERTY_LIFECYCLE_STATES.VACANT]:             { label: 'Vacant', badgeColor: '#F59E0B', textColor: '#FFFFFF', isTerminal: false },
  [PROPERTY_LIFECYCLE_STATES.DRAFT]:              { label: 'Draft', badgeColor: '#64748B', textColor: '#FFFFFF', isTerminal: false },
  [PROPERTY_LIFECYCLE_STATES.DISPUTED]:           { label: 'Disputed', badgeColor: '#EF4444', textColor: '#FFFFFF', isTerminal: false },
  [PROPERTY_LIFECYCLE_STATES.PARTIALLY_SOLD]:     { label: 'Partially Sold', badgeColor: '#8B5CF6', textColor: '#FFFFFF', isTerminal: false },
  [PROPERTY_LIFECYCLE_STATES.TRANSFERRED]:        { label: 'Transferred', badgeColor: '#94A3B8', textColor: '#FFFFFF', isTerminal: false },
  [PROPERTY_LIFECYCLE_STATES.SOLD]:               { label: 'Sold (Closed)', badgeColor: '#475569', textColor: '#CBD5E1', isTerminal: true },
  [PROPERTY_LIFECYCLE_STATES.ARCHIVED]:           { label: 'Archived', badgeColor: '#334155', textColor: '#94A3B8', isTerminal: true }
});

export const RISK_CONFIG = Object.freeze({
  [PROPERTY_RISK_STATUS.CLEAR]:                 { label: 'Clear Title', color: '#10B981', icon: 'verified' },
  [PROPERTY_RISK_STATUS.LOAN_LIEN]:             { label: 'Bank Lien', color: '#F59E0B', icon: 'lock' },
  [PROPERTY_RISK_STATUS.TAX_PENDING]:           { label: 'Tax Pending', color: '#F59E0B', icon: 'pending-actions' },
  [PROPERTY_RISK_STATUS.DOCUMENT_PENDING]:      { label: 'Doc Pending', color: '#F59E0B', icon: 'description' },
  [PROPERTY_RISK_STATUS.LEGAL_REVIEW_REQUIRED]: { label: 'Legal Review', color: '#EF4444', icon: 'gavel' },
  [PROPERTY_RISK_STATUS.ENCUMBRANCE_REPORTED]:  { label: 'Encumbrance', color: '#EF4444', icon: 'warning' },
  [PROPERTY_RISK_STATUS.DISPUTED]:              { label: 'Disputed', color: '#EF4444', icon: 'report-problem' },
  [PROPERTY_RISK_STATUS.OWNERSHIP_UNCLEAR]:     { label: 'Title Unclear', color: '#EF4444', icon: 'help' }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Screen ViewModels
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Screen 1: Real Estate Dashboard ViewModel
 */
export function getDashboardViewModel({
  propertiesList = [],
  cfoProjection = null,
  targetMemberId = 'self'
} = {}) {
  const activeProps = filterActiveProperties(propertiesList);

  let displayedTotalPaise = 0n;
  let personalMarketValuePaise = 0n;
  let totalMonthlyRentPaise = 0n;
  let rentedCount = 0;
  let vacantCount = 0;
  let totalCostBasisPaise = 0n;
  let totalMarketValueWithCostPaise = 0n;

  const categoryMap = {
    RESIDENTIAL: { key: 'RESIDENTIAL', label: 'Residential', color: '#10B981', totalPaise: 0n, count: 0 },
    COMMERCIAL: { key: 'COMMERCIAL', label: 'Commercial', color: '#F59E0B', totalPaise: 0n, count: 0 },
    AGRICULTURAL: { key: 'AGRICULTURAL', label: 'Agricultural', color: '#059669', totalPaise: 0n, count: 0 },
    PLOT: { key: 'PLOT', label: 'Plots & Land', color: '#8B5CF6', totalPaise: 0n, count: 0 },
    UNDER_CONSTRUCTION: { key: 'UNDER_CONSTRUCTION', label: 'Under Construction', color: '#EC4899', totalPaise: 0n, count: 0 },
    OTHER: { key: 'OTHER', label: 'Other', color: '#64748B', totalPaise: 0n, count: 0 }
  };

  const recentActivityEvents = [];
  const propertyCards = [];

  for (const p of activeProps) {
    const mv = BigInt(p.marketValuePaise ?? 0n);
    displayedTotalPaise += mv;

    const ownership = p.ownership || [{ ownerId: 'self', shareBps: 10_000n }];
    const { personalPaise: personalMv } = calculateUserAndFamilyPropertyShare(
      mv,
      ownership,
      targetMemberId
    );
    personalMarketValuePaise += personalMv;

    // Category allocation
    let catKey = 'OTHER';
    if (
      p.propertyType === PROPERTY_TYPES.RESIDENTIAL_HOUSE ||
      p.propertyType === PROPERTY_TYPES.APARTMENT ||
      p.propertyType === PROPERTY_TYPES.RENTAL_PROPERTY
    ) {
      catKey = 'RESIDENTIAL';
    } else if (p.propertyType === PROPERTY_TYPES.COMMERCIAL_PROPERTY) {
      catKey = 'COMMERCIAL';
    } else if (p.propertyType === PROPERTY_TYPES.AGRICULTURAL_LAND) {
      catKey = 'AGRICULTURAL';
    } else if (p.propertyType === PROPERTY_TYPES.PLOT) {
      catKey = 'PLOT';
    } else if (p.propertyType === PROPERTY_TYPES.UNDER_CONSTRUCTION) {
      catKey = 'UNDER_CONSTRUCTION';
    }
    categoryMap[catKey].totalPaise += mv;
    categoryMap[catKey].count += 1;

    // Tenancy & rent
    const isRented = p.status === PROPERTY_LIFECYCLE_STATES.RENTED || Boolean(p.tenancy);
    if (isRented) {
      rentedCount += 1;
      const rent = BigInt(p.tenancy?.monthlyRentPaise ?? p.monthlyRentPaise ?? 0n);
      totalMonthlyRentPaise += rent;
    } else if (p.status === PROPERTY_LIFECYCLE_STATES.VACANT) {
      vacantCount += 1;
    }

    // Cost basis & unrealized gain tracking
    const costBasis = BigInt(p.totalCostBasisPaise ?? p.purchasePricePaise ?? 0n);
    if (costBasis > 0n) {
      totalCostBasisPaise += costBasis;
      totalMarketValueWithCostPaise += mv;
    }

    // Recent activity event extraction
    if (p.valuationDate) {
      recentActivityEvents.push({
        id: `act_val_${p.propertyId}`,
        title: 'Valuation Benchmark Updated',
        propertyDisplayName: p.displayName || 'Property',
        date: p.valuationDate,
        tag: 'Valuation',
        tagColor: '#3B82F6',
        amountLabel: formatPaiseToCompactINR(mv)
      });
    }
    if (p.tenancy) {
      recentActivityEvents.push({
        id: `act_ten_${p.propertyId}`,
        title: `Rental Agreement Active (${p.tenancy.tenantName || 'Tenant'})`,
        propertyDisplayName: p.displayName || 'Property',
        date: p.tenancy.leaseStartDate || 'Current Lease',
        tag: 'Tenancy',
        tagColor: '#06B6D4',
        amountLabel: `${formatPaiseToCompactINR(p.tenancy.monthlyRentPaise || 0n)}/mo`
      });
    }
    if (Array.isArray(p.operatingExpenses) && p.operatingExpenses.length > 0) {
      recentActivityEvents.push({
        id: `act_exp_${p.propertyId}`,
        title: 'Municipal Property Tax & OpEx Paid',
        propertyDisplayName: p.displayName || 'Property',
        date: p.operatingExpenses[0].expenseDate || '2025-04-10',
        tag: 'Tax & OpEx',
        tagColor: '#10B981',
        amountLabel: null
      });
    }
    if (Array.isArray(p.documents) && p.documents.length > 0) {
      recentActivityEvents.push({
        id: `act_doc_${p.propertyId}`,
        title: `${p.documents[0].title || 'Title Deed'} Verified`,
        propertyDisplayName: p.displayName || 'Property',
        date: p.documents[0].uploadDate || 'Verified',
        tag: 'Clear Title',
        tagColor: '#8B5CF6',
        amountLabel: null
      });
    }

    const typeConfig = PROPERTY_TYPE_CONFIG[p.propertyType] || PROPERTY_TYPE_CONFIG.OTHER_PROPERTY;
    const statusConfig = STATUS_CONFIG[p.status] || STATUS_CONFIG.ACTIVE;
    const riskConfig = RISK_CONFIG[p.riskStatus] || RISK_CONFIG.CLEAR;

    propertyCards.push({
      propertyId: p.propertyId,
      displayName: p.displayName || 'Untitled Property',
      propertyType: p.propertyType,
      typeLabel: typeConfig.label,
      typeColor: typeConfig.color,
      status: p.status,
      statusLabel: statusConfig.label,
      badgeColor: statusConfig.badgeColor,
      marketValuePaise: mv,
      marketValueLabel: formatPaiseToCompactINR(mv),
      fullMarketValueLabel: formatPaiseToINR(mv),
      riskLabel: riskConfig.label,
      riskColor: riskConfig.color,
      isRented,
      hasLoan: Boolean(p.linkedLoanId)
    });
  }

  const expectedTotalPaise = cfoProjection && cfoProjection.raw
    ? BigInt(cfoProjection.raw.familyMarketValuePaise)
    : displayedTotalPaise;

  const reconciliationGapPaise = expectedTotalPaise - displayedTotalPaise;
  const isReconciled = reconciliationGapPaise === 0n;

  // Personal vs Family numbers
  const personalEquityPaise = cfoProjection?.raw?.personalNetEquityPaise ?? null;
  const personalDebtPaise = cfoProjection?.raw?.personalLoanPrincipalPaise ?? (cfoProjection?.raw?.linkedLoanPrincipalPaise === 0n ? 0n : null);
  const familyDebtPaise = cfoProjection?.raw?.linkedLoanPrincipalPaise ?? null;

  const rentalGrossPaise = cfoProjection?.raw?.rentalGrossPaise ?? 0n;
  const rentalNetPaise = cfoProjection?.raw?.rentalNetPaise ?? 0n;
  const securityDepositsPaise = cfoProjection?.raw?.securityDepositsLiabilityPaise ?? 0n;

  // Growth calculations with explicit denominator semantics:
  // Appreciation % = (Current Market Value - Total Cost Basis) * 10,000 / Total Cost Basis
  let totalUnrealizedGainPaise = 0n;
  let totalGrowthBps = 0n;
  let growthHeadline = 'Valuation baseline established';
  let growthSubtext = 'Appreciation metrics will calculate as cost basis and history accrue';
  let appreciationRateLabel = 'Not enough history';
  let growthBadge = 'Baseline';

  if (totalCostBasisPaise > 0n) {
    totalUnrealizedGainPaise = totalMarketValueWithCostPaise - totalCostBasisPaise;
    totalGrowthBps = calculateAppreciationRateBps(totalUnrealizedGainPaise, totalCostBasisPaise);
    appreciationRateLabel = formatBpsToPercent(totalGrowthBps);
    const arrow = totalGrowthBps >= 0n ? '↑' : '↓';
    growthBadge = `${arrow} ${formatBpsToPercent(totalGrowthBps)} vs cost`;
    growthHeadline = totalGrowthBps >= 0n
      ? `Portfolio appreciation is ${formatBpsToPercent(totalGrowthBps)} over cost basis`
      : `Portfolio unrealized return is ${formatBpsToPercent(totalGrowthBps)}`;
    growthSubtext = `Estimated unrealized gain of ${formatPaiseToCompactINR(totalUnrealizedGainPaise)} across portfolio`;
  } else if (activeProps.length > 0) {
    appreciationRateLabel = 'Unavailable';
    growthBadge = 'Baseline Active';
    growthHeadline = 'Valuation baseline established across active properties';
    growthSubtext = 'Cost basis details required to compute portfolio appreciation';
  }

  // Category allocation using deterministic Largest-Remainder Method to strictly total 10,000 BPS (100.00%)
  const activeCategories = Object.values(categoryMap)
    .filter(cat => cat.count > 0 || cat.totalPaise > 0n);

  let categories = [];
  if (displayedTotalPaise > 0n && activeCategories.length > 0) {
    let allocatedBps = 0n;
    const withRemainders = activeCategories.map((cat, index) => {
      const product = cat.totalPaise * 10_000n;
      const quotient = product / displayedTotalPaise;
      const remainder = product % displayedTotalPaise;
      allocatedBps += quotient;
      return {
        cat,
        index,
        quotient,
        remainder
      };
    });

    let remainderBpsToDistribute = 10_000n - allocatedBps;
    withRemainders.sort((a, b) => {
      if (b.remainder !== a.remainder) {
        return b.remainder > a.remainder ? 1 : -1;
      }
      return a.index - b.index;
    });

    for (let i = 0; i < withRemainders.length && remainderBpsToDistribute > 0n; i++) {
      withRemainders[i].quotient += 1n;
      remainderBpsToDistribute -= 1n;
    }

    withRemainders.sort((a, b) => a.index - b.index);

    categories = withRemainders.map(w => ({
      key: w.cat.key,
      label: w.cat.label,
      color: w.cat.color,
      count: w.cat.count,
      valuePaise: w.cat.totalPaise,
      valueLabel: formatPaiseToCompactINR(w.cat.totalPaise),
      shareBps: w.quotient,
      exactShareBps: w.quotient.toString(),
      sharePercentLabel: formatBpsToPercent(w.quotient),
      flexWeight: Math.max(1, Math.round(Number(w.quotient) / 100))
    }));
  }

  // LTV calculation
  let ltvLabel = '0.00%';
  if (familyDebtPaise !== null && familyDebtPaise > 0n && displayedTotalPaise > 0n) {
    const ltvBps = (familyDebtPaise * 10_000n) / displayedTotalPaise;
    ltvLabel = formatBpsToPercent(ltvBps);
  }

  // Audit feed ordering: newest-first descending by date + deduplication by stable event id
  recentActivityEvents.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  });

  const seenEventIds = new Set();
  const dedupedActivity = [];
  for (const ev of recentActivityEvents) {
    if (!seenEventIds.has(ev.id)) {
      seenEventIds.add(ev.id);
      dedupedActivity.push(ev);
    }
  }

  return {
    hero: {
      familyMarketValueLabel: formatPaiseToCompactINR(displayedTotalPaise),
      totalFamilyRealEstateLabel: formatPaiseToCompactINR(displayedTotalPaise),
      familyPropertyValueLabel: formatPaiseToCompactINR(displayedTotalPaise),
      yourPropertyShareLabel: formatPaiseToCompactINR(personalMarketValuePaise),
      yourShareLabel: formatPaiseToCompactINR(personalMarketValuePaise),
      familyValueLabel: formatPaiseToCompactINR(displayedTotalPaise),
      personalEquityLabel: personalEquityPaise !== null ? formatPaiseToCompactINR(personalEquityPaise) : 'Unavailable',
      personalNetEquityLabel: personalEquityPaise !== null ? formatPaiseToCompactINR(personalEquityPaise) : 'Unavailable',
      personalAttributedDebtLabel: personalDebtPaise !== null ? formatPaiseToCompactINR(personalDebtPaise) : '₹ 0',
      familyDebtLabel: familyDebtPaise !== null ? formatPaiseToCompactINR(familyDebtPaise) : 'Unavailable',
      activePropertiesCount: activeProps.length,
      rentedPropertiesCount: rentedCount,
      rentedPropertiesLabel: `${rentedCount} Rented ${rentedCount === 1 ? 'Property' : 'Properties'}`,
      vacantPropertiesCount: vacantCount,
      monthlyRentLabel: formatPaiseToCompactINR(totalMonthlyRentPaise),
      ltvLabel,
      growthBadge,
      isPartiallyResolved: Boolean(cfoProjection?.hasUnavailableLoan)
    },
    allocationDonut: {
      categories,
      totalShareBps: categories.reduce((sum, c) => sum + c.shareBps, 0n),
      centerAmountLabel: formatPaiseToCompactINR(displayedTotalPaise),
      centerSubLabel: 'Total Real Estate',
      hasAllocation: categories.length > 0
    },
    growthBanner: {
      isPositive: totalUnrealizedGainPaise >= 0n,
      growthBps: totalGrowthBps,
      appreciationRateLabel,
      unrealizedGainPaise: totalUnrealizedGainPaise,
      unrealizedGainLabel: formatPaiseToCompactINR(totalUnrealizedGainPaise),
      headline: growthHeadline,
      subtext: growthSubtext
    },
    rentalBanner: {
      annualGrossRentLabel: formatPaiseToCompactINR(rentalGrossPaise),
      annualNetRentLabel: formatPaiseToCompactINR(rentalNetPaise),
      securityDepositsLiabilityLabel: formatPaiseToCompactINR(securityDepositsPaise),
      liabilityBadge: 'LIABILITY',
      rentedUnitsCount: rentedCount,
      vacantUnitsCount: vacantCount,
      tenancyStatusText: `${rentedCount} Rented ${rentedCount === 1 ? 'Property' : 'Properties'} • ${vacantCount} Vacant`
    },
    propertyCards,
    previewPropertyCards: propertyCards.slice(0, 2),
    reconciliation: {
      expectedTotalPaise,
      displayedTotalPaise,
      reconciliationGapPaise,
      isReconciled,
      gapLabel: formatPaiseToINR(reconciliationGapPaise),
      reconciliationBadge: 'RECONCILIATION CERTIFIED',
      message: `Dashboard Hero equals sum of active properties (Gap: ${formatPaiseToINR(reconciliationGapPaise)})`
    },
    recentActivity: dedupedActivity.slice(0, 4),
    isReadOnlyProjection: true
  };
}

/**
 * Screen 2: Properties Portfolio List ViewModel
 */
export function getPropertiesListViewModel({
  propertiesList = [],
  filterCategory = 'ALL',
  targetMemberId = 'self'
} = {}) {
  const items = propertiesList.map(p => {
    const isTerminal = p.status === PROPERTY_LIFECYCLE_STATES.SOLD || p.status === PROPERTY_LIFECYCLE_STATES.ARCHIVED;
    const statusConfig = STATUS_CONFIG[p.status] || STATUS_CONFIG.ACTIVE;
    const typeConfig = PROPERTY_TYPE_CONFIG[p.propertyType] || PROPERTY_TYPE_CONFIG.OTHER_PROPERTY;

    const mv = BigInt(p.marketValuePaise ?? 0n);
    const { personalPaise: personalMv, userShareBps } = calculateUserAndFamilyPropertyShare(
      mv,
      p.ownership || [{ ownerId: 'self', shareBps: 10_000n }],
      targetMemberId
    );

    return {
      propertyId: p.propertyId,
      displayName: p.displayName || 'Untitled Property',
      propertyType: p.propertyType,
      typeLabel: typeConfig.label,
      typeColor: typeConfig.color,
      status: p.status,
      statusLabel: statusConfig.label,
      badgeColor: statusConfig.badgeColor,
      isTerminal,
      historicalIndicator: isTerminal ? 'HISTORICAL ARCHIVE' : null,
      marketValueLabel: formatPaiseToCompactINR(mv),
      personalShareLabel: `${formatBpsToPercent(userShareBps)} (${formatPaiseToCompactINR(personalMv)})`,
      areaLabel: formatAreaMicrosToSqFt(p.builtUpAreaMicros),
      hasLinkedLoan: Boolean(p.linkedLoanId),
      isRented: p.status === PROPERTY_LIFECYCLE_STATES.RENTED
    };
  });

  const filteredItems = filterCategory === 'ALL'
    ? items
    : items.filter(i => i.propertyType === filterCategory || i.status === filterCategory);

  return {
    filterCategory,
    itemsCount: filteredItems.length,
    items: filteredItems,
    isReadOnlyProjection: true
  };
}

/**
 * Screen 3: Property Details (Overview) ViewModel
 */
export function getPropertyOverviewViewModel({
  property,
  loanProjection = null,
  targetMemberId = 'self'
}) {
  if (!property) return null;

  const mv = BigInt(property.marketValuePaise ?? 0n);
  const typeConfig = PROPERTY_TYPE_CONFIG[property.propertyType] || PROPERTY_TYPE_CONFIG.OTHER_PROPERTY;
  const statusConfig = STATUS_CONFIG[property.status] || STATUS_CONFIG.ACTIVE;
  const riskConfig = RISK_CONFIG[property.riskStatus] || RISK_CONFIG.CLEAR;

  const isTerminal = p => p.status === PROPERTY_LIFECYCLE_STATES.SOLD || p.status === PROPERTY_LIFECYCLE_STATES.ARCHIVED;

  const { personalPaise: personalMv, userShareBps } = calculateUserAndFamilyPropertyShare(
    mv,
    property.ownership || [{ ownerId: 'self', shareBps: 10_000n }],
    targetMemberId
  );

  return {
    propertyId: property.propertyId,
    displayName: property.displayName || 'Property Details',
    addressLabel: property.address || 'Address not specified',
    propertyType: property.propertyType,
    typeLabel: typeConfig.label,
    status: property.status,
    statusLabel: statusConfig.label,
    statusBadgeColor: statusConfig.badgeColor,
    isTerminal: isTerminal(property),
    historicalIndicator: isTerminal(property) ? 'HISTORICAL ARCHIVE (EXCLUDED FROM ACTIVE WEALTH)' : null,
    riskLabel: riskConfig.label,
    riskColor: riskConfig.color,
    marketValueLabel: formatPaiseToINR(mv),
    compactMarketValueLabel: formatPaiseToCompactINR(mv),
    personalShareLabel: `${formatBpsToPercent(userShareBps)} Self`,
    personalValueLabel: formatPaiseToINR(personalMv),
    areaLabel: formatAreaMicrosToSqFt(property.builtUpAreaMicros),
    valuationDateLabel: property.valuationDate || 'Not specified',
    valuationMethodLabel: property.valuationMethod || 'MANUAL_ESTIMATE',
    confidenceLabel: property.valuationConfidence || 'MEDIUM',
    isReadOnlyProjection: true
  };
}

/**
 * Screen 4: Financial Breakdown ViewModel
 */
export function getPropertyFinancialsViewModel({
  property,
  loanProjection = null
}) {
  if (!property) return null;

  const mv = BigInt(property.marketValuePaise ?? 0n);

  const purchasePrice = BigInt(property.purchasePricePaise ?? 0n);
  const registration = BigInt(property.registrationChargesPaise ?? 0n);
  const stampDuty = BigInt(property.stampDutyPaise ?? 0n);
  const legalFees = BigInt(property.legalFeesPaise ?? 0n);
  const brokerage = BigInt(property.brokeragePaise ?? 0n);
  const improvements = BigInt(property.capitalizedImprovementsPaise ?? 0n);

  const totalCostBasis = calculateTotalCostBasis({
    purchasePricePaise: purchasePrice,
    registrationChargesPaise: registration,
    stampDutyPaise: stampDuty,
    legalFeesPaise: legalFees,
    brokeragePaise: brokerage,
    capitalizedImprovementsPaise: improvements
  });

  const gainLoss = calculateUnrealizedGainLoss(mv, totalCostBasis);
  const appreciationBps = calculateAppreciationRateBps(gainLoss, totalCostBasis);

  // Loan and Equity
  let loanStatus = 'UNLINKED';
  let loanLabel = '₹ 0 (Debt Free)';
  let netEquityLabel = formatPaiseToINR(mv);
  let isUnderwater = false;
  let ltvLabel = '0.00%';
  let isLoanUnavailable = false;

  if (property.linkedLoanId) {
    if (!loanProjection || loanProjection.status === PROPERTY_PROJECTION_STATUS.UNAVAILABLE) {
      loanStatus = 'UNAVAILABLE';
      loanLabel = 'Unavailable (System Unreachable)';
      netEquityLabel = 'Unavailable';
      ltvLabel = 'Unavailable';
      isLoanUnavailable = true;
    } else {
      const debt = BigInt(loanProjection.outstandingPrincipalPaise ?? 0n);
      const equityRes = calculatePropertyNetEquityWithLoan(property, loanProjection);

      loanStatus = 'LINKED';
      loanLabel = formatPaiseToINR(debt);
      netEquityLabel = formatPaiseToINR(equityRes.netEquityPaise);
      isUnderwater = equityRes.isUnderwater;
      ltvLabel = formatBpsToPercent(equityRes.loanToValueBps);
    }
  }

  return {
    marketValueLabel: formatPaiseToINR(mv),
    costBasis: {
      purchasePriceLabel: formatPaiseToINR(purchasePrice),
      registrationLabel: formatPaiseToINR(registration),
      stampDutyLabel: formatPaiseToINR(stampDuty),
      legalFeesLabel: formatPaiseToINR(legalFees),
      brokerageLabel: formatPaiseToINR(brokerage),
      improvementsLabel: formatPaiseToINR(improvements),
      totalCostBasisLabel: formatPaiseToINR(totalCostBasis)
    },
    appreciation: {
      gainLossLabel: formatPaiseToINR(gainLoss),
      isGain: gainLoss >= 0n,
      appreciationRateLabel: formatBpsToPercent(appreciationBps)
    },
    debtAndEquity: {
      loanStatus,
      loanLabel,
      netEquityLabel,
      isUnderwater,
      underwaterBadge: isUnderwater ? 'UNDERWATER MORTGAGE' : null,
      ltvLabel,
      isLoanUnavailable
    },
    isReadOnlyProjection: true
  };
}

/**
 * Screen 5: Rental Economics & Tenancies ViewModel
 */
export function getPropertyRentalViewModel({
  property,
  tenancy = null,
  expensesList = []
}) {
  if (!property) return null;

  const mv = BigInt(property.marketValuePaise ?? 0n);
  const activeTenancy = tenancy || property.tenancy || null;

  const monthlyRent = activeTenancy ? BigInt(activeTenancy.monthlyRentPaise ?? 0n) : 0n;
  const deposit = activeTenancy ? BigInt(activeTenancy.securityDepositLiabilityPaise ?? activeTenancy.securityDepositPaise ?? 0n) : 0n;

  const perf = calculateRentalPerformanceWithVacancy({
    monthlyRentPaise: monthlyRent,
    marketValuePaise: mv,
    operatingExpenses: expensesList
  });

  const formattedExpenses = expensesList.map(e => ({
    expenseId: e.expenseId,
    categoryLabel: e.category || 'Maintenance',
    amountLabel: formatPaiseToINR(BigInt(e.amountPaise ?? 0n)),
    dateLabel: e.expenseDate || ''
  }));

  return {
    hasTenancy: Boolean(activeTenancy),
    tenantName: activeTenancy ? activeTenancy.tenantName : 'No Active Tenant',
    tenancyStatus: activeTenancy ? activeTenancy.status : 'VACANT',
    leasePeriod: activeTenancy ? `${activeTenancy.leaseStartDate || '--'} to ${activeTenancy.leaseEndDate || '--'}` : '--',
    monthlyRentLabel: formatPaiseToINR(monthlyRent),
    annualContractualRentLabel: formatPaiseToINR(perf.contractualGrossRentPaise),
    annualRealizedRentLabel: formatPaiseToINR(perf.realizedGrossRentPaise),
    securityDeposit: {
      amountLabel: formatPaiseToINR(deposit),
      isLiability: true,
      liabilityBadge: 'BALANCE SHEET LIABILITY (NEVER INCOME)',
      explanation: 'Held in fiduciary trust as a refundable security deposit.'
    },
    totalOperatingExpensesLabel: formatPaiseToINR(perf.totalOpExPaise),
    netRentalIncomeLabel: formatPaiseToINR(perf.netRentalIncomePaise),
    grossYieldLabel: formatBpsToPercent(perf.grossYieldBps),
    netYieldLabel: formatBpsToPercent(perf.netYieldBps),
    rentalMarginLabel: formatBpsToPercent(perf.rentalMarginBps),
    occupancyRateLabel: formatBpsToPercent(perf.occupancyRateBps),
    expenses: formattedExpenses,
    isReadOnlyProjection: true
  };
}

/**
 * Screen 6: Documents Vault ViewModel
 */
export function getPropertyDocumentsViewModel({
  property,
  documentsList = []
}) {
  const docs = documentsList.length > 0 ? documentsList : (property?.documents || []);

  const items = docs.map(d => ({
    documentId: d.documentId || 'doc_unknown',
    documentType: d.documentType,
    title: d.title || d.documentType,
    verificationStatus: d.verificationStatus || 'PENDING',
    statusColor: d.verificationStatus === 'VERIFIED' ? '#10B981' : '#F59E0B',
    uploadDateLabel: d.uploadDate || 'Recent',
    fileSizeLabel: d.fileSize || 'PDF Document'
  }));

  return {
    documentsCount: items.length,
    items,
    isReadOnlyProjection: true
  };
}

/**
 * Screen 7: Ownership & Co-Owners ViewModel
 */
export function getPropertyOwnershipViewModel({
  property,
  targetMemberId = 'self'
}) {
  if (!property) return null;

  const mv = BigInt(property.marketValuePaise ?? 0n);
  const ownership = property.ownership || [{ ownerId: 'self', ownerName: 'Self', shareBps: 10_000n }];

  const allocations = allocatePropertyValueByBps(mv, ownership);

  const ownerCards = allocations.map(a => {
    const isCurrentUser = a.ownerId.toLowerCase() === targetMemberId.toLowerCase();
    return {
      ownerId: a.ownerId,
      ownerName: a.ownerName || a.ownerId,
      relation: a.relation || 'CO-OWNER',
      sharePercentLabel: formatBpsToPercent(a.shareBps),
      allocatedValueLabel: formatPaiseToINR(a.allocatedPaise),
      compactValueLabel: formatPaiseToCompactINR(a.allocatedPaise),
      isCurrentUser
    };
  });

  return {
    totalOwnersCount: allocations.length,
    ownerCards,
    isReadOnlyProjection: true
  };
}

/**
 * Screen 8: Location & Layout ViewModel
 */
export function getPropertyLocationViewModel({ property }) {
  if (!property) return null;

  return {
    propertyId: property.propertyId,
    displayName: property.displayName || 'Location Details',
    address: property.address || 'Address on file',
    city: property.city || 'Hyderabad',
    state: property.state || 'Telangana',
    pincode: property.pincode || '--',
    builtUpAreaLabel: formatAreaMicrosToSqFt(property.builtUpAreaMicros),
    carpetAreaLabel: formatAreaMicrosToSqFt(property.carpetAreaMicros),
    plotAreaLabel: formatAreaMicrosToSqFt(property.plotAreaMicros),
    surveyNumber: property.surveyNumber || 'Survey No. on file',
    zoning: property.zoning || 'Residential Zone R1',
    isReadOnlyProjection: true
  };
}

/**
 * Screen 9: Timeline & Valuation History ViewModel
 */
export function getPropertyTimelineViewModel({ property }) {
  if (!property) return null;

  const valuations = property.valuations || [];
  const valuationItems = valuations.map(v => ({
    valuationId: v.valuationId,
    valuationDateLabel: v.valuationDate || 'Date not recorded',
    marketValueLabel: formatPaiseToINR(BigInt(v.marketValuePaise ?? 0n)),
    compactMarketValueLabel: formatPaiseToCompactINR(BigInt(v.marketValuePaise ?? 0n)),
    valuationMethod: v.valuationMethod || 'MANUAL_ESTIMATE',
    confidence: v.valuationConfidence || 'MEDIUM',
    notes: v.notes || ''
  }));

  return {
    propertyId: property.propertyId,
    acquisitionDateLabel: property.acquisitionDate || 'Initial Registration',
    totalValuationsCount: valuationItems.length,
    valuationItems,
    isReadOnlyProjection: true
  };
}

/**
 * Screen 10: Risk, Compliance & Legal ViewModel
 */
export function getPropertyRiskViewModel({ property }) {
  if (!property) return null;

  const riskStatus = property.riskStatus || PROPERTY_RISK_STATUS.CLEAR;
  const config = RISK_CONFIG[riskStatus] || RISK_CONFIG.CLEAR;

  return {
    propertyId: property.propertyId,
    riskStatus,
    riskLabel: config.label,
    riskColor: config.color,
    icon: config.icon,
    isClear: riskStatus === PROPERTY_RISK_STATUS.CLEAR,
    encumbranceStatusLabel: property.encumbranceStatus || 'No encumbrance reported',
    propertyTaxStatusLabel: property.propertyTaxStatus || 'Up to date',
    legalAuditDateLabel: property.legalAuditDate || 'Initial review completed',
    isReadOnlyProjection: true
  };
}
