# Cashbooks Test Case Matrix

## 🟢 Implemented Features (Verification)
| ID | Feature | Scenario | Expected Result | Status | Code Ref |
|----|---------|----------|-----------------|--------|----------|
| CB-01 | **Create Cashbook** | User clicks "Create New Book", enters Name + Type, clicks Save | Book appears in list, persisted in storage | 🟡 Verify | `cashbooks.js:66` |
| CB-02 | **View Cashbooks** | App load | List of books persistence fetched from `user_cashbooks` | 🟡 Verify | `cashbooks.js:20` |
| CB-03 | **View Detail** | Click Cashbook Card | Navigates to `[id].js`, shows transactions | 🟡 Verify | `cashbooks.js:322` |
| CB-04 | **Add Transaction** | In Detail > Click "Cash In" | Modal opens, Amount added, Balance updates green | 🟡 Verify | `[id].js:40` |
| CB-05 | **Delete Transaction** | In Detail > Click Trash Icon | Transaction removed, Balance reverts | 🟡 Verify | `[id].js:87` |
| CB-06 | **Ticker Leak** | Monitor interval | Interval clears on unmount | 🟡 Verify | `cashbooks.js:114` |

## 🔴 Missing / Broken P0 & P1 Items (To Implement)
| ID | Feature | Scenario | Current State | Priority |
|----|---------|----------|---------------|----------|
| CB-07 | **Delete Cashbook** | Delete a whole ledger | ❌ Function exists `handleDeleteBook` but NO UI TRIGGER | **P0** |
| CB-08 | **Edit Cashbook** | Rename or change type | ❌ No Edit functionality | **P1** |
| CB-09 | **Risk Persistence** | Change Risk Slider -> Restart | ❌ Resets to 0% (State only) | **P1** |
| CB-10 | **Search/Filter** | Filter by "Shop" or "Trip" | ❌ No Search Bar | **P1** |

## 🧪 Automation Gaps
- Need to test "Delete Book" flow once added.
- Need to verify "Risk Persistence" across reloads.
