import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { StorageService } from './storage';

// Configure notifications handler safely
try {
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: false,
        }),
    });
} catch (e) {
    // Non-fatal if running in environments without native notification emitter
}

export const NotificationService = {
    /**
     * Request permissions for notifications
     */
    requestPermissions: async () => {
        if (Platform.OS === 'web') return false;

        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        return finalStatus === 'granted';
    },

    /**
     * Schedule a recurring daily notification
     * @param {string} title - Notification title
     * @param {string} body - Notification body
     * @param {number} hour - Hour (0-23)
     * @param {number} minute - Minute (0-59)
     * @returns {Promise<string>} - Notification ID
     */
    scheduleDaily: async (title, body, hour, minute) => {
        if (Platform.OS === 'web') return null;

        return await Notifications.scheduleNotificationAsync({
            content: {
                title,
                body,
                sound: true,
            },
            trigger: {
                hour,
                minute,
                repeats: true,
            },
        });
    },

    /**
     * Schedule a one-off notification at a specific local date/time.
     * @returns {Promise<string|null>} notification id
     */
    scheduleAt: async (title, body, date, data = {}) => {
        if (Platform.OS === 'web') return null;
        if (!(date instanceof Date) || Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return null;
        return await Notifications.scheduleNotificationAsync({
            content: { title, body, sound: true, data },
            trigger: { type: 'date', date }
        });
    },

    /**
     * Cancel all notifications
     */
    cancelAll: async () => {
        if (Platform.OS === 'web') return;
        await Notifications.cancelAllScheduledNotificationsAsync();
    },

    /**
     * Cancel specific notification
     */
    cancel: async (id) => {
        if (Platform.OS === 'web') return;
        await Notifications.cancelScheduledNotificationAsync(id);
    }
};

/**
 * ReminderScheduler — owner of OS reminders for expiry / validity items.
 * Reminder ids are persisted per item so edits recreate reminders without duplicates
 * and deletions cancel only their own notifications (never cancelAll).
 */
export const REMINDER_REGISTRY_KEY = 'finlife_reminder_registry_v1';
const REMINDER_HOUR = 9;
export const ReminderScheduler = {
    /** Reminder instants for an item: lead days before, then 7, 1 and 0 days before, at 09:00 local. */
    plan: (item, now = new Date()) => {
        if (!item?.expiryDate || item.archived) return [];
        const [y, m, d] = item.expiryDate.split('-').map(Number);
        const offsets = [...new Set([Number(item.renewalLeadDays) || 30, 7, 1, 0])].sort((a, b) => b - a);
        return offsets.map(days => {
            const when = new Date(y, m - 1, d - days, REMINDER_HOUR, 0, 0, 0);
            const title = days === 0 ? `${item.title} expires today` : `${item.title} expires in ${days} day${days === 1 ? '' : 's'}`;
            const body = item.renewalCost ? `Renewal cost about ${item.renewalCost}. Open Validities to renew.` : item.kind === 'expiry' ? 'Use it before it goes to waste.' : 'Open Validities to renew or update it.';
            return { when, title, body, days };
        }).filter(r => r.when.getTime() > now.getTime());
    },
    syncItem: async (item) => {
        if (Platform.OS === 'web' || !item) return [];
        await ReminderScheduler.cancelItem(item.id);
        const granted = await NotificationService.requestPermissions().catch(() => false);
        if (!granted) return [];
        const ids = [];
        for (const r of ReminderScheduler.plan(item)) {
            const id = await NotificationService.scheduleAt(r.title, r.body, r.when, { itemId: item.id, kind: item.kind }).catch(() => null);
            if (id) ids.push(id);
        }
        const registry = (await StorageService.load(REMINDER_REGISTRY_KEY, {})) || {};
        registry[item.id] = ids;
        await StorageService.save(REMINDER_REGISTRY_KEY, registry);
        return ids;
    },
    /**
     * Re-schedules reminders for every live validity / expiry item. Safe to call on each
     * app start: it is idempotent per item and skips silently when permission is absent
     * or the platform has no notifications.
     */
    resyncAll: async () => {
        if (Platform.OS === 'web') return { synced: 0 };
        let items = [];
        try {
            const { ValidityService } = await import('./validity/validityService.js');
            items = await ValidityService.list();
        } catch { return { synced: 0 }; }
        const live = items.filter(i => !i.archived && i.expiryDate);
        const registry = (await StorageService.load(REMINDER_REGISTRY_KEY, {})) || {};
        for (const staleId of Object.keys(registry)) if (!live.some(i => i.id === staleId)) await ReminderScheduler.cancelItem(staleId).catch(() => {});
        let synced = 0;
        for (const item of live) { const ids = await ReminderScheduler.syncItem(item).catch(() => []); if (ids.length) synced++; }
        return { synced };
    },
    cancelItem: async (itemId) => {
        if (Platform.OS === 'web') return;
        const registry = (await StorageService.load(REMINDER_REGISTRY_KEY, {})) || {};
        for (const id of registry[itemId] || []) await NotificationService.cancel(id).catch(() => {});
        if (registry[itemId]) { delete registry[itemId]; await StorageService.save(REMINDER_REGISTRY_KEY, registry); }
    }
};

export default NotificationService;
