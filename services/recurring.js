import { StorageService, STORAGE_KEYS } from './storage';

export const RecurringService = {
    getSubscriptions: async () => {
        return await StorageService.load(STORAGE_KEYS.RECURRING_PAYMENTS) || [];
    },

    addSubscription: async (sub) => {
        const subs = await RecurringService.getSubscriptions();
        const newSub = {
            id: Date.now().toString(),
            name: sub.name,
            amount: parseFloat(sub.amount),
            frequency: sub.frequency || 'Monthly',
            nextDate: sub.nextDate,
            active: true
        };
        const updated = [newSub, ...subs];
        await StorageService.save(STORAGE_KEYS.RECURRING_PAYMENTS, updated);
        return updated;
    },

    deleteSubscription: async (id) => {
        const subs = await RecurringService.getSubscriptions();
        const updated = subs.filter(s => s.id !== id);
        await StorageService.save(STORAGE_KEYS.RECURRING_PAYMENTS, updated);
        return updated;
    }
};
