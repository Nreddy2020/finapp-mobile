/**
 * services/family/familyRepository.js
 * 
 * Authoritative Repository for Family OS Phase 1.
 * Enforces atomic storage persistence, foreign key integrity, and derived projections.
 */

import { StorageService, STORAGE_KEYS } from '../storage.js';
import {
    validatePerson,
    validateHousehold,
    validateMembership,
    validateRelationship,
    validateTrustedCircleEntry,
    validateDocument,
    validateResponsibility,
    validateTask,
    validateEmergencyContact,
    validateProtectionItem,
    validateFinancialLink,
    PersonStatus,
    HouseholdStatus,
    MembershipStatus,
    RelationshipStatus,
    DocumentStatus,
    ResponsibilityStatus,
    TaskStatus,
    TaskRecurrence,
    ProtectionStatus,
    EmergencyContactType
} from './familyContracts.js';

class FamilyRepositoryClass {
    constructor() {
        this._inMemory = null;
        this._isTestMode = false;
        this._mutationQueue = Promise.resolve();
        // Public mutations have no nested mutation calls. Serialize read/modify/commit.
        for (const name of Object.getOwnPropertyNames(FamilyRepositoryClass.prototype)) {
            if (/^(upsert|delete|archive|save|link|unlink|relink|reorder|atomic|commit|createHouseholdWithMember|addPersonToHousehold)/.test(name)) {
                const method = this[name].bind(this);
                this[name] = (...args) => {
                    const result = this._mutationQueue.then(() => method(...args));
                    this._mutationQueue = result.catch(() => {});
                    return result;
                };
            }
        }
    }

    /**
     * Test mode toggle for hermetic unit testing without filesystem writes
     */
    setTestMode(enabled = true) {
        this._isTestMode = !!enabled;
        if (this._isTestMode) {
            if (!this._inMemory) {
                this._resetInMemory();
            }
        } else {
            // Evict test memory so production code loads authoritative storage
            this._inMemory = null;
        }
    }

    isTestModeActive() {
        return this._isTestMode;
    }

    _resetInMemory() {
        this._inMemory = {
            people: new Map(),
            households: new Map(),
            memberships: new Map(),
            relationships: new Map(),
            trustedCircle: new Map(),
            documents: new Map(),
            responsibilities: new Map(),
            tasks: new Map(),
            emergencyContacts: new Map(),
            protectionItems: new Map(),
            financialLinks: new Map(),
            budgetPools: new Map(),
            forecastScenarios: new Map(),
            memberIncomeStreams: new Map(),
            goals: new Map()
        };
    }

    /**
     * Create an isolated deep clone of store Maps for candidate atomic mutations
     */
    _cloneStore(store) {
        return {
            people: new Map(Array.from(store.people.entries()).map(([k, v]) => [k, { ...v }])),
            households: new Map(Array.from(store.households.entries()).map(([k, v]) => [k, { ...v }])),
            memberships: new Map(Array.from(store.memberships.entries()).map(([k, v]) => [k, { ...v }])),
            relationships: new Map(Array.from(store.relationships.entries()).map(([k, v]) => [k, { ...v }])),
            trustedCircle: new Map(Array.from(store.trustedCircle.entries()).map(([k, v]) => [k, { ...v }])),
            documents: new Map(Array.from(store.documents.entries()).map(([k, v]) => [k, { ...v }])),
            responsibilities: new Map(Array.from(store.responsibilities.entries()).map(([k, v]) => [k, { ...v }])),
            tasks: new Map(Array.from(store.tasks.entries()).map(([k, v]) => [k, { ...v }])),
            emergencyContacts: new Map(Array.from(store.emergencyContacts.entries()).map(([k, v]) => [k, { ...v }])),
            protectionItems: new Map(Array.from(store.protectionItems.entries()).map(([k, v]) => [k, { ...v }])),
            financialLinks: new Map(Array.from(store.financialLinks ? store.financialLinks.entries() : []).map(([k, v]) => [k, { ...v }])),
            budgetPools: new Map(Array.from(store.budgetPools ? store.budgetPools.entries() : []).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])),
            forecastScenarios: new Map(Array.from(store.forecastScenarios ? store.forecastScenarios.entries() : []).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])),
            memberIncomeStreams: new Map(Array.from(store.memberIncomeStreams ? store.memberIncomeStreams.entries() : []).map(([k, v]) => [k, { ...v }])),
            goals: new Map(Array.from(store.goals ? store.goals.entries() : []).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))]))
        };
    }

    /**
     * Internal state initializer loading from storage or test memory
     */
    async _loadStore() {
        if (this._isTestMode && this._inMemory) {
            return this._inMemory;
        }

        try {
            const snapshot = await StorageService.load(STORAGE_KEYS.FAMILY_SNAPSHOT, null, { strict: true });
            if (snapshot !== null) {
                if (snapshot.version !== 2 || !snapshot.collections) throw new Error('Unsupported Family data format');
                const store = {};
                for (const key of Object.keys(this._cloneStoreSkeleton())) {
                    const rows = snapshot.collections[key];
                    if (!Array.isArray(rows) || rows.some(row => !row || typeof row.id !== 'string')) throw new Error('Invalid Family collection: ' + key);
                    store[key] = new Map(rows.map(row => [row.id, row]));
                }
                this._inMemory = store;
                return store;
            }
            const [
                rawPeople,
                rawHouseholds,
                rawMemberships,
                rawRelationships,
                rawTrusted,
                rawDocs,
                rawResp,
                rawTasks,
                rawEmc,
                rawProt,
                rawFinLinks,
                rawBudgetPools,
                rawScenarios,
                rawGoals
            ] = await Promise.all([
                StorageService.load(STORAGE_KEYS.FAMILY_PEOPLE, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_HOUSEHOLDS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_MEMBERSHIPS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_RELATIONSHIPS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_TRUSTED_CIRCLE, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_DOCUMENTS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_RESPONSIBILITIES, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_TASKS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_EMERGENCY_CONTACTS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_PROTECTION_ITEMS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_FINANCIAL_LINKS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_BUDGET_POOLS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_FORECAST_SCENARIOS, [], { strict: true }),
                StorageService.load(STORAGE_KEYS.FAMILY_GOALS, [], { strict: true })
            ]);

            const ensureArray = raw => {
                if (!Array.isArray(raw) || raw.some(item => !item || typeof item.id !== 'string')) throw new Error('Invalid saved Family records');
                return raw;
            };

            const store = {
                people: new Map(ensureArray(rawPeople).map(p => [p.id, p])),
                households: new Map(ensureArray(rawHouseholds).map(h => [h.id, h])),
                memberships: new Map(ensureArray(rawMemberships).map(m => [m.id, m])),
                relationships: new Map(ensureArray(rawRelationships).map(r => [r.id, r])),
                trustedCircle: new Map(ensureArray(rawTrusted).map(t => [t.id, t])),
                documents: new Map(ensureArray(rawDocs).map(d => [d.id, d])),
                responsibilities: new Map(ensureArray(rawResp).map(r => [r.id, r])),
                tasks: new Map(ensureArray(rawTasks).map(t => [t.id, t])),
                emergencyContacts: new Map(ensureArray(rawEmc).map(c => [c.id, c])),
                protectionItems: new Map(ensureArray(rawProt).map(p => [p.id, p])),
                financialLinks: new Map(ensureArray(rawFinLinks).map(fl => [fl.id, fl])),
                budgetPools: new Map(ensureArray(rawBudgetPools).map(bp => [bp.id, bp])),
                forecastScenarios: new Map(ensureArray(rawScenarios).map(sc => [sc.id, sc])),
                memberIncomeStreams: new Map(),
                goals: new Map(ensureArray(rawGoals).map(g => [g.id, g]))
            };

            this._inMemory = store;
            return store;
        } catch (err) {
            throw new Error('Family data could not be loaded. Saved data has not been replaced. ' + err.message);
        }
    }

    /**
     * Atomically commit an entire candidate store
     */
    async commitStore(candidateStore) {
        if (!candidateStore || !candidateStore.people) {
            throw new Error('Invalid candidate store provided for commit');
        }
        await this._persistStore(candidateStore);
        return true;
    }

    /**
     * Persist candidate store to authoritative storage with rollback guarantee.
     * In-memory cache is ONLY committed after all storage writes succeed.
     */
    async _persistStore(candidateStore) {
        if (this._isTestMode) {
            this._inMemory = candidateStore;
            return true;
        }

        const collections = {};
        for (const [name, records] of Object.entries(candidateStore)) {
            collections[name] = Array.from(records.values()).map(record => {
                if (name !== 'households') return record;
                const { memberIds, activeMemberIds, provisionalMemberIds, ...clean } = record;
                return clean;
            });
        }
        const result = await StorageService.save(STORAGE_KEYS.FAMILY_SNAPSHOT, { version: 2, collections }, { atomic: true });
        if (!result?.success) throw new Error('Family save failed. Please retry. ' + (result?.error?.message || ''));
        this._inMemory = candidateStore;
        return true;
    }

    _cloneStoreSkeleton() {
        return Object.fromEntries(['people','households','memberships','relationships','trustedCircle','documents','responsibilities','tasks','emergencyContacts','protectionItems','financialLinks','budgetPools','forecastScenarios','memberIncomeStreams','goals'].map(key => [key, new Map()]));
    }

    async createHouseholdWithMember(household, person, membership) {
        validateHousehold(household); validatePerson(person); validateMembership(membership);
        const candidate = this._cloneStore(await this._loadStore());
        if (candidate.households.has(household.id)) throw new Error('Household already exists');
        if (membership.householdId !== household.id || membership.personId !== person.id) throw new Error('Membership does not match');
        candidate.households.set(household.id, household);
        if (!candidate.people.has(person.id)) candidate.people.set(person.id, person);
        candidate.memberships.set(membership.id, membership);
        await this._persistStore(candidate);
        return household;
    }

    async addPersonToHousehold(person, membership) {
        validatePerson(person); validateMembership(membership);
        const candidate = this._cloneStore(await this._loadStore());
        if (!candidate.households.has(membership.householdId) || membership.personId !== person.id) throw new Error('Invalid household membership');
        if ([...candidate.memberships.values()].some(m => m.householdId === membership.householdId && m.personId === person.id && m.status !== 'ARCHIVED')) throw new Error('This person already belongs to the household');
        if (!candidate.people.has(person.id)) candidate.people.set(person.id, person);
        candidate.memberships.set(membership.id, membership);
        await this._persistStore(candidate);
        return membership;
    }

    // -------------------------------------------------------------
    // PERSON CRUD
    // -------------------------------------------------------------

    async listPeople(filters = {}) {
        const store = await this._loadStore();
        let list = Array.from(store.people.values());

        if (filters.status) {
            list = list.filter(p => p.status === filters.status);
        } else if (!filters.includeArchived) {
            list = list.filter(p => p.status !== PersonStatus.ARCHIVED);
        }

        return list.map(p => ({ ...p }));
    }

    async getPerson(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const person = store.people.get(id);
        return person ? { ...person } : null;
    }

    async upsertPerson(person) {
        validatePerson(person);
        const store = await this._loadStore();
        const now = new Date().toISOString();
        const existing = store.people.get(person.id);

        const cleanPerson = {
            ...person,
            updatedAt: now,
            createdAt: existing ? existing.createdAt : (person.createdAt || now)
        };

        store.people.set(cleanPerson.id, cleanPerson);
        await this._persistStore(store);
        return { ...cleanPerson };
    }

    /**
     * Delete a Person physically:
     * HARD INVARIANT: Cannot delete a Person if they are referenced by any memberships,
     * relationships, or trusted-circle entries. Archive must be used instead.
     */
    async deletePerson(id) {
        if (!id) throw new Error('Person id is required for delete');
        const store = await this._loadStore();
        if (!store.people.has(id)) {
            throw new Error(`Person with id '${id}' does not exist`);
        }

        // Referential integrity check: memberships
        for (const m of store.memberships.values()) {
            if (m.personId === id) {
                throw new Error(`Referential integrity error: Cannot physically delete Person '${id}' because they are referenced by membership '${m.id}'`);
            }
        }
        // Referential integrity check: relationships
        for (const r of store.relationships.values()) {
            if (r.fromPersonId === id || r.toPersonId === id) {
                throw new Error(`Referential integrity error: Cannot physically delete Person '${id}' because they are referenced by relationship '${r.id}'`);
            }
        }
        // Referential integrity check: trusted circle
        for (const tc of store.trustedCircle.values()) {
            if (tc.personId === id) {
                throw new Error(`Referential integrity error: Cannot physically delete Person '${id}' because they are referenced by trusted circle entry '${tc.id}'`);
            }
        }
        // Referential integrity check: documents
        for (const d of store.documents.values()) {
            if (d.personId === id) {
                throw new Error(`Referential integrity error: Cannot physically delete Person '${id}' because they are referenced by document '${d.id}'`);
            }
        }
        // Referential integrity check: tasks (active and archived)
        for (const t of store.tasks.values()) {
            if (t.assignedPersonId === id || t.ownerPersonId === id || t.completedByPersonId === id) {
                throw new Error('Cannot physically delete this Person because one or more tasks or responsibilities reference them');
            }
        }
        // Referential integrity check: responsibilities (active and archived)
        for (const r of store.responsibilities.values()) {
            if (r.leadPersonId === id || r.backupPersonId === id) {
                throw new Error('Cannot physically delete this Person because one or more tasks or responsibilities reference them');
            }
        }
        // Referential integrity check: emergency contacts (active and archived)
        for (const c of store.emergencyContacts.values()) {
            if (c.personId === id) {
                throw new Error('Cannot physically delete this Person because one or more emergency contacts or protection directives reference them');
            }
        }
        // Referential integrity check: protection items (active and archived)
        for (const p of store.protectionItems.values()) {
            if (p.designatedPersonId === id || p.designatedBackupPersonId === id || p.subjectPersonId === id) {
                throw new Error('Cannot physically delete this Person because one or more emergency contacts or protection directives reference them');
            }
        }
        // Referential integrity check: financial links (active and archived)
        if (store.financialLinks) {
            for (const fl of store.financialLinks.values()) {
                if (fl.leadPayerPersonId === id || fl.backupPayerPersonId === id) {
                    throw new Error('Cannot physically delete this Person because one or more financial links reference them as lead or backup payer');
                }
            }
        }

        const candidate = this._cloneStore(store);
        candidate.people.delete(id);
        await this._persistStore(candidate);
        return true;
    }

    /**
     * Archive a Person: Preserves history, marks memberships inactive/archived
     */
    async archivePerson(id) {
        const store = await this._loadStore();
        const person = store.people.get(id);
        if (!person) {
            throw new Error(`Person with id '${id}' does not exist`);
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();

        const candidatePerson = {
            ...person,
            status: PersonStatus.ARCHIVED,
            updatedAt: now
        };
        candidate.people.set(id, candidatePerson);

        // Transition active and provisional memberships to ARCHIVED
        for (const [mId, membership] of candidate.memberships.entries()) {
            if (membership.personId === id && 
                (membership.status === MembershipStatus.ACTIVE || membership.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION)) {
                candidate.memberships.set(mId, {
                    ...membership,
                    status: MembershipStatus.ARCHIVED,
                    leftAt: now,
                    updatedAt: now
                });
            }
        }

        await this._persistStore(candidate);
        return { ...candidatePerson };
    }

    // -------------------------------------------------------------
    // HOUSEHOLD CRUD & DERIVED PROJECTIONS
    // -------------------------------------------------------------

    _projectHousehold(household, memberships, people = null) {
        if (!household) return null;
        const hhMemberships = Array.from(memberships.values()).filter(m => m.householdId === household.id);

        const activeMemberIds = hhMemberships
            .filter(m => m.status === MembershipStatus.ACTIVE)
            .filter(m => {
                if (!people) return true;
                const p = people.get(m.personId);
                return p ? p.status === PersonStatus.ACTIVE : true;
            })
            .map(m => m.personId);

        const provisionalMemberIds = hhMemberships
            .filter(m => m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION)
            .map(m => m.personId);

        const memberIds = Array.from(new Set([...activeMemberIds, ...provisionalMemberIds]));

        return {
            ...household,
            activeMemberIds,
            provisionalMemberIds,
            memberIds
        };
    }

    async listHouseholds(filters = {}) {
        const store = await this._loadStore();
        let list = Array.from(store.households.values());

        if (filters.status) {
            list = list.filter(h => h.status === filters.status);
        } else if (!filters.includeInactive) {
            list = list.filter(h => h.status !== HouseholdStatus.INACTIVE);
        }

        return list.map(h => this._projectHousehold(h, store.memberships, store.people));
    }

    async getHousehold(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const hh = store.households.get(id);
        return hh ? this._projectHousehold(hh, store.memberships, store.people) : null;
    }

    async upsertHousehold(household) {
        validateHousehold(household);
        const store = await this._loadStore();
        const now = new Date().toISOString();
        const existing = store.households.get(household.id);

        // Prevent callers from writing a static memberIds property
        const { memberIds, activeMemberIds, provisionalMemberIds, ...cleanHousehold } = household;

        const record = {
            ...cleanHousehold,
            updatedAt: now,
            createdAt: existing ? existing.createdAt : (cleanHousehold.createdAt || now)
        };

        const candidate = this._cloneStore(store);
        candidate.households.set(record.id, record);
        await this._persistStore(candidate);
        return this._projectHousehold(record, candidate.memberships, candidate.people);
    }

    /**
     * Delete/Archive a Household:
     * Candidate clone ensures rollback safety:
     * Deletes memberships and household-specific trusted circle entries,
     * but PRESERVES all Person entities intact!
     */
    async deleteHousehold(id) {
        const store = await this._loadStore();
        const hh = store.households.get(id);
        if (!hh) {
            throw new Error(`Household with id '${id}' not found`);
        }

        const candidate = this._cloneStore(store);

        // 1. Remove memberships for this household
        for (const [mId, m] of candidate.memberships.entries()) {
            if (m.householdId === id) {
                candidate.memberships.delete(mId);
            }
        }

        // 2. Remove trusted circle entries specific to this household (Person remains intact!)
        for (const [tcId, tc] of candidate.trustedCircle.entries()) {
            if (tc.householdId === id) {
                candidate.trustedCircle.delete(tcId);
            }
        }

        // 3. Remove documents specific to this household (Person records remain intact!)
        for (const [dId, d] of candidate.documents.entries()) {
            if (d.householdId === id) {
                candidate.documents.delete(dId);
            }
        }

        // 4. Remove tasks specific to this household (Person records remain intact!)
        for (const [tId, t] of candidate.tasks.entries()) {
            if (t.householdId === id) {
                candidate.tasks.delete(tId);
            }
        }

        // 5. Remove responsibilities specific to this household (Person records remain intact!)
        for (const [rId, r] of candidate.responsibilities.entries()) {
            if (r.householdId === id) {
                candidate.responsibilities.delete(rId);
            }
        }

        // 6. Remove emergency contacts specific to this household (Person records remain intact!)
        for (const [cId, c] of candidate.emergencyContacts.entries()) {
            if (c.householdId === id) {
                candidate.emergencyContacts.delete(cId);
            }
        }

        // 7. Remove protection items specific to this household (Person records remain intact!)
        for (const [pId, p] of candidate.protectionItems.entries()) {
            if (p.householdId === id) {
                candidate.protectionItems.delete(pId);
            }
        }

        // 8. Remove financial links specific to this household (commitments and Person records remain intact!)
        if (candidate.financialLinks) {
            for (const [flId, fl] of candidate.financialLinks.entries()) {
                if (fl.householdId === id) {
                    candidate.financialLinks.delete(flId);
                }
            }
        }

        // Remove later household-owned planning collections in the same atomic candidate.
        for (const collection of ['budgetPools', 'forecastScenarios', 'memberIncomeStreams', 'goals']) {
            for (const [recordId, record] of candidate[collection].entries()) {
                if (record.householdId === id) candidate[collection].delete(recordId);
            }
        }

        // 9. Remove the household container itself
        candidate.households.delete(id);

        // Notice: Person records are 100% untouched!
        await this._persistStore(candidate);
        return true;
    }

    // -------------------------------------------------------------
    // HOUSEHOLD MEMBERSHIP CRUD
    // -------------------------------------------------------------

    async listMemberships(filters = {}) {
        const store = await this._loadStore();
        let list = Array.from(store.memberships.values());

        if (filters.householdId) {
            list = list.filter(m => m.householdId === filters.householdId);
        }
        if (filters.personId) {
            list = list.filter(m => m.personId === filters.personId);
        }
        if (filters.status) {
            list = list.filter(m => m.status === filters.status);
        }

        return list.map(m => ({ ...m }));
    }

    async getMembers(householdId) {
        if (!householdId) return [];
        const memberships = await this.listMemberships({ householdId });
        const memberPersons = await Promise.all(
            memberships.filter(m => m.status === MembershipStatus.ACTIVE).map(async m => {
                const p = await this.getPerson(m.personId);
                return p && p.status === PersonStatus.ACTIVE ? { ...p, role: m.role } : null;
            })
        );
        return memberPersons.filter(Boolean);
    }

    async getMembership(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const m = store.memberships.get(id);
        return m ? { ...m } : null;
    }

    async upsertMembership(membership) {
        validateMembership(membership);
        const store = await this._loadStore();

        // Referential integrity checks
        if (!store.households.has(membership.householdId)) {
            throw new Error(`Referential integrity error: Household '${membership.householdId}' does not exist`);
        }
        if (!store.people.has(membership.personId)) {
            throw new Error(`Referential integrity error: Person '${membership.personId}' does not exist`);
        }

        const now = new Date().toISOString();
        const existing = store.memberships.get(membership.id);

        const record = {
            ...membership,
            updatedAt: now,
            createdAt: existing ? existing.createdAt : (membership.createdAt || now)
        };

        store.memberships.set(record.id, record);
        await this._persistStore(store);
        return { ...record };
    }

    async deleteMembership(id) {
        const store = await this._loadStore();
        if (!store.memberships.has(id)) {
            return false;
        }
        store.memberships.delete(id);
        await this._persistStore(store);
        return true;
    }

    // -------------------------------------------------------------
    // RELATIONSHIPS CRUD
    // -------------------------------------------------------------

    async listRelationships(personId = null) {
        const store = await this._loadStore();
        let list = Array.from(store.relationships.values());

        if (personId) {
            list = list.filter(r => r.fromPersonId === personId || r.toPersonId === personId);
        }

        return list.map(r => ({ ...r }));
    }

    async upsertRelationship(relationship) {
        validateRelationship(relationship);
        const store = await this._loadStore();

        // Referential integrity check
        if (!store.people.has(relationship.fromPersonId)) {
            throw new Error(`Referential integrity error: fromPersonId '${relationship.fromPersonId}' does not exist`);
        }
        if (!store.people.has(relationship.toPersonId)) {
            throw new Error(`Referential integrity error: toPersonId '${relationship.toPersonId}' does not exist`);
        }

        const now = new Date().toISOString();
        const existing = store.relationships.get(relationship.id);

        const record = {
            ...relationship,
            updatedAt: now,
            createdAt: existing ? existing.createdAt : (relationship.createdAt || now)
        };

        store.relationships.set(record.id, record);
        await this._persistStore(store);
        return { ...record };
    }

    async deleteRelationship(id) {
        const store = await this._loadStore();
        if (!store.relationships.has(id)) {
            return false;
        }
        const candidate = this._cloneStore(store);
        candidate.relationships.delete(id);
        await this._persistStore(candidate);
        return true;
    }

    // -------------------------------------------------------------
    // TRUSTED CIRCLE CRUD
    // -------------------------------------------------------------

    async listTrustedCircle(householdId = null) {
        const store = await this._loadStore();
        let list = Array.from(store.trustedCircle.values());

        if (householdId) {
            list = list.filter(t => t.householdId === householdId);
        }

        return list.map(t => ({ ...t }));
    }

    async upsertTrustedCircle(entry) {
        validateTrustedCircleEntry(entry);
        const store = await this._loadStore();

        // Referential integrity check
        if (!store.households.has(entry.householdId)) {
            throw new Error(`Referential integrity error: Household '${entry.householdId}' does not exist`);
        }
        if (!store.people.has(entry.personId)) {
            throw new Error(`Referential integrity error: Person '${entry.personId}' does not exist`);
        }

        const now = new Date().toISOString();
        const existing = store.trustedCircle.get(entry.id);

        const record = {
            ...entry,
            updatedAt: now,
            createdAt: existing ? existing.createdAt : (entry.createdAt || now)
        };

        store.trustedCircle.set(record.id, record);
        await this._persistStore(store);
        return { ...record };
    }

    async deleteTrustedCircle(id) {
        const store = await this._loadStore();
        if (!store.trustedCircle.has(id)) {
            return false;
        }
        store.trustedCircle.delete(id);
        await this._persistStore(store);
        return true;
    }

    // -------------------------------------------------------------
    // DOCUMENT CRUD
    // -------------------------------------------------------------

    async listDocuments(filters = {}) {
        const store = await this._loadStore();
        let list = Array.from(store.documents.values());

        if (filters.householdId) {
            list = list.filter(d => d.householdId === filters.householdId);
        }
        if (filters.personId !== undefined) {
            list = list.filter(d => d.personId === filters.personId);
        }
        if (filters.category) {
            list = list.filter(d => d.category === filters.category);
        }
        if (filters.status) {
            list = list.filter(d => d.status === filters.status);
        } else if (!filters.includeArchived) {
            list = list.filter(d => d.status !== DocumentStatus.ARCHIVED);
        }

        return list.map(d => ({ ...d, tags: Array.isArray(d.tags) ? [...d.tags] : [] }));
    }

    async getDocument(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const doc = store.documents.get(id);
        return doc ? { ...doc, tags: Array.isArray(doc.tags) ? [...doc.tags] : [] } : null;
    }

    async upsertDocument(document, options = {}) {
        validateDocument(document, options);
        const store = await this._loadStore();

        // Referential integrity check: household must exist
        if (!store.households.has(document.householdId)) {
            throw new Error(`Referential integrity error: Household '${document.householdId}' does not exist`);
        }

        // Referential integrity check: if personId is provided
        if (document.personId) {
            const person = store.people.get(document.personId);
            if (!person) {
                throw new Error(`Referential integrity error: Person '${document.personId}' does not exist`);
            }

            const existingDoc = store.documents.get(document.id);
            const isNewAssignment = !existingDoc || existingDoc.personId !== document.personId;

            // Cannot newly assign document to an archived person
            if (isNewAssignment && person.status === PersonStatus.ARCHIVED) {
                throw new Error(`Cannot assign document to archived person '${document.personId}'`);
            }

            // Person must have active or provisional membership in THIS specific household
            let hasValidMembership = false;
            for (const m of store.memberships.values()) {
                if (m.householdId === document.householdId && m.personId === document.personId) {
                    if (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION) {
                        hasValidMembership = true;
                        break;
                    }
                }
            }

            if (!hasValidMembership) {
                throw new Error(`Referential integrity error: Person '${document.personId}' is not an active or provisional member of household '${document.householdId}'`);
            }
        }

        const now = new Date().toISOString();
        const existing = store.documents.get(document.id);

        const cleanDoc = {
            ...document,
            tags: Array.isArray(document.tags) ? [...document.tags] : [],
            updatedAt: now,
            createdAt: existing ? existing.createdAt : (document.createdAt || now)
        };

        const candidate = this._cloneStore(store);
        candidate.documents.set(cleanDoc.id, cleanDoc);
        await this._persistStore(candidate);
        return { ...cleanDoc, tags: [...cleanDoc.tags] };
    }

    async archiveDocument(id) {
        if (!id) throw new Error('Document id is required for archive');
        const store = await this._loadStore();
        const doc = store.documents.get(id);
        if (!doc) {
            throw new Error(`Document with id '${id}' not found`);
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();
        const candidateDoc = {
            ...doc,
            status: DocumentStatus.ARCHIVED,
            updatedAt: now
        };
        candidate.documents.set(id, candidateDoc);
        await this._persistStore(candidate);
        return { ...candidateDoc, tags: [...candidateDoc.tags] };
    }

    async deleteDocument(id) {
        if (!id) throw new Error('Document id is required for delete');
        const store = await this._loadStore();
        if (!store.documents.has(id)) {
            return false;
        }

        // Referential integrity check: protection items (active and archived) referencing this document
        for (const p of store.protectionItems.values()) {
            if (p.documentId === id) {
                throw new Error('Cannot physically delete document because one or more protection directives reference it');
            }
        }

        const candidate = this._cloneStore(store);
        candidate.documents.delete(id);
        await this._persistStore(candidate);
        return true;
    }

    // -------------------------------------------------------------
    // RESPONSIBILITY CRUD
    // -------------------------------------------------------------

    async listResponsibilities(filters = {}) {
        const store = await this._loadStore();
        let list = Array.from(store.responsibilities.values());

        if (filters.householdId) {
            list = list.filter(r => r.householdId === filters.householdId);
        }
        if (filters.category) {
            list = list.filter(r => r.category === filters.category);
        }
        if (filters.leadPersonId) {
            list = list.filter(r => r.leadPersonId === filters.leadPersonId);
        }
        if (filters.status) {
            list = list.filter(r => r.status === filters.status);
        } else if (!filters.includeArchived) {
            list = list.filter(r => r.status !== ResponsibilityStatus.ARCHIVED);
        }

        return list.map(r => ({ ...r }));
    }

    async getResponsibility(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const resp = store.responsibilities.get(id);
        return resp ? { ...resp } : null;
    }

    async upsertResponsibility(resp) {
        validateResponsibility(resp);
        const store = await this._loadStore();

        // Referential integrity check: household must exist
        if (!store.households.has(resp.householdId)) {
            throw new Error(`Referential integrity error: Household '${resp.householdId}' does not exist`);
        }

        // Referential integrity check: leadPersonId
        const lead = store.people.get(resp.leadPersonId);
        if (!lead) {
            throw new Error(`Referential integrity error: Person '${resp.leadPersonId}' does not exist`);
        }

        const existing = store.responsibilities.get(resp.id);
        const isNewLead = !existing || existing.leadPersonId !== resp.leadPersonId;
        if (isNewLead && lead.status === PersonStatus.ARCHIVED) {
            throw new Error(`Cannot assign responsibility to archived person '${resp.leadPersonId}'`);
        }

        let hasValidLeadMembership = false;
        for (const m of store.memberships.values()) {
            if (m.householdId === resp.householdId && m.personId === resp.leadPersonId) {
                if (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION) {
                    hasValidLeadMembership = true;
                    break;
                }
            }
        }
        if (!hasValidLeadMembership) {
            throw new Error(`Referential integrity error: Person '${resp.leadPersonId}' is not an active or provisional member of household '${resp.householdId}'`);
        }

        // Referential integrity check: backupPersonId (if provided)
        if (resp.backupPersonId) {
            const backup = store.people.get(resp.backupPersonId);
            if (!backup) {
                throw new Error(`Referential integrity error: Person '${resp.backupPersonId}' does not exist`);
            }
            const isNewBackup = !existing || existing.backupPersonId !== resp.backupPersonId;
            if (isNewBackup && backup.status === PersonStatus.ARCHIVED) {
                throw new Error(`Cannot assign responsibility to archived person '${resp.backupPersonId}'`);
            }
            let hasValidBackupMembership = false;
            for (const m of store.memberships.values()) {
                if (m.householdId === resp.householdId && m.personId === resp.backupPersonId) {
                    if (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION) {
                        hasValidBackupMembership = true;
                        break;
                    }
                }
            }
            if (!hasValidBackupMembership) {
                throw new Error(`Referential integrity error: Person '${resp.backupPersonId}' is not an active or provisional member of household '${resp.householdId}'`);
            }
        }

        const now = new Date().toISOString();
        const cleanResp = {
            ...resp,
            updatedAt: now,
            createdAt: existing ? existing.createdAt : (resp.createdAt || now)
        };

        const candidate = this._cloneStore(store);
        candidate.responsibilities.set(cleanResp.id, cleanResp);
        await this._persistStore(candidate);
        return { ...cleanResp };
    }

    async archiveResponsibility(id) {
        if (!id) throw new Error('Responsibility id is required for archive');
        const store = await this._loadStore();
        const resp = store.responsibilities.get(id);
        if (!resp) {
            throw new Error(`Responsibility with id '${id}' not found`);
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();
        const candidateResp = {
            ...resp,
            status: ResponsibilityStatus.ARCHIVED,
            updatedAt: now
        };
        candidate.responsibilities.set(id, candidateResp);
        await this._persistStore(candidate);
        return { ...candidateResp };
    }

    async deleteResponsibility(id) {
        if (!id) throw new Error('Responsibility id is required for delete');
        const store = await this._loadStore();
        if (!store.responsibilities.has(id)) {
            return false;
        }

        // Hard invariant: Cannot physically delete Responsibility if linked tasks exist
        for (const t of store.tasks.values()) {
            if (t.responsibilityId === id) {
                throw new Error(`Referential integrity error: Cannot physically delete Responsibility '${id}' because one or more tasks reference it`);
            }
        }

        // Hard invariant: Cannot physically delete Responsibility if linked financial links exist
        if (store.financialLinks) {
            for (const fl of store.financialLinks.values()) {
                if (fl.responsibilityId === id) {
                    throw new Error(`Referential integrity error: Cannot physically delete Responsibility '${id}' because one or more financial links reference it`);
                }
            }
        }

        const candidate = this._cloneStore(store);
        candidate.responsibilities.delete(id);
        await this._persistStore(candidate);
        return true;
    }

    // -------------------------------------------------------------
    // TASK CRUD
    // -------------------------------------------------------------

    async listTasks(filters = {}) {
        const store = await this._loadStore();
        let list = Array.from(store.tasks.values());

        if (filters.householdId) {
            list = list.filter(t => t.householdId === filters.householdId);
        }
        if (filters.responsibilityId) {
            list = list.filter(t => t.responsibilityId === filters.responsibilityId);
        }
        if (filters.assignedPersonId !== undefined) {
            list = list.filter(t => t.assignedPersonId === filters.assignedPersonId);
        }
        if (filters.ownerPersonId !== undefined) {
            list = list.filter(t => t.ownerPersonId === filters.ownerPersonId);
        }
        if (filters.status) {
            list = list.filter(t => t.status === filters.status);
        } else if (!filters.includeArchived) {
            list = list.filter(t => t.status !== TaskStatus.ARCHIVED);
        }
        if (filters.priority) {
            list = list.filter(t => t.priority === filters.priority);
        }

        return list.map(t => ({ ...t }));
    }

    async getTask(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const task = store.tasks.get(id);
        return task ? { ...task } : null;
    }

    async upsertTask(task) {
        validateTask(task);
        const store = await this._loadStore();

        // Referential integrity check: household must exist
        if (!store.households.has(task.householdId)) {
            throw new Error(`Referential integrity error: Household '${task.householdId}' does not exist`);
        }

        const existing = store.tasks.get(task.id);

        // Referential integrity check: responsibilityId (if provided)
        if (task.responsibilityId) {
            const resp = store.responsibilities.get(task.responsibilityId);
            if (!resp) {
                throw new Error(`Referential integrity error: Responsibility '${task.responsibilityId}' does not exist`);
            }
            if (resp.householdId !== task.householdId) {
                throw new Error(`Referential integrity error: Responsibility '${task.responsibilityId}' belongs to a different household`);
            }
            // Cannot link new task to an archived responsibility
            const isNewRespLink = !existing || existing.responsibilityId !== task.responsibilityId;
            if (isNewRespLink && resp.status === ResponsibilityStatus.ARCHIVED) {
                throw new Error(`Cannot link task to archived responsibility '${task.responsibilityId}'`);
            }
        }

        // Referential integrity check: assignedPersonId (if provided)
        if (task.assignedPersonId) {
            const person = store.people.get(task.assignedPersonId);
            if (!person) {
                throw new Error(`Referential integrity error: Person '${task.assignedPersonId}' does not exist`);
            }

            const isNewAssignee = !existing || existing.assignedPersonId !== task.assignedPersonId;
            if (isNewAssignee && person.status === PersonStatus.ARCHIVED) {
                throw new Error(`Cannot assign task to archived person '${task.assignedPersonId}'`);
            }

            let hasValidMembership = false;
            for (const m of store.memberships.values()) {
                if (m.householdId === task.householdId && m.personId === task.assignedPersonId) {
                    if (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION) {
                        hasValidMembership = true;
                        break;
                    }
                }
            }
            if (!hasValidMembership) {
                throw new Error(`Referential integrity error: Person '${task.assignedPersonId}' is not an active or provisional member of household '${task.householdId}'`);
            }
        }

        // Referential integrity check: ownerPersonId (if provided; null = household-owned)
        if (task.ownerPersonId) {
            const owner = store.people.get(task.ownerPersonId);
            if (!owner) {
                throw new Error(`Referential integrity error: Person '${task.ownerPersonId}' does not exist`);
            }

            let hasValidOwnerMembership = false;
            for (const m of store.memberships.values()) {
                if (m.householdId === task.householdId && m.personId === task.ownerPersonId) {
                    if (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION) {
                        hasValidOwnerMembership = true;
                        break;
                    }
                }
            }
            if (!hasValidOwnerMembership) {
                throw new Error(`Referential integrity error: Owner '${task.ownerPersonId}' is not an active or provisional member of household '${task.householdId}'`);
            }
        }

        // Referential integrity check: completedByPersonId (if provided)
        if (task.completedByPersonId) {
            const completer = store.people.get(task.completedByPersonId);
            if (!completer) {
                throw new Error(`Referential integrity error: Person '${task.completedByPersonId}' does not exist`);
            }
            let hasValidCompleterMembership = false;
            for (const m of store.memberships.values()) {
                if (m.householdId === task.householdId && m.personId === task.completedByPersonId) {
                    if (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION) {
                        hasValidCompleterMembership = true;
                        break;
                    }
                }
            }
            if (!hasValidCompleterMembership) {
                throw new Error(`Referential integrity error: Person '${task.completedByPersonId}' is not an active or provisional member of household '${task.householdId}'`);
            }
        }

        const now = new Date().toISOString();
        const cleanTask = {
            ...task,
            updatedAt: now,
            createdAt: existing ? existing.createdAt : (task.createdAt || now)
        };

        const candidate = this._cloneStore(store);
        candidate.tasks.set(cleanTask.id, cleanTask);
        await this._persistStore(candidate);
        return { ...cleanTask };
    }

    async archiveTask(id) {
        if (!id) throw new Error('Task id is required for archive');
        const store = await this._loadStore();
        const task = store.tasks.get(id);
        if (!task) {
            throw new Error(`Task with id '${id}' not found`);
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();
        const candidateTask = {
            ...task,
            status: TaskStatus.ARCHIVED,
            updatedAt: now
        };
        candidate.tasks.set(id, candidateTask);
        await this._persistStore(candidate);
        return { ...candidateTask };
    }

    async deleteTask(id) {
        if (!id) throw new Error('Task id is required for delete');
        const store = await this._loadStore();
        if (!store.tasks.has(id)) {
            return false;
        }
        const candidate = this._cloneStore(store);
        candidate.tasks.delete(id);
        await this._persistStore(candidate);
        return true;
    }

    /**
     * Atomically marks the current task as COMPLETED and inserts the next recurring task instance.
     * Guarantees all-or-nothing consistency across both records.
     */
    async atomicCompleteAndAdvanceTask(currentTaskId, completionMeta, nextTaskInstance = null) {
        const store = await this._loadStore();
        const currentTask = store.tasks.get(currentTaskId);
        if (!currentTask) {
            throw new Error(`Task with id '${currentTaskId}' not found`);
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();

        // 1. Mark current task as COMPLETED
        const completedTask = {
            ...currentTask,
            status: TaskStatus.COMPLETED,
            completedAt: completionMeta.completedAt || now,
            completedByPersonId: completionMeta.completedByPersonId !== undefined ? completionMeta.completedByPersonId : null,
            updatedAt: now
        };
        validateTask(completedTask);
        candidate.tasks.set(completedTask.id, completedTask);

        // 2. If recurring, add next instance
        if (nextTaskInstance) {
            validateTask(nextTaskInstance);
            candidate.tasks.set(nextTaskInstance.id, { ...nextTaskInstance });
        }

        // 3. Atomically persist both
        await this._persistStore(candidate);

        return {
            completedTask: { ...completedTask },
            nextTask: nextTaskInstance ? { ...nextTaskInstance } : null
        };
    }

    // -------------------------------------------------------------
    // EMERGENCY CONTACTS CRUD
    // -------------------------------------------------------------

    async listEmergencyContacts(householdId, options = {}) {
        if (!householdId) return [];
        const store = await this._loadStore();
        let list = Array.from(store.emergencyContacts.values()).filter(c => c.householdId === householdId);

        if (!options.includeArchived) {
            list = list.filter(c => !c.isArchived);
        }

        // Sort by priorityOrder ascending
        list.sort((a, b) => a.priorityOrder - b.priorityOrder);

        return list.map(c => ({ ...c }));
    }

    async getEmergencyContact(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const contact = store.emergencyContacts.get(id);
        return contact ? { ...contact } : null;
    }

    async upsertEmergencyContact(contact) {
        validateEmergencyContact(contact);
        const store = await this._loadStore();

        // 1. Verify household exists
        if (!store.households.has(contact.householdId)) {
            throw new Error(`Referential integrity error: Household '${contact.householdId}' does not exist`);
        }

        // 2. If personId is provided, verify person exists and belongs to this household
        if (contact.personId) {
            if (!store.people.has(contact.personId)) {
                throw new Error(`Referential integrity error: Person '${contact.personId}' does not exist`);
            }
            const activeMembership = Array.from(store.memberships.values()).find(
                m => m.householdId === contact.householdId &&
                     m.personId === contact.personId &&
                     (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION)
            );
            if (!activeMembership) {
                throw new Error(`Multi-household isolation error: Person '${contact.personId}' is not an active member of household '${contact.householdId}'`);
            }
        }

        // 3. If trustedCircleMemberId is provided, verify it exists and belongs to this household
        if (contact.trustedCircleMemberId) {
            const tcEntry = store.trustedCircle.get(contact.trustedCircleMemberId);
            if (!tcEntry) {
                throw new Error(`Referential integrity error: Trusted circle entry '${contact.trustedCircleMemberId}' does not exist`);
            }
            if (tcEntry.householdId !== contact.householdId) {
                throw new Error(`Multi-household isolation error: Trusted circle entry '${contact.trustedCircleMemberId}' does not belong to household '${contact.householdId}'`);
            }
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();
        const existing = store.emergencyContacts.get(contact.id);

        const candidateContact = {
            ...contact,
            createdAt: existing ? existing.createdAt : (contact.createdAt || now),
            updatedAt: now
        };

        candidate.emergencyContacts.set(candidateContact.id, candidateContact);
        await this._persistStore(candidate);
        return { ...candidateContact };
    }

    async archiveEmergencyContact(id) {
        if (!id) throw new Error('Emergency contact id is required for archive');
        const store = await this._loadStore();
        const contact = store.emergencyContacts.get(id);
        if (!contact) {
            throw new Error(`Emergency contact with id '${id}' not found`);
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();
        const candidateContact = {
            ...contact,
            isArchived: true,
            updatedAt: now
        };
        candidate.emergencyContacts.set(id, candidateContact);
        await this._persistStore(candidate);
        return { ...candidateContact };
    }

    async deleteEmergencyContact(id) {
        if (!id) throw new Error('Emergency contact id is required for delete');
        const store = await this._loadStore();
        if (!store.emergencyContacts.has(id)) {
            return false;
        }

        const candidate = this._cloneStore(store);
        candidate.emergencyContacts.delete(id);
        await this._persistStore(candidate);
        return true;
    }

    async reorderEmergencyContacts(householdId, orderedIds = []) {
        if (!householdId) throw new Error('Household id is required to reorder emergency contacts');
        const store = await this._loadStore();
        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();

        orderedIds.forEach((id, index) => {
            const existing = candidate.emergencyContacts.get(id);
            if (existing && existing.householdId === householdId) {
                candidate.emergencyContacts.set(id, {
                    ...existing,
                    priorityOrder: index + 1,
                    updatedAt: now
                });
            }
        });

        await this._persistStore(candidate);
        return this.listEmergencyContacts(householdId);
    }

    // -------------------------------------------------------------
    // PROTECTION ITEMS CRUD
    // -------------------------------------------------------------

    async listProtectionItems(householdId, options = {}) {
        if (!householdId) return [];
        const store = await this._loadStore();
        let list = Array.from(store.protectionItems.values()).filter(p => p.householdId === householdId);

        if (options.status) {
            list = list.filter(p => p.status === options.status);
        } else if (!options.includeArchived) {
            list = list.filter(p => p.status !== ProtectionStatus.ARCHIVED);
        }

        return list.map(p => ({ ...p }));
    }

    async getProtectionItem(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const item = store.protectionItems.get(id);
        return item ? { ...item } : null;
    }

    async upsertProtectionItem(item) {
        validateProtectionItem(item);
        const store = await this._loadStore();

        // 1. Verify household exists
        if (!store.households.has(item.householdId)) {
            throw new Error(`Referential integrity error: Household '${item.householdId}' does not exist`);
        }

        // Helper to check member isolation
        const checkHouseholdMember = (personId, roleName) => {
            if (!personId) return;
            if (!store.people.has(personId)) {
                throw new Error(`Referential integrity error: Person '${personId}' does not exist for ${roleName}`);
            }
            const activeMembership = Array.from(store.memberships.values()).find(
                m => m.householdId === item.householdId &&
                     m.personId === personId &&
                     (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION)
            );
            if (!activeMembership) {
                throw new Error(`Multi-household isolation error: Person '${personId}' is not an active member of household '${item.householdId}' for ${roleName}`);
            }
        };

        checkHouseholdMember(item.designatedPersonId, 'designated agent');
        checkHouseholdMember(item.designatedBackupPersonId, 'designated backup agent');
        checkHouseholdMember(item.subjectPersonId, 'subject person');

        // 2. If documentId is provided, verify document exists and belongs to this household
        if (item.documentId) {
            const doc = store.documents.get(item.documentId);
            if (!doc) {
                throw new Error(`Referential integrity error: Document '${item.documentId}' does not exist`);
            }
            if (doc.householdId !== item.householdId) {
                throw new Error(`Multi-household isolation error: Document '${item.documentId}' does not belong to household '${item.householdId}'`);
            }
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();
        const existing = store.protectionItems.get(item.id);

        const candidateItem = {
            ...item,
            createdAt: existing ? existing.createdAt : (item.createdAt || now),
            updatedAt: now
        };

        candidate.protectionItems.set(candidateItem.id, candidateItem);
        await this._persistStore(candidate);
        return { ...candidateItem };
    }

    async archiveProtectionItem(id) {
        if (!id) throw new Error('Protection item id is required for archive');
        const store = await this._loadStore();
        const item = store.protectionItems.get(id);
        if (!item) {
            throw new Error(`Protection item with id '${id}' not found`);
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();
        const candidateItem = {
            ...item,
            status: ProtectionStatus.ARCHIVED,
            updatedAt: now
        };
        candidate.protectionItems.set(id, candidateItem);
        await this._persistStore(candidate);
        return { ...candidateItem };
    }

    async deleteProtectionItem(id) {
        if (!id) throw new Error('Protection item id is required for delete');
        const store = await this._loadStore();
        if (!store.protectionItems.has(id)) {
            return false;
        }

        const candidate = this._cloneStore(store);
        candidate.protectionItems.delete(id);
        await this._persistStore(candidate);
        return true;
    }

    // -------------------------------------------------------------
    // FINANCIAL LINK CRUD (Phase 6)
    // -------------------------------------------------------------

    async listFinancialLinks(filters = {}) {
        const store = await this._loadStore();
        let list = Array.from(store.financialLinks.values());

        if (filters.householdId) {
            list = list.filter(fl => fl.householdId === filters.householdId);
        }
        if (filters.commitmentId) {
            list = list.filter(fl => fl.commitmentId === filters.commitmentId);
        }
        if (filters.leadPayerPersonId) {
            list = list.filter(fl => fl.leadPayerPersonId === filters.leadPayerPersonId);
        }
        if (filters.backupPayerPersonId) {
            list = list.filter(fl => fl.backupPayerPersonId === filters.backupPayerPersonId);
        }
        if (filters.responsibilityId) {
            list = list.filter(fl => fl.responsibilityId === filters.responsibilityId);
        }
        if (filters.isArchived !== undefined) {
            list = list.filter(fl => !!fl.isArchived === !!filters.isArchived);
        }

        return list.map(fl => ({ ...fl }));
    }

    async getFinancialLink(id) {
        if (!id) return null;
        const store = await this._loadStore();
        const link = store.financialLinks.get(id);
        return link ? { ...link } : null;
    }

    async getFinancialLinkByCommitmentId(commitmentId, householdId = null) {
        if (!commitmentId) return null;
        const store = await this._loadStore();
        for (const fl of store.financialLinks.values()) {
            if (fl.commitmentId === commitmentId) {
                if (!householdId || fl.householdId === householdId) {
                    return { ...fl };
                }
            }
        }
        return null;
    }

    async upsertFinancialLink(link) {
        validateFinancialLink(link);

        const store = await this._loadStore();

        // 1. Verify household exists
        const hh = store.households.get(link.householdId);
        if (!hh) {
            throw new Error(`Referential integrity error: Household '${link.householdId}' does not exist`);
        }

        // Helper to check active or provisional membership
        const checkHouseholdMember = (personId, roleName) => {
            if (!personId) return;
            const person = store.people.get(personId);
            if (!person) {
                throw new Error(`Referential integrity error: Person '${personId}' (${roleName}) does not exist`);
            }
            const activeMembership = Array.from(store.memberships.values()).find(
                m => m.householdId === link.householdId &&
                     m.personId === personId &&
                     (m.status === MembershipStatus.ACTIVE || m.status === MembershipStatus.PROVISIONAL_PENDING_CONFIRMATION)
            );
            if (!activeMembership) {
                throw new Error(`Multi-household isolation error: Person '${personId}' is not an active member of household '${link.householdId}' for ${roleName}`);
            }
        };

        // 2. Validate lead payer is an active household member
        checkHouseholdMember(link.leadPayerPersonId, 'lead payer');

        // 3. Validate backup payer (if provided) is an active household member and distinct from lead payer
        if (link.backupPayerPersonId) {
            if (link.backupPayerPersonId === link.leadPayerPersonId) {
                throw new Error('Validation error: Backup payer cannot be the same as the lead payer');
            }
            checkHouseholdMember(link.backupPayerPersonId, 'backup payer');
        }

        // 4. Validate responsibility domain (if provided) exists and belongs to the same household
        if (link.responsibilityId) {
            const resp = store.responsibilities.get(link.responsibilityId);
            if (!resp) {
                throw new Error(`Referential integrity error: Responsibility domain '${link.responsibilityId}' does not exist`);
            }
            if (resp.householdId !== link.householdId) {
                throw new Error(`Multi-household isolation error: Responsibility domain '${link.responsibilityId}' does not belong to household '${link.householdId}'`);
            }
        }

        // 5. Uniqueness constraint: a commitment can only be linked once per household
        for (const existingLink of store.financialLinks.values()) {
            if (existingLink.householdId === link.householdId &&
                existingLink.commitmentId === link.commitmentId &&
                existingLink.id !== link.id) {
                throw new Error(`Uniqueness conflict: Commitment '${link.commitmentId}' is already linked to household '${link.householdId}' via link '${existingLink.id}'`);
            }
        }

        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();
        const existing = store.financialLinks.get(link.id);

        const candidateLink = {
            ...link,
            createdAt: existing ? existing.createdAt : (link.createdAt || now),
            updatedAt: now
        };

        candidate.financialLinks.set(candidateLink.id, candidateLink);
        await this._persistStore(candidate);
        return { ...candidateLink };
    }

    async deleteFinancialLink(id) {
        if (!id) throw new Error('Financial link id is required for delete');
        const store = await this._loadStore();
        if (!store.financialLinks.has(id)) {
            return false;
        }

        const candidate = this._cloneStore(store);
        candidate.financialLinks.delete(id);
        await this._persistStore(candidate);
        return true;
    }

    // -------------------------------------------------------------
    // PHASE 9: BUDGET POOLS & LINKED EXPENSES CRUD
    // -------------------------------------------------------------

    async getBudgetPools(householdId) {
        if (!householdId) throw new Error('householdId is required to get budget pools');
        const store = await this._loadStore();
        return Array.from(store.budgetPools.values())
            .filter(p => p.householdId === householdId)
            .map(p => JSON.parse(JSON.stringify(p)));
    }

    async getBudgetPool(householdId, poolId) {
        if (!householdId || !poolId) throw new Error('householdId and poolId are required');
        const store = await this._loadStore();
        const pool = store.budgetPools.get(poolId);
        if (!pool || pool.householdId !== householdId) return null;
        return JSON.parse(JSON.stringify(pool));
    }

    async saveBudgetPool(householdId, poolData) {
        if (!householdId) throw new Error('householdId is required to save budget pool');
        if (!poolData || typeof poolData !== 'object') throw new Error('poolData object is required');
        if (!poolData.name || typeof poolData.name !== 'string') throw new Error('pool name is required');
        if (typeof poolData.monthlyCeiling !== 'number' || isNaN(poolData.monthlyCeiling) || poolData.monthlyCeiling < 0) {
            throw new Error('monthlyCeiling must be a non-negative number');
        }

        const store = await this._loadStore();
        const candidate = this._cloneStore(store);
        const now = new Date().toISOString();

        const poolId = poolData.id || `pool_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const existing = store.budgetPools.get(poolId);

        // Validate contributor split versions if provided
        let versions = poolData.contributorSplitVersions || (existing ? existing.contributorSplitVersions : []);
        if (!Array.isArray(versions)) versions = [];

        for (const v of versions) {
            if (!v.effectivePeriod || typeof v.effectivePeriod !== 'string') {
                throw new Error('Each split version must have an effectivePeriod (YYYY-MM)');
            }
            if (Array.isArray(v.contributorSplits)) {
                const sum = v.contributorSplits.reduce((acc, s) => acc + (Number(s.targetRatioPercent) || 0), 0);
                if (Math.abs(sum - 100) > 0.01) {
                    throw new Error(`Split version for ${v.effectivePeriod} must sum to 100.0%`);
                }
            }
        }

        const candidatePool = {
            ...existing,
            ...poolData,
            id: poolId,
            householdId,
            name: poolData.name.trim(),
            category: poolData.category || 'GENERAL',
            currency: poolData.currency || 'INR',
            monthlyCeiling: poolData.monthlyCeiling,
            isArchived: poolData.isArchived === true ? true : (existing ? existing.isArchived : false),
            contributorSplitVersions: versions,
            linkedExpenses: existing ? existing.linkedExpenses : (poolData.linkedExpenses || []),
            createdAt: existing ? existing.createdAt : (poolData.createdAt || now),
            updatedAt: now
        };

        candidate.budgetPools.set(poolId, candidatePool);
        await this._persistStore(candidate);
        return JSON.parse(JSON.stringify(candidatePool));
    }

    async archiveBudgetPool(householdId, poolId) {
        if (!householdId || !poolId) throw new Error('householdId and poolId are required to archive');
        const store = await this._loadStore();
        const existing = store.budgetPools.get(poolId);
        if (!existing || existing.householdId !== householdId) {
            throw new Error(`Budget pool '${poolId}' not found in household '${householdId}'`);
        }

        const candidate = this._cloneStore(store);
        const updatedPool = {
            ...existing,
            isArchived: true,
            updatedAt: new Date().toISOString()
        };
        candidate.budgetPools.set(poolId, updatedPool);
        await this._persistStore(candidate);
        return JSON.parse(JSON.stringify(updatedPool));
    }

    async linkExpenseToPool(householdId, poolId, expenseData) {
        if (!householdId || !poolId) throw new Error('householdId and poolId are required');
        if (!expenseData || !expenseData.transactionId) throw new Error('transactionId is required to link expense');

        const store = await this._loadStore();
        const targetPool = store.budgetPools.get(poolId);
        if (!targetPool || targetPool.householdId !== householdId) {
            throw new Error(`Budget pool '${poolId}' not found in household '${householdId}'`);
        }

        // Cross-pool uniqueness enforcement across ALL pools (active & archived) in this household
        for (const pool of store.budgetPools.values()) {
            if (pool.householdId === householdId && Array.isArray(pool.linkedExpenses)) {
                const alreadyLinked = pool.linkedExpenses.some(e => e.transactionId === expenseData.transactionId);
                if (alreadyLinked) {
                    throw new Error('TRANSACTION_ALREADY_LINKED_TO_POOL');
                }
            }
        }

        const candidate = this._cloneStore(store);
        const candidatePool = candidate.budgetPools.get(poolId);

        // Derive refund status and net amount
        const gross = Number(expenseData.grossAmount ?? expenseData.amount ?? 0);
        const refund = Math.max(0, Number(expenseData.effectiveRefundAmount ?? expenseData.refundAmount ?? 0));
        const isRefunded = refund >= gross;
        const net = isRefunded ? 0 : Math.max(0, gross - refund);

        const newLink = {
            transactionId: expenseData.transactionId,
            grossAmount: gross,
            effectiveRefundAmount: refund,
            netAmount: net,
            status: isRefunded ? 'REFUNDED' : 'SETTLED',
            contributedByPersonId: expenseData.contributedByPersonId || null,
            timestampUtc: expenseData.timestampUtc || expenseData.timestamp || new Date().toISOString(),
            category: expenseData.category || candidatePool.category,
            note: expenseData.note || '',
            linkedAtUtc: new Date().toISOString()
        };

        candidatePool.linkedExpenses = [...(candidatePool.linkedExpenses || []), newLink];
        candidatePool.updatedAt = new Date().toISOString();
        candidate.budgetPools.set(poolId, candidatePool);

        await this._persistStore(candidate);
        return JSON.parse(JSON.stringify(newLink));
    }

    async unlinkExpenseFromPool(householdId, poolId, transactionId) {
        if (!householdId || !poolId || !transactionId) throw new Error('householdId, poolId, and transactionId are required');
        const store = await this._loadStore();
        const targetPool = store.budgetPools.get(poolId);
        if (!targetPool || targetPool.householdId !== householdId) {
            throw new Error(`Budget pool '${poolId}' not found in household '${householdId}'`);
        }

        const candidate = this._cloneStore(store);
        const candidatePool = candidate.budgetPools.get(poolId);
        candidatePool.linkedExpenses = (candidatePool.linkedExpenses || []).filter(e => e.transactionId !== transactionId);
        candidatePool.updatedAt = new Date().toISOString();
        candidate.budgetPools.set(poolId, candidatePool);

        await this._persistStore(candidate);
        return true;
    }

    async relinkExpense(householdId, fromPoolId, toPoolId, transactionId) {
        if (!householdId || !fromPoolId || !toPoolId || !transactionId) {
            throw new Error('householdId, fromPoolId, toPoolId, and transactionId are required');
        }
        if (fromPoolId === toPoolId) return true;

        const store = await this._loadStore();
        const fromPool = store.budgetPools.get(fromPoolId);
        const toPool = store.budgetPools.get(toPoolId);

        if (!fromPool || fromPool.householdId !== householdId) {
            throw new Error(`Source budget pool '${fromPoolId}' not found`);
        }
        if (!toPool || toPool.householdId !== householdId) {
            throw new Error(`Target budget pool '${toPoolId}' not found`);
        }

        const targetExpense = (fromPool.linkedExpenses || []).find(e => e.transactionId === transactionId);
        if (!targetExpense) {
            throw new Error('TRANSACTION_NOT_FOUND_IN_SOURCE_POOL');
        }

        const candidate = this._cloneStore(store);
        const candidateFrom = candidate.budgetPools.get(fromPoolId);
        const candidateTo = candidate.budgetPools.get(toPoolId);

        candidateFrom.linkedExpenses = (candidateFrom.linkedExpenses || []).filter(e => e.transactionId !== transactionId);
        candidateFrom.updatedAt = new Date().toISOString();

        candidateTo.linkedExpenses = [...(candidateTo.linkedExpenses || []), { ...targetExpense, linkedAtUtc: new Date().toISOString() }];
        candidateTo.updatedAt = new Date().toISOString();

        candidate.budgetPools.set(fromPoolId, candidateFrom);
        candidate.budgetPools.set(toPoolId, candidateTo);

        await this._persistStore(candidate);
        return true;
    }

    // -------------------------------------------------------------
    // PHASE 10: FORECAST SCENARIOS & MEMBER INCOME STREAMS
    // -------------------------------------------------------------

    async getForecastScenarios(householdId) {
        if (!householdId) return [];
        const store = await this._loadStore();
        const list = Array.from(store.forecastScenarios ? store.forecastScenarios.values() : []);
        return list.filter(s => s.householdId === householdId).map(s => JSON.parse(JSON.stringify(s)));
    }

    async getForecastScenario(householdId, scenarioId) {
        if (!householdId || !scenarioId) return null;
        const store = await this._loadStore();
        const sc = store.forecastScenarios ? store.forecastScenarios.get(scenarioId) : null;
        if (!sc || sc.householdId !== householdId) return null;
        return JSON.parse(JSON.stringify(sc));
    }

    async saveForecastScenario(householdId, scenarioData) {
        if (!householdId) throw new Error('householdId is required');
        if (!scenarioData || typeof scenarioData !== 'object') throw new Error('scenarioData must be an object');

        const store = await this._loadStore();
        const id = scenarioData.id || `sc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const existing = store.forecastScenarios ? store.forecastScenarios.get(id) : null;

        // Timestamps strictly generated at persistence boundary
        const now = new Date().toISOString();
        const record = {
            ...scenarioData,
            id,
            householdId,
            createdAt: existing ? existing.createdAt : (scenarioData.createdAt || now),
            updatedAt: now
        };

        const candidate = this._cloneStore(store);
        if (!candidate.forecastScenarios) candidate.forecastScenarios = new Map();
        candidate.forecastScenarios.set(id, record);

        await this._persistStore(candidate);
        return JSON.parse(JSON.stringify(record));
    }

    async deleteForecastScenario(householdId, scenarioId) {
        if (!householdId || !scenarioId) return false;
        const store = await this._loadStore();
        const existing = store.forecastScenarios ? store.forecastScenarios.get(scenarioId) : null;
        if (!existing || existing.householdId !== householdId) return false;

        const candidate = this._cloneStore(store);
        if (candidate.forecastScenarios) {
            candidate.forecastScenarios.delete(scenarioId);
        }

        await this._persistStore(candidate);
        return true;
    }

    async getMemberIncomeStreams(householdId) {
        if (!householdId) return [];
        const store = await this._loadStore();
        const list = Array.from(store.memberIncomeStreams ? store.memberIncomeStreams.values() : []);
        return list.filter(s => s.householdId === householdId).map(s => ({ ...s }));
    }

    async saveMemberIncomeStream(householdId, streamData) {
        if (!householdId) throw new Error('householdId is required');
        if (!streamData) throw new Error('streamData is required');

        const store = await this._loadStore();
        const id = streamData.id || `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const record = {
            ...streamData,
            id,
            householdId,
            status: streamData.status || 'ACTIVE',
            createdAt: streamData.createdAt || now,
            updatedAt: now
        };

        const candidate = this._cloneStore(store);
        if (!candidate.memberIncomeStreams) candidate.memberIncomeStreams = new Map();
        candidate.memberIncomeStreams.set(id, record);

        await this._persistStore(candidate);
        return { ...record };
    }

    async deleteMemberIncomeStream(householdId, streamId) {
        if (!householdId || !streamId) return false;
        const store = await this._loadStore();
        const existing = store.memberIncomeStreams ? store.memberIncomeStreams.get(streamId) : null;
        if (!existing || existing.householdId !== householdId) return false;

        const candidate = this._cloneStore(store);
        if (candidate.memberIncomeStreams) {
            candidate.memberIncomeStreams.delete(streamId);
        }

        await this._persistStore(candidate);
        return true;
    }

    // -------------------------------------------------------------
    // PHASE 11: FAMILY GOALS & MILESTONES
    // -------------------------------------------------------------

    async getGoals(householdId) {
        if (!householdId) return [];
        const store = await this._loadStore();
        const list = Array.from(store.goals ? store.goals.values() : []);
        return list.filter(g => g.householdId === householdId).map(g => JSON.parse(JSON.stringify(g)));
    }

    async getGoalById(householdId, goalId) {
        if (!householdId || !goalId) return null;
        const store = await this._loadStore();
        const goal = store.goals ? store.goals.get(goalId) : null;
        if (!goal || goal.householdId !== householdId) return null;
        return JSON.parse(JSON.stringify(goal));
    }

    async saveGoal(householdId, goalData) {
        if (!householdId) throw new Error('householdId is required');
        if (!goalData) throw new Error('goalData is required');

        const store = await this._loadStore();
        const id = goalData.id || `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const now = new Date().toISOString();

        const record = {
            id,
            householdId,
            title: goalData.title || 'Untitled Goal',
            description: goalData.description || null,
            category: goalData.category || 'OTHER',
            priority: goalData.priority || 'IMPORTANT',
            targetAmount: goalData.targetAmount,
            currency: goalData.currency || 'INR',
            targetDateUtc: goalData.targetDateUtc,
            status: goalData.status || 'ACTIVE',
            milestones: Array.isArray(goalData.milestones) ? JSON.parse(JSON.stringify(goalData.milestones)) : [],
            pledges: Array.isArray(goalData.pledges) ? JSON.parse(JSON.stringify(goalData.pledges)) : [],
            linkedAssets: Array.isArray(goalData.linkedAssets) ? JSON.parse(JSON.stringify(goalData.linkedAssets)) : [],
            accumulations: Array.isArray(goalData.accumulations) ? JSON.parse(JSON.stringify(goalData.accumulations)) : [],
            phase10SurplusAllocationPercent: typeof goalData.phase10SurplusAllocationPercent === 'number'
                ? goalData.phase10SurplusAllocationPercent
                : 0,
            createdAtUtc: goalData.createdAtUtc || now,
            updatedAtUtc: now
        };

        const candidate = this._cloneStore(store);
        if (!candidate.goals) candidate.goals = new Map();
        candidate.goals.set(id, record);

        await this._persistStore(candidate);
        return JSON.parse(JSON.stringify(record));
    }

    async deleteGoal(householdId, goalId) {
        if (!householdId || !goalId) return false;
        const store = await this._loadStore();
        const existing = store.goals ? store.goals.get(goalId) : null;
        if (!existing || existing.householdId !== householdId) return false;

        const candidate = this._cloneStore(store);
        if (candidate.goals) {
            candidate.goals.delete(goalId);
        }

        await this._persistStore(candidate);
        return true;
    }
}

export const FamilyRepository = new FamilyRepositoryClass();

