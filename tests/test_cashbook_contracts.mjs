/**
 * tests/test_cashbook_contracts.mjs
 * 
 * Test Suite 1: Contracts, MoneyPaise, Canonical Serialization, and Fail-Closed Validation.
 */

import assert from 'assert';
import {
    AccountType,
    AccountNature,
    ACCOUNT_TYPE_NATURE,
    TransactionType,
    TransactionStatus,
    TransactionSource,
    BalanceEffect,
    RefundTargetType,
    CashbookAppMode,
    StandardCategories,
    createMoneyPaise,
    rupeesToMoneyPaise,
    moneyToBigInt,
    moneyToRupees,
    formatMoneyPaise,
    canonicalJsonStringify,
    createAccount,
    createOpeningBalanceRecord
} from '../services/cashbook/cashbookContracts.js';

import {
    validateAccount,
    validateCategoryCompatibility,
    validateTransaction
} from '../services/cashbook/cashbookValidator.js';

console.log('--- START TEST SUITE: CASHBOOK CONTRACTS & VALIDATION ---');
let assertionsPassed = 0;

function it(desc, fn) {
    fn();
    assertionsPassed++;
    console.log(`  [PASS] ${desc}`);
}

// 1. MoneyPaise Domain Mechanics
it('createMoneyPaise accepts bigint, positive integer number, and valid integer string', () => {
    const m1 = createMoneyPaise(1000n);
    assert.strictEqual(m1.paise, '1000');
    assert.strictEqual(m1.currency, 'INR');

    const m2 = createMoneyPaise(500);
    assert.strictEqual(m2.paise, '500');

    const m3 = createMoneyPaise('7500000');
    assert.strictEqual(m3.paise, '7500000');
});

it('createMoneyPaise rejects negative values, floats, and invalid string formats', () => {
    assert.throws(() => createMoneyPaise(-500n), /non-negative/);
    assert.throws(() => createMoneyPaise(-10), /non-negative/);
    assert.throws(() => createMoneyPaise(12.34), /integer/);
    assert.throws(() => createMoneyPaise('12.34'), /Invalid paise string/);
    assert.throws(() => createMoneyPaise('abc'), /Invalid paise string/);
    assert.throws(() => createMoneyPaise(null), /required/);
});

it('rupeesToMoneyPaise accurately converts rupees to paise without IEEE-754 drift', () => {
    // 649.99 * 100 in float can be 64998.99999999999
    const m = rupeesToMoneyPaise(649.99);
    assert.strictEqual(m.paise, '64999');

    const zero = rupeesToMoneyPaise(0);
    assert.strictEqual(zero.paise, '0');

    const lakh = rupeesToMoneyPaise('142500');
    assert.strictEqual(lakh.paise, '14250000');
});

it('moneyToBigInt and moneyToRupees operate deterministically', () => {
    const m = createMoneyPaise('8700000');
    assert.strictEqual(moneyToBigInt(m), 8700000n);
    assert.strictEqual(moneyToRupees(m), 87000);
});

it('formatMoneyPaise formats Indian number system with and without decimals', () => {
    assert.strictEqual(formatMoneyPaise(createMoneyPaise('14250000')), '₹1,42,500');
    assert.strictEqual(formatMoneyPaise(createMoneyPaise('7500000')), '₹75,000');
    assert.strictEqual(formatMoneyPaise(createMoneyPaise('2500050'), true), '₹25,000.50');
    assert.strictEqual(formatMoneyPaise(createMoneyPaise('500')), '₹5');
    assert.strictEqual(formatMoneyPaise(createMoneyPaise('0')), '₹0');
});

// 2. Canonical JSON Serialization
it('canonicalJsonStringify recursively sorts keys and formats consistently', () => {
    const objA = { z: 1, a: 2, m: { b: 3, a: 4 } };
    const objB = { a: 2, m: { a: 4, b: 3 }, z: 1 };
    assert.strictEqual(canonicalJsonStringify(objA), canonicalJsonStringify(objB));
    assert.strictEqual(canonicalJsonStringify(objA), '{"a":2,"m":{"a":4,"b":3},"z":1}');
});

it('canonicalJsonStringify handles BigInt values as strings', () => {
    const res = canonicalJsonStringify({ val: 1000000000000n });
    assert.strictEqual(res, '{"val":"1000000000000"}');
});

// 3. Enums Freeze Check
it('enforces frozen domain enums', () => {
    assert.strictEqual(Object.isFrozen(AccountType), true);
    assert.strictEqual(Object.isFrozen(AccountNature), true);
    assert.strictEqual(Object.isFrozen(TransactionType), true);
    assert.strictEqual(Object.isFrozen(BalanceEffect), true);
    assert.strictEqual(Object.isFrozen(TransactionStatus), true);
    assert.strictEqual(Object.isFrozen(StandardCategories), true);
});

// 4. Account Contract & Validation
it('creates and validates valid Asset and Liability accounts', () => {
    const bankAcc = createAccount({
        id: 'acc_hdfc',
        name: 'HDFC Bank',
        type: AccountType.BANK
    });
    assert.strictEqual(bankAcc.nature, AccountNature.ASSET);
    assert.strictEqual(validateAccount(bankAcc), true);

    const ccAcc = createAccount({
        id: 'acc_cc',
        name: 'ICICI Credit Card',
        type: AccountType.CREDIT_CARD
    });
    assert.strictEqual(ccAcc.nature, AccountNature.LIABILITY);
    assert.strictEqual(validateAccount(ccAcc), true);
});

it('validateAccount rejects invalid or missing account attributes', () => {
    assert.throws(() => validateAccount(null), /must be a non-null object/);
    assert.throws(() => validateAccount({ id: '', name: 'Test', type: AccountType.BANK }), /non-empty string/);
    assert.throws(() => validateAccount({ id: '1', name: '', type: AccountType.BANK }), /non-empty string/);
    assert.throws(() => validateAccount({ id: '1', name: 'Test', type: 'INVALID' }), /Invalid account type/);
    assert.throws(() => validateAccount({ id: '1', name: 'Test', type: AccountType.BANK, nature: AccountNature.LIABILITY }), /nature mismatch/);
});

// 5. Category Compatibility Matrix
it('enforces category compatibility: reject Income with Rent; reject Expense with Salary', () => {
    assert.strictEqual(validateCategoryCompatibility(TransactionType.INCOME, 'salary'), true);
    assert.strictEqual(validateCategoryCompatibility(TransactionType.EXPENSE, 'housing'), true);

    // Fail closed on inverted categories
    assert.throws(() => validateCategoryCompatibility(TransactionType.INCOME, 'housing'), /Category incompatibility/);
    assert.throws(() => validateCategoryCompatibility(TransactionType.INCOME, 'food'), /Category incompatibility/);
    assert.throws(() => validateCategoryCompatibility(TransactionType.EXPENSE, 'salary'), /Category incompatibility/);
    assert.throws(() => validateCategoryCompatibility(TransactionType.EXPENSE, 'freelance'), /Category incompatibility/);

    // Transfer cannot have income/expense categories
    assert.throws(() => validateCategoryCompatibility(TransactionType.TRANSFER, 'salary'), /Transfers represent net-zero/);
    assert.throws(() => validateCategoryCompatibility(TransactionType.TRANSFER, 'housing'), /Transfers represent net-zero/);
});

// 6. Opening Balance Ledger Record Contract & Invariants
it('createOpeningBalanceRecord creates immutable record with correct schema', () => {
    const rec = createOpeningBalanceRecord({
        id: 'open_01',
        accountId: 'acc_hdfc',
        amount: rupeesToMoneyPaise(25000),
        date: '2026-09-01'
    });
    assert.strictEqual(rec.transactionType, TransactionType.OPENING_BALANCE);
    assert.strictEqual(rec.immutable, true);
    assert.strictEqual(rec.amount.paise, '2500000');
    assert.strictEqual(validateTransaction(rec), true);
});

// 7. Transaction Fail-Closed Validation
it('validateTransaction enforces strictly positive amounts for normal transactions', () => {
    const validIncome = {
        id: 'txn_01',
        transactionType: TransactionType.INCOME,
        destinationAccountId: 'acc_hdfc',
        amount: createMoneyPaise('50000'),
        date: '2026-09-01',
        status: TransactionStatus.POSTED,
        idempotencyKey: 'manual:01'
    };
    assert.strictEqual(validateTransaction(validIncome), true);

    const zeroAmtTxn = {
        ...validIncome,
        amount: createMoneyPaise('0')
    };
    assert.throws(() => validateTransaction(zeroAmtTxn), /strictly greater than 0 paise/);
});

it('validateTransaction enforces mandatory voidReason on voided transactions', () => {
    const voidedTxn = {
        id: 'txn_void',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'acc_hdfc',
        amount: createMoneyPaise('10000'),
        date: '2026-09-01',
        status: TransactionStatus.VOIDED,
        idempotencyKey: 'manual:void',
        voidedAt: new Date().toISOString(),
        voidReason: 'Mistyped amount'
    };
    assert.strictEqual(validateTransaction(voidedTxn), true);

    const invalidVoid = { ...voidedTxn, voidReason: '' };
    assert.throws(() => validateTransaction(invalidVoid), /non-empty "voidReason"/);
});

it('validateTransaction enforces explicit balanceEffect on ADJUSTMENT transactions', () => {
    const validAdj = {
        id: 'adj_01',
        transactionType: TransactionType.ADJUSTMENT,
        accountId: 'acc_cash',
        amount: createMoneyPaise('20000'),
        balanceEffect: BalanceEffect.INCREASE,
        adjustmentReason: 'Physical cash tally found ₹200 surplus',
        date: '2026-09-01',
        status: TransactionStatus.POSTED,
        idempotencyKey: 'manual:adj01'
    };
    assert.strictEqual(validateTransaction(validAdj), true);

    const missingEffect = { ...validAdj, balanceEffect: BalanceEffect.NEUTRAL };
    assert.throws(() => validateTransaction(missingEffect), /explicit balanceEffect of INCREASE or DECREASE/);

    const missingReason = { ...validAdj, adjustmentReason: '' };
    assert.throws(() => validateTransaction(missingReason), /non-empty adjustmentReason/);
});

it('validateTransaction rejects transfers to the same account or missing legs', () => {
    const selfTransfer = {
        id: 'tr_self',
        transactionType: TransactionType.TRANSFER,
        sourceAccountId: 'acc_hdfc',
        destinationAccountId: 'acc_hdfc',
        transferGroupId: 'grp_01',
        amount: createMoneyPaise('50000'),
        date: '2026-09-01',
        status: TransactionStatus.POSTED,
        idempotencyKey: 'manual:tr01'
    };
    assert.throws(() => validateTransaction(selfTransfer), /identical sourceAccountId and destinationAccountId/);
});

it('validateTransaction checks referential integrity against available accounts list', () => {
    const txnWithGhostAccount = {
        id: 'txn_ghost',
        transactionType: TransactionType.INCOME,
        destinationAccountId: 'non_existent_account',
        amount: createMoneyPaise('50000'),
        date: '2026-09-01',
        status: TransactionStatus.POSTED,
        idempotencyKey: 'manual:ghost'
    };
    const existingAccounts = [{ id: 'acc_hdfc', name: 'HDFC', type: AccountType.BANK }];
    assert.throws(() => validateTransaction(txnWithGhostAccount, existingAccounts), /Referenced account does not exist/);
});

console.log(`--- CASHBOOK CONTRACTS SUITE PASSED (${assertionsPassed} assertions) ---\n`);
