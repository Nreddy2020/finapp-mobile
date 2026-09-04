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
import { isDuplicateTransaction } from './smsDuplicateDetector.js';
import { getStoredTransactions, persistTransactions } from '../moneyFlowService.js';

class SMSIngestionService {
    constructor() {
        this.listeners = new Set();
        this.isListening = false;
        this.accounts = [];
    }

    /**
     * Configure accounts for bank mask resolution.
     */
    setAccounts(accounts = []) {
        this.accounts = accounts;
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
     * Process an incoming raw SMS message payload (from native broadcast receiver or background task).
     */
    async processIncomingRawMessage(rawMessage) {
        if (!rawMessage) return null;

        const body = rawMessage.body || rawMessage.text || rawMessage.message || '';
        const sender = rawMessage.sender || rawMessage.originatingAddress || rawMessage.address || '';
        const timestamp = rawMessage.date || rawMessage.timestamp || new Date().toISOString();

        try {
            // 1. Deterministic Parse
            const parsed = parseRawSMS(body, sender, timestamp);
            if (!parsed) {
                return null; // Non-financial SMS ignored
            }

            // 2. Load Current Journal
            const currentJournal = await getStoredTransactions();

            // 3. Duplicate Detection
            if (isDuplicateTransaction(parsed, currentJournal)) {
                return null; // Idempotently ignore duplicates
            }

            // 4. Normalization & Confidence Scoring
            const normalized = normalizeSMSTransaction(parsed, this.accounts);
            if (!normalized) {
                return null;
            }

            // 5. Append to Canonical Journal & Persist
            const updatedJournal = [normalized, ...currentJournal];
            await persistTransactions(updatedJournal);

            // 6. Notify Active UI Subscribers
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
}

export const smsIngestionService = new SMSIngestionService();
export default smsIngestionService;
