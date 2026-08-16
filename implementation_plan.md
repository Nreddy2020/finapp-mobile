# Complete Family Circle Functionality

The Family Circle module currently has its full UI back (the horizontal top tabs), but clicking "Shared Savings" and "Family Assets" currently loads static UI placeholders instead of the real, fully-implemented screens. Additionally, the other tabs (Insurance, Health, Child Care, Parents Care) were only ever designed as UI mockups and lack backend persistence.

This plan restores full functionality to all 7 tabs while keeping the unified, monolithic tab experience you prefer.

## User Review Required

> [!IMPORTANT]
> The features **Insurance Hub**, **Health Vault**, **Child Care**, and **Parents Care** were previously only static UI mockups. I will now fully implement their backend logic to save and load data locally on your device (adhering to your zero-liability/no-database constraint). Please approve this implementation.

## Proposed Changes

### 1. Link Real Screens (Savings & Assets)
To ensure the top tab bar remains visible while using real screens, we will embed the existing dedicated screens directly into the Family tab.

#### [MODIFY] [app/(tabs)/family.js](file:///e:/fintech-mobile/app/(tabs)/family.js)
- Import `SavingsGoalsScreen` and `AssetsScreen`.
- When `activeTab === 'savings'`, render `<SavingsGoalsScreen isEmbedded={true} />`.
- When `activeTab === 'assets'`, render `<AssetsScreen isEmbedded={true} />`.

#### [MODIFY] [app/(tabs)/savings.js](file:///e:/fintech-mobile/app/(tabs)/savings.js)
- Accept `isEmbedded` prop.
- Conditionally hide the `StackHeader` and `AnimatedScreen` padding when embedded, so it fits seamlessly inside the Family screen.

#### [MODIFY] [app/(tabs)/assets.js](file:///e:/fintech-mobile/app/(tabs)/assets.js)
- Accept `isEmbedded` prop.
- Conditionally hide the `StackHeader` when embedded.

### 2. Implement Missing Functionalities (Local Storage)
For the remaining 4 tabs, we will bind the static UI forms to actual local storage persistence using the app's secure storage service.

#### [MODIFY] [app/(tabs)/family.js](file:///e:/fintech-mobile/app/(tabs)/family.js)
- **Insurance Hub**: Implement `saveInsurance()` and `loadInsurance()` to store policies in AsyncStorage.
- **Health Vault**: Implement `saveHealthRecord()` to persist blood pressure, sugar levels, and prescriptions locally.
- **Child Care**: Implement `updateSchoolFeeStatus()` to track and save paid/unpaid status for school fees.
- **Parents Care**: Implement `saveElderCareLog()` to persist medication and care reminders.
- Fetch all of these data points inside the main `useEffect()` on mount.

## Verification Plan
1. **Routing**: Clicking "Shared Savings" in the Family screen will load real saving goals.
2. **Persistence**: Adding a Health Vault record, navigating away, and returning will show the record is saved.
3. **UI/UX**: The top horizontal tab bar will remain visible across all 7 functionalities without duplicate headers.
