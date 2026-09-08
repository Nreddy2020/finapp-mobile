/**
 * @file propertyContracts.js
 * @description Domain contracts, enums, boundary values, BigInt paise constants, and
 * strict type validators for the FinLife Properties Module.
 *
 * MONETARY DOMAIN SPECIFICATION:
 * All monetary values are JavaScript BigInt values in paise, bounded to the signed
 * 64-bit integer domain [-2^63, 2^63 - 1].
 * Non-negative property market values and acquisition costs are constrained to a
 * maximum ceiling of 500_000_000_000n paise (₹500 Crore = ₹5,000,000,000 * 100).
 */

// --- MONETARY & NUMERICAL BOUNDARIES ---

export const MIN_PROPERTY_PAISE = 0n;
export const MAX_PROPERTY_PAISE = 500_000_000_000n; // ₹500 Crore (500 Billion paise)

export const MIN_SIGNED_64_PAISE = -9_223_372_036_854_775_808n; // -2^63
export const MAX_SIGNED_64_PAISE = 9_223_372_036_854_775_807n;  // 2^63 - 1

// Basis Points: 10,000 BPS = 100.00%
export const TOTAL_OWNERSHIP_BPS = 10_000n;
export const MIN_BPS = 0n;
export const MAX_BPS = 10_000n;

// Physical Area: Micro square feet (1 sq ft = 1,000,000 micros)
export const AREA_SCALE_FACTOR = 1_000_000n;
export const MIN_AREA_MICROS = 0n;
export const MAX_AREA_MICROS = 100_000_000_000_000n; // 100 Million sq ft

// --- PROPERTY TYPES ---
export const PROPERTY_TYPES = Object.freeze({
  RESIDENTIAL_HOUSE: 'RESIDENTIAL_HOUSE',
  APARTMENT: 'APARTMENT',
  PLOT: 'PLOT',
  AGRICULTURAL_LAND: 'AGRICULTURAL_LAND',
  COMMERCIAL_PROPERTY: 'COMMERCIAL_PROPERTY',
  RENTAL_PROPERTY: 'RENTAL_PROPERTY',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
  OTHER_PROPERTY: 'OTHER_PROPERTY'
});

// --- LIFECYCLE STATES ---
export const PROPERTY_LIFECYCLE_STATES = Object.freeze({
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  UNDER_CONSTRUCTION: 'UNDER_CONSTRUCTION',
  RENTED: 'RENTED',
  VACANT: 'VACANT',
  PARTIALLY_SOLD: 'PARTIALLY_SOLD',
  TRANSFERRED: 'TRANSFERRED',
  SOLD: 'SOLD',
  DISPUTED: 'DISPUTED',
  ARCHIVED: 'ARCHIVED'
});

// --- VALUATION METHODS ---
export const VALUATION_METHODS = Object.freeze({
  MANUAL_ESTIMATE: 'MANUAL_ESTIMATE',
  COMPARABLE_SALES: 'COMPARABLE_SALES',
  CONSTRUCTION_COST: 'CONSTRUCTION_COST',
  GOVERNMENT_GUIDELINE: 'GOVERNMENT_GUIDELINE',
  BANK_APPRAISAL: 'BANK_APPRAISAL',
  ALGORITHMIC_INDEX: 'ALGORITHMIC_INDEX'
});

// --- VALUATION CONFIDENCE ---
export const VALUATION_CONFIDENCE = Object.freeze({
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW'
});

// --- RISK / COMPLIANCE STATUS ---
export const PROPERTY_RISK_STATUS = Object.freeze({
  CLEAR: 'CLEAR',
  DOCUMENT_PENDING: 'DOCUMENT_PENDING',
  LOAN_LIEN: 'LOAN_LIEN',
  TAX_PENDING: 'TAX_PENDING',
  DISPUTED: 'DISPUTED',
  LEGAL_REVIEW_REQUIRED: 'LEGAL_REVIEW_REQUIRED',
  ENCUMBRANCE_REPORTED: 'ENCUMBRANCE_REPORTED',
  OWNERSHIP_UNCLEAR: 'OWNERSHIP_UNCLEAR'
});

// --- DOCUMENT TYPES ---
export const PROPERTY_DOCUMENT_TYPES = Object.freeze({
  SALE_DEED: 'SALE_DEED',
  REGISTRATION_CERTIFICATE: 'REGISTRATION_CERTIFICATE',
  TAX_RECEIPT: 'TAX_RECEIPT',
  ENCUMBRANCE_CERTIFICATE: 'ENCUMBRANCE_CERTIFICATE',
  BUILDING_PLAN_APPROVAL: 'BUILDING_PLAN_APPROVAL',
  OCCUPANCY_CERTIFICATE: 'OCCUPANCY_CERTIFICATE',
  COMPLETION_CERTIFICATE: 'COMPLETION_CERTIFICATE',
  KHATA_PATTADAR: 'KHATA_PATTADAR',
  LOAN_SANCTION_LETTER: 'LOAN_SANCTION_LETTER',
  MORTGAGE_DEED: 'MORTGAGE_DEED',
  INSURANCE_POLICY: 'INSURANCE_POLICY',
  RENTAL_AGREEMENT: 'RENTAL_AGREEMENT',
  SURVEY_SKETCH: 'SURVEY_SKETCH',
  NOC: 'NOC',
  OTHER_DOCUMENT: 'OTHER_DOCUMENT'
});

// --- DOCUMENT VERIFICATION STATUS ---
export const DOCUMENT_VERIFICATION_STATUS = Object.freeze({
  VERIFIED: 'VERIFIED',
  VALID: 'VALID',
  PENDING: 'PENDING',
  EXPIRED: 'EXPIRED',
  REJECTED: 'REJECTED'
});

// --- STRICT VALIDATION HELPERS ---

/**
 * Validates a non-negative BigInt paise value within [0n, MAX_PROPERTY_PAISE].
 */
export function validateNonNegativePropertyPaise(value, fieldName = 'propertyPaise') {
  if (typeof value !== 'bigint') {
    throw new TypeError(`Invalid ${fieldName}: must be a BigInt, received ${typeof value} (${value})`);
  }
  if (value < MIN_PROPERTY_PAISE) {
    throw new RangeError(`Invalid ${fieldName}: cannot be negative, received ${value}n`);
  }
  if (value > MAX_PROPERTY_PAISE) {
    throw new RangeError(`Invalid ${fieldName}: exceeds maximum property ceiling of ${MAX_PROPERTY_PAISE}n paise (₹500 Crore), received ${value}n`);
  }
  return value;
}

/**
 * Validates a signed BigInt paise value within [-2^63, 2^63 - 1].
 */
export function validateSignedPropertyPaise(value, fieldName = 'signedPaise') {
  if (typeof value !== 'bigint') {
    throw new TypeError(`Invalid ${fieldName}: must be a BigInt, received ${typeof value} (${value})`);
  }
  if (value < MIN_SIGNED_64_PAISE || value > MAX_SIGNED_64_PAISE) {
    throw new RangeError(`Invalid ${fieldName}: out of signed 64-bit integer domain, received ${value}n`);
  }
  return value;
}

/**
 * Validates a property market value.
 */
export function validateMarketValue(value) {
  return validateNonNegativePropertyPaise(value, 'marketValuePaise');
}

/**
 * Validates a rental amount (monthly, annual, or gross rent).
 */
export function validateRentalAmount(value) {
  return validateNonNegativePropertyPaise(value, 'rentalAmountPaise');
}

/**
 * Validates an ownership percentage in basis points [0n, 10_000n].
 */
export function validateOwnershipBps(value, fieldName = 'shareBps') {
  if (typeof value !== 'bigint') {
    throw new TypeError(`Invalid ${fieldName}: must be a BigInt, received ${typeof value} (${value})`);
  }
  if (value < MIN_BPS || value > MAX_BPS) {
    throw new RangeError(`Invalid ${fieldName}: must be between 0n and 10000n BPS, received ${value}n`);
  }
  return value;
}

/**
 * Validates a physical area in micro-units [0n, MAX_AREA_MICROS].
 */
export function validateAreaMicros(value, fieldName = 'areaMicros') {
  if (typeof value !== 'bigint') {
    throw new TypeError(`Invalid ${fieldName}: must be a BigInt, received ${typeof value} (${value})`);
  }
  if (value < MIN_AREA_MICROS) {
    throw new RangeError(`Invalid ${fieldName}: cannot be negative, received ${value}n`);
  }
  if (value > MAX_AREA_MICROS) {
    throw new RangeError(`Invalid ${fieldName}: exceeds maximum area of ${MAX_AREA_MICROS}n micros, received ${value}n`);
  }
  return value;
}

/**
 * Validates that a string is a recognized property type.
 */
export function validatePropertyType(type) {
  if (!PROPERTY_TYPES[type]) {
    throw new TypeError(`Invalid propertyType: '${type}'. Allowed: ${Object.keys(PROPERTY_TYPES).join(', ')}`);
  }
  return type;
}

/**
 * Validates that a string is a recognized lifecycle state.
 */
export function validatePropertyState(state) {
  if (!PROPERTY_LIFECYCLE_STATES[state]) {
    throw new TypeError(`Invalid propertyState: '${state}'. Allowed: ${Object.keys(PROPERTY_LIFECYCLE_STATES).join(', ')}`);
  }
  return state;
}

/**
 * Validates that a string is a recognized valuation method.
 */
export function validateValuationMethod(method) {
  if (!VALUATION_METHODS[method]) {
    throw new TypeError(`Invalid valuationMethod: '${method}'. Allowed: ${Object.keys(VALUATION_METHODS).join(', ')}`);
  }
  return method;
}

/**
 * Validates that a string is a recognized valuation confidence rating.
 */
export function validateValuationConfidence(confidence) {
  if (!VALUATION_CONFIDENCE[confidence]) {
    throw new TypeError(`Invalid valuationConfidence: '${confidence}'. Allowed: ${Object.keys(VALUATION_CONFIDENCE).join(', ')}`);
  }
  return confidence;
}

/**
 * Validates that a string is a recognized risk status.
 */
export function validateRiskStatus(status) {
  if (!PROPERTY_RISK_STATUS[status]) {
    throw new TypeError(`Invalid riskStatus: '${status}'. Allowed: ${Object.keys(PROPERTY_RISK_STATUS).join(', ')}`);
  }
  return status;
}

/**
 * Mathematical floor division for BigInts.
 * 
 * Unlike standard JavaScript `/` operator which truncates toward zero (-1n / 3n === 0n),
 * floorDiv performs true mathematical floor where floor(-1 / 3) === -1.
 *
 * Examples:
 *   floorDiv(10n, 3n) === 3n
 *   floorDiv(0n, 3n) === 0n
 *   floorDiv(-1n, 3n) === -1n
 *   floorDiv(-3n, 3n) === -1n
 *   floorDiv(-4n, 3n) === -2n
 *
 * @param {bigint} numerator - Signed BigInt
 * @param {bigint} denominator - Positive BigInt (must be > 0n)
 * @returns {bigint} True mathematical floor quotient
 */
export function floorDiv(numerator, denominator) {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') {
    throw new TypeError('floorDiv: numerator and denominator must be BigInts');
  }
  if (denominator <= 0n) {
    throw new RangeError('floorDiv: denominator must be strictly positive (> 0n)');
  }

  if (numerator >= 0n) {
    return numerator / denominator;
  }

  return -((-numerator + denominator - 1n) / denominator);
}

/**
 * Truncation toward zero division for BigInts (standard JS division semantics).
 * 
 * @param {bigint} numerator
 * @param {bigint} denominator
 * @returns {bigint}
 */
export function truncDiv(numerator, denominator) {
  if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') {
    throw new TypeError('truncDiv: numerator and denominator must be BigInts');
  }
  if (denominator === 0n) {
    throw new RangeError('truncDiv: division by zero');
  }
  return numerator / denominator;
}
