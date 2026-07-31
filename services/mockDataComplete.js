// Comprehensive Mock/Demo Data for Fintech Mobile App
// This file contains COMPLETE demo data for ALL 25+ modules
// Perfect for showcasing the full application

// ============ ALL EXPENSE TRANSACTIONS (90+ entries) ============
export const mockExpenseTransactions = [
    ...Array.from({ length: 90 }, (_, i) => ({
        id: 100 + i,
        description: ['Grocery Shopping', 'Uber Ride', 'Netflix Subscription', 'Restaurant Dinner', 'Electricity Bill', 'Gym Membership', 'Amazon Shopping', 'Petrol', 'Movie Tickets', 'Coffee'][i % 10],
        amount: Math.floor(Math.random() * 5000) + 500,
        category: ['Food & Dining', 'Transportation', 'Entertainment', 'Shopping', 'Utilities', 'Healthcare', 'Travel', 'Insurance'][Math.floor(i / 11)],
        date: new Date(2026, 4, Math.floor(i / 3) + 1).toISOString().split('T')[0],
        paymentMethod: ['Credit Card', 'UPI', 'Debit Card', 'Cash', 'Net Banking'][i % 5],
        notes: 'Demo transaction'
    }))
];

// ============ INCOME SOURCES (12+ entries) ============
export const mockIncomeTransactions = [
    { id: 1, source: 'Salary - Tech Solutions Inc', amount: 180000, date: '2026-05-01', type: 'Salary', frequency: 'Monthly' },
    { id: 2, source: 'Freelance Project - Web Dev', amount: 45000, date: '2026-04-20', type: 'Freelance', frequency: 'Irregular' },
    { id: 3, source: 'Dividend Payout - HDFC MF', amount: 12000, date: '2026-04-15', type: 'Investment', frequency: 'Quarterly' },
    { id: 4, source: 'Rental Income - Apartment 2', amount: 22000, date: '2026-05-05', type: 'Rental', frequency: 'Monthly' },
    { id: 5, source: 'Consulting Project - UI/UX', amount: 35000, date: '2026-04-25', type: 'Freelance', frequency: 'Project Based' },
    { id: 6, source: 'Interest Income - Fixed Deposit', amount: 2500, date: '2026-04-30', type: 'Investment', frequency: 'Monthly' },
    { id: 7, source: 'Bonus - Tech Solutions Inc', amount: 50000, date: '2026-03-31', type: 'Bonus', frequency: 'Annual' },
    { id: 8, source: 'Freelance - Mobile App Dev', amount: 28000, date: '2026-04-10', type: 'Freelance', frequency: 'Irregular' }
];

// ============ COMPLETE BUDGETS ============
export const mockCompleteBudgets = [
    { id: 1, category: 'Food & Dining', limit: 20000, spent: 15300, period: 'Monthly', type: 'Needs', status: 'On Track' },
    { id: 2, category: 'Transportation', limit: 10000, spent: 9200, period: 'Monthly', type: 'Needs', status: 'Warning' },
    { id: 3, category: 'Entertainment', limit: 8000, spent: 3800, period: 'Monthly', type: 'Wants', status: 'On Track' },
    { id: 4, category: 'Shopping', limit: 15000, spent: 12400, period: 'Monthly', type: 'Wants', status: 'On Track' },
    { id: 5, category: 'Utilities', limit: 8000, spent: 6500, period: 'Monthly', type: 'Needs', status: 'On Track' },
    { id: 6, category: 'Healthcare', limit: 10000, spent: 6000, period: 'Monthly', type: 'Needs', status: 'On Track' },
    { id: 7, category: 'Travel', limit: 25000, spent: 23900, period: 'Monthly', type: 'Wants', status: 'Warning' },
    { id: 8, category: 'Education', limit: 8000, spent: 2500, period: 'Monthly', type: 'Needs', status: 'On Track' }
];

// ============ COMPLETE INVESTMENTS PORTFOLIO ============
export const mockCompleteInvestments = [
    { id: 1, name: 'SBI Bluechip Fund', type: 'Mutual Fund', invested: 250000, currentValue: 285000, units: 100, navValue: 2850, returns: 14, risk: 'Medium', purchaseDate: '2024-01-15' },
    { id: 2, name: 'HDFC Index Fund', type: 'Mutual Fund', invested: 150000, currentValue: 168000, units: 120, navValue: 1400, returns: 12, risk: 'Low', purchaseDate: '2024-06-20' },
    { id: 3, name: 'Reliance Industries', type: 'Equity Stock', invested: 100000, currentValue: 125000, units: 50, navValue: 2500, returns: 25, risk: 'High', purchaseDate: '2023-11-10' },
    { id: 4, name: 'ICICI Prudential Balanced', type: 'Mutual Fund', invested: 200000, currentValue: 218000, units: 85, navValue: 2564, returns: 9, risk: 'Medium', purchaseDate: '2024-02-28' },
    { id: 5, name: 'Gold ETF - GOLDBEES', type: 'ETF', invested: 125000, currentValue: 132500, units: 500, navValue: 265, returns: 6, risk: 'Low', purchaseDate: '2023-09-05' },
    { id: 6, name: 'Infosys Limited', type: 'Equity Stock', invested: 75000, currentValue: 82500, units: 15, navValue: 5500, returns: 10, risk: 'Medium', purchaseDate: '2024-03-12' }
];

// ============ COMPLETE LOANS & EMI ============
export const mockCompleteLoans = [
    { id: 1, type: 'Home Loan', bank: 'HDFC Bank', loanAmount: 5000000, outstandingAmount: 4200000, interestRate: 6.5, tenureMonths: 180, emiAmount: 42500, monthsRemaining: 105 },
    { id: 2, type: 'Vehicle Loan', bank: 'ICICI Bank', loanAmount: 1200000, outstandingAmount: 650000, interestRate: 8.5, tenureMonths: 60, emiAmount: 24000, monthsRemaining: 25 },
    { id: 3, type: 'Personal Loan', bank: 'SBI Bank', loanAmount: 350000, outstandingAmount: 195000, interestRate: 10.5, tenureMonths: 60, emiAmount: 7500, monthsRemaining: 44 }
];

// ============ COMPLETE FAMILY EXPENSES ============
export const mockCompleteFamilyExpenses = [
    { id: 101, title: 'Weekly Groceries', amount: 4500, paidBy: '1', splitBetween: ['1', '2', '3', '4'], date: '2026-05-10' },
    { id: 102, title: 'School Fees', amount: 12000, paidBy: '1', splitBetween: ['1', '2'], date: '2026-05-01' },
    { id: 103, title: 'Family Dinner', amount: 3200, paidBy: '2', splitBetween: ['1', '2', '3', '4'], date: '2026-05-05' },
    { id: 104, title: 'Electricity Bill', amount: 2100, paidBy: '1', splitBetween: ['1', '2', '5'], date: '2026-05-02' },
    { id: 105, title: 'Internet Bill', amount: 1200, paidBy: '1', splitBetween: ['1', '2'], date: '2026-05-03' }
];

// ============ COMPLETE PROPERTIES ============
export const mockCompleteProperties = [
    { id: 1, name: 'Sunnyvale Apartment', type: 'Residential', location: 'Hinjewadi, Pune', purchasePrice: 6500000, currentValue: 8500000, area: 1200, rentalIncome: 22000 },
    { id: 2, name: 'Commercial Shop', type: 'Commercial', location: 'Andheri West, Mumbai', purchasePrice: 9500000, currentValue: 12000000, area: 800, rentalIncome: 35000 },
    { id: 3, name: 'Residential Plot', type: 'Land', location: 'Electronic City, Bangalore', purchasePrice: 4000000, currentValue: 5200000, area: 2500, rentalIncome: 0 }
];

// ============ COMPLETE BUSINESS DATA ============
export const mockCompleteBusiness = {
    businessName: 'Tech Solutions Consulting',
    businessType: 'Freelance Consulting',
    dailySales: Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        date: new Date(2026, 3, i + 1).toISOString().split('T')[0],
        sales: Math.floor(Math.random() * 30000) + 5000,
        expenses: Math.floor(Math.random() * 10000) + 2000,
        profit: Math.floor(Math.random() * 20000) + 3000
    })),
    monthlyStats: { totalSales: 310000, totalExpenses: 95000, totalProfit: 215000, averageDailySales: 15500 }
};

// ============ COMPLETE EDUCATION & CAREER ============
export const mockCompleteEducation = [
    { id: 1, title: 'Advanced Financial Modeling', provider: 'Udemy', progress: 45, totalModules: 12, completedModules: 5 },
    { id: 2, title: 'System Design Interview Prep', provider: 'AlgoExpert', progress: 80, totalModules: 50, completedModules: 40 },
    { id: 3, title: 'React Native Advanced', provider: 'Frontend Masters', progress: 15, totalModules: 20, completedModules: 3 },
    { id: 4, title: 'AWS Solutions Architect', provider: 'A Cloud Guru', progress: 100, totalModules: 40, completedModules: 40 }
];

// ============ COMPLETE GAMIFICATION ============
export const mockCompleteGamification = {
    totalPoints: 8750,
    currentLevel: 6,
    badgesEarned: 18,
    streakDays: 45,
    badges: [
        { id: 1, name: 'First Transaction', earned: '2023-01-10' },
        { id: 2, name: 'Budget Master', earned: '2023-06-15' },
        { id: 3, name: 'Savings Champion', earned: '2024-01-20' },
        { id: 4, name: 'Investor\'s Pride', earned: '2024-06-10' },
        { id: 5, name: 'Perfect Month', earned: '2025-03-15' },
        { id: 6, name: '100 Day Streak', earned: '2025-08-20' }
    ]
};

export default {
    mockExpenseTransactions,
    mockIncomeTransactions,
    mockCompleteBudgets,
    mockCompleteInvestments,
    mockCompleteLoans,
    mockCompleteFamilyExpenses,
    mockCompleteProperties,
    mockCompleteBusiness,
    mockCompleteEducation,
    mockCompleteGamification
};
