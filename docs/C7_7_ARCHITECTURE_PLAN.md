# Master Architectural Plan: Stage C.7.7 Portfolio Health Score & Risk Explanation Engine

**Document Version**: `1.1.0`  
**Master Standard Identifier**: `C7_7_V1`  
**Stage**: C.7.7 (Portfolio Health Score & Risk Explanation Engine)  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Certified Baseline**: [`64c00a1`](https://github.com/Nreddy2020/finapp-mobile/commit/64c00a1) (Stage C.7.6 Master Certified)  
**Branch**: `fintech-using-chatgpt`  
**Zero-Code Gate**: `ACTIVE 🔒` (Architecture Plan ONLY — Zero Implementation/Test Code)  

---

## 1. Executive Scope & Responsibility Boundary

Stage C.7.7 defines the **Portfolio Health Score & Risk Explanation Engine** (`services/portfolioHealthScoreEngine.js`).

### 1.1 Core Architectural Principle: *"Calculate once. Authoritatively. Score once. Explain once."*
C.7.7 is strictly an **aggregation, synthesis, holistic scoring, and risk explanation layer**. It does **NOT** calculate, recalculate, or reinterpret any raw financial risk metrics. Instead, it consumes authoritative DTO outputs from certified upstream engines C.7.1 through C.7.6:

```
┌──────────────────────────────┐
│  C.7.1 Risk Taxonomy         │ ───► Canonical 8-Class Mappings & Risk Profiles
└──────────────────────────────┘
┌──────────────────────────────┐
│  C.7.2 Concentration Engine  │ ───► Asset/Sector HHI, Top-1/Top-3 Concentration, Entropy
└──────────────────────────────┘
┌──────────────────────────────┐
│  C.7.3 Volatility & Drawdown │ ───► Annualized Volatility, Max Drawdown, 95% VaR / CVaR
└──────────────────────────────┘
┌──────────────────────────────┐
│  C.7.4 Correlation Engine    │ ───► Mean Pairwise Correlation, PCA Dominant Factor Share
└──────────────────────────────┘
┌──────────────────────────────┐
│  C.7.5 Liquidity Engine      │ ───► Emergency Runway Months, Accessible Ratio, Liquidity Score
└──────────────────────────────┘
┌──────────────────────────────┐
│  C.7.6 Scenario Stress       │ ───► Worst-Case Loss %, Runway Compression, Reverse Stress λ*
└──────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│             Stage C.7.7 Portfolio Health Score & Explanation Engine         │
│                      (services/portfolioHealthScoreEngine.js)               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                ▼                                             ▼
     Holistic Health Score (0–100)               Deterministic Risk Explanation
         & 5 Dimension Scores                    & Ranked Primary Risk Drivers
```

### 1.2 Explicit Non-Responsibilities
1. C.7.7 MUST NOT calculate price volatilities, historical returns, or covariance matrices.
2. C.7.7 MUST NOT re-evaluate asset classifications, liquidity tiers, statutory lockups, or early-exit penalties.
3. C.7.7 MUST NOT simulate shock vectors or solve bisection equations (delegated to C.7.6).
4. C.7.7 MUST NOT mutate any upstream DTO, store state, or portfolio object.

---

## 2. Master Policy & Versioning (`HEALTH_SCORE_POLICY_V1`)

```javascript
export const HEALTH_SCORE_POLICY_VERSION = "C7_7_V1";

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
```

---

## 3. Mathematical Scoring Model & Exact Normalization (`C7.7-R1` & `C7.7-R2`)

The headline Portfolio Health Score $S_{\text{health}} \in [0.0, 100.0]$ is:
\[
S_{\text{health}} = \sum_{d \in \mathcal{D}} W_d \times S_d
\]
Where $\sum W_d = 1.00$ ($0.20 + 0.20 + 0.15 + 0.25 + 0.20 = 1.00$).

### 3.1 Dimension 1: Concentration & Diversification ($S_{\text{conc}}$)
- **Source**: C.7.2 (`concentrationEngine.js`).
- **Sub-Score Formulas**:
  1. **Asset Class HHI Sub-Score** ($S_{\text{HHI\_asset}}$):
     \[
     S_{\text{HHI\_asset}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, H_{\text{asset}} - 1500)}{8500} \times 100.0, 0.0, 100.0\right)
     \]
  2. **Sector HHI Sub-Score** ($S_{\text{HHI\_sector}}$):
     \[
     S_{\text{HHI\_sector}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, H_{\text{sector}} - 1500)}{8500} \times 100.0, 0.0, 100.0\right)
     \]
     *(If sector data is unavailable, $H_{\text{sector}}$ defaults safely to $H_{\text{asset}}$).*
  3. **Top-1 Holding Share Sub-Score** ($S_{\text{top1}}$):
     \[
     S_{\text{top1}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, w_1 - 0.15)}{0.60} \times 100.0, 0.0, 100.0\right)
     \]
  4. **Top-3 Holdings Share Sub-Score** ($S_{\text{top3}}$):
     \[
     S_{\text{top3}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, w_3 - 0.35)}{0.55} \times 100.0, 0.0, 100.0\right)
     \]
- **Composite Dimension Score**:
  \[
  S_{\text{conc}} = 0.30 S_{\text{HHI\_asset}} + 0.20 S_{\text{HHI\_sector}} + 0.30 S_{\text{top1}} + 0.20 S_{\text{top3}}
  \]

### 3.2 Dimension 2: Downside Risk & Volatility ($S_{\text{vol}}$)
- **Source**: C.7.3 (`volatilityDrawdownEngine.js`).
- **Sub-Score Formulas**:
  1. **Annualized Volatility Sub-Score** ($S_{\sigma}$):
     \[
     S_{\sigma} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \sigma_{\text{ann}} - 0.08)}{0.32} \times 100.0, 0.0, 100.0\right)
     \]
  2. **Maximum Drawdown Sub-Score** ($S_{\text{MDD}}$):
     \[
     S_{\text{MDD}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \text{MDD} - 0.10)}{0.40} \times 100.0, 0.0, 100.0\right)
     \]
  3. **95% Historical CVaR Sub-Score** ($S_{\text{CVaR}}$):
     \[
     S_{\text{CVaR}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \text{CVaR}_{95} - 0.03)}{0.12} \times 100.0, 0.0, 100.0\right)
     \]
- **Composite Dimension Score**:
  \[
  S_{\text{vol}} = 0.40 S_{\sigma} + 0.35 S_{\text{MDD}} + 0.25 S_{\text{CVaR}}
  \]
  *(Dynamic Sub-Metric Reweighting: If $\text{CVaR}_{95}$ is null due to insufficient history ($<252$ observations), weights renormalize to $S_{\sigma} = 0.5333, S_{\text{MDD}} = 0.4667$).*

### 3.3 Dimension 3: Correlation & Factor Risk ($S_{\text{corr}}$)
- **Source**: C.7.4 (`correlationEngine.js`).
- **Sub-Score Formulas**:
  1. **Mean Pairwise Correlation Sub-Score** ($S_{\rho}$):
     \[
     S_{\rho} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \bar{\rho} - 0.20)}{0.60} \times 100.0, 0.0, 100.0\right)
     \]
  2. **PCA Dominant Factor Share Sub-Score** ($S_{\text{PCA}}$):
     \[
     S_{\text{PCA}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \text{PCA}_{\text{share}} - 0.40)}{0.50} \times 100.0, 0.0, 100.0\right)
     \]
- **Composite Dimension Score**:
  \[
  S_{\text{corr}} = 0.50 S_{\rho} + 0.50 S_{\text{PCA}}
  \]
  *(If portfolio has $N < 2$ holdings, $S_{\text{corr}} = 50.0$ neutral score with `SINGLE_HOLDING_NEUTRAL_CORRELATION` flag).*

### 3.4 Dimension 4: Liquidity & Cash Runway ($S_{\text{liq}}$)
- **Source**: C.7.5 (`liquidityEngine.js`).
- **Sub-Score Formulas**:
  1. **Emergency Runway Sub-Score** ($S_{\text{runway}}$):
     \[
     S_{\text{runway}} = \begin{cases} 
     100.0 & \text{if } R_{\text{months}} \ge 12.0 \text{ or } R_{\text{months}} = \text{null (surplus cash flow)} \\ 
     \frac{R_{\text{months}}}{12.0} \times 100.0 & \text{if } 0.0 \le R_{\text{months}} < 12.0 
     \end{cases}
     \]
  2. **Accessible Capital Ratio Sub-Score** ($S_{\text{accessible}}$):
     \[
     S_{\text{accessible}} = \operatorname{clamp}\left(A_{\text{ratio}} \times 100.0, 0.0, 100.0\right)
     \]
  3. **C.7.5 Liquidity Stress Sub-Score** ($S_{\text{C75\_score}}$):
     \[
     S_{\text{C75\_score}} = \operatorname{clamp}\left(S_{\text{C75}}, 0.0, 100.0\right)
     \]
- **Composite Dimension Score**:
  \[
  S_{\text{liq}} = 0.40 S_{\text{runway}} + 0.30 S_{\text{accessible}} + 0.30 S_{\text{C75\_score}}
  \]

### 3.5 Dimension 5: Stress & Scenario Resilience ($S_{\text{stress}}$) (`C7.7-R5` & `C7.7-R6`)
- **Source**: C.7.6 (`scenarioStressEngine.js`).
- **Sub-Score Formulas**:
  1. **Worst-Case Scenario Percentage Loss Sub-Score** ($S_{\text{loss}}$):
     - Provenance: Taken directly from C.7.6 `resilienceSummary.worstCasePercentageLoss`.
     \[
     S_{\text{loss}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, L_{\text{worst}} - 0.10)}{0.35} \times 100.0, 0.0, 100.0\right)
     \]
  2. **Post-Stress Runway Compression Sub-Score** ($S_{\text{comp}}$):
     - Provenance: $\Delta R_{\text{worst}} = \max_{\text{canonical}}(\text{runwayCompressionMonths})$.
     \[
     S_{\text{comp}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \Delta R_{\text{worst}})}{6.0} \times 100.0, 0.0, 100.0\right)
     \]
     *(If cash flow is self-sustaining with 0 compression, $S_{\text{comp}} = 100.0$).*
  3. **Reverse-Stress Resilience Sub-Score** ($S_{\text{rev}}$):
     - Provenance: Taken directly from C.7.6 `reverseStressTest.marketDropToCause20PctLoss` ($\lambda_{20}^*$).
     - Direction: Larger $\lambda_{20}^* \implies$ higher score (more market stress required to reach 20% loss = more resilient).
     \[
     S_{\text{rev}} = \begin{cases}
     100.0 & \text{if status is } \text{'UNREACHABLE\_WITHIN\_BOUNDS'} \text{ (portfolio cannot reach 20\% loss)} \\
     100.0 & \text{if status is } \text{'ZERO\_TARGET'} \\
     \operatorname{clamp}\left(\frac{\lambda_{20}^*}{2.0} \times 100.0, 0.0, 100.0\right) & \text{if status is } \text{'SOLVED'} \\
     0.0 & \text{if status is } \text{'INVALID\_TARGET'}
     \end{cases}
     \]
- **Composite Dimension Score**:
  \[
  S_{\text{stress}} = 0.40 S_{\text{loss}} + 0.30 S_{\text{comp}} + 0.30 S_{\text{rev}}
  \]

---

## 4. Missing Metric vs. Missing Engine & Imputation Policy (`C7.7-R3` & `C7.7-R4`)

To prevent silent fabrication or unfair penalties, C.7.7 strictly separates:

| Scenario | Architectural Treatment | Score Impact | Provenance Flag | Confidence Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Engine Missing / Unprovided** | Conservative Dimension Imputation | $S_d = 40.0$ (applies standard weight $W_d$) | `scoreSource: 'CONSERVATIVE_IMPUTATION'` | Status $\to$ `DEGRADED`, confidence $\to$ `LOW` |
| **Metric Missing (Insufficient History)** | Dynamic Sub-Metric Reweighting | Reweights remaining available sub-metrics in dimension | `scoreSource: 'CALCULATED'` | Confidence degraded to `MODERATE` |
| **Metric Null (Self-Sustaining / Not Applicable)** | Valid Semantic Null | Evaluates to neutral/optimal $S_{\text{sub}} = 100.0$ | `scoreSource: 'CALCULATED'` | No confidence penalty |
| **$\ge 2$ Engines Missing** | Insufficient Data Threshold | Score cannot be computed ($S_{\text{health}} = \text{null}$) | Status $\to$ `INSUFFICIENT_DATA` | Confidence $\to$ `UNAVAILABLE` |

**Provenance Contract**: Every dimension DTO explicitly declares `scoreSource: 'CALCULATED' | 'CONSERVATIVE_IMPUTATION' | 'NEUTRAL_FALLBACK'`.

---

## 5. Health Grade Boundaries & Rounding Contract (`C7.7-R7`)

### 5.1 Authoritative Evaluation Precision
1. Composite score $S_{\text{health}}$ is computed with **full IEEE 754 floating-point precision**.
2. **Grade classification operates strictly on the unrounded authoritative score**.
3. Display score (`displayHealthScore`) is rounded to 2 decimal places (`Math.round(score * 100) / 100`) strictly as a presentation attribute.

### 5.2 Health Grades
- **`A` (`EXCELLENT`)**: $85.0 \le S_{\text{health}} \le 100.0$
- **`B` (`GOOD`)**: $70.0 \le S_{\text{health}} < 85.0$
- **`C` (`FAIR`)**: $50.0 \le S_{\text{health}} < 70.0$
- **`D` (`VULNERABLE`)**: $30.0 \le S_{\text{health}} < 50.0$
- **`F` (`CRITICAL`)**: $0.0 \le S_{\text{health}} < 30.0$

*Boundary Example: An unrounded score of $69.998$ classifies as Grade `C` (`FAIR`), even though its display representation is `70.00`.*

---

## 6. Risk Explanation & Driver Ranking Rules (`C7.7-R8`, `C7.7-R9`, `C7.7-R10`)

### 6.1 Primary Risk Drivers Ranking (Deficit Model)
For each dimension, the **Weighted Score Deficit** is:
\[
\Delta S_d = (100.0 - S_d) \times W_d
\]

**Inclusion & Sorting Rules**:
- **Risk Drivers**: Includes only dimensions with positive deficit ($\Delta S_d > 0.0$). Dimensions with $S_d = 100.0$ ($\Delta S_d = 0.0$) are strictly omitted.
- **Deterministic 3-Tier Tie-Breaking**:
  1. $\Delta S_d \text{ DESC}$ (largest weighted deficit first).
  2. $S_d \text{ ASC}$ (lowest absolute score first).
  3. $\text{dimensionId ASC}$ (`DIM_CONCENTRATION` $\to$ `DIM_CORRELATION` $\to$ `DIM_LIQUIDITY` $\to$ `DIM_STRESS` $\to$ `DIM_VOLATILITY`).
- Selects top 3 drivers.

### 6.2 Key Strengths Identification
- Dimensions with $S_d \ge 80.0$ are included in `strengths`, sorted by $S_d \text{ DESC} \to \text{dimensionId ASC}$.

### 6.3 Explanation Provenance & No-Invention Rule
All explanation text is deterministically synthesized from **factual upstream metric values**. The engine NEVER invents subjective behavioral assumptions (e.g. spending habits, emotional bias).

- **Concentration Template**: `"Concentration deficit of {deficit} pts: Top asset class accounts for {top1Pct}% of portfolio (HHI: {hhi})."`
- **Liquidity Template**: `"Liquidity deficit of {deficit} pts: Emergency runway is {runway} months with {accessiblePct}% accessible capital."`
- **Volatility Template**: `"Downside risk deficit of {deficit} pts: Annualized volatility is {vol}% with historical max drawdown of {mdd}%."`
- **Stress Template**: `"Stress resilience deficit of {deficit} pts: Projected worst-case loss of {loss}% under {scenarioName}."`
- **Correlation Template**: `"Correlation deficit of {deficit} pts: Mean pairwise asset correlation is {rho} with dominant factor share of {pca}%."`

### 6.4 Confidence Isolation (`C7.7-R10`)
Data confidence is 100% isolated from the numerical score. High data quality does not inflate a weak portfolio, and moderate data quality does not penalize a strong portfolio. Confidence is reported purely as a metadata attribute on `dataQuality`.

---

## 7. Master DTO Specification (`C7_7_V1`)

```typescript
interface PortfolioHealthScoreDTO {
  portfolioId: string | null;
  asOfDate: string; // ISO 8601 mandatory deterministic timestamp
  policyVersion: "C7_7_V1";
  status: "EVALUATED" | "EMPTY_PORTFOLIO" | "DEGRADED" | "INSUFFICIENT_DATA";
  
  healthScore: number | null; // Unrounded full precision [0.0, 100.0]
  displayHealthScore: number | null; // 2-decimal rounded for presentation
  healthGrade: "A" | "B" | "C" | "D" | "F" | null;
  healthStatus: "EXCELLENT" | "GOOD" | "FAIR" | "VULNERABLE" | "CRITICAL" | "EMPTY_PORTFOLIO";

  dataQuality: {
    confidenceLevel: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
    coverageRatio: number;
    imputationApplied: boolean;
    missingEngines: string[];
    upstreamConfidenceSummary: {
      concentrationConfidence: string;
      volatilityConfidence: string;
      correlationConfidence: string;
      liquidityConfidence: string;
      scenarioStressConfidence: string;
    };
  };

  dimensions: {
    concentration: {
      dimensionId: "DIM_CONCENTRATION";
      score: number;
      weight: 0.20;
      weightedContribution: number;
      scoreSource: "CALCULATED" | "CONSERVATIVE_IMPUTATION" | "NEUTRAL_FALLBACK";
      subScores: {
        assetHHI: number;
        sectorHHI: number;
        top1Share: number;
        top3Share: number;
      };
      sourceMetrics: {
        assetClassHHI: number;
        sectorHHI: number;
        top1HoldingShare: number;
        top3HoldingShare: number;
      };
    };
    volatility: {
      dimensionId: "DIM_VOLATILITY";
      score: number;
      weight: 0.20;
      weightedContribution: number;
      scoreSource: "CALCULATED" | "CONSERVATIVE_IMPUTATION" | "NEUTRAL_FALLBACK";
      subScores: {
        annualizedVolatility: number;
        maxDrawdown: number;
        cvar95: number | null;
      };
      sourceMetrics: {
        annualizedVolatility: number;
        maxDrawdown: number;
        cvar95: number | null;
      };
    };
    correlation: {
      dimensionId: "DIM_CORRELATION";
      score: number;
      weight: 0.15;
      weightedContribution: number;
      scoreSource: "CALCULATED" | "CONSERVATIVE_IMPUTATION" | "NEUTRAL_FALLBACK";
      subScores: {
        meanPairwiseCorrelation: number;
        pcaDominantFactorShare: number;
      };
      sourceMetrics: {
        meanPairwiseCorrelation: number;
        pcaDominantFactorShare: number;
      };
    };
    liquidity: {
      dimensionId: "DIM_LIQUIDITY";
      score: number;
      weight: 0.25;
      weightedContribution: number;
      scoreSource: "CALCULATED" | "CONSERVATIVE_IMPUTATION" | "NEUTRAL_FALLBACK";
      subScores: {
        runwayMonths: number;
        accessibleRatio: number;
        c75LiquidityScore: number;
      };
      sourceMetrics: {
        runwayMonths: number | null;
        accessibleRatio: number;
        c75LiquidityScore: number;
      };
    };
    stress: {
      dimensionId: "DIM_STRESS";
      score: number;
      weight: 0.20;
      weightedContribution: number;
      scoreSource: "CALCULATED" | "CONSERVATIVE_IMPUTATION" | "NEUTRAL_FALLBACK";
      subScores: {
        worstCaseLossPercentage: number;
        runwayCompressionMonths: number;
        reverseStressLambda20: number;
      };
      sourceMetrics: {
        worstCaseScenarioId: string | null;
        worstCaseLossPercentage: number | null;
        runwayCompressionMonths: number | null;
        reverseStressLambda20: number | null;
        reverseStressStatus: string;
      };
    };
  };

  riskDrivers: Array<{
    dimensionId: string;
    dimensionName: string;
    score: number;
    deficit: number;
    rank: number;
    explanationText: string;
  }>;

  strengths: Array<{
    dimensionId: string;
    dimensionName: string;
    score: number;
    strengthText: string;
  }>;

  explanations: string[];
  warnings: string[];
}
```

---

## 8. Proposed 56-Scenario Acceptance Matrix (`tests/test_c77.mjs`)

1. **Group 1: Dimension Weighting & Mathematical Scoring Invariants (Tests 1–6)**
2. **Group 2: Health Grade & Status Boundary Exactness (Tests 7–12)**
3. **Group 3: Concentration Dimension Normalization (Tests 13–17)**
4. **Group 4: Downside Risk & Volatility Normalization & Dynamic Reweighting (Tests 18–22)**
5. **Group 5: Correlation & Factor Risk Normalization (Tests 23–27)**
6. **Group 6: Liquidity & Runway Normalization (Tests 28–32)**
7. **Group 7: Stress Resilience & Reverse-Stress Normalization (Tests 33–38)**
8. **Group 8: Missing Engine vs Missing Metric & Imputation Policy (Tests 39–44)**
9. **Group 9: Risk Explanation, Provenance & Driver Ranking (Tests 45–50)**
10. **Group 10: Determinism, AST Scan, Read-Only & Full System Regression (Tests 51–56)**

---

## 9. Implementation Guardrails

- **Zero-Code Gate**: `ACTIVE 🔒` until this architecture plan is approved.
- **Service Target**: `services/portfolioHealthScoreEngine.js`
- **Acceptance Target**: `tests/test_c77.mjs` (56 scenarios)
- **Certified Baseline**: `64c00a1` (Stage C.7.6 Master Certified)
- **Frozen Contracts**: All 15 prior certified services remain 100% locked.
