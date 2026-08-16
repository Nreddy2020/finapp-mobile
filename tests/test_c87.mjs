import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

import {
    DECISION_THEME,
    formatCurrencyINR,
    formatCompactCurrencyINR,
    formatPercentage,
    formatScoreDelta,
    formatDate,
    adaptGoalSolvencyCardViewModel,
    adaptGoalsSummaryViewModel,
    adaptOpportunityItemViewModel,
    adaptNextBestActionViewModel,
    adaptWhatIfImpactViewModel,
    adaptCompositeNarrativeViewModel,
    adaptFinancialCommandCenterViewModel
} from '../components/investments/decisionPresentationAdapter.js';

import { loadData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== Stage C.8.7 Decision Presentation Adapter 26-Test Suite ===');
console.log('================================================================\n');

let passCount = 0;

function runTest(testNum, description, fn) {
    try {
        fn();
        console.log(`✅ Test ${testNum} PASS: ${description}`);
        passCount++;
    } catch (err) {
        console.error(`❌ Test ${testNum} FAIL: ${description}`);
        console.error(err);
        process.exit(1);
    }
}

async function runAsyncTest(testNum, description, fn) {
    try {
        await fn();
        console.log(`✅ Test ${testNum} PASS: ${description}`);
        passCount++;
    } catch (err) {
        console.error(`❌ Test ${testNum} FAIL: ${description}`);
        console.error(err);
        process.exit(1);
    }
}

// ---------------------------------------------------------
// GROUP 1: Formatting & Localization
// ---------------------------------------------------------
console.log('--- Group 1: Formatting & Localization ---');

runTest(1, 'INR currency formatting with standard and no decimals', () => {
    assert.strictEqual(formatCurrencyINR(1800000, false), '₹18,00,000');
    assert.strictEqual(formatCurrencyINR(123456.78, true), '₹1,23,456.78');
    assert.strictEqual(formatCurrencyINR(-50000, false), '-₹50,000');
    assert.strictEqual(formatCurrencyINR(0, false), '₹0');
});

runTest(2, 'Compact INR currency formatting (Lakhs, Crores, Thousands)', () => {
    assert.strictEqual(formatCompactCurrencyINR(1800000), '₹18.0L');
    assert.strictEqual(formatCompactCurrencyINR(15000000), '₹1.50Cr');
    assert.strictEqual(formatCompactCurrencyINR(25000), '₹25.0K');
    assert.strictEqual(formatCompactCurrencyINR(500), '₹500');
});

runTest(3, 'Percentage formatting with decimal control', () => {
    assert.strictEqual(formatPercentage(0.684, 1), '68.4%');
    assert.strictEqual(formatPercentage(1.0, 0), '100%');
    assert.strictEqual(formatPercentage(0.0525, 2), '5.25%');
    assert.strictEqual(formatPercentage(null), '0.0%');
});

runTest(4, 'Signed score delta formatting', () => {
    assert.strictEqual(formatScoreDelta(6.6, 1, 'pts'), '+6.6 pts');
    assert.strictEqual(formatScoreDelta(-2.4, 1, 'pts'), '-2.4 pts');
    assert.strictEqual(formatScoreDelta(0, 1, 'pts'), '0.0 pts');
});

runTest(5, 'Date formatting returns YYYY-MM-DD', () => {
    assert.strictEqual(formatDate('2030-06-15T00:00:00.000Z'), '2030-06-15');
    assert.strictEqual(formatDate(null), 'N/A');
});

runTest(6, 'Null/undefined input safety across formatting helpers', () => {
    assert.strictEqual(formatCurrencyINR(null), '₹0');
    assert.strictEqual(formatCompactCurrencyINR(undefined), '₹0');
    assert.strictEqual(formatPercentage(NaN), '0.0%');
    assert.strictEqual(formatScoreDelta(undefined), '0.0 pts');
});

// ---------------------------------------------------------
// GROUP 2: Goal Solvency & Summary ViewModels
// ---------------------------------------------------------
console.log('\n--- Group 2: Goal Solvency & Summary ViewModels ---');

const sampleGoalSolvency = {
    goalId: 'goal_home_01',
    name: 'Home Downpayment',
    category: 'HOME_PURCHASE',
    priorityTier: 2,
    targetDate: '2028-12-31',
    horizonMonths: 28,
    fundingStatus: 'UNDERFUNDED',
    fundedRatio: 0.68,
    currentCorpus: 3400000,
    futureTargetCorpus: 5000000,
    targetCorpusNominal: 4000000,
    fundingGap: 1600000,
    currentMonthlyContribution: 25000,
    requiredMonthlyContribution: 45000
};

const sampleGlidepath = {
    goalId: 'goal_home_01',
    glidepathTier: 'DEFENSE_AND_DERISKING',
    sequenceOfReturnsRisk: {
        vulnerable: true,
        excessEquityShare: 0.35,
        reason: 'Goal matures in 2.3 years but retains 35.0% excess equity above glidepath ceiling.'
    },
    recommendationSummary: 'Rebalance portfolio equity toward short-term debt instruments.'
};

runTest(7, 'Goal card ViewModel maps funded ratio, formatted gap, and theme', () => {
    const cardVM = adaptGoalSolvencyCardViewModel(sampleGoalSolvency, sampleGlidepath);
    assert.strictEqual(cardVM.goalId, 'goal_home_01');
    assert.strictEqual(cardVM.progressPercent, 68.0);
    assert.strictEqual(cardVM.fundingStatus, 'UNDERFUNDED');
    assert.strictEqual(cardVM.statusLabel, 'Underfunded');
    assert.strictEqual(cardVM.fundingGapFormatted, '₹16,00,000');
    assert.strictEqual(cardVM.fundingGapCompact, '₹16.0L');
    assert.strictEqual(cardVM.requiredSipFormatted, '₹45,000');
    assert.strictEqual(cardVM.hasSequenceRisk, true);
    assert.strictEqual(cardVM.sequenceRiskMessage.includes('35.0% excess equity'), true);
});

runTest(8, 'Goals summary ViewModel aggregates counts, solvency score, and compact gap', () => {
    const multiGoalSolvency = {
        status: 'EVALUATED',
        totalFundingGap: 2400000,
        totalCurrentMonthlyContribution: 40000,
        totalRequiredMonthlyContribution: 75000,
        overallSolvencyScore: 78.5,
        goalBreakdown: [
            sampleGoalSolvency,
            {
                goalId: 'goal_edu_02',
                name: 'Child Education',
                category: 'CHILD_EDUCATION',
                priorityTier: 1,
                targetDate: '2035-05-01',
                horizonMonths: 105,
                fundingStatus: 'ON_TRACK',
                fundedRatio: 0.92,
                currentCorpus: 2000000,
                futureTargetCorpus: 3000000,
                fundingGap: 800000,
                currentMonthlyContribution: 15000,
                requiredMonthlyContribution: 30000
            }
        ]
    };

    const summaryVM = adaptGoalsSummaryViewModel(multiGoalSolvency);
    assert.strictEqual(summaryVM.totalGoalsCount, 2);
    assert.strictEqual(summaryVM.onTrackCount, 1);
    assert.strictEqual(summaryVM.underfundedCount, 1);
    assert.strictEqual(summaryVM.overallSolvencyScoreFormatted, '78.5');
    assert.strictEqual(summaryVM.totalFundingGapFormatted, '₹24,00,000');
    assert.strictEqual(summaryVM.totalFundingGapCompact, '₹24.0L');
});

runTest(9, 'Empty/NO_GOALS solvency DTO returns safe fallback summary', () => {
    const emptySummary = adaptGoalsSummaryViewModel({ status: 'NO_GOALS', goalBreakdown: [] });
    assert.strictEqual(emptySummary.status, 'NO_GOALS');
    assert.strictEqual(emptySummary.totalGoalsCount, 0);
    assert.strictEqual(emptySummary.overallSolvencyScore, 100.0);
    assert.strictEqual(emptySummary.totalFundingGapFormatted, '₹0');
});

// ---------------------------------------------------------
// GROUP 3: Opportunities & Next Best Actions ViewModels
// ---------------------------------------------------------
console.log('\n--- Group 3: Opportunities & Next Best Actions ViewModels ---');

const sampleFinding = {
    findingId: 'find_conc_01',
    domainSource: 'CONCENTRATION_RISK',
    findingType: 'EXCESSIVE_SINGLE_STOCK_WEIGHT',
    severity: 'HIGH',
    urgencyLevel: 'HIGH',
    evidenceStatement: 'Top holding RELIANCE represents 42.0% of portfolio, exceeding safe 15.0% limit.',
    rootCauseMetric: 'TOP1_WEIGHT',
    observedValue: 0.42,
    thresholdValue: 0.15,
    suggestedActionCategory: 'DE_RISK_CONCENTRATION'
};

runTest(10, 'Opportunity item ViewModel formats severity, title, and evidence', () => {
    const itemVM = adaptOpportunityItemViewModel(sampleFinding);
    assert.strictEqual(itemVM.findingId, 'find_conc_01');
    assert.strictEqual(itemVM.domainSource, 'CONCENTRATION_RISK');
    assert.strictEqual(itemVM.urgencyLevel, 'HIGH');
    assert.strictEqual(itemVM.urgencyTheme.label, 'High Priority');
    assert.strictEqual(itemVM.title, 'EXCESSIVE SINGLE STOCK WEIGHT');
    assert.strictEqual(itemVM.evidenceStatement.includes('42.0%'), true);
    assert.strictEqual(itemVM.isActionable, true);
});

const sampleAction = {
    actionId: 'act_trim_rel_01',
    actionCategory: 'DE_RISK_CONCENTRATION',
    urgencyLevel: 'HIGH',
    title: 'Trim Concentrated Stock Exposure (RELIANCE)',
    rationale: 'Top holding RELIANCE represents 42.0% of portfolio equity.',
    actionType: 'TRIM_CONCENTRATION',
    compositeScore: 84.5,
    urgencyScore: 85.0,
    riskReductionScore: 90.0,
    taxEfficiencyScore: 70.0,
    goalImpactScore: 80.0,
    implementationFrictionScore: 20.0,
    targetEntityId: 'RELIANCE',
    targetEntityType: 'HOLDING',
    evidenceDomain: 'C.7.2_CONCENTRATION',
    lifecycleStatus: 'IDENTIFIED',
    payload: { symbol: 'RELIANCE', trimTargetWeight: 0.15 }
};

runTest(11, 'Next best action ViewModel formats 1-indexed rank badge and theme tokens', () => {
    const actionVM = adaptNextBestActionViewModel(sampleAction, 1);
    assert.strictEqual(actionVM.rank, 1);
    assert.strictEqual(actionVM.rankBadge, '#1');
    assert.strictEqual(actionVM.compositeScoreFormatted, '84.5');
    assert.strictEqual(actionVM.categoryTheme.label, 'Trim Concentration');
    assert.strictEqual(actionVM.primaryActionLabel, 'See Impact');
    assert.strictEqual(actionVM.lifecycleStatus, 'IDENTIFIED');
});

runTest(12, 'Null action safety returns null cleanly', () => {
    assert.strictEqual(adaptNextBestActionViewModel(null), null);
    assert.strictEqual(adaptOpportunityItemViewModel(null), null);
});

// ---------------------------------------------------------
// GROUP 4: What-If Simulation & 4-Part Narrative Standard
// ---------------------------------------------------------
console.log('\n--- Group 4: What-If Simulation & 4-Part Narrative Standard ---');

const sampleSimulation = {
    simulationVersion: 'C8_V1',
    actionId: 'act_trim_rel_01',
    actionCategory: 'DE_RISK_CONCENTRATION',
    impactRating: 'STRONGLY_POSITIVE',
    before: {
        healthScore: { totalHealthScore: 72.8, liquidityRunwayMonths: 4.2 },
        goalsSolvency: { overallSolvencyScore: 75.0 }
    },
    after: {
        healthScore: { totalHealthScore: 79.4, liquidityRunwayMonths: 4.2 },
        goalsSolvency: { overallSolvencyScore: 75.0 }
    },
    impactDeltas: {
        healthScoreDelta: 6.6,
        primaryPillarImpacted: 'DIM_CONCENTRATION',
        primaryPillarDelta: 35.0,
        runwayMonthsDelta: 0.0,
        goalSolvencyScoreDelta: 0.0,
        goalDeltas: []
    },
    taxFriction: {
        capitalGainsTaxRealized: 12500,
        explanation: 'Realizes ₹12,500 in capital gains tax from trimming taxable lots.'
    }
};

runTest(13, 'What-if impact ViewModel formats health shift summary (72.8 -> 79.4)', () => {
    const whatIfVM = adaptWhatIfImpactViewModel(sampleSimulation);
    assert.strictEqual(whatIfVM.actionId, 'act_trim_rel_01');
    assert.strictEqual(whatIfVM.impactRating, 'STRONGLY_POSITIVE');
    assert.strictEqual(whatIfVM.healthScoreComparison.summary, '72.8 → 79.4 (+6.6 pts)');
    assert.strictEqual(whatIfVM.healthScoreComparison.isImprovement, true);
    assert.strictEqual(whatIfVM.primaryPillarDelta.pillar, 'DIM_CONCENTRATION');
    assert.strictEqual(whatIfVM.primaryPillarDelta.deltaFormatted, '+35.0 pts');
    assert.strictEqual(whatIfVM.taxFriction.capitalGainsTaxRealizedFormatted, '₹12,500');
    assert.strictEqual(whatIfVM.taxFriction.hasTaxCost, true);
});

runTest(14, '4-Part narrative ViewModel strictly orders FACT -> DERIVED_INSIGHT -> RECOMMENDATION -> HYPOTHETICAL_OUTCOME', () => {
    const narrativeVM = adaptCompositeNarrativeViewModel(sampleAction, sampleSimulation);
    assert.strictEqual(narrativeVM.actionId, 'act_trim_rel_01');
    assert.strictEqual(narrativeVM.narrativeItems.length, 4);

    const [fact, insight, rec, outcome] = narrativeVM.narrativeItems;
    assert.strictEqual(fact.pillarType, 'FACT');
    assert.strictEqual(fact.header, 'FACT');
    assert.strictEqual(fact.statement.includes('42.0%'), true);

    assert.strictEqual(insight.pillarType, 'DERIVED_INSIGHT');
    assert.strictEqual(insight.header, 'INSIGHT');
    assert.strictEqual(insight.statement.includes('C.7.2_CONCENTRATION'), true);

    assert.strictEqual(rec.pillarType, 'RECOMMENDATION');
    assert.strictEqual(rec.header, 'RECOMMENDATION');
    assert.strictEqual(rec.statement.includes('Trim Concentrated Stock Exposure'), true);

    assert.strictEqual(outcome.pillarType, 'HYPOTHETICAL_OUTCOME');
    assert.strictEqual(outcome.header, 'HYPOTHETICAL OUTCOME');
    assert.strictEqual(outcome.statement.includes('+6.6 pts'), true);
});

runTest(15, 'Goal solvency transition captured in simulation goal deltas', () => {
    const goalSimulation = {
        simulationVersion: 'C8_V1',
        actionId: 'act_sip_01',
        actionCategory: 'GOAL_FUNDING',
        impactRating: 'STRONGLY_POSITIVE',
        before: { healthScore: { totalHealthScore: 70 }, goalsSolvency: { overallSolvencyScore: 60 } },
        after: { healthScore: { totalHealthScore: 72 }, goalsSolvency: { overallSolvencyScore: 85 } },
        impactDeltas: {
            healthScoreDelta: 2.0,
            primaryPillarImpacted: 'LIQUIDITY_BUFFER',
            primaryPillarDelta: 0.0,
            goalSolvencyScoreDelta: 25.0,
            goalDeltas: [
                {
                    goalId: 'goal_home_01',
                    gapReduction: 1600000,
                    beforeStatus: 'UNDERFUNDED',
                    afterStatus: 'FULLY_FUNDED'
                }
            ]
        },
        taxFriction: { capitalGainsTaxRealized: 0, explanation: 'No taxable gains.' }
    };

    const whatIfVM = adaptWhatIfImpactViewModel(goalSimulation);
    assert.strictEqual(whatIfVM.goalDeltasCount, 1);
    assert.strictEqual(whatIfVM.goalDeltas[0].statusTransition, 'UNDERFUNDED → FULLY_FUNDED');
    assert.strictEqual(whatIfVM.goalDeltas[0].gapReductionFormatted, '₹16,00,000');
    assert.strictEqual(whatIfVM.goalDeltas[0].isFullyFunded, true);
});

runTest(16, 'Null simulation handling returns null cleanly', () => {
    assert.strictEqual(adaptWhatIfImpactViewModel(null), null);
    assert.strictEqual(adaptCompositeNarrativeViewModel(null), null);
});

// ---------------------------------------------------------
// GROUP 5: Composite Financial Command Center ViewModel
// ---------------------------------------------------------
console.log('\n--- Group 5: Composite Financial Command Center ViewModel ---');

const sampleHealthDTO = {
    totalHealthScore: 72.8,
    healthGrade: 'B',
    status: 'EVALUATED',
    dataConfidence: 'HIGH',
    liquidityRunwayMonths: 4.2
};

const sampleMultiGoalSolvency = {
    status: 'EVALUATED',
    totalFundingGap: 1600000,
    totalCurrentMonthlyContribution: 25000,
    totalRequiredMonthlyContribution: 45000,
    overallSolvencyScore: 78.0,
    goalBreakdown: [sampleGoalSolvency]
};

const sampleGlidepathsDTO = {
    goalGlidepaths: [sampleGlidepath]
};

const sampleOpportunitiesDTO = {
    findings: [sampleFinding]
};

const sampleNextBestActionsDTO = {
    rankedActions: [sampleAction]
};

runTest(17, 'Mandatory asOfDate strictly enforced on adaptFinancialCommandCenterViewModel', () => {
    assert.throws(() => {
        adaptFinancialCommandCenterViewModel({});
    }, /mandatory asOfDate/);
});

runTest(18, 'Composite Command Center ViewModel maps all 5 decision streams cleanly', () => {
    const cmdCenterVM = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: sampleGlidepathsDTO,
        opportunitiesDTO: sampleOpportunitiesDTO,
        nextBestActionsDTO: sampleNextBestActionsDTO,
        activeSimulationDTO: sampleSimulation,
        asOfDate: '2026-08-16'
    });

    assert.strictEqual(cmdCenterVM.overallState, 'EVALUATED');
    assert.strictEqual(cmdCenterVM.asOfDateFormatted, '2026-08-16');
    assert.strictEqual(cmdCenterVM.healthOverview.scoreFormatted, '72.8');
    assert.strictEqual(cmdCenterVM.healthOverview.grade, 'B');
    assert.strictEqual(cmdCenterVM.healthOverview.runwayMonthsFormatted, '4.2 mo');
    assert.strictEqual(cmdCenterVM.goalsOverview.totalGoalsCount, 1);
    assert.strictEqual(cmdCenterVM.goalsOverview.goals[0].hasSequenceRisk, true);
    assert.strictEqual(cmdCenterVM.opportunities.count, 1);
    assert.strictEqual(cmdCenterVM.topActions.count, 1);
    assert.strictEqual(cmdCenterVM.topActions.primaryAction.rankBadge, '#1');
    assert.strictEqual(cmdCenterVM.topActions.primaryActionNarrative.narrativeItems.length, 4);
    assert.strictEqual(cmdCenterVM.whatIfSimulation.healthScoreComparison.summary, '72.8 → 79.4 (+6.6 pts)');
});

runTest(19, 'Empty command center state returns EMPTY state cleanly', () => {
    const emptyVM = adaptFinancialCommandCenterViewModel({
        asOfDate: '2026-08-16'
    });
    assert.strictEqual(emptyVM.overallState, 'EMPTY');
    assert.strictEqual(emptyVM.goalsOverview.status, 'NO_GOALS');
    assert.strictEqual(emptyVM.topActions.count, 0);
});

runTest(20, 'NO_ACTION_REQUIRED state returned when actions list is empty', () => {
    const noActionsVM = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        nextBestActionsDTO: { rankedActions: [] },
        asOfDate: '2026-08-16'
    });
    assert.strictEqual(noActionsVM.overallState, 'NO_ACTION_REQUIRED');
});

// ---------------------------------------------------------
// GROUP 6: AST Scans, Immutability & Determinism
// ---------------------------------------------------------
console.log('\n--- Group 6: AST Scans, Immutability & Determinism ---');

runTest(21, 'AST Wall-Clock Scan: Zero Date.now() and zero argument-less new Date()', () => {
    const code = fs.readFileSync(path.resolve('components/investments/decisionPresentationAdapter.js'), 'utf8');
    const dateNowMatches = code.match(/Date\.now\(\)/g) || [];
    const argumentlessDateMatch = code.match(/new\s+Date\s*\(\s*\)/g) || [];
    assert.strictEqual(dateNowMatches.length, 0, 'Date.now() forbidden in presentation adapter');
    assert.strictEqual(argumentlessDateMatch.length, 0, 'Argument-less new Date() forbidden in presentation adapter');
});

runTest(22, 'AST Zero-Financial-Recalculation Guard confirmed: zero financial math modeling', () => {
    const code = fs.readFileSync(path.resolve('components/investments/decisionPresentationAdapter.js'), 'utf8');
    // Ensure no math loops calculating HHI, XIRR, annuities, or glidepaths
    assert.strictEqual(code.includes('Math.pow('), false, 'Math.pow forbidden in presentation adapter');
    assert.strictEqual(code.includes('Math.sqrt('), false, 'Math.sqrt forbidden in presentation adapter');
    assert.strictEqual(code.includes('computePortfolioHealthScore'), false, 'Direct engine invocation forbidden in presentation adapter');
    assert.strictEqual(code.includes('calculateMultiGoalSolvency'), false, 'Direct solver invocation forbidden in presentation adapter');
});

await runAsyncTest(23, 'Deep 5-Store Snapshot Guard: Zero state or store mutations', async () => {
    const hBefore = await loadData(STORAGE_KEYS.HOLDINGS);
    const eBefore = await loadData(STORAGE_KEYS.EVENTS);
    const qBefore = await loadData(STORAGE_KEYS.QUOTES);
    const tBefore = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wBefore = await loadData(STORAGE_KEYS.WALLETS);

    adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: sampleGlidepathsDTO,
        opportunitiesDTO: sampleOpportunitiesDTO,
        nextBestActionsDTO: sampleNextBestActionsDTO,
        activeSimulationDTO: sampleSimulation,
        asOfDate: '2026-08-16'
    });

    const hAfter = await loadData(STORAGE_KEYS.HOLDINGS);
    const eAfter = await loadData(STORAGE_KEYS.EVENTS);
    const qAfter = await loadData(STORAGE_KEYS.QUOTES);
    const tAfter = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wAfter = await loadData(STORAGE_KEYS.WALLETS);

    assert.deepStrictEqual(hBefore, hAfter, 'Holdings store was mutated!');
    assert.deepStrictEqual(eBefore, eAfter, 'Events store was mutated!');
    assert.deepStrictEqual(qBefore, qAfter, 'Quotes store was mutated!');
    assert.deepStrictEqual(tBefore, tAfter, 'Transactions store was mutated!');
    assert.deepStrictEqual(wBefore, wAfter, 'Wallets store was mutated!');
});

runTest(24, 'Input DTO immutability preserved across adaptation', () => {
    const inputHealthCopy = JSON.parse(JSON.stringify(sampleHealthDTO));
    const inputActionsCopy = JSON.parse(JSON.stringify(sampleNextBestActionsDTO));

    adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: sampleGlidepathsDTO,
        opportunitiesDTO: sampleOpportunitiesDTO,
        nextBestActionsDTO: sampleNextBestActionsDTO,
        activeSimulationDTO: sampleSimulation,
        asOfDate: '2026-08-16'
    });

    assert.deepStrictEqual(sampleHealthDTO, inputHealthCopy, 'Health DTO was mutated!');
    assert.deepStrictEqual(sampleNextBestActionsDTO, inputActionsCopy, 'Actions DTO was mutated!');
});

runTest(25, 'Deterministic repeatability verified across consecutive evaluations', () => {
    const vm1 = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: sampleGlidepathsDTO,
        opportunitiesDTO: sampleOpportunitiesDTO,
        nextBestActionsDTO: sampleNextBestActionsDTO,
        activeSimulationDTO: sampleSimulation,
        asOfDate: '2026-08-16'
    });

    const vm2 = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: sampleGlidepathsDTO,
        opportunitiesDTO: sampleOpportunitiesDTO,
        nextBestActionsDTO: sampleNextBestActionsDTO,
        activeSimulationDTO: sampleSimulation,
        asOfDate: '2026-08-16'
    });

    assert.deepStrictEqual(vm1, vm2, 'Adaptation is non-deterministic!');
});

runTest(26, 'Complete composite ViewModel schema fields confirmed', () => {
    const vm = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: sampleGlidepathsDTO,
        opportunitiesDTO: sampleOpportunitiesDTO,
        nextBestActionsDTO: sampleNextBestActionsDTO,
        activeSimulationDTO: sampleSimulation,
        asOfDate: '2026-08-16'
    });

    assert.ok(vm.overallState);
    assert.ok(vm.asOfDateFormatted);
    assert.ok(vm.healthOverview);
    assert.ok(vm.goalsOverview);
    assert.ok(vm.opportunities);
    assert.ok(vm.topActions);
    assert.ok(vm.whatIfSimulation);
    assert.ok(vm.metadata);
});

console.log('\n================================================================');
console.log(`=== STAGE C.8.7 ACCEPTANCE RESULT: ${passCount}/26 TESTS PASSED (100%) ===`);
console.log('================================================================');
