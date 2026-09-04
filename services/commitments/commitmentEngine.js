/**
 * services/commitments/commitmentEngine.js
 * 
 * Core Lifecycle, Occurrence Generation, and Ledger Matching Engine
 * for Recurring Commitments.
 * 
 * Invariants:
 * - Existing occurrences are never recreated or deleted.
 * - Future occurrences are marked CANCELLED on cancellation; past occurrences are immutable.
 * - Idempotency key: commitmentId:occurrenceId.
 * - Medium & Weak ledger matches require user confirmation; never auto-merge.
 */

import {
    CommitmentStatus,
    PaymentOccurrenceStatus,
    LedgerMatchConfidence,
    createMoneyPaise,
    moneyToBigInt,
    validateCommitment
} from './commitmentContracts.js';
import { getNextOccurrenceDate, parseISODate } from './commitmentDateUtils.js';

/**
 * Deterministically generates payment occurrences for a commitment within a target date range.
 * 
 * @param {object} params
 * @param {object} params.commitment Validated RecurringCommitment
 * @param {Array<object>} params.existingOccurrences Existing occurrences for this commitment
 * @param {string} params.startDate YYYY-MM-DD
 * @param {string} params.endDate YYYY-MM-DD
 * @param {string} params.asOfDate Current date YYYY-MM-DD
 * @returns {Array<object>} Updated list of all occurrences (existing + new)
 */
export function generateOccurrences({
    commitment,
    existingOccurrences = [],
    startDate,
    endDate,
    asOfDate = new Date().toISOString().split('T')[0]
}) {
    validateCommitment(commitment);
    
    // Map existing occurrences by scheduledDate
    const existingByDate = new Map();
    for (const occ of existingOccurrences) {
        if (occ.commitmentId === commitment.id) {
            existingByDate.set(occ.scheduledDate, occ);
        }
    }

    const { day: targetDay } = parseISODate(commitment.startDate);
    const result = [...existingOccurrences.filter(o => o.commitmentId === commitment.id)];

    // If commitment is cancelled or expired, do not generate new upcoming occurrences
    if (commitment.status === CommitmentStatus.CANCELLED || commitment.status === CommitmentStatus.EXPIRED) {
        return result;
    }

    let cursorDate = commitment.startDate;
    const maxIterations = 365; // Safety guard for loops
    let iter = 0;

    while (cursorDate <= endDate && iter < maxIterations) {
        iter++;
        
        // If cursorDate falls within generation window
        if (cursorDate >= startDate && cursorDate <= endDate) {
            if (!existingByDate.has(cursorDate)) {
                // Determine initial status
                let initialStatus = PaymentOccurrenceStatus.UPCOMING;
                if (cursorDate < asOfDate) {
                    initialStatus = PaymentOccurrenceStatus.OVERDUE;
                }

                const occId = `${commitment.id}_${cursorDate}`;
                const newOcc = {
                    id: occId,
                    commitmentId: commitment.id,
                    commitmentName: commitment.name,
                    commitmentType: commitment.type,
                    financialNature: commitment.financialNature,
                    scheduledDate: cursorDate,
                    expectedAmount: commitment.amount,
                    status: initialStatus,
                    idempotencyKey: `${commitment.id}:${occId}`,
                    createdAt: new Date().toISOString()
                };

                result.push(newOcc);
                existingByDate.set(cursorDate, newOcc);
            } else {
                // If existing occurrence is in the past and still UPCOMING, flag as OVERDUE
                const existing = existingByDate.get(cursorDate);
                if (cursorDate < asOfDate && existing.status === PaymentOccurrenceStatus.UPCOMING) {
                    existing.status = PaymentOccurrenceStatus.OVERDUE;
                }
            }
        }

        // Stop if past commitment endDate (if specified)
        if (commitment.endDate && cursorDate >= commitment.endDate) {
            break;
        }

        cursorDate = getNextOccurrenceDate(cursorDate, commitment.frequency, targetDay);
    }

    // Sort chronologically
    return result.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
}

/**
 * Records a payment against an occurrence.
 * @param {object} occurrence 
 * @param {object} paymentDetails { actualAmount, actualPaidDate, transactionId, notes }
 * @returns {object} Updated occurrence marked PAID
 */
export function recordPaymentOccurrence(occurrence, paymentDetails = {}) {
    if (!occurrence) throw new Error('Occurrence is required');
    if (occurrence.status === PaymentOccurrenceStatus.PAID) {
        throw new Error(`Occurrence ${occurrence.id} has already been paid`);
    }

    const actualPaidDate = paymentDetails.actualPaidDate || new Date().toISOString().split('T')[0];
    const actualAmount = paymentDetails.actualAmount ? 
        createMoneyPaise(paymentDetails.actualAmount.paise) : 
        occurrence.expectedAmount;

    return {
        ...occurrence,
        status: PaymentOccurrenceStatus.PAID,
        actualAmount,
        actualPaidDate,
        transactionId: paymentDetails.transactionId || null,
        notes: paymentDetails.notes || occurrence.notes || '',
        paidAt: new Date().toISOString()
    };
}

/**
 * Skips a payment occurrence.
 * @param {object} occurrence 
 * @param {string} reason 
 * @returns {object} Updated occurrence marked SKIPPED
 */
export function skipPaymentOccurrence(occurrence, reason = '') {
    if (!occurrence) throw new Error('Occurrence is required');
    if (occurrence.status === PaymentOccurrenceStatus.PAID) {
        throw new Error('Cannot skip a paid occurrence');
    }

    return {
        ...occurrence,
        status: PaymentOccurrenceStatus.SKIPPED,
        skipReason: reason,
        skippedAt: new Date().toISOString()
    };
}

/**
 * Cancels a recurring commitment following strict immutable audit rules:
 * - Past PAID occurrences remain unchanged.
 * - Past OVERDUE occurrences remain unchanged.
 * - Future UPCOMING occurrences are marked CANCELLED.
 * - Existing occurrences are never deleted.
 * 
 * @param {object} commitment 
 * @param {Array<object>} occurrences 
 * @param {string} asOfDate YYYY-MM-DD
 * @returns {{ updatedCommitment: object, updatedOccurrences: Array<object> }}
 */
export function cancelCommitmentWithOccurrences(commitment, occurrences = [], asOfDate = new Date().toISOString().split('T')[0]) {
    validateCommitment(commitment);

    const updatedCommitment = {
        ...commitment,
        status: CommitmentStatus.CANCELLED,
        cancelledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const updatedOccurrences = occurrences.map(occ => {
        if (occ.commitmentId !== commitment.id) return occ;

        // Future upcoming occurrences become CANCELLED
        if (occ.scheduledDate >= asOfDate && (occ.status === PaymentOccurrenceStatus.UPCOMING || occ.status === PaymentOccurrenceStatus.OVERDUE)) {
            return {
                ...occ,
                status: PaymentOccurrenceStatus.CANCELLED,
                cancelledAt: new Date().toISOString()
            };
        }
        // Historical occurrences remain immutable
        return occ;
    });

    return {
        updatedCommitment,
        updatedOccurrences
    };
}

/**
 * Pauses a recurring commitment.
 * @param {object} commitment 
 * @returns {object} Updated commitment marked PAUSED
 */
export function pauseCommitment(commitment) {
    validateCommitment(commitment);
    if (commitment.status === CommitmentStatus.CANCELLED) {
        throw new Error('Cannot pause a cancelled commitment');
    }
    return {
        ...commitment,
        status: CommitmentStatus.PAUSED,
        pausedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Resumes a paused commitment.
 * @param {object} commitment 
 * @returns {object} Updated commitment marked ACTIVE
 */
export function resumeCommitment(commitment) {
    validateCommitment(commitment);
    if (commitment.status === CommitmentStatus.CANCELLED) {
        throw new Error('Cannot resume a cancelled commitment');
    }
    return {
        ...commitment,
        status: CommitmentStatus.ACTIVE,
        resumedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Confidence-based ledger matcher for transactions and occurrences.
 * 
 * Rules:
 * - Strong: Exact transactionId match -> auto-link allowed.
 * - Medium: Same account + amount matches + date within +-2 days -> suggested match, USER CONFIRMATION REQUIRED.
 * - Weak: Keyword / merchant name similarity -> suggested match, USER CONFIRMATION REQUIRED (never auto-merge).
 * 
 * @param {object} occurrence 
 * @param {object} transaction { id, accountId, amountPaise, date, description }
 * @returns {{ match: boolean, confidence: 'STRONG'|'MEDIUM'|'WEAK'|null, reason: string }}
 */
export function matchTransactionToOccurrence(occurrence, transaction) {
    if (!occurrence || !transaction) {
        return { match: false, confidence: null, reason: 'Missing input' };
    }

    // 1. Strong Match: Exact Transaction ID match
    if (occurrence.transactionId && occurrence.transactionId === transaction.id) {
        return {
            match: true,
            confidence: LedgerMatchConfidence.STRONG,
            reason: 'Exact transaction ID match (auto-link eligible)'
        };
    }

    // 2. Medium Match: Same account + same amount + date within 2 days
    const occAmount = moneyToBigInt(occurrence.expectedAmount);
    const txAmount = typeof transaction.amountPaise === 'string' ? BigInt(transaction.amountPaise) : BigInt(transaction.amountPaise || 0);

    const occDate = new Date(occurrence.scheduledDate).getTime();
    const txDate = new Date(transaction.date).getTime();
    const dayDiff = Math.abs(occDate - txDate) / (1000 * 60 * 60 * 24);

    const sameAccount = transaction.accountId && occurrence.paymentAccountId && transaction.accountId === occurrence.paymentAccountId;
    const sameAmount = occAmount === txAmount;

    if (sameAmount && dayDiff <= 2) {
        if (sameAccount) {
            return {
                match: true,
                confidence: LedgerMatchConfidence.MEDIUM,
                reason: 'Account, amount, and date matched within 2 days (requires user confirmation)'
            };
        } else {
            return {
                match: true,
                confidence: LedgerMatchConfidence.MEDIUM,
                reason: 'Amount and date matched within 2 days (requires user confirmation)'
            };
        }
    }

    // 3. Weak Match: Name similarity in transaction description
    if (transaction.description && occurrence.commitmentName) {
        const descUpper = transaction.description.toUpperCase();
        const nameUpper = occurrence.commitmentName.toUpperCase();
        if (descUpper.includes(nameUpper) || nameUpper.includes(descUpper)) {
            return {
                match: true,
                confidence: LedgerMatchConfidence.WEAK,
                reason: 'Description text similarity (requires explicit user confirmation)'
            };
        }
    }

    return { match: false, confidence: null, reason: 'No match' };
}
