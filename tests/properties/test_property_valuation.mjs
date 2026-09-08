/**
 * @file test_property_valuation.mjs
 * @description Invariant test suite for Property Valuation Records & Historical Logs.
 * Verifies PROP-VAL-01 through PROP-VAL-08.
 */

import assert from 'assert';
import {
  createValuationRecord,
  appendValuationRecord,
  getLatestValuation
} from '../../components/properties/propertyValuationEngine.js';
import {
  VALUATION_METHODS,
  VALUATION_CONFIDENCE,
  MAX_PROPERTY_PAISE
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

export function runPropertyValuationTests() {
  passed = 0;
  total = 0;

  // PROP-VAL-01: createValuationRecord accepts valid parameters
  it('PROP-VAL-01: createValuationRecord creates an immutable, verified valuation event', () => {
    const record = createValuationRecord({
      valuationId: 'val_001',
      propertyId: 'prop_001',
      marketValuePaise: 120_000_00_00n, // ₹1.2 Cr
      valuationDate: '2025-01-10',
      method: VALUATION_METHODS.MANUAL_ESTIMATE,
      confidence: VALUATION_CONFIDENCE.MEDIUM,
      source: 'User Estimate'
    });
    assert.strictEqual(record.valuationId, 'val_001');
    assert.strictEqual(record.marketValuePaise, 120_000_00_00n);
    assert.strictEqual(record.valuationDate, '2025-01-10');
    assert.strictEqual(record.confidence, 'MEDIUM');
  });

  // PROP-VAL-02: createValuationRecord enforces monetary bounds
  it('PROP-VAL-02: createValuationRecord rejects negative or out-of-bounds market values', () => {
    assert.throws(
      () => createValuationRecord({
        valuationId: 'val_002',
        propertyId: 'prop_001',
        marketValuePaise: -100n,
        valuationDate: '2025-01-10'
      }),
      /cannot be negative/
    );

    assert.throws(
      () => createValuationRecord({
        valuationId: 'val_002',
        propertyId: 'prop_001',
        marketValuePaise: MAX_PROPERTY_PAISE + 1n,
        valuationDate: '2025-01-10'
      }),
      /exceeds maximum property ceiling/
    );
  });

  // PROP-VAL-03: createValuationRecord validates ISO date format
  it('PROP-VAL-03: createValuationRecord rejects invalid date formats', () => {
    assert.throws(
      () => createValuationRecord({
        valuationId: 'val_003',
        propertyId: 'prop_001',
        marketValuePaise: 100_000_00n,
        valuationDate: '10/01/2025'
      }),
      /Expected YYYY-MM-DD/
    );
  });

  // PROP-VAL-04: createValuationRecord validates method and confidence enums
  it('PROP-VAL-04: createValuationRecord rejects unknown method or confidence values', () => {
    assert.throws(
      () => createValuationRecord({
        valuationId: 'val_004',
        propertyId: 'prop_001',
        marketValuePaise: 100_000_00n,
        valuationDate: '2025-01-10',
        method: 'GUESS'
      }),
      /Invalid valuationMethod/
    );

    assert.throws(
      () => createValuationRecord({
        valuationId: 'val_004',
        propertyId: 'prop_001',
        marketValuePaise: 100_000_00n,
        valuationDate: '2025-01-10',
        confidence: 'SUPER_HIGH'
      }),
      /Invalid valuationConfidence/
    );
  });

  // PROP-VAL-05: appendValuationRecord appends and sorts history chronologically newest-first
  it('PROP-VAL-05: appendValuationRecord maintains newest-first chronological ordering', () => {
    const history = [];
    const r1 = createValuationRecord({
      valuationId: 'val_2018',
      propertyId: 'prop_001',
      marketValuePaise: 75_000_00_00n,
      valuationDate: '2018-03-12'
    });
    const r2 = createValuationRecord({
      valuationId: 'val_2025',
      propertyId: 'prop_001',
      marketValuePaise: 120_000_00_00n,
      valuationDate: '2025-01-10'
    });

    const h1 = appendValuationRecord(history, r1);
    const h2 = appendValuationRecord(h1, r2);

    assert.strictEqual(h2.length, 2);
    assert.strictEqual(h2[0].valuationDate, '2025-01-10'); // Newest first
    assert.strictEqual(h2[1].valuationDate, '2018-03-12');
  });

  // PROP-VAL-06: appendValuationRecord rejects duplicate valuationId
  it('PROP-VAL-06: appendValuationRecord rejects duplicate valuationId', () => {
    const r1 = createValuationRecord({
      valuationId: 'dup_id',
      propertyId: 'prop_001',
      marketValuePaise: 50_000_00_00n,
      valuationDate: '2024-01-01'
    });
    const h1 = appendValuationRecord([], r1);
    assert.throws(
      () => appendValuationRecord(h1, r1),
      /duplicate valuationId 'dup_id' detected/
    );
  });

  // PROP-VAL-07: appendValuationRecord rejects identical valuation date and amount for same property
  it('PROP-VAL-07: appendValuationRecord rejects redundant valuation on the same date with identical amount', () => {
    const r1 = createValuationRecord({
      valuationId: 'val_a',
      propertyId: 'prop_001',
      marketValuePaise: 50_000_00_00n,
      valuationDate: '2024-01-01'
    });
    const r2 = createValuationRecord({
      valuationId: 'val_b',
      propertyId: 'prop_001',
      marketValuePaise: 50_000_00_00n,
      valuationDate: '2024-01-01'
    });
    const h1 = appendValuationRecord([], r1);
    assert.throws(
      () => appendValuationRecord(h1, r2),
      /identical valuation entry for date '2024-01-01' already exists/
    );
  });

  // PROP-VAL-08: getLatestValuation correctly retrieves most recent valuation
  it('PROP-VAL-08: getLatestValuation retrieves the most recent valuation event accurately', () => {
    const history = [
      createValuationRecord({ valuationId: 'v1', propertyId: 'p1', marketValuePaise: 100n, valuationDate: '2020-01-01' }),
      createValuationRecord({ valuationId: 'v3', propertyId: 'p1', marketValuePaise: 300n, valuationDate: '2025-06-01' }),
      createValuationRecord({ valuationId: 'v2', propertyId: 'p1', marketValuePaise: 200n, valuationDate: '2023-01-01' })
    ];
    const latest = getLatestValuation(history);
    assert.strictEqual(latest.valuationId, 'v3');
    assert.strictEqual(latest.valuationDate, '2025-06-01');
    assert.strictEqual(latest.marketValuePaise, 300n);
    assert.strictEqual(getLatestValuation([]), null);
  });

  return { passed, total };
}
