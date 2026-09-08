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

import {
    roundHalfUp,
    rateToBps,
    toBigIntPaise,
    rupeesToPaise,
    paiseToRupees
} from './p2pContracts.js';


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
 * Calculates primary loan characteristics and installment projections using BigInt paise
 */
export function calculateLoanDNA(loan = {}) {
    const principalPaise = toBigIntPaise(loan.principalPaise !== undefined ? loan.principalPaise : (loan.principal !== undefined ? rupeesToPaise(loan.principal) : 0n));
    const annualRate = Math.max(0, Number(loan.interestRate) || 0);
    const annualRateBps = rateToBps(annualRate);
    const tenureMonths = Math.max(1, Number(loan.tenureMonths) || 12);
    const method = loan.interestMethod || INTEREST_METHOD.SIMPLE;

    const annualRateDecimal = annualRate / 100;
    const monthlyRate = annualRateDecimal / 12;

    let expectedMonthlyPaymentPaise = 0n;
    let totalExpectedInterestPaise = 0n;

    if (method === INTEREST_METHOD.NO_INTEREST || annualRateBps === 0n) {
        expectedMonthlyPaymentPaise = roundHalfUp(principalPaise, BigInt(tenureMonths));
        totalExpectedInterestPaise = 0n;
    } else if (method === INTEREST_METHOD.AMORTIZED) {
        if (monthlyRate > 0) {
            const factor = Math.pow(1 + monthlyRate, tenureMonths);
            const pRupees = paiseToRupees(principalPaise);
            const emiRupees = (pRupees * monthlyRate * factor) / (factor - 1);
            expectedMonthlyPaymentPaise = rupeesToPaise(emiRupees);

            let simOpening = principalPaise;
            let cumInt = 0n;
            for (let m = 1; m <= tenureMonths; m++) {
                const mInt = roundHalfUp(simOpening * annualRateBps, 120000n);
                cumInt += mInt;
                const mPrin = m === tenureMonths
                    ? simOpening
                    : (expectedMonthlyPaymentPaise > mInt ? expectedMonthlyPaymentPaise - mInt : 0n);
                simOpening = simOpening > mPrin ? simOpening - mPrin : 0n;
            }
            totalExpectedInterestPaise = cumInt;
        } else {
            expectedMonthlyPaymentPaise = roundHalfUp(principalPaise, BigInt(tenureMonths));
            totalExpectedInterestPaise = 0n;
        }
    } else {
        // DECLINING-BALANCE SIMPLE INTEREST:
        const monthlyPrincipalBase = principalPaise / BigInt(tenureMonths);
        let cumulativeInterest = 0n;
        for (let m = 1; m <= tenureMonths; m++) {
            const opening = principalPaise - (BigInt(m - 1) * monthlyPrincipalBase);
            const mInterest = roundHalfUp(opening * annualRateBps, 120000n);
            cumulativeInterest += mInterest;
        }
        totalExpectedInterestPaise = cumulativeInterest;
        expectedMonthlyPaymentPaise = roundHalfUp(principalPaise + totalExpectedInterestPaise, BigInt(tenureMonths));
    }

    const totalExpectedRepaymentPaise = principalPaise + totalExpectedInterestPaise;

    return {
        principalPaise,
        principal: paiseToRupees(principalPaise),
        annualRate,
        annualRateBps,
        annualRateDecimal,
        monthlyRate,
        tenureMonths,
        method,
        expectedMonthlyPaymentPaise,
        expectedMonthlyPayment: paiseToRupees(expectedMonthlyPaymentPaise),
        monthlyInstallment: paiseToRupees(expectedMonthlyPaymentPaise),
        totalExpectedInterestPaise,
        totalExpectedInterest: paiseToRupees(totalExpectedInterestPaise),
        totalInterest: paiseToRupees(totalExpectedInterestPaise),
        totalExpectedRepaymentPaise,
        totalExpectedRepayment: paiseToRupees(totalExpectedRepaymentPaise),
        totalPayable: paiseToRupees(totalExpectedRepaymentPaise)
    };
}

/**
 * Generates initial declining-balance repayment schedule for a new loan
 * Guarantees zero penny leakage via final-installment remainder carry-forward.
 */
export function generateInitialSchedule(loan = {}) {
    const loanId = loan.id || loan.loanId || `loan_${Date.now()}`;
    const dna = calculateLoanDNA(loan);
    const startDate = loan.startDate || new Date().toISOString().split('T')[0];

    const schedule = [];
    let currentOpeningPrincipalPaise = dna.principalPaise;
    const monthlyPrincipalBasePaise = dna.principalPaise / BigInt(dna.tenureMonths);

    let cumPrincipalAllocatedPaise = 0n;
    let cumInterestAllocatedPaise = 0n;
    let previousPeriodEnd = startDate;

    for (let i = 1; i <= dna.tenureMonths; i++) {
        const dueDate = addMonthsToDate(startDate, i);
        const periodStart = previousPeriodEnd;
        const periodEnd = dueDate;
        previousPeriodEnd = dueDate;

        let interestComponentPaise = roundHalfUp(currentOpeningPrincipalPaise * dna.annualRateBps, 120000n);
        let principalComponentPaise = 0n;

        if (dna.method === INTEREST_METHOD.AMORTIZED) {
            if (dna.monthlyRate > 0) {
                if (i === dna.tenureMonths) {
                    principalComponentPaise = currentOpeningPrincipalPaise;
                } else {
                    principalComponentPaise = dna.expectedMonthlyPaymentPaise > interestComponentPaise
                        ? dna.expectedMonthlyPaymentPaise - interestComponentPaise
                        : 0n;
                    if (principalComponentPaise > currentOpeningPrincipalPaise) {
                        principalComponentPaise = currentOpeningPrincipalPaise;
                    }
                }
            } else {
                principalComponentPaise = i === dna.tenureMonths ? currentOpeningPrincipalPaise : monthlyPrincipalBasePaise;
            }
        } else if (dna.method === INTEREST_METHOD.NO_INTEREST) {
            interestComponentPaise = 0n;
            principalComponentPaise = i === dna.tenureMonths ? currentOpeningPrincipalPaise : monthlyPrincipalBasePaise;
        } else {
            // SIMPLE INTEREST (Declining Balance)
            principalComponentPaise = i === dna.tenureMonths ? currentOpeningPrincipalPaise : monthlyPrincipalBasePaise;
        }

        // Remainder carry-forward: Final installment absorbs residual discrepancy
        if (i === dna.tenureMonths) {
            interestComponentPaise = dna.totalExpectedInterestPaise > cumInterestAllocatedPaise
                ? dna.totalExpectedInterestPaise - cumInterestAllocatedPaise
                : 0n;
            principalComponentPaise = dna.principalPaise > cumPrincipalAllocatedPaise
                ? dna.principalPaise - cumPrincipalAllocatedPaise
                : 0n;
        }

        const expectedTotalPaise = principalComponentPaise + interestComponentPaise;
        const closingPrincipalPaise = currentOpeningPrincipalPaise > principalComponentPaise
            ? currentOpeningPrincipalPaise - principalComponentPaise
            : 0n;

        cumPrincipalAllocatedPaise += principalComponentPaise;
        cumInterestAllocatedPaise += interestComponentPaise;

        schedule.push(createRepaymentScheduleItem({
            id: `sch_${loanId}_${i}`,
            loanId,
            installmentNumber: i,
            periodStart,
            periodEnd,
            dueDate,
            openingPrincipalPaise: currentOpeningPrincipalPaise,
            expectedPrincipalPaise: principalComponentPaise,
            expectedInterestPaise: interestComponentPaise,
            expectedFeesPaise: 0n,
            expectedTotalPaise,
            closingPrincipalPaise,
            remainingPrincipalPaise: closingPrincipalPaise,
            paidPrincipalPaise: 0n,
            paidInterestPaise: 0n,
            paidFeesPaise: 0n,
            paidTotalPaise: 0n,
            status: SCHEDULE_STATUS.PENDING
        }));

        currentOpeningPrincipalPaise = closingPrincipalPaise;
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
    amountPaise = undefined,
    paymentAmount = null,
    paymentAmountPaise = undefined,
    currentOutstandingPrincipal = 0,
    currentOutstandingPrincipalPaise = undefined,
    expectedPrincipal = null,
    expectedPrincipalPaise = undefined,
    unpaidAccruedInterest = 0,
    unpaidAccruedInterestPaise = undefined,
    expectedInterest = null,
    expectedInterestPaise = undefined,
    unpaidFees = 0,
    unpaidFeesPaise = undefined,
    expectedFees = null,
    expectedFeesPaise = undefined,
    outstandingPrincipalPaise = undefined,
    accruedInterestPaise = undefined,
    outstandingFeesPaise = undefined,
    quarantineOverpayment = false,
    allocationPolicy = null,
    policy = null
} = {}) {
    const rawTotalPaid = paymentAmountPaise !== undefined 
        ? toBigIntPaise(paymentAmountPaise) 
        : (amountPaise !== undefined ? toBigIntPaise(amountPaise) : (paymentAmount !== null ? rupeesToPaise(paymentAmount) : rupeesToPaise(amount)));
    const totalPaidPaise = rawTotalPaid > 0n ? rawTotalPaid : 0n;

    const finalPolicy = policy || allocationPolicy || (loan && loan.repaymentAllocation) || REPAYMENT_ALLOCATION.INTEREST_FIRST;

    const principalPaise = outstandingPrincipalPaise !== undefined
        ? toBigIntPaise(outstandingPrincipalPaise)
        : (expectedPrincipalPaise !== undefined 
            ? toBigIntPaise(expectedPrincipalPaise) 
            : (expectedPrincipal !== null ? rupeesToPaise(expectedPrincipal) : (currentOutstandingPrincipalPaise !== undefined ? toBigIntPaise(currentOutstandingPrincipalPaise) : rupeesToPaise(currentOutstandingPrincipal))));

    const interestPaise = accruedInterestPaise !== undefined
        ? toBigIntPaise(accruedInterestPaise)
        : (expectedInterestPaise !== undefined 
            ? toBigIntPaise(expectedInterestPaise) 
            : (expectedInterest !== null ? rupeesToPaise(expectedInterest) : (unpaidAccruedInterestPaise !== undefined ? toBigIntPaise(unpaidAccruedInterestPaise) : rupeesToPaise(unpaidAccruedInterest))));

    const feesPaise = outstandingFeesPaise !== undefined
        ? toBigIntPaise(outstandingFeesPaise)
        : (expectedFeesPaise !== undefined 
            ? toBigIntPaise(expectedFeesPaise) 
            : (expectedFees !== null ? rupeesToPaise(expectedFees) : (unpaidFeesPaise !== undefined ? toBigIntPaise(unpaidFeesPaise) : rupeesToPaise(unpaidFees))));

    let feePaidPaise = 0n;
    let interestPaidPaise = 0n;
    let principalPaidPaise = 0n;
    let remainingToAllocatePaise = totalPaidPaise;

    if (finalPolicy === REPAYMENT_ALLOCATION.FEES_FIRST) {
        feePaidPaise = remainingToAllocatePaise > feesPaise ? feesPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= feePaidPaise;
        interestPaidPaise = remainingToAllocatePaise > interestPaise ? interestPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= interestPaidPaise;
        principalPaidPaise = remainingToAllocatePaise > principalPaise ? principalPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= principalPaidPaise;
    } else if (finalPolicy === REPAYMENT_ALLOCATION.PRINCIPAL_FIRST) {
        principalPaidPaise = remainingToAllocatePaise > principalPaise ? principalPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= principalPaidPaise;
        interestPaidPaise = remainingToAllocatePaise > interestPaise ? interestPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= interestPaidPaise;
        feePaidPaise = remainingToAllocatePaise > feesPaise ? feesPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= feePaidPaise;
    } else if (finalPolicy === REPAYMENT_ALLOCATION.PROPORTIONAL) {
        const totalDuePaise = principalPaise + interestPaise + feesPaise;
        if (totalDuePaise > 0n) {
            feePaidPaise = roundHalfUp(totalPaidPaise * feesPaise, totalDuePaise);
            if (feePaidPaise > feesPaise) feePaidPaise = feesPaise;
            if (feePaidPaise > remainingToAllocatePaise) feePaidPaise = remainingToAllocatePaise;

            interestPaidPaise = roundHalfUp(totalPaidPaise * interestPaise, totalDuePaise);
            if (interestPaidPaise > interestPaise) interestPaidPaise = interestPaise;
            if (interestPaidPaise > (remainingToAllocatePaise - feePaidPaise)) interestPaidPaise = remainingToAllocatePaise - feePaidPaise;

            principalPaidPaise = remainingToAllocatePaise - feePaidPaise - interestPaidPaise;
            remainingToAllocatePaise = 0n;
        } else {
            principalPaidPaise = totalPaidPaise;
            remainingToAllocatePaise = 0n;
        }
    } else {
        // Default: INTEREST_FIRST
        interestPaidPaise = remainingToAllocatePaise > interestPaise ? interestPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= interestPaidPaise;
        principalPaidPaise = remainingToAllocatePaise > principalPaise ? principalPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= principalPaidPaise;
        feePaidPaise = remainingToAllocatePaise > feesPaise ? feesPaise : remainingToAllocatePaise;
        remainingToAllocatePaise -= feePaidPaise;
    }

    // Excess payment (if any)
    let unallocatedPaise = 0n;
    if (remainingToAllocatePaise > 0n) {
        if (quarantineOverpayment) {
            unallocatedPaise = remainingToAllocatePaise;
            remainingToAllocatePaise = 0n;
        } else {
            principalPaidPaise += remainingToAllocatePaise;
            remainingToAllocatePaise = 0n;
        }
    }

    const remainingPrincipalAfterPaise = principalPaise > principalPaidPaise ? principalPaise - principalPaidPaise : 0n;
    const remainingInterestAfterPaise = interestPaise > interestPaidPaise ? interestPaise - interestPaidPaise : 0n;
    const remainingFeesAfterPaise = feesPaise > feePaidPaise ? feesPaise - feePaidPaise : 0n;

    return {
        amountPaise: totalPaidPaise,
        principalPaise: principalPaidPaise,
        interestPaise: interestPaidPaise,
        feesPaise: feePaidPaise,
        unallocatedPaise,
        principalPaidPaise,
        interestPaidPaise,
        feePaidPaise,
        principalComponentPaise: principalPaidPaise,
        interestComponentPaise: interestPaidPaise,
        feeComponentPaise: feePaidPaise,
        remainingPrincipalAfterPaise,
        remainingInterestAfterPaise,
        remainingFeesAfterPaise,
        amount: paiseToRupees(totalPaidPaise),
        principalPaid: paiseToRupees(principalPaidPaise),
        interestPaid: paiseToRupees(interestPaidPaise),
        feePaid: paiseToRupees(feePaidPaise),
        principalComponent: paiseToRupees(principalPaidPaise),
        interestComponent: paiseToRupees(interestPaidPaise),
        feeComponent: paiseToRupees(feePaidPaise),
        remainingPrincipalAfter: paiseToRupees(remainingPrincipalAfterPaise),
        remainingInterestAfter: paiseToRupees(remainingInterestAfterPaise),
        remainingFeesAfter: paiseToRupees(remainingFeesAfterPaise)
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
    paymentAmountPaise = undefined,
    paymentDate = new Date().toISOString().split('T')[0],
    advancePaymentDate = null
} = {}) {
    const rawSchedule = Array.isArray(schedule) ? schedule.map(s => ({ ...s })) : [];
    const targetIdx = rawSchedule.findIndex(s => s.installmentNumber === installmentNumber || s.id === installmentNumber);
    if (targetIdx === -1) return rawSchedule;

    const item = rawSchedule[targetIdx];
    const resolvedDate = advancePaymentDate || paymentDate;
    const resolvedExpectedTotalPaise = item.expectedTotalPaise !== undefined ? item.expectedTotalPaise : rupeesToPaise(item.expectedTotal || item.expectedAmount || 0);
    const amountToPayPaise = paymentAmountPaise !== undefined 
        ? toBigIntPaise(paymentAmountPaise) 
        : (paymentAmount !== null ? rupeesToPaise(paymentAmount) : resolvedExpectedTotalPaise);

    item.paidAmountPaise = amountToPayPaise;
    item.paidTotalPaise = amountToPayPaise;
    item.paidPrincipalPaise = item.expectedPrincipalPaise !== undefined ? item.expectedPrincipalPaise : rupeesToPaise(item.expectedPrincipal || 0);
    item.paidInterestPaise = item.expectedInterestPaise !== undefined ? item.expectedInterestPaise : rupeesToPaise(item.expectedInterest || 0);
    item.remainingTotalPaise = 0n;
    item.remainingPrincipalPaise = 0n;

    item.paidAmount = paiseToRupees(amountToPayPaise);
    item.paidTotal = paiseToRupees(amountToPayPaise);
    item.paidPrincipal = paiseToRupees(item.paidPrincipalPaise);
    item.paidInterest = paiseToRupees(item.paidInterestPaise);
    item.remainingTotal = 0;
    item.remainingPrincipal = 0;
    item.status = SCHEDULE_STATUS.PREPAID;
    item.paidDate = resolvedDate;
    item.isAdvancePayment = true;

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
    waiverAmount = 0,
    waiverAmountPaise = undefined,
    waiverPaise = undefined
} = {}) {
    const totalAdvanced = advances.reduce((sum, a) => sum + (Number(a.amount) || 0), 0) || Number(loan.principal) || 0;
    const principalRepaid = repayments.reduce((sum, r) => sum + (Number(r.principalComponent || r.principalPaid) || 0), 0);
    const principalOutstanding = loan.outstandingPrincipal !== undefined && loan.outstandingPrincipal !== null
        ? Number(loan.outstandingPrincipal)
        : Math.max(0, totalAdvanced - principalRepaid);

    const timeline = calculateInterestTimeline({ loan, schedule, advances, repayments, asOfDate: settlementDate });
    const interestOutstanding = timeline.outstandingInterest || Math.max(0, timeline.totalAccrued - timeline.totalPaid);
    const feesOutstanding = Number(loan.feesOutstanding) || 0;

    const resolvedWaiverPaise = waiverPaise !== undefined 
        ? toBigIntPaise(waiverPaise) 
        : (waiverAmountPaise !== undefined ? toBigIntPaise(waiverAmountPaise) : rupeesToPaise(waiverAmount));
    const waiver = paiseToRupees(resolvedWaiverPaise);

    const pOutPaise = loan.outstandingPrincipalPaise !== undefined ? toBigIntPaise(loan.outstandingPrincipalPaise) : rupeesToPaise(principalOutstanding);
    const iOutPaise = rupeesToPaise(interestOutstanding);
    const fOutPaise = loan.feesOutstandingPaise !== undefined ? toBigIntPaise(loan.feesOutstandingPaise) : rupeesToPaise(feesOutstanding);
    const grossDuePaise = pOutPaise + iOutPaise + fOutPaise;
    const settlementAmountPaise = grossDuePaise > resolvedWaiverPaise ? grossDuePaise - resolvedWaiverPaise : 0n;
    const settlementAmount = paiseToRupees(settlementAmountPaise);

    return {
        loanId: loan.id,
        totalAdvanced,
        principalRepaid,
        principalOutstandingPaise: pOutPaise,
        outstandingPrincipalPaise: pOutPaise,
        interestOutstandingPaise: iOutPaise,
        feesOutstandingPaise: fOutPaise,
        waiverPaise: resolvedWaiverPaise,
        waiverAmountPaise: resolvedWaiverPaise,
        settlementAmountPaise,
        finalSettlementAmountPaise: settlementAmountPaise,
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
    principalAmountPaise = null,
    interestAmount = null,
    interestAmountPaise = null,
    feeAmount = null,
    feeAmountPaise = null,
    waiverAmount = 0,
    waiverAmountPaise = null,
    loan = null,
    advance = null,
    repayment = null,
    allocation = null,
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
        const amtPaise = principalAmountPaise !== null && principalAmountPaise !== undefined
            ? toBigIntPaise(principalAmountPaise)
            : (principalAmount !== null
                ? rupeesToPaise(principalAmount)
                : (advance ? (advance.amountPaise !== undefined ? toBigIntPaise(advance.amountPaise) : rupeesToPaise(advance.amount)) : (loan ? (loan.principalPaise !== undefined ? toBigIntPaise(loan.principalPaise) : rupeesToPaise(loan.principal)) : 0n)));

        lines.push(createJournalLine({
            id: `jl_${entryId}_1`,
            accountType: 'ASSET',
            accountId: 'ASSET_P2P_RECEIVABLE',
            debitPaise: amtPaise,
            creditPaise: 0n,
            component: 'PRINCIPAL',
            loanId: resolvedEntityId
        }));
        lines.push(createJournalLine({
            id: `jl_${entryId}_2`,
            accountType: 'ASSET',
            accountId: targetAccount,
            debitPaise: 0n,
            creditPaise: amtPaise,
            component: 'CAPITAL',
            loanId: resolvedEntityId
        }));
    } else if (evType === JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN || evType === JOURNAL_EVENT_TYPES.P2P_ADVANCE_TAKEN) {
        const amtPaise = principalAmountPaise !== null && principalAmountPaise !== undefined
            ? toBigIntPaise(principalAmountPaise)
            : (principalAmount !== null
                ? rupeesToPaise(principalAmount)
                : (advance ? (advance.amountPaise !== undefined ? toBigIntPaise(advance.amountPaise) : rupeesToPaise(advance.amount)) : (loan ? (loan.principalPaise !== undefined ? toBigIntPaise(loan.principalPaise) : rupeesToPaise(loan.principal)) : 0n)));

        lines.push(createJournalLine({
            id: `jl_${entryId}_1`,
            accountType: 'ASSET',
            accountId: targetAccount,
            debitPaise: amtPaise,
            creditPaise: 0n,
            component: 'CAPITAL',
            loanId: resolvedEntityId
        }));
        lines.push(createJournalLine({
            id: `jl_${entryId}_2`,
            accountType: 'LIABILITY',
            accountId: 'LIABILITY_P2P_PAYABLE',
            debitPaise: 0n,
            creditPaise: amtPaise,
            component: 'PRINCIPAL',
            loanId: resolvedEntityId
        }));
    } else if (evType === JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED || evType === JOURNAL_EVENT_TYPES.P2P_PREPAYMENT_RECEIVED) {
        const pAmtPaise = principalAmountPaise !== null && principalAmountPaise !== undefined
            ? toBigIntPaise(principalAmountPaise)
            : (principalAmount !== null 
                ? rupeesToPaise(principalAmount) 
                : (allocation && (allocation.principalPaise !== undefined || allocation.principalComponentPaise !== undefined)
                    ? toBigIntPaise(allocation.principalPaise ?? allocation.principalComponentPaise)
                    : (repayment ? (repayment.principalComponentPaise !== undefined ? toBigIntPaise(repayment.principalComponentPaise) : rupeesToPaise(repayment.principalComponent)) : 0n)));

        const iAmtPaise = interestAmountPaise !== null && interestAmountPaise !== undefined
            ? toBigIntPaise(interestAmountPaise)
            : (interestAmount !== null 
                ? rupeesToPaise(interestAmount) 
                : (allocation && (allocation.interestPaise !== undefined || allocation.interestComponentPaise !== undefined)
                    ? toBigIntPaise(allocation.interestPaise ?? allocation.interestComponentPaise)
                    : (repayment ? (repayment.interestComponentPaise !== undefined ? toBigIntPaise(repayment.interestComponentPaise) : rupeesToPaise(repayment.interestComponent)) : 0n)));

        const fAmtPaise = feeAmountPaise !== null && feeAmountPaise !== undefined
            ? toBigIntPaise(feeAmountPaise)
            : (feeAmount !== null
                ? rupeesToPaise(feeAmount)
                : (allocation && (allocation.feesPaise !== undefined || allocation.feePaidPaise !== undefined || allocation.feeComponentPaise !== undefined)
                    ? toBigIntPaise(allocation.feesPaise ?? allocation.feePaidPaise ?? allocation.feeComponentPaise)
                    : 0n));

        const totalCashPaise = pAmtPaise + iAmtPaise + fAmtPaise;

        lines.push(createJournalLine({
            id: `jl_${entryId}_1`,
            accountType: 'ASSET',
            accountId: targetAccount,
            debitPaise: totalCashPaise,
            creditPaise: 0n,
            component: 'CAPITAL',
            loanId: resolvedEntityId
        }));
        if (pAmtPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_2`,
                accountType: 'ASSET',
                accountId: 'ASSET_P2P_RECEIVABLE',
                debitPaise: 0n,
                creditPaise: pAmtPaise,
                component: 'PRINCIPAL',
                loanId: resolvedEntityId
            }));
        }
        if (iAmtPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_3`,
                accountType: 'INCOME',
                accountId: 'INCOME_P2P_INTEREST',
                debitPaise: 0n,
                creditPaise: iAmtPaise,
                component: 'INTEREST',
                loanId: resolvedEntityId
            }));
        }
        if (fAmtPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_fee`,
                accountType: 'INCOME',
                accountId: 'INCOME_P2P_FEES',
                debitPaise: 0n,
                creditPaise: fAmtPaise,
                component: 'FEES',
                loanId: resolvedEntityId
            }));
        }
    } else if (evType === JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID || evType === JOURNAL_EVENT_TYPES.P2P_PREPAYMENT_PAID) {
        const pAmtPaise = principalAmountPaise !== null && principalAmountPaise !== undefined
            ? toBigIntPaise(principalAmountPaise)
            : (principalAmount !== null 
                ? rupeesToPaise(principalAmount) 
                : (allocation && (allocation.principalPaise !== undefined || allocation.principalComponentPaise !== undefined)
                    ? toBigIntPaise(allocation.principalPaise ?? allocation.principalComponentPaise)
                    : (repayment ? (repayment.principalComponentPaise !== undefined ? toBigIntPaise(repayment.principalComponentPaise) : rupeesToPaise(repayment.principalComponent)) : 0n)));

        const iAmtPaise = interestAmountPaise !== null && interestAmountPaise !== undefined
            ? toBigIntPaise(interestAmountPaise)
            : (interestAmount !== null 
                ? rupeesToPaise(interestAmount) 
                : (allocation && (allocation.interestPaise !== undefined || allocation.interestComponentPaise !== undefined)
                    ? toBigIntPaise(allocation.interestPaise ?? allocation.interestComponentPaise)
                    : (repayment ? (repayment.interestComponentPaise !== undefined ? toBigIntPaise(repayment.interestComponentPaise) : rupeesToPaise(repayment.interestComponent)) : 0n)));

        const totalCashPaise = pAmtPaise + iAmtPaise;

        if (pAmtPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_1`,
                accountType: 'LIABILITY',
                accountId: 'LIABILITY_P2P_PAYABLE',
                debitPaise: pAmtPaise,
                creditPaise: 0n,
                component: 'PRINCIPAL',
                loanId: resolvedEntityId
            }));
        }
        if (iAmtPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_2`,
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_P2P_INTEREST',
                debitPaise: iAmtPaise,
                creditPaise: 0n,
                component: 'INTEREST',
                loanId: resolvedEntityId
            }));
        }
        lines.push(createJournalLine({
            id: `jl_${entryId}_3`,
            accountType: 'ASSET',
            accountId: targetAccount,
            debitPaise: 0n,
            creditPaise: totalCashPaise,
            component: 'CAPITAL',
            loanId: resolvedEntityId
        }));
    } else if (evType === JOURNAL_EVENT_TYPES.RELATIONSHIP_SETTLEMENT && relationshipSettlement) {
        const grossRecPaise = relationshipSettlement.grossReceivableClosedPaise !== undefined 
            ? toBigIntPaise(relationshipSettlement.grossReceivableClosedPaise) 
            : rupeesToPaise(relationshipSettlement.grossReceivableClosed || 0);
        const grossPayPaise = relationshipSettlement.grossPayableClosedPaise !== undefined 
            ? toBigIntPaise(relationshipSettlement.grossPayableClosedPaise) 
            : rupeesToPaise(relationshipSettlement.grossPayableClosed || 0);

        const netCashPaise = relationshipSettlement.settlementAmountPaise !== undefined
            ? toBigIntPaise(relationshipSettlement.settlementAmountPaise)
            : (relationshipSettlement.settlementAmount !== undefined 
                ? rupeesToPaise(relationshipSettlement.settlementAmount) 
                : (grossRecPaise >= grossPayPaise ? grossRecPaise - grossPayPaise : grossPayPaise - grossRecPaise));

        const isReceivable = (grossRecPaise >= grossPayPaise);

        if (grossPayPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_pay`,
                accountType: 'LIABILITY',
                accountId: 'LIABILITY_P2P_PAYABLE',
                debitPaise: grossPayPaise,
                creditPaise: 0n,
                component: 'PRINCIPAL',
                personId: relationshipSettlement.personId
            }));
        }
        if (isReceivable && netCashPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_cash`,
                accountType: 'ASSET',
                accountId: targetAccount,
                debitPaise: netCashPaise,
                creditPaise: 0n,
                component: 'CAPITAL',
                personId: relationshipSettlement.personId
            }));
        }
        if (grossRecPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_rec`,
                accountType: 'ASSET',
                accountId: 'ASSET_P2P_RECEIVABLE',
                debitPaise: 0n,
                creditPaise: grossRecPaise,
                component: 'PRINCIPAL',
                personId: relationshipSettlement.personId
            }));
        }
        if (!isReceivable && netCashPaise > 0n) {
            lines.push(createJournalLine({
                id: `jl_${entryId}_cash_out`,
                accountType: 'ASSET',
                accountId: targetAccount,
                debitPaise: 0n,
                creditPaise: netCashPaise,
                component: 'CAPITAL',
                personId: relationshipSettlement.personId
            }));
        }
    } else if (evType === JOURNAL_EVENT_TYPES.P2P_SETTLEMENT && settlement) {
        const isGiven = (loan && loan.direction === LOAN_DIRECTION.GIVEN) || settlement.direction === LOAN_DIRECTION.GIVEN;
        const pAmtPaise = settlement.principalOutstandingPaise !== undefined ? toBigIntPaise(settlement.principalOutstandingPaise) : rupeesToPaise(settlement.principalOutstanding || 0);
        const iAmtPaise = settlement.interestOutstandingPaise !== undefined ? toBigIntPaise(settlement.interestOutstandingPaise) : rupeesToPaise(settlement.interestOutstanding || 0);
        const wAmtPaise = settlement.waiverAmountPaise !== undefined ? toBigIntPaise(settlement.waiverAmountPaise) : rupeesToPaise(settlement.waiverAmount || 0);
        const cashAmtPaise = settlement.finalSettlementAmountPaise !== undefined 
            ? toBigIntPaise(settlement.finalSettlementAmountPaise) 
            : (settlement.finalSettlementAmount !== undefined ? rupeesToPaise(settlement.finalSettlementAmount) : (pAmtPaise + iAmtPaise - wAmtPaise));

        if (isGiven) {
            if (cashAmtPaise > 0n) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_c`,
                    accountType: 'ASSET',
                    accountId: targetAccount,
                    debitPaise: cashAmtPaise,
                    creditPaise: 0n,
                    component: 'CAPITAL',
                    loanId: resolvedEntityId
                }));
            }
            if (wAmtPaise > 0n) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_w`,
                    accountType: 'EXPENSE',
                    accountId: 'EXPENSE_P2P_WAIVER',
                    debitPaise: wAmtPaise,
                    creditPaise: 0n,
                    component: 'WAIVER',
                    loanId: resolvedEntityId
                }));
            }
            if (pAmtPaise > 0n) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_p`,
                    accountType: 'ASSET',
                    accountId: 'ASSET_P2P_RECEIVABLE',
                    debitPaise: 0n,
                    creditPaise: pAmtPaise,
                    component: 'PRINCIPAL',
                    loanId: resolvedEntityId
                }));
            }
            if (iAmtPaise > 0n) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_i`,
                    accountType: 'INCOME',
                    accountId: 'INCOME_P2P_INTEREST',
                    debitPaise: 0n,
                    creditPaise: iAmtPaise,
                    component: 'INTEREST',
                    loanId: resolvedEntityId
                }));
            }
        } else {
            if (pAmtPaise > 0n) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_p`,
                    accountType: 'LIABILITY',
                    accountId: 'LIABILITY_P2P_PAYABLE',
                    debitPaise: pAmtPaise,
                    creditPaise: 0n,
                    component: 'PRINCIPAL',
                    loanId: resolvedEntityId
                }));
            }
            if (iAmtPaise > 0n) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_i`,
                    accountType: 'EXPENSE',
                    accountId: 'EXPENSE_P2P_INTEREST',
                    debitPaise: iAmtPaise,
                    creditPaise: 0n,
                    component: 'INTEREST',
                    loanId: resolvedEntityId
                }));
            }
            if (cashAmtPaise > 0n) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_c`,
                    accountType: 'ASSET',
                    accountId: targetAccount,
                    debitPaise: 0n,
                    creditPaise: cashAmtPaise,
                    component: 'CAPITAL',
                    loanId: resolvedEntityId
                }));
            }
            if (wAmtPaise > 0n) {
                lines.push(createJournalLine({
                    id: `jl_${entryId}_w`,
                    accountType: 'INCOME',
                    accountId: 'INCOME_P2P_WAIVER',
                    debitPaise: 0n,
                    creditPaise: wAmtPaise,
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
export function createReversalJournalEntry(firstArg, secondArg, thirdArg, fourthArg) {
    const isObjectParam = firstArg && typeof firstArg === 'object' && ('originalJournalEntry' in firstArg);
    const originalJournalEntry = isObjectParam ? firstArg.originalJournalEntry : firstArg;
    const reversalReason = isObjectParam ? (firstArg.reversalReason || 'User correction') : (secondArg || 'User correction');
    const reversedBy = isObjectParam ? (firstArg.reversedBy || 'FINLIFE_USER') : (thirdArg || 'FINLIFE_USER');
    const date = isObjectParam ? (firstArg.date || new Date().toISOString().split('T')[0]) : (fourthArg || new Date().toISOString().split('T')[0]);

    if (!originalJournalEntry || !Array.isArray(originalJournalEntry.lines)) {
        throw new Error('Original journal entry with valid lines is required for reversal.');
    }

    const entryId = `je_p2p_rev_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const reversedLines = originalJournalEntry.lines.map((l, idx) => createJournalLine({
        id: `jl_${entryId}_${idx}`,
        accountType: l.accountType,
        accountId: l.accountId,
        debitPaise: l.creditPaise !== undefined ? l.creditPaise : rupeesToPaise(l.credit || 0),   // Invert debit/credit paise
        creditPaise: l.debitPaise !== undefined ? l.debitPaise : rupeesToPaise(l.debit || 0),
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
            totalGivenPaise: 0n,
            totalReceivedPaise: 0n,
            totalTakenPaise: 0n,
            totalPaidPaise: 0n,
            netBalancePaise: 0n,
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
        const pPaise = l.principalPaise !== undefined ? toBigIntPaise(l.principalPaise) : rupeesToPaise(l.principal);
        loanProjections[l.id] = {
            id: l.id,
            personId: l.personId,
            direction: l.direction,
            principalPaise: pPaise,
            principal: paiseToRupees(pPaise),
            totalAdvancedPaise: 0n,
            principalPaidPaise: 0n,
            interestPaidPaise: 0n,
            interestAccruedPaise: 0n,
            outstandingPrincipalPaise: 0n,
            outstandingInterestPaise: 0n,
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
            const dPaise = line.debitPaise !== undefined ? toBigIntPaise(line.debitPaise) : rupeesToPaise(line.debit);
            const cPaise = line.creditPaise !== undefined ? toBigIntPaise(line.creditPaise) : rupeesToPaise(line.credit);

            if (loanProjections[lId]) {
                const lp = loanProjections[lId];
                if (line.accountId === 'ASSET_P2P_RECEIVABLE') {
                    lp.totalAdvancedPaise += dPaise;
                    lp.principalPaidPaise += cPaise;
                } else if (line.accountId === 'LIABILITY_P2P_PAYABLE') {
                    lp.totalAdvancedPaise += cPaise;
                    lp.principalPaidPaise += dPaise;
                } else if (line.accountId === 'INCOME_P2P_INTEREST' || line.accountId === 'EXPENSE_P2P_INTEREST') {
                    lp.interestPaidPaise += (cPaise > 0n ? cPaise : dPaise);
                }
            }

            if (personProjections[pId]) {
                const pp = personProjections[pId];
                if (line.accountId === 'ASSET_P2P_RECEIVABLE') {
                    pp.totalGivenPaise += dPaise;
                    pp.totalReceivedPaise += cPaise;
                } else if (line.accountId === 'LIABILITY_P2P_PAYABLE') {
                    pp.totalTakenPaise += cPaise;
                    pp.totalPaidPaise += dPaise;
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
        lp.outstandingPrincipalPaise = lp.totalAdvancedPaise > lp.principalPaidPaise ? lp.totalAdvancedPaise - lp.principalPaidPaise : 0n;
        lp.totalAdvanced = paiseToRupees(lp.totalAdvancedPaise);
        lp.principalPaid = paiseToRupees(lp.principalPaidPaise);
        lp.interestPaid = paiseToRupees(lp.interestPaidPaise);
        lp.outstandingPrincipal = paiseToRupees(lp.outstandingPrincipalPaise);
        if (lp.outstandingPrincipalPaise === 0n && lp.outstandingInterestPaise === 0n && lp.totalAdvancedPaise > 0n) {
            lp.status = LOAN_STATUS.SETTLED;
        }
    });

    // Finalize person relationship netting
    const relationships = {};
    Object.values(personProjections).forEach(pp => {
        const netPaise = (pp.totalGivenPaise - pp.totalReceivedPaise) - (pp.totalTakenPaise - pp.totalPaidPaise);
        pp.totalGiven = paiseToRupees(pp.totalGivenPaise);
        pp.totalReceived = paiseToRupees(pp.totalReceivedPaise);
        pp.totalTaken = paiseToRupees(pp.totalTakenPaise);
        pp.totalPaid = paiseToRupees(pp.totalPaidPaise);
        pp.netBalancePaise = netPaise;
        pp.netBalance = paiseToRupees(netPaise);
        pp.direction = netPaise >= 0n ? 'RECEIVABLE' : 'PAYABLE';

        const pLoans = Object.values(loanProjections).filter(lp => lp.personId === pp.personId);
        pp.pendingLoanIds = pLoans.filter(l => l.status === LOAN_STATUS.ACTIVE).map(l => l.id);
        pp.settledLoanIds = pLoans.filter(l => l.status === LOAN_STATUS.SETTLED).map(l => l.id);

        relationships[pp.personId] = createPersonRelationship({
            personId: pp.personId,
            totalGivenPaise: pp.totalGivenPaise,
            totalTakenPaise: pp.totalTakenPaise,
            netBalancePaise: netPaise,
            pendingLoanIds: pp.pendingLoanIds,
            settledLoanIds: pp.settledLoanIds
        });
    });

    return {
        loanProjections,
        personProjections,
        loans: loanProjections,
        persons: personProjections,
        relationships
    };
}

