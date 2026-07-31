import { saveData, loadData, STORAGE_KEYS } from './storage';

export const LoanService = {
    /**
     * Get all loans (borrowing and lending)
     * @returns {Promise<Array>}
     */
    getLoans: async () => {
        return await loadData(STORAGE_KEYS.LOANS, []) || [];
    },

    /**
     * Add a new loan or lending record
     * @param {Object} loanData 
     * @returns {Promise<Array>} Updated loans list
     */
    addLoan: async (loanData) => {
        const loans = await LoanService.getLoans();
        const newLoan = {
            id: Date.now().toString(),
            history: [],
            lastInterestDate: new Date().toISOString(),
            outstanding_amount: parseFloat(loanData.outstanding_amount || loanData.amount || 0),
            ...loanData,
            createdAt: new Date().toISOString()
        };
        const updatedLoans = [...loans, newLoan];
        await saveData(STORAGE_KEYS.LOANS, updatedLoans);
        return updatedLoans;
    },

    /**
     * Update an existing loan
     * @param {Object} updatedLoan 
     * @returns {Promise<Array>} Updated loans list
     */
    updateLoan: async (updatedLoan) => {
        const loans = await LoanService.getLoans();
        const updatedLoans = loans.map(l => l.id === updatedLoan.id ? { ...l, ...updatedLoan } : l);
        await saveData(STORAGE_KEYS.LOANS, updatedLoans);
        return updatedLoans;
    },

    /**
     * Delete a loan record
     * @param {string} id 
     * @returns {Promise<Array>} Updated loans list
     */
    deleteLoan: async (id) => {
        const loans = await LoanService.getLoans();
        const updatedLoans = loans.filter(l => l.id !== id);
        await saveData(STORAGE_KEYS.LOANS, updatedLoans);
        return updatedLoans;
    },

    /**
     * Record a payment (partial or full)
     * @param {string} loanId 
     * @param {number} amount 
     * @returns {Promise<Array>} Updated loans list
     */
    addPayment: async (loanId, amount) => {
        const loans = await LoanService.getLoans();
        const updatedLoans = loans.map(loan => {
            if (loan.id === loanId) {
                const newBalance = Math.max(0, parseFloat(loan.outstanding_amount) - parseFloat(amount));
                const newHistory = [
                    { id: Date.now(), date: new Date().toISOString(), amount: parseFloat(amount), type: 'PAYMENT' },
                    ...(loan.history || [])
                ];
                return { ...loan, outstanding_amount: newBalance, history: newHistory };
            }
            return loan;
        });
        await saveData(STORAGE_KEYS.LOANS, updatedLoans);
        return updatedLoans;
    },

    /**
     * Simulate interest accrual (Simple Interest Logic)
     * @param {number} periodInMonths - e.g., 1 for monthly accrual
     * @returns {Promise<Array>} Updated loans list
     */
    accrueInterest: async (periodInMonths = 1) => {
        const loans = await LoanService.getLoans();
        const updatedLoans = loans.map(loan => {
            // Formula: (Principal * Rate / 100) * (Months / 12)
            const interest = (parseFloat(loan.outstanding_amount) * (parseFloat(loan.interest_rate) / 100)) * (periodInMonths / 12);
            const newBalance = parseFloat(loan.outstanding_amount) + interest;
            const newHistory = [
                { id: Date.now(), date: new Date().toISOString(), amount: interest, type: 'INTEREST' },
                ...(loan.history || [])
            ];
            return {
                ...loan,
                outstanding_amount: newBalance,
                history: newHistory,
                lastInterestDate: new Date().toISOString()
            };
        });
        await saveData(STORAGE_KEYS.LOANS, updatedLoans);
        return updatedLoans;
    }
};
