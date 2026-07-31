import { StorageService, STORAGE_KEYS } from './storage';

export const PlanningService = {
    // --- DEBT ---
    getDebts: async () => {
        return await StorageService.load(STORAGE_KEYS.PLANNING_DEBT) || [];
    },

    saveDebts: async (debts) => {
        await StorageService.save(STORAGE_KEYS.PLANNING_DEBT, debts);
        return debts;
    },

    calculatePayoff: (debts, monthlyPayment, strategy = 'AVALANCHE') => {
        // Simple simulation logic
        let tempDebts = debts.map(d => ({ ...d }));
        let months = 0;
        let totalInterest = 0;
        let log = [];

        // Sorting
        if (strategy === 'AVALANCHE') {
            tempDebts.sort((a, b) => b.rate - a.rate); // Highest rate first
        } else {
            tempDebts.sort((a, b) => a.amount - b.amount); // Smallest balance first (Snowball)
        }

        // Loop until paid (capped at 30 years to prevent infinite loops)
        while (tempDebts.some(d => d.amount > 0) && months < 360) {
            months++;
            let available = parseFloat(monthlyPayment);

            // 1. Min payments
            tempDebts.forEach(d => {
                if (d.amount > 0) {
                    const interest = (d.amount * (d.rate / 100)) / 12;
                    totalInterest += interest;
                    d.amount += interest; // Add interest

                    const pay = Math.min(d.amount, Math.max(d.minPayment || 0, interest));
                    d.amount -= pay;
                    available -= pay;
                }
            });

            // 2. Extra payment to priority debt
            if (available > 0) {
                for (let d of tempDebts) {
                    if (d.amount > 0) {
                        const pay = Math.min(d.amount, available);
                        d.amount -= pay;
                        available -= pay;
                        if (available <= 0) break;
                    }
                }
            }
        }

        return { months, totalInterest, strategy };
    },

    // --- EMERGENCY FUND ---
    getEmergencyFund: async () => {
        const data = await StorageService.load(STORAGE_KEYS.PLANNING_EMERGENCY);
        return data || {
            monthlyExpenses: 0,
            monthsRequired: 6,
            currentFund: 0
        };
    },

    saveEmergencyFund: async (data) => {
        await StorageService.save(STORAGE_KEYS.PLANNING_EMERGENCY, data);
        return data;
    }
};
