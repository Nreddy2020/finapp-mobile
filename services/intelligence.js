import { api } from './api';

export const IntelligenceService = {
    /**
     * Simulate Market Shock
     * @param {string} scenario - 'RECESSION' or 'BOOM'
     * @returns {Promise<object>} SimulationResult
     */
    simulateMarketShock: async (scenario) => {
        try {
            const response = await api.post('/intelligence/simulate', null, {
                params: { scenario }
            });
            return response; // Expected: { scenario, revenue, profit, trend, stress }
        } catch (error) {
            console.error('[Intelligence] Simulation Failed:', error);
            // Fallback for demo if offline/error
            return {
                scenario,
                revenue: '---',
                profit: '---',
                trend: 'Error',
                stress: 'UNKNOWN'
            };
        }
    }
};
