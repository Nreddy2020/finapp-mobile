/**
 * services/family/familyProtectionService.js
 * 
 * Domain Service for FinLife Family OS Phase 5:
 * Family Protection & Emergency Readiness.
 * Coordinates Emergency Contacts, Protection Directives, and Explainable Readiness Evaluation.
 */

import { FamilyRepository } from './familyRepository.js';
import { FamilyDocumentService } from './familyDocumentService.js';
import {
    createEmptyEmergencyContact,
    createEmptyProtectionItem,
    validateEmergencyContact,
    validateProtectionItem,
    evaluateHouseholdReadinessPure,
    EmergencyContactType,
    ProtectionType,
    ProtectionStatus,
    ReadinessLevel,
    DimensionStatus
} from './familyContracts.js';

class FamilyProtectionServiceClass {
    // =========================================================================
    // EMERGENCY CONTACTS
    // =========================================================================

    /**
     * List emergency contacts for a household with resolved member names
     */
    async listEmergencyContacts(householdId, options = {}) {
        if (!householdId) return [];
        const contacts = await FamilyRepository.listEmergencyContacts(householdId, options);
        return await Promise.all(contacts.map(c => this._enrichEmergencyContact(c)));
    }

    /**
     * Get a single emergency contact by ID
     */
    async getEmergencyContact(id) {
        if (!id) return null;
        const contact = await FamilyRepository.getEmergencyContact(id);
        if (!contact) return null;
        return await this._enrichEmergencyContact(contact);
    }

    /**
     * Create or update an emergency contact
     */
    async saveEmergencyContact(data) {
        let contact = data.id ? await FamilyRepository.getEmergencyContact(data.id) : null;
        if (!contact) {
            // Determine next priority order if not explicitly set
            if (!Number.isInteger(data.priorityOrder) || data.priorityOrder < 1) {
                const existing = await FamilyRepository.listEmergencyContacts(data.householdId, { includeArchived: true });
                data.priorityOrder = existing.length + 1;
            }
            contact = createEmptyEmergencyContact(data);
        } else {
            contact = {
                ...contact,
                ...data,
                updatedAt: new Date().toISOString()
            };
        }

        validateEmergencyContact(contact);
        const saved = await FamilyRepository.upsertEmergencyContact(contact);
        return await this._enrichEmergencyContact(saved);
    }

    /**
     * Archive an emergency contact
     */
    async archiveEmergencyContact(id) {
        const archived = await FamilyRepository.archiveEmergencyContact(id);
        return await this._enrichEmergencyContact(archived);
    }

    /**
     * Physically delete an emergency contact
     */
    async deleteEmergencyContact(id) {
        return await FamilyRepository.deleteEmergencyContact(id);
    }

    /**
     * Reorder emergency contacts priority order
     */
    async reorderEmergencyContacts(householdId, orderedIds) {
        const updated = await FamilyRepository.reorderEmergencyContacts(householdId, orderedIds);
        return await Promise.all(updated.map(c => this._enrichEmergencyContact(c)));
    }

    // =========================================================================
    // PROTECTION DIRECTIVES & ITEMS
    // =========================================================================

    /**
     * List protection items for a household with resolved names & document titles
     */
    async listProtectionItems(householdId, options = {}) {
        if (!householdId) return [];
        const items = await FamilyRepository.listProtectionItems(householdId, options);
        return await Promise.all(items.map(p => this._enrichProtectionItem(p)));
    }

    /**
     * Get single protection item by ID
     */
    async getProtectionItem(id) {
        if (!id) return null;
        const item = await FamilyRepository.getProtectionItem(id);
        if (!item) return null;
        return await this._enrichProtectionItem(item);
    }

    /**
     * Create or update a protection item
     */
    async saveProtectionItem(data) {
        let item = data.id ? await FamilyRepository.getProtectionItem(data.id) : null;
        if (!item) {
            item = createEmptyProtectionItem(data);
        } else {
            item = {
                ...item,
                ...data,
                updatedAt: new Date().toISOString()
            };
        }

        validateProtectionItem(item);
        const saved = await FamilyRepository.upsertProtectionItem(item);
        return await this._enrichProtectionItem(saved);
    }

    /**
     * Archive a protection item
     */
    async archiveProtectionItem(id) {
        const archived = await FamilyRepository.archiveProtectionItem(id);
        return await this._enrichProtectionItem(archived);
    }

    /**
     * Physically delete a protection item
     */
    async deleteProtectionItem(id) {
        return await FamilyRepository.deleteProtectionItem(id);
    }

    // =========================================================================
    // DETERMINISTIC FAMILY READINESS EVALUATION
    // =========================================================================

    /**
     * Authoritative Family Readiness Audit
     * Synthesizes 5 verifiable dimensions into an explainable audit report
     */
    async evaluateReadiness(householdId) {
        if (!householdId) {
            return evaluateHouseholdReadinessPure({ householdId: null });
        }

        const [emergencyContacts, protectionItems, documents] = await Promise.all([
            FamilyRepository.listEmergencyContacts(householdId, { includeArchived: true }),
            FamilyRepository.listProtectionItems(householdId, { includeArchived: true }),
            FamilyDocumentService.listDocuments({ householdId, includeArchived: true })
        ]);

        return evaluateHouseholdReadinessPure({
            householdId,
            emergencyContacts,
            protectionItems,
            documents
        });
    }

    // =========================================================================
    // ENRICHMENT & HELPERS
    // =========================================================================

    async _enrichEmergencyContact(contact) {
        let linkedPersonName = null;
        if (contact.personId) {
            const person = await FamilyRepository.getPerson(contact.personId);
            linkedPersonName = person ? (person.preferredName || person.fullName) : null;
        }

        return {
            ...contact,
            linkedPersonName,
            isInternalMember: Boolean(contact.personId),
            isTrustedCircle: Boolean(contact.trustedCircleMemberId),
            isExternalThirdParty: !contact.personId && !contact.trustedCircleMemberId
        };
    }

    async _enrichProtectionItem(item) {
        const [designatedPerson, backupPerson, subjectPerson, linkedDoc] = await Promise.all([
            item.designatedPersonId ? FamilyRepository.getPerson(item.designatedPersonId) : null,
            item.designatedBackupPersonId ? FamilyRepository.getPerson(item.designatedBackupPersonId) : null,
            item.subjectPersonId ? FamilyRepository.getPerson(item.subjectPersonId) : null,
            item.documentId ? FamilyRepository.getDocument(item.documentId) : null
        ]);

        return {
            ...item,
            designatedPersonName: designatedPerson ? (designatedPerson.preferredName || designatedPerson.fullName) : null,
            designatedBackupPersonName: backupPerson ? (backupPerson.preferredName || backupPerson.fullName) : null,
            subjectPersonName: subjectPerson ? (subjectPerson.preferredName || subjectPerson.fullName) : 'Household-Wide',
            linkedDocumentTitle: linkedDoc ? linkedDoc.title : null
        };
    }
}

export const FamilyProtectionService = new FamilyProtectionServiceClass();
