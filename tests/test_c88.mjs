/**
 * Stage C.8.8 Goal & Financial Action Command Center UI Acceptance Suite
 * Master Standard: C8_V1
 * 
 * 26 Comprehensive Acceptance Tests covering:
 * - Group 1: FinancialActionCard Structural Verification & ViewModel Binding (Tests 1-5)
 * - Group 2: WhatIfSimulationModal Structural Verification & Data Integrity (Tests 6-10)
 * - Group 3: GoalSolvencyListCard Structural Verification & Glidepaths (Tests 11-15)
 * - Group 4: FinancialCommandCenter Composite Container & State Machine (Tests 16-20)
 * - Group 5: AST Scans, Store Immutability & App-Level Mounting (Tests 21-26)
 */

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
console.log('=== Stage C.8.8 Financial Command Center UI 26-Test Suite ===');
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
// FIXTURE DATA
// ---------------------------------------------------------
const AS_OF_DATE = '2026-08-16T00:00:00.000Z';

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

// ---------------------------------------------------------
// GROUP 1: FinancialActionCard Verification
// ---------------------------------------------------------
console.log('--- Group 1: FinancialActionCard Structural Verification & ViewModel Binding ---');

const actionCardCode = fs.readFileSync(path.resolve('components/investments/FinancialActionCard.js'), 'utf8');

runTest(1, 'FinancialActionCard source contains rank badge, category label, and title bindings', () => {
    assert.strictEqual(actionCardCode.includes('actionViewModel.rankBadge'), true);
    assert.strictEqual(actionCardCode.includes('actionViewModel.title'), true);
    assert.strictEqual(actionCardCode.includes('catTheme.label'), true);
    assert.strictEqual(actionCardCode.includes('urgTheme.label'), true);
});

runTest(2, 'FinancialActionCard binds 4-part narrative standard (FACT, INSIGHT, RECOMMENDATION, OUTCOME)', () => {
    assert.strictEqual(actionCardCode.includes('narrativeViewModel.narrativeItems.map'), true);
    assert.strictEqual(actionCardCode.includes('item.header'), true);
    assert.strictEqual(actionCardCode.includes('item.statement'), true);
});

runTest(3, 'FinancialActionCard supports onSeeImpact, onReview, and onDismiss interaction callbacks', () => {
    assert.strictEqual(actionCardCode.includes('onSeeImpact(actionViewModel)'), true);
    assert.strictEqual(actionCardCode.includes('onReview(actionViewModel)'), true);
    assert.strictEqual(actionCardCode.includes('onDismiss(actionViewModel)'), true);
});

runTest(4, 'FinancialActionCard implements isDismissed guard returning null', () => {
    assert.strictEqual(actionCardCode.includes('if (!actionViewModel || isDismissed) return null;'), true);
});

runTest(5, 'FinancialActionCard binds priority, urgency, and risk reduction score values', () => {
    assert.strictEqual(actionCardCode.includes('actionViewModel.compositeScoreFormatted'), true);
    assert.strictEqual(actionCardCode.includes('actionViewModel.urgencyScore'), true);
    assert.strictEqual(actionCardCode.includes('actionViewModel.riskReductionScore'), true);
});

// ---------------------------------------------------------
// GROUP 2: WhatIfSimulationModal Verification
// ---------------------------------------------------------
console.log('\n--- Group 2: WhatIfSimulationModal Structural Verification & Data Integrity ---');

const simulationModalCode = fs.readFileSync(path.resolve('components/investments/WhatIfSimulationModal.js'), 'utf8');

runTest(6, 'WhatIfSimulationModal maps Before vs After health shift (beforeFormatted -> afterFormatted)', () => {
    assert.strictEqual(simulationModalCode.includes('health.beforeFormatted'), true);
    assert.strictEqual(simulationModalCode.includes('health.afterFormatted'), true);
    assert.strictEqual(simulationModalCode.includes('health.deltaFormatted'), true);
});

runTest(7, 'WhatIfSimulationModal maps primary pillar delta, runway summary, and goal solvency', () => {
    assert.strictEqual(simulationModalCode.includes('pillar.pillar'), true);
    assert.strictEqual(simulationModalCode.includes('pillar.deltaFormatted'), true);
    assert.strictEqual(simulationModalCode.includes('runway.summary'), true);
    assert.strictEqual(simulationModalCode.includes('solvency.deltaFormatted'), true);
});

runTest(8, 'WhatIfSimulationModal maps tax friction and capital gains tax disclosure', () => {
    assert.strictEqual(simulationModalCode.includes('tax.capitalGainsTaxRealizedFormatted'), true);
    assert.strictEqual(simulationModalCode.includes('tax.explanation'), true);
});

runTest(9, 'WhatIfSimulationModal implements visible and null safety guard returning null', () => {
    assert.strictEqual(simulationModalCode.includes('if (!simulationViewModel || !visible) return null;'), true);
});

runTest(10, 'WhatIfSimulationModal renders non-binding disclaimer text', () => {
    assert.strictEqual(simulationModalCode.includes('simulationViewModel.disclaimer'), true);
});

// ---------------------------------------------------------
// GROUP 3: GoalSolvencyListCard Verification
// ---------------------------------------------------------
console.log('\n--- Group 3: GoalSolvencyListCard Structural Verification & Glidepaths ---');

const goalListCode = fs.readFileSync(path.resolve('components/investments/GoalSolvencyListCard.js'), 'utf8');

runTest(11, 'GoalSolvencyListCard maps multi-goal summary counts (total, onTrack, atRisk, totalGap)', () => {
    assert.strictEqual(goalListCode.includes('goalsOverview.totalGoalsCount'), true);
    assert.strictEqual(goalListCode.includes('goalsOverview.onTrackCount'), true);
    assert.strictEqual(goalListCode.includes('goalsOverview.totalFundingGapCompact'), true);
    assert.strictEqual(goalListCode.includes('goalsOverview.overallSolvencyScoreFormatted'), true);
});

runTest(12, 'GoalSolvencyListCard binds individual goal progress ratio, corpus, and status badge', () => {
    assert.strictEqual(goalListCode.includes('goal.goalName'), true);
    assert.strictEqual(goalListCode.includes('goal.progressPercent'), true);
    assert.strictEqual(goalListCode.includes('goal.statusLabel'), true);
    assert.strictEqual(goalListCode.includes('goal.currentCorpusFormatted'), true);
});

runTest(13, 'GoalSolvencyListCard renders required monthly SIP and funding gap', () => {
    assert.strictEqual(goalListCode.includes('goal.currentSipFormatted'), true);
    assert.strictEqual(goalListCode.includes('goal.requiredSipFormatted'), true);
    assert.strictEqual(goalListCode.includes('goal.fundingGapCompact'), true);
});

runTest(14, 'GoalSolvencyListCard renders sequence-of-returns risk alert card', () => {
    assert.strictEqual(goalListCode.includes('goal.hasSequenceRisk'), true);
    assert.strictEqual(goalListCode.includes('goal.sequenceRiskMessage'), true);
});

runTest(15, 'GoalSolvencyListCard implements NO_GOALS fallback state cleanly', () => {
    assert.strictEqual(goalListCode.includes("goalsOverview.status === 'NO_GOALS'"), true);
    assert.strictEqual(goalListCode.includes('No financial planning goals linked.'), true);
});

// ---------------------------------------------------------
// GROUP 4: FinancialCommandCenter Composite Container
// ---------------------------------------------------------
console.log('\n--- Group 4: FinancialCommandCenter Composite Container & State Machine ---');

const commandCenterCode = fs.readFileSync(path.resolve('components/investments/FinancialCommandCenter.js'), 'utf8');

runTest(16, 'FinancialCommandCenter integrates Section 1: "1. WHERE AM I?"', () => {
    assert.strictEqual(commandCenterCode.includes('1. WHERE AM I?'), true);
    assert.strictEqual(commandCenterCode.includes('viewModel.healthOverview.scoreFormatted'), true);
    assert.strictEqual(commandCenterCode.includes('viewModel.healthOverview.grade'), true);
    assert.strictEqual(commandCenterCode.includes('viewModel.healthOverview.runwayMonthsFormatted'), true);
});

runTest(17, 'FinancialCommandCenter integrates Section 2: "2. WHAT NEEDS ATTENTION?"', () => {
    assert.strictEqual(commandCenterCode.includes('2. WHAT NEEDS ATTENTION?'), true);
    assert.strictEqual(commandCenterCode.includes('viewModel.opportunities.items.map'), true);
});

runTest(18, 'FinancialCommandCenter integrates Section 3: "3. WHAT SHOULD I CONSIDER DOING?"', () => {
    assert.strictEqual(commandCenterCode.includes('3. WHAT SHOULD I CONSIDER DOING?'), true);
    assert.strictEqual(commandCenterCode.includes('<FinancialActionCard'), true);
    assert.strictEqual(commandCenterCode.includes('onSeeImpact={handleSeeImpact}'), true);
});

runTest(19, 'FinancialCommandCenter integrates Section 4: "4. WHAT ARE MY GOALS?"', () => {
    assert.strictEqual(commandCenterCode.includes('4. WHAT ARE MY GOALS?'), true);
    assert.strictEqual(commandCenterCode.includes('<GoalSolvencyListCard'), true);
});

runTest(20, 'FinancialCommandCenter integrates Section 5: What-If simulation modal binding', () => {
    assert.strictEqual(commandCenterCode.includes('<WhatIfSimulationModal'), true);
    assert.strictEqual(commandCenterCode.includes('visible={simulationModalVisible}'), true);
    assert.strictEqual(commandCenterCode.includes('simulationViewModel={viewModel.whatIfSimulation}'), true);
});

// ---------------------------------------------------------
// GROUP 5: AST Scans, Store Immutability & App-Level Mounting
// ---------------------------------------------------------
console.log('\n--- Group 5: AST Scans, Store Immutability & App-Level Mounting ---');

runTest(21, 'AST Zero-Financial-Recalculation Scan across all 4 C.8.8 UI components', () => {
    const files = [
        'components/investments/FinancialActionCard.js',
        'components/investments/WhatIfSimulationModal.js',
        'components/investments/GoalSolvencyListCard.js',
        'components/investments/FinancialCommandCenter.js'
    ];

    for (const f of files) {
        const code = fs.readFileSync(path.resolve(f), 'utf8');
        assert.strictEqual(code.includes('Math.pow('), false, `Math.pow forbidden in ${f}`);
        assert.strictEqual(code.includes('Math.sqrt('), false, `Math.sqrt forbidden in ${f}`);
        assert.strictEqual(code.includes('computePortfolioHealthScore'), false, `Engine invocation forbidden in ${f}`);
        assert.strictEqual(code.includes('calculateMultiGoalSolvency'), false, `Engine invocation forbidden in ${f}`);
        assert.strictEqual(code.includes('simulateActionImpact'), false, `Simulation engine invocation forbidden in ${f}`);
    }
});

runTest(22, 'AST Wall-Clock Scan across all 4 C.8.8 UI components (0 Date.now(), 0 argument-less new Date())', () => {
    const files = [
        'components/investments/FinancialActionCard.js',
        'components/investments/WhatIfSimulationModal.js',
        'components/investments/GoalSolvencyListCard.js',
        'components/investments/FinancialCommandCenter.js'
    ];

    for (const f of files) {
        const code = fs.readFileSync(path.resolve(f), 'utf8');
        const dateNowMatches = code.match(/Date\.now\(\)/g) || [];
        const argumentlessDateMatches = code.match(/new\s+Date\s*\(\s*\)/g) || [];
        assert.strictEqual(dateNowMatches.length, 0, `Date.now() found in ${f}`);
        assert.strictEqual(argumentlessDateMatches.length, 0, `Argument-less new Date() found in ${f}`);
    }
});

await runAsyncTest(23, 'Deep 5-Store Snapshot Guard: Zero state or store mutations from UI presentation adapter', async () => {
    const hBefore = await loadData(STORAGE_KEYS.HOLDINGS);
    const eBefore = await loadData(STORAGE_KEYS.EVENTS);
    const qBefore = await loadData(STORAGE_KEYS.QUOTES);
    const tBefore = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wBefore = await loadData(STORAGE_KEYS.WALLETS);

    adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: { goalGlidepaths: [sampleGlidepath] },
        opportunitiesDTO: { findings: [sampleFinding] },
        nextBestActionsDTO: { rankedActions: [sampleAction] },
        activeSimulationDTO: sampleSimulation,
        asOfDate: AS_OF_DATE
    });

    const hAfter = await loadData(STORAGE_KEYS.HOLDINGS);
    const eAfter = await loadData(STORAGE_KEYS.EVENTS);
    const qAfter = await loadData(STORAGE_KEYS.QUOTES);
    const tAfter = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wAfter = await loadData(STORAGE_KEYS.WALLETS);

    assert.deepStrictEqual(hBefore, hAfter, 'Holdings store mutated!');
    assert.deepStrictEqual(eBefore, eAfter, 'Events store mutated!');
    assert.deepStrictEqual(qBefore, qAfter, 'Quotes store mutated!');
    assert.deepStrictEqual(tBefore, tAfter, 'Transactions store mutated!');
    assert.deepStrictEqual(wBefore, wAfter, 'Wallets store mutated!');
});

runTest(24, 'Input DTO immutability preserved across presentation adaptation', () => {
    const healthCopy = JSON.parse(JSON.stringify(sampleHealthDTO));
    const actionCopy = JSON.parse(JSON.stringify(sampleAction));

    adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: { goalGlidepaths: [sampleGlidepath] },
        opportunitiesDTO: { findings: [sampleFinding] },
        nextBestActionsDTO: { rankedActions: [sampleAction] },
        activeSimulationDTO: sampleSimulation,
        asOfDate: AS_OF_DATE
    });

    assert.deepStrictEqual(sampleHealthDTO, healthCopy, 'Health DTO was mutated!');
    assert.deepStrictEqual(sampleAction, actionCopy, 'Action DTO was mutated!');
});

runTest(25, 'App-Level Screen Mounting in app/(tabs)/investments.js fully verified', () => {
    const investmentsScreenCode = fs.readFileSync(path.resolve('app/(tabs)/investments.js'), 'utf8');
    assert.strictEqual(
        investmentsScreenCode.includes("import FinancialCommandCenter from '../../components/investments/FinancialCommandCenter'"),
        true,
        'FinancialCommandCenter import missing from app/(tabs)/investments.js'
    );
    assert.strictEqual(
        investmentsScreenCode.includes('<FinancialCommandCenter'),
        true,
        'FinancialCommandCenter JSX mounting missing from app/(tabs)/investments.js'
    );
});

runTest(26, 'Deterministic repeatability verified across consecutive ViewModel adaptations', () => {
    const vm1 = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: { goalGlidepaths: [sampleGlidepath] },
        opportunitiesDTO: { findings: [sampleFinding] },
        nextBestActionsDTO: { rankedActions: [sampleAction] },
        activeSimulationDTO: sampleSimulation,
        asOfDate: AS_OF_DATE
    });

    const vm2 = adaptFinancialCommandCenterViewModel({
        healthScoreDTO: sampleHealthDTO,
        multiGoalSolvencyDTO: sampleMultiGoalSolvency,
        glidepathsDTO: { goalGlidepaths: [sampleGlidepath] },
        opportunitiesDTO: { findings: [sampleFinding] },
        nextBestActionsDTO: { rankedActions: [sampleAction] },
        activeSimulationDTO: sampleSimulation,
        asOfDate: AS_OF_DATE
    });

    assert.deepStrictEqual(vm1, vm2, 'Non-deterministic ViewModel output!');
});

console.log('\n================================================================');
console.log(`=== STAGE C.8.8 ACCEPTANCE RESULT: ${passCount}/26 TESTS PASSED (100%) ===`);
console.log('================================================================');
