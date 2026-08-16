# Stage C.5.3 — Performance & XIRR Growth Timeline Master Architecture Plan

**Stage**: `Stage C.5.3`  
**Certified Baseline**: [`398b99c`](https://github.com/Nreddy2020/finapp-mobile/commit/398b99c)  
**Status**: Architecture Gate Review (Implementation Gate: 🔒 LOCKED)

---

## 1. Architectural Boundary & Principle

Stage C.5.3 implements the **Performance & XIRR Growth Timeline Visualizer**, consuming the certified Stage C.4.3 money-weighted returns engine in a strictly read-only manner.

```
┌────────────────────────────────────────────────────────┐
│     Stage C.4.3 Certified Performance Engine 🔒        │
│          InvestingAnalyticsEngine.js                   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ READ-ONLY asOfDate QUERIES
                           ▼
┌────────────────────────────────────────────────────────┐
│               Stage C.5.3 Presentation                │
│                                                        │
│  components/investments/                               │
│  └── PerformanceGrowthTimelineCard.js                  │
│                                                        │
│  app/(tabs)/investments.js (Mounting below C.5.2)      │
└────────────────────────────────────────────────────────┘
```

### Core Invariants:
1. **Option A Historical Timeline Architecture**:
   - C.4.3 analytics engine remains 100% frozen.
   - The UI orchestrates read-only snapshot queries across deterministic milestone intervals:
     `asOfDate = T_0, T_1, T_2, ... T_now` $\to$ `InvestingAnalyticsEngine.getPerformanceMetrics({ portfolioId, asOfDate: T_i })`.
   - The UI transforms returned metrics into chart coordinates, milestone points, and timeline bars without deriving or recalculating financial returns.
2. **Zero UI-Side Financial Recalculation**:
   - The UI layer strictly consumes returned `xirrPercent`, `cagrPercent`, `absoluteReturnPercent`, and `performanceType`.
   - The UI never recomputes Newton-Raphson polynomial roots, bisection bounds, or time-weighted rates.
3. **Multi-Portfolio Isolation**:
   - Timeline evaluation is strictly scoped to the active `portfolioId` selection (`null` aggregates global universe).
4. **Theme Semantic Tokens**:
   - Visual tokens consume application theme tokens (`COLORS.success`, `COLORS.error`, `COLORS.textMuted`, `COLORS.textPrimary`, `COLORS.surface`, `COLORS.warning`, `COLORS.border`) rather than hardcoded literals.

---

## 2. Growth Timeline Data Contract & Presentation Model

### A. Presentation Data Contract: `timeline[]`
Each point in the visual timeline represents a verified C.4.3 point-in-time snapshot:
```typescript
interface PerformanceTimelinePoint {
    date: string;               // ISO date string (YYYY-MM-DD)
    timestamp: number;          // Epoch milliseconds for monotonic ordering
    terminalMarketValue: number;// Terminal valuation at asOfDate
    historicalOutflows: number; // Total capital deployed up to asOfDate
    historicalInflows: number;  // Sells + net dividends up to asOfDate
    xirrPercent: number;        // Money-weighted return at asOfDate
    cagrPercent: number;        // Annualized return at asOfDate
    absoluteReturnPercent: number; // Holding period return at asOfDate
    performanceType: 'CAGR' | 'ABSOLUTE';
    valuationBasis: 'MARKET_QUOTE' | 'PARTIAL_FALLBACK' | 'COST_BASIS_FALLBACK' | 'EMPTY';
}
```

### B. Timeline Construction Rules:
- **Monotonic Sequence**: Milestone points are sorted strictly by `timestamp` ascending ($T_0 < T_1 < \dots < T_N$).
- **Deduplication**: Snapshots on identical dates or within negligible timeframes are deduplicated to ensure exactly 1 point per interval.
- **Short-Horizon Guard**: For positions held $< 30$ days or with single events, a 2-point timeline (Inception $\to$ Current As-Of) is presented safely without division by zero.

---

## 3. Visual Component Hierarchy & UX Specifications

### `PerformanceGrowthTimelineCard.js`
- **Hero Money-Weighted Return**:
  - Primary headline: `xirrPercent`% color-coded with semantic theme tokens (`COLORS.success` for $>0$, `COLORS.error` for $<0$, `COLORS.textMuted` for $0$).
  - Subtitle: `Money-Weighted Return (XIRR)` or `Absolute Holding Return` based on `performanceType`.
- **Performance Type Badge**:
  - Badge tag: `CAGR (Annualized, >1 Year)` vs `Absolute (<1 Year)` with duration display (`holdingPeriodYears` yrs / `holdingPeriodDays` days).
- **Interactive Growth Timeline Visualizer**:
  - Multi-milestone timeline track displaying historical growth milestones.
  - Interactive touchpoint selection showing point-in-time XIRR and Terminal Valuation.
- **Cash Flow Reconciliation Matrix**:
  - **Capital Deployed**: `cashFlowSummary.historicalOutflows`
  - **Realized Inflows**: `cashFlowSummary.historicalInflows` (sells + net dividends)
  - **Current Valuation**: `cashFlowSummary.terminalMarketValue`
  - **Reconciled Net Cash Delta**: `(terminalMarketValue + historicalInflows) - historicalOutflows` (Labeled strictly as *Cash Flow Reconciliation*).
- **Integrity & Valuation Fallback Badges**:
  - Warning banner surfaced when `performanceIntegrity === 'INCOMPLETE'`.
  - Subtle indicator when `valuationBasis !== 'MARKET_QUOTE'`.
- **Safe Empty State**:
  - Clean onboarding guidance rendered when `xirrStatus === 'INSUFFICIENT_CASH_FLOWS'` without NaN, layout shifts, or unhandled errors.

---

## 4. Automated 20-Point Acceptance Test Matrix (`tests/test_c53.mjs`)

| # | Test Scenario | Expected Outcome & Verification |
| :- | :--- | :--- |
| **1** | Single Inflow Standard 1-Year Return | Separately asserts `xirrPercent == 20.00%` and `cagrPercent == 20.00%` |
| **2** | Multi-Inflow Periodic Staggered Flow Display | Renders calculated XIRR across multiple inflows |
| **3** | Liquidated Position Historical Realized Return | Renders XIRR from realized cash flows with ₹0 terminal value |
| **4** | Complete Loss Boundary (-100%) | Renders exact -100.00% return safely |
| **5** | Stagnant Capital Zero Growth | Renders 0.00% return safely without NaN |
| **6** | Net Dividend Inflow Cash Flow Credit | Displays dividends in historical inflows |
| **7** | Holding Period < 1 Year Mode | Renders `ABSOLUTE` performanceType badge |
| **8** | Holding Period $\ge$ 1 Year Mode | Renders `CAGR` annualized performanceType badge |
| **9** | Cash Flow Reconciliation Matrix | Capital Deployed vs Realized Inflows vs Terminal Valuation reconciliation exact |
| **10** | Multi-Point Timeline Sequence Construction | Generates ordered milestone snapshots ($T_0 < T_1 < T_2$) |
| **11** | Timeline Timestamp Monotonicity & Deduplication | Enforces strictly increasing timestamps with zero duplicate dates |
| **12** | Multi-Portfolio Isolation (Portfolios A vs B) | Portfolio A and B timelines and metrics are strictly isolated |
| **13** | All-Portfolios Universe Performance Aggregation | `portfolioId: null` aggregates across all holdings |
| **14** | Empty State Safe Presentation | `INSUFFICIENT_CASH_FLOWS` renders empty state without NaN |
| **15** | Integrity Warning Banner Rendering | `INCOMPLETE` ledger renders audit warning banner |
| **16** | Partial Fallback Valuation Resilience | `PARTIAL_FALLBACK` handled smoothly with notice |
| **17** | Cost Basis Fallback Valuation Resilience | `COST_BASIS_FALLBACK` handled without exceptions |
| **18** | Zero UI-side Recalculation Invariant | Verifies UI consumes engine output verbatim |
| **19** | Zero State Mutation Invariant | Exactly 0 MoneyFlow, holding, or event mutations created |
| **20** | Full Prior System Regression (117/117) | Stages C.4.1–C.4.4, C.5.1, C.5.2 remain 100% passing |

---

## 5. Test Hardening & Gate Enforcement

- `tests/test_c53.mjs` will enforce `process.exit(1)` upon any failure or exception.
- Total committed regression tests will advance from 117 to **137/137 tests**.
