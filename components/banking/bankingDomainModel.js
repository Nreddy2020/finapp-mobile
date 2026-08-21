/**
 * FinLife Banking Relationship Intelligence — Domain Model & Primitives
 * 
 * Implements strict integer-paise monetary primitives, entity factories,
 * double-entry journal schemas, and isolated demo fixtures.
 */

// ── MONETARY PRIMITIVES & VALIDATION ─────────────────────────────────────────

export const MONEY_VALIDITY = {
    VALID_POSITIVE: 'VALID_POSITIVE',
    VALID_ZERO: 'VALID_ZERO',
    INVALID: 'INVALID'
};

/**
 * Validates a monetary input string or number.
 * Accepts >= 0 finite numbers. Distinguishes zero vs positive vs invalid.
 */
export function validateMonetaryInput(val, allowNegative = false) {
    if (val === null || val === undefined || val === '') {
        return { validity: MONEY_VALIDITY.INVALID, error: 'Monetary value is required.' };
    }
    const num = Number(val);
    if (!Number.isFinite(num)) {
        return { validity: MONEY_VALIDITY.INVALID, error: 'Monetary value must be a finite number.' };
    }
    if (isNaN(num)) {
        return { validity: MONEY_VALIDITY.INVALID, error: 'Monetary value is NaN.' };
    }
    if (!allowNegative && num < 0) {
        return { validity: MONEY_VALIDITY.INVALID, error: 'Monetary value cannot be negative.' };
    }
    if (num === 0) {
        return { validity: MONEY_VALIDITY.VALID_ZERO, value: 0 };
    }
    return { validity: MONEY_VALIDITY.VALID_POSITIVE, value: num };
}

/**
 * Converts INR (e.g. 2500000.50) to integer paise (250000050).
 * Throws explicit error on invalid input to prevent silent financial corruption.
 */
export function toPaise(inr, allowNegative = false) {
    const check = validateMonetaryInput(inr, allowNegative);
    if (check.validity === MONEY_VALIDITY.INVALID) {
        throw new Error(`[Banking Domain] Cannot convert invalid monetary input '${inr}' to paise: ${check.error}`);
    }
    return Math.round(check.value * 100);
}

/**
 * Converts integer paise (250000050) back to floating INR (2500000.50).
 */
export function fromPaise(paise) {
    if (paise === null || paise === undefined) return 0;
    const num = Number(paise);
    if (!Number.isFinite(num)) return 0;
    return Number((num / 100).toFixed(2));
}

// ── ENUMS & CONSTANTS ────────────────────────────────────────────────────────

export const BANK_TYPE = {
    PUBLIC_SECTOR: 'PUBLIC_SECTOR',
    PRIVATE: 'PRIVATE',
    FOREIGN: 'FOREIGN',
    COOPERATIVE: 'COOPERATIVE',
    SMALL_FINANCE: 'SMALL_FINANCE',
    OTHER: 'OTHER'
};

export const BANK_RELATIONSHIP_STATUS = {
    ACTIVE: 'ACTIVE',
    DORMANT: 'DORMANT',
    CLOSED: 'CLOSED'
};

export const BANK_ACCOUNT_TYPE = {
    SAVINGS: 'SAVINGS',
    CURRENT: 'CURRENT',
    SALARY: 'SALARY',
    NRE: 'NRE',
    NRO: 'NRO',
    FD: 'FD',
    RD: 'RD',
    OTHER: 'OTHER'
};

export const BANK_ACCOUNT_STATUS = {
    ACTIVE: 'ACTIVE',
    DORMANT: 'DORMANT',
    CLOSED: 'CLOSED'
};

export const BANK_LOAN_TYPE = {
    HOME: 'HOME',
    PERSONAL: 'PERSONAL',
    CAR: 'CAR',
    EDUCATION: 'EDUCATION',
    GOLD: 'GOLD',
    LAP: 'LAP',
    BUSINESS: 'BUSINESS',
    CREDIT_LINE: 'CREDIT_LINE',
    OTHER: 'OTHER'
};

export const BANK_LOAN_STATUS = {
    ACTIVE: 'ACTIVE',
    CLOSED: 'CLOSED',
    FORECLOSED: 'FORECLOSED',
    WRITTEN_OFF: 'WRITTEN_OFF'
};

export const INTEREST_METHOD = {
    AMORTIZED: 'AMORTIZED',   // Standard EMI amortized with declining balance
    SIMPLE: 'SIMPLE',         // Declining-balance simple interest
    NO_INTEREST: 'NO_INTEREST'
};

export const REPAYMENT_FREQUENCY = {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    BULLET: 'BULLET'
};

export const INSTALLMENT_STATUS = {
    PENDING: 'PENDING',
    DUE: 'DUE',
    OVERDUE: 'OVERDUE',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    PREPAID: 'PREPAID',
    SKIPPED: 'SKIPPED',
    CLOSED_BY_SETTLEMENT: 'CLOSED_BY_SETTLEMENT'
};

export const BANK_PAYMENT_ALLOCATION = {
    FEES_FIRST: 'FEES_FIRST',
    PENALTY_FIRST: 'PENALTY_FIRST',
    INTEREST_FIRST: 'INTEREST_FIRST',
    PRINCIPAL_FIRST: 'PRINCIPAL_FIRST',
    BANK_DEFINED: 'BANK_DEFINED'
};

export const BANKING_JOURNAL_EVENT_TYPES = {
    BANK_ACCOUNT_OPENED: 'BANK_ACCOUNT_OPENED',
    BANK_ACCOUNT_ADJUSTMENT: 'BANK_ACCOUNT_ADJUSTMENT',
    BANK_LOAN_DISBURSED: 'BANK_LOAN_DISBURSED',
    BANK_EMI_PAID: 'BANK_EMI_PAID',
    BANK_PRINCIPAL_PREPAID: 'BANK_PRINCIPAL_PREPAID',
    BANK_LOAN_FORECLOSED: 'BANK_LOAN_FORECLOSED',
    BANK_FEE_CHARGED: 'BANK_FEE_CHARGED',
    BANK_PENALTY_CHARGED: 'BANK_PENALTY_CHARGED',
    BANK_INTEREST_EARNED: 'BANK_INTEREST_EARNED',
    BANK_RATE_REVISED: 'BANK_RATE_REVISED',
    BANK_REVERSAL: 'BANK_REVERSAL'
};

export const BANKING_DOCUMENT_TYPE = {
    SANCTION_LETTER: 'SANCTION_LETTER',
    LOAN_AGREEMENT: 'LOAN_AGREEMENT',
    REPAYMENT_SCHEDULE: 'REPAYMENT_SCHEDULE',
    INTEREST_CERTIFICATE: 'INTEREST_CERTIFICATE',
    STATEMENT: 'STATEMENT',
    INSURANCE: 'INSURANCE',
    NOC: 'NOC',
    CLOSURE_LETTER: 'CLOSURE_LETTER',
    OTHER: 'OTHER'
};

// ── FACTORY FUNCTIONS (DEFINITION ENTITIES) ──────────────────────────────────

/**
 * Creates a Bank Relationship definition entity
 */
export function createBank({
    id = null,
    name = '',
    shortName = '',
    logo = null,
    type = BANK_TYPE.PRIVATE,
    relationshipStatus = BANK_RELATIONSHIP_STATUS.ACTIVE,
    primaryContact = '',
    notes = '',
    tags = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
} = {}) {
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('[Banking Domain] Bank name is required and cannot be empty.');
    }
    const cleanName = name.trim();
    const finalId = id || `bank_${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Date.now().toString(36)}`;
    const finalShortName = shortName ? shortName.trim() : cleanName.split(' ')[0];

    return {
        id: finalId,
        name: cleanName,
        shortName: finalShortName,
        logo: logo || null,
        type: BANK_TYPE[type] || BANK_TYPE.PRIVATE,
        relationshipStatus: BANK_RELATIONSHIP_STATUS[relationshipStatus] || BANK_RELATIONSHIP_STATUS.ACTIVE,
        primaryContact: primaryContact ? String(primaryContact).trim() : '',
        notes: notes || '',
        tags: Array.isArray(tags) ? tags : [],
        createdAt,
        updatedAt
    };
}

/**
 * Creates a Bank Account definition entity
 */
export function createBankAccount({
    id = null,
    bankId = '',
    accountType = BANK_ACCOUNT_TYPE.SAVINGS,
    accountName = '',
    maskedAccountNumber = '',
    currency = 'INR',
    openingBalancePaise = 0,
    openingBalance = null, // Convenience INR input
    interestRate = 0,
    status = BANK_ACCOUNT_STATUS.ACTIVE,
    isPrimary = false,
    tags = [],
    notes = '',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
} = {}) {
    if (!bankId || typeof bankId !== 'string' || !bankId.trim()) {
        throw new Error('[Banking Domain] Valid bankId is required for BankAccount.');
    }
    if (!accountName || typeof accountName !== 'string' || !accountName.trim()) {
        throw new Error('[Banking Domain] Account name is required.');
    }

    const finalPaise = openingBalance !== null ? toPaise(openingBalance) : Math.round(Number(openingBalancePaise) || 0);
    const finalId = id || `bacc_${bankId}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    return {
        id: finalId,
        bankId: bankId.trim(),
        accountType: BANK_ACCOUNT_TYPE[accountType] || BANK_ACCOUNT_TYPE.SAVINGS,
        accountName: accountName.trim(),
        maskedAccountNumber: maskedAccountNumber ? String(maskedAccountNumber).trim() : '•••• 0000',
        currency: currency || 'INR',
        openingBalancePaise: finalPaise,
        interestRate: Number(interestRate) || 0,
        status: BANK_ACCOUNT_STATUS[status] || BANK_ACCOUNT_STATUS.ACTIVE,
        isPrimary: Boolean(isPrimary),
        tags: Array.isArray(tags) ? tags : [],
        notes: notes || '',
        createdAt,
        updatedAt
    };
}

/**
 * Creates a Bank Loan definition entity
 */
export function createBankLoan({
    id = null,
    bankId = '',
    loanType = BANK_LOAN_TYPE.PERSONAL,
    loanName = '',
    loanNumberMasked = '',
    originalPrincipalPaise = 0,
    originalPrincipal = null, // Convenience INR input
    principal = null,         // Convenience alias
    interestRate = 0,
    interestMethod = INTEREST_METHOD.AMORTIZED,
    tenureMonths = 12,
    startDate = new Date().toISOString().split('T')[0],
    maturityDate = null,
    paymentFrequency = REPAYMENT_FREQUENCY.MONTHLY,
    repaymentAccountId = '',
    prepaymentPenaltyPct = 0,
    status = BANK_LOAN_STATUS.ACTIVE,
    rateRevisions = [],
    tags = [],
    notes = '',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
} = {}) {
    if (!bankId || typeof bankId !== 'string' || !bankId.trim()) {
        throw new Error('[Banking Domain] Valid bankId is required for BankLoan.');
    }
    if (!loanName || typeof loanName !== 'string' || !loanName.trim()) {
        throw new Error('[Banking Domain] Loan name is required.');
    }

    const principalInput = originalPrincipal !== null ? originalPrincipal : (principal !== null ? principal : null);
    const finalPrincipalPaise = principalInput !== null ? toPaise(principalInput) : Math.round(Number(originalPrincipalPaise) || 0);

    if (finalPrincipalPaise <= 0) {
        throw new Error('[Banking Domain] Loan original principal must be strictly positive.');
    }

    const finalTenure = Math.max(1, parseInt(tenureMonths, 10) || 12);
    const finalId = id || `bloan_${bankId}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

    return {
        id: finalId,
        bankId: bankId.trim(),
        loanType: BANK_LOAN_TYPE[loanType] || BANK_LOAN_TYPE.PERSONAL,
        loanName: loanName.trim(),
        loanNumberMasked: loanNumberMasked ? String(loanNumberMasked).trim() : '•••• 0000',
        originalPrincipalPaise: finalPrincipalPaise,
        interestRate: Number(interestRate) || 0,
        interestMethod: INTEREST_METHOD[interestMethod] || INTEREST_METHOD.AMORTIZED,
        tenureMonths: finalTenure,
        startDate: startDate || new Date().toISOString().split('T')[0],
        maturityDate: maturityDate || null,
        paymentFrequency: REPAYMENT_FREQUENCY[paymentFrequency] || REPAYMENT_FREQUENCY.MONTHLY,
        repaymentAccountId: repaymentAccountId ? String(repaymentAccountId).trim() : '',
        prepaymentPenaltyPct: Number(prepaymentPenaltyPct) || 0,
        status: BANK_LOAN_STATUS[status] || BANK_LOAN_STATUS.ACTIVE,
        rateRevisions: Array.isArray(rateRevisions) ? rateRevisions : [],
        tags: Array.isArray(tags) ? tags : [],
        notes: notes || '',
        createdAt,
        updatedAt
    };
}

/**
 * Creates a Loan Installment Schedule Item
 */
export function createLoanInstallment({
    id = null,
    loanId = '',
    installmentNumber = 1,
    periodStart = '',
    periodEnd = '',
    dueDate = '',
    openingPrincipalPaise = 0,
    expectedPrincipalPaise = 0,
    expectedInterestPaise = 0,
    expectedFeesPaise = 0,
    expectedPenaltyPaise = 0,
    expectedTotalPaise = 0,
    paidPrincipalPaise = 0,
    paidInterestPaise = 0,
    paidFeesPaise = 0,
    paidPenaltyPaise = 0,
    paidTotalPaise = 0,
    closingPrincipalPaise = 0,
    status = INSTALLMENT_STATUS.PENDING,
    paidDate = null,
    appliedRate = null
} = {}) {
    if (!loanId) throw new Error('[Banking Domain] loanId is required for LoanInstallment.');

    const expP = Math.round(Number(expectedPrincipalPaise) || 0);
    const expI = Math.round(Number(expectedInterestPaise) || 0);
    const expF = Math.round(Number(expectedFeesPaise) || 0);
    const expPen = Math.round(Number(expectedPenaltyPaise) || 0);
    const expTot = expectedTotalPaise ? Math.round(Number(expectedTotalPaise)) : (expP + expI + expF + expPen);

    const paidP = Math.round(Number(paidPrincipalPaise) || 0);
    const paidI = Math.round(Number(paidInterestPaise) || 0);
    const paidF = Math.round(Number(paidFeesPaise) || 0);
    const paidPen = Math.round(Number(paidPenaltyPaise) || 0);
    const paidTot = paidTotalPaise ? Math.round(Number(paidTotalPaise)) : (paidP + paidI + paidF + paidPen);

    const finalId = id || `inst_${loanId}_${installmentNumber}_${Date.now().toString(36)}`;

    return {
        id: finalId,
        loanId,
        installmentNumber: parseInt(installmentNumber, 10) || 1,
        periodStart,
        periodEnd,
        dueDate,
        openingPrincipalPaise: Math.round(Number(openingPrincipalPaise) || 0),
        expectedPrincipalPaise: expP,
        expectedInterestPaise: expI,
        expectedFeesPaise: expF,
        expectedPenaltyPaise: expPen,
        expectedTotalPaise: expTot,
        paidPrincipalPaise: paidP,
        paidInterestPaise: paidI,
        paidFeesPaise: paidF,
        paidPenaltyPaise: paidPen,
        paidTotalPaise: paidTot,
        closingPrincipalPaise: Math.round(Number(closingPrincipalPaise) || 0),
        status: INSTALLMENT_STATUS[status] || INSTALLMENT_STATUS.PENDING,
        paidDate: paidDate || null,
        appliedRate: appliedRate !== null ? Number(appliedRate) : null
    };
}

/**
 * Creates a Rate Revision history item for floating-rate loans
 */
export function createLoanRateRevision({
    id = null,
    loanId = '',
    effectiveDate = '',
    annualRate = 0,
    rateType = 'FLOATING',
    benchmark = 'REPO',
    spread = 0,
    reason = 'RBI Repo rate adjustment',
    createdAt = new Date().toISOString()
} = {}) {
    if (!loanId) throw new Error('[Banking Domain] loanId is required for LoanRateRevision.');
    const finalId = id || `rev_${loanId}_${Date.now().toString(36)}`;
    return {
        id: finalId,
        loanId,
        effectiveDate: effectiveDate || new Date().toISOString().split('T')[0],
        annualRate: Number(annualRate) || 0,
        rateType: rateType || 'FLOATING',
        benchmark: benchmark || 'REPO',
        spread: Number(spread) || 0,
        reason: reason || '',
        createdAt
    };
}

/**
 * Creates a Banking Document metadata item
 */
export function createBankingDocument({
    id = null,
    bankId = '',
    accountId = null,
    loanId = null,
    documentType = BANKING_DOCUMENT_TYPE.OTHER,
    title = '',
    storageReference = '',
    documentDate = new Date().toISOString().split('T')[0],
    validityDate = null,
    notes = '',
    createdAt = new Date().toISOString()
} = {}) {
    if (!bankId) throw new Error('[Banking Domain] bankId is required for BankingDocument.');
    if (!title || !title.trim()) throw new Error('[Banking Domain] title is required for BankingDocument.');

    const finalId = id || `bdoc_${bankId}_${Date.now().toString(36)}`;
    return {
        id: finalId,
        bankId,
        accountId: accountId || null,
        loanId: loanId || null,
        documentType: BANKING_DOCUMENT_TYPE[documentType] || BANKING_DOCUMENT_TYPE.OTHER,
        title: title.trim(),
        storageReference: storageReference || '',
        documentDate,
        validityDate: validityDate || null,
        notes: notes || '',
        createdAt
    };
}

// ── DOUBLE-ENTRY JOURNAL SCHEMAS ─────────────────────────────────────────────

/**
 * Creates a balanced Banking Journal Line
 */
export function createBankingJournalLine({
    id = null,
    accountType = 'ASSET', // ASSET | LIABILITY | EQUITY | INCOME | EXPENSE
    accountId = '',
    debitPaise = 0,
    creditPaise = 0,
    currency = 'INR',
    component = 'CASH',    // PRINCIPAL | INTEREST | FEE | PENALTY | CASH | CAPITAL | WAIVER
    bankId = '',
    bankAccountId = null,
    loanId = null,
    description = ''
} = {}) {
    if (!accountId) throw new Error('[Banking Journal] accountId is required for JournalLine.');
    const d = Math.round(Number(debitPaise) || 0);
    const c = Math.round(Number(creditPaise) || 0);

    if (d < 0 || c < 0) {
        throw new Error('[Banking Journal] Debits and credits must be non-negative.');
    }
    if (d > 0 && c > 0) {
        throw new Error('[Banking Journal] A single journal line cannot have both non-zero debit and credit.');
    }
    if (d === 0 && c === 0) {
        throw new Error('[Banking Journal] Journal line must have a non-zero debit or credit.');
    }

    const finalId = id || `bjl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
    return {
        id: finalId,
        accountType,
        accountId,
        debitPaise: d,
        creditPaise: c,
        currency: currency || 'INR',
        component,
        bankId: bankId || '',
        bankAccountId: bankAccountId || null,
        loanId: loanId || null,
        description: description || ''
    };
}

/**
 * Creates a balanced Banking Journal Entry
 */
export function createBankingJournalEntry({
    id = null,
    operationId = '',
    eventType = '',
    eventDate = new Date().toISOString().split('T')[0],
    effectiveDate = new Date().toISOString().split('T')[0],
    entityType = 'BANK_LOAN',
    entityId = '',
    lines = [],
    metadata = {},
    reversesJournalEntryId = null,
    reversalReason = null,
    createdAt = new Date().toISOString(),
    createdBy = 'FINLIFE_USER'
} = {}) {
    if (!eventType) throw new Error('[Banking Journal] eventType is required for JournalEntry.');
    if (!Array.isArray(lines) || lines.length < 2) {
        throw new Error('[Banking Journal] Journal entry must contain at least 2 balanced journal lines.');
    }

    const processedLines = lines.map(l => (l.debitPaise !== undefined ? l : createBankingJournalLine(l)));
    const totalDebits = processedLines.reduce((s, l) => s + l.debitPaise, 0);
    const totalCredits = processedLines.reduce((s, l) => s + l.creditPaise, 0);

    if (totalDebits !== totalCredits) {
        throw new Error(`[Banking Journal] Unbalanced entry: Total Debits (${totalDebits} paise) !== Total Credits (${totalCredits} paise).`);
    }

    const finalId = id || `bje_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;

    return {
        id: finalId,
        operationId: operationId || `bop_${Date.now().toString(36)}`,
        eventType,
        eventDate,
        effectiveDate,
        entityType,
        entityId,
        totalPaise: totalDebits,
        lines: processedLines,
        metadata: metadata || {},
        reversesJournalEntryId: reversesJournalEntryId || null,
        reversalReason: reversalReason || null,
        createdAt,
        createdBy
    };
}

// ── ISOLATED DEMO FIXTURES ───────────────────────────────────────────────────

/**
 * Standard HDFC Bank & Loan Fixture for Development and Tests
 */
export function getHDFCBankDemoFixture() {
    const hdfcBank = createBank({
        id: 'bank_hdfc',
        name: 'HDFC Bank',
        shortName: 'HDFC',
        type: BANK_TYPE.PRIVATE,
        relationshipStatus: BANK_RELATIONSHIP_STATUS.ACTIVE,
        primaryContact: '+91 22 6160 6161'
    });

    const iciciBank = createBank({
        id: 'bank_icici',
        name: 'ICICI Bank',
        shortName: 'ICICI',
        type: BANK_TYPE.PRIVATE,
        relationshipStatus: BANK_RELATIONSHIP_STATUS.ACTIVE,
        primaryContact: '+91 22 3366 7777'
    });

    const hdfcSavings = createBankAccount({
        id: 'bacc_hdfc_savings',
        bankId: 'bank_hdfc',
        accountType: BANK_ACCOUNT_TYPE.SAVINGS,
        accountName: 'HDFC Salary Account',
        maskedAccountNumber: '•••• 4821',
        openingBalancePaise: 100000000, // ₹10,00,000.00
        isPrimary: true
    });

    const iciciSavings = createBankAccount({
        id: 'bacc_icici_savings',
        bankId: 'bank_icici',
        accountType: BANK_ACCOUNT_TYPE.SAVINGS,
        accountName: 'ICICI Privilege Savings',
        maskedAccountNumber: '•••• 1109',
        openingBalancePaise: 120000000, // ₹12,00,000.00
        isPrimary: false
    });

    const hdfcPersonalLoan = createBankLoan({
        id: 'bloan_hdfc_personal_25L',
        bankId: 'bank_hdfc',
        loanType: BANK_LOAN_TYPE.PERSONAL,
        loanName: 'HDFC Personal Loan 25L',
        loanNumberMasked: '•••• 9102',
        originalPrincipalPaise: 250000000, // ₹25,00,000.00
        interestRate: 9.99,
        interestMethod: INTEREST_METHOD.AMORTIZED,
        tenureMonths: 60,
        startDate: '2026-05-01',
        repaymentAccountId: 'bacc_hdfc_savings',
        prepaymentPenaltyPct: 2.0
    });

    return {
        bank: hdfcBank,
        banks: [hdfcBank, iciciBank],
        accounts: [hdfcSavings, iciciSavings],
        loans: [hdfcPersonalLoan]
    };
}
