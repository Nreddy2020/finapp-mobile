/**
 * services/cashbook/cashbookPresentation.js
 * 
 * Pure presentation logic, metadata resolvers, and visual helpers
 * for FinLife Universal Cashbook (V3).
 * 
 * Free of JSX so it can be 100% unit-tested and shared across platforms.
 */

import { CashbookType, TransactionType } from './cashbookContracts.js';

// Predefined template catalog for rapid book creation
export const CASHBOOK_TEMPLATES = Object.freeze([
    {
        type: CashbookType.SAVINGS,
        name: 'Personal',
        description: 'Salary, household & personal expenses',
        iconName: 'Personal',
        iconColor: '#3B82F6',
        bgColor: '#EFF6FF',
        defaultOpeningPaise: '0'
    },
    {
        type: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS,
        name: 'Business',
        description: 'Business income & expenses',
        iconName: 'Business',
        iconColor: '#F97316',
        bgColor: '#FFF7ED',
        defaultOpeningPaise: '0'
    },
    {
        type: CashbookType.LOANS_TAKEN,
        name: 'Loans',
        description: 'Loans given & taken',
        iconName: 'Loans',
        iconColor: '#EAB308',
        bgColor: '#FEFCE8',
        defaultOpeningPaise: '0'
    },
    {
        type: CashbookType.INVESTMENTS,
        name: 'Investments',
        description: 'Mutual funds, stocks, & other investments',
        iconName: 'Investments',
        iconColor: '#10B981',
        bgColor: '#ECFDF5',
        defaultOpeningPaise: '0'
    },
    {
        type: CashbookType.PF,
        name: 'PF / Retirement',
        description: 'Provident fund & retirement savings',
        iconName: 'PF',
        iconColor: '#8B5CF6',
        bgColor: '#F5F3FF',
        defaultOpeningPaise: '0'
    },
    {
        type: CashbookType.CUSTOM,
        name: 'Custom – Home Project',
        description: 'Dedicated fund for home construction',
        iconName: 'Custom',
        iconColor: '#F43F5E',
        bgColor: '#FFF1F2',
        defaultOpeningPaise: '0'
    }
]);

/**
 * Resolves visual metadata (theme colors, icon names, titles, subtitles) for any book.
 */
export function getBookVisualMeta(book) {
    const type = book?.type;
    const name = (book?.name || '').toLowerCase();

    if (type === CashbookType.SAVINGS || name.includes('personal') || name.includes('savings')) {
        return {
            title: book?.name || 'Personal',
            subtitle: book?.description || 'Salary, household & personal expenses',
            iconColor: '#3B82F6',
            bgColor: '#EFF6FF',
            iconKey: 'Personal'
        };
    }
    if (type === CashbookType.BUSINESS_CASH_AND_OBLIGATIONS || name.includes('business')) {
        return {
            title: book?.name || 'Business',
            subtitle: book?.description || 'Business income & expenses',
            iconColor: '#F97316',
            bgColor: '#FFF7ED',
            iconKey: 'Business'
        };
    }
    if (type === CashbookType.LOANS_TAKEN || type === CashbookType.LOANS_GIVEN || name.includes('loan')) {
        return {
            title: book?.name || 'Loans',
            subtitle: book?.description || 'Loans given & taken',
            iconColor: '#EAB308',
            bgColor: '#FEFCE8',
            iconKey: 'Loans'
        };
    }
    if (type === CashbookType.INVESTMENTS || name.includes('invest')) {
        return {
            title: book?.name || 'Investments',
            subtitle: book?.description || 'Mutual funds, stocks, & other investments',
            iconColor: '#10B981',
            bgColor: '#ECFDF5',
            iconKey: 'Investments'
        };
    }
    if (type === CashbookType.PF || name.includes('pf') || name.includes('retirement') || name.includes('epfo')) {
        return {
            title: book?.name || 'PF / Retirement',
            subtitle: book?.description || 'Provident fund & retirement savings',
            iconColor: '#8B5CF6',
            bgColor: '#F5F3FF',
            iconKey: 'PF'
        };
    }
    // Default Custom
    return {
        title: book?.name || 'Custom Book',
        subtitle: book?.description || 'Dedicated purpose fund',
        iconColor: '#F43F5E',
        bgColor: '#FFF1F2',
        iconKey: 'Custom'
    };
}

/**
 * Formats date strings to clean Indian/English display headers ("Tue, Jan 28, 2025").
 */
export function formatDateHeader(dateStr) {
    if (!dateStr) return 'Recent Transactions';
    if (dateStr === 'Today' || dateStr === 'Yesterday') return dateStr;

    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-US', {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }
        }
    } catch (e) {
        // Fallback to raw string
    }
    return dateStr;
}

/**
 * Resolves visual metadata (theme colors, background, icon key) for any transaction.
 */
export function getTransactionIconMeta(item) {
    const raw = item.rawTxn || item;
    const type = raw.transactionType;
    const cat = (raw.category || '').toLowerCase();
    const desc = (raw.description || '').toLowerCase();

    if (raw.status === 'VOIDED') {
        return { iconKey: 'Ban', color: '#94A3B8', bg: '#F1F5F9' };
    }

    if (type === TransactionType.INCOME) {
        return { iconKey: 'Income', color: '#10B981', bg: '#ECFDF5' };
    }

    if (type === TransactionType.TRANSFER) {
        return { iconKey: 'Transfer', color: '#3B82F6', bg: '#EFF6FF' };
    }

    // Expense & specific categories
    if (cat.includes('housing') || cat.includes('rent') || desc.includes('rent')) {
        return { iconKey: 'Rent', color: '#EA580C', bg: '#FFF7ED' };
    }
    if (cat.includes('food') || cat.includes('grocer') || desc.includes('grocer') || desc.includes('blinkit')) {
        return { iconKey: 'Groceries', color: '#EF4444', bg: '#FEF2F2' };
    }
    if (cat.includes('health') || cat.includes('insurance') || desc.includes('insurance')) {
        return { iconKey: 'Health', color: '#EF4444', bg: '#FEF2F2' };
    }
    if (cat.includes('fuel') || cat.includes('transport') || desc.includes('fuel') || desc.includes('petrol')) {
        return { iconKey: 'Fuel', color: '#EF4444', bg: '#FEF2F2' };
    }

    return { iconKey: 'Expense', color: '#EF4444', bg: '#FEF2F2' };
}
