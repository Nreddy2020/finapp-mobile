// Comprehensive Mock Data for Fintech Mobile App - DEMO VERSION
// This file contains realistic sample data for ALL 25+ modules
// Updated: May 2026 - Complete feature demo with realistic Indian FX values (₹)

// ============ USER PROFILE ============
export const mockUserProfile = {
    id: 'user_demo_001',
    name: 'Reddy Nirmalakar',
    email: 'reddy@fintech-demo.com',
    phone: '+91-98765-43210',
    city: 'Bangalore',
    state: 'Karnataka',
    country: 'India',
    dateOfBirth: '1989-05-15',
    joinedDate: '2023-01-10',
    profileImage: 'https://i.pravatar.cc/150?img=15',
    monthlyIncome: 150000,
    employmentType: 'Employed',
    currency: 'INR',
    timezone: 'IST'
};

// ============ DASHBOARD & CORE FINANCE ============
export const mockDashboardData = {
    total_income: 629500,
    total_expenses: 287500,
    balance: 342000,
    savings_rate: 58,
    netWorth: 15345000,
    expenseByCategory: {
        'Food & Dining': 42000,
        'Transportation': 18500,
        'Shopping': 35200,
        'Entertainment': 14800,
        'Utilities': 15600,
        'Healthcare': 22500,
        'Investment': 95000,
        'Education': 18000,
        'Travel': 25900
    },
    recentExpenses: [
        { id: 1, description: 'Grocery Shopping - BigBasket', amount: 3500, category: 'Food & Dining', date: '2026-05-13', paymentMethod: 'Credit Card' },
        { id: 2, description: 'Uber Ride to Office', amount: 450, category: 'Transportation', date: '2026-05-13', paymentMethod: 'UPI' },
        { id: 3, description: 'Netflix Subscription', amount: 649, category: 'Entertainment', date: '2026-05-12', paymentMethod: 'Debit Card' },
        { id: 4, description: 'Restaurant Dinner - Alta Café', amount: 2800, category: 'Food & Dining', date: '2026-05-11', paymentMethod: 'Credit Card' },
        { id: 5, description: 'Electricity Bill Payment', amount: 2100, category: 'Utilities', date: '2026-05-10', paymentMethod: 'Net Banking' },
        { id: 6, description: 'Gym Membership - Gold\'s Gym', amount: 1500, category: 'Healthcare', date: '2026-05-09', paymentMethod: 'UPI' },
        { id: 7, description: 'Amazon Purchase - Books', amount: 4200, category: 'Shopping', date: '2026-05-08', paymentMethod: 'Credit Card' },
        { id: 8, description: 'Petrol - Shell Station', amount: 2500, category: 'Transportation', date: '2026-05-07', paymentMethod: 'Cash' },
        { id: 9, description: 'Movie Tickets - PVR Cinemas', amount: 1200, category: 'Entertainment', date: '2026-05-06', paymentMethod: 'UPI' },
        { id: 10, description: 'Restaurant Lunch', amount: 850, category: 'Food & Dining', date: '2026-05-05', paymentMethod: 'Card' }
    ],
    recentIncome: [
        { id: 1, source: 'Salary - Tech Solutions Inc', amount: 180000, date: '2026-05-01' },
        { id: 2, source: 'Freelance Project - Web Dev', amount: 45000, date: '2026-04-20' },
        { id: 3, source: 'Dividend Payout - HDFC Mutual Fund', amount: 12000, date: '2026-04-15' },
        { id: 4, source: 'Rental Income - Apartment 2', amount: 22000, date: '2026-05-05' },
        { id: 5, source: 'Consulting Project', amount: 35000, date: '2026-04-25' }
    ],
    pendingBillsCount: 5,
    lastUpdated: '2026-05-13T14:30:00Z'
};

// ============ TRANSACTIONS (Last 90 days) ============
export const mockExpenses = [
    { id: 101, description: 'Grocery Shopping - BigBasket', amount: 3500, category: 'Food & Dining', date: '2026-05-13', paymentMethod: 'Credit Card', notes: 'Weekly groceries' },
    { id: 102, description: 'Uber Ride to Office', amount: 450, category: 'Transportation', date: '2026-05-13', paymentMethod: 'UPI', notes: 'Daily commute' },
    { id: 103, description: 'Netflix Subscription', amount: 649, category: 'Entertainment', date: '2026-05-12', paymentMethod: 'Debit Card', notes: 'Premium subscription' },
    { id: 104, description: 'Restaurant Dinner - Alta Café', amount: 2800, category: 'Food & Dining', date: '2026-05-11', paymentMethod: 'Credit Card', notes: 'Date night' },
    { id: 105, description: 'Electricity Bill', amount: 2100, category: 'Utilities', date: '2026-05-10', paymentMethod: 'Net Banking', notes: 'Monthly bill' },
    { id: 106, description: 'Gym Membership', amount: 1500, category: 'Healthcare', date: '2026-05-09', paymentMethod: 'UPI', notes: 'Gold\'s Gym membership' },
    { id: 107, description: 'Amazon Shopping', amount: 4200, category: 'Shopping', date: '2026-05-08', paymentMethod: 'Credit Card', notes: 'Books and electronics' },
    { id: 108, description: 'Petrol - Shell Station', amount: 2500, category: 'Transportation', date: '2026-05-07', paymentMethod: 'Cash', notes: 'Full tank' },
    { id: 109, description: 'Movie Tickets - PVR Cinemas', amount: 1200, category: 'Entertainment', date: '2026-05-06', paymentMethod: 'UPI', notes: 'Movie night' },
    { id: 110, description: 'Restaurant Lunch', amount: 850, category: 'Food & Dining', date: '2026-05-05', paymentMethod: 'Card', notes: 'Office lunch' },
    { id: 111, description: 'Water Bill', amount: 650, category: 'Utilities', date: '2026-05-04', paymentMethod: 'Net Banking', notes: 'Monthly bill' },
    { id: 112, description: 'Medicine Purchase', amount: 1850, category: 'Healthcare', date: '2026-05-03', paymentMethod: 'UPI', notes: 'Pharmacy' },
    { id: 113, description: 'Hotel Stay - Business Trip', amount: 15000, category: 'Travel', date: '2026-05-02', paymentMethod: 'Credit Card', notes: '2 nights Hyderabad' },
    { id: 114, description: 'Flight Booking - IndiGo', amount: 8500, category: 'Travel', date: '2026-05-01', paymentMethod: 'Credit Card', notes: 'Return flight' },
    { id: 115, description: 'Insurance - Life Insurance',  amount: 5000, category: 'Insurance', date: '2026-04-30', paymentMethod: 'Auto Debit', notes: 'Monthly premium' },
    { id: 116, description: 'Car Maintenance', amount: 3500, category: 'Transportation', date: '2026-04-28', paymentMethod: 'Cash', notes: 'Regular servicing' },
    { id: 117, description: 'Coffee - Café Coffee Day', amount: 350, category: 'Food & Dining', date: '2026-04-27', paymentMethod: 'UPI', notes: 'Daily coffee' },
    { id: 118, description: 'Mobile Bill - Airtel', amount: 899, category: 'Utilities', date: '2026-04-25', paymentMethod: 'Net Banking', notes: 'Monthly plan' },
    { id: 119, description: 'Socks - Bata Store', amount: 450, category: 'Shopping', date: '2026-04-24', paymentMethod: 'Card', notes: 'Everyday essentials' },
    { id: 120, description: 'Lunch - Food Court', amount: 250, category: 'Food & Dining', date: '2026-04-22', paymentMethod: 'Cash', notes: 'Office lunch' }
];

// ============ INCOME SOURCES ============
export const mockIncome = [
    { id: 1, source: 'Salary - Tech Solutions Inc', amount: 180000, date: '2026-05-01', type: 'Salary', frequency: 'Monthly', accountNumber: '**1234' },
    { id: 2, source: 'Freelance Project - Web Dev', amount: 45000, date: '2026-04-20', type: 'Freelance', frequency: 'Irregular', accountNumber: '**5678' },
    { id: 3, source: 'Dividend Payout - HDFC MF', amount: 12000, date: '2026-04-15', type: 'Investment', frequency: 'Quarterly', accountNumber: '**1234' },
    { id: 4, source: 'Rental Income - Apartment 2', amount: 22000, date: '2026-05-05', type: 'Rental', frequency: 'Monthly', accountNumber: '**9012' },
    { id: 5, source: 'Consulting Project - UI/UX', amount: 35000, date: '2026-04-25', type: 'Freelance', frequency: 'Project Based', accountNumber: '**5678' },
    { id: 6, source: 'Interest Income - Fixed Deposit', amount: 2500, date: '2026-04-30', type: 'Investment', frequency: 'Monthly', accountNumber: '**1234' },
    { id: 7, source: 'Bonus - Tech Solutions Inc', amount: 50000, date: '2026-03-31', type: 'Bonus', frequency: 'Annual', accountNumber: '**1234' },
    { id: 8, source: 'Freelance - Mobile App Dev', amount: 28000, date: '2026-04-10', type: 'Freelance', frequency: 'Irregular', accountNumber: '**5678' }
];

// ============ BUDGETS ============
export const mockBudgets = [
    { id: 1, category: 'Food & Dining', limit: 20000, spent: 15300, period: 'Monthly', type: 'Needs', status: 'On Track', alertLevel: 'Green' },
    { id: 2, category: 'Transportation', limit: 10000, spent: 9200, period: 'Monthly', type: 'Needs', status: 'Caution', alertLevel: 'Yellow' },
    { id: 3, category: 'Entertainment', limit: 8000, spent: 3800, period: 'Monthly', type: 'Wants', status: 'On Track', alertLevel: 'Green' },
    { id: 4, category: 'Shopping', limit: 15000, spent: 12400, period: 'Monthly', type: 'Wants', status: 'On Track', alertLevel: 'Green' },
    { id: 5, category: 'Utilities', limit: 8000, spent: 6500, period: 'Monthly', type: 'Needs', status: 'On Track', alertLevel: 'Green' },
    { id: 6, category: 'Healthcare', limit: 10000, spent: 6000, period: 'Monthly', type: 'Needs', status: 'On Track', alertLevel: 'Green' },
    { id: 7, category: 'Travel', limit: 25000, spent: 23900, period: 'Monthly', type: 'Wants', status: 'Caution', alertLevel: 'Yellow' },
    { id: 8, category: 'Education', limit: 8000, spent: 2500, period: 'Monthly', type: 'Needs', status: 'On Track', alertLevel: 'Green' },
    { id: 9, category: 'Insurance', limit: 15000, spent: 5000, period: 'Monthly', type: 'Needs', status: 'On Track', alertLevel: 'Green' }
];

// ============ BANK ACCOUNTS ============
export const mockBankAccounts = [
    {
        id: 1,
        bankName: 'HDFC Bank',
        type: 'Savings',
        accountNumber: '****1234',
        holderName: 'Reddy Nirmalakar',
        balance: 425000,
        currency: 'INR',
        ifscCode: 'HDFC0001234',
        logo: 'hdfc',
        color: ['#004C8F', '#002D54'],
        interestRate: 3.5,
        features: ['Lounge Access', 'Priority Service', 'Free Cheques'],
        lastStatementDate: '2026-05-10',
        createdDate: '2018-03-12'
    },
    {
        id: 2,
        bankName: 'ICICI Bank',
        type: 'Current',
        accountNumber: '****5678',
        holderName: 'Reddy Nirmalakar',
        balance: 185000,
        currency: 'INR',
        ifscCode: 'ICIC0005678',
        logo: 'icici',
        color: ['#F37E20', '#B95200'],
        interestRate: 0,
        features: ['Overdraft Facility', 'Free Cheque Book', 'E-statements'],
        lastStatementDate: '2026-05-12',
        createdDate: '2020-06-15'
    },
    {
        id: 3,
        bankName: 'SBI',
        type: 'Savings',
        accountNumber: '****9012',
        holderName: 'Reddy Nirmalakar',
        balance: 95000,
        currency: 'INR',
        ifscCode: 'SBIN0009012',
        logo: 'sbi',
        color: ['#1A4B7C', '#0D2840'],
        interestRate: 3.0,
        features: ['Mobile Banking', 'Debit Card'],
        lastStatementDate: '2026-05-11',
        createdDate: '2015-01-08'
    }
];

// ============ SAVINGS GOALS ============
export const mockSavingsGoals = [
    { id: 1, name: 'Emergency Fund', target: 900000, saved: 725000, deadline: '2026-12-31', priority: 'High', status: 'On Track', icon: '🚨', monthlyTarget: 35000 },
    { id: 2, name: 'New Car Purchase', target: 1500000, saved: 450000, deadline: '2027-06-30', priority: 'Medium', status: 'On Track', icon: '🚗', monthlyTarget: 25000 },
    { id: 3, name: 'House Down Payment', target: 5000000, saved: 1850000, deadline: '2028-12-31', priority: 'High', status: 'On Track', icon: '🏠', monthlyTarget: 75000 },
    { id: 4, name: 'European Vacation', target: 400000, saved: 185000, deadline: '2026-08-31', priority: 'Low', status: 'On Track', icon: '✈️', monthlyTarget: 17500 },
    { id: 5, name: 'Kids Education Fund', target: 3000000, saved: 1250000, deadline: '2030-06-30', priority: 'High', status: 'On Track', icon: '📚', monthlyTarget: 20000 }
];

// ============ BILLS & RECURRING ============
export const mockBills = [
    { id: 1, name: 'Electricity Bill', amount: 2500, dueDate: '2026-05-28', paid: false, category: 'Utilities' },
    { id: 2, name: 'Internet Bill', amount: 1200, dueDate: '2026-05-30', paid: false, category: 'Utilities' },
    { id: 3, name: 'Water Bill', amount: 650, dueDate: '2026-05-25', paid: true, category: 'Utilities' },
    { id: 4, name: 'Credit Card Payment', amount: 45000, dueDate: '2026-06-05', paid: false, category: 'Finance' },
    { id: 5, name: 'House Rent EMI', amount: 42500, dueDate: '2026-05-01', paid: true, category: 'Housing' }
];

export const mockBillReminders = mockBills;

// 1. Family Hub
export const mockFamilyMembers = [
    { id: '1', name: 'Reddy (Me)', role: 'Admin', color: '#3B82F6' },
    { id: '2', name: 'Priya', role: 'Partner', color: '#EC4899' },
    { id: '3', name: 'Aarav', role: 'Child', color: '#10B981', allowance: 500 },
    { id: '4', name: 'Dad', role: 'Parent', color: '#F59E0B' }
];

export const mockFamilyExpenses = [
    { id: 101, title: 'Weekly Groceries', amount: 4500, paidBy: '1', splitBetween: ['1', '2', '3', '4'], date: '2025-12-28' },
    { id: 102, title: 'School Fees', amount: 12000, paidBy: '1', splitBetween: ['1', '2'], date: '2025-12-25' },
    { id: 103, title: 'Dinner Out', amount: 3200, paidBy: '2', splitBetween: ['1', '2', '3', '4'], date: '2025-12-24' },
    { id: 104, title: 'Utility Bill', amount: 2100, paidBy: '4', splitBetween: ['1', '2', '4'], date: '2025-12-20' }
];

// 2. Property Hub
export const mockProperties = [
    {
        id: 1,
        name: 'Sunnyvale Apartment',
        type: 'Apartment',
        location: 'Hinjewadi, Pune',
        purchasePrice: 6500000,
        currentValue: 8500000,
        purchaseDate: '2020-03-15'
    },
    {
        id: 2,
        name: 'Commercial Shop',
        type: 'Commercial',
        location: 'Andheri West, Mumbai',
        purchasePrice: 9500000,
        currentValue: 12000000,
        purchaseDate: '2018-11-20'
    }
];

// 3. Career Hub
export const mockCareerGoals = [
    { id: 1, title: 'Senior Architect Promotion', targetDate: '2026-06-30', completed: false, milestones: ['Complete AWS Cert', 'Lead 2 Projects'] },
    { id: 2, title: 'Complete MBA', targetDate: '2027-12-31', completed: false, milestones: ['GMAT', 'Applications'] },
    { id: 3, title: 'Learn Advanced React Native', targetDate: '2025-12-31', completed: true, milestones: [] }
];

export const mockRoiHistory = [
    { id: 1, skill: 'Cloud Architecture', cost: 25000, increase: 5000, recovery: 5.0, date: '2025-10-15' },
    { id: 2, skill: 'System Design', cost: 15000, increase: 3000, recovery: 5.0, date: '2025-08-20' }
];

// 4. Education Hub
export const mockCourses = [
    { id: 1, title: 'Advanced Financial Modeling', provider: 'Udemy', progress: 45, totalModules: 12, completedModules: 5, lastAccessed: '2025-12-28' },
    { id: 2, title: 'System Design Interview Prep', provider: 'AlgoExpert', progress: 80, totalModules: 50, completedModules: 40, lastAccessed: '2025-12-27' },
    { id: 3, title: 'React Native Animations', provider: 'YouTube', progress: 15, totalModules: 20, completedModules: 3, lastAccessed: '2025-12-20' }
];

// --- AI Insights ---
export const mockAIInsights = {
    health_score: 82,
    recommendations: [
        {
            type: 'tip',
            title: 'Reduce Transportation Spending',
            description: 'You\'ve exceeded your transportation budget by ₹1,200 this month. Consider carpooling or using public transport.',
            impact: '₹1,500/month'
        },
        {
            type: 'opportunity',
            title: 'Increase Emergency Fund',
            description: 'Your emergency fund is 65% complete. Try to allocate ₹5,000 more per month to reach your goal faster.',
            impact: '₹60,000/year'
        }
    ]
};

// --- Other ---
export const mockInvestments = [
    { id: 1, name: 'SBI Bluechip Fund', type: 'Mutual Fund', invested: 250000, current_value: 285000, returns: 14, risk: 'Medium' },
    { id: 2, name: 'HDFC Index Fund', type: 'Mutual Fund', invested: 150000, current_value: 168000, returns: 12, risk: 'Low' },
    { id: 3, name: 'Reliance Industries', type: 'Equity', invested: 100000, current_value: 125000, returns: 25, risk: 'High' }
];

export const mockRecurringPayments = [
    { id: 1, name: 'Netflix', amount: 649, frequency: 'Monthly', next_date: '2026-01-21' },
    { id: 2, name: 'Spotify', amount: 119, frequency: 'Monthly', next_date: '2026-01-15' }
];

export const mockIds = {
    user: 'u_12345',
    family: 'f_99887'
};

// ============ LOANS (mock) ============
export const mockLoans = [
    { id: 1, name: 'Home Loan - SBI', principal: 4500000, outstanding: 3800000, rate: 8.5, emi: 42000, tenure: 240, paid: 36, is_lending: false, lender: 'SBI', type: 'Home', dueDate: '2026-06-01' },
    { id: 2, name: 'Car Loan - ICICI', principal: 800000, outstanding: 420000, rate: 9.5, emi: 18000, tenure: 60, paid: 28, is_lending: false, lender: 'ICICI', type: 'Car', dueDate: '2026-06-05' },
    { id: 3, name: 'Personal Loan - HDFC', principal: 300000, outstanding: 180000, rate: 13.5, emi: 10500, tenure: 36, paid: 15, is_lending: false, lender: 'HDFC', type: 'Personal', dueDate: '2026-06-10' },
    { id: 4, name: 'Lent to Rohit', principal: 50000, outstanding: 35000, rate: 0, emi: 0, tenure: 0, paid: 0, is_lending: true, lender: 'Self', type: 'Personal', dueDate: '2026-07-01' },
];

// ============ ASSETS ============
export const mockAssets = [
    { id: 1, name: 'MacBook Pro 16"', category: 'Electronics', purchasePrice: 225000, currentValue: 180000, purchaseDate: '2023-01-15', warranty: '2025-01-15' },
    { id: 2, name: 'Honda City 2022', category: 'Vehicle', purchasePrice: 1200000, currentValue: 950000, purchaseDate: '2022-06-20', warranty: '2027-06-20' },
    { id: 3, name: 'Gold Jewellery', category: 'Jewellery', purchasePrice: 350000, currentValue: 410000, purchaseDate: '2020-11-12', warranty: null },
    { id: 4, name: 'Sony Bravia 55"', category: 'Electronics', purchasePrice: 85000, currentValue: 55000, purchaseDate: '2021-10-05', warranty: '2024-10-05' },
];

// ============ TAX REMINDERS ============
export const mockTaxReminders = [
    { id: 1, title: 'Advance Tax Q1', dueDate: '2026-06-15', amount: 25000, status: 'Pending' },
    { id: 2, title: 'ITR Filing Deadline', dueDate: '2026-07-31', amount: null, status: 'Pending' },
    { id: 3, title: 'TDS on Rent', dueDate: '2026-06-30', amount: 5000, status: 'Pending' },
];
