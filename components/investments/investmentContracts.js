/**
 * @file investmentContracts.js
 * @description Authoritative domain contracts, bounds, enums, and validators
 * for the FinLife Investments Module V1 (Phase 1).
 *
 * Invariants & Guarantees:
 * - All monetary values use JavaScript BigInt monetary values bounded to the signed 64-bit domain.
 * - All quantities use fixed-point micro-units (QUANTITY_SCALE = 1_000_000n).
 * - Fees and taxes are strictly non-negative magnitudes.
 * - Immutable, append-only identity invariants.
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. Monetary & Precision Scale Constants
// ─────────────────────────────────────────────────────────────────────────────

export const QUANTITY_SCALE = 1_000_000n; // 1 unit = 1,000,000 micros (6 decimals)
export const MIN_PAISE = -9_223_372_036_854_775_808n;
export const MAX_PAISE =  9_223_372_036_854_775_807n;
export const MAX_QUANTITY_MICROS = 1_000_000_000_000_000n; // 1 Billion units max
export const MIN_QUANTITY_MICROS = 0n;

// ─────────────────────────────────────────────────────────────────────────────
// 2. Domain Enums
// ─────────────────────────────────────────────────────────────────────────────

export const INSTRUMENT_TYPES = Object.freeze({
  EQUITY: 'EQUITY',
  ETF: 'ETF',
  MUTUAL_FUND: 'MUTUAL_FUND',
  BOND: 'BOND',
  FIXED_INCOME: 'FIXED_INCOME',
  GOVERNMENT_SECURITY: 'GOVERNMENT_SECURITY',
  GOLD_ETF: 'GOLD_ETF',
  REIT_INVIT: 'REIT_INVIT',
  OTHER_MARKET_INSTRUMENT: 'OTHER_MARKET_INSTRUMENT'
});

export const INSTRUMENT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELISTED: 'DELISTED',
  ARCHIVED: 'ARCHIVED'
});

export const ACCOUNT_TYPES = Object.freeze({
  DEMAT: 'DEMAT',
  MUTUAL_FUND_FOLIO: 'MUTUAL_FUND_FOLIO',
  BANK_INVESTMENT: 'BANK_INVESTMENT',
  PENSION_NPS: 'PENSION_NPS',
  OTHER: 'OTHER'
});

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  DORMANT: 'DORMANT',
  CLOSED: 'CLOSED'
});

export const OWNERSHIP_TYPES = Object.freeze({
  INDIVIDUAL_SELF: 'INDIVIDUAL_SELF',
  SPOUSE: 'SPOUSE',
  JOINT: 'JOINT',
  MINOR_CHILD: 'MINOR_CHILD',
  HUF: 'HUF',
  FAMILY_TRUST: 'FAMILY_TRUST'
});

export const TRANSACTION_TYPES = Object.freeze({
  BUY: 'BUY',
  SELL: 'SELL',
  SIP_PURCHASE: 'SIP_PURCHASE',
  DIVIDEND: 'DIVIDEND',
  INTEREST: 'INTEREST',
  BONUS: 'BONUS',
  STOCK_SPLIT: 'STOCK_SPLIT',
  MERGER: 'MERGER',
  TRANSFER_IN: 'TRANSFER_IN',
  TRANSFER_OUT: 'TRANSFER_OUT',
  REDEMPTION: 'REDEMPTION',
  MATURITY: 'MATURITY',
  FEE: 'FEE',
  TAX: 'TAX',
  REVERSAL: 'REVERSAL',
  ADJUSTMENT: 'ADJUSTMENT'
});

export const TRANSACTION_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING: 'PENDING',
  SETTLED: 'SETTLED',
  FAILED: 'FAILED',
  REVERSED: 'REVERSED',
  CANCELLED: 'CANCELLED'
});

export const CASH_DIRECTION = Object.freeze({
  INFLOW: 'INFLOW',
  OUTFLOW: 'OUTFLOW',
  NEUTRAL: 'NEUTRAL'
});

export const LEDGER_ACCOUNT_TYPES = Object.freeze({
  ASSET_INVESTMENT: 'ASSET_INVESTMENT',
  CASH_SETTLEMENT: 'CASH_SETTLEMENT',
  REALIZED_GAIN_LOSS: 'REALIZED_GAIN_LOSS',
  DIVIDEND_INCOME: 'DIVIDEND_INCOME',
  INTEREST_INCOME: 'INTEREST_INCOME',
  FEES_EXPENSE: 'FEES_EXPENSE',
  TAX_EXPENSE: 'TAX_EXPENSE'
});

export const VALUATION_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  STALE: 'STALE',
  UNAVAILABLE: 'UNAVAILABLE',
  MANUAL: 'MANUAL',
  ESTIMATED: 'ESTIMATED'
});

export const TAX_LOT_STATUS = Object.freeze({
  OPEN: 'OPEN',
  PARTIALLY_DEPLETED: 'PARTIALLY_DEPLETED',
  DEPLETED: 'DEPLETED',
  REVERSED: 'REVERSED'
});

export const DEPLETION_METHOD = Object.freeze({
  FIFO: 'FIFO',
  SPECIFIC_LOT: 'SPECIFIC_LOT'
});

export const COST_BASIS_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',
  PARTIAL: 'PARTIAL',
  UNAVAILABLE: 'UNAVAILABLE'
});

export const HOLDING_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  CLOSED: 'CLOSED'
});

export const TAX_POLICY_VERSIONS = Object.freeze({
  IN_IT_ACT_V1: 'IN_IT_ACT_V1'
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Validators
// ─────────────────────────────────────────────────────────────────────────────

export function validateBoundedPaise(val, fieldName = 'paise') {
  if (typeof val !== 'bigint') {
    throw new TypeError(`${fieldName} must be a BigInt, received ${typeof val}`);
  }
  if (val < MIN_PAISE || val > MAX_PAISE) {
    throw new RangeError(`${fieldName} out of signed 64-bit bounds: ${val.toString()}`);
  }
  return val;
}

export function validateNonNegativePaise(val, fieldName = 'paise') {
  validateBoundedPaise(val, fieldName);
  if (val < 0n) {
    throw new RangeError(`${fieldName} cannot be negative, received: ${val.toString()}`);
  }
  return val;
}

export function validateBoundedQuantityMicros(val, fieldName = 'quantityMicros') {
  if (typeof val !== 'bigint') {
    throw new TypeError(`${fieldName} must be a BigInt, received ${typeof val}`);
  }
  if (val < MIN_QUANTITY_MICROS || val > MAX_QUANTITY_MICROS) {
    throw new RangeError(`${fieldName} out of bounds [${MIN_QUANTITY_MICROS}..${MAX_QUANTITY_MICROS}]: ${val.toString()}`);
  }
  return val;
}

export function validateInstrumentType(type) {
  if (!Object.values(INSTRUMENT_TYPES).includes(type)) {
    throw new RangeError(`Invalid instrument type: ${type}`);
  }
  return type;
}

export function validateInstrumentStatus(status) {
  if (!Object.values(INSTRUMENT_STATUS).includes(status)) {
    throw new RangeError(`Invalid instrument status: ${status}`);
  }
  return status;
}

export function validateAccountType(type) {
  if (!Object.values(ACCOUNT_TYPES).includes(type)) {
    throw new RangeError(`Invalid account type: ${type}`);
  }
  return type;
}

export function validateAccountStatus(status) {
  if (!Object.values(ACCOUNT_STATUS).includes(status)) {
    throw new RangeError(`Invalid account status: ${status}`);
  }
  return status;
}

export function validateTransactionType(type) {
  if (!Object.values(TRANSACTION_TYPES).includes(type)) {
    throw new RangeError(`Invalid transaction type: ${type}`);
  }
  return type;
}

export function validateTransactionStatus(status) {
  if (!Object.values(TRANSACTION_STATUS).includes(status)) {
    throw new RangeError(`Invalid transaction status: ${status}`);
  }
  return status;
}

export function validateIdempotencyKey(key) {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    throw new TypeError('idempotencyKey must be a non-empty string');
  }
  return key.trim();
}

export function validateTaxLotStatus(status) {
  if (!Object.values(TAX_LOT_STATUS).includes(status)) {
    throw new RangeError(`Invalid tax lot status: ${status}`);
  }
  return status;
}

export function validateDepletionMethod(method) {
  if (!Object.values(DEPLETION_METHOD).includes(method)) {
    throw new RangeError(`Invalid depletion method: ${method}`);
  }
  return method;
}

export function validateCostBasisStatus(status) {
  if (!Object.values(COST_BASIS_STATUS).includes(status)) {
    throw new RangeError(`Invalid cost basis status: ${status}`);
  }
  return status;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Phase 3 Valuation & Performance Contracts
// ─────────────────────────────────────────────────────────────────────────────

export const PRICE_STATUS = Object.freeze({
  AVAILABLE: 'AVAILABLE',       // Fresh price within freshness threshold
  STALE: 'STALE',               // Older than threshold, mathematically computable with warning flag
  UNAVAILABLE: 'UNAVAILABLE',   // Missing quote; market value and unrealized gain/loss evaluate strictly to null
  INVALID: 'INVALID'            // Malformed, non-BigInt, or negative price; evaluates strictly to null
});

export const PRICE_SOURCE = Object.freeze({
  AMFI_NAV: 'AMFI_NAV',
  NSE_EQ: 'NSE_EQ',
  BSE_EQ: 'BSE_EQ',
  MANUAL_OVERRIDE: 'MANUAL_OVERRIDE',
  HISTORICAL_SNAPSHOT: 'HISTORICAL_SNAPSHOT'
});

export const PRICE_ADJUSTMENT_TYPE = Object.freeze({
  RAW: 'RAW',                                   // Unadjusted exchange price
  CORPORATE_ACTION_ADJUSTED: 'CORPORATE_ACTION_ADJUSTED' // Adjusted for splits/bonuses
});

export const XIRR_STATUS = Object.freeze({
  COMPUTED: 'COMPUTED',
  NOT_COMPUTABLE: 'NOT_COMPUTABLE',
  NO_CONVERGENCE: 'NO_CONVERGENCE'
});

export const PERFORMANCE_STATUS = Object.freeze({
  COMPUTED: 'COMPUTED',
  STALE_DATA: 'STALE_DATA',
  NOT_COMPUTABLE: 'NOT_COMPUTABLE'
});

export const PERFORMANCE_PERIOD = Object.freeze({
  ALL_TIME: 'ALL_TIME',
  YTD: 'YTD',
  ONE_YEAR: '1Y',
  THREE_YEAR: '3Y',
  FIVE_YEAR: '5Y'
});

export const DEFAULT_FRESHNESS_THRESHOLDS_MS = Object.freeze({
  MUTUAL_FUND: 48 * 60 * 60 * 1000,         // 48 hours for mutual fund NAVs
  EQUITY: 24 * 60 * 60 * 1000,              // 24 hours on trading days
  ETF: 24 * 60 * 60 * 1000,                 // 24 hours
  BOND: 7 * 24 * 60 * 60 * 1000,            // 7 days for fixed-income instruments
  GOVERNMENT_SECURITY: 7 * 24 * 60 * 60 * 1000, // 7 days
  DEFAULT: 24 * 60 * 60 * 1000              // 24 hours default
});

export function validatePriceStatus(status) {
  if (!Object.values(PRICE_STATUS).includes(status)) {
    throw new RangeError(`Invalid price status: ${status}`);
  }
  return status;
}

export function validatePriceSource(source) {
  if (!Object.values(PRICE_SOURCE).includes(source)) {
    throw new RangeError(`Invalid price source: ${source}`);
  }
  return source;
}

export function validatePriceAdjustmentType(type) {
  if (!Object.values(PRICE_ADJUSTMENT_TYPE).includes(type)) {
    throw new RangeError(`Invalid price adjustment type: ${type}`);
  }
  return type;
}

export function validatePriceQuote(quote) {
  if (!quote || typeof quote !== 'object') {
    throw new TypeError('Price quote must be an object');
  }
  if (!quote.instrumentId || typeof quote.instrumentId !== 'string') {
    throw new TypeError('instrumentId must be a non-empty string');
  }
  validateNonNegativePaise(quote.pricePaise, 'quote.pricePaise');
  validatePriceSource(quote.source);
  if (quote.status) validatePriceStatus(quote.status);
  if (quote.adjustmentType) validatePriceAdjustmentType(quote.adjustmentType);
  if (!quote.asOfTimestamp || isNaN(Date.parse(quote.asOfTimestamp))) {
    throw new TypeError('asOfTimestamp must be a valid ISO date string');
  }
  return quote;
}

