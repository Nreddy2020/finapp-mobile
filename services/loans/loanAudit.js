/**
 * services/loans/loanAudit.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Cryptographic Audit Trail.
 * Implements append-only SHA-256 hash-chained audit logs for all loan events.
 */

import { sha256 } from '../cashbook/cashbookAuditTrail.js';

export function computeSha256(data) {
    const serialized = typeof data === 'string' 
        ? data 
        : JSON.stringify(data, (k, v) => typeof v === 'bigint' ? v.toString() : v);
    return sha256(serialized);
}

export class LoanAuditTrail {
    constructor(initialEvents = []) {
        this.events = [...initialEvents];
    }

    getEvents() {
        return [...this.events];
    }

    appendEvent(eventType, payload, metadata = {}) {
        const previousHash = this.events.length > 0 
            ? this.events[this.events.length - 1].hash 
            : '0000000000000000000000000000000000000000000000000000000000000000';

        const timestamp = new Date().toISOString();
        const eventData = {
            id: `LN_AUDIT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            eventType,
            payload,
            metadata,
            previousHash,
            timestamp
        };

        const hash = computeSha256(eventData);
        const signedEvent = { ...eventData, hash };
        this.events.push(signedEvent);
        return signedEvent;
    }

    verifyIntegrity() {
        let expectedPrevHash = '0000000000000000000000000000000000000000000000000000000000000000';

        for (let i = 0; i < this.events.length; i++) {
            const event = this.events[i];
            if (event.previousHash !== expectedPrevHash) {
                return {
                    isValid: false,
                    error: `CORRUPTED_CHAIN_LINK: Event index ${i} has broken previousHash link`
                };
            }

            const { hash, ...dataToVerify } = event;
            const computed = computeSha256(dataToVerify);
            if (computed !== hash) {
                return {
                    isValid: false,
                    error: `TAMPER_DETECTED: Event index ${i} hash mismatch`
                };
            }

            expectedPrevHash = hash;
        }

        return { isValid: true, eventCount: this.events.length };
    }
}
