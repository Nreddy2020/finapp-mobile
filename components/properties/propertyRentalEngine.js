/**
 * @file propertyRentalEngine.js
 * @description Rental economics, tenancy schedules, security deposit liabilities,
 * operating expense tracking, and rental yield mathematics for the FinLife Properties Module.
 *
 * CONCEPT SEPARATION & INVARIANTS:
 * - Gross Rent: Rental income.
 * - Operating Expenses: Deducted from gross rent to yield net rental income.
 * - Security Deposit: Balance-sheet liability; NEVER recognized as income, cost basis, or appreciation.
 * - Security Deposit Refund: Liability reduction.
 * - Capitalized Improvement: Enters property cost basis (CapEx).
 * - Routine Repair: Deducted from gross rent as operating expense (OpEx).
 * - Vacancy: Zero rental income for vacant periods (no artificial accrual).
 * - Loan EMI: Formal loan obligation (Loans module), NEVER property OpEx.
 */

import {
  validateNonNegativePropertyPaise,
  validateSignedPropertyPaise,
  validateMarketValue,
  validateRentalAmount,
  validateOwnershipBps,
  MIN_PROPERTY_PAISE,
  TOTAL_OWNERSHIP_BPS,
  floorDiv
} from './propertyContracts.js';
import { assertNotLoanEmiOperatingExpense } from './propertyIntegrationAdapters.js';

// --- TENANCY STATUS ENUM ---
export const TENANCY_STATUS = Object.freeze({
  ACTIVE:        'ACTIVE',
  NOTICE_PERIOD: 'NOTICE_PERIOD',
  EXPIRED:       'EXPIRED',
  TERMINATED:    'TERMINATED',
  VACANT:        'VACANT'
});

// --- RENTAL OPERATING EXPENSE CATEGORIES ---
export const RENTAL_OPEX_CATEGORIES = Object.freeze({
  SOCIETY_MAINTENANCE: 'SOCIETY_MAINTENANCE',
  PROPERTY_TAX:        'PROPERTY_TAX',
  BUILDING_INSURANCE:  'BUILDING_INSURANCE',
  ROUTINE_REPAIR:      'ROUTINE_REPAIR',
  LEGAL_COMPLIANCE:    'LEGAL_COMPLIANCE',
  LEASING_BROKERAGE:   'LEASING_BROKERAGE',
  MANAGEMENT_FEE:      'MANAGEMENT_FEE',
  UTILITIES_WATER:     'UTILITIES_WATER',
  OTHER_OPEX:          'OTHER_OPEX'
});

/**
 * Creates a validated tenancy agreement record.
 * INVARIANT: Security deposit is flagged strictly as a liability, never income or cost basis.
 *
 * @param {Object} params
 * @returns {Object} Tenancy record
 */
export function createTenancyAgreement({
  tenancyId,
  propertyId,
  tenantName,
  tenantContact = '',
  monthlyRentPaise = 0n,
  securityDepositPaise = 0n,
  leaseStartDate,
  leaseEndDate,
  rentEscalationBps = 0n,
  status = TENANCY_STATUS.ACTIVE,
  notes = ''
}) {
  if (!tenancyId || typeof tenancyId !== 'string') {
    throw new TypeError('createTenancyAgreement: tenancyId must be a non-empty string');
  }
  if (!propertyId || typeof propertyId !== 'string') {
    throw new TypeError('createTenancyAgreement: propertyId must be a non-empty string');
  }
  if (!tenantName || typeof tenantName !== 'string') {
    throw new TypeError('createTenancyAgreement: tenantName must be a non-empty string');
  }

  const rentPaise = validateRentalAmount(
    typeof monthlyRentPaise === 'bigint' ? monthlyRentPaise : BigInt(monthlyRentPaise ?? 0n)
  );

  // Security deposit is a balance sheet liability
  const depositPaise = validateNonNegativePropertyPaise(
    typeof securityDepositPaise === 'bigint' ? securityDepositPaise : BigInt(securityDepositPaise ?? 0n),
    'securityDepositPaise'
  );

  const escalation = validateOwnershipBps(
    typeof rentEscalationBps === 'bigint' ? rentEscalationBps : BigInt(rentEscalationBps ?? 0n),
    'rentEscalationBps'
  );

  if (!TENANCY_STATUS[status]) {
    throw new TypeError(`createTenancyAgreement: invalid tenancy status '${status}'`);
  }

  return {
    tenancyId: tenancyId.trim(),
    propertyId: propertyId.trim(),
    tenantName: tenantName.trim(),
    tenantContact: String(tenantContact || '').trim(),
    monthlyRentPaise: rentPaise,
    securityDepositPaise: depositPaise,
    securityDepositLiabilityPaise: depositPaise, // Explicit liability field
    isLiability: true,                          // Deposit is a balance sheet liability
    isRentalIncome: false,                      // Deposit is NEVER rental income
    isCapitalizedCostBasis: false,              // Deposit NEVER enters cost basis
    leaseStartDate: leaseStartDate ? String(leaseStartDate).trim() : null,
    leaseEndDate: leaseEndDate ? String(leaseEndDate).trim() : null,
    rentEscalationBps: escalation,
    status,
    notes: String(notes || '').trim(),
    createdAt: new Date().toISOString()
  };
}

/**
 * Records a security deposit refund or settlement.
 * Reduces the security deposit liability.
 *
 * @param {Object} tenancy
 * @param {bigint} refundPaise
 * @param {bigint} [deductionsPaise=0n]
 * @param {string} [deductionReason='']
 * @returns {Object} Updated deposit settlement state
 */
export function processSecurityDepositSettlement(tenancy, {
  refundPaise,
  deductionsPaise = 0n,
  deductionReason = ''
}) {
  if (!tenancy || typeof tenancy !== 'object') {
    throw new TypeError('processSecurityDepositSettlement: tenancy must be an object');
  }

  const currentLiability = validateNonNegativePropertyPaise(
    tenancy.securityDepositLiabilityPaise ?? tenancy.securityDepositPaise ?? 0n,
    'currentLiability'
  );

  const refund = validateNonNegativePropertyPaise(
    typeof refundPaise === 'bigint' ? refundPaise : BigInt(refundPaise ?? 0n),
    'refundPaise'
  );

  const deductions = validateNonNegativePropertyPaise(
    typeof deductionsPaise === 'bigint' ? deductionsPaise : BigInt(deductionsPaise ?? 0n),
    'deductionsPaise'
  );

  if (refund + deductions > currentLiability) {
    throw new RangeError(
      `processSecurityDepositSettlement: refund (${refund}n) + deductions (${deductions}n) exceeds current deposit liability (${currentLiability}n)`
    );
  }

  const remainingLiabilityPaise = currentLiability - (refund + deductions);

  return {
    tenancyId: tenancy.tenancyId,
    initialDepositPaise: tenancy.securityDepositPaise,
    refundedPaise: refund,
    deductionsPaise: deductions,
    deductionReason: String(deductionReason || '').trim(),
    remainingDepositLiabilityPaise: remainingLiabilityPaise,
    isLiabilitySettled: remainingLiabilityPaise === 0n,
    settledAt: new Date().toISOString()
  };
}

/**
 * Validates and records a property operating expense (OpEx).
 * Invariant: OpEx is deducted from gross rent, NEVER capitalized into cost basis,
 * and Loan EMI is strictly prohibited as property OpEx.
 *
 * @param {Object} params
 * @returns {Object} Operating expense record
 */
export function recordPropertyOperatingExpense({
  expenseId,
  propertyId,
  category,
  amountPaise,
  expenseDate = new Date().toISOString().split('T')[0],
  description = ''
}) {
  if (!expenseId || typeof expenseId !== 'string') {
    throw new TypeError('recordPropertyOperatingExpense: expenseId must be a non-empty string');
  }
  if (!propertyId || typeof propertyId !== 'string') {
    throw new TypeError('recordPropertyOperatingExpense: propertyId must be a non-empty string');
  }

  // Enforce Loan EMI boundary: EMI cannot be an operating expense
  assertNotLoanEmiOperatingExpense(category);

  if (!RENTAL_OPEX_CATEGORIES[category]) {
    throw new TypeError(
      `recordPropertyOperatingExpense: invalid category '${category}'. Allowed: ${Object.keys(RENTAL_OPEX_CATEGORIES).join(', ')}`
    );
  }

  const amount = validateNonNegativePropertyPaise(
    typeof amountPaise === 'bigint' ? amountPaise : BigInt(amountPaise ?? 0n),
    'operatingExpense.amountPaise'
  );

  return {
    expenseId: expenseId.trim(),
    propertyId: propertyId.trim(),
    category,
    amountPaise: amount,
    expenseDate: String(expenseDate).trim(),
    description: String(description || '').trim(),
    isOperatingExpense: true,
    isCapitalizedCostBasis: false, // Strict boundary: NEVER enters cost basis
    createdAt: new Date().toISOString()
  };
}

/**
 * Calculates annual gross rent from monthly gross rent.
 * Annual Gross Rent = Monthly Gross Rent * 12n
 *
 * @param {bigint} monthlyRentPaise
 * @returns {bigint} Annual gross rent in paise
 */
export function calculateAnnualGrossRent(monthlyRentPaise) {
  const monthly = validateRentalAmount(
    typeof monthlyRentPaise === 'bigint' ? monthlyRentPaise : BigInt(monthlyRentPaise ?? 0n)
  );
  return monthly * 12n;
}

/**
 * Calculates net rental income by subtracting operating expenses from gross rent.
 * Formula: Net Rental Income = Gross Rental Income - Operating Expenses
 * Supports signed negative net income if expenses exceed income.
 *
 * @param {bigint} grossRentalPaise
 * @param {bigint|Array<Object>} operatingExpenses - Total paise or array of expense objects
 * @returns {bigint} Net rental income in paise (signed 64-bit BigInt)
 */
export function calculateNetRentalIncome(grossRentalPaise, operatingExpenses = 0n) {
  const gross = validateNonNegativePropertyPaise(
    typeof grossRentalPaise === 'bigint' ? grossRentalPaise : BigInt(grossRentalPaise ?? 0n),
    'grossRentalPaise'
  );

  let opexPaise = 0n;
  if (Array.isArray(operatingExpenses)) {
    for (const exp of operatingExpenses) {
      if (exp && exp.amountPaise !== undefined) {
        opexPaise += validateNonNegativePropertyPaise(
          typeof exp.amountPaise === 'bigint' ? exp.amountPaise : BigInt(exp.amountPaise),
          'operatingExpense.amountPaise'
        );
      }
    }
  } else {
    opexPaise = validateNonNegativePropertyPaise(
      typeof operatingExpenses === 'bigint' ? operatingExpenses : BigInt(operatingExpenses ?? 0n),
      'operatingExpenses'
    );
  }

  // Net = Gross - OpEx (signed 64-bit)
  return validateSignedPropertyPaise(gross - opexPaise, 'netRentalIncomePaise');
}

/**
 * Calculates Gross Rental Yield in Basis Points (BPS).
 * Formula: floor(Annual Gross Rent * 10,000 / Market Value)
 * Deterministic Zero Denominator: If marketValue === 0n, returns 0n.
 *
 * @param {bigint} annualGrossRentPaise
 * @param {bigint} marketValuePaise
 * @returns {bigint} Gross rental yield in BPS
 */
export function calculateGrossRentalYieldBps(annualGrossRentPaise, marketValuePaise) {
  const rent = validateNonNegativePropertyPaise(
    typeof annualGrossRentPaise === 'bigint' ? annualGrossRentPaise : BigInt(annualGrossRentPaise ?? 0n),
    'annualGrossRentPaise'
  );
  const mv = validateMarketValue(
    typeof marketValuePaise === 'bigint' ? marketValuePaise : BigInt(marketValuePaise ?? 0n)
  );

  if (mv === 0n || rent === 0n) {
    return 0n;
  }

  return floorDiv(rent * TOTAL_OWNERSHIP_BPS, mv);
}

/**
 * Calculates Net Rental Yield in Basis Points (BPS).
 * Formula: floor(Annual Net Rental Income * 10,000 / Market Value)
 * Uses true mathematical floor division (floorDiv) supporting signed negative yields.
 * Deterministic Zero Denominator: If marketValue === 0n, returns 0n.
 *
 * @param {bigint} annualNetRentPaise - Signed paise
 * @param {bigint} marketValuePaise
 * @returns {bigint} Net rental yield in BPS (signed BigInt)
 */
export function calculateNetRentalYieldBps(annualNetRentPaise, marketValuePaise) {
  const netRent = validateSignedPropertyPaise(
    typeof annualNetRentPaise === 'bigint' ? annualNetRentPaise : BigInt(annualNetRentPaise ?? 0n),
    'annualNetRentPaise'
  );
  const mv = validateMarketValue(
    typeof marketValuePaise === 'bigint' ? marketValuePaise : BigInt(marketValuePaise ?? 0n)
  );

  if (mv === 0n || netRent === 0n) {
    return 0n;
  }

  return floorDiv(netRent * TOTAL_OWNERSHIP_BPS, mv);
}

/**
 * Calculates Rental Margin in Basis Points (BPS).
 * Formula: floor(Net Rental Income * 10,000 / Gross Rental Income)
 * Uses true mathematical floor division (floorDiv).
 * Deterministic Zero Denominator: If grossRentalIncome === 0n, returns 0n.
 *
 * @param {bigint} netRentalIncomePaise
 * @param {bigint} grossRentalIncomePaise
 * @returns {bigint} Rental margin in BPS
 */
export function calculateRentalMarginBps(netRentalIncomePaise, grossRentalIncomePaise) {
  const gross = validateNonNegativePropertyPaise(
    typeof grossRentalIncomePaise === 'bigint' ? grossRentalIncomePaise : BigInt(grossRentalIncomePaise ?? 0n),
    'grossRentalIncomePaise'
  );
  const net = validateSignedPropertyPaise(
    typeof netRentalIncomePaise === 'bigint' ? netRentalIncomePaise : BigInt(netRentalIncomePaise ?? 0n),
    'netRentalIncomePaise'
  );

  if (gross === 0n || net === 0n) {
    return 0n;
  }

  return floorDiv(net * TOTAL_OWNERSHIP_BPS, gross);
}

/**
 * Calculates rental performance incorporating vacancy periods.
 * Invariant PROP-RENT-04: Vacant periods produce zero rental income (no artificial accrual).
 *
 * Distinguishes:
 * - contractualGrossRentPaise: Total potential contractual lease rent
 * - accruedGrossRentPaise: Accrued rent over occupied months
 * - realizedGrossRentPaise: Cash received/realized
 * - vacancyLossPaise: Rental revenue lost due to vacancy
 * - vacancyAdjustedRentPaise: Contractual rent adjusted for vacancy
 * - outstandingReceivablePaise: Uncollected tenant receivables
 *
 * @param {Object} params
 * @param {bigint} params.monthlyRentPaise
 * @param {bigint} params.marketValuePaise
 * @param {number} [params.vacantMonths=0]
 * @param {number} [params.totalMonths=12]
 * @param {bigint|Array<Object>} [params.operatingExpenses=0n]
 * @param {bigint} [params.realizedRentPaise] - Optional explicit collected rent
 * @returns {Object} Comprehensive rental performance metrics
 */
export function calculateRentalPerformanceWithVacancy({
  monthlyRentPaise,
  marketValuePaise,
  vacantMonths = 0,
  totalMonths = 12,
  operatingExpenses = 0n,
  realizedRentPaise = null
}) {
  if (totalMonths <= 0) {
    throw new RangeError('totalMonths must be greater than 0');
  }
  if (vacantMonths < 0 || vacantMonths > totalMonths) {
    throw new RangeError(`vacantMonths must be between 0 and ${totalMonths}`);
  }

  const monthly = validateRentalAmount(
    typeof monthlyRentPaise === 'bigint' ? monthlyRentPaise : BigInt(monthlyRentPaise ?? 0n)
  );
  const mv = validateMarketValue(
    typeof marketValuePaise === 'bigint' ? marketValuePaise : BigInt(marketValuePaise ?? 0n)
  );

  const occupiedMonths = totalMonths - vacantMonths;

  // Potential contractual rent across all scheduled months
  const contractualGrossRentPaise = monthly * BigInt(totalMonths);
  const vacancyLossPaise = monthly * BigInt(vacantMonths);

  // Vacancy-adjusted rent: strictly 0 paise for vacant periods
  const vacancyAdjustedRentPaise = monthly * BigInt(occupiedMonths);
  const accruedGrossRentPaise = vacancyAdjustedRentPaise;

  // Realized gross rent defaults to vacancy-adjusted rent if not explicitly tracked
  const realizedGrossRent = realizedRentPaise !== null
    ? validateNonNegativePropertyPaise(BigInt(realizedRentPaise), 'realizedRentPaise')
    : vacancyAdjustedRentPaise;

  const outstandingReceivablePaise = accruedGrossRentPaise > realizedGrossRent
    ? accruedGrossRentPaise - realizedGrossRent
    : 0n;

  // Operating expenses sum
  let totalOpExPaise = 0n;
  if (Array.isArray(operatingExpenses)) {
    for (const exp of operatingExpenses) {
      if (exp && exp.amountPaise !== undefined) {
        totalOpExPaise += validateNonNegativePropertyPaise(
          typeof exp.amountPaise === 'bigint' ? exp.amountPaise : BigInt(exp.amountPaise),
          'operatingExpense.amountPaise'
        );
      }
    }
  } else {
    totalOpExPaise = validateNonNegativePropertyPaise(
      typeof operatingExpenses === 'bigint' ? operatingExpenses : BigInt(operatingExpenses ?? 0n),
      'operatingExpenses'
    );
  }

  const netRentalIncomePaise = calculateNetRentalIncome(realizedGrossRent, totalOpExPaise);

  const grossYieldBps = calculateGrossRentalYieldBps(realizedGrossRent, mv);
  const netYieldBps = calculateNetRentalYieldBps(netRentalIncomePaise, mv);
  const rentalMarginBps = calculateRentalMarginBps(netRentalIncomePaise, realizedGrossRent);

  const occupancyRateBps = (BigInt(occupiedMonths) * TOTAL_OWNERSHIP_BPS) / BigInt(totalMonths);

  return {
    potentialGrossRentPaise: contractualGrossRentPaise,
    contractualGrossRentPaise,
    accruedGrossRentPaise,
    realizedGrossRentPaise: realizedGrossRent,
    vacancyAdjustedRentPaise,
    outstandingReceivablePaise,
    vacancyLossPaise,
    totalOpExPaise,
    netRentalIncomePaise,
    grossYieldBps,
    netYieldBps,
    rentalMarginBps,
    occupancyRateBps,
    vacantMonths,
    occupiedMonths,
    totalMonths
  };
}
