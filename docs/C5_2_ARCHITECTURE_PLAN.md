# Phase C.5 — Stage C.5.2 Master Architecture Plan & Specification

**Branch**: `fintech-using-chatgpt`  
**Certified Baseline Commit**: [`6a734f1`](https://github.com/Nreddy2020/finapp-mobile/commit/6a734f1)  
**Target Stage**: `Stage C.5.2 Asset Allocation Visualizer & Risk Concentration Gauges`  
**Status**: Ready for Consolidated Architecture Gate Review 🟢

---

## 1. Domain Scope & Presentation Architecture

Stage C.5.2 builds the **Asset Allocation Visualizer & Concentration Risk Gauges** presentation layer, consuming the certified **C.4.2 Engine** (`InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId })`) strictly read-only.

```
                   ┌────────────────────────────────────────────────────────┐
                   │         Certified Analytics Engine (FROZEN 🔒)         │
                   │          services/investingAnalyticsEngine.js          │
                   │           (getAssetAllocationSummary authority)        │
                   └───────────────────────────┬────────────────────────────┘
                                               │ (Pure Read-Only Consumption)
                                               ▼
             ┌────────────────────────────────────────────────────────────────┐
             │       Stage C.5.2 Asset Allocation & Concentration Visualizer   │
             ├────────────────────────────────────────────────────────────────┤
             │  1. Asset Class Breakdown Donut/Pill List (Weight %, Market ₹) │
             │  2. Concentration Risk Metrics (Top-1%, Top-3%, Top-5%)        │
             │  3. HHI Diversification Index Gauge (0 - 10,000)               │
             │  4. Risk Tier Classification Badge (BALANCED / MODERATE / HIGH)│
             │  5. Multi-Portfolio Reactive Isolation (pId-scoped queries)    │
             │  6. Clean Empty Portfolio State Handling (0% / EMPTY tier)     │
             └────────────────────────────────────────────────────────────────┘
```

---

## 2. Mathematical Contracts & UI Presentation Invariants

### A. Asset Allocation Direct Consumption
The allocation visualizer consumes `InvestingAnalyticsEngine.getAssetAllocationSummary({ portfolioId })` directly:
- **Asset Classes**: `assetAllocation` array of `{ assetType, holdingCount, costBasis, marketValue, costWeightPercent, marketWeightPercent, unrealizedGain, unrealizedReturnPercent }`.
- **Palette Mapping**:
  - `STOCK`: `#3B82F6` (Blue)
  - `MUTUAL_FUND` / `MF`: `#10B981` (Green)
  - `CRYPTO`: `#F59E0B` (Amber)
  - `GOLD` / `COMMODITY`: `#EAB308` (Gold)
  - `BOND` / `DEBT`: `#8B5CF6` (Purple)
  - `REAL_ESTATE`: `#EC4899` (Pink)
  - `OTHER`: `#64748B` (Slate)
- **Weight Normalization**: Sum of weights strictly equals 100.00% (or 0% for empty portfolio).

### B. Concentration Risk & HHI Gauges
- **Top Concentration Metrics**:
  - `top1Percent`: Largest single asset share (%)
  - `top3Percent`: Top 3 combined share (%)
  - `top5Percent`: Top 5 combined share (%)
- **Herfindahl-Hirschman Index (HHI)**:
  - $\text{HHI} = \sum_{i=1}^N (w_i)^2 \in [0, 10000]$
- **Risk Tier Badge**:
  - `BALANCED`: Green badge (Top1 $\le 25\%$ & Top3 $\le 50\%$, $\text{HHI} \le 2500$).
  - `MODERATE`: Amber badge (Top1 $\le 40\%$ & Top3 $\le 75\%$, $\text{HHI} \le 4000$).
  - `HIGH`: Red badge (Top1 $> 40\%$ or Top3 $> 75\%$ or $\text{HHI} > 4000$).
  - `EMPTY`: Slate badge (No active holdings).

### C. Presentation Component Boundaries

| Component / File Path | Action | Role |
| :--- | :---: | :--- |
| `components/investments/AssetAllocationCard.js` | **[NEW]** | Asset allocation container, breakdown pills, weight % |
| `components/investments/ConcentrationRiskGauge.js` | **[NEW]** | HHI visual gauge, Top-1/3/5 concentration bars, risk badge |
| `app/(tabs)/investments.js` | **[MODIFY]** | Mounts allocation card under executive dashboard |
| `services/investingAnalyticsEngine.js` | **[FROZEN]** 🔒 | 100% Untouched (77/77 tests certified) |
| `services/storage.js` | **[FROZEN]** 🔒 | 100% Untouched |
| `services/moneyFlowEngine.js` | **[FROZEN]** 🔒 | 100% Untouched |
| `services/investingSchemas.js` | **[FROZEN]** 🔒 | 100% Untouched |

---

## 3. Complete 20-Point Acceptance & Verification Matrix (`scratch/test_c52.mjs`)

| # | Scenario | Verification Condition | Expected Result |
| :---: | :--- | :--- | :--- |
| 1 | **Single Asset Class 100% Allocation** | 1 holding (e.g. STOCK) | 100% allocation weight, clean single-segment visual |
| 2 | **Multi-Asset Class Proportional Breakdown** | 3 assets (STOCK 60%, MF 30%, GOLD 10%) | Exact weights, correct colors, sums to 100.00% |
| 3 | **Cost Weight vs Market Weight Rendering** | Holdings with varying price appreciation | Displays market weights with cost basis toggle/subtext |
| 4 | **Concentration Top-1% Metric Display** | Top asset = 45% | Renders Top-1: 45.00% progress bar |
| 5 | **Concentration Top-3% Metric Display** | Top 3 assets = 85% | Renders Top-3: 85.00% progress bar |
| 6 | **Concentration Top-5% Metric Display** | Top 5 assets = 100% | Renders Top-5: 100.00% progress bar |
| 7 | **HHI Calculation & Gauge Value** | Two equal 50% holdings | HHI = 5000 rendered on 0-10,000 gauge |
| 8 | **BALANCED Risk Tier Badge** | Diversified portfolio (Top1 $\le 25\%$) | Green "BALANCED" badge |
| 9 | **MODERATE Risk Tier Badge** | Moderate concentration (Top1 = 30%, Top3 = 70%) | Amber "MODERATE" badge |
| 10 | **HIGH Risk Tier Badge** | Concentrated portfolio (Top1 = 50%) | Red "HIGH RISK" badge |
| 11 | **Empty Portfolio Safe Presentation** | Portfolio with 0 holdings | 0% weights, EMPTY risk badge, no NaN/crash |
| 12 | **Multi-Portfolio Switcher Isolation** | Switch from Portfolio A to Portfolio B | Allocation strictly reflects selected portfolioId |
| 13 | **All-Portfolios Global Aggregation** | Select `ALL_PORTFOLIOS` (`null`) | Aggregates all holdings across entire portfolio universe |
| 14 | **Partial Quote Fallback Handling** | 1 live quote, 1 fallback | Allocation renders market values with partial basis note |
| 15 | **Cost Basis Fallback Handling** | Offline / no live quotes | Evaluates allocation purely on cost basis |
| 16 | **Unknown Asset Class Fallback** | Unknown/custom asset type | Categorized cleanly as `OTHER` with slate palette |
| 17 | **Zero MoneyFlow Mutation Invariant** | Inspect MoneyFlow & Storage during render | Exactly 0 mutations created ($\Delta = 0$) |
| 18 | **Theme & Contrast Accessibility** | Light & Dark theme tokens | AAA contrast, accessible labels on all gauges |
| 19 | **Screen Reader Accessibility Semantics** | VoiceOver / TalkBack labels | Descriptive accessibility labels on allocation slices |
| 20 | **Full Prior Regression Suite** | Run C.4.1–C.4.4 (77/77) + C.5.1 (20/20) | 97/97 tests pass with 100% identical outputs |

---

**Zero-Code Gate Status: ACTIVE 🔒**
