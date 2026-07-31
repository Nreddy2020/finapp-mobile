# Batch 8 Implementation Plan: Education & Knowledge

## Goal
Implement persistent Education Hub, Financial Literacy, and Tax Planning modules.

## Proposed Changes

### 1. Storage & Services
#### [MODIFY] `services/storage.js`
- Add keys: `EDUCATION_PROGRESS`, `LITERACY_SCORES`, `TAX_PROFILE`.

#### [NEW] `services/education.js`
- Course catalog + progress tracking.

#### [NEW] `services/literacy.js`
- Quiz and article tracking.

#### [NEW] `services/tax.js`
- Tax calculation logic (Old vs New Regime simplistic comparison).

### 2. UI Implementation
#### [MODIFY] `app/education-hub.js`
- Integrate `EducationService`.
- Show real progress.

#### [MODIFY] `app/financial-literacy.js`
- Integrate `LiteracyService`.
- Functional quizzes.

#### [MODIFY] `app/(tabs)/tax.js`
- Integrate `TaxService`.
- Functional tax calculator.

## Verification Plan
1.  **Education**: Start "Investing 101", mark module 1 complete, check progress 50%.
2.  **Literacy**: Take "Savings Quiz", score 8/10, verify saved score.
3.  **Tax**: Enter ₹12L income, add ₹1.5L 80C, check Tax output.
