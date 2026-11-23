/**
 * tests/shared-costs/test_sc12_no_destructive_autoseed.mjs
 *
 * SC-12: GroupViewModel.getDashboardData() must flag storage quarantine (checksum mismatch /
 * parse error) rather than silently reporting an empty groups list, and must never itself delete
 * anything. This is the regression test for the data-loss bug documented in
 * docs/planning/004-group-expenses-followups.md Section 1: the screen used to treat ANY
 * empty-looking `groups` array — including one caused by a corrupted/quarantined store — as
 * "first run" and call seedMockupDemoData(), which starts with GroupRepository.clearStore().
 */

import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroupRepository, SHARED_COSTS_STORAGE_KEY } from '../../services/shared-costs/groupRepository.js';
import { GroupViewModel } from '../../services/shared-costs/groupViewModel.js';

console.log('--- [SC-12] Testing getDashboardData Never Masks Storage Corruption as Empty State ---');

// 1. Genuinely empty store (true first-run case) — must report hasGroups:false and NOT quarantined.
await GroupRepository.clearStore();
const freshData = await GroupViewModel.getDashboardData('You');
assert.strictEqual(freshData.hasGroups, false, 'Genuinely empty store must report hasGroups:false');
assert.strictEqual(freshData.storageQuarantined, false, 'Genuinely empty store must NOT be flagged as quarantined');
assert.strictEqual(freshData.groups.length, 0);
console.log('✓ Invariant 1: a true first-run (never-used) store is reported as empty, not quarantined');

// 2. Create a real group with a real expense.
const group = await GroupRepository.createGroup({
    id: 'grp_sc12_real',
    name: 'Real User Group',
    members: [{ id: 'userA', displayNameSnapshot: 'User A' }, { id: 'userB', displayNameSnapshot: 'User B' }]
});
await GroupRepository.addExpense('grp_sc12_real', {
    id: 'exp_sc12_real',
    title: 'Real Dinner',
    amount: 2000,
    payments: [{ memberId: 'userA', amountPaise: 200000n }],
    shares: [{ memberId: 'userA', amountPaise: 100000n }, { memberId: 'userB', amountPaise: 100000n }]
});

const realData = await GroupViewModel.getDashboardData('You');
assert.strictEqual(realData.hasGroups, true, 'Real group must be visible before corruption');
assert.strictEqual(realData.groups.length, 1);
console.log('✓ Invariant 2: a real group with a real expense is loaded correctly');

// 3. Simulate storage corruption (direct tamper, same technique as SC-09) so loadEnvelope()
//    quarantines the data and getAllGroups() comes back empty — WITHOUT calling clearStore().
const rawStorage = await AsyncStorage.getItem(SHARED_COSTS_STORAGE_KEY);
const rawParsed = JSON.parse(rawStorage);
rawParsed.groups['grp_sc12_real'].name = 'TAMPERED';
await AsyncStorage.setItem(SHARED_COSTS_STORAGE_KEY, JSON.stringify(rawParsed));

const quarantinedData = await GroupViewModel.getDashboardData('You');
assert.strictEqual(quarantinedData.groups.length, 0, 'Quarantined envelope legitimately reports zero live groups');
assert.strictEqual(quarantinedData.storageQuarantined, true, 'getDashboardData MUST flag quarantine, not report plain empty state');
assert.strictEqual(quarantinedData.quarantineReason, 'CHECKSUM_MISMATCH');
console.log('✓ Invariant 3: a corrupted/quarantined store is distinguishable from a genuinely empty one');

// 4. CRITICAL: getDashboardData() itself must never delete or mutate the underlying storage key.
//    The raw (tampered) bytes must still be sitting under SHARED_COSTS_STORAGE_KEY — i.e. nothing
//    equivalent to clearStore() ran as a side effect of this read.
const stillThere = await AsyncStorage.getItem(SHARED_COSTS_STORAGE_KEY);
assert.ok(stillThere, 'getDashboardData() must never delete the storage key as a side effect of reading it');
assert.ok(stillThere.includes('TAMPERED'), 'The original (corrupted) bytes must be untouched, not wiped/reseeded');
console.log('✓ Invariant 4: getDashboardData() never mutates or clears storage as a side effect of a read');

// Clean up
await GroupRepository.clearStore();

console.log('✅ SC-12 PASSED: Storage corruption is surfaced, never silently treated as "safe to wipe and reseed".');
