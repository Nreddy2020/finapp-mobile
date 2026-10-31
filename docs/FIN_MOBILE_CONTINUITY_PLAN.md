# FIN Mobile continuity plan

Updated: 10 September 2026. Active source: E:/fintech-mobile, branch fintech-using-chatgpt. Preserve existing user changes and saved data. No production deployment, spending, external communication, destructive data operations or release is authorized by continuous progress.

## Intended outcome
A usable mobile financial and family operating system: household members, responsibilities, documents, protection, goals and shared planning work together using real saved records. Every displayed amount and readiness status must distinguish missing information from verified data. Mobile navigation and forms must remain readable and reachable.

## Architecture decisions
React Native / Expo Router; a shared explicit household selection and shared Family navigation. Family version-2 encrypted snapshot is the authoritative local repository, with serialized writes and atomic native file replacement. Life Events uses its separate encrypted store and participates in account export/delete. Financial calculations read existing commitments without creating a second ledger or moving money. Protected continuity details require device authentication and relock on background/blur. Demo data is explicitly gated. Preserve legacy data during migrations.

## Verified milestones and evidence
- Functional Family polish: docs/FAMILY_POLISH_REPORT_2026_09_10.md; artifacts/family-polish-2026-09-10. Consult that report for its exact test scope and limitations.
- Life Events pilot: docs/FAMILY_LIFE_EVENTS_PILOT_2026_09_10.md.
- GUI follow-up: docs/FAMILY_GUI_REVIEW_2026_09_10.md; artifacts/family-gui-2026-09-10. 13 portrait Android routes visually reviewed; blank Goals form scrolled/cancelled; 548 existing assertions passed. No full-device certification claimed.

## Prioritized backlog and acceptance criteria
1. VERIFIED: Financial Coordination missing-source handling. Evidence: forecast reports an unavailable linked expense while Coordination shows Unknown Commitment, zero and All Linked. Missing source must be explicit, excluded from asserted complete totals, and recoverable after refresh; no saved link deletion. Add hermetic tests for missing/resolved sources and native rendering evidence.
2. VERIFIED FOR SNAPSHOT REPOSITORY: Repository household deletion cascade: inspect later goals, pools, income and scenario collections. Hermetic tests must prove complete scoped cleanup, preservation of other households and rollback on persistence failure. Never invoke deletion on real user records.
3. VERIFIED CODE/FIXTURE GATE: General backup/restore Family coverage: inspect existing engine and required schema; test round-trip and error handling on isolated fixtures.
4. Complete mobile accessibility/device matrix: large fonts, narrow width, landscape, iOS and form keyboard controls. Fix observed defects; retain screenshots and explicit coverage limits.
5. Budget expense-linking UI and remaining secondary-route native CRUD verification, using isolated test records and exact cleanup only when authorized.

## Operating rules and current status
GUI and missing-source milestones verified; repository cascade fixture gate passed. Next stage is general backup/restore inspection. After each verified milestone update this plan with changed files, tests, evidence and remaining gaps; select the next requirement-supported item. Coordinate emulator use with VITALIS. Routine reversible implementation proceeds without asking what next. Report meaningful milestones/blockers to local origin task 01a08ab9-7594-7a51-b5a1-995bf17fa1d5. Production server compatibility, real enrolled biometrics, iOS and release builds remain uncertified.

## Stage verification gate
Before each stage define concrete acceptance criteria. Implement, run scope-appropriate checks, inspect results, fix failures, record evidence and limitations, then advance only after the stated criteria pass. UI/integration work requires actual interface or integration checks where relevant. Mocked checks do not certify runtime behavior. Pending verification is not completion. If blocked, record the exact prerequisite and work only on independent authorized items. No routine user permission is required for these reversible stages.

## Latest evidence and next-stage criteria
- Missing-source follow-up: native missing state inspected and Retry exercised; 16 fixture assertions passed for recovery/isolation/precision. Native source-restoration recovery remains unchecked.
- Snapshot cascade: isolated storage test passed all 12 owned collections, other-household and shared-person preservation, failure rollback and retry. No real-user deletion. Separate Life Events household cleanup must be investigated before claiming whole-product household deletion coverage.
- Final existing regression suite: 548/548, 15/15. Original native records compared with baseline with zero changed/missing rows across 14 legacy collections.
- Evidence and exact limitations are in FAMILY_GUI_REVIEW_2026_09_10.md and artifacts/family-gui-2026-09-10/regression-final.log.
- Next backup/restore stage acceptance: first map current export/import and storage ownership, then demonstrate fixture round-trip for all supported Family collections including separate Life Events, fail closed on invalid/incomplete payloads, preserve unrelated records, and test integration without importing into the user's live app. Mark native restore behavior pending until independently demonstrated. Do not alter backup format before compatibility inspection.
- Emulator released to VITALIS, FIN left on Family Home. Current GUI request is handled; continuation follows this prioritized plan. No commit, push or deployment.

## Latest priority and completed prerequisite
User explicitly approved installing the two verified backup/restore source files after automatic review blocked installation. Installed code passed 12 isolated Family integration cases; existing R4 suite passed 41/41 in an isolated matching source copy. See FAMILY_BACKUP_RESTORE_REVIEW_2026_09_10.md. Native restore remains unverified; no live data restored/deleted. This gate covers the existing Node engine, not a mobile restore UI.

Latest user priority supersedes earlier next-item ordering: Goals & Life Planning, Time Management first. See TIME_MANAGEMENT_IMPLEMENTATION_PLAN.md for current owners, coherent initial release, later routines/reminders, privacy/time-zone/backup rules and measurable stage gates. NEXT: TodoService durability/compatibility fixture gate, followed by real Time Management task/planner integration and native checks. Career/Travel are sibling areas after Time Management. Native financial source-restoration remains a separate pending gate.

## Time Management stage 1 milestone
Task data foundation and native injected error-interface gate passed; see TIME_MANAGEMENT_STAGE1_2026_09_10.md. Ten installed fixture cases pass, original task data unchanged after one intercepted save. Time screen still mock-driven until the next stage. Next: planner contracts/storage with references to TodoService, manual Today/Week scheduling and initial-release export compatibility; verify each data gate before UI integration. Successful native create/restart and full device matrix remain pending.
