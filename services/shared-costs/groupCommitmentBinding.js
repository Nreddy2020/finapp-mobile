/**
 * services/shared-costs/groupCommitmentBinding.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Cashbook V3 Commitment Binding.
 * 
 * Implements strict read-only / decoupled integration:
 * 1. generateExpenseCommitmentDescriptor(expense, payment)
 * 2. requestCommitmentRegistration(descriptor, options)
 * 3. requestCommitmentDeactivation(expenseId, options)
 * 
 * Invariants:
 * - Does NOT write directly to Cashbook ledger tables or mutate cashbook state.
 * - Does NOT mutate audit hashes or alter balances.
 * - Sanitizes metadata: zero raw personal data.
 * - Graceful degradation if Cashbook is offline or unavailable.
 */

import { RecurringIntegration } from '../cashbook/recurringIntegration.js';

export const GroupCommitmentBinding = {
    /**
     * Stage 1: Generate Deterministic Commitment Descriptor (Pure Transformer)
     * 
     * @param {Object} expense - Validated group expense
     * @param {Object} payment - Payer payment record
     * @returns {Object} Validated commitment descriptor
     */
    generateExpenseCommitmentDescriptor(expense, payment) {
        if (!expense || !expense.id) {
            throw new Error(`INVALID_EXPENSE: Expected valid expense entity with an ID`);
        }
        if (!payment || !payment.id) {
            throw new Error(`INVALID_PAYMENT: Expected valid payment entity with an ID`);
        }

        const amountPaise = BigInt(payment.amountPaise || 0);
        if (amountPaise <= 0n) {
            throw new Error(`INVALID_PAYMENT_AMOUNT: Cannot bind commitment for zero or negative payment`);
        }

        const sanitizedTitle = String(expense.title || 'Shared Expense').trim().replace(/[\r\n\t]/g, ' ');

        return {
            commitmentId: `SC_COMMITMENT_v1_${expense.id}_${payment.id}`,
            name: `Group Expense: ${sanitizedTitle}`,
            category: 'SHARED_COSTS',
            amountPaise,
            frequency: 'ONE_TIME',
            dueDayOfMonth: new Date(expense.expenseDate || Date.now()).getDate(),
            bindingStatus: 'SYNCHRONIZED_ACTIVE',
            metadata: {
                expenseId: String(expense.id),
                groupId: String(expense.groupId),
                paymentId: String(payment.id),
                payerMemberId: String(payment.memberId),
                splitMethod: String(expense.splitMethod || 'EQUAL'),
                schemaVersion: 1,
                sourceModule: 'SHARED_COSTS_V1'
            }
        };
    },

    /**
     * Stage 2: Request Registration via Cashbook Recurring Integration
     * 
     * @param {Object} descriptor - Generated commitment descriptor
     * @param {Object} options - { silent: boolean }
     * @returns {Promise<Object>} { success: boolean, bound: boolean, reason?: string }
     */
    async requestCommitmentRegistration(descriptor, options = {}) {
        try {
            if (typeof RecurringIntegration !== 'undefined' && typeof RecurringIntegration.registerExternalCommitment === 'function') {
                await RecurringIntegration.registerExternalCommitment(descriptor);
                return { success: true, bound: true, commitmentId: descriptor.commitmentId };
            }
            // Graceful degradation: Cashbook commitment API not loaded or available
            return {
                success: true,
                bound: false,
                reason: 'CASHBOOK_INTEGRATION_UNAVAILABLE_OR_STANDALONE'
            };
        } catch (err) {
            if (options.silent) {
                return { success: false, bound: false, reason: err.message };
            }
            throw err;
        }
    },

    /**
     * Stage 3: Request Deactivation (e.g. When an expense is VOIDED)
     */
    async requestCommitmentDeactivation(expenseId, options = {}) {
        try {
            if (typeof RecurringIntegration !== 'undefined' && typeof RecurringIntegration.deactivateExternalCommitment === 'function') {
                await RecurringIntegration.deactivateExternalCommitment(`SC_COMMITMENT_v1_${expenseId}`);
                return { success: true, deactivated: true };
            }
            return { success: true, deactivated: false, reason: 'CASHBOOK_INTEGRATION_UNAVAILABLE' };
        } catch (err) {
            if (options.silent) {
                return { success: false, deactivated: false, reason: err.message };
            }
            throw err;
        }
    }
};
