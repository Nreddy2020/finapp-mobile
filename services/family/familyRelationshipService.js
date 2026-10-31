/**
 * services/family/familyRelationshipService.js
 * 
 * Domain Service for Interpersonal Canonical Directed Relationships.
 * Stores one canonical edge and derives reciprocal display edges.
 */

import { FamilyRepository } from './familyRepository.js';
import {
    createEmptyRelationship,
    getReciprocalRelationshipType,
    RelationshipStatus,
    assertSafeNumbers
} from './familyContracts.js';

export const FamilyRelationshipService = {
    /**
     * Link two people with a canonical directed relationship
     */
    async linkRelationship({ fromPersonId, toPersonId, type, status = RelationshipStatus.ACTIVE }) {
        if (!fromPersonId) throw new Error('fromPersonId is required');
        if (!toPersonId) throw new Error('toPersonId is required');
        if (fromPersonId === toPersonId) {
            throw new Error('Self-relationship is not permitted');
        }

        // Verify both people exist
        const [fromPerson, toPerson] = await Promise.all([
            FamilyRepository.getPerson(fromPersonId),
            FamilyRepository.getPerson(toPersonId)
        ]);

        if (!fromPerson) throw new Error(`Person with fromPersonId '${fromPersonId}' does not exist`);
        if (!toPerson) throw new Error(`Person with toPersonId '${toPersonId}' does not exist`);

        // Check for existing relationship in either canonical or reverse form
        const existing = await FamilyRepository.listRelationships();
        const duplicate = existing.find(r => 
            (r.fromPersonId === fromPersonId && r.toPersonId === toPersonId) ||
            (r.fromPersonId === toPersonId && r.toPersonId === fromPersonId && r.type === getReciprocalRelationshipType(type))
        );

        if (duplicate) {
            // Idempotent update
            const updated = {
                ...duplicate,
                type: duplicate.fromPersonId === fromPersonId ? type : getReciprocalRelationshipType(type),
                status
            };
            assertSafeNumbers(updated);
            return await FamilyRepository.upsertRelationship(updated);
        }

        const rel = createEmptyRelationship({
            fromPersonId,
            toPersonId,
            type,
            status
        });

        assertSafeNumbers(rel);
        return await FamilyRepository.upsertRelationship(rel);
    },

    /**
     * List all relationships involving a specific person, deriving reciprocal type for incoming edges
     */
    async getRelationshipsForPerson(personId) {
        if (!personId) throw new Error('personId is required');

        const [person, allRels, allPeople] = await Promise.all([
            FamilyRepository.getPerson(personId),
            FamilyRepository.listRelationships(personId),
            FamilyRepository.listPeople({ includeArchived: true })
        ]);

        if (!person) throw new Error(`Person with id '${personId}' not found`);
        const peopleMap = new Map(allPeople.map(p => [p.id, p]));

        return allRels.map(r => {
            const isOutgoing = r.fromPersonId === personId;
            const targetPersonId = isOutgoing ? r.toPersonId : r.fromPersonId;
            const targetPerson = peopleMap.get(targetPersonId);

            const displayType = isOutgoing 
                ? r.type 
                : getReciprocalRelationshipType(r.type, person.gender);

            return {
                id: r.id,
                personId,
                relatedPersonId: targetPersonId,
                relatedPersonName: targetPerson ? targetPerson.fullName : 'Unknown',
                relationshipType: displayType,
                isCanonicalDirection: isOutgoing,
                status: r.status,
                createdAt: r.createdAt
            };
        });
    },

    /**
     * Delete a canonical relationship
     */
    async deleteRelationship(id) {
        if (!id) throw new Error('Relationship id is required for delete');
        return await FamilyRepository.deleteRelationship(id);
    }
};
