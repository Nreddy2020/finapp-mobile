# Stage C.7.5 Architecture Plan: Liquidity & Cash-Flow Stress Engine

**Stage**: C.7.5  
**Phase**: C.7 (Portfolio Intelligence, Risk Diagnostics & Stress Testing)  
**Status**: ARCHITECTURE FINAL HARDENING COMPLETE — ZERO-CODE GATE ACTIVE 🔒  
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

## 2. Authoritative Liquidity Taxonomy & Precedence Contract (C7.5-R3)

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

### 2.2 Strict Authority Hierarchy & Override Safety (C7.5-R3)

To ensure that user declarations cannot bypass legally binding or contractual liquidity restrictions, the engine enforces a strict 5-tier authority hierarchy:

```
1. REGULATORY_CONSTRAINT (Highest Authority — Statutory Lockups: ELSS 3-Year, PPF 15-Year, EPF)
        ↓
2. AUTHORITATIVE_PRODUCT_METADATA (Contractual Lockup: Active FD Maturity, Bond Lockup, Early Exit Terms)
        ↓
3. DERIVED_ASSET_CLASS (Certified C.7.1 DEFAULT_ASSET_LIQUIDITY_MAP)
        ↓
4. USER_DECLARED_METADATA (User-Supplied Tier Annotation on Unrestricted Assets)
        ↓
5. POLICY_DEFAULT (Conservative Fallback: UNKNOWN / LOCKED)
```

#### Authority Enforcement Rules:
1. **Higher Authority Wins**: Lower-authority information **MUST NEVER** override a higher-authority constraint.
2. **User Override Safety**: If a user declares an asset as liquid (e.g. `userLiquidityTier: 'T0'`), but the asset is under statutory lockup (e.g. ELSS within 3 years) or contractual maturity (FD pre-maturity without early exit):
   - The asset remains strictly `LOCKED_ILLIQUID`.
   - `liquidityClassificationSource` is recorded as `REGULATORY_CONSTRAINT` or `AUTHORITATIVE_PRODUCT_METADATA`.
   - `overrideApplied` is `false`.
3. **Valid User Override Application**: A user declaration is applied **ONLY** when no higher regulatory or contractual restriction exists (e.g. clarifying an otherwise unmapped private asset). In this case:
   - `liquidityClassificationSource = 'USER_DECLARED_METADATA'`
   - `overrideApplied = true`

---

### 2.3 FD Maturity & Early-Break Accessibility Contract (C7.5-R4)

Maturity and accessibility are treated as distinct concepts. The engine enforces the following deterministic rules for Fixed Deposits and maturity-bound instruments:

#### A. Pre-Maturity Contract ($\text{maturityDate} > \text{asOfDateISO}$)
1. **Case A1 (No Early Exit Allowed)**:
   If `allowEarlyExit !== true` $\implies \text{Horizon} = \text{'LOCKED\_ILLIQUID'}$.
2. **Case A2 (Early Exit Allowed with Authoritative Settlement Date)**:
   If `allowEarlyExit === true`:
   - If explicit `earlyExitDate` or `liquidityDate` is provided:
     - $\text{daysToAccess} \le 0 \implies \text{'T0'}$
     - $1 \le \text{daysToAccess} \le 3 \implies \text{'T2\_T3'}$
     - $4 \le \text{daysToAccess} \le 7 \implies \text{'T4\_T7'}$
     - $\text{daysToAccess} > 7 \implies \text{'LOCKED\_ILLIQUID'}$
   - If `allowEarlyExit === true` but early-exit availability date is unknown $\implies \text{Horizon} = \text{'LOCKED\_ILLIQUID'}$ (Conservative; zero date fabrication).

#### B. Matured Instrument Contract ($\text{maturityDate} \le \text{asOfDateISO}$)
When maturity has arrived, the instrument is **no longer locked**:
1. If authoritative accessibility metadata specifies `T0` (e.g. auto-sweep savings transfer) $\implies \text{'T0'}$.
2. If authoritative accessibility metadata specifies `T2_T3` (e.g. corporate FD payout cycle) $\implies \text{'T2\_T3'}$.
3. If accessibility metadata is unavailable $\implies$ Fallback to `LIQUIDITY_POLICY_V1.defaults.MATURED_FD_FALLBACK_TIER = 'T2_T3'` (Conservative rolling settlement; never fabricate T0).

#### C. Early-Exit Penalty Rate Precedence
- **Policy Default**: `LIQUIDITY_POLICY_V1.haircuts.FD_EARLY_EXIT_HAIRCUT = 0.02` ($2.0\%$).
- **Precedence**: Authoritative holding `earlyExitPenaltyRate` takes precedence over policy default.
- **Realizable Accessible Value**:
  $$V_{\text{realizable}, h} = V_{\text{base}, h} \cdot (1 - \text{penaltyRate}_h) \cdot (1 - H_{\text{tier}}) \ge 0.0$$

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

### 3.3 Recurring Cash-Flow & Essential Burn Estimation Contract (C7.5-R6)

#### A. Inflows & Outflows Breakdown
1. **Recurring Monthly Inflows**: $I_{\text{monthly}} \ge 0$.
2. **Authoritative vs Estimated Outflows**:
   - **Case A (Actual Breakdown Provided)**:
     User supplies explicit `essentialBurn`, `debtBurn`, and `discretionaryBurn`:
     $$B_{\text{survival}} = B_{\text{essential}} + B_{\text{debt}}$$
     $$B_{\text{total}} = B_{\text{survival}} + B_{\text{discretionary}}$$
     $$\text{burnSource} = \text{'ACTUAL\_BREAKDOWN'}, \quad \text{essentialBurnIsEstimated} = \text{false}$$
   - **Case B (Only Total Monthly Burn Provided — Fallback)**:
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

### 3.6 Composite Liquidity Stress Score & Tier Formulation (C7.5-R5)

The **Liquidity Stress Score ($S_{\text{liq}} \in [0.0, 100.0]$)** is an immutable closed-form composite metric:

$$S_{\text{liq}} = S_{\text{immediate}} (20) + S_{\text{short\_term}} (20) + S_{\text{runway}} (25) + S_{\text{cash\_flow}} (15) + S_{\text{locked\_penalty}} (10) + S_{\text{stress\_resilience}} (10)$$

#### Exact Component Formulations:
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

#### Exact Closed-Interval Tier Boundaries:
| Score Interval | Liquidity Stress Tier | Semantic Meaning | Recommended Action |
| :--- | :--- | :--- | :--- |
| **$80.0 \le S_{\text{liq}} \le 100.0$** | `HEALTHY` | Strong liquidity buffer, $>6$ mos runway, self-sustaining | Maintain current liquidity profile |
| **$60.0 \le S_{\text{liq}} < 80.0$** | `WATCH` | Adequate liquidity, moderate locked exposure, runway $3-6$ mos | Monitor recurring burn; limit new lockups |
| **$40.0 \le S_{\text{liq}} < 60.0$** | `STRESSED` | Deficient immediate reserves, runway $<3$ mos under shock | Build T+0 emergency buffer; curtail discretionary burn |
| **$0.0 \le S_{\text{liq}} < 40.0$** | `CRITICAL` | Imminent solvency risk, severe lockup traps, runway $<1$ mo | Urgent liquidity reallocation required |

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
    defaults: Object.freeze({
        MATURED_FD_FALLBACK_TIER: 'T2_T3'
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
        HEALTHY_MIN: 80.0,
        WATCH_MIN: 60.0,
        STRESSED_MIN: 40.0
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

    // Monthly Cash Flow & Burn Analysis (C7.5-R6)
    monthlyCashFlow: {
        burnSource: 'ACTUAL_BREAKDOWN | ESTIMATED_FROM_TOTAL | UNAVAILABLE',
        essentialBurnIsEstimated: 'BOOLEAN',
        income: 'FINITE_NUMBER',
        actualEssentialBurn: 'FINITE_NUMBER_OR_NULL',
        estimatedEssentialBurn: 'FINITE_NUMBER_OR_NULL',
        debtBurn: 'FINITE_NUMBER',
        survivalBurn: 'FINITE_NUMBER',
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

    // Classification Source & Breakdown Per Holding
    holdingsLiquidityBreakdown: 'ARRAY_OF_OBJECTS', // { holdingId, symbol, value, liquidityTier, liquidityClassificationSource, overrideApplied, daysToAccess }

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
    stressScore: 'FINITE_NUMBER', // [0.0, 100.0]
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

## 6. Comprehensive 52-Scenario Acceptance Test Matrix (`tests/test_c75.mjs`)

### Group 1: Authoritative Precedence & User Override Safety (C7.5-R3 & C7.5-R7) (Tests 1–6)
1. **User Declares Statutory ELSS as Liquid**: Statutory lockup wins $\implies \text{LOCKED\_ILLIQUID}$, `liquidityClassificationSource: 'REGULATORY_CONSTRAINT'`, `overrideApplied: false`.
2. **User Declares Pre-Maturity FD as Liquid**: Contractual maturity wins $\implies \text{LOCKED\_ILLIQUID}$, `liquidityClassificationSource: 'AUTHORITATIVE_PRODUCT_METADATA'`, `overrideApplied: false`.
3. **User Declares Early Exit Available (Contract Disallows)**: Authoritative metadata disallowing early exit wins $\implies \text{LOCKED\_ILLIQUID}$.
4. **Valid User Override on Unrestricted Private Holding**: User declaration applied cleanly, `overrideApplied: true`, `liquidityClassificationSource: 'USER_DECLARED_METADATA'`.
5. **DTO Exposes Classification Source Per Holding**: Every holding contains explicit `liquidityClassificationSource`.
6. **Precedence Hierarchy Repeatability**: Deterministic evaluation produces identical classification source across repeated runs.

### Group 2: FD Maturity & Early-Break Accessibility Contract (C7.5-R4 & C7.5-R8) (Tests 7–16)
7. **FD Before Maturity ($\text{maturityDate} > \text{asOfDate}$)**: Evaluates strictly to `LOCKED_ILLIQUID`.
8. **FD Exactly on Maturity Date ($\text{maturityDate} = \text{asOfDate}$)**: Evaluates as matured (no longer locked).
9. **FD After Maturity Date ($\text{maturityDate} < \text{asOfDate}$)**: Evaluates as matured (no longer locked).
10. **Matured FD with Authoritative $T+0$ Accessibility**: Evaluates to `T0`.
11. **Matured FD with Authoritative $T+2/T+3$ Accessibility**: Evaluates to `T2_T3`.
12. **Matured FD with Unavailable Accessibility Metadata**: Resolves to policy fallback `T2_T3` (never fabricates T0).
13. **Early-Exit FD with Explicit $T+2/T+3$ Accessibility**: Evaluates to `T2_T3`.
14. **Early-Exit FD with Explicit $T+4/T+7$ Accessibility**: Evaluates to `T4_T7`.
15. **Early-Exit FD with Missing Accessibility Date**: Resolves conservatively to `LOCKED_ILLIQUID`.
16. **Policy Default ($2.0\%$) vs Authoritative Penalty Precedence**: Authoritative $1.0\%$ penalty overrides policy default.

### Group 3: Liquidity Horizon Decompositions (Tests 17–21)
17. **Empty Portfolio Boundary ($N = 0$)**: Returns `EMPTY_PORTFOLIO` status, zero values, safe nulls, confidence `UNAVAILABLE`.
18. **Single Cash / T+0 Holding**: $100\%$ allocated to `T0`, accessible percentage $1.0$, locked $0.0$.
19. **Fully Liquid Listed Equities Portfolio ($T+2/T+3$)**: $100\%$ allocated to `T2_T3`, accessible percentage $1.0$.
20. **Fully Locked Portfolio (100% Real Estate / PPF)**: Accessible value $0.0$, locked percentage $1.0$, warning `CRITICAL_LOCKED_ASSET_EXPOSURE`.
21. **Mixed 4-Tier Liquidity Portfolio**: Exact allocation across `T0`, `T2_T3`, `T4_T7`, and `LOCKED_ILLIQUID`.

### Group 4: Unrepresented & Unknown Liquidity Handling (Tests 22–25)
22. **Explicit Unknown Liquidity Classification**: Missing metadata resolves to `UNKNOWN`, accessible value excludes unknown capital.
23. **`HIGH_UNKNOWN_LIQUIDITY_EXPOSURE` Diagnostic**: Triggered when $P_{\text{unknown}} \ge 0.15$.
24. **Zero Manufactured Liquidity Invariant**: Unknown assets never converted to T0 or T2.
25. **Negative / Non-Finite Valuation Input Rejection**: Invalid valuations produce `INVALID_INPUT` status.

### Group 5: Liquidity Haircut Stress Modeling (Tests 26–30)
26. **No Haircut Base Valuation**: Stressed accessible value equals base accessible value.
27. **Moderate Haircut Application**: $5\%$ haircut on T2/T3, $15\%$ on T4/T7, $0\%$ on T0.
28. **Severe Haircut Application**: $15\%$ haircut on T2/T3, $30\%$ on T4/T7, $0\%$ on T0.
29. **Haircut Non-Negativity & Boundedness Invariant**: Stressed liquidity value $\ge 0.0$ and $\le$ base value.
30. **Locked Asset Exclusion under Haircut**: Locked assets yield $0.0$ realized accessible liquidity under all haircut policies.

### Group 6: Recurring Cash-Flow & Essential Burn Estimation (C7.5-R6) (Tests 31–37)
31. **Actual Expense Breakdown Mode**: Authoritative user-supplied essential burn yields `burnSource: 'ACTUAL_BREAKDOWN'`.
32. **Estimated Essential Burn from Total Burn ($70\%$)**: Unsplit total burn derives $0.70 \times B_{\text{total}}$ with `ESTIMATED_ESSENTIAL_BURN_RATIO_APPLIED`.
33. **Confidence Degradation from Estimated Burn**: Confidence capped at `MODERATE` when burn is estimated.
34. **Runway Sensitivity Spectrum ($50\%, 70\%, 85\%$)**: `runwayLow`, `runwayBase`, `runwayHigh` calculated accurately.
35. **Zero Monthly Burn Boundary**: $B_{\text{survival}} = 0 \implies \text{runway} = \text{null}$, status `'NO_RECURRING_BURN'`.
36. **Negative Monthly Burn Input Rejection**: Negative expenses produce `INVALID_INPUT` and `'NEGATIVE_BURN_INPUT'` warning.
37. **Income Coverage & Survival Coverage Ratios**: Exact closed-form ratio calculations.

### Group 7: Multi-Scenario Stress Testing Matrix (Tests 38–42)
38. **`BASE` Scenario Evaluation**: $100\%$ income + $0\%$ haircut baseline.
39. **`INCOME_SHOCK_ONLY` Scenario Evaluation**: $50\%$ income reduction accelerates liquidity burn.
40. **`PORTFOLIO_HAIRCUT_ONLY` Scenario Evaluation**: Reduced capital pool under severe liquidation discount.
41. **`COMBINED_SEVERE_STRESS` Scenario Evaluation**: Zero income + severe haircuts yields worst-case survival duration.
42. **Self-Sustaining Scenario State**: Positive net cash flow produces `'SELF_SUSTAINING'` status for scenario runway.

### Group 8: Liquidity Stress Score & Tier Boundary Inclusivity (C7.5-R5 & C7.5-R9) (Tests 43–48)
43. **Score = 100.0 $\implies$ HEALTHY**: Top tier evaluation.
44. **Score = 80.0 $\implies$ HEALTHY**: Exact lower boundary of Healthy tier.
45. **Score = 79.99 $\implies$ WATCH**: Exact upper boundary of Watch tier.
46. **Score = 60.0 $\implies$ WATCH & Score = 59.99 $\implies$ STRESSED**: Watch/Stressed boundary transition.
47. **Score = 40.0 $\implies$ STRESSED & Score = 39.99 $\implies$ CRITICAL**: Stressed/Critical boundary transition.
48. **Score Boundedness $[0.0, 100.0]$**: Score cannot fall below 0 or exceed 100.

### Group 9: Determinism, Quality, AST Scan & Read-Only Safety (Tests 49–52)
49. **Mandatory Deterministic `asOfDate` Enforced**: Missing/invalid `asOfDate` throws error.
50. **AST Wall-Clock Scan**: 0 `Date.now()` and 0 argument-less `new Date()` in `liquidityStressEngine.js`.
51. **Deep 5-Store Read-Only Safety Guard**: Verified 100% zero state mutations across all 5 stores.
52. **Full Master System Regression Preservation**: 383/383 previous system tests pass with zero regressions.

---

## 7. Status of Architectural Decisions

- **`C7.5-R3` (Liquidity Authority Hierarchy)**: **LOCKED**. 5-tier hierarchy enforces `REGULATORY_CONSTRAINT` and `AUTHORITATIVE_PRODUCT_METADATA` over user declarations.
- **`C7.5-R4` (FD Maturity & Accessibility)**: **LOCKED**. Pre-maturity and matured contracts cleanly separated with policy fallback `T2_T3` when accessibility metadata is unavailable.
- **`C7.5-R5` (Liquidity Stress Score Governance)**: **LOCKED**. Formula, component weightings, and exact closed-interval tier boundaries ($80+, 60-80, 40-60, <40$) versioned in `LIQUIDITY_POLICY_V1`.
- **`C7.5-R6` (Estimated Burn Score & Confidence Impact)**: **LOCKED**. Estimated burn caps confidence at `MODERATE`, triggers diagnostic warning, and provides low/base/high sensitivity metrics.

---

## 8. Repository Boundary & Gate Status

- **Certified Baseline**: [`578040f`](https://github.com/Nreddy2020/finapp-mobile/commit/578040f) (Stage C.7.4 Master Certified).
- **Files Modified in this step**:
  - `docs/C7_5_ARCHITECTURE_PLAN.md` (HARDENED)
  - `docs/AI_PROJECT_STATE.md` (MODIFIED)
- **Implementation Files Created**: **0** 🔒 (Zero-Code Gate Active).
- **Frozen Financial Engines Modified**: **0** 🔒 (`services/` diff is 100% clean).
