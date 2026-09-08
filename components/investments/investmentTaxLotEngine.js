/**
 * @file investmentTaxLotEngine.js
 * @description Authoritative tax-lot creation, FIFO / specific-lot depletion,
 * remainder-preserving cost-basis allocation, corporate actions, and causal reversal restoration.
 *
 * Invariants & Guarantees:
 * - JavaScript BigInt monetary values bounded to the signed 64-bit domain.
 * - Exact remainder-preserving lot depletion: depletedCost + remainingCost === originalCost.
 * - Zero-paise and zero-micro quantity leakage.
 * - Over-sale prevention: requested sale quantity > available quantity throws RangeError.
 * - Missing acquisition history produces COST_UNAVAILABLE, never 0n.
 * - Corporate actions preserve total economic cost basis (Delta Cost Basis === 0n).
 * - Causal reversal graph: purchase reversal rejected if lot has active downstream depletions.
 */

import {
  QUANTITY_SCALE,
  MAX_PAISE,
  MIN_PAISE,
  MAX_QUANTITY_MICROS,
  MIN_QUANTITY_MICROS,
  TAX_LOT_STATUS,
  DEPLETION_METHOD,
  COST_BASIS_STATUS,
  TAX_POLICY_VERSIONS,
  validateBoundedPaise,
  validateNonNegativePaise,
  validateBoundedQuantityMicros,
  validateTaxLotStatus,
  validateDepletionMethod
} from './investmentContracts.js';

/**
 * Calculates acquisition cost based on a configurable tax policy version.
 *
 * @param {Object} params
 * @param {bigint} params.purchaseAmountPaise
 * @param {bigint} [params.eligibleAcquisitionExpensesPaise=0n]
 * @param {bigint} [params.excludedTransactionTaxesPaise=0n]
 * @param {string} [params.taxPolicyVersion='IN_IT_ACT_V1']
 * @returns {{ accountingAcquisitionCostPaise: bigint, taxAcquisitionCostPaise: bigint, nonCapitalizedExpensePaise: bigint, taxPolicyVersion: string }}
 */
export function calculateAcquisitionCost({
  purchaseAmountPaise,
  eligibleAcquisitionExpensesPaise = 0n,
  excludedTransactionTaxesPaise = 0n,
  taxPolicyVersion = TAX_POLICY_VERSIONS.IN_IT_ACT_V1
}) {
  validateNonNegativePaise(purchaseAmountPaise, 'purchaseAmountPaise');
  validateNonNegativePaise(eligibleAcquisitionExpensesPaise, 'eligibleAcquisitionExpensesPaise');
  validateNonNegativePaise(excludedTransactionTaxesPaise, 'excludedTransactionTaxesPaise');

  // Overflow guards before addition
  if (purchaseAmountPaise > MAX_PAISE - eligibleAcquisitionExpensesPaise) {
    throw new RangeError(`Acquisition cost calculation overflows signed 64-bit bounds`);
  }
  const taxAcquisitionCostPaise = purchaseAmountPaise + eligibleAcquisitionExpensesPaise;
  validateBoundedPaise(taxAcquisitionCostPaise, 'taxAcquisitionCostPaise');

  if (taxAcquisitionCostPaise > MAX_PAISE - excludedTransactionTaxesPaise) {
    throw new RangeError(`Accounting acquisition cost calculation overflows signed 64-bit bounds`);
  }
  const accountingAcquisitionCostPaise = taxAcquisitionCostPaise + excludedTransactionTaxesPaise;
  validateBoundedPaise(accountingAcquisitionCostPaise, 'accountingAcquisitionCostPaise');

  return {
    accountingAcquisitionCostPaise,
    taxAcquisitionCostPaise,
    nonCapitalizedExpensePaise: excludedTransactionTaxesPaise,
    taxPolicyVersion
  };
}

/**
 * Creates an immutable acquisition tax lot.
 *
 * @param {Object} params
 * @returns {Object} TaxLot
 */
export function createTaxLot({
  id = null,
  transactionId,
  accountId,
  instrumentId,
  acquisitionDate,
  quantityMicros,
  costBasisPaise,
  taxPolicyVersion = TAX_POLICY_VERSIONS.IN_IT_ACT_V1,
  costBasisStatus = COST_BASIS_STATUS.AVAILABLE,
  metadata = {}
}) {
  if (!accountId || typeof accountId !== 'string' || accountId.trim().length === 0) {
    throw new TypeError('createTaxLot: accountId must be a non-empty string');
  }
  if (!instrumentId || typeof instrumentId !== 'string' || instrumentId.trim().length === 0) {
    throw new TypeError('createTaxLot: instrumentId must be a non-empty string');
  }
  if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length === 0) {
    throw new TypeError('createTaxLot: transactionId must be a non-empty string');
  }

  validateBoundedQuantityMicros(quantityMicros, 'quantityMicros');
  if (quantityMicros <= 0n) {
    throw new RangeError(`Tax lot quantity must be strictly positive, received: ${quantityMicros.toString()}`);
  }

  let validatedCostBasisPaise = null;
  if (costBasisStatus === COST_BASIS_STATUS.AVAILABLE) {
    if (costBasisPaise == null) {
      throw new TypeError('costBasisPaise is required when costBasisStatus is AVAILABLE');
    }
    validatedCostBasisPaise = validateNonNegativePaise(BigInt(costBasisPaise), 'costBasisPaise');
  } else {
    // UNAVAILABLE or PARTIAL: costBasisPaise is explicitly null, never 0n
    validatedCostBasisPaise = null;
  }

  const lotId = id || `lot_${transactionId}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  return {
    id: lotId,
    transactionId,
    accountId: accountId.trim(),
    instrumentId: instrumentId.trim(),
    acquisitionDate: acquisitionDate || new Date().toISOString().split('T')[0],
    initialQuantityMicros: quantityMicros,
    remainingQuantityMicros: quantityMicros,
    initialCostBasisPaise: validatedCostBasisPaise,
    remainingCostBasisPaise: validatedCostBasisPaise,
    costBasisStatus,
    status: TAX_LOT_STATUS.OPEN,
    taxPolicyVersion,
    metadata: { ...metadata },
    createdAt: new Date().toISOString()
  };
}

/**
 * Deterministic remainder-preserving lot depletion calculation.
 *
 * depletedBasis = ((depletedQty * remainingBasis) + (remainingQty / 2n)) / remainingQty
 * remainingBasis = originalRemainingBasis - depletedBasis
 *
 * @param {Object} lot
 * @param {bigint} depletedQtyMicros
 * @returns {{ depletedBasisPaise: bigint|null, newRemainingBasisPaise: bigint|null, newRemainingQtyMicros: bigint }}
 */
export function calculateLotDepletion(lot, depletedQtyMicros) {
  if (depletedQtyMicros <= 0n) {
    throw new RangeError(`depletedQtyMicros must be strictly positive, received: ${depletedQtyMicros}`);
  }
  if (depletedQtyMicros > lot.remainingQuantityMicros) {
    throw new RangeError(
      `depletedQtyMicros (${depletedQtyMicros}) exceeds lot remaining quantity (${lot.remainingQuantityMicros})`
    );
  }

  const newRemainingQtyMicros = lot.remainingQuantityMicros - depletedQtyMicros;

  if (lot.costBasisStatus !== COST_BASIS_STATUS.AVAILABLE || lot.remainingCostBasisPaise == null) {
    return {
      depletedBasisPaise: null,
      newRemainingBasisPaise: null,
      newRemainingQtyMicros
    };
  }

  // Remainder-preserving basis allocation:
  // If lot is fully closed, remaining basis is strictly 0n to prevent fractional leakage
  if (newRemainingQtyMicros === 0n) {
    return {
      depletedBasisPaise: lot.remainingCostBasisPaise,
      newRemainingBasisPaise: 0n,
      newRemainingQtyMicros: 0n
    };
  }

  // Guard against intermediate multiplication overflow
  const maxSafeProduct = MAX_PAISE * QUANTITY_SCALE;
  const product = depletedQtyMicros * lot.remainingCostBasisPaise;
  if (product / depletedQtyMicros !== lot.remainingCostBasisPaise) {
    throw new RangeError('Multiplication overflow during lot cost basis depletion');
  }

  // Half-up rounding for depleted portion
  const numerator = product + (lot.remainingQuantityMicros / 2n);
  const depletedBasisPaise = numerator / lot.remainingQuantityMicros;
  validateBoundedPaise(depletedBasisPaise, 'depletedBasisPaise');

  // Remainder-preserving subtraction
  const newRemainingBasisPaise = lot.remainingCostBasisPaise - depletedBasisPaise;
  validateNonNegativePaise(newRemainingBasisPaise, 'newRemainingBasisPaise');

  return {
    depletedBasisPaise,
    newRemainingBasisPaise,
    newRemainingQtyMicros
  };
}

/**
 * Depletes lots using deterministic FIFO strategy.
 *
 * @param {Object} params
 * @param {Array<Object>} params.availableLots
 * @param {bigint} params.sellQuantityMicros
 * @param {bigint} params.sellProceedsPaise
 * @param {string} params.sellTransactionId
 * @returns {{ updatedLots: Array<Object>, depletionRecords: Array<Object>, totalDepletedCostBasisPaise: bigint|null, realizedGainLossPaise: bigint|null }}
 */
export function depleteLotsFIFO({
  availableLots,
  sellQuantityMicros,
  sellProceedsPaise = 0n,
  sellTransactionId
}) {
  validateBoundedQuantityMicros(sellQuantityMicros, 'sellQuantityMicros');
  if (sellQuantityMicros <= 0n) {
    throw new RangeError(`sellQuantityMicros must be strictly positive, received: ${sellQuantityMicros.toString()}`);
  }

  // Filter active lots: OPEN or PARTIALLY_DEPLETED
  const activeLots = availableLots.filter(
    l => l.status === TAX_LOT_STATUS.OPEN || l.status === TAX_LOT_STATUS.PARTIALLY_DEPLETED
  );

  const totalAvailableQty = activeLots.reduce((acc, l) => acc + l.remainingQuantityMicros, 0n);
  if (sellQuantityMicros > totalAvailableQty) {
    throw new RangeError(
      `Requested sale quantity (${sellQuantityMicros.toString()}) exceeds available holding quantity (${totalAvailableQty.toString()})`
    );
  }

  // Deterministic FIFO sorting: acquisitionDate ASC, createdAt ASC, id ASC
  const sortedLots = [...activeLots].sort((a, b) => {
    if (a.acquisitionDate !== b.acquisitionDate) {
      return a.acquisitionDate.localeCompare(b.acquisitionDate);
    }
    if (a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }
    return a.id.localeCompare(b.id);
  });

  let remainingToSell = sellQuantityMicros;
  let sequence = 0;
  const depletionRecords = [];
  const updatedLotsMap = new Map();
  let totalDepletedCostBasisPaise = 0n;
  let hasUnavailableBasis = false;

  for (const lot of sortedLots) {
    if (remainingToSell <= 0n) break;

    const qtyFromThisLot = lot.remainingQuantityMicros <= remainingToSell
      ? lot.remainingQuantityMicros
      : remainingToSell;

    const {
      depletedBasisPaise,
      newRemainingBasisPaise,
      newRemainingQtyMicros
    } = calculateLotDepletion(lot, qtyFromThisLot);

    if (depletedBasisPaise === null) {
      hasUnavailableBasis = true;
    } else {
      totalDepletedCostBasisPaise += depletedBasisPaise;
    }

    const updatedStatus = newRemainingQtyMicros === 0n
      ? TAX_LOT_STATUS.DEPLETED
      : TAX_LOT_STATUS.PARTIALLY_DEPLETED;

    const updatedLot = {
      ...lot,
      remainingQuantityMicros: newRemainingQtyMicros,
      remainingCostBasisPaise: newRemainingBasisPaise,
      status: updatedStatus,
      updatedAt: new Date().toISOString()
    };

    updatedLotsMap.set(lot.id, updatedLot);

    depletionRecords.push({
      depletionId: `dep_${sellTransactionId}_${lot.id}_${sequence}`,
      sellTransactionId,
      sourceLotId: lot.id,
      depletedQuantityMicros: qtyFromThisLot,
      depletedCostBasisPaise: depletedBasisPaise,
      sequence,
      previousLotRemainingQty: lot.remainingQuantityMicros,
      previousLotRemainingBasis: lot.remainingCostBasisPaise,
      timestamp: new Date().toISOString()
    });

    remainingToSell -= qtyFromThisLot;
    sequence++;
  }

  // Produce updated lots list preserving original array order
  const updatedLots = availableLots.map(l => updatedLotsMap.get(l.id) || l);

  let realizedGainLossPaise = null;
  if (!hasUnavailableBasis) {
    validateBoundedPaise(totalDepletedCostBasisPaise, 'totalDepletedCostBasisPaise');
    realizedGainLossPaise = sellProceedsPaise - totalDepletedCostBasisPaise;
    validateBoundedPaise(realizedGainLossPaise, 'realizedGainLossPaise');
  }

  return {
    updatedLots,
    depletionRecords,
    totalDepletedQuantityMicros: sellQuantityMicros,
    totalDepletedCostBasisPaise: hasUnavailableBasis ? null : totalDepletedCostBasisPaise,
    realizedGainLossPaise
  };
}

/**
 * Depletes explicitly designated specific lots.
 *
 * @param {Object} params
 * @param {Array<Object>} params.availableLots
 * @param {Array<{ lotId: string, quantityMicros: bigint }>} params.specificAllocations
 * @param {bigint} params.sellProceedsPaise
 * @param {string} params.sellTransactionId
 * @param {string} params.accountId
 * @param {string} params.instrumentId
 * @returns {{ updatedLots: Array<Object>, depletionRecords: Array<Object>, totalDepletedCostBasisPaise: bigint|null, realizedGainLossPaise: bigint|null }}
 */
export function depleteSpecificLots({
  availableLots,
  specificAllocations,
  sellProceedsPaise = 0n,
  sellTransactionId,
  accountId,
  instrumentId
}) {
  if (!Array.isArray(specificAllocations) || specificAllocations.length === 0) {
    throw new TypeError('depleteSpecificLots: specificAllocations must be a non-empty array');
  }

  let totalRequestedQty = 0n;
  const updatedLotsMap = new Map();
  const depletionRecords = [];
  let totalDepletedCostBasisPaise = 0n;
  let hasUnavailableBasis = false;
  let sequence = 0;

  for (const alloc of specificAllocations) {
    const lot = availableLots.find(l => l.id === alloc.lotId);
    if (!lot) {
      throw new Error(`Specific lot '${alloc.lotId}' does not exist in available lots`);
    }
    if (lot.accountId !== accountId) {
      throw new Error(`Specific lot '${alloc.lotId}' belongs to account '${lot.accountId}', not '${accountId}'`);
    }
    if (lot.instrumentId !== instrumentId) {
      throw new Error(`Specific lot '${alloc.lotId}' is for instrument '${lot.instrumentId}', not '${instrumentId}'`);
    }
    if (lot.status === TAX_LOT_STATUS.DEPLETED || lot.status === TAX_LOT_STATUS.REVERSED) {
      throw new Error(`Specific lot '${alloc.lotId}' is not active, status is ${lot.status}`);
    }

    const qty = validateBoundedQuantityMicros(BigInt(alloc.quantityMicros), 'specificAllocation.quantityMicros');
    if (qty <= 0n) {
      throw new RangeError(`Specific allocation quantity must be positive: ${qty.toString()}`);
    }
    if (qty > lot.remainingQuantityMicros) {
      throw new RangeError(
        `Specific allocation quantity (${qty.toString()}) exceeds lot remaining quantity (${lot.remainingQuantityMicros.toString()})`
      );
    }

    totalRequestedQty += qty;

    const {
      depletedBasisPaise,
      newRemainingBasisPaise,
      newRemainingQtyMicros
    } = calculateLotDepletion(lot, qty);

    if (depletedBasisPaise === null) {
      hasUnavailableBasis = true;
    } else {
      totalDepletedCostBasisPaise += depletedBasisPaise;
    }

    const updatedStatus = newRemainingQtyMicros === 0n
      ? TAX_LOT_STATUS.DEPLETED
      : TAX_LOT_STATUS.PARTIALLY_DEPLETED;

    const updatedLot = {
      ...lot,
      remainingQuantityMicros: newRemainingQtyMicros,
      remainingCostBasisPaise: newRemainingBasisPaise,
      status: updatedStatus,
      updatedAt: new Date().toISOString()
    };

    updatedLotsMap.set(lot.id, updatedLot);

    depletionRecords.push({
      depletionId: `dep_${sellTransactionId}_${lot.id}_${sequence}`,
      sellTransactionId,
      sourceLotId: lot.id,
      depletedQuantityMicros: qty,
      depletedCostBasisPaise: depletedBasisPaise,
      sequence,
      previousLotRemainingQty: lot.remainingQuantityMicros,
      previousLotRemainingBasis: lot.remainingCostBasisPaise,
      timestamp: new Date().toISOString()
    });

    sequence++;
  }

  const updatedLots = availableLots.map(l => updatedLotsMap.get(l.id) || l);

  let realizedGainLossPaise = null;
  if (!hasUnavailableBasis) {
    validateBoundedPaise(totalDepletedCostBasisPaise, 'totalDepletedCostBasisPaise');
    realizedGainLossPaise = sellProceedsPaise - totalDepletedCostBasisPaise;
    validateBoundedPaise(realizedGainLossPaise, 'realizedGainLossPaise');
  }

  return {
    updatedLots,
    depletionRecords,
    totalDepletedQuantityMicros: totalRequestedQty,
    totalDepletedCostBasisPaise: hasUnavailableBasis ? null : totalDepletedCostBasisPaise,
    realizedGainLossPaise
  };
}

/**
 * Applies bonus shares corporate action to active lots.
 * Under Section 55(2)(aa) of the Indian Income Tax Act:
 * - Original lots remain untouched (quantity and cost basis unchanged).
 * - A new bonus lot is created with quantity = bonusQuantity, costBasis = 0n.
 *
 * @param {Object} params
 * @param {Array<Object>} params.activeLots
 * @param {bigint} params.bonusQuantityMicros
 * @param {string} params.allotmentDate
 * @param {string} params.corporateActionTxId
 * @param {string} params.accountId
 * @param {string} params.instrumentId
 * @returns {{ newBonusLot: Object, allLots: Array<Object> }}
 */
export function applyBonusToLots({
  activeLots,
  bonusQuantityMicros,
  allotmentDate,
  corporateActionTxId,
  accountId,
  instrumentId
}) {
  validateBoundedQuantityMicros(bonusQuantityMicros, 'bonusQuantityMicros');
  if (bonusQuantityMicros <= 0n) {
    throw new RangeError(`Bonus quantity must be strictly positive, received: ${bonusQuantityMicros.toString()}`);
  }

  const bonusLot = createTaxLot({
    id: `lot_bonus_${corporateActionTxId}_${Date.now()}`,
    transactionId: corporateActionTxId,
    accountId,
    instrumentId,
    acquisitionDate: allotmentDate,
    quantityMicros: bonusQuantityMicros,
    costBasisPaise: 0n, // Zero cost per Indian Income Tax Act Sec 55(2)(aa)
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE,
    metadata: {
      corporateAction: 'BONUS',
      corporateActionTxId
    }
  });

  return {
    newBonusLot: bonusLot,
    allLots: [...activeLots, bonusLot]
  };
}

/**
 * Applies stock split corporate action to active lots.
 * - Multiplies lot quantities by split ratio (numerator / denominator).
 * - Total cost basis of each lot remains strictly unchanged (Delta Cost Basis === 0n).
 * - Enforces clean micro-unit division with zero sub-micro fractional leakage.
 *
 * @param {Object} params
 * @param {Array<Object>} params.activeLots
 * @param {number|bigint} params.numerator
 * @param {number|bigint} params.denominator
 * @param {string} params.corporateActionTxId
 * @returns {{ updatedLots: Array<Object> }}
 */
export function applyStockSplitToLots({
  activeLots,
  numerator,
  denominator,
  corporateActionTxId
}) {
  const num = BigInt(numerator);
  const den = BigInt(denominator);

  if (num <= 0n || den <= 0n) {
    throw new RangeError(`Split ratio numerator and denominator must be positive integers: ${num}/${den}`);
  }

  const updatedLots = activeLots.map(lot => {
    // Only apply to open / partially depleted lots
    if (lot.status !== TAX_LOT_STATUS.OPEN && lot.status !== TAX_LOT_STATUS.PARTIALLY_DEPLETED) {
      return lot;
    }

    const initialProduct = lot.initialQuantityMicros * num;
    if (initialProduct % den !== 0n) {
      throw new RangeError(
        `Split produces fractional micro-units on lot '${lot.id}': ${lot.initialQuantityMicros} * ${num} / ${den}`
      );
    }
    const remainingProduct = lot.remainingQuantityMicros * num;
    if (remainingProduct % den !== 0n) {
      throw new RangeError(
        `Split produces fractional micro-units on remaining lot '${lot.id}': ${lot.remainingQuantityMicros} * ${num} / ${den}`
      );
    }

    const newInitialQty = initialProduct / den;
    const newRemainingQty = remainingProduct / den;

    validateBoundedQuantityMicros(newInitialQty, 'newInitialQty');
    validateBoundedQuantityMicros(newRemainingQty, 'newRemainingQty');

    return {
      ...lot,
      initialQuantityMicros: newInitialQty,
      remainingQuantityMicros: newRemainingQty,
      // Total cost basis remains strictly unchanged!
      initialCostBasisPaise: lot.initialCostBasisPaise,
      remainingCostBasisPaise: lot.remainingCostBasisPaise,
      metadata: {
        ...lot.metadata,
        lastSplit: {
          corporateActionTxId,
          ratio: `${num}:${den}`,
          timestamp: new Date().toISOString()
        }
      },
      updatedAt: new Date().toISOString()
    };
  });

  return { updatedLots };
}

/**
 * Explicitly rejects MERGER corporate actions in V1 execution path.
 */
export function rejectMergerCorporateAction() {
  throw new Error('MERGER corporate action is not supported in V1 execution path');
}

/**
 * Restores depleted lots when a sale transaction is reversed.
 * Restores in reverse sequence order.
 *
 * @param {Object} params
 * @param {Array<Object>} params.currentLots
 * @param {Array<Object>} params.depletionsForSale
 * @returns {Array<Object>} restoredLots
 */
export function restoreLotsFromSaleReversal({ currentLots, depletionsForSale }) {
  if (!Array.isArray(depletionsForSale) || depletionsForSale.length === 0) {
    return currentLots;
  }

  // Sort in reverse sequence order
  const sortedDepletions = [...depletionsForSale].sort((a, b) => b.sequence - a.sequence);
  const lotsMap = new Map(currentLots.map(l => [l.id, { ...l }]));

  for (const dep of sortedDepletions) {
    const lot = lotsMap.get(dep.sourceLotId);
    if (!lot) {
      throw new Error(`Cannot restore depletion: source lot '${dep.sourceLotId}' not found`);
    }

    const restoredQty = lot.remainingQuantityMicros + BigInt(dep.depletedQuantityMicros);
    validateBoundedQuantityMicros(restoredQty, 'restoredQty');
    if (restoredQty > lot.initialQuantityMicros) {
      throw new RangeError(`Restoration would exceed lot initial quantity on '${lot.id}'`);
    }

    let restoredBasis = lot.remainingCostBasisPaise;
    if (lot.costBasisStatus === COST_BASIS_STATUS.AVAILABLE && dep.depletedCostBasisPaise != null) {
      restoredBasis = lot.remainingCostBasisPaise + BigInt(dep.depletedCostBasisPaise);
      validateBoundedPaise(restoredBasis, 'restoredBasis');
      if (restoredBasis > lot.initialCostBasisPaise) {
        throw new RangeError(`Restoration would exceed lot initial cost basis on '${lot.id}'`);
      }
    }

    lot.remainingQuantityMicros = restoredQty;
    lot.remainingCostBasisPaise = restoredBasis;
    lot.status = restoredQty === lot.initialQuantityMicros
      ? TAX_LOT_STATUS.OPEN
      : TAX_LOT_STATUS.PARTIALLY_DEPLETED;
    lot.updatedAt = new Date().toISOString();
  }

  return currentLots.map(l => lotsMap.get(l.id) || l);
}

/**
 * Asserts whether a purchase tax lot can be reversed.
 * Causal lineage guard: Throws if lot has active downstream depletions.
 *
 * @param {Object} lot
 * @param {Array<Object>} allDepletions
 * @throws {Error} If lot has active downstream depletions
 */
export function assertCanReversePurchaseLot(lot, allDepletions) {
  if (!lot) {
    throw new TypeError('assertCanReversePurchaseLot: lot is required');
  }

  if (lot.remainingQuantityMicros !== lot.initialQuantityMicros) {
    throw new Error(
      `Cannot reverse purchase transaction '${lot.transactionId}': Tax lot '${lot.id}' has been partially or fully depleted. Downstream sales must be reversed first.`
    );
  }

  const activeDepletions = allDepletions.filter(d => d.sourceLotId === lot.id);
  if (activeDepletions.length > 0) {
    throw new Error(
      `Cannot reverse purchase transaction '${lot.transactionId}': Tax lot '${lot.id}' has active depletions. Downstream sales must be reversed first.`
    );
  }

  return true;
}
