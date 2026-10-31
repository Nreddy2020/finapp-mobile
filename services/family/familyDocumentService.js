/**
 * services/family/familyDocumentService.js
 * 
 * Domain Service for Family Documents & Records Registry.
 * 
 * Strict Governance Invariants:
 * 1. Zero readiness scoring / composite health algorithms (deferred to Phase 5).
 * 2. Zero financial ledger or budget coordination (deferred to future financial phases).
 * 3. Zero tasks / operations automation (deferred to Phase 4).
 * 4. Diagnostic Privacy: Raw identifier numbers, notes, and fileUri are never written to logs or telemetry.
 * 5. Timezone-Independent Expiry: All date calculations use UTC calendar day differences.
 * 6. Deletion Policy:
 *    - archiveDocument: Normal user action; preserves historical record.
 *    - deleteDocument: Administrative physical delete.
 *    - Household deletion cascades document cleanup, preserving Person entities intact.
 *    - Archiving a Person preserves all historical documents intact.
 */

import { FamilyRepository } from './familyRepository.js';
import {
    createEmptyDocument,
    computeDocumentExpiryStatus,
    maskIdentifier,
    DocumentCategory,
    DocumentStatus,
    ExpiryStatus,
    assertSafeNumbers
} from './familyContracts.js';

export const FamilyDocumentService = {
    /**
     * Create a new family document record
     * @param {object} data 
     * @param {object} options 
     */
    async createDocument(data = {}, options = {}) {
        const doc = createEmptyDocument(data);
        assertSafeNumbers(doc);
        const saved = await FamilyRepository.upsertDocument(doc, options);
        return this._enrichDocument(saved, options.referenceDate);
    },

    /**
     * Update an existing family document
     * @param {string} id 
     * @param {object} updates 
     * @param {object} options 
     */
    async updateDocument(id, updates = {}, options = {}) {
        if (!id) throw new Error('Document id is required for update');
        const existing = await FamilyRepository.getDocument(id);
        if (!existing) throw new Error(`Document with id '${id}' not found`);

        // Guard against accidental cross-household reassignment without explicit permission
        if (updates.householdId && updates.householdId !== existing.householdId && !options.allowHouseholdReassignment) {
            throw new Error(`Cannot reassign document '${id}' across households without explicit allowHouseholdReassignment flag`);
        }

        const merged = {
            ...existing,
            ...updates,
            id: existing.id,
            createdAt: existing.createdAt
        };

        assertSafeNumbers(merged);
        const saved = await FamilyRepository.upsertDocument(merged, options);
        return this._enrichDocument(saved, options.referenceDate);
    },

    /**
     * Archive a document (preserves historical record)
     * @param {string} id 
     */
    async archiveDocument(id) {
        if (!id) throw new Error('Document id is required for archive');
        const archived = await FamilyRepository.archiveDocument(id);
        return this._enrichDocument(archived);
    },

    /**
     * Physically delete a document from the registry
     * @param {string} id 
     */
    async deleteDocument(id) {
        if (!id) throw new Error('Document id is required for delete');
        return await FamilyRepository.deleteDocument(id);
    },

    /**
     * Get a single document by id enriched with derived expiry projections and masked identifier
     * @param {string} id 
     * @param {string|Date} referenceDate 
     */
    async getDocument(id, referenceDate = new Date()) {
        if (!id) return null;
        const doc = await FamilyRepository.getDocument(id);
        return doc ? this._enrichDocument(doc, referenceDate) : null;
    },

    /**
     * List documents matching filters with full derived expiry projections
     * @param {object|string} filters 
     * @param {string|Date} referenceDate 
     */
    async listDocuments(filters = {}, referenceDate = new Date()) {
        const filterObj = typeof filters === 'string' ? { householdId: filters } : (filters || {});
        const refDate = (referenceDate instanceof Date || (typeof referenceDate === 'string' && referenceDate.trim())) ? referenceDate : new Date();
        const rawList = await FamilyRepository.listDocuments(filterObj);
        let enrichedList = rawList.map(doc => this._enrichDocument(doc, refDate));

        // Filter by computed expiry status if requested
        if (filterObj.expiryStatus) {
            enrichedList = enrichedList.filter(d => d.expiryStatus === filterObj.expiryStatus);
        }

        // Filter by physical location if requested (case-insensitive substring)
        if (filterObj.physicalLocation) {
            const locQuery = filterObj.physicalLocation.trim().toLowerCase();
            enrichedList = enrichedList.filter(d => 
                typeof d.physicalLocation === 'string' && d.physicalLocation.toLowerCase().includes(locQuery)
            );
        }

        // Search query filter (matches title, documentType, notes, and tags)
        if (filterObj.searchQuery) {
            const q = filters.searchQuery.trim().toLowerCase();
            if (q) {
                enrichedList = enrichedList.filter(d => {
                    const matchTitle = typeof d.title === 'string' && d.title.toLowerCase().includes(q);
                    const matchType = typeof d.documentType === 'string' && d.documentType.toLowerCase().includes(q);
                    const matchNotes = typeof d.notes === 'string' && d.notes.toLowerCase().includes(q);
                    const matchTags = Array.isArray(d.tags) && d.tags.some(t => String(t).toLowerCase().includes(q));
                    return matchTitle || matchType || matchNotes || matchTags;
                });
            }
        }

        return enrichedList;
    },

    /**
     * Retrieve all active documents that are expiring soon or expired for a household
     * @param {string} householdId 
     * @param {number} withinDays 
     * @param {string|Date} referenceDate 
     */
    async getExpiringDocuments(householdId, withinDays = 90, referenceDate = new Date()) {
        if (!householdId) throw new Error('Household id is required');
        const activeDocs = await this.listDocuments({ householdId, includeArchived: false }, referenceDate);
        return activeDocs.filter(d => d.expiryStatus === ExpiryStatus.EXPIRING_SOON || d.expiryStatus === ExpiryStatus.EXPIRED);
    },

    /**
     * Extract deduplicated physical locations and document counts for a household
     * Excludes archived documents.
     * @param {string} householdId 
     */
    async getPhysicalLocations(householdId) {
        if (!householdId) throw new Error('Household id is required');
        const activeDocs = await FamilyRepository.listDocuments({ householdId, includeArchived: false });
        const locationMap = new Map();

        for (const doc of activeDocs) {
            if (doc.physicalLocation && typeof doc.physicalLocation === 'string') {
                const loc = doc.physicalLocation.trim();
                if (loc) {
                    locationMap.set(loc, (locationMap.get(loc) || 0) + 1);
                }
            }
        }

        return Array.from(locationMap.entries()).map(([location, count]) => ({
            location,
            count
        })).sort((a, b) => b.count - a.count);
    },

    /**
     * Compute authoritative registry summary metrics for a household
     * Invariants:
     * - Strictly excludes archived documents from active counts.
     * - Zero fake readiness scoring or completion formulas.
     * @param {string} householdId 
     * @param {string|Date} referenceDate 
     */
    async getSummaryMetrics(householdId, referenceDate = new Date()) {
        if (!householdId) throw new Error('Household id is required');
        const activeDocs = await this.listDocuments({ householdId, includeArchived: false }, referenceDate);

        let expiringSoon = 0;
        let expired = 0;
        let valid = 0;
        let noExpiry = 0;
        const uniqueLocations = new Set();

        for (const doc of activeDocs) {
            if (doc.expiryStatus === ExpiryStatus.EXPIRING_SOON) expiringSoon++;
            else if (doc.expiryStatus === ExpiryStatus.EXPIRED) expired++;
            else if (doc.expiryStatus === ExpiryStatus.VALID) valid++;
            else if (doc.expiryStatus === ExpiryStatus.NO_EXPIRY) noExpiry++;

            if (doc.physicalLocation && typeof doc.physicalLocation === 'string') {
                const loc = doc.physicalLocation.trim();
                if (loc) uniqueLocations.add(loc);
            }
        }

        return {
            totalDocuments: activeDocs.length,
            expiringSoon,
            expired,
            valid,
            noExpiry,
            physicalLocationsCount: uniqueLocations.size
        };
    },

    /**
     * Enrich a raw document record with derived expiry projections and masked identifier
     * @private
     */
    _enrichDocument(doc, referenceDate = new Date()) {
        if (!doc) return null;
        const expiry = computeDocumentExpiryStatus(doc.expiryDate, referenceDate);
        return {
            ...doc,
            tags: Array.isArray(doc.tags) ? [...doc.tags] : [],
            expiryStatus: expiry.expiryStatus,
            daysRemaining: expiry.daysRemaining,
            isExpiringSoon: expiry.isExpiringSoon,
            isExpired: expiry.isExpired,
            maskedIdentifier: maskIdentifier(doc.identifierNumber)
        };
    }
};
