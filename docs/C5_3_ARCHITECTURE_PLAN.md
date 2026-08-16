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
                           │ READ ONLY CONTRACT
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
1. **Zero UI-Side Calculation**: The UI layer must not recalculate Newton-Raphson approximations, bisection roots, CAGR, or holding periods. It consumes `getPerformanceMetrics({ portfolioId, symbol, asOfDate })` directly.
2. **Frozen Modules**: `services/investingAnalyticsEngine.js` 🔒, `services/storage.js` 🔒, `services/moneyFlowEngine.js` 🔒, and `services/investingSchemas.js` 🔒 remain 100% frozen.
3. **Multi-Portfolio Isolation**: Performance queries must be scoped to the active `portfolioId` selected in the dashboard header (`null` represents aggregate universe).
4. **Resilient Presentation**: If quotes are unavailable or the position is empty, the UI renders safe states (`INSUFFICIENT_CASH_FLOWS` or `COST_BASIS_FALLBACK`) without NaN, layout distortion, or unhandled errors.

---

## 2. Component Design & Visual Hierarchy

### `PerformanceGrowthTimelineCard.js`
- **Hero Return Metric**:
  - Primary headline: Money-Weighted Return (`xirrPercent`%) with dynamic status color (`#10B981` for $>0$, `#EF4444` for $<0$, `#94A3B8` for $0$).
  - Subtitle: `Annualized (XIRR)` or `Absolute Period Return` depending on `performanceType`.
- **Performance Type Badge**:
  - Badge showing `CAGR (Holding > 1 Year)` or `ABSOLUTE (Holding < 1 Year)` with duration in years/days (`holdingPeriodYears` / `holdingPeriodDays`).
- **Capital & Cash Flow Breakdown Matrix**:
  - **Capital Deployed**: `cashFlowSummary.historicalOutflows`
  - **Realized Inflows**: `cashFlowSummary.historicalInflows` (sells + dividends)
  - **Current Valuation**: `cashFlowSummary.terminalMarketValue`
  - **Net Gain/Growth**: `(terminalMarketValue + historicalInflows) - historicalOutflows`
- **Integrity & Valuation Badges**:
  - Displays audit warning if `performanceIntegrity === 'INCOMPLETE'`.
  - Displays valuation status fallback if `valuationBasis !== 'MARKET_QUOTE'`.
- **Empty / Insufficient State**:
  - Safe zero-state when `xirrStatus === 'INSUFFICIENT_CASH_FLOWS'`, encouraging investment activity without crashes.

---

## 3. Automated 20-Point Acceptance Test Matrix (`tests/test_c53.mjs`)

| # | Test Scenario | Expected Outcome |
| :- | :--- | :--- |
| **1** | Single Inflow Standard Annualized Return | Returns exact 20.00% CAGR for 1-year holding period |
| **2** | Multi-Inflow Periodic Staggered Flow Display | Renders calculated XIRR across multiple inflows |
| **3** | Liquidated Position Historical Realized Return | Renders XIRR from realized cash flows with ₹0 terminal value |
| **4** | Complete Loss Boundary (-100%) | Renders exact -100.00% return safely |
| **5** | Stagnant Capital Zero Growth | Renders 0.00% return safely without NaN |
| **6** | Net Dividend Inflow Cash Flow Credit | Displays dividends in historical inflows |
| **7** | Holding Period < 1 Year Mode | Renders `ABSOLUTE` performanceType badge |
| **8** | Holding Period $\ge$ 1 Year Mode | Renders `CAGR` annualized performanceType badge |
| **9** | Capital Deployed vs Terminal Value Matrix | Breakdown items sum accurately to net capital position |
| **10** | Multi-Portfolio Isolation (Portfolios A vs B) | Portfolio A and B returns are strictly isolated |
| **11** | All-Portfolios Universe Performance Aggregation | `portfolioId: null` aggregates across all holdings |
| **12** | Empty State Safe Presentation | `INSUFFICIENT_CASH_FLOWS` renders empty state without NaN |
| **13** | Integrity Warning Banner Rendering | `INCOMPLETE` ledger renders audit warning banner |
| **14** | Partial Fallback Valuation Resilience | `PARTIAL_FALLBACK` handled smoothly with notice |
| **15** | Cost Basis Fallback Valuation Resilience | `COST_BASIS_FALLBACK` handled without exceptions |
| **16** | Zero UI-side Recalculation Invariant | Verifies UI consumes engine output verbatim |
| **17** | Zero State Mutation Invariant | Exactly 0 MoneyFlow or holding mutations created |
| **18** | Palette & Typography Theme Tokens (Supplemental) | Contrast and theme token contracts verified |
| **19** | Accessibility Semantics (Supplemental) | Screen reader labels verified |
| **20** | Full Prior System Regression (117/117) | Stages C.4.1–C.4.4, C.5.1, C.5.2 remain 100% passing |

---

## 4. Test Hardening & Gate Enforcement

- `tests/test_c53.mjs` will enforce `process.exit(1)` upon any failure or exception.
- Total test count will advance from 117 to **137/137 tests**.
