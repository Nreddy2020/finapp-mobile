import { loadData, saveData, STORAGE_KEYS } from './storage';

const MEDICINE_LOGS_KEY = 'user_medicine_logs';

export const HealthService = {
    /**
     * Get dose history for a specific medicine
     * @param {string} medId 
     * @returns {Promise<Array>} List of log entries
     */
    getDoseHistory: async (medId) => {
        const allLogs = await loadData(MEDICINE_LOGS_KEY, {});
        return allLogs[medId] || [];
    },

    /**
     * Log a dose for a medicine
     * @param {Object} medicine - Combined medicine object
     * @returns {Promise<Object>} Result with success and updated history
     */
    logDose: async (medicine) => {
        try {
            const allLogs = await loadData(MEDICINE_LOGS_KEY, {});
            const currentHistory = allLogs[medicine.id] || [];

            const newLog = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                dosage: medicine.dosage,
                status: 'TAKEN'
            };

            const updatedHistory = [newLog, ...currentHistory];
            allLogs[medicine.id] = updatedHistory;

            await saveData(MEDICINE_LOGS_KEY, allLogs);

            return { success: true, history: updatedHistory };
        } catch (error) {
            console.error('Error logging dose:', error);
            return { success: false, error };
        }
    },

    /**
     * Get simulated health stats (Steps, Sleep, Calories)
     * In a real app, this would connect to Apple HealthKit or Google Fit
     */
    getHealthStats: () => {
        // Randomize slightly to show "life"
        const steps = 7000 + Math.floor(Math.random() * 3000);
        const sleepHours = 6 + Math.floor(Math.random() * 2);
        const sleepMins = Math.floor(Math.random() * 59);
        const calories = 1800 + Math.floor(Math.random() * 500);

        return {
            steps: { value: steps.toLocaleString(), goal: '10,000', progress: steps / 10000 },
            sleep: { value: `${sleepHours}h ${sleepMins}m`, goal: '8h', progress: (sleepHours + sleepMins / 60) / 8 },
            calories: { value: calories.toLocaleString(), goal: '2,500', progress: calories / 2500 }
        };
    }
};

export default HealthService;
