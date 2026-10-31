import {hasSamplePoolData} from './familySourceQuality.js';
/**
 * services/family/familyForecastService.js
 * 
 * Domain Service for Phase 10:
 * Household Financial Forecasting, Scenario Planning & Decision Intelligence.
 * 
 * Invariants Enforced:
 * - Read-only consumption of commitments, budgets, and renewals
 * - Single persistent storage key: finlife_family_forecast_scenarios_v1
 * - Pure deterministic evaluation via computeHouseholdFinancialForecastPure
 * - Clock-independent execution (accepts referenceDateUtc)
 * - Zero mutation of MoneyFlow or Phase 9 records
 */

import { FamilyRepository } from './familyRepository.js';
import {
    parseCommitmentAmountPaise,
    computeHouseholdFinancialForecastPure,
    simulateForecastScenarioPure
} from './familyContracts.js';

export const FamilyForecastService = {
    /**
     * Computes the forward-looking financial forecast for a household across specified horizon.
     * 
     * @param {string} householdId 
     * @param {Object} [options]
     * @param {string} [options.referenceDateUtc]
     * @param {number} [options.horizonDays=30]
     * @param {Array}  [options.commitments]
     * @param {Array}  [options.budgetPools]
     * @param {Array}  [options.incomeStreams]
     * @param {Array}  [options.renewalActions]
     * @returns {Promise<Object>}
     */
    async getForecastInputs(householdId, options = {}) {
        if (!householdId) throw new Error('householdId is required');

        const refDateUtc = options.referenceDateUtc || new Date().toISOString();
        const horizonDays = options.horizonDays || 30;

        // 1. Fetch commitments (or use provided overrides)
        let commitments = options.commitments;
        if (!commitments) {
            try {
                const { CommitmentsService } = await import('../commitments/commitmentsService.js');
                const {commitments: allCommitments} = await CommitmentsService.load({mode:'PRODUCTION',readOnly:true});
                const links = await FamilyRepository.listFinancialLinks({ householdId });
                const linkedIds = new Set(links.map(l => l.commitmentId));
                if ([...linkedIds].some(id => !allCommitments.some(c => c.id === id))) throw new Error('A linked expense is unavailable. Review financial links before relying on this forecast.');
                commitments = (allCommitments || []).filter(c => linkedIds.has(c.id)).map(c => {
                    const paise = parseCommitmentAmountPaise(c.amount);
                    if (paise > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('Commitment amount is too large to forecast safely');
                    const frequency = {FORTNIGHTLY:'BIWEEKLY',HALF_YEARLY:'SEMI_ANNUAL',YEARLY:'ANNUAL'}[c.frequency] || c.frequency;
                    if (frequency === 'CUSTOM') throw new Error('A linked custom recurrence needs a schedule before it can be forecast');
                    return {...c, amount:Number(paise)/100, currency:c.amount?.currency || c.currency || 'INR', frequency, nextDueDateUtc:c.nextDueDateUtc || c.nextDueDate || c.dueDateUtc || c.dueDate};
                });
            } catch (err) {
                throw new Error('Linked expenses could not be loaded. ' + err.message);
            }
        }

        // 2. Fetch budget pools
        const savedPools = options.budgetPools || await FamilyRepository.getBudgetPools(householdId);
        const budgetPools = savedPools.filter(pool => !hasSamplePoolData(pool));

        // 3. Fetch members
        const members = options.members || await FamilyRepository.getMembers(householdId);

        // 4. Fetch member income streams
        const incomeStreams = options.incomeStreams || await FamilyRepository.getMemberIncomeStreams(householdId);

        // 5. Fetch renewal actions
        let renewalActions = options.renewalActions;
        if (!renewalActions) {
            try {
                const { FamilyActionService } = await import('./familyActionService.js');
                const horizon = await FamilyActionService.getHouseholdActionHorizon(householdId, {}, refDateUtc.slice(0,10));
                renewalActions = (horizon && horizon.items) ? horizon.items.filter(i => i.domain === 'DOCUMENT' || i.domain === 'PROTECTION') : [];
            } catch (err) {
                throw new Error('Renewals could not be loaded. Please retry.');
            }
        }

        return {
            householdId,
            referenceDateUtc: refDateUtc,
            horizonDays,
            commitments,
            budgetPools,
            incomeStreams,
            renewalActions,
            members
        };
    },

    async getHouseholdForecast(householdId, options = {}) {
        return computeHouseholdFinancialForecastPure(await this.getForecastInputs(householdId, options));
    },

    /**
     * Executes a "what-if" scenario simulation without mutating baseline data.
     * 
     * @param {string} householdId 
     * @param {Object} scenario 
     * @param {Object} [options]
     * @returns {Promise<Object>}
     */
    async simulateScenario(householdId, scenario, options = {}) {
        if (!householdId) throw new Error('householdId is required');
        if (!scenario) throw new Error('scenario is required');

        const inputs = await this.getForecastInputs(householdId, options);
        const baseline = computeHouseholdFinancialForecastPure(inputs);
        return simulateForecastScenarioPure({ ...inputs, baselineForecast: baseline, scenario });
    },

    /**
     * Persists a scenario bookmark to repository storage.
     */
    async saveScenarioBookmark(householdId, scenarioData) {
        return FamilyRepository.saveForecastScenario(householdId, scenarioData);
    },

    /**
     * Lists all saved scenario bookmarks for household.
     */
    async listScenarioBookmarks(householdId) {
        return FamilyRepository.getForecastScenarios(householdId);
    },

    /**
     * Deletes a scenario bookmark without affecting source records.
     */
    async deleteScenarioBookmark(householdId, scenarioId) {
        return FamilyRepository.deleteForecastScenario(householdId, scenarioId);
    },

    /**
     * Saves a member recurring income stream.
     */
    async saveMemberIncome(householdId, incomeData) {
        return FamilyRepository.saveMemberIncomeStream(householdId, incomeData);
    },

    /**
     * Retrieves member income streams.
     */
    async getMemberIncomes(householdId) {
        return FamilyRepository.getMemberIncomeStreams(householdId);
    },

    /**
     * Deletes a member income stream.
     */
    async deleteMemberIncome(householdId, streamId) {
        return FamilyRepository.deleteMemberIncomeStream(householdId, streamId);
    }
};
