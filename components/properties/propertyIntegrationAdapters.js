/**
 * @file propertyIntegrationAdapters.js
 * @description FinLife Properties Module — Read-Only Integration Adapters.
 * 
 * Provides:
 * 1. Formal Loan Integration (`services/loans/`):
 *    - Resolves linked mortgage/home loan facilities in a strictly read-only manner.
 *    - Enforces 3 discrete states:
 *      * No linked loan: status 'AVAILABLE', outstandingPrincipalPaise = 0n.
 *      * Linked loan resolved: status 'AVAILABLE', outstandingPrincipalPaise = facility.outstandingPrincipalPaise.
 *      * Linked loan cannot be resolved: status 'UNAVAILABLE', reason = 'LINKED_LOAN_BALANCE_UNAVAILABLE' (NEVER 0n).
 * 2. Net Property Equity Engine:
 *    - Net Equity = Market Value - Outstanding Loan Principal.
 *    - Preserves signed negative equity for underwater properties.
 * 3. Formal Loan EMI vs Operating Expense Boundary:
 *    - Explicitly guards that loan EMI is a debt financing obligation, NOT a property OpEx.
 * 4. Assets Module Boundary & Isolation:
 *    - Strict separation guaranteeing Properties are never double-counted into Assets categories.
 */

import {
  validateNonNegativePropertyPaise,
  validateSignedPropertyPaise,
  validateMarketValue,
  MIN_PROPERTY_PAISE
} from './propertyContracts.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';

export const PROPERTY_PROJECTION_STATUS = Object.freeze({
  AVAILABLE:   'AVAILABLE',
  UNAVAILABLE: 'UNAVAILABLE',
  PARTIAL:     'PARTIAL'
});

export const LOAN_UNAVAILABLE_REASON = 'LINKED_LOAN_BALANCE_UNAVAILABLE';

/**
 * Resolves a linked formal loan facility in a strictly read-only manner.
 *
 * Distinguishes 3 distinct states:
 * 1. No linked loan -> status: 'AVAILABLE', outstandingPrincipalPaise: 0n.
 * 2. Linked loan resolved -> status: 'AVAILABLE', dynamic outstanding principal.
 * 3. Linked loan missing/unresolvable -> status: 'UNAVAILABLE' (NEVER 0n).
 *
 * @param {string|null|undefined} linkedLoanId
 * @param {Object} [options]
 * @param {boolean} [options.isAvailable=true]
 * @param {Function} [options.loanProvider=null]
 * @returns {Promise<Object>}
 */
export async function getLinkedPropertyLoanProjection(linkedLoanId, {
  isAvailable = true,
  loanProvider = null
} = {}) {
  // Case 1: Unlinked property has explicitly zero debt
  if (!linkedLoanId || typeof linkedLoanId !== 'string' || linkedLoanId.trim() === '') {
    return {
      status: PROPERTY_PROJECTION_STATUS.AVAILABLE,
      linkedLoanId: null,
      outstandingPrincipalPaise: 0n,
      monthlyEmiPaise: 0n,
      interestRateBps: 0n,
      facilityName: null,
      isReadOnlyProjection: true
    };
  }

  const cleanLoanId = linkedLoanId.trim();

  // Case 3a: External system declared unavailable
  if (!isAvailable) {
    return {
      status: PROPERTY_PROJECTION_STATUS.UNAVAILABLE,
      linkedLoanId: cleanLoanId,
      outstandingPrincipalPaise: null,
      monthlyEmiPaise: null,
      reason: LOAN_UNAVAILABLE_REASON,
      error: 'Loan subsystem marked unavailable',
      isReadOnlyProjection: true
    };
  }

  try {
    const facility = loanProvider
      ? await loanProvider(cleanLoanId)
      : await LoanRepository.getFacilityById(cleanLoanId);

    // Case 3b: Facility not found in repository
    if (!facility) {
      return {
        status: PROPERTY_PROJECTION_STATUS.UNAVAILABLE,
        linkedLoanId: cleanLoanId,
        outstandingPrincipalPaise: null,
        monthlyEmiPaise: null,
        reason: LOAN_UNAVAILABLE_REASON,
        error: `Loan facility '${cleanLoanId}' not found`,
        isReadOnlyProjection: true
      };
    }

    // Case 2: Successfully resolved.
    // INVARIANT: Uses dynamic outstanding principal, NEVER original loan amount!
    const outstandingRaw = facility.outstandingPrincipalPaise !== undefined
      ? facility.outstandingPrincipalPaise
      : facility.principalPaise;

    const outstandingPrincipalPaise = validateNonNegativePropertyPaise(
      typeof outstandingRaw === 'bigint' ? outstandingRaw : BigInt(outstandingRaw ?? 0n),
      'outstandingPrincipalPaise'
    );

    const monthlyEmiPaise = facility.monthlyEmiPaise !== undefined
      ? validateNonNegativePropertyPaise(
          typeof facility.monthlyEmiPaise === 'bigint' ? facility.monthlyEmiPaise : BigInt(facility.monthlyEmiPaise ?? 0n),
          'monthlyEmiPaise'
        )
      : 0n;

    const interestRateBps = facility.interestRateBps !== undefined
      ? BigInt(facility.interestRateBps ?? 0n)
      : 0n;

    return {
      status: PROPERTY_PROJECTION_STATUS.AVAILABLE,
      linkedLoanId: cleanLoanId,
      facilityName: facility.name || facility.facilityName || 'Home Loan',
      outstandingPrincipalPaise,
      monthlyEmiPaise,
      interestRateBps,
      loanStatus: facility.status || 'ACTIVE',
      originalPrincipalPaise: facility.principalPaise !== undefined
        ? BigInt(facility.principalPaise)
        : outstandingPrincipalPaise,
      isReadOnlyProjection: true
    };
  } catch (err) {
    return {
      status: PROPERTY_PROJECTION_STATUS.UNAVAILABLE,
      linkedLoanId: cleanLoanId,
      outstandingPrincipalPaise: null,
      monthlyEmiPaise: null,
      reason: LOAN_UNAVAILABLE_REASON,
      error: err.message,
      isReadOnlyProjection: true
    };
  }
}

/**
 * Calculates net property equity taking into account the linked loan projection.
 *
 * Formula: Net Equity = Market Value - Outstanding Principal
 * Supports signed negative equity for underwater properties.
 *
 * @param {Object} property - Property record with marketValuePaise
 * @param {Object} loanProjection - Output from getLinkedPropertyLoanProjection
 * @returns {Object}
 */
export function calculatePropertyNetEquityWithLoan(property, loanProjection) {
  if (!property || typeof property !== 'object') {
    throw new TypeError('calculatePropertyNetEquityWithLoan: property must be an object');
  }
  if (!loanProjection || typeof loanProjection !== 'object') {
    throw new TypeError('calculatePropertyNetEquityWithLoan: loanProjection must be an object');
  }

  const marketValuePaise = validateMarketValue(
    typeof property.marketValuePaise === 'bigint'
      ? property.marketValuePaise
      : BigInt(property.marketValuePaise ?? 0n)
  );

  // If loan projection is UNAVAILABLE, net equity cannot be safely determined.
  // INVARIANT: Never silently assume 0 debt!
  if (
    loanProjection.status !== PROPERTY_PROJECTION_STATUS.AVAILABLE ||
    loanProjection.outstandingPrincipalPaise === null ||
    loanProjection.outstandingPrincipalPaise === undefined
  ) {
    return {
      status: PROPERTY_PROJECTION_STATUS.UNAVAILABLE,
      reason: loanProjection.reason || LOAN_UNAVAILABLE_REASON,
      marketValuePaise,
      outstandingPrincipalPaise: null,
      netEquityPaise: null,
      isUnderwater: false,
      loanToValueBps: null,
      isReadOnlyProjection: true
    };
  }

  const outstandingLoanPaise = validateNonNegativePropertyPaise(
    loanProjection.outstandingPrincipalPaise,
    'loanProjection.outstandingPrincipalPaise'
  );

  // Signed 64-bit calculation: can be negative (underwater)
  const netEquityPaise = validateSignedPropertyPaise(
    marketValuePaise - outstandingLoanPaise,
    'netEquityPaise'
  );

  const isUnderwater = netEquityPaise < 0n;

  // Loan to Value (LTV) in BPS: floor(outstanding * 10,000 / marketValue)
  let loanToValueBps = 0n;
  if (marketValuePaise > 0n) {
    loanToValueBps = (outstandingLoanPaise * 10_000n) / marketValuePaise;
  } else if (outstandingLoanPaise > 0n) {
    // If property has zero market value but non-zero debt, LTV is effectively infinite or 100%+
    loanToValueBps = 10_000n;
  }

  return {
    status: PROPERTY_PROJECTION_STATUS.AVAILABLE,
    marketValuePaise,
    outstandingPrincipalPaise: outstandingLoanPaise,
    netEquityPaise,
    isUnderwater,
    loanToValueBps,
    monthlyEmiPaise: loanProjection.monthlyEmiPaise ?? 0n,
    linkedLoanId: loanProjection.linkedLoanId,
    isReadOnlyProjection: true
  };
}

/**
 * Validates that Loan EMI is never classified as a property operating expense.
 * Invariant PROP-INT-06: EMI is a debt financing obligation, not property OpEx.
 *
 * @param {string} expenseCategory
 * @returns {boolean} true if valid property OpEx, throws error if loan EMI
 */
export function assertNotLoanEmiOperatingExpense(expenseCategory) {
  const norm = String(expenseCategory || '').trim().toUpperCase();
  if (norm === 'LOAN_EMI' || norm === 'MORTGAGE_EMI' || norm === 'EMI' || norm === 'DEBT_SERVICE') {
    throw new Error(
      `Financial boundary violation: Loan EMI (${expenseCategory}) cannot be recorded as property operating expense. Use Loans module.`
    );
  }
  return true;
}
