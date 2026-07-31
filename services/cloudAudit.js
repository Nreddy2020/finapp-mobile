import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

const SYNC_QUEUE_FILE = FileSystem.documentDirectory + 'audit_sync_queue.json';
const CLOUD_BACKUP_DIR = FileSystem.documentDirectory + 'cloud_backup/';

/**
 * Cloud Audit Backup Service
 * Production: Replace with AWS S3, Google Cloud Storage, or Azure Blob
 * MVP: Simulated cloud storage with local backup directory
 */
export const CloudAuditService = {

    /**
     * Initialize cloud backup directory
     */
    initialize: async () => {
        if (Platform.OS === 'web') return;

        try {
            const dirInfo = await FileSystem.getInfoAsync(CLOUD_BACKUP_DIR);
            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(CLOUD_BACKUP_DIR, { intermediates: true });
            }
        } catch (error) {
            console.error('Cloud backup init failed:', error);
        }
    },

    /**
     * Upload audit entry to cloud (simulated)
     * Production: Replace with actual S3/GCS upload
     */
    uploadEntry: async (entry) => {
        if (Platform.OS === 'web') {
            console.log('[CLOUD_AUDIT] Web - would upload:', entry);
            return { success: true, cloudId: `web_${Date.now()}` };
        }

        try {
            // Simulate cloud upload by writing to backup directory
            const filename = `audit_${entry.timestamp.replace(/:/g, '-')}.json`;
            const filepath = CLOUD_BACKUP_DIR + filename;

            await FileSystem.writeAsStringAsync(filepath, JSON.stringify(entry));

            return {
                success: true,
                cloudId: filename,
                uploadedAt: new Date().toISOString()
            };

        } catch (error) {
            console.error('Cloud upload failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Batch upload multiple entries
     */
    batchUpload: async (entries) => {
        const results = [];

        for (const entry of entries) {
            const result = await CloudAuditService.uploadEntry(entry);
            results.push({
                entry: entry.timestamp,
                ...result
            });
        }

        const successful = results.filter(r => r.success).length;
        const failed = results.filter(r => !r.success).length;

        return {
            total: entries.length,
            successful,
            failed,
            results
        };
    },

    /**
     * Get sync queue
     */
    getSyncQueue: async () => {
        if (Platform.OS === 'web') return [];

        try {
            const fileInfo = await FileSystem.getInfoAsync(SYNC_QUEUE_FILE);
            if (!fileInfo.exists) return [];

            const content = await FileSystem.readAsStringAsync(SYNC_QUEUE_FILE);
            return JSON.parse(content);
        } catch (error) {
            return [];
        }
    },

    /**
     * Add to sync queue
     */
    queueForSync: async (entry) => {
        if (Platform.OS === 'web') return;

        try {
            const queue = await CloudAuditService.getSyncQueue();
            queue.push({
                entry,
                queuedAt: Date.now(),
                attempts: 0
            });

            await FileSystem.writeAsStringAsync(SYNC_QUEUE_FILE, JSON.stringify(queue));
        } catch (error) {
            console.error('Queue sync failed:', error);
        }
    },

    /**
     * Process sync queue (upload pending entries)
     */
    processSyncQueue: async () => {
        if (Platform.OS === 'web') return { processed: 0, failed: 0 };

        try {
            const queue = await CloudAuditService.getSyncQueue();
            if (queue.length === 0) return { processed: 0, failed: 0 };

            const results = await CloudAuditService.batchUpload(queue.map(q => q.entry));

            // Remove successful uploads from queue
            const failedQueue = queue.filter((_, index) => !results.results[index].success);

            // Increment attempt counter for failed items
            failedQueue.forEach(item => item.attempts++);

            // Remove items that have failed too many times (>5 attempts)
            const retryQueue = failedQueue.filter(item => item.attempts < 5);

            await FileSystem.writeAsStringAsync(SYNC_QUEUE_FILE, JSON.stringify(retryQueue));

            return {
                processed: results.successful,
                failed: results.failed,
                remaining: retryQueue.length
            };

        } catch (error) {
            console.error('Process sync queue failed:', error);
            return { processed: 0, failed: 0, error: error.message };
        }
    },

    /**
     * Get sync status
     */
    getSyncStatus: async () => {
        const queue = await CloudAuditService.getSyncQueue();

        return {
            pending: queue.length,
            oldestPending: queue[0]?.queuedAt,
            needsSync: queue.length > 0
        };
    }
};

// Initialize on module load
CloudAuditService.initialize();

// Auto-sync every 5 minutes
setInterval(() => {
    CloudAuditService.processSyncQueue();
}, 5 * 60 * 1000);
