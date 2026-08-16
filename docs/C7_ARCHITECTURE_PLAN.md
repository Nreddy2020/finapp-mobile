# Phase C.7 Architecture Plan: Portfolio Intelligence, Risk Diagnostics & Stress-Testing Engine

**Phase**: C.7  
**Status**: ARCHITECTURE PLANNING (Zero-Code Gate Active 🔒)  
**Certified Baseline**: [`5fdfb36`](https://github.com/Nreddy2020/finapp-mobile/commit/5fdfb36)  
**Author**: Antigravity AI & System Architect  

---

## 1. Executive Summary & Problem Space

### 1.1 The Fundamental Problem
While Phases C.4–C.6 provide definitive financial truth (Valuation, WAC, XIRR, Statements) and actionable rebalancing optimization (Target Policies, Drift Calculation, Tax Optimization), they primarily answer retrospective and current-state questions:
- *What is my net worth and lifetime return?* (C.4 / C.5)
- *How far has my allocation drifted from my target model?* (C.6.1 / C.6.2)
- *How can I rebalance with minimal tax liability?* (C.6.3 / C.6.4)

They do not answer forward-looking risk and resilience questions:
- **"What could go wrong with my current portfolio?"**
- **"How much money could I lose in a severe market crash (2008 GFC, 2020 COVID shock, Crypto winter)?"**
- **"Where are my hidden concentration, correlation, and liquidity vulnerabilities?"**
- **"How resilient is my portfolio across varied economic regimes?"**
- **"What specific, diagnostic actions will improve my portfolio's health and downside protection?"**

### 1.2 Phase C.7 Mission
**Phase C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)** creates a read-only, institutional-grade analytical engine that quantifies portfolio risk, simulates severe macroeconomic shocks, diagnoses structural vulnerabilities, and synthesizes a holistic **Portfolio Health Score (0–100)** with auditable, plain-English explanations.

```
═══════════════════════════════════════════════════════════════════════════
                           PHASE C.7 INTELLIGENCE STACK
═══════════════════════════════════════════════════════════════════════════

                       ┌─────────────────────────┐
                       │   C.4 / C.6 CERTIFIED   │
                       │     FINANCIAL TRUTH     │
                       └────────────┬────────────┘
                                    │
                                    ▼
       ┌─────────────────────────────────────────────────────────┐
       │             C.7 RISK & DIAGNOSTICS ENGINES              │
       │                                                         │
       │  ┌────────────────────┐      ┌───────────────────────┐  │
       │  │ Concentration Risk │      │ Volatility & Drawdown │  │
       │  │ (Decomposed HHI)   │      │ (VaR / CVaR / MaxDD)  │  │
       │  └──────────┬─────────┘      └──────────┬────────────┘  │
       │             │                           │               │
       │  ┌──────────▼─────────┐      ┌──────────▼────────────┐  │
       │  │ Liquidity & Lockup │      │ Cross-Asset Exposure  │  │
       │  │ (Redemption Risk)  │      │ & Correlation Matrix  │  │
       │  └──────────┬─────────┘      └──────────┬────────────┘  │
       │             │                           │               │
       │             └─────────────┬─────────────┘               │
       │                           ▼                             │
       │              ┌───────────────────────────┐              │
       │              │  Macro Scenario & Stress  │              │
       │              │  Testing Engine (Shocks)  │              │
       │              └────────────┬──────────────┘              │
       └───────────────────────────┼─────────────────────────────┘
                                   │
                                   ▼
             ┌───────────────────────────────────────────┐
             │       COMPOSITE PORTFOLIO HEALTH SCORE    │
             │       (0–100 Multidimensional Rubric)     │
             │                     +                     │
             │        DIAGNOSTIC EXPLANATION ENGINE      │
             └───────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles & Invariants

1. **Strict Zero-Mutation Boundary (100% Read-Only)**:
   - C.7 never writes to `Holdings`, `InvestmentEvents`, `MoneyFlow`, or `Storage`.
   - All stress simulations and scenario shocks are completely ephemeral in-memory calculations.
2. **Pure Composition Over Certified C.4–C.6 Engines**:
   - C.7 consumes outputs from `InvestingAnalyticsEngine` (C.4), `TargetAllocationService` (C.6.1), `RebalancingEngine` (C.6.2), and `TaxOptimizedRebalancingService` (C.6.3).
   - Zero duplication or re-implementation of WAC, realized gain, FIFO lots, or tax rates.
3. **Deterministic Evaluation Context (`asOfDate`)**:
   - All historical analytics, volatility measures, drawdown series, and valuations evaluate strictly $\le \text{asOfDate}$.
   - Guarantees identical risk metrics regardless of runtime execution time.
4. **Canonical 8-Class Asset Taxonomy**:
   - Consistently evaluates risk across the 8 canonical classes: `STOCK`, `MUTUAL_FUND`, `ETF`, `GOLD`, `CRYPTO`, `BOND`, `REAL_ESTATE`, `OTHER`.
5. **No Trade Execution / No Order Routing**:
   - C.7 provides intelligence and diagnostics only. Zero broker integrations or execution triggers.

---

## 3. Comprehensive Risk Taxonomy & Mathematical Specifications

Phase C.7 measures risk across six core dimensions:

```
                      ┌─────────────────────────────────┐
                      │    C.7 PORTFOLIO RISK TAXONOMY  │
                      └────────────────┬────────────────┘
                                       │
     ┌──────────────┬──────────────────┼──────────────────┬──────────────┐
     │              │                  │                  │              │
     ▼              ▼                  ▼                  ▼              ▼
Concentration  Downside & VaR      Liquidity         Correlation     Scenario
  Risk           Risk               Risk              Risk            Stress
```

### 3.1 Concentration & Diversification Risk (Pillar 1)
- **Asset Class HHI**:
  $$\text{HHI}_{\text{class}} = \sum_{c=1}^{8} w_c^2 \times 10,000$$
- **Single-Holding Concentration ($Top_1, Top_3, Top_5$)**:
  $$\text{Top}_k = \sum_{i=1}^{k} w_{(i)} \quad \text{where } w_{(1)} \ge w_{(2)} \ge \dots \ge w_{(N)}$$
- **Effective Number of Constituents ($N_{\text{eff}}$)**:
  $$N_{\text{eff}} = \frac{1}{\sum_{i=1}^{N} w_i^2}$$
- **Concentration Risk Tiering**:
  - `BALANCED`: $\text{HHI} \le 1800 \land Top_1 \le 20\%$
  - `MODERATE`: $1800 < \text{HHI} \le 3000 \lor 20\% < Top_1 \le 35\%$
  - `HIGH`: $\text{HHI} > 3000 \lor Top_1 > 35\%$

### 3.2 Downside & Volatility Risk (Pillar 2)
- **Historical Peak-to-Trough Drawdown ($DD_t$)**:
  $$DD_t = \frac{V_t - \max_{\tau \le t} V_\tau}{\max_{\tau \le t} V_\tau}$$
  $$\text{MaxDD} = \min_{t} DD_t$$
- **Downside Deviation ($\sigma_d$)**:
  $$\sigma_d = \sqrt{\frac{1}{T} \sum_{t=1}^{T} \min(0, r_t - r_f)^2}$$
- **Parametric & Historical Value-at-Risk ($95\%$ and $99\%$ 1-Month $\text{VaR}$)**:
  $$\text{VaR}_{95} = V_{\text{portfolio}} \times \left( z_{0.95} \cdot \sigma_p - \mu_p \right)$$
- **Conditional Value-at-Risk / Expected Shortfall ($\text{CVaR}_{95}$)**:
  $$\text{CVaR}_{95} = \mathbb{E}[L \mid L > \text{VaR}_{95}]$$
- **Risk-Adjusted Return Metrics**:
  $$\text{Sharpe Ratio} = \frac{R_p - R_f}{\sigma_p}, \quad \text{Sortino Ratio} = \frac{R_p - R_f}{\sigma_d}$$

### 3.3 Liquidity & Lockup Risk (Pillar 3)
Measures the ability to convert portfolio assets to cash without severe haircut:
- **Instant Liquidity ($T+0$ to $T+1$)**: Cash, Overnight Debt, Liquid ETFs.
- **Short-Term Liquidity ($T+2$ to $T+3$)**: Listed Equities, Open-Ended Mutual Funds, Gold ETFs.
- **Illiquid / Locked ($T > 7$ or Exit Penalties)**: ELSS/Tax-Saving MFs (3-year lockup), Real Estate, Fixed Deposits with penalty, Vesting ESOPs.
- **Liquidity Coverage Ratio (LCR)**:
  $$\text{LCR} = \frac{\text{Liquid Assets } (T \le 3)}{\text{Total Portfolio Value}}$$

### 3.4 Correlation & Factor Exposure (Pillar 4)
- **Cross-Asset Correlation Matrix ($8 \times 8$)**:
  $$\rho_{ij} = \frac{\text{Cov}(r_i, r_j)}{\sigma_i \sigma_j}$$
- **Diversification Benefit Ratio ($DBR$)**:
  $$DBR = 1 - \frac{\sigma_p}{\sum_{i=1}^{N} w_i \sigma_i} \quad (0 \le DBR < 1)$$
  A higher $DBR$ indicates genuine non-correlated diversification benefit.

### 3.5 Macro Scenario & Stress-Testing Engine (Pillar 5)
Simulates instantaneous shocks to portfolio value under standardized historical and hypothetical stress scenarios:

| Scenario Name | Category | Asset Shocks Applied | Description |
| :--- | :--- | :--- | :--- |
| **2008 Global Financial Crisis** | Historical | Stock: -55%, MF: -45%, Crypto: -70%, Gold: +25%, Bond: +8% | Severe global credit freeze & equity collapse |
| **2020 COVID Market Crash** | Historical | Stock: -38%, MF: -32%, Crypto: -50%, Gold: +15%, Bond: +4% | Rapid pandemic lockdown liquidity shock |
| **Interest Rate Spike (+200 bps)** | Macro | Bond: -12%, Real Estate: -8%, Stock: -15%, Gold: -5% | Aggressive monetary tightening & bond sell-off |
| **High Inflation Shock** | Macro | Gold: +30%, Real Estate: +15%, Stock: -10%, Bond: -18% | Stagflation regime with hard asset outperformance |
| **Crypto Winter / Tech Meltdown** | Sector | Crypto: -80%, Stock: -25%, Gold: +5%, Bond: +2% | Speculative risk-off asset liquidation |
| **Custom Scenario** | Interactive | User-defined percentage shocks across each asset class | Interactive what-if stress lab |

For any scenario $S$ with vector of asset class shocks $\vec{\Delta s} = [\Delta s_{\text{STOCK}}, \dots, \Delta s_{\text{OTHER}}]$:
$$\Delta V_S = \sum_{c=1}^{8} V_c \cdot \Delta s_c$$
$$\text{Projected Value}_S = V_{\text{portfolio}} + \Delta V_S$$
$$\text{Percentage Impact}_S = \frac{\Delta V_S}{V_{\text{portfolio}}} \times 100$$

---

## 4. Composite Portfolio Health Score Methodology (0–100)

The **Portfolio Health Score** aggregates the five risk pillars into a single intuitive, auditable metric $H \in [0, 100]$:

$$H = \sum_{k=1}^{5} \omega_k \cdot S_k$$

| Pillar | Metric / Focus | Weight ($\omega_k$) | Sub-Score Calculation ($S_k \in [0, 100]$) |
| :--- | :--- | :---: | :--- |
| **1. Diversification & Concentration** | HHI, $Top_1$, $N_{\text{eff}}$ | **25%** | $100 - \min(100, (\text{HHI} / 5000) \cdot 100)$ |
| **2. Allocation Alignment** | Drift from Target Policy | **20%** | $100 - \min(100, (\text{Drift}_{\text{pp}} / 25) \cdot 100)$ |
| **3. Downside Protection** | Max Drawdown, Volatility | **20%** | Scored on benchmark-relative downside deviation |
| **4. Liquidity Health** | Liquid vs Locked Ratio | **15%** | Normalized ratio of $T \le 3$ liquid holdings vs total |
| **5. Stress Resilience** | Average Loss across 4 Historical Crises | **20%** | $100 - \min(100, (|\Delta V_{\text{avg}}| / 50) \cdot 100)$ |

### Health Score Tiers:
- **`EXCELLENT` ($85 - 100$)**: Highly diversified, resilient under stress, disciplined drift, strong liquidity.
- **`GOOD` ($70 - 84$)**: Well-constructed portfolio with minor concentration or moderate drift.
- **`FAIR` ($50 - 69$)**: Notable vulnerabilities (e.g. single-asset overweight $> 35\%$, weak stress resilience).
- **`NEEDS_ATTENTION` ($< 50$)**: Severe concentration risk, high drawdown vulnerability, or extreme allocation drift.

---

## 5. Phase C.7 Staging Roadmap

To maintain rigorous certification discipline, Phase C.7 is structured into 8 modular stages:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PHASE C.7 STAGING ROADMAP                         │
├───────────┬───────────────────────────────────────────┬─────────────────────┤
│ Stage     │ Name / Purpose                            │ Key Artifacts       │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.1** │ Portfolio Risk Foundation & Risk Taxonomy │ riskTaxonomy.js     │
│           │ (Taxonomy, Schemas, Risk Data Contracts)  │ test_c71.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.2** │ Concentration & Diversification Diagnostics│ concentrationEngine.js│
│           │ (HHI Decomp, Top-k, Neff, Entropy)        │ test_c72.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.3** │ Volatility, Drawdown & Downside Risk      │ drawdownEngine.js   │
│           │ (MaxDD, Downside Deviation, VaR, CVaR)    │ test_c73.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.4** │ Correlation & Cross-Asset Risk            │ correlationEngine.js│
│           │ (8x8 Matrix, Diversification Ratio DBR)   │ test_c74.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.5** │ Liquidity & Cash-Flow Stress              │ liquidityEngine.js  │
│           │ (T+0..T>3 Tiers, LCR, Redemption Buffer)  │ test_c75.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.6** │ Scenario & Stress-Test Engine             │ stressTestEngine.js │
│           │ (GFC, COVID, Rates, Inflation, Custom Lab)│ test_c76.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.7** │ Portfolio Health Score & Risk Explanation │ portfolioHealth.js  │
│           │ (0–100 Score, 5 Pillars, Plain English)   │ test_c77.mjs        │
├───────────┼───────────────────────────────────────────┼─────────────────────┤
│ **C.7.8** │ Risk Intelligence Dashboard & Stress UI   │ RiskRadarCard.js    │
│           │ (Health Meter, Radar, Stress Test Modal)  │ test_c78.mjs        │
└───────────┴───────────────────────────────────────────┴─────────────────────┘
```

---

## 6. Integration Contract with Certified C.4–C.6 Baseline

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      CERTIFIED ENGINE CONSUMPTION MAP                   │
├───────────────────────────────┬─────────────────────────────────────────┤
│ Certified Service             │ How C.7 Consumes It                     │
├───────────────────────────────┼─────────────────────────────────────────┤
│ `investingAnalyticsEngine.js` │ Source of Portfolio Summary, WAC,       │
│ (C.4 🔒)                      │ Allocation Breakdown, Market Values     │
├───────────────────────────────┼─────────────────────────────────────────┤
│ `targetAllocationService.js`  │ Source of Target Model Weights and      │
│ (C.6.1 🔒)                    │ Policy Invariants                       │
├───────────────────────────────┼─────────────────────────────────────────┤
│ `rebalancingEngine.js`        │ Source of Drift Percentage Points and   │
│ (C.6.2 🔒)                    │ Asset Class Imbalances                  │
├───────────────────────────────┼─────────────────────────────────────────┤
│ `taxOptimizedRebalancingService.js`│ Source of Tax Drag % & Harvestable │
│ (C.6.3 🔒)                    │ Losses for Tax Risk Pillar              │
└───────────────────────────────┴─────────────────────────────────────────┘
```

---

## 7. Stage C.7.1 Focus & Scope: Portfolio Risk Foundation & Risk Taxonomy

The foundational stage (`Stage C.7.1`) establishes the core risk data model and contracts:
1. **Canonical Risk Taxonomy Constants**:
   - Risk pillars (`CONCENTRATION`, `VOLATILITY`, `DRAWDOWN`, `LIQUIDITY`, `CORRELATION`, `STRESS_TEST`).
   - Risk severity levels (`LOW`, `MODERATE`, `HIGH`, `CRITICAL`).
   - Standardized stress scenario identifiers (`HISTORICAL_GFC_2008`, `HISTORICAL_COVID_2020`, `RATE_SPIKE_200BPS`, `HIGH_INFLATION_SHOCK`, `CRYPTO_WINTER_2022`, `CUSTOM_STRESS_LAB`).
2. **Authoritative Risk DTO Schemas**:
   - `HoldingRiskProfile`: per-holding liquidity tier, volatility proxy, and concentration contribution.
   - `ConcentrationRiskSummary`: HHI, $Top_k$, $N_{\text{eff}}$, and single-asset concentration warnings.
   - `PortfolioRiskProfile`: aggregate 5-pillar risk container.
3. **Deterministic Evaluation & Pure Validation Helpers**:
   - Schema validation, range guards ($[0, 100]$ bounds), and invalid input protection.
   - Pure read-only contracts with zero storage mutations.

---

## 8. Zero-Code Gate Verification Checklist for Stage C.7.1

Before opening the Stage C.7.1 implementation gate, the following architecture checks must be confirmed:
- [x] Zero changes to certified C.4–C.6 services.
- [x] Clear separation between core mathematical engines and presentation adapters.
- [x] Authoritative living state file synchronized with certified baseline [`5fdfb36`](https://github.com/Nreddy2020/finapp-mobile/commit/5fdfb36).
- [x] Comprehensive 20-point acceptance test criteria designed for `test_c71.mjs`.
