/**
 * services/cashbook/cashbookRestore.js
 * 
 * Gate 7: Authoritative Backup Export, Authenticated Encryption,
 * Staged Restore Pipeline, and Disaster Recovery Engine for FinLife Cashbook Ledger.
 * 
 * Invariants & Architectural Contracts:
 * - Multi-book V2 Backup Envelope (FINLIFE_CASHBOOK_BACKUP_V2) capturing all 5 core books,
 *   accounts, transactions, daily closings, audit log, and migration manifests.
 * - Authenticated Encrypted Backup (FINLIFE_CASHBOOK_ENCRYPTED_BACKUP_V1) using AES-256-GCM
 *   with PBKDF2-SHA256 key derivation (100,000 iterations), 96-bit random nonce, 128-bit
 *   authentication tag, and Associated Authenticated Data (AAD) binding header metadata.
 * - Authoritative canonical serialization (lexicographical keys, deterministic array sorts,
 *   exact BigInt integer paise, UTF-8, SHA-256).
 * - Staged restore pipeline: Read -> Parse -> Format Check -> Mode/Namespace Check ->
 *   Authenticate/Decrypt -> Payload Checksum -> Schema/Domain Validation -> Audit Chain ->
 *   Genesis Recomputation -> Pre-restore Snapshot -> Commit -> Post-verify -> Event Logging.
 * - Strict Cross-Mode Isolation: DEMO mock facts strictly rejected from PRODUCTION restore.
 * - Idempotency & Conflict Policy: Deterministic restore identity; identical repeat restore
 *   is a clean no-op; same backupId with divergent payload hash triggers RESTORE_CONFLICT.
 * - Atomic Pre-Restore Snapshot & Rollback: Automatic deterministic recovery from interrupted restores.
 * - Backward Compatibility: FINLIFE_CASHBOOK_BACKUP_V1 seamlessly upgraded with provenance.
 * - Simulated uninstall and cold-restore continuity validation.
 */

import {
    CashbookAppMode,
    CashbookType,
    BackupFormat,
    BackupStatus,
    createCashbook,
    canonicalJsonStringify,
    createBackupManifest,
    paiseToBigInt
} from './cashbookContracts.js';
import { CashbookRepository } from './cashbookRepository.js';
import {
    verifyAuditTrail,
    createAuditEvent,
    AuditEventType,
    AuditActor,
    AuditSource,
    sha256,
    GENESIS_PREVIOUS_HASH
} from './cashbookAuditTrail.js';
import { recomputeFromGenesis } from './cashbookEngine.js';
import { validateTransferPairContinuity, validateTransaction } from './cashbookValidator.js';
import { StorageService } from '../storage.js';

// Format Identifiers
export const BACKUP_FORMAT_IDENTIFIER_V1 = 'FINLIFE_CASHBOOK_BACKUP_V1';
export const BACKUP_FORMAT_IDENTIFIER_V2 = 'FINLIFE_CASHBOOK_BACKUP_V2';
export const BACKUP_FORMAT_IDENTIFIER_ENCRYPTED_V1 = 'FINLIFE_CASHBOOK_ENCRYPTED_BACKUP_V1';

// Backwards-compatibility aliases for Suite #9
export const BACKUP_FORMAT_IDENTIFIER = BACKUP_FORMAT_IDENTIFIER_V1;
export const BACKUP_SCHEMA_VERSION = 1;
export const BACKUP_SCHEMA_VERSION_V2 = 2;

// Storage Keys
export const STORAGE_KEY_RESTORE_LOCK_PREFIX = 'FINLIFE_CASHBOOK_RESTORE_LOCK_';
export const STORAGE_KEY_RESTORE_WAL_PREFIX = 'FINLIFE_CASHBOOK_RESTORE_WAL_';
export const STORAGE_KEY_PRE_RESTORE_SNAPSHOT_PREFIX = 'FINLIFE_CASHBOOK_PRE_RESTORE_SNAPSHOT_';

import nodeCrypto from 'node:crypto';

/**
 * Generates cryptographically secure random bytes as a Hex string.
 */
function getRandomBytesHex(length) {
    return nodeCrypto.randomBytes(length).toString('hex');
}

/**
 * Synchronously derives a 256-bit key from passphrase and salt using PBKDF2-SHA256 (100,000 iterations).
 */
function deriveEncryptionKey(passphrase, saltHex, iterations = 100000) {
    if (!passphrase || typeof passphrase !== 'string' || passphrase.length < 8) {
        throw new Error('INVALID_PASSPHRASE: Passphrase must be a string with a minimum length of 8 characters');
    }
    const saltBuf = Buffer.from(saltHex, 'hex');
    return nodeCrypto.pbkdf2Sync(passphrase, saltBuf, iterations, 32, 'sha256');
}

/**
 * Synchronously encrypts plaintext string using AES-256-GCM with associated authenticated data (AAD).
 */
function encryptAesGcm(plainText, keyBuffer, nonceHex, aadString) {
    const nonce = Buffer.from(nonceHex, 'hex');
    const cipher = nodeCrypto.createCipheriv('aes-256-gcm', keyBuffer, nonce);
    if (aadString) {
        cipher.setAAD(Buffer.from(aadString, 'utf8'));
    }
    let ciphertext = cipher.update(plainText, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return {
        ciphertext,
        authTag: tag.toString('hex')
    };
}

/**
 * Synchronously decrypts AES-256-GCM ciphertext verifying authentication tag and AAD.
 * Fails closed on wrong password or any tampering.
 */
function decryptAesGcm(ciphertextHex, keyBuffer, nonceHex, authTagHex, aadString) {
    try {
        const nonce = Buffer.from(nonceHex, 'hex');
        const tag = Buffer.from(authTagHex, 'hex');
        const decipher = nodeCrypto.createDecipheriv('aes-256-gcm', keyBuffer, nonce);
        decipher.setAuthTag(tag);
        if (aadString) {
            decipher.setAAD(Buffer.from(aadString, 'utf8'));
        }
        let plaintext = decipher.update(ciphertextHex, 'hex', 'utf8');
        plaintext += decipher.final('utf8');
        return plaintext;
    } catch {
        throw new Error('DECRYPTION_FAILED: Invalid passphrase or corrupted/tampered encrypted backup');
    }
}

/**
 * Computes canonical checksum of a legacy V1 backup payload.
 */
export function computeBackupChecksum(payload) {
    const preimage = {
        format: payload.format,
        schemaVersion: payload.schemaVersion,
        mode: payload.mode,
        accounts: payload.accounts,
        transactions: payload.transactions,
        auditLog: payload.auditLog
    };
    return sha256(canonicalJsonStringify(preimage));
}

/**
 * Computes canonical checksum of an authoritative multi-book V2 backup payload.
 * Guarantees deterministic key and array ordering with zero float representation.
 */
export function computeBackupV2Checksum(payload) {
    const sortedBooks = [...(payload.books || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const sortedAccounts = [...(payload.accounts || [])].sort((a, b) => String(a.id).localeCompare(String(b.id)));
    const sortedTransactions = [...(payload.transactions || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.id).localeCompare(String(b.id)));
    const sortedDailyClosings = [...(payload.dailyClosings || [])].sort((a, b) => (a.date || '').localeCompare(b.date || '') || String(a.id).localeCompare(String(b.id)));
    const sortedAuditLog = [...(payload.auditLog || [])].sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0));
    const sortedManifests = [...(payload.migrationManifests || [])].sort((a, b) => String(a.migrationId).localeCompare(String(b.migrationId)));

    const preimage = {
        format: payload.format,
        schemaVersion: payload.schemaVersion,
        mode: payload.mode,
        books: sortedBooks,
        activeBookId: payload.activeBookId || null,
        accounts: sortedAccounts,
        transactions: sortedTransactions,
        dailyClosings: sortedDailyClosings,
        auditLog: sortedAuditLog,
        migrationManifests: sortedManifests,
        metadata: payload.metadata || null
    };
    return sha256(canonicalJsonStringify(preimage));
}

export const CashbookRestore = {
    /**
     * Exports a complete, tamper-verifiable multi-book V2 ledger backup.
     * Enforces consistency under concurrent operations by validating repository lock state.
     */
    exportLedgerBackup: async (options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        
        // Ensure no active WAL transaction or migration lock
        const lockKey = `${STORAGE_KEY_RESTORE_LOCK_PREFIX}${mode}`;
        const isLocked = await StorageService.load(lockKey);
        if (isLocked) {
            throw new Error(`EXPORT_LOCK_VIOLATION: Cannot export backup while another operation is in progress for ${mode}`);
        }

        const envelope = await CashbookRepository.load({ mode });

        if (envelope.preparedOperation && envelope.preparedOperation.state) {
            throw new Error('EXPORT_CONSISTENCY_ERROR: Active WAL transaction in progress. Export aborted to maintain consistency.');
        }

        const genesisHash = envelope.auditLog.length > 0 ? envelope.auditLog[0].eventHash : null;
        const auditTailHash = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1].eventHash : null;

        // Ensure default books if missing
        const books = envelope.books && envelope.books.length > 0 ? envelope.books : [
            createCashbook({
                id: 'book_personal_savings',
                name: 'Personal Savings',
                type: CashbookType.SAVINGS,
                description: 'Primary Personal & Household Ledger',
                isDefault: true
            })
        ];

        const schemaVersion = options.schemaVersion === 2 ? BACKUP_SCHEMA_VERSION_V2 : BACKUP_SCHEMA_VERSION;
        const format = options.schemaVersion === 2 ? BACKUP_FORMAT_IDENTIFIER_V2 : BACKUP_FORMAT_IDENTIFIER_V1;

        if (schemaVersion === 1) {
            // Legacy V1 backup export for backward compatibility
            const backupPayload = {
                format: BACKUP_FORMAT_IDENTIFIER_V1,
                schemaVersion: 1,
                mode,
                exportedAt: new Date().toISOString(),
                genesisHash,
                auditTailHash,
                accounts: envelope.accounts,
                transactions: envelope.transactions,
                auditLog: envelope.auditLog,
                checksum: ''
            };
            backupPayload.checksum = computeBackupChecksum(backupPayload);
            return backupPayload;
        }

        // Authoritative V2 Multi-Book Backup Export
        const backupId = `bkp_${Date.now()}_${getRandomBytesHex(4)}`;
        const backupPayload = {
            format: BACKUP_FORMAT_IDENTIFIER_V2,
            schemaVersion: BACKUP_SCHEMA_VERSION_V2,
            mode,
            exportedAt: new Date().toISOString(),
            genesisHash,
            auditTailHash,
            activeBookId: envelope.activeBookId || books[0].id,
            books,
            accounts: envelope.accounts || [],
            transactions: envelope.transactions || [],
            dailyClosings: envelope.dailyClosings || [],
            auditLog: envelope.auditLog || [],
            migrationManifests: envelope.migrationManifests || [],
            metadata: {
                appVersion: '3.0.0',
                platform: typeof process !== 'undefined' ? process.platform : 'mobile',
                generator: 'FinLife Cashbook Engine V3'
            },
            manifest: null,
            checksum: ''
        };

        const payloadHash = computeBackupV2Checksum(backupPayload);
        backupPayload.checksum = payloadHash;

        const manifest = createBackupManifest({
            backupId,
            format: BACKUP_FORMAT_IDENTIFIER_V2,
            schemaVersion: BACKUP_SCHEMA_VERSION_V2,
            mode,
            createdAt: backupPayload.exportedAt,
            sourceEnvelopeHash: envelope.checksum || null,
            payloadHash,
            recordCounts: {
                books: backupPayload.books.length,
                accounts: backupPayload.accounts.length,
                transactions: backupPayload.transactions.length,
                dailyClosings: backupPayload.dailyClosings.length,
                auditEvents: backupPayload.auditLog.length,
                migrationManifests: backupPayload.migrationManifests.length
            },
            bookIds: backupPayload.books.map(b => b.id),
            auditChainHead: auditTailHash,
            migrationManifestIds: backupPayload.migrationManifests.map(m => m.migrationId)
        });

        backupPayload.manifest = manifest;
        return backupPayload;
    },

    /**
     * Exports a password-protected, authenticated AES-256-GCM encrypted backup archive.
     */
    exportEncryptedLedgerBackup: async (passphrase, options = {}) => {
        if (!passphrase || typeof passphrase !== 'string' || passphrase.length < 8) {
            throw new Error('INVALID_PASSPHRASE: Passphrase must be a string with a minimum length of 8 characters');
        }

        const unencryptedBackup = await CashbookRestore.exportLedgerBackup({
            ...options,
            schemaVersion: BACKUP_SCHEMA_VERSION_V2
        });

        const saltHex = getRandomBytesHex(16);
        const nonceHex = getRandomBytesHex(12); // 96-bit nonce
        const keyBuffer = await deriveEncryptionKey(passphrase, saltHex, 100000);

        const manifestHash = sha256(canonicalJsonStringify(unencryptedBackup.manifest));
        const createdAt = new Date().toISOString();

        const aadObject = {
            format: BACKUP_FORMAT_IDENTIFIER_ENCRYPTED_V1,
            encryptionAlgorithm: 'AES-256-GCM',
            keyDerivationAlgorithm: 'PBKDF2-SHA256',
            mode: unencryptedBackup.mode,
            createdAt,
            sourceBackupManifestHash: manifestHash,
            salt: saltHex,
            nonceOrIv: nonceHex
        };
        const aadString = canonicalJsonStringify(aadObject);

        const plaintextJson = canonicalJsonStringify(unencryptedBackup);
        const { ciphertext, authTag } = encryptAesGcm(plaintextJson, keyBuffer, nonceHex, aadString);

        if (keyBuffer && keyBuffer.fill) keyBuffer.fill(0);

        const ciphertextHash = sha256(ciphertext);

        return {
            format: BACKUP_FORMAT_IDENTIFIER_ENCRYPTED_V1,
            schemaVersion: BACKUP_SCHEMA_VERSION_V2,
            encryptionAlgorithm: 'AES-256-GCM',
            keyDerivationAlgorithm: 'PBKDF2-SHA256',
            kdfParameters: {
                iterations: 100000,
                keyLength: 32,
                digest: 'sha256'
            },
            salt: saltHex,
            nonceOrIv: nonceHex,
            ciphertext,
            authenticationTag: authTag,
            ciphertextHash,
            createdAt,
            mode: unencryptedBackup.mode,
            sourceBackupManifestHash: manifestHash,
            authenticatedData: typeof Buffer !== 'undefined' ? Buffer.from(aadString, 'utf8').toString('base64') : btoa(aadString)
        };
    },

    /**
     * Staged verification pipeline for backup envelopes.
     * Validates format, mode, authentication, schema, domain invariants, audit chain, and genesis.
     */
    verifyBackup: (backupData, options = {}) => {
        if (!backupData || typeof backupData !== 'object') {
            throw new Error('Invalid backup payload: Must be a non-null object');
        }

        let workingPayload = backupData;

        // Stage 1: Authenticate & Decrypt if encrypted envelope
        if (backupData.format === BACKUP_FORMAT_IDENTIFIER_ENCRYPTED_V1) {
            if (!options.passphrase) {
                throw new Error('ENCRYPTED_BACKUP_REQUIRES_PASSPHRASE: Decryption passphrase is required to verify or restore an encrypted backup.');
            }
            if (backupData.encryptionAlgorithm !== 'AES-256-GCM') {
                throw new Error(`UNSUPPORTED_ENCRYPTION_ALGORITHM: ${backupData.encryptionAlgorithm}`);
            }
            if (backupData.keyDerivationAlgorithm !== 'PBKDF2-SHA256') {
                throw new Error(`UNSUPPORTED_KDF_ALGORITHM: ${backupData.keyDerivationAlgorithm}`);
            }
            // Check ciphertext hash integrity
            const expectedCtHash = sha256(backupData.ciphertext);
            if (backupData.ciphertextHash !== expectedCtHash) {
                throw new Error('DECRYPTION_FAILED: Invalid passphrase or corrupted/tampered encrypted backup');
            }

            const keyBuffer = deriveEncryptionKey(
                options.passphrase,
                backupData.salt,
                backupData.kdfParameters?.iterations || 100000
            );

            let aadString;
            if (backupData.authenticatedData) {
                aadString = typeof Buffer !== 'undefined'
                    ? Buffer.from(backupData.authenticatedData, 'base64').toString('utf8')
                    : atob(backupData.authenticatedData);
                try {
                    const aadObj = JSON.parse(aadString);
                    if (aadObj.mode !== backupData.mode ||
                        aadObj.sourceBackupManifestHash !== backupData.sourceBackupManifestHash ||
                        aadObj.salt !== backupData.salt ||
                        aadObj.nonceOrIv !== backupData.nonceOrIv) {
                        throw new Error('DECRYPTION_FAILED');
                    }
                } catch {
                    throw new Error('DECRYPTION_FAILED: Invalid passphrase or corrupted/tampered encrypted backup');
                }
            } else {
                aadString = canonicalJsonStringify({
                    format: backupData.format,
                    encryptionAlgorithm: backupData.encryptionAlgorithm,
                    keyDerivationAlgorithm: backupData.keyDerivationAlgorithm,
                    mode: backupData.mode,
                    createdAt: backupData.createdAt,
                    sourceBackupManifestHash: backupData.sourceBackupManifestHash,
                    salt: backupData.salt,
                    nonceOrIv: backupData.nonceOrIv
                });
            }

            const plaintext = decryptAesGcm(
                backupData.ciphertext,
                keyBuffer,
                backupData.nonceOrIv,
                backupData.authenticationTag,
                aadString
            );

            if (keyBuffer && keyBuffer.fill) keyBuffer.fill(0);

            try {
                workingPayload = JSON.parse(plaintext);
            } catch {
                throw new Error('DECRYPTION_FAILED: Invalid passphrase or corrupted/tampered encrypted backup');
            }
        }

        // Stage 2: Format and Version Check
        const validFormats = [BACKUP_FORMAT_IDENTIFIER_V1, BACKUP_FORMAT_IDENTIFIER_V2];
        if (!validFormats.includes(workingPayload.format)) {
            throw new Error(`INCOMPATIBLE_BACKUP_FORMAT: Expected one of [${validFormats.join(', ')}], got "${workingPayload.format}"`);
        }

        if (workingPayload.schemaVersion > BACKUP_SCHEMA_VERSION_V2) {
            throw new Error(`INCOMPATIBLE_SCHEMA_VERSION: Backup schema version ${workingPayload.schemaVersion} is not supported. Current version: ${BACKUP_SCHEMA_VERSION_V2}`);
        }

        // Stage 3: Mode and Namespace Validation
        if (!workingPayload.mode || !Object.values(CashbookAppMode).includes(workingPayload.mode)) {
            throw new Error(`INVALID_BACKUP_MODE: Unknown or missing mode "${workingPayload.mode}" in backup`);
        }

        if (options.mode && workingPayload.mode !== options.mode && options.forceCrossMode !== true) {
            throw new Error(`MODE_ISOLATION_VIOLATION: Cannot restore ${workingPayload.mode} backup into ${options.mode} ledger without explicit authorization.`);
        }

        // Stage 4: Checksum Verification
        if (workingPayload.schemaVersion === 1) {
            const expectedV1 = computeBackupChecksum(workingPayload);
            if (workingPayload.checksum !== expectedV1) {
                throw new Error(`BACKUP_CHECKSUM_MISMATCH: Computed checksum "${expectedV1}" does not match header checksum "${workingPayload.checksum}". Backup has been tampered with or corrupted.`);
            }
        } else {
            const expectedV2 = computeBackupV2Checksum(workingPayload);
            if (workingPayload.checksum !== expectedV2) {
                throw new Error(`BACKUP_CHECKSUM_MISMATCH: Computed checksum "${expectedV2}" does not match header checksum "${workingPayload.checksum}". Backup has been tampered with or corrupted.`);
            }
        }

        // Stage 5: Domain Invariants & Duplicate Check
        const accounts = workingPayload.accounts || [];
        const transactions = workingPayload.transactions || [];
        const books = workingPayload.books || [];
        const dailyClosings = workingPayload.dailyClosings || [];
        const auditLog = workingPayload.auditLog || [];

        // Check duplicate IDs
        const bookIdSet = new Set();
        for (const b of books) {
            if (bookIdSet.has(b.id)) {
                throw new Error(`CORRUPT_BACKUP_DATA: Duplicate book ID detected: "${b.id}"`);
            }
            bookIdSet.add(b.id);
        }

        const accountIdSet = new Set();
        for (const a of accounts) {
            if (accountIdSet.has(a.id)) {
                throw new Error(`CORRUPT_BACKUP_DATA: Duplicate account ID detected: "${a.id}"`);
            }
            accountIdSet.add(a.id);
        }

        const txnIdSet = new Set();
        for (const t of transactions) {
            if (txnIdSet.has(t.id)) {
                throw new Error(`CORRUPT_BACKUP_DATA: Duplicate transaction ID detected: "${t.id}"`);
            }
            txnIdSet.add(t.id);

            // BigInt integer paise check
            if (!t.amount || typeof t.amount.paise !== 'string' || !/^\d+$/.test(t.amount.paise)) {
                throw new Error(`INVALID_BIGINT_PAISE: Transaction "${t.id}" has invalid paise: ${t.amount?.paise}`);
            }
        }

        // Stage 6: Transfer Pair Continuity
        validateTransferPairContinuity(transactions);

        // Stage 7: Audit Trail Verification
        const auditCheck = verifyAuditTrail(auditLog);
        if (!auditCheck.isValid) {
            throw new Error(`BACKUP_AUDIT_CORRUPTION: ${auditCheck.reason}`);
        }

        // Genesis hash consistency
        if (auditLog.length > 0) {
            if (auditLog[0].previousHash !== GENESIS_PREVIOUS_HASH) {
                throw new Error(`BACKUP_AUDIT_CORRUPTION: Genesis event has invalid previousHash "${auditLog[0].previousHash}"`);
            }
        }

        // Stage 8: Genesis Recomputation
        const genesisCheck = recomputeFromGenesis(accounts, transactions);
        if (!genesisCheck.isValid) {
            const firstAnomaly = genesisCheck.anomalies[0];
            throw new Error(`BACKUP_GENESIS_RECOMPUTATION_FAILED: ${firstAnomaly.code} - ${firstAnomaly.message}`);
        }

        // Stage 9: Upgrade V1 if required
        let upgradedBooks = books;
        let activeBookId = workingPayload.activeBookId || null;
        let status = BackupStatus.VALID;

        if (workingPayload.schemaVersion === 1) {
            status = BackupStatus.UPGRADED_FROM_V1;
            const defaultBook = createCashbook({
                id: 'book_personal_savings',
                name: 'Personal Savings',
                type: CashbookType.SAVINGS,
                description: 'Primary Personal & Household Ledger',
                isDefault: true
            });
            upgradedBooks = [defaultBook];
            activeBookId = defaultBook.id;
        }

        return {
            isValid: true,
            status,
            mode: workingPayload.mode,
            format: workingPayload.format,
            schemaVersion: workingPayload.schemaVersion,
            books: upgradedBooks,
            activeBookId,
            accounts,
            transactions,
            dailyClosings,
            auditLog,
            migrationManifests: workingPayload.migrationManifests || [],
            metadata: workingPayload.metadata || null,
            manifest: workingPayload.manifest || null,
            accountBalances: genesisCheck.balances,
            checksum: workingPayload.checksum
        };
    },

    /**
     * Staged execution restore pipeline.
     * Takes pre-restore snapshot, locks, writes WAL, commits, validates, and records restore audit.
     */
    restoreLedgerBackup: async (backupData, options = {}) => {
        const targetMode = options.mode || await CashbookRepository.getMode();

        // Security check: unconditionally reject fault injection in production builds
        if (options._faultInjection) {
            const isProductionBuild = (typeof __DEV__ !== 'undefined' && !__DEV__) || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production');
            if (isProductionBuild) {
                throw new Error('FAULT_INJECTION_REJECTED: Fault injection is unconditionally disabled in production builds.');
            }
            if (!options.__testRunnerHarness) {
                throw new Error('FAULT_INJECTION_REJECTED: Fault injection requires explicit test harness activation.');
            }
        }

        // Concurrency Lock Check
        const lockKey = `${STORAGE_KEY_RESTORE_LOCK_PREFIX}${targetMode}`;
        const isLocked = await StorageService.load(lockKey);
        if (isLocked) {
            throw new Error(`RESTORE_IN_PROGRESS: Another restore operation is currently in progress for ${targetMode}`);
        }

        // Acquire restore lock
        await StorageService.save(lockKey, { lockedAt: new Date().toISOString(), targetMode });

        try {
            // Stage 1-9: Complete Verification Pipeline
            const verification = await CashbookRestore.verifyBackup(backupData, {
                ...options,
                mode: targetMode
            });

            // Dry-run mode: Return preview with 0 persistent mutations
            if (options.dryRun === true) {
                await StorageService.delete(lockKey);
                return {
                    success: true,
                    dryRun: true,
                    status: verification.status,
                    mode: targetMode,
                    restoredAccounts: verification.accounts.length,
                    restoredTransactions: verification.transactions.length,
                    restoredBooks: verification.books.length,
                    restoredAuditEvents: verification.auditLog.length,
                    balances: verification.accountBalances,
                    message: 'Dry run completed successfully with 0 persistent mutations'
                };
            }

            // Idempotency Identity
            const restoreIdentity = sha256(
                String(verification.manifest?.backupId || verification.checksum) +
                ':' + verification.checksum +
                ':' + targetMode
            );

            // Check current envelope
            const currentEnvelope = await CashbookRepository.load({ mode: targetMode });

            // Detect identical re-run idempotency (replacement restore only)
            if (!options.appendToExistingLedger && currentEnvelope.lastRestoreIdentity === restoreIdentity) {
                await StorageService.delete(lockKey);
                return {
                    success: true,
                    status: BackupStatus.RESTORE_IDEMPOTENT,
                    mode: targetMode,
                    restoreIdentity,
                    restoredAccounts: currentEnvelope.accounts.length,
                    restoredTransactions: currentEnvelope.transactions.length,
                    restoredBooks: (currentEnvelope.books || []).length,
                    restoredAuditEvents: currentEnvelope.auditLog.length,
                    balances: verification.accountBalances,
                    message: 'Backup has already been restored identically with zero data duplication'
                };
            }

            // Conflict Check: Same backupId with divergent payload hash
            if (currentEnvelope.lastRestoreBackupId && 
                verification.manifest?.backupId && 
                currentEnvelope.lastRestoreBackupId === verification.manifest.backupId &&
                currentEnvelope.lastRestoreIdentity !== restoreIdentity) {
                throw new Error('RESTORE_CONFLICT: Backup ID matches previously restored backup but payload hash differs.');
            }

            // Create Pre-Restore Atomic Snapshot
            const timestamp = Date.now();
            const snapshotKey = `${STORAGE_KEY_PRE_RESTORE_SNAPSHOT_PREFIX}${targetMode}_${timestamp}`;
            const snapshotPayload = {
                snapshotKey,
                createdAt: new Date().toISOString(),
                mode: targetMode,
                envelope: currentEnvelope,
                snapshotChecksum: sha256(canonicalJsonStringify(currentEnvelope))
            };
            await StorageService.save(snapshotKey, snapshotPayload);

            // Record Restore WAL / Intent
            const walKey = `${STORAGE_KEY_RESTORE_WAL_PREFIX}${targetMode}`;
            await StorageService.save(walKey, {
                state: 'PREPARED',
                restoreIdentity,
                snapshotKey,
                targetMode,
                timestamp: new Date().toISOString()
            });

            // Simulated crash injection for interrupted restore testing
            if (options._faultInjection === 'BEFORE_COMMIT') {
                throw new Error('FAULT_INJECTED: Simulated crash before restore commit');
            }

            // Prepare Restored Envelope
            const storageKey = CashbookRepository._getStorageKey(targetMode);
            const genesisRootKey = CashbookRepository._getGenesisRootKey(targetMode);

            let finalAuditLog = verification.auditLog;

            // Audit Trail Semantics:
            // If appendToExistingLedger is requested (merge), append BACKUP_RESTORED event
            if (options.appendToExistingLedger === true && currentEnvelope.auditLog.length > 0) {
                const lastEvent = currentEnvelope.auditLog[currentEnvelope.auditLog.length - 1];
                const restoreEvent = createAuditEvent({
                    lastEvent,
                    eventType: AuditEventType.BACKUP_RESTORED,
                    entityId: verification.manifest?.backupId || `rst_${timestamp}`,
                    payload: {
                        backupId: verification.manifest?.backupId || null,
                        sourceBackupHash: verification.checksum,
                        sourceChainHead: verification.auditLog.length > 0 ? verification.auditLog[verification.auditLog.length - 1].eventHash : null,
                        targetChainHeadBeforeRestore: lastEvent.eventHash,
                        restoreIdentity,
                        mode: targetMode,
                        timestamp: new Date().toISOString()
                    },
                    actor: AuditActor.RESTORE,
                    source: AuditSource.SYSTEM
                });
                finalAuditLog = [...currentEnvelope.auditLog, restoreEvent];
            }

            const envelope = {
                version: BACKUP_SCHEMA_VERSION_V2,
                books: verification.books,
                activeBookId: verification.activeBookId || verification.books[0]?.id || 'book_personal_savings',
                accounts: verification.accounts,
                transactions: verification.transactions,
                dailyClosings: verification.dailyClosings,
                auditLog: finalAuditLog,
                migrationManifests: verification.migrationManifests,
                preparedOperation: null,
                lastReconciledAt: new Date().toISOString(),
                lastRestoreIdentity: restoreIdentity,
                lastRestoreBackupId: verification.manifest?.backupId || null,
                checksum: ''
            };

            // Compute envelope checksum
            const preimage = {
                version: envelope.version,
                accounts: envelope.accounts,
                transactions: envelope.transactions,
                auditLog: envelope.auditLog,
                preparedOperation: envelope.preparedOperation,
                books: envelope.books,
                activeBookId: envelope.activeBookId,
                dailyClosings: envelope.dailyClosings
            };
            envelope.checksum = sha256(canonicalJsonStringify(preimage));

            // Commit restored envelope and pin restored genesis hash
            await StorageService.save(storageKey, envelope);
            if (envelope.auditLog.length > 0) {
                await StorageService.save(genesisRootKey, envelope.auditLog[0].eventHash);
            }

            // Simulated crash injection for interrupted post-commit testing
            if (options._faultInjection === 'AFTER_COMMIT_BEFORE_CLEAR_WAL') {
                throw new Error('FAULT_INJECTED: Simulated crash after commit before clearing WAL');
            }

            // Verify committed state
            const committed = await StorageService.load(storageKey);
            if (!committed || committed.checksum !== envelope.checksum) {
                throw new Error('RESTORE_COMMIT_VERIFICATION_FAILED: Committed ledger checksum does not match expected state.');
            }

            // Clear WAL and Lock
            await StorageService.delete(walKey);
            await StorageService.delete(lockKey);

            return {
                success: true,
                status: verification.status,
                mode: targetMode,
                restoreIdentity,
                restoredAccounts: envelope.accounts.length,
                restoredTransactions: envelope.transactions.length,
                restoredBooks: envelope.books.length,
                restoredAuditEvents: envelope.auditLog.length,
                balances: verification.accountBalances
            };
        } catch (error) {
            // Ensure lock is released on error unless fault injected
            if (!options._faultInjection) {
                await StorageService.delete(lockKey);
            }
            throw error;
        }
    },

    /**
     * Atomically rolls back a restore to a verified pre-restore snapshot.
     */
    rollbackRestore: async (snapshotKey, options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        const snapshot = await StorageService.load(snapshotKey);
        if (!snapshot || !snapshot.envelope) {
            throw new Error(`SNAPSHOT_NOT_FOUND: Pre-restore snapshot "${snapshotKey}" not found`);
        }

        // Verify snapshot integrity
        const computedHash = sha256(canonicalJsonStringify(snapshot.envelope));
        if (snapshot.snapshotChecksum !== computedHash) {
            throw new Error('SNAPSHOT_TAMPERED: Pre-restore snapshot checksum verification failed');
        }

        const storageKey = CashbookRepository._getStorageKey(mode);
        const genesisRootKey = CashbookRepository._getGenesisRootKey(mode);

        await StorageService.save(storageKey, snapshot.envelope);
        if (snapshot.envelope.auditLog && snapshot.envelope.auditLog.length > 0) {
            await StorageService.save(genesisRootKey, snapshot.envelope.auditLog[0].eventHash);
        }

        // Clean up WAL and lock
        await StorageService.delete(`${STORAGE_KEY_RESTORE_WAL_PREFIX}${mode}`);
        await StorageService.delete(`${STORAGE_KEY_RESTORE_LOCK_PREFIX}${mode}`);

        return {
            success: true,
            rolledBack: true,
            restoredSnapshotKey: snapshotKey,
            mode
        };
    },

    /**
     * Deterministically resolves an interrupted restore found during cold startup.
     */
    recoverInterruptedRestore: async (options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        const walKey = `${STORAGE_KEY_RESTORE_WAL_PREFIX}${mode}`;
        const wal = await StorageService.load(walKey);

        if (!wal) {
            return { recovered: false, message: 'No interrupted restore in progress' };
        }

        if (wal.state === 'PREPARED' && wal.snapshotKey) {
            console.warn(`[CashbookRestore] Interrupted restore detected for ${mode}. Rolling back to snapshot: ${wal.snapshotKey}`);
            await CashbookRestore.rollbackRestore(wal.snapshotKey, { mode });
            await StorageService.delete(walKey);
            return {
                recovered: true,
                rolledBackToSnapshot: true,
                snapshotKey: wal.snapshotKey
            };
        }

        await StorageService.delete(walKey);
        return { recovered: true, rolledBackToSnapshot: false };
    },

    /**
     * Simulated Uninstall & Cold Reinstall Continuity Validation.
     * Simulates device uninstall (storage wipe), cold boot, and restore from backup file.
     * Note: Documented as simulated uninstall validation (OS-level / OEM hardware lifecycle requires physical testing).
     */
    simulateDeviceUninstallAndReinstall: async (backupFilePayload, options = {}) => {
        const mode = options.mode || CashbookAppMode.PRODUCTION;

        // Step 1: Wipe all local app storage completely
        await StorageService.clear();

        // Step 2: Initialize cold application state
        await CashbookRepository.setMode(mode);

        // Step 3: Execute full restore from backup
        const restoreResult = await CashbookRestore.restoreLedgerBackup(backupFilePayload, {
            ...options,
            mode
        });

        // Step 4: Reconcile restored ledger
        const rec = await CashbookRepository.reconcile({ mode });

        return {
            uninstallSimulated: true,
            coldRestored: true,
            restoreResult,
            reconciliation: rec
        };
    }
};

