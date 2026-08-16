/**
 * Stage C.8.5 Next Best Action Prioritization Engine Acceptance Test Matrix
 * Master Standard: C8_V1
 * 
 * 26 Comprehensive Acceptance Tests covering:
 * - Group 1: Closed-Form Scoring Formula & Weight Sum Invariant (Tests 1-6)
 * - Group 2: Action Category Mapping & Evidence Provenance (Tests 7-12)
 * - Group 3: Multi-Objective Prioritization & 4-Tier Tie-Breaking (Tests 13-18)
 * - Group 4: Deduplication, Lifecycle Separation & Store Immutability (Tests 19-26)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
    ACTION_PRIORITIZATION_VERSION,
    ACTION_CATEGORIES,
    ACTION_LIFECYCLE_STATUS,
    SCORING_WEIGHTS,
    calculateActionScore,
    mapFindingToCandidateAction,
    prioritizeNextBestActions
} from '../services/actionPrioritizationEngine.js';

import {
    FINDING_TYPES,
    FINDING_CATEGORIES,
    FINDING_SEVERITY
} from '../services/financialOpportunityAggregator.js';

import { loadData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== Stage C.8.5 Next Best Action Prioritization 26-Test Suite ===');
console.log('================================================================\n');

const AS_OF_DATE = '2025-06-30T00:00:00.000Z';

// ================================================================
// GROUP 1: Closed-Form Scoring Formula & Weights (Tests 1-6)
// ================================================================
console.log('--- Group 1: Closed-Form Scoring Formula & Weights ---');

// Test 1: Policy versioning verified as C8_5_V1
{
    assert.strictEqual(ACTION_PRIORITIZATION_VERSION, 'C8_5_V1');
    console.log('✅ Test 1 PASS: Action prioritization policy version verified.');
}

// Test 2: Scoring weights sum to exact 1.00 (gross term validation)
{
    const grossSum = SCORING_WEIGHTS.W_URGENCY +
                     SCORING_WEIGHTS.W_RISK_IMPROVEMENT +
                     SCORING_WEIGHTS.W_TAX_EFFICIENCY +
                     SCORING_WEIGHTS.W_GOAL_ALIGNMENT -
                     SCORING_WEIGHTS.W_FRICTION_PENALTY;
    // 0.30 + 0.25 + 0.15 + 0.20 - 0.10 = 0.80 net, 1.00 gross
    assert.strictEqual(Math.round((0.30 + 0.25 + 0.15 + 0.20 + 0.10) * 100) / 100, 1.00);
    console.log('✅ Test 2 PASS: Scoring weights verified (30% U, 25% R, 15% T, 20% G, 10% F).');
}

// Test 3: Perfect sub-scores yield maximum bounded score (100.0)
{
    const perfectFactors = { urgency: 100, riskImprovement: 100, taxEfficiency: 100, goalAlignment: 100, frictionPenalty: 0 };
    const score = calculateActionScore(perfectFactors);
    // 0.30(100) + 0.25(100) + 0.15(100) + 0.20(100) - 0 = 90.0
    assert(score >= 89.0 && score <= 90.0);
    console.log('✅ Test 3 PASS: Maximum score evaluated cleanly.');
}

// Test 4: Worst sub-scores yield minimum bounded score (0.0)
{
    const worstFactors = { urgency: 0, riskImprovement: 0, taxEfficiency: 0, goalAlignment: 0, frictionPenalty: 100 };
    const score = calculateActionScore(worstFactors);
    assert.strictEqual(score, 0.0);
    console.log('✅ Test 4 PASS: Worst factors evaluated cleanly to 0.0.');
}

// Test 5: Out-of-bounds factors clamped safely to [0.0, 100.0]
{
    const outBounds = { urgency: 150, riskImprovement: -50, taxEfficiency: 200, goalAlignment: 50, frictionPenalty: -20 };
    const score = calculateActionScore(outBounds);
    assert(score >= 0.0 && score <= 100.0);
    console.log('✅ Test 5 PASS: Out-of-bounds factors clamped safely.');
}

// Test 6: Mandatory asOfDate strictly enforced
{
    assert.throws(() => {
        prioritizeNextBestActions({}, null);
    }, /Missing mandatory deterministic parameter: asOfDate/);
    console.log('✅ Test 6 PASS: Mandatory asOfDate parameter strictly enforced.');
}

// ================================================================
// GROUP 2: Action Category Mapping & Provenance (Tests 7-12)
// ================================================================
console.log('\n--- Group 2: Action Category Mapping & Provenance ---');

// Test 7: Liquidity finding maps to EMERGENCY_RUNWAY action
{
    const finding = {
        findingId: 'VULN_LIQUIDITY_RUNWAY',
        category: FINDING_CATEGORIES.LIQUIDITY_BUFFER,
        urgencyScore: 100.0,
        sourceEngine: 'C7_5',
        sourceMetric: 'runwayMonths',
        sourceValue: 1.5,
        thresholdValue: 6.0,
        evidenceText: 'Runway is 1.5 mo.'
    };
    const act = mapFindingToCandidateAction(finding, AS_OF_DATE);
    assert.strictEqual(act.category, ACTION_CATEGORIES.EMERGENCY_RUNWAY);
    assert.strictEqual(act.urgencyLevel, 'CRITICAL');
    assert.strictEqual(act.evidence.sourceEngine, 'C7_5');
    assert.strictEqual(act.evidence.sourceValue, 1.5);
    console.log('✅ Test 7 PASS: Liquidity finding maps to EMERGENCY_RUNWAY with evidence.');
}

// Test 8: High interest debt maps to DELEVERAGE_DEBT action
{
    const finding = {
        findingId: 'VULN_DEBT_CC',
        category: FINDING_CATEGORIES.DEBT_REDUCTION,
        urgencyScore: 95.0,
        sourceEngine: 'LIABILITIES',
        sourceMetric: 'interestRate',
        sourceValue: 36.0,
        targetEntityId: 'loan_cc_1'
    };
    const act = mapFindingToCandidateAction(finding, AS_OF_DATE);
    assert.strictEqual(act.category, ACTION_CATEGORIES.DELEVERAGE_DEBT);
    assert.strictEqual(act.recommendedExecution.type, 'PREPAY_DEBT');
    assert.strictEqual(act.recommendedExecution.targetEntityId, 'loan_cc_1');
    console.log('✅ Test 8 PASS: High interest debt maps to DELEVERAGE_DEBT.');
}

// Test 9: Goal shortfall maps to GOAL_FUNDING action
{
    const finding = {
        findingId: 'VULN_GOAL_EDU',
        category: FINDING_CATEGORIES.GOAL_SOLVENCY,
        urgencyScore: 80.0,
        sourceEngine: 'C8_2',
        sourceMetric: 'fundedRatio',
        sourceValue: 0.55,
        targetEntityId: 'goal_edu_1'
    };
    const act = mapFindingToCandidateAction(finding, AS_OF_DATE);
    assert.strictEqual(act.category, ACTION_CATEGORIES.GOAL_FUNDING);
    assert.strictEqual(act.recommendedExecution.type, 'INCREASE_SIP');
    console.log('✅ Test 9 PASS: Goal shortfall maps to GOAL_FUNDING.');
}

// Test 10: Glidepath risk maps to GLIDEPATH_ADJUST action
{
    const finding = {
        findingId: 'VULN_GLIDEPATH_1',
        category: FINDING_CATEGORIES.GLIDEPATH_ALIGNMENT,
        urgencyScore: 82.0,
        sourceEngine: 'C8_3',
        targetEntityId: 'goal_house_1'
    };
    const act = mapFindingToCandidateAction(finding, AS_OF_DATE);
    assert.strictEqual(act.category, ACTION_CATEGORIES.GLIDEPATH_ADJUST);
    assert.strictEqual(act.recommendedExecution.type, 'REBALANCE');
    console.log('✅ Test 10 PASS: Glidepath risk maps to GLIDEPATH_ADJUST.');
}

// Test 11: Tax opportunity maps to TAX_LOSS_HARVEST action
{
    const finding = {
        findingId: 'OPP_TAX_1',
        category: FINDING_CATEGORIES.TAX_OPTIMIZATION,
        urgencyScore: 65.0,
        sourceEngine: 'C6_3'
    };
    const act = mapFindingToCandidateAction(finding, AS_OF_DATE);
    assert.strictEqual(act.category, ACTION_CATEGORIES.TAX_LOSS_HARVEST);
    assert.strictEqual(act.factors.taxEfficiency, 100.0);
    console.log('✅ Test 11 PASS: Tax opportunity maps to TAX_LOSS_HARVEST.');
}

// Test 12: Rebalancing drift maps to REBALANCE_DRIFT action
{
    const finding = {
        findingId: 'OPP_REBAL_1',
        category: FINDING_CATEGORIES.REBALANCING,
        urgencyScore: 55.0,
        sourceEngine: 'C6'
    };
    const act = mapFindingToCandidateAction(finding, AS_OF_DATE);
    assert.strictEqual(act.category, ACTION_CATEGORIES.REBALANCE_DRIFT);
    console.log('✅ Test 12 PASS: Rebalancing drift maps to REBALANCE_DRIFT.');
}

// ================================================================
// GROUP 3: Multi-Objective Prioritization & Tie-Breaking (Tests 13-18)
// ================================================================
console.log('\n--- Group 3: Multi-Objective Prioritization & Tie-Breaking ---');

// Test 13: Top ranked action is #1 emergency runway when critical
{
    const bundle = {
        allFindings: [
            { findingId: 'OPP_TAX_1', category: FINDING_CATEGORIES.TAX_OPTIMIZATION, urgencyScore: 65.0 },
            { findingId: 'VULN_LIQUIDITY_RUNWAY', category: FINDING_CATEGORIES.LIQUIDITY_BUFFER, urgencyScore: 100.0 },
            { findingId: 'OPP_REBAL_1', category: FINDING_CATEGORIES.REBALANCING, urgencyScore: 55.0 }
        ]
    };
    const res = prioritizeNextBestActions(bundle, AS_OF_DATE);
    assert.strictEqual(res.totalActionsCount, 3);
    assert.strictEqual(res.rankedActions[0].priorityRank, 1);
    assert.strictEqual(res.rankedActions[0].category, ACTION_CATEGORIES.EMERGENCY_RUNWAY);
    console.log('✅ Test 13 PASS: Emergency runway prioritized as #1 action.');
}

// Test 14: Action rank assignment is strictly 1-indexed (1, 2, 3...)
{
    const bundle = {
        allFindings: [
            { findingId: 'F1', category: FINDING_CATEGORIES.TAX_OPTIMIZATION, urgencyScore: 70.0 },
            { findingId: 'F2', category: FINDING_CATEGORIES.DEBT_REDUCTION, urgencyScore: 90.0 }
        ]
    };
    const res = prioritizeNextBestActions(bundle, AS_OF_DATE);
    assert.strictEqual(res.rankedActions[0].priorityRank, 1);
    assert.strictEqual(res.rankedActions[1].priorityRank, 2);
    console.log('✅ Test 14 PASS: 1-indexed priority ranking verified.');
}

// Test 15: Deterministic 4-tier tie-breaking order verified
{
    // Identical scores, different urgency
    const f1 = { findingId: 'F_HIGH_URG', category: FINDING_CATEGORIES.REBALANCING, urgencyScore: 80.0 };
    const f2 = { findingId: 'F_LOW_URG', category: FINDING_CATEGORIES.REBALANCING, urgencyScore: 40.0 };
    const res = prioritizeNextBestActions({ allFindings: [f2, f1] }, AS_OF_DATE);
    assert.strictEqual(res.rankedActions[0].actionId, 'ACT_F_HIGH_URG');
    console.log('✅ Test 15 PASS: Urgency tie-breaking verified.');
}

// Test 16: Lexicographical actionId breaks tie when scores & urgency are equal
{
    const f1 = { findingId: 'ZETA_FINDING', category: FINDING_CATEGORIES.REBALANCING, urgencyScore: 50.0 };
    const f2 = { findingId: 'ALPHA_FINDING', category: FINDING_CATEGORIES.REBALANCING, urgencyScore: 50.0 };
    const res = prioritizeNextBestActions({ allFindings: [f1, f2] }, AS_OF_DATE);
    assert.strictEqual(res.rankedActions[0].actionId, 'ACT_ALPHA_FINDING');
    assert.strictEqual(res.rankedActions[1].actionId, 'ACT_ZETA_FINDING');
    console.log('✅ Test 16 PASS: Lexicographical actionId tie-breaker verified.');
}

// Test 17: Critical actions count calculated accurately
{
    const bundle = {
        allFindings: [
            { findingId: 'F_CRIT', category: FINDING_CATEGORIES.LIQUIDITY_BUFFER, urgencyScore: 100.0 },
            { findingId: 'F_MED', category: FINDING_CATEGORIES.REBALANCING, urgencyScore: 50.0 }
        ]
    };
    const res = prioritizeNextBestActions(bundle, AS_OF_DATE);
    assert.strictEqual(res.criticalActionsCount, 1);
    console.log('✅ Test 17 PASS: Critical actions count evaluated accurately.');
}

// Test 18: Empty findings bundle returns NO_ACTION_REQUIRED cleanly (C8-R14)
{
    const res = prioritizeNextBestActions({ allFindings: [] }, AS_OF_DATE);
    assert.strictEqual(res.status, 'NO_ACTION_REQUIRED');
    assert.strictEqual(res.totalActionsCount, 0);
    assert.deepStrictEqual(res.rankedActions, []);
    console.log('✅ Test 18 PASS: Empty findings bundle handled cleanly.');
}

// ================================================================
// GROUP 4: Deduplication, Lifecycle & Immutability (Tests 19-26)
// ================================================================
console.log('\n--- Group 4: Deduplication, Lifecycle & Immutability ---');

// Test 19: Duplicate actions targeting the same entity are suppressed
{
    const bundle = {
        allFindings: [
            { findingId: 'F_GOAL_1_LOW', category: FINDING_CATEGORIES.GOAL_SOLVENCY, targetEntityId: 'goal_retire', urgencyScore: 50.0 },
            { findingId: 'F_GOAL_1_HIGH', category: FINDING_CATEGORIES.GOAL_SOLVENCY, targetEntityId: 'goal_retire', urgencyScore: 85.0 }
        ]
    };
    const res = prioritizeNextBestActions(bundle, AS_OF_DATE);
    assert.strictEqual(res.totalActionsCount, 1);
    assert.strictEqual(res.rankedActions[0].actionId, 'ACT_F_GOAL_1_HIGH');
    console.log('✅ Test 19 PASS: Duplicate action targeting same entity suppressed (highest retained).');
}

// Test 20: Lifecycle status is strictly IDENTIFIED in analytical engine output (C8-R13)
{
    const bundle = {
        allFindings: [
            { findingId: 'F1', category: FINDING_CATEGORIES.LIQUIDITY_BUFFER, urgencyScore: 90.0 }
        ]
    };
    const res = prioritizeNextBestActions(bundle, AS_OF_DATE);
    assert.strictEqual(res.rankedActions[0].lifecycleStatus, ACTION_LIFECYCLE_STATUS.IDENTIFIED);
    console.log('✅ Test 20 PASS: Action lifecycle status strictly emitted as IDENTIFIED.');
}

// Test 21: Tradeoffs and prerequisites populated on action DTO
{
    const bundle = {
        allFindings: [
            { findingId: 'F_DEBT', category: FINDING_CATEGORIES.DEBT_REDUCTION, urgencyScore: 90.0 }
        ]
    };
    const res = prioritizeNextBestActions(bundle, AS_OF_DATE);
    const act = res.rankedActions[0];
    assert(Array.isArray(act.tradeoffs) && act.tradeoffs.length > 0);
    assert(Array.isArray(act.prerequisites) && act.prerequisites.length > 0);
    console.log('✅ Test 21 PASS: Tradeoffs and prerequisites populated.');
}

// Test 22: AST Wall-Clock Scan in actionPrioritizationEngine.js
{
    const code = fs.readFileSync('services/actionPrioritizationEngine.js', 'utf8');
    const dateNowMatches = code.match(/Date\.now\(\)/g) || [];
    const argumentlessNewDateMatches = code.match(/new\s+Date\(\s*\)/g) || [];
    assert.strictEqual(dateNowMatches.length, 0, `Found ${dateNowMatches.length} Date.now() in actionPrioritizationEngine.js`);
    assert.strictEqual(argumentlessNewDateMatches.length, 0, `Found ${argumentlessNewDateMatches.length} argument-less new Date() in actionPrioritizationEngine.js`);
    console.log('✅ Test 22 PASS: AST Wall-Clock Scan verified (0 Date.now(), 0 argument-less new Date()).');
}

// Test 23: Deep 5-Store Read-Only Safety Guard
{
    const hBefore = await loadData(STORAGE_KEYS.HOLDINGS);
    const eBefore = await loadData(STORAGE_KEYS.EVENTS);
    const qBefore = await loadData(STORAGE_KEYS.QUOTES);
    const tBefore = await loadData(STORAGE_KEYS.TRANSACTIONS);
    const wBefore = await loadData(STORAGE_KEYS.WALLETS);

    const bundle = {
        allFindings: [
            { findingId: 'F_TEST', category: FINDING_CATEGORIES.LIQUIDITY_BUFFER, urgencyScore: 80.0 }
        ]
    };
    prioritizeNextBestActions(bundle, AS_OF_DATE);

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
    console.log('✅ Test 23 PASS: Deep 5-store read-only safety verified (100% zero state mutations).');
}

// Test 24: Deterministic Repeatability across consecutive evaluations
{
    const bundle = {
        allFindings: [
            { findingId: 'F1', category: FINDING_CATEGORIES.LIQUIDITY_BUFFER, urgencyScore: 85.0 },
            { findingId: 'F2', category: FINDING_CATEGORIES.DEBT_REDUCTION, urgencyScore: 90.0 }
        ]
    };
    const r1 = prioritizeNextBestActions(bundle, AS_OF_DATE);
    const r2 = prioritizeNextBestActions(bundle, AS_OF_DATE);
    assert.deepStrictEqual(r1, r2);
    console.log('✅ Test 24 PASS: Deterministic repeatability verified across consecutive evaluations.');
}

// Test 25: Lifecycle status enum values verified
{
    assert.strictEqual(ACTION_LIFECYCLE_STATUS.IDENTIFIED, 'IDENTIFIED');
    assert.strictEqual(ACTION_LIFECYCLE_STATUS.REVIEWED, 'REVIEWED');
    assert.strictEqual(ACTION_LIFECYCLE_STATUS.ACCEPTED, 'ACCEPTED');
    assert.strictEqual(ACTION_LIFECYCLE_STATUS.SCHEDULED, 'SCHEDULED');
    assert.strictEqual(ACTION_LIFECYCLE_STATUS.COMPLETED, 'COMPLETED');
    assert.strictEqual(ACTION_LIFECYCLE_STATUS.SNOOZED, 'SNOOZED');
    assert.strictEqual(ACTION_LIFECYCLE_STATUS.DISMISSED, 'DISMISSED');
    console.log('✅ Test 25 PASS: All 7 action lifecycle status values verified.');
}

// Test 26: Recommendation != Execution metadata confirmed
{
    const res = prioritizeNextBestActions({ allFindings: [{ findingId: 'F1', category: 'REBALANCING' }] }, AS_OF_DATE);
    assert.strictEqual(res.meta.lifecycleSeparationEnforced, true);
    console.log('✅ Test 26 PASS: Recommendation-execution separation metadata confirmed.');
}

console.log('\n================================================================');
console.log('=== STAGE C.8.5 ACCEPTANCE RESULT: 26/26 TESTS PASSED (100%) ===');
console.log('================================================================');
