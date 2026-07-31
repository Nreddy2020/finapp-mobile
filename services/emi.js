import { loadData, saveData, STORAGE_KEYS } from './storage';

export const EMIService = {
    getEMIs: async () => {
        return await loadData(STORAGE_KEYS.EMIS, []) || [];
    },

    addEMI: async (emi) => {
        const emis = await EMIService.getEMIs();
        const newEMI = {
            ...emi,
            id: emi.id || Date.now(),
            status: emi.status || 'pending',
            transactions: emi.transactions || []
        };
        const updated = [...emis, newEMI];
        await saveData(STORAGE_KEYS.EMIS, updated);
        return updated;
    },

    payEMI: async (id) => {
        const emis = await EMIService.getEMIs();
        const updated = emis.map(e =>
            e.id === id ? {
                ...e,
                status: 'paid',
                transactions: [
                    ...(e.transactions || []),
                    { date: new Date().toISOString(), amount: e.amount, type: 'payment' }
                ]
            } : e
        );
        await saveData(STORAGE_KEYS.EMIS, updated);
        return updated;
    },

    deleteEMI: async (id) => {
        const emis = await EMIService.getEMIs();
        const updated = emis.filter(e => e.id !== id);
        await saveData(STORAGE_KEYS.EMIS, updated);
        return updated;
    }
};
