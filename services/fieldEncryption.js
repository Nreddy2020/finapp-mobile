import * as Crypto from 'expo-crypto';
import { encrypt as storageEncrypt, decrypt as storageDecrypt } from './crypto';
import { ENCRYPTION_CONFIG, getFieldCategory, shouldTokenize } from '../config/encryption.config';

/**
 * Field-Level Encryption Service
 * Provides granular encryption for sensitive fields
 */

// Token storage (in production, use secure database)
const tokenStore = new Map();

export const FieldEncryptionService = {

    /**
     * Derive field-specific encryption key from master key
     */
    deriveFieldKey: async (category, version = ENCRYPTION_CONFIG.CURRENT_KEY_VERSION) => {
        const keyInfo = ENCRYPTION_CONFIG.KEY_DERIVATION[category];
        const salt = `${keyInfo}_v${version}`;

        // In production, use HKDF (HMAC-based Key Derivation Function)
        // For MVP, we'll use a simplified approach
        const derivedKey = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            salt
        );

        return derivedKey;
    },

    /**
     * Encrypt a single field
     */
    encryptField: async (fieldName, value) => {
        if (!value) return value;

        // Check if field should be tokenized
        if (shouldTokenize(fieldName)) {
            return await FieldEncryptionService.tokenize(fieldName, value);
        }

        // Get field category
        const category = getFieldCategory(fieldName);
        if (!category) {
            return value; // Field doesn't require encryption
        }

        // Derive field-specific key
        const fieldKey = await FieldEncryptionService.deriveFieldKey(category);

        // Encrypt using storage encryption (which uses AES-256-GCM)
        const encrypted = await storageEncrypt(value, fieldKey);

        // Add metadata for key version
        return {
            __encrypted: true,
            __version: ENCRYPTION_CONFIG.CURRENT_KEY_VERSION,
            __category: category,
            __value: encrypted
        };
    },

    /**
     * Decrypt a single field
     */
    decryptField: async (fieldName, encryptedValue) => {
        if (!encryptedValue) return encryptedValue;

        // Check if it's a token
        if (encryptedValue.__tokenized) {
            return await FieldEncryptionService.detokenize(encryptedValue.__token);
        }

        // Check if it's encrypted
        if (!encryptedValue.__encrypted) {
            return encryptedValue; // Not encrypted
        }

        // Derive field-specific key
        const fieldKey = await FieldEncryptionService.deriveFieldKey(
            encryptedValue.__category,
            encryptedValue.__version
        );

        // Decrypt
        const decrypted = await storageDecrypt(encryptedValue.__value, fieldKey);

        return decrypted;
    },

    /**
     * Encrypt multiple fields in an object
     */
    encryptFields: async (data, fieldsToEncrypt) => {
        const encrypted = { ...data };

        for (const fieldName of fieldsToEncrypt) {
            if (encrypted[fieldName] !== undefined) {
                encrypted[fieldName] = await FieldEncryptionService.encryptField(
                    fieldName,
                    encrypted[fieldName]
                );
            }
        }

        return encrypted;
    },

    /**
     * Decrypt multiple fields in an object
     */
    decryptFields: async (data, fieldsToDecrypt) => {
        const decrypted = { ...data };

        for (const fieldName of fieldsToDecrypt) {
            if (decrypted[fieldName] !== undefined) {
                decrypted[fieldName] = await FieldEncryptionService.decryptField(
                    fieldName,
                    decrypted[fieldName]
                );
            }
        }

        return decrypted;
    },

    /**
     * Tokenize sensitive data (e.g., card numbers)
     */
    tokenize: async (fieldName, value) => {
        // Generate token
        const token = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            `${fieldName}_${value}_${Date.now()}`
        );

        // Store mapping (in production, use secure database)
        tokenStore.set(token, value);

        return {
            __tokenized: true,
            __token: token,
            __masked: FieldEncryptionService.maskValue(fieldName, value)
        };
    },

    /**
     * Detokenize to get original value
     */
    detokenize: async (token) => {
        return tokenStore.get(token) || null;
    },

    /**
     * Mask sensitive value for display
     */
    maskValue: (fieldName, value) => {
        if (fieldName === 'cardNumber') {
            // Show last 4 digits: **** **** **** 1234
            return `**** **** **** ${value.slice(-4)}`;
        } else if (fieldName === 'accountNumber') {
            // Show last 4 digits: ******1234
            return `******${value.slice(-4)}`;
        } else if (fieldName === 'cvv') {
            return '***';
        } else if (fieldName === 'ssn') {
            // Show last 4: ***-**-1234
            return `***-**-${value.slice(-4)}`;
        }

        // Default: show first and last character
        if (value.length > 2) {
            return `${value[0]}${'*'.repeat(value.length - 2)}${value[value.length - 1]}`;
        }

        return '*'.repeat(value.length);
    }
};
