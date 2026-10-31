# Family Life Events — implemented pilot

Verified locally on 10 September 2026.

The school-year journey is integrated into the actual application at `E:\fintech-mobile`: Family > More > Life Events. Create an event using an explicitly selected household and existing active members, add a preparation, link an existing Operations task, complete that task in Operations, and return to see the preparation resolve from the current source status.

## Baseline and preservation

- Authoritative checkout: `E:\fintech-mobile`, branch `fintech-using-chatgpt`, HEAD `1425008`.
- That checkout contains extensive uncommitted Family phases 3–11 work. It was preserved. The task's default worktree at `5acc2d3` is older and was not used as the application baseline.
- Independently ran all original 15 regression suites before and after implementation: **548/548 passed**.
- Before editing the two existing files, their exact bytes were backed up. Every update checked their original or last-installed SHA-256 hashes to avoid overwriting concurrent edits.
- No commit, checkout reset, source deletion, dependency upgrade, or release deployment was performed.

## Changed application files

| File | Change |
| --- | --- |
| `app/family/more.js` | Adds the Life Events gateway to existing navigation. |
| `app/family/more/life-events.js` | School-year event form, explicit household/member choices, event detail, preparations, existing-task picker, retry feedback, focus refresh, and Operations navigation. |
| `services/family/familyLifeEventService.js` | Validated event mutations, membership/household isolation, serialized saves, and read-only current-task projections. |
| `services/family/familyLifeEventStore.js` | Encrypted AsyncStorage persistence with explicit read/write failures; corrupt data cannot silently become an empty writable store. |
| `app/family/operations.js` | Explicit household selection, supplied household context from Life Events, caller-preserving Back, household-scoped member choices, loading/error states, and stale-load protection. Completion no longer invents an actor by picking the first person. |
| `tests/family/test_family_phase12_life_events.mjs` | 26 integration checks using the real Family repository/contracts and Operations service with isolated test records. |

The new storage namespace is `finlife_family_life_events_v1`. It uses the existing application encryption primitive (AES-CBC; this is not a new claim of AES-GCM). A stored preparation contains only `id`, `title`, and `taskId`. Task status, task title, completion metadata, assignee, and due date are not copied into event storage. A preparation resolves only when the referenced occurrence currently reports `COMPLETED` in Operations. Missing/archived/failed source reads show unavailable and unresolved. Reading a projection writes no event or Operations records.

## Actual test results

Run from `E:\fintech-mobile` with Node.js v24.14.1:

```powershell
node scratch/run_all_suites.mjs
# 15/15 existing suites; 548/548 assertions passed

node --import ./tests/mock_rn.mjs tests/family/test_family_phase12_life_events.mjs
# ALL 26 LIFE EVENTS INTEGRATION CHECKS PASSED
```

The original governed regression runner remains unchanged. Run both commands for the complete **574-check** result. New coverage includes initial failed-link recovery, failed reassociation, duplicate linking, concurrent preparations, encrypted adapter save/reload, corrupted storage, foreign-household rejection, unavailable sources, archived people, source reopening, and exact recurring-occurrence identity. These are app-service integration tests, not the previous standalone starter package.

## Android evidence

Device: `emulator-5554`, Android API 36, Expo Go with the project's SDK 54 bundle. This is actual emulator testing of the local application, not an APK release-build certification.

1. Opened Family > More and tapped Life Events.
2. Explicitly selected the existing Primary Household. It has one existing Primary Member, reused as coordinator and student for this controlled pilot. No household, person, or membership was duplicated.
3. Created `Start a New School Year`, target `2027-06-10`, then added `Uniforms ready`.
4. Existing household tasks were unrelated gutter-cleaning tasks, so a dedicated `School uniforms - Life Events test` task was created through the Operations form. It was then linked as an existing saved task from Life Events.
5. Confirmed the event displayed `0 of 1 preparations resolved` and `Operations: TODO`.
6. Injected one rejected event-store save using the live Hermes debugger. The wrapper restored the real method on invocation. Retried reassociation through the actual UI; the task and existing link remained intact and there was exactly one test task. The same recovery check was repeated against the final error placement. This is controlled failure injection, not a claim that the device spontaneously failed.
7. Tapped the dedicated test task's checkbox in Operations. Returned using Back. The event automatically displayed `1 of 1 preparations resolved` and `Operations: COMPLETED`.
8. Force-stopped and restarted Expo Go, explicitly reselected the household, and reopened the saved event. The same event, preparation, and task IDs were present; source completion remained authoritative and only one test task existed.

Saved runtime proof identifies:

- Event: `life_1789035435804_39dgrhliup8`
- Preparation: `life_1789035464959_yzx3w05d2m`
- Operations task: `task_1789035569247_6f3ld3u`

Evidence is in `artifacts/life-events-2026-09-10/`: `persisted-event.png`, `completed-life-event.png`, `operations-before.png`, `operations-completed.png`, `failed-link-final.png`, and runtime JSON snapshots before completion, after failed linking, after retry, and after restart. Screenshots are unmodified emulator captures.

## Runtime and scope

The original Metro server on 8081 served stale route metadata. A separate fresh server was started from the authoritative checkout on **8082**, leaving 8081 running. The final server has live reload enabled. The emulator uses `exp://127.0.0.1:8082` through adb reverse forwarding. For a cold start, launch the project root first; navigate to Family after it loads. Deep-linking directly into Family during a cold Expo Go launch can hand control to the older installed Wealthwise app and show its unmatched-route screen.

The event and dedicated completed test task remain on the emulator for review. Existing unrelated Operations tasks were not completed, deleted, or relinked. Failure-injection wrappers restored themselves; the process restart also discarded debugger memory.

This is the authorized school-year pilot. Event cancellation, event editing/reassignment, financial references, and broader Life Events workflows are not included. Archived member history is retained, flagged for review, and blocked from new associations. The current Operations model has no per-task remote-user ACL; this integration uses its existing device-local access boundary. The tests do not certify backend or multiuser authorization. No banking, financial ledger, or external messaging integration was added.
