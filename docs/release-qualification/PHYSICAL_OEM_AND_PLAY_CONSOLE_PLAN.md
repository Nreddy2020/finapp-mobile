# Physical OEM Qualification & Google Play Console Validation — Execution Plan

> **Document Type**: Post-Gate R8 Release Execution Plan & Governance Blueprint  
> **Status**: PROPOSED FOR REVIEW  
> **Package ID**: `com.nirwas20.wealthwise`  
> **Current Pipeline Certified Total**: 1,123 / 1,123 Assertions (100% Pass Rate)  
> **Scope**: Physical OEM Device Matrix Qualification & Google Play Console Internal Validation  
> **Repository Path**: `docs/release-qualification/PHYSICAL_OEM_AND_PLAY_CONSOLE_PLAN.md`  

---

## 1. Executive Context & Objectives

With Gates R1 through R8 formally qualified and frozen at **1,123 / 1,123 assertions (100% pass rate)**, the emulator-based and packaging baseline qualifications are complete. 

Final production release approval requires two remaining milestones:
1. **Physical OEM Hardware Matrix Execution**: Validating the application on actual physical hardware across major Android OEM skins (Google Pixel / AOSP, Samsung One UI, Xiaomi HyperOS) to verify real thermal, battery, aggressive memory killing, and hardware biometric behaviors.
2. **Google Play Console Validation**: Validating the compiled Android App Bundle (`app-release.aab`) in Google Play Console (Internal Testing Track), analyzing per-device dynamic delivery split sizes, running the automated Pre-Launch Report (Firebase Test Lab), and completing policy/permission declarations.

---

## 2. Reconciled Cumulative Qualification Status

| Pipeline Milestone / Gate | Scope Description | Status | Assertions |
| :--- | :--- | :---: | :---: |
| **Core Financial Ecosystem** | Investments (151), Cashbook (129), Shared Costs (59), Banking & P2P (508) | Certified & Frozen | **847 / 847** |
| Gate R1: Production Signing | Keystore, RSA 4096-bit, v1–v3 APK signatures | Qualified & Certified | **8 / 8** |
| Gate R2: Device Matrix Baseline | Cold TTID, PSS Memory, Font Scaling (Emulator) | Qualified (Emulator) | **9 / 9** |
| Gate R3: Fresh Install & Migration | Integer-paise, balance conservation, idempotency | Qualified & Certified | **24 / 24** |
| Gate R4: Backup & Restore | Multi-domain, AES-256-GCM, 7-point rollback | Qualified & Certified | **41 / 41** |
| Gate R5: Offline & Interrupted-Write | WAL durability, 7-state taxonomy, crash decision | Qualified & Certified | **29 / 29** |
| **Frozen RC Baseline Subtotal** | **Core Ecosystem + Gates R1 through R5** | **Certified & Frozen** | **958 / 958** |
| Financial Command Center & Reports V1 | Architecture (21), Canonical Intelligence (76) | Qualified & Frozen | **97 / 97** |
| **Previous Certified Total** | **Subtotal through Reports V1** | **Certified & Frozen** | **1,055 / 1,055** |
| Gate R6: Security & Privacy Release Audit | Secrets, Permissions, Sandboxing, Crypto, Logcat Privacy | Qualified & Certified | **28 / 28** |
| **Certified Baseline through Gate R6** | **Subtotal through Gate R6** | **Certified & Frozen** | **1,083 / 1,083** |
| Gate R7: Power & Lifecycle Baseline | Doze, Standby, LMK, Resuscitation, WAL Crash, Wakelocks | Qualified & Frozen | **24 / 24** |
| **Certified Baseline through Gate R7** | **Subtotal through Gate R7** | **Certified & Frozen** | **1,107 / 1,107** |
| **Gate R8: Store Packaging & AAB Readiness**| **AAB Bundle, R8/ProGuard, Play Store Compliance, Universal Run** | **QUALIFIED & CERTIFIED** | **16 / 16** |
| **Grand Cumulative Certified Total** | **All Certified Release Milestones** | **CERTIFIED BASELINE** | **1,123 / 1,123** |
| **Physical OEM Hardware Matrix** | Pixel, Samsung Galaxy, Xiaomi Physical Matrix | TARGET (Pending Devices) | Proposed |
| **Google Play Console Validation** | Bundle upload, dynamic split size, Pre-Launch Report | TARGET (Internal Track) | Proposed |
| **Full Production Release Approval** | Global sign-off across all gates | Withheld | Pending Hardware & Play |

### Exact Mathematical Reconciliation:
\[
\begin{aligned}
847 + 8 + 9 + 24 + 41 + 29 &= 958 \\
958 + 21 + 76 &= 1{,}055 \\
1{,}055 + 28 &= 1{,}083 \\
1{,}083 + 24 &= 1{,}107 \\
1{,}107 + 16 &= \mathbf{1{,}123\ /\ 1{,}123\ \text{Assertions (100\% Pass Rate)}}
\end{aligned}
\]

---

## 3. Milestone A: Physical OEM Hardware Matrix Scope

### Target Hardware Device Profiles
| Tier | OEM / Skin | Reference Device Target | OS Version & Arch | Key Focus Areas |
| :--- | :--- | :--- | :--- | :--- |
| **OEM-1** | **Google Pixel** (Stock AOSP) | Pixel 7 / 8 / 9 | Android 14 / 15 / 16 (`arm64-v8a`) | Pure Android standard behavior, 120Hz refresh, gesture navigation, BiometricPrompt |
| **OEM-2** | **Samsung Galaxy** (One UI) | Galaxy S22 / S23 / S24 or A-series | One UI 6 / 7 (Android 14 / 15) | Aggressive OEM app sleep, Knox container isolation, proprietary memory management |
| **OEM-3** | **Xiaomi / Redmi** (HyperOS / MIUI)| Xiaomi 13 / 14 or Redmi Note | HyperOS (Android 14 / 15) | MIUI autostart restrictions, non-standard broadcast killing, battery saver optimization |

### Physical Hardware Verification Invariants:
1. **Cold Start & Hardware TTID**: Physical cold start measured using `am start -W` (Target: $< 1{,}800\text{ ms}$ on physical ARM64 hardware).
2. **Biometric Security Hardware**: Hardware Keystore backed by StrongBox / TEE (Trusted Execution Environment); biometric authentication prompts succeed without crashes.
3. **Physical SMS Broadcast & SIM Isolation**: Hardware SMS reception verified; carrier SIM state handling.
4. **OEM Aggressive Background Management**: Background survival under OEM-specific battery savers (e.g. Samsung "Sleeping Apps", Xiaomi "MIUI Battery Saver").
5. **Physical Display & Gesture Handling**: Display cutout/notch safe-area insetting, Edge-to-Edge display, and three-button vs full-gesture hardware back navigation.
6. **Zero Memory Leak & Thermal Stability**: 30-minute stress test observing PSS memory ceiling ($< 150\text{ MB}$) and zero thermal crashes.

---

## 4. Milestone B: Google Play Console Validation Scope

### Execution Protocol:
1. **Internal App Sharing / Internal Testing Track**:
   - Upload signed release bundle: `android/app/build/outputs/bundle/release/app-release.aab` (SHA-256: `ba8c3fd01ba9cb31a0311c0e4572f95037823ea1ef391962d863c76a6a033c1f`).
   - Validate upload certificate matches registered Play App Signing key.
2. **Dynamic Delivery & Per-Device Split Analysis**:
   - Inspect Google Play Bundle Explorer.
   - Verify compressed download sizes for specific device configurations (Expected: $\sim 18\text{--}25\text{ MB}$ per device configuration, dramatically lower than the 57.25 MB multi-ABI bundle).
3. **Automated Pre-Launch Report (Firebase Test Lab)**:
   - Run Google Play automated test crawlers across diverse physical device pool (10+ device types and screen densities).
   - Verify 0 crashes, 0 ANRs, 0 security vulnerabilities, and 0 accessibility regressions.
4. **Policy & Permission Compliance Declarations**:
   - Complete Google Play Data Safety form (financial data encryption in transit and at rest, zero advertising trackers).
   - Review and submit declaration for SMS permissions (`RECEIVE_SMS`, `READ_SMS`) under the personal financial management (PFM) policy exception.

---

## 5. Next Operational Steps

1. **Hardware Connection**:
   - Connect physical test device via USB with USB Debugging enabled (`adb devices`).
   - Once connected, run the physical device qualification runner.
2. **Play Console Submission**:
   - Upload `app-release.aab` to Google Play Console Internal Testing track for automated pre-launch audit.
