/**
 * @file investmentPropertiesIsolation.js
 * @description Boundary isolation guard between Investments and Properties modules (Phase 4).
 *
 * Invariants & Guarantees:
 * - Real Estate Properties Module strictly manages physical properties (plots, apartments, commercial).
 * - Investments Module strictly manages capital market securities (including REITs and InvITs).
 * - REITs/InvITs are securities with ISINs and Demat units; they never become physical property records.
 * - Zero overlap between property registry IDs and investment security identifiers.
 */

import { INSTRUMENT_TYPES } from './investmentContracts.js';

/**
 * Asserts strict boundary isolation between Investments and Real Estate Properties modules.
 *
 * @param {Object} params
 * @param {Array<Object>} params.investmentHoldings - Holdings from Investments module.
 * @param {Array<Object>} params.propertiesRegistry - Properties from Properties module.
 * @param {boolean} [params.throwOnViolation=false] - Whether to throw an Error on boundary violation.
 * @returns {Object} IsolationReportDTO
 */
export function assertInvestmentsPropertiesIsolation({
  investmentHoldings = [],
  propertiesRegistry = [],
  throwOnViolation = false
} = {}) {
  if (!Array.isArray(investmentHoldings)) {
    throw new TypeError('investmentHoldings must be an Array');
  }
  if (!Array.isArray(propertiesRegistry)) {
    throw new TypeError('propertiesRegistry must be an Array');
  }

  const violations = [];
  const propertyIds = new Set();

  for (const prop of propertiesRegistry) {
    if (!prop) continue;
    if (prop.id) propertyIds.add(prop.id);

    // If a property record in Properties Module claims an ISIN, that is a violation
    // because ISINs belong exclusively to capital market securities in Investments Module
    if (prop.isin) {
      violations.push({
        type: 'PHYSICAL_PROPERTY_HAS_SECURITY_ISIN',
        propertyId: prop.id,
        isin: prop.isin,
        message: `Property ${prop.id} has security ISIN ${prop.isin}. Physical properties cannot hold ISINs.`
      });
    }
  }

  let reitSecuritiesCount = 0;

  for (const holding of investmentHoldings) {
    if (!holding) continue;

    // Check if an investment holding ID collides with a property ID
    const holdingId = holding.holdingId || holding.id;
    if (holdingId && propertyIds.has(holdingId)) {
      violations.push({
        type: 'COLLIDING_IDENTIFIER',
        holdingId,
        message: `Holding identifier ${holdingId} collides with an existing property in Properties Registry.`
      });
    }

    // Check REIT/InvIT holdings: verify they are treated as securities
    if (holding.instrumentType === INSTRUMENT_TYPES.REIT_INVIT) {
      reitSecuritiesCount++;
      // REIT must not have physical property fields (e.g. sqFt, propertyType, khataNumber)
      if (holding.sqFt || holding.propertyType || holding.khataNumber) {
        violations.push({
          type: 'REIT_HAS_PHYSICAL_PROPERTY_ATTRIBUTES',
          holdingId,
          message: `REIT security ${holding.symbol || holdingId} contains physical property attributes.`
        });
      }
    }
  }

  const isIsolated = violations.length === 0;

  if (!isIsolated && throwOnViolation) {
    const msg = violations.map(v => v.message).join('; ');
    throw new Error(`Investments-Properties Isolation Violation: ${msg}`);
  }

  return Object.freeze({
    isIsolated,
    violations: Object.freeze(violations),
    reitSecuritiesCount,
    physicalPropertiesCount: propertiesRegistry.length,
    checkedAt: new Date().toISOString()
  });
}
