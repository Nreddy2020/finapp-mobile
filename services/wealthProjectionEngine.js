/**
 * Wealth Projection & Goal Solvency Engine (Stage C.8.2)
 * Master Architectural Standard: C8_V1
 * 
 * Provides deterministic forward wealth projection, goal solvency diagnostics,
 * annuity-due SIP gap solving (beginning-of-period compounding), and multi-goal
 * portfolio solvency aggregation.
 * 
 * STRICT INVARIANTS:
 * 1. Calculate Once: Pure analytical functions, zero recalculation of upstream metrics.
 * 2. Deterministic: Mandatory caller asOfDate; zero wall-clock dependencies.
 * 3. Planning Assumptions: Explicitly non-guaranteed policy planning rates.
 * 4. Contribution Timing: Explicitly frozen as BEGINNING_OF_PERIOD (C8-F1).
 * 5. Read-Only: Zero store mutations.
 */

import {
    validateAndNormalizeGoal,
    GOAL_STATUS,
    GOAL_PLANNING_POLICY_VERSION
} from './goalPlanningEngine.js';

import { CANONICAL_ASSET_CLASSES } from './targetAllocationService.js';

export const WEALTH_PROJECTION_POLICY_VERSION = 'C8_WEALTH_PROJECTION_V1';

export const CONTRIBUTION_TIMING = Object.freeze({
    BEGINNING_OF_PERIOD: 'BEGINNING_OF_PERIOD',
    END_OF_PERIOD: 'END_OF_PERIOD'
});

/**
 * Immutable Policy Planning Nominal Return Assumptions (p.a.)
 * Explicitly non-guaranteed planning parameters.
 */
export const ASSET_CLASS_PLANNING_RETURNS = Object.freeze({
    STOCK: 0.12,          // 12.0% p.a.
    MUTUAL_FUND: 0.11,    // 11.0% p.a.
    ETF: 0.11,            // 11.0% p.a.
    GOLD: 0.08,           // 8.0% p.a.
    BOND: 0.07,           // 7.0% p.a.
    REAL_ESTATE: 0.09,    // 9.0% p.a.
    CRYPTO: 0.10,         // 10.0% p.a.
    OTHER: 0.05,          // 5.0% p.a.
    CASH: 0.05            // 5.0% p.a. (Liquid / Savings / Cash)
});

/**
 * Solvency Health Thresholds
 */
export const SOLVENCY_THRESHOLDS = Object.freeze({
    OVERFUNDED_RATIO: 1.20,
    FULLY_FUNDED_RATIO: 1.00,
    ON_TRACK_RATIO: 0.85,
    AT_RISK_RATIO: 0.60
});

/**
 * Resolves the deterministic expected annual return for a given goal based on
 * its allocated holdings and dedicated cash balance.
 * 
 * @param {Object} goal - Normalized goal object
 * @param {Array<Object>} holdings - Upstream portfolio holdings (from C.4)
 * @returns {Object} Effective return breakdown
 */
export function resolveGoalExpectedReturn(goal, holdings = []) {
    const allocatedHoldings = Array.isArray(goal.allocatedHoldingIds) && Array.isArray(holdings)
        ? holdings.filter(h => goal.allocatedHoldingIds.includes(h.holdingId || h.id))
        : [];

    let totalAllocatedValue = Math.max(0.0, Number(goal.allocatedCashAmount || 0));
    let weightedReturnSum = (Math.max(0.0, Number(goal.allocatedCashAmount || 0))) * ASSET_CLASS_PLANNING_RETURNS.CASH;

    for (const h of allocatedHoldings) {
        const val = Math.max(0.0, Number(h.currentValue || h.totalValue || (h.quantity * (h.currentPrice || 0)) || 0));
        if (val > 0) {
            const rawType = (h.assetType || h.type || 'STOCK').toUpperCase();
            const canonicalClass = CANONICAL_ASSET_CLASSES.includes(rawType) ? rawType : 'STOCK';
            const expReturn = ASSET_CLASS_PLANNING_RETURNS[canonicalClass] !== undefined
                ? ASSET_CLASS_PLANNING_RETURNS[canonicalClass]
                : ASSET_CLASS_PLANNING_RETURNS.OTHER;

            weightedReturnSum += val * expReturn;
            totalAllocatedValue += val;
        }
    }

    // Default to balanced planning return (10.0%) if no holdings/cash currently allocated
    const effectiveReturnAnnual = totalAllocatedValue > 0
        ? Math.max(0.0, Math.min(0.25, weightedReturnSum / totalAllocatedValue))
        : 0.10;

    const monthlyReturn = effectiveReturnAnnual > 0
        ? Math.pow(1.0 + effectiveReturnAnnual, 1.0 / 12.0) - 1.0
        : 0.0;

    return {
        allocatedPortfolioValue: Math.round(totalAllocatedValue * 100) / 100,
        effectiveReturnAnnual: Math.round(effectiveReturnAnnual * 10000) / 10000,
        monthlyReturn: Math.round(monthlyReturn * 1000000) / 1000000,
        policyVersion: WEALTH_PROJECTION_POLICY_VERSION
    };
}

/**
 * Projects future terminal wealth, funding gap, and required monthly SIP for a single goal.
 * 
 * @param {Object} rawGoal - Input goal definition
 * @param {Array<Object>} holdings - Portfolio holdings
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object} Comprehensive Goal Projection DTO
 */
export function projectGoalSolvency(rawGoal, holdings = [], asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }
    const goal = validateAndNormalizeGoal(rawGoal, asOfDate);
    const returnProfile = resolveGoalExpectedReturn(goal, holdings);

    const P = returnProfile.allocatedPortfolioValue;
    const t = goal.horizonYears;
    const N = Math.round(t * 12);
    const r_eff = returnProfile.effectiveReturnAnnual;
    const r_m = returnProfile.monthlyReturn;
    const C_future = goal.targetCorpusFuture;
    const monthlySIP = Math.max(0.0, Number(goal.monthlyContribution || 0));

    // 1. Future value of current allocated corpus: FV_current = P * (1 + r_eff)^t
    const fvCurrent = goal.isPastDue
        ? P
        : P * Math.pow(1.0 + r_eff, t);

    // 2. Future value of recurring monthly SIP (Beginning-of-Period Annuity Due) (C8-F1)
    let fvSIP = 0.0;
    let sipAmortizationFactor = 0.0;

    if (!goal.isPastDue && N > 0 && monthlySIP >= 0) {
        if (r_m > 0) {
            // Annuity Due: SIP * [((1 + r_m)^N - 1) / r_m] * (1 + r_m)
            const geometricSeries = (Math.pow(1.0 + r_m, N) - 1.0) / r_m;
            sipAmortizationFactor = geometricSeries * (1.0 + r_m);
            fvSIP = monthlySIP * sipAmortizationFactor;
        } else {
            // Zero-Rate boundary: SIP * N
            sipAmortizationFactor = N;
            fvSIP = monthlySIP * N;
        }
    }

    // 3. Projected Terminal Wealth: V_terminal = FV_current + FV_SIP
    const projectedTerminalWealth = fvCurrent + fvSIP;

    // 4. Funding Gap & Surplus
    const fundingGap = Math.max(0.0, C_future - projectedTerminalWealth);
    const fundingSurplus = Math.max(0.0, projectedTerminalWealth - C_future);
    const fundedRatio = C_future > 0
        ? projectedTerminalWealth / C_future
        : 1.0;

    // 5. Required Monthly Savings Contribution (SIP_required)
    let requiredMonthlyContribution = 0.0;
    if (goal.isPastDue || N === 0) {
        requiredMonthlyContribution = Math.max(0.0, C_future - fvCurrent);
    } else if (sipAmortizationFactor > 0) {
        const netShortfallToAmortize = Math.max(0.0, C_future - fvCurrent);
        requiredMonthlyContribution = netShortfallToAmortize / sipAmortizationFactor;
    }
    const sipShortfallDelta = Math.max(0.0, requiredMonthlyContribution - monthlySIP);

    // 6. Authoritative Goal Funding Status Resolution (C8-R11 & C8-F3)
    const effectiveFundedRatio = fundingGap <= 1.0 ? Math.max(1.0, fundedRatio) : fundedRatio;
    let status;
    if (goal.isPastDue) {
        status = P >= goal.targetCorpusNominal ? GOAL_STATUS.FULLY_FUNDED : GOAL_STATUS.PAST_DUE;
    } else if (goal.allocatedHoldingIds.length === 0 && goal.allocatedCashAmount === 0 && monthlySIP === 0) {
        status = GOAL_STATUS.NOT_STARTED;
    } else if (effectiveFundedRatio >= SOLVENCY_THRESHOLDS.OVERFUNDED_RATIO) {
        status = GOAL_STATUS.OVERFUNDED;
    } else if (effectiveFundedRatio >= SOLVENCY_THRESHOLDS.FULLY_FUNDED_RATIO) {
        status = GOAL_STATUS.FULLY_FUNDED;
    } else if (effectiveFundedRatio >= SOLVENCY_THRESHOLDS.ON_TRACK_RATIO) {
        status = GOAL_STATUS.ON_TRACK;
    } else if (effectiveFundedRatio >= SOLVENCY_THRESHOLDS.AT_RISK_RATIO) {
        status = GOAL_STATUS.AT_RISK;
    } else {
        status = GOAL_STATUS.UNDERFUNDED;
    }

    return {
        goalId: goal.goalId,
        name: goal.name,
        category: goal.category,
        priorityTier: goal.priorityTier,
        priorityRank: goal.priorityRank,
        targetDate: goal.targetDate,
        horizonYears: Math.round(t * 100) / 100,
        horizonMonths: N,
        isPastDue: goal.isPastDue,
        targetCorpusNominal: goal.targetCorpusNominal,
        inflationRate: goal.inflationRate,
        targetCorpusFuture: Math.round(C_future * 100) / 100,
        currentAllocatedCorpus: Math.round(P * 100) / 100,
        monthlyContribution: Math.round(monthlySIP * 100) / 100,
        projectedReturnAnnual: returnProfile.effectiveReturnAnnual,
        projectedFVCurrentCorpus: Math.round(fvCurrent * 100) / 100,
        projectedFVSIP: Math.round(fvSIP * 100) / 100,
        projectedTerminalWealth: Math.round(projectedTerminalWealth * 100) / 100,
        fundingGap: Math.round(fundingGap * 100) / 100,
        fundingSurplus: Math.round(fundingSurplus * 100) / 100,
        fundedRatio: Math.round(fundedRatio * 1000) / 1000,
        requiredMonthlyContribution: Math.round(requiredMonthlyContribution * 100) / 100,
        sipShortfallDelta: Math.round(sipShortfallDelta * 100) / 100,
        status,
        meta: {
            policyVersion: WEALTH_PROJECTION_POLICY_VERSION,
            assumptionSource: 'POLICY_DEFAULT',
            contributionTiming: CONTRIBUTION_TIMING.BEGINNING_OF_PERIOD,
            isGuaranteed: false
        }
    };
}

/**
 * Aggregates all user goals into a consolidated portfolio solvency and wealth projection diagnostic.
 * 
 * @param {Array<Object>} rawGoals - Array of user goal definitions
 * @param {Array<Object>} holdings - Portfolio holdings
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object} Master Multi-Goal Solvency DTO
 */
export function aggregateMultiGoalSolvency(rawGoals = [], holdings = [], asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }

    if (!Array.isArray(rawGoals) || rawGoals.length === 0) {
        return {
            policyVersion: WEALTH_PROJECTION_POLICY_VERSION,
            asOfDate: new Date(asOfDate).toISOString(),
            status: 'NO_GOALS',
            totalGoalsCount: 0,
            solvencyScore: 100.0,
            aggregateFundedRatio: 1.0,
            totalNominalTargetINR: 0.0,
            totalFutureTargetINR: 0.0,
            totalCurrentAllocatedINR: 0.0,
            totalProjectedTerminalINR: 0.0,
            totalFundingGapINR: 0.0,
            totalMonthlyContributionINR: 0.0,
            totalRequiredMonthlyContributionINR: 0.0,
            totalSIPShortfallDeltaINR: 0.0,
            goalProjections: []
        };
    }

    const projections = rawGoals.map(g => projectGoalSolvency(g, holdings, asOfDate));

    let totalNominal = 0.0;
    let totalFuture = 0.0;
    let totalCurrent = 0.0;
    let totalTerminal = 0.0;
    let totalGap = 0.0;
    let totalMonthly = 0.0;
    let totalRequiredMonthly = 0.0;
    let weightedFundedRatioSum = 0.0;

    for (const p of projections) {
        totalNominal += p.targetCorpusNominal;
        totalFuture += p.targetCorpusFuture;
        totalCurrent += p.currentAllocatedCorpus;
        totalTerminal += p.projectedTerminalWealth;
        totalGap += p.fundingGap;
        totalMonthly += p.monthlyContribution;
        totalRequiredMonthly += p.requiredMonthlyContribution;
        weightedFundedRatioSum += p.fundedRatio * p.targetCorpusFuture;
    }

    const aggregateFundedRatio = totalFuture > 0
        ? Math.min(2.0, totalTerminal / totalFuture)
        : 1.0;

    // Multi-goal solvency score: 0 to 100 scale bounded
    const solvencyScore = Math.max(0.0, Math.min(100.0, Math.round(aggregateFundedRatio * 100.0 * 10) / 10));

    let overallGoalHealthStatus;
    if (aggregateFundedRatio >= SOLVENCY_THRESHOLDS.FULLY_FUNDED_RATIO) {
        overallGoalHealthStatus = 'SOLVENT';
    } else if (aggregateFundedRatio >= SOLVENCY_THRESHOLDS.ON_TRACK_RATIO) {
        overallGoalHealthStatus = 'ON_TRACK';
    } else if (aggregateFundedRatio >= SOLVENCY_THRESHOLDS.AT_RISK_RATIO) {
        overallGoalHealthStatus = 'AT_RISK';
    } else {
        overallGoalHealthStatus = 'CRITICALLY_UNDERFUNDED';
    }

    return {
        policyVersion: WEALTH_PROJECTION_POLICY_VERSION,
        asOfDate: new Date(asOfDate).toISOString(),
        status: 'EVALUATED',
        overallGoalHealthStatus,
        totalGoalsCount: projections.length,
        solvencyScore,
        aggregateFundedRatio: Math.round(aggregateFundedRatio * 1000) / 1000,
        totalNominalTargetINR: Math.round(totalNominal * 100) / 100,
        totalFutureTargetINR: Math.round(totalFuture * 100) / 100,
        totalCurrentAllocatedINR: Math.round(totalCurrent * 100) / 100,
        totalProjectedTerminalINR: Math.round(totalTerminal * 100) / 100,
        totalFundingGapINR: Math.round(totalGap * 100) / 100,
        totalMonthlyContributionINR: Math.round(totalMonthly * 100) / 100,
        totalRequiredMonthlyContributionINR: Math.round(totalRequiredMonthly * 100) / 100,
        totalSIPShortfallDeltaINR: Math.max(0.0, Math.round((totalRequiredMonthly - totalMonthly) * 100) / 100),
        goalProjections: projections,
        meta: {
            policyVersion: WEALTH_PROJECTION_POLICY_VERSION,
            assumptionSource: 'POLICY_DEFAULT',
            contributionTiming: CONTRIBUTION_TIMING.BEGINNING_OF_PERIOD,
            isGuaranteed: false
        }
    };
}
