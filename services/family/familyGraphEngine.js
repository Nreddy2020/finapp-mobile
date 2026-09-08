/**
 * FinLife Family Graph Engine
 * Canonical relationship edges, reciprocal projections, type-specific cycle validation,
 * tree matrix generation, and connection synthesis.
 * Conforms to FinLife Family Operating System Scope V1 (Phase 2).
 */

import {
    RelationshipType,
    FamilyRole,
    FamilyStatus,
    RelationshipValidationResult,
    HIERARCHICAL_RELATIONSHIPS
} from './familyContracts.js';

export const RECIPROCAL_RELATIONSHIP_MAP = Object.freeze({
    [RelationshipType.SPOUSE_OF]: RelationshipType.SPOUSE_OF,
    [RelationshipType.CHILD_OF]: RelationshipType.PARENT_OF,
    [RelationshipType.PARENT_OF]: RelationshipType.CHILD_OF,
    [RelationshipType.SIBLING_OF]: RelationshipType.SIBLING_OF,
    [RelationshipType.GRANDPARENT_OF]: RelationshipType.GRANDCHILD_OF,
    [RelationshipType.GRANDCHILD_OF]: RelationshipType.GRANDPARENT_OF,
    [RelationshipType.GUARDIAN_OF]: RelationshipType.WARD_OF,
    [RelationshipType.WARD_OF]: RelationshipType.GUARDIAN_OF,
    [RelationshipType.CARE_PROVIDER_FOR]: RelationshipType.CARE_RECEIVER_FROM,
    [RelationshipType.CARE_RECEIVER_FROM]: RelationshipType.CARE_PROVIDER_FOR,
    [RelationshipType.DEPENDENT_OF]: RelationshipType.PROVIDER_FOR,
    [RelationshipType.PROVIDER_FOR]: RelationshipType.DEPENDENT_OF,
    [RelationshipType.DOCTOR_OF]: RelationshipType.PATIENT_OF,
    [RelationshipType.PATIENT_OF]: RelationshipType.DOCTOR_OF,
    [RelationshipType.ADVISOR_OF]: RelationshipType.CLIENT_OF,
    [RelationshipType.CLIENT_OF]: RelationshipType.ADVISOR_OF,
    [RelationshipType.TEACHER_OF]: RelationshipType.STUDENT_OF,
    [RelationshipType.STUDENT_OF]: RelationshipType.TEACHER_OF,
    [RelationshipType.FRIEND_OF]: RelationshipType.FRIEND_OF,
    [RelationshipType.OTHER]: RelationshipType.OTHER
});

export function getReciprocalRelationshipType(relType) {
    return RECIPROCAL_RELATIONSHIP_MAP[relType] || RelationshipType.OTHER;
}

/**
 * Validate a relationship edge before insertion or update.
 * Enforces type-specific validation:
 * - Rejects SELF_LINK
 * - Rejects DUPLICATE_RELATIONSHIP
 * - Rejects RECIPROCAL_CONFLICT
 * - Rejects ANCESTOR_CYCLE for hierarchical relationships (PARENT_OF, CHILD_OF, GUARDIAN_OF, etc.)
 * - Permits social graph cycles for non-hierarchical relationships (SPOUSE_OF, SIBLING_OF, FRIEND_OF)
 */
export function validateRelationshipEdge(newEdge, existingEdges = []) {
    const { fromPersonId, toPersonId, relationshipType } = newEdge || {};

    if (!fromPersonId || !toPersonId) {
        return {
            isValid: false,
            code: RelationshipValidationResult.INVALID_RELATIONSHIP_TYPE,
            reason: 'Both fromPersonId and toPersonId are required.'
        };
    }

    if (fromPersonId === toPersonId) {
        return {
            isValid: false,
            code: RelationshipValidationResult.SELF_LINK,
            reason: 'Self-relationships are not allowed.'
        };
    }

    if (!Object.values(RelationshipType).includes(relationshipType)) {
        return {
            isValid: false,
            code: RelationshipValidationResult.INVALID_RELATIONSHIP_TYPE,
            reason: `Invalid relationship type: ${relationshipType}`
        };
    }

    // 1. Check for duplicate identical edge
    const isDuplicate = existingEdges.some(
        e => e.id !== newEdge.id &&
             e.fromPersonId === fromPersonId &&
             e.toPersonId === toPersonId &&
             e.relationshipType === relationshipType
    );
    if (isDuplicate) {
        return {
            isValid: false,
            code: RelationshipValidationResult.DUPLICATE_RELATIONSHIP,
            reason: 'An identical relationship edge already exists.'
        };
    }

    // 2. Check for reciprocal conflict (e.g. A is recorded as SPOUSE_OF B, cannot also be CHILD_OF B)
    const conflictingReverse = existingEdges.find(
        e => e.id !== newEdge.id &&
             ((e.fromPersonId === toPersonId && e.toPersonId === fromPersonId) ||
              (e.fromPersonId === fromPersonId && e.toPersonId === toPersonId))
    );

    if (conflictingReverse) {
        const expectedReciprocal = getReciprocalRelationshipType(conflictingReverse.relationshipType);
        if (conflictingReverse.fromPersonId === toPersonId) {
            // Reverse edge exists. Check if current edge contradicts expected reciprocal
            if (relationshipType !== expectedReciprocal &&
                (HIERARCHICAL_RELATIONSHIPS.includes(relationshipType) ||
                 HIERARCHICAL_RELATIONSHIPS.includes(conflictingReverse.relationshipType))) {
                return {
                    isValid: false,
                    code: RelationshipValidationResult.RECIPROCAL_CONFLICT,
                    reason: `Contradictory relationship: entity already has reciprocal type ${conflictingReverse.relationshipType}.`
                };
            }
        }
    }

    // 3. Type-specific cycle checking for hierarchical relationships only
    if (HIERARCHICAL_RELATIONSHIPS.includes(relationshipType)) {
        // Generational Parent/Child loops
        if (relationshipType === RelationshipType.CHILD_OF) {
            if (isAncestorOf(fromPersonId, toPersonId, existingEdges, [RelationshipType.CHILD_OF], [RelationshipType.PARENT_OF])) {
                return {
                    isValid: false,
                    code: RelationshipValidationResult.ANCESTOR_CYCLE,
                    reason: 'Cycle detected: person cannot be a child of their own descendant.'
                };
            }
        } else if (relationshipType === RelationshipType.PARENT_OF) {
            if (isAncestorOf(toPersonId, fromPersonId, existingEdges, [RelationshipType.CHILD_OF], [RelationshipType.PARENT_OF])) {
                return {
                    isValid: false,
                    code: RelationshipValidationResult.ANCESTOR_CYCLE,
                    reason: 'Cycle detected: person cannot be a parent of their own ancestor.'
                };
            }
        } else if (relationshipType === RelationshipType.GUARDIAN_OF) {
            if (isAncestorOf(toPersonId, fromPersonId, existingEdges, [RelationshipType.WARD_OF], [RelationshipType.GUARDIAN_OF])) {
                return {
                    isValid: false,
                    code: RelationshipValidationResult.ANCESTOR_CYCLE,
                    reason: 'Cycle detected: guardian loop detected across designated ward chain.'
                };
            }
        } else if (relationshipType === RelationshipType.DEPENDENT_OF) {
            if (isAncestorOf(toPersonId, fromPersonId, existingEdges, [RelationshipType.DEPENDENT_OF], [RelationshipType.PROVIDER_FOR])) {
                return {
                    isValid: false,
                    code: RelationshipValidationResult.ANCESTOR_CYCLE,
                    reason: 'Cycle detected: mutual circular dependency is not permitted in hierarchical dependency chain.'
                };
            }
        }
    }

    return {
        isValid: true,
        code: RelationshipValidationResult.VALID,
        reason: 'Relationship edge is valid.'
    };
}

/**
 * Helper: checks if candidateAncestorId is already an ancestor of targetPersonId
 * traversing existing upward/downward hierarchical edges.
 */
function isAncestorOf(candidateAncestorId, targetPersonId, edges = [], upwardTypes = [], downwardTypes = [], visited = new Set()) {
    if (candidateAncestorId === targetPersonId) return true;
    if (visited.has(targetPersonId)) return false;
    visited.add(targetPersonId);

    // Find all immediate parents/ancestors of targetPersonId
    const parentsOfTarget = [];
    for (const e of edges) {
        if (e.fromPersonId === targetPersonId && upwardTypes.includes(e.relationshipType)) {
            parentsOfTarget.push(e.toPersonId);
        } else if (e.toPersonId === targetPersonId && downwardTypes.includes(e.relationshipType)) {
            parentsOfTarget.push(e.fromPersonId);
        }
    }

    for (const pId of parentsOfTarget) {
        if (pId === candidateAncestorId) return true;
        if (isAncestorOf(candidateAncestorId, pId, edges, upwardTypes, downwardTypes, visited)) return true;
    }

    return false;
}

/**
 * Get all relationships for a person, including projected reciprocal relationships.
 * Excludes archived or deleted persons if activePersonIds set is provided.
 */
export function getRelationshipsForPerson(personId, edges = [], activePersonIds = null) {
    const results = [];
    const seenEdgeKeys = new Set();

    for (const edge of edges) {
        if (edge.fromPersonId === personId) {
            if (activePersonIds && !activePersonIds.has(edge.toPersonId)) continue;
            const key = `${edge.fromPersonId}_${edge.relationshipType}_${edge.toPersonId}`;
            if (!seenEdgeKeys.has(key)) {
                seenEdgeKeys.add(key);
                results.push({
                    ...edge,
                    relatedPersonId: edge.toPersonId,
                    type: edge.relationshipType,
                    isReciprocal: false
                });
            }
        } else if (edge.toPersonId === personId) {
            if (activePersonIds && !activePersonIds.has(edge.fromPersonId)) continue;
            const reciprocalType = getReciprocalRelationshipType(edge.relationshipType);
            const key = `${personId}_${reciprocalType}_${edge.fromPersonId}`;
            if (!seenEdgeKeys.has(key)) {
                seenEdgeKeys.add(key);
                results.push({
                    id: `proj_${edge.id}`,
                    fromPersonId: personId,
                    toPersonId: edge.fromPersonId,
                    relationshipType: reciprocalType,
                    relatedPersonId: edge.fromPersonId,
                    type: reciprocalType,
                    isReciprocal: true,
                    originalEdgeId: edge.id,
                    notes: edge.notes || '',
                    emergencyPriority: edge.emergencyPriority || 1
                });
            }
        }
    }

    return results;
}

export function getParents(personId, edges = [], activePersonIds = null) {
    const rels = getRelationshipsForPerson(personId, edges, activePersonIds);
    return rels.filter(r => r.type === RelationshipType.CHILD_OF).map(r => r.relatedPersonId);
}

export function getChildren(personId, edges = [], activePersonIds = null) {
    const rels = getRelationshipsForPerson(personId, edges, activePersonIds);
    return rels.filter(r => r.type === RelationshipType.PARENT_OF).map(r => r.relatedPersonId);
}

export function getSpouse(personId, edges = [], activePersonIds = null) {
    const rels = getRelationshipsForPerson(personId, edges, activePersonIds);
    const spouseRel = rels.find(r => r.type === RelationshipType.SPOUSE_OF);
    return spouseRel ? spouseRel.relatedPersonId : null;
}

export function getSiblings(personId, edges = [], activePersonIds = null) {
    const rels = getRelationshipsForPerson(personId, edges, activePersonIds);
    return rels.filter(r => r.type === RelationshipType.SIBLING_OF).map(r => r.relatedPersonId);
}

/**
 * Validates person deletion and determines cascade impact on relationship edges.
 */
export function validatePersonDeletion(personId, edges = []) {
    if (!personId) {
        return { canDelete: false, cascadeCount: 0, affectedRelationshipIds: [], affectedPersonIds: [] };
    }
    const affectedEdges = edges.filter(e => e.fromPersonId === personId || e.toPersonId === personId);
    const affectedPersonIds = Array.from(new Set(
        affectedEdges.map(e => (e.fromPersonId === personId ? e.toPersonId : e.fromPersonId))
    ));

    return {
        canDelete: true,
        cascadeCount: affectedEdges.length,
        affectedRelationshipIds: affectedEdges.map(e => e.id),
        affectedPersonIds
    };
}

/**
 * Synthesizes all relational connections for a single person.
 * Used for rich Person Profile management.
 */
export function getPersonConnections(personId, persons = [], edges = [], households = []) {
    const personMap = new Map();
    persons.forEach(p => personMap.set(p.id || p.core?.id, p));

    const targetPerson = personMap.get(personId);
    if (!targetPerson) {
        return {
            directRelationships: [],
            householdCoHabitants: [],
            emergencyContacts: [],
            totalConnections: 0
        };
    }

    const rels = getRelationshipsForPerson(personId, edges);
    const directRelationships = rels.map(r => {
        const related = personMap.get(r.relatedPersonId);
        return {
            relationshipId: r.id,
            relatedPersonId: r.relatedPersonId,
            relatedPersonName: related?.name || related?.core?.name || 'Unknown',
            relatedPersonRole: related?.role || related?.core?.role || 'MEMBER',
            relationshipType: r.relationshipType,
            isReciprocal: Boolean(r.isReciprocal),
            sinceDate: r.sinceDate || null,
            notes: r.notes || ''
        };
    });

    // Co-habitants in the same household
    const hhId = targetPerson.householdId || targetPerson.core?.householdId;
    const householdCoHabitants = persons
        .filter(p => (p.id || p.core?.id) !== personId && (p.householdId || p.core?.householdId) === hhId)
        .map(p => ({
            id: p.id || p.core?.id,
            name: p.name || p.core?.name,
            role: p.role || p.core?.role,
            isDependent: Boolean(p.isDependent)
        }));

    // Emergency contacts
    const emergencyContacts = persons
        .filter(p => (p.emergencyProfile?.isEmergencyContact || p.isEmergencyContact) && (p.id || p.core?.id) !== personId)
        .map(p => ({
            id: p.id || p.core?.id,
            name: p.name || p.core?.name,
            priority: p.emergencyProfile?.priorityOrder || 1,
            phone: p.contact?.phone || 'No phone'
        }));

    return {
        directRelationships,
        householdCoHabitants,
        emergencyContacts,
        totalConnections: directRelationships.length + householdCoHabitants.length
    };
}

/**
 * Builds generation tree matrix grouping:
 * Tier -1: Elders (Grandparents/Parents)
 * Tier 0: Primary Adults (Head, Spouse, Adult Siblings)
 * Tier +1: Children (Children, Dependents)
 * Excludes archived or inactive people.
 */
export function buildFamilyTreeMatrix(persons = [], edges = []) {
    const activePersons = persons.filter(p => {
        const stat = p.core?.status || p.status;
        return stat !== FamilyStatus.ARCHIVED && stat !== FamilyStatus.INACTIVE && stat !== FamilyStatus.DELETED;
    });

    const activePersonIds = new Set(activePersons.map(p => p.core?.id || p.id));
    const personMap = new Map();
    activePersons.forEach(p => {
        const pId = p.core?.id || p.id;
        personMap.set(pId, p);
    });

    const elders = [];
    const adults = [];
    const children = [];
    const others = [];

    activePersons.forEach(p => {
        const pId = p.core?.id || p.id;
        const role = p.core?.role || p.role;
        const rels = getRelationshipsForPerson(pId, edges, activePersonIds);

        const isParentOfSomeone = rels.some(r => r.type === RelationshipType.PARENT_OF);
        const isChildOfSomeone = rels.some(r => r.type === RelationshipType.CHILD_OF);
        const parents = getParents(pId, edges, activePersonIds);
        const kids = getChildren(pId, edges, activePersonIds);

        if (role === FamilyRole.PARENT || role === FamilyRole.GRANDPARENT || (parents.length === 0 && kids.length > 0 && !rels.some(r => r.type === RelationshipType.SPOUSE_OF && (personMap.get(r.relatedPersonId)?.core?.role === FamilyRole.HEAD)))) {
            if (role === FamilyRole.PARENT || role === FamilyRole.GRANDPARENT) {
                elders.push(p);
            } else if (role === FamilyRole.CHILD) {
                children.push(p);
            } else {
                adults.push(p);
            }
        } else if (role === FamilyRole.CHILD || (isChildOfSomeone && !isParentOfSomeone && role !== FamilyRole.HEAD && role !== FamilyRole.SPOUSE)) {
            children.push(p);
        } else if (role === FamilyRole.HEAD || role === FamilyRole.SPOUSE || role === FamilyRole.MEMBER || role === FamilyRole.SIBLING) {
            adults.push(p);
        } else {
            others.push(p);
        }
    });

    const generationsRepresented =
        (elders.length > 0 ? 1 : 0) +
        (adults.length > 0 ? 1 : 0) +
        (children.length > 0 ? 1 : 0);

    const activeEdges = edges.filter(
        e => activePersonIds.has(e.fromPersonId) && activePersonIds.has(e.toPersonId)
    );

    return {
        tiers: [
            { id: 'TIER_ELDERS', label: 'Elders & Parents', generation: -1, members: elders },
            { id: 'TIER_ADULTS', label: 'Primary Generation', generation: 0, members: adults },
            { id: 'TIER_CHILDREN', label: 'Next Generation', generation: 1, members: children }
        ],
        others,
        stats: {
            eldersCount: elders.length,
            adultsCount: adults.length,
            childrenCount: children.length,
            othersCount: others.length,
            generationsRepresented,
            totalMembers: activePersons.length,
            totalRelationships: activeEdges.length
        },
        totalMembers: activePersons.length,
        totalRelationships: activeEdges.length
    };
}
