# Plan 004 — Group Expenses (Shared Costs) module: data-loss fix, then cleanup

Status: READY FOR IMPLEMENTATION
Owner role writing this: architecture/planning only — every finding below was confirmed by reading
the actual files on disk, not guessed.

**Section 1 is a real, confirmed data-loss path for real users, not a hypothetical. Fix it before
anything else in this module.**

---

## 0. Scope

- Screen: `app/(tabs)/group-expenses.js`.
- Domain code: `services/shared-costs/groupRepository.js` (storage CRUD, `clearStore`),
  `groupBalanceEngine.js`, `splitCalculator.js`, `settlementOptimizer.js`, `groupContracts.js`,
  `groupValidation.js`, `groupViewModel.js` (`GroupViewModel`, including `seedMockupDemoData`),
  `recurringExpenseEngine.js`, `groupCommitmentBinding.js`, `groupAudit.js`.
- UI: `components/groups/*.js` (6 files: `AddExpenseModal`, `CreateGroupModal`,
  `ExpenseDetailModal`, `GroupCard`, `GroupDetailModal`, `RecordSettlementModal`).
- Existing tests: none found specifically named for this module under `tests/shared-costs/` as a
  populated suite at the time of writing — **check `tests/shared-costs/` for what's actually there
  before assuming you need to write from scratch**, and run whatever exists with
  `node --import ./tests/mock_rn.mjs tests/shared-costs/<file>.mjs`. If the directory is empty or
  near-empty, Section 1 below is exactly the kind of regression a test suite should exist to prevent
  — write one as part of that fix, not as an afterthought.

---

## 1. Any empty-looking group list silently wipes and reseeds fake demo data — CRITICAL, DATA LOSS

**File:** `app/(tabs)/group-expenses.js`, `loadData`:
```js
let data = await GroupViewModel.getDashboardData('You');
if (!data || data.groups.length === 0) {
    data = await GroupViewModel.seedMockupDemoData();
}
```

**File:** `services/shared-costs/groupViewModel.js`, `seedMockupDemoData`:
```js
async seedMockupDemoData() {
    await GroupRepository.clearStore();
    // ... creates "Goa Trip", then (per the rest of the function) "Home Expenses" and
    // "Office Friends" groups with fabricated members and expenses ...
}
```

Walk through what this actually does:

- `seedMockupDemoData()` starts by calling `GroupRepository.clearStore()` — **this deletes every
  group, member, and expense currently in storage**, before writing the three fake demo groups.
- `loadData()` calls this automatically, with no confirmation, no mode check, and no `__DEV__` gate,
  whenever `getDashboardData('You')` returns zero groups.
- For a genuinely new user this is merely a UX/trust problem (their first-ever view of this screen
  is fabricated data they might think is real — "Goa Trip" with people named Ravi, Priya, Amit,
  Neha).
- **For an existing user, this is a real data-loss bug.** If `getDashboardData` ever returns an
  empty-looking result for a reason that is not "the user genuinely has zero groups" — a storage
  read glitch, a migration edge case, a race condition on app resume, a bug anywhere upstream that
  causes the groups array to come back empty even though real data exists on disk — the very next
  thing that happens, with no warning, is that the user's real groups and expenses are permanently
  deleted and replaced with fake ones. There is no confirmation dialog on this path (unlike
  `handleResetDemoData`, below, which at least asks).
- **The manual "Reset Demo Data" button compounds this.** It's the `RefreshCw` icon in the header,
  visible unconditionally in every build (no `__DEV__` gate), and its confirmation dialog says only
  *"Restore default mockup demo dataset (Goa Trip, Home Expenses, Office Friends)?"* — it does not
  warn the user that this will **delete their existing real groups**. A founder who taps it thinking
  it "resets the demo" (not realizing their own real groups are the only thing in storage) loses
  everything with one confirmed tap on a dialog that doesn't mention deletion of their own data.

**Scope — this needs a real design decision, not just a quick patch:**
- **Separate "no data yet" from "seed demo data".** `loadData()` must never call anything that calls
  `clearStore()` as an automatic fallback for an empty-looking result. An empty `groups` array should
  render the existing empty state (`"No matching groups" / "Create a new group or change filter"`,
  already implemented further down this same file) — never silently mutate storage.
- **Gate all demo-data seeding behind the same Demo/Production mode pattern used elsewhere** in this
  app (Cashbooks: Plan 001 Section 5; Recurring Commitments: Plan 003 Section 3), if this module is
  meant to have a demo mode at all — check whether `GroupRepository`/`GroupViewModel` have any
  concept of mode/`appMode` already (a quick grep suggests they don't; if so, this module currently
  has no honest way to show "demo" data at all without touching real storage, which is itself a gap
  to close here).
- **Fix "Reset Demo Data" to be honest and safe:**
  - Its confirmation dialog must explicitly say it will delete the user's existing groups and
    expenses, not just "restore mockup data".
  - Gate the button behind `__DEV__`, consistent with the rest of the app's demo-toggle convention,
    since a destructive "wipe and reseed fake data" action has no legitimate place in a founder's
    production build.
- **Add a true first-run detection** if "show sample data to a brand-new user" is still wanted as a
  product decision: key it off something durable and explicit (e.g. a `hasSeenGroupsOnboarding`
  flag written once, not "the groups array happened to be empty this render"), so a storage glitch
  can never be mistaken for "first run."

**Acceptance criteria:**
- `loadData()` never calls anything that can delete existing data as a side effect of an empty read.
- A unit/integration test (add to `tests/shared-costs/` — create the file if the directory is empty)
  that: seeds a real group with a real expense, simulates `getDashboardData` returning an empty
  array (e.g. by mocking/stubbing it or by exercising whatever actual condition can produce that),
  and asserts the real group's data is still present in `GroupRepository` storage afterward — i.e.
  nothing was wiped.
- `handleResetDemoData`'s confirmation text explicitly states that existing groups/expenses will be
  deleted.
- The Reset Demo Data button cannot be reached in a production (`__DEV__` false) build (or is
  removed entirely — pick one and record the choice, same as Plan 001 Section 5's Option A/B
  choice).

---

## 2. Verify `voidExpense` and settlement recording don't have the same "fallback mutates storage" pattern

This section is a *check*, not yet a confirmed second instance — flag it so the implementing agent
verifies rather than assumes Section 1 was the only place this pattern exists.

- `handleVoidExpense`, `handleRecordSettlement`, and `handleSettleAllSuggestions` in
  `app/(tabs)/group-expenses.js` all call into `GroupViewModel`/`GroupRepository` methods that
  mutate storage. Confirm none of them has a similar "if result looks empty/unexpected, silently
  reset/reseed" fallback anywhere in `groupRepository.js` or `groupViewModel.js` — grep for
  `clearStore` across `services/shared-costs/` and account for every call site.

**Acceptance criteria:**
- Every call site of `GroupRepository.clearStore()` is enumerated and each one is either (a) an
  explicit, user-confirmed, clearly-labeled destructive action, or (b) removed.

---

## Decisions

(Fill this in as each section is implemented — one line per section.)

- Section 1:
- Section 2:

---

## Suggested order of work

1. Section 1 — do this before anything else in this module. It is a live data-loss bug, not a
   polish item.
2. Section 2 — a verification pass once Section 1's fix pattern is established, to make sure the
   same mistake isn't duplicated anywhere else in this service.

Both sections need both an automated test (per their acceptance criteria) and a hands-on emulator
check: create a real group with a real expense, then try to reproduce an empty-looking load (e.g.
by restarting the app, or by whatever condition the investigation in Section 1 finds can produce an
empty `getDashboardData` result) and confirm the real group survives.
