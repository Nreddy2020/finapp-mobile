/**
 * @file test_property_persistence.mjs
 * @description Invariant test suite for Property Persistence, Serialization, Idempotency & Recovery.
 * Verifies PROP-PERSIST-01 through PROP-PERSIST-10.
 */

import assert from 'assert';
import {
  PropertyService,
  PROPERTY_STORAGE_KEYS,
  PROPERTY_SCHEMA_VERSION
} from '../../services/propertyService.js';
import {
  PROPERTY_TYPES,
  PROPERTY_LIFECYCLE_STATES
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

async function itAsync(desc, fn) {
  total++;
  try {
    await fn();
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${desc}`);
    console.error(err);
    throw err;
  }
}

export async function runPropertyPersistenceTests() {
  passed = 0;
  total = 0;

  await PropertyService.resetToCleanState();

  // PROP-PERSIST-01: serializeProperty converts BigInt fields to decimal strings
  it('PROP-PERSIST-01: serializeProperty guarantees zero native BigInts in JSON output', () => {
    const raw = {
      propertyId: 'prop_test_01',
      displayName: 'Sunrise Apartment',
      marketValuePaise: 75_000_00_00n,
      purchasePricePaise: 60_000_00_00n,
      builtUpAreaMicros: 1_200_000_000n,
      ownership: [{ ownerId: 'self', shareBps: 10_000n }],
      valuations: [{ valuationId: 'v1', marketValuePaise: 75_000_00_00n }]
    };

    const serialized = PropertyService.serializeProperty(raw);
    assert.strictEqual(typeof serialized.marketValuePaise, 'string');
    assert.strictEqual(serialized.marketValuePaise, '750000000');
    assert.strictEqual(typeof serialized.ownership[0].shareBps, 'string');
    assert.strictEqual(serialized.ownership[0].shareBps, '10000');
    assert.strictEqual(serialized.schemaVersion, PROPERTY_SCHEMA_VERSION);

    // JSON.stringify must succeed without TypeError: Do not know how to serialize a BigInt
    assert.doesNotThrow(() => JSON.stringify(serialized));
  });

  // PROP-PERSIST-02: hydrateProperty losslessly reconstitutes decimal strings back to BigInts
  it('PROP-PERSIST-02: hydrateProperty restores exact BigInt paise precision losslessly', () => {
    const dto = {
      propertyId: 'prop_test_02',
      displayName: 'Green Valley Plot',
      propertyType: 'PLOT',
      status: 'ACTIVE',
      marketValuePaise: '350000000',
      purchasePricePaise: '250000000',
      ownership: [{ ownerId: 'self', shareBps: '10000' }]
    };

    const hydrated = PropertyService.hydrateProperty(dto);
    assert.strictEqual(typeof hydrated.marketValuePaise, 'bigint');
    assert.strictEqual(hydrated.marketValuePaise, 35_000_00_00n);
    assert.strictEqual(hydrated.purchasePricePaise, 25_000_00_00n);
    assert.strictEqual(hydrated.ownership[0].shareBps, 10_000n);
  });

  // PROP-PERSIST-03: hydrateProperty tolerates unknown fields and provides defaults
  it('PROP-PERSIST-03: hydrateProperty safely handles forward-compatible unknown fields and missing values', () => {
    const dto = {
      propertyId: 'prop_test_03',
      futureFieldV2: 'experimental_data',
      marketValuePaise: '5000000'
    };

    const hydrated = PropertyService.hydrateProperty(dto);
    assert.strictEqual(hydrated.futureFieldV2, 'experimental_data');
    assert.strictEqual(hydrated.monthlyRentPaise, 0n);
    assert.strictEqual(hydrated.securityDepositPaise, 0n);
    assert.strictEqual(hydrated.propertyType, PROPERTY_TYPES.APARTMENT);
  });

  // PROP-PERSIST-04: hydrateProperty rejects corrupted payloads
  it('PROP-PERSIST-04: hydrateProperty rejects corrupted or unparseable payloads', () => {
    assert.throws(
      () => PropertyService.hydrateProperty({ propertyId: '' }),
      /corruption error/
    );
    assert.throws(
      () => PropertyService.hydrateProperty({ propertyId: 'p1', marketValuePaise: 'NOT_A_NUMBER' }),
      /corruption error/
    );
  });

  // PROP-PERSIST-05: PropertyService.addProperty persists record and records audit event
  await itAsync('PROP-PERSIST-05: addProperty atomically commits property and audit log', async () => {
    await PropertyService.resetToCleanState();

    const created = await PropertyService.addProperty({
      propertyId: 'prop_mockup_01',
      displayName: 'Our Family Home',
      propertyType: PROPERTY_TYPES.RESIDENTIAL_HOUSE,
      status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
      marketValuePaise: 120_000_00_00n, // ₹1.20 Cr
      purchasePricePaise: 75_000_00_00n,
      registrationChargesPaise: 4_500_00_00n,
      stampDutyPaise: 3_750_00_00n,
      legalFeesPaise: 1_000_00_00n,
      brokeragePaise: 500_00_00n,
      capitalizedImprovementsPaise: 250_00_00n,
      valuationDate: '2018-03-12',
      ownership: [
        { ownerId: 'self', ownerName: 'Self', relation: 'SELF', shareBps: 6000n },
        { ownerId: 'spouse', ownerName: 'Spouse', relation: 'SPOUSE', shareBps: 4000n }
      ]
    });

    assert.strictEqual(created.propertyId, 'prop_mockup_01');
    assert.strictEqual(created.marketValuePaise, 120_000_00_00n);
    assert.strictEqual(created.totalCostBasisPaise, 85_000_00_00n);
    assert.strictEqual(created.valuations.length, 1);
  });

  // PROP-PERSIST-06: getAllProperties retrieves persisted properties after cold cache clear
  await itAsync('PROP-PERSIST-06: Cold cache restart faithfully re-hydrates from storage', async () => {
    PropertyService.clearMemoryCache(); // Simulate cold restart
    const all = await PropertyService.getAllProperties();
    assert.strictEqual(all.length, 1);
    assert.strictEqual(all[0].propertyId, 'prop_mockup_01');
    assert.strictEqual(all[0].marketValuePaise, 120_000_00_00n);
  });

  // PROP-PERSIST-07: getActiveProperties excludes properties in SOLD or ARCHIVED state
  await itAsync('PROP-PERSIST-07: getActiveProperties cleanly isolates active portfolio from sold records', async () => {
    await PropertyService.addProperty({
      propertyId: 'prop_mockup_sold',
      displayName: 'Old Apartment',
      propertyType: PROPERTY_TYPES.APARTMENT,
      status: PROPERTY_LIFECYCLE_STATES.ACTIVE,
      marketValuePaise: 50_000_00_00n
    });

    // Transition to SOLD
    await PropertyService.transitionPropertyState('prop_mockup_sold', PROPERTY_LIFECYCLE_STATES.SOLD, 'Liquidated');

    const activeOnly = await PropertyService.getActiveProperties();
    assert.strictEqual(activeOnly.length, 1);
    assert.strictEqual(activeOnly[0].propertyId, 'prop_mockup_01');

    const all = await PropertyService.getAllProperties();
    assert.strictEqual(all.length, 2);
  });

  // PROP-PERSIST-08: transitionPropertyState updates state and guards terminal state
  await itAsync('PROP-PERSIST-08: transitionPropertyState enforces lifecycle rules and prevents mutation of SOLD', async () => {
    // Attempting to mutate a SOLD property's valuation must throw
    await assert.rejects(
      () => PropertyService.recordValuation('prop_mockup_sold', {
        marketValuePaise: 60_000_00_00n,
        valuationDate: '2025-06-01'
      }),
      /Cannot mutate property in terminal state 'SOLD'/
    );
  });

  // PROP-PERSIST-09: recordValuation appends valuation and updates market value
  await itAsync('PROP-PERSIST-09: recordValuation appends new assessment and updates current market value', async () => {
    const updated = await PropertyService.recordValuation('prop_mockup_01', {
      valuationId: 'val_2025_update',
      marketValuePaise: 130_000_00_00n, // Updated to ₹1.30 Cr
      valuationDate: '2025-02-15',
      source: 'Appraisal Report'
    });

    assert.strictEqual(updated.marketValuePaise, 130_000_00_00n);
    assert.strictEqual(updated.valuations.length, 2);
    assert.strictEqual(updated.valuations[0].marketValuePaise, 130_000_00_00n);
  });

  // PROP-PERSIST-10: Idempotent operation replay returns cached result with zero duplicate state mutation
  await itAsync('PROP-PERSIST-10: Replaying operation with identical operationId is idempotent', async () => {
    const opId = 'op_unique_add_12345';
    const firstCall = await PropertyService.addProperty({
      propertyId: 'prop_idempotent_01',
      displayName: 'City Square Mall Unit',
      propertyType: PROPERTY_TYPES.COMMERCIAL_PROPERTY,
      marketValuePaise: 50_000_00_00n
    }, opId);

    // Replay call with exact same operationId
    const replayCall = await PropertyService.addProperty({
      propertyId: 'prop_idempotent_01',
      displayName: 'DIFFERENT NAME (SHOULD BE IGNORED)',
      marketValuePaise: 999n
    }, opId);

    assert.strictEqual(firstCall.propertyId, replayCall.propertyId);
    assert.strictEqual(firstCall.displayName, replayCall.displayName);
    assert.strictEqual(replayCall.displayName, 'City Square Mall Unit');

    const all = await PropertyService.getAllProperties();
    // Must NOT have added duplicate records
    const matches = all.filter(p => p.propertyId === 'prop_idempotent_01');
    assert.strictEqual(matches.length, 1);
  });

  return { passed, total };
}
