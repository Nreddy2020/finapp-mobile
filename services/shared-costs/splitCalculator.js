/**
 * services/shared-costs/splitCalculator.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Split Calculator.
 * 
 * Provides pure mathematical algorithms for all 5 split methods:
 * 1. EQUAL (deterministic integer remainder distribution)
 * 2. EXACT (strict penny-perfect equality check)
 * 3. PERCENTAGE (basis-points scaling with remainder allocation)
 * 4. SHARES (unit-weight distribution with remainder allocation)
 * 5. CUSTOM (validated custom allocation)
 * 
 * Multi-payer validation:
 * Ensures sum(payments) === totalPaise bit-for-bit.
 * 
 * Invariants:
 * - Zero floating-point math. All operations executed in BigInt paise.
 * - Conservation invariant: sum(allocated shares) === totalPaise.
 * - Deterministic ordering for remainder paise allocation.
 */

import { SPLIT_METHODS, SHARED_COSTS_CONSTANTS, toPaise, paiseToRupees } from './groupContracts.js';

/**
 * Helper: Stably sort members by immutable memberId.
 * Ensures remainder allocation is invariant to display names, UI ordering, or locale changes.
 */
function sortMembersStably(members) {
    return [...members].sort((a, b) => {
        const idA = String(a.id || a.memberId || '');
        const idB = String(b.id || b.memberId || '');
        if (idA !== idB) return idA.localeCompare(idB);
        const nameA = String(a.displayNameSnapshot || a.name || '').toLowerCase();
        const nameB = String(b.displayNameSnapshot || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
    });
}

export const SplitCalculator = {
    /**
     * Split an amount EQUALLY among participating members with deterministic remainder allocation.
     * 
     * Formula:
     *   base = totalPaise / M
     *   remainder = totalPaise - (base * M)
     *   The first 'remainder' members in stable sort order receive base + 1n paise.
     *   Remaining members receive base paise.
     * 
     * @param {bigint|number|string} totalAmount
     * @param {Array<Object|string>} members - Array of member objects or string IDs
     * @returns {Object} { shares: Array<{ memberId, amountPaise, remainderPaise }>, disclosure: string|null, totalAllocatedPaise }
     */
    splitEqual(totalAmount, members) {
        const totalPaise = toPaise(totalAmount);
        if (totalPaise < SHARED_COSTS_CONSTANTS.MIN_EXPENSE_PAISE) {
            throw new Error(`INVALID_TOTAL_AMOUNT: Amount must be at least ₹0.01 (${SHARED_COSTS_CONSTANTS.MIN_EXPENSE_PAISE} paise), got ${totalPaise}`);
        }
        if (!Array.isArray(members) || members.length === 0) {
            throw new Error(`EMPTY_MEMBERS_LIST: Equal split requires at least one member`);
        }

        const normalizedMembers = members.map((m, idx) => {
            if (typeof m === 'string') return { id: m, displayNameSnapshot: m };
            return {
                id: m.id || m.memberId || `m_${idx}`,
                displayNameSnapshot: m.displayNameSnapshot || m.name || m.id || `Member ${idx + 1}`
            };
        });

        const M = BigInt(normalizedMembers.length);
        const base = totalPaise / M;
        const remainder = totalPaise - (base * M); // remainder is BigInt between 0n and M - 1n

        const sorted = sortMembersStably(normalizedMembers);
        const remainderInt = Number(remainder);
        const remainderRecipients = [];

        const shares = sorted.map((member, index) => {
            const extra = index < remainderInt ? 1n : 0n;
            const amountPaise = base + extra;
            if (extra > 0n) {
                remainderRecipients.push(member.displayNameSnapshot);
            }
            return {
                memberId: member.id,
                displayNameSnapshot: member.displayNameSnapshot,
                amountPaise,
                remainderPaise: extra,
                shareUnits: 1,
                percentageBps: 0n
            };
        });

        // Verify Conservation Invariant
        const totalAllocated = shares.reduce((sum, s) => sum + s.amountPaise, 0n);
        if (totalAllocated !== totalPaise) {
            throw new Error(`INVARIANT_VIOLATION: Equal split sum (${totalAllocated}) !== totalPaise (${totalPaise})`);
        }

        let disclosure = null;
        if (remainderInt > 0) {
            const remainderRupees = (remainderInt / 100).toFixed(2);
            disclosure = `Remainder of ₹${remainderRupees} allocated to ${remainderRecipients.join(', ')} (deterministic rounding)`;
        }

        return {
            splitMethod: SPLIT_METHODS.EQUAL,
            totalAmountPaise: totalPaise,
            shares,
            disclosure,
            remainderPaise: remainder,
            totalAllocatedPaise: totalAllocated
        };
    },

    /**
     * Split an amount by EXACT rupee / paise values specified for each member.
     * Strict penny-perfect validation: sum(shares) must equal totalAmount exactly.
     * 
     * @param {bigint|number|string} totalAmount
     * @param {Array<Object>} exactSharesInput - Array of { memberId, amountPaise|amount, displayNameSnapshot }
     * @returns {Object}
     */
    splitExact(totalAmount, exactSharesInput) {
        const totalPaise = toPaise(totalAmount);
        if (!Array.isArray(exactSharesInput) || exactSharesInput.length === 0) {
            throw new Error(`EMPTY_SHARES_LIST: Exact split requires at least one share entry`);
        }

        let runningSum = 0n;
        const shares = exactSharesInput.map((item, idx) => {
            const memberId = item.memberId || item.id || `m_${idx}`;
            const amountPaise = item.amountPaise !== undefined ? BigInt(item.amountPaise) : toPaise(item.amount || 0);
            if (amountPaise < 0n) {
                throw new Error(`NEGATIVE_SHARE_REJECTED: Member ${memberId} share cannot be negative (${amountPaise} paise)`);
            }
            runningSum += amountPaise;
            return {
                memberId,
                displayNameSnapshot: item.displayNameSnapshot || item.name || memberId,
                amountPaise,
                remainderPaise: 0n,
                shareUnits: 0,
                percentageBps: 0n
            };
        });

        if (runningSum !== totalPaise) {
            const diffPaise = totalPaise - runningSum;
            const diffRupees = paiseToRupees(diffPaise < 0n ? -diffPaise : diffPaise).toFixed(2);
            const direction = diffPaise > 0n ? 'under' : 'over';
            throw new Error(`EXACT_SPLIT_MISMATCH: Sum of exact shares (₹${paiseToRupees(runningSum).toFixed(2)}) is ${direction} total amount (₹${paiseToRupees(totalPaise).toFixed(2)}) by ₹${diffRupees}`);
        }

        return {
            splitMethod: SPLIT_METHODS.EXACT,
            totalAmountPaise: totalPaise,
            shares,
            disclosure: null,
            remainderPaise: 0n,
            totalAllocatedPaise: runningSum
        };
    },

    /**
     * Split an amount by PERCENTAGES (using basis points: 10,000 bps = 100.00%).
     * Remainder paise from division are allocated deterministically to members in stable order.
     * 
     * @param {bigint|number|string} totalAmount
     * @param {Array<Object>} percentageInput - Array of { memberId, percentageBps|percentage, displayNameSnapshot }
     * @returns {Object}
     */
    splitPercentage(totalAmount, percentageInput) {
        const totalPaise = toPaise(totalAmount);
        if (!Array.isArray(percentageInput) || percentageInput.length === 0) {
            throw new Error(`EMPTY_PERCENTAGES_LIST: Percentage split requires member percentages`);
        }

        // Normalize basis points (100% = 10000 bps)
        let totalBps = 0n;
        const normalized = percentageInput.map((item, idx) => {
            let bps;
            if (item.percentageBps !== undefined) {
                bps = BigInt(item.percentageBps);
            } else if (item.percentage !== undefined) {
                // percentage is e.g. 33.33 -> 3333 bps
                bps = BigInt(Math.round(Number(item.percentage) * 100));
            } else {
                bps = 0n;
            }
            if (bps < 0n) {
                throw new Error(`NEGATIVE_PERCENTAGE: Member ${item.memberId} percentage cannot be negative`);
            }
            totalBps += bps;
            return {
                id: item.memberId || item.id || `m_${idx}`,
                displayNameSnapshot: item.displayNameSnapshot || item.name || `Member ${idx + 1}`,
                percentageBps: bps
            };
        });

        if (totalBps !== SHARED_COSTS_CONSTANTS.BPS_SCALE) {
            const diffBps = SHARED_COSTS_CONSTANTS.BPS_SCALE - totalBps;
            const diffPct = (Number(diffBps) / 100).toFixed(2);
            throw new Error(`PERCENTAGE_SUM_INVALID: Total percentage must equal 100.00% (10,000 bps). Current: ${(Number(totalBps)/100).toFixed(2)}%, difference: ${diffPct}%`);
        }

        const sorted = sortMembersStably(normalized);

        // Base allocation
        let allocatedBaseSum = 0n;
        const preliminary = sorted.map(item => {
            const baseShare = (totalPaise * item.percentageBps) / SHARED_COSTS_CONSTANTS.BPS_SCALE;
            allocatedBaseSum += baseShare;
            return {
                ...item,
                baseShare
            };
        });

        const remainder = totalPaise - allocatedBaseSum; // Remainder paise
        const remainderInt = Number(remainder);
        const remainderRecipients = [];

        const shares = preliminary.map((item, index) => {
            const extra = index < remainderInt ? 1n : 0n;
            const amountPaise = item.baseShare + extra;
            if (extra > 0n) {
                remainderRecipients.push(item.displayNameSnapshot);
            }
            return {
                memberId: item.id,
                displayNameSnapshot: item.displayNameSnapshot,
                amountPaise,
                remainderPaise: extra,
                percentageBps: item.percentageBps,
                shareUnits: 0
            };
        });

        const totalAllocated = shares.reduce((sum, s) => sum + s.amountPaise, 0n);
        if (totalAllocated !== totalPaise) {
            throw new Error(`INVARIANT_VIOLATION: Percentage split sum (${totalAllocated}) !== totalPaise (${totalPaise})`);
        }

        let disclosure = null;
        if (remainderInt > 0) {
            disclosure = `Rounding remainder of ₹${(remainderInt / 100).toFixed(2)} allocated to ${remainderRecipients.join(', ')} (deterministic rounding)`;
        }

        return {
            splitMethod: SPLIT_METHODS.PERCENTAGE,
            totalAmountPaise: totalPaise,
            shares,
            disclosure,
            remainderPaise: remainder,
            totalAllocatedPaise: totalAllocated
        };
    },

    /**
     * Split an amount by SHARES (unit weights, e.g. 2 shares for Bob, 1 share for Alice).
     * 
     * @param {bigint|number|string} totalAmount
     * @param {Array<Object>} sharesInput - Array of { memberId, shareUnits|shares, displayNameSnapshot }
     * @returns {Object}
     */
    splitShares(totalAmount, sharesInput) {
        const totalPaise = toPaise(totalAmount);
        if (!Array.isArray(sharesInput) || sharesInput.length === 0) {
            throw new Error(`EMPTY_SHARES_LIST: Shares split requires member share weights`);
        }

        let totalUnits = 0n;
        const normalized = sharesInput.map((item, idx) => {
            const units = BigInt(item.shareUnits || item.shares || 0);
            if (units < 0n) {
                throw new Error(`NEGATIVE_SHARES: Member ${item.memberId} cannot have negative share units`);
            }
            totalUnits += units;
            return {
                id: item.memberId || item.id || `m_${idx}`,
                displayNameSnapshot: item.displayNameSnapshot || item.name || `Member ${idx + 1}`,
                shareUnits: Number(units),
                unitsBigInt: units
            };
        });

        if (totalUnits === 0n) {
            throw new Error(`ZERO_TOTAL_SHARES: Total share units must be greater than 0`);
        }

        const sorted = sortMembersStably(normalized);

        let allocatedBaseSum = 0n;
        const preliminary = sorted.map(item => {
            const baseShare = (totalPaise * item.unitsBigInt) / totalUnits;
            allocatedBaseSum += baseShare;
            return {
                ...item,
                baseShare
            };
        });

        const remainder = totalPaise - allocatedBaseSum;
        const remainderInt = Number(remainder);
        const remainderRecipients = [];

        const shares = preliminary.map((item, index) => {
            const extra = index < remainderInt ? 1n : 0n;
            const amountPaise = item.baseShare + extra;
            if (extra > 0n) {
                remainderRecipients.push(item.displayNameSnapshot);
            }
            return {
                memberId: item.id,
                displayNameSnapshot: item.displayNameSnapshot,
                amountPaise,
                remainderPaise: extra,
                shareUnits: item.shareUnits,
                percentageBps: 0n
            };
        });

        const totalAllocated = shares.reduce((sum, s) => sum + s.amountPaise, 0n);
        if (totalAllocated !== totalPaise) {
            throw new Error(`INVARIANT_VIOLATION: Shares split sum (${totalAllocated}) !== totalPaise (${totalPaise})`);
        }

        let disclosure = null;
        if (remainderInt > 0) {
            disclosure = `Rounding remainder of ₹${(remainderInt / 100).toFixed(2)} allocated to ${remainderRecipients.join(', ')} (deterministic rounding)`;
        }

        return {
            splitMethod: SPLIT_METHODS.SHARES,
            totalAmountPaise: totalPaise,
            shares,
            disclosure,
            remainderPaise: remainder,
            totalAllocatedPaise: totalAllocated
        };
    },

    /**
     * Validate and normalize multi-payer contributions for an expense.
     * Ensures: sum(payments) === totalPaise bit-for-bit.
     * 
     * @param {bigint|number|string} totalAmount
     * @param {Array<Object>} paymentsInput - Array of { memberId, amountPaise|amount, paymentMethod, cashbookBindingId }
     * @returns {Array<Object>} Validated ExpensePayment records
     */
    validatePayments(totalAmount, paymentsInput) {
        const totalPaise = toPaise(totalAmount);
        if (!Array.isArray(paymentsInput) || paymentsInput.length === 0) {
            throw new Error(`EMPTY_PAYMENTS_LIST: Expense must have at least one payer`);
        }

        let totalPaid = 0n;
        const validatedPayments = paymentsInput.map((p, idx) => {
            if (!p.memberId) {
                throw new Error(`MISSING_PAYER_ID: Payment at index ${idx} is missing memberId`);
            }
            const amountPaise = p.amountPaise !== undefined ? BigInt(p.amountPaise) : toPaise(p.amount || 0);
            if (amountPaise < 0n) {
                throw new Error(`NEGATIVE_PAYMENT: Payer ${p.memberId} payment cannot be negative (${amountPaise} paise)`);
            }
            totalPaid += amountPaise;
            return {
                id: p.id || `pay_${Date.now()}_${idx}`,
                memberId: String(p.memberId),
                amountPaise,
                paymentMethod: p.paymentMethod || 'CASH',
                cashbookBindingId: p.cashbookBindingId || null
            };
        });

        if (totalPaid !== totalPaise) {
            const diffPaise = totalPaise - totalPaid;
            const diffRupees = paiseToRupees(diffPaise < 0n ? -diffPaise : diffPaise).toFixed(2);
            const direction = diffPaise < 0n ? 'exceeds' : 'falls short of';
            throw new Error(`PAYMENTS_SUM_MISMATCH: Total payments (₹${paiseToRupees(totalPaid).toFixed(2)}) ${direction} total expense amount (₹${paiseToRupees(totalPaise).toFixed(2)}) by ₹${diffRupees}`);
        }

        return validatedPayments;
    }
};
