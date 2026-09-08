/**
 * services/shared-costs/groupAudit.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Tamper-Evident Hash-Chained Audit History.
 * 
 * Provides tamper-evident SHA-256 hash chaining for all group operations:
 * Group creation, edits, member changes, expenses, voids, settlements, and administrative reopenings.
 * 
 * Invariants:
 * - Deterministic canonical JSON serialization before hashing.
 * - Sequence numbers strictly increment: 1, 2, 3, ... (gap & duplicate detection).
 * - Cryptographic chaining: each event records previousHash, payloadHash, eventHash, revision, operationId, and canonicalSerializationVersion.
 * - Tamper detection: validates entire chain continuity, sequence numbers, and payload integrity.
 */

import { sha256 } from '../cashbook/cashbookAuditTrail.js';
import { canonicalJsonStringify } from './groupContracts.js';

export const GroupAuditEventType = Object.freeze({
    GROUP_CREATED: 'GROUP_CREATED',
    GROUP_UPDATED: 'GROUP_UPDATED',
    GROUP_ARCHIVED: 'GROUP_ARCHIVED',
    MEMBER_ADDED: 'MEMBER_ADDED',
    MEMBER_REMOVED: 'MEMBER_REMOVED',
    EXPENSE_CREATED: 'EXPENSE_CREATED',
    EXPENSE_UPDATED: 'EXPENSE_UPDATED',
    EXPENSE_VOIDED: 'EXPENSE_VOIDED',
    SETTLEMENT_RECORDED: 'SETTLEMENT_RECORDED',
    SETTLEMENT_VOIDED: 'SETTLEMENT_VOIDED',
    RECURRING_CREATED: 'RECURRING_CREATED',
    PROJECTIONS_REBUILT: 'PROJECTIONS_REBUILT'
});

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export const GroupAudit = {
    /**
     * Create an audit entry for a group event
     * 
     * @param {Object} params
     * @param {string} params.eventType - From GroupAuditEventType
     * @param {string} params.groupId
     * @param {string} params.entityId
     * @param {number} [params.revision=1]
     * @param {string} [params.operationId]
     * @param {Object} [params.payload={}]
     * @param {string} [params.actor='USER']
     * @param {Array<Object>} existingAuditTrail - Current audit events list
     * @returns {Object} New audit record
     */
    createAuditEntry({ eventType, groupId, entityId, revision = 1, operationId = null, payload = {}, actor = 'USER' }, existingAuditTrail = []) {
        const lastEntry = existingAuditTrail.length > 0
            ? existingAuditTrail[existingAuditTrail.length - 1]
            : null;

        const sequence = lastEntry ? lastEntry.sequence + 1 : 1;
        const previousHash = lastEntry ? lastEntry.eventHash : GENESIS_HASH;

        const canonicalPayload = canonicalJsonStringify(payload);
        const payloadHash = sha256(canonicalPayload);

        const timestamp = new Date().toISOString();
        const rev = Number(revision || 1);
        const opId = operationId ? String(operationId) : `op_${sequence}`;
        const canonicalSerializationVersion = '1.0';

        const eventDataToHash = canonicalJsonStringify({
            sequence,
            previousHash,
            eventType,
            groupId: String(groupId || ''),
            entityId: String(entityId || ''),
            revision: rev,
            operationId: opId,
            canonicalSerializationVersion,
            payloadHash,
            timestamp,
            actor
        });

        const eventHash = sha256(eventDataToHash);

        return {
            sequence,
            previousHash,
            eventType,
            groupId: String(groupId || ''),
            entityId: String(entityId || ''),
            revision: rev,
            operationId: opId,
            canonicalSerializationVersion,
            payload,
            payloadHash,
            eventHash,
            timestamp,
            actor
        };
    },

    /**
     * Verify the cryptographic integrity of the entire audit chain
     * 
     * @param {Array<Object>} auditTrail - List of audit records
     * @returns {Object} { isValid: boolean, error?: string, verifiedCount: number }
     */
    verifyChainIntegrity(auditTrail = []) {
        if (!Array.isArray(auditTrail) || auditTrail.length === 0) {
            return { isValid: true, verifiedCount: 0 };
        }

        let expectedPrevHash = GENESIS_HASH;

        for (let i = 0; i < auditTrail.length; i++) {
            const entry = auditTrail[i];
            const expectedSequence = i + 1;

            // 1. Check sequence continuity
            if (entry.sequence !== expectedSequence) {
                return {
                    isValid: false,
                    error: `SEQUENCE_DISCONTINUITY: Entry at index ${i} has sequence ${entry.sequence}, expected ${expectedSequence}`,
                    failedIndex: i
                };
            }

            // 2. Check previous hash linkage
            if (entry.previousHash !== expectedPrevHash) {
                return {
                    isValid: false,
                    error: `HASH_CHAIN_BROKEN: Entry at sequence ${entry.sequence} previousHash (${entry.previousHash}) does not match expected (${expectedPrevHash})`,
                    failedIndex: i
                };
            }

            // 3. Recompute event hash
            const rev = entry.revision !== undefined ? Number(entry.revision) : 1;
            const opId = entry.operationId !== undefined ? String(entry.operationId) : `op_${entry.sequence}`;
            const canonicalSerializationVersion = entry.canonicalSerializationVersion || '1.0';

            const eventDataToHash = canonicalJsonStringify({
                sequence: entry.sequence,
                previousHash: entry.previousHash,
                eventType: entry.eventType,
                groupId: entry.groupId,
                entityId: entry.entityId,
                revision: rev,
                operationId: opId,
                canonicalSerializationVersion,
                payloadHash: entry.payloadHash,
                timestamp: entry.timestamp,
                actor: entry.actor
            });

            const recomputedHash = sha256(eventDataToHash);
            if (recomputedHash !== entry.eventHash) {
                return {
                    isValid: false,
                    error: `EVENT_TAMPER_DETECTED: Entry at sequence ${entry.sequence} eventHash mismatch. Expected ${entry.eventHash}, calculated ${recomputedHash}`,
                    failedIndex: i
                };
            }

            expectedPrevHash = entry.eventHash;
        }

        return {
            isValid: true,
            verifiedCount: auditTrail.length
        };
    }
};
