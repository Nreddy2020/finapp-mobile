/**
 * FinLife Investments Module V1 - Phase 3: Valuation Engine
 *
 * Deterministic, read-only valuation engine.
 * Pure functional design: Reads active holdings and price quotes; never mutates
 * tax lots, holdings, transactions, or journal entries.
 */

import {
  QUANTITY_SCALE,
  PRICE_STATUS,
  PRICE_SOURCE,
  PRICE_ADJUSTMENT_TYPE,
  DEFAULT_FRESHNESS_THRESHOLDS_MS,
  COST_BASIS_STATUS,
  validateBoundedPaise,
  validateNonNegativePaise,
  validateBoundedQuantityMicros
} from './investmentContracts.js';
import { calculateGrossPaise } from './investmentCalculations.js';

/**
 * Evaluates the freshness of a price quote relative to an as-of date and calculation time.
 *
 * Invariants:
 * 1. priceTimestamp <= valuationTimestamp (cannot compute valuation before price existed)
 * 2. For historical valuation: priceTimestamp <= asOfDate (cannot use future price for past valuation)
 *    unless source is explicitly MANUAL_OVERRIDE.
 */
export function checkPriceFreshness({
  priceQuote,
  instrumentType = 'DEFAULT',
  asOfDate,
  valuationTimestamp = new Date().toISOString()
}) {
  if (!priceQuote || typeof priceQuote !== 'object') {
    return {
      status: PRICE_STATUS.UNAVAILABLE,
      isStale: false,
      ageMs: null,
      reason: 'MISSING_PRICE_QUOTE'
    };
  }

  if (priceQuote.status === PRICE_STATUS.INVALID || priceQuote.status === PRICE_STATUS.UNAVAILABLE) {
    return {
      status: priceQuote.status,
      isStale: false,
      ageMs: null,
      reason: `EXPLICIT_${priceQuote.status}_QUOTE`
    };
  }

  if (priceQuote.pricePaise === undefined || priceQuote.pricePaise === null || typeof priceQuote.pricePaise !== 'bigint' || priceQuote.pricePaise < 0n) {
    return {
      status: PRICE_STATUS.INVALID,
      isStale: false,
      ageMs: null,
      reason: 'INVALID_PRICE_PAISE'
    };
  }

  const quoteTime = new Date(priceQuote.asOfTimestamp).getTime();
  const valTime = new Date(valuationTimestamp).getTime();

  if (isNaN(quoteTime)) {
    return {
      status: PRICE_STATUS.INVALID,
      isStale: false,
      ageMs: null,
      reason: 'INVALID_PRICE_TIMESTAMP'
    };
  }

  // Rule: priceTimestamp cannot be in the future relative to valuation calculation time
  if (quoteTime > valTime + 60000) { // 1 min clock drift tolerance
    return {
      status: PRICE_STATUS.INVALID,
      isStale: false,
      ageMs: null,
      reason: 'FUTURE_PRICE_TIMESTAMP'
    };
  }

  // Rule: For historical valuation, a quote timestamp after asOfDate is rejected
  // unless explicitly marked MANUAL_OVERRIDE
  if (asOfDate) {
    const asOfTime = new Date(asOfDate).getTime();
    if (!isNaN(asOfTime)) {
      // Allow end of day tolerance (until 23:59:59.999 of asOfDate)
      const asOfEndOfDay = new Date(asOfDate);
      asOfEndOfDay.setHours(23, 59, 59, 999);
      if (quoteTime > asOfEndOfDay.getTime() && priceQuote.source !== PRICE_SOURCE.MANUAL_OVERRIDE) {
        throw new RangeError(`Historical asOfDate (${asOfDate}) cannot use a future price quote dated ${priceQuote.asOfTimestamp}`);
      }
    }
  }

  const referenceTime = asOfDate ? new Date(asOfDate).getTime() : valTime;
  const ageMs = Math.max(0, referenceTime - quoteTime);
  const thresholdMs = DEFAULT_FRESHNESS_THRESHOLDS_MS[instrumentType] || DEFAULT_FRESHNESS_THRESHOLDS_MS.DEFAULT;

  const isStale = ageMs > thresholdMs;

  return {
    status: isStale ? PRICE_STATUS.STALE : PRICE_STATUS.AVAILABLE,
    isStale,
    ageMs,
    reason: isStale ? 'EXCEEDED_FRESHNESS_WINDOW' : 'FRESH'
  };
}

/**
 * Calculates market valuation for a single derived holding.
 *
 * Rules:
 * - Missing or invalid price -> marketValuePaise: null, unrealizedGainLossPaise: null
 * - Stale price -> marketValuePaise computed, but carries priceStatus: 'STALE' and isStale: true
 * - Cost basis unavailable -> unrealizedGainLossPaise: null, unrealizedGainLossBps: null
 */
export function calculateHoldingValuation({
  holding,
  priceQuote,
  instrumentType = 'DEFAULT',
  asOfDate,
  valuationTimestamp = new Date().toISOString(),
  allowStale = true
}) {
  if (!holding || typeof holding !== 'object') {
    throw new TypeError('Holding must be an object');
  }

  const freshness = checkPriceFreshness({
    priceQuote,
    instrumentType,
    asOfDate,
    valuationTimestamp
  });

  const quantityMicros = holding.totalQuantityMicros !== undefined ? holding.totalQuantityMicros : holding.quantityMicros;
  const costBasisPaise = holding.totalCostBasisPaise !== undefined ? holding.totalCostBasisPaise : holding.costBasisPaise;

  const baseDTO = {
    holdingId: holding.id || `${holding.accountId}:${holding.instrumentId}`,
    accountId: holding.accountId,
    instrumentId: holding.instrumentId,
    quantityMicros,
    costBasisPaise,
    costBasisStatus: holding.costBasisStatus,
    asOfDate: asOfDate || valuationTimestamp,
    valuationTimestamp,
    priceStatus: freshness.status,
    isStale: freshness.isStale,
    priceAgeMs: freshness.ageMs,
    priceSource: priceQuote?.source || null,
    priceTimestamp: priceQuote?.asOfTimestamp || null,
    priceAdjustmentType: priceQuote?.adjustmentType || PRICE_ADJUSTMENT_TYPE.RAW
  };

  // If price is UNAVAILABLE or INVALID, valuation fields are strictly null (never 0n)
  if (freshness.status === PRICE_STATUS.UNAVAILABLE || freshness.status === PRICE_STATUS.INVALID) {
    return Object.freeze({
      ...baseDTO,
      marketPricePaise: null,
      marketValuePaise: null,
      unrealizedGainLossPaise: null,
      unrealizedGainLossBps: null
    });
  }

  // If stale and stale is strictly disallowed
  if (freshness.status === PRICE_STATUS.STALE && !allowStale) {
    return Object.freeze({
      ...baseDTO,
      marketPricePaise: priceQuote.pricePaise,
      marketValuePaise: null,
      unrealizedGainLossPaise: null,
      unrealizedGainLossBps: null
    });
  }

  const marketPricePaise = priceQuote.pricePaise;
  const marketValuePaise = calculateGrossPaise(quantityMicros, marketPricePaise);
  validateBoundedPaise(marketValuePaise, 'marketValuePaise');

  // Unrealized Gain/Loss
  let unrealizedGainLossPaise = null;
  let unrealizedGainLossBps = null;

  if (holding.costBasisStatus === COST_BASIS_STATUS.AVAILABLE && costBasisPaise !== null) {
    unrealizedGainLossPaise = marketValuePaise - costBasisPaise;
    validateBoundedPaise(unrealizedGainLossPaise, 'unrealizedGainLossPaise');

    if (costBasisPaise > 0n) {
      // Deterministic floor integer BPS: (gain * 10,000) / costBasis
      unrealizedGainLossBps = (unrealizedGainLossPaise * 10000n) / costBasisPaise;
    } else {
      unrealizedGainLossBps = 0n;
    }
  }

  return Object.freeze({
    ...baseDTO,
    marketPricePaise,
    marketValuePaise,
    unrealizedGainLossPaise,
    unrealizedGainLossBps
  });
}

/**
 * Aggregates portfolio-level market valuation across all holdings.
 *
 * Rules:
 * - Omission of null valuations: if any holding has null market value, it is omitted
 *   from computable market value sum, but flagged in portfolioStatus as PARTIAL or UNAVAILABLE.
 * - Stale prices propagate isStale flag to portfolio valuation.
 */
export function calculatePortfolioValuation({
  holdings = [],
  priceQuotesMap = {}, // Map of instrumentId -> priceQuote
  instrumentsMap = {},  // Map of instrumentId -> instrument
  asOfDate,
  valuationTimestamp = new Date().toISOString(),
  allowStale = true
}) {
  const holdingValuations = holdings.map(holding => {
    const quote = priceQuotesMap[holding.instrumentId];
    const instrument = instrumentsMap[holding.instrumentId];
    const instrumentType = instrument?.type || 'DEFAULT';

    return calculateHoldingValuation({
      holding,
      priceQuote: quote,
      instrumentType,
      asOfDate,
      valuationTimestamp,
      allowStale
    });
  });

  let totalCostBasisPaise = 0n;
  let totalMarketValuePaise = 0n;
  let totalUnrealizedGainLossPaise = 0n;

  let hasAvailableBasis = false;
  let hasMissingBasis = false;

  let hasAvailableValuation = false;
  let hasMissingValuation = false;
  let hasStalePrice = false;

  for (const hv of holdingValuations) {
    if (hv.isStale) {
      hasStalePrice = true;
    }

    if (hv.costBasisStatus === COST_BASIS_STATUS.AVAILABLE && hv.costBasisPaise !== null) {
      totalCostBasisPaise += hv.costBasisPaise;
      hasAvailableBasis = true;
    } else {
      hasMissingBasis = true;
    }

    if (hv.marketValuePaise !== null) {
      totalMarketValuePaise += hv.marketValuePaise;
      hasAvailableValuation = true;

      if (hv.unrealizedGainLossPaise !== null) {
        totalUnrealizedGainLossPaise += hv.unrealizedGainLossPaise;
      }
    } else {
      hasMissingValuation = true;
    }
  }

  // Determine aggregate portfolio valuation status
  let valuationStatus = PRICE_STATUS.AVAILABLE;
  if (!hasAvailableValuation && holdingValuations.length > 0) {
    valuationStatus = PRICE_STATUS.UNAVAILABLE;
  } else if (hasMissingValuation) {
    valuationStatus = 'PARTIAL';
  } else if (hasStalePrice) {
    valuationStatus = PRICE_STATUS.STALE;
  }

  // Determine aggregate cost basis status
  let costBasisStatus = COST_BASIS_STATUS.AVAILABLE;
  if (!hasAvailableBasis && holdingValuations.length > 0) {
    costBasisStatus = COST_BASIS_STATUS.UNAVAILABLE;
  } else if (hasMissingBasis) {
    costBasisStatus = COST_BASIS_STATUS.PARTIAL;
  }

  // Aggregate BPS
  let aggregateUnrealizedBps = null;
  if (costBasisStatus === COST_BASIS_STATUS.AVAILABLE && totalCostBasisPaise > 0n && valuationStatus === PRICE_STATUS.AVAILABLE) {
    aggregateUnrealizedBps = (totalUnrealizedGainLossPaise * 10000n) / totalCostBasisPaise;
  } else if (totalCostBasisPaise > 0n && hasAvailableValuation) {
    // If partial, compute BPS over the subset with caution flag
    aggregateUnrealizedBps = (totalUnrealizedGainLossPaise * 10000n) / totalCostBasisPaise;
  }

  return Object.freeze({
    asOfDate: asOfDate || valuationTimestamp,
    valuationTimestamp,
    holdingsCount: holdings.length,
    evaluatedHoldingsCount: holdingValuations.filter(h => h.marketValuePaise !== null).length,
    valuationStatus,
    costBasisStatus,
    isStale: hasStalePrice,
    totalCostBasisPaise: hasAvailableBasis ? totalCostBasisPaise : null,
    totalMarketValuePaise: hasAvailableValuation ? totalMarketValuePaise : null,
    totalUnrealizedGainLossPaise: (hasAvailableValuation && hasAvailableBasis) ? totalUnrealizedGainLossPaise : null,
    aggregateUnrealizedBps,
    holdings: holdingValuations
  });
}

/**
 * Mathematical invariant verification asserting exact reconciliation between
 * valuation DTO and underlying derived holding.
 */
export function reconcileValuationWithHoldings(holdingValuation, holding) {
  if (!holdingValuation || !holding) {
    throw new TypeError('Both holdingValuation and holding must be provided');
  }

  const holdingQty = holding.totalQuantityMicros !== undefined ? holding.totalQuantityMicros : holding.quantityMicros;
  const holdingCost = holding.totalCostBasisPaise !== undefined ? holding.totalCostBasisPaise : holding.costBasisPaise;

  if (holdingValuation.quantityMicros !== holdingQty) {
    throw new Error(
      `Reconciliation mismatch: holding quantity (${holdingQty}) does not match valuation quantity (${holdingValuation.quantityMicros})`
    );
  }

  if (holdingValuation.marketValuePaise !== null && holdingValuation.marketPricePaise !== null) {
    const expectedMarketValue = calculateGrossPaise(holdingQty, holdingValuation.marketPricePaise);
    if (holdingValuation.marketValuePaise !== expectedMarketValue) {
      throw new Error(
        `Reconciliation mismatch: marketValuePaise (${holdingValuation.marketValuePaise}) != expected (${expectedMarketValue})`
      );
    }
  }

  if (
    holdingValuation.unrealizedGainLossPaise !== null &&
    holdingValuation.marketValuePaise !== null &&
    holdingCost !== null
  ) {
    const expectedGainLoss = holdingValuation.marketValuePaise - holdingCost;
    if (holdingValuation.unrealizedGainLossPaise !== expectedGainLoss) {
      throw new Error(
        `Reconciliation mismatch: unrealizedGainLossPaise (${holdingValuation.unrealizedGainLossPaise}) != expected (${expectedGainLoss})`
      );
    }
  }

  return true;
}
