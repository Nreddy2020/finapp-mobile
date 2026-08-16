# Master Architectural Plan: Phase C.8 Goal Planning & Decision Intelligence Engine

**Document Version**: `1.0.0`  
**Master Standard Identifier**: `C8_V1`  
**Phase**: C.8 (Goal Planning, Lifecycle Wealth Projection & Next Best Action Decision Intelligence)  
**Certified Baseline**: [`7e71b8d`](https://github.com/Nreddy2020/finapp-mobile/commit/7e71b8d) (Phase C.7 Master Certified & Closed)  
**State Coordination Commit**: [`6c645c2`](https://github.com/Nreddy2020/finapp-mobile/commit/6c645c2)  
**Branch**: `fintech-using-chatgpt`  
**Zero-Code Gate**: `ACTIVE 🔒` (Architecture Plan ONLY — Zero Implementation/Component/Test Code)  

---

## 1. Phase Objective & Core Architectural Boundary

### 1.1 Phase Objective
> *"Given the user's goals, financial position, portfolio diagnostics, cash-flow constraints, taxes, and risk profile, deterministically identify, rank, simulate, and explain the highest-value financial actions."*

Phase C.8 elevates FinLife from an authoritative diagnostic system into a **Goal Planning & Actionable Decision Support System**.

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
│   Stage C.8.1: Goal Schema, Priorities & Inflation Planning Policy          │
│                                      ↓                                      │
│   Stage C.8.2: Goal Funding, Inflation Adjustments & Wealth Projection      │
│                                      ↓                                      │
│   Stage C.8.3: Target-Date Glidepath & Goal Asset Allocation Engine         │
│                                      ↓                                      │
│   Stage C.8.4: Cross-Domain Opportunity & Vulnerability Aggregator          │
│                                      ↓                                      │
│   Stage C.8.5: Next Best Action Prioritization Engine                       │
│                                      ↓                                      │
│   Stage C.8.6: Action Impact Simulator ("Before vs After" Health & Goals)   │
│                                      ↓                                      │
│   Stage C.8.7: Decision Intelligence Presentation Adapter                   │
│                                      ↓                                      │
│   Stage C.8.8: Goal Planning & Financial Action Command Center UI           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Strict Architectural Boundaries (Authority Matrix)

| Domain / Responsibility | Authority Engine | C.8 Responsibility & Constraint |
| :--- | :--- | :--- |
| **Portfolio Valuation & Realized Gains** | `investingAnalyticsEngine.js` (C.4) | **Consume Only**. C.8 never recalculates WAC, current value, or realized PnL. |
| **Asset Allocation & Drift** | `targetAllocationService.js` (C.6.1) / `rebalancingEngine.js` (C.6.2) | **Consume Only**. C.8 reads target weights, drift deltas, and rebalancing thresholds. |
| **Tax Lots & Capital Gains** | `openTaxLotAdapter.js` / `taxOptimizedRebalancingService.js` (C.6.3) | **Consume Only**. C.8 uses tax-loss harvesting and capital gains estimates. |
| **Risk Diagnostics & Taxonomy** | `riskTaxonomy.js` (C.7.1) / `concentrationEngine.js` (C.7.2) / `volatilityDrawdownEngine.js` (C.7.3) / `correlationEngine.js` (C.7.4) | **Consume Only**. C.8 reads HHI, volatility, drawdown, CVaR, correlations, and PCA shares. |
| **Liquidity & Emergency Runway** | `liquidityEngine.js` (C.7.5) | **Consume Only**. C.8 uses tier classifications, accessible capital, and runway months. |
| **Scenario & Reverse Stress** | `scenarioStressEngine.js` (C.7.6) | **Consume Only**. C.8 reads stressed loss percentages, loss attributions, and $\lambda_{20}^*$. |
| **Portfolio Health Score & Grade** | `portfolioHealthScoreEngine.js` (C.7.7) | **Consume Only**. C.8 reads overall health score ($S_{\text{health}}$), grade, and primary risk drivers. |
| **Goals, Projections & Priorities** | **C.8.1, C.8.2, C.8.3** | **C.8 Authoritative**. Owns goal definitions, inflation-adjusted corpus, glidepaths, and funding status. |
| **Opportunities & Vulnerabilities** | **C.8.4** | **C.8 Authoritative**. Synthesizes cross-domain deficits into standardized opportunity records. |
| **Next Best Action Ranking** | **C.8.5** | **C.8 Authoritative**. Multi-objective ranking function prioritizing financial actions. |
| **Hypothetical Impact Simulation** | **C.8.6** | **C.8 Authoritative**. Simulates hypothetical "Before vs After" delta without mutating state. |
| **Action Execution** | **Future Phase / External** | **Prohibited in C.8**. C.8 manages recommendation lifecycle (`IDENTIFIED` $\to$ `COMPLETED`), but does not place broker orders or execute transactions. |

---

## 2. Detailed Roadmap & Stage Contracts (C.8.1 through C.8.8)

### Stage C.8.1: Goal Schema, Priorities & Inflation Planning Policy
- **Service**: `services/goalPlanningEngine.js`
- **Responsibilities**:
  - Define authoritative Goal Schema:
    - `goalId`: Unique identifier (e.g. `GOAL_RETIREMENT`, `GOAL_HOUSE_2030`, `GOAL_CHILD_EDU`).
    - `name`: User-friendly title.
    - `category`: `RETIREMENT`, `HOME_PURCHASE`, `EDUCATION`, `EMERGENCY_FUND`, `VEHICLE`, `WEALTH_CREATION`, `CUSTOM`.
    - `priority`: `CRITICAL_TIER_1` (Survival/Emergency), `HIGH_TIER_2` (Core Lifecycle: Retirement/House), `MEDIUM_TIER_3` (Milestones: Education), `LOW_TIER_4` (Discretionary/Luxury).
    - `targetDate`: Target completion date ISO (`YYYY-MM-DD`).
    - `targetCorpusNominal`: Target corpus in nominal Rupees at today's cost.
    - `inflationRate`: Specific inflation assumption (default 6.0% p.a., 8.0% for education/medical).
    - `allocatedHoldingIds`: Array of investment holding IDs dedicated to this goal (or linked via asset tagging).
    - `monthlyContribution`: Dedicated monthly SIP / savings contribution.
  - Validation rules: Positive corpus, valid future target date ($T > \text{asOfDate}$), non-negative contribution, strict deterministic validation.

---

### Stage C.8.2: Goal Funding, Inflation Adjustments & Wealth Projection Engine
- **Service**: `services/wealthProjectionEngine.js`
- **Mathematical Model**:
  1. **Inflation-Adjusted Future Required Corpus ($C_{\text{future}}$)**:
     \[
     C_{\text{future}} = C_{\text{nominal}} \times (1 + i)^n, \quad n = \frac{\text{targetDate} - \text{asOfDate}}{365.25}
     \]
  2. **Current Funded Corpus ($V_{\text{goal}}$)**:
     - Sum of current market values (from C.4) of linked holdings + dedicated cash.
  3. **Projected Terminal Wealth ($V_{\text{terminal}}$)**:
     - Compound future value of current corpus + monthly SIP contribution under expected asset-class return $r_{\text{exp}}$:
     \[
     V_{\text{terminal}} = V_{\text{goal}} (1 + r_{\text{exp}})^n + \text{SIP} \times \left[ \frac{(1 + r_{\text{monthly}})^{12n} - 1}{r_{\text{monthly}}} \right] \times (1 + r_{\text{monthly}})
     \]
  4. **Funding Gap ($\Delta C$) & Funded Ratio ($\text{FR}$)**:
     \[
     \text{FR} = \frac{V_{\text{terminal}}}{C_{\text{future}}}, \quad \Delta C = \max(0, C_{\text{future}} - V_{\text{terminal}})
     \]
  5. **Required Monthly Savings Adjustment ($\Delta \text{SIP}$)**:
     - Exact closed-form shortfall amortization formula to achieve 100% solvency by target date.
  6. **Solvency Health Status**:
     - `FULLY_FUNDED` ($\text{FR} \ge 1.0$)
     - `ON_TRACK` ($0.85 \le \text{FR} < 1.0$)
     - `NEEDS_ATTENTION` ($0.60 \le \text{FR} < 0.85$)
     - `CRITICAL_SHORTFALL` ($\text{FR} < 0.60$)

---

### Stage C.8.3: Target-Date Asset Allocation Glidepath Engine
- **Service**: `services/goalGlidepathService.js`
- **Responsibilities**:
  - Dynamically computes conservative target asset allocation based on **Time Horizon to Goal ($n$)**:
    - $n > 10$ years: Growth / Equity Dominant ($75\%$ Equity, $20\%$ Debt, $5\%$ Gold).
    - $5 < n \le 10$ years: Balanced Growth ($60\%$ Equity, $30\%$ Debt, $10\%$ Gold).
    - $3 < n \le 5$ years: Capital Preservation Transition ($35\%$ Equity, $55\%$ Debt, $10\%$ Cash).
    - $1 < n \le 3$ years: High Capital Preservation ($15\%$ Equity, $70\%$ Debt, $15\%$ Cash).
    - $n \le 1$ year: Cash & Ultra-Short Liquidity ($0\%$ Equity, $50\%$ Liquid Debt, $50\%$ Cash).
  - Evaluates **Glidepath Misalignment Risk**: Flags goals where actual equity allocation exceeds glidepath boundary by $>15\%$ within 3 years of maturity (Vulnerability: *Goal Sequence-of-Returns Risk*).

---

### Stage C.8.4: Cross-Domain Opportunity & Vulnerability Aggregator
- **Service**: `services/financialOpportunityAggregator.js`
- **Responsibilities**:
  - Ingests upstream authoritative diagnostic records without recalculating:
    1. **Allocation Drift & Rebalancing Opportunities** (from C.6 `rebalancingEngine.js`): Assets breaching target drift tolerance.
    2. **Tax-Loss Harvesting Opportunities** (from C.6.3 `taxOptimizedRebalancingService.js`): Open tax lots with unrealized losses exceeding threshold.
    3. **Concentration Vulnerabilities** (from C.7.2 `concentrationEngine.js`): Single holdings $>25\%$ or sector HHI $>4000$.
    4. **Downside / Volatility Risks** (from C.7.3 `volatilityDrawdownEngine.js`): Crypto/Speculative volatility $>50\%$ or drawdown $>30\%$.
    5. **Liquidity & Emergency Runway Deficits** (from C.7.5 `liquidityEngine.js`): Emergency runway $<6.0$ months.
    6. **Scenario Stress Weaknesses** (from C.7.6 `scenarioStressEngine.js`): Stressed portfolio loss $>30\%$ under historical proxy crashes.
    7. **Goal Solvency Shortfalls & Glidepath Drift** (from C.8.2 & C.8.3): Goals with $\text{FR} < 85\%$ or excessive equity risk near maturity.
    8. **High-Interest Debt Liabilities** (from `loans.js` / `emis.js`): Unsecured loans with interest rate $>12.0\%$.
  - Normalizes each finding into a standardized `OpportunityRecord` or `VulnerabilityRecord`.

---

### Stage C.8.5: Next Best Action Prioritization Engine
- **Service**: `services/actionPrioritizationEngine.js`
- **Mathematical Multi-Objective Scoring Function**:
  \[
  \text{Score}_{\text{action}} = w_{\text{urgency}} \cdot U + w_{\text{impact}} \cdot I + w_{\text{tax}} \cdot T + w_{\text{goal}} \cdot G - w_{\text{effort}} \cdot E
  \]
  - $U \in [0, 100]$: Financial Urgency (Runway $<3$ mo $\to 100$; high-interest debt $\to 90$; goal shortfall $\to 80$; rebalancing $\to 50$).
  - $I \in [0, 100]$: Risk / Health Improvement Potential ($\Delta S_{\text{health}}$).
  - $T \in [0, 100]$: Tax Efficiency (Tax-loss harvest $\to 100$; long-term gain $\to 70$; short-term penalty $\to 20$).
  - $G \in [0, 100]$: Goal Alignment (Affects Tier-1 Critical Goal $\to 100$; Tier-2 $\to 75$; Tier-3 $\to 50$).
  - $E \in [0, 100]$: Implementation Friction (1-click SIP adjustment $\to 10$; multi-lot sale $\to 40$).
- **Output Action DTO Structure**:
  ```typescript
  interface NextBestActionDTO {
    actionId: string;
    category: 'EMERGENCY_RUNWAY' | 'DELEVERAGE_DEBT' | 'GOAL_FUNDING' | 'REBALANCE_DRIFT' | 'DE_RISK_CONCENTRATION' | 'TAX_LOSS_HARVEST' | 'GLIDEPATH_ADJUST';
    priorityRank: number; // #1, #2, #3, ...
    title: string;
    description: string;
    urgencyLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    overallActionScore: number;
    evidence: {
      diagnosticSource: string;
      metricName: string;
      currentValue: number | string;
      thresholdValue: number | string;
    };
    recommendedExecution: {
      type: 'INCREASE_SIP' | 'SELL_HOLDING' | 'BUY_HOLDING' | 'PREPAY_DEBT' | 'ALLOCATE_CASH';
      targetAssetId?: string;
      targetGoalId?: string;
      suggestedAmount: number;
      currencyFormatted: string;
    };
    tradeoffs: string[];
    prerequisites: string[];
    lifecycleStatus: 'IDENTIFIED' | 'REVIEWED' | 'ACCEPTED' | 'SCHEDULED' | 'COMPLETED' | 'SNOOZED' | 'DISMISSED';
  }
  ```
- **Deterministic 3-Tier Tie-Breaking**: $\text{Score}_{\text{action}} \text{ DESC} \to \text{Urgency DESC} \to \text{actionId ASC}$.

---

### Stage C.8.6: Action Impact Simulator ("Before vs After" Simulation)
- **Service**: `services/actionImpactSimulator.js`
- **Pure Hypothetical Simulation Invariant**:
  - Accepts candidate `Action` and current portfolio state.
  - Constructs a cloned, virtual portfolio state incorporating the proposed action.
  - Re-evaluates C.7.7 Health Score ($S_{\text{health}}^{\text{after}}$), C.7.5 Runway ($\text{Runway}^{\text{after}}$), C.7.2 Concentration ($\text{HHI}^{\text{after}}$), and Goal Solvency ($\text{FR}^{\text{after}}$).
  - Emits side-by-side comparison DTO:
    ```typescript
    interface ActionImpactComparisonDTO {
      actionId: string;
      simulatedMetrics: {
        healthScore: { before: number; after: number; delta: number };
        emergencyRunwayMonths: { before: number; after: number; delta: number };
        topHoldingConcentration: { before: number; after: number; delta: number };
        goalFundingRatio: { before: number; after: number; delta: number };
        estimatedTaxImpactINR: number;
      };
      summaryVerdict: string; // e.g. "Executing this action increases Health Score by +8.2 pts and extends runway by 2.5 months."
    }
    ```
  - **Zero Store Mutation**: 100% read-only calculation on virtual clone; never mutates underlying database stores.

---

### Stage C.8.7: Decision Intelligence Presentation Adapter
- **Service**: `components/investments/decisionPresentationAdapter.js`
- **Responsibilities**:
  - Pure ViewModel mapper converting C.8.2, C.8.5, and C.8.6 DTOs into localized, accessible ViewModels for React Native screens.
  - Formatting currency (`₹1,23,456`), percentage deltas (`+8.2%`), urgency badges (`CRITICAL` in Red, `HIGH` in Amber), and impact chips.
  - 100% zero financial recalculation guard.

---

### Stage C.8.8: Goal Planning & Financial Action Command Center UI
- **Components & Screen**:
  - `components/investments/GoalSolvencyCard.js`: Goal cards with circular progress, funding gap, and time-to-goal countdown.
  - `components/investments/NextBestActionFeedCard.js`: Ranked feed of prioritized financial actions with `#1`, `#2`, `#3` badges and expandable evidence drilldowns.
  - `components/investments/ActionImpactModal.js`: Interactive "Before vs After" decision comparison modal.
  - `components/investments/GoalGlidepathCard.js`: Visual glidepath curve showing equity vs debt transition over time.
  - `app/(tabs)/planning.js` or `components/investments/DecisionCommandCenter.js`: Master container screen mounted in the mobile app.

---

## 3. Master Acceptance Test Matrix (Phase C.8 Acceptance Plan)

The Phase C.8 test suite (`tests/test_c8.mjs`) will contain comprehensive acceptance tests across 8 categories:

1. **Group 1: Goal Schema, Validation & Inflation Amortization (C.8.1)**
2. **Group 2: Deterministic Forward Wealth & SIP Gap Mathematics (C.8.2)**
3. **Group 3: Target-Date Glidepath De-Risking & Sequence Risk (C.8.3)**
4. **Group 4: Cross-Domain Opportunity & Vulnerability Aggregation (C.8.4)**
5. **Group 5: Multi-Objective Next Best Action Prioritization & Tie-Breaking (C.8.5)**
6. **Group 6: Pure Hypothetical Before-vs-After Simulation & Zero Mutation (C.8.6)**
7. **Group 7: Action Lifecycle State Machine (`IDENTIFIED` $\to$ `COMPLETED`) (C.8.7)**
8. **Group 8: AST Zero-Recalculation Scan, Determinism & 599+ System Regression (C.8.8)**

---

## 4. Stage Progression & Zero-Code Gate Posture

- **Current Status**: `PHASE C.8 ARCHITECTURE PLAN AUTHORED`
- **Zero-Code Gate**: `ACTIVE 🔒` (No implementation, components, or test files may be written until this architecture plan is reviewed and authorized by the Architect).
- **Certified Floor**: All 16 prior financial services (`C.4`, `C.5`, `C.6`, `C.7`) remain 100% frozen.
