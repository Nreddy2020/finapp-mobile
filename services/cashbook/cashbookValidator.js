/**
 * services/cashbook/cashbookValidator.js
 * 
 * Strict, fail-closed validation for accounts, transactions, transfers,
 * and category-type compatibility matrix.
 */

import {
    AccountType,
    AccountNature,
    ACCOUNT_TYPE_NATURE,
    TransactionType,
    TransactionStatus,
    TransactionSource,
    BalanceEffect,
    RefundTargetType,
    StandardCategories,
    CashbookType,
    DailyClosingStatus,
    moneyToBigInt,
    validateJournalLines
} from './cashbookContracts.js';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Validates an Account record.
 * Throws an Error with descriptive message on validation failure.
 */
export function validateAccount(account) {
    if (!account || typeof account !== 'object') {
        throw new Error('Account must be a non-null object');
    }
    if (!account.id || typeof account.id !== 'string' || !account.id.trim()) {
        throw new Error('Account id must be a non-empty string');
    }
    if (!account.name || typeof account.name !== 'string' || !account.name.trim()) {
        throw new Error('Account name must be a non-empty string');
    }
    if (!Object.values(AccountType).includes(account.type)) {
        throw new Error(`Invalid account type: "${account.type}". Must be one of: ${Object.values(AccountType).join(', ')}`);
    }
    const expectedNature = ACCOUNT_TYPE_NATURE[account.type];
    if (account.nature && account.nature !== expectedNature) {
        throw new Error(`Account nature mismatch for ${account.type}: expected ${expectedNature}, received ${account.nature}`);
    }
    return true;
}

/**
 * Checks category compatibility against transaction type.
 * Enforces that Income cannot be assigned Expense categories (e.g. Rent, Groceries),
 * and Expense cannot be assigned Income categories (e.g. Salary, Business).
 */
export function validateCategoryCompatibility(transactionType, categoryId) {
    if (!categoryId) return true; // Optional category allowed

    const normCat = categoryId.toLowerCase().trim();
    const incomeCatIds = StandardCategories.INCOME.map(c => c.id.toLowerCase());
    const expenseCatIds = StandardCategories.EXPENSE.map(c => c.id.toLowerCase());

    if (transactionType === TransactionType.INCOME) {
        if (expenseCatIds.includes(normCat)) {
            throw new Error(`Category incompatibility: Category "${categoryId}" is an EXPENSE category and cannot be assigned to an INCOME transaction.`);
        }
    } else if (transactionType === TransactionType.EXPENSE) {
        if (incomeCatIds.includes(normCat)) {
            throw new Error(`Category incompatibility: Category "${categoryId}" is an INCOME category and cannot be assigned to an EXPENSE transaction.`);
        }
    } else if (transactionType === TransactionType.TRANSFER) {
        // Transfers are balance-neutral movements and should not be categorized as income or expense
        if (incomeCatIds.includes(normCat) || expenseCatIds.includes(normCat)) {
            throw new Error(`Category incompatibility: Transfers represent net-zero movements between accounts and cannot be assigned income/expense categories: "${categoryId}"`);
        }
    }
    return true;
}

/**
 * Validates a Transaction record against ledger invariants.
 */
export function validateTransaction(txn, availableAccounts = null) {
    if (!txn || typeof txn !== 'object') {
        throw new Error('Transaction must be a non-null object');
    }
    if (!txn.id || typeof txn.id !== 'string' || !txn.id.trim()) {
        throw new Error('Transaction id must be a non-empty string');
    }
    if (!Object.values(TransactionType).includes(txn.transactionType)) {
        throw new Error(`Invalid transactionType: "${txn.transactionType}". Must be one of: ${Object.values(TransactionType).join(', ')}`);
    }
    if (!Object.values(TransactionStatus).includes(txn.status)) {
        throw new Error(`Invalid transaction status: "${txn.status}"`);
    }

    // Authoritative Journal Lines validation
    if (txn.lines !== undefined) {
        validateJournalLines(txn.lines, { accounts: availableAccounts, bookId: txn.bookId });
    }

    // Amount validation
    if (!txn.amount || typeof txn.amount !== 'object' || typeof txn.amount.paise !== 'string') {
        throw new Error('Transaction must contain a valid MoneyPaise object with string "paise"');
    }
    const bi = moneyToBigInt(txn.amount);

    // OPENING_BALANCE and ADJUSTMENT can technically be 0, but normal transactions must be > 0
    if (txn.transactionType === TransactionType.OPENING_BALANCE) {
        if (bi < 0n) throw new Error('Opening balance cannot be negative paise');
    } else if (txn.transactionType === TransactionType.ADJUSTMENT) {
        if (bi < 0n) throw new Error('Adjustment absolute amount must be non-negative paise');
    } else {
        if (bi <= 0n) {
            throw new Error(`Transaction amount must be strictly greater than 0 paise. Received: ${bi}`);
        }
    }

    // Date validation
    if (!txn.date || typeof txn.date !== 'string' || !DATE_REGEX.test(txn.date)) {
        throw new Error(`Transaction date must be in YYYY-MM-DD format. Received: "${txn.date}"`);
    }

    // Idempotency key
    if (!txn.idempotencyKey || typeof txn.idempotencyKey !== 'string' || !txn.idempotencyKey.trim()) {
        throw new Error('Transaction must have a non-empty idempotencyKey');
    }

    // Void state validation
    if (txn.status === TransactionStatus.VOIDED) {
        if (!txn.voidedAt || typeof txn.voidedAt !== 'string') {
            throw new Error('Voided transaction must include a valid ISO "voidedAt" timestamp');
        }
        if (!txn.voidReason || typeof txn.voidReason !== 'string' || !txn.voidReason.trim()) {
            throw new Error('Voided transaction must specify a non-empty "voidReason"');
        }
    }

    // Type-specific field checks
    if (txn.transactionType === TransactionType.OPENING_BALANCE) {
        if (!txn.accountId || typeof txn.accountId !== 'string') {
            throw new Error('OPENING_BALANCE transaction must specify an accountId');
        }
        if (txn.immutable !== true) {
            throw new Error('OPENING_BALANCE transaction must have immutable === true');
        }
    } else if (txn.transactionType === TransactionType.INCOME) {
        const destAccount = txn.destinationAccountId || txn.accountId;
        if (!destAccount) {
            throw new Error('INCOME transaction must specify destinationAccountId or accountId');
        }
        validateCategoryCompatibility(TransactionType.INCOME, txn.category);
    } else if (txn.transactionType === TransactionType.EXPENSE) {
        const srcAccount = txn.sourceAccountId || txn.accountId;
        if (!srcAccount) {
            throw new Error('EXPENSE transaction must specify sourceAccountId or accountId');
        }
        validateCategoryCompatibility(TransactionType.EXPENSE, txn.category);
    } else if (txn.transactionType === TransactionType.TRANSFER) {
        if (!txn.sourceAccountId || typeof txn.sourceAccountId !== 'string') {
            throw new Error('TRANSFER transaction must specify sourceAccountId');
        }
        if (!txn.destinationAccountId || typeof txn.destinationAccountId !== 'string') {
            throw new Error('TRANSFER transaction must specify destinationAccountId');
        }
        if (txn.sourceAccountId.trim() === txn.destinationAccountId.trim()) {
            throw new Error('TRANSFER cannot have identical sourceAccountId and destinationAccountId');
        }
        if (!txn.transferGroupId || typeof txn.transferGroupId !== 'string') {
            throw new Error('TRANSFER transaction must specify a transferGroupId');
        }
        validateCategoryCompatibility(TransactionType.TRANSFER, txn.category);
    } else if (txn.transactionType === TransactionType.REFUND) {
        const targetAccount = txn.destinationAccountId || txn.accountId;
        if (!targetAccount) {
            throw new Error('REFUND transaction must specify destinationAccountId or accountId');
        }
        if (txn.refundTargetType && !Object.values(RefundTargetType).includes(txn.refundTargetType)) {
            throw new Error(`Invalid refundTargetType: "${txn.refundTargetType}"`);
        }
    } else if (txn.transactionType === TransactionType.ADJUSTMENT) {
        if (!txn.accountId || typeof txn.accountId !== 'string') {
            throw new Error('ADJUSTMENT transaction must specify accountId');
        }
        if (!Object.values(BalanceEffect).includes(txn.balanceEffect) || txn.balanceEffect === BalanceEffect.NEUTRAL) {
            throw new Error(`ADJUSTMENT transaction must specify an explicit balanceEffect of INCREASE or DECREASE. Received: "${txn.balanceEffect}"`);
        }
        if (!txn.adjustmentReason || typeof txn.adjustmentReason !== 'string' || !txn.adjustmentReason.trim()) {
            throw new Error('ADJUSTMENT transaction must specify a non-empty adjustmentReason');
        }
    }

    // If availableAccounts is passed, verify account existence
    if (availableAccounts && Array.isArray(availableAccounts)) {
        const validIds = new Set(availableAccounts.map(a => a.id));
        // Include system register and clearing account IDs
        const systemAccountIds = [
            'acc_epfo_uan', 'acc_payroll_deduction', 'acc_employer_contribution_income',
            'acc_loan_liability', 'acc_loan_receivable', 'inv_asset_portfolio',
            'acc_handy_till', 'biz_acc_receivables', 'biz_acc_payables',
            'biz_asset_inventory', 'biz_exp_operating', 'biz_asset_equipment', 'biz_asset_advances',
            'category_loan_interest', 'category_loan_fees', 'category_interest_income',
            'category_cash_in', 'category_cash_out'
        ];
        for (const sid of systemAccountIds) {
            validIds.add(sid);
        }

        const checkId = (id, label) => {
            if (id && !validIds.has(id)) {
                throw new Error(`Referenced account does not exist (${label}): "${id}"`);
            }
        };
        checkId(txn.accountId, 'accountId');
        checkId(txn.sourceAccountId, 'sourceAccountId');
        checkId(txn.destinationAccountId, 'destinationAccountId');
    }

    return true;
}

/**
 * Validates transfer-group integrity across all transactions.
 * If transactions share a transferGroupId, ensures complete paired legs or valid unified transfer.
 * Catches orphan transfer legs.
 */
export function validateTransferPairContinuity(transactions = []) {
    const groups = new Map();
    for (const txn of transactions) {
        if (txn.transferGroupId) {
            if (!groups.has(txn.transferGroupId)) {
                groups.set(txn.transferGroupId, []);
            }
            groups.get(txn.transferGroupId).push(txn);
        }
    }

    for (const [groupId, txns] of groups.entries()) {
        if (txns.length === 1) {
            const t = txns[0];
            // In unified model, a single TRANSFER record must have both sourceAccountId and destinationAccountId
            if (t.transactionType === TransactionType.TRANSFER) {
                if (!t.sourceAccountId || !t.destinationAccountId) {
                    throw new Error(`Orphan transfer detected in group ${groupId}: Missing source or destination account`);
                }
            } else {
                throw new Error(`Orphan transfer leg detected in group ${groupId}: Transaction ${t.id} has no matching paired transfer leg`);
            }
        } else if (txns.length === 2) {
            // Paired model: one must debit, one must credit, amounts must match
            const [t1, t2] = txns;
            if (t1.amount.paise !== t2.amount.paise) {
                throw new Error(`Mismatched transfer pair amounts in group ${groupId}: ${t1.amount.paise} vs ${t2.amount.paise}`);
            }
            if (t1.status !== t2.status) {
                throw new Error(`Inconsistent transfer pair status in group ${groupId}: ${t1.status} vs ${t2.status}`);
            }
        } else if (txns.length > 2) {
            throw new Error(`Invalid transfer group ${groupId}: Contains ${txns.length} transactions, maximum expected is 2`);
        }
    }
    return true;
}

/**
 * Validates a Cashbook record.
 */
export function validateCashbook(cashbook) {
    if (!cashbook || typeof cashbook !== 'object') {
        throw new Error('Cashbook must be a non-null object');
    }
    if (!cashbook.id || typeof cashbook.id !== 'string' || !cashbook.id.trim()) {
        throw new Error('Cashbook id must be a non-empty string');
    }
    if (!cashbook.name || typeof cashbook.name !== 'string' || !cashbook.name.trim()) {
        throw new Error('Cashbook name must be a non-empty string');
    }
    if (!Object.values(CashbookType).includes(cashbook.type)) {
        throw new Error(`Invalid CashbookType: "${cashbook.type}". Must be one of: ${Object.values(CashbookType).join(', ')}`);
    }
    return true;
}

/**
 * Validates a DailyClosingRecord.
 */
export function validateDailyClosingRecord(record) {
    if (!record || typeof record !== 'object') {
        throw new Error('DailyClosingRecord must be a non-null object');
    }
    if (!record.id || typeof record.id !== 'string' || !record.id.trim()) {
        throw new Error('DailyClosingRecord id must be a non-empty string');
    }
    if (!record.bookId || typeof record.bookId !== 'string' || !record.bookId.trim()) {
        throw new Error('DailyClosingRecord bookId must be a non-empty string');
    }
    if (!record.date || typeof record.date !== 'string' || !DATE_REGEX.test(record.date)) {
        throw new Error(`DailyClosingRecord date must be in YYYY-MM-DD format. Received: "${record.date}"`);
    }
    if (!Object.values(DailyClosingStatus).includes(record.status)) {
        throw new Error(`Invalid DailyClosingStatus: "${record.status}". Must be one of: ${Object.values(DailyClosingStatus).join(', ')}`);
    }
    if (!record.calculatedClosing || typeof record.calculatedClosing.paise !== 'string') {
        throw new Error('DailyClosingRecord must have a valid calculatedClosing MoneyPaise object');
    }
    return true;
}

/**
 * Validates a Loan Repayment Split.
 * Invariant: principalPaise + interestPaise + feesPaise === totalPaise.
 */
export function validateLoanRepaymentSplit(split) {
    if (!split || typeof split !== 'object') {
        throw new Error('Loan repayment split must be an object');
    }
    if (!split.principal || typeof split.principal.paise !== 'string') {
        throw new Error('split.principal must be a valid MoneyPaise object');
    }
    if (!split.interest || typeof split.interest.paise !== 'string') {
        throw new Error('split.interest must be a valid MoneyPaise object');
    }
    const pBi = moneyToBigInt(split.principal);
    const iBi = moneyToBigInt(split.interest);
    const fBi = split.fees ? moneyToBigInt(split.fees) : 0n;

    if (pBi < 0n || iBi < 0n || fBi < 0n) {
        throw new Error('Principal, interest, and fees must be non-negative paise');
    }

    if (split.total && typeof split.total.paise === 'string') {
        const tBi = moneyToBigInt(split.total);
        if (pBi + iBi + fBi !== tBi) {
            throw new Error(`Loan repayment split mismatch: principal (${pBi}) + interest (${iBi}) + fees (${fBi}) = ${pBi + iBi + fBi} paise, but total is ${tBi} paise`);
        }
    }
    return true;
}

/**
 * Validates PF Contribution Provenance.
 */
export function validatePFContributionProvenance(provenance) {
    if (!provenance || typeof provenance !== 'object') {
        throw new Error('PF contribution provenance must be an object');
    }
    if (!provenance.employee || typeof provenance.employee.paise !== 'string') {
        throw new Error('provenance.employee must be a valid MoneyPaise object');
    }
    if (!provenance.employer || typeof provenance.employer.paise !== 'string') {
        throw new Error('provenance.employer must be a valid MoneyPaise object');
    }
    const eeBi = moneyToBigInt(provenance.employee);
    const erBi = moneyToBigInt(provenance.employer);
    const penBi = provenance.pension ? moneyToBigInt(provenance.pension) : 0n;
    const intBi = provenance.interest ? moneyToBigInt(provenance.interest) : 0n;

    if (eeBi < 0n || erBi < 0n || penBi < 0n || intBi < 0n) {
        throw new Error('PF contribution components must be non-negative paise');
    }
    return true;
}

