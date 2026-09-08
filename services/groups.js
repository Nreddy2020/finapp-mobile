/**
 * services/groups.js
 * 
 * Backward-Compatible Facade for FinLife Shared Costs & Groups Engine V1.
 * Seamlessly delegates all group operations to GroupRepository and GroupViewModel.
 */

import { GroupRepository } from './shared-costs/groupRepository.js';
import { GroupViewModel } from './shared-costs/groupViewModel.js';
import { GroupBalanceEngine } from './shared-costs/groupBalanceEngine.js';
import { paiseToRupees, toPaise } from './shared-costs/groupContracts.js';

export const GroupService = {
    // Get all groups with balance summaries
    getGroups: async () => {
        try {
            const groups = await GroupRepository.getAllGroups();
            if (groups.length === 0) {
                // Auto-seed initial demo dataset if completely empty
                const seeded = await GroupViewModel.seedMockupDemoData();
                return seeded.groups;
            }
            return groups;
        } catch (err) {
            console.error('[GroupService] Error getting groups:', err);
            return [];
        }
    },

    // Create a new group
    createGroup: async (group) => {
        const memberNames = Array.isArray(group.members) ? group.members : [];
        await GroupViewModel.createGroup({
            name: group.name,
            type: group.type || 'TRIP',
            memberNames
        });
        return await GroupService.getGroups();
    },

    // Add expense to group
    addExpense: async (groupId, expense) => {
        await GroupViewModel.addExpense(groupId, {
            title: expense.description || expense.title || 'Shared Expense',
            amount: expense.amount,
            payerMemberId: expense.paidBy || 'You',
            category: expense.category || 'General'
        });
        return await GroupService.getGroups();
    },

    // Delete / Archive group
    deleteGroup: async (id) => {
        await GroupRepository.updateGroup(id, { status: 'ARCHIVED' });
        return await GroupService.getGroups();
    },

    // Calculate balances (returns map: memberName -> net balance in Rupees)
    calculateBalances: (group) => {
        if (!group) return {};
        try {
            const balanceSummary = group.balanceSummary || 
                GroupBalanceEngine.calculateGroupBalances(group, group.expenses || [], group.settlements || []);
            
            const result = {};
            if (balanceSummary && balanceSummary.projections) {
                balanceSummary.projections.forEach(p => {
                    result[p.displayNameSnapshot] = paiseToRupees(p.netBalancePaise);
                    result[p.memberId] = paiseToRupees(p.netBalancePaise);
                });
            }
            return result;
        } catch (err) {
            console.error('[GroupService] Error calculating balances:', err);
            return {};
        }
    }
};

export default GroupService;
