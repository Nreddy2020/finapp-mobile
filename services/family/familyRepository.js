/**
 * FinLife Family Repository
 * Atomic persistence layer with schema versioning, BigInt safety, households, and activity log.
 */

import { StorageService } from '../storage.js';
import { getFamilyDemoFixtures, isFamilyDemoModeEnabled } from './familyDemoFixtures.js';
import {
    createHousehold,
    createActivityRecord,
    maskSensitiveIdentifier,
    RelationshipType,
    FamilyStatus,
    RelationshipValidationResult
} from './familyContracts.js';
import { validateRelationshipEdge, validatePersonDeletion } from './familyGraphEngine.js';

export const FAMILY_STORAGE_KEY = 'finlife_family_data_v1';
export const CURRENT_SCHEMA_VERSION = 1;

function serializeBigInts(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') {
        return { __type: 'BigInt', value: obj.toString() };
    }
    if (Array.isArray(obj)) {
        return obj.map(serializeBigInts);
    }
    if (typeof obj === 'object') {
        const res = {};
        for (const [key, val] of Object.entries(obj)) {
            res[key] = serializeBigInts(val);
        }
        return res;
    }
    return obj;
}

function deserializeBigInts(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'object' && obj.__type === 'BigInt' && typeof obj.value === 'string') {
        try {
            return BigInt(obj.value);
        } catch {
            return 0n;
        }
    }
    if (Array.isArray(obj)) {
        return obj.map(deserializeBigInts);
    }
    if (typeof obj === 'object') {
        const res = {};
        for (const [key, val] of Object.entries(obj)) {
            res[key] = deserializeBigInts(val);
        }
        return res;
    }
    return obj;
}

function createEmptyEnvelope() {
    return {
        version: CURRENT_SCHEMA_VERSION,
        lastModified: new Date().toISOString(),
        data: {
            persons: [],
            relationships: [],
            policies: [],
            responsibilities: [],
            educationGoals: [],
            elderCarePlans: [],
            documents: [],
            households: [],
            activeHouseholdId: null,
            activityLog: []
        }
    };
}

export const FamilyRepository = {
    async loadFamilyEnvelope() {
        try {
            const raw = await StorageService.load(FAMILY_STORAGE_KEY);
            if (!raw || !raw.data) {
                if (isFamilyDemoModeEnabled()) {
                    const demoFixtures = getFamilyDemoFixtures();
                    if (demoFixtures) {
                        const demoEnvelope = {
                            version: CURRENT_SCHEMA_VERSION,
                            lastModified: new Date().toISOString(),
                            data: {
                                ...demoFixtures,
                                households: demoFixtures.households || [
                                    createHousehold({
                                        id: 'household_primary',
                                        name: 'Primary Household',
                                        isPrimary: true
                                    })
                                ],
                                activeHouseholdId: 'household_primary',
                                activityLog: demoFixtures.activityLog || []
                            }
                        };
                        await this.saveFamilyEnvelope(demoEnvelope);
                        return demoEnvelope;
                    }
                }
                const empty = createEmptyEnvelope();
                return empty;
            }

            const deserialized = deserializeBigInts(raw);
            const data = deserialized.data || {};
            data.persons = data.persons || [];
            data.relationships = data.relationships || [];
            data.policies = data.policies || [];
            data.responsibilities = data.responsibilities || [];
            data.educationGoals = data.educationGoals || [];
            data.elderCarePlans = data.elderCarePlans || [];
            data.documents = data.documents || [];
            data.households = data.households || [];
            data.activityLog = data.activityLog || [];

            // Safe household migration: ensure default household exists if persons exist
            if (data.households.length === 0 && data.persons.length > 0) {
                const defaultHh = createHousehold({
                    id: 'household_primary',
                    name: 'Primary Household',
                    headPersonId: data.persons.find(p => (p.core?.role || p.role) === 'HEAD')?.id || null,
                    memberPersonIds: data.persons.map(p => p.core?.id || p.id),
                    isPrimary: true
                });
                data.households.push(defaultHh);
                data.activeHouseholdId = defaultHh.id;
            } else if (data.households.length > 0 && !data.activeHouseholdId) {
                const prim = data.households.find(h => h.isPrimary) || data.households[0];
                data.activeHouseholdId = prim.id;
            }

            deserialized.data = data;
            return deserialized;
        } catch (err) {
            console.error('[FamilyRepository] Failed to load envelope:', err);
            return createEmptyEnvelope();
        }
    },

    async saveFamilyEnvelope(envelope) {
        try {
            const sanitized = {
                version: envelope.version || CURRENT_SCHEMA_VERSION,
                lastModified: new Date().toISOString(),
                data: envelope.data || {}
            };
            const serializable = serializeBigInts(sanitized);
            await StorageService.save(FAMILY_STORAGE_KEY, serializable);
            return true;
        } catch (err) {
            console.error('[FamilyRepository] Failed to save envelope:', err);
            throw err;
        }
    },

    async resetFamilyData() {
        const empty = createEmptyEnvelope();
        await this.saveFamilyEnvelope(empty);
        return empty.data;
    },

    async seedDemoDataIfEnabled() {
        if (!isFamilyDemoModeEnabled()) {
            return null;
        }
        const fixtures = getFamilyDemoFixtures();
        if (!fixtures) return null;
        const envelope = {
            version: CURRENT_SCHEMA_VERSION,
            lastModified: new Date().toISOString(),
            data: fixtures
        };
        await this.saveFamilyEnvelope(envelope);
        return envelope.data;
    },

    // --- Household Operations ---
    async getHouseholds() {
        const envelope = await this.loadFamilyEnvelope();
        return envelope.data?.households || [];
    },

    async getHouseholdById(id) {
        const households = await this.getHouseholds();
        return households.find(h => h.id === id) || null;
    },

    async getActiveHousehold() {
        const envelope = await this.loadFamilyEnvelope();
        const activeId = envelope.data?.activeHouseholdId;
        const households = envelope.data?.households || [];
        return households.find(h => h.id === activeId) || households[0] || null;
    },

    async setActiveHousehold(id) {
        const envelope = await this.loadFamilyEnvelope();
        const households = envelope.data?.households || [];
        const exists = households.some(h => h.id === id);
        if (!exists) {
            throw new Error(`Household with ID ${id} does not exist`);
        }
        envelope.data.activeHouseholdId = id;
        await this.saveFamilyEnvelope(envelope);
        return id;
    },

    async saveHousehold(household) {
        const envelope = await this.loadFamilyEnvelope();
        const households = [...(envelope.data.households || [])];
        const hhId = household.id || 'hh_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const record = createHousehold({ ...household, id: hhId });
        const idx = households.findIndex(h => h.id === hhId);
        if (idx >= 0) {
            households[idx] = record;
        } else {
            households.push(record);
        }
        envelope.data.households = households;
        if (!envelope.data.activeHouseholdId || record.isPrimary) {
            envelope.data.activeHouseholdId = record.id;
        }
        await this.saveFamilyEnvelope(envelope);
        await this.logFamilyActivity({
            actionType: 'HOUSEHOLD_SAVED',
            description: `Household ${record.name} saved`,
            sourceDomain: 'FAMILY',
            sourceRecordId: record.id
        });
        return record;
    },

    async deleteHousehold(id) {
        const envelope = await this.loadFamilyEnvelope();
        envelope.data.households = (envelope.data.households || []).filter(h => h.id !== id);
        if (envelope.data.activeHouseholdId === id) {
            envelope.data.activeHouseholdId = envelope.data.households[0]?.id || null;
        }
        await this.saveFamilyEnvelope(envelope);
        return true;
    },

    // --- Activity Log Operations ---
    async getFamilyActivityLog(limit = 20) {
        const envelope = await this.loadFamilyEnvelope();
        const logs = envelope.data?.activityLog || [];
        // Deterministic sort: descending by createdAt
        return logs
            .slice()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, limit);
    },

    async logFamilyActivity({
        actionType = '',
        description = '',
        actorPersonId = null,
        subjectPersonId = null,
        sourceDomain = 'FAMILY',
        sourceRecordId = null,
        metadata = {}
    }) {
        try {
            const envelope = await this.loadFamilyEnvelope();
            const logs = [...(envelope.data.activityLog || [])];
            const record = createActivityRecord({
                actionType,
                description,
                actorPersonId,
                subjectPersonId,
                sourceDomain,
                sourceRecordId,
                metadata
            });

            // Idempotency: avoid duplicate logs if same idempotencyKey already exists
            if (record.idempotencyKey && logs.some(l => l.idempotencyKey === record.idempotencyKey)) {
                return logs.find(l => l.idempotencyKey === record.idempotencyKey);
            }

            logs.push(record);
            // Cap at 100 entries to prevent unbounded storage
            envelope.data.activityLog = logs.slice(-100);
            await this.saveFamilyEnvelope(envelope);
            return record;
        } catch (err) {
            console.warn('[FamilyRepository] Failed to log activity:', err);
            return null;
        }
    },

    // --- Person CRUD ---
    async getPersons(filterFn = null) {
        const envelope = await this.loadFamilyEnvelope();
        const persons = envelope.data?.persons || [];
        return filterFn ? persons.filter(filterFn) : persons;
    },

    async getPersonById(id) {
        const persons = await this.getPersons();
        return persons.find(p => p.core?.id === id || p.id === id) || null;
    },

    async savePerson(person) {
        const envelope = await this.loadFamilyEnvelope();
        const persons = [...(envelope.data.persons || [])];
        const personId = person.core?.id || person.id;
        const idx = persons.findIndex(p => (p.core?.id || p.id) === personId);

        let safeMasked = null;
        if (person.nationalIdMasked || person.core?.nationalIdMasked) {
            safeMasked = maskSensitiveIdentifier(person.nationalIdMasked || person.core?.nationalIdMasked);
        }

        const updatedPerson = {
            ...person,
            id: personId,
            name: person.name || person.core?.name || '',
            role: person.role || person.familyRole || person.core?.role || 'MEMBER',
            familyRole: person.familyRole || person.role || person.core?.familyRole || 'MEMBER',
            circleCategory: person.circleCategory || person.relationshipCategory || person.core?.circleCategory || 'FAMILY',
            relationshipCategory: person.relationshipCategory || person.circleCategory || person.core?.relationshipCategory || 'FAMILY',
            householdId: person.householdId || person.core?.householdId || 'household_primary',
            nationalIdMasked: safeMasked,
            core: {
                ...(person.core || {}),
                id: personId,
                name: person.name || person.core?.name || '',
                nationalIdMasked: safeMasked,
                updatedAt: new Date().toISOString()
            }
        };

        const isNew = idx < 0;
        if (isNew) {
            persons.push(updatedPerson);
        } else {
            persons[idx] = updatedPerson;
        }

        // Add to active household members if not present
        if (envelope.data.households && envelope.data.households.length > 0) {
            const hh = envelope.data.households.find(h => h.id === updatedPerson.householdId) || envelope.data.households[0];
            if (hh && !hh.memberPersonIds.includes(personId)) {
                hh.memberPersonIds.push(personId);
            }
        }

        envelope.data.persons = persons;
        await this.saveFamilyEnvelope(envelope);

        await this.logFamilyActivity({
            actionType: isNew ? 'PERSON_CREATED' : 'PERSON_UPDATED',
            description: `${updatedPerson.name} (${updatedPerson.role}) ${isNew ? 'added to family' : 'profile updated'}`,
            subjectPersonId: personId,
            sourceDomain: 'FAMILY',
            sourceRecordId: personId
        });

        return updatedPerson;
    },

    async updatePerson(id, updates = {}) {
        const envelope = await this.loadFamilyEnvelope();
        const persons = [...(envelope.data.persons || [])];
        const idx = persons.findIndex(p => (p.core?.id || p.id) === id);
        if (idx < 0) {
            throw new Error(`Person with ID ${id} does not exist`);
        }

        const existing = persons[idx];
        let safeMasked = existing.nationalIdMasked;
        if (updates.nationalIdMasked !== undefined) {
            safeMasked = maskSensitiveIdentifier(updates.nationalIdMasked);
        }

        const updated = {
            ...existing,
            ...updates,
            id,
            nationalIdMasked: safeMasked,
            core: {
                ...(existing.core || {}),
                ...(updates.core || {}),
                id,
                nationalIdMasked: safeMasked,
                updatedAt: new Date().toISOString()
            },
            contact: {
                ...(existing.contact || {}),
                ...(updates.contact || {})
            },
            profile: {
                ...(existing.profile || {}),
                ...(updates.profile || {})
            },
            medicalProfile: {
                ...(existing.medicalProfile || {}),
                ...(updates.medicalProfile || {})
            },
            emergencyProfile: {
                ...(existing.emergencyProfile || {}),
                ...(updates.emergencyProfile || {})
            },
            legalTags: {
                ...(existing.legalTags || {}),
                ...(updates.legalTags || {})
            },
            privacy: {
                ...(existing.privacy || {}),
                ...(updates.privacy || {})
            }
        };

        if (updates.role || updates.familyRole) {
            const r = updates.familyRole || updates.role;
            updated.role = r;
            updated.familyRole = r;
            updated.core.role = r;
            updated.core.familyRole = r;
        }

        if (updates.circleCategory || updates.relationshipCategory) {
            const c = updates.relationshipCategory || updates.circleCategory;
            updated.circleCategory = c;
            updated.relationshipCategory = c;
            updated.core.circleCategory = c;
            updated.core.relationshipCategory = c;
        }

        // Household change synchronization
        if (updates.householdId && updates.householdId !== existing.householdId) {
            (envelope.data.households || []).forEach(h => {
                if (h.id === existing.householdId) {
                    h.memberPersonIds = (h.memberPersonIds || []).filter(mId => mId !== id);
                }
                if (h.id === updates.householdId) {
                    if (!h.memberPersonIds.includes(id)) {
                        h.memberPersonIds.push(id);
                    }
                }
            });
        }

        persons[idx] = updated;
        envelope.data.persons = persons;
        await this.saveFamilyEnvelope(envelope);

        await this.logFamilyActivity({
            actionType: 'PERSON_UPDATED',
            description: `${updated.name || updated.core?.name} profile updated`,
            subjectPersonId: id,
            sourceDomain: 'FAMILY',
            sourceRecordId: id
        });

        return updated;
    },

    async validatePersonDeletion(id) {
        const envelope = await this.loadFamilyEnvelope();
        const rels = envelope.data?.relationships || [];
        return validatePersonDeletion(id, rels);
    },

    async archivePerson(id) {
        const envelope = await this.loadFamilyEnvelope();
        const persons = envelope.data.persons || [];
        const person = persons.find(p => (p.core?.id || p.id) === id);
        if (!person) return false;
        person.status = 'ARCHIVED';
        if (person.core) person.core.status = 'ARCHIVED';
        await this.saveFamilyEnvelope(envelope);
        await this.logFamilyActivity({
            actionType: 'PERSON_ARCHIVED',
            description: `${person.name || person.core?.name} archived`,
            subjectPersonId: id,
            sourceDomain: 'FAMILY',
            sourceRecordId: id
        });
        return true;
    },

    async restorePerson(id) {
        const envelope = await this.loadFamilyEnvelope();
        const persons = envelope.data.persons || [];
        const person = persons.find(p => (p.core?.id || p.id) === id);
        if (!person) return false;
        person.status = 'ACTIVE';
        if (person.core) person.core.status = 'ACTIVE';
        await this.saveFamilyEnvelope(envelope);
        await this.logFamilyActivity({
            actionType: 'PERSON_RESTORED',
            description: `${person.name || person.core?.name} restored to active`,
            subjectPersonId: id,
            sourceDomain: 'FAMILY',
            sourceRecordId: id
        });
        return true;
    },

    async deletePerson(id) {
        const envelope = await this.loadFamilyEnvelope();
        const target = (envelope.data.persons || []).find(p => (p.core?.id || p.id) === id);
        envelope.data.persons = (envelope.data.persons || []).filter(p => (p.core?.id || p.id) !== id);
        envelope.data.relationships = (envelope.data.relationships || []).filter(
            r => r.fromPersonId !== id && r.toPersonId !== id
        );
        // Remove from households
        (envelope.data.households || []).forEach(h => {
            h.memberPersonIds = (h.memberPersonIds || []).filter(mId => mId !== id);
        });
        await this.saveFamilyEnvelope(envelope);

        if (target) {
            await this.logFamilyActivity({
                actionType: 'MEMBER_REMOVED',
                description: `${target.name || target.core?.name} removed from family`,
                subjectPersonId: id,
                sourceDomain: 'FAMILY',
                sourceRecordId: id
            });
        }
        return true;
    },

    // --- Relationship CRUD with Validation ---
    async getRelationships(filterFn = null) {
        const envelope = await this.loadFamilyEnvelope();
        const rels = envelope.data?.relationships || [];
        return filterFn ? rels.filter(filterFn) : rels;
    },

    async saveRelationship(rel) {
        const srcA = rel.fromPersonId || rel.personAId;
        const srcB = rel.toPersonId || rel.personBId;

        if (!srcA || !srcB) {
            throw new Error('Both fromPersonId and toPersonId are required for a relationship.');
        }

        if (srcA === srcB) {
            throw new Error('A person cannot form a relationship with themselves.');
        }

        const envelope = await this.loadFamilyEnvelope();
        const persons = envelope.data?.persons || [];
        const personA = persons.find(p => (p.core?.id || p.id) === srcA);
        const personB = persons.find(p => (p.core?.id || p.id) === srcB);

        if (!personA || !personB) {
            throw new Error('Both persons in a relationship must exist in the Family repository.');
        }

        if (personA.status === 'ARCHIVED' || personA.status === 'DELETED' ||
            personB.status === 'ARCHIVED' || personB.status === 'DELETED') {
            throw new Error('Cannot create relationships for archived or deleted persons.');
        }

        const rels = [...(envelope.data.relationships || [])];
        const relId = rel.id || 'rel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const validPriority = Number.isFinite(rel.emergencyPriority) ? Math.max(1, Math.min(5, Number(rel.emergencyPriority))) : 1;

        const record = {
            ...rel,
            id: relId,
            fromPersonId: srcA,
            toPersonId: srcB,
            personAId: srcA,
            personBId: srcB,
            relationshipType: rel.relationshipType || RelationshipType.OTHER,
            emergencyPriority: validPriority,
            sinceDate: rel.sinceDate || new Date().toISOString().split('T')[0],
            createdAt: rel.createdAt || new Date().toISOString()
        };

        // Graph validation: enforce type-specific cycle validation, self-link check, and duplicate check
        const validation = validateRelationshipEdge(record, rels);
        if (!validation.isValid) {
            const err = new Error(validation.reason);
            err.code = validation.code;
            throw err;
        }

        const idx = rels.findIndex(r => r.id === relId);
        const isNew = idx < 0;
        if (isNew) {
            rels.push(record);
        } else {
            rels[idx] = record;
        }

        envelope.data.relationships = rels;
        await this.saveFamilyEnvelope(envelope);

        await this.logFamilyActivity({
            actionType: isNew ? 'RELATIONSHIP_CREATED' : 'RELATIONSHIP_UPDATED',
            description: `Relationship ${record.relationshipType} linked between ${personA.name || personA.core?.name} and ${personB.name || personB.core?.name}`,
            actorPersonId: srcA,
            subjectPersonId: srcB,
            sourceDomain: 'FAMILY',
            sourceRecordId: relId
        });

        return record;
    },

    async deleteRelationship(id) {
        const envelope = await this.loadFamilyEnvelope();
        const target = (envelope.data.relationships || []).find(r => r.id === id);
        envelope.data.relationships = (envelope.data.relationships || []).filter(r => r.id !== id);
        await this.saveFamilyEnvelope(envelope);

        if (target) {
            await this.logFamilyActivity({
                actionType: 'RELATIONSHIP_DELETED',
                description: `Relationship ${target.relationshipType} unlinked between ${target.fromPersonId} and ${target.toPersonId}`,
                actorPersonId: target.fromPersonId,
                subjectPersonId: target.toPersonId,
                sourceDomain: 'FAMILY',
                sourceRecordId: id
            });
        }
        return true;
    },

    // --- Policy CRUD ---
    async getPolicies(filterFn = null) {
        const envelope = await this.loadFamilyEnvelope();
        const policies = envelope.data?.policies || [];
        return filterFn ? policies.filter(filterFn) : policies;
    },

    async getPolicyById(id) {
        const policies = await this.getPolicies();
        return policies.find(p => p.id === id) || null;
    },

    async savePolicy(policy) {
        const envelope = await this.loadFamilyEnvelope();
        const policies = [...(envelope.data.policies || [])];
        const polId = policy.id || 'pol_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const record = { ...policy, id: polId };
        const idx = policies.findIndex(p => p.id === polId);
        if (idx >= 0) {
            policies[idx] = record;
        } else {
            policies.push(record);
        }
        envelope.data.policies = policies;
        await this.saveFamilyEnvelope(envelope);
        return record;
    },

    async deletePolicy(id) {
        const envelope = await this.loadFamilyEnvelope();
        envelope.data.policies = (envelope.data.policies || []).filter(p => p.id !== id);
        await this.saveFamilyEnvelope(envelope);
        return true;
    },

    // --- Responsibility CRUD ---
    async getResponsibilities(filterFn = null) {
        const envelope = await this.loadFamilyEnvelope();
        const resps = envelope.data?.responsibilities || [];
        return filterFn ? resps.filter(filterFn) : resps;
    },

    async getResponsibilityById(id) {
        const resps = await this.getResponsibilities();
        return resps.find(r => r.id === id) || null;
    },

    async saveResponsibility(resp) {
        const envelope = await this.loadFamilyEnvelope();
        const resps = [...(envelope.data.responsibilities || [])];
        const respId = resp.id || 'resp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const record = { ...resp, id: respId };
        const idx = resps.findIndex(r => r.id === respId);
        const isNew = idx < 0;
        if (isNew) {
            resps.push(record);
        } else {
            resps[idx] = record;
        }
        envelope.data.responsibilities = resps;
        await this.saveFamilyEnvelope(envelope);

        await this.logFamilyActivity({
            actionType: isNew ? 'TASK_CREATED' : (record.status === 'COMPLETED' ? 'TASK_COMPLETED' : 'TASK_UPDATED'),
            description: `Task "${record.title}" ${isNew ? 'created' : (record.status === 'COMPLETED' ? 'marked completed' : 'updated')}`,
            sourceDomain: 'FAMILY',
            sourceRecordId: respId
        });

        return record;
    },

    async deleteResponsibility(id) {
        const envelope = await this.loadFamilyEnvelope();
        envelope.data.responsibilities = (envelope.data.responsibilities || []).filter(r => r.id !== id);
        await this.saveFamilyEnvelope(envelope);
        return true;
    },

    // --- Education Goals CRUD ---
    async getEducationGoals(filterFn = null) {
        const envelope = await this.loadFamilyEnvelope();
        const goals = envelope.data?.educationGoals || [];
        return filterFn ? goals.filter(filterFn) : goals;
    },

    async saveEducationGoal(goal) {
        const envelope = await this.loadFamilyEnvelope();
        const goals = [...(envelope.data.educationGoals || [])];
        const goalId = goal.id || 'edu_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const record = { ...goal, id: goalId };
        const idx = goals.findIndex(g => g.id === goalId);
        if (idx >= 0) {
            goals[idx] = record;
        } else {
            goals.push(record);
        }
        envelope.data.educationGoals = goals;
        await this.saveFamilyEnvelope(envelope);
        return record;
    },

    async deleteEducationGoal(id) {
        const envelope = await this.loadFamilyEnvelope();
        envelope.data.educationGoals = (envelope.data.educationGoals || []).filter(g => g.id !== id);
        await this.saveFamilyEnvelope(envelope);
        return true;
    },

    // --- Elder Care Plans CRUD ---
    async getElderCarePlans(filterFn = null) {
        const envelope = await this.loadFamilyEnvelope();
        const plans = envelope.data?.elderCarePlans || [];
        return filterFn ? plans.filter(filterFn) : plans;
    },

    async saveElderCarePlan(plan) {
        const envelope = await this.loadFamilyEnvelope();
        const plans = [...(envelope.data.elderCarePlans || [])];
        const planId = plan.id || 'elder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const record = { ...plan, id: planId };
        const idx = plans.findIndex(p => p.id === planId);
        if (idx >= 0) {
            plans[idx] = record;
        } else {
            plans.push(record);
        }
        envelope.data.elderCarePlans = plans;
        await this.saveFamilyEnvelope(envelope);
        return record;
    },

    async deleteElderCarePlan(id) {
        const envelope = await this.loadFamilyEnvelope();
        envelope.data.elderCarePlans = (envelope.data.elderCarePlans || []).filter(p => p.id !== id);
        await this.saveFamilyEnvelope(envelope);
        return true;
    },

    // --- Documents CRUD ---
    async getDocuments(filterFn = null) {
        const envelope = await this.loadFamilyEnvelope();
        const docs = envelope.data?.documents || [];
        return filterFn ? docs.filter(filterFn) : docs;
    },

    async saveDocument(doc) {
        const envelope = await this.loadFamilyEnvelope();
        const docs = [...(envelope.data.documents || [])];
        const docId = doc.id || 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
        const record = { ...doc, id: docId };
        const idx = docs.findIndex(d => d.id === docId);
        if (idx >= 0) {
            docs[idx] = record;
        } else {
            docs.push(record);
        }
        envelope.data.documents = docs;
        await this.saveFamilyEnvelope(envelope);
        return record;
    },

    async deleteDocument(id) {
        const envelope = await this.loadFamilyEnvelope();
        envelope.data.documents = (envelope.data.documents || []).filter(d => d.id !== id);
        await this.saveFamilyEnvelope(envelope);
        return true;
    }
};

