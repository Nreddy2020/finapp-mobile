/**
 * tests/test_cashbook_hardening.mjs
 *
 * Regression suite for the Cashbooks module hardening pass:
 *  1. Local-calendar date helpers (no UTC drift for IST users)
 *  2. Handy-cash till carries yesterday's closing forward as today's opening
 *  3. Void is rejected on a LOCKED day, allowed on an open day
 *  4. CSV export neutralises spreadsheet formula injection
 *  5. View-model search matches amount & account name; REFUND rows render as income-like
 *  6. Visual meta: explicit HANDY_CASH type is not hijacked by name heuristics
 */
import assert from 'assert';
import {
    CashbookAppMode, CashbookType, TransactionType, TransactionStatus, DailyClosingStatus,
    createCashbook, createAccount, createOpeningBalanceRecord, createDailyClosingRecord,
    createMoneyPaise, rupeesToMoneyPaise
} from '../services/cashbook/cashbookContracts.js';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
import { computeHandyCashDashboardMetrics } from '../services/cashbook/cashbookEngine.js';
import { buildCashbookViewModel } from '../services/cashbook/cashbookViewModel.js';
import { CashbookExport } from '../services/cashbook/cashbookExport.js';
import { getBookVisualMeta } from '../services/cashbook/cashbookPresentation.js';
import { toLocalDateString, isValidDateString, todayLocal } from '../services/cashbook/cashbookDates.js';

let passed = 0;
async function t(title, fn) {
    try { await fn(); passed++; console.log(`  [PASS] ${title}`); }
    catch (e) { console.log(`  [FAIL] ${title}`); console.error(e); process.exit(1); }
}
const MODE = CashbookAppMode.PRODUCTION;
const txn = (id, type, rupees, date, extra = {}) => ({
    id, bookId: 'book_h', transactionType: type, amount: rupeesToMoneyPaise(rupees),
    date, status: TransactionStatus.POSTED, description: id, ...extra
});

console.log('--- CASHBOOK HARDENING SUITE ---');

await t('toLocalDateString uses local calendar fields, not UTC', () => {
    // 01:00 local on 5 Mar — toISOString() would be the 4th in any UTC+ zone ahead of 1h
    const d = new Date(2026, 2, 5, 1, 0, 0);
    assert.strictEqual(toLocalDateString(d), '2026-03-05');
    assert.strictEqual(todayLocal(), toLocalDateString(new Date()));
});

await t('isValidDateString rejects impossible / malformed dates', () => {
    assert.ok(isValidDateString('2026-02-28'));
    assert.ok(isValidDateString('2028-02-29'));
    for (const bad of ['2026-02-30', '2026-13-01', '2026-1-5', '', null, 'abc', '2026-00-10']) {
        assert.strictEqual(isValidDateString(bad), false, String(bad));
    }
});

await t('Handy cash: opening = book opening + earlier days; today excluded', () => {
    const txns = [
        txn('d1_in', TransactionType.INCOME, 1000, '2026-03-01'),
        txn('d1_out', TransactionType.EXPENSE, 400, '2026-03-01'),
        txn('d2_in', TransactionType.INCOME, 250, '2026-03-02'),
        txn('today_in', TransactionType.INCOME, 500, '2026-03-03'),
        txn('today_out', TransactionType.EXPENSE, 100, '2026-03-03'),
        { ...txn('voided', TransactionType.INCOME, 9999, '2026-03-01'), status: TransactionStatus.VOIDED }
    ];
    const m = computeHandyCashDashboardMetrics({ transactions: txns, openingBalance: '10000', dailyClosings: [], currentDate: '2026-03-03' });
    // 100 (book opening) + 1000 - 400 + 250 = 950 opening ; +500 -100 => 1350 expected
    assert.strictEqual(m.openingCashPaise, '95000');
    assert.strictEqual(m.cashReceivedTodayPaise, '50000');
    assert.strictEqual(m.cashPaidTodayPaise, '10000');
    assert.strictEqual(m.expectedClosingPaise, '135000');
});

await t('Handy cash: OPENING_BALANCE records seed the till regardless of posting date', () => {
    const op = { id: 'op1', bookId: 'book_h', transactionType: TransactionType.OPENING_BALANCE, accountId: 'a', amount: rupeesToMoneyPaise(2000), date: '2026-03-03', status: TransactionStatus.POSTED };
    const m = computeHandyCashDashboardMetrics({ transactions: [op, txn('x', TransactionType.EXPENSE, 500, '2026-03-03')], dailyClosings: [], currentDate: '2026-03-03' });
    assert.strictEqual(m.openingCashPaise, '200000');
    assert.strictEqual(m.expectedClosingPaise, '150000');
});

await t('Void: rejected on a LOCKED date, allowed on an open date', async () => {
    await CashbookRepository.clearLedger(MODE);
    const book = createCashbook({ id: 'book_h', name: 'Till', type: CashbookType.HANDY_CASH });
    await CashbookRepository.saveBook(book, { mode: MODE });
    await CashbookRepository.saveAccount(createAccount({ id: 'acc_c', name: 'Cash', type: 'CASH' }), { mode: MODE });
    await CashbookRepository.saveTransaction(txn('e_locked', TransactionType.EXPENSE, 100, '2026-03-01', { sourceAccountId: 'acc_c', idempotencyKey: 'k1' }), { mode: MODE });
    await CashbookRepository.saveTransaction(txn('e_open', TransactionType.EXPENSE, 50, '2026-03-02', { sourceAccountId: 'acc_c', idempotencyKey: 'k2' }), { mode: MODE });

    const closing = createDailyClosingRecord({
        id: 'close_1', bookId: 'book_h', date: '2026-03-01',
        openingBalance: createMoneyPaise('0'), totalMoneyIn: createMoneyPaise('0'), totalMoneyOut: createMoneyPaise('10000'),
        calculatedClosing: createMoneyPaise('0'), status: DailyClosingStatus.LOCKED
    });
    await CashbookRepository.saveDailyClosing(closing, { mode: MODE });

    await assert.rejects(
        () => CashbookRepository.voidTransaction('e_locked', { voidReason: 'oops' }, { mode: MODE }),
        /PERIOD_LOCKED/
    );
    const ok = await CashbookRepository.voidTransaction('e_open', { voidReason: 'duplicate entry' }, { mode: MODE });
    assert.strictEqual(ok.status, TransactionStatus.VOIDED);
});

await t('CSV export neutralises formula injection and keeps quotes valid', () => {
    const csv = CashbookExport.toCSV(
        [{ id: 'a', name: '=HYPERLINK("x")' }],
        [{ id: 't1', date: '2026-03-01', transactionType: 'EXPENSE', status: 'POSTED', sourceAccountId: 'a',
           amount: rupeesToMoneyPaise(10), description: '=SUM(A1:A9)', category: '+cmd', voidReason: '@x' }]
    );
    const row = csv.split('\n')[1];
    assert.ok(row.includes(`"'=SUM(A1:A9)"`), row);
    assert.ok(row.includes(`"'+cmd"`), row);
    assert.ok(row.includes(`"'@x"`), row);
    assert.ok(row.includes(`"'=HYPERLINK(""x"")"`), row);
});

await t('View model: search matches amount and account name; REFUND is income-like', () => {
    const accounts = [createAccount({ id: 'acc_h', name: 'HDFC Salary', type: 'BANK' })];
    const txns = [
        txn('t_a', TransactionType.EXPENSE, 1500.5, todayLocal(), { sourceAccountId: 'acc_h', description: 'Dinner' }),
        txn('t_b', TransactionType.EXPENSE, 20, todayLocal(), { sourceAccountId: 'acc_h', description: 'Tea' }),
        txn('t_r', TransactionType.REFUND, 75, todayLocal(), { destinationAccountId: 'acc_h', description: 'Refund' })
    ];
    const byAmount = buildCashbookViewModel({ accounts, transactions: txns, searchQuery: '1500.50' });
    assert.strictEqual(byAmount.filteredCount, 1);
    const byAccount = buildCashbookViewModel({ accounts, transactions: txns, searchQuery: 'hdfc' });
    assert.strictEqual(byAccount.filteredCount, 3);
    const refund = byAccount.sections[0].data.find(r => r.id === 't_r');
    assert.ok(refund.formattedAmount.startsWith('+'));
    assert.strictEqual(refund.accountDisplay, 'HDFC Salary');
    assert.strictEqual(byAccount.sections[0].title, 'Today');
});

await t('Visual meta: HANDY_CASH type wins over name heuristics', () => {
    const m = getBookVisualMeta({ type: CashbookType.HANDY_CASH, name: 'Personal Cash' });
    assert.strictEqual(m.iconKey, 'Handy');
});

console.log(`\n✅ CASHBOOK HARDENING SUITE PASSED (${passed}/8)`);
