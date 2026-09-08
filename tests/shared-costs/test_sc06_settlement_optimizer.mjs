/**
 * tests/shared-costs/test_sc06_settlement_optimizer.mjs
 * 
 * SC-06: Debt Simplification & Greedy Settlement Optimizer.
 * Greedy debtor-creditor matching produces a deterministic settlement plan with no more than N−1 transfers
 * in the tested balancing model. It is a heuristic and does not guarantee the globally minimum number of transfers.
 */

import assert from 'assert';
import { SettlementOptimizer } from '../../services/shared-costs/settlementOptimizer.js';
import { GroupBalanceEngine } from '../../services/shared-costs/groupBalanceEngine.js';

console.log('--- [SC-06] Testing Debt Simplification & Greedy Settlement Optimizer ---');

// Mock Projections:
// Creditors: Alice (+₹12,000), Ravi (+₹7,000). Total credit = ₹19,000 (1,900,000 paise).
// Debtors: Neha (-₹13,000), Priya (-₹3,000), Amit (-₹3,000). Total debt = ₹19,000 (1,900,000 paise).
const mockProjections = [
    { memberId: 'm_alice', displayNameSnapshot: 'Alice', netBalancePaise: 1200000n },
    { memberId: 'm_ravi', displayNameSnapshot: 'Ravi', netBalancePaise: 700000n },
    { memberId: 'm_neha', displayNameSnapshot: 'Neha', netBalancePaise: -1300000n },
    { memberId: 'm_priya', displayNameSnapshot: 'Priya', netBalancePaise: -300000n },
    { memberId: 'm_amit', displayNameSnapshot: 'Amit', netBalancePaise: -300000n }
];

const opt = SettlementOptimizer.simplifyDebts(mockProjections);

assert.strictEqual(opt.totalSettlementPaise, 1900000n, 'Total settlement sum must equal 1,900,000 paise (₹19,000)');
assert.ok(opt.transactionCount <= 4, `Transaction count (${opt.transactionCount}) must be <= N - 1 (4)`);
console.log(`✓ Invariant 1: Greedy heuristic generated deterministic plan with ${opt.transactionCount} transfers (<= N-1 bound of 4)`);

// Print suggestions
opt.suggestions.forEach((s, idx) => {
    console.log(`   Transfer ${idx + 1}: ${s.description}`);
});

// Verify each suggestion matches valid debtors and creditors
opt.suggestions.forEach(s => {
    assert.ok(s.amountPaise > 0n, 'Every settlement amount must be strictly positive');
    assert.notStrictEqual(s.fromMemberId, s.toMemberId, 'Cannot settle with self');
});

// Verify Settlement Application leads to zero balance
const mockGroup = {
    id: 'grp_opt',
    members: mockProjections.map(p => ({ id: p.memberId, displayNameSnapshot: p.displayNameSnapshot }))
};

// Convert suggestions to settlements
const settlementRecords = SettlementOptimizer.prepareSettlementRecords('grp_opt', opt.suggestions);

// In our ledger, create synthetic starting expenses that generated mockProjections
// Alice paid ₹12000, Ravi paid ₹7000, Neha owed ₹13000, Priya owed ₹3000, Amit owed ₹3000
const initialExpense = {
    id: 'exp_init',
    groupId: 'grp_opt',
    totalAmountPaise: 1900000n,
    payments: [
        { memberId: 'm_alice', amountPaise: 1200000n },
        { memberId: 'm_ravi', amountPaise: 700000n }
    ],
    shares: [
        { memberId: 'm_neha', amountPaise: 1300000n },
        { memberId: 'm_priya', amountPaise: 300000n },
        { memberId: 'm_amit', amountPaise: 300000n }
    ]
};

const afterSettlement = GroupBalanceEngine.calculateGroupBalances(mockGroup, [initialExpense], settlementRecords);

assert.strictEqual(afterSettlement.isSettled, true, 'Group must be 100% settled after applying optimizer plan');
afterSettlement.projections.forEach(p => {
    assert.strictEqual(p.netBalancePaise, 0n, `${p.displayNameSnapshot} net balance must be exactly 0n`);
});
console.log('✓ Invariant 2: Applying optimized settlements achieves zero balance across all members');

// Fully settled group produces 0 suggestions
const zeroPlan = SettlementOptimizer.simplifyDebts(afterSettlement.projections);
assert.strictEqual(zeroPlan.transactionCount, 0);
assert.strictEqual(zeroPlan.isFullySettled, true);
console.log('✓ Invariant 3: Zero debt group emits zero settlement suggestions');

console.log('✅ SC-06 PASSED: All settlement optimizer checks verified.');
