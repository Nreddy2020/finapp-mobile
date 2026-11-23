# Plan 002 — Budget module: correctness, navigation, and cleanup

Status: READY FOR IMPLEMENTATION
Owner role writing this: architecture/planning only — every finding below was confirmed by reading
the actual files on disk, not guessed. File paths and line references are from the current repo.

Read this whole file before touching code. Sections are ordered by severity; do Section 1 first —
it is the single worst bug in this module and touches the fewest files.

---

## 0. Scope and how to work in this repo

- Screens: `app/(tabs)/budgets.js` (main tab — Overview / Categories / Planner) and
  `app/budget-planner.js` (a second, currently unreachable, standalone route — see Section 4).
- Domain code: `services/budgets.js` (CRUD + actuals), `services/budget/budgetContracts.js`
  (`resolveBudgetPeriod`, `parsePaise`, `CATEGORY_TYPE_MAPPING`), `services/budget/budgetEngine.js`,
  `services/budget/budgetViewModel.js` (`buildBudgetControlCenterViewModel`, `formatCurrency`).
- UI: `components/budget/*.js` (13 files; 3 of them are dead — see Section 5).
- Existing tests: `tests/test_budget_decision_engine.mjs`, `tests/test_budget_view_model_truth.mjs`,
  `tests/budget/test_budget_authoritative_integration.mjs`,
  `tests/budget/test_budget_e2e_request_flow.mjs`. Run with
  `node --import ./tests/mock_rn.mjs tests/<file>.mjs`. Extend these rather than creating parallel
  suites unless a section below says otherwise.
- `services/budget/budgetContracts.js` already has correct paise-aware helpers (`parsePaise`,
  `*Paise` fields) and `resolveBudgetPeriod` already defaults `now` to a real `new Date()`
  correctly. The bugs in this module are in code that overrides those correct defaults with
  hardcoded demo values — do not touch `budgetContracts.js`'s own defaults, they're fine.

---

## 1. "Today" is hardcoded to September 18, 2026 everywhere — CRITICAL

**Problem:** `buildBudgetControlCenterViewModel` in `services/budget/budgetViewModel.js` has:

```js
now = new Date(2026, 8, 18) // Default to Sep 18, 2026 for consistent sample timeline
```

`app/(tabs)/budgets.js` calls this function and never passes `now`, so every live render computes
"today" as September 18, 2026 — regardless of the device's actual date. This silently poisons:
days-remaining-in-month, "safe to spend today" / "safe to spend until month end", the spending
forecast, and anything else in the view model keyed off `now`.

This is the same bug class as the UTC-vs-local-date bug fixed in the Cashbooks module (Plan 001) —
a hardcoded/wrong notion of "today" feeding financial calculations — except here it's not an
hours-off timezone bug, it's wrong by whole months, permanently, regardless of when the founder
opens the app.

**Scope:**
- `services/budget/budgetViewModel.js`: this default exists "for consistent sample timeline" —
  i.e. it's there so the *test suite* gets deterministic output. Keep it as the function's default
  (tests may rely on it — check `tests/test_budget_view_model_truth.mjs` and
  `tests/budget/test_budget_authoritative_integration.mjs` before changing the signature), but the
  production caller must never rely on the default.
- `app/(tabs)/budgets.js`: pass `now: new Date()` explicitly in the `buildBudgetControlCenterViewModel(...)`
  call.
- Also check `services/budgets.js:302` — `getBudgetsWithActuals: async (periodKey = '2026-09', ...)`
  and the `selectedMonth` state in `app/(tabs)/budgets.js` (`useState('2026-09')`). Both must default
  to the real current month (`YYYY-MM` from the actual current date), not a literal string. There is
  already a correct pattern for this at `services/budgets.js:551`
  (`periodKey = new Date().toISOString().substring(0, 7)`) — reuse that, but be aware
  `toISOString()` is UTC; for a `YYYY-MM` string this only matters within a few hours of midnight IST
  on the 1st/last day of the month, so prefer a local-date-based month string if the project already
  has one (check `services/cashbook/cashbookDates.js` for the established local-date convention
  before inventing a new one).

**Acceptance criteria:**
- Opening the Budgets tab with no `selectedMonth` override shows the real current month, not
  September 2026, on any date the test is run.
- Extend `tests/test_budget_view_model_truth.mjs` (or add a focused test) asserting that calling
  `buildBudgetControlCenterViewModel` with an explicit recent `now` (e.g. today's real date) produces
  a `period` matching that date, not the September 2026 default.
- Existing tests that rely on the Sep-18-2026 default (if any) must still pass — they call the
  function directly and can keep omitting `now`; only the screen's call site changes.

---

## 2. The month calendar is non-functional and hardcoded to September 2026

**File:** `components/budget/BudgetCalendarModal.js`

Three separate problems, all stemming from the same root cause as Section 1:

1. **Month navigation does nothing.** Lines ~53-54:
   ```jsx
   <TouchableOpacity style={styles.navChevron}><ChevronLeft size={16} color="#94A3B8" /></TouchableOpacity>
   <TouchableOpacity style={styles.navChevron}><ChevronRight size={16} color="#94A3B8" /></TouchableOpacity>
   ```
   Neither has an `onPress`. There is no way to view any month other than whatever `calendarData`
   was built for — which, per Section 1, is always September 2026 today.
2. **The calendar grid's weekday alignment is hardcoded.** `startDayOffset = 1` with the comment
   "September 2026 starts on Tuesday (offset = 1)" — this is correct only for that one month. For
   every other month the grid will misalign day-of-week columns.
3. **The selected-day label is hardcoded.** `selectedDay` defaults to `5`, and the render has
   `{selectedDay === 5 ? 'Fri, 5 Sep 2026' : ...}` — a literal hardcoded date string shown whenever
   day 5 is selected, in any month, in any year.

**Scope:**
- Add real month navigation: the chevrons should call back up to the parent (`app/(tabs)/budgets.js`)
  to change `selectedMonth`, which already flows into `buildBudgetControlCenterViewModel` and
  `vm.calendar`/`vm.period`. Wire `onPrevMonth`/`onNextMonth` props through
  `BudgetCalendarModal` instead of mutating local-only state that doesn't affect the underlying data.
- Compute the weekday offset from the real period (`calendarData.period`) using standard date math
  (e.g. `new Date(year, monthIndex, 1).getDay()`, adjusted for a Monday-first week since
  `DAYS_OF_WEEK` starts at `'Mon'`) instead of a hardcoded constant.
- Remove the hardcoded `selectedDay === 5 ? 'Fri, 5 Sep 2026' : ...` special case. Format the
  selected date from the actual `period.year` / `period.monthName` (or better, an actual date
  object) and the selected day number, the same way the rest of the label is built for non-5 days.

**Acceptance criteria:**
- Navigating to the previous/next month changes what's displayed (events, summary totals, grid
  alignment) — verify by hand on an emulator for at least 2 adjacent months, since this is UI
  wiring that the existing `.mjs` test suites (which don't render components) won't catch.
- A unit test (extend `tests/test_budget_view_model_truth.mjs` or add one) asserting the weekday-offset
  calculation is correct for at least 3 different months/years (pick ones with different starting
  weekdays, e.g. a month starting on Sunday and one starting on Saturday) — this is pure date math
  and should be tested without rendering anything.
- No literal "Fri, 5 Sep 2026" (or any other hardcoded date string) remains in this file.

---

## 3. AddBudgetModal: `alert()` instead of `Alert.alert`, and no delete confirmation

**File:** `components/budget/AddBudgetModal.js`

1. **Wrong alert API.** `handleSave` uses the bare `alert(...)` (the web/browser global) for
   validation messages:
   ```js
   if (!limit.trim()) {
       alert('Please set a budget limit');
       return;
   }
   ```
   React Native does not have a global `alert()` on native platforms by default. This means a
   founder entering an empty or invalid budget limit may see nothing happen at all — no feedback,
   just a swallowed tap — rather than a validation message. Compare to the rest of the app (e.g. the
   Cashbooks module after Plan 001), which uses React Native's `Alert.alert(title, message)` from
   `react-native`.
2. **No delete confirmation.** `handleDelete` calls `onDelete(editingBudget.id)` immediately with no
   "Are you sure?" step — a stray tap permanently removes a budget category with no chance to
   cancel.

**Scope:**
- Import `Alert` from `react-native` (already used elsewhere in the project) and replace both
  `alert(...)` calls in `handleSave` with `Alert.alert('Invalid budget', '<message>')`.
- Wrap `handleDelete` in an `Alert.alert('Delete this budget?', '<category name> will be removed. This can't be undone.', [{text:'Cancel', style:'cancel'}, {text:'Delete', style:'destructive', onPress: () => onDelete(editingBudget.id)}])`
  confirmation, matching the pattern already used for the Cashbooks delete-book confirmation
  (Plan 001, Section 2).

**Acceptance criteria:**
- No bare `alert(` call remains in `components/budget/AddBudgetModal.js`.
- Deleting a budget always shows a confirmation dialog first; cancelling leaves the budget intact.
- No existing `.mjs` test suite covers this file's UI directly (it's component-level, not
  service-level) — verify by hand on an emulator: try to save with an empty limit, and try to
  delete a budget and cancel.

---

## 4. Duplicate / unreachable Planner route

**Problem:** `app/budget-planner.js` renders `AdvancedWhatIfPlanner` inside its own screen chrome
(back button, header "What-If Life Event Simulator"). The exact same component is already reachable
as the "Planner" segment inside `app/(tabs)/budgets.js`. A repo-wide search
(`grep -rn "budget-planner" app/ components/`) finds **zero** references to the `/budget-planner`
route from anywhere in the app's navigation — it is dead code, unreachable by any button, link, or
`router.push`.

**Scope — pick ONE, implement it, and record the choice in this file's Decisions section:**
- **Option A (recommended):** delete `app/budget-planner.js`. The in-tab Planner segment already
  covers this. One less screen to keep in sync.
- **Option B:** keep it, but then it must actually be reachable — add a real entry point (e.g. a
  "Full screen" affordance from the in-tab Planner), and the two should not silently drift apart in
  behavior over time.

**Acceptance criteria:**
- If Option A: `app/budget-planner.js` is deleted; `grep -rn "budget-planner"` across the repo
  returns no hits; the in-tab Planner segment still works.
- If Option B: at least one real UI element navigates to `/budget-planner`, and this is verified by
  hand on an emulator.

---

## 5. Dead components

**Problem:** three files in `components/budget/` are not imported anywhere in the app
(`grep -rln "ScenarioControls|DailyBudgetAlert|LifeEvents" app/ components/` finds no references
outside their own file). Their modification times predate the rest of this module by a wide margin,
consistent with them being leftovers from an earlier version of the Budget screens (the same pattern
as the orphaned `components/cashbooks/` files removed in Plan 001).

- `components/budget/ScenarioControls.js`
- `components/budget/DailyBudgetAlert.js`
- `components/budget/LifeEvents.js`

**Scope:**
- Re-confirm with a fresh repo-wide grep immediately before deleting (in case this plan is
  implemented out of order and something changed).
- Delete all three files.
- Run the full budget test suite after deleting to confirm nothing silently depended on them via a
  dynamic import or re-export.

**Acceptance criteria:**
- Grep for each of the three filenames (without extension) across the repo returns no hits outside
  version control history.
- `tests/test_budget_decision_engine.mjs`, `tests/test_budget_view_model_truth.mjs`, and both files
  under `tests/budget/` still pass.

---

## 6. Money representation is split between paise (BigInt) and float rupees

**Problem:** `services/budget/budgetViewModel.js` has to handle both shapes defensively:
```js
const itemSpent = b.spentPaise !== undefined ? Number(b.spentPaise / 100n) : (Number(b.spent) || 0);
```
Meanwhil `components/budget/AddBudgetModal.js` writes budgets with a plain float `limit` field
(`parseFloat(limit)`), never `limitPaise`. So new/edited budgets are always the legacy float shape,
and only some other code path produces the paise shape. This is the same inconsistency the Cashbooks
module had before Plan 001 standardized on integer paise everywhere.

**Scope (do this last — it's the most invasive and touches the most files):**
- Decide and record: standardize all budget amounts on integer paise (`BigInt`), matching the
  Cashbook module's convention, OR explicitly document that Budgets intentionally stays
  float-rupees because its values are manually-entered round numbers (never sub-rupee) and
  cross-module paise conversion already happens at the boundary (`parsePaise` in
  `budgetContracts.js`). Either is defensible — but it must be a stated decision, not an accident of
  which code path was touched most recently.
- If standardizing on paise: update `AddBudgetModal.js` to produce `limitPaise` (BigInt) instead of
  `limit` (float), and update every read site in `budgetViewModel.js` / `budgets.js` /
  `budgetEngine.js` to stop checking for both shapes.
- If staying float: at minimum, remove the dual-shape defensive checks and make the single
  supported shape explicit and documented in `budgetContracts.js`.

**Acceptance criteria:**
- `tests/test_budget_decision_engine.mjs` and `tests/test_budget_view_model_truth.mjs` still pass.
- No code path silently branches on `typeof` or `!== undefined` to guess which money shape it
  received — the shape is a documented contract, not inferred.

---

## Decisions

(Fill this in as each section is implemented — one line per section.)

- Section 1: Retained deterministic default `now = new Date(2026, 8, 18)` for test backwards-compatibility; updated `budgets.js` screen caller to pass `now: new Date()` explicitly and defaulted `selectedMonth` and `getBudgetsWithActuals` to dynamic local month (`toLocalMonthString()`).
- Section 2: Wired real month navigation chevrons (`onPrevMonth`/`onNextMonth`) through `BudgetCalendarModal` to parent state; replaced hardcoded weekday offset with `computeCalendarWeekdayOffset(year, monthIndex)`; replaced hardcoded day 5 label with dynamic `formatSelectedDayLabel`.
- Section 3: Replaced bare `alert()` calls with `Alert.alert('Invalid budget', ...)` and wrapped budget deletion in `Alert.alert` confirmation with Cancel and Destructive Delete actions.
- Section 4: Took Option A; deleted unreachable duplicate route `app/budget-planner.js` (in-tab Planner segment in `app/(tabs)/budgets.js` serves as authoritative UI).
- Section 5: Confirmed zero imports/references across repo and deleted dead components `ScenarioControls.js`, `DailyBudgetAlert.js`, and `LifeEvents.js`.
- Section 6: Standardized on integer paise (`BigInt`) matching Cashbooks convention: `AddBudgetModal.js` outputs `limitPaise`, `budgetContracts.js` documents paise contract, and `budgetViewModel.js` and `budgetEngine.js` use `parsePaise` to parse paise at boundaries without ad-hoc branching.

---

## Suggested order of work

1. Section 1 (hardcoded "now") — most severe, smallest surface area (two call sites).
2. Section 3 (alert() / delete confirmation) — small, isolated, user-safety-relevant.
3. Section 5 (dead components) — shrinks surface area before touching the calendar.
4. Section 2 (calendar navigation + hardcoded weekday/date) — medium, depends on Section 1 being
   fixed first so "the current month" actually means something when wired up.
5. Section 4 (duplicate Planner route) — small, independent, do whenever convenient.
6. Section 6 (money representation) — do last; broadest blast radius.

After each section: run the four budget test files listed in Section 0 and don't move to the next
section until they're green. Sections 2, 3, and 4 also need a hands-on emulator check, since none of
the current `.mjs` suites render components or simulate taps.
