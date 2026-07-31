# Batch 12 Analysis: Financial Utilities & Support

## 1. Overview
Batch 12 converts the remaining standalone "utility" screens into fully functional modules with persistence. This ensures the app is feature-complete.

## 2. Component Analysis
### Existing Files
- `app/income-calendar.js`: Currently uses mock daily data.
- `app/fee-planner.js`: Currently uses static timeline.
- `app/pending-tracker.js`: Currently uses static lists for "Collect" & "Pay".
- `app/feedback.js`: Currently simulates API call.

### Requirements
#### A. Services
1.  **`UtilityService`**:
    -   Combined service for smaller features to avoid file clutter? Or separate?
    -   Decision: **Separate Services** for clarity.
    -   `services/income-calendar.js`: Daily income tracking.
    -   `services/fees.js`: School/College fee planner.
    -   `services/pending.js`: Managing informal debts/credits.
    -   `services/feedback.js`: Storing feedback locally (mocked submission).

#### B. UI Changes
-   **Income Calendar**: Click day -> Add/Edit Income -> Refresh Stats.
-   **Fee Planner**: Add Fee -> Mark Paid/Due -> Update Timeline.
-   **Pending Tracker**: Add Item -> Toggle "Collect/Pay" -> Mark Settled.
-   **Feedback**: Persist "submitted" state or store in a list.

## 3. Data Structure
-   `INCOME_CALENDAR_DATA`: `[{ date, amount, source }]`
-   `FEE_DATA`: `[{ title, amount, dueDate, status }]`
-   `PENDING_DATA`: `[{ name, amount, type, date, priority }]`

## 4. Dependencies
-   Reuse `LuxuryCard`, `AnimatedScreen`.
-   Update `storage.js`.
