import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { SECRETS, DEV_SECRETS } from '../config/secrets.config';

const VAULT_CACHE_KEY = 'vault_cache';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Secrets Service
 * Production: Replace MockVault with real cloud vault client
 * - AWS: AWS Secrets Manager
 * - GCP: Google Secret Manager
 * - Azure: Azure Key Vault
 */

class MockVault {
    constructor() {
        this.secrets = new Map();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;

        // Load cached secrets from SecureStore
        try {
            if (Platform.OS !== 'web') {
                const cached = await SecureStore.getItemAsync(VAULT_CACHE_KEY);
                if (cached) {
                    const data = JSON.parse(cached);
                    Object.entries(data).forEach(([key, value]) => {
                        this.secrets.set(key, value);
                    });
                }
            }
        } catch (error) {
            console.error('Failed to load vault cache:', error);
        }

        // Initialize with dev secrets if empty
        if (this.secrets.size === 0) {
            Object.entries(DEV_SECRETS).forEach(([key, value]) => {
                if (value !== null) {
                    this.secrets.set(key, {
                        value,
                        createdAt: Date.now(),
                        rotatedAt: null
                    });
                }
            });
        }

        this.initialized = true;
    }

    async getSecret(secretName) {
        await this.initialize();

        const secret = this.secrets.get(secretName);
        if (!secret) {
            throw new Error(`Secret not found: ${secretName}`);
        }

        return secret.value;
    }

    async setSecret(secretName, value) {
        await this.initialize();

        this.secrets.set(secretName, {
            value,
            createdAt: Date.now(),
            rotatedAt: Date.now()
        });

        await this.persist();
    }

    async rotateSecret(secretName) {
        await this.initialize();

        const secret = this.secrets.get(secretName);
        if (!secret) {
            throw new Error(`Secret not found: ${secretName}`);
        }

        // Generate new secret (mock rotation)
        const newValue = `rotated_${Date.now()}_${Math.random().toString(36)}`;

        this.secrets.set(secretName, {
            value: newValue,
            createdAt: secret.createdAt,
            rotatedAt: Date.now()
        });

        await this.persist();
        return newValue;
    }

    async listSecrets() {
        await this.initialize();
        return Array.from(this.secrets.keys());
    }

    async persist() {
        if (Platform.OS === 'web') return;

        try {
            const data = {};
            this.secrets.forEach((value, key) => {
                data[key] = value;
            });

            await SecureStore.setItemAsync(VAULT_CACHE_KEY, JSON.stringify(data));
        } catch (error) {
            console.error('Failed to persist vault cache:', error);
        }
    }
}

// Singleton vault instance
const vault = new MockVault();

/**
 * Secrets Service
 * Public API for accessing secrets
 */
export const SecretsService = {

    /**
     * Get a secret by name
     */
    getSecret: async (secretName) => {
        try {
            return await vault.getSecret(secretName);
        } catch (error) {
            console.error(`Failed to get secret ${secretName}:`, error);

            // Fallback to dev secret if available
            if (DEV_SECRETS[secretName]) {
                console.warn(`Using dev fallback for ${secretName}`);
                return DEV_SECRETS[secretName];
            }

            throw error;
        }
    },

    /**
     * Set a secret (admin only)
     */
    setSecret: async (secretName, value) => {
        return await vault.setSecret(secretName, value);
    },

    /**
     * Rotate a secret
     */
    rotateSecret: async (secretName) => {
        return await vault.rotateSecret(secretName);
    },

    /**
     * List all secret names
     */
    listSecrets: async () => {
        return await vault.listSecrets();
    },

    /**
     * Initialize vault (call on app start)
     */
    initialize: async () => {
        await vault.initialize();
    }
};

// Auto-initialize
SecretsService.initialize();
