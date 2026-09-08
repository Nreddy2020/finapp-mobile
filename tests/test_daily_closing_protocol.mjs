/**
 * tests/test_daily_closing_protocol.mjs
 * 
 * Test suite for Daily Closing Register & Date-Period Locking (Phase 3).
 * Validates:
 * 1. Daily closing calculation (Opening + In - Out = Calculated Closing).
 * 2. Saving daily closing records with physical denomination breakdown.
 * 3. Period locking: Locking date 2026-09-05 rejects modifications on that date, but allows future dates.
 * 4. Tamper rejection when attempting to alter locked closing records.
 */

import assert from 'assert';
import {
    CashbookAppMode,
    CashbookType,
    DailyClosingStatus,
    TransactionType,
    TransactionStatus,
    createCashbook,
    createAccount,
    createDailyClosingRecord,
    rupeesToMoneyPaise
} from '../services/cashbook/cashbookContracts.js';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';

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

export async function runDailyClosingProtocolTests() {
    console.log('--- START TEST SUITE: DAILY CLOSING & PERIOD LOCKING PROTOCOL ---');

    await CashbookRepository.clearLedger(CashbookAppMode.PRODUCTION);

    const book = createCashbook({
        id: 'book_closing_test',
        name: 'Register for Closing',
        type: CashbookType.HANDY_CASH
    });
    await CashbookRepository.saveBook(book, { mode: CashbookAppMode.PRODUCTION });

    const cashAcc = createAccount({ id: 'acc_closing_cash', name: 'Cash Register', type: 'CASH' });
    await CashbookRepository.saveAccount(cashAcc, { mode: CashbookAppMode.PRODUCTION });

    // 1. Save and retrieve a daily closing record
    await checkAsync('Save and retrieve DailyClosingRecord with denomination breakdown', async () => {
        const closingRecord = createDailyClosingRecord({
            id: 'close_20260905',
            bookId: 'book_closing_test',
            date: '2026-09-05',
            openingBalance: rupeesToMoneyPaise(5000),
            totalMoneyIn: rupeesToMoneyPaise(12000),
            totalMoneyOut: rupeesToMoneyPaise(7000),
            calculatedClosing: rupeesToMoneyPaise(10000), // 5000 + 12000 - 7000 = 10000
            denominations: { d500: 20 },                  // 20 * 500 = 10000
            countedClosing: rupeesToMoneyPaise(10000),
            difference: rupeesToMoneyPaise(0),
            status: DailyClosingStatus.CLOSED,
            notes: 'Day closed balanced by cashier'
        });

        await CashbookRepository.saveDailyClosing(closingRecord, { mode: CashbookAppMode.PRODUCTION });

        const retrieved = await CashbookRepository.getDailyClosingByDate('book_closing_test', '2026-09-05', { mode: CashbookAppMode.PRODUCTION });
        assert.ok(retrieved);
        assert.strictEqual(retrieved.status, DailyClosingStatus.CLOSED);
        assert.strictEqual(retrieved.calculatedClosing.paise, '1000000');
        assert.strictEqual(retrieved.denominations.d500, 20);
    });

    // 2. Lock daily closing
    await checkAsync('Locking daily closing permanently sets status to LOCKED', async () => {
        const locked = await CashbookRepository.lockDailyClosing('close_20260905', { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(locked.status, DailyClosingStatus.LOCKED);
        assert.ok(locked.closedAt);

        const retrieved = await CashbookRepository.getDailyClosingByDate('book_closing_test', '2026-09-05', { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(retrieved.status, DailyClosingStatus.LOCKED);
    });

    // 3. Period locking: Modifying a locked day's closing record is rejected
    await checkAsync('Period locking: Rejects modifying locked daily closing record', async () => {
        const recloseAttempt = createDailyClosingRecord({
            id: 'close_20260905_alter',
            bookId: 'book_closing_test',
            date: '2026-09-05',
            openingBalance: rupeesToMoneyPaise(5000),
            totalMoneyIn: rupeesToMoneyPaise(15000),
            totalMoneyOut: rupeesToMoneyPaise(7000),
            calculatedClosing: rupeesToMoneyPaise(13000),
            status: DailyClosingStatus.CLOSED
        });

        let rejected = false;
        try {
            await CashbookRepository.saveDailyClosing(recloseAttempt, { mode: CashbookAppMode.PRODUCTION });
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('PERIOD_LOCKED'));
        }
        assert.strictEqual(rejected, true, 'Must reject modifying locked date period');
    });

    // 4. Period locking: Posting a transaction to a locked date is rejected
    await checkAsync('Period locking: Rejects posting new transaction to a locked date', async () => {
        const retroactiveTxn = {
            id: 'txn_retroactive_fail',
            bookId: 'book_closing_test',
            transactionType: TransactionType.EXPENSE,
            sourceAccountId: 'acc_closing_cash',
            amount: rupeesToMoneyPaise(500),
            date: '2026-09-05', // Locked date
            description: 'Forgotten expense',
            status: TransactionStatus.POSTED,
            idempotencyKey: 'test:retroactive:fail'
        };

        let rejected = false;
        try {
            await CashbookRepository.saveTransaction(retroactiveTxn, { mode: CashbookAppMode.PRODUCTION });
        } catch (err) {
            rejected = true;
            assert.ok(err.message.includes('PERIOD_LOCKED'));
        }
        assert.strictEqual(rejected, true, 'Must reject posting to locked date');
    });

    // 5. Future dates remain open and accept transactions cleanly
    await checkAsync('Future dates (2026-09-06) remain unlocked and accept transactions', async () => {
        const futureTxn = {
            id: 'txn_future_success',
            bookId: 'book_closing_test',
            transactionType: TransactionType.INCOME,
            destinationAccountId: 'acc_closing_cash',
            amount: rupeesToMoneyPaise(4500),
            date: '2026-09-06', // Next day: open
            description: 'New Day Cash Sale',
            status: TransactionStatus.POSTED,
            idempotencyKey: 'test:future:success'
        };

        const saved = await CashbookRepository.saveTransaction(futureTxn, { mode: CashbookAppMode.PRODUCTION });
        assert.strictEqual(saved.id, 'txn_future_success');
    });

    console.log(`--- DAILY CLOSING & PERIOD LOCKING PROTOCOL SUITE PASSED (${passedChecks} assertions) ---\n`);
}

if (process.argv[1]?.endsWith('test_daily_closing_protocol.mjs')) {
    runDailyClosingProtocolTests().catch(err => {
        console.error(err);
        process.exit(1);
    });
}
