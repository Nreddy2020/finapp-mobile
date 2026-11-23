# Plan 003 — Recurring Commitments module: crash fix, live dates, mode persistence

Status: READY FOR IMPLEMENTATION
Owner role writing this: architecture/planning only — every finding below was confirmed by reading
the actual files on disk, not guessed.

Read this whole file before touching code. **Section 1 is a guaranteed crash on a primary user
action, not a maybe — fix it first.**

---

## 0. Scope

- Screen: `app/(tabs)/recurring.js`.
- Domain code: `services/commitments/commitmentsService.js` (load/save/mode), `commitmentEngine.js`
  (payment/pause/cancel state machine), `commitmentViewModel.js`
  (`buildRecurringCommitmentsViewModel`), `commitmentCalculator.js`, `commitmentContracts.js`,
  `commitmentDateUtils.js`, `commitmentAuditTrail.js`.
- UI: `components/commitments/*.js` (6 files).
- Existing tests: `tests/test_commitment_audit.mjs`, `tests/test_commitment_engine.mjs`,
  `tests/test_commitment_migration.mjs`, `tests/test_commitment_view_model.mjs`, plus
  `tests/test_cashbook_recurring_integration.mjs` for the Cashbook↔Commitments bridge. Run with
  `node --import ./tests/mock_rn.mjs tests/<file>.mjs`.

---

## 1. `Alert` is used but never imported — guaranteed crash — CRITICAL

**File:** `app/(tabs)/recurring.js`

The import block at the top of the file is:
```js
import {
    View, ScrollView, RefreshControl, Text, StyleSheet, TouchableOpacity, BackHandler, StatusBar
} from 'react-native';
```
`Alert` is not in it, and nothing else in the file imports or defines an `Alert` global. Yet
`Alert.alert(...)` is called in five places:
- `handleSaveNewCommitment` (save failure path)
- `handleConfirmPayment` (payment failure path)
- `handleRetryPayment` (retry failure path)
- `handleReversePayment` (reversal failure path)
- `handleOpenTemplate` — **this one is not an error path.** It fires every time a user taps any of
  the three "Quick Starter Template" buttons in the empty state (Child School Tuition, Home Loan
  EMI, Family Health Insurance). Tapping any of them throws `ReferenceError: Alert is not defined`
  immediately.

Since `handleOpenTemplate` is reachable with zero existing commitments (the normal first-run state
for any new user), this is not an edge case — it is one of the first things a new user is likely to
tap, and it will crash.

**Scope:**
- Add `Alert` to the `react-native` import at the top of `app/(tabs)/recurring.js`. That is the
  entire fix — every call site already uses the correct `Alert.alert(title, message, [buttons])`
  signature.

**Acceptance criteria:**
- `Alert` appears in the `react-native` import list.
- Manually verify on an emulator: with zero commitments, tap each of the three starter-template
  buttons and confirm the "Starter Template" dialog appears instead of crashing.
- No test file currently renders this component, so this is an emulator-only check — add a note to
  whichever manual QA checklist the team uses, since nothing in the `.mjs` suite would have caught
  this (none of them import/render React components).

---

## 2. "Today" for Upcoming/Overdue is hardcoded to September 1, 2026

**File:** `app/(tabs)/recurring.js`, the `buildRecurringCommitmentsViewModel` call:
```js
const viewModel = buildRecurringCommitmentsViewModel({
    commitments,
    occurrences,
    activeFilter,
    asOfDate: '2026-09-01'
});
```
This is the same bug class found in the Cashbooks module (fixed in Plan 001) and the Budget module
(Plan 002, Section 1): a literal hardcoded date is passed as "today" to code that classifies
commitments as overdue / due soon / upcoming. Whatever the real date is, this screen always treats
September 1, 2026 as "now" — so "Overdue Liabilities" and "Upcoming Liabilities" will be wrong on
every single day except that one.

Note: `buildRecurringCommitmentsViewModel`'s own default (`asOfDate = '2026-09-04'` in
`commitmentViewModel.js`) is a separate, slightly different hardcoded literal — a smaller
inconsistency worth cleaning up while in this code, but the call site's explicit override is the one
that actually matters in production, since it always wins over the default.

**Scope:**
- `app/(tabs)/recurring.js`: compute `asOfDate` from the real current date instead of the literal.
  Check `services/commitments/commitmentDateUtils.js` first — it likely already has (or should
  have) the canonical "local YYYY-MM-DD for today" helper used elsewhere in this service; prefer
  that over inventing a new one, and prefer it over `commitmentEngine.js`'s own
  `new Date().toISOString().split('T')[0]` pattern (UTC-based, same category of issue the Cashbook
  date bug was) if a local-date helper already exists.
- `services/commitments/commitmentViewModel.js`: the function's own default (`'2026-09-04'`) can
  stay as a default *only if* existing tests depend on it for deterministic output — check
  `tests/test_commitment_view_model.mjs` first. If nothing depends on the literal, change the
  default to a real current-date computation too, for defense in depth.

**Acceptance criteria:**
- With no explicit `asOfDate` override, opening the Recurring tab classifies commitments as
  overdue/upcoming relative to the real current date, not September 2026.
- Extend `tests/test_commitment_view_model.mjs` with a case that passes today's real date explicitly
  and asserts the overdue/upcoming split is computed relative to it, not to a hardcoded literal.

---

## 3. Demo/Production mode is never persisted, and the screen always starts in DEMO

**Files:** `app/(tabs)/recurring.js`, `services/commitments/commitmentsService.js`,
`components/commitments/CommitmentHeroCard.js`

Three compounding problems:

1. **The screen's local mode state always starts as `'DEMO'`** (`useState('DEMO')`) and is never
   synced from the persisted mode. `CommitmentsService.getMode()` reads a stored value
   (`StorageService.load(STORAGE_KEY_APP_MODE)`) — but `recurring.js` never calls it. So even if the
   founder previously switched to Production mode somewhere else in the app, this screen ignores
   that and opens in DEMO every time it mounts.
2. **Toggling the mode in this screen does not persist it.** `toggleAppMode()` only calls
   `setAppMode(nextMode)` — local React state. It never calls `CommitmentsService.setMode(nextMode)`.
   So flipping to Production, adding real commitments, then navigating away and back resets to DEMO
   fixture data again. The real commitments aren't lost (they're in storage under the Production
   path), but the founder will see fake data and may think their data disappeared.
3. **The toggle itself is not gated behind `__DEV__`.** `CommitmentHeroCard` renders the DEMO/
   PRODUCTION badge and lets anyone tap it whenever `onToggleMode` is passed, which `recurring.js`
   always does. This is the same class of issue fixed for Cashbooks in Plan 001, Section 5 (Option
   A: remove from production, or gate behind `__DEV__`) — it hasn't been applied here yet.

**Scope:**
- `app/(tabs)/recurring.js`: on mount, call `CommitmentsService.getMode()` and initialize `appMode`
  from it instead of hardcoding `'DEMO'`.
- `toggleAppMode`: after `setAppMode(nextMode)`, also call `await CommitmentsService.setMode(nextMode)`
  so the choice persists across screen visits.
- Decide and implement the same way Plan 001 Section 5 did for Cashbooks: either remove the toggle
  from the production UI entirely, or gate it behind `__DEV__` in `CommitmentHeroCard.js`. Pick
  whichever this project settled on for Cashbooks and stay consistent — don't re-litigate the
  decision independently for this module.

**Acceptance criteria:**
- Fresh app install, no prior mode set: Recurring tab shows whatever `getMode()`'s own default
  resolves to (check `commitmentsService.js:getMode` — currently defaults to `PRODUCTION` if nothing
  is stored, which is correct; just make sure the screen actually asks it instead of hardcoding
  `'DEMO'`).
- Toggling mode, leaving the screen, and returning shows the same mode that was last selected.
- If gating was chosen: the toggle cannot be tapped or seen in a production (`__DEV__` false) build.

---

## 4. Occurrence/commitment IDs and payment dates — verify against the established paise/local-date convention

This section is a *check*, not a known bug — flag it explicitly so the implementing agent verifies
rather than assumes.

- `commitmentEngine.js` uses `new Date().toISOString().split('T')[0]` in several places (default
  `asOfDate`, `actualPaidDate` fallback) — this is UTC-based, the same category of bug that was
  fixed for Cashbooks (local date vs. UTC date, Plan 001). Confirm whether this causes any
  observable issue here (e.g. a payment made late at night IST landing on the wrong calendar day in
  the audit trail) and if so, switch to the project's established local-date helper.

**Acceptance criteria:**
- Either confirmed as a non-issue (document why — e.g. these fields are informational/audit-only
  and nothing downstream keys off same-day comparisons across the UTC/IST boundary), or fixed to use
  a local-date helper, with a test added to `tests/test_commitment_engine.mjs` covering a
  late-evening IST timestamp.

---

## Decisions

(Fill this in as each section is implemented — one line per section.)

- Section 1:
- Section 2:
- Section 3:
- Section 4:

---

## Suggested order of work

1. Section 1 (`Alert` import) — one line, fixes a guaranteed crash. Do this first, today.
2. Section 3 (mode persistence) — medium, but high founder-trust impact (fake data appearing to
   replace real data is alarming even when nothing was actually lost).
3. Section 2 (hardcoded `asOfDate`) — small, same pattern already fixed twice elsewhere in this
   codebase.
4. Section 4 (UTC vs local date audit) — do last; it's a verification pass, not a known defect.

After each section: run the four commitment test files listed in Section 0. Section 1 and the mode
toggle in Section 3 need a hands-on emulator check — nothing in the `.mjs` suite renders components
or simulates taps.
