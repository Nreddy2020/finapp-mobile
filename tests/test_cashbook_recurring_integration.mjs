/**
 * tests/test_cashbook_recurring_integration.mjs
 * 
 * Test Suite 6: Recurring Commitments & Cashbook Ledger Bridge,
 * Idempotent Occurrence Posting, and Reversal State Machine Synchronization.
 */

import assert from 'assert';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
import { RecurringIntegration } from '../services/cashbook/recurringIntegration.js';
import {
    AccountType,
    TransactionType,
    TransactionStatus,
    TransactionSource,
    CashbookAppMode,
    rupeesToMoneyPaise,
    createAccount,
    createOpeningBalanceRecord
} from '../services/cashbook/cashbookContracts.js';

console.log('--- START TEST SUITE: RECURRING COMMITMENT INTEGRATION ---');
let assertionsPassed = 0;

async function itAsync(desc, fn) {
    await fn();
    assertionsPassed++;
    console.log(`  [PASS] ${desc}`);
}

async function runSuite() {
    // Setup clean test account
    await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);
    const bank = createAccount({ id: 'acc_salary', name: 'Salary A/c', type: AccountType.BANK });
    await CashbookRepository.saveAccount(bank, { mode: CashbookAppMode.PRODUCTION });
    const open = createOpeningBalanceRecord({ id: 'op_sal', accountId: 'acc_salary', amount: rupeesToMoneyPaise(100000) });
    await CashbookRepository.saveTransaction(open, { mode: CashbookAppMode.PRODUCTION });

    const mockOccurrence = {
        id: 'occ_netflix_202609',
        commitmentId: 'commit_netflix',
        commitmentName: 'Netflix Premium',
        category: 'entertainment',
        expectedAmount: rupeesToMoneyPaise(649),
        actualAmount: rupeesToMoneyPaise(649),
        scheduledDate: '2026-09-08'
    };
    // Seed occurrence in commitments storage
    const { StorageService } = await import('../services/storage.js');
    await StorageService.save('FINLIFE_OCCURRENCES_V2', [mockOccurrence]);

    // 1. Post Occurrence to Cashbook
    await itAsync('postOccurrenceToCashbook creates an EXPENSE transaction in Cashbook with origin metadata', async () => {
        const txn = await RecurringIntegration.postOccurrenceToCashbook(mockOccurrence, 'acc_salary', { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(txn.transactionType, TransactionType.EXPENSE);
        assert.strictEqual(txn.source, TransactionSource.RECURRING_COMMITMENT);
        assert.strictEqual(txn.sourceReferenceId, 'occ_netflix_202609');
        assert.strictEqual(txn.amount.paise, '64900');
        assert.strictEqual(txn.idempotencyKey, 'recurring:commit_netflix:occ_netflix_202609:payment');

        const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.ok(env.transactions.some(t => t.id === txn.id));
    });

    // 2. Idempotency on Repeated Occurrence Posting
    await itAsync('Repeated occurrence posting returns existing Cashbook transaction without double debit', async () => {
        const mockOccurrence = {
            id: 'occ_netflix_202609',
            commitmentId: 'commit_netflix',
            commitmentName: 'Netflix Premium',
            category: 'entertainment',
            expectedAmount: rupeesToMoneyPaise(649),
            actualAmount: rupeesToMoneyPaise(649),
            scheduledDate: '2026-09-08'
        };

        // Repeated post
        const retryTxn = await RecurringIntegration.postOccurrenceToCashbook(mockOccurrence, 'acc_salary', { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(retryTxn.id, 'cb_occ_occ_netflix_202609');

        const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const matchingTxns = env.transactions.filter(t => t.idempotencyKey === 'recurring:commit_netflix:occ_netflix_202609:payment');
        assert.strictEqual(matchingTxns.length, 1); // Exactly 1!
    });

    // 3. Void Synchronization
    await itAsync('Voiding a recurring Cashbook transaction triggers reversal handling', async () => {
        const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const txn = env.transactions.find(t => t.id === 'cb_occ_occ_netflix_202609');

        // Void the cashbook transaction
        await CashbookRepository.voidTransaction(txn.id, { voidReason: 'Subscription billed in error' }, { mode: CashbookAppMode.PRODUCTION });

        // Trigger sync
        const voidedTxn = (await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION })).transactions.find(t => t.id === txn.id);
        const syncRes = await RecurringIntegration.handleCashbookTransactionVoided(voidedTxn, 'Subscription billed in error', { mode: CashbookAppMode.PRODUCTION });
        
        assert.strictEqual(syncRes.handled, true);
        assert.strictEqual(syncRes.newStatus, 'REVERSED');
        assert.ok(syncRes.syncEventId);
    });

    console.log(`--- RECURRING COMMITMENT INTEGRATION SUITE PASSED (${assertionsPassed} assertions) ---\n`);
}

runSuite().catch(err => {
    console.error('FATAL in test_cashbook_recurring_integration:', err);
    process.exit(1);
});
