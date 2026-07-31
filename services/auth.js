import * as SecureStore from 'expo-secure-store';
import { getDeviceFingerprint } from './device';
import { Platform } from 'react-native';
import { TokenStore } from './tokenStore';
import { API_ORIGIN, AUTH_API_URL, DEMO_MODE_ENABLED, assertApiConfigured } from './runtimeConfig';

const TOKEN_KEY = 'auth_tokens';
const USER_KEY = 'auth_user';

// Token Expiry Constants
const ACCESS_TOKEN_EXPIRY = 15 * 60 * 1000;  // 15 minutes
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Backend URL — update for your environment.
// Falls back to demo mode if the backend is unreachable.
/**
 * Demo credentials for offline / no-backend mode.
 * Useful during development without a running server.
 */
const DEMO_USERS = [
    { email: 'admin@example.com', password: 'dev_password_123', fullName: 'Demo User', role: 'admin' },
    { email: 'user@example.com', password: 'password123', fullName: 'Test User', role: 'user' },
];

const createDemoSession = (email, fullName, deviceId) => {
    const tokens = {
        accessToken: `demo_access_${Date.now()}`,
        refreshToken: `demo_refresh_${Date.now()}`,
        expiresAt: Date.now() + ACCESS_TOKEN_EXPIRY,
        isDemoMode: true,
    };
    const user = {
        id: `demo_${email.split('@')[0]}`,
        email,
        fullName: fullName || email.split('@')[0],
        deviceId,
        role: 'user',
        isDemoMode: true,
    };
    return { tokens, user };
};

export const AuthService = {
    // Internal logout listeners
    _logoutListeners: [],

    addLogoutListener: (cb) => {
        if (typeof cb === 'function') AuthService._logoutListeners.push(cb);
    },
    removeLogoutListener: (cb) => {
        AuthService._logoutListeners = AuthService._logoutListeners.filter(f => f !== cb);
    },

    // Register
    register: async (email, password, fullName) => {
        const deviceId = await getDeviceFingerprint();
        if (!DEMO_MODE_ENABLED) assertApiConfigured();

        // Bypass fetch and go straight to demo session if API URL is not set
        if (!API_ORIGIN && DEMO_MODE_ENABLED) {
            console.warn('[Auth] No API origin configured — registering in demo mode');
            const { tokens, user } = createDemoSession(email, fullName, deviceId);
            await AuthService.saveSession(tokens, user);
            return { success: true, user };
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${AUTH_API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Device-ID': deviceId },
                body: JSON.stringify({ email, password, full_name: fullName }),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Registration failed');

            const tokens = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + ((data.expires_in || 900) * 1000),
            };
            const user = { id: data.user_id || 'new_user', email, fullName, deviceId, role: 'user' };
            await AuthService.saveSession(tokens, user);
            return { success: true, user };
        } catch (error) {
            if (DEMO_MODE_ENABLED) {
                console.warn('[Auth] Registration network error / HTML response, falling back to demo mode');
                const { tokens, user } = createDemoSession(email, fullName, deviceId);
                await AuthService.saveSession(tokens, user);
                return { success: true, user };
            }
            throw error;
        }
    },

    // Login
    login: async (email, password) => {
        const deviceId = await getDeviceFingerprint();
        if (!DEMO_MODE_ENABLED) assertApiConfigured();

        // First try demo credentials (works offline too)
        const demoUser = DEMO_USERS.find(
            u => u.email === email && u.password === password
        );

        // Bypass fetch and go straight to demo session if API URL is not set
        if (!API_ORIGIN && DEMO_MODE_ENABLED) {
            if (demoUser) {
                console.warn('[Auth] No API origin configured — using demo mode login');
                const { tokens, user } = createDemoSession(email, demoUser.fullName, deviceId);
                await AuthService.saveSession(tokens, user);
                return { success: true, user };
            }
            throw new Error('Backend is offline. Use admin@example.com / dev_password_123 for demo mode.');
        }

        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 5000);
            const response = await fetch(`${AUTH_API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Device-ID': deviceId },
                body: JSON.stringify({ email, password }),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Login failed');

            const tokens = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + ((data.expires_in || 900) * 1000),
            };
            const user = { id: data.user_id || 'user', email, deviceId, role: 'user' };
            await AuthService.saveSession(tokens, user);
            return { success: true, user };
        } catch (error) {
            if (DEMO_MODE_ENABLED) {
                if (demoUser) {
                    console.warn('[Auth] Login network error / HTML response, falling back to demo mode');
                    const { tokens, user } = createDemoSession(email, demoUser.fullName, deviceId);
                    await AuthService.saveSession(tokens, user);
                    return { success: true, user };
                }
                throw new Error('Backend is offline. Use admin@example.com / dev_password_123 for demo mode.');
            }
            throw error;
        }
    },

    // Logout
    logout: async () => {
        if (Platform.OS === 'web') {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
        } else {
            await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
            await SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
        }

        // Notify listeners (non-blocking)
        AuthService._logoutListeners.forEach(cb => {
            try { cb(); } catch (e) { /* no-op */ }
        });
    },

    // Save Session (Securely)
    saveSession: async (tokens, user) => {
        const tokenString = JSON.stringify(tokens);
        const userString = JSON.stringify(user);

        if (Platform.OS === 'web') {
            localStorage.setItem(TOKEN_KEY, tokenString);
            localStorage.setItem(USER_KEY, userString);
        } else {
            await SecureStore.setItemAsync(TOKEN_KEY, tokenString);
            await SecureStore.setItemAsync(USER_KEY, userString);
        }
    },

    // Get Session
    getSession: async () => {
        let tokenString, userString;

        try {
            if (Platform.OS === 'web') {
                tokenString = localStorage.getItem(TOKEN_KEY);
                userString = localStorage.getItem(USER_KEY);
            } else {
                tokenString = await SecureStore.getItemAsync(TOKEN_KEY);
                userString = await SecureStore.getItemAsync(USER_KEY);
            }
        } catch (e) {
            console.warn('[Auth] SecureStore read error', e);
            return null;
        }

        if (!tokenString || !userString) return null;

        let tokens, user;
        try {
            tokens = JSON.parse(tokenString);
            user = JSON.parse(userString);
        } catch {
            return null;
        }

        // Skip token revocation check for demo tokens
        if (!tokens.isDemoMode && TokenStore.isRevoked(tokens.accessToken)) {
            console.warn('[Auth] Token revoked — logging out');
            await AuthService.logout();
            return null;
        }

        // Skip device check for demo mode
        if (!tokens.isDemoMode) {
            const currentDeviceId = await getDeviceFingerprint();
            if (user.deviceId && user.deviceId !== currentDeviceId) {
                console.warn('[Auth] Device fingerprint mismatch — logging out');
                await AuthService.logout();
                return null;
            }
        }

        // Token expiry
        if (Date.now() > tokens.expiresAt) {
            if (tokens.isDemoMode) {
                // Renew demo token silently
                const newTokens = { ...tokens, expiresAt: Date.now() + ACCESS_TOKEN_EXPIRY };
                await AuthService.saveSession(newTokens, user);
                return { user, tokens: newTokens };
            }
            try {
                return await AuthService.refreshSession(tokens.refreshToken, user);
            } catch {
                await AuthService.logout();
                return null;
            }
        }

        return { user, tokens };
    },

    // Refresh Session
    refreshSession: async (oldRefreshToken, user) => {
        const deviceId = await getDeviceFingerprint();
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        try {
            const response = await fetch(`${AUTH_API_URL}/refresh`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Device-ID': deviceId },
                body: JSON.stringify({ refresh_token: oldRefreshToken }),
                signal: controller.signal,
            });
            clearTimeout(timeout);

            const data = await response.json();
            if (!response.ok) throw new Error(data.detail || 'Refresh failed');

            const tokens = {
                accessToken: data.access_token,
                refreshToken: data.refresh_token,
                expiresAt: Date.now() + ((data.expires_in || 900) * 1000),
            };
            await AuthService.saveSession(tokens, user);
            return { user, tokens };
        } catch (error) {
            clearTimeout(timeout);
            throw error;
        }
    },

    // Get Access Token
    getAccessToken: async () => {
        const session = await AuthService.getSession();
        return session ? session.tokens.accessToken : null;
    },
};
