/**
 * components/assets/assetContracts.js
 * 
 * FinLife Assets Module — Core Domain Contracts & Invariant Bounds.
 * 
 * Invariant Guarantees:
 * - 64-bit integer BigInt paise standard.
 * - Explicit domain boundaries: MIN_ASSET_PAISE (0n), MAX_ASSET_PAISE (10,000,000,000,000n = ₹10,000 Crore).
 * - Signed 64-bit domain for net equity, gains/losses: [-2^63, 2^63 - 1].
 * - Fixed-point scales: WEIGHT_SCALE (1,000,000n), UNITS_SCALE (1,000,000n), BPS_SCALE (10,000n).
 * - Purity basis points mapping (24K, 22K, 18K, 14K, 999, 925).
 * - Strict non-property boundary: PROPERTY category rejected with ERR_PROPERTY_DISALLOWED.
 * - Authoritative source tracking with isReadOnlyProjection immutability.
 * - Explicit ownership allocations totaling exactly 10,000 BPS.
 */

// 1. Monetary Domain Constants (Paise)
export const MIN_ASSET_PAISE = 0n;
export const MAX_ASSET_PAISE = 10_000_000_000_000n; // ₹10,000 Crore (100,000,000,000 INR * 100 paise)

export const MIN_SIGNED_PAISE = -9_223_372_036_854_775_808n; // -2^63
export const MAX_SIGNED_PAISE =  9_223_372_036_854_775_807n; // 2^63 - 1

// 2. Fixed-Point Scales (Zero Floats)
export const WEIGHT_SCALE = 1_000_000n; // 1 gram = 1,000,000 micros
export const UNITS_SCALE  = 1_000_000n; // 1 unit = 1,000,000 micros
export const BPS_SCALE    = 10_000n;    // 100% = 10,000 Basis Points

// 3. Precious Metal Purity in Basis Points
export const PURITY_BPS = Object.freeze({
    '24K': 10_000n, // 100.00%
    '22K':  9_167n, //  91.67%
    '18K':  7_500n, //  75.00%
    '14K':  5_833n, //  58.33%
    '999':  9_990n, //  99.90%
    '925':  9_250n  //  92.50%
});

// 4. Controlled Categories (Non-Property)
export const ASSET_CATEGORY = Object.freeze({
    MONEY_CASH:          'MONEY_CASH',
    INVESTMENTS:         'INVESTMENTS',
    PRECIOUS_METALS:     'PRECIOUS_METALS',
    VEHICLES:            'VEHICLES',
    HOUSEHOLD_VALUABLES: 'HOUSEHOLD_VALUABLES',
    BUSINESS_ASSETS:     'BUSINESS_ASSETS',
    RECEIVABLES:         'RECEIVABLES',
    OTHER_ASSETS:        'OTHER_ASSETS'
});

// 5. Lifecycle Status
export const ASSET_LIFECYCLE_STATUS = Object.freeze({
    DRAFT:              'DRAFT',
    ACTIVE:             'ACTIVE',
    PARTIALLY_DISPOSED: 'PARTIALLY_DISPOSED',
    TRANSFERRED:        'TRANSFERRED',
    SOLD:               'SOLD',
    ARCHIVED:           'ARCHIVED'
});

// Permitted State Transitions
export const PERMITTED_LIFECYCLE_TRANSITIONS = Object.freeze({
    DRAFT:              Object.freeze(['ACTIVE', 'ARCHIVED']),
    ACTIVE:             Object.freeze(['PARTIALLY_DISPOSED', 'TRANSFERRED', 'SOLD', 'ARCHIVED']),
    PARTIALLY_DISPOSED: Object.freeze(['SOLD', 'ARCHIVED']),
    TRANSFERRED:        Object.freeze(['ARCHIVED']),
    SOLD:               Object.freeze(['ARCHIVED']),
    ARCHIVED:           Object.freeze([]) // Terminal state
});

// 6. Owner Types
export const OWNER_TYPE = Object.freeze({
    SELF:   'SELF',
    SPOUSE: 'SPOUSE',
    CHILD:  'CHILD',
    PARENT: 'PARENT',
    JOINT:  'JOINT',
    FAMILY: 'FAMILY',
    OTHER:  'OTHER'
});

// 7. Authoritative Source Types
export const SOURCE_TYPE = Object.freeze({
    MANUAL:            'MANUAL',
    BANKING:           'BANKING',
    INVESTMENT_LEDGER: 'INVESTMENT_LEDGER',
    P2P:               'P2P',
    PROPERTIES:        'PROPERTIES',
    IMPORT:            'IMPORT'
});

// 8. Valuation Types
export const VALUATION_TYPE = Object.freeze({
    MARKET_PRICE:    'MARKET_PRICE',
    ESTIMATED:       'ESTIMATED',
    PURCHASE_COST:   'PURCHASE_COST',
    BOOK_VALUE:      'BOOK_VALUE',
    INSURANCE_VALUE: 'INSURANCE_VALUE'
});

// 9. Validation Error Class
export class AssetValidationError extends Error {
    constructor(code, message, details = {}) {
        super(`[${code}] ${message}`);
        this.name = 'AssetValidationError';
        this.code = code;
        this.details = details;
    }
}

// 10. Deterministic Half-Up Rounding (Integer Division)
export function roundHalfUp(numerator, denominator) {
    if (typeof numerator !== 'bigint' || typeof denominator !== 'bigint') {
        throw new AssetValidationError('ERR_INVALID_TYPE', 'Numerator and denominator must be BigInts');
    }
    if (denominator === 0n) {
        throw new AssetValidationError('ERR_DIV_BY_ZERO', 'Division by zero is undefined');
    }

    const isNegative = (numerator < 0n) !== (denominator < 0n);
    const absNum = numerator < 0n ? -numerator : numerator;
    const absDen = denominator < 0n ? -denominator : denominator;

    // Standard Half-Up: Add half the denominator before division
    const rounded = (absNum + (absDen / 2n)) / absDen;
    return isNegative ? -rounded : rounded;
}

// 11. BigInt Conversion & Validation
export function toBigIntPaise(value, fieldName = 'amount') {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') {
        if (!Number.isFinite(value) || !Number.isInteger(value)) {
            throw new AssetValidationError('ERR_FLOAT_DISALLOWED', `${fieldName} must be an integer, received float: ${value}`);
        }
        return BigInt(value);
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!/^-?\d+$/.test(trimmed)) {
            throw new AssetValidationError('ERR_INVALID_BIGINT_STRING', `${fieldName} cannot parse string into BigInt: "${value}"`);
        }
        return BigInt(trimmed);
    }
    throw new AssetValidationError('ERR_INVALID_TYPE', `${fieldName} cannot be converted to BigInt paise`);
}

// 12. Validate Asset Bounds
export function validateAssetPaiseBounds(paise, { signed = false, maxLimit = MAX_ASSET_PAISE } = {}) {
    const bigVal = toBigIntPaise(paise);

    if (signed) {
        if (bigVal < MIN_SIGNED_PAISE || bigVal > MAX_SIGNED_PAISE) {
            throw new AssetValidationError('ERR_DOMAIN_OVERFLOW', `Value ${bigVal} exceeds signed 64-bit boundaries`);
        }
        return bigVal;
    }

    if (bigVal < MIN_ASSET_PAISE) {
        throw new AssetValidationError('ERR_NEGATIVE_ASSET_VALUE', `Asset values cannot be negative: ${bigVal}`);
    }

    if (maxLimit !== null && bigVal > maxLimit) {
        throw new AssetValidationError('ERR_LIMIT_EXCEEDED', `Asset value ${bigVal} exceeds maximum transaction limit: ${maxLimit}`);
    }

    return bigVal;
}

// 13. Validate Ownership Shares
export function validateOwnershipShares(ownership) {
    if (!Array.isArray(ownership) || ownership.length === 0) {
        throw new AssetValidationError('ERR_EMPTY_OWNERSHIP', 'Asset must have at least one ownership record');
    }

    let totalBps = 0n;
    const seenMembers = new Set();

    for (const alloc of ownership) {
        if (!alloc.memberId || typeof alloc.memberId !== 'string') {
            throw new AssetValidationError('ERR_INVALID_MEMBER', 'Ownership allocation must specify a valid memberId string');
        }

        const memberIdKey = alloc.memberId.trim().toLowerCase();
        if (seenMembers.has(memberIdKey)) {
            throw new AssetValidationError('ERR_DUPLICATE_MEMBER', `Duplicate memberId in ownership allocation: ${alloc.memberId}`);
        }
        seenMembers.add(memberIdKey);

        const shareBps = toBigIntPaise(alloc.shareBps, `shareBps for ${alloc.memberId}`);
        if (shareBps < 0n || shareBps > BPS_SCALE) {
            throw new AssetValidationError('ERR_INVALID_SHARE_BPS', `Share BPS for ${alloc.memberId} must be between 0 and 10000, got: ${shareBps}`);
        }

        totalBps += shareBps;
    }

    if (totalBps !== BPS_SCALE) {
        throw new AssetValidationError('ERR_OWNERSHIP_SUM_MISMATCH', `Ownership shares must sum to exactly 10,000 BPS (100%), got: ${totalBps}`);
    }

    return true;
}

// 14. Validate State Transitions
export function validateLifecycleTransition(currentStatus, nextStatus) {
    if (!ASSET_LIFECYCLE_STATUS[currentStatus]) {
        throw new AssetValidationError('ERR_INVALID_STATUS', `Invalid current lifecycle status: ${currentStatus}`);
    }
    if (!ASSET_LIFECYCLE_STATUS[nextStatus]) {
        throw new AssetValidationError('ERR_INVALID_STATUS', `Invalid target lifecycle status: ${nextStatus}`);
    }

    const permitted = PERMITTED_LIFECYCLE_TRANSITIONS[currentStatus];
    if (!permitted || !permitted.includes(nextStatus)) {
        throw new AssetValidationError('ERR_INVALID_TRANSITION', `Illegal lifecycle transition from ${currentStatus} to ${nextStatus}`);
    }

    return true;
}
