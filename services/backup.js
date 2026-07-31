// Static imports removed to support dynamic loading with graceful fallback
import { Alert } from 'react-native';
import { loadData, saveData, STORAGE_KEYS } from './storage';

/**
 * Backup Service
 * Exports and imports app data for backup/restore functionality
 */

/**
 * Export all cashbooks data to JSON file
 */
export const exportCashbooksBackup = async () => {
    try {
        // Check if expo-sharing is available
        const Sharing = await import('expo-sharing').catch(() => null);
        const FileSystem = await import('expo-file-system').catch(() => null);

        if (!Sharing || !FileSystem) {
            Alert.alert(
                'Package Required',
                'Please install expo-file-system and expo-sharing:\n\nnpm install expo-file-system expo-sharing',
                [{ text: 'OK' }]
            );
            return null;
        }

        // Load all cashbooks data
        const cashbooks = await loadData(STORAGE_KEYS.CASHBOOKS, []);

        if (cashbooks.length === 0) {
            Alert.alert('No Data', 'No cashbooks to backup');
            return null;
        }

        // Create backup object with metadata
        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            type: 'cashbooks',
            data: cashbooks,
            count: cashbooks.length
        };

        // Convert to JSON
        const jsonData = JSON.stringify(backup, null, 2);

        // Create file in cache directory
        const fileName = `cashbooks_backup_${new Date().toISOString().split('T')[0]}.json`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, jsonData);

        // Share the file
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Save Cashbooks Backup',
                UTI: 'public.json'
            });
            return fileUri;
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
            return null;
        }
    } catch (error) {
        console.error('Backup export error:', error);
        Alert.alert('Error', 'Failed to create backup: ' + error.message);
        return null;
    }
};

/**
 * Import cashbooks data from JSON backup file
 */
export const importCashbooksBackup = async () => {
    try {
        // Check if expo-document-picker is available
        const DocumentPicker = await import('expo-document-picker').catch(() => null);

        if (!DocumentPicker) {
            Alert.alert(
                'Package Required',
                'Please install expo-document-picker:\n\nnpm install expo-document-picker',
                [{ text: 'OK' }]
            );
            return false;
        }

        // Pick a document
        const result = await DocumentPicker.getDocumentAsync({
            type: 'application/json',
            copyToCacheDirectory: true
        });

        if (result.type === 'cancel') {
            return false;
        }

        // Read file content
        const FileSystem = await import('expo-file-system').catch(() => null);
        if (!FileSystem) {
            Alert.alert('Error', 'File system not available');
            return false;
        }

        const fileContent = await FileSystem.readAsStringAsync(result.uri);
        const backup = JSON.parse(fileContent);

        // Validate backup structure
        if (!backup.version || !backup.data || backup.type !== 'cashbooks') {
            Alert.alert('Invalid Backup', 'The selected file is not a valid cashbooks backup');
            return false;
        }

        // Confirm restore
        return new Promise((resolve) => {
            Alert.alert(
                'Restore Backup',
                `This will restore ${backup.count} cashbooks from ${new Date(backup.timestamp).toLocaleDateString()}.\n\nCurrent data will be replaced. Continue?`,
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                    {
                        text: 'Restore',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await saveData(STORAGE_KEYS.CASHBOOKS, backup.data);
                                Alert.alert('Success', `Restored ${backup.count} cashbooks`);
                                resolve(true);
                            } catch (error) {
                                Alert.alert('Error', 'Failed to restore backup: ' + error.message);
                                resolve(false);
                            }
                        }
                    }
                ]
            );
        });
    } catch (error) {
        console.error('Backup import error:', error);
        Alert.alert('Error', 'Failed to import backup: ' + error.message);
        return false;
    }
};

/**
 * Export validity documents data to JSON file
 */
export const exportValidityBackup = async () => {
    try {
        const Sharing = await import('expo-sharing').catch(() => null);
        const FileSystem = await import('expo-file-system').catch(() => null);

        if (!Sharing || !FileSystem) {
            Alert.alert(
                'Package Required',
                'Please install expo-file-system and expo-sharing',
                [{ text: 'OK' }]
            );
            return null;
        }

        const documents = await loadData(STORAGE_KEYS.VALIDITY, []);

        if (documents.length === 0) {
            Alert.alert('No Data', 'No documents to backup');
            return null;
        }

        const backup = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            type: 'validity',
            data: documents,
            count: documents.length
        };

        const jsonData = JSON.stringify(backup, null, 2);
        const fileName = `validity_backup_${new Date().toISOString().split('T')[0]}.json`;
        const fileUri = `${FileSystem.cacheDirectory}${fileName}`;

        await FileSystem.writeAsStringAsync(fileUri, jsonData);

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
            await Sharing.shareAsync(fileUri, {
                mimeType: 'application/json',
                dialogTitle: 'Save Validity Backup',
                UTI: 'public.json'
            });
            return fileUri;
        } else {
            Alert.alert('Error', 'Sharing is not available on this device');
            return null;
        }
    } catch (error) {
        console.error('Backup export error:', error);
        Alert.alert('Error', 'Failed to create backup: ' + error.message);
        return null;
    }
};
