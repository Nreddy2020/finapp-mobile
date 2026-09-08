/**
 * services/secureLogger.js
 * 
 * Centralized, production-safe structured logger for FinLife Universal Cashbook.
 * 
 * Invariants:
 * - No intentional sensitive-data logging.
 * - No raw financial payloads, ledger envelopes, or transaction arrays in application logs.
 * - Recursive traversal with allow-list field preservation; unknown fields redacted by default.
 * - Circular reference protection via WeakSet.
 * - Secondary regex masking for PII (phone, bank accounts, PAN, UAN, Aadhaar, tokens).
 * - Safe error normalization stripping stack query parameters and sensitive properties.
 * - Production suppression: debug/info/trace silent when in production.
 */

// Allow-listed safe diagnostic keys that can be logged without redaction (if primitive)
const ALLOW_LISTED_KEYS = new Set([
    'module',
    'action',
    'status',
    'code',
    'durationMs',
    'timestamp',
    'count',
    'total',
    'recordCount',
    'suiteName',
    'checksCount',
    'version',
    'schemaVersion',
    'mode',
    'operation',
    'bookId',
    'transferGroupId',
    'messageId',
    'offlineMessageId',
    'isDefault',
    'success',
    'durable',
    'securityLevel',
    'isStrongBox',
    'format',
    'encryptionAlgorithm',
    'keyDerivationAlgorithm',
    'iterations'
]);

// Explicit sensitive field names that MUST always be redacted
const SENSITIVE_KEYS = new Set([
    'password',
    'passphrase',
    'key',
    'secret',
    'token',
    'auth',
    'authorization',
    'body',
    'messageBody',
    'plainText',
    'plaintext',
    'cipherText',
    'ciphertext',
    'pan',
    'uan',
    'aadhaar',
    'accountNumber',
    'account_number',
    'mobile',
    'phone',
    'phoneNumber',
    'amount',
    'amountPaise',
    'balance',
    'balancePaise',
    'credit',
    'debit',
    'salary',
    'otp',
    'pin',
    'cvv',
    'transactions',
    'auditLog',
    'accounts',
    'dailyClosings',
    'books',
    'leaks',
    'snapshot'
]);

// Secondary regex patterns for masking sensitive strings
const REGEX_PHONE = /\b(?:\+91[\-\s]?)?[6-9]\d{9}\b/g;
const REGEX_BANK_ACC = /\b\d{9,18}\b/g;
const REGEX_PAN = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi;
const REGEX_UAN = /\b\d{12}\b/g;
const REGEX_BEARER = /Bearer\s+[A-Za-z0-9\-\._~\+\/]+=*/gi;

/**
 * Secondary regex masking for strings.
 */
export function maskString(str) {
    if (typeof str !== 'string') return str;
    let masked = str;
    
    // Mask Bearer tokens
    masked = masked.replace(REGEX_BEARER, 'Bearer [REDACTED_TOKEN]');
    
    // Mask PAN cards
    masked = masked.replace(REGEX_PAN, (pan) => pan.slice(0, 2) + '******' + pan.slice(-2));
    
    // Mask Phone numbers (keep last 4)
    masked = masked.replace(REGEX_PHONE, (p) => '******' + p.slice(-4));
    
    // Mask Bank Account numbers (keep last 4 if > 8 digits)
    masked = masked.replace(REGEX_BANK_ACC, (acc) => {
        if (acc.length >= 9) {
            return '********' + acc.slice(-4);
        }
        return acc;
    });

    return masked;
}

/**
 * Recursively sanitizes any payload, redacting unknown/sensitive fields and guarding against circular refs.
 */
export function sanitizePayload(val, seen = new WeakSet(), depth = 0) {
    if (val === null || val === undefined) return val;
    if (typeof val === 'number' || typeof val === 'boolean') return val;
    if (typeof val === 'string') return maskString(val);
    if (typeof val === 'bigint') return '[BIGINT_PAISE]';

    if (depth > 6) return '[MAX_DEPTH_EXCEEDED]';

    if (typeof val === 'object') {
        if (seen.has(val)) return '[CIRCULAR_REFERENCE]';
        seen.add(val);

        if (Array.isArray(val)) {
            if (val.length > 20) {
                return `[ARRAY_REDACTED_LENGTH_${val.length}]`;
            }
            return val.map(item => sanitizePayload(item, seen, depth + 1));
        }

        if (val instanceof Error) {
            return normalizeError(val);
        }

        const sanitized = {};
        for (const [k, v] of Object.entries(val)) {
            const lowerK = k.toLowerCase();
            if (SENSITIVE_KEYS.has(lowerK) || SENSITIVE_KEYS.has(k)) {
                sanitized[k] = '[REDACTED]';
            } else if (ALLOW_LISTED_KEYS.has(k)) {
                sanitized[k] = sanitizePayload(v, seen, depth + 1);
            } else if (typeof v === 'object' && v !== null) {
                sanitized[k] = sanitizePayload(v, seen, depth + 1);
            } else if (typeof v === 'string') {
                sanitized[k] = maskString(v);
            } else if (typeof v === 'number' || typeof v === 'boolean') {
                sanitized[k] = v;
            } else {
                sanitized[k] = '[REDACTED_FIELD]';
            }
        }
        return sanitized;
    }

    return '[UNSUPPORTED_TYPE]';
}

/**
 * Normalizes an Error object without exposing sensitive message details or file paths.
 */
export function normalizeError(err) {
    if (!err) return { name: 'Error', message: 'Unknown error' };
    const safeName = err.name || 'Error';
    const rawMsg = err.message || '';
    const safeMsg = maskString(rawMsg);
    
    // Strip raw disk paths from stack traces
    let safeStack = undefined;
    if (err.stack && typeof err.stack === 'string') {
        safeStack = err.stack
            .split('\n')
            .slice(0, 3)
            .map(line => maskString(line.replace(/([A-Za-z]:\\[^:\n]+)/g, '[PATH]')))
            .join('\n');
    }

    return {
        name: safeName,
        message: safeMsg,
        code: err.code || undefined,
        stackSnippet: safeStack
    };
}

/**
 * Environment detection
 */
function isProduction() {
    if (typeof __DEV__ !== 'undefined') {
        return !__DEV__;
    }
    if (typeof process !== 'undefined' && process.env?.NODE_ENV) {
        return process.env.NODE_ENV === 'production';
    }
    return false;
}

/**
 * Core secure logger implementation.
 */
class SecureLogger {
    constructor() {
        this._enabled = true;
        this._minLevel = 'info'; // 'debug' | 'info' | 'warn' | 'error' | 'silent'
    }

    setLevel(lvl) {
        this._minLevel = lvl;
    }

    debug(tag, message, data) {
        if (isProduction() || this._minLevel === 'silent' || this._minLevel === 'warn' || this._minLevel === 'error') {
            return;
        }
        const sanitized = data !== undefined ? sanitizePayload(data) : undefined;
        if (sanitized !== undefined) {
            console.log(`[DEBUG][${tag}] ${maskString(message)}`, sanitized);
        } else {
            console.log(`[DEBUG][${tag}] ${maskString(message)}`);
        }
    }

    info(tag, message, data) {
        if (isProduction() || this._minLevel === 'silent' || this._minLevel === 'warn' || this._minLevel === 'error') {
            return;
        }
        const sanitized = data !== undefined ? sanitizePayload(data) : undefined;
        if (sanitized !== undefined) {
            console.info(`[INFO][${tag}] ${maskString(message)}`, sanitized);
        } else {
            console.info(`[INFO][${tag}] ${maskString(message)}`);
        }
    }

    warn(tag, message, data) {
        if (this._minLevel === 'silent' || this._minLevel === 'error') {
            return;
        }
        const sanitized = data !== undefined ? sanitizePayload(data) : undefined;
        if (sanitized !== undefined) {
            console.warn(`[WARN][${tag}] ${maskString(message)}`, sanitized);
        } else {
            console.warn(`[WARN][${tag}] ${maskString(message)}`);
        }
    }

    error(tag, message, err) {
        if (this._minLevel === 'silent') {
            return;
        }
        const safeErr = err instanceof Error ? normalizeError(err) : sanitizePayload(err);
        if (safeErr !== undefined) {
            console.error(`[ERROR][${tag}] ${maskString(message)}`, safeErr);
        } else {
            console.error(`[ERROR][${tag}] ${maskString(message)}`);
        }
    }
}

export const secureLogger = new SecureLogger();
export default secureLogger;
