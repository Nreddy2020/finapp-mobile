/**
 * tests/test_cashbook_audit.mjs
 * 
 * Test Suite 3: Cryptographic SHA-256 Audit Trail, Hash Chaining,
 * Sequence Validation, and Tamper Detection.
 */

import assert from 'assert';
import {
    createAuditEvent,
    verifyAuditTrail,
    AuditEventType,
    AuditActor,
    AuditSource,
    GENESIS_PREVIOUS_HASH,
    sha256
} from '../services/cashbook/cashbookAuditTrail.js';

console.log('--- START TEST SUITE: CASHBOOK AUDIT TRAIL ---');
let assertionsPassed = 0;

function it(desc, fn) {
    fn();
    assertionsPassed++;
    console.log(`  [PASS] ${desc}`);
}

// 1. SHA-256 Utility
it('sha256 computes correct standard digest', () => {
    // Known test vector: "abc" -> ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad
    const digest = sha256('abc');
    assert.strictEqual(digest, 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');

    // Empty string -> e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
    const emptyDigest = sha256('');
    assert.strictEqual(emptyDigest, 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
});

// 2. Genesis Audit Event Creation
it('First audit event references GENESIS_PREVIOUS_HASH and sequence 1', () => {
    const evt1 = createAuditEvent({
        lastEvent: null,
        eventType: AuditEventType.ACCOUNT_CREATED,
        entityId: 'acc_01',
        payload: { name: 'HDFC' }
    });

    assert.strictEqual(evt1.sequence, 1);
    assert.strictEqual(evt1.previousHash, GENESIS_PREVIOUS_HASH);
    assert.ok(evt1.eventHash);
    assert.ok(evt1.payloadHash);
    assert.strictEqual(evt1.payloadHash, sha256('{"name":"HDFC"}'));
});

// 3. Multi-Event Hash Chaining
it('Chained audit events link previousHash to preceding eventHash', () => {
    const evt1 = createAuditEvent({
        lastEvent: null,
        eventType: AuditEventType.ACCOUNT_CREATED,
        entityId: 'acc_01',
        payload: { name: 'HDFC' }
    });

    const evt2 = createAuditEvent({
        lastEvent: evt1,
        eventType: AuditEventType.OPENING_BALANCE_SET,
        entityId: 'op_01',
        payload: { amount: '2500000' }
    });

    const evt3 = createAuditEvent({
        lastEvent: evt2,
        eventType: AuditEventType.TRANSACTION_POSTED,
        entityId: 'txn_01',
        payload: { amount: '7500000' }
    });

    assert.strictEqual(evt2.sequence, 2);
    assert.strictEqual(evt2.previousHash, evt1.eventHash);

    assert.strictEqual(evt3.sequence, 3);
    assert.strictEqual(evt3.previousHash, evt2.eventHash);

    // Verify chain
    const chainCheck = verifyAuditTrail([evt1, evt2, evt3]);
    assert.strictEqual(chainCheck.isValid, true);
    assert.strictEqual(chainCheck.eventCount, 3);
    assert.strictEqual(chainCheck.latestHash, evt3.eventHash);
});

// 4. Sequence Gap Detection
it('verifyAuditTrail detects sequence gaps', () => {
    const evt1 = createAuditEvent({ lastEvent: null, eventType: AuditEventType.ACCOUNT_CREATED, entityId: 'acc_1', payload: {} });
    const evt2 = createAuditEvent({ lastEvent: evt1, eventType: AuditEventType.TRANSACTION_POSTED, entityId: 'tx_1', payload: {} });
    const evt3 = createAuditEvent({ lastEvent: evt2, eventType: AuditEventType.TRANSACTION_POSTED, entityId: 'tx_2', payload: {} });

    // Intentionally omit evt2
    const gapLog = [evt1, evt3];
    const check = verifyAuditTrail(gapLog);
    assert.strictEqual(check.isValid, false);
    assert.ok(check.reason.includes('Sequence break'));
});

// 5. Duplicate Sequence Detection
it('verifyAuditTrail detects duplicate sequence numbers', () => {
    const evt1 = createAuditEvent({ lastEvent: null, eventType: AuditEventType.ACCOUNT_CREATED, entityId: 'acc_1', payload: {} });
    const evt2 = createAuditEvent({ lastEvent: evt1, eventType: AuditEventType.TRANSACTION_POSTED, entityId: 'tx_1', payload: {} });
    
    // Duplicate sequence 1
    const dupLog = [evt1, { ...evt2, sequence: 1 }];
    const check = verifyAuditTrail(dupLog);
    assert.strictEqual(check.isValid, false);
    assert.ok(check.reason.includes('Sequence break'));
});

// 6. Genesis Hash Verification
it('verifyAuditTrail detects tampered genesis hash', () => {
    const evt1 = createAuditEvent({ lastEvent: null, eventType: AuditEventType.ACCOUNT_CREATED, entityId: 'acc_1', payload: {} });
    const tamperedGenesis = {
        ...evt1,
        previousHash: '1111111111111111111111111111111111111111111111111111111111111111'
    };
    const check = verifyAuditTrail([tamperedGenesis]);
    assert.strictEqual(check.isValid, false);
    assert.ok(check.reason.includes('Previous hash mismatch'));
});

// 7. Payload Tampering Detection
it('verifyAuditTrail detects tampered payload in history', () => {
    const evt1 = createAuditEvent({ lastEvent: null, eventType: AuditEventType.ACCOUNT_CREATED, entityId: 'acc_1', payload: { name: 'HDFC' } });
    const evt2 = createAuditEvent({ lastEvent: evt1, eventType: AuditEventType.TRANSACTION_POSTED, entityId: 'tx_1', payload: { amount: '5000' } });

    // Tamper payload in evt2 without updating payloadHash
    const tamperedEvt2 = {
        ...evt2,
        payload: { amount: '500000' } // Altered 5000 to 500000
    };

    const check = verifyAuditTrail([evt1, tamperedEvt2]);
    assert.strictEqual(check.isValid, false);
    assert.ok(check.reason.includes('Payload hash tampering detected'));
});

// 8. Event Signature Tampering (Timestamp / Actor Tampering)
it('verifyAuditTrail detects tampered timestamp or actor', () => {
    const evt1 = createAuditEvent({
        lastEvent: null,
        eventType: AuditEventType.ACCOUNT_CREATED,
        entityId: 'acc_1',
        payload: { name: 'HDFC' },
        actor: AuditActor.USER,
        timestamp: '2026-09-01T00:00:00.000Z'
    });

    // Tamper timestamp
    const tamperedEvt = {
        ...evt1,
        timestamp: '2025-01-01T00:00:00.000Z'
    };

    const check = verifyAuditTrail([tamperedEvt]);
    assert.strictEqual(check.isValid, false);
    assert.ok(check.reason.includes('Event hash tampering detected'));
});

// 9. Event Deletion Detection
it('verifyAuditTrail detects if an intermediate event was deleted from the ledger', () => {
    const evt1 = createAuditEvent({ lastEvent: null, eventType: AuditEventType.ACCOUNT_CREATED, entityId: 'acc_1', payload: {} });
    const evt2 = createAuditEvent({ lastEvent: evt1, eventType: AuditEventType.TRANSACTION_POSTED, entityId: 'tx_1', payload: {} });
    const evt3 = createAuditEvent({ lastEvent: evt2, eventType: AuditEventType.TRANSACTION_POSTED, entityId: 'tx_2', payload: {} });

    // Try to hide evt2 by renumbering sequence on evt3
    const splicedLog = [evt1, { ...evt3, sequence: 2 }];
    const check = verifyAuditTrail(splicedLog);
    assert.strictEqual(check.isValid, false);
    // Even though sequence is 2, previousHash still expects evt2.eventHash, not evt1.eventHash!
    assert.ok(check.reason.includes('Previous hash mismatch'));
});

console.log(`--- CASHBOOK AUDIT TRAIL SUITE PASSED (${assertionsPassed} assertions) ---\n`);
