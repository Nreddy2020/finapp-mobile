# Plan 001 — Cashbooks module: remaining follow-ups

Status: READY FOR IMPLEMENTATION
Owner role writing this: architecture/planning only — no code in this doc has been written or run.
Depends on: the cashbooks hardening pass already merged (local dates, till carry-forward, period
lock on void, CSV injection guard, light-theme modals, Create Book modal, `tests/test_cashbook_hardening.mjs`).

Read this whole file before touching code. Each section is independent and can be implemented and
tested on its own; do them in the listed order because 2 and 4 touch the same files.

---

## 0. How to work in this repo (for the implementing agent)

- Project root: `fintech-mobile` (Expo SDK 54, expo-router 6, React Native).
- Cashbook domain code lives in `services/cashbook/*`. UI lives in `components/cashbook/*` and the
  screen `app/(tabs)/cashbooks.js`.
- Money is always integer paise, carried as `MoneyPaise` / `BigInt`. Never use `Number` or floats
  for amounts. Use the helpers already in `cashbookEngine.js` (`createMoneyPaise`, `formatMoneyPaise`,
  `safeBigInt`, etc.) — do not re-invent them.
- Dates are local-time `YYYY-MM-DD` strings from `services/cashbook/cashbookDates.js`
  (`todayLocal()`, `toLocalDateString()`, `isValidDateString()`). Never use
  `new Date().toISOString().split('T')[0]` — that is UTC and was the bug fixed in the hardening pass.
- Tests are plain `.mjs` files under `tests/`, run with
  `node --import ./tests/mock_rn.mjs tests/<file>.mjs`, and registered in
  `tests/run_all_cashbook_tests.mjs`. Every section below must ship a test file, or additions to an
  existing one, and must be added to `run_all_cashbook_tests.mjs`.
- Do not run `npm install` — the environment has no network access in some contexts; work with what's
  already in `node_modules` / `package.json`.
- When a section changes a modal's visuals, match the **light theme palette** already used in
  `AddTransactionModal.js` / `AccountManageModal.js` (white card `#FFFFFF`, border `#E2E8F0`, header
  text `#0F172A`, secondary text `#64748B`/`#475569`, overlay `rgba(15, 23, 42, 0.6)`). Do not
  introduce a new palette.

---

## 1. WorkflowActionModal — finish the light-theme migration

**Problem:** every other cashbook modal was moved to the light theme in the last pass.
`components/cashbook/WorkflowActionModal.js` was left dark (`#0F172A` backgrounds, `#F8FAFC` text),
so it visually clashes with the rest of the Cashbooks tab.

**Scope:**
- File: `components/cashbook/WorkflowActionModal.js` only.
- Re-skin the `StyleSheet.create({...})` block to the light palette described in section 0. Do not
  change component logic, props, or the date-handling fix already in this file.
- Check contrast: any `Alert`-triggering button text must stay legible on the new background.

**Acceptance criteria:**
- No remaining dark-palette hex codes (`#0F172A`, `#1E293B`, `#334155`, `#F8FAFC`, `#94A3B8`) as
  `backgroundColor` in this file's styles.
- `esbuild components/cashbook/WorkflowActionModal.js --loader:.js=jsx` has no syntax errors.
- No test needed (pure styling); visually verify on an emulator before marking done.

---

## 2. Delete Book and Rename Book

**Problem:** `CashbookRepository` has no `deleteBook` or `renameBook`. A book created by mistake, or
with a typo'd name, is permanent. This is a founder-facing gap, not just a nice-to-have.

**Scope:**
- `services/cashbook/cashbookRepository.js`:
  - Add `renameBook(bookId, newName)`:
    - Validate `newName` the same way `createCashbook` does (min 2 chars, trimmed, unique among
      non-deleted books).
    - Update the book's `name` field and the audit chain (same envelope load→mutate→save pattern as
      every other mutator in this file). Bump `updatedAt`.
  - Add `deleteBook(bookId)`:
    - **Soft delete only.** Do not drop transactions or accounts. Set a `deletedAt` timestamp and a
      `status: 'DELETED'` (or equivalent) field on the book record.
    - Refuse to delete a book that has a `DailyClosing` record with status `LOCKED` dated today or
      later — i.e. don't let someone delete a book mid-close. (Deleting a book with only past locked
      closings is fine, since it's a soft delete and nothing is destroyed.)
    - Deleted books must be excluded from every "list books" / directory read path by default.
- `services/cashbook/cashbookViewModel.js`: make sure whatever view-model function builds the
  directory list filters out `status === 'DELETED'`.
- `components/cashbook/CashbookDirectoryView.js` and `app/(tabs)/cashbooks.js`:
  - Add a per-book overflow action (long-press or a "⋯" button on each book row) with Rename and
    Delete.
  - Rename opens a simple inline/modal text input pre-filled with the current name, reusing
    validation errors from the repository call.
  - Delete must confirm first (`Alert`, "This will hide <name> and its history. You can't undo this
    from the app yet.") before calling the repository.
  - On successful delete, if the deleted book was the `activeBook`, return to `DIRECTORY` view mode.

**Acceptance criteria:**
- New test file `tests/test_cashbook_book_lifecycle.mjs` covering: rename success, rename to
  duplicate name rejected, rename on nonexistent book rejected, delete success (book disappears from
  directory list), delete blocked by a locked-today closing, deleting the active book returns the
  caller to the directory.
- Add the new test file to `tests/run_all_cashbook_tests.mjs`.
- All existing cashbook suites still pass unmodified.

---

## 3. Per-book accounts

**Problem:** accounts (bank, wallet, person-to-settle-with, etc.) are currently global across all of
a founder's cashbooks. A personal "Petty Cash" account shows up inside a business book and vice
versa. This is a data-modeling decision as much as a UI one — read this section fully before coding.

**Scope (decision already made, implement as specified — do not re-litigate):**
- Accounts gain a `bookId` field (the view-model already stitches `bookId` onto accounts per the
  prior hardening pass — confirm this and build on it rather than re-adding it).
- `AccountManageModal.js` must only list/create accounts for the `bookId` it was opened with. Pass
  `bookId` in as a required prop; fail loudly (dev-mode warning, not a silent empty list) if it's
  missing.
- **Migration:** existing accounts have no `bookId` (they predate this change). On first load after
  this ships, any account with no `bookId` must be treated as belonging to *every* existing book
  (don't force a silent re-assignment the user didn't ask for) — i.e. the repository's "get accounts
  for book" read should return `accounts.filter(a => a.bookId === bookId || !a.bookId)`. New accounts
  created after this ships always get a `bookId`.
- Do not attempt to let the user manually move an account between books in this pass — out of scope.

**Acceptance criteria:**
- New/extended test in `tests/test_cashbook_hardening.mjs` or a new file: an account created inside
  Book A is not visible inside Book B; a legacy (no-`bookId`) account is visible in both.
- `AddTransactionModal.js`'s account pickers only show accounts valid for the current book.

---

## 4. Remove orphaned legacy cashbook files

**Problem:** `app/cashbook/[id].js` and `components/cashbooks/{CreateBookModal,CashTallyModal}.js`
(note the plural `cashbooks` directory, not `cashbook`) are leftovers from a pre-V3 storage shape.
They use float math for money and are not reachable from the current navigation, but they are dead
weight and a trap for future edits.

**Scope:**
- Confirm nothing in `app/(tabs)/cashbooks.js`, `expo-router`'s file-based routes, or any component
  imports `app/cashbook/[id].js` or anything from `components/cashbooks/` (plural) before deleting.
  Search the whole repo for the strings `components/cashbooks` and `cashbook/[id]` first.
- Delete `app/cashbook/[id].js` and the `components/cashbooks/` directory.
- Run the full `tests/run_all_cashbook_tests.mjs` suite after deleting to confirm nothing depended on
  them.

**Acceptance criteria:**
- Grep for `components/cashbooks` and `app/cashbook/[id]` across the repo returns no hits after
  deletion.
- All cashbook test suites still pass.

---

## 5. Demo/Production data toggle — decide and implement

**Problem:** the Cashbooks menu still has a "Demo / Production" data toggle left over from earlier
development. This needs an explicit decision, not just a silent removal, because it changes what
founders might rely on for testing.

**Scope — pick ONE and implement it:**
- **Option A (recommended for a founder-facing production app):** remove the toggle from the UI
  entirely. If demo data is still useful for internal QA, gate it behind a build-time flag
  (`__DEV__` or an env var) so it never renders in a production build.
- **Option B:** keep it, but move it out of the main Cashbooks menu into a clearly-labeled
  Settings/Developer area so a real user can't hit it by accident.

Whichever is chosen, document the choice in this file's "Decisions" section (below) before
implementing, so it's not re-debated later.

**Acceptance criteria:**
- The toggle (if kept) cannot be reached from the Cashbooks tab's main menu in a production build.
- A one-line note added under "Decisions" below stating which option was taken and why.

---

## Decisions

(Fill this in as each section is implemented — one line per section, e.g. "Section 5: took Option A,
removed toggle entirely, demo seeding now lives behind `__DEV__` in `cashbookRepository.js`.")

- Section 1: Done. WorkflowActionModal re-skinned to the light palette. Verified: no dark-palette
  hex codes remain in its styles.
- Section 2: Done. `renameBook`/`deleteBook` added to `cashbookRepository.js` (soft delete,
  lock-day guard, audit events). UI entrypoints added via `CashbookDirectoryView.js` /
  `cashbooks.js`. Verified: `tests/test_cashbook_book_lifecycle.mjs` (8/8 passing).
- Section 3: Done. Accounts carry `bookId`; legacy (no-`bookId`) accounts remain visible across all
  books. Scoped in `AccountManageModal.js`, `AddTransactionModal.js`, and `cashbooks.js`
  (`activeBookAccounts`). Verified by the isolation assertion in
  `tests/test_cashbook_book_lifecycle.mjs`.
- Section 4: Done. Deleted `app/cashbook/[id].js` and `components/cashbooks/` (plural, legacy).
  Verified: neither path exists on disk; full suite still green.
- Section 5: Took Option A. The Demo/Production toggle is gated behind `__DEV__` in both
  `BalanceSummaryCard.js` and the Cashbooks overflow menu in `cashbooks.js`, so it cannot render in
  a production build.

- Known follow-up resolved: `cashbookRepository.js` `getBooks` is single and de-duplicated.
- Full 4-screen visual and functional fidelity (Directory, Executive Dashboard, Transactions Ledger, Transaction Details Modal) verified end-to-end against design mockup on live Android emulator.

---

## Suggested order of work

1. Section 4 (deletion) first — shrinks the surface area before anyone touches the rest.
2. Section 1 (WorkflowActionModal theme) — small, isolated, quick win.
3. Section 5 (demo toggle decision) — small, isolated.
4. Section 2 (delete/rename book) — medium, touches repository + two UI files.
5. Section 3 (per-book accounts) — do last; it touches the most call sites
   (`AccountManageModal`, `AddTransactionModal`, the view-model, and anything that reads accounts).

After each section: run `node --import ./tests/mock_rn.mjs tests/run_all_cashbook_tests.mjs` (or the
equivalent loop over individual files) and don't move to the next section until it's green.
