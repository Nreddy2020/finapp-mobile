/**
 * services/cashbook/cashbookRepository.js
 * 
 * Persistence and data access layer for FinLife Cashbook Ledger.
 * 
 * Invariants:
 * - Versioned envelope storage (@finlife:cashbook:production:v1) with structural checksums.
 * - Strict DEMO vs PRODUCTION isolation (demo fixtures never touch production key).
 * - Write-Ahead Prepared Operation protocol for atomic transfer posting.
 * - Append-only audit trail integration with sequence and hash chain checks.
 * - Recomputation from genesis verification.
 */

import { StorageService } from '../storage.js';
import {
    CashbookAppMode,
    CashbookType,
    DailyClosingStatus,
    TransactionType,
    TransactionStatus,
    canonicalJsonStringify,
    createCashbook,
    createAccount,
    AccountType,
    CrossBookWALState,
    CrossBookWALTransitions,
    createAuthoritativeTransferRecord
} from './cashbookContracts.js';
import { validateAccount, validateTransaction, validateCashbook, validateDailyClosingRecord } from './cashbookValidator.js';
import { computeAccountBalances, recomputeFromGenesis } from './cashbookEngine.js';
import {
    createAuditEvent,
    verifyAuditTrail,
    AuditEventType,
    AuditActor,
    AuditSource,
    sha256
} from './cashbookAuditTrail.js';
import { checkIdempotency } from './cashbookIdempotency.js';
import { buildDemoCashbookFixtures } from './cashbookMigration.js';
import { CashbookMigrationEngine } from './cashbookMigrationEngine.js';

const STORAGE_KEY_PROD = 'FINLIFE_CASHBOOK_PROD_V1';
const STORAGE_KEY_DEMO = 'FINLIFE_CASHBOOK_DEMO_V1';
const STORAGE_KEY_MODE = 'FINLIFE_CASHBOOK_APP_MODE';
const STORAGE_KEY_GENESIS_ROOT_PROD = 'FINLIFE_CASHBOOK_GENESIS_ROOT_PROD_V1';
const STORAGE_KEY_GENESIS_ROOT_DEMO = 'FINLIFE_CASHBOOK_GENESIS_ROOT_DEMO_V1';

const CURRENT_SCHEMA_VERSION = 2;

/**
 * Computes an envelope checksum.
 */
function computeEnvelopeChecksum(envelope) {
    const preimage = {
        version: envelope.version,
        accounts: envelope.accounts,
        transactions: envelope.transactions,
        auditLog: envelope.auditLog,
        preparedOperation: envelope.preparedOperation
    };
    if (envelope.books) preimage.books = envelope.books;
    if (envelope.activeBookId) preimage.activeBookId = envelope.activeBookId;
    if (envelope.dailyClosings) preimage.dailyClosings = envelope.dailyClosings;
    return sha256(canonicalJsonStringify(preimage));
}

/**
 * Creates an empty production envelope.
 */
function createEmptyEnvelope() {
    const defaultBook = createCashbook({
        id: 'book_personal_savings',
        name: 'Personal Savings',
        type: CashbookType.SAVINGS,
        description: 'Primary Personal & Household Ledger',
        isDefault: true
    });
    const envelope = {
        version: CURRENT_SCHEMA_VERSION,
        books: [defaultBook],
        activeBookId: 'book_personal_savings',
        accounts: [],
        transactions: [],
        dailyClosings: [],
        auditLog: [],
        preparedOperation: null,
        lastReconciledAt: null,
        checksum: ''
    };
    envelope.checksum = computeEnvelopeChecksum(envelope);
    return envelope;
}

export const CashbookRepository = {
    /**
     * Gets active app mode ('DEMO' | 'PRODUCTION').
     * Enforces build-time / runtime environment configuration first,
     * falling back to stored mode, and defaulting strictly to PRODUCTION.
     */
    getMode: async () => {
        const envMode = (typeof process !== 'undefined' && process.env?.APP_MODE) ||
                        (typeof process !== 'undefined' && process.env?.FINLIFE_MODE);
        if (envMode && Object.values(CashbookAppMode).includes(envMode)) {
            return envMode;
        }
        const mode = await StorageService.load(STORAGE_KEY_MODE);
        return mode === CashbookAppMode.DEMO ? CashbookAppMode.DEMO : CashbookAppMode.PRODUCTION;
    },

    /**
     * Sets active app mode.
     */
    setMode: async (mode) => {
        if (!Object.values(CashbookAppMode).includes(mode)) {
            throw new Error(`Invalid CashbookAppMode: ${mode}`);
        }
        await StorageService.save(STORAGE_KEY_MODE, mode);
        return mode;
    },

    /**
     * Resolves storage key based on active mode.
     */
    _getStorageKey: (mode) => {
        return mode === CashbookAppMode.DEMO ? STORAGE_KEY_DEMO : STORAGE_KEY_PROD;
    },

    /**
     * Resolves out-of-band pinned genesis root storage key.
     */
    _getGenesisRootKey: (mode) => {
        return mode === CashbookAppMode.DEMO ? STORAGE_KEY_GENESIS_ROOT_DEMO : STORAGE_KEY_GENESIS_ROOT_PROD;
    },

    /**
     * Loads the complete ledger envelope.
     * Automatically resolves interrupted write-ahead prepared operations.
     */
    load: async (options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);

        let envelope = await StorageService.load(key);

        if (!envelope || (mode === CashbookAppMode.DEMO && envelope.accounts.length === 0)) {
            if (mode === CashbookAppMode.DEMO) {
                // Initialize demo envelope with multi-book fixtures
                const defaultBook = createCashbook({
                    id: 'book_personal_savings',
                    name: 'Personal Savings',
                    type: CashbookType.SAVINGS,
                    description: 'Primary Personal & Household Ledger',
                    isDefault: true
                });
                const handyBook = createCashbook({
                    id: 'book_handy_cash',
                    name: 'Handy Cash Register',
                    type: CashbookType.HANDY_CASH,
                    description: 'Physical Cash Register'
                });
                const businessBook = createCashbook({
                    id: 'book_business',
                    name: 'Business Cash & Obligations',
                    type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS,
                    description: 'Operations & Invoices'
                });
                const loanBook = createCashbook({
                    id: 'book_home_loan',
                    name: 'Home Loan A/c',
                    type: CashbookType.LOANS_TAKEN,
                    description: 'SBI Home Loan'
                });
                const pfBook = createCashbook({
                    id: 'book_epfo_pf',
                    name: 'Provident Fund (PF)',
                    type: CashbookType.PF,
                    description: 'EPFO UAN Portfolio'
                });

                const fixtures = buildDemoCashbookFixtures();
                const demoTxns = fixtures.transactions.map(t => ({
                    ...t,
                    bookId: t.bookId || 'book_personal_savings'
                }));

                envelope = {
                    version: CURRENT_SCHEMA_VERSION,
                    books: [defaultBook, handyBook, businessBook, loanBook, pfBook],
                    activeBookId: 'book_personal_savings',
                    accounts: fixtures.accounts,
                    transactions: demoTxns,
                    dailyClosings: [],
                    auditLog: [],
                    preparedOperation: null,
                    lastReconciledAt: new Date().toISOString(),
                    checksum: ''
                };
                // Build initial audit events for demo fixtures
                let lastEvent = null;
                for (const txn of demoTxns) {
                    const evt = createAuditEvent({
                        lastEvent,
                        eventType: txn.transactionType === TransactionType.OPENING_BALANCE
                            ? AuditEventType.OPENING_BALANCE_SET
                            : AuditEventType.TRANSACTION_POSTED,
                        entityId: txn.id,
                        payload: txn,
                        actor: AuditActor.MIGRATION,
                        source: AuditSource.SYSTEM
                    });
                    envelope.auditLog.push(evt);
                    lastEvent = evt;
                }
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(key, envelope);
            } else {
                envelope = createEmptyEnvelope();
                await StorageService.save(key, envelope);
            }
        }

        // Seamless V1 to V2 migration check
        if (!envelope.books || envelope.books.length === 0) {
            const defaultBook = createCashbook({
                id: 'book_personal_savings',
                name: 'Personal Savings',
                type: CashbookType.SAVINGS,
                description: 'Primary Personal & Household Ledger',
                isDefault: true
            });
            envelope.books = [defaultBook];
            envelope.activeBookId = defaultBook.id;
            envelope.dailyClosings = envelope.dailyClosings || [];
            for (const txn of (envelope.transactions || [])) {
                if (!txn.bookId) txn.bookId = defaultBook.id;
            }
            envelope.version = CURRENT_SCHEMA_VERSION;
            envelope.checksum = computeEnvelopeChecksum(envelope);
            await StorageService.save(key, envelope);
        }

        // Boundary 4: Evidence-Based Deterministic Idempotent Migration Resolver for legacy unassigned transactions.
        // Guarantees strict book isolation:
        // 1. Matches transactions to a book based on account ownership evidence.
        // 2. If accounts belong to the primary single-book personal savings, assign to Personal.
        // 3. If accounts are ambiguous or unknown, quarantine to avoid silent contamination.
        // 4. Stamped idempotently with cashbook-book-migration-v1:<txnId>.
        if (envelope.transactions && envelope.transactions.length > 0) {
            let unassignedMigrated = false;
            const defaultBook = (envelope.books || []).find(b => b.isDefault) || (envelope.books && envelope.books[0]) || { id: 'book_personal_savings' };
            const accountBookMap = new Map((envelope.accounts || []).map(a => [a.id, a.bookId]));

            for (const txn of envelope.transactions) {
                if (!txn.bookId) {
                    const migrationStamp = `cashbook-book-migration-v1:${txn.id}`;
                    if (txn.migrationId !== migrationStamp) {
                        const referencedAccountIds = new Set();
                        if (txn.accountId) referencedAccountIds.add(txn.accountId);
                        if (txn.sourceAccountId) referencedAccountIds.add(txn.sourceAccountId);
                        if (txn.destinationAccountId) referencedAccountIds.add(txn.destinationAccountId);
                        if (Array.isArray(txn.lines)) {
                            for (const line of txn.lines) {
                                if (line.accountId) referencedAccountIds.add(line.accountId);
                            }
                        }

                        const candidateBooks = new Set();
                        let hasUnresolvedAccount = false;
                        for (const accId of referencedAccountIds) {
                            if (accountBookMap.has(accId)) {
                                const accBookId = accountBookMap.get(accId);
                                if (accBookId) candidateBooks.add(accBookId);
                                else candidateBooks.add(defaultBook.id);
                            } else {
                                hasUnresolvedAccount = true;
                            }
                        }

                        if (candidateBooks.size === 1) {
                            txn.bookId = Array.from(candidateBooks)[0];
                            txn.migrationBasis = 'ACCOUNT_OWNERSHIP_EVIDENCE';
                        } else if (candidateBooks.size === 0 && !hasUnresolvedAccount) {
                            txn.bookId = defaultBook.id;
                            txn.migrationBasis = 'LEGACY_SINGLE_BOOK_PRIMARY';
                        } else {
                            txn.bookId = 'QUARANTINE_UNASSIGNED';
                            txn.isQuarantined = true;
                            txn.quarantineReason = hasUnresolvedAccount ? 'UNRESOLVED_ACCOUNT_REFERENCE' : 'MULTI_BOOK_AMBIGUITY';
                            txn.migrationBasis = 'QUARANTINE';
                        }

                        txn.migrationId = migrationStamp;
                        txn.migratedAt = new Date().toISOString();
                        unassignedMigrated = true;
                    }
                }
            }
            if (unassignedMigrated) {
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(key, envelope);
            }
        }

        // Ensure standard register accounts exist in demo envelopes
        if (mode === CashbookAppMode.DEMO && envelope.accounts && envelope.accounts.length > 0) {
            const existingIds = new Set(envelope.accounts.map(a => a.id));
            let accountsAdded = false;
            const regAccounts = [
                { id: 'acc_epfo_uan', name: 'EPFO UAN Restricted Portfolio', type: AccountType.INVESTMENT, institution: 'EPFO' },
                { id: 'acc_loan_liability', name: 'Home Loan Liability', type: AccountType.LOAN, institution: 'SBI' },
                { id: 'acc_loan_receivable', name: 'Borrower Loan Receivables', type: AccountType.OTHER },
                { id: 'inv_asset_portfolio', name: 'Mutual Funds & Equities', type: AccountType.INVESTMENT }
            ];
            for (const rAcc of regAccounts) {
                if (!existingIds.has(rAcc.id)) {
                    envelope.accounts.push(createAccount(rAcc));
                    accountsAdded = true;
                }
            }
            if (accountsAdded) {
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(key, envelope);
            }
        }



        // Verify checksum if present
        if (envelope.checksum) {
            const expected = computeEnvelopeChecksum(envelope);
            if (envelope.checksum !== expected) {
                console.warn(`[CashbookRepository] Envelope checksum mismatch for ${key}. Possible external tamper or interrupted write.`);
                if (options.failOnChecksumMismatch === true) {
                    throw new Error(`ENVELOPE_CHECKSUM_MISMATCH: Computed checksum does not match envelope checksum for ${key}`);
                }
            }
        }

        // Out-of-band pinned genesis verification
        if (envelope.auditLog && envelope.auditLog.length > 0) {
            const genesisEvent = envelope.auditLog[0];
            const genesisRootKey = CashbookRepository._getGenesisRootKey(mode);
            const pinnedGenesisHash = await StorageService.load(genesisRootKey);
            if (!pinnedGenesisHash) {
                await StorageService.save(genesisRootKey, genesisEvent.eventHash);
            } else if (pinnedGenesisHash !== genesisEvent.eventHash) {
                const errDetail = `TAMPERED_GENESIS_PIN_MISMATCH: Genesis hash mismatch against out-of-band pinned root for ${mode}. Expected ${pinnedGenesisHash}, got ${genesisEvent.eventHash}. Possible ledger replacement attack.`;
                console.error(`[CashbookRepository] ${errDetail}`);
                if (options.failOnGenesisTamper === true) {
                    throw new Error(errDetail);
                }
            }
        }

        // Recovery: Check for interrupted restore WAL
        const restoreWalKey = 'FINLIFE_CASHBOOK_RESTORE_WAL_' + mode;
        const restoreWal = await StorageService.load(restoreWalKey);
        if (restoreWal && restoreWal.state === 'PREPARED' && restoreWal.snapshotKey) {
            const snapshot = await StorageService.load(restoreWal.snapshotKey);
            if (snapshot && snapshot.envelope) {
                envelope = snapshot.envelope;
                await StorageService.save(key, envelope);
                if (envelope.auditLog && envelope.auditLog.length > 0) {
                    await StorageService.save(CashbookRepository._getGenesisRootKey(mode), envelope.auditLog[0].eventHash);
                }
            }
            await StorageService.delete(restoreWalKey);
            await StorageService.delete('FINLIFE_CASHBOOK_RESTORE_LOCK_' + mode);
        }

        // Recovery: Check for prepared operation
        if (envelope.preparedOperation && envelope.preparedOperation.state) {
            envelope = await CashbookRepository._recoverPreparedOperation(envelope, key);
        }

        return envelope;
    },

    /**
     * Resolves an interrupted prepared operation using the deterministic Gate 8 decision table.
     */
    _recoverPreparedOperation: async (envelope, storageKey) => {
        const op = envelope.preparedOperation;
        if (!op) return envelope;

        if (op.operationType === 'TRANSFER_POST') {
            const transferTxn = op.payload;
            try {
                validateTransaction(transferTxn, envelope.accounts);
                if (!envelope.transactions.some(t => t.id === transferTxn.id)) {
                    envelope.transactions.push(transferTxn);
                }
            } catch (err) {
                console.warn('[CashbookRepository] Rolling back invalid prepared transfer operation:', err.message);
            }
            envelope.preparedOperation = null;
            envelope.checksum = computeEnvelopeChecksum(envelope);
            await StorageService.save(storageKey, envelope);
            return envelope;
        }

        if (op.operationType === 'CROSS_BOOK_TRANSFER') {
            // Already in a terminal completed state?
            if (op.state === CrossBookWALState.COMPLETED) {
                envelope.preparedOperation = null;
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(storageKey, envelope);
                return envelope;
            }

            // 1. Validate WAL state machine integrity
            if (!op.transferGroupId || !op.state || !Object.values(CrossBookWALState).includes(op.state)) {
                console.error('[CashbookRepository] Malformed or unknown WAL state:', op.state);
                op.state = CrossBookWALState.QUARANTINED;
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(storageKey, envelope);
                throw new Error(`WAL_QUARANTINED: Malformed WAL record in storageKey "${storageKey}". Quarantined.`);
            }

            if (op.state === CrossBookWALState.QUARANTINED) {
                throw new Error(`WAL_QUARANTINED: Operation ${op.transferGroupId} is quarantined and cannot be automatically recovered.`);
            }

            if (op.state === CrossBookWALState.RECOVERY_CONFLICT) {
                throw new Error(`RECOVERY_CONFLICT: Operation ${op.transferGroupId} has a detected payload conflict requiring manual intervention.`);
            }

            const sourceTxn = op.sourceTxn || op.payload?.sourceTxn;
            const destTxn = op.destTxn || op.payload?.destTxn;

            if (!sourceTxn || !destTxn) {
                console.error('[CashbookRepository] Missing transaction payload in WAL record:', op.transferGroupId);
                op.state = CrossBookWALState.QUARANTINED;
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(storageKey, envelope);
                throw new Error(`WAL_QUARANTINED: Missing transaction payload in WAL record ${op.transferGroupId}`);
            }

            // Validate payload hashes if present
            const srcHash = sha256(canonicalJsonStringify(sourceTxn));
            const dstHash = sha256(canonicalJsonStringify(destTxn));
            if (op.sourcePayloadHash && op.sourcePayloadHash !== srcHash) {
                op.state = CrossBookWALState.QUARANTINED;
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(storageKey, envelope);
                throw new Error(`WAL_QUARANTINED: Source payload hash mismatch in WAL record ${op.transferGroupId}`);
            }
            if (op.destinationPayloadHash && op.destinationPayloadHash !== dstHash) {
                op.state = CrossBookWALState.QUARANTINED;
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(storageKey, envelope);
                throw new Error(`WAL_QUARANTINED: Destination payload hash mismatch in WAL record ${op.transferGroupId}`);
            }

            const srcInLedger = envelope.transactions.find(t => t.id === sourceTxn.id);
            const dstInLedger = envelope.transactions.find(t => t.id === destTxn.id);

            let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;

            // Deterministic Decision Matrix:
            // Case 1: Neither leg committed
            if (!srcInLedger && !dstInLedger) {
                if (op.state === CrossBookWALState.INITIATED || op.state === CrossBookWALState.SOURCE_PREPARED) {
                    // Safe rollback: neither leg committed, not dual prepared
                    op.state = CrossBookWALState.ROLLED_BACK;
                    envelope.preparedOperation = null;
                    envelope.checksum = computeEnvelopeChecksum(envelope);
                    await StorageService.save(storageKey, envelope);
                    return envelope;
                } else {
                    // DUAL_PREPARED: Forward-reconcile both legs deterministically
                    validateTransaction(sourceTxn, envelope.accounts);
                    validateTransaction(destTxn, envelope.accounts);

                    const evtSrc = createAuditEvent({
                        lastEvent,
                        eventType: AuditEventType.TRANSACTION_POSTED,
                        entityId: sourceTxn.id,
                        payload: sourceTxn,
                        actor: AuditActor.SYSTEM,
                        source: AuditSource.SYSTEM
                    });
                    lastEvent = evtSrc;
                    const evtDst = createAuditEvent({
                        lastEvent,
                        eventType: AuditEventType.TRANSACTION_POSTED,
                        entityId: destTxn.id,
                        payload: destTxn,
                        actor: AuditActor.SYSTEM,
                        source: AuditSource.SYSTEM
                    });

                    envelope.transactions.push(sourceTxn, destTxn);
                    envelope.auditLog.push(evtSrc, evtDst);
                    op.state = CrossBookWALState.COMPLETED;
                    envelope.preparedOperation = null;
                    envelope.checksum = computeEnvelopeChecksum(envelope);
                    await StorageService.save(storageKey, envelope);
                    return envelope;
                }
            } else if (srcInLedger && !dstInLedger) {
                // Case 2: Source committed only -> Forward-reconcile destination leg
                const existingSrcHash = sha256(canonicalJsonStringify(srcInLedger));
                if (op.sourcePayloadHash && existingSrcHash !== op.sourcePayloadHash) {
                    op.state = CrossBookWALState.RECOVERY_CONFLICT;
                    envelope.checksum = computeEnvelopeChecksum(envelope);
                    await StorageService.save(storageKey, envelope);
                    throw new Error(`RECOVERY_CONFLICT: Existing source leg payload differs from WAL record for ${op.transferGroupId}`);
                }

                validateTransaction(destTxn, envelope.accounts);
                const evtDst = createAuditEvent({
                    lastEvent,
                    eventType: AuditEventType.TRANSACTION_POSTED,
                    entityId: destTxn.id,
                    payload: destTxn,
                    actor: AuditActor.SYSTEM,
                    source: AuditSource.SYSTEM
                });
                envelope.transactions.push(destTxn);
                envelope.auditLog.push(evtDst);
                op.state = CrossBookWALState.COMPLETED;
                envelope.preparedOperation = null;
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(storageKey, envelope);
                return envelope;
            } else if (!srcInLedger && dstInLedger) {
                // Case 3: Destination committed only -> Forward-reconcile source leg
                const existingDstHash = sha256(canonicalJsonStringify(dstInLedger));
                if (op.destinationPayloadHash && existingDstHash !== op.destinationPayloadHash) {
                    op.state = CrossBookWALState.RECOVERY_CONFLICT;
                    envelope.checksum = computeEnvelopeChecksum(envelope);
                    await StorageService.save(storageKey, envelope);
                    throw new Error(`RECOVERY_CONFLICT: Existing destination leg payload differs from WAL record for ${op.transferGroupId}`);
                }

                validateTransaction(sourceTxn, envelope.accounts);
                const evtSrc = createAuditEvent({
                    lastEvent,
                    eventType: AuditEventType.TRANSACTION_POSTED,
                    entityId: sourceTxn.id,
                    payload: sourceTxn,
                    actor: AuditActor.SYSTEM,
                    source: AuditSource.SYSTEM
                });
                envelope.transactions.push(sourceTxn);
                envelope.auditLog.push(evtSrc);
                op.state = CrossBookWALState.COMPLETED;
                envelope.preparedOperation = null;
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(storageKey, envelope);
                return envelope;
            } else {
                // Case 4: Both committed in ledger
                const existingSrcHash = sha256(canonicalJsonStringify(srcInLedger));
                const existingDstHash = sha256(canonicalJsonStringify(dstInLedger));
                if ((op.sourcePayloadHash && existingSrcHash !== op.sourcePayloadHash) ||
                    (op.destinationPayloadHash && existingDstHash !== op.destinationPayloadHash)) {
                    op.state = CrossBookWALState.RECOVERY_CONFLICT;
                    envelope.checksum = computeEnvelopeChecksum(envelope);
                    await StorageService.save(storageKey, envelope);
                    throw new Error(`RECOVERY_CONFLICT: Committed transaction payloads do not match authoritative WAL record for ${op.transferGroupId}`);
                }

                // Both match! Simply mark completed and clear WAL
                op.state = CrossBookWALState.COMPLETED;
                envelope.preparedOperation = null;
                envelope.checksum = computeEnvelopeChecksum(envelope);
                await StorageService.save(storageKey, envelope);
                return envelope;
            }
        }

        return envelope;
    },

    /**
     * Saves or registers an Account.
     */
    saveAccount: async (account, options = {}) => {
        validateAccount(account);
        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);

        const envelope = await CashbookRepository.load({ mode });
        const existingIdx = envelope.accounts.findIndex(a => a.id === account.id);

        let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;

        if (existingIdx >= 0) {
            envelope.accounts[existingIdx] = {
                ...account,
                updatedAt: new Date().toISOString()
            };
        } else {
            envelope.accounts.push({
                ...account,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        const auditEvent = createAuditEvent({
            lastEvent,
            eventType: AuditEventType.ACCOUNT_CREATED,
            entityId: account.id,
            payload: account,
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });
        envelope.auditLog.push(auditEvent);

        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        return account;
    },

    /**
     * Posts a regular transaction (INCOME, EXPENSE, REFUND, ADJUSTMENT, OPENING_BALANCE).
     */
    saveTransaction: async (txn, options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);
        const envelope = await CashbookRepository.load({ mode });

        // Default bookId
        if (!txn.bookId) {
            txn.bookId = envelope.activeBookId || (envelope.books && envelope.books[0]?.id) || 'book_personal_savings';
        }

        // Period lock check
        const isDateLocked = (envelope.dailyClosings || []).some(
            c => c.bookId === txn.bookId && c.date === txn.date && c.status === DailyClosingStatus.LOCKED
        );
        if (isDateLocked) {
            throw new Error(`PERIOD_LOCKED: Cannot post transaction to locked date "${txn.date}" in book "${txn.bookId}"`);
        }

        // Validate transaction against known accounts
        validateTransaction(txn, envelope.accounts);

        // Opening balance immutability check
        if (txn.transactionType === TransactionType.OPENING_BALANCE) {
            const hasExistingOpening = envelope.transactions.find(
                t => t.transactionType === TransactionType.OPENING_BALANCE && t.accountId === txn.accountId && t.status !== TransactionStatus.VOIDED
            );
            if (hasExistingOpening) {
                // If it's an identical retry, return existing
                const idemCheck = checkIdempotency([hasExistingOpening], txn);
                if (idemCheck.action === 'RETURN_EXISTING') {
                    return hasExistingOpening;
                }
                throw new Error(`Account "${txn.accountId}" already has an immutable opening balance record. Use an ADJUSTMENT transaction for corrections.`);
            }
        }

        // Idempotency check
        const idemCheck = checkIdempotency(envelope.transactions, txn);
        if (idemCheck.action === 'RETURN_EXISTING') {
            return idemCheck.existingTransaction;
        }
        if (idemCheck.action === 'REJECT_CONFLICT') {
            throw new Error(idemCheck.reason);
        }

        let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;
        let eventType = AuditEventType.TRANSACTION_POSTED;
        if (txn.transactionType === TransactionType.OPENING_BALANCE) {
            eventType = AuditEventType.OPENING_BALANCE_SET;
        } else if (txn.transactionType === TransactionType.ADJUSTMENT) {
            eventType = AuditEventType.ADJUSTMENT_POSTED;
        }

        const auditEvent = createAuditEvent({
            lastEvent,
            eventType,
            entityId: txn.id,
            payload: txn,
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });

        envelope.transactions.push(txn);
        envelope.auditLog.push(auditEvent);

        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        return txn;
    },

    /**
     * Atomically posts a transfer transaction using the write-ahead prepared protocol.
     */
    saveTransfer: async (transferTxn, options = {}) => {
        if (transferTxn.transactionType !== TransactionType.TRANSFER) {
            throw new Error('saveTransfer only accepts TRANSFER transactions');
        }

        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);
        const envelope = await CashbookRepository.load({ mode });

        if (!transferTxn.bookId) {
            transferTxn.bookId = envelope.activeBookId || (envelope.books && envelope.books[0]?.id) || 'book_personal_savings';
        }

        const isDateLocked = (envelope.dailyClosings || []).some(
            c => c.bookId === transferTxn.bookId && c.date === transferTxn.date && c.status === DailyClosingStatus.LOCKED
        );
        if (isDateLocked) {
            throw new Error(`PERIOD_LOCKED: Cannot post transfer to locked date "${transferTxn.date}" in book "${transferTxn.bookId}"`);
        }

        validateTransaction(transferTxn, envelope.accounts);

        // Idempotency check
        const idemCheck = checkIdempotency(envelope.transactions, transferTxn);
        if (idemCheck.action === 'RETURN_EXISTING') {
            return idemCheck.existingTransaction;
        }
        if (idemCheck.action === 'REJECT_CONFLICT') {
            throw new Error(idemCheck.reason);
        }

        // 1. Write-Ahead: Mark PREPARED
        envelope.preparedOperation = {
            operationId: `prep_${Date.now()}`,
            operationType: 'TRANSFER_POST',
            state: 'PREPARED',
            payload: transferTxn
        };
        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        // 2. Commit: Add transaction & audit event, clear preparedOperation
        let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;
        const auditEvent = createAuditEvent({
            lastEvent,
            eventType: AuditEventType.TRANSACTION_POSTED,
            entityId: transferTxn.id,
            payload: transferTxn,
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });

        envelope.transactions.push(transferTxn);
        envelope.auditLog.push(auditEvent);
        envelope.preparedOperation = null;

        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        return transferTxn;
    },

    /**
     * Voids a transaction with a mandatory reason.
     * Records an immutable TRANSACTION_VOIDED audit event.
     */
    voidTransaction: async (transactionId, { voidReason, voidedAt = new Date().toISOString() }, options = {}) => {
        if (!voidReason || typeof voidReason !== 'string' || !voidReason.trim()) {
            throw new Error('A mandatory voidReason must be provided to void a transaction');
        }

        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);
        const envelope = await CashbookRepository.load({ mode });

        const idx = envelope.transactions.findIndex(t => t.id === transactionId);
        if (idx < 0) {
            throw new Error(`Transaction not found: ${transactionId}`);
        }

        const target = envelope.transactions[idx];
        if (target.status === TransactionStatus.VOIDED) {
            return target; // Already voided
        }

        if (target.immutable === true && target.transactionType === TransactionType.OPENING_BALANCE) {
            throw new Error('OPENING_BALANCE records are immutable and cannot be voided. Post a corrective ADJUSTMENT transaction instead.');
        }

        const updatedTxn = {
            ...target,
            status: TransactionStatus.VOIDED,
            voidReason: voidReason.trim(),
            voidedAt,
            updatedAt: new Date().toISOString(),
            version: (target.version || 1) + 1
        };

        envelope.transactions[idx] = updatedTxn;

        let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;
        const auditEvent = createAuditEvent({
            lastEvent,
            eventType: AuditEventType.TRANSACTION_VOIDED,
            entityId: transactionId,
            payload: {
                previousStatus: target.status,
                newStatus: TransactionStatus.VOIDED,
                voidReason: voidReason.trim(),
                voidedAt
            },
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });
        envelope.auditLog.push(auditEvent);

        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        return updatedTxn;
    },

    /**
     * Performs an integrity check and reconciliation of the entire ledger.
     */
    reconcile: async (options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        const envelope = await CashbookRepository.load({ mode });

        const auditCheck = verifyAuditTrail(envelope.auditLog);
        const genesisCheck = recomputeFromGenesis(envelope.accounts, envelope.transactions);

        // Out-of-band pinned genesis check
        const genesisRootKey = CashbookRepository._getGenesisRootKey(mode);
        const pinnedGenesisHash = await StorageService.load(genesisRootKey);
        let isGenesisPinValid = true;
        let genesisPinReason = null;
        if (pinnedGenesisHash && envelope.auditLog && envelope.auditLog.length > 0) {
            if (pinnedGenesisHash !== envelope.auditLog[0].eventHash) {
                isGenesisPinValid = false;
                genesisPinReason = `Pinned genesis hash mismatch. Expected ${pinnedGenesisHash}, got ${envelope.auditLog[0].eventHash}`;
            }
        }

        return {
            mode,
            envelopeVersion: envelope.version,
            isAuditValid: auditCheck.isValid && isGenesisPinValid,
            auditReason: [auditCheck.reason, genesisPinReason].filter(Boolean).join('; ') || null,
            isGenesisValid: genesisCheck.isValid,
            isGenesisPinValid,
            anomalies: genesisCheck.anomalies,
            accountBalances: genesisCheck.balances,
            transactionCount: envelope.transactions.length,
            auditEventCount: envelope.auditLog.length
        };
    },

    /**
     * Gets all registered Cashbooks.
     */
    getBooks: async (options = {}) => {
        const envelope = await CashbookRepository.load(options);
        return envelope.books || [];
    },

    /**
     * Gets the active Cashbook ID.
     */
    getActiveBookId: async (options = {}) => {
        const envelope = await CashbookRepository.load(options);
        return envelope.activeBookId || (envelope.books && envelope.books[0]?.id) || 'book_personal_savings';
    },

    /**
     * Gets the active Cashbook contract object.
     */
    getActiveBook: async (options = {}) => {
        const envelope = await CashbookRepository.load(options);
        const activeId = envelope.activeBookId || (envelope.books && envelope.books[0]?.id);
        return (envelope.books || []).find(b => b.id === activeId) || (envelope.books && envelope.books[0]) || null;
    },

    /**
     * Sets the active Cashbook ID.
     */
    setActiveBookId: async (bookId, options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);
        const envelope = await CashbookRepository.load({ mode });

        const book = (envelope.books || []).find(b => b.id === bookId);
        if (!book) {
            throw new Error(`Cashbook not found: "${bookId}"`);
        }

        envelope.activeBookId = bookId;
        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);
        return book;
    },

    /**
     * Creates or updates a Cashbook.
     */
    saveBook: async (book, options = {}) => {
        validateCashbook(book);
        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);
        const envelope = await CashbookRepository.load({ mode });

        envelope.books = envelope.books || [];
        const existingIdx = envelope.books.findIndex(b => b.id === book.id);
        let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;

        if (existingIdx >= 0) {
            envelope.books[existingIdx] = {
                ...book,
                updatedAt: new Date().toISOString()
            };
        } else {
            envelope.books.push({
                ...book,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        const auditEvent = createAuditEvent({
            lastEvent,
            eventType: existingIdx >= 0 ? AuditEventType.BOOK_UPDATED : AuditEventType.BOOK_CREATED,
            entityId: book.id,
            payload: book,
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });
        envelope.auditLog.push(auditEvent);

        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);
        return book;
    },

    /**
     * Retrieves daily closings, optionally filtered by bookId.
     */
    getDailyClosings: async (bookId = null, options = {}) => {
        const envelope = await CashbookRepository.load(options);
        const closings = envelope.dailyClosings || [];
        if (!bookId) return closings;
        return closings.filter(c => c.bookId === bookId);
    },

    /**
     * Gets a specific daily closing by bookId and date.
     */
    getDailyClosingByDate: async (bookId, date, options = {}) => {
        const envelope = await CashbookRepository.load(options);
        return (envelope.dailyClosings || []).find(c => c.bookId === bookId && c.date === date) || null;
    },

    /**
     * Saves a daily closing record with period locking validation.
     */
    saveDailyClosing: async (record, options = {}) => {
        validateDailyClosingRecord(record);
        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);
        const envelope = await CashbookRepository.load({ mode });

        envelope.dailyClosings = envelope.dailyClosings || [];
        const existingIdx = envelope.dailyClosings.findIndex(c => c.bookId === record.bookId && c.date === record.date);

        if (existingIdx >= 0 && envelope.dailyClosings[existingIdx].status === DailyClosingStatus.LOCKED) {
            throw new Error(`PERIOD_LOCKED: Cannot modify locked daily closing for book "${record.bookId}" on date "${record.date}"`);
        }

        let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;

        if (existingIdx >= 0) {
            envelope.dailyClosings[existingIdx] = {
                ...record,
                updatedAt: new Date().toISOString()
            };
        } else {
            envelope.dailyClosings.push({
                ...record,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        const auditEvent = createAuditEvent({
            lastEvent,
            eventType: AuditEventType.DAILY_CLOSING_SAVED,
            entityId: record.id,
            payload: record,
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });
        envelope.auditLog.push(auditEvent);

        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);
        return record;
    },

    /**
     * Locks a daily closing record permanently.
     */
    lockDailyClosing: async (recordId, options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);
        const envelope = await CashbookRepository.load({ mode });

        envelope.dailyClosings = envelope.dailyClosings || [];
        const idx = envelope.dailyClosings.findIndex(c => c.id === recordId);
        if (idx < 0) {
            throw new Error(`DailyClosingRecord not found: "${recordId}"`);
        }

        const current = envelope.dailyClosings[idx];
        const locked = {
            ...current,
            status: DailyClosingStatus.LOCKED,
            closedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        envelope.dailyClosings[idx] = locked;

        let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;
        const auditEvent = createAuditEvent({
            lastEvent,
            eventType: AuditEventType.DAILY_CLOSING_LOCKED,
            entityId: recordId,
            payload: locked,
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });
        envelope.auditLog.push(auditEvent);

        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);
        return locked;
    },

    /**
     * Posts a cross-book transfer pair using the 2-phase Write-Ahead Log (WAL) protocol.
     * 
     * Invariant:
     * Forward-reconciles both legs deterministically and guarantees eventual ledger consistency after recovery.
     * Independent physical writes are coordinated via an authoritative WAL envelope record.
     */
    saveCrossBookTransfer: async ({ sourceTxn, destTxn }, options = {}) => {
        if (!sourceTxn || !destTxn) {
            throw new Error('saveCrossBookTransfer requires both sourceTxn and destTxn');
        }
        if (sourceTxn.transferGroupId !== destTxn.transferGroupId) {
            throw new Error('transferGroupId must match between sourceTxn and destTxn');
        }
        if (sourceTxn.amount.paise !== destTxn.amount.paise) {
            throw new Error('Transfer amounts must match between sourceTxn and destTxn');
        }
        const srcCurr = (sourceTxn.currency || sourceTxn.amount?.currency || 'INR').toUpperCase();
        const dstCurr = (destTxn.currency || destTxn.amount?.currency || 'INR').toUpperCase();
        if (srcCurr !== dstCurr || srcCurr !== 'INR') {
            throw new Error('Transfer currency mismatch: both legs must be INR');
        }
        if (sourceTxn.bookId === destTxn.bookId) {
            throw new Error('Source and destination books cannot be the same');
        }
        if (sourceTxn.id === destTxn.id) {
            throw new Error('Source and destination transaction IDs must be distinct');
        }
        if (BigInt(sourceTxn.amount.paise) <= 0n) {
            throw new Error('Transfer amount must be strictly greater than zero');
        }

        const mode = options.mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(mode);

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

        // Stage 1: Pre-write fault injection check
        if (options._faultInjection === 'PRE_WRITE' || options._faultInjection === 'STAGE_1') {
            throw new Error('FAULT_INJECTED: Crash before any ledger mutation');
        }

        const envelope = await CashbookRepository.load({ mode });

        // Period locking checks
        const isSrcLocked = (envelope.dailyClosings || []).some(
            c => c.bookId === sourceTxn.bookId && c.date === sourceTxn.date && c.status === DailyClosingStatus.LOCKED
        );
        if (isSrcLocked) {
            throw new Error(`PERIOD_LOCKED: Cannot post transfer from locked date "${sourceTxn.date}" in book "${sourceTxn.bookId}"`);
        }
        const isDestLocked = (envelope.dailyClosings || []).some(
            c => c.bookId === destTxn.bookId && c.date === destTxn.date && c.status === DailyClosingStatus.LOCKED
        );
        if (isDestLocked) {
            throw new Error(`PERIOD_LOCKED: Cannot post transfer to locked date "${destTxn.date}" in book "${destTxn.bookId}"`);
        }

        validateTransaction(sourceTxn, envelope.accounts);
        validateTransaction(destTxn, envelope.accounts);

        // Idempotency check
        const idemSrc = checkIdempotency(envelope.transactions, sourceTxn);
        const idemDst = checkIdempotency(envelope.transactions, destTxn);
        if (idemSrc.action === 'REJECT_CONFLICT') {
            throw new Error(idemSrc.reason);
        }
        if (idemDst.action === 'REJECT_CONFLICT') {
            throw new Error(idemDst.reason);
        }
        if (idemSrc.action === 'RETURN_EXISTING' && idemDst.action === 'RETURN_EXISTING') {
            return { sourceTxn: idemSrc.existingTransaction, destTxn: idemDst.existingTransaction };
        }
        if ((idemSrc.action === 'RETURN_EXISTING' && idemDst.action !== 'RETURN_EXISTING') ||
            (idemSrc.action !== 'RETURN_EXISTING' && idemDst.action === 'RETURN_EXISTING')) {
            throw new Error(`IDEMPOTENCY_CONFLICT: Partial transfer state detected for idempotencyKey "${sourceTxn.idempotencyKey || destTxn.idempotencyKey}".`);
        }

        // Account balance snapshots before posting
        const balances = computeAccountBalances(envelope.accounts, envelope.transactions);
        const sourceBeforeBalance = balances[sourceTxn.accountId]?.paise || '0';
        const destinationBeforeBalance = balances[destTxn.accountId]?.paise || '0';
        const transferAmt = BigInt(sourceTxn.amount.paise);
        const sourceAfterBalance = (BigInt(sourceBeforeBalance) - transferAmt).toString();
        const destinationAfterBalance = (BigInt(destinationBeforeBalance) + transferAmt).toString();

        const sourcePayloadHash = sha256(canonicalJsonStringify(sourceTxn));
        const destinationPayloadHash = sha256(canonicalJsonStringify(destTxn));

        // 1. Authoritative Record Creation: SOURCE_PREPARED
        const authoritativeRecord = createAuthoritativeTransferRecord({
            transferGroupId: sourceTxn.transferGroupId,
            idempotencyKey: sourceTxn.idempotencyKey || destTxn.idempotencyKey || `xfer:${sourceTxn.transferGroupId}`,
            sourceBookId: sourceTxn.bookId,
            destinationBookId: destTxn.bookId,
            sourceTransactionId: sourceTxn.id,
            destinationTransactionId: destTxn.id,
            amountPaise: sourceTxn.amount.paise,
            currency: 'INR',
            sourceBeforeBalance,
            sourceAfterBalance,
            destinationBeforeBalance,
            destinationAfterBalance,
            sourcePayloadHash,
            destinationPayloadHash,
            sourceTxn,
            destTxn,
            state: CrossBookWALState.SOURCE_PREPARED
        });

        // Write Phase 1: SOURCE_PREPARED
        envelope.preparedOperation = authoritativeRecord;
        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        // Stage 2: After source WAL fault injection check
        if (options._faultInjection === 'AFTER_SOURCE_PREPARED' || options._faultInjection === 'AFTER_SOURCE_WAL' || options._faultInjection === 'STAGE_2') {
            throw new Error('FAULT_INJECTED: Crash after source WAL prepared');
        }

        // Write Phase 2: DUAL_PREPARED
        authoritativeRecord.state = CrossBookWALState.DUAL_PREPARED;
        authoritativeRecord.updatedAt = new Date().toISOString();
        envelope.preparedOperation = authoritativeRecord;
        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        // Stage 3: After dual WAL fault injection check
        if (options._faultInjection === 'AFTER_DUAL_PREPARED' || options._faultInjection === 'AFTER_DEST_WAL' || options._faultInjection === 'STAGE_3') {
            throw new Error('FAULT_INJECTED: Crash after dual WAL prepared');
        }

        // Write Phase 3: Commit Source Leg
        let lastEvent = envelope.auditLog.length > 0 ? envelope.auditLog[envelope.auditLog.length - 1] : null;
        const evtSrc = createAuditEvent({
            lastEvent,
            eventType: AuditEventType.TRANSACTION_POSTED,
            entityId: sourceTxn.id,
            payload: sourceTxn,
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });
        envelope.transactions.push(sourceTxn);
        envelope.auditLog.push(evtSrc);
        lastEvent = evtSrc;

        authoritativeRecord.state = CrossBookWALState.SOURCE_COMMITTED;
        authoritativeRecord.updatedAt = new Date().toISOString();
        envelope.preparedOperation = authoritativeRecord;
        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        // Stage 4: After source leg commit fault injection check
        if (options._faultInjection === 'AFTER_SOURCE_COMMITTED' || options._faultInjection === 'AFTER_SOURCE_COMMIT' || options._faultInjection === 'STAGE_4') {
            throw new Error('FAULT_INJECTED: Crash after source leg committed');
        }

        // Write Phase 4: Commit Destination Leg
        const evtDst = createAuditEvent({
            lastEvent,
            eventType: AuditEventType.TRANSACTION_POSTED,
            entityId: destTxn.id,
            payload: destTxn,
            actor: options.actor || AuditActor.USER,
            source: options.source || AuditSource.MANUAL
        });
        envelope.transactions.push(destTxn);
        envelope.auditLog.push(evtDst);

        authoritativeRecord.state = CrossBookWALState.COMMITTED;
        authoritativeRecord.updatedAt = new Date().toISOString();
        envelope.preparedOperation = authoritativeRecord;
        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        // Stage 5: After destination leg commit fault injection check
        if (options._faultInjection === 'AFTER_DEST_COMMITTED' || options._faultInjection === 'AFTER_COMMITTED' || options._faultInjection === 'STAGE_5') {
            throw new Error('FAULT_INJECTED: Crash after destination leg committed');
        }

        // Write Phase 5: Complete & clear WAL
        envelope.preparedOperation = null;
        envelope.checksum = computeEnvelopeChecksum(envelope);
        await StorageService.save(key, envelope);

        // Stage 6: Before ack fault injection check
        if (options._faultInjection === 'BEFORE_ACK' || options._faultInjection === 'STAGE_6') {
            throw new Error('FAULT_INJECTED: Crash before final ack');
        }

        return { sourceTxn, destTxn };
    },

    /**
     * Executes controlled representative production data migration to V3.
     */
    migrateToV3: async (legacyPayload, options = {}) => {
        return CashbookMigrationEngine.migrateToV3(legacyPayload, options);
    },

    /**
     * Rolls back a migration from a verified pre-migration snapshot.
     */
    rollbackMigration: async (snapshotKey, options = {}) => {
        const mode = options.mode || await CashbookRepository.getMode();
        return CashbookMigrationEngine.rollbackMigration(snapshotKey, mode);
    },

    /**
     * Dangerously resets production or demo ledger (test/development utility only).
     */
    clearLedger: async (mode) => {
        const targetMode = mode || await CashbookRepository.getMode();
        const key = CashbookRepository._getStorageKey(targetMode);
        const genesisRootKey = CashbookRepository._getGenesisRootKey(targetMode);

        await StorageService.delete(genesisRootKey);

        if (targetMode === CashbookAppMode.DEMO) {
            await StorageService.delete(key);
            return null;
        }
        const empty = createEmptyEnvelope();
        await StorageService.save(key, empty);
        return empty;
    }
};
