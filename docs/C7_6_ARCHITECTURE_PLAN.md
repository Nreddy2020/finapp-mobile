# Master Architectural Plan: Stage C.7.6 Scenario & Stress-Test Engine

**Document Version**: `1.0.0`  
**Master Standard Identifier**: `C7_6_V1`  
**Stage**: C.7.6 (Scenario & Stress-Test Engine)  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Certified Baseline**: [`d0f337c`](https://github.com/Nreddy2020/finapp-mobile/commit/d0f337c) (Stage C.7.5 Master Certified)  
**Branch**: `fintech-using-chatgpt`  
**Zero-Code Gate**: `ACTIVE 🔒` (Architecture Plan ONLY — Zero Implementation/Test Code)  

---

## 1. Executive Mission & Architectural Scope

Stage C.7.6 defines the **Scenario & Stress-Test Engine** (`services/scenarioStressEngine.js`), serving as the unified stress-testing orchestration and impact attribution layer for the FinLife financial intelligence platform.

Rather than reinventing or duplicating analytical calculations, Stage C.7.6 acts as a pure, deterministic orchestration engine that applies structured multi-factor shocks to portfolio valuations, cash-flows, and market parameters, and systematically evaluates the resulting post-shock state by consuming certified engines:
1. **Concentration & Diversification** (`services/concentrationEngine.js` — C.7.2)
2. **Volatility, Drawdown & Downside Risk** (`services/volatilityDrawdownEngine.js` — C.7.3)
3. **Correlation, Covariance & PCA Factor Risk** (`services/correlationEngine.js` — C.7.4)
4. **Liquidity, Lockup & Cash-Flow Runway** (`services/liquidityEngine.js` — C.7.5)

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
│                  │  │ [C.7.2 Certified]│  │  Engine) │  │ [C.7.4 Certified] │  │ [C.7.5 Cert.]   │
└──────────────────┘  └──────────────────┘  └──────────┘  └───────────────────┘  └─────────────────┘
```

---

## 2. Core Architectural Invariants

1. **100% Read-Only Boundary**:
   - Zero state mutations across the 5 certified stores (`STORAGE_KEYS.HOLDINGS`, `EVENTS`, `QUOTES`, `TRANSACTIONS`, `WALLETS`).
   - Deep snapshots before and after evaluation must be byte-identical.
2. **100% Deterministic Execution**:
   - Mandatory deterministic `asOfDate` ISO string parameter on all entry points.
   - Zero wall-clock `Date.now()` and zero argument-less `new Date()` calls (verified by AST scan).
3. **Canonical Scenario Taxonomy & Immutable Definitions**:
   - Deterministic policy-governed historical and hypothetical scenarios.
   - No dynamic fabrication or extrapolation of historical drawdowns.
4. **Zero Double-Counting**:
   - Shocks are applied orthogonally across asset classes, holding-specific idiosyncratic shocks, and macro-economic factors.
   - Shock compositions follow linear or calibrated non-linear factor loadings without compounding redundancies.
5. **Boundedness & Valuation Invariants**:
   - Under long-only assumptions, post-stress holding valuations satisfy $0.0 \le V_{i}^{\text{stressed}} \le V_i \times (1 + \text{gainMax})$.
   - Stressed portfolio value $V_p^{\text{stressed}} = \sum_{i} V_i^{\text{stressed}} \ge 0.0$. Total dollar loss $\Delta V_p = V_p - V_p^{\text{stressed}} \le V_p$.
6. **Reverse Stress Testing Solvency**:
   - Deterministically solves for the minimum market drawdown or income loss threshold required to breach critical portfolio buffers (e.g., $V_p$ loss $> 30\%$, or runway $< 3.0$ months).

---

## 3. Scenario Taxonomy & Canonical Catalog

Stage C.7.6 defines four canonical categories of stress scenarios governed by `SCENARIO_POLICY_V1`:

```
                               SCENARIO TAXONOMY
                                       │
         ┌──────────────────┬──────────┴──────────┬──────────────────┐
         │                  │                     │                  │
         ▼                  ▼                     ▼                  ▼
┌─────────────────┐ ┌────────────────┐ ┌────────────────────┐ ┌────────────────┐
│   Historical    │ │  Hypothetical  │ │   Macro-Economic   │ │ Custom User &  │
│  Crisis Events  │ │ Market Shocks  │ │   Stagflation /    │ │ Reverse Stress │
│ (2008, 2020, ..)│ │ (Flash Crash)  │ │ Interest Rate Hike │ │ Testing Bounds │
└─────────────────┘ └────────────────┘ └────────────────────┘ └────────────────┘
```

### 3.1 Historical Crisis Scenarios
| Scenario ID | Name | Core Asset Shock Vector ($\Delta r_c$) | Macro Shock |
| :--- | :--- | :--- | :--- |
| `HIST_2008_GFC` | **2008 Global Financial Crisis** | `STOCK`: -45%, `MUTUAL_FUND`: -38%, `ETF`: -45%, `GOLD`: +15%, `CRYPTO`: -60%, `BOND`: +5%, `REAL_ESTATE`: -25%, `OTHER`: -30%, `CASH`: 0% | Income: -20% |
| `HIST_2020_COVID` | **2020 COVID-19 Flash Crash** | `STOCK`: -32%, `MUTUAL_FUND`: -28%, `ETF`: -32%, `GOLD`: -5%, `CRYPTO`: -40%, `BOND`: +2%, `REAL_ESTATE`: -10%, `OTHER`: -20%, `CASH`: 0% | Income: -30% |
| `HIST_2022_TECH_RATES` | **2022 Tech & Rate Hike Drawdown** | `STOCK`: -22%, `MUTUAL_FUND`: -18%, `ETF`: -22%, `GOLD`: -2%, `CRYPTO`: -65%, `BOND`: -12%, `REAL_ESTATE`: -8%, `OTHER`: -15%, `CASH`: 0% | Income: 0% |
| `HIST_2013_TAPER_TANTRUM`| **2013 Emerging Market Taper Tantrum** | `STOCK`: -15%, `MUTUAL_FUND`: -12%, `ETF`: -15%, `GOLD`: -20%, `CRYPTO`: -30%, `BOND`: -8%, `REAL_ESTATE`: -5%, `OTHER`: -10%, `CASH`: 0% | Income: 0% |

### 3.2 Hypothetical Stress Scenarios
| Scenario ID | Name | Description & Shock Vector |
| :--- | :--- | :--- |
| `HYPO_EQUITY_CRASH_MODERATE` | **Moderate Equity Correction** | `STOCK`: -15%, `MUTUAL_FUND`: -12%, `ETF`: -15%, `CRYPTO`: -25%, `GOLD`: +5%, `BOND`: +1% |
| `HYPO_EQUITY_CRASH_SEVERE` | **Severe Equity Crash** | `STOCK`: -35%, `MUTUAL_FUND`: -30%, `ETF`: -35%, `CRYPTO`: -50%, `GOLD`: +10%, `BOND`: +3% |
| `HYPO_CRYPTO_CAPITULATION` | **Crypto Market Collapse** | `CRYPTO`: -80%, other asset classes unaffected (0%) |
| `HYPO_REAL_ESTATE_SLUMP` | **Property Liquidity Freeze** | `REAL_ESTATE`: -30%, early exit penalties doubled |

### 3.3 Macro-Economic Stress Scenarios
| Scenario ID | Name | Macro Shocks | Asset Shock Vector |
| :--- | :--- | :--- | :--- |
| `MACRO_STAGFLATION` | **Stagflationary Shock** | Income: -15%, Monthly Burn: +15% | `STOCK`: -20%, `BOND`: -15%, `GOLD`: +25%, `REAL_ESTATE`: -5% |
| `MACRO_INTEREST_RATE_HIKE`| **Aggressive Central Bank Rate Hike**| Debt Burn: +20% | `BOND`: -10%, `STOCK`: -12%, `REAL_ESTATE`: -10%, `CASH`: +0% |
| `MACRO_PROLONGED_RECESSION`| **Prolonged Recession & Job Loss** | Income: -50%, Monthly Burn: +10% | `STOCK`: -30%, `MUTUAL_FUND`: -25%, `BOND`: +4%, `REAL_ESTATE`: -15% |

---

## 4. Mathematical Modeling & Stress Propagation Formulas

### 4.1 Asset-Class & Holding-Level Valuation Shock
Let portfolio have $N$ holdings with pre-stress market values $V_i$ and canonical asset classes $c(i) \in \mathcal{C}$.
Each scenario $S$ defines class-level shock rates $R_S(c) \in [-1.0, 1.0]$.

If holding $i$ possesses an authoritative beta coefficient $\beta_i$ relative to its asset class benchmark (from metadata or C.7.4 correlation/covariance diagonal):
\[
\Delta r_i = 
\begin{cases}
R_S(c(i)) \times \beta_i, & \text{if } \beta_i \text{ is authoritative and finite} \\
R_S(c(i)), & \text{otherwise}
\end{cases}
\]

The post-stress holding valuation is bounded strictly:
\[
V_i^{\text{stressed}} = \max\left(0.0, V_i \times (1.0 + \Delta r_i)\right)
\]
The total stressed portfolio valuation is:
\[
V_p^{\text{stressed}} = \sum_{i=1}^{N} V_i^{\text{stressed}}
\]
The dollar portfolio loss is:
\[
\Delta V_p = V_p - V_p^{\text{stressed}}
\]
The percentage portfolio loss is:
\[
L_p = \frac{\Delta V_p}{V_p}, \quad \text{for } V_p > 0
\]

### 4.2 Loss Attribution Decomposition
Loss is deterministically decomposed along two orthogonal dimensions:
1. **Asset Class Loss Attribution**:
\[
\Delta V_c = \sum_{i \in c} (V_i - V_i^{\text{stressed}}), \quad \text{Share}_c = \frac{\Delta V_c}{\Delta V_p} \quad (\text{if } \Delta V_p > 0)
\]
2. **Top Holding Loss Contributors**:
Deterministic ranking: $\Delta V_i \text{ DESC} \to V_i \text{ DESC} \to \text{symbol ASC} \to \text{holdingId ASC}$.

### 4.3 Post-Stress Liquidity & Cash-Flow Runway Compression
Applying macro cash-flow shocks $(1 - \Delta \text{Income}_S)$ and $(1 + \Delta \text{Burn}_S)$:
\[
I_S = \max(0.0, I_{\text{base}} \times (1.0 - \Delta \text{Income}_S))
\]
\[
B_S^{\text{total}} = B_{\text{base}}^{\text{total}} \times (1.0 + \Delta \text{Burn}_S)
\]
\[
B_S^{\text{survival}} = B_{\text{base}}^{\text{survival}} \times (1.0 + \Delta \text{Burn}_S)
\]

Post-stress accessible liquidity $V_{\text{accessible}}^{\text{stressed}}$ is evaluated by feeding $V_i^{\text{stressed}}$ into C.7.5 `calculateLiquidityBreakdown` with scenario-specific haircut multipliers.

The post-stress emergency runway is computed:
\[
\text{Runway}_S = 
\begin{cases}
\frac{V_{\text{accessible}}^{\text{stressed}}}{\max(B_S^{\text{survival}} - I_S, B_S^{\text{survival}})}, & \text{if deficit exists or } I_S = 0 \\
\frac{V_{\text{accessible}}^{\text{stressed}}}{B_S^{\text{survival}}}, & \text{if self-sustaining } (I_S \ge B_S^{\text{survival}})
\end{cases}
\]

### 4.4 Reverse Stress Testing (Breach Threshold Solver)
Reverse stress testing answers: *"What is the minimum uniform market drop $X^*$ that causes a portfolio loss of $L_{\text{target}}$ (e.g. 25%)?"* or *"What is the maximum income disruption duration the portfolio can survive?"*

For a target loss ratio $L^* \in (0.0, 1.0)$:
Let $w_c = \frac{\sum_{i \in c} V_i}{V_p}$ and relative scenario sensitivity vector $\mathbf{s} = (s_1, \dots, s_8)$.
\[
L_p(\lambda) = \sum_{c \in \mathcal{C}} w_c \cdot \min(1.0, \lambda \cdot s_c)
\]
Using deterministic monotonic bisection on $\lambda \in [0.0, 2.0]$, solve for $\lambda^*$ such that $|L_p(\lambda^*) - L^*| < 10^{-4}$.

---

## 5. Master DTO Specification & Contract

The primary evaluation entry point `evaluatePortfolioStressScenarios(portfolioData, asOfDate, options)` returns:

```typescript
interface ScenarioStressEvaluationDTO {
  portfolioId: string | null;
  asOfDate: string; // ISO 8601
  policyVersion: "C7_6_V1";
  status: "EVALUATED" | "EMPTY_PORTFOLIO" | "INSUFFICIENT_DATA";
  
  dataQuality: {
    confidenceLevel: "HIGH" | "MODERATE" | "LOW" | "UNAVAILABLE";
    coverageRatio: number;
    hasCashFlowData: boolean;
    hasValuationData: boolean;
    unknownHoldingCount: number;
    evaluationTimestamp: string;
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
      scenarioCategory: "HISTORICAL" | "HYPOTHETICAL" | "MACRO" | "CUSTOM";
      stressedPortfolioValue: number;
      dollarLoss: number;
      percentageLoss: number;
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
          percentageLoss: number;
          lossContributionShare: number;
        }>;
        topLossHoldings: Array<{
          holdingId: string;
          symbol: string;
          assetClass: string;
          preStressValue: number;
          postStressValue: number;
          dollarLoss: number;
          lossContributionShare: number;
        }>;
      };
      
      warnings: string[];
    };
  };

  // Reverse Stress Testing Results
  reverseStressTest: {
    marketDropToCause20PctLoss: number | null; // e.g. 0.24 (24% market drop)
    marketDropToCause35PctLoss: number | null;
    marketDropToExhaustEmergencyRunway: number | null;
    criticalVulnerabilityFactor: string | null; // e.g. "EQUITY_CONCENTRATION"
  };

  // Cross-Scenario Resilience Summary
  resilienceSummary: {
    worstCaseScenarioId: string;
    worstCaseDollarLoss: number;
    worstCasePercentageLoss: number;
    worstCaseRunwayMonths: number | null;
    averagePercentageLoss: number;
    overallStressResilienceTier: "ROBUST" | "RESILIENT" | "VULNERABLE" | "HIGHLY_VULNERABLE";
  };

  warnings: string[];
}
```

---

## 6. Acceptance Testing Strategy (50+ Scenarios)

The acceptance suite `tests/test_c76.mjs` will cover:
1. **Group 1: Canonical Historical Scenarios (GFC 2008, COVID 2020, Tech 2022, Taper Tantrum 2013)**
2. **Group 2: Hypothetical Flash Crash & Sector Shocks (Equity, Crypto, Real Estate)**
3. **Group 3: Macro Stagflation, Rate Hike & Prolonged Recession Scenarios**
4. **Group 4: Holding-Level Beta & Asset-Class Loss Attribution Integrity**
5. **Group 5: Post-Stress Liquidity & Runway Compression Coupling with C.7.5**
6. **Group 6: Reverse Stress Testing & Critical Threshold Bisection Solvers**
7. **Group 7: Boundary Cases (Empty Portfolio, Single Cash Asset, 100% Real Estate, Zero Burn)**
8. **Group 8: Data Quality, Confidence Propagation & Zero Double-Counting Invariants**
9. **Group 9: Determinism, AST Wall-Clock Scan, Deep 5-Store Read-Only Safety & Master System Regression (439+ Tests)**

---

## 7. Current Governance State

- **Stage C.7.5 Baseline**: `d0f337c` (Master Certified 🟢🔒)
- **Stage C.7.6 Zero-Code Gate**: `ACTIVE 🔒` (No implementation code until architecture approval)
- **Frozen Services Count**: 14 certified engines
