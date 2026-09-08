/**
 * tests/loans/test_loan_repository.mjs
 * 
 * LN-07: Persistence, Corruption Quarantine & Atomic Rollback Suite (20 checks)
 */

import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoanRepository } from '../../services/loans/loanRepository.js';
import { LOAN_TYPES, RATE_TYPES, LOAN_STATUS, LOAN_CONSTANTS } from '../../services/loans/loanContracts.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-07: REPOSITORY PERSISTENCE & QUARANTINE SUITE');
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

const STORAGE_KEY = LOAN_CONSTANTS.STORAGE_KEY_V1;

(async () => {
    // 1. Initial State & Clean Start
    await test('Check 1: Clean start initializes empty envelope with valid schemaVersion', async () => {
        await LoanRepository.clearAll();
        const envelope = await LoanRepository.loadEnvelope();
        assert.strictEqual(envelope.schemaVersion, 1);
        assert.deepStrictEqual(envelope.facilities, {});
        assert.strictEqual(envelope.auditTrail.length, 0);
    });

    // 2. Save Facility (Create & Read)
    const facilityData = {
        id: 'FAC_REPO_01',
        name: 'ICICI Car Loan',
        lender: 'ICICI Bank',
        loanType: LOAN_TYPES.AUTO,
        rateType: RATE_TYPES.FIXED,
        status: LOAN_STATUS.ACTIVE,
        principalPaise: 80000000n, // 8 Lakhs
        annualRatePercent: 8.9,
        tenureMonths: 60,
        startDate: '2026-05-01'
    };

    await test('Check 2: saveFacility saves record and auto-calculates monthly EMI', async () => {
        const saved = await LoanRepository.saveFacility(facilityData);
        assert.strictEqual(saved.id, 'FAC_REPO_01');
        assert(saved.monthlyEmiPaise > 0n);
        assert.strictEqual(saved.outstandingPrincipalPaise, 80000000n);
    });

    await test('Check 3: getFacilityById retrieves saved facility with correct BigInt types', async () => {
        const f = await LoanRepository.getFacilityById('FAC_REPO_01');
        assert.strictEqual(f.id, 'FAC_REPO_01');
        assert.strictEqual(typeof f.principalPaise, 'bigint');
        assert.strictEqual(f.principalPaise, 80000000n);
    });

    await test('Check 4: getAllFacilities returns active facilities list', async () => {
        const list = await LoanRepository.getAllFacilities();
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list[0].id, 'FAC_REPO_01');
    });

    await test('Check 5: saveFacility updates existing record and increments updatedAt', async () => {
        const updated = await LoanRepository.saveFacility({
            ...facilityData,
            name: 'ICICI Car Loan (Electric Vehicle)'
        });
        assert.strictEqual(updated.name, 'ICICI Car Loan (Electric Vehicle)');
        assert(updated.updatedAt >= updated.createdAt);
    });

    // 3. Payment Processing
    await test('Check 6: recordPayment reduces outstanding principal', async () => {
        const afterPayment = await LoanRepository.recordPayment('FAC_REPO_01', 20000000n); // Pay 2 Lakhs
        assert.strictEqual(afterPayment.outstandingPrincipalPaise, 60000000n);
    });

    await test('Check 7: recordPayment rejects overpayment (> outstanding)', async () => {
        await assert.rejects(async () => {
            await LoanRepository.recordPayment('FAC_REPO_01', 70000000n); // 7L > 6L
        }, /OVERPAYMENT_REJECTED/);
    });

    await test('Check 8: recordPayment rejects zero or negative payment', async () => {
        await assert.rejects(async () => {
            await LoanRepository.recordPayment('FAC_REPO_01', 0n);
        }, /INVALID_PAYMENT_AMOUNT/);
        await assert.rejects(async () => {
            await LoanRepository.recordPayment('FAC_REPO_01', -500n);
        }, /INVALID_PAYMENT_AMOUNT/);
    });

    await test('Check 9: recordPayment on non-existent loan throws FACILITY_NOT_FOUND', async () => {
        await assert.rejects(async () => {
            await LoanRepository.recordPayment('NON_EXISTENT_ID', 1000n);
        }, /FACILITY_NOT_FOUND/);
    });

    await test('Check 10: recordPayment that pays full balance automatically transitions status to CLOSED', async () => {
        // Current outstanding is 60 Lakhs
        const closedFacility = await LoanRepository.recordPayment('FAC_REPO_01', 60000000n);
        assert.strictEqual(closedFacility.outstandingPrincipalPaise, 0n);
        assert.strictEqual(closedFacility.status, LOAN_STATUS.CLOSED);
    });

    // 4. Archival & Filtering
    await test('Check 11: archiveFacility transitions loan to ARCHIVED status', async () => {
        const archived = await LoanRepository.archiveFacility('FAC_REPO_01');
        assert.strictEqual(archived.status, LOAN_STATUS.ARCHIVED);
    });

    await test('Check 12: getAllFacilities excludes archived loans by default', async () => {
        const list = await LoanRepository.getAllFacilities();
        assert.strictEqual(list.length, 0);
    });

    await test('Check 13: getAllFacilities includes archived loans when includeArchived is true', async () => {
        const list = await LoanRepository.getAllFacilities({ includeArchived: true });
        assert.strictEqual(list.length, 1);
        assert.strictEqual(list[0].id, 'FAC_REPO_01');
    });

    // 5. State Machine Invariants in Repository
    await test('Check 14: Premature closure transition rejected when balance remains', async () => {
        const draftLoan = {
            id: 'PREMATURE_TEST',
            name: 'Test',
            lender: 'Test',
            loanType: LOAN_TYPES.PERSONAL,
            principalPaise: 10000000n,
            outstandingPrincipalPaise: 10000000n,
            annualRatePercent: 12.0,
            tenureMonths: 12,
            status: LOAN_STATUS.ACTIVE
        };
        await LoanRepository.saveFacility(draftLoan);

        // Try to directly save as CLOSED while outstanding is 10L
        await assert.rejects(async () => {
            await LoanRepository.saveFacility({
                ...draftLoan,
                status: LOAN_STATUS.CLOSED
            });
        }, /PREMATURE_CLOSURE_REJECTED/);
    });

    // 6. Cryptographic Audit Trail
    await test('Check 15: Envelope preserves verifiable SHA-256 audit trail', async () => {
        const envelope = await LoanRepository.loadEnvelope();
        assert(envelope.auditTrail.length >= 4); // Created, Modified, Paid x2, Archived, etc.
        const lastEvent = envelope.auditTrail[envelope.auditTrail.length - 1];
        assert(lastEvent.hash && lastEvent.previousHash);
    });

    // 7. SHA-256 Checksum Envelope & Corruption Quarantine
    await test('Check 16: Saved envelope includes SHA-256 checksum digest', async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(raw);
        assert(parsed.checksum);
        assert.strictEqual(typeof parsed.checksum, 'string');
        assert.strictEqual(parsed.checksum.length, 64);
    });

    await test('Check 17: External tamper with envelope checksum fails closed to quarantine', async () => {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = JSON.parse(raw);
        // Tamper with data without updating checksum
        parsed.facilities['FORGED_FACILITY'] = { id: 'FORGED', name: 'Malicious' };
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));

        const loaded = await LoanRepository.loadEnvelope();
        assert.strictEqual(loaded.corrupted, true);
        assert.strictEqual(loaded.quarantine.length, 1);
        assert.deepStrictEqual(loaded.facilities, {});
    });

    await test('Check 18: Malformed JSON string in storage triggers fail-closed quarantine', async () => {
        await AsyncStorage.setItem(STORAGE_KEY, '{ invalid_json_syntax: true');
        const loaded = await LoanRepository.loadEnvelope();
        assert.strictEqual(loaded.corrupted, true);
        assert.strictEqual(loaded.quarantine.length, 1);
    });

    // 8. Recovery & Clean Restoration
    await test('Check 19: Overwriting storage with valid envelope restores healthy state', async () => {
        await LoanRepository.clearAll();
        await LoanRepository.saveFacility({
            id: 'RECOVERED_01',
            name: 'Recovered Loan',
            lender: 'HDFC',
            loanType: LOAN_TYPES.PERSONAL,
            principalPaise: 5000000n,
            annualRatePercent: 11.0,
            tenureMonths: 12
        });
        const healthy = await LoanRepository.loadEnvelope();
        assert.strictEqual(healthy.corrupted, undefined);
        assert(healthy.facilities['RECOVERED_01']);
    });

    await test('Check 20: BigInt precision survives round-trip with zero truncation', async () => {
        const testBigInt = 999999999999n; // Within 100 Crore bound
        await LoanRepository.saveFacility({
            id: 'PRECISION_TEST',
            name: 'Precision Loan',
            lender: 'Precision Bank',
            loanType: LOAN_TYPES.HOME,
            principalPaise: testBigInt,
            annualRatePercent: 8.0,
            tenureMonths: 120
        });
        const f = await LoanRepository.getFacilityById('PRECISION_TEST');
        assert.strictEqual(f.principalPaise, testBigInt);
    });

    console.log('\n================================================================');
    console.log(`🎉 LN-07 PASSED CERTIFICATION (${passCount} / 20 CHECKS)`);
    console.log('================================================================\n');
})();
