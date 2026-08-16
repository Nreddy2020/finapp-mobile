# Stage C.6.3 Architecture Plan
## Tax-Efficient Rebalancing Optimizer

**Status**: HARDENED & RECONCILED / PENDING FINAL GATE APPROVAL  
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
- **Stage C.6.3 Owns**: Open FIFO tax-lot reconstruction, deterministic tax-minimization lot selection, shared annual LTCG exemption allocation, multi-category loss set-off accounting, and rounding-aware sell-notional reconciliation.
- **Stage C.6.3 Never Recalculates**: Allocation weights, target notional deltas, or cash scaling formulas.

---

## 2. Authoritative Data Contracts & DTOs

### 2.1 Authoritative Versioned Tax Policy Model (`TaxPolicy`) (Blockers C6.3-02 & C6.3-03)
```typescript
export type LossSetOffEligibility = 'SET_OFF_ELIGIBLE' | 'SET_OFF_RESTRICTED' | 'NO_SET_OFF';

export interface AssetTaxRule {
    shortTermHoldingDays: number;         // e.g. 365 days for Equity/MF, 730 for Gold/RE, 1095 for Bonds
    shortTermRate: number;                // e.g. 0.20 (20%)
    longTermRate: number;                 // e.g. 0.125 (12.5%)
    lossSetOffEligibility: LossSetOffEligibility; // e.g. NO_SET_OFF for Crypto
    allowedLossSetOffCategories: string[];// e.g. ['STCG', 'LTCG'] for Equity STCL; ['LTCG'] for LTCL
}

export interface TaxPolicy {
    policyId: string;                     // e.g. "IN_TAX_FY24_25_V1"
    jurisdiction: string;                 // e.g. "IN"
    effectiveFrom: string;                // ISO-8601 string
    effectiveTo: string | null;
    annualLtcgExemption: number;          // e.g. 125000 (₹1.25L annual exemption for Indian Equity)
    exemptionConsumedPrior: number;       // Annual exemption consumed in prior tax events
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
    marginalTaxPerProceeds: number;       // Pre-exemption marginal tax rate per rupee of proceeds
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
    exemptionApplied: number;             // Allocated from shared annual LTCG exemption
    netTaxLiability: number;              // Tax liability post-exemption and set-off
    selectionTier: 'TIER_1_LOSS' | 'TIER_2_LTCG' | 'TIER_3_STCG';
    selectionReason: string;
}
```

---

### 2.4 Tax-Optimized Rebalancing Summary (`TaxOptimizedRebalancingSummary`)
```typescript
export interface TaxOptimizedRebalancingSummary {
    policyId: string;
    taxPolicyId: string;
    asOfDate: string;                     // ISO-8601 deterministic timestamp
    portfolioId: string | null;
    sourceRebalancingSummary: Object;     // Intact C.6.2 output
    
    // Rounding-Aware Notional Reconciliation (Hardening)
    requestedSellNotional: number;        // From C.6.2 executableSellNotional
    selectedSellNotional: number;         // Total soldProceeds across selected lots
    unfilledSellNotional: number;         // max(0, requestedSellNotional - selectedSellNotional)
    sellNotionalResidual: number;         // |requestedSellNotional - selectedSellNotional|
    
    // Tax Metrics & Optimization Delta
    naiveEstimatedTaxLiability: number;   // Tax liability under naive FIFO/proportional sells
    optimizedEstimatedTaxLiability: number;// Tax liability under optimizer
    estimatedTaxSavings: number;          // naiveEstimatedTaxLiability - optimizedEstimatedTaxLiability
    taxDragPercentage: number;            // (optimizedEstimatedTaxLiability / selectedSellNotional) * 100
    
    // Authoritative Shared Loss Set-Off Metrics (Blocker C6.3-08)
    harvestedLosses: number;              // Total gross unrealized losses realized
    effectiveOffsettableLosses: number;   // Losses eligible for set-off under TaxPolicy
    nonOffsettableLosses: number;         // Ineligible losses (e.g. Crypto)
    taxBenefitFromLosses: number;         // Actual tax reduction from offsettable losses
    
    // Authoritative Shared LTCG Exemption Ledger (Blocker C6.3-07)
    annualLtcgExemption: number;
    exemptionConsumedPrior: number;
    exemptionConsumedCurrent: number;     // Total exemption allocated to selected lots
    remainingExemptionAfterSale: number;  // max(0, annualLtcgExemption - prior - current)
    
    // Detailed Lot Audit
    selectedTaxLots: SelectedTaxLot[];
    
    // Feasibility & Warnings
    optimizationStatus: 'OPTIMAL' | 'PARTIAL_FILL' | 'ZERO_SELLS_REQUIRED' | 'PRICE_REFRESH_REQUIRED';
    optimizationWarnings: string[];
}
```

---

## 3. Mathematical Optimization & Shared Tax Ledger (Blockers C6.3-06, C6.3-07, C6.3-08)

### 3.1 Deterministic Tax-Minimization Lot Selector (Blocker C6.3-06)
For each overweight asset class $c$ requiring executable sell notional $S_c$:

1. **Lot Tiering & Ranking**:
   - **Tier 1 (Tax Loss Harvesting)**: Lots with $P_l < \text{buyPrice}_l$.
     - Sorted by loss rate DESC ($|P_l - \text{buyPrice}_l| / P_l$).
   - **Tier 2 (Long-Term Capital Gains)**: Lots with $\text{holdingPeriodDays}_l \ge \text{shortTermHoldingDays}$.
     - Sorted by unrealized gain rate ASC ($(P_l - \text{buyPrice}_l) / P_l$).
   - **Tier 3 (Short-Term Capital Gains)**: Lots with $\text{holdingPeriodDays}_l < \text{shortTermHoldingDays}$.
     - Sorted by unrealized gain rate ASC ($(P_l - \text{buyPrice}_l) / P_l$).
   - **Deterministic Tie-Breakers**: `symbol` ASC $\to$ `buyDate` ASC (FIFO) $\to$ `lotId` ASC.

2. **Discrete Quantity Allocation**:
   - For each ranked lot $l$, compute raw sold quantity: $q_{\text{raw}} = \min(\text{RemainingQty}_l, \text{RemainingSellNeed} / P_l)$.
   - Apply asset class rounding mode (`FLOOR_WHOLE` for Stocks/ETFs/Bonds; `DECIMAL_4` for MF/Crypto/Gold).
   - $\text{soldQuantity}_l = \text{round}(q_{\text{raw}})$.

---

### 3.2 Authoritative Shared LTCG Exemption Allocator (Blocker C6.3-07)
The annual LTCG exemption is evaluated as a **shared portfolio-level resource**:
$$\text{remainingAnnualExemption} = \max(0, \text{annualLtcgExemption} - \text{exemptionConsumedPrior})$$
$$\text{totalGrossLtcg} = \sum_{l \in \text{SelectedLots}, \text{taxCategory} = \text{'LTCG'}, \text{eligible}} \max(0, \text{RealizedGain}_l)$$
$$\text{exemptionConsumedCurrent} = \min(\text{remainingAnnualExemption}, \text{totalGrossLtcg})$$
$$\text{remainingExemptionAfterSale} = \text{remainingAnnualExemption} - \text{exemptionConsumedCurrent}$$

**Exemption Allocation Invariants**:
$$\sum_{l} \text{exemptionApplied}_l = \text{exemptionConsumedCurrent} \le \text{remainingAnnualExemption}$$
$$0 \le \text{exemptionApplied}_l \le \max(0, \text{RealizedGain}_l)$$

---

### 3.3 Authoritative Shared Loss Set-Off Allocator (Blocker C6.3-08)
Loss set-off is evaluated collectively across all selected lots according to statutory category boundaries:
1. **Gross Aggregation**:
   - $\text{GrossSTCL} = \sum_{\text{lots}} |\min(0, \text{RealizedGain}_l)| \text{ for STCG lots with } \text{SET\_OFF\_ELIGIBLE}$
   - $\text{GrossLTCL} = \sum_{\text{lots}} |\min(0, \text{RealizedGain}_l)| \text{ for LTCG lots with } \text{SET\_OFF\_ELIGIBLE}$
   - $\text{GrossSTCG} = \sum_{\text{lots}} \max(0, \text{RealizedGain}_l) \text{ for STCG lots}$
   - $\text{GrossLTCG} = \sum_{\text{lots}} \max(0, \text{RealizedGain}_l) \text{ for LTCG lots}$
   - $\text{nonOffsettableLosses} = \sum_{\text{lots}} |\min(0, \text{RealizedGain}_l)| \text{ for lots with } \text{NO\_SET\_OFF (e.g. Crypto)}$
2. **Statutory Loss Allocation**:
   - $\text{STCL\_to\_STCG} = \min(\text{GrossSTCL}, \text{GrossSTCG})$
   - $\text{STCL\_rem} = \text{GrossSTCL} - \text{STCL\_to\_STCG}$
   - $\text{STCL\_to\_LTCG} = \min(\text{STCL\_rem}, \text{GrossLTCG})$
   - $\text{LTCG\_rem} = \text{GrossLTCG} - \text{STCL\_to\_LTCG}$
   - $\text{LTCL\_to\_LTCG} = \min(\text{GrossLTCL}, \text{LTCG\_rem})$
3. **Net Taxable Gains**:
   - $\text{NetTaxableSTCG} = \max(0, \text{GrossSTCG} - \text{STCL\_to\_STCG})$
   - $\text{NetEligibleLTCG} = \max(0, \text{GrossLTCG} - \text{STCL\_to\_LTCG} - \text{LTCL\_to\_LTCG})$
   - $\text{NetTaxableLTCG} = \max(0, \text{NetEligibleLTCG} - \text{exemptionConsumedCurrent})$
4. **Authoritative Total Tax**:
   $$\text{optimizedEstimatedTaxLiability} = (\text{NetTaxableSTCG} \times \text{stcgRate}) + (\text{NetTaxableLTCG} \times \text{ltcgRate}) + (\text{GrossCryptoGains} \times 0.30)$$

---

### 3.4 Rounding-Aware Reconciliation Invariant
$$\text{selectedSellNotional} + \text{unfilledSellNotional} \approx \text{requestedSellNotional}$$
- `optimizationStatus`:
  - `'OPTIMAL'`: `unfilledSellNotional == 0` (or `sellNotionalResidual <= maxHoldingPrice` due to discrete whole-unit floor rounding).
  - `'PARTIAL_FILL'`: `unfilledSellNotional > 0` because total available holdings in that asset class are strictly less than `requestedSellNotional`.
  - `'ZERO_SELLS_REQUIRED'`: `requestedSellNotional == 0`.

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

## 5. Stage C.6.3 34-Point Acceptance Test Plan (`tests/test_c63.mjs`)

The acceptance suite covers **34 explicit behavioral scenarios**:

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
10. Marginal tax efficiency ordering across multiple lots with different purchase prices.
11. Deterministic tie-breaker (`symbol` ASC, `buyDate` ASC, `lotId` ASC).
12. Rounding-aware sell-notional reconciliation ($\text{selectedSellNotional} \approx \text{requestedSellNotional}$).
13. Unfilled sell-notional detection when holdings are insufficient (`PARTIAL_FILL`).
14. Partial lot consumption residual tracking ($\text{remainingQuantityAfterSale}$).

### Group 3: Shared LTCG Exemption & Loss Set-Off Allocators (Tests 15–22)
15. Versioned `TaxPolicy` consumption (custom rates applied).
16. Indian FY24-25 default policy rules (STCG 20%, LTCG 12.5%).
17. Shared annual LTCG ₹1.25L exemption allocation across multiple competing LTCG lots.
18. Prior consumed exemption tracking ($\text{remainingAnnualExemption} = \text{annualExemption} - \text{consumedPrior}$).
19. Multi-lot STCL set-off allocation (STCL offsets STCG first, then LTCG).
20. LTCL set-off restriction (LTCL offsets LTCG only, never STCG).
21. Crypto `NO_SET_OFF` rule (Crypto 30% tax on gains, crypto losses cannot offset gains).
22. Listed Bond holding period (1095 days) and rate application.

### Group 4: Tax Metrics & Savings (Tests 23–27)
23. Naive vs Optimized tax liability comparison and `estimatedTaxSavings`.
24. `taxDragPercentage` exact computation.
25. `taxBenefitFromLosses` computation for eligible loss harvesting.
26. Pure fresh-cash rebalance ($C \ge C_{\text{pure\_cash\_min}}$) producing ₹0 tax.
27. In-band balanced portfolio producing ₹0 tax (`ZERO_SELLS_REQUIRED`).

### Group 5: Scoping, Rounding & Invariants (Tests 28–34)
28. Multi-portfolio tax lot isolation (Portfolio A lots never mixed with Portfolio B).
29. Global universe lot optimization (`portfolioId: null`).
30. Read-only adapter invariant (0 storage/MoneyFlow mutations).
31. Deterministic repeatability across multiple executions with identical `asOfDate`.
32. Whole-unit floor rounding with non-zero sell-notional residual safety.
33. Partial fill feasibility warning emission.
34. Full prior system regression matrix $\to$ **231/231 Total System Tests Passing**.

---

## 6. Gate Approval Confirmation

All blockers and hardening requirements (`C6.3-01` through `C6.3-08`) are mathematically formulated and locked in this plan.  
We respectfully request the **Stage C.6.3 Architecture Gate Approval & Implementation Authorization**.
