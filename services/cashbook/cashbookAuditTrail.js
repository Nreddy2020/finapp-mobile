/**
 * services/cashbook/cashbookAuditTrail.js
 * 
 * Immutable, SHA-256 hash-chained audit logging for all ledger events.
 * 
 * Invariants:
 * - Deterministic canonical JSON serialization before hashing.
 * - Sequence numbers strictly increment: 1, 2, 3, ... (gap & duplicate detection).
 * - Cryptographic chaining: each event records previousHash, payloadHash, and eventHash.
 * - Tamper detection: verifies sequence continuity, hash chain integrity, and payload integrity.
 */

import { canonicalJsonStringify } from './cashbookContracts.js';

export const AuditEventType = Object.freeze({
    TRANSACTION_POSTED: 'TRANSACTION_POSTED',
    TRANSACTION_UPDATED: 'TRANSACTION_UPDATED',
    TRANSACTION_VOIDED: 'TRANSACTION_VOIDED',
    ACCOUNT_CREATED: 'ACCOUNT_CREATED',
    OPENING_BALANCE_SET: 'OPENING_BALANCE_SET',
    ADJUSTMENT_POSTED: 'ADJUSTMENT_POSTED',
    BOOK_CREATED: 'BOOK_CREATED',
    BOOK_UPDATED: 'BOOK_UPDATED',
    DAILY_CLOSING_SAVED: 'DAILY_CLOSING_SAVED',
    DAILY_CLOSING_LOCKED: 'DAILY_CLOSING_LOCKED',
    MIGRATION_EXECUTED: 'MIGRATION_EXECUTED',
    BACKUP_RESTORED: 'BACKUP_RESTORED'
});

export const AuditActor = Object.freeze({
    USER: 'USER',
    SYSTEM: 'SYSTEM',
    MIGRATION: 'MIGRATION',
    RESTORE: 'RESTORE'
});

export const AuditSource = Object.freeze({
    MANUAL: 'MANUAL',
    SMS_PARSER: 'SMS_PARSER',
    RECURRING_SYNC: 'RECURRING_SYNC',
    SYSTEM: 'SYSTEM'
});

export const GENESIS_PREVIOUS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Pure JavaScript SHA-256 implementation.
 * Zero external dependencies; guaranteed deterministic across Node.js, Hermes, and Web.
 */
export function sha256(ascii) {
    function rightRotate(value, amount) {
        return (value >>> amount) | (value << (32 - amount));
    }

    const mathPow = Math.pow;
    const maxWord = mathPow(2, 32);
    let lengthProperty = 'length';
    let i, j;
    let result = '';

    const words = [];
    const asciiBitLength = ascii[lengthProperty] * 8;

    let hash = [];
    const k = [];
    let primeCounter = 0;

    const isComposite = {};
    for (let candidate = 2; primeCounter < 64; candidate++) {
        if (!isComposite[candidate]) {
            for (i = candidate * candidate; i < 312; i += candidate) {
                isComposite[i] = true;
            }
            if (primeCounter < 8) {
                hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
            }
            k[primeCounter] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
            primeCounter++;
        }
    }

    ascii += '\x80';
    while ((ascii[lengthProperty] % 64) - 56) ascii += '\x00';
    for (i = 0; i < ascii[lengthProperty]; i++) {
        j = ascii.charCodeAt(i);
        if (j >> 8) return; // Non-ASCII string
        words[i >> 2] |= j << (((3 - i) % 4) * 8);
    }
    words[words[lengthProperty]] = (asciiBitLength / maxWord) | 0;
    words[words[lengthProperty]] = asciiBitLength;

    for (j = 0; j < words[lengthProperty];) {
        const w = words.slice(j, (j += 16));
        const oldHash = hash;
        hash = hash.slice(0, 8);

        for (i = 0; i < 64; i++) {
            const w15 = w[i - 15],
                w2 = w[i - 2];
            const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
            const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
            const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
            const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
            const temp1 =
                hash[7] +
                (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) +
                ch +
                k[i] +
                (w[i] =
                    i < 16
                        ? w[i]
                        : (w[i - 16] + s0 + w[i - 7] + s1) | 0);
            const temp2 =
                (rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) +
                maj;

            hash = [(temp1 + temp2) | 0].concat(hash);
            hash[4] = (hash[4] + temp1) | 0;
            hash.pop();
        }

        for (i = 0; i < 8; i++) {
            hash[i] = (hash[i] + oldHash[i]) | 0;
        }
    }

    for (i = 0; i < 8; i++) {
        for (j = 3; j + 1; j--) {
            const b = (hash[i] >> (j * 8)) & 255;
            result += (b < 16 ? '0' : '') + b.toString(16);
        }
    }
    return result;
}

/**
 * Creates an append-only, hash-chained audit event.
 */
export function createAuditEvent({
    lastEvent = null,
    eventType,
    entityId,
    payload,
    actor = AuditActor.USER,
    source = AuditSource.MANUAL,
    timestamp = new Date().toISOString()
}) {
    if (!eventType || !Object.values(AuditEventType).includes(eventType)) {
        throw new Error(`Invalid AuditEventType: ${eventType}`);
    }
    if (!entityId || typeof entityId !== 'string') {
        throw new Error('entityId is required');
    }

    const sequence = lastEvent ? lastEvent.sequence + 1 : 1;
    const previousHash = lastEvent ? lastEvent.eventHash : GENESIS_PREVIOUS_HASH;

    // Canonical payload hashing
    const canonicalPayload = canonicalJsonStringify(payload || {});
    const payloadHash = sha256(canonicalPayload);

    // Event content for signature hashing
    const eventPreimage = {
        sequence,
        eventType,
        entityId,
        previousHash,
        payloadHash,
        actor,
        source,
        timestamp
    };
    const eventHash = sha256(canonicalJsonStringify(eventPreimage));

    return {
        sequence,
        eventId: `audit_${sequence}_${Date.now()}_${eventHash.substring(0, 8)}`,
        eventType,
        entityId,
        previousHash,
        eventHash,
        payloadHash,
        payload: payload || {},
        actor,
        source,
        timestamp
    };
}

/**
 * Verifies the complete integrity of an audit log.
 * Detects sequence gaps, duplicate sequences, genesis mismatches, hash breaks, and payload tampering.
 */
export function verifyAuditTrail(auditLog) {
    if (!Array.isArray(auditLog)) {
        return { isValid: false, reason: 'Audit log must be an array' };
    }
    if (auditLog.length === 0) {
        return { isValid: true, eventCount: 0 };
    }

    for (let i = 0; i < auditLog.length; i++) {
        const event = auditLog[i];

        // 1. Sequence check
        const expectedSequence = i + 1;
        if (event.sequence !== expectedSequence) {
            return {
                isValid: false,
                reason: `Sequence break at index ${i}: expected sequence ${expectedSequence}, found ${event.sequence}`,
                eventIndex: i
            };
        }

        // 2. Previous hash check
        const expectedPreviousHash = i === 0 ? GENESIS_PREVIOUS_HASH : auditLog[i - 1].eventHash;
        if (event.previousHash !== expectedPreviousHash) {
            return {
                isValid: false,
                reason: `Previous hash mismatch at sequence ${event.sequence}: expected ${expectedPreviousHash}, found ${event.previousHash}`,
                eventIndex: i
            };
        }

        // 3. Payload hash integrity
        const recomputedPayloadHash = sha256(canonicalJsonStringify(event.payload || {}));
        if (event.payloadHash !== recomputedPayloadHash) {
            return {
                isValid: false,
                reason: `Payload hash tampering detected at sequence ${event.sequence}`,
                eventIndex: i
            };
        }

        // 4. Event hash integrity
        const eventPreimage = {
            sequence: event.sequence,
            eventType: event.eventType,
            entityId: event.entityId,
            previousHash: event.previousHash,
            payloadHash: event.payloadHash,
            actor: event.actor,
            source: event.source,
            timestamp: event.timestamp
        };
        const recomputedEventHash = sha256(canonicalJsonStringify(eventPreimage));
        if (event.eventHash !== recomputedEventHash) {
            return {
                isValid: false,
                reason: `Event hash tampering detected at sequence ${event.sequence}`,
                eventIndex: i
            };
        }
    }

    return {
        isValid: true,
        eventCount: auditLog.length,
        latestHash: auditLog[auditLog.length - 1].eventHash
    };
}
