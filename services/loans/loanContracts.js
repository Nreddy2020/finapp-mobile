/**
 * services/loans/loanContracts.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Domain Contracts.
 * Defines immutable enums, schemas, validation constants, paise conversions,
 * default optimizer weights, and centralized state transitions.
 */

export const LOAN_TYPES = Object.freeze({
    PERSONAL: 'PERSONAL',
    HOME: 'HOME',
    AUTO: 'AUTO',
    EDUCATION: 'EDUCATION',
    GOLD: 'GOLD'
});

export const RATE_TYPES = Object.freeze({
    FIXED: 'FIXED',
    VARIABLE_TRACKED: 'VARIABLE_TRACKED'
});

export const AMORTIZATION_MODES = Object.freeze({
    MODE_A_STANDARD_MONTHLY: 'MODE_A_STANDARD_MONTHLY'
    // Mode B (Day-count conventions 30/360, Actual/365) deferred to V1.1 extension
});

export const LOAN_STATUS = Object.freeze({
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    MATURED: 'MATURED',
    FORECLOSURE_PENDING: 'FORECLOSURE_PENDING',
    CLOSED: 'CLOSED',
    ARCHIVED: 'ARCHIVED',
    QUARANTINED: 'QUARANTINED'
});

export const BINDING_STATUS = Object.freeze({
    REFERENCE_ONLY: 'REFERENCE_ONLY',
    SYNCHRONIZED_ACTIVE: 'SYNCHRONIZED_ACTIVE',
    USER_PROPOSAL: 'USER_PROPOSAL',
    DEACTIVATED: 'DEACTIVATED'
});

export const PREPAYMENT_STRATEGY = Object.freeze({
    TENURE_REDUCTION: 'TENURE_REDUCTION',
    EMI_REDUCTION: 'EMI_REDUCTION'
});

export const DEBT_PAYOFF_METHOD = Object.freeze({
    AVALANCHE: 'AVALANCHE',
    SNOWBALL: 'SNOWBALL',
    CASH_FLOW_OPTIMIZER: 'CASH_FLOW_OPTIMIZER'
});

// Precision & Scale Constants
export const LOAN_CONSTANTS = Object.freeze({
    RATE_SCALE: 100000000n, // 10^8
    MIN_PRINCIPAL_PAISE: 100n, // ₹1.00
    MAX_PRINCIPAL_PAISE: 1000000000000n, // ₹100 Crore
    MIN_TENURE_MONTHS: 1,
    MAX_TENURE_MONTHS: 480, // 40 years
    MIN_ANNUAL_RATE_PCT: 0.0,
    MAX_ANNUAL_RATE_PCT: 100.0,
    STORAGE_KEY_V1: 'FINLIFE_LOANS_STORE_V1',
    SCHEMA_VERSION: 1
});

// Default Normalized Weights for Cash-Flow Optimizer (Sum = 100)
export const DEFAULT_OPTIMIZER_WEIGHTS = Object.freeze({
    wRelief: 30,   // Immediate monthly cash flow freed upon closure
    wSavings: 30,  // Total interest cost avoided
    wSpeed: 20,    // Months to full debt elimination
    wFees: 10,     // Foreclosure charges / prepayment penalties incurred
    wLiq: 10       // Liquidity strain relative to reserves
});

/**
 * Convert rupee number or string to BigInt paise safely
 */
export function toPaise(rupees) {
    if (typeof rupees === 'bigint') return rupees;
    if (rupees === null || rupees === undefined || isNaN(Number(rupees))) {
        throw new Error(`INVALID_RUPEE_AMOUNT: Expected valid numeric rupee value, got ${rupees}`);
    }
    const num = Number(rupees);
    if (num < 0) throw new Error(`NEGATIVE_AMOUNT_REJECTED: Amount cannot be negative: ${rupees}`);
    return BigInt(Math.round(num * 100));
}

/**
 * Format paise BigInt to standard INR display string
 */
export function toRupeesFormatted(paise) {
    const p = typeof paise === 'bigint' ? paise : BigInt(paise || 0);
    const rupees = Number(p) / 100;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 2
    }).format(rupees);
}

/**
 * Centralized State Machine Transition Function
 * Validates allowed state transitions, invariants, and side-effect expectations.
 */
export function transitionLoanState(currentState, requestedState, context = {}) {
    if (!Object.values(LOAN_STATUS).includes(currentState)) {
        throw new Error(`INVALID_CURRENT_STATE: Unknown state ${currentState}`);
    }
    if (!Object.values(LOAN_STATUS).includes(requestedState)) {
        throw new Error(`INVALID_REQUESTED_STATE: Unknown requested state ${requestedState}`);
    }

    if (currentState === requestedState) {
        return { success: true, state: currentState, changed: false };
    }

    // Explicit Transition Rules
    const ALLOWED_TRANSITIONS = {
        [LOAN_STATUS.DRAFT]: [LOAN_STATUS.ACTIVE, LOAN_STATUS.ARCHIVED, LOAN_STATUS.QUARANTINED],
        [LOAN_STATUS.ACTIVE]: [LOAN_STATUS.PAUSED, LOAN_STATUS.MATURED, LOAN_STATUS.FORECLOSURE_PENDING, LOAN_STATUS.CLOSED, LOAN_STATUS.QUARANTINED],
        [LOAN_STATUS.PAUSED]: [LOAN_STATUS.ACTIVE, LOAN_STATUS.CLOSED, LOAN_STATUS.QUARANTINED],
        [LOAN_STATUS.MATURED]: [LOAN_STATUS.CLOSED, LOAN_STATUS.ARCHIVED, LOAN_STATUS.QUARANTINED],
        [LOAN_STATUS.FORECLOSURE_PENDING]: [LOAN_STATUS.CLOSED, LOAN_STATUS.ACTIVE, LOAN_STATUS.QUARANTINED],
        [LOAN_STATUS.CLOSED]: [LOAN_STATUS.ARCHIVED, LOAN_STATUS.QUARANTINED],
        [LOAN_STATUS.ARCHIVED]: [LOAN_STATUS.QUARANTINED],
        [LOAN_STATUS.QUARANTINED]: [LOAN_STATUS.ACTIVE, LOAN_STATUS.ARCHIVED] // Only through explicit administrative recovery
    };

    const allowed = ALLOWED_TRANSITIONS[currentState] || [];
    if (!allowed.includes(requestedState)) {
        throw new Error(`ILLEGAL_STATE_TRANSITION: Cannot transition loan from ${currentState} to ${requestedState}`);
    }

    // Balance & Evidence Invariants for specific target states
    if (requestedState === LOAN_STATUS.CLOSED) {
        const outstanding = context.outstandingPrincipalPaise !== undefined ? BigInt(context.outstandingPrincipalPaise) : null;
        if (outstanding !== null && outstanding > 0n) {
            throw new Error(`PREMATURE_CLOSURE_REJECTED: Cannot transition to CLOSED while outstanding principal is ${outstanding} paise (must be 0)`);
        }
    }

    if (requestedState === LOAN_STATUS.ACTIVE && currentState === LOAN_STATUS.DRAFT) {
        if (!context.monthlyEmiPaise || BigInt(context.monthlyEmiPaise) <= 0n) {
            throw new Error(`CANNOT_ACTIVATE_DRAFT: Monthly EMI must be calculated and greater than 0 before activation`);
        }
    }

    return {
        success: true,
        state: requestedState,
        changed: true,
        transitionTimestamp: new Date().toISOString(),
        evidence: context.evidence || 'STATE_TRANSITION_INVOKED'
    };
}
