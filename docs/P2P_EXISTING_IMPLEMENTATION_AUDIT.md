# FinLife P2P Loans — Existing System Audit & Architecture Baseline
**Document Version:** 1.0.0  
**Phase:** P2P.1 (Audit & Architecture Discovery)  
**Target Milestone:** Comprehensive P2P Money Management Module with Double-Entry Cash Truth Integration  
**Date:** August 17, 2026  

---

## 1. Executive Summary

This audit establishes the baseline for transitioning FinLife from its legacy prototype state into an **Authoritative P2P Money Management Module (P2P Loans)**.

Currently, P2P loans exist as an ephemeral prototype rendered directly inside [`app/(tabs)/self.js`](file:///e:/fintech-mobile/app/(tabs)/self.js). The existing implementation lacks a domain model, does not persist to storage, uses hardcoded mockup values, does not calculate multi-period repayment/interest schedules, and—most critically—**does not communicate with Money Flow**.

The target architecture positions **P2P Loans** under the **Financial Hub**, maintaining double-entry accounting integrity with **Money Flow & Cash Truth** while strictly preserving all 39 certified test suites (C.4 through C.8).

---

## 2. Inventory of Existing P2P Components & Code

| File Location | Role / Content | Current Status / Technical Debt |
| :--- | :--- | :--- |
| [`app/(tabs)/self.js`](file:///e:/fintech-mobile/app/(tabs)/self.js#L208-L280) | State hooks (`activeP2PView`, `p2pCategoryTab`, `calcPrincipal`, `calcInterestRate`) and `computeP2PLoanMetrics()` | Ephemeral local state; ad-hoc single-payment annuity formula for calculator only. |
| [`app/(tabs)/self.js`](file:///e:/fintech-mobile/app/(tabs)/self.js#L2505-L2950) | Mock UI for Overview, Loans List (`TAKEN`/`GIVEN`/`SETTLED`), Entity View, Pending/History | Hardcoded UI values (`₹9,789,625.20`, `₹22,322,341.64`, `₹12,532,716.44`), mock sub-loans, static alert handlers. |
| [`app/(tabs)/self.js`](file:///e:/fintech-mobile/app/(tabs)/self.js#L1771-L1850) | Secondary legacy state (`p2pLoans`, `handleAddP2pLoan`, `handleEditP2pLoan`) | Duplicate legacy state array disconnected from the main P2P sub-views. |
| [`services/financialCategories.js`](file:///e:/fintech-mobile/services/financialCategories.js#L9) | Financial category definition for `p2p_repayment` | Registered as an income category in legacy file; requires accounting rule refinement so principal is not counted as ordinary income. |
| [`services/loans.js`](file:///e:/fintech-mobile/services/loans.js) | Formal Bank Loans Service | Manages formal institution debt (`STORAGE_KEYS.LOANS`). Not suitable for multi-person P2P ledger. |
| [`services/emis.js`](file:///e:/fintech-mobile/services/emis.js) | EMI schedule manager | Dedicated to formal bank EMIs (`STORAGE_KEYS.EMIS`). |
| [`services/storage.js`](file:///e:/fintech-mobile/services/storage.js) | Local encrypted storage registry | Does not yet define `STORAGE_KEYS.P2P_LOANS` or `STORAGE_KEYS.P2P_PERSONS`. |
| [`tests/`](file:///e:/fintech-mobile/tests/) | Test suites | **0** dedicated P2P unit tests, domain model tests, or accounting integration tests. |

---

## 3. Analysis of Existing vs Missing Functionality

### 3.1 Existing Functionality (Prototype Level)
1. **Sub-View Navigation Shell**: Switcher for `Overview`, `Loans List`, and `Borrower Entity View`.
2. **Category Toggling**: Toggle filters for `TAKEN`, `GIVEN`, and `SETTLED`.
3. **Interactive Loan Pre-Check Calculator**: Simple interest/amortization calculator modal with Risk Grade presets (`A`, `B`, `C`).
4. **Basic Add/Edit Modal Shell**: Rudimentary form inputs for name, amount, interest rate, and duration.

### 3.2 Missing Functionality (P0 / Critical Gap)
1. **Normalized Domain Model**:
   - No `Person` entity (name, phone, email, notes, tags).
   - No `P2PLoan` entity (direction `GIVEN`/`TAKEN`, principal, rate, interest type, dates, accountId, status `ACTIVE`/`SETTLED`/`CANCELLED`).
   - No `LoanAdvance` entity (disbursements and multi-step top-ups).
   - No `LoanRepayment` entity (principal component vs interest component breakdown).
   - No `RepaymentScheduleItem` entity (dynamic amortized/simple interest schedule with remaining principal tracking).
2. **Authoritative Financial Accounting & Money Flow Integration**:
   - Disbursements currently do not create cash events or deduct from liquid accounts.
   - Repayments do not split into Principal (Receivable reduction) vs Interest (Income/Expense).
   - Cash positions in `MoneyFlowView` are unaware of P2P activity.
3. **Person-Centric Grouping & Aggregations**:
   - Inability to group multiple loans under a single person (e.g. Kasapa Reddy Bava with 4 active loans totaling ₹10.67L).
4. **Timeline & Accrued Interest Tracking**:
   - No calculation of month-by-month accrued interest vs paid interest vs outstanding interest.
5. **Partial Payment & Dynamic Schedule Recalculation**:
   - No support for partial payments with dynamic tenure/installment adjustment.
6. **Top-Up Advances**:
   - No capability to add subsequent cash advances to an existing active loan.
7. **Settlement & Reconciliation Flow**:
   - No settlement calculation combining remaining principal, accrued unpaid interest, and waivers/adjustments.
8. **Automated Repayment Reminders**:
   - No structured reminders (7d, 3d, 1d, due date).
9. **Decision Intelligence**:
   - No collection risk alerts, cash runway pressure warnings, or idle receivable insights.
10. **Automated Test Coverage**:
    - No unit, integration, or regression tests for P2P domain logic.

### 3.3 Duplicate Functionality
- `self.js` contains two separate state declarations for P2P:
  - `fhP2pLoans` (lines 995–1003)
  - `p2pLoans` (lines 1773–1850)
  These duplicate arrays cause state divergence and must be consolidated into a single authoritative `P2PService`.

---

## 4. Current Data Model Assessment

### Existing Ephemeral Format:
```typescript
// Legacy ad-hoc object in self.js
{
  id: string,
  borrower: string,
  amount: number,
  interestRate: number,
  months: number,
  type: string
}
```
**Defects**:
- Does not support loan direction (`GIVEN` vs `TAKEN`).
- Does not track original principal vs remaining principal.
- Does not track linked bank/cash accounts.
- Does not track payment history or advances.
- Does not associate with a unique `Person` record.

---

## 5. Current Calculation Assessment

The only calculation currently implemented is `computeP2PLoanMetrics()` inside [`app/(tabs)/self.js`](file:///e:/fintech-mobile/app/(tabs)/self.js#L271-L364):
- Computes standard monthly installment: $EMI = \frac{P \cdot r \cdot (1+r)^n}{(1+r)^n - 1}$
- Calculates nominal platform fees and risk adjustments for the calculator preview.
- **Defects**: Does not support simple interest loans, does not calculate actual payment dates, does not compute principal/interest amortization splits for repayments, and does not calculate real-time accrued interest across calendar months.

---

## 6. Current Navigation & Information Architecture

- **Route**: `/(tabs)/self?tab=p2p` (accessed via Drawer Menu: `Financial Hub` → `P2P Network`).
- **Hierarchy Position**: Correctly located under **Financial Hub**.
- **Integration with Money Flow**: Currently 0% connected.

---

## 7. Accounting Rules & Money Flow Integration Contract

To prevent P2P activity from corrupting cash truth, the new module must adhere to strict double-entry principles:

| Financial Event | Cash Account Impact | P2P Balance Sheet Impact | Money Flow Category / Classification |
| :--- | :--- | :--- | :--- |
| **Loan Given** (Disbursement) | $-\text{Amount}$ | $+\text{Receivable Asset}$ | `P2P_GIVEN` (Asset swap; **NOT** an expense) |
| **Top-Up Given** (Advance) | $-\text{Amount}$ | $+\text{Receivable Asset}$ | `P2P_ADVANCE` (Asset swap; **NOT** an expense) |
| **Borrower Repayment** (Received) | $+\text{Amount}$ | $-\text{Principal Component}$ | `P2P_REPAYMENT_PRINCIPAL` (Asset swap) + `P2P_INTEREST_INCOME` ($\text{Interest Component}$) |
| **Loan Taken** (Received) | $+\text{Amount}$ | $+\text{Payable Liability}$ | `P2P_TAKEN` (Liability creation; **NOT** income) |
| **User Repayment** (Paid) | $-\text{Amount}$ | $-\text{Principal Component}$ | `P2P_REPAY_PRINCIPAL` (Liability reduction) + `P2P_INTEREST_EXPENSE` ($\text{Interest Component}$) |
| **Full Settlement** | $+/- \text{Settlement Cash}$ | Balance $\to 0$, Status $\to \text{SETTLED}$ | Reconciled principal & interest entries |

---

## 8. Potential Regression Risks & Mitigation Plan

1. **Decision Framework Integrity (C.4 to C.8)**:
   - *Risk*: Modifying net worth or liability calculations could impact Portfolio Health Score (C.7) and Action Prioritization (C.8).
   - *Mitigation*: P2P receivables and payables will be integrated via dedicated adapters without altering existing investment or formal debt contracts.
2. **Money Flow Cash Truth (AX.1 / AX.2)**:
   - *Risk*: Large loan advances (e.g. ₹2,50,000) falsely inflating monthly spending or destroying essential runway metrics.
   - *Mitigation*: Enforce `P2P_GIVEN` and `P2P_TAKEN` as non-burn asset/liability transfers in `computePeriodCashFlowTruth`.
3. **Certified Master Regression Suite**:
   - *Requirement*: All 39 test suites in `tests/run_master_regression.mjs` must maintain a 100% pass rate.
   - *Mitigation*: Add 8 dedicated P2P test suites to the master runner (`test_p2p_*.mjs`).

---

## 9. Next Steps (Phase P2P.2 & P2P.3)

With the audit complete, the next phases will proceed as follows:
1. **Phase P2P.2**: Implement normalized Domain Models in `components/p2p/p2pDomainModel.js` and `services/p2pService.js`.
2. **Phase P2P.3**: Implement the Authoritative Accounting & Calculation Engine in `components/p2p/p2pAccountingEngine.js`.
3. **Phase P2P.4–P2P.25**: Build out UI views, modals, ledgers, intelligence, and comprehensive automated test suites.
