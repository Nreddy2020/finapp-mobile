/**
 * services/family/familyGoalService.js
 * 
 * Domain Service for Phase 11:
 * Collective Family Goals, Milestone Governance & Capital Allocation Planning.
 * 
 * Invariants Enforced:
 * - Read-only consumption of Phase 1 members, Phase 3 documents, Phase 10 forecasts
 * - Single persistent storage key: finlife_family_goals_v1
 * - Pure deterministic evaluation via evaluateFamilyGoalPure
 * - Clock-independent execution (accepts referenceDateUtc)
 * - Zero banking, wallet, escrow, or automated debit functionality
 * - Non-custodial, non-mutating architecture
 */

import { FamilyRepository } from './familyRepository.js';
import {
    validateFamilyGoal,
    validateMilestonesMonotonicity,
    sortMilestonesDeterministically,
    evaluateFamilyGoalPure,
    simulateGoalScenarioPure,
    sortGoalsDeterministically,
    buildHouseholdGoalsOverviewPure,
    FamilyGoalStatus,
    MilestoneStatus,
    MemberPledgeFrequency,
    GoalScenarioType
} from './familyContracts.js';

export const FamilyGoalService = {
    /**
     * Lists all goals for a household with deterministic sorting and pure evaluations.
     */
    async getHouseholdGoals(householdId, options = {}) {
        if (!householdId) throw new Error('householdId is required');

        const refDateUtc = options.referenceDateUtc || new Date().toISOString();
        const goals = await FamilyRepository.getGoals(householdId);

        // Optional Phase 10 surplus ingestion (read-only)
        let phase10Surplus = options.phase10ProjectedMonthlySurplus;
        if (phase10Surplus === undefined) {
            try {
                const { FamilyForecastService } = await import('./familyForecastService.js');
                const forecast = await FamilyForecastService.getHouseholdForecast(householdId, {
                    referenceDateUtc: refDateUtc,
                    horizonDays: 30
                });
                phase10Surplus = (forecast && forecast.summary && typeof forecast.summary.netProjectedLiquidityDelta === 'number')
                    ? Math.max(0, forecast.summary.netProjectedLiquidityDelta)
                    : 0;
            } catch (err) {
                phase10Surplus = 0;
            }
        }

        const goalsWithEvaluations = goals.map(goal => ({
            goal,
            evaluation: evaluateFamilyGoalPure(goal, refDateUtc, {
                phase10ProjectedMonthlySurplus: phase10Surplus
            })
        }));

        const sorted = sortGoalsDeterministically(goalsWithEvaluations);
        const overview = buildHouseholdGoalsOverviewPure(householdId, sorted, refDateUtc);

        return {
            householdId,
            referenceDateUtc: refDateUtc,
            overview,
            goals: sorted
        };
    },

    /**
     * Retrieves a single goal by ID with pure evaluation.
     */
    async getGoalById(householdId, goalId, options = {}) {
        if (!householdId || !goalId) return null;
        const refDateUtc = options.referenceDateUtc || new Date().toISOString();
        const goal = await FamilyRepository.getGoalById(householdId, goalId);
        if (!goal) return null;

        const evaluation = evaluateFamilyGoalPure(goal, refDateUtc, {
            phase10ProjectedMonthlySurplus: options.phase10ProjectedMonthlySurplus
        });

        return {
            goal,
            evaluation
        };
    },

    /**
     * Creates or updates a goal. Validates contracts before saving.
     */
    async saveGoal(householdId, goalData) {
        if (!householdId) throw new Error('householdId is required');
        validateFamilyGoal({ ...goalData, householdId });
        validateMilestonesMonotonicity(sortMilestonesDeterministically(goalData.milestones || []),goalData.targetAmount);

        return await FamilyRepository.saveGoal(householdId, goalData);
    },

    /**
     * Records a capital accumulation entry.
     */
    async recordAccumulation(householdId, goalId, entryData) {
        if (!householdId || !goalId) throw new Error('householdId and goalId are required');
        if (!entryData || typeof entryData.amount !== 'number' || entryData.amount <= 0) {
            throw new Error('INVALID_ACCUMULATION: amount must be greater than 0');
        }

        const goal = await FamilyRepository.getGoalById(householdId, goalId);
        if (!goal) throw new Error('Goal not found');

        const now = new Date().toISOString();
        const entry = {
            id: entryData.id || `acc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            goalId,
            personId: entryData.personId || 'unknown_member',
            amount: entryData.amount,
            currency: entryData.currency || goal.currency,
            recordedAtUtc: entryData.recordedAtUtc || now,
            evidenceDocId: entryData.evidenceDocId || null,
            verifiedByPersonId: entryData.verifiedByPersonId || null,
            verifiedAtUtc: entryData.verifiedAtUtc || (entryData.isVerified ? now : null),
            notes: entryData.notes || null
        };

        const updatedAccumulations = [...(goal.accumulations || []), entry];
        return await FamilyRepository.saveGoal(householdId, {
            ...goal,
            accumulations: updatedAccumulations
        });
    },

    /**
     * Adds or updates a member funding pledge.
     */
    async savePledge(householdId, goalId, pledgeData) {
        if (!householdId || !goalId) throw new Error('householdId and goalId are required');
        const goal = await FamilyRepository.getGoalById(householdId, goalId);
        if (!goal) throw new Error('Goal not found');

        const now = new Date().toISOString();
        const pledgeId = pledgeData.id || `pledge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const record = {
            id: pledgeId,
            goalId,
            personId: pledgeData.personId,
            frequency: pledgeData.frequency || MemberPledgeFrequency.MONTHLY,
            amount: pledgeData.amount,
            currency: pledgeData.currency || goal.currency,
            effectiveFromUtc: pledgeData.effectiveFromUtc || now,
            effectiveToUtc: pledgeData.effectiveToUtc || null,
            status: pledgeData.status || 'ACTIVE'
        };

        const existingPledges = (goal.pledges || []).filter(p => p.id !== pledgeId);
        return await FamilyRepository.saveGoal(householdId, {
            ...goal,
            pledges: [...existingPledges, record]
        });
    },

    /**
     * Adds or updates a milestone checkpoint.
     */
    async saveMilestone(householdId, goalId, milestoneData) {
        if (!householdId || !goalId) throw new Error('householdId and goalId are required');
        const goal = await FamilyRepository.getGoalById(householdId, goalId);
        if (!goal) throw new Error('Goal not found');

        const milestoneId = milestoneData.id || `ms_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const record = {
            id: milestoneId,
            goalId,
            name: milestoneData.name || 'Milestone Checkpoint',
            targetAmount: milestoneData.targetAmount,
            targetDateUtc: milestoneData.targetDateUtc,
            isCheckpointOnly: !!milestoneData.isCheckpointOnly,
            status: milestoneData.status || MilestoneStatus.PENDING,
            evidenceDocId: milestoneData.evidenceDocId || null,
            reachedAtUtc: milestoneData.reachedAtUtc || null
        };

        const existingMilestones = (goal.milestones || []).filter(m => m.id !== milestoneId);
        validateMilestonesMonotonicity(sortMilestonesDeterministically([...existingMilestones,record]),goal.targetAmount);
        return await FamilyRepository.saveGoal(householdId, {
            ...goal,
            milestones: [...existingMilestones, record]
        });
    },

    /**
     * Simulates an ephemeral "What-If" goal scenario (zero storage writes).
     */
    async simulateGoalScenario(householdId, goalId, scenarioInput, options = {}) {
        if (!householdId || !goalId) throw new Error('householdId and goalId are required');
        const goal = await FamilyRepository.getGoalById(householdId, goalId);
        if (!goal) throw new Error('Goal not found');

        const refDateUtc = options.referenceDateUtc || new Date().toISOString();
        const baselineResult = evaluateFamilyGoalPure(goal, refDateUtc, {
            phase10ProjectedMonthlySurplus: options.phase10ProjectedMonthlySurplus
        });

        return simulateGoalScenarioPure(baselineResult, goal, scenarioInput, refDateUtc);
    },

    /**
     * Deletes a goal.
     */
    async deleteGoal(householdId, goalId) {
        return await FamilyRepository.deleteGoal(householdId, goalId);
    }
};
