/**
 * services/volatilityDrawdownEngine.js
 * 
 * Stage C.7.3 — Volatility, Drawdown & Downside Risk Engine
 * Master Architectural Standard C7_3_V1
 * 
 * Provides deterministic, auditable, money-flow-neutral risk calculations:
 * 1. True Historical Subperiod TWR & Fixed-Weight Synthetic Return Series Construction.
 * 2. Annualized Sample Portfolio Volatility with multi-frequency scaling (DAILY, WEEKLY, MONTHLY).
 * 3. High-Watermark Peak, Trough, Maximum Drawdown, Current Drawdown & Deterministic Recovery Chronology.
 * 4. Downside Semi-Deviation & Sortino Ratio against versioned MAR.
 * 5. Multi-Day Parametric Gaussian Value-at-Risk (VaR) & Conditional VaR (CVaR / Expected Shortfall).
 * 6. Historical Empirical VaR & CVaR (>= 252 observations) with discrete 0-indexed tail indexing.
 * 
 * INVARIANTS:
 * - 100% Read-Only Safety (Zero state mutations across all stores).
 * - Mandatory deterministic asOfDate on all public APIs (Zero wall-clock timestamp calls).
 * - Zero manufactured returns (missing observations return explicit degraded/insufficient status).
 * - Multi-day parametric mean (h*mu) and volatility (sigma*sqrt(h)) scaling.
 */

import { RiskSeverity } from './riskTaxonomy.js';

export const DOWNSIDE_RISK_POLICY_VERSION = "C7_3_V1";

export const DOWNSIDE_RISK_POLICY_V1 = Object.freeze({
    periodsPerYear: Object.freeze({
        DAILY: 252,
        WEEKLY: 52,
        MONTHLY: 12
    }),
    observationThresholds: Object.freeze({
        PARAMETRIC_RISK_MIN_OBSERVATIONS: 20,
        HISTORICAL_VAR_MIN_OBSERVATIONS: 252,
        HISTORICAL_CVAR_MIN_OBSERVATIONS: 252
    }),
    normalQuantiles: Object.freeze({
        Z_95: -1.6448536269514722,
        Z_99: -2.3263478740408408,
        PDF_RATIO_95: 2.062712807562168,
        PDF_RATIO_99: 2.665214223126830
    }),
    defaults: Object.freeze({
        frequency: 'DAILY',
        lookbackDays: 365,
        requiredObservations: 252,
        defaultAnnualMAR: 0.06,
        varHorizonDays: 1,
        confidenceLevels: [0.95, 0.99]
    }),
    warningThresholds: Object.freeze({
        HIGH_VOLATILITY_ANNUAL: 0.25,
        CRITICAL_VOLATILITY_ANNUAL: 0.40,
        HIGH_MAX_DRAWDOWN: 0.20,
        CRITICAL_MAX_DRAWDOWN: 0.35,
        HIGH_1D_VAR_95: 0.025,
        CRITICAL_1D_VAR_95: 0.040
    })
});

// ==========================================
// 1. DETERMINISTIC VALIDATION HELPERS
// ==========================================

function validateAsOfDate(asOfDate) {
    if (!asOfDate) {
        throw new Error("asOfDate is required for deterministic downside risk evaluation.");
    }
    const d = new Date(asOfDate);
    if (isNaN(d.getTime())) {
        throw new Error(`Invalid asOfDate format: ${asOfDate}`);
    }
    return d.toISOString();
}

function roundTo(num, decimals = 4) {
    if (num === null || num === undefined || isNaN(num) || !isFinite(num)) {
        return null;
    }
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}

// ==========================================
// 2. HORIZON TO PERIOD CONVERSION (C7.3-F2)
// ==========================================

/**
 * Converts calendar day horizon into internal return-series periods based on frequency.
 * 
 * DAILY:   1D -> 1, 5D -> 5, 21D -> 21
 * WEEKLY:  1D -> 0.2, 5D -> 1.0, 21D -> 4.2
 * MONTHLY: 1D -> 1/21, 5D -> 5/21, 21D -> 1.0
 */
export function convertHorizonDaysToPeriods(varHorizonDays, frequency = 'DAILY') {
    const days = Math.max(1, Number(varHorizonDays) || 1);
    const freq = frequency.toUpperCase();

    if (freq === 'WEEKLY') {
        return days / 5.0;
    } else if (freq === 'MONTHLY') {
        return days / 21.0;
    }
    // DAILY default
    return Math.round(days);
}

// ==========================================
// 3. RETURN SERIES BUILDERS (C7.3-R1 & C7.3-F1)
// ==========================================

/**
 * Build True Historical Subperiod TWR Series from historical portfolio valuations and cash-flows.
 * 
 * Formula: R_sub,t = [V_t - (V_(t-1) + C_t)] / [V_(t-1) + C_t]
 * NAV_0 = 100.0, NAV_t = NAV_(t-1) * (1 + R_sub,t)
 * 
 * @param {Array<Object>} subperiods - Array of { date, endValuation, beginningCashFlow }
 * @returns {Object} { returns: Array<number>, navSeries: Array<Object>, methodology: 'TRUE_HISTORICAL_TWR', status: string, warnings: Array<string> }
 */
export function buildTrueHistoricalTWRSeries(subperiods) {
    if (!Array.isArray(subperiods) || subperiods.length === 0) {
        return {
            returns: [],
            navSeries: [{ date: null, nav: 100.0, return: 0.0 }],
            methodology: 'TRUE_HISTORICAL_TWR',
            status: 'EMPTY',
            warnings: ['NO_SUBPERIOD_DATA']
        };
    }

    // Deterministic chronological ordering
    const sorted = [...subperiods].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const returns = [];
    const navSeries = [];
    const warnings = [];
    let status = 'HEALTHY';

    let currentNav = 100.0;
    let prevValuation = null;

    for (let t = 0; t < sorted.length; t++) {
        const item = sorted[t];
        const dateStr = item.date;
        const endVal = Number(item.endValuation || 0);
        const cashFlow = Number(item.beginningCashFlow || item.cashFlow || 0);

        if (prevValuation === null) {
            // Initial base point (t=0)
            prevValuation = endVal;
            navSeries.push({
                date: dateStr,
                nav: roundTo(currentNav, 4),
                return: 0.0,
                valuation: endVal,
                cashFlow
            });
            continue;
        }

        const denom = prevValuation + cashFlow;
        let periodReturn = 0.0;

        if (denom === 0) {
            // Zero denominator invariant: zero starting capital base
            periodReturn = 0.0;
        } else if (denom < 0) {
            // Negative capital base: degraded subperiod
            status = 'DEGRADED';
            warnings.push(`NEGATIVE_CAPITAL_BASE_AT_SUBPERIOD_${t}`);
            periodReturn = 0.0; // clamp to 0 for NAV continuation, flag status
        } else {
            periodReturn = (endVal - denom) / denom;
        }

        currentNav = Math.max(0, currentNav * (1 + periodReturn));
        returns.push(periodReturn);

        navSeries.push({
            date: dateStr,
            nav: roundTo(currentNav, 4),
            return: periodReturn,
            valuation: endVal,
            cashFlow
        });

        prevValuation = endVal;
    }

    return {
        returns,
        navSeries,
        methodology: 'TRUE_HISTORICAL_TWR',
        status,
        warnings
    };
}

/**
 * Build Fixed-Weight Synthetic Return Series from constituent normalized returns.
 * Explicitly tagged as FIXED_WEIGHT_SYNTHETIC (NEVER called TWR).
 * 
 * Formula: R_synth,t = sum(w_i * r_i,t)
 * 
 * @param {Array<Object>} constituentReturns - Array of { holdingId, symbol, weight, returns: Array<number> }
 * @param {Array<string>} dates - Array of date strings corresponding to each return index
 * @returns {Object} { returns: Array<number>, navSeries: Array<Object>, methodology: 'FIXED_WEIGHT_SYNTHETIC', status: string, warnings: Array<string> }
 */
export function buildFixedWeightSyntheticSeries(constituentReturns, dates = []) {
    if (!Array.isArray(constituentReturns) || constituentReturns.length === 0) {
        return {
            returns: [],
            navSeries: [{ date: null, nav: 100.0, return: 0.0 }],
            methodology: 'FIXED_WEIGHT_SYNTHETIC',
            status: 'EMPTY',
            warnings: ['NO_CONSTITUENT_DATA']
        };
    }

    const numPeriods = Math.min(...constituentReturns.map(c => Array.isArray(c.returns) ? c.returns.length : 0));
    if (numPeriods <= 0) {
        return {
            returns: [],
            navSeries: [{ date: null, nav: 100.0, return: 0.0 }],
            methodology: 'FIXED_WEIGHT_SYNTHETIC',
            status: 'INSUFFICIENT_HISTORY',
            warnings: ['ZERO_CONSTITUENT_RETURN_OBSERVATIONS']
        };
    }

    const returns = [];
    const navSeries = [{ date: dates[0] || null, nav: 100.0, return: 0.0 }];
    let currentNav = 100.0;

    for (let t = 0; t < numPeriods; t++) {
        let periodSynthReturn = 0.0;
        let totalWeight = 0.0;

        for (const constituent of constituentReturns) {
            const w = Number(constituent.weight || 0);
            const r = Number(constituent.returns[t] || 0);
            periodSynthReturn += w * r;
            totalWeight += w;
        }

        // Normalize if weights don't sum to exactly 1.0 (e.g. cash buffer)
        if (totalWeight > 0 && Math.abs(totalWeight - 1.0) > 0.0001) {
            periodSynthReturn = periodSynthReturn / totalWeight;
        }

        currentNav = Math.max(0, currentNav * (1 + periodSynthReturn));
        returns.push(periodSynthReturn);

        navSeries.push({
            date: dates[t + 1] || null,
            nav: roundTo(currentNav, 4),
            return: periodSynthReturn
        });
    }

    return {
        returns,
        navSeries,
        methodology: 'FIXED_WEIGHT_SYNTHETIC',
        status: 'HEALTHY',
        warnings: []
    };
}

// ==========================================
// 4. STATISTICAL & RISK CORE FUNCTIONS
// ==========================================

/**
 * Calculates sample mean of an array of numbers.
 */
export function calculateSampleMean(arr) {
    if (!Array.isArray(arr) || arr.length === 0) return 0.0;
    const sum = arr.reduce((acc, val) => acc + (Number(val) || 0), 0);
    return sum / arr.length;
}

/**
 * Calculates sample standard deviation of periodic returns (Bessel's correction N-1).
 */
export function calculateSampleStdDev(arr) {
    if (!Array.isArray(arr) || arr.length < 2) return 0.0;
    const mean = calculateSampleMean(arr);
    const sumSqDiff = arr.reduce((acc, val) => acc + Math.pow((Number(val) || 0) - mean, 2), 0);
    return Math.sqrt(sumSqDiff / (arr.length - 1));
}

/**
 * Calculates Annualized Volatility from periodic returns.
 * sigma_ann = s_p * sqrt(PeriodsPerYear)
 */
export function calculateAnnualizedVolatility(returns, frequency = 'DAILY') {
    if (!Array.isArray(returns) || returns.length < 2) {
        return { periodicVolatility: null, annualizedVolatility: null };
    }
    const freq = frequency.toUpperCase();
    const periodsPerYear = DOWNSIDE_RISK_POLICY_V1.periodsPerYear[freq] || 252;
    const periodicVol = calculateSampleStdDev(returns);
    const annualizedVol = periodicVol * Math.sqrt(periodsPerYear);

    return {
        periodicVolatility: roundTo(periodicVol, 4),
        annualizedVolatility: roundTo(annualizedVol, 4),
        rawPeriodicVolatility: periodicVol,
        rawAnnualizedVolatility: annualizedVol
    };
}

/**
 * Calculates High-Watermark Drawdown Series, Maximum Drawdown, Current Drawdown, and Cycle Chronology.
 * 
 * Deterministic Tie-Breaking Contract (C7.3-R5):
 * - Peak: Earliest occurrence of the high-watermark level.
 * - Trough: Earliest occurrence of the minimum drawdown.
 * - Recovery: First observation strictly after trough where NAV >= trough-cycle peak (or null if unrecovered).
 * 
 * @param {Array<Object>} navSeries - Array of { date, nav }
 * @returns {Object} Drawdown diagnostics
 */
export function calculateDrawdownDiagnostics(navSeries) {
    if (!Array.isArray(navSeries) || navSeries.length === 0) {
        return {
            maximumDrawdown: 0.0,
            currentDrawdown: 0.0,
            drawdownStartDate: null,
            drawdownTroughDate: null,
            drawdownRecoveryDate: null,
            drawdownDurationDays: null,
            recoveryDurationDays: null,
            drawdownSeries: []
        };
    }

    let runningPeak = navSeries[0]?.nav ?? 100.0;
    let runningPeakDate = navSeries[0]?.date ?? null;
    let runningPeakIndex = 0;

    let maxDD = 0.0;
    let maxDDTroughDate = null;
    let maxDDTroughIndex = 0;
    let maxDDPeakDate = navSeries[0]?.date ?? null;
    let maxDDPeakIndex = 0;
    let maxDDPeakValue = runningPeak;

    const drawdownSeries = [];

    for (let i = 0; i < navSeries.length; i++) {
        const item = navSeries[i];
        const nav = Number(item.nav ?? 100.0);
        const date = item.date;

        if (nav > runningPeak) {
            runningPeak = nav;
            runningPeakDate = date;
            runningPeakIndex = i;
        }

        const dd = runningPeak > 0 ? (nav - runningPeak) / runningPeak : 0.0;
        drawdownSeries.push({
            date,
            nav,
            peak: runningPeak,
            drawdown: roundTo(dd, 4)
        });

        // Strict less-than preserves earliest trough tie-breaking
        if (dd < maxDD) {
            maxDD = dd;
            maxDDTroughDate = date;
            maxDDTroughIndex = i;
            maxDDPeakDate = runningPeakDate;
            maxDDPeakIndex = runningPeakIndex;
            maxDDPeakValue = runningPeak;
        }
    }

    // Current drawdown is the final point in the series
    const currentPoint = navSeries[navSeries.length - 1];
    const currentPeak = runningPeak;
    const currentNav = Number(currentPoint?.nav ?? 100.0);
    const currentDD = currentPeak > 0 ? (currentNav - currentPeak) / currentPeak : 0.0;

    // Search for recovery strictly after trough
    let recoveryDate = null;
    let recoveryIndex = null;

    if (maxDDTroughDate !== null) {
        for (let j = maxDDTroughIndex + 1; j < navSeries.length; j++) {
            const pt = navSeries[j];
            if (Number(pt.nav) >= maxDDPeakValue) {
                recoveryDate = pt.date;
                recoveryIndex = j;
                break;
            }
        }
    }

    // Compute duration in calendar days
    let drawdownDurationDays = null;
    let recoveryDurationDays = null;

    if (maxDDPeakDate && maxDDTroughDate) {
        const peakTs = new Date(maxDDPeakDate).getTime();
        const troughTs = new Date(maxDDTroughDate).getTime();
        if (!isNaN(peakTs) && !isNaN(troughTs)) {
            drawdownDurationDays = Math.max(0, Math.round((troughTs - peakTs) / (1000 * 60 * 60 * 24)));
        }
    }

    if (maxDDTroughDate && recoveryDate) {
        const troughTs = new Date(maxDDTroughDate).getTime();
        const recTs = new Date(recoveryDate).getTime();
        if (!isNaN(troughTs) && !isNaN(recTs)) {
            recoveryDurationDays = Math.max(0, Math.round((recTs - troughTs) / (1000 * 60 * 60 * 24)));
        }
    }

    return {
        maximumDrawdown: roundTo(maxDD, 4),
        currentDrawdown: roundTo(currentDD, 4),
        drawdownStartDate: maxDD < 0 ? maxDDPeakDate : null,
        drawdownTroughDate: maxDD < 0 ? maxDDTroughDate : null,
        drawdownRecoveryDate: recoveryDate,
        drawdownDurationDays: maxDD < 0 ? drawdownDurationDays : 0,
        recoveryDurationDays: recoveryDate ? recoveryDurationDays : null,
        drawdownSeries
    };
}

/**
 * Calculates Downside Deviation and Sortino Ratio against Minimum Acceptable Return (MAR).
 * 
 * MAR_periodic = (1 + MAR_ann)^(1 / PeriodsPerYear) - 1
 * delta_down = sqrt( (1 / T) * sum( min(0, R_t - MAR_periodic)^2 ) )
 * DD_ann = delta_down * sqrt(PeriodsPerYear)
 * Sortino = (R_ann - MAR_ann) / DD_ann
 */
export function calculateDownsideDeviationAndSortino(returns, marAnnual = 0.06, frequency = 'DAILY') {
    if (!Array.isArray(returns) || returns.length < 2) {
        return {
            marAnnual: roundTo(marAnnual, 4),
            marPeriodic: null,
            downsideDeviation: null,
            sortinoRatio: null
        };
    }

    const freq = frequency.toUpperCase();
    const periodsPerYear = DOWNSIDE_RISK_POLICY_V1.periodsPerYear[freq] || 252;
    const marAnnualNum = Number(marAnnual) || 0.06;
    const marPeriodic = Math.pow(1 + marAnnualNum, 1 / periodsPerYear) - 1;

    let sumSqUnderperform = 0.0;
    for (let t = 0; t < returns.length; t++) {
        const diff = Number(returns[t]) - marPeriodic;
        if (diff < 0) {
            sumSqUnderperform += Math.pow(diff, 2);
        }
    }

    const periodicDownsideDev = Math.sqrt(sumSqUnderperform / returns.length);
    const annualizedDownsideDev = periodicDownsideDev * Math.sqrt(periodsPerYear);

    // Annualized return for Sortino calculation
    const meanPeriodicReturn = calculateSampleMean(returns);
    const annualizedReturn = meanPeriodicReturn * periodsPerYear;

    let sortino = null;
    if (annualizedDownsideDev > 0) {
        sortino = (annualizedReturn - marAnnualNum) / annualizedDownsideDev;
    }

    return {
        marAnnual: roundTo(marAnnualNum, 4),
        marPeriodic: roundTo(marPeriodic, 6),
        downsideDeviation: roundTo(annualizedDownsideDev, 4),
        sortinoRatio: roundTo(sortino, 4),
        rawDownsideDeviation: annualizedDownsideDev
    };
}

/**
 * Calculates Multi-Day Parametric Gaussian Value-at-Risk (VaR) and Expected Shortfall (CVaR).
 * 
 * Horizon mean: mu_h = h * mu
 * Horizon volatility: sigma_h = sigma * sqrt(h)
 * VaR_alpha,h = max(0, -(mu_h + z_alpha * sigma_h))
 * CVaR_alpha,h = max(0, -mu_h + sigma_h * (phi(z_alpha) / (1 - alpha)))
 */
export function calculateParametricVaRAndCVaR(returns, varHorizonDays = 1, frequency = 'DAILY') {
    if (!Array.isArray(returns) || returns.length < DOWNSIDE_RISK_POLICY_V1.observationThresholds.PARAMETRIC_RISK_MIN_OBSERVATIONS) {
        return {
            var95Parametric: null,
            var99Parametric: null,
            cvar95Parametric: null,
            cvar99Parametric: null,
            horizonPeriods: null
        };
    }

    const h = convertHorizonDaysToPeriods(varHorizonDays, frequency);
    const mu = calculateSampleMean(returns);
    const sigma = calculateSampleStdDev(returns);

    const mu_h = h * mu;
    const sigma_h = sigma * Math.sqrt(h);

    const z95 = DOWNSIDE_RISK_POLICY_V1.normalQuantiles.Z_95;
    const z99 = DOWNSIDE_RISK_POLICY_V1.normalQuantiles.Z_99;
    const pdfRatio95 = DOWNSIDE_RISK_POLICY_V1.normalQuantiles.PDF_RATIO_95;
    const pdfRatio99 = DOWNSIDE_RISK_POLICY_V1.normalQuantiles.PDF_RATIO_99;

    const var95 = Math.max(0, -(mu_h + z95 * sigma_h));
    const var99 = Math.max(0, -(mu_h + z99 * sigma_h));

    const cvar95 = Math.max(0, -mu_h + sigma_h * pdfRatio95);
    const cvar99 = Math.max(0, -mu_h + sigma_h * pdfRatio99);

    return {
        var95Parametric: roundTo(var95, 4),
        var99Parametric: roundTo(var99, 4),
        cvar95Parametric: roundTo(cvar95, 4),
        cvar99Parametric: roundTo(cvar99, 4),
        horizonPeriods: roundTo(h, 4),
        rawVar95: var95,
        rawVar99: var99,
        rawCvar95: cvar95,
        rawCvar99: cvar99
    };
}

/**
 * Calculates Historical Empirical Value-at-Risk (VaR) and Expected Shortfall (CVaR).
 * 
 * Strict Requirement: T >= 252 observations. If T < 252, returns null with warning.
 * 
 * 0-indexed discrete percentile:
 * Sort returns ascending: R_(0) <= R_(1) <= ... <= R_(T-1)
 * k = max(1, floor((1 - alpha) * T))
 * VaR_alpha,h^hist = max(0, -R_(k-1) * sqrt(h))
 * CVaR_alpha,h^hist = max(0, -( (1/k) * sum(R_(0)...R_(k-1)) ) * sqrt(h))
 */
export function calculateHistoricalVaRAndCVaR(returns, varHorizonDays = 1, frequency = 'DAILY') {
    const minObs = DOWNSIDE_RISK_POLICY_V1.observationThresholds.HISTORICAL_VAR_MIN_OBSERVATIONS;
    if (!Array.isArray(returns) || returns.length < minObs) {
        return {
            var95Historical: null,
            var99Historical: null,
            cvar95Historical: null,
            cvar99Historical: null,
            historicalObservationCount: Array.isArray(returns) ? returns.length : 0,
            hasSufficientHistoricalHistory: false
        };
    }

    const h = convertHorizonDaysToPeriods(varHorizonDays, frequency);
    const sqrtH = Math.sqrt(h);
    const T = returns.length;

    // Ascending sort (worst loss at index 0)
    const sorted = [...returns].sort((a, b) => Number(a) - Number(b));

    // Tail ranks (1-indexed count -> 0-indexed cutoff at k-1)
    const k95 = Math.max(1, Math.floor(0.05 * T));
    const k99 = Math.max(1, Math.floor(0.01 * T));

    // VaR: Value at boundary rank (k-1)
    const rCutoff95 = sorted[k95 - 1];
    const rCutoff99 = sorted[k99 - 1];

    const var95 = Math.max(0, -rCutoff95 * sqrtH);
    const var99 = Math.max(0, -rCutoff99 * sqrtH);

    // CVaR: Arithmetic mean of worst k returns
    let sumTail95 = 0.0;
    for (let i = 0; i < k95; i++) {
        sumTail95 += sorted[i];
    }
    const meanTail95 = sumTail95 / k95;
    const cvar95 = Math.max(0, -meanTail95 * sqrtH);

    let sumTail99 = 0.0;
    for (let i = 0; i < k99; i++) {
        sumTail99 += sorted[i];
    }
    const meanTail99 = sumTail99 / k99;
    const cvar99 = Math.max(0, -meanTail99 * sqrtH);

    return {
        var95Historical: roundTo(var95, 4),
        var99Historical: roundTo(var99, 4),
        cvar95Historical: roundTo(cvar95, 4),
        cvar99Historical: roundTo(cvar99, 4),
        historicalObservationCount: T,
        hasSufficientHistoricalHistory: true,
        tailCount95: k95,
        tailCount99: k99
    };
}

// ==========================================
// 5. MASTER VOLATILITY & DOWNSIDE RISK API
// ==========================================

/**
 * Master public evaluation function for Stage C.7.3 Downside & Volatility Diagnostics.
 * 
 * @param {Object} params
 * @param {string} params.asOfDate - Mandatory ISO date string
 * @param {Array<Object>} [params.subperiods] - Historical valuation subperiods for True TWR
 * @param {Array<Object>} [params.constituentReturns] - Constituent normalized returns for fallback synthetic series
 * @param {Array<string>} [params.dates] - Date series
 * @param {string} [params.portfolioId] - Optional portfolio identifier
 * @param {string} [params.frequency='DAILY'] - DAILY (252), WEEKLY (52), MONTHLY (12)
 * @param {number} [params.varHorizonDays=1] - Horizon in days (1, 5, 21)
 * @param {number} [params.marAnnual=0.06] - Minimum Acceptable Return (default 6.0%)
 * @param {Object} [params.policy] - Optional custom risk policy override
 * @returns {Object} Complete VolatilityDrawdownDiagnostics DTO
 */
export function evaluatePortfolioVolatilityAndDrawdown(params = {}) {
    const asOfDateISO = validateAsOfDate(params.asOfDate);
    const policy = params.policy || DOWNSIDE_RISK_POLICY_V1;
    const frequency = (params.frequency || policy.defaults.frequency || 'DAILY').toUpperCase();
    const varHorizonDays = params.varHorizonDays !== undefined ? Number(params.varHorizonDays) : policy.defaults.varHorizonDays;
    const marAnnual = params.marAnnual !== undefined ? Number(params.marAnnual) : policy.defaults.defaultAnnualMAR;

    const warnings = [];
    let returnData = null;

    // 1. Determine Return Series Methodology (TWR vs Synthetic Fallback)
    if (Array.isArray(params.subperiods) && params.subperiods.length >= 2) {
        returnData = buildTrueHistoricalTWRSeries(params.subperiods);
    } else if (Array.isArray(params.constituentReturns) && params.constituentReturns.length > 0) {
        returnData = buildFixedWeightSyntheticSeries(params.constituentReturns, params.dates || []);
    } else {
        returnData = {
            returns: [],
            navSeries: [{ date: asOfDateISO, nav: 100.0, return: 0.0 }],
            methodology: 'FIXED_WEIGHT_SYNTHETIC',
            status: 'EMPTY',
            warnings: ['NO_HISTORICAL_DATA_PROVIDED']
        };
    }

    if (returnData.warnings && returnData.warnings.length > 0) {
        warnings.push(...returnData.warnings);
    }

    const returns = returnData.returns;
    const navSeries = returnData.navSeries;
    const observationCount = returns.length;
    const requiredObservations = policy.defaults.requiredObservations;
    const coverageRatio = roundTo(Math.min(1.0, observationCount / requiredObservations), 4);

    let status = returnData.status === 'DEGRADED' ? 'DEGRADED' : 'HEALTHY';
    if (observationCount < policy.observationThresholds.PARAMETRIC_RISK_MIN_OBSERVATIONS) {
        status = 'INSUFFICIENT_HISTORY';
        warnings.push('INSUFFICIENT_OBSERVATIONS_FOR_PARAMETRIC_RISK');
    }

    // 2. Core Quantitative Risk Metrics
    const volMetrics = calculateAnnualizedVolatility(returns, frequency);
    const ddMetrics = calculateDrawdownDiagnostics(navSeries);
    const downsideMetrics = calculateDownsideDeviationAndSortino(returns, marAnnual, frequency);
    const paramVaR = calculateParametricVaRAndCVaR(returns, varHorizonDays, frequency);
    const histVaR = calculateHistoricalVaRAndCVaR(returns, varHorizonDays, frequency);

    if (observationCount >= policy.observationThresholds.PARAMETRIC_RISK_MIN_OBSERVATIONS && observationCount < policy.observationThresholds.HISTORICAL_VAR_MIN_OBSERVATIONS) {
        warnings.push('INSUFFICIENT_OBSERVATIONS_FOR_HISTORICAL_VAR');
    }

    // 3. Diagnostic Warnings against Policy Thresholds
    if (volMetrics.annualizedVolatility !== null) {
        if (volMetrics.annualizedVolatility >= policy.warningThresholds.CRITICAL_VOLATILITY_ANNUAL) {
            warnings.push('CRITICAL_PORTFOLIO_VOLATILITY');
        } else if (volMetrics.annualizedVolatility >= policy.warningThresholds.HIGH_VOLATILITY_ANNUAL) {
            warnings.push('HIGH_PORTFOLIO_VOLATILITY');
        }
    }

    if (ddMetrics.maximumDrawdown !== null) {
        const absMaxDD = Math.abs(ddMetrics.maximumDrawdown);
        if (absMaxDD >= policy.warningThresholds.CRITICAL_MAX_DRAWDOWN) {
            warnings.push('CRITICAL_MAXIMUM_DRAWDOWN');
        } else if (absMaxDD >= policy.warningThresholds.HIGH_MAX_DRAWDOWN) {
            warnings.push('HIGH_MAXIMUM_DRAWDOWN');
        }
    }

    if (paramVaR.var95Parametric !== null) {
        if (paramVaR.var95Parametric >= policy.warningThresholds.CRITICAL_1D_VAR_95) {
            warnings.push('CRITICAL_VALUE_AT_RISK');
        } else if (paramVaR.var95Parametric >= policy.warningThresholds.HIGH_1D_VAR_95) {
            warnings.push('HIGH_VALUE_AT_RISK');
        }
    }

    // 4. Data Quality Metadata
    const dataQuality = {
        confidenceLevel: status === 'HEALTHY' && observationCount >= requiredObservations ? 'HIGH' : (status === 'INSUFFICIENT_HISTORY' ? 'UNAVAILABLE' : 'DEGRADED'),
        coverageRatio,
        observationCount,
        requiredObservationCount: requiredObservations,
        hasSufficientParametricHistory: observationCount >= policy.observationThresholds.PARAMETRIC_RISK_MIN_OBSERVATIONS,
        hasSufficientHistoricalHistory: observationCount >= policy.observationThresholds.HISTORICAL_VAR_MIN_OBSERVATIONS,
        evaluationTimestamp: asOfDateISO
    };

    const hPeriods = convertHorizonDaysToPeriods(varHorizonDays, frequency);

    return {
        portfolioId: params.portfolioId || null,
        asOfDate: asOfDateISO,
        policyVersion: DOWNSIDE_RISK_POLICY_VERSION,
        status,
        frequency,
        returnSeriesMethodology: returnData.methodology,
        lookbackStart: navSeries[0]?.date || null,
        lookbackEnd: navSeries[navSeries.length - 1]?.date || null,
        observationCount,
        requiredObservationCount: requiredObservations,
        coverageRatio,

        // Volatility Metrics
        annualizedVolatility: volMetrics.annualizedVolatility,
        periodicVolatility: volMetrics.periodicVolatility,

        // Drawdown Metrics
        maximumDrawdown: ddMetrics.maximumDrawdown,
        currentDrawdown: ddMetrics.currentDrawdown,
        drawdownStartDate: ddMetrics.drawdownStartDate,
        drawdownTroughDate: ddMetrics.drawdownTroughDate,
        drawdownRecoveryDate: ddMetrics.drawdownRecoveryDate,
        drawdownDurationDays: ddMetrics.drawdownDurationDays,
        recoveryDurationDays: ddMetrics.recoveryDurationDays,

        // Downside Deviation & MAR
        marAnnual: downsideMetrics.marAnnual,
        marPeriodic: downsideMetrics.marPeriodic,
        downsideDeviation: downsideMetrics.downsideDeviation,
        sortinoRatio: downsideMetrics.sortinoRatio,

        // Value-at-Risk & Expected Shortfall
        varHorizonDays,
        horizonPeriods: roundTo(hPeriods, 4),
        var95Parametric: paramVaR.var95Parametric,
        var95Historical: histVaR.var95Historical,
        var99Parametric: paramVaR.var99Parametric,
        var99Historical: histVaR.var99Historical,
        cvar95Parametric: paramVaR.cvar95Parametric,
        cvar95Historical: histVaR.cvar95Historical,
        cvar99Parametric: paramVaR.cvar99Parametric,
        cvar99Historical: histVaR.cvar99Historical,

        // Diagnostics & Warnings
        warnings,
        dataQuality
    };
}
