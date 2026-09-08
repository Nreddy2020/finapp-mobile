/**
 * @file investmentAssetsAdapter.js
 * @description Read-only Assets Module integration adapter for FinLife Investments Module V1 (Phase 4).
 *
 * Invariants & Guarantees:
 * - Read-only projection: Feeds authoritative investment valuations into Assets Module taxonomy.
 * - Non-mutating deduplication: Scans for duplicate manual records in Assets without mutating,
 *   deleting, or archiving them.
 * - Physical gold vs gold securities: Physical gold (PRECIOUS_METALS) and Gold ETFs/SGBs (securities)
 *   are preserved as separate, non-colliding asset classes.
 * - Exact signed 64-bit integer paise arithmetic.
 */

import {
  validateBoundedPaise,
  validateNonNegativePaise
} from './investmentContracts.js';

/**
 * Projects authoritative investment portfolio valuation into Assets Module taxonomy.
 *
 * @param {Object} params
 * @param {Object|null} params.portfolioValuation - Valuation DTO from investmentValuationEngine.
 * @param {boolean} [params.isAvailable=true] - Availability flag of Investments module.
 * @returns {Object} AssetsProjectionDTO
 */
export function getInvestmentsAssetProjection({
  portfolioValuation = null,
  isAvailable = true
} = {}) {
  if (!isAvailable || !portfolioValuation) {
    return Object.freeze({
      sourceType: 'INVESTMENT_LEDGER',
      assetCategory: 'INVESTMENTS',
      isReadOnlyProjection: true,
      isAvailable: false,
      status: 'UNAVAILABLE',
      asOfDate: null,
      totalMarketValuePaise: null,
      totalCostBasisPaise: null,
      unrealizedGainLossPaise: null,
      securitiesCount: 0,
      holdings: Object.freeze([])
    });
  }

  const totalMarketValuePaise = portfolioValuation.totalMarketValuePaise !== null && portfolioValuation.totalMarketValuePaise !== undefined
    ? validateBoundedPaise(BigInt(portfolioValuation.totalMarketValuePaise), 'totalMarketValuePaise')
    : null;

  const totalCostBasisPaise = portfolioValuation.totalCostBasisPaise !== null && portfolioValuation.totalCostBasisPaise !== undefined
    ? validateBoundedPaise(BigInt(portfolioValuation.totalCostBasisPaise), 'totalCostBasisPaise')
    : null;

  const unrealizedGainLossPaise = portfolioValuation.totalUnrealizedGainLossPaise !== null && portfolioValuation.totalUnrealizedGainLossPaise !== undefined
    ? validateBoundedPaise(BigInt(portfolioValuation.totalUnrealizedGainLossPaise), 'unrealizedGainLossPaise')
    : null;

  const rawHoldings = portfolioValuation.holdingValuations || portfolioValuation.holdings || [];
  const projectedHoldings = rawHoldings.map(h => Object.freeze({
    holdingId: h.holdingId || h.id,
    instrumentId: h.instrumentId,
    isin: h.isin || null,
    symbol: h.symbol || null,
    instrumentType: h.instrumentType,
    quantityMicros: h.quantityMicros ?? h.totalQuantityMicros ?? 0n,
    marketValuePaise: h.marketValuePaise ?? null,
    costBasisPaise: h.costBasisPaise ?? h.totalCostBasisPaise ?? null,
    unrealizedGainLossPaise: h.unrealizedGainLossPaise ?? null,
    pricingStatus: h.pricingStatus || h.status || 'AVAILABLE'
  }));

  return Object.freeze({
    sourceType: 'INVESTMENT_LEDGER',
    assetCategory: 'INVESTMENTS',
    isReadOnlyProjection: true,
    isAvailable: true,
    status: portfolioValuation.status || 'AVAILABLE',
    asOfDate: portfolioValuation.asOfDate || null,
    totalMarketValuePaise,
    totalCostBasisPaise,
    unrealizedGainLossPaise,
    securitiesCount: projectedHoldings.length,
    holdings: Object.freeze(projectedHoldings)
  });
}

/**
 * Detects manual asset records in Assets Module that duplicate authoritative investment holdings.
 *
 * CRITICAL ARCHITECTURAL MANDATE:
 * - Pure read-only detection: NEVER mutate, delete, archive, or rewrite manual asset records.
 * - Returns duplicate IDs and evidence so downstream projections (e.g. Personal CFO) can exclude them.
 * - Physical gold (PRECIOUS_METALS, grams) vs Gold ETFs/SGBs (securities) are preserved as distinct.
 *
 * @param {Object} params
 * @param {Array<Object>} params.investmentHoldings - Authoritative investment holdings.
 * @param {Array<Object>} params.manualAssets - Manual asset records from Assets Module.
 * @returns {Object} DuplicateDetectionResultDTO
 */
export function detectCrossModuleInvestmentDuplicates({
  investmentHoldings = [],
  manualAssets = []
} = {}) {
  if (!Array.isArray(investmentHoldings)) {
    throw new TypeError('investmentHoldings must be an Array');
  }
  if (!Array.isArray(manualAssets)) {
    throw new TypeError('manualAssets must be an Array');
  }

  // Index investment holdings by ISIN and uppercase symbol
  const holdingsByIsin = new Map();
  const holdingsBySymbol = new Map();

  for (const h of investmentHoldings) {
    if (!h) continue;
    if (h.isin && typeof h.isin === 'string' && h.isin.trim().length > 0) {
      holdingsByIsin.set(h.isin.trim().toUpperCase(), h);
    }
    if (h.symbol && typeof h.symbol === 'string' && h.symbol.trim().length > 0) {
      holdingsBySymbol.set(h.symbol.trim().toUpperCase(), h);
    }
  }

  const duplicateIds = [];
  const duplicateItems = [];
  let totalDuplicateValuePaise = 0n;

  for (const asset of manualAssets) {
    if (!asset || typeof asset !== 'object') continue;

    // Do NOT match physical gold against gold securities!
    // Physical gold in Assets Module is in PRECIOUS_METALS category
    if (asset.category === 'PRECIOUS_METALS') {
      continue;
    }

    // Check matching by ISIN first (most authoritative)
    const assetIsin = typeof asset.isin === 'string' && asset.isin.trim().length > 0
      ? asset.isin.trim().toUpperCase()
      : null;

    let matchedHolding = null;
    let matchReason = null;

    if (assetIsin && holdingsByIsin.has(assetIsin)) {
      matchedHolding = holdingsByIsin.get(assetIsin);
      matchReason = 'MATCHING_ISIN';
    } else {
      // Check matching by Symbol / Ticker
      const assetSymbol = typeof asset.symbol === 'string' && asset.symbol.trim().length > 0
        ? asset.symbol.trim().toUpperCase()
        : null;

      if (assetSymbol && holdingsBySymbol.has(assetSymbol)) {
        matchedHolding = holdingsBySymbol.get(assetSymbol);
        matchReason = 'MATCHING_SYMBOL';
      } else if (asset.category === 'INVESTMENTS') {
        // Check if name or details matches a holding symbol
        const assetName = typeof asset.name === 'string' ? asset.name.trim().toUpperCase() : '';
        for (const [sym, holding] of holdingsBySymbol.entries()) {
          if (assetName === sym || assetName.startsWith(sym + ' ') || assetName.endsWith(' ' + sym)) {
            matchedHolding = holding;
            matchReason = 'MATCHING_NAME_SYMBOL';
            break;
          }
        }
      }
    }

    if (matchedHolding) {
      const assetValuePaise = BigInt(asset.valuationPaise ?? asset.currentValuePaise ?? asset.costBasisPaise ?? 0n);
      duplicateIds.push(asset.id);
      duplicateItems.push(Object.freeze({
        manualAssetId: asset.id,
        manualAssetName: asset.name || 'Unnamed Asset',
        manualAssetCategory: asset.category,
        manualAssetValuePaise: assetValuePaise,
        investmentHoldingId: matchedHolding.holdingId || matchedHolding.id,
        isin: matchedHolding.isin || null,
        symbol: matchedHolding.symbol || null,
        matchReason
      }));
      totalDuplicateValuePaise += assetValuePaise;
    }
  }

  validateBoundedPaise(totalDuplicateValuePaise, 'totalDuplicateValuePaise');

  return Object.freeze({
    hasDuplicates: duplicateIds.length > 0,
    duplicateIds: Object.freeze(duplicateIds),
    duplicateItems: Object.freeze(duplicateItems),
    totalDuplicateValuePaise,
    deduplicationCount: duplicateIds.length
  });
}
