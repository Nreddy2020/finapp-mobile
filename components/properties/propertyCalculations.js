/**
 * @file propertyCalculations.js
 * @description Pure, deterministic mathematical functions for the FinLife Properties Module.
 *
 * Implements:
 * 1. Acquisition & Total Cost Basis calculation
 * 2. Unrealized gain/loss and appreciation rate in BPS
 * 3. Net Property Equity preserving UNAVAILABLE linked-loan state
 * 4. Rental economics (Gross rent, Net rent, Gross yield, Net yield, Margin)
 * 5. Fixed-point area conversions (sq ft <-> micro-units)
 */

import {
  MAX_PROPERTY_PAISE,
  MIN_PROPERTY_PAISE,
  validateNonNegativePropertyPaise,
  validateSignedPropertyPaise,
  validateMarketValue,
  AREA_SCALE_FACTOR,
  validateAreaMicros,
  floorDiv
} from './propertyContracts.js';

/**
 * Calculates the Total Cost Basis for a property acquisition.
 *
 * Total Cost Basis = Purchase Price + Registration + Stamp Duty + Brokerage + Legal + Capitalized Improvements
 * Operating expenses (routine maintenance, taxes, repairs) are strictly excluded.
 *
 * @param {Object} acquisition
 * @param {bigint} acquisition.purchasePricePaise
 * @param {bigint} [acquisition.registrationChargesPaise=0n]
 * @param {bigint} [acquisition.stampDutyPaise=0n]
 * @param {bigint} [acquisition.brokeragePaise=0n]
 * @param {bigint} [acquisition.legalFeesPaise=0n]
 * @param {bigint} [acquisition.capitalizedImprovementsPaise=0n]
 * @returns {bigint} Total cost basis in paise
 */
export function calculateTotalCostBasis(acquisition) {
  if (!acquisition || typeof acquisition !== 'object') {
    throw new TypeError('calculateTotalCostBasis: acquisition must be an object');
  }

  const purchasePrice = validateNonNegativePropertyPaise(
    acquisition.purchasePricePaise ?? 0n,
    'purchasePricePaise'
  );
  const registration = validateNonNegativePropertyPaise(
    acquisition.registrationChargesPaise ?? 0n,
    'registrationChargesPaise'
  );
  const stampDuty = validateNonNegativePropertyPaise(
    acquisition.stampDutyPaise ?? 0n,
    'stampDutyPaise'
  );
  const brokerage = validateNonNegativePropertyPaise(
    acquisition.brokeragePaise ?? 0n,
    'brokeragePaise'
  );
  const legalFees = validateNonNegativePropertyPaise(
    acquisition.legalFeesPaise ?? 0n,
    'legalFeesPaise'
  );
  const improvements = validateNonNegativePropertyPaise(
    acquisition.capitalizedImprovementsPaise ?? 0n,
    'capitalizedImprovementsPaise'
  );

  const total = purchasePrice + registration + stampDuty + brokerage + legalFees + improvements;
  return validateNonNegativePropertyPaise(total, 'totalCostBasisPaise');
}

/**
 * Calculates unrealized gain or loss in paise.
 * Result can be negative if market value < cost basis.
 *
 * @param {bigint} currentMarketValuePaise
 * @param {bigint} totalCostBasisPaise
 * @returns {bigint} Signed gain or loss in paise
 */
export function calculateUnrealizedGainLoss(currentMarketValuePaise, totalCostBasisPaise) {
  validateMarketValue(currentMarketValuePaise);
  validateNonNegativePropertyPaise(totalCostBasisPaise, 'totalCostBasisPaise');

  const diff = currentMarketValuePaise - totalCostBasisPaise;
  return validateSignedPropertyPaise(diff, 'unrealizedGainLossPaise');
}

/**
 * Calculates appreciation rate in basis points (100 BPS = 1.00%).
 *
 * @param {bigint} gainLossPaise
 * @param {bigint} totalCostBasisPaise
 * @returns {bigint} Signed appreciation rate in BPS
 */
export function calculateAppreciationRateBps(gainLossPaise, totalCostBasisPaise) {
  validateSignedPropertyPaise(gainLossPaise, 'gainLossPaise');
  validateNonNegativePropertyPaise(totalCostBasisPaise, 'totalCostBasisPaise');

  if (totalCostBasisPaise === 0n) {
    return 0n;
  }

  return floorDiv(gainLossPaise * 10_000n, totalCostBasisPaise);
}

/**
 * Calculates Net Property Equity with strict linked loan handling.
 *
 * Distinguishes:
 * 1. No linked loan -> status: 'AVAILABLE', outstanding: 0n, equity = market value
 * 2. Loan linked and balance provided -> status: 'AVAILABLE', equity = market value - debt (supports signed negative equity)
 * 3. Loan linked but balance missing/unavailable -> status: 'UNAVAILABLE', debt NEVER defaulted to 0
 *
 * @param {Object} params
 * @param {bigint} params.marketValuePaise
 * @param {boolean} [params.isLoanLinked=false]
 * @param {string|null} [params.linkedLoanId=null]
 * @param {bigint|null|undefined} [params.outstandingLoanPaise=null]
 * @returns {Object}
 */
export function calculateNetPropertyEquity(params) {
  if (!params || typeof params !== 'object') {
    throw new TypeError('calculateNetPropertyEquity: params must be an object');
  }

  const marketValue = validateMarketValue(params.marketValuePaise);
  const isLinked = Boolean(params.isLoanLinked || params.linkedLoanId);

  if (!isLinked) {
    return {
      status: 'AVAILABLE',
      marketValuePaise: marketValue,
      outstandingLoanPaise: 0n,
      netEquityPaise: marketValue
    };
  }

  // If loan is marked as linked, we require a valid BigInt balance
  if (params.outstandingLoanPaise === undefined || params.outstandingLoanPaise === null) {
    return {
      status: 'UNAVAILABLE',
      reason: 'LINKED_LOAN_BALANCE_UNAVAILABLE',
      marketValuePaise: marketValue
    };
  }

  const outstandingLoan = validateNonNegativePropertyPaise(
    params.outstandingLoanPaise,
    'outstandingLoanPaise'
  );

  const netEquity = validateSignedPropertyPaise(
    marketValue - outstandingLoan,
    'netEquityPaise'
  );

  return {
    status: 'AVAILABLE',
    marketValuePaise: marketValue,
    outstandingLoanPaise: outstandingLoan,
    netEquityPaise: netEquity
  };
}

/**
 * Calculates net rental income from gross rent and operating expenses.
 * Routine maintenance, property tax, and repairs are deductible from rent.
 *
 * @param {bigint} grossRentalIncomePaise
 * @param {bigint} operatingExpensesPaise
 * @returns {bigint} Signed net rental income in paise
 */
export function calculateNetRentalIncome(grossRentalIncomePaise, operatingExpensesPaise) {
  validateNonNegativePropertyPaise(grossRentalIncomePaise, 'grossRentalIncomePaise');
  validateNonNegativePropertyPaise(operatingExpensesPaise, 'operatingExpensesPaise');

  const netRent = grossRentalIncomePaise - operatingExpensesPaise;
  return validateSignedPropertyPaise(netRent, 'netRentalIncomePaise');
}

/**
 * Calculates Gross Rental Yield in Basis Points (100 BPS = 1.00%).
 *
 * Gross Yield = (Annual Gross Rent * 10,000) / Current Market Value
 *
 * @param {bigint} annualGrossRentPaise
 * @param {bigint} currentMarketValuePaise
 * @returns {bigint} Gross rental yield in BPS
 */
export function calculateGrossRentalYieldBps(annualGrossRentPaise, currentMarketValuePaise) {
  validateNonNegativePropertyPaise(annualGrossRentPaise, 'annualGrossRentPaise');
  validateMarketValue(currentMarketValuePaise);

  if (currentMarketValuePaise === 0n) {
    return 0n;
  }

  return floorDiv(annualGrossRentPaise * 10_000n, currentMarketValuePaise);
}

/**
 * Calculates Net Rental Yield in Basis Points.
 * Uses true mathematical floor division (floorDiv) supporting signed negative yields.
 *
 * Net Yield = floor(Annual Net Rent * 10,000 / Current Market Value)
 *
 * @param {bigint} annualNetRentPaise Signed BigInt
 * @param {bigint} currentMarketValuePaise
 * @returns {bigint} Signed Net rental yield in BPS
 */
export function calculateNetRentalYieldBps(annualNetRentPaise, currentMarketValuePaise) {
  validateSignedPropertyPaise(annualNetRentPaise, 'annualNetRentPaise');
  validateMarketValue(currentMarketValuePaise);

  if (currentMarketValuePaise === 0n) {
    return 0n;
  }

  return floorDiv(annualNetRentPaise * 10_000n, currentMarketValuePaise);
}

/**
 * Calculates Rental Margin in Basis Points.
 * Uses true mathematical floor division (floorDiv).
 *
 * Margin = floor(Net Rental Income * 10,000 / Gross Rental Income)
 *
 * @param {bigint} netRentalIncomePaise Signed BigInt
 * @param {bigint} grossRentalIncomePaise Non-negative BigInt
 * @returns {bigint} Signed margin in BPS
 */
export function calculateRentalMarginBps(netRentalIncomePaise, grossRentalIncomePaise) {
  validateSignedPropertyPaise(netRentalIncomePaise, 'netRentalIncomePaise');
  validateNonNegativePropertyPaise(grossRentalIncomePaise, 'grossRentalIncomePaise');

  if (grossRentalIncomePaise === 0n) {
    return 0n;
  }

  return floorDiv(netRentalIncomePaise * 10_000n, grossRentalIncomePaise);
}

/**
 * Converts square feet (floating/integer number) to fixed-point micro-units.
 *
 * @param {number|string|bigint} sqFt
 * @returns {bigint} Micro square feet
 */
export function areaSqFtToMicros(sqFt) {
  if (typeof sqFt === 'bigint') {
    return validateAreaMicros(sqFt * AREA_SCALE_FACTOR);
  }
  const parsed = Number(sqFt);
  if (isNaN(parsed) || !isFinite(parsed) || parsed < 0) {
    throw new TypeError(`areaSqFtToMicros: invalid area ${sqFt}`);
  }
  const micros = BigInt(Math.round(parsed * 1_000_000));
  return validateAreaMicros(micros);
}

/**
 * Converts micro-units to square feet string (2 decimal places).
 *
 * @param {bigint} areaMicros
 * @returns {string} Formatted sq ft
 */
export function areaMicrosToSqFtString(areaMicros) {
  validateAreaMicros(areaMicros);
  const integerPart = areaMicros / AREA_SCALE_FACTOR;
  const fractionPart = (areaMicros % AREA_SCALE_FACTOR) / 10_000n; // 2 decimal digits
  const fractionStr = fractionPart.toString().padStart(2, '0');
  return `${integerPart}.${fractionStr}`;
}
