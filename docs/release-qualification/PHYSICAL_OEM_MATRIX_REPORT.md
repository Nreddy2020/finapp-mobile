# Physical Android OEM Hardware Matrix — Qualification Status

> **Status**: `PENDING_PHYSICAL_HARDWARE`  
> **Package ID**: `com.nirwas20.wealthwise`  
> **Current Milestone**: Post-Gate R8 Hardware Qualification  
> **Date**: `2026-09-08T11:34:47.146Z`  

---

## 1. Status Overview

The release qualification pipeline has certified Gates R1 through R8 at **1,123 / 1,123 assertions (100% pass rate)**.
Physical OEM Hardware Matrix testing is queued awaiting physical hardware connection.

### Connected Device Inventory:
- **Physical Devices Attached**: None
- **Active Emulators**: `emulator-5554`

---

## 2. Required OEM Device Target Matrix

| Tier | OEM / Family | Reference Models | Target OS & Arch | Key Qualification Focus |
| :--- | :--- | :--- | :--- | :--- |
| **OEM-1** | **Google Pixel** | Pixel 7 / 8 / 9 | Android 14 / 15 / 16 (`arm64-v8a`) | Stock AOSP behavior, 120Hz smooth scrolling, gesture nav, BiometricPrompt |
| **OEM-2** | **Samsung Galaxy** | Galaxy S22 / S23 / S24 or A-series | One UI 6 / 7 (Android 14 / 15) | Aggressive app sleep, Knox isolation, custom background task killing |
| **OEM-3** | **Xiaomi / Redmi** | Xiaomi 13 / 14 or Redmi Note | HyperOS / MIUI (Android 14 / 15) | Autostart permission restrictions, non-standard broadcast killing |

---

## 3. Physical Hardware Test Suite Readiness

The automated physical runner is implemented at `tests/release-qualification/verify_physical_oem_matrix.mjs`. As soon as a physical device is connected with USB Debugging enabled, it will automatically execute:
1. Hardware & Platform Interrogation (Model, OEM, API level, ABI, display metrics)
2. Universal Package Installation & Architecture Alignment
3. Hardware Cold Startup Benchmarking (Median & Worst-Case TTID across 3 runs)
4. PSS Memory Auditing under standardized navigation workload (< 180 MB)
5. Hardware Biometric / StrongBox / TEE security bridge interrogation
6. OEM Background & Battery Optimization detection
7. System Perturbation (Font Scale 1.0 -> 1.3 -> 1.0 with strict try-finally restoration)
8. Window Insets & Display Cutout Safe Area adaptation
9. Deterministic Three-Tier Back Navigation
10. Financial State Hydration & 0 Paise Balance Drift
11. Logcat Privacy (0 PAN, PIN, or bearer token leaks)