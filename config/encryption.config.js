/**
 * Field-Level Encryption Configuration
 * Defines which fields require encryption and encryption policies
 */

export const ENCRYPTION_CONFIG = {
    // Field categories requiring encryption
    FIELD_CATEGORIES: {
        PII: ['name', 'email', 'phone', 'address', 'dateOfBirth'],
        FINANCIAL: ['accountNumber', 'cardNumber', 'cvv', 'bankName', 'ifsc'],
        SENSITIVE: ['ssn', 'taxId', 'password', 'pin'],
        SEARCHABLE: ['email'] // Deterministic encryption for search
    },

    // Encryption algorithms per category
    ENCRYPTION_ALGORITHMS: {
        PII: 'AES-256-GCM',           // Non-deterministic
        FINANCIAL: 'AES-256-GCM',     // Non-deterministic
        SENSITIVE: 'AES-256-GCM',     // Non-deterministic
        SEARCHABLE: 'AES-256-SIV'     // Deterministic (allows equality search)
    },

    // Key derivation info per category
    KEY_DERIVATION: {
        PII: 'pii_key_v1',
        FINANCIAL: 'financial_key_v1',
        SENSITIVE: 'sensitive_key_v1',
        SEARCHABLE: 'searchable_key_v1'
    },

    // Fields that should be tokenized instead of encrypted
    TOKENIZE_FIELDS: ['cardNumber', 'cvv', 'accountNumber'],

    // Key rotation schedule (days)
    KEY_ROTATION_DAYS: 90,

    // Current key version
    CURRENT_KEY_VERSION: 1,

    // Backward compatibility (support old key versions)
    SUPPORTED_KEY_VERSIONS: [1]
};

/**
 * Get encryption category for a field
 */
export const getFieldCategory = (fieldName) => {
    for (const [category, fields] of Object.entries(ENCRYPTION_CONFIG.FIELD_CATEGORIES)) {
        if (fields.includes(fieldName)) {
            return category;
        }
    }
    return null; // Field doesn't require encryption
};

/**
 * Check if field should be tokenized
 */
export const shouldTokenize = (fieldName) => {
    return ENCRYPTION_CONFIG.TOKENIZE_FIELDS.includes(fieldName);
};
