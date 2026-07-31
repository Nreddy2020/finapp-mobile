import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { DeviceService } from './device';

const CRASH_LOG_FILE = FileSystem.documentDirectory + 'crash_reports.log';

export const CrashReportingService = {

    /**
     * Log an error with context
     * @param {Error} error - The error object
     * @param {object} context - Additional context (component, user action, etc.)
     */
    logError: async (error, context = {}) => {
        try {
            const timestamp = new Date().toISOString();
            const deviceId = await DeviceService.getDeviceId();

            const crashReport = {
                timestamp,
                deviceId,
                platform: Platform.OS,
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                },
                context
            };

            // Console log for dev
            console.error('CRASH REPORT:', crashReport);

            // Write to file (Native only)
            if (Platform.OS !== 'web') {
                const reportLine = JSON.stringify(crashReport) + '\n';

                const fileInfo = await FileSystem.getInfoAsync(CRASH_LOG_FILE);
                if (fileInfo.exists) {
                    const current = await FileSystem.readAsStringAsync(CRASH_LOG_FILE);
                    await FileSystem.writeAsStringAsync(CRASH_LOG_FILE, current + reportLine);
                } else {
                    await FileSystem.writeAsStringAsync(CRASH_LOG_FILE, reportLine);
                }
            }

            // In production, this would send to Sentry/Bugsnag/Firebase Crashlytics
            // await sendToRemoteService(crashReport);

        } catch (loggingError) {
            console.error('Failed to log crash:', loggingError);
        }
    },

    /**
     * Get all crash reports (for debugging/support)
     */
    getCrashReports: async () => {
        if (Platform.OS === 'web') return [];

        const fileInfo = await FileSystem.getInfoAsync(CRASH_LOG_FILE);
        if (!fileInfo.exists) return [];

        const content = await FileSystem.readAsStringAsync(CRASH_LOG_FILE);
        return content.split('\n').filter(Boolean).map(line => JSON.parse(line));
    }
};
