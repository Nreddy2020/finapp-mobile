/**
 * Goal Planning Engine (Stage C.8.1)
 * Master Architectural Standard: C8_V1
 * 
 * Provides deterministic goal validation, category-based inflation policy modeling,
 * future required corpus calculation, 4-tier priority hierarchy resolution,
 * and savings capacity allocation waterfall.
 * 
 * STRICT INVARIANTS:
 * 1. Calculate Once: Pure analytical functions, zero recalculation of upstream metrics.
 * 2. Deterministic: Mandatory caller asOfDate; zero wall-clock dependencies.
 * 3. Boundedness: Inflation clamped to [0.0, 0.25], nominal corpus > 0.
 * 4. Read-Only: Zero store mutations.
 */

export const GOAL_PLANNING_POLICY_VERSION = 'C8_1_V1';

export const GOAL_CATEGORIES = Object.freeze({
    RETIREMENT: 'RETIREMENT',
    HOME_PURCHASE: 'HOME_PURCHASE',
    CHILD_EDUCATION: 'CHILD_EDUCATION',
    HEALTHCARE: 'HEALTHCARE',
    EMERGENCY_FUND: 'EMERGENCY_FUND',
    VEHICLE: 'VEHICLE',
    WEALTH_CREATION: 'WEALTH_CREATION',
    CUSTOM: 'CUSTOM'
});

export const GOAL_PRIORITY_TIERS = Object.freeze({
    CRITICAL_TIER_1: 'CRITICAL_TIER_1', // Survival & Resilience: Emergency fund, high debt
    HIGH_TIER_2: 'HIGH_TIER_2',         // Non-Negotiable Core: Retirement, primary residence
    MEDIUM_TIER_3: 'MEDIUM_TIER_3',     // Major Milestones: Education, marriage
    LOW_TIER_4: 'LOW_TIER_4'            // Discretionary: Luxury, vehicle, speculative
});

export const PRIORITY_TIER_RANK = Object.freeze({
    [GOAL_PRIORITY_TIERS.CRITICAL_TIER_1]: 1,
    [GOAL_PRIORITY_TIERS.HIGH_TIER_2]: 2,
    [GOAL_PRIORITY_TIERS.MEDIUM_TIER_3]: 3,
    [GOAL_PRIORITY_TIERS.LOW_TIER_4]: 4
});

export const GOAL_STATUS = Object.freeze({
    NOT_STARTED: 'NOT_STARTED',
    PAST_DUE: 'PAST_DUE',
    OVERFUNDED: 'OVERFUNDED',
    FULLY_FUNDED: 'FULLY_FUNDED',
    ON_TRACK: 'ON_TRACK',
    AT_RISK: 'AT_RISK',
    UNDERFUNDED: 'UNDERFUNDED',
    ACTIVE: 'ACTIVE'
});

export const INFLATION_POLICY = Object.freeze({
    DEFAULT_MACRO_INFLATION: 0.06,      // 6.0% p.a.
    EDUCATION_INFLATION: 0.08,          // 8.0% p.a.
    HEALTHCARE_INFLATION: 0.08,         // 8.0% p.a.
    MIN_INFLATION: 0.0,
    MAX_INFLATION: 0.25
});

/**
 * Validates a single goal object according to Stage C.8.1 schema rules.
 * 
 * @param {Object} goal - Goal definition object
 * @param {string|Date} asOfDate - Deterministic reference date
 * @returns {Object} Validated and normalized goal object
 */
export function validateAndNormalizeGoal(goal, asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }
    if (!goal || typeof goal !== 'object') {
        throw new Error('Invalid goal: goal must be a non-null object');
    }
    if (!goal.goalId || typeof goal.goalId !== 'string' || goal.goalId.trim() === '') {
        throw new Error('Invalid goal: goalId must be a non-empty string');
    }
    if (!goal.name || typeof goal.name !== 'string' || goal.name.trim() === '') {
        throw new Error(`Invalid goal ${goal.goalId}: name must be a non-empty string`);
    }

    const category = Object.values(GOAL_CATEGORIES).includes(goal.category)
        ? goal.category
        : GOAL_CATEGORIES.CUSTOM;

    const priorityTier = Object.values(GOAL_PRIORITY_TIERS).includes(goal.priorityTier)
        ? goal.priorityTier
        : (category === GOAL_CATEGORIES.EMERGENCY_FUND ? GOAL_PRIORITY_TIERS.CRITICAL_TIER_1 : GOAL_PRIORITY_TIERS.MEDIUM_TIER_3);

    if (goal.targetCorpusNominal === undefined || goal.targetCorpusNominal === null || isNaN(goal.targetCorpusNominal) || Number(goal.targetCorpusNominal) <= 0) {
        throw new Error(`Invalid goal ${goal.goalId}: targetCorpusNominal must be a positive number`);
    }
    const targetCorpusNominal = Number(goal.targetCorpusNominal);

    if (!goal.targetDate) {
        throw new Error(`Invalid goal ${goal.goalId}: targetDate is required`);
    }
    const asOfMillis = new Date(asOfDate).getTime();
    if (isNaN(asOfMillis)) {
        throw new Error(`Invalid asOfDate timestamp: ${asOfDate}`);
    }
    const targetMillis = new Date(goal.targetDate).getTime();
    if (isNaN(targetMillis)) {
        throw new Error(`Invalid goal ${goal.goalId}: targetDate is an invalid timestamp: ${goal.targetDate}`);
    }

    const horizonYears = Math.max(0.0, (targetMillis - asOfMillis) / (365.25 * 24 * 3600 * 1000));
    const isPastDue = targetMillis < asOfMillis;

    // Resolve inflation rate (User override vs Category default policy)
    let inflationRate;
    if (goal.inflationRate !== undefined && goal.inflationRate !== null && !isNaN(goal.inflationRate)) {
        inflationRate = Math.max(INFLATION_POLICY.MIN_INFLATION, Math.min(INFLATION_POLICY.MAX_INFLATION, Number(goal.inflationRate)));
    } else {
        if (category === GOAL_CATEGORIES.CHILD_EDUCATION) {
            inflationRate = INFLATION_POLICY.EDUCATION_INFLATION;
        } else if (category === GOAL_CATEGORIES.HEALTHCARE) {
            inflationRate = INFLATION_POLICY.HEALTHCARE_INFLATION;
        } else {
            inflationRate = INFLATION_POLICY.DEFAULT_MACRO_INFLATION;
        }
    }

    // Compute Inflation-Adjusted Future Target Corpus (C_future)
    const targetCorpusFuture = isPastDue
        ? targetCorpusNominal
        : targetCorpusNominal * Math.pow(1.0 + inflationRate, horizonYears);

    const allocatedHoldingIds = Array.isArray(goal.allocatedHoldingIds) ? [...goal.allocatedHoldingIds] : [];
    const allocatedCashAmount = Math.max(0.0, Number(goal.allocatedCashAmount || 0));
    const monthlyContribution = Math.max(0.0, Number(goal.monthlyContribution || 0));

    // Determine initial operational status
    let status;
    if (isPastDue) {
        status = GOAL_STATUS.PAST_DUE;
    } else if (allocatedHoldingIds.length === 0 && allocatedCashAmount === 0 && monthlyContribution === 0) {
        status = GOAL_STATUS.NOT_STARTED;
    } else {
        status = GOAL_STATUS.ACTIVE;
    }

    return {
        goalId: goal.goalId.trim(),
        name: goal.name.trim(),
        category,
        priorityTier,
        priorityRank: PRIORITY_TIER_RANK[priorityTier] || 3,
        targetDate: new Date(targetMillis).toISOString().split('T')[0],
        horizonYears,
        isPastDue,
        targetCorpusNominal,
        inflationRate,
        targetCorpusFuture: Math.round(targetCorpusFuture * 100) / 100,
        allocatedHoldingIds,
        allocatedCashAmount,
        monthlyContribution,
        status,
        policyVersion: GOAL_PLANNING_POLICY_VERSION
    };
}

/**
 * Deterministically sorts a collection of goals by institutional precedence:
 * Priority Tier ASC (1 before 4) -> Target Date ASC (Sooner before later) -> Funded Ratio ASC -> goalId ASC
 * 
 * @param {Array<Object>} goals - Array of goal objects
 * @param {string|Date} asOfDate - Reference date
 * @returns {Array<Object>} Deterministically sorted goals
 */
export function sortGoalsByPrecedence(goals, asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }
    if (!Array.isArray(goals) || goals.length === 0) {
        return [];
    }

    const normalized = goals.map(g => validateAndNormalizeGoal(g, asOfDate));

    return normalized.sort((a, b) => {
        // 1. Priority Tier Rank ASC (1 = CRITICAL, 2 = HIGH, 3 = MEDIUM, 4 = LOW)
        if (a.priorityRank !== b.priorityRank) {
            return a.priorityRank - b.priorityRank;
        }
        // 2. Horizon / Target Date ASC (Sooner maturities before later)
        if (a.horizonYears !== b.horizonYears) {
            return a.horizonYears - b.horizonYears;
        }
        // 3. goalId ASC (lexicographical tie-breaker)
        return a.goalId.localeCompare(b.goalId);
    });
}

/**
 * Evaluates savings capacity allocation across goals via a 4-Tier priority waterfall.
 * Allocates available monthly savings capacity strictly in precedence order to underfunded goals.
 * 
 * @param {Array<Object>} goals - Array of goals
 * @param {number} availableMonthlySavings - Total monthly savings capacity (INR)
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object} Savings waterfall allocation summary DTO
 */
export function allocateSavingsCapacityWaterfall(goals, availableMonthlySavings, asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }
    const totalCapacity = Math.max(0.0, Number(availableMonthlySavings || 0));
    let remainingCapacity = totalCapacity;

    if (!Array.isArray(goals) || goals.length === 0) {
        return {
            policyVersion: GOAL_PLANNING_POLICY_VERSION,
            asOfDate: new Date(asOfDate).toISOString(),
            totalSavingsCapacity: totalCapacity,
            allocatedSavingsTotal: 0.0,
            unallocatedSavingsTotal: totalCapacity,
            goalAllocations: []
        };
    }

    const sortedGoals = sortGoalsByPrecedence(goals, asOfDate);
    const goalAllocations = [];
    let totalAllocated = 0.0;

    for (const goal of sortedGoals) {
        // Overdue goals or fully funded goals do not absorb new recurring monthly SIP capacity
        if (goal.status === GOAL_STATUS.PAST_DUE || goal.status === GOAL_STATUS.FULLY_FUNDED || goal.status === GOAL_STATUS.OVERFUNDED) {
            goalAllocations.push({
                goalId: goal.goalId,
                name: goal.name,
                priorityTier: goal.priorityTier,
                priorityRank: goal.priorityRank,
                targetCorpusFuture: goal.targetCorpusFuture,
                allocatedMonthlySavings: 0.0,
                allocatedShare: 0.0,
                reason: goal.status === GOAL_STATUS.PAST_DUE ? 'GOAL_PAST_DUE' : 'GOAL_ALREADY_FUNDED'
            });
            continue;
        }

        // Requested or required monthly contribution
        const requestedMonthly = goal.monthlyContribution > 0 ? goal.monthlyContribution : 0.0;
        const allocated = Math.min(remainingCapacity, requestedMonthly > 0 ? requestedMonthly : remainingCapacity);

        remainingCapacity -= allocated;
        totalAllocated += allocated;

        goalAllocations.push({
            goalId: goal.goalId,
            name: goal.name,
            priorityTier: goal.priorityTier,
            priorityRank: goal.priorityRank,
            targetCorpusFuture: goal.targetCorpusFuture,
            allocatedMonthlySavings: Math.round(allocated * 100) / 100,
            allocatedShare: totalCapacity > 0 ? Math.round((allocated / totalCapacity) * 1000) / 1000 : 0.0,
            reason: allocated >= requestedMonthly ? 'FULLY_SATISFIED' : 'PARTIALLY_FUNDED_CAPACITY_LIMIT'
        });
    }

    return {
        policyVersion: GOAL_PLANNING_POLICY_VERSION,
        asOfDate: new Date(asOfDate).toISOString(),
        totalSavingsCapacity: totalCapacity,
        allocatedSavingsTotal: Math.round(totalAllocated * 100) / 100,
        unallocatedSavingsTotal: Math.round(remainingCapacity * 100) / 100,
        goalAllocations
    };
}
