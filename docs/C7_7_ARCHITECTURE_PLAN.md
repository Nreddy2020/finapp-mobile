# Master Architectural Plan: Stage C.7.7 Portfolio Health Score & Risk Explanation Engine

**Document Version**: `1.0.0`  
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
C.7.7 is strictly an **aggregation, holistic scoring, and risk explanation synthesis layer**. It does **NOT** calculate, recalculate, or reinterpret any raw mathematical metrics. Instead, it consumes the authoritative DTO outputs from certified upstream engines C.7.1 through C.7.6:

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

## 2. Mathematical Scoring Model (`C7_7_V1`)

The holistic Portfolio Health Score $S_{\text{health}} \in [0.0, 100.0]$ is a deterministic, weighted combination of 5 orthogonal risk dimension scores:

\[
S_{\text{health}} = \sum_{d=1}^{5} W_d \times S_d
\]

Where $\sum_{d=1}^{5} W_d = 1.00$ (100.0%).

### 2.1 Dimension Weights ($W_d$)

| Dimension ID | Dimension Name | Weight ($W_d$) | Authoritative Source Engine | Key Upstream Input Metrics |
| :--- | :--- | :---: | :--- | :--- |
| `DIM_CONCENTRATION` | **Concentration & Diversification** | **0.20** (20%) | **C.7.2** (`concentrationEngine.js`) | Asset HHI, Sector HHI, Top-1 Share, Top-3 Share |
| `DIM_VOLATILITY` | **Downside Risk & Volatility** | **0.20** (20%) | **C.7.3** (`volatilityDrawdownEngine.js`) | Annualized Volatility, Max Drawdown, 95% Historical VaR / CVaR |
| `DIM_CORRELATION` | **Correlation & Factor Risk** | **0.15** (15%) | **C.7.4** (`correlationEngine.js`) | Mean Pairwise Correlation, PCA Dominant Factor Share (Eigenvalue 1) |
| `DIM_LIQUIDITY` | **Liquidity & Cash Runway** | **0.25** (25%) | **C.7.5** (`liquidityEngine.js`) | Baseline Runway Months, Accessible Ratio, C.7.5 Liquidity Stress Score |
| `DIM_STRESS` | **Stress & Scenario Resilience** | **0.20** (20%) | **C.7.6** (`scenarioStressEngine.js`) | Worst-Case Scenario Loss %, Runway Compression Months, Reverse Stress $\lambda^*$ |

---

## 3. Dimension Scoring Functions & Policy Calibration

Each dimension score $S_d \in [0.0, 100.0]$ is computed using deterministic, bounded piecewise-linear policy mapping calibrated against institutional risk thresholds:

### 3.1 Dimension 1: Concentration & Diversification ($S_{\text{conc}}$)
- **Inputs from C.7.2**: Asset Class HHI ($H_{\text{asset}} \in [0, 10000]$), Sector HHI ($H_{\text{sector}} \in [0, 10000]$), Top-1 Holding Share ($w_1 \in [0, 1]$), Top-3 Holding Share ($w_3 \in [0, 1]$).
- **Sub-score Calculations**:
  - $S_{\text{HHI\_asset}} = \operatorname{clamp}\left(100.0 - \frac{H_{\text{asset}} - 1500}{8500} \times 100.0, 0.0, 100.0\right)$ (HHI $\le 1500 \to 100$, HHI $\ge 10000 \to 0$).
  - $S_{\text{HHI\_sector}} = \operatorname{clamp}\left(100.0 - \frac{H_{\text{sector}} - 1500}{8500} \times 100.0, 0.0, 100.0\right)$.
  - $S_{\text{top1}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, w_1 - 0.15)}{0.60} \times 100.0, 0.0, 100.0\right)$ ($w_1 \le 15\% \to 100$, $w_1 \ge 75\% \to 0$).
  - $S_{\text{top3}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, w_3 - 0.35)}{0.55} \times 100.0, 0.0, 100.0\right)$ ($w_3 \le 35\% \to 100$, $w_3 \ge 90\% \to 0$).
- **Composite Dimension Score**:
  \[
  S_{\text{conc}} = 0.30 S_{\text{HHI\_asset}} + 0.20 S_{\text{HHI\_sector}} + 0.30 S_{\text{top1}} + 0.20 S_{\text{top3}}
  \]

### 3.2 Dimension 2: Downside Risk & Volatility ($S_{\text{vol}}$)
- **Inputs from C.7.3**: Annualized Volatility ($\sigma_{\text{ann}} \ge 0$), Max Drawdown ($\text{MDD} \in [0, 1]$), 95% Historical CVaR ($\text{CVaR}_{95} \in [0, 1]$).
- **Sub-score Calculations**:
  - $S_{\sigma} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \sigma_{\text{ann}} - 0.08)}{0.32} \times 100.0, 0.0, 100.0\right)$ ($\sigma \le 8\% \to 100$, $\sigma \ge 40\% \to 0$).
  - $S_{\text{MDD}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \text{MDD} - 0.10)}{0.40} \times 100.0, 0.0, 100.0\right)$ ($\text{MDD} \le 10\% \to 100$, $\text{MDD} \ge 50\% \to 0$).
  - $S_{\text{CVaR}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \text{CVaR}_{95} - 0.03)}{0.12} \times 100.0, 0.0, 100.0\right)$ ($\text{CVaR} \le 3\% \to 100$, $\text{CVaR} \ge 15\% \to 0$).
- **Composite Dimension Score**:
  \[
  S_{\text{vol}} = 0.40 S_{\sigma} + 0.35 S_{\text{MDD}} + 0.25 S_{\text{CVaR}}
  \]

### 3.3 Dimension 3: Correlation & Factor Risk ($S_{\text{corr}}$)
- **Inputs from C.7.4**: Mean Pairwise Correlation ($\bar{\rho} \in [-1, 1]$), PCA Dominant Factor Share ($\lambda_1 / \sum \lambda \in [0, 1]$).
- **Sub-score Calculations**:
  - $S_{\rho} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \bar{\rho} - 0.20)}{0.60} \times 100.0, 0.0, 100.0\right)$ ($\bar{\rho} \le 0.20 \to 100$, $\bar{\rho} \ge 0.80 \to 0$).
  - $S_{\text{PCA}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \text{PCA}_{\text{share}} - 0.40)}{0.50} \times 100.0, 0.0, 100.0\right)$ ($\text{PCA}_1 \le 40\% \to 100$, $\text{PCA}_1 \ge 90\% \to 0$).
- **Composite Dimension Score**:
  \[
  S_{\text{corr}} = 0.50 S_{\rho} + 0.50 S_{\text{PCA}}
  \]

### 3.4 Dimension 4: Liquidity & Cash Runway ($S_{\text{liq}}$)
- **Inputs from C.7.5**: Emergency Runway Months ($R_{\text{months}} \ge 0$), Accessible Capital Ratio ($A_{\text{ratio}} \in [0, 1]$), C.7.5 Liquidity Stress Score ($S_{\text{C75}} \in [0, 100]$).
- **Sub-score Calculations**:
  - $S_{\text{runway}} = \begin{cases} 100.0 & \text{if } R_{\text{months}} \ge 12.0 \\ \frac{R_{\text{months}}}{12.0} \times 100.0 & \text{if } 0.0 \le R_{\text{months}} < 12.0 \\ 100.0 & \text{if } R_{\text{months}} = \text{null (surplus cash flow)} \end{cases}$
  - $S_{\text{accessible}} = \operatorname{clamp}\left(A_{\text{ratio}} \times 100.0, 0.0, 100.0\right)$.
  - $S_{\text{C75\_score}} = \operatorname{clamp}\left(S_{\text{C75}}, 0.0, 100.0\right)$.
- **Composite Dimension Score**:
  \[
  S_{\text{liq}} = 0.40 S_{\text{runway}} + 0.30 S_{\text{accessible}} + 0.30 S_{\text{C75\_score}}
  \]

### 3.5 Dimension 5: Stress & Scenario Resilience ($S_{\text{stress}}$)
- **Inputs from C.7.6**: Worst-Case Scenario Loss Percentage ($L_{\text{worst}} \in [0, 1]$), Post-Stress Runway Compression Months ($\Delta R_{\text{worst}} \ge 0$), Reverse Stress Multiplier for 20% Loss ($\lambda_{20}^*$).
- **Sub-score Calculations**:
  - $S_{\text{loss}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, L_{\text{worst}} - 0.10)}{0.35} \times 100.0, 0.0, 100.0\right)$ ($L_{\text{worst}} \le 10\% \to 100$, $L_{\text{worst}} \ge 45\% \to 0$).
  - $S_{\text{comp}} = \operatorname{clamp}\left(100.0 - \frac{\max(0, \Delta R_{\text{worst}})}{6.0} \times 100.0, 0.0, 100.0\right)$ ($\Delta R \le 0 \to 100$, $\Delta R \ge 6 \text{ mo} \to 0$).
  - $S_{\text{rev}} = \begin{cases} 100.0 & \text{if } \lambda_{20}^* \ge 2.0 \text{ or UNREACHABLE} \\ \frac{\lambda_{20}^*}{2.0} \times 100.0 & \text{if } 0.0 \le \lambda_{20}^* < 2.0 \\ 0.0 & \text{if } \lambda_{20}^* = \text{null and breached} \end{cases}$
- **Composite Dimension Score**:
  \[
  S_{\text{stress}} = 0.40 S_{\text{loss}} + 0.30 S_{\text{comp}} + 0.30 S_{\text{rev}}
  \]

---

## 4. Holistic Health Status & Grade Boundaries

The composite score $S_{\text{health}}$ is mapped into deterministic institutional health grades:

| Score Range | Health Grade | Status Category | Color / Indicator | Architectural Interpretation |
| :---: | :---: | :---: | :---: | :--- |
| **85.0 – 100.0** | **`A`** | **`EXCELLENT`** | 🟢 Emerald | Well-diversified, low drawdown vulnerability, robust liquidity buffer ($\ge 12$ mo runway), highly resilient to severe market crashes. |
| **70.0 – 84.99** | **`B`** | **`GOOD`** | 🟢 Green | Balanced allocation, moderate volatility, healthy runway buffer, manageable stress losses. Minor single-factor concentration risks. |
| **50.0 – 69.99** | **`C`** | **`FAIR`** | 🟡 Amber | Elevated concentration or moderate liquidity vulnerability. Noticeable vulnerability to macro/stagflationary shocks. |
| **30.0 – 49.99** | **`D`** | **`VULNERABLE`** | 🟠 Orange | Severe concentration (top-1 $> 50\%$), high historical drawdown, or short emergency runway ($< 3$ mo). High vulnerability to market stress. |
| **0.0 – 29.99** | **`F`** | **`CRITICAL`** | 🔴 Red | Extreme concentration ($> 75\%$ in single speculative asset), zero emergency runway, or $> 45\%$ projected stress loss under standard recession. Immediate restructuring warranted. |

**Boundary Invariant**:
- If $N = 0$ (empty portfolio) $\implies S_{\text{health}} = \text{null}$, Status: `EMPTY_PORTFOLIO`.

---

## 5. Risk Explanation & Driver Attribution Model

### 5.1 Primary Risk Drivers Ranking (Deficit Model)
To identify the top negative contributors to portfolio vulnerability, C.7.7 computes the **Weighted Score Deficit** for each dimension:

\[
\Delta S_d = (100.0 - S_d) \times W_d
\]

**Deterministic 3-Tier Tie-Breaking**:
1. $\Delta S_d \text{ DESC}$ (highest weighted deficit first).
2. $S_d \text{ ASC}$ (lowest absolute score first).
3. $\text{dimensionId ASC}$ (lexicographical fallback: `DIM_CONCENTRATION` $\to$ `DIM_CORRELATION` $\to$ `DIM_LIQUIDITY` $\to$ `DIM_STRESS` $\to$ `DIM_VOLATILITY`).

The top 3 dimensions with $\Delta S_d > 2.0$ are selected as **Primary Risk Drivers**.

### 5.2 Deterministic Explanation Template Rules
For each selected primary driver, the engine maps authoritative upstream metrics to plain-English, policy-governed explanation sentences:
- If `DIM_CONCENTRATION` is primary driver $\to$ references exact $w_1$ percentage and top asset class name from C.7.2.
- If `DIM_LIQUIDITY` is primary driver $\to$ references exact runway months and accessible ratio from C.7.5.
- If `DIM_VOLATILITY` is primary driver $\to$ references exact annualized volatility and max drawdown from C.7.3.
- If `DIM_STRESS` is primary driver $\to$ references worst-case scenario name and percentage loss from C.7.6.
- If `DIM_CORRELATION` is primary driver $\to$ references mean correlation and dominant factor share from C.7.4.

### 5.3 Key Strengths Identification
Dimensions with $S_d \ge 80.0$ are categorized as **Portfolio Strengths** (e.g., *"Robust Emergency Liquidity"*, *"Strong Cross-Asset Diversification"*).

---

## 6. Data Quality & Confidence Propagation

C.7.7 strictly aggregates and propagates data quality from certified upstream engines:

```typescript
interface PortfolioHealthQualityDTO {
  confidenceLevel: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
  coverageRatio: number;
  missingEngines: string[];
  upstreamConfidenceSummary: {
    concentrationConfidence: string;
    volatilityConfidence: string;
    correlationConfidence: string;
    liquidityConfidence: string;
    scenarioStressConfidence: string;
  };
}
```

### Propagation Rules:
1. **`HIGH`**: All 5 upstream engines (`C.7.2` through `C.7.6`) report `HIGH` confidence and coverage $\ge 95\%$.
2. **`MODERATE`**: No upstream engine reports `LOW` or `UNAVAILABLE`, but estimated burn applied in C.7.5 or coverage $\in [80\%, 95\%)$.
3. **`LOW`**: Any upstream engine reports `LOW`, or coverage $< 80\%$, or 1 upstream engine DTO missing (missing dimension imputed at conservative fallback $S_d = 40.0$).
4. **`UNAVAILABLE`**: Missing portfolio data or $\ge 2$ upstream engine DTOs missing.

---

## 7. Master DTO Specification (`C7_7_V1`)

```typescript
interface PortfolioHealthScoreDTO {
  portfolioId: string | null;
  asOfDate: string; // ISO 8601 mandatory deterministic timestamp
  policyVersion: "C7_7_V1";
  status: "EVALUATED" | "EMPTY_PORTFOLIO" | "DEGRADED" | "INSUFFICIENT_DATA";
  
  healthScore: number | null; // [0.0, 100.0]
  healthGrade: "A" | "B" | "C" | "D" | "F" | null;
  healthStatus: "EXCELLENT" | "GOOD" | "FAIR" | "VULNERABLE" | "CRITICAL" | "EMPTY_PORTFOLIO";

  dataQuality: PortfolioHealthQualityDTO;

  dimensions: {
    concentration: {
      dimensionId: "DIM_CONCENTRATION";
      score: number; // [0.0, 100.0]
      weight: 0.20;
      weightedScore: number;
      grade: string;
      keyMetrics: {
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
      weightedScore: number;
      grade: string;
      keyMetrics: {
        annualizedVolatility: number;
        maxDrawdown: number;
        cvar95: number;
      };
    };
    correlation: {
      dimensionId: "DIM_CORRELATION";
      score: number;
      weight: 0.15;
      weightedScore: number;
      grade: string;
      keyMetrics: {
        meanPairwiseCorrelation: number;
        dominantFactorShare: number;
      };
    };
    liquidity: {
      dimensionId: "DIM_LIQUIDITY";
      score: number;
      weight: 0.25;
      weightedScore: number;
      grade: string;
      keyMetrics: {
        runwayMonths: number | null;
        accessibleRatio: number;
        c75LiquidityScore: number;
      };
    };
    stressResilience: {
      dimensionId: "DIM_STRESS";
      score: number;
      weight: 0.20;
      weightedScore: number;
      grade: string;
      keyMetrics: {
        worstCaseLossPercentage: number | null;
        runwayCompressionMonths: number | null;
        reverseStressLambda20: number | null;
      };
    };
  };

  explanation: {
    summary: string;
    primaryRiskDrivers: Array<{
      dimensionId: string;
      dimensionName: string;
      score: number;
      deficit: number;
      severity: "CRITICAL" | "ELEVATED" | "MODERATE";
      explanationText: string;
    }>;
    keyStrengths: Array<{
      dimensionId: string;
      dimensionName: string;
      score: number;
      strengthText: string;
    }>;
  };

  warnings: string[];
}
```

---

## 8. Proposed Acceptance Matrix (`tests/test_c77.mjs`)

The C.7.7 acceptance suite will cover 52 test scenarios across 9 core test categories:

1. **Group 1: Dimension Weighting & Mathematical Scoring Invariants (Tests 1–6)**:
   - Weights sum to exact 1.00 ($0.20 + 0.20 + 0.15 + 0.25 + 0.20 = 1.00$).
   - Perfect portfolio ($S_d = 100.0$ across all 5 dimensions) yields exact $S_{\text{health}} = 100.0$.
   - Worst portfolio ($S_d = 0.0$ across all 5 dimensions) yields exact $S_{\text{health}} = 0.0$.
   - Linear score preservation: $S_{\text{health}} = \sum W_d \times S_d \pm 10^{-4}$.
   - Non-negativity and upper bound invariants ($0.0 \le S_{\text{health}} \le 100.0$).
   - Policy versioning verified (`C7_7_V1`).

2. **Group 2: Health Grade & Status Boundary Exactness (Tests 7–12)**:
   - Score 85.0 $\to$ Grade `A` (`EXCELLENT`).
   - Score 84.99 $\to$ Grade `B` (`GOOD`).
   - Score 70.0 $\to$ Grade `B` vs 69.99 $\to$ Grade `C` (`FAIR`).
   - Score 50.0 $\to$ Grade `C` vs 49.99 $\to$ Grade `D` (`VULNERABLE`).
   - Score 30.0 $\to$ Grade `D` vs 29.99 $\to$ Grade `F` (`CRITICAL`).
   - Score 0.0 $\to$ Grade `F` (`CRITICAL`).

3. **Group 3: Concentration Dimension Scoring (Tests 13–17)**:
   - Well-diversified multi-asset portfolio scores $\ge 90.0$.
   - Single-asset concentrated portfolio ($w_1 = 100\%$) scores $\le 15.0$.
   - Sector concentration penalty evaluated accurately.
   - Top-3 concentration scaling verified.
   - Missing sector data handled safely without crash.

4. **Group 4: Downside Risk & Volatility Dimension Scoring (Tests 18–22)**:
   - Low volatility ($\sigma = 5\%$, $\text{MDD} = 5\%$) scores $\ge 95.0$.
   - High volatility crypto portfolio ($\sigma = 60\%$, $\text{MDD} = 65\%$) scores $\le 10.0$.
   - VaR/CVaR scaling verified.
   - Degraded historical observations handled safely.
   - Zero volatility protection verified.

5. **Group 5: Correlation & Factor Risk Dimension Scoring (Tests 23–27)**:
   - Zero/low correlation ($\bar{\rho} \le 0.10$) scores $\ge 90.0$.
   - High correlation ($\bar{\rho} \ge 0.85$) scores $\le 20.0$.
   - Single dominant PCA factor ($\lambda_1 = 95\%$) penalized.
   - Balanced orthogonal factors reward diversification.
   - 2-asset minimum portfolio correlation evaluation.

6. **Group 6: Liquidity & Cash Runway Dimension Scoring (Tests 28–32)**:
   - 12+ months emergency runway scores 100.0 on runway sub-score.
   - Zero runway / severe deficit scores 0.0 on runway sub-score.
   - Surplus cash flow (self-sustaining) evaluates to 100.0.
   - Fully locked real estate portfolio penalized on accessible ratio.
   - Estimated burn penalty propagation verified.

7. **Group 7: Scenario Stress Resilience Dimension Scoring (Tests 33–37)**:
   - Low worst-case loss ($< 5\%$) scores $\ge 90.0$.
   - Severe worst-case loss ($> 45\%$) scores $\le 15.0$.
   - Post-stress runway compression penalty verified.
   - Reverse stress multiplier scaling verified.
   - Custom scenario resilience evaluated.

8. **Group 8: Risk Explanation & Primary Driver Attribution (Tests 38–44)**:
   - Deficit ranking formula exactness: $\Delta S_d = (100 - S_d) \times W_d$.
   - Deterministic 3-tier tie-breaking across equal deficits.
   - Top-3 primary risk drivers selected with actionable text.
   - Key strengths identified for dimensions $\ge 80.0$.
   - Plain-English template sentences reference exact upstream metrics.
   - Multi-driver portfolio generates comprehensive summary.
   - Single-driver extreme portfolio focuses explanation accurately.

9. **Group 9: Boundary Conditions, Quality, AST Scan & Read-Only Safety (Tests 45–52)**:
   - Empty portfolio ($N = 0$) returns `EMPTY_PORTFOLIO` with null scores.
   - Missing 1 upstream engine degrades status to `DEGRADED` with conservative imputation.
   - Upstream confidence propagation (HIGH, MODERATE, LOW, UNAVAILABLE).
   - Mandatory deterministic `asOfDate` enforced (0 internal timestamps).
   - AST wall-clock scan confirms 0 `Date.now()` and 0 argument-less `new Date()`.
   - Deep 5-store read-only safety guard (100% zero store mutations).
   - Deterministic output repeatability across consecutive runs.
   - Full master regression preservation across 495+ existing tests.

---

## 9. Implementation Guardrails

- **Zero-Code Gate**: `ACTIVE 🔒` until this architecture plan is approved.
- **Service Target**: `services/portfolioHealthScoreEngine.js`
- **Acceptance Target**: `tests/test_c77.mjs` (52 scenarios)
- **Certified Baseline**: `64c00a1` (Stage C.7.6 Master Certified)
- **Frozen Contracts**: All 15 prior certified services remain 100% locked.
