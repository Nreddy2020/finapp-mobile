# Batch 7 Analysis: Community & Social

## 1. Overview
Batch 7 focuses on the social aspects of the fintech app: Community Savings (Chit Funds/ROSCAs), Group Expenses (Splitwise-like), and Crowdfunding (Donation/Investments).

## 2. Component Analysis
### Existing Files
- `app/community-savings.js`: Likely static or mock.
- `app/(tabs)/group-expenses.js`: Likely static or mock.
- `app/crowdfunding.js`: Likely static or mock.

### Requirements
#### A. Services
1.  **`CommunitySavingsService`**:
    -   Manage "Pools" (Chit Funds).
    -   Track contributions and payouts.
    -   Calculate pot value.
2.  **`GroupExpensesService`**:
    -   Manage "Groups" (Trip to Goa, House Rent).
    -   Add expenses to groups.
    -   Split logic (Equal/Unequal - starting with Equal for MVP).
    -   "Settle Up" logic.
3.  **`CrowdfundingService`**:
    -   Create Campaigns (Medical, Education, Startup).
    -   Track donations/funding.
    -   Progress bars.

#### B. UI Changes
-   **Community Savings**: Card based layout for active pools. "Join Pool" modal.
-   **Group Expenses**: List of groups -> List of expenses. "Add Expense" floating button.
-   **Crowdfunding**: Discovery feed of campaigns. "Donate" button.

## 3. Data Structure
-   `COMMUNITY_POOLS`: `[{ id, name, targetAmount, monthlyContribution, members: [], cycle: current/total }]`
-   `GROUP_EXPENSES`: `[{ id, groupName, members: [], expenses: [{ payer, amount, description, date }] }]`
-   `CROWDFUNDING_CAMPAIGNS`: `[{ id, title, description, target, raised, category }]`

## 4. Dependencies
-   Reuse `LuxuryCard`, `LuxuryEmptyState`.
-   Update `storage.js` with new keys.
