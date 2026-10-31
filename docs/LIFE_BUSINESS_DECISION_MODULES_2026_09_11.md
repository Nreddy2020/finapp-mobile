# Goals & Life Planning · Business Hub (Apartment) · Decision Intelligence — implementation notes (2026-09-11)

Scope delivered in this pass, all offline-first, all money formatted through the global currency context so the same screens serve any locale. No demo data is seeded anywhere; every empty state says what to add and why.

## Shared foundation
- `components/ui/ModuleUI.js` — accessible screen shell, tabs, cards, chips, fields (money, date with quick picks), sheets, stats, progress, confirm. 44dp controls, screen-reader labels, colour never the only signal.
- `services/life/storeKit.js` — durable document stores: strict reads (corrupt data is never replaced), serialized validated atomic writes, deep-copied results, input validators (`text`, `money`, `integer`, `oneOf`, dates).
- `services/notificationService.js` — adds `scheduleAt` and `ReminderScheduler` (per-item owned reminder ids; never `cancelAll`).

## Goals & Life Planning
| Module | Screen | Service(s) | Storage key |
|---|---|---|---|
| Tasks / Goals | `app/(tabs)/todos.js` | `services/todos.js` (extended, backward compatible), `services/life/taskViews.js`, `services/life/lifeGoalsService.js` | `user_todos`, `finlife_life_goals_v1` |
| Time Management | `app/(tabs)/time-management.js` | existing planner (unchanged contracts) + `services/time/focusService.js`, `services/time/habitsService.js` | `finlife_time_planning_v1`, `finlife_time_focus_v1`, `finlife_time_habits_v1` |
| Expiries | `app/(tabs)/expiries.js` | `services/validity/validityService.js` (kind `expiry`) | `user_validity` |
| Validities | `app/(tabs)/validity.js` | `services/validity/validityService.js` (kind `validity`) | `user_validity` |
| Career | `app/(tabs)/career.js` | `services/career/careerOsService.js` (legacy `services/career.js` kept for `/career-growth`) | `finlife_career_v1` |

Tasks gained due dates, categories, notes, repeat (next occurrence created exactly once on completion), steps, money, goal links (`goalRef {domain,id}`), and `completedAt`. Goals have milestones, contribution ledgers, pace guidance (monthly needed, days left). Focus sessions derive elapsed time from timestamps, allow one active session, flag stale sessions for reconciliation and never complete tasks automatically. Habits count streaks only on scheduled days. Validity status is derived at read time; legacy `item / expiry_date / days_left` records adapt on read and compatibility fields are written back so older consumers (family sync, CSV export) keep working.

## Business Hub — Apartment & Society
`app/business/apartment.js` + `services/business/apartmentSocietyService.js` (`finlife_business_apartment_v1`): society settings (flat or per-sq-ft billing, due day, late fee, grace, opening balances), units & residents, idempotent monthly invoice generation (`inv-<period>-<unitId>`), partial/full payments, waivers, late fees, expenses by category and fund, vendors & AMC end-date alerts, complaint tickets with update trails, notices (pin/expiry), meetings with decisions, visitor log, amenity bookings (double-booking prevented), corpus/sinking/maintenance fund balances, collection efficiency, defaulters, P&L, occupancy. Registered in `app/(tabs)/business.js` (which now also has a working "Start new business" picker).

Personal side (`app/(tabs)/apartment.js`): fake seeded dues removed; real lease record with notice deadline and renewal window (`components/housing/LeaseManager.js`), flatmates and shared bills with fewest-transfer settlement (`components/housing/UtilitySplitter.js`), stored under `finlife_apartment_home_v1`.

## Decision Intelligence
| Module | Screen | Service(s) |
|---|---|---|
| Insights | `app/(tabs)/insights.js` | `services/intelligence/decisionEngine.js` (affordability, EMI, what-if, subscription audit, savings leaks, goal feasibility, debt payoff, action plan, weekly digest, assistant) + `finlifeIntelligenceEngine.js` (snapshot now reads canonical `STORAGE_KEYS` stores and declared income sources; legacy keys kept as fallback) |
| Markets | `app/(tabs)/markets.js` | `services/intelligence/marketsService.js` (`finlife_markets_v1`): watchlist with user prices & history, alerts, concentration, sentiment from own list, SIP / lump sum / required SIP / FD / RD / inflation / real return, leverage guard |
| Fin Health | `app/(tabs)/financial-health.js` | uses the engine's health score when present; links to the action plan |
| Tax | `app/(tabs)/tax.js` | `services/tax/taxEngine.js` (FY 2024-25 & 2025-26 slabs, rebate 87A with marginal relief, surcharge, cess, capped deductions, HRA, capital gains post 23-Jul-2024, advance-tax calendar, filing checklist); `services/tax.js` keeps the old `calculateTax` shape |
| In-App Test Hub | `app/(tabs)/testing.js` | 9 new self-tests covering every module above |

## Navigation
Drawer → Goals & Life Planning: Time Management, Tasks / Goals, Expiries, Validities, Family, Career, Travel. Business Hub → Apartment & Society card. More hub gained Expiries and a Business Hub section. New tab route: `expiries`.

## Tests
`tests/test_life_goals_tasks.mjs`, `test_time_focus_habits.mjs`, `test_validity_expiry.mjs`, `test_career_os.mjs`, `test_apartment_society.mjs`, `test_tax_engine.mjs`, `test_decision_intelligence.mjs`, `test_markets_service.mjs` — 64 assertions on fixture storage. Existing `test_todo_durability`, `test_time_planner`, `test_time_export` still pass against the extended task service.

## Backup, reminders and the shock simulator (second pass)
- `services/backup/lifeModulesBackupDomain.js` adds the `lifeModules` domain (schema version 1) to the unified backup engine: life goals, focus, habits, validity/expiry items, career, apartment society, apartment home, markets, personal dues and the tax profile. Each store is validated by its own module validator before restore; a `null` store restores as a delete; older backups without the domain leave the target untouched; failures after write roll back through the existing whole-storage snapshot. Tests: `tests/test_life_modules_backup.mjs` (8 cases).
- `ReminderScheduler.resyncAll()` runs 4 s after launch from `app/_layout.js`: re-arms reminders for every live dated validity/expiry item and cancels reminders whose items were removed. Idempotent per item; silent on web or without permission.
- `services/intelligence.js` now has an on-device market shock model (`simulateMarketShockLocally`): it uses revenue/expense figures the business modules recorded plus the apartment society P&L, applies scenario multipliers, reports how many modules contributed, and shows "NO DATA" rather than a fabricated profit. The server path is used only when an API origin is configured. Tests: `tests/test_market_shock_local.mjs`.

## Known limits / next
- Markets prices are user-entered; no live feed is wired to the watchlist.
- Tax rules cover resident individuals (incl. senior slabs) for FY 2024-25 / 2025-26; HUF, presumptive schemes and 234B/C interest are not modelled.
- Reminder re-sync depends on notification permission being granted once; there is no in-app prompt explaining why it is asked.

## On-device verification (2026-09-11)
Signed release APK built with `gradlew assembleRelease`, installed on `emulator-5554` (Android 16). Every new screen was opened by deep link and screenshotted: Tasks & Goals, Time Management (5 tabs), Validities, Expiries, Career, My Apartment, Business Hub, Apartment & Society, Insights, Markets, Tax, Financial Health, In-App Testing Hub. No JavaScript errors in logcat (the only entries are the pre-existing "no API server configured" inflation fetches). The In-App Testing Hub reports 17/17 cases passing on device, including the 9 added for these modules. Node regression after the second pass: 97/104 suites pass (10 new suites, all green); the 7 failures are the same pre-existing ones as before this work (Metro-dependent bundle test, Android manifest permission check, and source-text assertions on the investments and self screens). Second-pass on-device check: Business Hub simulator shows "NO DATA / 0 Biz" honestly instead of "Error", reminder re-sync runs at launch without errors.
