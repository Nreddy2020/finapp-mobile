/**
 * @file test_property_lifecycle.mjs
 * @description Invariant test suite for Property Lifecycle State Machine & Active Exclusion.
 * Verifies PROP-LIFE-01 through PROP-LIFE-10.
 */

import assert from 'assert';
import {
  canTransitionPropertyState,
  validatePropertyStateTransition,
  isActiveProperty,
  filterActiveProperties,
  assertPropertyMutable,
  ALLOWED_PROPERTY_TRANSITIONS
} from '../../components/properties/propertyLifecycleEngine.js';

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

export function runPropertyLifecycleTests() {
  passed = 0;
  total = 0;

  // PROP-LIFE-01: Valid transition from DRAFT to ACTIVE
  it('PROP-LIFE-01: Valid transition from DRAFT to ACTIVE is permitted', () => {
    assert.strictEqual(canTransitionPropertyState('DRAFT', 'ACTIVE'), true);
    assert.strictEqual(validatePropertyStateTransition('DRAFT', 'ACTIVE'), 'ACTIVE');
  });

  // PROP-LIFE-02: Valid transition from DRAFT to UNDER_CONSTRUCTION
  it('PROP-LIFE-02: Valid transition from DRAFT to UNDER_CONSTRUCTION is permitted', () => {
    assert.strictEqual(canTransitionPropertyState('DRAFT', 'UNDER_CONSTRUCTION'), true);
    assert.strictEqual(validatePropertyStateTransition('DRAFT', 'UNDER_CONSTRUCTION'), 'UNDER_CONSTRUCTION');
  });

  // PROP-LIFE-03: Valid transitions across ACTIVE, RENTED, and VACANT
  it('PROP-LIFE-03: Operational tenancy transitions (ACTIVE -> RENTED -> VACANT -> RENTED) succeed', () => {
    assert.strictEqual(validatePropertyStateTransition('ACTIVE', 'RENTED'), 'RENTED');
    assert.strictEqual(validatePropertyStateTransition('RENTED', 'VACANT'), 'VACANT');
    assert.strictEqual(validatePropertyStateTransition('VACANT', 'RENTED'), 'RENTED');
    assert.strictEqual(validatePropertyStateTransition('VACANT', 'ACTIVE'), 'ACTIVE');
  });

  // PROP-LIFE-04: Valid transition from ACTIVE to SOLD
  it('PROP-LIFE-04: Liquidating an active property to SOLD is permitted', () => {
    assert.strictEqual(canTransitionPropertyState('ACTIVE', 'SOLD'), true);
    assert.strictEqual(validatePropertyStateTransition('ACTIVE', 'SOLD'), 'SOLD');
  });

  // PROP-LIFE-05: Valid transition from SOLD to ARCHIVED
  it('PROP-LIFE-05: Archiving a settled SOLD property is permitted', () => {
    assert.strictEqual(canTransitionPropertyState('SOLD', 'ARCHIVED'), true);
    assert.strictEqual(validatePropertyStateTransition('SOLD', 'ARCHIVED'), 'ARCHIVED');
  });

  // PROP-LIFE-06: Invalid transition from DRAFT to SOLD rejected
  it('PROP-LIFE-06: Invalid transition from DRAFT directly to SOLD is rejected', () => {
    assert.strictEqual(canTransitionPropertyState('DRAFT', 'SOLD'), false);
    assert.throws(
      () => validatePropertyStateTransition('DRAFT', 'SOLD'),
      /Invalid property lifecycle transition from 'DRAFT' to 'SOLD'/
    );
  });

  // PROP-LIFE-07: ARCHIVED is terminal and cannot transition back to ACTIVE
  it('PROP-LIFE-07: ARCHIVED state is terminal and cannot transition back to ACTIVE', () => {
    assert.strictEqual(canTransitionPropertyState('ARCHIVED', 'ACTIVE'), false);
    assert.throws(
      () => validatePropertyStateTransition('ARCHIVED', 'ACTIVE'),
      /Invalid property lifecycle transition from 'ARCHIVED' to 'ACTIVE'/
    );
  });

  // PROP-LIFE-08: isActiveProperty returns true for active operational states
  it('PROP-LIFE-08: isActiveProperty identifies revenue and net-worth contributing states', () => {
    assert.strictEqual(isActiveProperty({ status: 'ACTIVE' }), true);
    assert.strictEqual(isActiveProperty({ status: 'RENTED' }), true);
    assert.strictEqual(isActiveProperty({ status: 'VACANT' }), true);
    assert.strictEqual(isActiveProperty({ status: 'UNDER_CONSTRUCTION' }), true);
  });

  // PROP-LIFE-09: isActiveProperty returns false for SOLD, TRANSFERRED, and ARCHIVED
  it('PROP-LIFE-09: isActiveProperty excludes liquidated, transferred, and archived records', () => {
    assert.strictEqual(isActiveProperty({ status: 'SOLD' }), false);
    assert.strictEqual(isActiveProperty({ status: 'TRANSFERRED' }), false);
    assert.strictEqual(isActiveProperty({ status: 'ARCHIVED' }), false);

    const properties = [
      { propertyId: 'p1', status: 'ACTIVE' },
      { propertyId: 'p2', status: 'SOLD' },
      { propertyId: 'p3', status: 'RENTED' },
      { propertyId: 'p4', status: 'ARCHIVED' }
    ];
    const active = filterActiveProperties(properties);
    assert.strictEqual(active.length, 2);
    assert.deepStrictEqual(active.map(p => p.propertyId), ['p1', 'p3']);
  });

  // PROP-LIFE-10: assertPropertyMutable blocks mutation of SOLD and ARCHIVED properties
  it('PROP-LIFE-10: assertPropertyMutable strictly guards terminal records against mutation', () => {
    assert.doesNotThrow(() => assertPropertyMutable({ status: 'ACTIVE' }));
    assert.doesNotThrow(() => assertPropertyMutable({ status: 'RENTED' }));
    assert.throws(
      () => assertPropertyMutable({ status: 'SOLD' }),
      /Cannot mutate property in terminal state 'SOLD'/
    );
    assert.throws(
      () => assertPropertyMutable({ status: 'ARCHIVED' }),
      /Cannot mutate property in terminal state 'ARCHIVED'/
    );
  });

  return { passed, total };
}
