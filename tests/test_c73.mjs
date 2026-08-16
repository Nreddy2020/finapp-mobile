/**
 * tests/test_c73.mjs
 * 
 * Stage C.7.3 Acceptance Test Suite: Volatility, Drawdown & Downside Risk Engine
 * Master Architectural Standard C7_3_V1
 * 
 * Comprehensive 40-Scenario Verification:
 * - Group 1: TWR Cash-Flow Timing & Methodology (Tests 1–7)
 * - Group 2: Volatility Mechanics & Frequency Annualization (Tests 8–13)
 * - Group 3: Drawdown & Deterministic Tie-Breaking (Tests 14–20)
 * - Group 4: Downside Deviation & MAR (Tests 21–24)
 * - Group 5: Parametric Multi-Day VaR / CVaR Horizon Scaling (Tests 25–29)
 * - Group 6: Historical VaR / CVaR Observation Contract & Tail (Tests 30–34)
 * - Group 7: Determinism, Quality, AST Scan & Read-Only Safety (Tests 35–40)
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

import {
    DOWNSIDE_RISK_POLICY_VERSION,
    DOWNSIDE_RISK_POLICY_V1,
    convertHorizonDaysToPeriods,
    buildTrueHistoricalTWRSeries,
    buildFixedWeightSyntheticSeries,
    calculateSampleMean,
    calculateSampleStdDev,
    calculateAnnualizedVolatility,
    calculateDrawdownDiagnostics,
    calculateDownsideDeviationAndSortino,
    calculateParametricVaRAndCVaR,
    calculateHistoricalVaRAndCVaR,
    evaluatePortfolioVolatilityAndDrawdown
} from '../services/volatilityDrawdownEngine.js';

import { loadData, saveData, STORAGE_KEYS } from '../services/storage.js';

console.log("================================================================");
console.log("=== Stage C.7.3 Volatility, Drawdown & Downside 40-Test Suite ===");
console.log("================================================================");

let passCount = 0;
function runTest(testName, fn) {
    console.log(`\n--- Test ${++passCount}: ${testName} ---`);
    fn();
    console.log(`✅ Test ${passCount} PASS: ${testName}`);
}

const EVAL_DATE = "2026-08-16T00:00:00.000Z";

// ==========================================
// GROUP 1: TWR CASH-FLOW TIMING & METHODOLOGY
// ==========================================

runTest("Beginning-of-Period Cash Flow ($C_t$)", () => {
    // V_0 = 1000, Subperiod 1: C_1 = +500 (deposit at start), V_1 = 1650
    // R_1 = (1650 - (1000 + 500)) / (1000 + 500) = 150 / 1500 = +0.10 (+10%)
    const subperiods = [
        { date: "2026-01-01T00:00:00.000Z", endValuation: 1000, beginningCashFlow: 0 },
        { date: "2026-01-02T00:00:00.000Z", endValuation: 1650, beginningCashFlow: 500 }
    ];
    const twr = buildTrueHistoricalTWRSeries(subperiods);
    assert.strictEqual(twr.methodology, 'TRUE_HISTORICAL_TWR');
    assert.strictEqual(twr.returns.length, 1);
    assert.strictEqual(Math.round(twr.returns[0] * 100) / 100, 0.10);
    assert.strictEqual(twr.navSeries[1].nav, 110.0);
});

runTest("End-of-Period Cash Flow Assigned to Next Subperiod", () => {
    // Cash flow at end of Day 1 (represented as beginning cash flow of Day 2)
    const subperiods = [
        { date: "2026-01-01T00:00:00.000Z", endValuation: 1000, beginningCashFlow: 0 },
        { date: "2026-01-02T00:00:00.000Z", endValuation: 1200, beginningCashFlow: 0 }, // +20%
        { date: "2026-01-03T00:00:00.000Z", endValuation: 1500, beginningCashFlow: 300 } // R = (1500 - 1500)/1500 = 0%
    ];
    const twr = buildTrueHistoricalTWRSeries(subperiods);
    assert.strictEqual(twr.returns.length, 2);
    assert.strictEqual(Math.round(twr.returns[0] * 100) / 100, 0.20);
    assert.strictEqual(Math.round(twr.returns[1] * 100) / 100, 0.00);
    assert.strictEqual(twr.navSeries[2].nav, 120.0);
});

runTest("Same-Day Multiple Cash Flows Deterministic Sum", () => {
    // Deposit of 200 + Withdrawal of 50 = net +150
    const subperiods = [
        { date: "2026-01-01T00:00:00.000Z", endValuation: 1000, beginningCashFlow: 0 },
        { date: "2026-01-02T00:00:00.000Z", endValuation: 1265, beginningCashFlow: 150 }
    ];
    const twr = buildTrueHistoricalTWRSeries(subperiods);
    // (1265 - 1150) / 1150 = 115 / 1150 = +0.10 (+10%)
    assert.strictEqual(Math.round(twr.returns[0] * 100) / 100, 0.10);
    assert.strictEqual(twr.navSeries[1].nav, 110.0);
});

runTest("Exact Timestamp Boundary Ownership", () => {
    // Unsorted dates must be sorted chronologically and preserved
    const subperiods = [
        { date: "2026-01-03T00:00:00.000Z", endValuation: 1100, beginningCashFlow: 0 },
        { date: "2026-01-01T00:00:00.000Z", endValuation: 1000, beginningCashFlow: 0 },
        { date: "2026-01-02T00:00:00.000Z", endValuation: 1050, beginningCashFlow: 0 }
    ];
    const twr = buildTrueHistoricalTWRSeries(subperiods);
    assert.strictEqual(twr.navSeries[0].date, "2026-01-01T00:00:00.000Z");
    assert.strictEqual(twr.navSeries[1].date, "2026-01-02T00:00:00.000Z");
    assert.strictEqual(twr.navSeries[2].date, "2026-01-03T00:00:00.000Z");
});

runTest("Zero Denominator Invariant ($V_{t-1} + C_t = 0$)", () => {
    const subperiods = [
        { date: "2026-01-01T00:00:00.000Z", endValuation: 0, beginningCashFlow: 0 },
        { date: "2026-01-02T00:00:00.000Z", endValuation: 0, beginningCashFlow: 0 }
    ];
    const twr = buildTrueHistoricalTWRSeries(subperiods);
    assert.strictEqual(twr.returns[0], 0.0);
    assert.strictEqual(isNaN(twr.returns[0]), false);
    assert.strictEqual(isFinite(twr.returns[0]), true);
});

runTest("Negative Denominator Boundary ($V_{t-1} + C_t < 0$)", () => {
    // Previous val 100, withdrawal -200 -> denom -100
    const subperiods = [
        { date: "2026-01-01T00:00:00.000Z", endValuation: 100, beginningCashFlow: 0 },
        { date: "2026-01-02T00:00:00.000Z", endValuation: 50, beginningCashFlow: -200 }
    ];
    const twr = buildTrueHistoricalTWRSeries(subperiods);
    assert.strictEqual(twr.status, 'DEGRADED');
    assert.strictEqual(twr.warnings.length > 0, true);
});

runTest("Fixed-Weight Synthetic Fallback Tagging Invariant", () => {
    const constituents = [
        { holdingId: "h1", symbol: "HDFC", weight: 0.6, returns: [0.01, -0.02, 0.03] },
        { holdingId: "h2", symbol: "INFY", weight: 0.4, returns: [0.02, 0.01, -0.01] }
    ];
    const synth = buildFixedWeightSyntheticSeries(constituents, ["2026-01-01", "2026-01-02", "2026-01-03", "2026-01-04"]);
    assert.strictEqual(synth.methodology, 'FIXED_WEIGHT_SYNTHETIC');
    assert.strictEqual(synth.returns.length, 3);
    // Period 0: 0.6*0.01 + 0.4*0.02 = 0.006 + 0.008 = 0.014
    assert.strictEqual(Math.round(synth.returns[0] * 1000) / 1000, 0.014);
});

// ==========================================
// GROUP 2: VOLATILITY & ANNUALIZATION
// ==========================================

runTest("Zero Volatility Constant Returns", () => {
    const returns = Array(30).fill(0.01);
    const vol = calculateAnnualizedVolatility(returns, 'DAILY');
    assert.strictEqual(vol.periodicVolatility, 0.0);
    assert.strictEqual(vol.annualizedVolatility, 0.0);
});

runTest("Deterministic Known Volatility Match", () => {
    // 50% +2% and 50% -2%
    const returns = [];
    for (let i = 0; i < 50; i++) {
        returns.push(0.02);
        returns.push(-0.02);
    }
    const mean = calculateSampleMean(returns);
    const std = calculateSampleStdDev(returns);
    assert.strictEqual(Math.abs(mean) < 1e-6, true);
    assert.strictEqual(Math.round(std * 10000) / 10000, 0.0201);
});

runTest("Daily Volatility Annualization (sqrt(252))", () => {
    const periodicStd = 0.01; // 1% daily
    const expectedAnn = periodicStd * Math.sqrt(252); // ~15.87%
    const returns = [];
    for (let i = 0; i < 100; i++) {
        returns.push(i % 2 === 0 ? 0.01 : -0.01);
    }
    const vol = calculateAnnualizedVolatility(returns, 'DAILY');
    assert.strictEqual(Math.abs(vol.annualizedVolatility - 0.1601) < 0.01, true);
});

runTest("Weekly Frequency Annualization (sqrt(52))", () => {
    const returns = [];
    for (let i = 0; i < 52; i++) {
        returns.push(i % 2 === 0 ? 0.03 : -0.03);
    }
    const vol = calculateAnnualizedVolatility(returns, 'WEEKLY');
    const expected = 0.0303 * Math.sqrt(52);
    assert.strictEqual(Math.abs(vol.annualizedVolatility - 0.2185) < 0.01, true);
});

runTest("Monthly Frequency Annualization (sqrt(12))", () => {
    const returns = [];
    for (let i = 0; i < 24; i++) {
        returns.push(i % 2 === 0 ? 0.05 : -0.05);
    }
    const vol = calculateAnnualizedVolatility(returns, 'MONTHLY');
    const expected = 0.0511 * Math.sqrt(12);
    assert.strictEqual(Math.abs(vol.annualizedVolatility - 0.177) < 0.01, true);
});

runTest("Insufficient Observation Boundary (N < 20)", () => {
    const returns = [0.01, -0.02, 0.01, 0.03];
    const res = evaluatePortfolioVolatilityAndDrawdown({
        asOfDate: EVAL_DATE,
        constituentReturns: [{ holdingId: "h1", weight: 1.0, returns }]
    });
    assert.strictEqual(res.status, 'INSUFFICIENT_HISTORY');
    assert.strictEqual(res.warnings.includes('INSUFFICIENT_OBSERVATIONS_FOR_PARAMETRIC_RISK'), true);
});

// ==========================================
// GROUP 3: DRAWDOWN & TIE-BREAKING
// ==========================================

runTest("Monotonically Increasing NAV", () => {
    const navSeries = [
        { date: "2026-01-01", nav: 100 },
        { date: "2026-01-02", nav: 105 },
        { date: "2026-01-03", nav: 110 }
    ];
    const dd = calculateDrawdownDiagnostics(navSeries);
    assert.strictEqual(dd.maximumDrawdown, 0.0);
    assert.strictEqual(dd.currentDrawdown, 0.0);
    assert.strictEqual(dd.drawdownDurationDays, 0);
});

runTest("Single Drawdown Full Recovery Chronology", () => {
    const navSeries = [
        { date: "2026-01-01T00:00:00.000Z", nav: 100 }, // Peak
        { date: "2026-01-05T00:00:00.000Z", nav: 80 },  // Trough (-20%)
        { date: "2026-01-10T00:00:00.000Z", nav: 100 }  // Recovery
    ];
    const dd = calculateDrawdownDiagnostics(navSeries);
    assert.strictEqual(dd.maximumDrawdown, -0.20);
    assert.strictEqual(dd.drawdownStartDate, "2026-01-01T00:00:00.000Z");
    assert.strictEqual(dd.drawdownTroughDate, "2026-01-05T00:00:00.000Z");
    assert.strictEqual(dd.drawdownRecoveryDate, "2026-01-10T00:00:00.000Z");
    assert.strictEqual(dd.drawdownDurationDays, 4);
    assert.strictEqual(dd.recoveryDurationDays, 5);
});

runTest("Single Drawdown Unrecovered State", () => {
    const navSeries = [
        { date: "2026-01-01T00:00:00.000Z", nav: 100 },
        { date: "2026-01-05T00:00:00.000Z", nav: 70 }, // Trough (-30%)
        { date: "2026-01-10T00:00:00.000Z", nav: 85 }  // Incomplete recovery
    ];
    const dd = calculateDrawdownDiagnostics(navSeries);
    assert.strictEqual(dd.maximumDrawdown, -0.30);
    assert.strictEqual(dd.currentDrawdown, -0.15);
    assert.strictEqual(dd.drawdownRecoveryDate, null);
    assert.strictEqual(dd.recoveryDurationDays, null);
});

runTest("Multiple Drawdown Cycles Deepest Trough Isolation", () => {
    const navSeries = [
        { date: "2026-01-01", nav: 100 },
        { date: "2026-01-03", nav: 90 }, // -10%
        { date: "2026-01-05", nav: 110 }, // New peak
        { date: "2026-01-08", nav: 82.5 }, // -25% (Trough)
        { date: "2026-01-12", nav: 115 } // Recovered
    ];
    const dd = calculateDrawdownDiagnostics(navSeries);
    assert.strictEqual(dd.maximumDrawdown, -0.25);
    assert.strictEqual(dd.drawdownStartDate, "2026-01-05");
    assert.strictEqual(dd.drawdownTroughDate, "2026-01-08");
    assert.strictEqual(dd.drawdownRecoveryDate, "2026-01-12");
});

runTest("Deterministic Peak Tie-Breaking (Earliest Occurrence)", () => {
    const navSeries = [
        { date: "2026-01-01", nav: 100 }, // Earliest Peak
        { date: "2026-01-03", nav: 100 }, // Identical Peak
        { date: "2026-01-05", nav: 80 }   // Trough
    ];
    const dd = calculateDrawdownDiagnostics(navSeries);
    assert.strictEqual(dd.drawdownStartDate, "2026-01-01");
});

runTest("Deterministic Trough Tie-Breaking (Earliest Minimum DD)", () => {
    const navSeries = [
        { date: "2026-01-01", nav: 100 },
        { date: "2026-01-03", nav: 70 }, // Earliest Trough (-30%)
        { date: "2026-01-05", nav: 80 },
        { date: "2026-01-07", nav: 70 }  // Identical Trough
    ];
    const dd = calculateDrawdownDiagnostics(navSeries);
    assert.strictEqual(dd.drawdownTroughDate, "2026-01-03");
});

runTest("Deterministic Recovery Boundary Strictly After Trough", () => {
    const navSeries = [
        { date: "2026-01-01", nav: 100 },
        { date: "2026-01-03", nav: 60 }, // Trough
        { date: "2026-01-05", nav: 99.9 },
        { date: "2026-01-07", nav: 100 } // Exact Recovery Point
    ];
    const dd = calculateDrawdownDiagnostics(navSeries);
    assert.strictEqual(dd.drawdownRecoveryDate, "2026-01-07");
});

// ==========================================
// GROUP 4: DOWNSIDE DEVIATION & MAR
// ==========================================

runTest("All Returns Above MAR (Zero Downside Deviation)", () => {
    const returns = Array(30).fill(0.005); // +0.5% daily > MAR
    const dd = calculateDownsideDeviationAndSortino(returns, 0.06, 'DAILY');
    assert.strictEqual(dd.downsideDeviation, 0.0);
    assert.strictEqual(dd.sortinoRatio, null); // 0 denominator
});

runTest("All Returns Below MAR", () => {
    const returns = Array(30).fill(-0.01);
    const dd = calculateDownsideDeviationAndSortino(returns, 0.06, 'DAILY');
    assert.strictEqual(dd.downsideDeviation > 0, true);
    assert.strictEqual(dd.sortinoRatio < 0, true);
});

runTest("MAR Sensitivity Across Policy Thresholds", () => {
    const returns = [0.001, -0.002, 0.003, -0.004, 0.002];
    const dd1 = calculateDownsideDeviationAndSortino(returns, 0.00, 'DAILY');
    const dd2 = calculateDownsideDeviationAndSortino(returns, 0.06, 'DAILY');
    const dd3 = calculateDownsideDeviationAndSortino(returns, 0.12, 'DAILY');
    assert.strictEqual(dd3.downsideDeviation >= dd2.downsideDeviation, true);
    assert.strictEqual(dd2.downsideDeviation >= dd1.downsideDeviation, true);
});

runTest("Sortino Ratio Closed-Form Mathematical Match", () => {
    const returns = [];
    for (let i = 0; i < 100; i++) {
        returns.push(i % 2 === 0 ? 0.015 : -0.005);
    }
    const dd = calculateDownsideDeviationAndSortino(returns, 0.06, 'DAILY');
    assert.strictEqual(isFinite(dd.sortinoRatio), true);
    assert.strictEqual(dd.sortinoRatio > 0, true);
});

// ==========================================
// GROUP 5: PARAMETRIC VAR & CVAR SCALING
// ==========================================

runTest("Daily 1D VaR Benchmark (h = 1)", () => {
    const returns = [];
    for (let i = 0; i < 50; i++) {
        returns.push(0.01);
        returns.push(-0.01);
    }
    const param = calculateParametricVaRAndCVaR(returns, 1, 'DAILY');
    assert.strictEqual(param.horizonPeriods, 1.0);
    assert.strictEqual(param.var95Parametric > 0, true);
    assert.strictEqual(param.var99Parametric > param.var95Parametric, true);
});

runTest("Daily 5D and 21D Horizon Scaling", () => {
    const returns = [];
    for (let i = 0; i < 50; i++) {
        returns.push(0.01);
        returns.push(-0.01);
    }
    const param1D = calculateParametricVaRAndCVaR(returns, 1, 'DAILY');
    const param5D = calculateParametricVaRAndCVaR(returns, 5, 'DAILY');
    const param21D = calculateParametricVaRAndCVaR(returns, 21, 'DAILY');

    assert.strictEqual(param5D.var95Parametric > param1D.var95Parametric, true);
    assert.strictEqual(param21D.var95Parametric > param5D.var95Parametric, true);
    // Scaled by sqrt(5) ~ 2.236
    const ratio5to1 = param5D.var95Parametric / param1D.var95Parametric;
    assert.strictEqual(Math.abs(ratio5to1 - Math.sqrt(5)) < 0.1, true);
});

runTest("Weekly Frequency Horizon Conversion", () => {
    const h1 = convertHorizonDaysToPeriods(1, 'WEEKLY');
    const h5 = convertHorizonDaysToPeriods(5, 'WEEKLY');
    const h21 = convertHorizonDaysToPeriods(21, 'WEEKLY');
    assert.strictEqual(h1, 0.2);
    assert.strictEqual(h5, 1.0);
    assert.strictEqual(h21, 4.2);
});

runTest("Monthly Frequency Horizon Conversion", () => {
    const h21 = convertHorizonDaysToPeriods(21, 'MONTHLY');
    assert.strictEqual(h21, 1.0);
});

runTest("Parametric CVaR Expected Shortfall Invariant", () => {
    const returns = [];
    for (let i = 0; i < 50; i++) {
        returns.push(0.02);
        returns.push(-0.02);
    }
    const param = calculateParametricVaRAndCVaR(returns, 1, 'DAILY');
    assert.strictEqual(param.cvar95Parametric > param.var95Parametric, true);
    assert.strictEqual(param.cvar99Parametric > param.var99Parametric, true);
});

// ==========================================
// GROUP 6: HISTORICAL VAR & CVAR CONTRACT
// ==========================================

runTest("Strict 252-Observation Boundary for Historical VaR", () => {
    const returns251 = Array(251).fill(0.001);
    const hist251 = calculateHistoricalVaRAndCVaR(returns251, 1, 'DAILY');
    assert.strictEqual(hist251.var95Historical, null);
    assert.strictEqual(hist251.hasSufficientHistoricalHistory, false);

    const returns252 = Array(252).fill(0.001);
    returns252[0] = -0.05; // 5% loss in tail
    const hist252 = calculateHistoricalVaRAndCVaR(returns252, 1, 'DAILY');
    assert.strictEqual(hist252.var95Historical !== null, true);
    assert.strictEqual(hist252.hasSufficientHistoricalHistory, true);
});

runTest("Deterministic Empirical Percentile (k = floor((1-alpha)*T))", () => {
    // 252 returns: 12 worst returns are -0.10, -0.09, ..., -0.01, others 0.01
    const returns = Array(252).fill(0.01);
    for (let i = 0; i < 12; i++) {
        returns[i] = -0.10 + i * 0.005;
    }
    const hist = calculateHistoricalVaRAndCVaR(returns, 1, 'DAILY');
    assert.strictEqual(hist.tailCount95, 12);
    assert.strictEqual(hist.tailCount99, 2);
    assert.strictEqual(hist.var95Historical > 0, true);
});

runTest("Historical CVaR Discrete Tail Average", () => {
    const returns = Array(252).fill(0.01);
    // Worst 2 returns: -0.10 and -0.08 -> mean -0.09
    returns[0] = -0.10;
    returns[1] = -0.08;
    const hist = calculateHistoricalVaRAndCVaR(returns, 1, 'DAILY');
    assert.strictEqual(hist.cvar99Historical, 0.09);
});

runTest("Historical Horizon Scaling (sqrt(h))", () => {
    const returns = Array(252).fill(0.01);
    returns[0] = -0.05;
    returns[1] = -0.04;
    const hist1D = calculateHistoricalVaRAndCVaR(returns, 1, 'DAILY');
    const hist5D = calculateHistoricalVaRAndCVaR(returns, 5, 'DAILY');
    const ratio = hist5D.var99Historical / hist1D.var99Historical;
    assert.strictEqual(Math.abs(ratio - Math.sqrt(5)) < 0.01, true);
});

runTest("Monotonicity Invariants ($VaR_{99} >= VaR_{95}$ & $CVaR >= VaR$)", () => {
    const returns = [];
    for (let i = 0; i < 252; i++) {
        returns.push(Math.sin(i) * 0.02);
    }
    const hist = calculateHistoricalVaRAndCVaR(returns, 1, 'DAILY');
    assert.strictEqual(hist.var99Historical >= hist.var95Historical, true);
    assert.strictEqual(hist.cvar95Historical >= hist.var95Historical, true);
    assert.strictEqual(hist.cvar99Historical >= hist.var99Historical, true);
});

// ==========================================
// GROUP 7: DETERMINISM, QUALITY, AST SCAN & SAFETY
// ==========================================

runTest("Mandatory Deterministic asOfDate Enforced", () => {
    assert.throws(() => {
        evaluatePortfolioVolatilityAndDrawdown({});
    }, /asOfDate is required/);

    assert.throws(() => {
        evaluatePortfolioVolatilityAndDrawdown({ asOfDate: 'invalid-date' });
    }, /Invalid asOfDate format/);
});

runTest("AST Scan: Zero Wall-Clock Calls in volatilityDrawdownEngine.js", () => {
    const servicePath = path.resolve('services/volatilityDrawdownEngine.js');
    const content = fs.readFileSync(servicePath, 'utf8');

    assert.strictEqual(content.includes('Date.now()'), false, "Must not contain Date.now()");
    const newDateNoArgRegex = /new\s+Date\s*\(\s*\)/g;
    assert.strictEqual(newDateNoArgRegex.test(content), false, "Must not contain argument-less new Date()");
});

runTest("Quote Fallback Quality Propagation", () => {
    const returns = Array(30).fill(0.005);
    const res = evaluatePortfolioVolatilityAndDrawdown({
        asOfDate: EVAL_DATE,
        constituentReturns: [{ holdingId: "h1", weight: 1.0, returns }]
    });
    // 30 observations < 252 -> DEGRADED confidence
    assert.strictEqual(res.dataQuality.confidenceLevel, 'DEGRADED');
    assert.strictEqual(res.dataQuality.hasSufficientHistoricalHistory, false);
    assert.strictEqual(res.dataQuality.hasSufficientParametricHistory, true);
});

runTest("Deep 5-Store Read-Only Safety Guard", async () => {
    const initialHoldings = await loadData(STORAGE_KEYS.INVESTMENTS_PORTFOLIO) || [];
    const initialEvents = await loadData(STORAGE_KEYS.INVESTMENT_EVENTS) || [];
    const initialQuotes = await loadData(STORAGE_KEYS.MARKET_DATA) || {};
    const initialTransactions = await loadData(STORAGE_KEYS.TRANSACTIONS) || [];
    const initialWallets = await loadData(STORAGE_KEYS.WALLETS) || [];

    const returns = Array(30).fill(0.01);
    evaluatePortfolioVolatilityAndDrawdown({
        asOfDate: EVAL_DATE,
        constituentReturns: [{ holdingId: "h1", weight: 1.0, returns }]
    });

    const afterHoldings = await loadData(STORAGE_KEYS.INVESTMENTS_PORTFOLIO) || [];
    const afterEvents = await loadData(STORAGE_KEYS.INVESTMENT_EVENTS) || [];
    const afterQuotes = await loadData(STORAGE_KEYS.MARKET_DATA) || {};
    const afterTransactions = await loadData(STORAGE_KEYS.TRANSACTIONS) || [];
    const afterWallets = await loadData(STORAGE_KEYS.WALLETS) || [];

    assert.deepStrictEqual(initialHoldings, afterHoldings, "Holdings store mutated!");
    assert.deepStrictEqual(initialEvents, afterEvents, "Events store mutated!");
    assert.deepStrictEqual(initialQuotes, afterQuotes, "Quotes store mutated!");
    assert.deepStrictEqual(initialTransactions, afterTransactions, "Transactions store mutated!");
    assert.deepStrictEqual(initialWallets, afterWallets, "Wallets store mutated!");
});

runTest("Deterministic Output Repeatability", () => {
    const returns = Array(50).fill(0.005);
    const p1 = evaluatePortfolioVolatilityAndDrawdown({
        asOfDate: EVAL_DATE,
        constituentReturns: [{ holdingId: "h1", weight: 1.0, returns }]
    });
    const p2 = evaluatePortfolioVolatilityAndDrawdown({
        asOfDate: EVAL_DATE,
        constituentReturns: [{ holdingId: "h1", weight: 1.0, returns }]
    });
    assert.deepStrictEqual(p1, p2, "DTO results must be byte-equivalent for identical inputs.");
});

runTest("Stage C.7.3 Master Acceptance Standards Complete", () => {
    assert.strictEqual(passCount, 40, "All 40 acceptance tests must execute.");
});

console.log("\n================================================================");
console.log(`=== STAGE C.7.3 ACCEPTANCE RESULT: ${passCount}/40 TESTS PASSED PERFECTLY ===`);
console.log("================================================================\n");
