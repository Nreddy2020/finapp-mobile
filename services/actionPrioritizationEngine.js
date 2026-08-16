/**
 * Next Best Action Prioritization Engine (Stage C.8.5)
 * Master Architectural Standard: C8_V1
 * 
 * Transforms structured opportunities and vulnerabilities into ranked, actionable financial recommendations
 * via a closed-form multi-objective optimization function with deterministic tie-breaking.
 * 
 * STRICT INVARIANTS:
 * 1. Recommendation != Execution: Generates actionable advice with full evidence traceability;
 *    never places orders or mutates financial stores.
 * 2. Closed-Form Scoring (C8-R7): Exact linear weighting:
 *    S_action = 0.30 * U + 0.25 * R + 0.15 * T + 0.20 * G - 0.10 * F (all bounded in [0, 100]).
 * 3. Deterministic 4-Tier Tie-Breaking:
 *    Score DESC -> Urgency DESC -> GoalPriority DESC -> actionId ASC.
 * 4. Duplicate Suppression: Retains highest-scoring action per target entity.
 * 5. Lifecycle Separation (C8-R13): Analytical engine outputs IDENTIFIED status only.
 * 6. Read-Only Purity: Zero store mutations, mandatory caller asOfDate.
 */

import {
    FINDING_TYPES,
    FINDING_CATEGORIES,
    FINDING_SEVERITY
} from './financialOpportunityAggregator.js';

export const ACTION_PRIORITIZATION_VERSION = 'C8_5_V1';

export const ACTION_CATEGORIES = Object.freeze({
    EMERGENCY_RUNWAY: 'EMERGENCY_RUNWAY',
    DELEVERAGE_DEBT: 'DELEVERAGE_DEBT',
    GOAL_FUNDING: 'GOAL_FUNDING',
    GLIDEPATH_ADJUST: 'GLIDEPATH_ADJUST',
    DE_RISK_CONCENTRATION: 'DE_RISK_CONCENTRATION',
    TAX_LOSS_HARVEST: 'TAX_LOSS_HARVEST',
    REBALANCE_DRIFT: 'REBALANCE_DRIFT'
});

export const ACTION_LIFECYCLE_STATUS = Object.freeze({
    IDENTIFIED: 'IDENTIFIED',
    REVIEWED: 'REVIEWED',
    ACCEPTED: 'ACCEPTED',
    SCHEDULED: 'SCHEDULED',
    COMPLETED: 'COMPLETED',
    SNOOZED: 'SNOOZED',
    DISMISSED: 'DISMISSED'
});

export const SCORING_WEIGHTS = Object.freeze({
    W_URGENCY: 0.30,
    W_RISK_IMPROVEMENT: 0.25,
    W_TAX_EFFICIENCY: 0.15,
    W_GOAL_ALIGNMENT: 0.20,
    W_FRICTION_PENALTY: 0.10
});

/**
 * Computes the closed-form composite action score S_action in [0.0, 100.0].
 * 
 * @param {Object} factors - Factor sub-scores in [0.0, 100.0]
 * @returns {number} Bounded composite action score
 */
export function calculateActionScore(factors) {
    const U = Math.max(0.0, Math.min(100.0, Number(factors.urgency || 0)));
    const R = Math.max(0.0, Math.min(100.0, Number(factors.riskImprovement || 0)));
    const T = Math.max(0.0, Math.min(100.0, Number(factors.taxEfficiency || 0)));
    const G = Math.max(0.0, Math.min(100.0, Number(factors.goalAlignment || 0)));
    const F = Math.max(0.0, Math.min(100.0, Number(factors.frictionPenalty || 0)));

    const rawScore = (SCORING_WEIGHTS.W_URGENCY * U) +
                     (SCORING_WEIGHTS.W_RISK_IMPROVEMENT * R) +
                     (SCORING_WEIGHTS.W_TAX_EFFICIENCY * T) +
                     (SCORING_WEIGHTS.W_GOAL_ALIGNMENT * G) -
                     (SCORING_WEIGHTS.W_FRICTION_PENALTY * F);

    return Math.max(0.0, Math.min(100.0, Math.round(rawScore * 10) / 10));
}

/**
 * Maps a single finding record from C.8.4 into a candidate actionable recommendation.
 * 
 * @param {Object} finding - Normalized finding record
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object|null} Candidate Action DTO
 */
export function mapFindingToCandidateAction(finding, asOfDate) {
    if (!finding || typeof finding !== 'object') return null;

    const actionId = `ACT_${finding.findingId}`;
    let category;
    let title;
    let description;
    let executionType;
    let tradeoffs = [];
    let prerequisites = [];

    // Factor sub-scores in [0, 100]
    const urgency = finding.urgencyScore || 50.0;
    let riskImprovement = 50.0;
    let taxEfficiency = 75.0; // Default: neutral tax consequence
    let goalAlignment = 25.0;
    let frictionPenalty = 25.0;

    switch (finding.category) {
        case FINDING_CATEGORIES.LIQUIDITY_BUFFER:
            category = ACTION_CATEGORIES.EMERGENCY_RUNWAY;
            title = 'Replenish Emergency Runway Reserve';
            description = `Allocate surplus cash flow to reach the 6-month emergency reserve minimum. Current runway is ${Number(finding.sourceValue).toFixed(1)} months.`;
            executionType = 'ALLOCATE_CASH';
            riskImprovement = 95.0;
            taxEfficiency = 80.0;
            goalAlignment = 100.0; // Tier 1 Critical survival
            frictionPenalty = 10.0;
            tradeoffs = ['Temporary reduction in discretionary investing cash flow.'];
            prerequisites = ['Accessible liquid bank account or liquid mutual fund.'];
            break;

        case FINDING_CATEGORIES.DEBT_REDUCTION:
            category = ACTION_CATEGORIES.DELEVERAGE_DEBT;
            title = `Prepay High-Interest Loan (${finding.targetEntityId || 'Debt'})`;
            description = `Make accelerated principal payments on loan carrying ${Number(finding.sourceValue).toFixed(1)}% p.a. interest.`;
            executionType = 'PREPAY_DEBT';
            riskImprovement = 90.0;
            taxEfficiency = 85.0; // Guaranteed post-tax return
            goalAlignment = 90.0;
            frictionPenalty = 15.0;
            tradeoffs = ['Liquid capital is permanently committed to debt elimination.'];
            prerequisites = ['Verify zero prepayment penalty terms with lender.'];
            break;

        case FINDING_CATEGORIES.GOAL_SOLVENCY:
            category = ACTION_CATEGORIES.GOAL_FUNDING;
            title = `Increase Monthly SIP for Goal (${finding.targetEntityId || 'Goal'})`;
            description = finding.evidenceText || 'Increase recurring monthly investment to close projected goal shortfall.';
            executionType = 'INCREASE_SIP';
            riskImprovement = 75.0;
            taxEfficiency = 75.0;
            goalAlignment = finding.severity === FINDING_SEVERITY.CRITICAL ? 100.0 : 80.0;
            frictionPenalty = 10.0;
            tradeoffs = ['Requires committing additional monthly cash flow.'];
            prerequisites = ['Active bank mandate or auto-debit setup.'];
            break;

        case FINDING_CATEGORIES.GLIDEPATH_ALIGNMENT:
            category = ACTION_CATEGORIES.GLIDEPATH_ADJUST;
            title = `De-Risk Goal Asset Allocation (${finding.targetEntityId || 'Goal'})`;
            description = 'Rebalance near-maturity goal assets from high-volatility equities into capital preservation debt/cash.';
            executionType = 'REBALANCE';
            riskImprovement = 85.0;
            taxEfficiency = 60.0;
            goalAlignment = 85.0;
            frictionPenalty = 35.0;
            tradeoffs = ['Caps future upside equity potential in exchange for downside capital protection.'];
            prerequisites = ['Review capital gains holding period before selling.'];
            break;

        case FINDING_CATEGORIES.TAX_OPTIMIZATION:
            category = ACTION_CATEGORIES.TAX_LOSS_HARVEST;
            title = 'Harvest Unrealized Capital Losses';
            description = finding.evidenceText || 'Realize eligible tax losses to offset taxable capital gains.';
            executionType = 'SELL_HOLDING';
            riskImprovement = 35.0;
            taxEfficiency = 100.0; // Maximum tax benefit
            goalAlignment = 30.0;
            frictionPenalty = 25.0;
            tradeoffs = ['Transaction exit costs and brokerage spread.'];
            prerequisites = ['Ensure replacement asset is identified to maintain market exposure.'];
            break;

        case FINDING_CATEGORIES.REBALANCING:
            category = ACTION_CATEGORIES.REBALANCE_DRIFT;
            title = 'Rebalance Portfolio to Target Allocation';
            description = 'Execute target allocation rebalancing to eliminate asset class drift.';
            executionType = 'REBALANCE';
            riskImprovement = 70.0;
            taxEfficiency = 55.0;
            goalAlignment = 50.0;
            frictionPenalty = 45.0;
            tradeoffs = ['Potential taxable capital gains realization on overweight asset sales.'];
            prerequisites = ['Review tax-optimized rebalancing order preview (C.6.4).'];
            break;

        default:
            category = ACTION_CATEGORIES.DE_RISK_CONCENTRATION;
            title = 'Trim Concentrated Asset Exposure';
            description = finding.evidenceText || 'Reduce concentrated holding to bring exposure within policy limits.';
            executionType = 'SELL_HOLDING';
            riskImprovement = 80.0;
            taxEfficiency = 50.0;
            goalAlignment = 40.0;
            frictionPenalty = 30.0;
            tradeoffs = ['Potential tax liability on realized capital gains.'];
            prerequisites = ['Check FIFO tax lots and exit load status.'];
            break;
    }

    const factors = {
        urgency,
        riskImprovement,
        taxEfficiency,
        goalAlignment,
        frictionPenalty
    };

    const overallActionScore = calculateActionScore(factors);

    let urgencyLevel;
    if (urgency >= 90.0) urgencyLevel = 'CRITICAL';
    else if (urgency >= 70.0) urgencyLevel = 'HIGH';
    else if (urgency >= 45.0) urgencyLevel = 'MEDIUM';
    else urgencyLevel = 'LOW';

    return {
        actionId,
        category,
        title,
        description,
        urgencyLevel,
        overallActionScore,
        factors,
        evidence: {
            sourceEngine: finding.sourceEngine,
            sourceMetric: finding.sourceMetric,
            sourceValue: finding.sourceValue,
            thresholdValue: finding.thresholdValue,
            evidenceText: finding.evidenceText
        },
        recommendedExecution: {
            type: executionType,
            targetEntityId: finding.targetEntityId || null,
            affectedGoalIds: finding.affectedGoalIds || []
        },
        tradeoffs,
        prerequisites,
        lifecycleStatus: ACTION_LIFECYCLE_STATUS.IDENTIFIED,
        asOfDate: new Date(asOfDate).toISOString(),
        policyVersion: ACTION_PRIORITIZATION_VERSION
    };
}

/**
 * Prioritizes and ranks actionable financial recommendations from aggregated findings.
 * 
 * @param {Object} aggregatedFindingsDTO - Output DTO from C.8.4
 * @param {string|Date} asOfDate - Reference date
 * @returns {Object} Ranked Next Best Actions DTO
 */
export function prioritizeNextBestActions(aggregatedFindingsDTO = {}, asOfDate) {
    if (!asOfDate) {
        throw new Error('Missing mandatory deterministic parameter: asOfDate');
    }

    const allFindings = Array.isArray(aggregatedFindingsDTO.allFindings)
        ? aggregatedFindingsDTO.allFindings
        : [];

    if (allFindings.length === 0) {
        return {
            policyVersion: ACTION_PRIORITIZATION_VERSION,
            asOfDate: new Date(asOfDate).toISOString(),
            status: 'NO_ACTION_REQUIRED',
            totalActionsCount: 0,
            rankedActions: [],
            meta: {
                scoringModel: 'CLOSED_FORM_MULTI_OBJECTIVE_V1',
                tieBreaker: 'SCORE_DESC_URGENCY_DESC_GOAL_DESC_ACTIONID_ASC',
                lifecycleSeparationEnforced: true
            }
        };
    }

    // 1. Map all findings to candidate actions
    const candidateActions = [];
    for (const finding of allFindings) {
        const action = mapFindingToCandidateAction(finding, asOfDate);
        if (action) {
            candidateActions.push(action);
        }
    }

    // 2. Duplicate Action Suppression: Retain highest-scoring action per targetEntityId/category
    const actionKeyMap = new Map();
    for (const act of candidateActions) {
        const key = act.recommendedExecution.targetEntityId
            ? `${act.category}_${act.recommendedExecution.targetEntityId}`
            : act.actionId;

        if (!actionKeyMap.has(key) || act.overallActionScore > actionKeyMap.get(key).overallActionScore) {
            actionKeyMap.set(key, act);
        }
    }
    const deduplicatedActions = Array.from(actionKeyMap.values());

    // 3. Deterministic 4-Tier Tie-Breaking Order:
    // Score DESC -> Urgency DESC -> Goal Alignment DESC -> actionId ASC
    const sortedActions = deduplicatedActions.sort((a, b) => {
        // 1. Overall Score DESC
        if (b.overallActionScore !== a.overallActionScore) {
            return b.overallActionScore - a.overallActionScore;
        }
        // 2. Urgency DESC
        if (b.factors.urgency !== a.factors.urgency) {
            return b.factors.urgency - a.factors.urgency;
        }
        // 3. Goal Alignment DESC
        if (b.factors.goalAlignment !== a.factors.goalAlignment) {
            return b.factors.goalAlignment - a.factors.goalAlignment;
        }
        // 4. actionId ASC (Lexicographical)
        return a.actionId.localeCompare(b.actionId);
    });

    // 4. Assign 1-indexed Priority Rank (#1, #2, #3...)
    const rankedActions = sortedActions.map((act, index) => ({
        ...act,
        priorityRank: index + 1
    }));

    return {
        policyVersion: ACTION_PRIORITIZATION_VERSION,
        asOfDate: new Date(asOfDate).toISOString(),
        status: rankedActions.length > 0 ? 'ACTIONS_AVAILABLE' : 'NO_ACTION_REQUIRED',
        totalActionsCount: rankedActions.length,
        criticalActionsCount: rankedActions.filter(a => a.urgencyLevel === 'CRITICAL').length,
        highActionsCount: rankedActions.filter(a => a.urgencyLevel === 'HIGH').length,
        rankedActions,
        meta: {
            scoringModel: 'CLOSED_FORM_MULTI_OBJECTIVE_V1',
            tieBreaker: 'SCORE_DESC_URGENCY_DESC_GOAL_DESC_ACTIONID_ASC',
            lifecycleSeparationEnforced: true
        }
    };
}
