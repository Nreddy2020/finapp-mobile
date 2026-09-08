/**
 * components/p2p/p2pContracts.js
 * 
 * FinLife P2P Network — Authoritative Contracts, Invariants & Integer Paise Arithmetic.
 * 
 * Mandates:
 * 1. All monetary values are represented as integer paise using JavaScript BigInt, with explicit domain limits and decimal-string persistence.
 * 2. Deterministic roundHalfUp integer division.
 * 3. 23 Architectural Invariants (P2P-INV-01 to P2P-INV-23).
 * 4. Read-only projection boundary contract.
 */

export const P2P_TABS = Object.freeze({
    OVERVIEW: 'overview',
    GIVEN: 'given',
    TAKEN: 'taken',
    PEOPLE: 'people',
    SETTLEMENTS: 'settlements'
});

export const P2P_STATE = Object.freeze({
    DATA_AVAILABLE: 'DATA_AVAILABLE',
    NO_DATA: 'NO_DATA',
    SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
    RECONCILIATION_FAILED: 'RECONCILIATION_FAILED'
});

export const P2P_INVARIANTS = Object.freeze({
    // Monetary Invariants
    P2P_INV_01: {
        id: 'P2P-INV-01',
        category: 'Monetary',
        name: 'Integer Paise Precision',
        description: 'All monetary values are represented as integer paise using JavaScript BigInt, with explicit domain limits and decimal-string persistence.'
    },
    P2P_INV_02: {
        id: 'P2P-INV-02',
        category: 'Monetary',
        name: 'Journal Debit-Credit Balance',
        description: 'Every journal entry enforces sum(Debits) === sum(Credits) to the exact paisa.'
    },
    P2P_INV_03: {
        id: 'P2P-INV-03',
        category: 'Monetary',
        name: 'Non-Negative Outstanding Balance',
        description: 'Loan outstanding principal never becomes negative without an explicit overpayment policy.'
    },
    P2P_INV_04: {
        id: 'P2P-INV-04',
        category: 'Monetary',
        name: 'Repayment Allocation Conservation',
        description: 'Allocated principal + interest + fees strictly equals the total repayment amount.'
    },
    P2P_INV_05: {
        id: 'P2P-INV-05',
        category: 'Monetary',
        name: 'Expected Payment Component Sum',
        description: 'Expected installment total equals principal component + interest component + fee component.'
    },

    // Lifecycle Invariants
    P2P_INV_06: {
        id: 'P2P-INV-06',
        category: 'Lifecycle',
        name: 'Top-Up History Preservation',
        description: 'Top-up advances re-amortize future schedule while preserving historical disbursements.'
    },
    P2P_INV_07: {
        id: 'P2P-INV-07',
        category: 'Lifecycle',
        name: 'Prepayment Schedule Reduction',
        description: 'Lump-sum prepayments reduce outstanding principal and re-amortize remaining tenure.'
    },
    P2P_INV_08: {
        id: 'P2P-INV-08',
        category: 'Lifecycle',
        name: 'Reversal Symmetry',
        description: 'A reversal restores the exact original economic effect with inverted debits and credits.'
    },
    P2P_INV_09: {
        id: 'P2P-INV-09',
        category: 'Lifecycle',
        name: 'Settlement Boundary Isolation',
        description: 'Settled loans cease contributing to active receivables, payables, or net worth.'
    },
    P2P_INV_10: {
        id: 'P2P-INV-10',
        category: 'Lifecycle',
        name: 'Journal Replay Determinism',
        description: 'Replaying the journal ledger reproduces 100% identical loan balances, schedules, and person relationships.'
    },

    // Relationship Invariants
    P2P_INV_11: {
        id: 'P2P-INV-11',
        category: 'Relationship',
        name: 'Person Relationship Netting',
        description: 'Person net balance strictly equals Total Given minus Total Taken.'
    },
    P2P_INV_12: {
        id: 'P2P-INV-12',
        category: 'Relationship',
        name: 'Multi-Loan Contract Sum',
        description: 'Person-level aggregate balance equals the sum of all individual active loan contracts.'
    },
    P2P_INV_13: {
        id: 'P2P-INV-13',
        category: 'Relationship',
        name: 'Contract History Integrity',
        description: 'Multi-loan relationship netting preserves independent per-contract accounting history.'
    },
    P2P_INV_14: {
        id: 'P2P-INV-14',
        category: 'Relationship',
        name: 'Settlement Idempotency',
        description: 'Submitting a settlement command with a stable idempotency key produces no duplicate journal entries.'
    },

    // Cashbook Invariants
    P2P_INV_15: {
        id: 'P2P-INV-15',
        category: 'Cashbook',
        name: 'Loan Disbursement Cash Neutrality',
        description: 'Money lent is classified as TRANSFER and is strictly excluded from lifestyle operating burn.'
    },
    P2P_INV_16: {
        id: 'P2P-INV-16',
        category: 'Cashbook',
        name: 'Borrowed Principal Cash Neutrality',
        description: 'Money borrowed is classified as TRANSFER and is strictly excluded from ordinary earned income.'
    },
    P2P_INV_17: {
        id: 'P2P-INV-17',
        category: 'Cashbook',
        name: 'Interest Received Classification',
        description: 'Interest received on lent money is recognized as taxable ordinary INCOME.'
    },
    P2P_INV_18: {
        id: 'P2P-INV-18',
        category: 'Cashbook',
        name: 'Interest Paid Classification',
        description: 'Interest paid on borrowed money is recognized as FINANCING EXPENSE.'
    },
    P2P_INV_19: {
        id: 'P2P-INV-19',
        category: 'Cashbook',
        name: 'Cashbook Reversal Symmetry',
        description: 'Reversing a P2P transaction restores the Cashbook running balance symmetrically.'
    },

    // Presentation & Net Worth Invariants
    P2P_INV_20: {
        id: 'P2P-INV-20',
        category: 'Presentation',
        name: 'Overview Authoritative Harmony',
        description: 'Overview totals strictly equal authoritative journal-derived projections.'
    },
    P2P_INV_21: {
        id: 'P2P-INV-21',
        category: 'Presentation',
        name: 'Status Exclusivity',
        description: 'Upcoming, overdue, and paid obligation amounts are mutually exclusive.'
    },
    P2P_INV_22: {
        id: 'P2P-INV-22',
        category: 'Presentation',
        name: 'Zero Duplicate UI Actions',
        description: 'UI submissions are debounced and idempotent, preventing duplicate ledger entries.'
    },
    P2P_INV_23: {
        id: 'P2P-INV-23',
        category: 'Presentation',
        name: 'Unavailable-State Integrity',
        description: 'Source-unavailable data is explicitly badged as SOURCE_UNAVAILABLE, never disguised as valid ₹0.'
    }
});

export const P2P_ARCHITECTURAL_INVARIANTS = P2P_INVARIANTS;

/**
 * Monetary Domain Bounds vs. Business Transaction Limits
 * - MIN_PAISE & MAX_PAISE: Signed 64-bit integer representable domain [-2^63, 2^63 - 1]
 * - MAX_TRANSACTION_PAISE: ₹100 Crore business-risk limit (1,000,000,000 INR * 100 paise = 100,000,000,000 paise)
 */
export const MIN_PAISE = -9_223_372_036_854_775_808n;
export const MAX_PAISE =  9_223_372_036_854_775_807n;
export const MAX_TRANSACTION_PAISE = 100_000_000_000n; // ₹100 Crore in integer paise (1,000,000,000 INR * 100 paise)

export class P2PValidationError extends Error {
    constructor(message, code = 'P2P_VALIDATION_ERROR') {
        super(message);
        this.name = 'P2PValidationError';
        this.code = code;
    }
}

/**
 * Validates that an amount in paise stays within 64-bit integer domain boundaries and business limits.
 * Throws deterministic P2PValidationError if violated. Never silently clamps.
 */
export function validatePaiseBounds(paise, { allowNegative = false, maxLimit = MAX_TRANSACTION_PAISE, fieldName = 'Amount' } = {}) {
    let p;
    try {
        p = typeof paise === 'bigint' ? paise : toBigIntPaise(paise);
    } catch (err) {
        throw new P2PValidationError(`Invalid monetary input for ${fieldName}: ${err.message}`, 'ERR_INVALID_FORMAT');
    }

    if (p < MIN_PAISE || p > MAX_PAISE) {
        throw new P2PValidationError(
            `${fieldName} value ${p.toString()} overflows signed 64-bit integer domain [${MIN_PAISE}, ${MAX_PAISE}]`,
            'ERR_DOMAIN_OVERFLOW'
        );
    }

    if (!allowNegative && p < 0n) {
        throw new P2PValidationError(
            `${fieldName} cannot be negative (received ${p.toString()} paise)`,
            'ERR_NEGATIVE_AMOUNT'
        );
    }

    if (maxLimit !== null && maxLimit !== undefined) {
        const absP = p < 0n ? -p : p;
        if (absP > maxLimit) {
            throw new P2PValidationError(
                `${fieldName} of ${p.toString()} paise exceeds maximum transaction limit of ${maxLimit.toString()} paise (₹100 Crore)`,
                'ERR_LIMIT_EXCEEDED'
            );
        }
    }

    return p;
}

/**
 * BigInt paise conversion helper.
 * Handles BigInt, integer paise numbers, float rupees strings/numbers, and monetary objects.
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
        if (value.principalPaise !== undefined) return toBigIntPaise(value.principalPaise);
        if (value.amount !== undefined) return toBigIntPaise(value.amount);
    }
    return 0n;
}

/**
 * Deterministic integer division with half-up rounding.
 * Used for interest, fee, and installment calculations.
 * formula: (numerator + (denominator / 2n)) / denominator (for positive values)
 */
export function roundHalfUp(numerator, denominator) {
    if (denominator === 0n) throw new Error('Division by zero in roundHalfUp');
    const num = toBigIntPaise(numerator);
    const den = toBigIntPaise(denominator);

    if (num === 0n) return 0n;

    const isNegative = (num < 0n) !== (den < 0n);
    const absNum = num < 0n ? -num : num;
    const absDen = den < 0n ? -den : den;

    const quotient = (absNum + (absDen / 2n)) / absDen;
    return isNegative ? -quotient : quotient;
}

/**
 * Converts percentage rate to basis points (bps) in BigInt.
 * e.g., 12.5% -> 1250n bps (1% = 100 bps)
 */
export function rateToBps(rate) {
    if (typeof rate === 'bigint') return rate;
    const num = typeof rate === 'number' ? rate : parseFloat(rate) || 0;
    return BigInt(Math.round(num * 100));
}

/**
 * Formats 64-bit integer paise to Indian Rupee (INR) currency string.
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

    const formattedRupees = rupees.toLocaleString('en-IN');
    if (paiseRemainder === 0) {
        return `${sign}${prefix}${formattedRupees}`;
    }
    const paiseStr = paiseRemainder < 10 ? `0${paiseRemainder}` : `${paiseRemainder}`;
    return `${sign}${prefix}${formattedRupees}.${paiseStr}`;
}

/**
 * Converts Indian Rupees (number/string) to 64-bit integer paise (BigInt).
 */
export function rupeesToPaise(rupees) {
    if (rupees === null || rupees === undefined) return 0n;
    if (typeof rupees === 'bigint') return rupees * 100n;
    const num = typeof rupees === 'number' ? rupees : parseFloat(rupees) || 0;
    return BigInt(Math.round(num * 100));
}

/**
 * Converts 64-bit integer paise (BigInt) to floating Rupees for final UI presentation.
 */
export function paiseToRupees(paise) {
    const p = typeof paise === 'bigint' ? paise : toBigIntPaise(paise);
    return Number(p) / 100;
}

export const P2P_SCHEMA_VERSION = 1;

/**
 * Recursively converts any BigInt in an object/array to decimal string for safe JSON.stringify storage.
 * Optionally stamps the current schema version on top-level objects.
 */
export function serializeP2PData(data, { stampVersion = false } = {}) {
    if (data === null || data === undefined) return data;
    if (typeof data === 'bigint') return data.toString();
    if (Array.isArray(data)) return data.map(item => serializeP2PData(item, { stampVersion: false }));
    if (typeof data === 'object') {
        const res = {};
        for (const [k, v] of Object.entries(data)) {
            res[k] = serializeP2PData(v, { stampVersion: false });
        }
        if (stampVersion && !res._schemaVersion) {
            res._schemaVersion = P2P_SCHEMA_VERSION;
        }
        return res;
    }
    return data;
}

/**
 * Hydrates a serialized P2P object, converting all *Paise properties back into BigInt.
 * Robustly migrates legacy numeric/decimal properties and gracefully recovers from corrupt records.
 */
export function hydrateP2PData(data) {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map(hydrateP2PData);
    if (typeof data === 'object') {
        const res = {};
        let hadCorruption = false;

        for (const [k, v] of Object.entries(data)) {
            if (k.endsWith('Paise') && v !== null && v !== undefined) {
                try {
                    if (typeof v === 'string' && v.trim() !== '' && !/^-?\d+$/.test(v.trim())) {
                        res[k] = 0n;
                        hadCorruption = true;
                    } else {
                        res[k] = toBigIntPaise(v);
                    }
                } catch {
                    res[k] = 0n;
                    hadCorruption = true;
                }
            } else if (typeof v === 'object' && v !== null) {
                res[k] = hydrateP2PData(v);
            } else {
                res[k] = v;
            }
        }

        // ── Automatic Legacy Migration (Number/Float -> BigInt Paise) ──
        if (res.principal !== undefined && res.principalPaise === undefined) {
            res.principalPaise = rupeesToPaise(res.principal);
        }
        if (res.outstandingPrincipal !== undefined && res.outstandingPrincipalPaise === undefined) {
            res.outstandingPrincipalPaise = rupeesToPaise(res.outstandingPrincipal);
        }
        if (res.amount !== undefined && res.amountPaise === undefined) {
            res.amountPaise = rupeesToPaise(res.amount);
        }
        if (res.debit !== undefined && res.debitPaise === undefined) {
            res.debitPaise = rupeesToPaise(res.debit);
        }
        if (res.credit !== undefined && res.creditPaise === undefined) {
            res.creditPaise = rupeesToPaise(res.credit);
        }
        if (res.expectedAmount !== undefined && res.expectedAmountPaise === undefined) {
            res.expectedAmountPaise = rupeesToPaise(res.expectedAmount);
        }
        if (res.paidAmount !== undefined && res.paidAmountPaise === undefined) {
            res.paidAmountPaise = rupeesToPaise(res.paidAmount);
        }
        if (res.interestComponent !== undefined && res.interestComponentPaise === undefined) {
            res.interestComponentPaise = rupeesToPaise(res.interestComponent);
        }
        if (res.principalComponent !== undefined && res.principalComponentPaise === undefined) {
            res.principalComponentPaise = rupeesToPaise(res.principalComponent);
        }

        if (hadCorruption) {
            res._corruptionRecovered = true;
        }

        res._schemaVersion = res._schemaVersion || P2P_SCHEMA_VERSION;
        return res;
    }
    return data;
}

