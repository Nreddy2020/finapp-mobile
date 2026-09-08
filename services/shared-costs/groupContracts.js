/**
 * services/shared-costs/groupContracts.js
 * 
 * FinLife Shared Costs & Groups Accounting Engine V1 — Domain Contracts.
 * Defines immutable enums, state machines, permission matrices,
 * BigInt paise arithmetic helpers, and canonical JSON serialization.
 * 
 * Invariants:
 * - Pure integer arithmetic: zero floating-point calculations for currency balances.
 * - All monetary units stored in integer paise (BigInt).
 * - Net balance zero-sum invariant: sum(all members' net balances) === 0n paise.
 */

export const GROUP_TYPES = Object.freeze({
    TRIP: 'TRIP',
    HOME: 'HOME',
    RENT: 'RENT',
    DINING: 'DINING',
    BUSINESS: 'BUSINESS',
    CUSTOM: 'CUSTOM'
});

export const GROUP_STATUS = Object.freeze({
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    SETTLEMENT_PENDING: 'SETTLEMENT_PENDING',
    SETTLED: 'SETTLED',
    ARCHIVED: 'ARCHIVED',
    QUARANTINED: 'QUARANTINED'
});

export const MEMBER_ROLES = Object.freeze({
    OWNER: 'OWNER',
    ADMIN: 'ADMIN',
    MEMBER: 'MEMBER',
    VIEWER: 'VIEWER'
});

export const MEMBER_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    LEFT: 'LEFT',
    INACTIVE: 'INACTIVE'
});

export const SPLIT_METHODS = Object.freeze({
    EQUAL: 'EQUAL',
    EXACT: 'EXACT',
    PERCENTAGE: 'PERCENTAGE',
    SHARES: 'SHARES',
    CUSTOM: 'CUSTOM'
});

export const EXPENSE_STATUS = Object.freeze({
    ACTIVE: 'ACTIVE',
    VOIDED: 'VOIDED',
    REVERSED: 'REVERSED'
});

export const SETTLEMENT_METHODS = Object.freeze({
    CASH: 'CASH',
    BANK_TRANSFER: 'BANK_TRANSFER',
    UPI: 'UPI',
    CARD: 'CARD',
    OTHER: 'OTHER'
});

export const SETTLEMENT_STATUS = Object.freeze({
    PENDING: 'PENDING',
    COMPLETED: 'COMPLETED',
    VOIDED: 'VOIDED'
});

export const RECURRING_FREQUENCIES = Object.freeze({
    WEEKLY: 'WEEKLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    ANNUALLY: 'ANNUALLY'
});

export const GROUP_ACTIONS = Object.freeze({
    CREATE_GROUP: 'CREATE_GROUP',
    UPDATE_GROUP: 'UPDATE_GROUP',
    ARCHIVE_GROUP: 'ARCHIVE_GROUP',
    ADD_MEMBER: 'ADD_MEMBER',
    REMOVE_MEMBER: 'REMOVE_MEMBER',
    CHANGE_ROLE: 'CHANGE_ROLE',
    ADD_EXPENSE: 'ADD_EXPENSE',
    EDIT_EXPENSE: 'EDIT_EXPENSE',
    VOID_EXPENSE: 'VOID_EXPENSE',
    RECORD_SETTLEMENT: 'RECORD_SETTLEMENT',
    VOID_SETTLEMENT: 'VOID_SETTLEMENT',
    CREATE_RECURRING: 'CREATE_RECURRING',
    VIEW: 'VIEW'
});

export const ROLE_PERMISSIONS = Object.freeze({
    [MEMBER_ROLES.OWNER]: Object.freeze(Object.values(GROUP_ACTIONS)),
    [MEMBER_ROLES.ADMIN]: Object.freeze([
        GROUP_ACTIONS.UPDATE_GROUP,
        GROUP_ACTIONS.ADD_MEMBER,
        GROUP_ACTIONS.REMOVE_MEMBER,
        GROUP_ACTIONS.ADD_EXPENSE,
        GROUP_ACTIONS.EDIT_EXPENSE,
        GROUP_ACTIONS.VOID_EXPENSE,
        GROUP_ACTIONS.RECORD_SETTLEMENT,
        GROUP_ACTIONS.VOID_SETTLEMENT,
        GROUP_ACTIONS.CREATE_RECURRING,
        GROUP_ACTIONS.VIEW
    ]),
    [MEMBER_ROLES.MEMBER]: Object.freeze([
        GROUP_ACTIONS.ADD_EXPENSE,
        GROUP_ACTIONS.EDIT_EXPENSE,
        GROUP_ACTIONS.RECORD_SETTLEMENT,
        GROUP_ACTIONS.VIEW
    ]),
    [MEMBER_ROLES.VIEWER]: Object.freeze([
        GROUP_ACTIONS.VIEW
    ])
});

export function hasRolePermission(role, action) {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    return permissions.includes(action);
}

// Precision & Scale Constants
export const SHARED_COSTS_CONSTANTS = Object.freeze({
    BPS_SCALE: 10000n,              // 100% = 10,000 Basis Points
    MIN_EXPENSE_PAISE: 1n,          // ₹0.01 minimum
    MAX_EXPENSE_PAISE: 100000000000n, // ₹100 Crore
    MAX_MEMBERS_PER_GROUP: 100,
    MAX_GROUP_NAME_LENGTH: 100,
    DEFAULT_CURRENCY: 'INR'
});

/**
 * Safely convert rupee representation to BigInt paise
 * @param {number|string|bigint} rupees
 * @returns {bigint}
 */
export function toPaise(rupees) {
    if (typeof rupees === 'bigint') return rupees;
    if (rupees === null || rupees === undefined || String(rupees).trim() === '') {
        throw new Error(`INVALID_RUPEE_AMOUNT: Expected numeric value, got ${rupees}`);
    }
    const cleanStr = String(rupees).replace(/,/g, '').trim();
    const num = Number(cleanStr);
    if (isNaN(num)) {
        throw new Error(`INVALID_RUPEE_AMOUNT: Could not parse '${rupees}' as a valid number`);
    }
    if (num < 0) {
        throw new Error(`NEGATIVE_AMOUNT_REJECTED: Amount cannot be negative: ${rupees}`);
    }
    // Round to nearest integer paise to avoid IEEE-754 precision issues
    return BigInt(Math.round(num * 100));
}

/**
 * Convert paise BigInt to decimal number in Rupees
 * @param {bigint|number} paise
 * @returns {number}
 */
export function paiseToRupees(paise) {
    const p = typeof paise === 'bigint' ? paise : BigInt(paise || 0);
    return Number(p) / 100;
}

/**
 * Format paise BigInt to standard INR display string
 * @param {bigint|number} paise
 * @param {string} currencySymbol
 * @returns {string}
 */
export function toRupeesFormatted(paise, currencySymbol = '₹') {
    const p = typeof paise === 'bigint' ? paise : BigInt(paise || 0);
    const sign = p < 0n ? '-' : '';
    const absP = p < 0n ? -p : p;
    const rupees = Number(absP) / 100;
    
    const formatted = new Intl.NumberFormat('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(rupees);

    return `${sign}${currencySymbol}${formatted}`;
}

/**
 * Centralized State Transition Engine for Groups
 */
export function transitionGroupState(currentState, requestedState, context = {}) {
    if (!Object.values(GROUP_STATUS).includes(currentState)) {
        throw new Error(`INVALID_CURRENT_STATE: Unknown group state '${currentState}'`);
    }
    if (!Object.values(GROUP_STATUS).includes(requestedState)) {
        throw new Error(`INVALID_REQUESTED_STATE: Unknown requested group state '${requestedState}'`);
    }
    if (currentState === requestedState) {
        return { success: true, state: currentState, changed: false };
    }

    const ALLOWED = {
        [GROUP_STATUS.DRAFT]: [GROUP_STATUS.ACTIVE, GROUP_STATUS.ARCHIVED, GROUP_STATUS.QUARANTINED],
        [GROUP_STATUS.ACTIVE]: [GROUP_STATUS.SETTLEMENT_PENDING, GROUP_STATUS.SETTLED, GROUP_STATUS.ARCHIVED, GROUP_STATUS.QUARANTINED],
        [GROUP_STATUS.SETTLEMENT_PENDING]: [GROUP_STATUS.ACTIVE, GROUP_STATUS.SETTLED, GROUP_STATUS.ARCHIVED, GROUP_STATUS.QUARANTINED],
        [GROUP_STATUS.SETTLED]: [GROUP_STATUS.ACTIVE, GROUP_STATUS.ARCHIVED, GROUP_STATUS.QUARANTINED],
        [GROUP_STATUS.ARCHIVED]: [GROUP_STATUS.ACTIVE, GROUP_STATUS.QUARANTINED],
        [GROUP_STATUS.QUARANTINED]: [GROUP_STATUS.ACTIVE, GROUP_STATUS.ARCHIVED]
    };

    const validTargets = ALLOWED[currentState] || [];
    if (!validTargets.includes(requestedState)) {
        throw new Error(`ILLEGAL_GROUP_TRANSITION: Cannot transition from ${currentState} to ${requestedState}`);
    }

    // Invariant: cannot transition to SETTLED if there are unresolved non-zero net balances
    if (requestedState === GROUP_STATUS.SETTLED && context.hasUnsettledBalances) {
        throw new Error(`CANNOT_SETTLE_WITH_BALANCES: Group has unsettled non-zero member balances`);
    }

    return { success: true, state: requestedState, changed: true };
}

/**
 * Centralized State Transition Engine for Expenses
 */
export function transitionExpenseState(currentState, requestedState) {
    if (!Object.values(EXPENSE_STATUS).includes(currentState)) {
        throw new Error(`INVALID_CURRENT_STATE: Unknown expense state '${currentState}'`);
    }
    if (!Object.values(EXPENSE_STATUS).includes(requestedState)) {
        throw new Error(`INVALID_REQUESTED_STATE: Unknown requested expense state '${requestedState}'`);
    }
    if (currentState === requestedState) {
        return { success: true, state: currentState, changed: false };
    }

    const ALLOWED = {
        [EXPENSE_STATUS.ACTIVE]: [EXPENSE_STATUS.VOIDED, EXPENSE_STATUS.REVERSED],
        [EXPENSE_STATUS.VOIDED]: [], // Terminal
        [EXPENSE_STATUS.REVERSED]: [] // Terminal
    };

    const validTargets = ALLOWED[currentState] || [];
    if (!validTargets.includes(requestedState)) {
        throw new Error(`ILLEGAL_EXPENSE_TRANSITION: Cannot transition from ${currentState} to ${requestedState}`);
    }

    return { success: true, state: requestedState, changed: true };
}

/**
 * BigInt JSON Serializer / Deserializer Helpers
 */
export function bigIntReplacer(key, value) {
    if (typeof value === 'bigint') {
        return { __bigint: value.toString() };
    }
    return value;
}

export function bigIntReviver(key, value) {
    if (value && typeof value === 'object' && value.__bigint !== undefined) {
        return BigInt(value.__bigint);
    }
    return value;
}

/**
 * Canonical JSON stringify with deterministic sorted keys.
 * Crucial for cryptographic hashing.
 */
export function canonicalJsonStringify(obj) {
    if (obj === null || typeof obj !== 'object') {
        if (typeof obj === 'bigint') {
            return JSON.stringify({ __bigint: obj.toString() });
        }
        return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
        return `[${obj.map(item => canonicalJsonStringify(item)).join(',')}]`;
    }

    const sortedKeys = Object.keys(obj).sort();
    const keyValPairs = sortedKeys.map(key => {
        const val = obj[key];
        return `${JSON.stringify(key)}:${canonicalJsonStringify(val)}`;
    });

    return `{${keyValPairs.join(',')}}`;
}
