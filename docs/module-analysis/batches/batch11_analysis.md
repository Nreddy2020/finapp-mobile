# Batch 11 Analysis: Reports & Analytics

## 1. Overview
Batch 11 focuses on the "Reports" tab. This is the central intelligence hub where data from all other modules (Income, Expenses, Assets, Liabilities, Business) is aggregated to provide high-level financial insights.

## 2. Component Analysis
### Existing Files
- `app/(tabs)/reports.js`: Currently a placeholder.

### Requirements
#### A. Services
1.  **`ReportsService`**:
    -   **Aggregation**: Pull data from `IncomeService`, `ExpenseService`, `BusinessService`, `AssetService`, `LoanService`.
    -   **Metrics**: Calculate Net Worth, Monthly Savings Rate, Top Expense Categories, Income vs Expense Trends.
    -   **Forecasting**: Simple linear projection of Net Worth (optional but nice).

#### B. UI Changes
-   **`reports.js`**:
    -   **Net Worth Card**: Big bold number, trend indicator.
    -   **Income vs Expense**: Monthly comparison chart (Bar Chart using SVG).
    -   **Expense Breakdown**: Category Pie Chart (using SVG).
    -   **Financial Health**: Score based on Debt-to-Income, Savings Rate.

## 3. Data Flow
-   **Read**: `STORAGE_KEYS` (ALL).
-   **Compute**: On-the-fly aggregation. Performance might be a concern if data is huge, but for local-first app with <1000 records, it's instant.

## 4. Dependencies
-   `react-native-svg` (Available).
-   Custom Chart Components (BarChart, PieChart) need to be built.
