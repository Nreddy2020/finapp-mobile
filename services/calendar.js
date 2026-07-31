// Static imports removed to support dynamic loading with graceful fallback
import { Alert, Platform } from 'react-native';

/**
 * Calendar Integration Service
 * Adds document expiry dates to device calendar
 */

/**
 * Request calendar permissions
 */
const requestCalendarPermissions = async () => {
    try {
        const Calendar = await import('expo-calendar').catch(() => null);

        if (!Calendar) {
            Alert.alert(
                'Package Required',
                'Please install expo-calendar:\n\nnpm install expo-calendar',
                [{ text: 'OK' }]
            );
            return false;
        }

        const { status } = await Calendar.requestCalendarPermissionsAsync();

        if (status !== 'granted') {
            Alert.alert(
                'Permission Denied',
                'Calendar access is required to add expiry reminders',
                [{ text: 'OK' }]
            );
            return false;
        }

        return true;
    } catch (error) {
        console.error('Calendar permission error:', error);
        return false;
    }
};

/**
 * Get or create default calendar
 */
const getDefaultCalendar = async (Calendar) => {
    try {
        // Get all calendars
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);

        // Find primary calendar
        const defaultCalendar = calendars.find(
            cal => cal.isPrimary || cal.allowsModifications
        );

        if (defaultCalendar) {
            return defaultCalendar.id;
        }

        // Create new calendar if none found
        if (Platform.OS === 'ios') {
            const defaultCalendarSource = calendars.find(
                cal => cal.source.name === 'Default'
            )?.source;

            if (defaultCalendarSource) {
                const newCalendarId = await Calendar.createCalendarAsync({
                    title: 'Fintech Documents',
                    color: '#06B6D4',
                    entityType: Calendar.EntityTypes.EVENT,
                    sourceId: defaultCalendarSource.id,
                    source: defaultCalendarSource,
                    name: 'Fintech Documents',
                    ownerAccount: 'personal',
                    accessLevel: Calendar.CalendarAccessLevel.OWNER,
                });
                return newCalendarId;
            }
        } else {
            // Android
            const newCalendarId = await Calendar.createCalendarAsync({
                title: 'Fintech Documents',
                color: '#06B6D4',
                entityType: Calendar.EntityTypes.EVENT,
                name: 'Fintech Documents',
                ownerAccount: 'personal',
                accessLevel: Calendar.CalendarAccessLevel.OWNER,
            });
            return newCalendarId;
        }

        return null;
    } catch (error) {
        console.error('Get calendar error:', error);
        return null;
    }
};

/**
 * Add document expiry to calendar
 */
export const addExpiryToCalendar = async (document) => {
    try {
        const hasPermission = await requestCalendarPermissions();
        if (!hasPermission) return false;

        const Calendar = await import('expo-calendar').catch(() => null);
        if (!Calendar) return false;

        const calendarId = await getDefaultCalendar(Calendar);
        if (!calendarId) {
            Alert.alert('Error', 'Could not find or create calendar');
            return false;
        }

        // Parse expiry date
        const expiryDate = new Date(document.expiry_date);

        // Create all-day event
        const eventId = await Calendar.createEventAsync(calendarId, {
            title: `${document.item} Expires`,
            startDate: expiryDate,
            endDate: expiryDate,
            allDay: true,
            notes: `Document: ${document.item}\nCategory: ${document.category || 'N/A'}`,
            alarms: [
                { relativeOffset: -30 * 24 * 60 }, // 30 days before
                { relativeOffset: -7 * 24 * 60 },  // 7 days before
                { relativeOffset: -1 * 24 * 60 },  // 1 day before
            ],
        });

        Alert.alert(
            'Added to Calendar',
            `"${document.item}" expiry date has been added to your calendar with reminders`
        );

        return eventId;
    } catch (error) {
        console.error('Add to calendar error:', error);
        Alert.alert('Error', 'Failed to add to calendar: ' + error.message);
        return false;
    }
};

/**
 * Add biometric authentication check
 */
export const authenticateWithBiometrics = async () => {
    try {
        const LocalAuthentication = await import('expo-local-authentication').catch(() => null);

        if (!LocalAuthentication) {
            Alert.alert(
                'Package Required',
                'Please install expo-local-authentication:\n\nnpm install expo-local-authentication',
                [{ text: 'OK' }]
            );
            return false;
        }

        // Check if biometrics are available
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
            Alert.alert('Not Supported', 'Biometric authentication is not available on this device');
            return false;
        }

        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
            Alert.alert('Not Set Up', 'Please set up biometric authentication in device settings');
            return false;
        }

        // Authenticate
        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to view documents',
            fallbackLabel: 'Use passcode',
            cancelLabel: 'Cancel',
        });

        return result.success;
    } catch (error) {
        console.error('Biometric auth error:', error);
        Alert.alert('Error', 'Authentication failed');
        return false;
    }
};
