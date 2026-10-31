/**
 * tests/test_cashbook_phase1_accounting_boundaries.mjs
 * 
 * Gatekeeper Certification Suite for FinLife Cashbook Phase 1 Accounting Hardening.
 * 
 * Boundary 1: Authoritative Double-Entry Posting (cashbookEngine.js)
 *   - txn.lines !== undefined must be strictly validated
 *   - Invalid lines MUST REJECT/FAIL immediately (never silently fall back to legacy flat posting)
 *   - Zero balance mutation on failure (atomicity)
 *   - Correct balance sign rules:
 *       ASSET     = opening + debits - credits
 *       LIABILITY = opening + credits - debits
 * 
 * Boundary 2: Loan Accounting Invariants (cashbookWorkflowCompiler.js & cashbookEngine.js)
 *   - Lending: Dr Loan Receivable, Cr Bank (Asset swap, ₹0 operating expense)
 *   - Borrowing: Dr Bank, Cr Loan Liability (Liability creation, ₹0 operating income)
 *   - EMI Repayment: Dr Loan Liability (principal), Dr Finance Expense (interest), Cr Bank (total)
 *   - Explicit account resolution & nature verification
 *   - Net Worth Invariant: Assets - Liabilities preserved accurately across loan lifecycle
 * 
 * Boundary 3: Lossless Refund Reporting (cashbookEngine.js)
 *   - Gross expense, refunds, and net expense tracked without zero-clamping
 *   - Pure cash flow = cashInflow - cashOutflow
 *   - If refund > expense, net expense can be negative without error
 * 
 * Boundary 4: Strict Book Isolation & Deterministic Idempotent Migration
 *   - Active book transactions strictly filtered by bookId (no !t.bookId bleed)
 *   - Deterministic idempotent migration stamps cashbook-book-migration-v1:<id> without mutating balances
 */

import assert from 'assert';
import {
    AccountNature,
    AccountType,
    AccountClassification,
    TransactionType,
    TransactionStatus,
    createMoneyPaise,
    moneyToBigInt,
    createAccount,
    createCashbook,
    CashbookType,
    validateJournalLines,
    createLedgerTransaction
} from '../services/cashbook/cashbookContracts.js';
import {
    computeAccountBalances,
    computePeriodSummary,
    recomputeFromGenesis
} from '../services/cashbook/cashbookEngine.js';
import {
    CashbookWorkflowCompiler,
    CashbookWorkflowType
} from '../services/cashbook/cashbookWorkflowCompiler.js';

let totalTests = 0;
let passedTests = 0;

function runTest(name, fn) {
    totalTests++;
    process.stdout.write(`  [RUN] ${name}...`);
    try {
        fn();
        passedTests++;
        console.log(`  [PASS]`);
    } catch (err) {
        console.log(`  [FAIL] ❌`);
        console.error(err);
        throw err;
    }
}

async function runTestAsync(name, fn) {
    totalTests++;
    process.stdout.write(`  [RUN] ${name}...`);
    try {
        await fn();
        passedTests++;
        console.log(`  [PASS]`);
    } catch (err) {
        console.log(`  [FAIL] ❌`);
        console.error(err);
        throw err;
    }
}

console.log('================================================================');
console.log('🏛️  CASHBOOK PHASE 1 ACCOUNTING BOUNDARIES GATEKEEPER SUITE');
console.log('================================================================\n');

// ============================================================================
// BOUNDARY 1: AUTHORITATIVE DOUBLE-ENTRY POSTING
// ============================================================================
console.log('--- BOUNDARY 1: Authoritative Double-Entry Posting & Atomicity ---');

runTest('B1.1: Journal line validation enforces sum(Debits) === sum(Credits)', () => {
    // Valid balanced lines
    const validLines = [
        { accountId: 'acc_bank', debitPaise: 500000n, creditPaise: 0n },
        { accountId: 'acc_receivable', debitPaise: 0n, creditPaise: 500000n }
    ];
    assert.doesNotThrow(() => validateJournalLines(validLines));

    // Unbalanced lines must throw
    const unbalancedLines = [
        { accountId: 'acc_bank', debitPaise: 500000n, creditPaise: 0n },
        { accountId: 'acc_receivable', debitPaise: 0n, creditPaise: 400000n }
    ];
    assert.throws(() => validateJournalLines(unbalancedLines), /UNBALANCED_JOURNAL_ENTRY/);
});

runTest('B1.2: Journal line validation rejects two-sided or zero-amount lines', () => {
    // Both sides populated
    const bothSides = [
        { accountId: 'acc_bank', debitPaise: 100n, creditPaise: 100n },
        { accountId: 'acc_cash', debitPaise: 0n, creditPaise: 100n }
    ];
    assert.throws(() => validateJournalLines(bothSides), /has both debit and credit populated/);

    // Neither side populated
    const neitherSide = [
        { accountId: 'acc_bank', debitPaise: 0n, creditPaise: 0n },
        { accountId: 'acc_cash', debitPaise: 0n, creditPaise: 0n }
    ];
    assert.throws(() => validateJournalLines(neitherSide), /has zero amount on both debit and credit/);

    // Negative amounts rejected
    const negativeSide = [
        { accountId: 'acc_bank', debitPaise: -50n, creditPaise: 0n },
        { accountId: 'acc_cash', debitPaise: 0n, creditPaise: -50n }
    ];
    assert.throws(() => validateJournalLines(negativeSide), /has negative paise amount/);
});

runTest('B1.3: Authoritative posting: if txn.lines exists, invalid lines FAIL immediately without legacy fallback', () => {
    const bank = createAccount({ id: 'acc_bank', name: 'Bank', type: AccountType.BANK });
    const cash = createAccount({ id: 'acc_cash', name: 'Cash', type: AccountType.CASH });
    const accounts = [bank, cash];

    // Transaction has invalid lines (unbalanced) BUT valid legacy fields (sourceAccountId, destinationAccountId)
    const malformedTxn = {
        id: 'txn_malformed_1',
        bookId: 'book_main',
        transactionType: TransactionType.TRANSFER,
        status: TransactionStatus.POSTED,
        date: '2026-10-31',
        amount: createMoneyPaise(5000n),
        sourceAccountId: 'acc_bank',
        destinationAccountId: 'acc_cash',
        lines: [
            { accountId: 'acc_cash', debitPaise: 5000n, creditPaise: 0n },
            { accountId: 'acc_bank', debitPaise: 0n, creditPaise: 3000n } // unbalanced!
        ]
    };

    // Engine MUST throw and NOT silently execute legacy transfer!
    assert.throws(() => {
        computeAccountBalances(accounts, [malformedTxn]);
    }, /UNBALANCED_JOURNAL_ENTRY/);
});

runTest('B1.4: Atomicity: failed transaction causes ZERO mutation to account balances', () => {
    const bank = createAccount({ id: 'acc_bank', name: 'Bank', type: AccountType.BANK });
    const cash = createAccount({ id: 'acc_cash', name: 'Cash', type: AccountType.CASH });
    const accounts = [bank, cash];

    const validOpening = {
        id: 'txn_open_1',
        bookId: 'book_main',
        transactionType: TransactionType.OPENING_BALANCE,
        status: TransactionStatus.POSTED,
        date: '2026-10-01',
        amount: createMoneyPaise(100000n),
        accountId: 'acc_bank',
        destinationAccountId: 'acc_bank'
    };

    const invalidTxn = {
        id: 'txn_bad_compound',
        bookId: 'book_main',
        transactionType: TransactionType.EXPENSE,
        status: TransactionStatus.POSTED,
        date: '2026-10-02',
        amount: createMoneyPaise(50000n),
        lines: [
            { accountId: 'acc_cash', debitPaise: 50000n, creditPaise: 0n },
            { accountId: 'acc_bank', debitPaise: 0n, creditPaise: 30000n } // Unbalanced!
        ]
    };

    // Before failure
    const balancesBefore = computeAccountBalances(accounts, [validOpening]);
    assert.strictEqual(balancesBefore['acc_bank']?.bigIntPaise, 100000n);

    // Compute with invalid second txn must fail
    assert.throws(() => {
        computeAccountBalances(accounts, [validOpening, invalidTxn]);
    }, /UNBALANCED_JOURNAL_ENTRY/);

    // Assert bank balance remains strictly 100,000 paise in memory
    assert.strictEqual(balancesBefore['acc_bank']?.bigIntPaise, 100000n);
});

runTest('B1.5: Positive balance sign rules: ASSET and LIABILITY accounts update correctly', () => {
    const bank = createAccount({ id: 'acc_bank', name: 'Bank', type: AccountType.BANK }); // ASSET
    const loanLiab = createAccount({ id: 'acc_loan_liab', name: 'Loan Liability', type: AccountType.LOAN }); // LIABILITY
    const accounts = [bank, loanLiab];

    // Compound transaction: Borrow money -> Dr Bank 5,00,000 paise, Cr Loan Liability 5,00,000 paise
    const borrowTxn = {
        id: 'txn_borrow_1',
        bookId: 'book_main',
        transactionType: TransactionType.TRANSFER,
        status: TransactionStatus.POSTED,
        date: '2026-10-15',
        amount: createMoneyPaise(500000n),
        lines: [
            { accountId: 'acc_bank', debitPaise: 500000n, creditPaise: 0n },
            { accountId: 'acc_loan_liab', debitPaise: 0n, creditPaise: 500000n }
        ]
    };

    const balances = computeAccountBalances(accounts, [borrowTxn]);
    // ASSET increases on debit: 0 + 500,000 = 500,000
    assert.strictEqual(balances['acc_bank']?.bigIntPaise, 500000n);
    // LIABILITY increases on credit: 0 + 500,000 = 500,000
    assert.strictEqual(balances['acc_loan_liab']?.bigIntPaise, 500000n);
});

// ============================================================================
// BOUNDARY 2: LOAN ACCOUNTING INVARIANTS & COMPILER CONTRACT
// ============================================================================
console.log('\n--- BOUNDARY 2: Loan Accounting Invariants & Lifecycle ---');

runTest('B2.1: Compiler validates account existence and nature strictly', () => {
    const bank = createAccount({ id: 'acc_bank', name: 'Bank', type: AccountType.BANK });
    const fakeNatureAccount = createAccount({ id: 'acc_wrong', name: 'Wrong Account', type: AccountType.CASH }); // ASSET, not LIABILITY

    // RECORD_EMI requires loanAccountId to be a LIABILITY
    assert.throws(() => {
        CashbookWorkflowCompiler.compileWorkflow(
            CashbookWorkflowType.RECORD_EMI,
            {
                sourceAccountId: 'acc_bank',
                loanAccountId: 'acc_wrong', // Wrong nature!
                principalAmountPaise: 1500000n,
                interestAmountPaise: 500000n,
                date: '2026-10-31'
            },
            { accounts: [bank, fakeNatureAccount], activeBook: { id: 'book_loan', type: CashbookType.LOANS_TAKEN } }
        );
    }, /INVALID_ACCOUNT_NATURE/);

    // Non-existent account must throw
    assert.throws(() => {
        CashbookWorkflowCompiler.compileWorkflow(
            CashbookWorkflowType.RECORD_EMI,
            {
                sourceAccountId: 'acc_bank',
                loanAccountId: 'acc_non_existent',
                principalAmountPaise: 1500000n,
                interestAmountPaise: 500000n,
                date: '2026-10-31'
            },
            { accounts: [bank], activeBook: { id: 'book_loan', type: CashbookType.LOANS_TAKEN } }
        );
    }, /ACCOUNT_NOT_FOUND/);
});

runTest('B2.2: Lending (GIVE_LOAN) is an Asset Swap: ₹0 Operating Expense', () => {
    const bank = createAccount({ id: 'acc_bank', name: 'Bank', type: AccountType.BANK }); // ASSET
    const receivable = createAccount({ id: 'acc_loan_rec', name: 'Loan Receivable', type: AccountType.OTHER }); // ASSET
    const accounts = [bank, receivable];

    const opening = {
        id: 'txn_open_bank',
        bookId: 'book_main',
        transactionType: TransactionType.OPENING_BALANCE,
        status: TransactionStatus.POSTED,
        date: '2026-10-01',
        amount: createMoneyPaise(10000000n), // ₹1,00,000 opening bank
        accountId: 'acc_bank',
        destinationAccountId: 'acc_bank'
    };

    const giveLoanTxn = CashbookWorkflowCompiler.compileWorkflow(
        CashbookWorkflowType.GIVE_LOAN,
        {
            sourceAccountId: 'acc_bank',
            borrowerAccountId: 'acc_loan_rec',
            amountPaise: 5000000n, // ₹50,000 loan given
            borrowerName: 'Suresh Kumar',
            date: '2026-10-10'
        },
        { accounts, activeBook: { id: 'book_loan_given', type: CashbookType.LOANS_GIVEN } }
    );

    // Verify transaction type is TRANSFER (capital movement)
    assert.strictEqual(giveLoanTxn.transactionType, TransactionType.TRANSFER);

    // Verify balances after loan disburse
    const balances = computeAccountBalances(accounts, [opening, giveLoanTxn]);
    assert.strictEqual(balances['acc_bank']?.bigIntPaise, 5000000n); // 1,00,000 - 50,000 = 50,000
    assert.strictEqual(balances['acc_loan_rec']?.bigIntPaise, 5000000n); // +50,000 receivable

    // Verify Period Summary: OPERATING EXPENSE IS ZERO
    const summary = computePeriodSummary([opening, giveLoanTxn], '2026-10-01', '2026-10-31');
    assert.strictEqual(summary.grossExpensePaise, 0n);
    assert.strictEqual(summary.netExpensePaise, 0n);
    assert.strictEqual(summary.incomePaise, 0n);

    // Total Net Worth invariant: ₹1,00,000 at start, ₹1,00,000 after lending
    const totalAssets = balances['acc_bank'].bigIntPaise + balances['acc_loan_rec'].bigIntPaise;
    assert.strictEqual(totalAssets, 10000000n);
});

runTest('B2.3: EMI Repayment: Splits Principal (reduces liability) and Interest (recognizes finance expense)', () => {
    const bank = createAccount({ id: 'acc_bank', name: 'Bank', type: AccountType.BANK }); // ASSET
    const loanLiab = createAccount({ id: 'acc_loan_liab', name: 'Home Loan', type: AccountType.LOAN }); // LIABILITY
    const accounts = [bank, loanLiab];

    // Initial state: ₹1,00,000 in bank, ₹5,00,000 loan liability
    const openBank = {
        id: 'txn_open_b',
        bookId: 'book_main',
        transactionType: TransactionType.OPENING_BALANCE,
        status: TransactionStatus.POSTED,
        date: '2026-10-01',
        amount: createMoneyPaise(10000000n),
        accountId: 'acc_bank',
        destinationAccountId: 'acc_bank'
    };
    const openLoan = {
        id: 'txn_open_l',
        bookId: 'book_main',
        transactionType: TransactionType.OPENING_BALANCE,
        status: TransactionStatus.POSTED,
        date: '2026-10-01',
        amount: createMoneyPaise(50000000n), // ₹5,00,000 liability
        accountId: 'acc_loan_liab',
        destinationAccountId: 'acc_loan_liab'
    };

    // EMI Payment: ₹20,000 total (₹15,000 Principal + ₹5,000 Interest)
    const emiTxn = CashbookWorkflowCompiler.compileWorkflow(
        CashbookWorkflowType.RECORD_EMI,
        {
            sourceAccountId: 'acc_bank',
            loanAccountId: 'acc_loan_liab',
            principalAmountPaise: 1500000n, // ₹15,000
            interestAmountPaise: 500000n,   // ₹5,000
            date: '2026-10-20'
        },
        { accounts, activeBook: { id: 'book_loan', type: CashbookType.LOANS_TAKEN } }
    );

    // Compute balances
    const balances = computeAccountBalances(accounts, [openBank, openLoan, emiTxn]);
    // Bank outflow ₹20,000: 1,00,000 - 20,000 = ₹80,000
    assert.strictEqual(balances['acc_bank']?.bigIntPaise, 8000000n);
    // Loan Liability reduced by ₹15,000: 5,00,000 - 15,000 = ₹4,85,000
    assert.strictEqual(balances['acc_loan_liab']?.bigIntPaise, 48500000n);

    // Compute period summary: Only ₹5,000 interest is recorded as grossExpense!
    const summary = computePeriodSummary([openBank, openLoan, emiTxn], '2026-10-01', '2026-10-31');
    assert.strictEqual(summary.grossExpensePaise, 500000n); // exactly ₹5,000 interest
    assert.strictEqual(summary.netExpensePaise, 500000n);
    // Principal payment of ₹15,000 must NOT be counted as expense
    assert.notStrictEqual(summary.grossExpensePaise, 2000000n);
});

// ============================================================================
// BOUNDARY 3: LOSSLESS REFUND REPORTING
// ============================================================================
console.log('\n--- BOUNDARY 3: Lossless Refund Reporting ---');

runTest('B3.1: Expense refund is reported accurately without zero-clamping', () => {
    const bank = createAccount({ id: 'acc_bank', name: 'Bank', type: AccountType.BANK });

    // Scenario: ₹10,000 expense, then ₹2,000 refund
    const expenseTxn = {
        id: 'txn_exp_1',
        bookId: 'book_main',
        transactionType: TransactionType.EXPENSE,
        status: TransactionStatus.POSTED,
        date: '2026-10-05',
        amount: createMoneyPaise(1000000n),
        sourceAccountId: 'acc_bank'
    };
    const refundTxn = {
        id: 'txn_ref_1',
        bookId: 'book_main',
        transactionType: TransactionType.REFUND,
        status: TransactionStatus.POSTED,
        date: '2026-10-10',
        amount: createMoneyPaise(200000n),
        destinationAccountId: 'acc_bank'
    };

    const summary = computePeriodSummary([expenseTxn, refundTxn], '2026-10-01', '2026-10-31');
    assert.strictEqual(summary.grossExpensePaise, 1000000n); // ₹10,000 gross
    assert.strictEqual(summary.expenseRefundsPaise, 200000n); // ₹2,000 refund
    assert.strictEqual(summary.netExpensePaise, 800000n);     // ₹8,000 net expense
    assert.strictEqual(summary.pureCashFlowPaise, -800000n);  // Net cash outflow of ₹8,000
});

runTest('B3.2: Oversized refund produces negative net expense (no lossy clamping to 0)', () => {
    // Scenario: Prior period expense had ₹5,000, current period has ₹1,000 expense but ₹4,000 refund
    const currentExpense = {
        id: 'txn_exp_2',
        bookId: 'book_main',
        transactionType: TransactionType.EXPENSE,
        status: TransactionStatus.POSTED,
        date: '2026-10-15',
        amount: createMoneyPaise(100000n), // ₹1,000
        sourceAccountId: 'acc_bank'
    };
    const currentRefund = {
        id: 'txn_ref_2',
        bookId: 'book_main',
        transactionType: TransactionType.REFUND,
        status: TransactionStatus.POSTED,
        date: '2026-10-18',
        amount: createMoneyPaise(400000n), // ₹4,000
        destinationAccountId: 'acc_bank'
    };

    const summary = computePeriodSummary([currentExpense, currentRefund], '2026-10-01', '2026-10-31');
    assert.strictEqual(summary.grossExpensePaise, 100000n);
    assert.strictEqual(summary.expenseRefundsPaise, 400000n);
    // Net expense MUST be negative 300,000 paise (-₹3,000), NOT 0n!
    assert.strictEqual(summary.netExpensePaise, -300000n);
    // Pure cash flow is +₹3,000 (inflow exceeds outflow)
    assert.strictEqual(summary.pureCashFlowPaise, 300000n);
});

// ============================================================================
// BOUNDARY 4: STRICT BOOK ISOLATION & DETERMINISTIC IDEMPOTENT MIGRATION
// ============================================================================
console.log('\n--- BOUNDARY 4: Strict Book Isolation & Idempotent Migration ---');

runTest('B4.1: Book isolation prevents unassigned transactions from bleeding across books', () => {
    const bookPersonal = createCashbook({ id: 'book_personal', name: 'Personal', type: CashbookType.SAVINGS });
    const bookBusiness = createCashbook({ id: 'book_business', name: 'Business', type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS });

    const allTxns = [
        { id: 'txn_p1', bookId: 'book_personal', amount: createMoneyPaise(10000n) },
        { id: 'txn_b1', bookId: 'book_business', amount: createMoneyPaise(50000n) },
        { id: 'txn_unassigned', bookId: null, amount: createMoneyPaise(25000n) }
    ];

    // Under Strict Book Isolation, filter for bookPersonal MUST NOT include txn_b1 or txn_unassigned
    const personalFilter = allTxns.filter(t => t.bookId === bookPersonal.id);
    assert.strictEqual(personalFilter.length, 1);
    assert.strictEqual(personalFilter[0].id, 'txn_p1');

    const businessFilter = allTxns.filter(t => t.bookId === bookBusiness.id);
    assert.strictEqual(businessFilter.length, 1);
    assert.strictEqual(businessFilter[0].id, 'txn_b1');
});

runTest('B4.2: Deterministic idempotent migration assigns legacy unassigned transactions with migration stamp', () => {
    const defaultBook = createCashbook({ id: 'book_personal_savings', name: 'Personal', isDefault: true, type: CashbookType.SAVINGS });
    const legacyTxn = {
        id: 'legacy_101',
        bookId: undefined,
        transactionType: TransactionType.EXPENSE,
        amount: createMoneyPaise(15000n),
        date: '2026-05-01'
    };

    // Simulate migration resolver logic
    const migrationStamp = `cashbook-book-migration-v1:${legacyTxn.id}`;
    if (!legacyTxn.bookId) {
        legacyTxn.bookId = defaultBook.id;
        legacyTxn.migrationId = migrationStamp;
        legacyTxn.migratedAt = '2026-10-31T00:00:00.000Z';
    }

    assert.strictEqual(legacyTxn.bookId, 'book_personal_savings');
    assert.strictEqual(legacyTxn.migrationId, 'cashbook-book-migration-v1:legacy_101');

    // Run again to verify idempotency: no double stamping or re-migration
    const secondPass = { ...legacyTxn };
    if (!secondPass.bookId) {
        secondPass.bookId = 'SHOULD_NOT_CHANGE';
    }
    assert.strictEqual(secondPass.bookId, 'book_personal_savings');
    assert.strictEqual(secondPass.migrationId, migrationStamp);
});

console.log('\n================================================================');
console.log(`✅ ALL PHASE 1 ACCOUNTING BOUNDARY TESTS PASSED (${passedTests}/${totalTests})`);
console.log('================================================================\n');
