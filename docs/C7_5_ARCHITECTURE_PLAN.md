# Stage C.7.5 Architecture Plan: Liquidity & Cash-Flow Stress Engine

**Stage**: C.7.5  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: ARCHITECTURE PROPOSED — ZERO-CODE GATE ACTIVE 🔒  
**Certified Baseline**: [`578040f`](https://github.com/Nreddy2020/finapp-mobile/commit/578040f) (Stage C.7.4 Master Certified)  
**Branch**: `fintech-using-chatgpt`  
**Author**: Antigravity AI & Quantitative Risk Systems Architect  

---

## 1. Executive Summary & Problem Statement

### 1.1 Objective
While Stages C.7.1–C.7.4 established the static taxonomy, concentration/diversification diagnostics, univariate volatility/drawdown/downside risk, and multivariate correlation/cross-asset dependency, **Stage C.7.5 (Liquidity & Cash-Flow Stress Engine)** creates the deterministic cash-flow adequacy, liquidity horizon decomposition, and multi-scenario solvency stress engine (`services/liquidityStressEngine.js`).

The engine answers twelve core quantitative questions:
1. **Immediate Liquidity ($T+0$)**: How much capital is accessible on the same calendar day?
2. **Short-Term Liquidity ($T+2/T+3$)**: How much capital settles within standard rolling settlement windows?
3. **Medium-Term Liquidity ($T+4/T+7$)**: How much capital requires extended fund realization cycles?
4. **Locked & Illiquid Capital**: How much capital is legally, contractually, or structurally inaccessible?
5. **Emergency Runway**: How many months of essential recurring survival expenses can available liquidity support?
6. **Income Shock Resilience**: How does liquidity runway contract under partial or total household income loss?
7. **Portfolio Fire-Sale Haircuts**: What is the stressed realizable value of holdings under forced liquidation?
8. **Combined Macro Stress**: What is the portfolio's survival duration when income loss and market haircuts occur simultaneously?
9. **Liquidity Bottlenecks**: Which specific holdings and asset classes create liquidity traps?
10. **Emergency Reserve Adequacy**: Are dedicated liquid reserves sufficient relative to fixed monthly obligations?
11. **Maturity & Lockup Schedules**: Exactly when do ELSS, Fixed Deposits, and lockup instruments unlock?
12. **Liquidity Stress Score & Tier**: What is the deterministic composite liquidity health score ($0 - 100$) and status tier?

### 1.2 Clear Boundary: Separation from Stage C.7.6 (Scenario Engine)
- **Stage C.7.5 (This Stage)**: Evaluates **micro-solvency & cash-flow adequacy** (holding settlement horizons, recurring monthly burn, income shocks, liquidity haircuts, and lockup exit timelines).
- **Stage C.7.6 (Next Stage)**: Evaluates **macro-systemic market shocks** (GFC 2008, COVID 2020, Interest Rate Spikes, Stagflation, Factor Shocks).

### 1.3 Core Invariants
- ❌ **Zero State Mutation**: 100% read-only diagnostic service. Does not mutate or persist any store data.
- ❌ **Zero Trade Execution**: Analytical diagnostic service only. Does not place orders, transfer funds, or rebalance.
- ❌ **Zero Manufactured Liquidity / No Silent Assumptions**: Holdings without authoritative liquidity metadata are explicitly tracked as `UNKNOWN` (never assumed to be liquid).
- ❌ **Zero Wall-Clock Dependencies**: Mandatory `asOfDate` on every public API entry point. Zero `Date.now()` or argument-less `new Date()`.
- ❌ **Zero Monte Carlo / Deterministic Evaluation**: Closed-form mathematical formulas only; 100% reproducible.

---

## 2. Liquidity Horizon Taxonomy & Precedence Contract

### 2.1 Authoritative Liquidity Horizons
Every holding $h$ in the portfolio resolves to **exactly one** authoritative primary liquidity horizon:

| Liquidity Horizon | Code | Settlement Window | Asset Examples | Base Haircut |
| :--- | :--- | :--- | :--- | :--- |
| **Immediate** | `T0` | Same-Day ($0$ Days) | Savings Accounts, Physical Cash, Overnight/Liquid MFs, Wallets | 0.0% |
| **Short-Term** | `T2_T3` | Rolling $1 - 3$ Days | Listed Equities ($T+1$), Debt MFs ($T+2$), Gold ETFs, Liquid Bonds | 5.0% |
| **Medium-Term** | `T4_T7` | Extended $4 - 7$ Days | REITs/InvITs, Unlisted Debt, Private Funds with weekly gates | 15.0% |
| **Locked / Illiquid** | `LOCKED_ILLIQUID` | $> 7$ Days or Bound | ELSS (<3 yrs), FDs pre-maturity, Physical Real Estate, PPF, SGBs | 100.0% (Inaccessible) |
| **Unknown** | `UNKNOWN` | Unspecified | Assets missing metadata or unrecognized subtype | 100.0% (Conservative) |

### 2.2 Deterministic Horizon Resolution Precedence
For a given holding $h$ evaluated at `asOfDateISO`:
1. **Rule 1 (Explicit Lockup / Maturity Restriction)**:
   If holding has `lockEndDate` or `maturityDate`:
   - If $\text{lockEndDate} > \text{asOfDateISO} \implies \text{Horizon} = \text{'LOCKED\_ILLIQUID'}$.
   - Else if $\text{lockEndDate} \le \text{asOfDateISO} \implies$ Lockup is expired; fallback to underlying asset-class default.
2. **Rule 2 (Explicit User / Product Override)**:
   If holding has explicit valid `liquidityTier` metadata ($\in \{\text{'T0'}, \text{'T2\_T3'}, \text{'T4\_T7'}, \text{'LOCKED\_ILLIQUID'}\}$) $\implies \text{Horizon} = \text{holding.liquidityTier}$.
3. **Rule 3 (Certified C.7.1 Asset-Class Default Taxonomy)**:
   Match holding's canonical asset class against certified `DEFAULT_ASSET_LIQUIDITY_MAP`:
   - `CASH_LIQUID` $\implies \text{'T0'}$
   - `EQUITY_DOMESTIC`, `EQUITY_INTERNATIONAL`, `GOLD_COMMODITIES`, `CRYPTO_SPECULATIVE` $\implies \text{'T2\_T3'}$
   - `DEBT_FIXED_INCOME` $\implies \text{'T2\_T3'}$ (or `T0` if marked liquid/overnight)
   - `REAL_ESTATE`, `ALTERNATIVE` $\implies \text{'LOCKED\_ILLIQUID'}$
4. **Rule 4 (Unknown Fallback)**:
   If asset class is unmapped or metadata is contradictory $\implies \text{Horizon} = \text{'UNKNOWN'}$.

---

## 3. Mathematical Specifications & Core Models

### 3.1 Liquidity Value Model
For a portfolio of $N$ holdings with valuations $\{ V_i \}$ at `asOfDate`:
- **Gross Portfolio Value ($V_p$)**:
  $$V_p = \sum_{i=1}^N V_i$$
- **Tier-Aggregated Values**:
  $$V_{T0} = \sum_{i \in T0} V_i, \quad V_{T23} = \sum_{i \in T2\_T3} V_i, \quad V_{T47} = \sum_{i \in T4\_T7} V_i$$
  $$V_{\text{locked}} = \sum_{i \in \text{LOCKED}} V_i, \quad V_{\text{unknown}} = \sum_{i \in \text{UNKNOWN}} V_i$$
- **Total Accessible Capital ($V_{\text{accessible}}$)**:
  $$V_{\text{accessible}} = V_{T0} + V_{T23} + V_{T47}$$
- **Allocation Percentages**:
  $$P_{T0} = \frac{V_{T0}}{V_p}, \quad P_{T23} = \frac{V_{T23}}{V_p}, \quad P_{T47} = \frac{V_{T47}}{V_p}$$
  $$P_{\text{accessible}} = \frac{V_{\text{accessible}}}{V_p}, \quad P_{\text{locked}} = \frac{V_{\text{locked}}}{V_p}, \quad P_{\text{unknown}} = \frac{V_{\text{unknown}}}{V_p}$$
  *(All percentages bounded in $[0.0, 1.0]$ with $\sum P = 1.0 \pm 10^{-6}$)*.

---

### 3.2 Liquidity Haircut Model (Base vs Stressed Liquidity)
Liquidity haircuts represent forced-sale transaction costs, bid-ask slippage, and early redemption penalties:

| Liquidity Horizon | No Haircut (Base) | Moderate Haircut | Severe Haircut |
| :--- | :--- | :--- | :--- |
| `T0` (Cash/Liquid) | $0.0\%$ | $0.0\%$ | $0.0\%$ |
| `T2_T3` (Liquid Equities/Debt) | $0.0\%$ | $5.0\%$ ($0.05$) | $15.0\%$ ($0.15$) |
| `T4_T7` (Medium Liquidity) | $0.0\%$ | $15.0\%$ ($0.15$) | $30.0\%$ ($0.30$) |
| `LOCKED_ILLIQUID` / `UNKNOWN` | $100.0\%$ (Inaccessible) | $100.0\%$ | $100.0\%$ |

- **Stressed Accessible Value ($V_{\text{accessible}}^{\text{stressed}}$)**:
  $$V_{\text{accessible}}^{\text{stressed}} = V_{T0} \cdot (1 - H_{T0}) + V_{T23} \cdot (1 - H_{T23}) + V_{T47} \cdot (1 - H_{T47})$$
  $$\text{Invariant: } 0.0 \le V_{\text{accessible}}^{\text{stressed}} \le V_{\text{accessible}}$$

---

### 3.3 Recurring Cash-Flow & Emergency Runway Model

#### A. Cash-Flow Breakdown
1. **Recurring Monthly Inflows**: $I_{\text{monthly}} \ge 0$.
2. **Recurring Monthly Outflows**:
   - **Essential Survival Burn ($B_{\text{survival}}$)**: Core groceries, utilities, rent/housing, healthcare, and mandatory debt/EMI payments.
     $$B_{\text{survival}} = B_{\text{essential}} + B_{\text{debt}}$$
   - **Discretionary Burn ($B_{\text{discretionary}}$)**: Dining, entertainment, shopping, travel.
   - **Total Monthly Burn ($B_{\text{total}}$)**:
     $$B_{\text{total}} = B_{\text{survival}} + B_{\text{discretionary}}$$
3. **Net Monthly Cash Flow ($CF_{\text{net}}$)**:
   $$CF_{\text{net}} = I_{\text{monthly}} - B_{\text{total}}$$
4. **Cash-Flow Coverage Ratios**:
   $$\text{Income Coverage Ratio} = \begin{cases} \text{null} & \text{if } B_{\text{total}} \le 0 \\ \frac{I_{\text{monthly}}}{B_{\text{total}}} & \text{otherwise} \end{cases}$$
   $$\text{Essential Survival Coverage Ratio} = \begin{cases} \text{null} & \text{if } B_{\text{survival}} \le 0 \\ \frac{I_{\text{monthly}}}{B_{\text{survival}}} & \text{otherwise} \end{cases}$$

#### B. Emergency Runway (Months)
- **Immediate Runway ($R_{T0}$)**:
  $$R_{T0} = \begin{cases} \text{null} & \text{if } B_{\text{survival}} \le 0 \quad (\text{status: 'NO\_RECURRING\_BURN'}) \\ \frac{V_{T0}}{B_{\text{survival}}} & \text{otherwise} \end{cases}$$
- **Total Accessible Runway ($R_{\text{total}}$)**:
  $$R_{\text{total}} = \begin{cases} \text{null} & \text{if } B_{\text{survival}} \le 0 \quad (\text{status: 'NO\_RECURRING\_BURN'}) \\ \frac{V_{\text{accessible}}}{B_{\text{survival}}} & \text{otherwise} \end{cases}$$
- **Stressed Accessible Runway ($R_{\text{stressed}}$)**:
  $$R_{\text{stressed}} = \begin{cases} \text{null} & \text{if } B_{\text{survival}} \le 0 \quad (\text{status: 'NO\_RECURRING\_BURN'}) \\ \frac{V_{\text{accessible}}^{\text{stressed}}}{B_{\text{survival}}} & \text{otherwise} \end{cases}$$

---

### 3.4 Multi-Scenario Cash-Flow & Liquidity Stress Matrix

The engine evaluates four deterministic stress scenarios:

| Scenario Code | Income Shock Factor | Liquidity Haircut Policy | Stressed Income | Stressed Realizable Liquidity | Stressed Monthly Deficit |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `BASE` | $0.0\%$ (100% Inflow) | `NO_HAIRCUT` ($0\%$) | $I_{\text{monthly}}$ | $V_{\text{accessible}}$ | $\max(0, B_{\text{total}} - I_{\text{monthly}})$ |
| `INCOME_SHOCK_ONLY` | $50.0\%$ Loss ($50\%$ Inflow) | `NO_HAIRCUT` ($0\%$) | $0.50 \cdot I_{\text{monthly}}$ | $V_{\text{accessible}}$ | $\max(0, B_{\text{total}} - 0.50 I_{\text{monthly}})$ |
| `PORTFOLIO_HAIRCUT_ONLY` | $0.0\%$ (100% Inflow) | `SEVERE_HAIRCUT` ($15\% / 30\%$) | $I_{\text{monthly}}$ | $V_{\text{accessible}}^{\text{severe}}$ | $\max(0, B_{\text{total}} - I_{\text{monthly}})$ |
| `COMBINED_SEVERE_STRESS` | $100.0\%$ Loss ($0\%$ Inflow) | `SEVERE_HAIRCUT` ($15\% / 30\%$) | $0.0$ | $V_{\text{accessible}}^{\text{severe}}$ | $B_{\text{survival}}$ (Survival Mode) |

For each scenario $s$, the **Scenario Survival Runway** is calculated:
$$\text{Runway}_s = \begin{cases}
\text{null} & \text{if } \text{Deficit}_s \le 0 \quad (\text{Self-Sustaining}) \\
\frac{V_{\text{accessible}, s}}{\text{Deficit}_s} & \text{if } \text{Deficit}_s > 0
\end{cases}$$

---

### 3.5 Lockup / ELSS / Maturity Schedule Analysis
For all restricted holdings ($i \in \text{LOCKED}$):
1. **Lockup Chronology**:
   - Order locked holdings by `lockEndDate` or `maturityDate` ascendingly:
     $$\text{Ordering}: \text{lockEndDate ASC} \to V_i \text{ DESC} \to \text{symbol ASC} \to \text{holdingId ASC}$$
2. **Unlock Horizon Buckets**:
   - Unlock $< 6 \text{ Months}$
   - Unlock $6 - 12 \text{ Months}$
   - Unlock $1 - 3 \text{ Years}$
   - Unlock $> 3 \text{ Years}$ / Undefined Lockup

---

### 3.6 Liquidity Bottleneck Diagnostics & Warnings

The engine identifies structural liquidity traps and generates deterministic diagnostic warnings:

1. **`CRITICAL_LOCKED_ASSET_EXPOSURE`**: $P_{\text{locked}} \ge 0.50$ (Over 50% of portfolio locked).
2. **`HIGH_LOCKED_ASSET_EXPOSURE`**: $0.30 \le P_{\text{locked}} < 0.50$.
3. **`INSUFFICIENT_IMMEDIATE_LIQUIDITY`**: $V_{T0} < 1.0 \times B_{\text{survival}}$ ($T+0$ reserves $< 1$ month burn).
4. **`CRITICAL_EMERGENCY_RUNWAY`**: $R_{\text{total}} < 3.0 \text{ months}$ (Total accessible liquidity $< 3$ months survival burn).
5. **`INSUFFICIENT_EMERGENCY_RUNWAY`**: $3.0 \le R_{\text{total}} < 6.0 \text{ months}$.
6. **`NEGATIVE_MONTHLY_CASH_FLOW`**: $CF_{\text{net}} < 0$ (Recurring monthly deficit).
7. **`HIGH_UNKNOWN_LIQUIDITY_EXPOSURE`**: $P_{\text{unknown}} \ge 0.15$ (Over 15% unclassified assets).
8. **`COMBINED_STRESS_FAILURE`**: $\text{Runway}_{\text{combined}} < 1.0 \text{ month}$.

---

### 3.7 Liquidity Stress Score & Tier Formulation

The **Liquidity Stress Score ($S_{\text{liq}} \in [0, 100]$)** is a deterministic composite index evaluating portfolio solvency, runway, and resilience:

$$S_{\text{liq}} = S_{\text{immediate}} + S_{\text{short\_term}} + S_{\text{runway}} + S_{\text{cash\_flow}} + S_{\text{locked\_penalty}} + S_{\text{stress\_resilience}}$$

#### Component Formulations:
1. **Immediate Liquidity Adequacy ($S_{\text{immediate}} \in [0, 20]$)**:
   $$S_{\text{immediate}} = \min\left(20, 20 \cdot \frac{R_{T0}}{1.0}\right) \quad (\text{Full points at } \ge 1 \text{ month immediate reserves})$$
2. **Short-Term Liquidity Adequacy ($S_{\text{short\_term}} \in [0, 20]$)**:
   $$S_{\text{short\_term}} = \min\left(20, 20 \cdot \frac{R_{T0+T23}}{3.0}\right) \quad (\text{Full points at } \ge 3 \text{ months short-term reserves})$$
3. **Total Accessible Runway ($S_{\text{runway}} \in [0, 25]$)**:
   $$S_{\text{runway}} = \min\left(25, 25 \cdot \frac{R_{\text{total}}}{6.0}\right) \quad (\text{Full points at } \ge 6 \text{ months total runway})$$
4. **Cash-Flow Solvency ($S_{\text{cash\_flow}} \in [0, 15]$)**:
   $$S_{\text{cash\_flow}} = \begin{cases} 15 & \text{if } I_{\text{monthly}} \ge 1.25 \cdot B_{\text{total}} \\ \max\left(0, 15 \cdot \frac{I_{\text{monthly}} - B_{\text{survival}}}{0.25 \cdot B_{\text{total}}}\right) & \text{otherwise} \end{cases}$$
5. **Locked Asset Penalty ($S_{\text{locked\_penalty}} \in [0, 10]$)**:
   $$S_{\text{locked\_penalty}} = \max\left(0, 10 \cdot (1.0 - \frac{\max(0, P_{\text{locked}} - 0.20)}{0.60})\right) \quad (\text{Zero penalty if locked } \le 20\%)$$
6. **Combined Stress Resilience ($S_{\text{stress\_resilience}} \in [0, 10]$)**:
   $$S_{\text{stress\_resilience}} = \min\left(10, 10 \cdot \frac{R_{\text{combined}}}{3.0}\right) \quad (\text{Full points if combined stressed runway } \ge 3 \text{ months})$$

#### Authoritative Liquidity Stress Tiers:
| Score Range | Liquidity Stress Tier | Semantic Meaning | Recommended Action |
| :--- | :--- | :--- | :--- |
| **$80 - 100$** | `HEALTHY` | Strong liquidity buffer, $>6$ mos runway, self-sustaining | Maintain current liquidity profile |
| **$60 - 79$** | `WATCH` | Adequate liquidity, moderate locked exposure, runway $3-6$ mos | Monitor recurring burn; limit new lockups |
| **$40 - 59$** | `STRESSED` | Deficient immediate reserves, runway $<3$ mos under shock | Build T+0 emergency buffer; curtail discretionary burn |
| **$0 - 39$** | `CRITICAL` | Imminent solvency risk, severe lockup traps, runway $<1$ mo | Urgent liquidity reallocation required |

---

## 4. Master Versioned Policy (`C7_5_V1`)

```javascript
export const LIQUIDITY_POLICY_VERSION = "C7_5_V1";

export const LIQUIDITY_POLICY_V1 = Object.freeze({
    haircuts: Object.freeze({
        NO_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.0, T4_T7: 0.0, LOCKED: 1.0, UNKNOWN: 1.0 }),
        MODERATE_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.05, T4_T7: 0.15, LOCKED: 1.0, UNKNOWN: 1.0 }),
        SEVERE_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.15, T4_T7: 0.30, LOCKED: 1.0, UNKNOWN: 1.0 })
    }),
    incomeShocks: Object.freeze({
        BASE: 0.0,               // 100% income retained
        MILD_INCOME_SHOCK: 0.25, // 25% loss (75% retained)
        SEVERE_INCOME_SHOCK: 0.50,// 50% loss (50% retained)
        ZERO_INCOME: 1.0         // 100% loss (0% retained)
    }),
    runwayThresholdsMonths: Object.freeze({
        CRITICAL: 3.0,
        ADEQUATE: 6.0,
        STRONG: 12.0
    }),
    lockedAssetThresholds: Object.freeze({
        HIGH_LOCKED_EXPOSURE: 0.30,
        CRITICAL_LOCKED_EXPOSURE: 0.50,
        HIGH_UNKNOWN_EXPOSURE: 0.15
    }),
    scoreTiers: Object.freeze({
        HEALTHY_MIN: 80,
        WATCH_MIN: 60,
        STRESSED_MIN: 40
    }),
    scoreComponentWeights: Object.freeze({
        IMMEDIATE_ADEQUACY: 20,
        SHORT_TERM_ADEQUACY: 20,
        TOTAL_RUNWAY: 25,
        CASH_FLOW_SOLVENCY: 15,
        LOCKED_PENALTY: 10,
        STRESS_RESILIENCE: 10
    }),
    tolerances: Object.freeze({
        EPSILON_CURRENCY: 1e-4,
        PERCENTAGE_SUM_TOLERANCE: 1e-6
    })
});
```

---

## 5. Canonical DTO Contract

```javascript
export const LiquidityStressDiagnosticsSchema = {
    portfolioId: 'STRING_OR_NULL',
    asOfDate: 'ISO_DATE_STRING',
    policyVersion: 'C7_5_V1',
    status: 'LiquidityStatus', // 'HEALTHY' | 'WATCH' | 'STRESSED' | 'CRITICAL' | 'EMPTY_PORTFOLIO' | 'INVALID_INPUT'
    dataQuality: {
        confidenceLevel: 'HIGH | MODERATE | LOW | UNAVAILABLE',
        coverageRatio: 'NUMBER',
        hasCashFlowData: 'BOOLEAN',
        hasValuationData: 'BOOLEAN',
        unknownHoldingCount: 'INTEGER',
        evaluationTimestamp: 'ISO_DATE_STRING'
    },

    // Portfolio Valuation & Liquidity Horizons
    grossPortfolioValue: 'FINITE_NUMBER',
    liquidValueT0: 'FINITE_NUMBER',
    liquidValueT23: 'FINITE_NUMBER',
    liquidValueT47: 'FINITE_NUMBER',
    lockedValue: 'FINITE_NUMBER',
    unknownLiquidityValue: 'FINITE_NUMBER',
    accessibleValue: 'FINITE_NUMBER',
    accessiblePercentage: 'FINITE_NUMBER', // [0, 1]
    lockedPercentage: 'FINITE_NUMBER',     // [0, 1]
    unknownPercentage: 'FINITE_NUMBER',    // [0, 1]

    // Stressed Realizable Liquidity (Severe Haircuts)
    stressedAccessibleValue: 'FINITE_NUMBER',
    stressedAccessiblePercentage: 'FINITE_NUMBER',

    // Monthly Cash Flow & Burn Analysis
    monthlyCashFlow: {
        income: 'FINITE_NUMBER',
        essentialBurn: 'FINITE_NUMBER',
        debtBurn: 'FINITE_NUMBER',
        survivalBurn: 'FINITE_NUMBER',       // essential + debt
        discretionaryBurn: 'FINITE_NUMBER',
        totalBurn: 'FINITE_NUMBER',
        netCashFlow: 'FINITE_NUMBER',
        incomeCoverageRatio: 'FINITE_NUMBER_OR_NULL',
        survivalCoverageRatio: 'FINITE_NUMBER_OR_NULL'
    },

    // Emergency Runway Analysis (Months)
    runway: {
        immediateMonths: 'FINITE_NUMBER_OR_NULL',
        shortTermMonths: 'FINITE_NUMBER_OR_NULL',
        totalMonths: 'FINITE_NUMBER_OR_NULL',
        stressedMonths: 'FINITE_NUMBER_OR_NULL',
        status: 'RunwayStatus' // 'STRONG' | 'ADEQUATE' | 'WATCH' | 'CRITICAL' | 'NO_RECURRING_BURN' | 'SELF_SUSTAINING'
    },

    // Multi-Scenario Stress Test Matrix
    stressScenarios: {
        base: { stressedIncome: 'NUMBER', realizableLiquidity: 'NUMBER', monthlyDeficit: 'NUMBER', runwayMonths: 'NUMBER_OR_NULL' },
        incomeShockOnly: { stressedIncome: 'NUMBER', realizableLiquidity: 'NUMBER', monthlyDeficit: 'NUMBER', runwayMonths: 'NUMBER_OR_NULL' },
        portfolioHaircutOnly: { stressedIncome: 'NUMBER', realizableLiquidity: 'NUMBER', monthlyDeficit: 'NUMBER', runwayMonths: 'NUMBER_OR_NULL' },
        combinedSevereStress: { stressedIncome: 'NUMBER', realizableLiquidity: 'NUMBER', monthlyDeficit: 'NUMBER', runwayMonths: 'NUMBER_OR_NULL' }
    },

    // Locked Instrument Maturity Schedule
    lockupSchedule: {
        totalLockedValue: 'FINITE_NUMBER',
        lockedHoldingCount: 'INTEGER',
        unlockWithin6M: 'FINITE_NUMBER',
        unlockWithin1Y: 'FINITE_NUMBER',
        unlockWithin3Y: 'FINITE_NUMBER',
        unlockBeyond3YOrIndefinite: 'FINITE_NUMBER',
        lockedHoldings: 'ARRAY_OF_OBJECTS' // { holdingId, symbol, value, lockEndDate, daysRemaining }
    },

    // Bottlenecks & Diagnostics
    bottlenecks: {
        topLockedHoldings: 'ARRAY_OF_OBJECTS', // { holdingId, symbol, value, percentageOfPortfolio }
        topLockedAssetClasses: 'ARRAY_OF_OBJECTS'
    },
    warnings: 'ARRAY_OF_STRINGS',

    // Composite Liquidity Stress Score & Tier
    stressScore: 'FINITE_NUMBER', // [0, 100]
    stressTier: 'LiquidityStressTier', // 'HEALTHY' | 'WATCH' | 'STRESSED' | 'CRITICAL'
    scoreBreakdown: {
        immediateAdequacy: 'NUMBER',
        shortTermAdequacy: 'NUMBER',
        totalRunway: 'NUMBER',
        cashFlowSolvency: 'NUMBER',
        lockedPenalty: 'NUMBER',
        stressResilience: 'NUMBER'
    }
};
```

---

## 6. Comprehensive 42-Scenario Acceptance Test Matrix (`tests/test_c75.mjs`)

### Group 1: Liquidity Horizon Classification & Precedence (Tests 1–7)
1. **Empty Portfolio Boundary ($N = 0$)**: Returns `EMPTY_PORTFOLIO` status, zero values, safe nulls, confidence `UNAVAILABLE`.
2. **Single Cash / T+0 Holding**: $100\%$ allocated to `T0`, accessible percentage $1.0$, locked $0.0$.
3. **Fully Liquid Listed Equities Portfolio ($T+2/T+3$)**: $100\%$ allocated to `T2_T3`, accessible percentage $1.0$.
4. **Fully Locked Portfolio (100% Real Estate / PPF)**: Accessible value $0.0$, locked percentage $1.0$, warning `CRITICAL_LOCKED_ASSET_EXPOSURE`.
5. **Mixed 4-Tier Liquidity Portfolio**: Exact allocation across `T0`, `T2_T3`, `T4_T7`, and `LOCKED_ILLIQUID`.
6. **Precedence Contract — Lockup Date over Asset Class**: ELSS holding with future `lockEndDate` classified as `LOCKED_ILLIQUID` (not equity T+2).
7. **Precedence Contract — Expired Lockup Transition**: Holding with `lockEndDate <= asOfDate` transitions to base liquid asset class.

### Group 2: Unrepresented & Unknown Liquidity Handling (Tests 8–11)
8. **Explicit Unknown Liquidity Classification**: Missing metadata resolves to `UNKNOWN`, accessible value excludes unknown capital.
9. **`HIGH_UNKNOWN_LIQUIDITY_EXPOSURE` Diagnostic**: Triggered when $P_{\text{unknown}} \ge 0.15$.
10. **Zero Manufactured Liquidity Invariant**: Unknown assets never converted to T0 or T2.
11. **Negative / Non-Finite Valuation Input Rejection**: Invalid valuations produce `INVALID_INPUT` status.

### Group 3: Liquidity Haircut Stress Modeling (Tests 12–16)
12. **No Haircut Base Valuation**: Stressed accessible value equals base accessible value.
13. **Moderate Haircut Application**: $5\%$ haircut on T2/T3, $15\%$ on T4/T7, $0\%$ on T0.
14. **Severe Haircut Application**: $15\%$ haircut on T2/T3, $30\%$ on T4/T7, $0\%$ on T0.
15. **Haircut Non-Negativity & Boundedness Invariant**: Stressed liquidity value $\ge 0.0$ and $\le$ base value.
16. **Locked Asset Exclusion under Haircut**: Locked assets yield $0.0$ realized accessible liquidity under all haircut policies.

### Group 4: Cash-Flow Burn & Emergency Runway Modeling (Tests 17–22)
17. **Standard Emergency Runway Calculation**: $R_{\text{total}} = V_{\text{accessible}} / B_{\text{survival}}$ exact match.
18. **Zero Monthly Burn Boundary**: $B_{\text{survival}} = 0 \implies \text{runway} = \text{null}$, status `'NO_RECURRING_BURN'` (no `NaN` or $\infty$).
19. **Immediate $T+0$ Runway Calculation**: $R_{T0} = V_{T0} / B_{\text{survival}}$.
20. **Negative Net Cash Flow Deficit Detection**: Inflows $<$ Outflows generates `NEGATIVE_MONTHLY_CASH_FLOW` warning.
21. **Discretionary vs Survival Burn Isolation**: Discretionary spending does not distort survival runway.
22. **Income Coverage Ratio Closed-Form Match**: Exact calculation of $I_{\text{monthly}} / B_{\text{total}}$.

### Group 5: Multi-Scenario Stress Testing Matrix (Tests 23–27)
23. **`BASE` Scenario Evaluation**: $100\%$ income + $0\%$ haircut baseline.
24. **`INCOME_SHOCK_ONLY` Scenario Evaluation**: $50\%$ income reduction accelerates liquidity burn.
25. **`PORTFOLIO_HAIRCUT_ONLY` Scenario Evaluation**: Reduced capital pool under severe liquidation discount.
26. **`COMBINED_SEVERE_STRESS` Scenario Evaluation**: Zero income + severe haircuts yields worst-case survival duration.
27. **Self-Sustaining Scenario State**: Positive net cash flow produces `'SELF_SUSTAINING'` status for scenario runway.

### Group 6: Lockup Schedule & Bottleneck Diagnostics (Tests 28–32)
28. **ELSS 3-Year Lockup Schedule Breakdown**: Locked amounts categorized into $<6\text{M}$, $6-12\text{M}$, $1-3\text{Y}$, $>3\text{Y}$.
29. **Top Locked Holding Isolation**: Correctly identifies largest illiquid concentration.
30. **Deterministic Lockup Tie-Breaking**: Earliest unlock date $\to$ Largest value $\to$ Alphabetical.
31. **`CRITICAL_LOCKED_ASSET_EXPOSURE` Diagnostic**: Triggered when $P_{\text{locked}} \ge 0.50$.
32. **`INSUFFICIENT_IMMEDIATE_LIQUIDITY` Diagnostic**: Triggered when $V_{T0} < 1.0 \times B_{\text{survival}}$.

### Group 7: Composite Liquidity Stress Score & Tiers (Tests 33–36)
33. **Maximum Liquidity Score ($100/100$)**: Fully liquid, large buffer, positive cash flow $\implies \text{'HEALTHY'}$.
34. **Watch Tier Boundary ($60 - 79$)**: Moderate runway / locked exposure evaluates cleanly.
35. **Stressed Tier Boundary ($40 - 59$)**: High locked exposure and short runway evaluates to `'STRESSED'`.
36. **Critical Tier Boundary ($< 40$)**: Severe illiquidity trap evaluates to `'CRITICAL'`.

### Group 8: Determinism, Quality, AST Scan & Read-Only Safety (Tests 37–42)
37. **Mandatory Deterministic `asOfDate` Enforced**: Missing/invalid `asOfDate` throws error.
38. **AST Wall-Clock Scan**: 0 `Date.now()` and 0 argument-less `new Date()` in `liquidityStressEngine.js`.
39. **Deep 5-Store Read-Only Safety Guard**: Verified 100% zero state mutations across all 5 stores.
40. **Deterministic Output Repeatability**: Identical inputs yield byte-equivalent DTO outputs.
41. **Data Quality Propagation**: Missing cash-flow or valuation data sets confidence cleanly.
42. **Full Master System Regression Preservation**: 383/383 previous system tests pass with zero regressions.

---

## 7. Open Architectural Questions

| ID | Question | Recommended Resolution | Impact |
| :--- | :--- | :--- | :--- |
| **C7.5-Q1** | Should partial FD early-break penalties be modeled as a haircut or as a locked asset? | Treat FDs without explicit `allowEarlyExit: true` metadata as `LOCKED_ILLIQUID`. If `allowEarlyExit: true`, classify as `T2_T3` with a $2.0\%$ penalty haircut. | Conservative liquidity safety. |
| **C7.5-Q2** | If user provides total expenses but no split between essential and discretionary, how should survival burn be derived? | Default to $B_{\text{survival}} = 0.70 \times B_{\text{total}}$ with warning `ESTIMATED_ESSENTIAL_BURN_RATIO_APPLIED`. | Prevents blocking calculations while remaining auditable. |

---

## 8. Repository Boundary & Gate Status

- **Certified Baseline**: [`578040f`](https://github.com/Nreddy2020/finapp-mobile/commit/578040f) (Stage C.7.4 Master Certified).
- **Files Modified in this step**:
  - `docs/C7_5_ARCHITECTURE_PLAN.md` (NEW)
  - `docs/AI_PROJECT_STATE.md` (MODIFIED)
- **Implementation Files Created**: **0** 🔒 (Zero-Code Gate Active).
- **Frozen Financial Engines Modified**: **0** 🔒 (`services/` diff is 100% clean).
