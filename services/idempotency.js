import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid'; // Ensure uuid is installed or polyfilled

const IDEMPOTENCY_STORE_KEY = 'processed_idempotency_keys';

// Cleanup TTL: 24 hours
const TTL_MS = 24 * 60 * 60 * 1000;

export const IdempotencyService = {

    /**
     * Generate a new unique Idempotency Key for a transaction intent
     */
    generateKey: () => {
        // v4 UUID
        if (Platform.OS === 'web') {
            return crypto.randomUUID();
        }
        // Fallback if uuid package issue, but we installed it.
        // Simple random fallback just in case
        return 'idemp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    /**
     * Process a key transactionally
     * @param {string} key - UUID key provided by client/UI
     * @returns {Promise<boolean>} - true if new content, false if duplicate/replay
     */
    processKey: async (key) => {
        if (!key) return true; // No key = no protection (warn?)

        let store = {};
        let raw = null;

        if (Platform.OS === 'web') {
            raw = localStorage.getItem(IDEMPOTENCY_STORE_KEY);
        } else {
            raw = await SecureStore.getItemAsync(IDEMPOTENCY_STORE_KEY);
        }

        if (raw) {
            try {
                store = JSON.parse(raw);
            } catch (e) { store = {}; }
        }

        // 1. Check for Duplicate
        if (store[key]) {
            console.warn(`Idempotency Replay Detected: Key ${key} already processed at ${store[key]}`);
            return false; // REJECT
        }

        // 2. Prune old keys (maintenance)
        const now = Date.now();
        const cleanStore = {};
        Object.keys(store).forEach(k => {
            if (now - store[k] < TTL_MS) {
                cleanStore[k] = store[k];
            }
        });

        // 3. Register valid key
        cleanStore[key] = now;

        // 4. Save
        const newRaw = JSON.stringify(cleanStore);
        if (Platform.OS === 'web') {
            localStorage.setItem(IDEMPOTENCY_STORE_KEY, newRaw);
        } else {
            await SecureStore.setItemAsync(IDEMPOTENCY_STORE_KEY, newRaw);
        }

        return true; // ACCEPT
    }
};
