/**
 * services/banking-credit/bankingCreditContracts.js
 * 
 * FinLife Banking & Credit Unified Module — Formal Contracts & Architectural Invariants.
 * 
 * Defines:
 * - Four child views: OVERVIEW, ACCOUNTS, LOANS, REPAYMENTS
 * - Operational states (DATA_AVAILABLE, NO_DATA, SOURCE_UNAVAILABLE, RECONCILIATION_FAILED)
 * - 12 Architectural Invariants (BC-INV-01 to BC-INV-12)
 * - Account balance inclusion criteria
 * - Repayment period boundary evaluation
 * - Canonical route-resolution contract
 */

export const BANKING_CREDIT_TABS = Object.freeze({
    OVERVIEW: 'overview',
    ACCOUNTS: 'accounts',
    LOANS: 'loans',
    REPAYMENTS: 'repayments'
});

export const BANKING_CREDIT_STATE = Object.freeze({
    DATA_AVAILABLE: 'DATA_AVAILABLE',
    NO_DATA: 'NO_DATA',
    SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
    RECONCILIATION_FAILED: 'RECONCILIATION_FAILED'
});

export const BC_INVARIANTS = Object.freeze({
    BC_INV_01: {
        id: 'BC-INV-01',
        name: 'Net Position Formula',
        description: 'Net Position strictly equals Bank Balance minus Current Outstanding Principal (never original principal).'
    },
    BC_INV_02: {
        id: 'BC-INV-02',
        name: 'Overview Zero Mutation Guarantee',
        description: 'Overview aggregation performs zero writes, updates, or deletes across Banking, Loans, or Cashbook.'
    },
    BC_INV_03: {
        id: 'BC-INV-03',
        name: 'Authoritative Repayment Source',
        description: 'Repayments derive exclusively from authoritative loan contracts and schedules.'
    },
    BC_INV_04: {
        id: 'BC-INV-04',
        name: 'Single Loan Ledger',
        description: 'No duplicate loan balance or secondary EMI ledger exists; EMI Tracker is a pure projection.'
    },
    BC_INV_05: {
        id: 'BC-INV-05',
        name: 'Legacy Route Resolution',
        description: 'Legacy routes (/loans, /emis, /self?tab=banking) resolve deterministically to child tabs without redirect loops.'
    },
    BC_INV_06: {
        id: 'BC-INV-06',
        name: 'Card Navigation Context Preservation',
        description: 'Tapping an overview metric card transitions to the respective child view and filter context.'
    },
    BC_INV_07: {
        id: 'BC-INV-07',
        name: 'Multi-Account Balance Sanitation',
        description: 'Total bank balance includes only active, supported-currency deposit accounts (excludes credit-card liabilities and closed accounts).'
    },
    BC_INV_08: {
        id: 'BC-INV-08',
        name: 'Repayment Period Mutual Consistency',
        description: 'Upcoming and overdue repayment totals are mutually exclusive and consistent with installment statuses.'
    },
    BC_INV_09: {
        id: 'BC-INV-09',
        name: 'Integer Paise Arithmetic',
        description: 'All monetary calculations use 64-bit BigInt paise with zero IEEE 754 float drift.'
    },
    BC_INV_10: {
        id: 'BC-INV-10',
        name: 'Unavailable State Integrity',
        description: 'Unavailable source data returns explicit SOURCE_UNAVAILABLE state, never masquerading as valid zero balances.'
    },
    BC_INV_11: {
        id: 'BC-INV-11',
        name: 'Refresh Zero Mutation',
        description: 'Rendering, refreshing, or switching tabs emits zero domain mutations.'
    },
    BC_INV_12: {
        id: 'BC-INV-12',
        name: 'Two-Tier Back Navigation',
        description: 'Back navigation from child tabs returns to Overview; back navigation from Overview returns to Personal CFO Home.'
    }
});

/**
 * BigInt paise conversion helper
 */
export function toBigIntPaise(value) {
    if (value === null || value === undefined) return 0n;
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) return 0n;
        return BigInt(Math.round(value));
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return 0n;
        if (/^-?\d+$/.test(trimmed)) return BigInt(trimmed);
        const floatVal = parseFloat(trimmed);
        if (isNaN(floatVal)) return 0n;
        return BigInt(Math.round(floatVal * 100));
    }
    if (typeof value === 'object') {
        if (value.paise !== undefined) return toBigIntPaise(value.paise);
        if (value.amountPaise !== undefined) return toBigIntPaise(value.amountPaise);
        if (value.amount !== undefined) return toBigIntPaise(value.amount);
    }
    return 0n;
}

/**
 * Indian Rupee currency formatting with exact paise precision
 */
export function formatPaiseToINR(paise, { includeSymbol = true, compact = false } = {}) {
    const p = typeof paise === 'bigint' ? paise : toBigIntPaise(paise);
    const sign = p < 0n ? '-' : '';
    const absPaise = p < 0n ? -p : p;
    const rupees = Number(absPaise / 100n);
    const paiseRemainder = Number(absPaise % 100n);

    const prefix = includeSymbol ? '₹' : '';

    if (compact) {
        if (rupees >= 10000000) {
            return `${sign}${prefix}${(rupees / 10000000).toFixed(2)}Cr`;
        }
        if (rupees >= 100000) {
            return `${sign}${prefix}${(rupees / 100000).toFixed(2)}L`;
        }
        if (rupees >= 1000) {
            return `${sign}${prefix}${(rupees / 1000).toFixed(1)}k`;
        }
    }

    const rupeeStr = rupees.toLocaleString('en-IN');
    if (paiseRemainder === 0) {
        return `${sign}${prefix}${rupeeStr}`;
    }
    return `${sign}${prefix}${rupeeStr}.${String(paiseRemainder).padStart(2, '0')}`;
}

/**
 * Canonical route resolver for backward compatibility
 * Resolves legacy route paths and query params to the canonical Banking & Credit child tab.
 * 
 * @param {string} pathname e.g. '/loans', '/emis', '/self', '/banking-credit'
 * @param {Object} query e.g. { tab: 'banking' }
 * @returns {Object} { route: '/(tabs)/banking-credit', targetTab: 'overview' | 'accounts' | 'loans' | 'repayments', isRedirect: boolean }
 */
export function resolveBankingCreditRoute(pathname = '', query = {}) {
    const cleanPath = (pathname || '').trim().replace(/^\/\(tabs\)/, '');
    const tabParam = (query?.tab || '').toLowerCase();

    // Direct Banking & Credit tab request
    if (cleanPath === '/banking-credit' || cleanPath === 'banking-credit') {
        let targetTab = BANKING_CREDIT_TABS.OVERVIEW;
        if (tabParam === 'accounts' || tabParam === 'banking') targetTab = BANKING_CREDIT_TABS.ACCOUNTS;
        else if (tabParam === 'loans') targetTab = BANKING_CREDIT_TABS.LOANS;
        else if (tabParam === 'repayments' || tabParam === 'emis') targetTab = BANKING_CREDIT_TABS.REPAYMENTS;
        else if (tabParam === 'overview') targetTab = BANKING_CREDIT_TABS.OVERVIEW;

        return {
            canonicalRoute: '/(tabs)/banking-credit',
            targetTab,
            isRedirect: false
        };
    }

    // Legacy Formal Loans route
    if (cleanPath === '/loans' || cleanPath === 'loans') {
        return {
            canonicalRoute: '/(tabs)/banking-credit',
            targetTab: BANKING_CREDIT_TABS.LOANS,
            isRedirect: true
        };
    }

    // Legacy EMI Tracker route
    if (cleanPath === '/emis' || cleanPath === 'emis') {
        return {
            canonicalRoute: '/(tabs)/banking-credit',
            targetTab: BANKING_CREDIT_TABS.REPAYMENTS,
            isRedirect: true
        };
    }

    // Legacy Self Banking tab
    if ((cleanPath === '/self' || cleanPath === 'self') && tabParam === 'banking') {
        return {
            canonicalRoute: '/(tabs)/banking-credit',
            targetTab: BANKING_CREDIT_TABS.ACCOUNTS,
            isRedirect: true
        };
    }

    // Default fallback
    return {
        canonicalRoute: '/(tabs)/banking-credit',
        targetTab: BANKING_CREDIT_TABS.OVERVIEW,
        isRedirect: false
    };
}

/**
 * Filter deposit accounts for Total Available Bank Balance:
 * - Active accounts only (status !== 'CLOSED')
 * - Supported deposit types (SAVINGS, CURRENT, SALARY, CHECKING)
 * - Excludes CREDIT_CARD accounts (liabilities)
 * - Retains negative balances (overdrafts) as cash reductions
 */
export function isEligibleDepositAccount(account) {
    if (!account) return false;
    if (account.status === 'CLOSED' || account.status === 'INACTIVE') return false;
    const type = (account.type || account.accountType || 'SAVINGS').toUpperCase();
    if (type === 'CREDIT_CARD' || type === 'CREDIT' || type === 'LOAN') return false;
    return true;
}

/**
 * Repayment period resolution helper
 * Upcoming repayments contract:
 * - Due within the period [startDate, endDate]
 * - Status is PENDING, UPCOMING, DUE, or PARTIALLY_PAID
 * - Overdue repayments contract: dueDate < asOfDate && unpaid
 */
export function evaluateRepaymentStatus({ dueDate, status, paidTotalPaise = 0n, expectedTotalPaise = 0n, asOfDate = new Date() }) {
    const todayStr = (asOfDate instanceof Date ? asOfDate : new Date(asOfDate)).toISOString().split('T')[0];
    const expected = toBigIntPaise(expectedTotalPaise);
    const paid = toBigIntPaise(paidTotalPaise);
    const remainingPaise = expected > paid ? expected - paid : 0n;

    if (status === 'PAID' || status === 'CLOSED_BY_SETTLEMENT' || remainingPaise === 0n) {
        return {
            category: 'PAID',
            remainingPaise: 0n,
            isOverdue: false,
            isUpcoming: false
        };
    }

    if (dueDate < todayStr) {
        return {
            category: 'OVERDUE',
            remainingPaise,
            isOverdue: true,
            isUpcoming: false
        };
    }

    return {
        category: 'UPCOMING',
        remainingPaise,
        isOverdue: false,
        isUpcoming: true
    };
}
