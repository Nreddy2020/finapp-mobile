# Batch 9 Analysis: Lifestyle & Wellness

## 1. Overview
Batch 9 focuses on "Lifestyle Tools" and "Engagements". It includes a utility calculator for students/nomads (Hostel vs Commute), the Gamification engine to reward financial discipline, and the core Settings/Profile module.

## 2. Component Analysis
### Existing Files
- `app/hostel-calculator.js`: Likely static.
- `app/gamification.js`: Likely static.
- `app/settings.js`: Likely static or partial.

### Requirements
#### A. Services
1.  **`CalculatorService`**:
    -   Hostel Calculator logic: Compare (Rent + Food + Utilities) vs (Commute Cost + Time Value).
2.  **`GamificationService`**:
    -   Track Points (earned from adding expenses, saving, reading articles).
    -   Manage Badges (Saver, Investor, Learner).
    -   Leaderboard (Mock).
3.  **`SettingsService`**:
    -   Manage User Profile (Name, Email, Phone).
    -   Preferences (Theme, Notification Toggles, Currency).

#### B. UI Changes
-   **Hostel Calculator**: Input fields for Rent, Food, Commute distance, etc. Result card showing "Cheaper Option".
-   **Gamification**: Dashboard showing Points, Level, and Badges grid.
-   **Settings**: Form to edit profile, Toggles for settings.

## 3. Data Structure
-   `USER_POINTS`: `{ total, history: [{ reason, points, date }] }`
-   `USER_BADGES`: `['saver_1', 'investor_1']`
-   `USER_SETTINGS`: `{ theme, notifications: { push, email }, currency }`

## 4. Dependencies
-   Reuse `LuxuryCard`, `LuxuryEmptyState`.
-   Update `storage.js`.
