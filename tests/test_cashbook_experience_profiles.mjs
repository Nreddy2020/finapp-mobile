/**
 * tests/test_cashbook_experience_profiles.mjs
 * 
 * Test Suite: Cashbook Experience Profiles Resolution & Integrity.
 * Verifies profile resolution, navigation tabs, purpose-grouped categories,
 * balance policies, closing policies, and validation policies.
 */

import assert from 'assert';
import {
    CashbookType,
    CashbookExperienceProfile,
    CashbookExperienceConfigMap,
    resolveCashbookExperience,
    BalanceMode,
    ClosingMode
} from '../services/cashbook/cashbookContracts.js';

console.log('=== TEST SUITE: CASHBOOK EXPERIENCE PROFILES ===\n');

// Test 1: Profile Resolution for all Book Types
console.log('Test 1: Experience Profile Resolution');
const expectedMappings = [
    { type: CashbookType.SAVINGS, profileId: CashbookExperienceProfile.PERSONAL_FINANCE_BOOK },
    { type: CashbookType.HANDY_CASH, profileId: CashbookExperienceProfile.HANDY_CASH_REGISTER },
    { type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS, profileId: CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK },
    { type: CashbookType.REGULAR_INCOME, profileId: CashbookExperienceProfile.REGULAR_INCOME_BOOK },
    { type: CashbookType.LOANS_TAKEN, profileId: CashbookExperienceProfile.LOANS_TAKEN_REGISTER },
    { type: CashbookType.LOANS_GIVEN, profileId: CashbookExperienceProfile.LOANS_GIVEN_REGISTER },
    { type: CashbookType.PF, profileId: CashbookExperienceProfile.PROVIDENT_FUND_REGISTER },
    { type: CashbookType.INVESTMENTS, profileId: CashbookExperienceProfile.INVESTMENT_REGISTER }
];

for (const mapping of expectedMappings) {
    const resolvedFromType = resolveCashbookExperience(mapping.type);
    assert.strictEqual(resolvedFromType.profileId, mapping.profileId, `Failed resolving from type: ${mapping.type}`);

    const resolvedFromBookObj = resolveCashbookExperience({ id: 'book_1', type: mapping.type, name: 'Test Book' });
    assert.strictEqual(resolvedFromBookObj.profileId, mapping.profileId, `Failed resolving from book object: ${mapping.type}`);
}
console.log('  ✅ Successfully resolved all 8 book types to correct experience profiles');

// Test 2: Navigation Tabs Integrity
console.log('\nTest 2: Navigation Tabs Integrity');
for (const [profileId, config] of Object.entries(CashbookExperienceConfigMap)) {
    assert(config.navigation, `${profileId} must have navigation`);
    assert(config.navigation.length >= 3, `${profileId} must have at least 3 tabs`);
    
    // Check first tab is DASHBOARD
    assert.strictEqual(config.navigation[0].key, 'DASHBOARD', `${profileId} first tab must be DASHBOARD`);

    // Ensure all tab keys are unique
    const keys = config.navigation.map(t => t.key);
    const uniqueKeys = new Set(keys);
    assert.strictEqual(keys.length, uniqueKeys.size, `${profileId} navigation tab keys must be unique`);

    for (const tab of config.navigation) {
        assert(tab.label && typeof tab.label === 'string', `${profileId} tab must have string label`);
        assert(tab.iconName && typeof tab.iconName === 'string', `${profileId} tab must have string iconName`);
    }
}
console.log('  ✅ Navigation tabs are structurally complete and unique across all profiles');

// Test 3: Quick Actions Integrity
console.log('\nTest 3: Quick Actions Integrity');
for (const [profileId, config] of Object.entries(CashbookExperienceConfigMap)) {
    assert(config.quickActions, `${profileId} must have quickActions`);
    assert(config.quickActions.length >= 2, `${profileId} must have at least 2 quick actions`);

    const actionIds = config.quickActions.map(a => a.actionId);
    const uniqueActionIds = new Set(actionIds);
    assert.strictEqual(actionIds.length, uniqueActionIds.size, `${profileId} quick action IDs must be unique`);

    for (const action of config.quickActions) {
        assert(action.actionId && typeof action.actionId === 'string');
        assert(action.label && typeof action.label === 'string');
        assert(action.variant && typeof action.variant === 'string');
        assert(action.color && typeof action.color === 'string');
    }
}
console.log('  ✅ Quick actions are valid, uniquely keyed, and styled for all profiles');

// Test 4: Purpose Category Groups Integrity
console.log('\nTest 4: Purpose Category Groups');
for (const [profileId, config] of Object.entries(CashbookExperienceConfigMap)) {
    assert(config.categoryGroups, `${profileId} must have categoryGroups`);
    assert(config.categoryGroups.length >= 1, `${profileId} must have at least 1 category group`);

    const seenCategories = new Set();
    for (const group of config.categoryGroups) {
        assert(group.name && typeof group.name === 'string');
        assert(Array.isArray(group.categories) && group.categories.length > 0);
        for (const cat of group.categories) {
            assert(cat.key && typeof cat.key === 'string');
            assert(cat.label && typeof cat.label === 'string');
            assert(!seenCategories.has(cat.key), `${profileId} duplicate category key: ${cat.key}`);
            seenCategories.add(cat.key);
        }
    }
}
console.log('  ✅ Category groups contain distinct, purpose-driven categories without duplicates');

// Test 5: Balance & Closing Policies
console.log('\nTest 5: Balance & Closing Policies');
// Handy Cash requires physical till closing with denominations
const handyProfile = CashbookExperienceConfigMap[CashbookExperienceProfile.HANDY_CASH_REGISTER];
assert.strictEqual(handyProfile.balancePolicy.balanceMode, BalanceMode.PHYSICAL_CASH);
assert.strictEqual(handyProfile.closingPolicy.mode, ClosingMode.PHYSICAL_TILL);
assert.strictEqual(handyProfile.closingPolicy.requiresDenominations, true);
assert.strictEqual(handyProfile.closingPolicy.requiresPeriodLock, true);

// PF requires restricted asset and enforces split total
const pfProfile = CashbookExperienceConfigMap[CashbookExperienceProfile.PROVIDENT_FUND_REGISTER];
assert.strictEqual(pfProfile.balancePolicy.balanceMode, BalanceMode.RESTRICTED_ASSET);
assert.strictEqual(pfProfile.validationPolicy.enforceSplitTotal, true);

// Loans Taken requires loan liability and split enforcement
const loanTakenProfile = CashbookExperienceConfigMap[CashbookExperienceProfile.LOANS_TAKEN_REGISTER];
assert.strictEqual(loanTakenProfile.balancePolicy.balanceMode, BalanceMode.LOAN_LIABILITY);
assert.strictEqual(loanTakenProfile.validationPolicy.enforceSplitTotal, true);

// Business requires counterparty and operational closing
const bizProfile = CashbookExperienceConfigMap[CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK];
assert.strictEqual(bizProfile.validationPolicy.requireCounterparty, true);
assert.strictEqual(bizProfile.closingPolicy.mode, ClosingMode.OPERATIONAL);

console.log('  ✅ Domain balance, closing, and validation policies adhere to exact specifications');

console.log('\n🎉 ALL CASHBOOK EXPERIENCE PROFILES TESTS PASSED!\n');
