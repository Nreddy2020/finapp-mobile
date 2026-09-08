/**
 * tests/test_cashbook_fault_injection.mjs
 * 
 * Gate 2 & Gate 3 Verification Suite:
 * - Crash recovery and write-ahead log (WAL) protocol
 * - Checksum mismatch and persistence envelope corruption
 * - Out-of-band genesis root pin tamper detection
 * - Orphan transfer leg and partial transfer detection
 * - Fail-closed storage error handling
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
import { validateTransferPairContinuity } from '../services/cashbook/cashbookValidator.js';
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

async function runFaultInjectionTests() {
    console.log('--- START TEST SUITE: FAULT INJECTION & RECOVERY (GATES 2 & 3) ---');

    // 1. Crash recovery: Process interrupted after PREPARED transfer write
    await checkAsync('WAL recovery: Interrupted write with PREPARED operation successfully completes or rolls forward', async () => {
        await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);

        const a1 = createAccount({ id: 'rec_a1', name: 'Bank 1', type: AccountType.BANK });
        const a2 = createAccount({ id: 'rec_a2', name: 'Bank 2', type: AccountType.BANK });
        await CashbookRepository.saveAccount(a1, { mode: CashbookAppMode.PRODUCTION });
        await CashbookRepository.saveAccount(a2, { mode: CashbookAppMode.PRODUCTION });

        const key = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
        const rawEnvelope = await StorageService.load(key);

        // Simulate crash right after writing PREPARED operation (before transaction was appended)
        const pendingTransfer = createTransferRecord({
            id: 'tr_interrupted_1',
            sourceAccountId: 'rec_a1',
            destinationAccountId: 'rec_a2',
            amount: rupeesToMoneyPaise(2500),
            date: '2026-09-05'
        });

        rawEnvelope.preparedOperation = {
            operationId: 'prep_crash_test_1',
            operationType: 'TRANSFER_POST',
            state: 'PREPARED',
            payload: pendingTransfer
        };
        await StorageService.save(key, rawEnvelope);

        // Call load() - repository should detect prepared operation, validate, and recover
        const recovered = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(recovered.preparedOperation, null);
        assert.strictEqual(recovered.transactions.some(t => t.id === 'tr_interrupted_1'), true);
        const recTxn = recovered.transactions.find(t => t.id === 'tr_interrupted_1');
        assert.strictEqual(recTxn.amount.paise, '250000');
    });

    // 2. Corrupted prepared operation payload rolls back without corrupting ledger
    await checkAsync('WAL rollback: Corrupted prepared operation payload safely discards without injecting bad state', async () => {
        const key = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
        const rawEnvelope = await StorageService.load(key);

        // Inject invalid prepared operation (missing destinationAccountId)
        rawEnvelope.preparedOperation = {
            operationId: 'prep_crash_corrupt',
            operationType: 'TRANSFER_POST',
            state: 'PREPARED',
            payload: { id: 'corrupt_txn', transactionType: TransactionType.TRANSFER, amount: { paise: '100' } }
        };
        await StorageService.save(key, rawEnvelope);

        const recovered = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(recovered.preparedOperation, null);
        assert.strictEqual(recovered.transactions.some(t => t.id === 'corrupt_txn'), false);
    });

    // 3. Envelope checksum mismatch detection
    await checkAsync('Checksum tamper detection: Raw payload alteration triggers fail-closed checksum error', async () => {
        const key = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
        const rawEnvelope = await StorageService.load(key);

        // Tamper with transaction amount behind the back of repository without updating checksum
        assert.ok(rawEnvelope.transactions.length > 0);
        rawEnvelope.transactions[0].amount.paise = '9999999999';
        await StorageService.save(key, rawEnvelope);

        let errorTriggered = false;
        try {
            await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION, failOnChecksumMismatch: true });
        } catch (err) {
            errorTriggered = true;
            assert.ok(err.message.includes('ENVELOPE_CHECKSUM_MISMATCH'));
        }
        assert.strictEqual(errorTriggered, true);
    });

    // 4. Out-of-band Genesis Pin Tamper Detection
    await checkAsync('Genesis pin protection: Fabricated replacement audit log rejected against pinned genesis root', async () => {
        await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);

        const acc = createAccount({ id: 'gen_acc', name: 'Safe Bank', type: AccountType.BANK });
        await CashbookRepository.saveAccount(acc, { mode: CashbookAppMode.PRODUCTION });
        await CashbookRepository.saveTransaction(createOpeningBalanceRecord({
            id: 'op_gen_1',
            accountId: 'gen_acc',
            amount: rupeesToMoneyPaise(10000)
        }), { mode: CashbookAppMode.PRODUCTION });

        // First load pins the legitimate genesis hash
        const originalEnv = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.ok(originalEnv.auditLog.length > 0);
        const legitimateGenesis = originalEnv.auditLog[0].eventHash;

        // Attacker alters genesis event hash inside storage envelope
        originalEnv.auditLog[0].eventHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
        const key = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
        await StorageService.save(key, originalEnv);

        // Reconcile must detect genesis pin mismatch
        const rec = await CashbookRepository.reconcile({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(rec.isGenesisPinValid, false);
        assert.strictEqual(rec.isAuditValid, false);
        assert.ok(rec.auditReason.includes('Pinned genesis hash mismatch'));
    });

    // 5. Orphan transfer leg detection
    check('Orphan transfer leg detection: validateTransferPairContinuity catches broken transfer groups', () => {
        // Single leg with no counterpart
        const orphanLegs = [
            {
                id: 'orphan_leg_1',
                transactionType: TransactionType.EXPENSE,
                transferGroupId: 'grp_split_1',
                amount: rupeesToMoneyPaise(5000),
                status: TransactionStatus.POSTED
            }
        ];

        let orphanCaught = false;
        try {
            validateTransferPairContinuity(orphanLegs);
        } catch (err) {
            orphanCaught = true;
            assert.ok(err.message.includes('Orphan transfer leg detected'));
        }
        assert.strictEqual(orphanCaught, true);

        // Two legs with mismatched amounts
        const mismatchedLegs = [
            {
                id: 'leg_1',
                transactionType: TransactionType.EXPENSE,
                transferGroupId: 'grp_split_2',
                amount: { paise: '500000' },
                status: TransactionStatus.POSTED
            },
            {
                id: 'leg_2',
                transactionType: TransactionType.INCOME,
                transferGroupId: 'grp_split_2',
                amount: { paise: '600000' },
                status: TransactionStatus.POSTED
            }
        ];

        let mismatchCaught = false;
        try {
            validateTransferPairContinuity(mismatchedLegs);
        } catch (err) {
            mismatchCaught = true;
            assert.ok(err.message.includes('Mismatched transfer pair amounts'));
        }
        assert.strictEqual(mismatchCaught, true);
    });

    console.log(`--- FAULT INJECTION & RECOVERY SUITE PASSED (${totalChecks} assertions) ---\n`);
}

runFaultInjectionTests().catch(err => {
    console.error('FATAL in test_cashbook_fault_injection:', err);
    process.exit(1);
});
