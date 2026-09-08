/**
 * tests/shared-costs/test_sc05_balance_projections_conservation.mjs
 * 
 * SC-05: Group Balance Projections & Global Conservation Invariant.
 */

import assert from 'assert';
import { GroupBalanceEngine } from '../../services/shared-costs/groupBalanceEngine.js';
import { toPaise } from '../../services/shared-costs/groupContracts.js';

console.log('--- [SC-05] Testing Balance Projections & Conservation Invariant ---');

// Mock Group: 5 members
const goaTrip = {
    id: 'grp_goa',
    members: [
        { id: 'You', displayNameSnapshot: 'You' },
        { id: 'm_ravi', displayNameSnapshot: 'Ravi' },
        { id: 'm_priya', displayNameSnapshot: 'Priya' },
        { id: 'm_amit', displayNameSnapshot: 'Amit' },
        { id: 'm_neha', displayNameSnapshot: 'Neha' }
    ]
};

// Expense 1: Flight Tickets ₹25,000 paid by You, shared equally (₹5,000 each)
const exp1 = {
    id: 'exp1',
    groupId: 'grp_goa',
    totalAmountPaise: 2500000n,
    payments: [{ memberId: 'You', amountPaise: 2500000n }],
    shares: [
        { memberId: 'You', amountPaise: 500000n },
        { memberId: 'm_ravi', amountPaise: 500000n },
        { memberId: 'm_priya', amountPaise: 500000n },
        { memberId: 'm_amit', amountPaise: 500000n },
        { memberId: 'm_neha', amountPaise: 500000n }
    ]
};

// Expense 2: Villa ₹30,000 paid by Ravi, shared equally (₹6,000 each)
const exp2 = {
    id: 'exp2',
    groupId: 'grp_goa',
    totalAmountPaise: 3000000n,
    payments: [{ memberId: 'm_ravi', amountPaise: 3000000n }],
    shares: [
        { memberId: 'You', amountPaise: 600000n },
        { memberId: 'm_ravi', amountPaise: 600000n },
        { memberId: 'm_priya', amountPaise: 600000n },
        { memberId: 'm_amit', amountPaise: 600000n },
        { memberId: 'm_neha', amountPaise: 600000n }
    ]
};

// Expense 3: Dinner ₹10,000 paid by Priya, shared equally (₹2,000 each)
const exp3 = {
    id: 'exp3',
    groupId: 'grp_goa',
    totalAmountPaise: 1000000n,
    payments: [{ memberId: 'm_priya', amountPaise: 1000000n }],
    shares: [
        { memberId: 'You', amountPaise: 200000n },
        { memberId: 'm_ravi', amountPaise: 200000n },
        { memberId: 'm_priya', amountPaise: 200000n },
        { memberId: 'm_amit', amountPaise: 200000n },
        { memberId: 'm_neha', amountPaise: 200000n }
    ]
};

// Settlement: Amit pays Ravi ₹10,000
const s1 = {
    id: 'stl1',
    groupId: 'grp_goa',
    fromMemberId: 'm_amit',
    toMemberId: 'm_ravi',
    amountPaise: 1000000n,
    status: 'COMPLETED'
};

const res = GroupBalanceEngine.calculateGroupBalances(goaTrip, [exp1, exp2, exp3], [s1]);
const p = res.projectionMap;

// Expected balances before settlement:
// Total owed per person = 5000 + 6000 + 2000 = ₹13,000 (1,300,000 paise).
// You: Paid ₹25,000, Owed ₹13,000 -> Net = +₹12,000 (+1,200,000 paise)
// Ravi: Paid ₹30,000, Owed ₹13,000 -> Net before settlement = +₹17,000 (+1,700,000 paise)
// Priya: Paid ₹10,000, Owed ₹13,000 -> Net = -₹3,000 (-300,000 paise)
// Amit: Paid ₹0, Owed ₹13,000 -> Net before settlement = -₹13,000 (-1,300,000 paise)
// Neha: Paid ₹0, Owed ₹13,000 -> Net = -₹13,000 (-1,300,000 paise)
//
// Settlement: Amit paid Ravi ₹10,000 (+1,000,000 paise)
// Amit net becomes: -13,000 + 10,000 = -₹3,000 (-300,000 paise)
// Ravi net becomes: +17,000 - 10,000 = +₹7,000 (+700,000 paise)

assert.strictEqual(p['You'].netBalancePaise, 1200000n, 'You net balance must be +₹12,000');
assert.strictEqual(p['m_ravi'].netBalancePaise, 700000n, 'Ravi net balance must be +₹7,000');
assert.strictEqual(p['m_priya'].netBalancePaise, -300000n, 'Priya net balance must be -₹3,000');
assert.strictEqual(p['m_amit'].netBalancePaise, -300000n, 'Amit net balance must be -₹3,000');
assert.strictEqual(p['m_neha'].netBalancePaise, -1300000n, 'Neha net balance must be -₹13,000');

// Global Conservation Check
const netSum = p['You'].netBalancePaise + p['m_ravi'].netBalancePaise + p['m_priya'].netBalancePaise +
               p['m_amit'].netBalancePaise + p['m_neha'].netBalancePaise;
assert.strictEqual(netSum, 0n, 'Global net balance sum must equal 0 paise');
assert.strictEqual(res.conservationVerified, true);
console.log('✓ Invariant 1: Multi-expense and settlement balances match exact ledger expectations');

// Test Multi-Group Dashboard Aggregation
const mockGroup2 = {
    id: 'grp_home',
    members: [{ id: 'You' }, { id: 'm_flatmate' }]
};
const homeExpense = {
    id: 'hexp1',
    groupId: 'grp_home',
    totalAmountPaise: 400000n,
    payments: [{ memberId: 'm_flatmate', amountPaise: 400000n }],
    shares: [{ memberId: 'You', amountPaise: 200000n }, { memberId: 'm_flatmate', amountPaise: 200000n }]
};
const resHome = GroupBalanceEngine.calculateGroupBalances(mockGroup2, [homeExpense], []);

// In Goa, You are owed ₹12,000 (+1,200,000 paise).
// In Home, You owe ₹2,000 (-200,000 paise).
const dashboard = GroupBalanceEngine.aggregateUserDashboard('You', [res, resHome]);
assert.strictEqual(dashboard.youAreOwedPaise, 1200000n, 'Dashboard: You are owed ₹12,000');
assert.strictEqual(dashboard.youOwePaise, 200000n, 'Dashboard: You owe ₹2,000');
assert.strictEqual(dashboard.netBalancePaise, 1000000n, 'Dashboard: Total Net is +₹10,000');
assert.strictEqual(dashboard.activeGroupsCount, 2);
console.log('✓ Invariant 2: Multi-group dashboard aggregation verified');

// Invariant 3: Explicit Debtor & Creditor Settlement Sign Convention
// Formula: netBalance = (totalPaid - totalOwed) + (settlementsPaid - settlementsReceived)
// Positive = Creditor (is owed money); Negative = Debtor (owes money).
const signGroup = {
    id: 'grp_sign_test',
    members: [
        { id: 'm_ravi', displayNameSnapshot: 'Ravi' },
        { id: 'm_arun', displayNameSnapshot: 'Arun' }
    ]
};

// Initial expense: Ravi pays ₹1,000 (100,000 paise) split equally (₹500 / 50,000 paise each)
const signExpense = {
    id: 'exp_sign',
    groupId: 'grp_sign_test',
    totalAmountPaise: 100000n,
    payments: [{ memberId: 'm_ravi', amountPaise: 100000n }],
    shares: [
        { memberId: 'm_ravi', amountPaise: 50000n },
        { memberId: 'm_arun', amountPaise: 50000n }
    ]
};

// Before settlement:
// Ravi: totalPaid = 100,000, totalOwed = 50,000 -> net = +50,000 paise (Creditor)
// Arun: totalPaid = 0, totalOwed = 50,000 -> net = -50,000 paise (Debtor)
const preRes = GroupBalanceEngine.calculateGroupBalances(signGroup, [signExpense], []);
assert.strictEqual(preRes.projectionMap['m_ravi'].netBalancePaise, 50000n, 'Ravi is Creditor (+₹500)');
assert.strictEqual(preRes.projectionMap['m_arun'].netBalancePaise, -50000n, 'Arun is Debtor (-₹500)');
assert.strictEqual(preRes.isSettled, false);

// Settlement: Arun pays Ravi ₹500 (50,000 paise)
// Arun is fromMemberId (settlementsPaid = 50,000, settlementsReceived = 0)
//   netBalance = (0 - 50,000) + (50,000 - 0) = 0 paise
// Ravi is toMemberId (settlementsPaid = 0, settlementsReceived = 50,000)
//   netBalance = (100,000 - 50,000) + (0 - 50,000) = 0 paise
const signSettlement = {
    id: 'stl_sign',
    groupId: 'grp_sign_test',
    fromMemberId: 'm_arun',
    toMemberId: 'm_ravi',
    amountPaise: 50000n,
    status: 'COMPLETED'
};

const postRes = GroupBalanceEngine.calculateGroupBalances(signGroup, [signExpense], [signSettlement]);
assert.strictEqual(postRes.projectionMap['m_arun'].settlementsPaidPaise, 50000n);
assert.strictEqual(postRes.projectionMap['m_arun'].settlementsReceivedPaise, 0n);
assert.strictEqual(postRes.projectionMap['m_arun'].netBalancePaise, 0n, 'Debtor Arun transitions to exact 0 paise');

assert.strictEqual(postRes.projectionMap['m_ravi'].settlementsPaidPaise, 0n);
assert.strictEqual(postRes.projectionMap['m_ravi'].settlementsReceivedPaise, 50000n);
assert.strictEqual(postRes.projectionMap['m_ravi'].netBalancePaise, 0n, 'Creditor Ravi transitions to exact 0 paise');

assert.strictEqual(postRes.isSettled, true, 'Group is completely settled');
assert.strictEqual(postRes.conservationVerified, true, 'Zero-sum conservation invariant strictly verified');
console.log('✓ Invariant 3: Debtor and Creditor settlement sign convention verified to exact 0 paise');

console.log('✅ SC-05 PASSED: All balance projection and conservation checks verified.');
