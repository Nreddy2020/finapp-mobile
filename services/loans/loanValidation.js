/**
 * services/loans/loanValidation.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Schema & Boundary Validation.
 * Enforces strict financial limits, type checking, and sensitive data protection.
 */

import { LOAN_TYPES, RATE_TYPES, LOAN_STATUS, LOAN_CONSTANTS } from './loanContracts.js';

export function validateLoanFacility(facility) {
    if (!facility || typeof facility !== 'object') {
        throw new Error(`VALIDATION_FAILED: Expected facility object, got ${typeof facility}`);
    }

    // 1. Mandatory Identity
    if (!facility.id || typeof facility.id !== 'string' || facility.id.trim().length === 0) {
        throw new Error(`VALIDATION_FAILED: Facility id must be a non-empty string`);
    }
    if (!facility.name || typeof facility.name !== 'string' || facility.name.trim().length === 0) {
        throw new Error(`VALIDATION_FAILED: Facility name must be a non-empty string`);
    }

    // 2. Types & Status
    if (!Object.values(LOAN_TYPES).includes(facility.loanType)) {
        throw new Error(`VALIDATION_FAILED: Invalid loanType ${facility.loanType}`);
    }
    if (facility.rateType && !Object.values(RATE_TYPES).includes(facility.rateType)) {
        throw new Error(`VALIDATION_FAILED: Invalid rateType ${facility.rateType}`);
    }
    if (facility.status && !Object.values(LOAN_STATUS).includes(facility.status)) {
        throw new Error(`VALIDATION_FAILED: Invalid status ${facility.status}`);
    }

    // 3. Financial Bounds
    const principal = BigInt(facility.principalPaise || 0);
    if (principal < LOAN_CONSTANTS.MIN_PRINCIPAL_PAISE || principal > LOAN_CONSTANTS.MAX_PRINCIPAL_PAISE) {
        throw new Error(`VALIDATION_FAILED: principalPaise ${principal} must be between ${LOAN_CONSTANTS.MIN_PRINCIPAL_PAISE} and ${LOAN_CONSTANTS.MAX_PRINCIPAL_PAISE}`);
    }

    const rate = Number(facility.annualRatePercent);
    if (isNaN(rate) || rate < LOAN_CONSTANTS.MIN_ANNUAL_RATE_PCT || rate > LOAN_CONSTANTS.MAX_ANNUAL_RATE_PCT) {
        throw new Error(`VALIDATION_FAILED: annualRatePercent ${facility.annualRatePercent} must be between ${LOAN_CONSTANTS.MIN_ANNUAL_RATE_PCT} and ${LOAN_CONSTANTS.MAX_ANNUAL_RATE_PCT}`);
    }

    const tenure = Number(facility.tenureMonths);
    if (!Number.isInteger(tenure) || tenure < LOAN_CONSTANTS.MIN_TENURE_MONTHS || tenure > LOAN_CONSTANTS.MAX_TENURE_MONTHS) {
        throw new Error(`VALIDATION_FAILED: tenureMonths ${facility.tenureMonths} must be an integer between ${LOAN_CONSTANTS.MIN_TENURE_MONTHS} and ${LOAN_CONSTANTS.MAX_TENURE_MONTHS}`);
    }

    // 4. Date Validation
    if (facility.startDate) {
        const d = new Date(facility.startDate);
        if (isNaN(d.getTime())) {
            throw new Error(`VALIDATION_FAILED: Invalid startDate format: ${facility.startDate}`);
        }
    }

    // 5. Due Day Validation
    if (facility.emiDueDayOfMonth !== undefined) {
        const day = Number(facility.emiDueDayOfMonth);
        if (!Number.isInteger(day) || day < 1 || day > 31) {
            throw new Error(`VALIDATION_FAILED: emiDueDayOfMonth must be between 1 and 31`);
        }
    }

    return true;
}
