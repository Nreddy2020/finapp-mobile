/**
 * tests/shared-costs/test_sc03_split_exact_percentage_shares.mjs
 * 
 * SC-03: Split Calculations for Exact Amounts, Percentages, and Shares.
 */

import assert from 'assert';
import { SplitCalculator } from '../../services/shared-costs/splitCalculator.js';
import { toPaise } from '../../services/shared-costs/groupContracts.js';

console.log('--- [SC-03] Testing Exact, Percentage, and Shares Split Calculators ---');

// 1. EXACT AMOUNTS
const exactValid = [
    { memberId: 'm1', displayNameSnapshot: 'Alice', amount: 450.50 },
    { memberId: 'm2', displayNameSnapshot: 'Bob', amount: 350.25 },
    { memberId: 'm3', displayNameSnapshot: 'Charlie', amount: 199.25 }
];
// Total = 450.50 + 350.25 + 199.25 = 1000.00
const exactRes = SplitCalculator.splitExact(1000, exactValid);
assert.strictEqual(exactRes.totalAllocatedPaise, 100000n);
assert.strictEqual(exactRes.shares[0].amountPaise, 45050n);
assert.strictEqual(exactRes.shares[1].amountPaise, 35025n);
assert.strictEqual(exactRes.shares[2].amountPaise, 19925n);
console.log('✓ Invariant 1: Valid exact shares match total amount exactly');

// 1b. Exact Mismatch: Off by 1 paisa
const exactOff = [
    { memberId: 'm1', displayNameSnapshot: 'Alice', amount: 450.50 },
    { memberId: 'm2', displayNameSnapshot: 'Bob', amount: 350.25 },
    { memberId: 'm3', displayNameSnapshot: 'Charlie', amount: 199.24 } // Off by 1 paisa (999.99)
];
assert.throws(() => {
    SplitCalculator.splitExact(1000, exactOff);
}, /EXACT_SPLIT_MISMATCH/, 'Off by 1 paisa must throw EXACT_SPLIT_MISMATCH');
console.log('✓ Invariant 2: Penny-off exact split fails closed');

// 2. PERCENTAGES
// 2a. Simple percentages (50%, 30%, 20% on ₹1,234.56 = 123,456 paise)
const pctInput1 = [
    { memberId: 'm1', displayNameSnapshot: 'Alice', percentage: 50 },
    { memberId: 'm2', displayNameSnapshot: 'Bob', percentage: 30 },
    { memberId: 'm3', displayNameSnapshot: 'Charlie', percentage: 20 }
];
const pctRes1 = SplitCalculator.splitPercentage('1234.56', pctInput1);
assert.strictEqual(pctRes1.totalAllocatedPaise, 123456n);
const pctSum1 = pctRes1.shares.reduce((s, x) => s + x.amountPaise, 0n);
assert.strictEqual(pctSum1, 123456n, 'Sum of percentage shares equals totalPaise');
console.log('✓ Invariant 3: Clean percentage split sums to total amount');

// 2b. Percentages with rounding remainder: 33.33%, 33.33%, 33.34% on ₹1,000 (100,000 paise)
const pctInput2 = [
    { memberId: 'm1', displayNameSnapshot: 'Alice', percentageBps: 3333n },
    { memberId: 'm2', displayNameSnapshot: 'Bob', percentageBps: 3333n },
    { memberId: 'm3', displayNameSnapshot: 'Charlie', percentageBps: 3334n }
]; // Sum = 10,000 bps
const pctRes2 = SplitCalculator.splitPercentage(1000, pctInput2);
assert.strictEqual(pctRes2.totalAllocatedPaise, 100000n);
const pctSum2 = pctRes2.shares.reduce((s, x) => s + x.amountPaise, 0n);
assert.strictEqual(pctSum2, 100000n);
console.log('✓ Invariant 4: Fractional percentage remainder distribution verified');

// 2c. Invalid percentage sum (e.g. 99% or 101%)
const pctInvalid = [
    { memberId: 'm1', percentage: 50 },
    { memberId: 'm2', percentage: 40 } // Sum = 90%
];
assert.throws(() => {
    SplitCalculator.splitPercentage(100, pctInvalid);
}, /PERCENTAGE_SUM_INVALID/, 'Percentages not summing to 100% must throw');
console.log('✓ Invariant 5: Invalid percentage sum fails closed');

// 3. SHARES (Unit Weights)
// 3a. 2 shares, 1 share, 1 share on ₹1,000 (Total 4 units: ₹500, ₹250, ₹250)
const sharesInput1 = [
    { memberId: 'm1', displayNameSnapshot: 'Alice', shareUnits: 2 },
    { memberId: 'm2', displayNameSnapshot: 'Bob', shareUnits: 1 },
    { memberId: 'm3', displayNameSnapshot: 'Charlie', shareUnits: 1 }
];
const sharesRes1 = SplitCalculator.splitShares(1000, sharesInput1);
assert.strictEqual(sharesRes1.totalAllocatedPaise, 100000n);
assert.strictEqual(sharesRes1.shares.find(s => s.displayNameSnapshot === 'Alice').amountPaise, 50000n);
assert.strictEqual(sharesRes1.shares.find(s => s.displayNameSnapshot === 'Bob').amountPaise, 25000n);
assert.strictEqual(sharesRes1.shares.find(s => s.displayNameSnapshot === 'Charlie').amountPaise, 25000n);
console.log('✓ Invariant 6: Unit weights split allocates exact proportions');

// 3b. Unit weights with remainder (3, 3, 1 units on ₹100 = 10,000 paise / 7 units = 1,428 base + 4 remainder)
const sharesInput2 = [
    { memberId: 'm1', displayNameSnapshot: 'Alice', shareUnits: 3 },
    { memberId: 'm2', displayNameSnapshot: 'Bob', shareUnits: 3 },
    { memberId: 'm3', displayNameSnapshot: 'Charlie', shareUnits: 1 }
];
const sharesRes2 = SplitCalculator.splitShares(100, sharesInput2);
assert.strictEqual(sharesRes2.totalAllocatedPaise, 10000n);
const sharesSum2 = sharesRes2.shares.reduce((s, x) => s + x.amountPaise, 0n);
assert.strictEqual(sharesSum2, 10000n);
console.log('✓ Invariant 7: Unit weights split with remainders allocates deterministically');

// 3c. Zero total shares fails closed
assert.throws(() => {
    SplitCalculator.splitShares(100, [{ memberId: 'm1', shareUnits: 0 }]);
}, /ZERO_TOTAL_SHARES/);
console.log('✓ Invariant 8: Zero total shares rejected');

console.log('✅ SC-03 PASSED: All 8 checks verified.');
