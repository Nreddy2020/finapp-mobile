import { StorageService, STORAGE_KEYS } from './storage';

export const TaxService = {
    // Get profile
    getProfile: async () => {
        const data = await StorageService.load(STORAGE_KEYS.TAX_PROFILE);
        return data || {
            income: 0,
            regime: 'New', // 'Old' or 'New'
            deductions: {
                '80C': 0, // Limit 1.5L
                '80D': 0, // Health Insurance
                'HRA': 0,
                'Standard': 50000 // Fixed
            }
        };
    },

    // Save profile
    saveProfile: async (profile) => {
        await StorageService.save(STORAGE_KEYS.TAX_PROFILE, profile);
        return profile;
    },

    // Simple Tax Calc (FY 2024-25 approx)
    calculateTax: (profile) => {
        let taxableIncome = parseFloat(profile.income);

        if (profile.regime === 'Old') {
            // Apply deductions
            const totalDeductions =
                Math.min(parseFloat(profile.deductions['80C']), 150000) +
                parseFloat(profile.deductions['80D']) +
                parseFloat(profile.deductions['HRA']) +
                50000; // Standard Deduction

            taxableIncome = Math.max(0, taxableIncome - totalDeductions);
        } else {
            // New Regime: Standard Deduction only (usually)
            taxableIncome = Math.max(0, taxableIncome - 75000); // Updated Standard Deduction for New Regime
        }

        // Simplified Slabs (Example for New Regime)
        let tax = 0;
        if (profile.regime === 'New') {
            if (taxableIncome > 300000) tax += (Math.min(taxableIncome, 600000) - 300000) * 0.05;
            if (taxableIncome > 600000) tax += (Math.min(taxableIncome, 900000) - 600000) * 0.10;
            if (taxableIncome > 900000) tax += (Math.min(taxableIncome, 1200000) - 900000) * 0.15;
            if (taxableIncome > 1200000) tax += (Math.min(taxableIncome, 1500000) - 1200000) * 0.20;
            if (taxableIncome > 1500000) tax += (taxableIncome - 1500000) * 0.30;
        } else {
            // Old Regime Slabs (Simplified)
            if (taxableIncome > 250000) tax += (Math.min(taxableIncome, 500000) - 250000) * 0.05;
            if (taxableIncome > 500000) tax += (Math.min(taxableIncome, 1000000) - 500000) * 0.20;
            if (taxableIncome > 1000000) tax += (taxableIncome - 1000000) * 0.30;
        }

        // Rebate u/s 87A
        if (profile.regime === 'New' && taxableIncome <= 700000) tax = 0;
        if (profile.regime === 'Old' && taxableIncome <= 500000) tax = 0;

        // Cess 4%
        const cess = tax * 0.04;

        return {
            taxableIncome,
            taxPayload: tax,
            cess,
            totalTax: tax + cess
        };
    }
};
