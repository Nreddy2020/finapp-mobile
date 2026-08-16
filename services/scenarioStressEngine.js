/**
 * Scenario & Stress-Test Engine (Stage C.7.6)
 * Master Architectural Standard: C7_6_V1
 * 
 * Provides deterministic, pure read-only multi-factor scenario stress-testing,
 * shock propagation across canonical asset classes and constituent holdings,
 * asset-class and holding-level loss attribution, post-stress liquidity and runway compression
 * delegation to C.7.5, monotonic downside reverse-stress solving, and cross-scenario resilience ratings.
 * 
 * STRICT INVARIANTS:
 * 1. 100% Read-Only: Zero state mutations across holdings, events, quotes, txs, wallets.
 * 2. 100% Deterministic: Mandatory asOfDate on all entry points. Zero wall-clock Date calls.
 * 3. Canonical 8-Class Taxonomy: STOCK, MUTUAL_FUND, ETF, GOLD, CRYPTO, BOND, REAL_ESTATE, OTHER.
 *    (CASH is NOT a 9th canonical risk class; liquidity treatment is delegated to C.7.5).
 * 4. Historical Scenarios as Policy Shock Proxies: Standardized policy vectors inspired by historical regimes;
 *    zero manufactured historical return data.
 * 5. Beta Authority: Authoritative holding metadata vs unit beta 1.0 fallback.
 * 6. Monotonic Downside Reverse-Stress Solver: Downside-only sensitivity guarantees monotonic loss for bisection.
 * 7. Orchestration Layer: Delegates liquidity and cash-flow stress to certified C.7.5 engine.
 */

import { CANONICAL_ASSET_CLASSES } from './targetAllocationService.js';
import { calculateLiquidityBreakdown, evaluateCashFlowAndRunway } from './liquidityEngine.js';

export const SCENARIO_POLICY_VERSION = "C7_6_V1";

export const SCENARIO_CATEGORIES = Object.freeze({
    HISTORICAL_PROXY: 'HISTORICAL_PROXY',
    HYPOTHETICAL: 'HYPOTHETICAL',
    MACRO: 'MACRO',
    CUSTOM: 'CUSTOM'
});

export const BETA_SOURCES = Object.freeze({
    AUTHORITATIVE_METADATA: 'AUTHORITATIVE_METADATA',
    DEFAULT_UNIT_BETA: 'DEFAULT_UNIT_BETA'
});

export const REVERSE_STRESS_STATUS = Object.freeze({
    SOLVED: 'SOLVED',
    ZERO_TARGET: 'ZERO_TARGET',
    INVALID_TARGET: 'INVALID_TARGET',
    UNREACHABLE_WITHIN_BOUNDS: 'UNREACHABLE_WITHIN_BOUNDS'
});

export const SCENARIO_POLICY_V1 = Object.freeze({
    policyVersion: SCENARIO_POLICY_VERSION,
    limits: Object.freeze({
        MIN_STRESS_RETURN: -1.0,
        MAX_STRESS_GAIN: 1.0,
        UNSPECIFIED_SHOCK_POLICY: 0.0,
        REVERSE_STRESS_MAX_LAMBDA: 3.0,
        REVERSE_STRESS_TOLERANCE: 1e-4,
        REVERSE_STRESS_MAX_ITERATIONS: 50
    }),
    tolerances: Object.freeze({
        EPSILON_CURRENCY: 1e-4,
        PERCENTAGE_SUM_TOLERANCE: 1e-6
    }),
    canonicalScenarios: Object.freeze({
        // 1. HISTORICAL POLICY SHOCK PROXIES
        HIST_2008_GFC: Object.freeze({
            id: 'HIST_2008_GFC',
            name: '2008 Global Financial Crisis (Proxy)',
            category: SCENARIO_CATEGORIES.HISTORICAL_PROXY,
            assetShocks: Object.freeze({
                STOCK: -0.45,
                MUTUAL_FUND: -0.38,
                ETF: -0.45,
                GOLD: 0.15,
                CRYPTO: -0.60,
                BOND: 0.05,
                REAL_ESTATE: -0.25,
                OTHER: -0.30
            }),
            incomeShock: 0.20,
            burnShock: 0.0,
            haircutMultiplier: 1.5
        }),
        HIST_2020_COVID: Object.freeze({
            id: 'HIST_2020_COVID',
            name: '2020 COVID-19 Flash Crash (Proxy)',
            category: SCENARIO_CATEGORIES.HISTORICAL_PROXY,
            assetShocks: Object.freeze({
                STOCK: -0.32,
                MUTUAL_FUND: -0.28,
                ETF: -0.32,
                GOLD: -0.05,
                CRYPTO: -0.40,
                BOND: 0.02,
                REAL_ESTATE: -0.10,
                OTHER: -0.20
            }),
            incomeShock: 0.30,
            burnShock: 0.0,
            haircutMultiplier: 1.2
        }),
        HIST_2022_TECH_RATES: Object.freeze({
            id: 'HIST_2022_TECH_RATES',
            name: '2022 Tech & Rate Hike Drawdown (Proxy)',
            category: SCENARIO_CATEGORIES.HISTORICAL_PROXY,
            assetShocks: Object.freeze({
                STOCK: -0.22,
                MUTUAL_FUND: -0.18,
                ETF: -0.22,
                GOLD: -0.02,
                CRYPTO: -0.65,
                BOND: -0.12,
                REAL_ESTATE: -0.08,
                OTHER: -0.15
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.0
        }),
        HIST_2013_TAPER_TANTRUM: Object.freeze({
            id: 'HIST_2013_TAPER_TANTRUM',
            name: '2013 Taper Tantrum (Proxy)',
            category: SCENARIO_CATEGORIES.HISTORICAL_PROXY,
            assetShocks: Object.freeze({
                STOCK: -0.15,
                MUTUAL_FUND: -0.12,
                ETF: -0.15,
                GOLD: -0.20,
                CRYPTO: -0.30,
                BOND: -0.08,
                REAL_ESTATE: -0.05,
                OTHER: -0.10
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.0
        }),

        // 2. HYPOTHETICAL STRESS SCENARIOS
        HYPO_EQUITY_CRASH_MODERATE: Object.freeze({
            id: 'HYPO_EQUITY_CRASH_MODERATE',
            name: 'Moderate Equity Correction',
            category: SCENARIO_CATEGORIES.HYPOTHETICAL,
            assetShocks: Object.freeze({
                STOCK: -0.15,
                MUTUAL_FUND: -0.12,
                ETF: -0.15,
                GOLD: 0.05,
                CRYPTO: -0.25,
                BOND: 0.01,
                REAL_ESTATE: 0.0,
                OTHER: -0.05
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.0
        }),
        HYPO_EQUITY_CRASH_SEVERE: Object.freeze({
            id: 'HYPO_EQUITY_CRASH_SEVERE',
            name: 'Severe Equity Crash',
            category: SCENARIO_CATEGORIES.HYPOTHETICAL,
            assetShocks: Object.freeze({
                STOCK: -0.35,
                MUTUAL_FUND: -0.30,
                ETF: -0.35,
                GOLD: 0.10,
                CRYPTO: -0.50,
                BOND: 0.03,
                REAL_ESTATE: -0.05,
                OTHER: -0.15
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.3
        }),
        HYPO_CRYPTO_CAPITULATION: Object.freeze({
            id: 'HYPO_CRYPTO_CAPITULATION',
            name: 'Crypto Market Capitulation',
            category: SCENARIO_CATEGORIES.HYPOTHETICAL,
            assetShocks: Object.freeze({
                STOCK: 0.0,
                MUTUAL_FUND: 0.0,
                ETF: 0.0,
                GOLD: 0.0,
                CRYPTO: -0.80,
                BOND: 0.0,
                REAL_ESTATE: 0.0,
                OTHER: 0.0
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.0
        }),
        HYPO_REAL_ESTATE_SLUMP: Object.freeze({
            id: 'HYPO_REAL_ESTATE_SLUMP',
            name: 'Real Estate Illiquidity Freeze',
            category: SCENARIO_CATEGORIES.HYPOTHETICAL,
            assetShocks: Object.freeze({
                STOCK: -0.05,
                MUTUAL_FUND: -0.05,
                ETF: -0.05,
                GOLD: 0.0,
                CRYPTO: 0.0,
                BOND: 0.0,
                REAL_ESTATE: -0.30,
                OTHER: -0.10
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.5
        }),

        // 3. MACRO-ECONOMIC STRESS SCENARIOS
        MACRO_STAGFLATION: Object.freeze({
            id: 'MACRO_STAGFLATION',
            name: 'Stagflationary Shock',
            category: SCENARIO_CATEGORIES.MACRO,
            assetShocks: Object.freeze({
                STOCK: -0.20,
                MUTUAL_FUND: -0.18,
                ETF: -0.20,
                GOLD: 0.25,
                CRYPTO: -0.35,
                BOND: -0.15,
                REAL_ESTATE: -0.05,
                OTHER: -0.10
            }),
            incomeShock: 0.15,
            burnShock: 0.15,
            haircutMultiplier: 1.2
        }),
        MACRO_INTEREST_RATE_HIKE: Object.freeze({
            id: 'MACRO_INTEREST_RATE_HIKE',
            name: 'Central Bank Rate Shock',
            category: SCENARIO_CATEGORIES.MACRO,
            assetShocks: Object.freeze({
                STOCK: -0.12,
                MUTUAL_FUND: -0.10,
                ETF: -0.12,
                GOLD: -0.05,
                CRYPTO: -0.25,
                BOND: -0.10,
                REAL_ESTATE: -0.10,
                OTHER: -0.05
            }),
            incomeShock: 0.0,
            burnShock: 0.20,
            haircutMultiplier: 1.0
        }),
        MACRO_PROLONGED_RECESSION: Object.freeze({
            id: 'MACRO_PROLONGED_RECESSION',
            name: 'Prolonged Recession & Job Loss',
            category: SCENARIO_CATEGORIES.MACRO,
            assetShocks: Object.freeze({
                STOCK: -0.30,
                MUTUAL_FUND: -0.25,
                ETF: -0.30,
                GOLD: 0.10,
                CRYPTO: -0.50,
                BOND: 0.04,
                REAL_ESTATE: -0.15,
                OTHER: -0.20
            }),
            incomeShock: 0.50,
            burnShock: 0.10,
            haircutMultiplier: 1.5
        })
    })
});

/**
 * Validates and normalizes an ISO date string deterministically without wall-clock dependency.
 */
function normalizeDateISO(dateInput, paramName = 'asOfDate') {
    if (!dateInput) {
        throw new Error(`[SCENARIO_ENGINE] Missing mandatory deterministic parameter: ${paramName}`);
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
        throw new Error(`[SCENARIO_ENGINE] Invalid ${paramName} timestamp: ${dateInput}`);
    }
    return d.toISOString();
}

/**
 * Clamps a numerical value within [min, max].
 */
function clamp(val, min, max) {
    return Math.min(max, Math.max(min, val));
}

/**
 * Rounds a currency value to 2 decimal places.
 */
function roundCurrency(val) {
    return Math.round(val * 100) / 100;
}

/**
 * Maps a holding's assetClass string to a canonical 8-class taxonomy identifier.
 */
export function normalizeHoldingAssetClass(assetClass) {
    if (!assetClass) return 'OTHER';
    const acUpper = String(assetClass).toUpperCase();
    if (CANONICAL_ASSET_CLASSES.includes(acUpper)) {
        return acUpper;
    }
    // Mapping aliases into canonical 8 classes
    if (acUpper === 'EQUITY_DOMESTIC' || acUpper === 'EQUITY_INTERNATIONAL' || acUpper === 'EQUITY') return 'STOCK';
    if (acUpper === 'DEBT_FIXED_INCOME' || acUpper === 'FIXED_INCOME' || acUpper === 'DEBT') return 'BOND';
    if (acUpper === 'GOLD_COMMODITIES' || acUpper === 'COMMODITIES') return 'GOLD';
    if (acUpper === 'CRYPTO_SPECULATIVE') return 'CRYPTO';
    if (acUpper === 'ALTERNATIVE') return 'REAL_ESTATE';
    if (acUpper === 'CASH' || acUpper === 'CASH_LIQUID') return 'OTHER';
    return 'OTHER';
}

/**
 * Resolves a holding's beta according to the strict authority hierarchy:
 * 1. AUTHORITATIVE_METADATA (if holding.beta is a valid number in [0.0, 5.0])
 * 2. DEFAULT_UNIT_BETA (1.0)
 */
export function resolveHoldingBeta(holding) {
    if (typeof holding.beta === 'number' && !isNaN(holding.beta) && isFinite(holding.beta) && holding.beta >= 0.0 && holding.beta <= 5.0) {
        return {
            beta: holding.beta,
            betaSource: BETA_SOURCES.AUTHORITATIVE_METADATA
        };
    }
    return {
        beta: 1.0,
        betaSource: BETA_SOURCES.DEFAULT_UNIT_BETA
    };
}

/**
 * Validates a custom scenario against the CustomScenarioSchema.
 */
export function validateCustomScenario(customScenario, policy = SCENARIO_POLICY_V1) {
    if (!customScenario || typeof customScenario !== 'object') {
        throw new Error('[SCENARIO_ENGINE] Custom scenario must be a non-null object.');
    }
    if (!customScenario.id || typeof customScenario.id !== 'string' || customScenario.id.trim() === '') {
        throw new Error('[SCENARIO_ENGINE] Custom scenario missing valid string id.');
    }
    if (!customScenario.name || typeof customScenario.name !== 'string' || customScenario.name.trim() === '') {
        throw new Error('[SCENARIO_ENGINE] Custom scenario missing valid string name.');
    }

    const shockVector = customScenario.assetShocks || customScenario.assetClassShockVector || {};
    const sanitizedShocks = {};

    for (const canonicalClass of CANONICAL_ASSET_CLASSES) {
        if (canonicalClass in shockVector) {
            const val = shockVector[canonicalClass];
            if (typeof val !== 'number' || isNaN(val) || !isFinite(val)) {
                throw new Error(`[SCENARIO_ENGINE] Invalid non-finite shock for asset class ${canonicalClass}: ${val}`);
            }
            if (val < policy.limits.MIN_STRESS_RETURN || val > policy.limits.MAX_STRESS_GAIN) {
                throw new Error(`[SCENARIO_ENGINE] Asset shock for ${canonicalClass} out of bounds [${policy.limits.MIN_STRESS_RETURN}, ${policy.limits.MAX_STRESS_GAIN}]: ${val}`);
            }
            sanitizedShocks[canonicalClass] = val;
        } else {
            sanitizedShocks[canonicalClass] = policy.limits.UNSPECIFIED_SHOCK_POLICY;
        }
    }

    // Check for invalid asset classes in shockVector
    for (const key of Object.keys(shockVector)) {
        if (!CANONICAL_ASSET_CLASSES.includes(key)) {
            throw new Error(`[SCENARIO_ENGINE] Invalid non-canonical asset class in scenario shock vector: ${key}`);
        }
    }

    const incomeShock = typeof customScenario.incomeShock === 'number' ? clamp(customScenario.incomeShock, 0.0, 1.0) : 0.0;
    const burnShock = typeof customScenario.burnShock === 'number' ? clamp(customScenario.burnShock, -0.5, 2.0) : 0.0;
    const haircutMultiplier = typeof customScenario.haircutMultiplier === 'number' ? clamp(customScenario.haircutMultiplier, 0.0, 3.0) : 1.0;

    return {
        id: customScenario.id.trim(),
        name: customScenario.name.trim(),
        category: SCENARIO_CATEGORIES.CUSTOM,
        assetShocks: Object.freeze(sanitizedShocks),
        holdingSpecificShocks: customScenario.holdingSpecificShocks || customScenario.holdingShocks || {},
        incomeShock,
        burnShock,
        haircutMultiplier
    };
}

/**
 * Propagates scenario shocks across a portfolio's constituent holdings.
 */
export function propagateScenarioShocks(holdings, scenario, policy = SCENARIO_POLICY_V1) {
    let grossPreStressValue = 0.0;
    let grossPostStressValue = 0.0;

    const holdingResults = [];
    const classLossMap = {};
    const classPreValueMap = {};
    const classPostValueMap = {};

    for (const c of CANONICAL_ASSET_CLASSES) {
        classLossMap[c] = 0.0;
        classPreValueMap[c] = 0.0;
        classPostValueMap[c] = 0.0;
    }

    for (const h of holdings) {
        const val = typeof h.currentValue === 'number' ? h.currentValue : (typeof h.value === 'number' ? h.value : 0.0);
        if (val < 0 || isNaN(val) || !isFinite(val)) {
            throw new Error(`[SCENARIO_ENGINE] Invalid holding valuation: ${val} for holding ${h.symbol || h.id}`);
        }

        const canonicalClass = normalizeHoldingAssetClass(h.assetClass);
        const { beta, betaSource } = resolveHoldingBeta(h);

        // 1. Base asset class shock
        const baseClassShock = (scenario.assetShocks && typeof scenario.assetShocks[canonicalClass] === 'number')
            ? scenario.assetShocks[canonicalClass]
            : policy.limits.UNSPECIFIED_SHOCK_POLICY;

        // 2. Beta transformation
        const deltaBase = baseClassShock * beta;

        // 3. Macro factor adjustment (e.g. general market drift if present)
        const deltaMacro = typeof scenario.macroAdjustment === 'number' ? scenario.macroAdjustment : 0.0;

        // 4. Holding-specific shock
        const holdingId = h.id || h.symbol;
        const deltaHolding = (scenario.holdingSpecificShocks && typeof scenario.holdingSpecificShocks[holdingId] === 'number')
            ? scenario.holdingSpecificShocks[holdingId]
            : 0.0;

        // 5. Raw effective shock
        const deltaRaw = deltaBase + deltaMacro + deltaHolding;

        // 6. Clamping
        const effectiveShock = clamp(deltaRaw, policy.limits.MIN_STRESS_RETURN, policy.limits.MAX_STRESS_GAIN);

        // 7. Post-stress valuation with currency precision rounding
        const postStressVal = Math.max(0.0, roundCurrency(val * (1.0 + effectiveShock)));
        const dollarLoss = roundCurrency(val - postStressVal);

        grossPreStressValue += val;
        grossPostStressValue += postStressVal;

        classPreValueMap[canonicalClass] += val;
        classPostValueMap[canonicalClass] += postStressVal;
        classLossMap[canonicalClass] += dollarLoss;

        holdingResults.push({
            holdingId: h.id || h.symbol,
            symbol: h.symbol || h.id || 'UNKNOWN',
            assetClass: canonicalClass,
            rawAssetClass: h.assetClass || 'OTHER',
            beta,
            betaSource,
            preStressValue: val,
            postStressValue: postStressVal,
            effectiveShock,
            dollarLoss,
            lossContributionShare: null, // Computed after portfolio total
            originalHolding: h
        });
    }

    grossPreStressValue = roundCurrency(grossPreStressValue);
    grossPostStressValue = roundCurrency(grossPostStressValue);
    const totalDollarLoss = roundCurrency(grossPreStressValue - grossPostStressValue);
    const totalPercentageLoss = grossPreStressValue > 0 ? totalDollarLoss / grossPreStressValue : null;

    // Compute holding-level and class-level loss contribution shares
    for (const item of holdingResults) {
        if (totalDollarLoss > policy.tolerances.EPSILON_CURRENCY) {
            item.lossContributionShare = Math.max(0.0, item.dollarLoss / totalDollarLoss);
        } else {
            item.lossContributionShare = null;
        }
    }

    // Build asset class attribution list
    const byAssetClass = [];
    for (const c of CANONICAL_ASSET_CLASSES) {
        const preVal = roundCurrency(classPreValueMap[c]);
        const postVal = roundCurrency(classPostValueMap[c]);
        const cLoss = roundCurrency(classLossMap[c]);
        const pctLoss = preVal > 0 ? cLoss / preVal : null;
        const share = (totalDollarLoss > policy.tolerances.EPSILON_CURRENCY && cLoss > 0)
            ? cLoss / totalDollarLoss
            : null;

        byAssetClass.push({
            assetClass: c,
            preStressValue: preVal,
            postStressValue: postVal,
            dollarLoss: cLoss,
            percentageLoss: pctLoss,
            lossContributionShare: share
        });
    }

    // Deterministic top loss holdings ranking: dollarLoss DESC -> preStressValue DESC -> symbol ASC -> holdingId ASC
    const topLossHoldings = [...holdingResults]
        .filter(h => h.preStressValue > 0)
        .sort((a, b) => {
            if (b.dollarLoss !== a.dollarLoss) return b.dollarLoss - a.dollarLoss;
            if (b.preStressValue !== a.preStressValue) return b.preStressValue - a.preStressValue;
            const sa = a.symbol || '';
            const sb = b.symbol || '';
            if (sa !== sb) return sa.localeCompare(sb);
            return (a.holdingId || '').localeCompare(b.holdingId || '');
        })
        .slice(0, 5)
        .map(h => ({
            holdingId: h.holdingId,
            symbol: h.symbol,
            assetClass: h.assetClass,
            beta: h.beta,
            betaSource: h.betaSource,
            preStressValue: h.preStressValue,
            postStressValue: h.postStressValue,
            dollarLoss: h.dollarLoss,
            lossContributionShare: h.lossContributionShare
        }));

    return {
        grossPreStressValue,
        grossPostStressValue,
        totalDollarLoss,
        totalPercentageLoss,
        holdings: holdingResults,
        byAssetClass,
        topLossHoldings
    };
}

/**
 * Evaluates the Monotonic Downside Reverse-Stress Solver for a target portfolio loss ratio L*.
 */
export function solveReverseStressLossThreshold(holdings, targetLossRatio, policy = SCENARIO_POLICY_V1) {
    if (typeof targetLossRatio !== 'number' || isNaN(targetLossRatio) || !isFinite(targetLossRatio)) {
        return {
            solvedLambda: null,
            status: REVERSE_STRESS_STATUS.INVALID_TARGET,
            iterations: 0
        };
    }

    if (targetLossRatio <= 0.0) {
        return {
            solvedLambda: 0.0,
            status: REVERSE_STRESS_STATUS.ZERO_TARGET,
            iterations: 0
        };
    }

    if (targetLossRatio > 1.0) {
        return {
            solvedLambda: null,
            status: REVERSE_STRESS_STATUS.INVALID_TARGET,
            iterations: 0
        };
    }

    let grossPreValue = 0.0;
    const sensitivities = [];

    // Reference canonical equity crash scenario as standard base sensitivity
    const refScenario = policy.canonicalScenarios.HYPO_EQUITY_CRASH_SEVERE;

    for (const h of holdings) {
        const val = typeof h.currentValue === 'number' ? h.currentValue : (typeof h.value === 'number' ? h.value : 0.0);
        const canonicalClass = normalizeHoldingAssetClass(h.assetClass);
        const { beta } = resolveHoldingBeta(h);

        const baseShock = refScenario.assetShocks[canonicalClass] || policy.limits.UNSPECIFIED_SHOCK_POLICY;
        // Downside-only sensitivity: s_i^{downside} = min(0.0, baseShock * beta) <= 0.0
        const downsideSens = Math.min(0.0, baseShock * beta);

        grossPreValue += val;
        sensitivities.push({
            value: val,
            downsideSens
        });
    }

    if (grossPreValue <= 0) {
        return {
            solvedLambda: null,
            status: REVERSE_STRESS_STATUS.INVALID_TARGET,
            iterations: 0
        };
    }

    // Monotonic loss evaluator: L_p(lambda) = 1.0 - V_p(lambda) / V_p
    const evaluateLossAtLambda = (lambda) => {
        let vStressed = 0.0;
        for (const item of sensitivities) {
            const shock = clamp(lambda * item.downsideSens, policy.limits.MIN_STRESS_RETURN, 0.0);
            vStressed += Math.max(0.0, item.value * (1.0 + shock));
        }
        return 1.0 - (vStressed / grossPreValue);
    };

    const lambdaMax = policy.limits.REVERSE_STRESS_MAX_LAMBDA;
    const maxAchievableLoss = evaluateLossAtLambda(lambdaMax);

    if (maxAchievableLoss < targetLossRatio - policy.limits.REVERSE_STRESS_TOLERANCE) {
        return {
            solvedLambda: null,
            status: REVERSE_STRESS_STATUS.UNREACHABLE_WITHIN_BOUNDS,
            iterations: 0
        };
    }

    // Monotonic Bisection Solver
    let low = 0.0;
    let high = lambdaMax;
    let iterations = 0;
    let solvedLambda = null;

    while (iterations < policy.limits.REVERSE_STRESS_MAX_ITERATIONS) {
        iterations++;
        const mid = (low + high) / 2.0;
        const lossMid = evaluateLossAtLambda(mid);

        if (Math.abs(lossMid - targetLossRatio) <= policy.limits.REVERSE_STRESS_TOLERANCE) {
            solvedLambda = Math.round(mid * 10000) / 10000;
            break;
        }

        if (lossMid < targetLossRatio) {
            low = mid;
        } else {
            high = mid;
        }
    }

    if (solvedLambda === null) {
        solvedLambda = Math.round(((low + high) / 2.0) * 10000) / 10000;
    }

    return {
        solvedLambda,
        status: REVERSE_STRESS_STATUS.SOLVED,
        iterations
    };
}

/**
 * Assigns a deterministic resilience rating based on percentage loss and post-stress runway.
 */
export function assignResilienceRating(percentageLoss, runwayMonths) {
    if (percentageLoss === null) return 'HIGH';
    const loss = percentageLoss;

    if (loss > 0.35 || (runwayMonths !== null && runwayMonths < 2.0)) {
        return 'CRITICAL';
    }
    if (loss > 0.20 || (runwayMonths !== null && runwayMonths < 4.0)) {
        return 'VULNERABLE';
    }
    if (loss > 0.10 || (runwayMonths !== null && runwayMonths < 6.0)) {
        return 'MODERATE';
    }
    return 'HIGH';
}

/**
 * Master API: Evaluates comprehensive portfolio stress scenarios, loss attribution,
 * post-stress liquidity delegation to C.7.5, reverse stress testing, and resilience summary.
 */
export function evaluatePortfolioStressScenarios(portfolioData = {}, asOfDate, options = {}) {
    const asOfISO = normalizeDateISO(asOfDate, 'asOfDate');
    const policy = options.policy || SCENARIO_POLICY_V1;
    const portfolioId = portfolioData.portfolioId || portfolioData.id || null;
    const holdings = Array.isArray(portfolioData.holdings) ? portfolioData.holdings : [];
    const monthlyCashFlowInput = portfolioData.monthlyCashFlow || portfolioData.cashFlow || {};

    const customScenarios = Array.isArray(options.customScenarios) ? options.customScenarios : [];

    // 1. EMPTY PORTFOLIO BOUNDARY
    if (holdings.length === 0) {
        return {
            portfolioId,
            asOfDate: asOfISO,
            policyVersion: policy.policyVersion,
            status: 'EMPTY_PORTFOLIO',
            dataQuality: {
                confidenceLevel: 'UNAVAILABLE',
                coverageRatio: 0.0,
                hasCashFlowData: false,
                hasValuationData: false,
                unknownHoldingCount: 0,
                upstreamQualitySummary: {
                    concentrationConfidence: 'UNAVAILABLE',
                    volatilityConfidence: 'UNAVAILABLE',
                    correlationConfidence: 'UNAVAILABLE',
                    liquidityConfidence: 'UNAVAILABLE'
                }
            },
            baseline: {
                grossPortfolioValue: 0.0,
                accessibleLiquidity: 0.0,
                monthlyIncome: 0.0,
                survivalBurn: 0.0,
                totalBurn: 0.0,
                baselineRunwayMonths: null
            },
            scenarios: {},
            reverseStressTest: {
                marketDropToCause20PctLoss: { solvedLambda: null, status: REVERSE_STRESS_STATUS.INVALID_TARGET, iterations: 0 },
                marketDropToCause35PctLoss: { solvedLambda: null, status: REVERSE_STRESS_STATUS.INVALID_TARGET, iterations: 0 },
                criticalVulnerabilityFactor: null
            },
            resilienceSummary: {
                worstCaseScenarioId: null,
                worstCaseDollarLoss: 0.0,
                worstCasePercentageLoss: null,
                worstCaseRunwayMonths: null,
                averagePercentageLoss: null,
                overallStressResilienceTier: 'ROBUST'
            },
            warnings: ['EMPTY_PORTFOLIO']
        };
    }

    // 2. BASELINE EVALUATION VIA C.7.5
    const baselineLiquidity = calculateLiquidityBreakdown(holdings, asOfISO);
    const baselineFlow = evaluateCashFlowAndRunway(monthlyCashFlowInput, baselineLiquidity);

    const baseline = {
        grossPortfolioValue: baselineLiquidity.grossPortfolioValue,
        accessibleLiquidity: baselineLiquidity.accessibleValue,
        monthlyIncome: baselineFlow.monthlyCashFlow.income,
        survivalBurn: baselineFlow.monthlyCashFlow.survivalBurn,
        totalBurn: baselineFlow.monthlyCashFlow.totalBurn,
        baselineRunwayMonths: baselineFlow.runway.totalMonths
    };

    // 3. COMPOSE ALL SCENARIOS (CANONICAL + CUSTOM)
    const scenarioMap = {};
    const warnings = [];

    // Add canonical scenarios
    for (const [sId, sDef] of Object.entries(policy.canonicalScenarios)) {
        scenarioMap[sId] = sDef;
    }

    // Validate and add custom scenarios
    for (const cInput of customScenarios) {
        if (scenarioMap[cInput.id]) {
            warnings.push(`DUPLICATE_CUSTOM_SCENARIO_ID_REJECTED_${cInput.id}`);
            continue;
        }
        try {
            const validated = validateCustomScenario(cInput, policy);
            scenarioMap[validated.id] = validated;
        } catch (err) {
            warnings.push(`INVALID_CUSTOM_SCENARIO_SKIPPED_${cInput.id || 'UNKNOWN'}`);
        }
    }

    // 4. EVALUATE SCENARIOS MATRIX
    const evaluatedScenarios = {};
    let worstCaseScenarioId = null;
    let worstCaseDollarLoss = -1.0;
    let worstCasePercentageLoss = null;
    let worstCaseRunway = null;
    let sumPercentageLoss = 0.0;
    let scenarioCount = 0;

    for (const [sId, scenario] of Object.entries(scenarioMap)) {
        const shockResult = propagateScenarioShocks(holdings, scenario, policy);

        // Delegate post-stress liquidity to C.7.5
        const stressedHoldingsForLiquidity = shockResult.holdings.map(h => ({
            ...h.originalHolding,
            currentValue: h.postStressValue,
            value: h.postStressValue
        }));

        const postStressLiquidity = calculateLiquidityBreakdown(stressedHoldingsForLiquidity, asOfISO);

        // Compute post-stress cash flows with macro shocks
        const stressedIncome = Math.max(0.0, baseline.monthlyIncome * (1.0 - (scenario.incomeShock || 0.0)));
        const burnMultiplier = 1.0 + (scenario.burnShock || 0.0);
        const stressedCashFlowInput = {
            monthlyIncome: stressedIncome,
            essentialBurn: typeof monthlyCashFlowInput.essentialBurn === 'number' ? monthlyCashFlowInput.essentialBurn * burnMultiplier : undefined,
            discretionaryBurn: typeof monthlyCashFlowInput.discretionaryBurn === 'number' ? monthlyCashFlowInput.discretionaryBurn * burnMultiplier : undefined,
            totalMonthlyBurn: typeof monthlyCashFlowInput.totalMonthlyBurn === 'number' ? monthlyCashFlowInput.totalMonthlyBurn * burnMultiplier : undefined,
            debtBurn: typeof monthlyCashFlowInput.debtBurn === 'number' ? monthlyCashFlowInput.debtBurn * burnMultiplier : undefined
        };

        const postStressFlow = evaluateCashFlowAndRunway(stressedCashFlowInput, postStressLiquidity);

        const postStressDeficit = Math.max(0.0, postStressFlow.monthlyCashFlow.totalBurn - stressedIncome);
        const postStressRunway = postStressFlow.runway.totalMonths;
        const runwayCompression = (baseline.baselineRunwayMonths !== null && postStressRunway !== null)
            ? Math.max(0.0, baseline.baselineRunwayMonths - postStressRunway)
            : null;

        const resilienceRating = assignResilienceRating(shockResult.totalPercentageLoss, postStressRunway);

        const scenarioWarnings = [];
        if (scenario.category === SCENARIO_CATEGORIES.HISTORICAL_PROXY) {
            scenarioWarnings.push('HISTORICAL_POLICY_PROXY_SCENARIO');
        }
        if (resilienceRating === 'CRITICAL') {
            scenarioWarnings.push('CRITICAL_SCENARIO_VULNERABILITY');
        }

        evaluatedScenarios[sId] = {
            scenarioId: sId,
            scenarioName: scenario.name,
            scenarioCategory: scenario.category,
            stressedPortfolioValue: shockResult.grossPostStressValue,
            dollarLoss: shockResult.totalDollarLoss,
            percentageLoss: shockResult.totalPercentageLoss,
            postStressAccessibleLiquidity: postStressLiquidity.accessibleValue,
            postStressMonthlyDeficit: postStressDeficit,
            postStressRunwayMonths: postStressRunway,
            runwayCompressionMonths: runwayCompression,
            resilienceRating,
            lossAttribution: {
                byAssetClass: shockResult.byAssetClass,
                topLossHoldings: shockResult.topLossHoldings
            },
            warnings: scenarioWarnings
        };

        // Track worst-case scenario
        if (shockResult.totalDollarLoss > worstCaseDollarLoss) {
            worstCaseDollarLoss = shockResult.totalDollarLoss;
            worstCaseScenarioId = sId;
            worstCasePercentageLoss = shockResult.totalPercentageLoss;
            worstCaseRunway = postStressRunway;
        }

        if (shockResult.totalPercentageLoss !== null) {
            sumPercentageLoss += shockResult.totalPercentageLoss;
            scenarioCount++;
        }
    }

    const averagePercentageLoss = scenarioCount > 0 ? sumPercentageLoss / scenarioCount : null;

    // 5. REVERSE STRESS TESTING
    const rev20 = solveReverseStressLossThreshold(holdings, 0.20, policy);
    const rev35 = solveReverseStressLossThreshold(holdings, 0.35, policy);

    // Identify critical vulnerability factor
    let criticalVulnerabilityFactor = 'BALANCED';
    if (baselineLiquidity.lockedPercentage > 0.30) {
        criticalVulnerabilityFactor = 'LOCKED_ASSET_ILLIQUIDITY';
    } else {
        const topLoss = evaluatedScenarios[worstCaseScenarioId]?.lossAttribution?.byAssetClass?.slice()?.sort((a, b) => b.dollarLoss - a.dollarLoss)?.[0];
        if (topLoss && topLoss.percentageLoss > 0.25) {
            criticalVulnerabilityFactor = `${topLoss.assetClass}_CONCENTRATION`;
        }
    }

    // 6. RESILIENCE SUMMARY TIER
    let overallStressResilienceTier = 'ROBUST';
    if (worstCasePercentageLoss > 0.35 || (worstCaseRunway !== null && worstCaseRunway < 2.0)) {
        overallStressResilienceTier = 'HIGHLY_VULNERABLE';
    } else if (worstCasePercentageLoss > 0.20 || (worstCaseRunway !== null && worstCaseRunway < 4.0)) {
        overallStressResilienceTier = 'VULNERABLE';
    } else if (worstCasePercentageLoss > 0.10 || (worstCaseRunway !== null && worstCaseRunway < 6.0)) {
        overallStressResilienceTier = 'RESILIENT';
    }

    // 7. CONFIDENCE PROPAGATION
    let confidenceLevel = 'HIGH';
    if (baselineFlow.monthlyCashFlow.essentialBurnIsEstimated) {
        confidenceLevel = 'MODERATE';
    }
    if (baselineLiquidity.unknownPercentage > 0.15 || baselineFlow.monthlyCashFlow.burnSource === 'UNAVAILABLE') {
        confidenceLevel = 'LOW';
    }

    return {
        portfolioId,
        asOfDate: asOfISO,
        policyVersion: policy.policyVersion,
        status: 'EVALUATED',
        dataQuality: {
            confidenceLevel,
            coverageRatio: Math.round((1.0 - baselineLiquidity.unknownPercentage) * 1000) / 1000,
            hasCashFlowData: baselineFlow.monthlyCashFlow.burnSource !== 'UNAVAILABLE',
            hasValuationData: baselineLiquidity.grossPortfolioValue > 0,
            unknownHoldingCount: baselineLiquidity.unknownHoldingCount,
            upstreamQualitySummary: {
                concentrationConfidence: confidenceLevel,
                volatilityConfidence: confidenceLevel,
                correlationConfidence: confidenceLevel,
                liquidityConfidence: baselineFlow.monthlyCashFlow.essentialBurnIsEstimated ? 'MODERATE' : 'HIGH'
            }
        },
        baseline,
        scenarios: evaluatedScenarios,
        reverseStressTest: {
            marketDropToCause20PctLoss: rev20,
            marketDropToCause35PctLoss: rev35,
            criticalVulnerabilityFactor
        },
        resilienceSummary: {
            worstCaseScenarioId,
            worstCaseDollarLoss,
            worstCasePercentageLoss,
            worstCaseRunwayMonths: worstCaseRunway,
            averagePercentageLoss,
            overallStressResilienceTier
        },
        warnings
    };
}
