/**
 * services/commitments/commitmentCalculator.js
 * 
 * Pure mathematical financial calculations for Recurring Commitments.
 * 
 * Invariants:
 * - 100% BigInt integer arithmetic with safe half-up rounding.
 * - Zero floating-point math.
 * - Non-negative validation on all financial numerators and positive denominators.
 * - Strict separation between normalized monthly commitment and scheduled due amounts.
 */

import {
    RecurrenceFrequency,
    CommitmentStatus,
    PaymentOccurrenceStatus,
    FinancialNature,
    createMoneyPaise,
    moneyToBigInt
} from './commitmentContracts.js';

/**
 * Safe BigInt division with standard half-up rounding for non-negative integers.
 * Formula: (numerator + denominator / 2n) / denominator
 * @param {bigint} numerator 
 * @param {bigint} denominator 
 * @returns {bigint}
 */
export function bigIntDivRound(numerator, denominator) {
    if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') {
        throw new Error(`bigIntDivRound arguments must be BigInt: got ${typeof numerator}, ${typeof denominator}`);
    }
    if (denominator <= 0n) {
        throw new Error('Denominator must be positive');
    }
    if (numerator < 0n) {
        throw new Error('Numerator must be non-negative');
    }
    return (numerator + denominator / 2n) / denominator;
}

/**
 * Normalizes any recurrence frequency to its exact Monthly equivalent in Paise.
 * @param {{ paise: string }} moneyPaise 
 * @param {string} frequency 
 * @returns {{ paise: string, currency: 'INR' }}
 */
export function normalizeToMonthlyPaise(moneyPaise, frequency) {
    const amount = moneyToBigInt(moneyPaise);
    let monthly;

    switch (frequency) {
        case RecurrenceFrequency.WEEKLY:
            monthly = bigIntDivRound(amount * 52n, 12n);
            break;
        case RecurrenceFrequency.FORTNIGHTLY:
            monthly = bigIntDivRound(amount * 26n, 12n);
            break;
        case RecurrenceFrequency.MONTHLY:
            monthly = amount;
            break;
        case RecurrenceFrequency.QUARTERLY:
            monthly = bigIntDivRound(amount, 3n);
            break;
        case RecurrenceFrequency.HALF_YEARLY:
            monthly = bigIntDivRound(amount, 6n);
            break;
        case RecurrenceFrequency.YEARLY:
            monthly = bigIntDivRound(amount, 12n);
            break;
        case RecurrenceFrequency.CUSTOM:
            monthly = amount;
            break;
        default:
            throw new Error(`Unsupported recurrence frequency: ${frequency}`);
    }

    return createMoneyPaise(monthly, moneyPaise.currency);
}

/**
 * Normalizes any recurrence frequency to its exact Yearly equivalent in Paise.
 * @param {{ paise: string }} moneyPaise 
 * @param {string} frequency 
 * @returns {{ paise: string, currency: 'INR' }}
 */
export function normalizeToYearlyPaise(moneyPaise, frequency) {
    const amount = moneyToBigInt(moneyPaise);
    let yearly;

    switch (frequency) {
        case RecurrenceFrequency.WEEKLY:
            yearly = amount * 52n;
            break;
        case RecurrenceFrequency.FORTNIGHTLY:
            yearly = amount * 26n;
            break;
        case RecurrenceFrequency.MONTHLY:
            yearly = amount * 12n;
            break;
        case RecurrenceFrequency.QUARTERLY:
            yearly = amount * 4n;
            break;
        case RecurrenceFrequency.HALF_YEARLY:
            yearly = amount * 2n;
            break;
        case RecurrenceFrequency.YEARLY:
            yearly = amount;
            break;
        case RecurrenceFrequency.CUSTOM:
            yearly = amount * 12n;
            break;
        default:
            throw new Error(`Unsupported recurrence frequency: ${frequency}`);
    }

    return createMoneyPaise(yearly, moneyPaise.currency);
}

/**
 * Computes dashboard commitment metrics.
 * Invariant: Monthly committed is the normalized baseline of active commitments,
 * while dueInPeriod is the sum of scheduled occurrences in the selected window.
 * 
 * @param {Array<object>} commitments 
 * @param {Array<object>} occurrences 
 * @param {string} asOfDate YYYY-MM-DD
 * @param {object} periodFilter { startDate, endDate } optional date window
 * @returns {object} Calculated metrics
 */
export function computeCommitmentMetrics(commitments = [], occurrences = [], asOfDate = new Date().toISOString().split('T')[0], periodFilter = null) {
    // 1. Filter active commitments
    const activeCommitments = commitments.filter(c => c.status === CommitmentStatus.ACTIVE);

    // 2. Compute normalized baseline
    let monthlyCommittedSum = 0n;
    let yearlyCommittedSum = 0n;

    // Breakdown by financial nature
    let expenseMonthlySum = 0n;
    let debtMonthlySum = 0n;
    let investmentMonthlySum = 0n;

    for (const c of activeCommitments) {
        const monthly = moneyToBigInt(normalizeToMonthlyPaise(c.amount, c.frequency));
        const yearly = moneyToBigInt(normalizeToYearlyPaise(c.amount, c.frequency));
        
        monthlyCommittedSum += monthly;
        yearlyCommittedSum += yearly;

        if (c.financialNature === FinancialNature.DEBT) {
            debtMonthlySum += monthly;
        } else if (c.financialNature === FinancialNature.INVESTMENT) {
            investmentMonthlySum += monthly;
        } else {
            expenseMonthlySum += monthly;
        }
    }

    // 3. Compute occurrences metrics (Due in period, Overdue, Next Due)
    const asOfMonth = asOfDate.substring(0, 7); // YYYY-MM
    const startWindow = periodFilter?.startDate || `${asOfMonth}-01`;
    const endWindow = periodFilter?.endDate || `${asOfMonth}-31`;

    let dueInPeriodSum = 0n;
    let overdueSum = 0n;
    let paidInPeriodSum = 0n;

    let nearestUpcomingOccurrence = null;
    let nearestDaysRemaining = Infinity;

    for (const occ of occurrences) {
        // Skip cancelled occurrences
        if (occ.status === PaymentOccurrenceStatus.CANCELLED) continue;

        const scheduled = occ.scheduledDate;
        const occAmount = occ.actualAmount ? moneyToBigInt(occ.actualAmount) : moneyToBigInt(occ.expectedAmount);

        // Overdue check: unpaid and scheduled before asOfDate
        if (scheduled < asOfDate && occ.status !== PaymentOccurrenceStatus.PAID && occ.status !== PaymentOccurrenceStatus.SKIPPED) {
            overdueSum += occAmount;
        }

        // Period window check
        if (scheduled >= startWindow && scheduled <= endWindow) {
            if (occ.status === PaymentOccurrenceStatus.PAID) {
                paidInPeriodSum += occAmount;
            } else if (occ.status !== PaymentOccurrenceStatus.SKIPPED) {
                dueInPeriodSum += occAmount;
            }
        }

        // Nearest upcoming check
        if (scheduled >= asOfDate && occ.status === PaymentOccurrenceStatus.UPCOMING) {
            const diffDays = Math.ceil((new Date(scheduled).getTime() - new Date(asOfDate).getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays >= 0 && diffDays < nearestDaysRemaining) {
                nearestDaysRemaining = diffDays;
                nearestUpcomingOccurrence = {
                    ...occ,
                    daysRemaining: diffDays
                };
            }
        }
    }

    return {
        activeCount: activeCommitments.length,
        totalCount: commitments.length,
        monthlyCommitted: createMoneyPaise(monthlyCommittedSum),
        yearlyCommitted: createMoneyPaise(yearlyCommittedSum),
        dueInPeriod: createMoneyPaise(dueInPeriodSum),
        overdue: createMoneyPaise(overdueSum),
        paidInPeriod: createMoneyPaise(paidInPeriodSum),
        breakdownByNature: {
            expense: createMoneyPaise(expenseMonthlySum),
            debt: createMoneyPaise(debtMonthlySum),
            investment: createMoneyPaise(investmentMonthlySum)
        },
        nextDue: nearestUpcomingOccurrence ? {
            occurrenceId: nearestUpcomingOccurrence.id,
            commitmentId: nearestUpcomingOccurrence.commitmentId,
            name: nearestUpcomingOccurrence.commitmentName || 'Upcoming Bill',
            scheduledDate: nearestUpcomingOccurrence.scheduledDate,
            amount: nearestUpcomingOccurrence.expectedAmount,
            daysRemaining: nearestDaysRemaining
        } : null
    };
}
