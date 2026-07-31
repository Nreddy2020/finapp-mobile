# Batch 3 Implementation Plan: Family & Career

## Goal
Transform "Family Expenses" and "Career Growth" from static prototypes into dynamic, persistent tools.

## Proposed Changes

### Component: Family Expenses (`/family-expenses`)

#### [MODIFY] [family-expenses.js](file:///e:/fintech-mobile/app/family-expenses.js)
- **State**: Replace `members` and `expenses` consts with `useState` initialized from storage.
- **UI**: Wire up "Add Member" and "Add Expense" modals.
- **Logic**: Implement `handleSettlement()` to clear debts between two members.

#### [NEW] [FamilyService] (Inside `family-expenses.js` or separate)
- **Functions**: `addMember`, `addExpense`, `calculateBalances`, `settleDebt`.

### Component: Career Growth (`/career-growth`)

#### [MODIFY] [career-growth.js](file:///e:/fintech-mobile/app/career-growth.js)
- **Goals**: Replace static Goal Card with a `FlatList` of dynamic goals.
- **Interact**: Add "Mark Complete" toggle for milestones.
- **Storage**: Save `goals` and `roiHistory` to `AsyncStorage`.

## Verification Plan

### Automated Tests
- **Family**:
    1.  Add Member "Alice".
    2.  Add Expense "Pizza", Amount 100, PaidBy "Me", Split ["Me", "Alice"].
    3.  Verify Alice owes 50.
    4.  Restart App -> Verify persistence.
- **Career**:
    1.  Add Goal "Learn Python".
    2.  Mark as Done.
    3.  Restart App -> Verify status retained.

### Manual Verification
- **User Flow**: Verify the "Split Bill" math is correct for 3+ members.
- **User Flow**: Verify Career Goals progress bar updates when tasks are checked.
