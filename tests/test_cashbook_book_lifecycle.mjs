/**
 * tests/test_cashbook_book_lifecycle.mjs
 *
 * Test suite for Cashbook lifecycle:
 *  1. Rename book success
 *  2. Rename to duplicate name rejected
 *  3. Rename on nonexistent or deleted book rejected
 *  4. Delete book success (soft delete; excluded from directory / getBooks by default)
 *  5. Delete book blocked by locked-today or future closing
 *  6. Deleting the active book switches activeBook to another non-deleted book
 */

import assert from 'assert';
import {
    CashbookAppMode,
    CashbookType,
    DailyClosingStatus,
    AccountType,
    createAccount,
    createCashbook,
    createDailyClosingRecord,
    createMoneyPaise
} from '../services/cashbook/cashbookContracts.js';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
import { todayLocal } from '../services/cashbook/cashbookDates.js';

let passed = 0;
async function t(title, fn) {
    try {
        await fn();
        passed++;
        console.log(`  [PASS] ${title}`);
    } catch (e) {
        console.log(`  [FAIL] ${title}`);
        console.error(e);
        process.exit(1);
    }
}

const MODE = CashbookAppMode.PRODUCTION;

console.log('--- CASHBOOK BOOK LIFECYCLE SUITE ---');

// Reset repository before tests
await CashbookRepository.clearLedger(MODE);

const book1 = createCashbook({
    id: 'book_lc_1',
    name: 'Household Budget',
    type: CashbookType.SAVINGS,
    description: 'Main family budget'
});

const book2 = createCashbook({
    id: 'book_lc_2',
    name: 'Coffee Shop Shop',
    type: CashbookType.BUSINESS_CURRENT,
    description: 'Retail business ledger'
});

await CashbookRepository.saveBook(book1, { mode: MODE });
await CashbookRepository.saveBook(book2, { mode: MODE });
await CashbookRepository.setActiveBookId(book1.id, { mode: MODE });

await t('renameBook: succeeds with valid new name and updates audit trail', async () => {
    const renamed = await CashbookRepository.renameBook(book1.id, 'Family Household', { mode: MODE });
    assert.strictEqual(renamed.name, 'Family Household');

    const envelope = await CashbookRepository.load({ mode: MODE });
    const stored = envelope.books.find(b => b.id === book1.id);
    assert.strictEqual(stored.name, 'Family Household');

    const lastAudit = envelope.auditLog[envelope.auditLog.length - 1];
    assert.strictEqual(lastAudit.entityId, book1.id);
});

await t('renameBook: rejects duplicate name (case-insensitive) of another non-deleted book', async () => {
    await assert.rejects(
        async () => {
            await CashbookRepository.renameBook(book1.id, 'coffee shop shop', { mode: MODE });
        },
        /already exists/i
    );
});

await t('renameBook: rejects invalid names (<2 chars or whitespace)', async () => {
    await assert.rejects(
        async () => {
            await CashbookRepository.renameBook(book1.id, 'A', { mode: MODE });
        },
        /at least 2 characters/i
    );
    await assert.rejects(
        async () => {
            await CashbookRepository.renameBook(book1.id, '   ', { mode: MODE });
        },
        /at least 2 characters/i
    );
});

await t('renameBook: rejects nonexistent book', async () => {
    await assert.rejects(
        async () => {
            await CashbookRepository.renameBook('book_unknown_xyz', 'New Name', { mode: MODE });
        },
        /does not exist/i
    );
});

await t('deleteBook: blocked by a locked-today closing', async () => {
    const today = todayLocal();
    const lockedClosing = createDailyClosingRecord({
        id: `cls_${Date.now()}`,
        bookId: book2.id,
        date: today,
        openingBalance: createMoneyPaise(0),
        moneyIn: createMoneyPaise(10000),
        moneyOut: createMoneyPaise(2000),
        denominations: { 500: 16 },
        status: DailyClosingStatus.LOCKED,
        lockedAt: new Date().toISOString()
    });

    await CashbookRepository.saveDailyClosing(lockedClosing, { mode: MODE });

    await assert.rejects(
        async () => {
            await CashbookRepository.deleteBook(book2.id, { mode: MODE });
        },
        /locked daily closing/i
    );
});

await t('deleteBook: succeeds when no locked-today closing, hides book from getBooks', async () => {
    // Create a 3rd book with no locked closing
    const book3 = createCashbook({
        id: 'book_lc_3',
        name: 'Temp Project',
        type: CashbookType.CUSTOM,
        description: 'Temporary book'
    });
    await CashbookRepository.saveBook(book3, { mode: MODE });

    let activeBooks = await CashbookRepository.getBooks({ mode: MODE });
    assert.ok(activeBooks.some(b => b.id === book3.id));

    // Delete it
    const res = await CashbookRepository.deleteBook(book3.id, { mode: MODE });
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.deletedBookId, book3.id);

    // Excluded by default from getBooks
    activeBooks = await CashbookRepository.getBooks({ mode: MODE });
    assert.strictEqual(activeBooks.some(b => b.id === book3.id), false);

    // Included when includeDeleted: true
    const allBooks = await CashbookRepository.getBooks({ mode: MODE, includeDeleted: true });
    const deletedRecord = allBooks.find(b => b.id === book3.id);
    assert.ok(deletedRecord);
    assert.strictEqual(deletedRecord.status, 'DELETED');
    assert.ok(deletedRecord.deletedAt);
});

await t('deleteBook: deleting the activeBook updates activeBookId to another available book', async () => {
    const book4 = createCashbook({
        id: 'book_lc_4',
        name: 'Second Book',
        type: CashbookType.SAVINGS
    });
    await CashbookRepository.saveBook(book4, { mode: MODE });
    await CashbookRepository.setActiveBookId(book4.id, { mode: MODE });

    const activeBefore = await CashbookRepository.getActiveBookId({ mode: MODE });
    assert.strictEqual(activeBefore, book4.id);

    const res = await CashbookRepository.deleteBook(book4.id, { mode: MODE });
    assert.notStrictEqual(res.activeBookId, book4.id);
    assert.ok(res.activeBookId);

    const activeAfter = await CashbookRepository.getActiveBookId({ mode: MODE });
    assert.notStrictEqual(activeAfter, book4.id);
});

await t('per-book accounts: account created for Book 1 is isolated from Book 2; legacy account is visible in both', async () => {
    // 1. Create account scoped to book1
    const accBook1 = createAccount({
        id: 'acc_book1_petty',
        name: 'Family Petty Cash',
        type: AccountType.CASH,
        bookId: book1.id
    });
    await CashbookRepository.saveAccount(accBook1, { mode: MODE });

    // 2. Create account scoped to book2
    const accBook2 = createAccount({
        id: 'acc_book2_pos',
        name: 'Coffee Shop POS Terminal',
        type: AccountType.BANK,
        bookId: book2.id
    });
    await CashbookRepository.saveAccount(accBook2, { mode: MODE });

    // 3. Create legacy account without bookId
    const accLegacy = createAccount({
        id: 'acc_legacy_global_bank',
        name: 'Primary HDFC Global Bank',
        type: AccountType.BANK,
        bookId: null
    });
    await CashbookRepository.saveAccount(accLegacy, { mode: MODE });

    // Query accounts for Book 1
    const book1Accounts = await CashbookRepository.getAccounts(book1.id, { mode: MODE });
    assert.ok(book1Accounts.some(a => a.id === accBook1.id), 'Book 1 account must be in Book 1');
    assert.strictEqual(book1Accounts.some(a => a.id === accBook2.id), false, 'Book 2 account must NOT be in Book 1');
    assert.ok(book1Accounts.some(a => a.id === accLegacy.id), 'Legacy account must be visible in Book 1');

    // Query accounts for Book 2
    const book2Accounts = await CashbookRepository.getAccounts(book2.id, { mode: MODE });
    assert.ok(book2Accounts.some(a => a.id === accBook2.id), 'Book 2 account must be in Book 2');
    assert.strictEqual(book2Accounts.some(a => a.id === accBook1.id), false, 'Book 1 account must NOT be in Book 2');
    assert.ok(book2Accounts.some(a => a.id === accLegacy.id), 'Legacy account must be visible in Book 2');

    // Query all accounts (bookId = null)
    const allAccounts = await CashbookRepository.getAccounts(null, { mode: MODE });
    assert.ok(allAccounts.some(a => a.id === accBook1.id));
    assert.ok(allAccounts.some(a => a.id === accBook2.id));
    assert.ok(allAccounts.some(a => a.id === accLegacy.id));
});

console.log(`--- CASHBOOK BOOK LIFECYCLE SUITE PASSED (${passed} assertions) ---`);
