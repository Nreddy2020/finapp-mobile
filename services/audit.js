import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
// Use legacy import to avoid SDK 54 deprecation errors
import * as FileSystem from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { encrypt } from './crypto';
import { CloudAuditService } from './cloudAudit';

const getAuditFile = () => (Platform.OS === 'web' ? null : (FileSystem.documentDirectory || '') + 'audit_immutable.log');

export const AuditService = {
    /**
     * Log a security or financial event
     * @param {string} actor - User ID or 'SYSTEM'
     * @param {string} action - Event type (e.g., 'LOGIN', 'TRANSFER', 'VIEW_DECRYPTED')
     * @param {string} resource - Target resource (e.g., 'account_123')
     * @param {object} metadata - Additional context
     */
    logEvent: async (actor, action, resource, metadata = {}) => {
        try {
            const timestamp = new Date().toISOString();

            // 1. Get previous hash (Blockchain-like chaining)
            let prevHash = 'genesis_hash';
            let existingParams = {};

            if (Platform.OS !== 'web') {
                const AUDIT_LOG_FILE = getAuditFile();
                const info = await FileSystem.getInfoAsync(AUDIT_LOG_FILE);
                if (info.exists) {
                    // Read last line efficiently? 
                    // For mobile, reading whole file is okay for MVP, but should optimize later.
                    const content = await FileSystem.readAsStringAsync(AUDIT_LOG_FILE);
                    const lines = content.trim().split('\n');
                    if (lines.length > 0) {
                        const lastLine = lines[lines.length - 1];
                        try {
                            const lastEntry = JSON.parse(lastLine);
                            prevHash = lastEntry.hash;
                        } catch (e) {
                            console.error('Audit Corruption Detected: Last line invalid JSON');
                        }
                    }
                }
            }

            // 2. Construct entry payload
            const entryPayload = {
                timestamp,
                actor,
                action,
                resource,
                metadata,
                prevHash
            };

            // 3. Compute Hash of this entry (Tamper Evidence)
            const payloadString = JSON.stringify(entryPayload);
            const hash = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                payloadString
            );

            // 4. Final Audit Record
            const auditRecord = {
                ...entryPayload,
                hash
            };

            // 5. Encrypt before writing? 
            // PCI-DSS requires audit logs to be secure. 
            // We can encrypt the file AT REST, but for appending, line-by-line is easier if plain JSON-lines
            // BUT the file itself resides in app sandbox. 
            // Optimally: Encrypt the file content.
            // For now: We write plain JSON with HASHES to detect tampering. 
            // Encryption of the audit file itself should be handled by OS sandbox or a separate EncryptedStorage pass.

            const line = JSON.stringify(auditRecord) + '\n';

            if (Platform.OS === 'web') {
                console.log('[AUDIT]', line);
                // Web MVP: log to console or localStorage
            } else {
                const AUDIT_LOG_FILE = getAuditFile();
                if (await FileSystem.getInfoAsync(AUDIT_LOG_FILE).then(i => i.exists)) {
                    // append
                    // Expo FileSystem doesn't have direct append? 
                    // Actually writeAsStringAsync has no append option in some versions.
                    // Workaround: read, concat, write (bad performance for big logs)
                    // Better: Use `expo-file-system/next` or just `StorageService` logic
                    // For MVP/Batch18, we will read-append-write. 
                    // TODO: Optimize with a stream or dedicated logger native module.
                    const current = await FileSystem.readAsStringAsync(AUDIT_LOG_FILE);
                    await FileSystem.writeAsStringAsync(AUDIT_LOG_FILE, current + line);
                } else {
                    await FileSystem.writeAsStringAsync(AUDIT_LOG_FILE, line);
                }
            }

            // 6. Queue for cloud backup (IMMUTABILITY ENFORCEMENT)
            await CloudAuditService.queueForSync(auditRecord);

            return true;

        } catch (error) {
            console.error('Audit Logging Failed:', error);
            // FAIL SAFE: specific for audit failure?
            // In strict mode, app should stop.
            return false;
        }
    },

    /**
     * Export logs for audit
     */
    exportLogs: async () => {
        if (Platform.OS === 'web') return "Web Logs Console Only";

        const AUDIT_LOG_FILE = getAuditFile();
        const info = await FileSystem.getInfoAsync(AUDIT_LOG_FILE);
        if (!info.exists) return "No logs found.";

        return await FileSystem.readAsStringAsync(AUDIT_LOG_FILE);
    }
};
