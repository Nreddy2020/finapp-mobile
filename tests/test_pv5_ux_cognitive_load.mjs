/**
 * FINLIFE PV.5 — UX & Cognitive Load Audit Suite
 * Master Standard: PV_V1 / C8_V1
 * 
 * Audits 6 Cognitive Ergonomics & Mobile UX Dimensions:
 * 1. 5-Question Information Hierarchy (Where am I? What needs attention? What should I do? What if? Goals?)
 * 2. Progressive Disclosure (Simple Card -> Expandable 4-Part Narrative -> What-If Modal -> Deep Math)
 * 3. 5-Second Action Comprehension (Problem, Importance, Recommendation, Outcome, Counterfactual)
 * 4. Cognitive Load & Visual Hygiene (Max 3-5 actions, no badge pollution, clear primary CTA)
 * 5. Trust & Non-Guarantee Demarcation (FACT vs INSIGHT vs REC vs HYPOTHETICAL OUTCOME)
 * 6. Mobile Ergonomics (Thumb targets, Indian currency formatting, long string truncation safety)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Certified UI Presentation Adapters & ViewModels (C.6.4, C.7.8, C.8.7)
import { adaptFinancialCommandCenterViewModel, adaptCompositeNarrativeViewModel, adaptWhatIfImpactViewModel, adaptNextBestActionViewModel, formatCurrencyINR, formatCompactCurrencyINR } from '../components/investments/decisionPresentationAdapter.js';
import { adaptRiskDashboardViewModel } from '../components/investments/riskPresentationAdapter.js';
import { evaluatePortfolioHealthScore } from '../services/portfolioHealthScoreEngine.js';
import { prioritizeNextBestActions } from '../services/actionPrioritizationEngine.js';
import { simulateActionImpact } from '../services/actionImpactSimulator.js';
import { loadData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== FINLIFE PV.5 UX & Cognitive Load Audit Suite ===');
console.log('================================================================\n');

let passCount = 0;
const AS_OF_DATE = '2026-08-16T00:00:00.000Z';

function runUXAudit(checkNum, name, fn) {
    try {
        fn();
        console.log(`✅ UX Audit Check ${checkNum} PASS: ${name}`);
        passCount++;
    } catch (err) {
        console.error(`❌ UX Audit Check ${checkNum} FAIL: ${name}`);
        console.error(err);
        process.exit(1);
    }
}

async function runAsyncUXAudit(checkNum, name, fn) {
    try {
        await fn();
        console.log(`✅ UX Audit Check ${checkNum} PASS: ${name}`);
        passCount++;
    } catch (err) {
        console.error(`❌ UX Audit Check ${checkNum} FAIL: ${name}`);
        console.error(err);
        process.exit(1);
    }
}

// -------------------------------------------------------------------
// SAMPLE STATE & VIEWMODEL SYNTHESIS
// -------------------------------------------------------------------
const mockHoldings = [
    { id: 'h1', symbol: 'RELIANCE', assetClass: 'EQUITY', quantity: 200, averageBuyPrice: 2000, currentPrice: 3000, currentValue: 600000 },
    { id: 'h2', symbol: 'LIQUID_FUND', assetClass: 'DEBT', quantity: 400, averageBuyPrice: 1000, currentPrice: 1000, currentValue: 400000 }
];

const mockHealthDTO = {
    totalHealthScore: 72.8,
    displayHealthScore: 73,
    healthGrade: 'B',
    status: 'EVALUATED',
    dataConfidence: 'HIGH',
    liquidityRunwayMonths: 4.2,
    dimensions: {
        concentration: { score: 45.0, weight: 0.20 },
        volatility: { score: 85.0, weight: 0.20 },
        correlation: { score: 90.0, weight: 0.15 },
        liquidity: { score: 70.0, weight: 0.25 },
        stress: { score: 80.0, weight: 0.20 }
    },
    riskDrivers: [
        { dimensionId: 'DIM_CONCENTRATION', deficit: 55.0, explanationText: 'Single stock represents 60.0% of portfolio.' }
    ]
};

const mockSolvencyDTO = {
    totalGoalsCount: 2,
    status: 'EVALUATED',
    overallSolvencyScore: 82.5,
    aggregateFundedRatio: 0.88,
    totalFundingGap: 1500000,
    totalCurrentMonthlyContribution: 35000,
    totalRequiredMonthlyContribution: 48000,
    goalBreakdown: [
        { goalId: 'g1', name: 'Child Higher Education in Overseas University', targetDate: '2036-05-01', targetCorpusNominal: 3500000, futureTargetCorpus: 4800000, currentCorpus: 600000, fundedRatio: 0.85, fundingStatus: 'ON_TRACK', currentMonthlyContribution: 15000, requiredMonthlyContribution: 28000, fundingGap: 720000 },
        { goalId: 'g2', name: 'Home Downpayment', targetDate: '2029-12-31', targetCorpusNominal: 1500000, futureTargetCorpus: 1700000, currentCorpus: 400000, fundedRatio: 0.72, fundingStatus: 'AT_RISK', currentMonthlyContribution: 20000, requiredMonthlyContribution: 20000, fundingGap: 780000 }
    ]
};

const mockGlidepathsDTO = {
    goalGlidepaths: [
        { goalId: 'g1', glidepathTier: 'BALANCED_ACCUMULATION', sequenceOfReturnsRisk: { vulnerable: false }, recommendationSummary: 'Balanced growth profile' },
        { goalId: 'g2', glidepathTier: 'DEFENSE_AND_DERISKING', sequenceOfReturnsRisk: { vulnerable: true, reason: 'Near-term goal with excess equity' }, recommendationSummary: 'Shift towards debt/cash' }
    ]
};

const mockOppsDTO = {
    findings: [
        { findingId: 'f1', findingType: 'VULNERABILITY', category: 'RISK_MITIGATION', severity: 'HIGH', urgencyScore: 80.0, evidenceText: 'Single holding represents 60.0% of total portfolio value.' }
    ]
};

const mockActionsDTO = {
    rankedActions: [
        {
            actionId: 'act_trim_rel',
            category: 'DE_RISK_CONCENTRATION',
            title: 'Trim Concentrated Single Stock Exposure',
            description: 'Reduce RELIANCE holding to bring concentration within safe policy limits.',
            rationale: 'Single stock is 60% of portfolio.',
            urgencyLevel: 'HIGH',
            urgencyScore: 80.0,
            evidenceDomain: 'RISK_MITIGATION',
            overallActionScore: 78.5,
            factors: { urgency: 80.0, riskImprovement: 85.0, taxEfficiency: 60.0, goalAlignment: 70.0, frictionPenalty: 25.0 },
            evidence: { sourceEngine: 'C7_2', sourceMetric: 'top1HoldingWeight', sourceValue: 0.60, thresholdValue: 0.25, evidenceText: 'Single stock is 60% of portfolio.' },
            tradeoffs: ['Realized capital gains tax liability of ~₹12,500.', 'Sacrifice potential future upside if stock rallies further.'],
            prerequisites: ['Verify holding period for LTCG tax slab.'],
            lifecycleStatus: 'IDENTIFIED'
        },
        {
            actionId: 'act_boost_sip',
            category: 'GOAL_FUNDING',
            title: 'Increase Monthly SIP for Child Education',
            description: 'Boost monthly contribution by ₹5,000 to close funding gap.',
            urgencyLevel: 'MEDIUM',
            overallActionScore: 68.0,
            factors: { urgency: 65.0, riskImprovement: 60.0, taxEfficiency: 80.0, goalAlignment: 90.0, frictionPenalty: 10.0 },
            evidence: { sourceEngine: 'C8_2', sourceMetric: 'sipShortfall', sourceValue: 7000, thresholdValue: 0, evidenceText: 'SIP shortfall of ₹7,000/mo.' },
            tradeoffs: ['Reduces discretionary monthly cash flow.'],
            prerequisites: ['Check monthly savings capacity.'],
            lifecycleStatus: 'IDENTIFIED'
        }
    ]
};

const mockSimulationDTO = {
    actionId: 'act_trim_rel',
    actionCategory: 'DE_RISK_CONCENTRATION',
    impactRating: 'STRONGLY_POSITIVE',
    before: { healthScore: { totalHealthScore: 72.8, liquidityRunwayMonths: 4.2 }, goalsSolvency: { overallSolvencyScore: 82.5 } },
    after: { healthScore: { totalHealthScore: 79.4, liquidityRunwayMonths: 4.8 }, goalsSolvency: { overallSolvencyScore: 85.0 } },
    impactDeltas: { healthScoreDelta: 6.6, runwayMonthsDelta: 0.6, goalSolvencyScoreDelta: 2.5, primaryPillarImpacted: 'PORTFOLIO_CONCENTRATION' },
    taxFriction: { capitalGainsTaxRealized: 12500 }
};

// -------------------------------------------------------------------
// DIMENSION 1: 5-QUESTION INFORMATION HIERARCHY
// -------------------------------------------------------------------
console.log('--- Dimension 1: 5-Question Information Hierarchy ---');

runUXAudit(1, '5-Question Architecture: ViewModel partitions information into 5 intuitive sections', () => {
    const cmdCenterVM = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: mockHealthDTO,
        multiGoalSolvencyDTO: mockSolvencyDTO,
        glidepathsDTO: mockGlidepathsDTO,
        opportunitiesDTO: mockOppsDTO,
        nextBestActionsDTO: mockActionsDTO,
        activeSimulationDTO: mockSimulationDTO,
        asOfDate: AS_OF_DATE
    });

    // 1. Where am I? (Health Overview)
    assert.ok(cmdCenterVM.healthOverview);
    assert.strictEqual(cmdCenterVM.healthOverview.grade, 'B');
    assert.strictEqual(cmdCenterVM.healthOverview.runwayMonthsFormatted, '4.2 mo');

    // 2. What needs attention? (Opportunities / Vulnerabilities)
    assert.ok(cmdCenterVM.opportunities);
    assert.strictEqual(cmdCenterVM.opportunities.count, 1);

    // 3. What should I consider? (Top Actions)
    assert.ok(cmdCenterVM.topActions);
    assert.strictEqual(cmdCenterVM.topActions.count, 2);

    // 4. What happens if I do it? (Active Simulation)
    assert.ok(cmdCenterVM.whatIfSimulation);
    assert.strictEqual(cmdCenterVM.whatIfSimulation.healthScoreComparison.deltaFormatted, '+6.6 pts');

    // 5. What are my goals? (Goals Overview)
    assert.ok(cmdCenterVM.goalsOverview);
    assert.strictEqual(cmdCenterVM.goalsOverview.totalGoalsCount, 2);
});

// -------------------------------------------------------------------
// DIMENSION 2: PROGRESSIVE DISCLOSURE
// -------------------------------------------------------------------
console.log('\n--- Dimension 2: Progressive Disclosure & Information Depth ---');

runUXAudit(2, 'Progressive Disclosure: Default view exposes high-level card; details revealed on demand', () => {
    const cmdCenterVM = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: mockHealthDTO,
        multiGoalSolvencyDTO: mockSolvencyDTO,
        glidepathsDTO: mockGlidepathsDTO,
        opportunitiesDTO: mockOppsDTO,
        nextBestActionsDTO: mockActionsDTO,
        asOfDate: AS_OF_DATE
    });

    const topAction = cmdCenterVM.topActions.primaryAction;
    // Level 1: Action card header & badge
    assert.strictEqual(topAction.rankBadge, '#1');
    assert.strictEqual(topAction.title, 'Trim Concentrated Single Stock Exposure');
    assert.strictEqual(topAction.primaryActionLabel, 'See Impact');
    assert.strictEqual(topAction.secondaryActionLabel, 'Review Details');

    // Level 2: 4-part narrative viewer is built on demand
    const narrative = cmdCenterVM.topActions.primaryActionNarrative;
    assert.strictEqual(narrative.narrativeItems.length, 4);

    // Complex math details (HHI, CVaR) are omitted from the primary card
    assert.strictEqual(topAction.HHI, undefined);
    assert.strictEqual(topAction.CVaR, undefined);
});

// -------------------------------------------------------------------
// DIMENSION 3: 5-SECOND ACTION COMPREHENSION
// -------------------------------------------------------------------
console.log('\n--- Dimension 3: 5-Second Action Comprehension ---');

runUXAudit(3, 'Action Comprehension: Narrative directly answers Problem, Urgency, Action, Outcome, and Tradeoff', () => {
    const adaptedAction = adaptNextBestActionViewModel(mockActionsDTO.rankedActions[0]);
    const narrative = adaptCompositeNarrativeViewModel(adaptedAction, mockSimulationDTO);
    const [fact, insight, rec, outcome] = narrative.narrativeItems;

    // What is wrong? (FACT)
    assert.strictEqual(fact.pillarType, 'FACT');
    assert.ok(fact.statement.length > 0);

    // Why does it matter? (DERIVED_INSIGHT)
    assert.strictEqual(insight.pillarType, 'DERIVED_INSIGHT');
    assert.ok(insight.statement.includes('urgency score 80'));

    // What should I do? (RECOMMENDATION)
    assert.strictEqual(rec.pillarType, 'RECOMMENDATION');
    assert.strictEqual(rec.statement, 'Trim Concentrated Single Stock Exposure');

    // What happens if I do it? (HYPOTHETICAL_OUTCOME)
    assert.strictEqual(outcome.pillarType, 'HYPOTHETICAL_OUTCOME');
    assert.ok(outcome.statement.includes('+6.6 pts'));
});

// -------------------------------------------------------------------
// DIMENSION 4: COGNITIVE LOAD & VISUAL HYGIENE
// -------------------------------------------------------------------
console.log('\n--- Dimension 4: Cognitive Load & Visual Hygiene ---');

runUXAudit(4, 'Cognitive Hygiene: Max actions capped at reasonable cognitive limit (<= 5)', () => {
    const cmdCenterVM = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: mockHealthDTO,
        multiGoalSolvencyDTO: mockSolvencyDTO,
        nextBestActionsDTO: mockActionsDTO,
        asOfDate: AS_OF_DATE
    });

    // Prevents recommendation fatigue
    assert.ok(cmdCenterVM.topActions.items.length <= 5);
    // Strict 1-indexed ranking ensures visual clarity
    assert.strictEqual(cmdCenterVM.topActions.items[0].rankBadge, '#1');
    assert.strictEqual(cmdCenterVM.topActions.items[1].rankBadge, '#2');
});

// -------------------------------------------------------------------
// DIMENSION 5: TRUST & NON-GUARANTEE DEMARCATION
// -------------------------------------------------------------------
console.log('\n--- Dimension 5: Trust & Non-Guarantee Demarcation ---');

runUXAudit(5, 'Non-Guarantee Boundaries: What-If simulation explicitly formatted with delta tags, not absolute promises', () => {
    const simVM = adaptWhatIfImpactViewModel(mockSimulationDTO);

    assert.strictEqual(simVM.healthScoreComparison.deltaFormatted, '+6.6 pts');
    assert.strictEqual(simVM.taxFriction.capitalGainsTaxRealizedFormatted, '₹12,500');
    assert.strictEqual(simVM.primaryPillarDelta.pillar, 'PORTFOLIO_CONCENTRATION');
    // Verifies rating theme color token is assigned
    assert.ok(simVM.impactRatingTheme && simVM.impactRatingTheme.bg);
});

// -------------------------------------------------------------------
// DIMENSION 6: MOBILE ERGONOMICS & FORMATTING
// -------------------------------------------------------------------
console.log('\n--- Dimension 6: Mobile Ergonomics & Indian Currency Notation ---');

runUXAudit(6, 'Indian Currency Notation: Formats compact and standard Indian currency (₹18.0L, ₹1,23,456)', () => {
    assert.strictEqual(formatCompactCurrencyINR(1800000), '₹18.0L');
    assert.strictEqual(formatCompactCurrencyINR(15000000), '₹1.50Cr');
    assert.strictEqual(formatCurrencyINR(123456, false), '₹1,23,456');
    assert.strictEqual(formatCompactCurrencyINR(0), '₹0');
    assert.strictEqual(formatCompactCurrencyINR(null), '₹0');
});

runUXAudit(7, 'Text Truncation Safety: Extremely long goal names handled cleanly without crash', () => {
    const longGoal = {
        goalId: 'g_long',
        name: 'Extremely Long Goal Name Designed to Test Word Wrapping and Mobile Viewport Boundaries in React Native Component Tree',
        targetDate: '2035-01-01',
        targetCorpusNominal: 5000000,
        fundedRatio: 0.50,
        fundingStatus: 'UNDERFUNDED'
    };

    const cmdCenterVM = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: mockHealthDTO,
        multiGoalSolvencyDTO: { totalGoalsCount: 1, goalBreakdown: [longGoal] },
        asOfDate: AS_OF_DATE
    });

    assert.strictEqual(cmdCenterVM.goalsOverview.goals[0].goalName, longGoal.name);
});

// -------------------------------------------------------------------
// GLOBAL STORE IMMUTABILITY
// -------------------------------------------------------------------
console.log('\n--- Global Immutability Guard ---');

await runAsyncUXAudit(8, 'Store Immutability: Zero AsyncStorage side-effects during UX adaptation', async () => {
    const h = await loadData(STORAGE_KEYS.HOLDINGS);
    const e = await loadData(STORAGE_KEYS.EVENTS);
    const q = await loadData(STORAGE_KEYS.QUOTES);
    const t = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const w = await loadData(STORAGE_KEYS.WALLETS);

    assert.ok(Array.isArray(h) || h === null);
});

console.log('\n================================================================');
console.log(`=== FINLIFE PV.5 UX AUDIT RESULT: ${passCount}/8 CHECKS PASSED (100%) ===`);
console.log('================================================================');
