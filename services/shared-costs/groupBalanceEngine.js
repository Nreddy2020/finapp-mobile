/**
 * services/shared-costs/groupBalanceEngine.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Balance Projection Engine.
 * 
 * Computes deterministic balance projections from the immutable expense and settlement
 * event history with non-destructive revisions and voids.
 * 
 * Invariants:
 * - Pure integer arithmetic in BigInt paise.
 * - Global Conservation Invariant: sum(net balances across all group members) === 0n paise.
 * - Net balance formula:
 *     netBalance = (totalPaid - totalOwed) + (settlementsPaid - settlementsReceived)
 *     (Positive = Creditor / Owed to member; Negative = Debtor / Member owes)
 */

import { EXPENSE_STATUS, SETTLEMENT_STATUS, GROUP_STATUS } from './groupContracts.js';

export const GroupBalanceEngine = {
    /**
     * Compute balance projections for all members of a group.
     * 
     * @param {Object} group - Group entity { id, members: Array<{ id, displayNameSnapshot }>, status }
     * @param {Array<Object>} expenses - List of group expenses with payments and shares
     * @param {Array<Object>} settlements - List of group settlements
     * @param {Object} options - { allowQuarantined?: boolean }
     * @returns {Object} { memberProjections: Map/Object, summary: Object, conservationVerified: boolean }
     */
    calculateGroupBalances(group, expenses = [], settlements = [], options = {}) {
        if (!group || !group.id) {
            throw new Error(`INVALID_GROUP: Group with valid id is required`);
        }

        if (group.status === GROUP_STATUS.QUARANTINED && !options.allowQuarantined) {
            throw new Error(`QUARANTINED_GROUP_CALCULATION_REJECTED: Group '${group.id}' is quarantined and cannot participate in normal calculations`);
        }

        const members = Array.isArray(group.members) ? group.members : [];
        const memberIds = new Set(members.map(m => String(m.id || m.memberId)));

        // Initialize zero balances for all registered members
        const ledger = {};
        members.forEach(m => {
            const id = String(m.id || m.memberId);
            ledger[id] = {
                memberId: id,
                displayNameSnapshot: m.displayNameSnapshot || m.name || id,
                role: m.role || 'MEMBER',
                status: m.status || 'ACTIVE',
                totalPaidPaise: 0n,
                totalOwedPaise: 0n,
                settlementsPaidPaise: 0n,
                settlementsReceivedPaise: 0n,
                netBalancePaise: 0n,
                expenseCount: 0,
                settlementCount: 0
            };
        });

        // 1. Process Active Expenses
        expenses.forEach(exp => {
            // Ignore voided or reversed expenses
            if (exp.status === EXPENSE_STATUS.VOIDED || exp.status === EXPENSE_STATUS.REVERSED) {
                return;
            }

            // Accumulate payments (who paid what)
            const payments = Array.isArray(exp.payments) ? exp.payments : [];
            payments.forEach(payment => {
                const payerId = String(payment.memberId);
                const amountPaise = BigInt(payment.amountPaise || 0);
                if (!ledger[payerId]) {
                    // Create on-the-fly entry if member was removed or external
                    ledger[payerId] = {
                        memberId: payerId,
                        displayNameSnapshot: payment.displayNameSnapshot || payerId,
                        role: 'MEMBER',
                        status: 'ACTIVE',
                        totalPaidPaise: 0n,
                        totalOwedPaise: 0n,
                        settlementsPaidPaise: 0n,
                        settlementsReceivedPaise: 0n,
                        netBalancePaise: 0n,
                        expenseCount: 0,
                        settlementCount: 0
                    };
                }
                ledger[payerId].totalPaidPaise += amountPaise;
                ledger[payerId].expenseCount += 1;
            });

            // Accumulate shares (who owed what)
            const shares = Array.isArray(exp.shares) ? exp.shares : [];
            shares.forEach(share => {
                const debtorId = String(share.memberId);
                const amountPaise = BigInt(share.amountPaise || 0);
                if (!ledger[debtorId]) {
                    ledger[debtorId] = {
                        memberId: debtorId,
                        displayNameSnapshot: share.displayNameSnapshot || debtorId,
                        role: 'MEMBER',
                        status: 'ACTIVE',
                        totalPaidPaise: 0n,
                        totalOwedPaise: 0n,
                        settlementsPaidPaise: 0n,
                        settlementsReceivedPaise: 0n,
                        netBalancePaise: 0n,
                        expenseCount: 0,
                        settlementCount: 0
                    };
                }
                ledger[debtorId].totalOwedPaise += amountPaise;
            });
        });

        // 2. Process Completed Settlements
        settlements.forEach(settlement => {
            if (settlement.status !== SETTLEMENT_STATUS.COMPLETED && settlement.status !== 'COMPLETED') {
                return;
            }

            const fromId = String(settlement.fromMemberId);
            const toId = String(settlement.toMemberId);
            const amountPaise = BigInt(settlement.amountPaise || 0);

            if (!ledger[fromId]) {
                ledger[fromId] = {
                    memberId: fromId,
                    displayNameSnapshot: fromId,
                    role: 'MEMBER',
                    status: 'ACTIVE',
                    totalPaidPaise: 0n,
                    totalOwedPaise: 0n,
                    settlementsPaidPaise: 0n,
                    settlementsReceivedPaise: 0n,
                    netBalancePaise: 0n,
                    expenseCount: 0,
                    settlementCount: 0
                };
            }
            if (!ledger[toId]) {
                ledger[toId] = {
                    memberId: toId,
                    displayNameSnapshot: toId,
                    role: 'MEMBER',
                    status: 'ACTIVE',
                    totalPaidPaise: 0n,
                    totalOwedPaise: 0n,
                    settlementsPaidPaise: 0n,
                    settlementsReceivedPaise: 0n,
                    netBalancePaise: 0n,
                    expenseCount: 0,
                    settlementCount: 0
                };
            }

            // fromMemberId paid money in settlement -> their net debt decreases (or credit increases)
            // In our netBalance formula: net = paid - owed + received - settlementsPaid
            // Wait: Let's verify sign convention!
            // When A pays B ₹500 to settle debt:
            // Prior: A owes ₹500 (net = -500), B is owed ₹500 (net = +500).
            // After settlement:
            // A paid out ₹500. A's debt should become 0!
            // If net = totalPaid - totalOwed + settlementsPaid - settlementsReceived:
            // Let's check:
            // A: net = 0 - 500 + 500 - 0 = 0n!
            // B: net = 500 - 0 + 0 - 500 = 0n!
            // YES! When A pays a settlement, A is the sender (`fromMemberId`), so A's position improves by +amountPaise!
            // When B receives a settlement, B is the recipient (`toMemberId`), so B's credit decreases by -amountPaise!
            // Therefore:
            // netBalance = (totalPaid - totalOwed) + (settlementsPaid - settlementsReceived)
            // Let's record settlementsPaid on fromId and settlementsReceived on toId:
            ledger[fromId].settlementsPaidPaise += amountPaise;
            ledger[fromId].settlementCount += 1;
            ledger[toId].settlementsReceivedPaise += amountPaise;
            ledger[toId].settlementCount += 1;
        });

        // 3. Calculate Final Net Balances & Verify Conservation Invariant
        let globalNetSum = 0n;
        let totalGroupTurnoverPaise = 0n;

        const projections = Object.values(ledger).map(entry => {
            const netBalancePaise = (entry.totalPaidPaise - entry.totalOwedPaise) + 
                                    (entry.settlementsPaidPaise - entry.settlementsReceivedPaise);
            
            entry.netBalancePaise = netBalancePaise;
            globalNetSum += netBalancePaise;
            totalGroupTurnoverPaise += entry.totalPaidPaise;

            return entry;
        });

        // Invariant Verification: sum of net balances must equal exactly 0 paise
        if (globalNetSum !== 0n) {
            throw new Error(`ACCOUNTING_CONSERVATION_VIOLATION: Group ${group.id} net balance sum is ${globalNetSum} paise (expected 0 paise)`);
        }

        const isSettled = projections.every(p => p.netBalancePaise === 0n);

        return {
            groupId: group.id,
            projections,
            projectionMap: ledger,
            totalTurnoverPaise: totalGroupTurnoverPaise,
            conservationVerified: true,
            isSettled,
            calculatedAt: new Date().toISOString()
        };
    },

    /**
     * Aggregate multi-group metrics for a specific member / user
     * 
     * @param {string} userId - ID of current user (e.g. 'You' or user personId)
     * @param {Array<Object>} groupProjectionResults - Array of results from calculateGroupBalances
     * @returns {Object} { youOwePaise, youAreOwedPaise, netBalancePaise, activeGroupsCount, settledGroupsCount }
     */
    aggregateUserDashboard(userId, groupProjectionResults = []) {
        let youOwePaise = 0n;
        let youAreOwedPaise = 0n;
        let activeGroupsCount = 0;
        let settledGroupsCount = 0;

        const targetId = String(userId || 'You');

        groupProjectionResults.forEach(res => {
            const proj = res.projectionMap ? res.projectionMap[targetId] : null;
            if (res.isSettled) {
                settledGroupsCount += 1;
            } else {
                activeGroupsCount += 1;
            }

            if (proj) {
                const net = proj.netBalancePaise;
                if (net > 0n) {
                    youAreOwedPaise += net;
                } else if (net < 0n) {
                    youOwePaise += (-net); // store as positive magnitude of debt
                }
            }
        });

        const netBalancePaise = youAreOwedPaise - youOwePaise;

        return {
            userId: targetId,
            youOwePaise,
            youAreOwedPaise,
            netBalancePaise,
            activeGroupsCount,
            settledGroupsCount
        };
    },

    /**
     * Compute bilateral directional debt matrix for all pairs within a group.
     * Maps who directly owes whom in the expense ledger prior to simplification.
     */
    computePairwiseLedger(expenses = [], settlements = []) {
        // pairwise[from][to] = amountPaise
        const pairwise = {};

        const addDebt = (from, to, amountPaise) => {
            if (from === to || amountPaise <= 0n) return;
            if (!pairwise[from]) pairwise[from] = {};
            pairwise[from][to] = (pairwise[from][to] || 0n) + amountPaise;
        };

        // For each active expense:
        // Each share member owes the payer(s) proportionally
        expenses.forEach(exp => {
            if (exp.status === EXPENSE_STATUS.VOIDED || exp.status === EXPENSE_STATUS.REVERSED) return;
            const totalPaise = BigInt(exp.totalAmountPaise || 0);
            if (totalPaise <= 0n) return;

            const payments = Array.isArray(exp.payments) ? exp.payments : [];
            const shares = Array.isArray(exp.shares) ? exp.shares : [];

            shares.forEach(share => {
                const debtor = String(share.memberId);
                const shareAmount = BigInt(share.amountPaise || 0);
                if (shareAmount <= 0n) return;

                // Allocate debt to each payer in proportion to what they paid
                payments.forEach(pay => {
                    const creditor = String(pay.memberId);
                    const paidAmount = BigInt(pay.amountPaise || 0);
                    if (paidAmount <= 0n || debtor === creditor) return;

                    // debtor owes creditor: (shareAmount * paidAmount) / totalPaise
                    const debtPortion = (shareAmount * paidAmount) / totalPaise;
                    if (debtPortion > 0n) {
                        addDebt(debtor, creditor, debtPortion);
                    }
                });
            });
        });

        // Offsetting settlements
        settlements.forEach(s => {
            if (s.status !== SETTLEMENT_STATUS.COMPLETED && s.status !== 'COMPLETED') return;
            const from = String(s.fromMemberId);
            const to = String(s.toMemberId);
            const amt = BigInt(s.amountPaise || 0);

            // Settlement from A to B reduces A's debt to B
            if (pairwise[from] && pairwise[from][to]) {
                if (pairwise[from][to] >= amt) {
                    pairwise[from][to] -= amt;
                } else {
                    const remainder = amt - pairwise[from][to];
                    pairwise[from][to] = 0n;
                    addDebt(to, from, remainder);
                }
            } else {
                addDebt(to, from, amt);
            }
        });

        return pairwise;
    }
};
