/**
 * services/family/familyPersonService.js
 * 
 * Domain Service for Individual Person Identity & Lifecycle.
 * Enforces strict boundary: Person stores identity and contacts only.
 */

import { FamilyRepository } from './familyRepository.js';
import { createEmptyPerson, PersonStatus, assertSafeNumbers } from './familyContracts.js';

export const FamilyPersonService = {
    /**
     * Create a new Person entity
     */
    async createPerson(personData = {}) {
        if ('role' in personData || 'householdRole' in personData) {
            throw new Error('Household role cannot be set on Person entity; use HouseholdMembership');
        }
        if ('trustedCategory' in personData || 'category' in personData) {
            throw new Error('Trusted category cannot be set on Person entity; use TrustedCircleEntry');
        }

        const person = createEmptyPerson(personData);
        assertSafeNumbers(person);
        return await FamilyRepository.upsertPerson(person);
    },

    /**
     * Update an existing Person entity
     */
    async updatePerson(id, updates = {}) {
        if (!id) {
            throw new Error('Person id is required for update');
        }
        if ('role' in updates || 'householdRole' in updates) {
            throw new Error('Household role cannot be set on Person entity; use HouseholdMembership');
        }
        if ('trustedCategory' in updates || 'category' in updates) {
            throw new Error('Trusted category cannot be set on Person entity; use TrustedCircleEntry');
        }

        const existing = await FamilyRepository.getPerson(id);
        if (!existing) {
            throw new Error(`Person with id '${id}' not found`);
        }

        const merged = {
            ...existing,
            ...updates,
            id: existing.id // Immutable id
        };

        assertSafeNumbers(merged);
        return await FamilyRepository.upsertPerson(merged);
    },

    /**
     * Archive a person (soft-delete preserving historical relationships and audit records)
     */
    async archivePerson(id) {
        if (!id) {
            throw new Error('Person id is required to archive');
        }
        return await FamilyRepository.archivePerson(id);
    },

    /**
     * Get person by id
     */
    async getPerson(id) {
        return await FamilyRepository.getPerson(id);
    },

    /**
     * List people with optional status filtering
     */
    async listPeople(filters = {}) {
        return await FamilyRepository.listPeople(filters);
    },

    /**
     * Physically delete an unreferenced person
     * Throws if referenced by memberships, relationships, or trusted circle
     */
    async deletePerson(id) {
        if (!id) {
            throw new Error('Person id is required for delete');
        }
        return await FamilyRepository.deletePerson(id);
    }
};
