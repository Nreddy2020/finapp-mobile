/**
 * @file investmentCalculations.js
 * @description Deterministic fixed-point quantity and monetary calculations
 * for the FinLife Investments Module V1 (Phase 1).
 *
 * Invariants & Guarantees:
 * - Deterministic half-up rounding for gross paise:
 *   grossPaise = ((quantityMicros * pricePaise) + (QUANTITY_SCALE / 2n)) / QUANTITY_SCALE
 * - Cash-sign convention: Fees and taxes are strictly positive magnitudes.
 * - Outflow = gross + fees + taxes (BUY).
 * - Inflow = gross - fees - taxes (SELL).
 * - No floating-point math on persisted financial quantities.
 */

import {
  QUANTITY_SCALE,
  CASH_DIRECTION,
  TRANSACTION_TYPES,
  validateBoundedPaise,
  validateNonNegativePaise,
  validateBoundedQuantityMicros,
  validateTransactionType
} from './investmentContracts.js';

/**
 * Calculates gross amount in paise using deterministic half-up rounding.
 *
 * @param {bigint} quantityMicros
 * @param {bigint} pricePaise
 * @returns {bigint} grossPaise
 */
export function calculateGrossAmountPaise(quantityMicros, pricePaise) {
  validateBoundedQuantityMicros(quantityMicros, 'quantityMicros');
  validateNonNegativePaise(pricePaise, 'pricePaise');

  if (quantityMicros === 0n || pricePaise === 0n) {
    return 0n;
  }

  const numerator = (quantityMicros * pricePaise) + (QUANTITY_SCALE / 2n);
  const gross = numerator / QUANTITY_SCALE;
  return validateNonNegativePaise(gross, 'calculatedGrossPaise');
}

export const calculateGrossPaise = calculateGrossAmountPaise;

/**
 * Calculates cash movement direction and net cash amount.
 *
 * Guarantees that fees and taxes are strictly non-negative magnitudes.
 *
 * @param {Object} params
 * @param {string} params.transactionType
 * @param {bigint} params.grossPaise
 * @param {bigint} [params.feesPaise=0n]
 * @param {bigint} [params.taxesPaise=0n]
 * @returns {{ direction: string, netCashAmountPaise: bigint, grossPaise: bigint, feesPaise: bigint, taxesPaise: bigint }}
 */
export function calculateCashMovement({
  transactionType,
  grossPaise,
  feesPaise = 0n,
  taxesPaise = 0n
}) {
  validateTransactionType(transactionType);
  validateNonNegativePaise(grossPaise, 'grossPaise');
  validateNonNegativePaise(feesPaise, 'feesPaise');
  validateNonNegativePaise(taxesPaise, 'taxesPaise');

  let direction = CASH_DIRECTION.NEUTRAL;
  let netCashAmountPaise = 0n;

  switch (transactionType) {
    case TRANSACTION_TYPES.BUY:
    case TRANSACTION_TYPES.SIP_PURCHASE: {
      direction = CASH_DIRECTION.OUTFLOW;
      netCashAmountPaise = grossPaise + feesPaise + taxesPaise;
      break;
    }

    case TRANSACTION_TYPES.SELL:
    case TRANSACTION_TYPES.REDEMPTION:
    case TRANSACTION_TYPES.MATURITY: {
      direction = CASH_DIRECTION.INFLOW;
      const totalDeductions = feesPaise + taxesPaise;
      netCashAmountPaise = grossPaise >= totalDeductions ? (grossPaise - totalDeductions) : 0n;
      break;
    }

    case TRANSACTION_TYPES.DIVIDEND:
    case TRANSACTION_TYPES.INTEREST: {
      direction = CASH_DIRECTION.INFLOW;
      const totalDeductions = feesPaise + taxesPaise;
      netCashAmountPaise = grossPaise >= totalDeductions ? (grossPaise - totalDeductions) : 0n;
      break;
    }

    case TRANSACTION_TYPES.FEE:
    case TRANSACTION_TYPES.TAX: {
      direction = CASH_DIRECTION.OUTFLOW;
      netCashAmountPaise = grossPaise + feesPaise + taxesPaise;
      break;
    }

    case TRANSACTION_TYPES.BONUS:
    case TRANSACTION_TYPES.STOCK_SPLIT:
    case TRANSACTION_TYPES.MERGER:
    case TRANSACTION_TYPES.TRANSFER_IN:
    case TRANSACTION_TYPES.TRANSFER_OUT:
    case TRANSACTION_TYPES.ADJUSTMENT: {
      direction = CASH_DIRECTION.NEUTRAL;
      netCashAmountPaise = 0n;
      break;
    }

    case TRANSACTION_TYPES.REVERSAL: {
      direction = CASH_DIRECTION.NEUTRAL;
      netCashAmountPaise = grossPaise;
      break;
    }

    default:
      throw new Error(`Unsupported transaction type for cash movement: ${transactionType}`);
  }

  validateNonNegativePaise(netCashAmountPaise, 'netCashAmountPaise');

  return {
    direction,
    netCashAmountPaise,
    grossPaise,
    feesPaise,
    taxesPaise
  };
}

/**
 * Converts micro-units to human-readable quantity string (up to 6 decimals).
 * Trims trailing fractional zeroes.
 *
 * @param {bigint} micros
 * @returns {string}
 */
export function microsToQuantityString(micros) {
  validateBoundedQuantityMicros(micros, 'micros');
  const integerPart = micros / QUANTITY_SCALE;
  const fractionalPart = micros % QUANTITY_SCALE;

  if (fractionalPart === 0n) {
    return integerPart.toString();
  }

  const fracStr = fractionalPart.toString().padStart(6, '0').replace(/0+$/, '');
  return `${integerPart.toString()}.${fracStr}`;
}

/**
 * Parses user input decimal string into fixed-point micros BigInt.
 *
 * @param {string|number} inputStr
 * @returns {bigint}
 */
export function quantityStringToMicros(inputStr) {
  if (typeof inputStr === 'number') {
    inputStr = inputStr.toString();
  }
  if (typeof inputStr !== 'string' || inputStr.trim().length === 0) {
    throw new TypeError('Invalid quantity string');
  }

  const trimmed = inputStr.trim();
  if (!/^\d+(\.\d{1,6})?$/.test(trimmed)) {
    throw new RangeError(`Quantity must be a positive decimal with up to 6 places, received: ${trimmed}`);
  }

  const parts = trimmed.split('.');
  const integerPart = BigInt(parts[0]);
  const fracPartStr = (parts[1] || '').padEnd(6, '0');
  const fractionalPart = BigInt(fracPartStr);

  const totalMicros = (integerPart * QUANTITY_SCALE) + fractionalPart;
  return validateBoundedQuantityMicros(totalMicros, 'parsedQuantityMicros');
}
