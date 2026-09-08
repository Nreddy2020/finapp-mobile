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

export const SourceAvailabilityStatus = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    EMPTY: 'EMPTY',
    PARTIAL: 'PARTIAL',
    UNAVAILABLE: 'UNAVAILABLE',
    CORRUPT: 'CORRUPT'
});

export const BudgetLifecycleStatus = Object.freeze({
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    ARCHIVED: 'ARCHIVED'
});

export const BUDGET_UTILIZATION_STATUS = Object.freeze({
    SAFE: 'SAFE',
    NEAR_LIMIT: 'NEAR_LIMIT',
    OVER_BUDGET: 'OVER_BUDGET',
    EMPTY: 'EMPTY',
    UNAVAILABLE: 'UNAVAILABLE'
});

export const BUDGET_UTILIZATION_THRESHOLDS = Object.freeze({
    SAFE_MAX_BPS: 7999n,
    NEAR_LIMIT_MAX_BPS: 9999n,
    OVER_BUDGET_MIN_BPS: 10000n
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

// Canonical Parent Groups
export const CANONICAL_BUDGET_GROUPS = Object.freeze({
    FOOD: 'Food',
    TRANSPORT: 'Transport',
    HOUSING: 'Housing',
    UTILITIES: 'Utilities',
    HEALTH: 'Health',
    EDUCATION: 'Education',
    ENTERTAINMENT: 'Entertainment',
    SHOPPING: 'Shopping',
    TRAVEL: 'Travel',
    INVESTMENTS: 'Investments',
    DEBT: 'Debt',
    OTHER: 'Other'
});

// Approved Category Alias Dictionary (maps lowercase trimmed alias to canonical group)
export const APPROVED_CATEGORY_ALIASES = Object.freeze({
    // Food
    'food': CANONICAL_BUDGET_GROUPS.FOOD,
    'food & dining': CANONICAL_BUDGET_GROUPS.FOOD,
    'dining': CANONICAL_BUDGET_GROUPS.FOOD,
    'dining out': CANONICAL_BUDGET_GROUPS.FOOD,
    'groceries': CANONICAL_BUDGET_GROUPS.FOOD,
    'grocery': CANONICAL_BUDGET_GROUPS.FOOD,
    'supermarket': CANONICAL_BUDGET_GROUPS.FOOD,
    'restaurant': CANONICAL_BUDGET_GROUPS.FOOD,
    'swiggy': CANONICAL_BUDGET_GROUPS.FOOD,
    'zomato': CANONICAL_BUDGET_GROUPS.FOOD,

    // Transport
    'transport': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'transportation': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'fuel': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'petrol': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'diesel': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'cab': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'uber': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'ola': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'metro': CANONICAL_BUDGET_GROUPS.TRANSPORT,
    'auto': CANONICAL_BUDGET_GROUPS.TRANSPORT,

    // Housing
    'housing': CANONICAL_BUDGET_GROUPS.HOUSING,
    'rent': CANONICAL_BUDGET_GROUPS.HOUSING,
    'maintenance': CANONICAL_BUDGET_GROUPS.HOUSING,
    'home repair': CANONICAL_BUDGET_GROUPS.HOUSING,

    // Utilities
    'utilities': CANONICAL_BUDGET_GROUPS.UTILITIES,
    'bills & utilities': CANONICAL_BUDGET_GROUPS.UTILITIES,
    'electricity': CANONICAL_BUDGET_GROUPS.UTILITIES,
    'water': CANONICAL_BUDGET_GROUPS.UTILITIES,
    'internet': CANONICAL_BUDGET_GROUPS.UTILITIES,
    'wifi': CANONICAL_BUDGET_GROUPS.UTILITIES,
    'mobile recharge': CANONICAL_BUDGET_GROUPS.UTILITIES,
    'gas': CANONICAL_BUDGET_GROUPS.UTILITIES,

    // Health
    'health': CANONICAL_BUDGET_GROUPS.HEALTH,
    'healthcare': CANONICAL_BUDGET_GROUPS.HEALTH,
    'medical': CANONICAL_BUDGET_GROUPS.HEALTH,
    'pharmacy': CANONICAL_BUDGET_GROUPS.HEALTH,
    'medicine': CANONICAL_BUDGET_GROUPS.HEALTH,
    'hospital': CANONICAL_BUDGET_GROUPS.HEALTH,
    'doctor': CANONICAL_BUDGET_GROUPS.HEALTH,

    // Education
    'education': CANONICAL_BUDGET_GROUPS.EDUCATION,
    'school': CANONICAL_BUDGET_GROUPS.EDUCATION,
    'college': CANONICAL_BUDGET_GROUPS.EDUCATION,
    'tuition': CANONICAL_BUDGET_GROUPS.EDUCATION,
    'books': CANONICAL_BUDGET_GROUPS.EDUCATION,
    'courses': CANONICAL_BUDGET_GROUPS.EDUCATION,

    // Entertainment
    'entertainment': CANONICAL_BUDGET_GROUPS.ENTERTAINMENT,
    'movies': CANONICAL_BUDGET_GROUPS.ENTERTAINMENT,
    'ott': CANONICAL_BUDGET_GROUPS.ENTERTAINMENT,
    'netflix': CANONICAL_BUDGET_GROUPS.ENTERTAINMENT,
    'games': CANONICAL_BUDGET_GROUPS.ENTERTAINMENT,

    // Shopping
    'shopping': CANONICAL_BUDGET_GROUPS.SHOPPING,
    'clothes': CANONICAL_BUDGET_GROUPS.SHOPPING,
    'apparel': CANONICAL_BUDGET_GROUPS.SHOPPING,
    'electronics': CANONICAL_BUDGET_GROUPS.SHOPPING,
    'amazon': CANONICAL_BUDGET_GROUPS.SHOPPING,
    'flipkart': CANONICAL_BUDGET_GROUPS.SHOPPING,
    'personal care': CANONICAL_BUDGET_GROUPS.SHOPPING,
    'gifts': CANONICAL_BUDGET_GROUPS.SHOPPING,

    // Travel
    'travel': CANONICAL_BUDGET_GROUPS.TRAVEL,
    'flights': CANONICAL_BUDGET_GROUPS.TRAVEL,
    'hotels': CANONICAL_BUDGET_GROUPS.TRAVEL,
    'vacation': CANONICAL_BUDGET_GROUPS.TRAVEL,

    // Debt
    'debt': CANONICAL_BUDGET_GROUPS.DEBT,
    'loan payment': CANONICAL_BUDGET_GROUPS.DEBT,
    'emi': CANONICAL_BUDGET_GROUPS.DEBT,
    'credit card payment': CANONICAL_BUDGET_GROUPS.DEBT,

    // Investments
    'investments': CANONICAL_BUDGET_GROUPS.INVESTMENTS,
    'savings': CANONICAL_BUDGET_GROUPS.INVESTMENTS,
    'sip': CANONICAL_BUDGET_GROUPS.INVESTMENTS,
    'mutual funds': CANONICAL_BUDGET_GROUPS.INVESTMENTS,
    'stocks': CANONICAL_BUDGET_GROUPS.INVESTMENTS
});

/**
 * Resolves a transaction's category to a canonical budget group using strict precedence:
 * 1. Canonical category ID match (exact match against CANONICAL_BUDGET_GROUPS values)
 * 2. Explicit transaction category ID match
 * 3. Approved alias mapping (exact match against APPROVED_CATEGORY_ALIASES keys)
 * 4. No match -> returns null (reported separately, NEVER loose substring)
 *
 * @param {string} rawCategory
 * @returns {string|null} Canonical group name or null if unmatched
 */
export function resolveCanonicalCategoryGroup(rawCategory) {
    if (!rawCategory || typeof rawCategory !== 'string') return null;
    const clean = rawCategory.trim();
    if (!clean) return null;
    const lower = clean.toLowerCase();

    // 1. Canonical category ID match
    for (const group of Object.values(CANONICAL_BUDGET_GROUPS)) {
        if (group.toLowerCase() === lower) {
            return group;
        }
    }

    // 2. Explicit category ID match & 3. Approved alias mapping
    if (APPROVED_CATEGORY_ALIASES[lower]) {
        return APPROVED_CATEGORY_ALIASES[lower];
    }

    // 4. No match
    return null;
}

// Re-export standard integer-paise utilities
export { toBigIntPaise, parsePaise, formatBigIntPaise } from '../reports/reportContracts.js';
import { toBigIntPaise } from '../reports/reportContracts.js';

/**
 * Calculates budget utilization in Basis Points (1% = 100 BPS, 100% = 10,000 BPS).
 * Pure BigInt arithmetic with 0n limit protection.
 */
export function calculateUtilizationBps(spentPaise, limitPaise) {
    const spent = toBigIntPaise(spentPaise);
    const limit = toBigIntPaise(limitPaise);
    if (limit <= 0n) return 0n;
    return (spent * 10000n) / limit;
}

/**
 * Returns the status for a given utilization in basis points.
 */
export function getUtilizationStatus(utilizationBps) {
    const bps = BigInt(utilizationBps || 0);
    if (bps >= BUDGET_UTILIZATION_THRESHOLDS.OVER_BUDGET_MIN_BPS) {
        return BUDGET_UTILIZATION_STATUS.OVER_BUDGET;
    }
    if (bps >= 8000n) {
        return BUDGET_UTILIZATION_STATUS.NEAR_LIMIT;
    }
    return BUDGET_UTILIZATION_STATUS.SAFE;
}

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

    const pad = (n) => String(n).padStart(2, '0');
    const periodId = `${year}-${pad(month + 1)}`;
    const startDateStr = `${year}-${pad(month + 1)}-01`;

    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonth = month === 11 ? 1 : month + 2;
    const endDateStr = `${nextMonthYear}-${pad(nextMonth)}-01`;

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
        periodKey: periodId,
        year,
        month: month + 1,
        monthName: monthNames[month],
        label: `${monthNames[month]} ${year}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        startDateStr,
        endDateStr,
        interval: [startDateStr, endDateStr],
        timezone,
        daysInPeriod,
        daysElapsed,
        daysRemaining,
        status
    };
}

/**
 * Checks if a transaction date string (YYYY-MM-DD or ISO) falls inside [startDate, endDate).
 * Exactly at startDate: INCLUDED.
 * Exactly at endDate: EXCLUDED.
 */
export function isDateInPeriod(dateStr, period) {
    if (!dateStr || !period) return false;
    const d = String(dateStr).split('T')[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    const start = period.startDateStr || (period.startDate?.split('T')[0]) || `${period.id}-01`;
    const end = period.endDateStr || (() => {
        const parts = (period.id || period.periodKey || '2026-09').split('-');
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const ny = m === 12 ? y + 1 : y;
        const nm = m === 12 ? 1 : m + 1;
        return `${ny}-${String(nm).padStart(2, '0')}-01`;
    })();
    return d >= start && d < end;
}
