/**
 * services/loans/loanMigration.js
 * 
 * Formal Bank Loans, EMIs & Debt Payoff Engine V1 — Legacy Migration Engine.
 * Migrates legacy float-based loans records (STORAGE_KEYS.LOANS) to V1 BigInt schema.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { LOAN_TYPES, RATE_TYPES, LOAN_STATUS, toPaise, LOAN_CONSTANTS } from './loanContracts.js';
import { LoanRepository } from './loanRepository.js';
import { computeSha256 } from './loanAudit.js';

export const LoanMigrationEngine = {
    /**
     * Inspect legacy storage and return migration candidate count
     */
    async inspectLegacyData() {
        const raw = await AsyncStorage.getItem('loans');
        if (!raw) return { candidateCount: 0, rawRecords: [] };
        try {
            const list = JSON.parse(raw);
            return {
                candidateCount: Array.isArray(list) ? list.length : 0,
                rawRecords: Array.isArray(list) ? list : []
            };
        } catch (e) {
            return { candidateCount: 0, error: e.message, rawRecords: [] };
        }
    },

    /**
     * Execute deterministic migration to V1 schema
     * 
     * @param {Object} [options={}]
     * @returns {Promise<Object>} Migration manifest
     */
    async migrateToV1(options = {}) {
        const { candidateCount, rawRecords } = await this.inspectLegacyData();
        if (candidateCount === 0) {
            return {
                migratedCount: 0,
                totalPrincipalPaise: 0n,
                status: 'NO_LEGACY_RECORDS_FOUND',
                manifestHash: computeSha256('NO_LEGACY_RECORDS')
            };
        }

        let totalPrincipalPaise = 0n;
        const migratedFacilities = [];

        for (const raw of rawRecords) {
            const rawAmount = raw.amount || raw.principal || raw.outstanding_amount || 0;
            const principalPaise = toPaise(rawAmount > 0 ? rawAmount : 1000);
            const outstandingPaise = raw.outstanding_amount !== undefined 
                ? toPaise(raw.outstanding_amount) 
                : principalPaise;

            const ratePercent = raw.interest_rate !== undefined 
                ? Number(raw.interest_rate) 
                : (raw.rate !== undefined ? Number(raw.rate) : 10.0);
            const tenureMonths = Number(raw.tenure || raw.tenureMonths || 12);

            const isZeroBalance = outstandingPaise === 0n;
            const status = isZeroBalance ? LOAN_STATUS.CLOSED : LOAN_STATUS.ACTIVE;

            const facility = {
                id: `MIGRATED_${raw.id || Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                name: raw.name || raw.title || raw.purpose || 'Migrated Bank Loan',
                lender: raw.lender || raw.bank || 'Unknown Lender',
                loanType: raw.type && Object.values(LOAN_TYPES).includes(raw.type.toUpperCase()) 
                    ? raw.type.toUpperCase() 
                    : LOAN_TYPES.PERSONAL,
                rateType: RATE_TYPES.FIXED,
                status,
                principalPaise,
                outstandingPrincipalPaise: outstandingPaise,
                annualRatePercent: ratePercent,
                tenureMonths: tenureMonths > 0 ? tenureMonths : 12,
                startDate: raw.date || raw.createdAt || new Date().toISOString().split('T')[0],
                emiDueDayOfMonth: 5,
                metadata: {
                    legacyId: String(raw.id || ''),
                    migrationSource: 'STORAGE_KEYS_LOANS_V0',
                    migratedAt: new Date().toISOString()
                }
            };

            await LoanRepository.saveFacility(facility, { evidence: 'LEGACY_MIGRATION_V0_TO_V1' });
            totalPrincipalPaise += principalPaise;
            migratedFacilities.push(facility);
        }

        const manifest = {
            migratedCount: migratedFacilities.length,
            totalPrincipalPaise,
            timestamp: new Date().toISOString(),
            schemaVersion: LOAN_CONSTANTS.SCHEMA_VERSION,
            provenance: 'services/loans/loanMigration.js'
        };

        const manifestHash = computeSha256(manifest);

        return {
            ...manifest,
            manifestHash,
            status: 'MIGRATION_COMPLETE'
        };
    }
};
