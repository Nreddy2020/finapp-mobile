/**
 * services/shared-costs/settlementOptimizer.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Settlement Optimizer.
 * 
 * Implements greedy debtor-creditor matching algorithm to simplify debts.
 * Greedy debtor-creditor matching produces a deterministic settlement plan with no more than N−1 transfers
 * in the tested balancing model. It is a heuristic and does not guarantee the globally minimum number of transfers.
 * 
 * Invariants:
 * - Deterministic tie-breaking by balance magnitude then member ID / name.
 * - Exact BigInt paise math: sum(settlements) === sum(creditor balances) === sum(|debtor balances|).
 * - Upper bound transaction count <= N - 1 (where N is number of unsettled members).
 */

import { toRupeesFormatted, paiseToRupees } from './groupContracts.js';

export const SettlementOptimizer = {
    /**
     * Compute deterministic simplified settlement plan from net balance projections.
     * 
     * @param {Array<Object>} projections - Array of member projections from GroupBalanceEngine
     * @param {string} currencySymbol - Currency symbol for formatted strings (default '₹')
     * @returns {Object} { suggestions: Array<Object>, totalSettlementPaise, transactionCount }
     */
    simplifyDebts(projections = [], currencySymbol = '₹') {
        const debtors = [];
        const creditors = [];

        projections.forEach(p => {
            const net = BigInt(p.netBalancePaise || 0);
            const name = p.displayNameSnapshot || p.memberId;
            if (net < 0n) {
                debtors.push({
                    memberId: String(p.memberId),
                    displayNameSnapshot: name,
                    amountRemainingPaise: -net // positive magnitude
                });
            } else if (net > 0n) {
                creditors.push({
                    memberId: String(p.memberId),
                    displayNameSnapshot: name,
                    amountRemainingPaise: net
                });
            }
        });

        // Deterministic sort function: Largest amount first, tie-break by name then id
        const comparator = (a, b) => {
            if (b.amountRemainingPaise !== a.amountRemainingPaise) {
                return b.amountRemainingPaise > a.amountRemainingPaise ? 1 : -1;
            }
            const nameA = String(a.displayNameSnapshot).toLowerCase();
            const nameB = String(b.displayNameSnapshot).toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return a.memberId.localeCompare(b.memberId);
        };

        debtors.sort(comparator);
        creditors.sort(comparator);

        const suggestions = [];
        let totalSettlementPaise = 0n;

        let dIdx = 0;
        let cIdx = 0;

        while (dIdx < debtors.length && cIdx < creditors.length) {
            const debtor = debtors[dIdx];
            const creditor = creditors[cIdx];

            // Settlement amount is the minimum of what debtor owes and creditor is owed
            const amountToSettle = debtor.amountRemainingPaise < creditor.amountRemainingPaise
                ? debtor.amountRemainingPaise
                : creditor.amountRemainingPaise;

            if (amountToSettle > 0n) {
                suggestions.push({
                    id: `settle_sugg_${debtor.memberId}_${creditor.memberId}_${suggestions.length + 1}`,
                    fromMemberId: debtor.memberId,
                    fromName: debtor.displayNameSnapshot,
                    toMemberId: creditor.memberId,
                    toName: creditor.displayNameSnapshot,
                    amountPaise: amountToSettle,
                    amountFormatted: toRupeesFormatted(amountToSettle, currencySymbol),
                    description: `${debtor.displayNameSnapshot} pays ${creditor.displayNameSnapshot} ${toRupeesFormatted(amountToSettle, currencySymbol)}`
                });

                totalSettlementPaise += amountToSettle;
                debtor.amountRemainingPaise -= amountToSettle;
                creditor.amountRemainingPaise -= amountToSettle;
            }

            if (debtor.amountRemainingPaise === 0n) {
                dIdx += 1;
            }
            if (creditor.amountRemainingPaise === 0n) {
                cIdx += 1;
            }
        }

        return {
            suggestions,
            totalSettlementPaise,
            transactionCount: suggestions.length,
            isFullySettled: suggestions.length === 0
        };
    },

    /**
     * Convert suggested settlements into executable GroupSettlement entities
     * 
     * @param {string} groupId
     * @param {Array<Object>} suggestions - Suggested settlements from simplifyDebts
     * @param {string} method - 'CASH', 'UPI', 'BANK_TRANSFER'
     * @returns {Array<Object>}
     */
    prepareSettlementRecords(groupId, suggestions, method = 'UPI') {
        const now = new Date().toISOString();
        return suggestions.map(s => ({
            id: `settlement_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            groupId: String(groupId),
            fromMemberId: s.fromMemberId,
            toMemberId: s.toMemberId,
            amountPaise: s.amountPaise,
            currency: 'INR',
            settlementDate: now,
            method,
            note: `Auto-generated settlement: ${s.description}`,
            status: 'COMPLETED',
            createdAt: now,
            idempotencyKey: `auto_settle_${groupId}_${s.fromMemberId}_${s.toMemberId}_${s.amountPaise.toString()}`
        }));
    }
};
