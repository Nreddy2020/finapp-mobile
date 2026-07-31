import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

const AUDIT_LOG_FILE = FileSystem.documentDirectory + 'audit_immutable.log';
const AUDIT_BACKUP_FILE = FileSystem.documentDirectory + 'audit_backup.log';
const SYNC_QUEUE_FILE = FileSystem.documentDirectory + 'audit_sync_queue.json';

/**
 * Audit Verification Service
 * Verifies integrity of audit trail and detects tampering
 */
export const AuditVerifier = {

    /**
     * Verify entire audit chain integrity
     */
    verifyChain: async () => {
        if (Platform.OS === 'web') {
            console.warn('Audit verification not available on web');
            return { valid: true, message: 'Web platform - verification skipped' };
        }

        try {
            const fileInfo = await FileSystem.getInfoAsync(AUDIT_LOG_FILE);
            if (!fileInfo.exists) {
                return { valid: true, message: 'No audit log found' };
            }

            const content = await FileSystem.readAsStringAsync(AUDIT_LOG_FILE);
            const lines = content.trim().split('\n').filter(Boolean);

            if (lines.length === 0) {
                return { valid: true, message: 'Empty audit log' };
            }

            let prevHash = 'genesis_hash';
            const errors = [];

            for (let i = 0; i < lines.length; i++) {
                try {
                    const entry = JSON.parse(lines[i]);

                    // Verify previous hash matches
                    if (entry.prevHash !== prevHash) {
                        errors.push({
                            line: i + 1,
                            error: 'HASH_CHAIN_BROKEN',
                            expected: prevHash,
                            found: entry.prevHash
                        });
                    }

                    // Verify entry hash
                    const { hash, ...payload } = entry;
                    const payloadString = JSON.stringify(payload);
                    const computedHash = await Crypto.digestStringAsync(
                        Crypto.CryptoDigestAlgorithm.SHA256,
                        payloadString
                    );

                    if (hash !== computedHash) {
                        errors.push({
                            line: i + 1,
                            error: 'ENTRY_TAMPERED',
                            computed: computedHash,
                            stored: hash
                        });
                    }

                    // Verify chronological order
                    if (i > 0) {
                        const prevEntry = JSON.parse(lines[i - 1]);
                        if (new Date(entry.timestamp) < new Date(prevEntry.timestamp)) {
                            errors.push({
                                line: i + 1,
                                error: 'TIMESTAMP_OUT_OF_ORDER'
                            });
                        }
                    }

                    prevHash = hash;

                } catch (parseError) {
                    errors.push({
                        line: i + 1,
                        error: 'INVALID_JSON',
                        details: parseError.message
                    });
                }
            }

            if (errors.length > 0) {
                return {
                    valid: false,
                    message: `Audit trail compromised: ${errors.length} errors detected`,
                    errors
                };
            }

            return {
                valid: true,
                message: `Audit trail verified: ${lines.length} entries`,
                entries: lines.length
            };

        } catch (error) {
            return {
                valid: false,
                message: 'Verification failed',
                error: error.message
            };
        }
    },

    /**
     * Export audit trail for compliance
     */
    exportAudit: async (startDate = null, endDate = null) => {
        if (Platform.OS === 'web') {
            return { success: false, error: 'Export not available on web' };
        }

        try {
            const fileInfo = await FileSystem.getInfoAsync(AUDIT_LOG_FILE);
            if (!fileInfo.exists) {
                return { success: false, error: 'No audit log found' };
            }

            const content = await FileSystem.readAsStringAsync(AUDIT_LOG_FILE);
            const lines = content.trim().split('\n').filter(Boolean);

            let entries = lines.map(line => JSON.parse(line));

            // Filter by date range if provided
            if (startDate) {
                entries = entries.filter(e => new Date(e.timestamp) >= new Date(startDate));
            }
            if (endDate) {
                entries = entries.filter(e => new Date(e.timestamp) <= new Date(endDate));
            }

            const exportData = {
                exportedAt: new Date().toISOString(),
                totalEntries: entries.length,
                dateRange: {
                    start: startDate || entries[0]?.timestamp,
                    end: endDate || entries[entries.length - 1]?.timestamp
                },
                entries
            };

            const exportFile = FileSystem.documentDirectory + `audit_export_${Date.now()}.json`;
            await FileSystem.writeAsStringAsync(exportFile, JSON.stringify(exportData, null, 2));

            return {
                success: true,
                file: exportFile,
                entries: entries.length
            };

        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    },

    /**
     * Get audit statistics
     */
    getStats: async () => {
        if (Platform.OS === 'web') {
            return { totalEntries: 0, oldestEntry: null, newestEntry: null };
        }

        try {
            const fileInfo = await FileSystem.getInfoAsync(AUDIT_LOG_FILE);
            if (!fileInfo.exists) {
                return { totalEntries: 0, oldestEntry: null, newestEntry: null };
            }

            const content = await FileSystem.readAsStringAsync(AUDIT_LOG_FILE);
            const lines = content.trim().split('\n').filter(Boolean);

            if (lines.length === 0) {
                return { totalEntries: 0, oldestEntry: null, newestEntry: null };
            }

            const entries = lines.map(line => JSON.parse(line));

            return {
                totalEntries: entries.length,
                oldestEntry: entries[0]?.timestamp,
                newestEntry: entries[entries.length - 1]?.timestamp,
                fileSize: fileInfo.size
            };

        } catch (error) {
            return { totalEntries: 0, error: error.message };
        }
    }
};
