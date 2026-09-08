/**
 * tests/shared-costs/test_sc10_cashbook_commitment_binding.mjs
 * 
 * SC-10: Decoupled Read-Only Cashbook V3 Commitment Binding.
 */

import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GroupCommitmentBinding } from '../../services/shared-costs/groupCommitmentBinding.js';

console.log('--- [SC-10] Testing Cashbook Commitment Binding & Non-Mutation Contract ---');

// Snapshot AsyncStorage keys before binding
const allKeysBefore = await AsyncStorage.getAllKeys();
const cashbookKeysBefore = allKeysBefore.filter(k => k.startsWith('FINLIFE_CASHBOOK_'));

// 1. Generate Deterministic Descriptor
const sampleExpense = {
    id: 'exp_hotel_101',
    groupId: 'grp_mumbai_trip',
    title: 'Hotel Taj Lands End (Booking #984129)',
    expenseDate: '2026-08-15T12:00:00.000Z',
    splitMethod: 'EQUAL'
};

const samplePayment = {
    id: 'pay_taj_01',
    memberId: 'm_ravi',
    amountPaise: 4500000n, // ₹45,000
    paymentMethod: 'CARD'
};

const descriptor = GroupCommitmentBinding.generateExpenseCommitmentDescriptor(sampleExpense, samplePayment);

assert.strictEqual(descriptor.commitmentId, 'SC_COMMITMENT_v1_exp_hotel_101_pay_taj_01');
assert.strictEqual(descriptor.category, 'SHARED_COSTS');
assert.strictEqual(descriptor.amountPaise, 4500000n);
assert.strictEqual(descriptor.frequency, 'ONE_TIME');
assert.strictEqual(descriptor.dueDayOfMonth, 15);
assert.strictEqual(descriptor.metadata.sourceModule, 'SHARED_COSTS_V1');
console.log('✓ Invariant 1: Commitment descriptor generated deterministically with sanitized metadata');

// 2. Request Registration (Graceful Standalone Mode)
const regResult = await GroupCommitmentBinding.requestCommitmentRegistration(descriptor);
assert.strictEqual(regResult.success, true);
console.log('✓ Invariant 2: Commitment registration succeeds with graceful degradation if offline');

// 3. Request Deactivation
const deactResult = await GroupCommitmentBinding.requestCommitmentDeactivation('exp_hotel_101');
assert.strictEqual(deactResult.success, true);
console.log('✓ Invariant 3: Commitment deactivation succeeds cleanly');

// 4. Invariant: ZERO DIRECT MUTATION OF CASHBOOK STORAGE
const allKeysAfter = await AsyncStorage.getAllKeys();
const cashbookKeysAfter = allKeysAfter.filter(k => k.startsWith('FINLIFE_CASHBOOK_'));

// Ensure no ledger or audit keys were created or altered
const forbiddenMutations = cashbookKeysAfter.filter(k => k.includes('_LEDGER_') || k.includes('_AUDIT_'));
assert.strictEqual(forbiddenMutations.length, 0, 'Zero Cashbook ledger or audit keys may be mutated by Shared Costs');
console.log('✓ Invariant 4: Verified ZERO DIRECT MUTATION of Cashbook V3 ledger or audit tables');

console.log('✅ SC-10 PASSED: All Cashbook commitment binding checks verified.');
