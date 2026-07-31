// COMPREHENSIVE DEMO DATA SEEDING SYSTEM
// Populates ALL modules with realistic demo data across ALL services

import { saveData, STORAGE_KEYS } from './storage';
import {
    mockExpenseTransactions,
    mockIncomeTransactions,
    mockCompleteBudgets,
    mockCompleteInvestments,
    mockCompleteLoans,
    mockCompleteFamilyExpenses,
    mockCompleteProperties,
    mockCompleteBusiness,
    mockCompleteEducation
} from './mockDataComplete';

/**
 * MASTER SEEDING FUNCTION
 * Populates ALL storage-backed modules with comprehensive demo data
 * Call this once on app initialization to load demo
 */
export async function seedAllModulesComprehensive() {
    console.log('🌱 Starting comprehensive demo data seeding...');
    const startTime = Date.now();
    
    try {
        // ============ PHASE 1: CORE FINANCIAL DATA ============
        await seedTransactions();
        await seedIncomeData();
        await seedIncomeAlias();
        await seedBudgets();
        await seedBankAccounts();
        await seedSavingsGoals();
        await seedAssets();
        await seedCashbooks();
        await seedTodos();
        await seedAffirmations();
        await seedMetalsHistory();
        
        // ============ PHASE 2: INVESTMENTS & ASSETS ============
        await seedInvestments();
        await seedProperties();
        await seedApartmentData();
        await seedHostelData();
        await seedCommunityPools();
        await seedGroupExpenses();
        await seedCrowdfundingCampaigns();
        
        // ============ PHASE 3: LOANS & LIABILITIES ============
        await seedLoans();
        await seedEmis();
        await seedPendingItems();
        
        // ============ PHASE 4: BILLS & RECURRING ============
        await seedBills();
        await seedRecurringPayments();
        await seedFees();
        
        // ============ PHASE 5: SPECIALIZED MODULES ============
        await seedBusiness();
        await seedFamilyData();
        await seedEducation();
        await seedCareer();
        await seedTravelData();
        await seedMedicineData();
        await seedTaxProfile();
        await seedIncomeCalendar();
        await seedPlanningData();
        await seedEmergencyFund();
        await seedValidity();
        
        // ============ PHASE 6: ENGAGEMENT & GAMIFICATION ============
        await seedGamification();
        await seedNotifications();
        await seedFeedback();
        
        // ============ PHASE 7: FINANCIAL HEALTH & SETTINGS ============
        await seedFinancialHealth();
        await seedSettings();
        await seedUserSettings();
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;
        
        const result = {
            success: true,
            message: `✅ Successfully seeded ALL demo modules in ${duration.toFixed(2)}s`,
            modulesSeeded: 40,
            duration: duration,
            timestamp: new Date().toISOString()
        };
        
        console.log(result.message);
        return result;
        
    } catch (error) {
        console.error('❌ Error seeding demo data:', error);
        return { success: false, error: error.message };
    }
}

// ============ INDIVIDUAL SEEDING FUNCTIONS ============

async function seedTransactions() {
    console.log('📝 Seeding Transactions...');
    await saveData(STORAGE_KEYS.TRANSACTIONS, mockExpenseTransactions);
}

async function seedIncomeData() {
    console.log('💰 Seeding Income Sources...');
    await saveData(STORAGE_KEYS.INCOME_SOURCES, mockIncomeTransactions);
}

async function seedBudgets() {
    console.log('📊 Seeding Budgets...');
    await saveData(STORAGE_KEYS.BUDGETS, mockCompleteBudgets);
}

async function seedBankAccounts() {
    console.log('🏦 Seeding Bank Accounts...');
    const accounts = [
        { id: 1, bankName: 'HDFC Bank', type: 'Savings', accountNumber: '****1234', balance: 425000, currency: 'INR', interestRate: 3.5 },
        { id: 2, bankName: 'ICICI Bank', type: 'Current', accountNumber: '****5678', balance: 185000, currency: 'INR', interestRate: 0 },
        { id: 3, bankName: 'SBI', type: 'Savings', accountNumber: '****9012', balance: 95000, currency: 'INR', interestRate: 3.0 }
    ];
    await saveData(STORAGE_KEYS.ACCOUNTS, accounts);
}

async function seedSavingsGoals() {
    console.log('🎯 Seeding Savings Goals...');
    const goals = [
        { id: 1, name: 'Emergency Fund', target: 900000, saved: 725000, deadline: '2026-12-31', priority: 'High' },
        { id: 2, name: 'New Car Purchase', target: 1500000, saved: 450000, deadline: '2027-06-30', priority: 'Medium' },
        { id: 3, name: 'House Down Payment', target: 5000000, saved: 1850000, deadline: '2028-12-31', priority: 'High' },
        { id: 4, name: 'European Vacation', target: 400000, saved: 185000, deadline: '2026-08-31', priority: 'Low' },
        { id: 5, name: 'Kids Education Fund', target: 3000000, saved: 1250000, deadline: '2030-06-30', priority: 'High' }
    ];
    await saveData(STORAGE_KEYS.SAVINGS, goals);
}

async function seedInvestments() {
    console.log('📈 Seeding Investments...');
    await saveData(STORAGE_KEYS.INVESTMENTS, mockCompleteInvestments);
}

async function seedProperties() {
    console.log('🏠 Seeding Properties...');
    await saveData(STORAGE_KEYS.PROPERTIES, mockCompleteProperties);
}

async function seedLoans() {
    console.log('💳 Seeding Loans...');
    await saveData(STORAGE_KEYS.LOANS, mockCompleteLoans);
}

async function seedEmis() {
    console.log('📅 Seeding EMIs...');
    const emis = mockCompleteLoans.map(loan => ({
        id: loan.id,
        name: `${loan.type}`,
        amount: loan.emiAmount,
        outstanding: loan.outstandingAmount,
        months_remaining: loan.monthsRemaining
    }));
    await saveData(STORAGE_KEYS.EMIS, emis);
}

async function seedPendingItems() {
    console.log('⏳ Seeding Pending Items...');
    const pending = [
        { id: 1, type: 'Lent', name: 'Amit Sharma', amount: 15000, date: '2026-03-10', status: 'Pending' },
        { id: 2, type: 'Lent', name: 'Priya Singh', amount: 8000, date: '2026-04-05', status: 'Pending' },
        { id: 3, type: 'Owed', name: 'Raj Kumar', amount: 12000, date: '2026-02-20', status: 'Pending' }
    ];
    await saveData(STORAGE_KEYS.PENDING_ITEMS, pending);
}

async function seedBills() {
    console.log('📋 Seeding Bills...');
    const bills = [
        { id: 1, name: 'Electricity Bill', amount: 2500, dueDate: '2026-05-28', paid: false, category: 'Utilities' },
        { id: 2, name: 'Internet Bill', amount: 1200, dueDate: '2026-05-30', paid: false, category: 'Utilities' },
        { id: 3, name: 'Water Bill', amount: 650, dueDate: '2026-05-25', paid: true, category: 'Utilities' },
        { id: 4, name: 'Credit Card Payment', amount: 45000, dueDate: '2026-06-05', paid: false, category: 'Finance' },
        { id: 5, name: 'House Rent EMI', amount: 42500, dueDate: '2026-05-01', paid: true, category: 'Housing' }
    ];
    await saveData(STORAGE_KEYS.BILLS, bills);
}

async function seedRecurringPayments() {
    console.log('🔄 Seeding Recurring Payments...');
    const recurring = [
        { id: 1, name: 'Netflix', amount: 649, frequency: 'Monthly', nextDate: '2026-06-12', status: 'Active' },
        { id: 2, name: 'Spotify', amount: 119, frequency: 'Monthly', nextDate: '2026-05-15', status: 'Active' },
        { id: 3, name: 'Gym Membership', amount: 1500, frequency: 'Monthly', nextDate: '2026-06-09', status: 'Active' },
        { id: 4, name: 'Life Insurance', amount: 5000, frequency: 'Monthly', nextDate: '2026-05-20', status: 'Active' }
    ];
    await saveData(STORAGE_KEYS.RECURRING_PAYMENTS, recurring);
}

async function seedBusiness() {
    console.log('💼 Seeding Business Data...');
    await saveData(STORAGE_KEYS.BUSINESS_DATA, {
        name: 'Tech Solutions Consulting',
        type: 'Freelance',
        monthlyRevenue: 310000,
        monthlyExpenses: 95000,
        monthlyProfit: 215000,
        ...mockCompleteBusiness
    });
}

async function seedFamilyData() {
    console.log('👨‍👩‍👧‍👦 Seeding Family Data...');
    const members = [
        { id: '1', name: 'Reddy', role: 'Admin' },
        { id: '2', name: 'Anjali', role: 'Member' },
        { id: '3', name: 'Arjun', role: 'Child' },
        { id: '4', name: 'Kavya', role: 'Child' }
    ];
    await saveData(STORAGE_KEYS.FAMILY_MEMBERS, members);
    await saveData(STORAGE_KEYS.FAMILY_EXPENSES, mockCompleteFamilyExpenses);
}

async function seedEducation() {
    console.log('📚 Seeding Education Data...');
    await saveData(STORAGE_KEYS.EDUCATION_PROGRESS, mockCompleteEducation);
    await saveData(STORAGE_KEYS.LITERACY_SCORES, { score: 78, level: 'Advanced', percentile: 85 });
}

async function seedCareer() {
    console.log('🚀 Seeding Career Data...');
    const careerGoals = [
        { id: 1, title: 'Senior Architect Promotion', progress: 75, targetDate: '2026-06-30' },
        { id: 2, title: 'AWS Certification', progress: 100, targetDate: '2026-04-30' },
        { id: 3, title: 'System Design Mastery', progress: 45, targetDate: '2027-12-31' }
    ];
    await saveData(STORAGE_KEYS.CAREER_GOALS, careerGoals);
    const roiHistory = [
        { id: 1, skill: 'Cloud Architecture', cost: 25000, increase: 5000, recovery: 5.0 },
        { id: 2, skill: 'System Design', cost: 15000, increase: 3000, recovery: 5.0 }
    ];
    await saveData(STORAGE_KEYS.CAREER_DOI, roiHistory);
}

async function seedTravelData() {
    console.log('✈️ Seeding Travel Data...');
    const travel = [
        { id: 1, tripName: 'Hyderabad Business Trip', totalBudget: 25000, spent: 23500, destination: 'Hyderabad' },
        { id: 2, tripName: 'Goa Vacation', totalBudget: 50000, spent: 48200, destination: 'Goa' },
        { id: 3, tripName: 'Mumbai Weekend', totalBudget: 30000, spent: 28500, destination: 'Mumbai' }
    ];
    await saveData(STORAGE_KEYS.TRAVEL, travel);
}

async function seedMedicineData() {
    console.log('💊 Seeding Medicine Data...');
    const medicines = [
        { id: 1, name: 'Aspirin', dosage: '500mg', frequency: 'Daily', cost: 150 },
        { id: 2, name: 'Vitamin D', dosage: '1000IU', frequency: 'Daily', cost: 200 },
        { id: 3, name: 'Blood Pressure Medicine', dosage: '10mg', frequency: 'Twice Daily', cost: 350 }
    ];
    await saveData(STORAGE_KEYS.MEDICINES, medicines);
}

async function seedGamification() {
    console.log('🎮 Seeding Gamification Data...');
    const points = { total: 8750, history: [] };
    const badges = ['novice', 'expert', 'master', 'master_investor', 'budget_master', 'streak_champion'];
    await saveData(STORAGE_KEYS.USER_POINTS, points);
    await saveData(STORAGE_KEYS.USER_BADGES, badges);
}

async function seedNotifications() {
    console.log('🔔 Seeding Notifications...');
    const notifications = [
        { id: 1, title: 'Bill Due', message: 'Electricity bill of ₹2,500 is due tomorrow', type: 'warning' },
        { id: 2, title: 'Income Credited', message: 'Salary of ₹1,80,000 was credited', type: 'success' },
        { id: 3, title: 'Goal Progress', message: 'Emergency fund reached 80%', type: 'info' },
        { id: 4, title: 'Budget Alert', message: 'You\'ve spent 92% of dining budget', type: 'warning' }
    ];
    await saveData(STORAGE_KEYS.NOTIFICATIONS, notifications);
}

async function seedFeedback() {
    console.log('💬 Seeding Feedback Data...');
    const feedback = [
        { id: 1, category: 'Feature Request', title: 'Bill Splitting', rating: 4 },
        { id: 2, category: 'Great Experience', title: 'Dashboard', rating: 5 }
    ];
    await saveData(STORAGE_KEYS.FEEDBACK_LOGS, feedback);
}

async function seedFinancialHealth() {
    console.log('❤️ Seeding Financial Health...');
    const health = {
        score: 78,
        level: 'Good',
        debtToIncome: 32,
        savingsRate: 58,
        emergencyFundMonths: 8.5,
        crisisLevel: 'Low'
    };
    await saveData(STORAGE_KEYS.FINANCIAL_HEALTH, health);
}

async function seedSettings() {
    console.log('⚙️ Seeding Settings...');
    const settings = {
        currency: 'INR',
        language: 'English',
        theme: 'Dark',
        timezone: 'IST',
        notifications: { billReminders: true, goalProgress: true, budgetAlerts: true }
    };
    await saveData(STORAGE_KEYS.SETTINGS, settings);
}

async function seedUserSettings() {
    console.log('🔧 Seeding User Settings...');
    const settings = {
        notifications: { push: true, email: true, sms: false },
        preferredCurrency: 'INR',
        darkMode: true,
        locale: 'en-IN',
        defaultView: 'dashboard'
    };
    await saveData(STORAGE_KEYS.USER_SETTINGS, settings);
}

async function seedAffirmations() {
    console.log('💬 Seeding Affirmations...');
    const affirmations = {
        current: 'Every rupee saved today brings you closer to financial freedom.',
        history: [
            { id: 1, text: 'I manage my money with confidence.', date: '2026-05-10' },
            { id: 2, text: 'I am building wealth one step at a time.', date: '2026-05-11' }
        ]
    };
    await saveData(STORAGE_KEYS.AFFIRMATIONS_DATA, affirmations);
}

async function seedTodos() {
    console.log('🗒️ Seeding Todos...');
    const todos = [
        { id: 1, title: 'Review monthly budget', completed: false, dueDate: '2026-05-20' },
        { id: 2, title: 'Pay electricity bill', completed: true, dueDate: '2026-05-10' },
        { id: 3, title: 'Update tax profile', completed: false, dueDate: '2026-06-15' }
    ];
    await saveData(STORAGE_KEYS.TODOS, todos);
}

async function seedAssets() {
    console.log('🏘️ Seeding Assets...');
    const assets = [
        { id: 1, name: 'Gold Jewellery', type: 'Gold', current_value: 180000, acquired: '2024-01-15' },
        { id: 2, name: 'Mutual Funds', type: 'Investment', current_value: 420000, acquired: '2023-08-20' }
    ];
    await saveData(STORAGE_KEYS.ASSETS, assets);
}

async function seedCashbooks() {
    console.log('📒 Seeding Cashbooks...');
    const cashbooks = [
        { id: 1, name: 'Household Expenses', balance: 52000, currency: 'INR' },
        { id: 2, name: 'Travel Fund', balance: 18000, currency: 'INR' }
    ];
    await saveData(STORAGE_KEYS.CASHBOOKS, cashbooks);
}

async function seedMetalsHistory() {
    console.log('⛏️ Seeding Metals History...');
    const history = [
        { id: 1, metal: 'Gold', price: 5700, unit: 'g', date: '2026-05-12' },
        { id: 2, metal: 'Silver', price: 72, unit: 'g', date: '2026-05-12' }
    ];
    await saveData(STORAGE_KEYS.METALS_HISTORY, history);
}

async function seedApartmentData() {
    console.log('🏢 Seeding Apartment Data...');
    const apartments = [
        { id: 1, name: 'Lakeview Apartment', rent: 22000, area: 1200, status: 'Occupied' }
    ];
    await saveData(STORAGE_KEYS.APARTMENT_DATA, apartments);
}

async function seedHostelData() {
    console.log('🏨 Seeding Hostel Data...');
    const hostels = [
        { id: 1, name: 'Campus Hostel A', fee: 12000, room: '102B', status: 'Paid' }
    ];
    await saveData(STORAGE_KEYS.HOSTEL_DATA, hostels);
}

async function seedCommunityPools() {
    console.log('🤝 Seeding Community Pools...');
    const pools = [
        { id: 1, name: 'Neighborhood Savings Circle', total: 25000, members: 6, nextContribution: '2026-06-05' }
    ];
    await saveData(STORAGE_KEYS.COMMUNITY_POOLS, pools);
}

async function seedGroupExpenses() {
    console.log('👥 Seeding Group Expenses...');
    const expenses = [
        { id: 1, title: 'Dinner Out', amount: 3600, paidBy: '1', splitBetween: ['1', '2', '3'], date: '2026-05-12' }
    ];
    await saveData(STORAGE_KEYS.GROUP_EXPENSES, expenses);
}

async function seedCrowdfundingCampaigns() {
    console.log('🚀 Seeding Crowdfunding Campaigns...');
    const campaigns = [
        { id: 1, title: 'School Fund', goal: 50000, raised: 38000, deadline: '2026-08-01' }
    ];
    await saveData(STORAGE_KEYS.CROWDFUNDING_CAMPAIGNS, campaigns);
}

async function seedTaxProfile() {
    console.log('🧾 Seeding Tax Profile...');
    const profile = {
        income: 1800000,
        deductions: 150000,
        filingStatus: 'Individual',
        nextDue: '2026-07-31'
    };
    await saveData(STORAGE_KEYS.TAX_PROFILE, profile);
}

async function seedPlanningData() {
    console.log('🧠 Seeding Planning Modules...');
    const debts = [
        { id: 1, name: 'Debt Consolidation', amount: 350000, interestRate: 8.5, termMonths: 48 }
    ];
    const emergency = { target: 400000, saved: 320000, monthsCovered: 6 };
    await saveData(STORAGE_KEYS.PLANNING_DEBT, debts);
    await saveData(STORAGE_KEYS.PLANNING_EMERGENCY, emergency);
}

async function seedIncomeCalendar() {
    console.log('📅 Seeding Income Calendar...');
    const entries = [
        { id: 1, source: 'Salary', amount: 180000, date: '2026-05-31' },
        { id: 2, source: 'Freelance Project', amount: 45000, date: '2026-05-20' }
    ];
    await saveData(STORAGE_KEYS.INCOME_CALENDAR, entries);
}

async function seedFees() {
    console.log('💸 Seeding Fees...');
    const fees = [
        { id: 1, name: 'Bank Transfer', amount: 25, dueDate: '2026-05-18', category: 'Banking' }
    ];
    await saveData(STORAGE_KEYS.FEES, fees);
}

async function seedEmergencyFund() {
    console.log('🛡️ Seeding Emergency Fund...');
    const emergencyFund = {
        current_amount: 320000,
        target_amount: 400000,
        monthsCovered: 6,
        lastUpdated: '2026-05-12'
    };
    await saveData(STORAGE_KEYS.EMERGENCY_FUND, emergencyFund);
}

async function seedValidity() {
    console.log('✅ Seeding Validity Documents...');
    const documents = [
        { id: 1, type: 'ID proof', status: 'Verified', updatedAt: '2026-05-10' }
    ];
    await saveData(STORAGE_KEYS.VALIDITY, documents);
}

async function seedIncomeAlias() {
    console.log('💵 Seeding Income Alias for legacy modules...');
    await saveData(STORAGE_KEYS.INCOME, mockIncomeTransactions);
}

export default {
    seedAllModulesComprehensive
};
