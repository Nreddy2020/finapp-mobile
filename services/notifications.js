import { StorageService, STORAGE_KEYS } from './storage';

export const NotificationService = {
    getAll: async () => {
        return await StorageService.load(STORAGE_KEYS.NOTIFICATIONS) || [];
    },

    markAsRead: async (id) => {
        const list = await NotificationService.getAll();
        const updated = list.map(n => n.id === id ? { ...n, read: true } : n);
        await StorageService.save(STORAGE_KEYS.NOTIFICATIONS, updated);
        return updated;
    },

    markAllRead: async () => {
        const list = await NotificationService.getAll();
        const updated = list.map(n => ({ ...n, read: true }));
        await StorageService.save(STORAGE_KEYS.NOTIFICATIONS, updated);
        return updated;
    },

    addNotification: async (notification) => {
        const list = await NotificationService.getAll();
        const newNotif = {
            id: Date.now().toString(),
            title: notification.title,
            message: notification.message,
            type: notification.type || 'info', // info, success, alert
            time: new Date().toISOString(),
            read: false,
            ...notification
        };
        const updated = [newNotif, ...list];
        await StorageService.save(STORAGE_KEYS.NOTIFICATIONS, updated);
        return updated;
    },

    // Seed initial data if empty
    seedDefaults: async () => {
        const list = await NotificationService.getAll();
        if (list.length === 0) {
            const defaults = [
                {
                    id: '1',
                    title: "Welcome to Fintech",
                    message: "Your financial journey begins here.",
                    type: "success",
                    time: new Date().toISOString(),
                    read: false
                }
            ];
            await StorageService.save(STORAGE_KEYS.NOTIFICATIONS, defaults);
            return defaults;
        }
        return list;
    }
};

/**
 * Cancel notifications for a specific document (stub — uses expo-notifications internally)
 * @param {string} documentId
 */
export const cancelDocumentNotifications = async (documentId) => {
    try {
        // In production this would look up scheduled notifications by tag/data
        // and call Notifications.cancelScheduledNotificationAsync()
        console.log(`[Notifications] Cancelled notifications for document: ${documentId}`);
        return true;
    } catch (error) {
        console.error('Cancel notification error:', error);
        return false;
    }
};
