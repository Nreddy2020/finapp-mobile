import * as FileSystem from 'expo-file-system';
// import * as Sharing from 'expo-sharing'; // Mocked to avoid install error
import { Alert } from 'react-native';

const getExportFile = () => (Platform.OS === 'web' ? null : (FileSystem.documentDirectory || '') + 'fintech_data_export.json');

const Sharing = {
    isAvailableAsync: () => Promise.resolve(false),
    shareAsync: () => Promise.resolve()
};

/**
 * Exports all known application data to a JSON file and prompts to share it.
 * In a real app, this would iterate over all AsyncStorage keys or Database tables.
 * For now, it mocks the data collection from our known files.
 */
export const exportUserData = async () => {
    try {
        // 1. Collect Data (Mock collection from "AsyncStorage" or Context)
        const exportData = {
            exportDate: new Date().toISOString(),
            appVersion: '1.0.0',
            user: {
                name: 'User',
                currency: 'INR'
            },
            // In reality, we'd pull this from storage
            gratitudeLogs: [], // Placeholder
            financialData: {}, // Placeholder
        };

        // 2. Write to file
        const jsonString = JSON.stringify(exportData, null, 2);
        const EXPORT_FILE_PATH = getExportFile();
        if (!EXPORT_FILE_PATH) throw new Error('Export not supported on web in this mode');

        await FileSystem.writeAsStringAsync(EXPORT_FILE_PATH, jsonString, {
            encoding: FileSystem.EncodingType.UTF8
        });

        // 3. Share the file
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
            await Sharing.shareAsync(EXPORT_FILE_PATH, {
                mimeType: 'application/json',
                dialogTitle: 'Export Fintech Data'
            });
        } else {
            Alert.alert('Export Saved', `Data saved to: ${EXPORT_FILE_PATH}\n(Sharing not available in this env)`);
        }
    } catch (error) {
        console.error('Data export failed:', error);
        Alert.alert('Export Failed', 'Could not export data. Please try again.');
    }
};
