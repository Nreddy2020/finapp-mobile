/**
 * tests/shared-costs/test_sc02_split_equal_math.mjs
 * 
 * SC-02: Equal Split Mathematical Precision & Deterministic Remainder Distribution.
 */

import assert from 'assert';
import { SplitCalculator } from '../../services/shared-costs/splitCalculator.js';
import { toPaise } from '../../services/shared-costs/groupContracts.js';

console.log('--- [SC-02] Testing Equal Split Math & Deterministic Remainder ---');

// Case 1: ₹1,000 split across 3 members
// Total = 100,000 paise. 100,000 / 3 = 33,333 paise each, remainder = 1 paisa.
// First member receives 33,334 paise, other 2 receive 33,333 paise.
const members3 = [
    { id: 'm_ravi', displayNameSnapshot: 'Ravi' },
    { id: 'm_priya', displayNameSnapshot: 'Priya' },
    { id: 'm_amit', displayNameSnapshot: 'Amit' }
];

const result1 = SplitCalculator.splitEqual(1000, members3);

assert.strictEqual(result1.totalAllocatedPaise, 100000n, 'Sum of shares must be 100,000 paise');
assert.strictEqual(result1.remainderPaise, 1n, 'Remainder must be 1 paisa');
assert.ok(result1.disclosure.includes('Remainder of ₹0.01 allocated to Amit'), 'Amit (alphabetically first) receives remainder');

const sharesMap1 = {};
result1.shares.forEach(s => { sharesMap1[s.displayNameSnapshot] = s.amountPaise; });

assert.strictEqual(sharesMap1['Amit'], 33334n, 'Amit gets base + 1 = 33,334 paise');
assert.strictEqual(sharesMap1['Priya'], 33333n, 'Priya gets base = 33,333 paise');
assert.strictEqual(sharesMap1['Ravi'], 33333n, 'Ravi gets base = 33,333 paise');
assert.strictEqual(sharesMap1['Amit'] + sharesMap1['Priya'] + sharesMap1['Ravi'], 100000n, 'Sum equals ₹1000.00 exactly');
console.log('✓ Invariant 1: ₹1,000 / 3 equal split with 1 paisa remainder distribution verified');

// Case 2: ₹1,000 split across 7 members
// 100,000 / 7 = 14,285 base, remainder = 5 paise.
// First 5 members receive 14,286 paise; remaining 2 receive 14,285 paise.
const members7 = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(name => ({ id: `m_${name}`, displayNameSnapshot: name }));
const result7 = SplitCalculator.splitEqual(1000, members7);

assert.strictEqual(result7.totalAllocatedPaise, 100000n, 'Sum must equal 100,000 paise');
assert.strictEqual(result7.remainderPaise, 5n, 'Remainder must be 5 paise');

const shares7 = result7.shares;
const first5 = shares7.slice(0, 5);
const last2 = shares7.slice(5, 7);

first5.forEach(s => assert.strictEqual(s.amountPaise, 14286n, `${s.displayNameSnapshot} should get 14,286 paise`));
last2.forEach(s => assert.strictEqual(s.amountPaise, 14285n, `${s.displayNameSnapshot} should get 14,285 paise`));

const sum7 = shares7.reduce((sum, s) => sum + s.amountPaise, 0n);
assert.strictEqual(sum7, 100000n, 'Sum of 7 shares equals 100,000 paise');
console.log('✓ Invariant 2: ₹1,000 / 7 equal split with 5 paise remainder distribution verified');

// Case 3: Exactly divisible amounts (no remainder)
// ₹3,000 split across 3 members: 300,000 / 3 = 100,000 paise each, 0 remainder.
const resultNoRemainder = SplitCalculator.splitEqual(3000, members3);
assert.strictEqual(resultNoRemainder.remainderPaise, 0n, 'Remainder must be 0');
assert.strictEqual(resultNoRemainder.disclosure, null, 'No disclosure when remainder is 0');
resultNoRemainder.shares.forEach(s => assert.strictEqual(s.amountPaise, 100000n, 'Each gets 100,000 paise'));
console.log('✓ Invariant 3: Clean division produces 0 remainder and null disclosure');

// Case 4: Determinism & Order Independence
// Shuffled input should produce the exact same share allocations
const shuffledMembers3 = [
    { id: 'm_ravi', displayNameSnapshot: 'Ravi' },
    { id: 'm_amit', displayNameSnapshot: 'Amit' },
    { id: 'm_priya', displayNameSnapshot: 'Priya' }
];
const resultShuffled = SplitCalculator.splitEqual(1000, shuffledMembers3);
const shuffledSharesMap = {};
resultShuffled.shares.forEach(s => { shuffledSharesMap[s.displayNameSnapshot] = s.amountPaise; });

assert.deepStrictEqual(sharesMap1, shuffledSharesMap, 'Allocations must be deterministic regardless of input ordering');
console.log('✓ Invariant 4: Allocation determinism verified across array permutations');

// Case 5: Single Member Group (100% to single person)
const singleMember = [{ id: 'm_you', displayNameSnapshot: 'You' }];
const resultSingle = SplitCalculator.splitEqual(250.75, singleMember);
assert.strictEqual(resultSingle.shares[0].amountPaise, 25075n, 'Single member takes 100% of expense');
assert.strictEqual(resultSingle.totalAllocatedPaise, 25075n);
console.log('✓ Invariant 5: Single member allocation verified');

console.log('✅ SC-02 PASSED: All 5 equal split checks verified.');
