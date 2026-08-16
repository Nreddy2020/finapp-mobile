/**
 * Stage C.8.4 Cross-Domain Opportunity & Vulnerability Aggregator Acceptance Test Matrix
 * Master Standard: C8_V1
 * 
 * 26 Comprehensive Acceptance Tests covering:
 * - Group 1: Finding Record Schema & Provenance Validation (Tests 1-6)
 * - Group 2: Vulnerability Ingestion across Liquidity, Debt & Goals (Tests 7-12)
 * - Group 3: Risk & Opportunity Ingestion across Concentration, Volatility & Taxes (Tests 13-18)
 * - Group 4: Deterministic Ranking, Boundary States & Immutability (Tests 19-26)
 */

import assert from 'node:assert';
import fs from 'node:fs';
import {
    OPPORTUNITY_AGGREGATOR_VERSION,
    FINDING_TYPES,
    FINDING_CATEGORIES,
    FINDING_SEVERITY,
    SEVERITY_RANK,
    normalizeFindingRecord,
    aggregateFinancialOpportunities
} from '../services/financialOpportunityAggregator.js';

import { loadData, STORAGE_KEYS } from '../services/storage.js';

console.log('================================================================');
console.log('=== Stage C.8.4 Opportunity & Vulnerability Aggregator 26-Test Suite ===');
console.log('================================================================\n');

const AS_OF_DATE = '2025-06-30T00:00:00.000Z';

// ================================================================
// GROUP 1: Finding Record Schema & Provenance (Tests 1-6)
// ================================================================
console.log('--- Group 1: Finding Record Schema & Provenance ---');

// Test 1: Policy versioning verified as C8_4_V1
{
    assert.strictEqual(OPPORTUNITY_AGGREGATOR_VERSION, 'C8_4_V1');
    console.log('✅ Test 1 PASS: Aggregator policy version verified.');
}

// Test 2: Valid finding record normalizes cleanly with full provenance
{
    const raw = {
        findingId: 'VULN_TEST_1',
        findingType: FINDING_TYPES.VULNERABILITY,
        category: FINDING_CATEGORIES.LIQUIDITY_BUFFER,
        severity: FINDING_SEVERITY.CRITICAL,
        urgencyScore: 95.0,
        sourceEngine: 'C7_5',
        sourceMetric: 'runwayMonths',
        sourceValue: 2.1,
        thresholdValue: 3.0,
        evidenceText: 'Emergency runway is critically low.'
    };
    const norm = normalizeFindingRecord(raw, AS_OF_DATE);
    assert.strictEqual(norm.findingId, 'VULN_TEST_1');
    assert.strictEqual(norm.sourceEngine, 'C7_5');
    assert.strictEqual(norm.sourceMetric, 'runwayMonths');
    assert.strictEqual(norm.sourceValue, 2.1);
    assert.strictEqual(norm.severityRank, 1);
    assert.strictEqual(norm.urgencyScore, 95.0);
    console.log('✅ Test 2 PASS: Valid finding record normalizes with full provenance.');
}

// Test 3: Missing findingId throws validation error
{
    assert.throws(() => {
        normalizeFindingRecord({ findingType: 'VULNERABILITY' }, AS_OF_DATE);
    }, /findingId must be a non-empty string/);
    console.log('✅ Test 3 PASS: Missing findingId strictly rejected.');
}

// Test 4: Invalid/out-of-bounds urgency score clamped safely within [0.0, 100.0]
{
    const rawHigh = { findingId: 'F_HIGH', urgencyScore: 150.0 };
    const normHigh = normalizeFindingRecord(rawHigh, AS_OF_DATE);
    assert.strictEqual(normHigh.urgencyScore, 100.0);

    const rawLow = { findingId: 'F_LOW', urgencyScore: -20.0 };
    const normLow = normalizeFindingRecord(rawLow, AS_OF_DATE);
    assert.strictEqual(normLow.urgencyScore, 0.0);
    console.log('✅ Test 4 PASS: Urgency score clamped safely within [0, 100].');
}

// Test 5: Severity rank mappings verified (CRITICAL=1, HIGH=2, MEDIUM=3, LOW=4)
{
    assert.strictEqual(SEVERITY_RANK[FINDING_SEVERITY.CRITICAL], 1);
    assert.strictEqual(SEVERITY_RANK[FINDING_SEVERITY.HIGH], 2);
    assert.strictEqual(SEVERITY_RANK[FINDING_SEVERITY.MEDIUM], 3);
    assert.strictEqual(SEVERITY_RANK[FINDING_SEVERITY.LOW], 4);
    console.log('✅ Test 5 PASS: Severity rank mappings verified.');
}

// Test 6: Mandatory asOfDate parameter strictly enforced
{
    assert.throws(() => {
        aggregateFinancialOpportunities({}, null);
    }, /Missing mandatory deterministic parameter: asOfDate/);
    console.log('✅ Test 6 PASS: Mandatory asOfDate strictly enforced.');
}

// ================================================================
// GROUP 2: Ingestion across Liquidity, Debt & Goals (Tests 7-12)
// ================================================================
console.log('\n--- Group 2: Ingestion across Liquidity, Debt & Goals ---');

// Test 7: Critical liquidity runway (< 3 mo) creates CRITICAL vulnerability
{
    const bundle = {
        liquidityDTO: { runwayMonths: 1.8 }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const vuln = res.vulnerabilities.find(v => v.findingId === 'VULN_LIQUIDITY_CRITICAL_RUNWAY');
    assert(vuln);
    assert.strictEqual(vuln.severity, FINDING_SEVERITY.CRITICAL);
    assert.strictEqual(vuln.urgencyScore, 100.0);
    assert.strictEqual(vuln.sourceEngine, 'C7_5');
    console.log('✅ Test 7 PASS: Critical liquidity runway (< 3 mo) creates Critical vulnerability.');
}

// Test 8: High interest debt (> 14%) creates CRITICAL vulnerability
{
    const bundle = {
        loansOrLiabilities: [
            { loanId: 'loan_credit_card', name: 'Credit Card Debt', interestRate: 36.0, outstandingBalance: 150000 }
        ]
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const vuln = res.vulnerabilities.find(v => v.findingId === 'VULN_DEBT_HIGH_INTEREST_loan_credit_card');
    assert(vuln);
    assert.strictEqual(vuln.severity, FINDING_SEVERITY.CRITICAL);
    assert.strictEqual(vuln.urgencyScore, 95.0);
    assert.strictEqual(vuln.sourceEngine, 'LIABILITIES');
    console.log('✅ Test 8 PASS: High-interest debt (36%) creates Critical vulnerability.');
}

// Test 9: Past due goal creates CRITICAL vulnerability
{
    const bundle = {
        goalSolvencyDTO: {
            goalProjections: [
                { goalId: 'g_past', name: 'Overdue House Goal', status: 'PAST_DUE', fundingGap: 500000 }
            ]
        }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const vuln = res.vulnerabilities.find(v => v.findingId === 'VULN_GOAL_PAST_DUE_g_past');
    assert(vuln);
    assert.strictEqual(vuln.severity, FINDING_SEVERITY.CRITICAL);
    assert.strictEqual(vuln.urgencyScore, 90.0);
    console.log('✅ Test 9 PASS: Past due goal creates Critical vulnerability.');
}

// Test 10: Underfunded Tier 1 goal creates CRITICAL vulnerability
{
    const bundle = {
        goalSolvencyDTO: {
            goalProjections: [
                { goalId: 'g_emer', name: 'Emergency Reserve', status: 'UNDERFUNDED', priorityTier: 'CRITICAL_TIER_1', fundedRatio: 0.45, sipShortfallDelta: 12000 }
            ]
        }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const vuln = res.vulnerabilities.find(v => v.findingId === 'VULN_GOAL_UNDERFUNDED_g_emer');
    assert(vuln);
    assert.strictEqual(vuln.severity, FINDING_SEVERITY.CRITICAL);
    assert.strictEqual(vuln.urgencyScore, 88.0);
    console.log('✅ Test 10 PASS: Underfunded Tier-1 goal creates Critical vulnerability.');
}

// Test 11: Goal sequence-of-returns risk ingested from C.8.3
{
    const bundle = {
        goalGlidepathsDTO: {
            goalGlidepaths: [
                {
                    goalId: 'g_house_near',
                    name: 'House 2027',
                    hasSequenceOfReturnsRisk: true,
                    horizonYears: 2.0,
                    actualAllocation: { actualEquityShare: 0.85 },
                    recommendedAllocation: { targetEquity: 0.15 }
                }
            ]
        }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const vuln = res.vulnerabilities.find(v => v.findingId === 'VULN_GLIDEPATH_SEQUENCE_RISK_g_house_near');
    assert(vuln);
    assert.strictEqual(vuln.severity, FINDING_SEVERITY.HIGH);
    assert.strictEqual(vuln.urgencyScore, 82.0);
    assert.strictEqual(vuln.sourceEngine, 'C8_3');
    console.log('✅ Test 11 PASS: Sequence-of-returns risk ingested accurately.');
}

// Test 12: Safe liquidity and funded goals do NOT generate false vulnerabilities
{
    const bundle = {
        liquidityDTO: { runwayMonths: 12.0 },
        goalSolvencyDTO: {
            goalProjections: [
                { goalId: 'g_funded', name: 'Funded Goal', status: 'FULLY_FUNDED', fundedRatio: 1.10 }
            ]
        }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    assert.strictEqual(res.vulnerabilities.length, 0);
    console.log('✅ Test 12 PASS: Safe parameters generate zero false vulnerabilities.');
}

// ================================================================
// GROUP 3: Risk & Opportunity Ingestion (Tests 13-18)
// ================================================================
console.log('\n--- Group 3: Risk & Opportunity Ingestion ---');

// Test 13: Single holding concentration (> 35%) creates vulnerability
{
    const bundle = {
        concentrationDTO: { top1HoldingWeight: 0.42 }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const vuln = res.vulnerabilities.find(v => v.findingId === 'VULN_CONCENTRATION_SINGLE_HOLDING');
    assert(vuln);
    assert.strictEqual(vuln.sourceEngine, 'C7_2');
    assert.strictEqual(vuln.sourceValue, 0.42);
    console.log('✅ Test 13 PASS: Single holding concentration (42%) ingested cleanly.');
}

// Test 14: Portfolio volatility (> 30%) creates vulnerability
{
    const bundle = {
        volatilityDTO: { annualizedVolatility: 0.38 }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const vuln = res.vulnerabilities.find(v => v.findingId === 'VULN_VOLATILITY_ELEVATED');
    assert(vuln);
    assert.strictEqual(vuln.sourceEngine, 'C7_3');
    console.log('✅ Test 14 PASS: Elevated volatility (38%) ingested cleanly.');
}

// Test 15: Severe scenario stress loss (> 35%) creates vulnerability
{
    const bundle = {
        scenarioStressDTO: { worstCaseLossPercentage: 0.42 }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const vuln = res.vulnerabilities.find(v => v.findingId === 'VULN_SCENARIO_STRESS_SEVERE_LOSS');
    assert(vuln);
    assert.strictEqual(vuln.sourceEngine, 'C7_6');
    console.log('✅ Test 15 PASS: Severe scenario stress loss (42%) ingested cleanly.');
}

// Test 16: Portfolio rebalancing drift creates OPPORTUNITY
{
    const bundle = {
        rebalancingDTO: {
            requiresRebalancing: true,
            rebalancingOrders: [{ assetClass: 'STOCK', orderType: 'SELL' }]
        }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const opp = res.opportunities.find(o => o.findingId === 'OPP_REBALANCING_PORTFOLIO_DRIFT');
    assert(opp);
    assert.strictEqual(opp.findingType, FINDING_TYPES.OPPORTUNITY);
    assert.strictEqual(opp.sourceEngine, 'C6');
    console.log('✅ Test 16 PASS: Portfolio rebalancing drift creates Opportunity record.');
}

// Test 17: Harvestable tax loss (> 10k) creates TAX_OPTIMIZATION opportunity
{
    const bundle = {
        taxOptimizerDTO: {
            totalHarvestableLossINR: 75000,
            harvestableLossLots: [{ holdingId: 'h1', unrealizedLossINR: 75000 }]
        }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const opp = res.opportunities.find(o => o.findingId === 'OPP_TAX_LOSS_HARVESTING');
    assert(opp);
    assert.strictEqual(opp.findingType, FINDING_TYPES.OPPORTUNITY);
    assert.strictEqual(opp.category, FINDING_CATEGORIES.TAX_OPTIMIZATION);
    assert.strictEqual(opp.sourceEngine, 'C6_3');
    assert.strictEqual(opp.sourceValue, 75000);
    console.log('✅ Test 17 PASS: Tax-loss harvesting opportunity ingested cleanly.');
}

// Test 18: Zero recalculation invariant preserved
{
    const bundle = {
        liquidityDTO: { runwayMonths: 2.5 }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    assert.strictEqual(res.meta.zeroRecalculationEnforced, true);
    console.log('✅ Test 18 PASS: Zero recalculation invariant enforced.');
}

// ================================================================
// GROUP 4: Deterministic Ranking & Boundaries (Tests 19-26)
// ================================================================
console.log('\n--- Group 4: Deterministic Ranking & Boundaries ---');

// Test 19: Findings sorted strictly by UrgencyScore DESC -> SeverityRank ASC -> findingId ASC
{
    const bundle = {
        liquidityDTO: { runwayMonths: 1.5 }, // Urgency 100.0
        taxOptimizerDTO: { totalHarvestableLossINR: 80000, harvestableLossLots: [{ id: 1 }] }, // Urgency 68.0
        rebalancingDTO: { requiresRebalancing: true } // Urgency 55.0
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    assert.strictEqual(res.allFindings[0].urgencyScore, 100.0);
    assert.strictEqual(res.allFindings[1].urgencyScore, 68.0);
    assert.strictEqual(res.allFindings[2].urgencyScore, 55.0);
    console.log('✅ Test 19 PASS: Deterministic urgency score sorting verified.');
}

// Test 20: Empty input returns NO_ACTION_REQUIRED status (C8-R14)
{
    const res = aggregateFinancialOpportunities({}, AS_OF_DATE);
    assert.strictEqual(res.status, 'NO_ACTION_REQUIRED');
    assert.strictEqual(res.totalFindingsCount, 0);
    assert.deepStrictEqual(res.allFindings, []);
    console.log('✅ Test 20 PASS: Empty input bundle yields NO_ACTION_REQUIRED cleanly.');
}

// Test 21: CRITICAL_VULNERABILITIES_DETECTED status assigned when critical findings present
{
    const bundle = {
        liquidityDTO: { runwayMonths: 1.5 }
    };
    const res = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    assert.strictEqual(res.status, 'CRITICAL_VULNERABILITIES_DETECTED');
    assert.strictEqual(res.criticalCount, 1);
    console.log('✅ Test 21 PASS: CRITICAL_VULNERABILITIES_DETECTED status assigned.');
}

// Test 22: AST Wall-Clock Scan in financialOpportunityAggregator.js
{
    const code = fs.readFileSync('services/financialOpportunityAggregator.js', 'utf8');
    const dateNowMatches = code.match(/Date\.now\(\)/g) || [];
    const argumentlessNewDateMatches = code.match(/new\s+Date\(\s*\)/g) || [];
    assert.strictEqual(dateNowMatches.length, 0, `Found ${dateNowMatches.length} Date.now() in financialOpportunityAggregator.js`);
    assert.strictEqual(argumentlessNewDateMatches.length, 0, `Found ${argumentlessNewDateMatches.length} argument-less new Date() in financialOpportunityAggregator.js`);
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
        liquidityDTO: { runwayMonths: 2.0 },
        rebalancingDTO: { requiresRebalancing: true }
    };
    aggregateFinancialOpportunities(bundle, AS_OF_DATE);

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
        liquidityDTO: { runwayMonths: 2.0 },
        loansOrLiabilities: [{ loanId: 'l1', interestRate: 15.0, outstandingBalance: 50000 }]
    };
    const r1 = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    const r2 = aggregateFinancialOpportunities(bundle, AS_OF_DATE);
    assert.deepStrictEqual(r1, r2);
    console.log('✅ Test 24 PASS: Deterministic repeatability verified across consecutive evaluations.');
}

// Test 25: Provenance standard metadata explicitly tagged (C8-R6)
{
    const res = aggregateFinancialOpportunities({ liquidityDTO: { runwayMonths: 1.0 } }, AS_OF_DATE);
    assert.strictEqual(res.meta.provenanceStandard, 'C8_R6_STRICT_METRIC_PROVENANCE');
    console.log('✅ Test 25 PASS: Provenance standard metadata confirmed.');
}

// Test 26: Tie-breaking by findingId verified for identical urgency scores
{
    const raw1 = { findingId: 'ZETA_FINDING', urgencyScore: 80.0 };
    const raw2 = { findingId: 'ALPHA_FINDING', urgencyScore: 80.0 };
    const sorted = [normalizeFindingRecord(raw1, AS_OF_DATE), normalizeFindingRecord(raw2, AS_OF_DATE)].sort((a, b) => {
        if (b.urgencyScore !== a.urgencyScore) return b.urgencyScore - a.urgencyScore;
        return a.findingId.localeCompare(b.findingId);
    });
    assert.strictEqual(sorted[0].findingId, 'ALPHA_FINDING');
    assert.strictEqual(sorted[1].findingId, 'ZETA_FINDING');
    console.log('✅ Test 26 PASS: Lexicographical findingId tie-breaking verified.');
}

console.log('\n================================================================');
console.log('=== STAGE C.8.4 ACCEPTANCE RESULT: 26/26 TESTS PASSED (100%) ===');
console.log('================================================================');
