# Batch 2 Verification Report

**Scope**: Medicine Tracker & Emergency Fund
**Status**: Ready for Manual Verification
**Objective**: Execute the following test cases to verify Batch 2 features.

---

## 1. Medicine Tracker (`/medicine-tracker`)

### Feature: Smart Dose Management (P0)
- **Action**: Add a medicine (e.g., "Paracetamol", Stock: 8).
- **Action**: Click "Take Dose".
- **Verify**:
    - [ ] Stock decreases (8 -> 7).
    - [ ] **Alert**: A "Refill Warning" alert appears immediately (since stock <= 7).
    - [ ] **History**: Check `HealthService` logs (console) or see "Taken: [Time]" updated on the card.

### Feature: Prescription & Generics (P1)
- **Action**: Click the "Scan" (Camera) button in header.
- **Verify**:
    - [ ] Select "Camera (Simulated)".
    - [ ] "Metformin" should be auto-added to the modal form.
- **Action**: Type "Panadol" in the Add Medicine modal name field.
- **Verify**:
    - [ ] **Alert**: "Savings Alert! Did you know Paracetamol is the generic version..." appears.

---

## 2. Emergency Fund (`/emergency`)

### Feature: Privacy & Security (P0)
- **Action**: Click the "Eye" icon in the header.
- **Verify**:
    - [ ] Balance changes to `₹ ••••••`.
    - [ ] Progress percentage changes to `•••`.
- **Action**: Refresh the page or Restart App.
- **Verify**:
    - [ ] Data persists securely (obfuscated in storage).

### Feature: Withdrawal Guards (P0)
- **Action**: Click "Withdraw" -> "Withdraw Funds" (leave Note empty).
- **Verify**:
    - [ ] **Error**: "Reason Required" alert appears.
- **Action**: Add Note "Medical Bill" and Confirm.
- **Verify**:
    - [ ] Withdrawal succeeds.
    - [ ] Transaction appears in "Recent Activity" list with the note.

### Feature: Financial Tools (P1)
- **Action**: Click "Auto-Save" button.
- **Verify**:
    - [ ] "Setup Recurring Deposit" confirmation appears.
- **Action**: Scroll to "Government Security Schemes".
- **Action**: Click "Check Eligibility" on any scheme.
- **Verify**:
    - [ ] Simulation modal appears with "You are Eligible!" or "Not Eligible".

---

## 3. Storage Verification
- **Check**: `services/storage.js`
- **Verify**: Data for `user_emergency_fund` key is saving as a Base64 string (obfuscated) in `dashboard_stats.json` or separate file (depending on platform).
