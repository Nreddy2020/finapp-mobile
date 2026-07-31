// Mock data for Time Management System
// Realistic tasks and user activity for testing

export const mockTasks = [
    {
        id: 1,
        title: "Apply for 5 jobs",
        description: "Apply to React Native developer positions",
        category: "financial_improvement",
        financial_impact: "very_high",
        potential_income: "₹20,000-₹50,000/month increase",
        deadline: "2026-01-05",
        time_required: "hours",
        energy_level: "medium",
        status: "pending",
        created_at: "2025-12-20T10:00:00Z"
    },
    {
        id: 2,
        title: "Learn React Native - Chapter 3",
        description: "Complete navigation and routing chapter",
        category: "skill_development",
        financial_impact: "high",
        potential_income: "50% salary increase in 6 months",
        deadline: "2026-03-01",
        time_required: "hours",
        energy_level: "high",
        status: "pending",
        created_at: "2025-12-15T10:00:00Z"
    },
    {
        id: 3,
        title: "Build portfolio project",
        description: "Create fintech app for portfolio",
        category: "skill_development",
        financial_impact: "high",
        deadline: "2026-02-15",
        time_required: "weeks",
        energy_level: "high",
        status: "pending",
        created_at: "2025-12-10T10:00:00Z"
    },
    {
        id: 4,
        title: "Start freelancing on Upwork",
        description: "Set up profile and apply for first gig",
        category: "financial_improvement",
        financial_impact: "very_high",
        potential_income: "₹10,000-₹30,000/month",
        deadline: null,
        time_required: "hours",
        energy_level: "medium",
        status: "pending",
        created_at: "2025-11-20T10:00:00Z" // 37 days ago!
    },
    {
        id: 5,
        title: "Update resume",
        description: "Add recent projects and skills",
        category: "career_advancement",
        financial_impact: "medium",
        deadline: "2026-01-03",
        time_required: "hours",
        energy_level: "low",
        status: "pending",
        created_at: "2025-12-22T10:00:00Z"
    },
    {
        id: 6,
        title: "Exercise 30 minutes",
        description: "Morning workout",
        category: "health",
        financial_impact: "low",
        deadline: null,
        time_required: "minutes",
        energy_level: "medium",
        status: "pending",
        created_at: "2025-12-27T06:00:00Z"
    },
    {
        id: 7,
        title: "Watch Netflix",
        description: "New series episode",
        category: "entertainment",
        financial_impact: "none",
        deadline: null,
        time_required: "hours",
        energy_level: "low",
        status: "pending",
        created_at: "2025-12-27T10:00:00Z"
    },
    {
        id: 8,
        title: "Learn English speaking",
        description: "Practice conversation for 30 min",
        category: "skill_development",
        financial_impact: "medium",
        deadline: null,
        time_required: "minutes",
        energy_level: "medium",
        status: "pending",
        created_at: "2025-12-01T10:00:00Z" // 26 days ago!
    },
    {
        id: 9,
        title: "Cut monthly expenses by ₹2,000",
        description: "Review and reduce unnecessary spending",
        category: "financial_improvement",
        financial_impact: "high",
        potential_income: "₹24,000/year saved",
        deadline: "2026-01-01",
        time_required: "hours",
        energy_level: "medium",
        status: "pending",
        created_at: "2025-12-18T10:00:00Z"
    },
    {
        id: 10,
        title: "Read personal finance book",
        description: "Rich Dad Poor Dad",
        category: "skill_development",
        financial_impact: "medium",
        deadline: null,
        time_required: "weeks",
        energy_level: "low",
        status: "pending",
        created_at: "2025-11-15T10:00:00Z" // 42 days ago!
    }
];

export const mockUserActivity = {
    today: "2025-12-27",
    completed_tasks: [
        { id: 101, title: "Check social media", priority_score: 5 },
        { id: 102, title: "Watch YouTube", priority_score: 10 },
        { id: 103, title: "Reply to messages", priority_score: 20 }
    ],
    time_spent: {
        work: 1,              // 1 hour on productive work
        learning: 0.5,        // 30 minutes learning
        side_project: 0,      // 0 hours on side projects
        entertainment: 3,     // 3 hours on entertainment!
        breaks: 1,
        sleep: 7
    },
    productivity_score: 25  // Very low!
};

export const mockLifeGoals = {
    financial: [
        {
            id: 1,
            goal: "Save ₹1,00,000 for emergency fund",
            category: "savings",
            target_amount: 100000,
            current_amount: 25000,
            deadline: "2026-12-31",
            created_at: "2025-06-01",
            monthly_target: 6250,
            progress: 25,
            on_track: true,
            tasks: [
                "Cut expenses by ₹2,000/month",
                "Start freelancing for ₹4,000/month",
                "Save festival bonuses"
            ]
        },
        {
            id: 2,
            goal: "Increase income by 50%",
            category: "income",
            current_income: 25000,
            target_income: 37500,
            deadline: "2026-06-30",
            created_at: "2025-09-01",
            progress: 10,
            on_track: false,
            tasks: [
                "Learn React Native (3 months)",
                "Build portfolio (1 month)",
                "Apply for jobs (ongoing)",
                "Negotiate salary"
            ]
        }
    ],
    learning: [
        {
            id: 3,
            goal: "Learn React Native",
            category: "skill_development",
            progress: 30,
            deadline: "2026-03-01",
            created_at: "2025-11-01",
            daily_time: "2 hours",
            on_track: true,
            tasks: [
                "Complete online course (40 hours)",
                "Build 3 projects",
                "Contribute to open source"
            ]
        },
        {
            id: 4,
            goal: "Improve English speaking",
            category: "skill_development",
            progress: 15,
            deadline: "2026-06-01",
            created_at: "2025-10-01",
            daily_time: "30 minutes",
            on_track: false,
            tasks: [
                "Practice daily conversation",
                "Watch English movies",
                "Join speaking club"
            ]
        }
    ],
    career: [
        {
            id: 5,
            goal: "Get promoted to Senior Developer",
            category: "career_advancement",
            current_level: "Junior Developer",
            target_level: "Senior Developer",
            deadline: "2026-12-31",
            created_at: "2025-07-01",
            progress: 20,
            on_track: true,
            tasks: [
                "Lead 2 projects",
                "Mentor junior developers",
                "Get AWS certification",
                "Improve code quality"
            ]
        }
    ],
    health: [
        {
            id: 6,
            goal: "Exercise 5 days/week",
            category: "health",
            current_frequency: 1,
            target_frequency: 5,
            deadline: null,
            created_at: "2025-12-01",
            progress: 20,
            on_track: false,
            tasks: [
                "Morning workout 30 min",
                "Join gym",
                "Track progress"
            ]
        }
    ]
};

export async function getMockTasks() {
    // Simulate API delay
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockTasks), 500);
    });
}

export async function getMockUserActivity() {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockUserActivity), 300);
    });
}

export async function getMockLifeGoals() {
    return new Promise((resolve) => {
        setTimeout(() => resolve(mockLifeGoals), 400);
    });
}
