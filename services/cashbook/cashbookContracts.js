/**
 * services/cashbook/cashbookContracts.js
 * 
 * Authoritative domain contracts, enums, MoneyPaise serialization,
 * canonical hashing structures, and standard schemas for the FinLife Cashbook Module.
 * 
 * Invariants:
 * - Zero floating-point arithmetic (all monetary math in integer paise).
 * - Strict separation between Asset accounts (positive = owned) and Liability accounts (positive = owed).
 * - Opening balance is an immutable ledger transaction record, not an editable account field.
 * - Double-entry-aware transfer pairs sharing a transferGroupId.
 */

export const AccountType = Object.freeze({
    BANK: 'BANK',
    CASH: 'CASH',
    WALLET: 'WALLET',
    CREDIT_CARD: 'CREDIT_CARD',
    LOAN: 'LOAN',
    INVESTMENT: 'INVESTMENT',
    OTHER: 'OTHER'
});

export const AccountNature = Object.freeze({
    ASSET: 'ASSET',
    LIABILITY: 'LIABILITY'
});

export const ACCOUNT_TYPE_NATURE = Object.freeze({
    [AccountType.BANK]: AccountNature.ASSET,
    [AccountType.CASH]: AccountNature.ASSET,
    [AccountType.WALLET]: AccountNature.ASSET,
    [AccountType.INVESTMENT]: AccountNature.ASSET,
    [AccountType.OTHER]: AccountNature.ASSET,
    [AccountType.CREDIT_CARD]: AccountNature.LIABILITY,
    [AccountType.LOAN]: AccountNature.LIABILITY
});

export const TransactionType = Object.freeze({
    OPENING_BALANCE: 'OPENING_BALANCE',
    INCOME: 'INCOME',
    EXPENSE: 'EXPENSE',
    TRANSFER: 'TRANSFER',
    REFUND: 'REFUND',
    ADJUSTMENT: 'ADJUSTMENT'
});

export const BalanceEffect = Object.freeze({
    INCREASE: 'INCREASE',
    DECREASE: 'DECREASE',
    NEUTRAL: 'NEUTRAL'
});

export const RefundTargetType = Object.freeze({
    EXPENSE: 'EXPENSE',
    INCOME: 'INCOME'
});

export const TransactionStatus = Object.freeze({
    POSTED: 'POSTED',
    VOIDED: 'VOIDED',
    PENDING: 'PENDING'
});

export const TransactionSource = Object.freeze({
    MANUAL: 'MANUAL',
    SMS: 'SMS',
    RECURRING_COMMITMENT: 'RECURRING_COMMITMENT',
    IMPORT: 'IMPORT',
    SYSTEM_ADJUSTMENT: 'SYSTEM_ADJUSTMENT'
});

export const CashbookAppMode = Object.freeze({
    DEMO: 'DEMO',
    PRODUCTION: 'PRODUCTION'
});

export const CashbookType = Object.freeze({
    SAVINGS: 'SAVINGS',
    HANDY_CASH: 'HANDY_CASH',
    BUSINESS_CASH_AND_OBLIGATIONS: 'BUSINESS_CASH_AND_OBLIGATIONS',
    PF: 'PF',
    LOANS_GIVEN: 'LOANS_GIVEN',
    LOANS_TAKEN: 'LOANS_TAKEN',
    REGULAR_INCOME: 'REGULAR_INCOME',
    INVESTMENTS: 'INVESTMENTS',
    CUSTOM: 'CUSTOM'
});

export const BalanceMode = Object.freeze({
    AVAILABLE_CASH: 'AVAILABLE_CASH',
    PHYSICAL_CASH: 'PHYSICAL_CASH',
    BUSINESS_CASH_AND_OBLIGATIONS: 'BUSINESS_CASH_AND_OBLIGATIONS',
    RESTRICTED_ASSET: 'RESTRICTED_ASSET',
    LOAN_RECEIVABLE: 'LOAN_RECEIVABLE',
    LOAN_LIABILITY: 'LOAN_LIABILITY',
    PORTFOLIO_VALUATION: 'PORTFOLIO_VALUATION',
    CONFIGURABLE: 'CONFIGURABLE'
});


export const CashbookExperienceProfile = Object.freeze({
    PERSONAL_FINANCE_BOOK: 'PERSONAL_FINANCE_BOOK',
    HANDY_CASH_REGISTER: 'HANDY_CASH_REGISTER',
    BUSINESS_OPERATIONS_CASHBOOK: 'BUSINESS_OPERATIONS_CASHBOOK',
    REGULAR_INCOME_BOOK: 'REGULAR_INCOME_BOOK',
    LOANS_GIVEN_REGISTER: 'LOANS_GIVEN_REGISTER',
    LOANS_TAKEN_REGISTER: 'LOANS_TAKEN_REGISTER',
    PROVIDENT_FUND_REGISTER: 'PROVIDENT_FUND_REGISTER',
    INVESTMENT_REGISTER: 'INVESTMENT_REGISTER',
    CUSTOM: 'CUSTOM'
});

export const PFAccountingPerspective = Object.freeze({
    EMPLOYEE_PERSONAL_VIEW: 'EMPLOYEE_PERSONAL_VIEW',
    EMPLOYER_PAYROLL_VIEW: 'EMPLOYER_PAYROLL_VIEW'
});

export const CrossBookWALState = Object.freeze({
    INITIATED: 'INITIATED',
    SOURCE_PREPARED: 'SOURCE_PREPARED',
    DUAL_PREPARED: 'DUAL_PREPARED',
    SOURCE_COMMITTED: 'SOURCE_COMMITTED',
    DESTINATION_COMMITTED: 'DESTINATION_COMMITTED',
    COMMITTED: 'COMMITTED',
    COMPLETED: 'COMPLETED',
    ROLLED_BACK: 'ROLLED_BACK',
    RECOVERY_CONFLICT: 'RECOVERY_CONFLICT',
    QUARANTINED: 'QUARANTINED'
});

export const CrossBookWALTransitions = Object.freeze({
    [CrossBookWALState.INITIATED]: new Set([CrossBookWALState.SOURCE_PREPARED, CrossBookWALState.ROLLED_BACK, CrossBookWALState.QUARANTINED]),
    [CrossBookWALState.SOURCE_PREPARED]: new Set([CrossBookWALState.DUAL_PREPARED, CrossBookWALState.ROLLED_BACK, CrossBookWALState.QUARANTINED]),
    [CrossBookWALState.DUAL_PREPARED]: new Set([CrossBookWALState.SOURCE_COMMITTED, CrossBookWALState.DESTINATION_COMMITTED, CrossBookWALState.COMMITTED, CrossBookWALState.ROLLED_BACK, CrossBookWALState.RECOVERY_CONFLICT, CrossBookWALState.QUARANTINED]),
    [CrossBookWALState.SOURCE_COMMITTED]: new Set([CrossBookWALState.COMMITTED, CrossBookWALState.COMPLETED, CrossBookWALState.RECOVERY_CONFLICT, CrossBookWALState.QUARANTINED]),
    [CrossBookWALState.DESTINATION_COMMITTED]: new Set([CrossBookWALState.COMMITTED, CrossBookWALState.COMPLETED, CrossBookWALState.RECOVERY_CONFLICT, CrossBookWALState.QUARANTINED]),
    [CrossBookWALState.COMMITTED]: new Set([CrossBookWALState.COMPLETED, CrossBookWALState.RECOVERY_CONFLICT, CrossBookWALState.QUARANTINED]),
    [CrossBookWALState.COMPLETED]: new Set([]),
    [CrossBookWALState.ROLLED_BACK]: new Set([]),
    [CrossBookWALState.RECOVERY_CONFLICT]: new Set([]),
    [CrossBookWALState.QUARANTINED]: new Set([])
});

export const ClosingMode = Object.freeze({
    PHYSICAL_TILL: 'PHYSICAL_TILL',
    OPERATIONAL: 'OPERATIONAL',
    STATEMENT_PERIOD: 'STATEMENT_PERIOD',
    VALUATION_DATE: 'VALUATION_DATE',
    OPTIONAL_SNAPSHOT: 'OPTIONAL_SNAPSHOT'
});

export const ClosingRequirement = Object.freeze({
    MANDATORY: 'MANDATORY',
    OPTIONAL: 'OPTIONAL',
    PERIODIC: 'PERIODIC'
});

export const DailyClosingStatus = Object.freeze({
    OPEN: 'OPEN',
    COUNTED: 'COUNTED',
    CLOSED: 'CLOSED',
    LOCKED: 'LOCKED'
});

export const LedgerLineType = Object.freeze({
    CASH: 'CASH',
    LIABILITY_REDUCTION: 'LIABILITY_REDUCTION',
    INTEREST_EXPENSE: 'INTEREST_EXPENSE',
    INTEREST_INCOME: 'INTEREST_INCOME',
    FEES_EXPENSE: 'FEES_EXPENSE',
    PRINCIPAL_DISBURSED: 'PRINCIPAL_DISBURSED',
    PRINCIPAL_REPAID: 'PRINCIPAL_REPAID',
    EMPLOYEE_CONTRIBUTION: 'EMPLOYEE_CONTRIBUTION',
    EMPLOYER_CONTRIBUTION: 'EMPLOYER_CONTRIBUTION',
    PENSION_CONTRIBUTION: 'PENSION_CONTRIBUTION',
    INTEREST_ACCRUAL: 'INTEREST_ACCRUAL',
    TRANSFER_OUT: 'TRANSFER_OUT',
    TRANSFER_IN: 'TRANSFER_IN',
    VALUATION_ADJUSTMENT: 'VALUATION_ADJUSTMENT',
    GENERAL: 'GENERAL'
});

export const PurchaseClassification = Object.freeze({
    INVENTORY: 'INVENTORY',
    OPERATING_EXPENSE: 'OPERATING_EXPENSE',
    CAPITAL_EQUIPMENT: 'CAPITAL_EQUIPMENT',
    SUPPLIER_ADVANCE: 'SUPPLIER_ADVANCE'
});

export const PFMovementType = Object.freeze({
    EMPLOYEE_CONTRIBUTION: 'EMPLOYEE_CONTRIBUTION',
    EMPLOYER_CONTRIBUTION: 'EMPLOYER_CONTRIBUTION',
    EMPLOYER_PENSION: 'EMPLOYER_PENSION',
    INTEREST_CREDITED: 'INTEREST_CREDITED',
    TRANSFER_IN: 'TRANSFER_IN',
    TRANSFER_OUT: 'TRANSFER_OUT',
    WITHDRAWAL: 'WITHDRAWAL',
    PARTIAL_ADVANCE: 'PARTIAL_ADVANCE'
});

export const STANDARD_DENOMINATIONS = Object.freeze([
    { key: 'd500', valuePaise: '50000', label: '₹500' },
    { key: 'd200', valuePaise: '20000', label: '₹200' },
    { key: 'd100', valuePaise: '10000', label: '₹100' },
    { key: 'd50',  valuePaise: '5000',  label: '₹50' },
    { key: 'd20',  valuePaise: '2000',  label: '₹20' },
    { key: 'd10',  valuePaise: '1000',  label: '₹10' },
    { key: 'd5',   valuePaise: '500',   label: '₹5' },
    { key: 'd2',   valuePaise: '200',   label: '₹2' },
    { key: 'd1',   valuePaise: '100',   label: '₹1' },
    { key: 'coins', valuePaise: '100',  label: 'Coins' }
]);

export const CashbookConfigMap = Object.freeze({
    [CashbookType.SAVINGS]: {
        type: CashbookType.SAVINGS,
        title: 'Personal Savings',
        balanceMode: BalanceMode.AVAILABLE_CASH,
        closingRequirement: ClosingRequirement.OPTIONAL,
        supportsDenominationCount: false,
        supportsPrincipalInterestSplit: false,
        supportsRestrictedBalance: false,
        presentationMode: 'MODE_A', // Simple Cashbook
        terminology: {
            moneyInLabel: 'Money In',
            moneyOutLabel: 'Money Out',
            balanceLabel: 'Available Cash',
            descriptionLabel: 'Particulars / Description'
        }
    },
    [CashbookType.HANDY_CASH]: {
        type: CashbookType.HANDY_CASH,
        title: 'Handy Cash Register',
        balanceMode: BalanceMode.PHYSICAL_CASH,
        closingRequirement: ClosingRequirement.MANDATORY,
        supportsDenominationCount: true,
        supportsPrincipalInterestSplit: false,
        supportsRestrictedBalance: false,
        presentationMode: 'MODE_A', // Simple Cashbook
        terminology: {
            moneyInLabel: 'Cash Received',
            moneyOutLabel: 'Cash Paid',
            balanceLabel: 'Cash in Hand',
            descriptionLabel: 'Receipt / Expense Reason'
        }
    },
    [CashbookType.BUSINESS_CASH_AND_OBLIGATIONS]: {
        type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS,
        title: 'Business Cash & Obligations',
        balanceMode: BalanceMode.BUSINESS_CASH_AND_OBLIGATIONS,
        closingRequirement: ClosingRequirement.OPTIONAL,
        supportsDenominationCount: true,
        supportsPrincipalInterestSplit: false,
        supportsRestrictedBalance: false,
        presentationMode: 'MODE_B', // Account Ledger (Debit / Credit)
        terminology: {
            moneyInLabel: 'Credit (Money In / Receivable)',
            moneyOutLabel: 'Debit (Money Out / Payable)',
            balanceLabel: 'Net Business Position',
            descriptionLabel: 'Party / Invoice / Reference'
        }
    },
    [CashbookType.PF]: {
        type: CashbookType.PF,
        title: 'Provident Fund (PF)',
        balanceMode: BalanceMode.RESTRICTED_ASSET,
        closingRequirement: ClosingRequirement.PERIODIC,
        supportsDenominationCount: false,
        supportsPrincipalInterestSplit: false,
        supportsRestrictedBalance: true,
        presentationMode: 'MODE_C', // Multi-Line Breakdown
        terminology: {
            moneyInLabel: 'Contribution / Interest',
            moneyOutLabel: 'Withdrawal / Advance',
            balanceLabel: 'Restricted PF Balance',
            descriptionLabel: 'Month / UAN Contribution Details'
        }
    },
    [CashbookType.LOANS_GIVEN]: {
        type: CashbookType.LOANS_GIVEN,
        title: 'Loans Given (Receivables)',
        balanceMode: BalanceMode.LOAN_RECEIVABLE,
        closingRequirement: ClosingRequirement.PERIODIC,
        supportsDenominationCount: false,
        supportsPrincipalInterestSplit: false,
        supportsRestrictedBalance: false,
        presentationMode: 'MODE_B', // Account Ledger
        terminology: {
            moneyInLabel: 'Repayment Received',
            moneyOutLabel: 'Principal Disbursed',
            balanceLabel: 'Outstanding Receivable',
            descriptionLabel: 'Borrower Name / Agreement'
        }
    },
    [CashbookType.LOANS_TAKEN]: {
        type: CashbookType.LOANS_TAKEN,
        title: 'Loans Taken (Liabilities)',
        balanceMode: BalanceMode.LOAN_LIABILITY,
        closingRequirement: ClosingRequirement.PERIODIC,
        supportsDenominationCount: false,
        supportsPrincipalInterestSplit: true,
        supportsRestrictedBalance: false,
        presentationMode: 'MODE_C', // Multi-Line Breakdown (Principal vs Interest)
        terminology: {
            moneyInLabel: 'Loan Disbursed to Bank',
            moneyOutLabel: 'EMI Paid',
            balanceLabel: 'Outstanding Debt Owed',
            descriptionLabel: 'Loan A/c / Bank / Lender'
        }
    },
    [CashbookType.INVESTMENTS]: {
        type: CashbookType.INVESTMENTS,
        title: 'Investments & Portfolio',
        balanceMode: BalanceMode.PORTFOLIO_VALUATION,
        closingRequirement: ClosingRequirement.PERIODIC,
        supportsDenominationCount: false,
        supportsPrincipalInterestSplit: false,
        supportsRestrictedBalance: false,
        presentationMode: 'MODE_B',
        terminology: {
            moneyInLabel: 'Capital Invested / Gain',
            moneyOutLabel: 'Redemption / Loss',
            balanceLabel: 'Portfolio Value',
            descriptionLabel: 'Asset / Folio / Scheme'
        }
    },
    [CashbookType.CUSTOM]: {
        type: CashbookType.CUSTOM,
        title: 'Custom Financial Book',
        balanceMode: BalanceMode.CONFIGURABLE,
        closingRequirement: ClosingRequirement.OPTIONAL,
        supportsDenominationCount: false,
        supportsPrincipalInterestSplit: false,
        supportsRestrictedBalance: false,
        presentationMode: 'MODE_A',
        terminology: {
            moneyInLabel: 'Money In',
            moneyOutLabel: 'Money Out',
            balanceLabel: 'Running Balance',
            descriptionLabel: 'Particulars'
        }
    }
});

/**
 * Standard Hierarchical Categories for India
 */
export const StandardCategories = Object.freeze({
    INCOME: [
        { id: 'salary', name: 'Salary', subcategories: ['Primary Job', 'Bonus', 'Incentive'] },
        { id: 'freelance', name: 'Freelance & Consulting', subcategories: ['Project', 'Consulting', 'Honorarium'] },
        { id: 'business', name: 'Business Income', subcategories: ['Sales', 'Services'] },
        { id: 'investments', name: 'Investment Returns', subcategories: ['Dividends', 'Interest', 'Capital Gains'] },
        { id: 'rental', name: 'Rental Income', subcategories: ['House Rent', 'Commercial Rent'] },
        { id: 'gifts', name: 'Gifts & Transfers', subcategories: ['Family Gift', 'Cash Gift'] },
        { id: 'refunds', name: 'Refunds & Reversals', subcategories: ['Tax Refund', 'Merchant Refund'] },
        { id: 'other_income', name: 'Other Income', subcategories: ['Miscellaneous'] }
    ],
    EXPENSE: [
        { id: 'housing', name: 'Housing', subcategories: ['Rent', 'Maintenance', 'Property Tax'] },
        { id: 'utilities', name: 'Utilities', subcategories: ['Electricity', 'Water', 'Gas', 'Internet & Broadband', 'DTH & Cable'] },
        { id: 'food', name: 'Food & Dining', subcategories: ['Groceries', 'Dining Out', 'Food Delivery', 'Coffee & Snacks'] },
        { id: 'transport', name: 'Transport & Fuel', subcategories: ['Fuel', 'Cab & Auto', 'Public Transit', 'Toll & Fastag', 'Vehicle Maintenance'] },
        { id: 'healthcare', name: 'Healthcare & Wellness', subcategories: ['Doctor Visit', 'Medicine & Pharmacy', 'Health Insurance', 'Lab Tests'] },
        { id: 'shopping', name: 'Shopping & Essentials', subcategories: ['Clothing', 'Electronics', 'Home Goods', 'Personal Items'] },
        { id: 'entertainment', name: 'Entertainment & Leisure', subcategories: ['Movies', 'Streaming Services', 'Hobbies', 'Vacation'] },
        { id: 'debt_emi', name: 'Debt & EMI', subcategories: ['Home Loan EMI', 'Car Loan EMI', 'Personal Loan EMI', 'Credit Card Bill'] },
        { id: 'education', name: 'Education & Learning', subcategories: ['School Fees', 'Courses & Certifications', 'Books'] },
        { id: 'personal_care', name: 'Personal Care', subcategories: ['Salon', 'Gym & Fitness', 'Grooming'] },
        { id: 'miscellaneous', name: 'Miscellaneous', subcategories: ['General Expense', 'Charity & Donation'] }
    ]
});

/**
 * Creates a valid MoneyPaise object.
 * Safe for JSON serialization: stores paise as an integer string.
 * @param {string|number|bigint} paiseValue 
 * @param {string} currency 
 * @returns {{ paise: string, currency: string }}
 */
export function createMoneyPaise(paiseValue, currency = 'INR') {
    if (paiseValue === undefined || paiseValue === null) {
        throw new Error('paiseValue is required');
    }

    let strVal;
    if (typeof paiseValue === 'bigint') {
        if (paiseValue < 0n) throw new Error('Financial paise amount must be non-negative');
        strVal = paiseValue.toString();
    } else if (typeof paiseValue === 'number') {
        if (!Number.isFinite(paiseValue) || paiseValue < 0 || !Number.isInteger(paiseValue)) {
            throw new Error(`Financial paise amount must be a non-negative integer: ${paiseValue}`);
        }
        strVal = paiseValue.toString();
    } else if (typeof paiseValue === 'string') {
        const trimmed = paiseValue.trim();
        if (!/^\d+$/.test(trimmed)) {
            throw new Error(`Invalid paise string representation: "${paiseValue}"`);
        }
        strVal = trimmed;
    } else {
        throw new Error(`Unsupported paise type: ${typeof paiseValue}`);
    }

    return {
        paise: strVal,
        currency: currency.toUpperCase()
    };
}

/**
 * Converts Rupees (decimal or int) to MoneyPaise.
 * Prevents IEEE-754 precision drift.
 * @param {number|string} rupees 
 * @param {string} currency 
 * @returns {{ paise: string, currency: string }}
 */
export function rupeesToMoneyPaise(rupees, currency = 'INR') {
    if (rupees === undefined || rupees === null) {
        throw new Error('rupees value is required');
    }
    const num = Number(rupees);
    if (!Number.isFinite(num) || num < 0) {
        throw new Error(`Rupee amount must be a non-negative number: ${rupees}`);
    }
    const paiseInt = Math.round(num * 100);
    return createMoneyPaise(paiseInt, currency);
}

/**
 * Converts MoneyPaise to BigInt for domain arithmetic.
 * @param {{ paise: string }} moneyPaise 
 * @returns {bigint}
 */
export function moneyToBigInt(moneyPaise) {
    if (!moneyPaise || typeof moneyPaise.paise !== 'string' || !/^\d+$/.test(moneyPaise.paise)) {
        throw new Error(`Invalid MoneyPaise object: ${JSON.stringify(moneyPaise)}`);
    }
    return BigInt(moneyPaise.paise);
}

/**
 * Converts raw paise string to BigInt.
 * @param {string} paiseStr 
 * @returns {bigint}
 */
export function paiseToBigInt(paiseStr) {
    if (typeof paiseStr !== 'string' || !/^\d+$/.test(paiseStr)) {
        throw new Error(`Invalid paise string: "${paiseStr}"`);
    }
    return BigInt(paiseStr);
}

/**
 * Converts MoneyPaise to human-readable Rupee decimal number (for presentation view models only).
 * @param {{ paise: string }} moneyPaise 
 * @returns {number}
 */
export function moneyToRupees(moneyPaise) {
    const bi = moneyToBigInt(moneyPaise);
    return Number(bi) / 100;
}

/**
 * Formats MoneyPaise to Indian currency string e.g. "₹1,42,500" or "₹1,42,500.50"
 * @param {{ paise: string }} moneyPaise 
 * @param {boolean} includeDecimals 
 * @returns {string}
 */
export function formatMoneyPaise(moneyPaise, includeDecimals = false) {
    const bi = moneyToBigInt(moneyPaise);
    const whole = bi / 100n;
    const remainder = bi % 100n;

    const wholeStr = whole.toString();
    let formattedWhole = '';
    if (wholeStr.length <= 3) {
        formattedWhole = wholeStr;
    } else {
        const last3 = wholeStr.substring(wholeStr.length - 3);
        const remaining = wholeStr.substring(0, wholeStr.length - 3);
        const parts = [];
        for (let i = remaining.length; i > 0; i -= 2) {
            const start = Math.max(0, i - 2);
            parts.unshift(remaining.substring(start, i));
        }
        formattedWhole = parts.join(',') + ',' + last3;
    }

    if (includeDecimals && remainder > 0n) {
        const remStr = remainder.toString().padStart(2, '0');
        return `₹${formattedWhole}.${remStr}`;
    }
    return `₹${formattedWhole}`;
}

/**
 * Deterministic canonical JSON stringifier (alphabetically sorts keys recursively, no extraneous whitespace).
 * Required for audit hash chaining and cryptographic integrity.
 * @param {any} val 
 * @returns {string}
 */
export function canonicalJsonStringify(val) {
    if (val === null || val === undefined) {
        return 'null';
    }
    if (typeof val === 'bigint') {
        return `"${val.toString()}"`;
    }
    if (typeof val === 'number' || typeof val === 'boolean') {
        return JSON.stringify(val);
    }
    if (typeof val === 'string') {
        return JSON.stringify(val);
    }
    if (Array.isArray(val)) {
        return `[${val.map(canonicalJsonStringify).join(',')}]`;
    }
    if (typeof val === 'object') {
        const sortedKeys = Object.keys(val).sort();
        const entries = sortedKeys
            .filter(k => val[k] !== undefined)
            .map(k => `${JSON.stringify(k)}:${canonicalJsonStringify(val[k])}`);
        return `{${entries.join(',')}}`;
    }
    return JSON.stringify(val);
}

/**
 * Creates an Account contract record.
 */
export function createAccount({
    id,
    name,
    type,
    currency = 'INR',
    institution = '',
    accountNumberLast4 = '',
    isActive = true,
    metadata = {}
}) {
    if (!id || typeof id !== 'string') throw new Error('Account id is required');
    if (!name || typeof name !== 'string' || !name.trim()) throw new Error('Account name is required');
    if (!Object.values(AccountType).includes(type)) {
        throw new Error(`Invalid AccountType: ${type}`);
    }

    const nature = ACCOUNT_TYPE_NATURE[type] || AccountNature.ASSET;

    return {
        id: id.trim(),
        name: name.trim(),
        type,
        nature,
        currency: currency.toUpperCase(),
        institution: institution.trim(),
        accountNumberLast4: accountNumberLast4.trim(),
        isActive: Boolean(isActive),
        metadata: { ...metadata },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Creates an immutable OPENING_BALANCE ledger transaction record.
 */
export function createOpeningBalanceRecord({
    id,
    accountId,
    amount,
    date = new Date().toISOString().split('T')[0],
    description = 'Opening Balance',
    notes = '',
    currency = 'INR'
}) {
    if (!id || typeof id !== 'string') throw new Error('Opening balance transaction id is required');
    if (!accountId || typeof accountId !== 'string') throw new Error('accountId is required');

    const moneyPaise = typeof amount === 'object' && amount.paise ? amount : createMoneyPaise(amount, currency);

    return {
        id: id.trim(),
        transactionType: TransactionType.OPENING_BALANCE,
        accountId: accountId.trim(),
        amount: moneyPaise,
        date,
        description: description.trim(),
        notes: notes ? notes.trim() : '',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        immutable: true,
        version: 1,
        idempotencyKey: `opening:${accountId.trim()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Creates a Cashbook contract entity.
 */
export function createCashbook({
    id,
    name,
    type = CashbookType.SAVINGS,
    description = '',
    currency = 'INR',
    isDefault = false,
    metadata = {}
}) {
    if (!id || typeof id !== 'string') throw new Error('Cashbook id is required');
    if (!name || typeof name !== 'string' || !name.trim()) throw new Error('Cashbook name is required');
    if (!Object.values(CashbookType).includes(type)) {
        throw new Error(`Invalid CashbookType: ${type}`);
    }

    const config = CashbookConfigMap[type] || CashbookConfigMap[CashbookType.CUSTOM];

    return {
        id: id.trim(),
        name: name.trim(),
        type,
        description: description ? description.trim() : '',
        currency: currency.toUpperCase(),
        balanceMode: config.balanceMode,
        closingRequirement: config.closingRequirement,
        supportsDenominationCount: config.supportsDenominationCount,
        supportsPrincipalInterestSplit: config.supportsPrincipalInterestSplit,
        supportsRestrictedBalance: config.supportsRestrictedBalance,
        presentationMode: config.presentationMode,
        isDefault: Boolean(isDefault),
        metadata: { ...metadata },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Creates a DailyClosingRecord entity.
 */
export function createDailyClosingRecord({
    id,
    bookId,
    date,
    openingBalance,
    totalMoneyIn,
    totalMoneyOut,
    calculatedClosing,
    denominations = {},
    countedClosing = null,
    difference = null,
    status = DailyClosingStatus.OPEN,
    notes = '',
    closedBy = 'USER',
    closedAt = null
}) {
    if (!id || typeof id !== 'string') throw new Error('Daily closing id is required');
    if (!bookId || typeof bookId !== 'string') throw new Error('bookId is required');
    if (!date || typeof date !== 'string') throw new Error('date is required (YYYY-MM-DD)');

    const opMoney = typeof openingBalance === 'object' && openingBalance.paise ? openingBalance : createMoneyPaise(openingBalance || '0');
    const inMoney = typeof totalMoneyIn === 'object' && totalMoneyIn.paise ? totalMoneyIn : createMoneyPaise(totalMoneyIn || '0');
    const outMoney = typeof totalMoneyOut === 'object' && totalMoneyOut.paise ? totalMoneyOut : createMoneyPaise(totalMoneyOut || '0');
    const calcMoney = typeof calculatedClosing === 'object' && calculatedClosing.paise ? calculatedClosing : createMoneyPaise(calculatedClosing || '0');

    const countedMoney = countedClosing ? (typeof countedClosing === 'object' && countedClosing.paise ? countedClosing : createMoneyPaise(countedClosing)) : null;
    const diffMoney = difference ? (typeof difference === 'object' && difference.paise ? difference : createMoneyPaise(difference)) : null;

    return {
        id: id.trim(),
        bookId: bookId.trim(),
        date,
        openingBalance: opMoney,
        totalMoneyIn: inMoney,
        totalMoneyOut: outMoney,
        calculatedClosing: calcMoney,
        denominations: { ...denominations },
        countedClosing: countedMoney,
        difference: diffMoney,
        status,
        notes: notes ? notes.trim() : '',
        closedBy,
        closedAt: closedAt || (status === DailyClosingStatus.CLOSED || status === DailyClosingStatus.LOCKED ? new Date().toISOString() : null),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
}

/**
 * Creates a discrete LedgerLine within a transaction (Two-Level Model).
 */
export function createLedgerLine({
    id,
    accountId,
    bookId = null,
    direction, // 'DEBIT' | 'CREDIT'
    amount,
    categoryId = null,
    lineType = LedgerLineType.GENERAL,
    notes = ''
}) {
    if (!id || typeof id !== 'string') throw new Error('LedgerLine id is required');
    if (!accountId || typeof accountId !== 'string') throw new Error('LedgerLine accountId is required');
    if (direction !== 'DEBIT' && direction !== 'CREDIT') {
        throw new Error(`Invalid LedgerLine direction: ${direction}. Must be 'DEBIT' or 'CREDIT'`);
    }

    const moneyPaise = typeof amount === 'object' && amount.paise ? amount : createMoneyPaise(amount);

    return {
        id: id.trim(),
        accountId: accountId.trim(),
        bookId: bookId ? bookId.trim() : null,
        direction,
        amount: moneyPaise,
        categoryId: categoryId ? categoryId.trim() : null,
        lineType,
        notes: notes ? notes.trim() : ''
    };
}

/**
 * Creates a validated Loan Repayment Split structure.
 * Enforces: principalPaise + interestPaise + feesPaise == totalPaise.
 */
export function createLoanRepaymentSplit({
    principal,
    interest,
    fees = '0',
    currency = 'INR'
}) {
    const pMoney = typeof principal === 'object' && principal.paise ? principal : createMoneyPaise(principal, currency);
    const iMoney = typeof interest === 'object' && interest.paise ? interest : createMoneyPaise(interest, currency);
    const fMoney = typeof fees === 'object' && fees.paise ? fees : createMoneyPaise(fees, currency);

    const pBi = moneyToBigInt(pMoney);
    const iBi = moneyToBigInt(iMoney);
    const fBi = moneyToBigInt(fMoney);

    if (pBi < 0n || iBi < 0n || fBi < 0n) {
        throw new Error('Loan repayment components must be non-negative paise');
    }

    const totalBi = pBi + iBi + fBi;
    const totalMoney = createMoneyPaise(totalBi, currency);

    return {
        principal: pMoney,
        interest: iMoney,
        fees: fMoney,
        total: totalMoney
    };
}

/**
 * Creates a PF Contribution Provenance structure.
 */
export function createPFContributionProvenance({
    employee,
    employer,
    pension = '0',
    interest = '0',
    restricted = null,
    available = '0',
    currency = 'INR'
}) {
    const eeMoney = typeof employee === 'object' && employee.paise ? employee : createMoneyPaise(employee, currency);
    const erMoney = typeof employer === 'object' && employer.paise ? employer : createMoneyPaise(employer, currency);
    const penMoney = typeof pension === 'object' && pension.paise ? pension : createMoneyPaise(pension, currency);
    const intMoney = typeof interest === 'object' && interest.paise ? interest : createMoneyPaise(interest, currency);

    const totalBi = moneyToBigInt(eeMoney) + moneyToBigInt(erMoney) + moneyToBigInt(penMoney) + moneyToBigInt(intMoney);
    const restMoney = restricted ? (typeof restricted === 'object' && restricted.paise ? restricted : createMoneyPaise(restricted, currency)) : createMoneyPaise(totalBi, currency);
    const availMoney = typeof available === 'object' && available.paise ? available : createMoneyPaise(available, currency);

    return {
        employee: eeMoney,
        employer: erMoney,
        pension: penMoney,
        interest: intMoney,
        restricted: restMoney,
        available: availMoney,
        total: createMoneyPaise(totalBi, currency)
    };
}

/**
 * Creates an Atomic Cross-Book Transfer record pair generator helper.
 */
export function createCrossBookTransfer({
    transferGroupId,
    sourceBookId,
    sourceAccountId,
    destinationBookId,
    destinationAccountId,
    amount,
    date = new Date().toISOString().split('T')[0],
    description = 'Cross-Book Transfer',
    notes = '',
    currency = 'INR'
}) {
    if (!transferGroupId || typeof transferGroupId !== 'string') throw new Error('transferGroupId is required');
    if (!sourceBookId || !destinationBookId) throw new Error('Both sourceBookId and destinationBookId are required');
    if (sourceBookId.trim() === destinationBookId.trim()) throw new Error('Source and destination books cannot be the same');
    if (!sourceAccountId || !destinationAccountId) throw new Error('Both sourceAccountId and destinationAccountId are required');

    const moneyPaise = typeof amount === 'object' && amount.paise ? amount : createMoneyPaise(amount, currency);
    if (moneyToBigInt(moneyPaise) <= 0n) throw new Error('Transfer amount must be strictly greater than zero');

    const sourceTxn = {
        id: `txn_xfer_src_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        bookId: sourceBookId.trim(),
        transactionType: TransactionType.TRANSFER,
        sourceAccountId: sourceAccountId.trim(),
        destinationAccountId: destinationAccountId.trim(),
        destinationBookId: destinationBookId.trim(),
        transferGroupId: transferGroupId.trim(),
        amount: moneyPaise,
        currency: moneyPaise.currency || 'INR',
        date,
        description: description.trim(),
        notes: notes ? notes.trim() : '',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        version: 1,
        idempotencyKey: `xfer:${transferGroupId.trim()}:src`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const destTxn = {
        id: `txn_xfer_dst_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        bookId: destinationBookId.trim(),
        transactionType: TransactionType.TRANSFER,
        sourceAccountId: sourceAccountId.trim(),
        destinationAccountId: destinationAccountId.trim(),
        sourceBookId: sourceBookId.trim(),
        transferGroupId: transferGroupId.trim(),
        amount: moneyPaise,
        currency: moneyPaise.currency || 'INR',
        date,
        description: description.trim(),
        notes: notes ? notes.trim() : '',
        status: TransactionStatus.POSTED,
        source: TransactionSource.MANUAL,
        version: 1,
        idempotencyKey: `xfer:${transferGroupId.trim()}:dst`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    return { sourceTxn, destTxn };
}

/**
 * Authoritative immutable Cross-Book Transfer Record specification for WAL.
 */
export function createAuthoritativeTransferRecord({
    transferGroupId,
    idempotencyKey,
    sourceBookId,
    destinationBookId,
    sourceTransactionId,
    destinationTransactionId,
    amountPaise,
    currency = 'INR',
    sourceBeforeBalance = null,
    sourceAfterBalance = null,
    destinationBeforeBalance = null,
    destinationAfterBalance = null,
    sourcePayloadHash = null,
    destinationPayloadHash = null,
    sourceTxn = null,
    destTxn = null,
    state = CrossBookWALState.INITIATED,
    schemaVersion = 1,
    createdAt = new Date().toISOString()
}) {
    if (!transferGroupId || typeof transferGroupId !== 'string') throw new Error('transferGroupId is required');
    if (!sourceBookId || !destinationBookId) throw new Error('Both sourceBookId and destinationBookId are required');
    if (sourceBookId.trim() === destinationBookId.trim()) throw new Error('Source and destination books cannot be the same');
    const amtStr = typeof amountPaise === 'string' ? amountPaise : (amountPaise?.paise || amountPaise?.toString() || '0');
    if (BigInt(amtStr) <= 0n) throw new Error('amountPaise must be greater than zero');

    return {
        operationType: 'CROSS_BOOK_TRANSFER',
        transferGroupId: transferGroupId.trim(),
        idempotencyKey: idempotencyKey ? idempotencyKey.trim() : `xfer:${transferGroupId.trim()}`,
        sourceBookId: sourceBookId.trim(),
        destinationBookId: destinationBookId.trim(),
        sourceTransactionId: sourceTransactionId || (sourceTxn && sourceTxn.id),
        destinationTransactionId: destinationTransactionId || (destTxn && destTxn.id),
        amountPaise: amtStr,
        currency,
        sourceBeforeBalance,
        sourceAfterBalance,
        destinationBeforeBalance,
        destinationAfterBalance,
        sourcePayloadHash,
        destinationPayloadHash,
        sourceTxn,
        destTxn,
        state,
        schemaVersion,
        createdAt,
        updatedAt: new Date().toISOString()
    };
}



/**
 * Authoritative Purpose-Built Experience Config Map.
 * Decouples the Universal Ledger Engine from purpose-specific UI, navigation,
 * action workflows, category taxonomies, and accounting policies.
 */
export const CashbookExperienceConfigMap = Object.freeze({
    [CashbookExperienceProfile.PERSONAL_FINANCE_BOOK]: Object.freeze({
        profileId: CashbookExperienceProfile.PERSONAL_FINANCE_BOOK,
        bookType: CashbookType.SAVINGS,
        displayName: 'Personal Savings & Household',
        purposeDescription: 'Household finances, salary, family expenses, bills, and liquid savings diary.',
        navigation: Object.freeze([
            { key: 'DASHBOARD', label: 'Dashboard', iconName: 'Home' },
            { key: 'LEDGER', label: 'Passbook', iconName: 'BookOpen' },
            { key: 'SECTIONS', label: 'Household & Bills', iconName: 'Layers' },
            { key: 'ACCOUNTS', label: 'Accounts', iconName: 'Wallet' }
        ]),
        quickActions: Object.freeze([
            { actionId: 'ADD_INCOME', label: 'Add Income', variant: 'success', color: '#10B981' },
            { actionId: 'ADD_EXPENSE', label: 'Add Expense', variant: 'danger', color: '#F43F5E' },
            { actionId: 'TRANSFER', label: 'Transfer', variant: 'primary', color: '#38BDF8' },
            { actionId: 'PAY_BILL', label: 'Pay Bill', variant: 'warning', color: '#F59E0B' }
        ]),
        categoryGroups: Object.freeze([
            {
                name: 'Income',
                categories: [
                    { key: 'salary', label: 'Salary' },
                    { key: 'bonus', label: 'Bonus' },
                    { key: 'freelance', label: 'Freelance Income' },
                    { key: 'business_income', label: 'Business Income' },
                    { key: 'rental_income', label: 'Rental Income' },
                    { key: 'interest_received', label: 'Interest Received' },
                    { key: 'dividend', label: 'Dividend Received' },
                    { key: 'cashback', label: 'Cashback & Reward' },
                    { key: 'refund', label: 'Refund' },
                    { key: 'gift_received', label: 'Gift Received' },
                    { key: 'other_income', label: 'Other Income' }
                ]
            },
            {
                name: 'Home & Household',
                categories: [
                    { key: 'groceries', label: 'Groceries' },
                    { key: 'vegetables_fruits', label: 'Vegetables & Fruits' },
                    { key: 'milk_dairy', label: 'Milk & Dairy' },
                    { key: 'food_dining', label: 'Food & Dining' },
                    { key: 'electricity', label: 'Electricity' },
                    { key: 'water', label: 'Water' },
                    { key: 'gas', label: 'Cooking Gas' },
                    { key: 'internet', label: 'Internet / Wifi' },
                    { key: 'mobile', label: 'Mobile Recharges' },
                    { key: 'rent', label: 'House Rent' },
                    { key: 'apartment_maintenance', label: 'Society Maintenance' },
                    { key: 'domestic_help', label: 'Domestic Help / Maid' },
                    { key: 'home_repairs', label: 'Repairs & Maintenance' },
                    { key: 'household_supplies', label: 'Household Supplies' }
                ]
            },
            {
                name: 'Family & Children',
                categories: [
                    { key: 'school_fees', label: 'School Fees' },
                    { key: 'school_transport', label: 'School Transport' },
                    { key: 'books_stationery', label: 'Books & Stationery' },
                    { key: 'uniforms', label: 'Uniforms' },
                    { key: 'tuition', label: 'Tuition Classes' },
                    { key: 'medical_consultation', label: 'Doctor Consultation' },
                    { key: 'medicines', label: 'Medicines & Pharmacy' },
                    { key: 'child_activities', label: 'Child Activities' },
                    { key: 'family_support', label: 'Family Support' },
                    { key: 'family_gifts', label: 'Gifts to Relatives' }
                ]
            },
            {
                name: 'Personal & Lifestyle',
                categories: [
                    { key: 'clothing', label: 'Clothing & Apparel' },
                    { key: 'personal_care', label: 'Personal Care & Salon' },
                    { key: 'entertainment', label: 'Movies & Entertainment' },
                    { key: 'subscriptions', label: 'OTT / Subscriptions' },
                    { key: 'fitness', label: 'Gym & Fitness' },
                    { key: 'education', label: 'Self Education / Books' },
                    { key: 'professional_expenses', label: 'Professional Expenses' }
                ]
            },
            {
                name: 'Transport & Travel',
                categories: [
                    { key: 'fuel', label: 'Fuel / Petrol / Diesel' },
                    { key: 'public_transport', label: 'Metro / Bus / Train' },
                    { key: 'cab_taxi', label: 'Cab / Auto (Uber/Ola)' },
                    { key: 'vehicle_service', label: 'Vehicle Service' },
                    { key: 'travel_trips', label: 'Vacations & Travel' }
                ]
            },
            {
                name: 'Financial Obligations',
                categories: [
                    { key: 'loan_emi', label: 'Loan EMI Payment' },
                    { key: 'credit_card_bill', label: 'Credit Card Bill Payment' },
                    { key: 'insurance_premium', label: 'Insurance Premium' },
                    { key: 'investment_sip', label: 'SIP / Mutual Fund Contribution' },
                    { key: 'savings_transfer', label: 'Savings Transfer' },
                    { key: 'money_lent', label: 'Money Lent to Friend' },
                    { key: 'money_received_back', label: 'Money Received Back' }
                ]
            }
        ]),
        balancePolicy: Object.freeze({
            balanceMode: BalanceMode.AVAILABLE_CASH,
            positiveMeaning: 'MONEY_OWNED',
            negativeMeaning: 'OVERDRAFT_DEBT',
            allowedAccountTypes: [AccountType.BANK, AccountType.CASH, AccountType.WALLET]
        }),
        closingPolicy: Object.freeze({
            enabled: true,
            mode: ClosingMode.OPTIONAL_SNAPSHOT,
            requiresDenominations: false,
            requiresPeriodLock: false,
            allowsShortageExcess: false
        }),
        validationPolicy: Object.freeze({
            strictBalancedLines: true,
            allowOverdraft: false,
            requireCounterparty: false,
            enforceSplitTotal: false
        }),
        dashboardMetrics: Object.freeze(['availableBalance', 'todayFlow', 'monthlyFlow', 'savingsMovement']),
        featureFlags: Object.freeze({
            supportsDenominations: false,
            supportsSplits: false,
            supportsProvenance: false,
            supportsReceivablesPayables: false
        }),
        integrations: Object.freeze({
            recurringConfirmations: true,
            moneyFlowTracking: true,
            budgetSync: true,
            netWorthTracking: true
        })
    }),

    [CashbookExperienceProfile.HANDY_CASH_REGISTER]: Object.freeze({
        profileId: CashbookExperienceProfile.HANDY_CASH_REGISTER,
        bookType: CashbookType.HANDY_CASH,
        displayName: 'Handy Cash Register',
        purposeDescription: 'Physical cash till, physical cash drawer count, shortages, and daily handover.',
        navigation: Object.freeze([
            { key: 'DASHBOARD', label: 'Till Status', iconName: 'Store' },
            { key: 'CLOSING', label: 'Count & Close', iconName: 'Calendar' },
            { key: 'LEDGER', label: 'Cash Log', iconName: 'BookOpen' },
            { key: 'ACCOUNTS', label: 'Cashboxes', iconName: 'Wallet' }
        ]),
        quickActions: Object.freeze([
            { actionId: 'RECEIVE_CASH', label: 'Receive Cash', variant: 'success', color: '#10B981' },
            { actionId: 'PAY_CASH', label: 'Pay Cash', variant: 'danger', color: '#F43F5E' },
            { actionId: 'COUNT_CASH', label: 'Count Cash', variant: 'primary', color: '#38BDF8' },
            { actionId: 'CLOSE_DAY', label: 'Close Day', variant: 'warning', color: '#A855F7' }
        ]),
        categoryGroups: Object.freeze([
            {
                name: 'Cash Receipts',
                categories: [
                    { key: 'cash_received', label: 'Cash Received' },
                    { key: 'cash_withdrawn_bank', label: 'Cash Withdrawn from Bank' },
                    { key: 'cash_handover_in', label: 'Cash Received from Staff' },
                    { key: 'cash_refund', label: 'Cash Refund Received' }
                ]
            },
            {
                name: 'Cash Payments',
                categories: [
                    { key: 'cash_paid', label: 'Cash Paid' },
                    { key: 'petty_cash', label: 'Petty Cash Expense' },
                    { key: 'household_cash', label: 'Household Cash Given' },
                    { key: 'travel_cash', label: 'Travel Cash' },
                    { key: 'cash_deposit_bank', label: 'Cash Deposited to Bank' },
                    { key: 'cash_handover_out', label: 'Cash Handed Over' },
                    { key: 'cash_adjustment', label: 'Cash Adjustment / Difference' }
                ]
            }
        ]),
        balancePolicy: Object.freeze({
            balanceMode: BalanceMode.PHYSICAL_CASH,
            positiveMeaning: 'CASH_IN_HAND',
            negativeMeaning: 'NEGATIVE_TILL_FORBIDDEN',
            allowedAccountTypes: [AccountType.CASH]
        }),
        closingPolicy: Object.freeze({
            enabled: true,
            mode: ClosingMode.PHYSICAL_TILL,
            requiresDenominations: true,
            requiresPeriodLock: true,
            allowsShortageExcess: true
        }),
        validationPolicy: Object.freeze({
            strictBalancedLines: true,
            allowOverdraft: false,
            requireCounterparty: false,
            enforceSplitTotal: false
        }),
        dashboardMetrics: Object.freeze(['openingCash', 'cashReceived', 'cashPaid', 'expectedClosing', 'countedCash', 'differenceBadge']),
        featureFlags: Object.freeze({
            supportsDenominations: true,
            supportsSplits: false,
            supportsProvenance: false,
            supportsReceivablesPayables: false
        }),
        integrations: Object.freeze({
            recurringConfirmations: false,
            moneyFlowTracking: true,
            budgetSync: true,
            netWorthTracking: true
        })
    }),

    [CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK]: Object.freeze({
        profileId: CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK,
        bookType: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS,
        displayName: 'Business Operations Cashbook',
        purposeDescription: 'Sales, purchases, customer receivables, supplier payables, and operating cash flow.',
        navigation: Object.freeze([
            { key: 'DASHBOARD', label: 'Operations', iconName: 'Briefcase' },
            { key: 'LEDGER', label: 'Journal', iconName: 'BookOpen' },
            { key: 'CLOSING', label: 'Day Closing', iconName: 'Calendar' },
            { key: 'ACCOUNTS', label: 'Accounts', iconName: 'Wallet' }
        ]),
        quickActions: Object.freeze([
            { actionId: 'RECORD_SALE', label: 'Record Sale', variant: 'success', color: '#10B981' },
            { actionId: 'RECORD_PURCHASE', label: 'Record Purchase', variant: 'danger', color: '#F43F5E' },
            { actionId: 'RECEIVE_PAYMENT', label: 'Customer Recv', variant: 'primary', color: '#38BDF8' },
            { actionId: 'PAY_SUPPLIER', label: 'Pay Supplier', variant: 'warning', color: '#F59E0B' }
        ]),
        categoryGroups: Object.freeze([
            {
                name: 'Sales & Revenue',
                categories: [
                    { key: 'cash_sale', label: 'Cash Sale' },
                    { key: 'credit_sale', label: 'Credit Sale (Customer Receivable)' },
                    { key: 'service_income', label: 'Service Income' },
                    { key: 'product_sale', label: 'Product Sale' },
                    { key: 'advance_received', label: 'Customer Advance Received' },
                    { key: 'discount_given', label: 'Discount Given' },
                    { key: 'sales_return', label: 'Sales Return' }
                ]
            },
            {
                name: 'Purchases & Direct Costs',
                categories: [
                    { key: 'stock_purchase', label: 'Stock / Goods Purchase' },
                    { key: 'raw_material', label: 'Raw Material' },
                    { key: 'credit_purchase', label: 'Credit Purchase (Supplier Payable)' },
                    { key: 'equipment_purchase', label: 'Equipment & Machinery' },
                    { key: 'packaging', label: 'Packaging Material' },
                    { key: 'freight_purchase', label: 'Transport / Freight Inward' },
                    { key: 'purchase_return', label: 'Purchase Return' }
                ]
            },
            {
                name: 'Operating Expenses',
                categories: [
                    { key: 'biz_rent', label: 'Office / Shop Rent' },
                    { key: 'biz_electricity', label: 'Commercial Electricity' },
                    { key: 'staff_salary', label: 'Employee Salary' },
                    { key: 'contractor_fee', label: 'Contractor / Vendor Payment' },
                    { key: 'biz_marketing', label: 'Marketing & Ads' },
                    { key: 'biz_transport', label: 'Local Logistics' },
                    { key: 'biz_professional', label: 'Legal & Accounting Fees' },
                    { key: 'biz_taxes', label: 'GST / Business Taxes' },
                    { key: 'biz_repairs', label: 'Store / Office Repairs' }
                ]
            },
            {
                name: 'Owner & Capital',
                categories: [
                    { key: 'owner_capital', label: 'Owner Capital Introduced' },
                    { key: 'owner_drawings', label: 'Owner Drawings / Withdrawal' },
                    { key: 'partner_capital', label: 'Partner Capital' },
                    { key: 'biz_loan_received', label: 'Business Loan Received' },
                    { key: 'biz_loan_repayment', label: 'Business Loan Repayment' }
                ]
            }
        ]),
        balancePolicy: Object.freeze({
            balanceMode: BalanceMode.BUSINESS_CASH_AND_OBLIGATIONS,
            positiveMeaning: 'NET_OPERATING_POSITION',
            negativeMeaning: 'NET_OPERATING_DEFICIT',
            allowedAccountTypes: [AccountType.BANK, AccountType.CASH]
        }),
        closingPolicy: Object.freeze({
            enabled: true,
            mode: ClosingMode.OPERATIONAL,
            requiresDenominations: false,
            requiresPeriodLock: true,
            allowsShortageExcess: true
        }),
        validationPolicy: Object.freeze({
            strictBalancedLines: true,
            allowOverdraft: false,
            requireCounterparty: true,
            enforceSplitTotal: false
        }),
        dashboardMetrics: Object.freeze(['availableCash', 'customerReceivables', 'supplierPayables', 'todaySales', 'todayPurchases', 'netOperatingMovement']),
        featureFlags: Object.freeze({
            supportsDenominations: true,
            supportsSplits: false,
            supportsProvenance: false,
            supportsReceivablesPayables: true
        }),
        integrations: Object.freeze({
            recurringConfirmations: false,
            moneyFlowTracking: true,
            budgetSync: false,
            netWorthTracking: true
        })
    }),

    [CashbookExperienceProfile.REGULAR_INCOME_BOOK]: Object.freeze({
        profileId: CashbookExperienceProfile.REGULAR_INCOME_BOOK,
        bookType: CashbookType.REGULAR_INCOME,
        displayName: 'Regular Income Register',
        purposeDescription: 'Track recurring salary, freelance, rental earnings, expectations vs receipts.',
        navigation: Object.freeze([
            { key: 'DASHBOARD', label: 'Income Radar', iconName: 'TrendingUp' },
            { key: 'LEDGER', label: 'Income Log', iconName: 'BookOpen' },
            { key: 'ACCOUNTS', label: 'Deposit Accounts', iconName: 'Wallet' }
        ]),
        quickActions: Object.freeze([
            { actionId: 'RECORD_INCOME', label: 'Record Income', variant: 'success', color: '#10B981' },
            { actionId: 'MARK_RECEIVED', label: 'Mark Received', variant: 'primary', color: '#38BDF8' }
        ]),
        categoryGroups: Object.freeze([
            {
                name: 'Income Sources',
                categories: [
                    { key: 'salary', label: 'Salary' },
                    { key: 'freelance', label: 'Freelance' },
                    { key: 'consulting', label: 'Consulting Retainer' },
                    { key: 'rental_income', label: 'Rental Income' },
                    { key: 'pension', label: 'Pension' },
                    { key: 'commission', label: 'Commission' },
                    { key: 'interest', label: 'Interest' },
                    { key: 'dividend', label: 'Dividend' },
                    { key: 'royalties', label: 'Royalties' },
                    { key: 'tuition', label: 'Tuition Income' },
                    { key: 'side_business', label: 'Side Business' }
                ]
            }
        ]),
        balancePolicy: Object.freeze({
            balanceMode: BalanceMode.AVAILABLE_CASH,
            positiveMeaning: 'TOTAL_INCOME_REALIZED',
            negativeMeaning: 'ZERO',
            allowedAccountTypes: [AccountType.BANK, AccountType.CASH]
        }),
        closingPolicy: Object.freeze({
            enabled: true,
            mode: ClosingMode.STATEMENT_PERIOD,
            requiresDenominations: false,
            requiresPeriodLock: false,
            allowsShortageExcess: false
        }),
        validationPolicy: Object.freeze({
            strictBalancedLines: true,
            allowOverdraft: false,
            requireCounterparty: true,
            enforceSplitTotal: false
        }),
        dashboardMetrics: Object.freeze(['expectedThisMonth', 'receivedThisMonth', 'pendingIncome', 'lastReceived']),
        featureFlags: Object.freeze({
            supportsDenominations: false,
            supportsSplits: false,
            supportsProvenance: false,
            supportsReceivablesPayables: false
        }),
        integrations: Object.freeze({
            recurringConfirmations: true,
            moneyFlowTracking: true,
            budgetSync: true,
            netWorthTracking: true
        })
    }),

    [CashbookExperienceProfile.LOANS_TAKEN_REGISTER]: Object.freeze({
        profileId: CashbookExperienceProfile.LOANS_TAKEN_REGISTER,
        bookType: CashbookType.LOANS_TAKEN,
        displayName: 'Loans & Liabilities Register',
        purposeDescription: 'Borrowing facility liability, principal reduction, and finance expense tracking. EMI payments reduce the loan principal liability by the principal component, while the interest component is recognized separately as finance expense.',
        navigation: Object.freeze([
            { key: 'DASHBOARD', label: 'Liability', iconName: 'ArrowDownRight' },
            { key: 'LEDGER', label: 'Amortization Log', iconName: 'BookOpen' },
            { key: 'ACCOUNTS', label: 'Payment Accounts', iconName: 'Wallet' }
        ]),
        quickActions: Object.freeze([
            { actionId: 'RECORD_EMI', label: 'Pay EMI', variant: 'danger', color: '#F43F5E' },
            { actionId: 'PREPAY_LOAN', label: 'Prepayment', variant: 'primary', color: '#38BDF8' }
        ]),
        categoryGroups: Object.freeze([
            {
                name: 'Loan Operations',
                categories: [
                    { key: 'loan_disbursed', label: 'Loan Principal Disbursed' },
                    { key: 'emi_payment', label: 'Monthly EMI Payment' },
                    { key: 'principal_prepayment', label: 'Principal Part-Prepayment' },
                    { key: 'foreclosure', label: 'Full Foreclosure' },
                    { key: 'loan_fees', label: 'Processing & Administrative Fees' }
                ]
            }
        ]),
        balancePolicy: Object.freeze({
            balanceMode: BalanceMode.LOAN_LIABILITY,
            positiveMeaning: 'PRINCIPAL_DEBT_OWED',
            negativeMeaning: 'OVERPAYMENT_ASSET',
            allowedAccountTypes: [AccountType.LOAN, AccountType.BANK]
        }),
        closingPolicy: Object.freeze({
            enabled: true,
            mode: ClosingMode.STATEMENT_PERIOD,
            requiresDenominations: false,
            requiresPeriodLock: false,
            allowsShortageExcess: false
        }),
        validationPolicy: Object.freeze({
            strictBalancedLines: true,
            allowOverdraft: false,
            requireCounterparty: true,
            enforceSplitTotal: true
        }),
        dashboardMetrics: Object.freeze(['outstandingPrincipal', 'upcomingEMI', 'principalPaidMonth', 'interestPaidMonth', 'nextDueDate']),
        featureFlags: Object.freeze({
            supportsDenominations: false,
            supportsSplits: true,
            supportsProvenance: false,
            supportsReceivablesPayables: false
        }),
        integrations: Object.freeze({
            recurringConfirmations: true,
            moneyFlowTracking: true,
            budgetSync: true,
            netWorthTracking: true
        })
    }),

    [CashbookExperienceProfile.LOANS_GIVEN_REGISTER]: Object.freeze({
        profileId: CashbookExperienceProfile.LOANS_GIVEN_REGISTER,
        bookType: CashbookType.LOANS_GIVEN,
        displayName: 'Loans Given (Receivables)',
        purposeDescription: 'Money lent to family, friends, borrowers, repayments received, and outstanding debts. Disbursing loan increases loan receivable, while repayment reduces loan receivable and recognizes interest income.',
        navigation: Object.freeze([
            { key: 'DASHBOARD', label: 'Receivables', iconName: 'ArrowUpRight' },
            { key: 'LEDGER', label: 'Repayments Log', iconName: 'BookOpen' },
            { key: 'ACCOUNTS', label: 'Accounts', iconName: 'Wallet' }
        ]),
        quickActions: Object.freeze([
            { actionId: 'GIVE_LOAN', label: 'Disburse Loan', variant: 'danger', color: '#F43F5E' },
            { actionId: 'RECORD_REPAYMENT', label: 'Collect Repayment', variant: 'success', color: '#10B981' }
        ]),
        categoryGroups: Object.freeze([
            {
                name: 'Lending Operations',
                categories: [
                    { key: 'loan_disbursement', label: 'Principal Disbursed to Borrower' },
                    { key: 'repayment_received', label: 'Principal Repayment Collected' },
                    { key: 'interest_received', label: 'Interest Received' },
                    { key: 'bad_debt_writeoff', label: 'Bad Debt Write-off' }
                ]
            }
        ]),
        balancePolicy: Object.freeze({
            balanceMode: BalanceMode.LOAN_RECEIVABLE,
            positiveMeaning: 'PRINCIPAL_RECEIVABLE_OWED_TO_ME',
            negativeMeaning: 'OVERCOLLECTED_LIABILITY',
            allowedAccountTypes: [AccountType.BANK, AccountType.CASH]
        }),
        closingPolicy: Object.freeze({
            enabled: true,
            mode: ClosingMode.STATEMENT_PERIOD,
            requiresDenominations: false,
            requiresPeriodLock: false,
            allowsShortageExcess: false
        }),
        validationPolicy: Object.freeze({
            strictBalancedLines: true,
            allowOverdraft: false,
            requireCounterparty: true,
            enforceSplitTotal: false
        }),
        dashboardMetrics: Object.freeze(['totalPrincipalOutstanding', 'expectedThisMonth', 'receivedThisMonth', 'overdueAmount']),
        featureFlags: Object.freeze({
            supportsDenominations: false,
            supportsSplits: false,
            supportsProvenance: false,
            supportsReceivablesPayables: true
        }),
        integrations: Object.freeze({
            recurringConfirmations: true,
            moneyFlowTracking: true,
            budgetSync: false,
            netWorthTracking: true
        })
    }),

    [CashbookExperienceProfile.PROVIDENT_FUND_REGISTER]: Object.freeze({
        profileId: CashbookExperienceProfile.PROVIDENT_FUND_REGISTER,
        bookType: CashbookType.PF,
        pfAccountingPerspective: PFAccountingPerspective.EMPLOYEE_PERSONAL_VIEW,
        displayName: 'Provident Fund (PF) Portfolio',
        purposeDescription: 'EPFO UAN retirement contributions, employee share, employer share, and annual interest. Tax-relevant employee and employer contribution provenance is preserved to support reporting and statutory review. Available for ordinary daily spending: ₹0 by default. PF value is classified as restricted retirement wealth and is not included in personal available cash.',
        navigation: Object.freeze([
            { key: 'DASHBOARD', label: 'PF Portfolio', iconName: 'Shield' },
            { key: 'LEDGER', label: 'Contributions', iconName: 'BookOpen' },
            { key: 'ACCOUNTS', label: 'Accounts', iconName: 'Wallet' }
        ]),
        quickActions: Object.freeze([
            { actionId: 'ADD_CONTRIBUTION', label: 'Add Contribution', variant: 'success', color: '#10B981' },
            { actionId: 'ADD_INTEREST', label: 'Credit Interest', variant: 'primary', color: '#38BDF8' }
        ]),
        categoryGroups: Object.freeze([
            {
                name: 'PF Contributions & Credits',
                categories: [
                    { key: 'epf_contribution', label: 'EPF Monthly Contribution' },
                    { key: 'vpf_contribution', label: 'Voluntary PF (VPF) Contribution' },
                    { key: 'epfo_interest', label: 'EPFO Annual Interest Credited' },
                    { key: 'pf_transfer_in', label: 'Previous Company PF Transfer In' },
                    { key: 'pf_partial_withdrawal', label: 'Partial Advance / Housing Withdrawal' }
                ]
            }
        ]),
        balancePolicy: Object.freeze({
            balanceMode: BalanceMode.RESTRICTED_ASSET,
            positiveMeaning: 'RESTRICTED_RETIREMENT_WEALTH',
            negativeMeaning: 'FORBIDDEN',
            allowedAccountTypes: [AccountType.INVESTMENT, AccountType.BANK]
        }),
        closingPolicy: Object.freeze({
            enabled: true,
            mode: ClosingMode.STATEMENT_PERIOD,
            requiresDenominations: false,
            requiresPeriodLock: false,
            allowsShortageExcess: false
        }),
        validationPolicy: Object.freeze({
            strictBalancedLines: true,
            allowOverdraft: false,
            requireCounterparty: false,
            enforceSplitTotal: true
        }),
        dashboardMetrics: Object.freeze(['totalPFValue', 'availablePersonalCash', 'restrictedBalance', 'employeeShare', 'employerShare', 'accumulatedInterest']),
        featureFlags: Object.freeze({
            supportsDenominations: false,
            supportsSplits: false,
            supportsProvenance: true,
            supportsReceivablesPayables: false
        }),
        integrations: Object.freeze({
            recurringConfirmations: false,
            moneyFlowTracking: true,
            budgetSync: false,
            netWorthTracking: true
        })
    }),

    [CashbookExperienceProfile.INVESTMENT_REGISTER]: Object.freeze({
        profileId: CashbookExperienceProfile.INVESTMENT_REGISTER,
        bookType: CashbookType.INVESTMENTS,
        displayName: 'Investments & Portfolio',
        purposeDescription: 'Mutual funds, equities, contributions, dividends, and portfolio market valuation. Invariant: Invested Cost != Current Market Value. Unrealized valuation adjustments are non-cash movements and do not enter cash balances.',
        navigation: Object.freeze([
            { key: 'DASHBOARD', label: 'Portfolio', iconName: 'TrendingUp' },
            { key: 'LEDGER', label: 'Transactions', iconName: 'BookOpen' },
            { key: 'ACCOUNTS', label: 'Demat & Bank', iconName: 'Wallet' }
        ]),
        quickActions: Object.freeze([
            { actionId: 'INVEST_CASH', label: 'Invest Cash', variant: 'success', color: '#10B981' },
            { actionId: 'WITHDRAW_CASH', label: 'Withdraw', variant: 'danger', color: '#F43F5E' },
            { actionId: 'RECORD_DIVIDEND', label: 'Record Dividend', variant: 'primary', color: '#38BDF8' },
            { actionId: 'UPDATE_VALUATION', label: 'Update Valuation', variant: 'warning', color: '#EAB308' }
        ]),
        categoryGroups: Object.freeze([
            {
                name: 'Investment Movements',
                categories: [
                    { key: 'mutual_fund_sip', label: 'Mutual Fund SIP Purchase' },
                    { key: 'equity_buy', label: 'Equity Buy' },
                    { key: 'equity_sell', label: 'Equity Sell' },
                    { key: 'dividend_received', label: 'Dividend Credit' },
                    { key: 'portfolio_gain_loss', label: 'Market Valuation Adjustment' }
                ]
            }
        ]),
        balancePolicy: Object.freeze({
            balanceMode: BalanceMode.PORTFOLIO_VALUATION,
            positiveMeaning: 'MARKET_PORTFOLIO_VALUATION',
            negativeMeaning: 'FORBIDDEN',
            allowedAccountTypes: [AccountType.INVESTMENT, AccountType.BANK]
        }),
        closingPolicy: Object.freeze({
            enabled: true,
            mode: ClosingMode.VALUATION_DATE,
            requiresDenominations: false,
            requiresPeriodLock: false,
            allowsShortageExcess: false
        }),
        validationPolicy: Object.freeze({
            strictBalancedLines: true,
            allowOverdraft: false,
            requireCounterparty: false,
            enforceSplitTotal: false
        }),
        dashboardMetrics: Object.freeze(['totalInvestedCost', 'currentMarketValue', 'unrealizedGainLoss', 'totalDividendsReceived', 'realizedGains', 'availablePersonalCash']),
        featureFlags: Object.freeze({
            supportsDenominations: false,
            supportsSplits: false,
            supportsProvenance: false,
            supportsReceivablesPayables: false
        }),
        integrations: Object.freeze({
            recurringConfirmations: true,
            moneyFlowTracking: true,
            budgetSync: false,
            netWorthTracking: true
        })
    })
});

/**
 * Pure experience resolver.
 * Maps any Cashbook or CashbookType to its complete, frozen CashbookExperienceProfile.
 * Rejects unsupported or incomplete configurations.
 */
export function resolveCashbookExperience(bookOrType) {
    if (!bookOrType) {
        return CashbookExperienceConfigMap[CashbookExperienceProfile.PERSONAL_FINANCE_BOOK];
    }
    const type = typeof bookOrType === 'string' ? bookOrType : bookOrType.type;

    switch (type) {
        case CashbookType.HANDY_CASH:
            return CashbookExperienceConfigMap[CashbookExperienceProfile.HANDY_CASH_REGISTER];
        case CashbookType.BUSINESS_CASH_AND_OBLIGATIONS:
            return CashbookExperienceConfigMap[CashbookExperienceProfile.BUSINESS_OPERATIONS_CASHBOOK];
        case CashbookType.REGULAR_INCOME:
            return CashbookExperienceConfigMap[CashbookExperienceProfile.REGULAR_INCOME_BOOK];
        case CashbookType.LOANS_TAKEN:
            return CashbookExperienceConfigMap[CashbookExperienceProfile.LOANS_TAKEN_REGISTER];
        case CashbookType.LOANS_GIVEN:
            return CashbookExperienceConfigMap[CashbookExperienceProfile.LOANS_GIVEN_REGISTER];
        case CashbookType.PF:
            return CashbookExperienceConfigMap[CashbookExperienceProfile.PROVIDENT_FUND_REGISTER];
        case CashbookType.INVESTMENTS:
            return CashbookExperienceConfigMap[CashbookExperienceProfile.INVESTMENT_REGISTER];
        case CashbookType.SAVINGS:
        default:
            return CashbookExperienceConfigMap[CashbookExperienceProfile.PERSONAL_FINANCE_BOOK];
    }
}

/**
 * Creates a formal balanced LedgerTransaction entity.
 * Guarantees Total Debits = Total Credits across lines[].
 */
export function createLedgerTransaction({
    transactionId,
    bookId,
    transactionType,
    transactionDate,
    description = '',
    reference = null,
    source = TransactionSource.MANUAL,
    idempotencyKey = null,
    transferGroupId = null,
    amount = null,
    category = null,
    subcategory = null,
    sourceAccountId = null,
    destinationAccountId = null,
    lines = [],
    metadata = {},
    status = TransactionStatus.POSTED,
    createdAt = null,
    updatedAt = null
}) {
    if (!transactionId || typeof transactionId !== 'string') throw new Error('transactionId is required');
    if (!bookId || typeof bookId !== 'string') throw new Error('bookId is required');
    if (!transactionType) throw new Error('transactionType is required');
    if (!transactionDate) throw new Error('transactionDate is required');

    let totalDebitPaise = 0n;
    let totalCreditPaise = 0n;

    // Enforce balanced lines if lines are present
    if (lines && lines.length > 0) {
        for (const line of lines) {
            const deb = BigInt(line.debitPaise || '0');
            const cred = BigInt(line.creditPaise || '0');
            totalDebitPaise += deb;
            totalCreditPaise += cred;
        }

        if (totalDebitPaise !== totalCreditPaise) {
            throw new Error(`UNBALANCED_LEDGER_TRANSACTION: Total Debits (₹${(Number(totalDebitPaise)/100).toFixed(2)}) must equal Total Credits (₹${(Number(totalCreditPaise)/100).toFixed(2)})`);
        }
    }

    const resolvedAmount = amount
        ? (typeof amount === 'object' && amount.paise ? amount : createMoneyPaise(amount))
        : (totalDebitPaise > 0n ? createMoneyPaise(totalDebitPaise) : createMoneyPaise('0'));

    const now = new Date().toISOString();
    return {
        id: transactionId.trim(),
        bookId: bookId.trim(),
        transactionType,
        date: transactionDate,
        description: description ? description.trim() : '',
        reference: reference ? reference.trim() : null,
        source,
        idempotencyKey,
        transferGroupId,
        amount: resolvedAmount,
        category: category ? category.trim() : null,
        subcategory: subcategory ? subcategory.trim() : null,
        sourceAccountId: sourceAccountId ? sourceAccountId.trim() : null,
        destinationAccountId: destinationAccountId ? destinationAccountId.trim() : null,
        lines: [...lines],
        metadata: { ...metadata },
        status,
        createdAt: createdAt || now,
        updatedAt: updatedAt || now
    };
}

/**
 * Authoritative migration transformation classifications.
 */
export const MigrationTransformationType = Object.freeze({
    DIRECT_IMPORT: 'DIRECT_IMPORT',
    LOAN_EMI_SPLIT: 'LOAN_EMI_SPLIT',
    UNAMORTIZED_LOAN_PAYMENT: 'UNAMORTIZED_LOAN_PAYMENT',
    PF_SOURCE_SPLIT: 'PF_SOURCE_SPLIT',
    BUSINESS_EXPENSE_CLASSIFICATION: 'BUSINESS_EXPENSE_CLASSIFICATION',
    OPENING_BALANCE_NORMALIZED: 'OPENING_BALANCE_NORMALIZED'
});

/**
 * Migration confidence levels.
 */
export const MigrationConfidence = Object.freeze({
    EXACT: 'EXACT',
    DERIVED: 'DERIVED',
    PARTIAL: 'PARTIAL'
});

/**
 * Creates canonical provenance metadata for a migrated/transformed record.
 */
export function createLegacyProvenance({
    legacyRecordId,
    legacySource,
    transformationType = MigrationTransformationType.DIRECT_IMPORT,
    sourceHash,
    derivedTransactionIds = [],
    confidence = MigrationConfidence.EXACT,
    metadata = {}
}) {
    if (!legacyRecordId) throw new Error('legacyRecordId is required for provenance');
    if (!legacySource) throw new Error('legacySource is required for provenance');
    if (!sourceHash) throw new Error('sourceHash is required for provenance');

    return {
        legacyRecordId: String(legacyRecordId).trim(),
        legacySource: String(legacySource).trim(),
        migrationVersion: 3,
        transformationType,
        sourceHash: String(sourceHash).trim(),
        derivedTransactionIds: [...derivedTransactionIds],
        confidence,
        migratedAt: new Date().toISOString(),
        metadata: { ...metadata }
    };
}

/**
 * Creates a machine-readable migration manifest.
 */
export function createMigrationManifest({
    migrationId,
    sourceSchema,
    targetSchema = 'V3',
    sourceSnapshotHash,
    sourceRecordCount = 0,
    migratedRecordCount = 0,
    quarantinedRecordCount = 0,
    reusedRecordCount = 0,
    conflictCount = 0,
    generatedBookIds = [],
    legacyChainHead = null,
    migrationEventId = null,
    targetEnvelopeHash = null,
    migrationVersion = 3,
    completedAt = new Date().toISOString()
}) {
    if (!migrationId) throw new Error('migrationId is required');
    if (!sourceSchema) throw new Error('sourceSchema is required');
    if (!sourceSnapshotHash) throw new Error('sourceSnapshotHash is required');

    return {
        migrationId: String(migrationId).trim(),
        sourceSchema: String(sourceSchema).trim(),
        targetSchema,
        sourceSnapshotHash: String(sourceSnapshotHash).trim(),
        sourceRecordCount: Number(sourceRecordCount),
        migratedRecordCount: Number(migratedRecordCount),
        quarantinedRecordCount: Number(quarantinedRecordCount),
        reusedRecordCount: Number(reusedRecordCount),
        conflictCount: Number(conflictCount),
        generatedBookIds: [...generatedBookIds],
        legacyChainHead,
        migrationEventId,
        targetEnvelopeHash,
        migrationVersion,
        completedAt
    };
}

/**
 * Gate 7 Backup Format Identifiers.
 */
export const BackupFormat = Object.freeze({
    V1: 'FINLIFE_CASHBOOK_BACKUP_V1',
    V2: 'FINLIFE_CASHBOOK_BACKUP_V2',
    ENCRYPTED_V1: 'FINLIFE_CASHBOOK_ENCRYPTED_BACKUP_V1'
});

/**
 * Gate 7 Backup Restoration Status.
 */
export const BackupStatus = Object.freeze({
    VALID: 'VALID',
    UPGRADED_FROM_V1: 'UPGRADED_FROM_V1',
    PARTIALLY_RESTORED: 'PARTIALLY_RESTORED',
    QUARANTINED: 'QUARANTINED',
    RESTORE_REJECTED: 'RESTORE_REJECTED',
    RESTORE_IDEMPOTENT: 'RESTORE_IDEMPOTENT',
    RESTORE_CONFLICT: 'RESTORE_CONFLICT'
});

/**
 * Creates an authoritative Gate 7 backup manifest.
 */
export function createBackupManifest({
    backupId,
    format = BackupFormat.V2,
    schemaVersion = 2,
    mode,
    createdAt = new Date().toISOString(),
    sourceEnvelopeHash = null,
    payloadHash = null,
    recordCounts = { books: 0, accounts: 0, transactions: 0, dailyClosings: 0, auditEvents: 0, migrationManifests: 0 },
    bookIds = [],
    auditChainHead = null,
    migrationManifestIds = [],
    encryptionMetadata = null
}) {
    if (!backupId) throw new Error('backupId is required');
    if (!mode) throw new Error('mode is required');

    return {
        backupId: String(backupId).trim(),
        format,
        schemaVersion: Number(schemaVersion),
        mode,
        createdAt,
        sourceEnvelopeHash: sourceEnvelopeHash ? String(sourceEnvelopeHash).trim() : null,
        payloadHash: payloadHash ? String(payloadHash).trim() : null,
        recordCounts: { ...recordCounts },
        bookIds: [...bookIds],
        auditChainHead: auditChainHead ? String(auditChainHead).trim() : null,
        migrationManifestIds: [...migrationManifestIds],
        encryptionMetadata: encryptionMetadata ? { ...encryptionMetadata } : null
    };
}

