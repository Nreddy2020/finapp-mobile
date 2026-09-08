/**
 * services/loans/loanEngine.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Pure Mathematical Core.
 * Implements scaled binary exponentiation, nominal monthly rate conversion,
 * reducing-balance monthly EMI calculation, and zero-interest handling.
 * 
 * Strict invariants:
 * - Pure functions with zero side effects.
 * - Integer paise representation for all monetary amounts.
 * - No floating-point arithmetic for final financial figures.
 */

import { LOAN_CONSTANTS } from './loanContracts.js';

const SCALE = LOAN_CONSTANTS.RATE_SCALE; // 100,000,000n (10^8)

/**
 * Scaled Binary Exponentiation
 * Computes (baseScaled / scale)^exponent * scale using exact integer arithmetic.
 * Rounding at each step uses half-up integer rounding: (x + scale / 2n) / scale.
 * 
 * @param {bigint} baseScaled - Base scaled by 10^8 (e.g. 1.01 * 10^8 = 101000000n)
 * @param {number|bigint} exponent - Integer exponent (e.g. tenure in months)
 * @param {bigint} [scale=100000000n] - Scale factor
 * @returns {bigint} Result scaled by 10^8
 */
export function powScaled(baseScaled, exponent, scale = SCALE) {
    const expNum = Number(exponent);
    if (expNum < 0) throw new Error(`NEGATIVE_EXPONENT_REJECTED: Exponent must be >= 0, got ${exponent}`);
    if (expNum === 0) return scale;
    if (expNum === 1) return baseScaled;

    let result = scale;
    let base = baseScaled;
    let exp = BigInt(expNum);
    const halfScale = scale / 2n;

    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = (result * base + halfScale) / scale;
        }
        base = (base * base + halfScale) / scale;
        exp /= 2n;
    }

    return result;
}

/**
 * Derive monthly scaled interest rate from annual nominal percentage
 * Formula: r_scaled = round((annualRatePercent * 10^8) / 1200)
 * 
 * @param {number} annualRatePercent - e.g. 10.5 for 10.5% p.a.
 * @returns {bigint} Scaled monthly rate (e.g. 875000n for 10.5%)
 */
export function deriveMonthlyScaledRate(annualRatePercent) {
    const rate = Number(annualRatePercent);
    if (isNaN(rate) || rate < LOAN_CONSTANTS.MIN_ANNUAL_RATE_PCT || rate > LOAN_CONSTANTS.MAX_ANNUAL_RATE_PCT) {
        throw new Error(`INVALID_ANNUAL_RATE: Rate must be between ${LOAN_CONSTANTS.MIN_ANNUAL_RATE_PCT}% and ${LOAN_CONSTANTS.MAX_ANNUAL_RATE_PCT}%, got ${annualRatePercent}`);
    }
    if (rate === 0) return 0n;

    // Convert annual percent to monthly scaled integer
    // annualRatePercent / 100 / 12 * 10^8 = annualRatePercent * 10^8 / 1200
    const scaledRateNum = Math.round((rate * Number(SCALE)) / 1200);
    return BigInt(scaledRateNum);
}

/**
 * Calculate Monthly Reducing-Balance EMI
 * Formula: E = P * (r * (1 + r)^n) / ((1 + r)^n - 1)
 * 
 * For zero-interest loans (r = 0):
 * E_base = floor(P / n)
 * 
 * @param {bigint} principalPaise - Loan principal in paise
 * @param {number} annualRatePercent - Nominal annual interest rate (e.g. 9.5)
 * @param {number} tenureMonths - Total tenure in months (e.g. 240)
 * @returns {bigint} Standard monthly installment in paise
 */
export function calculateMonthlyEmiPaise(principalPaise, annualRatePercent, tenureMonths) {
    const P = BigInt(principalPaise);
    const n = Number(tenureMonths);

    if (P < LOAN_CONSTANTS.MIN_PRINCIPAL_PAISE || P > LOAN_CONSTANTS.MAX_PRINCIPAL_PAISE) {
        throw new Error(`PRINCIPAL_OUT_OF_BOUNDS: Must be between ${LOAN_CONSTANTS.MIN_PRINCIPAL_PAISE} and ${LOAN_CONSTANTS.MAX_PRINCIPAL_PAISE} paise`);
    }
    if (n < LOAN_CONSTANTS.MIN_TENURE_MONTHS || n > LOAN_CONSTANTS.MAX_TENURE_MONTHS) {
        throw new Error(`TENURE_OUT_OF_BOUNDS: Must be between ${LOAN_CONSTANTS.MIN_TENURE_MONTHS} and ${LOAN_CONSTANTS.MAX_TENURE_MONTHS} months`);
    }

    const rScaled = deriveMonthlyScaledRate(annualRatePercent);

    // Zero-interest loan deterministic base calculation
    if (rScaled === 0n) {
        return P / BigInt(n);
    }

    // 1-month loan exact payoff
    if (n === 1) {
        const oneMonthInterest = (P * rScaled + SCALE / 2n) / SCALE;
        return P + oneMonthInterest;
    }

    // Scaled compounding: base = SCALE + rScaled = (1 + r) * 10^8
    const baseScaled = SCALE + rScaled;
    const factorScaled = powScaled(baseScaled, n, SCALE); // (1 + r)^n * 10^8

    const numeratorFactor = (rScaled * factorScaled + SCALE / 2n) / SCALE; // r * (1 + r)^n * 10^8
    const denominatorFactor = factorScaled - SCALE; // ((1 + r)^n - 1) * 10^8

    if (denominatorFactor <= 0n) {
        throw new Error(`CALCULATION_ERROR: Zero or negative denominator in EMI calculation`);
    }

    // EMI = P * numeratorFactor / denominatorFactor
    const emiPaise = (P * numeratorFactor + denominatorFactor / 2n) / denominatorFactor;
    return emiPaise;
}
