# Master Architectural Plan: Stage C.7.8 Risk Intelligence Dashboard & Stress UI

**Document Version**: `1.0.0`  
**Master Standard Identifier**: `C7_8_V1`  
**Stage**: C.7.8 (Risk Intelligence Dashboard & Stress UI)  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Certified Baseline**: [`30e4b8a`](https://github.com/Nreddy2020/finapp-mobile/commit/30e4b8a) (Stage C.7.7 Master Certified)  
**Branch**: `fintech-using-chatgpt`  
**Zero-Code Gate**: `ACTIVE 🔒` (Architecture Plan ONLY — Zero Implementation/Component/Test Code)  

---

## 1. Executive Scope & Responsibility Boundary

Stage C.7.8 defines the **Risk Intelligence Dashboard & Stress UI** for the FinLife mobile platform.

### 1.1 Core Architectural Principle: *"C.7.8 visualizes and interacts with certified intelligence; it does not calculate financial intelligence."*

C.7.8 is strictly a **pure presentation, visual interaction, and user navigation layer**. It consumes the authoritative DTOs produced by the certified backend engines (`C.7.1` through `C.7.7`), with `C.7.7` (`portfolioHealthScoreEngine.js`) and `C.7.6` (`scenarioStressEngine.js`) serving as the primary data sources:

```
┌────────────────────────────────────────────────────────┐
│           Certified Analytical Backend Engines         │
│                 (C.7.1 → C.7.6 Certified)              │
└───────────────────────────┬────────────────────────────┘
                            │ Authoritative Risk Metrics
                            ▼
┌────────────────────────────────────────────────────────┐
│     Stage C.7.7 Portfolio Health & Explanation Engine  │
│          (services/portfolioHealthScoreEngine.js)      │
└───────────────────────────┬────────────────────────────┘
                            │ Authoritative Health DTO & Explanations
                            ▼
┌────────────────────────────────────────────────────────┐
│       Stage C.7.8 Presentation & Adapter Layer         │
│   (components/investments/riskPresentationAdapter.js)  │
└───────────────────────────┬────────────────────────────┘
                            │ Formatted View Models (0 Recalculations)
                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│          Stage C.7.8 Risk Intelligence Dashboard & UI Components            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ 1. HealthScoreHeroCard (Overall Score 0-100, Grade A-F, Confidence)   │  │
│  │ 2. RiskDimensionsCard (5 Orthogonal Dimension Gauges & Drilldowns)    │  │
│  │ 3. RiskDriversStrengthsCard (Ranked Deficit Drivers vs Strengths)     │  │
│  │ 4. ScenarioStressVisualizerCard (Interactive Scenarios, Loss, Reverse)│  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Explicit Non-Responsibilities (Strict Anti-Pattern Protections)
1. **Zero Financial Recalculation**: Components MUST NOT calculate HHI, volatility, drawdown, VaR/CVaR, correlation, PCA, liquidity tiers, runway months, stress loss percentages, reverse stress multipliers, health scores, or health grades.
2. **Zero Store Mutations**: UI interactions (switching tabs, selecting scenarios, toggling drilldowns) MUST NOT mutate any underlying store (holdings, events, quotes, transactions, wallets).
3. **No Fabricated Explanations**: Text explanations MUST come directly from C.7.7 factual synthesis, never invented in UI components.
4. **Single Source of Truth**: All numbers displayed on the screen are 100% traceable to the upstream authoritative DTO.

---

## 2. Information Architecture: The 5 User Questions

The dashboard is structured around 5 essential user questions:

```
┌───────────────────────────────────────────────────────────────────────────┐
│ 1. "How healthy is my portfolio?"                                         │
│    ──► HealthScoreHeroCard                                                │
│        • Headline Health Score (e.g. 78.4 / 100)                          │
│        • Health Grade Badge (Grade B — GOOD)                              │
│        • Data Quality / Confidence Badge (HIGH / MODERATE / LOW)          │
├───────────────────────────────────────────────────────────────────────────┤
│ 2. "Why is my score this way?"                                            │
│    ──► RiskDimensionsCard                                                 │
│        • Concentration & Diversification (82/100, Weight 20%)             │
│        • Downside Risk & Volatility (61/100, Weight 20%)                  │
│        • Correlation & Factor Risk (78/100, Weight 15%)                   │
│        • Liquidity & Cash Runway (42/100, Weight 25%)                     │
│        • Scenario Stress Resilience (71/100, Weight 20%)                  │
├───────────────────────────────────────────────────────────────────────────┤
│ 3. "What is good and what is dangerous?"                                  │
│    ──► RiskDriversStrengthsCard                                           │
│        • Primary Risk Drivers (Ranked #1, #2, #3 by Weighted Deficit)     │
│        • Key Portfolio Strengths (Dimensions with Score >= 80/100)        │
├───────────────────────────────────────────────────────────────────────────┤
│ 4. "What happens if the market gets worse?"                               │
│    ──► ScenarioStressVisualizerCard                                       │
│        • Interactive Scenario Selector (2008 GFC, COVID, Stagflation, etc)│
│        • Projected Dollar Loss & Percentage Impact                        │
│        • Asset Class Loss Attribution Breakdown                           │
│        • Emergency Runway Compression (e.g. 12 mo -> 4.5 mo)              │
│        • Reverse Stress Resilience Limit (Market drop to cause 20% loss)  │
├───────────────────────────────────────────────────────────────────────────┤
│ 5. "What should I understand from this?"                                  │
│    ──► Factual Executive Summary Banner & Context Callouts                │
│        • Objective, metric-driven explanation text from C.7.7 DTO         │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. UI Component Specifications

### 3.1 `components/investments/riskPresentationAdapter.js`
A pure, deterministic presentation helper that converts raw C.7.7 / C.7.6 DTOs into structured ViewModels for React Native components:
- **Currency & Percentage Formatting**: Standardized Indian numbering (`₹1,23,456`), percentage formatting (`15.4%`), decimal precision.
- **Health Grade Badges & Colors**:
  - `A` (`EXCELLENT`): Emerald (`#10B981`, background `#ECFDF5`, border `#A7F3D0`)
  - `B` (`GOOD`): Green (`#22C55E`, background `#F0FDF4`, border `#BBF7D0`)
  - `C` (`FAIR`): Amber (`#F59E0B`, background `#FFFBEB`, border `#FDE68A`)
  - `D` (`VULNERABLE`): Orange (`#F97316`, background `#FFF7ED`, border `#FED7AA`)
  - `F` (`CRITICAL`): Red (`#EF4444`, background `#FEF2F2`, border `#FECACA`)
- **Confidence Badges**:
  - `HIGH`: Blue (`#3B82F6`)
  - `MODERATE`: Yellow/Amber (`#F59E0B`)
  - `LOW`: Orange (`#F97316`)
  - `UNAVAILABLE`: Slate/Grey (`#64748B`)
- **Zero Recalculation Guard**: Only formats numbers and maps status strings to styling tokens.

### 3.2 `components/investments/HealthScoreHeroCard.js`
- **Visual Elements**:
  - Circular/Arc Health Gauge displaying `displayHealthScore` (0–100).
  - Health Grade Badge (`A` / `B` / `C` / `D` / `F`) with Status Title (`EXCELLENT` / `GOOD` / `FAIR` / `VULNERABLE` / `CRITICAL`).
  - Confidence Level Indicator (`HIGH` / `MODERATE` / `LOW` / `UNAVAILABLE`).
  - As-Of Date subtext.
  - Degraded / Imputation Warning Banner if `imputationApplied` is true.

### 3.3 `components/investments/RiskDimensionsCard.js`
- **Visual Elements**:
  - 5 Progress Bars corresponding to the 5 orthogonal dimensions.
  - Dimension title, weight badge (e.g. `20% Weight`), score badge (e.g. `82 / 100`).
  - Expandable drilldown for each dimension revealing underlying authoritative metrics:
    - Concentration: Top-1 share %, Asset HHI, Sector HHI.
    - Volatility: Annualized Volatility %, Max Drawdown %, 95% CVaR %.
    - Correlation: Mean Correlation $\bar{\rho}$, PCA Dominant Factor Share %.
    - Liquidity: Emergency Runway Months, Accessible Capital Ratio %.
    - Stress: Worst-Case Loss %, Max Runway Compression Months, Reverse Stress $\lambda_{20}^*$.

### 3.4 `components/investments/RiskDriversStrengthsCard.js`
- **Visual Elements**:
  - **Primary Risk Drivers Section**: Ranked cards for top-3 deficit drivers with rank badges (`#1`, `#2`, `#3`), score deficit, and factual plain-English explanation text from C.7.7 DTO.
  - **Key Portfolio Strengths Section**: Cards for dimensions with score $\ge 80.0$ highlighting resilient pillars.

### 3.5 `components/investments/ScenarioStressVisualizerCard.js`
- **Visual Elements**:
  - **Scenario Picker / Tabs**: Horizontal pill selector across canonical scenarios (`HIST_2008_GFC`, `HIST_2020_COVID`, `MACRO_STAGFLATION`, `HYPO_EQUITY_CRASH_SEVERE`, etc.).
  - **Impact Summary**:
    - Pre-Stress vs Post-Stress Valuation.
    - Projected Dollar Loss ($\Delta V_p$) & Percentage Loss ($L_p$).
    - Post-Stress Accessible Liquidity & Runway Compression.
  - **Asset Class Loss Attribution Bar**: Visual breakdown of loss shares by canonical asset class.
  - **Reverse Stress Card**: Shows market drop required to trigger 20% loss ($\lambda_{20}^*$) and critical vulnerability factor.

### 3.6 `components/investments/RiskIntelligenceDashboard.js`
- **Master Screen Container**:
  - Handles loading, error, empty portfolio (`EMPTY_PORTFOLIO`), and insufficient data (`INSUFFICIENT_DATA`) states.
  - Integrates all sub-cards in a scrollable, responsive layout with pull-to-refresh.

---

## 4. State Machine & Boundary Handling

| State | Trigger Condition | Visual Presentation |
| :--- | :--- | :--- |
| **`EVALUATED`** | Valid portfolio with full diagnostic data | Full dashboard with hero score, 5 dimensions, drivers, strengths, and stress visualizer. |
| **`DEGRADED`** | 1 upstream engine missing / unprovided | Full dashboard with amber warning banner: *"Score contains conservative estimates for unprovided diagnostic modules."* |
| **`EMPTY_PORTFOLIO`** | $N = 0$ holdings | Empty state illustration: *"No investment holdings found. Add holdings to generate your Risk Intelligence report."* |
| **`INSUFFICIENT_DATA`** | $\ge 2$ upstream engines missing | Informational card: *"Insufficient diagnostic data to evaluate health score. Run comprehensive portfolio scan."* |
| **`LOADING`** | Initial calculation in progress | Shimmer skeleton cards. |
| **`ERROR`** | Invalid input or computation error | Error card with retry button and error details. |

---

## 5. Master DTO to UI Mapping Contract

```typescript
// Mapping Contract from C.7.7 DTO to Dashboard ViewModel
export interface RiskDashboardViewModel {
  header: {
    portfolioId: string | null;
    asOfDateFormatted: string;
    healthScore: number | null;
    healthGrade: string | null;
    healthStatus: string;
    statusColor: string;
    statusBgColor: string;
    confidenceLevel: string;
    confidenceColor: string;
    imputationApplied: boolean;
    warningMessage: string | null;
  };
  dimensions: Array<{
    id: string;
    name: string;
    score: number;
    scoreFormatted: string;
    weightPercent: string;
    progressRatio: number; // [0.0, 1.0]
    barColor: string;
    scoreSource: string;
    keyMetricsText: string[];
  }>;
  riskDrivers: Array<{
    rank: number;
    dimensionName: string;
    deficitPoints: string;
    scoreFormatted: string;
    explanation: string;
  }>;
  strengths: Array<{
    dimensionName: string;
    scoreFormatted: string;
    text: string;
  }>;
  scenarios: {
    activeScenarioId: string;
    availableScenarios: Array<{ id: string; name: string; category: string }>;
    activeScenarioData: {
      name: string;
      preStressValueFormatted: string;
      postStressValueFormatted: string;
      dollarLossFormatted: string;
      percentageLossFormatted: string;
      postStressRunwayText: string;
      runwayCompressionText: string;
      resilienceRating: string;
      lossAttribution: Array<{ assetClass: string; dollarLossFormatted: string; sharePercent: string }>;
    } | null;
    reverseStress: {
      lambda20Formatted: string;
      status: string;
      criticalVulnerability: string;
    };
  };
}
```

---

## 6. Proposed 48-Scenario Acceptance Matrix (`tests/test_c78.mjs`)

1. **Group 1: Presentation Adapter & Formatting Exactness (Tests 1–6)**:
   - Currency formatting standard (`₹1,23,456` Indian formatting).
   - Percentage formatting standard (`15.4%`).
   - Grade color token mapping (`A` $\to$ Emerald, `B` $\to$ Green, `C` $\to$ Amber, `D` $\to$ Orange, `F` $\to$ Red).
   - Confidence color token mapping (`HIGH` $\to$ Blue, `MODERATE` $\to$ Yellow, `LOW` $\to$ Orange, `UNAVAILABLE` $\to$ Slate).
   - Progress bar clamp ratios ($0.0 \le \text{ratio} \le 1.0$).
   - Adapter zero recalculation invariant.

2. **Group 2: Health Score Hero Card ViewModel Mapping (Tests 7–12)**:
   - Perfect score (100.0) mapping to Grade `A` ViewModel.
   - Low score (25.0) mapping to Grade `F` ViewModel.
   - 2-decimal display score preservation.
   - Confidence badge mapping.
   - Degraded / Imputation banner mapping when `imputationApplied` is true.
   - As-of date string formatting.

3. **Group 3: Risk Dimensions Breakdown ViewModel Mapping (Tests 13–18)**:
   - 5 dimensions mapped with exact weights (20%, 20%, 15%, 25%, 20%).
   - Progress ratios match exact scores ($S_d / 100.0$).
   - Drilldown key metrics formatted accurately.
   - Single-holding neutral correlation flag handling.
   - Imputed dimension source badge mapping (`scoreSource: 'CONSERVATIVE_IMPUTATION'`).
   - Missing metric dynamic reweighting transparency.

4. **Group 4: Risk Drivers & Strengths ViewModel Mapping (Tests 19–24)**:
   - Top-3 deficit drivers ranked with `#1`, `#2`, `#3` badges.
   - Deficit points formatted accurately.
   - Factual plain-English explanation text mapped directly from DTO.
   - Zero-deficit dimensions omitted from risk drivers.
   - Strengths mapped for dimensions with score $\ge 80.0$.
   - Empty strengths handled cleanly when no dimension $\ge 80.0$.

5. **Group 5: Scenario Stress Visualizer ViewModel Mapping (Tests 25–32)**:
   - Active scenario selection state mapping.
   - Projected dollar loss & percentage loss formatted.
   - Pre-stress vs post-stress valuation comparison.
   - Post-stress runway compression formatted.
   - Asset class loss attribution shares mapped.
   - Reverse stress $\lambda_{20}^*$ formatted.
   - `UNREACHABLE_WITHIN_BOUNDS` reverse stress status mapped.
   - Critical vulnerability factor badge formatted.

6. **Group 6: Dashboard State Machine & Boundary Conditions (Tests 33–40)**:
   - `EVALUATED` state rendering.
   - `DEGRADED` state with imputation banner.
   - `EMPTY_PORTFOLIO` state rendering empty illustration.
   - `INSUFFICIENT_DATA` state rendering scan prompt.
   - Null / missing cash flow handling.
   - Single asset holding portfolio.
   - 100% Cash portfolio.
   - 100% Real estate portfolio.

7. **Group 7: Determinism, AST Scan, Read-Only & Full System Regression (Tests 41–48)**:
   - Mandatory deterministic `asOfDate` enforced.
   - AST scan confirms 0 `Date.now()` and 0 argument-less `new Date()`.
   - Deep 5-store read-only safety guard (zero store mutations from UI adapter).
   - Deterministic output repeatability across consecutive renders.
   - Zero financial recalculation in adapter verified.
   - Frozen C.7.1–C.7.7 regression preserved (551+ existing tests pass 100%).

---

## 7. Implementation Guardrails

- **Zero-Code Gate**: `ACTIVE 🔒` until this architecture plan is approved.
- **Component Targets**:
  - `components/investments/riskPresentationAdapter.js`
  - `components/investments/HealthScoreHeroCard.js`
  - `components/investments/RiskDimensionsCard.js`
  - `components/investments/RiskDriversStrengthsCard.js`
  - `components/investments/ScenarioStressVisualizerCard.js`
  - `components/investments/RiskIntelligenceDashboard.js`
- **Acceptance Target**: `tests/test_c78.mjs` (48 scenarios)
- **Certified Baseline**: `30e4b8a` (Stage C.7.7 Master Certified)
- **Frozen Contracts**: All 16 prior certified services remain 100% locked.
