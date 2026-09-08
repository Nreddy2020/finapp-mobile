/**
 * services/loans/loanViewModel.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — View Model & Controller.
 * Pure aggregation and view binding. Does NOT duplicate calculation logic;
 * consumes canonical engine functions.
 */

import { LoanRepository } from './loanRepository.js';
import { LOAN_STATUS, toRupeesFormatted } from './loanContracts.js';
import { generateAmortizationSchedule } from './loanAmortization.js';
import { simulatePrepayment } from './loanPrepaymentSimulator.js';
import { rankAvalanche, rankSnowball, rankCashFlowOptimizer } from './loanPayoffStrategies.js';

export const LoanViewModel = {
    /**
     * Get unified dashboard overview data for active facilities
     */
    async getDashboardOverview() {
        const facilities = await LoanRepository.getAllFacilities();
        const active = facilities.filter(f => f.status === LOAN_STATUS.ACTIVE);

        let totalOutstandingPaise = 0n;
        let totalMonthlyEmiPaise = 0n;
        let weightedRateSum = 0;

        for (const f of active) {
            const p = BigInt(f.outstandingPrincipalPaise || f.principalPaise || 0);
            const emi = BigInt(f.monthlyEmiPaise || 0);
            const rate = Number(f.annualRatePercent || 0);

            totalOutstandingPaise += p;
            totalMonthlyEmiPaise += emi;
            weightedRateSum += Number(p) * rate;
        }

        const blendedRate = totalOutstandingPaise > 0n 
            ? Math.round((weightedRateSum / Number(totalOutstandingPaise)) * 100) / 100 
            : 0.0;

        // Payoff rankings
        const avalancheRanking = rankAvalanche(active);
        const snowballRanking = rankSnowball(active);
        const optimizerRanking = rankCashFlowOptimizer(active);

        return {
            summary: {
                totalOutstandingPaise,
                totalOutstandingFormatted: toRupeesFormatted(totalOutstandingPaise),
                totalMonthlyEmiPaise,
                totalMonthlyEmiFormatted: toRupeesFormatted(totalMonthlyEmiPaise),
                blendedAnnualRatePercent: blendedRate,
                activeCount: active.length,
                totalFacilitiesCount: facilities.length
            },
            facilities: facilities.map(f => ({
                ...f,
                principalFormatted: toRupeesFormatted(f.principalPaise),
                outstandingFormatted: toRupeesFormatted(f.outstandingPrincipalPaise || f.principalPaise),
                monthlyEmiFormatted: toRupeesFormatted(f.monthlyEmiPaise || 0),
                valueProvenance: {
                    principal: 'LENDER_PROVIDED',
                    annualRate: 'LENDER_PROVIDED',
                    monthlyEmi: 'CALCULATED_REDUCING_BALANCE',
                    outstandingPrincipal: 'LEDGER_TRACKED'
                }
            })),
            payoffStrategies: {
                avalanche: avalancheRanking,
                snowball: snowballRanking,
                cashFlowOptimizer: optimizerRanking
            }
        };
    },

    /**
     * Get amortization schedule for a specific facility
     */
    async getFacilitySchedule(facilityId) {
        const facility = await LoanRepository.getFacilityById(facilityId);
        if (!facility) throw new Error(`Facility ${facilityId} not found`);

        const scheduleData = generateAmortizationSchedule({
            principalPaise: facility.principalPaise,
            annualRatePercent: facility.annualRatePercent,
            tenureMonths: facility.tenureMonths,
            startDate: facility.startDate,
            customEmiPaise: facility.monthlyEmiPaise
        });

        return {
            facility,
            ...scheduleData,
            valueProvenance: {
                schedule: 'CANONICAL_AMORTIZATION_ENGINE',
                roundingPolicy: 'FINAL_PERIOD_RESIDUAL_ABSORPTION'
            }
        };
    },

    /**
     * Run read-only prepayment comparison simulation
     */
    async runPrepaymentSimulation(facilityId, simulationParams) {
        const facility = await LoanRepository.getFacilityById(facilityId);
        if (!facility) throw new Error(`Facility ${facilityId} not found`);

        return simulatePrepayment(facility, simulationParams);
    },

    /**
     * Seed representative bank loan portfolios for demo & testing
     */
    async seedRepresentativePortfolios() {
        const facilities = [
            {
                id: 'LOAN_SBI_HOME_01',
                name: 'SBI Privilege Home Loan',
                lender: 'State Bank of India',
                loanType: 'HOME',
                rateType: 'FIXED',
                status: LOAN_STATUS.ACTIVE,
                principalPaise: 450000000n, // ₹45,00,000 (45 Lakhs)
                outstandingPrincipalPaise: 385000000n, // ₹38.5 Lakhs
                annualRatePercent: 8.5,
                tenureMonths: 240,
                tenureRemainingMonths: 192,
                emiDueDayOfMonth: 10,
                startDate: '2024-05-10',
                estimatedForeclosureFeesPaise: 0n
            },
            {
                id: 'LOAN_HDFC_AUTO_02',
                name: 'HDFC Car Loan (EV)',
                lender: 'HDFC Bank',
                loanType: 'AUTO',
                rateType: 'FIXED',
                status: LOAN_STATUS.ACTIVE,
                principalPaise: 120000000n, // ₹12,00,000 (12 Lakhs)
                outstandingPrincipalPaise: 75000000n, // ₹7.5 Lakhs
                annualRatePercent: 8.95,
                tenureMonths: 60,
                tenureRemainingMonths: 36,
                emiDueDayOfMonth: 5,
                startDate: '2025-02-05',
                estimatedForeclosureFeesPaise: 1500000n
            },
            {
                id: 'LOAN_AXIS_PERS_03',
                name: 'Axis 24x7 Personal Loan',
                lender: 'Axis Bank',
                loanType: 'PERSONAL',
                rateType: 'FIXED',
                status: LOAN_STATUS.ACTIVE,
                principalPaise: 30000000n, // ₹3,00,000 (3 Lakhs)
                outstandingPrincipalPaise: 18000000n, // ₹1.8 Lakhs
                annualRatePercent: 13.5,
                tenureMonths: 36,
                tenureRemainingMonths: 20,
                emiDueDayOfMonth: 1,
                startDate: '2025-06-01',
                estimatedForeclosureFeesPaise: 500000n
            }
        ];
        for (const f of facilities) {
            await LoanRepository.saveFacility(f);
        }
    }
};
