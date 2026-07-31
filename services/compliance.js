import { Alert, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { loadData, deleteData, clearAllData, STORAGE_KEYS, getAllKeys } from './storage';
import { AuthService } from './auth';
import { resetKeys } from './crypto';

export const ComplianceService = {

    /**
     * Export all user data as a JSON file (Right to Access)
     * Decrypts all stored data and bundles it.
     */
    exportUserData: async () => {
        try {
            const allData = {};
            const keys = await getAllKeys();

            // Gather all data
            for (const key of keys) {
                // Skip sensitive keys if we want to sanitize strict auth tokens?
                // Actually, GDPR right to access usually implies *everything* stored about them.
                // But we shouldn't export encryption keys or purely internal system config if not relevant.
                if (key === 'auth_tokens') continue;

                const data = await loadData(key);
                if (data) {
                    allData[key] = data;
                }
            }

            // Create JSON File
            const jsonString = JSON.stringify(allData, null, 2);
            const fileName = `fintech_export_${Date.now()}.json`;

            if (Platform.OS === 'web') {
                // Web download fallback
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                return { success: true, message: 'Download started' };
            } else {
                // Native Sharing
                const fileUri = FileSystem.documentDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(fileUri);
                    return { success: true };
                } else {
                    return { success: false, error: 'Sharing not available' };
                }
            }

        } catch (error) {
            console.error('Export Failed:', error);
            return { success: false, error: error.message };
        }
    },

    /**
     * Permanently delete user account and all data (Right to be Forgotten)
     */
    deleteUserAccount: async () => {
        try {
            // 1. Log the deletion event (Final Audit)
            // Ideally we log this to a server before wiping local trace.
            // For offline-first, we log locally then wipe.
            console.log('AUDIT: Account Deletion Requested');

            // 2. Wipe Local Data
            const clearResult = await clearAllData();
            if (!clearResult.success) throw new Error('Failed to unmount file system data');

            // 3. Clear Auth
            await AuthService.logout();

            // 4. Wipe SecureStore (Keys)
            await resetKeys();

            return { success: true };

        } catch (error) {
            console.error('Account Deletion Failed:', error);
            return { success: false, error: error.message };
        }
    }
};
