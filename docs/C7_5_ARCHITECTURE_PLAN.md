# Stage C.7.5 Architecture Plan: Liquidity & Cash-Flow Stress Engine

**Stage**: C.7.5  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: ARCHITECTURE REMEDIATED — ZERO-CODE GATE ACTIVE 🔒  
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
- **Stage C.7.5 (This Stage)**: Evaluates **micro-solvency & cash-flow adequacy** (holding settlement horizons, recurring monthly burn, income shocks, liquidity haircuts, early-break penalties, and lockup exit timelines).
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

---

### 2.2 Deterministic Horizon Resolution & FD Early-Break Precedence (C7.5-Q1 Hardened)

For a given holding $h$ evaluated at `asOfDateISO`:

#### A. Maturity vs Early-Exit Accessibility Resolution
1. **Rule 1 (Maturity Reached)**:
   If holding has `maturityDate` or `lockEndDate` and $\text{maturityDate} \le \text{asOfDateISO}$:
   - The instrument is **no longer locked**.
   - It transitions to its base liquid asset-class tier (e.g. Matured FD $\implies \text{'T0'}$ or $\text{'T2\_T3'}$).
2. **Rule 2 (Active Lockup / Pre-Maturity Contract)**:
   If $\text{lockEndDate} > \text{asOfDateISO}$ or $\text{maturityDate} > \text{asOfDateISO}$:
   - **Case 2A (No Early Exit)**: If `allowEarlyExit !== true` $\implies \text{Horizon} = \text{'LOCKED\_ILLIQUID'}$.
   - **Case 2B (Early Exit with Authoritative Accessibility Date)**: If `allowEarlyExit === true`:
     - If explicit `earlyExitDate` or `liquidityDate` is provided:
       - If $\text{daysToAccess} \le 0 \implies \text{'T0'}$
       - If $1 \le \text{daysToAccess} \le 3 \implies \text{'T2\_T3'}$
       - If $4 \le \text{daysToAccess} \le 7 \implies \text{'T4\_T7'}$
       - If $\text{daysToAccess} > 7 \implies \text{'LOCKED\_ILLIQUID'}$
     - If `allowEarlyExit === true` but early-exit accessibility date is unknown $\implies \text{Horizon} = \text{'LOCKED\_ILLIQUID'}$ (Conservative; zero date fabrication).
3. **Rule 3 (Explicit User / Product Override)**:
   If holding has explicit valid `liquidityTier` metadata ($\in \{\text{'T0'}, \text{'T2\_T3'}, \text{'T4\_T7'}, \text{'LOCKED\_ILLIQUID'}\}$) $\implies \text{Horizon} = \text{holding.liquidityTier}$.
4. **Rule 4 (Certified C.7.1 Asset-Class Default Taxonomy)**:
   Match holding's canonical asset class against certified `DEFAULT_ASSET_LIQUIDITY_MAP`:
   - `CASH_LIQUID` $\implies \text{'T0'}$
   - `EQUITY_DOMESTIC`, `EQUITY_INTERNATIONAL`, `GOLD_COMMODITIES`, `CRYPTO_SPECULATIVE` $\implies \text{'T2\_T3'}$
   - `DEBT_FIXED_INCOME` $\implies \text{'T2\_T3'}$ (or `T0` if marked liquid/overnight)
   - `REAL_ESTATE`, `ALTERNATIVE` $\implies \text{'LOCKED\_ILLIQUID'}$
5. **Rule 5 (Unknown Fallback)**:
   If asset class is unmapped or metadata is contradictory $\implies \text{Horizon} = \text{'UNKNOWN'}$.

#### B. Early-Exit Penalty Rate Precedence
- **Policy Default**: `LIQUIDITY_POLICY_V1.haircuts.FD_EARLY_EXIT_HAIRCUT = 0.02` ($2.0\%$).
- **Precedence**: If holding provides authoritative `earlyExitPenaltyRate` ($\ge 0$), it overrides policy default.
- **Penalty Haircut Realization**:
  When early exit is exercised on accessible holding $h$:
  $$V_{\text{realizable}, h} = V_{\text{base}, h} \cdot (1 - \text{penaltyRate}_h) \cdot (1 - H_{\text{tier}})$$
  $$\text{Invariant: } 0.0 \le V_{\text{realizable}, h} \le V_{\text{base}, h}$$

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
  $$V_{\text{accessible}}^{\text{stressed}} = V_{T0} \cdot (1 - H_{T0}) + V_{T23} \cdot (1 - H_{T23}) + V_{T47} \cdot (1 - H_{T47}) - \sum_{\text{early exit}} V_h \cdot \text{penaltyRate}_h$$
  $$\text{Invariant: } 0.0 \le V_{\text{accessible}}^{\text{stressed}} \le V_{\text{accessible}}$$

---

### 3.3 Recurring Cash-Flow & Essential Burn Contract (C7.5-Q2 Hardened)

#### A. Inflows & Outflows Breakdown
1. **Recurring Monthly Inflows**: $I_{\text{monthly}} \ge 0$.
2. **Authoritative vs Estimated Outflows**:
   - **Case A (Actual Breakdown Provided)**:
     User supplies explicit `essentialBurn`, `debtBurn`, and `discretionaryBurn`:
     $$B_{\text{survival}} = B_{\text{essential}} + B_{\text{debt}}$$
     $$B_{\text{total}} = B_{\text{survival}} + B_{\text{discretionary}}$$
     $$\text{burnSource} = \text{'ACTUAL\_BREAKDOWN'}, \quad \text{essentialBurnIsEstimated} = \text{false}$$
   - **Case B (Only Total Monthly Burn Provided — C7.5-Q2 Fallback)**:
     User supplies only `totalBurn` without category split:
     $$B_{\text{estimated\_essential}} = B_{\text{total}} \cdot \text{DEFAULT\_ESTIMATED\_ESSENTIAL\_BURN\_RATIO} \ (0.70)$$
     $$B_{\text{survival}} = B_{\text{estimated\_essential}} + B_{\text{debt}}$$
     $$\text{burnSource} = \text{'ESTIMATED\_FROM\_TOTAL'}, \quad \text{essentialBurnIsEstimated} = \text{true}$$
     $$\text{warnings.push('ESTIMATED\_ESSENTIAL\_BURN\_RATIO\_APPLIED')}$$
     $$\text{dataQuality.confidenceLevel capped at 'MODERATE'}$$
3. **Invalid / Negative Burn Policy**:
   - If $B_{\text{total}} < 0$ or $B_{\text{survival}} < 0 \implies \text{status: 'INVALID\_INPUT'}$, warning `'NEGATIVE_BURN_INPUT'`.
4. **Net Monthly Cash Flow ($CF_{\text{net}}$)**:
   $$CF_{\text{net}} = I_{\text{monthly}} - B_{\text{total}}$$
5. **Coverage Ratios**:
   $$\text{Income Coverage Ratio} = \begin{cases} \text{null} & \text{if } B_{\text{total}} \le 0 \\ \frac{I_{\text{monthly}}}{B_{\text{total}}} & \text{otherwise} \end{cases}$$
   $$\text{Essential Survival Coverage Ratio} = \begin{cases} \text{null} & \text{if } B_{\text{survival}} \le 0 \\ \frac{I_{\text{monthly}}}{B_{\text{survival}}} & \text{otherwise} \end{cases}$$

#### B. Emergency Runway & Sensitivity Analysis
- **Zero-Burn Boundary Contract**:
  If $B_{\text{survival}} \le 0 \implies \text{all runway outputs} = \text{null}$, `runway.status = 'NO_RECURRING_BURN'`.
- **Runway (Months)**:
  - **Immediate Runway ($R_{T0}$)**: $V_{T0} / B_{\text{survival}}$
  - **Total Accessible Runway ($R_{\text{total}}$)**: $V_{\text{accessible}} / B_{\text{survival}}$
  - **Stressed Accessible Runway ($R_{\text{stressed}}$)**: $V_{\text{accessible}}^{\text{stressed}} / B_{\text{survival}}$
- **Burn Ratio Sensitivity Spectrum (When Estimated)**:
  When `burnSource === 'ESTIMATED_FROM_TOTAL'`:
  - **Low Ratio ($0.50$)**: $R_{\text{low}} = V_{\text{accessible}} / (0.50 \cdot B_{\text{total}} + B_{\text{debt}})$
  - **Base Ratio ($0.70$)**: $R_{\text{base}} = V_{\text{accessible}} / (0.70 \cdot B_{\text{total}} + B_{\text{debt}})$
  - **High Ratio ($0.85$)**: $R_{\text{high}} = V_{\text{accessible}} / (0.85 \cdot B_{\text{total}} + B_{\text{debt}})$

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

### 3.5 Lockup Schedule & Bottleneck Diagnostics

1. **Lockup Chronology & Sorting**:
   - Order locked holdings: $\text{lockEndDate ASC} \to V_i \text{ DESC} \to \text{symbol ASC} \to \text{holdingId ASC}$.
   - Buckets: $<6\text{ Months}$, $6-12\text{ Months}$, $1-3\text{ Years}$, $>3\text{ Years}$ / Undefined.
2. **Deterministic Diagnostic Warnings**:
   - `CRITICAL_LOCKED_ASSET_EXPOSURE`: $P_{\text{locked}} \ge 0.50$.
   - `HIGH_LOCKED_ASSET_EXPOSURE`: $0.30 \le P_{\text{locked}} < 0.50$.
   - `INSUFFICIENT_IMMEDIATE_LIQUIDITY`: $V_{T0} < 1.0 \times B_{\text{survival}}$.
   - `CRITICAL_EMERGENCY_RUNWAY`: $R_{\text{total}} < 3.0 \text{ months}$.
   - `INSUFFICIENT_EMERGENCY_RUNWAY`: $3.0 \le R_{\text{total}} < 6.0 \text{ months}$.
   - `NEGATIVE_MONTHLY_CASH_FLOW`: $CF_{\text{net}} < 0$.
   - `HIGH_UNKNOWN_LIQUIDITY_EXPOSURE`: $P_{\text{unknown}} \ge 0.15$.
   - `COMBINED_STRESS_FAILURE`: $\text{Runway}_{\text{combined}} < 1.0 \text{ month}$.
   - `ESTIMATED_ESSENTIAL_BURN_RATIO_APPLIED`: Triggered when essential burn is estimated from total burn.

---

### 3.6 Composite Liquidity Stress Score & Tier Formulation

$$S_{\text{liq}} = S_{\text{immediate}} (20) + S_{\text{short\_term}} (20) + S_{\text{runway}} (25) + S_{\text{cash\_flow}} (15) + S_{\text{locked\_penalty}} (10) + S_{\text{stress\_resilience}} (10) \quad \in [0, 100]$$

| Score Range | Liquidity Stress Tier | Semantic Meaning |
| :--- | :--- | :--- |
| **$80 - 100$** | `HEALTHY` | Strong liquidity buffer, $>6$ mos runway, self-sustaining cash flow |
| **$60 - 79$** | `WATCH` | Adequate liquidity, moderate locked exposure, runway $3-6$ mos |
| **$40 - 59$** | `STRESSED` | Deficient immediate reserves, runway $<3$ mos under shock |
| **$0 - 39$** | `CRITICAL` | Imminent solvency risk, severe lockup traps, runway $<1$ mo |

---

## 4. Master Versioned Policy (`C7_5_V1`)

```javascript
export const LIQUIDITY_POLICY_VERSION = "C7_5_V1";

export const LIQUIDITY_POLICY_V1 = Object.freeze({
    haircuts: Object.freeze({
        NO_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.0, T4_T7: 0.0, LOCKED: 1.0, UNKNOWN: 1.0 }),
        MODERATE_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.05, T4_T7: 0.15, LOCKED: 1.0, UNKNOWN: 1.0 }),
        SEVERE_HAIRCUT: Object.freeze({ T0: 0.0, T2_T3: 0.15, T4_T7: 0.30, LOCKED: 1.0, UNKNOWN: 1.0 }),
        FD_EARLY_EXIT_HAIRCUT: 0.02 // 2.0% policy default penalty
    }),
    incomeShocks: Object.freeze({
        BASE: 0.0,               // 100% income retained
        MILD_INCOME_SHOCK: 0.25, // 25% loss (75% retained)
        SEVERE_INCOME_SHOCK: 0.50,// 50% loss (50% retained)
        ZERO_INCOME: 1.0         // 100% loss (0% retained)
    }),
    burnEstimation: Object.freeze({
        DEFAULT_ESTIMATED_ESSENTIAL_BURN_RATIO: 0.70,
        LOW_ESTIMATED_ESSENTIAL_BURN_RATIO: 0.50,
        HIGH_ESTIMATED_ESSENTIAL_BURN_RATIO: 0.85
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

    // Stressed Realizable Liquidity (Severe Haircuts & Penalties)
    stressedAccessibleValue: 'FINITE_NUMBER',
    stressedAccessiblePercentage: 'FINITE_NUMBER',

    // Monthly Cash Flow & Burn Analysis (C7.5-Q2)
    monthlyCashFlow: {
        burnSource: 'ACTUAL_BREAKDOWN | ESTIMATED_FROM_TOTAL | UNAVAILABLE',
        essentialBurnIsEstimated: 'BOOLEAN',
        income: 'FINITE_NUMBER',
        actualEssentialBurn: 'FINITE_NUMBER_OR_NULL',
        estimatedEssentialBurn: 'FINITE_NUMBER_OR_NULL',
        debtBurn: 'FINITE_NUMBER',
        survivalBurn: 'FINITE_NUMBER',       // actual/estimated essential + debt
        discretionaryBurn: 'FINITE_NUMBER_OR_NULL',
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
        status: 'RunwayStatus', // 'STRONG' | 'ADEQUATE' | 'WATCH' | 'CRITICAL' | 'RUNWAY_ESTIMATED' | 'NO_RECURRING_BURN' | 'SELF_SUSTAINING'
        sensitivity: {
            runwayLowMonths: 'FINITE_NUMBER_OR_NULL',   // 85% essential burn
            runwayBaseMonths: 'FINITE_NUMBER_OR_NULL',  // 70% essential burn
            runwayHighMonths: 'FINITE_NUMBER_OR_NULL'   // 50% essential burn
        }
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
        topLockedHoldings: 'ARRAY_OF_OBJECTS',
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

## 6. Comprehensive 48-Scenario Acceptance Test Matrix (`tests/test_c75.mjs`)

### Group 1: Liquidity Horizon Classification & Precedence (Tests 1–8)
1. **Empty Portfolio Boundary ($N = 0$)**: Returns `EMPTY_PORTFOLIO` status, zero values, safe nulls, confidence `UNAVAILABLE`.
2. **Single Cash / T+0 Holding**: $100\%$ allocated to `T0`, accessible percentage $1.0$, locked $0.0$.
3. **Fully Liquid Listed Equities Portfolio ($T+2/T+3$)**: $100\%$ allocated to `T2_T3`, accessible percentage $1.0$.
4. **Fully Locked Portfolio (100% Real Estate / PPF)**: Accessible value $0.0$, locked percentage $1.0$, warning `CRITICAL_LOCKED_ASSET_EXPOSURE`.
5. **Mixed 4-Tier Liquidity Portfolio**: Exact allocation across `T0`, `T2_T3`, `T4_T7`, and `LOCKED_ILLIQUID`.
6. **Precedence Contract — Lockup Date over Asset Class**: ELSS holding with future `lockEndDate` classified as `LOCKED_ILLIQUID` (not equity T+2).
7. **Precedence Contract — Expired Lockup Transition**: Holding with `lockEndDate <= asOfDate` transitions to base liquid asset class.
8. **Precedence Contract — Explicit User Override**: Explicit valid `liquidityTier` metadata takes precedence over default taxonomy.

### Group 2: Fixed Deposit & Early-Break Accessibility Contract (C7.5-Q1) (Tests 9–15)
9. **FD Without Early-Exit Metadata**: Mapped strictly to `LOCKED_ILLIQUID` prior to maturity.
10. **FD with `allowEarlyExit=true` but No Accessibility Date**: Resolves conservatively to `LOCKED_ILLIQUID` without date fabrication.
11. **FD Early-Access Date Within $T+2/T+3$**: Classifies as `T2_T3`.
12. **FD Early-Access Date Within $T+4/T+7$**: Classifies as `T4_T7`.
13. **FD Maturity Date Already Reached ($\le \text{asOfDate}$)**: Transitions to `T0` (no longer locked).
14. **FD Policy Default Early-Break Penalty ($2.0\%$)**: Realizable accessible value is discounted by $2.0\%$ penalty haircut.
15. **FD Authoritative Penalty Overriding Policy Default**: Explicit $1.0\%$ penalty in metadata overrides policy default.

### Group 3: Unrepresented & Unknown Liquidity Handling (Tests 16–19)
16. **Explicit Unknown Liquidity Classification**: Missing metadata resolves to `UNKNOWN`, accessible value excludes unknown capital.
17. **`HIGH_UNKNOWN_LIQUIDITY_EXPOSURE` Diagnostic**: Triggered when $P_{\text{unknown}} \ge 0.15$.
18. **Zero Manufactured Liquidity Invariant**: Unknown assets never converted to T0 or T2.
19. **Negative / Non-Finite Valuation Input Rejection**: Invalid valuations produce `INVALID_INPUT` status.

### Group 4: Liquidity Haircut Stress Modeling (Tests 20–24)
20. **No Haircut Base Valuation**: Stressed accessible value equals base accessible value.
21. **Moderate Haircut Application**: $5\%$ haircut on T2/T3, $15\%$ on T4/T7, $0\%$ on T0.
22. **Severe Haircut Application**: $15\%$ haircut on T2/T3, $30\%$ on T4/T7, $0\%$ on T0.
23. **Haircut Non-Negativity & Boundedness Invariant**: Stressed liquidity value $\ge 0.0$ and $\le$ base value.
24. **Locked Asset Exclusion under Haircut**: Locked assets yield $0.0$ realized accessible liquidity under all haircut policies.

### Group 5: Recurring Cash-Flow & Essential Burn Estimation (C7.5-Q2) (Tests 25–31)
25. **Actual Expense Breakdown Mode**: Authoritative user-supplied essential burn yields `burnSource: 'ACTUAL_BREAKDOWN'`.
26. **Estimated Essential Burn from Total Burn ($70\%$)**: Unsplit total burn derives $0.70 \times B_{\text{total}}$ with `ESTIMATED_ESSENTIAL_BURN_RATIO_APPLIED`.
27. **Confidence Degradation from Estimated Burn**: Confidence capped at `MODERATE` when burn is estimated.
28. **Runway Sensitivity Spectrum ($50\%, 70\%, 85\%$)**: `runwayLow`, `runwayBase`, `runwayHigh` calculated accurately.
29. **Zero Monthly Burn Boundary**: $B_{\text{survival}} = 0 \implies \text{runway} = \text{null}$, status `'NO_RECURRING_BURN'`.
30. **Negative Monthly Burn Input Rejection**: Negative expenses produce `INVALID_INPUT` and `'NEGATIVE_BURN_INPUT'` warning.
31. **Income Coverage & Survival Coverage Ratios**: Exact closed-form ratio calculations.

### Group 6: Multi-Scenario Stress Testing Matrix (Tests 32–36)
32. **`BASE` Scenario Evaluation**: $100\%$ income + $0\%$ haircut baseline.
33. **`INCOME_SHOCK_ONLY` Scenario Evaluation**: $50\%$ income reduction accelerates liquidity burn.
34. **`PORTFOLIO_HAIRCUT_ONLY` Scenario Evaluation**: Reduced capital pool under severe liquidation discount.
35. **`COMBINED_SEVERE_STRESS` Scenario Evaluation**: Zero income + severe haircuts yields worst-case survival duration.
36. **Self-Sustaining Scenario State**: Positive net cash flow produces `'SELF_SUSTAINING'` status for scenario runway.

### Group 7: Lockup Schedule & Bottleneck Diagnostics (Tests 37–40)
37. **ELSS 3-Year Lockup Schedule Breakdown**: Locked amounts categorized into $<6\text{M}$, $6-12\text{M}$, $1-3\text{Y}$, $>3\text{Y}$.
38. **Top Locked Holding Isolation & Tie-Breaking**: Earliest unlock date $\to$ Largest value $\to$ Alphabetical.
39. **`CRITICAL_LOCKED_ASSET_EXPOSURE` Diagnostic**: Triggered when $P_{\text{locked}} \ge 0.50$.
40. **`INSUFFICIENT_IMMEDIATE_LIQUIDITY` Diagnostic**: Triggered when $V_{T0} < 1.0 \times B_{\text{survival}}$.

### Group 8: Composite Liquidity Stress Score & Tiers (Tests 41–44)
41. **Maximum Liquidity Score ($100/100$)**: Fully liquid, large buffer, positive cash flow $\implies \text{'HEALTHY'}$.
42. **Watch Tier Boundary ($60 - 79$)**: Moderate runway / locked exposure evaluates cleanly.
43. **Stressed Tier Boundary ($40 - 59$)**: High locked exposure and short runway evaluates to `'STRESSED'`.
44. **Critical Tier Boundary ($< 40$)**: Severe illiquidity trap evaluates to `'CRITICAL'`.

### Group 9: Determinism, Quality, AST Scan & Read-Only Safety (Tests 45–48)
45. **Mandatory Deterministic `asOfDate` Enforced**: Missing/invalid `asOfDate` throws error.
46. **AST Wall-Clock Scan**: 0 `Date.now()` and 0 argument-less `new Date()` in `liquidityStressEngine.js`.
47. **Deep 5-Store Read-Only Safety Guard**: Verified 100% zero state mutations across all 5 stores.
48. **Full Master System Regression Preservation**: 383/383 previous system tests pass with zero regressions.

---

## 7. Status of Architectural Questions

- **`C7.5-Q1` (FD Early-Break Treatment)**: **RESOLVED**. Distinct contracts established for maturity date arrival ($\le \text{asOfDate}$), early-exit eligibility with authoritative accessibility date, conservative fallback when date is unspecified, and explicit penalty haircut precedence ($2.0\%$ policy default vs authoritative holding override).
- **`C7.5-Q2` (Unsplit Recurring Burn)**: **RESOLVED**. $70\%$ ratio is strictly versioned in `LIQUIDITY_POLICY_V1.burnEstimation`, explicitly tagged as `ESTIMATED_FROM_TOTAL`, caps confidence at `MODERATE`, triggers `ESTIMATED_ESSENTIAL_BURN_RATIO_APPLIED`, and reports low/base/high sensitivity spectrum ($50\%, 70\%, 85\%$) without probabilistic guessing.

---

## 8. Repository Boundary & Gate Status

- **Certified Baseline**: [`578040f`](https://github.com/Nreddy2020/finapp-mobile/commit/578040f) (Stage C.7.4 Master Certified).
- **Files Modified in this step**:
  - `docs/C7_5_ARCHITECTURE_PLAN.md` (REMEDIATED)
  - `docs/AI_PROJECT_STATE.md` (MODIFIED)
- **Implementation Files Created**: **0** 🔒 (Zero-Code Gate Active).
- **Frozen Financial Engines Modified**: **0** 🔒 (`services/` diff is 100% clean).
