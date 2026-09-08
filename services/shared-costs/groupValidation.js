/**
 * services/shared-costs/groupValidation.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Domain Validation.
 * 
 * Enforces strict input validation, security boundaries, and invariant integrity
 * for Groups, Members, Expenses, Payments, Shares, and Settlements.
 */

import {
    GROUP_TYPES,
    GROUP_STATUS,
    MEMBER_ROLES,
    SPLIT_METHODS,
    SETTLEMENT_METHODS,
    SHARED_COSTS_CONSTANTS,
    hasRolePermission,
    GROUP_ACTIONS,
    toPaise,
    paiseToRupees
} from './groupContracts.js';

export const GroupValidation = {
    /**
     * Validate Group entity creation or modification
     */
    validateGroup(group) {
        if (!group || typeof group !== 'object') {
            throw new Error(`VALIDATION_ERROR: Group must be a valid object`);
        }

        const name = String(group.name || '').trim();
        if (name.length < 1 || name.length > SHARED_COSTS_CONSTANTS.MAX_GROUP_NAME_LENGTH) {
            throw new Error(`INVALID_GROUP_NAME: Group name must be between 1 and ${SHARED_COSTS_CONSTANTS.MAX_GROUP_NAME_LENGTH} characters`);
        }

        if (group.type && !Object.values(GROUP_TYPES).includes(group.type)) {
            throw new Error(`INVALID_GROUP_TYPE: Unknown group type '${group.type}'`);
        }

        if (group.members !== undefined) {
            if (!Array.isArray(group.members)) {
                throw new Error(`INVALID_MEMBERS: Members must be an array`);
            }
            if (group.members.length > SHARED_COSTS_CONSTANTS.MAX_MEMBERS_PER_GROUP) {
                throw new Error(`MEMBER_LIMIT_EXCEEDED: Maximum ${SHARED_COSTS_CONSTANTS.MAX_MEMBERS_PER_GROUP} members permitted`);
            }

            const seenIds = new Set();
            group.members.forEach((m, idx) => {
                const id = String(m.id || m.memberId || '');
                if (!id) {
                    throw new Error(`INVALID_MEMBER_ID: Member at index ${idx} is missing an ID`);
                }
                if (seenIds.has(id)) {
                    throw new Error(`DUPLICATE_MEMBER_ID: Member ID '${id}' appears multiple times in group`);
                }
                seenIds.add(id);

                const name = String(m.displayNameSnapshot || m.name || '').trim();
                if (!name) {
                    throw new Error(`INVALID_MEMBER_NAME: Member '${id}' has an empty name`);
                }
            });
        }

        return true;
    },

    /**
     * Validate GroupExpense entity
     */
    validateExpense(expense) {
        if (!expense || typeof expense !== 'object') {
            throw new Error(`VALIDATION_ERROR: Expense must be a valid object`);
        }

        const title = String(expense.title || '').trim();
        if (title.length < 1 || title.length > 150) {
            throw new Error(`INVALID_EXPENSE_TITLE: Expense title must be between 1 and 150 characters`);
        }

        const totalPaise = BigInt(expense.totalAmountPaise !== undefined ? expense.totalAmountPaise : toPaise(expense.amount || 0));
        if (totalPaise < SHARED_COSTS_CONSTANTS.MIN_EXPENSE_PAISE) {
            throw new Error(`INVALID_AMOUNT: Expense amount must be at least ₹0.01 (${SHARED_COSTS_CONSTANTS.MIN_EXPENSE_PAISE} paise)`);
        }
        if (totalPaise > SHARED_COSTS_CONSTANTS.MAX_EXPENSE_PAISE) {
            throw new Error(`AMOUNT_EXCEEDS_CAP: Expense amount exceeds maximum limit of ₹100 Crore`);
        }

        if (expense.splitMethod && !Object.values(SPLIT_METHODS).includes(expense.splitMethod)) {
            throw new Error(`INVALID_SPLIT_METHOD: Unknown split method '${expense.splitMethod}'`);
        }

        // Validate Payments: Sum must equal totalPaise exactly
        if (!Array.isArray(expense.payments) || expense.payments.length === 0) {
            throw new Error(`NO_PAYMENTS: Expense must have at least one payment record`);
        }
        const paymentsSum = expense.payments.reduce((sum, p) => {
            const amt = BigInt(p.amountPaise !== undefined ? p.amountPaise : toPaise(p.amount || 0));
            if (amt < 0n) throw new Error(`NEGATIVE_PAYMENT: Payment amount cannot be negative`);
            return sum + amt;
        }, 0n);

        if (paymentsSum !== totalPaise) {
            throw new Error(`PAYMENTS_SUM_MISMATCH: Total payments (${paymentsSum} paise) !== expense total (${totalPaise} paise)`);
        }

        // Validate Shares: Sum must equal totalPaise exactly
        if (!Array.isArray(expense.shares) || expense.shares.length === 0) {
            throw new Error(`NO_SHARES: Expense must have at least one share record`);
        }
        const sharesSum = expense.shares.reduce((sum, s) => {
            const amt = BigInt(s.amountPaise !== undefined ? s.amountPaise : toPaise(s.amount || 0));
            if (amt < 0n) throw new Error(`NEGATIVE_SHARE: Share amount cannot be negative`);
            return sum + amt;
        }, 0n);

        if (sharesSum !== totalPaise) {
            throw new Error(`SHARES_SUM_MISMATCH: Total shares (${sharesSum} paise) !== expense total (${totalPaise} paise)`);
        }

        return true;
    },

    /**
     * Validate GroupSettlement entity
     */
    validateSettlement(settlement) {
        if (!settlement || typeof settlement !== 'object') {
            throw new Error(`VALIDATION_ERROR: Settlement must be a valid object`);
        }

        const fromId = String(settlement.fromMemberId || '');
        const toId = String(settlement.toMemberId || '');

        if (!fromId || !toId) {
            throw new Error(`MISSING_SETTLEMENT_MEMBERS: fromMemberId and toMemberId are required`);
        }
        if (fromId === toId) {
            throw new Error(`SELF_SETTLEMENT_REJECTED: Member cannot settle with themselves`);
        }

        const amountPaise = BigInt(settlement.amountPaise !== undefined ? settlement.amountPaise : toPaise(settlement.amount || 0));
        if (amountPaise <= 0n) {
            throw new Error(`INVALID_SETTLEMENT_AMOUNT: Settlement amount must be greater than 0 paise`);
        }

        if (settlement.method && !Object.values(SETTLEMENT_METHODS).includes(settlement.method)) {
            throw new Error(`INVALID_SETTLEMENT_METHOD: Unknown settlement method '${settlement.method}'`);
        }

        return true;
    },

    /**
     * Verify caller has authorization to perform action in group
     */
    verifyPermission(userRole, action) {
        if (!hasRolePermission(userRole, action)) {
            throw new Error(`PERMISSION_DENIED: Role '${userRole}' is not authorized to perform action '${action}'`);
        }
        return true;
    },

    /**
     * Ensure a member can be safely removed (must have zero net balance)
     */
    assertCanRemoveMember(memberId, memberProjections) {
        const targetId = String(memberId);
        const projection = memberProjections[targetId];
        if (projection && projection.netBalancePaise !== 0n) {
            const rupees = paiseToRupees(projection.netBalancePaise);
            const statusStr = projection.netBalancePaise > 0n ? `owed ₹${rupees}` : `owes ₹${Math.abs(rupees)}`;
            throw new Error(`CANNOT_REMOVE_ACTIVE_MEMBER: Member '${targetId}' has an outstanding balance (${statusStr}). Must settle to ₹0.00 first.`);
        }
        return true;
    }
};
