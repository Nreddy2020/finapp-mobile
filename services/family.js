import { StorageService, STORAGE_KEYS } from './storage';
import { mockFamilyMembers, mockFamilyExpenses } from './mockData';

export const FamilyService = {
    getData: async () => {
        let members = await StorageService.load(STORAGE_KEYS.FAMILY_MEMBERS);
        let expenses = await StorageService.load(STORAGE_KEYS.FAMILY_EXPENSES);

        if (!members || members.length === 0) {
            members = mockFamilyMembers;
            await StorageService.save(STORAGE_KEYS.FAMILY_MEMBERS, members);
        }

        if (!expenses || expenses.length === 0) {
            expenses = mockFamilyExpenses;
            await StorageService.save(STORAGE_KEYS.FAMILY_EXPENSES, expenses);
        }

        return { members, expenses };
    },

    getMembers: async () => {
        return await StorageService.load(STORAGE_KEYS.FAMILY_MEMBERS) || [];
    },

    addMember: async (name, role) => {
        const members = await FamilyService.getMembers();
        const newMember = {
            id: Date.now().toString(),
            name,
            role,
            color: '#10B981', // Default
            income: 0
        };
        const updated = [newMember, ...members];
        await StorageService.save(STORAGE_KEYS.FAMILY_MEMBERS, updated);
        return updated;
    },

    addExpense: async (title, amount, paidBy, splitBetween) => {
        const expenses = await StorageService.load(STORAGE_KEYS.FAMILY_EXPENSES) || [];
        const newExpense = {
            id: Date.now().toString(),
            title,
            amount: parseFloat(amount),
            paidBy,
            splitBetween,
            date: new Date().toISOString()
        };
        const updated = [newExpense, ...expenses];
        await StorageService.save(STORAGE_KEYS.FAMILY_EXPENSES, updated);
        return updated;
    },

    calculateBalances: (members, expenses) => {
        const balances = {};
        members.forEach(m => balances[m.id] = 0);

        expenses.forEach(exp => {
            const paidBy = exp.paidBy;
            const amount = parseFloat(exp.amount);
            const splitCount = exp.splitBetween.length;
            const splitAmount = amount / splitCount;

            // Payer gets back the full amount (temporarily)
            if (balances[paidBy] !== undefined) {
                balances[paidBy] += amount;
            }

            // Everyone in split pays their share
            exp.splitBetween.forEach(memberId => {
                if (balances[memberId] !== undefined) {
                    balances[memberId] -= splitAmount;
                }
            });
        });

        return balances;
    },

    settleDebts: async () => {
        await StorageService.save(STORAGE_KEYS.FAMILY_EXPENSES, []);
        return [];
    }
};
