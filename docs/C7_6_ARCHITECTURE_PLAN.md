# Master Architectural Plan: Stage C.7.6 Scenario & Stress-Test Engine

**Document Version**: `2.1.0`  
**Master Standard Identifier**: `C7_6_V1`  
**Stage**: C.7.6 (Scenario & Stress-Test Engine)  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Certified Baseline**: [`d0f337c`](https://github.com/Nreddy2020/finapp-mobile/commit/d0f337c) (Stage C.7.5 Master Certified)  
**Branch**: `fintech-using-chatgpt`  
**Zero-Code Gate**: `ACTIVE 🔒` (Architecture Plan ONLY — Zero Implementation/Test Code)  

---

## 1. Executive Scope & Orchestration Architecture

Stage C.7.6 defines the **Scenario & Stress-Test Engine** (`services/scenarioStressEngine.js`), serving as the unified stress-testing orchestration and impact attribution layer for the FinLife financial intelligence platform.

Stage C.7.6 is strictly an **orchestration, shock-propagation, and impact-attribution layer**. It does not duplicate, recalculate, or replace any certified calculation engines from C.7.1 through C.7.5. Instead, it systematically applies multi-factor market, macro, and custom shocks to portfolio valuations and cash flows, and delegates downstream metric re-evaluations to the frozen certified engines:

```
                       ┌────────────────────────────────────────────────────────┐
                       │          Stage C.7.6 Scenario & Stress Engine          │
                       │             (services/scenarioStressEngine.js)         │
                       └──────────────────────────┬─────────────────────────────┘
                                                  │
          ┌─────────────────────┬─────────────────┼─────────────────┬─────────────────────┐
          │                     │                 │                 │                     │
          ▼                     ▼                 ▼                 ▼                     ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────┐  ┌───────────────────┐  ┌─────────────────┐
│ Risk Taxonomy    │  │ Concentration    │  │ Vol/DD   │  │ Correlation / PCA │  │ Liquidity/Flow  │
│ (riskTaxonomy.js)│  │ (concentration   │  │ (volatil │  │ (correlation      │  │ (liquidity      │
│ [C.7.1 Certified]│  │  Engine.js)      │  │  ityDD   │  │  Engine.js)       │  │  Engine.js)     │
│ [Canonical 8 Cls]│  │ [C.7.2 Certified]│  │  Engine) │  │ [C.7.4 Certified] │  │ [C.7.5 Cert.]   │
│                  │  │                  │  │ [C.7.3]  │  │                   │  │ [Runway/Tiers]  │
└──────────────────┘  └──────────────────┘  └──────────┘  └───────────────────┘  └─────────────────┘
```

---

## 2. Core Architectural Invariants & Remediation Contracts

### 2.1 C7.6-R1: Canonical 8-Class Taxonomy & CASH Treatment
C.7.6 strictly preserves the frozen C.7.1 canonical 8-class taxonomy:
```javascript
export const CANONICAL_ASSET_CLASSES = Object.freeze([
    'STOCK',
    'MUTUAL_FUND',
    'ETF',
    'GOLD',
    'CRYPTO',
    'BOND',
    'REAL_ESTATE',
    'OTHER'
]);
```
- **CASH is NOT a ninth canonical risk class**.
- C.7.6 does not independently assign CASH to an asset class or liquidity tier.
- C.7.6 preserves each holding's authoritative asset/instrument metadata and delegates liquidity treatment entirely to C.7.5.
- Every scenario shock vector MUST contain exactly the 8 canonical classes.
- No C.7.6 transformation may mutate or extend the C.7.1 canonical taxonomy.

### 2.2 C7.6-R2: Historical Scenario Semantics (Policy Shock Proxies)
- The scenarios `HIST_2008_GFC`, `HIST_2020_COVID`, `HIST_2022_TECH_RATES`, and `HIST_2013_TAPER_TANTRUM` are standardized **POLICY SHOCK PROXIES** inspired by historical market regimes.
- **Contract**: Historical scenarios in C.7.6 are deterministic policy shock vectors inspired by historical market regimes. They are **NOT** reconstructed historical market return series and **MUST NOT** manufacture historical price/return observations.
- C.7.3 remains the sole authoritative engine for actual historical price/return series, historical VaR, and historical CVaR calculations.

### 2.3 C7.6-R3: Beta Authority & Precedence
- The diagonal of the C.7.4 covariance matrix represents constituent periodic variance $\sigma_i^2$, **NOT** beta. Beta is never inferred from variance.
- Beta resolution follows strict authority hierarchy:
  1. **Tier 1 (`AUTHORITATIVE_METADATA`)**: Explicit holding metadata `beta` ($\beta_i \in [0.0, 5.0]$).
  2. **Tier 2 (`DEFAULT_UNIT_BETA`)**: Default unit beta $\beta_i = 1.0$ (when metadata is missing, unspecified, or invalid).
- The DTO explicitly exposes `beta` and `betaSource` (`AUTHORITATIVE_METADATA` | `DEFAULT_UNIT_BETA`) per holding. No other beta sources are permitted.

### 2.4 C7.6-R4 & C7.6-R5: Authoritative Shock Composition Pipeline & Bounds
All holding-level shocks follow a deterministic, closed-form pipeline:

```
BASE_ASSET_CLASS_SHOCK: R_S(c(i))
        ↓
AUTHORITATIVE_BETA_TRANSFORMATION: Δr_{base} = R_S(c(i)) × β_i
        ↓
MACRO_FACTOR_ADJUSTMENT: Δr_{macro} = M_S(c(i))
        ↓
HOLDING_SPECIFIC_SHOCK: Δr_{holding} = H_S(i)
        ↓
RAW_EFFECTIVE_SHOCK: Δr_{raw} = Δr_{base} + Δr_{macro} + Δr_{holding}
        ↓
BOUNDED_CLAMP: Δr_{effective} = clamp(Δr_{raw}, MIN_STRESS_RETURN, MAX_STRESS_GAIN)
        ↓
STRESSED_VALUATION: V_i^{stressed} = max(0.0, V_i × (1.0 + Δr_{effective}))
```

**Versioned Return Constants**:
- `MIN_STRESS_RETURN = -1.0` (-100% maximum loss for long-only holdings).
- `MAX_STRESS_GAIN = 1.0` (+100% maximum gain under favorable shock conditions).
- Holding valuation guarantee: $0.0 \le V_i^{\text{stressed}} \le V_i \times (1.0 + \text{MAX\_STRESS\_GAIN})$.
- Dollar loss: $\Delta V_i = V_i - V_i^{\text{stressed}}$. Total dollar loss: $\Delta V_p = \sum_{i} \Delta V_i = V_p - V_p^{\text{stressed}}$.
- Percentage loss: $L_p = \frac{\Delta V_p}{V_p} \in [-\text{MAX\_STRESS\_GAIN}, 1.0]$ for $V_p > 0$.

### 2.5 C7.6-R6 & C7.6-R17: Monotonic Downside Reverse-Stress Solver
To deterministically solve for the minimum market stress multiplier $\lambda^* \ge 0$ required to reach a target portfolio loss ratio $L^* \in (0.0, 1.0]$:

#### 2.5.1 Downside-Only Sensitivity Isolation
Canonical scenarios may contain both negative and positive asset shocks (e.g. Gold $+15\%$, Bond $+5\%$). If positive shocks were scaled by $\lambda$, $V_p(\lambda)$ would not be monotonic.

To guarantee mathematical monotonicity, the reverse-stress solver isolates the **downside sensitivity vector**:
\[
s_i^{\text{downside}} = \min\left(0.0, R_S(c(i)) \times \beta_i\right) \le 0.0
\]
Positive scenario shocks are excluded from the loss-threshold solver so that diversifying assets do not artificially increase the market stress required to reach a loss threshold.

#### 2.5.2 Monotonic Valuation & Loss Functions
Stressed valuation under reverse stress:
\[
V_p(\lambda) = \sum_{i=1}^{N} V_i \max\left(0.0, 1.0 + \operatorname{clamp}(\lambda \cdot s_i^{\text{downside}}, -1.0, 0.0)\right)
\]
The portfolio loss ratio is:
\[
L_p(\lambda) = 1.0 - \frac{V_p(\lambda)}{V_p} \quad (\text{for } V_p > 0)
\]

**Mathematical Proof of Monotonicity**:
Since $s_i^{\text{downside}} \le 0$, for any $\lambda_1 < \lambda_2$:
\[
\lambda_1 \cdot s_i^{\text{downside}} \ge \lambda_2 \cdot s_i^{\text{downside}}
\]
\[
\implies 1.0 + \operatorname{clamp}(\lambda_1 \cdot s_i^{\text{downside}}, -1.0, 0.0) \ge 1.0 + \operatorname{clamp}(\lambda_2 \cdot s_i^{\text{downside}}, -1.0, 0.0)
\]
\[
\implies V_p(\lambda_1) \ge V_p(\lambda_2)
\]
\[
\implies L_p(\lambda_1) \le L_p(\lambda_2)
\]
Thus, $\frac{dL_p}{d\lambda} \ge 0$ across the entire interval $\lambda \in [0.0, \lambda_{\max}]$, which **mathematically guarantees** that deterministic bisection converges to the unique root.

#### 2.5.3 Clean Solver State Machine
1. **`ZERO_TARGET`**: If $L^* \le 0 \implies \lambda^* = 0.0, \text{iterations} = 0$.
2. **`INVALID_TARGET`**: If $L^* > 1.0 \implies \lambda^* = \text{null}, \text{iterations} = 0$.
3. **`SOLVED`**: When $0 < L^* \le L_p(\lambda_{\max})$ (where $\lambda_{\max} = 3.0$):
   - Solved via deterministic bisection on $\lambda \in [0.0, \lambda_{\max}]$ with convergence tolerance $\epsilon = 10^{-4}$ and $\text{maxIterations} = 50$.
   - Returns $\lambda^*$ and `status: 'SOLVED'`.
4. **`UNREACHABLE_WITHIN_BOUNDS`**: If $L_p(\lambda_{\max}) < L^* \implies \lambda^* = \text{null}, \text{status: 'UNREACHABLE\_WITHIN\_BOUNDS'}$.

### 2.6 C7.6-R7: 100% Deterministic Execution (0 Timestamps)
- Zero internally generated timestamps. `evaluationTimestamp` is removed from the analytical DTO; callers provide the mandatory deterministic `asOfDate`.
- Zero wall-clock `Date.now()` and zero argument-less `new Date()` calls (verified by AST scan in test suite).

### 2.7 C7.6-R8: Custom Scenario Schema & Strict Validation
A formal `CustomScenarioSchema` governs user-defined scenarios:
```typescript
interface CustomScenarioInput {
  scenarioId: string; // Required, non-empty alphanumeric string
  scenarioName: string; // Required, descriptive string
  scenarioCategory: 'CUSTOM';
  assetClassShockVector: {
    STOCK?: number; // [-1.0, 1.0]
    MUTUAL_FUND?: number;
    ETF?: number;
    GOLD?: number;
    CRYPTO?: number;
    BOND?: number;
    REAL_ESTATE?: number;
    OTHER?: number;
  };
  holdingSpecificShocks?: { [holdingId: string]: number }; // [-1.0, 1.0]
  incomeShock?: number; // [0.0, 1.0] (fractional income reduction)
  burnShock?: number; // [-0.5, 2.0] (fractional burn increase/decrease)
  haircutMultiplier?: number; // [0.0, 3.0] (haircut scaling)
}
```
**Validation Rules**:
- Rejects `NaN`, `Infinity`, unknown asset classes, duplicate scenario IDs, and malformed numeric values.
- Unspecified asset class shocks default strictly to `UNSPECIFIED_SHOCK_POLICY = 0.0%`.
- Custom scenarios cannot bypass statutory ELSS/PPF locks or C.7.5 liquidity authority hierarchy.

### 2.8 C7.6-R9 & C7.6-R13: Strict Orchestration Boundary & C.7.5 Delegation
- C.7.6 does not perform its own liquidity classification, lockup evaluation, or runway calculations.
- C.7.6 constructs stressed holding valuations $V_i^{\text{stressed}}$ and stressed monthly cash flows ($I_S, B_S^{\text{total}}, B_S^{\text{survival}}$), and passes them into C.7.5 `calculateLiquidityBreakdown` and `evaluateCashFlowAndRunway` using identical holding IDs and authoritative metadata.
- C.7.5 remains the sole authority for liquidity tiers, lockups, FD early-break penalties, accessible capital, and runway compression.

### 2.9 C7.6-R10: Data Quality & Confidence Level Propagation
Authoritative confidence propagation rules:
- **`HIGH`**: All required upstream metrics (`hasValuationData: true`, `hasCashFlowData: true`, coverage ratio $\ge 0.95$, no estimated burn).
- **`MODERATE`**: No required upstream metric is `LOW` or `UNAVAILABLE`, but estimated burn ratio was applied in C.7.5 or coverage ratio $\in [0.80, 0.95)$.
- **`LOW`**: Any required upstream metric is `LOW`, or coverage ratio $< 0.80$, or unknown asset class exposure $> 15\%$.
- **`UNAVAILABLE`**: Missing valuation data or empty portfolio.

### 2.10 C7.6-R12: Loss Attribution Conservation Invariants
For any positive portfolio valuation ($V_p > 0$):
1. **Dollar Loss Conservation**:
   \[
   \sum_{c \in \mathcal{C}} \Delta V_c = \Delta V_p \pm 10^{-4}
   \]
2. **Loss Contribution Share Conservation**:
   - If $\Delta V_p > 0 \implies \text{Share}_c = \frac{\Delta V_c}{\Delta V_p} \ge 0.0$ and $\sum_{c} \text{Share}_c = 1.0 \pm 10^{-6}$.
   - If $\Delta V_p \le 0$ (gain or zero loss) $\implies \text{Share}_c = \text{null}$ (never fabricate artificial loss shares).
3. **Deterministic Top Loss Holdings Ranking**:
   Rank order: $\Delta V_i \text{ DESC} \to V_i \text{ DESC} \to \text{symbol ASC} \to \text{holdingId ASC}$.

---

## 3. Canonical Scenario Catalog (`SCENARIO_POLICY_V1`)

All canonical scenarios explicitly define all 8 canonical asset classes.

```javascript
export const SCENARIO_POLICY_VERSION = "C7_6_V1";

export const SCENARIO_POLICY_V1 = Object.freeze({
    policyVersion: SCENARIO_POLICY_VERSION,
    limits: Object.freeze({
        MIN_STRESS_RETURN: -1.0,
        MAX_STRESS_GAIN: 1.0,
        UNSPECIFIED_SHOCK_POLICY: 0.0,
        REVERSE_STRESS_MAX_LAMBDA: 3.0,
        REVERSE_STRESS_TOLERANCE: 1e-4,
        REVERSE_STRESS_MAX_ITERATIONS: 50
    }),
    canonicalScenarios: Object.freeze({
        // 1. HISTORICAL POLICY SHOCK PROXIES
        HIST_2008_GFC: Object.freeze({
            id: 'HIST_2008_GFC',
            name: '2008 Global Financial Crisis (Proxy)',
            category: 'HISTORICAL_PROXY',
            assetShocks: Object.freeze({
                STOCK: -0.45,
                MUTUAL_FUND: -0.38,
                ETF: -0.45,
                GOLD: 0.15,
                CRYPTO: -0.60,
                BOND: 0.05,
                REAL_ESTATE: -0.25,
                OTHER: -0.30
            }),
            incomeShock: 0.20, // 20% income loss
            burnShock: 0.0,
            haircutMultiplier: 1.5
        }),
        HIST_2020_COVID: Object.freeze({
            id: 'HIST_2020_COVID',
            name: '2020 COVID-19 Flash Crash (Proxy)',
            category: 'HISTORICAL_PROXY',
            assetShocks: Object.freeze({
                STOCK: -0.32,
                MUTUAL_FUND: -0.28,
                ETF: -0.32,
                GOLD: -0.05,
                CRYPTO: -0.40,
                BOND: 0.02,
                REAL_ESTATE: -0.10,
                OTHER: -0.20
            }),
            incomeShock: 0.30,
            burnShock: 0.0,
            haircutMultiplier: 1.2
        }),
        HIST_2022_TECH_RATES: Object.freeze({
            id: 'HIST_2022_TECH_RATES',
            name: '2022 Tech & Rate Hike Drawdown (Proxy)',
            category: 'HISTORICAL_PROXY',
            assetShocks: Object.freeze({
                STOCK: -0.22,
                MUTUAL_FUND: -0.18,
                ETF: -0.22,
                GOLD: -0.02,
                CRYPTO: -0.65,
                BOND: -0.12,
                REAL_ESTATE: -0.08,
                OTHER: -0.15
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.0
        }),
        HIST_2013_TAPER_TANTRUM: Object.freeze({
            id: 'HIST_2013_TAPER_TANTRUM',
            name: '2013 Taper Tantrum (Proxy)',
            category: 'HISTORICAL_PROXY',
            assetShocks: Object.freeze({
                STOCK: -0.15,
                MUTUAL_FUND: -0.12,
                ETF: -0.15,
                GOLD: -0.20,
                CRYPTO: -0.30,
                BOND: -0.08,
                REAL_ESTATE: -0.05,
                OTHER: -0.10
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.0
        }),

        // 2. HYPOTHETICAL STRESS SCENARIOS
        HYPO_EQUITY_CRASH_MODERATE: Object.freeze({
            id: 'HYPO_EQUITY_CRASH_MODERATE',
            name: 'Moderate Equity Correction',
            category: 'HYPOTHETICAL',
            assetShocks: Object.freeze({
                STOCK: -0.15,
                MUTUAL_FUND: -0.12,
                ETF: -0.15,
                GOLD: 0.05,
                CRYPTO: -0.25,
                BOND: 0.01,
                REAL_ESTATE: 0.0,
                OTHER: -0.05
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.0
        }),
        HYPO_EQUITY_CRASH_SEVERE: Object.freeze({
            id: 'HYPO_EQUITY_CRASH_SEVERE',
            name: 'Severe Equity Crash',
            category: 'HYPOTHETICAL',
            assetShocks: Object.freeze({
                STOCK: -0.35,
                MUTUAL_FUND: -0.30,
                ETF: -0.35,
                GOLD: 0.10,
                CRYPTO: -0.50,
                BOND: 0.03,
                REAL_ESTATE: -0.05,
                OTHER: -0.15
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.3
        }),
        HYPO_CRYPTO_CAPITULATION: Object.freeze({
            id: 'HYPO_CRYPTO_CAPITULATION',
            name: 'Crypto Market Capitulation',
            category: 'HYPOTHETICAL',
            assetShocks: Object.freeze({
                STOCK: 0.0,
                MUTUAL_FUND: 0.0,
                ETF: 0.0,
                GOLD: 0.0,
                CRYPTO: -0.80,
                BOND: 0.0,
                REAL_ESTATE: 0.0,
                OTHER: 0.0
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.0
        }),
        HYPO_REAL_ESTATE_SLUMP: Object.freeze({
            id: 'HYPO_REAL_ESTATE_SLUMP',
            name: 'Real Estate Illiquidity Freeze',
            category: 'HYPOTHETICAL',
            assetShocks: Object.freeze({
                STOCK: -0.05,
                MUTUAL_FUND: -0.05,
                ETF: -0.05,
                GOLD: 0.0,
                CRYPTO: 0.0,
                BOND: 0.0,
                REAL_ESTATE: -0.30,
                OTHER: -0.10
            }),
            incomeShock: 0.0,
            burnShock: 0.0,
            haircutMultiplier: 1.5
        }),

        // 3. MACRO-ECONOMIC STRESS SCENARIOS
        MACRO_STAGFLATION: Object.freeze({
            id: 'MACRO_STAGFLATION',
            name: 'Stagflationary Shock',
            category: 'MACRO',
            assetShocks: Object.freeze({
                STOCK: -0.20,
                MUTUAL_FUND: -0.18,
                ETF: -0.20,
                GOLD: 0.25,
                CRYPTO: -0.35,
                BOND: -0.15,
                REAL_ESTATE: -0.05,
                OTHER: -0.10
            }),
            incomeShock: 0.15, // 15% income drop
            burnShock: 0.15,   // 15% inflation on living burn
            haircutMultiplier: 1.2
        }),
        MACRO_INTEREST_RATE_HIKE: Object.freeze({
            id: 'MACRO_INTEREST_RATE_HIKE',
            name: 'Central Bank Rate Shock',
            category: 'MACRO',
            assetShocks: Object.freeze({
                STOCK: -0.12,
                MUTUAL_FUND: -0.10,
                ETF: -0.12,
                GOLD: -0.05,
                CRYPTO: -0.25,
                BOND: -0.10,
                REAL_ESTATE: -0.10,
                OTHER: -0.05
            }),
            incomeShock: 0.0,
            burnShock: 0.20, // 20% increase in debt service burn
            haircutMultiplier: 1.0
        }),
        MACRO_PROLONGED_RECESSION: Object.freeze({
            id: 'MACRO_PROLONGED_RECESSION',
            name: 'Prolonged Recession & Job Loss',
            category: 'MACRO',
            assetShocks: Object.freeze({
                STOCK: -0.30,
                MUTUAL_FUND: -0.25,
                ETF: -0.30,
                GOLD: 0.10,
                CRYPTO: -0.50,
                BOND: 0.04,
                REAL_ESTATE: -0.15,
                OTHER: -0.20
            }),
            incomeShock: 0.50, // 50% severe income disruption
            burnShock: 0.10,
            haircutMultiplier: 1.5
        })
    })
});
```

---

## 4. Master DTO Specification (`C7_6_V1`)

```typescript
interface ScenarioStressEvaluationDTO {
  portfolioId: string | null;
  asOfDate: string; // ISO 8601 mandatory deterministic timestamp
  policyVersion: "C7_6_V1";
  status: "EVALUATED" | "EMPTY_PORTFOLIO" | "INVALID_INPUT" | "INSUFFICIENT_DATA" | "DEGRADED";
  
  dataQuality: {
    confidenceLevel: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
    coverageRatio: number;
    hasCashFlowData: boolean;
    hasValuationData: boolean;
    unknownHoldingCount: number;
    upstreamQualitySummary: {
      concentrationConfidence: string;
      volatilityConfidence: string;
      correlationConfidence: string;
      liquidityConfidence: string;
    };
  };

  baseline: {
    grossPortfolioValue: number;
    accessibleLiquidity: number;
    monthlyIncome: number;
    survivalBurn: number;
    totalBurn: number;
    baselineRunwayMonths: number | null;
  };

  // Matrix of evaluated scenarios
  scenarios: {
    [scenarioId: string]: {
      scenarioId: string;
      scenarioName: string;
      scenarioCategory: "HISTORICAL_PROXY" | "HYPOTHETICAL" | "MACRO" | "CUSTOM";
      stressedPortfolioValue: number;
      dollarLoss: number;
      percentageLoss: number | null;
      postStressAccessibleLiquidity: number;
      postStressMonthlyDeficit: number;
      postStressRunwayMonths: number | null;
      runwayCompressionMonths: number | null;
      resilienceRating: "HIGH" | "MODERATE" | "VULNERABLE" | "CRITICAL";
      
      lossAttribution: {
        byAssetClass: Array<{
          assetClass: string;
          preStressValue: number;
          postStressValue: number;
          dollarLoss: number;
          percentageLoss: number | null;
          lossContributionShare: number | null;
        }>;
        topLossHoldings: Array<{
          holdingId: string;
          symbol: string;
          assetClass: string;
          beta: number;
          betaSource: "AUTHORITATIVE_METADATA" | "DEFAULT_UNIT_BETA";
          preStressValue: number;
          postStressValue: number;
          dollarLoss: number;
          lossContributionShare: number | null;
        }>;
      };
      
      warnings: string[];
    };
  };

  // Reverse Stress Testing Results
  reverseStressTest: {
    marketDropToCause20PctLoss: {
      solvedLambda: number | null;
      status: "SOLVED" | "ZERO_TARGET" | "INVALID_TARGET" | "UNREACHABLE_WITHIN_BOUNDS";
      iterations: number;
    };
    marketDropToCause35PctLoss: {
      solvedLambda: number | null;
      status: "SOLVED" | "ZERO_TARGET" | "INVALID_TARGET" | "UNREACHABLE_WITHIN_BOUNDS";
      iterations: number;
    };
    criticalVulnerabilityFactor: string | null; // e.g. "EQUITY_CONCENTRATION", "CRYPTO_SPECULATION"
  };

  // Cross-Scenario Resilience Summary
  resilienceSummary: {
    worstCaseScenarioId: string | null;
    worstCaseDollarLoss: number;
    worstCasePercentageLoss: number | null;
    worstCaseRunwayMonths: number | null;
    averagePercentageLoss: number | null;
    overallStressResilienceTier: "ROBUST" | "RESILIENT" | "VULNERABLE" | "HIGHLY_VULNERABLE";
  };

  warnings: string[];
}
```

---

## 5. Comprehensive 56-Scenario Acceptance Matrix (`tests/test_c76.mjs`)

The acceptance test suite will cover the 32 mandated test categories:

1. **Group 1: Canonical 8-Class Completeness & Taxonomy Invariance (Tests 1–6)**:
   - Test 1: All 11 canonical scenarios define all 8 canonical asset classes.
   - Test 2: CASH holding mapped to existing taxonomy without creating a 9th class.
   - Test 3: Unspecified shock policy strictly defaults to 0.0%.
   - Test 4: Historical proxy semantic disclaimer verified on DTO.
   - Test 5: Rejection of non-canonical asset class in scenario shock vector.
   - Test 6: Deterministic canonical policy versioning (`C7_6_V1`).

2. **Group 2: Beta Authority & Precedence Hierarchy (Tests 7–12)**:
   - Test 7: Authoritative metadata beta applied ($\beta = 1.4$).
   - Test 8: Missing beta resolves to `DEFAULT_UNIT_BETA` ($\beta = 1.0$).
   - Test 9: Invalid / NaN / negative beta falls back safely to unit beta.
   - Test 10: DTO exposes `beta` and `betaSource` (`AUTHORITATIVE_METADATA` | `DEFAULT_UNIT_BETA`) per holding.
   - Test 11: Beta scaling produces exact linear holding shock before clamping.
   - Test 12: Covariance diagonal strictly isolated from beta calculation.

3. **Group 3: Authoritative Shock Composition & Boundedness Pipeline (Tests 13–18)**:
   - Test 13: Base + Macro + Holding additive composition order exactness.
   - Test 14: Clamping at `MIN_STRESS_RETURN = -1.0` (100% loss max).
   - Test 15: Clamping at `MAX_STRESS_GAIN = 1.0` (+100% gain max).
   - Test 16: Non-negativity invariant: $V_i^{\text{stressed}} \ge 0.0$ for all holdings.
   - Test 17: Positive market shock produces gain without distorting loss shares.
   - Test 18: Zero market shock produces exact identity ($V_p^{\text{stressed}} = V_p$).

4. **Group 4: Loss Attribution & Deterministic Conservation (Tests 19–24)**:
   - Test 19: Conservation of dollar loss: $\sum \Delta V_c = \Delta V_p$.
   - Test 20: Conservation of loss share: $\sum \text{Share}_c = 1.0$ when $\Delta V_p > 0$.
   - Test 21: Loss shares evaluated as `null` when $\Delta V_p \le 0$ (gain/zero loss).
   - Test 22: Deterministic 4-tier tie-breaking for top loss holdings.
   - Test 23: Single holding portfolio loss attribution.
   - Test 24: Multi-asset cross-class loss attribution decomposition.

5. **Group 5: Post-Stress Liquidity & C.7.5 Delegation (Tests 25–30)**:
   - Test 25: Stressed holding valuations passed cleanly into C.7.5.
   - Test 26: Post-stress accessible liquidity respects early-break penalties.
   - Test 27: Post-stress emergency runway compression evaluated accurately.
   - Test 28: Macro income shock (50% drop) compresses runway deterministically.
   - Test 29: Macro inflation shock (+15% burn) compresses runway deterministically.
   - Test 30: Self-sustaining cash flow state handles 0 monthly deficit.

6. **Group 6: Custom Scenario Schema & Strict Validation (Tests 31–36)**:
   - Test 31: Valid custom scenario evaluates successfully.
   - Test 32: Malformed custom scenario (NaN shock) rejected with `INVALID_INPUT`.
   - Test 33: Duplicate custom scenario ID rejected.
   - Test 34: Out-of-bounds custom shock ($> 1.0$ or $< -1.0$) clamped/rejected.
   - Test 35: Custom scenario cannot override statutory ELSS lockup.
   - Test 36: Custom scenario cannot bypass C.7.5 5-tier liquidity hierarchy.

7. **Group 7: Monotonic Downside Reverse-Stress Solver & Edge Cases (Tests 37–44)**:
   - Test 37: Downside sensitivity vector isolates $s_i^{\text{downside}} \le 0.0$.
   - Test 38: Achievable target loss (20%) solved via bisection ($|L_p(\lambda^*) - 0.20| < 10^{-4}$).
   - Test 39: Achievable target loss (35%) solved via bisection.
   - Test 40: Target loss = 0 returns $\lambda^* = 0.0$ (`ZERO_TARGET`).
   - Test 41: Target loss unreachable within $\lambda_{\max} = 3.0$ returns `UNREACHABLE_WITHIN_BOUNDS`.
   - Test 42: Mixed positive/negative asset shocks (e.g. Gold +15%) do not distort monotonic downside solving.
   - Test 43: Solver convergence within 50 iterations verified.
   - Test 44: Critical vulnerability factor identification.

8. **Group 8: Boundary Conditions & Empty Portfolio Safety (Tests 45–48)**:
   - Test 45: Empty portfolio boundary ($N = 0$) returns `EMPTY_PORTFOLIO` with null loss shares.
   - Test 46: 100% Cash portfolio boundary (0% asset loss).
   - Test 47: 100% Locked Real Estate portfolio under property slump.
   - Test 48: Zero recurring burn boundary handling.

9. **Group 9: Data Quality, Determinism, AST Scan & Regression (Tests 49–56)**:
   - Test 49: Upstream data quality & confidence propagation (HIGH, MODERATE, LOW, UNAVAILABLE).
   - Test 50: Estimated burn from C.7.5 degrades confidence to MODERATE.
   - Test 51: Mandatory deterministic `asOfDate` enforced (no internal timestamps).
   - Test 52: AST wall-clock scan confirms 0 `Date.now()` and 0 argument-less `new Date()`.
   - Test 53: Deep 5-store read-only safety guard (100% zero store mutations).
   - Test 54: Deterministic output repeatability across consecutive runs.
   - Test 55: Frozen services diff vs `d0f337c` confirms zero modifications to C.4–C.7.5.
   - Test 56: Full system master regression matrix preservation (439+ existing tests).

---

## 6. Implementation Guardrails

- **Zero-Code Gate**: `ACTIVE 🔒` until this remediated architecture plan is approved.
- **Service Target**: `services/scenarioStressEngine.js`
- **Acceptance Target**: `tests/test_c76.mjs` (56 scenarios)
- **Certified Baseline**: `d0f337c`
- **Frozen Contracts**: All 14 prior certified financial engines remain 100% locked.
