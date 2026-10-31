/**
 * services/family/familyActionService.js
 * 
 * Domain Service for FinLife Family OS Phase 7:
 * Household Action & Renewal Horizon (Unified Action Horizon).
 * 
 * Orchestrates cross-domain read-only synthesis over existing authoritative records:
 * 1. Financial Commitments (Phase 6 / CommitmentsService)
 * 2. Document Vault Expiries (Phase 3 / FamilyRepository)
 * 3. Operations & Chores (Phase 4 / FamilyRepository)
 * 4. Protection Directives (Phase 5 / FamilyRepository)
 * 
 * Enforces:
 * - Pure transient projection (computeHouseholdActionHorizonPure)
 * - Zero new storage keys
 * - Zero secondary action ledgers
 * - Zero source mutation
 * - Deep-link handoff to authoritative domain screens
 */

import { FamilyRepository } from './familyRepository.js';
import { CommitmentsService } from '../commitments/commitmentsService.js';
import {
    computeHouseholdActionHorizonPure,
    ActionHorizonDomain,
    ActionHorizonTier,
    ActionHorizonRole,
    ACTION_HORIZON_ROUTES
} from './familyContracts.js';

class FamilyActionServiceClass {
    /**
     * Load saved commitments without creating demo or migration records
     * @private
     */
    async _loadAllCommitments(options = {}) {
        const {commitments = []} = await CommitmentsService.load({...options,mode:'PRODUCTION',readOnly:true});
        return commitments;
    }

    /**
     * Ingests authoritative records across all 4 domains for a given household
     * and computes the unified Action Horizon projection.
     * 
     * @param {string} householdId - ID of target household
     * @param {Object} [filters] - View filters { status, domain, personId }
     * @param {string} [injectedReferenceDate] - Optional UTC reference date (YYYY-MM-DD) for deterministic testing
     * @returns {Promise<{ items: Array, summary: Object }>}
     */
    async getHouseholdActionHorizon(householdId, filters = {}, injectedReferenceDate = null) {
        if (!householdId) {
            return computeHouseholdActionHorizonPure({
                householdId: null,
                referenceDateUtc: injectedReferenceDate,
                filters
            });
        }

        // Fault-tolerant parallel retrieval across all domains
        const [
            financialLinks,
            commitments,
            documents,
            tasks,
            protectionItems,
            people
        ] = await Promise.all([
            FamilyRepository.listFinancialLinks({ householdId }),
            this._loadAllCommitments(),
            FamilyRepository.listDocuments({ householdId }),
            FamilyRepository.listTasks({ householdId }),
            FamilyRepository.listProtectionItems(householdId),
            FamilyRepository.getMembers(householdId)
        ]);

        return computeHouseholdActionHorizonPure({
            householdId,
            referenceDateUtc: injectedReferenceDate,
            financialLinks: Array.isArray(financialLinks) ? financialLinks : [],
            commitments: Array.isArray(commitments) ? commitments : [],
            documents: Array.isArray(documents) ? documents : [],
            tasks: Array.isArray(tasks) ? tasks : [],
            protectionItems: Array.isArray(protectionItems) ? protectionItems : [],
            members: Array.isArray(people) ? people : [],
            filters
        });
    }
}

export const FamilyActionService = new FamilyActionServiceClass();
