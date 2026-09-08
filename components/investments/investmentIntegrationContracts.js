/**
 * @file investmentIntegrationContracts.js
 * @description Domain contracts, enums, status hierarchies, and validators for
 * FinLife Investments Module V1 — Phase 4: Financial Integrations.
 *
 * Invariants & Guarantees:
 * - One authoritative ledger per financial fact.
 * - All cross-module integrations are read-only projections.
 * - Missing or unavailable source data evaluates strictly to null, never zero.
 * - Exact integer-paise calculations using JavaScript BigInt bounded to signed 64-bit domain.
 * - Remainder-preserving ownership allocation (10,000 BPS = 100.00%).
 */

import {
  validateBoundedPaise,
  validateNonNegativePaise,
  MIN_PAISE,
  MAX_PAISE
} from './investmentContracts.js';

export const BANKING_RECONCILIATION_STATUS = Object.freeze({
  MATCHED: 'MATCHED',                                     // Both sides present, exact ₹0 gap
  PENDING_SETTLEMENT: 'PENDING_SETTLEMENT',               // Trade settled in broker but pending bank clearance (T+1)
  MISSING_BANK_MOVEMENT: 'MISSING_BANK_MOVEMENT',         // Investment recorded, no corresponding bank debit/credit
  MISSING_INVESTMENT_MOVEMENT: 'MISSING_INVESTMENT_MOVEMENT', // Bank debit to broker found, no investment recorded
  AMOUNT_MISMATCH: 'AMOUNT_MISMATCH',                     // Amounts differ between bank and investment
  UNLINKED_ACCOUNT: 'UNLINKED_ACCOUNT',                   // No linked funding bank account configured
  UNAVAILABLE: 'UNAVAILABLE',                             // Banking source data not accessible
  PARTIAL: 'PARTIAL'                                      // Subset of transactions matched
});

export const CFO_PROJECTION_STATUS = Object.freeze({
  COMPLETE: 'COMPLETE',       // All required components available -> netWorthPaise is calculable
  PARTIAL: 'PARTIAL',         // 1+ component unavailable -> netWorthPaise is null, unavailableSources populated
  UNAVAILABLE: 'UNAVAILABLE', // Core modules unavailable -> netWorthPaise is null
  STALE: 'STALE'              // 1+ component is stale -> netWorthPaise computed with isStale: true flag
});

export const INTEGRATION_SOURCE_TYPE = Object.freeze({
  INVESTMENTS: 'INVESTMENTS',
  BANKING: 'BANKING',
  CASHBOOK: 'CASHBOOK',
  ASSETS: 'ASSETS',
  PROPERTIES: 'PROPERTIES',
  LOANS: 'LOANS',
  P2P: 'P2P'
});

export const OWNERSHIP_SCOPE = Object.freeze({
  PERSONAL: 'PERSONAL',
  FAMILY: 'FAMILY'
});

export const CFO_CALCULATION_POLICY_VERSION = 'FINLIFE_CFO_V1';
export const TOTAL_OWNERSHIP_BPS = 10000n;

/**
 * Validates ownership BPS within [0..10,000].
 */
export function validateOwnershipBps(bps, fieldName = 'ownershipBps') {
  if (typeof bps !== 'bigint') {
    throw new TypeError(`${fieldName} must be a BigInt, received ${typeof bps}`);
  }
  if (bps < 0n || bps > TOTAL_OWNERSHIP_BPS) {
    throw new RangeError(`${fieldName} must be between 0n and 10000n, received: ${bps.toString()}`);
  }
  return bps;
}

/**
 * Deterministically allocates value by BPS preserving total with exact zero-paise leakage.
 *
 * personalPaise = floor((totalPaise * personalBps + 5,000) / 10,000)
 * otherOwnersPaise = totalPaise - personalPaise
 *
 * Guarantees: personalPaise + otherOwnersPaise === totalPaise
 */
export function allocateRemainderPreserving(totalPaise, personalBps) {
  if (totalPaise === null || totalPaise === undefined) {
    return {
      personalAllocatedPaise: null,
      otherOwnersAllocatedPaise: null,
      personalBps
    };
  }

  validateBoundedPaise(totalPaise, 'totalPaise');
  validateOwnershipBps(personalBps, 'personalBps');

  if (personalBps === TOTAL_OWNERSHIP_BPS) {
    return {
      personalAllocatedPaise: totalPaise,
      otherOwnersAllocatedPaise: 0n,
      personalBps
    };
  }

  if (personalBps === 0n) {
    return {
      personalAllocatedPaise: 0n,
      otherOwnersAllocatedPaise: totalPaise,
      personalBps
    };
  }

  // Half-up integer rounding
  const numerator = (totalPaise * personalBps) + (TOTAL_OWNERSHIP_BPS / 2n);
  const personalAllocatedPaise = numerator / TOTAL_OWNERSHIP_BPS;
  const otherOwnersAllocatedPaise = totalPaise - personalAllocatedPaise;

  validateBoundedPaise(personalAllocatedPaise, 'personalAllocatedPaise');
  validateBoundedPaise(otherOwnersAllocatedPaise, 'otherOwnersAllocatedPaise');

  return {
    personalAllocatedPaise,
    otherOwnersAllocatedPaise,
    personalBps
  };
}
