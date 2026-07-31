import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { RETENTION_CONFIG, calculateDeletionDate, shouldDelete } from '../config/retention.config';
import { AuditService } from './audit';
import { StorageService, STORAGE_KEYS } from './storage';

const DELETION_QUEUE_KEY = 'deletion_queue';
const LAST_CLEANUP_KEY = 'last_cleanup';

/**
 * Data Retention Service
 * Manages automated data deletion based on retention policies
 */
export const RetentionService = {

    /**
     * Schedule data for deletion
     */
    scheduleForDeletion: async (dataType, dataId, createdAt) => {
        try {
            const deletionDate = calculateDeletionDate(dataType, createdAt);

            if (!deletionDate) {
                return; // No deletion needed
            }

            const queue = await RetentionService.getDeletionQueue();

            queue.push({
                dataType,
                dataId,
                createdAt,
                deletionDate: deletionDate.toISOString(),
                scheduledAt: new Date().toISOString()
            });

            await RetentionService.saveDeletionQueue(queue);

            // Audit scheduling
            await AuditService.logEvent(
                'SYSTEM',
                'SCHEDULE_DELETION',
                dataType,
                { dataId, deletionDate: deletionDate.toISOString() }
            );
        } catch (error) {
            console.error('Failed to schedule deletion:', error);
        }
    },

    /**
     * Get deletion queue
     */
    getDeletionQueue: async () => {
        try {
            let queueString;

            if (Platform.OS === 'web') {
                queueString = localStorage.getItem(DELETION_QUEUE_KEY);
            } else {
                queueString = await SecureStore.getItemAsync(DELETION_QUEUE_KEY);
            }

            return queueString ? JSON.parse(queueString) : [];
        } catch (error) {
            console.error('Failed to get deletion queue:', error);
            return [];
        }
    },

    /**
     * Save deletion queue
     */
    saveDeletionQueue: async (queue) => {
        try {
            const queueString = JSON.stringify(queue);

            if (Platform.OS === 'web') {
                localStorage.setItem(DELETION_QUEUE_KEY, queueString);
            } else {
                await SecureStore.setItemAsync(DELETION_QUEUE_KEY, queueString);
            }
        } catch (error) {
            console.error('Failed to save deletion queue:', error);
        }
    },

    /**
     * Process deletion queue (run daily)
     */
    processDeletionQueue: async () => {
        try {
            const queue = await RetentionService.getDeletionQueue();
            const now = new Date();

            const toDelete = queue.filter(item => new Date(item.deletionDate) <= now);
            const remaining = queue.filter(item => new Date(item.deletionDate) > now);

            let deletedCount = 0;

            for (const item of toDelete) {
                try {
                    // Delete the data
                    await RetentionService.deleteData(item.dataType, item.dataId);
                    deletedCount++;

                    // Audit deletion
                    await AuditService.logEvent(
                        'SYSTEM',
                        'AUTO_DELETE',
                        item.dataType,
                        {
                            dataId: item.dataId,
                            retentionPeriod: RETENTION_CONFIG.RETENTION_PERIODS[item.dataType],
                            createdAt: item.createdAt
                        }
                    );
                } catch (error) {
                    console.error(`Failed to delete ${item.dataType}:${item.dataId}:`, error);
                }
            }

            // Update queue
            await RetentionService.saveDeletionQueue(remaining);

            // Update last cleanup time
            if (Platform.OS === 'web') {
                localStorage.setItem(LAST_CLEANUP_KEY, now.toISOString());
            } else {
                await SecureStore.setItemAsync(LAST_CLEANUP_KEY, now.toISOString());
            }

            return {
                processed: toDelete.length,
                deleted: deletedCount,
                remaining: remaining.length
            };
        } catch (error) {
            console.error('Failed to process deletion queue:', error);
            return { processed: 0, deleted: 0, remaining: 0, error: error.message };
        }
    },

    /**
     * Delete data by type and ID
     */
    deleteData: async (dataType, dataId) => {
        // Map data types to storage keys
        const storageKeyMap = {
            transactions: STORAGE_KEYS.EXPENSES,
            budgets: STORAGE_KEYS.BUDGETS,
            savings: STORAGE_KEYS.SAVINGS,
            sessions: 'active_sessions'
            // Add more mappings as needed
        };

        const storageKey = storageKeyMap[dataType];

        if (!storageKey) {
            console.warn(`No storage key mapping for data type: ${dataType}`);
            return;
        }

        // Load data
        const data = await StorageService.loadData(storageKey);

        if (Array.isArray(data)) {
            // Filter out the item to delete
            const filtered = data.filter(item => item.id !== dataId);
            await StorageService.saveData(storageKey, filtered);
        } else if (data && typeof data === 'object') {
            // For object-based storage
            delete data[dataId];
            await StorageService.saveData(storageKey, data);
        }
    },

    /**
     * Get items approaching deletion (for warnings)
     */
    getItemsApproachingDeletion: async (daysThreshold = 7) => {
        const queue = await RetentionService.getDeletionQueue();
        const now = new Date();
        const threshold = new Date();
        threshold.setDate(threshold.getDate() + daysThreshold);

        return queue.filter(item => {
            const deletionDate = new Date(item.deletionDate);
            return deletionDate > now && deletionDate <= threshold;
        });
    },

    /**
     * Cancel scheduled deletion
     */
    cancelDeletion: async (dataType, dataId) => {
        const queue = await RetentionService.getDeletionQueue();
        const filtered = queue.filter(item =>
            !(item.dataType === dataType && item.dataId === dataId)
        );

        await RetentionService.saveDeletionQueue(filtered);

        await AuditService.logEvent(
            'USER',
            'CANCEL_DELETION',
            dataType,
            { dataId }
        );
    },

    /**
     * Get retention status for data
     */
    getRetentionStatus: async (dataType, createdAt) => {
        const deletionDate = calculateDeletionDate(dataType, createdAt);

        if (!deletionDate) {
            return {
                willDelete: false,
                retentionPeriod: 'indefinite'
            };
        }

        const now = new Date();
        const daysUntilDeletion = Math.ceil((deletionDate - now) / (1000 * 60 * 60 * 24));

        return {
            willDelete: true,
            deletionDate: deletionDate.toISOString(),
            daysUntilDeletion,
            retentionPeriod: RETENTION_CONFIG.RETENTION_PERIODS[dataType]
        };
    }
};

// Auto-run cleanup job daily
setInterval(() => {
    RetentionService.processDeletionQueue();
}, RETENTION_CONFIG.DELETION_JOB_INTERVAL);

// Run cleanup on app start (after 1 minute)
setTimeout(() => {
    RetentionService.processDeletionQueue();
}, 60 * 1000);
