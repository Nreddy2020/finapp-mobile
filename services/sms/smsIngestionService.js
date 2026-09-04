/**
 * smsIngestionService.js
 * 
 * LIVE ANDROID SMS INGESTION & EVENT EMITTER SERVICE
 * 
 * Invariants:
 * - SMS-01: Ingestion provenance tracking for all received device SMS.
 * - SMS-02: Zero-duplicate idempotent processing against stored ledger.
 * - SMS-03: Low-confidence items auto-routed to NEEDS_REVIEW quarantine.
 * - SMS-04: Outputs unified canonical transaction contract.
 * - SMS-07: Isolated execution preventing crashes on malformed device SMS.
 */

import { Platform, PermissionsAndroid } from 'react-native';
import { parseRawSMS } from './smsParser.js';
import { normalizeSMSTransaction } from './smsTransactionNormalizer.js';
import { isDuplicateTransaction, generateTransactionFingerprint } from './smsDuplicateDetector.js';
import { getStoredTransactions, persistTransactions } from '../moneyFlowService.js';
import { loadData, saveData } from '../storage.js';

export const STORAGE_KEY_SMS_RAW_AUDIT = 'FINLIFE_SMS_RAW_AUDIT_LOG';

class SMSIngestionService {
    constructor() {
        this.listeners = new Set();
        this.nativeReceiverUnsubscribe = null;
        this.isListening = false;
        this.accounts = [];
        // Concurrency Mutex Queue to prevent race conditions on rapid incoming SMS
        this._mutationQueue = Promise.resolve();
        // In-memory fingerprint cache
        this._seenFingerprints = new Set();
    }

    /**
     * Configure accounts for bank mask resolution.
     */
    setAccounts(accounts = []) {
        this.accounts = Array.isArray(accounts) ? accounts : [];
    }

    /**
     * Request Android SMS reading permissions if on native Android.
     */
    async requestPermissions() {
        if (Platform.OS !== 'android') {
            return true;
        }

        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
                {
                    title: 'FinLife SMS Transaction Permission',
                    message: 'FinLife requires SMS access to automatically organize your bank and UPI spending.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'Allow'
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn('[SMSIngestionService] Permission request failed:', err);
            return false;
        }
    }

    /**
     * Register a native Android broadcast receiver / bridge handler.
     */
    registerNativeReceiver(nativeBridge) {
        if (this.nativeReceiverUnsubscribe) {
            this.nativeReceiverUnsubscribe();
            this.nativeReceiverUnsubscribe = null;
        }

        if (typeof nativeBridge === 'function') {
            this.nativeReceiverUnsubscribe = nativeBridge((rawMsg) => {
                this.processIncomingRawMessage(rawMsg);
            });
            this.isListening = true;
        }
    }

    /**
     * Process an incoming raw SMS message payload through a serialized mutation queue.
     * Guarantees that concurrent SMS arrivals do not overwrite each other.
     */
    async processIncomingRawMessage(rawMessage) {
        if (!rawMessage) return null;

        return new Promise((resolve) => {
            this._mutationQueue = this._mutationQueue
                .then(async () => {
                    const result = await this._processSingleMessageInternal(rawMessage);
                    resolve(result);
                })
                .catch((err) => {
                    console.warn('[SMSIngestionService] Mutation queue error:', err);
                    resolve(null);
                });
        });
    }

    /**
     * Internal atomic processing step for a single raw SMS message.
     */
    async _processSingleMessageInternal(rawMessage) {
        const body = rawMessage.body || rawMessage.text || rawMessage.message || '';
        const sender = rawMessage.sender || rawMessage.originatingAddress || rawMessage.address || '';
        const timestamp = rawMessage.date || rawMessage.timestamp || new Date().toISOString();

        try {
            // 1. Audit Trail: Persist raw SMS payload before processing
            await this._appendRawAuditLog({
                id: `raw_sms_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                body,
                sender,
                receivedAt: new Date().toISOString(),
                deviceTimestamp: timestamp
            });

            // 2. Deterministic Parse
            const parsed = parseRawSMS(body, sender, timestamp);
            if (!parsed) {
                return null; // Non-financial SMS, OTP, or promo ignored
            }

            // 3. Fast In-Memory Deduplication Check
            const candidateFingerprint = generateTransactionFingerprint(parsed);
            if (candidateFingerprint && this._seenFingerprints.has(candidateFingerprint)) {
                return null; // Already queued or processed in memory
            }

            // 4. Load Current Canonical Journal from Storage
            const currentJournal = await getStoredTransactions();

            // 5. Deep Storage Duplicate Detection
            if (isDuplicateTransaction(parsed, currentJournal, this._seenFingerprints)) {
                if (candidateFingerprint) this._seenFingerprints.add(candidateFingerprint);
                return null; // Idempotently ignore duplicates
            }

            // 6. Normalization & Confidence Scoring
            const normalized = normalizeSMSTransaction(parsed, this.accounts);
            if (!normalized) {
                return null;
            }

            // Record normalized fingerprint
            const normalizedFingerprint = generateTransactionFingerprint(normalized);
            if (normalizedFingerprint) {
                this._seenFingerprints.add(normalizedFingerprint);
            }

            // 7. Append to Canonical Journal & Persist Atomically
            const updatedJournal = [normalized, ...currentJournal];
            await persistTransactions(updatedJournal);

            // 8. Notify Active UI Subscribers
            this.notifyListeners({
                type: 'TRANSACTION_INGESTED',
                transaction: normalized,
                allTransactions: updatedJournal
            });

            return normalized;
        } catch (err) {
            // SMS-07: Fault isolation
            console.warn('[SMSIngestionService] Failed to process SMS message safely:', err);
            return null;
        }
    }

    /**
     * Persists raw message to audit log for debugging & compliance.
     */
    async _appendRawAuditLog(rawLogEntry) {
        try {
            const currentLogs = (await loadData(STORAGE_KEY_SMS_RAW_AUDIT)) || [];
            const updatedLogs = [rawLogEntry, ...currentLogs].slice(0, 100); // keep last 100 raw messages
            await saveData(STORAGE_KEY_SMS_RAW_AUDIT, updatedLogs);
        } catch (err) {
            // Non-blocking log failure
        }
    }

    /**
     * Subscribe to real-time SMS ingestion events.
     */
    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.add(callback);
        }
        return () => this.removeListener(callback);
    }

    /**
     * Unsubscribe listener.
     */
    removeListener(callback) {
        this.listeners.delete(callback);
    }

    /**
     * Notify all active listeners.
     */
    notifyListeners(event) {
        for (const listener of this.listeners) {
            try {
                listener(event);
            } catch (err) {
                console.warn('[SMSIngestionService] Listener error:', err);
            }
        }
    }

    /**
     * Diagnostic status report.
     */
    getStatus() {
        return {
            isListening: this.isListening,
            listenerCount: this.listeners.size,
            accountsCount: this.accounts.length,
            seenFingerprintsCount: this._seenFingerprints.size
        };
    }
}

export const smsIngestionService = new SMSIngestionService();
export default smsIngestionService;
