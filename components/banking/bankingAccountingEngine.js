/**
 * FinLife Banking Relationship Intelligence — Accounting & Mathematical Engine
 * 
 * Implements strict integer-paise calculations, amortization schedules, zero-rate safety,
 * rate revisions, prepayment decision intelligence, foreclosure quotes, and balanced double-entry journals.
 */

import {
    toPaise,
    fromPaise,
    validateMonetaryInput,
    MONEY_VALIDITY,
    INTEREST_METHOD,
    INSTALLMENT_STATUS,
    BANKING_JOURNAL_EVENT_TYPES,
    createBankingJournalLine,
    createBankingJournalEntry
} from './bankingDomainModel.js';

// ── DATE UTILITIES ───────────────────────────────────────────────────────────

export function addMonthsToDate(dateStr, monthsToAdd) {
    if (!dateStr) return new Date().toISOString().split('T')[0];
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(y, (m - 1) + monthsToAdd, d));
    return targetDate.toISOString().split('T')[0];
}

export function diffInDays(dateStr1, dateStr2) {
    const d1 = new Date(dateStr1);
    const d2 = new Date(dateStr2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ── AMORTIZATION & SCHEDULE GENERATION ───────────────────────────────────────

/**
 * Calculates exact contractual EMI in paise.
 * Natively supports zero-rate (r = 0) loans without division by zero.
 */
export function calculateContractualEMIPaise(principalPaise, annualRate, tenureMonths) {
    const p = Math.round(Number(principalPaise) || 0);
    const n = Math.max(1, parseInt(tenureMonths, 10) || 1);
    const rate = Number(annualRate) || 0;

    if (p <= 0) return 0;
    if (rate <= 0) {
        return Math.floor(p / n);
    }

    const r = rate / 1200; // Monthly rate decimal
    const factor = Math.pow(1 + r, n);
    if (!isFinite(factor) || (factor - 1) === 0) {
        return Math.floor(p / n);
    }

    const emi = p * ((r * factor) / (factor - 1));
    return Math.round(emi);
}

/**
 * Generates initial amortization schedule in integer paise.
 * Guarantees zero phantom residuals: Sum(ExpectedPrincipal) === OriginalPrincipal, Final Closing = 0.
 */
export function generateBankLoanSchedule(loan) {
    if (!loan) throw new Error('[Banking Engine] Loan is required to generate schedule.');

    const originalPrincipalPaise = Math.round(Number(loan.originalPrincipalPaise || (loan.originalPrincipal ? toPaise(loan.originalPrincipal) : 0)));
    if (originalPrincipalPaise <= 0) {
        throw new Error('[Banking Engine] Loan original principal must be strictly positive.');
    }

    const tenure = Math.max(1, parseInt(loan.tenureMonths, 10) || 12);
    const annualRate = Number(loan.interestRate) || 0;
    const isAmortized = loan.interestMethod === INTEREST_METHOD.AMORTIZED || !loan.interestMethod;
    const isSimple = loan.interestMethod === INTEREST_METHOD.SIMPLE;

    const contractualEMIPaise = isAmortized
        ? calculateContractualEMIPaise(originalPrincipalPaise, annualRate, tenure)
        : 0;

    const simpleBasePrincipalPaise = isSimple
        ? Math.floor(originalPrincipalPaise / tenure)
        : 0;

    const schedule = [];
    let currentOpeningPaise = originalPrincipalPaise;
    const r = annualRate / 1200;

    const startDate = loan.startDate || new Date().toISOString().split('T')[0];

    for (let i = 1; i <= tenure; i++) {
        const pStart = addMonthsToDate(startDate, i - 1);
        const pEnd = addMonthsToDate(startDate, i);
        const dueDate = pEnd;

        let expInterestPaise = 0;
        let expPrincipalPaise = 0;

        if (annualRate > 0) {
            expInterestPaise = Math.round(currentOpeningPaise * r);
        }

        if (i === tenure) {
            // Final installment reconciles exact remaining principal to ₹0.00
            expPrincipalPaise = currentOpeningPaise;
        } else if (isAmortized) {
            expPrincipalPaise = Math.max(0, contractualEMIPaise - expInterestPaise);
            if (expPrincipalPaise > currentOpeningPaise) {
                expPrincipalPaise = currentOpeningPaise;
            }
        } else if (isSimple) {
            expPrincipalPaise = simpleBasePrincipalPaise;
        } else {
            // Zero interest / bullet
            expPrincipalPaise = Math.floor(originalPrincipalPaise / tenure);
        }

        const expTotalPaise = expPrincipalPaise + expInterestPaise;
        const closingPrincipalPaise = Math.max(0, currentOpeningPaise - expPrincipalPaise);

        schedule.push({
            id: `inst_${loan.id}_${i}`,
            loanId: loan.id,
            installmentNumber: i,
            periodStart: pStart,
            periodEnd: pEnd,
            dueDate: dueDate,
            openingPrincipalPaise: currentOpeningPaise,
            expectedPrincipalPaise: expPrincipalPaise,
            expectedInterestPaise: expInterestPaise,
            expectedFeesPaise: 0,
            expectedPenaltyPaise: 0,
            expectedTotalPaise: expTotalPaise,
            paidPrincipalPaise: 0,
            paidInterestPaise: 0,
            paidFeesPaise: 0,
            paidPenaltyPaise: 0,
            paidTotalPaise: 0,
            closingPrincipalPaise: closingPrincipalPaise,
            status: INSTALLMENT_STATUS.PENDING,
            paidDate: null,
            appliedRate: annualRate
        });

        currentOpeningPaise = closingPrincipalPaise;
    }

    return schedule;
}

// ── RATE REVISION ENGINE ─────────────────────────────────────────────────────

/**
 * Re-amortizes future installments following a floating interest rate revision (BANK-26, BANK-27).
 * Historical paid installments remain immutable.
 */
export function applyRateRevisionToSchedule({ loan, schedule = [], rateRevision }) {
    if (!rateRevision || rateRevision.annualRate === undefined) {
        throw new Error('[Banking Engine] Valid rateRevision is required.');
    }

    const effectiveDate = rateRevision.effectiveDate || new Date().toISOString().split('T')[0];
    const newRate = Number(rateRevision.annualRate) || 0;
    const rNew = newRate / 1200;

    // Find the first unpaid installment on or after effectiveDate
    const splitIndex = schedule.findIndex(item => 
        (item.status !== INSTALLMENT_STATUS.PAID && item.status !== INSTALLMENT_STATUS.CLOSED_BY_SETTLEMENT) &&
        item.dueDate >= effectiveDate
    );

    if (splitIndex === -1) {
        return schedule; // No future installments to re-amortize
    }

    const updatedSchedule = [...schedule];
    let runningOpeningPaise = updatedSchedule[splitIndex].openingPrincipalPaise;
    const remainingTenure = updatedSchedule.length - splitIndex;

    const newEMIPaise = calculateContractualEMIPaise(runningOpeningPaise, newRate, remainingTenure);

    for (let i = splitIndex; i < updatedSchedule.length; i++) {
        const item = updatedSchedule[i];
        const isFinal = (i === updatedSchedule.length - 1);

        let expInterestPaise = (newRate > 0) ? Math.round(runningOpeningPaise * rNew) : 0;
        let expPrincipalPaise = 0;

        if (isFinal) {
            expPrincipalPaise = runningOpeningPaise;
        } else {
            expPrincipalPaise = Math.max(0, newEMIPaise - expInterestPaise);
            if (expPrincipalPaise > runningOpeningPaise) {
                expPrincipalPaise = runningOpeningPaise;
            }
        }

        const expTotalPaise = expPrincipalPaise + expInterestPaise + item.expectedFeesPaise + item.expectedPenaltyPaise;
        const closingPaise = Math.max(0, runningOpeningPaise - expPrincipalPaise);

        updatedSchedule[i] = {
            ...item,
            openingPrincipalPaise: runningOpeningPaise,
            expectedPrincipalPaise: expPrincipalPaise,
            expectedInterestPaise: expInterestPaise,
            expectedTotalPaise: expTotalPaise,
            closingPrincipalPaise: closingPaise,
            appliedRate: newRate
        };

        runningOpeningPaise = closingPaise;
    }

    return updatedSchedule;
}

// ── PAYMENT ALLOCATION & RECALCULATION ───────────────────────────────────────

/**
 * Allocates a payment in integer paise according to the banking waterfall:
 * 1. Fees -> 2. Penalties -> 3. Accrued Interest -> 4. Principal
 */
export function allocateEMIPayment({
    paymentAmountPaise = 0,
    expectedPrincipalPaise = 0,
    expectedInterestPaise = 0,
    expectedFeesPaise = 0,
    expectedPenaltyPaise = 0
}) {
    let unallocated = Math.round(Number(paymentAmountPaise) || 0);

    const paidFees = Math.min(unallocated, Math.round(Number(expectedFeesPaise) || 0));
    unallocated -= paidFees;

    const paidPenalty = Math.min(unallocated, Math.round(Number(expectedPenaltyPaise) || 0));
    unallocated -= paidPenalty;

    const paidInterest = Math.min(unallocated, Math.round(Number(expectedInterestPaise) || 0));
    unallocated -= paidInterest;

    const paidPrincipal = Math.min(unallocated, Math.round(Number(expectedPrincipalPaise) || 0));
    unallocated -= paidPrincipal;

    // Any surplus payment beyond expected components goes to extra principal
    const extraPrincipal = unallocated > 0 ? unallocated : 0;

    return {
        paidFeesPaise: paidFees,
        paidPenaltyPaise: paidPenalty,
        paidInterestPaise: paidInterest,
        paidPrincipalPaise: paidPrincipal + extraPrincipal,
        totalPaidPaise: paidFees + paidPenalty + paidInterest + paidPrincipal + extraPrincipal,
        isFullySatisfied: (paidFees >= expectedFeesPaise && paidPenalty >= expectedPenaltyPaise && paidInterest >= expectedInterestPaise && (paidPrincipal + extraPrincipal) >= expectedPrincipalPaise)
    };
}

/**
 * Recalculates schedule after recording an EMI payment
 */
export function recalculateScheduleAfterEMIPayment({
    loan,
    schedule = [],
    installmentId = null,
    paymentAmountPaise = 0,
    paymentDate = new Date().toISOString().split('T')[0]
}) {
    const targetIdx = installmentId
        ? schedule.findIndex(s => s.id === installmentId)
        : schedule.findIndex(s => s.status === INSTALLMENT_STATUS.PENDING || s.status === INSTALLMENT_STATUS.PARTIALLY_PAID || s.status === INSTALLMENT_STATUS.DUE || s.status === INSTALLMENT_STATUS.OVERDUE);

    if (targetIdx === -1) return schedule;

    const updated = [...schedule];
    const target = updated[targetIdx];

    const expP = Math.max(0, target.expectedPrincipalPaise - target.paidPrincipalPaise);
    const expI = Math.max(0, target.expectedInterestPaise - target.paidInterestPaise);
    const expF = Math.max(0, target.expectedFeesPaise - target.paidFeesPaise);
    const expPen = Math.max(0, target.expectedPenaltyPaise - target.paidPenaltyPaise);

    const alloc = allocateEMIPayment({
        paymentAmountPaise,
        expectedPrincipalPaise: expP,
        expectedInterestPaise: expI,
        expectedFeesPaise: expF,
        expectedPenaltyPaise: expPen
    });

    const newPaidP = target.paidPrincipalPaise + alloc.paidPrincipalPaise;
    const newPaidI = target.paidInterestPaise + alloc.paidInterestPaise;
    const newPaidF = target.paidFeesPaise + alloc.paidFeesPaise;
    const newPaidPen = target.paidPenaltyPaise + alloc.paidPenaltyPaise;
    const newPaidTot = target.paidTotalPaise + alloc.totalPaidPaise;

    const isComplete = (newPaidTot >= target.expectedTotalPaise);

    updated[targetIdx] = {
        ...target,
        paidPrincipalPaise: newPaidP,
        paidInterestPaise: newPaidI,
        paidFeesPaise: newPaidF,
        paidPenaltyPaise: newPaidPen,
        paidTotalPaise: newPaidTot,
        status: isComplete ? INSTALLMENT_STATUS.PAID : INSTALLMENT_STATUS.PARTIALLY_PAID,
        paidDate: isComplete ? paymentDate : target.paidDate
    };

    return updated;
}

// ── PREPAYMENT DECISION INTELLIGENCE ─────────────────────────────────────────

/**
 * Prepayment Intelligence Model:
 * Evaluates Option A (Reduce Tenure) vs Option B (Reduce EMI) with impossible-case guards.
 */
export function calculatePrepaymentIntelligence({
    outstandingPrincipalPaise = 0,
    annualRate = 0,
    remainingTenureMonths = 0,
    contractualEMIPaise = 0,
    prepaymentAmountPaise = 0,
    prepaymentPenaltyPct = 0,
    processingFeePaise = 0
}) {
    const P = Math.round(Number(outstandingPrincipalPaise) || 0);
    const prepay = Math.round(Number(prepaymentAmountPaise) || 0);
    const rate = Number(annualRate) || 0;
    const r = rate / 1200;
    const n = Math.max(1, parseInt(remainingTenureMonths, 10) || 1);
    const emi = Math.round(Number(contractualEMIPaise) || calculateContractualEMIPaise(P, rate, n));

    if (prepay <= 0) {
        return { valid: false, error: 'Prepayment amount must be greater than zero.' };
    }

    if (prepay >= P) {
        return {
            valid: true,
            isForeclosureRequired: true,
            message: 'Prepayment satisfies entire principal. Please use Foreclose Loan flow.'
        };
    }

    const newPrincipalPaise = P - prepay;

    // Impossible-case guard: if EMI <= P' * r, the loan will never amortize
    if (rate > 0 && emi <= (newPrincipalPaise * r)) {
        return {
            valid: false,
            error: 'PREPAYMENT_SCENARIO_INVALID',
            message: 'Contractual EMI is insufficient to service interest on remaining principal.'
        };
    }

    // Baseline: Total interest remaining without prepayment
    let baselineInterestRemainingPaise = 0;
    if (rate > 0) {
        baselineInterestRemainingPaise = Math.max(0, (emi * n) - P);
    }

    // ── OPTION A: KEEP EMI -> REDUCE TENURE ──
    let optionANewTenureMonths = 1;
    let optionAInterestRemainingPaise = 0;

    if (rate <= 0) {
        optionANewTenureMonths = Math.ceil(newPrincipalPaise / emi);
    } else {
        const top = Math.log(emi / (emi - (newPrincipalPaise * r)));
        const bottom = Math.log(1 + r);
        optionANewTenureMonths = Math.ceil(top / bottom);
        optionAInterestRemainingPaise = Math.max(0, (emi * optionANewTenureMonths) - newPrincipalPaise);
    }

    const optionAMonthsSaved = Math.max(0, n - optionANewTenureMonths);
    const optionAGrossInterestSavedPaise = Math.max(0, baselineInterestRemainingPaise - optionAInterestRemainingPaise);

    // Prepayment Penalty & Charges
    const penaltyPaise = Math.round(prepay * (Number(prepaymentPenaltyPct || 0) / 100));
    const chargesPaise = penaltyPaise + Math.round(Number(processingFeePaise) || 0);

    const optionANetBenefitPaise = Math.max(0, optionAGrossInterestSavedPaise - chargesPaise);

    // ── OPTION B: KEEP TENURE -> REDUCE EMI ──
    const optionBNewEMIPaise = calculateContractualEMIPaise(newPrincipalPaise, rate, n);
    const optionBMonthlyCashReleasedPaise = Math.max(0, emi - optionBNewEMIPaise);
    const optionBInterestRemainingPaise = Math.max(0, (optionBNewEMIPaise * n) - newPrincipalPaise);
    const optionBGrossInterestSavedPaise = Math.max(0, baselineInterestRemainingPaise - optionBInterestRemainingPaise);
    const optionBNetBenefitPaise = Math.max(0, optionBGrossInterestSavedPaise - chargesPaise);

    return {
        valid: true,
        isForeclosureRequired: false,
        prepaymentAmountPaise: prepay,
        prepaymentChargesPaise: chargesPaise,
        currentOutstandingPrincipalPaise: P,
        newOutstandingPrincipalPaise: newPrincipalPaise,
        currentEMIPaise: emi,
        currentRemainingMonths: n,
        baselineInterestRemainingPaise,
        optionA: {
            strategy: 'REDUCE_TENURE',
            newEMIPaise: emi,
            newTenureMonths: optionANewTenureMonths,
            monthsSaved: optionAMonthsSaved,
            futureInterestRemainingPaise: optionAInterestRemainingPaise,
            grossInterestSavedPaise: optionAGrossInterestSavedPaise,
            netBenefitPaise: optionANetBenefitPaise
        },
        optionB: {
            strategy: 'REDUCE_EMI',
            newEMIPaise: optionBNewEMIPaise,
            newTenureMonths: n,
            monthlyCashReleasedPaise: optionBMonthlyCashReleasedPaise,
            futureInterestRemainingPaise: optionBInterestRemainingPaise,
            grossInterestSavedPaise: optionBGrossInterestSavedPaise,
            netBenefitPaise: optionBNetBenefitPaise
        },
        recommendation: optionANetBenefitPaise >= optionBNetBenefitPaise ? 'OPTION_A_TENURE_REDUCTION' : 'OPTION_B_EMI_REDUCTION'
    };
}

/**
 * Re-amortizes schedule after a lump-sum principal prepayment
 */
export function applyPrepaymentToSchedule({
    loan,
    schedule = [],
    prepaymentAmountPaise = 0,
    prepaymentDate = new Date().toISOString().split('T')[0],
    strategy = 'REDUCE_TENURE' // 'REDUCE_TENURE' | 'REDUCE_EMI'
}) {
    const prepay = Math.round(Number(prepaymentAmountPaise) || 0);
    if (prepay <= 0) return schedule;

    const targetIdx = schedule.findIndex(s => 
        (s.status !== INSTALLMENT_STATUS.PAID && s.status !== INSTALLMENT_STATUS.CLOSED_BY_SETTLEMENT) &&
        s.dueDate >= prepaymentDate
    );

    if (targetIdx === -1) return schedule;

    const updated = [...schedule];
    const initialOpening = updated[targetIdx].openingPrincipalPaise;
    const newOpening = Math.max(0, initialOpening - prepay);
    const rate = Number(loan.interestRate) || 0;

    if (strategy === 'REDUCE_TENURE') {
        const intelligence = calculatePrepaymentIntelligence({
            outstandingPrincipalPaise: initialOpening,
            annualRate: rate,
            remainingTenureMonths: updated.length - targetIdx,
            contractualEMIPaise: updated[targetIdx].expectedTotalPaise,
            prepaymentAmountPaise: prepay
        });

        if (intelligence.valid && intelligence.optionA) {
            const newTenure = intelligence.optionA.newTenureMonths;
            const keptSchedule = updated.slice(0, targetIdx);
            let runningP = newOpening;
            const r = rate / 1200;
            const emi = updated[targetIdx].expectedTotalPaise;

            for (let i = 1; i <= newTenure; i++) {
                const origItem = updated[targetIdx + i - 1] || updated[updated.length - 1];
                const isFinal = (i === newTenure);

                const expI = (rate > 0) ? Math.round(runningP * r) : 0;
                let expP = isFinal ? runningP : Math.max(0, emi - expI);
                if (expP > runningP) expP = runningP;

                const closing = Math.max(0, runningP - expP);

                keptSchedule.push({
                    ...origItem,
                    installmentNumber: targetIdx + i,
                    openingPrincipalPaise: runningP,
                    expectedPrincipalPaise: expP,
                    expectedInterestPaise: expI,
                    expectedTotalPaise: expP + expI,
                    closingPrincipalPaise: closing
                });

                runningP = closing;
            }
            return keptSchedule;
        }
    }

    // Default: REDUCE_EMI
    const remainingCount = updated.length - targetIdx;
    const newEMIPaise = calculateContractualEMIPaise(newOpening, rate, remainingCount);
    let runningP = newOpening;
    const r = rate / 1200;

    for (let i = targetIdx; i < updated.length; i++) {
        const item = updated[i];
        const isFinal = (i === updated.length - 1);

        const expI = (rate > 0) ? Math.round(runningP * r) : 0;
        let expP = isFinal ? runningP : Math.max(0, newEMIPaise - expI);
        if (expP > runningP) expP = runningP;

        const closing = Math.max(0, runningP - expP);

        updated[i] = {
            ...item,
            openingPrincipalPaise: runningP,
            expectedPrincipalPaise: expP,
            expectedInterestPaise: expI,
            expectedTotalPaise: expP + expI,
            closingPrincipalPaise: closing
        };

        runningP = closing;
    }

    return updated;
}

// ── FORECLOSURE QUOTE ENGINE ─────────────────────────────────────────────────

/**
 * Calculates complete foreclosure quote with all fees, charges, accrued interest, and waivers.
 */
export function calculateForeclosureQuote({
    outstandingPrincipalPaise = 0,
    accruedInterestPaise = 0,
    prepaymentPenaltyPct = 0,
    outstandingFeesPaise = 0,
    penaltyChargesPaise = 0,
    waiverAmountPaise = 0
}) {
    const P = Math.round(Number(outstandingPrincipalPaise) || 0);
    const I = Math.round(Number(accruedInterestPaise) || 0);
    const F = Math.round(Number(outstandingFeesPaise) || 0);
    const Pen = Math.round(Number(penaltyChargesPaise) || 0);
    const W = Math.round(Number(waiverAmountPaise) || 0);

    const prepayPenaltyPaise = Math.round(P * (Number(prepaymentPenaltyPct || 0) / 100));
    const grossSettlementPaise = P + I + F + Pen + prepayPenaltyPaise;
    const finalSettlementPaise = Math.max(0, grossSettlementPaise - W);

    return {
        outstandingPrincipalPaise: P,
        accruedInterestPaise: I,
        prepaymentPenaltyPaise: prepayPenaltyPaise,
        outstandingFeesPaise: F,
        penaltyChargesPaise: Pen,
        grossSettlementPaise,
        waiverAmountPaise: W,
        finalSettlementAmountPaise: finalSettlementPaise
    };
}

// ── DOUBLE-ENTRY BANKING JOURNAL FACTORY ──────────────────────────────────────

/**
 * Double-Entry Banking Journal Factory
 * Enforces sum(Debits) === sum(Credits) to the exact paisa.
 */
export function createDoubleEntryBankingJournalForEvent({
    eventType,
    bankId,
    bankAccountId = null,
    loanId = null,
    date = new Date().toISOString().split('T')[0],
    amountPaise = null,
    amount = null, // Convenience INR input
    principalPaise = null,
    interestPaise = null,
    feePaise = null,
    penaltyPaise = null,
    waiverPaise = null,
    foreclosureQuote = null,
    metadata = {}
}) {
    if (!eventType) throw new Error('[Banking Journal] eventType is required.');
    if (!bankId) throw new Error('[Banking Journal] bankId is required.');

    const totalInflowOutflowPaise = amountPaise !== null ? Math.round(Number(amountPaise)) : (amount !== null ? toPaise(amount) : null);
    const lines = [];

    const cashAccountId = bankAccountId ? `ASSET_BANK_CASH_${bankAccountId}` : `ASSET_BANK_CASH_${bankId}`;
    const loanLiabilityId = loanId ? `LIABILITY_BANK_LOAN_${loanId}` : `LIABILITY_BANK_LOAN_${bankId}`;

    if (eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_ACCOUNT_OPENED) {
        const pAmt = totalInflowOutflowPaise || 0;
        if (pAmt > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'ASSET',
                accountId: cashAccountId,
                debitPaise: pAmt,
                creditPaise: 0,
                component: 'CASH',
                bankId,
                bankAccountId
            }));
            lines.push(createBankingJournalLine({
                accountType: 'EQUITY',
                accountId: 'EQUITY_OPENING_BALANCE',
                debitPaise: 0,
                creditPaise: pAmt,
                component: 'CAPITAL',
                bankId,
                bankAccountId
            }));
        }
    } else if (eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_DISBURSED) {
        const pAmt = totalInflowOutflowPaise || 0;
        if (pAmt <= 0) throw new Error('[Banking Journal] Loan disbursement amount must be positive.');

        lines.push(createBankingJournalLine({
            accountType: 'ASSET',
            accountId: cashAccountId,
            debitPaise: pAmt,
            creditPaise: 0,
            component: 'CASH',
            bankId,
            bankAccountId,
            loanId
        }));
        lines.push(createBankingJournalLine({
            accountType: 'LIABILITY',
            accountId: loanLiabilityId,
            debitPaise: 0,
            creditPaise: pAmt,
            component: 'PRINCIPAL',
            bankId,
            bankAccountId,
            loanId
        }));
    } else if (eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_EMI_PAID) {
        const pPaid = Math.round(Number(principalPaise) || 0);
        const iPaid = Math.round(Number(interestPaise) || 0);
        const fPaid = Math.round(Number(feePaise) || 0);
        const penPaid = Math.round(Number(penaltyPaise) || 0);
        const totalPaid = pPaid + iPaid + fPaid + penPaid;

        if (pPaid > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'LIABILITY',
                accountId: loanLiabilityId,
                debitPaise: pPaid,
                creditPaise: 0,
                component: 'PRINCIPAL',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (iPaid > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_BANK_LOAN_INTEREST',
                debitPaise: iPaid,
                creditPaise: 0,
                component: 'INTEREST',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (fPaid > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_BANK_LOAN_FEE',
                debitPaise: fPaid,
                creditPaise: 0,
                component: 'FEE',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (penPaid > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_BANK_LOAN_PENALTY',
                debitPaise: penPaid,
                creditPaise: 0,
                component: 'PENALTY',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (totalPaid > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'ASSET',
                accountId: cashAccountId,
                debitPaise: 0,
                creditPaise: totalPaid,
                component: 'CASH',
                bankId,
                bankAccountId,
                loanId
            }));
        }
    } else if (eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_PRINCIPAL_PREPAID) {
        const pPaid = Math.round(Number(principalPaise) || totalInflowOutflowPaise || 0);
        const fPaid = Math.round(Number(feePaise) || 0);
        const totalOutflow = pPaid + fPaid;

        if (pPaid > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'LIABILITY',
                accountId: loanLiabilityId,
                debitPaise: pPaid,
                creditPaise: 0,
                component: 'PRINCIPAL',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (fPaid > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_BANK_PREPAYMENT_PENALTY',
                debitPaise: fPaid,
                creditPaise: 0,
                component: 'FEE',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (totalOutflow > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'ASSET',
                accountId: cashAccountId,
                debitPaise: 0,
                creditPaise: totalOutflow,
                component: 'CASH',
                bankId,
                bankAccountId,
                loanId
            }));
        }
    } else if (eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_LOAN_FORECLOSED && foreclosureQuote) {
        const q = foreclosureQuote;
        if (q.outstandingPrincipalPaise > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'LIABILITY',
                accountId: loanLiabilityId,
                debitPaise: q.outstandingPrincipalPaise,
                creditPaise: 0,
                component: 'PRINCIPAL',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (q.accruedInterestPaise > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_BANK_LOAN_INTEREST',
                debitPaise: q.accruedInterestPaise,
                creditPaise: 0,
                component: 'INTEREST',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (q.prepaymentPenaltyPaise > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_BANK_PREPAYMENT_PENALTY',
                debitPaise: q.prepaymentPenaltyPaise,
                creditPaise: 0,
                component: 'FEE',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (q.outstandingFeesPaise > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_BANK_LOAN_FEE',
                debitPaise: q.outstandingFeesPaise,
                creditPaise: 0,
                component: 'FEE',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (q.penaltyChargesPaise > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'EXPENSE',
                accountId: 'EXPENSE_BANK_LOAN_PENALTY',
                debitPaise: q.penaltyChargesPaise,
                creditPaise: 0,
                component: 'PENALTY',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (q.waiverAmountPaise > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'INCOME',
                accountId: 'INCOME_BANK_WAIVER',
                debitPaise: 0,
                creditPaise: q.waiverAmountPaise,
                component: 'WAIVER',
                bankId,
                bankAccountId,
                loanId
            }));
        }
        if (q.finalSettlementAmountPaise > 0) {
            lines.push(createBankingJournalLine({
                accountType: 'ASSET',
                accountId: cashAccountId,
                debitPaise: 0,
                creditPaise: q.finalSettlementAmountPaise,
                component: 'CASH',
                bankId,
                bankAccountId,
                loanId
            }));
        }
    } else if (eventType === BANKING_JOURNAL_EVENT_TYPES.BANK_ACCOUNT_ADJUSTMENT) {
        const pAmt = Math.abs(totalInflowOutflowPaise || 0);
        const isDebitToCash = (totalInflowOutflowPaise >= 0);

        if (isDebitToCash) {
            lines.push(createBankingJournalLine({
                accountType: 'ASSET',
                accountId: cashAccountId,
                debitPaise: pAmt,
                creditPaise: 0,
                component: 'CASH',
                bankId,
                bankAccountId
            }));
            lines.push(createBankingJournalLine({
                accountType: 'EQUITY',
                accountId: 'EQUITY_RECONCILIATION_ADJUSTMENT',
                debitPaise: 0,
                creditPaise: pAmt,
                component: 'CAPITAL',
                bankId,
                bankAccountId
            }));
        } else {
            lines.push(createBankingJournalLine({
                accountType: 'EQUITY',
                accountId: 'EQUITY_RECONCILIATION_ADJUSTMENT',
                debitPaise: pAmt,
                creditPaise: 0,
                component: 'CAPITAL',
                bankId,
                bankAccountId
            }));
            lines.push(createBankingJournalLine({
                accountType: 'ASSET',
                accountId: cashAccountId,
                debitPaise: 0,
                creditPaise: pAmt,
                component: 'CASH',
                bankId,
                bankAccountId
            }));
        }
    }

    return createBankingJournalEntry({
        eventType,
        eventDate: date,
        effectiveDate: date,
        entityType: loanId ? 'BANK_LOAN' : (bankAccountId ? 'BANK_ACCOUNT' : 'BANK_RELATIONSHIP'),
        entityId: loanId || bankAccountId || bankId,
        lines,
        metadata
    });
}

/**
 * Creates an exact reversing double-entry journal entry
 */
export function createBankingReversalJournalEntry({
    originalJournalEntry,
    reversalReason = 'Correction / Cancellation',
    date = new Date().toISOString().split('T')[0]
}) {
    if (!originalJournalEntry || !Array.isArray(originalJournalEntry.lines) || originalJournalEntry.lines.length === 0) {
        throw new Error('[Banking Journal] Valid original journal entry is required for reversal.');
    }

    const reversedLines = originalJournalEntry.lines.map(l => createBankingJournalLine({
        accountType: l.accountType,
        accountId: l.accountId,
        debitPaise: l.creditPaise,   // Invert debit/credit
        creditPaise: l.debitPaise,
        currency: l.currency,
        component: l.component,
        bankId: l.bankId,
        bankAccountId: l.bankAccountId,
        loanId: l.loanId,
        description: `Reversal of ${l.id}`
    }));

    return createBankingJournalEntry({
        eventType: BANKING_JOURNAL_EVENT_TYPES.BANK_REVERSAL,
        eventDate: date,
        effectiveDate: date,
        entityType: originalJournalEntry.entityType,
        entityId: originalJournalEntry.entityId,
        lines: reversedLines,
        reversesJournalEntryId: originalJournalEntry.id,
        reversalReason,
        metadata: {
            originalEventType: originalJournalEntry.eventType,
            reversalOf: originalJournalEntry.id
        }
    });
}
