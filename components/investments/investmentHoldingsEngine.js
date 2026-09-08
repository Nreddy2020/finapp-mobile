/**
 * @file investmentHoldingsEngine.js
 * @description Pure derived holdings projection engine for FinLife Investments Module V1 (Phase 2).
 *
 * Invariants & Guarantees:
 * - Holdings are strictly derived read-only projections from active tax lots.
 * - Exact ₹0 cost-basis reconciliation to remaining active tax lots.
 * - Holding-level cost basis status: AVAILABLE, PARTIAL, UNAVAILABLE.
 * - Missing cost basis is strictly null / UNAVAILABLE, never converted to 0n.
 * - Average cost per unit uses deterministic half-up fixed-point micro-scale math.
 * - Zero UI, valuation, performance, or external integration dependencies.
 */

import {
  QUANTITY_SCALE,
  MAX_PAISE,
  MIN_PAISE,
  MAX_QUANTITY_MICROS,
  MIN_QUANTITY_MICROS,
  TAX_LOT_STATUS,
  COST_BASIS_STATUS,
  HOLDING_STATUS,
  validateBoundedPaise,
  validateNonNegativePaise,
  validateBoundedQuantityMicros
} from './investmentContracts.js';

/**
 * Projects derived holdings from an array of tax lots.
 *
 * @param {Object} params
 * @param {Array<Object>} params.lots
 * @param {Array<Object>} [params.accounts=[]]
 * @param {Array<Object>} [params.instruments=[]]
 * @returns {Array<Object>} Array of derived Holding objects
 */
export function projectHoldingsFromLots({
  lots,
  accounts = [],
  instruments = []
}) {
  if (!Array.isArray(lots)) {
    throw new TypeError('projectHoldingsFromLots: lots must be an array');
  }

  // Map accounts and instruments for fast metadata lookup
  const accountMap = new Map((accounts || []).map(a => [a.id, a]));
  const instrumentMap = new Map((instruments || []).map(i => [i.id, i]));

  // Group active lots by composite key: accountId::instrumentId
  const groups = new Map();

  for (const lot of lots) {
    // Only OPEN and PARTIALLY_DEPLETED lots contribute to current active holdings
    if (lot.status !== TAX_LOT_STATUS.OPEN && lot.status !== TAX_LOT_STATUS.PARTIALLY_DEPLETED) {
      continue;
    }

    const key = `${lot.accountId}::${lot.instrumentId}`;
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(lot);
  }

  const holdings = [];

  for (const [key, lotList] of groups.entries()) {
    const [accountId, instrumentId] = key.split('::');
    const acc = accountMap.get(accountId);
    const inst = instrumentMap.get(instrumentId);

    let totalQty = 0n;
    let totalBasis = 0n;
    let hasAvailable = false;
    let hasUnavailable = false;

    for (const lot of lotList) {
      validateBoundedQuantityMicros(lot.remainingQuantityMicros, 'lot.remainingQuantityMicros');
      totalQty += lot.remainingQuantityMicros;

      if (lot.costBasisStatus === COST_BASIS_STATUS.AVAILABLE && lot.remainingCostBasisPaise != null) {
        validateNonNegativePaise(lot.remainingCostBasisPaise, 'lot.remainingCostBasisPaise');
        totalBasis += lot.remainingCostBasisPaise;
        hasAvailable = true;
      } else {
        hasUnavailable = true;
      }
    }

    validateBoundedQuantityMicros(totalQty, 'holding.totalQuantityMicros');

    let costBasisStatus = COST_BASIS_STATUS.AVAILABLE;
    let finalCostBasisPaise = null;

    if (hasAvailable && !hasUnavailable) {
      costBasisStatus = COST_BASIS_STATUS.AVAILABLE;
      validateBoundedPaise(totalBasis, 'holding.totalCostBasisPaise');
      finalCostBasisPaise = totalBasis;
    } else if (hasAvailable && hasUnavailable) {
      costBasisStatus = COST_BASIS_STATUS.PARTIAL;
      finalCostBasisPaise = totalBasis; // Known partial portion, flagged PARTIAL
    } else {
      costBasisStatus = COST_BASIS_STATUS.UNAVAILABLE;
      finalCostBasisPaise = null; // Strictly null, never 0n
    }

    // Deterministic average cost per unit (scaled to micro-units)
    let averageCostPerUnitPaise = null;
    if (costBasisStatus === COST_BASIS_STATUS.AVAILABLE && totalQty > 0n && finalCostBasisPaise != null) {
      const numerator = (finalCostBasisPaise * QUANTITY_SCALE) + (totalQty / 2n);
      averageCostPerUnitPaise = numerator / totalQty;
      validateBoundedPaise(averageCostPerUnitPaise, 'averageCostPerUnitPaise');
    }

    const holdingId = `hld_${accountId}_${instrumentId}`;

    holdings.push({
      id: holdingId,
      accountId,
      instrumentId,
      accountName: acc?.name || accountId,
      instrumentName: inst?.name || instrumentId,
      instrumentType: inst?.instrumentType || null,
      totalQuantityMicros: totalQty,
      totalCostBasisPaise: finalCostBasisPaise,
      averageCostPerUnitPaise,
      costBasisStatus,
      status: totalQty > 0n ? HOLDING_STATUS.ACTIVE : HOLDING_STATUS.CLOSED,
      lotCount: lotList.length,
      asOfDate: new Date().toISOString()
    });
  }

  return holdings;
}

/**
 * Validates exact reconciliation between a holding and its constituent active tax lots.
 *
 * @param {Object} holding
 * @param {Array<Object>} lotsForHolding
 * @returns {boolean} True if perfectly reconciled
 * @throws {Error} If deviation detected
 */
export function reconcileHoldingWithLots(holding, lotsForHolding) {
  if (!holding || typeof holding !== 'object') {
    throw new TypeError('reconcileHoldingWithLots: holding must be an object');
  }
  if (!Array.isArray(lotsForHolding)) {
    throw new TypeError('reconcileHoldingWithLots: lotsForHolding must be an array');
  }

  const activeLots = lotsForHolding.filter(
    l => (l.status === TAX_LOT_STATUS.OPEN || l.status === TAX_LOT_STATUS.PARTIALLY_DEPLETED) &&
         l.accountId === holding.accountId &&
         l.instrumentId === holding.instrumentId
  );

  let expectedQty = 0n;
  let expectedBasis = 0n;
  let hasUnavailable = false;

  for (const lot of activeLots) {
    expectedQty += lot.remainingQuantityMicros;
    if (lot.costBasisStatus === COST_BASIS_STATUS.AVAILABLE && lot.remainingCostBasisPaise != null) {
      expectedBasis += lot.remainingCostBasisPaise;
    } else {
      hasUnavailable = true;
    }
  }

  if (expectedQty !== holding.totalQuantityMicros) {
    throw new Error(
      `Reconciliation failed for holding '${holding.id}': Total quantity mismatch. Expected ${expectedQty}, Found ${holding.totalQuantityMicros}`
    );
  }

  if (holding.costBasisStatus === COST_BASIS_STATUS.AVAILABLE) {
    if (hasUnavailable) {
      throw new Error(
        `Reconciliation failed for holding '${holding.id}': Holding claims AVAILABLE basis but contains UNAVAILABLE lots`
      );
    }
    if (expectedBasis !== holding.totalCostBasisPaise) {
      throw new Error(
        `Reconciliation failed for holding '${holding.id}': Cost basis mismatch. Expected ${expectedBasis}, Found ${holding.totalCostBasisPaise}`
      );
    }
  }

  return true;
}
