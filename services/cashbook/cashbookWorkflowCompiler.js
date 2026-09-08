/**
 * services/cashbook/cashbookWorkflowCompiler.js
 * 
 * Pure Workflow Compiler for FinLife Universal Cashbook (V3).
 * Transforms purpose-driven user actions (Record Sale, Pay EMI, PF Contribution, Handy Cash, etc.)
 * into formal, mathematically balanced LedgerTransactions containing explicit LedgerLines.
 * 
 * Enforces:
 * 1. Total Debits === Total Credits on all generated ledger lines.
 * 2. Strict domain validation per CashbookExperienceProfile.
 * 3. Never touches storage directly; pure compilation & validation function.
 */

import {
    CashbookExperienceProfile,
    CashbookType,
    TransactionType,
    TransactionStatus,
    TransactionSource,
    LedgerLineType,
    PurchaseClassification,
    PFMovementType,
    createMoneyPaise,
    moneyToBigInt,
    createLedgerTransaction,
    createLoanRepaymentSplit,
    createPFContributionProvenance
} from './cashbookContracts.js';

export class WorkflowCompilerError extends Error {
    constructor(code, message, details = {}) {
        super(`[${code}] ${message}`);
        this.name = 'WorkflowCompilerError';
        this.code = code;
        this.details = details;
    }
}

export const PROFILE_ALLOWED_ACTIONS = Object.freeze({
    [CashbookExperienceProfile.PERSONAL_FINANCE_BOOK]: new Set(['ADD_INCOME', 'ADD_EXPENSE', 'TRANSFER', 'PAY_BILL']),
    [CashbookExperienceProfile.HANDY_CASH_REGISTER]: new Set(['RECEIVE_CASH', 'PAY_CASH', 'TRANSFER']),
    [CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK]: new Set(['RECORD_SALE', 'RECORD_PURCHASE', 'RECEIVE_PAYMENT', 'PAY_SUPPLIER', 'TRANSFER']),
    [CashbookExperienceProfile.REGULAR_INCOME_BOOK]: new Set(['ADD_INCOME', 'TRANSFER']),
    [CashbookExperienceProfile.LOANS_TAKEN_REGISTER]: new Set(['RECORD_EMI', 'PREPAY_LOAN']),
    [CashbookExperienceProfile.LOANS_GIVEN_REGISTER]: new Set(['GIVE_LOAN', 'DISBURSE_LOAN', 'RECORD_REPAYMENT', 'RECEIVE_LOAN_REPAYMENT']),
    [CashbookExperienceProfile.PROVIDENT_FUND_REGISTER]: new Set(['ADD_CONTRIBUTION', 'ADD_INTEREST']),
    [CashbookExperienceProfile.INVESTMENT_REGISTER]: new Set(['INVEST_CASH', 'BUY_INVESTMENT', 'RECORD_DIVIDEND', 'UPDATE_VALUATION', 'SELL_INVESTMENT'])
});

/**
 * Pure workflow action compiler.
 * 
 * @param {Object} params
 * @param {Object} params.profile - CashbookExperienceProfile
 * @param {string} params.actionId - e.g. 'RECORD_SALE', 'RECORD_EMI', 'ADD_CONTRIBUTION'
 * @param {Object} params.input - User input from purpose-driven modal
 * @param {Object} params.context - Execution context (activeBook, accounts, currentDate)
 * @returns {Object} Validated, balanced LedgerTransaction
 */
export function compileWorkflowAction({
    profile,
    actionId,
    input = {},
    context = {}
}) {
    if (!profile || !profile.profileId) {
        throw new WorkflowCompilerError('INVALID_PROFILE', 'Valid CashbookExperienceProfile is required');
    }
    if (!actionId) {
        throw new WorkflowCompilerError('INVALID_ACTION', 'ActionId is required');
    }

    const allowed = PROFILE_ALLOWED_ACTIONS[profile.profileId];
    if (allowed && !allowed.has(actionId)) {
        throw new WorkflowCompilerError(
            'UNSUPPORTED_ACTION',
            `Workflow action '${actionId}' is not supported for profile '${profile.profileId}'`
        );
    }

    const bookId = context.activeBook?.id || input.bookId;
    if (!bookId) {
        throw new WorkflowCompilerError('MISSING_BOOK_ID', 'Book ID is required to compile transaction');
    }

    const date = input.date || context.currentDate || new Date().toISOString().split('T')[0];
    const txnId = input.id || `txn_${actionId.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const idempotencyKey = input.idempotencyKey || `wf:${profile.profileId}:${actionId}:${txnId}`;

    let compiledTxn = null;

    switch (actionId) {
        // ==========================================
        // 1. PERSONAL FINANCE WORKFLOWS
        // ==========================================
        case 'ADD_INCOME': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Income amount must be positive');
            if (!input.destinationAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Destination account is required for Income');

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: input.destinationAccountId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.CASH,
                    categoryId: input.category || 'salary'
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: 'category_income',
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.GENERAL,
                    categoryId: input.category || 'salary'
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: input.description || 'Income',
                destinationAccountId: input.destinationAccountId,
                amount: amountMoney,
                category: input.category || 'income',
                subcategory: input.subcategory || '',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId }
            });
            break;
        }

        case 'ADD_EXPENSE':
        case 'PAY_BILL': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Expense amount must be positive');
            if (!input.sourceAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Payment source account is required');

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: 'category_expense',
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.GENERAL,
                    categoryId: input.category || 'household'
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: input.sourceAccountId,
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.CASH,
                    categoryId: input.category || 'household'
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.EXPENSE,
                transactionDate: date,
                description: input.description || (actionId === 'PAY_BILL' ? 'Bill Payment' : 'Expense'),
                sourceAccountId: input.sourceAccountId,
                amount: amountMoney,
                category: input.category || 'household',
                subcategory: input.subcategory || '',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, billType: input.billType || null }
            });
            break;
        }

        case 'TRANSFER': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Transfer amount must be positive');
            if (!input.sourceAccountId || !input.destinationAccountId) {
                throw new WorkflowCompilerError('MISSING_ACCOUNTS', 'Both source and destination accounts are required');
            }
            if (input.sourceAccountId === input.destinationAccountId) {
                throw new WorkflowCompilerError('SAME_ACCOUNT', 'Source and destination accounts must differ');
            }

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: input.destinationAccountId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.TRANSFER_IN
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: input.sourceAccountId,
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.TRANSFER_OUT
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.TRANSFER,
                transactionDate: date,
                description: input.description || 'Account Transfer',
                sourceAccountId: input.sourceAccountId,
                destinationAccountId: input.destinationAccountId,
                amount: amountMoney,
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId }
            });
            break;
        }

        // ==========================================
        // 2. HANDY CASH WORKFLOWS
        // ==========================================
        case 'RECEIVE_CASH': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Cash received amount must be positive');
            const cashAccId = input.destinationAccountId || input.accountId || context.defaultCashAccountId;
            if (!cashAccId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Cash drawer/till account is required');

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: cashAccId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.CASH
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: 'category_cash_in',
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.GENERAL
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: input.description || 'Cash Received in Till',
                destinationAccountId: cashAccId,
                amount: amountMoney,
                category: input.category || 'cash_received',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, receivedFrom: input.receivedFrom || null }
            });
            break;
        }

        case 'PAY_CASH': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Cash payment amount must be positive');
            const cashAccId = input.sourceAccountId || input.accountId || context.defaultCashAccountId;
            if (!cashAccId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Cash drawer/till account is required');

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: 'category_cash_out',
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.GENERAL
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: cashAccId,
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.CASH
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.EXPENSE,
                transactionDate: date,
                description: input.description || 'Cash Paid from Till',
                sourceAccountId: cashAccId,
                amount: amountMoney,
                category: input.category || 'cash_paid',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, paidTo: input.paidTo || null }
            });
            break;
        }

        // ==========================================
        // 3. BUSINESS OPERATIONS WORKFLOWS
        // ==========================================
        case 'RECORD_SALE': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Sale amount must be positive');

            const isCredit = Boolean(input.isCredit);

            if (profile.validationPolicy?.requireCounterparty) {
                const cName = input.customerName || (input.counterparty ? input.counterparty.name : '');
                if (!cName || !cName.trim()) {
                    throw new WorkflowCompilerError('MISSING_COUNTERPARTY', 'Customer counterparty name is required');
                }
            }

            const customerName = input.customerName || (input.counterparty ? input.counterparty.name : 'Walk-in Customer');
            const accountId = isCredit
                ? (input.receivableAccountId || 'biz_acc_receivables')
                : (input.destinationAccountId || input.accountId);

            if (!accountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Settlement account or receivables account is required');

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: isCredit ? LedgerLineType.GENERAL : LedgerLineType.CASH,
                    counterpartyName: customerName
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: 'biz_rev_sales',
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.GENERAL,
                    categoryId: input.category || 'product_sale'
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: `Sale: ${customerName}${input.invoiceNo ? ` (Inv #${input.invoiceNo})` : ''}`,
                destinationAccountId: isCredit ? null : accountId,
                amount: amountMoney,
                category: input.category || 'product_sale',
                reference: input.invoiceNo || null,
                idempotencyKey,
                lines,
                metadata: {
                    experienceProfile: profile.profileId,
                    actionId,
                    customerName,
                    isCredit,
                    invoiceNo: input.invoiceNo || null
                }
            });
            break;
        }

        case 'RECORD_PURCHASE': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Purchase amount must be positive');

            const isCredit = Boolean(input.isCredit);
            const supplierName = input.supplierName || (input.counterparty ? input.counterparty.name : 'General Supplier');
            const accountId = isCredit
                ? (input.payableAccountId || 'biz_acc_payables')
                : (input.sourceAccountId || input.accountId);

            if (!accountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Payment account or payables account is required');

            // Support distinct business purchase classifications:
            // INVENTORY, OPERATING_EXPENSE, CAPITAL_EQUIPMENT, SUPPLIER_ADVANCE
            const classification = input.classification || PurchaseClassification.INVENTORY;
            let debitAccountId = 'biz_exp_purchases';
            let lineCategory = input.category || 'stock_purchase';

            if (classification === PurchaseClassification.INVENTORY) {
                debitAccountId = 'biz_asset_inventory';
                lineCategory = input.category || 'inventory_purchase';
            } else if (classification === PurchaseClassification.OPERATING_EXPENSE) {
                debitAccountId = 'biz_exp_operating';
                lineCategory = input.category || 'operating_expense';
            } else if (classification === PurchaseClassification.CAPITAL_EQUIPMENT) {
                debitAccountId = 'biz_asset_equipment';
                lineCategory = input.category || 'capital_equipment';
            } else if (classification === PurchaseClassification.SUPPLIER_ADVANCE) {
                debitAccountId = 'biz_asset_advances';
                lineCategory = input.category || 'supplier_advance';
            }

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: debitAccountId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.GENERAL,
                    categoryId: lineCategory,
                    classification
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId,
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: isCredit ? LedgerLineType.GENERAL : LedgerLineType.CASH,
                    counterpartyName: supplierName
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.EXPENSE,
                transactionDate: date,
                description: `Purchase [${classification}]: ${supplierName}${input.billNo ? ` (Bill #${input.billNo})` : ''}`,
                sourceAccountId: isCredit ? null : accountId,
                amount: amountMoney,
                category: lineCategory,
                reference: input.billNo || null,
                idempotencyKey,
                lines,
                metadata: {
                    experienceProfile: profile.profileId,
                    actionId,
                    classification,
                    supplierName,
                    isCredit,
                    billNo: input.billNo || null
                }
            });
            break;
        }

        case 'RECEIVE_PAYMENT': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Payment amount must be positive');
            if (!input.destinationAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Deposit account is required');
            const customerName = input.customerName || 'Customer';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: input.destinationAccountId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.CASH
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: input.receivableAccountId || 'biz_acc_receivables',
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.GENERAL,
                    counterpartyName: customerName
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: `Customer Payment: ${customerName}`,
                destinationAccountId: input.destinationAccountId,
                amount: amountMoney,
                category: 'customer_payment',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, customerName }
            });
            break;
        }

        case 'PAY_SUPPLIER': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Supplier payment amount must be positive');
            if (!input.sourceAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Payment source account is required');
            const supplierName = input.supplierName || 'Supplier';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: input.payableAccountId || 'biz_acc_payables',
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.GENERAL,
                    counterpartyName: supplierName
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: input.sourceAccountId,
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.CASH
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.EXPENSE,
                transactionDate: date,
                description: `Supplier Payment: ${supplierName}`,
                sourceAccountId: input.sourceAccountId,
                amount: amountMoney,
                category: 'supplier_payment',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, supplierName }
            });
            break;
        }

        // ==========================================
        // 4. LOAN LIABILITY & EMI WORKFLOWS
        // ==========================================
        case 'RECORD_EMI': {
            const split = createLoanRepaymentSplit({
                principal: input.principalPaise || input.principal || '0',
                interest: input.interestPaise || input.interest || '0',
                fees: input.feesPaise || input.fees || '0'
            });

            if (moneyToBigInt(split.total) <= 0n) {
                throw new WorkflowCompilerError('INVALID_AMOUNT', 'Total EMI repayment must be positive');
            }

            if (!input.sourceAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Payment bank account is required');
            const loanAccId = input.loanAccountId || 'acc_loan_liability';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: loanAccId,
                    debitPaise: split.principal.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.LIABILITY_REDUCTION
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: 'category_finance_expense',
                    debitPaise: split.interest.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.INTEREST_EXPENSE,
                    categoryId: 'finance_expense',
                    description: 'Finance Expense (Interest)'
                }
            ];

            if (moneyToBigInt(split.fees) > 0n) {
                lines.push({
                    lineId: `${txnId}_l3`,
                    accountId: 'category_loan_fees',
                    debitPaise: split.fees.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.FEES_EXPENSE,
                    categoryId: 'finance_expense'
                });
            }

            lines.push({
                lineId: `${txnId}_l_bank`,
                accountId: input.sourceAccountId,
                debitPaise: '0',
                creditPaise: split.total.paise,
                lineType: LedgerLineType.CASH
            });

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.EXPENSE,
                transactionDate: date,
                description: input.description || `Loan EMI (Principal: ₹${(Number(split.principal.paise)/100).toLocaleString('en-IN')}, Finance Expense: ₹${(Number(split.interest.paise)/100).toLocaleString('en-IN')})`,
                sourceAccountId: input.sourceAccountId,
                amount: split.total,
                category: 'loan_emi',
                idempotencyKey,
                lines,
                metadata: {
                    experienceProfile: profile.profileId,
                    actionId,
                    loanSplit: split,
                    loanAccountId: loanAccId
                }
            });
            compiledTxn.loanSplit = split;
            break;
        }

        case 'PREPAY_LOAN': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Prepayment amount must be positive');
            if (!input.sourceAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Payment bank account is required');
            const loanAccId = input.loanAccountId || 'acc_loan_liability';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: loanAccId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.LIABILITY_REDUCTION
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: input.sourceAccountId,
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.CASH
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.EXPENSE,
                transactionDate: date,
                description: input.description || 'Loan Principal Prepayment',
                sourceAccountId: input.sourceAccountId,
                amount: amountMoney,
                category: 'principal_prepayment',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, loanAccountId: loanAccId }
            });
            break;
        }

        case 'GIVE_LOAN':
        case 'DISBURSE_LOAN': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Loan disbursement amount must be positive');
            if (!input.sourceAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Disbursement source account is required');
            const borrower = input.borrowerName || input.counterpartyName || 'Borrower';
            const receivableAccId = input.loanAccountId || 'acc_loan_receivable';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: receivableAccId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.PRINCIPAL_DISBURSED,
                    counterpartyName: borrower
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: input.sourceAccountId,
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.CASH
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.EXPENSE,
                transactionDate: date,
                description: input.description || `Loan Disbursed to ${borrower}`,
                sourceAccountId: input.sourceAccountId,
                amount: amountMoney,
                category: 'loan_disbursement',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, borrower, loanAccountId: receivableAccId }
            });
            break;
        }

        case 'RECORD_REPAYMENT':
        case 'RECEIVE_LOAN_REPAYMENT': {
            const principalMoney = createMoneyPaise(input.principalPaise || input.principal || '0');
            const interestMoney = createMoneyPaise(input.interestPaise || input.interest || '0');
            const pBi = moneyToBigInt(principalMoney);
            const iBi = moneyToBigInt(interestMoney);
            const totalBi = pBi + iBi;
            if (totalBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Repayment amount must be positive');
            if (!input.destinationAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Repayment deposit account is required');

            const receivableAccId = input.loanAccountId || 'acc_loan_receivable';
            const borrower = input.borrowerName || input.counterpartyName || 'Borrower';
            const totalMoney = createMoneyPaise(totalBi);

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: input.destinationAccountId,
                    debitPaise: totalMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.CASH
                }
            ];

            if (pBi > 0n) {
                lines.push({
                    lineId: `${txnId}_l2_p`,
                    accountId: receivableAccId,
                    debitPaise: '0',
                    creditPaise: principalMoney.paise,
                    lineType: LedgerLineType.PRINCIPAL_REPAID,
                    counterpartyName: borrower
                });
            }

            if (iBi > 0n) {
                lines.push({
                    lineId: `${txnId}_l3_i`,
                    accountId: 'category_interest_income',
                    debitPaise: '0',
                    creditPaise: interestMoney.paise,
                    lineType: LedgerLineType.INTEREST_INCOME,
                    categoryId: 'interest_income'
                });
            }

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: input.description || `Loan Repayment from ${borrower} (Principal: ₹${(Number(principalMoney.paise)/100).toLocaleString('en-IN')}${iBi > 0n ? `, Interest: ₹${(Number(interestMoney.paise)/100).toLocaleString('en-IN')}` : ''})`,
                destinationAccountId: input.destinationAccountId,
                amount: totalMoney,
                category: 'repayment_received',
                idempotencyKey,
                lines,
                metadata: {
                    experienceProfile: profile.profileId,
                    actionId,
                    borrower,
                    principalPaise: principalMoney.paise,
                    interestPaise: interestMoney.paise,
                    loanAccountId: receivableAccId
                }
            });
            break;
        }

        // ==========================================
        // 5. PROVIDENT FUND (PF) WORKFLOWS
        // ==========================================
        case 'ADD_CONTRIBUTION': {
            const provenance = createPFContributionProvenance({
                employee: input.employeePaise || input.employee || '0',
                employer: input.employerPaise || input.employer || '0',
                pension: input.pensionPaise || input.pension || '0',
                interest: '0'
            });

            const pfAccId = input.pfAccountId || 'acc_epfo_uan';
            const bankAccId = input.sourceAccountId || 'acc_payroll_deduction';

            const eeBi = moneyToBigInt(provenance.employee);
            const erBi = moneyToBigInt(provenance.employer) + moneyToBigInt(provenance.pension);

            // Explicit PF Source-of-Funds Accounting:
            // 1. Debit PF Restricted Asset for Total
            // 2. Credit Bank / Salary Clearing for Employee Share
            // 3. Credit Employer Contribution Income for Employer Share & Pension Benefit
            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: pfAccId,
                    debitPaise: provenance.total.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.EMPLOYEE_CONTRIBUTION,
                    movementType: PFMovementType.EMPLOYEE_CONTRIBUTION
                }
            ];

            if (eeBi > 0n) {
                lines.push({
                    lineId: `${txnId}_l2_ee`,
                    accountId: bankAccId,
                    debitPaise: '0',
                    creditPaise: provenance.employee.paise,
                    lineType: LedgerLineType.CASH,
                    movementType: PFMovementType.EMPLOYEE_CONTRIBUTION,
                    description: 'Funded from Salary / Bank Deduction'
                });
            }

            if (erBi > 0n) {
                lines.push({
                    lineId: `${txnId}_l3_er`,
                    accountId: 'acc_employer_contribution_income',
                    debitPaise: '0',
                    creditPaise: erBi.toString(),
                    lineType: LedgerLineType.EMPLOYER_CONTRIBUTION,
                    movementType: PFMovementType.EMPLOYER_CONTRIBUTION,
                    description: 'Employer contribution recognized as retirement-related compensation value'
                });
            }

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: input.description || `PF Contribution (EE: ₹${(Number(provenance.employee.paise)/100).toLocaleString('en-IN')}, ER: ₹${(Number(erBi)/100).toLocaleString('en-IN')})`,
                destinationAccountId: pfAccId,
                amount: provenance.total,
                category: 'epf_contribution',
                idempotencyKey,
                lines,
                metadata: {
                    experienceProfile: profile.profileId,
                    pfAccountingPerspective: profile.pfAccountingPerspective || 'EMPLOYEE_PERSONAL_VIEW',
                    actionId,
                    provenance,
                    movementTypes: [PFMovementType.EMPLOYEE_CONTRIBUTION, PFMovementType.EMPLOYER_CONTRIBUTION]
                }
            });
            compiledTxn.provenance = provenance;
            break;
        }

        case 'ADD_INTEREST': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Interest amount must be positive');
            const pfAccId = input.pfAccountId || 'acc_epfo_uan';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: pfAccId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.INTEREST_ACCRUAL,
                    movementType: PFMovementType.INTEREST_CREDITED
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: 'category_epfo_interest',
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.GENERAL
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: input.description || 'EPFO Annual Interest Credited',
                destinationAccountId: pfAccId,
                amount: amountMoney,
                category: 'epfo_interest',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, movementType: PFMovementType.INTEREST_CREDITED }
            });
            break;
        }

        // ==========================================
        // 6. INVESTMENT REGISTER WORKFLOWS
        // ==========================================
        case 'INVEST_CASH':
        case 'BUY_INVESTMENT': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Investment amount must be positive');
            if (!input.sourceAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Funding bank account is required');
            const assetName = input.assetName || input.counterpartyName || 'Mutual Fund / Equity';
            const invAssetAccId = input.investmentAccountId || 'inv_asset_portfolio';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: invAssetAccId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.GENERAL,
                    categoryId: 'investment_asset'
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: input.sourceAccountId,
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.CASH
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.EXPENSE,
                transactionDate: date,
                description: input.description || `Invested in ${assetName}`,
                sourceAccountId: input.sourceAccountId,
                amount: amountMoney,
                category: 'investment_buy',
                idempotencyKey,
                lines,
                metadata: {
                    experienceProfile: profile.profileId,
                    actionId,
                    assetName,
                    investedCostPaise: amountMoney.paise,
                    units: input.units || null,
                    nav: input.nav || null
                }
            });
            break;
        }

        case 'RECORD_DIVIDEND': {
            const amountMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const amtBi = moneyToBigInt(amountMoney);
            if (amtBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Dividend amount must be positive');
            if (!input.destinationAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Payout bank account is required');
            const assetName = input.assetName || 'Portfolio Holdings';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: input.destinationAccountId,
                    debitPaise: amountMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.CASH
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: 'inv_inc_dividends',
                    debitPaise: '0',
                    creditPaise: amountMoney.paise,
                    lineType: LedgerLineType.GENERAL,
                    categoryId: 'dividend_income'
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: input.description || `Dividend Received from ${assetName}`,
                destinationAccountId: input.destinationAccountId,
                amount: amountMoney,
                category: 'dividend_income',
                idempotencyKey,
                lines,
                metadata: { experienceProfile: profile.profileId, actionId, assetName }
            });
            break;
        }

        case 'UPDATE_VALUATION': {
            // Key Invariant: Invested Cost != Current Market Value.
            // Unrealized valuation changes do NOT affect cash or bank balances.
            const marketValMoney = createMoneyPaise(input.marketValuePaise || input.marketValue || '0');
            const mvBi = moneyToBigInt(marketValMoney);
            if (mvBi < 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Market value cannot be negative');

            // Non-cash valuation record
            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: 'inv_asset_unrealized_delta',
                    debitPaise: marketValMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.VALUATION_ADJUSTMENT
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: 'inv_equity_unrealized_gain',
                    debitPaise: '0',
                    creditPaise: marketValMoney.paise,
                    lineType: LedgerLineType.VALUATION_ADJUSTMENT
                }
            ];

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.ADJUSTMENT,
                transactionDate: date,
                description: input.description || `Portfolio Valuation Update: ₹${(Number(marketValMoney.paise)/100).toLocaleString('en-IN')}`,
                amount: marketValMoney,
                category: 'portfolio_valuation',
                idempotencyKey,
                lines,
                metadata: {
                    experienceProfile: profile.profileId,
                    actionId,
                    marketValuePaise: marketValMoney.paise,
                    isNonCash: true
                }
            });
            break;
        }

        case 'SELL_INVESTMENT': {
            const proceedsMoney = createMoneyPaise(input.amountPaise || input.amount || '0');
            const costBasisMoney = createMoneyPaise(input.costBasisPaise || input.costBasis || input.amountPaise || input.amount || '0');
            const proceedsBi = moneyToBigInt(proceedsMoney);
            const costBi = moneyToBigInt(costBasisMoney);
            if (proceedsBi <= 0n) throw new WorkflowCompilerError('INVALID_AMOUNT', 'Sale proceeds must be positive');
            if (!input.destinationAccountId) throw new WorkflowCompilerError('MISSING_ACCOUNT', 'Destination bank account is required');

            const gainLossBi = proceedsBi - costBi;
            const invAssetAccId = input.investmentAccountId || 'inv_asset_portfolio';

            const lines = [
                {
                    lineId: `${txnId}_l1`,
                    accountId: input.destinationAccountId,
                    debitPaise: proceedsMoney.paise,
                    creditPaise: '0',
                    lineType: LedgerLineType.CASH
                },
                {
                    lineId: `${txnId}_l2`,
                    accountId: invAssetAccId,
                    debitPaise: '0',
                    creditPaise: costBasisMoney.paise,
                    lineType: LedgerLineType.GENERAL
                }
            ];

            if (gainLossBi > 0n) {
                // Realized gain
                lines.push({
                    lineId: `${txnId}_l3_gain`,
                    accountId: 'inv_gain_realized',
                    debitPaise: '0',
                    creditPaise: gainLossBi.toString(),
                    lineType: LedgerLineType.GENERAL
                });
            } else if (gainLossBi < 0n) {
                // Realized loss
                lines.push({
                    lineId: `${txnId}_l3_loss`,
                    accountId: 'inv_loss_realized',
                    debitPaise: (-gainLossBi).toString(),
                    creditPaise: '0',
                    lineType: LedgerLineType.GENERAL
                });
            }

            compiledTxn = createLedgerTransaction({
                transactionId: txnId,
                bookId,
                transactionType: TransactionType.INCOME,
                transactionDate: date,
                description: input.description || `Redemption / Sale of Investment`,
                destinationAccountId: input.destinationAccountId,
                amount: proceedsMoney,
                category: 'investment_sell',
                idempotencyKey,
                lines,
                metadata: {
                    experienceProfile: profile.profileId,
                    actionId,
                    proceedsPaise: proceedsMoney.paise,
                    costBasisPaise: costBasisMoney.paise,
                    realizedGainLossPaise: gainLossBi.toString()
                }
            });
            break;
        }

        default:
            throw new WorkflowCompilerError('UNSUPPORTED_ACTION', `Workflow action '${actionId}' is not supported for profile '${profile.profileId}'`);
    }

    return compiledTxn;
}
