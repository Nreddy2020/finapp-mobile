# Stage C.7.3 Architecture Plan: Volatility, Drawdown & Downside Risk Engine

**Stage**: C.7.3  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: ARCHITECTURE PROPOSED — ZERO-CODE GATE ACTIVE 🔒  
**Certified Baseline**: [`c29629d`](https://github.com/Nreddy2020/finapp-mobile/commit/c29629d) (Phase C.4, C.5, C.6, C.7.1, C.7.2 Master Certified)  
**Branch**: `fintech-using-chatgpt`  
**Author**: Antigravity AI & Quantitative Risk Systems Architect  

---

## 1. Executive Summary & Problem Statement

### 1.1 Objective
While Stage C.7.1 established the risk taxonomy and historical data contracts, and Stage C.7.2 implemented concentration diagnostics, **Stage C.7.3 (Volatility, Drawdown & Downside Risk Engine)** creates the quantitative risk calculation engine (`services/volatilityDrawdownEngine.js`).

It provides institutional-grade risk diagnostics:
1. **Annualized Portfolio Volatility ($\sigma_p$)**: Sample standard deviation of money-flow-neutral periodic returns scaled by $\sqrt{N_{\text{periods}}}$.
2. **High-Watermark Maximum & Current Drawdown ($MaxDD, CurrentDD$)**: Peak-to-trough equity curves, peak date, trough date, recovery date, and drawdown/recovery durations in days.
3. **Downside Deviation & Sortino Foundations ($DD_{\text{MAR}}$)**: Semi-standard deviation of underperformance against a Minimum Acceptable Return ($\text{MAR}$).
4. **Parametric & Historical Value-at-Risk ($VaR_{95\%}, VaR_{99\%}$)**: Empirical distribution percentile and parametric normal approximations over configurable horizons ($1\text{D}, 5\text{D}, 21\text{D}$).
5. **Conditional Value-at-Risk / Expected Shortfall ($CVaR_{95\%}, CVaR_{99\%}$)**: Expected tail loss beyond VaR thresholds.

### 1.2 Non-Goals & Invariants
- ❌ **No UI Development**: Pure analytical calculation engine. UI visualizers will be developed in Stage C.7.8.
- ❌ **No Modification of Certified Engines**: Zero edits to `investingAnalyticsEngine.js`, `targetAllocationService.js`, `rebalancingEngine.js`, `taxOptimizedRebalancingService.js`, `riskTaxonomy.js`, `concentrationEngine.js`, or `moneyFlowEngine.js`.
- ❌ **Zero State Mutation**: 100% read-only diagnostic service. Does not persist transactions, quotes, holdings, or ledger entries.
- ❌ **Zero Manufactured Returns**: Strictly enforces C.7.1 contract—missing historical market observations are flagged as degraded/insufficient quality without fabricating filler returns.
- ❌ **Zero Wall-Clock Dependencies**: Mandatory `asOfDate` on every public API entry point. Zero `Date.now()` or argument-less `new Date()`.

---

## 2. Core Mathematical Specifications

### 2.1 Money-Flow-Neutral Portfolio Return Series
To prevent external capital injections (deposits, transfers) or withdrawals from being misconstrued as investment performance:
1. **Holding-Level Weighted Synthetic Return**:
   For each period $t \in [1, T]$, where asset returns $r_{i,t} = \frac{P_{i,t} - P_{i,t-1}}{P_{i,t-1}}$ are normalized by C.7.1 `RiskTaxonomyService.normalizeHistoricalReturns(...)`:
   $$R_{p,t} = \sum_{i=1}^{N} w_{i} \cdot r_{i,t}$$
   where $w_i = \frac{V_i(t_0)}{V_{\text{total}}(t_0)}$ represents the base portfolio weights at the evaluation snapshot.
2. **Time-Weighted Historical Unit NAV Series**:
   $$NAV_0 = 100.0, \quad NAV_t = NAV_{t-1} \cdot (1 + R_{p,t})$$
   This guarantees that $NAV_t$ changes strictly due to asset price fluctuation, satisfying 100% money-flow neutrality.

### 2.2 Annualized Volatility ($\sigma_p$)
For periodic return series $\{R_{p,1}, R_{p,2}, \dots, R_{p,T}\}$ with mean $\bar{R}_p = \frac{1}{T}\sum_{t=1}^T R_{p,t}$:
1. **Periodic Sample Standard Deviation**:
   $$s_p = \sqrt{\frac{1}{T - 1} \sum_{t=1}^{T} (R_{p,t} - \bar{R}_p)^2} \quad (\text{for } T \ge 2)$$
2. **Annualization Scaling**:
   $$\sigma_{\text{ann}} = s_p \cdot \sqrt{\text{PeriodsPerYear}}$$
   - `DAILY`: $\text{PeriodsPerYear} = 252$ ($\sqrt{252} \approx 15.8745$)
   - `WEEKLY`: $\text{PeriodsPerYear} = 52$ ($\sqrt{52} \approx 7.2111$)
   - `MONTHLY`: $\text{PeriodsPerYear} = 12$ ($\sqrt{12} \approx 3.4641$)

### 2.3 Maximum Drawdown ($MaxDD$) & Peak-Trough Recovery Dynamics
For the money-flow-neutral $NAV_t$ series over $t \in [0, T]$:
1. **Running High-Water Mark (Peak)**:
   $$\text{Peak}_t = \max_{0 \le s \le t} NAV_s$$
2. **Drawdown Series**:
   $$DD_t = \frac{NAV_t - \text{Peak}_t}{\text{Peak}_t} \quad (DD_t \le 0.0)$$
3. **Maximum Drawdown**:
   $$MaxDD = \min_{0 \le t \le T} DD_t$$
4. **Current Drawdown**:
   $$CurrentDD = DD_T = \frac{NAV_T - \text{Peak}_T}{\text{Peak}_T}$$
5. **Drawdown Cycle Chronology**:
   - **Trough Index ($t_{\text{trough}}$)**: $\arg\min_{t} DD_t$ (the date of maximum loss).
   - **Peak Index ($t_{\text{peak}}$)**: The most recent date prior to $t_{\text{trough}}$ where $NAV_{t_{\text{peak}}} = \text{Peak}_{t_{\text{trough}}}$.
   - **Recovery Index ($t_{\text{recovery}}$)**: The first date $t > t_{\text{trough}}$ where $NAV_t \ge Peak_{t_{\text{trough}}}$. If $NAV_t < Peak_{t_{\text{trough}}}$ for all $t > t_{\text{trough}}$, the drawdown is marked as **Unrecovered** (`drawdownRecoveryDate: null`).
   - **Drawdown Duration**: $(t_{\text{trough}} - t_{\text{peak}})$ in calendar days.
   - **Recovery Duration**: $(t_{\text{recovery}} - t_{\text{trough}})$ in calendar days (or `null` if unrecovered).

### 2.4 Downside Deviation ($DD_{\text{MAR}}$)
Given a periodic Minimum Acceptable Return target $\text{MAR}_{\text{periodic}}$ (e.g. Risk-Free Rate / 252):
1. **Periodic Downside Deviation**:
   $$\delta_{\text{down}} = \sqrt{\frac{1}{T} \sum_{t=1}^{T} \left( \min(0, R_{p,t} - \text{MAR}_{\text{periodic}}) \right)^2}$$
2. **Annualized Downside Deviation**:
   $$DD_{\text{ann}} = \delta_{\text{down}} \cdot \sqrt{\text{PeriodsPerYear}}$$

### 2.5 Value-at-Risk ($VaR_\alpha$) and Conditional Value-at-Risk ($CVaR_\alpha$)
Sign convention: All $VaR$ and $CVaR$ values are expressed as **positive loss fractions** ($0.05 = 5\%$ maximum estimated loss).

1. **Parametric VaR (Normal Assumption)**:
   $$VaR_{\alpha, \text{param}} = \max\left(0, - (\bar{R}_p + z_\alpha \cdot s_p) \cdot \sqrt{h}\right)$$
   where $z_{0.95} \approx -1.644853$, $z_{0.99} \approx -2.326348$, and $h$ is the horizon in days ($h=1$ for 1-day, $h=5$ for 1-week, $h=21$ for 1-month).
2. **Historical Empirical VaR**:
   Sort portfolio periodic returns ascendingly: $R_{(1)} \le R_{(2)} \le \dots \le R_{(T)}$.
   - Percentile Index: $k = \lfloor (1 - \alpha) \cdot T \rfloor$.
   - $$VaR_{\alpha, \text{hist}} = \max\left(0, - R_{(k)} \cdot \sqrt{h}\right)$$
3. **Conditional Value-at-Risk / Expected Shortfall ($CVaR_\alpha$)**:
   The expected loss given that the loss exceeds $VaR_\alpha$:
   - Historical $CVaR$: Average of all tail returns strictly below the $1-\alpha$ cutoff:
     $$CVaR_{\alpha, \text{hist}} = \max\left(0, - \frac{1}{k} \sum_{i=1}^{k} R_{(i)} \cdot \sqrt{h}\right)$$
   - Parametric $CVaR$ (Normal tail expectation):
     $$CVaR_{\alpha, \text{param}} = \max\left(0, \left( - \bar{R}_p + s_p \cdot \frac{\phi(z_\alpha)}{1 - \alpha} \right) \cdot \sqrt{h}\right)$$
     where $\phi(z) = \frac{1}{\sqrt{2\pi}} e^{-z^2/2}$ is the standard normal PDF.

---

## 3. Resolution of the 10 Architectural Review Questions

| # | Question | Authoritative Architectural Resolution |
| :--- | :--- | :--- |
| **A** | **Return Methodology with Cash Flows** | Time-Weighted Return (TWR) synthesis: construct a money-flow-neutral synthetic portfolio return series $R_{p,t} = \sum w_i r_{i,t}$ using baseline weights and certified asset price return series. External cash deposits and withdrawals have zero impact on $R_{p,t}$. |
| **B** | **Authoritative Frequency** | Default: `DAILY` (252 periods/yr). Supported: `WEEKLY` (52 periods/yr), `MONTHLY` (12 periods/yr). Validated in options. |
| **C** | **Annualization Scaling** | Volatility: $\sigma_p \cdot \sqrt{F}$. Downside Deviation: $\delta_{\text{down}} \cdot \sqrt{F}$. MAR input annual rate $MAR_{\text{ann}}$ is converted to periodic via $MAR_{\text{periodic}} = (1 + MAR_{\text{ann}})^{1/F} - 1$. |
| **D** | **Default MAR** | Default: $0.06$ (6.0% annual Indian risk-free proxy / liquid fund baseline), configurable via `options.mar`. |
| **E** | **VaR Confidence Levels** | Supported: $95\%$ ($\alpha = 0.95$) and $99\%$ ($\alpha = 0.99$). Both reported simultaneously in canonical DTO. |
| **F** | **VaR Horizon** | Default: $1\text{D}$ ($h=1$). Configurable to $5\text{D}$ ($h=5$) and $21\text{D}$ ($h=21$). Scaled via $\sqrt{h}$ square-root-of-time rule. |
| **G** | **CVaR Tail Definition** | Discrete tail returns $R_{(1..k)}$ where $k = \max(1, \lfloor (1-\alpha) T \rfloor)$. |
| **H** | **Drawdown Cash-Flow Neutrality** | Evaluated strictly on the synthetic $NAV_t = NAV_{t-1}(1 + R_{p,t})$ curve ($NAV_0 = 100$). |
| **I** | **Recovery Boundary Condition** | Drawdown is fully recovered at the earliest $t > t_{\text{trough}}$ where $NAV_t \ge Peak_{t_{\text{trough}}}$. If $NAV_t < Peak$ through $T$, `drawdownRecoveryDate: null` and `recoveryDurationDays: null`. |
| **J** | **Insufficient Data Handling** | If $T < N_{\text{min}}$ (e.g. $< 20$ observations), return `status: 'INSUFFICIENT_HISTORY'`, `confidence: 'UNAVAILABLE'`, and finite `null` metrics without NaN. |

---

## 4. Versioned Risk Policy & DTO Schema

### 4.1 Versioned Risk Policy Object (`C7_3_V1`)
```javascript
export const DOWNSIDE_RISK_POLICY_VERSION = "C7_3_V1";

export const DOWNSIDE_RISK_POLICY_V1 = Object.freeze({
    periodsPerYear: Object.freeze({
        DAILY: 252,
        WEEKLY: 52,
        MONTHLY: 12
    }),
    defaults: Object.freeze({
        frequency: 'DAILY',
        lookbackDays: 365,
        requiredObservations: 252,
        minObservationsForCalculation: 20,
        defaultAnnualMAR: 0.06, // 6.0% p.a.
        varHorizonDays: 1,      // 1-day VaR
        confidenceLevels: [0.95, 0.99]
    }),
    warningThresholds: Object.freeze({
        HIGH_VOLATILITY_ANNUAL: 0.25,        // > 25% p.a.
        CRITICAL_VOLATILITY_ANNUAL: 0.40,    // > 40% p.a.
        HIGH_MAX_DRAWDOWN: 0.20,             // > 20%
        CRITICAL_MAX_DRAWDOWN: 0.35,         // > 35%
        HIGH_1D_VAR_95: 0.025,               // 1-day VaR > 2.5%
        CRITICAL_1D_VAR_95: 0.040            // 1-day VaR > 4.0%
    })
});
```

### 4.2 Status Taxonomy
```javascript
export const VolatilityRiskStatus = Object.freeze({
    CALCULATED: 'CALCULATED',
    INSUFFICIENT_HISTORY: 'INSUFFICIENT_HISTORY',
    INSUFFICIENT_COVERAGE: 'INSUFFICIENT_COVERAGE',
    DEGRADED: 'DEGRADED',
    UNAVAILABLE: 'UNAVAILABLE',
    EMPTY_PORTFOLIO: 'EMPTY_PORTFOLIO'
});
```

### 4.3 Canonical DTO Contract
```javascript
/**
 * Canonical Volatility, Drawdown & Downside Risk DTO
 */
export const VolatilityDrawdownDiagnosticsSchema = {
    portfolioId: 'STRING_OR_NULL',
    asOfDate: 'ISO_DATE_STRING', // Mandatory deterministic cutoff
    policyVersion: 'C7_3_V1',
    status: 'VolatilityRiskStatus',
    frequency: 'DAILY | WEEKLY | MONTHLY',
    lookbackStart: 'ISO_DATE_STRING_OR_NULL',
    lookbackEnd: 'ISO_DATE_STRING_OR_NULL',
    observationCount: 'INTEGER',
    requiredObservationCount: 'INTEGER',
    coverageRatio: 'FINITE_NUMBER',

    // Volatility Metrics (Annualized, 4 decimal places)
    annualizedVolatility: 'FINITE_NUMBER_OR_NULL', // e.g. 0.1850 (18.50%)
    periodicVolatility: 'FINITE_NUMBER_OR_NULL',

    // Drawdown Metrics (Negative fractions, 4 decimal places)
    maximumDrawdown: 'FINITE_NUMBER_OR_NULL', // e.g. -0.1520 (-15.20%)
    currentDrawdown: 'FINITE_NUMBER_OR_NULL', // e.g. -0.0340 (-3.40%)
    drawdownStartDate: 'ISO_DATE_STRING_OR_NULL',  // Peak date
    drawdownTroughDate: 'ISO_DATE_STRING_OR_NULL', // Deepest trough date
    drawdownRecoveryDate: 'ISO_DATE_STRING_OR_NULL', // Null if unrecovered
    drawdownDurationDays: 'INTEGER_OR_NULL',
    recoveryDurationDays: 'INTEGER_OR_NULL',

    // Downside Deviation & MAR (Annualized, 4 decimal places)
    marAnnual: 'FINITE_NUMBER',
    marPeriodic: 'FINITE_NUMBER',
    downsideDeviation: 'FINITE_NUMBER_OR_NULL',
    sortinoRatio: 'FINITE_NUMBER_OR_NULL',

    // Value-at-Risk & Expected Shortfall (Positive loss fractions, 4 decimal places)
    varHorizonDays: 'INTEGER',
    var95Parametric: 'FINITE_NUMBER_OR_NULL',
    var95Historical: 'FINITE_NUMBER_OR_NULL',
    var99Parametric: 'FINITE_NUMBER_OR_NULL',
    var99Historical: 'FINITE_NUMBER_OR_NULL',
    cvar95Parametric: 'FINITE_NUMBER_OR_NULL',
    cvar95Historical: 'FINITE_NUMBER_OR_NULL',
    cvar99Parametric: 'FINITE_NUMBER_OR_NULL',
    cvar99Historical: 'FINITE_NUMBER_OR_NULL',

    // Diagnostics & Warnings
    warnings: 'ARRAY_OF_STRINGS',
    dataQuality: 'RiskMetricDataQualitySchema'
};
```

---

## 5. Architectural Boundary & Data Flow

```
                     ┌────────────────────────────────┐
                     │ Certified C.4 Valuation Engine  │
                     └───────────────┬────────────────┘
                                     │
                             Portfolio Holdings &
                               Base Weights w_i
                                     │
                     ┌───────────────┴────────────────┐
                     │ Certified C.7.1 Risk Taxonomy   │
                     │ Historical Return Adapter      │
                     └───────────────┬────────────────┘
                                     │
                          Normalized Return Series
                                r_{i,t}
                                     │
                                     ▼
                ┌──────────────────────────────────────────┐
                │ Stage C.7.3 Volatility & Drawdown Engine │
                │ services/volatilityDrawdownEngine.js     │
                │                                          │
                │ 1. Synthetic Money-Flow-Neutral TWR      │
                │    R_{p,t} = \sum w_i r_{i,t}            │
                │ 2. Unit NAV Series: NAV_t = NAV_{t-1}(1+R)│
                └────────────────────┬─────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          ▼                          ▼                          ▼
   ┌──────────────┐          ┌──────────────┐          ┌────────────────┐
   │  Volatility  │          │   Drawdown   │          │  Downside/VaR  │
   │  \sigma_p,   │          │ Peak, Trough,│          │ DD_MAR, VaR95, │
   │  \sigma_ann  │          │ MaxDD, Dur.  │          │ CVaR95, VaR99  │
   └──────┬───────┘          └──────┬───────┘          └────────┬───────┘
          │                         │                           │
          └─────────────────────────┼───────────────────────────┘
                                    ▼
                     ┌─────────────────────────────┐
                     │ Apply C7_3_V1 Risk Policy   │
                     │ Generate Warnings & Quality │
                     └──────────────┬──────────────┘
                                    ▼
                  VolatilityDrawdownDiagnostics DTO
```

---

## 6. Planned Acceptance Test Architecture (32 Scenarios)

The future implementation suite (`tests/test_c73.mjs`) will cover 32 comprehensive scenarios:

### Group 1: Volatility Mechanics (Tests 1–6)
1. **Zero Volatility Series**: Constant returns yield $\sigma = 0.0$.
2. **Deterministic Known Volatility**: Synthetic sinusoidal/alternating series matches analytical $\sigma$.
3. **Daily Annualization ($\sqrt{252}$)**: Verified scaling.
4. **Weekly & Monthly Frequency Annualization**: $\sqrt{52}$ and $\sqrt{12}$ scaling.
5. **Single Observation Invariant**: $N < 2$ returns finite nulls.
6. **Large Asset Count Aggregation**: Portfolio volatility correctly aggregates 10+ constituents.

### Group 2: Drawdown & Recovery Dynamics (Tests 7–13)
7. **Monotonically Increasing Series**: $MaxDD = 0.0$, peak is final date, recovery is immediate.
8. **Single Drawdown with Full Recovery**: Exact peak date, trough date, recovery date, and duration days.
9. **Single Drawdown Unrecovered**: $CurrentDD = MaxDD$, recovery date is `null`.
10. **Multiple Drawdown Cycles**: Correctly identifies the deepest global trough among local dips.
11. **Flat / Stagnant Series**: $DD = 0.0$ throughout.
12. **Extreme 100% Collapse ($NAV \to 0$)**: $MaxDD = -1.0 (-100\%)$ without division-by-zero.
13. **Peak Calculation with Identical Successive Values**: Deterministic peak preservation.

### Group 3: Downside Deviation & MAR (Tests 14–18)
14. **All Returns Above MAR**: Downside deviation exactly equals $0.0$.
15. **All Returns Below MAR**: Downside deviation incorporates all periods.
16. **Mixed Returns with Varying MAR**: Sensitivity to $MAR = 0.0, 0.06, 0.12$.
17. **Annualization of Downside Deviation**: Correct scaling by $\sqrt{\text{Periods}}$.
18. **Sortino Ratio Calculation**: $(\bar{R}_{\text{ann}} - MAR) / DD_{\text{ann}}$ computed accurately.

### Group 4: Value-at-Risk & Expected Shortfall (Tests 19–24)
19. **Parametric VaR Normal Benchmark**: Matches standard Gaussian analytical value.
20. **Historical VaR Empirical Percentile**: Exact quantile matching on 100 sorted observations.
21. **$95\%$ vs $99\%$ VaR Strict Monotonicity**: $VaR_{99\%} \ge VaR_{95\%}$ invariant.
22. **Parametric vs Historical CVaR**: Tail averages strictly exceed VaR ($CVaR_\alpha \ge VaR_\alpha$).
23. **Square-Root-of-Time Horizon Scaling**: $5\text{D} VaR \approx 1\text{D} VaR \cdot \sqrt{5}$.
24. **Positive Loss Sign Convention**: Loss of $5\%$ serializes as $+0.05$.

### Group 5: Money-Flow Neutrality (Tests 25–26)
25. **Deposit Invariant Proof**: Large simulated cash deposit does not artificially spike NAV or suppress volatility.
26. **Withdrawal Invariant Proof**: Large withdrawal does not trigger false drawdown.

### Group 6: Determinism, Quality & Safety (Tests 27–32)
27. **Mandatory Deterministic `asOfDate`**: Missing or invalid `asOfDate` throws explicit error.
28. **AST Source Code Scan**: Zero `Date.now()` or argument-less `new Date()` in `volatilityDrawdownEngine.js`.
29. **Insufficient History Handling ($N < 20$)**: Returns `INSUFFICIENT_HISTORY` with clear confidence degradation.
30. **Partial Quote Coverage Degradation**: C.4 fallback valuation propagates to `DEGRADED` confidence.
31. **Deep 5-Store Read-Only Safety Guard**: Verified 100% zero mutations across all 5 stores.
32. **Complete Full-System Regression Preservation**: 303/303 previous system tests pass with zero regressions.

---

## 7. Repository Boundary & Zero-Code Gate Verification

- **Certified Baseline**: [`c29629d`](https://github.com/Nreddy2020/finapp-mobile/commit/c29629d) (Stage C.7.2 Certified).
- **Files Modified in this step**:
  - `docs/C7_3_ARCHITECTURE_PLAN.md` (NEW)
  - `docs/AI_PROJECT_STATE.md` (MODIFIED)
- **Implementation Files Created**: **0** 🔒 (Zero-Code Gate Active).
- **Frozen Financial Engines Modified**: **0** 🔒.
