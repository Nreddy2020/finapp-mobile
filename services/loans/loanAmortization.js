/**
 * services/loans/loanAmortization.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Amortization Schedule Generator.
 * Generates period-by-period schedules with strict mathematical invariants:
 * 1. openingPrincipal = principalComponent + closingPrincipal
 * 2. closingPrincipal >= 0
 * 3. principalComponent >= 0
 * 4. interest >= 0
 * 5. installment >= interest
 * 6. Final-period residual absorption: closingPrincipal_n = 0n
 * 7. Zero-interest deterministic remainder added to final installment
 */

import { LOAN_CONSTANTS } from './loanContracts.js';
import { deriveMonthlyScaledRate, calculateMonthlyEmiPaise } from './loanEngine.js';

const SCALE = LOAN_CONSTANTS.RATE_SCALE;

/**
 * Increment a date by exactly N months preserving day of month or clamping to month-end
 */
export function addMonthsToDate(startDateStr, monthsToAdd) {
    const d = new Date(startDateStr);
    if (isNaN(d.getTime())) {
        throw new Error(`INVALID_START_DATE: Unable to parse date ${startDateStr}`);
    }
    const targetDay = d.getDate();
    d.setMonth(d.getMonth() + monthsToAdd);
    
    // Check if month skipped due to shorter month (e.g. Feb 30 -> Mar 2)
    if (d.getDate() !== targetDay) {
        // Set to last day of previous month
        d.setDate(0);
    }
    return d.toISOString().split('T')[0];
}

/**
 * Generate full period-by-period amortization schedule
 * 
 * @param {Object} params
 * @param {bigint|string|number} params.principalPaise - Total principal
 * @param {number} params.annualRatePercent - Nominal rate percent (e.g. 8.75)
 * @param {number} params.tenureMonths - Total tenure in months
 * @param {string} [params.startDate] - ISO date string (YYYY-MM-DD), defaults to today
 * @param {bigint|string|number} [params.customEmiPaise] - Optional overridden EMI
 * @returns {Object} { schedule: Array, summary: Object }
 */
export function generateAmortizationSchedule(params) {
    const P = BigInt(params.principalPaise);
    const rate = Number(params.annualRatePercent);
    const n = Number(params.tenureMonths);
    const startDate = params.startDate ? new Date(params.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    if (P < LOAN_CONSTANTS.MIN_PRINCIPAL_PAISE || P > LOAN_CONSTANTS.MAX_PRINCIPAL_PAISE) {
        throw new Error(`PRINCIPAL_OUT_OF_BOUNDS: ${P} paise is outside allowed range`);
    }
    if (n < LOAN_CONSTANTS.MIN_TENURE_MONTHS || n > LOAN_CONSTANTS.MAX_TENURE_MONTHS) {
        throw new Error(`TENURE_OUT_OF_BOUNDS: ${n} months is outside allowed range`);
    }

    const rScaled = deriveMonthlyScaledRate(rate);
    const standardEmiPaise = params.customEmiPaise 
        ? BigInt(params.customEmiPaise) 
        : calculateMonthlyEmiPaise(P, rate, n);

    const schedule = [];
    let currentOpeningPrincipal = P;
    let totalInterestPaid = 0n;
    let totalPrincipalPaid = 0n;

    // Handle Zero-Interest Loans deterministically
    if (rScaled === 0n) {
        if (params.customEmiPaise) {
            const emi = BigInt(params.customEmiPaise);
            let period = 1;
            while (currentOpeningPrincipal > 0n && period <= n) {
                const dueDate = addMonthsToDate(startDate, period);
                const principalComponent = emi >= currentOpeningPrincipal ? currentOpeningPrincipal : emi;
                const installment = principalComponent;
                const closingPrincipal = currentOpeningPrincipal - principalComponent;

                schedule.push({
                    periodNumber: period,
                    dueDate,
                    openingPrincipalPaise: currentOpeningPrincipal,
                    installmentPaise: installment,
                    principalComponentPaise: principalComponent,
                    interestComponentPaise: 0n,
                    feesPaise: 0n,
                    closingPrincipalPaise: closingPrincipal,
                    status: 'SCHEDULED'
                });

                totalPrincipalPaid += principalComponent;
                currentOpeningPrincipal = closingPrincipal;
                if (closingPrincipal === 0n) break;
                period++;
            }
        } else {
            const baseInstallment = P / BigInt(n);
            const remainder = P % BigInt(n);

            for (let period = 1; period <= n; period++) {
                const isLastPeriod = period === n;
                const dueDate = addMonthsToDate(startDate, period);
                const principalComponent = isLastPeriod ? (baseInstallment + remainder) : baseInstallment;
                const installment = principalComponent; // 0 interest
                const closingPrincipal = isLastPeriod ? 0n : (currentOpeningPrincipal - principalComponent);

                schedule.push({
                    periodNumber: period,
                    dueDate,
                    openingPrincipalPaise: currentOpeningPrincipal,
                    installmentPaise: installment,
                    principalComponentPaise: principalComponent,
                    interestComponentPaise: 0n,
                    feesPaise: 0n,
                    closingPrincipalPaise: closingPrincipal,
                    status: 'SCHEDULED'
                });

                totalPrincipalPaid += principalComponent;
                currentOpeningPrincipal = closingPrincipal;
            }
        }

        return {
            schedule,
            summary: {
                originalPrincipalPaise: P,
                totalInstallmentsPaise: P,
                totalPrincipalPaidPaise: totalPrincipalPaid,
                totalInterestPaidPaise: 0n,
                monthlyEmiPaise: schedule[0].installmentPaise,
                finalInstallmentPaise: schedule[schedule.length - 1].installmentPaise,
                tenureMonths: schedule.length,
                startDate,
                maturityDate: schedule[schedule.length - 1].dueDate,
                effectiveAnnualRatePercent: 0.0
            }
        };
    }

    // Standard reducing-balance schedule with final-period residual absorption
    for (let period = 1; period <= n; period++) {
        const isLastPeriod = period === n;
        const dueDate = addMonthsToDate(startDate, period);

        // Interest for period = openingPrincipal * rScaled / SCALE
        const interestComponent = (currentOpeningPrincipal * rScaled + SCALE / 2n) / SCALE;
        let principalComponent;
        let installment;
        let closingPrincipal;

        if (isLastPeriod) {
            // Strict final-period absorption
            principalComponent = currentOpeningPrincipal;
            installment = principalComponent + interestComponent;
            closingPrincipal = 0n;
        } else {
            principalComponent = standardEmiPaise - interestComponent;
            
            // Safety: if regular EMI cannot even cover interest (negative amortization guard)
            if (principalComponent <= 0n) {
                throw new Error(`NEGATIVE_AMORTIZATION_ERROR: Installment ${standardEmiPaise} is less than interest ${interestComponent} at period ${period}`);
            }

            // If principal component exceeds remaining principal
            if (principalComponent >= currentOpeningPrincipal) {
                principalComponent = currentOpeningPrincipal;
                installment = principalComponent + interestComponent;
                closingPrincipal = 0n;
            } else {
                installment = standardEmiPaise;
                closingPrincipal = currentOpeningPrincipal - principalComponent;
            }
        }

        // Validate period invariants
        if (currentOpeningPrincipal !== (principalComponent + closingPrincipal)) {
            throw new Error(`INVARIANT_VIOLATION: Period ${period} opening != principal + closing`);
        }
        if (closingPrincipal < 0n || principalComponent < 0n || interestComponent < 0n) {
            throw new Error(`INVARIANT_VIOLATION: Period ${period} produced negative balance components`);
        }

        schedule.push({
            periodNumber: period,
            dueDate,
            openingPrincipalPaise: currentOpeningPrincipal,
            installmentPaise: installment,
            principalComponentPaise: principalComponent,
            interestComponentPaise: interestComponent,
            feesPaise: 0n,
            closingPrincipalPaise: closingPrincipal,
            status: 'SCHEDULED'
        });

        totalInterestPaid += interestComponent;
        totalPrincipalPaid += principalComponent;
        currentOpeningPrincipal = closingPrincipal;

        // If closed prematurely
        if (closingPrincipal === 0n && !isLastPeriod) {
            break;
        }
    }

    return {
        schedule,
        summary: {
            originalPrincipalPaise: P,
            totalInstallmentsPaise: totalPrincipalPaid + totalInterestPaid,
            totalPrincipalPaidPaise: totalPrincipalPaid,
            totalInterestPaidPaise: totalInterestPaid,
            monthlyEmiPaise: standardEmiPaise,
            finalInstallmentPaise: schedule[schedule.length - 1].installmentPaise,
            tenureMonths: schedule.length,
            startDate,
            maturityDate: schedule[schedule.length - 1].dueDate,
            effectiveAnnualRatePercent: rate
        }
    };
}
