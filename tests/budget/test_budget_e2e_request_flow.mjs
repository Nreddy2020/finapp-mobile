/**
 * tests/budget/test_budget_e2e_request_flow.mjs
 * 
 * FinLife Authoritative End-to-End Budget Request Lifecycle Test.
 * 
 * Verifies the full bidirectional request flow across the Financial Command Center:
 * 1. Budget Creation & Strict Positive Limit Validation.
 * 2. Cashbook Expense Linkage & Exact Integer-Paise Runtime Derivation.
 * 3. Threshold Detection & Over-Budget Warning/Critical Alert Pipeline.
 * 4. Atomic Reports V1 Cache Invalidation upon Budget Mutation.
 * 5. Budget Limit Upgrades & Dynamic Overdraft Relief.
 * 6. Cross-Module Reconciled ViewModels (Zero BigInt Leakage & Read-Only Storage).
 */

import assert from 'node:assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BudgetService } from '../../services/budgets.js';
import { CashbookRepository } from '../../services/cashbook/cashbookRepository.js';
import {
    SourceAvailabilityStatus,
    BudgetLifecycleStatus,
    BUDGET_UTILIZATION_STATUS,
    toBigIntPaise,
    formatBigIntPaise
} from '../../services/budget/budgetContracts.js';
import { buildBudgetControlCenterViewModel } from '../../services/budget/budgetViewModel.js';
import { ReportViewModel } from '../../services/reports/reportViewModel.js';
import { STORAGE_KEYS, StorageService, loadData } from '../../services/storage.js';

let passed = 0;
let total = 0;

function check(desc, condition, extraInfo = '') {
    total++;
    if (condition) {
        console.log(`  [PASS] Check ${total}: ${desc}`);
        passed++;
    } else {
        console.error(`  [FAIL] Check ${total}: ${desc} ${extraInfo}`);
        throw new Error(`Assertion failed: ${desc}`);
    }
}

async function runBudgetE2ERequestFlowSuite() {
    console.log('================================================================');
    console.log('🧪 FINLIFE BUDGETS — END-TO-END REQUEST FLOW INTEGRATION SUITE');
    console.log('   Target: Unified Create -> Spend -> Alert -> Report -> Reconcile');
    console.log('================================================================\n');

    // Clean initial environment
    await AsyncStorage.clear();
    ReportViewModel.clearCache();

    // -------------------------------------------------------------------------
    // FLOW 1: Budget Creation & Validation
    // -------------------------------------------------------------------------
    console.log('--- FLOW 1: Budget Creation & Strict Validation ---');

    // Reject non-positive budget limits
    let rejectSuccess = false;
    try {
        await BudgetService.saveBudget({ category: 'Food & Dining', limit: 0 });
    } catch (err) {
        rejectSuccess = true;
    }
    check('Rejects zero budget limit with validation error', rejectSuccess);

    try {
        await BudgetService.saveBudget({ category: 'Food & Dining', limit: -500 });
        rejectSuccess = false;
    } catch (err) {
        rejectSuccess = true;
    }
    check('Rejects negative budget limit with validation error', rejectSuccess);

    // Create valid budget: Food & Dining ₹12,000
    const foodBudget = await BudgetService.saveBudget({
        category: 'Food & Dining',
        limit: 12000,
        type: 'Needs'
    });

    check('Successfully creates active budget entity', foodBudget && foodBudget.id !== undefined);
    check('Limit correctly parsed to 1,200,000n paise', foodBudget.limitPaise === 1200000n);
    check('Stored record does NOT include derived spent property', foodBudget.spent === undefined);

    // Initial actuals with zero Cashbook transactions
    const initialReport = await BudgetService.getBudgetsWithActuals('2026-09');
    check('Initial status is AVAILABLE with 0 spending', initialReport.status === SourceAvailabilityStatus.AVAILABLE);
    check('Initial totalSpentPaise is 0n', initialReport.totalSpentPaise === 0n);
    check('Initial remainingBudgetPaise equals ₹12,000 (1200000n paise)', initialReport.remainingBudgetPaise === 1200000n);
    check('Initial utilization is 0 BPS', initialReport.overallUtilizationBps === 0n);

    // -------------------------------------------------------------------------
    // FLOW 2: Cashbook Expense Linkage & Net Calculation
    // -------------------------------------------------------------------------
    console.log('\n--- FLOW 2: Cashbook Expense Linkage & Net Calculation ---');

    // Seed Cashbook envelope with 2 expenses and 1 refund in September 2026
    const cashbookSeed = {
        version: 2,
        accounts: [
            { id: 'acc_main', name: 'Main Account', balancePaise: '10000000', balance: 100000 }
        ],
        transactions: [
            {
                id: 'tx_food_1',
                type: 'EXPENSE',
                amountPaise: '450000',
                amount: 4500,
                categoryId: 'Food & Dining',
                category: 'Food & Dining',
                date: '2026-09-02T12:00:00.000Z',
                status: 'COMMITTED'
            },
            {
                id: 'tx_food_2',
                type: 'EXPENSE',
                amountPaise: '50000',
                amount: 500,
                categoryId: 'Food & Dining',
                category: 'Food & Dining',
                date: '2026-09-10T14:30:00.000Z',
                status: 'COMMITTED'
            },
            {
                id: 'tx_food_refund',
                type: 'REFUND',
                amountPaise: '20000',
                amount: 200,
                categoryId: 'Food & Dining',
                category: 'Food & Dining',
                date: '2026-09-12T09:00:00.000Z',
                status: 'COMMITTED'
            }
        ]
    };

    await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', cashbookSeed);

    const spentReport = await BudgetService.getBudgetsWithActuals('2026-09');
    // Net food expense = 4500 + 500 - 200 = 4800 (480000n paise)
    check('Net spent correctly nets refund: 480,000n paise (₹4,800)', spentReport.totalSpentPaise === 480000n, `(actual: ${spentReport.totalSpentPaise}, status: ${spentReport.status}, error: ${spentReport.error})`);
    check('Utilization exactly 4000 BPS (40.00%)', spentReport.overallUtilizationBps === 4000n);
    check('Remaining budget is 720,000n paise (₹7,200)', spentReport.remainingBudgetPaise === 720000n);
    check('Overspent is 0n', spentReport.totalOverspentPaise === 0n);
    check('Utilization status is SAFE', spentReport.overallStatus === BUDGET_UTILIZATION_STATUS.SAFE);

    // -------------------------------------------------------------------------
    // FLOW 3: Over-Budget Detection & Critical Alerts
    // -------------------------------------------------------------------------
    console.log('\n--- FLOW 3: Over-Budget Detection & Critical Alerts ---');

    // Add another large expense pushing category over limit: ₹8,000 (800000n)
    cashbookSeed.transactions.push({
        id: 'tx_food_3',
        type: 'EXPENSE',
        amountPaise: '800000',
        amount: 8000,
        categoryId: 'Food & Dining',
        category: 'Food & Dining',
        date: '2026-09-18T20:00:00.000Z',
        status: 'COMMITTED'
    });
    await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', cashbookSeed);

    const overReport = await BudgetService.getBudgetsWithActuals('2026-09');
    // Total spent = 4800 + 8000 = 12,800 (1280000n paise) vs limit 12,000 (1200000n paise)
    check('Total spent reflects new transaction: 1,280,000n paise (₹12,800)', overReport.totalSpentPaise === 1280000n);
    check('Remaining budget clamps to 0n on overspending', overReport.remainingBudgetPaise === 0n);
    check('Overspent accurately calculated: 80,000n paise (₹800)', overReport.totalOverspentPaise === 80000n);
    check('Utilization calculated accurately: 10666 BPS (106.66%)', overReport.overallUtilizationBps === 10666n);
    check('Utilization status escalated to OVER_BUDGET', overReport.overallStatus === BUDGET_UTILIZATION_STATUS.OVER_BUDGET);
    check('Alerts array contains CRITICAL alert for over-budget category', overReport.alerts.some(a => a.severity === 'CRITICAL' && a.category === 'Food & Dining'));

    // -------------------------------------------------------------------------
    // FLOW 4: Reports V1 Synchronized Presentation & Invalidation
    // -------------------------------------------------------------------------
    console.log('\n--- FLOW 4: Reports V1 Synchronized Presentation & Invalidation ---');

    const reportVM = await ReportViewModel.getFullFinancialIntelligence('2026-09');
    check('Reports V1 budget performance shows Cashbook provenance', reportVM.budget.source === 'Cashbook');
    check('Reports V1 shows ₹12,000 total budget limit', reportVM.budget.totalBudgetFormatted.includes('12,000'));
    check('Reports V1 shows ₹12,800 total spent', reportVM.budget.totalSpentFormatted.includes('12,800'), `(actual: ${reportVM.budget.totalSpentFormatted})`);
    check('Reports V1 shows utilization > 100%', reportVM.budget.utilizationPercent > 100);

    // -------------------------------------------------------------------------
    // FLOW 5: Budget Limit Upgrades & Dynamic Relief
    // -------------------------------------------------------------------------
    console.log('\n--- FLOW 5: Budget Limit Upgrades & Dynamic Relief ---');

    // Upgrade budget limit to ₹16,000 to relieve over-budget pressure
    await BudgetService.saveBudget({
        id: foodBudget.id,
        category: 'Food & Dining',
        limit: 16000,
        type: 'Needs'
    });

    const relievedReport = await BudgetService.getBudgetsWithActuals('2026-09');
    // Spent: 12800 (1280000n), Limit: 16000 (1600000n)
    // Utilization: 1280000n * 10000n / 1600000n = 8000 BPS (80.00%)
    check('Total spent remains intact: 1,280,000n paise', relievedReport.totalSpentPaise === 1280000n);
    check('New remaining budget: 320,000n paise (₹3,200)', relievedReport.remainingBudgetPaise === 320000n);
    check('Overspent cleared to 0n', relievedReport.totalOverspentPaise === 0n);
    check('Utilization exactly 8000 BPS (80.00%)', relievedReport.overallUtilizationBps === 8000n);
    check('Utilization status transitions to NEAR_LIMIT (80%)', relievedReport.overallStatus === BUDGET_UTILIZATION_STATUS.NEAR_LIMIT);

    // Invalidation check: ReportViewModel must immediately reflect updated limit
    const refreshedReportVM = await ReportViewModel.getFullFinancialIntelligence('2026-09');
    check('Reports V1 cache invalidated: reflects updated ₹16,000 budget', refreshedReportVM.budget.totalBudgetFormatted.includes('16,000'));
    check('Reports V1 reflects 80% utilization after upgrade', refreshedReportVM.budget.utilizationPercent === 80);

    // -------------------------------------------------------------------------
    // FLOW 6: Presentation Safety & Read-Only Guarantee
    // -------------------------------------------------------------------------
    console.log('\n--- FLOW 6: Presentation Safety & Read-Only Guarantee ---');

    const controlCenterVM = buildBudgetControlCenterViewModel({
        budgets: relievedReport.categories,
        selectedMonth: '2026-09',
        selectedStrategyId: 'zero_based',
        currentCash: 100000,
        commitments: [],
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

    let noBigInt = true;
    try {
        assertNoRawBigInt(controlCenterVM);
    } catch (e) {
        noBigInt = false;
    }
    check('Control Center ViewModel contains zero raw BigInt primitives', noBigInt);

    const foodCat = controlCenterVM.categories.find(c => c.category === 'Food & Dining');
    check('Control Center ViewModel formats Indian currency commas (₹16,000)', foodCat && foodCat.limitFormatted.includes('16,000'));
    check('Control Center ViewModel accurately indicates Safe-to-Spend', controlCenterVM.financialHealth.safeToSpendUntilMonthEnd > 0);

    // Verify Read-Only storage invariant: budget stored record never had 'spent' written to it
    const parsedStored = await loadData(STORAGE_KEYS.BUDGETS, []);
    const targetStored = parsedStored.find(b => b.category === 'Food & Dining');
    check('Stored budget record never contains derived spent property', targetStored && targetStored.spent === undefined);

    console.log('\n================================================================');
    console.log(`✅ BUDGET E2E REQUEST LIFECYCLE VERIFIED: ${passed} / ${total} Checks Passed (100%)`);
    console.log('================================================================\n');
}

runBudgetE2ERequestFlowSuite().catch(err => {
    console.error('Fatal error in Budget E2E suite:', err);
    process.exit(1);
});
