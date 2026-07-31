# Batch 10 Analysis: Business & Advanced Tools

## 1. Overview
Batch 10 focuses on tools for business owners (tracking sales/expenses) and advanced financial planning (debt reduction, emergency funds).

## 2. Component Analysis
### Existing Files
- `app/business/retail.js`: Large file, likely a full dashboard.
- `app/debt-calculator.js`: Logic for debt payoff.
- `app/emergency-fund.js`: Logic for savings buffer.

### Requirements
#### A. Services
1.  **`BusinessService`**:
    -   Track Daily Sales/Expenses for business modules.
    -   Store Business Profile (Type, Name).
2.  **`PlanningService` (or specific services)**:
    -   **Debt**: Store debts, calculate payoff dates (Snowball/Avalanche).
    -   **Emergency**: Calculate required corpus based on monthly expenses (from `FamilyService` or manual).

#### B. UI Changes
-   **Business (Retail)**: Integrate persistence for daily entries.
-   **Debt Calculator**: Input debts, choose strategy, show timeline.
-   **Emergency Fund**: Input expenses, show gap vs current savings.

## 3. Data Structure
-   `BUSINESS_DATA`: `{ daily_sales: [], profile: {} }`
-   `PLANNING_DEBT`: `[{ name, amount, rate, minPayment }]`
-   `PLANNING_EMERGENCY`: `{ monthlyExpenses, monthsRequired, currentFund }`

## 4. Dependencies
-   Reuse `LuxuryCard`, `LuxuryEmptyState`.
-   Update `storage.js`.
