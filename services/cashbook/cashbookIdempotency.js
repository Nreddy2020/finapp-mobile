/**
 * services/cashbook/cashbookIdempotency.js
 * 
 * Idempotency key generators, normalization, and deduplication registry.
 * 
 * Policy:
 * - Same key + identical payload: return existing transaction.
 * - Same key + different payload: reject with IDENTITY_CONFLICT.
 */

import { canonicalJsonStringify } from './cashbookContracts.js';
import { sha256 } from './cashbookAuditTrail.js';

/**
 * Generates an idempotent key for manually created transactions.
 */
export function generateManualIdempotencyKey(uuid) {
    if (!uuid || typeof uuid !== 'string') {
        throw new Error('UUID is required for manual idempotency key');
    }
    return `manual:${uuid.trim().toLowerCase()}`;
}

/**
 * Generates a normalized SMS idempotency key.
 * If bankReference is available: sms:${normalizedBank}:${referenceHash}
 * Fallback: sms-fingerprint:${bank}:${accountLast4}:${amountPaise}:${date}:${normalizedDesc}
 */
export function generateSmsIdempotencyKey({
    bank,
    referenceNumber = null,
    accountLast4 = '',
    amountPaise,
    date,
    description = ''
}) {
    const normBank = (bank || 'UNKNOWN').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (referenceNumber && referenceNumber.trim()) {
        const refHash = sha256(referenceNumber.trim().toUpperCase());
        return `sms:${normBank}:${refHash.substring(0, 16)}`;
    }

    // Fallback fingerprint
    const normDesc = (description || '').trim().toLowerCase().replace(/\s+/g, '_');
    const fingerprintRaw = `${normBank}:${accountLast4}:${amountPaise}:${date}:${normDesc}`;
    const fpHash = sha256(fingerprintRaw);
    return `sms-fp:${normBank}:${fpHash.substring(0, 20)}`;
}

/**
 * Generates an idempotency key for Recurring Commitment payment transactions.
 * Key format: recurring:commitmentId:occurrenceId:paymentOperationId
 */
export function generateRecurringPaymentIdempotencyKey(commitmentId, occurrenceId, paymentOperationId = 'payment') {
    if (!commitmentId || !occurrenceId) {
        throw new Error('Both commitmentId and occurrenceId are required for recurring idempotency key');
    }
    const op = (paymentOperationId || 'payment').trim();
    return `recurring:${commitmentId.trim()}:${occurrenceId.trim()}:${op}`;
}

/**
 * Evaluates whether an incoming transaction can be posted or is a duplicate/conflict.
 * 
 * @param {Array<Object>} existingTransactions - List of existing transactions
 * @param {Object} candidateTxn - Incoming transaction candidate
 * @returns {{ action: 'ALLOW' } | { action: 'RETURN_EXISTING', existingTransaction: Object } | { action: 'REJECT_CONFLICT', reason: string }}
 */
export function checkIdempotency(existingTransactions, candidateTxn) {
    if (!candidateTxn || !candidateTxn.idempotencyKey) {
        return { action: 'ALLOW' };
    }

    const match = existingTransactions.find(t => t.idempotencyKey === candidateTxn.idempotencyKey);
    if (!match) {
        return { action: 'ALLOW' };
    }

    // Compare payloads to distinguish idempotent retry from identity conflict
    const candidatePayload = {
        amount: candidateTxn.amount,
        transactionType: candidateTxn.transactionType,
        accountId: candidateTxn.accountId || candidateTxn.sourceAccountId || candidateTxn.destinationAccountId,
        date: candidateTxn.date
    };

    const existingPayload = {
        amount: match.amount,
        transactionType: match.transactionType,
        accountId: match.accountId || match.sourceAccountId || match.destinationAccountId,
        date: match.date
    };

    const isMatch = canonicalJsonStringify(candidatePayload) === canonicalJsonStringify(existingPayload);

    if (isMatch) {
        return {
            action: 'RETURN_EXISTING',
            existingTransaction: match
        };
    } else {
        return {
            action: 'REJECT_CONFLICT',
            reason: `IDENTITY_CONFLICT: Idempotency key "${candidateTxn.idempotencyKey}" already exists with different transaction payload.`
        };
    }
}
