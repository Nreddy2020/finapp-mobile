/**
 * tests/test_cashbook_repository.mjs
 * 
 * Test Suite 5: Repository Persistence Envelope, Strict Mode Isolation,
 * Write-Ahead Recovery for Interrupted Writes, and Auditable Exports.
 */

import assert from 'assert';
import { StorageService } from '../services/storage.js';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
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
import { CashbookExport } from '../services/cashbook/cashbookExport.js';

console.log('--- START TEST SUITE: CASHBOOK REPOSITORY & PERSISTENCE ---');
let assertionsPassed = 0;

async function itAsync(desc, fn) {
    await fn();
    assertionsPassed++;
    console.log(`  [PASS] ${desc}`);
}

async function runSuite() {
    // 1. Strict DEMO vs PRODUCTION Isolation
    await itAsync('Strict isolation: DEMO fixtures never contaminate PRODUCTION storage', async () => {
        // Clear both ledgers
        await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);
        await CashbookRepository.clearLedger(CashbookAppMode.DEMO);

        // Load DEMO mode
        const demoEnv = await CashbookRepository.load({ mode: CashbookAppMode.DEMO });
        assert.ok(demoEnv.accounts.length > 0);
        assert.ok(demoEnv.transactions.length > 0);

        // Load PRODUCTION mode
        const prodEnv = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(prodEnv.accounts.length, 0);
        assert.strictEqual(prodEnv.transactions.length, 0);
        assert.strictEqual(prodEnv.auditLog.length, 0);

        // Add account and transaction to PRODUCTION
        const prodAcc = createAccount({ id: 'prod_bank', name: 'Real HDFC', type: AccountType.BANK });
        await CashbookRepository.saveAccount(prodAcc, { mode: CashbookAppMode.PRODUCTION });

        const prodOpening = createOpeningBalanceRecord({
            id: 'prod_op',
            accountId: 'prod_bank',
            amount: rupeesToMoneyPaise(50000)
        });
        await CashbookRepository.saveTransaction(prodOpening, { mode: CashbookAppMode.PRODUCTION });

        // Verify PRODUCTION has 1 account and 1 transaction
        const prodReload = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(prodReload.accounts.length, 1);
        assert.strictEqual(prodReload.transactions.length, 1);

        // Verify DEMO was not overwritten or touched
        const demoReload = await CashbookRepository.load({ mode: CashbookAppMode.DEMO });
        assert.strictEqual(demoReload.accounts.some(a => a.id === 'prod_bank'), false);
    });

    // 2. Opening Balance Immutability Invariant
    await itAsync('Repository rejects multiple opening balances on same account or voiding opening balance', async () => {
        await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);
        const bank = createAccount({ id: 'acc_test', name: 'Test Bank', type: AccountType.BANK });
        await CashbookRepository.saveAccount(bank, { mode: CashbookAppMode.PRODUCTION });

        const open1 = createOpeningBalanceRecord({ id: 'open_01', accountId: 'acc_test', amount: rupeesToMoneyPaise(10000) });
        await CashbookRepository.saveTransaction(open1, { mode: CashbookAppMode.PRODUCTION });

        // Attempting to post a second opening balance must fail
        const open2 = createOpeningBalanceRecord({ id: 'open_02', accountId: 'acc_test', amount: rupeesToMoneyPaise(5000) });
        await assert.rejects(
            async () => await CashbookRepository.saveTransaction(open2, { mode: CashbookAppMode.PRODUCTION }),
            /already has an immutable opening balance record/
        );

        // Attempting to void the opening balance must fail
        await assert.rejects(
            async () => await CashbookRepository.voidTransaction('open_01', { voidReason: 'Testing' }, { mode: CashbookAppMode.PRODUCTION }),
            /OPENING_BALANCE records are immutable and cannot be voided/
        );
    });

    // 3. Atomic Transfer Posting via Write-Ahead Prepared Protocol
    await itAsync('saveTransfer posts transfer atomically with audit event and clears preparedOperation', async () => {
        const cash = createAccount({ id: 'acc_cash', name: 'Cash', type: AccountType.CASH });
        await CashbookRepository.saveAccount(cash, { mode: CashbookAppMode.PRODUCTION });

        const transfer = createTransferRecord({
            id: 'tr_atomic_1',
            sourceAccountId: 'acc_test',
            destinationAccountId: 'acc_cash',
            amount: rupeesToMoneyPaise(2000),
            date: '2026-09-02'
        });

        const saved = await CashbookRepository.saveTransfer(transfer, { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(saved.id, 'tr_atomic_1');

        const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(env.preparedOperation, null); // Cleanly cleared
        assert.ok(env.transactions.some(t => t.id === 'tr_atomic_1'));
        assert.ok(env.auditLog.some(e => e.entityId === 'tr_atomic_1'));
    });

    // 4. Recovery After Interrupted Write (Simulated Crash Recovery)
    await itAsync('load() automatically recovers from interrupted PREPARED transfer write', async () => {
        const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });

        const interruptedTransfer = createTransferRecord({
            id: 'tr_interrupted_1',
            sourceAccountId: 'acc_test',
            destinationAccountId: 'acc_cash',
            amount: rupeesToMoneyPaise(500),
            date: '2026-09-03'
        });

        // Simulate crash right after PREPARED stage
        env.preparedOperation = {
            operationId: 'prep_crash_test',
            operationType: 'TRANSFER_POST',
            state: 'PREPARED',
            payload: interruptedTransfer
        };
        await StorageService.save('FINLIFE_CASHBOOK_PROD_V1', env);

        // Recovery call via load()
        const recoveredEnv = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(recoveredEnv.preparedOperation, null);
        assert.ok(recoveredEnv.transactions.some(t => t.id === 'tr_interrupted_1'));
    });

    // 5. Voiding Transaction with Mandatory Reason
    await itAsync('voidTransaction sets status VOIDED, records voidReason, and creates audit event', async () => {
        const regularExpense = {
            id: 'exp_to_void',
            transactionType: TransactionType.EXPENSE,
            sourceAccountId: 'acc_test',
            amount: rupeesToMoneyPaise(1500),
            category: 'food',
            date: '2026-09-03',
            status: TransactionStatus.POSTED,
            idempotencyKey: 'manual:exp_to_void'
        };
        await CashbookRepository.saveTransaction(regularExpense, { mode: CashbookAppMode.PRODUCTION });

        // Void it
        const voided = await CashbookRepository.voidTransaction(
            'exp_to_void',
            { voidReason: 'Duplicate bill payment' },
            { mode: CashbookAppMode.PRODUCTION }
        );
        assert.strictEqual(voided.status, TransactionStatus.VOIDED);
        assert.strictEqual(voided.voidReason, 'Duplicate bill payment');

        const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const auditVoidEvt = env.auditLog.find(e => e.entityId === 'exp_to_void' && e.eventType === 'TRANSACTION_VOIDED');
        assert.ok(auditVoidEvt);
    });

    // 6. Ledger Reconciliation
    await itAsync('reconcile verifies audit trail and genesis integrity across the entire repository', async () => {
        const rec = await CashbookRepository.reconcile({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(rec.isAuditValid, true);
        assert.strictEqual(rec.isGenesisValid, true);
        assert.strictEqual(rec.anomalies.length, 0);
    });

    // 7. Auditable CSV and JSON Exports
    await itAsync('CashbookExport produces compliant CSV and verifiable JSON', async () => {
        const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const csv = CashbookExport.toCSV(env.accounts, env.transactions);
        assert.ok(csv.includes('Transaction ID,Date,Type,Status'));
        assert.ok(csv.includes('Test Bank'));

        const json = CashbookExport.toJSON(env);
        const parsed = JSON.parse(json);
        assert.ok(parsed.checksum);
        assert.strictEqual(parsed.accounts.length, env.accounts.length);
    });

    console.log(`--- CASHBOOK REPOSITORY SUITE PASSED (${assertionsPassed} assertions) ---\n`);
}

runSuite().catch(err => {
    console.error('FATAL in test_cashbook_repository:', err);
    process.exit(1);
});
