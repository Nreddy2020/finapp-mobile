# Batch 2 Implementation Plan: Medicine & Emergency

## Goal
Transform "Medicine Tracker" and "Emergency Fund" from prototype state to **Production-Ready, Life-Critical Systems**.

## User Review Required
> [!IMPORTANT]
> **Security Strategy**: Due to repeated failures with `expo-secure-store` in the Windows environment, "Secure Encryption" will be implemented using a **Salted Base64 Obfuscation Layer** as a temporary bridge. This prevents casual snooping but is NOT military-grade encryption.
> **Production Requirement**: Before app store release, this MUST be replaced with `expo-secure-store`.

## Proposed Changes

### Component: Medicine Tracker (`/medicine-tracker`)

#### [MODIFY] [medicine-tracker.js](file:///e:/fintech-mobile/app/medicine-tracker.js)
- **Dose History**: Implement `handleLogDose` to save a timestamped record to `STORAGE_KEYS.MEDICINE_LOGS`.
- **Refill Logic**: Add a check in `handleLogDose`: if `newStock <= 7`, schedule a local push notification "Refill Warning".
- **Health Stats**: Abstract hardcoded stats into a state object that could later fetch from an API.

#### [NEW] [health.js](file:///e:/fintech-mobile/services/health.js)
- **Purpose**: Service to manage medicine logs and health stats simulation.
- **Functions**: `getDoseHistory(medId)`, `logDose(medId)`, `getHealthStats()`.

### Component: Emergency Fund (`/emergency`)

#### [MODIFY] [emergency.js](file:///e:/fintech-mobile/app/(tabs)/emergency.js)
- **Privacy Mode**: Add a generic "Hide Balance" toggle (eye icon) for privacy.
- **Withdrawal Guard**: Add a simple "Confirm Withdrawal" modal with a "Reason" field (already partially there, will harden it).
- **Transaction Details**: Enhance the history list to show full date/time and notes clearly.

#### [MODIFY] [storage.js](file:///e:/fintech-mobile/services/storage.js)
- **Encryption Adapter**: Add a middleware layer to obfuscate data for `EMERGENCY_FUND` key before saving to `AsyncStorage`.

## Verification Plan

### Automated Tests
- Run `npx expo start --web` and verify:
    1.  **Medicine**: Add med, Log dose -> Check stock decr AND history log created.
    2.  **Refill**: Set stock to 8, Log dose -> Stock becomes 7 -> Notification triggers (or console log simulation if web).
    3.  **Emergency**: Add funds -> Restart app -> Verify persistence.
    4.  **Privacy**: Toggle eye icon -> Balance becomes `****`.

### Manual Verification
- **Life-Critical Check**: Ensure dose logging works 100% of the time.
- **Financial Check**: Ensure emergency fund balance never goes negative and history matches balance.
