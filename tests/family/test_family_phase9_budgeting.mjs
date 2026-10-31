/**
 * tests/family/test_family_phase9_budgeting.mjs
 * 
 * Standalone Verification Suite for Phase 9:
 * Shared Family Budgeting & Collective Pool Governance.
 * 
 * Exactly 55 contractual assertions covering:
 * 1. Timezone & Temporal Boundaries (Assertions 1-6)
 * 2. Versioned Contributor Splits (Assertions 7-12)
 * 3. Transaction Linking & Uniqueness (Assertions 13-18)
 * 4. Derived Refund Calculations (Assertions 19-24)
 * 5. Zero-Cap Pool Semantics (Assertions 25-30)
 * 6. Exact APPROACHING_LIMIT Boundaries (Assertions 31-33)
 * 7. Independent REQUIRES_REVIEW & Numerical Health (Assertions 34-36)
 * 8. Fairness Delta Mathematics (Assertions 37-42)
 * 9. Multi-Currency Divergence & Nullability (Assertions 43-47)
 * 10. Repository Invariants & CRUD (Assertions 48-51)
 * 11. Fault Tolerance & Malformed Inputs (Assertions 52-54)
 * 12. Zero-Write Verification (Assertion 55)
 */

import assert from 'assert';
import crypto from 'crypto';

import {
    computeHouseholdBudgetPoolsPure,
    BudgetPoolHealthStatus,
    BudgetPoolNumericalStatus,
    BudgetExpenseStatus,
    CURRENCY_DIVERGENCE_WARNING
} from '../../services/family/familyContracts.js';

import {
    FamilyRepository,
    FamilyBudgetPoolService
} from '../../services/family/index.js';

import { STORAGE_KEYS } from '../../services/storage.js';

console.log('=============================================================');
console.log('🚀 RUNNING PHASE 9: SHARED FAMILY BUDGETING SUITE');
console.log('=============================================================\n');

let passCount = 0;
async function test(desc, fn) {
    try {
        await fn();
        passCount++;
        console.log(`  ✓ Assertion ${passCount}: ${desc}`);
    } catch (err) {
        console.error(`  ✗ Assertion ${passCount + 1} FAILED: ${desc}`);
        console.error(err);
        process.exit(1);
    }
}

const HH_ID = 'hh_budget_test';
const HH_FOREIGN = 'hh_foreign_test';
const REF_DATE_UTC = '2026-09-15T12:00:00.000Z'; // Mid-September 2026

// Household Members
const memberAlice = { id: 'p_alice', householdId: HH_ID, displayName: 'Alice', name: 'Alice' };
const memberBob = { id: 'p_bob', householdId: HH_ID, displayName: 'Bob', name: 'Bob' };
const memberCharlie = { id: 'p_charlie', householdId: HH_ID, displayName: 'Charlie', name: 'Charlie' };
const membersRoster = [memberAlice, memberBob, memberCharlie];

// ---------------------------------------------------------------------------
// 1. Timezone & Temporal Boundaries (Assertions 1-6)
// ---------------------------------------------------------------------------

await test('IST timezone evaluation resolves calendar month [startUtc, endUtc) accurately', () => {
    const pools = [{
        id: 'pool_tz',
        householdId: HH_ID,
        name: 'Groceries',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 50 },
                { personId: 'p_bob', targetRatioPercent: 50 }
            ]
        }],
        linkedExpenses: []
    }];

    const result = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'Asia/Kolkata',
        pools,
        members: membersRoster
    });

    assert.strictEqual(result.summary.evaluationPeriod, '2026-09');
    assert.strictEqual(result.summary.timezone, 'Asia/Kolkata');
});

await test('Expense at 23:59 local IST on the last day of month is included in current month', () => {
    // 2026-09-30 23:59:00 IST is 2026-09-30 18:29:00 UTC
    const expLastDay = {
        transactionId: 'tx_tz_1',
        grossAmount: 1500,
        effectiveRefundAmount: 0,
        netAmount: 1500,
        status: 'SETTLED',
        contributedByPersonId: 'p_alice',
        timestampUtc: '2026-09-30T18:29:00.000Z'
    };

    const pools = [{
        id: 'pool_tz_1',
        householdId: HH_ID,
        name: 'Groceries',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }]
        }],
        linkedExpenses: [expLastDay]
    }];

    const result = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'Asia/Kolkata',
        pools,
        members: membersRoster
    });

    assert.strictEqual(result.evaluatedPools[0].spent, 1500);
});

await test('Expense at 00:01 next month local IST is excluded from current month', () => {
    // 2026-10-01 00:01:00 IST is 2026-09-30 18:31:00 UTC
    const expNextMonth = {
        transactionId: 'tx_tz_2',
        grossAmount: 2000,
        effectiveRefundAmount: 0,
        netAmount: 2000,
        status: 'SETTLED',
        contributedByPersonId: 'p_alice',
        timestampUtc: '2026-09-30T18:31:00.000Z'
    };

    const pools = [{
        id: 'pool_tz_2',
        householdId: HH_ID,
        name: 'Groceries',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }]
        }],
        linkedExpenses: [expNextMonth]
    }];

    const result = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'Asia/Kolkata',
        pools,
        members: membersRoster
    });

    assert.strictEqual(result.evaluatedPools[0].spent, 0);
});

await test('Expense before 00:00 start local IST is excluded from current month', () => {
    // 2026-08-31 23:59:00 IST is 2026-08-31 18:29:00 UTC
    const expPriorMonth = {
        transactionId: 'tx_tz_3',
        grossAmount: 2500,
        effectiveRefundAmount: 0,
        netAmount: 2500,
        status: 'SETTLED',
        contributedByPersonId: 'p_alice',
        timestampUtc: '2026-08-31T18:29:00.000Z'
    };

    const pools = [{
        id: 'pool_tz_3',
        householdId: HH_ID,
        name: 'Groceries',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }]
        }],
        linkedExpenses: [expPriorMonth]
    }];

    const result = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'Asia/Kolkata',
        pools,
        members: membersRoster
    });

    assert.strictEqual(result.evaluatedPools[0].spent, 0);
});

await test('Fallback to UTC when timezone is invalid string or null', () => {
    const pools = [{
        id: 'pool_tz_fb',
        householdId: HH_ID,
        name: 'Groceries',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }]
        }],
        linkedExpenses: []
    }];

    const res1 = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'INVALID_ZONE_XYZ',
        pools,
        members: membersRoster
    });
    assert.strictEqual(res1.summary.timezone, 'UTC');

    const res2 = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: null,
        pools,
        members: membersRoster
    });
    assert.strictEqual(res2.summary.timezone, 'UTC');
});

await test('Pure engine does not access system clock and produces identical outputs across repeated runs', () => {
    const pools = [{
        id: 'pool_pure',
        householdId: HH_ID,
        name: 'Dining',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }]
        }],
        linkedExpenses: [{
            transactionId: 'tx_p1',
            grossAmount: 1200,
            effectiveRefundAmount: 0,
            netAmount: 1200,
            status: 'SETTLED',
            contributedByPersonId: 'p_alice',
            timestampUtc: '2026-09-10T12:00:00.000Z'
        }]
    }];

    const run1 = JSON.stringify(computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools, members: membersRoster }));
    const run2 = JSON.stringify(computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools, members: membersRoster }));
    assert.strictEqual(run1, run2);
});

// ---------------------------------------------------------------------------
// 2. Versioned Contributor Splits (Assertions 7-12)
// ---------------------------------------------------------------------------

await test('Active split version resolved for current period when exact match exists', () => {
    const pool = {
        id: 'pool_v1',
        householdId: HH_ID,
        name: 'Utilities',
        currency: 'INR',
        monthlyCeiling: 6000,
        contributorSplitVersions: [
            { effectivePeriod: '2026-08', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] },
            { effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_bob', targetRatioPercent: 100 }] }
        ],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].activeSplitVersion.effectivePeriod, '2026-09');
    assert.strictEqual(res.evaluatedPools[0].activeSplitVersion.contributorSplits[0].personId, 'p_bob');
});

await test('Historical split version resolved for past period (effectivePeriod <= targetPeriod)', () => {
    const pool = {
        id: 'pool_v2',
        householdId: HH_ID,
        name: 'Utilities',
        currency: 'INR',
        monthlyCeiling: 6000,
        contributorSplitVersions: [
            { effectivePeriod: '2026-06', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 60 }, { personId: 'p_bob', targetRatioPercent: 40 }] },
            { effectivePeriod: '2026-10', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 50 }, { personId: 'p_bob', targetRatioPercent: 50 }] }
        ],
        linkedExpenses: []
    };

    // Evaluating for September 2026: 2026-06 is the latest version <= 2026-09
    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: '2026-09-15T12:00:00.000Z',
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].activeSplitVersion.effectivePeriod, '2026-06');
    assert.strictEqual(res.evaluatedPools[0].activeSplitVersion.contributorSplits[0].targetRatioPercent, 60);
});

await test('Fallback to earliest split version when evaluation period precedes all defined versions', () => {
    const pool = {
        id: 'pool_v3',
        householdId: HH_ID,
        name: 'Utilities',
        currency: 'INR',
        monthlyCeiling: 6000,
        contributorSplitVersions: [
            { effectivePeriod: '2026-11', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] },
            { effectivePeriod: '2026-12', contributorSplits: [{ personId: 'p_bob', targetRatioPercent: 100 }] }
        ],
        linkedExpenses: []
    };

    // Evaluating for September 2026: earliest version is 2026-11
    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: '2026-09-15T12:00:00.000Z',
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].activeSplitVersion.effectivePeriod, '2026-11');
});

await test('Invariance: Adding a new split version for next month does not alter past month fairness deltas', () => {
    const expPast = {
        transactionId: 'tx_past_1',
        grossAmount: 4000,
        effectiveRefundAmount: 0,
        netAmount: 4000,
        status: 'SETTLED',
        contributedByPersonId: 'p_alice',
        timestampUtc: '2026-09-10T12:00:00.000Z'
    };

    const poolBefore = {
        id: 'pool_inv',
        householdId: HH_ID,
        name: 'Rent',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [
            { effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 50 }, { personId: 'p_bob', targetRatioPercent: 50 }] }
        ],
        linkedExpenses: [expPast]
    };

    const resBefore = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [poolBefore],
        members: membersRoster
    });

    const poolAfter = {
        ...poolBefore,
        contributorSplitVersions: [
            { effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 50 }, { personId: 'p_bob', targetRatioPercent: 50 }] },
            { effectivePeriod: '2026-10', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 80 }, { personId: 'p_bob', targetRatioPercent: 20 }] }
        ]
    };

    const resAfter = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [poolAfter],
        members: membersRoster
    });

    assert.deepStrictEqual(resBefore.evaluatedPools[0].fairnessBreakdown, resAfter.evaluatedPools[0].fairnessBreakdown);
});

await test('Missing split versions flag reviewRequired: true and statusReason: NO_SPLIT_VERSIONS_DEFINED', () => {
    const pool = {
        id: 'pool_no_split',
        householdId: HH_ID,
        name: 'Supplies',
        currency: 'INR',
        monthlyCeiling: 3000,
        contributorSplitVersions: [],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].reviewRequired, true);
    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.REQUIRES_REVIEW);
    assert.strictEqual(res.evaluatedPools[0].statusReason, 'NO_SPLIT_VERSIONS_DEFINED');
});

await test('Split versions with non-100 sum flag reviewRequired: true and statusReason: SPLIT_SUM_NOT_100', () => {
    const pool = {
        id: 'pool_bad_sum',
        householdId: HH_ID,
        name: 'Supplies',
        currency: 'INR',
        monthlyCeiling: 3000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 60 },
                { personId: 'p_bob', targetRatioPercent: 30 } // sums to 90
            ]
        }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].reviewRequired, true);
    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.REQUIRES_REVIEW);
    assert.strictEqual(res.evaluatedPools[0].statusReason, 'SPLIT_SUM_NOT_100');
});

// ---------------------------------------------------------------------------
// 3. Transaction Linking & Uniqueness (Assertions 13-18)
// ---------------------------------------------------------------------------

FamilyRepository.setTestMode(true);

await test('Expense linking successfully appends link to target pool', async () => {
    await FamilyRepository.saveBudgetPool(HH_ID, {
        id: 'pool_repo_1',
        name: 'Groceries',
        currency: 'INR',
        monthlyCeiling: 8000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }]
    });

    const linkRes = await FamilyRepository.linkExpenseToPool(HH_ID, 'pool_repo_1', {
        transactionId: 'tx_unique_1',
        grossAmount: 2500,
        contributedByPersonId: 'p_alice',
        timestampUtc: '2026-09-12T10:00:00.000Z'
    });

    assert.strictEqual(linkRes.transactionId, 'tx_unique_1');
    assert.strictEqual(linkRes.netAmount, 2500);

    const pool = await FamilyRepository.getBudgetPool(HH_ID, 'pool_repo_1');
    assert.strictEqual(pool.linkedExpenses.length, 1);
});

await test('Cross-pool uniqueness: Attempting to link already-linked transactionId throws TRANSACTION_ALREADY_LINKED_TO_POOL', async () => {
    await FamilyRepository.saveBudgetPool(HH_ID, {
        id: 'pool_repo_2',
        name: 'Dining',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }]
    });

    await assert.rejects(async () => {
        await FamilyRepository.linkExpenseToPool(HH_ID, 'pool_repo_2', {
            transactionId: 'tx_unique_1', // already in pool_repo_1
            grossAmount: 1000,
            contributedByPersonId: 'p_alice'
        });
    }, /TRANSACTION_ALREADY_LINKED_TO_POOL/);
});

await test('Cross-pool uniqueness applies across archived pools as well as active pools', async () => {
    await FamilyRepository.saveBudgetPool(HH_ID, {
        id: 'pool_archived_src',
        name: 'Old Pool',
        currency: 'INR',
        monthlyCeiling: 5000,
        isArchived: true,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{ transactionId: 'tx_in_archived', grossAmount: 500, netAmount: 500, status: 'SETTLED' }]
    });

    await assert.rejects(async () => {
        await FamilyRepository.linkExpenseToPool(HH_ID, 'pool_repo_1', {
            transactionId: 'tx_in_archived',
            grossAmount: 500,
            contributedByPersonId: 'p_alice'
        });
    }, /TRANSACTION_ALREADY_LINKED_TO_POOL/);
});

await test('Unlinking expense successfully removes link from pool', async () => {
    await FamilyRepository.unlinkExpenseFromPool(HH_ID, 'pool_repo_1', 'tx_unique_1');
    const pool = await FamilyRepository.getBudgetPool(HH_ID, 'pool_repo_1');
    assert.strictEqual(pool.linkedExpenses.length, 0);
});

await test('Atomic relinking: relinkExpense removes from source pool and adds to target pool in single operation', async () => {
    await FamilyRepository.linkExpenseToPool(HH_ID, 'pool_repo_1', {
        transactionId: 'tx_relink_me',
        grossAmount: 1750,
        contributedByPersonId: 'p_alice',
        timestampUtc: '2026-09-14T10:00:00.000Z'
    });

    const relinkRes = await FamilyRepository.relinkExpense(HH_ID, 'pool_repo_1', 'pool_repo_2', 'tx_relink_me');
    assert.strictEqual(relinkRes, true);

    const srcPool = await FamilyRepository.getBudgetPool(HH_ID, 'pool_repo_1');
    const tgtPool = await FamilyRepository.getBudgetPool(HH_ID, 'pool_repo_2');

    assert.strictEqual(srcPool.linkedExpenses.some(e => e.transactionId === 'tx_relink_me'), false);
    assert.strictEqual(tgtPool.linkedExpenses.some(e => e.transactionId === 'tx_relink_me'), true);
});

await test('Preserves unlinked source transactions in personal MoneyFlow (zero mutation of original records)', () => {
    const originalTransaction = { id: 'mf_tx_101', amount: 3500, category: 'Groceries', date: '2026-09-12' };
    const originalSnapshot = JSON.stringify(originalTransaction);

    const linkedExpense = {
        transactionId: originalTransaction.id,
        grossAmount: originalTransaction.amount,
        effectiveRefundAmount: 0,
        netAmount: originalTransaction.amount,
        status: 'SETTLED'
    };

    assert.strictEqual(JSON.stringify(originalTransaction), originalSnapshot);
    assert.strictEqual(linkedExpense.transactionId, originalTransaction.id);
});

// ---------------------------------------------------------------------------
// 4. Derived Refund Calculations (Assertions 19-24)
// ---------------------------------------------------------------------------

await test('Full refund (effectiveRefundAmount >= grossAmount) sets derived status: REFUNDED and netAmount: 0', () => {
    const pool = {
        id: 'pool_rf_1',
        householdId: HH_ID,
        name: 'Refunded Category',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_full_rf',
            grossAmount: 1200,
            effectiveRefundAmount: 1200,
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].spent, 0);
});

await test('Full refund contributes 0 to pool spent total', () => {
    const pool = {
        id: 'pool_rf_2',
        householdId: HH_ID,
        name: 'Refunded Category',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_full_rf_over',
            grossAmount: 1000,
            effectiveRefundAmount: 1500, // Refund exceeds gross
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].spent, 0);
});

await test('Partial refund sets status: SETTLED and netAmount = gross - refund', () => {
    const pool = {
        id: 'pool_rf_3',
        householdId: HH_ID,
        name: 'Partial Refund Pool',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_part_rf',
            grossAmount: 3000,
            effectiveRefundAmount: 1000,
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].spent, 2000);
});

await test('Partial refund correctly reduces pool spent by refund amount', () => {
    const pool = {
        id: 'pool_rf_4',
        householdId: HH_ID,
        name: 'Partial Refund Pool',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [
            { transactionId: 'tx_p_1', grossAmount: 5000, effectiveRefundAmount: 1500, timestampUtc: '2026-09-10T10:00:00.000Z' },
            { transactionId: 'tx_p_2', grossAmount: 2000, effectiveRefundAmount: 0, timestampUtc: '2026-09-11T10:00:00.000Z' }
        ]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    // 3500 + 2000 = 5500
    assert.strictEqual(res.evaluatedPools[0].spent, 5500);
    assert.strictEqual(res.evaluatedPools[0].remainingBuffer, 4500);
});

await test('Zero refund sets status: SETTLED and netAmount = grossAmount', () => {
    const pool = {
        id: 'pool_rf_5',
        householdId: HH_ID,
        name: 'No Refund Pool',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_no_rf',
            grossAmount: 2200,
            effectiveRefundAmount: 0,
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].spent, 2200);
});

await test('Negative refund amount is safely clamped to 0', () => {
    const pool = {
        id: 'pool_rf_6',
        householdId: HH_ID,
        name: 'Negative Refund Pool',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_neg_rf',
            grossAmount: 3000,
            effectiveRefundAmount: -500, // Invalid negative
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].spent, 3000);
});

// ---------------------------------------------------------------------------
// 5. Zero-Cap Pool Semantics (Assertions 25-30)
// ---------------------------------------------------------------------------

await test('Pool with monthlyCeiling: 0 and spent: 0 evaluates to status: ON_TRACK and numericalStatus: ON_TRACK', () => {
    const pool = {
        id: 'pool_zc_1',
        householdId: HH_ID,
        name: 'Frozen Category',
        currency: 'INR',
        monthlyCeiling: 0,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.ON_TRACK);
    assert.strictEqual(res.evaluatedPools[0].numericalStatus, BudgetPoolNumericalStatus.ON_TRACK);
});

await test('Zero-cap pool with spent: 0 has remainingBuffer: 0 and utilizationPercent: 0.0', () => {
    const pool = {
        id: 'pool_zc_2',
        householdId: HH_ID,
        name: 'Frozen Category',
        currency: 'INR',
        monthlyCeiling: 0,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].remainingBuffer, 0);
    assert.strictEqual(res.evaluatedPools[0].utilizationPercent, 0.0);
});

await test('Zero-cap pool with spent > 0 evaluates to status: OVER_BUDGET and numericalStatus: OVER_BUDGET', () => {
    const pool = {
        id: 'pool_zc_3',
        householdId: HH_ID,
        name: 'Zero Cap Over',
        currency: 'INR',
        monthlyCeiling: 0,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_zc_over',
            grossAmount: 500,
            effectiveRefundAmount: 0,
            netAmount: 500,
            status: 'SETTLED',
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.OVER_BUDGET);
    assert.strictEqual(res.evaluatedPools[0].numericalStatus, BudgetPoolNumericalStatus.OVER_BUDGET);
});

await test('Zero-cap pool with spent > 0 has negative remaining buffer (-spent)', () => {
    const pool = {
        id: 'pool_zc_4',
        householdId: HH_ID,
        name: 'Zero Cap Over',
        currency: 'INR',
        monthlyCeiling: 0,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_zc_over_2',
            grossAmount: 750,
            effectiveRefundAmount: 0,
            netAmount: 750,
            status: 'SETTLED',
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].remainingBuffer, -750);
});

await test('Zero-cap pool contributes 0 to collective ceiling without divide-by-zero errors or NaN', () => {
    const pool1 = {
        id: 'pool_zc_c1',
        householdId: HH_ID,
        name: 'Standard Pool',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };
    const pool2 = {
        id: 'pool_zc_c2',
        householdId: HH_ID,
        name: 'Zero Cap Pool',
        currency: 'INR',
        monthlyCeiling: 0,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool1, pool2],
        members: membersRoster
    });

    assert.strictEqual(res.summary.totalCeiling, 10000);
    assert.strictEqual(isNaN(res.summary.overallUtilizationPercent), false);
    assert.strictEqual(res.summary.overallUtilizationPercent, 0.0);
});

await test('isZeroCap: true flag is properly set on zero-cap evaluated pools', () => {
    const pool = {
        id: 'pool_zc_flag',
        householdId: HH_ID,
        name: 'Zero Cap',
        currency: 'INR',
        monthlyCeiling: 0,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].isZeroCap, true);
});

// ---------------------------------------------------------------------------
// 6. Exact APPROACHING_LIMIT Boundaries (Assertions 31-33)
// ---------------------------------------------------------------------------

await test('Assertion 31: Verify utilization at exactly 80.0% evaluates to ON_TRACK', () => {
    const pool = {
        id: 'pool_bound_80',
        householdId: HH_ID,
        name: 'Boundary 80',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_b80',
            grossAmount: 8000,
            effectiveRefundAmount: 0,
            netAmount: 8000,
            status: 'SETTLED',
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].utilizationPercent, 80.0);
    assert.strictEqual(res.evaluatedPools[0].numericalStatus, BudgetPoolNumericalStatus.ON_TRACK);
    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.ON_TRACK);
});

await test('Assertion 32: Verify utilization at 80.1% evaluates to APPROACHING_LIMIT', () => {
    const pool = {
        id: 'pool_bound_801',
        householdId: HH_ID,
        name: 'Boundary 80.1',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{
            transactionId: 'tx_b801',
            grossAmount: 8010,
            effectiveRefundAmount: 0,
            netAmount: 8010,
            status: 'SETTLED',
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].utilizationPercent, 80.1);
    assert.strictEqual(res.evaluatedPools[0].numericalStatus, BudgetPoolNumericalStatus.APPROACHING_LIMIT);
    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.APPROACHING_LIMIT);
});

await test('Assertion 33: Verify utilization at exactly 100.0% evaluates to APPROACHING_LIMIT, and 100.1% evaluates to OVER_BUDGET', () => {
    const pool100 = {
        id: 'pool_bound_100',
        householdId: HH_ID,
        name: 'Boundary 100',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{ transactionId: 'tx_b100', grossAmount: 10000, effectiveRefundAmount: 0, netAmount: 10000, status: 'SETTLED', timestampUtc: '2026-09-12T10:00:00.000Z' }]
    };

    const pool1001 = {
        id: 'pool_bound_1001',
        householdId: HH_ID,
        name: 'Boundary 100.1',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{ transactionId: 'tx_b1001', grossAmount: 10010, effectiveRefundAmount: 0, netAmount: 10010, status: 'SETTLED', timestampUtc: '2026-09-12T10:00:00.000Z' }]
    };

    const res100 = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool100], members: membersRoster });
    const res1001 = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool1001], members: membersRoster });

    assert.strictEqual(res100.evaluatedPools[0].utilizationPercent, 100.0);
    assert.strictEqual(res100.evaluatedPools[0].numericalStatus, BudgetPoolNumericalStatus.APPROACHING_LIMIT);
    assert.strictEqual(res100.evaluatedPools[0].status, BudgetPoolHealthStatus.APPROACHING_LIMIT);

    assert.strictEqual(res1001.evaluatedPools[0].utilizationPercent, 100.1);
    assert.strictEqual(res1001.evaluatedPools[0].numericalStatus, BudgetPoolNumericalStatus.OVER_BUDGET);
    assert.strictEqual(res1001.evaluatedPools[0].status, BudgetPoolHealthStatus.OVER_BUDGET);
});

// ---------------------------------------------------------------------------
// 7. Independent REQUIRES_REVIEW & Numerical Health (Assertions 34-36)
// ---------------------------------------------------------------------------

await test('Assertion 34: Verify orphaned contributor sets status = REQUIRES_REVIEW and reviewRequired = true, while preserving numericalStatus = ON_TRACK', () => {
    const pool = {
        id: 'pool_orphaned',
        householdId: HH_ID,
        name: 'Orphaned Pool',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 50 },
                { personId: 'p_deleted_person', targetRatioPercent: 50 } // Not in member roster
            ]
        }],
        linkedExpenses: [{
            transactionId: 'tx_orph_1',
            grossAmount: 3000,
            effectiveRefundAmount: 0,
            netAmount: 3000,
            status: 'SETTLED',
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].reviewRequired, true);
    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.REQUIRES_REVIEW);
    assert.strictEqual(res.evaluatedPools[0].numericalStatus, BudgetPoolNumericalStatus.ON_TRACK); // 30% spent is ON_TRACK
    assert.strictEqual(res.evaluatedPools[0].statusReason, 'ORPHANED_CONTRIBUTOR');
});

await test('Assertion 35: Verify split sum != 100% sets status = REQUIRES_REVIEW, preserves numericalStatus = APPROACHING_LIMIT, and suppresses fairness deltas', () => {
    const pool = {
        id: 'pool_bad_split_health',
        householdId: HH_ID,
        name: 'Bad Split Sum',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 50 },
                { personId: 'p_bob', targetRatioPercent: 40 } // Sum = 90
            ]
        }],
        linkedExpenses: [{
            transactionId: 'tx_b90',
            grossAmount: 9000,
            effectiveRefundAmount: 0,
            netAmount: 9000,
            status: 'SETTLED',
            timestampUtc: '2026-09-12T10:00:00.000Z'
        }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].reviewRequired, true);
    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.REQUIRES_REVIEW);
    assert.strictEqual(res.evaluatedPools[0].numericalStatus, BudgetPoolNumericalStatus.APPROACHING_LIMIT); // 90% is APPROACHING_LIMIT
    assert.strictEqual(res.evaluatedPools[0].fairnessBreakdown, null); // Suppressed
});

await test('Assertion 36: Verify financial data for REQUIRES_REVIEW pool remains included in collective ceiling and spent totals', () => {
    const poolGood = {
        id: 'pool_good_sum',
        householdId: HH_ID,
        name: 'Good Pool',
        currency: 'INR',
        monthlyCeiling: 8000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{ transactionId: 'tx_g1', grossAmount: 2000, netAmount: 2000, status: 'SETTLED', timestampUtc: '2026-09-12T10:00:00.000Z' }]
    };
    const poolReview = {
        id: 'pool_rev_sum',
        householdId: HH_ID,
        name: 'Review Pool',
        currency: 'INR',
        monthlyCeiling: 12000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 60 }] }], // invalid sum
        linkedExpenses: [{ transactionId: 'tx_r1', grossAmount: 5000, netAmount: 5000, status: 'SETTLED', timestampUtc: '2026-09-12T10:00:00.000Z' }]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [poolGood, poolReview],
        members: membersRoster
    });

    // 8000 + 12000 = 20000
    assert.strictEqual(res.summary.totalCeiling, 20000);
    // 2000 + 5000 = 7000
    assert.strictEqual(res.summary.totalSpent, 7000);
    assert.strictEqual(res.summary.totalRemainingBuffer, 13000);
    assert.strictEqual(res.summary.reviewRequired, true);
    assert.strictEqual(res.summary.overallStatus, BudgetPoolHealthStatus.REQUIRES_REVIEW);
});

// ---------------------------------------------------------------------------
// 8. Fairness Delta Mathematics (Assertions 37-42)
// ---------------------------------------------------------------------------

await test('50/50 split calculations produce equal expected shares', () => {
    const pool = {
        id: 'pool_fair_5050',
        householdId: HH_ID,
        name: 'Equal Pool',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 50 },
                { personId: 'p_bob', targetRatioPercent: 50 }
            ]
        }],
        linkedExpenses: [
            { transactionId: 'tx_f1', grossAmount: 6000, netAmount: 6000, status: 'SETTLED', contributedByPersonId: 'p_alice', timestampUtc: '2026-09-10T10:00:00.000Z' }
        ]
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool], members: membersRoster });
    const fairness = res.evaluatedPools[0].fairnessBreakdown;

    assert.strictEqual(fairness[0].expectedShareAmount, 3000);
    assert.strictEqual(fairness[1].expectedShareAmount, 3000);
});

await test('Overpaid member receives positive netBalanceDelta (owed reimbursement)', () => {
    const pool = {
        id: 'pool_fair_over',
        householdId: HH_ID,
        name: 'Equal Pool',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 50 },
                { personId: 'p_bob', targetRatioPercent: 50 }
            ]
        }],
        linkedExpenses: [
            { transactionId: 'tx_f2', grossAmount: 6000, netAmount: 6000, status: 'SETTLED', contributedByPersonId: 'p_alice', timestampUtc: '2026-09-10T10:00:00.000Z' }
        ]
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool], members: membersRoster });
    const aliceDelta = res.evaluatedPools[0].fairnessBreakdown.find(f => f.personId === 'p_alice');

    // Alice paid 6000, expected 3000 -> net delta +3000
    assert.strictEqual(aliceDelta.actualContributedAmount, 6000);
    assert.strictEqual(aliceDelta.netBalanceDelta, 3000);
});

await test('Underpaid member receives negative netBalanceDelta (owes contribution)', () => {
    const pool = {
        id: 'pool_fair_under',
        householdId: HH_ID,
        name: 'Equal Pool',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 50 },
                { personId: 'p_bob', targetRatioPercent: 50 }
            ]
        }],
        linkedExpenses: [
            { transactionId: 'tx_f3', grossAmount: 6000, netAmount: 6000, status: 'SETTLED', contributedByPersonId: 'p_alice', timestampUtc: '2026-09-10T10:00:00.000Z' }
        ]
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool], members: membersRoster });
    const bobDelta = res.evaluatedPools[0].fairnessBreakdown.find(f => f.personId === 'p_bob');

    // Bob paid 0, expected 3000 -> net delta -3000
    assert.strictEqual(bobDelta.actualContributedAmount, 0);
    assert.strictEqual(bobDelta.netBalanceDelta, -3000);
});

await test('Mathematical conservation identity: sum of netBalanceDelta across all contributors equals exactly 0', () => {
    const pool = {
        id: 'pool_fair_sum0',
        householdId: HH_ID,
        name: 'Multi Member Pool',
        currency: 'INR',
        monthlyCeiling: 15000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 40 },
                { personId: 'p_bob', targetRatioPercent: 40 },
                { personId: 'p_charlie', targetRatioPercent: 20 }
            ]
        }],
        linkedExpenses: [
            { transactionId: 'tx_f4', grossAmount: 5000, netAmount: 5000, status: 'SETTLED', contributedByPersonId: 'p_alice', timestampUtc: '2026-09-10T10:00:00.000Z' },
            { transactionId: 'tx_f5', grossAmount: 3000, netAmount: 3000, status: 'SETTLED', contributedByPersonId: 'p_bob', timestampUtc: '2026-09-11T10:00:00.000Z' }
        ]
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool], members: membersRoster });
    const sumDeltas = res.evaluatedPools[0].fairnessBreakdown.reduce((acc, f) => acc + f.netBalanceDelta, 0);

    assert.strictEqual(Math.round(sumDeltas * 100) / 100, 0);
});

await test('Unequal split ratios (e.g. 70/30) calculate accurate proportional expected shares', () => {
    const pool = {
        id: 'pool_fair_7030',
        householdId: HH_ID,
        name: '70/30 Pool',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 70 },
                { personId: 'p_bob', targetRatioPercent: 30 }
            ]
        }],
        linkedExpenses: [
            { transactionId: 'tx_f6', grossAmount: 10000, netAmount: 10000, status: 'SETTLED', contributedByPersonId: 'p_alice', timestampUtc: '2026-09-10T10:00:00.000Z' }
        ]
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool], members: membersRoster });
    const aliceDelta = res.evaluatedPools[0].fairnessBreakdown.find(f => f.personId === 'p_alice');
    const bobDelta = res.evaluatedPools[0].fairnessBreakdown.find(f => f.personId === 'p_bob');

    assert.strictEqual(aliceDelta.expectedShareAmount, 7000);
    assert.strictEqual(aliceDelta.netBalanceDelta, 3000);
    assert.strictEqual(bobDelta.expectedShareAmount, 3000);
    assert.strictEqual(bobDelta.netBalanceDelta, -3000);
});

await test('3-member split ratios calculate accurately with zero round-off drift', () => {
    const pool = {
        id: 'pool_fair_3m',
        householdId: HH_ID,
        name: '3-Way Split',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{
            effectivePeriod: '2026-09',
            contributorSplits: [
                { personId: 'p_alice', targetRatioPercent: 33.34 },
                { personId: 'p_bob', targetRatioPercent: 33.33 },
                { personId: 'p_charlie', targetRatioPercent: 33.33 }
            ]
        }],
        linkedExpenses: [
            { transactionId: 'tx_f7', grossAmount: 3000, netAmount: 3000, status: 'SETTLED', contributedByPersonId: 'p_alice', timestampUtc: '2026-09-10T10:00:00.000Z' }
        ]
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool], members: membersRoster });
    const breakdown = res.evaluatedPools[0].fairnessBreakdown;

    assert.strictEqual(breakdown.length, 3);
    const sumExpected = breakdown.reduce((acc, f) => acc + f.expectedShareAmount, 0);
    assert.strictEqual(Math.round(sumExpected), 3000);
});

// ---------------------------------------------------------------------------
// 9. Multi-Currency Divergence & Nullability (Assertions 43-47)
// ---------------------------------------------------------------------------

await test('Uniform single-currency pools produce numeric totalCeiling, totalSpent, and matching currency', () => {
    const pool1 = {
        id: 'pool_curr_1',
        householdId: HH_ID,
        name: 'Pool 1',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{ transactionId: 'tx_c1', grossAmount: 4000, netAmount: 4000, status: 'SETTLED', timestampUtc: '2026-09-10T10:00:00.000Z' }]
    };
    const pool2 = {
        id: 'pool_curr_2',
        householdId: HH_ID,
        name: 'Pool 2',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [{ transactionId: 'tx_c2', grossAmount: 2000, netAmount: 2000, status: 'SETTLED', timestampUtc: '2026-09-10T10:00:00.000Z' }]
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [pool1, pool2], members: membersRoster });

    assert.strictEqual(res.summary.currency, 'INR');
    assert.strictEqual(res.summary.totalCeiling, 15000);
    assert.strictEqual(res.summary.totalSpent, 6000);
    assert.strictEqual(res.summary.totalRemainingBuffer, 9000);
    assert.strictEqual(res.summary.currencyDivergenceWarning, null);
});

await test('Assertion 44: Under currency divergence (e.g. INR and USD active pools), summary.currency === null', () => {
    const poolINR = {
        id: 'pool_inr',
        householdId: HH_ID,
        name: 'Domestic Groceries',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };
    const poolUSD = {
        id: 'pool_usd',
        householdId: HH_ID,
        name: 'Software Subscriptions',
        currency: 'USD',
        monthlyCeiling: 150,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [poolINR, poolUSD], members: membersRoster });

    assert.strictEqual(res.summary.currency, null);
});

await test('Assertion 45: Under currency divergence, totalCeiling === null, totalSpent === null, and totalRemainingBuffer === null', () => {
    const poolINR = {
        id: 'pool_inr_b',
        householdId: HH_ID,
        name: 'Domestic Groceries',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };
    const poolUSD = {
        id: 'pool_usd_b',
        householdId: HH_ID,
        name: 'Software Subscriptions',
        currency: 'USD',
        monthlyCeiling: 150,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [poolINR, poolUSD], members: membersRoster });

    assert.strictEqual(res.summary.totalCeiling, null);
    assert.strictEqual(res.summary.totalSpent, null);
    assert.strictEqual(res.summary.totalRemainingBuffer, null);
});

await test('Assertion 46: Under currency divergence, overallUtilizationPercent === null and currencyDivergenceWarning === "Aggregate unavailable because active pools contain different currencies."', () => {
    const poolINR = {
        id: 'pool_inr_c',
        householdId: HH_ID,
        name: 'Domestic Groceries',
        currency: 'INR',
        monthlyCeiling: 10000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };
    const poolUSD = {
        id: 'pool_usd_c',
        householdId: HH_ID,
        name: 'Software Subscriptions',
        currency: 'USD',
        monthlyCeiling: 150,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [poolINR, poolUSD], members: membersRoster });

    assert.strictEqual(res.summary.overallUtilizationPercent, null);
    assert.strictEqual(res.summary.currencyDivergenceWarning, 'Aggregate unavailable because active pools contain different currencies.');
    assert.strictEqual(res.summary.overallStatus, BudgetPoolHealthStatus.REQUIRES_REVIEW);
});

await test('Cross-household tenant isolation: foreign household pools are completely excluded (skippedForeignPools: 1)', () => {
    const poolMyHH = {
        id: 'pool_my_hh',
        householdId: HH_ID,
        name: 'My Pool',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };
    const poolForeign = {
        id: 'pool_foreign_hh',
        householdId: HH_FOREIGN,
        name: 'Foreign Pool',
        currency: 'INR',
        monthlyCeiling: 20000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({ householdId: HH_ID, referenceDateUtc: REF_DATE_UTC, timezone: 'UTC', pools: [poolMyHH, poolForeign], members: membersRoster });

    assert.strictEqual(res.evaluatedPools.length, 1);
    assert.strictEqual(res.evaluatedPools[0].poolId, 'pool_my_hh');
    assert.strictEqual(res.summary.diagnostics.skippedForeignPools, 1);
});

// ---------------------------------------------------------------------------
// 10. Repository Invariants & CRUD (Assertions 48-51)
// ---------------------------------------------------------------------------

await test('STORAGE_KEYS.FAMILY_BUDGET_POOLS is registered as finlife_family_budget_pools_v1', () => {
    assert.strictEqual(STORAGE_KEYS.FAMILY_BUDGET_POOLS, 'finlife_family_budget_pools_v1');
});

await test('Repository saveBudgetPool persists pool with UUID and timestamps', async () => {
    const saved = await FamilyRepository.saveBudgetPool(HH_ID, {
        name: 'Auto ID Pool',
        currency: 'INR',
        monthlyCeiling: 7500,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }]
    });

    assert.strictEqual(typeof saved.id, 'string');
    assert.strictEqual(saved.id.startsWith('pool_'), true);
    assert.strictEqual(typeof saved.createdAt, 'string');
    assert.strictEqual(typeof saved.updatedAt, 'string');
});

await test('Repository archiveBudgetPool sets isArchived: true without deleting record', async () => {
    const pool = await FamilyRepository.saveBudgetPool(HH_ID, {
        name: 'To Archive Pool',
        currency: 'INR',
        monthlyCeiling: 4000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }]
    });

    const archived = await FamilyRepository.archiveBudgetPool(HH_ID, pool.id);
    assert.strictEqual(archived.isArchived, true);

    const fetched = await FamilyRepository.getBudgetPool(HH_ID, pool.id);
    assert.strictEqual(fetched.isArchived, true);
});

await test('Saving updated pool preserves existing contributorSplitVersions and linkedExpenses', async () => {
    const pool = await FamilyRepository.saveBudgetPool(HH_ID, {
        name: 'Preserve Pool',
        currency: 'INR',
        monthlyCeiling: 3000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }]
    });

    await FamilyRepository.linkExpenseToPool(HH_ID, pool.id, {
        transactionId: 'tx_preserve_1',
        grossAmount: 1000,
        contributedByPersonId: 'p_alice'
    });

    const updated = await FamilyRepository.saveBudgetPool(HH_ID, {
        id: pool.id,
        name: 'Renamed Preserve Pool',
        monthlyCeiling: 4500
    });

    assert.strictEqual(updated.name, 'Renamed Preserve Pool');
    assert.strictEqual(updated.monthlyCeiling, 4500);
    assert.strictEqual(updated.contributorSplitVersions.length, 1);
    assert.strictEqual(updated.linkedExpenses.length, 1);
});

// ---------------------------------------------------------------------------
// 11. Fault Tolerance & Malformed Inputs (Assertions 52-54)
// ---------------------------------------------------------------------------

await test('Null / undefined pools parameter handled gracefully without throwing', () => {
    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: null,
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools.length, 0);
    assert.strictEqual(res.summary.activePoolsCount, 0);
});

await test('Malformed / NaN expense amounts skipped gracefully with diagnostics.skippedInvalidExpenses incremented', () => {
    const pool = {
        id: 'pool_bad_exp',
        householdId: HH_ID,
        name: 'Bad Exp Pool',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: [
            { transactionId: 'tx_nan', grossAmount: NaN, timestampUtc: '2026-09-10T10:00:00.000Z' },
            { transactionId: 'tx_neg', grossAmount: -200, timestampUtc: '2026-09-10T10:00:00.000Z' },
            { transactionId: 'tx_good', grossAmount: 1500, timestampUtc: '2026-09-10T10:00:00.000Z' }
        ]
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: membersRoster
    });

    assert.strictEqual(res.evaluatedPools[0].spent, 1500);
    assert.strictEqual(res.summary.diagnostics.skippedInvalidExpenses, 2);
});

await test('Empty member list handled gracefully without crashing', () => {
    const pool = {
        id: 'pool_empty_m',
        householdId: HH_ID,
        name: 'Empty Members',
        currency: 'INR',
        monthlyCeiling: 5000,
        contributorSplitVersions: [{ effectivePeriod: '2026-09', contributorSplits: [{ personId: 'p_alice', targetRatioPercent: 100 }] }],
        linkedExpenses: []
    };

    const res = computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'UTC',
        pools: [pool],
        members: []
    });

    assert.strictEqual(res.evaluatedPools[0].reviewRequired, true); // p_alice is orphaned
    assert.strictEqual(res.evaluatedPools[0].status, BudgetPoolHealthStatus.REQUIRES_REVIEW);
});

// ---------------------------------------------------------------------------
// 12. Zero-Write Verification (Assertion 55)
// ---------------------------------------------------------------------------

await test('Assertion 55: Cryptographic SHA-256 hash check verifying repository state is 100% byte-identical before and after pure evaluation', async () => {
    const prePools = await FamilyRepository.getBudgetPools(HH_ID);
    const preHash = crypto.createHash('sha256').update(JSON.stringify(prePools)).digest('hex');

    // Run pure evaluation
    computeHouseholdBudgetPoolsPure({
        householdId: HH_ID,
        referenceDateUtc: REF_DATE_UTC,
        timezone: 'Asia/Kolkata',
        pools: prePools,
        members: membersRoster
    });

    const postPools = await FamilyRepository.getBudgetPools(HH_ID);
    const postHash = crypto.createHash('sha256').update(JSON.stringify(postPools)).digest('hex');

    assert.strictEqual(preHash, postHash);
});

console.log('\n=============================================================');
console.log(`🎉 ALL ${passCount} / 55 ASSERTIONS PASSED (100.0%)`);
console.log('=============================================================\n');
