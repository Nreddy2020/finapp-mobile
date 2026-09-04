/**
 * FinLife Smart Budgets & Financial Control Center — Decision Engine Test Suite
 * Rigorous automated tests verifying pure mathematical calculations, period resolution,
 * safe-to-spend invariants, run-rate risk evaluation, and loan DSR simulation.
 */

import assert from 'assert';
import {
    resolveBudgetPeriod,
    ALLOCATION_STRATEGIES,
    RISK_LEVEL,
    VIABILITY_STATUS
} from '../services/budget/budgetContracts.js';
import {
    computeSafeToSpend,
    computeCategoryRunRate,
    computeAllocationBreakdown,
    simulateLifeEventLoan,
    computeCashFlowProjection,
    generateExplainableCategoryInsight
} from '../services/budget/budgetEngine.js';

console.log('================================================================');
console.log('=== FINLIFE BUDGET DECISION ENGINE SPECIFICATION SUITE       ===');
console.log('================================================================\n');

let passedTests = 0;
let totalTests = 0;

function it(name, testFn) {
    totalTests++;
    try {
        testFn();
        passedTests++;
        console.log(`  ✓ ${name}`);
    } catch (err) {
        console.error(`  ✗ ${name}`);
        console.error(`    ${err.message}`);
        throw err;
    }
}

// 1. Budget Period Resolution Invariants
console.log('Group 1: Budget Period Resolution & Time Boundary Invariants');
it('should resolve standard 30-day month (September)', () => {
    const period = resolveBudgetPeriod({ selectedMonth: '2026-09', now: new Date(2026, 8, 5) });
    assert.strictEqual(period.id, '2026-09');
    assert.strictEqual(period.daysInPeriod, 30);
    assert.strictEqual(period.daysElapsed, 5);
    assert.strictEqual(period.daysRemaining, 25);
    assert.strictEqual(period.status, 'ACTIVE');
});

it('should correctly handle February in a leap year (2024 = 29 days)', () => {
    const period = resolveBudgetPeriod({ selectedMonth: '2024-02', now: new Date(2024, 1, 10) });
    assert.strictEqual(period.daysInPeriod, 29);
});

it('should correctly handle February in a non-leap year (2026 = 28 days)', () => {
    const period = resolveBudgetPeriod({ selectedMonth: '2026-02', now: new Date(2026, 1, 10) });
    assert.strictEqual(period.daysInPeriod, 28);
});

it('should mark past months as HISTORICAL with 0 days remaining', () => {
    const period = resolveBudgetPeriod({ selectedMonth: '2025-05', now: new Date(2026, 8, 5) });
    assert.strictEqual(period.status, 'HISTORICAL');
    assert.strictEqual(period.daysRemaining, 0);
    assert.strictEqual(period.daysElapsed, 31);
});

// 2. Safe-to-Spend Multi-Concept Separation Invariants
console.log('\nGroup 2: Safe-to-Spend & Multi-Concept Money Separation');
it('should compute safe-to-spend total and daily pace accurately', () => {
    const res = computeSafeToSpend({
        currentCash: 37500,
        committedBeforePeriodEnd: 20000,
        reservedForGoals: 5000,
        safetyBuffer: 2500,
        remainingDays: 10
    });
    // Net: 37500 - (20000 + 5000 + 2500) = 10000
    // Daily pace: 10000 / 10 = 1000
    assert.strictEqual(res.safeToSpendTotal, 10000);
    assert.strictEqual(res.recommendedDailyDiscretionarySpend, 1000);
    assert.strictEqual(res.safeToSpendToday, 1000);
    assert.strictEqual(res.isDeficit, false);
    assert.strictEqual(res.uncoveredCommitments, 0);
});

it('should clamp safe-to-spend to 0 and report deficit when commitments exceed cash', () => {
    const res = computeSafeToSpend({
        currentCash: 15000,
        committedBeforePeriodEnd: 20000,
        reservedForGoals: 0,
        safetyBuffer: 5000,
        remainingDays: 12
    });
    // Net: 15000 - 25000 = -10000
    assert.strictEqual(res.safeToSpendTotal, 0);
    assert.strictEqual(res.recommendedDailyDiscretionarySpend, 0);
    assert.strictEqual(res.isDeficit, true);
    assert.strictEqual(res.uncoveredCommitments, 10000);
});

it('should prevent division by zero when remaining days is 0', () => {
    const res = computeSafeToSpend({
        currentCash: 10000,
        committedBeforePeriodEnd: 2000,
        reservedForGoals: 0,
        safetyBuffer: 0,
        remainingDays: 0
    });
    assert.strictEqual(res.safeToSpendTotal, 8000);
    assert.strictEqual(res.recommendedDailyDiscretionarySpend, 8000); // divided by max(1, 0)
});

it('should retain negative cash position and flag isOverdraft without silent zero masking', () => {
    const res = computeSafeToSpend({
        currentCash: -2000,
        committedBeforePeriodEnd: 5000,
        reservedForGoals: 0,
        safetyBuffer: 1000,
        remainingDays: 10
    });
    assert.strictEqual(res.currentCash, -2000);
    assert.strictEqual(res.actualCash, -2000);
    assert.strictEqual(res.isOverdraft, true);
    assert.strictEqual(res.isDeficit, true);
    assert.strictEqual(res.safeToSpendTotal, 0);
    assert.strictEqual(res.recommendedDailyDiscretionarySpend, 0);
    assert.strictEqual(res.uncoveredCommitments, 8000);
});

// 3. Category Run-Rate & Multivariate Risk Evaluation
console.log('\nGroup 3: Category Run-Rate & Multivariate Risk Evaluation');
it('should evaluate safe category within normal pace', () => {
    const res = computeCategoryRunRate({
        spent: 2500,
        budgetLimit: 8000,
        daysElapsed: 15,
        daysInPeriod: 30
    });
    assert.strictEqual(res.remaining, 5500);
    assert.strictEqual(res.dailyAverage, 166.67);
    assert.strictEqual(res.allowedDailyAverage, 366.67);
    assert.strictEqual(res.projectedSpend, 5000);
    assert.strictEqual(res.riskLevel, RISK_LEVEL.SAFE);
});

it('should detect AT_RISK when daily velocity projects budget exhaustion early', () => {
    const res = computeCategoryRunRate({
        spent: 9200,
        budgetLimit: 10000,
        daysElapsed: 18,
        daysInPeriod: 30
    });
    // 9200 / 18 = 511.11 / day. 12 days remaining -> projected 9200 + 6133 = 15333
    assert.strictEqual(res.riskLevel, RISK_LEVEL.AT_RISK);
    assert.ok(res.overspendAmount > 5000);
    assert.ok(res.daysUntilBudgetExhausted < 12);
});

it('should assign HIGH confidence when 15 or more days elapsed', () => {
    const res = computeCategoryRunRate({
        spent: 5000,
        budgetLimit: 10000,
        daysElapsed: 16,
        daysInPeriod: 30
    });
    assert.strictEqual(res.confidence, 'HIGH');
});

it('should blend current run-rate with historical average when historicalAverage is provided', () => {
    const res = computeCategoryRunRate({
        spent: 6000,
        budgetLimit: 12000,
        daysElapsed: 10,
        daysInPeriod: 30,
        historicalAverage: 9000
    });
    // rawDaily = 6000 / 10 = 600. histDaily = 9000 / 30 = 300.
    // blended = 0.7 * 600 + 0.3 * 300 = 420 + 90 = 510.
    // projected = 6000 + 510 * 20 = 16200.
    assert.strictEqual(res.forecastMethod, 'BLEND_CURRENT_AND_HISTORICAL');
    assert.strictEqual(res.projectedSpend, 16200);
    assert.strictEqual(res.riskLevel, RISK_LEVEL.AT_RISK);
});

// 4. Multi-Paradigm Allocation Engine
console.log('\nGroup 4: Multi-Paradigm Allocation Engine');
it('should compute 50/30/20 target breakdown and divergence accurately', () => {
    const budgets = [
        { category: 'Rent', limit: 30000, spent: 30000, type: 'Needs' },
        { category: 'Groceries', limit: 20000, spent: 24000, type: 'Needs' },
        { category: 'Dining Out', limit: 15000, spent: 15000, type: 'Wants' },
        { category: 'Savings', limit: 15000, spent: 10000, type: 'Future' }
    ];
    const res = computeAllocationBreakdown({
        income: 100000,
        budgets,
        strategy: ALLOCATION_STRATEGIES['50/30/20']
    });
    assert.strictEqual(res.recommended.Needs, 50000);
    assert.strictEqual(res.recommended.Wants, 30000);
    assert.strictEqual(res.recommended.Future, 20000);
    assert.strictEqual(res.actual.Needs, 54000); // 54% -> divergence +4%
    assert.strictEqual(res.divergences.Needs, 4);
});

it('should evaluate Zero-Based allocation balance', () => {
    const budgets = [
        { category: 'Needs', limit: 50000, spent: 50000, type: 'Needs' },
        { category: 'Wants', limit: 30000, spent: 30000, type: 'Wants' },
        { category: 'Future', limit: 20000, spent: 20000, type: 'Future' }
    ];
    const res = computeAllocationBreakdown({
        income: 100000,
        budgets,
        strategy: ALLOCATION_STRATEGIES['ZERO_BASED']
    });
    assert.strictEqual(res.unallocated, 0);
    assert.strictEqual(res.isBalanced, true);
});

it('should evaluate Zero-Based allocation with planned reserves included', () => {
    const budgets = [
        { category: 'Needs', limit: 50000, spent: 50000, type: 'Needs' },
        { category: 'Wants', limit: 30000, spent: 30000, type: 'Wants' },
        { category: 'Future', limit: 10000, spent: 10000, type: 'Future' }
    ];
    const res = computeAllocationBreakdown({
        income: 100000,
        budgets,
        strategy: ALLOCATION_STRATEGIES['ZERO_BASED'],
        reservedAmount: 10000
    });
    // totalAllocated = 90K, reservedAmount = 10K, plannedTotal = 100K -> unallocated = 0
    assert.strictEqual(res.totalAllocated, 90000);
    assert.strictEqual(res.reservedAmount, 10000);
    assert.strictEqual(res.plannedTotal, 100000);
    assert.strictEqual(res.unallocated, 0);
    assert.strictEqual(res.isBalanced, true);
});

it('should evaluate Debt-First strategy with configurable policy, reserve floor, and custom extra payment', () => {
    const budgets = [
        { category: 'Housing', limit: 30000, spent: 30000, type: 'Needs' },
        { category: 'Food', limit: 20000, spent: 20000, type: 'Needs' }
    ];
    const res = computeAllocationBreakdown({
        income: 100000,
        budgets,
        strategy: ALLOCATION_STRATEGIES['DEBT_FIRST'],
        existingDebtPayments: 15000,
        debtPolicy: {
            debtStrategy: 'AVALANCHE',
            minimumReserve: 10000,
            discretionaryFloor: 5000,
            extraDebtPayment: 15000
        }
    });
    assert.strictEqual(res.essentials, 50000);
    assert.strictEqual(res.debtMinimums, 15000);
    assert.strictEqual(res.minimumReserve, 10000);
    assert.strictEqual(res.extraDebtAllocation, 15000);
    assert.strictEqual(res.totalDebtServicing, 30000);
    assert.strictEqual(res.discretionaryRemaining, 10000);
    assert.ok(res.advice.includes('Debt Avalanche'));
});

// 5. Life-Event Loan Simulation & DSR Invariants
console.log('\nGroup 5: Life-Event Loan Simulation & DSR Invariants');
it('should compute home loan EMI and classify NOT_COMFORTABLE when shortfall occurs', () => {
    const res = simulateLifeEventLoan({
        price: 9000000,
        downPayment: 2000000,
        interestRate: 7.1,
        tenureYears: 20,
        currentMonthlySurplus: 37500,
        existingMonthlyDebtPayments: 0,
        monthlyIncome: 124000,
        safetyBuffer: 10000
    });
    assert.strictEqual(res.loanAmount, 7000000);
    assert.strictEqual(res.downPaymentPercentage, 22);
    // Standard EMI for 70L at 7.1% for 20 years ~ 54,700
    assert.ok(res.monthlyEMI >= 54000 && res.monthlyEMI <= 55500);
    assert.ok(res.monthlyShortfall > 15000);
    assert.strictEqual(res.viability, VIABILITY_STATUS.NOT_COMFORTABLE);
    assert.ok(res.alternatives.length > 0);
});

it('should classify COMFORTABLE when EMI is well within surplus and DSR is low', () => {
    const res = simulateLifeEventLoan({
        price: 1000000,
        downPayment: 300000,
        interestRate: 8.5,
        tenureYears: 5,
        currentMonthlySurplus: 40000,
        existingMonthlyDebtPayments: 0,
        monthlyIncome: 124000,
        safetyBuffer: 10000
    });
    // Loan: 700,000, 5 years at 8.5% ~ EMI ~ 14,359
    assert.ok(res.monthlyEMI < 15000);
    assert.strictEqual(res.monthlyShortfall, 0);
    assert.strictEqual(res.viability, VIABILITY_STATUS.COMFORTABLE);
});

// 6. Cash Flow Projection & Low Balance Window Detection
console.log('\nGroup 6: Cash Flow Daily Projection & Risk Window Detection');
it('should project daily balances and detect low-balance period', () => {
    const events = [
        { day: 5, amount: 20000, type: 'EXPENSE' },
        { day: 7, amount: 130000, type: 'EXPENSE' },
        { day: 30, amount: 124000, type: 'INCOME' }
    ];
    const res = computeCashFlowProjection({
        openingBalance: 140000,
        events,
        daysInPeriod: 30,
        safetyBuffer: 5000
    });
    // On day 5: 140K - 20K = 120K.
    // On day 7: 120K - 130K = -10K (breaches safety buffer 5K).
    assert.strictEqual(res.hasLowBalanceRisk, true);
    assert.ok(res.lowBalanceWindow !== null);
    assert.ok(res.lowBalanceWindow.startDay >= 7);
});

console.log(`\n================================================================`);
console.log(`=== TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED 🟢 (100%)              ===`);
console.log(`================================================================\n`);
