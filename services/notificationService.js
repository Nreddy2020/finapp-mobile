import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

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

export default NotificationService;
