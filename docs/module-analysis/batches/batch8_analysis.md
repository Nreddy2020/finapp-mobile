# Batch 8 Analysis: Education & Knowledge

## 1. Overview
Batch 8 focuses on the educational aspect of the application ("Fintech for Students/Learning"), empowering users to learn about finance and plan their taxes.

## 2. Component Analysis
### Existing Files
- `app/education-hub.js`: Likely static.
- `app/financial-literacy.js`: Likely static.
- `app/(tabs)/tax.js`: Likely static.

### Requirements
#### A. Services
1.  **`EducationService`**:
    -   Manage Courses (Budgeting 101, Investing for Beginners).
    -   Track User Progress (Modules completed).
    -   Certificates (Mock).
2.  **`LiteracyService`**:
    -   Serve Articles/Tips/Quizzes.
    -   Track "Read" status or Quiz scores.
3.  **`TaxService`**:
    -   Store Tax Profiles (Income, Regime).
    -   Track Deductions (80C, 80D).
    -   Calculate estimated tax liability.

#### B. UI Changes
-   **Education Hub**: Course listing, details view, progress bar.
-   **Financial Literacy**: "Tip of the Day", Article reader, Quiz interaction.
-   **Tax**: Income input, Deduction input (list), Tax summary card.

## 3. Data Structure
-   `EDUCATION_PROGRESS`: `[{ courseId, progress, status }]`
-   `LITERACY_SCORES`: `[{ quizId, score, date }]`
-   `TAX_PROFILE`: `{ income, regime, deductions: [{ type, amount }] }`

## 4. Dependencies
-   Reuse `LuxuryCard`, `LuxuryEmptyState`.
-   Update `storage.js`.
