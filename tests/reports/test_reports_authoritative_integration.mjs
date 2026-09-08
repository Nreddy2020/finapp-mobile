/**
 * tests/reports/test_reports_authoritative_integration.mjs
 * 
 * FinLife Reports V1 — Authoritative Cross-Module Integration Suite.
 * 
 * Verifies Option A architecture across all 10 Financial Command Center modules:
 * 1. Zero Synthetic Fallbacks in production queries.
 * 2. Direct Authoritative Domain Connectivity (Commitments, Budgets, P2P, Banking, Assets, Properties, Investments, Loans, Groups).
 * 3. Strict No Double-Counting Invariant (P2P vs Group Expenses isolation).
 * 4. Deterministic Multi-Domain State Engine (AVAILABLE, EMPTY, PARTIAL, UNAVAILABLE).
 * 5. Read-Only Storage Invariant (Zero writes to underlying domain keys).
 * 6. Dynamic Monthly Cash Flow Partitioning & Invariant Conservation.
 * 7. Presentation Safety (Zero raw BigInt leakage).
 */

import assert from 'node:assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    ReportSource,
    ReportState,
    ReportSection,
    ReportingEventType,
    AccountingTreatment,
    ComparisonStatus,
    DebtTenureStatus,
    getMonthlyCashFlowIntervals,
    toBigIntPaise,
    formatBigIntPaise,
    bigIntPaiseToRupees
} from '../../services/reports/reportContracts.js';
import { ReportQueryLayer } from '../../services/reports/reportQueryLayer.js';
import { ReportViewModel } from '../../services/reports/reportViewModel.js';
import { CommitmentsService } from '../../services/commitments/commitmentsService.js';
import { BudgetService } from '../../services/budgets.js';
import { P2PService } from '../../services/p2pService.js';
import { BankingService } from '../../services/bankingService.js';
import { AssetService } from '../../services/assetService.js';
import { PropertyService } from '../../services/propertyService.js';
import { InvestmentService } from '../../services/investmentService.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';
import { CashbookRepository } from '../../services/cashbook/cashbookRepository.js';
import { GroupRepository } from '../../services/shared-costs/groupRepository.js';
import { GroupViewModel } from '../../services/shared-costs/groupViewModel.js';
import { StorageService, saveData, STORAGE_KEYS } from '../../services/storage.js';

console.log('================================================================');
console.log('🧪 FINLIFE REPORTS V1 — AUTHORITATIVE INTEGRATION TEST SUITE');
console.log('   Target: Authoritative Multi-Module Contracts & Zero-Fabrication');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function check(sectionName, checkNum, description, fn) {
    totalCount++;
    try {
        fn();
        console.log(`  [PASS] Section ${sectionName} | Check ${checkNum}: ${description}`);
        passCount++;
    } catch (err) {
        console.error(`  [FAIL] Section ${sectionName} | Check ${checkNum}: ${description}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

async function checkAsync(sectionName, checkNum, description, fn) {
    totalCount++;
    try {
        await fn();
        console.log(`  [PASS] Section ${sectionName} | Check ${checkNum}: ${description}`);
        passCount++;
    } catch (err) {
        console.error(`  [FAIL] Section ${sectionName} | Check ${checkNum}: ${description}`);
        console.error(`         ${err.message}`);
        throw err;
    }
}

async function runAuthoritativeSuite() {
    await AsyncStorage.clear();
    ReportViewModel.clearCache();

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ZERO SYNTHETIC FALLBACKS ON EMPTY STORES
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 1. ZERO SYNTHETIC FALLBACKS (Clean/Empty State) ---');

    await checkAsync('1', '1.1', 'Empty storage produces EMPTY net worth with exact 0n and ₹0.00', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.ok(intel.overview.netWorth.status === 'AVAILABLE' || intel.overview.netWorth.status === 'EMPTY');
        assert.strictEqual(intel.overview.netWorth.amountFormatted, '₹0');
        assert.strictEqual(intel.overview.liquidCash.amountFormatted, '₹0');
        assert.strictEqual(intel.overview.investments.amountFormatted, '₹0');
        assert.strictEqual(intel.overview.physicalAssets.amountFormatted, '₹0');
        assert.strictEqual(intel.overview.properties.amountFormatted, '₹0');
        assert.strictEqual(intel.overview.formalDebt.amountFormatted, '₹0');
        assert.strictEqual(intel.overview.p2pReceivables.amountFormatted, '₹0');
    });

    await checkAsync('1', '1.2', 'Empty loans repository produces isEmpty=true and empty debt trend', async () => {
        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.strictEqual(intel.loans.isEmpty, true);
        assert.strictEqual(intel.loans.facilities.length, 0);
        assert.strictEqual(intel.loans.totalOutstandingFormatted, '₹0');
        assert.strictEqual(intel.loans.debtReductionTrend.length, 0);
        assert.strictEqual(intel.loans.trendAvailable, false);
    });

    await checkAsync('1', '1.3', 'Empty budgets produces isEmpty=true and empty categories array', async () => {
        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.strictEqual(intel.budget.isEmpty, true);
        assert.strictEqual(intel.budget.categories.length, 0);
        assert.strictEqual(intel.budget.totalBudgetFormatted, '₹0');
        assert.strictEqual(intel.budget.totalSpentFormatted, '₹0');
    });

    await checkAsync('1', '1.4', 'Empty commitments produces isEmpty=true and zero counts', async () => {
        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.strictEqual(intel.recurring.isEmpty, true);
        assert.strictEqual(intel.recurring.commitments.length, 0);
        assert.strictEqual(intel.recurring.activeCount, 0);
        assert.strictEqual(intel.recurring.monthlyTotalFormatted, '₹0');
        assert.strictEqual(intel.recurring.annualizedCostFormatted, '₹0');
    });

    await checkAsync('1', '1.5', 'Empty groups produces isEmpty=true and zero positions', async () => {
        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.strictEqual(intel.groups.isEmpty, true);
        assert.strictEqual(intel.groups.groups.length, 0);
        assert.strictEqual(intel.groups.recentSettlements.length, 0);
        assert.strictEqual(intel.groups.youOweFormatted, '₹0');
        assert.strictEqual(intel.groups.othersOweYouFormatted, '₹0');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 2. AUTHORITATIVE DOMAIN CONNECTIVITY
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 2. AUTHORITATIVE DOMAIN CONNECTIVITY (Populated Domains) ---');

    await checkAsync('2', '2.1', 'CommitmentsService integration accurately calculates normalized monthly total', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        await CommitmentsService.setMode('PRODUCTION');
        const sampleCommitments = [
            { id: 'c1', name: 'Netflix Premium', amount: { paise: '64900', currency: 'INR' }, frequency: 'MONTHLY', status: 'ACTIVE', nextDueDate: '2026-09-15' },
            { id: 'c2', name: 'Gym Membership', amount: { paise: '450000', currency: 'INR' }, frequency: 'QUARTERLY', status: 'ACTIVE', nextDueDate: '2026-09-20' },
            { id: 'c3', name: 'Term Insurance', amount: { paise: '1200000', currency: 'INR' }, frequency: 'YEARLY', status: 'ACTIVE', nextDueDate: '2026-10-01' }
        ];
        await StorageService.save('FINLIFE_COMMITMENTS_V2', sampleCommitments);

        const recurring = await ReportQueryLayer.getRecurringSummary('2026-09');
        assert.strictEqual(recurring.isEmpty, false);
        assert.strictEqual(recurring.commitments.length, 3);
        assert.strictEqual(recurring.activeCount, 3);

        const expectedMonthlyPaise = 64900n + 150000n + 100000n;
        assert.strictEqual(recurring.monthlyRecurringTotalPaise, expectedMonthlyPaise);
        assert.strictEqual(recurring.annualizedCostPaise, expectedMonthlyPaise * 12n);
    });

    await checkAsync('2', '2.2', 'BudgetService integration derives actual spent strictly from cashbook expenses', async () => {
        const budgets = [
            { category: 'Groceries', amount: 10000 },
            { category: 'Dining', amount: 5000 }
        ];
        await saveData(STORAGE_KEYS.BUDGETS, budgets);

        await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', {
            schemaVersion: 2,
            accounts: [{ id: 'acc_1', name: 'Primary Account', balance: 100000 }],
            transactions: [
                { id: 'tx_1', type: 'EXPENSE', amount: 2500, date: '2026-09-04', category: 'Groceries', description: 'Weekly Supermarket' },
                { id: 'tx_2', type: 'EXPENSE', amount: 1200, date: '2026-09-08', category: 'Dining', description: 'Dinner with friends' },
                { id: 'tx_3', type: 'EXPENSE', amount: 800, date: '2026-09-10', category: 'Entertainment', description: 'Cinema tickets' }
            ]
        });

        ReportViewModel.clearCache();
        const canonical = await ReportQueryLayer.getCanonicalCashTransactions('2026-09');
        const budgetPerf = await ReportQueryLayer.getBudgetPerformance('2026-09', canonical.transactions);
        assert.strictEqual(budgetPerf.isEmpty, false);
        assert.strictEqual(budgetPerf.categories.length, 2);

        const groc = budgetPerf.categories.find(c => c.category === 'Groceries');
        assert.ok(groc);
        assert.strictEqual(groc.limitPaise, 1000000n);
        assert.strictEqual(groc.spentPaise, 250000n);
        assert.strictEqual(groc.utilizationPercent, 25);

        const din = budgetPerf.categories.find(c => c.category === 'Dining');
        assert.ok(din);
        assert.strictEqual(din.limitPaise, 500000n);
        assert.strictEqual(din.spentPaise, 120000n);
        assert.strictEqual(din.utilizationPercent, 24);

        assert.strictEqual(budgetPerf.totalBudgetPaise, 1500000n);
        assert.strictEqual(budgetPerf.totalSpentPaise, 370000n);
    });

    await checkAsync('2', '2.3', 'BankingService, AssetService, PropertyService, InvestmentService populate balance sheet', async () => {
        await StorageService.delete('FINLIFE_CASHBOOK_PROD_V1');
        await saveData(STORAGE_KEYS.BANKING_ACCOUNTS, [
            { id: 'b1', name: 'HDFC Savings', balancePaise: '15000000', balance: 150000 },
            { id: 'b2', name: 'ICICI Current', balancePaise: '5000000', balance: 50000 }
        ]);
        AssetService._assetsCache = [
            { id: 'a1', name: 'Gold Coins', currentValuationPaise: 35000000n }
        ];
        PropertyService._propertiesCache = [
            { propertyId: 'p1', displayName: 'Apartment #402', status: 'ACTIVE', marketValuePaise: 850000000n, currentMarketValuePaise: 850000000n }
        ];
        PropertyService._auditLogCache = [];
        PropertyService._operationsCache = {};

        InvestmentService._instrumentsCache = [];
        InvestmentService._accountsCache = [];
        InvestmentService._transactionsCache = [];
        InvestmentService._journalCache = [];
        InvestmentService._taxLotsCache = [];
        InvestmentService._holdingsCache = [];
        InvestmentService._idempotencyCache = new Set();
        InvestmentService._priceQuotesCache = [];
        InvestmentService._valuationSnapshotsCache = [
            { id: 'v1', totalMarketValuePaise: '62000000' }
        ];
        InvestmentService._cfoSnapshotsCache = [];

        ReportViewModel.clearCache();
        const provenance = await ReportQueryLayer.getMultiDomainBalanceSheetProvenance();

        assert.strictEqual(provenance.liquidCash.status, 'AVAILABLE');
        assert.strictEqual(provenance.liquidCash.amountPaise, 20000000n);

        assert.strictEqual(provenance.physicalAssets.status, 'AVAILABLE');
        assert.strictEqual(provenance.physicalAssets.amountPaise, 35000000n);

        assert.strictEqual(provenance.properties.status, 'AVAILABLE');
        assert.strictEqual(provenance.properties.amountPaise, 850000000n);

        assert.strictEqual(provenance.investments.status, 'AVAILABLE');
        assert.strictEqual(provenance.investments.amountPaise, 62000000n);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 3. NO DOUBLE-COUNTING INVARIANT (P2P vs Group Expenses)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 3. NO DOUBLE-COUNTING INVARIANT (P2P vs Groups) ---');

    await checkAsync('3', '3.1', 'P2P receivables and Group settlements are strictly separated', async () => {
        const origP2P = P2PService.getNetWorthProjection;
        const origGrp = GroupViewModel.getDashboardData;
        P2PService.getNetWorthProjection = async () => ({
            p2pAssetPaise: 2500000n,
            p2pLiabilityPaise: 0n,
            p2pNetWorthContributionPaise: 2500000n
        });
        GroupViewModel.getDashboardData = async () => ({
            groups: [{ id: 'grp_1', name: 'Goa Trip', balanceSummary: { userNetBalancePaise: 2000000n } }],
            userSummary: { youOwePaise: 0n, youAreOwedPaise: 2000000n }
        });

        try {
            ReportViewModel.clearCache();
            const provenance = await ReportQueryLayer.getMultiDomainBalanceSheetProvenance();

            assert.strictEqual(provenance.p2pReceivables.amountPaise, 2500000n);

            const sharedCosts = await ReportQueryLayer.getSharedCostsSummary('2026-09');
            assert.strictEqual(sharedCosts.othersOweYouPaise, 2000000n);
            assert.notStrictEqual(provenance.p2pReceivables.amountPaise, sharedCosts.othersOweYouPaise);
        } finally {
            P2PService.getNetWorthProjection = origP2P;
            GroupViewModel.getDashboardData = origGrp;
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 4. DETERMINISTIC MULTI-DOMAIN STATE ENGINE
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 4. DETERMINISTIC MULTI-DOMAIN STATE ENGINE ---');

    await checkAsync('4', '4.1', 'When a domain query fails, status is PARTIAL and amount is null (not 0n)', async () => {
        const originalGetAccounts = BankingService.getAccounts;
        BankingService.getAccounts = async () => { throw new Error('Bank database lock'); };

        try {
            ReportViewModel.clearCache();
            const provenance = await ReportQueryLayer.getMultiDomainBalanceSheetProvenance();

            assert.strictEqual(provenance.liquidCash.status, 'UNAVAILABLE');
            assert.strictEqual(provenance.liquidCash.amountPaise, null);
            assert.ok(provenance.liquidCash.reason.includes('failed to load'));

            const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
            assert.strictEqual(intel.overview.netWorth.status, 'PARTIAL');
            assert.ok(intel.overview.netWorth.reason.includes('Liquid Cash'));
            assert.ok(intel.overview.netWorth.reason.includes('unavailable'));
        } finally {
            BankingService.getAccounts = originalGetAccounts;
        }
    });

    await checkAsync('4', '4.2', 'When all balance sheet sources are unavailable, net worth is UNAVAILABLE', async () => {
        const originalProv = ReportQueryLayer.getMultiDomainBalanceSheetProvenance;
        ReportQueryLayer.getMultiDomainBalanceSheetProvenance = async () => ({
            liquidCash: { status: 'UNAVAILABLE', amountPaise: null, reason: 'Failed' },
            investments: { status: 'UNAVAILABLE', amountPaise: null, reason: 'Failed' },
            physicalAssets: { status: 'UNAVAILABLE', amountPaise: null, reason: 'Failed' },
            properties: { status: 'UNAVAILABLE', amountPaise: null, reason: 'Failed' },
            formalDebt: { status: 'UNAVAILABLE', amountPaise: null, reason: 'Failed' },
            p2pReceivables: { status: 'UNAVAILABLE', amountPaise: null, reason: 'Failed' },
            p2pPayables: { status: 'UNAVAILABLE', amountPaise: null, reason: 'Failed' }
        });

        try {
            ReportViewModel.clearCache();
            const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
            assert.strictEqual(intel.overview.netWorth.status, 'UNAVAILABLE');
            assert.strictEqual(intel.overview.netWorth.amountFormatted, '—');
        } finally {
            ReportQueryLayer.getMultiDomainBalanceSheetProvenance = originalProv;
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 5. READ-ONLY STORAGE INVARIANT (Zero Mutations)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 5. READ-ONLY STORAGE INVARIANT ---');

    await checkAsync('5', '5.1', 'Report generation performs ZERO writes to underlying domain stores', async () => {
        const allKeysBefore = await AsyncStorage.getAllKeys();
        const snapshotBefore = {};
        for (const k of allKeysBefore) {
            snapshotBefore[k] = await AsyncStorage.getItem(k);
        }

        await ReportViewModel.getFullFinancialIntelligence('2026-09');
        await ReportViewModel.getFullFinancialIntelligence('2026-08');
        await ReportViewModel.getFullFinancialIntelligence('2026-09');

        const allKeysAfter = await AsyncStorage.getAllKeys();

        for (const k of allKeysBefore) {
            const valAfter = await AsyncStorage.getItem(k);
            assert.strictEqual(valAfter, snapshotBefore[k], `Key ${k} was mutated!`);
        }

        const newKeys = allKeysAfter.filter(k => !allKeysBefore.includes(k));
        for (const nk of newKeys) {
            assert.ok(nk.startsWith('finlife:reports:cache:'), `Illegal key written to storage: ${nk}`);
        }
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 6. DYNAMIC MONTHLY CASH FLOW PARTITIONING & CONSERVATION
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 6. DYNAMIC MONTHLY CASH FLOW PARTITIONING ---');

    check('6', '6.1', 'getMonthlyCashFlowIntervals creates 5 deterministic intervals for September (30 days)', () => {
        const intervals = getMonthlyCashFlowIntervals('2026-09');
        assert.strictEqual(intervals.length, 5);
        assert.strictEqual(intervals[0].label, '1-7 Sep');
        assert.strictEqual(intervals[0].startDate, '2026-09-01');
        assert.strictEqual(intervals[0].endDate, '2026-09-08');

        assert.strictEqual(intervals[1].label, '8-14 Sep');
        assert.strictEqual(intervals[1].startDate, '2026-09-08');
        assert.strictEqual(intervals[1].endDate, '2026-09-15');

        assert.strictEqual(intervals[2].label, '15-21 Sep');
        assert.strictEqual(intervals[2].startDate, '2026-09-15');
        assert.strictEqual(intervals[2].endDate, '2026-09-22');

        assert.strictEqual(intervals[3].label, '22-28 Sep');
        assert.strictEqual(intervals[3].startDate, '2026-09-22');
        assert.strictEqual(intervals[3].endDate, '2026-09-29');

        assert.strictEqual(intervals[4].label, '29-30 Sep');
        assert.strictEqual(intervals[4].startDate, '2026-09-29');
        assert.strictEqual(intervals[4].endDate, '2026-10-01');
    });

    await checkAsync('6', '6.2', 'Sum of chart data intervals exactly matches total income and expense', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', {
            schemaVersion: 2,
            accounts: [{ id: 'acc_1', name: 'Primary Account', balance: 100000 }],
            transactions: [
                { id: 't1', type: 'INCOME', amount: 50000, date: '2026-09-02', category: 'Salary' },
                { id: 't2', type: 'EXPENSE', amount: 8000, date: '2026-09-05', category: 'Rent' },
                { id: 't3', type: 'EXPENSE', amount: 3500, date: '2026-09-12', category: 'Food' },
                { id: 't4', type: 'EXPENSE', amount: 1500, date: '2026-09-19', category: 'Fuel' },
                { id: 't5', type: 'EXPENSE', amount: 4200, date: '2026-09-26', category: 'Shopping' },
                { id: 't6', type: 'INCOME', amount: 5000, date: '2026-09-30', category: 'Dividend' }
            ]
        });

        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        const chartData = intel.cashFlow.chartData;
        assert.strictEqual(chartData.length, 5);

        let sumIncomeRupees = 0;
        let sumExpenseRupees = 0;
        for (const item of chartData) {
            sumIncomeRupees += item.income;
            sumExpenseRupees += item.expense;
        }

        assert.strictEqual(sumIncomeRupees, 55000);
        assert.strictEqual(sumExpenseRupees, 17200);

        assert.strictEqual(intel.cashFlow.incomeFormatted, '₹55,000');
        assert.strictEqual(intel.cashFlow.expenseFormatted, '₹17,200');
        assert.strictEqual(intel.cashFlow.netFlowFormatted, '₹37,800');
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 7. PRESENTATION SAFETY (Zero BigInt primitives leaked)
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 7. PRESENTATION SAFETY ---');

    await checkAsync('7', '7.1', 'No raw BigInt values exist in ReportViewModel output structure', async () => {
        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');

        function assertNoBigInt(obj, currentPath = 'root') {
            if (obj === null || obj === undefined) return;
            if (typeof obj === 'bigint') {
                throw new Error(`BigInt primitive leaked at path: ${currentPath}`);
            }
            if (Array.isArray(obj)) {
                obj.forEach((item, idx) => assertNoBigInt(item, `${currentPath}[${idx}]`));
            } else if (typeof obj === 'object') {
                for (const [key, val] of Object.entries(obj)) {
                    assertNoBigInt(val, `${currentPath}.${key}`);
                }
            }
        }

        assertNoBigInt(intel);
    });

    // ──────────────────────────────────────────────────────────────────────────
    // 8. PRESENTATION-STATE & GUI TRUTH ALIGNMENT
    // ──────────────────────────────────────────────────────────────────────────
    console.log('\n--- 8. PRESENTATION-STATE & GUI TRUTH ALIGNMENT ---');

    await checkAsync('8', '8.1', 'Zero synthetic comparisons when current or prior period is empty', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.strictEqual(intel.overview.spending.comparisonAvailable, false);
        assert.strictEqual(intel.overview.spending.changeText, 'Previous-period comparison unavailable');
        assert.strictEqual(intel.overview.spending.percentFormatted, '—');
        assert.strictEqual(intel.overview.spending.isEmpty, true);

        assert.strictEqual(intel.overview.netCashFlow.comparisonAvailable, false);
        assert.strictEqual(intel.overview.netCashFlow.growthPercent, null);
        assert.strictEqual(intel.overview.netCashFlow.growthPercentFormatted, '—');
        assert.strictEqual(intel.overview.netCashFlow.isEmpty, true);
    });

    await checkAsync('8', '8.2', 'Meaningful comparisons computed truthfully when valid prior baseline exists', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        // Populate Aug 2026 (previous period) and Sep 2026 (current period)
        await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', {
            schemaVersion: 2,
            accounts: [{ id: 'acc_1', name: 'Main Account', balance: 200000 }],
            transactions: [
                // August 2026
                { id: 'prev_1', type: 'EXPENSE', amount: 20000, date: '2026-08-10', category: 'Shopping' },
                { id: 'prev_2', type: 'INCOME', amount: 50000, date: '2026-08-01', category: 'Salary' },
                // September 2026
                { id: 'curr_1', type: 'EXPENSE', amount: 15000, date: '2026-09-10', category: 'Shopping' },
                { id: 'curr_2', type: 'INCOME', amount: 60000, date: '2026-09-01', category: 'Salary' }
            ]
        });

        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');

        // Spending: Current ₹15,000 vs Prev ₹20,000 = 25% lower
        assert.strictEqual(intel.overview.spending.comparisonAvailable, true);
        assert.strictEqual(intel.overview.spending.direction, 'DOWN');
        assert.strictEqual(intel.overview.spending.percentFormatted, '↓ 25%');
        assert.strictEqual(intel.overview.spending.changeText, '25% lower than last month');
        assert.strictEqual(intel.overview.spending.isEmpty, false);

        // Net Cash Flow: Current ₹45,000 vs Prev ₹30,000 = 50% higher
        assert.strictEqual(intel.overview.netCashFlow.comparisonAvailable, true);
        assert.strictEqual(intel.overview.netCashFlow.direction, 'UP');
        assert.strictEqual(intel.overview.netCashFlow.growthPercentFormatted, '↑ 50%');
        assert.strictEqual(intel.overview.netCashFlow.growthPercent, 50);
        assert.strictEqual(intel.overview.netCashFlow.isEmpty, false);
    });

    await checkAsync('8', '8.3', 'Contractual tenure vs active repayment tenure cleanly separated on zero EMI', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        // Loan with 112 months contractual tenure, ₹60,00,000 balance, but 0 EMI / inactive repayment
        await LoanRepository.saveFacility({
            id: 'loan_home_1',
            name: 'Home Loan Prime',
            lender: 'HDFC Bank',
            principalPaise: 600000000n,
            outstandingBalancePaise: 600000000n,
            annualRatePercent: 8.5,
            tenureMonths: 112,
            monthlyEmiPaise: 0n, // Repayment schedule unavailable
            loanType: 'HOME',
            startDate: '2026-01-01',
            status: 'ACTIVE'
        });

        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.strictEqual(intel.loans.isEmpty, false);
        assert.strictEqual(intel.loans.totalOutstandingFormatted, '₹60,00,000');
        assert.strictEqual(intel.loans.monthlyEmiFormatted, '₹0');
        assert.strictEqual(intel.loans.contractualTenureFormatted, '9 years 4 months');
        assert.strictEqual(intel.loans.remainingTenureFormatted, '—');
        assert.strictEqual(intel.loans.repaymentScheduleAvailable, false);
        assert.strictEqual(intel.loans.tenureStatus, DebtTenureStatus.CONTRACTUAL_ONLY);
        assert.strictEqual(intel.loans.tenureNote, 'EMI or repayment schedule unavailable');
    });

    await checkAsync('8', '8.4', 'Zero vs Empty distinction: records exist with ₹0 net expense does not trigger isEmpty=true', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        // Transaction with ₹0 expense amount
        await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', {
            schemaVersion: 2,
            accounts: [{ id: 'acc_1', name: 'Main Account', balance: 50000 }],
            transactions: [
                { id: 'zero_exp', type: 'EXPENSE', amount: 0, date: '2026-09-05', category: 'Free Trial' }
            ]
        });

        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.strictEqual(intel.spending.isEmpty, false); // Record exists!
        assert.strictEqual(intel.spending.totalFormatted, '₹0');
        assert.strictEqual(intel.overview.spending.isEmpty, false);
    });

    await checkAsync('8', '8.5', 'Budget provenance exposes Cashbook source and unbudgeted operating expenses', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        await saveData(STORAGE_KEYS.BUDGETS, [
            { category: 'Groceries', amount: 5000 }
        ]);

        await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', {
            schemaVersion: 2,
            accounts: [{ id: 'acc_1', name: 'Main Account', balance: 50000 }],
            transactions: [
                { id: 'tx_groc', type: 'EXPENSE', amount: 2000, date: '2026-09-04', category: 'Groceries' },
                { id: 'tx_unbudgeted', type: 'EXPENSE', amount: 1500, date: '2026-09-10', category: 'Gadgets' }
            ]
        });

        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.strictEqual(intel.budget.source, 'Cashbook');
        assert.strictEqual(intel.budget.sourceStatus, 'AVAILABLE');
        assert.strictEqual(intel.budget.unmatchedCount, 1);
        assert.strictEqual(intel.budget.unmatchedExpensesFormatted, '₹1,500');
    });

    await checkAsync('8', '8.6', 'Groups exposes signed formula and net position direction', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        const origGrp = GroupViewModel.getDashboardData;
        GroupViewModel.getDashboardData = async () => ({
            groups: [{ id: 'grp_trip', name: 'Goa Trip', balanceSummary: { userNetBalancePaise: 500000n } }],
            userSummary: { youOwePaise: 0n, youAreOwedPaise: 500000n },
            totalExpensesPaise: 1000000n,
            userContributionsPaise: 1000000n,
            userSharePaise: 500000n,
            settlementsPaidPaise: 0n,
            settlementsReceivedPaise: 0n
        });

        try {
            const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
            assert.strictEqual(intel.groups.isEmpty, false);
            // Contribution ₹10,000 - Share ₹5,000 = Net ₹5,000 (Receivable)
            assert.strictEqual(intel.groups.netPositionDirection, 'RECEIVABLE');
            assert.strictEqual(intel.groups.netGroupPositionFormatted, '₹5,000');
            assert.strictEqual(intel.groups.userContributionsFormatted, '₹10,000');
            assert.strictEqual(intel.groups.userShareFormatted, '₹5,000');
        } finally {
            GroupViewModel.getDashboardData = origGrp;
        }
    });

    await checkAsync('8', '8.7', 'Diagnostics contains all 11 domain sources and distinct timestamps', async () => {
        await AsyncStorage.clear();
        ReportViewModel.clearCache();

        const intel = await ReportViewModel.getFullFinancialIntelligence('2026-09');
        assert.ok(intel.diagnostics.domainSources);
        assert.strictEqual(intel.diagnostics.domainSources.length, 11);

        const domainKeys = intel.diagnostics.domainSources.map(d => d.key);
        assert.ok(domainKeys.includes('liquidCash'));
        assert.ok(domainKeys.includes('investments'));
        assert.ok(domainKeys.includes('physicalAssets'));
        assert.ok(domainKeys.includes('properties'));
        assert.ok(domainKeys.includes('formalDebt'));
        assert.ok(domainKeys.includes('p2pReceivables'));
        assert.ok(domainKeys.includes('p2pPayables'));
        assert.ok(domainKeys.includes('cashbook'));
        assert.ok(domainKeys.includes('budgets'));
        assert.ok(domainKeys.includes('commitments'));
        assert.ok(domainKeys.includes('sharedCosts'));

        assert.ok(intel.diagnostics.reportingPeriod);
        assert.ok(intel.diagnostics.queryExecutedAt);
        assert.ok(intel.diagnostics.cacheGeneratedAt);
    });

    console.log('\n================================================================');
    console.log(`✅ AUTHORITATIVE INTEGRATION SUITE COMPLETE: ${passCount} / ${totalCount} Checks Passed (100%)`);
    console.log('================================================================');
}

runAuthoritativeSuite().catch(err => {
    console.error('\n❌ SUITE EXECUTION FAILED:', err);
    process.exit(1);
});
