# Phase C.6 Master Architecture Plan
## Intelligent Portfolio Rebalancing & Tax-Aware Decision Engine

**Status**: PROPOSED / ARCHITECTURE GATE REVIEW  
**Baseline Commit**: [`1dc480f`](https://github.com/Nreddy2020/finapp-mobile/commit/1dc480f)  
**Execution Branch**: `fintech-using-chatgpt`  
**Author**: Lead Architecture & Implementation Agent  

---

## 1. Executive Summary & Objective

**Phase C.6** transforms FinLife Investing from **passive analytics and visualization (Phases C.4 & C.5)** into an **actionable, intelligent, tax-aware decision-support engine**.

### The Strategic Paradigm
$$\text{Observe (C.4)} \longrightarrow \text{Understand (C.5)} \longrightarrow \text{Decide (C.6)} \longrightarrow \text{Act (Future C.7+)}$$

Phase C.6 enables investors to:
1. Define and manage **Target Asset Allocation Policies** and choose from battle-tested **Model Portfolios** across FinLife's certified 8-asset taxonomy.
2. Measure portfolio **Drift** in real-time against target weights with customizable tolerance bands ($\pm 1\%$ to $\pm 10\%$).
3. Calculate mathematically precise **Rebalancing Trade Deltas** (exact quantities and values).
4. Optimize rebalancing with a **Tax-Efficient Engine** that leverages FIFO tax lots to minimize Short-Term Capital Gains (STCG) and prioritize fresh cash deployment.
5. Review an interactive **Rebalancing & Order Preview** without executing unwanted state or financial mutations.

---

## 2. Certified Taxonomy & Liquidity Contract

To protect the certified **Phase C.4 & C.5** foundations:
- **Canonical Asset Classes (Certified C.4.2)**:
  `STOCK`, `MUTUAL_FUND`, `ETF`, `GOLD`, `CRYPTO`, `BOND`, `REAL_ESTATE`, `OTHER`
- **Liquidity Principle (Rule B)**:
  Target allocation percentages apply strictly across the 8 canonical asset classes ($\sum w_i^{\text{target}} = 100.00\%$). Available Cash/Bank Balances are treated as an **External Liquidity Pool** for the fresh-cash-first rebalancing optimizer, never contaminating the core asset class taxonomy.

---

## 3. Phase C.6 Stage Breakdown & Roadmap

```
PHASE C.6 — INTELLIGENT REBALANCING & DECISION ENGINE
├── Stage C.6.1: Target Allocation Policy Engine
│   ├── Target allocation storage & validation (Sum == 100%)
│   ├── Pre-configured Model Portfolios (Aggressive, Growth, Balanced, Conservative)
│   ├── Portfolio-scoped and Global target allocation mapping
│   └── Configurable drift tolerance threshold (default: ±5%)
│
├── Stage C.6.2: Drift & Rebalancing Delta Calculator
│   ├── Current vs Target weight comparison
│   ├── Real-time Drift calculation (Drift = CurrentWeight - TargetWeight)
│   ├── Rebalancing direction: OVERWEIGHT (Sell), UNDERWEIGHT (Buy), IN_BAND (Hold)
│   ├── Target value calculation per asset class: TargetValue = TotalMarketValue * TargetWeight
│   └── Specific holding trade delta calculation (Quantity & Notional Value)
│
├── Stage C.6.3: Tax-Efficient Rebalancing Optimizer
│   ├── Fresh-Cash-First Strategy: Rebalance via buys using liquid cash to avoid taxable sells
│   ├── FIFO Lot Matching & Unrealized STCG/LTCG inspection
│   ├── Sell Optimization: Prioritize loss lots (Tax Harvesting) -> LTCG lots -> STCG lots (last)
│   ├── Estimated Tax Liability Impact: STCG Rate (20%) / LTCG Rate (12.5%) calculation
│   └── Net Economic Realization vs Tax Drag Analysis
│
└── Stage C.6.4: Rebalancing Visualizer & Order Preview UI
    ├── Target vs Current Allocation Comparison (Dual-bar & Drift meters)
    ├── Rebalancing Action Recommendation Cards (Buy/Sell/Hold badges)
    ├── Estimated Tax Drag & Net Proceeds banner
    ├── Read-Only Order Preview Modal (Review trades before manual execution)
    └── Semantic Theme Tokens (`COLORS.*`) & Responsive Layout
```

---

## 4. Mathematical Contracts & Formulation

### 4.1 Target Allocation Validation
For any target allocation policy $P = \{ (c_i, w_i^{\text{target}}) \}_{i=1}^n$:
$$\sum_{i=1}^n w_i^{\text{target}} = 100.00\% \quad (\text{with tolerance } |100 - \sum w_i| \le 0.01\%)$$
$$0.00\% \le w_i^{\text{target}} \le 100.00\% \quad \forall i$$

### 4.2 Current Valuation & Weight Calculation
Using certified C.4.1 / C.4.2 portfolio summary:
$$V_{\text{total}} = \sum_{j} \text{HoldingMarketValue}_j$$
$$V_{\text{class}}(c) = \sum_{j \in c} \text{HoldingMarketValue}_j$$
$$w_{\text{current}}(c) = \begin{cases} \frac{V_{\text{class}}(c)}{V_{\text{total}}} \times 100\%, & V_{\text{total}} > 0 \\ 0\%, & V_{\text{total}} = 0 \end{cases}$$

### 4.3 Drift Calculation & Action Classification
$$\text{Drift}(c) = w_{\text{current}}(c) - w_{\text{target}}(c)$$
$$\text{Status}(c) = \begin{cases} 
\text{OVERWEIGHT (Sell Trigger)}, & \text{Drift}(c) > +\theta_{\text{tolerance}} \\
\text{UNDERWEIGHT (Buy Trigger)}, & \text{Drift}(c) < -\theta_{\text{tolerance}} \\
\text{BALANCED (In Band)}, & |\text{Drift}(c)| \le \theta_{\text{tolerance}}
\end{cases}$$

### 4.4 Ideal Rebalancing Notional Delta
$$\Delta V(c) = (w_{\text{target}}(c) \times V_{\text{total}}) - V_{\text{class}}(c) = -\text{Drift}(c) \times V_{\text{total}}$$
- If $\Delta V(c) > 0 \implies \text{Required Buy Amount} = \Delta V(c)$
- If $\Delta V(c) < 0 \implies \text{Required Sell Amount} = |\Delta V(c)|$

### 4.5 Fresh-Cash-First Inflow Optimization
Given external available liquidity $C_{\text{fresh}}$:
$$\text{Total Deficit} = \sum_{c: \Delta V(c) > 0} \Delta V(c)$$
If $C_{\text{fresh}} \ge \text{Total Deficit}$:
$$\text{Buy Allocation}(c) = \Delta V(c), \quad \text{Taxable Sells Required} = 0$$
If $0 < C_{\text{fresh}} < \text{Total Deficit}$:
$$\text{Cash Contribution}(c) = C_{\text{fresh}} \times \frac{\Delta V(c)}{\text{Total Deficit}}$$
$$\text{Remaining Sell Requirement} = \text{Total Deficit} - C_{\text{fresh}}$$

### 4.6 Tax-Efficient Sell Order Prioritization
When sells are unavoidable, individual holdings and tax lots within the overweight asset class are prioritized by:
1. **Unrealized Losses** (Capital Loss Harvesting: Realized Gain $< 0$).
2. **Long-Term Gains (LTCG)**: Holding period $> 365$ days (Tax rate: $12.5\%$).
3. **Short-Term Gains (STCG)**: Holding period $\le 365$ days (Tax rate: $20.0\%$, sold last).

---

## 5. Standard Model Portfolios

| Model Name | Equity (Stock) | Mutual Funds | ETF | Gold | Crypto | Bonds | Real Estate | Target Investor |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Aggressive Growth** | 50% | 25% | 15% | 5% | 5% | 0% | 0% | High risk tolerance, long horizon (>7y) |
| **Growth / Moderate** | 40% | 30% | 15% | 10% | 0% | 5% | 0% | Balanced growth with capital preservation |
| **Conservative Wealth**| 20% | 30% | 15% | 15% | 0% | 20% | 0% | Low risk tolerance, income & stability |
| **All-Weather Classic**| 30% | 20% | 15% | 15% | 0% | 20% | 0% | Low volatility across macroeconomic cycles |

---

## 6. Architectural Invariants & Security Rules

1. **Read-Only / Decision Support Invariant**:
   Phase C.6 components and calculation engines MUST NOT create, delete, or modify any database holdings, transactions, or event records. All outputs are strictly ephemeral previews and recommendations.
2. **Frozen Core Financial Engines**:
   - `services/investingAnalyticsEngine.js` 🔒 remains 100% frozen.
   - `services/storage.js` 🔒 remains 100% frozen.
   - `services/moneyFlowEngine.js` 🔒 remains 100% frozen.
   - `services/investingSchemas.js` 🔒 remains 100% frozen.
3. **New Module Encapsulation**:
   - `services/rebalancingEngine.js` will encapsulate all C.6 mathematical and tax optimization logic.
   - `services/targetAllocationService.js` will encapsulate policy management.
4. **Deterministic Math & Numerical Stability**:
   - Zero division guarded ($V_{\text{total}} = 0$ safely returns 0 drift and in-band status).
   - Quantity rounding conforms to standard fractional holding rules.
5. **Semantic Theme Token Compliance**:
   - Zero hardcoded visual hex/RGBA literals. All colors consumed from `COLORS.*`.

---

## 7. Phase C.6 Verification & Acceptance Strategy

Each stage in Phase C.6 will introduce an automated acceptance test suite with strict `process.exit(1)` failure enforcement:
- **`Stage C.6.1`**: 20-Point Target Allocation Policy & Validation Suite (`test_c61.mjs`)
- **`Stage C.6.2`**: 20-Point Drift & Rebalancing Delta Suite (`test_c62.mjs`)
- **`Stage C.6.3`**: 20-Point Tax-Efficient Optimizer & Cash Deployment Suite (`test_c63.mjs`)
- **`Stage C.6.4`**: 20-Point Rebalancing Visualizer & Order Preview Suite (`test_c64.mjs`)
- **Total Cumulative Regression Matrix**: **237/237 PASS** upon Phase C.6 completion (157 baseline + 80 C.6 tests).

---

## 8. Gate Approval Request

This document is submitted for formal **Phase C.6 Architecture Gate Review**.  
No implementation code will be written until the Architecture Gate is officially **🟢 APPROVED**.
