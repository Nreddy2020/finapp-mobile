# Stage C.6.2 Architecture Plan
## Drift & Rebalancing Delta Calculator

**Status**: HARDENED / APPROVED FOR IMPLEMENTATION  
**Certified Baseline Commit**: [`4fff7d6`](https://github.com/Nreddy2020/finapp-mobile/commit/4fff7d6)  
**Execution Branch**: `fintech-using-chatgpt`  
**Author**: Lead Architecture & Implementation Agent  

---

## 1. Executive Summary & Stage Objective

**Stage C.6.2** implements the core mathematical calculator for portfolio drift analysis and rebalancing trade recommendations:
- Consumes certified **Stage C.6.1** `TargetAllocationService` policies.
- Consumes certified **Phase C.4** analytical summaries (`getPortfolioSummary`, `getAssetAllocationSummary`) strictly read-only.
- Calculates exact **percentage-point drift** with strict tolerance boundary enforcement ($\pm \theta\text{ pp}$).
- Implements closed-form **fresh-cash denominator scaling** ($V_{\text{post}} = V + C_{\text{deployed}}$).
- Implements deterministic **intra-asset holding selection** (proportional buy allocation, symbol ASC tie-breakers).
- Implements complete **8-class quantity rounding** (`FLOOR_WHOLE` for Stocks, ETFs, Bonds; `DECIMAL_4` for Mutual Funds, Crypto, Gold).
- Explicitly reconciles **planned vs executable notionals and rounding residuals**.
- Handles **zero-target asset classes** (100% overweight divestment).
- Scopes **quote staleness to affected tradeable holdings** rather than globally blocking unrelated trades.
- Computes **realistic projected allocations** and **residual drift**.
- Preserves the strict **C.6.2 vs C.6.3 boundary** (tax-lot optimization deferred to C.6.3).
- Produces strictly **read-only** recommendation DTOs (Zero state/ledger mutations).

---

## 2. Mathematical Contracts & Formulation

### 2.1 Current Valuation & Percentage-Point Drift
Given portfolio $P$ evaluated at deterministic `asOfDate`:
$$V_{\text{portfolio}} = \sum_{j \in \text{Holdings}} \text{HoldingMarketValue}_j$$
$$w_{\text{current}}(c) = \begin{cases} \frac{V_{\text{class}}(c)}{V_{\text{portfolio}}} \times 100\%, & V_{\text{portfolio}} > 0 \\ 0\%, & V_{\text{portfolio}} = 0 \end{cases}$$
$$\text{Drift}_{\text{pp}}(c) = w_{\text{current}}(c) - w_{\text{target}}(c)$$

**Boundary Invariants** for tolerance threshold $\theta = \text{policy.driftTolerancePercent}$ (default $5.00\text{ pp}$):
$$\text{Drift Action Tag}(c) = \begin{cases}
\text{OVERWEIGHT}, & \text{Drift}_{\text{pp}}(c) > +\theta \\
\text{UNDERWEIGHT}, & \text{Drift}_{\text{pp}}(c) < -\theta \\
\text{BALANCED}, & -\theta \le \text{Drift}_{\text{pp}}(c) \le +\theta
\end{cases}$$
- Exactly $+\theta \implies \text{BALANCED}$
- Exactly $-\theta \implies \text{BALANCED}$
- $+\theta + 0.01\% \implies \text{OVERWEIGHT}$
- $-\theta - 0.01\% \implies \text{UNDERWEIGHT}$

### 2.2 Zero-Target Asset Classes (Hardening C6.2-03)
If $w_{\text{target}}(c) = 0.00\%$ and $w_{\text{current}}(c) > 0.00\%$:
- $\text{Drift}_{\text{pp}}(c) = w_{\text{current}}(c) - 0.00\% = w_{\text{current}}(c) > 0$.
- Classified as `OVERWEIGHT` with target notional $\Delta V_{\text{post}}(c) = -V_{\text{class}}(c)$ (100% divestment).
- If tradeable $\implies \text{action: 'SELL'}$.
- If non-tradeable (e.g. `REAL_ESTATE`) $\implies \text{action: 'HOLD_NON_TRADEABLE'}$, flags `rebalancingStatus = 'PARTIALLY_FEASIBLE'` or `'INFEASIBLE'`.

---

### 2.3 Fresh-Cash Denominator & Scaled Target Values (Blocker C6-14)
When external cash $C_{\text{avail}} \ge 0$ is supplied:
$$V_{\text{post}} = V_{\text{portfolio}} + C_{\text{deployed}}$$
$$\text{TargetValue}_{\text{post}}(c) = (V_{\text{portfolio}} + C_{\text{deployed}}) \times \left( \frac{w_{\text{target}}(c)}{100} \right)$$
$$\Delta V_{\text{post}}(c) = \text{TargetValue}_{\text{post}}(c) - V_{\text{class}}(c)$$

#### Pure Cash Rebalance Threshold:
$$C_{\text{pure\_cash\_min}} = \max_{c: w_{\text{target}}(c) > 0} \left( \frac{V_{\text{class}}(c)}{w_{\text{target}}(c)/100} \right) - V_{\text{portfolio}}$$
- If $C_{\text{avail}} \ge C_{\text{pure\_cash\_min}}$:
  $$C_{\text{deployed}} = C_{\text{pure\_cash\_min}}, \quad \Delta V_{\text{post}}(c) \ge 0 \quad \forall c \implies \text{Zero Sells Required}$$
- If $0 < C_{\text{avail}} < C_{\text{pure\_cash\_min}}$:
  $$C_{\text{deployed}} = C_{\text{avail}}, \quad V_{\text{post}} = V_{\text{portfolio}} + C_{\text{avail}}$$
  $$\text{PlannedBuys} = \sum_{\Delta V > 0} \Delta V_{\text{post}}(c), \quad \text{PlannedSells} = \sum_{\Delta V < 0} |\Delta V_{\text{post}}(c)|$$
  $$\text{PlannedBuys} = C_{\text{avail}} + \text{PlannedSells}$$
- If $C_{\text{avail}} = 0$:
  $$V_{\text{post}} = V_{\text{portfolio}}, \quad \sum \text{PlannedBuys} = \sum \text{PlannedSells}$$

---

### 2.4 Intra-Asset-Class Holding Selection (Blocker C6-10 & Hardening C6.2-04)

For an asset class with required notional delta $\Delta V_{\text{post}}(c)$:

1. **Underweight ($\Delta V_{\text{post}}(c) > 0 \implies \text{BUY}$)**:
   - **Case A (Existing Holdings)**: Allocate notional across `TRADEABLE` holdings with `LIVE` quotes in proportion to their current market value:
     $$\Delta V_h = \Delta V_{\text{post}}(c) \times \left( \frac{\text{HoldingMarketValue}_h}{V_{\text{class}}(c)} \right)$$
     Deterministic tie-breaker for equal weights: `symbol` ascending (A $\to$ Z).
   - **Case B (Zero Existing Holdings in Class)**: Produce a class-level aggregate recommendation (`symbol: null`, `action: 'BUY'`, `reason: 'NEW_ASSET_CLASS_DEPLOYMENT'`).
2. **Overweight ($\Delta V_{\text{post}}(c) < 0 \implies \text{SELL}$)**:
   - In Stage C.6.2, allocate sell notional across holdings in the overweight class in proportion to current market values (or FIFO buy order). Tie-breaker: `symbol` ascending (A $\to$ Z).
   - *Boundary Note (C6.2-04)*: C.6.2 does not perform tax-lot optimization; full STCG/LTCG minimization is composed in Stage C.6.3.

---

### 2.5 Complete 8-Class Quantity Rounding Taxonomy (Blockers C6-03 & C6-15)

For holding $h$ with quoted market reference price $P_h > 0$:
$$\text{RawQty}_h = \frac{|\Delta V_h|}{P_h}$$

| Asset Class | Tradeability | Rounding Mode | Minimum Unit | Rounding Formulation |
| :--- | :--- | :--- | :---: | :--- |
| `STOCK` | `TRADEABLE` (if quote `LIVE`) | `FLOOR_WHOLE` | 1 share | $\lfloor \text{RawQty} \rfloor$ |
| `ETF` | `TRADEABLE` (if quote `LIVE`) | `FLOOR_WHOLE` | 1 unit | $\lfloor \text{RawQty} \rfloor$ |
| `BOND` | `TRADEABLE` (if quote `LIVE`) | `FLOOR_WHOLE` | 1 face-value unit | $\lfloor \text{RawQty} \rfloor$ (Unit price = quoted market price $P_h$) |
| `MUTUAL_FUND` | `TRADEABLE` (if quote `LIVE`) | `DECIMAL_4` | 0.0001 units | $\text{round}(\text{RawQty}, 4)$ |
| `CRYPTO` | `TRADEABLE` (if quote `LIVE`) | `DECIMAL_4` | 0.0001 tokens | $\text{round}(\text{RawQty}, 4)$ |
| `GOLD` | `TRADEABLE` (if quote `LIVE`) | `DECIMAL_4` | 0.0001 grams | $\text{round}(\text{RawQty}, 4)$ |
| `REAL_ESTATE` | `NON_TRADEABLE` | `NONE` | N/A | $0$ trade quantity (`HOLD_NON_TRADEABLE`) |
| `OTHER` | `NON_TRADEABLE` | `NONE` | N/A | $0$ trade quantity (`HOLD_NON_TRADEABLE`) |

---

### 2.6 Post-Rounding Reconciliation & Residual Drift (Hardening C6.2-01)

Post-rounding executable notionals:
$$\text{ExecutableDelta}_h = \begin{cases} 
+\text{RoundedQty}_h \times P_h, & \text{action} = \text{BUY} \land \text{isExecutable} \\
-\text{RoundedQty}_h \times P_h, & \text{action} = \text{SELL} \land \text{isExecutable} \\
0, & \text{otherwise}
\end{cases}$$

$$\text{executableBuyNotional} = \sum_{\text{buys } h} (\text{RoundedQty}_h \times P_h)$$
$$\text{executableSellNotional} = \sum_{\text{sells } h} (\text{RoundedQty}_h \times P_h)$$
$$\text{roundingResidual} = |\text{plannedBuyNotional} - \text{executableBuyNotional}| + |\text{plannedSellNotional} - \text{executableSellNotional}|$$

**Realistic Projected Allocation**:
$$\text{ProjectedValue}(c) = V_{\text{class}}(c) + \sum_{h \in c} \text{ExecutableDelta}_h$$
$$V_{\text{projected\_total}} = \sum_{c=1}^8 \text{ProjectedValue}(c)$$
$$\text{ProjectedWeightPercent}(c) = \begin{cases} \frac{\text{ProjectedValue}(c)}{V_{\text{projected\_total}}} \times 100\%, & V_{\text{projected\_total}} > 0 \\ 0\%, & V_{\text{projected\_total}} = 0 \end{cases}$$
$$\text{ResidualDrift}_{\text{pp}}(c) = \text{ProjectedWeightPercent}(c) - w_{\text{target}}(c)$$
$$\text{residualDriftPercentagePoints} = \max_{c} |\text{ResidualDrift}_{\text{pp}}(c)|$$

---

### 2.7 Scoped Quote Execution Eligibility & Feasibility (Blockers C6-12, C6-13 & Hardening C6.2-02)

- **Quote Execution Eligibility (Scoped)**:
  - If a holding required for a BUY/SELL order has `FALLBACK`, `STALE`, or `UNAVAILABLE` quote $\implies$ `isExecutable: false`, `action: 'REQUIRES_PRICE_REFRESH'`, and sets `rebalancingStatus = 'PRICE_REFRESH_REQUIRED'`.
  - If a holding has a stale quote but is in a `BALANCED` in-band class with no required trade $\implies$ does NOT block executable trades for other asset classes.
- **Rebalancing Feasibility Status**:
  - `BALANCED`: All asset class drifts within $\pm \theta\text{ pp}$.
  - `ACTION_RECOMMENDED`: Executable orders generated for all drifts.
  - `PARTIALLY_FEASIBLE`: Drift exists in non-tradeable assets (e.g. `REAL_ESTATE`); orders generated only for tradeable portion.
  - `INFEASIBLE`: 100% of drift is in non-tradeable assets.
  - `PRICE_REFRESH_REQUIRED`: Required trading holdings have stale or fallback quotes.
- **Feasibility Warnings**:
  - Emits explicit warning strings (e.g. `"REAL_ESTATE overweight cannot be reduced because asset is non-tradeable."`).

---

## 3. Module Interface (`services/rebalancingEngine.js`)

```typescript
interface RebalancingSummary {
    policyId: string;
    asOfDate: string;              // ISO-8601 deterministic timestamp
    portfolioId: string | null;
    investmentPortfolioValue: number;
    availableLiquidity: number;    // External cash supplied
    deployedLiquidity: number;     // Cash used for fresh-cash buys
    postRebalancePortfolioValue: number; // investmentPortfolioValue + deployedLiquidity
    plannedBuyNotional: number;    // Continuous target buy delta
    plannedSellNotional: number;   // Continuous target sell delta
    executableBuyNotional: number; // Discrete rounded buy notional
    executableSellNotional: number;// Discrete rounded sell notional
    roundingResidual: number;      // Planned vs executable rounding discrepancy
    currentAllocation: Array<{ assetType: string; marketValue: number; weightPercent: number }>;
    targetAllocation: Array<{ assetType: string; targetWeightPercent: number }>;
    recommendations: RebalancingRecommendation[];
    projectedAllocation: Array<{ assetType: string; projectedValue: number; projectedWeightPercent: number }>;
    residualDriftPercentagePoints: number; // Maximum residual drift post-rounding
    rebalancingStatus: 'BALANCED' | 'ACTION_RECOMMENDED' | 'PARTIALLY_FEASIBLE' | 'INFEASIBLE' | 'PRICE_REFRESH_REQUIRED';
    feasibilityWarnings: string[];
    isConsistent: boolean;
    integrityWarnings: string[];
}

export const RebalancingEngine = {
    async calculateRebalancing(options): Promise<RebalancingSummary>;
};
```

---

## 4. Stage C.6.2 20-Point Acceptance Test Plan (`tests/test_c62.mjs`)

1. **Balanced Portfolio In-Band**: All drifts $\le \theta \implies \text{status: BALANCED}$, 0 trade recommendations.
2. **Single Overweight Asset**: Detects overweight Stock ($> +5\text{ pp}$), generates SELL recommendation.
3. **Single Underweight Asset**: Detects underweight MF ($< -5\text{ pp}$), generates BUY recommendation.
4. **Multiple Simultaneous Drifts**: Correctly balances 3 simultaneous asset drifts.
5. **Exact Boundary $+5.00\text{ pp}$**: Evaluates to `BALANCED` (in-band).
6. **Exact Boundary $-5.00\text{ pp}$**: Evaluates to `BALANCED` (in-band).
7. **Strict Trigger $+5.01\text{ pp}$**: Triggers `OVERWEIGHT` / SELL recommendation.
8. **Strict Trigger $-5.01\text{ pp}$**: Triggers `UNDERWEIGHT` / BUY recommendation.
9. **Zero-Target Asset Class (C6.2-03)**: Target $0\%$, current $>0\%$ triggers `OVERWEIGHT` (100% divestment).
10. **Stock / ETF Whole Share Floor Rounding**: $\lfloor 10.85 \rfloor = 10$ shares.
11. **Mutual Fund / Crypto / Gold 4-Decimal Rounding**: $12.34567 \to 12.3457$ units.
12. **BOND Whole-Unit Floor Rounding (C6-15)**: Whole unit increments with quoted unit market price.
13. **Post-Rounding Notional Reconciliation (C6.2-01)**: Validates `plannedBuyNotional`, `executableBuyNotional`, `roundingResidual`, and `residualDriftPercentagePoints`.
14. **Pure Cash Rebalance Denominator Scaling (C6-14)**: $V_{\text{post}} = V + C_{\text{pure\_cash\_min}}$, achieves exact target weights with 0 sells.
15. **Partial Cash Rebalance Denominator Scaling (C6-14)**: $V_{\text{post}} = V + C_{\text{avail}}$, reconciles $\text{PlannedBuys} = C_{\text{avail}} + \text{PlannedSells}$.
16. **Zero Cash Deployment**: Reconciles $\sum \text{PlannedBuys} = \sum \text{PlannedSells}$.
17. **Intra-Asset Proportional Buy Allocation (C6-10)**: Proportional buy allocation across existing holdings with `symbol` ASC tie-breaker.
18. **New Asset Class Deployment**: Generates class-level aggregate recommendation (`symbol: null`, `action: BUY`).
19. **Non-Tradeable Asset Safety (C6-12)**: `REAL_ESTATE` produces `HOLD_NON_TRADEABLE` and `PARTIALLY_FEASIBLE`/`INFEASIBLE` status with feasibility warning.
20. **Scoped Quote Staleness & Zero State Mutation (C6.2-02 & Invariants)**: Required trade holding with stale quote sets `PRICE_REFRESH_REQUIRED`; zero storage/MoneyFlow mutations $\to$ **197/197 Total Tests Passing**.

---

## 5. Gate Approval Confirmation

All 4 hardening items (`C6.2-01` through `C6.2-04`) are mathematically formulated and locked in this plan.  
We respectfully request the **Stage C.6.2 Implementation Authorization**.
