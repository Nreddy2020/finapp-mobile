# Batch 9 Implementation Plan: Lifestyle & Wellness

## Goal
Implement persistent Hostel Calculator, Gamification, and Settings modules.

## Proposed Changes

### 1. Storage & Services
#### [MODIFY] `services/storage.js`
- Add keys: `USER_POINTS`, `USER_BADGES`, `USER_SETTINGS`.

#### [NEW] `services/calculator.js`
- Hostel vs Commute logic.

#### [NEW] `services/gamification.js`
- Points and Badge logic.

#### [MODIFY] `services/settings.js` (Create if missing, or update `storage.js` usage)
- Profile and Preference management.

### 2. UI Implementation
#### [MODIFY] `app/hostel-calculator.js`
- Integrate `CalculatorService`.
- Interactive comparison.

#### [MODIFY] `app/gamification.js`
- Integrate `GamificationService`.
- Show real points and badges.

#### [MODIFY] `app/settings.js`
- Integrate `SettingsService`.
- Editable profile and toggles.

## Verification Plan
1.  **Calculator**: Enter ₹10k Rent vs ₹2k Commute. Result "Commute is cheaper".
2.  **Gamification**: Check points (start 0), perform action (mock), check points increased.
3.  **Settings**: Change Name to "Rohan", save, restart app, check Name is "Rohan".
