# Family GUI review — 10 September 2026

User request: check and improve the Family module GUI using the supplied screenshots.

Implemented in the active E:/fintech-mobile app: stable shared safe-area padding; wrapping page titles; compact accessible navigation; five tabs fitting the phone width; consistent neutral surfaces, spacing and bottom padding; clearer destructive actions; shorter gateway and Protection tab labels; readable readiness badges; a two-column action overview; non-overlapping document actions and financial summary; corrected visible currency symbols.

Validation: visually inspected all 13 Family route screenshots on Android API 36, 1080x2340 at density 440 (approximately 393 logical pixels), font scale 1. Goals form was opened, scrolled until Save and Cancel were fully reachable, then cancelled without saving. Nested Home control bounds were [915,161][1036,282], within the viewport. Existing regression suite: 548/548 assertions, 15/15 suites after final source edits. Evidence: ../artifacts/family-gui-2026-09-10/.

The emulator became unresponsive during capture; restarting ADB and rebooting Android without wiping data restored reliable navigation/capture. No account clearing, data deletion, release, commit or deployment occurred in this GUI pass.

Limits: representative portrait Android visual inspection, not complete device certification. iOS, landscape, larger accessibility fonts, narrow 320px devices and the full modal/keyboard matrix remain to be checked. Forecast correctly exposes an unavailable linked-expense error. Financial Coordination still represents that unavailable record as zero and All Linked; this is a correctness gap selected for follow-up. Existing legacy sample budget pools remain visibly labelled and preserved.

## Verified follow-up milestones

Financial Coordination missing-source handling is now fixed: unavailable records retain their saved links, display Unavailable, withhold a complete monthly total and provide Retry. The selected household refresh dependency and stale-response guard were corrected; the month is current rather than hardcoded. Exact paise survive enrichment and the saved person's full name appears in allocations. Native Android rendering was inspected, Retry was exercised, and original records were read-only compared against their baseline: zero changed/missing rows across the 14 legacy collections. The 16 isolated assertions cover missing/restored sources, archive/household isolation and unchanged links. Native recovery after restoring a source was not exercised; that recovery is fixture-tested only. See financials-after-source-fix.png.

Repository cleanup now includes goals, budget pools, income streams and forecast scenarios in the same atomic household deletion candidate. Fixture tests verify all 12 household-owned collections, preservation of the other household and shared people/relationships, failed-save rollback, successful retry and no write for absent household. No native household deletion was invoked. Life Events is separately stored and its household-level cleanup remains an explicit follow-up question.

Final existing regressions remain 548/548 across 15 suites. Additional test files: tests/family/test_family_missing_financial_source.mjs and tests/family/test_family_household_cascade.mjs. The latter validates repository behavior against fixture storage, not native filesystem failure injection.
