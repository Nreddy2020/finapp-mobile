/**
 * FinLife Family Care Service
 * Parents and Elder Care coordination, living arrangements, and support budgets.
 * Strict read-only financial reference; zero duplicate transactions.
 */

import {
    CareHealthStatus,
    DataAvailabilityState
} from './familyContracts.js';
import { FamilyRepository } from './familyRepository.js';
import { parseAmountPaise, formatPaiseToRupees } from './familyProtectionService.js';

export const FamilyCareService = {
    async getElderCarePlans() {
        return await FamilyRepository.getElderCarePlans();
    },

    async saveElderCarePlan(plan) {
        return await FamilyRepository.saveElderCarePlan(plan);
    },

    async deleteElderCarePlan(id) {
        return await FamilyRepository.deleteElderCarePlan(id);
    },

    enrichCarePlan(plan, personsMap = new Map()) {
        const budgetPaise = parseAmountPaise(plan.monthlySupportBudgetPaise);
        const parentPerson = plan.parentPersonId ? personsMap.get(plan.parentPersonId) : null;
        const coordinatorPerson = plan.careCoordinatorId ? personsMap.get(plan.careCoordinatorId) : null;

        return {
            ...plan,
            parentName: parentPerson?.core?.name || parentPerson?.name || 'Elder',
            parentAge: parentPerson?.core?.dateOfBirth ? Math.floor((new Date() - new Date(parentPerson.core.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
            coordinatorName: coordinatorPerson?.core?.name || coordinatorPerson?.name || 'Unassigned',
            monthlySupportBudgetPaiseStr: budgetPaise.toString(),
            monthlySupportBudgetDisplay: budgetPaise > 0n ? formatPaiseToRupees(budgetPaise) : '—',
            careStatus: plan.careStatus || CareHealthStatus.STABLE
        };
    },

    getCareSummary(plans = [], persons = []) {
        if (!plans.length) {
            return {
                state: DataAvailabilityState.EMPTY,
                totalEldersUnderCare: 0,
                totalMonthlySupportBudgetPaiseStr: '0',
                totalMonthlySupportBudgetDisplay: '₹0',
                needsAttentionCount: 0,
                plansList: []
            };
        }

        const personsMap = new Map();
        persons.forEach(p => {
            const pId = p.core?.id || p.id;
            personsMap.set(pId, p);
        });

        let totalBudgetPaise = 0n;
        let needsAttentionCount = 0;

        const enrichedList = plans.map(plan => {
            const enriched = this.enrichCarePlan(plan, personsMap);
            totalBudgetPaise += parseAmountPaise(plan.monthlySupportBudgetPaise);
            if (plan.careStatus === CareHealthStatus.MONITORING || plan.careStatus === CareHealthStatus.CRITICAL || plan.careStatus === CareHealthStatus.ATTENTION_NEEDED) {
                needsAttentionCount++;
            }
            return enriched;
        });

        return {
            state: DataAvailabilityState.AVAILABLE,
            totalEldersUnderCare: plans.length,
            totalMonthlySupportBudgetPaiseStr: totalBudgetPaise.toString(),
            totalMonthlySupportBudgetDisplay: formatPaiseToRupees(totalBudgetPaise),
            needsAttentionCount,
            plansList: enrichedList
        };
    }
};
