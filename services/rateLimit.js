import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const RATE_LIMIT_PREFIX = 'rate_limit_';

export const RateLimitService = {
    /**
     * Check if an action is allowed based on velocity
     * @param {string} key - Unique identifier for the action scope (e.g. 'transaction_user_123')
     * @param {number} limit - Max allowed actions
     * @param {number} windowSeconds - Time window in seconds
     * @returns {Promise<boolean>} - true if allowed, false if blocked
     */
    checkLimit: async (key, limit = 5, windowSeconds = 60) => {
        try {
            const storeKey = `${RATE_LIMIT_PREFIX}${key}`;
            let data = null;

            if (Platform.OS === 'web') {
                const raw = localStorage.getItem(storeKey);
                if (raw) data = JSON.parse(raw);
            } else {
                const raw = await SecureStore.getItemAsync(storeKey);
                if (raw) data = JSON.parse(raw);
            }

            const now = Date.now();
            const windowStart = now - (windowSeconds * 1000);

            let timestamps = data ? data.timestamps : [];

            // 1. Prune old timestamps
            timestamps = timestamps.filter(ts => ts > windowStart);

            // 2. Check Count
            if (timestamps.length >= limit) {
                return false; // BLOCKED
            }

            // 3. Add new timestamp
            timestamps.push(now);

            // 4. Save
            const newData = JSON.stringify({ timestamps });
            if (Platform.OS === 'web') {
                localStorage.setItem(storeKey, newData);
            } else {
                await SecureStore.setItemAsync(storeKey, newData);
            }

            return true; // ALLOWED

        } catch (error) {
            console.error('Rate Limit Check Failed:', error);
            return true; // Fail Open or Close? safely open for local logic to avoid lockout on error, but close for security.
            // For MVP local app, fail open to avoid frustration if storage fails.
        }
    },

    /**
     * Clear limit for a key (e.g. after successful CAPTCHA/Auth)
     */
    resetLimit: async (key) => {
        const storeKey = `${RATE_LIMIT_PREFIX}${key}`;
        if (Platform.OS === 'web') {
            localStorage.removeItem(storeKey);
        } else {
            await SecureStore.deleteItemAsync(storeKey);
        }
    }
};
