/**
 * services/commitments/commitmentAuditTrail.js
 * 
 * Immutable financial audit logger for Recurring Commitments.
 * 
 * Invariants:
 * - Append-only: Historical events are strictly immutable.
 * - Captures before/after states for all financial mutations.
 * - Serializes cleanly into JSON strings for local encrypted persistence.
 */

export const AuditEventType = Object.freeze({
    COMMITMENT_CREATED: 'COMMITMENT_CREATED',
    COMMITMENT_UPDATED: 'COMMITMENT_UPDATED',
    COMMITMENT_AMOUNT_CHANGED: 'COMMITMENT_AMOUNT_CHANGED',
    COMMITMENT_FREQUENCY_CHANGED: 'COMMITMENT_FREQUENCY_CHANGED',
    COMMITMENT_PAUSED: 'COMMITMENT_PAUSED',
    COMMITMENT_RESUMED: 'COMMITMENT_RESUMED',
    COMMITMENT_CANCELLED: 'COMMITMENT_CANCELLED',
    PAYMENT_RECORDED: 'PAYMENT_RECORDED',
    PAYMENT_CORRECTED: 'PAYMENT_CORRECTED',
    PAYMENT_SKIPPED: 'PAYMENT_SKIPPED',
    LEDGER_LINKED: 'LEDGER_LINKED'
});

export const AuditSource = Object.freeze({
    USER: 'USER',
    SYSTEM: 'SYSTEM',
    SMS_SYNC: 'SMS_SYNC',
    MIGRATION: 'MIGRATION'
});

/**
 * Creates an immutable audit event record.
 * @param {object} params
 * @param {string} params.eventType AuditEventType
 * @param {string} params.commitmentId
 * @param {string} params.occurrenceId optional
 * @param {object} params.previousState optional
 * @param {object} params.newState optional
 * @param {string} params.source AuditSource
 * @param {string} params.notes optional
 * @returns {object} Immutable audit event
 */
export function createAuditEvent({
    eventType,
    commitmentId,
    occurrenceId = null,
    previousState = null,
    newState = null,
    source = AuditSource.USER,
    notes = ''
}) {
    if (!eventType || !Object.values(AuditEventType).includes(eventType)) {
        throw new Error(`Invalid AuditEventType: ${eventType}`);
    }
    if (!commitmentId || typeof commitmentId !== 'string') {
        throw new Error('AuditEvent must have a string commitmentId');
    }

    const eventId = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    return Object.freeze({
        id: eventId,
        eventType,
        commitmentId,
        occurrenceId,
        previousState: previousState ? JSON.parse(JSON.stringify(previousState)) : null,
        newState: newState ? JSON.parse(JSON.stringify(newState)) : null,
        source,
        notes,
        occurredAt: new Date().toISOString()
    });
}

/**
 * Audit Log In-Memory / File helper
 */
export class CommitmentAuditLog {
    constructor(initialEvents = []) {
        this.events = Array.isArray(initialEvents) ? [...initialEvents] : [];
    }

    append(event) {
        if (!event || !event.id || !event.eventType) {
            throw new Error('Invalid audit event passed to append');
        }
        this.events.push(event);
        return event;
    }

    getHistoryForCommitment(commitmentId) {
        return this.events.filter(e => e.commitmentId === commitmentId);
    }

    getHistoryForOccurrence(occurrenceId) {
        return this.events.filter(e => e.occurrenceId === occurrenceId);
    }

    getAllEvents() {
        return [...this.events];
    }
}
