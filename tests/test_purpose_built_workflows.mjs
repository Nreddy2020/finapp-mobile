/**
 * tests/test_purpose_built_workflows.mjs
 * 
 * Test Suite: Purpose-Built Workflow Compiler & Balanced Ledger Transaction Generation.
 * Verifies that all domain actions compile mathematically balanced LedgerTransactions
 * where Total Debits === Total Credits, and enforces strict domain validations.
 */

import assert from 'assert';
import {
    CashbookExperienceProfile,
    CashbookExperienceConfigMap,
    CashbookType,
    moneyToBigInt
} from '../services/cashbook/cashbookContracts.js';
import {
    compileWorkflowAction,
    WorkflowCompilerError
} from '../services/cashbook/cashbookWorkflowCompiler.js';

console.log('=== TEST SUITE: PURPOSE-BUILT WORKFLOWS & COMPILER ===\n');

const mockAccounts = [
    { id: 'acc_bank_sbi', name: 'SBI Savings', type: 'BANK' },
    { id: 'acc_cash_handy', name: 'Cash Till', type: 'CASH' },
    { id: 'acc_loan_hdfc', name: 'HDFC Home Loan', type: 'LOAN' },
    { id: 'acc_pf_portfolio', name: 'EPFO UAN Portfolio', type: 'INVESTMENT' }
];

function verifyBalancedLines(txn, description = '') {
    assert(txn.lines && txn.lines.length >= 2, `${description}: Transaction must have at least 2 lines`);
    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const line of txn.lines) {
        totalDebit += BigInt(line.debitPaise || '0');
        totalCredit += BigInt(line.creditPaise || '0');
    }

    assert.strictEqual(
        totalDebit,
        totalCredit,
        `${description}: Unbalanced ledger transaction! Debits (${totalDebit}) !== Credits (${totalCredit})`
    );
}

// Test 1: Business Workflows (Cash vs Credit)
console.log('Test 1: Business Operations Workflows');
const bizProfile = CashbookExperienceConfigMap[CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK];
const bizBook = { id: 'book_biz_retail', type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS };

// 1a. Cash Sale
const cashSaleTxn = compileWorkflowAction({
    profile: bizProfile,
    actionId: 'RECORD_SALE',
    input: {
        amountPaise: '500000', // ₹5,000
        isCredit: false,
        customerName: 'Walk-in Customer',
        accountId: 'acc_bank_sbi'
    },
    context: { activeBook: bizBook, accounts: mockAccounts }
});
verifyBalancedLines(cashSaleTxn, 'Business Cash Sale');
assert.strictEqual(cashSaleTxn.lines[0].accountId, 'acc_bank_sbi');
assert.strictEqual(cashSaleTxn.lines[0].debitPaise, '500000');
assert.strictEqual(cashSaleTxn.lines[1].accountId, 'biz_rev_sales');
assert.strictEqual(cashSaleTxn.lines[1].creditPaise, '500000');

// 1b. Credit Sale (Customer Receivable)
const creditSaleTxn = compileWorkflowAction({
    profile: bizProfile,
    actionId: 'RECORD_SALE',
    input: {
        amountPaise: '1200000', // ₹12,000
        isCredit: true,
        customerName: 'Sharma Traders'
    },
    context: { activeBook: bizBook, accounts: mockAccounts }
});
verifyBalancedLines(creditSaleTxn, 'Business Credit Sale');
assert.strictEqual(creditSaleTxn.lines[0].accountId, 'biz_acc_receivables');
assert.strictEqual(creditSaleTxn.lines[1].accountId, 'biz_rev_sales');

// 1c. Customer Payment Received
const paymentRecvTxn = compileWorkflowAction({
    profile: bizProfile,
    actionId: 'RECEIVE_PAYMENT',
    input: {
        amountPaise: '1200000',
        customerName: 'Sharma Traders',
        destinationAccountId: 'acc_bank_sbi'
    },
    context: { activeBook: bizBook, accounts: mockAccounts }
});
verifyBalancedLines(paymentRecvTxn, 'Business Receive Payment');
assert.strictEqual(paymentRecvTxn.lines[0].accountId, 'acc_bank_sbi');
assert.strictEqual(paymentRecvTxn.lines[1].accountId, 'biz_acc_receivables');

// 1d. Credit Purchase (Supplier Payable)
const creditPurchaseTxn = compileWorkflowAction({
    profile: bizProfile,
    actionId: 'RECORD_PURCHASE',
    input: {
        amountPaise: '2500000', // ₹25,000
        isCredit: true,
        supplierName: 'National Distributors'
    },
    context: { activeBook: bizBook, accounts: mockAccounts }
});
verifyBalancedLines(creditPurchaseTxn, 'Business Credit Purchase');
assert.strictEqual(creditPurchaseTxn.lines[0].accountId, 'biz_asset_inventory');
assert.strictEqual(creditPurchaseTxn.lines[1].accountId, 'biz_acc_payables');

// 1e. Pay Supplier
const paySupplierTxn = compileWorkflowAction({
    profile: bizProfile,
    actionId: 'PAY_SUPPLIER',
    input: {
        amountPaise: '2500000',
        supplierName: 'National Distributors',
        sourceAccountId: 'acc_bank_sbi'
    },
    context: { activeBook: bizBook, accounts: mockAccounts }
});
verifyBalancedLines(paySupplierTxn, 'Business Pay Supplier');
assert.strictEqual(paySupplierTxn.lines[0].accountId, 'biz_acc_payables');
assert.strictEqual(paySupplierTxn.lines[1].accountId, 'acc_bank_sbi');
console.log('  ✅ Business cash & credit cycles compile balanced double-entry ledger lines');

// Test 2: Loan Liabilities & Amortization Splits
console.log('\nTest 2: Loan Liabilities (EMI & Prepayment)');
const loanProfile = CashbookExperienceConfigMap[CashbookExperienceProfile.LOANS_TAKEN_REGISTER];
const loanBook = { id: 'book_loan_home', type: CashbookType.LOANS_TAKEN };

// 2a. Monthly EMI with Principal + Interest + Fees
const emiTxn = compileWorkflowAction({
    profile: loanProfile,
    actionId: 'RECORD_EMI',
    input: {
        principalPaise: '3000000', // ₹30,000
        interestPaise: '1500000',  // ₹15,000
        feesPaise: '50000',        // ₹500
        sourceAccountId: 'acc_bank_sbi',
        lenderName: 'HDFC Bank'
    },
    context: { activeBook: loanBook, accounts: mockAccounts }
});
verifyBalancedLines(emiTxn, 'Loan Monthly EMI');
assert.strictEqual(emiTxn.amount.paise, '4550000'); // ₹45,500 total
assert.strictEqual(emiTxn.lines.length, 4); // 3 debits (P, I, F) + 1 credit (Bank)
assert.strictEqual(emiTxn.loanSplit.principal.paise, '3000000');
assert.strictEqual(emiTxn.loanSplit.interest.paise, '1500000');
assert.strictEqual(emiTxn.loanSplit.fees.paise, '50000');

// 2b. Part Prepayment (100% Principal Reduction)
const prepayTxn = compileWorkflowAction({
    profile: loanProfile,
    actionId: 'PREPAY_LOAN',
    input: {
        amountPaise: '10000000', // ₹1,00,000
        sourceAccountId: 'acc_bank_sbi',
        lenderName: 'HDFC Bank'
    },
    context: { activeBook: loanBook, accounts: mockAccounts }
});
verifyBalancedLines(prepayTxn, 'Loan Prepayment');
assert.strictEqual(prepayTxn.lines[0].accountId, 'acc_loan_liability');
assert.strictEqual(prepayTxn.lines[1].accountId, 'acc_bank_sbi');
console.log('  ✅ Loan EMI amortization and prepayments compile perfectly balanced lines');

// Test 3: Provident Fund (Provenance & Interest)
console.log('\nTest 3: Provident Fund Provenance & Interest');
const pfProfile = CashbookExperienceConfigMap[CashbookExperienceProfile.PROVIDENT_FUND_REGISTER];
const pfBook = { id: 'book_pf_epfo', type: CashbookType.PF };

// 3a. Monthly Contribution (Employee + Employer)
const pfContribTxn = compileWorkflowAction({
    profile: pfProfile,
    actionId: 'ADD_CONTRIBUTION',
    input: {
        employeePaise: '500000', // ₹5,000 (12%)
        employerPaise: '500000', // ₹5,000 (3.67% + EPS)
        accountId: 'acc_pf_portfolio'
    },
    context: { activeBook: pfBook, accounts: mockAccounts }
});
verifyBalancedLines(pfContribTxn, 'PF Monthly Contribution');
assert.strictEqual(pfContribTxn.amount.paise, '1000000');
assert(pfContribTxn.provenance, 'Must have provenance');
assert.strictEqual(pfContribTxn.provenance.employee.paise, '500000');
assert.strictEqual(pfContribTxn.provenance.employer.paise, '500000');

// 3b. Annual Interest Credited
const pfInterestTxn = compileWorkflowAction({
    profile: pfProfile,
    actionId: 'ADD_INTEREST',
    input: {
        amountPaise: '82500', // ₹825
        pfAccountId: 'acc_pf_portfolio'
    },
    context: { activeBook: pfBook, accounts: mockAccounts }
});
verifyBalancedLines(pfInterestTxn, 'PF Annual Interest');
assert.strictEqual(pfInterestTxn.lines[0].accountId, 'acc_pf_portfolio');
assert.strictEqual(pfInterestTxn.lines[1].accountId, 'category_epfo_interest');
console.log('  ✅ PF provenance and compounding interest compile balanced double-entry lines');

// Test 4: Handy Cash Workflows
console.log('\nTest 4: Handy Cash Till Operations');
const handyProfile = CashbookExperienceConfigMap[CashbookExperienceProfile.HANDY_CASH_REGISTER];
const handyBook = { id: 'book_handy_store', type: CashbookType.HANDY_CASH };

const cashRecvTxn = compileWorkflowAction({
    profile: handyProfile,
    actionId: 'RECEIVE_CASH',
    input: {
        amountPaise: '200000', // ₹2,000
        destinationAccountId: 'acc_cash_handy',
        payerName: 'Customer John'
    },
    context: { activeBook: handyBook, accounts: mockAccounts }
});
verifyBalancedLines(cashRecvTxn, 'Handy Cash Receive');

const cashPayTxn = compileWorkflowAction({
    profile: handyProfile,
    actionId: 'PAY_CASH',
    input: {
        amountPaise: '50000', // ₹500
        sourceAccountId: 'acc_cash_handy',
        payeeName: 'Local Courier'
    },
    context: { activeBook: handyBook, accounts: mockAccounts }
});
verifyBalancedLines(cashPayTxn, 'Handy Cash Pay');
console.log('  ✅ Handy cash drawer movements compile balanced lines');

// Test 5: Validation & Error Handling
console.log('\nTest 5: Validation Errors');
assert.throws(() => {
    compileWorkflowAction({
        profile: bizProfile,
        actionId: 'RECORD_SALE',
        input: { amountPaise: '0', customerName: 'No Amount' },
        context: { activeBook: bizBook, accounts: mockAccounts }
    });
}, /INVALID_AMOUNT/);

assert.throws(() => {
    compileWorkflowAction({
        profile: bizProfile,
        actionId: 'RECORD_SALE',
        input: { amountPaise: '1000', customerName: '' }, // Missing counterparty
        context: { activeBook: bizBook, accounts: mockAccounts }
    });
}, /MISSING_COUNTERPARTY/);

assert.throws(() => {
    compileWorkflowAction({
        profile: loanProfile,
        actionId: 'RECORD_EMI',
        input: { principalPaise: '0', interestPaise: '0', sourceAccountId: 'acc_bank_sbi' },
        context: { activeBook: loanBook, accounts: mockAccounts }
    });
}, /INVALID_AMOUNT/);

console.log('  ✅ Strict domain validation rejects invalid amounts, missing counterparties, and zero splits');

console.log('\n🎉 ALL PURPOSE-BUILT WORKFLOW TESTS PASSED!\n');
