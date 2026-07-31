import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Token Revocation Store
 * Production: Replace with Redis for distributed systems
 * Current: In-memory + SecureStore for persistence
 */

const REVOKED_TOKENS_KEY = 'revoked_tokens';
const ACTIVE_SESSIONS_KEY = 'active_sessions';

// In-memory cache (cleared on app restart)
let revokedTokensCache = new Set();
let activeSessionsCache = new Map();

export const TokenStore = {

    /**
     * Initialize store from persistent storage
     */
    initialize: async () => {
        try {
            if (Platform.OS === 'web') {
                const revoked = localStorage.getItem(REVOKED_TOKENS_KEY);
                const sessions = localStorage.getItem(ACTIVE_SESSIONS_KEY);

                if (revoked) revokedTokensCache = new Set(JSON.parse(revoked));
                if (sessions) activeSessionsCache = new Map(JSON.parse(sessions));
            } else {
                const revoked = await SecureStore.getItemAsync(REVOKED_TOKENS_KEY);
                const sessions = await SecureStore.getItemAsync(ACTIVE_SESSIONS_KEY);

                if (revoked) revokedTokensCache = new Set(JSON.parse(revoked));
                if (sessions) activeSessionsCache = new Map(JSON.parse(sessions));
            }
        } catch (error) {
            console.error('TokenStore init failed:', error);
        }
    },

    /**
     * Persist to storage
     */
    persist: async () => {
        try {
            const revokedArray = Array.from(revokedTokensCache);
            const sessionsArray = Array.from(activeSessionsCache.entries());

            if (Platform.OS === 'web') {
                localStorage.setItem(REVOKED_TOKENS_KEY, JSON.stringify(revokedArray));
                localStorage.setItem(ACTIVE_SESSIONS_KEY, JSON.stringify(sessionsArray));
            } else {
                await SecureStore.setItemAsync(REVOKED_TOKENS_KEY, JSON.stringify(revokedArray));
                await SecureStore.setItemAsync(ACTIVE_SESSIONS_KEY, JSON.stringify(sessionsArray));
            }
        } catch (error) {
            console.error('TokenStore persist failed:', error);
        }
    },

    /**
     * Revoke a token (add to blacklist)
     */
    revokeToken: async (token) => {
        revokedTokensCache.add(token);
        await TokenStore.persist();
    },

    /**
     * Check if token is revoked
     */
    isRevoked: (token) => {
        return revokedTokensCache.has(token);
    },

    /**
     * Register active session
     */
    registerSession: async (userId, sessionId, deviceId, token) => {
        if (!activeSessionsCache.has(userId)) {
            activeSessionsCache.set(userId, []);
        }

        const userSessions = activeSessionsCache.get(userId);
        userSessions.push({
            sessionId,
            deviceId,
            token,
            createdAt: Date.now(),
            lastUsed: Date.now()
        });

        activeSessionsCache.set(userId, userSessions);
        await TokenStore.persist();
    },

    /**
     * Get all sessions for a user
     */
    getUserSessions: (userId) => {
        return activeSessionsCache.get(userId) || [];
    },

    /**
     * Revoke specific session
     */
    revokeSession: async (userId, sessionId) => {
        const sessions = activeSessionsCache.get(userId) || [];
        const session = sessions.find(s => s.sessionId === sessionId);

        if (session) {
            await TokenStore.revokeToken(session.token);
            const updated = sessions.filter(s => s.sessionId !== sessionId);
            activeSessionsCache.set(userId, updated);
            await TokenStore.persist();
        }
    },

    /**
     * Revoke all sessions for a user (logout all devices)
     */
    revokeAllSessions: async (userId) => {
        const sessions = activeSessionsCache.get(userId) || [];

        for (const session of sessions) {
            await TokenStore.revokeToken(session.token);
        }

        activeSessionsCache.delete(userId);
        await TokenStore.persist();
    },

    /**
     * Update session last used timestamp
     */
    updateSessionActivity: async (userId, token) => {
        const sessions = activeSessionsCache.get(userId) || [];
        const session = sessions.find(s => s.token === token);

        if (session) {
            session.lastUsed = Date.now();
            activeSessionsCache.set(userId, sessions);
            await TokenStore.persist();
        }
    },

    /**
     * Clean up expired tokens (TTL enforcement)
     */
    cleanup: async () => {
        const now = Date.now();
        const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

        for (const [userId, sessions] of activeSessionsCache.entries()) {
            const validSessions = sessions.filter(s => {
                const age = now - s.createdAt;
                return age < MAX_AGE;
            });

            if (validSessions.length === 0) {
                activeSessionsCache.delete(userId);
            } else {
                activeSessionsCache.set(userId, validSessions);
            }
        }

        await TokenStore.persist();
    }
};

// Initialize on module load
TokenStore.initialize();

// Cleanup expired sessions every hour
setInterval(() => {
    TokenStore.cleanup();
}, 60 * 60 * 1000);
