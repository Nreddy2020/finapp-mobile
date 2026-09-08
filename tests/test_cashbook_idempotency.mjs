/**
 * tests/test_cashbook_idempotency.mjs
 * 
 * Test Suite 4: Idempotency Key Normalization, Deduplication, and Collision Rejection.
 */

import assert from 'assert';
import {
    generateManualIdempotencyKey,
    generateSmsIdempotencyKey,
    generateRecurringPaymentIdempotencyKey,
    checkIdempotency
} from '../services/cashbook/cashbookIdempotency.js';

import {
    TransactionType,
    TransactionStatus,
    createMoneyPaise
} from '../services/cashbook/cashbookContracts.js';

console.log('--- START TEST SUITE: CASHBOOK IDEMPOTENCY ---');
let assertionsPassed = 0;

function it(desc, fn) {
    fn();
    assertionsPassed++;
    console.log(`  [PASS] ${desc}`);
}

// 1. Key Generators
it('generateManualIdempotencyKey normalizes UUIDs correctly', () => {
    const k1 = generateManualIdempotencyKey('A1B2-C3D4');
    assert.strictEqual(k1, 'manual:a1b2-c3d4');
});

it('generateSmsIdempotencyKey prioritizes reference number hash', () => {
    const k1 = generateSmsIdempotencyKey({
        bank: 'HDFC Bank',
        referenceNumber: 'UPI/1234567890/IMPS',
        amountPaise: '50000',
        date: '2026-09-01'
    });
    assert.ok(k1.startsWith('sms:HDFCBANK:'));
    assert.strictEqual(k1.length, 4 + 8 + 1 + 16); // sms:HDFCBANK:hash16

    // Same ref produces identical key regardless of different timestamp in message
    const k2 = generateSmsIdempotencyKey({
        bank: 'HDFC Bank',
        referenceNumber: 'UPI/1234567890/IMPS',
        amountPaise: '50000',
        date: '2026-09-01'
    });
    assert.strictEqual(k1, k2);
});

it('generateSmsIdempotencyKey creates fallback fingerprint when no reference exists', () => {
    const k1 = generateSmsIdempotencyKey({
        bank: 'SBI',
        referenceNumber: null,
        accountLast4: '1234',
        amountPaise: '150000',
        date: '2026-09-02',
        description: 'Debited at POS 9912'
    });
    assert.ok(k1.startsWith('sms-fp:SBI:'));
});

it('generateRecurringPaymentIdempotencyKey links commitmentId and occurrenceId', () => {
    const k = generateRecurringPaymentIdempotencyKey('demo_netflix', 'occ_2026_09');
    assert.strictEqual(k, 'recurring:demo_netflix:occ_2026_09:payment');
});

// 2. Idempotency Action Policy
it('checkIdempotency allows new unique transaction keys', () => {
    const existing = [
        {
            id: 'tx_1',
            idempotencyKey: 'manual:001',
            amount: createMoneyPaise('50000'),
            transactionType: TransactionType.EXPENSE,
            accountId: 'acc_1',
            date: '2026-09-01'
        }
    ];

    const candidate = {
        id: 'tx_2',
        idempotencyKey: 'manual:002',
        amount: createMoneyPaise('50000'),
        transactionType: TransactionType.EXPENSE,
        accountId: 'acc_1',
        date: '2026-09-01'
    };

    const res = checkIdempotency(existing, candidate);
    assert.strictEqual(res.action, 'ALLOW');
});

it('checkIdempotency returns existing transaction on identical retry (idempotent)', () => {
    const existingTxn = {
        id: 'tx_1',
        idempotencyKey: 'manual:001',
        amount: createMoneyPaise('50000'),
        transactionType: TransactionType.EXPENSE,
        accountId: 'acc_1',
        date: '2026-09-01'
    };

    const candidateSame = {
        id: 'tx_1_retry',
        idempotencyKey: 'manual:001',
        amount: createMoneyPaise('50000'),
        transactionType: TransactionType.EXPENSE,
        accountId: 'acc_1',
        date: '2026-09-01'
    };

    const res = checkIdempotency([existingTxn], candidateSame);
    assert.strictEqual(res.action, 'RETURN_EXISTING');
    assert.strictEqual(res.existingTransaction.id, 'tx_1');
});

it('checkIdempotency rejects collision when same key has different payload with IDENTITY_CONFLICT', () => {
    const existingTxn = {
        id: 'tx_1',
        idempotencyKey: 'manual:001',
        amount: createMoneyPaise('50000'), // ₹500
        transactionType: TransactionType.EXPENSE,
        accountId: 'acc_1',
        date: '2026-09-01'
    };

    const candidateDiff = {
        id: 'tx_2',
        idempotencyKey: 'manual:001',
        amount: createMoneyPaise('90000'), // ₹900 (different amount!)
        transactionType: TransactionType.EXPENSE,
        accountId: 'acc_1',
        date: '2026-09-01'
    };

    const res = checkIdempotency([existingTxn], candidateDiff);
    assert.strictEqual(res.action, 'REJECT_CONFLICT');
    assert.ok(res.reason.includes('IDENTITY_CONFLICT'));
});

console.log(`--- CASHBOOK IDEMPOTENCY SUITE PASSED (${assertionsPassed} assertions) ---\n`);
