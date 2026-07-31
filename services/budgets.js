import { loadData, saveData, STORAGE_KEYS } from './storage';

export const BudgetService = {
    // Get all budgets
    getBudgets: async () => {
        return await loadData(STORAGE_KEYS.BUDGETS, []);
    },

    // Create a new budget
    createBudget: async (budgetData) => {
        const current = await loadData(STORAGE_KEYS.BUDGETS, []);
        const newBudget = {
            id: Date.now().toString(),
            spent: 0,
            ...budgetData,
            createdAt: new Date().toISOString()
        };
        const updated = [...current, newBudget];
        await saveData(STORAGE_KEYS.BUDGETS, updated);
        return updated;
    },

    // Update a budget
    updateBudget: async (updatedBudget) => {
        const current = await loadData(STORAGE_KEYS.BUDGETS, []);
        const updated = current.map(b => b.id === updatedBudget.id ? updatedBudget : b);
        await saveData(STORAGE_KEYS.BUDGETS, updated);
        return updated;
    },

    // Delete a budget
    deleteBudget: async (id) => {
        const current = await loadData(STORAGE_KEYS.BUDGETS, []);
        const updated = current.filter(b => b.id !== id);
        await saveData(STORAGE_KEYS.BUDGETS, updated);
        return updated;
    },

    // Update spending (Temporary for simulation)
    updateSpending: async (id, amount) => {
        const current = await loadData(STORAGE_KEYS.BUDGETS, []);
        const updated = current.map(b => {
            if (b.id === id) return { ...b, spent: amount };
            return b;
        });
        await saveData(STORAGE_KEYS.BUDGETS, updated);
        return updated;
    }
};
