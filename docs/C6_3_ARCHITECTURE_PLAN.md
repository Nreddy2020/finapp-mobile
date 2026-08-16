# Stage C.6.3 Architecture Plan
## Tax-Efficient Rebalancing Optimizer

**Status**: HARDENED / SUBMITTED FOR ARCHITECTURE GATE APPROVAL  
**Certified Baseline Commit**: [`24e2cea`](https://github.com/Nreddy2020/finapp-mobile/commit/24e2cea)  
**Execution Branch**: `fintech-using-chatgpt`  
**Author**: Lead Architecture & Implementation Agent  

---

## 1. Executive Summary & Architectural Positioning

**Stage C.6.3** delivers the **Tax-Efficient Rebalancing Optimizer** as a pure decision-support optimization layer composed strictly on top of the certified **Stage C.6.2 Drift & Rebalancing Delta Calculator** and the certified **Phase C.4 / C.5 foundation**.

### The Composition Pipeline
$$\begin{matrix}
\text{C.6.1 Target Policy} \\
+ \\
\text{C.4 Analytics Snapshot}
\end{matrix} \xrightarrow{} \text{C.6.2 Rebalancing Engine} \xrightarrow{\text{Planned Sells}} \begin{matrix}
\text{openTaxLotAdapter} \\
+ \\
\text{TaxPolicy (FY24-25)}
\end{matrix} \xrightarrow{} \text{C.6.3 Tax Optimizer} \xrightarrow{} \text{Tax-Optimized Summary}$$

### Clean Architectural Boundary
- **Stage C.6.2 Owns**: Portfolio allocation, percentage-point drift, target deltas, cash scaling, 8-class quantity rounding, and executable sell notional ($S_c$).
- **Stage C.6.3 Owns**: Open FIFO tax-lot reconstruction, marginal tax efficiency lot ranking, annual exemption tracking, asset-specific loss set-off rules, tax liability minimization, and exact sell-notional reconciliation.
- **Stage C.6.3 Never Recalculates**: Allocation weights, target notional deltas, or cash scaling formulas.

---

## 2. Authoritative Data Contracts & DTOs

### 2.1 Authoritative Versioned Tax Policy Model (`TaxPolicy`) (Blocker C6.3-02)
```typescript
export type LossSetOffEligibility = 'SET_OFF_ELIGIBLE' | 'SET_OFF_RESTRICTED' | 'NO_SET_OFF';

export interface AssetTaxRule {
    shortTermHoldingDays: number;         // e.g. 365 days for Equity/MF, 730 for Gold/RE, 1095 for Bonds
    shortTermRate: number;                // e.g. 0.20 (20%)
    longTermRate: number;                 // e.g. 0.125 (12.5%)
    lossSetOffEligibility: LossSetOffEligibility; // e.g. NO_SET_OFF for Crypto
    allowedLossSetOffCategories: string[];// e.g. ['STCG', 'LTCG'] for Equity
}

export interface TaxPolicy {
    policyId: string;                     // e.g. "IN_TAX_FY24_25_V1"
    jurisdiction: string;                 // e.g. "IN"
    effectiveFrom: string;                // ISO-8601 string
    effectiveTo: string | null;
    annualLtcgExemption: number;          // e.g. 125000 (₹1.25L annual exemption for Indian Equity)
    exemptionConsumed: number;            // Annual exemption consumed to date
    rules: Record<string, AssetTaxRule>;
}
```

**Default Indian Tax Policy (FY2024-25 / Budget 2024)**:
| Asset Class | STCG Days | STCG Rate | LTCG Rate | Loss Set-Off Eligibility | Exemption Scope |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `STOCK` | 365 days | 20.0% | 12.5% | `SET_OFF_ELIGIBLE` | Eligible for ₹1.25L annual LTCG exemption |
| `ETF` | 365 days | 20.0% | 12.5% | `SET_OFF_ELIGIBLE` | Eligible for ₹1.25L annual LTCG exemption |
| `MUTUAL_FUND` | 365 days | 20.0% | 12.5% | `SET_OFF_ELIGIBLE` | Equity MF rules |
| `GOLD` | 730 days | 20.0% | 12.5% | `SET_OFF_ELIGIBLE` | Physical/digital gold rules |
| `CRYPTO` | 0 days | 30.0% | 30.0% | `NO_SET_OFF` | Flat 30% tax, zero loss set-off allowed |
| `BOND` | 1095 days | 20.0% | 12.5% | `SET_OFF_RESTRICTED` | Listed bond rules |
| `REAL_ESTATE` | 730 days | 20.0% | 12.5% | `SET_OFF_ELIGIBLE` | Property rules |
| `OTHER` | 1095 days | 20.0% | 20.0% | `SET_OFF_RESTRICTED` | General fallback |

---

### 2.2 Open Tax Lot Contract (`OpenTaxLot`) (Blockers C6-11 & C6.3-05)
```typescript
export interface OpenTaxLot {
    lotId: string;                        // e.g. "lot_evt101_0"
    symbol: string;
    portfolioId: string | null;
    assetType: string;
    buyDate: string;                      // ISO-8601 string
    originalQuantity: number;
    remainingQuantity: number;
    buyPrice: number;
    remainingCostBasis: number;           // remainingQuantity * buyPrice
    currentPrice: number;                 // Quoted reference price
    currentMarketValue: number;           // remainingQuantity * currentPrice
    unrealizedGain: number;               // currentMarketValue - remainingCostBasis
    unrealizedGainPerUnit: number;        // currentPrice - buyPrice
    holdingPeriodDays: number;            // floor((asOfDate - buyDate) / 86400000)
    taxCategory: 'LOSS' | 'LTCG' | 'STCG';
    applicableTaxRate: number;            // Based on taxCategory and TaxPolicy rule
    marginalTaxPerProceeds: number;       // (applicableTaxRate * max(0, unrealizedGainPerUnit)) / currentPrice
    lossSetOffEligibility: LossSetOffEligibility;
}
```

---

### 2.3 Selected Tax Lot & Audit Detail
```typescript
export interface SelectedTaxLot {
    lotId: string;
    symbol: string;
    portfolioId: string | null;
    assetType: string;
    buyDate: string;
    holdingPeriodDays: number;
    taxCategory: 'LOSS' | 'LTCG' | 'STCG';
    originalRemainingQuantity: number;
    soldQuantity: number;
    remainingQuantityAfterSale: number;
    buyPrice: number;
    currentPrice: number;
    soldProceeds: number;                 // soldQuantity * currentPrice
    soldCostBasis: number;                // soldQuantity * buyPrice
    realizedGain: number;                 // soldProceeds - soldCostBasis
    applicableTaxRate: number;
    grossTaxLiability: number;            // max(0, realizedGain) * applicableTaxRate
    exemptionApplied: number;             // Exemption applied to this lot
    netTaxLiability: number;              // grossTaxLiability - exemptionTaxReduction
    selectionTier: 'TIER_1_LOSS' | 'TIER_2_LTCG' | 'TIER_3_STCG';
    selectionReason: string;
}
```

---

### 2.4 Tax-Optimized Rebalancing Summary (`TaxOptimizedRebalancingSummary`) (Blockers C6.3-02, C6.3-03, C6.3-04)
```typescript
export interface TaxOptimizedRebalancingSummary {
    policyId: string;
    taxPolicyId: string;
    asOfDate: string;                     // ISO-8601 deterministic timestamp
    portfolioId: string | null;
    sourceRebalancingSummary: Object;     // Intact C.6.2 output
    
    // Exact Notional Reconciliation
    requestedSellNotional: number;        // From C.6.2 executableSellNotional
    selectedSellNotional: number;         // Total soldProceeds across selected lots
    unfilledSellNotional: number;         // max(0, requestedSellNotional - selectedSellNotional)
    sellNotionalResidual: number;         // |requestedSellNotional - selectedSellNotional|
    
    // Tax Metrics & Optimization Delta
    naiveEstimatedTaxLiability: number;   // Tax liability under naive FIFO/proportional sells
    optimizedEstimatedTaxLiability: number;// Tax liability under optimizer
    estimatedTaxSavings: number;          // naiveEstimatedTaxLiability - optimizedEstimatedTaxLiability
    taxDragPercentage: number;            // (optimizedEstimatedTaxLiability / selectedSellNotional) * 100
    
    // Loss Harvesting Metrics
    harvestedLosses: number;              // Total gross unrealized losses realized
    effectiveOffsettableLosses: number;   // Losses eligible for set-off under TaxPolicy
    nonOffsettableLosses: number;         // Ineligible losses (e.g. Crypto)
    taxBenefitFromLosses: number;         // Actual tax reduction from offsettable losses
    
    // Exemption Tracking
    annualLtcgExemption: number;
    exemptionConsumedPrior: number;
    exemptionConsumedCurrent: number;
    remainingExemptionAfterSale: number;
    
    // Detailed Lot Audit
    selectedTaxLots: SelectedTaxLot[];
    
    // Feasibility & Warnings
    optimizationStatus: 'OPTIMAL' | 'PARTIAL_FILL' | 'ZERO_SELLS_REQUIRED' | 'PRICE_REFRESH_REQUIRED';
    optimizationWarnings: string[];
}
```

---

## 3. Mathematical Optimization & Exact Lot Selection (Blocker C6.3-01)

### 3.1 Objective Function
For each overweight asset class $c$ requiring executable sell notional $S_c$:
$$\min_{\mathbf{q}} \sum_{l \in \text{OpenLots}(c)} \text{NetTax}_l(q_l)$$
$$\text{subject to: } \sum_{l \in \text{OpenLots}(c)} q_l \cdot P_l = S_c, \quad 0 \le q_l \le \text{RemainingQuantity}_l$$

### 3.2 Marginal Tax Efficiency Ranking & Global Optimality
For each open lot $l$, the marginal tax rate per rupee of proceeds generated is:
$$\text{MarginalTaxPerProceeds}(l) = \begin{cases}
\frac{-\text{lossBenefitRate} \cdot |P_l - \text{buyPrice}_l|}{P_l} < 0, & P_l < \text{buyPrice}_l \land \text{SET\_OFF\_ELIGIBLE} \\
0, & P_l < \text{buyPrice}_l \land \text{NO\_SET\_OFF} \\
\frac{\text{longTermRate} \cdot (P_l - \text{buyPrice}_l)}{P_l}, & P_l \ge \text{buyPrice}_l \land \text{holdingPeriodDays} \ge \text{STCG\_Days} \\
\frac{\text{shortTermRate} \cdot (P_l - \text{buyPrice}_l)}{P_l}, & P_l \ge \text{buyPrice}_l \land \text{holdingPeriodDays} < \text{STCG\_Days}
\end{cases}$$

**Mathematical Invariant**:
Sorting open lots in strictly ascending order of $\text{MarginalTaxPerProceeds}(l)$ guarantees that any greedy selection of quantity $q_l$ up to notional $S_c$ achieves the **global minimum tax liability** for the linear continuous relaxation, and provides the optimal discrete solution subject to standard share rounding constraints:
$$\text{Tax}_{\text{selected}} \le \text{Tax}_{\text{any other feasible selection}}$$

**Deterministic Tie-Breakers**:
1. Primary: $\text{MarginalTaxPerProceeds}(l)$ ASC
2. Secondary: `symbol` ASC
3. Tertiary: `buyDate` ASC (FIFO)
4. Quaternary: `lotId` ASC

---

## 4. OpenTaxLot Reconstruction Accounting Invariants (Blocker C6.3-05)

The `openTaxLotAdapter.js` module reconstructs open tax lots chronologically from confirmed investment events:

1. **Strict AsOfDate Cutoff**:
   - Any event with `event.date > asOfDate` or `status !== InvestmentEventStatus.CONFIRMED` is strictly excluded.
2. **Deterministic Event Ordering**:
   - Events are sorted chronologically: `date` ASC, then `id` ASC.
3. **FIFO Lot Consumption**:
   - BUY events create lots with `originalQuantity` and `remainingQuantity`.
   - SELL events chronologically consume `remainingQuantity` from earliest open BUY lots.
4. **Position Quantity Invariant**:
   $$\sum_{l \in \text{OpenLots}(s, p)} \text{RemainingQuantity}_l = \text{CurrentConfirmedPositionQuantity}(s, p) \quad \forall s, p$$
5. **Exact Holding Period**:
   $$\text{holdingPeriodDays}_l = \max\left(0, \left\lfloor \frac{\text{asOfDate.getTime}() - \text{buyDate.getTime}()}{86,400,000} \right\rfloor\right)$$
6. **Zero Mutation Guard**:
   - Pure read-only adapter with 0 writes to storage or ledger.

---

## 5. Exact Sell-Notional Reconciliation Invariant (Blocker C6.3-04)

For each overweight asset class $c$:
$$\text{requestedSellNotional} = S_c \quad (\text{from C.6.2 executableSellNotional})$$
$$\text{selectedSellNotional} = \sum_{l \in \text{SelectedLots}(c)} \text{soldQuantity}_l \times P_l$$
$$\text{sellNotionalResidual} = |\text{requestedSellNotional} - \text{selectedSellNotional}|$$
$$\text{unfilledSellNotional} = \max(0, \text{requestedSellNotional} - \text{selectedSellNotional})$$

- If $\text{totalOpenValue}(c) < S_c \implies \text{unfilledSellNotional} > 0$, `optimizationStatus = 'PARTIAL_FILL'`.
- If $\text{totalOpenValue}(c) \ge S_c \implies \text{unfilledSellNotional} = 0$, `optimizationStatus = 'OPTIMAL'`.

---

## 6. Stage C.6.3 30-Point Acceptance Test Plan (`tests/test_c63.mjs`) (Blocker J)

The acceptance suite covers **30 explicit behavioral scenarios**:

### Group 1: Open Tax Lot Accounting (Tests 1–6)
1. Single BUY lot derivation and remaining quantity matching.
2. Multiple BUY lots with single partial SELL FIFO deduction.
3. Multiple BUY lots with multiple SELL events exhausting earlier lots.
4. Same-day transactions deterministic ordering (`date` ASC, `id` ASC).
5. Strict `asOfDate` filtering (events after `asOfDate` strictly ignored).
6. Position balance invariant verification ($\sum \text{LotQty} == \text{HoldingQty}$).

### Group 2: Tax Optimization & Lot Selection (Tests 7–14)
7. Tier 1 Loss Harvesting Priority (selects loss lot first, ₹0 tax).
8. Tier 2 LTCG Priority over STCG (selects long-term lot before short-term lot).
9. Tier 3 STCG Sold Strictly Last (short-term lot only consumed when necessary).
10. Marginal tax efficiency ordering across multiple lots with different prices.
11. Deterministic tie-breaker (symbol ASC, buyDate ASC).
12. Exact sell-notional reconciliation ($\text{selectedSellNotional} == \text{requestedSellNotional}$).
13. Unfilled sell-notional detection when holdings are insufficient (`PARTIAL_FILL`).
14. Partial lot consumption residual tracking ($\text{remainingQuantityAfterSale}$).

### Group 3: Tax Policy & Exemption Rules (Tests 15–20)
15. Versioned `TaxPolicy` consumption (custom rates applied).
16. Indian FY24-25 default policy rules (STCG 20%, LTCG 12.5%).
17. Annual LTCG ₹1.25L exemption application and residual tracking.
18. Loss set-off eligibility for Equity (`SET_OFF_ELIGIBLE`).
19. Crypto 30% flat tax rule without loss set-off (`NO_SET_OFF`).
20. Listed Bond holding period (1095 days) and slab/rate application.

### Group 4: Tax Metrics & Savings (Tests 21–25)
21. Naive vs Optimized tax liability comparison and `estimatedTaxSavings`.
22. `taxDragPercentage` exact computation.
23. `taxBenefitFromLosses` computation for eligible loss harvesting.
24. Pure fresh-cash rebalance ($C \ge C_{\text{pure\_cash\_min}}$) producing ₹0 tax.
25. In-band balanced portfolio producing ₹0 tax (`ZERO_SELLS_REQUIRED`).

### Group 5: Scoping, Invariants & Master Regression (Tests 26–30)
26. Multi-portfolio tax lot isolation (Portfolio A lots never mixed with Portfolio B).
27. Global universe lot optimization (`portfolioId: null`).
28. Read-only adapter invariant (0 storage/MoneyFlow mutations).
29. Deterministic repeatability across multiple executions with identical `asOfDate`.
30. Full prior system regression matrix $\to$ **227/227 Total System Tests Passing**.

---

## 7. Gate Approval Confirmation

All 5 architectural blockers (`C6.3-01` through `C6.3-05`) are mathematically formulated and locked in this plan.  
We respectfully request the **Stage C.6.3 Architecture Gate Approval & Implementation Authorization**.
