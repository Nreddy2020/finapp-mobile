import { StorageService, STORAGE_KEYS } from './storage';

export const BusinessService = {
    // Get Business Data
    getData: async () => {
        const data = await StorageService.load(STORAGE_KEYS.BUSINESS_DATA);
        return data || {
            profile: { name: 'My Business', type: 'Retail' },
            sales: [] // { date, amount, expenses, profit }
        };
    },

    // Add Daily Entry
    addEntry: async (entry) => {
        const data = await BusinessService.getData();
        const newEntry = {
            id: Date.now().toString(),
            date: new Date().toISOString(),
            ...entry,
            profit: parseFloat(entry.amount) - parseFloat(entry.expenses)
        };

        const updated = {
            ...data,
            sales: [newEntry, ...data.sales]
        };

        await StorageService.save(STORAGE_KEYS.BUSINESS_DATA, updated);
        return updated;
    },

    // Update Profile
    updateProfile: async (profile) => {
        const data = await BusinessService.getData();
        const updated = { ...data, profile };
        await StorageService.save(STORAGE_KEYS.BUSINESS_DATA, updated);
        return updated;
    }
};
