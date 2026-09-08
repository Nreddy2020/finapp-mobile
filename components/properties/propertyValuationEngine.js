/**
 * @file propertyValuationEngine.js
 * @description Valuation management and historical assessment engine for the FinLife Properties Module.
 *
 * Enforces:
 * 1. Explicit valuation records with methodology and confidence ratings.
 * 2. Immutable chronological valuation history.
 * 3. Prevention of duplicate valuation events.
 * 4. Clear separation between purchase cost basis and current market valuation.
 */

import {
  validateMarketValue,
  validateValuationMethod,
  validateValuationConfidence,
  VALUATION_METHODS,
  VALUATION_CONFIDENCE
} from './propertyContracts.js';

/**
 * Creates and validates a new property valuation record.
 *
 * @param {Object} params
 * @param {string} params.valuationId
 * @param {string} params.propertyId
 * @param {bigint} params.marketValuePaise
 * @param {string} params.valuationDate YYYY-MM-DD
 * @param {string} [params.method=VALUATION_METHODS.MANUAL_ESTIMATE]
 * @param {string} [params.confidence=VALUATION_CONFIDENCE.MEDIUM]
 * @param {string} [params.source='User Estimate']
 * @param {string} [params.notes='']
 * @returns {Object} Sanitized valuation record
 */
export function createValuationRecord(params) {
  if (!params || typeof params !== 'object') {
    throw new TypeError('createValuationRecord: params must be an object');
  }

  const valuationId = String(params.valuationId || '').trim();
  if (!valuationId) {
    throw new TypeError('createValuationRecord: valuationId is required');
  }

  const propertyId = String(params.propertyId || '').trim();
  if (!propertyId) {
    throw new TypeError('createValuationRecord: propertyId is required');
  }

  const marketValuePaise = validateMarketValue(params.marketValuePaise);

  const valuationDate = String(params.valuationDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valuationDate)) {
    throw new TypeError(`createValuationRecord: invalid valuationDate '${valuationDate}'. Expected YYYY-MM-DD`);
  }

  const method = validateValuationMethod(params.method || VALUATION_METHODS.MANUAL_ESTIMATE);
  const confidence = validateValuationConfidence(params.confidence || VALUATION_CONFIDENCE.MEDIUM);
  const source = String(params.source || 'User Estimate').trim();
  const notes = String(params.notes || '').trim();

  return Object.freeze({
    valuationId,
    propertyId,
    marketValuePaise,
    valuationDate,
    method,
    confidence,
    source,
    notes,
    createdAt: new Date().toISOString()
  });
}

/**
 * Appends a new valuation record to a property's valuation history,
 * guaranteeing deduplication and chronological ordering.
 *
 * @param {Array<Object>} history
 * @param {Object} newRecord
 * @returns {Array<Object>} Updated, sorted valuation history (newest first)
 */
export function appendValuationRecord(history, newRecord) {
  const currentHistory = Array.isArray(history) ? [...history] : [];
  const validatedRecord = createValuationRecord(newRecord);

  // Check duplicate valuationId
  if (currentHistory.some(r => r.valuationId === validatedRecord.valuationId)) {
    throw new Error(`appendValuationRecord: duplicate valuationId '${validatedRecord.valuationId}' detected`);
  }

  // Check duplicate date + value combination for the same property
  const duplicateEntry = currentHistory.find(
    r => r.valuationDate === validatedRecord.valuationDate &&
         r.marketValuePaise === validatedRecord.marketValuePaise
  );
  if (duplicateEntry) {
    throw new Error(
      `appendValuationRecord: identical valuation entry for date '${validatedRecord.valuationDate}' already exists`
    );
  }

  currentHistory.push(validatedRecord);

  // Sort descending by valuationDate (newest first)
  currentHistory.sort((a, b) => b.valuationDate.localeCompare(a.valuationDate));

  return Object.freeze(currentHistory);
}

/**
 * Retrieves the latest verified or active valuation from history.
 *
 * @param {Array<Object>} history
 * @returns {Object|null}
 */
export function getLatestValuation(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return null;
  }
  // If sorted newest-first, index 0 is latest
  const sorted = [...history].sort((a, b) => b.valuationDate.localeCompare(a.valuationDate));
  return sorted[0];
}
