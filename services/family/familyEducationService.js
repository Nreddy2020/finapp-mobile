/**
 * FinLife Family Education Service
 * Assumption-driven future value projections with visible inflation parameters.
 * Strict honest states: NOT_CONFIGURED when parameters are missing; zero BigInt leakage.
 */

import { DataAvailabilityState } from './familyContracts.js';
import { FamilyRepository } from './familyRepository.js';
import { parseAmountPaise, formatPaiseToRupees } from './familyProtectionService.js';

export function calculateEducationProjection({
    currentCostPaise = 0n,
    inflationRateBps = 800, // Default 8.0% p.a.
    targetYear = null,
    currentYear = new Date().getFullYear(),
    currentSavingsPaise = 0n
} = {}) {
    const costPaise = parseAmountPaise(currentCostPaise);
    const savingsPaise = parseAmountPaise(currentSavingsPaise);

    if (!targetYear || costPaise <= 0n) {
        return {
            assumptionStatus: DataAvailabilityState.NOT_CONFIGURED,
            targetYear: targetYear || null,
            yearsRemaining: null,
            currentCostPaiseStr: costPaise.toString(),
            currentCostDisplay: costPaise > 0n ? formatPaiseToRupees(costPaise) : '—',
            inflationRatePercent: (inflationRateBps / 100).toFixed(1) + '%',
            projectedCostPaiseStr: null,
            projectedCostDisplay: '—',
            currentSavingsPaiseStr: savingsPaise.toString(),
            currentSavingsDisplay: savingsPaise > 0n ? formatPaiseToRupees(savingsPaise) : '—',
            projectedShortfallPaiseStr: null,
            projectedShortfallDisplay: '—',
            notes: 'Target year or current cost not configured.'
        };
    }

    const yearsRemaining = Math.max(0, targetYear - currentYear);
    const inflationRate = (Number(inflationRateBps) || 0) / 10000;
    const compoundFactor = Math.pow(1 + inflationRate, yearsRemaining);
    const projectedPaise = BigInt(Math.round(Number(costPaise) * compoundFactor));
    const shortfallPaise = projectedPaise > savingsPaise ? (projectedPaise - savingsPaise) : 0n;

    return {
        assumptionStatus: DataAvailabilityState.AVAILABLE,
        targetYear,
        yearsRemaining,
        currentCostPaiseStr: costPaise.toString(),
        currentCostDisplay: formatPaiseToRupees(costPaise),
        inflationRateBps,
        inflationRatePercent: (inflationRateBps / 100).toFixed(1) + '%',
        projectedCostPaiseStr: projectedPaise.toString(),
        projectedCostDisplay: formatPaiseToRupees(projectedPaise),
        currentSavingsPaiseStr: savingsPaise.toString(),
        currentSavingsDisplay: formatPaiseToRupees(savingsPaise),
        projectedShortfallPaiseStr: shortfallPaise.toString(),
        projectedShortfallDisplay: formatPaiseToRupees(shortfallPaise),
        notes: `Projected at ${(inflationRateBps / 100).toFixed(1)}% annual education inflation over ${yearsRemaining} years.`
    };
}

export const FamilyEducationService = {
    async getEducationGoals() {
        return await FamilyRepository.getEducationGoals();
    },

    async saveEducationGoal(goal) {
        return await FamilyRepository.saveEducationGoal(goal);
    },

    async deleteEducationGoal(id) {
        return await FamilyRepository.deleteEducationGoal(id);
    },

    enrichEducationGoal(goal, childPerson = null, currentYear = new Date().getFullYear()) {
        const projection = calculateEducationProjection({
            currentCostPaise: goal.currentCostPaise,
            inflationRateBps: goal.inflationRateBps || 800,
            targetYear: goal.targetYear,
            currentYear,
            currentSavingsPaise: goal.currentSavingsPaise || 0n
        });

        return {
            ...goal,
            childName: childPerson?.core?.name || childPerson?.name || 'Child',
            projection
        };
    },

    getEducationSummary(goals = [], persons = [], currentYear = new Date().getFullYear()) {
        if (!goals.length) {
            return {
                state: DataAvailabilityState.EMPTY,
                goalsCount: 0,
                totalProjectedCostDisplay: '—',
                totalProjectedCostPaiseStr: '0',
                goalsList: []
            };
        }

        const personsMap = new Map();
        persons.forEach(p => {
            const pId = p.core?.id || p.id;
            personsMap.set(pId, p);
        });

        let totalProjectedPaise = 0n;
        let hasAnyConfigured = false;

        const enrichedList = goals.map(g => {
            const child = personsMap.get(g.childPersonId);
            const enriched = this.enrichEducationGoal(g, child, currentYear);
            if (enriched.projection.assumptionStatus === DataAvailabilityState.AVAILABLE) {
                hasAnyConfigured = true;
                totalProjectedPaise += BigInt(enriched.projection.projectedCostPaiseStr);
            }
            return enriched;
        });

        return {
            state: hasAnyConfigured ? DataAvailabilityState.AVAILABLE : DataAvailabilityState.NOT_CONFIGURED,
            goalsCount: goals.length,
            totalProjectedCostPaiseStr: totalProjectedPaise.toString(),
            totalProjectedCostDisplay: totalProjectedPaise > 0n ? formatPaiseToRupees(totalProjectedPaise) : '—',
            goalsList: enrichedList
        };
    }
};
