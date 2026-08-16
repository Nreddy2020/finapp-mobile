# Phase C.5 — Stage C.5.1 Master Architecture Plan & Specification

**Branch**: `fintech-using-chatgpt`  
**Certified Baseline Commit**: [`012d0f7`](https://github.com/Nreddy2020/finapp-mobile/commit/012d0f7)  
**Target Stage**: `Stage C.5.1 Portfolio Overview & Executive Dashboard`  
**Status**: Ready for Consolidated Architecture Gate Review 🟢

---

## 1. Domain Scope & Presentation Layer Architecture

Stage C.5.1 establishes the primary presentation layer for investment management, consuming the certified **Phase C.4 Analytics Engine** (`investingAnalyticsEngine.js`) in a **strictly read-only, non-mutating manner**.

```
                   ┌────────────────────────────────────────────────────────┐
                   │         Certified Analytics Engine (FROZEN 🔒)         │
                   │          services/investingAnalyticsEngine.js          │
                   │               (C.4.1 / C.4.2 / C.4.3 / C.4.4)          │
                   └───────────────────────────┬────────────────────────────┘
                                               │ (Pure Read-Only Consumption)
                                               ▼
             ┌────────────────────────────────────────────────────────────────┐
             │       Stage C.5.1 Portfolio Overview & Executive Dashboard      │
             ├────────────────────────────────────────────────────────────────┤
             │  1. Executive Valuation Hero Card (Market Value, Cost, P&L)    │
             │  2. Portfolio Valuation Basis Badge (MARKET / PARTIAL / COST)  │
             │  3. Dynamic Multi-Portfolio Switcher (ID-based, Race-Safe)     │
             │  4. Reactive Quote Refresh & Error Isolation Boundary          │
             │  5. Quick Navigation Action Dispatches (Buy/Sell/SIP/Statement)│
             └────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Contracts & UI Data Invariants

### A. Executive Hero Card Direct Consumption
Hero card consumes `InvestingAnalyticsEngine.getPortfolioSummary({ portfolioId })` directly:
- **Total Portfolio Value**: `totalMarketValue` (₹).
- **Total Invested Cost**: `totalCurrentCostBasis` (₹).
- **Unrealized P&L**: `unrealizedGain` (₹) & `unrealizedReturnPercent` (%).
- **Net Economic Lifetime Return**:
  $$\text{Net Economic Return} = \text{Unrealized Gain} + \text{Realized Gain} + \text{Net Dividends} - \text{Standalone Fees} - \text{Standalone Taxes}$$
  *(Directly rendered from `portfolioSummary.netEconomicReturn` and `portfolioSummary.netEconomicReturnPercent` with zero UI-side recomputation).*

### B. Valuation Basis vs Holding Quote Status
- **Portfolio-Level Valuation Basis Badge** (`portfolioSummary.valuationBasis`):
  - `MARKET_QUOTE`: Green pill ("Live Market Quotes", 100% coverage).
  - `PARTIAL_FALLBACK`: Amber pill ("Partial Market Fallback", e.g. "2 of 3 Valued").
  - `COST_BASIS_FALLBACK`: Slate pill ("Cost Basis Fallback", provider unavailable).
  - `EMPTY`: Neutral pill ("No Active Holdings").
- **Individual Holding Quote Status** (`quoteStatus`):
  - `LIVE` ($< 15$ mins), `STALE` ($\ge 15$ mins), `UNAVAILABLE`.

### C. Dynamic Portfolio Switcher Contract
- Sourced dynamically from `loadHoldings()` and `loadInvestmentEvents()` unique `portfolioId` values.
- Internal state uses canonical `portfolioId` strings (`null` for `ALL_PORTFOLIOS`).
- **Race-Condition Protection**: A monotonically increasing `requestId` ref ensures that out-of-order async responses from prior portfolio selections are discarded.

### D. Quote Refresh Timestamp & Lifecycle States
- Latest refresh timestamp sourced from `loadMarketQuotes()` cached timestamps: `Math.max(...quotes.map(q => new Date(q.timestamp).getTime()))`.
- UI Lifecycle States: `INITIAL_LOADING`, `REFRESHING` (keeps previous values visible), `READY`, `EMPTY`, `ERROR`.

---

## 3. UI Component Boundaries

| Component / File Path | Action | Role |
| :--- | :---: | :--- |
| `app/(tabs)/investments.js` | **[MODIFY]** | Upgrades main investments screen to incorporate Stage C.5.1 dashboard |
| `components/investments/PortfolioOverviewCard.js` | **[NEW]** | Executive valuation card, unrealized pill, net return |
| `components/investments/PortfolioHeader.js` | **[NEW]** | Portfolio switcher picker with dynamic discovery |
| `components/investments/ValuationStatusBadge.js` | **[NEW]** | Portfolio valuation basis visual indicator |
| `services/investingAnalyticsEngine.js` | **[FROZEN]** 🔒 | 100% Untouched (77/77 tests certified) |
| `services/storage.js` | **[FROZEN]** 🔒 | 100% Untouched |
| `services/moneyFlowEngine.js` | **[FROZEN]** 🔒 | 100% Untouched |
| `services/investingSchemas.js` | **[FROZEN]** 🔒 | 100% Untouched |

---

## 4. Complete 20-Point Acceptance & Verification Matrix (`scratch/test_c51.mjs`)

| # | Scenario | Verification Condition | Expected Result |
| :---: | :--- | :--- | :--- |
| 1 | **Executive Hero Card Valuation** | Active holdings with live quotes | Displays exact market value, cost basis, unrealized gain |
| 2 | **Net Economic Lifetime Return** | Realized sales + dividends + fees | Displays net economic lifetime return without double counts |
| 3 | **Valuation Basis Badge (MARKET_QUOTE)** | 100% live quote coverage | Renders `MARKET_QUOTE` status |
| 4 | **Valuation Basis Badge (PARTIAL_FALLBACK)** | 1 live quote, 1 unavailable quote | Renders `PARTIAL_FALLBACK` with coverage counts |
| 5 | **Valuation Basis Badge (COST_BASIS_FALLBACK)** | All quotes unavailable | Renders `COST_BASIS_FALLBACK` status |
| 6 | **Multi-Portfolio Switcher Scoping** | Toggle between Portfolio A and Portfolio B | Instant reactivity, isolated valuations, no cross-bleed |
| 7 | **Empty Portfolio Onboarding State** | Portfolio with 0 holdings | Renders clean zero-state without NaN |
| 8 | **Pull-to-Refresh Quote Sync** | Pull-to-refresh triggered | Refreshes quotes via MarketDataService and updates summary |
| 9 | **Theme & Contrast Consistency** | Dark / Light theme rendering | High contrast, accessible typography, no forbidden tropes |
| 10 | **Stale Quote Presentation** | Quote age $\ge 15$ mins | Displays stale quote while preserving C.4 valuation |
| 11 | **Refresh Failure Resilience** | Provider simulates network error | Dashboard remains fully usable with cost basis fallback |
| 12 | **Refresh Mutation Invariant** | Inspect MoneyFlow & Storage before/after refresh | Exactly 0 MoneyFlow, holding, or event mutations |
| 13 | **Portfolio Identity Isolation** | Same symbol in Portfolio 1 and Portfolio 2 | Switching P1 $\to$ P2 never displays P1 valuation |
| 14 | **Rapid Switching Race Condition** | Rapidly toggle P1 $\to$ P2 $\to$ P1 | Stale response from P2 discarded; P1 displayed |
| 15 | **Double Refresh Deduplication** | Rapid double pull-to-refresh | Concurrency guarded; deterministic final state |
| 16 | **Offline Fallback Valuation** | Device offline / no feed | Renders cost basis fallback with clear offline indicator |
| 17 | **Number Formatting Safety** | Negative P&L, extreme INR, decimals | Formats cleanly (`-₹50,000.00`, `+12.50%`) |
| 18 | **Accessibility Semantics** | Screen reader labels | Descriptive accessibility labels on badges & values |
| 19 | **Quick Action Navigation Dispatches** | Tap Buy, Sell, SIP, Statement | Dispatches correct navigation parameters |
| 20 | **Full Regression Invariant Matrix** | Run C.4.1, C.4.2, C.4.3, C.4.4 | 77/77 tests pass with 100% identical outputs |

---

**Zero-Code Gate Status: ACTIVE 🔒**
