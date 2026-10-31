import {collectUserData} from './dataExportCollection.js';
import { FamilyLifeEventStore, LIFE_EVENTS_STORAGE_KEY } from './family/familyLifeEventStore.js';
import { Alert, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
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
            const allData = await collectUserData();

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
                const fileUri = FileSystem.cacheDirectory + fileName;
                await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });

                if (await Sharing.isAvailableAsync()) {
                    try { await Sharing.shareAsync(fileUri); } finally { await FileSystem.deleteAsync(fileUri, {idempotent:true}); }
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
