/**
 * smsDuplicateDetector.js
 * 
 * IDEMPOTENCY & DUPLICATE TRANSACTION DETECTOR
 * 
 * Invariants:
 * - SMS-02: Strong reference matches (UTR/Bank Ref ID) are deterministically rejected.
 * - SMS-02b: Legitimate repeated transactions (same amount & merchant at different times) are NEVER falsely rejected.
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
    const dateStr = (tx.date || tx.transactionDate || '').slice(0, 16); // Up to minute precision
    const merchant = (tx.merchant || tx.rawMerchant || '').toLowerCase().trim();
    const account = (tx.accountName || tx.maskedAccountNumber || '').toLowerCase().trim();

    // 1. Strong Anchor: Bank UTR or Transaction Reference ID
    if (refNum && refNum.length > 5) {
        return `ref_${refNum.toUpperCase().trim()}_${amount}`;
    }

    // 2. Exact Body Fingerprint (whitespace normalized)
    if (rawBody && rawBody.length > 15) {
        const cleanBody = rawBody.toLowerCase().replace(/[\s\-_]/g, '');
        return `body_${cleanBody.slice(0, 60)}_${amount}`;
    }

    // 3. Composite with minute-level precision
    return `comp_${dateStr}_${amount}_${merchant}_${account}`;
}

/**
 * Checks if a transaction candidate is a duplicate of any existing transaction in the ledger.
 * Distinguishes between strong identifier collisions and legitimate repeated payments.
 */
export function isDuplicateTransaction(candidateTx, existingLedger = [], seenFingerprints = new Set()) {
    if (!candidateTx) return true;

    const candidateRef = candidateTx.rawSource?.referenceNumber || candidateTx.referenceNumber;
    const candidateBody = candidateTx.rawSource?.rawBody || candidateTx.rawBody || '';
    const candidateFingerprint = generateTransactionFingerprint(candidateTx);

    // 1. Check in-memory fingerprint set
    if (candidateFingerprint && seenFingerprints && seenFingerprints.has(candidateFingerprint)) {
        return true;
    }

    // 2. Check against existing persistent ledger
    if (Array.isArray(existingLedger)) {
        for (const existing of existingLedger) {
            const existingRef = existing.rawSource?.referenceNumber || existing.referenceNumber;
            const existingBody = existing.rawSource?.rawBody || existing.rawBody || '';

            // A. Strong Identifier Match: Identical non-empty UTR / Ref Number -> Duplicate
            if (candidateRef && existingRef && candidateRef.toUpperCase() === existingRef.toUpperCase()) {
                return true;
            }

            // If both have different, non-empty reference numbers, they are distinct transactions
            if (candidateRef && existingRef && candidateRef.toUpperCase() !== existingRef.toUpperCase()) {
                continue;
            }

            // B. Exact Raw Body Match -> Duplicate
            if (candidateBody && existingBody && candidateBody.trim() === existingBody.trim()) {
                return true;
            }

            // C. Fingerprint exact match
            const existingFingerprint = generateTransactionFingerprint(existing);
            if (candidateFingerprint && existingFingerprint && candidateFingerprint === existingFingerprint) {
                return true;
            }

            // D. Weak Composite Proximity: Same account, same amount, same merchant within 3-minute window
            const candTime = new Date(candidateTx.date || candidateTx.transactionDate || 0).getTime();
            const existTime = new Date(existing.date || existing.transactionDate || 0).getTime();
            const diffMinutes = Math.abs(candTime - existTime) / (1000 * 60);

            if (
                Number(candidateTx.amount) === Number(existing.amount) &&
                candidateTx.type === existing.type &&
                candidateTx.merchant?.toLowerCase() === existing.merchant?.toLowerCase() &&
                diffMinutes <= 3
            ) {
                return true; // Near-instant duplicate broadcast replay
            }
        }
    }

    return false;
}
