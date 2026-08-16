# Phase C.7 Architecture Plan: Portfolio Intelligence, Risk Diagnostics & Stress-Testing Engine

**Phase**: C.7  
**Status**: ARCHITECTURE PLANNING — HARDENED (Zero-Code Gate Active 🔒)  
**Certified Baseline**: [`5fdfb36`](https://github.com/Nreddy2020/finapp-mobile/commit/5fdfb36)  
**Author**: Antigravity AI & System Architect  

---

## 1. Executive Summary & Problem Space

### 1.1 The Fundamental Problem
Phases C.4–C.6 provide certified financial accounting (Valuation, WAC, XIRR, Statements) and actionable rebalancing optimization (Target Policies, Drift Calculation, Tax Optimization). However, they primarily answer retrospective and current-state questions:
- *What is my net worth and lifetime return?* (C.4 / C.5)
- *How far has my allocation drifted from my target model?* (C.6.1 / C.6.2)
- *How can I rebalance with minimal tax liability?* (C.6.3 / C.6.4)

They do not answer forward-looking risk and resilience questions:
- **"What could go wrong with my current portfolio?"**
- **"How much money could I lose in a severe market crash (2008 GFC, 2020 COVID shock, Stagflation, Rate spike)?"**
- **"Where are my hidden concentration, correlation, and liquidity vulnerabilities?"**
- **"How resilient is my portfolio across varied economic regimes?"**
- **"What specific, diagnostic actions will improve my portfolio's health and downside protection?"**

### 1.2 Phase C.7 Mission
**Phase C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)** creates an institutional-grade, read-only analytical engine that quantifies multi-dimensional portfolio risk, simulates macroeconomic shocks, diagnoses structural vulnerabilities, and synthesizes a versioned **Portfolio Health Score (0–100)** with auditable, plain-English explanations.

---

## 2. Decoupled Architecture & Dependency Hierarchy

C.7 consumes certified C.4 financial truth directly, decoupling basic risk analysis from rebalancing execution:

```
                  ┌─────────────────────────────────────────┐
                  │       C.4 CERTIFIED FINANCIAL TRUTH     │
                  │  (Holdings, Events, WAC, Market Values) │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       C.7.1 RISK DATA FOUNDATION        │
                  │  ├── Canonical Risk Taxonomy            │
                  │  ├── Historical Return Series Adapter   │
                  │  ├── EvaluationContext & asOfDate       │
                  │  └── Data-Quality & Confidence Contract │
                  └────────────────────┬────────────────────┘
                                       │
       ┌───────────────────────────────┼───────────────────────────────┐
       │                               │                               │
       ▼                               ▼                               ▼
┌──────────────┐              ┌─────────────────┐             ┌─────────────────┐
│    C.7.2     │              │      C.7.3      │             │      C.7.4      │
│Concentration │              │Downside / Vol / │             │  Correlation &  │
│Diagnostics   │              │   VaR / CVaR    │             │ Diversification │
└──────┬───────┘              └────────┬────────┘             └────────┬────────┘
       │                               │                               │
       │                               │                               │
       ▼                               ▼                               ▼
┌──────────────┐              ┌─────────────────┐             ┌─────────────────┐
│    C.7.5     │              │      C.7.6      │             │C.6.1 POLICY REF │
│  Liquidity & │              │  Macro Scenario │             │ (Target Weights │
│ Lockup Stress│              │& Stress Testing │             │ for Drift Risk) │
└──────┬───────┘              └────────┬────────┘             └────────┬────────┘
       │                               │                               │
       └───────────────────────────────┼───────────────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │                  C.7.7                  │
                  │    COMPOSITE PORTFOLIO HEALTH SCORE     │
                  │   (Policy Version: "C7_V1", 0–100)      │
                  │                   +                     │
                  │       AUDITABLE RISK EXPLANATION        │
                  └────────────────────┬────────────────────┘
                                       │
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │                  C.7.8                  │
                  │     RISK INTELLIGENCE DASHBOARD UI      │
                  │  (Health Radar, Stress Lab, Diagnostics)│
                  └─────────────────────────────────────────┘
```

---

## 3. Hardening Specifications (Resolving C7-01 through C7-08)

### 3.1 C7-01: Historical Market-Data Contract
C.7 never manufactures return points from incomplete data. Historical analytics require explicit, validated return series contracts:

```javascript
/**
 * Canonical Historical Market Data Point
 */
export const HistoricalMarketDataPointSchema = {
    symbol: 'STRING',            // e.g. "INFY", "NIFTYBEES"
    timestamp: 'ISO_DATE_STRING',// e.g. "2024-01-02T00:00:00.000Z"
    adjustedClose: 'FINITE_POS', // Split/bonus adjusted closing price
    source: 'STRING',            // e.g. "MockFeedProvider", "NSE_EOD"
    currency: 'INR',
    quality: 'VERIFIED' | 'INTERPOLATED' | 'FALLBACK_UNADJUSTED'
};

/**
 * Authoritative Historical Return Series DTO
 */
export const HistoricalReturnSeriesSchema = {
    symbol: 'STRING',
    frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY',
    lookbackStart: 'ISO_DATE_STRING',
    lookbackEnd: 'ISO_DATE_STRING',
    asOfDate: 'ISO_DATE_STRING',
    observationCount: 'INTEGER',
    requiredObservationCount: 'INTEGER', // e.g. 252 for 1Y daily
    coverageRatio: 'FINITE_NUMBER',      // observationCount / requiredObservationCount [0.0 - 1.0]
    returns: 'ARRAY_OF_FINITE_NUMBERS',  // Simple arithmetic returns: (P_t - P_{t-1}) / P_{t-1}
    missingIntervals: 'ARRAY_OF_DATE_RANGES',
    qualityStatus: 'PRISTINE' | 'ACCEPTABLE' | 'DEGRADED' | 'INSUFFICIENT'
};
```

**Quality Invariant**: If `coverageRatio < 0.80` (less than 80% expected observations), downstream volatility and covariance calculations are marked `INSUFFICIENT_HISTORY` and return `status: 'INSUFFICIENT_HISTORY'` with explicit warning diagnostics.

---

### 3.2 C7-02: Explicit VaR / CVaR Methodology

#### A. Parametric (Variance-Covariance) VaR:
- **Horizon**: 1-Day ($1\text{D}$) and 1-Month ($21\text{D}$ trading days).
- **Confidence Levels**: $\alpha = 0.95$ ($z_{0.95} = 1.6449$) and $\alpha = 0.99$ ($z_{0.99} = 2.3263$).
- **Portfolio Variance**:
  $$\sigma_p = \sqrt{\mathbf{w}^T \mathbf{\Sigma} \mathbf{w}}$$
  where $\mathbf{w}$ is the vector of asset weights and $\mathbf{\Sigma}$ is the sample covariance matrix of historical returns.
- **Parametric VaR Calculation**:
  $$\text{VaR}_{\alpha, 1\text{D}} = V_{\text{portfolio}} \times \left( z_\alpha \cdot \sigma_p - \mu_p \right)$$
  $$\text{VaR}_{\alpha, 1\text{M}} = \text{VaR}_{\alpha, 1\text{D}} \times \sqrt{21}$$
- **Parametric CVaR (Expected Shortfall)**:
  $$\text{CVaR}_{\alpha, 1\text{D}} = V_{\text{portfolio}} \times \left( \frac{\phi(z_\alpha)}{1 - \alpha} \cdot \sigma_p - \mu_p \right)$$
  where $\phi(z)$ is the standard normal probability density function.

#### B. Historical (Empirical) VaR & CVaR:
- **Lookback Requirement**: Minimum $N = 252$ daily historical observations.
- **Sorting**: Historical portfolio returns $r_1 \le r_2 \le \dots \le r_N$ sorted ascendingly (losses in left tail).
- **Percentile Index**: $k = \lfloor (1 - \alpha) \cdot N \rfloor$.
- **Historical VaR**:
  $$\text{VaR}_{\alpha}^{\text{hist}} = - V_{\text{portfolio}} \times r_{(k)}$$
- **Historical CVaR (Expected Shortfall)**:
  $$\text{CVaR}_{\alpha}^{\text{hist}} = - V_{\text{portfolio}} \times \frac{1}{k} \sum_{i=1}^{k} r_{(i)}$$

Both Parametric and Historical values are computed and exposed in `VolatilityRiskSummary`, allowing cross-validation and tail-fatness detection ($\text{CVaR}^{\text{hist}} > \text{CVaR}^{\text{param}}$ flags non-normal tail risk).

---

### 3.3 C7-03 & C7-04: Canonical Stress Scenarios & Complete 8-Class Shock Vectors

#### Standardized Stress Set (Option B):
To ensure deterministic reproducibility, the Portfolio Health Score evaluates resilience across a canonical set of **4 Standardized Macro Scenarios**:

1. `HISTORICAL_GFC_2008` (2008 Global Financial Crisis Credit Freeze)
2. `HISTORICAL_COVID_2020` (2020 Rapid Lockdown Liquidity Shock)
3. `MACRO_RATE_SPIKE` (+200 bps Aggressive Monetary Tightening)
4. `MACRO_STAGFLATION_SHOCK` (High Inflation + Low Growth Regime)

#### Complete 8-Class Shock Vectors:
Every stress scenario explicitly defines shocks for all 8 canonical asset classes. Unspecified classes default strictly to $0.0\%$ via `UNSPECIFIED_SHOCK_POLICY`:

```javascript
export const UNSPECIFIED_SHOCK_POLICY = 0.0; // 0.0% neutral

export const CANONICAL_STRESS_SCENARIOS = {
    HISTORICAL_GFC_2008: {
        id: 'HISTORICAL_GFC_2008',
        name: '2008 Global Financial Crisis',
        category: 'HISTORICAL_MARKET_CRASH',
        description: 'Severe global liquidity freeze and synchronized equity market collapse.',
        shocks: {
            STOCK: -0.55,        // -55%
            MUTUAL_FUND: -0.45,  // -45%
            ETF: -0.50,          // -50%
            GOLD: +0.25,         // +25% (Safe haven demand)
            CRYPTO: -0.70,       // -70% (High-beta speculative drawdown)
            BOND: +0.08,         // +8%  (Flight to sovereign debt / rate cuts)
            REAL_ESTATE: -0.30,  // -30% (Subprime property decline)
            OTHER: -0.20         // -20%
        }
    },
    HISTORICAL_COVID_2020: {
        id: 'HISTORICAL_COVID_2020',
        name: '2020 COVID Liquidity Crash',
        category: 'HISTORICAL_MARKET_CRASH',
        description: 'Rapid pandemic lockdown and global asset liquidation shock.',
        shocks: {
            STOCK: -0.38,
            MUTUAL_FUND: -0.32,
            ETF: -0.35,
            GOLD: +0.15,
            CRYPTO: -0.50,
            BOND: +0.04,
            REAL_ESTATE: -0.15,
            OTHER: -0.10
        }
    },
    MACRO_RATE_SPIKE: {
        id: 'MACRO_RATE_SPIKE',
        name: 'Interest Rate Spike (+200 bps)',
        category: 'MONETARY_TIGHTENING',
        description: 'Aggressive central bank rate hikes compressing bond durations and equity multiples.',
        shocks: {
            STOCK: -0.15,
            MUTUAL_FUND: -0.12,
            ETF: -0.14,
            GOLD: -0.05,
            CRYPTO: -0.30,
            BOND: -0.12,         // Duration risk impact
            REAL_ESTATE: -0.08,  // Higher mortgage / debt cost
            OTHER: -0.05
        }
    },
    MACRO_STAGFLATION_SHOCK: {
        id: 'MACRO_STAGFLATION_SHOCK',
        name: 'Stagflation & Supply Shock',
        category: 'MACRO_REGIME',
        description: 'High inflation coupled with economic stagnation favoring commodities over paper assets.',
        shocks: {
            STOCK: -0.10,
            MUTUAL_FUND: -0.08,
            ETF: -0.09,
            GOLD: +0.30,         // Inflation hedge outperformance
            CRYPTO: -0.25,
            BOND: -0.18,         // Real yield erosion
            REAL_ESTATE: +0.15,  // Tangible asset price support
            OTHER: 0.00
        }
    },
    CRYPTO_WINTER_2022: {
        id: 'CRYPTO_WINTER_2022',
        name: 'Crypto Winter / Tech Sell-Off',
        category: 'SECTOR_MELTDOWN',
        description: 'Severe speculative risk-off liquidation isolated to digital and high-beta tech assets.',
        shocks: {
            STOCK: -0.20,
            MUTUAL_FUND: -0.15,
            ETF: -0.18,
            GOLD: +0.05,
            CRYPTO: -0.80,       // -80% drawdown
            BOND: +0.02,
            REAL_ESTATE: 0.00,
            OTHER: -0.05
        }
    }
};
```

---

### 3.4 C7-05: Separate Holding Liquidity Classification Contract

The canonical 8-class investment taxonomy (`STOCK`, `MUTUAL_FUND`, `ETF`, etc.) is **preserved 100% untouched**. Holding liquidity is modeled via an orthogonal classification contract:

```javascript
export const LiquidityTier = {
    INSTANT_T0: 'INSTANT_T0',              // T+0 to T+1 (Cash, Overnight debt, Liquid ETFs)
    SHORT_TERM_T2_T3: 'SHORT_TERM_T2_T3',  // T+2 to T+3 (Equities, Open-ended mutual funds)
    MEDIUM_TERM_T4_T7: 'MEDIUM_TERM_T4_T7',// T+4 to T+7 (Physical metals, Fixed deposits with notice)
    LOCKED_OR_ILLIQUID: 'LOCKED_OR_ILLIQUID' // T > 7 (ELSS 3Y lockup, Real estate, Unvested ESOPs)
};

export const HoldingLiquidityProfileSchema = {
    holdingId: 'STRING',
    symbol: 'STRING',
    assetType: 'CANONICAL_8_CLASS', // STOCK, MUTUAL_FUND, etc.
    liquidityTier: 'LiquidityTier',
    estimatedSettlementDays: 'INTEGER',
    isLocked: 'BOOLEAN',
    lockupExpiryDate: 'ISO_DATE_STRING_OR_NULL',
    exitPenaltyPercent: 'FINITE_NUMBER' // e.g. 1.0% exit load
};
```

**Liquidity Coverage Ratio (LCR)**:
$$\text{LCR} = \frac{V_{\text{INSTANT}} + V_{\text{SHORT\_TERM}}}{V_{\text{total}}}$$

---

### 3.5 C7-06: Versioned Portfolio Health Score Policy (`C7_V1`)

The Portfolio Health Score is governed by an explicit versioned policy: `HEALTH_SCORE_POLICY_VERSION = "C7_V1"`.

```javascript
export const HEALTH_SCORE_POLICY_VERSION = "C7_V1";

export const HEALTH_SCORE_CONFIG_V1 = {
    weights: {
        CONCENTRATION: 0.25,  // 25%
        ALLOCATION_DRIFT: 0.20, // 20%
        DOWNSIDE_RISK: 0.20,    // 20%
        LIQUIDITY: 0.15,        // 15%
        STRESS_RESILIENCE: 0.20 // 20%
    },
    thresholds: {
        // Pillar 1: Concentration
        HHI_EXCELLENT_MAX: 1500,
        HHI_CRITICAL_MIN: 5000,
        TOP1_EXCELLENT_MAX: 0.20, // 20%
        TOP1_CRITICAL_MIN: 0.45,  // 45%

        // Pillar 2: Allocation Drift
        DRIFT_EXCELLENT_MAX_PP: 5.0,
        DRIFT_CRITICAL_MIN_PP: 25.0,

        // Pillar 3: Downside Risk
        MAX_DRAWDOWN_EXCELLENT_MAX: 0.10, // -10%
        MAX_DRAWDOWN_CRITICAL_MIN: 0.40,  // -40%

        // Pillar 4: Liquidity
        LCR_EXCELLENT_MIN: 0.70, // 70% liquid
        LCR_CRITICAL_MAX: 0.20,  // 20% liquid

        // Pillar 5: Stress Resilience (Avg loss across 4 canonical scenarios)
        AVG_STRESS_LOSS_EXCELLENT_MAX: 0.15, // -15%
        AVG_STRESS_LOSS_CRITICAL_MIN: 0.45   // -45%
    }
};
```

#### Piecewise-Linear Normalization Function:
For any raw metric $x$ with `EXCELLENT` threshold $x_{\text{good}}$ and `CRITICAL` threshold $x_{\text{bad}}$:
$$S(x) = 100 \times \max\left(0, \min\left(1, \frac{x_{\text{bad}} - x}{x_{\text{bad}} - x_{\text{good}}}\right)\right)$$

Composite Health Score:
$$H = \sum_{k=1}^{5} \omega_k \cdot S_k \quad (H \in [0, 100])$$

---

### 3.6 C7-07: Diversification Benefit Ratio (DBR) & Mathematical Edge Cases

The Diversification Benefit Ratio ($DBR$) quantifies the percentage volatility reduction achieved through cross-asset correlation offsets:

$$DBR = 1 - \frac{\sigma_p}{\sum_{i=1}^{N} w_i \sigma_i}$$

#### Edge Case Guards:
```javascript
export const DBR_STATUS = {
    CALCULATED: 'CALCULATED',
    INSUFFICIENT_HISTORY: 'INSUFFICIENT_HISTORY',
    ZERO_COMPONENT_VOLATILITY: 'ZERO_COMPONENT_VOLATILITY',
    UNSTABLE: 'UNSTABLE'
};

export function calculateDBR(weights, volatilities, portfolioVolatility, correlationStatus) {
    if (correlationStatus !== 'VALID') {
        return { dbr: null, status: DBR_STATUS.INSUFFICIENT_HISTORY };
    }

    const weightedAvgVol = weights.reduce((sum, w, i) => sum + w * (volatilities[i] || 0), 0);

    if (weightedAvgVol <= 0.0001) {
        return { dbr: 0.0, status: DBR_STATUS.ZERO_COMPONENT_VOLATILITY };
    }

    if (portfolioVolatility < 0 || isNaN(portfolioVolatility)) {
        return { dbr: null, status: DBR_STATUS.UNSTABLE };
    }

    const rawDbr = 1 - (portfolioVolatility / weightedAvgVol);
    const boundedDbr = Math.max(0.0, Math.min(0.9999, Number(rawDbr.toFixed(4))));

    return {
        dbr: boundedDbr,
        weightedComponentVolatility: Number(weightedAvgVol.toFixed(4)),
        portfolioVolatility: Number(portfolioVolatility.toFixed(4)),
        status: DBR_STATUS.CALCULATED
    };
}
```

---

### 3.7 C7-08: First-Class Data Quality, Coverage & Confidence Contract

Every risk calculation returns an explicit data-quality contract ensuring full transparency:

```javascript
export const RiskMetricDataQualitySchema = {
    status: 'CALCULATED' | 'INSUFFICIENT_HISTORY' | 'DEGRADED_COVERAGE' | 'FALLBACK_VALUATION',
    confidence: 'HIGH' | 'MODERATE' | 'LOW' | 'UNAVAILABLE',
    observationCount: 'INTEGER',
    requiredObservationCount: 'INTEGER',
    coverageRatio: 'FINITE_NUMBER', // [0.0 - 1.0]
    asOfDate: 'ISO_DATE_STRING',
    policyVersion: 'STRING',
    warnings: 'ARRAY_OF_STRINGS'
};
```

---

## 4. Staging Roadmap & Implementation Gates

Phase C.7 is structured into **8 focused, independently testable stages**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE C.7 STAGING ROADMAP                         │
├───────────┬───────────────────────────────────────────┬─────────────────────┤
│ Stage     │ Name / Purpose                            │ Deliverables        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.1** │ Portfolio Risk Foundation & Risk Taxonomy │ riskTaxonomy.js     │
│           │ (Taxonomy, Schemas, Return Series Adapter)│ test_c71.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.2** │ Concentration & Diversification Diagnostics│ concentrationEngine.js│
│           │ (HHI Decomp, Top-k, Neff, Concentration)  │ test_c72.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.3** │ Volatility, Drawdown & Downside Risk      │ drawdownEngine.js   │
│           │ (MaxDD, Downside Deviation, VaR, CVaR)    │ test_c73.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.4** │ Correlation & Cross-Asset Risk            │ correlationEngine.js│
│           │ (8x8 Matrix, Diversification Ratio DBR)   │ test_c74.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.5** │ Liquidity & Cash-Flow Stress              │ liquidityEngine.js  │
│           │ (Liquidity Tiers, LCR, Redemption Buffer) │ test_c75.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.6** │ Scenario & Stress-Test Engine             │ stressTestEngine.js │
│           │ (4 Canonical Scenarios + Custom Lab)      │ test_c76.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.7** │ Portfolio Health Score & Risk Explanation │ portfolioHealth.js  │
│           │ (0–100 Score, C7_V1 Policy, Explanations) │ test_c77.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.8** │ Risk Intelligence Dashboard & Stress UI   │ RiskRadarCard.js    │
│           │ (Health Meter, Radar, Stress Test Modal)  │ test_c78.mjs        │
└───────────┴───────────────────────────────────────────┴─────────────────────┘
```

---

## 5. Stage C.7.1 Focus & Acceptance Criteria

When the Stage C.7.1 gate is opened, it will implement:
1. `services/riskTaxonomy.js`:
   - Risk pillar constants & severity levels.
   - Return series schema & validation helpers.
   - Historical return series adapter (`normalizeHistoricalReturns`).
   - Confidence scoring & data quality evaluator.
2. `tests/test_c71.mjs`:
   - 20-point automated acceptance suite validating return series normalization, lookback validation, coverage ratio thresholds, quality flags, schema invariants, and zero-mutation guarantees.
