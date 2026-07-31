# Batch 6 Analysis: Assets & Wealth Management

## 1. Overview
The goal of Batch 6 is to implement the "Wealth" pillar of the application. This involves tracking Assets (Gold, Watches, Electronics), Properties (Real Estate), and Investments (Stocks, Mutual Funds, crypto). 

## 2. Current State
*   `properties.js`, `assets.js`, `investments.js` exist in the file system but likely use mock data or static UI (based on previous patterns).
*   No dedicated service layers for these modules.
*   "Net Worth" calculation is likely missing or hardcoded.

## 3. Requirements
### A. Services
1.  **`PropertiesService`**: CRUD for real estate. Fields: Name, Type (Apartment/Land), Purchase Price, Current Value, Location.
2.  **`InvestmentsService`**: CRUD for financial assets. Fields: Name, Type (Stock/MF/Crypto), Invested Amount, Current Value, ROI.
3.  **`AssetsService`**: CRUD for physical assets. Fields: Name, Category, Value, Purchase Date.

### B. UI Refactoring
1.  **Refactor `app/properties.js`**: Use `PropertiesService`. Add/Edit/Delete modals.
2.  **Refactor `app/investments.js`**: Use `InvestmentsService`. Add/Edit/Delete modals. Include a "Portfolio Summary" card.
3.  **Refactor `app/assets.js`**: Use `AssetsService`.

### C. Logic
*   **Net Worth**: Calculate Total Assets - Total Liabilities (Loans).
*   **ROI Calculation**: Auto-calculate gain/loss percentage for investments.

## 4. Dependencies
*   `services/storage.js`: Add new keys (`PROPERTIES`, `INVESTMENTS`, `ASSETS`).
*   `components/ui/LuxuryCard`: Reuse for consistent design.
