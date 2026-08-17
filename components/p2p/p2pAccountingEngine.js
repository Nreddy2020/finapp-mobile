/**
 * FinLife P2P Loans — Authoritative Double-Entry Accounting Engine
 * Implements rigorous loan math, amortization, interest accrual timeline,
 * allocation policies, dynamic schedule recalculation, and journal entry generation.
 */

import {
    LOAN_DIRECTION,
    LOAN_TYPES,
    LOAN_STATUS,
    LOAN_STATUSES,
    INTEREST_METHOD,
    INTEREST_METHODS,
    REPAYMENT_ALLOCATION,
    REPAYMENT_ALLOCATIONS,
    SCHEDULE_STATUS,
    SCHEDULE_STATUSES,
    JOURNAL_EVENT_TYPES,
    createRepaymentScheduleItem,
    createJournalEntry
} from './p2pDomainModel.js';

export {
    LOAN_DIRECTION,
    LOAN_TYPES,
    LOAN_STATUS,
    LOAN_STATUSES,
    INTEREST_METHOD,
    INTEREST_METHODS,
    REPAYMENT_ALLOCATION,
    REPAYMENT_ALLOCATIONS,
    SCHEDULE_STATUS,
    SCHEDULE_STATUSES,
    JOURNAL_EVENT_TYPES
};

/**
 * Helper to add calendar months to a YYYY-MM-DD date string
 */
function addMonthsToDate(dateStr, monthsToAdd) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + monthsToAdd);
    return d.toISOString().split('T')[0];
}

/**
 * Calculates primary loan characteristics and installment projections
 */
export function calculateLoanDNA(loan = {}) {
    const principal = Math.max(0, Number(loan.principal) || 0);
    const annualRate = Math.max(0, Number(loan.interestRate) || 0);
    const tenureMonths = Math.max(1, Number(loan.tenureMonths) || 12);
    const method = loan.interestMethod || INTEREST_METHOD.SIMPLE;

    const monthlyRate = (annualRate / 100) / 12;

    let expectedMonthlyPayment = 0;
    let totalExpectedInterest = 0;

    if (method === INTEREST_METHOD.NO_INTEREST || annualRate === 0) {
        expectedMonthlyPayment = tenureMonths > 0 ? principal / tenureMonths : principal;
        totalExpectedInterest = 0;
    } else if (method === INTEREST_METHOD.AMORTIZED) {
        if (monthlyRate > 0) {
            const factor = Math.pow(1 + monthlyRate, tenureMonths);
            expectedMonthlyPayment = (principal * monthlyRate * factor) / (factor - 1);
            totalExpectedInterest = (expectedMonthlyPayment * tenureMonths) - principal;
        } else {
            expectedMonthlyPayment = principal / tenureMonths;
            totalExpectedInterest = 0;
        }
    } else {
        // Default: SIMPLE INTEREST
        totalExpectedInterest = principal * (annualRate / 100) * (tenureMonths / 12);
        expectedMonthlyPayment = (principal + totalExpectedInterest) / tenureMonths;
    }

    const totalExpectedRepayment = principal + totalExpectedInterest;

    return {
        principal,
        annualRate,
        monthlyRate,
        tenureMonths,
        method,
        expectedMonthlyPayment: Number(expectedMonthlyPayment.toFixed(2)),
        monthlyInstallment: Number(expectedMonthlyPayment.toFixed(2)),
        totalExpectedInterest: Number(totalExpectedInterest.toFixed(2)),
        totalInterest: Number(totalExpectedInterest.toFixed(2)),
        totalExpectedRepayment: Number(totalExpectedRepayment.toFixed(2)),
        totalPayable: Number(totalExpectedRepayment.toFixed(2))
    };
}

/**
 * Generates initial repayment schedule for a new loan
 */
export function generateInitialSchedule(loan = {}) {
    const loanId = loan.id || loan.loanId || `loan_${Date.now()}`;
    const dna = calculateLoanDNA(loan);
    const startDate = loan.startDate || new Date().toISOString().split('T')[0];

    const schedule = [];
    let remainingPrincipal = dna.principal;

    for (let i = 1; i <= dna.tenureMonths; i++) {
        const dueDate = addMonthsToDate(startDate, i);
        let interestComponent = 0;
        let principalComponent = 0;
        let expectedAmount = 0;

        if (dna.method === INTEREST_METHOD.AMORTIZED) {
            interestComponent = remainingPrincipal * dna.monthlyRate;
            principalComponent = dna.expectedMonthlyPayment - interestComponent;
            if (i === dna.tenureMonths) {
                principalComponent = remainingPrincipal;
            }
            expectedAmount = principalComponent + interestComponent;
            remainingPrincipal = Math.max(0, remainingPrincipal - principalComponent);
        } else if (dna.method === INTEREST_METHOD.NO_INTEREST) {
            principalComponent = dna.expectedMonthlyPayment;
            interestComponent = 0;
            expectedAmount = principalComponent;
            remainingPrincipal = Math.max(0, remainingPrincipal - principalComponent);
        } else {
            // SIMPLE INTEREST
            const monthlyInterest = (dna.principal * (dna.annualRate / 100)) / 12;
            const monthlyPrincipal = dna.principal / dna.tenureMonths;
            interestComponent = monthlyInterest;
            principalComponent = i === dna.tenureMonths ? remainingPrincipal : monthlyPrincipal;
            expectedAmount = principalComponent + interestComponent;
            remainingPrincipal = Math.max(0, remainingPrincipal - principalComponent);
        }

        schedule.push(createRepaymentScheduleItem({
            id: `sch_${loanId}_${i}`,
            loanId,
            installmentNumber: i,
            dueDate,
            expectedAmount: Number(expectedAmount.toFixed(2)),
            expectedTotal: Number(expectedAmount.toFixed(2)),
            expectedPrincipal: Number(principalComponent.toFixed(2)),
            expectedInterest: Number(interestComponent.toFixed(2)),
            principalComponent: Number(principalComponent.toFixed(2)),
            interestComponent: Number(interestComponent.toFixed(2)),
            remainingPrincipal: Number(remainingPrincipal.toFixed(2)),
            status: SCHEDULE_STATUS.PENDING
        }));
    }

    return schedule;
}

/**
 * Allocates a repayment amount across Principal, Interest, and Fees
 * according to the loan's explicit Repayment Allocation Policy
 */
export function allocateRepayment({
    loan = null,
    amount = 0,
    paymentAmount = null,
    currentOutstandingPrincipal = 0,
    expectedPrincipal = null,
    unpaidAccruedInterest = 0,
    expectedInterest = null,
    allocationPolicy = null,
    policy = null
} = {}) {
    const totalPaid = Math.max(0, Number(paymentAmount !== null ? paymentAmount : amount) || 0);
    const finalPolicy = policy || allocationPolicy || (loan && loan.repaymentAllocation) || REPAYMENT_ALLOCATION.INTEREST_FIRST;
    const principal = Math.max(0, Number(expectedPrincipal !== null ? expectedPrincipal : currentOutstandingPrincipal) || 0);
    const interest = Math.max(0, Number(expectedInterest !== null ? expectedInterest : unpaidAccruedInterest) || 0);

    let interestComponent = 0;
    let principalComponent = 0;

    if (finalPolicy === REPAYMENT_ALLOCATION.INTEREST_FIRST) {
        interestComponent = Math.min(totalPaid, interest);
        const remainingAfterInterest = totalPaid - interestComponent;
        principalComponent = Math.min(remainingAfterInterest, principal);
    } else if (finalPolicy === REPAYMENT_ALLOCATION.PRINCIPAL_FIRST) {
        principalComponent = Math.min(totalPaid, principal);
        const remainingAfterPrincipal = totalPaid - principalComponent;
        interestComponent = Math.min(remainingAfterPrincipal, interest);
    } else {
        // PROPORTIONAL
        const totalDue = principal + interest;
        if (totalDue > 0) {
            const pRatio = principal / totalDue;
            principalComponent = Math.min(principal, totalPaid * pRatio);
            interestComponent = Math.min(interest, totalPaid - principalComponent);
        } else {
            principalComponent = Math.min(totalPaid, principal);
            interestComponent = totalPaid - principalComponent;
        }
    }

    const remainingPrincipalAfter = Math.max(0, principal - principalComponent);
    const remainingInterestAfter = Math.max(0, interest - interestComponent);

    return {
        amount: totalPaid,
        principalPaid: Number(principalComponent.toFixed(2)),
        interestPaid: Number(interestComponent.toFixed(2)),
        principalComponent: Number(principalComponent.toFixed(2)),
        interestComponent: Number(interestComponent.toFixed(2)),
        remainingPrincipalAfter: Number(remainingPrincipalAfter.toFixed(2)),
        remainingInterestAfter: Number(remainingInterestAfter.toFixed(2))
    };
}

/**
 * Recalculates future schedule items when a payment (full or partial) is recorded
 * Preserves past history without mutating paid records
 */
export function recalculateScheduleAfterPayment({
    loan = null,
    currentSchedule = null,
    existingSchedule = null,
    targetScheduleItemId = null,
    repayment = null,
    paymentAmount = null,
    paymentDate = null,
    allocationPolicy = 'INTEREST_FIRST',
    asOfDate = new Date().toISOString().split('T')[0]
} = {}) {
    const rawSchedule = currentSchedule || existingSchedule || [];
    const updatedSchedule = rawSchedule.map(item => ({ ...item }));

    const targetId = targetScheduleItemId || (repayment && repayment.scheduleItemId);
    const targetIdx = updatedSchedule.findIndex(s => s.id === targetId || s.status === SCHEDULE_STATUS.PENDING || s.status === SCHEDULE_STATUS.PARTIALLY_PAID);

    if (targetIdx !== -1) {
        const item = updatedSchedule[targetIdx];
        const payAmt = paymentAmount !== null ? Number(paymentAmount) : (repayment ? Number(repayment.amount) : 0);
        const pDate = paymentDate || (repayment ? repayment.date : asOfDate);

        const currentExpPrincipal = (item.expectedPrincipal || item.principalComponent || 0) - (item.paidPrincipal || 0);
        const currentExpInterest = (item.expectedInterest || item.interestComponent || 0) - (item.paidInterest || 0);

        const alloc = allocateRepayment({
            paymentAmount: payAmt,
            expectedPrincipal: currentExpPrincipal,
            expectedInterest: currentExpInterest,
            policy: allocationPolicy
        });

        const newPaidAmount = (item.paidAmount || item.paidTotal || 0) + payAmt;
        const newPaidPrincipal = (item.paidPrincipal || 0) + alloc.principalPaid;
        const newPaidInterest = (item.paidInterest || 0) + alloc.interestPaid;

        const totalExpected = item.expectedTotal || item.expectedAmount || (item.principalComponent + item.interestComponent);
        const remaining = Math.max(0, totalExpected - newPaidAmount);

        item.paidAmount = Number(newPaidAmount.toFixed(2));
        item.paidTotal = Number(newPaidAmount.toFixed(2));
        item.paidPrincipal = Number(newPaidPrincipal.toFixed(2));
        item.paidInterest = Number(newPaidInterest.toFixed(2));
        item.remainingTotal = Number(remaining.toFixed(2));
        item.paidDate = pDate;

        if (newPaidAmount >= totalExpected - 0.01) {
            item.status = SCHEDULE_STATUS.PAID;
            item.remainingTotal = 0;
        } else {
            item.status = SCHEDULE_STATUS.PARTIALLY_PAID;
        }
    }

    return updatedSchedule;
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${monthNames[d.getMonth()]}`;
    } catch {
        return dateStr;
    }
}

/**
 * Computes month-by-month accrued interest timeline
 */
export function calculateInterestTimeline({
    loan = {},
    schedule = [],
    advances = [],
    repayments = [],
    currentDate = null,
    asOfDate = new Date().toISOString().split('T')[0]
} = {}) {
    const dna = calculateLoanDNA(loan);
    const totalPrincipal = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || dna.principal;
    const monthlyRatePct = (dna.annualRate / 12);
    const monthlyInterestNominal = (totalPrincipal * (dna.annualRate / 100)) / 12;

    const monthsTimeline = [];
    let totalAccrued = 0;
    let totalPaid = 0;

    const startDate = loan.startDate || '2026-04-06';
    const effectiveDate = currentDate || asOfDate;

    if (Array.isArray(schedule) && schedule.length > 0) {
        schedule.forEach((item, idx) => {
            const periodInterest = item.expectedInterest || item.interestComponent || monthlyInterestNominal;
            const paidInWindow = item.paidInterest || (item.status === 'PAID' ? periodInterest : 0);
            totalAccrued += periodInterest;
            totalPaid += paidInWindow;

            const isCurrent = item.status !== 'PAID' && idx === schedule.findIndex(s => s.status !== 'PAID');
            monthsTimeline.push({
                monthIndex: item.installmentNumber || (idx + 1),
                dateRange: `${formatDateShort(item.dueDate || startDate)} - ${formatDateShort(addMonthsToDate(item.dueDate || startDate, 1))}`,
                periodLabel: `Month ${item.installmentNumber || (idx + 1)}`,
                accruedAmount: Number(periodInterest.toFixed(2)),
                paidAmount: Number(paidInWindow.toFixed(2)),
                status: item.status,
                isCurrent
            });
        });
    } else {
        const numMonths = Math.min(dna.tenureMonths, 12);
        for (let i = 1; i <= numMonths; i++) {
            const periodStart = addMonthsToDate(startDate, i - 1);
            const periodEnd = addMonthsToDate(startDate, i);
            const periodInterest = Number(monthlyInterestNominal.toFixed(2));
            totalAccrued += periodInterest;

            const paidInWindow = repayments
                .filter(r => (r.date || r.paymentDate) >= periodStart && (r.date || r.paymentDate) <= periodEnd)
                .reduce((sum, r) => sum + (Number(r.interestComponent || r.interestPaid) || 0), 0);

            totalPaid += paidInWindow;
            let status = 'Upcoming';
            if (periodEnd <= effectiveDate) {
                status = paidInWindow >= periodInterest - 1 ? 'Paid' : (paidInWindow > 0 ? 'Partially Paid' : 'Overdue');
            }

            monthsTimeline.push({
                monthIndex: i,
                dateRange: `${formatDateShort(periodStart)} - ${formatDateShort(periodEnd)}`,
                periodLabel: `${formatDateShort(periodStart)} → ${formatDateShort(periodEnd)}`,
                periodStart,
                periodEnd,
                accruedAmount: periodInterest,
                paidAmount: Number(paidInWindow.toFixed(2)),
                status,
                isCurrent: i === 1
            });
        }
    }

    const outstanding = Math.max(0, totalAccrued - totalPaid);

    return {
        annualRate: dna.annualRate,
        monthlyRatePct: Number(monthlyRatePct.toFixed(2)),
        totalAccrued: Number(totalAccrued.toFixed(2)),
        totalPaid: Number(totalPaid.toFixed(2)),
        totalInterestIncurred: Number(totalAccrued.toFixed(2)),
        totalInterestPaid: Number(totalPaid.toFixed(2)),
        outstandingInterest: Number(outstanding.toFixed(2)),
        interestOutstanding: Number(outstanding.toFixed(2)),
        timeline: monthsTimeline,
        monthTimeline: monthsTimeline
    };
}

/**
 * Calculates final settlement reconciliation quote
 */
export function calculateSettlementQuote({
    loan = {},
    schedule = [],
    advances = [],
    repayments = [],
    settlementDate = null,
    waiverAmount = 0
} = {}) {
    const totalAdvanced = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || Number(loan.principal) || 0;
    const principalRepaid = repayments.reduce((sum, r) => sum + (Number(r.principalComponent || r.principalPaid) || 0), 0);
    const principalOutstanding = loan.outstandingPrincipal !== undefined && loan.outstandingPrincipal !== null
        ? Number(loan.outstandingPrincipal)
        : Math.max(0, totalAdvanced - principalRepaid);

    const timeline = calculateInterestTimeline({ loan, schedule, advances, repayments, asOfDate: settlementDate });
    const interestOutstanding = timeline.outstandingInterest || (timeline.totalAccrued - timeline.totalPaid);

    const waiver = Math.max(0, Number(waiverAmount) || 0);
    const settlementAmount = Math.max(0, (principalOutstanding + interestOutstanding) - waiver);

    return {
        loanId: loan.id,
        totalAdvanced,
        principalRepaid,
        principalOutstanding: Number(principalOutstanding.toFixed(2)),
        outstandingPrincipal: Number(principalOutstanding.toFixed(2)),
        interestAccrued: timeline.totalAccrued,
        accruedUnpaidInterest: Number(interestOutstanding.toFixed(2)),
        interestRepaid: timeline.totalPaid,
        interestOutstanding: Number(interestOutstanding.toFixed(2)),
        waiverAmount: waiver,
        settlementAmount: Number(settlementAmount.toFixed(2)),
        finalSettlementAmount: Number(settlementAmount.toFixed(2)),
        direction: loan.direction || loan.type || LOAN_DIRECTION.GIVEN
    };
}

/**
 * Generates an immutable, balanced Double-Entry Journal Entry for any P2P financial event
 */
export function createDoubleEntryJournalForEvent({
    eventType = JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
    sourceEntityId = '',
    sourceEventId = '',
    timestamp = null,
    cashAccountId = null,
    cashAccountName = '',
    accountId = 'HDFC Savings Account',
    principalAmount = null,
    interestAmount = null,
    waiverAmount = 0,
    counterpartyName = '',
    loan = null,
    advance = null,
    repayment = null,
    settlement = null,
    date = new Date().toISOString().split('T')[0],
    note = ''
} = {}) {
    const resolvedEntityId = sourceEntityId || (loan ? loan.id : 'unknown_loan');
    const resolvedTimestamp = timestamp || `${date}T${new Date().toISOString().split('T')[1] || '12:00:00.000Z'}`;
    const targetAccount = cashAccountId || accountId || 'HDFC Savings Account';

    // Normalize event type key
    const evType = JOURNAL_EVENT_TYPES[eventType] || eventType;

    if (evType === JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN || evType === JOURNAL_EVENT_TYPES.P2P_ADVANCE_GIVEN) {
        const amt = principalAmount !== null ? Number(principalAmount) : (advance ? advance.amount : (loan ? loan.principal : 0));
        return createJournalEntry({
            eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
            sourceEntityId: resolvedEntityId,
            sourceEventId: sourceEventId || (advance ? advance.id : `disb_${resolvedEntityId}`),
            timestamp: resolvedTimestamp,
            accountFrom: targetAccount,
            accountTo: 'ASSET_P2P_RECEIVABLE',
            amount: amt,
            debits: [{ account: 'ASSET_P2P_RECEIVABLE', amount: amt, type: 'ASSET_INCREASE' }],
            credits: [{ account: targetAccount, amount: amt, type: 'CASH_DECREASE' }],
            idempotencyKey: `JE:P2P_LOAN_GIVEN:${resolvedEntityId}:${sourceEventId || 'init'}`,
            note: note || `Loan disbursement given to ${counterpartyName || 'Borrower'}`
        });
    }

    if (evType === JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN || evType === JOURNAL_EVENT_TYPES.P2P_ADVANCE_TAKEN) {
        const amt = principalAmount !== null ? Number(principalAmount) : (advance ? advance.amount : (loan ? loan.principal : 0));
        return createJournalEntry({
            eventType: JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN,
            sourceEntityId: resolvedEntityId,
            sourceEventId: sourceEventId || (advance ? advance.id : `disb_${resolvedEntityId}`),
            timestamp: resolvedTimestamp,
            accountFrom: 'LIABILITY_P2P_PAYABLE',
            accountTo: targetAccount,
            amount: amt,
            debits: [{ account: targetAccount, amount: amt, type: 'CASH_INCREASE' }],
            credits: [{ account: 'LIABILITY_P2P_PAYABLE', amount: amt, type: 'LIABILITY_INCREASE' }],
            idempotencyKey: `JE:P2P_LOAN_TAKEN:${resolvedEntityId}:${sourceEventId || 'init'}`,
            note: note || `Loan borrowed from ${counterpartyName || 'Lender'}`
        });
    }

    if (evType === JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED) {
        const pAmt = principalAmount !== null ? Number(principalAmount) : (repayment ? Number(repayment.principalComponent || repayment.principalPaid) : 0);
        const iAmt = interestAmount !== null ? Number(interestAmount) : (repayment ? Number(repayment.interestComponent || repayment.interestPaid) : 0);
        const total = pAmt + iAmt;

        return createJournalEntry({
            eventType: JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED,
            sourceEntityId: resolvedEntityId,
            sourceEventId: sourceEventId || (repayment ? repayment.id : `rep_${resolvedEntityId}`),
            timestamp: resolvedTimestamp,
            accountFrom: 'ASSET_P2P_RECEIVABLE',
            accountTo: targetAccount,
            amount: total,
            debits: [{ account: targetAccount, amount: total, type: 'CASH_INCREASE' }],
            credits: [
                { account: 'ASSET_P2P_RECEIVABLE', amount: pAmt, type: 'ASSET_DECREASE' },
                { account: 'INCOME_P2P_INTEREST', amount: iAmt, type: 'INCOME_INCREASE' }
            ],
            idempotencyKey: `JE:P2P_REPAYMENT_RECEIVED:${resolvedEntityId}:${sourceEventId || 'inst'}`,
            note: note || `Repayment received from ${counterpartyName || 'Borrower'}`
        });
    }

    if (evType === JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID) {
        const pAmt = principalAmount !== null ? Number(principalAmount) : (repayment ? Number(repayment.principalComponent || repayment.principalPaid) : 0);
        const iAmt = interestAmount !== null ? Number(interestAmount) : (repayment ? Number(repayment.interestComponent || repayment.interestPaid) : 0);
        const total = pAmt + iAmt;

        return createJournalEntry({
            eventType: JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID,
            sourceEntityId: resolvedEntityId,
            sourceEventId: sourceEventId || (repayment ? repayment.id : `rep_${resolvedEntityId}`),
            timestamp: resolvedTimestamp,
            accountFrom: targetAccount,
            accountTo: 'LIABILITY_P2P_PAYABLE',
            amount: total,
            debits: [
                { account: 'LIABILITY_P2P_PAYABLE', amount: pAmt, type: 'LIABILITY_DECREASE' },
                { account: 'EXPENSE_P2P_INTEREST', amount: iAmt, type: 'EXPENSE_INCREASE' }
            ],
            credits: [{ account: targetAccount, amount: total, type: 'CASH_DECREASE' }],
            idempotencyKey: `JE:P2P_REPAYMENT_PAID:${resolvedEntityId}:${sourceEventId || 'inst'}`,
            note: note || `Loan repayment paid to ${counterpartyName || 'Lender'}`
        });
    }

    if (evType === JOURNAL_EVENT_TYPES.P2P_SETTLEMENT) {
        const pAmt = principalAmount !== null ? Number(principalAmount) : (settlement ? Number(settlement.principalOutstanding) : 0);
        const iAmt = interestAmount !== null ? Number(interestAmount) : (settlement ? Number(settlement.interestOutstanding || settlement.accruedUnpaidInterest) : 0);
        const wAmt = waiverAmount !== null ? Number(waiverAmount) : (settlement ? Number(settlement.waiverAmount) : 0);
        const netSettlement = Math.max(0, pAmt + iAmt - wAmt);
        const isGiven = !loan || loan.direction === LOAN_DIRECTION.GIVEN || loan.type === LOAN_DIRECTION.GIVEN;

        return createJournalEntry({
            eventType: JOURNAL_EVENT_TYPES.P2P_SETTLEMENT,
            sourceEntityId: resolvedEntityId,
            sourceEventId: sourceEventId || `settle_${resolvedEntityId}_${Date.now()}`,
            timestamp: resolvedTimestamp,
            accountFrom: isGiven ? 'ASSET_P2P_RECEIVABLE' : targetAccount,
            accountTo: isGiven ? targetAccount : 'LIABILITY_P2P_PAYABLE',
            amount: netSettlement,
            debits: isGiven
                ? [{ account: targetAccount, amount: netSettlement, type: 'CASH_INCREASE' }]
                : [
                    { account: 'LIABILITY_P2P_PAYABLE', amount: pAmt, type: 'LIABILITY_DECREASE' },
                    { account: 'EXPENSE_P2P_INTEREST', amount: iAmt, type: 'EXPENSE_INCREASE' }
                  ],
            credits: isGiven
                ? [
                    { account: 'ASSET_P2P_RECEIVABLE', amount: pAmt, type: 'ASSET_DECREASE' },
                    { account: 'INCOME_P2P_INTEREST', amount: iAmt, type: 'INCOME_INCREASE' }
                  ]
                : [{ account: targetAccount, amount: netSettlement, type: 'CASH_DECREASE' }],
            idempotencyKey: `JE:P2P_SETTLEMENT:${resolvedEntityId}:${date}`,
            note: note || `Full Settlement of Loan #${resolvedEntityId}`
        });
    }

    throw new Error(`Unsupported eventType for journal creation: ${eventType}`);
}
