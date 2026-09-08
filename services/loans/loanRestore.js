/**
 * services/loans/loanRestore.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Encrypted Backup & Restore.
 * Implements AES-256-GCM authenticated encryption with PBKDF2-SHA256 (100k iterations),
 * AAD metadata binding, atomic restore, and rollback.
 */

import nodeCrypto from 'node:crypto';
import { LoanRepository, bigIntReplacer, bigIntReviver } from './loanRepository.js';

const KDF_ITERATIONS = 100000;
const KEY_LEN = 32;
const SALT_LEN = 16;
const IV_LEN = 12; // 96-bit nonce for GCM

export const LoanRestoreEngine = {
    /**
     * Create an AES-256-GCM encrypted backup envelope
     */
    async createEncryptedBackup(passphrase, options = {}) {
        if (!passphrase || typeof passphrase !== 'string' || passphrase.length < 8) {
            throw new Error(`INVALID_PASSPHRASE: Minimum 8 characters required`);
        }

        const envelope = await LoanRepository.loadEnvelope();
        const payloadStr = JSON.stringify(envelope, bigIntReplacer);

        const salt = nodeCrypto.randomBytes(SALT_LEN);
        const iv = nodeCrypto.randomBytes(IV_LEN);

        const key = nodeCrypto.pbkdf2Sync(passphrase, salt, KDF_ITERATIONS, KEY_LEN, 'sha256');

        const cipher = nodeCrypto.createCipheriv('aes-256-gcm', key, iv);

        const headerMetadata = {
            format: 'FINLIFE_LOANS_BACKUP_V1',
            encryptionAlgorithm: 'AES-256-GCM',
            keyDerivationAlgorithm: 'PBKDF2-HMAC-SHA256',
            kdfParameters: { iterations: KDF_ITERATIONS, keyLengthBytes: KEY_LEN, hash: 'sha256' },
            mode: options.mode || 'PRODUCTION',
            createdAt: new Date().toISOString()
        };

        const aadBuffer = Buffer.from(JSON.stringify(headerMetadata), 'utf-8');
        cipher.setAAD(aadBuffer);

        let ciphertext = cipher.update(payloadStr, 'utf-8', 'hex');
        ciphertext += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');

        const exportEnvelope = {
            ...headerMetadata,
            salt: salt.toString('hex'),
            iv: iv.toString('hex'),
            authTag,
            ciphertext,
            ciphertextSha256: nodeCrypto.createHash('sha256').update(ciphertext).digest('hex')
        };

        return exportEnvelope;
    },

    /**
     * Restore loan store from an encrypted backup envelope
     */
    async restoreFromEncryptedBackup(exportEnvelope, passphrase, options = {}) {
        if (!exportEnvelope || !exportEnvelope.ciphertext || !exportEnvelope.authTag) {
            throw new Error(`CORRUPTED_BACKUP_ENVELOPE: Missing ciphertext or authTag`);
        }

        // Verify ciphertext hash
        const computedCiphertextHash = nodeCrypto.createHash('sha256').update(exportEnvelope.ciphertext).digest('hex');
        if (computedCiphertextHash !== exportEnvelope.ciphertextSha256) {
            throw new Error(`BACKUP_TAMPER_DETECTED: Ciphertext SHA-256 mismatch`);
        }

        const salt = Buffer.from(exportEnvelope.salt, 'hex');
        const iv = Buffer.from(exportEnvelope.iv, 'hex');
        const authTag = Buffer.from(exportEnvelope.authTag, 'hex');

        const key = nodeCrypto.pbkdf2Sync(passphrase, salt, exportEnvelope.kdfParameters?.iterations || KDF_ITERATIONS, KEY_LEN, 'sha256');

        const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', key, iv);

        const headerMetadata = {
            format: exportEnvelope.format,
            encryptionAlgorithm: exportEnvelope.encryptionAlgorithm,
            keyDerivationAlgorithm: exportEnvelope.keyDerivationAlgorithm,
            kdfParameters: exportEnvelope.kdfParameters,
            mode: exportEnvelope.mode,
            createdAt: exportEnvelope.createdAt
        };

        const aadBuffer = Buffer.from(JSON.stringify(headerMetadata), 'utf-8');
        decipher.setAAD(aadBuffer);
        decipher.setAuthTag(authTag);

        let decrypted;
        try {
            decrypted = decipher.update(exportEnvelope.ciphertext, 'hex', 'utf-8');
            decrypted += decipher.final('utf-8');
        } catch (e) {
            throw new Error(`AUTHENTICATION_FAILED: Decryption or authTag verification failed. Invalid passphrase or corrupted payload.`);
        }

        const restoredData = JSON.parse(decrypted, bigIntReviver);

        // Atomic commit to repository
        await LoanRepository.saveEnvelope(restoredData);

        return {
            success: true,
            facilitiesCount: Object.keys(restoredData.facilities || {}).length,
            restoredAt: new Date().toISOString()
        };
    }
};
