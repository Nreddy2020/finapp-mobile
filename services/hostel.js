import { StorageService, STORAGE_KEYS } from './storage';

export const HostelService = {
    getData: async () => {
        return await StorageService.load(STORAGE_KEYS.HOSTEL_DATA) || {
            nextPayment: { amount: 13000, dueDate: '2024-08-05', daysLeft: 5 },
            messUtilization: 75,
            messRefund: 666,
            pendingSettlements: 1200,
            roomNumber: 'A-204',
            block: 'A'
        };
    },

    updateData: async (newData) => {
        const current = await HostelService.getData();
        const updated = { ...current, ...newData };
        await StorageService.save(STORAGE_KEYS.HOSTEL_DATA, updated);
        return updated;
    }
};
