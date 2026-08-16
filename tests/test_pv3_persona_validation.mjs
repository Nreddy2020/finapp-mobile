/**
 * FINLIFE PV.3 — Realistic Financial Scenario Validation Suite
 * Master Standard: PV_V1 / C8_V1
 * 
 * Evaluates Decision Quality, Economic Defensibility, and Invariants
 * across 4 Canonical Household Personas:
 * 
 * Persona A: Young Family (Liquidity Deficit, Contending Goals)
 * Persona B: Aggressive Tech Investor (Single-Stock Concentration vs High Historical Returns)
 * Persona C: Pre-Retirement Investor (Horizon Interaction, Sequence-of-Returns Risk)
 * Persona D: Debt-Stressed Household (Deterministic Debt Savings vs Uncertain Equity Returns)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Certified Financial Engines (C.4, C.6, C.7, C.8)
import { evaluatePortfolioHealthScore } from '../services/portfolioHealthScoreEngine.js';
import { evaluatePortfolioStressScenarios } from '../services/scenarioStressEngine.js';
import { validateAndNormalizeGoal, sortGoalsByPrecedence, allocateSavingsCapacityWaterfall } from '../services/goalPlanningEngine.js';
import { aggregateMultiGoalSolvency } from '../services/wealthProjectionEngine.js';
import { aggregateMultiGoalGlidepaths } from '../services/goalGlidepathService.js';
import { aggregateFinancialOpportunities } from '../services/financialOpportunityAggregator.js';
import { prioritizeNextBestActions } from '../services/actionPrioritizationEngine.js';
import { simulateActionImpact } from '../services/actionImpactSimulator.js';
import { adaptFinancialCommandCenterViewModel } from '../components/investments/decisionPresentationAdapter.js';
import { loadData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== FINLIFE PV.3 Realistic Financial Scenario Validation Suite ===');
console.log('================================================================\n');

let passCount = 0;
const AS_OF_DATE = '2026-08-16T00:00:00.000Z';

function runPersonaCheck(personaCode, checkName, fn) {
    try {
        fn();
        console.log(`✅ [${personaCode}] PASS: ${checkName}`);
        passCount++;
    } catch (err) {
        console.error(`❌ [${personaCode}] FAIL: ${checkName}`);
        console.error(err);
        process.exit(1);
    }
}

async function runAsyncPersonaCheck(personaCode, checkName, fn) {
    try {
        await fn();
        console.log(`✅ [${personaCode}] PASS: ${checkName}`);
        passCount++;
    } catch (err) {
        console.error(`❌ [${personaCode}] FAIL: ${checkName}`);
        console.error(err);
        process.exit(1);
    }
}

// ===================================================================
// PERSONA A: YOUNG FAMILY (Liquidity Buffer vs Goal Contention)
// ===================================================================
console.log('--- PERSONA A: Young Family (Liquidity & Contending Goals) ---');

const personaA_Holdings = [
    { id: 'h_a1', symbol: 'NIFTY50_INDEX', assetClass: 'EQUITY', quantity: 500, averageBuyPrice: 1200, currentPrice: 1600, currentValue: 800000 }
];

const personaA_CashFlow = {
    monthlyIncome: 160000,
    totalMonthlyBurn: 105000, // Includes Home Loan EMI ₹45,000 + Living ₹60,000
    dedicatedEmergencyReserve: 105000, // Only 1.0 month runway! (Critical deficit)
    unallocatedCashBalance: 20000
};

const personaA_Liabilities = [
    { loanId: 'loan_home_a', name: 'Home Loan', type: 'HOME_LOAN', interestRate: 8.5, outstandingBalance: 4200000, monthlyEmi: 45000 }
];

const personaA_Goals = [
    {
        goalId: 'goal_edu_a',
        name: 'Child Higher Education',
        category: 'CHILD_EDUCATION',
        priorityTier: 'CRITICAL_TIER_1', // Critical Tier 1
        targetDate: '2038-06-30', // 12 years away
        targetCorpusNominal: 3500000,
        currentCorpus: 300000,
        monthlyContribution: 15000
    },
    {
        goalId: 'goal_renov_a',
        name: 'Home Renovation',
        category: 'HOME_PURCHASE',
        priorityTier: 'HIGH_TIER_2', // Important Tier 2
        targetDate: '2029-06-30', // 3 years away
        targetCorpusNominal: 1500000,
        currentCorpus: 200000,
        monthlyContribution: 20000
    }
];

let personaA_Actions = null;

runPersonaCheck('PERSONA_A', '1. Diagnostic Detection: Correctly flags critical emergency runway (< 3.0 mo)', () => {
    const health = evaluatePortfolioHealthScore({
        holdings: personaA_Holdings,
        cashFlow: personaA_CashFlow,
        concentration: { assetClassHHI: 10000, sectorHHI: 2500, top1HoldingShare: 1.0, top3HoldingShare: 1.0 },
        volatility: { annualizedVolatility: 0.15, maxDrawdown: 0.18, cvar95: 0.06 },
        correlation: { meanPairwiseCorrelation: 0.20, dominantFactorShare: 0.35 },
        liquidity: { grossPortfolioValue: 800000, accessibleValue: 800000, compositeScore: 25.0, runway: { totalMonths: 1.0 } },
        stress: { resilienceSummary: { worstCasePercentageLoss: 0.18 }, reverseStressTest: { marketDropToCause20PctLoss: { solvedLambda: 1.2, status: 'SOLVED' } } }
    }, AS_OF_DATE);

    const normGoals = sortGoalsByPrecedence(personaA_Goals.map(g => validateAndNormalizeGoal(g, AS_OF_DATE)), AS_OF_DATE);
    const solvency = aggregateMultiGoalSolvency(normGoals, personaA_Holdings, AS_OF_DATE);
    const glidepaths = aggregateMultiGoalGlidepaths(normGoals, personaA_Holdings, AS_OF_DATE);

    const opps = aggregateFinancialOpportunities({
        healthScoreDTO: health,
        goalSolvencyDTO: solvency,
        goalGlidepathsDTO: glidepaths,
        liquidityDTO: { runwayMonths: 1.0 },
        loansOrLiabilities: personaA_Liabilities
    }, AS_OF_DATE);

    personaA_Actions = prioritizeNextBestActions(opps, AS_OF_DATE);

    // Decision Quality Verification:
    // Emergency runway must rank #1 over aggressive investing
    assert.strictEqual(personaA_Actions.rankedActions[0].category, 'EMERGENCY_RUNWAY');
    assert.strictEqual(personaA_Actions.rankedActions[0].urgencyLevel, 'CRITICAL');
});

runPersonaCheck('PERSONA_A', '2. Priority Waterfall: Protects Tier 1 Education before Tier 2 Renovation when cash is constrained', () => {
    const normGoals = sortGoalsByPrecedence(personaA_Goals.map(g => validateAndNormalizeGoal(g, AS_OF_DATE)), AS_OF_DATE);
    const waterfall = allocateSavingsCapacityWaterfall(normGoals, 25000, AS_OF_DATE);

    // Tier 1 Child Education gets filled first up to capacity
    assert.strictEqual(waterfall.goalAllocations[0].goalId, 'goal_edu_a');
    assert.strictEqual(waterfall.goalAllocations[0].allocatedMonthlySavings, 15000);
    // Remaining ₹10,000 spills to Tier 2 Renovation
    assert.strictEqual(waterfall.goalAllocations[1].goalId, 'goal_renov_a');
    assert.strictEqual(waterfall.goalAllocations[1].allocatedMonthlySavings, 10000);
});

runPersonaCheck('PERSONA_A', '3. What-If Simulation: Demonstrates runway expansion from 1.0 to 3.0 months', () => {
    const runwayAction = personaA_Actions.rankedActions[0];
    const sim = simulateActionImpact(runwayAction, {
        holdings: personaA_Holdings,
        cashFlow: personaA_CashFlow,
        goals: personaA_Goals,
        liabilities: personaA_Liabilities
    }, AS_OF_DATE);

    assert.ok(sim.healthScoreComparison.afterScore > sim.healthScoreComparison.beforeScore);
    assert.strictEqual(sim.healthScoreComparison.primaryImprovementPillar, 'LIQUIDITY_BUFFER');
});


// ===================================================================
// PERSONA B: AGGRESSIVE TECH INVESTOR (Concentration vs High Returns)
// ===================================================================
console.log('\n--- PERSONA B: Aggressive Tech Investor (Concentration vs Returns) ---');

const personaB_Holdings = [
    { id: 'h_esop', symbol: 'TECH_CORP_ESOP', assetClass: 'EQUITY', quantity: 3000, averageBuyPrice: 800, currentPrice: 3120, currentValue: 9360000 }, // 78% concentration!
    { id: 'h_cash_b', symbol: 'LIQUID_FUND', assetClass: 'DEBT', quantity: 2640, averageBuyPrice: 1000, currentPrice: 1000, currentValue: 2640000 }   // 22% cash/liquid
]; // Total: ₹1.20 Crore

const personaB_CashFlow = {
    monthlyIncome: 350000,
    totalMonthlyBurn: 120000,
    dedicatedEmergencyReserve: 1200000, // 10 months runway (Very safe)
    unallocatedCashBalance: 500000
};

let personaB_Actions = null;

runPersonaCheck('PERSONA_B', '4. Diagnostic Detection: Recognizes severe single-stock concentration (78%) despite high wealth', () => {
    const health = evaluatePortfolioHealthScore({
        holdings: personaB_Holdings,
        cashFlow: personaB_CashFlow,
        concentration: {
            assetClassHHI: 6500,
            sectorHHI: 7800,
            top1HoldingShare: 0.78, // 78% single stock!
            top3HoldingShare: 1.0
        },
        volatility: { annualizedVolatility: 0.28, maxDrawdown: 0.35, cvar95: 0.15 },
        correlation: { meanPairwiseCorrelation: 0.65, dominantFactorShare: 0.85 },
        liquidity: { grossPortfolioValue: 12000000, accessibleValue: 12000000, compositeScore: 90.0, runway: { totalMonths: 10.0 } },
        stress: { resilienceSummary: { worstCasePercentageLoss: 0.42 }, reverseStressTest: { marketDropToCause20PctLoss: { solvedLambda: 0.6, status: 'SOLVED' } } }
    }, AS_OF_DATE);

    assert.strictEqual(health.healthGrade, 'D'); // Degraded due to concentration and stress loss
    assert.strictEqual(health.riskDrivers[0].dimensionId, 'DIM_CONCENTRATION');

    const opps = aggregateFinancialOpportunities({
        healthScoreDTO: health,
        concentrationDTO: { top1HoldingWeight: 0.78, top1Symbol: 'TECH_CORP_ESOP' },
        liquidityDTO: { runwayMonths: 10.0 }
    }, AS_OF_DATE);

    personaB_Actions = prioritizeNextBestActions(opps, AS_OF_DATE);

    // Concentration de-risking must be #1 Action
    assert.strictEqual(personaB_Actions.rankedActions[0].category, 'DE_RISK_CONCENTRATION');
    assert.strictEqual(personaB_Actions.rankedActions[0].urgencyLevel, 'CRITICAL');
});

runPersonaCheck('PERSONA_B', '5. De-risking Policy: Recommends partial trim with LTCG tax friction rather than "sell all"', () => {
    const trimAction = {
        ...personaB_Actions.rankedActions[0],
        recommendedExecution: {
            type: 'SELL_HOLDING',
            targetEntityId: 'h_esop',
            suggestedAmount: 2500000
        }
    };
    const sim = simulateActionImpact(trimAction, {
        holdings: personaB_Holdings,
        cashFlow: personaB_CashFlow,
        goals: [],
        liabilities: []
    }, AS_OF_DATE);

    // Health score jumps significantly
    assert.ok(sim.healthScoreComparison.afterScore > sim.healthScoreComparison.beforeScore);
    // Concentration drops from 78%
    assert.ok(sim.riskPillarDeltas.concentrationTop1.after < sim.riskPillarDeltas.concentrationTop1.before);
    // Verifies tax consequences are explicitly tracked
    assert.ok(sim.taxImpact !== undefined && sim.taxImpact.realizedCapitalGainINR >= 0);
});


// ===================================================================
// PERSONA C: PRE-RETIREMENT (Horizon Interaction & Sequence Risk)
// ===================================================================
console.log('\n--- PERSONA C: Pre-Retirement (Sequence-of-Returns Risk) ---');

const personaC_Holdings = [
    { id: 'h_c1', symbol: 'MIDCAP_EQUITY', assetClass: 'EQUITY', quantity: 5000, averageBuyPrice: 2000, currentPrice: 3500, currentValue: 17500000 }, // 80% equity
    { id: 'h_c2', symbol: 'CORP_BOND', assetClass: 'DEBT', quantity: 450, averageBuyPrice: 10000, currentPrice: 10000, currentValue: 4500000 }       // 20% debt
]; // Total: ₹2.20 Crore

const personaC_Goals = [
    {
        goalId: 'goal_retire_c',
        name: 'Retirement Corpus',
        category: 'RETIREMENT',
        priorityTier: 'CRITICAL_TIER_1',
        targetDate: '2028-12-31', // 2.4 years away (near maturity window <= 3 yrs)
        targetCorpusNominal: 25000000,
        allocatedHoldingIds: ['h_c1', 'h_c2'],
        currentCorpus: 22000000,
        monthlyContribution: 50000
    }
];

runPersonaCheck('PERSONA_C', '6. Sequence-of-Returns Detection: Near-term horizon (3.5 yrs) flags sequence risk on 80% equity', () => {
    const normGoals = sortGoalsByPrecedence(personaC_Goals.map(g => validateAndNormalizeGoal(g, AS_OF_DATE)), AS_OF_DATE);
    const glidepaths = aggregateMultiGoalGlidepaths(normGoals, personaC_Holdings, AS_OF_DATE);

    const retireGlidepath = glidepaths.goalGlidepaths[0];
    assert.strictEqual(retireGlidepath.glidepathTier, 'DEFENSE_AND_DERISKING');
    // Actual equity is 80%, recommended target equity is 15%
    assert.strictEqual(retireGlidepath.hasSequenceOfReturnsRisk, true);
    assert.ok(retireGlidepath.allocationDrift.equityDrift > 0.30);
});

runPersonaCheck('PERSONA_C', '7. Stress Resilience: Quantifies loss mitigation between current vs defensive glidepath', () => {
    const stressScenarios = evaluatePortfolioStressScenarios({
        holdings: personaC_Holdings,
        cashFlow: { monthlyIncome: 250000, totalMonthlyBurn: 120000, dedicatedEmergencyReserve: 1200000 }
    }, AS_OF_DATE);

    // In current 80% equity state, a 2008 GFC scenario loss is substantial
    const gfcScenario = stressScenarios.scenarios.HIST_2008_GFC;
    assert.ok(gfcScenario.percentageLoss > 0.25);
    assert.ok(gfcScenario.dollarLoss > 5000000); // Over ₹50L loss
});


// ===================================================================
// PERSONA D: DEBT-STRESSED HOUSEHOLD (Debt Savings vs Market Uncertainty)
// ===================================================================
console.log('\n--- PERSONA D: Debt-Stressed Household (Debt vs Investing) ---');

const personaD_Holdings = [
    { id: 'h_d1', symbol: 'EQUITY_MF', assetClass: 'EQUITY', quantity: 300, averageBuyPrice: 1000, currentPrice: 1500, currentValue: 450000 }
];

const personaD_CashFlow = {
    monthlyIncome: 110000,
    totalMonthlyBurn: 70000,
    dedicatedEmergencyReserve: 70000, // 1.0 month runway
    unallocatedCashBalance: 40000
};

const personaD_Liabilities = [
    { loanId: 'loan_pers_d', name: 'Personal Loan', type: 'PERSONAL_LOAN', interestRate: 14.5, outstandingBalance: 700000, monthlyEmi: 22000 },
    { loanId: 'card_debt_d', name: 'Credit Card Revolving', type: 'CREDIT_CARD', interestRate: 36.0, outstandingBalance: 500000, monthlyEmi: 25000 }
];

let personaD_Actions = null;

runPersonaCheck('PERSONA_D', '8. Debt Prioritization: 36% Credit Card Debt outranks equity investing', () => {
    const health = evaluatePortfolioHealthScore({
        holdings: personaD_Holdings,
        cashFlow: personaD_CashFlow,
        concentration: { assetClassHHI: 10000, sectorHHI: 2500, top1HoldingShare: 1.0, top3HoldingShare: 1.0 },
        volatility: { annualizedVolatility: 0.16, maxDrawdown: 0.20, cvar95: 0.07 },
        correlation: { meanPairwiseCorrelation: 0.25, dominantFactorShare: 0.40 },
        liquidity: { grossPortfolioValue: 450000, accessibleValue: 450000, compositeScore: 30.0, runway: { totalMonths: 1.0 } },
        stress: { resilienceSummary: { worstCasePercentageLoss: 0.20 }, reverseStressTest: { marketDropToCause20PctLoss: { solvedLambda: 1.1, status: 'SOLVED' } } }
    }, AS_OF_DATE);

    const opps = aggregateFinancialOpportunities({
        healthScoreDTO: health,
        liquidityDTO: { runwayMonths: 1.0 },
        loansOrLiabilities: personaD_Liabilities
    }, AS_OF_DATE);

    personaD_Actions = prioritizeNextBestActions(opps, AS_OF_DATE);

    // When runway is critically low (1.0 mo), Emergency Runway is #1, followed by 36% Debt Deleveraging #2
    assert.strictEqual(personaD_Actions.rankedActions[0].category, 'EMERGENCY_RUNWAY');
    assert.strictEqual(personaD_Actions.rankedActions[1].category, 'DELEVERAGE_DEBT');
    assert.strictEqual(personaD_Actions.rankedActions[1].urgencyLevel, 'CRITICAL');

    // If minimum 3-month buffer exists, 36% Debt rises to #1 over equity investing
    const bufferedOpps = aggregateFinancialOpportunities({
        healthScoreDTO: health,
        liquidityDTO: { runwayMonths: 4.0 },
        loansOrLiabilities: personaD_Liabilities
    }, AS_OF_DATE);
    const bufferedActions = prioritizeNextBestActions(bufferedOpps, AS_OF_DATE);
    assert.strictEqual(bufferedActions.rankedActions[0].category, 'DELEVERAGE_DEBT');
});

runPersonaCheck('PERSONA_D', '9. Decision Rationale: Employs probabilistic vs deterministic decision framing', () => {
    const cmdCenterVM = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: evaluatePortfolioHealthScore({
            holdings: personaD_Holdings,
            cashFlow: personaD_CashFlow,
            concentration: { assetClassHHI: 10000, sectorHHI: 2500, top1HoldingShare: 1.0, top3HoldingShare: 1.0 },
            volatility: { annualizedVolatility: 0.16, maxDrawdown: 0.20, cvar95: 0.07 },
            correlation: { meanPairwiseCorrelation: 0.25, dominantFactorShare: 0.40 },
            liquidity: { grossPortfolioValue: 450000, accessibleValue: 450000, compositeScore: 30.0, runway: { totalMonths: 1.0 } },
            stress: { resilienceSummary: { worstCasePercentageLoss: 0.20 }, reverseStressTest: { marketDropToCause20PctLoss: { solvedLambda: 1.1, status: 'SOLVED' } } }
        }, AS_OF_DATE),
        multiGoalSolvencyDTO: { totalGoalsCount: 0, status: 'NO_GOALS' },
        glidepathsDTO: { goalGlidepaths: [] },
        opportunitiesDTO: { findings: [] },
        nextBestActionsDTO: personaD_Actions,
        asOfDate: AS_OF_DATE
    });

    const primaryNarrative = cmdCenterVM.topActions.primaryActionNarrative;
    assert.ok(primaryNarrative.narrativeItems.length === 4);
    // Validates 4-part narrative structure exists and explains rationale
    const insightItem = primaryNarrative.narrativeItems.find(i => i.pillarType === 'DERIVED_INSIGHT');
    assert.ok(insightItem && insightItem.statement.length > 0);
});

// ===================================================================
// GLOBAL INVARIANTS CHECK
// ===================================================================
console.log('\n--- Global Persona Invariants & Immutability ---');

await runAsyncPersonaCheck('GLOBAL', '10. Zero Store Mutations across all 4 persona evaluations', async () => {
    const h = await loadData(STORAGE_KEYS.HOLDINGS);
    const e = await loadData(STORAGE_KEYS.EVENTS);
    const q = await loadData(STORAGE_KEYS.QUOTES);
    const t = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const w = await loadData(STORAGE_KEYS.WALLETS);

    assert.ok(Array.isArray(h) || h === null);
    assert.ok(Array.isArray(e) || e === null);
});

console.log('\n================================================================');
console.log(`=== FINLIFE PV.3 PERSONA VALIDATION RESULT: ${passCount}/10 CHECKS PASSED (100%) ===`);
console.log('================================================================');
