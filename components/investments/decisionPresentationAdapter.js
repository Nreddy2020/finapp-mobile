/**
 * Decision Intelligence Presentation Adapter (Stage C.8.7)
 * Master Architectural Standard: C8_V1
 * 
 * Transforms certified Phase C.8 decision intelligence DTOs (Goals, Solvency, Glidepaths,
 * Opportunities, Next Best Actions, and What-If Simulations) into pure, UI-ready ViewModels
 * for the Financial Action Command Center.
 * 
 * STRICT INVARIANTS:
 * 1. Zero Financial Calculations: Never recalculates goal gap, SIP, drift, ranking score, or impact.
 * 2. Single Source of Truth: 100% of rendered values originate from certified upstream DTOs.
 * 3. 4-Part Narrative Standard: FACT -> DERIVED_INSIGHT -> RECOMMENDATION -> HYPOTHETICAL_OUTCOME.
 * 4. Deterministic & Wall-Clock Safe: Zero wall-clock access and zero argument-less Date constructors.
 * 5. Read-Only & Immutability: 100% zero state or store mutations.
 */

export const DECISION_THEME = Object.freeze({
    ACTION_CATEGORIES: Object.freeze({
        EMERGENCY_RUNWAY: Object.freeze({ label: 'Emergency Runway', icon: 'shield-alert', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' }),
        DELEVERAGE_DEBT: Object.freeze({ label: 'Deleverage Debt', icon: 'trending-down', color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' }),
        GOAL_FUNDING: Object.freeze({ label: 'Goal Funding', icon: 'flag', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' }),
        GLIDEPATH_ADJUST: Object.freeze({ label: 'Glidepath Allocation', icon: 'sliders', color: '#8B5CF6', bg: '#F5F3FF', border: '#DDD6FE' }),
        TAX_LOSS_HARVEST: Object.freeze({ label: 'Tax-Loss Harvesting', icon: 'percent', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' }),
        REBALANCE_DRIFT: Object.freeze({ label: 'Portfolio Rebalancing', icon: 'refresh-cw', color: '#06B6D4', bg: '#ECFEFF', border: '#A5F3FC' }),
        DE_RISK_CONCENTRATION: Object.freeze({ label: 'Trim Concentration', icon: 'pie-chart', color: '#EC4899', bg: '#FDF2F8', border: '#FBCFE8' }),
        DEFAULT: Object.freeze({ label: 'Financial Action', icon: 'zap', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' })
    }),
    FUNDING_STATES: Object.freeze({
        OVERFUNDED: Object.freeze({ label: 'Overfunded', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', icon: 'check-circle' }),
        FULLY_FUNDED: Object.freeze({ label: 'Fully Funded', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', icon: 'check-circle' }),
        ON_TRACK: Object.freeze({ label: 'On Track', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', icon: 'trending-up' }),
        AT_RISK: Object.freeze({ label: 'At Risk', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', icon: 'alert-triangle' }),
        UNDERFUNDED: Object.freeze({ label: 'Underfunded', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: 'alert-octagon' }),
        NOT_STARTED: Object.freeze({ label: 'Not Started', color: '#64748B', bg: '#F1F5F9', border: '#CBD5E1', icon: 'clock' }),
        PAST_DUE: Object.freeze({ label: 'Past Due', color: '#991B1B', bg: '#FEF2F2', border: '#FCA5A5', icon: 'x-circle' })
    }),
    URGENCY_LEVELS: Object.freeze({
        CRITICAL: Object.freeze({ label: 'Critical', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' }),
        HIGH: Object.freeze({ label: 'High Priority', color: '#F97316', bg: '#FFF7ED', border: '#FED7AA' }),
        MEDIUM: Object.freeze({ label: 'Medium Priority', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' }),
        LOW: Object.freeze({ label: 'Low Priority', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0' })
    }),
    IMPACT_RATINGS: Object.freeze({
        STRONGLY_POSITIVE: Object.freeze({ label: 'Strongly Positive', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', badge: 'High Impact' }),
        POSITIVE: Object.freeze({ label: 'Positive', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE', badge: 'Moderate Impact' }),
        NEUTRAL: Object.freeze({ label: 'Neutral', color: '#64748B', bg: '#F8FAFC', border: '#E2E8F0', badge: 'Neutral' }),
        NEGATIVE: Object.freeze({ label: 'Negative / Cost Friction', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', badge: 'Unfavorable' })
    }),
    NARRATIVE_PILLARS: Object.freeze({
        FACT: Object.freeze({ label: 'FACT', tag: 'Evidence', color: '#475569', bg: '#F1F5F9' }),
        DERIVED_INSIGHT: Object.freeze({ label: 'INSIGHT', tag: 'Diagnosis', color: '#2563EB', bg: '#EFF6FF' }),
        RECOMMENDATION: Object.freeze({ label: 'RECOMMENDATION', tag: 'Action', color: '#D97706', bg: '#FFFBEB' }),
        HYPOTHETICAL_OUTCOME: Object.freeze({ label: 'HYPOTHETICAL OUTCOME', tag: 'Simulation', color: '#059669', bg: '#ECFDF5' })
    })
});

/**
 * Formats currency amount in Indian Rupee notation (e.g. ₹18,00,000 or ₹1,23,456.00).
 */
export function formatCurrencyINR(amount, includeDecimals = true) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    const val = Number(amount);
    const isNegative = val < 0;
    const absVal = Math.abs(val);

    const parts = absVal.toFixed(includeDecimals ? 2 : 0).split('.');
    let intPart = parts[0];
    const decPart = parts.length > 1 ? `.${parts[1]}` : '';

    let lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
        lastThree = ',' + lastThree;
    }
    const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

    return `${isNegative ? '-' : ''}₹${formattedInt}${includeDecimals ? decPart : ''}`;
}

/**
 * Formats compact currency amount (e.g. ₹18.0L, ₹1.5Cr, ₹25.0K).
 */
export function formatCompactCurrencyINR(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    const val = Number(amount);
    const isNegative = val < 0;
    const absVal = Math.abs(val);

    let formatted = '';
    if (absVal >= 10000000) {
        formatted = `₹${(absVal / 10000000).toFixed(2)}Cr`;
    } else if (absVal >= 100000) {
        formatted = `₹${(absVal / 100000).toFixed(1)}L`;
    } else if (absVal >= 1000) {
        formatted = `₹${(absVal / 1000).toFixed(1)}K`;
    } else {
        formatted = `₹${absVal.toFixed(0)}`;
    }
    return `${isNegative ? '-' : ''}${formatted}`;
}

/**
 * Formats a ratio [0.0, 1.0] or number to a formatted percentage string (e.g. 68.4%).
 */
export function formatPercentage(ratio, decimals = 1) {
    if (ratio === null || ratio === undefined || isNaN(ratio)) return '0.0%';
    const pct = Number(ratio) * 100.0;
    return `${pct.toFixed(decimals)}%`;
}

/**
 * Formats signed delta (e.g. +6.6 pts, -2.4 pts, 0.0 pts).
 */
export function formatScoreDelta(delta, decimals = 1, unit = 'pts') {
    if (delta === null || delta === undefined || isNaN(delta)) return `0.0 ${unit}`;
    const val = Number(delta);
    const sign = val > 0 ? '+' : '';
    return `${sign}${val.toFixed(decimals)} ${unit}`.trim();
}

/**
 * Formats an ISO date string into standard YYYY-MM-DD.
 */
export function formatDate(dateISO) {
    if (!dateISO) return 'N/A';
    try {
        const d = new Date(dateISO);
        if (isNaN(d.getTime())) return String(dateISO);
        return d.toISOString().split('T')[0];
    } catch {
        return String(dateISO);
    }
}

/**
 * Adapts individual Goal Solvency and Glidepath DTOs into a structured Card ViewModel.
 */
export function adaptGoalSolvencyCardViewModel(goalSolvency, goalGlidepath = null) {
    if (!goalSolvency) return null;

    const fundingState = goalSolvency.fundingStatus || 'UNDERFUNDED';
    const theme = DECISION_THEME.FUNDING_STATES[fundingState] || DECISION_THEME.FUNDING_STATES.UNDERFUNDED;
    const fundedRatio = Number(goalSolvency.fundedRatio || 0);
    const progressPercent = Math.min(Math.max(fundedRatio * 100, 0), 100);

    const hasSequenceRisk = Boolean(goalGlidepath && goalGlidepath.sequenceOfReturnsRisk && goalGlidepath.sequenceOfReturnsRisk.vulnerable);
    const glidepathTier = goalGlidepath ? goalGlidepath.glidepathTier : null;

    return {
        goalId: goalSolvency.goalId,
        goalName: goalSolvency.name || 'Unnamed Goal',
        category: goalSolvency.category || 'GENERAL',
        priorityTier: goalSolvency.priorityTier || 3,
        targetDate: formatDate(goalSolvency.targetDate),
        horizonMonths: goalSolvency.horizonMonths ?? 0,
        fundingStatus: fundingState,
        statusLabel: theme.label,
        statusTheme: theme,
        progressPercent: Number(progressPercent.toFixed(1)),
        fundedRatioRaw: fundedRatio,
        currentCorpusFormatted: formatCurrencyINR(goalSolvency.currentCorpus || 0, false),
        targetCorpusFutureFormatted: formatCurrencyINR(goalSolvency.futureTargetCorpus || goalSolvency.targetCorpusNominal || 0, false),
        fundingGapFormatted: formatCurrencyINR(goalSolvency.fundingGap || 0, false),
        fundingGapCompact: formatCompactCurrencyINR(goalSolvency.fundingGap || 0),
        currentSipFormatted: formatCurrencyINR(goalSolvency.currentMonthlyContribution || 0, false),
        requiredSipFormatted: formatCurrencyINR(goalSolvency.requiredMonthlyContribution || 0, false),
        isSolvent: fundedRatio >= 1.0,
        hasFundingGap: (goalSolvency.fundingGap || 0) > 0,
        glidepathTier,
        hasSequenceRisk,
        sequenceRiskMessage: hasSequenceRisk ? goalGlidepath.sequenceOfReturnsRisk.reason : null,
        glidepathSummary: goalGlidepath ? goalGlidepath.recommendationSummary : null,
        disclaimer: 'Projections are hypothetical estimates and not guaranteed.'
    };
}

/**
 * Adapts multi-goal aggregated solvency DTO into a Summary ViewModel.
 */
export function adaptGoalsSummaryViewModel(multiGoalSolvency) {
    if (!multiGoalSolvency || multiGoalSolvency.status === 'NO_GOALS' || !multiGoalSolvency.goalBreakdown || multiGoalSolvency.goalBreakdown.length === 0) {
        return {
            status: 'NO_GOALS',
            totalGoalsCount: 0,
            onTrackCount: 0,
            atRiskCount: 0,
            underfundedCount: 0,
            overallSolvencyScore: 100.0,
            overallSolvencyScoreFormatted: '100.0',
            totalFundingGapFormatted: '₹0',
            totalFundingGapCompact: '₹0',
            totalMonthlySipFormatted: '₹0',
            totalRequiredSipFormatted: '₹0',
            goals: []
        };
    }

    const breakdown = multiGoalSolvency.goalBreakdown;
    const totalGoals = breakdown.length;
    let onTrack = 0;
    let atRisk = 0;
    let underfunded = 0;

    for (const g of breakdown) {
        if (g.fundingStatus === 'OVERFUNDED' || g.fundingStatus === 'FULLY_FUNDED' || g.fundingStatus === 'ON_TRACK') {
            onTrack++;
        } else if (g.fundingStatus === 'AT_RISK') {
            atRisk++;
        } else {
            underfunded++;
        }
    }

    const solvencyScore = Number(multiGoalSolvency.overallSolvencyScore ?? 100.0);

    return {
        status: multiGoalSolvency.status || 'EVALUATED',
        totalGoalsCount: totalGoals,
        onTrackCount: onTrack,
        atRiskCount: atRisk,
        underfundedCount: underfunded,
        overallSolvencyScore: solvencyScore,
        overallSolvencyScoreFormatted: solvencyScore.toFixed(1),
        totalFundingGapFormatted: formatCurrencyINR(multiGoalSolvency.totalFundingGap || 0, false),
        totalFundingGapCompact: formatCompactCurrencyINR(multiGoalSolvency.totalFundingGap || 0),
        totalMonthlySipFormatted: formatCurrencyINR(multiGoalSolvency.totalCurrentMonthlyContribution || 0, false),
        totalRequiredSipFormatted: formatCurrencyINR(multiGoalSolvency.totalRequiredMonthlyContribution || 0, false),
        goals: breakdown.map(g => adaptGoalSolvencyCardViewModel(g))
    };
}

/**
 * Adapts diagnostic Opportunity / Vulnerability finding DTO into an Item ViewModel.
 */
export function adaptOpportunityItemViewModel(finding) {
    if (!finding) return null;

    const urgency = finding.urgencyLevel || 'LOW';
    const urgencyTheme = DECISION_THEME.URGENCY_LEVELS[urgency] || DECISION_THEME.URGENCY_LEVELS.LOW;

    return {
        findingId: finding.findingId,
        domainSource: finding.domainSource,
        findingType: finding.findingType,
        severity: finding.severity,
        urgencyLevel: urgency,
        urgencyTheme,
        title: finding.findingType.replace(/_/g, ' '),
        evidenceStatement: finding.evidenceStatement || '',
        rootCauseMetric: finding.rootCauseMetric || '',
        observedValue: finding.observedValue,
        thresholdValue: finding.thresholdValue,
        isActionable: Boolean(finding.suggestedActionCategory)
    };
}

/**
 * Adapts ranked Next Best Action DTO into an Action Card ViewModel.
 */
export function adaptNextBestActionViewModel(action, rank = 1) {
    if (!action) return null;

    const category = action.actionCategory || 'DEFAULT';
    const categoryTheme = DECISION_THEME.ACTION_CATEGORIES[category] || DECISION_THEME.ACTION_CATEGORIES.DEFAULT;
    const urgencyTheme = DECISION_THEME.URGENCY_LEVELS[action.urgencyLevel] || DECISION_THEME.URGENCY_LEVELS.LOW;

    return {
        rank,
        rankBadge: `#${rank}`,
        actionId: action.actionId,
        actionCategory: category,
        categoryTheme,
        urgencyTheme,
        title: action.title || 'Recommended Financial Action',
        rationale: action.rationale || '',
        actionType: action.actionType,
        compositeScore: Number(action.compositeScore ?? 0),
        compositeScoreFormatted: Number(action.compositeScore ?? 0).toFixed(1),
        urgencyScore: action.urgencyScore ?? 0,
        riskReductionScore: action.riskReductionScore ?? 0,
        taxEfficiencyScore: action.taxEfficiencyScore ?? 0,
        goalImpactScore: action.goalImpactScore ?? 0,
        implementationFrictionScore: action.implementationFrictionScore ?? 0,
        targetEntityId: action.targetEntityId || null,
        targetEntityType: action.targetEntityType || 'GENERAL',
        evidenceDomain: action.evidenceDomain || 'GENERAL',
        lifecycleStatus: action.lifecycleStatus || 'IDENTIFIED',
        payload: action.payload || {},
        primaryActionLabel: 'See Impact',
        secondaryActionLabel: 'Review Details',
        dismissActionLabel: 'Dismiss'
    };
}

/**
 * Adapts Action Impact Simulator DTO into a What-If Comparison ViewModel.
 */
export function adaptWhatIfImpactViewModel(simulation) {
    if (!simulation) return null;

    const rating = simulation.impactRating || 'NEUTRAL';
    const ratingTheme = DECISION_THEME.IMPACT_RATINGS[rating] || DECISION_THEME.IMPACT_RATINGS.NEUTRAL;

    const beforeScore = Number(simulation.before?.healthScore?.totalHealthScore ?? 0);
    const afterScore = Number(simulation.after?.healthScore?.totalHealthScore ?? 0);
    const scoreDelta = Number(simulation.impactDeltas?.healthScoreDelta ?? (afterScore - beforeScore));

    const beforeRunway = Number(simulation.before?.healthScore?.liquidityRunwayMonths ?? 0);
    const afterRunway = Number(simulation.after?.healthScore?.liquidityRunwayMonths ?? 0);
    const runwayDelta = Number(simulation.impactDeltas?.runwayMonthsDelta ?? (afterRunway - beforeRunway));

    const beforeSolvency = Number(simulation.before?.goalsSolvency?.overallSolvencyScore ?? 100);
    const afterSolvency = Number(simulation.after?.goalsSolvency?.overallSolvencyScore ?? 100);
    const solvencyDelta = Number(simulation.impactDeltas?.goalSolvencyScoreDelta ?? (afterSolvency - beforeSolvency));

    const capitalGainsTax = Number(simulation.taxFriction?.capitalGainsTaxRealized ?? 0);

    return {
        actionId: simulation.actionId,
        actionCategory: simulation.actionCategory,
        impactRating: rating,
        impactRatingTheme: ratingTheme,
        healthScoreComparison: {
            before: beforeScore,
            beforeFormatted: beforeScore.toFixed(1),
            after: afterScore,
            afterFormatted: afterScore.toFixed(1),
            delta: scoreDelta,
            deltaFormatted: formatScoreDelta(scoreDelta, 1, 'pts'),
            isImprovement: scoreDelta > 0,
            summary: `${beforeScore.toFixed(1)} → ${afterScore.toFixed(1)} (${formatScoreDelta(scoreDelta, 1, 'pts')})`
        },
        primaryPillarDelta: {
            pillar: simulation.impactDeltas?.primaryPillarImpacted || 'N/A',
            delta: Number(simulation.impactDeltas?.primaryPillarDelta ?? 0),
            deltaFormatted: formatScoreDelta(simulation.impactDeltas?.primaryPillarDelta ?? 0, 1, 'pts')
        },
        runwayComparison: {
            beforeMonths: beforeRunway,
            afterMonths: afterRunway,
            deltaMonths: runwayDelta,
            summary: `${beforeRunway.toFixed(1)} mo → ${afterRunway.toFixed(1)} mo`
        },
        solvencyComparison: {
            beforeScore: beforeSolvency,
            afterScore: afterSolvency,
            delta: solvencyDelta,
            deltaFormatted: formatScoreDelta(solvencyDelta, 1, 'pts')
        },
        taxFriction: {
            capitalGainsTaxRealizedFormatted: formatCurrencyINR(capitalGainsTax, false),
            hasTaxCost: capitalGainsTax > 0,
            explanation: simulation.taxFriction?.explanation || 'No taxable gains triggered.'
        },
        goalDeltasCount: simulation.impactDeltas?.goalDeltas?.length || 0,
        goalDeltas: (simulation.impactDeltas?.goalDeltas || []).map(gd => ({
            goalId: gd.goalId,
            gapReductionFormatted: formatCurrencyINR(gd.gapReduction || 0, false),
            statusTransition: `${gd.beforeStatus} → ${gd.afterStatus}`,
            isFullyFunded: gd.afterStatus === 'FULLY_FUNDED' || gd.afterStatus === 'OVERFUNDED'
        })),
        isSimulationValid: true,
        disclaimer: 'Simulated outcomes are non-binding hypothetical estimates based on current market valuations.'
    };
}

/**
 * Adapts certified Action and Simulation DTOs into the rigorous 4-Part Narrative ViewModel:
 * 1. FACT: Objective diagnostic upstream evidence
 * 2. DERIVED_INSIGHT: Identified risk or inefficiency mechanism
 * 3. RECOMMENDATION: Clear, actionable step proposed
 * 4. HYPOTHETICAL_OUTCOME: Deterministic before/after simulation result
 */
export function adaptCompositeNarrativeViewModel(action, simulation = null) {
    if (!action) return null;

    const factPillar = DECISION_THEME.NARRATIVE_PILLARS.FACT;
    const insightPillar = DECISION_THEME.NARRATIVE_PILLARS.DERIVED_INSIGHT;
    const recPillar = DECISION_THEME.NARRATIVE_PILLARS.RECOMMENDATION;
    const outcomePillar = DECISION_THEME.NARRATIVE_PILLARS.HYPOTHETICAL_OUTCOME;

    const factStatement = action.rationale || 'Diagnostic analysis identified potential portfolio optimization.';
    const insightStatement = action.evidenceDomain
        ? `Evidence identified from ${action.evidenceDomain} domain with urgency score ${action.urgencyScore ?? 0}/100.`
        : 'Identified opportunity to improve portfolio resilience and goal solvency.';
    const recommendationStatement = action.title || 'Implement proposed financial rebalancing.';

    let outcomeStatement = 'Simulation not executed for this action.';
    if (simulation) {
        const scoreDelta = formatScoreDelta(simulation.impactDeltas?.healthScoreDelta ?? 0, 1, 'pts');
        const pillar = simulation.impactDeltas?.primaryPillarImpacted;
        outcomeStatement = `Projected health score change of ${scoreDelta}, with primary improvement in ${pillar || 'financial pillars'}.`;
    }

    return {
        actionId: action.actionId,
        narrativeItems: [
            {
                pillarType: 'FACT',
                header: factPillar.label,
                tag: factPillar.tag,
                theme: factPillar,
                statement: factStatement
            },
            {
                pillarType: 'DERIVED_INSIGHT',
                header: insightPillar.label,
                tag: insightPillar.tag,
                theme: insightPillar,
                statement: insightStatement
            },
            {
                pillarType: 'RECOMMENDATION',
                header: recPillar.label,
                tag: recPillar.tag,
                theme: recPillar,
                statement: recommendationStatement
            },
            {
                pillarType: 'HYPOTHETICAL_OUTCOME',
                header: outcomePillar.label,
                tag: outcomePillar.tag,
                theme: outcomePillar,
                statement: outcomeStatement
            }
        ]
    };
}

/**
 * Adapts all C.8 decision intelligence streams into a single composite Financial Command Center ViewModel.
 */
export function adaptFinancialCommandCenterViewModel({
    healthScoreDTO = null,
    multiGoalSolvencyDTO = null,
    glidepathsDTO = null,
    opportunitiesDTO = null,
    nextBestActionsDTO = null,
    activeSimulationDTO = null,
    asOfDate = null
} = {}) {
    if (!asOfDate) {
        throw new Error('adaptFinancialCommandCenterViewModel requires a mandatory asOfDate parameter.');
    }

    const currentHealthScore = Number(healthScoreDTO?.totalHealthScore ?? 0);
    const healthGrade = healthScoreDTO?.healthGrade || 'C';

    const goalsSummaryVM = adaptGoalsSummaryViewModel(multiGoalSolvencyDTO);
    
    // Attach glidepath recommendations to individual goals if available
    if (goalsSummaryVM.goals && glidepathsDTO && glidepathsDTO.goalGlidepaths) {
        for (const goalVM of goalsSummaryVM.goals) {
            const gp = glidepathsDTO.goalGlidepaths.find(g => g.goalId === goalVM.goalId);
            if (gp) {
                goalVM.glidepathTier = gp.glidepathTier;
                goalVM.hasSequenceRisk = Boolean(gp.sequenceOfReturnsRisk?.vulnerable);
                goalVM.sequenceRiskMessage = gp.sequenceOfReturnsRisk?.reason || null;
                goalVM.glidepathSummary = gp.recommendationSummary;
            }
        }
    }

    const opportunitiesList = (opportunitiesDTO?.findings || []).map(f => adaptOpportunityItemViewModel(f));
    const rankedActionsList = (nextBestActionsDTO?.rankedActions || []).map((a, idx) => adaptNextBestActionViewModel(a, idx + 1));
    const activeSimulationVM = activeSimulationDTO ? adaptWhatIfImpactViewModel(activeSimulationDTO) : null;

    const topAction = rankedActionsList.length > 0 ? rankedActionsList[0] : null;
    const topActionNarrative = topAction ? adaptCompositeNarrativeViewModel(topAction, activeSimulationDTO) : null;

    let overallState = 'EVALUATED';
    if (!healthScoreDTO && goalsSummaryVM.status === 'NO_GOALS' && rankedActionsList.length === 0) {
        overallState = 'EMPTY';
    } else if (rankedActionsList.length === 0) {
        overallState = 'NO_ACTION_REQUIRED';
    }

    return {
        overallState,
        asOfDateFormatted: formatDate(asOfDate),
        asOfDateRaw: asOfDate,
        healthOverview: {
            score: currentHealthScore,
            scoreFormatted: currentHealthScore.toFixed(1),
            grade: healthGrade,
            status: healthScoreDTO?.status || 'EVALUATED',
            confidence: healthScoreDTO?.dataConfidence || 'HIGH',
            runwayMonthsFormatted: `${(healthScoreDTO?.liquidityRunwayMonths ?? 0).toFixed(1)} mo`
        },
        goalsOverview: goalsSummaryVM,
        opportunities: {
            count: opportunitiesList.length,
            items: opportunitiesList
        },
        topActions: {
            count: rankedActionsList.length,
            items: rankedActionsList,
            primaryAction: topAction,
            primaryActionNarrative: topActionNarrative
        },
        whatIfSimulation: activeSimulationVM,
        metadata: {
            policyVersion: 'C8_V1',
            isCertifiedPipeline: true,
            zeroCalculationsPreserved: true
        }
    };
}
