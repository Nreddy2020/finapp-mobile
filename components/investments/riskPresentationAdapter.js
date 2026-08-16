/**
 * Risk Presentation Adapter (Stage C.7.8)
 * Master Architectural Standard: C7_8_V1
 * 
 * Provides pure, deterministic ViewModel transformations from certified C.7.7 and C.7.6 DTOs
 * into formatted, localized, and styled UI representations for the Risk Intelligence Dashboard.
 * 
 * STRICT INVARIANTS:
 * 1. Zero Financial Calculations: Never recalculates HHI, volatility, drawdown, VaR/CVaR,
 *    correlation, PCA, liquidity, runway, scenario losses, or health scores.
 * 2. Single Source of Truth: All rendered numbers are 100% traceable to upstream DTOs.
 * 3. Pure Formatting: Formats currency (Indian numbering), percentages, progress ratios, and theme tokens.
 * 4. Deterministic: Zero wall-clock dependencies.
 */

export const THEME_COLORS = Object.freeze({
    GRADES: Object.freeze({
        A: Object.freeze({ text: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', name: 'EXCELLENT' }),
        B: Object.freeze({ text: '#22C55E', bg: '#F0FDF4', border: '#BBF7D0', name: 'GOOD' }),
        C: Object.freeze({ text: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', name: 'FAIR' }),
        D: Object.freeze({ text: '#F97316', bg: '#FFF7ED', border: '#FED7AA', name: 'VULNERABLE' }),
        F: Object.freeze({ text: '#EF4444', bg: '#FEF2F2', border: '#FECACA', name: 'CRITICAL' })
    }),
    CONFIDENCE: Object.freeze({
        HIGH: Object.freeze({ text: '#2563EB', bg: '#EFF6FF', label: 'HIGH CONFIDENCE' }),
        MODERATE: Object.freeze({ text: '#D97706', bg: '#FFFBEB', label: 'MODERATE CONFIDENCE' }),
        LOW: Object.freeze({ text: '#EA580C', bg: '#FFF7ED', label: 'LOW CONFIDENCE' }),
        UNAVAILABLE: Object.freeze({ text: '#64748B', bg: '#F8FAFC', label: 'UNAVAILABLE' })
    }),
    DIMENSIONS: Object.freeze({
        DIM_CONCENTRATION: '#6366F1', // Indigo
        DIM_VOLATILITY: '#EC4899',    // Pink
        DIM_CORRELATION: '#8B5CF6',   // Purple
        DIM_LIQUIDITY: '#06B6D4',     // Cyan
        DIM_STRESS: '#F43F5E'         // Rose
    })
});

/**
 * Formats a currency amount into standard Indian Rupee notation (e.g. ₹1,23,456.00).
 */
export function formatCurrencyINR(amount, includeDecimals = true) {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
    const val = Number(amount);
    const isNegative = val < 0;
    const absVal = Math.abs(val);

    const parts = absVal.toFixed(includeDecimals ? 2 : 0).split('.');
    let intPart = parts[0];
    const decPart = parts.length > 1 ? `.${parts[1]}` : '';

    // Indian comma formatting: last 3 digits, then groups of 2 digits
    let lastThree = intPart.substring(intPart.length - 3);
    const otherNumbers = intPart.substring(0, intPart.length - 3);
    if (otherNumbers !== '') {
        lastThree = ',' + lastThree;
    }
    const formattedInt = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

    return `${isNegative ? '-' : ''}₹${formattedInt}${includeDecimals ? decPart : ''}`;
}

/**
 * Formats a ratio [0.0, 1.0] into a percentage string (e.g. 15.4%).
 */
export function formatPercentage(ratio, decimals = 1) {
    if (ratio === null || ratio === undefined || isNaN(ratio)) return 'N/A';
    const pct = ratio * 100.0;
    return `${pct.toFixed(decimals)}%`;
}

/**
 * Formats a raw date ISO string into a human-readable format.
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
 * Formats a score [0.0, 100.0] to a fixed decimal representation.
 */
export function formatScore(score, decimals = 1) {
    if (score === null || score === undefined || isNaN(score)) return 'N/A';
    return Number(score).toFixed(decimals);
}

/**
 * Maps raw health grade to theme color tokens.
 */
export function getGradeTheme(grade) {
    if (!grade || !THEME_COLORS.GRADES[grade]) {
        return THEME_COLORS.GRADES.F;
    }
    return THEME_COLORS.GRADES[grade];
}

/**
 * Maps raw confidence level string to theme color tokens.
 */
export function getConfidenceTheme(confidenceLevel) {
    if (!confidenceLevel || !THEME_COLORS.CONFIDENCE[confidenceLevel]) {
        return THEME_COLORS.CONFIDENCE.UNAVAILABLE;
    }
    return THEME_COLORS.CONFIDENCE[confidenceLevel];
}

/**
 * Adapts C.7.7 Health DTO into the HealthScoreHeroCard ViewModel.
 */
export function adaptHealthHeroViewModel(healthDTO) {
    if (!healthDTO || typeof healthDTO !== 'object' || healthDTO.status === 'EMPTY_PORTFOLIO') {
        return {
            hasData: false,
            portfolioId: healthDTO?.portfolioId || null,
            asOfDateFormatted: formatDate(healthDTO?.asOfDate),
            healthScore: null,
            displayHealthScoreText: '—',
            healthGrade: null,
            healthStatusText: 'EMPTY PORTFOLIO',
            gradeTheme: THEME_COLORS.GRADES.F,
            confidenceTheme: THEME_COLORS.CONFIDENCE.UNAVAILABLE,
            imputationApplied: false,
            warningBannerText: 'No holdings found in portfolio.'
        };
    }

    const grade = healthDTO.healthGrade || 'F';
    const gradeTheme = getGradeTheme(grade);
    const confidenceTheme = getConfidenceTheme(healthDTO.dataQuality?.confidenceLevel);
    const isDegraded = healthDTO.status === 'DEGRADED' || healthDTO.dataQuality?.imputationApplied;

    return {
        hasData: healthDTO.healthScore !== null,
        portfolioId: healthDTO.portfolioId || null,
        asOfDateFormatted: formatDate(healthDTO.asOfDate),
        healthScore: healthDTO.healthScore,
        displayHealthScoreText: formatScore(healthDTO.displayHealthScore ?? healthDTO.healthScore, 1),
        healthGrade: grade,
        healthStatusText: healthDTO.healthStatus || gradeTheme.name,
        gradeTheme,
        confidenceTheme,
        imputationApplied: isDegraded,
        warningBannerText: isDegraded 
            ? 'Score contains conservative estimates for unprovided diagnostic modules.'
            : null
    };
}

/**
 * Adapts C.7.7 Dimensions into the RiskDimensionsCard ViewModel.
 */
export function adaptDimensionsViewModel(healthDTO) {
    if (!healthDTO?.dimensions || typeof healthDTO.dimensions !== 'object') {
        return [];
    }

    const dimensionEntries = [
        { key: 'concentration', title: 'Concentration & Diversification', id: 'DIM_CONCENTRATION' },
        { key: 'volatility', title: 'Downside Risk & Volatility', id: 'DIM_VOLATILITY' },
        { key: 'correlation', title: 'Correlation & Factor Risk', id: 'DIM_CORRELATION' },
        { key: 'liquidity', title: 'Liquidity & Cash Runway', id: 'DIM_LIQUIDITY' },
        { key: 'stress', title: 'Scenario Stress Resilience', id: 'DIM_STRESS' }
    ];

    return dimensionEntries.map(entry => {
        const dim = healthDTO.dimensions[entry.key];
        if (!dim) {
            return {
                id: entry.id,
                title: entry.title,
                score: 40.0,
                scoreFormatted: '40.0',
                weightPercent: '20%',
                progressRatio: 0.40,
                barColor: THEME_COLORS.DIMENSIONS[entry.id] || '#64748B',
                scoreSourceBadge: 'IMPUTED',
                isImputed: true,
                keyMetrics: []
            };
        }

        const score = typeof dim.score === 'number' ? dim.score : 40.0;
        const weightPct = `${Math.round((dim.weight || 0.20) * 100)}%`;
        const progressRatio = Math.max(0.0, Math.min(1.0, score / 100.0));
        const isImputed = dim.scoreSource === 'CONSERVATIVE_IMPUTATION';

        // Extract factual metric display strings
        const keyMetrics = [];
        const m = dim.sourceMetrics || {};

        if (entry.id === 'DIM_CONCENTRATION' && m.top1HoldingShare !== null && m.top1HoldingShare !== undefined) {
            keyMetrics.push(`Top-1 Share: ${formatPercentage(m.top1HoldingShare)}`);
            keyMetrics.push(`Asset HHI: ${Math.round(m.assetClassHHI || 0)}`);
        } else if (entry.id === 'DIM_VOLATILITY' && m.annualizedVolatility !== null && m.annualizedVolatility !== undefined) {
            keyMetrics.push(`Volatility: ${formatPercentage(m.annualizedVolatility)}`);
            keyMetrics.push(`Max Drawdown: ${formatPercentage(m.maxDrawdown)}`);
            if (m.cvar95 !== null) keyMetrics.push(`95% CVaR: ${formatPercentage(m.cvar95)}`);
        } else if (entry.id === 'DIM_CORRELATION' && m.meanPairwiseCorrelation !== null && m.meanPairwiseCorrelation !== undefined) {
            keyMetrics.push(`Mean Correlation: ${Number(m.meanPairwiseCorrelation).toFixed(2)}`);
            keyMetrics.push(`Dominant Factor: ${formatPercentage(m.pcaDominantFactorShare)}`);
        } else if (entry.id === 'DIM_LIQUIDITY' && m.accessibleRatio !== null && m.accessibleRatio !== undefined) {
            keyMetrics.push(`Emergency Runway: ${m.runwayMonths !== null ? `${Number(m.runwayMonths).toFixed(1)} mo` : 'Self-sustaining'}`);
            keyMetrics.push(`Accessible Capital: ${formatPercentage(m.accessibleRatio)}`);
        } else if (entry.id === 'DIM_STRESS' && m.worstCaseLossPercentage !== null && m.worstCaseLossPercentage !== undefined) {
            keyMetrics.push(`Worst-Case Loss: ${formatPercentage(m.worstCaseLossPercentage)}`);
            keyMetrics.push(`Scenario: ${m.worstCaseScenarioId || 'Standard'}`);
        }

        return {
            id: entry.id,
            title: entry.title,
            score,
            scoreFormatted: formatScore(score, 1),
            weightPercent: weightPct,
            progressRatio,
            barColor: THEME_COLORS.DIMENSIONS[entry.id] || '#64748B',
            scoreSourceBadge: isImputed ? 'CONSERVATIVE IMPUTATION' : (dim.scoreSource === 'NEUTRAL_FALLBACK' ? 'NEUTRAL' : 'CALCULATED'),
            isImputed,
            keyMetrics
        };
    });
}

/**
 * Adapts C.7.7 Risk Drivers and Strengths into the RiskDriversStrengthsCard ViewModel.
 */
export function adaptRiskDriversStrengthsViewModel(healthDTO) {
    const riskDrivers = Array.isArray(healthDTO?.riskDrivers) ? healthDTO.riskDrivers.map((d, index) => ({
        rank: d.rank || (index + 1),
        dimensionId: d.dimensionId,
        dimensionName: d.dimensionName || d.dimensionId.replace('DIM_', ''),
        deficitPointsFormatted: `${formatScore(d.deficit, 1)} pts deficit`,
        scoreFormatted: `${formatScore(d.score, 1)}/100`,
        explanationText: d.explanationText || ''
    })) : [];

    const strengths = Array.isArray(healthDTO?.strengths) ? healthDTO.strengths.map(s => ({
        dimensionId: s.dimensionId,
        dimensionName: s.dimensionName || s.dimensionId.replace('DIM_', ''),
        scoreFormatted: `${formatScore(s.score, 1)}/100`,
        strengthText: s.strengthText || ''
    })) : [];

    return {
        hasDrivers: riskDrivers.length > 0,
        riskDrivers,
        hasStrengths: strengths.length > 0,
        strengths
    };
}

/**
 * Adapts C.7.6 Scenario Stress DTO into the ScenarioStressVisualizerCard ViewModel.
 */
export function adaptScenarioStressViewModel(stressDTO, activeScenarioId = 'HIST_2008_GFC') {
    if (!stressDTO || typeof stressDTO !== 'object' || !stressDTO.scenarios) {
        return {
            hasData: false,
            availableScenarios: [],
            activeScenarioId: null,
            activeScenarioData: null,
            reverseStress: {
                lambda20Text: 'N/A',
                statusText: 'UNAVAILABLE',
                criticalVulnerability: 'None'
            }
        };
    }

    const availableScenarios = Object.values(stressDTO.scenarios).map(s => ({
        id: s.scenarioId,
        name: s.scenarioName,
        category: s.scenarioCategory
    }));

    const selectedId = stressDTO.scenarios[activeScenarioId] ? activeScenarioId : Object.keys(stressDTO.scenarios)[0];
    const sData = stressDTO.scenarios[selectedId];

    let activeScenarioData = null;
    if (sData) {
        const lossAttr = Array.isArray(sData.lossAttribution?.byAssetClass)
            ? sData.lossAttribution.byAssetClass
                .filter(c => c.dollarLoss > 0)
                .map(c => ({
                    assetClass: c.assetClass,
                    dollarLossFormatted: formatCurrencyINR(c.dollarLoss, false),
                    sharePercentFormatted: c.lossContributionShare !== null ? formatPercentage(c.lossContributionShare) : '—'
                }))
            : [];

        activeScenarioData = {
            id: sData.scenarioId,
            name: sData.scenarioName,
            category: sData.scenarioCategory,
            stressedValueFormatted: formatCurrencyINR(sData.stressedPortfolioValue, false),
            dollarLossFormatted: formatCurrencyINR(sData.dollarLoss, false),
            percentageLossFormatted: formatPercentage(sData.percentageLoss),
            postStressRunwayFormatted: sData.postStressRunwayMonths !== null ? `${Number(sData.postStressRunwayMonths).toFixed(1)} mo` : 'Self-sustaining',
            runwayCompressionFormatted: sData.runwayCompressionMonths !== null ? `${Number(sData.runwayCompressionMonths).toFixed(1)} mo compressed` : '0 mo',
            resilienceRating: sData.resilienceRating || 'MODERATE',
            lossAttribution: lossAttr,
            warnings: sData.warnings || []
        };
    }

    const rev20 = stressDTO.reverseStressTest?.marketDropToCause20PctLoss;
    const reverseStress = {
        lambda20Text: rev20?.solvedLambda !== null && rev20?.solvedLambda !== undefined ? `${(rev20.solvedLambda * 100).toFixed(1)}% of market shock` : (rev20?.status === 'UNREACHABLE_WITHIN_BOUNDS' ? 'Resilient (>300% shock required)' : 'N/A'),
        statusText: rev20?.status || 'UNAVAILABLE',
        criticalVulnerability: stressDTO.reverseStressTest?.criticalVulnerabilityFactor || 'Balanced'
    };

    return {
        hasData: true,
        availableScenarios,
        activeScenarioId: selectedId,
        activeScenarioData,
        reverseStress
    };
}

/**
 * Master Dashboard ViewModel Adapter combining all modules.
 */
export function adaptRiskDashboardViewModel(healthDTO, stressDTO, activeScenarioId = 'HIST_2008_GFC') {
    const hero = adaptHealthHeroViewModel(healthDTO);
    const dimensions = adaptDimensionsViewModel(healthDTO);
    const driversAndStrengths = adaptRiskDriversStrengthsViewModel(healthDTO);
    const stress = adaptScenarioStressViewModel(stressDTO, activeScenarioId);

    return {
        status: healthDTO?.status || 'EVALUATED',
        hero,
        dimensions,
        driversAndStrengths,
        stress,
        explanations: Array.isArray(healthDTO?.explanations) ? healthDTO.explanations : [],
        warnings: Array.isArray(healthDTO?.warnings) ? healthDTO.warnings : []
    };
}
