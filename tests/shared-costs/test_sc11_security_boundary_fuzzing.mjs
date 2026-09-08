/**
 * tests/shared-costs/test_sc11_security_boundary_fuzzing.mjs
 * 
 * SC-11: Security Boundaries, Edge Cases & Fuzzing Resilience.
 */

import assert from 'assert';
import { GroupValidation } from '../../services/shared-costs/groupValidation.js';
import { SplitCalculator } from '../../services/shared-costs/splitCalculator.js';
import { toPaise, SHARED_COSTS_CONSTANTS } from '../../services/shared-costs/groupContracts.js';

console.log('--- [SC-11] Testing Security Boundaries & Fuzzing Resilience ---');

// 1. Amount Boundaries
assert.strictEqual(toPaise(0.01), 1n, 'Minimum allowed amount is 1 paisa (₹0.01)');
assert.strictEqual(toPaise('1000000000'), 100000000000n, 'Maximum allowed amount is ₹100 Crore');

// Negative Amount
assert.throws(() => toPaise(-0.01), /NEGATIVE_AMOUNT_REJECTED/);
assert.throws(() => toPaise('-500'), /NEGATIVE_AMOUNT_REJECTED/);

// Excessive Amount (> ₹100 Crore)
const hugeExpense = {
    title: 'Too big',
    amount: 1000000001, // > ₹100 Crore
    payments: [{ memberId: 'm1', amountPaise: 100000000100n }],
    shares: [{ memberId: 'm1', amountPaise: 100000000100n }]
};
assert.throws(() => GroupValidation.validateExpense(hugeExpense), /AMOUNT_EXCEEDS_CAP/);
console.log('✓ Invariant 1: Financial amount lower and upper boundaries enforced');

// 2. Member Boundaries & Malformed Member Records
const duplicateMemberGroup = {
    name: 'Duplicate Test',
    members: [
        { id: 'm1', displayNameSnapshot: 'User 1' },
        { id: 'm1', displayNameSnapshot: 'User 1 Clone' }
    ]
};
assert.throws(() => GroupValidation.validateGroup(duplicateMemberGroup), /DUPLICATE_MEMBER_ID/);

const emptyNameGroup = {
    name: '   ',
    members: [{ id: 'm1', displayNameSnapshot: 'User 1' }]
};
assert.throws(() => GroupValidation.validateGroup(emptyNameGroup), /INVALID_GROUP_NAME/);

const emptyMemberNameGroup = {
    name: 'Valid Name',
    members: [{ id: 'm1', displayNameSnapshot: '   ' }]
};
assert.throws(() => GroupValidation.validateGroup(emptyMemberNameGroup), /INVALID_MEMBER_NAME/);
console.log('✓ Invariant 2: Malformed groups and duplicate/empty member records rejected');

// 3. Self Settlement Rejection
const selfSettlement = {
    groupId: 'grp_1',
    fromMemberId: 'm_same',
    toMemberId: 'm_same',
    amount: 500
};
assert.throws(() => GroupValidation.validateSettlement(selfSettlement), /SELF_SETTLEMENT_REJECTED/);
console.log('✓ Invariant 3: Self-settlement attempts rejected');

// 4. Zero and Negative Settlement Amounts
assert.throws(() => GroupValidation.validateSettlement({
    groupId: 'grp_1',
    fromMemberId: 'm1',
    toMemberId: 'm2',
    amount: 0
}), /INVALID_SETTLEMENT_AMOUNT/);

assert.throws(() => GroupValidation.validateSettlement({
    groupId: 'grp_1',
    fromMemberId: 'm1',
    toMemberId: 'm2',
    amount: -100
}), /NEGATIVE_AMOUNT_REJECTED/);
console.log('✓ Invariant 4: Non-positive settlements fail closed');

// 5. Empty Member / Division by Zero Protection in SplitCalculator
assert.throws(() => SplitCalculator.splitEqual(100, []), /EMPTY_MEMBERS_LIST/);
assert.throws(() => SplitCalculator.splitExact(100, []), /EMPTY_SHARES_LIST/);
assert.throws(() => SplitCalculator.splitPercentage(100, []), /EMPTY_PERCENTAGES_LIST/);
assert.throws(() => SplitCalculator.splitShares(100, []), /EMPTY_SHARES_LIST/);
console.log('✓ Invariant 5: Split calculators protected against empty collections and zero divisions');

// 6. Extreme Fuzzing: Odd Paisa Prime Numbers Division
// ₹999.97 (99,997 paise - a prime number) split among 13 members
const primeAmountPaise = 99997n;
const members13 = Array.from({ length: 13 }, (_, i) => ({ id: `user_${i}`, displayNameSnapshot: `User ${i}` }));
const primeResult = SplitCalculator.splitEqual(999.97, members13);

assert.strictEqual(primeResult.totalAllocatedPaise, primeAmountPaise, 'Prime amount split sum must equal 99,997 paise');
const sumPrimeShares = primeResult.shares.reduce((acc, s) => acc + s.amountPaise, 0n);
assert.strictEqual(sumPrimeShares, primeAmountPaise, 'Exact sum equality verified for prime number');
console.log('✓ Invariant 6: Prime number division (99,997 paise across 13 members) retains penny-perfect conservation');

console.log('✅ SC-11 PASSED: All security boundary and fuzzing checks verified.');
