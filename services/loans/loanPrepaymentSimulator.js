/**
 * services/loans/loanPrepaymentSimulator.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Prepayment & Foreclosure Simulator.
 * Strictly read-only simulation.
 * 
 * Rules:
 * 1. Prepayment applied after the current period's EMI.
 * 2. Prepayment amount directly reduces outstanding principal.
 * 3. Side-by-side comparison: Status Quo vs Tenure Reduction vs EMI Reduction.
 * 4. Net Benefit Formula:
 *    netBenefitPaise = baselineTotalCostPaise - revisedTotalCostPaise - prepaymentFeesPaise - otherSimulationCostsPaise
 * 5. Simulation does not mutate the live facility.
 */

import { generateAmortizationSchedule } from './loanAmortization.js';
import { calculateMonthlyEmiPaise } from './loanEngine.js';

/**
 * Simulate prepayment scenarios for an existing loan facility
 * 
 * @param {Object} facility - Live loan facility record (cloned, never mutated)
 * @param {Object} simulationParams
 * @param {bigint|string|number} simulationParams.prepaymentPaise - Lump sum prepayment amount
 * @param {number} [simulationParams.prepaymentAfterPeriod=0] - Period after which prepayment occurs
 * @param {bigint|string|number} [simulationParams.prepaymentFeesPaise=0n] - Estimated lender fees
 * @param {string} [simulationParams.feeBasis='PERCENT_OF_PREPAYMENT'] - Informational fee basis
 * @param {Object} [simulationParams.userAssumptions={}] - User assumptions documented
 * @returns {Object} Three comparative scenarios + net financial benefit
 */
export function simulatePrepayment(facility, simulationParams) {
    if (!facility || !facility.principalPaise) {
        throw new Error(`INVALID_FACILITY: Facility object must specify principalPaise and terms`);
    }

    const prepaymentPaise = BigInt(simulationParams.prepaymentPaise || 0);
    const afterPeriod = Number(simulationParams.prepaymentAfterPeriod || 0);
    const feesPaise = BigInt(simulationParams.prepaymentFeesPaise || 0);
    const annualRate = Number(facility.annualRatePercent);
    const totalTenure = Number(facility.tenureMonths);

    if (prepaymentPaise < 0n) {
        throw new Error(`NEGATIVE_PREPAYMENT_REJECTED: Prepayment amount cannot be negative`);
    }

    // 1. Generate Baseline Schedule (Status Quo)
    const baseline = generateAmortizationSchedule({
        principalPaise: facility.principalPaise,
        annualRatePercent: annualRate,
        tenureMonths: totalTenure,
        startDate: facility.startDate
    });

    // Find outstanding principal at afterPeriod
    let currentOutstandingPrincipal = BigInt(facility.principalPaise);
    let startDateForContinuation = facility.startDate;

    if (afterPeriod > 0) {
        if (afterPeriod >= baseline.schedule.length) {
            throw new Error(`INVALID_PERIOD: afterPeriod ${afterPeriod} exceeds total schedule length`);
        }
        const targetPeriodRecord = baseline.schedule[afterPeriod - 1];
        currentOutstandingPrincipal = targetPeriodRecord.closingPrincipalPaise;
        startDateForContinuation = targetPeriodRecord.dueDate;
    }

    if (prepaymentPaise > currentOutstandingPrincipal) {
        throw new Error(`PREPAYMENT_EXCEEDS_OUTSTANDING: Prepayment ${prepaymentPaise} paise exceeds outstanding principal ${currentOutstandingPrincipal} paise`);
    }

    // Check for full foreclosure
    const isFullForeclosure = prepaymentPaise === currentOutstandingPrincipal;
    const remainingTenure = totalTenure - afterPeriod;

    // Remaining principal after lump sum prepayment
    const postPrepaymentPrincipal = currentOutstandingPrincipal - prepaymentPaise;

    // SCENARIO 1: STATUS QUO (Remaining baseline cost from afterPeriod onward)
    let baselineRemainingCost = 0n;
    let baselineRemainingInterest = 0n;
    for (let i = afterPeriod; i < baseline.schedule.length; i++) {
        baselineRemainingCost += baseline.schedule[i].installmentPaise;
        baselineRemainingInterest += baseline.schedule[i].interestComponentPaise;
    }

    // SCENARIO 2: TENURE REDUCTION (EMI remains unchanged, tenure contracts)
    let tenureReductionResult;
    if (isFullForeclosure || postPrepaymentPrincipal === 0n) {
        tenureReductionResult = {
            strategy: 'TENURE_REDUCTION_FORECLOSURE',
            revisedTenureMonths: 0,
            monthsSaved: remainingTenure,
            revisedEmiPaise: 0n,
            totalRemainingInstallmentsPaise: 0n,
            totalRemainingInterestPaise: 0n,
            prepaymentAmountPaise: prepaymentPaise,
            prepaymentFeesPaise: feesPaise,
            netCostReductionPaise: baselineRemainingCost - (prepaymentPaise + feesPaise),
            revisedMaturityDate: startDateForContinuation,
            schedule: []
        };
    } else {
        // Run with same EMI on reduced principal
        const standardEmi = baseline.summary.monthlyEmiPaise;
        const reducedSchedule = generateAmortizationSchedule({
            principalPaise: postPrepaymentPrincipal,
            annualRatePercent: annualRate,
            tenureMonths: remainingTenure,
            startDate: startDateForContinuation,
            customEmiPaise: standardEmi
        });

        const revisedCost = reducedSchedule.summary.totalInstallmentsPaise + prepaymentPaise + feesPaise;
        const interestSaved = baselineRemainingInterest - reducedSchedule.summary.totalInterestPaidPaise;
        const netBenefit = baselineRemainingCost - revisedCost;
        const monthsSaved = remainingTenure - reducedSchedule.schedule.length;

        tenureReductionResult = {
            strategy: 'TENURE_REDUCTION',
            revisedTenureMonths: reducedSchedule.schedule.length,
            monthsSaved: monthsSaved > 0 ? monthsSaved : 0,
            revisedEmiPaise: standardEmi,
            totalRemainingInstallmentsPaise: reducedSchedule.summary.totalInstallmentsPaise,
            totalRemainingInterestPaise: reducedSchedule.summary.totalInterestPaidPaise,
            prepaymentAmountPaise: prepaymentPaise,
            prepaymentFeesPaise: feesPaise,
            grossInterestSavedPaise: interestSaved > 0n ? interestSaved : 0n,
            netCostReductionPaise: netBenefit,
            revisedMaturityDate: reducedSchedule.summary.maturityDate,
            scheduleSummary: reducedSchedule.summary
        };
    }

    // SCENARIO 3: EMI REDUCTION (Tenure preserved, monthly EMI recalculated)
    let emiReductionResult;
    if (isFullForeclosure || postPrepaymentPrincipal === 0n) {
        emiReductionResult = { ...tenureReductionResult, strategy: 'EMI_REDUCTION_FORECLOSURE' };
    } else {
        const revisedEmi = calculateMonthlyEmiPaise(postPrepaymentPrincipal, annualRate, remainingTenure);
        const reducedSchedule = generateAmortizationSchedule({
            principalPaise: postPrepaymentPrincipal,
            annualRatePercent: annualRate,
            tenureMonths: remainingTenure,
            startDate: startDateForContinuation,
            customEmiPaise: revisedEmi
        });

        const revisedCost = reducedSchedule.summary.totalInstallmentsPaise + prepaymentPaise + feesPaise;
        const interestSaved = baselineRemainingInterest - reducedSchedule.summary.totalInterestPaidPaise;
        const monthlyEmiRelief = baseline.summary.monthlyEmiPaise - revisedEmi;
        const netBenefit = baselineRemainingCost - revisedCost;

        emiReductionResult = {
            strategy: 'EMI_REDUCTION',
            revisedTenureMonths: remainingTenure,
            monthsSaved: 0,
            revisedEmiPaise: revisedEmi,
            monthlyEmiReliefPaise: monthlyEmiRelief > 0n ? monthlyEmiRelief : 0n,
            totalRemainingInstallmentsPaise: reducedSchedule.summary.totalInstallmentsPaise,
            totalRemainingInterestPaise: reducedSchedule.summary.totalInterestPaidPaise,
            prepaymentAmountPaise: prepaymentPaise,
            prepaymentFeesPaise: feesPaise,
            grossInterestSavedPaise: interestSaved > 0n ? interestSaved : 0n,
            netCostReductionPaise: netBenefit,
            revisedMaturityDate: reducedSchedule.summary.maturityDate,
            scheduleSummary: reducedSchedule.summary
        };
    }

    return {
        simulationDoesNotMutateLiveFacility: true,
        simulationTimestamp: new Date().toISOString(),
        loanId: facility.id || 'SIMULATED_LOAN',
        afterPeriod,
        currentOutstandingPrincipalPaise: currentOutstandingPrincipal,
        prepaymentAmountPaise: prepaymentPaise,
        estimatedFeesPaise: feesPaise,
        userEnteredAssumptions: simulationParams.userAssumptions || {},
        statusQuo: {
            strategy: 'STATUS_QUO',
            remainingTenureMonths: remainingTenure,
            monthlyEmiPaise: baseline.summary.monthlyEmiPaise,
            totalRemainingCostPaise: baselineRemainingCost,
            totalRemainingInterestPaise: baselineRemainingInterest,
            maturityDate: baseline.summary.maturityDate
        },
        tenureReduction: tenureReductionResult,
        emiReduction: emiReductionResult
    };
}
