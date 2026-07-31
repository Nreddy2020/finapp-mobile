# Batch 15: Assets & Wealth Implementation

## Goal
Enable full CRUD functionality for the **Assets** and **Investments** modules. While the services and persistence layers exist, the UI currently lacks the interactive elements (modals/forms) to Add, Edit, or Delete items.

## User Review Required
> [!NOTE]
> This batch focuses on UI interaction implementation. No new services are needed as `assets.js` and `investments.js` services already exist.

## Proposed Changes

### Assets Module
#### [MODIFY] [app/(tabs)/assets.js](file:///e:/fintech-mobile/app/(tabs)/assets.js)
- Implement `AddAssetModal` for creating new assets.
- Integrate `AssetsService.addAsset` into the modal's submit action.
- Add "Delete" functionality (e.g., long press or swipe, or detail view).
- Fix the "Add Asset" button `onPress`.

### Investments Module
#### [MODIFY] [app/(tabs)/investments.js](file:///e:/fintech-mobile/app/(tabs)/investments.js)
- Implement `AddInvestmentModal` (triggered by "Buy" action).
- Integrate `InvestmentsService.addInvestment`.
- Implement basic "Sell" functionality (reduce quantity or remove if 0).
- Wire up the "Buy" and "Sell" action buttons.

## Verification Plan

### Automated Tests
- Browser test to navigate to Assets, open "Add Asset" modal, submit a new asset (e.g., "Gold Watch"), and verify it appears in the list.
- Browser test to navigate to Investments, click "Buy", add a stock (e.g., "Tata Motors"), and verify the portfolio updates.

### Manual Verification
- Verify the "Total Asset Value" updates correctly when an asset is added.
- Verify the "Portfolio Value" and "Net Worth" update when an investment is added.
