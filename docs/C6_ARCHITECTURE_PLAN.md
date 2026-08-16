# Phase C.6 Master Architecture Plan
## Intelligent Portfolio Rebalancing & Tax-Aware Decision Engine

**Status**: AMENDED / PENDING FINAL ARCHITECTURE GATE APPROVAL  
**Certified Baseline Commit**: [`1dc480f`](https://github.com/Nreddy2020/finapp-mobile/commit/1dc480f)  
**Execution Branch**: `fintech-using-chatgpt`  
**Author**: Lead Architecture & Implementation Agent  

---

## 1. Executive Summary & Strategic Objective

**Phase C.6** transforms FinLife Investing from **passive analytics and visualization (Phases C.4 & C.5)** into an **actionable, intelligent, tax-aware decision-support engine**.

### The Strategic Paradigm
$$\text{Observe (C.4)} \longrightarrow \text{Understand (C.5)} \longrightarrow \text{Decide (C.6)} \longrightarrow \text{Act (Future C.7+)}$$

Phase C.6 provides:
1. **Target Allocation Policy Engine (C.6.1)**: Define and validate reproducible target asset allocation policies across FinLife's certified 8-asset taxonomy, with external liquidity separation.
2. **Drift & Rebalancing Calculator (C.6.2)**: Calculate exact percentage-point drift, actionability tagging, and share-rounded rebalancing trade deltas.
3. **Tax-Efficient Rebalancing Optimizer (C.6.3)**: Fresh-cash-first strategy and multi-objective FIFO tax-lot optimization (Loss harvesting $\to$ LTCG $\to$ STCG last).
4. **Rebalancing Visualizer & Order Preview UI (C.6.4)**: Interactive dual-bar drift charts, action cards, tax drag estimation, and a strictly read-only Order Preview modal.

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

### 3.3 Asset Tradability & Quote Status (Blocker C6-04)
```typescript
type AssetTradeability = 'TRADEABLE' | 'NON_TRADEABLE' | 'INSUFFICIENT_QUOTE' | 'STALE_QUOTE' | 'UNKNOWN';
type RebalanceAction = 'BUY' | 'SELL' | 'HOLD_BALANCED' | 'HOLD_NON_TRADEABLE' | 'REQUIRES_PRICE_REFRESH';
```
- **Rule**: `REAL_ESTATE` and physical/illiquid assets are classified as `NON_TRADEABLE`. They participate in allocation weights and drift calculations, but generate action `HOLD_NON_TRADEABLE` and produce $0$ trade orders.
- **Rule**: Holdings with `STALE` or `UNAVAILABLE` quotes produce `REQUIRES_PRICE_REFRESH` with a warning flag, preventing fake orders from inaccurate prices.

### 3.4 Rebalancing Recommendation DTO (`RebalancingRecommendation`)
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
    quoteStatus: 'LIVE' | 'STALE' | 'FALLBACK' | 'UNAVAILABLE';
    referencePrice: number;
    requiredNotional: number;      // Positive for buy, negative for sell
    rawEstimatedQuantity: number;  // Unrounded
    roundedTradeQuantity: number;  // Rounded by precision rule
    roundingMode: 'FLOOR_WHOLE' | 'DECIMAL_4';
    estimatedTaxImpact: number;    // Estimated tax liability for sells
    reason: string;
}
```

### 3.5 Rebalancing Summary DTO (`RebalancingSummary`)
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
    residualDriftPercentagePoints: number; // Max residual drift post-rounding
    rebalancingStatus: 'BALANCED' | 'DRIFT_DETECTED' | 'ACTION_RECOMMENDED' | 'PRICE_REFRESH_REQUIRED';
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

### 4.2 Notional Delta & Exact Quantity Rounding (Blocker C6-03)
$$\text{TargetValue}(c) = V_{\text{portfolio}} \times \left( \frac{w_{\text{target}}(c)}{100} \right)$$
$$\Delta V(c) = \text{TargetValue}(c) - V_{\text{class}}(c) = -\left( \frac{\text{Drift}_{\text{pp}}(c)}{100} \right) \times V_{\text{portfolio}}$$

**Quantity Rounding Rule**:
For holding $h$ with reference price $P_h > 0$:
$$\text{RawQty}_h = \frac{|\Delta V_h|}{P_h}$$
$$\text{RoundedQty}_h = \begin{cases}
\lfloor \text{RawQty}_h \rfloor, & \text{assetType} \in \{\text{STOCK}, \text{ETF}\} \text{ (Floor whole shares)} \\
\text{round}(\text{RawQty}_h, 4), & \text{assetType} \in \{\text{MUTUAL_FUND}, \text{CRYPTO}, \text{GOLD}\} \text{ (4 decimals)} \\
0, & \text{tradeability} = \text{NON_TRADEABLE}
\end{cases}$$

**Residual Drift Invariant**:
$$\text{ProjectedValue}(c) = V_{\text{class}}(c) + \sum_{h \in c} (\text{Direction}_h \times \text{RoundedQty}_h \times P_h)$$
$$\text{ResidualDrift}_{\text{pp}}(c) = \left( \frac{\text{ProjectedValue}(c)}{\sum_k \text{ProjectedValue}(k)} \times 100 \right) - w_{\text{target}}(c)$$

### 4.3 Liquidity Constraints & Fresh-Cash-First (Blocker C6-07)
Given available liquid cash $C_{\text{avail}} \ge 0$:
$$\text{UnderweightDeficit} = \sum_{c: \Delta V(c) > 0} \Delta V(c)$$
1. **Full Cash Coverage** ($C_{\text{avail}} \ge \text{UnderweightDeficit}$):
   - Deployed cash $= \text{UnderweightDeficit}$.
   - Buy orders funded 100% by cash.
   - **Taxable Sells Required $= 0$** (Zero capital gains tax triggered).
2. **Partial Cash Coverage** ($0 < C_{\text{avail}} < \text{UnderweightDeficit}$):
   - Deployed cash $= C_{\text{avail}}$.
   - Remaining deficit to be funded by sells: $\text{SellNeed} = \text{UnderweightDeficit} - C_{\text{avail}}$.
   - Cash allocated proportionally across underweight assets:
     $$\text{CashFunded}(c) = C_{\text{avail}} \times \left( \frac{\Delta V(c)}{\text{UnderweightDeficit}} \right)$$
3. **Zero Cash Coverage** ($C_{\text{avail}} = 0$):
   - SellNeed $= \text{UnderweightDeficit}$. Sells funded entirely from overweight assets.

### 4.4 Multi-Objective Tax Optimization Contract (Blocker C6-06)
When sells are required, the optimizer minimizes tax drag subject to portfolio constraints:

$$\min \text{EstimatedTaxLiability} = \sum_{\text{lots sold } l} \text{TaxRate}(l) \times \max(0, \text{RealizedGain}_l)$$
$$\text{subject to: } \sum_{l} \text{Proceeds}_l = \text{SellNeed}, \quad |\text{ResidualDrift}_{\text{pp}}(c)| \le \theta \quad \forall c$$

**Deterministic Lot Selection Order** (consuming C.4.4 FIFO lot records):
1. **Tier 1 (Tax Loss Harvesting)**: Unrealized Gain $< 0$. Offsets gains, zero tax.
2. **Tier 2 (Long-Term Capital Gains)**: Holding period $>$ threshold (Tax rate $= \text{longTermRate}$).
3. **Tier 3 (Short-Term Capital Gains)**: Holding period $\le$ threshold (Tax rate $= \text{shortTermRate}$, sold last).

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
   Zero implicit `new Date()` calls in business math.
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

The test suite `tests/test_c6.mjs` will cover **42 comprehensive scenarios** with strict `process.exit(1)` failure enforcement:

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
4. **Tax-Efficient Optimizer (Tests 25–30)**:
   - Loss harvesting lot selection priority (Tier 1).
   - LTCG lot selection priority over STCG (Tier 2).
   - STCG sold last (Tier 3).
   - Versioned tax policy consumption (no hardcoded rates).
   - Tax liability impact calculation accuracy.
   - Zero tax impact on 100% buy rebalancing.
5. **Asset Tradability & Market Data (Tests 31–34)**:
   - Non-tradeable asset (`REAL_ESTATE`) produces `HOLD_NON_TRADEABLE` with 0 orders.
   - Stale quote flags `REQUIRES_PRICE_REFRESH`.
   - Missing quote fallback valuation handling.
   - Zero market value portfolio safety (0 drift, no NaN).
6. **Multi-Portfolio Isolation (Tests 35–37)**:
   - Scoped Portfolio A vs Portfolio B rebalancing isolation.
   - Same symbol across separate portfolios.
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

All 9 blockers (`C6-01` through `C6-09`) are completely addressed and mathematically locked in this amended plan.  
We respectfully request the **Consolidated Phase C.6 Architecture Gate Approval (A–J)**.
