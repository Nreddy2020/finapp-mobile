// Canonical registry for financial categories across the application

export const INCOME_CATEGORIES = [
    { id: 'salary', label: 'Salary', group: 'income' },
    { id: 'business_income', label: 'Business Income', group: 'income' },
    { id: 'rental_income', label: 'Rental Income', group: 'income' },
    { id: 'interest', label: 'Interest', group: 'income' },
    { id: 'refund', label: 'Refund', group: 'income' },
    { id: 'p2p_repayment', label: 'P2P Repayment', group: 'income' },
    { id: 'other_income', label: 'Other Income', group: 'income' },
];

export const EXPENSE_CATEGORIES = [
    { id: 'food', label: 'Food', group: 'expense' },
    { id: 'groceries', label: 'Groceries', group: 'expense' },
    { id: 'housing', label: 'Housing', group: 'expense' },
    { id: 'utilities', label: 'Utilities', group: 'expense' },
    { id: 'transport', label: 'Transport', group: 'expense' },
    { id: 'healthcare', label: 'Healthcare', group: 'expense' },
    { id: 'education', label: 'Education', group: 'expense' },
    { id: 'insurance', label: 'Insurance', group: 'expense' },
    { id: 'loan_emi', label: 'Loan / EMI', group: 'expense' },
    { id: 'shopping', label: 'Shopping', group: 'expense' },
    { id: 'entertainment', label: 'Entertainment', group: 'expense' },
    { id: 'subscription', label: 'Subscription', group: 'expense' },
    { id: 'maintenance', label: 'Maintenance', group: 'expense' },
    { id: 'other_expense', label: 'Other Expense', group: 'expense' },
];

export const TRANSFER_CATEGORIES = [
    { id: 'internal_transfer', label: 'Internal Transfer', group: 'transfer' }
];

export const ALL_CATEGORIES = [
    ...INCOME_CATEGORIES,
    ...EXPENSE_CATEGORIES,
    ...TRANSFER_CATEGORIES
];

// Compatibility mapping for legacy category names to canonical IDs
export const CATEGORY_COMPATIBILITY_MAP = {
    'Food & Dining': 'food',
    'Transportation': 'transport',
    'Shopping': 'shopping',
    'Entertainment': 'entertainment',
    'Bills & Utilities': 'utilities',
    'Medical': 'healthcare',
    'Education': 'education',
    'Personal Care': 'other_expense',
    'Travel': 'transport',
    'Gifts & Donations': 'other_expense',
    'Investments': 'internal_transfer', 
    'Others': 'other_expense',
    'Salary': 'salary',
    'Business': 'business_income',
    'Rental': 'rental_income',
    'Interest': 'interest'
};

// Helper function to get category by ID, handling legacy fallbacks
export const getCategoryById = (idOrLabel) => {
    // Check if it's already a valid ID
    let category = ALL_CATEGORIES.find(c => c.id === idOrLabel);
    if (category) return category;

    // Check compatibility map
    const canonicalId = CATEGORY_COMPATIBILITY_MAP[idOrLabel];
    if (canonicalId) {
        category = ALL_CATEGORIES.find(c => c.id === canonicalId);
        if (category) return category;
    }

    // Try finding by label exactly
    category = ALL_CATEGORIES.find(c => c.label.toLowerCase() === (idOrLabel || '').toLowerCase());
    if (category) return category;

    // If nothing matches, return a default unknown
    return { id: 'unknown', label: idOrLabel || 'Unknown', group: 'unknown' };
};
