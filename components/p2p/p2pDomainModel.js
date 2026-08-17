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
    CANCELLED: 'CANCELLED'
};
export const LOAN_STATUSES = LOAN_STATUS;

export const INTEREST_METHOD = {
    SIMPLE: 'SIMPLE',
    AMORTIZED: 'AMORTIZED',
    NO_INTEREST: 'NO_INTEREST',
    CUSTOM: 'CUSTOM'
};
export const INTEREST_METHODS = INTEREST_METHOD;

export const REPAYMENT_FREQUENCY = {
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    CUSTOM: 'CUSTOM',
    BULLET: 'BULLET'
};
export const REPAYMENT_FREQUENCIES = REPAYMENT_FREQUENCY;

export const REPAYMENT_ALLOCATION = {
    INTEREST_FIRST: 'INTEREST_FIRST', // Standard accounting: unpaid accrued interest paid first
    PRINCIPAL_FIRST: 'PRINCIPAL_FIRST',
    PROPORTIONAL: 'PROPORTIONAL'
};
export const REPAYMENT_ALLOCATIONS = REPAYMENT_ALLOCATION;

export const SCHEDULE_STATUS = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    PARTIALLY_PAID: 'PARTIALLY_PAID',
    OVERDUE: 'OVERDUE',
    SKIPPED: 'SKIPPED',
    WAIVED: 'WAIVED'
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
    P2P_SETTLEMENT: 'P2P_SETTLEMENT',                 // Final reconciliation & closure
    SETTLEMENT: 'P2P_SETTLEMENT',
    P2P_REVERSAL: 'P2P_REVERSAL'                      // Correction / reversal of a prior entry
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
 * Creates a normalized P2P Loan entity
 */
export function createP2PLoan({
    id = `loan_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    personId = '',
    personName = '',
    type = null,
    direction = LOAN_DIRECTION.GIVEN,
    status = LOAN_STATUS.ACTIVE,
    principal = 0,
    outstandingPrincipal = null,
    interestRate = 0, // Annual percentage, e.g. 9.99 for 9.99%
    interestMethod = INTEREST_METHOD.SIMPLE,
    repaymentAllocation = REPAYMENT_ALLOCATION.INTEREST_FIRST,
    startDate = new Date().toISOString().split('T')[0],
    maturityDate = '',
    tenureMonths = 12,
    repaymentFrequency = null,
    paymentFrequency = REPAYMENT_FREQUENCY.MONTHLY,
    cashAccountId = null,
    cashAccountName = '',
    accountId = 'HDFC Savings Account',
    notes = '',
    tags = [],
    guarantor = null,
    documents = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
} = {}) {
    if (!personId) throw new Error('personId is required for a P2P loan.');
    const parsedPrincipal = Number(principal);
    if (isNaN(parsedPrincipal) || parsedPrincipal <= 0) {
        throw new Error('Principal must be a positive number.');
    }
    const parsedRate = Number(interestRate) || 0;
    if (parsedRate < 0) throw new Error('Interest rate cannot be negative.');

    const finalDirection = type || direction;
    const finalFreq = repaymentFrequency || paymentFrequency || REPAYMENT_FREQUENCY.MONTHLY;
    const finalAccountId = cashAccountId || accountId || 'HDFC Savings Account';

    return {
        id,
        personId,
        personName: personName || '',
        direction: finalDirection === LOAN_DIRECTION.TAKEN ? LOAN_DIRECTION.TAKEN : LOAN_DIRECTION.GIVEN,
        type: finalDirection === LOAN_DIRECTION.TAKEN ? LOAN_DIRECTION.TAKEN : LOAN_DIRECTION.GIVEN,
        status: Object.values(LOAN_STATUS).includes(status) ? status : LOAN_STATUS.ACTIVE,
        principal: parsedPrincipal,
        initialPrincipal: parsedPrincipal,
        outstandingPrincipal: outstandingPrincipal !== null ? Number(outstandingPrincipal) : parsedPrincipal,
        interestRate: parsedRate,
        interestMethod: Object.values(INTEREST_METHOD).includes(interestMethod) ? interestMethod : INTEREST_METHOD.SIMPLE,
        repaymentAllocation: Object.values(REPAYMENT_ALLOCATION).includes(repaymentAllocation) ? repaymentAllocation : REPAYMENT_ALLOCATION.INTEREST_FIRST,
        startDate: startDate || new Date().toISOString().split('T')[0],
        maturityDate: maturityDate || '',
        tenureMonths: Math.max(1, Number(tenureMonths) || 12),
        paymentFrequency: finalFreq,
        repaymentFrequency: finalFreq,
        accountId: finalAccountId,
        cashAccountId: finalAccountId,
        cashAccountName: cashAccountName || 'HDFC Savings Account',
        notes: notes || '',
        tags: Array.isArray(tags) ? tags : [],
        guarantor: guarantor ? { ...guarantor } : null,
        documents: Array.isArray(documents) ? [...documents] : [],
        createdAt,
        updatedAt
    };
}

/**
 * Creates a Loan Advance (Disbursement or Subsequent Top-up)
 */
export function createLoanAdvance({
    id = `adv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    amount = 0,
    disbursementDate = null,
    date = new Date().toISOString().split('T')[0],
    cashAccountId = null,
    accountId = 'HDFC Savings Account',
    notes = '',
    note = '',
    isInitial = false,
    journalEntryId = null,
    createdAt = new Date().toISOString()
} = {}) {
    if (!loanId) throw new Error('loanId is required for LoanAdvance.');
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Advance amount must be a positive number.');
    }
    const finalDate = disbursementDate || date || new Date().toISOString().split('T')[0];
    const finalAcc = cashAccountId || accountId || 'HDFC Savings Account';

    return {
        id,
        loanId,
        amount: parsedAmount,
        date: finalDate,
        disbursementDate: finalDate,
        accountId: finalAcc,
        cashAccountId: finalAcc,
        note: notes || note || '',
        notes: notes || note || '',
        isInitial: Boolean(isInitial),
        journalEntryId: journalEntryId || `je_${id}`,
        createdAt
    };
}

/**
 * Creates a Loan Repayment Record
 */
export function createLoanRepayment({
    id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    amount = 0,
    principalPaid = null,
    interestPaid = null,
    principalComponent = 0,
    interestComponent = 0,
    feeComponent = 0,
    paymentDate = null,
    date = new Date().toISOString().split('T')[0],
    cashAccountId = null,
    accountId = 'HDFC Savings Account',
    status = SCHEDULE_STATUS.PAID,
    note = '',
    notes = '',
    sourceScheduleItemId = null,
    scheduleItemId = null,
    journalEntryId = null,
    createdAt = new Date().toISOString()
} = {}) {
    if (!loanId) throw new Error('loanId is required for LoanRepayment.');
    const parsedAmount = Number(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error('Repayment amount must be a positive number.');
    }

    const pComp = principalPaid !== null ? Number(principalPaid) : Number(principalComponent) || 0;
    const iComp = interestPaid !== null ? Number(interestPaid) : Number(interestComponent) || 0;
    const fComp = Number(feeComponent) || 0;
    const finalDate = paymentDate || date || new Date().toISOString().split('T')[0];
    const finalAcc = cashAccountId || accountId || 'HDFC Savings Account';
    const finalSchId = sourceScheduleItemId || scheduleItemId || null;

    return {
        id,
        loanId,
        amount: parsedAmount,
        principalPaid: pComp,
        interestPaid: iComp,
        principalComponent: pComp,
        interestComponent: iComp,
        feeComponent: fComp,
        date: finalDate,
        paymentDate: finalDate,
        accountId: finalAcc,
        cashAccountId: finalAcc,
        status: Object.values(SCHEDULE_STATUS).includes(status) ? status : SCHEDULE_STATUS.PAID,
        note: notes || note || '',
        notes: notes || note || '',
        scheduleItemId: finalSchId,
        sourceScheduleItemId: finalSchId,
        journalEntryId: journalEntryId || `je_${id}`,
        createdAt
    };
}

/**
 * Creates a Repayment Schedule Item
 */
export function createRepaymentScheduleItem({
    id = `sch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    loanId = '',
    installmentNumber = 1,
    dueDate = new Date().toISOString().split('T')[0],
    expectedAmount = 0,
    expectedTotal = null,
    expectedPrincipal = 0,
    expectedInterest = 0,
    principalComponent = 0,
    interestComponent = 0,
    remainingPrincipal = 0,
    paidAmount = 0,
    paidTotal = null,
    paidPrincipal = 0,
    paidInterest = 0,
    remainingTotal = null,
    paidDate = null,
    status = SCHEDULE_STATUS.PENDING
} = {}) {
    if (!loanId) throw new Error('loanId is required for RepaymentScheduleItem.');

    const pExp = expectedPrincipal || principalComponent || 0;
    const iExp = expectedInterest || interestComponent || 0;
    const totalExp = expectedTotal !== null ? Number(expectedTotal) : (expectedAmount || (pExp + iExp));

    const pPaid = paidPrincipal || 0;
    const iPaid = paidInterest || 0;
    const totalPaid = paidTotal !== null ? Number(paidTotal) : (paidAmount || (pPaid + iPaid));

    const totalRemaining = remainingTotal !== null ? Number(remainingTotal) : Math.max(0, totalExp - totalPaid);

    return {
        id,
        loanId,
        installmentNumber: Number(installmentNumber) || 1,
        dueDate,
        expectedAmount: totalExp,
        expectedTotal: totalExp,
        expectedPrincipal: Number(pExp) || 0,
        expectedInterest: Number(iExp) || 0,
        principalComponent: Number(pExp) || 0,
        interestComponent: Number(iExp) || 0,
        remainingPrincipal: Number(remainingPrincipal) || 0,
        paidAmount: totalPaid,
        paidTotal: totalPaid,
        paidPrincipal: Number(pPaid) || 0,
        paidInterest: Number(iPaid) || 0,
        remainingTotal: totalRemaining,
        paidDate: paidDate || null,
        status: Object.values(SCHEDULE_STATUS).includes(status) ? status : SCHEDULE_STATUS.PENDING
    };
}

/**
 * Creates an immutable Double-Entry Journal Entry
 */
export function createJournalEntry({
    journalEntryId = `je_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    eventType = JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
    sourceEntityId = '', // Loan ID
    sourceEventId = '',  // Advance ID or Repayment ID
    timestamp = new Date().toISOString(),
    accountFrom = '',
    accountTo = '',
    amount = 0,
    currency = 'INR',
    debits = [],
    credits = [],
    idempotencyKey = '',
    note = ''
} = {}) {
    if (!eventType || !JOURNAL_EVENT_TYPES[eventType]) {
        throw new Error(`Invalid or missing eventType: ${eventType}`);
    }
    const parsedAmount = Number(amount) || (debits && debits[0] ? debits.reduce((s, d) => s + d.amount, 0) : 0);

    const key = idempotencyKey || `${eventType}:${sourceEntityId}:${sourceEventId || timestamp}`;

    return {
        journalEntryId,
        eventType: JOURNAL_EVENT_TYPES[eventType],
        sourceEntityId,
        sourceEventId,
        timestamp,
        accountFrom,
        accountTo,
        amount: parsedAmount,
        currency,
        debits: Array.isArray(debits) ? debits : [],
        credits: Array.isArray(credits) ? credits : [],
        idempotencyKey: key,
        note: note || ''
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
