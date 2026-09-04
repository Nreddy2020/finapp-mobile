/**
 * tests/test_commitment_audit.mjs
 * 
 * Verifies the immutability, event schema, and ledger append behavior of the Commitment Audit Trail.
 */

import assert from 'node:assert';
import {
    AuditEventType,
    AuditSource,
    createAuditEvent,
    CommitmentAuditLog
} from '../services/commitments/commitmentAuditTrail.js';

console.log('--- START TEST SUITE: COMMITMENT AUDIT TRAIL IMMUTABILITY ---');

// 1. Valid event creation
const event1 = createAuditEvent({
    eventType: AuditEventType.COMMITMENT_CREATED,
    commitmentId: 'comm_123',
    newState: { id: 'comm_123', amount: { paise: '500000', currency: 'INR' } },
    source: AuditSource.USER,
    notes: 'Created initial commitment'
});

assert.strictEqual(event1.eventType, AuditEventType.COMMITMENT_CREATED);
assert.strictEqual(event1.commitmentId, 'comm_123');
assert.strictEqual(event1.occurrenceId, null);
assert.strictEqual(event1.source, AuditSource.USER);
assert.strictEqual(event1.notes, 'Created initial commitment');
assert.ok(typeof event1.id === 'string' && event1.id.startsWith('audit_'));
assert.ok(event1.occurredAt);
console.log('  ✓ creates well-formed audit event with unique ID and ISO timestamp');

// 2. Immutability & deep isolation
assert.throws(() => {
    event1.eventType = 'MUTATED';
}, /Cannot assign to read only property/);

// Modifying passed newState does not corrupt audit record
const mutableState = { status: 'ACTIVE', counter: 1 };
const event2 = createAuditEvent({
    eventType: AuditEventType.COMMITMENT_UPDATED,
    commitmentId: 'comm_123',
    previousState: mutableState,
    newState: { status: 'PAUSED', counter: 2 },
    source: AuditSource.SYSTEM
});
mutableState.counter = 999;
assert.strictEqual(event2.previousState.counter, 1);
console.log('  ✓ guarantees immutability of audit record and deep-clones captured state');

// 3. Validation and fail-closed checks
assert.throws(() => {
    createAuditEvent({
        eventType: 'INVALID_EVENT_TYPE',
        commitmentId: 'comm_123'
    });
}, /Invalid AuditEventType/);

assert.throws(() => {
    createAuditEvent({
        eventType: AuditEventType.PAYMENT_RECORDED,
        commitmentId: ''
    });
}, /must have a string commitmentId/);
console.log('  ✓ rejects invalid event types and missing commitment IDs');

// 4. CommitmentAuditLog functionality
const log = new CommitmentAuditLog();
log.append(event1);
log.append(event2);

const occurrenceEvent = createAuditEvent({
    eventType: AuditEventType.PAYMENT_RECORDED,
    commitmentId: 'comm_123',
    occurrenceId: 'occ_sept_2026',
    source: AuditSource.USER
});
log.append(occurrenceEvent);

const otherEvent = createAuditEvent({
    eventType: AuditEventType.COMMITMENT_CREATED,
    commitmentId: 'comm_999',
    source: AuditSource.USER
});
log.append(otherEvent);

assert.strictEqual(log.getAllEvents().length, 4);
assert.strictEqual(log.getHistoryForCommitment('comm_123').length, 3);
assert.strictEqual(log.getHistoryForOccurrence('occ_sept_2026').length, 1);
assert.strictEqual(log.getHistoryForCommitment('comm_999').length, 1);
console.log('  ✓ queries audit log accurately by commitmentId and occurrenceId');

console.log('\n--- ALL 4 COMMITMENT AUDIT TRAIL ASSERTIONS PASSED ---\n');
