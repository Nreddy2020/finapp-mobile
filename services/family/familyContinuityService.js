/**
 * services/family/familyContinuityService.js
 * 
 * Domain Service for FinLife Family Operating System Phase 8.
 * Orchestrates the Family Emergency Readiness & Crisis Continuity Protocol.
 * 
 * Invariants:
 * 1. Read-only orchestration across authoritative Contacts, Documents, Protection, and Financial Links.
 * 2. Pure, deterministic evaluation via computeFamilyReadinessScorePure.
 * 3. Zero secondary storage, zero storage keys, zero mutations to source records.
 * 4. Two-level partitioned disclosure (Level 1 Summary vs Level 2 Protected Details).
 * 5. Zero sensitive logging and zero network transmission.
 */

import { FamilyRepository } from './familyRepository.js';
import {
    computeFamilyReadinessScorePure,
    CONTINUITY_ACCESS_LEVEL
} from './familyContracts.js';

export const FamilyContinuityService = {
    /**
     * Retrieves the complete Family Emergency Readiness & Crisis Continuity Protocol.
     * 
     * @param {string} householdId - Target household ID
     * @param {Object} [options]
     * @param {string} [options.referenceDateUtc] - Explicit UTC reference date (YYYY-MM-DD)
     * @param {string} [options.accessLevel] - LEVEL_1_SUMMARY or LEVEL_2_PROTECTED
     * @param {string} [options.currentUserRole] - Current user role in household
     * @param {boolean} [options.isAuthorizedCaregiver] - Explicit caregiver authorization flag
     * @returns {Promise<Object>} Readiness & Continuity ViewModel
     */
    async getFamilyContinuityProtocol(householdId, options = {}) {
        if (!householdId) {
            throw new Error('[FamilyContinuityService] householdId is required');
        }

        const {
            referenceDateUtc = new Date().toISOString().slice(0, 10),
            accessLevel = CONTINUITY_ACCESS_LEVEL.LEVEL_1_SUMMARY,
            currentUserRole = 'ADULT_MEMBER',
            isAuthorizedCaregiver = false
        } = options;

        // Load authoritative collections in parallel with error containment
        const [
            contactsRes,
            docsRes,
            protectionsRes,
            linksRes,
            membersRes
        ] = await Promise.allSettled([
            FamilyRepository.listEmergencyContacts(householdId),
            FamilyRepository.listDocuments({ householdId }),
            FamilyRepository.listProtectionItems(householdId),
            FamilyRepository.listFinancialLinks({ householdId }),
            FamilyRepository.getMembers(householdId)
        ]);

        if ([contactsRes,docsRes,protectionsRes,linksRes,membersRes].some(result => result.status === 'rejected')) throw new Error('Emergency records could not be loaded. Please retry.');

        const contacts = contactsRes.status === 'fulfilled' && Array.isArray(contactsRes.value)
            ? contactsRes.value
            : [];
        const documents = docsRes.status === 'fulfilled' && Array.isArray(docsRes.value)
            ? docsRes.value
            : [];
        const protectionItems = protectionsRes.status === 'fulfilled' && Array.isArray(protectionsRes.value)
            ? protectionsRes.value
            : [];
        const financialLinks = linksRes.status === 'fulfilled' && Array.isArray(linksRes.value)
            ? linksRes.value
            : [];
        const members = membersRes.status === 'fulfilled' && Array.isArray(membersRes.value)
            ? membersRes.value
            : [];

        // Delegate to pure evaluation engine
        return computeFamilyReadinessScorePure({
            householdId,
            referenceDateUtc,
            contacts: contacts.map(c => ({ ...c, phone: c.primaryPhone || c.phone, name: c.displayName || c.name, relationshipRole: c.relationship || c.relationshipRole })),
            documents: documents.map(d => ({ ...d, type: d.documentType || d.type, physicalLocationDescription: d.physicalLocation || d.physicalLocationDescription })),
            protectionItems: protectionItems.map(p => ({ ...p, type: p.protectionType || p.type, proxyPersonId: p.designatedPersonId || p.proxyPersonId })),
            financialLinks,
            members: members.map(m => ({ ...m, householdId, name: m.fullName || m.name })),
            accessLevel,
            currentUserRole,
            isAuthorizedCaregiver
        });
    }
};
