/**
 * services/family/familyTrustedCircleService.js
 * 
 * Domain Service for Household Trusted Circle / Support Network.
 * Manages external advisors, doctors, lawyers, caretakers, and emergency contacts.
 * 
 * Key Invariants:
 * 1. Adding a person to the Trusted Circle NEVER creates a HouseholdMembership.
 * 2. Referential integrity: Both Household and Person must exist.
 * 3. Supports priority ordering for emergency dispatch.
 * 4. Numeric safety: No raw BigInt, no NaN, no Infinity.
 */

import { FamilyRepository } from './familyRepository.js';
import {
    createEmptyTrustedCircleEntry,
    TrustedCategory,
    assertSafeNumbers
} from './familyContracts.js';

export const FamilyTrustedCircleService = {
    /**
     * Add a trusted contact entry for a household
     * @param {Object} params
     * @param {string} params.householdId
     * @param {string} params.personId
     * @param {string} [params.category]
     * @param {number} [params.emergencyPriority]
     * @param {string} [params.notes]
     */
    async addTrustedContact({
        householdId,
        personId,
        category = TrustedCategory.EMERGENCY_CONTACT,
        emergencyPriority = 1,
        notes = ''
    }) {
        if (!householdId) throw new Error('householdId is required');
        if (!personId) throw new Error('personId is required');

        // Verify household and person exist
        const [household, person] = await Promise.all([
            FamilyRepository.getHousehold(householdId),
            FamilyRepository.getPerson(personId)
        ]);

        if (!household) throw new Error(`Household with id '${householdId}' does not exist`);
        if (!person) throw new Error(`Person with id '${personId}' does not exist`);

        // Check if an entry already exists for this person in this household
        const existingEntries = await FamilyRepository.listTrustedCircle(householdId);
        const duplicate = existingEntries.find(t => t.personId === personId && t.category === category);
        if (duplicate) {
            // Update priority and notes idempotently
            const updated = {
                ...duplicate,
                emergencyPriority: Math.max(1, Number.isInteger(emergencyPriority) ? emergencyPriority : 1),
                notes: typeof notes === 'string' ? notes.trim() : duplicate.notes
            };
            assertSafeNumbers(updated);
            return await FamilyRepository.upsertTrustedCircle(updated);
        }

        const entry = createEmptyTrustedCircleEntry({
            householdId,
            personId,
            category,
            emergencyPriority,
            notes
        });

        assertSafeNumbers(entry);
        return await FamilyRepository.upsertTrustedCircle(entry);
    },

    /**
     * Update an existing trusted contact entry
     */
    async updateTrustedContact(id, updates = {}) {
        if (!id) throw new Error('id is required for update');

        const all = await FamilyRepository.listTrustedCircle();
        const existing = all.find(e => e.id === id);
        if (!existing) throw new Error(`TrustedCircleEntry with id '${id}' not found`);

        if (updates.householdId && updates.householdId !== existing.householdId) {
            const hh = await FamilyRepository.getHousehold(updates.householdId);
            if (!hh) throw new Error(`Household with id '${updates.householdId}' does not exist`);
        }
        if (updates.personId && updates.personId !== existing.personId) {
            const p = await FamilyRepository.getPerson(updates.personId);
            if (!p) throw new Error(`Person with id '${updates.personId}' does not exist`);
        }

        const merged = {
            ...existing,
            ...updates,
            id: existing.id // Immutable id
        };

        assertSafeNumbers(merged);
        return await FamilyRepository.upsertTrustedCircle(merged);
    },

    /**
     * List all trusted contacts for a household with populated Person details
     */
    async listTrustedContacts(householdId) {
        if (!householdId) throw new Error('householdId is required');

        const [entries, allPeople] = await Promise.all([
            FamilyRepository.listTrustedCircle(householdId),
            FamilyRepository.listPeople({ includeArchived: true })
        ]);

        const peopleMap = new Map(allPeople.map(p => [p.id, p]));

        // Sort by emergency priority ascending (1 = highest priority)
        const sorted = [...entries].sort((a, b) => a.emergencyPriority - b.emergencyPriority);

        return sorted.map(entry => {
            const person = peopleMap.get(entry.personId);
            return {
                ...entry,
                person: person ? { ...person } : null
            };
        });
    },

    /**
     * Remove a trusted contact entry by id
     */
    async removeTrustedContact(id) {
        if (!id) throw new Error('id is required to remove trusted contact');
        return await FamilyRepository.deleteTrustedCircle(id);
    }
};
