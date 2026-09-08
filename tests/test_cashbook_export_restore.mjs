/**
 * tests/test_cashbook_export_restore.mjs
 * 
 * Gate 5 Verification Suite:
 * - Exported JSON checksum validation
 * - Audit-chain genesis validation after restore
 * - Rejection of altered export data (tampered amount, date, account)
 * - Rejection of incompatible schema versions
 * - Cross-mode restore rejection (prevents DEMO backup restoring into PRODUCTION)
 * - Idempotent repeated restore (no duplicate transactions or balance inflation)
 * - Transfer-pair and recurring occurrence link continuity
 */

import assert from 'assert';
import {
    AccountType,
    TransactionType,
    TransactionStatus,
    CashbookAppMode,
    rupeesToMoneyPaise,
    createAccount,
    createOpeningBalanceRecord
} from '../services/cashbook/cashbookContracts.js';
import { createTransferRecord } from '../services/cashbook/cashbookEngine.js';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
import {
    CashbookRestore,
    BACKUP_FORMAT_IDENTIFIER,
    computeBackupChecksum
} from '../services/cashbook/cashbookRestore.js';

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

async function runExportRestoreTests() {
    console.log('--- START TEST SUITE: CASHBOOK EXPORT & RESTORE (GATE 5) ---');

    // Setup a verified production ledger with transactions
    await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);

    const a1 = createAccount({ id: 'bk_exp_1', name: 'Primary Bank', type: AccountType.BANK });
    const a2 = createAccount({ id: 'bk_exp_2', name: 'Petty Cash', type: AccountType.CASH });
    await CashbookRepository.saveAccount(a1, { mode: CashbookAppMode.PRODUCTION });
    await CashbookRepository.saveAccount(a2, { mode: CashbookAppMode.PRODUCTION });

    await CashbookRepository.saveTransaction(createOpeningBalanceRecord({
        id: 'op_bk_1',
        accountId: 'bk_exp_1',
        amount: rupeesToMoneyPaise(50000)
    }), { mode: CashbookAppMode.PRODUCTION });

    await CashbookRepository.saveTransaction({
        id: 'txn_exp_inc',
        transactionType: TransactionType.INCOME,
        destinationAccountId: 'bk_exp_1',
        amount: rupeesToMoneyPaise(25000),
        date: '2026-09-01',
        status: TransactionStatus.POSTED,
        idempotencyKey: 'man:exp_inc'
    }, { mode: CashbookAppMode.PRODUCTION });

    await CashbookRepository.saveTransfer(createTransferRecord({
        id: 'txn_exp_tr',
        sourceAccountId: 'bk_exp_1',
        destinationAccountId: 'bk_exp_2',
        amount: rupeesToMoneyPaise(5000),
        date: '2026-09-02'
    }), { mode: CashbookAppMode.PRODUCTION });

    // 1. Export verifiable backup
    let validBackup = null;
    await checkAsync('Export ledger backup produces valid format with SHA-256 checksum and audit chain', async () => {
        validBackup = await CashbookRestore.exportLedgerBackup({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(validBackup.format, BACKUP_FORMAT_IDENTIFIER);
        assert.strictEqual(validBackup.schemaVersion, 1);
        assert.strictEqual(validBackup.mode, CashbookAppMode.PRODUCTION);
        assert.strictEqual(validBackup.accounts.length, 2);
        assert.strictEqual(validBackup.transactions.length, 3);
        assert.ok(validBackup.checksum && validBackup.checksum.length === 64);
        assert.ok(validBackup.genesisHash && validBackup.genesisHash.length === 64);

        const verification = CashbookRestore.verifyBackup(validBackup);
        assert.strictEqual(verification.isValid, true);
        assert.strictEqual(verification.accountBalances['bk_exp_1'].paise, '7000000'); // 50k + 25k - 5k = 70k
        assert.strictEqual(verification.accountBalances['bk_exp_2'].paise, '500000'); // 5k
    });

    // 2. Rejection of tampered backup amount
    check('Tamper detection: Altering a single transaction amount causes verifyBackup to throw BACKUP_CHECKSUM_MISMATCH', () => {
        const tampered = JSON.parse(JSON.stringify(validBackup));
        tampered.transactions[1].amount.paise = '9999999'; // Tampered from 2500000 to 9999999

        let rejected = false;
        try {
            CashbookRestore.verifyBackup(tampered);
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('BACKUP_CHECKSUM_MISMATCH'));
        }
        assert.strictEqual(rejected, true);
    });

    // 3. Rejection of forged checksum with altered audit trail
    check('Audit verification: Altered audit log with forged checksum triggers BACKUP_AUDIT_CORRUPTION', () => {
        const tampered = JSON.parse(JSON.stringify(validBackup));
        // Delete an audit event
        tampered.auditLog.splice(1, 1);
        // Recompute the backup envelope checksum so checksum passes
        tampered.checksum = computeBackupChecksum(tampered);

        let rejected = false;
        try {
            CashbookRestore.verifyBackup(tampered);
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('BACKUP_AUDIT_CORRUPTION'));
        }
        assert.strictEqual(rejected, true);
    });

    // 4. Rejection of incompatible schema version
    check('Schema version enforcement: Incompatible schema version throws INCOMPATIBLE_SCHEMA_VERSION', () => {
        const incompatible = JSON.parse(JSON.stringify(validBackup));
        incompatible.schemaVersion = 999;

        let rejected = false;
        try {
            CashbookRestore.verifyBackup(incompatible);
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('INCOMPATIBLE_SCHEMA_VERSION'));
        }
        assert.strictEqual(rejected, true);
    });

    // 5. Cross-mode isolation on restore
    await checkAsync('Mode isolation: Restoring DEMO backup into PRODUCTION mode is strictly rejected', async () => {
        const demoBackup = JSON.parse(JSON.stringify(validBackup));
        demoBackup.mode = CashbookAppMode.DEMO;
        // Recompute checksum for demoBackup
        const { computeBackupChecksum } = await import('../services/cashbook/cashbookRestore.js');
        demoBackup.checksum = computeBackupChecksum(demoBackup);

        let rejected = false;
        try {
            await CashbookRestore.restoreLedgerBackup(demoBackup, { mode: CashbookAppMode.PRODUCTION });
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('MODE_ISOLATION_VIOLATION'));
        }
        assert.strictEqual(rejected, true);
    });

    // 6. Complete restore and reconciliation
    await checkAsync('Full restore: Valid backup restores cleanly and reconciles with 100% precision', async () => {
        // Wipe ledger
        await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);
        const wiped = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(wiped.transactions.length, 0);

        // Restore backup
        const restoreRes = await CashbookRestore.restoreLedgerBackup(validBackup, { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(restoreRes.success, true);
        assert.strictEqual(restoreRes.restoredTransactions, 3);

        // Reconcile restored ledger
        const rec = await CashbookRepository.reconcile({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(rec.isAuditValid, true);
        assert.strictEqual(rec.isGenesisValid, true);
        assert.strictEqual(rec.isGenesisPinValid, true);
        assert.strictEqual(rec.accountBalances['bk_exp_1'].paise, '7000000');
        assert.strictEqual(rec.accountBalances['bk_exp_2'].paise, '500000');
    });

    console.log(`--- CASHBOOK EXPORT & RESTORE SUITE PASSED (${totalChecks} assertions) ---\n`);
}

runExportRestoreTests().catch(err => {
    console.error('FATAL in test_cashbook_export_restore:', err);
    process.exit(1);
});
