# Phase C.6 Master Architecture Plan
## Intelligent Portfolio Rebalancing & Tax-Aware Decision Engine

**Status**: HARDENED / READY FOR FINAL A–J GATE APPROVAL  
**Certified Baseline Commit**: [`1dc480f`](https://github.com/Nreddy2020/finapp-mobile/commit/1dc480f)  
**Execution Branch**: `fintech-using-chatgpt`  
**Author**: Lead Architecture & Implementation Agent  

---

## 1. Executive Summary & Strategic Paradigm

**Phase C.6** transforms FinLife Investing from **passive analytics and visualization (Phases C.4 & C.5)** into an **actionable, intelligent, tax-aware decision-support engine**.

### The Strategic Paradigm
$$\text{Observe (C.4)} \longrightarrow \text{Understand (C.5)} \longrightarrow \text{Decide (C.6)} \longrightarrow \text{Act (Future C.7+)}$$

Phase C.6 provides:
1. **Target Allocation Policy Engine (C.6.1)**: Define and validate reproducible target asset allocation policies across FinLife's certified 8-asset taxonomy, with external liquidity separation.
2. **Drift & Rebalancing Calculator (C.6.2)**: Calculate exact percentage-point drift, deterministic intra-asset holding selection, tradability feasibility, and share-rounded rebalancing trade deltas.
3. **Tax-Efficient Rebalancing Optimizer (C.6.3)**: Fresh-cash-first strategy and multi-objective open FIFO tax-lot optimization (Loss harvesting $\to$ LTCG $\to$ STCG last).
4. **Rebalancing Visualizer & Order Preview UI (C.6.4)**: Interactive dual-bar drift charts, action cards, tax drag estimation, feasibility warnings, and a strictly read-only Order Preview modal.

---

## 2. Certified Taxonomy & External Liquidity Invariant (Blocker C6-02)

To maintain 100% mathematical integrity with certified Phase C.4 & C.5:
- **Canonical Asset Classes (Certified C.4.2)**:
  `STOCK`, `MUTUAL_FUND`, `ETF`, `GOLD`, `CRYPTO`, `BOND`, `REAL_ESTATE`, `OTHER`
- **100% Target Allocation Sum Invariant**:
  $$\sum_{i=1}^{8} w_i^{\text{target}} = 100.00\% \quad (|100 - \sum w_i| \le 0.001\%)$$
- **Investment Denominator Contract**:
  $$V_{\text{portfolio}} = \sum_{j \in \text{Holdings}} \text{HoldingMarketValue}_j$$
  $$w_{\text{current}}(c) = \begin{cases} \frac{V_{\text{class}}(c)}{V_{\text{portfolio}}} \times 100\%, & V_{\text{portfolio}} > 0 \\ 0\%, & V_{\text{portfolio}} = 0 \end{cases}$$
- **External Liquidity Pool**:
  Available cash/bank balances ($C_{\text{liquidity}}$) are treated as an **External Liquidity Pool**. Cash is **never** included in the $100\%$ investment allocation denominator, avoiding any mutation to the certified C.4 asset taxonomy.

---

## 3. Data Contracts & Formal DTO Models

### 3.1 Target Allocation Policy Model (`TargetAllocationPolicy`)
```typescript
interface TargetAllocationPolicy {
    policyId: string;              // e.g. "pol_growth_v1"
    policyName: string;            // e.g. "Aggressive Growth"
    version: string;               // e.g. "1.0.0"
    portfolioId: string | null;    // null for global template, or scoped to specific portfolio
    effectiveDate: string;         // ISO-8601 string
    assetWeights: {                // Must sum to exactly 100.00%
        STOCK: number;
        MUTUAL_FUND: number;
        ETF: number;
        GOLD: number;
        CRYPTO: number;
        BOND: number;
        REAL_ESTATE: number;
        OTHER: number;
    };
    driftTolerancePercent: number; // Percentage points (e.g. 5.0 for ±5.00 pp)
    createdAt: string;
}
```

### 3.2 Versioned Tax Policy Model (`TaxPolicy`) (Blocker C6-05)
```typescript
interface AssetTaxRule {
    shortTermHoldingDays: number;  // e.g. 365 days
    shortTermRate: number;         // e.g. 0.20 (20%)
    longTermRate: number;          // e.g. 0.125 (12.5%)
}

interface TaxPolicy {
    policyId: string;              // e.g. "IN_TAX_FY24_25_V1"
    jurisdiction: string;          // e.g. "IN"
    effectiveFrom: string;
    effectiveTo: string | null;
    rules: Record<string, AssetTaxRule>;
}
```

### 3.3 Asset Tradability & Quote Execution Eligibility (Blockers C6-04 & C6-13)
```typescript
type AssetTradeability = 'TRADEABLE' | 'NON_TRADEABLE' | 'FALLBACK_VALUATION_ONLY' | 'INSUFFICIENT_QUOTE' | 'STALE_QUOTE';
type RebalanceAction = 'BUY' | 'SELL' | 'HOLD_BALANCED' | 'HOLD_NON_TRADEABLE' | 'REQUIRES_PRICE_REFRESH';
```
- **Tradeability Rules**:
  - `STOCK`, `MUTUAL_FUND`, `ETF`, `CRYPTO`, `BOND`: Classified as `TRADEABLE` when backed by a `LIVE` market quote.
  - `REAL_ESTATE`, physical assets: Classified as `NON_TRADEABLE`. Participate in allocation & drift, produce action `HOLD_NON_TRADEABLE` and $0$ orders.
- **Quote Execution Eligibility (Blocker C6-13)**:
  - `LIVE` quote $\implies$ `isExecutable: true`, standard BUY/SELL recommendations generated.
  - `FALLBACK` quote (valued at cost basis) $\implies$ `isExecutable: false`, `tradeability: 'FALLBACK_VALUATION_ONLY'`, `action: 'REQUIRES_PRICE_REFRESH'`. Provides analytical estimates only; zero fake orders generated.
  - `STALE` / `UNAVAILABLE` quote $\implies$ `isExecutable: false`, `action: 'REQUIRES_PRICE_REFRESH'`.

### 3.4 Open Tax Lot Data Contract (Blocker C6-11)
```typescript
interface OpenTaxLot {
    lotId: string;
    symbol: string;
    portfolioId: string | null;
    assetType: string;
    buyDate: string;               // ISO-8601 string
    originalQuantity: number;
    remainingQuantity: number;
    buyPrice: number;
    remainingCostBasis: number;
    currentPrice: number;
    currentMarketValue: number;
    unrealizedGain: number;
    holdingPeriodDays: number;
    taxCategory: 'STCG' | 'LTCG';
    applicableTaxRate: number;
    estimatedTaxImpact: number;
}
```

### 3.5 Rebalancing Recommendation DTO (`RebalancingRecommendation`)
```typescript
interface RebalancingRecommendation {
    assetType: string;
    symbol: string | null;         // Specific symbol or asset class aggregate
    portfolioId: string | null;
    currentValue: number;
    currentWeightPercent: number;
    targetWeightPercent: number;
    driftPercentagePoints: number; // currentWeightPercent - targetWeightPercent
    action: RebalanceAction;
    tradeability: AssetTradeability;
    isExecutable: boolean;
    quoteStatus: 'LIVE' | 'STALE' | 'FALLBACK' | 'UNAVAILABLE';
    referencePrice: number;
    requiredNotional: number;      // Positive for buy, negative for sell
    rawEstimatedQuantity: number;  // Unrounded
    roundedTradeQuantity: number;  // Rounded by precision rule
    roundingMode: 'FLOOR_WHOLE' | 'DECIMAL_4' | 'NONE';
    estimatedTaxImpact: number;    // Estimated tax liability for sells
    reason: string;
}
```

### 3.6 Rebalancing Summary DTO (`RebalancingSummary`) (Blocker C6-12)
```typescript
interface RebalancingSummary {
    policyId: string;
    asOfDate: string;              // ISO-8601 deterministic timestamp
    portfolioId: string | null;
    investmentPortfolioValue: number;
    availableLiquidity: number;    // External cash supplied
    deployedLiquidity: number;     // Cash used for fresh-cash buys
    totalRequiredBuyValue: number;
    totalRequiredSellValue: number;
    totalEstimatedTaxLiability: number;
    currentAllocation: Array<{ assetType: string; marketValue: number; weightPercent: number }>;
    targetAllocation: Array<{ assetType: string; targetWeightPercent: number }>;
    recommendations: RebalancingRecommendation[];
    projectedAllocation: Array<{ assetType: string; projectedValue: number; projectedWeightPercent: number }>;
    residualDriftPercentagePoints: number; // Achievable residual drift post-rounding and non-tradeable constraints
    rebalancingStatus: 'BALANCED' | 'ACTION_RECOMMENDED' | 'PARTIALLY_FEASIBLE' | 'INFEASIBLE' | 'PRICE_REFRESH_REQUIRED';
    feasibilityWarnings: string[];
    isConsistent: boolean;
    integrityWarnings: string[];
}
```

---

## 4. Mathematical Contracts & Multi-Objective Formulation

### 4.1 Percentage-Point Drift Semantics (Blocker C6-01)
$$\text{Drift}_{\text{pp}}(c) = w_{\text{current}}(c) - w_{\text{target}}(c)$$
Given drift tolerance threshold $\theta \ge 0$ in percentage points (e.g. $\theta = 5.00\text{ pp}$):
$$\text{Drift Status}(c) = \begin{cases} 
\text{OVERWEIGHT (Sell candidate)}, & \text{Drift}_{\text{pp}}(c) > +\theta \\
\text{UNDERWEIGHT (Buy candidate)}, & \text{Drift}_{\text{pp}}(c) < -\theta \\
\text{BALANCED (In Band)}, & -\theta \le \text{Drift}_{\text{pp}}(c) \le +\theta
\end{cases}$$
*Boundary Invariants*:
- Exactly $+\theta \implies \text{BALANCED}$
- Exactly $-\theta \implies \text{BALANCED}$
- $+\theta + 0.01\% \implies \text{OVERWEIGHT}$
- $-\theta - 0.01\% \implies \text{UNDERWEIGHT}$

### 4.2 Deterministic Intra-Asset-Class Holding Selection (Blocker C6-10)

For an asset class with notional delta $\Delta V(c)$:

1. **Underweight Asset Class ($\Delta V(c) > 0 \implies \text{BUY}$)**:
   - **Case A (Existing Holdings)**: Allocate buy notional across existing `TRADEABLE` holdings with `LIVE` quotes in proportion to their existing market weights. If multiple holdings have identical weights, tie-break deterministically by `symbol` ascending (A $\to$ Z).
   - **Case B (Zero Holdings in Asset Class)**: Generate a class-level aggregate recommendation (`symbol: null`, `action: 'BUY'`, `reason: 'NEW_ASSET_CLASS_DEPLOYMENT'`).
2. **Overweight Asset Class ($\Delta V(c) < 0 \implies \text{SELL}$)**:
   - Holding and lot selection is governed deterministically by the **Tax Optimizer** (Section 4.5) across all open lots in the asset class:
     $$\text{Lot Priority}: \text{Tier 1 (Loss Harvest)} \longrightarrow \text{Tier 2 (LTCG)} \longrightarrow \text{Tier 3 (STCG)}$$
   - Tie-breaker within same tax tier: `symbol` ascending (A $\to$ Z), then `buyDate` ascending (FIFO).

### 4.3 Quantity Rounding & Residual Drift (Blocker C6-03)
For holding $h$ with reference price $P_h > 0$:
$$\text{RawQty}_h = \frac{|\Delta V_h|}{P_h}$$
$$\text{RoundedQty}_h = \begin{cases}
\lfloor \text{RawQty}_h \rfloor, & \text{assetType} \in \{\text{STOCK}, \text{ETF}\} \text{ (Floor whole shares)} \\
\text{round}(\text{RawQty}_h, 4), & \text{assetType} \in \{\text{MUTUAL_FUND}, \text{CRYPTO}, \text{GOLD}\} \text{ (4 decimals)} \\
0, & \text{tradeability} = \text{NON_TRADEABLE} \lor \text{quoteStatus} \ne \text{'LIVE'}
\end{cases}$$

**Realistic Projected Allocation & Achievable Drift**:
$$\text{ExecutableDelta}_h = \begin{cases} +\text{RoundedQty}_h \times P_h, & \text{action} = \text{BUY} \land \text{isExecutable} \\ -\text{RoundedQty}_h \times P_h, & \text{action} = \text{SELL} \land \text{isExecutable} \\ 0, & \text{otherwise} \end{cases}$$
$$\text{ProjectedValue}(c) = V_{\text{class}}(c) + \sum_{h \in c} \text{ExecutableDelta}_h$$
$$\text{ResidualDrift}_{\text{pp}}(c) = \left( \frac{\text{ProjectedValue}(c)}{\sum_k \text{ProjectedValue}(k)} \times 100 \right) - w_{\text{target}}(c)$$

### 4.4 Rebalancing Feasibility with Non-Tradeable Assets (Blocker C6-12)
If an overweight asset class contains non-tradeable assets (e.g. `REAL_ESTATE`):
- The non-tradeable portion produces `action: 'HOLD_NON_TRADEABLE'`, `roundedTradeQuantity: 0`.
- If tradeable assets can fully compensate, `rebalancingStatus = 'PARTIALLY_FEASIBLE'`.
- If 100% of drift is locked in non-tradeable assets, `rebalancingStatus = 'INFEASIBLE'`.
- Feasibility warning emitted: `"REAL_ESTATE overweight cannot be reduced because asset is non-tradeable."`

### 4.5 Open Tax-Lot Adapter & Optimization Contract (Blockers C6-06 & C6-11)
To inspect currently open tax lots without modifying frozen C.4 engines, a pure read-only helper `services/openTaxLotAdapter.js` reads confirmed investment events and active holdings, matching confirmed historical sells to derive active open lots.

**Optimization Objective**:
$$\min \text{EstimatedTaxImpact} = \sum_{\text{lots sold } l} \text{applicableTaxRate}(l) \times \max(0, \text{UnrealizedGain}_l)$$
$$\text{subject to: } \sum_{l} \text{GrossProceeds}_l = \text{SellNeed}, \quad |\text{ResidualDrift}_{\text{pp}}(c)| \le \theta \quad \forall c$$

*Note on Tax Semantics*: The engine computes **Estimated Tax Impact** for trade comparison purposes, explicitly defined as an analytical decision-support estimate rather than an exhaustive tax filing engine.

---

## 5. Deterministic Execution & Read-Only Invariants (Blockers C6-08 & C6-09)

1. **Deterministic `asOfDate` Evaluation**:
   All valuation, drift, and tax calculations are evaluated strictly relative to the supplied `asOfDate`:
   ```javascript
   RebalancingEngine.calculateRebalancing({
       portfolioId,
       policy,
       asOfDate,
       availableLiquidity,
       taxPolicy
   });
   ```
   Zero implicit `new Date()` calls in financial math.
2. **Order Preview $\neq$ Execution Invariant**:
   The output is strictly a **Rebalancing Order Preview**. It is **read-only decision support**.
   - Zero MoneyFlow transactions written.
   - Zero Investment events created.
   - Zero holdings mutated.
   - Zero cash deducted.

---

## 6. Pre-Configured Model Portfolios

| Model Policy | Stock | MF | ETF | Gold | Crypto | Bond | Real Estate | Other | Drift Tolerance |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Aggressive Growth** | 50% | 25% | 15% | 5% | 5% | 0% | 0% | 0% | $\pm 5.0\text{ pp}$ |
| **Moderate Balanced** | 40% | 30% | 15% | 10% | 0% | 5% | 0% | 0% | $\pm 5.0\text{ pp}$ |
| **Conservative Wealth**| 20% | 30% | 15% | 15% | 0% | 20% | 0% | 0% | $\pm 4.0\text{ pp}$ |
| **All-Weather Classic**| 30% | 20% | 15% | 15% | 0% | 20% | 0% | 0% | $\pm 5.0\text{ pp}$ |

---

## 7. Phase C.6 Verification Strategy (42-Scenario Acceptance Matrix)

The test suite `tests/test_c6.mjs` will cover **42 explicit behavioral scenarios** with strict `process.exit(1)` failure enforcement:

1. **Target Policy (Tests 1–8)**:
   - 100.00% target allocation validation.
   - Sum $>100\%$ or $<100\%$ rejected with error.
   - Negative weights rejected.
   - Unknown asset class rejected.
   - Default $\pm 5\text{ pp}$ tolerance initialization.
   - Custom tolerance validation.
   - Policy model serialization and reproducibility.
   - Policy version determinism.
2. **Drift & Rebalancing Delta (Tests 9–18)**:
   - Balanced portfolio in-band (0 actions).
   - Single overweight asset detection.
   - Single underweight asset detection.
   - Multiple simultaneous drifts.
   - Exact boundary $+5.00\text{ pp} \implies \text{BALANCED}$.
   - Exact boundary $-5.00\text{ pp} \implies \text{BALANCED}$.
   - Strict trigger $+5.01\text{ pp} \implies \text{OVERWEIGHT}$.
   - Strict trigger $-5.01\text{ pp} \implies \text{UNDERWEIGHT}$.
   - Whole share floor rounding (Stocks).
   - 4-decimal precision rounding (Crypto/MF).
3. **Liquidity & Fresh Cash (Tests 19–24)**:
   - 100% Cash funding (0 taxable sells).
   - Partial cash deployment with remaining deficit.
   - Zero cash deployment.
   - Liquidity strictly excluded from investment allocation denominator.
   - Cash deficit never manufactured.
   - Residual drift exposed post-cash deployment.
4. **Tax-Efficient Optimizer & Open Lots (Tests 25–30)**:
   - Loss harvesting open-lot priority (Tier 1).
   - LTCG open-lot priority over STCG (Tier 2).
   - STCG sold last (Tier 3).
   - Versioned tax policy consumption (no hardcoded rates).
   - Open tax-lot adapter read-only derivation.
   - Zero tax impact on 100% buy rebalancing.
5. **Tradability & Market Data (Tests 31–34)**:
   - Non-tradeable asset (`REAL_ESTATE`) produces `HOLD_NON_TRADEABLE` and `PARTIALLY_FEASIBLE`/`INFEASIBLE` status.
   - Stale quote flags `REQUIRES_PRICE_REFRESH` and `isExecutable: false`.
   - Fallback quote flags `FALLBACK_VALUATION_ONLY` and `isExecutable: false`.
   - Zero market value portfolio safety (0 drift, no NaN).
6. **Intra-Asset Selection & Multi-Portfolio (Tests 35–37)**:
   - Deterministic intra-asset buy proportional allocation & alphabetical tie-breaker.
   - Scoped Portfolio A vs Portfolio B rebalancing isolation.
   - Global universe rebalancing aggregation (`portfolioId: null`).
7. **Invariants, Safety & Preview (Tests 38–41)**:
   - Deterministic `asOfDate` evaluation across time.
   - Exactly 0 MoneyFlow mutations.
   - Exactly 0 Holding/Event ledger mutations.
   - Order Preview marked explicitly read-only.
8. **Master System Regression Matrix (Test 42)**:
   - 100% preservation of certified C.4 (77/77) and C.5 (80/80) regression suites $\to$ **199/199 Total System Tests Passing**.

---

## 8. Gate Approval Request

All blockers (`C6-01` through `C6-13`) are mathematically formulated and locked in this plan.  
We respectfully request the **Consolidated Phase C.6 Architecture Gate Approval (A–J)** and authorization to proceed with **Stage C.6.1**.
