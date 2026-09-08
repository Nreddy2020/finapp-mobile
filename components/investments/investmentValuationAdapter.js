/**
 * FinLife Investments Module V1 - Phase 3: Valuation Presentation Adapter
 *
 * PURE PRESENTATION ADAPTER:
 * Strictly for display formatting, label selection, status badge mapping,
 * and Indian numbering presentation.
 *
 * ARCHITECTURAL BOUNDARY:
 * Contains ZERO financial, math, valuation, XIRR, CAGR, TWR, or price freshness calculations.
 */

import {
  PRICE_STATUS,
  COST_BASIS_STATUS,
  XIRR_STATUS,
  PERFORMANCE_STATUS
} from './investmentContracts.js';

/**
 * Formats BigInt paise into Indian currency notation (e.g. ₹6,60,00,000.00).
 */
export function formatPaiseToINR(paise, options = {}) {
  if (paise === null || paise === undefined) {
    return options.fallback || '₹ --';
  }

  const isNegative = paise < 0n;
  const absPaise = isNegative ? -paise : paise;
  const rupees = absPaise / 100n;
  const paiseRem = absPaise % 100n;

  // Format integer rupees with Indian numbering (last 3 digits, then groups of 2)
  const rupeeStr = rupees.toString();
  let formattedRupees = '';

  if (rupeeStr.length <= 3) {
    formattedRupees = rupeeStr;
  } else {
    const lastThree = rupeeStr.substring(rupeeStr.length - 3);
    const remaining = rupeeStr.substring(0, rupeeStr.length - 3);
    const groups = [];
    for (let i = remaining.length; i > 0; i -= 2) {
      const start = Math.max(0, i - 2);
      groups.unshift(remaining.substring(start, i));
    }
    formattedRupees = `${groups.join(',')},${lastThree}`;
  }

  const showDecimals = options.showDecimals !== false;
  const decimalStr = showDecimals ? `.${paiseRem.toString().padStart(2, '0')}` : '';
  const prefix = isNegative ? '-₹' : '₹';

  return `${prefix}${formattedRupees}${decimalStr}`;
}

/**
 * Formats BigInt quantity micros into display string.
 */
export function formatQuantityMicros(micros, options = {}) {
  if (micros === null || micros === undefined) {
    return options.fallback || '--';
  }

  const isNegative = micros < 0n;
  const absMicros = isNegative ? -micros : micros;
  const whole = absMicros / 1000000n;
  const fraction = absMicros % 1000000n;

  let fracStr = fraction.toString().padStart(6, '0');
  if (options.trimTrailingZeros !== false) {
    fracStr = fracStr.replace(/0+$/, '');
  }

  const prefix = isNegative ? '-' : '';
  if (fracStr.length === 0) {
    return `${prefix}${whole.toString()}`;
  }
  return `${prefix}${whole.toString()}.${fracStr}`;
}

/**
 * Formats BigInt basis points (100 BPS = 1.00%) with positive/negative indicators.
 */
export function formatBasisPoints(bps, options = {}) {
  if (bps === null || bps === undefined) {
    return options.fallback || '--';
  }

  const isNegative = bps < 0n;
  const absBps = isNegative ? -bps : bps;
  const whole = absBps / 100n;
  const fraction = absBps % 100n;

  const fracStr = fraction.toString().padStart(2, '0');
  const sign = isNegative ? '-' : (options.showPlusSign !== false ? '+' : '');

  return `${sign}${whole.toString()}.${fracStr}%`;
}

/**
 * Formats decimal annual rate (e.g. 0.1542 -> +15.42%).
 */
export function formatPercentage(rate, options = {}) {
  if (rate === null || rate === undefined || isNaN(rate)) {
    return options.fallback || '--';
  }

  const pct = rate * 100.0;
  const sign = pct > 0 ? (options.showPlusSign !== false ? '+' : '') : '';
  const decimals = options.decimals !== undefined ? options.decimals : 2;

  return `${sign}${pct.toFixed(decimals)}%`;
}

/**
 * Maps price status and staleness to display badges.
 */
export function getPriceStatusBadge(priceStatus, isStale = false) {
  if (isStale || priceStatus === PRICE_STATUS.STALE) {
    return {
      label: 'STALE PRICE',
      variant: 'warning',
      color: '#F59E0B',
      description: 'Quote exceeds freshness policy window'
    };
  }

  switch (priceStatus) {
    case PRICE_STATUS.AVAILABLE:
      return {
        label: 'LIVE / RECENT',
        variant: 'success',
        color: '#10B981',
        description: 'Fresh market quote'
      };
    case PRICE_STATUS.UNAVAILABLE:
      return {
        label: 'PRICE UNAVAILABLE',
        variant: 'neutral',
        color: '#6B7280',
        description: 'No market quote on record'
      };
    case PRICE_STATUS.INVALID:
      return {
        label: 'INVALID PRICE',
        variant: 'danger',
        color: '#EF4444',
        description: 'Malformed or corrupt market quote'
      };
    default:
      return {
        label: 'UNKNOWN',
        variant: 'neutral',
        color: '#6B7280',
        description: 'Unknown price state'
      };
  }
}

/**
 * Adapts holding valuation DTO for presentation in UI.
 */
export function adaptHoldingValuationForDisplay(holdingValuation) {
  if (!holdingValuation) return null;

  const badge = getPriceStatusBadge(holdingValuation.priceStatus, holdingValuation.isStale);

  return {
    holdingId: holdingValuation.holdingId,
    accountId: holdingValuation.accountId,
    instrumentId: holdingValuation.instrumentId,
    quantityDisplay: formatQuantityMicros(holdingValuation.quantityMicros),
    costBasisDisplay: formatPaiseToINR(holdingValuation.costBasisPaise),
    marketPriceDisplay: formatPaiseToINR(holdingValuation.marketPricePaise),
    marketValueDisplay: formatPaiseToINR(holdingValuation.marketValuePaise),
    unrealizedGainLossDisplay: formatPaiseToINR(holdingValuation.unrealizedGainLossPaise),
    unrealizedGainLossBpsDisplay: formatBasisPoints(holdingValuation.unrealizedGainLossBps),
    isGain: holdingValuation.unrealizedGainLossPaise !== null ? holdingValuation.unrealizedGainLossPaise >= 0n : null,
    statusBadge: badge,
    priceSource: holdingValuation.priceSource || 'N/A',
    asOfDate: holdingValuation.asOfDate,
    raw: holdingValuation
  };
}

/**
 * Adapts portfolio valuation DTO for presentation in UI.
 */
export function adaptPortfolioValuationForDisplay(portfolioValuation) {
  if (!portfolioValuation) return null;

  return {
    asOfDate: portfolioValuation.asOfDate,
    holdingsCount: portfolioValuation.holdingsCount,
    evaluatedHoldingsCount: portfolioValuation.evaluatedHoldingsCount,
    totalCostBasisDisplay: formatPaiseToINR(portfolioValuation.totalCostBasisPaise),
    totalMarketValueDisplay: formatPaiseToINR(portfolioValuation.totalMarketValuePaise),
    totalUnrealizedGainLossDisplay: formatPaiseToINR(portfolioValuation.totalUnrealizedGainLossPaise),
    aggregateUnrealizedBpsDisplay: formatBasisPoints(portfolioValuation.aggregateUnrealizedBps),
    isOverallGain: portfolioValuation.totalUnrealizedGainLossPaise !== null ? portfolioValuation.totalUnrealizedGainLossPaise >= 0n : null,
    valuationStatus: portfolioValuation.valuationStatus,
    costBasisStatus: portfolioValuation.costBasisStatus,
    isStale: portfolioValuation.isStale,
    holdingsDisplay: (portfolioValuation.holdings || []).map(adaptHoldingValuationForDisplay),
    raw: portfolioValuation
  };
}
