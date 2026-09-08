/**
 * tests/shared-costs/test_sc04_multi_payer_accounting.mjs
 * 
 * SC-04: Multi-Payer Accounting & Asymmetric Contribution Verification.
 */

import assert from 'assert';
import { SplitCalculator } from '../../services/shared-costs/splitCalculator.js';
import { GroupBalanceEngine } from '../../services/shared-costs/groupBalanceEngine.js';
import { toPaise } from '../../services/shared-costs/groupContracts.js';

console.log('--- [SC-04] Testing Multi-Payer Accounting & Non-Participating Payers ---');

// 1. Multi-Payer Validation
const validPayments = [
    { memberId: 'm_alice', amount: 600, paymentMethod: 'UPI' },
    { memberId: 'm_bob', amount: 400, paymentMethod: 'CASH' }
];
const validated = SplitCalculator.validatePayments(1000, validPayments);
assert.strictEqual(validated.length, 2);
assert.strictEqual(validated[0].amountPaise, 60000n);
assert.strictEqual(validated[1].amountPaise, 40000n);
console.log('✓ Invariant 1: Multi-payer payments sum validation passed');

// 2. Multi-Payer Sum Mismatch Rejection
const mismatchPayments = [
    { memberId: 'm_alice', amount: 600 },
    { memberId: 'm_bob', amount: 350 } // Total 950 vs 1000
];
assert.throws(() => {
    SplitCalculator.validatePayments(1000, mismatchPayments);
}, /PAYMENTS_SUM_MISMATCH/);
console.log('✓ Invariant 2: Under-paying multi-payer array fails closed');

// 3. Non-Participating Payer Scenario
// Alice pays ₹1,000 for a movie tickets package for Bob and Charlie (Alice does not attend).
// Group: Alice, Bob, Charlie
const groupMock = {
    id: 'grp_test_autopay',
    members: [
        { id: 'alice', displayNameSnapshot: 'Alice' },
        { id: 'bob', displayNameSnapshot: 'Bob' },
        { id: 'charlie', displayNameSnapshot: 'Charlie' }
    ]
};

const nonPartExpense = {
    id: 'exp_np_1',
    groupId: 'grp_test_autopay',
    totalAmountPaise: 100000n,
    payments: [
        { id: 'p1', memberId: 'alice', amountPaise: 100000n }
    ],
    // Only Bob and Charlie share
    shares: [
        { memberId: 'bob', amountPaise: 50000n },
        { memberId: 'charlie', amountPaise: 50000n }
    ]
};

const balances = GroupBalanceEngine.calculateGroupBalances(groupMock, [nonPartExpense], []);
const pMap = balances.projectionMap;

assert.strictEqual(pMap['alice'].totalPaidPaise, 100000n);
assert.strictEqual(pMap['alice'].totalOwedPaise, 0n);
assert.strictEqual(pMap['alice'].netBalancePaise, 100000n, 'Alice is owed ₹1000.00');

assert.strictEqual(pMap['bob'].totalPaidPaise, 0n);
assert.strictEqual(pMap['bob'].totalOwedPaise, 50000n);
assert.strictEqual(pMap['bob'].netBalancePaise, -50000n, 'Bob owes ₹500.00');

assert.strictEqual(pMap['charlie'].totalPaidPaise, 0n);
assert.strictEqual(pMap['charlie'].totalOwedPaise, 50000n);
assert.strictEqual(pMap['charlie'].netBalancePaise, -50000n, 'Charlie owes ₹500.00');

assert.strictEqual(balances.conservationVerified, true);
assert.strictEqual(pMap['alice'].netBalancePaise + pMap['bob'].netBalancePaise + pMap['charlie'].netBalancePaise, 0n);
console.log('✓ Invariant 3: Non-participating payer maintains zero-sum conservation');

// 4. Multiple Payers with Asymmetric Participation
// Expense: ₹3,000 Villa Booking
// Alice pays ₹2,000, Bob pays ₹1,000.
// Shared by Alice (₹1,000), Bob (₹1,000), Charlie (₹1,000).
const multiExpense = {
    id: 'exp_multi_1',
    groupId: 'grp_test_autopay',
    totalAmountPaise: 300000n,
    payments: [
        { id: 'p_a', memberId: 'alice', amountPaise: 200000n },
        { id: 'p_b', memberId: 'bob', amountPaise: 100000n }
    ],
    shares: [
        { memberId: 'alice', amountPaise: 100000n },
        { memberId: 'bob', amountPaise: 100000n },
        { memberId: 'charlie', amountPaise: 100000n }
    ]
};

const balancesMulti = GroupBalanceEngine.calculateGroupBalances(groupMock, [multiExpense], []);
const pMulti = balancesMulti.projectionMap;

assert.strictEqual(pMulti['alice'].netBalancePaise, 100000n, 'Alice net = 2000 - 1000 = +₹1,000');
assert.strictEqual(pMulti['bob'].netBalancePaise, 0n, 'Bob net = 1000 - 1000 = ₹0');
assert.strictEqual(pMulti['charlie'].netBalancePaise, -100000n, 'Charlie net = 0 - 1000 = -₹1,000');
assert.strictEqual(pMulti['alice'].netBalancePaise + pMulti['bob'].netBalancePaise + pMulti['charlie'].netBalancePaise, 0n);
console.log('✓ Invariant 4: Multi-payer asymmetric expense produces bit-for-bit accurate net balances');

console.log('✅ SC-04 PASSED: All 4 multi-payer checks verified.');
