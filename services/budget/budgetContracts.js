/**
 * FinLife Smart Budgets & Financial Control Center — Domain Contracts
 * Pure contract specifications, period resolution, and calculation policies.
 */

export const DATA_QUALITY_STATUS = Object.freeze({
    COMPLETE: 'COMPLETE',
    PARTIAL: 'PARTIAL',
    STALE: 'STALE',
    CONFLICTED: 'CONFLICTED'
});

export const CONFIDENCE_LEVEL = Object.freeze({
    HIGH: 'HIGH',
    MEDIUM: 'MEDIUM',
    LOW: 'LOW'
});

export const RISK_LEVEL = Object.freeze({
    SAFE: 'SAFE',
    WATCH: 'WATCH',
    AT_RISK: 'AT_RISK'
});

export const VIABILITY_STATUS = Object.freeze({
    COMFORTABLE: 'COMFORTABLE',
    PRESSURE: 'PRESSURE',
    NOT_COMFORTABLE: 'NOT_COMFORTABLE'
});

export const DEBT_STRATEGY = Object.freeze({
    AVALANCHE: 'AVALANCHE',
    SNOWBALL: 'SNOWBALL',
    CUSTOM: 'CUSTOM'
});

export const DEFAULT_DEBT_POLICY = Object.freeze({
    debtStrategy: DEBT_STRATEGY.AVALANCHE,
    extraDebtPayment: null,
    minimumReserve: 0,
    discretionaryFloor: 0
});

export const ALLOCATION_STRATEGY_TYPE = Object.freeze({
    PERCENTAGE: 'PERCENTAGE',
    ZERO_BASED: 'ZERO_BASED',
    DEBT_PRIORITY: 'DEBT_PRIORITY',
    CUSTOM: 'CUSTOM'
});

export const ALLOCATION_STRATEGIES = Object.freeze({
    '50/30/20': {
        id: '50/30/20',
        name: '50/30/20 Standard Rule',
        type: ALLOCATION_STRATEGY_TYPE.PERCENTAGE,
        targets: { Needs: 50, Wants: 30, Future: 20 },
        description: '50% Essentials, 30% Discretionary, 20% Financial Future'
    },
    '60/20/20': {
        id: '60/20/20',
        name: '60/20/20 Essentials-First',
        type: ALLOCATION_STRATEGY_TYPE.PERCENTAGE,
        targets: { Needs: 60, Wants: 20, Future: 20 },
        description: '60% Essentials, 20% Discretionary, 20% Financial Future'
    },
    'ZERO_BASED': {
        id: 'ZERO_BASED',
        name: 'Zero-Based Allocation',
        type: ALLOCATION_STRATEGY_TYPE.ZERO_BASED,
        description: 'Every single rupee is purposefully allocated until remaining is ₹0'
    },
    'DEBT_FIRST': {
        id: 'DEBT_FIRST',
        name: 'Debt-Priority Acceleration',
        type: ALLOCATION_STRATEGY_TYPE.DEBT_PRIORITY,
        description: 'Essentials covered first, debt minimums paid, excess cash directed to debt payoff'
    }
});

export const DEFAULT_BUDGET_CALCULATION_POLICY = Object.freeze({
    version: '1.0.0',
    transactionRecognition: 'POSTED', // 'POSTED' | 'AUTHORIZED'
    includePendingTransactions: false,
    includeScheduledCommitments: true,
    includeTransfers: false,
    includeRefunds: true,
    allocationBasis: 'NET_INCOME', // 'NET_INCOME' | 'GROSS_INCOME'
    forecastMethod: 'RUN_RATE' // 'RUN_RATE' | 'HISTORICAL_WEIGHTED'
});

export const RECOMMENDATION_POLICY = Object.freeze({
    neverRecommendReducingEssentialExpenses: true,
    neverRecommendSkippingMandatoryPayments: true,
    neverRecommendMissingDebtMinimums: true,
    requireUserApprovalForBudgetChanges: true,
    requireExplanation: true
});

/**
 * Standard classification mapping from category names to Needs, Wants, Future
 */
export const CATEGORY_TYPE_MAPPING = Object.freeze({
    'Food & Dining': 'Needs',
    'Groceries': 'Needs',
    'Housing': 'Needs',
    'Rent': 'Needs',
    'Transportation': 'Needs',
    'Utilities': 'Needs',
    'Healthcare': 'Needs',
    'Education': 'Needs',
    'Insurance': 'Needs',
    'Loan Payment': 'Needs',
    'Bills & Utilities': 'Needs',
    
    'Shopping': 'Wants',
    'Entertainment': 'Wants',
    'Travel': 'Wants',
    'Dining Out': 'Wants',
    'Personal Care': 'Wants',
    'Gifts': 'Wants',
    'Electronics': 'Wants',
    'Subscriptions': 'Wants',
    
    'Savings': 'Future',
    'Emergency Fund': 'Future',
    'Investments': 'Future',
    'SIP': 'Future',
    'Stocks': 'Future',
    'Retirement': 'Future',
    'Debt Prepayment': 'Future'
});

/**
 * Resolves a unified budget period contract for a given month or timestamp.
 * Prevents drift across UI components and accounts for leap years, February, and timezone.
 * 
 * @param {Object} params
 * @param {string|Date} [params.selectedMonth] Format 'YYYY-MM' or Date object
 * @param {string} [params.timezone] Default 'Asia/Kolkata'
 * @param {Date} [params.now] Reference date (default current Date)
 * @returns {Object} BudgetPeriod
 */
export function resolveBudgetPeriod({ selectedMonth, timezone = 'Asia/Kolkata', now = new Date() } = {}) {
    const reference = now instanceof Date && !isNaN(now.getTime()) ? now : new Date();
    
    let year = reference.getFullYear();
    let month = reference.getMonth(); // 0-indexed

    if (typeof selectedMonth === 'string' && selectedMonth.includes('-')) {
        const parts = selectedMonth.split('-');
        const parsedYear = parseInt(parts[0], 10);
        const parsedMonth = parseInt(parts[1], 10) - 1;
        if (!isNaN(parsedYear) && !isNaN(parsedMonth) && parsedMonth >= 0 && parsedMonth <= 11) {
            year = parsedYear;
            month = parsedMonth;
        }
    } else if (selectedMonth instanceof Date && !isNaN(selectedMonth.getTime())) {
        year = selectedMonth.getFullYear();
        month = selectedMonth.getMonth();
    }

    // Determine days in this specific month (handling leap years for February)
    const daysInPeriod = new Date(year, month + 1, 0).getDate();

    const startDate = new Date(year, month, 1, 0, 0, 0, 0);
    const endDate = new Date(year, month, daysInPeriod, 23, 59, 59, 999);

    const periodId = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Status: ACTIVE if now is within the month, HISTORICAL if past, FUTURE if ahead
    let status = 'ACTIVE';
    const refYear = reference.getFullYear();
    const refMonth = reference.getMonth();
    const refDate = reference.getDate();

    if (year < refYear || (year === refYear && month < refMonth)) {
        status = 'HISTORICAL';
    } else if (year > refYear || (year === refYear && month > refMonth)) {
        status = 'FUTURE';
    }

    let daysElapsed = 0;
    let daysRemaining = 0;

    if (status === 'HISTORICAL') {
        daysElapsed = daysInPeriod;
        daysRemaining = 0;
    } else if (status === 'FUTURE') {
        daysElapsed = 0;
        daysRemaining = daysInPeriod;
    } else {
        // Active month
        daysElapsed = Math.min(daysInPeriod, Math.max(1, refDate));
        daysRemaining = Math.max(0, daysInPeriod - daysElapsed);
    }

    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    return {
        id: periodId,
        year,
        month: month + 1,
        monthName: monthNames[month],
        label: `${monthNames[month]} ${year}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        timezone,
        daysInPeriod,
        daysElapsed,
        daysRemaining,
        status
    };
}
