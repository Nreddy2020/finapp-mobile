/**
 * FinLife P2P Loans — Authoritative Domain Model
 * Defines strongly-typed entities, validation rules, journal entry schemas, and demo fixtures.
 */

export const LOAN_DIRECTION = {
    GIVEN: 'GIVEN',   // User lent money (Receivable Asset)
    TAKEN: 'TAKEN'    // User borrowed money (Payable Liability)
};
export const LOAN_TYPES = LOAN_DIRECTION;

export const LOAN_STATUS = {
    ACTIVE: 'ACTIVE',
    SETTLED: 'SETTLED',
    CANCELLED: 'CANCELLED',
    WRITTEN_OFF: 'WRITTEN_OFF'
};
export const LOAN_STATUSES = LOAN_STATUS;

export const INTEREST_METHOD = {
    SIMPLE: 'SIMPLE',
    AMORTIZED: 'AMORTIZED',
    NO_INTEREST: 'NO_INTEREST',
    CUSTOM: 'CUSTOM'
};
export const INTEREST_METHODS = INTEREST_METHOD;

export const INTEREST_ACCRUAL_BASIS = {
    MONTHLY_FIXED: 'MONTHLY_FIXED',
    ACTUAL_DAYS: 'ACTUAL_DAYS'
};

export const REPAYMENT_FREQUENCY = {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    CUSTOM: 'CUSTOM',
    BULLET: 'BULLET'
};
export const REPAYMENT_FREQUENCIES = REPAYMENT_FREQUENCY;

export const REPAYMENT_ALLOCATION = {
    FEES_FIRST: 'FEES_FIRST',
    INTEREST_FIRST: 'INTEREST_FIRST', // Standard accounting: unpaid accrued interest paid first
    PRINCIPAL_FIRST: 'PRINCIPAL_FIRST',
    PROPORTIONAL: 'PROPORTIONAL'
};
export const REPAYMENT_ALLOCATIONS = REPAYMENT_ALLOCATION;

export const SCHEDULE_STATUS = {
    PENDING: 'PENDING',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    PAID: 'PAID',
    PREPAID: 'PREPAID',
    OVERDUE: 'OVERDUE',
    SKIPPED: 'SKIPPED',
    WAIVED: 'WAIVED',
    CLOSED_BY_SETTLEMENT: 'CLOSED_BY_SETTLEMENT'
};
export const SCHEDULE_STATUSES = SCHEDULE_STATUS;

export const JOURNAL_EVENT_TYPES = {
    P2P_LOAN_GIVEN: 'P2P_LOAN_GIVEN',                 // Outflow from cash -> Debit P2P Receivable, Credit Cash
    P2P_LOAN_TAKEN: 'P2P_LOAN_TAKEN',                 // Inflow to cash -> Debit Cash, Credit P2P Payable
    LOAN_GIVEN: 'P2P_LOAN_GIVEN',
    LOAN_TAKEN: 'P2P_LOAN_TAKEN',
    P2P_ADVANCE_GIVEN: 'P2P_ADVANCE_GIVEN',           // Top-up given -> Debit P2P Receivable, Credit Cash
    P2P_ADVANCE_TAKEN: 'P2P_ADVANCE_TAKEN',           // Top-up taken -> Debit Cash, Credit P2P Payable
    P2P_REPAYMENT_RECEIVED: 'P2P_REPAYMENT_RECEIVED', // Borrower paid -> Debit Cash, Credit Receivable (Principal), Credit Interest Income
    REPAYMENT_RECEIVED: 'P2P_REPAYMENT_RECEIVED',
    P2P_REPAYMENT_PAID: 'P2P_REPAYMENT_PAID',         // User paid -> Debit Payable (Principal), Debit Interest Expense, Credit Cash
    REPAYMENT_PAID: 'P2P_REPAYMENT_PAID',
    P2P_PREPAYMENT_RECEIVED: 'P2P_PREPAYMENT_RECEIVED',
    P2P_PREPAYMENT_PAID: 'P2P_PREPAYMENT_PAID',
    P2P_SETTLEMENT: 'P2P_SETTLEMENT',                 // Final reconciliation & closure
    SETTLEMENT: 'P2P_SETTLEMENT',
    RELATIONSHIP_SETTLEMENT: 'RELATIONSHIP_SETTLEMENT', // Multi-loan person level settle-up
    P2P_REVERSAL: 'P2P_REVERSAL'                      // Correction / reversal of a prior entry
};

export const OPERATION_STATUS = {
    PREPARED: 'PREPARED',
    COMMITTED: 'COMMITTED',
    FAILED: 'FAILED'
};

/**
 * Creates a normalized Person entity
 */
export function createPerson({
    id = `person_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name = '',
    phone = '',
    email = '',
    relationship = 'Counterparty',
    notes = '',
    tags = [],
    loanIds = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
} = {}) {
    if (!name || typeof name !== 'string' || !name.trim()) {
        throw new Error('Person name is required and cannot be empty.');
    }
    return {
        id,
        name: name.trim(),
        phone: phone ? String(phone).trim() : '',
        email: email ? String(email).trim() : '',
        relationship: relationship || 'Counterparty',
        notes: notes || '',
        tags: Array.isArray(tags) ? tags : [],
        loanIds: Array.isArray(loanIds) ? loanIds : [],
        createdAt,
        updatedAt
    };
}

/**
 * Creates a PersonRelationship summary entity
 */
export function createPersonRelationship({
    personId = '',
    totalGiven = 0,
    totalTaken = 0,
    netBalance = 0,
    pendingLoanIds = [],
    settledLoanIds = [],
    lastActivityDate = new Date().toISOString().split('T')[0]
} = {}) {
    return {
        personId,
        totalGiven: Number(totalGiven.toFixed(2)),
        totalTaken: Number(totalTaken.toFixed(2)),
        netBalance: Number(netBalance.toFixed(2)),
        direction: netBalance >= 0 ? 'RECEIVABLE' : 'PAYABLE',
        pendingLoanIds: Array.isArray(pendingLoanIds) ? pendingLoanIds : [],
        settledLoanIds: Array.isArray(settledLoanIds) ? settledLoanIds : [],
        lastActivityDate
    };
}

/**
 * Creates a normalized P2PLoan contract entity
 */
export function createP2PLoan({
    id = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    personId = '',
    name = '',
    direction = LOAN_DIRECTION.GIVEN,
    type = null,
    principal = 0,
    interestRate = 0,
    interestMethod = INTEREST_METHOD.SIMPLE,
    interestAccrualBasis = INTEREST_ACCRUAL_BASIS.MONTHLY_FIXED,
    tenureMonths = 12,
    startDate = new Date().toISOString().split('T')[0],
    accountId = 'HDFC Savings Account',
    cashAccountId = null,
    repaymentFrequency = REPAYMENT_FREQUENCY.MONTHLY,
    repaymentAllocation = REPAYMENT_ALLOCATION.INTEREST_FIRST,
    status = LOAN_STATUS.ACTIVE,
    securityProfile = { mobileLockEnabled: false, guarantors: [] },
    tags = [],
    notes = '',
    comments = [],
    guarantors = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
} = {}) {
    if (!personId) {
        throw new Error('personId is required to create a P2P loan.');
    }
    const numPrincipal = Number(principal);
    if (isNaN(numPrincipal) || numPrincipal <= 0) {
        throw new Error('Loan principal must be a positive number.');
    }
    const resolvedDirection = direction || type || LOAN_DIRECTION.GIVEN;
    const resolvedStatus = status || LOAN_STATUS.ACTIVE;

    const validatedGuarantors = Array.isArray(guarantors) ? guarantors.slice(0, 2) : [];

    return {
        id,
        personId,
        name: name ? String(name).trim() : `Loan ${id.substring(0, 8)}`,
        direction: resolvedDirection,
        type: resolvedDirection,
        principal: numPrincipal,
        interestRate: Number(interestRate) || 0,
        interestMethod: interestMethod || INTEREST_METHOD.SIMPLE,
        interestAccrualBasis: interestAccrualBasis || INTEREST_ACCRUAL_BASIS.MONTHLY_FIXED,
        tenureMonths: Math.max(1, Number(tenureMonths) || 12),
        startDate: startDate || new Date().toISOString().split('T')[0],
        accountId: accountId || cashAccountId || 'HDFC Savings Account',
        cashAccountId: cashAccountId || accountId || 'HDFC Savings Account',
        repaymentFrequency: repaymentFrequency || REPAYMENT_FREQUENCY.MONTHLY,
        repaymentAllocation: repaymentAllocation || REPAYMENT_ALLOCATION.INTEREST_FIRST,
        status: resolvedStatus,
        securityProfile: {
            mobileLockEnabled: Boolean(securityProfile?.mobileLockEnabled),
            isSecured: Boolean(securityProfile?.isSecured),
            collateralType: securityProfile?.collateralType || 'NONE',
            collateralDescription: securityProfile?.collateralDescription || '',
            guarantors: validatedGuarantors,
            ...(securityProfile || {})
        },
        tags: Array.isArray(tags) ? tags : [],
        notes: notes || '',
        comments: Array.isArray(comments) ? comments : [],
        guarantors: validatedGuarantors,
        createdAt,
        updatedAt
    };
}

/**
 * Creates a LoanAdvance entity (Tranche / Initial disbursement / Top-up)
 */
export function createLoanAdvance({
    id = `adv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    amount = 0,
    date = new Date().toISOString().split('T')[0],
    effectiveDate = null,
    interestRate = null,
    accountId = 'HDFC Savings Account',
    cashAccountId = null,
    note = '',
    trancheId = null,
    createdAt = new Date().toISOString()
} = {}) {
    if (!loanId) throw new Error('loanId is required for an advance record.');
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) throw new Error('Advance amount must be > 0.');

    const acc = accountId || cashAccountId || 'HDFC Savings Account';
    return {
        id,
        loanId,
        amount: numAmount,
        date,
        effectiveDate: effectiveDate || date,
        interestRate: interestRate !== null ? Number(interestRate) : null,
        accountId: acc,
        cashAccountId: acc,
        note: note || '',
        trancheId: trancheId || id,
        createdAt
    };
}

/**
 * Creates a LoanRepayment record
 */
export function createLoanRepayment({
    id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    amount = 0,
    principalComponent = 0,
    principalAmount = 0,
    principalPaid = 0,
    interestComponent = 0,
    interestAmount = 0,
    interestPaid = 0,
    feeComponent = 0,
    penaltyComponent = 0,
    date = new Date().toISOString().split('T')[0],
    paymentDate = null,
    accountId = 'HDFC Savings Account',
    cashAccountId = null,
    note = '',
    notes = '',
    scheduleItemId = null,
    sourceScheduleItemId = null,
    isAdvancePayment = false,
    isPrincipalPrepayment = false,
    isExternalAcknowledgment = false,
    createdAt = new Date().toISOString()
} = {}) {
    if (!loanId) throw new Error('loanId is required for a repayment record.');
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) throw new Error('Repayment amount must be > 0.');

    const pComp = principalComponent !== 0 ? Number(principalComponent) : (Number(principalAmount) || Number(principalPaid) || 0);
    const iComp = interestComponent !== 0 ? Number(interestComponent) : (Number(interestAmount) || Number(interestPaid) || 0);
    const acc = accountId || cashAccountId || 'HDFC Savings Account';

    return {
        id,
        loanId,
        amount: numAmount,
        principalComponent: pComp,
        principalAmount: pComp,
        principalPaid: pComp,
        interestComponent: iComp,
        interestAmount: iComp,
        interestPaid: iComp,
        feeComponent: Number(feeComponent) || 0,
        penaltyComponent: Number(penaltyComponent) || 0,
        date: date || paymentDate || new Date().toISOString().split('T')[0],
        paymentDate: paymentDate || date || new Date().toISOString().split('T')[0],
        accountId: acc,
        cashAccountId: acc,
        note: note || notes || '',
        notes: notes || note || '',
        scheduleItemId: scheduleItemId || sourceScheduleItemId || null,
        sourceScheduleItemId: sourceScheduleItemId || scheduleItemId || null,
        isAdvancePayment: Boolean(isAdvancePayment),
        isPrincipalPrepayment: Boolean(isPrincipalPrepayment),
        isExternalAcknowledgment: Boolean(isExternalAcknowledgment),
        createdAt
    };
}

/**
 * Creates a RepaymentScheduleItem
 */
export function createRepaymentScheduleItem({
    id = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    installmentNumber = 1,
    periodStart = '',
    periodEnd = '',
    dueDate = new Date().toISOString().split('T')[0],
    openingPrincipal = 0,
    expectedPrincipal = 0,
    principalComponent = 0,
    expectedInterest = 0,
    interestComponent = 0,
    expectedFees = 0,
    expectedAmount = 0,
    expectedTotal = 0,
    paidPrincipal = 0,
    paidInterest = 0,
    paidFees = 0,
    paidAmount = 0,
    paidTotal = 0,
    remainingPrincipal = 0,
    closingPrincipal = 0,
    status = SCHEDULE_STATUS.PENDING,
    paidDate = null
} = {}) {
    const pExp = expectedPrincipal !== null && expectedPrincipal !== undefined ? Number(expectedPrincipal) : (principalComponent || 0);
    const iExp = expectedInterest !== null && expectedInterest !== undefined ? Number(expectedInterest) : (interestComponent || 0);
    const fExp = Number(expectedFees) || 0;
    const totalExp = expectedTotal !== null && expectedTotal !== undefined && expectedTotal !== 0 ? Number(expectedTotal) : (expectedAmount || (pExp + iExp + fExp));

    const pPaid = Number(paidPrincipal) || 0;
    const iPaid = Number(paidInterest) || 0;
    const fPaid = Number(paidFees) || 0;
    const totalPaid = paidTotal !== null && paidTotal !== undefined && paidTotal !== 0 ? Number(paidTotal) : (paidAmount || (pPaid + iPaid + fPaid));

    const totalRemaining = Math.max(0, totalExp - totalPaid);

    return {
        id,
        loanId,
        installmentNumber: Number(installmentNumber) || 1,
        periodStart: periodStart || dueDate,
        periodEnd: periodEnd || dueDate,
        dueDate,
        openingPrincipal: Number(Number(openingPrincipal).toFixed(2)) || 0,
        expectedAmount: Number(totalExp.toFixed(2)),
        expectedTotal: Number(totalExp.toFixed(2)),
        expectedPrincipal: Number(pExp.toFixed(2)),
        expectedInterest: Number(iExp.toFixed(2)),
        expectedFees: Number(fExp.toFixed(2)),
        principalComponent: Number(pExp.toFixed(2)),
        interestComponent: Number(iExp.toFixed(2)),
        remainingPrincipal: Number(Number(remainingPrincipal || closingPrincipal).toFixed(2)) || 0,
        closingPrincipal: Number(Number(closingPrincipal || remainingPrincipal).toFixed(2)) || 0,
        paidAmount: Number(totalPaid.toFixed(2)),
        paidTotal: Number(totalPaid.toFixed(2)),
        paidPrincipal: Number(pPaid.toFixed(2)),
        paidInterest: Number(iPaid.toFixed(2)),
        paidFees: Number(fPaid.toFixed(2)),
        remainingTotal: Number(totalRemaining.toFixed(2)),
        paidDate: paidDate || null,
        status: Object.values(SCHEDULE_STATUS).includes(status) ? status : SCHEDULE_STATUS.PENDING
    };
}

/**
 * Creates a JournalLine with strict non-negative debit/credit constraints
 */
export function createJournalLine({
    id = `jl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    accountType = 'ASSET', // 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE'
    accountId = 'ASSET_P2P_RECEIVABLE',
    debit = 0,
    credit = 0,
    currency = 'INR',
    component = 'PRINCIPAL', // 'PRINCIPAL' | 'INTEREST' | 'FEE' | 'PENALTY' | 'WAIVER' | 'CAPITAL'
    loanId = '',
    personId = ''
} = {}) {
    const numDebit = Number(Number(debit).toFixed(2)) || 0;
    const numCredit = Number(Number(credit).toFixed(2)) || 0;

    if (numDebit < 0 || numCredit < 0) {
        throw new Error('Journal line debit and credit must be non-negative.');
    }
    if (numDebit > 0 && numCredit > 0) {
        throw new Error('Journal line cannot have both positive debit and positive credit.');
    }

    return {
        id,
        accountType,
        accountId,
        debit: numDebit,
        credit: numCredit,
        currency,
        component,
        loanId: loanId || undefined,
        personId: personId || undefined
    };
}

/**
 * Creates an immutable, balanced Double-Entry Journal Entry
 */
export function createJournalEntry({
    id = null,
    journalEntryId = null,
    operationId = null,
    eventType = JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
    eventDate = new Date().toISOString().split('T')[0],
    effectiveDate = null,
    entityType = 'LOAN', // 'LOAN' | 'PERSON_RELATIONSHIP'
    entityId = '',
    sourceEntityId = '',
    sourceEventId = '',
    direction = 'GIVEN',
    lines = [],
    debits = [],
    credits = [],
    accountFrom = '',
    accountTo = '',
    amount = 0,
    currency = 'INR',
    metadata = {},
    reversesJournalEntryId = null,
    reversalReason = null,
    idempotencyKey = '',
    note = '',
    createdAt = new Date().toISOString(),
    createdBy = 'FINLIFE_ENGINE'
} = {}) {
    const finalId = id || journalEntryId || `je_p2p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const finalEntityId = entityId || sourceEntityId || '';
    const finalEffectiveDate = effectiveDate || eventDate || new Date().toISOString().split('T')[0];

    let finalLines = [];
    if (Array.isArray(lines) && lines.length > 0) {
        finalLines = lines.map(l => createJournalLine(l));
    } else {
        // Construct lines from legacy debits / credits if provided
        (debits || []).forEach((d, idx) => {
            finalLines.push(createJournalLine({
                id: `jl_${finalId}_d${idx}`,
                accountType: d.accountType || (d.account.includes('RECEIVABLE') || d.account.includes('CASH') || d.account.includes('BANK') ? 'ASSET' : (d.account.includes('EXPENSE') ? 'EXPENSE' : 'LIABILITY')),
                accountId: d.account || d.accountId || 'ASSET_P2P_RECEIVABLE',
                debit: d.amount,
                credit: 0,
                component: d.component || 'PRINCIPAL',
                loanId: finalEntityId
            }));
        });
        (credits || []).forEach((c, idx) => {
            finalLines.push(createJournalLine({
                id: `jl_${finalId}_c${idx}`,
                accountType: c.accountType || (c.account.includes('PAYABLE') ? 'LIABILITY' : (c.account.includes('INCOME') ? 'INCOME' : 'ASSET')),
                accountId: c.account || c.accountId || 'acc_cash',
                debit: 0,
                credit: c.amount,
                component: c.component || (c.account.includes('INTEREST') ? 'INTEREST' : 'PRINCIPAL'),
                loanId: finalEntityId
            }));
        });
    }

    // Validate balance invariant: sum(debits) === sum(credits) to 2 decimals
    const totalDebits = Number(finalLines.reduce((sum, l) => sum + l.debit, 0).toFixed(2));
    const totalCredits = Number(finalLines.reduce((sum, l) => sum + l.credit, 0).toFixed(2));

    if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new Error(`Double-entry journal entry is unbalanced! Total debits: ₹${totalDebits}, Total credits: ₹${totalCredits}`);
    }

    const key = idempotencyKey || `${eventType}:${finalEntityId}:${sourceEventId || finalEffectiveDate}`;

    return {
        id: finalId,
        journalEntryId: finalId,
        operationId,
        eventType,
        eventDate,
        effectiveDate: finalEffectiveDate,
        entityType,
        entityId: finalEntityId,
        sourceEntityId: finalEntityId,
        sourceEventId,
        direction,
        lines: finalLines,
        debits: finalLines.filter(l => l.debit > 0).map(l => ({ account: l.accountId, amount: l.debit, component: l.component })),
        credits: finalLines.filter(l => l.credit > 0).map(l => ({ account: l.accountId, amount: l.credit, component: l.component })),
        accountFrom,
        accountTo,
        amount: totalDebits || Number(amount) || 0,
        currency,
        metadata: metadata || {},
        reversesJournalEntryId: reversesJournalEntryId || null,
        reversalReason: reversalReason || null,
        idempotencyKey: key,
        note: note || '',
        createdAt,
        createdBy
    };
}

/**
 * Creates a LoanComment
 */
export function createLoanComment({
    id = `comm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    authorId = 'user_self',
    text = '',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
} = {}) {
    if (!text || !text.trim()) throw new Error('Comment text cannot be empty.');
    return {
        id,
        loanId,
        authorId,
        text: text.trim(),
        createdAt,
        updatedAt
    };
}

/**
 * Creates a Guarantor record (max 2 per loan)
 */
export function createGuarantor({
    id = `guar_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    personId = '',
    name = '',
    phone = '',
    relationship = 'Guarantor',
    notes = '',
    status = 'CONFIRMED',
    createdAt = new Date().toISOString()
} = {}) {
    if (!name || !name.trim()) throw new Error('Guarantor name is required.');
    return {
        id,
        loanId,
        personId: personId || undefined,
        name: name.trim(),
        phone: phone ? String(phone).trim() : '',
        relationship: relationship || 'Guarantor',
        notes: notes || '',
        status,
        createdAt
    };
}

/**
 * Creates a LoanReminder
 */
export function createLoanReminder({
    id = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    installmentId = null,
    dueDate = '',
    remindAt = '',
    channel = 'IN_APP', // 'IN_APP' | 'SMS' | 'WHATSAPP'
    status = 'PENDING', // 'PENDING' | 'SENT' | 'DISMISSED'
    sentAt = null,
    createdAt = new Date().toISOString()
} = {}) {
    return {
        id,
        loanId,
        installmentId,
        dueDate,
        remindAt: remindAt || dueDate,
        channel,
        status,
        sentAt,
        createdAt
    };
}

/**
 * Creates a SettlementRecord
 */
export function createSettlementRecord({
    id = `settle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    personId = '',
    settlementDate = new Date().toISOString().split('T')[0],
    principalOutstanding = 0,
    interestOutstanding = 0,
    feesOutstanding = 0,
    waiverAmount = 0,
    finalSettlementAmount = 0,
    settlementAccount = 'HDFC Savings Account',
    journalEntryId = '',
    direction = LOAN_DIRECTION.GIVEN,
    createdAt = new Date().toISOString()
} = {}) {
    return {
        id,
        loanId,
        personId,
        settlementDate,
        principalOutstanding: Number(Number(principalOutstanding).toFixed(2)),
        interestOutstanding: Number(Number(interestOutstanding).toFixed(2)),
        feesOutstanding: Number(Number(feesOutstanding).toFixed(2)),
        waiverAmount: Number(Number(waiverAmount).toFixed(2)),
        finalSettlementAmount: Number(Number(finalSettlementAmount).toFixed(2)),
        settlementAccount,
        journalEntryId,
        direction,
        createdAt
    };
}

/**
 * Creates a P2POperation (Operation Log)
 */
export function createP2POperation({
    id = `p2p_op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    operationType = 'RECORD_REPAYMENT',
    status = OPERATION_STATUS.PREPARED,
    payload = {},
    journalEntryId = null,
    createdAt = new Date().toISOString(),
    committedAt = null,
    error = null
} = {}) {
    return {
        id,
        operationType,
        status,
        payload,
        journalEntryId,
        createdAt,
        committedAt,
        error
    };
}

// Isolated Demo Fixtures
export const DEMO_KASAPA_PERSON = {
    id: 'demo_person_kasapa',
    name: 'Kasapa Reddy Bava',
    phone: '+91 98480 12345',
    relationship: 'Brother-in-Law',
    totalGiven: 1067000,
    totalReceived: 81606.05,
    netBalance: 985393.95
};

export const DEMO_KASAPA_SUB_LOANS = [
    {
        id: 'Loan-110',
        name: 'ICICI Personal Loan',
        principal: 236746.04,
        interestRate: 9.99,
        interestMethod: INTEREST_METHOD.SIMPLE,
        startDate: '2026-04-06',
        nextDue: '2026-09-06',
        status: LOAN_STATUS.ACTIVE
    },
    {
        id: 'Loan-85',
        name: 'HDFC Business Expansion',
        principal: 320000.00,
        interestRate: 10.5,
        interestMethod: INTEREST_METHOD.SIMPLE,
        startDate: '2026-02-15',
        nextDue: '2026-09-15',
        status: LOAN_STATUS.ACTIVE
    },
    {
        id: 'Loan-72',
        name: 'Working Capital Advance',
        principal: 260253.96,
        interestRate: 11.0,
        interestMethod: INTEREST_METHOD.SIMPLE,
        startDate: '2026-03-01',
        nextDue: '2026-09-01',
        status: LOAN_STATUS.ACTIVE
    },
    {
        id: 'Loan-64',
        name: 'Equipment Bridge Loan',
        principal: 250000.00,
        interestRate: 9.5,
        interestMethod: INTEREST_METHOD.SIMPLE,
        startDate: '2026-05-10',
        nextDue: '2026-09-10',
        status: LOAN_STATUS.ACTIVE
    }
];
