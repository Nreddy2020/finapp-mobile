/**
 * Target-Date Glidepath & Goal Asset Allocation Service (Stage C.8.3)
 * Master Architectural Standard: C8_V1
 * 
 * Translates goal time-horizon to maturity into recommended target-date asset allocations,
 * evaluates actual vs recommended glidepath drift, and detects sequence-of-returns vulnerabilities.
 * 
 * STRICT INVARIANTS:
 * 1. Authority Boundary (C8-R5): Produces goal-specific planning recommendations ONLY.
 *    Does NOT modify or overwrite C.6 portfolio target allocation policies or rebalancing orders.
 * 2. Calculate Once: Pure analytical functions, zero recalculation of upstream metrics.
 * 3. Deterministic: Mandatory caller asOfDate; zero wall-clock dependencies.
 * 4. Read-Only: Zero store mutations.
 */

import { validateAndNormalizeGoal } from './goalPlanningEngine.js';
import { CANONICAL_ASSET_CLASSES } from './targetAllocationService.js';

export const GLIDEPATH_POLICY_VERSION = 'C8_3_V1';

export const GLIDEPATH_TIERS = Object.freeze({
    AGGRESSIVE_GROWTH: 'AGGRESSIVE_GROWTH',                     // t > 10 years
    BALANCED_ACCUMULATION: 'BALANCED_ACCUMULATION',             // 5 < t <= 10 years
    CAPITAL_PRESERVATION_TRANSITION: 'CAPITAL_PRESERVATION_TRANSITION', // 3 < t <= 5 years
    DEFENSE_AND_DERISKING: 'DEFENSE_AND_DERISKING',             // 1 < t <= 3 years
    CASH_AND_ULTRA_SHORT: 'CASH_AND_ULTRA_SHORT'               // t <= 1 year
});

/**
 * Standard Piecewise-Linear Target-Date Glidepath Allocation Schedule
 * Total across asset classes always equals exact 1.00 (100.0%).
 */
export const GLIDEPATH_SCHEDULE = Object.freeze({
    [GLIDEPATH_TIERS.AGGRESSIVE_GROWTH]: Object.freeze({
        tier: GLIDEPATH_TIERS.AGGRESSIVE_GROWTH,
        minHorizonYears: 10.0,
        targetEquity: 0.75, // 75% Equity (Stock, MF, ETF)
        targetDebt: 0.20,   // 20% Fixed Income / Bonds
        targetGold: 0.05,   // 5% Gold / Precious Metals
        targetCash: 0.00    // 0% Cash / Liquid
    }),
    [GLIDEPATH_TIERS.BALANCED_ACCUMULATION]: Object.freeze({
        tier: GLIDEPATH_TIERS.BALANCED_ACCUMULATION,
        minHorizonYears: 5.0,
        targetEquity: 0.60, // 60% Equity
        targetDebt: 0.30,   // 30% Debt
        targetGold: 0.10,   // 10% Gold
        targetCash: 0.00    // 0% Cash
    }),
    [GLIDEPATH_TIERS.CAPITAL_PRESERVATION_TRANSITION]: Object.freeze({
        tier: GLIDEPATH_TIERS.CAPITAL_PRESERVATION_TRANSITION,
        minHorizonYears: 3.0,
        targetEquity: 0.35, // 35% Equity
        targetDebt: 0.50,   // 50% Debt
        targetGold: 0.10,   // 10% Gold
        targetCash: 0.05    // 5% Cash
    }),
    [GLIDEPATH_TIERS.DEFENSE_AND_DERISKING]: Object.freeze({
        tier: GLIDEPATH_TIERS.DEFENSE_AND_DERISKING,
        minHorizonYears: 1.0,
        targetEquity: 0.15, // 15% Equity
        targetDebt: 0.65,   // 65% Debt
        targetGold: 0.05,   // 5% Gold
        targetCash: 0.15    // 15% Cash
    }),
    [GLIDEPATH_TIERS.CASH_AND_ULTRA_SHORT]: Object.freeze({
        tier: GLIDEPATH_TIERS.CASH_AND_ULTRA_SHORT,
        minHorizonYears: 0.0,
        targetEquity: 0.00, // 0% Equity
        targetDebt: 0.40,   // 40% Liquid Fixed Income
        targetGold: 0.00,   // 0% Gold
        targetCash: 0.60    // 60% Cash / Ultra-Short Liquid
    })
});

export const SEQUENCE_OF_RETURNS_THRESHOLDS = Object.freeze({
    MAX_HORIZON_YEARS: 3.0,        // Near-term vulnerability window (<= 3 years)
    EXCESS_EQUITY_TOLERANCE: 0.15  // Trigger if actual equity > recommended + 15%
});

/**
 * Resolves the recommended glidepath tier and target asset allocation for a given horizon in years.
 * 
 * @param {number} horizonYears - Time to goal maturity (in years)
 * @returns {Object} Recommended glidepath schedule tier
 */
export function resolveRecommendedGlidepath(horizonYears) {
    const t = Math.max(0.0, Number(horizonYears || 0));

    if (t > 10.0) {
        return GLIDEPATH_SCHEDULE[GLIDEPATH_TIERS.AGGRESSIVE_GROWTH];
    } else if (t > 5.0) {
        return GLIDEPATH_SCHEDULE[GLIDEPATH_TIERS.BALANCED_ACCUMULATION];
    } else if (t > 3.0) {
        return GLIDEPATH_SCHEDULE[GLIDEPATH_TIERS.CAPITAL_PRESERVATION_TRANSITION];
    } else if (t > 1.0) {
        return GLIDEPATH_SCHEDULE[GLIDEPATH_TIERS.DEFENSE_AND_DERISKING];
    } else {
        return GLIDEPATH_SCHEDULE[GLIDEPATH_TIERS.CASH_AND_ULTRA_SHORT];
    }
}

/**
 * Analyzes the actual asset class composition of holdings allocated to a goal.
 * 
 * @param {Object} goal - Normalized goal definition
 * @param {Array<Object>} holdings - Upstream portfolio holdings (from C.4)
 * @returns {Object} Actual allocation composition breakdown
 */
export function analyzeGoalActualAllocation(goal, holdings = []) {
    const allocatedHoldings = Array.isArray(goal.allocatedHoldingIds) && Array.isArray(holdings)
        ? holdings.filter(h => goal.allocatedHoldingIds.includes(h.holdingId || h.id))
        : [];

    let totalVal = Math.max(0.0, Number(goal.allocatedCashAmount || 0));
    let equityVal = 0.0;
    let debtVal = 0.0;
    let goldVal = 0.0;
    let cryptoVal = 0.0;
    let realEstateVal = 0.0;
    let cashVal = Math.max(0.0, Number(goal.allocatedCashAmount || 0));

    for (const h of allocatedHoldings) {
        const val = Math.max(0.0, Number(h.currentValue || h.totalValue || (h.quantity * (h.currentPrice || 0)) || 0));
        if (val > 0) {
            totalVal += val;
            const rawType = (h.assetType || h.type || 'STOCK').toUpperCase();
            const canonicalClass = CANONICAL_ASSET_CLASSES.includes(rawType) ? rawType : 'STOCK';

            if (['STOCK', 'MUTUAL_FUND', 'ETF'].includes(canonicalClass)) {
                equityVal += val;
            } else if (canonicalClass === 'BOND') {
                debtVal += val;
            } else if (canonicalClass === 'GOLD') {
                goldVal += val;
            } else if (canonicalClass === 'CRYPTO') {
                cryptoVal += val;
            } else if (canonicalClass === 'REAL_ESTATE') {
                realEstateVal += val;
            } else {
                cashVal += val;
            }
        }
    }

    const actualEquityShare = totalVal > 0 ? equityVal / totalVal : 0.0;
    const actualDebtShare = totalVal > 0 ? debtVal / totalVal : 0.0;
    const actualGoldShare = totalVal > 0 ? goldVal / totalVal : 0.0;
    const actualCryptoShare = totalVal > 0 ? cryptoVal / totalVal : 0.0;
    const actualRealEstateShare = totalVal > 0 ? realEstateVal / totalVal : 0.0;
    const actualCashShare = totalVal > 0 ? cashVal / totalVal : 0.0;

    return {
        totalAllocatedValue: Math.round(totalVal * 100) / 100,
        actualEquityShare: Math.round(actualEquityShare * 1000) / 1000,
        actualDebtShare: Math.round(actualDebtShare * 1000) / 1000,
        actualGoldShare: Math.round(actualGoldShare * 1000) / 1000,
        actualCryptoShare: Math.round(actualCryptoShare * 1000) / 1000,
        actualRealEstateShare: Math.round(actualRealEstateShare * 1000) / 1000,
        actualCashShare: Math.round(actualCashShare * 1000) / 1000
    };
}

/**
 * Evaluates target-date glidepath recommendations and sequence-of-returns risk for a single goal.
 * 
 * @param {Object} rawGoal - Goal definition
 * @param {Array<Object>} holdings - Upstream holdings
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object} Goal Glidepath Diagnostic DTO
 */
export function evaluateGoalGlidepath(rawGoal, holdings = [], asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }
    const goal = validateAndNormalizeGoal(rawGoal, asOfDate);
    const recommended = resolveRecommendedGlidepath(goal.horizonYears);
    const actual = analyzeGoalActualAllocation(goal, holdings);

    // Compute drift deltas
    const equityDrift = Math.round((actual.actualEquityShare - recommended.targetEquity) * 1000) / 1000;
    const debtDrift = Math.round((actual.actualDebtShare - recommended.targetDebt) * 1000) / 1000;
    const cashDrift = Math.round((actual.actualCashShare - recommended.targetCash) * 1000) / 1000;

    // Sequence of Returns Risk Detection
    // Triggers when goal is near maturity (<= 3 yrs) AND actual equity exceeds recommended by > 15%
    const isNearMaturity = goal.horizonYears <= SEQUENCE_OF_RETURNS_THRESHOLDS.MAX_HORIZON_YEARS;
    const isExcessEquity = equityDrift > SEQUENCE_OF_RETURNS_THRESHOLDS.EXCESS_EQUITY_TOLERANCE;
    const hasSequenceOfReturnsRisk = !goal.isPastDue && actual.totalAllocatedValue > 0 && isNearMaturity && isExcessEquity;

    let alignmentStatus;
    if (actual.totalAllocatedValue === 0) {
        alignmentStatus = 'UNALLOCATED';
    } else if (hasSequenceOfReturnsRisk) {
        alignmentStatus = 'SEQUENCE_RISK_ELEVATED';
    } else if (Math.abs(equityDrift) <= 0.10) {
        alignmentStatus = 'ALIGNED';
    } else if (equityDrift > 0.10) {
        alignmentStatus = 'EQUITY_OVERWEIGHT';
    } else {
        alignmentStatus = 'DEFENSIVE_UNDERWEIGHT';
    }

    return {
        goalId: goal.goalId,
        name: goal.name,
        category: goal.category,
        priorityTier: goal.priorityTier,
        targetDate: goal.targetDate,
        horizonYears: goal.horizonYears,
        isPastDue: goal.isPastDue,
        glidepathTier: recommended.tier,
        recommendedAllocation: {
            targetEquity: recommended.targetEquity,
            targetDebt: recommended.targetDebt,
            targetGold: recommended.targetGold,
            targetCash: recommended.targetCash
        },
        actualAllocation: {
            totalAllocatedValue: actual.totalAllocatedValue,
            actualEquityShare: actual.actualEquityShare,
            actualDebtShare: actual.actualDebtShare,
            actualGoldShare: actual.actualGoldShare,
            actualCryptoShare: actual.actualCryptoShare,
            actualRealEstateShare: actual.actualRealEstateShare,
            actualCashShare: actual.actualCashShare
        },
        allocationDrift: {
            equityDrift,
            debtDrift,
            cashDrift
        },
        hasSequenceOfReturnsRisk,
        alignmentStatus,
        recommendationSummary: hasSequenceOfReturnsRisk
            ? `Goal maturity is within ${goal.horizonYears.toFixed(1)} years with excessive equity exposure (${(actual.actualEquityShare * 100).toFixed(1)}% vs recommended ${(recommended.targetEquity * 100).toFixed(1)}%). Rebalance into debt/cash to protect accumulated corpus against market downturns.`
            : `Asset allocation is consistent with the ${recommended.tier} glidepath profile.`,
        meta: {
            policyVersion: GLIDEPATH_POLICY_VERSION,
            authorityBoundary: 'PLANNING_RECOMMENDATION_ONLY_DOES_NOT_MUTATE_C6_POLICY'
        }
    };
}

/**
 * Evaluates glidepaths across all user goals and compiles a consolidated portfolio glidepath diagnostic.
 * 
 * @param {Array<Object>} rawGoals - Array of user goals
 * @param {Array<Object>} holdings - Portfolio holdings
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object} Multi-Goal Glidepath Consolidated Diagnostic DTO
 */
export function aggregateMultiGoalGlidepaths(rawGoals = [], holdings = [], asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }

    if (!Array.isArray(rawGoals) || rawGoals.length === 0) {
        return {
            policyVersion: GLIDEPATH_POLICY_VERSION,
            asOfDate: new Date(asOfDate).toISOString(),
            status: 'NO_GOALS',
            totalGoalsCount: 0,
            goalsWithSequenceRiskCount: 0,
            goalGlidepaths: []
        };
    }

    const goalGlidepaths = rawGoals.map(g => evaluateGoalGlidepath(g, holdings, asOfDate));
    const goalsWithSequenceRisk = goalGlidepaths.filter(g => g.hasSequenceOfReturnsRisk);

    return {
        policyVersion: GLIDEPATH_POLICY_VERSION,
        asOfDate: new Date(asOfDate).toISOString(),
        status: 'EVALUATED',
        totalGoalsCount: goalGlidepaths.length,
        goalsWithSequenceRiskCount: goalsWithSequenceRisk.length,
        hasPortfolioSequenceRisk: goalsWithSequenceRisk.length > 0,
        goalGlidepaths,
        meta: {
            policyVersion: GLIDEPATH_POLICY_VERSION,
            authorityBoundary: 'PLANNING_RECOMMENDATION_ONLY_DOES_NOT_MUTATE_C6_POLICY'
        }
    };
}
