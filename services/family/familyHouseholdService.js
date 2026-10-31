/**
 * services/family/familyHouseholdService.js
 * 
 * Domain Service for Household and Membership Lifecycle.
 * Enforces authoritative membership mapping, multi-household support, and person preservation.
 */

import { FamilyRepository } from './familyRepository.js';
import {
    createEmptyHousehold,
    createEmptyMembership,
    HouseholdRole,
    HouseholdStatus,
    MembershipStatus,
    assertSafeNumbers
} from './familyContracts.js';

export const FamilyHouseholdService = {
    /**
     * Create a new Household container
     */
    async createHousehold(data = {}) {
        const household = createEmptyHousehold(data);
        assertSafeNumbers(household);
        return await FamilyRepository.upsertHousehold(household);
    },

    /**
     * Update an existing Household
     */
    async updateHousehold(id, updates = {}) {
        if (!id) throw new Error('Household id is required for update');
        const existing = await FamilyRepository.getHousehold(id);
        if (!existing) throw new Error(`Household with id '${id}' not found`);

        const merged = {
            ...existing,
            ...updates,
            id: existing.id // Immutable id
        };

        assertSafeNumbers(merged);
        return await FamilyRepository.upsertHousehold(merged);
    },

    /**
     * Delete a Household:
     * Removes/unassigns all memberships, deletes the household, but PRESERVES Person entities!
     */
    async deleteHousehold(id) {
        if (!id) throw new Error('Household id is required for delete');
        return await FamilyRepository.deleteHousehold(id);
    },

    /**
     * Get household by id with derived member projection
     */
    async getHousehold(id) {
        return await FamilyRepository.getHousehold(id);
    },

    /**
     * List all households
     */
    async listHouseholds(filters = {}) {
        return await FamilyRepository.listHouseholds(filters);
    },

    /**
     * Add a Person to a Household (Create Membership)
     */
    async addMemberToHousehold({ householdId, personId, role = HouseholdRole.MEMBER, status = MembershipStatus.ACTIVE }) {
        if (!householdId) throw new Error('householdId is required');
        if (!personId) throw new Error('personId is required');

        // Check if person and household exist
        const [household, person] = await Promise.all([
            FamilyRepository.getHousehold(householdId),
            FamilyRepository.getPerson(personId)
        ]);

        if (!household) throw new Error(`Household with id '${householdId}' does not exist`);
        if (!person) throw new Error(`Person with id '${personId}' does not exist`);

        // Check for existing active or provisional membership in this household
        const existingMemberships = await FamilyRepository.listMemberships({ householdId, personId });
        const duplicate = existingMemberships.find(m => m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION);
        if (duplicate) {
            throw new Error(`Person '${personId}' already has an active or provisional membership in household '${householdId}'`);
        }

        const membership = createEmptyMembership({
            householdId,
            personId,
            role,
            status
        });

        assertSafeNumbers(membership);
        return await FamilyRepository.upsertMembership(membership);
    },

    async addMember(params) {
        return await this.addMemberToHousehold(params);
    },

    /**
     * Update membership role (e.g. from MEMBER to HEAD or PARTNER)
     */
    async updateMembershipRole(membershipId, newRole) {
        if (!membershipId) throw new Error('membershipId is required');
        if (!Object.values(HouseholdRole).includes(newRole)) {
            throw new Error(`Invalid HouseholdRole: ${newRole}`);
        }

        const membership = await FamilyRepository.getMembership(membershipId);
        if (!membership) throw new Error(`Membership with id '${membershipId}' not found`);

        const updated = {
            ...membership,
            role: newRole
        };

        assertSafeNumbers(updated);
        return await FamilyRepository.upsertMembership(updated);
    },

    /**
     * Archive/Remove membership (unassign member from household)
     */
    async archiveMembership(membershipId) {
        if (!membershipId) throw new Error('membershipId is required');
        const membership = await FamilyRepository.getMembership(membershipId);
        if (!membership) throw new Error(`Membership with id '${membershipId}' not found`);

        const updated = {
            ...membership,
            status: MembershipStatus.ARCHIVED,
            leftAt: new Date().toISOString()
        };

        assertSafeNumbers(updated);
        return await FamilyRepository.upsertMembership(updated);
    },

    /**
     * Confirm a provisional membership
     */
    async confirmProvisionalMembership(membershipId) {
        if (!membershipId) throw new Error('membershipId is required');
        const membership = await FamilyRepository.getMembership(membershipId);
        if (!membership) throw new Error(`Membership with id '${membershipId}' not found`);

        if (membership.status !== MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION) {
            throw new Error(`Membership is not in provisional status: ${membership.status}`);
        }

        const updated = {
            ...membership,
            status: MembershipStatus.ACTIVE
        };

        assertSafeNumbers(updated);
        return await FamilyRepository.upsertMembership(updated);
    },

    /**
     * Get Household with fully populated Member profiles
     * Distinguishes confirmed active members from unconfirmed provisional members
     */
    async getHouseholdWithMembers(householdId) {
        const household = await FamilyRepository.getHousehold(householdId);
        if (!household) return null;

        const memberships = await FamilyRepository.listMemberships({ householdId });
        const allPeople = await FamilyRepository.listPeople({ includeArchived: true });
        const peopleMap = new Map(allPeople.map(p => [p.id, p]));

        const confirmedMembers = [];
        const provisionalMembers = [];
        const archivedMembers = [];

        for (const m of memberships) {
            const person = peopleMap.get(m.personId);
            if (!person) continue;

            const memberCard = {
                membershipId: m.id,
                personId: person.id,
                fullName: person.fullName,
                preferredName: person.preferredName,
                gender: person.gender,
                dob: person.dob,
                role: m.role,
                status: m.status,
                joinedAt: m.joinedAt,
                leftAt: m.leftAt,
                person: { ...person }
            };

            if (m.status === MembershipStatus.ACTIVE) {
                confirmedMembers.push(memberCard);
            } else if (m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION) {
                provisionalMembers.push(memberCard);
            } else if (m.status === MembershipStatus.ARCHIVED) {
                archivedMembers.push(memberCard);
            }
        }

        return {
            ...household,
            members: [...confirmedMembers, ...provisionalMembers],
            confirmedMembers,
            provisionalMembers,
            archivedMembers,
            confirmedCount: confirmedMembers.length,
            provisionalCount: provisionalMembers.length
        };
    },

    /**
     * List memberships with optional filter
     */
    async listMemberships(filters = {}) {
        return await FamilyRepository.listMemberships(filters);
    },

    /**
     * Get all memberships for a specific person across all households
     */
    async getMembershipsForPerson(personId) {
        if (!personId) throw new Error('personId is required');
        return await FamilyRepository.listMemberships({ personId });
    }
};
