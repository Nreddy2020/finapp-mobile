# Batch 14 Implementation Plan

## Goal
Replace all remaining mock API calls with persistent local storage services.

## Proposed Changes

### 1. Storage
#### [MODIFY] `services/storage.js`
- Add new keys for Todos, Recurring, Apartment, Hostel, Family, Affirmations.

### 2. Services
#### [NEW] `services/todos.js`
- CRUD for Todo items.

#### [NEW] `services/recurring.js`
- CRUD for Subscriptions.

#### [NEW] `services/apartment.js`
- Persistence for bills/notices.

#### [NEW] `services/family.js`
- Persistence for family members and expenses.

#### [NEW] `services/hostel.js`
- Persistence for hostel expenses.

#### [NEW] `services/affirmations.js`
- Persistence for gratitude logs.

### 3. UI Refactoring
#### [MODIFY] `app/(tabs)/todos.js`
- Integrate `TodoService`. Add "Add Task" modal.

#### [MODIFY] `app/(tabs)/recurring.js`
- Integrate `RecurringService`. Add "Add Subscription" modal.

#### [MODIFY] `app/(tabs)/apartment.js`
- Integrate `ApartmentService`.

#### [MODIFY] `app/(tabs)/family.js`
- Integrate `FamilyService`.

#### [MODIFY] `app/(tabs)/hostel.js`
- Integrate `HostelService`.

#### [MODIFY] `app/(tabs)/affirmations.js`
- Integrate `AffirmationService` for Gratitude Journal.

## Verification Plan
- Manual test of adding/deleting items in each module.
- Verify data persists after reload.
