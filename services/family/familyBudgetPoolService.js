/**
 * services/family/familyBudgetPoolService.js
 * 
 * Domain Service for Phase 9: Shared Family Budgeting & Collective Pool Governance.
 * Coordinates repository persistence and executes pure deterministic evaluation.
 */

import { FamilyRepository } from './familyRepository.js';
import { computeHouseholdBudgetPoolsPure } from './familyContracts.js';

export const FamilyBudgetPoolService = {
    /**
     * Loads household pools and members, then performs pure deterministic evaluation.
     * 
     * @param {string} householdId 
     * @param {Object} [options]
     * @param {string} [options.referenceDateUtc]
     * @param {string} [options.timezone]
     * @returns {Promise<{ summary: Object, evaluatedPools: Array }>}
     */
    async getHouseholdBudgetPools(householdId, options = {}) {
        if (!householdId) throw new Error('householdId is required');

        const pools = await FamilyRepository.getBudgetPools(householdId);
        const members = await FamilyRepository.getMembers(householdId);

        const refDate = options.referenceDateUtc || new Date().toISOString();
        const tz = options.timezone || 'UTC';

        return computeHouseholdBudgetPoolsPure({
            householdId,
            referenceDateUtc: refDate,
            timezone: tz,
            pools,
            members: members.map(m => ({ ...m, name: m.fullName || m.name }))
        });
    },

    /**
     * Retrieves raw budget pools for household.
     */
    async getRawPools(householdId) {
        return FamilyRepository.getBudgetPools(householdId);
    },

    /**
     * Retrieves single raw budget pool.
     */
    async getPool(householdId, poolId) {
        return FamilyRepository.getBudgetPool(householdId, poolId);
    },

    /**
     * Creates or updates a budget pool.
     */
    async savePool(householdId, poolData) {
        return FamilyRepository.saveBudgetPool(householdId, poolData);
    },

    /**
     * Soft archives a budget pool.
     */
    async archivePool(householdId, poolId) {
        return FamilyRepository.archiveBudgetPool(householdId, poolId);
    },

    /**
     * Links an expense transaction to a pool.
     */
    async linkExpense(householdId, poolId, expenseData) {
        return FamilyRepository.linkExpenseToPool(householdId, poolId, expenseData);
    },

    /**
     * Unlinks an expense transaction from a pool.
     */
    async unlinkExpense(householdId, poolId, transactionId) {
        return FamilyRepository.unlinkExpenseFromPool(householdId, poolId, transactionId);
    },

    /**
     * Atomically relinks an expense transaction from one pool to another.
     */
    async relinkExpense(householdId, fromPoolId, toPoolId, transactionId) {
        return FamilyRepository.relinkExpense(householdId, fromPoolId, toPoolId, transactionId);
    }
};

export default FamilyBudgetPoolService;
