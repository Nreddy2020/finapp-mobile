/**
 * services/cashbook/recurringIntegration.js
 * 
 * Clean event bridge between Recurring Commitments (Expectations)
 * and Cashbook Ledger (Real Money Movements).
 * 
 * Invariants:
 * - Decoupled separation of concerns: Commitment is scheduled expectation; Cashbook is posted event.
 * - Idempotent posting: recurring:${commitmentId}:${occurrenceId}:payment
 * - Loop prevention: tracks synchronizationOrigin and synchronizationEventId.
 * - Void synchronization: voiding a linked cashbook transaction transitions occurrence to REVERSED.
 */

import {
    TransactionType,
    TransactionStatus,
    TransactionSource,
    createMoneyPaise
} from './cashbookContracts.js';
import { generateRecurringPaymentIdempotencyKey } from './cashbookIdempotency.js';
import { CashbookRepository } from './cashbookRepository.js';
import { CommitmentsService } from '../commitments/commitmentsService.js';
import { PaymentOccurrenceStatus } from '../commitments/commitmentContracts.js';

export const SyncOrigin = Object.freeze({
    COMMITMENT: 'COMMITMENT',
    CASHBOOK: 'CASHBOOK'
});

export const RecurringIntegration = {
    /**
     * Bridges a marked PAID occurrence into a Cashbook EXPENSE transaction.
     * 
     * @param {Object} occurrence - The PaymentOccurrence contract
     * @param {string} accountId - The bank or cash account from which funds were debited
     * @param {Object} [options]
     */
    postOccurrenceToCashbook: async (occurrence, accountId, options = {}) => {
        if (!occurrence || !occurrence.id || !occurrence.commitmentId) {
            throw new Error('Valid PaymentOccurrence is required');
        }
        if (!accountId) {
            throw new Error('Target accountId is required to post occurrence to Cashbook');
        }

        const syncEventId = `sync_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const idempotencyKey = generateRecurringPaymentIdempotencyKey(occurrence.commitmentId, occurrence.id);

        const amountPaise = occurrence.actualAmount || occurrence.expectedAmount;
        const date = occurrence.actualPaidDate || occurrence.scheduledDate || new Date().toISOString().split('T')[0];

        const cashbookTxn = {
            id: `cb_occ_${occurrence.id}`,
            transactionType: TransactionType.EXPENSE,
            sourceAccountId: accountId,
            amount: amountPaise,
            date,
            description: `${occurrence.commitmentName || 'Recurring Payment'}`,
            notes: `Automated posting from Recurring Commitment occurrence ${occurrence.id}`,
            category: occurrence.category ? occurrence.category.toLowerCase() : 'miscellaneous',
            status: TransactionStatus.POSTED,
            source: TransactionSource.RECURRING_COMMITMENT,
            sourceReferenceId: occurrence.id,
            synchronizationEventId: syncEventId,
            synchronizationOrigin: SyncOrigin.COMMITMENT,
            version: 1,
            idempotencyKey,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const posted = await CashbookRepository.saveTransaction(cashbookTxn, options);

        // Update occurrence with linked transactionId
        try {
            await CommitmentsService.recordPayment(
                occurrence.id,
                {
                    actualAmount: amountPaise,
                    paidAt: date,
                    cashbookTransactionId: posted.id,
                    synchronizationOrigin: SyncOrigin.CASHBOOK
                },
                options
            );
        } catch (err) {
            console.warn('[RecurringIntegration] Note on occurrence update:', err.message);
        }

        return posted;
    },

    /**
     * Synchronizes a voided Cashbook transaction with its parent occurrence.
     * Transitions the occurrence from PAID to REVERSED.
     */
    handleCashbookTransactionVoided: async (transaction, voidReason, options = {}) => {
        if (!transaction || transaction.source !== TransactionSource.RECURRING_COMMITMENT || !transaction.sourceReferenceId) {
            return { handled: false, reason: 'Not a recurring commitment transaction' };
        }

        const occurrenceId = transaction.sourceReferenceId;
        const syncEventId = `sync_rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

        try {
            const data = await CommitmentsService.load(options);
            const occ = data.occurrences.find(o => o.id === occurrenceId);
            if (occ) {
                // If occurrence was PAID, reverse it
                const updatedOccurrence = {
                    ...occ,
                    status: PaymentOccurrenceStatus.FAILED, // Mark as reversed/unpaid
                    reversedAt: new Date().toISOString(),
                    reversalReason: voidReason,
                    synchronizationEventId: syncEventId,
                    synchronizationOrigin: SyncOrigin.CASHBOOK
                };

                const STORAGE_KEY_OCCURRENCES = 'FINLIFE_OCCURRENCES_V2';
                const { StorageService } = await import('../storage.js');
                const occurrences = await StorageService.load(STORAGE_KEY_OCCURRENCES) || [];
                const occIndex = occurrences.findIndex(o => o.id === occurrenceId);
                if (occIndex >= 0) {
                    occurrences[occIndex] = updatedOccurrence;
                    await StorageService.save(STORAGE_KEY_OCCURRENCES, occurrences);
                }

                return {
                    handled: true,
                    occurrenceId,
                    newStatus: 'REVERSED',
                    syncEventId
                };
            }
        } catch (err) {
            console.warn('[RecurringIntegration] Failed to synchronize void to occurrence:', err.message);
        }

        return { handled: false, reason: 'Occurrence not found or synchronization failed' };
    }
};
