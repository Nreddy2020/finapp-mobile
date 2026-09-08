/**
 * tests/test_universal_book_model.mjs
 * 
 * Test suite for Universal Cashbook Multi-Book Architecture (Phase 3).
 * Validates:
 * 1. Multi-book creation, partitioning, and active book switching.
 * 2. V1 to V2 envelope auto-migration.
 * 3. Book isolation: Transactions in Book A do not leak into Book B.
 * 4. Atomic cross-book transfers: Both legs committed atomically with matched transferGroupId.
 */

import assert from 'assert';
import { StorageService } from '../services/storage.js';
import {
    CashbookAppMode,
    CashbookType,
    BalanceMode,
    TransactionType,
    TransactionStatus,
    createCashbook,
    createAccount,
    createCrossBookTransfer,
    rupeesToMoneyPaise
} from '../services/cashbook/cashbookContracts.js';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
import { computeRunningLedger } from '../services/cashbook/cashbookEngine.js';

let passedChecks = 0;

function check(title, fn) {
    process.stdout.write(`  [RUN] ${title}...`);
    try {
        fn();
        console.log('\r  [PASS] ' + title);
        passedChecks++;
    } catch (err) {
        console.log('\r  [FAIL] ' + title);
        console.error(err);
        process.exit(1);
    }
}

async function checkAsync(title, fn) {
    process.stdout.write(`  [RUN] ${title}...`);
    try {
        await fn();
        console.log('\r  [PASS] ' + title);
        passedChecks++;
    } catch (err) {
        console.log('\r  [FAIL] ' + title);
        console.error(err);
        process.exit(1);
    }
}

export async function runUniversalBookModelTests() {
    console.log('--- START TEST SUITE: UNIVERSAL MULTI-BOOK MODEL ---');

    await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);

    // 1. Default envelope initialization has default book
    await checkAsync('Default envelope initializes with Personal Savings book', async () => {
        const books = await CashbookRepository.getBooks({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(Array.isArray(books), true);
        assert.strictEqual(books.length >= 1, true);
        const defaultBook = books.find(b => b.id === 'book_personal_savings');
        assert.ok(defaultBook, 'Default personal savings book must exist');
        assert.strictEqual(defaultBook.type, CashbookType.SAVINGS);
        assert.strictEqual(defaultBook.balanceMode, BalanceMode.AVAILABLE_CASH);

        const activeId = await CashbookRepository.getActiveBookId({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(activeId, 'book_personal_savings');
    });

    // 2. Creating multiple distinct books with declarative types
    await checkAsync('Multi-book registration: Handy Cash, Business, Loans, and PF', async () => {
        const handyBook = createCashbook({
            id: 'book_till_register',
            name: 'Shop Cash Register',
            type: CashbookType.HANDY_CASH,
            description: 'Physical daily cash register'
        });
        const loanBook = createCashbook({
            id: 'book_sbi_home_loan',
            name: 'SBI Home Loan',
            type: CashbookType.LOANS_TAKEN,
            description: '30 Year Mortgage'
        });

        await CashbookRepository.saveBook(handyBook, { mode: CashbookAppMode.PRODUCTION });
        await CashbookRepository.saveBook(loanBook, { mode: CashbookAppMode.PRODUCTION });

        const allBooks = await CashbookRepository.getBooks({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(allBooks.length, 3);
        assert.ok(allBooks.some(b => b.id === 'book_till_register'));
        assert.ok(allBooks.some(b => b.id === 'book_sbi_home_loan'));

        // Switching active book
        await CashbookRepository.setActiveBookId('book_till_register', { mode: CashbookAppMode.PRODUCTION });
        const active = await CashbookRepository.getActiveBook({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(active.id, 'book_till_register');
        assert.strictEqual(active.supportsDenominationCount, true);
    });

    // 3. Book isolation: Transactions in Book A do not leak into Book B
    await checkAsync('Book isolation: Transactions in Savings do not alter Handy Cash ledger', async () => {
        const bankAcc = createAccount({ id: 'acc_bank_test', name: 'HDFC Savings', type: 'BANK' });
        const cashAcc = createAccount({ id: 'acc_cash_test', name: 'Shop Till Cash', type: 'CASH' });
        await CashbookRepository.saveAccount(bankAcc, { mode: CashbookAppMode.PRODUCTION });
        await CashbookRepository.saveAccount(cashAcc, { mode: CashbookAppMode.PRODUCTION });

        const savingsTxn = {
            id: 'txn_sav_salary',
            bookId: 'book_personal_savings',
            transactionType: TransactionType.INCOME,
            destinationAccountId: 'acc_bank_test',
            amount: rupeesToMoneyPaise(50000),
            date: '2026-09-01',
            description: 'Consulting Income',
            status: TransactionStatus.POSTED,
            idempotencyKey: 'test:iso:salary'
        };
        await CashbookRepository.saveTransaction(savingsTxn, { mode: CashbookAppMode.PRODUCTION });

        const handyTxn = {
            id: 'txn_handy_sale',
            bookId: 'book_till_register',
            transactionType: TransactionType.INCOME,
            destinationAccountId: 'acc_cash_test',
            amount: rupeesToMoneyPaise(3000),
            date: '2026-09-01',
            description: 'Customer Cash Sale',
            status: TransactionStatus.POSTED,
            idempotencyKey: 'test:iso:sale'
        };
        await CashbookRepository.saveTransaction(handyTxn, { mode: CashbookAppMode.PRODUCTION });

        const envelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });

        const savingsTxns = envelope.transactions.filter(t => t.bookId === 'book_personal_savings');
        const savingsLedger = computeRunningLedger({
            transactions: savingsTxns,
            bookType: CashbookType.SAVINGS
        });
        assert.strictEqual(savingsLedger.summary.closingBalancePaise, '5000000');

        const handyTxns = envelope.transactions.filter(t => t.bookId === 'book_till_register');
        const handyLedger = computeRunningLedger({
            transactions: handyTxns,
            bookType: CashbookType.HANDY_CASH
        });
        assert.strictEqual(handyLedger.summary.closingBalancePaise, '300000');
    });

    // 4. Atomic Cross-Book Transfer
    await checkAsync('Atomic Cross-Book Transfer commits paired legs with matching transferGroupId', async () => {
        const { sourceTxn, destTxn } = createCrossBookTransfer({
            transferGroupId: 'grp_atm_withdraw_500',
            sourceBookId: 'book_personal_savings',
            sourceAccountId: 'acc_bank_test',
            destinationBookId: 'book_till_register',
            destinationAccountId: 'acc_cash_test',
            amount: rupeesToMoneyPaise(5000),
            date: '2026-09-02',
            description: 'ATM Cash Withdrawal for Till'
        });

        await CashbookRepository.saveCrossBookTransfer({ sourceTxn, destTxn }, { mode: CashbookAppMode.PRODUCTION });

        const envelope = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        const savedSrc = envelope.transactions.find(t => t.id === sourceTxn.id);
        const savedDst = envelope.transactions.find(t => t.id === destTxn.id);

        assert.ok(savedSrc, 'Source leg must be persisted');
        assert.ok(savedDst, 'Destination leg must be persisted');
        assert.strictEqual(savedSrc.transferGroupId, 'grp_atm_withdraw_500');
        assert.strictEqual(savedDst.transferGroupId, 'grp_atm_withdraw_500');
        assert.strictEqual(savedSrc.amount.paise, '500000');
        assert.strictEqual(savedDst.amount.paise, '500000');

        const savLedger = computeRunningLedger({
            transactions: envelope.transactions.filter(t => t.bookId === 'book_personal_savings'),
            bookType: CashbookType.SAVINGS
        });
        assert.strictEqual(savLedger.summary.closingBalancePaise, '4500000');

        const handyLedger = computeRunningLedger({
            transactions: envelope.transactions.filter(t => t.bookId === 'book_till_register'),
            bookType: CashbookType.HANDY_CASH
        });
        assert.strictEqual(handyLedger.summary.closingBalancePaise, '800000');
    });

    // 5. V1 to V2 Envelope Auto-Migration
    await checkAsync('V1 to V2 envelope auto-migration tags legacy transactions and creates default book', async () => {
        const key = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);

        const legacyV1Envelope = {
            version: 1,
            accounts: [
                createAccount({ id: 'legacy_acc_1', name: 'Old Account', type: 'BANK' })
            ],
            transactions: [
                {
                    id: 'legacy_txn_1',
                    transactionType: TransactionType.INCOME,
                    destinationAccountId: 'legacy_acc_1',
                    amount: rupeesToMoneyPaise(1000),
                    date: '2026-08-15',
                    description: 'Legacy income',
                    status: TransactionStatus.POSTED,
                    idempotencyKey: 'legacy:1'
                }
            ],
            auditLog: [],
            preparedOperation: null,
            lastReconciledAt: null,
            checksum: ''
        };
        await StorageService.save(key, legacyV1Envelope);

        const migrated = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(migrated.version, 2);
        assert.ok(migrated.books && migrated.books.length >= 1);
        assert.strictEqual(migrated.activeBookId, 'book_personal_savings');
        assert.strictEqual(migrated.transactions[0].bookId, 'book_personal_savings');
    });

    console.log(`--- UNIVERSAL MULTI-BOOK MODEL SUITE PASSED (${passedChecks} assertions) ---\n`);
}

if (process.argv[1]?.endsWith('test_universal_book_model.mjs')) {
    runUniversalBookModelTests().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
