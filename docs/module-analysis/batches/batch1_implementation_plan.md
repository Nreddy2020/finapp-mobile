# P0 Implementation Plan: Security & Stability

## Goal
Implement critical P0 features to make Batch 1 (Cashbooks & Validity) production-ready by addressing security vulnerabilities and stability issues identified in the verification report.

## User Review Required

> [!CAUTION]
> **Breaking Changes**: Implementing encryption will require data migration. Existing unencrypted data in AsyncStorage will need to be re-encrypted or cleared.

> [!IMPORTANT]
> **Authentication**: Adding auth guards will require users to log in. Currently, the app has no authentication system - this needs to be clarified with the user before implementation.

## Proposed Changes

### Phase 1: Error Boundaries (Quick Win)

#### [NEW] [components/ErrorBoundary.js](file:///e:/fintech-mobile/components/ErrorBoundary.js)
- Create React error boundary component
- Catch unhandled errors in component tree
- Display fallback UI with retry option
- Log errors to console (future: Sentry integration)

#### [MODIFY] [app/(tabs)/cashbooks.js](file:///e:/fintech-mobile/app/(tabs)/cashbooks.js)
- Wrap screen content with `<ErrorBoundary>`

#### [MODIFY] [app/(tabs)/validity.js](file:///e:/fintech-mobile/app/(tabs)/validity.js)
- Wrap screen content with `<ErrorBoundary>`

---

### Phase 2: Edit Operations (Feature Completion)

#### [MODIFY] [app/(tabs)/cashbooks.js](file:///e:/fintech-mobile/app/(tabs)/cashbooks.js)
- Add `handleEditBook(id, updates)` function
- Update UI to show Edit icon/button on each card
- Create edit modal or reuse `CreateBookModal` with edit mode

#### [MODIFY] [components/cashbooks/CreateBookModal.js](file:///e:/fintech-mobile/components/cashbooks/CreateBookModal.js)
- Add `editMode` prop and `initialData` prop
- Pre-populate form fields when editing
- Change button text to "Update Book" when editing

#### [MODIFY] [app/(tabs)/validity.js](file:///e:/fintech-mobile/app/(tabs)/validity.js)
- Add `handleEditDocument(id, updates)` function
- Update UI to show Edit icon on each document card

#### [MODIFY] [components/validity/AddDocumentModal.js](file:///e:/fintech-mobile/components/validity/AddDocumentModal.js)
- Add `editMode` and `initialData` props
- Pre-populate form when editing
- Change button text to "Update Document" when editing

---

### Phase 3: Real Notifications (Replace Mock)

#### [MODIFY] [components/validity/AddDocumentModal.js](file:///e:/fintech-mobile/components/validity/AddDocumentModal.js)
- Replace mock `scheduleNotification` with real implementation
- Use `Notifications.scheduleNotificationAsync` with trigger dates
- Schedule notifications for 30, 15, 7, 1 days before expiry
- Request permissions on first use

#### [NEW] [services/notifications.js](file:///e:/fintech-mobile/services/notifications.js)
- Create notification service wrapper
- Handle permission requests
- Schedule/cancel notification helpers
- Configure notification channels (Android)

---

### Phase 4: Data Encryption (Security Critical)

> [!WARNING]
> This requires `expo-secure-store` which has platform limitations:
> - iOS: Uses Keychain (secure)
> - Android: Uses EncryptedSharedPreferences (secure)
> - Web: Uses localStorage (NOT secure - falls back to plain storage)

#### [MODIFY] [services/storage.js](file:///e:/fintech-mobile/services/storage.js)
- Add encryption layer using `expo-secure-store` for sensitive data
- Create `saveSecureData` and `loadSecureData` functions
- Encrypt: `CASHBOOKS`, `VALIDITY` data before storage
- Add data migration helper for existing unencrypted data

#### [MODIFY] [app/(tabs)/cashbooks.js](file:///e:/fintech-mobile/app/(tabs)/cashbooks.js)
- Use `saveSecureData` instead of `saveData` for cashbooks
- Use `loadSecureData` instead of `loadData`

#### [MODIFY] [app/(tabs)/validity.js](file:///e:/fintech-mobile/app/(tabs)/validity.js)
- Use `saveSecureData` instead of `saveData` for validity items
- Use `loadSecureData` instead of `loadData`

---

### Phase 5: Authentication Guards (Deferred - Needs Clarification)

> [!NOTE]
> **Question for User**: The app currently has no authentication system. Should we:
> 1. Add authentication (requires login screen, user management)
> 2. Skip auth guards for now (single-user local app)
> 3. Add biometric-only auth (no server, just local device lock)

**If implementing auth**:
- Create `contexts/AuthContext.js` for auth state
- Create `app/login.js` screen
- Add route guards in `app/_layout.js`
- Associate data with user_id in storage

**Deferred until user confirms approach.**

---

## Verification Plan

### After Each Phase
1. **Error Boundaries**: Trigger error (e.g., invalid data) → Verify fallback UI shows
2. **Edit Operations**: Edit cashbook/document → Verify changes persist
3. **Notifications**: Add document → Verify notification scheduled (check device notification settings)
4. **Encryption**: Add data → Restart app → Verify data loads correctly (encrypted in storage)

### Automated Tests
- Update `tests/e2e/run_suite.js` to verify edit operations
- Add notification permission checks
- Verify encrypted data in AsyncStorage (manual inspection)

### Manual Verification
1. Create cashbook → Edit name → Verify update
2. Add document → Edit expiry date → Verify update
3. Add document expiring in 5 days → Verify notification appears
4. Inspect AsyncStorage → Verify data is encrypted (not plain text)

---

## Implementation Order

1. ✅ **Error Boundaries** (30 min) - Quick win, prevents crashes
2. ✅ **Edit Operations** (2 hours) - Completes CRUD, high user value
3. ✅ **Real Notifications** (1.5 hours) - Core feature for Validity module
4. ✅ **Data Encryption** (2 hours) - Security critical, but requires testing
5. ⏸️ **Authentication** (Deferred) - Needs user decision on approach

**Total Estimated Time**: ~6 hours (excluding auth)

---

## Known Limitations After Implementation

1. **Web Platform**: Encryption falls back to plain storage (expo-secure-store limitation)
2. **Notifications**: Requires user permission grant
3. **Authentication**: Not implemented (pending user decision)
4. **Unknown Components**: `AutoRenewalCard` and `FamilySync` functionality still unclear

---

## Success Criteria

- ✅ App does not crash on errors (error boundary catches them)
- ✅ Users can edit cashbooks and documents
- ✅ Notifications schedule correctly for expiring documents
- ✅ Sensitive data is encrypted in AsyncStorage (iOS/Android)
- ✅ All existing features continue to work (no regressions)

**Production Ready**: 🟡 After Phase 4 (with auth deferred)
