// Phase 2: Daily Survival Tools - Mock Data

export const mockDailyBudget = {
    daily_budget: 500, // ₹500 per day
    today_spent: 380,
    monthly_budget: 15000,
    month_spent: 8500,
    today_expenses: [
        { id: 1, category: 'Food', amount: 150, description: 'Breakfast', time: '08:30 AM', essential: true },
        { id: 2, category: 'Transport', amount: 80, description: 'Auto to work', time: '09:15 AM', essential: true },
        { id: 3, category: 'Food', amount: 100, description: 'Lunch', time: '01:00 PM', essential: true },
        { id: 4, category: 'Other', amount: 50, description: 'Tea', time: '04:00 PM', essential: false },
    ]
};

export const mockQuickExpenses = [
    { category: 'Food', amount: 50, label: 'Tea/Snack' },
    { category: 'Food', amount: 100, label: 'Meal' },
    { category: 'Transport', amount: 30, label: 'Auto' },
    { category: 'Transport', amount: 50, label: 'Bus/Metro' },
    { category: 'Medicine', amount: 20, label: 'Basic Med' },
    { category: 'Utilities', amount: 100, label: 'Recharge' },
];

export const mockIncomePattern = {
    daily_income_avg: 600,
    weekly_income_avg: 3500,
    monthly_income_avg: 15000,
    income_history: [
        { date: '2025-12-27', amount: 800, source: 'Daily wage', weather: 'Good' },
        { date: '2025-12-26', amount: 500, source: 'Daily wage', weather: 'Good' },
        { date: '2025-12-25', amount: 0, source: 'Holiday', weather: 'Rain' },
        { date: '2025-12-24', amount: 700, source: 'Daily wage', weather: 'Good' },
        { date: '2025-12-23', amount: 600, source: 'Daily wage', weather: 'Good' },
        { date: '2025-12-22', amount: 200, source: 'Half day', weather: 'Rain' },
        { date: '2025-12-21', amount: 800, source: 'Daily wage', weather: 'Good' },
    ],
    pattern_insights: {
        best_day: 'Monday',
        worst_day: 'Sunday',
        rainy_days_impact: -60, // 60% less income on rainy days
        festival_boost: 40, // 40% more during festivals
    }
};

export const getDailyBudget = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockDailyBudget), 300);
    });
};

export const getIncomePattern = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockIncomePattern), 300);
    });
};

export const addQuickExpense = async (expense) => {
    return new Promise((resolve) => {
        setTimeout(() => {
            mockDailyBudget.today_spent += expense.amount;
            mockDailyBudget.month_spent += expense.amount;
            mockDailyBudget.today_expenses.push({
                ...expense,
                id: mockDailyBudget.today_expenses.length + 1,
                time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
            });
            resolve(mockDailyBudget);
        }, 200);
    });
};
