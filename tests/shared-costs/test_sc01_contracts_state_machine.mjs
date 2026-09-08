/**
 * tests/shared-costs/test_sc01_contracts_state_machine.mjs
 * 
 * SC-01: Shared Costs Domain Contracts, Enums, BigInt Math & State Machines.
 */

import assert from 'assert';
import {
    GROUP_TYPES,
    GROUP_STATUS,
    MEMBER_ROLES,
    MEMBER_STATUS,
    SPLIT_METHODS,
    EXPENSE_STATUS,
    SETTLEMENT_METHODS,
    SETTLEMENT_STATUS,
    RECURRING_FREQUENCIES,
    GROUP_ACTIONS,
    ROLE_PERMISSIONS,
    hasRolePermission,
    SHARED_COSTS_CONSTANTS,
    toPaise,
    paiseToRupees,
    toRupeesFormatted,
    transitionGroupState,
    transitionExpenseState,
    canonicalJsonStringify,
    bigIntReplacer,
    bigIntReviver
} from '../../services/shared-costs/groupContracts.js';

console.log('--- [SC-01] Testing Domain Contracts, Enums & State Machine ---');

// 1. Enums Immutability
assert.throws(() => { GROUP_TYPES.NEW_TYPE = 'FAIL'; }, /TypeError/, 'GROUP_TYPES must be frozen');
assert.throws(() => { GROUP_STATUS.NEW_STATUS = 'FAIL'; }, /TypeError/, 'GROUP_STATUS must be frozen');
assert.throws(() => { SPLIT_METHODS.NEW_METHOD = 'FAIL'; }, /TypeError/, 'SPLIT_METHODS must be frozen');
assert.throws(() => { EXPENSE_STATUS.NEW_STATUS = 'FAIL'; }, /TypeError/, 'EXPENSE_STATUS must be frozen');
console.log('✓ Invariant 1: All contract enums are strictly frozen');

// 2. BigInt Paise Conversions
assert.strictEqual(toPaise(100), 10000n, '₹100 must equal 10,000 paise');
assert.strictEqual(toPaise('123.45'), 12345n, '₹123.45 string must equal 12,345 paise');
assert.strictEqual(toPaise('1,500.50'), 150050n, 'Formatted comma string must parse correctly');
assert.strictEqual(toPaise(0.01), 1n, '₹0.01 must equal 1 paisa');
assert.strictEqual(paiseToRupees(12345n), 123.45, '12,345 paise must convert back to 123.45');
assert.strictEqual(toRupeesFormatted(123456n), '₹1,234.56', 'Format INR string should have ₹ and commas');
assert.strictEqual(toRupeesFormatted(-50000n), '-₹500.00', 'Negative amounts must format with leading minus');

assert.throws(() => toPaise(-10), /NEGATIVE_AMOUNT_REJECTED/, 'Negative amounts must fail closed');
assert.throws(() => toPaise('abc'), /INVALID_RUPEE_AMOUNT/, 'Non-numeric input must fail closed');
console.log('✓ Invariant 2: BigInt paise conversions and formatting validated');

// 3. Role Permissions
assert.strictEqual(hasRolePermission(MEMBER_ROLES.OWNER, GROUP_ACTIONS.CREATE_GROUP), true, 'Owner has all permissions');
assert.strictEqual(hasRolePermission(MEMBER_ROLES.OWNER, GROUP_ACTIONS.REMOVE_MEMBER), true, 'Owner can remove member');
assert.strictEqual(hasRolePermission(MEMBER_ROLES.ADMIN, GROUP_ACTIONS.ADD_MEMBER), true, 'Admin can add member');
assert.strictEqual(hasRolePermission(MEMBER_ROLES.ADMIN, GROUP_ACTIONS.CREATE_GROUP), false, 'Admin cannot create group');
assert.strictEqual(hasRolePermission(MEMBER_ROLES.MEMBER, GROUP_ACTIONS.ADD_EXPENSE), true, 'Member can add expense');
assert.strictEqual(hasRolePermission(MEMBER_ROLES.MEMBER, GROUP_ACTIONS.REMOVE_MEMBER), false, 'Member cannot remove member');
assert.strictEqual(hasRolePermission(MEMBER_ROLES.VIEWER, GROUP_ACTIONS.VIEW), true, 'Viewer can view');
assert.strictEqual(hasRolePermission(MEMBER_ROLES.VIEWER, GROUP_ACTIONS.ADD_EXPENSE), false, 'Viewer cannot add expense');
console.log('✓ Invariant 3: Role permission matrix strictly enforced');

// 4. Group State Transitions — All 6 Controlled Lifecycle States
// DRAFT, ACTIVE, SETTLEMENT_PENDING, SETTLED, ARCHIVED, QUARANTINED
const tDraftToActive = transitionGroupState(GROUP_STATUS.DRAFT, GROUP_STATUS.ACTIVE);
assert.strictEqual(tDraftToActive.state, GROUP_STATUS.ACTIVE, 'Draft -> Active allowed');

const tActiveToPending = transitionGroupState(GROUP_STATUS.ACTIVE, GROUP_STATUS.SETTLEMENT_PENDING);
assert.strictEqual(tActiveToPending.state, GROUP_STATUS.SETTLEMENT_PENDING, 'Active -> Settlement_Pending allowed');

const tPendingToSettled = transitionGroupState(GROUP_STATUS.SETTLEMENT_PENDING, GROUP_STATUS.SETTLED, { hasUnsettledBalances: false });
assert.strictEqual(tPendingToSettled.state, GROUP_STATUS.SETTLED, 'Settlement_Pending -> Settled allowed when no unsettled balances');

const tSettledToActive = transitionGroupState(GROUP_STATUS.SETTLED, GROUP_STATUS.ACTIVE);
assert.strictEqual(tSettledToActive.state, GROUP_STATUS.ACTIVE, 'Settled -> Active controlled reopening allowed');

const tActiveToArchived = transitionGroupState(GROUP_STATUS.ACTIVE, GROUP_STATUS.ARCHIVED);
assert.strictEqual(tActiveToArchived.state, GROUP_STATUS.ARCHIVED, 'Active -> Archived allowed');

const tArchivedToActive = transitionGroupState(GROUP_STATUS.ARCHIVED, GROUP_STATUS.ACTIVE);
assert.strictEqual(tArchivedToActive.state, GROUP_STATUS.ACTIVE, 'Archived -> Active controlled reopening allowed');

const tActiveToQuarantine = transitionGroupState(GROUP_STATUS.ACTIVE, GROUP_STATUS.QUARANTINED);
assert.strictEqual(tActiveToQuarantine.state, GROUP_STATUS.QUARANTINED, 'Active -> Quarantined allowed');

const tQuarantineToActive = transitionGroupState(GROUP_STATUS.QUARANTINED, GROUP_STATUS.ACTIVE);
assert.strictEqual(tQuarantineToActive.state, GROUP_STATUS.ACTIVE, 'Quarantined -> Active controlled recovery allowed');

// Illegal transitions fail closed
assert.throws(() => {
    transitionGroupState(GROUP_STATUS.ACTIVE, GROUP_STATUS.SETTLED, { hasUnsettledBalances: true });
}, /CANNOT_SETTLE_WITH_BALANCES/, 'Cannot settle group with non-zero member balances');

assert.throws(() => {
    transitionGroupState(GROUP_STATUS.DRAFT, GROUP_STATUS.SETTLED);
}, /ILLEGAL_GROUP_TRANSITION/, 'Draft -> Settled directly is illegal');

assert.throws(() => {
    transitionGroupState(GROUP_STATUS.ARCHIVED, GROUP_STATUS.SETTLED);
}, /ILLEGAL_GROUP_TRANSITION/, 'Archived -> Settled directly is illegal');

assert.throws(() => {
    transitionGroupState(GROUP_STATUS.SETTLED, GROUP_STATUS.SETTLEMENT_PENDING);
}, /ILLEGAL_GROUP_TRANSITION/, 'Settled -> Settlement_Pending directly is illegal');
console.log('✓ Invariant 4: All 6 group lifecycle states and controlled transition rules verified');

// 5. Expense State Transitions
const et1 = transitionExpenseState(EXPENSE_STATUS.ACTIVE, EXPENSE_STATUS.VOIDED);
assert.strictEqual(et1.state, EXPENSE_STATUS.VOIDED, 'Active -> Voided allowed');

const et2 = transitionExpenseState(EXPENSE_STATUS.ACTIVE, EXPENSE_STATUS.REVERSED);
assert.strictEqual(et2.state, EXPENSE_STATUS.REVERSED, 'Active -> Reversed allowed');

assert.throws(() => {
    transitionExpenseState(EXPENSE_STATUS.VOIDED, EXPENSE_STATUS.ACTIVE);
}, /ILLEGAL_EXPENSE_TRANSITION/, 'Voided is terminal; cannot reactivate');
console.log('✓ Invariant 5: Expense non-destructive lifecycle state machine verified');

// 6. BigInt JSON Replacer & Reviver
const sampleData = { id: 'test_1', amount: 999999999999n, title: 'Test' };
const jsonStr = JSON.stringify(sampleData, bigIntReplacer);
assert.ok(jsonStr.includes('__bigint'), 'JSON string contains BigInt marker');
const revived = JSON.parse(jsonStr, bigIntReviver);
assert.strictEqual(revived.amount, 999999999999n, 'Revived amount must be exact BigInt');
console.log('✓ Invariant 6: BigInt serialization & deserialization verified');

// 7. Canonical JSON Stringify
const objA = { b: 2, a: 1, c: { z: 10, y: 20 } };
const objB = { a: 1, c: { y: 20, z: 10 }, b: 2 };
assert.strictEqual(canonicalJsonStringify(objA), canonicalJsonStringify(objB), 'Canonical JSON must be key-order invariant');
console.log('✓ Invariant 7: Deterministic canonical JSON verified');

console.log('✅ SC-01 PASSED: All 7 checks verified.');
