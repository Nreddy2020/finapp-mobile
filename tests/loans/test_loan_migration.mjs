/**
 * tests/loans/test_loan_migration.mjs
 * 
 * LN-08: Legacy Float Migration Suite (15 checks)
 */

import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoanMigrationEngine } from '../../services/loans/loanMigration.js';
import { LoanRepository } from '../../services/loans/loanRepository.js';
import { LOAN_STATUS, LOAN_TYPES } from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-08: LEGACY FLOAT MIGRATION SUITE');
console.log('================================================================\n');

let passCount = 0;
async function test(name, fn) {
    process.stdout.write(`  [RUN] ${name}...`);
    try {
        await fn();
        passCount++;
        console.log(`  [PASS] ${name}`);
    } catch (e) {
        console.error(`  [FAIL] ${name}: ${e.message}`);
        throw e;
    }
}

(async () => {
    // 1. Empty legacy state
    await test('Check 1: inspectLegacyData returns candidateCount 0 when key is empty', async () => {
        await AsyncStorage.removeItem('loans');
        const res = await LoanMigrationEngine.inspectLegacyData();
        assert.strictEqual(res.candidateCount, 0);
    });

    await test('Check 2: migrateToV1 returns NO_LEGACY_RECORDS_FOUND when empty', async () => {
        const res = await LoanMigrationEngine.migrateToV1();
        assert.strictEqual(res.status, 'NO_LEGACY_RECORDS_FOUND');
        assert.strictEqual(res.migratedCount, 0);
    });

    // 2. Synthetic legacy data insertion
    const mockLegacyLoans = [
        {
            id: 'legacy_loan_1',
            name: 'Friend Personal Borrowing',
            lender: 'Rahul Sharma',
            amount: 25000.50, // Float
            outstanding_amount: 15000.50,
            interest_rate: 0.0,
            tenure: 6,
            date: '2025-11-01'
        },
        {
            id: 'legacy_loan_2',
            name: 'HDFC Personal Loan',
            bank: 'HDFC Bank',
            principal: 200000.00,
            outstanding_amount: 0.0, // Fully paid
            interest_rate: 11.5,
            tenure: 24,
            type: 'PERSONAL',
            date: '2024-01-10'
        },
        {
            id: 'legacy_loan_3',
            title: 'Gold Loan',
            bank: 'Muthoot Finance',
            amount: 50000.00,
            outstanding_amount: 50000.00,
            rate: 8.5,
            tenureMonths: 12,
            type: 'GOLD',
            createdAt: '2026-01-15'
        }
    ];

    await test('Check 3: inspectLegacyData detects 3 candidate legacy records', async () => {
        await AsyncStorage.setItem('loans', JSON.stringify(mockLegacyLoans));
        const res = await LoanMigrationEngine.inspectLegacyData();
        assert.strictEqual(res.candidateCount, 3);
    });

    // 3. Execution of Migration
    let manifest;
    await test('Check 4: migrateToV1 executes and returns MIGRATION_COMPLETE status', async () => {
        await LoanRepository.clearAll();
        manifest = await LoanMigrationEngine.migrateToV1();
        assert.strictEqual(manifest.status, 'MIGRATION_COMPLETE');
        assert.strictEqual(manifest.migratedCount, 3);
    });

    await test('Check 5: Manifest includes valid SHA-256 provenance hash', () => {
        assert(manifest.manifestHash);
        assert.strictEqual(typeof manifest.manifestHash, 'string');
        assert.strictEqual(manifest.manifestHash.length, 64);
    });

    await test('Check 6: Total principal paise is accurate sum of all 3 loans', () => {
        // 25000.50 (2500050) + 200000 (20000000) + 50000 (5000000) = 27500050n
        assert.strictEqual(manifest.totalPrincipalPaise, 27500050n);
    });

    // 4. Verification of Migrated Records in V1 Repository
    let facilities;
    await test('Check 7: V1 repository has 3 migrated facilities stored', async () => {
        facilities = await LoanRepository.getAllFacilities({ includeArchived: true });
        assert.strictEqual(facilities.length, 3);
    });

    await test('Check 8: Float ₹25000.50 migrated to exact 2500050n paise without precision loss', () => {
        const f1 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_1');
        assert(f1);
        assert.strictEqual(f1.principalPaise, 2500050n);
        assert.strictEqual(f1.outstandingPrincipalPaise, 1500050n);
        assert.strictEqual(f1.status, LOAN_STATUS.ACTIVE);
    });

    await test('Check 9: Zero outstanding legacy loan automatically assigned LOAN_STATUS.CLOSED', () => {
        const f2 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_2');
        assert(f2);
        assert.strictEqual(f2.outstandingPrincipalPaise, 0n);
        assert.strictEqual(f2.status, LOAN_STATUS.CLOSED);
    });

    await test('Check 10: Loan type GOLD accurately mapped from legacy string', () => {
        const f3 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_3');
        assert(f3);
        assert.strictEqual(f3.loanType, LOAN_TYPES.GOLD);
    });

    await test('Check 11: Lender names fallback cleanly when lender vs bank property used', () => {
        const f1 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_1');
        const f2 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_2');
        assert.strictEqual(f1.lender, 'Rahul Sharma');
        assert.strictEqual(f2.lender, 'HDFC Bank');
    });

    await test('Check 12: Monthly EMI auto-calculated for interest-bearing migrated loans', () => {
        const f2 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_2');
        const f3 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_3');
        assert(f2.monthlyEmiPaise > 0n);
        assert(f3.monthlyEmiPaise > 0n);
    });

    await test('Check 13: Zero-interest migrated loan calculates flat EMI', () => {
        const f1 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_1');
        assert.strictEqual(f1.annualRatePercent, 0.0);
        assert.strictEqual(f1.monthlyEmiPaise, 2500050n / 6n);
    });

    await test('Check 14: Migrated records store metadata indicating legacy origin', () => {
        const f1 = facilities.find(f => f.metadata.legacyId === 'legacy_loan_1');
        assert.strictEqual(f1.metadata.migrationSource, 'STORAGE_KEYS_LOANS_V0');
        assert(f1.metadata.migratedAt);
    });

    await test('Check 15: Migration preserves original legacy storage key without deleting it', async () => {
        const raw = await AsyncStorage.getItem('loans');
        assert(raw !== null);
        assert(JSON.parse(raw).length === 3);
    });

    console.log('\n================================================================');
    console.log(`🎉 LN-08 PASSED CERTIFICATION (${passCount} / 15 CHECKS)`);
    console.log('================================================================\n');
})();
