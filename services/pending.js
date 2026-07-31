import { StorageService, STORAGE_KEYS } from './storage';

export const PendingService = {
    getItems: async () => {
        return await StorageService.load(STORAGE_KEYS.PENDING_ITEMS) || [];
    },

    addItem: async (item) => {
        const items = await PendingService.getItems();
        const newItem = {
            id: Date.now().toString(),
            type: item.type, // 'collect' or 'pay'
            name: item.name,
            amount: parseFloat(item.amount),
            dueDate: item.dueDate || 'No Due Date',
            priority: item.priority || 'medium', // low, medium, urgent
            status: 'pending', // pending, rounded
            createdAt: new Date().toISOString()
        };
        const updated = [...items, newItem];
        await StorageService.save(STORAGE_KEYS.PENDING_ITEMS, updated);
        return updated;
    },

    toggleType: async (id) => {
        // Switch between collect/pay? Or just mark done. 
        // Let's implement mark as done/settled which removes it or archives it.
        // For now, delete upon settlement for simplicity
        return await PendingService.deleteItem(id);
    },

    deleteItem: async (id) => {
        const items = await PendingService.getItems();
        const updated = items.filter(i => i.id !== id);
        await StorageService.save(STORAGE_KEYS.PENDING_ITEMS, updated);
        return updated;
    }
};
