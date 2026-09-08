# Gate R8: Store Packaging & AAB Readiness — Implementation Plan

> **Document Type**: Release Candidate Implementation Plan & Review Document  
> **Status**: PENDING REVIEW & APPROVAL  
> **Target Package**: `com.nirwas20.wealthwise` (FinLife Android)  
> **Target Artifact**: Android App Bundle (`app-release.aab`)  
> **Target Scope**: 16 Authoritative Assertions across 5 Packaging Dimensions  
> **Repository Path**: `docs/release-qualification/GATE_R8_STORE_PACKAGING_AAB_PLAN.md`  

---

## 1. Executive Summary & Audit Mandate

Following the formal qualification and freezing of:
- **Core Financial Ecosystem**: 847 / 847 PASS
- **Gates R1 through R5**: 111 / 111 PASS (Frozen RC Baseline: 958 / 958)
- **Financial Command Center & Reports V1**: 97 / 97 PASS (Certified Total: 1,055 / 1,055)
- **Gate R6 (Security & Privacy Release Audit)**: 28 / 28 PASS (Certified Total: 1,083 / 1,083)
- **Gate R7 (Emulator Android Power/Lifecycle Baseline)**: 24 / 24 PASS (Certified Total: 1,107 / 1,107)

We proceed to formulate the execution plan for the final pre-production store readiness gate:

$$\mathbf{GATE\ R8:\ STORE\ PACKAGING\ \&\ AAB\ READINESS}$$

The purpose of Gate R8 is to verify that FinLife compiles into a production-grade, cryptographically signed, Google Play Store-compliant **Android App Bundle (`.aab`)**. The bundle must satisfy all Google Play distribution invariants: 64-bit architecture alignment, `targetSdkVersion 36` compliance, bundle download size constraints ($< 150\text{ MB}$), ProGuard/R8 bytecode optimization and reflection safety, least-privilege manifest pruning, and zero runtime linking or reflection regressions.

---

## 2. Reconciled Cumulative Qualification Accounting

| Pipeline Milestone / Gate | Domain / Scope Description | Status | Assertions |
| :--- | :--- | :---: | :---: |
| **Core Financial Ecosystem** | **Investments (151), Cashbook (129), Shared Costs (59), Banking & P2P (508)** | Certified & Frozen | **847 / 847** |
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
| **Current Certified Baseline Total** | **Cumulative certified baseline** | **Certified & Frozen** | **1,107 / 1,107** |
| **Gate R8: Store Packaging & AAB Readiness**| **AAB Bundle, R8/ProGuard, Play Store Compliance, Universal Run** | **TARGET (Under Review)** | **16 / 16** |
| **Projected Cumulative Total** | **Post-Gate R8 Total** | **Projected** | **1,123 / 1,123** |
| **Physical OEM Hardware Matrix** | Pixel, Samsung Galaxy, Xiaomi Physical Matrix | Pending Devices | Separate Gate |
| **Full Production Release Approval** | Global sign-off across all gates | Withheld | Pending R8 & Physical |

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

## 3. Preserved Scope & Governance Boundaries

> [!IMPORTANT]
> **Preserved Scope Boundaries**:
> 1. **Additive Assertion Invariant**: Gate R8 adds exactly 16 assertions ($1,107 \rightarrow 1,123$). Prior gate assertions remain frozen and unaltered.
> 2. **Physical OEM Qualification Distinction**: Gate R8 certifies packaging, bundle generation, bytecode optimization, and Play Store readiness. Physical device hardware testing (Pixel, Samsung One UI, Xiaomi HyperOS) remains a distinct required milestone that executes against attached physical devices.
> 3. **Non-Destructive Compilation**: Release bundle generation will be executed using production signing properties without altering the certified release APK (`app-release.apk`) SHA-256 checksum (`739dad64...`).

---

## 4. Gate R8 Invariant Directives & Test Assertions (16 / 16)

### Dimension 1: Android App Bundle (AAB) Generation & Artifact Integrity (4 Assertions)
- **`R8-AAB-01`**: **Deterministic Release AAB Compilation**
  - Verify Gradle `bundleRelease` compiles without errors, producing `android/app/build/outputs/bundle/release/app-release.aab`.
- **`R8-AAB-02`**: **Google Play Bundle Size Threshold Compliance**
  - Verify compressed bundle size is $< 150\text{ MB}$ (Google Play hard threshold; expected $\sim 30\text{--}40\text{ MB}$).
- **`R8-AAB-03`**: **64-Bit ABI Alignment & Multi-Architecture JNI Libs**
  - Inspect AAB internal structure (`base/lib/`): verify presence of 64-bit ABIs (`arm64-v8a`, `x86_64`) alongside 32-bit fallbacks (`armeabi-v7a`, `x86`).
- **`R8-AAB-04`**: **Resource & Asset Table Optimization**
  - Inspect `base/resources.pb` and `base/assets/`: verify PNG crunching, WebP asset compression, and zero orphaned debug assets.

### Dimension 2: Cryptographic Signing & Play App Signing Compatibility (3 Assertions)
- **`R8-SIGN-01`**: **Production Keystore & RSA 4096-bit Bundle Signing**
  - Verify release AAB is cryptographically signed using `wealthwise-key` from production keystore.
- **`R8-SIGN-02`**: **Certificate Fingerprint SHA-256 Consistency**
  - Verify signing certificate SHA-256 strictly matches frozen production certificate: `34b440df73ed736dd95205e1a0ac69f3c59f99250201064abe4fb6b7fc7000cb`.
- **`R8-SIGN-03`**: **Play App Signing Upload Key Compatibility**
  - Verify signing block satisfies Google Play App Signing v1/v2/v3 signing specifications.

### Dimension 3: Bytecode Obfuscation, R8 / ProGuard, & Dead Code Elimination (3 Assertions)
- **`R8-PROG-01`**: **ProGuard / R8 Rules Audit (`proguard-rules.pro`)**
  - Verify configuration preserves critical reflection entry points, Hermes engine bindings, and native modules without over-retention.
- **`R8-PROG-02`**: **JNI Native Bridges & Native Crypto Engine Preservation**
  - Verify `FinlifeCryptoEngine.kt`, `FinlifeSmsModule.kt`, and `FinlifeSmsBroadcastReceiver.kt` keep rules prevent native linking errors (`UnsatisfiedLinkError`).
- **`R8-PROG-03`**: **DEX Bytecode Sanitization (Zero Test Hooks in Release)**
  - Scan compiled DEX files in AAB: verify zero test fixtures, debug fault injection hooks, or development menus in compiled bytecode.

### Dimension 4: Google Play Store Policy & Security Compliance (3 Assertions)
- **`R8-PLAY-01`**: **Target API Level Compliance (`targetSdkVersion 36`)**
  - Verify `targetSdkVersion` is 36 (exceeding Google Play requirement of $\ge 34$), and `minSdkVersion` is 24 (Android 7.0+).
- **`R8-PLAY-02`**: **Least-Privilege Merged Manifest Permissions Pruning**
  - Verify merged manifest inside bundle contains zero unauthorized high-risk permissions (`CAMERA`, `RECORD_AUDIO`, `WRITE_EXTERNAL_STORAGE`, `SYSTEM_ALERT_WINDOW`, `LOCATION`).
- **`R8-PLAY-03`**: **Android OS Backup Disabled (`android:allowBackup="false"`)**
  - Verify merged bundle manifest strictly specifies `android:allowBackup="false"` to prevent unauthorized ADB data extraction.

### Dimension 5: Universal Package Extraction & Runtime Execution (3 Assertions)
- **`R8-RUN-01`**: **Universal Package Extraction from AAB**
  - Extract universal APK from release AAB and verify archive integrity, AndroidManifest parsing, and resource table resolution.
- **`R8-RUN-02`**: **Bundle-Extracted Package Cold Launch & JNI Resolution**
  - Install extracted package on emulator; verify cold launch TTID, active window focus, and zero native library loading crashes.
- **`R8-RUN-03`**: **Financial Domain Hydration & State Integrity**
  - Verify all 7 financial report source groups and 9 underlying domain models load and calculate with 100% integrity from the bundle artifact.

---

## 5. Execution Pipeline & Generated Artifacts

The automated test runner will be implemented as:
```bash
node --import ./tests/mock_rn.mjs tests/release-qualification/verify_gate_r8_store_packaging.mjs
```

Generated reports:
- `tests/release-qualification/Gate_R8_STORE_PACKAGING_REPORT.json`
- `docs/release-qualification/GATE_R8_STORE_PACKAGING_REPORT.md`
