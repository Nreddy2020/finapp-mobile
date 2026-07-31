import { StorageService, STORAGE_KEYS } from './storage';

export const TravelService = {
    // Get all travel plans
    getTravelPlans: async () => {
        const data = await StorageService.load(STORAGE_KEYS.TRAVEL);
        return data || [];
    },

    // Add a new travel plan
    addTravelPlan: async (plan) => {
        const plans = await TravelService.getTravelPlans();
        const newPlan = {
            id: Date.now().toString(),
            destination: plan.destination,
            start_date: plan.startDate,
            end_date: plan.endDate,
            budget: parseFloat(plan.budget) || 0,
            spent: parseFloat(plan.spent) || 0,
            notes: plan.notes || '',
            createdAt: new Date().toISOString(),
        };

        const updated = [newPlan, ...plans];
        await StorageService.save(STORAGE_KEYS.TRAVEL, updated);
        return updated;
    },

    // Update travel plan
    updateTravelPlan: async (id, updates) => {
        const plans = await TravelService.getTravelPlans();
        const updated = plans.map(plan =>
            plan.id === id ? { ...plan, ...updates } : plan
        );
        await StorageService.save(STORAGE_KEYS.TRAVEL, updated);
        return updated;
    },

    // Delete travel plan
    deleteTravelPlan: async (id) => {
        const plans = await TravelService.getTravelPlans();
        const updated = plans.filter(plan => plan.id !== id);
        await StorageService.save(STORAGE_KEYS.TRAVEL, updated);
        return updated;
    },

    // Calculate total budget
    calculateTotalBudget: (plans) => {
        return plans.reduce((sum, plan) => sum + (parseFloat(plan.budget) || 0), 0);
    },

    // Calculate total spent
    calculateTotalSpent: (plans) => {
        return plans.reduce((sum, plan) => sum + (parseFloat(plan.spent) || 0), 0);
    }
};
