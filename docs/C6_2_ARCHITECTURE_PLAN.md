# Stage C.6.2 Architecture Plan
## Drift & Rebalancing Delta Calculator

**Status**: SUBMITTED FOR ARCHITECTURE GATE APPROVAL  
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
- Enforces **tradability and quote status safety** (`LIVE` executable vs `FALLBACK`/`STALE` non-executable).
- Computes **realistic projected allocations** and **residual drift**.
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

---

### 2.2 Fresh-Cash Denominator & Scaled Target Values (Blocker C6-14)
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
  $$\text{Buys} = \sum_{\Delta V > 0} \Delta V_{\text{post}}(c), \quad \text{Sells} = \sum_{\Delta V < 0} |\Delta V_{\text{post}}(c)|$$
  $$\text{Buys} = C_{\text{avail}} + \text{Sells}$$
- If $C_{\text{avail}} = 0$:
  $$V_{\text{post}} = V_{\text{portfolio}}, \quad \sum \text{Buys} = \sum \text{Sells}$$

---

### 2.3 Intra-Asset-Class Holding Selection (Blocker C6-10)

For an asset class with required notional delta $\Delta V_{\text{post}}(c)$:

1. **Underweight ($\Delta V_{\text{post}}(c) > 0 \implies \text{BUY}$)**:
   - **Case A (Existing Holdings)**: Allocate notional across `TRADEABLE` holdings with `LIVE` quotes in proportion to their current market value:
     $$\Delta V_h = \Delta V_{\text{post}}(c) \times \left( \frac{\text{HoldingMarketValue}_h}{V_{\text{class}}(c)} \right)$$
     Deterministic tie-breaker for equal weights: `symbol` ascending (A $\to$ Z).
   - **Case B (Zero Existing Holdings in Class)**: Produce a class-level aggregate recommendation (`symbol: null`, `action: 'BUY'`, `reason: 'NEW_ASSET_CLASS_DEPLOYMENT'`).
2. **Overweight ($\Delta V_{\text{post}}(c) < 0 \implies \text{SELL}$)**:
   - Allocate sell notional across holdings in the overweight class in proportion to current market values (Tax-lot optimization is composed in C.6.3). Tie-breaker: `symbol` ascending (A $\to$ Z).

---

### 2.4 Complete 8-Class Quantity Rounding Taxonomy (Blockers C6-03 & C6-15)

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

### 2.5 Quote Execution Eligibility & Feasibility (Blockers C6-12 & C6-13)

- **Quote Execution Eligibility**:
  - `LIVE` quote $\implies$ `isExecutable: true`.
  - `FALLBACK` quote (cost basis fallback) $\implies$ `isExecutable: false`, `tradeability: 'FALLBACK_VALUATION_ONLY'`, `action: 'REQUIRES_PRICE_REFRESH'`.
  - `STALE` / `UNAVAILABLE` quote $\implies$ `isExecutable: false`, `action: 'REQUIRES_PRICE_REFRESH'`.
- **Rebalancing Feasibility Status**:
  - `BALANCED`: All asset class drifts within $\pm \theta\text{ pp}$.
  - `ACTION_RECOMMENDED`: Executable orders generated for all drifts.
  - `PARTIALLY_FEASIBLE`: Drift exists in non-tradeable assets (e.g. `REAL_ESTATE`); orders only generated for tradeable portion.
  - `INFEASIBLE`: 100% of drift is in non-tradeable assets.
  - `PRICE_REFRESH_REQUIRED`: One or more holdings have fallback, stale, or unavailable quotes.
- **Feasibility Warnings**:
  - Emits explicit warning strings (e.g. `"REAL_ESTATE overweight cannot be reduced because asset is non-tradeable."`).

---

### 2.6 Achievable Projected Allocation & Residual Drift

$$\text{ExecutableDelta}_h = \begin{cases} 
+\text{RoundedQty}_h \times P_h, & \text{action} = \text{BUY} \land \text{isExecutable} \\
-\text{RoundedQty}_h \times P_h, & \text{action} = \text{SELL} \land \text{isExecutable} \\
0, & \text{otherwise}
\end{cases}$$

$$\text{ProjectedValue}(c) = V_{\text{class}}(c) + \sum_{h \in c} \text{ExecutableDelta}_h$$
$$V_{\text{projected\_total}} = \sum_{c=1}^8 \text{ProjectedValue}(c)$$
$$\text{ProjectedWeightPercent}(c) = \begin{cases} \frac{\text{ProjectedValue}(c)}{V_{\text{projected\_total}}} \times 100\%, & V_{\text{projected\_total}} > 0 \\ 0\%, & V_{\text{projected\_total}} = 0 \end{cases}$$
$$\text{ResidualDrift}_{\text{pp}}(c) = \text{ProjectedWeightPercent}(c) - w_{\text{target}}(c)$$

---

## 3. Module Interface (`services/rebalancingEngine.js`)

```typescript
export const RebalancingEngine = {
    /**
     * Calculate comprehensive portfolio drift and rebalancing recommendations.
     * Pure, read-only decision support function.
     * 
     * @param {Object} options
     * @param {string|null} options.portfolioId
     * @param {Object|string} [options.policy] - TargetAllocationPolicy object or policyId
     * @param {string|Date} [options.asOfDate] - ISO-8601 deterministic timestamp
     * @param {number} [options.availableLiquidity=0] - External deployable cash
     * @returns {Promise<RebalancingSummary>}
     */
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
9. **Stock / ETF Whole Share Floor Rounding**: $\lfloor 10.85 \rfloor = 10$ shares.
10. **Mutual Fund / Crypto / Gold 4-Decimal Rounding**: $12.34567 \to 12.3457$ units.
11. **BOND Whole-Unit Floor Rounding (Blocker C6-15)**: Whole unit increments with quoted unit market price.
12. **Pure Cash Rebalance Denominator Scaling (Blocker C6-14)**: $V_{\text{post}} = V + C_{\text{pure\_cash\_min}}$, achieves exact target weights with 0 sells.
13. **Partial Cash Rebalance Denominator Scaling (Blocker C6-14)**: $V_{\text{post}} = V + C_{\text{avail}}$, reconciles $\sum \text{Buys} = C_{\text{avail}} + \sum \text{Sells}$.
14. **Zero Cash Deployment**: Reconciles $\sum \text{Buys} = \sum \text{Sells}$.
15. **Intra-Asset Proportional Buy Allocation (Blocker C6-10)**: Proportional buy allocation across existing holdings with `symbol` ASC tie-breaker.
16. **New Asset Class Deployment**: Generates class-level aggregate recommendation (`symbol: null`, `action: BUY`).
17. **Non-Tradeable Asset Safety (Blocker C6-12)**: `REAL_ESTATE` produces `HOLD_NON_TRADEABLE` and `PARTIALLY_FEASIBLE`/`INFEASIBLE` status with feasibility warning.
18. **Quote Fallback Execution Status (Blocker C6-13)**: `FALLBACK` quote flags `isExecutable: false` and `rebalancingStatus: PRICE_REFRESH_REQUIRED`.
19. **Deterministic `asOfDate` Evaluation**: Same inputs + same `asOfDate` = exact deterministic output.
20. **Zero State Mutation Invariant & Full System Regression Matrix**: Exactly 0 storage/MoneyFlow mutations $\to$ **197/197 Total Tests Passing**.

---

## 5. Gate Approval Request

This document is submitted for formal **Stage C.6.2 Architecture Gate Review**.  
Implementation is **LOCKED 🔒** until approved.
