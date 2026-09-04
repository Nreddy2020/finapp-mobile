/**
 * smsReviewService.js
 * 
 * TRANSACTION REVIEW & CLASSIFICATION WORKFLOW SERVICE
 * 
 * Invariants:
 * - SMS-03: Uncertain transactions remain quarantined in the review queue.
 * - SMS-04: Confirmed transactions conform strictly to canonical journal schema.
 */

/**
 * Filters transactions into committed list and needs-review queue.
 */
export function partitionTransactionsByReviewStatus(transactions = []) {
    const committed = [];
    const needsReview = [];

    for (const tx of transactions) {
        if (tx.status === 'NEEDS_REVIEW' || tx.needsSort) {
            needsReview.push({
                ...tx,
                status: 'NEEDS_REVIEW'
            });
        } else {
            committed.push({
                ...tx,
                status: 'COMMITTED'
            });
        }
    }

    return {
        committed,
        needsReview,
        reviewCount: needsReview.length
    };
}

/**
 * Confirms a transaction from the review queue and promotes it to COMMITTED status.
 */
export function confirmReviewTransaction(tx, selectedCategory, customType = null) {
    if (!tx) return null;

    return {
        ...tx,
        category: selectedCategory || tx.category || 'General Cash Activity',
        type: customType || tx.type || 'EXPENSE',
        status: 'COMMITTED',
        needsSort: false,
        reviewedAt: new Date().toISOString()
    };
}
