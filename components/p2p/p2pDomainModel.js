/**
 * FinLife P2P Loans — Authoritative Domain Model
 * Defines strongly-typed entities, validation rules, journal entry schemas, and demo fixtures.
 */

import {
    toBigIntPaise,
    rupeesToPaise,
    paiseToRupees,
    rateToBps
} from './p2pContracts.js';

export {
    toBigIntPaise,
    rupeesToPaise,
    paiseToRupees,
    rateToBps
};

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
    totalGivenPaise = undefined,
    totalTakenPaise = undefined,
    netBalancePaise = undefined,
    pendingLoanIds = [],
    settledLoanIds = [],
    lastActivityDate = new Date().toISOString().split('T')[0]
} = {}) {
    const gPaise = totalGivenPaise !== undefined ? toBigIntPaise(totalGivenPaise) : rupeesToPaise(totalGiven);
    const tPaise = totalTakenPaise !== undefined ? toBigIntPaise(totalTakenPaise) : rupeesToPaise(totalTaken);
    const nPaise = netBalancePaise !== undefined ? toBigIntPaise(netBalancePaise) : (gPaise - tPaise);

    return {
        personId,
        totalGivenPaise: gPaise,
        totalTakenPaise: tPaise,
        netBalancePaise: nPaise,
        totalGiven: paiseToRupees(gPaise),
        totalTaken: paiseToRupees(tPaise),
        netBalance: paiseToRupees(nPaise),
        direction: nPaise >= 0n ? 'RECEIVABLE' : 'PAYABLE',
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
    principalPaise = undefined,
    outstandingPrincipalPaise = undefined,
    outstandingPrincipal = undefined,
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
    const resolvedPrincipalPaise = principalPaise !== undefined ? toBigIntPaise(principalPaise) : rupeesToPaise(principal);
    if (resolvedPrincipalPaise <= 0n) {
        throw new Error('Loan principal must be a positive number.');
    }
    const resolvedOutstandingPaise = outstandingPrincipalPaise !== undefined 
        ? toBigIntPaise(outstandingPrincipalPaise) 
        : (outstandingPrincipal !== undefined ? rupeesToPaise(outstandingPrincipal) : resolvedPrincipalPaise);

    const resolvedDirection = direction || type || LOAN_DIRECTION.GIVEN;
    const resolvedStatus = status || LOAN_STATUS.ACTIVE;

    const validatedGuarantors = Array.isArray(guarantors) ? guarantors.slice(0, 2) : [];
    const annualRateBps = rateToBps(interestRate);

    return {
        id,
        personId,
        name: name ? String(name).trim() : `Loan ${id.substring(0, 8)}`,
        direction: resolvedDirection,
        type: resolvedDirection,
        principalPaise: resolvedPrincipalPaise,
        principal: paiseToRupees(resolvedPrincipalPaise),
        outstandingPrincipalPaise: resolvedOutstandingPaise,
        outstandingPrincipal: paiseToRupees(resolvedOutstandingPaise),
        interestRate: Number(interestRate) || 0,
        annualRateBps,
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
    amountPaise = undefined,
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
    const resolvedAmountPaise = amountPaise !== undefined ? toBigIntPaise(amountPaise) : rupeesToPaise(amount);
    if (resolvedAmountPaise <= 0n) throw new Error('Advance amount must be > 0.');

    const acc = accountId || cashAccountId || 'HDFC Savings Account';
    return {
        id,
        loanId,
        amountPaise: resolvedAmountPaise,
        amount: paiseToRupees(resolvedAmountPaise),
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
    amountPaise = undefined,
    principalComponent = 0,
    principalComponentPaise = undefined,
    principalAmount = 0,
    principalPaid = 0,
    interestComponent = 0,
    interestComponentPaise = undefined,
    interestAmount = 0,
    interestPaid = 0,
    feeComponent = 0,
    feeComponentPaise = undefined,
    penaltyComponent = 0,
    penaltyComponentPaise = undefined,
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
    const resolvedAmountPaise = amountPaise !== undefined ? toBigIntPaise(amountPaise) : rupeesToPaise(amount);
    if (resolvedAmountPaise <= 0n) throw new Error('Repayment amount must be > 0.');

    const pComp = principalComponent !== 0 ? Number(principalComponent) : (Number(principalAmount) || Number(principalPaid) || 0);
    const iComp = interestComponent !== 0 ? Number(interestComponent) : (Number(interestAmount) || Number(interestPaid) || 0);
    const pPaise = principalComponentPaise !== undefined ? toBigIntPaise(principalComponentPaise) : rupeesToPaise(pComp);
    const iPaise = interestComponentPaise !== undefined ? toBigIntPaise(interestComponentPaise) : rupeesToPaise(iComp);
    const fPaise = feeComponentPaise !== undefined ? toBigIntPaise(feeComponentPaise) : rupeesToPaise(feeComponent);
    const penPaise = penaltyComponentPaise !== undefined ? toBigIntPaise(penaltyComponentPaise) : rupeesToPaise(penaltyComponent);

    const acc = accountId || cashAccountId || 'HDFC Savings Account';

    return {
        id,
        loanId,
        amountPaise: resolvedAmountPaise,
        amount: paiseToRupees(resolvedAmountPaise),
        principalComponentPaise: pPaise,
        interestComponentPaise: iPaise,
        feeComponentPaise: fPaise,
        penaltyComponentPaise: penPaise,
        principalComponent: paiseToRupees(pPaise),
        principalAmount: paiseToRupees(pPaise),
        principalPaid: paiseToRupees(pPaise),
        interestComponent: paiseToRupees(iPaise),
        interestAmount: paiseToRupees(iPaise),
        interestPaid: paiseToRupees(iPaise),
        feeComponent: paiseToRupees(fPaise),
        penaltyComponent: paiseToRupees(penPaise),
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
    openingPrincipalPaise = undefined,
    expectedPrincipal = 0,
    expectedPrincipalPaise = undefined,
    principalComponent = 0,
    expectedInterest = 0,
    expectedInterestPaise = undefined,
    interestComponent = 0,
    expectedFees = 0,
    expectedFeesPaise = undefined,
    expectedAmount = 0,
    expectedTotal = 0,
    expectedTotalPaise = undefined,
    paidPrincipal = 0,
    paidPrincipalPaise = undefined,
    paidInterest = 0,
    paidInterestPaise = undefined,
    paidFees = 0,
    paidFeesPaise = undefined,
    paidAmount = 0,
    paidTotal = 0,
    paidTotalPaise = undefined,
    remainingPrincipal = 0,
    remainingPrincipalPaise = undefined,
    closingPrincipal = 0,
    closingPrincipalPaise = undefined,
    status = SCHEDULE_STATUS.PENDING,
    paidDate = null
} = {}) {
    const oPaise = openingPrincipalPaise !== undefined ? toBigIntPaise(openingPrincipalPaise) : rupeesToPaise(openingPrincipal);
    const pExpPaise = expectedPrincipalPaise !== undefined 
        ? toBigIntPaise(expectedPrincipalPaise) 
        : rupeesToPaise(expectedPrincipal !== null && expectedPrincipal !== undefined && expectedPrincipal !== 0 ? expectedPrincipal : principalComponent);
    const iExpPaise = expectedInterestPaise !== undefined 
        ? toBigIntPaise(expectedInterestPaise) 
        : rupeesToPaise(expectedInterest !== null && expectedInterest !== undefined && expectedInterest !== 0 ? expectedInterest : interestComponent);
    const fExpPaise = expectedFeesPaise !== undefined ? toBigIntPaise(expectedFeesPaise) : rupeesToPaise(expectedFees);
    const totalExpPaise = expectedTotalPaise !== undefined 
        ? toBigIntPaise(expectedTotalPaise) 
        : (expectedTotal ? rupeesToPaise(expectedTotal) : (expectedAmount ? rupeesToPaise(expectedAmount) : (pExpPaise + iExpPaise + fExpPaise)));

    const pPaidPaise = paidPrincipalPaise !== undefined ? toBigIntPaise(paidPrincipalPaise) : rupeesToPaise(paidPrincipal);
    const iPaidPaise = paidInterestPaise !== undefined ? toBigIntPaise(paidInterestPaise) : rupeesToPaise(paidInterest);
    const fPaidPaise = paidFeesPaise !== undefined ? toBigIntPaise(paidFeesPaise) : rupeesToPaise(paidFees);
    const totalPaidPaise = paidTotalPaise !== undefined 
        ? toBigIntPaise(paidTotalPaise) 
        : (paidTotal ? rupeesToPaise(paidTotal) : (paidAmount ? rupeesToPaise(paidAmount) : (pPaidPaise + iPaidPaise + fPaidPaise)));

    const remainingTotalPaise = totalExpPaise > totalPaidPaise ? totalExpPaise - totalPaidPaise : 0n;
    const cPaise = closingPrincipalPaise !== undefined 
        ? toBigIntPaise(closingPrincipalPaise) 
        : (remainingPrincipalPaise !== undefined ? toBigIntPaise(remainingPrincipalPaise) : (closingPrincipal ? rupeesToPaise(closingPrincipal) : rupeesToPaise(remainingPrincipal)));

    return {
        id,
        loanId,
        installmentNumber: Number(installmentNumber) || 1,
        periodStart: periodStart || dueDate,
        periodEnd: periodEnd || dueDate,
        dueDate,
        openingPrincipalPaise: oPaise,
        expectedPrincipalPaise: pExpPaise,
        expectedInterestPaise: iExpPaise,
        expectedFeesPaise: fExpPaise,
        expectedTotalPaise: totalExpPaise,
        expectedAmountPaise: totalExpPaise,
        paidPrincipalPaise: pPaidPaise,
        paidInterestPaise: iPaidPaise,
        paidFeesPaise: fPaidPaise,
        paidTotalPaise: totalPaidPaise,
        paidAmountPaise: totalPaidPaise,
        remainingPrincipalPaise: cPaise,
        closingPrincipalPaise: cPaise,
        remainingTotalPaise,
        openingPrincipal: paiseToRupees(oPaise),
        expectedAmount: paiseToRupees(totalExpPaise),
        expectedTotal: paiseToRupees(totalExpPaise),
        expectedPrincipal: paiseToRupees(pExpPaise),
        expectedInterest: paiseToRupees(iExpPaise),
        expectedFees: paiseToRupees(fExpPaise),
        principalComponent: paiseToRupees(pExpPaise),
        interestComponent: paiseToRupees(iExpPaise),
        remainingPrincipal: paiseToRupees(cPaise),
        closingPrincipal: paiseToRupees(cPaise),
        paidAmount: paiseToRupees(totalPaidPaise),
        paidTotal: paiseToRupees(totalPaidPaise),
        paidPrincipal: paiseToRupees(pPaidPaise),
        paidInterest: paiseToRupees(iPaidPaise),
        paidFees: paiseToRupees(fPaidPaise),
        remainingTotal: paiseToRupees(remainingTotalPaise),
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
    debitPaise = undefined,
    creditPaise = undefined,
    currency = 'INR',
    component = 'PRINCIPAL', // 'PRINCIPAL' | 'INTEREST' | 'FEE' | 'PENALTY' | 'WAIVER' | 'CAPITAL'
    loanId = '',
    personId = ''
} = {}) {
    const dPaise = debitPaise !== undefined ? toBigIntPaise(debitPaise) : rupeesToPaise(debit);
    const cPaise = creditPaise !== undefined ? toBigIntPaise(creditPaise) : rupeesToPaise(credit);

    if (dPaise < 0n || cPaise < 0n) {
        throw new Error('Journal line debit and credit must be non-negative.');
    }
    if (dPaise > 0n && cPaise > 0n) {
        throw new Error('Journal line cannot have both positive debit and positive credit.');
    }

    return {
        id,
        accountType,
        accountId,
        debitPaise: dPaise,
        creditPaise: cPaise,
        debit: paiseToRupees(dPaise),
        credit: paiseToRupees(cPaise),
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
    amountPaise = undefined,
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
            const dAmt = d.amountPaise !== undefined ? toBigIntPaise(d.amountPaise) : (d.paise !== undefined ? toBigIntPaise(d.paise) : rupeesToPaise(d.amount));
            finalLines.push(createJournalLine({
                id: `jl_${finalId}_d${idx}`,
                accountType: d.accountType || (d.account.includes('RECEIVABLE') || d.account.includes('CASH') || d.account.includes('BANK') ? 'ASSET' : (d.account.includes('EXPENSE') ? 'EXPENSE' : 'LIABILITY')),
                accountId: d.account || d.accountId || 'ASSET_P2P_RECEIVABLE',
                debitPaise: dAmt,
                creditPaise: 0n,
                component: d.component || 'PRINCIPAL',
                loanId: finalEntityId
            }));
        });
        (credits || []).forEach((c, idx) => {
            const cAmt = c.amountPaise !== undefined ? toBigIntPaise(c.amountPaise) : (c.paise !== undefined ? toBigIntPaise(c.paise) : rupeesToPaise(c.amount));
            finalLines.push(createJournalLine({
                id: `jl_${finalId}_c${idx}`,
                accountType: c.accountType || (c.account.includes('PAYABLE') ? 'LIABILITY' : (c.account.includes('INCOME') ? 'INCOME' : 'ASSET')),
                accountId: c.account || c.accountId || 'acc_cash',
                debitPaise: 0n,
                creditPaise: cAmt,
                component: c.component || (c.account.includes('INTEREST') ? 'INTEREST' : 'PRINCIPAL'),
                loanId: finalEntityId
            }));
        });
    }

    // Validate balance invariant: sum(debits) === sum(credits) in integer paise
    const totalDebitsPaise = finalLines.reduce((sum, l) => sum + (l.debitPaise !== undefined ? l.debitPaise : rupeesToPaise(l.debit)), 0n);
    const totalCreditsPaise = finalLines.reduce((sum, l) => sum + (l.creditPaise !== undefined ? l.creditPaise : rupeesToPaise(l.credit)), 0n);

    if (totalDebitsPaise !== totalCreditsPaise) {
        throw new Error(`Double-entry journal entry is unbalanced! Total debits: ₹${paiseToRupees(totalDebitsPaise)}, Total credits: ₹${paiseToRupees(totalCreditsPaise)}`);
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
        debits: finalLines.filter(l => (l.debitPaise || 0n) > 0n || l.debit > 0).map(l => ({ account: l.accountId, amount: l.debit, amountPaise: l.debitPaise, component: l.component })),
        credits: finalLines.filter(l => (l.creditPaise || 0n) > 0n || l.credit > 0).map(l => ({ account: l.accountId, amount: l.credit, amountPaise: l.creditPaise, component: l.component })),
        accountFrom,
        accountTo,
        totalDebitsPaise,
        totalCreditsPaise,
        isBalanced: totalDebitsPaise === totalCreditsPaise,
        amountPaise: totalDebitsPaise,
        amount: paiseToRupees(totalDebitsPaise),
        currency,
        metadata: metadata || {},
        reversesJournalEntryId: reversesJournalEntryId || null,
        reversalReason: reversalReason || null,
        isReversal: Boolean(reversesJournalEntryId || eventType === JOURNAL_EVENT_TYPES.P2P_REVERSAL),
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
    principalOutstandingPaise = undefined,
    interestOutstandingPaise = undefined,
    feesOutstandingPaise = undefined,
    waiverAmountPaise = undefined,
    finalSettlementAmountPaise = undefined,
    settlementAccount = 'HDFC Savings Account',
    journalEntryId = '',
    direction = LOAN_DIRECTION.GIVEN,
    createdAt = new Date().toISOString()
} = {}) {
    const pPaise = principalOutstandingPaise !== undefined ? toBigIntPaise(principalOutstandingPaise) : rupeesToPaise(principalOutstanding);
    const iPaise = interestOutstandingPaise !== undefined ? toBigIntPaise(interestOutstandingPaise) : rupeesToPaise(interestOutstanding);
    const fPaise = feesOutstandingPaise !== undefined ? toBigIntPaise(feesOutstandingPaise) : rupeesToPaise(feesOutstanding);
    const wPaise = waiverAmountPaise !== undefined ? toBigIntPaise(waiverAmountPaise) : rupeesToPaise(waiverAmount);
    const finalPaise = finalSettlementAmountPaise !== undefined ? toBigIntPaise(finalSettlementAmountPaise) : (finalSettlementAmount ? rupeesToPaise(finalSettlementAmount) : (pPaise + iPaise + fPaise - wPaise));

    return {
        id,
        loanId,
        personId,
        settlementDate,
        principalOutstandingPaise: pPaise,
        interestOutstandingPaise: iPaise,
        feesOutstandingPaise: fPaise,
        waiverAmountPaise: wPaise,
        finalSettlementAmountPaise: finalPaise,
        principalOutstanding: paiseToRupees(pPaise),
        interestOutstanding: paiseToRupees(iPaise),
        feesOutstanding: paiseToRupees(fPaise),
        waiverAmount: paiseToRupees(wPaise),
        finalSettlementAmount: paiseToRupees(finalPaise),
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
    idempotencyKey = null,
    payload = {},
    journalEntryId = null,
    resultPayload = null,
    createdAt = new Date().toISOString(),
    committedAt = null,
    error = null
} = {}) {
    return {
        id,
        operationType,
        status,
        idempotencyKey,
        payload,
        journalEntryId,
        resultPayload,
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
