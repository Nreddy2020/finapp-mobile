/**
 * @file test_property_ownership.mjs
 * @description Invariant test suite for Property Ownership & Largest-Remainder Allocation.
 * Verifies PROP-OWN-01 through PROP-OWN-10.
 */

import assert from 'assert';
import {
  validatePropertyOwnership,
  allocatePropertyValueByBps,
  calculateUserAndFamilyPropertyShare
} from '../../components/properties/propertyOwnershipEngine.js';
import { MAX_PROPERTY_PAISE } from '../../components/properties/propertyContracts.js';

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

export function runPropertyOwnershipTests() {
  passed = 0;
  total = 0;

  // PROP-OWN-01: Validates that ownership BPS sums to exactly 10,000n
  it('PROP-OWN-01: Ownership validation accepts shares totaling exactly 10,000 BPS', () => {
    const ownership = [
      { ownerId: 'self', ownerName: 'Self', shareBps: 6000n },
      { ownerId: 'spouse', ownerName: 'Spouse', shareBps: 4000n }
    ];
    const validated = validatePropertyOwnership(ownership);
    assert.strictEqual(validated.length, 2);
    assert.strictEqual(validated[0].shareBps, 6000n);
    assert.strictEqual(validated[1].shareBps, 4000n);
  });

  // PROP-OWN-02: Rejects ownership summing to 9,999 BPS
  it('PROP-OWN-02: Rejects ownership shares summing to 9,999 BPS', () => {
    const ownership = [
      { ownerId: 'self', shareBps: 5000n },
      { ownerId: 'spouse', shareBps: 4999n }
    ];
    assert.throws(
      () => validatePropertyOwnership(ownership),
      /total ownership must equal exactly 10000n BPS/
    );
  });

  // PROP-OWN-03: Rejects ownership summing to 10,001 BPS
  it('PROP-OWN-03: Rejects ownership shares summing to 10,001 BPS', () => {
    const ownership = [
      { ownerId: 'self', shareBps: 5001n },
      { ownerId: 'spouse', shareBps: 5000n }
    ];
    assert.throws(
      () => validatePropertyOwnership(ownership),
      /total ownership must equal exactly 10000n BPS/
    );
  });

  // PROP-OWN-04: Rejects duplicate ownerId entries
  it('PROP-OWN-04: Rejects duplicate ownerId entries', () => {
    const ownership = [
      { ownerId: 'self', shareBps: 5000n },
      { ownerId: 'self', shareBps: 5000n }
    ];
    assert.throws(
      () => validatePropertyOwnership(ownership),
      /duplicate ownerId 'self' detected/
    );
  });

  // PROP-OWN-05: Rejects empty or non-array ownership
  it('PROP-OWN-05: Rejects empty or malformed ownership arrays', () => {
    assert.throws(() => validatePropertyOwnership([]), /non-empty array/);
    assert.throws(() => validatePropertyOwnership(null), /non-empty array/);
    assert.throws(() => validatePropertyOwnership([{ ownerId: '', shareBps: 10000n }]), /non-empty ownerId/);
  });

  // PROP-OWN-06: Deterministic largest-remainder allocation with ₹1 (100 paise) across 3 owners
  it('PROP-OWN-06: Largest-remainder allocation with ₹1 (100 paise) across 3 owners has zero leakage', () => {
    const ownership = [
      { ownerId: 'owner_a', shareBps: 3333n },
      { ownerId: 'owner_b', shareBps: 3333n },
      { ownerId: 'owner_c', shareBps: 3334n }
    ];
    const totalPaise = 100n; // ₹1.00
    const allocations = allocatePropertyValueByBps(totalPaise, ownership);
    const sum = allocations.reduce((acc, curr) => acc + curr.allocatedPaise, 0n);
    assert.strictEqual(sum, totalPaise); // 100% exact, 0 remainder leakage
  });

  // PROP-OWN-07: Largest-remainder allocation with ₹2 (200 paise) across uneven shares (50%, 25%, 25%)
  it('PROP-OWN-07: Largest-remainder allocation with ₹2 (200 paise) sums exactly to 200 paise', () => {
    const ownership = [
      { ownerId: 'self', shareBps: 5000n },
      { ownerId: 'spouse', shareBps: 2500n },
      { ownerId: 'child', shareBps: 2500n }
    ];
    const totalPaise = 200n;
    const allocations = allocatePropertyValueByBps(totalPaise, ownership);
    assert.strictEqual(allocations[0].allocatedPaise, 100n);
    assert.strictEqual(allocations[1].allocatedPaise, 50n);
    assert.strictEqual(allocations[2].allocatedPaise, 50n);
    const sum = allocations.reduce((acc, curr) => acc + curr.allocatedPaise, 0n);
    assert.strictEqual(sum, totalPaise);
  });

  // PROP-OWN-08: Largest-remainder allocation with ₹500 crore property
  it('PROP-OWN-08: Largest-remainder allocation handles ₹500 crore maximum ceiling with exact precision', () => {
    const ownership = [
      { ownerId: 'self', shareBps: 6000n },
      { ownerId: 'spouse', shareBps: 4000n }
    ];
    const totalPaise = MAX_PROPERTY_PAISE; // 500_000_000_000n
    const allocations = allocatePropertyValueByBps(totalPaise, ownership);
    assert.strictEqual(allocations[0].allocatedPaise, 300_000_000_000n);
    assert.strictEqual(allocations[1].allocatedPaise, 200_000_000_000n);
    const sum = allocations.reduce((acc, curr) => acc + curr.allocatedPaise, 0n);
    assert.strictEqual(sum, totalPaise);
  });

  // PROP-OWN-09: Deterministic tie-breaking on remainder using ownerId
  it('PROP-OWN-09: Identical remainders break ties deterministically by ownerId alphabetically', () => {
    const ownership = [
      { ownerId: 'z_owner', shareBps: 5000n },
      { ownerId: 'a_owner', shareBps: 5000n }
    ];
    // 3 paise across two 50% shares -> 1.5 paise each -> floor 1, remainder 5000 each, 1 paise leftover
    // 'a_owner' wins the tie-breaker before 'z_owner'
    const allocations = allocatePropertyValueByBps(3n, ownership);
    const a = allocations.find(o => o.ownerId === 'a_owner');
    const z = allocations.find(o => o.ownerId === 'z_owner');
    assert.strictEqual(a.allocatedPaise, 2n);
    assert.strictEqual(z.allocatedPaise, 1n);
    assert.strictEqual(a.allocatedPaise + z.allocatedPaise, 3n);
  });

  // PROP-OWN-10: Personal vs family separation correctly retrieves personal share and family total
  it('PROP-OWN-10: Personal vs family separation accurately derives individual and household values', () => {
    // Mockup: ₹1,20,00,000 total; Self 60%, Spouse 40%
    // Personal = ₹72,00,000, Family = ₹1,20,00,000
    const ownership = [
      { ownerId: 'self', shareBps: 6000n },
      { ownerId: 'spouse', shareBps: 4000n }
    ];
    const result = calculateUserAndFamilyPropertyShare(120_000_00_00n, ownership, 'self');
    assert.strictEqual(result.personalPaise, 72_000_00_00n);
    assert.strictEqual(result.familyPaise, 120_000_00_00n);
    assert.strictEqual(result.userShareBps, 6000n);
  });

  return { passed, total };
}
