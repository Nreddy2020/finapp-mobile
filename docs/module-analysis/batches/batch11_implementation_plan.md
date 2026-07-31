# Batch 11 Implementation Plan: Reports & Analytics

## Goal
Implement a comprehensive Reports dashboard aggregating data from the entire application.

## Proposed Changes

### 1. Services
#### [NEW] `services/reports.js`
- `generateReport()`: Fetches all data.
- Returns `{ netWorth, monthlySavings, incomeVsExpense, expenseByCategory }`.

### 2. UI Implementation
#### [NEW] `components/charts/BarChart.js`
- Custom SVG implementation for monthly comparison.

#### [NEW] `components/charts/PieChart.js`
- Custom SVG implementation for category breakdown.

#### [MODIFY] `app/(tabs)/reports.js`
- Integuate `ReportsService`.
- Display Net Worth, Health Score, and Charts.

## Verification Plan
1.  **Aggregation**: Ensure Net Worth = (Assets + Cash) - (Loans + Debts).
2.  **Charts**: Verify Bar Chart visualizes Monthly Income vs Expenses correctly.
3.  **Performance**: Ensure report generation doesn't free UI.
