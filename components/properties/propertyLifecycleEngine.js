/**
 * @file propertyLifecycleEngine.js
 * @description Formal lifecycle state machine and active portfolio exclusion engine
 * for the FinLife Properties Module.
 *
 * Enforces:
 * 1. Explicit directed state transitions across all 10 property states.
 * 2. Immutable protection for SOLD, TRANSFERRED, and ARCHIVED records.
 * 3. Strict exclusion of non-active properties from wealth and net-worth calculations.
 */

import {
  PROPERTY_LIFECYCLE_STATES,
  validatePropertyState
} from './propertyContracts.js';

/**
 * Directed state transition matrix.
 * Terminal states (SOLD, TRANSFERRED, ARCHIVED) have highly restricted transitions.
 */
export const ALLOWED_PROPERTY_TRANSITIONS = Object.freeze({
  [PROPERTY_LIFECYCLE_STATES.DRAFT]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.ACTIVE,
    PROPERTY_LIFECYCLE_STATES.UNDER_CONSTRUCTION,
    PROPERTY_LIFECYCLE_STATES.ARCHIVED
  ]),
  [PROPERTY_LIFECYCLE_STATES.UNDER_CONSTRUCTION]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.ACTIVE,
    PROPERTY_LIFECYCLE_STATES.VACANT,
    PROPERTY_LIFECYCLE_STATES.DISPUTED,
    PROPERTY_LIFECYCLE_STATES.ARCHIVED
  ]),
  [PROPERTY_LIFECYCLE_STATES.ACTIVE]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.RENTED,
    PROPERTY_LIFECYCLE_STATES.VACANT,
    PROPERTY_LIFECYCLE_STATES.PARTIALLY_SOLD,
    PROPERTY_LIFECYCLE_STATES.TRANSFERRED,
    PROPERTY_LIFECYCLE_STATES.SOLD,
    PROPERTY_LIFECYCLE_STATES.DISPUTED,
    PROPERTY_LIFECYCLE_STATES.ARCHIVED
  ]),
  [PROPERTY_LIFECYCLE_STATES.RENTED]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.VACANT,
    PROPERTY_LIFECYCLE_STATES.ACTIVE,
    PROPERTY_LIFECYCLE_STATES.PARTIALLY_SOLD,
    PROPERTY_LIFECYCLE_STATES.DISPUTED,
    PROPERTY_LIFECYCLE_STATES.SOLD
  ]),
  [PROPERTY_LIFECYCLE_STATES.VACANT]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.RENTED,
    PROPERTY_LIFECYCLE_STATES.ACTIVE,
    PROPERTY_LIFECYCLE_STATES.PARTIALLY_SOLD,
    PROPERTY_LIFECYCLE_STATES.DISPUTED,
    PROPERTY_LIFECYCLE_STATES.SOLD,
    PROPERTY_LIFECYCLE_STATES.ARCHIVED
  ]),
  [PROPERTY_LIFECYCLE_STATES.PARTIALLY_SOLD]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.ACTIVE,
    PROPERTY_LIFECYCLE_STATES.RENTED,
    PROPERTY_LIFECYCLE_STATES.VACANT,
    PROPERTY_LIFECYCLE_STATES.SOLD,
    PROPERTY_LIFECYCLE_STATES.DISPUTED
  ]),
  [PROPERTY_LIFECYCLE_STATES.DISPUTED]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.ACTIVE,
    PROPERTY_LIFECYCLE_STATES.RENTED,
    PROPERTY_LIFECYCLE_STATES.VACANT,
    PROPERTY_LIFECYCLE_STATES.ARCHIVED
  ]),
  [PROPERTY_LIFECYCLE_STATES.TRANSFERRED]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.ARCHIVED
  ]),
  [PROPERTY_LIFECYCLE_STATES.SOLD]: Object.freeze([
    PROPERTY_LIFECYCLE_STATES.ARCHIVED
  ]),
  [PROPERTY_LIFECYCLE_STATES.ARCHIVED]: Object.freeze([]) // Terminal state
});

/**
 * Checks whether a lifecycle state transition is allowed.
 *
 * @param {string} fromState
 * @param {string} toState
 * @returns {boolean}
 */
export function canTransitionPropertyState(fromState, toState) {
  try {
    const validFrom = validatePropertyState(fromState);
    const validTo = validatePropertyState(toState);

    if (validFrom === validTo) {
      return true; // No-op transition is allowed
    }

    const allowed = ALLOWED_PROPERTY_TRANSITIONS[validFrom] || [];
    return allowed.includes(validTo);
  } catch {
    return false;
  }
}

/**
 * Validates and enforces a state transition, throwing descriptive errors on failure.
 *
 * @param {string} fromState
 * @param {string} toState
 * @returns {string} The new valid state
 */
export function validatePropertyStateTransition(fromState, toState) {
  const validFrom = validatePropertyState(fromState);
  const validTo = validatePropertyState(toState);

  if (validFrom === validTo) {
    return validTo;
  }

  const allowed = ALLOWED_PROPERTY_TRANSITIONS[validFrom] || [];
  if (!allowed.includes(validTo)) {
    throw new Error(
      `Invalid property lifecycle transition from '${validFrom}' to '${validTo}'. Allowed transitions: [${allowed.join(', ')}]`
    );
  }

  return validTo;
}

/**
 * Identifies if a property is in an active portfolio state that contributes to net worth.
 * Excludes SOLD, TRANSFERRED, and ARCHIVED properties.
 *
 * @param {string|Object} propertyOrState
 * @returns {boolean}
 */
export function isActiveProperty(propertyOrState) {
  const state = typeof propertyOrState === 'object' && propertyOrState !== null
    ? propertyOrState.status
    : propertyOrState;

  const validState = validatePropertyState(state);
  return (
    validState !== PROPERTY_LIFECYCLE_STATES.SOLD &&
    validState !== PROPERTY_LIFECYCLE_STATES.TRANSFERRED &&
    validState !== PROPERTY_LIFECYCLE_STATES.ARCHIVED
  );
}

/**
 * Filters a list of properties to include only those actively contributing to wealth.
 *
 * @param {Array<Object>} properties
 * @returns {Array<Object>} Active properties
 */
export function filterActiveProperties(properties) {
  if (!Array.isArray(properties)) {
    return [];
  }
  return properties.filter(p => isActiveProperty(p));
}

/**
 * Asserts that a property record is open to financial or operational mutations.
 * Throws an error if the property is in SOLD or ARCHIVED state.
 *
 * @param {Object} property
 */
export function assertPropertyMutable(property) {
  if (!property || typeof property !== 'object') {
    throw new TypeError('assertPropertyMutable: property must be an object');
  }

  const state = validatePropertyState(property.status);
  if (state === PROPERTY_LIFECYCLE_STATES.SOLD || state === PROPERTY_LIFECYCLE_STATES.ARCHIVED) {
    throw new Error(`Cannot mutate property in terminal state '${state}'`);
  }
}
