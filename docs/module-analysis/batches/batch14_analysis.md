# Batch 14 Analysis: Remaining Utilities

## 1. Overview
This batch focuses on implementing persistence and interactive functionality for the remaining "static" or mock-based modules identified in the final analysis.

## 2. Modules to Upgrade

### A. Todos (`app/(tabs)/todos.js`)
- **Current**: Reads from `api.getTodos` (mock).
- **Target**: `TodoService` with CRUD.
- **Features**: Add task, toggle completion, delete, set priority.

### B. Recurring Payments (`app/(tabs)/recurring.js`)
- **Current**: Reads from `api.getRecurringPayments` (mock).
- **Target**: `RecurringService`.
- **Features**: Add subscription, edit amount/date, delete.

### C. Apartment (`app/(tabs)/apartment.js`)
- **Current**: Reads from `api.getApartmentMaintenance` (mock).
- **Target**: `ApartmentService`.
- **Features**: Track maintenance bills, notices (local), complaints.

### D. Family (`app/(tabs)/family.js`)
- **Current**: Reads from `api.getFamilyMembers` (mock).
- **Target**: `FamilyService`.
- **Features**: Add member, set allowance/budget, track shared expenses.

### E. Hostel (`app/(tabs)/hostel.js`)
- **Current**: Likely mock or static.
- **Target**: `HostelService`.
- **Features**: Rent, mess bill, roommate splitting.

### F. Affirmations (`app/(tabs)/affirmations.js`)
- **Current**: Static list?
- **Target**: `AffirmationService`.
- **Features**: Save favorite affirmations, log gratitude entries.

## 3. Storage Strategy
New `STORAGE_KEYS` to be added:
- `TODOS`
- `RECURRING_PAYMENTS`
- `APARTMENT_DATA`
- `HOSTEL_DATA`
- `FAMILY_DATA`
- `AFFIRMATIONS_DATA`

## 4. Implementation Steps
1.  Update `storage.js`.
2.  Create Service files (`services/*.js`).
3.  Refactor UI components to use Services.
