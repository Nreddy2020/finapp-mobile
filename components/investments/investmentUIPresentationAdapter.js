/**
 * @file investmentUIPresentationAdapter.js
 * @description Pure Presentation Adapter for FinLife Investments Module V1 (Phase 5).
 *
 * Invariants & Guarantees:
 * - ZERO financial calculations inside React components.
 * - ZERO raw BigInt leaks into UI props (recursively validated and frozen).
 * - Distinct monetary (₹1,50,000.00) vs quantity (24.500) vs percentage (+12.45%) presentation contracts.
 * - Stable status taxonomy:
 *   * Price: LIVE / RECENT, STALE PRICE, PRICE UNAVAILABLE, PRICE INVALID
 *   * Tax Lot: ACTIVE, PARTIALLY DEPLETED, DEPLETED
 *   * CFO: COMPLETE, PARTIAL, STALE, UNAVAILABLE
 * - Strict read-only projections: zero mutation of underlying domain records.
 */

import {
  PRICE_STATUS,
  INSTRUMENT_TYPES
} from './investmentContracts.js';

import {
  BANKING_RECONCILIATION_STATUS,
  CFO_PROJECTION_STATUS,
  OWNERSHIP_SCOPE,
  TOTAL_OWNERSHIP_BPS
} from './investmentIntegrationContracts.js';

import {
  formatPaiseToINR,
  formatQuantityMicros,
  formatBasisPoints,
  formatPercentage
} from './investmentValuationAdapter.js';

export const UI_STATE = Object.freeze({
  LOADING: 'LOADING',
  EMPTY: 'EMPTY',
  AVAILABLE: 'AVAILABLE',
  STALE: 'STALE',
  PARTIAL: 'PARTIAL',
  UNAVAILABLE: 'UNAVAILABLE',
  ERROR: 'ERROR'
});

/**
 * Recursively asserts that NO BigInt values exist in the output object.
 * Throws a TypeError if any BigInt is detected.
 */
export function assertNoBigIntLeaks(obj, path = 'root') {
  if (obj === null || obj === undefined) return;

  if (typeof obj === 'bigint') {
    throw new TypeError(`BigInt leak detected at ${path}: ${obj.toString()}n. UI adapters must format all BigInt values to string/safe types.`);
  }

  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      assertNoBigIntLeaks(obj[i], `${path}[${i}]`);
    }
  } else if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      assertNoBigIntLeaks(obj[key], `${path}.${key}`);
    }
  }
}

/**
 * Maps price status to verified UI presentation.
 */
export function mapPriceStatusToDisplay(priceStatus, isStale = false, quoteTimestamp = null) {
  if (isStale || priceStatus === PRICE_STATUS.STALE) {
    return Object.freeze({
      code: 'STALE',
      label: 'STALE PRICE',
      variant: 'warning',
      color: '#F59E0B',
      description: 'Quote exceeds freshness policy window',
      timestamp: quoteTimestamp ? String(quoteTimestamp) : null,
      isWarning: true
    });
  }

  switch (priceStatus) {
    case PRICE_STATUS.AVAILABLE:
      return Object.freeze({
        code: 'AVAILABLE',
        label: 'LIVE / RECENT',
        variant: 'success',
        color: '#10B981',
        description: 'Fresh market quote',
        timestamp: quoteTimestamp ? String(quoteTimestamp) : null,
        isWarning: false
      });

    case PRICE_STATUS.UNAVAILABLE:
      return Object.freeze({
        code: 'UNAVAILABLE',
        label: 'PRICE UNAVAILABLE',
        variant: 'neutral',
        color: '#6B7280',
        description: 'No market quote on record',
        timestamp: null,
        isWarning: false
      });

    case PRICE_STATUS.INVALID:
      return Object.freeze({
        code: 'INVALID',
        label: 'PRICE INVALID',
        variant: 'danger',
        color: '#EF4444',
        description: 'Malformed or corrupt market quote',
        timestamp: null,
        isWarning: true
      });

    default:
      return Object.freeze({
        code: 'UNAVAILABLE',
        label: 'PRICE UNAVAILABLE',
        variant: 'neutral',
        color: '#6B7280',
        description: 'No market quote on record',
        timestamp: null,
        isWarning: false
      });
  }
}

/**
 * Maps tax lot status to verified UI presentation.
 */
export function mapTaxLotStatusToDisplay(status) {
  switch (status) {
    case 'ACTIVE':
      return Object.freeze({
        code: 'ACTIVE',
        label: 'ACTIVE',
        variant: 'success',
        color: '#10B981'
      });
    case 'PARTIALLY_DEPLETED':
      return Object.freeze({
        code: 'PARTIALLY_DEPLETED',
        label: 'PARTIALLY DEPLETED',
        variant: 'warning',
        color: '#F59E0B'
      });
    case 'DEPLETED':
      return Object.freeze({
        code: 'DEPLETED',
        label: 'DEPLETED',
        variant: 'neutral',
        color: '#6B7280'
      });
    default:
      return Object.freeze({
        code: 'UNKNOWN',
        label: String(status || 'UNKNOWN'),
        variant: 'neutral',
        color: '#6B7280'
      });
  }
}

/**
 * Builds the Overview tab view model.
 */
export function getInvestmentsOverviewViewModel({
  portfolioValuation = null,
  performance = null,
  asOfDate = null,
  uiState = UI_STATE.AVAILABLE
} = {}) {
  if (uiState === UI_STATE.LOADING) {
    const vm = {
      uiState: UI_STATE.LOADING,
      isLoading: true,
      hero: null,
      freshnessBanner: null,
      assetAllocation: []
    };
    assertNoBigIntLeaks(vm);
    return Object.freeze(vm);
  }

  if (uiState === UI_STATE.EMPTY || !portfolioValuation || portfolioValuation.holdingsCount === 0) {
    const vm = {
      uiState: UI_STATE.EMPTY,
      isLoading: false,
      hero: {
        totalMarketValueDisplay: '₹0.00',
        totalCostBasisDisplay: '₹0.00',
        totalUnrealizedGainLossDisplay: '₹0.00',
        gainLossPercentDisplay: '0.00%',
        isGain: null,
        oneYearXirrDisplay: '—',
        allTimeCagrDisplay: '—',
        holdingsCount: 0
      },
      freshnessBanner: {
        code: 'EMPTY',
        label: 'NO HOLDINGS',
        variant: 'neutral',
        description: 'No securities registered in portfolio'
      },
      assetAllocation: []
    };
    assertNoBigIntLeaks(vm);
    return Object.freeze(vm);
  }

  // Derive Hero metrics
  const isGain = portfolioValuation.totalUnrealizedGainLossPaise !== null
    ? portfolioValuation.totalUnrealizedGainLossPaise >= 0n
    : null;

  const freshnessBanner = mapPriceStatusToDisplay(
    portfolioValuation.valuationStatus,
    portfolioValuation.isStale,
    asOfDate
  );

  // Asset allocation aggregation
  const allocationMap = new Map();
  const rawHoldings = portfolioValuation.holdingValuations || portfolioValuation.holdings || [];

  for (const h of rawHoldings) {
    const type = h.instrumentType || 'OTHER';
    const valPaise = h.marketValuePaise ?? 0n;
    const currentTotal = allocationMap.get(type) || 0n;
    allocationMap.set(type, currentTotal + valPaise);
  }

  const totalMarketPaise = portfolioValuation.totalMarketValuePaise ?? 0n;
  const assetAllocation = [];

  const categoryLabels = {
    [INSTRUMENT_TYPES.EQUITY]: 'Indian Equities',
    [INSTRUMENT_TYPES.MUTUAL_FUND]: 'Mutual Funds',
    [INSTRUMENT_TYPES.GOLD_ETF]: 'Gold ETFs / SGBs',
    [INSTRUMENT_TYPES.REIT_INVIT]: 'REITs & InvITs',
    [INSTRUMENT_TYPES.GOVERNMENT_SECURITY]: 'Govt Securities',
    [INSTRUMENT_TYPES.BOND]: 'Bonds & Fixed Income',
    [INSTRUMENT_TYPES.FIXED_INCOME]: 'Fixed Income',
    OTHER: 'Other Securities'
  };

  const categoryColors = {
    [INSTRUMENT_TYPES.EQUITY]: '#3B82F6',
    [INSTRUMENT_TYPES.MUTUAL_FUND]: '#10B981',
    [INSTRUMENT_TYPES.GOLD_ETF]: '#F59E0B',
    [INSTRUMENT_TYPES.REIT_INVIT]: '#8B5CF6',
    [INSTRUMENT_TYPES.GOVERNMENT_SECURITY]: '#06B6D4',
    [INSTRUMENT_TYPES.BOND]: '#EC4899',
    [INSTRUMENT_TYPES.FIXED_INCOME]: '#14B8A6',
    OTHER: '#6B7280'
  };

  for (const [type, valPaise] of allocationMap.entries()) {
    const percent = totalMarketPaise > 0n
      ? Number((valPaise * 10000n) / totalMarketPaise) / 100
      : 0;

    assetAllocation.push({
      type,
      label: categoryLabels[type] || type,
      color: categoryColors[type] || '#6B7280',
      valueDisplay: formatPaiseToINR(valPaise),
      percentageDisplay: `${percent.toFixed(2)}%`,
      percentageNum: percent
    });
  }

  const vm = {
    uiState: portfolioValuation.isStale ? UI_STATE.STALE : UI_STATE.AVAILABLE,
    isLoading: false,
    hero: {
      totalMarketValueDisplay: formatPaiseToINR(portfolioValuation.totalMarketValuePaise, { fallback: '—' }),
      totalCostBasisDisplay: formatPaiseToINR(portfolioValuation.totalCostBasisPaise, { fallback: '—' }),
      totalUnrealizedGainLossDisplay: formatPaiseToINR(portfolioValuation.totalUnrealizedGainLossPaise, { fallback: '—' }),
      gainLossPercentDisplay: formatBasisPoints(portfolioValuation.aggregateUnrealizedBps, { fallback: '—' }),
      isGain,
      oneYearXirrDisplay: performance?.xirr ? formatPercentage(performance.xirr.rate, { fallback: '—' }) : '—',
      allTimeCagrDisplay: performance?.cagr ? formatPercentage(performance.cagr.rate, { fallback: '—' }) : '—',
      holdingsCount: portfolioValuation.holdingsCount || rawHoldings.length
    },
    freshnessBanner,
    assetAllocation
  };

  assertNoBigIntLeaks(vm);
  return Object.freeze(vm);
}

/**
 * Builds the Holdings list view model.
 */
export function getHoldingsListViewModel({
  portfolioValuation = null,
  instruments = [],
  accounts = [],
  selectedFilter = 'ALL'
} = {}) {
  if (!portfolioValuation) {
    const emptyVM = {
      uiState: UI_STATE.EMPTY,
      holdings: [],
      totalCount: 0,
      filteredCount: 0,
      selectedFilter
    };
    assertNoBigIntLeaks(emptyVM);
    return Object.freeze(emptyVM);
  }

  const instMap = new Map(instruments.map(i => [i.id, i]));
  const accMap = new Map(accounts.map(a => [a.id, a]));
  const rawHoldings = portfolioValuation.holdingValuations || portfolioValuation.holdings || [];

  const holdings = [];

  for (const h of rawHoldings) {
    const inst = instMap.get(h.instrumentId) || {};
    const acc = accMap.get(h.accountId) || {};

    const instrumentType = h.instrumentType || inst.instrumentType || 'OTHER';

    if (selectedFilter !== 'ALL' && instrumentType !== selectedFilter) {
      continue;
    }

    const isGain = h.unrealizedGainLossPaise !== null && h.unrealizedGainLossPaise !== undefined
      ? h.unrealizedGainLossPaise >= 0n
      : null;

    const statusBadge = mapPriceStatusToDisplay(h.priceStatus || h.status, h.isStale, h.priceTimestamp);

    holdings.push({
      holdingId: h.holdingId || h.id,
      instrumentId: h.instrumentId,
      symbol: h.symbol || inst.symbol || 'SECURITIES',
      name: h.name || inst.name || 'Financial Instrument',
      instrumentType,
      accountName: acc.name || 'Demat Account',
      quantityDisplay: formatQuantityMicros(h.quantityMicros ?? h.totalQuantityMicros, { fallback: '0' }),
      currentPriceDisplay: formatPaiseToINR(h.marketPricePaise, { fallback: '—' }),
      marketValueDisplay: formatPaiseToINR(h.marketValuePaise, { fallback: '—' }),
      costBasisDisplay: formatPaiseToINR(h.costBasisPaise ?? h.totalCostBasisPaise, { fallback: '—' }),
      unrealizedGainLossDisplay: formatPaiseToINR(h.unrealizedGainLossPaise, { fallback: '—' }),
      unrealizedGainLossPercentDisplay: formatBasisPoints(h.unrealizedGainLossBps, { fallback: '—' }),
      isGain,
      statusBadge
    });
  }

  const vm = {
    uiState: holdings.length === 0 ? UI_STATE.EMPTY : UI_STATE.AVAILABLE,
    holdings,
    totalCount: rawHoldings.length,
    filteredCount: holdings.length,
    selectedFilter
  };

  assertNoBigIntLeaks(vm);
  return Object.freeze(vm);
}

/**
 * Builds the Holding Detail modal view model.
 */
export function getHoldingDetailViewModel({
  holdingId,
  portfolioValuation = null,
  taxLots = [],
  instruments = [],
  accounts = []
} = {}) {
  if (!holdingId) return null;

  const rawHoldings = portfolioValuation?.holdingValuations || portfolioValuation?.holdings || [];
  const holding = rawHoldings.find(h => (h.holdingId || h.id) === holdingId);

  if (!holding) {
    const notFound = {
      uiState: UI_STATE.UNAVAILABLE,
      error: 'HOLDING_NOT_FOUND',
      holdingId
    };
    assertNoBigIntLeaks(notFound);
    return Object.freeze(notFound);
  }

  const instMap = new Map(instruments.map(i => [i.id, i]));
  const accMap = new Map(accounts.map(a => [a.id, a]));

  const inst = instMap.get(holding.instrumentId) || {};
  const acc = accMap.get(holding.accountId) || {};

  // Underlying tax lots for this holding
  const matchingLots = taxLots.filter(l =>
    l.instrumentId === holding.instrumentId &&
    l.accountId === holding.accountId
  );

  const formattedLots = matchingLots.map(lot => {
    const isDepleted = (lot.remainingQuantityMicros ?? 0n) === 0n;
    const isPartial = !isDepleted && (lot.remainingQuantityMicros < lot.quantityMicros);
    const lotStatus = isDepleted ? 'DEPLETED' : (isPartial ? 'PARTIALLY_DEPLETED' : 'ACTIVE');

    return {
      lotId: lot.id,
      acquisitionDate: lot.acquisitionDate || lot.createdAt?.split('T')[0] || '—',
      originalQuantityDisplay: formatQuantityMicros(lot.quantityMicros),
      remainingQuantityDisplay: formatQuantityMicros(lot.remainingQuantityMicros),
      costPerUnitDisplay: formatPaiseToINR(lot.costPerUnitPaise, { fallback: '—' }),
      costBasisDisplay: formatPaiseToINR(lot.remainingCostBasisPaise ?? lot.costBasisPaise, { fallback: '—' }),
      statusBadge: mapTaxLotStatusToDisplay(lotStatus),
      isBonusShare: Boolean(lot.isBonusShare || lot.acquisitionCostPaise === 0n),
      bonusTag: (lot.isBonusShare || lot.acquisitionCostPaise === 0n) ? 'Sec 55(2)(aa) Bonus (₹0 Basis)' : null,
      isSplitAdjusted: Boolean(lot.isSplitAdjusted)
    };
  });

  const isGain = holding.unrealizedGainLossPaise !== null && holding.unrealizedGainLossPaise !== undefined
    ? holding.unrealizedGainLossPaise >= 0n
    : null;

  const vm = {
    uiState: UI_STATE.AVAILABLE,
    holdingId,
    instrumentId: holding.instrumentId,
    symbol: holding.symbol || inst.symbol || 'SECURITIES',
    name: holding.name || inst.name || 'Financial Security',
    isin: inst.isin || holding.isin || '—',
    instrumentType: holding.instrumentType || inst.instrumentType || 'OTHER',
    accountName: acc.name || 'Demat Account',
    quantityDisplay: formatQuantityMicros(holding.quantityMicros ?? holding.totalQuantityMicros, { fallback: '0' }),
    currentPriceDisplay: formatPaiseToINR(holding.marketPricePaise, { fallback: '—' }),
    marketValueDisplay: formatPaiseToINR(holding.marketValuePaise, { fallback: '—' }),
    costBasisDisplay: formatPaiseToINR(holding.costBasisPaise ?? holding.totalCostBasisPaise, { fallback: '—' }),
    unrealizedGainLossDisplay: formatPaiseToINR(holding.unrealizedGainLossPaise, { fallback: '—' }),
    unrealizedGainLossPercentDisplay: formatBasisPoints(holding.unrealizedGainLossBps, { fallback: '—' }),
    isGain,
    statusBadge: mapPriceStatusToDisplay(holding.priceStatus || holding.status, holding.isStale),
    lots: formattedLots,
    hasLots: formattedLots.length > 0
  };

  assertNoBigIntLeaks(vm);
  return Object.freeze(vm);
}

/**
 * Builds the Personal CFO tab view model.
 */
export function getCFOIntegrationViewModel({
  cfoSnapshot = null,
  ownershipMode = OWNERSHIP_SCOPE.PERSONAL,
  personalBps = TOTAL_OWNERSHIP_BPS
} = {}) {
  if (!cfoSnapshot) {
    const emptyVM = {
      uiState: UI_STATE.UNAVAILABLE,
      status: CFO_PROJECTION_STATUS.UNAVAILABLE,
      statusBadge: { label: 'CFO UNAVAILABLE', color: '#6B7280', variant: 'neutral' },
      netWorthDisplay: '—',
      personalNetWorthDisplay: '—',
      familyNetWorthDisplay: '—',
      unavailableSources: ['INVESTMENTS', 'BANKING', 'ASSETS', 'PROPERTIES', 'LOANS'],
      assets: null,
      liabilities: null,
      isStale: false,
      ownershipMode,
      personalBpsPercent: '100.00%'
    };
    assertNoBigIntLeaks(emptyVM);
    return Object.freeze(emptyVM);
  }

  const isPartial = cfoSnapshot.status === CFO_PROJECTION_STATUS.PARTIAL || cfoSnapshot.status === CFO_PROJECTION_STATUS.UNAVAILABLE;
  const isStale = Boolean(cfoSnapshot.isStale);

  let statusBadge = { label: 'COMPLETE', color: '#10B981', variant: 'success' };
  if (cfoSnapshot.status === CFO_PROJECTION_STATUS.UNAVAILABLE) {
    statusBadge = { label: 'UNAVAILABLE', color: '#EF4444', variant: 'danger' };
  } else if (cfoSnapshot.status === CFO_PROJECTION_STATUS.PARTIAL) {
    statusBadge = { label: 'PARTIAL (MISSING MODULES)', color: '#F59E0B', variant: 'warning' };
  } else if (isStale) {
    statusBadge = { label: 'STALE DATA', color: '#F59E0B', variant: 'warning' };
  }

  const assets = cfoSnapshot.assetsBreakdown ? {
    liquidCashDisplay: formatPaiseToINR(cfoSnapshot.assetsBreakdown.liquidCashPaise, { fallback: '—' }),
    investmentsDisplay: formatPaiseToINR(cfoSnapshot.assetsBreakdown.investmentsPaise, { fallback: '—' }),
    physicalAssetsDisplay: formatPaiseToINR(cfoSnapshot.assetsBreakdown.physicalAssetsPaise, { fallback: '—' }),
    propertiesDisplay: formatPaiseToINR(cfoSnapshot.assetsBreakdown.propertiesPaise, { fallback: '—' }),
    p2pReceivablesDisplay: formatPaiseToINR(cfoSnapshot.assetsBreakdown.p2pReceivablesPaise, { fallback: '—' }),
    totalAssetsDisplay: formatPaiseToINR(cfoSnapshot.assetsBreakdown.totalAssetsPaise, { fallback: '—' })
  } : null;

  const liabilities = cfoSnapshot.liabilitiesBreakdown ? {
    formalDebtDisplay: formatPaiseToINR(cfoSnapshot.liabilitiesBreakdown.formalDebtPaise, { fallback: '—' }),
    p2pPayablesDisplay: formatPaiseToINR(cfoSnapshot.liabilitiesBreakdown.p2pPayablesPaise, { fallback: '—' }),
    propertyMortgagesDisplay: formatPaiseToINR(cfoSnapshot.liabilitiesBreakdown.propertyMortgagesPaise, { fallback: '—' }),
    totalLiabilitiesDisplay: formatPaiseToINR(cfoSnapshot.liabilitiesBreakdown.totalLiabilitiesPaise, { fallback: '—' })
  } : null;

  const bpsNum = Number(personalBps) / 100;

  const vm = {
    uiState: isPartial ? UI_STATE.PARTIAL : (isStale ? UI_STATE.STALE : UI_STATE.AVAILABLE),
    status: cfoSnapshot.status,
    statusBadge,
    netWorthDisplay: formatPaiseToINR(cfoSnapshot.netWorthPaise, { fallback: '—' }),
    personalNetWorthDisplay: formatPaiseToINR(cfoSnapshot.personalNetWorthPaise, { fallback: '—' }),
    familyNetWorthDisplay: formatPaiseToINR(cfoSnapshot.familyNetWorthPaise, { fallback: '—' }),
    unavailableSources: [...(cfoSnapshot.unavailableSources || [])],
    staleSources: [...(cfoSnapshot.staleSources || [])],
    assets,
    liabilities,
    isStale,
    asOfDate: cfoSnapshot.asOfDate || '—',
    ownershipMode,
    personalBpsPercent: `${bpsNum.toFixed(2)}%`
  };

  assertNoBigIntLeaks(vm);
  return Object.freeze(vm);
}
