/**
 * components/assets/assetCalculations.js
 * 
 * FinLife Assets Module — Pure Financial & Fixed-Point Calculation Engines.
 * 
 * Guarantees:
 * - Deterministic integer and micros fixed-point mathematics.
 * - Zero floating-point arithmetic.
 * - Precious metal fine-weight: roundHalfUp(grossWeightMicros * purityBps, 10_000n).
 * - Metal valuation: roundHalfUp(fineWeightMicros * ratePerGramPaise, 1_000_000n).
 * - Vehicle Net Equity: Signed integer paise (supports negative equity).
 * - Investment NAV valuation & Gain/Loss basis points.
 */

import {
    WEIGHT_SCALE,
    UNITS_SCALE,
    BPS_SCALE,
    roundHalfUp,
    validateAssetPaiseBounds,
    toBigIntPaise,
    AssetValidationError
} from './assetContracts.js';

/**
 * 1. Calculate Precious Metal Fine Weight (Micros)
 * @param {bigint|number|string} grossWeightMicros - Gross weight in micros (1g = 1,000,000 micros)
 * @param {bigint|number|string} purityBps - Purity in basis points (e.g. 9167n for 22K)
 * @returns {bigint} fineWeightMicros
 */
export function calculateFineWeightMicros(grossWeightMicros, purityBps) {
    const gross = toBigIntPaise(grossWeightMicros, 'grossWeightMicros');
    const purity = toBigIntPaise(purityBps, 'purityBps');

    if (gross < 0n) {
        throw new AssetValidationError('ERR_NEGATIVE_WEIGHT', 'Gross weight cannot be negative');
    }
    if (purity < 0n || purity > BPS_SCALE) {
        throw new AssetValidationError('ERR_INVALID_PURITY_BPS', `Purity BPS must be between 0 and 10000, received ${purity}`);
    }

    return roundHalfUp(gross * purity, BPS_SCALE);
}

/**
 * 2. Calculate Precious Metal Market Valuation (Paise)
 * @param {bigint|number|string} fineWeightMicros - Fine weight in micros
 * @param {bigint|number|string} ratePerGramPaise - Rate in paise per gram
 * @returns {bigint} valuationPaise
 */
export function calculateMetalValuationPaise(fineWeightMicros, ratePerGramPaise) {
    const fine = toBigIntPaise(fineWeightMicros, 'fineWeightMicros');
    const rate = toBigIntPaise(ratePerGramPaise, 'ratePerGramPaise');

    if (fine < 0n) {
        throw new AssetValidationError('ERR_NEGATIVE_WEIGHT', 'Fine weight cannot be negative');
    }
    if (rate < 0n) {
        throw new AssetValidationError('ERR_NEGATIVE_RATE', 'Rate per gram cannot be negative');
    }

    const valuation = roundHalfUp(fine * rate, WEIGHT_SCALE);
    return validateAssetPaiseBounds(valuation);
}

/**
 * 3. Calculate Vehicle Net Equity (Signed Paise)
 * Net Equity = Current Valuation - Outstanding Loan
 * Handles negative equity when loan exceeds current vehicle valuation.
 * @param {bigint|number|string} currentValuationPaise - Current estimated vehicle market value (>= 0)
 * @param {bigint|number|string} outstandingLoanPaise - Outstanding vehicle debt (>= 0)
 * @returns {bigint} netEquityPaise (Signed 64-bit BigInt)
 */
export function calculateVehicleNetEquityPaise(currentValuationPaise, outstandingLoanPaise) {
    const val = validateAssetPaiseBounds(currentValuationPaise, { signed: false });
    const loan = validateAssetPaiseBounds(outstandingLoanPaise, { signed: false });

    const netEquity = val - loan;
    return validateAssetPaiseBounds(netEquity, { signed: true });
}

/**
 * 4. Calculate Investment Holding Valuation (Paise)
 * Valuation = Units * NAV
 * @param {bigint|number|string} unitsMicros - Holding units scaled by 1,000,000 (1 unit = 1,000,000 micros)
 * @param {bigint|number|string} navPaise - Net Asset Value per unit in paise
 * @returns {bigint} valuationPaise
 */
export function calculateInvestmentValuationPaise(unitsMicros, navPaise) {
    const units = toBigIntPaise(unitsMicros, 'unitsMicros');
    const nav = toBigIntPaise(navPaise, 'navPaise');

    if (units < 0n) {
        throw new AssetValidationError('ERR_NEGATIVE_UNITS', 'Units cannot be negative');
    }
    if (nav < 0n) {
        throw new AssetValidationError('ERR_NEGATIVE_NAV', 'NAV cannot be negative');
    }

    const valuation = roundHalfUp(units * nav, UNITS_SCALE);
    return validateAssetPaiseBounds(valuation);
}

/**
 * 5. Calculate Absolute Gain / Loss (Signed Paise)
 * Gain/Loss = Current Value - Invested / Purchase Cost
 * @param {bigint|number|string} currentValuationPaise 
 * @param {bigint|number|string} investedPaise 
 * @returns {bigint} gainLossPaise (Signed 64-bit BigInt)
 */
export function calculateGainLossPaise(currentValuationPaise, investedPaise) {
    const current = validateAssetPaiseBounds(currentValuationPaise, { signed: false });
    const invested = validateAssetPaiseBounds(investedPaise, { signed: false });

    const diff = current - invested;
    return validateAssetPaiseBounds(diff, { signed: true });
}

/**
 * 6. Calculate Gain / Loss Percentage in Basis Points (Signed BPS)
 * @param {bigint|number|string} currentValuationPaise 
 * @param {bigint|number|string} investedPaise 
 * @returns {bigint} gainLossBps (10,000n = 100.00%)
 */
export function calculateGainLossBps(currentValuationPaise, investedPaise) {
    const current = validateAssetPaiseBounds(currentValuationPaise, { signed: false });
    const invested = validateAssetPaiseBounds(investedPaise, { signed: false });

    if (invested === 0n) {
        return 0n;
    }

    const diff = current - invested;
    return roundHalfUp(diff * BPS_SCALE, invested);
}

/**
 * 7. Calculate Straight-Line Depreciated Book Value (Paise)
 * Book Value = PurchaseCost - ((PurchaseCost - SalvageValue) * (AgeMonths / UsefulLifeMonths))
 * @param {bigint|number|string} purchaseCostPaise 
 * @param {bigint|number|string} salvageValuePaise 
 * @param {number|bigint} usefulLifeMonths 
 * @param {number|bigint} ageMonths 
 * @returns {bigint} bookValuePaise
 */
export function calculateDepreciatedBookValuePaise(purchaseCostPaise, salvageValuePaise, usefulLifeMonths, ageMonths) {
    const cost = validateAssetPaiseBounds(purchaseCostPaise, { signed: false });
    const salvage = validateAssetPaiseBounds(salvageValuePaise, { signed: false });
    const totalMonths = toBigIntPaise(usefulLifeMonths, 'usefulLifeMonths');
    const age = toBigIntPaise(ageMonths, 'ageMonths');

    if (salvage > cost) {
        throw new AssetValidationError('ERR_INVALID_SALVAGE', 'Salvage value cannot exceed purchase cost');
    }
    if (totalMonths <= 0n) {
        throw new AssetValidationError('ERR_INVALID_LIFETIME', 'Useful lifetime in months must be greater than zero');
    }

    if (age <= 0n) {
        return cost;
    }
    if (age >= totalMonths) {
        return salvage;
    }

    const depreciableAmount = cost - salvage;
    const accumulatedDepreciation = roundHalfUp(depreciableAmount * age, totalMonths);
    const bookValue = cost - accumulatedDepreciation;

    return validateAssetPaiseBounds(bookValue);
}
