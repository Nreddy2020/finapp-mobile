# Stage C.6.4 Architecture Plan
## Rebalancing Visualizer & Order Preview UI

**Status**: HARDENED & RECONCILED / PENDING FINAL GATE APPROVAL  
**Certified Baseline Commit**: [`82663e5`](https://github.com/Nreddy2020/finapp-mobile/commit/82663e5)  
**Execution Branch**: `fintech-using-chatgpt`  
**Author**: Lead Architecture & Implementation Agent  

---

## 1. Executive Summary & Architectural Positioning

**Stage C.6.4** is the final presentation stage of **Phase C.6 (Intelligent Rebalancing & Decision Engine)**. It brings the mathematical calculations of **C.6.1 (Target Allocation Policy)**, **C.6.2 (Drift & Rebalancing Delta)**, and **C.6.3 (Tax-Efficient Optimizer)** into a modern, tactile, and auditable mobile user experience.

### The Pure Read-Only Presentation Pipeline
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
1. **100% Read-Only Decision Support**: Provides executable trade preview and tax impact analysis with **zero ledger, storage, or wallet mutations** (Strict Zero-Execution Guard).
2. **Zero UI Financial Calculations (Blocker C6.4-02)**: The UI performs **only presentation transformations** (`formatCurrency()`, `formatPercent()`, `mapStatusToBadge()`, `truncateText()`). It is strictly prohibited from computing drift, target values, buy/sell notionals, taxes, exemptions, or post-cash allocations in component code.
3. **Service-Driven Fresh Cash Simulation (Blocker C6.4-02)**: Every cash slider or input change delegates directly to `TaxOptimizedRebalancingService.calculateTaxOptimizedRebalancing(...)` and renders the returned immutable DTO.
4. **Latest-Request-Wins Concurrency Guard**: Interactive simulation uses an incrementing sequence ID to prevent out-of-order asynchronous responses from overwriting newer simulation states.
5. **Zero Simulated State Persistence**: Simulation is 100% ephemeral. It never calls `saveHoldings()`, `saveInvestmentEvents()`, `saveMarketQuotes()`, or `MoneyFlowEngine`.
6. **Strict Semantic Theme-Token Compliance (Blocker C6.4-01)**: Strictly consumes `constants/theme.js` (`COLORS.*`). Direct hex literals, raw `rgb()`, `rgba()`, or local color palettes are strictly prohibited.

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
- **Interactive Fresh Cash Simulator**: Sliders/inputs to dynamically simulate how injected cash ($C_{\text{avail}}$) satisfies buy deltas without triggering asset sales. Driven strictly via `TaxOptimizedRebalancingService`.
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

## 3. Strict Semantic Theme Token Usage (Blocker C6.4-01)

All UI elements must exclusively reference semantic tokens from `constants/theme.js` (`COLORS.*`):

| UI Role | Authoritative Semantic Token | Usage |
| :--- | :--- | :--- |
| Backgrounds | `COLORS.background`, `COLORS.cardBackground`, `COLORS.headerBackground` | Screen & card containers |
| Borders | `COLORS.cardBorder`, `COLORS.border` | Card & separator lines |
| Text | `COLORS.textPrimary`, `COLORS.textSecondary`, `COLORS.textMuted` | Hierarchical typography |
| Primary Accent | `COLORS.accentBlue` | Buttons, active policy pills |
| Positive / Buy | `COLORS.buyGreen`, `COLORS.buyGreenBg` | Buy badges, zero-tax badges |
| Negative / Sell | `COLORS.sellRed`, `COLORS.sellRedBg` | Sell badges, short-term gain warnings |
| Warning / Drift | `COLORS.warningAmber`, `COLORS.warningAmberBg` | Drift warnings, fallback quotes |
| LTCG Category | `COLORS.ltcgBlue`, `COLORS.ltcgBlueBg` | Tier 2 LTCG lot badges |
| Loss Harvesting | `COLORS.lossHarvestPurple`, `COLORS.lossHarvestPurpleBg` | Tier 1 Loss lot badges |

*Direct hex color literals, `rgb()`, `rgba()`, and custom component color objects are strictly forbidden.*

---

## 4. Stage C.6.4 23-Point Acceptance Test Plan (`tests/test_c64.mjs`)

The acceptance test suite covers **23 explicit UI and contract scenarios**:
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
20. **Full System Regression Matrix**: 100% test suite passing.
21. **Semantic Token Compliance (Blocker C6.4-01)**: Static audit verifying 0 hex/rgba literals in C.6.4 components.
22. **Service-Driven Fresh Cash Simulation (Blocker C6.4-02)**: Verifies fresh-cash simulation delegates strictly to `TaxOptimizedRebalancingService`.
23. **Latest-Request-Wins Concurrency Guard**: Verifies that stale asynchronous simulation responses cannot overwrite the latest simulation state.

---

## 5. Gate Approval Request

All blockers (`C6.4-01` and `C6.4-02`) and concurrency controls are locked in this plan.  
We respectfully request the **Stage C.6.4 Architecture Gate Approval & Implementation Authorization**.
