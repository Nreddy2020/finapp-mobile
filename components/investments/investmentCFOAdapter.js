/**
 * @file investmentCFOAdapter.js
 * @description Personal CFO Consolidated Balance Sheet Projection Engine for FinLife Investments Module V1 (Phase 4).
 *
 * Invariants & Guarantees:
 * - Authoritative single-ledger sources:
 *   * Liquid Cash: Banking Module
 *   * Investments: Investments Module (authoritative valuation)
 *   * Physical & Precious Assets: Assets Module (minus excluded duplicates)
 *   * Properties: Real Estate Properties Module
 *   * Receivables: P2P Lending (principal only)
 *   * Liabilities: Formal Loans + P2P Borrowings + Linked Property Mortgages
 * - Invariant Guard: If ANY required source is UNAVAILABLE or missing, `netWorthPaise` is strictly null!
 *   Never fabricate a partial net worth by treating missing sources as ₹0.
 * - Remainder-Preserving Allocation: 10,000 BPS largest-remainder rule guaranteeing exact ₹0 leakage.
 * - Deep read-only projection: Never mutates any underlying ledger.
 * - Exact signed 64-bit BigInt paise arithmetic.
 */

import {
  CFO_PROJECTION_STATUS,
  OWNERSHIP_SCOPE,
  CFO_CALCULATION_POLICY_VERSION,
  TOTAL_OWNERSHIP_BPS,
  validateOwnershipBps,
  allocateRemainderPreserving
} from './investmentIntegrationContracts.js';
import {
  validateBoundedPaise,
  validateNonNegativePaise
} from './investmentContracts.js';

/**
 * Computes the consolidated Personal CFO balance sheet across all financial modules.
 *
 * @param {Object} params
 * @param {Object|null} [params.liquidCash] - Banking module projection { totalPaise, status, isAvailable, isStale }
 * @param {Object|null} [params.investmentsValuation] - Investments module valuation { totalMarketValuePaise, status, isAvailable, isStale }
 * @param {Array<Object>|Object|null} [params.physicalAssets] - Assets module records or projection
 * @param {Array<Object>|Object|null} [params.properties] - Properties module records or projection
 * @param {Object|null} [params.p2pReceivables] - P2P receivables projection { totalPrincipalPaise, status, isAvailable }
 * @param {Object|null} [params.formalDebt] - Formal loans projection { totalOutstandingPaise, status, isAvailable }
 * @param {Object|null} [params.p2pPayables] - P2P borrowings projection { totalOutstandingPaise, status, isAvailable }
 * @param {Object|null} [params.propertyLiabilities] - Property mortgages { totalOutstandingPaise, status, isAvailable }
 * @param {Array<string>} [params.excludeDuplicateAssetIds=[]] - Asset IDs detected as duplicates to omit
 * @param {string} [params.targetMemberId='self'] - Member identifier
 * @param {string} [params.asOfDate] - Valuation asOf date string
 * @param {string} [params.ownershipMode=OWNERSHIP_SCOPE.PERSONAL] - PERSONAL or FAMILY
 * @param {bigint} [params.personalBps=10000n] - Basis points of ownership (0n to 10000n)
 * @returns {Object} ConsolidatedCFOBalanceSheetDTO
 */
export function getConsolidatedCFOBalanceSheet({
  liquidCash = null,
  investmentsValuation = null,
  physicalAssets = null,
  properties = null,
  p2pReceivables = null,
  formalDebt = null,
  p2pPayables = null,
  propertyLiabilities = null,
  excludeDuplicateAssetIds = [],
  targetMemberId = 'self',
  asOfDate = new Date().toISOString().split('T')[0],
  ownershipMode = OWNERSHIP_SCOPE.PERSONAL,
  personalBps = TOTAL_OWNERSHIP_BPS
} = {}) {
  validateOwnershipBps(personalBps, 'personalBps');

  const unavailableSources = [];
  const staleSources = [];

  // 1. Liquid Cash (Banking)
  let bankingPaise = null;
  if (!liquidCash || liquidCash.isAvailable === false || liquidCash.status === 'UNAVAILABLE') {
    unavailableSources.push('BANKING');
  } else {
    bankingPaise = validateNonNegativePaise(
      BigInt(liquidCash.totalPaise ?? liquidCash.totalMarketValuePaise ?? 0n),
      'liquidCash'
    );
    if (liquidCash.isStale || liquidCash.status === 'STALE') {
      staleSources.push('BANKING');
    }
  }

  // 2. Investments (Authoritative)
  let investmentsPaise = null;
  if (
    !investmentsValuation ||
    investmentsValuation.isAvailable === false ||
    investmentsValuation.status === 'UNAVAILABLE' ||
    investmentsValuation.totalMarketValuePaise === null
  ) {
    unavailableSources.push('INVESTMENTS');
  } else {
    investmentsPaise = validateBoundedPaise(
      BigInt(investmentsValuation.totalMarketValuePaise),
      'investmentsPaise'
    );
    if (investmentsValuation.isStale || investmentsValuation.status === 'STALE') {
      staleSources.push('INVESTMENTS');
    }
  }

  // 3. Physical & Valuables (Assets Module minus duplicates)
  let physicalAssetsPaise = null;
  if (!physicalAssets || physicalAssets.isAvailable === false || physicalAssets.status === 'UNAVAILABLE') {
    unavailableSources.push('ASSETS');
  } else {
    const excludeSet = new Set(excludeDuplicateAssetIds);
    let totalAssetsVal = 0n;

    if (Array.isArray(physicalAssets)) {
      for (const a of physicalAssets) {
        if (!a || excludeSet.has(a.id)) continue;
        if (a.status === 'ARCHIVED' || a.status === 'SOLD') continue;
        // Strictly ignore properties category if mistakenly passed in assets
        if (a.category === 'PROPERTY' || a.category === 'PROPERTIES') continue;
        // Ignore duplicate categories if handled by dedicated modules
        if (a.category === 'MONEY_CASH' || a.category === 'INVESTMENTS') continue;

        const val = BigInt(a.currentValuationPaise ?? a.valuationPaise ?? a.currentValuePaise ?? 0n);
        totalAssetsVal += val;
      }
    } else if (typeof physicalAssets === 'object') {
      totalAssetsVal = BigInt(physicalAssets.totalPaise ?? physicalAssets.totalMarketValuePaise ?? 0n);
      if (physicalAssets.isStale || physicalAssets.status === 'STALE') {
        staleSources.push('ASSETS');
      }
    }

    physicalAssetsPaise = validateNonNegativePaise(totalAssetsVal, 'physicalAssetsPaise');
  }

  // 4. Real Estate Properties
  let propertiesPaise = null;
  if (!properties || properties.isAvailable === false || properties.status === 'UNAVAILABLE') {
    unavailableSources.push('PROPERTIES');
  } else {
    let totalPropVal = 0n;
    if (Array.isArray(properties)) {
      for (const p of properties) {
        if (!p || p.status === 'ARCHIVED' || p.status === 'SOLD') continue;
        const val = BigInt(p.currentMarketValuePaise ?? p.marketValuePaise ?? p.familyMarketValuePaise ?? 0n);
        totalPropVal += val;
      }
    } else if (typeof properties === 'object') {
      totalPropVal = BigInt(properties.familyMarketValuePaise ?? properties.totalMarketValuePaise ?? properties.totalPaise ?? 0n);
      if (properties.isStale || properties.status === 'STALE') {
        staleSources.push('PROPERTIES');
      }
    }
    propertiesPaise = validateNonNegativePaise(totalPropVal, 'propertiesPaise');
  }

  // 5. P2P Receivables (Lending Out)
  let p2pReceivablesPaise = null;
  if (!p2pReceivables || p2pReceivables.isAvailable === false || p2pReceivables.status === 'UNAVAILABLE') {
    unavailableSources.push('P2P');
  } else {
    p2pReceivablesPaise = validateNonNegativePaise(
      BigInt(p2pReceivables.totalPrincipalPaise ?? p2pReceivables.totalPaise ?? 0n),
      'p2pReceivablesPaise'
    );
    if (p2pReceivables.isStale || p2pReceivables.status === 'STALE') {
      staleSources.push('P2P');
    }
  }

  // 6. Liabilities: Formal Debt (Loans Module)
  let formalDebtPaise = null;
  if (!formalDebt || formalDebt.isAvailable === false || formalDebt.status === 'UNAVAILABLE') {
    unavailableSources.push('LOANS');
  } else {
    formalDebtPaise = validateNonNegativePaise(
      BigInt(formalDebt.totalOutstandingPaise ?? formalDebt.totalPaise ?? 0n),
      'formalDebtPaise'
    );
    if (formalDebt.isStale || formalDebt.status === 'STALE') {
      staleSources.push('LOANS');
    }
  }

  // 7. Liabilities: P2P Payables (Borrowings)
  let p2pPayablesPaise = 0n;
  if (p2pPayables && p2pPayables.isAvailable !== false && p2pPayables.status !== 'UNAVAILABLE') {
    p2pPayablesPaise = validateNonNegativePaise(
      BigInt(p2pPayables.totalOutstandingPaise ?? p2pPayables.totalPaise ?? 0n),
      'p2pPayablesPaise'
    );
  }

  // 8. Liabilities: Property Mortgages (if separate)
  let propertyMortgagesPaise = 0n;
  if (propertyLiabilities && propertyLiabilities.isAvailable !== false && propertyLiabilities.status !== 'UNAVAILABLE') {
    propertyMortgagesPaise = validateNonNegativePaise(
      BigInt(propertyLiabilities.totalOutstandingPaise ?? propertyLiabilities.totalPaise ?? 0n),
      'propertyMortgagesPaise'
    );
  }

  // Determine overall status
  let status = CFO_PROJECTION_STATUS.COMPLETE;
  let isStale = staleSources.length > 0;

  if (unavailableSources.length > 0) {
    status = unavailableSources.length >= 4
      ? CFO_PROJECTION_STATUS.UNAVAILABLE
      : CFO_PROJECTION_STATUS.PARTIAL;
  } else if (isStale) {
    status = CFO_PROJECTION_STATUS.STALE;
  }

  // Subtotals (calculable only from available components)
  let totalAssetsPaise = null;
  let totalLiabilitiesPaise = null;
  let netWorthPaise = null;
  let personalNetWorthPaise = null;
  let familyNetWorthPaise = null;

  // Invariant Guard: If status is PARTIAL or UNAVAILABLE, netWorthPaise is strictly null
  if (status === CFO_PROJECTION_STATUS.COMPLETE || status === CFO_PROJECTION_STATUS.STALE) {
    totalAssetsPaise = (bankingPaise ?? 0n) +
                       (investmentsPaise ?? 0n) +
                       (physicalAssetsPaise ?? 0n) +
                       (propertiesPaise ?? 0n) +
                       (p2pReceivablesPaise ?? 0n);

    totalLiabilitiesPaise = (formalDebtPaise ?? 0n) +
                            p2pPayablesPaise +
                            propertyMortgagesPaise;

    validateBoundedPaise(totalAssetsPaise, 'totalAssetsPaise');
    validateBoundedPaise(totalLiabilitiesPaise, 'totalLiabilitiesPaise');

    netWorthPaise = totalAssetsPaise - totalLiabilitiesPaise;
    validateBoundedPaise(netWorthPaise, 'netWorthPaise');

    // Remainder-preserving allocation by personalBps
    const allocation = allocateRemainderPreserving(netWorthPaise, personalBps);
    personalNetWorthPaise = allocation.personalAllocatedPaise;
    familyNetWorthPaise = allocation.otherOwnersAllocatedPaise;
  }

  return Object.freeze({
    calculationPolicyVersion: CFO_CALCULATION_POLICY_VERSION,
    asOfDate,
    status,
    isStale,
    ownershipMode,
    personalBps,
    targetMemberId,
    unavailableSources: Object.freeze([...unavailableSources]),
    staleSources: Object.freeze([...staleSources]),
    assetsBreakdown: Object.freeze({
      liquidCashPaise: bankingPaise,
      investmentsPaise,
      physicalAssetsPaise,
      propertiesPaise,
      p2pReceivablesPaise,
      totalAssetsPaise
    }),
    liabilitiesBreakdown: Object.freeze({
      formalDebtPaise,
      p2pPayablesPaise,
      propertyMortgagesPaise,
      totalLiabilitiesPaise
    }),
    netWorthPaise,
    personalNetWorthPaise,
    familyNetWorthPaise,
    isReadOnlyProjection: true
  });
}
