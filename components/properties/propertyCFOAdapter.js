/**
 * @file propertyCFOAdapter.js
 * @description FinLife Properties Module — Personal CFO Consolidated Balance Sheet Projection Adapter.
 *
 * Invariants & Guarantees:
 * - Read-Only Projection: Exposes real estate metrics without mutating properties, loans, or cashbooks.
 * - Single Authoritative Source: Real estate values belong to Properties; formal loans belong to Loans.
 * - Strict Non-Duplication:
 *   * Property value is NOT included in Assets module categories.
 *   * Linked mortgage is NOT registered as a duplicate loan facility.
 *   * Projection generation does NOT generate synthetic Cashbook transactions.
 * - Accurate Personal vs Family Attribution:
 *   * Personal property value uses the certified 10,000 BPS largest-remainder engine.
 *   * Personal debt is attributed according to ownership share (not whole family debt).
 *   * Family and personal views reconcile deterministically.
 * - Security Deposit Liability: Tenant security deposits are exposed as a liability, never income.
 * - Unavailable Sources Guard: Unreachable loans trigger explicit UNAVAILABLE/PARTIAL status (never ₹0).
 */

import {
  validateNonNegativePropertyPaise,
  validateSignedPropertyPaise,
  validateMarketValue,
  TOTAL_OWNERSHIP_BPS,
  PROPERTY_LIFECYCLE_STATES
} from './propertyContracts.js';
import {
  getLinkedPropertyLoanProjection,
  calculatePropertyNetEquityWithLoan,
  PROPERTY_PROJECTION_STATUS,
  LOAN_UNAVAILABLE_REASON
} from './propertyIntegrationAdapters.js';
import {
  allocatePropertyValueByBps,
  calculateUserAndFamilyPropertyShare
} from './propertyOwnershipEngine.js';
import { isActiveProperty, filterActiveProperties } from './propertyLifecycleEngine.js';
import { calculateAnnualGrossRent, calculateNetRentalIncome } from './propertyRentalEngine.js';

/**
 * Generates the authoritative Real Estate projection for Personal CFO balance sheet integration.
 *
 * @param {Object} options
 * @param {Array<Object>} [options.propertiesList=[]] - Property records
 * @param {Function} [options.loanProvider=null] - Optional mock/provider for loan resolution
 * @param {string} [options.targetMemberId='self'] - Primary user ID for personal breakdown
 * @param {boolean} [options.isAvailable=true] - System availability flag
 * @returns {Promise<Object>} CFO Real Estate projection
 */
export async function getRealEstateCFOProjection({
  propertiesList = [],
  loanProvider = null,
  targetMemberId = 'self',
  isAvailable = true
} = {}) {
  // Guard: Source unavailable
  if (!isAvailable) {
    return {
      source: 'properties',
      status: PROPERTY_PROJECTION_STATUS.UNAVAILABLE,
      reason: 'PROPERTIES_SOURCE_UNAVAILABLE',
      familyMarketValuePaise: null,
      personalMarketValuePaise: null,
      linkedLoanPrincipalPaise: null,
      personalLoanPrincipalPaise: null,
      familyNetEquityPaise: null,
      personalNetEquityPaise: null,
      rental: null,
      securityDepositsLiabilityPaise: null,
      isReadOnlyProjection: true
    };
  }

  // Filter out terminal properties (SOLD, ARCHIVED)
  const activeProperties = filterActiveProperties(propertiesList);

  let familyMarketValue = 0n;
  let personalMarketValue = 0n;
  let familyLoanPrincipal = 0n;
  let personalLoanPrincipal = 0n;
  let familyNetEquity = 0n;
  let personalNetEquity = 0n;

  let totalAnnualGrossRent = 0n;
  let totalAnnualOpEx = 0n;
  let totalSecurityDeposits = 0n;

  let hasUnavailableLoan = false;
  const unavailableProperties = [];
  const propertyProjections = [];

  for (const prop of activeProperties) {
    const mv = validateMarketValue(
      typeof prop.marketValuePaise === 'bigint' ? prop.marketValuePaise : BigInt(prop.marketValuePaise ?? 0n)
    );
    familyMarketValue += mv;

    // 1. Personal market value allocation using certified 10,000 BPS engine
    const ownership = prop.ownership || [{ ownerId: 'self', shareBps: 10_000n }];
    const { personalPaise: personalMv, userShareBps } = calculateUserAndFamilyPropertyShare(
      mv,
      ownership,
      targetMemberId
    );
    personalMarketValue += personalMv;

    // 2. Resolve linked loan in read-only mode
    const loanProj = await getLinkedPropertyLoanProjection(prop.linkedLoanId, {
      isAvailable: true,
      loanProvider
    });

    if (loanProj.status === PROPERTY_PROJECTION_STATUS.UNAVAILABLE) {
      hasUnavailableLoan = true;
      unavailableProperties.push({
        propertyId: prop.propertyId,
        linkedLoanId: prop.linkedLoanId,
        reason: loanProj.reason || LOAN_UNAVAILABLE_REASON
      });
      propertyProjections.push({
        propertyId: prop.propertyId,
        marketValuePaise: mv,
        personalMarketValuePaise: personalMv,
        loanStatus: PROPERTY_PROJECTION_STATUS.UNAVAILABLE,
        equityStatus: PROPERTY_PROJECTION_STATUS.UNAVAILABLE
      });
      continue;
    }

    const loanOutstanding = loanProj.outstandingPrincipalPaise;
    familyLoanPrincipal += loanOutstanding;

    // Personal loan attribution: Proportional to user's ownership share (BPS) using deterministic largest-remainder
    // INVARIANT: Do NOT subtract entire family debt from user's personal share! Guarantees 0 remainder drift across co-owners.
    const { personalPaise: personalLoan } = calculateUserAndFamilyPropertyShare(
      loanOutstanding,
      ownership,
      targetMemberId
    );
    personalLoanPrincipal += personalLoan;

    // Net Equity (Signed BigInt: supports underwater mortgages)
    const propFamilyEquity = validateSignedPropertyPaise(mv - loanOutstanding, 'propFamilyEquity');
    const propPersonalEquity = validateSignedPropertyPaise(personalMv - personalLoan, 'propPersonalEquity');

    familyNetEquity += propFamilyEquity;
    personalNetEquity += propPersonalEquity;

    // 3. Rental performance aggregation
    if (prop.tenancy || prop.monthlyRentPaise) {
      const monthlyRent = prop.tenancy?.monthlyRentPaise ?? prop.monthlyRentPaise ?? 0n;
      const annualGross = calculateAnnualGrossRent(monthlyRent);
      totalAnnualGrossRent += annualGross;

      // Operating expenses
      let propOpEx = 0n;
      if (Array.isArray(prop.operatingExpenses)) {
        for (const exp of prop.operatingExpenses) {
          propOpEx += BigInt(exp.amountPaise ?? 0n);
        }
      } else if (prop.annualOperatingExpensesPaise !== undefined) {
        propOpEx = BigInt(prop.annualOperatingExpensesPaise);
      }
      totalAnnualOpEx += propOpEx;

      // Tenant security deposits: balance sheet liability
      const deposit = prop.tenancy?.securityDepositLiabilityPaise ??
                      prop.tenancy?.securityDepositPaise ??
                      prop.securityDepositPaise ??
                      0n;
      totalSecurityDeposits += BigInt(deposit);
    }

    propertyProjections.push({
      propertyId: prop.propertyId,
      marketValuePaise: mv,
      personalMarketValuePaise: personalMv,
      loanOutstandingPaise: loanOutstanding,
      personalLoanPaise: personalLoan,
      netEquityPaise: propFamilyEquity,
      personalNetEquityPaise: propPersonalEquity,
      isUnderwater: propFamilyEquity < 0n
    });
  }

  const totalAnnualNetRent = calculateNetRentalIncome(totalAnnualGrossRent, totalAnnualOpEx);

  const status = hasUnavailableLoan
    ? (activeProperties.length === unavailableProperties.length ? PROPERTY_PROJECTION_STATUS.UNAVAILABLE : PROPERTY_PROJECTION_STATUS.PARTIAL)
    : PROPERTY_PROJECTION_STATUS.AVAILABLE;

  return {
    source: 'properties',
    status,
    hasUnavailableLoan,
    unavailableProperties,
    activePropertiesCount: activeProperties.length,

    // Recommended decimal-string DTO format
    familyMarketValuePaise: familyMarketValue.toString(),
    personalMarketValuePaise: personalMarketValue.toString(),
    linkedLoanPrincipalPaise: familyLoanPrincipal.toString(),
    personalLoanPrincipalPaise: personalLoanPrincipal.toString(),
    familyNetEquityPaise: familyNetEquity.toString(),
    personalNetEquityPaise: personalNetEquity.toString(),

    rental: {
      grossIncomePaise: totalAnnualGrossRent.toString(),
      operatingExpensesPaise: totalAnnualOpEx.toString(),
      netIncomePaise: totalAnnualNetRent.toString()
    },

    securityDepositsLiabilityPaise: totalSecurityDeposits.toString(),

    // Native BigInt mirrors for internal mathematical engines
    raw: {
      familyMarketValuePaise: familyMarketValue,
      personalMarketValuePaise: personalMarketValue,
      linkedLoanPrincipalPaise: familyLoanPrincipal,
      personalLoanPrincipalPaise: personalLoanPrincipal,
      familyNetEquityPaise: familyNetEquity,
      personalNetEquityPaise: personalNetEquity,
      rentalGrossPaise: totalAnnualGrossRent,
      rentalOpExPaise: totalAnnualOpEx,
      rentalNetPaise: totalAnnualNetRent,
      securityDepositsLiabilityPaise: totalSecurityDeposits
    },

    propertyProjections,
    isReadOnlyProjection: true,
    asOfDate: new Date().toISOString().split('T')[0]
  };
}
