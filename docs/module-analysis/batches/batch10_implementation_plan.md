# Batch 10 Implementation Plan: Business & Advanced Tools

## Goal
Implement persistent Business Tools (Retail focus) and Advanced Planning Calculators.

## Proposed Changes

### 1. Storage & Services
#### [MODIFY] `services/storage.js`
- Add keys: `BUSINESS_DATA`, `PLANNING_DEBT`, `PLANNING_EMERGENCY`.

#### [NEW] `services/business.js`
- Daily sales tracking.

#### [NEW] `services/planning.js`
- Debt strategies and Emergency fund logic.

### 2. UI Implementation
#### [MODIFY] `app/business/retail.js`
- Integrate `BusinessService`.
- Allow adding daily summary.

#### [MODIFY] `app/debt-calculator.js`
- Integrate `PlanningService`.
- Interactive payoff simulator.

#### [MODIFY] `app/emergency-fund.js`
- Integrate `PlanningService`.
- Goal progress tracker.

## Verification Plan
1.  **Business**: Add Sale ₹5000. Restart. Check Graph/Total.
2.  **Debt**: Add Loan ₹1L @ 10%. Check "Snowball" payoff date.
3.  **Emergency**: Set expense ₹20k, goal 6 months. Check Target ₹1.2L.
