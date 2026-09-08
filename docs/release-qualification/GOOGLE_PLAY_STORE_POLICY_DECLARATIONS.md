# FinLife — Google Play Store Policy & Compliance Declarations

> **Target Package**: `com.nirwas20.wealthwise` (Version Code: 1, Version Name: 1.0.0)  
> **Target Artifact**: `android/app/build/outputs/bundle/release/app-release.aab` (SHA-256: `ba8c3fd0...`)  
> **Document Purpose**: Production Google Play Console Declaration Packet  
> **Repository Path**: `docs/release-qualification/GOOGLE_PLAY_STORE_POLICY_DECLARATIONS.md`  

---

## 1. Sensitive Permissions Declaration: SMS (`RECEIVE_SMS`, `READ_SMS`)

Google Play restricts SMS permissions to specific permitted core use cases. FinLife qualifies under the **Personal Financial Management (PFM)** permitted use case.

### A. Core Use Case Category
- **Selected Use Case**: `Personal financial management (PFM)`
- **Core Functionality**: Real-time financial transaction tracking, automated bank SMS parsing, and expense/cashbook ledger synchronization.

### B. Declaration Text for Play Console
```text
FinLife is an offline-first personal financial management (PFM) and wealth intelligence application. 
The RECEIVE_SMS and READ_SMS permissions are strictly utilized for automated financial ledger tracking:
1. Real-time extraction of incoming bank, UPI, credit card, and ATM transaction alerts.
2. Parsing sender headers (e.g., HDFCBK, SBIBNK, ICICIB), monetary amounts, transaction types (debit/credit), and balance notifications.
3. Offline ledger entry creation without manual data entry.

Security and Privacy Guarantees:
- All SMS processing is performed 100% locally on the device using native Kotlin regular expression parsers.
- Raw SMS content is NEVER transmitted off-device, NEVER uploaded to cloud servers, and NEVER shared with third parties.
- OTPs, two-factor authentication codes, and personal conversational messages are strictly filtered out and discarded immediately.
- Users can disable SMS parsing at any time within the application settings.
```

### C. Compliance Video Demonstration Script
- **Video Requirement**: Google Play requires a direct YouTube link (< 2 minutes) demonstrating the feature.
- **Demonstration Flow**:
  1. User opens FinLife Settings -> Toggles "Automated SMS Tracking".
  2. Runtime permission dialog is displayed explaining the financial purpose.
  3. A mock transactional bank SMS arrives (e.g., "Rs 500 debited from A/C XX1234 on 08-SEP-26. Avl Bal: Rs 12,500").
  4. FinLife parses the message and automatically populates the Cashbook/Expense ledger with zero drift.

---

## 2. Google Play Data Safety Section Mapping

| Data Category | Data Type | Collected? | Shared? | Purpose | Ephemeral? | Encrypted in Transit? | Encrypted at Rest? |
| :--- | :--- | :---: | :---: | :--- | :---: | :---: | :---: |
| **Financial Info** | User financial accounts, transactions, balances | Yes (Local Only) | **NO** | App Functionality, Analytics (Local) | No | N/A (Offline Local) | **Yes (AES-256-GCM / AndroidKeyStore)** |
| **Personal Info** | Name, Phone Number | Optional (Local) | **NO** | P2P Ledger Contacts (Local) | No | N/A | **Yes** |
| **Messages** | SMS / Transaction text | Processed Locally | **NO** | Financial Transaction Parsing | **Yes (Discarded after parse)** | N/A | **N/A (Raw SMS not retained)** |
| **Device / IDs** | Device identifiers, advertising ID | **NO** | **NO** | None | N/A | N/A | N/A |
| **Location** | Precise or coarse location | **NO** | **NO** | Pruned via tools:node="remove" | N/A | N/A | N/A |

### Key Safety Invariants:
- **Zero Third-Party Data Sharing**: No user data, financial data, or diagnostics are sold or transferred to third-party ad networks or brokers.
- **Data Deletion Mechanism**: Users can wipe all local financial databases directly within Settings via "Clear All Financial Data".

---

## 3. Financial Services Policy & Target API Compliance

- **Non-Lending Entity**: FinLife is a personal budgeting and financial aggregation tool. It is **not** a digital lending platform, NBFC, or loan originator. No high-APR payday loans or credit products are extended.
- **Target SDK**: `targetSdkVersion 36` (Android 16), exceeding the Google Play minimum mandate of $\ge 34$.
- **64-Bit Native Libraries**: Compliant via bundled `arm64-v8a` and `x86_64` libraries.
- **Backup Configuration**: `android:allowBackup="false"` prevents unauthorized cloud extraction of local financial ledgers.

---

## 4. Release Notes (What's New) — Version 1.0.0 (1)

```text
FinLife 1.0.0 Release Candidate:
• Financial Command Center: Unified net worth, capital asset allocation, and multi-book cashbook ledger.
• Real-Time Money Flow: Automated transaction tracking, multi-category budgeting, and cashflow analytics.
• P2P Lending & Borrowing: Bilateral ledger contracts, repayment tracking, and health metrics.
• Offline-First Durability: Write-Ahead Logging (WAL) and AES-256-GCM encrypted backup and restore.
• Hardened Security: Target Android 16 (API 36), zero background PII leakage, and biometric vault integration.
```
