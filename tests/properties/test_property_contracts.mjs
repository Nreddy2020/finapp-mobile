/**
 * @file test_property_contracts.mjs
 * @description Invariant test suite for Properties Domain Contracts & Boundaries.
 * Verifies PROP-DOM-01 through PROP-DOM-10.
 */

import assert from 'assert';
import {
  MIN_PROPERTY_PAISE,
  MAX_PROPERTY_PAISE,
  MIN_SIGNED_64_PAISE,
  MAX_SIGNED_64_PAISE,
  TOTAL_OWNERSHIP_BPS,
  MIN_BPS,
  MAX_BPS,
  AREA_SCALE_FACTOR,
  PROPERTY_TYPES,
  PROPERTY_LIFECYCLE_STATES,
  VALUATION_METHODS,
  VALUATION_CONFIDENCE,
  PROPERTY_RISK_STATUS,
  validateNonNegativePropertyPaise,
  validateSignedPropertyPaise,
  validateMarketValue,
  validateRentalAmount,
  validateOwnershipBps,
  validateAreaMicros,
  validatePropertyType,
  validatePropertyState,
  validateValuationMethod,
  validateValuationConfidence,
  validateRiskStatus,
  floorDiv
} from '../../components/properties/propertyContracts.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    throw err;
  }
}

export function runPropertyContractsTests() {
  passed = 0;
  total = 0;

  // PROP-DOM-01: Monetary ceiling is exactly 500_000_000_000n (₹500 Crore)
  it('PROP-DOM-01: Monetary ceiling is exactly 500_000_000_000n paise (₹500 Crore)', () => {
    assert.strictEqual(MIN_PROPERTY_PAISE, 0n);
    assert.strictEqual(MAX_PROPERTY_PAISE, 500_000_000_000n);
    // Verify mathematical identity: ₹500 Crore = 5,000,000,000 * 100 paise
    assert.strictEqual(500n * 10_000_000n * 100n, MAX_PROPERTY_PAISE);
  });

  // PROP-DOM-02: Signed 64-bit integer domain boundaries [-2^63, 2^63 - 1]
  it('PROP-DOM-02: Signed 64-bit bounds are strictly enforced', () => {
    assert.strictEqual(MIN_SIGNED_64_PAISE, -9_223_372_036_854_775_808n);
    assert.strictEqual(MAX_SIGNED_64_PAISE, 9_223_372_036_854_775_807n);
  });

  // PROP-DOM-03: Fixed-point scaling factors for area and BPS
  it('PROP-DOM-03: Area scale is 1,000,000n micros and BPS scale is 10,000n', () => {
    assert.strictEqual(AREA_SCALE_FACTOR, 1_000_000n);
    assert.strictEqual(TOTAL_OWNERSHIP_BPS, 10_000n);
    assert.strictEqual(MIN_BPS, 0n);
    assert.strictEqual(MAX_BPS, 10_000n);
  });

  // PROP-DOM-04: Non-negative paise validation accepts 0n and MAX_PROPERTY_PAISE
  it('PROP-DOM-04: Non-negative paise validation accepts valid bounds', () => {
    assert.strictEqual(validateNonNegativePropertyPaise(0n), 0n);
    assert.strictEqual(validateNonNegativePropertyPaise(MAX_PROPERTY_PAISE), MAX_PROPERTY_PAISE);
    assert.strictEqual(validateNonNegativePropertyPaise(120_000_000_00n), 120_000_000_00n); // ₹1.2 Cr
  });

  // PROP-DOM-05: Non-negative paise validation rejects negative values
  it('PROP-DOM-05: Non-negative paise validation rejects negative values', () => {
    assert.throws(() => validateNonNegativePropertyPaise(-1n), /cannot be negative/);
    assert.throws(() => validateMarketValue(-100n), /cannot be negative/);
    assert.throws(() => validateRentalAmount(-50000n), /cannot be negative/);
  });

  // PROP-DOM-06: Non-negative paise validation rejects values exceeding ceiling
  it('PROP-DOM-06: Non-negative paise validation rejects values exceeding ₹500 Crore ceiling', () => {
    assert.throws(
      () => validateNonNegativePropertyPaise(MAX_PROPERTY_PAISE + 1n),
      /exceeds maximum property ceiling/
    );
    assert.throws(
      () => validateMarketValue(500_000_000_001n),
      /exceeds maximum property ceiling/
    );
  });

  // PROP-DOM-07: Non-negative paise validation rejects non-BigInt types
  it('PROP-DOM-07: Non-negative paise validation rejects non-BigInt primitives', () => {
    assert.throws(() => validateNonNegativePropertyPaise(100), /must be a BigInt/);
    assert.throws(() => validateNonNegativePropertyPaise('100'), /must be a BigInt/);
    assert.throws(() => validateNonNegativePropertyPaise(null), /must be a BigInt/);
    assert.throws(() => validateNonNegativePropertyPaise(undefined), /must be a BigInt/);
  });

  // PROP-DOM-08: Signed paise validation accepts signed negatives and rejects out-of-bounds
  it('PROP-DOM-08: Signed paise validation handles negative values safely', () => {
    assert.strictEqual(validateSignedPropertyPaise(-50_000_00n), -50_000_00n);
    assert.strictEqual(validateSignedPropertyPaise(0n), 0n);
    assert.strictEqual(validateSignedPropertyPaise(MAX_SIGNED_64_PAISE), MAX_SIGNED_64_PAISE);
    assert.strictEqual(validateSignedPropertyPaise(MIN_SIGNED_64_PAISE), MIN_SIGNED_64_PAISE);
    assert.throws(() => validateSignedPropertyPaise(MAX_SIGNED_64_PAISE + 1n), /out of signed 64-bit/);
    assert.throws(() => validateSignedPropertyPaise(MIN_SIGNED_64_PAISE - 1n), /out of signed 64-bit/);
  });

  // PROP-DOM-09: All 8 property types are recognized and invalid types rejected
  it('PROP-DOM-09: Property types are strictly validated', () => {
    const expectedTypes = [
      'RESIDENTIAL_HOUSE', 'APARTMENT', 'PLOT', 'AGRICULTURAL_LAND',
      'COMMERCIAL_PROPERTY', 'RENTAL_PROPERTY', 'UNDER_CONSTRUCTION', 'OTHER_PROPERTY'
    ];
    for (const type of expectedTypes) {
      assert.strictEqual(validatePropertyType(type), type);
    }
    assert.throws(() => validatePropertyType('GOLD_JEWELLERY'), /Invalid propertyType/);
    assert.throws(() => validatePropertyType('VEHICLE'), /Invalid propertyType/);
    assert.throws(() => validatePropertyType('CRYPTO'), /Invalid propertyType/);
  });

  // PROP-DOM-10: Lifecycle states, valuation methods, and confidence ratings are validated
  it('PROP-DOM-10: Lifecycle states, valuation methods, and confidence ratings are validated', () => {
    assert.strictEqual(validatePropertyState('ACTIVE'), 'ACTIVE');
    assert.strictEqual(validatePropertyState('SOLD'), 'SOLD');
    assert.throws(() => validatePropertyState('UNKNOWN_STATE'), /Invalid propertyState/);

    assert.strictEqual(validateValuationMethod('MANUAL_ESTIMATE'), 'MANUAL_ESTIMATE');
    assert.throws(() => validateValuationMethod('CRYSTAL_BALL'), /Invalid valuationMethod/);

    assert.strictEqual(validateValuationConfidence('HIGH'), 'HIGH');
    assert.throws(() => validateValuationConfidence('CERTAIN'), /Invalid valuationConfidence/);

    assert.strictEqual(validateRiskStatus('CLEAR'), 'CLEAR');
    assert.strictEqual(validateRiskStatus('LOAN_LIEN'), 'LOAN_LIEN');
    assert.throws(() => validateRiskStatus('BANKRUPT'), /Invalid riskStatus/);
  });

  // PROP-DOM-11: floorDiv performs true mathematical floor for signed BigInt values
  it('PROP-DOM-11: floorDiv performs true mathematical floor for signed BigInts and handles negative values correctly', () => {
    assert.strictEqual(floorDiv(10n, 3n), 3n);
    assert.strictEqual(floorDiv(0n, 3n), 0n);
    assert.strictEqual(floorDiv(-1n, 3n), -1n); // Mathematically floor(-0.333...) = -1
    assert.strictEqual(floorDiv(-3n, 3n), -1n);
    assert.strictEqual(floorDiv(-4n, 3n), -2n); // Mathematically floor(-1.333...) = -2
    assert.strictEqual(floorDiv(-10_000n, 100_000n), -1n);
    assert.throws(() => floorDiv(10n, 0n), /denominator must be strictly positive/);
    assert.throws(() => floorDiv(10n, -2n), /denominator must be strictly positive/);
  });

  return { passed, total };
}
