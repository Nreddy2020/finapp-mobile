/**
 * services/cashbook/cashbookMigration.js
 * 
 * Authoritative Demo Fixtures with Frozen Test Vectors & Legacy Migration.
 * 
 * Fixture Vector:
 * - Total Opening Balance: ₹25,000 (2500000 paise)
 * - Total Income: ₹87,000 (8700000 paise) [Salary ₹75,000 + Consulting ₹12,000]
 * - Total Expense: ₹30,500 (3050000 paise) [Rent ₹22,000 + Groceries ₹6,400 + Electricity ₹2,100]
 * - Total Transfers: ₹5,000 (500000 paise) [HDFC to Cash, Net-Zero]
 * - Net Cash Flow: ₹56,500 (5650000 paise)
 * - Closing Balance: ₹81,500 (8150000 paise) [HDFC ₹71,500 + Cash ₹10,000]
 */

import {
    AccountType,
    AccountNature,
    TransactionType,
    TransactionStatus,
    TransactionSource,
    createMoneyPaise,
    rupeesToMoneyPaise,
    createAccount,
    createOpeningBalanceRecord
} from './cashbookContracts.js';

export const FROZEN_DEMO_VECTOR = Object.freeze({
    expectedOpeningBalancePaise: '2500000',
    expectedIncomePaise: '8700000',
    expectedExpensePaise: '3050000',
    expectedTransferVolumePaise: '500000',
    expectedNetCashFlowPaise: '5650000',
    expectedClosingBalancePaise: '8150000',
    expectedHdfcClosingPaise: '7150000',
    expectedCashClosingPaise: '1000000',
    fixtureCount: 7 // 2 opening balance + 2 income + 3 expense + 1 transfer = 8 items
});

/**
 * Builds the authoritative 12 Demo Fixture records (accounts + ledger transactions).
 */
export function buildDemoCashbookFixtures() {
    // 1. Standard Accounts
    const accountHdfc = createAccount({
        id: 'demo_acc_hdfc',
        name: 'HDFC Bank - Salary A/c',
        type: AccountType.BANK,
        institution: 'HDFC Bank',
        accountNumberLast4: '4092'
    });

    const accountCash = createAccount({
        id: 'demo_acc_cash',
        name: 'Physical Cash Wallet',
        type: AccountType.CASH
    });

    const accountCreditCard = createAccount({
        id: 'demo_acc_cc',
        name: 'ICICI Amazon Pay Credit Card',
        type: AccountType.CREDIT_CARD,
        institution: 'ICICI Bank',
        accountNumberLast4: '8812'
    });

    const accountEpfo = createAccount({
        id: 'acc_epfo_uan',
        name: 'EPFO UAN Restricted Portfolio',
        type: AccountType.INVESTMENT,
        institution: 'EPFO'
    });

    const accountLoanLiability = createAccount({
        id: 'acc_loan_liability',
        name: 'Home Loan Liability',
        type: AccountType.LOAN,
        institution: 'SBI'
    });

    const accountLoanReceivable = createAccount({
        id: 'acc_loan_receivable',
        name: 'Borrower Loan Receivables',
        type: AccountType.OTHER
    });

    const accountInvestment = createAccount({
        id: 'inv_asset_portfolio',
        name: 'Mutual Funds & Equities',
        type: AccountType.INVESTMENT
    });

    const accounts = [
        accountHdfc,
        accountCash,
        accountCreditCard,
        accountEpfo,
        accountLoanLiability,
        accountLoanReceivable,
        accountInvestment
    ];

    // 2. Immutable Opening Balances
    const openingHdfc = createOpeningBalanceRecord({
        id: 'demo_opening_hdfc',
        accountId: 'demo_acc_hdfc',
        amount: rupeesToMoneyPaise(20000), // ₹20,000
        date: '2026-09-01',
        description: 'Opening Balance - HDFC Bank'
    });

    const openingCash = createOpeningBalanceRecord({
        id: 'demo_opening_cash',
        accountId: 'demo_acc_cash',
        amount: rupeesToMoneyPaise(5000), // ₹5,000
        date: '2026-09-01',
        description: 'Opening Balance - Cash'
    });

    // 3. Transactions
    const txnSalary = {
        id: 'demo_txn_salary',
        transactionType: TransactionType.INCOME,
        destinationAccountId: 'demo_acc_hdfc',
        amount: rupeesToMoneyPaise(75000),
        category: 'salary',
        subcategory: 'Primary Job',
        date: '2026-09-01',
        description: 'Monthly Salary Credit',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        version: 1,
        idempotencyKey: 'demo:salary:20260901',
        createdAt: '2026-09-01T09:00:00.000Z',
        updatedAt: '2026-09-01T09:00:00.000Z'
    };

    const txnConsulting = {
        id: 'demo_txn_consulting',
        transactionType: TransactionType.INCOME,
        destinationAccountId: 'demo_acc_hdfc',
        amount: rupeesToMoneyPaise(12000),
        category: 'freelance',
        subcategory: 'Consulting',
        date: '2026-09-02',
        description: 'Tech Advisory Retainer',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        version: 1,
        idempotencyKey: 'demo:consulting:20260902',
        createdAt: '2026-09-02T14:30:00.000Z',
        updatedAt: '2026-09-02T14:30:00.000Z'
    };

    const txnRent = {
        id: 'demo_txn_rent',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'demo_acc_hdfc',
        amount: rupeesToMoneyPaise(22000),
        category: 'housing',
        subcategory: 'Rent',
        date: '2026-09-03',
        description: 'House Rent Payment',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        version: 1,
        idempotencyKey: 'demo:rent:20260903',
        createdAt: '2026-09-03T10:00:00.000Z',
        updatedAt: '2026-09-03T10:00:00.000Z'
    };

    const txnGroceries = {
        id: 'demo_txn_groceries',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'demo_acc_hdfc',
        amount: rupeesToMoneyPaise(6400),
        category: 'food',
        subcategory: 'Groceries',
        date: '2026-09-04',
        description: 'Blinkit & Supermarket Groceries',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        version: 1,
        idempotencyKey: 'demo:groceries:20260904',
        createdAt: '2026-09-04T18:15:00.000Z',
        updatedAt: '2026-09-04T18:15:00.000Z'
    };

    const txnElectricity = {
        id: 'demo_txn_electricity',
        transactionType: TransactionType.EXPENSE,
        sourceAccountId: 'demo_acc_hdfc',
        amount: rupeesToMoneyPaise(2100),
        category: 'utilities',
        subcategory: 'Electricity',
        date: '2026-09-05',
        description: 'Electricity Bill Payment',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        version: 1,
        idempotencyKey: 'demo:elec:20260905',
        createdAt: '2026-09-05T11:45:00.000Z',
        updatedAt: '2026-09-05T11:45:00.000Z'
    };

    const txnTransferHdfcToCash = {
        id: 'demo_txn_transfer',
        transactionType: TransactionType.TRANSFER,
        sourceAccountId: 'demo_acc_hdfc',
        destinationAccountId: 'demo_acc_cash',
        transferGroupId: 'transfer_grp_demo_01',
        amount: rupeesToMoneyPaise(5000),
        date: '2026-09-05',
        description: 'ATM Cash Withdrawal (HDFC to Cash)',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        version: 1,
        idempotencyKey: 'demo:transfer:atm:20260905',
        createdAt: '2026-09-05T16:00:00.000Z',
        updatedAt: '2026-09-05T16:00:00.000Z'
    };

    const transactions = [
        openingHdfc,
        openingCash,
        txnSalary,
        txnConsulting,
        txnRent,
        txnGroceries,
        txnElectricity,
        txnTransferHdfcToCash
    ];

    return {
        accounts,
        transactions
    };
}
