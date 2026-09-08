/**
 * tests/test_cashbook_engine.mjs
 * 
 * Test Suite 2: Pure Domain Engine, Asset/Liability Sign Conventions,
 * Transfer Neutrality Invariant, Genesis Recomputation, and Frozen Demo Vector.
 */

import assert from 'assert';
import {
    AccountType,
    AccountNature,
    TransactionType,
    TransactionStatus,
    BalanceEffect,
    RefundTargetType,
    createMoneyPaise,
    rupeesToMoneyPaise,
    createAccount,
    createOpeningBalanceRecord
} from '../services/cashbook/cashbookContracts.js';

import {
    computeAccountBalances,
    recomputeFromGenesis,
    computePeriodSummary,
    createTransferRecord,
    computeCategoryBreakdown
} from '../services/cashbook/cashbookEngine.js';

import {
    buildDemoCashbookFixtures,
    FROZEN_DEMO_VECTOR
} from '../services/cashbook/cashbookMigration.js';

console.log('--- START TEST SUITE: CASHBOOK DOMAIN ENGINE ---');
let assertionsPassed = 0;

function it(desc, fn) {
    fn();
    assertionsPassed++;
    console.log(`  [PASS] ${desc}`);
}

// 1. Asset Account Balance Arithmetic
it('Asset accounts: Income increases balance; Expense decreases balance', () => {
    const bank = createAccount({ id: 'bank_01', name: 'Savings', type: AccountType.BANK });
    const opening = createOpeningBalanceRecord({ id: 'op_1', accountId: 'bank_01', amount: rupeesToMoneyPaise(10000) });
    const income = {
        id: 'inc_1',
        transactionType: TransactionType.INCOME,
        destinationAccountId: 'bank_01',
        amount: rupeesToMoneyPaise(5000),
        date: '2026-09-02',
        status: TransactionStatus.POSTED
    };
    const expense = {
        id: 'exp_1',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'bank_01',
        amount: rupeesToMoneyPaise(3000),
        date: '2026-09-03',
        status: TransactionStatus.POSTED
    };

    const balances = computeAccountBalances([bank], [opening, income, expense]);
    assert.strictEqual(balances['bank_01'].paise, '1200000'); // ₹10,000 + ₹5,000 - ₹3,000 = ₹12,000
    assert.strictEqual(balances['bank_01'].formatted, '₹12,000');
});

// 2. Liability Account Balance Arithmetic (Credit Card / Loan)
it('Liability accounts: Positive balance = debt owed; Purchases increase debt; Payments reduce debt', () => {
    const bank = createAccount({ id: 'bank_01', name: 'HDFC', type: AccountType.BANK });
    const cc = createAccount({ id: 'cc_01', name: 'Credit Card', type: AccountType.CREDIT_CARD });

    const openBank = createOpeningBalanceRecord({ id: 'op_b', accountId: 'bank_01', amount: rupeesToMoneyPaise(50000) });
    const openCc = createOpeningBalanceRecord({ id: 'op_cc', accountId: 'cc_01', amount: rupeesToMoneyPaise(5000) }); // ₹5,000 initial debt

    // Spend ₹2,000 on credit card
    const ccPurchase = {
        id: 'cc_spend',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'cc_01',
        amount: rupeesToMoneyPaise(2000),
        date: '2026-09-02',
        status: TransactionStatus.POSTED
    };

    // Pay ₹4,000 towards credit card from Bank (Transfer)
    const ccBillPayment = {
        id: 'cc_pay',
        transactionType: TransactionType.TRANSFER,
        sourceAccountId: 'bank_01',
        destinationAccountId: 'cc_01',
        transferGroupId: 'grp_cc_pay',
        amount: rupeesToMoneyPaise(4000),
        date: '2026-09-03',
        status: TransactionStatus.POSTED
    };

    const balances = computeAccountBalances([bank, cc], [openBank, openCc, ccPurchase, ccBillPayment]);

    // Bank: 50,000 - 4,000 = 46,000
    assert.strictEqual(balances['bank_01'].paise, '4600000');
    // CC: 5,000 (starting debt) + 2,000 (spend) - 4,000 (payment) = 3,000 remaining debt
    assert.strictEqual(balances['cc_01'].paise, '300000');
    assert.strictEqual(balances['cc_01'].formatted, '₹3,000');
});

// 3. Transfer Neutrality Invariant
it('Transfer between two accounts has net-zero effect on total wealth and zero effect on income/expense', () => {
    const bank = createAccount({ id: 'bank_01', name: 'Bank', type: AccountType.BANK });
    const cash = createAccount({ id: 'cash_01', name: 'Cash', type: AccountType.CASH });

    const openBank = createOpeningBalanceRecord({ id: 'op_b', accountId: 'bank_01', amount: rupeesToMoneyPaise(20000) });
    const openCash = createOpeningBalanceRecord({ id: 'op_c', accountId: 'cash_01', amount: rupeesToMoneyPaise(5000) });

    const transfer = createTransferRecord({
        id: 'tr_1',
        sourceAccountId: 'bank_01',
        destinationAccountId: 'cash_01',
        amount: rupeesToMoneyPaise(7000),
        date: '2026-09-02'
    });

    const balances = computeAccountBalances([bank, cash], [openBank, openCash, transfer]);
    assert.strictEqual(balances['bank_01'].paise, '1300000'); // 20,000 - 7,000 = 13,000
    assert.strictEqual(balances['cash_01'].paise, '1200000'); // 5,000 + 7,000 = 12,000

    const totalBefore = 2000000n + 500000n;
    const totalAfter = balances['bank_01'].bigIntPaise + balances['cash_01'].bigIntPaise;
    assert.strictEqual(totalAfter, totalBefore); // Net wealth preserved!

    // Check period summary
    const summary = computePeriodSummary([openBank, openCash, transfer]);
    assert.strictEqual(summary.income.paise, '0');
    assert.strictEqual(summary.expense.paise, '0');
    assert.strictEqual(summary.transfers.volumePaise, '700000');
    assert.strictEqual(summary.transfers.count, 1);
});

// 4. Refund Classification
it('Refund reduces period expenses by default, or increases income if marked', () => {
    const bank = createAccount({ id: 'bank_01', name: 'Bank', type: AccountType.BANK });
    const expense = {
        id: 'exp_1',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'bank_01',
        amount: rupeesToMoneyPaise(5000),
        date: '2026-09-01',
        status: TransactionStatus.POSTED
    };
    const refundExpense = {
        id: 'ref_1',
        transactionType: TransactionType.REFUND,
        destinationAccountId: 'bank_01',
        refundTargetType: RefundTargetType.EXPENSE,
        amount: rupeesToMoneyPaise(2000),
        date: '2026-09-02',
        status: TransactionStatus.POSTED
    };
    const refundIncome = {
        id: 'ref_2',
        transactionType: TransactionType.REFUND,
        destinationAccountId: 'bank_01',
        refundTargetType: RefundTargetType.INCOME,
        amount: rupeesToMoneyPaise(1500),
        date: '2026-09-02',
        status: TransactionStatus.POSTED
    };

    const summary = computePeriodSummary([expense, refundExpense, refundIncome]);
    // Expense was 5000, refund reduces by 2000 -> 3000
    assert.strictEqual(summary.expense.paise, '300000');
    // Income refund adds to income -> 1500
    assert.strictEqual(summary.income.paise, '150000');
});

// 5. Explicit Adjustment Direction
it('Adjustment increases or decreases account balance according to balanceEffect', () => {
    const cash = createAccount({ id: 'cash_01', name: 'Cash', type: AccountType.CASH });
    const opening = createOpeningBalanceRecord({ id: 'op_c', accountId: 'cash_01', amount: rupeesToMoneyPaise(1000) });

    const adjUp = {
        id: 'adj_1',
        transactionType: TransactionType.ADJUSTMENT,
        accountId: 'cash_01',
        amount: rupeesToMoneyPaise(250),
        balanceEffect: BalanceEffect.INCREASE,
        adjustmentReason: 'Audit reconciliation surplus',
        date: '2026-09-02',
        status: TransactionStatus.POSTED
    };

    const balancesUp = computeAccountBalances([cash], [opening, adjUp]);
    assert.strictEqual(balancesUp['cash_01'].paise, '125000'); // 1,000 + 250 = 1,250

    const adjDown = {
        id: 'adj_2',
        transactionType: TransactionType.ADJUSTMENT,
        accountId: 'cash_01',
        amount: rupeesToMoneyPaise(400),
        balanceEffect: BalanceEffect.DECREASE,
        adjustmentReason: 'Audit reconciliation deficit',
        date: '2026-09-03',
        status: TransactionStatus.POSTED
    };

    const balancesDown = computeAccountBalances([cash], [opening, adjUp, adjDown]);
    assert.strictEqual(balancesDown['cash_01'].paise, '85000'); // 1,250 - 400 = 850
});

// 6. Voided Transactions Invariant
it('Voided transactions are strictly ignored during balance summation', () => {
    const bank = createAccount({ id: 'bank_01', name: 'Bank', type: AccountType.BANK });
    const opening = createOpeningBalanceRecord({ id: 'op_b', accountId: 'bank_01', amount: rupeesToMoneyPaise(50000) });

    const activeExp = {
        id: 'exp_active',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'bank_01',
        amount: rupeesToMoneyPaise(5000),
        date: '2026-09-02',
        status: TransactionStatus.POSTED
    };

    const voidedExp = {
        id: 'exp_void',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'bank_01',
        amount: rupeesToMoneyPaise(20000),
        date: '2026-09-02',
        status: TransactionStatus.VOIDED,
        voidReason: 'Duplicate entry'
    };

    const balances = computeAccountBalances([bank], [opening, activeExp, voidedExp]);
    assert.strictEqual(balances['bank_01'].paise, '4500000'); // 50,000 - 5,000 = 45,000 (20,000 ignored!)
});

// 7. Genesis Recomputation & Ledger Integrity
it('recomputeFromGenesis detects missing accounts, self-transfers, and mutable opening balances', () => {
    const bank = createAccount({ id: 'bank_01', name: 'Bank', type: AccountType.BANK });
    const validOpening = createOpeningBalanceRecord({ id: 'op_b', accountId: 'bank_01', amount: rupeesToMoneyPaise(10000) });

    // Clean ledger passes
    const cleanCheck = recomputeFromGenesis([bank], [validOpening]);
    assert.strictEqual(cleanCheck.isValid, true);
    assert.strictEqual(cleanCheck.anomalies.length, 0);

    // Bad ledger with ghost account, self transfer, mutable opening
    const ghostTxn = {
        id: 'ghost_1',
        transactionType: TransactionType.INCOME,
        destinationAccountId: 'unknown_account',
        amount: rupeesToMoneyPaise(1000),
        date: '2026-09-02',
        status: TransactionStatus.POSTED
    };
    const selfTransfer = {
        id: 'tr_self',
        transactionType: TransactionType.TRANSFER,
        sourceAccountId: 'bank_01',
        destinationAccountId: 'bank_01',
        amount: rupeesToMoneyPaise(1000),
        date: '2026-09-02',
        status: TransactionStatus.POSTED
    };
    const mutableOpening = {
        id: 'op_mut',
        transactionType: TransactionType.OPENING_BALANCE,
        accountId: 'bank_01',
        amount: rupeesToMoneyPaise(1000),
        immutable: false,
        date: '2026-09-01',
        status: TransactionStatus.POSTED
    };

    const badCheck = recomputeFromGenesis([bank], [validOpening, ghostTxn, selfTransfer, mutableOpening]);
    assert.strictEqual(badCheck.isValid, false);
    assert.strictEqual(badCheck.anomalies.some(a => a.code === 'ORPHAN_DESTINATION_ACCOUNT'), true);
    assert.strictEqual(badCheck.anomalies.some(a => a.code === 'SELF_TRANSFER'), true);
    assert.strictEqual(badCheck.anomalies.some(a => a.code === 'MUTABLE_OPENING_BALANCE'), true);
});

// 8. Frozen Demo Vector Verification
it('Authoritative Demo Fixtures match the frozen test vector with 100% precision', () => {
    const demo = buildDemoCashbookFixtures();
    const balances = computeAccountBalances(demo.accounts, demo.transactions);
    const summary = computePeriodSummary(demo.transactions);

    // Verify Income
    assert.strictEqual(summary.income.paise, FROZEN_DEMO_VECTOR.expectedIncomePaise);
    assert.strictEqual(summary.income.formatted, '₹87,000');

    // Verify Expense
    assert.strictEqual(summary.expense.paise, FROZEN_DEMO_VECTOR.expectedExpensePaise);
    assert.strictEqual(summary.expense.formatted, '₹30,500');

    // Verify Net Cash Flow
    assert.strictEqual(summary.netCashFlow.paise, FROZEN_DEMO_VECTOR.expectedNetCashFlowPaise);
    assert.strictEqual(summary.netCashFlow.formatted, '₹56,500');

    // Verify Transfers (Net-Zero)
    assert.strictEqual(summary.transfers.volumePaise, FROZEN_DEMO_VECTOR.expectedTransferVolumePaise);
    assert.strictEqual(summary.transfers.volumeFormatted, '₹5,000');
    assert.strictEqual(summary.transfers.count, 1);

    // Verify Account Balances
    assert.strictEqual(balances['demo_acc_hdfc'].paise, FROZEN_DEMO_VECTOR.expectedHdfcClosingPaise);
    assert.strictEqual(balances['demo_acc_hdfc'].formatted, '₹71,500');

    assert.strictEqual(balances['demo_acc_cash'].paise, FROZEN_DEMO_VECTOR.expectedCashClosingPaise);
    assert.strictEqual(balances['demo_acc_cash'].formatted, '₹10,000');

    // Total closing across asset accounts
    const totalClosingPaise = (balances['demo_acc_hdfc'].bigIntPaise + balances['demo_acc_cash'].bigIntPaise).toString();
    assert.strictEqual(totalClosingPaise, FROZEN_DEMO_VECTOR.expectedClosingBalancePaise);

    // Verify genesis recomputation on demo fixtures
    const genesis = recomputeFromGenesis(demo.accounts, demo.transactions);
    assert.strictEqual(genesis.isValid, true);
    assert.strictEqual(genesis.anomalies.length, 0);
});

// 9. Category Breakdown Calculation
it('computeCategoryBreakdown accurately aggregates expenses and percentages', () => {
    const demo = buildDemoCashbookFixtures();
    const breakdown = computeCategoryBreakdown(demo.transactions, TransactionType.EXPENSE);

    assert.strictEqual(breakdown.totalPaise, '3050000'); // ₹30,500
    assert.strictEqual(breakdown.totalFormatted, '₹30,500');

    // Rent: 22,000 / 30,500 = ~72.13%
    const rentItem = breakdown.breakdown.find(b => b.categoryId === 'housing');
    assert.ok(rentItem);
    assert.strictEqual(rentItem.formatted, '₹22,000');
    assert.ok(rentItem.percentage > 72 && rentItem.percentage < 73);
});

console.log(`--- CASHBOOK DOMAIN ENGINE SUITE PASSED (${assertionsPassed} assertions) ---\n`);
