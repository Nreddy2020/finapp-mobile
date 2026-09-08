/**
 * services/commitments/commitmentContracts.js
 * 
 * Authoritative domain contracts, enums, MoneyPaise serialization,
 * and structural validators for Recurring Financial Commitments & Liabilities.
 * 
 * Invariants:
 * - Zero floating-point math: all financial values use integer/string MoneyPaise.
 * - Native BigInt used for calculations; decimal string used for persistence/JSON.
 * - Strict financial nature: EXPENSE vs DEBT vs INVESTMENT.
 */

export const FinancialNature = Object.freeze({
    EXPENSE: 'EXPENSE',
    DEBT: 'DEBT',
    INVESTMENT: 'INVESTMENT'
});

export const CommitmentType = Object.freeze({
    SUBSCRIPTION: 'SUBSCRIPTION',
    LOAN_EMI: 'LOAN_EMI',
    RENT: 'RENT',
    UTILITY_BILL: 'UTILITY_BILL',
    INSURANCE: 'INSURANCE',
    EDUCATION: 'EDUCATION',
    MEMBERSHIP: 'MEMBERSHIP',
    INVESTMENT_SIP: 'INVESTMENT_SIP',
    PARENT_SUPPORT: 'PARENT_SUPPORT',
    MEDICAL_CARE: 'MEDICAL_CARE',
    OTHER: 'OTHER'
});

export const FamilyObligationCategory = Object.freeze({
    PARENT_SUPPORT: 'PARENT_SUPPORT',
    CHILD_EDUCATION: 'CHILD_EDUCATION',
    HEALTH_AND_CARE: 'HEALTH_AND_CARE',
    FAMILY_PROTECTION: 'FAMILY_PROTECTION',
    HOUSEHOLD_SHARED: 'HOUSEHOLD_SHARED',
    OTHER_FAMILY: 'OTHER_FAMILY'
});

export const AmountMode = Object.freeze({
    FIXED: 'FIXED',
    VARIABLE: 'VARIABLE',
    ESTIMATED: 'ESTIMATED'
});

export const RecurrenceFrequency = Object.freeze({
    WEEKLY: 'WEEKLY',
    FORTNIGHTLY: 'FORTNIGHTLY',
    MONTHLY: 'MONTHLY',
    QUARTERLY: 'QUARTERLY',
    HALF_YEARLY: 'HALF_YEARLY',
    YEARLY: 'YEARLY',
    CUSTOM: 'CUSTOM'
});

export const CommitmentStatus = Object.freeze({
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED'
});

export const PaymentOccurrenceStatus = Object.freeze({
    UPCOMING: 'UPCOMING',
    OVERDUE: 'OVERDUE',
    PAID_PENDING_RECONCILIATION: 'PAID_PENDING_RECONCILIATION',
    PAID: 'PAID',
    SKIPPED: 'SKIPPED',
    FAILED: 'FAILED',
    FAILED_RECONCILIATION: 'FAILED_RECONCILIATION',
    CANCELLED: 'CANCELLED'
});

export const CashbookReconciliationStatus = Object.freeze({
    UNMATCHED: 'UNMATCHED',
    MATCHED: 'MATCHED',
    PARTIAL: 'PARTIAL',
    CONFLICT: 'CONFLICT',
    NOT_REQUIRED: 'NOT_REQUIRED'
});

export const EmergencyRunwayStatus = Object.freeze({
    AVAILABLE: 'AVAILABLE',
    EMPTY: 'EMPTY',
    NO_COMMITTED_OUTFLOW: 'NO_COMMITTED_OUTFLOW',
    NOT_CONFIGURED: 'NOT_CONFIGURED',
    UNAVAILABLE: 'UNAVAILABLE',
    PARTIAL: 'PARTIAL'
});

export const LedgerMatchConfidence = Object.freeze({
    STRONG: 'STRONG',     // Exact transactionId -> auto-link allowed
    MEDIUM: 'MEDIUM',     // Account + amount/date similarity -> user confirmation required
    WEAK: 'WEAK'          // Description similarity -> never auto-merge
});

export const AppMode = Object.freeze({
    DEMO: 'DEMO',
    PRODUCTION: 'PRODUCTION'
});

/**
 * Maps commitment type to its financial nature
 */
export const TYPE_NATURE_MAPPING = Object.freeze({
    [CommitmentType.SUBSCRIPTION]: FinancialNature.EXPENSE,
    [CommitmentType.RENT]: FinancialNature.EXPENSE,
    [CommitmentType.UTILITY_BILL]: FinancialNature.EXPENSE,
    [CommitmentType.INSURANCE]: FinancialNature.EXPENSE,
    [CommitmentType.EDUCATION]: FinancialNature.EXPENSE,
    [CommitmentType.MEMBERSHIP]: FinancialNature.EXPENSE,
    [CommitmentType.PARENT_SUPPORT]: FinancialNature.EXPENSE,
    [CommitmentType.MEDICAL_CARE]: FinancialNature.EXPENSE,
    [CommitmentType.OTHER]: FinancialNature.EXPENSE,
    [CommitmentType.LOAN_EMI]: FinancialNature.DEBT,
    [CommitmentType.INVESTMENT_SIP]: FinancialNature.INVESTMENT
});

/**
 * Creates a valid MoneyPaise object.
 * Safe for JSON serialization: stores paise as a string representation of an integer.
 * @param {string|number|bigint} paiseValue 
 * @param {string} currency 
 * @returns {{ paise: string, currency: 'INR' }}
 */
export function createMoneyPaise(paiseValue, currency = 'INR') {
    if (paiseValue === undefined || paiseValue === null) {
        throw new Error('paiseValue is required');
    }
    
    let strVal;
    if (typeof paiseValue === 'bigint') {
        if (paiseValue < 0n) throw new Error('Financial amounts must be non-negative');
        strVal = paiseValue.toString();
    } else if (typeof paiseValue === 'number') {
        if (!Number.isFinite(paiseValue) || paiseValue < 0 || !Number.isInteger(paiseValue)) {
            throw new Error(`Financial paise amount must be a non-negative integer: ${paiseValue}`);
        }
        strVal = paiseValue.toString();
    } else if (typeof paiseValue === 'string') {
        const trimmed = paiseValue.trim();
        if (!/^\d+$/.test(trimmed)) {
            throw new Error(`Invalid paise string representation: "${paiseValue}"`);
        }
        strVal = trimmed;
    } else {
        throw new Error(`Unsupported paise type: ${typeof paiseValue}`);
    }

    return {
        paise: strVal,
        currency: currency.toUpperCase()
    };
}

/**
 * Converts Rupees (decimal or int) to MoneyPaise.
 * e.g. 649 -> { paise: "64900", currency: "INR" }
 */
export function rupeesToMoneyPaise(rupees, currency = 'INR') {
    if (typeof rupees !== 'number' && typeof rupees !== 'string') {
        throw new Error(`Invalid rupee value: ${rupees}`);
    }
    const num = Number(rupees);
    if (isNaN(num) || num < 0) {
        throw new Error(`Rupee amount must be non-negative: ${rupees}`);
    }
    // Round to nearest integer paise to prevent IEEE-754 precision issues
    const paiseInt = Math.round(num * 100);
    return createMoneyPaise(paiseInt, currency);
}

/**
 * Converts MoneyPaise to BigInt for domain calculations.
 * @param {{ paise: string }} moneyPaise 
 * @returns {bigint}
 */
export function moneyToBigInt(moneyPaise) {
    if (!moneyPaise || typeof moneyPaise.paise !== 'string') {
        throw new Error('Invalid MoneyPaise object');
    }
    return BigInt(moneyPaise.paise);
}

/**
 * Converts MoneyPaise to human-readable Rupee number (for presentation view models only).
 * @param {{ paise: string }} moneyPaise 
 * @returns {number}
 */
export function moneyToRupees(moneyPaise) {
    const bi = moneyToBigInt(moneyPaise);
    return Number(bi) / 100;
}

/**
 * Formats MoneyPaise to formatted INR currency string e.g. "₹1,42,500"
 * @param {{ paise: string }} moneyPaise 
 * @param {boolean} includeDecimals 
 * @returns {string}
 */
export function formatMoneyPaise(moneyPaise, includeDecimals = false) {
    const bi = moneyToBigInt(moneyPaise);
    const whole = bi / 100n;
    const remainder = bi % 100n;
    
    // Format Indian Numbering System
    const wholeStr = whole.toString();
    let formattedWhole = '';
    if (wholeStr.length <= 3) {
        formattedWhole = wholeStr;
    } else {
        const last3 = wholeStr.substring(wholeStr.length - 3);
        const remaining = wholeStr.substring(0, wholeStr.length - 3);
        const parts = [];
        for (let i = remaining.length; i > 0; i -= 2) {
            const start = Math.max(0, i - 2);
            parts.unshift(remaining.substring(start, i));
        }
        formattedWhole = parts.join(',') + ',' + last3;
    }

    if (includeDecimals && remainder > 0n) {
        const remStr = remainder.toString().padStart(2, '0');
        return `₹${formattedWhole}.${remStr}`;
    }
    return `₹${formattedWhole}`;
}

/**
 * Validates a recurring commitment object structure.
 * @param {object} commitment 
 */
export function validateCommitment(commitment) {
    if (!commitment) throw new Error('Commitment cannot be null');
    if (!commitment.id || typeof commitment.id !== 'string') throw new Error('Commitment must have a string id');
    if (!commitment.name || typeof commitment.name !== 'string') throw new Error('Commitment must have a name');
    
    if (!Object.values(CommitmentType).includes(commitment.type)) {
        throw new Error(`Invalid CommitmentType: ${commitment.type}`);
    }
    if (!Object.values(FinancialNature).includes(commitment.financialNature)) {
        throw new Error(`Invalid FinancialNature: ${commitment.financialNature}`);
    }
    if (!Object.values(RecurrenceFrequency).includes(commitment.frequency)) {
        throw new Error(`Invalid RecurrenceFrequency: ${commitment.frequency}`);
    }
    if (!Object.values(AmountMode).includes(commitment.amountMode || AmountMode.FIXED)) {
        throw new Error(`Invalid AmountMode: ${commitment.amountMode}`);
    }
    if (!Object.values(CommitmentStatus).includes(commitment.status)) {
        throw new Error(`Invalid CommitmentStatus: ${commitment.status}`);
    }

    // Validate MoneyPaise
    if (!commitment.amount || typeof commitment.amount.paise !== 'string') {
        throw new Error('Commitment must have a valid MoneyPaise amount');
    }
    const bi = moneyToBigInt(commitment.amount);
    if (bi <= 0n) {
        throw new Error('Commitment amount must be strictly positive');
    }

    // Validate dates
    if (!commitment.startDate) throw new Error('Commitment must have a startDate (YYYY-MM-DD)');
    if (!commitment.nextDueDate) throw new Error('Commitment must have a nextDueDate (YYYY-MM-DD)');
    if (commitment.nextDueDate < commitment.startDate) {
        throw new Error(`nextDueDate (${commitment.nextDueDate}) cannot precede startDate (${commitment.startDate})`);
    }

    // Versioning invariant
    if (typeof commitment.version !== 'number' || commitment.version < 1) {
        throw new Error('Commitment must have integer version >= 1');
    }

    // Validate family context if provided
    if (commitment.familyContext !== undefined && commitment.familyContext !== null) {
        const fc = commitment.familyContext;
        if (typeof fc !== 'object') {
            throw new Error('familyContext must be an object');
        }
        if (!fc.personId || typeof fc.personId !== 'string' || !fc.personId.trim()) {
            throw new Error('familyContext must have a valid non-empty string personId');
        }
        if (!fc.familyRole || typeof fc.familyRole !== 'string' || !fc.familyRole.trim()) {
            throw new Error('familyContext must have a valid non-empty string familyRole');
        }
        if (!fc.obligationCategory || !Object.values(FamilyObligationCategory).includes(fc.obligationCategory)) {
            throw new Error(`Invalid familyContext obligationCategory: ${fc.obligationCategory}`);
        }

        // Domain link mutual exclusivity check: cannot link to multiple distinct family sub-domains
        const domainLinks = [fc.policyId, fc.educationGoalId, fc.elderCarePlanId].filter(Boolean);
        if (domainLinks.length > 1) {
            throw new Error('Commitment cannot simultaneously link to conflicting family domain targets');
        }

        // Check compatibility between category and domain link
        if (fc.educationGoalId && fc.obligationCategory !== FamilyObligationCategory.CHILD_EDUCATION) {
            throw new Error(`educationGoalId requires CHILD_EDUCATION category, got ${fc.obligationCategory}`);
        }
        if (fc.elderCarePlanId && fc.obligationCategory !== FamilyObligationCategory.PARENT_SUPPORT && fc.obligationCategory !== FamilyObligationCategory.HEALTH_AND_CARE) {
            throw new Error(`elderCarePlanId requires PARENT_SUPPORT or HEALTH_AND_CARE category, got ${fc.obligationCategory}`);
        }
        if (fc.policyId && fc.obligationCategory !== FamilyObligationCategory.FAMILY_PROTECTION && fc.obligationCategory !== FamilyObligationCategory.HEALTH_AND_CARE) {
            throw new Error(`policyId requires FAMILY_PROTECTION or HEALTH_AND_CARE category, got ${fc.obligationCategory}`);
        }
    }

    return true;
}

/**
 * Creates canonical five-field financial projection object for cross-domain consumers.
 * Preserves compatibility with Family Hub Financial Reference architecture.
 * 
 * @param {object} params
 * @param {object} params.occurrence 
 * @param {object} params.commitment 
 * @param {string} params.asOfDate 
 * @returns {object} Canonical financial projection
 */
export function createCommitmentFinancialProjection({ occurrence, commitment, asOfDate }) {
    const recordId = occurrence?.id || commitment?.id || '';
    const paise = occurrence?.actualAmount?.paise || occurrence?.expectedAmount?.paise || commitment?.amount?.paise || '0';
    const currency = occurrence?.actualAmount?.currency || occurrence?.expectedAmount?.currency || commitment?.amount?.currency || 'INR';

    return {
        reference: {
            sourceType: 'COMMITMENT',
            sourceRecordId: recordId,
            sourceDomain: 'Commitments',
            linkStatus: 'LINKED_VERIFIED',
            lastVerifiedAt: new Date().toISOString()
        },
        amountPaise: paise,
        currency,
        asOfDate: asOfDate || new Date().toISOString().split('T')[0]
    };
}
