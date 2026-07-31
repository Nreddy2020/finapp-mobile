import { StorageService, STORAGE_KEYS } from './storage';

export const ReportsService = {
    generateReport: async () => {
        // Fetch all necessary data
        const [
            incomeData,
            budgetData, // Used for expenses
            assetsData,
            loansData,
            savingsData,
            businessData
        ] = await Promise.all([
            StorageService.load(STORAGE_KEYS.INCOME_SOURCES) || [],
            StorageService.load(STORAGE_KEYS.BUDGETS) || [],
            StorageService.load(STORAGE_KEYS.ASSETS) || [],
            StorageService.load(STORAGE_KEYS.LOANS) || [],
            StorageService.load(STORAGE_KEYS.SAVINGS) || [],
            StorageService.load(STORAGE_KEYS.BUSINESS_DATA) || { sales: [] }
        ]);

        // 1. Calculate Net Worth
        const totalAssets = (assetsData.reduce((sum, a) => {
            const assetValue = Number(a.value || a.currentValue || a.current_value || a.invested || 0);
            return sum + assetValue;
        }, 0)) +
            (savingsData.reduce((sum, s) => {
                const savedAmount = Number(s.currentAmount || s.saved || s.amount || s.balance || 0);
                return sum + savedAmount;
            }, 0));

        const totalLiabilities = loansData.reduce((sum, l) => sum + Number(l.amount || 0), 0);
        const netWorth = Number(totalAssets) - Number(totalLiabilities);

        // 2. Monthly Income vs Expense (Mocked trend for demo + real data)
        const totalMonthlyIncome = incomeData.reduce((sum, i) => sum + i.amount, 0);
        const totalMonthlyExpense = budgetData.reduce((sum, b) => sum + b.spent, 0);

        const incomeVsExpense = [
            { label: 'Prev', value1: totalMonthlyIncome * 0.9, value2: totalMonthlyExpense * 1.1 },
            { label: 'Last', value1: totalMonthlyIncome * 0.95, value2: totalMonthlyExpense * 1.05 },
            { label: 'Curr', value1: totalMonthlyIncome, value2: totalMonthlyExpense },
        ];

        // 3. Expense Breakdown
        const expenseByCategory = budgetData
            .filter(b => b.spent > 0)
            .map(b => ({
                label: b.category,
                value: b.spent,
                color: b.color || '#6366F1'
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5); // Top 5

        // 4. Financial Health Score
        let score = 50; // Base
        // Savings Rate bonus
        if (totalMonthlyIncome > 0) {
            const savingsRate = (totalMonthlyIncome - totalMonthlyExpense) / totalMonthlyIncome;
            if (savingsRate > 0.2) score += 20;
            else if (savingsRate > 0.1) score += 10;
        }
        // Debt ratio penalty
        if (totalLiabilities > totalAssets * 0.5) score -= 20;
        if (netWorth > 100000) score += 10;
        score = Math.min(100, Math.max(0, score));

        return {
            netWorth,
            totalAssets,
            totalLiabilities,
            monthlyIncome: totalMonthlyIncome,
            monthlyExpense: totalMonthlyExpense,
            incomeVsExpense,
            expenseByCategory,
            healthScore: score
        };
    }
};
