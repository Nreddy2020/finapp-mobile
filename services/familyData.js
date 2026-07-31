// Phase 3: Family & Community Support - Mock Data

export const mockFamilyContributions = {
    total_monthly: 45000,
    members: [
        {
            id: 1,
            name: "Father",
            contribution: 20000,
            percentage: 44,
            dependents: ["Grandfather", "Grandmother"],
            expenses_paid: [
                { category: "Groceries", amount: 8000 },
                { category: "Utilities", amount: 3000 },
                { category: "Medicine", amount: 2000 }
            ]
        },
        {
            id: 2,
            name: "Son",
            contribution: 15000,
            percentage: 33,
            dependents: [],
            expenses_paid: [
                { category: "Education", amount: 5000 },
                { category: "Transport", amount: 3000 }
            ]
        },
        {
            id: 3,
            name: "Daughter",
            contribution: 10000,
            percentage: 23,
            dependents: [],
            expenses_paid: [
                { category: "Healthcare", amount: 4000 },
                { category: "Entertainment", amount: 2000 }
            ]
        }
    ],
    shared_expenses: {
        groceries: 8000,
        utilities: 3000,
        medicine: 4000,
        education: 5000,
        transport: 3000
    }
};

export const mockRemittances = [
    {
        id: 1,
        sender: "Abdul",
        receiver: "Wife",
        amount: 15000,
        sent_date: "2025-12-01",
        received_date: "2025-12-01",
        purpose: "Monthly household",
        status: "received",
        family_spent: 12000,
        remaining: 3000,
        expenses: [
            { category: "Groceries", amount: 5000 },
            { category: "School fees", amount: 4000 },
            { category: "Medicine", amount: 2000 },
            { category: "Utilities", amount: 1000 }
        ]
    },
    {
        id: 2,
        sender: "Abdul",
        receiver: "Wife",
        amount: 15000,
        sent_date: "2025-11-01",
        received_date: "2025-11-01",
        purpose: "Monthly household",
        status: "received",
        family_spent: 14500,
        remaining: 500
    }
];

export const mockFlexibleGoals = [
    {
        id: 1,
        name: "Daughter's Wedding",
        target_amount: 50000,
        current_amount: 11500,
        deadline: "2027-12-01",
        flexible: true,
        min_monthly: 0,
        suggested_monthly: 2000,
        savings_history: [
            { month: "2025-12", amount: 500, note: "Good month" },
            { month: "2025-11", amount: 0, note: "Medical emergency" },
            { month: "2025-10", amount: 800, note: "Festival bonus" },
            { month: "2025-09", amount: 600, note: "Regular" },
            { month: "2025-08", amount: 200, note: "Rainy season" }
        ],
        milestones: [
            { amount: 10000, reached: true, date: "2025-09-15" },
            { amount: 25000, reached: false },
            { amount: 50000, reached: false }
        ]
    },
    {
        id: 2,
        name: "Son's Education",
        target_amount: 100000,
        current_amount: 35000,
        deadline: "2026-06-01",
        flexible: true,
        min_monthly: 0,
        suggested_monthly: 5000
    }
];

export const mockChitFund = {
    group_id: 1,
    name: "Women's Self-Help Group",
    members_count: 10,
    monthly_contribution: 500,
    total_pool: 5000,
    current_month: "December 2025",
    recipient_this_month: "Sunita",
    next_recipient: "Meena",
    members: [
        { id: 1, name: "Sunita", paid: true, date: "2025-12-01", amount: 500 },
        { id: 2, name: "Meena", paid: true, date: "2025-12-03", amount: 500 },
        { id: 3, name: "Lakshmi", paid: true, date: "2025-12-05", amount: 500 },
        { id: 4, name: "Radha", paid: true, date: "2025-12-07", amount: 500 },
        { id: 5, name: "Priya", paid: true, date: "2025-12-08", amount: 500 },
        { id: 6, name: "Kavita", paid: true, date: "2025-12-10", amount: 500 },
        { id: 7, name: "Anita", paid: true, date: "2025-12-12", amount: 500 },
        { id: 8, name: "Geeta", paid: false, due_date: "2025-12-15", amount: 500 },
        { id: 9, name: "Neeta", paid: false, due_date: "2025-12-15", amount: 500 },
        { id: 10, name: "Seeta", paid: false, due_date: "2025-12-15", amount: 500 }
    ],
    rotation_schedule: [
        { month: "Jan 2025", recipient: "Lakshmi", completed: true },
        { month: "Feb 2025", recipient: "Radha", completed: true },
        { month: "Mar 2025", recipient: "Priya", completed: true },
        { month: "Dec 2025", recipient: "Sunita", completed: false },
        { month: "Jan 2026", recipient: "Meena", completed: false }
    ]
};

export const getFamilyContributions = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockFamilyContributions), 300);
    });
};

export const getRemittances = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockRemittances), 300);
    });
};

export const getFlexibleGoals = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockFlexibleGoals), 300);
    });
};

export const getChitFund = async () => {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockChitFund), 300);
    });
};
