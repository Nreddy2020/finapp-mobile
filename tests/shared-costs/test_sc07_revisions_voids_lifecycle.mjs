/**
 * tests/shared-costs/test_sc07_revisions_voids_lifecycle.mjs
 * 
 * SC-07: Non-Destructive Revisions, Voids, and Lifecycle Boundaries.
 */

import assert from 'assert';
import { GroupRepository } from '../../services/shared-costs/groupRepository.js';
import { GroupBalanceEngine } from '../../services/shared-costs/groupBalanceEngine.js';
import { GroupValidation } from '../../services/shared-costs/groupValidation.js';
import { EXPENSE_STATUS, toPaise } from '../../services/shared-costs/groupContracts.js';

console.log('--- [SC-07] Testing Non-Destructive Revisions, Voids & Lifecycle ---');

// Setup repository
await GroupRepository.clearStore();

// 1. Create Group
const group = await GroupRepository.createGroup({
    id: 'grp_lifecycle',
    name: 'Lifecycle Test Group',
    members: [
        { id: 'user1', displayNameSnapshot: 'User One' },
        { id: 'user2', displayNameSnapshot: 'User Two' }
    ]
});
assert.strictEqual(group.members.length, 2);
console.log('✓ Invariant 1: Group created');

// 2. Add Expense
const exp1 = await GroupRepository.addExpense('grp_lifecycle', {
    id: 'exp_life_1',
    title: 'Initial Expense',
    amount: 1000,
    payments: [{ memberId: 'user1', amountPaise: 100000n }],
    shares: [
        { memberId: 'user1', amountPaise: 50000n },
        { memberId: 'user2', amountPaise: 50000n }
    ]
});
assert.strictEqual(exp1.revision, 1);
assert.strictEqual(exp1.status, EXPENSE_STATUS.ACTIVE);
console.log('✓ Invariant 2: Expense added with revision 1');

// 3. Non-Destructive Edit
// User One updates the expense: amount changed from ₹1,000 to ₹1,200
const updatedExp = await GroupRepository.editExpense('grp_lifecycle', 'exp_life_1', {
    title: 'Updated Expense',
    amount: 1200,
    payments: [{ memberId: 'user1', amountPaise: 120000n }],
    shares: [
        { memberId: 'user1', amountPaise: 60000n },
        { memberId: 'user2', amountPaise: 60000n }
    ]
});

assert.strictEqual(updatedExp.revision, 2, 'Revision must increment to 2');
assert.strictEqual(updatedExp.previousRevisions.length, 1, 'Previous revision preserved in snapshot');
assert.strictEqual(updatedExp.previousRevisions[0].totalAmountPaise, 100000n, 'Original amount preserved');
assert.strictEqual(updatedExp.totalAmountPaise, 120000n, 'New amount is ₹1,200');

const groupWithEdit = await GroupRepository.getGroupById('grp_lifecycle');
assert.strictEqual(groupWithEdit.balanceResult.projectionMap['user1'].netBalancePaise, 60000n, 'User1 net is +₹600');
assert.strictEqual(groupWithEdit.balanceResult.projectionMap['user2'].netBalancePaise, -60000n, 'User2 net is -₹600');
console.log('✓ Invariant 3: Non-destructive revision increments counter and preserves prior snapshots');

// 4. Member Removal Boundary
// User Two owes ₹600. Attempting to remove User Two must FAIL.
await assert.rejects(async () => {
    await GroupRepository.removeMember('grp_lifecycle', 'user2');
}, /CANNOT_REMOVE_ACTIVE_MEMBER/, 'Cannot remove member with non-zero balance');
console.log('✓ Invariant 4: Member removal rejected while balance is non-zero');

// 5. Non-Destructive Voiding
const voidedExp = await GroupRepository.voidExpense('grp_lifecycle', 'exp_life_1', 'Entered by mistake');
assert.strictEqual(voidedExp.status, EXPENSE_STATUS.VOIDED);
assert.strictEqual(voidedExp.voidReason, 'Entered by mistake');

// After voiding, both balances must return to ₹0.00
const groupAfterVoid = await GroupRepository.getGroupById('grp_lifecycle');
assert.strictEqual(groupAfterVoid.balanceResult.projectionMap['user1'].netBalancePaise, 0n, 'User1 net reset to 0');
assert.strictEqual(groupAfterVoid.balanceResult.projectionMap['user2'].netBalancePaise, 0n, 'User2 net reset to 0');
assert.strictEqual(groupAfterVoid.balanceResult.isSettled, true);
console.log('✓ Invariant 5: Voiding expense immediately adjusts balances without deletion');

// 6. Member Removal Allowed After Settlement / Void
const removed = await GroupRepository.removeMember('grp_lifecycle', 'user2');
assert.strictEqual(removed, true, 'Member can now be removed once balance is zero');
const finalGroup = await GroupRepository.getGroupById('grp_lifecycle');
assert.strictEqual(finalGroup.members.find(m => m.id === 'user2').status, 'LEFT');
console.log('✓ Invariant 6: Member removal succeeds when net balance is zero');

// 7. Settled Groups Reject Ordinary Expenses
// Group is currently at zero balance, so transition to SETTLED succeeds
await GroupRepository.updateGroup('grp_lifecycle', { status: 'SETTLED' });
const settledGroup = await GroupRepository.getGroupById('grp_lifecycle');
assert.strictEqual(settledGroup.status, 'SETTLED');

await assert.rejects(async () => {
    await GroupRepository.addExpense('grp_lifecycle', {
        title: 'Late Expense',
        amount: 500,
        payments: [{ memberId: 'user1', amountPaise: 50000n }],
        shares: [{ memberId: 'user1', amountPaise: 50000n }]
    });
}, /CANNOT_ADD_EXPENSE_TO_SETTLED_GROUP/, 'Settled groups must reject ordinary expenses');
console.log('✓ Invariant 7: Settled groups reject ordinary expenses');

// 8. Reopening & Outstanding Balance Transition Prevention
// Direct generic updateGroup bypass must FAIL CLOSED
await assert.rejects(async () => {
    await GroupRepository.updateGroup('grp_lifecycle', { status: 'ACTIVE' });
}, /ILLEGAL_GENERIC_REOPEN/, 'Direct generic updateGroup bypass must be rejected');

// Missing reason must fail
await assert.rejects(async () => {
    await GroupRepository.reopenSettledGroup('grp_lifecycle', { reason: '' });
}, /REOPEN_REASON_REQUIRED/, 'Reopen settled requires explicit reason');

// Unauthorized role must fail
await assert.rejects(async () => {
    await GroupRepository.reopenSettledGroup('grp_lifecycle', { reason: 'Need to add expense', actorRole: 'VIEWER' });
}, /UNAUTHORIZED/, 'Viewer cannot reopen settled group');

// Authorized explicit administrative command succeeds
const initialRev = (await GroupRepository.getGroupById('grp_lifecycle')).revision || 1;
const reopenedGroup = await GroupRepository.reopenSettledGroup('grp_lifecycle', {
    reason: 'Need to record missed dinner expense',
    actor: 'admin_1',
    actorRole: 'ADMIN',
    idempotencyKey: 'reopen_settled_test_1'
});
assert.strictEqual(reopenedGroup.status, 'ACTIVE');
assert.strictEqual(reopenedGroup.revision, initialRev + 1, 'Revision increments on administrative reopening');

// Re-add user3 and insert an expense with non-zero balance
await GroupRepository.addMember('grp_lifecycle', { id: 'user3', displayNameSnapshot: 'User Three' });
await GroupRepository.addExpense('grp_lifecycle', {
    id: 'exp_unsettled',
    title: 'Unsettled Expense',
    amount: 1000,
    payments: [{ memberId: 'user1', amountPaise: 100000n }],
    shares: [
        { memberId: 'user1', amountPaise: 50000n },
        { memberId: 'user3', amountPaise: 50000n }
    ]
});

// Attempt to transition back to SETTLED with outstanding balance must fail
await assert.rejects(async () => {
    await GroupRepository.updateGroup('grp_lifecycle', { status: 'SETTLED' });
}, /CANNOT_SETTLE_WITH_BALANCES/, 'Groups with outstanding balances cannot transition to SETTLED');
console.log('✓ Invariant 8: Groups with outstanding balances cannot transition to settled; generic reopen blocked');

// 9. Archived Groups are Read-Only & Explicit Reopening Required
await GroupRepository.updateGroup('grp_lifecycle', { status: 'ARCHIVED' });
const archivedGroup = await GroupRepository.getGroupById('grp_lifecycle');
assert.strictEqual(archivedGroup.status, 'ARCHIVED');

// Ordinary mutations rejected while archived
await assert.rejects(async () => {
    await GroupRepository.updateGroup('grp_lifecycle', { name: 'New Name' });
}, /CANNOT_MUTATE_ARCHIVED_GROUP/, 'Archived group rejects metadata mutation');

await assert.rejects(async () => {
    await GroupRepository.addExpense('grp_lifecycle', {
        title: 'Archived Expense',
        amount: 200,
        payments: [{ memberId: 'user1', amountPaise: 20000n }],
        shares: [{ memberId: 'user1', amountPaise: 20000n }]
    });
}, /CANNOT_MUTATE_ARCHIVED_GROUP/, 'Archived group rejects new expenses');

// Generic updateGroup bypass rejected
await assert.rejects(async () => {
    await GroupRepository.updateGroup('grp_lifecycle', { status: 'ACTIVE' });
}, /ILLEGAL_GENERIC_REOPEN/, 'Generic updateGroup bypass rejected for archived group');

// Missing reason fails
await assert.rejects(async () => {
    await GroupRepository.reopenArchivedGroup('grp_lifecycle', { reason: '' });
}, /REOPEN_REASON_REQUIRED/);

// Unauthorized member fails
await assert.rejects(async () => {
    await GroupRepository.reopenArchivedGroup('grp_lifecycle', { reason: 'Reopen', actorRole: 'MEMBER' });
}, /UNAUTHORIZED/);

// Controlled administrative command succeeds
const revBeforeArchiveReopen = archivedGroup.revision || 1;
const unarchived = await GroupRepository.reopenArchivedGroup('grp_lifecycle', {
    reason: 'Authorized post-trip administrative adjustment',
    actor: 'owner_user',
    actorRole: 'OWNER',
    idempotencyKey: 'reopen_archive_test_1'
});
assert.strictEqual(unarchived.status, 'ACTIVE');
assert.strictEqual(unarchived.revision, revBeforeArchiveReopen + 1);
console.log('✓ Invariant 9: Archived groups are read-only; explicit administrative reopening verified');

// 10. Quarantined Groups Cannot Participate in Normal Calculations & Explicit Recovery Required
await GroupRepository.updateGroup('grp_lifecycle', { status: 'QUARANTINED' });
const quarantinedGroup = await GroupRepository.getGroupById('grp_lifecycle');
assert.strictEqual(quarantinedGroup.status, 'QUARANTINED');
assert.strictEqual(quarantinedGroup.balanceResult, null, 'Quarantined group balanceResult is null');

assert.throws(() => {
    GroupBalanceEngine.calculateGroupBalances(quarantinedGroup, [], []);
}, /QUARANTINED_GROUP_CALCULATION_REJECTED/, 'Quarantined group calculation fails closed');

const allGroups = await GroupRepository.getAllGroups();
const qg = allGroups.find(g => g.id === 'grp_lifecycle');
assert.strictEqual(qg.quarantined, true);
assert.strictEqual(qg.balanceSummary, null);

// Generic bypass rejected
await assert.rejects(async () => {
    await GroupRepository.updateGroup('grp_lifecycle', { status: 'ACTIVE' });
}, /ILLEGAL_GENERIC_REOPEN/, 'Generic updateGroup bypass rejected for quarantined group');

// Missing reason fails
await assert.rejects(async () => {
    await GroupRepository.recoverQuarantinedGroup('grp_lifecycle', { reason: '' });
}, /RECOVER_REASON_REQUIRED/);

// Controlled administrative recovery
const revBeforeRecover = quarantinedGroup.revision || 1;
const recovered = await GroupRepository.recoverQuarantinedGroup('grp_lifecycle', {
    reason: 'Forensic integrity check passed and envelope verified',
    actor: 'compliance_admin',
    actorRole: 'ADMIN',
    idempotencyKey: 'recover_quarantine_test_1'
});
assert.strictEqual(recovered.status, 'ACTIVE');
assert.strictEqual(recovered.revision, revBeforeRecover + 1);
console.log('✓ Invariant 10: Quarantined groups excluded from calculations; explicit administrative recovery verified');

// 11. Historical Settlement Preservation on Reopening & Revision
// Verifies that administrative reopening does not erase settlements, and revising
// an expense produces only the incremental difference rather than recreating prior debts.
const settleReopenGroup = await GroupRepository.createGroup({
    id: 'grp_settle_reopen',
    name: 'Settle Reopen Proof Group',
    members: [
        { id: 'm_ravi', displayNameSnapshot: 'Ravi' },
        { id: 'm_arun', displayNameSnapshot: 'Arun' }
    ]
});

// Expense 1: ₹1,000 paid by Ravi, split equally (₹500 each)
const origExpense = await GroupRepository.addExpense('grp_settle_reopen', {
    id: 'exp_orig_1000',
    title: 'Dinner',
    amount: 1000,
    payments: [{ memberId: 'm_ravi', amountPaise: 100000n }],
    shares: [
        { memberId: 'm_ravi', amountPaise: 50000n },
        { memberId: 'm_arun', amountPaise: 50000n }
    ]
});

// Settlement: Arun pays Ravi ₹500
const histSettlement = await GroupRepository.recordSettlement('grp_settle_reopen', {
    fromMemberId: 'm_arun',
    toMemberId: 'm_ravi',
    amount: 500
});

// Group reaches 0 balance and transitions to SETTLED
await GroupRepository.updateGroup('grp_settle_reopen', { status: 'SETTLED' });
const settledState = await GroupRepository.getGroupById('grp_settle_reopen');
assert.strictEqual(settledState.status, 'SETTLED');
assert.strictEqual(settledState.balanceResult.projectionMap['m_ravi'].netBalancePaise, 0n);
assert.strictEqual(settledState.balanceResult.projectionMap['m_arun'].netBalancePaise, 0n);

// Reopen group via administrative command
await GroupRepository.reopenSettledGroup('grp_settle_reopen', {
    reason: 'Bill updated by restaurant with additional charges',
    actor: 'm_ravi',
    actorRole: 'OWNER'
});
const reopenedState = await GroupRepository.getGroupById('grp_settle_reopen');
assert.strictEqual(reopenedState.status, 'ACTIVE');

// Non-destructively revise dinner from ₹1,000 to ₹1,400 (Ravi paid ₹1,400, each owes ₹700)
await GroupRepository.editExpense('grp_settle_reopen', 'exp_orig_1000', {
    title: 'Dinner (Revised)',
    amount: 1400,
    payments: [{ memberId: 'm_ravi', amountPaise: 140000n }],
    shares: [
        { memberId: 'm_ravi', amountPaise: 70000n },
        { memberId: 'm_arun', amountPaise: 70000n }
    ]
});

const revisedGroup = await GroupRepository.getGroupById('grp_settle_reopen');
const projRavi = revisedGroup.balanceResult.projectionMap['m_ravi'];
const projArun = revisedGroup.balanceResult.projectionMap['m_arun'];

// Verify historical settlement was NOT erased:
assert.strictEqual(projArun.settlementsPaidPaise, 50000n, 'Historical settlement of ₹500 preserved on debtor');
assert.strictEqual(projRavi.settlementsReceivedPaise, 50000n, 'Historical settlement of ₹500 preserved on creditor');

// Verify only the incremental difference of ₹200 (20,000 paise) is owed:
// Arun net: (0 - 70,000) + (50,000 - 0) = -20,000 paise (-₹200)
// Ravi net: (140,000 - 70,000) + (0 - 50,000) = +20,000 paise (+₹200)
assert.strictEqual(projArun.netBalancePaise, -20000n, 'Arun owes only the ₹200 difference, not original ₹500');
assert.strictEqual(projRavi.netBalancePaise, 20000n, 'Ravi is owed only the ₹200 difference');
assert.strictEqual(revisedGroup.balanceResult.conservationVerified, true, 'Conservation invariant holds');
console.log('✓ Invariant 11: Historical settlements preserved on reopening; only incremental difference affects balance');

console.log('✅ SC-07 PASSED: All revision, void, and lifecycle boundary checks verified.');
