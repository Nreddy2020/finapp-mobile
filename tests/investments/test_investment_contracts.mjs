/**
 * @file test_investment_contracts.mjs
 * @description Invariant test suite for Investment Contracts, Bounds, Enums, and Fixed-Point Math.
 * Verifies JavaScript BigInt monetary values bounded to the signed 64-bit domain.
 */

import assert from 'assert';
import {
  QUANTITY_SCALE,
  MIN_PAISE,
  MAX_PAISE,
  MAX_QUANTITY_MICROS,
  MIN_QUANTITY_MICROS,
  INSTRUMENT_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  CASH_DIRECTION,
  validateBoundedPaise,
  validateNonNegativePaise,
  validateBoundedQuantityMicros,
  validateInstrumentType,
  validateTransactionType
} from '../../components/investments/investmentContracts.js';

import {
  calculateGrossAmountPaise,
  calculateCashMovement,
  microsToQuantityString,
  quantityStringToMicros
} from '../../components/investments/investmentCalculations.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  🟢 ${desc}`);
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(err);
    throw err;
  }
}

export function runInvestmentContractsTests() {
  console.log('================================================================');
  console.log('=== FINLIFE INVESTMENTS: CONTRACTS, BOUNDS & FIXED-POINT MATH ===');
  console.log('================================================================\n');

  passed = 0;
  total = 0;

  // INV-DOM-01: Quantity scale is 1,000,000n (micros)
  it('INV-DOM-01: QUANTITY_SCALE is exactly 1,000,000n (6 decimal places)', () => {
    assert.strictEqual(QUANTITY_SCALE, 1_000_000n);
    assert.strictEqual(typeof QUANTITY_SCALE, 'bigint');
  });

  // INV-DOM-02: Signed 64-bit monetary bounds exact limits
  it('INV-DOM-02: MIN_PAISE === -9_223_372_036_854_775_808n and MAX_PAISE === 9_223_372_036_854_775_807n', () => {
    assert.strictEqual(MIN_PAISE, -9_223_372_036_854_775_808n);
    assert.strictEqual(MAX_PAISE,  9_223_372_036_854_775_807n);
    assert.strictEqual(typeof MIN_PAISE, 'bigint');
    assert.strictEqual(typeof MAX_PAISE, 'bigint');
  });

  // INV-DOM-03: Exact minimum accepted
  it('INV-DOM-03: Exact minimum accepted (validateBoundedPaise(MIN_PAISE))', () => {
    const res = validateBoundedPaise(MIN_PAISE);
    assert.strictEqual(res, -9_223_372_036_854_775_808n);
  });

  // INV-DOM-04: Exact maximum accepted
  it('INV-DOM-04: Exact maximum accepted (validateBoundedPaise(MAX_PAISE))', () => {
    const res = validateBoundedPaise(MAX_PAISE);
    assert.strictEqual(res, 9_223_372_036_854_775_807n);
  });

  // INV-DOM-05: Minimum minus one rejected
  it('INV-DOM-05: Minimum minus one rejected (MIN_PAISE - 1n)', () => {
    assert.throws(
      () => validateBoundedPaise(MIN_PAISE - 1n),
      /out of signed 64-bit bounds/
    );
  });

  // INV-DOM-06: Maximum plus one rejected
  it('INV-DOM-06: Maximum plus one rejected (MAX_PAISE + 1n)', () => {
    assert.throws(
      () => validateBoundedPaise(MAX_PAISE + 1n),
      /out of signed 64-bit bounds/
    );
  });

  // INV-DOM-07: Intermediate multiplication overflow rejected before unsafe persistence
  it('INV-DOM-07: Intermediate multiplication overflow rejected before unsafe persistence', () => {
    // Attempting to calculate gross for 1 billion units at maximum signed 64-bit price
    // produces a result exceeding MAX_PAISE, which MUST throw a RangeError
    assert.throws(
      () => calculateGrossAmountPaise(MAX_QUANTITY_MICROS, MAX_PAISE),
      /calculatedGrossPaise out of signed 64-bit bounds/
    );

    // Also verify cash movement calculation rejects overflow
    assert.throws(
      () => calculateCashMovement({
        transactionType: TRANSACTION_TYPES.BUY,
        grossPaise: MAX_PAISE,
        feesPaise: 100n,
        taxesPaise: 0n
      }),
      /netCashAmountPaise out of signed 64-bit bounds/
    );
  });

  // INV-DOM-08: Fees and taxes must be non-negative
  it('INV-DOM-08: Fees and taxes reject negative magnitudes', () => {
    assert.doesNotThrow(() => validateNonNegativePaise(0n, 'fee'));
    assert.doesNotThrow(() => validateNonNegativePaise(5000n, 'tax'));
    assert.throws(() => validateNonNegativePaise(-1n, 'fee'), /cannot be negative/);
  });

  // INV-DOM-09: Deterministic half-up rounding (exact half)
  it('INV-DOM-09: Gross paise rounds UP on exact half (numerator remainder == 500,000)', () => {
    const qty = 500_000n; // 0.5 units
    const price = 101n;   // ₹1.01
    const gross = calculateGrossAmountPaise(qty, price);
    assert.strictEqual(gross, 51n);
  });

  // INV-DOM-10: Deterministic half-up rounding (below half)
  it('INV-DOM-10: Gross paise rounds DOWN on strictly below half', () => {
    const qty = 499_999n;
    const price = 1n;
    const gross = calculateGrossAmountPaise(qty, price);
    assert.strictEqual(gross, 0n);
  });

  // INV-DOM-11: Deterministic half-up rounding (above half)
  it('INV-DOM-11: Gross paise rounds UP on strictly above half', () => {
    const qty = 500_001n;
    const price = 1n;
    const gross = calculateGrossAmountPaise(qty, price);
    assert.strictEqual(gross, 1n);
  });

  // INV-DOM-12: Boundary test (zero quantity and zero price)
  it('INV-DOM-12: Zero quantity or zero price yields strictly 0n gross paise', () => {
    assert.strictEqual(calculateGrossAmountPaise(0n, 10000n), 0n);
    assert.strictEqual(calculateGrossAmountPaise(1_000_000n, 0n), 0n);
  });

  // INV-DOM-13: 1 micro-unit calculation
  it('INV-DOM-13: Exactly 1 micro-unit calculated without underflow', () => {
    const gross = calculateGrossAmountPaise(1n, 1_000_000n);
    assert.strictEqual(gross, 1n);
  });

  // INV-DOM-14: Maximum allowed quantity at regular prices
  it('INV-DOM-14: Maximum quantity (1 billion units) calculated without precision loss', () => {
    const maxQty = MAX_QUANTITY_MICROS;
    const price = 100_00n;
    const gross = calculateGrossAmountPaise(maxQty, price);
    assert.strictEqual(gross, 10_000_000_000_000n);
  });

  // INV-DOM-15: Cash movement sign convention for BUY
  it('INV-DOM-15: BUY produces OUTFLOW equal to gross + fees + taxes', () => {
    const movement = calculateCashMovement({
      transactionType: TRANSACTION_TYPES.BUY,
      grossPaise: 100_000_00n,
      feesPaise: 20_00n,
      taxesPaise: 10_00n
    });
    assert.strictEqual(movement.direction, CASH_DIRECTION.OUTFLOW);
    assert.strictEqual(movement.netCashAmountPaise, 100_030_00n);
  });

  // INV-DOM-16: Cash movement sign convention for SELL
  it('INV-DOM-16: SELL produces INFLOW equal to gross - fees - taxes', () => {
    const movement = calculateCashMovement({
      transactionType: TRANSACTION_TYPES.SELL,
      grossPaise: 120_000_00n,
      feesPaise: 25_00n,
      taxesPaise: 15_00n
    });
    assert.strictEqual(movement.direction, CASH_DIRECTION.INFLOW);
    assert.strictEqual(movement.netCashAmountPaise, 119_960_00n);
  });

  // INV-DOM-17: Quantity string conversions
  it('INV-DOM-17: Quantity string parsing and formatting are bijective and exact', () => {
    const micros = 125_500_000n;
    const str = microsToQuantityString(micros);
    assert.strictEqual(str, '125.5');
    assert.strictEqual(quantityStringToMicros(str), micros);

    const fineMicros = 10_123456n;
    assert.strictEqual(microsToQuantityString(fineMicros), '10.123456');
    assert.strictEqual(quantityStringToMicros('10.123456'), fineMicros);
  });

  console.log(`\n🎉 ALL ${passed} / ${total} INVESTMENT CONTRACTS & MATH TESTS PASSED!\n`);
  return { passed, total };
}

if (process.argv[1]?.endsWith('test_investment_contracts.mjs')) {
  runInvestmentContractsTests();
}
