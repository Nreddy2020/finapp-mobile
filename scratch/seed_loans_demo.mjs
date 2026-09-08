/**
 * scratch/seed_loans_demo.mjs
 * 
 * Seed representative multi-facility bank loan records for live emulator demonstration.
 */

import { LoanRepository } from '../services/loans/loanRepository.js';
import { LOAN_TYPES, RATE_TYPES, LOAN_STATUS } from '../services/loans/loanContracts.js';

async function seed() {
    await LoanRepository.clearAll();

    // 1. SBI Home Loan
    await LoanRepository.saveFacility({
        id: 'LOAN_SBI_HOME_01',
        name: 'SBI Privilege Home Loan',
        lender: 'State Bank of India',
        loanType: LOAN_TYPES.HOME,
        rateType: RATE_TYPES.FIXED,
        status: LOAN_STATUS.ACTIVE,
        principalPaise: 450000000n, // ₹45,00,000 (45 Lakhs)
        outstandingPrincipalPaise: 385000000n, // ₹38.5 Lakhs
        annualRatePercent: 8.5,
        tenureMonths: 240, // 20 years
        tenureRemainingMonths: 192,
        emiDueDayOfMonth: 10,
        startDate: '2024-05-10',
        estimatedForeclosureFeesPaise: 0n // Zero for floating/home
    });

    // 2. HDFC Car Loan
    await LoanRepository.saveFacility({
        id: 'LOAN_HDFC_AUTO_02',
        name: 'HDFC Car Loan (EV)',
        lender: 'HDFC Bank',
        loanType: LOAN_TYPES.AUTO,
        rateType: RATE_TYPES.FIXED,
        status: LOAN_STATUS.ACTIVE,
        principalPaise: 120000000n, // ₹12,00,000 (12 Lakhs)
        outstandingPrincipalPaise: 75000000n, // ₹7.5 Lakhs
        annualRatePercent: 8.95,
        tenureMonths: 60, // 5 years
        tenureRemainingMonths: 36,
        emiDueDayOfMonth: 5,
        startDate: '2025-02-05',
        estimatedForeclosureFeesPaise: 1500000n // 2% fee
    });

    // 3. Axis Bank Personal Loan
    await LoanRepository.saveFacility({
        id: 'LOAN_AXIS_PERS_03',
        name: 'Axis 24x7 Personal Loan',
        lender: 'Axis Bank',
        loanType: LOAN_TYPES.PERSONAL,
        rateType: RATE_TYPES.FIXED,
        status: LOAN_STATUS.ACTIVE,
        principalPaise: 30000000n, // ₹3,00,000 (3 Lakhs)
        outstandingPrincipalPaise: 18000000n, // ₹1.8 Lakhs
        annualRatePercent: 13.5, // High rate
        tenureMonths: 36, // 3 years
        tenureRemainingMonths: 18,
        emiDueDayOfMonth: 15,
        startDate: '2025-08-15',
        estimatedForeclosureFeesPaise: 600000n
    });

    console.log('✅ Seeded 3 representative bank loan facilities into FINLIFE_LOANS_STORE_V1');
}

seed();
