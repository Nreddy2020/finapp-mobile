# Stage C.5.4 — Master Statement & Tax Report View / Export Engine Architecture Plan

**Stage**: `Stage C.5.4`  
**Certified Baseline**: [`3269cbc`](https://github.com/Nreddy2020/finapp-mobile/commit/3269cbc)  
**Status**: Architecture Gate Review (Implementation Gate: 🔒 LOCKED)

---

## 1. Architectural Boundary & Principle

Stage C.5.4 implements the **Master Statement & Tax Report View and Export Engine**, consuming the certified Stage C.4.4 statement and FIFO tax lot engine in a strictly read-only manner.

```
┌────────────────────────────────────────────────────────┐
│     Stage C.4.4 Certified Master Statement Engine 🔒   │
│          InvestingAnalyticsEngine.js                   │
└──────────────────────────┬─────────────────────────────┘
                           │
                           │ READ-ONLY generatePortfolioStatement()
                           ▼
┌────────────────────────────────────────────────────────┐
│               Stage C.5.4 Presentation                │
│                                                        │
│  components/investments/                               │
│  ├── MasterStatementCard.js                            │
│  ├── TaxReportModal.js                                 │
│  └── StatementExportService.js (JSON/CSV formatters)   │
│                                                        │
│  app/(tabs)/investments.js (Mounting below C.5.3)      │
└────────────────────────────────────────────────────────┘
```

### Core Invariants:
1. **Zero UI-Side Financial Recalculation**:
   - The UI layer strictly consumes returned `statementMetadata`, `asOfSnapshot`, `periodActivity`, `taxLotBreakdown`, and `auditSummary`.
   - The UI never computes FIFO matching, WAC gains, STCG/LTCG holding period splits, or tax liabilities.
2. **Frozen Modules**:
   - `services/investingAnalyticsEngine.js` 🔒 (100% Frozen)
   - `services/storage.js` 🔒 (100% Frozen)
   - `services/moneyFlowEngine.js` 🔒 (100% Frozen)
   - `services/investingSchemas.js` 🔒 (100% Frozen)
3. **Multi-Portfolio Isolation**:
   - Statement generation is strictly scoped to the active `portfolioId` selection (`null` aggregates global universe).
4. **Export Formatting Engine**:
   - Generates deterministic JSON, CSV, and shareable plain-text representations directly from the engine output without mutating storage or recomputing math.
5. **Theme Semantic Tokens**:
   - Visual styling strictly consumes `COLORS.*` semantic tokens (`COLORS.primary`, `COLORS.success`, `COLORS.error`, `COLORS.warning`, `COLORS.info`, `COLORS.textPrimary`, `COLORS.textSecondary`, `COLORS.textTertiary`, `COLORS.surface`, `COLORS.border`, `COLORS.card`).

---

## 2. Component Design & Presentation Data Contract

### A. `MasterStatementCard.js` (Mounted in `investments.js`)
- **Executive Statement Summary**:
  - Period Badge: `All Time`, `FY 2024-25`, `FY 2025-26`, `Custom Period`.
  - Period Trading Activity Matrix: Buys, Sells, Dividends, Net Period Cash Flow.
  - Realized Capital Gain & Tax Summary: Total Realized Gain, STCG (@ 20%), LTCG (@ 12.5%), Total Tax Liability.
  - Action Buttons:
    - `View Full Tax Report` (Opens `TaxReportModal`).
    - `Export Statement` (Share / Copy CSV / JSON).

### B. `TaxReportModal.js`
- **FIFO Tax Lot Breakdown Table**:
  - Detailed lot-by-lot table displaying: `Symbol`, `Asset Type`, `Sell Date`, `Buy Date`, `Holding Days`, `Quantity`, `Cost Basis`, `Proceeds`, `Realized Gain`, `Tax Category` (`STCG` vs `LTCG`), `Tax Rate`, `Tax Liability`.
- **Audit & Integrity Banner**:
  - Surfaced when `auditSummary.isConsistent === false` or `auditSummary.integrityWarnings.length > 0`.

### C. `StatementExportService.js` (Export Formatter)
- `exportToJSON(statement)`: Produces clean, schema-validated JSON payload.
- `exportToCSV(statement)`: Produces RFC-4180 compliant CSV strings for Tax Lots and Trading Summary.
- `exportToShareText(statement)`: Formats human-readable summary for sharing / clipboard.

---

## 3. Automated 20-Point Acceptance Test Matrix (`tests/test_c54.mjs`)

| # | Test Scenario | Expected Outcome & Verification |
| :- | :--- | :--- |
| **1** | Full Period Statement Generation Contract | Verified all master statement contract keys present |
| **2** | Period Filtering (`FY_2024_25` vs `ALL_TIME`) | Verified statement respects `startDate` and `endDate` |
| **3** | STCG / LTCG FIFO Tax Lot Breakdown | Verified tax lot attributes and rate calculations from engine |
| **4** | Trading Activity Cash Flows Reconciliation | Verified buys + sells + dividends sum to `netPeriodCashFlow` |
| **5** | Valuation Snapshot Consistency with C.4.1 | Verified `asOfSnapshot.valuation` matches `getPortfolioSummary` |
| **6** | Allocation Snapshot Consistency with C.4.2 | Verified `asOfSnapshot.allocation` matches `getAssetAllocationSummary` |
| **7** | Performance Snapshot Consistency with C.4.3 | Verified `asOfSnapshot.performance` matches `getPerformanceMetrics` |
| **8** | Multi-Portfolio Statement Isolation | Portfolio A and B statements remain strictly isolated |
| **9** | All-Portfolios Universe Statement Aggregation | `portfolioId: null` aggregates across all holdings and trades |
| **10** | Empty Statement Safe Presentation | 0 trades / 0 holdings returns valid statement without NaN |
| **11** | Incomplete Ledger Integrity Warning Surface | Incomplete history surfaces `auditSummary.isConsistent: false` |
| **12** | Quote Fallback Valuation Status Surface | Fallback valuation basis identified in statement snapshot |
| **13** | JSON Export Formatter Schema Validation | JSON export matches statement schema and validates cleanly |
| **14** | CSV Export Formatter RFC-4180 Compliance | CSV header and row delimiters formatted without corruption |
| **15** | Shareable Plain Text Formatter | Text export formats currency, percentages, and summaries |
| **16** | Zero UI-Side Recalculation Invariant | Verifies UI consumes engine output verbatim without recomputing |
| **17** | Zero State Mutation Invariant | Exactly 0 MoneyFlow or holding mutations during export/statement generation |
| **18** | Semantic Theme Token Compliance | Verified all visual tokens consume `COLORS.*` |
| **19** | Strict Exit Code 1 Enforcement | Hardened test runner terminates with code 1 on any failure |
| **20** | Full Prior System Regression (137/137 Baseline) | Stages C.4.1–C.4.4, C.5.1–C.5.3 remain 100% passing (157 total) |

---

## 4. Test Hardening & Gate Enforcement

- `tests/test_c54.mjs` will enforce `process.exit(1)` upon any failure or exception.
- Total committed regression tests will advance from 137 to **157/157 tests**.
