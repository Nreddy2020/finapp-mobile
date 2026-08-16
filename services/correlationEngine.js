/**
 * services/correlationEngine.js
 * 
 * Stage C.7.4 — Correlation, Covariance & Cross-Asset Risk Engine
 * Master Architectural Standard C7_4_V1
 * 
 * Provides deterministic, auditable, read-only multivariate dependency calculations:
 * 1. Synchronized return series construction with duplicate timestamp rejection.
 * 2. Sample covariance with Bessel's correction (N-1) and frequency annualization (DAILY=252, WEEKLY=52, MONTHLY=12).
 * 3. Pearson correlation matrix with zero-variance protection (cash / stable assets).
 * 4. Annualized constituent volatilities and weighted portfolio volatility.
 * 5. Diversification Ratio (DR_corr) & Diversification Benefit Multiplier (DBM) with zero/degenerate variance boundaries.
 * 6. Portfolio-weighted average correlation.
 * 7. Canonical 8-class cross-asset correlation with strict constituent synchronization and unrepresented class null semantics.
 * 8. Deterministic Jacobi eigenvalue solver with 9-step PSD repair and final spectral recomputation.
 * 9. Explicit separation of FINAL_EIGENVALUES_RAW and FINAL_EIGENVALUES_EFFECTIVE for PCA DTO metrics.
 * 10. Effective independent factor count, cumulative variance explained (PC1, PC1-2, PC1-3, K80, K90), and separated correlation diagnostics.
 * 
 * INVARIANTS:
 * - 100% Read-Only Safety (Zero state mutations across all stores).
 * - Mandatory deterministic asOfDate on all public APIs (Zero wall-clock timestamp calls).
 * - Long-Only weights strictly enforced (w_i >= 0, sum(w_i) = 1.0 +- 1e-6).
 * - Zero manufactured returns (missing observations return explicit degraded/insufficient status).
 */

import { DEFAULT_ASSET_LIQUIDITY_MAP } from './riskTaxonomy.js';

export const CORRELATION_POLICY_VERSION = "C7_4_V1";

export const CANONICAL_ASSET_CLASSES = Object.freeze([
    'EQUITY_DOMESTIC',
    'EQUITY_INTERNATIONAL',
    'DEBT_FIXED_INCOME',
    'GOLD_COMMODITIES',
    'REAL_ESTATE',
    'CASH_LIQUID',
    'CRYPTO_SPECULATIVE',
    'ALTERNATIVE'
]);

export const CORRELATION_POLICY_V1 = Object.freeze({
    periodsPerYear: Object.freeze({
        DAILY: 252,
        WEEKLY: 52,
        MONTHLY: 12
    }),
    observationThresholds: Object.freeze({
        MIN_SYNCHRONIZED_OBSERVATIONS: 20,
        RECOMMENDED_OBSERVATIONS: 60
    }),
    warningThresholds: Object.freeze({
        HIGH_POSITIVE_CORRELATION: 0.70,
        CRITICAL_POSITIVE_CORRELATION: 0.85,
        STRONG_NEGATIVE_CORRELATION: -0.70,
        HIGH_PORTFOLIO_AVERAGE_CORRELATION: 0.65,
        CRITICAL_PORTFOLIO_AVERAGE_CORRELATION: 0.80,
        LOW_DIVERSIFICATION_RATIO: 1.15,
        CRITICAL_FACTOR_CONCENTRATION_PC1: 0.60
    }),
    tolerances: Object.freeze({
        PORTFOLIO_VOLATILITY_EPSILON: 1e-12,
        WEIGHT_SUM_TOLERANCE: 1e-6,
        TRACE_SUM_TOLERANCE: 1e-6,
        PSD_REPAIR_TOLERANCE: 1e-8
    }),
    defaults: Object.freeze({
        frequency: 'DAILY',
        maxJacobiIterations: 100,
        jacobiConvergenceTolerance: 1e-10
    })
});

// ==========================================
// 1. DETERMINISTIC VALIDATION HELPERS
// ==========================================

function validateAsOfDate(asOfDate) {
    if (!asOfDate) {
        throw new Error("asOfDate is required for deterministic correlation evaluation.");
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

/**
 * Validate strictly long-only weights.
 * Returns { valid: boolean, normalizedWeights: Array<number>, error: string }
 */
export function validateLongOnlyWeights(weights, tolerance = 1e-6) {
    if (!Array.isArray(weights) || weights.length === 0) {
        return { valid: false, error: 'NO_WEIGHTS_PROVIDED' };
    }

    let sum = 0.0;
    for (let i = 0; i < weights.length; i++) {
        const w = Number(weights[i]);
        if (isNaN(w) || !isFinite(w) || w < 0) {
            return { valid: false, error: 'NEGATIVE_OR_NON_FINITE_WEIGHT' };
        }
        sum += w;
    }

    if (sum <= 0) {
        return { valid: false, error: 'ZERO_TOTAL_WEIGHT' };
    }

    if (Math.abs(sum - 1.0) > tolerance) {
        return { valid: false, error: `WEIGHT_SUM_OUTSIDE_TOLERANCE_${sum}` };
    }

    return { valid: true, error: null };
}

// ==========================================
// 2. RETURN SYNCHRONIZATION & DUPLICATE CHECKS
// ==========================================

/**
 * Synchronizes multiple holding return series on matching timestamps.
 * Enforces canonical ISO instant normalization and duplicate timestamp rejection.
 * 
 * @param {Array<Object>} holdingsData - Array of { holdingId, symbol, observations: Array<{ date, return }> }
 * @param {string} asOfDateISO - Cutoff date
 * @returns {Object} { status, warnings, synchronizedDates, synchronizedMatrix (T x N), holdingIds, symbols }
 */
export function synchronizeReturnSeries(holdingsData, asOfDateISO) {
    if (!Array.isArray(holdingsData) || holdingsData.length === 0) {
        return {
            status: 'EMPTY_PORTFOLIO',
            warnings: ['EMPTY_PORTFOLIO'],
            synchronizedDates: [],
            synchronizedMatrix: [],
            holdingIds: [],
            symbols: []
        };
    }

    const asOfTs = new Date(asOfDateISO).getTime();
    const holdingIds = [];
    const symbols = [];
    const holdingReturnMaps = []; // Array of Map<dateISO, returnNumber>
    const warnings = [];

    for (let i = 0; i < holdingsData.length; i++) {
        const h = holdingsData[i];
        const hId = h.holdingId || `holding_${i}`;
        const sym = h.symbol || hId;
        holdingIds.push(hId);
        symbols.push(sym);

        const dateMap = new Map();
        const obs = Array.isArray(h.observations) ? h.observations : [];

        for (let j = 0; j < obs.length; j++) {
            const item = obs[j];
            if (!item || !item.date) continue;

            const d = new Date(item.date);
            if (isNaN(d.getTime())) continue;

            const itemTs = d.getTime();
            if (itemTs > asOfTs) continue; // Future point exclusion

            const dateKey = d.toISOString();
            const retVal = Number(item.return !== undefined ? item.return : item.returnRate);

            if (isNaN(retVal) || !isFinite(retVal)) continue;

            // Strict Duplicate Timestamp Check (C7.4-R4)
            if (dateMap.has(dateKey)) {
                return {
                    status: 'INVALID_INPUT',
                    warnings: ['DUPLICATE_TIMESTAMP_INPUT', `DUPLICATE_AT_${sym}_${dateKey}`],
                    synchronizedDates: [],
                    synchronizedMatrix: [],
                    holdingIds,
                    symbols
                };
            }

            dateMap.set(dateKey, retVal);
        }

        holdingReturnMaps.push(dateMap);
    }

    // Find intersection of dates across ALL holdings
    if (holdingReturnMaps.length === 0 || holdingReturnMaps[0].size === 0) {
        return {
            status: 'INSUFFICIENT_HISTORY',
            warnings: ['ZERO_COMMON_OBSERVATIONS'],
            synchronizedDates: [],
            synchronizedMatrix: [],
            holdingIds,
            symbols
        };
    }

    // Start with dates of holding 0
    const commonDates = [];
    const firstMap = holdingReturnMaps[0];

    for (const [dateKey] of firstMap.entries()) {
        let inAll = true;
        for (let k = 1; k < holdingReturnMaps.length; k++) {
            if (!holdingReturnMaps[k].has(dateKey)) {
                inAll = false;
                break;
            }
        }
        if (inAll) {
            commonDates.push(dateKey);
        }
    }

    // Chronological ascending sort
    commonDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    // Build T x N return matrix
    const synchronizedMatrix = [];
    for (let t = 0; t < commonDates.length; t++) {
        const dKey = commonDates[t];
        const row = [];
        for (let i = 0; i < holdingReturnMaps.length; i++) {
            row.push(holdingReturnMaps[i].get(dKey));
        }
        synchronizedMatrix.push(row);
    }

    const T = synchronizedMatrix.length;
    let status = 'HEALTHY';
    if (T < CORRELATION_POLICY_V1.observationThresholds.MIN_SYNCHRONIZED_OBSERVATIONS) {
        status = 'INSUFFICIENT_HISTORY';
        warnings.push('INSUFFICIENT_SYNCHRONIZED_OBSERVATIONS');
    }

    return {
        status,
        warnings,
        synchronizedDates: commonDates,
        synchronizedMatrix,
        holdingIds,
        symbols
    };
}

// ==========================================
// 3. COVARIANCE & CORRELATION MATRIX CORE
// ==========================================

/**
 * Calculates Sample Covariance Matrix with Bessel's correction (N-1) and Annualized Covariance Matrix.
 * 
 * @param {Array<Array<number>>} matrix - T x N matrix of synchronized returns
 * @param {string} frequency - DAILY (252), WEEKLY (52), MONTHLY (12)
 * @returns {Object} { covarianceMatrix, annualizedCovarianceMatrix, means, periodicStds, annualizedStds }
 */
export function calculateCovarianceMatrices(matrix, frequency = 'DAILY') {
    if (!Array.isArray(matrix) || matrix.length < 2) {
        return {
            covarianceMatrix: null,
            annualizedCovarianceMatrix: null,
            means: [],
            periodicStds: [],
            annualizedStds: []
        };
    }

    const T = matrix.length;
    const N = matrix[0].length;
    const F = CORRELATION_POLICY_V1.periodsPerYear[frequency.toUpperCase()] || 252;

    // 1. Column Means
    const means = Array(N).fill(0.0);
    for (let t = 0; t < T; t++) {
        for (let i = 0; i < N; i++) {
            means[i] += matrix[t][i];
        }
    }
    for (let i = 0; i < N; i++) {
        means[i] /= T;
    }

    // 2. Covariance Matrix (N x N)
    const cov = Array.from({ length: N }, () => Array(N).fill(0.0));
    const covAnn = Array.from({ length: N }, () => Array(N).fill(0.0));

    for (let i = 0; i < N; i++) {
        for (let j = i; j < N; j++) {
            let sumProd = 0.0;
            for (let t = 0; t < T; t++) {
                sumProd += (matrix[t][i] - means[i]) * (matrix[t][j] - means[j]);
            }
            const sampleCov = sumProd / (T - 1);
            const annCov = sampleCov * F;

            cov[i][j] = sampleCov;
            cov[j][i] = sampleCov;
            covAnn[i][j] = annCov;
            covAnn[j][i] = annCov;
        }
    }

    // 3. Periodic & Annualized Standard Deviations
    const periodicStds = [];
    const annualizedStds = [];
    for (let i = 0; i < N; i++) {
        const perVar = Math.max(0, cov[i][i]);
        const annVar = Math.max(0, covAnn[i][i]);
        periodicStds.push(Math.sqrt(perVar));
        annualizedStds.push(Math.sqrt(annVar));
    }

    return {
        covarianceMatrix: cov,
        annualizedCovarianceMatrix: covAnn,
        means,
        periodicStds,
        annualizedStds
    };
}

/**
 * Calculates Pearson Correlation Matrix with zero-variance protection.
 * 
 * @param {Array<Array<number>>} cov - N x N periodic covariance matrix
 * @param {Array<number>} periodicStds - Length N array of periodic standard deviations
 * @returns {Array<Array<number>>} N x N Pearson correlation matrix
 */
export function calculateCorrelationMatrix(cov, periodicStds) {
    if (!Array.isArray(cov) || cov.length === 0) return null;
    const N = cov.length;
    const R = Array.from({ length: N }, () => Array(N).fill(0.0));

    for (let i = 0; i < N; i++) {
        for (let j = i; j < N; j++) {
            if (i === j) {
                R[i][i] = 1.0;
            } else {
                const stdI = periodicStds[i];
                const stdJ = periodicStds[j];
                let rho = 0.0;

                if (stdI > 0 && stdJ > 0) {
                    rho = cov[i][j] / (stdI * stdJ);
                    // Strict Clamp [-1.0, 1.0]
                    rho = Math.max(-1.0, Math.min(1.0, rho));
                } else {
                    // Zero-variance asset guard (Cash / Stablecoin)
                    rho = 0.0;
                }

                R[i][j] = rho;
                R[j][i] = rho;
            }
        }
    }

    return R;
}

// ==========================================
// 4. PORTFOLIO DIVERSIFICATION METRICS
// ==========================================

/**
 * Calculates Diversification Ratio (DR_corr), Diversification Benefit Multiplier (DBM),
 * and Weighted Average Correlation.
 * 
 * NUMERATOR & DENOMINATOR BOTH USE ANNUALIZED VOLATILITY UNITS (C7.4-R9).
 */
export function calculateDiversificationMetrics(weights, covAnn, corr, annualizedStds) {
    if (!Array.isArray(weights) || weights.length === 0 || !Array.isArray(covAnn)) {
        return {
            portfolioAnnualizedVolatility: null,
            weightedConstituentVolatility: null,
            diversificationRatio: null,
            diversificationBenefitMultiplier: null,
            weightedAverageCorrelation: null,
            warning: null
        };
    }

    const N = weights.length;
    const epsilon = CORRELATION_POLICY_V1.tolerances.PORTFOLIO_VOLATILITY_EPSILON;

    // 1. Annualized Weighted Constituent Volatility: sigma_weighted = sum(w_i * sigma_i,ann)
    let sigmaWeighted = 0.0;
    for (let i = 0; i < N; i++) {
        sigmaWeighted += weights[i] * annualizedStds[i];
    }

    // 2. Annualized Portfolio Variance: sigma_p^2 = w^T Sigma_ann w
    let portVar = 0.0;
    for (let i = 0; i < N; i++) {
        for (let j = 0; j < N; j++) {
            portVar += weights[i] * weights[j] * covAnn[i][j];
        }
    }
    const sigmaPort = Math.sqrt(Math.max(0, portVar));

    // 3. Diversification Ratio & Multiplier Contract (C7.4-R5 & C7.4-R9)
    let dr = null;
    let dbm = null;
    let warning = null;

    if (N === 1) {
        dr = 1.0;
        dbm = 0.0;
    } else if (sigmaWeighted <= epsilon && sigmaPort <= epsilon) {
        // Case 1: Zero constituent & portfolio variance (e.g. 100% Cash)
        dr = 1.0;
        dbm = 0.0;
    } else if (sigmaPort <= epsilon && sigmaWeighted > epsilon) {
        // Case 2: Degenerate portfolio variance (perfect synthetic hedge)
        dr = null;
        dbm = null;
        warning = 'DEGENERATE_PORTFOLIO_VARIANCE';
    } else {
        // Case 3: Standard positive volatility
        dr = sigmaWeighted / sigmaPort;
        dbm = Math.max(0.0, 1.0 - (sigmaPort / sigmaWeighted));
    }

    // 4. Weighted Average Off-Diagonal Correlation
    let weightedAvgCorr = null;
    if (N === 1) {
        weightedAvgCorr = 1.0;
    } else if (Array.isArray(corr)) {
        let sumOffDiag = 0.0;
        let sumWeightsOffDiag = 0.0;
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                if (i !== j) {
                    sumOffDiag += weights[i] * weights[j] * corr[i][j];
                    sumWeightsOffDiag += weights[i] * weights[j];
                }
            }
        }
        if (sumWeightsOffDiag > 0) {
            weightedAvgCorr = sumOffDiag / sumWeightsOffDiag;
            weightedAvgCorr = Math.max(-1.0, Math.min(1.0, weightedAvgCorr));
        } else {
            weightedAvgCorr = 1.0;
        }
    }

    return {
        portfolioAnnualizedVolatility: roundTo(sigmaPort, 4),
        weightedConstituentVolatility: roundTo(sigmaWeighted, 4),
        diversificationRatio: roundTo(dr, 4),
        diversificationBenefitMultiplier: roundTo(dbm, 4),
        weightedAverageCorrelation: roundTo(weightedAvgCorr, 4),
        warning
    };
}

// ==========================================
// 5. DETERMINISTIC JACOBI EIGENSOLVER & PCA
// ==========================================

/**
 * Deterministic Jacobi Eigenvalue Decomposition for real symmetric matrices.
 * Sorts eigenvalues descendingly and enforces deterministic iteration.
 * 
 * @param {Array<Array<number>>} A_in - N x N symmetric matrix
 * @param {number} maxIter - Maximum Jacobi sweeps
 * @param {number} tol - Convergence tolerance
 * @returns {Object} { eigenvalues: Array<number>, eigenvectors: Array<Array<number>> }
 */
export function deterministicJacobiEigen(A_in, maxIter = 100, tol = 1e-10) {
    const N = A_in.length;
    if (N === 1) {
        return {
            eigenvalues: [A_in[0][0]],
            eigenvectors: [[1.0]]
        };
    }

    // Deep copy matrix A and initialize V as identity
    const A = A_in.map(row => [...row]);
    const V = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => (i === j ? 1.0 : 0.0)));

    for (let iter = 0; iter < maxIter; iter++) {
        // Find maximum off-diagonal element
        let maxOff = 0.0;
        let p = 0;
        let q = 1;

        for (let i = 0; i < N - 1; i++) {
            for (let j = i + 1; j < N; j++) {
                const absVal = Math.abs(A[i][j]);
                if (absVal > maxOff) {
                    maxOff = absVal;
                    p = i;
                    q = j;
                }
            }
        }

        if (maxOff < tol) {
            break; // Converged
        }

        // Jacobi rotation for (p, q)
        const app = A[p][p];
        const aqq = A[q][q];
        const apq = A[p][q];

        const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
        const c = Math.cos(phi);
        const s = Math.sin(phi);

        // Update A matrix
        for (let k = 0; k < N; k++) {
            if (k !== p && k !== q) {
                const akp = A[k][p];
                const akq = A[k][q];
                A[k][p] = c * akp - s * akq;
                A[p][k] = A[k][p];
                A[k][q] = s * akp + c * akq;
                A[q][k] = A[k][q];
            }
        }

        A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
        A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
        A[p][q] = 0.0;
        A[q][p] = 0.0;

        // Update eigenvectors V
        for (let k = 0; k < N; k++) {
            const vkp = V[k][p];
            const vkq = V[k][q];
            V[k][p] = c * vkp - s * vkq;
            V[k][q] = s * vkp + c * vkq;
        }
    }

    // Extract eigenvalues from diagonal
    const rawEigenvalues = [];
    for (let i = 0; i < N; i++) {
        rawEigenvalues.push(A[i][i]);
    }

    // Sort descendingly with deterministic index tracking
    const order = Array.from({ length: N }, (_, i) => i);
    order.sort((a, b) => rawEigenvalues[b] - rawEigenvalues[a]);

    const sortedEigenvalues = order.map(idx => rawEigenvalues[idx]);
    const sortedEigenvectors = Array.from({ length: N }, () => Array(N).fill(0.0));

    for (let col = 0; col < N; col++) {
        const origCol = order[col];
        for (let row = 0; row < N; row++) {
            sortedEigenvectors[row][col] = V[row][origCol];
        }
    }

    return {
        eigenvalues: sortedEigenvalues,
        eigenvectors: sortedEigenvectors
    };
}

/**
 * Executes 9-Step Deterministic PSD Repair and PCA Spectrum Pipeline (C7.4-R1, C7.4-R6, C7.4-R10).
 * 
 * Explicitly separates FINAL_EIGENVALUES_RAW and FINAL_EIGENVALUES_EFFECTIVE.
 * 
 * @param {Array<Array<number>>} R_in - N x N Pearson correlation matrix
 * @returns {Object} Complete PCA diagnostic metrics
 */
export function executePCAAndPSDRepair(R_in) {
    if (!Array.isArray(R_in) || R_in.length === 0) return null;
    const N = R_in.length;
    const psdTol = CORRELATION_POLICY_V1.tolerances.PSD_REPAIR_TOLERANCE;

    // Step 1: Initial Symmetrization
    const R_sym = Array.from({ length: N }, (_, i) =>
        Array.from({ length: N }, (_, j) => (R_in[i][j] + R_in[j][i]) / 2.0)
    );

    // Step 2: Initial Eigen Decomposition
    const initialDecomp = deterministicJacobiEigen(R_sym);
    let finalMatrix = R_sym;
    const minInitEig = Math.min(...initialDecomp.eigenvalues);

    // Step 3 & 4: PSD Repair if required
    if (minInitEig < -psdTol) {
        // Clamp negative eigenvalues to 0
        const clampedEigs = initialDecomp.eigenvalues.map(val => Math.max(0.0, val));
        const V = initialDecomp.eigenvectors;

        // Reconstruct matrix: R_recon = V * diag(clampedEigs) * V^T
        const R_recon = Array.from({ length: N }, () => Array(N).fill(0.0));
        for (let i = 0; i < N; i++) {
            for (let j = 0; j < N; j++) {
                let sum = 0.0;
                for (let k = 0; k < N; k++) {
                    sum += V[i][k] * clampedEigs[k] * V[j][k];
                }
                R_recon[i][j] = sum;
            }
        }

        // Normalize diagonal to 1.0: R_norm,ij = R_recon,ij / sqrt(R_recon,ii * R_recon,jj)
        const R_norm = Array.from({ length: N }, () => Array(N).fill(0.0));
        for (let i = 0; i < N; i++) {
            const diagI = Math.sqrt(Math.max(1e-12, R_recon[i][i]));
            for (let j = 0; j < N; j++) {
                const diagJ = Math.sqrt(Math.max(1e-12, R_recon[j][j]));
                if (i === j) {
                    R_norm[i][j] = 1.0;
                } else {
                    R_norm[i][j] = Math.max(-1.0, Math.min(1.0, R_recon[i][j] / (diagI * diagJ)));
                }
            }
        }

        // Symmetrize final matrix
        finalMatrix = Array.from({ length: N }, (_, i) =>
            Array.from({ length: N }, (_, j) => (R_norm[i][j] + R_norm[j][i]) / 2.0)
        );
    }

    // Step 5: FINAL Eigen Decomposition
    const finalDecomp = deterministicJacobiEigen(finalMatrix);
    const FINAL_EIGENVALUES_RAW = finalDecomp.eigenvalues;

    // Step 6: Derive FINAL_EIGENVALUES_EFFECTIVE (C7.4-R10)
    const FINAL_EIGENVALUES_EFFECTIVE = [];
    let isDegraded = false;

    for (let k = 0; k < N; k++) {
        const rawEig = FINAL_EIGENVALUES_RAW[k];
        if (rawEig >= 0.0) {
            FINAL_EIGENVALUES_EFFECTIVE.push(rawEig);
        } else if (Math.abs(rawEig) <= psdTol) {
            // Floating-point numerical noise clamped to 0.0
            FINAL_EIGENVALUES_EFFECTIVE.push(0.0);
        } else {
            // Materially negative eigenvalue: degraded non-PSD spectrum
            isDegraded = true;
            FINAL_EIGENVALUES_EFFECTIVE.push(0.0);
        }
    }

    if (isDegraded) {
        return {
            status: 'DEGRADED',
            warning: 'NUMERICALLY_INVALID_NON_PSD_SPECTRUM',
            rawEigenvalues: FINAL_EIGENVALUES_RAW.map(e => roundTo(e, 6)),
            effectiveEigenvalues: null,
            varianceExplainedRatios: null,
            top1FactorConcentration: null,
            top2CumulativeVariance: null,
            top3CumulativeVariance: null,
            componentsFor80PercentVariance: null,
            componentsFor90PercentVariance: null,
            effectiveFactorCount: null
        };
    }

    // Step 7: Variance Explained & Factor Counts on Effective Spectrum
    const effectiveEigs = FINAL_EIGENVALUES_EFFECTIVE;
    const traceSum = effectiveEigs.reduce((a, b) => a + b, 0.0);

    const varianceExplainedRatios = effectiveEigs.map(e => roundTo(e / N, 4));
    const pc1 = roundTo(effectiveEigs[0] / N, 4);
    const pc1_2 = roundTo((effectiveEigs[0] + (effectiveEigs[1] || 0.0)) / N, 4);
    const pc1_2_3 = roundTo((effectiveEigs[0] + (effectiveEigs[1] || 0.0) + (effectiveEigs[2] || 0.0)) / N, 4);

    let cumVar = 0.0;
    let k80 = N;
    let k90 = N;

    for (let k = 0; k < N; k++) {
        cumVar += effectiveEigs[k] / N;
        if (cumVar >= 0.80 && k80 === N) {
            k80 = k + 1;
        }
        if (cumVar >= 0.90 && k90 === N) {
            k90 = k + 1;
        }
    }

    // Effective Factor Count: N^2 / sum(lambda_eff^2)
    const sumSqEigs = effectiveEigs.reduce((acc, e) => acc + Math.pow(e, 2), 0.0);
    const effectiveFactorCount = sumSqEigs > 0 ? roundTo(Math.pow(N, 2) / sumSqEigs, 4) : 1.0;

    return {
        status: 'HEALTHY',
        warning: null,
        rawEigenvalues: FINAL_EIGENVALUES_RAW.map(e => roundTo(e, 6)),
        effectiveEigenvalues: effectiveEigs.map(e => roundTo(e, 4)),
        varianceExplainedRatios,
        top1FactorConcentration: pc1,
        top2CumulativeVariance: pc1_2,
        top3CumulativeVariance: pc1_2_3,
        componentsFor80PercentVariance: k80,
        componentsFor90PercentVariance: k90,
        effectiveFactorCount,
        traceSum: roundTo(traceSum, 6)
    };
}

// ==========================================
// 6. CANONICAL 8-CLASS ASSET AGGREGATION
// ==========================================

/**
 * Calculates 8x8 Canonical Asset-Class Correlation Matrix with strict constituent synchronization (C7.4-R3 & C7.4-R7).
 * 
 * Unrepresented classes (W_c = 0) produce NULL rows/columns.
 * 
 * @param {Array<Object>} holdingsData - Array of { holdingId, symbol, assetClass, observations }
 * @param {Array<number>} weights - Holding weights
 * @param {string} asOfDateISO - Mandatory asOfDate
 * @returns {Array<Array<number|null>>} 8x8 matrix
 */
export function calculateAssetClassCorrelationMatrix(holdingsData, weights, asOfDateISO) {
    const classMap = {};
    for (let k = 0; k < CANONICAL_ASSET_CLASSES.length; k++) {
        classMap[CANONICAL_ASSET_CLASSES[k]] = {
            totalWeight: 0.0,
            holdings: []
        };
    }

    for (let i = 0; i < holdingsData.length; i++) {
        const h = holdingsData[i];
        const rawClass = (h.assetClass || h.asset_class || '').toUpperCase();
        const assetClass = CANONICAL_ASSET_CLASSES.includes(rawClass) ? rawClass : 'ALTERNATIVE';
        const w = weights[i] || 0.0;

        classMap[assetClass].totalWeight += w;
        classMap[assetClass].holdings.push({
            holding: h,
            weight: w
        });
    }

    // Build synchronized return series for each represented class
    const classReturns = {}; // class -> Map<date, return>

    for (let k = 0; k < CANONICAL_ASSET_CLASSES.length; k++) {
        const cName = CANONICAL_ASSET_CLASSES[k];
        const cInfo = classMap[cName];

        if (cInfo.totalWeight <= 0 || cInfo.holdings.length === 0) {
            classReturns[cName] = null; // Unrepresented
            continue;
        }

        const W_c = cInfo.totalWeight;
        const constituentData = cInfo.holdings.map(item => item.holding);

        // Strict Constituent Synchronization (C7.4-R7)
        const syncResult = synchronizeReturnSeries(constituentData, asOfDateISO);
        if (syncResult.status !== 'HEALTHY' || syncResult.synchronizedMatrix.length < CORRELATION_POLICY_V1.observationThresholds.MIN_SYNCHRONIZED_OBSERVATIONS) {
            classReturns[cName] = null;
            continue;
        }

        const classDateMap = new Map();
        for (let t = 0; t < syncResult.synchronizedDates.length; t++) {
            const dKey = syncResult.synchronizedDates[t];
            let classReturnAtT = 0.0;

            for (let idx = 0; idx < cInfo.holdings.length; idx++) {
                const normalizedConstituentWeight = cInfo.holdings[idx].weight / W_c;
                const retVal = syncResult.synchronizedMatrix[t][idx];
                classReturnAtT += normalizedConstituentWeight * retVal;
            }

            classDateMap.set(dKey, classReturnAtT);
        }

        classReturns[cName] = classDateMap;
    }

    // Build 8x8 matrix
    const matrix8x8 = Array.from({ length: 8 }, () => Array(8).fill(null));

    for (let i = 0; i < 8; i++) {
        const classA = CANONICAL_ASSET_CLASSES[i];
        const mapA = classReturns[classA];

        for (let j = i; j < 8; j++) {
            const classB = CANONICAL_ASSET_CLASSES[j];
            const mapB = classReturns[classB];

            if (!mapA || !mapB) {
                matrix8x8[i][j] = null;
                matrix8x8[j][i] = null;
                continue;
            }

            if (i === j) {
                matrix8x8[i][i] = 1.0;
                continue;
            }

            // Find common dates between classA and classB
            const common = [];
            for (const [d, retA] of mapA.entries()) {
                if (mapB.has(d)) {
                    common.push([retA, mapB.get(d)]);
                }
            }

            if (common.length < CORRELATION_POLICY_V1.observationThresholds.MIN_SYNCHRONIZED_OBSERVATIONS) {
                matrix8x8[i][j] = null;
                matrix8x8[j][i] = null;
                continue;
            }

            // Pearson correlation between the two classes
            let meanA = 0.0;
            let meanB = 0.0;
            const T_ab = common.length;

            for (let t = 0; t < T_ab; t++) {
                meanA += common[t][0];
                meanB += common[t][1];
            }
            meanA /= T_ab;
            meanB /= T_ab;

            let sumProd = 0.0;
            let sumSqA = 0.0;
            let sumSqB = 0.0;

            for (let t = 0; t < T_ab; t++) {
                const diffA = common[t][0] - meanA;
                const diffB = common[t][1] - meanB;
                sumProd += diffA * diffB;
                sumSqA += diffA * diffA;
                sumSqB += diffB * diffB;
            }

            const stdA = Math.sqrt(sumSqA / (T_ab - 1));
            const stdB = Math.sqrt(sumSqB / (T_ab - 1));

            let rho = 0.0;
            if (stdA > 0 && stdB > 0) {
                rho = sumProd / ((T_ab - 1) * stdA * stdB);
                rho = Math.max(-1.0, Math.min(1.0, rho));
            }

            matrix8x8[i][j] = roundTo(rho, 4);
            matrix8x8[j][i] = roundTo(rho, 4);
        }
    }

    return matrix8x8;
}

// ==========================================
// 7. MASTER CORRELATION & CROSS-ASSET RISK API
// ==========================================

/**
 * Master public evaluation entry point for Stage C.7.4 Correlation, Covariance & Cross-Asset Risk Diagnostics.
 * 
 * @param {Object} params
 * @param {string} params.asOfDate - Mandatory ISO date string
 * @param {Array<Object>} [params.holdings] - Array of { holdingId, symbol, assetClass, weight, observations }
 * @param {string} [params.portfolioId] - Optional portfolio identifier
 * @param {string} [params.frequency='DAILY'] - DAILY (252), WEEKLY (52), MONTHLY (12)
 * @param {Object} [params.policy] - Optional custom risk policy override
 * @returns {Object} Complete CorrelationDiagnostics DTO
 */
export function evaluatePortfolioCorrelationAndCrossAssetRisk(params = {}) {
    const asOfDateISO = validateAsOfDate(params.asOfDate);
    const policy = params.policy || CORRELATION_POLICY_V1;
    const frequency = (params.frequency || policy.defaults.frequency || 'DAILY').toUpperCase();
    const holdings = Array.isArray(params.holdings) ? params.holdings : [];

    // 1. Empty Portfolio Boundary (C7.4-R8)
    if (holdings.length === 0) {
        return {
            portfolioId: params.portfolioId || null,
            asOfDate: asOfDateISO,
            policyVersion: CORRELATION_POLICY_VERSION,
            status: 'EMPTY_PORTFOLIO',
            frequency,
            observationCount: 0,
            holdingCount: 0,
            holdingIds: [],
            symbols: [],
            weights: [],
            correlationMatrix: null,
            covarianceMatrix: null,
            weightedAverageCorrelation: null,
            diversificationRatio: null,
            diversificationBenefitMultiplier: null,
            portfolioAnnualizedVolatility: null,
            weightedConstituentVolatility: null,
            eigenvalues: null,
            varianceExplainedRatios: null,
            top1FactorConcentration: null,
            top2CumulativeVariance: null,
            top3CumulativeVariance: null,
            componentsFor80PercentVariance: null,
            componentsFor90PercentVariance: null,
            effectiveFactorCount: null,
            assetClasses: [...CANONICAL_ASSET_CLASSES],
            assetClassCorrelationMatrix: null,
            highPositiveCorrelationPairs: [],
            strongNegativeCorrelationPairs: [],
            warnings: ['EMPTY_PORTFOLIO'],
            dataQuality: {
                confidenceLevel: 'UNAVAILABLE',
                coverageRatio: 0.0,
                observationCount: 0,
                evaluationTimestamp: asOfDateISO
            }
        };
    }

    const weights = holdings.map(h => Number(h.weight !== undefined ? h.weight : 0.0));

    // 2. Strict Long-Only Weight Validation (C7.4-R2)
    const weightValidation = validateLongOnlyWeights(weights, policy.tolerances.WEIGHT_SUM_TOLERANCE);
    if (!weightValidation.valid) {
        return {
            portfolioId: params.portfolioId || null,
            asOfDate: asOfDateISO,
            policyVersion: CORRELATION_POLICY_VERSION,
            status: 'INVALID_INPUT',
            frequency,
            observationCount: 0,
            holdingCount: holdings.length,
            holdingIds: holdings.map(h => h.holdingId || ''),
            symbols: holdings.map(h => h.symbol || ''),
            weights,
            correlationMatrix: null,
            covarianceMatrix: null,
            weightedAverageCorrelation: null,
            diversificationRatio: null,
            diversificationBenefitMultiplier: null,
            portfolioAnnualizedVolatility: null,
            weightedConstituentVolatility: null,
            eigenvalues: null,
            varianceExplainedRatios: null,
            top1FactorConcentration: null,
            top2CumulativeVariance: null,
            top3CumulativeVariance: null,
            componentsFor80PercentVariance: null,
            componentsFor90PercentVariance: null,
            effectiveFactorCount: null,
            assetClasses: [...CANONICAL_ASSET_CLASSES],
            assetClassCorrelationMatrix: null,
            highPositiveCorrelationPairs: [],
            strongNegativeCorrelationPairs: [],
            warnings: ['INVALID_PORTFOLIO_WEIGHTS', weightValidation.error],
            dataQuality: {
                confidenceLevel: 'UNAVAILABLE',
                coverageRatio: 0.0,
                observationCount: 0,
                evaluationTimestamp: asOfDateISO
            }
        };
    }

    // 3. Synchronize Return Series & Detect Duplicate Timestamps (C7.4-R4)
    const syncData = synchronizeReturnSeries(holdings, asOfDateISO);
    const warnings = [...syncData.warnings];

    if (syncData.status === 'INVALID_INPUT') {
        return {
            portfolioId: params.portfolioId || null,
            asOfDate: asOfDateISO,
            policyVersion: CORRELATION_POLICY_VERSION,
            status: 'INVALID_INPUT',
            frequency,
            observationCount: 0,
            holdingCount: holdings.length,
            holdingIds: syncData.holdingIds,
            symbols: syncData.symbols,
            weights,
            correlationMatrix: null,
            covarianceMatrix: null,
            weightedAverageCorrelation: null,
            diversificationRatio: null,
            diversificationBenefitMultiplier: null,
            portfolioAnnualizedVolatility: null,
            weightedConstituentVolatility: null,
            eigenvalues: null,
            varianceExplainedRatios: null,
            top1FactorConcentration: null,
            top2CumulativeVariance: null,
            top3CumulativeVariance: null,
            componentsFor80PercentVariance: null,
            componentsFor90PercentVariance: null,
            effectiveFactorCount: null,
            assetClasses: [...CANONICAL_ASSET_CLASSES],
            assetClassCorrelationMatrix: null,
            highPositiveCorrelationPairs: [],
            strongNegativeCorrelationPairs: [],
            warnings,
            dataQuality: {
                confidenceLevel: 'UNAVAILABLE',
                coverageRatio: 0.0,
                observationCount: 0,
                evaluationTimestamp: asOfDateISO
            }
        };
    }

    const T = syncData.synchronizedMatrix.length;
    const N = holdings.length;

    if (T < policy.observationThresholds.MIN_SYNCHRONIZED_OBSERVATIONS) {
        return {
            portfolioId: params.portfolioId || null,
            asOfDate: asOfDateISO,
            policyVersion: CORRELATION_POLICY_VERSION,
            status: 'INSUFFICIENT_HISTORY',
            frequency,
            observationCount: T,
            holdingCount: N,
            holdingIds: syncData.holdingIds,
            symbols: syncData.symbols,
            weights,
            correlationMatrix: null,
            covarianceMatrix: null,
            weightedAverageCorrelation: null,
            diversificationRatio: null,
            diversificationBenefitMultiplier: null,
            portfolioAnnualizedVolatility: null,
            weightedConstituentVolatility: null,
            eigenvalues: null,
            varianceExplainedRatios: null,
            top1FactorConcentration: null,
            top2CumulativeVariance: null,
            top3CumulativeVariance: null,
            componentsFor80PercentVariance: null,
            componentsFor90PercentVariance: null,
            effectiveFactorCount: null,
            assetClasses: [...CANONICAL_ASSET_CLASSES],
            assetClassCorrelationMatrix: null,
            highPositiveCorrelationPairs: [],
            strongNegativeCorrelationPairs: [],
            warnings,
            dataQuality: {
                confidenceLevel: 'UNAVAILABLE',
                coverageRatio: roundTo(T / policy.observationThresholds.RECOMMENDED_OBSERVATIONS, 4),
                observationCount: T,
                evaluationTimestamp: asOfDateISO
            }
        };
    }

    // 4. Calculate Covariance & Correlation Matrices
    const covResult = calculateCovarianceMatrices(syncData.synchronizedMatrix, frequency);
    const corrMatrix = calculateCorrelationMatrix(covResult.covarianceMatrix, covResult.periodicStds);

    // 5. Calculate Annualized Diversification Metrics (C7.4-R9)
    const divMetrics = calculateDiversificationMetrics(weights, covResult.annualizedCovarianceMatrix, corrMatrix, covResult.annualizedStds);
    if (divMetrics.warning) {
        warnings.push(divMetrics.warning);
    }

    // 6. PCA & PSD Spectral Projection (C7.4-R1, C7.4-R6, C7.4-R10)
    const pcaResult = executePCAAndPSDRepair(corrMatrix);
    if (pcaResult && pcaResult.warning) {
        warnings.push(pcaResult.warning);
    }

    // 7. Canonical 8-Class Asset Aggregation (C7.4-R3 & C7.4-R7)
    const assetClassMatrix = calculateAssetClassCorrelationMatrix(holdings, weights, asOfDateISO);

    // 8. Extract High Positive and Strong Negative Correlation Pairs
    const highPositivePairs = [];
    const strongNegativePairs = [];

    for (let i = 0; i < N - 1; i++) {
        for (let j = i + 1; j < N; j++) {
            const rho = corrMatrix[i][j];
            const symA = syncData.symbols[i];
            const symB = syncData.symbols[j];
            const hIdA = syncData.holdingIds[i];
            const hIdB = syncData.holdingIds[j];

            if (rho >= policy.warningThresholds.CRITICAL_POSITIVE_CORRELATION) {
                highPositivePairs.push({
                    holdingIdA: hIdA, holdingIdB: hIdB,
                    symbolA: symA, symbolB: symB,
                    correlation: roundTo(rho, 4),
                    severity: 'CRITICAL'
                });
            } else if (rho >= policy.warningThresholds.HIGH_POSITIVE_CORRELATION) {
                highPositivePairs.push({
                    holdingIdA: hIdA, holdingIdB: hIdB,
                    symbolA: symA, symbolB: symB,
                    correlation: roundTo(rho, 4),
                    severity: 'HIGH'
                });
            } else if (rho <= policy.warningThresholds.STRONG_NEGATIVE_CORRELATION) {
                strongNegativePairs.push({
                    holdingIdA: hIdA, holdingIdB: hIdB,
                    symbolA: symA, symbolB: symB,
                    correlation: roundTo(rho, 4),
                    type: 'DIVERSIFIER'
                });
            }
        }
    }

    // Diagnostic Warnings
    if (highPositivePairs.length > 0) {
        warnings.push('HIGH_PAIRWISE_CORRELATION_DETECTED');
    }
    if (divMetrics.weightedAverageCorrelation !== null && divMetrics.weightedAverageCorrelation >= policy.warningThresholds.HIGH_PORTFOLIO_AVERAGE_CORRELATION) {
        warnings.push('HIGH_PORTFOLIO_AVERAGE_CORRELATION');
    }
    if (divMetrics.diversificationRatio !== null && divMetrics.diversificationRatio < policy.warningThresholds.LOW_DIVERSIFICATION_RATIO && N >= 3) {
        warnings.push('LOW_DIVERSIFICATION_BENEFIT');
    }
    if (pcaResult && pcaResult.top1FactorConcentration !== null && pcaResult.top1FactorConcentration >= policy.warningThresholds.CRITICAL_FACTOR_CONCENTRATION_PC1) {
        warnings.push('DOMINANT_RISK_FACTOR_CONCENTRATION');
    }

    let status = 'HEALTHY';
    if (pcaResult && pcaResult.status === 'DEGRADED') {
        status = 'DEGRADED';
    } else if (divMetrics.warning === 'DEGENERATE_PORTFOLIO_VARIANCE') {
        status = 'DEGRADED';
    }

    const coverageRatio = roundTo(Math.min(1.0, T / policy.observationThresholds.RECOMMENDED_OBSERVATIONS), 4);
    const confidenceLevel = T >= policy.observationThresholds.RECOMMENDED_OBSERVATIONS && status === 'HEALTHY' ? 'HIGH' : (status === 'HEALTHY' ? 'MODERATE' : 'DEGRADED');

    return {
        portfolioId: params.portfolioId || null,
        asOfDate: asOfDateISO,
        policyVersion: CORRELATION_POLICY_VERSION,
        status,
        frequency,
        observationCount: T,
        holdingCount: N,
        holdingIds: syncData.holdingIds,
        symbols: syncData.symbols,
        weights,

        // Matrices (Rounded to 4 decimal places)
        correlationMatrix: corrMatrix.map(row => row.map(val => roundTo(val, 4))),
        covarianceMatrix: covResult.annualizedCovarianceMatrix.map(row => row.map(val => roundTo(val, 6))),

        // Summary Dependency & Annualized Diversification Metrics
        weightedAverageCorrelation: divMetrics.weightedAverageCorrelation,
        diversificationRatio: divMetrics.diversificationRatio,
        diversificationBenefitMultiplier: divMetrics.diversificationBenefitMultiplier,
        portfolioAnnualizedVolatility: divMetrics.portfolioAnnualizedVolatility,
        weightedConstituentVolatility: divMetrics.weightedConstituentVolatility,

        // Principal Component Analysis (PCA) — Based on FINAL_EIGENVALUES_EFFECTIVE
        eigenvalues: pcaResult ? pcaResult.effectiveEigenvalues : null,
        varianceExplainedRatios: pcaResult ? pcaResult.varianceExplainedRatios : null,
        top1FactorConcentration: pcaResult ? pcaResult.top1FactorConcentration : null,
        top2CumulativeVariance: pcaResult ? pcaResult.top2CumulativeVariance : null,
        top3CumulativeVariance: pcaResult ? pcaResult.top3CumulativeVariance : null,
        componentsFor80PercentVariance: pcaResult ? pcaResult.componentsFor80PercentVariance : null,
        componentsFor90PercentVariance: pcaResult ? pcaResult.componentsFor90PercentVariance : null,
        effectiveFactorCount: pcaResult ? pcaResult.effectiveFactorCount : null,

        // Canonical 8-Class Matrix (null for unrepresented classes)
        assetClasses: [...CANONICAL_ASSET_CLASSES],
        assetClassCorrelationMatrix: assetClassMatrix,

        // Diagnostic Pairs
        highPositiveCorrelationPairs: highPositivePairs,
        strongNegativeCorrelationPairs: strongNegativePairs,

        // Diagnostics & Warnings
        warnings,
        dataQuality: {
            confidenceLevel,
            coverageRatio,
            observationCount: T,
            evaluationTimestamp: asOfDateISO
        }
    };
}
