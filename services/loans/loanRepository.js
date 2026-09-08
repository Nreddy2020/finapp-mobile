/**
 * services/loans/loanRepository.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Multi-Facility Persistence Layer.
 * Implements atomic save envelopes, SHA-256 checksums, BigInt JSON serialization,
 * corruption quarantine, and centralized lifecycle state transitions.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOAN_CONSTANTS, LOAN_STATUS, transitionLoanState, toPaise } from './loanContracts.js';
import { validateLoanFacility } from './loanValidation.js';
import { calculateMonthlyEmiPaise } from './loanEngine.js';
import { generateAmortizationSchedule } from './loanAmortization.js';
import { LoanAuditTrail, computeSha256 } from './loanAudit.js';

const STORAGE_KEY = LOAN_CONSTANTS.STORAGE_KEY_V1;

// Custom JSON replacer and reviver for BigInt support
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

export function computeSha256Digest(dataString) {
    return computeSha256(dataString);
}

export const LoanRepository = {
    /**
     * Load raw envelope from storage with tamper detection
     */
    async loadEnvelope() {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return {
                schemaVersion: LOAN_CONSTANTS.SCHEMA_VERSION,
                facilities: {},
                auditTrail: [],
                quarantine: [],
                lastModified: new Date().toISOString()
            };
        }

        try {
            const parsed = JSON.parse(raw, bigIntReviver);
            if (parsed.checksum) {
                const { checksum, ...content } = parsed;
                const contentStr = JSON.stringify(content, bigIntReplacer);
                const computed = computeSha256Digest(contentStr);
                if (computed !== checksum) {
                    console.warn(`[LoanRepository] Checksum mismatch in loan store. Fail-closed to quarantine.`);
                    return {
                        schemaVersion: LOAN_CONSTANTS.SCHEMA_VERSION,
                        facilities: {},
                        auditTrail: [],
                        quarantine: [parsed],
                        corrupted: true,
                        lastModified: new Date().toISOString()
                    };
                }
            }
            return parsed;
        } catch (e) {
            console.error(`[LoanRepository] Failed to parse store: ${e.message}`);
            return {
                schemaVersion: LOAN_CONSTANTS.SCHEMA_VERSION,
                facilities: {},
                auditTrail: [],
                quarantine: [{ rawData: raw, error: e.message }],
                corrupted: true,
                lastModified: new Date().toISOString()
            };
        }
    },

    /**
     * Save envelope atomically with SHA-256 checksum
     */
    async saveEnvelope(envelope) {
        const payload = {
            ...envelope,
            lastModified: new Date().toISOString()
        };
        const { checksum, ...contentToHash } = payload;
        const contentStr = JSON.stringify(contentToHash, bigIntReplacer);
        const computedChecksum = computeSha256Digest(contentStr);

        const finalEnvelope = {
            ...contentToHash,
            checksum: computedChecksum
        };

        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalEnvelope, bigIntReplacer));
        return finalEnvelope;
    },

    /**
     * Get all facilities with optional status filter
     */
    async getAllFacilities(options = {}) {
        const envelope = await this.loadEnvelope();
        const list = Object.values(envelope.facilities || {});
        if (options.status) {
            return list.filter(f => f.status === options.status);
        }
        if (!options.includeArchived) {
            return list.filter(f => f.status !== LOAN_STATUS.ARCHIVED);
        }
        return list;
    },

    /**
     * Get a specific facility by ID
     */
    async getFacilityById(id) {
        const envelope = await this.loadEnvelope();
        return envelope.facilities ? envelope.facilities[id] || null : null;
    },

    /**
     * Create or update a loan facility
     */
    async saveFacility(facilityData, options = {}) {
        validateLoanFacility(facilityData);
        const envelope = await this.loadEnvelope();
        envelope.facilities = envelope.facilities || {};

        const existing = envelope.facilities[facilityData.id];
        let facility = { ...facilityData };

        // Handle State Transition if status changed
        if (existing && existing.status !== facility.status) {
            const transitionResult = transitionLoanState(existing.status, facility.status, {
                outstandingPrincipalPaise: facility.outstandingPrincipalPaise,
                monthlyEmiPaise: facility.monthlyEmiPaise,
                evidence: options.evidence || 'REPOSITORY_SAVE'
            });
            facility.status = transitionResult.state;
        } else if (!existing) {
            facility.status = facility.status || LOAN_STATUS.ACTIVE;
        }

        // Auto-calculate standard EMI if missing
        if (!facility.monthlyEmiPaise || BigInt(facility.monthlyEmiPaise) <= 0n) {
            facility.monthlyEmiPaise = calculateMonthlyEmiPaise(
                facility.principalPaise,
                facility.annualRatePercent,
                facility.tenureMonths
            );
        }

        // Initialize outstanding principal if new
        if (facility.outstandingPrincipalPaise === undefined) {
            facility.outstandingPrincipalPaise = BigInt(facility.principalPaise);
        } else {
            facility.outstandingPrincipalPaise = BigInt(facility.outstandingPrincipalPaise);
        }

        facility.updatedAt = new Date().toISOString();
        if (!facility.createdAt) facility.createdAt = facility.updatedAt;

        envelope.facilities[facility.id] = facility;

        // Append to audit trail
        const audit = new LoanAuditTrail(envelope.auditTrail || []);
        audit.appendEvent(existing ? 'FACILITY_MODIFIED' : 'FACILITY_CREATED', {
            facilityId: facility.id,
            name: facility.name,
            principalPaise: facility.principalPaise.toString(),
            status: facility.status
        });
        envelope.auditTrail = audit.getEvents();

        await this.saveEnvelope(envelope);
        return facility;
    },

    /**
     * Record an installment payment or partial prepayment against a facility
     */
    async recordPayment(facilityId, paymentPaise, options = {}) {
        const envelope = await this.loadEnvelope();
        const facility = envelope.facilities ? envelope.facilities[facilityId] : null;

        if (!facility) {
            throw new Error(`FACILITY_NOT_FOUND: Loan ${facilityId} does not exist`);
        }

        const payment = BigInt(paymentPaise);
        if (payment <= 0n) {
            throw new Error(`INVALID_PAYMENT_AMOUNT: Payment must be > 0 paise`);
        }

        const currentOutstanding = BigInt(facility.outstandingPrincipalPaise);
        if (payment > currentOutstanding) {
            throw new Error(`OVERPAYMENT_REJECTED: Payment ${payment} exceeds outstanding ${currentOutstanding}`);
        }

        const newOutstanding = currentOutstanding - payment;
        facility.outstandingPrincipalPaise = newOutstanding;

        // Auto transition to CLOSED if balance reaches 0
        if (newOutstanding === 0n) {
            const transition = transitionLoanState(facility.status, LOAN_STATUS.CLOSED, {
                outstandingPrincipalPaise: 0n,
                evidence: 'PAYMENT_BALANCE_REACHED_ZERO'
            });
            facility.status = transition.state;
        }

        facility.updatedAt = new Date().toISOString();
        envelope.facilities[facilityId] = facility;

        const audit = new LoanAuditTrail(envelope.auditTrail || []);
        audit.appendEvent('PAYMENT_RECORDED', {
            facilityId,
            paymentPaise: payment.toString(),
            newOutstandingPaise: newOutstanding.toString(),
            status: facility.status
        });
        envelope.auditTrail = audit.getEvents();

        await this.saveEnvelope(envelope);
        return facility;
    },

    /**
     * Archive a facility (soft delete from active views)
     */
    async archiveFacility(facilityId) {
        const envelope = await this.loadEnvelope();
        const facility = envelope.facilities ? envelope.facilities[facilityId] : null;

        if (!facility) {
            throw new Error(`FACILITY_NOT_FOUND: Loan ${facilityId} does not exist`);
        }

        const transition = transitionLoanState(facility.status, LOAN_STATUS.ARCHIVED, {
            evidence: 'EXPLICIT_USER_ARCHIVAL'
        });
        facility.status = transition.state;
        facility.updatedAt = new Date().toISOString();

        envelope.facilities[facilityId] = facility;

        const audit = new LoanAuditTrail(envelope.auditTrail || []);
        audit.appendEvent('FACILITY_ARCHIVED', { facilityId });
        envelope.auditTrail = audit.getEvents();

        await this.saveEnvelope(envelope);
        return facility;
    },

    /**
     * Clear all facilities (for test isolation)
     */
    async clearAll() {
        await AsyncStorage.removeItem(STORAGE_KEY);
    }
};
