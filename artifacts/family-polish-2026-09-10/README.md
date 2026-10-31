# Family usability and reliability work — 10 September 2026

Implemented in `E:\fintech-mobile`, using the nine supplied screenshots and the Family audit. Existing user changes and records were preserved. No commit, push, release build, or deployment was performed. VITALIS work remains in its separate copy.

## Outcome

Family Home and People now provide working actions instead of phase placeholders. All Family routes share an explicit, remembered household selection, including Operations and Life Events. Switching households remounts the selected Family content to avoid showing another household's records. The header has readable titles, a visible household switch, and one global home exit.

Goals support creation/editing, recorded contributions, pledges and milestones. Forecasts use actual income schedules and linked commitments, current dates and correct currency units; scenarios preserve the same underlying expenses. Shared budgets support creation, editing, archiving and explicit contribution shares. Existing sample pools are preserved but labelled and excluded from forecasts; visiting a page no longer seeds demo records.

Protection retains its contact/directive management, with clearer loading failures and more accessible contact actions. Continuity now adapts the actual saved contact, document, directive and member fields correctly. Sensitive-detail disclosure uses device authentication, hides old protected responses immediately on locking, and ignores authentication completion after leaving the screen.

Family persistence uses one encrypted versioned snapshot and checks write success before accepting a mutation. Repository mutations are serialized, setup saves household/person/membership together, corrupt reads fail visibly, and income schedules persist. Legacy collections remain available for migration. Life Events are included in real data export and local deletion; exports omit encryption/authentication keys and obsolete duplicate Family collections. Settings export now uses the real export implementation.

## Screen and function inventory

| Area | Implemented or repaired | Evidence and validation scope |
|---|---|---|
| Shared context/setup | Explicit selection, remembered choice, household switch, create with new or existing person in one snapshot | Native QA household/person creation; restart remembered selection; atomic setup, reuse and duplicate tests |
| Home | Actual member/task/goal counts and next actions | `home-final.png`; native counts reflected saved QA records |
| People | Add/reuse/edit, role change, provisional confirmation and membership removal controls | Native QA role changed from HEAD to PARTNER and survived restart; other lifecycle cases covered by service suites, not every native dialog combination |
| Operations | Correct selected household; save errors retain form; awaited saves; accessible task completion | Injected one failed native snapshot write, retained form, retry created exactly one task, then completed it; `task-failed-save.png`, `operations-completed.png` |
| Protection | Correct load dependencies, actual members/documents, retry errors, contact/directive save guards | Native contact created; readiness changed from 0/5 to 1/5; `protection-contact.png`. Directive edit/archive combinations were not all repeated natively |
| Life Events | Shared context, preparation/task links and refresh retained from the completed pilot | 26 integration checks; current shared-context check shows the original linked task still COMPLETED (`life-events-final.png`); earlier native create/link/complete/restart/failure evidence in `FAMILY_LIFE_EVENTS_PILOT_2026_09_10.md` |
| Goals | Create/edit, progress, pledges, milestones, validation, read-only scenario | Native ₹12,000 goal plus ₹500 contribution; restart proof; `goal-progress.png`. Pledge/milestone UI combinations were not all repeated natively |
| Forecast | Actual income/commitments, MoneyPaise conversion, supported recurrence mapping, current date, missing-data guidance, unchanged-scenario baseline | Native ₹1,000 monthly income saved and reloaded; `forecast-income.png`; real-source adapter and unchanged/10% preview tests |
| Budget pools | Create/edit/archive, explicit shares, no automatic samples, correct evaluated-pool identity | Native ₹2,000 pool with 100% QA member share; Edit repopulated the saved fields; `budget-final.png`, `budget-edit.png`. New expense-linking UI was not added |
| More | Clear gateway descriptions; readiness routes to Protection; no phase/test controls | `more-final.png`; routes and service regression checks |
| Continuity | Actual canonical field mapping; real device authentication and immediate hiding on lock | Native contact recognized and score updated; `continuity-final.png`. Unenrolled emulator rejected disclosure: `continuity-auth-required.png`; injected success/cancel tests |
| Documents, financial links, action horizon | Shared household context, visible failures, focus refresh, correct responsibility filters, no fallback demo sources | Existing regression suites and changed-source checks; full native CRUD matrices for these secondary pages were not repeated |
| Persistence/lifecycle | Atomic Family snapshot, failure propagation, serialized repository writes, income reload, actual export/delete integration | 20 focused reliability checks, native failed-save/retry and cold-restart record proof |

## Verification

- Existing regression runner: **548/548 assertions across 15/15 suites**.
- Life Events integration checks: **26/26**.
- Focused Family reliability checks: **20/20**.
- Total: **594 passing checks**. Babel parsed **44 changed JavaScript files** with no unresolved identifiers in the scoped check.
- Native environment: Android API 36 emulator, Expo Go, original application served on port 8082. Cold restart verified saved member role, goal/contribution, income, budget, contact and completed task. This is development-runtime evidence, not an installed release certification.
- `native-after-restart.json` compares every original row across the 14 legacy Family collections against the new snapshot: **zero changed or missing original rows**. Original sample records were retained.
- Native disposable records were clearly labelled `Family QA 0910` / `QA …`. All eight QA records were removed with exact-ID/name guards. Readback confirmed removal, Primary Household selected, and zero changed or missing original rows (`qa-cleanup.json`, `native-final.json`).

Logs and screenshots: `artifacts/family-polish-2026-09-10`. The manifest in that directory lists the scoped source/test files. The one dependency added was `expo-local-authentication ~17.0.8`, matching the installed Expo SDK's bundled compatibility metadata.

## Limits and remaining coverage

Successful enrolled-device authentication, app backgrounding during a real biometric prompt, iOS, accessibility screen-reader navigation, production builds and deployed-server compatibility still need device/release validation. The emulator showed slow startup and screen transitions; this work does not certify performance. No calls or messages were sent, no money was moved, and real account deletion was not invoked.

Repository mutations are serialized; a service workflow making multiple independent repository calls is not automatically one transaction. General backup/restore coverage, a complete household-delete cascade for later domains, multiuser authorization and new budget expense-linking UI are not claimed complete. The supplied-screen improvements and documented checks should not be read as certification of every app feature.
