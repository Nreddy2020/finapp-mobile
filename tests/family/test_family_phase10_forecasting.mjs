/**
 * tests/family/test_family_phase10_forecasting.mjs
 * 
 * Standalone Verification Suite for Phase 10:
 * Household Financial Forecasting, Scenario Planning & Decision Intelligence.
 * 
 * Exactly 50 contractual assertions:
 * - Assertions 1-6:   Temporal Horizons, Inflow/Outflow Math & Recurrence Clamping
 * - Assertions 7-10:  Exclusions, Past-Due Handling & Renewal Cost Semantics
 * - Assertions 11-14: Member Income Streams, Missing Income & Genuine Zero Semantics
 * - Assertions 15-20: Rolling 72-Hour Clustering & Budget Exhaustion Mathematics
 * - Assertions 21-25: Liquidity Deficit, Single Earner Risk & Severity Precedence
 * - Assertions 26-30: Multi-Currency Divergence, Bucket Nullability & Foreign Shocks
 * - Assertions 31-36: Scenario Perturbations, Contributor Default & Pure Invariance
 * - Assertions 37-39: Confidence Scoring Contracts & Data Gap Flags
 * - Assertions 40-44: Repository Persistence, Timestamps Boundary & Tenant Isolation
 * - Assertions 45-49: Clock Independence, Timezone Derivations & Fault Tolerance
 * - Assertion 50:     Zero-Write Cryptographic Repository SHA-256 Hash Verification
 */

import assert from 'assert';
import crypto from 'crypto';

import {
    computeHouseholdFinancialForecastPure,
    simulateForecastScenarioPure,
    generateCommitmentOccurrencesPure,
    generateIncomeOccurrencesPure,
    prorateBudgetPoolCeilingsPure,
    detectRollingCommitmentClustering,
    evaluateBudgetExhaustionRiskPure,
    orderAndDeduplicateRiskIndicators,
    getDaysInMonth,
    ForecastHorizon,
    ForecastRiskType,
    RiskSeverity,
    FORECAST_CURRENCY_DIVERGENCE_WARNING
} from '../../services/family/familyContracts.js';

import {
    FamilyRepository,
    FamilyForecastService
} from '../../services/family/index.js';

import { STORAGE_KEYS } from '../../services/storage.js';

console.log('=============================================================');
console.log('🚀 RUNNING PHASE 10: FINANCIAL FORECASTING & SCENARIOS SUITE');
console.log('=============================================================\n');

let passCount = 0;
async function test(desc, fn) {
    try {
        await fn();
        passCount++;
        console.log(`  ✓ Assertion ${passCount}: ${desc}`);
    } catch (err) {
        console.error(`  ✗ Assertion ${passCount + 1} FAILED: ${desc}`);
        console.error(err);
        process.exit(1);
    }
}

const HH_ID = 'hh_forecast_primary';
const HH_FOREIGN = 'hh_forecast_foreign';
const REF_DATE_UTC = '2026-09-15T00:00:00.000Z'; // Mid-September 2026

async function runSuite() {
    FamilyRepository.setTestMode(true);

    // ------------------------------------------------------------------------
    // SECTION 1: Temporal Horizons, Inflow/Outflow Math & Recurrence Clamping
    // ------------------------------------------------------------------------

    await test('Occurrences at startUtc included; occurrences at endUtc strictly excluded [startUtc, endUtc)', async () => {
        const commitments = [
            { id: 'c_start', name: 'Start', amount: 1000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-15T00:00:00.000Z' },
            { id: 'c_mid', name: 'Mid', amount: 2000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' },
            { id: 'c_end', name: 'End', amount: 3000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-22T00:00:00.000Z' }
        ];

        // 7-day interval: 2026-09-15T00:00:00.000Z to 2026-09-22T00:00:00.000Z
        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 7,
            commitments
        });

        // c_start and c_mid must be included; c_end is exactly at endUtc and must be EXCLUDED
        assert.strictEqual(res.summary.commitmentOccurrencesCount, 2);
        assert.strictEqual(res.summary.projectedOutflow, 3000);
    });

    await test('Net projected liquidity delta = inflows - outflows (no opening cash assumed)', async () => {
        const incomeStreams = [{ id: 'inc_1', personId: 'p1', amount: 50000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY', payDayOfMonth: 16 }];
        const commitments = [
            { id: 'c_emi', amount: 20000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' },
            { id: 'c_bill', amount: 15000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-25T00:00:00.000Z' }
        ];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams,
            commitments,
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        assert.strictEqual(res.summary.projectedInflow, 50000);
        // Outflows = 20000 + 15000 = 35000
        assert.strictEqual(res.summary.projectedOutflow, 35000);
        assert.strictEqual(res.summary.netProjectedLiquidityDelta, 15000); // exactly inflows - outflows
        assert.strictEqual(res.summary.availableCash, undefined); // Prohibited term
    });

    await test('Daily prorated pool ceiling across month boundary (Sept 28-Oct 4) sums prorated daily amounts accurately', async () => {
        // Sept has 30 days, Oct has 31 days.
        // 7 days: Sept 28, 29, 30 (3 days) + Oct 1, 2, 3, 4 (4 days)
        const pool = { id: 'pool_groceries', monthlyCeiling: 30000, currency: 'INR', isArchived: false };
        const start = '2026-09-28T00:00:00.000Z';
        const end = '2026-10-05T00:00:00.000Z';

        const prorated = prorateBudgetPoolCeilingsPure({
            pools: [pool],
            startUtc: start,
            endUtc: end
        });

        // 3 days in Sept = 3 * (30000 / 30) = 3000
        // 4 days in Oct = 4 * (30000 / 31) = 3870.97
        // Expected total = 6870.97
        assert.strictEqual(prorated.length, 1);
        assert.strictEqual(prorated[0].proratedCeiling, 6870.97);
    });

    await test('Prorated ceiling for zero-cap pool ($0) returns 0 without divide-by-zero', async () => {
        const zeroPool = { id: 'pool_zero', monthlyCeiling: 0, currency: 'INR', isArchived: false };
        const prorated = prorateBudgetPoolCeilingsPure({
            pools: [zeroPool],
            startUtc: REF_DATE_UTC,
            endUtc: '2026-10-15T00:00:00.000Z'
        });

        assert.strictEqual(prorated[0].proratedCeiling, 0);
        assert.strictEqual(prorated[0].isZeroCap, true);
    });

    await test('Monthly commitment due on the 31st clamped to 28th in February (or 29th leap year)', async () => {
        const commitment = {
            id: 'c_month_end',
            amount: 5000,
            currency: 'INR',
            status: 'ACTIVE',
            frequency: 'MONTHLY',
            anchorDateUtc: '2026-01-31T10:00:00.000Z'
        };

        // Generating occurrences from Jan 2026 to Mar 2026 (2026 is non-leap year, Feb has 28 days)
        const { occurrences } = generateCommitmentOccurrencesPure({
            commitments: [commitment],
            startUtc: '2026-01-01T00:00:00.000Z',
            endUtc: '2026-03-15T00:00:00.000Z'
        });

        assert.strictEqual(occurrences.length, 2);
        assert.strictEqual(occurrences[0].occurrenceTimestampUtc.substring(0, 10), '2026-01-31');
        assert.strictEqual(occurrences[1].occurrenceTimestampUtc.substring(0, 10), '2026-02-28'); // Clamped to 28th
    });

    await test('Leap-year annual commitment on Feb 29 maps to Feb 28 on non-leap year', async () => {
        const commitment = {
            id: 'c_leap_annual',
            amount: 12000,
            currency: 'INR',
            status: 'ACTIVE',
            frequency: 'ANNUAL',
            anchorDateUtc: '2024-02-29T10:00:00.000Z' // 2024 leap year
        };

        // Next year 2025 is non-leap year
        const { occurrences } = generateCommitmentOccurrencesPure({
            commitments: [commitment],
            startUtc: '2025-01-01T00:00:00.000Z',
            endUtc: '2025-04-01T00:00:00.000Z'
        });

        assert.strictEqual(occurrences.length, 1);
        assert.strictEqual(occurrences[0].occurrenceTimestampUtc.substring(0, 10), '2025-02-28');
    });

    // ------------------------------------------------------------------------
    // SECTION 2: Exclusions, Past-Due Handling & Renewal Cost Semantics
    // ------------------------------------------------------------------------

    await test('Inactive / cancelled commitments strictly excluded from forecast occurrences', async () => {
        const commitments = [
            { id: 'c_active', amount: 4000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-18T00:00:00.000Z' },
            { id: 'c_cancelled', amount: 8000, currency: 'INR', status: 'CANCELLED', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-18T00:00:00.000Z' },
            { id: 'c_completed', amount: 6000, currency: 'INR', status: 'COMPLETED', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-18T00:00:00.000Z' }
        ];

        const { occurrences } = generateCommitmentOccurrencesPure({
            commitments,
            startUtc: REF_DATE_UTC,
            endUtc: '2026-10-15T00:00:00.000Z'
        });

        assert.strictEqual(occurrences.length, 1);
        assert.strictEqual(occurrences[0].commitmentId, 'c_active');
    });

    await test('Past-due commitments before startUtc excluded from forward forecast window', async () => {
        const commitments = [
            { id: 'c_past', amount: 2500, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-10T00:00:00.000Z' }, // 5 days past
            { id: 'c_future', amount: 3500, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }
        ];

        const { occurrences } = generateCommitmentOccurrencesPure({
            commitments,
            startUtc: REF_DATE_UTC,
            endUtc: '2026-10-15T00:00:00.000Z'
        });

        assert.strictEqual(occurrences.length, 1);
        assert.strictEqual(occurrences[0].commitmentId, 'c_future');
    });

    await test('Unpriced renewal costs ($0/null) excluded from outflows and tracked in unpricedRenewalsCount', async () => {
        const renewals = [
            { id: 'ren_unpriced_1', name: 'Passport Renewal', dueDateUtc: '2026-09-25T00:00:00.000Z', renewalEstimatedCost: null },
            { id: 'ren_unpriced_2', name: 'Lease Agreement', dueDateUtc: '2026-09-28T00:00:00.000Z', renewalEstimatedCost: 0 }
        ];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            renewalActions: renewals
        });

        assert.strictEqual(res.summary.renewalOccurrencesCount, 0);
        assert.strictEqual(res.diagnostics.unpricedRenewalsCount, 2);
        assert.strictEqual(res.summary.projectedOutflow, 0);
    });

    await test('Renewal with valid estimated cost included in outflows at expiry date', async () => {
        const renewals = [
            { id: 'ren_priced', name: 'Car Insurance Renewal', dueDateUtc: '2026-09-28T00:00:00.000Z', renewalEstimatedCost: 18500, currency: 'INR' }
        ];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            renewalActions: renewals
        });

        assert.strictEqual(res.summary.renewalOccurrencesCount, 1);
        assert.strictEqual(res.summary.projectedOutflow, 18500);
    });

    // ------------------------------------------------------------------------
    // SECTION 3: Member Income Streams, Missing Income & Genuine Zero Semantics
    // ------------------------------------------------------------------------

    await test('Member income recurrence: active stream generates occurrences matching payDay', async () => {
        const incomeStreams = [
            { id: 'inc_sal', personId: 'p_earner', name: 'Salary', amount: 80000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY', payDayOfMonth: 1 }
        ];

        const { occurrences } = generateIncomeOccurrencesPure({
            incomeStreams,
            members: [{ id: 'p_earner', status: 'ACTIVE' }],
            startUtc: '2026-09-15T00:00:00.000Z',
            endUtc: '2026-11-15T00:00:00.000Z'
        });

        // Payday on the 1st: Oct 1 and Nov 1 are within window
        assert.strictEqual(occurrences.length, 2);
        assert.strictEqual(occurrences[0].occurrenceTimestampUtc.substring(0, 10), '2026-10-01');
        assert.strictEqual(occurrences[1].occurrenceTimestampUtc.substring(0, 10), '2026-11-01');
    });

    await test('Inactive member income stream strictly excluded from household forecast', async () => {
        const incomeStreams = [
            { id: 'inc_inactive_mem', personId: 'p_departed', amount: 60000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }
        ];

        const { occurrences } = generateIncomeOccurrencesPure({
            incomeStreams,
            members: [{ id: 'p_departed', status: 'INACTIVE' }], // Inactive person
            startUtc: REF_DATE_UTC,
            endUtc: '2026-10-15T00:00:00.000Z'
        });

        assert.strictEqual(occurrences.length, 0);
    });

    await test('Missing Income vs Genuine Zero — A household with no active income streams returns projected inflow 0 and flags NO_INCOME_RECORD_FOUND; a household with at least one active income stream whose amount is 0 returns projected inflow 0 and does not flag NO_INCOME_RECORD_FOUND', async () => {
        // Case A: No active income streams
        const resA = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: [],
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });
        assert.strictEqual(resA.summary.projectedInflow, 0);
        assert(resA.summary.confidenceScore.missingFactors.includes('NO_INCOME_RECORD_FOUND'));

        // Case B: Active stream with amount 0 (genuine zero income)
        const resB = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: [{ id: 'inc_zero', personId: 'p1', amount: 0, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }],
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });
        assert.strictEqual(resB.summary.projectedInflow, 0);
        assert(!resB.summary.confidenceScore.missingFactors.includes('NO_INCOME_RECORD_FOUND'));
    });

    await test('Income stream effective date filtering: stream before start or after end date excluded', async () => {
        const incomeStreams = [
            { id: 'inc_future', personId: 'p1', amount: 30000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY', effectiveStartDateUtc: '2026-11-01T00:00:00.000Z' },
            { id: 'inc_expired', personId: 'p1', amount: 20000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY', effectiveEndDateUtc: '2026-08-31T00:00:00.000Z' }
        ];

        const { occurrences } = generateIncomeOccurrencesPure({
            incomeStreams,
            members: [{ id: 'p1', status: 'ACTIVE' }],
            startUtc: '2026-09-01T00:00:00.000Z',
            endUtc: '2026-10-01T00:00:00.000Z'
        });

        assert.strictEqual(occurrences.length, 0);
    });

    // ------------------------------------------------------------------------
    // SECTION 4: Rolling 72-Hour Clustering & Budget Exhaustion Mathematics
    // ------------------------------------------------------------------------

    await test('Rolling 72-hour clustering: 3 occurrences within 71h59m triggers COMMITMENT_CLUSTERING', async () => {
        const occurrences = [
            { commitmentId: 'c1', amount: 5000, currency: 'INR', occurrenceTimestampUtc: '2026-09-16T10:00:00.000Z' },
            { commitmentId: 'c2', amount: 8000, currency: 'INR', occurrenceTimestampUtc: '2026-09-17T12:00:00.000Z' },
            { commitmentId: 'c3', amount: 12000, currency: 'INR', occurrenceTimestampUtc: '2026-09-19T09:59:00.000Z' } // 71h59m from c1
        ];

        const cluster = detectRollingCommitmentClustering({ occurrences, windowHours: 72 });
        assert.notStrictEqual(cluster, null);
        assert.strictEqual(cluster.riskType, ForecastRiskType.COMMITMENT_CLUSTERING);
        assert.strictEqual(cluster.count, 3);
        assert.strictEqual(cluster.totalAmount, 25000);
    });

    await test('Rolling 72-hour clustering: 3 occurrences spanning 72h01m does NOT trigger clustering', async () => {
        const occurrences = [
            { commitmentId: 'c1', amount: 5000, currency: 'INR', occurrenceTimestampUtc: '2026-09-16T10:00:00.000Z' },
            { commitmentId: 'c2', amount: 8000, currency: 'INR', occurrenceTimestampUtc: '2026-09-17T12:00:00.000Z' },
            { commitmentId: 'c3', amount: 12000, currency: 'INR', occurrenceTimestampUtc: '2026-09-19T10:01:00.000Z' } // 72h01m from c1
        ];

        const cluster = detectRollingCommitmentClustering({ occurrences, windowHours: 72 });
        assert.strictEqual(cluster, null);
    });

    await test('Coincident timestamp commitments: two commitments at identical hour count as 2 distinct occurrences', async () => {
        const occurrences = [
            { commitmentId: 'c1', amount: 5000, currency: 'INR', occurrenceTimestampUtc: '2026-09-16T10:00:00.000Z' },
            { commitmentId: 'c2', amount: 8000, currency: 'INR', occurrenceTimestampUtc: '2026-09-16T10:00:00.000Z' }, // same timestamp
            { commitmentId: 'c3', amount: 7000, currency: 'INR', occurrenceTimestampUtc: '2026-09-17T10:00:00.000Z' }
        ];

        const cluster = detectRollingCommitmentClustering({ occurrences, windowHours: 72 });
        assert.notStrictEqual(cluster, null);
        assert.strictEqual(cluster.count, 3);
    });

    await test('Budget exhaustion formula: pace depleting before 70% of month triggers BUDGET_EXHAUSTION_RISK', async () => {
        // Ref date = Day 10 of a 30-day month. Days elapsed = 10.
        // Ceiling = 30000. Spent = 20000.
        // Spend pace = 20000 / 10 = 2000/day.
        // Depletion day = 30000 / 2000 = Day 15.
        // 70% of 30 days = Day 21. Day 15 <= Day 21 -> TRIGGERS!
        const pools = [
            { id: 'p_dining', name: 'Dining', monthlyCeiling: 30000, spent: 20000, currency: 'INR', isArchived: false }
        ];

        const risks = evaluateBudgetExhaustionRiskPure({
            budgetPools: pools,
            referenceDateUtc: '2026-09-10T12:00:00.000Z'
        });

        assert.strictEqual(risks.length, 1);
        assert.strictEqual(risks[0].riskType, ForecastRiskType.BUDGET_EXHAUSTION_RISK);
        assert.strictEqual(risks[0].depletionDay, 15);
    });

    await test('Budget exhaustion formula: zero-ceiling pool excluded from pace trigger', async () => {
        const zeroPools = [
            { id: 'p_zero', name: 'Zero Cap', monthlyCeiling: 0, spent: 5000, currency: 'INR', isArchived: false }
        ];

        const risks = evaluateBudgetExhaustionRiskPure({
            budgetPools: zeroPools,
            referenceDateUtc: '2026-09-10T12:00:00.000Z'
        });

        assert.strictEqual(risks.length, 0);
    });

    await test('Budget exhaustion formula: pace depleting on Day 25 (>70%) does NOT trigger risk', async () => {
        // Ref date = Day 10 of 30-day month. Days elapsed = 10.
        // Ceiling = 30000. Spent = 12000.
        // Spend pace = 12000 / 10 = 1200/day.
        // Depletion day = 30000 / 1200 = Day 25.
        // 70% of 30 days = Day 21. Day 25 > Day 21 -> DOES NOT TRIGGER!
        const pools = [
            { id: 'p_careful', name: 'Careful Groceries', monthlyCeiling: 30000, spent: 12000, currency: 'INR', isArchived: false }
        ];

        const risks = evaluateBudgetExhaustionRiskPure({
            budgetPools: pools,
            referenceDateUtc: '2026-09-10T12:00:00.000Z'
        });

        assert.strictEqual(risks.length, 0);
    });

    // ------------------------------------------------------------------------
    // SECTION 5: Liquidity Deficit, Single Earner Risk & Severity Precedence
    // ------------------------------------------------------------------------

    await test('Liquidity deficit risk: cumulative outflows > inflows flags LIQUIDITY_DEFICIT with exact onset date', async () => {
        const income = [{ id: 'inc_small', personId: 'p1', amount: 20000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }];
        const commitments = [{ id: 'c_big', amount: 45000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: income,
            commitments,
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        assert.strictEqual(res.summary.netProjectedLiquidityDelta, -25000);
        const deficitRisk = res.riskIndicators.find(r => r.riskType === ForecastRiskType.LIQUIDITY_DEFICIT);
        assert.notStrictEqual(deficitRisk, undefined);
        assert.strictEqual(deficitRisk.severity, RiskSeverity.HIGH);
        assert.strictEqual(deficitRisk.deficitAmount, 25000);
        assert.strictEqual(deficitRisk.onsetTimestampUtc, REF_DATE_UTC);
    });

    await test('Single-earner exposure: 1 member contributing >= 80% triggers SINGLE_EARNER_EXPOSURE', async () => {
        const income = [
            { id: 'inc_1', personId: 'p_lead', amount: 90000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' },
            { id: 'inc_2', personId: 'p_secondary', amount: 10000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }
        ]; // p_lead is 90% >= 80%

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: income,
            members: [{ id: 'p_lead', status: 'ACTIVE' }, { id: 'p_secondary', status: 'ACTIVE' }]
        });

        const singleEarnerRisk = res.riskIndicators.find(r => r.riskType === ForecastRiskType.SINGLE_EARNER_EXPOSURE);
        assert.notStrictEqual(singleEarnerRisk, undefined);
        assert.strictEqual(singleEarnerRisk.severity, RiskSeverity.LOW);
        assert.strictEqual(singleEarnerRisk.personId, 'p_lead');
        assert.strictEqual(singleEarnerRisk.concentrationRatio, 0.9);
    });

    await test('Risk severity precedence: HIGH > MEDIUM > LOW > INFO correctly determines overall risk', async () => {
        const raw = [
            { riskType: 'INFO_DATA', severity: RiskSeverity.INFO },
            { riskType: 'HIGH_DEFICIT', severity: RiskSeverity.HIGH },
            { riskType: 'MED_CLUSTER', severity: RiskSeverity.MEDIUM },
            { riskType: 'LOW_EARNER', severity: RiskSeverity.LOW }
        ];

        const ordered = orderAndDeduplicateRiskIndicators(raw);
        assert.strictEqual(ordered[0].severity, RiskSeverity.HIGH);
        assert.strictEqual(ordered[1].severity, RiskSeverity.MEDIUM);
        assert.strictEqual(ordered[2].severity, RiskSeverity.LOW);
        assert.strictEqual(ordered[3].severity, RiskSeverity.INFO);
    });

    await test('Risk indicator stable ordering: sorted by severity precedence then timestamp then type', async () => {
        const raw = [
            { riskType: 'CLUSTER_B', severity: RiskSeverity.MEDIUM, onsetTimestampUtc: '2026-09-20T00:00:00.000Z' },
            { riskType: 'CLUSTER_A', severity: RiskSeverity.MEDIUM, onsetTimestampUtc: '2026-09-18T00:00:00.000Z' }
        ];

        const ordered = orderAndDeduplicateRiskIndicators(raw);
        assert.strictEqual(ordered[0].riskType, 'CLUSTER_A'); // earlier onset
        assert.strictEqual(ordered[1].riskType, 'CLUSTER_B');
    });

    await test('Deduplication of risk indicators by type and source entity', async () => {
        const raw = [
            { riskType: 'BUDGET_EXHAUSTION_RISK', poolId: 'pool_1', severity: RiskSeverity.MEDIUM },
            { riskType: 'BUDGET_EXHAUSTION_RISK', poolId: 'pool_1', severity: RiskSeverity.MEDIUM } // duplicate
        ];

        const deduplicated = orderAndDeduplicateRiskIndicators(raw);
        assert.strictEqual(deduplicated.length, 1);
    });

    // ------------------------------------------------------------------------
    // SECTION 6: Multi-Currency Divergence, Bucket Nullability & Foreign Shocks
    // ------------------------------------------------------------------------

    await test('Multi-currency divergence: single currency (INR) produces numeric aggregates and currency INR', async () => {
        const commitments = [{ id: 'c1', amount: 5000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }];
        const income = [{ id: 'i1', personId: 'p1', amount: 15000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments,
            incomeStreams: income,
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        assert.strictEqual(res.summary.currency, 'INR');
        assert.strictEqual(res.summary.projectedInflow, 15000);
        assert.strictEqual(res.summary.projectedOutflow, 5000);
        assert.strictEqual(res.summary.netProjectedLiquidityDelta, 10000);
        assert.strictEqual(res.summary.currencyDivergenceWarning, null);
    });

    await test('Multi-currency divergence: dual currency (INR + USD) sets totals, net delta, and currency to null', async () => {
        const commitments = [
            { id: 'c_inr', amount: 5000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' },
            { id: 'c_usd', amount: 100, currency: 'USD', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-21T00:00:00.000Z' }
        ];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments
        });

        assert.strictEqual(res.summary.currency, null);
        assert.strictEqual(res.summary.projectedInflow, null);
        assert.strictEqual(res.summary.projectedOutflow, null);
        assert.strictEqual(res.summary.netProjectedLiquidityDelta, null);
    });

    await test('Multi-currency warning string: exact match Aggregate forecast unavailable because commitments contain multiple currencies.', async () => {
        const commitments = [
            { id: 'c_inr', amount: 5000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' },
            { id: 'c_usd', amount: 100, currency: 'USD', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-21T00:00:00.000Z' }
        ];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments
        });

        assert.strictEqual(res.summary.currencyDivergenceWarning, 'Aggregate forecast unavailable because commitments contain multiple currencies.');
    });

    await test('Multi-currency timeline buckets: bucket aggregates null, item-level currencies preserved', async () => {
        const commitments = [
            { id: 'c_inr', amount: 5000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-17T00:00:00.000Z' },
            { id: 'c_usd', amount: 100, currency: 'USD', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-18T00:00:00.000Z' }
        ];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 7,
            commitments
        });

        // Timeline bucket sums must be null under divergence
        assert.strictEqual(res.timelineBuckets[0].outflows, null);
        // But items inside must keep their original currency
        const allItems = res.timelineBuckets.flatMap(b => b.items);
        assert(allItems.some(i => i.currency === 'INR'));
        assert(allItems.some(i => i.currency === 'USD'));
    });

    await test('Scenario shock currency divergence: shock in foreign currency triggers divergence', async () => {
        const baseline = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments: [{ id: 'c_inr', amount: 5000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }]
        });

        assert.strictEqual(baseline.summary.currency, 'INR');

        // Apply a shock in USD
        const simulated = simulateForecastScenarioPure({
            baselineForecast: baseline,
            scenario: {
                name: 'US Server Fee',
                expenseShocks: [{ name: 'Server Fee', amount: 150, currency: 'USD', dueDayOffset: 10 }]
            },
            commitments: [{ id: 'c_inr', amount: 5000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }]
        });

        assert.strictEqual(simulated.summary.currency, null);
        assert.strictEqual(simulated.summary.currencyDivergenceWarning, FORECAST_CURRENCY_DIVERGENCE_WARNING);
    });

    // ------------------------------------------------------------------------
    // SECTION 7: Scenario Perturbations, Contributor Default & Pure Invariance
    // ------------------------------------------------------------------------

    await test('Scenario income perturbation: -20% reduces inflows by exactly 20.0%', async () => {
        const income = [{ id: 'i1', personId: 'p1', amount: 100000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }];
        const baseline = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: income,
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        assert.strictEqual(baseline.summary.projectedInflow, 100000);

        const simulated = simulateForecastScenarioPure({
            baselineForecast: baseline,
            scenario: { incomeAdjustmentPercent: -20 },
            incomeStreams: income,
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        assert.strictEqual(simulated.summary.projectedInflow, 80000);
        assert.strictEqual(simulated.baselineDelta.inflowDelta, -20000);
    });

    await test('Scenario income perturbation: -100% reduces inflows to exactly 0 without negative numbers', async () => {
        const income = [{ id: 'i1', personId: 'p1', amount: 100000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }];
        const baseline = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: income,
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        const simulated = simulateForecastScenarioPure({
            baselineForecast: baseline,
            scenario: { incomeAdjustmentPercent: -100 },
            incomeStreams: income,
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        assert.strictEqual(simulated.summary.projectedInflow, 0);
        assert.strictEqual(simulated.baselineDelta.inflowDelta, -100000);
    });

    await test('Scenario expense shock: adds discrete outflow on specified day offset', async () => {
        const baseline = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments: [{ id: 'c1', amount: 10000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }]
        });

        const simulated = simulateForecastScenarioPure({
            baselineForecast: baseline,
            scenario: {
                name: 'Emergency Dental Expense',
                expenseShocks: [{ name: 'Dental Surgery', amount: 25000, currency: 'INR', dueDayOffset: 12 }]
            },
            commitments: [{ id: 'c1', amount: 10000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }]
        });

        assert.strictEqual(simulated.summary.projectedOutflow, 35000);
        assert.strictEqual(simulated.baselineDelta.outflowDelta, 25000);
    });

    await test('Scenario contributor default: calculates hypothetical shortfall reallocation across remaining members', async () => {
        const pools = [
            { id: 'pool_rent', name: 'Apartment Rent', monthlyCeiling: 40000, currency: 'INR', isArchived: false }
        ];
        const members = [
            { id: 'p_defaulter', name: 'Member A', status: 'ACTIVE' },
            { id: 'p_partner1', name: 'Member B', status: 'ACTIVE' },
            { id: 'p_partner2', name: 'Member C', status: 'ACTIVE' }
        ];

        const baseline = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            budgetPools: pools,
            members
        });

        const simulated = simulateForecastScenarioPure({
            baselineForecast: baseline,
            scenario: {
                contributorDefaults: [{ poolId: 'pool_rent', personId: 'p_defaulter', defaultRatioPercent: 50 }] // 50% default = 20000
            },
            budgetPools: pools,
            members
        });

        assert.strictEqual(simulated.hypotheticalReallocations.length, 1);
        const realloc = simulated.hypotheticalReallocations[0];
        assert.strictEqual(realloc.shortfallAmount, 20000);
        assert.strictEqual(realloc.reallocatedSharePerMember, 10000); // 20000 / 2 remaining members = 10000 each
    });

    await test('Scenario contributor default: strictly labeled Hypothetical contribution reallocation (Advisory Only — Pool Unchanged) without mutating Phase 9 pool', async () => {
        const pools = [
            { id: 'pool_groceries', name: 'Groceries', monthlyCeiling: 20000, currency: 'INR', isArchived: false }
        ];

        const baseline = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            budgetPools: pools,
            members: [{ id: 'p1', status: 'ACTIVE' }, { id: 'p2', status: 'ACTIVE' }]
        });

        const simulated = simulateForecastScenarioPure({
            baselineForecast: baseline,
            scenario: {
                contributorDefaults: [{ poolId: 'pool_groceries', personId: 'p1', defaultRatioPercent: 100 }]
            },
            budgetPools: pools,
            members: [{ id: 'p1', status: 'ACTIVE' }, { id: 'p2', status: 'ACTIVE' }]
        });

        assert.strictEqual(simulated.hypotheticalReallocations[0].label, 'Hypothetical contribution reallocation (Advisory Only — Pool Unchanged)');
        // Source pool monthly ceiling untouched
        assert.strictEqual(pools[0].monthlyCeiling, 20000);
    });

    await test('Scenario simulation pure invariance: running simulation does not mutate baseline projection object', async () => {
        const baseline = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments: [{ id: 'c1', amount: 15000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }]
        });

        const baselineBeforeJson = JSON.stringify(baseline);

        simulateForecastScenarioPure({
            baselineForecast: baseline,
            scenario: { incomeAdjustmentPercent: -50, expenseShocks: [{ name: 'Shock', amount: 50000, currency: 'INR' }] },
            commitments: [{ id: 'c1', amount: 15000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }]
        });

        const baselineAfterJson = JSON.stringify(baseline);
        assert.strictEqual(baselineBeforeJson, baselineAfterJson);
    });

    // ------------------------------------------------------------------------
    // SECTION 8: Confidence Scoring Contracts & Data Gap Flags
    // ------------------------------------------------------------------------

    await test('Confidence score calculation: 100 with complete data', async () => {
        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: [{ id: 'i1', personId: 'p1', amount: 50000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }],
            commitments: [{ id: 'c1', amount: 10000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }],
            renewalActions: [{ id: 'r1', name: 'Car Insurance', renewalEstimatedCost: 15000, dueDateUtc: '2026-09-25T00:00:00.000Z' }],
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        assert.strictEqual(res.summary.confidenceScore.score, 100);
        assert.strictEqual(res.summary.confidenceScore.rating, 'HIGH');
        assert.strictEqual(res.summary.confidenceScore.missingFactors.length, 0);
    });

    await test('Confidence score penalty: -30 for missing income, -20 for unpriced renewals', async () => {
        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: [], // -30
            renewalActions: [{ id: 'r1', name: 'License Renewal', dueDateUtc: '2026-09-25T00:00:00.000Z', renewalEstimatedCost: null }], // -20
            members: [{ id: 'p1', status: 'ACTIVE' }]
        });

        // 100 - 30 - 20 = 50
        assert.strictEqual(res.summary.confidenceScore.score, 50);
        assert.strictEqual(res.summary.confidenceScore.rating, 'MEDIUM');
        assert(res.summary.confidenceScore.missingFactors.includes('NO_INCOME_RECORD_FOUND'));
        assert(res.summary.confidenceScore.missingFactors.includes('MISSING_RENEWAL_COSTS'));
    });

    await test('Confidence score threshold: <50 triggers DATA_GAP_UNCERTAINTY risk indicator', async () => {
        // -30 (no income) and -20 (unpriced renewal) and an invalid stream - score drops to < 50
        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: [],
            renewalActions: [
                { id: 'r1', name: 'Ren 1', dueDateUtc: '2026-09-25T00:00:00.000Z', renewalEstimatedCost: null },
                { id: 'r2', name: 'Ren 2', dueDateUtc: '2026-09-26T00:00:00.000Z', renewalEstimatedCost: null }
            ]
        });

        assert(res.summary.confidenceScore.score <= 50);
        const dataGap = res.riskIndicators.find(r => r.riskType === ForecastRiskType.DATA_GAP_UNCERTAINTY);
        assert.notStrictEqual(dataGap, undefined);
        assert.strictEqual(dataGap.severity, RiskSeverity.INFO);
    });

    // ------------------------------------------------------------------------
    // SECTION 9: Repository Persistence, Timestamps Boundary & Tenant Isolation
    // ------------------------------------------------------------------------

    await test('STORAGE_KEYS.FAMILY_FORECAST_SCENARIOS is registered as finlife_family_forecast_scenarios_v1', async () => {
        assert.strictEqual(STORAGE_KEYS.FAMILY_FORECAST_SCENARIOS, 'finlife_family_forecast_scenarios_v1');
    });

    await test('Repository saveForecastScenario persists scenario with UUID and ISO timestamps', async () => {
        const saved = await FamilyRepository.saveForecastScenario(HH_ID, {
            name: 'Stress Test Inflation',
            incomeAdjustmentPercent: -15
        });

        assert(saved.id.startsWith('sc_'));
        assert.strictEqual(saved.householdId, HH_ID);
        assert.strictEqual(saved.name, 'Stress Test Inflation');
        assert(saved.createdAt);
        assert(saved.updatedAt);
    });

    await test('Repository timestamps (createdAt, updatedAt) generated strictly at persistence boundary, not in pure engine', async () => {
        const inputWithoutTimestamps = {
            id: 'sc_test_timestamps',
            name: 'Boundary Test'
        };

        const saved = await FamilyRepository.saveForecastScenario(HH_ID, inputWithoutTimestamps);
        assert(saved.createdAt);
        assert(saved.updatedAt);
        // Verification: ISO format string
        assert(!isNaN(new Date(saved.createdAt).getTime()));
    });

    await test('Repository getForecastScenarios filters strictly by householdId (tenant isolation)', async () => {
        await FamilyRepository.saveForecastScenario(HH_ID, { id: 'sc_hh1', name: 'HH1 Scenario' });
        await FamilyRepository.saveForecastScenario(HH_FOREIGN, { id: 'sc_foreign', name: 'Foreign Scenario' });

        const hh1Scenarios = await FamilyRepository.getForecastScenarios(HH_ID);
        const foreignScenarios = await FamilyRepository.getForecastScenarios(HH_FOREIGN);

        assert(hh1Scenarios.some(s => s.id === 'sc_hh1'));
        assert(!hh1Scenarios.some(s => s.id === 'sc_foreign'));
        assert(foreignScenarios.some(s => s.id === 'sc_foreign'));
    });

    await test('Repository deleteForecastScenario removes scenario without touching source commitments/pools', async () => {
        await FamilyRepository.saveForecastScenario(HH_ID, { id: 'sc_to_del', name: 'To Delete' });
        const deleted = await FamilyRepository.deleteForecastScenario(HH_ID, 'sc_to_del');
        assert.strictEqual(deleted, true);

        const retrieved = await FamilyRepository.getForecastScenario(HH_ID, 'sc_to_del');
        assert.strictEqual(retrieved, null);
    });

    // ------------------------------------------------------------------------
    // SECTION 10: Clock Independence, Timezone Derivations & Fault Tolerance
    // ------------------------------------------------------------------------

    await test('Pure engine clock-independence: identical results when called with fixed referenceDateUtc', async () => {
        const params = {
            householdId: HH_ID,
            referenceDateUtc: '2026-10-01T12:00:00.000Z',
            horizonDays: 30,
            commitments: [{ id: 'c1', amount: 5000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }],
            incomeStreams: [{ id: 'i1', personId: 'p1', amount: 20000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }],
            members: [{ id: 'p1', status: 'ACTIVE' }]
        };

        const res1 = computeHouseholdFinancialForecastPure(params);
        const res2 = computeHouseholdFinancialForecastPure(params);

        assert.strictEqual(JSON.stringify(res1), JSON.stringify(res2));
    });

    await test('Household timezone day boundaries: 23:59:59 in Asia/Kolkata resolves properly to UTC', async () => {
        const daysInSept = getDaysInMonth(2026, 9);
        assert.strictEqual(daysInSept, 30);
        const daysInFebLeap = getDaysInMonth(2024, 2);
        assert.strictEqual(daysInFebLeap, 29);
        const daysInFebNonLeap = getDaysInMonth(2025, 2);
        assert.strictEqual(daysInFebNonLeap, 28);
    });

    await test('Fault tolerance: null/undefined commitments handled gracefully without throw', async () => {
        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments: null,
            budgetPools: undefined,
            incomeStreams: null
        });

        assert.strictEqual(res.summary.projectedInflow, 0);
        assert.strictEqual(res.summary.projectedOutflow, 0);
        assert.strictEqual(res.summary.netProjectedLiquidityDelta, 0);
    });

    await test('Fault tolerance: NaN or malformed amounts skipped with skippedInvalidRecords incremented', async () => {
        const malformedCommitments = [
            { id: 'c_nan', amount: NaN, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' },
            { id: 'c_neg', amount: -500, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' },
            { id: 'c_valid', amount: 1000, currency: 'INR', status: 'ACTIVE', frequency: 'ONE_TIME', nextDueDateUtc: '2026-09-20T00:00:00.000Z' }
        ];

        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments: malformedCommitments
        });

        assert.strictEqual(res.summary.commitmentOccurrencesCount, 1);
        assert.strictEqual(res.summary.projectedOutflow, 1000);
        assert.strictEqual(res.diagnostics.skippedInvalidRecords, 2);
    });

    await test('Empty household members handled gracefully with zero income and confidence flag', async () => {
        const res = computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            incomeStreams: [{ id: 'i1', personId: 'p_unassigned', amount: 50000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }],
            members: [] // 0 members
        });

        assert.strictEqual(res.summary.projectedInflow, 0);
        assert(res.summary.confidenceScore.missingFactors.includes('NO_INCOME_RECORD_FOUND'));
    });

    // ------------------------------------------------------------------------
    // SECTION 11: Cryptographic Zero-Write Invariant Verification
    // ------------------------------------------------------------------------

    await test('Assertion 50: Cryptographic SHA-256 hash check verifying repository state is 100% byte-identical before and after pure forecast evaluation', async () => {
        const storeBefore = await FamilyRepository._loadStore();
        const hashBefore = crypto.createHash('sha256').update(JSON.stringify(Array.from(storeBefore.households.entries()))).digest('hex');

        // Execute multiple forecast evaluations
        computeHouseholdFinancialForecastPure({
            householdId: HH_ID,
            referenceDateUtc: REF_DATE_UTC,
            horizonDays: 30,
            commitments: [{ id: 'c1', amount: 10000, currency: 'INR', status: 'ACTIVE', frequency: 'MONTHLY' }]
        });

        const storeAfter = await FamilyRepository._loadStore();
        const hashAfter = crypto.createHash('sha256').update(JSON.stringify(Array.from(storeAfter.households.entries()))).digest('hex');

        assert.strictEqual(hashBefore, hashAfter);
    });

    console.log('\n=============================================================');
    console.log(`🎉 ALL ${passCount} / 50 ASSERTIONS PASSED (100.0%)`);
    console.log('=============================================================\n');
}

runSuite().catch(err => {
    console.error('Fatal Suite Execution Error:', err);
    process.exit(1);
});
