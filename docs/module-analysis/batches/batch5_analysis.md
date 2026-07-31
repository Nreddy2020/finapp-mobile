# Batch 5 Analysis: Savings, Loans, Bills, EMIs

## 1. Current State Assessment

### Savings (`app/(tabs)/savings.js`)
*   **State**: Partially implemented with local persistence.
*   **Data Source**: Uses `STORAGE_KEYS.SAVINGS` directly in the component. Fetches mock `getSavingsGoals` if empty.
*   **CRUD**: `AddGoalModal` handles Create. Local functions handle Update/Delete.
*   **Issues**: Logic is tightly coupled with UI. No reusable service.

### Loans (`app/(tabs)/loans.js`)
*   **State**: Complex component with heavy logic.
*   **Data Source**: Uses `STORAGE_KEYS.LOANS`. Seeds from `getLoans()` mock.
*   **Features**: Borrowing/Lending tabs, Debt Destroyer Simulator, Foreclosure Simulator.
*   **CRUD**: `AddLoanModal` exists. deeply nested update logic for "Pay Off", "Payment", "Accrue Interest".
*   **Issues**: Logic should be moved to a service. DTI calculations and simulators could be util functions.

### Bills (`app/(tabs)/bills.js`)
*   **State**: Functional but contains hardcoded data.
*   **Data Source**: Uses `STORAGE_KEYS.BILLS`. Seeds from `getBillReminders()` mock.
*   **Hardcoded Data**: The "Medicine" tab uses a hardcoded `medicines` state array, completely disconnected from the actual `MedicineService` created in previous batches.
*   **Issues**: Medicine tab needs to integrate with real medicine data. Subscription data also seems hardcoded/mocked in render. Needs a proper `BillService`.

### EMIs (`app/(tabs)/emis.js`)
*   **State**: Similar to Loans, heavy component logic.
*   **Data Source**: Uses `STORAGE_KEYS.EMIS`.
*   **Overlap**: Seems to duplicate some "New Loan" functionality.
*   **Issues**: formatting logic (`formatDateInput`, `calculateLoanDNA`) and business logic (`generateAmortizationSchedule`) are inside the component.

## 2. Architecture Plan

### Services to Create
1.  **`SavingsService`** (`services/savings.js`)
    *   `getGoals()`, `addGoal()`, `updateGoal()`, `deleteGoal()`
    *   `calculateTotalSaved()`

2.  **`LoanService`** (`services/loans.js`)
    *   `getLoans()` (Merged Borrowing/Lending)
    *   `addLoan()`, `updateLoan()`, `deleteLoan()`
    *   `addPayment(loanId, amount)`
    *   `accrueInterest()` (Global or per loan)
    *   `getDTI(income)`

3.  **`BillService`** (`services/bills.js`)
    *   `getBills()`
    *   `addBill()`, `updateBill()`, `deleteBill()`
    *   `markAsPaid(id)`
    *   `getUpcomingBills()`

4.  **`EMIService`** (`services/emis.js`)
    *   (Optional, might merge with Loans, but keeping separate for current persistence key compatibility is safer)
    *   `getEMIs()`, `addEMI()`, `payEMI()`

### Refactoring Targets
*   **`savings.js`**: Replace direct storage calls with `SavingsService`.
*   **`loans.js`**: Offload calculation and CRUD logic to `LoanService`.
*   **`bills.js`**:
    *   Use `BillService`.
    *   **CRITICAL**: Replace hardcoded `medicines` state with `MedicineService.getMedicines()` to show real data.
*   **`emis.js`**: Offload amortization and CRUD logic to `EMIService`.

## 3. Storage Keys
*   `STORAGE_KEYS.SAVINGS` (Existing)
*   `STORAGE_KEYS.LOANS` (Existing)
*   `STORAGE_KEYS.BILLS` (Existing)
*   `STORAGE_KEYS.EMIS` (Existing)
*   `STORAGE_KEYS.MEDICINES` (Already exists, `bills.js` must read this)

## 4. Testing Strategy (Verification)
*   **Manual**:
    *   Add a test savings goal, verify persistence.
    *   Add a loan, make a payment, verify balance update.
    *   Add a bill, check persistent list.
    *   Check if Medicine tab in Bills reflects data added in Medicine Tracker.
