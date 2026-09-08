# Gate R7: OEM Power & Lifecycle Qualification — Implementation Plan

> **Document Type**: Release Candidate Review Document  
> **Status**: PENDING REVIEW & APPROVAL  
> **Target Package**: `com.nirwas20.wealthwise` (FinLife Android)  
> **Target Environment**: `emulator-5554` (API 36, Android 16, x86_64)  
> **Target Scope**: 24 Authoritative Assertions across 7 Operating Dimensions  
> **Repository Path**: `docs/release-qualification/GATE_R7_OEM_POWER_LIFECYCLE_PLAN.md`  

---

## 1. Executive Summary & Audit Mandate

Following the formal review, qualification, and freezing of **Gate R6: Security & Privacy Release Audit** (28 / 28 PASS) and the reconciliation of the cumulative baseline to **1,083 / 1,083 assertions (100% Pass Rate)**, this plan defines the execution protocol for:

$$\mathbf{GATE\ R7:\ OEM\ POWER\ \&\ LIFECYCLE\ QUALIFICATION}$$

Modern Android OEM firmware (Google Pixel, Samsung OneUI, Xiaomi MIUI/HyperOS, OnePlus OxygenOS) enforces aggressive background freezing, Doze mode deep sleeps, App Standby bucket demotions, low-memory process kills, and battery-saver constraints. 

FinLife must mathematically and functionally prove that under all such system-level interruptions:
1. Financial ledgers and persistence collections never corrupt or lose records.
2. The Write-Ahead Log (WAL) maintains strict ACID crash durability under hard process kills.
3. Cold process resuscitation correctly hydrates all domain balances and navigation state without blank screens.
4. Memory trim signals are absorbed gracefully without crashes.
5. Zero background wakelocks are leaked.

---

## 2. Reconciled Cumulative Qualification Accounting

| Milestone / Gate | Domain / Scope Description | Status | Assertions |
| :--- | :--- | :---: | :---: |
| **Core Financial Ecosystem** | **Investments (151), Cashbook (129), Shared Costs (59), Banking & P2P (508)** | Certified & Frozen | **847 / 847** |
| Gate R1: Production Signing | Keystore, RSA 4096-bit, v1–v3 APK signatures | Qualified & Certified | **8 / 8** |
| Gate R2: Device Matrix Baseline | Cold TTID, PSS Memory, Font Scaling (Emulator) | Qualified | **9 / 9** |
| Gate R3: Fresh Install & Migration | Integer-paise, balance conservation, idempotency | Qualified & Certified | **24 / 24** |
| Gate R4: Backup & Restore | Multi-domain, AES-256-GCM, 7-point rollback | Qualified & Certified | **41 / 41** |
| Gate R5: Offline & Interrupted-Write | WAL durability, 7-state taxonomy, crash decision | Qualified & Certified | **29 / 29** |
| **Frozen Release-Candidate Subtotal** | **Core Ecosystem + Gates R1 through R5** | **Frozen RC Baseline** | **958 / 958** |
| Financial Command Center & Reports V1 | Architecture & Navigation (21), Canonical Intelligence (76) | Functionally Qualified | **97 / 97** |
| **Previous Certified RC Total** | **Subtotal prior to Gate R6** | **Certified** | **1,055 / 1,055** |
| Gate R6: Security & Privacy Release Audit | Secrets, Permissions, Sandboxing, Crypto, Logcat Privacy | Qualified & Certified | **28 / 28** |
| **Current Certified RC Total** | **Cumulative certified baseline** | **Certified** | **1,083 / 1,083** |
| **Gate R7: OEM Power & Lifecycle** | **Doze, Standby, Process Kill, Memory Trims, Battery Saver, WAL** | **TARGET (Under Review)** | **24 / 24** |
| **Projected Cumulative Total** | **Post-Gate R7 Certified Total** | **Projected** | **1,107 / 1,107** |

### Mathematical Reconciliation:
$$847 + 8 + 9 + 24 + 41 + 29 = 958$$
$$958 + 21 + 76 = 1,055$$
$$1,055 + 28 = 1,083$$
$$1,083 + 24 = 1,107$$

---

## 3. Preserved Scope & Governance Boundaries

> [!IMPORTANT]
> **Preserved Scope Boundaries**:
> 1. **Emulator-Scoped Execution**: Gate R7 execution will be performed live against `emulator-5554` (Google sdk_gphone64_x86_64, Android 16, API 36, x86_64). Android system commands (`deviceidle`, `am set-inactive`, `send-trim-memory`, `low_power`) emulate core OS power and lifecycle states with high fidelity. However, this testing does **not** certify physical OEM hardware or vendor-proprietary power daemons (e.g. Samsung Knox battery managers, Xiaomi MIUI background kill daemons). Physical device qualification remains a distinct required gate.
> 2. **Canonical Label Normalization**: The 847 core financial ecosystem baseline label is consistently normalized to **`Investments (151), Cashbook (129), Shared Costs (59), Banking & P2P (508)`** across all repository documentation.
> 3. **Non-Destructive Perturbation with Try-Finally Restoration**: All device settings and battery configurations will be strictly restored upon completion of the test suite (battery reset, low_power reset, deviceidle unforce).

---

## 4. Gate R7 Invariant Directives & Test Assertions (24 / 24)

### Section 1: Android Doze Mode Transitions (4 Assertions)
- **`R7-DOZE-01`**: **Light Doze Mode Entry & Throttled Timer Resilience**
  - *Method*: Execute `adb shell dumpsys deviceidle force-idle light` and query `dumpsys deviceidle get light`.
  - *Assertion*: Device idle transitions to `IDLE` light mode; background polling and network tasks gracefully back off without unhandled promise rejections or CPU spinning.
- **`R7-DOZE-02`**: **Deep Doze Mode Entry & Zero WakeLock Compliance**
  - *Method*: Execute `adb shell dumpsys deviceidle force-idle deep` and query `dumpsys deviceidle get deep`.
  - *Assertion*: Device transitions to deep `IDLE` mode; package holds 0 active wakelocks (`dumpsys power`); alarms and background tasks conform to Android OS maintenance windows.
- **`R7-DOZE-03`**: **Doze Exit & Active State Recovery**
  - *Method*: Execute `adb shell dumpsys deviceidle unforce`.
  - *Assertion*: Device unforces idle and returns to `ACTIVE`; pending local tasks resume idempotently without thread starvation or duplicate execution.
- **`R7-DOZE-04`**: **Network Reconnection & Offline Queue Flush Post-Doze**
  - *Method*: Simulate network restoration post-Doze.
  - *Assertion*: Storage and offline recovery engines maintain data integrity without race conditions or duplicated writes upon network re-awakening.

### Section 2: App Standby Buckets & Inactivity (3 Assertions)
- **`R7-STBY-01`**: **App Standby Inactivity Marking**
  - *Method*: Execute `adb shell am set-inactive com.nirwas20.wealthwise true`.
  - *Assertion*: Verified via `adb shell am get-inactive com.nirwas20.wealthwise` (`Idle=true`); app suspends non-essential background activity; zero CPU contention.
- **`R7-STBY-02`**: **App Standby Bucket Taxonomy Compliance**
  - *Method*: Execute `adb shell am get-standby-bucket com.nirwas20.wealthwise`.
  - *Assertion*: Returns valid Android Standby bucket code (10: ACTIVE, 20: WORKING_SET, 30: FREQUENT, 40: RARE, 45: RESTRICTED); validates deferred job scheduling.
- **`R7-STBY-03`**: **App Standby Resumption on User Engagement**
  - *Method*: Execute `adb shell am set-inactive com.nirwas20.wealthwise false`.
  - *Assertion*: App state clears inactivity (`Idle=false`); full operational responsiveness immediately restored.

### Section 3: Low Memory Killer (LMK) & Memory Trimming (4 Assertions)
- **`R7-MEM-01`**: **`TRIM_MEMORY_RUNNING_MODERATE` Resilience**
  - *Method*: Execute `adb shell am send-trim-memory com.nirwas20.wealthwise RUNNING_MODERATE`.
  - *Assertion*: Process absorbs moderate memory pressure; zero process crashes; PID remains stable.
- **`R7-MEM-02`**: **`TRIM_MEMORY_RUNNING_LOW` Resilience**
  - *Method*: Execute `adb shell am send-trim-memory com.nirwas20.wealthwise RUNNING_LOW`.
  - *Assertion*: Process absorbs low memory pressure gracefully without unhandled exceptions.
- **`R7-MEM-03`**: **`TRIM_MEMORY_RUNNING_CRITICAL` Resilience**
  - *Method*: Execute `adb shell am send-trim-memory com.nirwas20.wealthwise RUNNING_CRITICAL`.
  - *Assertion*: Critical memory event handled fail-safe; ephemeral caches shed; no `OutOfMemoryError` or `NullPointerException`.
- **`R7-MEM-04`**: **`TRIM_MEMORY_UI_HIDDEN` Background Trim Resilience**
  - *Method*: Execute `adb shell am send-trim-memory com.nirwas20.wealthwise UI_HIDDEN`.
  - *Assertion*: UI hidden signal safely purges non-essential graphics/layout buffers without invalidating authoritative financial storage.

### Section 4: Process Termination & Cold State Resuscitation (4 Assertions)
- **`R7-PROC-01`**: **Background Process Termination Cleanliness**
  - *Method*: Send app to background (`input keyevent KEYCODE_HOME`) and execute `am force-stop com.nirwas20.wealthwise`.
  - *Assertion*: Process terminates completely; zero orphaned threads or hung file descriptors.
- **`R7-PROC-02`**: **Cold Launch Resuscitation from Dead State**
  - *Method*: Execute `adb shell am start -n com.nirwas20.wealthwise/.MainActivity`.
  - *Assertion*: App cold boots from dead state, loads React Native JS bundle cleanly, and acquires active top-window focus (`mCurrentFocus`).
- **`R7-PROC-03`**: **Canonical Financial Data Rehydration & Checksum Invariance**
  - *Method*: Inspect pre-kill vs post-resuscitation ledger checksums.
  - *Assertion*: All 7 financial domain source groups (5 Cashbooks, Banking, Loans, P2P, Commitments, Assets/Properties, Investments) rehydrate with 100% balance checksum equality before and after termination.
- **`R7-PROC-04`**: **Screen & Drawer Navigation State Integrity Post-Resuscitation**
  - *Method*: Verify window focus and navigation hierarchy.
  - *Assertion*: Navigation engine mounts root navigator cleanly; no white screen, black screen, or broken back handler stack.

### Section 5: Battery Saver Mode & Power Constraints (3 Assertions)
- **`R7-BATT-01`**: **Battery Saver Mode Activation & UI Preservation**
  - *Method*: Execute `adb shell cmd battery unplug` and `adb shell settings put global low_power 1`.
  - *Assertion*: System low power mode detected; dark UI contrast preserved; non-essential animations suppressed.
- **`R7-BATT-02`**: **Zero Held WakeLocks Verification**
  - *Method*: Execute `adb shell dumpsys power` and parse package wakelock entries.
  - *Assertion*: Verified package holds 0 partial or full wakelocks during background/idle state, preventing parasitic battery drain.
- **`R7-BATT-03`**: **Battery Saver Restoration**
  - *Method*: Execute `adb shell settings put global low_power 0` and `adb shell cmd battery reset`.
  - *Assertion*: Normal power profile cleanly restored.

### Section 6: In-Flight Write Interruption & Crash Durability under OS Kill (3 Assertions)
- **`R7-CRASH-01`**: **WAL Durability under Simulated Process Kill**
  - *Method*: Simulate in-flight multi-stage write interrupted mid-execution.
  - *Assertion*: Upon restart, WAL engine detects partial state and either safely completes or quarantines/rolls back the operation without silent data loss.
- **`R7-CRASH-02`**: **Zero Orphaned Balance Debits or Credits Post-Crash**
  - *Method*: Recompute double-entry balance equality post-crash.
  - *Assertion*: Post-crash balance conservation holds strictly across all accounts: total debits equal total credits; net worth is conserved.
- **`R7-CRASH-03`**: **Temporary & Export File Lock Cleanup**
  - *Method*: Inspect storage sandbox for orphaned locks.
  - *Assertion*: Stale lock files and temporary export files (`.tmp`) created prior to kill are cleaned up automatically on restart.

### Section 7: Rapid Lifecycle Cycling & Screen Lock / Unlock (3 Assertions)
- **`R7-LIFE-01`**: **Rapid Background / Foreground Cycling Stability**
  - *Method*: Execute 5 rapid iterations of `KEYCODE_HOME` followed by `am start`.
  - *Assertion*: Process remains stable; memory footprint does not leak; zero duplicate event listeners.
- **`R7-LIFE-02`**: **Device Screen Lock & Unlock Sequence**
  - *Method*: Execute `input keyevent 26` (Power/Sleep) followed by `input keyevent 82` (Unlock/Dismiss Keyguard).
  - *Assertion*: App re-attaches surface, resumes rendering without canvas corruption, and handles touch inputs normally.
- **`R7-LIFE-03`**: **System Configuration Perturbation Resilience**
  - *Method*: Modify `font_scale` under active session and restore.
  - *Assertion*: Configuration change absorbed gracefully; state preserved; system setting restored idempotently.

---

## 5. Verification & Reporting Pipeline

The automated verification suite will be executed with:
```bash
node --import ./tests/mock_rn.mjs tests/release-qualification/verify_gate_r7_oem_lifecycle.mjs
```

Artifacts produced:
- `tests/release-qualification/Gate_R7_OEM_LIFECYCLE_REPORT.json`
- `docs/release-qualification/GATE_R7_OEM_LIFECYCLE_REPORT.md`
