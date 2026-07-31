# Batch 7 Implementation Plan: Community & Social

## Goal
Implement fully functional Community Savings, Group Expenses, and Crowdfunding modules with persistent storage.

## Proposed Changes

### 1. Storage & Services
#### [MODIFY] `services/storage.js`
- Add keys: `COMMUNITY_POOLS`, `GROUP_EXPENSES`, `CROWDFUNDING_CAMPAIGNS`.

#### [NEW] `services/community.js`
- Manage ROSCA/Chit fund logic.

#### [NEW] `services/groups.js`
- Manage shared expenses and splitting.

#### [NEW] `services/crowdfunding.js`
- Manage fundraising campaigns.

### 2. UI Implementation
#### [MODIFY] `app/community-savings.js`
- Integrate `CommunityService`.
- Add "Create Pool" Modal.

#### [MODIFY] `app/(tabs)/group-expenses.js` (or correct location)
- Integrate `GroupsService`.
- Add "Create Group" and "Add Expense" features.

#### [MODIFY] `app/crowdfunding.js`
- Integrate `CrowdfundingService`.
- Add logic to "Donate" (update `raised` amount).

## Verification Plan
1.  **Community**: Create a "Vacation Fund" pool, add a contribution.
2.  **Groups**: Create "Roommates", add an expense "Wifi Bill", check total.
3.  **Crowdfunding**: Create "Tech Startup" campaign, donate ₹5000, check progress bar.
