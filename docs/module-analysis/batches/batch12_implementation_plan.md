# Batch 12 Implementation Plan: Financial Utilities & Support

## Goal
Implement persistence for Income Calendar, Fee Planner, Pending Tracker, and Feedback.

## Proposed Changes

### 1. Storage & Services
#### [MODIFY] `services/storage.js`
- Add keys: `INCOME_CALENDAR`, `FEES`, `PENDING_ITEMS`, `FEEDBACK_LOGS`.

#### [NEW] `services/income-calendar.js`
- Daily income CRUD.

#### [NEW] `services/fees.js`
- Fee schedule CRUD.

#### [NEW] `services/pending.js`
- Debt/Credit CRUD.

### 2. UI Implementation
#### [MODIFY] `app/income-calendar.js`
- Integrate `IncomeCalendarService`.
- Interactive calendar grid.

#### [MODIFY] `app/fee-planner.js`
- Integrate `FeeService`.
- Add Fee Modal.

#### [MODIFY] `app/pending-tracker.js`
- Integrate `PendingService`.
- Add Debt/Credit Modal.

#### [MODIFY] `app/feedback.js`
- Save feedback to `FEEDBACK_LOGS` before showing success.

## Verification Plan
1.  **Income**: Add entry for today. Check stats.
2.  **Fees**: Add "Term 1". Mark as Paid. Check visual status.
3.  **Pending**: Add "Ravi owes 500". Verify in "To Collect" tab.
4.  **Feedback**: Submit form. Verify "Thank You" screen.
