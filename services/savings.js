import { saveData, loadData, STORAGE_KEYS } from './storage';

export const SavingsService = {
    /**
     * Get all savings goals
     * @returns {Promise<Array>}
     */
    getGoals: async () => {
        return await loadData(STORAGE_KEYS.SAVINGS, []) || [];
    },

    /**
     * Add a new savings goal
     * @param {Object} goalData - { name, target_amount, current_amount, deadline, icon, color, category }
     * @returns {Promise<Array>} Updated goals list
     */
    addGoal: async (goalData) => {
        const goals = await SavingsService.getGoals();
        const newGoal = {
            id: Date.now().toString(),
            current_amount: 0, // Default to 0 if not provided
            ...goalData,
            createdAt: new Date().toISOString()
        };
        const updatedGoals = [...goals, newGoal];
        await saveData(STORAGE_KEYS.SAVINGS, updatedGoals);
        return updatedGoals;
    },

    /**
     * Update an existing goal
     * @param {Object} updatedGoal - Full goal object with ID
     * @returns {Promise<Array>} Updated goals list
     */
    updateGoal: async (updatedGoal) => {
        const goals = await SavingsService.getGoals();
        const updatedGoals = goals.map(g => g.id === updatedGoal.id ? { ...g, ...updatedGoal } : g);
        await saveData(STORAGE_KEYS.SAVINGS, updatedGoals);
        return updatedGoals;
    },

    /**
     * Delete a goal
     * @param {string} id 
     * @returns {Promise<Array>} Updated goals list
     */
    deleteGoal: async (id) => {
        const goals = await SavingsService.getGoals();
        const updatedGoals = goals.filter(g => g.id !== id);
        await saveData(STORAGE_KEYS.SAVINGS, updatedGoals);
        return updatedGoals;
    },

    /**
     * Calculate total saved amount across all goals
     * @param {Array} goals 
     * @returns {number}
     */
    calculateTotalSaved: (goals) => {
        return goals.reduce((sum, g) => sum + parseFloat(g.current_amount || 0), 0);
    }
};
