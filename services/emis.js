import { saveData, loadData, STORAGE_KEYS } from './storage';

export const EMIService = {
    /**
     * Get all EMIs
     * @returns {Promise<Array>}
     */
    getEMIs: async () => {
        return await loadData(STORAGE_KEYS.EMIS, []) || [];
    },

    /**
     * Add a new EMI/Loan record
     * This logic mimics the complex calculation from the original component
     * @param {Object} loanDetails 
     * @returns {Promise<Array>} Updated EMIs list
     */
    addEMI: async (loanDetails) => {
        const { amount, rate, tenure, fee, feeType, name, type, loan_date, emi_start_date } = loanDetails;

        const principal = parseFloat(amount);
        const r = parseFloat(rate); // Annual Rate
        const n = parseInt(tenure); // Months

        let processingFee = 0;
        if (fee) {
            const feeValue = parseFloat(fee);
            processingFee = feeType === 'PERCENTAGE' ? (principal * feeValue) / 100 : feeValue;
        }

        const monthlyRate = (r / 12) / 100;
        const numerator = principal * monthlyRate * Math.pow(1 + monthlyRate, n);
        const denominator = Math.pow(1 + monthlyRate, n) - 1;
        const emiAmount = denominator === 0 ? 0 : numerator / denominator;

        const emis = await EMIService.getEMIs();
        const newEMI = {
            id: Date.now().toString(),
            name: name || `New ${type === 'BANK' ? 'Bank' : 'Private'} Loan`,
            type: type || 'BANK',
            principal: principal,
            amount: emiAmount, // Monthly EMI Amount
            outstanding: principal,
            interest_rate: r,
            remaining_months: n,
            tenure: n,
            processing_fee: processingFee,
            due_date: new Date().getDate(),
            status: 'pending',
            loan_date: loan_date || new Date().toISOString(),
            emi_start_date: emi_start_date,
            transactions: []
        };

        const updatedEMIs = [...emis, newEMI];
        await saveData(STORAGE_KEYS.EMIS, updatedEMIs);
        return updatedEMIs;
    },

    /**
     * Record an EMI payment
     * @param {string} id 
     * @returns {Promise<Array>} Updated EMIs list
     */
    payEMI: async (id) => {
        const emis = await EMIService.getEMIs();
        const updatedEMIs = emis.map(e => {
            if (e.id === id) {
                // Calculate interest vs principal for this installment
                const monthlyRate = (e.interest_rate / 12) / 100;
                const interest = e.outstanding * monthlyRate;
                const principalRepayment = e.amount - interest;

                const newOutstanding = Math.max(0, e.outstanding - principalRepayment);
                const newRemaining = Math.max(0, e.remaining_months - 1);

                return {
                    ...e,
                    status: 'paid', // Mark as paid for current cycle
                    outstanding: newOutstanding,
                    remaining_months: newRemaining,
                    transactions: [
                        {
                            id: Date.now(),
                            date: new Date().toISOString(),
                            amount: e.amount,
                            status: 'paid',
                            month: new Date().toLocaleString('default', { month: 'short' })
                        },
                        ...(e.transactions || [])
                    ]
                };
            }
            return e;
        });

        await saveData(STORAGE_KEYS.EMIS, updatedEMIs);
        return updatedEMIs;
    },

    /**
     * Delete an EMI record
     * @param {string} id 
     * @returns {Promise<Array>} Updated EMIs list
     */
    deleteEMI: async (id) => {
        const emis = await EMIService.getEMIs();
        const updatedEMIs = emis.filter(e => e.id !== id);
        await saveData(STORAGE_KEYS.EMIS, updatedEMIs);
        return updatedEMIs;
    }
};
