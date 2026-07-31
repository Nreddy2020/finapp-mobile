import { StorageService, STORAGE_KEYS } from './storage';

export const FeeService = {
    getFees: async () => {
        return await StorageService.load(STORAGE_KEYS.FEES) || [];
    },

    addFee: async (fee) => {
        const fees = await FeeService.getFees();
        const newFee = {
            id: Date.now().toString(),
            title: fee.title,
            amount: parseFloat(fee.amount),
            dueDate: fee.dueDate, // YYYY-MM-DD
            status: 'Upcoming', // Upcoming, Paid, Overdue
            createdAt: new Date().toISOString()
        };
        const updated = [...fees, newFee];
        await StorageService.save(STORAGE_KEYS.FEES, updated);
        return updated;
    },

    updateStatus: async (id, status) => {
        const fees = await FeeService.getFees();
        const updated = fees.map(f =>
            f.id === id ? { ...f, status } : f
        );
        await StorageService.save(STORAGE_KEYS.FEES, updated);
        return updated;
    },

    deleteFee: async (id) => {
        const fees = await FeeService.getFees();
        const updated = fees.filter(f => f.id !== id);
        await StorageService.save(STORAGE_KEYS.FEES, updated);
        return updated;
    }
};
