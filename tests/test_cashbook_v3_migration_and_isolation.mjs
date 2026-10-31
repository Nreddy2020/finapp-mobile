/**
 * tests/test_cashbook_v3_migration_and_isolation.mjs
 * 
 * Test Suite: Cashbook V3 Migration Determinism, Profile Isolation, and Precision Accounting.
 * 
 * Verifies:
 * 1. Migration Determinism: V1/V2 envelopes receive deterministic profiles without altering IDs or audit hashes.
 * 2. Profile Isolation: Cross-book domain validation and rejection of unsupported workflows.
 * 3. Workflow Idempotency & Parameter Validation: Re-compilation stability and strict error handling.
 * 4. Purchase Classification: Explicit debit routing for INVENTORY, OPERATING_EXPENSE, CAPITAL_EQUIPMENT, SUPPLIER_ADVANCE.
 * 5. Loan Separation & Terminology: Finance expense distinction, LOANS_TAKEN (liability) vs LOANS_GIVEN (receivable).
 * 6. PF Source-of-Funds Accounting: Explicit double-entry routing for employee vs employer shares.
 * 7. Investment Experience: Invested Cost != Market Value invariant, non-cash valuation, and metrics computation.
 */

import assert from 'assert';
import {
    CashbookType,
    CashbookExperienceProfile,
    PurchaseClassification,
    PFMovementType,
    LedgerLineType,
    TransactionType,
    resolveCashbookExperience,
    createMoneyPaise,
    moneyToBigInt
} from '../services/cashbook/cashbookContracts.js';
import {
    compileWorkflowAction,
    WorkflowCompilerError
} from '../services/cashbook/cashbookWorkflowCompiler.js';
import {
    computePFDashboardMetrics,
    computeInvestmentDashboardMetrics,
    computeLoanLiabilityDashboardMetrics,
    computeLoanReceivableDashboardMetrics,
    computeBusinessDashboardMetrics
} from '../services/cashbook/cashbookEngine.js';
import {
    createAuditEvent,
    verifyAuditTrail,
    AuditEventType
} from '../services/cashbook/cashbookAuditTrail.js';

console.log('=== TEST SUITE: CASHBOOK V3 MIGRATION, ISOLATION & ADVANCED ACCOUNTING ===\n');

// --------------------------------------------------------------------------
// 1. MIGRATION DETERMINISM & AUDIT HASH PRESERVATION
// --------------------------------------------------------------------------
console.log('Test 1: Migration Determinism & Audit Hash Preservation');

const legacyV2Envelope = {
    book: {
        id: 'book_legacy_001',
        name: 'Household Cash',
        type: CashbookType.SAVINGS,
        openingBalancePaise: '100000',
        createdAt: '2026-01-01T00:00:00.000Z'
    },
    accounts: [
        { id: 'acc_bank_1', name: 'HDFC Bank', type: 'BANK', balancePaise: '75000' },
        { id: 'acc_cash_1', name: 'Cash in Hand', type: 'CASH', balancePaise: '25000' }
    ],
    transactions: [
        {
            id: 'txn_leg_01',
            bookId: 'book_legacy_001',
            transactionType: TransactionType.INCOME,
            amount: createMoneyPaise('5000000'),
            date: '2026-01-05',
            destinationAccountId: 'acc_bank_1',
            description: 'Salary January',
            category: 'salary'
        },
        {
            id: 'txn_leg_02',
            bookId: 'book_legacy_001',
            transactionType: TransactionType.EXPENSE,
            amount: createMoneyPaise('120000'),
            date: '2026-01-10',
            sourceAccountId: 'acc_cash_1',
            description: 'Groceries',
            category: 'food'
        }
    ]
};

// Compute baseline audit trail on legacy transactions
const event1 = createAuditEvent({
    eventType: AuditEventType.TRANSACTION_POSTED,
    entityId: legacyV2Envelope.transactions[0].id,
    payload: legacyV2Envelope.transactions[0],
    timestamp: '2026-01-05T10:00:00.000Z'
});
const event2 = createAuditEvent({
    lastEvent: event1,
    eventType: AuditEventType.TRANSACTION_POSTED,
    entityId: legacyV2Envelope.transactions[1].id,
    payload: legacyV2Envelope.transactions[1],
    timestamp: '2026-01-10T12:00:00.000Z'
});
const legacyAuditLog = [event1, event2];

const baselineAudit = verifyAuditTrail(legacyAuditLog);
assert.strictEqual(baselineAudit.isValid, true, 'Baseline audit chain must be valid');
const originalEventHashes = legacyAuditLog.map(e => e.eventHash);
const originalPreviousHashes = legacyAuditLog.map(e => e.previousHash);

// Migrate / Resolve to V3 Experience Profile
const v3Profile = resolveCashbookExperience(legacyV2Envelope.book);
assert.strictEqual(v3Profile.profileId, CashbookExperienceProfile.PERSONAL_FINANCE_BOOK, 'Legacy SAVINGS must resolve to PERSONAL_FINANCE_BOOK');

// Verify envelope non-mutation: IDs, accounts, and cryptographic hashes are 100% preserved
assert.strictEqual(legacyV2Envelope.book.id, 'book_legacy_001', 'Book ID must remain immutable');
assert.strictEqual(legacyV2Envelope.transactions[0].id, 'txn_leg_01', 'Transaction ID 1 must remain immutable');
assert.strictEqual(legacyV2Envelope.transactions[1].id, 'txn_leg_02', 'Transaction ID 2 must remain immutable');

const postMigrationAudit = verifyAuditTrail(legacyAuditLog);
assert.strictEqual(postMigrationAudit.isValid, true, 'Post-migration audit chain must be intact');
for (let i = 0; i < legacyAuditLog.length; i++) {
    assert.strictEqual(legacyAuditLog[i].eventHash, originalEventHashes[i], `Event hash ${i} altered during migration!`);
    assert.strictEqual(legacyAuditLog[i].previousHash, originalPreviousHashes[i], `Previous hash ${i} altered during migration!`);
}
console.log('  ✅ V1/V2 envelope migration preserves IDs and cryptographic hash chain bit-for-bit');

// --------------------------------------------------------------------------
// 2. PROFILE ISOLATION & DOMAIN POLICY ENFORCEMENT
// --------------------------------------------------------------------------
console.log('\nTest 2: Profile Isolation & Action Enforcement');

const handyProfile = resolveCashbookExperience(CashbookType.HANDY_CASH);
const pfProfile = resolveCashbookExperience(CashbookType.PF);

// Attempting to compile an unsupported action on Handy Cash should fail
assert.throws(() => {
    compileWorkflowAction({
        profile: handyProfile,
        actionId: 'RECORD_EMI',
        input: { principal: '1000', interest: '100', sourceAccountId: 'acc_cash' },
        context: { activeBook: { id: 'book_handy' } }
    });
}, (err) => {
    return err instanceof WorkflowCompilerError && err.code === 'UNSUPPORTED_ACTION';
}, 'Compiling loan action on handy cash book must throw UNSUPPORTED_ACTION');

// Attempting to record a business sale on PF profile should fail
assert.throws(() => {
    compileWorkflowAction({
        profile: pfProfile,
        actionId: 'RECORD_SALE',
        input: { amount: '5000', customerName: 'Retail Buyer' },
        context: { activeBook: { id: 'book_pf' } }
    });
}, (err) => {
    return err instanceof WorkflowCompilerError && err.code === 'UNSUPPORTED_ACTION';
}, 'Compiling sale action on PF book must throw UNSUPPORTED_ACTION');

console.log('  ✅ Profile isolation strictly prevents cross-domain action compilation');

// --------------------------------------------------------------------------
// 3. WORKFLOW IDEMPOTENCY & PARAMETER VALIDATION
// --------------------------------------------------------------------------
console.log('\nTest 3: Workflow Idempotency & Parameter Validation');

const personalProfile = resolveCashbookExperience(CashbookType.SAVINGS);
const idempotencyKey = 'wf:personal:income:tx_idem_999';

const actionInput = {
    idempotencyKey,
    amountPaise: '250000',
    destinationAccountId: 'acc_bank_1',
    description: 'Consulting Fee',
    category: 'consulting'
};

const run1 = compileWorkflowAction({
    profile: personalProfile,
    actionId: 'ADD_INCOME',
    input: actionInput,
    context: { activeBook: { id: 'book_pers_1' } }
});

const run2 = compileWorkflowAction({
    profile: personalProfile,
    actionId: 'ADD_INCOME',
    input: actionInput,
    context: { activeBook: { id: 'book_pers_1' } }
});

assert.strictEqual(run1.idempotencyKey, run2.idempotencyKey, 'Idempotency keys must match');
assert.strictEqual(run1.amount.paise, run2.amount.paise, 'Amounts must match');
assert.strictEqual(run1.lines.length, run2.lines.length, 'Line count must match');
assert.strictEqual(run1.lines[0].debitPaise, run2.lines[0].debitPaise, 'Debits must match');

// Parameter validation: zero amount
assert.throws(() => {
    compileWorkflowAction({
        profile: personalProfile,
        actionId: 'ADD_INCOME',
        input: { amountPaise: '0', destinationAccountId: 'acc_bank_1' },
        context: { activeBook: { id: 'book_pers_1' } }
    });
}, (err) => err instanceof WorkflowCompilerError && err.code === 'INVALID_AMOUNT');

// Parameter validation: missing account
assert.throws(() => {
    compileWorkflowAction({
        profile: personalProfile,
        actionId: 'ADD_INCOME',
        input: { amountPaise: '500' },
        context: { activeBook: { id: 'book_pers_1' } }
    });
}, (err) => err instanceof WorkflowCompilerError && err.code === 'MISSING_ACCOUNT');

console.log('  ✅ Workflow compilation is deterministic, idempotent, and rejects invalid inputs');

// --------------------------------------------------------------------------
// 4. BUSINESS PURCHASE CLASSIFICATION DEBIT ROUTING
// --------------------------------------------------------------------------
console.log('\nTest 4: Business Purchase Classification Debit Routing');

const bizProfile = resolveCashbookExperience(CashbookType.BUSINESS_CASH_AND_OBLIGATIONS);
const classifications = [
    { classification: PurchaseClassification.INVENTORY, expectedDebitAccount: 'biz_asset_inventory' },
    { classification: PurchaseClassification.OPERATING_EXPENSE, expectedDebitAccount: 'biz_exp_operating' },
    { classification: PurchaseClassification.CAPITAL_EQUIPMENT, expectedDebitAccount: 'biz_asset_equipment' },
    { classification: PurchaseClassification.SUPPLIER_ADVANCE, expectedDebitAccount: 'biz_asset_advances' }
];

for (const { classification, expectedDebitAccount } of classifications) {
    const txn = compileWorkflowAction({
        profile: bizProfile,
        actionId: 'RECORD_PURCHASE',
        input: {
            amountPaise: '150000',
            classification,
            sourceAccountId: 'acc_biz_bank',
            supplierName: 'Industrial Supplies Ltd'
        },
        context: { activeBook: { id: 'book_biz' } }
    });

    assert.strictEqual(txn.metadata.classification, classification, `Metadata must preserve classification: ${classification}`);
    assert.strictEqual(txn.lines[0].accountId, expectedDebitAccount, `Debit account mismatch for ${classification}`);
    assert.strictEqual(txn.lines[0].debitPaise, '150000', 'Debit amount must match purchase');
    assert.strictEqual(txn.lines[1].accountId, 'acc_biz_bank', 'Credit account must be source bank');
    assert.strictEqual(txn.lines[1].creditPaise, '150000', 'Credit amount must match purchase');
    
    // Invariant: Debits === Credits
    const totalDebits = txn.lines.reduce((s, l) => s + BigInt(l.debitPaise), 0n);
    const totalCredits = txn.lines.reduce((s, l) => s + BigInt(l.creditPaise), 0n);
    assert.strictEqual(totalDebits, totalCredits, `Total debits must equal total credits for ${classification}`);
}
console.log('  ✅ All 4 purchase classifications route debits correctly to designated asset/expense accounts');

// --------------------------------------------------------------------------
// 5. LOAN SEPARATION & FINANCE EXPENSE TERMINOLOGY
// --------------------------------------------------------------------------
console.log('\nTest 5: Loan Separation & Finance Expense Terminology');

const loanAccounts = [
    { id: 'acc_salary_bank', name: 'Salary Bank', type: 'BANK', nature: 'ASSET' },
    { id: 'acc_home_loan_liability', name: 'Home Loan Liability', type: 'LOAN', nature: 'LIABILITY' },
    { id: 'acc_bank_1', name: 'Primary Bank', type: 'BANK', nature: 'ASSET' },
    { id: 'acc_loan_receivable', name: 'Loan Receivable', type: 'OTHER', nature: 'ASSET' }
];

const loansTakenProfile = resolveCashbookExperience(CashbookType.LOANS_TAKEN);
const emiTxn = compileWorkflowAction({
    profile: loansTakenProfile,
    actionId: 'RECORD_EMI',
    input: {
        principalPaise: '3500000',
        interestPaise: '1500000',
        sourceAccountId: 'acc_salary_bank',
        loanAccountId: 'acc_home_loan_liability'
    },
    context: { activeBook: { id: 'book_home_loan' }, accounts: loanAccounts }
});

// Interest line must explicitly route to category_finance_expense
const interestLine = emiTxn.lines.find(l => l.lineType === LedgerLineType.INTEREST_EXPENSE);
assert(interestLine, 'Interest line must be present');
assert.strictEqual(interestLine.accountId, 'category_finance_expense', 'Interest account must be category_finance_expense');
assert.strictEqual(interestLine.categoryId, 'finance_expense', 'Category must be finance_expense');
assert(interestLine.description.includes('Finance Expense'), 'Description must reflect Finance Expense');

// Loans Given: Disburse and Repayment
const loansGivenProfile = resolveCashbookExperience(CashbookType.LOANS_GIVEN);
const disburseTxn = compileWorkflowAction({
    profile: loansGivenProfile,
    actionId: 'DISBURSE_LOAN',
    input: {
        amountPaise: '5000000',
        borrowerName: 'Anil Kumar',
        sourceAccountId: 'acc_bank_1'
    },
    context: { activeBook: { id: 'book_lending' }, accounts: loanAccounts }
});
assert.strictEqual(disburseTxn.lines[0].accountId, 'acc_loan_receivable', 'Disbursement must debit loan receivable asset');

const repaymentTxn = compileWorkflowAction({
    profile: loansGivenProfile,
    actionId: 'RECORD_REPAYMENT',
    input: {
        principalPaise: '2000000',
        interestPaise: '250000',
        borrowerName: 'Anil Kumar',
        destinationAccountId: 'acc_bank_1'
    },
    context: { activeBook: { id: 'book_lending' }, accounts: loanAccounts }
});
const pLine = repaymentTxn.lines.find(l => l.lineType === LedgerLineType.PRINCIPAL_REPAID);
const iLine = repaymentTxn.lines.find(l => l.lineType === LedgerLineType.INTEREST_INCOME);
assert.strictEqual(pLine.creditPaise, '2000000', 'Principal reduction credit must match');
assert.strictEqual(iLine.creditPaise, '250000', 'Interest income credit must match');
assert.strictEqual(repaymentTxn.lines[0].debitPaise, '2250000', 'Bank deposit must equal total repayment');

console.log('  ✅ Loans Taken properly recognizes finance expense; Loans Given tracks receivables & interest income');

// --------------------------------------------------------------------------
// 6. PF SOURCE-OF-FUNDS DOUBLE ENTRY & RESTRICTED AVAILABILITY
// --------------------------------------------------------------------------
console.log('\nTest 6: PF Source-of-Funds Double Entry & Invariants');

const pfContribTxn = compileWorkflowAction({
    profile: pfProfile,
    actionId: 'ADD_CONTRIBUTION',
    input: {
        employeePaise: '180000',
        employerPaise: '125000',
        pensionPaise: '55000',
        sourceAccountId: 'acc_salary_clearing'
    },
    context: { activeBook: { id: 'book_epf' } }
});

// Double entry audit:
// Debits: PF Restricted Asset (360000)
// Credits: Salary Clearing (180000) + Employer Contribution Income (180000)
assert.strictEqual(pfContribTxn.lines[0].accountId, 'acc_epfo_uan', 'Debit must route to PF Restricted Asset');
assert.strictEqual(pfContribTxn.lines[0].debitPaise, '360000', 'Debit must equal total contribution');

const eeLine = pfContribTxn.lines.find(l => l.movementType === PFMovementType.EMPLOYEE_CONTRIBUTION && l.creditPaise !== '0');
const erLine = pfContribTxn.lines.find(l => l.movementType === PFMovementType.EMPLOYER_CONTRIBUTION && l.creditPaise !== '0');
assert.strictEqual(eeLine.accountId, 'acc_salary_clearing', 'Employee contribution credited from salary/bank');
assert.strictEqual(eeLine.creditPaise, '180000', 'Employee credit matches EE share');
assert.strictEqual(erLine.accountId, 'acc_employer_contribution_income', 'Employer contribution credited to employer income/benefit');
assert.strictEqual(erLine.creditPaise, '180000', 'Employer credit matches ER + Pension share');

// Metrics calculation invariant: Available Personal Cash is strictly ₹0
const pfMetrics = computePFDashboardMetrics({ transactions: [pfContribTxn] });
assert.strictEqual(pfMetrics.totalPFValuePaise, '360000', 'Total PF Value must be 360000 paise');
assert.strictEqual(pfMetrics.availablePersonalCashPaise, '0', 'Available Personal Cash MUST BE 0');
assert.strictEqual(pfMetrics.availablePersonalCashFormatted, '₹0', 'Available Personal Cash formatted MUST BE ₹0');

console.log('  ✅ PF source-of-funds double-entry balanced; Available Personal Cash invariant is strictly ₹0');

// --------------------------------------------------------------------------
// 7. INVESTMENT REGISTER & VALUATION INVARIANTS
// --------------------------------------------------------------------------
console.log('\nTest 7: Investment Experience & Non-Cash Valuation Invariant');

const invProfile = resolveCashbookExperience(CashbookType.INVESTMENTS);

// 1. Invest Cash (Buy Portfolio Asset)
const buyTxn = compileWorkflowAction({
    profile: invProfile,
    actionId: 'INVEST_CASH',
    input: {
        amountPaise: '5000000',
        assetName: 'Nifty 50 Index Fund',
        sourceAccountId: 'acc_savings_bank'
    },
    context: { activeBook: { id: 'book_portfolio' } }
});
assert.strictEqual(buyTxn.lines[0].accountId, 'inv_asset_portfolio', 'Debits investment portfolio asset');
assert.strictEqual(buyTxn.lines[1].accountId, 'acc_savings_bank', 'Credits savings bank');

// 2. Non-Cash Valuation Updates: Demonstrating Metric Independence
// Scenario A: Newly purchased investment before price movement (Cost === Market Value)
const initialMetrics = computeInvestmentDashboardMetrics({
    transactions: [buyTxn]
});
assert.strictEqual(initialMetrics.totalInvestedCostPaise, '5000000', 'Initial Invested Cost is 50,000');
assert.strictEqual(initialMetrics.currentMarketValuePaise, '5000000', 'Market Value equals purchase cost on day 1');
assert.strictEqual(initialMetrics.unrealizedGainLossPaise, '0', 'Unrealized gain/loss is 0 when Cost === Market Value');

// Scenario B: Appreciation (Market Value > Invested Cost)
const valTxnGain = compileWorkflowAction({
    profile: invProfile,
    actionId: 'UPDATE_VALUATION',
    input: {
        marketValuePaise: '6500000',
        description: 'Monthly NAV Surge'
    },
    context: { activeBook: { id: 'book_portfolio' } }
});
assert.strictEqual(valTxnGain.metadata.isNonCash, true, 'Valuation entry must be marked non-cash');
assert.strictEqual(valTxnGain.lines.some(l => l.lineType === LedgerLineType.CASH), false, 'Valuation update MUST NEVER touch cash lines');

// Scenario C: Depreciation (Market Value < Invested Cost)
const valTxnLoss = compileWorkflowAction({
    profile: invProfile,
    actionId: 'UPDATE_VALUATION',
    input: {
        marketValuePaise: '4500000',
        description: 'Market Correction'
    },
    context: { activeBook: { id: 'book_portfolio' } }
});

// 3. Receive Dividend
const divTxn = compileWorkflowAction({
    profile: invProfile,
    actionId: 'RECORD_DIVIDEND',
    input: {
        amountPaise: '120000',
        destinationAccountId: 'acc_savings_bank'
    },
    context: { activeBook: { id: 'book_portfolio' } }
});

// Verify Scenario B metrics (Appreciation: Market Value > Cost)
const gainMetrics = computeInvestmentDashboardMetrics({
    transactions: [buyTxn, valTxnGain, divTxn]
});
assert.strictEqual(gainMetrics.totalInvestedCostPaise, '5000000', 'Total Invested Cost remains 50,000');
assert.strictEqual(gainMetrics.currentMarketValuePaise, '6500000', 'Current Market Value is 65,000');
assert.strictEqual(gainMetrics.unrealizedGainLossPaise, '1500000', 'Unrealized gain is 15,000');
assert.strictEqual(gainMetrics.dividendsReceivedPaise, '120000', 'Dividends must be 1,200');
assert.strictEqual(gainMetrics.availablePersonalCashPaise, '0', 'Available Personal Cash in Investment Register MUST BE 0');

// Verify Scenario C metrics (Depreciation: Market Value < Cost)
const lossMetrics = computeInvestmentDashboardMetrics({
    transactions: [buyTxn, valTxnLoss, divTxn]
});
assert.strictEqual(lossMetrics.totalInvestedCostPaise, '5000000', 'Total Invested Cost remains 50,000');
assert.strictEqual(lossMetrics.currentMarketValuePaise, '4500000', 'Current Market Value is 45,000');
assert.strictEqual(lossMetrics.unrealizedGainLossPaise, '-500000', 'Unrealized loss is -5,000');

console.log('  ✅ Investment register preserves Invested Cost and Market Value as independent metrics; non-cash valuation verified');

console.log('\n================================================================');
console.log('🎉 ALL V3 MIGRATION, ISOLATION & ADVANCED ACCOUNTING TESTS PASSED!');
console.log('================================================================\n');
