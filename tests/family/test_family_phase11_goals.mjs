/**
 * tests/family/test_family_phase11_goals.mjs
 * 
 * Standalone Verification Suite for Phase 11:
 * Collective Family Goals, Milestone Governance & Capital Allocation Planning.
 * 
 * Exactly 50 contractual assertions defined in Specification v1.0-FINAL-R2:
 * 01: test_goal_target_amount_positive
 * 02: test_goal_target_date_iso_format
 * 03: test_goal_default_lifecycle_status_is_active
 * 04: test_goal_household_isolation
 * 05: test_manual_accumulation_summation_regardless_of_verification
 * 06: test_asset_snapshot_exact_90d_valid
 * 07: test_asset_snapshot_90d_plus_1ms_stale
 * 08: test_verified_vs_unverified_capital
 * 09: test_required_pace_exact_month_math
 * 10: test_required_pace_completed_goal
 * 11: test_required_pace_past_due_goal
 * 12: test_remaining_target_amount_clamped
 * 13: test_fixed_pledge_pace_aggregation
 * 14: test_paused_pledge_exclusion
 * 15: test_pledge_effective_date_window
 * 16: test_pledge_currency_mismatch_flag
 * 17: test_percentage_pledge_share_of_pace
 * 18: test_additive_percentage_pledges
 * 19: test_percentage_pledge_zero_when_no_req
 * 20: test_individual_percentage_pledge_bound
 * 21: test_one_time_pledge_zero_monthly_pace
 * 22: test_one_time_pledge_no_capital_mutation
 * 23: test_one_time_pledge_tracking_output
 * 24: test_one_time_pledge_past_date_flag
 * 25: test_phase10_positive_surplus_allocation
 * 26: test_phase10_negative_surplus_clamped
 * 27: test_phase10_surplus_percentage_clamped
 * 28: test_phase10_zero_surplus_evaluation
 * 29: test_precedence_completed_over_past_due
 * 30: test_precedence_past_due_over_no_pace
 * 31: test_precedence_no_pace_data_zero_pace
 * 32: test_health_ahead_boundary_and_date
 * 33: test_health_on_track_boundaries
 * 34: test_health_behind_continuous_boundary
 * 35: test_health_at_risk_boundary
 * 36: test_projected_eta_exact_date
 * 37: test_projected_eta_unfunded_null
 * 38: test_projected_eta_estimate_label
 * 39: test_projected_eta_completed_goal
 * 40: test_lifecycle_vs_evaluator_separation
 * 41: test_milestone_target_monotonicity_non_decreasing
 * 42: test_individual_milestone_reached_using_effective_accumulated_amount
 * 43: test_checkpoint_milestone_no_pacing
 * 44: test_milestone_deterministic_tie_break
 * 45: test_multi_currency_overview_partitioning
 * 46: test_mixed_currency_total_suppressed
 * 47: test_no_cross_goal_combined_eta
 * 48: test_scenario_negative_lump_sum_rejected
 * 49: test_scenario_reduction_requires_type
 * 50: test_scenario_all_six_eta_permutations
 */

import assert from 'assert';

import {
    FamilyGoalCategory,
    FamilyGoalPriority,
    FamilyGoalStatus,
    MilestoneStatus,
    MemberPledgeFrequency,
    GoalPaceHealth,
    GoalScenarioType,
    GoalScenarioClassification,
    DAYS_IN_AVERAGE_MONTH,
    STALE_ASSET_SNAPSHOT_MS,
    validateFamilyGoal,
    validateMilestonesMonotonicity,
    sortMilestonesDeterministically,
    evaluateFamilyGoalPure,
    simulateGoalScenarioPure,
    sortGoalsDeterministically,
    buildHouseholdGoalsOverviewPure
} from '../../services/family/familyContracts.js';

import {
    FamilyRepository,
    FamilyGoalService
} from '../../services/family/index.js';

console.log('=============================================================');
console.log('🚀 RUNNING PHASE 11: FAMILY GOALS & MILESTONES SUITE');
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

const HH_ID = 'hh_goal_primary';
const HH_FOREIGN = 'hh_goal_foreign';
const REF_DATE_UTC = '2026-09-15T00:00:00.000Z';

async function runSuite() {
    FamilyRepository.setTestMode(true);

    // -------------------------------------------------------------
    // CATEGORY 1: GOAL INITIALIZATION & INVARIANTS (01 - 04)
    // -------------------------------------------------------------

    await test('test_goal_target_amount_positive', async () => {
        assert.throws(() => {
            validateFamilyGoal({
                householdId: HH_ID,
                title: 'Invalid Target',
                targetAmount: -500,
                currency: 'INR',
                targetDateUtc: '2027-09-15T00:00:00.000Z'
            });
        }, /INVALID_GOAL_TARGET_AMOUNT/);

        assert.throws(() => {
            validateFamilyGoal({
                householdId: HH_ID,
                title: 'Zero Target',
                targetAmount: 0,
                currency: 'INR',
                targetDateUtc: '2027-09-15T00:00:00.000Z'
            });
        }, /INVALID_GOAL_TARGET_AMOUNT/);
    });

    await test('test_goal_target_date_iso_format', async () => {
        assert.throws(() => {
            validateFamilyGoal({
                householdId: HH_ID,
                title: 'Invalid Date',
                targetAmount: 100000,
                currency: 'INR',
                targetDateUtc: 'invalid-date'
            });
        }, /INVALID_TARGET_DATE_FORMAT/);
    });

    await test('test_goal_default_lifecycle_status_is_active', async () => {
        const saved = await FamilyRepository.saveGoal(HH_ID, {
            title: 'College Fund',
            targetAmount: 500000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z'
        });
        assert.strictEqual(saved.status, FamilyGoalStatus.ACTIVE);
        assert.strictEqual(saved.householdId, HH_ID);
    });

    await test('test_goal_household_isolation', async () => {
        await FamilyRepository.saveGoal(HH_FOREIGN, {
            title: 'Foreign Household Goal',
            targetAmount: 200000,
            currency: 'EUR',
            targetDateUtc: '2027-01-01T00:00:00.000Z'
        });

        const primaryGoals = await FamilyRepository.getGoals(HH_ID);
        const foreignGoals = await FamilyRepository.getGoals(HH_FOREIGN);

        assert(primaryGoals.every(g => g.householdId === HH_ID));
        assert(foreignGoals.every(g => g.householdId === HH_FOREIGN));
        assert.strictEqual(foreignGoals.length, 1);
    });

    // -------------------------------------------------------------
    // CATEGORY 2: ACCUMULATION & EVIDENCE LINKS (05 - 08)
    // -------------------------------------------------------------

    await test('test_manual_accumulation_summation_regardless_of_verification', async () => {
        const goal = {
            id: 'goal_acc_1',
            householdId: HH_ID,
            title: 'Emergency Reserve',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            accumulations: [
                { id: 'a1', amount: 1000, currency: 'INR', recordedAtUtc: REF_DATE_UTC },
                { id: 'a2', amount: 2500, currency: 'INR', recordedAtUtc: REF_DATE_UTC },
                { id: 'a3', amount: 500, currency: 'INR', recordedAtUtc: REF_DATE_UTC }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.totalManualAccumulation, 4000);
        assert.strictEqual(res.effectiveAccumulatedAmount, 4000);
        assert.strictEqual(res.verifiedAccumulatedAmount, 0);
        assert.strictEqual(res.verifiedAccumulatedCapital, 0);
    });

    await test('test_asset_snapshot_exact_90d_valid', async () => {
        const exact90dMs = 90 * 86400000;
        const asOfExact90d = new Date(new Date(REF_DATE_UTC).getTime() - exact90dMs).toISOString();

        const goal = {
            id: 'goal_asset_exact',
            householdId: HH_ID,
            title: 'Asset Goal Valid',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            linkedAssets: [
                {
                    id: 'la1',
                    assetName: 'Mutual Fund A',
                    snapshotAmount: 15000,
                    currency: 'INR',
                    asOfUtc: asOfExact90d
                }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.totalLinkedAssets, 15000);
        assert.strictEqual(res.effectiveAccumulatedAmount, 15000);
        assert.strictEqual(res.diagnostics.length, 0);
    });

    await test('test_asset_snapshot_90d_plus_1ms_stale', async () => {
        const staleMs = (90 * 86400000) + 1;
        const asOfStale = new Date(new Date(REF_DATE_UTC).getTime() - staleMs).toISOString();

        const goal = {
            id: 'goal_asset_stale',
            householdId: HH_ID,
            title: 'Asset Goal Stale',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            linkedAssets: [
                {
                    id: 'la2',
                    assetName: 'Old FD',
                    snapshotAmount: 20000,
                    currency: 'INR',
                    asOfUtc: asOfStale
                }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.totalLinkedAssets, 0);
        assert.strictEqual(res.effectiveAccumulatedAmount, 0);
        assert(res.diagnostics.some(d => d.includes('ASSET_SNAPSHOT_STALE')));
    });

    await test('test_verified_vs_unverified_capital', async () => {
        const goal = {
            id: 'goal_verified_audit',
            householdId: HH_ID,
            title: 'Verified Capital Check',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            accumulations: [
                {
                    id: 'acc_v',
                    amount: 3000,
                    currency: 'INR',
                    recordedAtUtc: REF_DATE_UTC,
                    verifiedAtUtc: REF_DATE_UTC,
                    evidenceDocId: 'doc_123'
                },
                {
                    id: 'acc_u',
                    amount: 2000,
                    currency: 'INR',
                    recordedAtUtc: REF_DATE_UTC,
                    verifiedAtUtc: null
                }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.effectiveAccumulatedAmount, 5000);
        assert.strictEqual(res.verifiedAccumulatedAmount, 3000);
    });

    // -------------------------------------------------------------
    // CATEGORY 3: REQUIRED MONTHLY PACE MATH (09 - 12)
    // -------------------------------------------------------------

    await test('test_required_pace_exact_month_math', async () => {
        // Exactly 60.875 days remaining = 2 months of 30.4375 days
        const targetMs = new Date(REF_DATE_UTC).getTime() + (60.875 * 86400000);
        const targetDateUtc = new Date(targetMs).toISOString();

        const goal = {
            id: 'goal_pace_calc',
            householdId: HH_ID,
            title: 'Pace Calculation Goal',
            targetAmount: 30437.50,
            currency: 'INR',
            targetDateUtc,
            status: 'ACTIVE'
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.requiredMonthlyPace, 15218.75);
    });

    await test('test_required_pace_completed_goal', async () => {
        const goal = {
            id: 'goal_completed_pace',
            householdId: HH_ID,
            title: 'Already Completed',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            accumulations: [
                { id: 'c1', amount: 50000, currency: 'INR', recordedAtUtc: REF_DATE_UTC }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.remainingTargetAmount, 0);
        assert.strictEqual(res.requiredMonthlyPace, 0);
    });

    await test('test_required_pace_past_due_goal', async () => {
        const pastDateUtc = new Date(new Date(REF_DATE_UTC).getTime() - (10 * 86400000)).toISOString();
        const goal = {
            id: 'goal_past_due_req',
            householdId: HH_ID,
            title: 'Past Due Goal',
            targetAmount: 25000,
            currency: 'INR',
            targetDateUtc: pastDateUtc,
            status: 'ACTIVE',
            accumulations: [
                { id: 'p1', amount: 5000, currency: 'INR', recordedAtUtc: pastDateUtc }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.remainingTargetAmount, 20000);
        assert.strictEqual(res.requiredMonthlyPace, 20000);
    });

    await test('test_remaining_target_amount_clamped', async () => {
        const goal = {
            id: 'goal_overfunded',
            householdId: HH_ID,
            title: 'Overfunded Goal',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            accumulations: [
                { id: 'o1', amount: 12000, currency: 'INR', recordedAtUtc: REF_DATE_UTC }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.remainingTargetAmount, 0);
        assert.strictEqual(res.progressPercentage, 100);
    });

    // -------------------------------------------------------------
    // CATEGORY 4: EFFECTIVE PACE: FIXED PLEDGES (13 - 16)
    // -------------------------------------------------------------

    await test('test_fixed_pledge_pace_aggregation', async () => {
        const goal = {
            id: 'goal_fixed_pledges',
            householdId: HH_ID,
            title: 'Shared Vehicle Purchase',
            targetAmount: 100000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                { id: 'pl1', personId: 'p1', frequency: 'MONTHLY', amount: 500, currency: 'INR', status: 'ACTIVE' },
                { id: 'pl2', personId: 'p2', frequency: 'MONTHLY', amount: 1200, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.fixedPledgePace, 1700);
        assert.strictEqual(res.effectiveMonthlyPace, 1700);
    });

    await test('test_paused_pledge_exclusion', async () => {
        const goal = {
            id: 'goal_paused_pledge',
            householdId: HH_ID,
            title: 'Paused Pledge Filter',
            targetAmount: 100000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                { id: 'pl_act', personId: 'p1', frequency: 'MONTHLY', amount: 1000, currency: 'INR', status: 'ACTIVE' },
                { id: 'pl_pau', personId: 'p2', frequency: 'MONTHLY', amount: 500, currency: 'INR', status: 'PAUSED' },
                { id: 'pl_can', personId: 'p3', frequency: 'MONTHLY', amount: 300, currency: 'INR', status: 'CANCELLED' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.fixedPledgePace, 1000);
        assert.strictEqual(res.effectiveMonthlyPace, 1000);
    });

    await test('test_pledge_effective_date_window', async () => {
        const futureDateUtc = new Date(new Date(REF_DATE_UTC).getTime() + (30 * 86400000)).toISOString();
        const goal = {
            id: 'goal_future_pledge',
            householdId: HH_ID,
            title: 'Future Starting Pledge',
            targetAmount: 100000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                {
                    id: 'pl_fut',
                    personId: 'p1',
                    frequency: 'MONTHLY',
                    amount: 2500,
                    currency: 'INR',
                    effectiveFromUtc: futureDateUtc,
                    status: 'ACTIVE'
                }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.fixedPledgePace, 0);
        assert.strictEqual(res.effectiveMonthlyPace, 0);
    });

    await test('test_pledge_currency_mismatch_flag', async () => {
        const goal = {
            id: 'goal_curr_mismatch',
            householdId: HH_ID,
            title: 'USD Goal with EUR Pledge',
            targetAmount: 10000,
            currency: 'USD',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                { id: 'pl_eur', personId: 'p1', frequency: 'MONTHLY', amount: 500, currency: 'EUR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.fixedPledgePace, 0);
        assert(res.diagnostics.some(d => d.includes('CURRENCY_DIVERGENCE_IN_PLEDGES')));
    });

    // -------------------------------------------------------------
    // CATEGORY 5: EFFECTIVE PACE: PERCENTAGE SHARES (17 - 20)
    // -------------------------------------------------------------

    await test('test_percentage_pledge_share_of_pace', async () => {
        const targetMs = new Date(REF_DATE_UTC).getTime() + (10 * DAYS_IN_AVERAGE_MONTH * 86400000);
        const goal = {
            id: 'goal_pct_pledge',
            householdId: HH_ID,
            title: 'Percentage Pledge Share',
            targetAmount: 20000,
            currency: 'INR',
            targetDateUtc: new Date(targetMs).toISOString(),
            status: 'ACTIVE',
            pledges: [
                { id: 'pl_pct', personId: 'p1', frequency: 'PERCENTAGE_SHARE', amount: 25, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.requiredMonthlyPace, 2000);
        assert.strictEqual(res.percentagePledgePace, 500);
        assert.strictEqual(res.effectiveMonthlyPace, 500);
    });

    await test('test_additive_percentage_pledges', async () => {
        const targetMs = new Date(REF_DATE_UTC).getTime() + (10 * DAYS_IN_AVERAGE_MONTH * 86400000);
        const goal = {
            id: 'goal_additive_pct',
            householdId: HH_ID,
            title: 'Additive Percentage Pledges',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: new Date(targetMs).toISOString(),
            status: 'ACTIVE',
            pledges: [
                { id: 'pl_a', personId: 'p1', frequency: 'PERCENTAGE_SHARE', amount: 60, currency: 'INR', status: 'ACTIVE' },
                { id: 'pl_b', personId: 'p2', frequency: 'PERCENTAGE_SHARE', amount: 60, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.requiredMonthlyPace, 1000);
        assert.strictEqual(res.percentagePledgePace, 1200);
        assert.strictEqual(res.effectiveMonthlyPace, 1200);
    });

    await test('test_percentage_pledge_zero_when_no_req', async () => {
        const goal = {
            id: 'goal_pct_no_req',
            householdId: HH_ID,
            title: 'Percentage With Zero Requirement',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            accumulations: [
                { id: 'acc_full', amount: 10000, currency: 'INR', recordedAtUtc: REF_DATE_UTC }
            ],
            pledges: [
                { id: 'pl_50', personId: 'p1', frequency: 'PERCENTAGE_SHARE', amount: 50, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.requiredMonthlyPace, 0);
        assert.strictEqual(res.percentagePledgePace, 0);
    });

    await test('test_individual_percentage_pledge_bound', async () => {
        const goal = {
            id: 'goal_invalid_pct',
            householdId: HH_ID,
            title: 'Invalid Single Percentage',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                { id: 'pl_bad', personId: 'p1', frequency: 'PERCENTAGE_SHARE', amount: 150, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        assert.throws(() => {
            evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        }, /INVALID_PLEDGE_PERCENTAGE/);
    });

    // -------------------------------------------------------------
    // CATEGORY 6: ONE-TIME PLEDGES & INTENTIONS (21 - 24)
    // -------------------------------------------------------------

    await test('test_one_time_pledge_zero_monthly_pace', async () => {
        const goal = {
            id: 'goal_one_time_p',
            householdId: HH_ID,
            title: 'One-Time Pledge Pacing',
            targetAmount: 20000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                { id: 'ot1', personId: 'p1', frequency: 'ONE_TIME_TARGET', amount: 5000, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.fixedPledgePace, 0);
        assert.strictEqual(res.effectiveMonthlyPace, 0);
    });

    await test('test_one_time_pledge_no_capital_mutation', async () => {
        const goal = {
            id: 'goal_one_time_cap',
            householdId: HH_ID,
            title: 'One-Time Pledge Capital Check',
            targetAmount: 20000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                { id: 'ot2', personId: 'p1', frequency: 'ONE_TIME_TARGET', amount: 8000, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.effectiveAccumulatedAmount, 0);
        assert.strictEqual(res.remainingTargetAmount, 20000);
    });

    await test('test_one_time_pledge_tracking_output', async () => {
        const goal = {
            id: 'goal_one_time_track',
            householdId: HH_ID,
            title: 'Tracking Output Goal',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                { id: 'ot3', personId: 'p1', frequency: 'ONE_TIME_TARGET', amount: 10000, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.oneTimePledgesTotal, 10000);
    });

    await test('test_one_time_pledge_past_date_flag', async () => {
        const pastDate = new Date(new Date(REF_DATE_UTC).getTime() - (5 * 86400000)).toISOString();
        const goal = {
            id: 'goal_one_time_exp',
            householdId: HH_ID,
            title: 'Expired One-Time Pledge',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [
                {
                    id: 'ot4',
                    personId: 'p1',
                    frequency: 'ONE_TIME_TARGET',
                    amount: 5000,
                    currency: 'INR',
                    targetDateUtc: pastDate,
                    status: 'ACTIVE'
                }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert(res.diagnostics.some(d => d.includes('ONE_TIME_PLEDGE_EXPIRED')));
    });

    // -------------------------------------------------------------
    // CATEGORY 7: PHASE 10 SURPLUS ALLOCATION (25 - 28)
    // -------------------------------------------------------------

    await test('test_phase10_positive_surplus_allocation', async () => {
        const goal = {
            id: 'goal_surplus_pos',
            householdId: HH_ID,
            title: 'Surplus Integration Goal',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            phase10SurplusAllocationPercent: 40
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC, {
            phase10ProjectedMonthlySurplus: 1000
        });
        assert.strictEqual(res.surplusPace, 400);
        assert.strictEqual(res.effectiveMonthlyPace, 400);
    });

    await test('test_phase10_negative_surplus_clamped', async () => {
        const goal = {
            id: 'goal_surplus_neg',
            householdId: HH_ID,
            title: 'Negative Liquidity Delta Goal',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            phase10SurplusAllocationPercent: 50
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC, {
            phase10ProjectedMonthlySurplus: -1500
        });
        assert.strictEqual(res.surplusPace, 0);
    });

    await test('test_phase10_surplus_percentage_clamped', async () => {
        const goal = {
            id: 'goal_surplus_clamp_pct',
            householdId: HH_ID,
            title: 'Over 100 Percent Allocation',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            phase10SurplusAllocationPercent: 150
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC, {
            phase10ProjectedMonthlySurplus: 1000
        });
        assert.strictEqual(res.surplusPace, 1000);
    });

    await test('test_phase10_zero_surplus_evaluation', async () => {
        const goal = {
            id: 'goal_surplus_null',
            householdId: HH_ID,
            title: 'Null Surplus Handled Cleanly',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2027-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            phase10SurplusAllocationPercent: 30
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC, {
            phase10ProjectedMonthlySurplus: null
        });
        assert.strictEqual(res.surplusPace, 0);
        assert.strictEqual(res.diagnostics.length, 0);
    });

    // -------------------------------------------------------------
    // CATEGORY 8: PACE HEALTH PRECEDENCE & CASCADE (29 - 31)
    // -------------------------------------------------------------

    await test('test_precedence_completed_over_past_due', async () => {
        const pastDate = new Date(new Date(REF_DATE_UTC).getTime() - (20 * 86400000)).toISOString();
        const goal = {
            id: 'goal_prec_comp',
            householdId: HH_ID,
            title: 'Completed Over Past Due',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: pastDate,
            status: 'ACTIVE',
            accumulations: [
                { id: 'ac1', amount: 10000, currency: 'INR', recordedAtUtc: pastDate }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.paceHealth, GoalPaceHealth.COMPLETED);
    });

    await test('test_precedence_past_due_over_no_pace', async () => {
        const pastDate = new Date(new Date(REF_DATE_UTC).getTime() - (10 * 86400000)).toISOString();
        const goal = {
            id: 'goal_prec_pd',
            householdId: HH_ID,
            title: 'Past Due Over No Pace',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: pastDate,
            status: 'ACTIVE'
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.paceHealth, GoalPaceHealth.PAST_DUE);
    });

    await test('test_precedence_no_pace_data_zero_pace', async () => {
        const futureDate = new Date(new Date(REF_DATE_UTC).getTime() + (90 * 86400000)).toISOString();
        const goal = {
            id: 'goal_prec_np',
            householdId: HH_ID,
            title: 'No Pace Data Flag',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: futureDate,
            status: 'ACTIVE'
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.paceHealth, GoalPaceHealth.NO_PACE_DATA);
    });

    // -------------------------------------------------------------
    // CATEGORY 9: CONTINUOUS BOUNDARIES & CLASSIFICATION (32 - 35)
    // -------------------------------------------------------------

    await test('test_health_ahead_boundary_and_date', async () => {
        const targetMs = new Date(REF_DATE_UTC).getTime() + (10 * DAYS_IN_AVERAGE_MONTH * 86400000);
        const goal = {
            id: 'goal_ahead',
            householdId: HH_ID,
            title: 'Ahead Goal',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: new Date(targetMs).toISOString(),
            status: 'ACTIVE',
            pledges: [
                { id: 'pl_ah', personId: 'p1', frequency: 'MONTHLY', amount: 1150, currency: 'INR', status: 'ACTIVE' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.requiredMonthlyPace, 1000);
        assert.strictEqual(res.paceRatio, 1.15);
        assert.strictEqual(res.paceHealth, GoalPaceHealth.AHEAD);
    });

    await test('test_health_on_track_boundaries', async () => {
        const targetMs = new Date(REF_DATE_UTC).getTime() + (10 * DAYS_IN_AVERAGE_MONTH * 86400000);
        const goalA = {
            id: 'goal_ot_lower',
            householdId: HH_ID,
            title: 'On Track Lower Boundary',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: new Date(targetMs).toISOString(),
            status: 'ACTIVE',
            pledges: [{ id: 'p_ot1', personId: 'p1', frequency: 'MONTHLY', amount: 950, currency: 'INR', status: 'ACTIVE' }]
        };
        const resA = evaluateFamilyGoalPure(goalA, REF_DATE_UTC);
        assert.strictEqual(resA.paceRatio, 0.95);
        assert.strictEqual(resA.paceHealth, GoalPaceHealth.ON_TRACK);

        const targetMs2Mo = new Date(REF_DATE_UTC).getTime() + (2 * DAYS_IN_AVERAGE_MONTH * 86400000);
        const goalB = {
            id: 'goal_ot_upper',
            householdId: HH_ID,
            title: 'On Track Upper Boundary',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: new Date(targetMs2Mo).toISOString(),
            status: 'ACTIVE',
            pledges: [{ id: 'p_ot2', personId: 'p1', frequency: 'MONTHLY', amount: 5749.5, currency: 'INR', status: 'ACTIVE' }]
        };
        const resB = evaluateFamilyGoalPure(goalB, REF_DATE_UTC);
        assert.strictEqual(resB.paceRatio, 1.1499);
        assert.strictEqual(resB.paceHealth, GoalPaceHealth.ON_TRACK);
    });

    await test('test_health_behind_continuous_boundary', async () => {
        const targetMs = new Date(REF_DATE_UTC).getTime() + (10 * DAYS_IN_AVERAGE_MONTH * 86400000);
        const goalA = {
            id: 'goal_behind_upper',
            householdId: HH_ID,
            title: 'Behind Upper Continuous Boundary',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: new Date(targetMs).toISOString(),
            status: 'ACTIVE',
            pledges: [{ id: 'p_bh1', personId: 'p1', frequency: 'MONTHLY', amount: 949.999, currency: 'INR', status: 'ACTIVE' }]
        };
        const resA = evaluateFamilyGoalPure(goalA, REF_DATE_UTC);
        assert.strictEqual(resA.paceHealth, GoalPaceHealth.BEHIND);

        const goalB = {
            id: 'goal_behind_lower',
            householdId: HH_ID,
            title: 'Behind Lower Boundary',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: new Date(targetMs).toISOString(),
            status: 'ACTIVE',
            pledges: [{ id: 'p_bh2', personId: 'p1', frequency: 'MONTHLY', amount: 600, currency: 'INR', status: 'ACTIVE' }]
        };
        const resB = evaluateFamilyGoalPure(goalB, REF_DATE_UTC);
        assert.strictEqual(resB.paceRatio, 0.60);
        assert.strictEqual(resB.paceHealth, GoalPaceHealth.BEHIND);
    });

    await test('test_health_at_risk_boundary', async () => {
        const targetMs = new Date(REF_DATE_UTC).getTime() + (10 * DAYS_IN_AVERAGE_MONTH * 86400000);
        const goal = {
            id: 'goal_at_risk_bound',
            householdId: HH_ID,
            title: 'At Risk Boundary Goal',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: new Date(targetMs).toISOString(),
            status: 'ACTIVE',
            pledges: [{ id: 'p_ar', personId: 'p1', frequency: 'MONTHLY', amount: 599.999, currency: 'INR', status: 'ACTIVE' }]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert(res.paceRatio < 0.60);
        assert.strictEqual(res.paceHealth, GoalPaceHealth.AT_RISK);
    });

    // -------------------------------------------------------------
    // CATEGORY 10: PROJECTED ETA CALCULATION (36 - 40)
    // -------------------------------------------------------------

    await test('test_projected_eta_exact_date', async () => {
        const goal = {
            id: 'goal_eta_exact',
            householdId: HH_ID,
            title: 'Exact ETA Math',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [{ id: 'p_eta', personId: 'p1', frequency: 'MONTHLY', amount: 1000, currency: 'INR', status: 'ACTIVE' }]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        const expectedEtaMs = new Date(REF_DATE_UTC).getTime() + (304.375 * 86400000);
        const expectedEtaUtc = new Date(expectedEtaMs).toISOString();

        assert.strictEqual(res.projectedEtaUtc, expectedEtaUtc);
        assert.strictEqual(res.projectedDaysNeeded, 304.38);
    });

    await test('test_projected_eta_unfunded_null', async () => {
        const goal = {
            id: 'goal_eta_null',
            householdId: HH_ID,
            title: 'Unfunded Goal ETA Null',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE'
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.projectedEtaUtc, null);
        assert.strictEqual(res.projectedDaysNeeded, null);
        assert.strictEqual(res.etaLabel, 'Unfunded / No Pace');
    });

    await test('test_projected_eta_estimate_label', async () => {
        const goal = {
            id: 'goal_eta_label',
            householdId: HH_ID,
            title: 'ETA Label Test',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [{ id: 'pl_l', personId: 'p1', frequency: 'MONTHLY', amount: 1000, currency: 'INR', status: 'ACTIVE' }]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert(res.etaLabel.startsWith('Projected ETA (Estimate): '));
    });

    await test('test_projected_eta_completed_goal', async () => {
        const goal = {
            id: 'goal_comp_eta',
            householdId: HH_ID,
            title: 'Completed Goal ETA',
            targetAmount: 5000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            accumulations: [{ id: 'a_c', amount: 5000, currency: 'INR', recordedAtUtc: REF_DATE_UTC }]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.projectedEtaUtc, REF_DATE_UTC);
        assert.strictEqual(res.projectedDaysNeeded, 0);
        assert.strictEqual(res.etaLabel, 'Target Achieved');
    });

    await test('test_lifecycle_vs_evaluator_separation', async () => {
        const goal = {
            id: 'goal_status_sep',
            householdId: HH_ID,
            title: 'Separation of Statuses',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            accumulations: [{ id: 'a_sep', amount: 10000, currency: 'INR', recordedAtUtc: REF_DATE_UTC }]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.lifecycleStatus, 'ACTIVE');
        assert.strictEqual(res.paceHealth, 'COMPLETED');
    });

    // -------------------------------------------------------------
    // CATEGORY 11: CUMULATIVE MILESTONES (41 - 44)
    // -------------------------------------------------------------

    await test('test_milestone_target_monotonicity_non_decreasing', async () => {
        // Decreasing milestone target progression is strictly rejected
        assert.throws(() => {
            validateMilestonesMonotonicity([
                { id: 'm1', targetAmount: 5000, isCheckpointOnly: false },
                { id: 'm2', targetAmount: 3000, isCheckpointOnly: false }
            ], 10000);
        }, /INVALID_MILESTONE_PROGRESSION/);

        // Non-decreasing cumulative checkpoints (0 < M1 <= M2 <= ... <= goal.targetAmount) are accepted
        assert.doesNotThrow(() => {
            validateMilestonesMonotonicity([
                { id: 'm1', targetAmount: 5000, isCheckpointOnly: false },
                { id: 'm2', targetAmount: 5000, isCheckpointOnly: false },
                { id: 'm3', targetAmount: 8000, isCheckpointOnly: false }
            ], 10000);
        });
    });

    await test('test_individual_milestone_reached_using_effective_accumulated_amount', async () => {
        const goal = {
            id: 'goal_ms_reached',
            householdId: HH_ID,
            title: 'Milestone Progress',
            targetAmount: 20000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            // Manual accumulation without verifiedAtUtc: verifiedAccumulatedAmount is 0
            accumulations: [{ id: 'a_ms', amount: 6000, currency: 'INR', recordedAtUtc: REF_DATE_UTC }],
            milestones: [
                { id: 'm1', targetAmount: 5000, isCheckpointOnly: false, status: 'PENDING' },
                { id: 'm2', targetAmount: 10000, isCheckpointOnly: false, status: 'PENDING' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        const m1 = res.milestones.find(m => m.id === 'm1');
        const m2 = res.milestones.find(m => m.id === 'm2');

        // Verified capital is 0, but milestone is REACHED via effectiveAccumulatedAmount >= milestone.targetAmount (6000 >= 5000)
        assert.strictEqual(res.verifiedAccumulatedAmount, 0);
        assert.strictEqual(res.effectiveAccumulatedAmount, 6000);
        assert.strictEqual(m1.status, 'REACHED');
        assert.strictEqual(m2.status, 'PENDING');
    });

    await test('test_checkpoint_milestone_no_pacing', async () => {
        const goal = {
            id: 'goal_checkpoint_only',
            householdId: HH_ID,
            title: 'Checkpoint Milestone Bypass',
            targetAmount: 20000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            milestones: [
                { id: 'cp1', name: 'Application Submitted', isCheckpointOnly: true, status: 'PENDING' }
            ]
        };

        const res = evaluateFamilyGoalPure(goal, REF_DATE_UTC);
        assert.strictEqual(res.remainingTargetAmount, 20000);
        assert.strictEqual(res.milestones[0].isCheckpointOnly, true);
    });

    await test('test_milestone_deterministic_tie_break', async () => {
        const rawMilestones = [
            { id: 'b_ms', targetAmount: 5000, targetDateUtc: '2027-06-01T00:00:00.000Z' },
            { id: 'a_ms', targetAmount: 5000, targetDateUtc: '2027-06-01T00:00:00.000Z' },
            { id: 'c_ms', targetAmount: 2000, targetDateUtc: '2027-01-01T00:00:00.000Z' }
        ];

        const sorted = sortMilestonesDeterministically(rawMilestones);
        assert.strictEqual(sorted[0].id, 'c_ms');
        assert.strictEqual(sorted[1].id, 'a_ms');
        assert.strictEqual(sorted[2].id, 'b_ms');
    });

    // -------------------------------------------------------------
    // CATEGORY 12: MULTI-CURRENCY ISOLATION (45 - 47)
    // -------------------------------------------------------------

    await test('test_multi_currency_overview_partitioning', async () => {
        const goalsWithEvaluations = [
            {
                goal: { id: 'g1', status: 'ACTIVE', currency: 'USD', targetAmount: 5000 },
                evaluation: { effectiveAccumulatedAmount: 1000, requiredMonthlyPace: 500, effectiveMonthlyPace: 500, paceHealth: 'ON_TRACK' }
            },
            {
                goal: { id: 'g2', status: 'ACTIVE', currency: 'USD', targetAmount: 10000 },
                evaluation: { effectiveAccumulatedAmount: 2000, requiredMonthlyPace: 1000, effectiveMonthlyPace: 1000, paceHealth: 'ON_TRACK' }
            },
            {
                goal: { id: 'g3', status: 'ACTIVE', currency: 'EUR', targetAmount: 8000 },
                evaluation: { effectiveAccumulatedAmount: 4000, requiredMonthlyPace: 800, effectiveMonthlyPace: 800, paceHealth: 'ON_TRACK' }
            }
        ];

        const overview = buildHouseholdGoalsOverviewPure(HH_ID, goalsWithEvaluations, REF_DATE_UTC);
        assert.strictEqual(Object.keys(overview.perCurrencySummaries).length, 2);
        assert.strictEqual(overview.perCurrencySummaries.USD.activeGoalsCount, 2);
        assert.strictEqual(overview.perCurrencySummaries.USD.totalTargetAmount, 15000);
        assert.strictEqual(overview.perCurrencySummaries.EUR.activeGoalsCount, 1);
        assert.strictEqual(overview.perCurrencySummaries.EUR.totalTargetAmount, 8000);
    });

    await test('test_mixed_currency_total_suppressed', async () => {
        const goalsWithEvaluations = [
            {
                goal: { id: 'g1', status: 'ACTIVE', currency: 'USD', targetAmount: 5000 },
                evaluation: { effectiveAccumulatedAmount: 1000, requiredMonthlyPace: 500, effectiveMonthlyPace: 500, paceHealth: 'ON_TRACK' }
            },
            {
                goal: { id: 'g2', status: 'ACTIVE', currency: 'INR', targetAmount: 500000 },
                evaluation: { effectiveAccumulatedAmount: 100000, requiredMonthlyPace: 50000, effectiveMonthlyPace: 50000, paceHealth: 'ON_TRACK' }
            }
        ];

        const overview = buildHouseholdGoalsOverviewPure(HH_ID, goalsWithEvaluations, REF_DATE_UTC);
        assert.strictEqual(overview.unsupportedMixedCurrencyTotal, null);
    });

    await test('test_no_cross_goal_combined_eta', async () => {
        const goalsWithEvaluations = [
            {
                goal: { id: 'g1', status: 'ACTIVE', currency: 'INR', targetAmount: 10000, targetDateUtc: '2027-01-01T00:00:00.000Z' },
                evaluation: { effectiveAccumulatedAmount: 5000, requiredMonthlyPace: 500, effectiveMonthlyPace: 500, paceHealth: 'ON_TRACK' }
            },
            {
                goal: { id: 'g2', status: 'ACTIVE', currency: 'INR', targetAmount: 50000, targetDateUtc: '2030-01-01T00:00:00.000Z' },
                evaluation: { effectiveAccumulatedAmount: 10000, requiredMonthlyPace: 1000, effectiveMonthlyPace: 1000, paceHealth: 'ON_TRACK' }
            }
        ];

        const overview = buildHouseholdGoalsOverviewPure(HH_ID, goalsWithEvaluations, REF_DATE_UTC);
        assert.strictEqual(overview.combinedEtaUtc, undefined);
    });

    // -------------------------------------------------------------
    // CATEGORY 13: SCENARIO SIMULATION ENGINE (48 - 49)
    // -------------------------------------------------------------

    await test('test_scenario_negative_lump_sum_rejected', async () => {
        const goal = {
            id: 'goal_scen_val',
            householdId: HH_ID,
            title: 'Scenario Validation Goal',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE'
        };
        const baseline = evaluateFamilyGoalPure(goal, REF_DATE_UTC);

        assert.throws(() => {
            simulateGoalScenarioPure(baseline, goal, {
                scenarioName: 'Bad Lump Sum',
                scenarioType: 'STANDARD',
                hypotheticalLumpSum: -1000
            }, REF_DATE_UTC);
        }, /INVALID_SCENARIO_INPUT: Lump sum cannot be negative/);
    });

    await test('test_scenario_reduction_requires_type', async () => {
        const goal = {
            id: 'goal_scen_red',
            householdId: HH_ID,
            title: 'Reduction Scenario Type Check',
            targetAmount: 50000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE',
            pledges: [{ id: 'p1', personId: 'u1', frequency: 'MONTHLY', amount: 2000, currency: 'INR', status: 'ACTIVE' }]
        };
        const baseline = evaluateFamilyGoalPure(goal, REF_DATE_UTC);

        assert.throws(() => {
            simulateGoalScenarioPure(baseline, goal, {
                scenarioName: 'Illegal Reduction',
                scenarioType: 'STANDARD',
                hypotheticalMonthlyPledgeDelta: -500
            }, REF_DATE_UTC);
        }, /INVALID_SCENARIO_INPUT: Negative pledge delta requires PLEDGE_REDUCTION scenario type/);

        const validSim = simulateGoalScenarioPure(baseline, goal, {
            scenarioName: 'Valid Reduction',
            scenarioType: 'PLEDGE_REDUCTION',
            hypotheticalMonthlyPledgeDelta: -500
        }, REF_DATE_UTC);
        assert.strictEqual(validSim.simulatedResult.effectiveMonthlyPace, 1500);
    });

    // -------------------------------------------------------------
    // CATEGORY 14: EXHAUSTIVE 6-PERMUTATION TABLE-DRIVEN TEST (50)
    // -------------------------------------------------------------

    await test('test_scenario_all_six_eta_permutations', async () => {
        const baseGoal = {
            id: 'goal_scen_permutations',
            householdId: HH_ID,
            title: 'Permutation Testing Goal',
            targetAmount: 10000,
            currency: 'INR',
            targetDateUtc: '2028-09-15T00:00:00.000Z',
            status: 'ACTIVE'
        };

        const testMatrix = [
            {
                caseName: '1: null -> finite',
                baselineEta: null,
                simulatedLumpSum: 0,
                simulatedPledge: 1000,
                scenarioType: 'STANDARD',
                expectedClassification: GoalScenarioClassification.ACCELERATION
            },
            {
                caseName: '2: finite -> null',
                baselineEta: '2027-09-15T00:00:00.000Z',
                simulatedLumpSum: 0,
                simulatedPledge: -1000,
                scenarioType: 'PLEDGE_REDUCTION',
                expectedClassification: GoalScenarioClassification.DECELERATION
            },
            {
                caseName: '3: null -> null',
                baselineEta: null,
                simulatedLumpSum: 0,
                simulatedPledge: 0,
                scenarioType: 'STANDARD',
                expectedClassification: GoalScenarioClassification.NEUTRAL
            },
            {
                caseName: '4: finite -> earlier finite',
                baselineEta: '2027-09-15T00:00:00.000Z',
                simulatedLumpSum: 5000,
                simulatedPledge: 0,
                scenarioType: 'STANDARD',
                expectedClassification: GoalScenarioClassification.ACCELERATION
            },
            {
                caseName: '5: finite -> later finite',
                baselineEta: '2027-09-15T00:00:00.000Z',
                simulatedLumpSum: 0,
                simulatedPledge: -200,
                scenarioType: 'PLEDGE_REDUCTION',
                expectedClassification: GoalScenarioClassification.DECELERATION
            },
            {
                caseName: '6: finite -> equal finite',
                baselineEta: null,
                simulatedLumpSum: 0,
                simulatedPledge: 0,
                scenarioType: 'STANDARD',
                expectedClassification: GoalScenarioClassification.NEUTRAL
            }
        ];

        for (const row of testMatrix) {
            let activeGoal = { ...baseGoal };
            if (row.baselineEta !== null) {
                activeGoal.pledges = [{ id: 'p_base', personId: 'u1', frequency: 'MONTHLY', amount: 1000, currency: 'INR', status: 'ACTIVE' }];
            }

            const baseline = evaluateFamilyGoalPure(activeGoal, REF_DATE_UTC);
            if (row.caseName === '6: finite -> equal finite') {
                activeGoal.pledges = [{ id: 'p_base', personId: 'u1', frequency: 'MONTHLY', amount: 1000, currency: 'INR', status: 'ACTIVE' }];
                const baseFin = evaluateFamilyGoalPure(activeGoal, REF_DATE_UTC);
                const simFin = simulateGoalScenarioPure(baseFin, activeGoal, {
                    scenarioName: row.caseName,
                    scenarioType: row.scenarioType,
                    hypotheticalLumpSum: 0,
                    hypotheticalMonthlyPledgeDelta: 0
                }, REF_DATE_UTC);
                assert.strictEqual(simFin.classification, GoalScenarioClassification.NEUTRAL, `Failed on ${row.caseName}`);
                continue;
            }

            const sim = simulateGoalScenarioPure(baseline, activeGoal, {
                scenarioName: row.caseName,
                scenarioType: row.scenarioType,
                hypotheticalLumpSum: row.simulatedLumpSum,
                hypotheticalMonthlyPledgeDelta: row.simulatedPledge
            }, REF_DATE_UTC);

            assert.strictEqual(sim.classification, row.expectedClassification, `Failed on ${row.caseName}`);
            assert.strictEqual(sim.isSimulation, true);
        }
    });

    console.log('\n=============================================================');
    console.log(`🌟 ALL ${passCount} / 50 PHASE 11 CONTRACTUAL ASSERTIONS PASSED!`);
    console.log('=============================================================\n');
}

runSuite().catch(err => {
    console.error('Fatal error in Phase 11 test suite:', err);
    process.exit(1);
});
