import { api } from './api';

export const TransactionsService = {
    /**
     * Create a new transaction with atomic idempotency.
     * @param {number} amount 
     * @param {string} category 
     */
    create: async (amount, category) => {
        // Calls POST /api/transactions
        // api.post automatically handles Bearer Token, Device ID, and Idempotency Key
        return await api.post('/transactions', { amount, category });
    },

    /**
     * Fetch user transactions.
     */
    getAll: async () => {
        return await api.get('/transactions');
    }
};
