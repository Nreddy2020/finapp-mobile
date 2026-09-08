/**
 * tests/shared-costs/test_sc09_persistence_audit_chain.mjs
 * 
 * SC-09: Persistence Checksums, Quarantine, and Cryptographic Audit Chain.
 */

import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroupRepository, SHARED_COSTS_STORAGE_KEY } from '../../services/shared-costs/groupRepository.js';
import { GroupAudit } from '../../services/shared-costs/groupAudit.js';

console.log('--- [SC-09] Testing Persistence, Checksums & Audit Chain Integrity ---');

// Reset
await GroupRepository.clearStore();

// 1. Create a group and an expense to populate the store and audit trail
const group = await GroupRepository.createGroup({
    id: 'grp_persist_1',
    name: 'Audit Test Group',
    members: [{ id: 'userA', displayNameSnapshot: 'User A' }, { id: 'userB', displayNameSnapshot: 'User B' }]
});

await GroupRepository.addExpense('grp_persist_1', {
    id: 'exp_persist_1',
    title: 'Audit Dinner',
    amount: 2000,
    payments: [{ memberId: 'userA', amountPaise: 200000n }],
    shares: [{ memberId: 'userA', amountPaise: 100000n }, { memberId: 'userB', amountPaise: 100000n }]
});

await GroupRepository.recordSettlement('grp_persist_1', {
    fromMemberId: 'userB',
    toMemberId: 'userA',
    amount: 1000
});

// 2. Verify Audit Chain Integrity
const envelope = await GroupRepository.loadEnvelope();
assert.ok(envelope.auditTrail.length >= 3, 'Audit trail must have at least 3 entries');

const integrity = GroupAudit.verifyChainIntegrity(envelope.auditTrail);
assert.strictEqual(integrity.isValid, true, 'Audit chain integrity must be valid');
assert.strictEqual(integrity.verifiedCount, envelope.auditTrail.length);
console.log(`✓ Invariant 1: Cryptographic audit chain verified across ${integrity.verifiedCount} events`);

// 3. Detect Audit Tampering
const tamperedTrail = JSON.parse(JSON.stringify(envelope.auditTrail));
// Tamper with payload of entry 1
tamperedTrail[0].payloadHash = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const tamperCheck = GroupAudit.verifyChainIntegrity(tamperedTrail);
assert.strictEqual(tamperCheck.isValid, false, 'Tampered audit trail must fail verification');
assert.ok(tamperCheck.error.includes('EVENT_TAMPER_DETECTED'));
console.log('✓ Invariant 2: Cryptographic tamper detection catches corrupted audit payload');

// 4. Store Envelope Checksum Verification
assert.ok(envelope.checksum, 'Envelope must contain a SHA-256 checksum');
assert.strictEqual(typeof envelope.checksum, 'string');
assert.strictEqual(envelope.checksum.length, 64);
console.log('✓ Invariant 3: Store envelope protected by valid 64-char SHA-256 checksum');

// 5. Checksum Tamper Detection & Fail-Closed Quarantine
// Read raw store from AsyncStorage, alter a field without updating checksum, and reload
const rawStorage = await AsyncStorage.getItem(SHARED_COSTS_STORAGE_KEY);
const rawParsed = JSON.parse(rawStorage);
rawParsed.groups['grp_persist_1'].name = 'HACKED_GROUP_NAME'; // direct tampering
await AsyncStorage.setItem(SHARED_COSTS_STORAGE_KEY, JSON.stringify(rawParsed));

const quarantinedEnvelope = await GroupRepository.loadEnvelope();
assert.strictEqual(quarantinedEnvelope.quarantineReason, 'CHECKSUM_MISMATCH');
assert.strictEqual(Object.keys(quarantinedEnvelope.groups).length, 0, 'Tampered data quarantined away from active runtime');
assert.strictEqual(quarantinedEnvelope.quarantine.length, 1, 'Corrupted data moved into quarantine array');
console.log('✓ Invariant 4: Corrupted store automatically quarantined on checksum mismatch');

// Clean up
await GroupRepository.clearStore();

// 6. Projection Rebuilding on Clean State
const groupRebuild = await GroupRepository.createGroup({
    id: 'grp_rebuild',
    name: 'Rebuild Group',
    members: [{ id: 'm1', name: 'M1' }, { id: 'm2', name: 'M2' }]
});
await GroupRepository.addExpense('grp_rebuild', {
    id: 'exp_r1',
    title: 'R1',
    amount: 500,
    payments: [{ memberId: 'm1', amountPaise: 50000n }],
    shares: [{ memberId: 'm1', amountPaise: 25000n }, { memberId: 'm2', amountPaise: 25000n }]
});

const rebuildResults = await GroupRepository.rebuildProjections('TEST_RUNNER');
assert.strictEqual(rebuildResults.length, 1);
assert.strictEqual(rebuildResults[0].conservationVerified, true);
assert.strictEqual(rebuildResults[0].projectionMap['m1'].netBalancePaise, 25000n);
console.log('✓ Invariant 5: Projection rebuilding correctly replays ledger and verifies invariants');

console.log('✅ SC-09 PASSED: All persistence, checksum, and audit checks verified.');
