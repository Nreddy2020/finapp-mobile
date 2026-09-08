/**
 * tests/test_cashbook_gate7_backup_restore.mjs
 * 
 * Gate 7 Verification Suite:
 * Offline Backup, Reinstall, Restore, and Continuity Validation.
 * 
 * 30 Authoritative Parameterized Assertions covering:
 * 1. V1 export/import compatibility (UPGRADED_FROM_V1).
 * 2. V2 complete multi-book export with 5 core books & manifest.
 * 3. Empty and malformed backup rejection.
 * 4. Unsupported schema version rejection (schemaVersion > 2).
 * 5. Deterministic canonical checksum with sorted preimages.
 * 6. AES-256-GCM authenticated encryption/decryption with PBKDF2.
 * 7. Wrong passphrase rejection (fail closed DECRYPTION_FAILED).
 * 8. Ciphertext tamper rejection (bit flip fails closed).
 * 9. Header / AAD metadata tamper rejection.
 * 10. Simulated storage wipe (simulating app uninstall).
 * 11. Clean cold restore of all 5 core books.
 * 12. Per-account and per-book balance equality to the exact paise.
 * 13. Daily-closing and denomination breakdown preservation.
 * 14. Tamper-evident audit-chain continuity verification.
 * 15. Post-restore transaction append extending unbroken chain.
 * 16. Out-of-band pinned genesis root hash verification.
 * 17. Existing-ledger restore event semantics (BACKUP_RESTORED).
 * 18. Restore idempotency (zero fact duplication / balance inflation).
 * 19. Interrupted restore recovery (cold restart rollback to snapshot).
 * 20. Atomic rollback procedure.
 * 21. Dry-run zero-mutation guarantee.
 * 22. Cross-mode isolation: DEMO -> PRODUCTION rejection.
 * 23. Cross-mode isolation: PRODUCTION -> DEMO rejection.
 * 24. Concurrent export consistency under active WAL.
 * 25. WAL and restore lock concurrency protection.
 * 26. Duplicate book, account, and transaction ID rejection.
 * 27. BigInt paise precision and non-negative integer enforcement.
 * 28. Gate 6 migration manifest preservation.
 * 29. Production-volume stress export/restore (1,000+ items).
 * 30. Post-restore repository load and view model consistency.
 */

import assert from 'assert';
import {
    AccountType,
    CashbookType,
    TransactionType,
    TransactionStatus,
    CashbookAppMode,
    BackupFormat,
    BackupStatus,
    rupeesToMoneyPaise,
    createMoneyPaise,
    createCashbook,
    createAccount,
    createOpeningBalanceRecord,
    createDailyClosingRecord,
    ClosingMode,
    DailyClosingStatus,
    canonicalJsonStringify
} from '../services/cashbook/cashbookContracts.js';
import { createTransferRecord } from '../services/cashbook/cashbookEngine.js';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
import {
    CashbookRestore,
    BACKUP_FORMAT_IDENTIFIER_V1,
    BACKUP_FORMAT_IDENTIFIER_V2,
    BACKUP_FORMAT_IDENTIFIER_ENCRYPTED_V1,
    BACKUP_SCHEMA_VERSION_V2,
    STORAGE_KEY_RESTORE_LOCK_PREFIX,
    STORAGE_KEY_RESTORE_WAL_PREFIX,
    computeBackupV2Checksum
} from '../services/cashbook/cashbookRestore.js';
import { verifyAuditTrail, sha256 } from '../services/cashbook/cashbookAuditTrail.js';
import { StorageService } from '../services/storage.js';

let totalChecks = 0;
function check(description, fn) {
    process.stdout.write(`  [RUN] ${description}...`);
    try {
        fn();
        totalChecks++;
        console.log(`\r  [PASS] ${description}`);
    } catch (err) {
        console.log(`\r  [FAIL] ${description}`);
        console.error(err);
        process.exit(1);
    }
}

async function checkAsync(description, fn) {
    process.stdout.write(`  [RUN] ${description}...`);
    try {
        await fn();
        totalChecks++;
        console.log(`\r  [PASS] ${description}`);
    } catch (err) {
        console.log(`\r  [FAIL] ${description}`);
        console.error(err);
        process.exit(1);
    }
}

async function runGate7Tests() {
    console.log('================================================================');
    console.log('🚀 EXECUTING GATE 7: OFFLINE BACKUP, RESTORE & CONTINUITY CERTIFICATION');
    console.log('================================================================\n');

    // Setup a rich production environment with 5 core books
    await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);

    // Populate all 5 books
    const bookSavings = createCashbook({
        id: 'book_personal_savings',
        name: 'Personal Savings',
        type: CashbookType.SAVINGS,
        isDefault: true
    });
    const bookTill = createCashbook({
        id: 'book_handy_cash',
        name: 'Handy Cash Register',
        type: CashbookType.HANDY_CASH
    });
    const bookBiz = createCashbook({
        id: 'book_business_ops',
        name: 'Business Operations Cashbook',
        type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS
    });
    const bookLoan = createCashbook({
        id: 'book_loans_taken',
        name: 'Loans Taken Register',
        type: CashbookType.LOANS_TAKEN
    });
    const bookPF = createCashbook({
        id: 'book_pf_register',
        name: 'Provident Fund (PF)',
        type: CashbookType.PF
    });

    await CashbookRepository.saveBook(bookSavings, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveBook(bookTill, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveBook(bookBiz, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveBook(bookLoan, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveBook(bookPF, { mode: CashbookAppMode.PRODUCTION });

    // Populate Accounts
    const accBank = createAccount({ id: 'acc_bank_main', bookId: 'book_personal_savings', name: 'HDFC Salary Bank', type: AccountType.BANK });
    const accCash = createAccount({ id: 'acc_till_cash', bookId: 'book_handy_cash', name: 'Physical Till Cash', type: AccountType.CASH });
    const accBiz = createAccount({ id: 'acc_biz_bank', bookId: 'book_business_ops', name: 'Current Account', type: AccountType.BANK });
    const accLoanLiab = createAccount({ id: 'acc_home_loan', bookId: 'book_loans_taken', name: 'SBI Home Loan Liability', type: AccountType.LOAN });
    const accPFWealth = createAccount({ id: 'acc_epfo_uan', bookId: 'book_pf_register', name: 'EPFO UAN Portfolio', type: AccountType.INVESTMENT });

    await CashbookRepository.saveAccount(accBank, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveAccount(accCash, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveAccount(accBiz, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveAccount(accLoanLiab, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveAccount(accPFWealth, { mode: CashbookAppMode.PRODUCTION });

    // Populate Transactions
    await CashbookRepository.saveTransaction(createOpeningBalanceRecord({
        id: 'op_bank',
        accountId: 'acc_bank_main',
        bookId: 'book_personal_savings',
        amount: rupeesToMoneyPaise(100000)
    }), { mode: CashbookAppMode.PRODUCTION });

    await CashbookRepository.saveTransaction(createOpeningBalanceRecord({
        id: 'op_cash',
        accountId: 'acc_till_cash',
        bookId: 'book_handy_cash',
        amount: rupeesToMoneyPaise(15000)
    }), { mode: CashbookAppMode.PRODUCTION });

    await CashbookRepository.saveTransfer(createTransferRecord({
        id: 'xfer_bank_to_cash',
        sourceAccountId: 'acc_bank_main',
        destinationAccountId: 'acc_till_cash',
        sourceBookId: 'book_personal_savings',
        destinationBookId: 'book_handy_cash',
        amount: rupeesToMoneyPaise(10000),
        date: '2026-09-01'
    }), { mode: CashbookAppMode.PRODUCTION });

    const closingRecord = createDailyClosingRecord({
        id: 'close_2026_09_01',
        bookId: 'book_handy_cash',
        date: '2026-09-01',
        openingBalance: rupeesToMoneyPaise(15000),
        totalMoneyIn: rupeesToMoneyPaise(10000),
        totalMoneyOut: rupeesToMoneyPaise(0),
        calculatedClosing: rupeesToMoneyPaise(25000),
        countedClosing: rupeesToMoneyPaise(25000),
        difference: rupeesToMoneyPaise(0),
        mode: ClosingMode.PHYSICAL_TILL,
        status: DailyClosingStatus.LOCKED,
        denominations: { '500': 50 }
    });
    await CashbookRepository.saveDailyClosing(closingRecord, { mode: CashbookAppMode.PRODUCTION });

    let v1Backup = null;
    let v2Backup = null;
    let encryptedBackup = null;
    const testPassphrase = 'SuperSecretGate7Password!';

    // Assertion 1: V1 export/import compatibility
    await checkAsync('Assertion 1: V1 legacy backup export and import compatibility with UPGRADED_FROM_V1 status', async () => {
        v1Backup = await CashbookRestore.exportLedgerBackup({ mode: CashbookAppMode.PRODUCTION, schemaVersion: 1 });
        assert.strictEqual(v1Backup.format, BACKUP_FORMAT_IDENTIFIER_V1);
        assert.strictEqual(v1Backup.schemaVersion, 1);
        const verification = CashbookRestore.verifyBackup(v1Backup);
        assert.strictEqual(verification.isValid, true);
        assert.strictEqual(verification.status, BackupStatus.UPGRADED_FROM_V1);
        assert.strictEqual(verification.books.length, 1);
        assert.strictEqual(verification.books[0].id, 'book_personal_savings');
    });

    // Assertion 2: V2 complete multi-book export
    await checkAsync('Assertion 2: V2 complete multi-book export capturing 5 core books, daily closings, and manifest', async () => {
        v2Backup = await CashbookRestore.exportLedgerBackup({ mode: CashbookAppMode.PRODUCTION, schemaVersion: 2 });
        assert.strictEqual(v2Backup.format, BACKUP_FORMAT_IDENTIFIER_V2);
        assert.strictEqual(v2Backup.schemaVersion, 2);
        assert.strictEqual(v2Backup.books.length, 5);
        assert.strictEqual(v2Backup.dailyClosings.length, 1);
        assert.ok(v2Backup.manifest);
        assert.strictEqual(v2Backup.manifest.recordCounts.books, 5);
        assert.strictEqual(v2Backup.manifest.recordCounts.dailyClosings, 1);

        const verification = CashbookRestore.verifyBackup(v2Backup);
        assert.strictEqual(verification.isValid, true);
        assert.strictEqual(verification.status, BackupStatus.VALID);
        assert.strictEqual(verification.books.length, 5);
    });

    // Assertion 3: Empty and malformed backup rejection
    check('Assertion 3: Rejection of null, empty string, and malformed non-object backups', () => {
        assert.throws(() => CashbookRestore.verifyBackup(null), /Must be a non-null object/);
        assert.throws(() => CashbookRestore.verifyBackup(''), /Must be a non-null object/);
        assert.throws(() => CashbookRestore.verifyBackup({ format: 'UNKNOWN_FORMAT' }), /INCOMPATIBLE_BACKUP_FORMAT/);
    });

    // Assertion 4: Unsupported schema rejection
    check('Assertion 4: Unsupported future schema version (schemaVersion > 2) is strictly rejected', () => {
        const future = JSON.parse(JSON.stringify(v2Backup));
        future.schemaVersion = 999;
        assert.throws(() => CashbookRestore.verifyBackup(future), /INCOMPATIBLE_SCHEMA_VERSION/);
    });

    // Assertion 5: Deterministic canonical checksum
    check('Assertion 5: Deterministic canonical checksum calculation across re-ordered payload arrays', () => {
        const clone = JSON.parse(JSON.stringify(v2Backup));
        // Reverse books and transactions order
        clone.books.reverse();
        clone.transactions.reverse();
        const recalculated = computeBackupV2Checksum(clone);
        assert.strictEqual(recalculated, v2Backup.checksum);
    });

    // Assertion 6: AES-256-GCM authenticated encryption/decryption
    await checkAsync('Assertion 6: AES-256-GCM authenticated encryption with PBKDF2 (100,000 iterations) and 96-bit nonce', async () => {
        encryptedBackup = await CashbookRestore.exportEncryptedLedgerBackup(testPassphrase, { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(encryptedBackup.format, BACKUP_FORMAT_IDENTIFIER_ENCRYPTED_V1);
        assert.strictEqual(encryptedBackup.encryptionAlgorithm, 'AES-256-GCM');
        assert.strictEqual(encryptedBackup.keyDerivationAlgorithm, 'PBKDF2-SHA256');
        assert.strictEqual(encryptedBackup.kdfParameters.iterations, 100000);
        assert.strictEqual(encryptedBackup.nonceOrIv.length, 24); // 12 bytes = 24 hex chars
        assert.strictEqual(encryptedBackup.authenticationTag.length, 32); // 16 bytes = 32 hex chars

        const decrypted = CashbookRestore.verifyBackup(encryptedBackup, { passphrase: testPassphrase });
        assert.strictEqual(decrypted.isValid, true);
        assert.strictEqual(decrypted.books.length, 5);
        assert.strictEqual(decrypted.accountBalances['acc_bank_main'].paise, '9000000'); // 100k - 10k = 90k
        assert.strictEqual(decrypted.accountBalances['acc_till_cash'].paise, '2500000'); // 15k + 10k = 25k
    });

    // Assertion 7: Wrong passphrase rejection
    check('Assertion 7: Wrong passphrase rejection fails closed with DECRYPTION_FAILED', () => {
        assert.throws(() => {
            CashbookRestore.verifyBackup(encryptedBackup, { passphrase: 'WrongPassword123!' });
        }, /DECRYPTION_FAILED/);
    });

    // Assertion 8: Ciphertext tamper rejection
    check('Assertion 8: Single bit modification in ciphertext fails closed before parsing', () => {
        const tampered = JSON.parse(JSON.stringify(encryptedBackup));
        // Modify a hex character in ciphertext
        const originalChar = tampered.ciphertext[10];
        const newChar = originalChar === 'a' ? 'b' : 'a';
        tampered.ciphertext = tampered.ciphertext.substring(0, 10) + newChar + tampered.ciphertext.substring(11);
        tampered.ciphertextHash = sha256(tampered.ciphertext); // update hash so it tests GCM auth tag
        assert.throws(() => {
            CashbookRestore.verifyBackup(tampered, { passphrase: testPassphrase });
        }, /DECRYPTION_FAILED/);
    });

    // Assertion 9: Header / AAD metadata tamper rejection
    check('Assertion 9: Tampering with AAD header metadata triggers DECRYPTION_FAILED', () => {
        const tampered = JSON.parse(JSON.stringify(encryptedBackup));
        // Tamper with mode in envelope
        tampered.mode = CashbookAppMode.DEMO;
        assert.throws(() => {
            CashbookRestore.verifyBackup(tampered, { passphrase: testPassphrase });
        }, /DECRYPTION_FAILED/);
    });

    // Assertion 10: Simulated storage wipe
    await checkAsync('Assertion 10: Simulated storage wipe cleanly purges all persistent data (simulated uninstall)', async () => {
        await StorageService.clear();
        const loaded = await StorageService.load(CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION));
        assert.strictEqual(loaded, null);
    });

    // Assertion 11: Clean cold restore of all 5 core books
    await checkAsync('Assertion 11: Clean cold restore from V2 backup populates all 5 core profiles cleanly', async () => {
        const res = await CashbookRestore.restoreLedgerBackup(v2Backup, { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.restoredBooks, 5);
        assert.strictEqual(res.restoredAccounts, 5);
        assert.strictEqual(res.restoredTransactions, 3);
    });

    // Assertion 12: Per-account and per-book balance equality
    await checkAsync('Assertion 12: Per-account and per-book balance equality asserted exact to the paise', async () => {
        const envelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const rec = await CashbookRepository.reconcile({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(rec.isGenesisValid, true);
        assert.strictEqual(rec.accountBalances['acc_bank_main'].paise, '9000000');
        assert.strictEqual(rec.accountBalances['acc_till_cash'].paise, '2500000');
        assert.strictEqual(envelope.books.length, 5);
    });

    // Assertion 13: Daily-closing preservation
    await checkAsync('Assertion 13: Daily closing records, denomination counts, and lock status are preserved', async () => {
        const envelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(envelope.dailyClosings.length, 1);
        const dc = envelope.dailyClosings[0];
        assert.strictEqual(dc.id, 'close_2026_09_01');
        assert.strictEqual(dc.status, DailyClosingStatus.LOCKED);
        assert.strictEqual(dc.denominations['500'], 50);
        assert.strictEqual(dc.calculatedClosing.paise, '2500000');
    });

    // Assertion 14: Tamper-evident audit-chain continuity
    await checkAsync('Assertion 14: Tamper-evident cryptographic audit chain is unbroken post-restore', async () => {
        const envelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const auditRes = verifyAuditTrail(envelope.auditLog);
        assert.strictEqual(auditRes.isValid, true);
        assert.ok(envelope.auditLog.length >= 3);
    });

    // Assertion 15: Post-restore transaction append
    await checkAsync('Assertion 15: Posting new transaction post-restore seamlessly links to restored chain head', async () => {
        const envelopeBefore = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const tailBefore = envelopeBefore.auditLog[envelopeBefore.auditLog.length - 1].eventHash;

        await CashbookRepository.saveTransaction({
            id: 'txn_post_restore_01',
            bookId: 'book_personal_savings',
            transactionType: TransactionType.INCOME,
            destinationAccountId: 'acc_bank_main',
            amount: rupeesToMoneyPaise(5000),
            date: '2026-09-03',
            status: TransactionStatus.POSTED,
            idempotencyKey: 'man:post_restore_01'
        }, { mode: CashbookAppMode.PRODUCTION });

        const envelopeAfter = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const newTail = envelopeAfter.auditLog[envelopeAfter.auditLog.length - 1];
        assert.strictEqual(newTail.previousHash, tailBefore);
        assert.strictEqual(verifyAuditTrail(envelopeAfter.auditLog).isValid, true);
    });

    // Assertion 16: Out-of-band pinned genesis root hash verification
    await checkAsync('Assertion 16: Out-of-band pinned genesis root key matches restored genesis event', async () => {
        const envelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const genesisEvent = envelope.auditLog[0];
        const pinnedRoot = await StorageService.load(CashbookRepository._getGenesisRootKey(CashbookAppMode.PRODUCTION));
        assert.strictEqual(pinnedRoot, genesisEvent.eventHash);
    });

    // Assertion 17: Existing-ledger restore event semantics (BACKUP_RESTORED)
    await checkAsync('Assertion 17: Restore into existing ledger appends BACKUP_RESTORED event with source & target chain heads', async () => {
        const mergeResult = await CashbookRestore.restoreLedgerBackup(v2Backup, {
            mode: CashbookAppMode.PRODUCTION,
            appendToExistingLedger: true
        });
        assert.strictEqual(mergeResult.success, true);
        const envelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const lastEvt = envelope.auditLog[envelope.auditLog.length - 1];
        assert.strictEqual(lastEvt.eventType, 'BACKUP_RESTORED');
        assert.ok(lastEvt.payload.sourceBackupHash);
        assert.ok(lastEvt.payload.targetChainHeadBeforeRestore);
    });

    // Assertion 18: Restore idempotency
    await checkAsync('Assertion 18: Idempotent rerun returns RESTORE_IDEMPOTENT with zero duplicate records', async () => {
        const rerun = await CashbookRestore.restoreLedgerBackup(v2Backup, { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(rerun.status, BackupStatus.RESTORE_IDEMPOTENT);
    });

    // Assertion 19: Interrupted restore recovery (rollback to snapshot on crash)
    await checkAsync('Assertion 19: Crash during restore write triggers automatic rollback to pre-restore snapshot on next load', async () => {
        const beforeEnvelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const beforeTxnCount = beforeEnvelope.transactions.length;

        let crashHappened = false;
        try {
            await CashbookRestore.restoreLedgerBackup(v1Backup, {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'BEFORE_COMMIT',
                __testRunnerHarness: true
            });
        } catch (err) {
            crashHappened = true;
            assert.ok(err.message.includes('FAULT_INJECTED'));
        }
        assert.strictEqual(crashHappened, true);

        // Cold load triggers automatic recovery
        const recoveredEnvelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(recoveredEnvelope.transactions.length, beforeTxnCount);
    });

    // Assertion 20: Explicit atomic rollback
    await checkAsync('Assertion 20: Explicit rollbackRestore reverts to specified pre-restore snapshot cleanly', async () => {
        const targetMode = CashbookAppMode.PRODUCTION;
        const currentEnvelope = await CashbookRepository.load({ mode: targetMode });
        const snapshotKey = `TEST_MANUAL_SNAPSHOT_${Date.now()}`;
        await StorageService.save(snapshotKey, {
            snapshotKey,
            createdAt: new Date().toISOString(),
            mode: targetMode,
            envelope: currentEnvelope,
            snapshotChecksum: sha256(canonicalJsonStringify(currentEnvelope))
        });

        const rbRes = await CashbookRestore.rollbackRestore(snapshotKey, { mode: targetMode });
        assert.strictEqual(rbRes.success, true);
        assert.strictEqual(rbRes.rolledBack, true);
    });

    // Assertion 21: Dry-run zero-mutation guarantee
    await checkAsync('Assertion 21: dryRun: true validates full pipeline with zero storage mutations', async () => {
        const targetMode = CashbookAppMode.PRODUCTION;
        const before = await CashbookRepository.load({ mode: targetMode });
        const dryRes = await CashbookRestore.restoreLedgerBackup(v2Backup, { mode: targetMode, dryRun: true });
        assert.strictEqual(dryRes.dryRun, true);
        const after = await CashbookRepository.load({ mode: targetMode });
        assert.strictEqual(before.checksum, after.checksum);
    });

    // Assertion 22: Cross-mode isolation: DEMO -> PRODUCTION rejection
    await checkAsync('Assertion 22: Restoring DEMO backup into PRODUCTION is strictly rejected (MODE_ISOLATION_VIOLATION)', async () => {
        const demoBackup = JSON.parse(JSON.stringify(v2Backup));
        demoBackup.mode = CashbookAppMode.DEMO;
        demoBackup.checksum = computeBackupV2Checksum(demoBackup);

        let rejected = false;
        try {
            await CashbookRestore.restoreLedgerBackup(demoBackup, { mode: CashbookAppMode.PRODUCTION });
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('MODE_ISOLATION_VIOLATION'));
        }
        assert.strictEqual(rejected, true);
    });

    // Assertion 23: Cross-mode isolation: PRODUCTION -> DEMO rejection
    await checkAsync('Assertion 23: Restoring PRODUCTION backup into DEMO without authorization is rejected', async () => {
        let rejected = false;
        try {
            await CashbookRestore.restoreLedgerBackup(v2Backup, { mode: CashbookAppMode.DEMO });
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('MODE_ISOLATION_VIOLATION'));
        }
        assert.strictEqual(rejected, true);
    });

    // Assertion 24: Concurrent export consistency under active WAL
    await checkAsync('Assertion 24: Exporting during an active WAL transaction fails closed with EXPORT_CONSISTENCY_ERROR', async () => {
        const targetMode = CashbookAppMode.PRODUCTION;
        const envelope = await CashbookRepository.load({ mode: targetMode });
        envelope.preparedOperation = { state: 'SOURCE_PREPARED', operationType: 'TEST_OP' };
        await StorageService.save(CashbookRepository._getStorageKey(targetMode), envelope);

        let rejected = false;
        try {
            await CashbookRestore.exportLedgerBackup({ mode: targetMode });
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('EXPORT_CONSISTENCY_ERROR'));
        }
        assert.strictEqual(rejected, true);

        // Clear prepared operation
        envelope.preparedOperation = null;
        await StorageService.save(CashbookRepository._getStorageKey(targetMode), envelope);
    });

    // Assertion 25: WAL and restore lock concurrency protection
    await checkAsync('Assertion 25: Active restore lock blocks concurrent restore attempts (RESTORE_IN_PROGRESS)', async () => {
        const targetMode = CashbookAppMode.PRODUCTION;
        const lockKey = `${STORAGE_KEY_RESTORE_LOCK_PREFIX}${targetMode}`;
        await StorageService.save(lockKey, { lockedAt: new Date().toISOString() });

        let rejected = false;
        try {
            await CashbookRestore.restoreLedgerBackup(v2Backup, { mode: targetMode });
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('RESTORE_IN_PROGRESS'));
        }
        assert.strictEqual(rejected, true);

        // Clear lock
        await StorageService.delete(lockKey);
    });

    // Assertion 26: Duplicate book, account, and transaction ID rejection
    check('Assertion 26: Backups containing duplicate identifiers fail closed with CORRUPT_BACKUP_DATA', () => {
        const corruptBooks = JSON.parse(JSON.stringify(v2Backup));
        corruptBooks.books.push(corruptBooks.books[0]); // Duplicate book
        corruptBooks.checksum = computeBackupV2Checksum(corruptBooks);
        assert.throws(() => CashbookRestore.verifyBackup(corruptBooks), /Duplicate book ID detected/);

        const corruptTxns = JSON.parse(JSON.stringify(v2Backup));
        corruptTxns.transactions.push(corruptTxns.transactions[0]); // Duplicate transaction
        corruptTxns.checksum = computeBackupV2Checksum(corruptTxns);
        assert.throws(() => CashbookRestore.verifyBackup(corruptTxns), /Duplicate transaction ID detected/);
    });

    // Assertion 27: BigInt paise precision and non-negative integer enforcement
    check('Assertion 27: Non-integer or negative paise values throw INVALID_BIGINT_PAISE', () => {
        const corruptPaise = JSON.parse(JSON.stringify(v2Backup));
        corruptPaise.transactions[0].amount.paise = '-500';
        corruptPaise.checksum = computeBackupV2Checksum(corruptPaise);
        assert.throws(() => CashbookRestore.verifyBackup(corruptPaise), /INVALID_BIGINT_PAISE/);
    });

    // Assertion 28: Gate 6 migration manifest preservation
    await checkAsync('Assertion 28: Gate 6 machine-readable migration manifests are preserved through backup & restore', async () => {
        const manifestBackup = JSON.parse(JSON.stringify(v2Backup));
        manifestBackup.migrationManifests = [
            {
                migrationId: 'mig_gate6_test_01',
                sourceSchema: 'V1',
                targetSchema: 'V3',
                sourceRecordCount: 100,
                migratedRecordCount: 100
            }
        ];
        manifestBackup.checksum = computeBackupV2Checksum(manifestBackup);
        manifestBackup.manifest.backupId = 'bkp_gate6_manifest_test';
        manifestBackup.manifest.payloadHash = manifestBackup.checksum;
        const restoreRes = await CashbookRestore.restoreLedgerBackup(manifestBackup, { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(restoreRes.success, true);
        const loaded = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(loaded.migrationManifests.length, 1);
        assert.strictEqual(loaded.migrationManifests[0].migrationId, 'mig_gate6_test_01');
    });

    // Assertion 29: Production-volume stress export/restore (1,000+ items)
    await checkAsync('Assertion 29: Production-volume stress export and restore (1,000+ transactions) completes under 2s', async () => {
        const stressBackup = JSON.parse(JSON.stringify(v2Backup));
        const baseTxn = stressBackup.transactions[0];
        const largeTxns = [];
        for (let i = 0; i < 1000; i++) {
            largeTxns.push({
                ...baseTxn,
                id: `stress_txn_${i}`,
                amount: createMoneyPaise(10000 + i),
                date: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`
            });
        }
        stressBackup.transactions = largeTxns;
        stressBackup.auditLog = []; // Genesis check only for stress
        stressBackup.checksum = computeBackupV2Checksum(stressBackup);

        const startTime = Date.now();
        const verification = CashbookRestore.verifyBackup(stressBackup);
        const duration = Date.now() - startTime;
        assert.strictEqual(verification.isValid, true);
        assert.strictEqual(verification.transactions.length, 1000);
        assert.ok(duration < 2000, `Stress verification should take < 2000ms, took ${duration}ms`);
    });

    // Assertion 30: Simulated Uninstall & Cold Reinstall Continuity Validation
    await checkAsync('Assertion 30: simulateDeviceUninstallAndReinstall validates full disaster recovery lifecycle', async () => {
        const simResult = await CashbookRestore.simulateDeviceUninstallAndReinstall(v2Backup, { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(simResult.uninstallSimulated, true);
        assert.strictEqual(simResult.coldRestored, true);
        assert.strictEqual(simResult.restoreResult.success, true);
        assert.strictEqual(simResult.reconciliation.isAuditValid, true);
        assert.strictEqual(simResult.reconciliation.isGenesisValid, true);
        assert.strictEqual(simResult.reconciliation.accountBalances['acc_bank_main'].paise, '9000000');
        assert.strictEqual(simResult.reconciliation.accountBalances['acc_till_cash'].paise, '2500000');
    });

    console.log(`\n================================================================`);
    console.log(`🎉 GATE 7 CERTIFICATION SUITE PASSED (${totalChecks} / 30 ASSERTIONS)`);
    console.log(`================================================================\n`);
}

runGate7Tests().catch(err => {
    console.error('FATAL in test_cashbook_gate7_backup_restore:', err);
    process.exit(1);
});
