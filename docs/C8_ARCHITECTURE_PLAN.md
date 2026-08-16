# Master Architectural Plan: Phase C.8 Goal Planning & Decision Intelligence Engine

**Document Version**: `1.1.0`  
**Master Standard Identifier**: `C8_V1`  
**Phase**: C.8 (Goal Planning, Lifecycle Wealth Projection & Next Best Action Decision Intelligence)  
**Certified Baseline**: [`7e71b8d`](https://github.com/Nreddy2020/finapp-mobile/commit/7e71b8d) (Phase C.7 Master Certified & Closed)  
**State Coordination Commit**: [`6c645c2`](https://github.com/Nreddy2020/finapp-mobile/commit/6c645c2)  
**Branch**: `fintech-using-chatgpt`  
**Zero-Code Gate**: `ACTIVE 🔒` (Architecture Plan ONLY — Zero Implementation/Component/Test Code)  

---

## 1. Executive Scope & Responsibility Boundary

### 1.1 Phase Objective
> *"Given the user's goals, financial position, portfolio diagnostics, cash-flow constraints, taxes, and risk profile, deterministically identify, rank, simulate, and explain the highest-value financial actions."*

Phase C.8 establishes a pure, evidence-based decision intelligence pipeline that bridges certified diagnostic outputs (`C.4` through `C.7`) with real-world user lifecycle goals.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 CERTIFIED FINANCIAL TRUTH & DIAGNOSTICS LAYER               │
│                                                                             │
│   Phase C.4: Valuation & Returns (WAC, XIRR, FIFO Lots)         [Certified] │
│   Phase C.6: Target Allocation & Tax-Optimized Rebalancing      [Certified] │
│   Phase C.7: Multi-Factor Risk, Liquidity, Stress & Health      [Certified] │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Authoritative DTOs (0 Recalculation)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 PHASE C.8: GOALS & DECISION INTELLIGENCE PIPELINE           │
│                                                                             │
│   Stage C.8.1: Goal Schema, Priority Hierarchy & Inflation Policy           │
│                                      ↓                                      │
│   Stage C.8.2: Goal Funding, Inflation Adjustments & Wealth Projection      │
│                                      ↓                                      │
│   Stage C.8.3: Target-Date Glidepath & Goal Asset Allocation Engine         │
│                                      ↓                                      │
│   Stage C.8.4: Cross-Domain Opportunity & Vulnerability Aggregator          │
│                                      ↓                                      │
│   Stage C.8.5: Next Best Action Prioritization Engine                       │
│                                      ↓                                      │
│   Stage C.8.6: Action Impact Simulator ("Before vs After" Simulation)       │
│                                      ↓                                      │
│   Stage C.8.7: Decision Intelligence Presentation Adapter                   │
│                                      ↓                                      │
│   Stage C.8.8: Goal Planning & Financial Action Command Center UI           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Core Architectural Invariant: *"Calculate once. Authoritatively. Aggregate once. Score once. Explain once. Decide once."*
1. **Zero Upstream Recalculation**: C.8 components and services MUST NOT calculate HHI, volatility, drawdown, VaR/CVaR, correlation, PCA, liquidity tiers, runway months, scenario stress loss percentages, reverse stress multipliers, health scores, health grades, or realized tax lots.
2. **Certified Engine Delegation**: In Stage C.8.6 (Action Impact Simulator), hypothetical portfolio states are cloned in memory and passed directly to certified upstream engines (`concentrationEngine`, `volatilityDrawdownEngine`, `correlationEngine`, `liquidityEngine`, `scenarioStressEngine`, `portfolioHealthScoreEngine`) to evaluate post-action metrics authoritatively.
3. **Recommendation $\neq$ Execution Separation**: C.8 produces actionable advice with full evidence traceability and manages action lifecycle states (`IDENTIFIED` $\to$ `COMPLETED`), but does not place broker orders or execute transactions.
4. **Pure Hypothetical Simulation**: Simulations in C.8.6 evaluate virtual in-memory clones and never mutate database stores.
5. **Deterministic Purity**: All calculations require an explicit caller `asOfDate`. Zero `Date.now()`, zero argument-less `new Date()`, zero unseeded randomness.

---

## 2. Mathematical Contracts & Stage Specifications (C.8.1 through C.8.8)

### Stage C.8.1: Goal Schema, Priority Hierarchy & Inflation Planning Policy (`services/goalPlanningEngine.js`)

#### 1. Goal Schema Definition
```typescript
export interface FinancialGoalDTO {
  goalId: string;
  name: string;
  category: 'RETIREMENT' | 'HOME_PURCHASE' | 'CHILD_EDUCATION' | 'EMERGENCY_FUND' | 'VEHICLE' | 'WEALTH_CREATION' | 'CUSTOM';
  priorityTier: 'CRITICAL_TIER_1' | 'HIGH_TIER_2' | 'MEDIUM_TIER_3' | 'LOW_TIER_4';
  targetDate: string; // ISO YYYY-MM-DD
  targetCorpusNominal: number; // In today's Rupee cost (C_today > 0)
  inflationRate: number | null; // Specific rate (e.g. 0.06), or null to use category policy
  allocatedHoldingIds: string[]; // Linked holding IDs
  allocatedCashAmount: number; // Dedicated cash allocation
  monthlyContribution: number; // Dedicated monthly SIP amount (>= 0)
  status: GoalFundingStatus;
}
```

#### 2. Deterministic Priority Resolution & Precedence Hierarchy (`C8-R1`)
When monthly savings capacity or capital is constrained, capital is allocated strictly via a **4-Tier Priority Waterfall**:
1. **`CRITICAL_TIER_1` (Survival & Resilience)**: Emergency Fund (target 6–12 months recurring expenses), High-Interest Debt elimination.
2. **`HIGH_TIER_2` (Core Non-Negotiable Lifecycle Goals)**: Retirement Corpus, Primary Residence.
3. **`MEDIUM_TIER_3` (Major Life Milestones)**: Child Higher Education, Marriage.
4. **`LOW_TIER_4` (Discretionary & Wealth Accumulation)**: Vacation, Luxury Vehicle, Speculative Wealth Creation.

**Deterministic Multi-Goal Precedence & Tie-Breaking Order**:
\[
\text{Priority Tier ASC (Tier 1} \to \text{Tier 4)} \longrightarrow \text{Target Date ASC (Sooner} \to \text{Later)} \longrightarrow \text{Funded Ratio ASC (Less Funded} \to \text{More Funded)} \longrightarrow \text{goalId ASC}
\]

- Fully funded / overfunded goals ($\text{FR} \ge 1.0$) are automatically excluded from savings contention to prioritize underfunded goals.
- Overdue goals ($T \le \text{asOfDate}$) are assigned status `PAST_DUE` and flagged for urgent reconciliation.

#### 3. Closed-Form Inflation Policy Contract (`C8-R2`)
For each goal with horizon $t = \frac{\text{targetDate} - \text{asOfDate}}{365.25}$ years:
- **Inflation Rate Resolution**:
  \[
  i_{\text{eff}} = \begin{cases}
  i_{\text{user}} & \text{if } i_{\text{user}} \text{ is provided and } 0.0 \le i_{\text{user}} \le 0.25 \\
  0.08 & \text{if category is } \text{CHILD_EDUCATION} \text{ (Education Inflation Policy)} \\
  0.08 & \text{if category is } \text{HEALTHCARE} \text{ (Medical Inflation Policy)} \\
  0.06 & \text{default category standard (General Macro Inflation Policy)}
  \end{cases}
  \]
- **Future Inflation-Adjusted Required Corpus ($C_{\text{future}}$)**:
  \[
  C_{\text{future}} = \begin{cases}
  C_{\text{today}} \times (1 + i_{\text{eff}})^t & \text{if } t > 0 \\
  C_{\text{today}} & \text{if } t \le 0 \text{ (Past Due Boundary)}
  \end{cases}
  \]
- **Zero Inflation Invariant**: If $i_{\text{eff}} = 0.0$, $C_{\text{future}} = C_{\text{today}}$ exactly.

---

### Stage C.8.2: Goal Funding, Inflation Adjustments & Wealth Projection Engine (`services/wealthProjectionEngine.js`)

#### 1. Versioned Wealth Projection Policy (`C8-R3`)
Policy Identifier: `C8_WEALTH_PROJECTION_V1`

**Deterministic Nominal Expected Annual Return by Canonical Asset Class ($r_c$)**:
| Canonical Asset Class | Expected Nominal Return ($r_c$) |
| :--- | :--- |
| `STOCK` | $12.0\%$ p.a. |
| `MUTUAL_FUND` | $11.0\%$ p.a. |
| `ETF` | $11.0\%$ p.a. |
| `GOLD` | $8.0\%$ p.a. |
| `BOND` | $7.0\%$ p.a. |
| `REAL_ESTATE` | $9.0\%$ p.a. |
| `CRYPTO` | $10.0\%$ p.a. |
| `OTHER` / `CASH` | $5.0\%$ p.a. |

**Effective Goal Portfolio Expected Return ($r_{\text{eff}}$)**:
\[
r_{\text{eff}} = \sum_{j} w_j \cdot r_{c(j)}, \quad \text{clamped to } [0.0, 0.25]
\]
Monthly equivalent return: $r_m = (1 + r_{\text{eff}})^{1/12} - 1$.

#### 2. Exact SIP Gap & Terminal Wealth Closed-Form Mathematics (`C8-R4`)
For a goal with current allocated corpus $P = V_{\text{goal}}$, monthly SIP contribution $\text{SIP}$, and horizon $t$ years ($N = \lfloor 12t \rfloor$ months):
1. **Future Value of Current Corpus ($FV_{\text{current}}$)**:
   \[
   FV_{\text{current}} = P \times (1 + r_{\text{eff}})^t
   \]
2. **Future Value of Recurring SIP ($FV_{\text{SIP}}$)**:
   \[
   FV_{\text{SIP}} = \begin{cases}
   \text{SIP} \times \left[ \frac{(1 + r_m)^N - 1}{r_m} \right] \times (1 + r_m) & \text{if } r_m > 0 \\
   \text{SIP} \times N & \text{if } r_m = 0 \text{ (Zero-Rate Boundary)}
   \end{cases}
   \]
3. **Projected Terminal Wealth ($V_{\text{terminal}}$)**:
   \[
   V_{\text{terminal}} = FV_{\text{current}} + FV_{\text{SIP}}
   \]
4. **Funding Gap ($\Delta C$) & Funded Ratio ($\text{FR}$)**:
   \[
   \text{FR} = \frac{V_{\text{terminal}}}{C_{\text{future}}}, \quad \Delta C = \max(0, C_{\text{future}} - V_{\text{terminal}})
   \]
5. **Required Monthly Savings Contribution ($\text{SIP}_{\text{required}}$)**:
   \[
   \text{SIP}_{\text{required}} = \begin{cases}
   \max\left(0, \frac{C_{\text{future}} - FV_{\text{current}}}{\left[ \frac{(1 + r_m)^N - 1}{r_m} \right] \times (1 + r_m)}\right) & \text{if } r_m > 0 \text{ and } N > 0 \\
   \max\left(0, \frac{C_{\text{future}} - FV_{\text{current}}}{N}\right) & \text{if } r_m = 0 \text{ and } N > 0 \\
   \max(0, C_{\text{future}} - FV_{\text{current}}) & \text{if } N = 0
   \end{cases}
   \]
6. **SIP Shortfall Delta ($\Delta \text{SIP}$)**:
   \[
   \Delta \text{SIP} = \max(0, \text{SIP}_{\text{required}} - \text{SIP})
   \]

#### 3. Authoritative Goal Funding State Machine (`C8-R11`)
| Status | Mathematical Trigger Condition | Operational Meaning |
| :--- | :--- | :--- |
| `PAST_DUE` | $t \le 0$ and $V_{\text{goal}} < C_{\text{today}}$ | Goal target date has elapsed with unmet target corpus. |
| `OVERFUNDED` | $\text{FR} \ge 1.20$ | Projected wealth exceeds future target corpus by $\ge 20\%$. |
| `FULLY_FUNDED` | $1.00 \le \text{FR} < 1.20$ | Projected wealth satisfies $100\%\text{--}119\%$ of future target corpus. |
| `ON_TRACK` | $0.85 \le \text{FR} < 1.00$ | Minor shortfall ($\le 15\%$), readily resolvable with minor SIP adjustments. |
| `AT_RISK` | $0.60 \le \text{FR} < 0.85$ | Moderate shortfall ($15\%\text{--}40\%$), requires rebalancing or increased savings. |
| `UNDERFUNDED` | $0.0 < \text{FR} < 0.60$ | Severe shortfall ($>40\%$), critical gap requiring restructuring. |
| `NOT_STARTED` | $V_{\text{goal}} = 0$ and $\text{SIP} = 0$ | No current corpus or monthly savings allocated to goal. |

---

### Stage C.8.3: Target-Date Asset Allocation Glidepath Engine (`services/goalGlidepathService.js`)

#### 1. Glidepath vs C.6 Allocation Authority Boundary (`C8-R5`)
- `services/targetAllocationService.js` (C.6.1) remains the sole authoritative source of the user's active portfolio target weights.
- `goalGlidepathService.js` computes a **goal-specific target allocation trajectory** based on time horizon to maturity ($t$).
- Emits `recommendedGoalAllocation`, `recommendedGlidepathTier`, and `glidepathDeviation` for decision support without mutating C.6 policies.

#### 2. Piecewise-Linear Target-Date Glidepath Schedule
| Time to Goal ($t$) | Lifecycle Phase | Target Equity | Target Debt / Fixed Income | Target Gold | Target Cash / Liquid |
| :--- | :--- | :--- | :--- | :--- | :--- |
| $t > 10$ years | Aggressive Growth | $75.0\%$ | $20.0\%$ | $5.0\%$ | $0.0\%$ |
| $5 < t \le 10$ years | Balanced Accumulation | $60.0\%$ | $30.0\%$ | $10.0\%$ | $0.0\%$ |
| $3 < t \le 5$ years | Capital Preservation Transition | $35.0\%$ | $50.0\%$ | $10.0\%$ | $5.0\%$ |
| $1 < t \le 3$ years | De-Risking & Defense | $15.0\%$ | $65.0\%$ | $5.0\%$ | $15.0\%$ |
| $t \le 1$ year | Cash / Ultra-Short Liquidity | $0.0\%$ | $40.0\%$ | $0.0\%$ | $60.0\%$ |

#### 3. Sequence-of-Returns Vulnerability Detection
If $t \le 3.0$ years and actual dedicated equity allocation exceeds the glidepath target by $>15.0\%$, C.8.3 automatically generates a `SEQUENCE_OF_RETURNS_VULNERABILITY` record.

---

### Stage C.8.4: Cross-Domain Opportunity & Vulnerability Aggregator (`services/financialOpportunityAggregator.js`)

#### 1. Provenance-Tracked Opportunity Schema (`C8-R6`)
```typescript
export interface OpportunityRecord {
  opportunityId: string;
  category: 'REBALANCING' | 'TAX_OPTIMIZATION' | 'RISK_MITIGATION' | 'LIQUIDITY_BUFFER' | 'GOAL_SOLVENCY' | 'DEBT_REDUCTION' | 'GLIDEPATH_ALIGNMENT';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  urgencyScore: number; // [0.0, 100.0]
  sourceEngine: 'C6' | 'C6_3' | 'C7_2' | 'C7_3' | 'C7_4' | 'C7_5' | 'C7_6' | 'C7_7' | 'C8_2' | 'C8_3' | 'LIABILITIES';
  sourceMetric: string; // e.g. 'DIM_LIQUIDITY', 'top1HoldingShare', 'fundingGap'
  sourceValue: number | string;
  thresholdValue: number | string;
  affectedGoalIds: string[];
  evidenceText: string;
  createdFromAsOfDate: string;
}
```

#### 2. Aggregation Ingestion Matrix (Zero Recalculation)
1. **C.6 Rebalancing Drift**: Ingests assets with drift $> \text{rebalanceThreshold}$.
2. **C.6.3 Tax Lots**: Ingests unrealized tax losses eligible for tax-loss harvesting.
3. **C.7.2 Concentration**: Ingests top-1 holding share $> 25.0\%$ or asset HHI $> 3500$.
4. **C.7.3 Downside Risk**: Ingests portfolio volatility $> 25.0\%$ or drawdown $> 25.0\%$.
5. **C.7.5 Liquidity Buffer**: Ingests emergency runway $< 6.0$ months.
6. **C.7.6 Stress Resilience**: Ingests scenario losses $> 30.0\%$ or reverse stress $\lambda_{20}^* < 1.0$.
7. **C.7.7 Health Score Risk Drivers**: Ingests top-3 ranked weighted score deficits ($\Delta S_d$).
8. **C.8.2 Goal Solvency**: Ingests goals with status `UNDERFUNDED`, `AT_RISK`, or `PAST_DUE`.
9. **C.8.3 Glidepath Drift**: Ingests goals with equity overweight within 3 years of maturity.
10. **Liabilities**: Ingests loans with interest rate $> 12.0\%$ p.a.

---

### Stage C.8.5: Next Best Action Prioritization Engine (`services/actionPrioritizationEngine.js`)

#### 1. Closed-Form Multi-Objective Scoring Contract (`C8-R7`)
For each candidate action $a$, its composite score $S_{\text{action}} \in [0.0, 100.0]$ is computed via exact linear weighting:
\[
S_{\text{action}} = 0.30 U_a + 0.25 R_a + 0.15 T_a + 0.20 G_a - 0.10 F_a
\]
where weights sum to exact $1.00$ ($0.30 + 0.25 + 0.15 + 0.20 - 0.10 \to 1.00$ gross terms):

- **$U_a \in [0.0, 100.0]$ (Financial Urgency)**:
  - Runway $<3$ mo $\to 100.0$; High-interest debt $>14\% \to 95.0$; Runway $<6$ mo $\to 85.0$; Goal gap on Tier-1 $\to 80.0$; Goal gap on Tier-2 $\to 65.0$; Rebalance drift $>10\% \to 50.0$; Tax-loss harvest $\to 40.0$.
- **$R_a \in [0.0, 100.0]$ (Risk & Health Improvement Potential)**:
  - Projected $\Delta S_{\text{health}} \times 5.0$, clamped to $[0.0, 100.0]$.
- **$T_a \in [0.0, 100.0]$ (Tax Efficiency)**:
  - Realizes tax loss $\to 100.0$; Zero tax realization $\to 70.0$; Long-term gain $\to 40.0$; Short-term gain penalty $\to 10.0$.
- **$G_a \in [0.0, 100.0]$ (Goal Alignment)**:
  - Linked to `CRITICAL_TIER_1` goal $\to 100.0$; `HIGH_TIER_2` $\to 75.0$; `MEDIUM_TIER_3` $\to 50.0$; `LOW_TIER_4` $\to 25.0$; Unlinked $\to 10.0$.
- **$F_a \in [0.0, 100.0]$ (Implementation Friction / Effort)**:
  - 1-click SIP adjustment $\to 10.0$; Single asset buy/sell $\to 25.0$; Multi-asset rebalancing $\to 50.0$; Complex debt restructuring $\to 70.0$.

#### 2. Duplicate Action Suppression & Deterministic Tie-Breaking
- Duplicate actions targeting the same holding/goal/loan are suppressed; only the highest-scoring action is retained.
- **Deterministic 4-Tier Tie-Breaking Order**:
  \[
  S_{\text{action}} \text{ DESC} \longrightarrow \text{Urgency } U_a \text{ DESC} \longrightarrow \text{Goal Alignment } G_a \text{ DESC} \longrightarrow \text{actionId ASC}
  \]

#### 3. Action Lifecycle State Machine & Persistence Boundary (`C8-R13`)
- **Analytical Output**: Engine generates actions strictly with status `IDENTIFIED`.
- **Lifecycle Tracking Layer**:
  \[
  \text{IDENTIFIED} \longrightarrow \text{REVIEWED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{SCHEDULED} \longrightarrow \text{COMPLETED}
  \]
  Alternates: `SNOOZED` (with snooze expiry date), `DISMISSED` (with dismissal reason).
- Calculation engine remains pure, read-only, and stateless.

---

### Stage C.8.6: Action Impact Simulator (`services/actionImpactSimulator.js`)

#### 1. Certified-Engine Delegation Contract (`C8-R8`)
The simulator performs hypothetical "Before vs After" analysis by delegating strictly to certified engines:
1. **Clone State**: In-memory deep clone of portfolio holdings, cash flows, and goals.
2. **Apply Virtual Action**:
   - If `INCREASE_SIP`: Updates virtual monthly cash flow and goal contribution.
   - If `SELL_HOLDING` / `BUY_HOLDING`: Updates virtual holding quantity, cash, and tax lots.
   - If `PREPAY_DEBT`: Updates virtual debt balance and recurring EMI burn.
3. **Invoke Certified Engines on Virtual State**:
   - `portfolioHealthScoreEngine.js` evaluates $S_{\text{health}}^{\text{after}}$.
   - `liquidityEngine.js` evaluates $\text{Runway}^{\text{after}}$.
   - `concentrationEngine.js` evaluates $\text{HHI}^{\text{after}}$ and $\text{Top1}^{\text{after}}$.
   - `wealthProjectionEngine.js` evaluates $\text{FR}^{\text{after}}$.
4. **Emits Comparison DTO (`C8-R9`)**:
   ```typescript
   export interface ActionImpactComparisonDTO {
     actionId: string;
     actionTitle: string;
     simulatedMetrics: {
       healthScore: MetricComparison;
       emergencyRunwayMonths: MetricComparison;
       top1HoldingConcentration: MetricComparison;
       goalFundingRatio: MetricComparison;
       estimatedTaxLiabilityINR: number;
     };
     summaryVerdict: string;
   }

   interface MetricComparison {
     before: number;
     after: number;
     delta: number;
     direction: 'IMPROVED' | 'DEGRADED' | 'UNCHANGED';
   }
   ```
5. **Zero Store Mutation**: Zero calls to `saveData` or storage keys.

---

### Stage C.8.7: Decision Intelligence Presentation Adapter (`components/investments/decisionPresentationAdapter.js`)

#### 1. Advice Safety & Regulatory Boundary (`C8-R10`)
All presentation models strictly classify each output string into 4 distinct evidentiary types:
1. `FACT`: Objective observation of current recorded state (e.g. *"Top holding represents 42.0% of portfolio value."*).
2. `DERIVED_INSIGHT`: Authoritative diagnostic finding (e.g. *"Concentration score is 37.5/100, breaching policy threshold of 25.0%."*).
3. `RECOMMENDATION`: Actionable decision guidance (e.g. *"Consider trimming 50 shares of XYZ to reduce concentration."*).
4. `HYPOTHETICAL_OUTCOME`: Simulated projection under modeled assumptions (e.g. *"If executed, projected Health Score rises from 68.0 to 76.2 (+8.2 pts)."*).

#### 2. Formatting Standards
- Indian currency formatting (`₹1,23,456.00`).
- Percentage formatting (`15.4%`).
- Urgency color tokens: `CRITICAL` (Red), `HIGH` (Amber), `MEDIUM` (Blue), `LOW` (Slate).

---

### Stage C.8.8: Goal Planning & Financial Action Command Center UI

#### 1. Component Architecture
- `components/investments/GoalSolvencyCard.js`: Goal cards with circular progress gauge, funding gap, and time-to-goal countdown.
- `components/investments/NextBestActionFeedCard.js`: Ranked feed of prioritized financial actions with `#1`, `#2`, `#3` badges and expandable evidence drilldowns.
- `components/investments/ActionImpactModal.js`: Interactive "Before vs After" decision comparison modal.
- `components/investments/GoalGlidepathCard.js`: Visual glidepath curve showing equity vs debt transition over time.
- `components/investments/DecisionCommandCenter.js`: Master container screen mounted in the mobile app.

#### 2. Boundary & Empty State Contracts (`C8-R14`)
- `NO_GOALS`: Renders goal creation onboarding prompt.
- `EMPTY_PORTFOLIO`: Renders asset creation prompt with zero division errors.
- `DEGRADED`: Renders amber disclaimer banner for imputed diagnostics.
- `INSUFFICIENT_DATA`: Renders prompt for comprehensive scan when $\ge 2$ engines missing.
- `NO_ACTION_REQUIRED`: Renders positive confirmation banner: *"Portfolio and goals are fully optimized."*

---

## 3. Master Acceptance Test Matrix (72 Scenarios in `tests/test_c8.mjs`)

The Phase C.8 test suite (`tests/test_c8.mjs`) will execute 72 deterministic acceptance tests across 10 groups:

1. **Group 1: Goal Schema, Validation & Priority Precedence (Tests 1–8)**:
   - Schema validation, 4-tier waterfall allocation, tie-breaking order, overdue goal handling.
2. **Group 2: Closed-Form Inflation & Corpus Amortization (Tests 9–15)**:
   - Compounding formula, category overrides (education/medical 8%), zero inflation boundary, past date boundary.
3. **Group 3: Wealth Projection Policy & SIP Gap Mathematics (Tests 16–23)**:
   - Versioned return table, $FV_{\text{current}}$, $FV_{\text{SIP}}$, required SIP formula, $r=0$ zero-rate boundary, solvency state machine.
4. **Group 4: Target-Date Glidepaths & Sequence Risk (Tests 24–30)**:
   - 5 lifecycle tiers, glidepath de-risking trajectory, sequence-of-returns vulnerability flag, C.6 authority non-mutation.
5. **Group 5: Cross-Domain Opportunity & Vulnerability Aggregation (Tests 31–38)**:
   - Ingestion from C.6, C.6.3, C.7.2, C.7.3, C.7.5, C.7.6, C.7.7, C.8.2, C.8.3, and liabilities with complete provenance tracking.
6. **Group 6: Closed-Form Next Best Action Prioritization (Tests 39–46)**:
   - Multi-objective scoring weights (sum = 1.00), urgency mapping, 4-tier tie-breaking, duplicate action suppression.
7. **Group 7: Certified-Engine Simulation & Before/After Deltas (Tests 47–54)**:
   - Virtual state cloning, certified engine delegation, delta directionality, zero store mutations.
8. **Group 8: Advice Safety, Categorization & Action Lifecycle (Tests 55–60)**:
   - FACT vs INSIGHT vs RECOMMENDATION vs HYPOTHETICAL_OUTCOME classification, lifecycle state machine (`IDENTIFIED` $\to$ `COMPLETED`).
9. **Group 9: Boundary Conditions & Empty States (Tests 61–66)**:
   - `NO_GOALS`, `EMPTY_PORTFOLIO`, `DEGRADED`, `INSUFFICIENT_DATA`, `NO_ACTION_REQUIRED`.
10. **Group 10: Determinism, AST Scans, Read-Only & 599+ Full Regression (Tests 67–72)**:
    - Mandatory `asOfDate`, AST wall-clock scan (0 `Date.now()`), AST zero-recalculation scan, deep 5-store read-only safety, byte-for-byte repeatability, 599+ baseline regression pass.

---

## 4. Phase C.8 Stage Progression & Governance Gate

| Stage | Focus Area | Deliverable Service / Component | Status |
| :--- | :--- | :--- | :--- |
| **C.8.1** | Goal Schema & Priority Hierarchy | `services/goalPlanningEngine.js` | 🔒 Gate Locked |
| **C.8.2** | Wealth Projection & SIP Solver | `services/wealthProjectionEngine.js` | 🔒 Gate Locked |
| **C.8.3** | Target-Date Glidepath Engine | `services/goalGlidepathService.js` | 🔒 Gate Locked |
| **C.8.4** | Opportunity/Vulnerability Aggregator | `services/financialOpportunityAggregator.js` | 🔒 Gate Locked |
| **C.8.5** | Next Best Action Prioritizer | `services/actionPrioritizationEngine.js` | 🔒 Gate Locked |
| **C.8.6** | Action Impact Simulator | `services/actionImpactSimulator.js` | 🔒 Gate Locked |
| **C.8.7** | Presentation Adapter | `components/investments/decisionPresentationAdapter.js` | 🔒 Gate Locked |
| **C.8.8** | Command Center UI & App Mount | `components/investments/*` & `app/(tabs)/` | 🔒 Gate Locked |

**Zero-Code Gate remains ACTIVE 🔒** until this v1.1.0 Architecture Plan is formally reviewed and authorized by the Architect.
