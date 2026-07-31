import { loadData, saveData, STORAGE_KEYS } from './storage';

export const IncomeService = {
    // Get all income sources
    getIncomeSources: async () => {
        return await loadData(STORAGE_KEYS.INCOME_SOURCES, []);
    },

    // Add a new income source
    addIncome: async (incomeData) => {
        const current = await loadData(STORAGE_KEYS.INCOME_SOURCES, []);
        const newIncome = {
            id: Date.now().toString(),
            ...incomeData,
            createdAt: new Date().toISOString()
        };
        const updated = [newIncome, ...current];
        await saveData(STORAGE_KEYS.INCOME_SOURCES, updated);
        return updated;
    },

    // Update an income source
    updateIncome: async (updatedIncome) => {
        const current = await loadData(STORAGE_KEYS.INCOME_SOURCES, []);
        const updated = current.map(item => item.id === updatedIncome.id ? updatedIncome : item);
        await saveData(STORAGE_KEYS.INCOME_SOURCES, updated);
        return updated;
    },

    // Delete an income source
    deleteIncome: async (id) => {
        const current = await loadData(STORAGE_KEYS.INCOME_SOURCES, []);
        const updated = current.filter(item => item.id !== id);
        await saveData(STORAGE_KEYS.INCOME_SOURCES, updated);
        return updated;
    },

    // Calculate total monthly income (simple sum for now)
    calculateTotalIncome: (incomeList) => {
        return incomeList.reduce((sum, item) => sum + item.amount, 0);
    }
};
