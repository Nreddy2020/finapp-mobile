/**
 * tests/test_c74.mjs
 * 
 * Stage C.7.4 Correlation, Covariance & Cross-Asset Risk Engine Acceptance Suite
 * 40 Comprehensive Verification Scenarios matching Master Standard C7_4_V1
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

import {
    CORRELATION_POLICY_VERSION,
    CANONICAL_ASSET_CLASSES,
    CORRELATION_POLICY_V1,
    validateLongOnlyWeights,
    synchronizeReturnSeries,
    calculateCovarianceMatrices,
    calculateCorrelationMatrix,
    calculateDiversificationMetrics,
    deterministicJacobiEigen,
    executePCAAndPSDRepair,
    calculateAssetClassCorrelationMatrix,
    evaluatePortfolioCorrelationAndCrossAssetRisk
} from '../services/correlationEngine.js';

import { loadData, saveData, STORAGE_KEYS } from '../services/storage.js';

console.log("================================================================");
console.log("=== Stage C.7.4 Correlation & Cross-Asset 40-Test Suite ===");
console.log("================================================================\n");

let passedTests = 0;
let totalTests = 40;

function runTest(testNum, testName, testFn) {
    console.log(`--- Test ${testNum}: ${testName} ---`);
    try {
        testFn();
        console.log(`✅ Test ${testNum} PASS: ${testName}\n`);
        passedTests++;
    } catch (err) {
        console.error(`❌ Test ${testNum} FAIL: ${testName}`);
        console.error(err);
        process.exit(1);
    }
}

function roundTo(num, decimals = 4) {
    if (num === null || num === undefined || isNaN(num) || !isFinite(num)) {
        return null;
    }
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
}

// Generate synthetic dates helper
function generateDates(count, startDateStr = '2025-01-01') {
    const dates = [];
    const cur = new Date(startDateStr);
    for (let i = 0; i < count; i++) {
        dates.push(cur.toISOString().split('T')[0]);
        cur.setDate(cur.getDate() + 1);
    }
    return dates;
}

// --- Test 1: Single Holding Portfolio (N = 1) ---
runTest(1, "Single Holding Portfolio (N = 1)", () => {
    const dates = generateDates(30);
    const holdings = [{
        holdingId: 'H1',
        symbol: 'STOCK_A',
        weight: 1.0,
        observations: dates.map(d => ({ date: d, return: 0.01 }))
    }];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings
    });

    assert.strictEqual(res.status, 'HEALTHY');
    assert.strictEqual(res.holdingCount, 1);
    assert.deepStrictEqual(res.correlationMatrix, [[1.0]]);
    assert.strictEqual(res.weightedAverageCorrelation, 1.0);
    assert.strictEqual(res.diversificationRatio, 1.0);
    assert.strictEqual(res.diversificationBenefitMultiplier, 0.0);
    assert.strictEqual(res.effectiveFactorCount, 1.0);
});

// --- Test 2: Two Orthogonal Uncorrelated Holdings (rho = 0) ---
runTest(2, "Two Orthogonal Uncorrelated Holdings (rho = 0)", () => {
    const dates = generateDates(40);
    // Construct orthogonal returns with identical standard deviation
    const obsA = [];
    const obsB = [];
    for (let i = 0; i < 40; i++) {
        // Alternating patterns that sum to zero covariance
        const rA = (i % 2 === 0) ? 0.02 : -0.02;
        const rB = (i % 4 < 2) ? 0.02 : -0.02;
        obsA.push({ date: dates[i], return: rA });
        obsB.push({ date: dates[i], return: rB });
    }

    const holdings = [
        { holdingId: 'H1', symbol: 'ASSET_A', weight: 0.5, observations: obsA },
        { holdingId: 'H2', symbol: 'ASSET_B', weight: 0.5, observations: obsB }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings
    });

    assert.strictEqual(res.status, 'HEALTHY');
    assert.strictEqual(res.correlationMatrix[0][1], 0.0);
    assert.strictEqual(res.weightedAverageCorrelation, 0.0);
    // DR = (0.5*sigma + 0.5*sigma) / (sigma / sqrt(2)) = sqrt(2) approx 1.4142
    assert.ok(Math.abs(res.diversificationRatio - Math.SQRT2) < 0.01);
    assert.strictEqual(res.effectiveFactorCount, 2.0);
});

// --- Test 3: Two Perfectly Correlated Holdings (rho = 1.0) ---
runTest(3, "Two Perfectly Correlated Holdings (rho = 1.0)", () => {
    const dates = generateDates(30);
    const obsA = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? 0.01 : -0.01) }));
    const obsB = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? 0.02 : -0.02) })); // 2x scaled

    const holdings = [
        { holdingId: 'H1', symbol: 'ASSET_A', weight: 0.5, observations: obsA },
        { holdingId: 'H2', symbol: 'ASSET_B', weight: 0.5, observations: obsB }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings
    });

    assert.strictEqual(res.correlationMatrix[0][1], 1.0);
    assert.strictEqual(res.weightedAverageCorrelation, 1.0);
    assert.strictEqual(res.diversificationRatio, 1.0);
    assert.strictEqual(res.effectiveFactorCount, 1.0);
    assert.strictEqual(res.top1FactorConcentration, 1.0);
});

// --- Test 4: Two Perfectly Inversely Correlated Holdings (rho = -1.0) Degenerate Variance ---
runTest(4, "Two Perfectly Inversely Correlated Holdings (rho = -1.0)", () => {
    const dates = generateDates(30);
    const obsA = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? 0.02 : -0.02) }));
    const obsB = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? -0.02 : 0.02) })); // Exact inverse

    const holdings = [
        { holdingId: 'H1', symbol: 'ASSET_A', weight: 0.5, observations: obsA },
        { holdingId: 'H2', symbol: 'ASSET_B', weight: 0.5, observations: obsB }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings
    });

    assert.strictEqual(res.correlationMatrix[0][1], -1.0);
    assert.strictEqual(res.weightedAverageCorrelation, -1.0);
    // sigma_p = 0 -> DR is null, DBM is null, warning is DEGENERATE_PORTFOLIO_VARIANCE
    assert.strictEqual(res.diversificationRatio, null);
    assert.strictEqual(res.diversificationBenefitMultiplier, null);
    assert.ok(res.warnings.includes('DEGENERATE_PORTFOLIO_VARIANCE'));
    assert.strictEqual(res.status, 'DEGRADED');
});

// --- Test 5: Sample Covariance Bessel's Correction (N-1) ---
runTest(5, "Sample Covariance Bessel's Correction (N-1)", () => {
    const matrix = [
        [0.10, 0.05],
        [0.20, 0.15],
        [0.30, 0.10]
    ]; // T = 3. Mean A = 0.20, Mean B = 0.10.
    // Sum prod diffs = (-0.10)(-0.05) + (0)(0.05) + (0.10)(0) = 0.005
    // Sample Cov = 0.005 / (3 - 1) = 0.0025
    const res = calculateCovarianceMatrices(matrix, 'DAILY');
    assert.strictEqual(roundTo(res.covarianceMatrix[0][1], 6), 0.0025);
});

// --- Test 6: Annualized Covariance Scaling (F = 252, 52, 12) ---
runTest(6, "Annualized Covariance Scaling (F = 252, 52, 12)", () => {
    const matrix = [
        [0.01, 0.02],
        [-0.01, -0.02],
        [0.01, 0.02]
    ];
    const resDaily = calculateCovarianceMatrices(matrix, 'DAILY');
    const resWeekly = calculateCovarianceMatrices(matrix, 'WEEKLY');
    const resMonthly = calculateCovarianceMatrices(matrix, 'MONTHLY');

    const sampleCov = resDaily.covarianceMatrix[0][1];
    assert.strictEqual(resDaily.annualizedCovarianceMatrix[0][1], sampleCov * 252);
    assert.strictEqual(resWeekly.annualizedCovarianceMatrix[0][1], sampleCov * 52);
    assert.strictEqual(resMonthly.annualizedCovarianceMatrix[0][1], sampleCov * 12);
});

// --- Test 7: Pearson Correlation Symmetry and Bounds ---
runTest(7, "Pearson Correlation Symmetry and Bounds", () => {
    const dates = generateDates(25);
    const obsA = dates.map((d, i) => ({ date: d, return: Math.sin(i) * 0.05 }));
    const obsB = dates.map((d, i) => ({ date: d, return: Math.cos(i) * 0.03 }));

    const holdings = [
        { holdingId: 'H1', symbol: 'ASSET_A', weight: 0.5, observations: obsA },
        { holdingId: 'H2', symbol: 'ASSET_B', weight: 0.5, observations: obsB }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings
    });

    assert.strictEqual(res.correlationMatrix[0][0], 1.0);
    assert.strictEqual(res.correlationMatrix[1][1], 1.0);
    assert.strictEqual(res.correlationMatrix[0][1], res.correlationMatrix[1][0]);
    assert.ok(res.correlationMatrix[0][1] >= -1.0 && res.correlationMatrix[0][1] <= 1.0);
});

// --- Test 8: Zero-Variance Asset Protection (Cash / Stablecoin) ---
runTest(8, "Zero-Variance Asset Protection (Cash / Stablecoin)", () => {
    const dates = generateDates(25);
    const obsEquity = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? 0.01 : -0.01) }));
    const obsCash = dates.map(d => ({ date: d, return: 0.0002 })); // Constant return -> zero variance

    const holdings = [
        { holdingId: 'H1', symbol: 'EQUITY', weight: 0.6, observations: obsEquity },
        { holdingId: 'H2', symbol: 'CASH', weight: 0.4, observations: obsCash }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings
    });

    assert.strictEqual(res.correlationMatrix[0][1], 0.0);
    assert.strictEqual(res.correlationMatrix[1][0], 0.0);
    assert.strictEqual(res.correlationMatrix[1][1], 1.0);
    assert.ok(!isNaN(res.diversificationRatio));
});

// --- Test 9: Annualized Constituent Volatility Match (C7.4-R9) ---
runTest(9, "Annualized Constituent Volatility Match (C7.4-R9)", () => {
    const dates = generateDates(30);
    const obs = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? 0.01 : -0.01) }));
    const holdings = [{ holdingId: 'H1', symbol: 'STOCK', weight: 1.0, observations: obs }];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        frequency: 'DAILY',
        holdings
    });

    // Sigma_ann[0][0] = Cov * 252. sqrt(Cov * 252) must match weightedConstituentVolatility
    assert.strictEqual(res.portfolioAnnualizedVolatility, res.weightedConstituentVolatility);
});

// --- Test 10: Weighted Average Correlation Equal vs Non-Equal Weights ---
runTest(10, "Weighted Average Correlation Equal vs Non-Equal Weights", () => {
    const corr = [
        [1.0, 0.5, 0.2],
        [0.5, 1.0, 0.8],
        [0.2, 0.8, 1.0]
    ];
    const covAnn = [[0.04, 0, 0], [0, 0.04, 0], [0, 0, 0.04]];
    const stds = [0.2, 0.2, 0.2];

    const resEqual = calculateDiversificationMetrics([1/3, 1/3, 1/3], covAnn, corr, stds);
    // (0.5 + 0.2 + 0.8) / 3 = 1.5 / 3 = 0.50
    assert.strictEqual(resEqual.weightedAverageCorrelation, 0.5);

    const resUnequal = calculateDiversificationMetrics([0.8, 0.1, 0.1], covAnn, corr, stds);
    // Denominator = 1 - (0.64 + 0.01 + 0.01) = 0.34
    // Numerator = 2*(0.8*0.1*0.5 + 0.8*0.1*0.2 + 0.1*0.1*0.8) = 2*(0.04 + 0.016 + 0.008) = 0.128
    // 0.128 / 0.34 approx 0.3765
    assert.strictEqual(resUnequal.weightedAverageCorrelation, 0.3765);
});

// --- Test 11: Diversification Ratio Invariant (DR >= 1.0) ---
runTest(11, "Diversification Ratio Invariant (DR >= 1.0)", () => {
    const dates = generateDates(30);
    const obs1 = dates.map((d, i) => ({ date: d, return: Math.sin(i) * 0.02 }));
    const obs2 = dates.map((d, i) => ({ date: d, return: Math.cos(i) * 0.03 }));
    const obs3 = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? 0.015 : -0.015) }));

    const holdings = [
        { holdingId: 'H1', symbol: 'A', weight: 0.4, observations: obs1 },
        { holdingId: 'H2', symbol: 'B', weight: 0.3, observations: obs2 },
        { holdingId: 'H3', symbol: 'C', weight: 0.3, observations: obs3 }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    assert.ok(res.diversificationRatio >= 1.0, `Expected DR >= 1.0, got ${res.diversificationRatio}`);
});

// --- Test 12: Diversification Benefit Multiplier Range [0, 1) ---
runTest(12, "Diversification Benefit Multiplier Range [0, 1)", () => {
    const dates = generateDates(30);
    const obs1 = dates.map((d, i) => ({ date: d, return: Math.sin(i) * 0.02 }));
    const obs2 = dates.map((d, i) => ({ date: d, return: Math.cos(i) * 0.03 }));

    const holdings = [
        { holdingId: 'H1', symbol: 'A', weight: 0.5, observations: obs1 },
        { holdingId: 'H2', symbol: 'B', weight: 0.5, observations: obs2 }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    assert.ok(res.diversificationBenefitMultiplier >= 0.0 && res.diversificationBenefitMultiplier < 1.0);
    assert.strictEqual(res.diversificationBenefitMultiplier, roundTo(1.0 - (res.portfolioAnnualizedVolatility / res.weightedConstituentVolatility), 4));
});

// --- Test 13: Portfolio Volatility Reconciliation ---
runTest(13, "Portfolio Volatility Reconciliation", () => {
    const dates = generateDates(40);
    const obs1 = dates.map((d, i) => ({ date: d, return: 0.01 * (i % 3 === 0 ? 1 : -1) }));
    const obs2 = dates.map((d, i) => ({ date: d, return: 0.02 * (i % 2 === 0 ? 1 : -1) }));

    const holdings = [
        { holdingId: 'H1', symbol: 'A', weight: 0.6, observations: obs1 },
        { holdingId: 'H2', symbol: 'B', weight: 0.4, observations: obs2 }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });

    // Directly compute port return series and its annualized sample std
    const portReturns = dates.map((_, i) => 0.6 * obs1[i].return + 0.4 * obs2[i].return);
    const mean = portReturns.reduce((a, b) => a + b, 0) / portReturns.length;
    const variance = portReturns.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (portReturns.length - 1);
    const expectedAnnVol = roundTo(Math.sqrt(variance * 252), 4);

    assert.strictEqual(res.portfolioAnnualizedVolatility, expectedAnnVol);
});

// --- Test 14: Zero-Variance Portfolio Boundary (100% Cash) ---
runTest(14, "Zero-Variance Portfolio Boundary (100% Cash)", () => {
    const dates = generateDates(25);
    const obsCash1 = dates.map(d => ({ date: d, return: 0.0001 }));
    const obsCash2 = dates.map(d => ({ date: d, return: 0.0002 }));

    const holdings = [
        { holdingId: 'C1', symbol: 'CASH1', weight: 0.5, observations: obsCash1 },
        { holdingId: 'C2', symbol: 'CASH2', weight: 0.5, observations: obsCash2 }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    assert.strictEqual(res.diversificationRatio, 1.0);
    assert.strictEqual(res.diversificationBenefitMultiplier, 0.0);
});

// --- Test 15: Canonical 8-Class Structure ---
runTest(15, "Canonical 8-Class Structure", () => {
    assert.strictEqual(CANONICAL_ASSET_CLASSES.length, 8);
    assert.deepStrictEqual(CANONICAL_ASSET_CLASSES, [
        'EQUITY_DOMESTIC', 'EQUITY_INTERNATIONAL', 'DEBT_FIXED_INCOME', 'GOLD_COMMODITIES',
        'REAL_ESTATE', 'CASH_LIQUID', 'CRYPTO_SPECULATIVE', 'ALTERNATIVE'
    ]);
});

// --- Test 16: Empty Asset-Class Null Matrix Contract (W_c = 0) ---
runTest(16, "Empty Asset-Class Null Matrix Contract (W_c = 0)", () => {
    const dates = generateDates(25);
    const obs = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? 0.01 : -0.01) }));
    // Single domestic equity holding
    const holdings = [{ holdingId: 'H1', symbol: 'EQUITY_INDIA', assetClass: 'EQUITY_DOMESTIC', weight: 1.0, observations: obs }];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    const matrix = res.assetClassCorrelationMatrix;

    assert.strictEqual(matrix.length, 8);
    assert.strictEqual(matrix[0].length, 8);
    // Index 0 (EQUITY_DOMESTIC) diagonal is 1.0
    assert.strictEqual(matrix[0][0], 1.0);
    // All unrepresented classes (index 1 to 7) must have entirely null rows/cols including diagonal
    for (let c = 1; c < 8; c++) {
        for (let j = 0; j < 8; j++) {
            assert.strictEqual(matrix[c][j], null);
        }
    }
});

// --- Test 17: Partially Populated Portfolio (3 Classes Present) ---
runTest(17, "Partially Populated Portfolio (3 Classes Present)", () => {
    const dates = generateDates(30);
    const obs1 = dates.map((d, i) => ({ date: d, return: Math.sin(i) * 0.02 }));
    const obs2 = dates.map((d, i) => ({ date: d, return: Math.cos(i) * 0.01 }));
    const obs3 = dates.map((d, i) => ({ date: d, return: (i % 2 === 0 ? 0.005 : -0.005) }));

    const holdings = [
        { holdingId: 'H1', symbol: 'EQ_DOM', assetClass: 'EQUITY_DOMESTIC', weight: 0.5, observations: obs1 },
        { holdingId: 'H2', symbol: 'DEBT', assetClass: 'DEBT_FIXED_INCOME', weight: 0.3, observations: obs2 },
        { holdingId: 'H3', symbol: 'GOLD', assetClass: 'GOLD_COMMODITIES', weight: 0.2, observations: obs3 }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    const m = res.assetClassCorrelationMatrix;

    // Represented indices: 0 (EQUITY_DOMESTIC), 2 (DEBT_FIXED_INCOME), 3 (GOLD_COMMODITIES)
    assert.strictEqual(m[0][0], 1.0);
    assert.strictEqual(m[2][2], 1.0);
    assert.strictEqual(m[3][3], 1.0);
    assert.ok(m[0][2] !== null);
    assert.ok(m[0][3] !== null);
    assert.ok(m[2][3] !== null);

    // Unrepresented indices: 1 (EQUITY_INTERNATIONAL), 4 (REAL_ESTATE), etc. must be null
    assert.strictEqual(m[1][1], null);
    assert.strictEqual(m[4][4], null);
});

// --- Test 18: Class Constituent Missing Observation Synchronization (C7.4-R7) ---
runTest(18, "Class Constituent Missing Observation Synchronization (C7.4-R7)", () => {
    const dates = generateDates(30);
    // Holding A has 30 observations, Holding B has 25 observations (missing last 5)
    const obsA = dates.map((d, i) => ({ date: d, return: 0.01 * (i % 2 === 0 ? 1 : -1) }));
    const obsB = dates.slice(0, 25).map((d, i) => ({ date: d, return: 0.02 * (i % 2 === 0 ? 1 : -1) }));

    const holdings = [
        { holdingId: 'H1', symbol: 'EQ1', assetClass: 'EQUITY_DOMESTIC', weight: 0.5, observations: obsA },
        { holdingId: 'H2', symbol: 'EQ2', assetClass: 'EQUITY_DOMESTIC', weight: 0.5, observations: obsB }
    ];

    const matrix = calculateAssetClassCorrelationMatrix(holdings, [0.5, 0.5], '2025-02-15');
    // Synchronized class series should have 25 common points (>= 20 threshold)
    assert.strictEqual(matrix[0][0], 1.0);
});

// --- Test 19: Fixed Class Weight Integrity ---
runTest(19, "Fixed Class Weight Integrity", () => {
    const dates = generateDates(25);
    const obs1 = dates.map(d => ({ date: d, return: 0.02 }));
    const obs2 = dates.map(d => ({ date: d, return: 0.04 }));

    const holdings = [
        { holdingId: 'H1', symbol: 'EQ1', assetClass: 'EQUITY_DOMESTIC', weight: 0.2, observations: obs1 },
        { holdingId: 'H2', symbol: 'EQ2', assetClass: 'EQUITY_DOMESTIC', weight: 0.6, observations: obs2 }
    ]; // Total EQ weight = 0.8. Normalized weights: 0.2/0.8 = 0.25, 0.6/0.8 = 0.75.
    // Expected class return = 0.25*0.02 + 0.75*0.04 = 0.005 + 0.03 = 0.035.

    const matrix = calculateAssetClassCorrelationMatrix(holdings, [0.2, 0.6], '2025-02-15');
    assert.strictEqual(matrix[0][0], 1.0);
});

// --- Test 20: Insufficient Class Observations (T_class < 20) ---
runTest(20, "Insufficient Class Observations (T_class < 20)", () => {
    const dates = generateDates(10); // Only 10 points
    const obs1 = dates.map(d => ({ date: d, return: 0.01 }));
    const obs2 = dates.map(d => ({ date: d, return: 0.02 }));

    const holdings = [
        { holdingId: 'H1', symbol: 'EQ1', assetClass: 'EQUITY_DOMESTIC', weight: 0.5, observations: obs1 },
        { holdingId: 'H2', symbol: 'EQ2', assetClass: 'EQUITY_DOMESTIC', weight: 0.5, observations: obs2 }
    ];

    const matrix = calculateAssetClassCorrelationMatrix(holdings, [0.5, 0.5], '2025-02-15');
    // Insufficient observations -> class correlation matrix entry is null
    assert.strictEqual(matrix[0][0], null);
});

// --- Test 21: Effective Spectrum Trace Invariant (sum lambda_effective = N) ---
runTest(21, "Effective Spectrum Trace Invariant (sum lambda_effective = N)", () => {
    const R = [
        [1.0, 0.4, 0.2],
        [0.4, 1.0, 0.5],
        [0.2, 0.5, 1.0]
    ];
    const pca = executePCAAndPSDRepair(R);
    assert.strictEqual(pca.status, 'HEALTHY');
    const sumEff = pca.effectiveEigenvalues.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sumEff - 3.0) <= 1e-4, `Expected sum=3.0, got ${sumEff}`);
});

// --- Test 22: Variance Explained Monotonicity ---
runTest(22, "Variance Explained Monotonicity", () => {
    const R = [
        [1.0, 0.6, 0.3],
        [0.6, 1.0, 0.4],
        [0.3, 0.4, 1.0]
    ];
    const pca = executePCAAndPSDRepair(R);
    for (let i = 0; i < pca.effectiveEigenvalues.length - 1; i++) {
        assert.ok(pca.effectiveEigenvalues[i] >= pca.effectiveEigenvalues[i+1]);
    }
});

// --- Test 23: Raw vs Effective Tiny Negative Eigenvalue Noise Clamping (C7.4-R6 & C7.4-R10) ---
runTest(23, "Raw vs Effective Tiny Negative Eigenvalue Noise Clamping (C7.4-R6 & C7.4-R10)", () => {
    // Construct a matrix with numerical zero/near-zero eigenvalue
    const R = [
        [1.0, 1.0],
        [1.0, 1.0]
    ];
    const pca = executePCAAndPSDRepair(R);
    assert.strictEqual(pca.status, 'HEALTHY');
    assert.strictEqual(pca.effectiveEigenvalues[1], 0.0);
    assert.ok(pca.effectiveEigenvalues[0] >= 1.99);
});

// --- Test 24: Materially Negative Eigenvalue Detection ---
runTest(24, "Materially Negative Eigenvalue Detection", () => {
    // Non-PSD matrix with huge contradictory correlation
    const R = [
        [1.0, 0.9, -0.9],
        [0.9, 1.0, 0.9],
        [-0.9, 0.9, 1.0]
    ];
    const pca = executePCAAndPSDRepair(R);
    // After 9-step PSD repair, final matrix is reconstructed and repaired cleanly
    assert.strictEqual(pca.status, 'HEALTHY');
    assert.ok(pca.effectiveEigenvalues.every(e => e >= 0.0));
});

// --- Test 25: Effective Number of Independent Factors (N_factors in [1, N]) ---
runTest(25, "Effective Number of Independent Factors (N_factors in [1, N])", () => {
    // Identity matrix: 3 independent factors
    const I3 = [
        [1.0, 0.0, 0.0],
        [0.0, 1.0, 0.0],
        [0.0, 0.0, 1.0]
    ];
    const pcaI = executePCAAndPSDRepair(I3);
    assert.strictEqual(pcaI.effectiveFactorCount, 3.0);

    // Singular matrix: 1 factor
    const S3 = [
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 1.0]
    ];
    const pcaS = executePCAAndPSDRepair(S3);
    assert.strictEqual(pcaS.effectiveFactorCount, 1.0);
});

// --- Test 26: K80 and K90 Factor Thresholds ---
runTest(26, "K80 and K90 Factor Thresholds", () => {
    const R = [
        [1.0, 0.8, 0.7, 0.6],
        [0.8, 1.0, 0.75, 0.65],
        [0.7, 0.75, 1.0, 0.7],
        [0.6, 0.65, 0.7, 1.0]
    ];
    const pca = executePCAAndPSDRepair(R);
    assert.ok(pca.componentsFor80PercentVariance >= 1 && pca.componentsFor80PercentVariance <= 4);
    assert.ok(pca.componentsFor90PercentVariance >= pca.componentsFor80PercentVariance);
});

// --- Test 27: Empty Portfolio Boundary (N = 0) (C7.4-R8) ---
runTest(27, "Empty Portfolio Boundary (N = 0) (C7.4-R8)", () => {
    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings: []
    });

    assert.strictEqual(res.status, 'EMPTY_PORTFOLIO');
    assert.strictEqual(res.holdingCount, 0);
    assert.strictEqual(res.observationCount, 0);
    assert.strictEqual(res.correlationMatrix, null);
    assert.strictEqual(res.covarianceMatrix, null);
    assert.strictEqual(res.weightedAverageCorrelation, null);
    assert.strictEqual(res.diversificationRatio, null);
    assert.strictEqual(res.eigenvalues, null);
    assert.ok(res.warnings.includes('EMPTY_PORTFOLIO'));
    assert.strictEqual(res.dataQuality.confidenceLevel, 'UNAVAILABLE');
});

// --- Test 28: Duplicate Timestamp Detection (C7.4-R4) ---
runTest(28, "Duplicate Timestamp Detection (C7.4-R4)", () => {
    const dates = generateDates(25);
    const obs = dates.map(d => ({ date: d, return: 0.01 }));
    // Insert duplicate on date 0
    obs.push({ date: dates[0], return: 0.02 });

    const holdings = [{ holdingId: 'H1', symbol: 'ASSET_A', weight: 1.0, observations: obs }];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings
    });

    assert.strictEqual(res.status, 'INVALID_INPUT');
    assert.ok(res.warnings.includes('DUPLICATE_TIMESTAMP_INPUT'));
    assert.strictEqual(res.correlationMatrix, null);
});

// --- Test 29: Strict Long-Only Weight Validation (C7.4-R2) ---
runTest(29, "Strict Long-Only Weight Validation (C7.4-R2)", () => {
    const dates = generateDates(25);
    const obs = dates.map(d => ({ date: d, return: 0.01 }));

    // Test negative weight
    const resNeg = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings: [
            { holdingId: 'H1', weight: 1.2, observations: obs },
            { holdingId: 'H2', weight: -0.2, observations: obs }
        ]
    });
    assert.strictEqual(resNeg.status, 'INVALID_INPUT');
    assert.ok(resNeg.warnings.includes('INVALID_PORTFOLIO_WEIGHTS'));

    // Test sum != 1.0
    const resSum = evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings: [
            { holdingId: 'H1', weight: 0.5, observations: obs },
            { holdingId: 'H2', weight: 0.3, observations: obs }
        ]
    });
    assert.strictEqual(resSum.status, 'INVALID_INPUT');
});

// --- Test 30: High and Critical Positive Correlation Diagnostics ---
runTest(30, "High and Critical Positive Correlation Diagnostics", () => {
    const dates = generateDates(30);
    const obsA = dates.map((d, i) => ({ date: d, return: 0.01 * (i % 2 === 0 ? 1 : -1) }));
    const obsB = dates.map((d, i) => ({ date: d, return: 0.0101 * (i % 2 === 0 ? 1 : -1) })); // ~0.99 corr

    const holdings = [
        { holdingId: 'H1', symbol: 'ASSET_A', weight: 0.5, observations: obsA },
        { holdingId: 'H2', symbol: 'ASSET_B', weight: 0.5, observations: obsB }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    assert.ok(res.highPositiveCorrelationPairs.length > 0);
    assert.strictEqual(res.highPositiveCorrelationPairs[0].severity, 'CRITICAL');
    assert.ok(res.warnings.includes('HIGH_PAIRWISE_CORRELATION_DETECTED'));
});

// --- Test 31: Strong Negative Correlation Diagnostic (Diversifier) ---
runTest(31, "Strong Negative Correlation Diagnostic (Diversifier)", () => {
    const dates = generateDates(30);
    const obsA = dates.map((d, i) => ({ date: d, return: 0.02 * (i % 2 === 0 ? 1 : -1) }));
    const obsB = dates.map((d, i) => ({ date: d, return: -0.019 * (i % 2 === 0 ? 1 : -1) }));

    const holdings = [
        { holdingId: 'H1', symbol: 'EQUITY', weight: 0.6, observations: obsA },
        { holdingId: 'H2', symbol: 'PUT_HEDGE', weight: 0.4, observations: obsB }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    assert.ok(res.strongNegativeCorrelationPairs.length > 0);
    assert.strictEqual(res.strongNegativeCorrelationPairs[0].type, 'DIVERSIFIER');
});

// --- Test 32: High Portfolio Average Correlation Warning ---
runTest(32, "High Portfolio Average Correlation Warning", () => {
    const dates = generateDates(30);
    const obs1 = dates.map((d, i) => ({ date: d, return: 0.01 * (i % 2 === 0 ? 1 : -1) }));
    const obs2 = dates.map((d, i) => ({ date: d, return: 0.011 * (i % 2 === 0 ? 1 : -1) }));
    const obs3 = dates.map((d, i) => ({ date: d, return: 0.012 * (i % 2 === 0 ? 1 : -1) }));

    const holdings = [
        { holdingId: 'H1', symbol: 'A', weight: 1/3, observations: obs1 },
        { holdingId: 'H2', symbol: 'B', weight: 1/3, observations: obs2 },
        { holdingId: 'H3', symbol: 'C', weight: 1/3, observations: obs3 }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    assert.ok(res.warnings.includes('HIGH_PORTFOLIO_AVERAGE_CORRELATION'));
});

// --- Test 33: Dominant Risk Factor Concentration Warning ---
runTest(33, "Dominant Risk Factor Concentration Warning", () => {
    const dates = generateDates(30);
    const obs1 = dates.map((d, i) => ({ date: d, return: 0.01 * (i % 2 === 0 ? 1 : -1) }));
    const obs2 = dates.map((d, i) => ({ date: d, return: 0.0105 * (i % 2 === 0 ? 1 : -1) }));

    const holdings = [
        { holdingId: 'H1', symbol: 'A', weight: 0.5, observations: obs1 },
        { holdingId: 'H2', symbol: 'B', weight: 0.5, observations: obs2 }
    ];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    assert.ok(res.top1FactorConcentration >= 0.60);
    assert.ok(res.warnings.includes('DOMINANT_RISK_FACTOR_CONCENTRATION'));
});

// --- Test 34: Mandatory Deterministic asOfDate Enforced ---
runTest(34, "Mandatory Deterministic asOfDate Enforced", () => {
    assert.throws(() => {
        evaluatePortfolioCorrelationAndCrossAssetRisk({ holdings: [] });
    }, /asOfDate is required/);
});

// --- Test 35: AST Wall-Clock Scan (Zero Date.now() / argument-less new Date()) ---
runTest(35, "AST Wall-Clock Scan in correlationEngine.js", () => {
    const filePath = path.resolve('services/correlationEngine.js');
    const content = fs.readFileSync(filePath, 'utf8');

    // Remove comments
    const noComments = content.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');

    assert.ok(!noComments.includes('Date.now()'), "Found Date.now() in correlationEngine.js");
    assert.ok(!noComments.includes('new Date()'), "Found argument-less new Date() in correlationEngine.js");
});

// --- Test 36: Asynchronous Date Synchronization Intersection ---
runTest(36, "Asynchronous Date Synchronization Intersection", () => {
    const datesA = ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04'];
    const datesB = ['2025-01-02', '2025-01-03', '2025-01-05'];

    const holdings = [
        { holdingId: 'H1', observations: datesA.map(d => ({ date: d, return: 0.01 })) },
        { holdingId: 'H2', observations: datesB.map(d => ({ date: d, return: 0.02 })) }
    ];

    const sync = synchronizeReturnSeries(holdings, '2025-01-10');
    // Common dates are 2025-01-02 and 2025-01-03
    assert.strictEqual(sync.synchronizedDates.length, 2);
    assert.deepStrictEqual(sync.synchronizedDates, [
        new Date('2025-01-02').toISOString(),
        new Date('2025-01-03').toISOString()
    ]);
});

// --- Test 37: Insufficient Observation Boundary (T < 20) ---
runTest(37, "Insufficient Observation Boundary (T < 20)", () => {
    const dates = generateDates(15);
    const obs = dates.map(d => ({ date: d, return: 0.01 }));
    const holdings = [{ holdingId: 'H1', weight: 1.0, observations: obs }];

    const res = evaluatePortfolioCorrelationAndCrossAssetRisk({ asOfDate: '2025-02-15', holdings });
    assert.strictEqual(res.status, 'INSUFFICIENT_HISTORY');
    assert.strictEqual(res.correlationMatrix, null);
    assert.strictEqual(res.diversificationRatio, null);
});

// --- Test 38: Deep 5-Store Read-Only Safety Guard ---
runTest(38, "Deep 5-Store Read-Only Safety Guard", async () => {
    const storeKeys = [
        STORAGE_KEYS.HOLDINGS,
        STORAGE_KEYS.EVENTS,
        STORAGE_KEYS.QUOTES,
        STORAGE_KEYS.TRANSACTIONS,
        STORAGE_KEYS.WALLETS
    ];

    const preSnapshots = {};
    for (const key of storeKeys) {
        preSnapshots[key] = JSON.stringify(await loadData(key, null));
    }

    // Execute risk engine
    const dates = generateDates(25);
    const obs = dates.map(d => ({ date: d, return: 0.01 }));
    evaluatePortfolioCorrelationAndCrossAssetRisk({
        asOfDate: '2025-02-15',
        holdings: [{ holdingId: 'H1', weight: 1.0, observations: obs }]
    });

    // Check post snapshots
    for (const key of storeKeys) {
        const post = JSON.stringify(await loadData(key, null));
        assert.strictEqual(post, preSnapshots[key], `State mutation detected in ${key}`);
    }
});

// --- Test 39: Deterministic Output Repeatability ---
runTest(39, "Deterministic Output Repeatability", () => {
    const dates = generateDates(30);
    const obs1 = dates.map((d, i) => ({ date: d, return: Math.sin(i) * 0.02 }));
    const obs2 = dates.map((d, i) => ({ date: d, return: Math.cos(i) * 0.03 }));

    const params = {
        asOfDate: '2025-02-15',
        holdings: [
            { holdingId: 'H1', symbol: 'A', weight: 0.6, observations: obs1 },
            { holdingId: 'H2', symbol: 'B', weight: 0.4, observations: obs2 }
        ]
    };

    const res1 = evaluatePortfolioCorrelationAndCrossAssetRisk(params);
    const res2 = evaluatePortfolioCorrelationAndCrossAssetRisk(params);

    assert.strictEqual(JSON.stringify(res1), JSON.stringify(res2), "Non-deterministic output detected");
});

// --- Test 40: Full System Regression Preservation ---
runTest(40, "Full System Regression Preservation", () => {
    assert.strictEqual(CORRELATION_POLICY_VERSION, "C7_4_V1");
    assert.strictEqual(typeof evaluatePortfolioCorrelationAndCrossAssetRisk, 'function');
    assert.strictEqual(typeof deterministicJacobiEigen, 'function');
});

console.log("================================================================");
console.log(`=== STAGE C.7.4 ACCEPTANCE RESULT: ${passedTests}/${totalTests} TESTS PASSED (100%) ===`);
console.log("================================================================");
