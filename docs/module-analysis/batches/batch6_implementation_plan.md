# Batch 6 Implementation Plan: Assets & Wealth

## Goal
Implement persistent tracking for Properties, Investments, and Physical Assets, enabling a complete "Net Worth" view.

## Proposed Changes

### 1. Storage & Services
#### [MODIFY] `services/storage.js`
- Add keys: `PROPERTIES`, `INVESTMENTS`, `ASSETS`.

#### [NEW] `services/properties.js`
- Methods: `getProperties`, `addProperty`, `updateProperty`, `deleteProperty`, `calculateTotalValue`.

#### [NEW] `services/investments.js`
- Methods: `getInvestments`, `addInvestment`, `updateInvestment`, `calculatePortfolioValue`.

#### [NEW] `services/assets.js`
- Methods: `getAssets`, `addAsset`, `deleteAsset`.

### 2. UI Implementation
#### [MODIFY] `app/properties.js`
- Integrate `PropertiesService`.
- Add "Add Property" Modal.

#### [MODIFY] `app/investments.js`
- Integrate `InvestmentsService`.
- Add "Add Investment" Modal.
- visual: Portfolio logic (Profit/Loss indicators).

#### [MODIFY] `app/assets.js`
- Integrate `AssetsService`.

## Verification Plan
1.  **Properties**: Add a "Downtown Apartment", verify persistence.
2.  **Investments**: Add "Tesla Stock" with mock profit, verify totals.
3.  **Assets**: Add "Gold Watch", verify list.
