# Stage C.6.3 Architecture Plan
## Tax-Efficient Rebalancing Optimizer

**Status**: SUBMITTED FOR ARCHITECTURE GATE APPROVAL  
**Certified Baseline Commit**: [`24e2cea`](https://github.com/Nreddy2020/finapp-mobile/commit/24e2cea)  
**Execution Branch**: `fintech-using-chatgpt`  
**Author**: Lead Architecture & Implementation Agent  

---

## 1. Executive Summary & Architectural Positioning

**Stage C.6.3** builds the **Tax-Efficient Rebalancing Optimizer** on top of the certified **Stage C.6.2 Drift & Rebalancing Delta Calculator** and the certified **Phase C.4 / C.5 foundation**.

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

Stage C.6.3 specifically:
1. Consumes certified **Stage C.6.2** rebalancing recommendations without reimplementing drift, cash scaling, or rounding mathematics.
2. Derives active, unsold **Open FIFO Tax Lots** via a pure read-only adapter (`services/openTaxLotAdapter.js`) over confirmed buy/sell investment events.
3. Consumes a versioned **TaxPolicy** model (e.g. Indian Equity STCG 20% / LTCG 12.5%, Debt STCG slab / LTCG, etc.).
4. Implements **Multi-Tier Tax-Loss & Capital Gains Optimization**:
   $$\text{Priority}: \text{Tier 1 (Unrealized Losses / Tax Harvesting)} \longrightarrow \text{Tier 2 (LTCG)} \longrightarrow \text{Tier 3 (STCG Last)}$$
   Deterministic tie-breaker: `symbol` ascending (A $\to$ Z), then `buyDate` ascending (FIFO).
5. Computes **Estimated Tax Liability**, **Tax Drag Percent**, and **Tax Savings vs Naive/Proportional Sells**.
6. Hardens **`C6.2-H01`** (strict deterministic `asOfDate` validation).
7. Strictly preserves **read-only decision support** (Zero state/ledger/holding mutations).

---

## 2. Formal Data Contracts & DTOs

### 2.1 Versioned Tax Policy Model (`TaxPolicy`) (Blocker C6-05)
```typescript
interface AssetTaxRule {
    shortTermHoldingDays: number;  // e.g., 365 days for Equity/MF, 1095 days for Debt/Gold
    shortTermRate: number;         // e.g., 0.20 (20%)
    longTermRate: number;          // e.g., 0.125 (12.5%)
}

interface TaxPolicy {
    policyId: string;              // e.g. "IN_TAX_FY24_25_V1"
    jurisdiction: string;          // e.g. "IN"
    effectiveFrom: string;         // ISO-8601 string
    effectiveTo: string | null;
    rules: Record<string, AssetTaxRule>;
}
```

**Default Indian Tax Policy (FY2024-25 / Budget 2024)**:
| Asset Class | STCG Threshold | STCG Rate | LTCG Rate | Exemption Notes |
| :--- | :---: | :---: | :---: | :--- |
| `STOCK` | 365 days | 20.0% | 12.5% | ₹1.25L annual LTCG exemption tracked |
| `ETF` | 365 days | 20.0% | 12.5% | Standard equity ETF rules |
| `MUTUAL_FUND` | 365 days | 20.0% | 12.5% | Equity MF rules |
| `GOLD` | 730 days | 20.0% | 12.5% | Physical/digital gold rules |
| `CRYPTO` | 0 days | 30.0% | 30.0% | Flat 30% without loss setoff |
| `BOND` | 1095 days | Slab / 20.0% | 12.5% | Listed bond rules |
| `REAL_ESTATE` | 730 days | Slab / 20.0% | 12.5% | Property rules |
| `OTHER` | 1095 days | 20.0% | 20.0% | General fallback |

---

### 2.2 Open Tax Lot Contract (`OpenTaxLot`) (Blockers C6-06 & C6-11)
```typescript
interface OpenTaxLot {
    lotId: string;                 // e.g. "lot_evt123_0"
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
    unrealizedGain: number;        // currentMarketValue - remainingCostBasis
    holdingPeriodDays: number;
    taxCategory: 'LOSS' | 'LTCG' | 'STCG';
    applicableTaxRate: number;
    estimatedTaxImpact: number;    // max(0, unrealizedGain) * applicableTaxRate
}
```

---

### 2.3 Tax-Optimized Rebalancing Summary (`TaxOptimizedRebalancingSummary`)
```typescript
interface TaxOptimizedRebalancingSummary extends RebalancingSummary {
    taxPolicyId: string;
    totalEstimatedTaxLiability: number;      // Optimized tax liability
    naiveEstimatedTaxLiability: number;      // Tax liability under naive/proportional sell
    estimatedTaxSavings: number;             // naiveEstimatedTaxLiability - totalEstimatedTaxLiability
    taxDragPercentage: number;               // (totalEstimatedTaxLiability / executableSellNotional) * 100
    harvestedLosses: number;                 // Total realized losses harvested
    selectedTaxLots: Array<{
        lotId: string;
        symbol: string;
        assetType: string;
        buyDate: string;
        taxCategory: 'LOSS' | 'LTCG' | 'STCG';
        soldQuantity: number;
        soldCostBasis: number;
        soldProceeds: number;
        realizedGain: number;
        estimatedTax: number;
    }>;
}
```

---

## 3. Mathematical Optimization Formulation

### 3.1 Objective Function
For each overweight asset class $c$ requiring executable sell notional $S_c = \text{executableSellNotional}(c)$:
$$\min_{\mathbf{q}} \sum_{l \in \text{OpenLots}(c)} \text{applicableTaxRate}(l) \times \max\left(0, q_l \cdot (P_l - \text{buyPrice}_l)\right)$$
$$\text{subject to: } \sum_{l \in \text{OpenLots}(c)} q_l \cdot P_l = S_c, \quad 0 \le q_l \le \text{remainingQuantity}_l$$

### 3.2 Deterministic Greedy Lot Priority Algorithm
1. **Tier 1 (Tax Loss Harvesting)**: Lots with $P_l < \text{buyPrice}_l$ ($\text{UnrealizedGain}_l < 0$).
   - Yields $0$ tax liability and generates capital loss offsets.
   - Sells largest loss rate first, tie-breaker: `symbol` ASC, `buyDate` ASC.
2. **Tier 2 (Long-Term Capital Gains)**: Lots with $\text{holdingPeriodDays}_l \ge \text{shortTermHoldingDays}$ ($\text{taxCategory} = \text{'LTCG'}$).
   - Taxed at lower rate (12.5%).
   - Sells lowest unrealized gain percentage first, tie-breaker: `symbol` ASC, `buyDate` ASC.
3. **Tier 3 (Short-Term Capital Gains)**: Lots with $\text{holdingPeriodDays}_l < \text{shortTermHoldingDays}$ ($\text{taxCategory} = \text{'STCG'}$).
   - Taxed at higher rate (20.0% / 30.0%).
   - Sold strictly last.

---

## 4. Module Interface & Architecture

### 4.1 `services/openTaxLotAdapter.js`
- Pure read-only adapter.
- Reads `loadInvestmentEvents()` and `loadHoldings()`.
- Deducts confirmed historical sells chronologically to derive remaining active open lots.
- Evaluates holding period relative to deterministic `asOfDate`.
- Zero engine or storage mutations.

### 4.2 `services/taxOptimizedRebalancingService.js`
```typescript
export const TaxOptimizedRebalancingService = {
    /**
     * Compute tax-optimized rebalancing recommendations.
     * Consumes Stage C.6.2 RebalancingEngine recommendations.
     * 
     * @param {Object} options
     * @param {string|null} [options.portfolioId=null]
     * @param {Object|string} [options.policy=null]
     * @param {string|Date} options.asOfDate - Mandatory deterministic ISO-8601 date
     * @param {number} [options.availableLiquidity=0]
     * @param {Object|string} [options.taxPolicy=null]
     * @returns {Promise<TaxOptimizedRebalancingSummary>}
     */
    async calculateTaxOptimizedRebalancing(options): Promise<TaxOptimizedRebalancingSummary>;
};
```

---

## 5. Stage C.6.3 20-Point Acceptance Test Plan (`tests/test_c63.mjs`)

1. **Open Tax Lot Derivation**: Correctly derives open lots from confirmed BUY and partial SELL events.
2. **Deterministic `asOfDate` Holding Period**: Calculates holding days relative to `asOfDate` without `new Date()` defaults (Hardening `C6.2-H01`).
3. **Tier 1 Loss Harvesting Priority**: Selects loss-making open lots first (0 tax liability).
4. **Tier 2 LTCG Priority over STCG**: Selects qualifying LTCG lots before STCG lots.
5. **Tier 3 STCG Sold Last**: Short-term gain lots sold only when loss and LTCG lots are exhausted.
6. **Alphabetical & FIFO Tie-Breaking**: Deterministic `symbol` ASC, then `buyDate` ASC.
7. **Versioned TaxPolicy Consumption**: Applies custom tax rules without hardcoded percentages.
8. **Indian Tax FY24-25 Default Rules**: Verified STCG 20% and LTCG 12.5% for Equity.
9. **Crypto 30% Flat Tax Rule**: Applies 30% tax rate to crypto gains.
10. **Debt & Bond Tax Rule Application**: Applies bond holding periods and tax rates.
11. **Tax Savings Calculation**: Reconciles `estimatedTaxSavings = naiveEstimatedTaxLiability - totalEstimatedTaxLiability`.
12. **Tax Drag Percentage**: Computes exact `taxDragPercentage = (tax / sellNotional) * 100`.
13. **Zero Tax on Pure Cash Rebalance**: Pure fresh-cash rebalance ($C \ge C_{\text{pure\_cash\_min}}$) produces ₹0 tax liability.
14. **Zero Tax on In-Band Balanced Portfolio**: Balanced portfolio produces ₹0 tax liability.
15. **Multi-Portfolio Lot Isolation**: Portfolio A lots never mixed with Portfolio B lots.
16. **Global Universe Lot Optimization**: Scoped to all portfolios when `portfolioId: null`.
17. **Partial Lot Consumption**: Correctly calculates residual remaining quantity when a lot is partially sold.
18. **Read-Only Adapter Invariant**: Verified 0 mutations to storage, investment events, or holdings.
19. **C.6.2 Recommendation Preservation**: 100% preservation of C.6.2 drift, scaling, and rounding outputs.
20. **Full Prior System Regression Invariant Matrix**: Total system regression passing $\to$ **217/217 Tests Passing**.

---

## 6. Gate Approval Request

This document is submitted for formal **Stage C.6.3 Architecture Gate Review**.  
Implementation is **LOCKED 🔒** until approved.
