/**
 * services/commitments/familyCommitmentBridge.js
 * 
 * Authoritative cross-domain bridge between Family Hub and Commitments & Recurring Obligations.
 * 
 * Invariants:
 * - Family Hub remains a read-only consumer of commitments data.
 * - Commitments remains the authoritative engine for recurring schedules and obligations.
 * - familyMemberName is strictly a derived presentation field (never authoritative).
 * - personId must reference an existing, non-archived member for new commitments.
 * - Historical commitments linked to deleted/archived members become ORPHANED.
 * - 100% BigInt integer arithmetic with zero floating-point math.
 * - No raw BigInt primitives returned to UI layers.
 */

import {
    FamilyObligationCategory,
    CommitmentStatus,
    createMoneyPaise,
    moneyToBigInt,
    formatMoneyPaise
} from './commitmentContracts.js';
import { normalizeToMonthlyPaise } from './commitmentCalculator.js';
import { FamilyStatus } from '../family/familyContracts.js';

/**
 * Validates familyContext contract against the Family Hub state.
 * 
 * @param {object} familyContext
 * @param {object} familyStore { persons, policies, educationGoals, elderCarePlans }
 * @param {object} options { allowArchivedHistorical: false }
 */
export function validateFamilyContext(familyContext, familyStore = {}, options = {}) {
    if (!familyContext || typeof familyContext !== 'object') {
        throw new Error('familyContext is required and must be an object');
    }

    const { personId, familyRole, obligationCategory, policyId, educationGoalId, elderCarePlanId } = familyContext;

    if (!personId || typeof personId !== 'string' || !personId.trim()) {
        throw new Error('familyContext must have a valid non-empty personId');
    }
    if (!familyRole || typeof familyRole !== 'string' || !familyRole.trim()) {
        throw new Error('familyContext must have a valid non-empty familyRole');
    }
    if (!obligationCategory || !Object.values(FamilyObligationCategory).includes(obligationCategory)) {
        throw new Error(`Invalid obligationCategory: "${obligationCategory}". Must be in FamilyObligationCategory.`);
    }

    // Single domain link mutual exclusivity
    const domainLinks = [policyId, educationGoalId, elderCarePlanId].filter(Boolean);
    if (domainLinks.length > 1) {
        throw new Error('Commitment cannot simultaneously link to conflicting family domain targets');
    }

    // Verify person existence and active status
    const persons = Array.isArray(familyStore.persons) ? familyStore.persons : [];
    if (persons.length > 0) {
        const person = persons.find(p => p.id === personId || p.core?.id === personId);
        if (!person) {
            throw new Error(`Referenced family member "${personId}" does not exist in Family Hub`);
        }

        const personStatus = person.status || person.core?.status || FamilyStatus.ACTIVE;
        if (!options.allowArchivedHistorical && personStatus === FamilyStatus.ARCHIVED) {
            throw new Error(`Cannot link commitment to archived or inactive family member "${personId}"`);
        }
    }

    // Verify domain link integrity if provided
    if (policyId && Array.isArray(familyStore.policies) && familyStore.policies.length > 0) {
        const pol = familyStore.policies.find(p => p.id === policyId);
        if (!pol) {
            throw new Error(`Referenced insurance policy "${policyId}" does not exist in Family Hub`);
        }
    }

    if (educationGoalId && Array.isArray(familyStore.educationGoals) && familyStore.educationGoals.length > 0) {
        const goal = familyStore.educationGoals.find(g => g.id === educationGoalId);
        if (!goal) {
            throw new Error(`Referenced education goal "${educationGoalId}" does not exist in Family Hub`);
        }
    }

    if (elderCarePlanId && Array.isArray(familyStore.elderCarePlans) && familyStore.elderCarePlans.length > 0) {
        const plan = familyStore.elderCarePlans.find(p => p.id === elderCarePlanId);
        if (!plan) {
            throw new Error(`Referenced elder care plan "${elderCarePlanId}" does not exist in Family Hub`);
        }
    }

    return true;
}

/**
 * Enriches a commitment record with derived family presentation fields.
 * If the member has been deleted or archived, flags the link as ORPHANED.
 * 
 * @param {object} commitment 
 * @param {Array<object>} familyPersons 
 * @returns {object} Enriched commitment
 */
export function enrichCommitmentWithFamilyPresentation(commitment, familyPersons = []) {
    if (!commitment) return null;
    if (!commitment.familyContext) {
        return {
            ...commitment,
            familyPresentation: null
        };
    }

    const fc = commitment.familyContext;
    const person = (Array.isArray(familyPersons) ? familyPersons : []).find(
        p => p.id === fc.personId || p.core?.id === fc.personId
    );

    let familyMemberName = 'Unknown Member';
    let isOrphaned = true;
    let linkStatus = 'ORPHANED';

    if (person) {
        const personStatus = person.status || person.core?.status || FamilyStatus.ACTIVE;
        if (personStatus === FamilyStatus.ARCHIVED) {
            familyMemberName = `${person.profile?.name || person.core?.firstName || 'Archived Member'} (Archived)`;
            isOrphaned = true;
            linkStatus = 'ORPHANED';
        } else {
            familyMemberName = person.profile?.name || person.core?.firstName || person.name || 'Family Member';
            isOrphaned = false;
            linkStatus = 'LINKED_VERIFIED';
        }
    }

    return {
        ...commitment,
        familyPresentation: {
            familyMemberName,
            familyRole: fc.familyRole,
            obligationCategory: fc.obligationCategory,
            isOrphaned,
            linkStatus,
            policyId: fc.policyId || null,
            educationGoalId: fc.educationGoalId || null,
            elderCarePlanId: fc.elderCarePlanId || null
        }
    };
}

/**
 * Aggregates active commitments by family member and by obligation category.
 * Fully deterministic BigInt math; returns serialized MoneyPaise and formatted strings.
 * 
 * @param {object} params
 * @param {Array<object>} params.commitments
 * @param {Array<object>} params.familyPersons
 * @returns {object} Breakdown metrics
 */
export function getFamilyObligationsBreakdown({ commitments = [], familyPersons = [] } = {}) {
    const activeList = (Array.isArray(commitments) ? commitments : []).filter(c => c.status === CommitmentStatus.ACTIVE);

    const personsMap = new Map();
    for (const p of (Array.isArray(familyPersons) ? familyPersons : [])) {
        const pId = p.id || p.core?.id;
        if (pId) {
            personsMap.set(pId, p);
        }
    }

    let totalFamilyMonthlyPaise = 0n;
    const byPersonMap = new Map();
    const byCategoryMap = new Map();
    const orphanedList = [];
    const unassignedList = [];

    // Initialize category map for all standard categories
    for (const cat of Object.values(FamilyObligationCategory)) {
        byCategoryMap.set(cat, {
            category: cat,
            monthlyPaise: 0n,
            commitmentsCount: 0,
            commitments: []
        });
    }

    for (const c of activeList) {
        if (!c.amount) continue;
        const monthly = moneyToBigInt(normalizeToMonthlyPaise(c.amount, c.frequency));

        if (!c.familyContext) {
            unassignedList.push(c);
            continue;
        }

        const fc = c.familyContext;
        totalFamilyMonthlyPaise += monthly;

        // Check if member is valid or orphaned
        const person = personsMap.get(fc.personId);
        const isOrphan = !person || (person.status || person.core?.status) === FamilyStatus.ARCHIVED;

        if (isOrphan) {
            orphanedList.push(enrichCommitmentWithFamilyPresentation(c, familyPersons));
        }

        // Aggregate by Person
        const personKey = fc.personId;
        const personName = person ? (person.profile?.name || person.core?.firstName || person.name || 'Member') : 'Unknown / Archived';
        if (!byPersonMap.has(personKey)) {
            byPersonMap.set(personKey, {
                personId: personKey,
                personName,
                familyRole: fc.familyRole,
                monthlyPaise: 0n,
                commitmentsCount: 0,
                isOrphaned: isOrphan,
                commitments: []
            });
        }
        const personGroup = byPersonMap.get(personKey);
        personGroup.monthlyPaise += monthly;
        personGroup.commitmentsCount++;
        personGroup.commitments.push(enrichCommitmentWithFamilyPresentation(c, familyPersons));

        // Aggregate by Category
        const catKey = fc.obligationCategory;
        if (!byCategoryMap.has(catKey)) {
            byCategoryMap.set(catKey, {
                category: catKey,
                monthlyPaise: 0n,
                commitmentsCount: 0,
                commitments: []
            });
        }
        const catGroup = byCategoryMap.get(catKey);
        catGroup.monthlyPaise += monthly;
        catGroup.commitmentsCount++;
        catGroup.commitments.push(enrichCommitmentWithFamilyPresentation(c, familyPersons));
    }

    // Serialize byPerson for safe UI consumption (no raw BigInt)
    const byPerson = Array.from(byPersonMap.values()).map(p => ({
        personId: p.personId,
        personName: p.personName,
        familyRole: p.familyRole,
        monthlyCommitted: createMoneyPaise(p.monthlyPaise),
        monthlyCommittedDisplay: formatMoneyPaise(createMoneyPaise(p.monthlyPaise)),
        commitmentsCount: p.commitmentsCount,
        isOrphaned: p.isOrphaned,
        commitments: p.commitments
    }));

    // Serialize byCategory for safe UI consumption
    const byCategory = Array.from(byCategoryMap.values()).map(c => ({
        category: c.category,
        monthlyCommitted: createMoneyPaise(c.monthlyPaise),
        monthlyCommittedDisplay: formatMoneyPaise(createMoneyPaise(c.monthlyPaise)),
        commitmentsCount: c.commitmentsCount,
        commitments: c.commitments
    }));

    return {
        totalFamilyMonthlyCommitted: createMoneyPaise(totalFamilyMonthlyPaise),
        totalFamilyMonthlyDisplay: formatMoneyPaise(createMoneyPaise(totalFamilyMonthlyPaise)),
        byPerson,
        byCategory,
        orphanedCount: orphanedList.length,
        orphanedCommitments: orphanedList,
        unassignedCount: unassignedList.length,
        unassignedCommitments: unassignedList
    };
}
