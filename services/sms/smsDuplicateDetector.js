/**
 * smsDuplicateDetector.js
 * 
 * IDEMPOTENCY & DUPLICATE TRANSACTION DETECTOR
 * 
 * Invariants:
 * - SMS-02: The same SMS message fingerprint never generates duplicate financial transactions.
 * - SMS-06: Journal immutability and provenance are guaranteed.
 */

/**
 * Creates a deterministic string fingerprint for a raw SMS or normalized transaction.
 */
export function generateTransactionFingerprint(tx) {
    if (!tx) return '';
    const rawBody = tx.rawSource?.rawBody || tx.rawBody || '';
    const refNum = tx.rawSource?.referenceNumber || tx.referenceNumber || '';
    const amount = Number(tx.amount) || 0;
    const dateStr = (tx.date || tx.transactionDate || '').slice(0, 10);
    const merchant = (tx.merchant || tx.rawMerchant || '').toLowerCase().trim();
    const account = (tx.accountName || tx.maskedAccountNumber || '').toLowerCase().trim();

    if (refNum && refNum.length > 5) {
        // If bank provides UTR / reference number, use it as unique anchor
        return `ref_${refNum.toUpperCase()}_${amount}`;
    }

    if (rawBody && rawBody.length > 15) {
        // Clean whitespace and numbers to create body fingerprint
        const cleanBody = rawBody.toLowerCase().replace(/[\s\-_]/g, '');
        return `body_${cleanBody.slice(0, 50)}_${amount}`;
    }

    // Composite fallback
    return `comp_${dateStr}_${amount}_${merchant}_${account}`;
}

/**
 * Checks if a transaction candidate is a duplicate of any existing transaction in the ledger.
 */
export function isDuplicateTransaction(candidateTx, existingLedger = [], seenFingerprints = new Set()) {
    if (!candidateTx) return true;

    const candidateFingerprint = generateTransactionFingerprint(candidateTx);
    if (!candidateFingerprint) return false;

    // 1. Check in-memory fingerprint set
    if (seenFingerprints && seenFingerprints.has(candidateFingerprint)) {
        return true;
    }

    // 2. Check existing ledger
    if (Array.isArray(existingLedger)) {
        for (const existing of existingLedger) {
            const existingFingerprint = generateTransactionFingerprint(existing);
            if (existingFingerprint && existingFingerprint === candidateFingerprint) {
                return true;
            }

            // Also check composite match: same date, same amount, same merchant
            const candDate = (candidateTx.date || '').slice(0, 10);
            const existDate = (existing.date || '').slice(0, 10);
            if (
                candDate === existDate &&
                Number(candidateTx.amount) === Number(existing.amount) &&
                candidateTx.type === existing.type &&
                candidateTx.merchant?.toLowerCase() === existing.merchant?.toLowerCase()
            ) {
                return true;
            }
        }
    }

    return false;
}
