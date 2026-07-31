# Validity Tracker Test Case Matrix

## 🟢 Implemented Features (Verification)
| ID | Feature | Scenario | Expected Result | Status | Code Ref |
|----|---------|----------|-----------------|--------|----------|
| VL-01 | **Create Document** | Click "Add Document", Enter Data, Save | Document appears in list, persisted | 🟡 Verify | `AddDocumentModal.js` |
| VL-02 | **View Documents** | App load | List fetched from `user_validity` | 🟡 Verify | `validity.js:23` |
| VL-03 | **Expiry Status** | Check "Days Left" badge | Calculates correct diff from today | 🟡 Verify | `validity.js:107` |

## 🔴 Missing / Broken P0 & P1 Items (To Implement)
| ID | Feature | Scenario | Current State | Priority |
|----|---------|----------|---------------|----------|
| VL-04 | **Delete Document** | Remove an expired item | ❌ No Delete UI | **P0** |
| VL-05 | **Edit Document** | Update expiry date | ❌ No Edit UI | **P1** |
| VL-06 | **Photo Upload** | Attach image to document | ❌ Input fields only, no ImagePicker | **P0** |
| VL-07 | **Notifications** | Schedule expiry reminder | ❌ No notification logic | **P0** |

## 🧪 Automation Gaps
- Need to verify Photo Upload (Mock interaction in automation).
- Need to verify Notification Scheduling (Unit test logic).
