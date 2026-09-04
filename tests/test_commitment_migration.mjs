/**
 * tests/test_commitment_migration.mjs
 * 
 * Verifies legacy floating-point subscription migration to strict MoneyPaise commitments.
 */

import assert from 'node:assert';
import { CommitmentsService } from '../services/commitments/commitmentsService.js';
import {
    CommitmentType,
    FinancialNature,
    AmountMode,
    RecurrenceFrequency,
    CommitmentStatus,
    validateCommitment
} from '../services/commitments/commitmentContracts.js';

console.log('--- START TEST SUITE: LEGACY SUBSCRIPTION MIGRATION ---');

// 1. Standard active legacy subscription
const legacyList = [
    {
        id: 'sub_netflix',
        name: 'Netflix Premium',
        amount: 649,
        frequency: 'Monthly',
        nextDate: '2026-09-15',
        active: true
    },
    {
        id: 'sub_prime',
        name: 'Amazon Prime',
        amount: 1499,
        frequency: 'Yearly',
        nextDate: '2026-12-01',
        active: true
    },
    {
        id: 'sub_fraction',
        name: 'Cloud Backup',
        amount: 199.50,
        frequency: 'Monthly',
        nextDate: '2026-09-20',
        active: true
    },
    {
        id: 'sub_cancelled',
        name: 'Old Gym Pass',
        amount: 2500,
        frequency: 'Monthly',
        nextDate: '2026-08-01',
        active: false
    },
    {
        id: 'sub_str_amount',
        name: 'Domain Registrar',
        amount: '899.00',
        frequency: 'Yearly',
        nextDate: '2027-01-10',
        active: true
    }
];

const migrated = CommitmentsService.migrateLegacySubscriptions(legacyList);

assert.strictEqual(migrated.length, 5);

// 1. Netflix check
const netflix = migrated[0];
assert.strictEqual(netflix.id, 'sub_netflix');
assert.strictEqual(netflix.name, 'Netflix Premium');
assert.strictEqual(netflix.type, CommitmentType.SUBSCRIPTION);
assert.strictEqual(netflix.financialNature, FinancialNature.EXPENSE);
assert.strictEqual(netflix.amountMode, AmountMode.FIXED);
assert.strictEqual(netflix.amount.paise, '64900');
assert.strictEqual(netflix.amount.currency, 'INR');
assert.strictEqual(netflix.frequency, RecurrenceFrequency.MONTHLY);
assert.strictEqual(netflix.status, CommitmentStatus.ACTIVE);
assert.strictEqual(netflix.migratedFromLegacy, true);
console.log('  ✓ successfully migrates standard monthly subscription with exact integer paise');

// 2. Yearly check
const prime = migrated[1];
assert.strictEqual(prime.frequency, RecurrenceFrequency.YEARLY);
assert.strictEqual(prime.amount.paise, '149900');
console.log('  ✓ correctly preserves yearly recurrence frequency');

// 3. Fractional rupee check
const cloud = migrated[2];
assert.strictEqual(cloud.amount.paise, '19950');
console.log('  ✓ preserves fractional rupee amounts without floating-point drift');

// 4. Inactive -> CANCELLED status check
const gym = migrated[3];
assert.strictEqual(gym.status, CommitmentStatus.CANCELLED);
console.log('  ✓ maps inactive legacy subscriptions to CANCELLED status');

// 5. String amount check
const domain = migrated[4];
assert.strictEqual(domain.amount.paise, '89900');
console.log('  ✓ sanitizes and parses string amounts safely');

// 6. Validates against formal domain contract
for (const c of migrated) {
    assert.doesNotThrow(() => validateCommitment(c));
}
console.log('  ✓ all migrated commitments strictly conform to domain validation rules');

// 7. Empty/null input resilience
const emptyMigrated = CommitmentsService.migrateLegacySubscriptions(null);
assert.deepStrictEqual(emptyMigrated, []);
console.log('  ✓ handles null and empty input gracefully');

console.log('\n--- ALL 7 LEGACY MIGRATION ASSERTIONS PASSED ---\n');
