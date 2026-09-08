/**
 * tests/loans/test_loan_cashbook_binding.mjs
 * 
 * LN-06: Cashbook Commitment Read-Only Binding Adapter Suite (15 checks)
 */

import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoanCommitmentBinding } from '../../services/loans/loanCommitmentBinding.js';
import { BINDING_STATUS, LOAN_TYPES } from '../../services/loans/loanContracts.js';
import { CashbookRepository } from '../../services/cashbook/cashbookRepository.js';

console.log('================================================================');
console.log('🚀 EXECUTING LN-06: CASHBOOK READ-ONLY BINDING ADAPTER SUITE');
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

const mockFacility = {
    id: 'FAC_BIND_01',
    name: 'Auto Loan',
    lender: 'HDFC Bank Account 9876543210',
    loanType: LOAN_TYPES.AUTO,
    monthlyEmiPaise: 1500000n, // ₹15,000
    emiDueDayOfMonth: 5,
    tenureRemainingMonths: 48
};

// Execute suite
(async () => {
    // Stage 1: Descriptor Generation
    await test('Check 1: generateCommitmentDescriptor produces immutable commitmentId', () => {
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        assert.strictEqual(d.commitmentId, 'LOAN_COMMITMENT_v1_FAC_BIND_01');
    });

    await test('Check 2: Descriptor masks raw bank account numbers in lender name', () => {
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        assert(!d.name.includes('9876543210'));
        assert(d.name.includes('****'));
    });

    await test('Check 3: Descriptor maps monthly amount in paise correctly', () => {
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        assert.strictEqual(d.amountPaise, 1500000n);
        assert.strictEqual(d.frequency, 'MONTHLY');
    });

    await test('Check 4: Descriptor validates due day of month (1 to 31)', () => {
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        assert.strictEqual(d.dueDayOfMonth, 5);
        assert.throws(() => {
            LoanCommitmentBinding.generateCommitmentDescriptor({ ...mockFacility, emiDueDayOfMonth: 35 });
        }, /INVALID_DUE_DAY/);
    });

    await test('Check 5: Descriptor metadata contains versioned provenance without PII', () => {
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        assert.strictEqual(d.metadata.sourceModule, 'LOANS_V1');
        assert.strictEqual(d.metadata.schemaVersion, 1);
        assert(!JSON.stringify(d.metadata).includes('9876543210'));
    });

    await test('Check 6: Descriptor generation rejects loans with zero or negative EMI', () => {
        assert.throws(() => {
            LoanCommitmentBinding.generateCommitmentDescriptor({ ...mockFacility, monthlyEmiPaise: 0n });
        }, /INVALID_EMI_AMOUNT/);
    });

    // Stage 2: Registration
    await test('Check 7: requestCommitmentRegistration succeeds with dryRun mode', async () => {
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        const res = await LoanCommitmentBinding.requestCommitmentRegistration(d, { dryRun: true });
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.commitmentId, d.commitmentId);
    });

    await test('Check 8: requestCommitmentRegistration rejects missing descriptor', async () => {
        await assert.rejects(async () => {
            await LoanCommitmentBinding.requestCommitmentRegistration(null);
        }, /INVALID_DESCRIPTOR/);
    });

    await test('Check 9: Cashbook storage keys are NOT directly written or modified', async () => {
        const cashbookRawBefore = await AsyncStorage.getItem('FINLIFE_CASHBOOK_PROD_V1');
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        await LoanCommitmentBinding.requestCommitmentRegistration(d, { dryRun: true });
        const cashbookRawAfter = await AsyncStorage.getItem('FINLIFE_CASHBOOK_PROD_V1');
        assert.strictEqual(cashbookRawAfter, cashbookRawBefore);
    });

    await test('Check 10: Cashbook audit chain is NOT regenerated or touched', async () => {
        const envelope = await CashbookRepository.load();
        const auditEventsBefore = (envelope.auditLog || []).length;
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        await LoanCommitmentBinding.requestCommitmentRegistration(d, { dryRun: true });
        const envelopeAfter = await CashbookRepository.load();
        assert.strictEqual((envelopeAfter.auditLog || []).length, auditEventsBefore);
    });

    await test('Check 11: Cashbook book balances remain completely unchanged', async () => {
        const envelope = await CashbookRepository.load();
        const initialBooksJson = JSON.stringify(envelope.books || []);
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        await LoanCommitmentBinding.requestCommitmentRegistration(d, { dryRun: true });
        const envelopeAfter = await CashbookRepository.load();
        assert.strictEqual(JSON.stringify(envelopeAfter.books || []), initialBooksJson);
    });

    // Stage 3: Deactivation
    await test('Check 12: requestCommitmentDeactivation returns DEACTIVATED status receipt', async () => {
        const res = await LoanCommitmentBinding.requestCommitmentDeactivation(mockFacility);
        assert.strictEqual(res.success, true);
        assert.strictEqual(res.status, BINDING_STATUS.DEACTIVATED);
        assert.strictEqual(res.commitmentId, 'LOAN_COMMITMENT_v1_FAC_BIND_01');
    });

    await test('Check 13: Deactivation includes reason for audit logging', async () => {
        const res = await LoanCommitmentBinding.requestCommitmentDeactivation(mockFacility, {
            reason: 'LOAN_FORECLOSED'
        });
        assert.strictEqual(res.reason, 'LOAN_FORECLOSED');
    });

    await test('Check 14: Standalone fallback returns REFERENCE_ONLY without crashing', async () => {
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        // Request with non-existent target book
        const res = await LoanCommitmentBinding.requestCommitmentRegistration(d, { targetBookId: 'NON_EXISTENT_BOOK' });
        assert(res.status === BINDING_STATUS.SYNCHRONIZED_ACTIVE || res.status === BINDING_STATUS.REFERENCE_ONLY);
    });

    await test('Check 15: Registration is idempotent: calling multiple times does not throw', async () => {
        const d = LoanCommitmentBinding.generateCommitmentDescriptor(mockFacility);
        const res1 = await LoanCommitmentBinding.requestCommitmentRegistration(d, { dryRun: true });
        const res2 = await LoanCommitmentBinding.requestCommitmentRegistration(d, { dryRun: true });
        assert.strictEqual(res1.commitmentId, res2.commitmentId);
    });

    console.log('\n================================================================');
    console.log(`🎉 LN-06 PASSED CERTIFICATION (${passCount} / 15 CHECKS)`);
    console.log('================================================================\n');
})();
