/**
 * services/family/familyFinancialService.js
 * 
 * Domain Service for FinLife Family OS Phase 6:
 * Family Financial Coordination & Shared Obligations.
 * Bridges household members and responsibility domains to existing commitments
 * without introducing secondary ledgers or balance mutations.
 */

import { FamilyRepository } from './familyRepository.js';
import { CommitmentsService } from '../commitments/commitmentsService.js';
import {
    createEmptyFinancialLink,
    validateFinancialLink,
    computeHouseholdFinancialSummaryPure,
    normalizeCommitmentMonthlyPaise,
    parseCommitmentAmountPaise
} from './familyContracts.js';

class FamilyFinancialServiceClass {
    async _loadAllCommitments(options = {}) {
        const {commitments = []} = await CommitmentsService.load({...options,mode:'PRODUCTION',readOnly:true});
        return commitments;
    }

    /**
     * List all financial links for a household with enriched person, commitment, and domain details
     */
    async listHouseholdFinancialLinks(householdId, options = {}) {
        if (!householdId) return [];

        const links = await FamilyRepository.listFinancialLinks({ householdId, ...options });
        const commitments = await this._loadAllCommitments(options);
        const commitmentMap = new Map(commitments.map(c => [c.id, c]));

        return await Promise.all(links.map(link => this._enrichFinancialLink(link, commitmentMap)));
    }

    /**
     * Get a single financial link by ID with full enrichment
     */
    async getFinancialLink(id, options = {}) {
        if (!id) return null;
        const link = await FamilyRepository.getFinancialLink(id);
        if (!link) return null;

        const commitments = await this._loadAllCommitments(options);
        const commitmentMap = new Map(commitments.map(c => [c.id, c]));
        return await this._enrichFinancialLink(link, commitmentMap);
    }

    /**
     * Link an existing commitment to a household member and optional responsibility domain
     */
    async linkCommitment(data, options = {}) {
        const linkData = createEmptyFinancialLink(data);
        validateFinancialLink(linkData);

        const saved = await FamilyRepository.upsertFinancialLink(linkData);
        return await this.getFinancialLink(saved.id, options);
    }

    /**
     * Update an existing financial link (payer, backup, domain, or notes)
     */
    async updateFinancialLink(id, updates, options = {}) {
        if (!id) throw new Error('Financial link id is required');
        const existing = await FamilyRepository.getFinancialLink(id);
        if (!existing) {
            throw new Error(`Financial link with id '${id}' does not exist`);
        }

        const allowedFields = ['leadPayerPersonId', 'backupPayerPersonId', 'responsibilityId', 'notes', 'isArchived'];
        const updated = { ...existing };
        for (const field of allowedFields) {
            if (updates[field] !== undefined) {
                updated[field] = updates[field];
            }
        }

        validateFinancialLink(updated);
        const saved = await FamilyRepository.upsertFinancialLink(updated);
        return await this.getFinancialLink(saved.id, options);
    }

    /**
     * Unlink a commitment from the household.
     * NEGATIVE BOUNDARY: Deletes the link record only; never touches the underlying commitment or cashbook ledger.
     */
    async unlinkCommitment(id) {
        return await FamilyRepository.deleteFinancialLink(id);
    }

    /**
     * Compute authoritative household financial summary using pure domain evaluator
     */
    async getHouseholdFinancialSummary(householdId, options = {}) {
        if (!householdId) {
            throw new Error('Household id is required to compute financial summary');
        }

        const referenceDate = options.referenceDate || new Date().toISOString();

        // 1. Fetch commitments from CommitmentsService
        const commitments = await this._loadAllCommitments(options);

        // 2. Fetch links for this household
        const links = await FamilyRepository.listFinancialLinks({ householdId });

        // 3. Fetch members for this household
        const memberships = await FamilyRepository.listMemberships({ householdId });
        const activeMemberships = memberships.filter(m => m.status === 'ACTIVE' || m.status === 'PROVISIONAL_PENDING_CONFIRMATION');
        const memberPersons = await Promise.all(
            activeMemberships.map(async m => {
                const p = await FamilyRepository.getPerson(m.personId);
                return p ? { ...p, role: m.role } : null;
            })
        );
        const validMembers = memberPersons.filter(Boolean);

        // 4. Fetch responsibilities for this household
        const responsibilities = await FamilyRepository.listResponsibilities({ householdId, includeArchived: false });

        // 5. Evaluate pure summary
        return computeHouseholdFinancialSummaryPure({
            commitments,
            links,
            members: validMembers,
            responsibilities,
            referenceDate
        });
    }

    /**
     * Get available commitments that are not yet linked to this household
     */
    async getUnlinkedCommitments(householdId, options = {}) {
        if (!householdId) return [];

        const [commitments, links] = await Promise.all([
            this._loadAllCommitments(options),
            FamilyRepository.listFinancialLinks({ householdId })
        ]);

        const linkedCommitmentIds = new Set(links.map(l => l.commitmentId));
        return commitments.filter(c => !linkedCommitmentIds.has(c.id));
    }

    // =========================================================================
    // INTERNAL HELPERS
    // =========================================================================

    async _enrichFinancialLink(link, commitmentMap = new Map()) {
        if (!link) return null;

        const [leadPayer, backupPayer, responsibility] = await Promise.all([
            FamilyRepository.getPerson(link.leadPayerPersonId).catch(() => null),
            link.backupPayerPersonId ? FamilyRepository.getPerson(link.backupPayerPersonId).catch(() => null) : null,
            link.responsibilityId ? FamilyRepository.getResponsibility(link.responsibilityId).catch(() => null) : null
        ]);

        const commitment = commitmentMap.get(link.commitmentId) || null;
        let monthlyPaise = null;
        let commitmentAmountPaise = null;

        if (commitment) {
            monthlyPaise = normalizeCommitmentMonthlyPaise(commitment, link.createdAt).toString();
            commitmentAmountPaise = parseCommitmentAmountPaise(commitment.amount).toString();
        }

        return {
            ...link,
            leadPayerName: leadPayer ? (leadPayer.fullName || leadPayer.displayName || `${leadPayer.firstName || ''} ${leadPayer.lastName || ''}`.trim()) : 'Unknown Member',
            leadPayerRelationship: leadPayer ? leadPayer.relationshipToHead : null,
            backupPayerName: backupPayer ? (backupPayer.fullName || backupPayer.displayName || `${backupPayer.firstName || ''} ${backupPayer.lastName || ''}`.trim()) : null,
            responsibilityName: responsibility ? (responsibility.title || responsibility.name) : null,
            responsibilityColor: responsibility ? (responsibility.color || '#3B82F6') : null,
            sourceUnavailable: !commitment,
            commitmentName: commitment ? (commitment.name || commitment.title || 'Untitled Commitment') : 'Expense unavailable',
            commitmentCategory: commitment ? commitment.category : null,
            commitmentFrequency: commitment ? commitment.frequency : null,
            commitmentDueDate: commitment ? (commitment.nextDueDate || commitment.dueDate || null) : null,
            commitmentAmountPaise,
            monthlyPaise,
            monthlyRupees: monthlyPaise === null ? null : Number(BigInt(monthlyPaise)) / 100
        };
    }
}

export const FamilyFinancialService = new FamilyFinancialServiceClass();
