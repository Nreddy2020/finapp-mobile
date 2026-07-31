import { Platform } from 'react-native';

const env = typeof process !== 'undefined' ? process.env ?? {} : {};
const isDevelopment = typeof __DEV__ !== 'undefined' && __DEV__;

const trimTrailingSlashes = (value = '') => value.trim().replace(/\/+$/, '');

export const API_ORIGIN = trimTrailingSlashes(env.EXPO_PUBLIC_API_URL);
export const API_BASE_URL = API_ORIGIN ? `${API_ORIGIN}/api` : '/api';
export const AUTH_API_URL = `${API_BASE_URL}/auth`;

// Demo access is convenient locally, but must never activate silently in a release.
export const DEMO_MODE_ENABLED = env.EXPO_PUBLIC_ENABLE_DEMO_MODE === 'true'
    || (isDevelopment && env.EXPO_PUBLIC_ENABLE_DEMO_MODE !== 'false');

export const assertApiConfigured = () => {
    if (!API_ORIGIN && Platform.OS !== 'web') {
        throw new Error(
            'The service URL is not configured. Set EXPO_PUBLIC_API_URL for this build.'
        );
    }
};

