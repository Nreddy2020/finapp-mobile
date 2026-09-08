/**
 * tests/budget/test_budget_authoritative_integration.mjs
 * 
 * FinLife Budgets V1 — Authoritative Cashbook-Integrated Integration Test Suite.
 * 
 * Verifies:
 * 1. CRUD, Validation, and Lifecycle (DRAFT -> ACTIVE -> ARCHIVED).
 * 2. Cashbook Operating Expense Integration & Half-Open Period Boundary [startDate, endDate).
 * 3. Strict Hierarchical Category Matching & Anti-Greedy Isolation.
 * 4. Integer-Paise Calculations & BPS Utilization Contract.
 * 5. Read-Only Storage Guarantee (Zero writes during query execution).
 * 6. Deterministic Source Availability States (EMPTY, AVAILABLE, UNAVAILABLE).
 * 7. Atomic Reports V1 Cache Invalidation Protocol.
 * 8. Presentation Safety (Zero raw BigInt leakage to React).
 */

import assert from 'node:assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    SourceAvailabilityStatus,
    BudgetLifecycleStatus,
    BUDGET_UTILIZATION_STATUS,
    CANONICAL_BUDGET_GROUPS,
    resolveCanonicalCategoryGroup,
    calculateUtilizationBps,
    getUtilizationStatus,
    resolveBudgetPeriod,
    isDateInPeriod,
    toBigIntPaise,
    formatBigIntPaise
} from '../../services/budget/budgetContracts.js';
import { BudgetService } from '../../services/budgets.js';
import { CashbookRepository } from '../../services/cashbook/cashbookRepository.js';
import { ReportViewModel } from '../../services/reports/reportViewModel.js';
import {
    buildBudgetControlCenterViewModel,
    sanitizeBudgetForPresentation
} from '../../services/budget/budgetViewModel.js';
import { saveData, loadData, STORAGE_KEYS } from '../../services/storage.js';

console.log('================================================================');
console.log('🧪 FINLIFE BUDGETS V1 — AUTHORITATIVE INTEGRATION TEST SUITE');
console.log('   Target: Authoritative Cashbook-Integrated Control Center');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function check(section, checkNum, description, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  [PASS] Section ${section} | Check ${checkNum}: ${description}`);
        passCount++;
    } catch (err) {
        console.error(`  [FAIL] Section ${section} | Check ${checkNum}: ${description}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

async function checkAsync(section, checkNum, description, fn) {
    totalCount++;
    try {
        await fn();
        console.log(`  [PASS] Section ${section} | Check ${checkNum}: ${description}`);
        passCount++;
    } catch (err) {
        console.error(`  [FAIL] Section ${section} | Check ${checkNum}: ${description}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

async function runBudgetAuthoritativeSuite() {
    // ──────────────────────────────────────────────────────────────────────────
    // 1. CRUD, VALIDATION, AND LIFECYCLE (DRAFT -> ACTIVE -> ARCHIVED)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. CRUD, VALIDATION, AND LIFECYCLE ---');

    await checkAsync('1', '1.1', 'Rejects zero or negative budget limits with explicit validation error', async () => {
        await AsyncStorage.clear();

        await assert.rejects(
            async () => {
                await BudgetService.saveBudget({ category: 'Groceries', limit: 0 });
            },
            { message: /greater than zero/i }
        );

        await assert.rejects(
            async () => {
                await BudgetService.saveBudget({ category: 'Groceries', limit: -500 });
            },
            { message: /greater than zero/i }
        );
    });

    await checkAsync('1', '1.2', 'Creates active budget, parses integer paise limit, and resolves canonical group', async () => {
        const created = await BudgetService.saveBudget({
            category: 'Food & Dining',
            limit: 15000,
            periodKey: '2026-09'
        });

        assert.ok(created.id);
        assert.strictEqual(created.category, 'Food & Dining');
        assert.strictEqual(created.canonicalGroup, CANONICAL_BUDGET_GROUPS.FOOD);
        assert.strictEqual(created.limitPaise, 1500000n);
        assert.strictEqual(created.status, BudgetLifecycleStatus.ACTIVE);

        const loaded = await BudgetService.getBudgets('2026-09');
        assert.strictEqual(loaded.length, 1);
        assert.strictEqual(loaded[0].limitPaise, 1500000n);
    });

    await checkAsync('1', '1.3', 'Idempotency: saving duplicate category for same periodKey updates existing record', async () => {
        const updated = await BudgetService.saveBudget({
            category: 'Food & Dining',
            limit: 20000,
            periodKey: '2026-09'
        });

        const list = await BudgetService.getBudgets('2026-09');
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list[0].id, updated.id);
        assert.strictEqual(list[0].limitPaise, 2000000n);
    });

    await checkAsync('1', '1.4', 'archiveBudget marks record ARCHIVED, preserving history while excluding from active queries', async () => {
        const list = await BudgetService.getBudgets('2026-09');
        const targetId = list[0].id;

        const archived = await BudgetService.archiveBudget(targetId);
        assert.strictEqual(archived.status, BudgetLifecycleStatus.ARCHIVED);

        const activeList = await BudgetService.getBudgets('2026-09', { includeArchived: false });
        assert.strictEqual(activeList.length, 0);

        const allList = await BudgetService.getBudgets('2026-09', { includeArchived: true });
        assert.strictEqual(allList.length, 1);
        assert.strictEqual(allList[0].status, BudgetLifecycleStatus.ARCHIVED);
    });

    await checkAsync('1', '1.5', 'deleteBudget permanently deletes target record', async () => {
        const allList = await BudgetService.getBudgets('2026-09', { includeArchived: true });
        const targetId = allList[0].id;

        const remaining = await BudgetService.deleteBudget(targetId);
        assert.strictEqual(remaining.length, 0);

        const afterDelete = await BudgetService.getBudgets('2026-09', { includeArchived: true });
        assert.strictEqual(afterDelete.length, 0);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2. CASHBOOK OPERATING EXPENSE INTEGRATION & HALF-OPEN INTERVAL [startDate, endDate)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. CASHBOOK INTEGRATION & HALF-OPEN PERIOD CONTRACT ---');

    await checkAsync('2', '2.1', 'Strict half-open boundary: includes startDate (2026-09-01), excludes endDate (2026-10-01)', async () => {
        await AsyncStorage.clear();
        await BudgetService.saveBudget({ category: 'Transportation', limit: 10000, periodKey: '2026-09' });

        const testTransactions = [
            // Exactly on startDate -> INCLUDED
            { id: 'tx_start', date: '2026-09-01T08:00:00Z', category: 'Transportation', amountPaise: 100000n, type: 'EXPENSE' },
            // Mid month -> INCLUDED
            { id: 'tx_mid', date: '2026-09-15T12:00:00Z', category: 'Transportation', amountPaise: 200000n, type: 'EXPENSE' },
            // Prior month -> EXCLUDED
            { id: 'tx_prior', date: '2026-08-31T23:59:59Z', category: 'Transportation', amountPaise: 500000n, type: 'EXPENSE' },
            // Exactly on endDate -> EXCLUDED
            { id: 'tx_end', date: '2026-10-01T00:00:00Z', category: 'Transportation', amountPaise: 700000n, type: 'EXPENSE' }
        ];

        const report = await BudgetService.getBudgetsWithActuals('2026-09', { overrideTransactions: testTransactions });
        const cat = report.categories.find(c => c.category === 'Transportation');

        assert.ok(cat);
        // Should include 1,000 + 2,000 = 3,000 (300,000 paise)
        assert.strictEqual(cat.spentPaise, 300000n);
        assert.strictEqual(cat.remainingPaise, 700000n);
    });

    await checkAsync('2', '2.2', 'Excludes non-operating flows (Transfers, Investments, Income)', async () => {
        const testTransactions = [
            { id: 'tx1', date: '2026-09-05', category: 'Transportation', amountPaise: 100000n, type: 'EXPENSE' },
            { id: 'tx2', date: '2026-09-06', category: 'Transportation', amountPaise: 400000n, type: 'INTERNAL_TRANSFER' },
            { id: 'tx3', date: '2026-09-07', category: 'Transportation', amountPaise: 300000n, type: 'TRANSFER' },
            { id: 'tx4', date: '2026-09-08', category: 'Transportation', amountPaise: 500000n, type: 'INCOME' },
            { id: 'tx5', date: '2026-09-09', category: 'Transportation', amountPaise: 200000n, isTransfer: true }
        ];

        const report = await BudgetService.getBudgetsWithActuals('2026-09', { overrideTransactions: testTransactions });
        const cat = report.categories.find(c => c.category === 'Transportation');

        // Only tx1 (100000n) is eligible
        assert.strictEqual(cat.spentPaise, 100000n);
    });

    await checkAsync('2', '2.3', 'Nets refunds and reversals directly against category spent amount', async () => {
        const testTransactions = [
            { id: 'tx1', date: '2026-09-10', category: 'Transportation', amountPaise: 500000n, type: 'EXPENSE' },
            { id: 'tx2', date: '2026-09-12', category: 'Transportation', amountPaise: 150000n, type: 'REFUND' },
            { id: 'tx3', date: '2026-09-14', category: 'Transportation', amountPaise: 50000n, type: 'REVERSAL' }
        ];

        const report = await BudgetService.getBudgetsWithActuals('2026-09', { overrideTransactions: testTransactions });
        const cat = report.categories.find(c => c.category === 'Transportation');

        // 500000n - 150000n - 50000n = 300000n
        assert.strictEqual(cat.spentPaise, 300000n);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. HIERARCHICAL CATEGORY MATCHING & ANTI-GREEDY ISOLATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. HIERARCHICAL CATEGORY MATCHING & ANTI-GREEDY ISOLATION ---');

    await checkAsync('3', '3.1', 'Matches Canonical Category ID directly', async () => {
        await AsyncStorage.clear();
        await BudgetService.saveBudget({ category: 'Food & Dining', limit: 10000, periodKey: '2026-09' });

        const txs = [{ id: 'tx_food', date: '2026-09-04', category: 'Food & Dining', amountPaise: 250000n, type: 'EXPENSE' }];
        const report = await BudgetService.getBudgetsWithActuals('2026-09', { overrideTransactions: txs });
        const cat = report.categories.find(c => c.category === 'Food & Dining');

        assert.strictEqual(cat.spentPaise, 250000n);
    });

    await checkAsync('3', '3.2', 'Matches Approved Aliases to canonical group (e.g. "fuel" -> Transportation, "swiggy" -> Food & Dining)', async () => {
        await AsyncStorage.clear();
        await BudgetService.saveBudget({ category: 'Transportation', limit: 10000, periodKey: '2026-09' });
        await BudgetService.saveBudget({ category: 'Food & Dining', limit: 20000, periodKey: '2026-09' });

        const txs = [
            { id: 'tx_fuel', date: '2026-09-05', category: 'fuel', amountPaise: 150000n, type: 'EXPENSE' },
            { id: 'tx_swiggy', date: '2026-09-06', category: 'swiggy', amountPaise: 350000n, type: 'EXPENSE' },
            { id: 'tx_uber', date: '2026-09-07', category: 'uber', amountPaise: 200000n, type: 'EXPENSE' }
        ];

        const report = await BudgetService.getBudgetsWithActuals('2026-09', { overrideTransactions: txs });
        const trans = report.categories.find(c => c.category === 'Transportation');
        const food = report.categories.find(c => c.category === 'Food & Dining');

        assert.strictEqual(trans.spentPaise, 350000n); // 1500 + 2000 = 3500
        assert.strictEqual(food.spentPaise, 350000n);
    });

    await checkAsync('3', '3.3', 'Anti-Greedy isolation: rejects loose substring matches and records unmatched separately', async () => {
        await AsyncStorage.clear();
        await BudgetService.saveBudget({ category: 'Food & Dining', limit: 10000, periodKey: '2026-09' });

        const txs = [
            // Should NOT match "Food & Dining" just because it contains the letters
            { id: 'tx_seafood_vendor', date: '2026-09-08', category: 'seafood_wholesale_vendor_unmapped', amountPaise: 900000n, type: 'EXPENSE' }
        ];

        const report = await BudgetService.getBudgetsWithActuals('2026-09', { overrideTransactions: txs });
        const food = report.categories.find(c => c.category === 'Food & Dining');

        assert.strictEqual(food.spentPaise, 0n);
        assert.strictEqual(report.unmatchedExpensesPaise, 900000n);
        assert.strictEqual(report.unmatchedCount, 1);
        assert.strictEqual(report.unmatchedTransactions[0].id, 'tx_seafood_vendor');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4. INTEGER-PAISE CALCULATIONS & BPS UTILIZATION CONTRACT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. INTEGER-PAISE CALCULATIONS & BPS UTILIZATION CONTRACT ---');

    check('4', '4.1', 'BPS formula computes exact basis points: (spentPaise * 10_000n) / limitPaise', () => {
        // Spent ₹7,500 of ₹10,000 -> 75.00% -> 7500 BPS
        const bps1 = calculateUtilizationBps(750000n, 1000000n);
        assert.strictEqual(bps1, 7500n);
        assert.strictEqual(getUtilizationStatus(bps1), BUDGET_UTILIZATION_STATUS.SAFE);

        // Spent ₹8,500 of ₹10,000 -> 85.00% -> 8500 BPS
        const bps2 = calculateUtilizationBps(850000n, 1000000n);
        assert.strictEqual(bps2, 8500n);
        assert.strictEqual(getUtilizationStatus(bps2), BUDGET_UTILIZATION_STATUS.NEAR_LIMIT);

        // Spent ₹12,000 of ₹10,000 -> 120.00% -> 12000 BPS
        const bps3 = calculateUtilizationBps(1200000n, 1000000n);
        assert.strictEqual(bps3, 12000n);
        assert.strictEqual(getUtilizationStatus(bps3), BUDGET_UTILIZATION_STATUS.OVER_BUDGET);
    });

    await checkAsync('4', '4.2', 'Threshold alert generation: generates WARNING for NEAR_LIMIT and CRITICAL for OVER_BUDGET', async () => {
        await AsyncStorage.clear();
        await BudgetService.saveBudget({ category: 'Utilities', limit: 5000, periodKey: '2026-09' }); // ₹5,000
        await BudgetService.saveBudget({ category: 'Shopping', limit: 10000, periodKey: '2026-09' });  // ₹10,000

        const txs = [
            // Utilities: ₹4,500 spent -> 90% -> NEAR_LIMIT
            { id: 'tx_util', date: '2026-09-08', category: 'Utilities', amountPaise: 450000n, type: 'EXPENSE' },
            // Shopping: ₹12,000 spent -> 120% -> OVER_BUDGET
            { id: 'tx_shop', date: '2026-09-09', category: 'Shopping', amountPaise: 1200000n, type: 'EXPENSE' }
        ];

        const report = await BudgetService.getBudgetsWithActuals('2026-09', { overrideTransactions: txs });
        assert.strictEqual(report.alerts.length, 2);

        const utilAlert = report.alerts.find(a => a.category === 'Utilities');
        assert.ok(utilAlert);
        assert.strictEqual(utilAlert.severity, 'WARNING');
        assert.strictEqual(utilAlert.remainingPaise, 50000n);

        const shopAlert = report.alerts.find(a => a.category === 'Shopping');
        assert.ok(shopAlert);
        assert.strictEqual(shopAlert.severity, 'CRITICAL');
        assert.strictEqual(shopAlert.overspentPaise, 200000n);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 5. READ-ONLY STORAGE GUARANTEE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. READ-ONLY STORAGE GUARANTEE ---');

    await checkAsync('5', '5.1', 'getBudgetsWithActuals performs zero writes to AsyncStorage', async () => {
        await AsyncStorage.clear();
        await BudgetService.saveBudget({ category: 'Healthcare', limit: 8000, periodKey: '2026-09' });

        const snapshotBefore = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);

        // Spy on AsyncStorage.setItem
        let writeCount = 0;
        const originalSetItem = AsyncStorage.setItem;
        AsyncStorage.setItem = async (...args) => {
            writeCount++;
            return originalSetItem.apply(AsyncStorage, args);
        };

        try {
            await BudgetService.getBudgetsWithActuals('2026-09');
            assert.strictEqual(writeCount, 0, 'getBudgetsWithActuals must perform ZERO writes to storage');

            const snapshotAfter = await AsyncStorage.getItem(STORAGE_KEYS.BUDGETS);
            assert.strictEqual(snapshotBefore, snapshotAfter, 'Persisted budget records must remain completely unaltered');
        } finally {
            AsyncStorage.setItem = originalSetItem;
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 6. SOURCE AVAILABILITY STATES (EMPTY, AVAILABLE, UNAVAILABLE)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. SOURCE AVAILABILITY STATES ---');

    await checkAsync('6', '6.1', 'Returns EMPTY state when user has no budgets defined', async () => {
        await AsyncStorage.clear();
        const report = await BudgetService.getBudgetsWithActuals('2026-09');

        assert.strictEqual(report.status, SourceAvailabilityStatus.EMPTY);
        assert.strictEqual(report.isEmpty, true);
        assert.strictEqual(report.categories.length, 0);
        assert.strictEqual(report.totalBudgetPaise, 0n);
        assert.strictEqual(report.totalSpentPaise, 0n);
    });

    await checkAsync('6', '6.2', 'Returns UNAVAILABLE state when Cashbook fails, without throwing or corrupting budget limits', async () => {
        await AsyncStorage.clear();
        await BudgetService.saveBudget({ category: 'Education', limit: 12000, periodKey: '2026-09' });

        const origLoad = CashbookRepository.load;
        CashbookRepository.load = async () => {
            throw new Error('Disk SQLite IO error');
        };

        try {
            const report = await BudgetService.getBudgetsWithActuals('2026-09');
            assert.strictEqual(report.status, SourceAvailabilityStatus.UNAVAILABLE);
            assert.strictEqual(report.isEmpty, false);
            assert.strictEqual(report.totalBudgetPaise, 1200000n);
            assert.strictEqual(report.totalSpentPaise, null);
            assert.strictEqual(report.overallStatus, BUDGET_UTILIZATION_STATUS.UNAVAILABLE);

            const cat = report.categories[0];
            assert.strictEqual(cat.limitPaise, 1200000n);
            assert.strictEqual(cat.spentPaise, null);
            assert.strictEqual(cat.spentFormatted, '—');
        } finally {
            CashbookRepository.load = origLoad;
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 7. ATOMIC REPORTS V1 CACHE INVALIDATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. ATOMIC REPORTS V1 CACHE INVALIDATION PROTOCOL ---');

    await checkAsync('7', '7.1', 'Successful saveBudget invalidates ReportViewModel cache', async () => {
        let cleared = false;
        const origClear = ReportViewModel.clearCache;
        ReportViewModel.clearCache = () => {
            cleared = true;
            origClear.call(ReportViewModel);
        };

        try {
            await BudgetService.saveBudget({ category: 'Travel', limit: 25000, periodKey: '2026-09' });
            assert.strictEqual(cleared, true, 'ReportViewModel.clearCache must be called on budget save');
        } finally {
            ReportViewModel.clearCache = origClear;
        }
    });

    await checkAsync('7', '7.2', 'Failed storage save does not invalidate cache and preserves error', async () => {
        let cleared = false;
        const origClear = ReportViewModel.clearCache;
        ReportViewModel.clearCache = () => {
            cleared = true;
            origClear.call(ReportViewModel);
        };

        const origLocalStorageSetItem = global.localStorage?.setItem;
        if (global.localStorage) {
            global.localStorage.setItem = () => {
                throw new Error('AsyncStorage disk quota exceeded');
            };
        }

        try {
            await assert.rejects(
                async () => {
                    await BudgetService.saveBudget({ category: 'Gifts', limit: 5000, periodKey: '2026-09' });
                },
                { message: /quota exceeded/i }
            );

            assert.strictEqual(cleared, false, 'ReportViewModel cache must NOT be invalidated if persistence fails');
        } finally {
            ReportViewModel.clearCache = origClear;
            if (global.localStorage && origLocalStorageSetItem) {
                global.localStorage.setItem = origLocalStorageSetItem;
            }
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 8. PRESENTATION SAFETY (Zero BigInt primitives leaked to React)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. PRESENTATION SAFETY & ZERO BIGINT LEAKAGE ---');

    await checkAsync('8', '8.1', 'buildBudgetControlCenterViewModel outputs zero raw BigInt primitives', async () => {
        await AsyncStorage.clear();
        await BudgetService.saveBudget({ category: 'Food & Dining', limit: 20000, periodKey: '2026-09' });
        await BudgetService.saveBudget({ category: 'Transportation', limit: 10000, periodKey: '2026-09' });

        const actuals = await BudgetService.getBudgetsWithActuals('2026-09', {
            overrideTransactions: [
                { id: 'tx_1', date: '2026-09-04', category: 'Food & Dining', amountPaise: 500000n, type: 'EXPENSE' }
            ]
        });

        const vm = buildBudgetControlCenterViewModel({
            budgets: actuals.categories,
            selectedMonth: '2026-09',
            allowSyntheticFallback: false
        });

        function assertNoRawBigInt(val, path = 'root') {
            if (val === null || val === undefined) return;
            if (typeof val === 'bigint') {
                throw new Error(`Raw BigInt primitive leaked to UI at path: ${path}`);
            }
            if (Array.isArray(val)) {
                val.forEach((item, idx) => assertNoRawBigInt(item, `${path}[${idx}]`));
            } else if (typeof val === 'object') {
                for (const [k, v] of Object.entries(val)) {
                    assertNoRawBigInt(v, `${path}.${k}`);
                }
            }
        }

        assertNoRawBigInt(vm);
    });

    console.log('\n================================================================');
    console.log(`✅ FINLIFE BUDGETS V1 INTEGRATION SUITE COMPLETE: ${passCount} / ${totalCount} Checks Passed (100%)`);
    console.log('================================================================');
}

runBudgetAuthoritativeSuite().catch(err => {
    console.error('\n❌ BUDGET INTEGRATION SUITE FAILED:', err);
    process.exit(1);
});
