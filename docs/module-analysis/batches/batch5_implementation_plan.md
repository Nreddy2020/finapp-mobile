# Batch 5 Implementation Plan: Savings, Loans, Bills, EMIs

## Goal
Transform the Savings, Loans, Bills, and EMIs modules from component-heavy, partially mock-dependent implementations into clean, service-driven architectures with full persistence and CRUD capabilities.

## Proposed Changes

### 1. Service Layer
#### [NEW] `services/savings.js`
- Implement `SavingsService` to handle `STORAGE_KEYS.SAVINGS`.

#### [NEW] `services/loans.js`
- Implement `LoanService` to handle `STORAGE_KEYS.LOANS`.
- Move `handlePayment`, `handleAccrueInterest` logic here.

#### [NEW] `services/bills.js`
- Implement `BillService` to handle `STORAGE_KEYS.BILLS`.

#### [NEW] `services/emis.js`
- Implement `EMIService` to handle `STORAGE_KEYS.EMIS`.
- Move amortization logic here.

### 2. UI Refactoring
#### [MODIFY] `app/(tabs)/savings.js`
- Replace `useState`/`loadData` combo with `SavingsService` calls.

#### [MODIFY] `app/(tabs)/loans.js`
- Replace internal logic calls with `LoanService` calls.

#### [MODIFY] `app/(tabs)/bills.js`
- Replace internal logic with `BillService` calls.
- **Fix**: Import `MedicineService` to populate the Medicine tab with real data instead of hardcoded mock array.

#### [MODIFY] `app/(tabs)/emis.js`
- Replace internal logic with `EMIService` calls.

## Verification Plan
### Manual Verification
1.  **Savings**: Add goal "Test Goal", update amount, delete.
2.  **Loans**: Create loan, add partial payment, verify outstanding reduces.
3.  **Bills**: Create bill, verify list. Check "Medicine" tab shows data from `MedicineService`.
4.  **EMIs**: Add EMI, check amortization schedule generation (if applicable/visualized).
