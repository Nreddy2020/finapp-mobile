/**
 * Portfolio Health Score & Risk Explanation Engine (Stage C.7.7)
 * Master Architectural Standard: C7_7_V1
 * 
 * Provides deterministic, pure read-only multi-dimensional synthesis,
 * holistic scoring (0-100), institutional health grading (A-F),
 * deficit-based primary risk-driver attribution, factual explanation generation,
 * and upstream confidence propagation across certified engines C.7.1–C.7.6.
 * 
 * STRICT INVARIANTS:
 * 1. 100% Read-Only: Zero state mutations across holdings, events, quotes, txs, wallets.
 * 2. 100% Deterministic: Mandatory asOfDate on all entry points. Zero wall-clock Date calls.
 * 3. Principle: "Calculate once. Authoritatively. Score once. Explain once."
 *    Never recalculates or reinterprets any raw financial metrics from C.7.1–C.7.6.
 * 4. 5-Dimensional Scoring Model: Concentration (20%), Volatility (20%), Correlation (15%),
 *    Liquidity (25%), Stress Resilience (20%).
 * 5. Grade from Unrounded Score: Display rounding (2 decimals) applied strictly after grading.
 * 6. Confidence Isolation: Data confidence is 100% isolated from numerical score calculation.
 * 7. Factual Explanation Provenance: Never invents subjective or behavioral assumptions.
 */

export const HEALTH_SCORE_POLICY_VERSION = "C7_7_V1";

export const HEALTH_STATUS = Object.freeze({
    EXCELLENT: 'EXCELLENT',
    GOOD: 'GOOD',
    FAIR: 'FAIR',
    VULNERABLE: 'VULNERABLE',
    CRITICAL: 'CRITICAL',
    EMPTY_PORTFOLIO: 'EMPTY_PORTFOLIO',
    INSUFFICIENT_DATA: 'INSUFFICIENT_DATA',
    DEGRADED: 'DEGRADED',
    EVALUATED: 'EVALUATED'
});

export const SCORE_SOURCES = Object.freeze({
    CALCULATED: 'CALCULATED',
    CONSERVATIVE_IMPUTATION: 'CONSERVATIVE_IMPUTATION',
    NEUTRAL_FALLBACK: 'NEUTRAL_FALLBACK'
});

export const HEALTH_SCORE_POLICY_V1 = Object.freeze({
    policyVersion: HEALTH_SCORE_POLICY_VERSION,
    dimensionWeights: Object.freeze({
        DIM_CONCENTRATION: 0.20,
        DIM_VOLATILITY: 0.20,
        DIM_CORRELATION: 0.15,
        DIM_LIQUIDITY: 0.25,
        DIM_STRESS: 0.20
    }),
    subMetricWeights: Object.freeze({
        DIM_CONCENTRATION: Object.freeze({
            assetHHI: 0.30,
            sectorHHI: 0.20,
            top1Share: 0.30,
            top3Share: 0.20
        }),
        DIM_VOLATILITY: Object.freeze({
            annualizedVolatility: 0.40,
            maxDrawdown: 0.35,
            cvar95: 0.25
        }),
        DIM_CORRELATION: Object.freeze({
            meanPairwiseCorrelation: 0.50,
            pcaDominantFactorShare: 0.50
        }),
        DIM_LIQUIDITY: Object.freeze({
            runwayMonths: 0.40,
            accessibleRatio: 0.30,
            c75LiquidityScore: 0.30
        }),
        DIM_STRESS: Object.freeze({
            worstCaseLossPercentage: 0.40,
            runwayCompressionMonths: 0.30,
            reverseStressLambda20: 0.30
        })
    }),
    thresholds: Object.freeze({
        CONCENTRATION: Object.freeze({
            HHI_BENCHMARK_MIN: 1500,
            HHI_BENCHMARK_MAX: 10000,
            TOP1_MIN: 0.15,
            TOP1_MAX: 0.75,
            TOP3_MIN: 0.35,
            TOP3_MAX: 0.90
        }),
        VOLATILITY: Object.freeze({
            VOL_MIN: 0.08,
            VOL_MAX: 0.40,
            MDD_MIN: 0.10,
            MDD_MAX: 0.50,
            CVAR_MIN: 0.03,
            CVAR_MAX: 0.15
        }),
        CORRELATION: Object.freeze({
            RHO_MIN: 0.20,
            RHO_MAX: 0.80,
            PCA_MIN: 0.40,
            PCA_MAX: 0.90
        }),
        LIQUIDITY: Object.freeze({
            RUNWAY_TARGET_MONTHS: 12.0
        }),
        STRESS: Object.freeze({
            WORST_LOSS_MIN: 0.10,
            WORST_LOSS_MAX: 0.45,
            MAX_COMPRESSION_MONTHS: 6.0,
            REVERSE_LAMBDA_TARGET: 2.0
        }),
        IMPUTATION: Object.freeze({
            CONSERVATIVE_DIMENSION_SCORE: 40.0
        })
    }),
    gradeBoundaries: Object.freeze({
        A_MIN: 85.0,
        B_MIN: 70.0,
        C_MIN: 50.0,
        D_MIN: 30.0
    })
});

/**
 * Normalizes an ISO date string deterministically.
 */
function normalizeDateISO(dateInput, paramName = 'asOfDate') {
    if (!dateInput) {
        throw new Error(`[HEALTH_ENGINE] Missing mandatory deterministic parameter: ${paramName}`);
    }
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) {
        throw new Error(`[HEALTH_ENGINE] Invalid ${paramName} timestamp: ${dateInput}`);
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
 * Evaluates the Concentration & Diversification Dimension Score (DIM_CONCENTRATION).
 */
export function evaluateConcentrationDimension(concentrationDTO, policy = HEALTH_SCORE_POLICY_V1) {
    if (!concentrationDTO || typeof concentrationDTO !== 'object') {
        return {
            dimensionId: 'DIM_CONCENTRATION',
            score: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE,
            weight: policy.dimensionWeights.DIM_CONCENTRATION,
            weightedContribution: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE * policy.dimensionWeights.DIM_CONCENTRATION,
            scoreSource: SCORE_SOURCES.CONSERVATIVE_IMPUTATION,
            subScores: { assetHHI: 40.0, sectorHHI: 40.0, top1Share: 40.0, top3Share: 40.0 },
            sourceMetrics: { assetClassHHI: null, sectorHHI: null, top1HoldingShare: null, top3HoldingShare: null },
            isMissing: true
        };
    }

    const t = policy.thresholds.CONCENTRATION;
    const w = policy.subMetricWeights.DIM_CONCENTRATION;

    const assetHHI = typeof concentrationDTO.assetClassHHI === 'number' ? concentrationDTO.assetClassHHI : (concentrationDTO.hhi || 2500);
    const sectorHHI = typeof concentrationDTO.sectorHHI === 'number' ? concentrationDTO.sectorHHI : assetHHI;
    
    // Top holding shares
    let top1Share = 0.0;
    let top3Share = 0.0;
    if (Array.isArray(concentrationDTO.holdingsConcentration)) {
        top1Share = concentrationDTO.holdingsConcentration[0]?.weight || 0.0;
        top3Share = concentrationDTO.holdingsConcentration.slice(0, 3).reduce((sum, h) => sum + (h.weight || 0.0), 0.0);
    } else if (typeof concentrationDTO.top1HoldingShare === 'number') {
        top1Share = concentrationDTO.top1HoldingShare;
        top3Share = typeof concentrationDTO.top3HoldingShare === 'number' ? concentrationDTO.top3HoldingShare : top1Share;
    }

    const sAssetHHI = clamp(100.0 - (Math.max(0, assetHHI - t.HHI_BENCHMARK_MIN) / (t.HHI_BENCHMARK_MAX - t.HHI_BENCHMARK_MIN)) * 100.0, 0.0, 100.0);
    const sSectorHHI = clamp(100.0 - (Math.max(0, sectorHHI - t.HHI_BENCHMARK_MIN) / (t.HHI_BENCHMARK_MAX - t.HHI_BENCHMARK_MIN)) * 100.0, 0.0, 100.0);
    const sTop1 = clamp(100.0 - (Math.max(0, top1Share - t.TOP1_MIN) / (t.TOP1_MAX - t.TOP1_MIN)) * 100.0, 0.0, 100.0);
    const sTop3 = clamp(100.0 - (Math.max(0, top3Share - t.TOP3_MIN) / (t.TOP3_MAX - t.TOP3_MIN)) * 100.0, 0.0, 100.0);

    const score = (w.assetHHI * sAssetHHI) + (w.sectorHHI * sSectorHHI) + (w.top1Share * sTop1) + (w.top3Share * sTop3);
    const weight = policy.dimensionWeights.DIM_CONCENTRATION;

    return {
        dimensionId: 'DIM_CONCENTRATION',
        score,
        weight,
        weightedContribution: score * weight,
        scoreSource: SCORE_SOURCES.CALCULATED,
        subScores: {
            assetHHI: sAssetHHI,
            sectorHHI: sSectorHHI,
            top1Share: sTop1,
            top3Share: sTop3
        },
        sourceMetrics: {
            assetClassHHI: assetHHI,
            sectorHHI: sectorHHI,
            top1HoldingShare: top1Share,
            top3HoldingShare: top3Share
        },
        isMissing: false
    };
}

/**
 * Evaluates the Downside Risk & Volatility Dimension Score (DIM_VOLATILITY).
 */
export function evaluateVolatilityDimension(volatilityDTO, policy = HEALTH_SCORE_POLICY_V1) {
    if (!volatilityDTO || typeof volatilityDTO !== 'object') {
        return {
            dimensionId: 'DIM_VOLATILITY',
            score: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE,
            weight: policy.dimensionWeights.DIM_VOLATILITY,
            weightedContribution: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE * policy.dimensionWeights.DIM_VOLATILITY,
            scoreSource: SCORE_SOURCES.CONSERVATIVE_IMPUTATION,
            subScores: { annualizedVolatility: 40.0, maxDrawdown: 40.0, cvar95: null },
            sourceMetrics: { annualizedVolatility: null, maxDrawdown: null, cvar95: null },
            isMissing: true
        };
    }

    const t = policy.thresholds.VOLATILITY;
    const w = policy.subMetricWeights.DIM_VOLATILITY;

    const vol = typeof volatilityDTO.annualizedVolatility === 'number' ? volatilityDTO.annualizedVolatility : 0.15;
    const mdd = typeof volatilityDTO.maxDrawdown === 'number' ? Math.abs(volatilityDTO.maxDrawdown) : 0.15;
    const cvar = (typeof volatilityDTO.cvar95 === 'number' && !isNaN(volatilityDTO.cvar95)) 
        ? Math.abs(volatilityDTO.cvar95) 
        : (typeof volatilityDTO.historicalCVaR === 'number' ? Math.abs(volatilityDTO.historicalCVaR) : null);

    const sVol = clamp(100.0 - (Math.max(0, vol - t.VOL_MIN) / (t.VOL_MAX - t.VOL_MIN)) * 100.0, 0.0, 100.0);
    const sMDD = clamp(100.0 - (Math.max(0, mdd - t.MDD_MIN) / (t.MDD_MAX - t.MDD_MIN)) * 100.0, 0.0, 100.0);

    let sCVaR = null;
    let score = 0.0;

    if (cvar !== null) {
        sCVaR = clamp(100.0 - (Math.max(0, cvar - t.CVAR_MIN) / (t.CVAR_MAX - t.CVAR_MIN)) * 100.0, 0.0, 100.0);
        score = (w.annualizedVolatility * sVol) + (w.maxDrawdown * sMDD) + (w.cvar95 * sCVaR);
    } else {
        // Dynamic sub-metric reweighting across available metrics (vol and MDD)
        const totalW = w.annualizedVolatility + w.maxDrawdown; // 0.40 + 0.35 = 0.75
        const wVolNorm = w.annualizedVolatility / totalW;
        const wMDDNorm = w.maxDrawdown / totalW;
        score = (wVolNorm * sVol) + (wMDDNorm * sMDD);
    }

    const weight = policy.dimensionWeights.DIM_VOLATILITY;

    return {
        dimensionId: 'DIM_VOLATILITY',
        score,
        weight,
        weightedContribution: score * weight,
        scoreSource: SCORE_SOURCES.CALCULATED,
        subScores: {
            annualizedVolatility: sVol,
            maxDrawdown: sMDD,
            cvar95: sCVaR
        },
        sourceMetrics: {
            annualizedVolatility: vol,
            maxDrawdown: mdd,
            cvar95: cvar
        },
        isMissing: false
    };
}

/**
 * Evaluates the Correlation & Factor Risk Dimension Score (DIM_CORRELATION).
 */
export function evaluateCorrelationDimension(correlationDTO, holdingCount = 2, policy = HEALTH_SCORE_POLICY_V1) {
    if (!correlationDTO || typeof correlationDTO !== 'object') {
        return {
            dimensionId: 'DIM_CORRELATION',
            score: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE,
            weight: policy.dimensionWeights.DIM_CORRELATION,
            weightedContribution: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE * policy.dimensionWeights.DIM_CORRELATION,
            scoreSource: SCORE_SOURCES.CONSERVATIVE_IMPUTATION,
            subScores: { meanPairwiseCorrelation: 40.0, pcaDominantFactorShare: 40.0 },
            sourceMetrics: { meanPairwiseCorrelation: null, pcaDominantFactorShare: null },
            isMissing: true
        };
    }

    if (holdingCount < 2) {
        const weight = policy.dimensionWeights.DIM_CORRELATION;
        return {
            dimensionId: 'DIM_CORRELATION',
            score: 50.0,
            weight,
            weightedContribution: 50.0 * weight,
            scoreSource: SCORE_SOURCES.NEUTRAL_FALLBACK,
            subScores: { meanPairwiseCorrelation: 50.0, pcaDominantFactorShare: 50.0 },
            sourceMetrics: { meanPairwiseCorrelation: 0.0, pcaDominantFactorShare: 1.0 },
            isMissing: false
        };
    }

    const t = policy.thresholds.CORRELATION;
    const w = policy.subMetricWeights.DIM_CORRELATION;

    const rho = typeof correlationDTO.meanPairwiseCorrelation === 'number' ? correlationDTO.meanPairwiseCorrelation : 0.40;
    const pca = typeof correlationDTO.dominantFactorShare === 'number' ? correlationDTO.dominantFactorShare : (typeof correlationDTO.pcaDominantFactorShare === 'number' ? correlationDTO.pcaDominantFactorShare : 0.50);

    const sRho = clamp(100.0 - (Math.max(0, rho - t.RHO_MIN) / (t.RHO_MAX - t.RHO_MIN)) * 100.0, 0.0, 100.0);
    const sPCA = clamp(100.0 - (Math.max(0, pca - t.PCA_MIN) / (t.PCA_MAX - t.PCA_MIN)) * 100.0, 0.0, 100.0);

    const score = (w.meanPairwiseCorrelation * sRho) + (w.pcaDominantFactorShare * sPCA);
    const weight = policy.dimensionWeights.DIM_CORRELATION;

    return {
        dimensionId: 'DIM_CORRELATION',
        score,
        weight,
        weightedContribution: score * weight,
        scoreSource: SCORE_SOURCES.CALCULATED,
        subScores: {
            meanPairwiseCorrelation: sRho,
            pcaDominantFactorShare: sPCA
        },
        sourceMetrics: {
            meanPairwiseCorrelation: rho,
            pcaDominantFactorShare: pca
        },
        isMissing: false
    };
}

/**
 * Evaluates the Liquidity & Cash Runway Dimension Score (DIM_LIQUIDITY).
 */
export function evaluateLiquidityDimension(liquidityDTO, cashFlowDTO, policy = HEALTH_SCORE_POLICY_V1) {
    if (!liquidityDTO || typeof liquidityDTO !== 'object') {
        return {
            dimensionId: 'DIM_LIQUIDITY',
            score: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE,
            weight: policy.dimensionWeights.DIM_LIQUIDITY,
            weightedContribution: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE * policy.dimensionWeights.DIM_LIQUIDITY,
            scoreSource: SCORE_SOURCES.CONSERVATIVE_IMPUTATION,
            subScores: { runwayMonths: 40.0, accessibleRatio: 40.0, c75LiquidityScore: 40.0 },
            sourceMetrics: { runwayMonths: null, accessibleRatio: null, c75LiquidityScore: null },
            isMissing: true
        };
    }

    const t = policy.thresholds.LIQUIDITY;
    const w = policy.subMetricWeights.DIM_LIQUIDITY;

    const runway = (cashFlowDTO && typeof cashFlowDTO.runwayMonths === 'number') 
        ? cashFlowDTO.runwayMonths 
        : (liquidityDTO.runway?.totalMonths ?? (typeof liquidityDTO.baselineRunwayMonths === 'number' ? liquidityDTO.baselineRunwayMonths : null));

    const grossVal = typeof liquidityDTO.grossPortfolioValue === 'number' ? liquidityDTO.grossPortfolioValue : 1.0;
    const accessibleVal = typeof liquidityDTO.accessibleValue === 'number' ? liquidityDTO.accessibleValue : (typeof liquidityDTO.accessibleLiquidity === 'number' ? liquidityDTO.accessibleLiquidity : grossVal);
    const accessibleRatio = grossVal > 0 ? clamp(accessibleVal / grossVal, 0.0, 1.0) : 1.0;

    const c75Score = typeof liquidityDTO.compositeScore === 'number' 
        ? liquidityDTO.compositeScore 
        : (typeof liquidityDTO.liquidityScore === 'number' ? liquidityDTO.liquidityScore : (accessibleRatio * 100.0));

    let sRunway = 100.0;
    if (runway !== null) {
        sRunway = runway >= t.RUNWAY_TARGET_MONTHS ? 100.0 : clamp((runway / t.RUNWAY_TARGET_MONTHS) * 100.0, 0.0, 100.0);
    }

    const sAccessible = clamp(accessibleRatio * 100.0, 0.0, 100.0);
    const sC75 = clamp(c75Score, 0.0, 100.0);

    const score = (w.runwayMonths * sRunway) + (w.accessibleRatio * sAccessible) + (w.c75LiquidityScore * sC75);
    const weight = policy.dimensionWeights.DIM_LIQUIDITY;

    return {
        dimensionId: 'DIM_LIQUIDITY',
        score,
        weight,
        weightedContribution: score * weight,
        scoreSource: SCORE_SOURCES.CALCULATED,
        subScores: {
            runwayMonths: sRunway,
            accessibleRatio: sAccessible,
            c75LiquidityScore: sC75
        },
        sourceMetrics: {
            runwayMonths: runway,
            accessibleRatio,
            c75LiquidityScore: c75Score
        },
        isMissing: false
    };
}

/**
 * Evaluates the Stress & Scenario Resilience Dimension Score (DIM_STRESS).
 */
export function evaluateStressDimension(stressDTO, policy = HEALTH_SCORE_POLICY_V1) {
    if (!stressDTO || typeof stressDTO !== 'object') {
        return {
            dimensionId: 'DIM_STRESS',
            score: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE,
            weight: policy.dimensionWeights.DIM_STRESS,
            weightedContribution: policy.thresholds.IMPUTATION.CONSERVATIVE_DIMENSION_SCORE * policy.dimensionWeights.DIM_STRESS,
            scoreSource: SCORE_SOURCES.CONSERVATIVE_IMPUTATION,
            subScores: { worstCaseLossPercentage: 40.0, runwayCompressionMonths: 40.0, reverseStressLambda20: 40.0 },
            sourceMetrics: { worstCaseScenarioId: null, worstCaseLossPercentage: null, runwayCompressionMonths: null, reverseStressLambda20: null, reverseStressStatus: 'UNAVAILABLE' },
            isMissing: true
        };
    }

    const t = policy.thresholds.STRESS;
    const w = policy.subMetricWeights.DIM_STRESS;

    const worstLoss = typeof stressDTO.resilienceSummary?.worstCasePercentageLoss === 'number' 
        ? Math.abs(stressDTO.resilienceSummary.worstCasePercentageLoss) 
        : (typeof stressDTO.worstCaseLossPercentage === 'number' ? Math.abs(stressDTO.worstCaseLossPercentage) : 0.25);

    const worstScenarioId = stressDTO.resilienceSummary?.worstCaseScenarioId || stressDTO.worstCaseScenarioId || 'UNKNOWN';

    // Compute max runway compression across scenarios
    let maxCompression = 0.0;
    if (stressDTO.scenarios && typeof stressDTO.scenarios === 'object') {
        for (const s of Object.values(stressDTO.scenarios)) {
            if (typeof s.runwayCompressionMonths === 'number' && s.runwayCompressionMonths > maxCompression) {
                maxCompression = s.runwayCompressionMonths;
            }
        }
    } else if (typeof stressDTO.runwayCompressionMonths === 'number') {
        maxCompression = stressDTO.runwayCompressionMonths;
    }

    // Reverse stress lambda 20
    const rev20Obj = stressDTO.reverseStressTest?.marketDropToCause20PctLoss;
    const lambda20 = rev20Obj ? rev20Obj.solvedLambda : (typeof stressDTO.reverseStressLambda20 === 'number' ? stressDTO.reverseStressLambda20 : null);
    const revStatus = rev20Obj ? rev20Obj.status : (stressDTO.reverseStressStatus || 'SOLVED');

    const sLoss = clamp(100.0 - (Math.max(0, worstLoss - t.WORST_LOSS_MIN) / (t.WORST_LOSS_MAX - t.WORST_LOSS_MIN)) * 100.0, 0.0, 100.0);
    const sComp = clamp(100.0 - (Math.max(0, maxCompression) / t.MAX_COMPRESSION_MONTHS) * 100.0, 0.0, 100.0);

    let sRev = 0.0;
    if (revStatus === 'UNREACHABLE_WITHIN_BOUNDS' || revStatus === 'ZERO_TARGET') {
        sRev = 100.0;
    } else if (revStatus === 'INVALID_TARGET') {
        sRev = 0.0;
    } else if (lambda20 !== null) {
        sRev = clamp((lambda20 / t.REVERSE_LAMBDA_TARGET) * 100.0, 0.0, 100.0);
    } else {
        sRev = 50.0;
    }

    const score = (w.worstCaseLossPercentage * sLoss) + (w.runwayCompressionMonths * sComp) + (w.reverseStressLambda20 * sRev);
    const weight = policy.dimensionWeights.DIM_STRESS;

    return {
        dimensionId: 'DIM_STRESS',
        score,
        weight,
        weightedContribution: score * weight,
        scoreSource: SCORE_SOURCES.CALCULATED,
        subScores: {
            worstCaseLossPercentage: sLoss,
            runwayCompressionMonths: sComp,
            reverseStressLambda20: sRev
        },
        sourceMetrics: {
            worstCaseScenarioId: worstScenarioId,
            worstCaseLossPercentage: worstLoss,
            runwayCompressionMonths: maxCompression,
            reverseStressLambda20: lambda20,
            reverseStressStatus: revStatus
        },
        isMissing: false
    };
}

/**
 * Assigns an institutional health grade strictly from the unrounded score.
 */
export function assignHealthGrade(unroundedScore, policy = HEALTH_SCORE_POLICY_V1) {
    if (unroundedScore === null || isNaN(unroundedScore)) return null;
    const b = policy.gradeBoundaries;
    if (unroundedScore >= b.A_MIN) return 'A';
    if (unroundedScore >= b.B_MIN) return 'B';
    if (unroundedScore >= b.C_MIN) return 'C';
    if (unroundedScore >= b.D_MIN) return 'D';
    return 'F';
}

/**
 * Maps a health grade to its descriptive status category.
 */
export function mapGradeToStatus(grade) {
    switch (grade) {
        case 'A': return HEALTH_STATUS.EXCELLENT;
        case 'B': return HEALTH_STATUS.GOOD;
        case 'C': return HEALTH_STATUS.FAIR;
        case 'D': return HEALTH_STATUS.VULNERABLE;
        case 'F': return HEALTH_STATUS.CRITICAL;
        default: return HEALTH_STATUS.INSUFFICIENT_DATA;
    }
}

/**
 * Synthesizes deterministic, factual plain-English explanations from upstream metric numbers.
 */
export function synthesizeDimensionExplanation(dim) {
    const dId = dim.dimensionId;
    const m = dim.sourceMetrics;
    const scoreFormatted = (Math.round(dim.score * 10) / 10).toFixed(1);

    if (dim.scoreSource === SCORE_SOURCES.CONSERVATIVE_IMPUTATION) {
        return `Dimension score imputed at conservative fallback (${scoreFormatted}/100) due to unprovided upstream diagnostic engine.`;
    }
    if (dim.scoreSource === SCORE_SOURCES.NEUTRAL_FALLBACK) {
        return `Single holding portfolio evaluated at neutral correlation score (${scoreFormatted}/100).`;
    }

    switch (dId) {
        case 'DIM_CONCENTRATION': {
            const top1Pct = (m.top1HoldingShare * 100).toFixed(1);
            return `Concentration score ${scoreFormatted}/100: Top holding represents ${top1Pct}% of portfolio (Asset HHI: ${Math.round(m.assetClassHHI)}).`;
        }
        case 'DIM_VOLATILITY': {
            const volPct = (m.annualizedVolatility * 100).toFixed(1);
            const mddPct = (m.maxDrawdown * 100).toFixed(1);
            return `Downside risk score ${scoreFormatted}/100: Annualized volatility is ${volPct}% with max historical drawdown of ${mddPct}%.`;
        }
        case 'DIM_CORRELATION': {
            const rho = m.meanPairwiseCorrelation.toFixed(2);
            const pcaPct = (m.pcaDominantFactorShare * 100).toFixed(1);
            return `Correlation & factor score ${scoreFormatted}/100: Mean pairwise correlation is ${rho} with dominant factor share of ${pcaPct}%.`;
        }
        case 'DIM_LIQUIDITY': {
            const runwayTxt = m.runwayMonths !== null ? `${m.runwayMonths.toFixed(1)} months` : 'Self-sustaining';
            const accPct = (m.accessibleRatio * 100).toFixed(1);
            return `Liquidity score ${scoreFormatted}/100: Emergency runway is ${runwayTxt} with ${accPct}% accessible capital.`;
        }
        case 'DIM_STRESS': {
            const lossPct = (m.worstCaseLossPercentage * 100).toFixed(1);
            const scName = m.worstCaseScenarioId || 'Worst-case stress';
            return `Stress resilience score ${scoreFormatted}/100: Projected loss of ${lossPct}% under ${scName}.`;
        }
        default:
            return `Dimension score: ${scoreFormatted}/100.`;
    }
}

/**
 * Master API: Evaluates the holistic Portfolio Health Score, 5 orthogonal dimensions,
 * ranked primary risk drivers, key strengths, factual explanations, and data quality propagation.
 */
export function evaluatePortfolioHealthScore(diagnosticInputs = {}, asOfDate, options = {}) {
    const asOfISO = normalizeDateISO(asOfDate, 'asOfDate');
    const policy = options.policy || HEALTH_SCORE_POLICY_V1;
    const portfolioId = diagnosticInputs.portfolioId || null;

    const holdings = Array.isArray(diagnosticInputs.holdings) ? diagnosticInputs.holdings : [];
    const concentrationDTO = diagnosticInputs.concentration || diagnosticInputs.concentrationDTO || null;
    const volatilityDTO = diagnosticInputs.volatility || diagnosticInputs.volatilityDTO || null;
    const correlationDTO = diagnosticInputs.correlation || diagnosticInputs.correlationDTO || null;
    const liquidityDTO = diagnosticInputs.liquidity || diagnosticInputs.liquidityDTO || null;
    const cashFlowDTO = diagnosticInputs.cashFlow || diagnosticInputs.cashFlowDTO || null;
    const stressDTO = diagnosticInputs.stress || diagnosticInputs.stressDTO || null;

    // 1. EMPTY PORTFOLIO BOUNDARY
    if (holdings.length === 0 && !concentrationDTO && !volatilityDTO && !liquidityDTO && !stressDTO) {
        return {
            portfolioId,
            asOfDate: asOfISO,
            policyVersion: policy.policyVersion,
            status: HEALTH_STATUS.EMPTY_PORTFOLIO,
            healthScore: null,
            displayHealthScore: null,
            healthGrade: null,
            healthStatus: HEALTH_STATUS.EMPTY_PORTFOLIO,
            dataQuality: {
                confidenceLevel: 'UNAVAILABLE',
                coverageRatio: 0.0,
                imputationApplied: false,
                missingEngines: ['CONCENTRATION', 'VOLATILITY', 'CORRELATION', 'LIQUIDITY', 'STRESS'],
                upstreamConfidenceSummary: {
                    concentrationConfidence: 'UNAVAILABLE',
                    volatilityConfidence: 'UNAVAILABLE',
                    correlationConfidence: 'UNAVAILABLE',
                    liquidityConfidence: 'UNAVAILABLE',
                    scenarioStressConfidence: 'UNAVAILABLE'
                }
            },
            dimensions: {},
            riskDrivers: [],
            strengths: [],
            explanations: ['Portfolio is empty; no assets available for risk evaluation.'],
            warnings: ['EMPTY_PORTFOLIO']
        };
    }

    // 2. EVALUATE ALL 5 ORTHOGONAL DIMENSIONS
    const dimConc = evaluateConcentrationDimension(concentrationDTO, policy);
    const dimVol = evaluateVolatilityDimension(volatilityDTO, policy);
    const dimCorr = evaluateCorrelationDimension(correlationDTO, holdings.length, policy);
    const dimLiq = evaluateLiquidityDimension(liquidityDTO, cashFlowDTO, policy);
    const dimStress = evaluateStressDimension(stressDTO, policy);

    const dimensionsList = [dimConc, dimVol, dimCorr, dimLiq, dimStress];

    // Check missing engines threshold
    const missingEngines = [];
    if (dimConc.isMissing) missingEngines.push('CONCENTRATION');
    if (dimVol.isMissing) missingEngines.push('VOLATILITY');
    if (dimCorr.isMissing) missingEngines.push('CORRELATION');
    if (dimLiq.isMissing) missingEngines.push('LIQUIDITY');
    if (dimStress.isMissing) missingEngines.push('STRESS');

    const imputationApplied = missingEngines.length > 0;

    // 3. INSUFFICIENT DATA THRESHOLD (>= 2 missing engines)
    if (missingEngines.length >= 2) {
        return {
            portfolioId,
            asOfDate: asOfISO,
            policyVersion: policy.policyVersion,
            status: HEALTH_STATUS.INSUFFICIENT_DATA,
            healthScore: null,
            displayHealthScore: null,
            healthGrade: null,
            healthStatus: HEALTH_STATUS.INSUFFICIENT_DATA,
            dataQuality: {
                confidenceLevel: 'UNAVAILABLE',
                coverageRatio: 0.0,
                imputationApplied: true,
                missingEngines,
                upstreamConfidenceSummary: {
                    concentrationConfidence: dimConc.isMissing ? 'UNAVAILABLE' : 'HIGH',
                    volatilityConfidence: dimVol.isMissing ? 'UNAVAILABLE' : 'HIGH',
                    correlationConfidence: dimCorr.isMissing ? 'UNAVAILABLE' : 'HIGH',
                    liquidityConfidence: dimLiq.isMissing ? 'UNAVAILABLE' : 'HIGH',
                    scenarioStressConfidence: dimStress.isMissing ? 'UNAVAILABLE' : 'HIGH'
                }
            },
            dimensions: {
                concentration: dimConc,
                volatility: dimVol,
                correlation: dimCorr,
                liquidity: dimLiq,
                stress: dimStress
            },
            riskDrivers: [],
            strengths: [],
            explanations: ['Insufficient diagnostic data: two or more risk engines are unavailable.'],
            warnings: ['INSUFFICIENT_DIAGNOSTIC_DATA']
        };
    }

    // 4. COMPOSITE HEALTH SCORE CALCULATION
    const unroundedHealthScore = dimensionsList.reduce((sum, dim) => sum + dim.weightedContribution, 0.0);
    const clampedHealthScore = clamp(unroundedHealthScore, 0.0, 100.0);

    // 5. GRADE CLASSIFICATION FROM UNROUNDED SCORE
    const healthGrade = assignHealthGrade(clampedHealthScore, policy);
    const healthStatus = mapGradeToStatus(healthGrade);

    // 6. DISPLAY SCORE (2-decimal presentation rounding AFTER grade assignment)
    const displayHealthScore = Math.round(clampedHealthScore * 100) / 100;

    // 7. PRIMARY RISK DRIVERS RANKING (Deficit Model)
    // Deficit: Delta S_d = (100 - S_d) * W_d > 0. Sorted by Delta S_d DESC -> S_d ASC -> dimensionId ASC
    const rankedDrivers = dimensionsList
        .filter(dim => (100.0 - dim.score) * dim.weight > 0.0)
        .map(dim => {
            const deficit = (100.0 - dim.score) * dim.weight;
            return {
                dimensionId: dim.dimensionId,
                dimensionName: dim.dimensionId.replace('DIM_', ''),
                score: Math.round(dim.score * 100) / 100,
                deficit: Math.round(deficit * 100) / 100,
                explanationText: synthesizeDimensionExplanation(dim)
            };
        })
        .sort((a, b) => {
            if (b.deficit !== a.deficit) return b.deficit - a.deficit;
            if (a.score !== b.score) return a.score - b.score;
            return a.dimensionId.localeCompare(b.dimensionId);
        })
        .slice(0, 3)
        .map((d, idx) => ({ ...d, rank: idx + 1 }));

    // 8. KEY STRENGTHS IDENTIFICATION (Score >= 80.0)
    const strengths = dimensionsList
        .filter(dim => dim.score >= 80.0)
        .sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.dimensionId.localeCompare(b.dimensionId);
        })
        .map(dim => ({
            dimensionId: dim.dimensionId,
            dimensionName: dim.dimensionId.replace('DIM_', ''),
            score: Math.round(dim.score * 100) / 100,
            strengthText: synthesizeDimensionExplanation(dim)
        }));

    // 9. EXPLANATIONS SUMMARY
    const explanations = [];
    if (rankedDrivers.length > 0) {
        explanations.push(`Primary risk driver: ${rankedDrivers[0].dimensionName} (deficit of ${rankedDrivers[0].deficit.toFixed(2)} pts).`);
    }
    if (strengths.length > 0) {
        explanations.push(`Key pillar of strength: ${strengths[0].dimensionName} (score ${strengths[0].score.toFixed(1)}/100).`);
    }

    // 10. DATA QUALITY PROPAGATION (Isolated from numerical health score)
    let confidenceLevel = 'HIGH';
    if (imputationApplied) {
        confidenceLevel = 'LOW';
    } else if (
        concentrationDTO?.dataQuality?.confidenceLevel === 'MODERATE' ||
        volatilityDTO?.dataQuality?.confidenceLevel === 'MODERATE' ||
        liquidityDTO?.dataQuality?.confidenceLevel === 'MODERATE' ||
        stressDTO?.dataQuality?.confidenceLevel === 'MODERATE'
    ) {
        confidenceLevel = 'MODERATE';
    }

    const coverageRatio = concentrationDTO?.dataQuality?.coverageRatio ?? (liquidityDTO?.dataQuality?.coverageRatio ?? 1.0);

    const warnings = [];
    if (imputationApplied) {
        warnings.push(`CONSERVATIVE_IMPUTATION_APPLIED_FOR_${missingEngines.join('_')}`);
    }
    if (clampedHealthScore < 30.0) {
        warnings.push('CRITICAL_PORTFOLIO_HEALTH_RISK');
    }

    return {
        portfolioId,
        asOfDate: asOfISO,
        policyVersion: policy.policyVersion,
        status: imputationApplied ? HEALTH_STATUS.DEGRADED : HEALTH_STATUS.EVALUATED,
        healthScore: clampedHealthScore,
        displayHealthScore,
        healthGrade,
        healthStatus,
        dataQuality: {
            confidenceLevel,
            coverageRatio,
            imputationApplied,
            missingEngines,
            upstreamConfidenceSummary: {
                concentrationConfidence: concentrationDTO?.dataQuality?.confidenceLevel || (dimConc.isMissing ? 'UNAVAILABLE' : 'HIGH'),
                volatilityConfidence: volatilityDTO?.dataQuality?.confidenceLevel || (dimVol.isMissing ? 'UNAVAILABLE' : 'HIGH'),
                correlationConfidence: correlationDTO?.dataQuality?.confidenceLevel || (dimCorr.isMissing ? 'UNAVAILABLE' : 'HIGH'),
                liquidityConfidence: liquidityDTO?.dataQuality?.confidenceLevel || (dimLiq.isMissing ? 'UNAVAILABLE' : 'HIGH'),
                scenarioStressConfidence: stressDTO?.dataQuality?.confidenceLevel || (dimStress.isMissing ? 'UNAVAILABLE' : 'HIGH')
            }
        },
        dimensions: {
            concentration: dimConc,
            volatility: dimVol,
            correlation: dimCorr,
            liquidity: dimLiq,
            stress: dimStress
        },
        riskDrivers: rankedDrivers,
        strengths,
        explanations,
        warnings
    };
}
