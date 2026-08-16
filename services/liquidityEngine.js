/**
 * Liquidity & Cash-Flow Stress Engine (Stage C.7.5)
 * Master Architectural Standard: C7_5_V1
 * 
 * Provides deterministic, read-only analytical evaluation of portfolio liquidity horizons,
 * multi-horizon redemption capacity (T+0, T+2/T+3, T+4/T+7, Locked/Illiquid), recurring cash-flow
 * emergency runway buffers, income shocks, portfolio fire-sale haircuts, early-break penalties,
 * lockup/ELSS exit schedules, and deterministic composite liquidity stress scores.
 * 
 * STRICT INVARIANTS:
 * 1. 100% Read-Only: Zero state mutations across holdings, events, quotes, txs, wallets.
 * 2. 100% Deterministic: Mandatory asOfDate on all entry points. Zero wall-clock Date calls.
 * 3. 5-Tier Authority Hierarchy: Regulatory > Authoritative Product Metadata > Derived Asset Class > User Declared > Policy Default.
 * 4. Zero Manufactured Liquidity: Unknown assets remain UNKNOWN; never converted to liquid.
 * 5. Estimated Burn Isolation: Estimated burn (70% fallback) caps confidence at MODERATE and reports sensitivity spectrum.
 */

import { DEFAULT_ASSET_LIQUIDITY_MAP, LiquidityTier } from './riskTaxonomy.js';
import { CANONICAL_ASSET_CLASSES } from './targetAllocationService.js';

export const LIQUIDITY_POLICY_VERSION = "C7_5_V1";

export const LIQUIDITY_HORIZONS = Object.freeze({
    T0: 'T0',
    T2_T3: 'T2_T3',
    T4_T7: 'T4_T7',
    LOCKED_ILLIQUID: 'LOCKED_ILLIQUID',
    UNKNOWN: 'UNKNOWN'
});

export const LIQUIDITY_CLASSIFICATION_SOURCES = Object.freeze({
    REGULATORY_CONSTRAINT: 'REGULATORY_CONSTRAINT',
    AUTHORITATIVE_PRODUCT_METADATA: 'AUTHORITATIVE_PRODUCT_METADATA',
    DERIVED_ASSET_CLASS: 'DERIVED_ASSET_CLASS',
    USER_DECLARED_METADATA: 'USER_DECLARED_METADATA',
    POLICY_DEFAULT: 'POLICY_DEFAULT'
});

export const LIQUIDITY_POLICY_V1 = Object.freeze({
    policyVersion: LIQUIDITY_POLICY_VERSION,
    haircuts: Object.freeze({
        NO_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.0, T4_T7: 0.0, LOCKED: 1.0, UNKNOWN: 1.0 }),
        MODERATE_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.05, T4_T7: 0.15, LOCKED: 1.0, UNKNOWN: 1.0 }),
        SEVERE_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.15, T4_T7: 0.30, LOCKED: 1.0, UNKNOWN: 1.0 }),
        FD_EARLY_EXIT_HAIRCUT: 0.02 // 2.0% policy default penalty
    }),
    incomeShocks: Object.freeze({
        BASE: 0.0,                // 100% income retained
        MILD_INCOME_SHOCK: 0.25,  // 25% loss (75% retained)
        SEVERE_INCOME_SHOCK: 0.50,// 50% loss (50% retained)
        ZERO_INCOME: 1.0          // 100% loss (0% retained)
    }),
    burnEstimation: Object.freeze({
        DEFAULT_ESTIMATED_ESSENTIAL_BURN_RATIO: 0.70,
        LOW_ESTIMATED_ESSENTIAL_BURN_RATIO: 0.50,
        HIGH_ESTIMATED_ESSENTIAL_BURN_RATIO: 0.85
    }),
    defaults: Object.freeze({
        MATURED_FD_FALLBACK_TIER: 'T2_T3'
    }),
    runwayThresholdsMonths: Object.freeze({
        CRITICAL: 3.0,
        ADEQUATE: 6.0,
        STRONG: 12.0
    }),
    lockedAssetThresholds: Object.freeze({
        HIGH_LOCKED_EXPOSURE: 0.30,
        CRITICAL_LOCKED_EXPOSURE: 0.50,
        HIGH_UNKNOWN_EXPOSURE: 0.15
    }),
    scoreTiers: Object.freeze({
        HEALTHY_MIN: 80.0,
        WATCH_MIN: 60.0,
        STRESSED_MIN: 40.0
    }),
    scoreComponentWeights: Object.freeze({
        IMMEDIATE_ADEQUACY: 20,
        SHORT_TERM_ADEQUACY: 20,
        TOTAL_RUNWAY: 25,
        CASH_FLOW_SOLVENCY: 15,
        LOCKED_PENALTY: 10,
        STRESS_RESILIENCE: 10
    }),
    tolerances: Object.freeze({
        EPSILON_CURRENCY: 1e-4,
        PERCENTAGE_SUM_TOLERANCE: 1e-6
    })
});

/**
 * Validates and normalizes an ISO date string deterministically without wall-clock dependency.
 */
function normalizeDateISO(dateInput, paramName = 'asOfDate') {
    if (!dateInput) {
        throw new Error(`[LIQUIDITY_ENGINE] Missing mandatory deterministic parameter: ${paramName}`);
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
        throw new Error(`[LIQUIDITY_ENGINE] Invalid ${paramName} timestamp: ${dateInput}`);
    }
    return d.toISOString();
}

/**
 * Computes calendar day difference between two ISO dates (dateB - dateA in days).
 */
function getDaysDifference(dateAStr, dateBStr) {
    const da = new Date(dateAStr);
    const db = new Date(dateBStr);
    return Math.floor((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Classifies a single holding into its authoritative liquidity horizon according to the
 * 5-tier authority hierarchy.
 */
export function classifyHoldingLiquidity(holding, asOfDate, policy = LIQUIDITY_POLICY_V1) {
    const asOfISO = normalizeDateISO(asOfDate, 'asOfDate');
    const symbol = holding.symbol || holding.id || 'UNKNOWN';
    const assetClass = holding.assetClass;
    const isStatutoryLock = holding.isStatutoryLock === true || holding.isRegulatoryLock === true || holding.isELSS === true || holding.productType === 'ELSS' || holding.productType === 'PPF' || holding.productType === 'EPF';
    
    // Check lockEndDate and maturityDate
    const lockEndDateISO = holding.lockEndDate ? normalizeDateISO(holding.lockEndDate, 'lockEndDate') : null;
    const maturityDateISO = holding.maturityDate ? normalizeDateISO(holding.maturityDate, 'maturityDate') : null;
    const effectiveRestrictedDate = lockEndDateISO || maturityDateISO;

    // 1. TIER 1: REGULATORY / STATUTORY CONSTRAINT (Highest Authority)
    if (isStatutoryLock && effectiveRestrictedDate) {
        const daysRemaining = getDaysDifference(asOfISO, effectiveRestrictedDate);
        if (daysRemaining > 0) {
            return {
                holdingId: holding.id || symbol,
                symbol,
                assetClass,
                liquidityTier: LIQUIDITY_HORIZONS.LOCKED_ILLIQUID,
                liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.REGULATORY_CONSTRAINT,
                overrideApplied: false,
                isLocked: true,
                daysToAccess: daysRemaining,
                lockEndDate: effectiveRestrictedDate,
                realizablePenaltyRate: 0.0,
                earlyExitAllowed: false
            };
        }
    }

    // 2. TIER 2: AUTHORITATIVE PRODUCT / CONTRACTUAL METADATA
    if (effectiveRestrictedDate) {
        const daysRemaining = getDaysDifference(asOfISO, effectiveRestrictedDate);
        if (daysRemaining > 0) {
            // Instrument is pre-maturity / active lock
            if (holding.allowEarlyExit === true) {
                const earlyExitDateISO = holding.earlyExitDate || holding.liquidityDate ? normalizeDateISO(holding.earlyExitDate || holding.liquidityDate, 'earlyExitDate') : null;
                const penaltyRate = typeof holding.earlyExitPenaltyRate === 'number' && holding.earlyExitPenaltyRate >= 0
                    ? holding.earlyExitPenaltyRate
                    : policy.haircuts.FD_EARLY_EXIT_HAIRCUT;

                if (earlyExitDateISO) {
                    const daysToExit = getDaysDifference(asOfISO, earlyExitDateISO);
                    if (daysToExit <= 0) {
                        return {
                            holdingId: holding.id || symbol,
                            symbol,
                            assetClass,
                            liquidityTier: LIQUIDITY_HORIZONS.T0,
                            liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA,
                            overrideApplied: false,
                            isLocked: false,
                            daysToAccess: 0,
                            lockEndDate: effectiveRestrictedDate,
                            realizablePenaltyRate: penaltyRate,
                            earlyExitAllowed: true
                        };
                    } else if (daysToExit <= 3) {
                        return {
                            holdingId: holding.id || symbol,
                            symbol,
                            assetClass,
                            liquidityTier: LIQUIDITY_HORIZONS.T2_T3,
                            liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA,
                            overrideApplied: false,
                            isLocked: false,
                            daysToAccess: daysToExit,
                            lockEndDate: effectiveRestrictedDate,
                            realizablePenaltyRate: penaltyRate,
                            earlyExitAllowed: true
                        };
                    } else if (daysToExit <= 7) {
                        return {
                            holdingId: holding.id || symbol,
                            symbol,
                            assetClass,
                            liquidityTier: LIQUIDITY_HORIZONS.T4_T7,
                            liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA,
                            overrideApplied: false,
                            isLocked: false,
                            daysToAccess: daysToExit,
                            lockEndDate: effectiveRestrictedDate,
                            realizablePenaltyRate: penaltyRate,
                            earlyExitAllowed: true
                        };
                    } else {
                        return {
                            holdingId: holding.id || symbol,
                            symbol,
                            assetClass,
                            liquidityTier: LIQUIDITY_HORIZONS.LOCKED_ILLIQUID,
                            liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA,
                            overrideApplied: false,
                            isLocked: true,
                            daysToAccess: daysToExit,
                            lockEndDate: effectiveRestrictedDate,
                            realizablePenaltyRate: 0.0,
                            earlyExitAllowed: true
                        };
                    }
                } else {
                    // allowEarlyExit = true but no accessibility date provided -> conservative LOCKED
                    return {
                        holdingId: holding.id || symbol,
                        symbol,
                        assetClass,
                        liquidityTier: LIQUIDITY_HORIZONS.LOCKED_ILLIQUID,
                        liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA,
                        overrideApplied: false,
                        isLocked: true,
                        daysToAccess: daysRemaining,
                        lockEndDate: effectiveRestrictedDate,
                        realizablePenaltyRate: 0.0,
                        earlyExitAllowed: true
                    };
                }
            } else {
                // allowEarlyExit !== true
                return {
                    holdingId: holding.id || symbol,
                    symbol,
                    assetClass,
                    liquidityTier: LIQUIDITY_HORIZONS.LOCKED_ILLIQUID,
                    liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA,
                    overrideApplied: false,
                    isLocked: true,
                    daysToAccess: daysRemaining,
                    lockEndDate: effectiveRestrictedDate,
                    realizablePenaltyRate: 0.0,
                    earlyExitAllowed: false
                };
            }
        } else {
            // Matured instrument (daysRemaining <= 0)
            if (holding.accessibilityTier === 'T0' || holding.settlementTier === 'T0' || holding.isAutoSweep === true) {
                return {
                    holdingId: holding.id || symbol,
                    symbol,
                    assetClass,
                    liquidityTier: LIQUIDITY_HORIZONS.T0,
                    liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA,
                    overrideApplied: false,
                    isLocked: false,
                    daysToAccess: 0,
                    lockEndDate: null,
                    realizablePenaltyRate: 0.0,
                    earlyExitAllowed: false
                };
            } else if (holding.accessibilityTier === 'T2_T3' || holding.settlementTier === 'T2_T3') {
                return {
                    holdingId: holding.id || symbol,
                    symbol,
                    assetClass,
                    liquidityTier: LIQUIDITY_HORIZONS.T2_T3,
                    liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.AUTHORITATIVE_PRODUCT_METADATA,
                    overrideApplied: false,
                    isLocked: false,
                    daysToAccess: 2,
                    lockEndDate: null,
                    realizablePenaltyRate: 0.0,
                    earlyExitAllowed: false
                };
            } else {
                // Fallback for matured instrument when accessibility is unspecified
                const fallbackTier = policy.defaults.MATURED_FD_FALLBACK_TIER || LIQUIDITY_HORIZONS.T2_T3;
                return {
                    holdingId: holding.id || symbol,
                    symbol,
                    assetClass,
                    liquidityTier: fallbackTier,
                    liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.POLICY_DEFAULT,
                    overrideApplied: false,
                    isLocked: false,
                    daysToAccess: fallbackTier === LIQUIDITY_HORIZONS.T0 ? 0 : 2,
                    lockEndDate: null,
                    realizablePenaltyRate: 0.0,
                    earlyExitAllowed: false
                };
            }
        }
    }

    // 3. TIER 3: USER DECLARED OVERRIDE (Allowed ONLY on unrestricted assets)
    if (holding.userLiquidityTier || holding.liquidityTier) {
        const declaredTier = holding.userLiquidityTier || holding.liquidityTier;
        if (Object.values(LIQUIDITY_HORIZONS).includes(declaredTier) && declaredTier !== LIQUIDITY_HORIZONS.UNKNOWN) {
            return {
                holdingId: holding.id || symbol,
                symbol,
                assetClass,
                liquidityTier: declaredTier,
                liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.USER_DECLARED_METADATA,
                overrideApplied: true,
                isLocked: declaredTier === LIQUIDITY_HORIZONS.LOCKED_ILLIQUID,
                daysToAccess: declaredTier === LIQUIDITY_HORIZONS.T0 ? 0 : (declaredTier === LIQUIDITY_HORIZONS.T2_T3 ? 2 : 5),
                lockEndDate: null,
                realizablePenaltyRate: 0.0,
                earlyExitAllowed: false
            };
        }
    }

    // 4. TIER 4: DERIVED CANONICAL ASSET CLASS TAXONOMY
    if (assetClass) {
        let tier = LIQUIDITY_HORIZONS.UNKNOWN;
        let isLocked = false;
        let daysToAccess = 2;

        if (assetClass === 'CASH' || assetClass === 'CASH_LIQUID' || assetClass === 'ETF') {
            tier = LIQUIDITY_HORIZONS.T0;
            daysToAccess = 0;
        } else if (assetClass === 'STOCK' || assetClass === 'EQUITY_DOMESTIC' || assetClass === 'EQUITY_INTERNATIONAL' || assetClass === 'MUTUAL_FUND' || assetClass === 'BOND' || assetClass === 'DEBT_FIXED_INCOME') {
            tier = LIQUIDITY_HORIZONS.T2_T3;
            daysToAccess = 2;
        } else if (assetClass === 'GOLD' || assetClass === 'GOLD_COMMODITIES' || assetClass === 'CRYPTO' || assetClass === 'CRYPTO_SPECULATIVE' || assetClass === 'OTHER') {
            tier = LIQUIDITY_HORIZONS.T4_T7;
            daysToAccess = 5;
        } else if (assetClass === 'REAL_ESTATE' || assetClass === 'ALTERNATIVE') {
            tier = LIQUIDITY_HORIZONS.LOCKED_ILLIQUID;
            isLocked = true;
            daysToAccess = 999;
        }

        if (tier !== LIQUIDITY_HORIZONS.UNKNOWN) {
            return {
                holdingId: holding.id || symbol,
                symbol,
                assetClass,
                liquidityTier: tier,
                liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.DERIVED_ASSET_CLASS,
                overrideApplied: false,
                isLocked,
                daysToAccess,
                lockEndDate: null,
                realizablePenaltyRate: 0.0,
                earlyExitAllowed: false
            };
        }
    }

    // 5. TIER 5: CONSERVATIVE UNKNOWN FALLBACK
    return {
        holdingId: holding.id || symbol,
        symbol,
        assetClass: assetClass || 'UNKNOWN',
        liquidityTier: LIQUIDITY_HORIZONS.UNKNOWN,
        liquidityClassificationSource: LIQUIDITY_CLASSIFICATION_SOURCES.POLICY_DEFAULT,
        overrideApplied: false,
        isLocked: false,
        daysToAccess: null,
        lockEndDate: null,
        realizablePenaltyRate: 0.0,
        earlyExitAllowed: false
    };
}

/**
 * Evaluates full portfolio liquidity valuation, horizon aggregation, haircuts, and percentages.
 */
export function calculateLiquidityBreakdown(holdings, asOfDate, policy = LIQUIDITY_POLICY_V1) {
    let grossPortfolioValue = 0.0;
    let liquidValueT0 = 0.0;
    let liquidValueT23 = 0.0;
    let liquidValueT47 = 0.0;
    let lockedValue = 0.0;
    let unknownLiquidityValue = 0.0;
    let unknownHoldingCount = 0;

    let stressedAccessibleModerate = 0.0;
    let stressedAccessibleSevere = 0.0;

    const breakdownList = [];

    for (const h of holdings) {
        const val = typeof h.currentValue === 'number' ? h.currentValue : (typeof h.value === 'number' ? h.value : 0.0);
        if (val < 0 || isNaN(val) || !isFinite(val)) {
            throw new Error(`[LIQUIDITY_ENGINE] Invalid holding valuation: ${val} for holding ${h.symbol || h.id}`);
        }

        const classification = classifyHoldingLiquidity(h, asOfDate, policy);
        const item = {
            ...classification,
            value: val
        };
        breakdownList.push(item);

        grossPortfolioValue += val;

        if (classification.liquidityTier === LIQUIDITY_HORIZONS.T0) {
            liquidValueT0 += val;
            const netVal = val * (1.0 - classification.realizablePenaltyRate);
            stressedAccessibleModerate += netVal * (1.0 - policy.haircuts.MODERATE_HAIRCUT.T0);
            stressedAccessibleSevere += netVal * (1.0 - policy.haircuts.SEVERE_HAIRCUT.T0);
        } else if (classification.liquidityTier === LIQUIDITY_HORIZONS.T2_T3) {
            liquidValueT23 += val;
            const netVal = val * (1.0 - classification.realizablePenaltyRate);
            stressedAccessibleModerate += netVal * (1.0 - policy.haircuts.MODERATE_HAIRCUT.T2_T3);
            stressedAccessibleSevere += netVal * (1.0 - policy.haircuts.SEVERE_HAIRCUT.T2_T3);
        } else if (classification.liquidityTier === LIQUIDITY_HORIZONS.T4_T7) {
            liquidValueT47 += val;
            const netVal = val * (1.0 - classification.realizablePenaltyRate);
            stressedAccessibleModerate += netVal * (1.0 - policy.haircuts.MODERATE_HAIRCUT.T4_T7);
            stressedAccessibleSevere += netVal * (1.0 - policy.haircuts.SEVERE_HAIRCUT.T4_T7);
        } else if (classification.liquidityTier === LIQUIDITY_HORIZONS.LOCKED_ILLIQUID) {
            lockedValue += val;
        } else {
            unknownLiquidityValue += val;
            unknownHoldingCount++;
        }
    }

    const accessibleValue = liquidValueT0 + liquidValueT23 + liquidValueT47;

    const accessiblePercentage = grossPortfolioValue > 0 ? accessibleValue / grossPortfolioValue : 0.0;
    const lockedPercentage = grossPortfolioValue > 0 ? lockedValue / grossPortfolioValue : 0.0;
    const unknownPercentage = grossPortfolioValue > 0 ? unknownLiquidityValue / grossPortfolioValue : 0.0;

    const stressedAccessibleValue = Math.max(0.0, stressedAccessibleSevere);
    const stressedAccessiblePercentage = grossPortfolioValue > 0 ? stressedAccessibleValue / grossPortfolioValue : 0.0;

    return {
        grossPortfolioValue,
        liquidValueT0,
        liquidValueT23,
        liquidValueT47,
        lockedValue,
        unknownLiquidityValue,
        unknownHoldingCount,
        accessibleValue,
        accessiblePercentage,
        lockedPercentage,
        unknownPercentage,
        stressedAccessibleValue,
        stressedAccessiblePercentage,
        stressedAccessibleModerate: Math.max(0.0, stressedAccessibleModerate),
        holdingsBreakdown: breakdownList
    };
}

/**
 * Evaluates recurring monthly cash flow, essential survival burn, emergency runways,
 * and sensitivity spectrum.
 */
export function evaluateCashFlowAndRunway(cashFlowInput = {}, accessibleLiquidity = {}, policy = LIQUIDITY_POLICY_V1) {
    const income = typeof cashFlowInput.monthlyIncome === 'number' ? cashFlowInput.monthlyIncome : (typeof cashFlowInput.income === 'number' ? cashFlowInput.income : 0.0);
    const debtBurn = typeof cashFlowInput.debtBurn === 'number' ? cashFlowInput.debtBurn : (typeof cashFlowInput.emi === 'number' ? cashFlowInput.emi : 0.0);

    let burnSource = 'UNAVAILABLE';
    let essentialBurnIsEstimated = false;
    let actualEssentialBurn = null;
    let estimatedEssentialBurn = null;
    let discretionaryBurn = null;
    let totalBurn = 0.0;
    let survivalBurn = 0.0;

    if (income < 0 || debtBurn < 0) {
        throw new Error('[LIQUIDITY_ENGINE] Income and debt burn inputs must be non-negative.');
    }

    if (typeof cashFlowInput.essentialBurn === 'number' || typeof cashFlowInput.discretionaryBurn === 'number') {
        const ess = typeof cashFlowInput.essentialBurn === 'number' ? cashFlowInput.essentialBurn : 0.0;
        const disc = typeof cashFlowInput.discretionaryBurn === 'number' ? cashFlowInput.discretionaryBurn : 0.0;
        if (ess < 0 || disc < 0) {
            throw new Error('[LIQUIDITY_ENGINE] Essential and discretionary expenses must be non-negative.');
        }
        burnSource = 'ACTUAL_BREAKDOWN';
        essentialBurnIsEstimated = false;
        actualEssentialBurn = ess;
        discretionaryBurn = disc;
        survivalBurn = ess + debtBurn;
        totalBurn = survivalBurn + disc;
    } else if (typeof cashFlowInput.totalMonthlyBurn === 'number' || typeof cashFlowInput.totalBurn === 'number') {
        const tot = typeof cashFlowInput.totalMonthlyBurn === 'number' ? cashFlowInput.totalMonthlyBurn : cashFlowInput.totalBurn;
        if (tot < 0) {
            throw new Error('[LIQUIDITY_ENGINE] Total monthly burn must be non-negative.');
        }
        burnSource = 'ESTIMATED_FROM_TOTAL';
        essentialBurnIsEstimated = true;
        estimatedEssentialBurn = tot * policy.burnEstimation.DEFAULT_ESTIMATED_ESSENTIAL_BURN_RATIO;
        survivalBurn = estimatedEssentialBurn + debtBurn;
        totalBurn = tot + debtBurn;
        discretionaryBurn = Math.max(0.0, totalBurn - survivalBurn);
    }

    const netCashFlow = income - totalBurn;
    const incomeCoverageRatio = totalBurn > 0 ? income / totalBurn : null;
    const survivalCoverageRatio = survivalBurn > 0 ? income / survivalBurn : null;

    const vT0 = accessibleLiquidity.liquidValueT0 || 0.0;
    const vT23 = accessibleLiquidity.liquidValueT23 || 0.0;
    const vAccessible = accessibleLiquidity.accessibleValue || 0.0;
    const vStressed = accessibleLiquidity.stressedAccessibleValue || 0.0;

    let immediateMonths = null;
    let shortTermMonths = null;
    let totalMonths = null;
    let stressedMonths = null;
    let runwayStatus = 'NO_RECURRING_BURN';

    let runwayLowMonths = null;
    let runwayBaseMonths = null;
    let runwayHighMonths = null;

    if (survivalBurn > 0) {
        immediateMonths = vT0 / survivalBurn;
        shortTermMonths = (vT0 + vT23) / survivalBurn;
        totalMonths = vAccessible / survivalBurn;
        stressedMonths = vStressed / survivalBurn;

        if (totalMonths >= policy.runwayThresholdsMonths.STRONG) {
            runwayStatus = 'STRONG';
        } else if (totalMonths >= policy.runwayThresholdsMonths.ADEQUATE) {
            runwayStatus = 'ADEQUATE';
        } else if (totalMonths >= policy.runwayThresholdsMonths.CRITICAL) {
            runwayStatus = 'WATCH';
        } else {
            runwayStatus = 'CRITICAL';
        }

        if (essentialBurnIsEstimated) {
            const tot = typeof cashFlowInput.totalMonthlyBurn === 'number' ? cashFlowInput.totalMonthlyBurn : cashFlowInput.totalBurn;
            const burnLow = tot * policy.burnEstimation.HIGH_ESTIMATED_ESSENTIAL_BURN_RATIO + debtBurn; // 85% burn -> low runway
            const burnBase = tot * policy.burnEstimation.DEFAULT_ESTIMATED_ESSENTIAL_BURN_RATIO + debtBurn; // 70% burn -> base runway
            const burnHigh = tot * policy.burnEstimation.LOW_ESTIMATED_ESSENTIAL_BURN_RATIO + debtBurn; // 50% burn -> high runway

            runwayLowMonths = burnLow > 0 ? vAccessible / burnLow : null;
            runwayBaseMonths = burnBase > 0 ? vAccessible / burnBase : null;
            runwayHighMonths = burnHigh > 0 ? vAccessible / burnHigh : null;
        }
    }

    return {
        monthlyCashFlow: {
            burnSource,
            essentialBurnIsEstimated,
            income,
            actualEssentialBurn,
            estimatedEssentialBurn,
            debtBurn,
            survivalBurn,
            discretionaryBurn,
            totalBurn,
            netCashFlow,
            incomeCoverageRatio,
            survivalCoverageRatio
        },
        runway: {
            immediateMonths,
            shortTermMonths,
            totalMonths,
            stressedMonths,
            status: runwayStatus,
            sensitivity: {
                runwayLowMonths,
                runwayBaseMonths,
                runwayHighMonths
            }
        }
    };
}

/**
 * Evaluates the 4 deterministic stress scenarios: Base, Income Shock, Portfolio Haircut, Combined.
 */
export function evaluateLiquidityStressScenarios(cashFlow, liquidityBreakdown, policy = LIQUIDITY_POLICY_V1) {
    const income = cashFlow.income || 0.0;
    const totalBurn = cashFlow.totalBurn || 0.0;
    const survivalBurn = cashFlow.survivalBurn || 0.0;

    const vAccessibleBase = liquidityBreakdown.accessibleValue || 0.0;
    const vAccessibleSevere = liquidityBreakdown.stressedAccessibleValue || 0.0;

    // 1. BASE SCENARIO
    const baseDeficit = Math.max(0.0, totalBurn - income);
    const baseRunway = baseDeficit > 0 ? vAccessibleBase / baseDeficit : (survivalBurn > 0 ? vAccessibleBase / survivalBurn : null);

    // 2. INCOME SHOCK ONLY (50% income loss)
    const incomeShock = income * (1.0 - policy.incomeShocks.SEVERE_INCOME_SHOCK);
    const shockDeficit = Math.max(0.0, totalBurn - incomeShock);
    const shockRunway = shockDeficit > 0 ? vAccessibleBase / shockDeficit : (survivalBurn > 0 ? vAccessibleBase / survivalBurn : null);

    // 3. PORTFOLIO HAIRCUT ONLY
    const haircutDeficit = Math.max(0.0, totalBurn - income);
    const haircutRunway = haircutDeficit > 0 ? vAccessibleSevere / haircutDeficit : (survivalBurn > 0 ? vAccessibleSevere / survivalBurn : null);

    // 4. COMBINED SEVERE STRESS (100% income loss + severe haircut -> Survival Burn)
    const combinedDeficit = survivalBurn;
    const combinedRunway = combinedDeficit > 0 ? vAccessibleSevere / combinedDeficit : null;

    return {
        base: {
            stressedIncome: income,
            realizableLiquidity: vAccessibleBase,
            monthlyDeficit: baseDeficit,
            runwayMonths: baseRunway
        },
        incomeShockOnly: {
            stressedIncome: incomeShock,
            realizableLiquidity: vAccessibleBase,
            monthlyDeficit: shockDeficit,
            runwayMonths: shockRunway
        },
        portfolioHaircutOnly: {
            stressedIncome: income,
            realizableLiquidity: vAccessibleSevere,
            monthlyDeficit: haircutDeficit,
            runwayMonths: haircutRunway
        },
        combinedSevereStress: {
            stressedIncome: 0.0,
            realizableLiquidity: vAccessibleSevere,
            monthlyDeficit: combinedDeficit,
            runwayMonths: combinedRunway
        }
    };
}

/**
 * Analyzes lockup schedules, maturity chronology, and identifies liquidity bottleneck holdings.
 */
export function generateLockupScheduleAndBottlenecks(holdingsBreakdown, asOfDate, policy = LIQUIDITY_POLICY_V1) {
    const asOfISO = normalizeDateISO(asOfDate, 'asOfDate');
    const lockedItems = holdingsBreakdown.filter(h => h.liquidityTier === LIQUIDITY_HORIZONS.LOCKED_ILLIQUID);

    // Sort deterministically: lockEndDate ASC -> value DESC -> symbol ASC -> holdingId ASC
    lockedItems.sort((a, b) => {
        const da = a.lockEndDate || '9999-12-31';
        const db = b.lockEndDate || '9999-12-31';
        if (da !== db) return da.localeCompare(db);
        if (b.value !== a.value) return b.value - a.value;
        const sa = a.symbol || '';
        const sb = b.symbol || '';
        if (sa !== sb) return sa.localeCompare(sb);
        return (a.holdingId || '').localeCompare(b.holdingId || '');
    });

    let totalLockedValue = 0.0;
    let unlockWithin6M = 0.0;
    let unlockWithin1Y = 0.0;
    let unlockWithin3Y = 0.0;
    let unlockBeyond3YOrIndefinite = 0.0;

    const lockedHoldings = [];

    for (const item of lockedItems) {
        totalLockedValue += item.value;
        const days = item.daysToAccess !== null ? item.daysToAccess : 9999;
        
        if (days <= 180) {
            unlockWithin6M += item.value;
        } else if (days <= 365) {
            unlockWithin1Y += item.value;
        } else if (days <= 1095) {
            unlockWithin3Y += item.value;
        } else {
            unlockBeyond3YOrIndefinite += item.value;
        }

        lockedHoldings.push({
            holdingId: item.holdingId,
            symbol: item.symbol,
            value: item.value,
            lockEndDate: item.lockEndDate,
            daysRemaining: days
        });
    }

    // Identify top locked holdings and top locked asset classes
    const topLockedHoldings = [...lockedItems]
        .sort((a, b) => b.value - a.value)
        .slice(0, 5)
        .map(h => ({
            holdingId: h.holdingId,
            symbol: h.symbol,
            value: h.value
        }));

    const classLockedMap = {};
    for (const h of lockedItems) {
        const ac = h.assetClass || 'OTHER';
        classLockedMap[ac] = (classLockedMap[ac] || 0.0) + h.value;
    }
    const topLockedAssetClasses = Object.entries(classLockedMap)
        .map(([assetClass, value]) => ({ assetClass, value }))
        .sort((a, b) => b.value - a.value);

    return {
        lockupSchedule: {
            totalLockedValue,
            lockedHoldingCount: lockedItems.length,
            unlockWithin6M,
            unlockWithin1Y,
            unlockWithin3Y,
            unlockBeyond3YOrIndefinite,
            lockedHoldings
        },
        bottlenecks: {
            topLockedHoldings,
            topLockedAssetClasses
        }
    };
}

/**
 * Calculates the deterministic composite Liquidity Stress Score (0 - 100) and assigns
 * exact closed-interval tiers.
 */
export function calculateLiquidityStressScore(components, policy = LIQUIDITY_POLICY_V1) {
    const {
        immediateMonths,
        shortTermMonths,
        totalRunwayMonths,
        monthlyIncome,
        essentialSurvivalBurn,
        totalBurn,
        lockedPercentage,
        combinedRunwayMonths
    } = components;

    if (totalBurn <= 0 && essentialSurvivalBurn <= 0) {
        // Zero recurring burn -> maximum safety score
        return {
            stressScore: 100.0,
            stressTier: 'HEALTHY',
            scoreBreakdown: {
                immediateAdequacy: 20.0,
                shortTermAdequacy: 20.0,
                totalRunway: 25.0,
                cashFlowSolvency: 15.0,
                lockedPenalty: 10.0,
                stressResilience: 10.0
            }
        };
    }

    // 1. Immediate Adequacy (20 pts) - Target: 1.0 month T+0 reserves
    const immM = immediateMonths !== null ? immediateMonths : 0.0;
    const immediateAdequacy = Math.min(20.0, Math.max(0.0, 20.0 * (immM / 1.0)));

    // 2. Short-Term Adequacy (20 pts) - Target: 3.0 months T0+T23 reserves
    const stM = shortTermMonths !== null ? shortTermMonths : 0.0;
    const shortTermAdequacy = Math.min(20.0, Math.max(0.0, 20.0 * (stM / 3.0)));

    // 3. Total Runway (25 pts) - Target: 6.0 months accessible runway
    const totM = totalRunwayMonths !== null ? totalRunwayMonths : 0.0;
    const totalRunway = Math.min(25.0, Math.max(0.0, 25.0 * (totM / 6.0)));

    // 4. Cash-Flow Solvency (15 pts) - Target: Income >= 1.25x Total Burn
    let cashFlowSolvency = 0.0;
    if (totalBurn > 0) {
        if (monthlyIncome >= 1.25 * totalBurn) {
            cashFlowSolvency = 15.0;
        } else if (monthlyIncome > essentialSurvivalBurn) {
            cashFlowSolvency = Math.min(15.0, Math.max(0.0, 15.0 * ((monthlyIncome - essentialSurvivalBurn) / (0.25 * totalBurn))));
        }
    }

    // 5. Locked Asset Penalty (10 pts) - Deduction if locked > 20%
    const lPct = lockedPercentage !== null ? lockedPercentage : 0.0;
    const lockedPenalty = Math.max(0.0, Math.min(10.0, 10.0 * (1.0 - (Math.max(0.0, lPct - 0.20) / 0.60))));

    // 6. Stress Resilience (10 pts) - Target: Combined stressed runway >= 3.0 months
    const combM = combinedRunwayMonths !== null ? combinedRunwayMonths : 0.0;
    const stressResilience = Math.min(10.0, Math.max(0.0, 10.0 * (combM / 3.0)));

    let rawScore = immediateAdequacy + shortTermAdequacy + totalRunway + cashFlowSolvency + lockedPenalty + stressResilience;
    const stressScore = Math.min(100.0, Math.max(0.0, Math.round(rawScore * 100) / 100));

    // Exact Closed-Interval Tier Assignment
    let stressTier = 'CRITICAL';
    if (stressScore >= policy.scoreTiers.HEALTHY_MIN) {
        stressTier = 'HEALTHY';
    } else if (stressScore >= policy.scoreTiers.WATCH_MIN) {
        stressTier = 'WATCH';
    } else if (stressScore >= policy.scoreTiers.STRESSED_MIN) {
        stressTier = 'STRESSED';
    } else {
        stressTier = 'CRITICAL';
    }

    return {
        stressScore,
        stressTier,
        scoreBreakdown: {
            immediateAdequacy: Math.round(immediateAdequacy * 100) / 100,
            shortTermAdequacy: Math.round(shortTermAdequacy * 100) / 100,
            totalRunway: Math.round(totalRunway * 100) / 100,
            cashFlowSolvency: Math.round(cashFlowSolvency * 100) / 100,
            lockedPenalty: Math.round(lockedPenalty * 100) / 100,
            stressResilience: Math.round(stressResilience * 100) / 100
        }
    };
}

/**
 * Master API: Evaluates comprehensive portfolio liquidity, cash-flow stress, and runway diagnostics.
 */
export function evaluatePortfolioLiquidityAndStress(portfolioData = {}, asOfDate, options = {}) {
    const asOfISO = normalizeDateISO(asOfDate, 'asOfDate');
    const policy = options.policy || LIQUIDITY_POLICY_V1;
    const portfolioId = portfolioData.portfolioId || portfolioData.id || null;
    const holdings = Array.isArray(portfolioData.holdings) ? portfolioData.holdings : [];
    const monthlyCashFlowInput = portfolioData.monthlyCashFlow || portfolioData.cashFlow || {};

    const warnings = [];

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
                evaluationTimestamp: asOfISO
            },
            grossPortfolioValue: 0.0,
            liquidValueT0: 0.0,
            liquidValueT23: 0.0,
            liquidValueT47: 0.0,
            lockedValue: 0.0,
            unknownLiquidityValue: 0.0,
            accessibleValue: 0.0,
            accessiblePercentage: 0.0,
            lockedPercentage: 0.0,
            unknownPercentage: 0.0,
            stressedAccessibleValue: 0.0,
            stressedAccessiblePercentage: 0.0,
            monthlyCashFlow: {
                burnSource: 'UNAVAILABLE',
                essentialBurnIsEstimated: false,
                income: 0.0,
                actualEssentialBurn: null,
                estimatedEssentialBurn: null,
                debtBurn: 0.0,
                survivalBurn: 0.0,
                discretionaryBurn: null,
                totalBurn: 0.0,
                netCashFlow: 0.0,
                incomeCoverageRatio: null,
                survivalCoverageRatio: null
            },
            runway: {
                immediateMonths: null,
                shortTermMonths: null,
                totalMonths: null,
                stressedMonths: null,
                status: 'NO_RECURRING_BURN',
                sensitivity: {
                    runwayLowMonths: null,
                    runwayBaseMonths: null,
                    runwayHighMonths: null
                }
            },
            stressScenarios: {
                base: { stressedIncome: 0.0, realizableLiquidity: 0.0, monthlyDeficit: 0.0, runwayMonths: null },
                incomeShockOnly: { stressedIncome: 0.0, realizableLiquidity: 0.0, monthlyDeficit: 0.0, runwayMonths: null },
                portfolioHaircutOnly: { stressedIncome: 0.0, realizableLiquidity: 0.0, monthlyDeficit: 0.0, runwayMonths: null },
                combinedSevereStress: { stressedIncome: 0.0, realizableLiquidity: 0.0, monthlyDeficit: 0.0, runwayMonths: null }
            },
            holdingsLiquidityBreakdown: [],
            lockupSchedule: {
                totalLockedValue: 0.0,
                lockedHoldingCount: 0,
                unlockWithin6M: 0.0,
                unlockWithin1Y: 0.0,
                unlockWithin3Y: 0.0,
                unlockBeyond3YOrIndefinite: 0.0,
                lockedHoldings: []
            },
            bottlenecks: {
                topLockedHoldings: [],
                topLockedAssetClasses: []
            },
            warnings: ['EMPTY_PORTFOLIO'],
            stressScore: 0.0,
            stressTier: 'CRITICAL',
            scoreBreakdown: {
                immediateAdequacy: 0.0,
                shortTermAdequacy: 0.0,
                totalRunway: 0.0,
                cashFlowSolvency: 0.0,
                lockedPenalty: 0.0,
                stressResilience: 0.0
            }
        };
    }

    // 2. LIQUIDITY BREAKDOWN
    const liquidityBreakdown = calculateLiquidityBreakdown(holdings, asOfISO, policy);

    // 3. CASH-FLOW & RUNWAY
    const { monthlyCashFlow, runway } = evaluateCashFlowAndRunway(monthlyCashFlowInput, liquidityBreakdown, policy);

    if (monthlyCashFlow.essentialBurnIsEstimated) {
        warnings.push('ESTIMATED_ESSENTIAL_BURN_RATIO_APPLIED');
    }

    if (monthlyCashFlow.netCashFlow < 0) {
        warnings.push('NEGATIVE_MONTHLY_CASH_FLOW');
    }

    // 4. STRESS SCENARIOS
    const stressScenarios = evaluateLiquidityStressScenarios(monthlyCashFlow, liquidityBreakdown, policy);

    // 5. LOCKUPS & BOTTLENECK DIAGNOSTICS
    const { lockupSchedule, bottlenecks } = generateLockupScheduleAndBottlenecks(liquidityBreakdown.holdingsBreakdown, asOfISO, policy);

    if (liquidityBreakdown.lockedPercentage >= policy.lockedAssetThresholds.CRITICAL_LOCKED_EXPOSURE) {
        warnings.push('CRITICAL_LOCKED_ASSET_EXPOSURE');
    } else if (liquidityBreakdown.lockedPercentage >= policy.lockedAssetThresholds.HIGH_LOCKED_EXPOSURE) {
        warnings.push('HIGH_LOCKED_ASSET_EXPOSURE');
    }

    if (liquidityBreakdown.unknownPercentage >= policy.lockedAssetThresholds.HIGH_UNKNOWN_EXPOSURE) {
        warnings.push('HIGH_UNKNOWN_LIQUIDITY_EXPOSURE');
    }

    if (monthlyCashFlow.survivalBurn > 0 && liquidityBreakdown.liquidValueT0 < monthlyCashFlow.survivalBurn) {
        warnings.push('INSUFFICIENT_IMMEDIATE_LIQUIDITY');
    }

    if (runway.totalMonths !== null) {
        if (runway.totalMonths < policy.runwayThresholdsMonths.CRITICAL) {
            warnings.push('CRITICAL_EMERGENCY_RUNWAY');
        } else if (runway.totalMonths < policy.runwayThresholdsMonths.ADEQUATE) {
            warnings.push('INSUFFICIENT_EMERGENCY_RUNWAY');
        }
    }

    if (stressScenarios.combinedSevereStress.runwayMonths !== null && stressScenarios.combinedSevereStress.runwayMonths < 1.0) {
        warnings.push('COMBINED_STRESS_FAILURE');
    }

    // 6. LIQUIDITY STRESS SCORE & TIERS
    const scoreResult = calculateLiquidityStressScore({
        immediateMonths: runway.immediateMonths,
        shortTermMonths: runway.shortTermMonths,
        totalRunwayMonths: runway.totalMonths,
        monthlyIncome: monthlyCashFlow.income,
        essentialSurvivalBurn: monthlyCashFlow.survivalBurn,
        totalBurn: monthlyCashFlow.totalBurn,
        lockedPercentage: liquidityBreakdown.lockedPercentage,
        combinedRunwayMonths: stressScenarios.combinedSevereStress.runwayMonths
    }, policy);

    // 7. CONFIDENCE PROPAGATION
    let confidenceLevel = 'HIGH';
    if (monthlyCashFlow.essentialBurnIsEstimated) {
        confidenceLevel = 'MODERATE'; // Capped at MODERATE when burn is estimated
    }
    if (liquidityBreakdown.unknownPercentage > 0.20 || monthlyCashFlow.burnSource === 'UNAVAILABLE') {
        confidenceLevel = 'LOW';
    }

    const status = scoreResult.stressTier;

    return {
        portfolioId,
        asOfDate: asOfISO,
        policyVersion: policy.policyVersion,
        status,
        dataQuality: {
            confidenceLevel,
            coverageRatio: Math.round((1.0 - liquidityBreakdown.unknownPercentage) * 1000) / 1000,
            hasCashFlowData: monthlyCashFlow.burnSource !== 'UNAVAILABLE',
            hasValuationData: liquidityBreakdown.grossPortfolioValue > 0,
            unknownHoldingCount: liquidityBreakdown.unknownHoldingCount,
            evaluationTimestamp: asOfISO
        },
        grossPortfolioValue: liquidityBreakdown.grossPortfolioValue,
        liquidValueT0: liquidityBreakdown.liquidValueT0,
        liquidValueT23: liquidityBreakdown.liquidValueT23,
        liquidValueT47: liquidityBreakdown.liquidValueT47,
        lockedValue: liquidityBreakdown.lockedValue,
        unknownLiquidityValue: liquidityBreakdown.unknownLiquidityValue,
        accessibleValue: liquidityBreakdown.accessibleValue,
        accessiblePercentage: liquidityBreakdown.accessiblePercentage,
        lockedPercentage: liquidityBreakdown.lockedPercentage,
        unknownPercentage: liquidityBreakdown.unknownPercentage,
        stressedAccessibleValue: liquidityBreakdown.stressedAccessibleValue,
        stressedAccessiblePercentage: liquidityBreakdown.stressedAccessiblePercentage,
        monthlyCashFlow,
        runway,
        stressScenarios,
        holdingsLiquidityBreakdown: liquidityBreakdown.holdingsBreakdown,
        lockupSchedule,
        bottlenecks,
        warnings,
        stressScore: scoreResult.stressScore,
        stressTier: scoreResult.stressTier,
        scoreBreakdown: scoreResult.scoreBreakdown
    };
}
