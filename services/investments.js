import { loadData, saveData, STORAGE_KEYS } from './storage';

import { mockInvestments } from './mockData';

export const InvestmentsService = {
    // Get all investments
    getInvestments: async () => {
        const data = await loadData(STORAGE_KEYS.INVESTMENTS);
        if (!data || data.length === 0) {
            return mockInvestments;
        }
        return data;
    },

    // Add investment
    addInvestment: async (investment) => {
        const investments = await InvestmentsService.getInvestments();
        const newInvestment = {
            id: Date.now().toString(),
            name: investment.name,
            type: investment.type,
            quantity: parseFloat(investment.quantity),
            investedAmount: parseFloat(investment.investedAmount),
            currentValue: parseFloat(investment.currentValue || investment.investedAmount),
            purchaseDate: investment.purchaseDate
        };

        investments.push(newInvestment);
        await saveData(STORAGE_KEYS.INVESTMENTS, investments);
        return investments;
    },

    // Update investment
    updateInvestment: async (id, updates) => {
        const investments = await InvestmentsService.getInvestments();
        const updated = investments.map(inv =>
            inv.id === id ? { ...inv, ...updates } : inv
        );
        await saveData(STORAGE_KEYS.INVESTMENTS, updated);
        return updated;
    },

    // Delete investment
    deleteInvestment: async (id) => {
        const investments = await InvestmentsService.getInvestments();
        const updated = investments.filter(inv => inv.id !== id);
        await saveData(STORAGE_KEYS.INVESTMENTS, updated);
        return updated;
    },

    // Calculations
    calculatePortfolioStats: (investments) => {
        const totalInvested = investments.reduce((sum, inv) => sum + (parseFloat(inv.investedAmount) || 0), 0);
        const totalValue = investments.reduce((sum, inv) => sum + (parseFloat(inv.currentValue) || 0), 0);
        const totalProfitChange = totalValue - totalInvested;
        const totalProfitPercent = totalInvested > 0 ? (totalProfitChange / totalInvested) * 100 : 0;

        return {
            totalInvested,
            totalValue,
            totalProfitChange,
            totalProfitPercent
        };
    }
};
