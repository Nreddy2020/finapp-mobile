import { StorageService, STORAGE_KEYS } from './storage';

export const GroupService = {
    // Get all groups
    getGroups: async () => {
        const data = await StorageService.load(STORAGE_KEYS.GROUP_EXPENSES);
        return data || [];
    },

    // Create a new group
    createGroup: async (group) => {
        const groups = await GroupService.getGroups();
        const newGroup = {
            id: Date.now().toString(),
            name: group.name,
            members: group.members || [], // Array of strings (names)
            expenses: [],
            currency: '₹',
            createdDate: new Date().toISOString().split('T')[0],
        };

        const updated = [newGroup, ...groups];
        await StorageService.save(STORAGE_KEYS.GROUP_EXPENSES, updated);
        return updated;
    },

    // Add expense to group
    addExpense: async (groupId, expense) => {
        const groups = await GroupService.getGroups();
        const updated = groups.map(g => {
            if (g.id === groupId) {
                const newExpense = {
                    id: Date.now().toString(),
                    description: expense.description,
                    amount: parseFloat(expense.amount) || 0,
                    paidBy: expense.paidBy,
                    date: new Date().toISOString(),
                    splitType: 'EQUAL', // For now, assume equal split involves all members
                };
                return { ...g, expenses: [newExpense, ...g.expenses] };
            }
            return g;
        });
        await StorageService.save(STORAGE_KEYS.GROUP_EXPENSES, updated);
        return updated;
    },

    // Delete group
    deleteGroup: async (id) => {
        const groups = await GroupService.getGroups();
        const updated = groups.filter(g => g.id !== id);
        await StorageService.save(STORAGE_KEYS.GROUP_EXPENSES, updated);
        return updated;
    },

    // Calculate balances (Simplified Splitwise logic)
    calculateBalances: (group) => {
        // 1. Calculate net balance for each member
        const balances = {};
        group.members.forEach(m => balances[m] = 0);

        group.expenses.forEach(exp => {
            const splitAmount = exp.amount / group.members.length;
            balances[exp.paidBy] += exp.amount; // They paid this much

            // Everyone (including payer) "owes" the split amount
            group.members.forEach(m => {
                balances[m] -= splitAmount;
            });
        });

        // Positive balance = Owed to them
        // Negative balance = They owe others
        return balances;
    }
};
