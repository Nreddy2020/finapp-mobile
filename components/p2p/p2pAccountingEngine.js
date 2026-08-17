/**
 * FinLife P2P Loans — Authoritative Double-Entry Accounting Engine
 * Implements rigorous declining-balance loan math, amortization, interest accrual timeline,
 * allocation policies, dynamic schedule recalculation, relationship netting, and journal projection replay.
 */

import {
    LOAN_DIRECTION,
    LOAN_TYPES,
    LOAN_STATUS,
    LOAN_STATUSES,
    INTEREST_METHOD,
    INTEREST_METHODS,
    INTEREST_ACCRUAL_BASIS,
    REPAYMENT_ALLOCATION,
    REPAYMENT_ALLOCATIONS,
    SCHEDULE_STATUS,
    SCHEDULE_STATUSES,
    JOURNAL_EVENT_TYPES,
    createRepaymentScheduleItem,
    createJournalEntry,
    createJournalLine,
    createPersonRelationship,
    createSettlementRecord
} from './p2pDomainModel.js';

export {
    LOAN_DIRECTION,
    LOAN_TYPES,
    LOAN_STATUS,
    LOAN_STATUSES,
    INTEREST_METHOD,
    INTEREST_METHODS,
    INTEREST_ACCRUAL_BASIS,
    REPAYMENT_ALLOCATION,
    REPAYMENT_ALLOCATIONS,
    SCHEDULE_STATUS,
    SCHEDULE_STATUSES,
    JOURNAL_EVENT_TYPES
};

/**
 * Helper to add calendar months to a YYYY-MM-DD date string
 */
export function addMonthsToDate(dateStr, monthsToAdd) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // 0-indexed
        const day = parseInt(parts[2], 10);
        const d = new Date(Date.UTC(year, month + monthsToAdd, day));
        return d.toISOString().split('T')[0];
    }
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

    const annualRateDecimal = annualRate / 100;
    const monthlyRate = annualRateDecimal / 12;

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
        // DECLINING-BALANCE SIMPLE INTEREST:
        // Monthly principal = P / tenure
        // Opening balance for month m = P - (m-1)*(P/tenure)
        // Sum of interest = sum(P_m * r / 12)
        const monthlyPrincipal = principal / tenureMonths;
        let cumulativeInterest = 0;
        for (let m = 1; m <= tenureMonths; m++) {
            const opening = Math.max(0, principal - (m - 1) * monthlyPrincipal);
            const mInterest = opening * (annualRateDecimal / 12);
            cumulativeInterest += mInterest;
        }
        totalExpectedInterest = cumulativeInterest;
        expectedMonthlyPayment = (principal + totalExpectedInterest) / tenureMonths;
    }

    const totalExpectedRepayment = principal + totalExpectedInterest;

    return {
        principal,
        annualRate,
        annualRateDecimal,
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
 * Generates initial declining-balance repayment schedule for a new loan
 */
export function generateInitialSchedule(loan = {}) {
    const loanId = loan.id || loan.loanId || `loan_${Date.now()}`;
    const dna = calculateLoanDNA(loan);
    const startDate = loan.startDate || new Date().toISOString().split('T')[0];

    const schedule = [];
    let currentOpeningPrincipal = dna.principal;
    const monthlyPrincipalBase = dna.principal / dna.tenureMonths;

    let previousPeriodEnd = startDate;

    for (let i = 1; i <= dna.tenureMonths; i++) {
        const dueDate = addMonthsToDate(startDate, i);
        const periodStart = previousPeriodEnd;
        const periodEnd = dueDate;
        previousPeriodEnd = dueDate;

        let interestComponent = 0;
        let principalComponent = 0;
        let expectedAmount = 0;

        // Interest on opening principal of the period:
        // expectedInterest = round(openingPrincipal * (annualRate / 100) * (1/12), 2)
        interestComponent = Number((currentOpeningPrincipal * (dna.annualRateDecimal / 12)).toFixed(2));

        if (dna.method === INTEREST_METHOD.AMORTIZED) {
            if (dna.monthlyRate > 0) {
                // If last installment, adjust principal exactly to remaining
                if (i === dna.tenureMonths) {
                    principalComponent = currentOpeningPrincipal;
                } else {
                    principalComponent = Number((dna.expectedMonthlyPayment - interestComponent).toFixed(2));
                }
            } else {
                principalComponent = i === dna.tenureMonths ? currentOpeningPrincipal : monthlyPrincipalBase;
            }
            expectedAmount = principalComponent + interestComponent;
        } else if (dna.method === INTEREST_METHOD.NO_INTEREST) {
            interestComponent = 0;
            principalComponent = i === dna.tenureMonths ? currentOpeningPrincipal : monthlyPrincipalBase;
            expectedAmount = principalComponent;
        } else {
            // SIMPLE INTEREST (Declining Balance)
            principalComponent = i === dna.tenureMonths ? currentOpeningPrincipal : Number(monthlyPrincipalBase.toFixed(2));
            expectedAmount = principalComponent + interestComponent;
        }

        const closingPrincipal = Math.max(0, currentOpeningPrincipal - principalComponent);

        schedule.push(createRepaymentScheduleItem({
            id: `sch_${loanId}_${i}`,
            loanId,
            installmentNumber: i,
            periodStart,
            periodEnd,
            dueDate,
            openingPrincipal: Number(currentOpeningPrincipal.toFixed(2)),
            expectedAmount: Number(expectedAmount.toFixed(2)),
            expectedTotal: Number(expectedAmount.toFixed(2)),
            expectedPrincipal: Number(principalComponent.toFixed(2)),
            expectedInterest: Number(interestComponent.toFixed(2)),
            principalComponent: Number(principalComponent.toFixed(2)),
            interestComponent: Number(interestComponent.toFixed(2)),
            remainingPrincipal: Number(closingPrincipal.toFixed(2)),
            closingPrincipal: Number(closingPrincipal.toFixed(2)),
            status: SCHEDULE_STATUS.PENDING
        }));

        currentOpeningPrincipal = closingPrincipal;
    }

    return schedule;
}

/**
 * Allocates a repayment amount across Fees, Interest, and Principal
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
    unpaidFees = 0,
    expectedFees = null,
    allocationPolicy = null,
    policy = null
} = {}) {
    const totalPaid = Math.max(0, Number(paymentAmount !== null ? paymentAmount : amount) || 0);
    const finalPolicy = policy || allocationPolicy || (loan && loan.repaymentAllocation) || REPAYMENT_ALLOCATION.INTEREST_FIRST;
    const principal = Math.max(0, Number(expectedPrincipal !== null ? expectedPrincipal : currentOutstandingPrincipal) || 0);
    const interest = Math.max(0, Number(expectedInterest !== null ? expectedInterest : unpaidAccruedInterest) || 0);
    const fees = Math.max(0, Number(expectedFees !== null ? expectedFees : unpaidFees) || 0);

    let feePaid = 0;
    let interestPaid = 0;
    let principalPaid = 0;
    let remainingToAllocate = totalPaid;

    if (finalPolicy === REPAYMENT_ALLOCATION.FEES_FIRST) {
        feePaid = Math.min(remainingToAllocate, fees);
        remainingToAllocate -= feePaid;
        interestPaid = Math.min(remainingToAllocate, interest);
        remainingToAllocate -= interestPaid;
        principalPaid = Math.min(remainingToAllocate, principal);
        remainingToAllocate -= principalPaid;
    } else if (finalPolicy === REPAYMENT_ALLOCATION.PRINCIPAL_FIRST) {
        principalPaid = Math.min(remainingToAllocate, principal);
        remainingToAllocate -= principalPaid;
        interestPaid = Math.min(remainingToAllocate, interest);
        remainingToAllocate -= interestPaid;
        feePaid = Math.min(remainingToAllocate, fees);
        remainingToAllocate -= feePaid;
    } else if (finalPolicy === REPAYMENT_ALLOCATION.PROPORTIONAL) {
        const totalDue = principal + interest + fees;
        if (totalDue > 0) {
            feePaid = Math.min(fees, Math.round(totalPaid * (fees / totalDue) * 100) / 100);
            interestPaid = Math.min(interest, Math.round(totalPaid * (interest / totalDue) * 100) / 100);
            principalPaid = Math.min(principal, Math.round((totalPaid - feePaid - interestPaid) * 100) / 100);
            remainingToAllocate = Math.max(0, totalPaid - feePaid - interestPaid - principalPaid);
        } else {
            principalPaid = totalPaid;
            remainingToAllocate = 0;
        }
    } else {
        // Default: INTEREST_FIRST
        interestPaid = Math.min(remainingToAllocate, interest);
        remainingToAllocate -= interestPaid;
        principalPaid = Math.min(remainingToAllocate, principal);
        remainingToAllocate -= principalPaid;
        feePaid = Math.min(remainingToAllocate, fees);
        remainingToAllocate -= feePaid;
    }

    // Excess payment (if any) reduces principal directly (prepayment)
    if (remainingToAllocate > 0) {
        principalPaid += remainingToAllocate;
    }

    const remainingPrincipalAfter = Math.max(0, principal - principalPaid);
    const remainingInterestAfter = Math.max(0, interest - interestPaid);
    const remainingFeesAfter = Math.max(0, fees - feePaid);

    return {
        amount: totalPaid,
        principalPaid: Number(principalPaid.toFixed(2)),
        interestPaid: Number(interestPaid.toFixed(2)),
        feePaid: Number(feePaid.toFixed(2)),
        principalComponent: Number(principalPaid.toFixed(2)),
        interestComponent: Number(interestPaid.toFixed(2)),
        remainingPrincipalAfter: Number(remainingPrincipalAfter.toFixed(2)),
        remainingInterestAfter: Number(remainingInterestAfter.toFixed(2)),
        remainingFeesAfter: Number(remainingFeesAfter.toFixed(2))
    };
}

/**
 * Dynamically re-amortizes remaining future installments after a repayment or principal reduction
 * Preserves past paid/immutable installments!
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
    const targetIdx = updatedSchedule.findIndex(s => s.id === targetId || s.status === SCHEDULE_STATUS.PENDING || s.status === SCHEDULE_STATUS.PARTIALLY_PAID || s.status === SCHEDULE_STATUS.OVERDUE);

    if (targetIdx !== -1) {
        const item = updatedSchedule[targetIdx];
        const payAmt = paymentAmount !== null ? Number(paymentAmount) : (repayment ? Number(repayment.amount) : 0);
        const pDate = paymentDate || (repayment ? repayment.date : asOfDate);

        const currentExpPrincipal = (item.expectedPrincipal || item.principalComponent || 0) - (item.paidPrincipal || 0);
        const currentExpInterest = (item.expectedInterest || item.interestComponent || 0) - (item.paidInterest || 0);
        const currentExpFees = (item.expectedFees || 0) - (item.paidFees || 0);

        const alloc = allocateRepayment({
            loan,
            paymentAmount: payAmt,
            expectedPrincipal: currentExpPrincipal,
            expectedInterest: currentExpInterest,
            expectedFees: currentExpFees,
            policy: allocationPolicy
        });

        const newPaidAmount = (item.paidAmount || item.paidTotal || 0) + payAmt;
        const newPaidPrincipal = (item.paidPrincipal || 0) + alloc.principalPaid;
        const newPaidInterest = (item.paidInterest || 0) + alloc.interestPaid;
        const newPaidFees = (item.paidFees || 0) + alloc.feePaid;

        const totalExpected = item.expectedTotal || item.expectedAmount || (item.principalComponent + item.interestComponent + (item.expectedFees || 0));
        const remaining = Math.max(0, totalExpected - newPaidAmount);

        item.paidAmount = Number(newPaidAmount.toFixed(2));
        item.paidTotal = Number(newPaidAmount.toFixed(2));
        item.paidPrincipal = Number(newPaidPrincipal.toFixed(2));
        item.paidInterest = Number(newPaidInterest.toFixed(2));
        item.paidFees = Number(newPaidFees.toFixed(2));
        item.remainingTotal = Number(remaining.toFixed(2));
        item.paidDate = pDate;

        if (newPaidAmount >= totalExpected - 0.01) {
            item.status = SCHEDULE_STATUS.PAID;
            item.remainingTotal = 0;
        } else {
            item.status = SCHEDULE_STATUS.PARTIALLY_PAID;
        }

        // ── DYNAMIC RE-AMORTIZATION OF FUTURE INSTALLMENTS ─────────────────────────
        // Calculate new closing principal for current item
        item.closingPrincipal = Math.max(0, (item.openingPrincipal || 0) - item.paidPrincipal);
        item.remainingPrincipal = item.closingPrincipal;

        let runningOpening = item.closingPrincipal;
        const remainingUnpaidCount = updatedSchedule.length - (targetIdx + 1);

        if (remainingUnpaidCount > 0 && runningOpening > 0 && loan) {
            const annualRateDecimal = (Number(loan.interestRate) || 0) / 100;
            const monthlyRate = annualRateDecimal / 12;
            const isAmortized = loan.interestMethod === INTEREST_METHOD.AMORTIZED;

            // Recalculate new EMI for remaining tenure if amortized
            let newEMI = 0;
            if (isAmortized && monthlyRate > 0) {
                const factor = Math.pow(1 + monthlyRate, remainingUnpaidCount);
                newEMI = (runningOpening * monthlyRate * factor) / (factor - 1);
            } else {
                newEMI = runningOpening / remainingUnpaidCount;
            }

            for (let fIdx = targetIdx + 1; fIdx < updatedSchedule.length; fIdx++) {
                const futureItem = updatedSchedule[fIdx];
                if (futureItem.status === SCHEDULE_STATUS.PAID || futureItem.status === SCHEDULE_STATUS.CLOSED_BY_SETTLEMENT) {
                    continue;
                }

                futureItem.openingPrincipal = Number(runningOpening.toFixed(2));

                // Recalculate interest on updated opening principal
                const futureInterest = Number((runningOpening * (annualRateDecimal / 12)).toFixed(2));
                futureItem.expectedInterest = futureInterest;
                futureItem.interestComponent = futureInterest;

                let futurePrincipal = 0;
                if (fIdx === updatedSchedule.length - 1) {
                    // Last installment takes entire remaining balance
                    futurePrincipal = runningOpening;
                } else if (isAmortized && monthlyRate > 0) {
                    futurePrincipal = Number((newEMI - futureInterest).toFixed(2));
                } else {
                    futurePrincipal = Number((runningOpening / (updatedSchedule.length - fIdx)).toFixed(2));
                }

                futureItem.expectedPrincipal = futurePrincipal;
                futureItem.principalComponent = futurePrincipal;
                futureItem.expectedAmount = Number((futurePrincipal + futureInterest + (futureItem.expectedFees || 0)).toFixed(2));
                futureItem.expectedTotal = futureItem.expectedAmount;

                const futureClosing = Math.max(0, runningOpening - futurePrincipal);
                futureItem.closingPrincipal = Number(futureClosing.toFixed(2));
                futureItem.remainingPrincipal = futureItem.closingPrincipal;

                runningOpening = futureClosing;
            }
        }
    }

    return updatedSchedule;
}

/**
 * Dynamically updates schedule when a Top-Up advance is added
 */
export function recalculateScheduleAfterTopUp({
    loan = null,
    schedule = [],
    topUpAmount = 0,
    topUpDate = new Date().toISOString().split('T')[0]
} = {}) {
    const rawSchedule = Array.isArray(schedule) ? schedule.map(s => ({ ...s })) : [];
    const topUp = Number(topUpAmount) || 0;
    if (topUp <= 0 || !loan) return rawSchedule;

    // Find the first upcoming unpaid installment
    const firstUnpaidIdx = rawSchedule.findIndex(s => s.status === SCHEDULE_STATUS.PENDING || s.status === SCHEDULE_STATUS.PARTIALLY_PAID || s.status === SCHEDULE_STATUS.OVERDUE);
    if (firstUnpaidIdx === -1) return rawSchedule;

    const remainingCount = rawSchedule.length - firstUnpaidIdx;
    let runningOpening = (rawSchedule[firstUnpaidIdx].openingPrincipal || 0) + topUp;
    const annualRateDecimal = (Number(loan.interestRate) || 0) / 100;
    const monthlyRate = annualRateDecimal / 12;
    const isAmortized = loan.interestMethod === INTEREST_METHOD.AMORTIZED;

    let newEMI = 0;
    if (isAmortized && monthlyRate > 0) {
        const factor = Math.pow(1 + monthlyRate, remainingCount);
        newEMI = (runningOpening * monthlyRate * factor) / (factor - 1);
    } else {
        newEMI = runningOpening / remainingCount;
    }

    for (let i = firstUnpaidIdx; i < rawSchedule.length; i++) {
        const item = rawSchedule[i];
        item.openingPrincipal = Number(runningOpening.toFixed(2));

        const interest = Number((runningOpening * (annualRateDecimal / 12)).toFixed(2));
        item.expectedInterest = interest;
        item.interestComponent = interest;

        let principal = 0;
        if (i === rawSchedule.length - 1) {
            principal = runningOpening;
        } else if (isAmortized && monthlyRate > 0) {
            principal = Number((newEMI - interest).toFixed(2));
        } else {
            principal = Number((runningOpening / (rawSchedule.length - i)).toFixed(2));
        }

        item.expectedPrincipal = principal;
        item.principalComponent = principal;
        item.expectedAmount = Number((principal + interest + (item.expectedFees || 0)).toFixed(2));
        item.expectedTotal = item.expectedAmount;

        const closing = Math.max(0, runningOpening - principal);
        item.closingPrincipal = Number(closing.toFixed(2));
        item.remainingPrincipal = item.closingPrincipal;

        runningOpening = closing;
    }

    return rawSchedule;
}

/**
 * Skips an installment in the schedule:
 * - Target marked SKIPPED
 * - Unpaid interest rolls forward into subsequent obligations (no silent capitalization)
 * - Tenure extended by 1 month; schedule shifted forward
 */
export function skipInstallmentInSchedule({
    loan = null,
    schedule = [],
    installmentNumber = 1,
    skipDate = new Date().toISOString().split('T')[0]
} = {}) {
    const rawSchedule = Array.isArray(schedule) ? schedule.map(s => ({ ...s })) : [];
    const targetIdx = rawSchedule.findIndex(s => s.installmentNumber === installmentNumber || s.id === installmentNumber);
    if (targetIdx === -1) return rawSchedule;

    const item = rawSchedule[targetIdx];
    item.status = SCHEDULE_STATUS.SKIPPED;
    item.paidDate = skipDate;

    // Skipped interest remains outstanding and rolls into next unpaid installment
    const skippedInterest = item.expectedInterest || item.interestComponent || 0;
    const openingPrincipal = item.openingPrincipal || (loan ? loan.principal : 0);

    // Shift all subsequent installments and append an extra month to maturity
    const lastItem = rawSchedule[rawSchedule.length - 1];
    const newDueDate = addMonthsToDate(lastItem.dueDate, 1);
    const newPeriodStart = lastItem.dueDate;
    const newPeriodEnd = newDueDate;

    // Create extended installment
    const extendedItem = createRepaymentScheduleItem({
        id: `sch_${loan ? loan.id : 'loan'}_${rawSchedule.length + 1}`,
        loanId: loan ? loan.id : '',
        installmentNumber: rawSchedule.length + 1,
        periodStart: newPeriodStart,
        periodEnd: newPeriodEnd,
        dueDate: newDueDate,
        openingPrincipal: lastItem.closingPrincipal,
        expectedPrincipal: item.expectedPrincipal,
        expectedInterest: item.expectedInterest,
        expectedAmount: item.expectedAmount,
        status: SCHEDULE_STATUS.PENDING
    });
    rawSchedule.push(extendedItem);

    // Roll skipped interest into next pending installment
    if (targetIdx + 1 < rawSchedule.length) {
        const nextItem = rawSchedule[targetIdx + 1];
        nextItem.expectedInterest = Number((nextItem.expectedInterest + skippedInterest).toFixed(2));
        nextItem.expectedAmount = Number((nextItem.expectedPrincipal + nextItem.expectedInterest).toFixed(2));
        nextItem.expectedTotal = nextItem.expectedAmount;
    }

    return rawSchedule;
}

/**
 * Early payment of a scheduled installment (Advance Installment)
 */
export function payInstallmentInAdvanceInSchedule({
    loan = null,
    schedule = [],
    installmentNumber = 1,
    paymentAmount = null,
    paymentDate = new Date().toISOString().split('T')[0]
} = {}) {
    const rawSchedule = Array.isArray(schedule) ? schedule.map(s => ({ ...s })) : [];
    const targetIdx = rawSchedule.findIndex(s => s.installmentNumber === installmentNumber || s.id === installmentNumber);
    if (targetIdx === -1) return rawSchedule;

    const item = rawSchedule[targetIdx];
    const amountToPay = paymentAmount !== null ? Number(paymentAmount) : (item.expectedTotal || item.expectedAmount);

    item.paidAmount = amountToPay;
    item.paidTotal = amountToPay;
    item.paidPrincipal = item.expectedPrincipal;
    item.paidInterest = item.expectedInterest;
    item.remainingTotal = 0;
    item.status = SCHEDULE_STATUS.PREPAID;
    item.paidDate = paymentDate;

    return rawSchedule;
}

/**
 * Lump-sum principal prepayment reducing outstanding principal immediately
 */
export function prepayPrincipalInSchedule({
    loan = null,
    schedule = [],
    prepaymentAmount = 0,
    prepaymentDate = new Date().toISOString().split('T')[0]
} = {}) {
    const rawSchedule = Array.isArray(schedule) ? schedule.map(s => ({ ...s })) : [];
    const prepayAmt = Number(prepaymentAmount) || 0;
    if (prepayAmt <= 0) return rawSchedule;

    // Find first upcoming unpaid installment and reduce its opening balance
    const firstUnpaidIdx = rawSchedule.findIndex(s => s.status === SCHEDULE_STATUS.PENDING || s.status === SCHEDULE_STATUS.PARTIALLY_PAID || s.status === SCHEDULE_STATUS.OVERDUE);
    if (firstUnpaidIdx === -1) return rawSchedule;

    rawSchedule[firstUnpaidIdx].openingPrincipal = Math.max(0, (rawSchedule[firstUnpaidIdx].openingPrincipal || 0) - prepayAmt);

    // Re-amortize future schedule
    return recalculateScheduleAfterPayment({
        loan,
        existingSchedule: rawSchedule,
        targetScheduleItemId: rawSchedule[firstUnpaidIdx].id,
        paymentAmount: prepayAmt,
        paymentDate: prepaymentDate
    });
}

function formatDateShort(dateStr) {
    if (!dateStr) return '';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const day = parts[2].substring(0, 2);
            const mIdx = parseInt(parts[1], 10) - 1;
            return `${day} ${monthNames[mIdx] || 'Jan'}`;
        }
        const d = new Date(dateStr);
        const day = String(d.getDate()).padStart(2, '0');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${day} ${monthNames[d.getMonth()]}`;
    } catch {
        return dateStr;
    }
}

/**
 * Computes month-by-month accrued interest timeline derived strictly from opening principal
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
    const monthsTimeline = [];
    let totalAccrued = 0;
    let totalPaid = 0;

    const startDate = loan.startDate || '2026-04-06';

    if (Array.isArray(schedule) && schedule.length > 0) {
        schedule.forEach((item, idx) => {
            const opening = item.openingPrincipal || (idx === 0 ? dna.principal : 0);
            const periodInterest = item.expectedInterest || item.interestComponent || Number((opening * (dna.annualRateDecimal / 12)).toFixed(2));
            const paidInWindow = item.paidInterest || (item.status === 'PAID' ? periodInterest : 0);

            totalAccrued += periodInterest;
            totalPaid += paidInWindow;

            const isCurrent = item.status !== 'PAID' && idx === schedule.findIndex(s => s.status !== 'PAID');
            monthsTimeline.push({
                monthIndex: item.installmentNumber || (idx + 1),
                dateRange: `${formatDateShort(item.periodStart || item.dueDate)} - ${formatDateShort(item.periodEnd || addMonthsToDate(item.dueDate, 1))}`,
                periodLabel: `Month ${item.installmentNumber || (idx + 1)}`,
                monthName: formatDateShort(item.dueDate).split(' ')[1] || `Month ${idx + 1}`,
                openingPrincipal: Number(opening.toFixed(2)),
                interestAmount: Number(periodInterest.toFixed(2)),
                amount: Number(periodInterest.toFixed(2)),
                paidAmount: Number(paidInWindow.toFixed(2)),
                status: item.status === 'PAID' ? 'PAID' : (item.status === 'PARTIALLY_PAID' ? 'PARTIALLY_PAID' : (item.status === 'SKIPPED' ? 'SKIPPED' : (item.status === 'OVERDUE' ? 'OVERDUE' : (isCurrent ? 'DUE' : 'UPCOMING')))),
                dueDate: item.dueDate
            });
        });
    }

    const outstanding = Math.max(0, totalAccrued - totalPaid);

    return {
        annualRate: dna.annualRate,
        annualRateDecimal: dna.annualRateDecimal,
        monthlyRatePct: Number((dna.monthlyRate * 100).toFixed(2)),
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
 * Calculates final settlement reconciliation quote:
 * SettlementQuote = PrincipalOutstanding + InterestOutstanding + FeesOutstanding - WaiverAmount
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
    const interestOutstanding = timeline.outstandingInterest || Math.max(0, timeline.totalAccrued - timeline.totalPaid);
    const feesOutstanding = Number(loan.feesOutstanding) || 0;

    const waiver = Math.max(0, Number(waiverAmount) || 0);
    const settlementAmount = Math.max(0, (principalOutstanding + interestOutstanding + feesOutstanding) - waiver);

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
        feesOutstanding: Number(feesOutstanding.toFixed(2)),
        waiverAmount: waiver,
        settlementAmount: Number(settlementAmount.toFixed(2)),
        finalSettlementAmount: Number(settlementAmount.toFixed(2)),
        direction: loan.direction || loan.type || LOAN_DIRECTION.GIVEN
    };
}

/**
 * Generates an immutable, balanced Double-Entry Journal Entry for any P2P financial event
 * Enforces sum(Debits) === sum(Credits)
 */
export function createDoubleEntryJournalForEvent({
    eventType = JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN,
    sourceEntityId = '',
    sourceEventId = '',
    operationId = null,
    timestamp = null,
    cashAccountId = null,
    cashAccountName = '',
    accountId = 'HDFC Savings Account',
    principalAmount = null,
    interestAmount = null,
    feeAmount = null,
    waiverAmount = 0,
    loan = null,
    advance = null,
    repayment = null,
    settlement = null,
    relationshipSettlement = null,
    date = new Date().toISOString().split('T')[0],
    note = ''
} = {}) {
    const resolvedEntityId = sourceEntityId || (loan ? loan.id : (relationshipSettlement ? relationshipSettlement.personId : 'unknown_entity'));
    const resolvedTimestamp = timestamp || `${date}T${new Date().toISOString().split('T')[1] || '12:00:00.000Z'}`;
    const targetAccount = cashAccountId || accountId || 'HDFC Savings Account';
    const opId = operationId || `p2p_op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const entryId = `je_p2p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const evType = JOURNAL_EVENT_TYPES[eventType] || eventType;
    const lines = [];

    if (evType === JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN || evType === JOURNAL_EVENT_TYPES.P2P_ADVANCE_GIVEN) {
        const amt = principalAmount !== null ? Number(principalAmount) : (advance ? advance.amount : (loan ? loan.principal : 0));
        lines.push(createJournalLine({
            id: `jl_${entryId}_1`,
            accountType: 'ASSET',
            accountId: 'ASSET_P2P_RECEIVABLE',
            debit: amt,
            credit: 0,
            component: 'PRINCIPAL',
            loanId: resolvedEntityId
        }));
        lines.push(createJournalLine({
            id: `jl_${entryId}_2`,
            accountType: 'ASSET',
            accountId: targetAccount,
            debit: 0,
            credit: amt,
            component: 'CAPITAL',
            loanId: resolvedEntityId
        }));
    } else if (evType === JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN || evType === JOURNAL_EVENT_TYPES.P2P_ADVANCE_TAKEN) {
        const amt = principalAmount !== null ? Number(principalAmount) : (advance ? advance.amount : (loan ? loan.principal : 0));
        lines.push(createJournalLine({
            id: `jl_${entryId}_1`,
            accountType: 'ASSET',
            accountId: targetAccount,
            debit: amt,
            credit: 0,
            component: 'CAPITAL',
            loanId: resolvedEntityId
        }));
        lines.push(createJournalLine({
            id: `jl_${entryId}_2`,
            accountType: 'LIABILITY',
            accountId: 'LIABILITY_P2P_PAYABLE',
            debit: 0,
            credit: amt,
            component: 'PRINCIPAL',
            loanId: resolvedEntityId
        }));
    } else if (evType === JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED || evType === JOURNAL_EVENT_TYPES.P2P_PREPAYMENT_RECEIVED) {
        const pAmt = Number(principalAmount !== null ? principalAmount : (repayment ? repayment.principalComponent : 0)) || 0;
        const iAmt = Number(interestAmount !== null ? interestAmount : (repayment ? repayment.interestComponent : 0)) || 0;
        const totalCash = Number((pAmt + iAmt).toFixed(2));

        lines.push(createJournalLine({
            id: `jl_${entryId}_1`,
            accountType: 'ASSET',
            accountId: targetAccount,
            debit: totalCash,
            credit: 0,
            component: 'CAPITAL',
            loanId: resolvedEntityId
        }));
        if (pAmt > 0) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_2`,
                accountType: 'ASSET',
                accountId: 'ASSET_P2P_RECEIVABLE',
                debit: 0,
                credit: pAmt,
                component: 'PRINCIPAL',
                loanId: resolvedEntityId
            }));
        }
        if (iAmt > 0) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_3`,
                accountType: 'INCOME',
                accountId: 'INCOME_P2P_INTEREST',
                debit: 0,
                credit: iAmt,
                component: 'INTEREST',
                loanId: resolvedEntityId
            }));
        }
    } else if (evType === JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID || evType === JOURNAL_EVENT_TYPES.P2P_PREPAYMENT_PAID) {
        const pAmt = Number(principalAmount !== null ? principalAmount : (repayment ? repayment.principalComponent : 0)) || 0;
        const iAmt = Number(interestAmount !== null ? interestAmount : (repayment ? repayment.interestComponent : 0)) || 0;
        const totalCash = Number((pAmt + iAmt).toFixed(2));

        if (pAmt > 0) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_1`,
                accountType: 'LIABILITY',
                accountId: 'LIABILITY_P2P_PAYABLE',
                debit: pAmt,
                credit: 0,
                component: 'PRINCIPAL',
                loanId: resolvedEntityId
            }));
        }
        if (iAmt > 0) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_2`,
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_P2P_INTEREST',
                debit: iAmt,
                credit: 0,
                component: 'INTEREST',
                loanId: resolvedEntityId
            }));
        }
        lines.push(createJournalLine({
            id: `jl_${entryId}_3`,
            accountType: 'ASSET',
            accountId: targetAccount,
            debit: 0,
            credit: totalCash,
            component: 'CAPITAL',
            loanId: resolvedEntityId
        }));
    } else if (evType === JOURNAL_EVENT_TYPES.RELATIONSHIP_SETTLEMENT && relationshipSettlement) {
        // Multi-loan gross extinguishment + net cash settlement
        const grossRec = Number(relationshipSettlement.grossReceivableClosed || 0);
        const grossPay = Number(relationshipSettlement.grossPayableClosed || 0);
        const netCash = Number(relationshipSettlement.settlementAmount || Math.abs(grossRec - grossPay));
        const isReceivable = (grossRec >= grossPay);

        if (grossPay > 0) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_pay`,
                accountType: 'LIABILITY',
                accountId: 'LIABILITY_P2P_PAYABLE',
                debit: grossPay,
                credit: 0,
                component: 'PRINCIPAL',
                personId: relationshipSettlement.personId
            }));
        }
        if (isReceivable && netCash > 0) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_cash`,
                accountType: 'ASSET',
                accountId: targetAccount,
                debit: netCash,
                credit: 0,
                component: 'CAPITAL',
                personId: relationshipSettlement.personId
            }));
        }
        if (grossRec > 0) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_rec`,
                accountType: 'ASSET',
                accountId: 'ASSET_P2P_RECEIVABLE',
                debit: 0,
                credit: grossRec,
                component: 'PRINCIPAL',
                personId: relationshipSettlement.personId
            }));
        }
        if (!isReceivable && netCash > 0) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_cash_out`,
                accountType: 'ASSET',
                accountId: targetAccount,
                debit: 0,
                credit: netCash,
                component: 'CAPITAL',
                personId: relationshipSettlement.personId
            }));
        }
    } else if (evType === JOURNAL_EVENT_TYPES.P2P_SETTLEMENT && settlement) {
        const isGiven = (loan && loan.direction === LOAN_DIRECTION.GIVEN) || settlement.direction === LOAN_DIRECTION.GIVEN;
        const pAmt = Number(settlement.principalOutstanding || 0);
        const iAmt = Number(settlement.interestOutstanding || 0);
        const wAmt = Number(settlement.waiverAmount || 0);
        const cashAmt = Number(settlement.finalSettlementAmount || (pAmt + iAmt - wAmt));

        if (isGiven) {
            if (cashAmt > 0) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_c`,
                    accountType: 'ASSET',
                    accountId: targetAccount,
                    debit: cashAmt,
                    credit: 0,
                    component: 'CAPITAL',
                    loanId: resolvedEntityId
                }));
            }
            if (wAmt > 0) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_w`,
                    accountType: 'EXPENSE',
                    accountId: 'EXPENSE_P2P_WAIVER',
                    debit: wAmt,
                    credit: 0,
                    component: 'WAIVER',
                    loanId: resolvedEntityId
                }));
            }
            if (pAmt > 0) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_p`,
                    accountType: 'ASSET',
                    accountId: 'ASSET_P2P_RECEIVABLE',
                    debit: 0,
                    credit: pAmt,
                    component: 'PRINCIPAL',
                    loanId: resolvedEntityId
                }));
            }
            if (iAmt > 0) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_i`,
                    accountType: 'INCOME',
                    accountId: 'INCOME_P2P_INTEREST',
                    debit: 0,
                    credit: iAmt,
                    component: 'INTEREST',
                    loanId: resolvedEntityId
                }));
            }
        } else {
            if (pAmt > 0) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_p`,
                    accountType: 'LIABILITY',
                    accountId: 'LIABILITY_P2P_PAYABLE',
                    debit: pAmt,
                    credit: 0,
                    component: 'PRINCIPAL',
                    loanId: resolvedEntityId
                }));
            }
            if (iAmt > 0) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_i`,
                    accountType: 'EXPENSE',
                    accountId: 'EXPENSE_P2P_INTEREST',
                    debit: iAmt,
                    credit: 0,
                    component: 'INTEREST',
                    loanId: resolvedEntityId
                }));
            }
            if (cashAmt > 0) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_c`,
                    accountType: 'ASSET',
                    accountId: targetAccount,
                    debit: 0,
                    credit: cashAmt,
                    component: 'CAPITAL',
                    loanId: resolvedEntityId
                }));
            }
            if (wAmt > 0) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_w`,
                    accountType: 'INCOME',
                    accountId: 'INCOME_P2P_WAIVER',
                    debit: 0,
                    credit: wAmt,
                    component: 'WAIVER',
                    loanId: resolvedEntityId
                }));
            }
        }
    }

    return createJournalEntry({
        id: entryId,
        operationId: opId,
        eventType: evType,
        eventDate: date,
        effectiveDate: date,
        entityType: relationshipSettlement ? 'PERSON_RELATIONSHIP' : 'LOAN',
        entityId: resolvedEntityId,
        sourceEntityId: resolvedEntityId,
        sourceEventId: sourceEventId || (advance ? advance.id : (repayment ? repayment.id : '')),
        direction: (loan ? loan.direction : (relationshipSettlement ? relationshipSettlement.direction : 'GIVEN')),
        lines,
        note
    });
}

/**
 * Creates an immutable Reversal Journal Entry that perfectly negates a prior entry
 */
export function createReversalJournalEntry({
    originalJournalEntry,
    reversalReason = 'User correction',
    reversedBy = 'FINLIFE_USER',
    date = new Date().toISOString().split('T')[0]
}) {
    if (!originalJournalEntry || !Array.isArray(originalJournalEntry.lines)) {
        throw new Error('Original journal entry with valid lines is required for reversal.');
    }

    const entryId = `je_p2p_rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const reversedLines = originalJournalEntry.lines.map((l, idx) => createJournalLine({
        id: `jl_${entryId}_${idx}`,
        accountType: l.accountType,
        accountId: l.accountId,
        debit: l.credit,   // Invert debit/credit
        credit: l.debit,
        currency: l.currency,
        component: l.component,
        loanId: l.loanId,
        personId: l.personId
    }));

    return createJournalEntry({
        id: entryId,
        operationId: `p2p_op_rev_${Date.now()}`,
        eventType: JOURNAL_EVENT_TYPES.P2P_REVERSAL,
        eventDate: date,
        effectiveDate: date,
        entityType: originalJournalEntry.entityType,
        entityId: originalJournalEntry.entityId,
        direction: originalJournalEntry.direction,
        lines: reversedLines,
        reversesJournalEntryId: originalJournalEntry.id || originalJournalEntry.journalEntryId,
        reversalReason,
        note: `Reversal of entry ${originalJournalEntry.id}: ${reversalReason}`,
        createdBy: reversedBy
    });
}

/**
 * ── DETERMINISTIC PROJECTION REPLAY ENGINE (INVARIANT Z8) ──────────────────────────
 * Replays all immutable double-entry journal records over master reference data
 * to produce 100% identical derived financial state:
 * - Loan projections (outstanding principal, interest, status)
 * - Person relationship balances (totalGiven, totalTaken, netBalance)
 */
export function rebuildP2PProjectionsFromJournal({
    journalEntries = [],
    persons = [],
    loans = []
} = {}) {
    const loanProjections = {};
    const personProjections = {};

    // Initialize person structures
    (persons || []).forEach(p => {
        personProjections[p.id] = {
            personId: p.id,
            name: p.name,
            totalGiven: 0,
            totalReceived: 0,
            totalTaken: 0,
            totalPaid: 0,
            netBalance: 0,
            pendingLoanIds: [],
            settledLoanIds: []
        };
    });

    // Initialize loan structures
    (loans || []).forEach(l => {
        loanProjections[l.id] = {
            id: l.id,
            personId: l.personId,
            direction: l.direction,
            principal: Number(l.principal),
            totalAdvanced: 0,
            principalPaid: 0,
            interestPaid: 0,
            interestAccrued: 0,
            outstandingPrincipal: 0,
            outstandingInterest: 0,
            status: l.status || LOAN_STATUS.ACTIVE
        };
    });

    // Process journal entries in chronological order
    const sortedJournal = [...(journalEntries || [])].sort((a, b) => {
        const tA = new Date(a.eventDate || a.timestamp || 0).getTime();
        const tB = new Date(b.eventDate || b.timestamp || 0).getTime();
        return tA - tB;
    });

    for (const je of sortedJournal) {
        for (const line of (je.lines || [])) {
            const lId = line.loanId || je.entityId;
            const pId = line.personId || (loans.find(l => l.id === lId)?.personId);

            if (loanProjections[lId]) {
                const lp = loanProjections[lId];
                if (line.accountId === 'ASSET_P2P_RECEIVABLE') {
                    lp.totalAdvanced += line.debit;
                    lp.principalPaid += line.credit;
                } else if (line.accountId === 'LIABILITY_P2P_PAYABLE') {
                    lp.totalAdvanced += line.credit;
                    lp.principalPaid += line.debit;
                } else if (line.accountId === 'INCOME_P2P_INTEREST' || line.accountId === 'EXPENSE_P2P_INTEREST') {
                    lp.interestPaid += (line.credit || line.debit);
                }
            }

            if (personProjections[pId]) {
                const pp = personProjections[pId];
                if (line.accountId === 'ASSET_P2P_RECEIVABLE') {
                    pp.totalGiven += line.debit;
                    pp.totalReceived += line.credit;
                } else if (line.accountId === 'LIABILITY_P2P_PAYABLE') {
                    pp.totalTaken += line.credit;
                    pp.totalPaid += line.debit;
                }
            }
        }

        // Handle settlement closures
        if (je.eventType === JOURNAL_EVENT_TYPES.P2P_SETTLEMENT && loanProjections[je.entityId]) {
            loanProjections[je.entityId].status = LOAN_STATUS.SETTLED;
        }
        if (je.eventType === JOURNAL_EVENT_TYPES.RELATIONSHIP_SETTLEMENT) {
            const closedIds = je.metadata?.closedLoanIds || [];
            closedIds.forEach(cId => {
                if (loanProjections[cId]) loanProjections[cId].status = LOAN_STATUS.SETTLED;
            });
        }
    }

    // Finalize loan balances
    Object.values(loanProjections).forEach(lp => {
        lp.outstandingPrincipal = Math.max(0, lp.totalAdvanced - lp.principalPaid);
        if (lp.outstandingPrincipal <= 0.01 && lp.outstandingInterest <= 0.01 && lp.totalAdvanced > 0) {
            lp.status = LOAN_STATUS.SETTLED;
        }
    });

    // Finalize person relationship netting
    const relationships = {};
    Object.values(personProjections).forEach(pp => {
        const net = (pp.totalGiven - pp.totalReceived) - (pp.totalTaken - pp.totalPaid);
        pp.netBalance = Number(net.toFixed(2));
        pp.direction = net >= 0 ? 'RECEIVABLE' : 'PAYABLE';

        const pLoans = Object.values(loanProjections).filter(lp => lp.personId === pp.personId);
        pp.pendingLoanIds = pLoans.filter(l => l.status === LOAN_STATUS.ACTIVE).map(l => l.id);
        pp.settledLoanIds = pLoans.filter(l => l.status === LOAN_STATUS.SETTLED).map(l => l.id);

        relationships[pp.personId] = createPersonRelationship({
            personId: pp.personId,
            totalGiven: pp.totalGiven,
            totalTaken: pp.totalTaken,
            netBalance: pp.netBalance,
            pendingLoanIds: pp.pendingLoanIds,
            settledLoanIds: pp.settledLoanIds
        });
    });

    return {
        loanProjections,
        personProjections,
        relationships
    };
}
