/**
 * @file propertyOwnershipEngine.js
 * @description Ownership allocation and family distribution engine for the FinLife Properties Module.
 *
 * Enforces:
 * 1. Ownership shares sum to exactly 10,000 BPS (100.00%).
 * 2. Strict unique owner IDs (no duplicates).
 * 3. Non-negative, integer BigInt BPS shares.
 * 4. Deterministic largest-remainder allocation with zero remainder leakage.
 * 5. Strict separation of personal share vs full family valuation.
 */

import {
  TOTAL_OWNERSHIP_BPS,
  MIN_BPS,
  MAX_BPS,
  validateNonNegativePropertyPaise,
  validateOwnershipBps
} from './propertyContracts.js';

/**
 * Validates an array of property ownership shares.
 *
 * @param {Array<Object>} ownership
 * @returns {Array<Object>} Sanitized ownership array
 */
export function validatePropertyOwnership(ownership) {
  if (!Array.isArray(ownership) || ownership.length === 0) {
    throw new TypeError('validatePropertyOwnership: ownership must be a non-empty array');
  }

  const seenOwnerIds = new Set();
  let totalBps = 0n;

  const validated = ownership.map((entry, index) => {
    if (!entry || typeof entry !== 'object') {
      throw new TypeError(`validatePropertyOwnership: entry at index ${index} must be an object`);
    }

    const ownerId = String(entry.ownerId || '').trim();
    if (!ownerId) {
      throw new TypeError(`validatePropertyOwnership: entry at index ${index} must have a non-empty ownerId`);
    }

    if (seenOwnerIds.has(ownerId)) {
      throw new Error(`validatePropertyOwnership: duplicate ownerId '${ownerId}' detected`);
    }
    seenOwnerIds.add(ownerId);

    const shareBps = validateOwnershipBps(
      typeof entry.shareBps === 'bigint' ? entry.shareBps : BigInt(entry.shareBps),
      `shareBps for owner '${ownerId}'`
    );

    totalBps += shareBps;

    return {
      ownerId,
      ownerName: String(entry.ownerName || ownerId).trim(),
      relation: entry.relation ? String(entry.relation).trim() : 'OTHER',
      shareBps
    };
  });

  if (totalBps !== TOTAL_OWNERSHIP_BPS) {
    throw new Error(
      `validatePropertyOwnership: total ownership must equal exactly ${TOTAL_OWNERSHIP_BPS}n BPS (100.00%), received ${totalBps}n BPS`
    );
  }

  return validated;
}

/**
 * Allocates a monetary property value across multiple owners using the
 * deterministic Largest-Remainder Method (Hare-Niemeyer method).
 *
 * Invariant: Sum of allocated paise === totalPaise exactly (zero remainder leakage).
 *
 * @param {bigint} totalPaise
 * @param {Array<Object>} ownership
 * @returns {Array<Object>} Array of allocations with exact allocatedPaise
 */
export function allocatePropertyValueByBps(totalPaise, ownership) {
  validateNonNegativePropertyPaise(totalPaise, 'totalPaise');
  const validatedOwners = validatePropertyOwnership(ownership);

  if (totalPaise === 0n) {
    return validatedOwners.map(owner => ({
      ...owner,
      allocatedPaise: 0n
    }));
  }

  // 1. Calculate floor allocation and remainder for each owner
  let allocatedSum = 0n;
  const allocations = validatedOwners.map((owner, originalIndex) => {
    const floorPaise = (totalPaise * owner.shareBps) / TOTAL_OWNERSHIP_BPS;
    const remainder = (totalPaise * owner.shareBps) % TOTAL_OWNERSHIP_BPS;
    allocatedSum += floorPaise;

    return {
      ...owner,
      allocatedPaise: floorPaise,
      remainder,
      originalIndex
    };
  });

  // 2. Leftover paise to distribute
  let leftoverPaise = totalPaise - allocatedSum;

  if (leftoverPaise > 0n) {
    // Sort descending by remainder, tie-breaking deterministically by ownerId
    const sortedIndices = allocations
      .map((item, idx) => ({ idx, remainder: item.remainder, ownerId: item.ownerId }))
      .sort((a, b) => {
        if (b.remainder !== a.remainder) {
          return b.remainder > a.remainder ? 1 : -1;
        }
        return a.ownerId.localeCompare(b.ownerId);
      });

    // Distribute 1 paise to the top leftover owners
    for (let i = 0n; i < leftoverPaise; i++) {
      const targetIdx = sortedIndices[Number(i)].idx;
      allocations[targetIdx].allocatedPaise += 1n;
    }
  }

  // 3. Verify absolute zero-leakage invariant
  const finalSum = allocations.reduce((acc, curr) => acc + curr.allocatedPaise, 0n);
  if (finalSum !== totalPaise) {
    throw new Error(
      `allocatePropertyValueByBps invariant failure: final sum ${finalSum}n does not equal source ${totalPaise}n`
    );
  }

  return allocations.map(({ remainder, originalIndex, ...clean }) => clean);
}

/**
 * Calculates user's personal property share vs total family valuation.
 *
 * @param {bigint} totalPaise
 * @param {Array<Object>} ownership
 * @param {string} [currentUserId='self']
 * @returns {Object} { personalPaise, familyPaise, userShareBps }
 */
export function calculateUserAndFamilyPropertyShare(totalPaise, ownership, currentUserId = 'self') {
  const allocations = allocatePropertyValueByBps(totalPaise, ownership);
  const userEntry = allocations.find(
    o => o.ownerId.toLowerCase() === currentUserId.toLowerCase()
  );

  return {
    personalPaise: userEntry ? userEntry.allocatedPaise : 0n,
    familyPaise: totalPaise,
    userShareBps: userEntry ? userEntry.shareBps : 0n,
    allocations
  };
}
