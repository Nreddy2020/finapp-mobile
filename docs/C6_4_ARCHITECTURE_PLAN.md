# Stage C.6.4 Architecture Plan
## Rebalancing Visualizer & Order Preview UI

**Status**: SUBMITTED FOR ARCHITECTURE GATE APPROVAL  
**Certified Baseline Commit**: [`82663e5`](https://github.com/Nreddy2020/finapp-mobile/commit/82663e5)  
**Execution Branch**: `fintech-using-chatgpt`  
**Author**: Lead Architecture & Implementation Agent  

---

## 1. Executive Summary & Architectural Positioning

**Stage C.6.4** is the final presentation stage of **Phase C.6 (Intelligent Rebalancing & Decision Engine)**. It brings the mathematical calculations of **C.6.1 (Target Allocation Policy)**, **C.6.2 (Drift & Rebalancing Delta)**, and **C.6.3 (Tax-Efficient Optimizer)** into a modern, tactile, and auditable mobile user experience.

### The Pure Read-Only Presentation Flow
$$\begin{matrix}
\text{C.6.1 Policy} \\
+ \\
\text{C.6.2 Drift Engine} \\
+ \\
\text{C.6.3 Tax Optimizer}
\end{matrix} \xrightarrow{} \begin{matrix}
\text{RebalancingVisualizerCard} \\
(\text{Drift, Allocation \& Summary})
\end{matrix} \xrightarrow{\text{Inspect / Preview}} \begin{matrix}
\text{OrderPreviewModal} \\
(\text{Orders, Tax Audit \& Lots})
\end{matrix}$$

### Core Architectural Invariants
1. **100% Read-Only Decision Support**: Provides executable trade preview and tax impact analysis with **zero ledger or holding mutations** (Strict Zero-Execution Guard).
2. **Deterministic Composition**: Directly consumes certified `TaxOptimizedRebalancingService.calculateTaxOptimizedRebalancing(...)` without recalculating drift, rounding, or tax logic.
3. **Auditability**: Exposes transparent explanations for every recommended trade, rounding residual, quote freshness warning, and selected tax lot.
4. **Interactive Fresh Cash Simulator**: Allows user to adjust available cash ($C_{\text{avail}}$) to preview how fresh cash absorbs rebalancing needs without triggering asset sales.
5. **Aesthetic Excellence**: Built with curated semantic tokens, balanced whitespace, micro-badges, and zero forbidden design tropes.

---

## 2. Component Architecture & Props Contracts

### 2.1 `components/investments/RebalancingVisualizerCard.js`
Main dashboard card rendered in the Investments Screen below `AssetAllocationCard` and `PerformanceGrowthTimelineCard`.

#### Props Interface
```typescript
interface RebalancingVisualizerCardProps {
    portfolioId?: string | null;          // Portfolio scope (null = global universe)
    policy?: Object | string | null;      // TargetAllocationPolicy or ID (defaults to Active/Moderate)
    asOfDate?: string | Date;             // Mandatory evaluation date
    availableLiquidity?: number;          // Default cash pool
    onOpenOrderPreview?: () => void;      // Modal trigger callback
    onPolicyChange?: (policyId: string) => void;
}
```

#### Visual Sections:
- **Card Header**: Target Policy selector pill (e.g. `MODERATE_BALANCED (60/30/10)`), Rebalancing Status Badge (`BALANCED` 🟢, `ACTION_RECOMMENDED` 🟡, `PRICE_REFRESH_REQUIRED` ⚠️, `PARTIALLY_FEASIBLE` 🔴).
- **Drift Gauge Bar**: Maximum percentage-point drift ($\max |\Delta w_c|$) vs policy tolerance ($\pm \theta\text{ pp}$).
- **3-Way Allocation Visualizer**: Current Weight vs Target Weight vs Projected Weight post-rebalance for all 8 canonical asset classes.
- **Decision Support Metrics Bar**:
  - `Planned Buys` vs `Planned Sells`
  - `Executable Notionals` & `Rounding Residual`
  - `Estimated Tax Liability` & `Tax Drag %`
  - `Tax Savings vs Naive`
- **Interactive Fresh Cash Slider / Input**: Simulates $C_{\text{avail}}$ injection, dynamically displaying how fresh cash reduces sell needs.
- **Action Button**: `"Preview Optimized Orders"` triggering `OrderPreviewModal`.

---

### 2.2 `components/investments/OrderPreviewModal.js`
Full-screen inspectable modal presenting the complete auditable order book and tax breakdown.

#### Props Interface
```typescript
interface OrderPreviewModalProps {
    visible: boolean;
    onClose: () => void;
    rebalancingSummary: TaxOptimizedRebalancingSummary; // Certified C.6.3 DTO
    onRefreshQuotes?: () => void;
}
```

#### Visual Tabs / Sections:
1. **Trade Orders Tab (`"Recommended Orders"`)**:
   - Distinct BUY and SELL order cards.
   - For each trade:
     - Asset Class Badge (`STOCK`, `MUTUAL_FUND`, `ETF`, `GOLD`, `CRYPTO`, `BOND`).
     - Action Indicator (`BUY` 🟢 / `SELL` 🔴).
     - Execution Quantity (Rounded per 8-class precision: whole units vs 4 decimals).
     - Reference Price with Quote Status Badge (`LIVE` 🟢, `FALLBACK` ⚠️, `STALE` 🔴).
     - Executable Notional & Allocation Delta ($\Delta w_c$).
2. **Tax Optimization & Savings Tab (`"Tax Impact & Audit"`)**:
   - Metric Banner: Optimized Tax Liability vs Naive Tax Liability $\to$ **Tax Savings Badge** (e.g. `Save ₹1,875 (100% Tax Reduction)`).
   - Tax Drag Indicator: `Tax Drag: 0.00%` of sell proceeds.
   - Exemption Progress Gauge: ₹1.25L Annual LTCG Exemption (`₹7,000 consumed / ₹1,18,000 remaining`).
   - Harvested Losses Summary: Total realized loss offsets (`₹7,000 STCL harvested`).
3. **Tax Lot Breakdown Tab (`"Selected Tax Lots"`)**:
   - Collapsible inspector showing each selected tax lot:
     - `Lot ID`, `Symbol`, `Buy Date`, `Holding Days`.
     - `Tax Category` Badge (`TIER_1_LOSS` 🟢, `TIER_2_LTCG` 🔵, `TIER_3_STCG` 🟠).
     - `Sold Quantity` & `Remaining Quantity After Sale`.
     - `Cost Basis`, `Proceeds`, `Realized Gain/Loss`, `Exemption Applied`, and `Net Tax`.
     - Explicit `Selection Reason` explanation string.
4. **Feasibility & Integrity Banners**:
   - Non-tradeable asset warnings (`REAL_ESTATE` / `OTHER`).
   - Stale quote refresh requirements.
   - Partial fill inventory limitations.

---

## 3. Design System & Semantic Theme Tokens

Adheres strictly to the certified FinLife dark theme palette without forbidden cliché tropes:
```javascript
export const REBALANCING_THEME = Object.freeze({
    background: '#0a0f1d',
    cardBackground: '#131b2e',
    cardBorder: '#1e293b',
    headerBackground: '#162035',
    textPrimary: '#f8fafc',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    accentBlue: '#3b82f6',
    buyGreen: '#10b981',
    buyGreenBg: 'rgba(16, 185, 129, 0.12)',
    sellRed: '#ef4444',
    sellRedBg: 'rgba(239, 68, 68, 0.12)',
    warningAmber: '#f59e0b',
    warningAmberBg: 'rgba(245, 158, 11, 0.12)',
    ltcgBlue: '#38bdf8',
    ltcgBlueBg: 'rgba(56, 189, 248, 0.12)',
    lossHarvestPurple: '#a855f7',
    lossHarvestPurpleBg: 'rgba(168, 85, 247, 0.12)'
});
```

---

## 4. Stage C.6.4 20-Point Acceptance Test Plan (`tests/test_c64.mjs`)

The acceptance test suite covers **20 explicit UI and contract scenarios**:
1. **Component Module Integrity**: `RebalancingVisualizerCard` and `OrderPreviewModal` exports verified.
2. **Rebalancing Summary Binding**: Renders complete C.6.3 summary data cleanly.
3. **Drift Status Badge Rendering**: Correct status mapping (`BALANCED`, `ACTION_RECOMMENDED`, `PRICE_REFRESH_REQUIRED`).
4. **3-Way Allocation Bar Calculations**: Renders Current vs Target vs Projected percentages matching C.6.2 invariants.
5. **Executable vs Planned Notional Display**: Exposes planned and executable notionals with rounding residual.
6. **Tax Metrics Binding**: Displays optimized tax, naive tax, and estimated tax savings.
7. **Annual LTCG Exemption Gauge**: Displays ₹1.25L annual exemption consumed and remaining accurately.
8. **Loss Harvesting Card**: Displays harvested losses and tax benefit from losses.
9. **Order Card Rendering**: Renders discrete rounded quantities (whole units for Stocks/ETFs/Bonds, 4 decimals for MF/Crypto/Gold).
10. **Quote Staleness Badges**: Renders `LIVE` vs `REQUIRES_REFRESH` on trade order items.
11. **Tax Lot Inspector Rendering**: Renders selected lots with holding days, gain, and selection tier.
12. **Tax Category Badges**: Renders `TIER_1_LOSS`, `TIER_2_LTCG`, and `TIER_3_STCG` badges.
13. **Selection Reason String Display**: Displays plain-English explanation for each lot selection.
14. **Fresh Cash Simulation Interaction**: Reactive calculation upon simulated liquidity input.
15. **Zero Sells Required State**: Renders clean balanced view when no rebalancing is needed.
16. **Partial Fill Warning Rendering**: Renders feasibility banner when available inventory is insufficient.
17. **Non-Tradeable Asset Warning**: Renders notice for `REAL_ESTATE` and `OTHER` asset classes.
18. **Multi-Portfolio Scope Switching**: Correctly binds portfolio-specific or global summary.
19. **Read-Only Safety Guard**: Verified 0 mutations triggered by rendering or modal interactions.
20. **Full System Regression Matrix**: 100% test suite passing $\to$ **251/251 Total System Tests Passing**.

---

## 5. Gate Approval Request

This document is submitted for formal **Stage C.6.4 Architecture Gate Review**.  
Implementation is **LOCKED 🔒** until authorized.
