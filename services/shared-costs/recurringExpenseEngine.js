/**
 * services/shared-costs/recurringExpenseEngine.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Recurring Expenses Engine.
 * 
 * Manages recurring expense templates (Rent, Wi-Fi, Maid, Subscriptions)
 * and generates deterministic expense occurrences with duplicate protection.
 */

import { RECURRING_FREQUENCIES, SPLIT_METHODS, EXPENSE_STATUS } from './groupContracts.js';
import { SplitCalculator } from './splitCalculator.js';

export const RecurringExpenseEngine = {
    /**
     * Compute next occurrence timestamp after a reference date
     * 
     * @param {string} frequency - 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY'
     * @param {Date|string} fromDate - Starting date
     * @returns {string} ISO Date string of next occurrence
     */
    calculateNextOccurrence(frequency, fromDate = new Date()) {
        const d = new Date(fromDate);
        if (isNaN(d.getTime())) {
            throw new Error(`INVALID_DATE: Invalid reference date '${fromDate}'`);
        }

        switch (frequency) {
            case RECURRING_FREQUENCIES.WEEKLY:
                d.setDate(d.getDate() + 7);
                break;
            case RECURRING_FREQUENCIES.MONTHLY:
                d.setMonth(d.getMonth() + 1);
                break;
            case RECURRING_FREQUENCIES.QUARTERLY:
                d.setMonth(d.getMonth() + 3);
                break;
            case RECURRING_FREQUENCIES.ANNUALLY:
                d.setFullYear(d.getFullYear() + 1);
                break;
            default:
                d.setMonth(d.getMonth() + 1);
        }

        return d.toISOString();
    },

    /**
     * Evaluate whether a recurring expense template is due for generation
     * 
     * @param {Object} template
     * @param {Date|string} asOfDate
     * @returns {boolean}
     */
    isOccurrenceDue(template, asOfDate = new Date()) {
        if (!template || template.status !== 'ACTIVE') return false;
        if (!template.nextOccurrenceDate) return true;

        const target = new Date(asOfDate);
        const due = new Date(template.nextOccurrenceDate);

        if (template.endDate && target > new Date(template.endDate)) {
            return false;
        }

        return target >= due;
    },

    /**
     * Generate a new GroupExpense entity from a recurring template
     * 
     * @param {Object} template
     * @param {Array<Object>} groupMembers - Active members of the group
     * @param {Date|string} occurrenceDate
     * @returns {Object} { expense: Object, updatedTemplate: Object }
     */
    generateOccurrence(template, groupMembers = [], occurrenceDate = new Date()) {
        const occDate = new Date(occurrenceDate);
        const dateStr = occDate.toISOString().split('T')[0];
        const currency = template.currency || 'INR';
        const revision = template.revision || 1;
        const idempotencyKey = `SC-RECURRING:${template.groupId}:${template.id}:${dateStr}:${currency}:rev-${revision}`;

        const totalPaise = BigInt(template.totalAmountPaise || 0);

        // Compute shares according to template's split method
        let splitResult;
        const splitMethod = template.splitMethod || SPLIT_METHODS.EQUAL;

        if (splitMethod === SPLIT_METHODS.EQUAL) {
            const participants = Array.isArray(template.participantMemberIds) && template.participantMemberIds.length > 0
                ? groupMembers.filter(m => template.participantMemberIds.includes(m.id))
                : groupMembers;
            splitResult = SplitCalculator.splitEqual(totalPaise, participants);
        } else if (splitMethod === SPLIT_METHODS.PERCENTAGE && template.percentages) {
            splitResult = SplitCalculator.splitPercentage(totalPaise, template.percentages);
        } else if (splitMethod === SPLIT_METHODS.SHARES && template.sharesInput) {
            splitResult = SplitCalculator.splitShares(totalPaise, template.sharesInput);
        } else {
            // Default to equal among all members
            splitResult = SplitCalculator.splitEqual(totalPaise, groupMembers);
        }

        // Payer rule
        const payerId = template.defaultPayerMemberId || (groupMembers[0] && groupMembers[0].id) || 'You';
        const payments = [
            {
                id: `pay_${idempotencyKey}_0`,
                memberId: payerId,
                amountPaise: totalPaise,
                paymentMethod: template.paymentMethod || 'BANK_TRANSFER',
                cashbookBindingId: null
            }
        ];

        const expense = {
            id: `exp_${idempotencyKey}`,
            groupId: template.groupId,
            profileId: template.profileId || 'DEFAULT',
            title: `${template.title} (${dateStr})`,
            category: template.category || 'Recurring Expense',
            currency: template.currency || 'INR',
            totalAmountPaise: totalPaise,
            expenseDate: occDate.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            createdBy: template.createdBy || 'SYSTEM_RECURRING',
            status: EXPENSE_STATUS.ACTIVE,
            splitMethod,
            notes: `Auto-generated occurrence from recurring template '${template.title}'`,
            attachmentIds: [],
            source: 'RECURRING_TEMPLATE',
            revision: 1,
            idempotencyKey,
            payments,
            shares: splitResult.shares
        };

        const nextOcc = this.calculateNextOccurrence(template.frequency, occDate);
        const updatedTemplate = {
            ...template,
            lastGeneratedDate: occDate.toISOString(),
            nextOccurrenceDate: nextOcc,
            updatedAt: new Date().toISOString()
        };

        return {
            expense,
            updatedTemplate
        };
    }
};
