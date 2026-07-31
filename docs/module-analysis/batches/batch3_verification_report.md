# Batch 3 Verification Report

**Scope**: Family Expenses & Career Growth
**Status**: Pending Implementation
**Objective**: Execute the following test cases to verify Batch 3 features.

---

## 1. Family Expenses (`/family-expenses`)

### Feature: Family Management (P0)
- **Action**: Add a new family member "Kid".
- **Verify**: Member appears in the list and Balance card.

### Feature: Expense Splitting (P0)
- **Action**: Add Expense "Internet", ₹1000, Paid by "Dad", Split with ["Mom", "Me"].
- **Verify**:
    - [ ] "Dad" is owed ₹666.
    - [ ] "Mom" owes ₹333.
    - [ ] "Me" owes ₹333.

### Feature: Settlement (P0)
- **Action**: Click "Settle Up" (if implemented) or Delete Expense.
- **Verify**: Balances update accordingly.

---

## 2. Career Growth (`/career-growth`)

### Feature: Goal Tracking (P0)
- **Action**: Add new Goal "Certification".
- **Verify**: Appears in "My Career Path".
- **Action**: Click checkbox to mark complete.
- **Verify**: Visual strike-through or green check; Progress persists on reload.

### Feature: ROI Calculator (P0)
- **Action**: Calculate ROI for a ₹50,000 course with ₹5,000 hike.
- **Verify**: Result is 10 months.
- **Action**: Restart App.
- **Verify**: Input values or History is retained (if implemented).
