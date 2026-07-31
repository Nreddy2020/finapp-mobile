# Batch 4 Implementation Plan: Income & Budgets

## Goal
Transform "Income" and "Budgets" from static view-only screens into dynamic, persistent financial tools.

## Proposed Changes

### Component: Income (`/income`)

#### [NEW] [services/income.js](file:///e:/fintech-mobile/services/income.js)
- **Purpose**: Manage income sources.
- **Functions**: `getIncomeSources`, `addIncome`, `deleteIncome`, `updateIncome`.
- **Persistence**: Save to `STORAGE_KEYS.INCOME_SOURCES`.

#### [MODIFY] [income.js](file:///e:/fintech-mobile/app/(tabs)/income.js)
- **State**: Replace mock data with `useState` loaded from `IncomeService`.
- **UI**: Add "Add Income" Modal with fields for Source, Amount, Date, Category.
- **Logic**: Calculate "Total Monthly Income" dynamically.

### Component: Budgets (`/budgets`)

#### [NEW] [services/budgets.js](file:///e:/fintech-mobile/services/budgets.js)
- **Purpose**: Manage budget limits and tracking.
- **Functions**: `getBudgets`, `createBudget`, `updateBudget`, `deleteBudget`.
- **Persistence**: Save to `STORAGE_KEYS.BUDGETS`.

#### [MODIFY] [budgets.js](file:///e:/fintech-mobile/app/(tabs)/budgets.js)
- **State**: Load budgets from service.
- **UI**: "Create Budget" Modal (Category, Limit).
- **Interactivity**: visual progress bars reflecting `spent` vs `limit` (simulated spending for now until Batch 5).

### Shared
#### [MODIFY] [services/storage.js](file:///e:/fintech-mobile/services/storage.js)
- Add keys: `INCOME_SOURCES`, `BUDGETS`.

## Verification Plan
*   **Income**: Add "Salary", verify total updates. Restart app -> persist.
*   **Budgets**: Create "Food" budget ₹5000. Restart app -> persist.
*   **Note**: All verification steps will be implemented but manual testing skipped per user request.
