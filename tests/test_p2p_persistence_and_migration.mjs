/**
 * tests/test_p2p_persistence_and_migration.mjs
 * 
 * FinLife P2P Network — Persistence, Storage Reload, Schema Migration & Recovery Test Suite.
 * 
 * Verifies:
 * 1. BigInt to decimal-string serialization.
 * 2. Decimal-string to BigInt hydration.
 * 3. Cold storage persistence, memory cache wipe, and reload.
 * 4. App restart simulation with fresh service state.
 * 5. Legacy numeric/float schema migration to BigInt paise.
 * 6. Backup export, mutation resilience, and exact state restoration.
 * 7. Corrupt or malformed string recovery without crashing.
 * 8. Schema versioning (_schemaVersion: 1).
 */

import assert from 'assert';
import {
    serializeP2PData,
    hydrateP2PData,
    toBigIntPaise,
    rupeesToPaise,
    paiseToRupees,
    P2P_SCHEMA_VERSION
} from '../components/p2p/p2pContracts.js';
import { P2PService } from '../services/p2pService.js';
import { saveData, loadData, STORAGE_KEYS } from '../services/storage.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
    total++;
    try {
        fn();
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${desc}`);
        console.error(err);
        throw err;
    }
}

async function itAsync(desc, fn) {
    total++;
    try {
        await fn();
        passed++;
    } catch (err) {
        console.error(`❌ FAIL: ${desc}`);
        console.error(err);
        throw err;
    }
}

export async function runPersistenceAndMigrationTests() {
    passed = 0;
    total = 0;

    // 1. Serialization of BigInt to Decimal String
    it('serializeP2PData converts arbitrary BigInt values into pure decimal strings', () => {
        const payload = {
            id: 'loan_101',
            principalPaise: 250000000n,
            expectedPaise: 5352913n,
            subItems: [
                { amountPaise: 100000n },
                { amountPaise: 200000n }
            ]
        };

        const serialized = serializeP2PData(payload, { stampVersion: true });
        assert.strictEqual(typeof serialized.principalPaise, 'string');
        assert.strictEqual(serialized.principalPaise, '250000000');
        assert.strictEqual(serialized.expectedPaise, '5352913');
        assert.strictEqual(serialized.subItems[0].amountPaise, '100000');
        assert.strictEqual(serialized._schemaVersion, P2P_SCHEMA_VERSION);

        // Standard JSON.stringify must succeed with zero BigInt serialization errors
        const jsonString = JSON.stringify(serialized);
        assert.ok(jsonString.includes('"principalPaise":"250000000"'));
    });

    // 2. Hydration of Decimal String to BigInt
    it('hydrateP2PData restores decimal strings back to JavaScript BigInt', () => {
        const serialized = {
            id: 'loan_101',
            principalPaise: '250000000',
            expectedPaise: '5352913',
            subItems: [
                { amountPaise: '100000' }
            ]
        };

        const hydrated = hydrateP2PData(serialized);
        assert.strictEqual(typeof hydrated.principalPaise, 'bigint');
        assert.strictEqual(hydrated.principalPaise, 250000000n);
        assert.strictEqual(hydrated.expectedPaise, 5352913n);
        assert.strictEqual(hydrated.subItems[0].amountPaise, 100000n);
    });

    // 3. Legacy Floating-Point and Numeric Schema Migration
    it('hydrateP2PData automatically migrates legacy numeric rupee fields to *Paise BigInts', () => {
        const legacyLoan = {
            id: 'legacy_loan_1',
            principal: 50000.5, // 50,000 rupees and 50 paise
            outstandingPrincipal: 25000.25,
            amount: 50000.5,
            debit: 50000.5,
            credit: 0
        };

        const migrated = hydrateP2PData(legacyLoan);
        assert.strictEqual(typeof migrated.principalPaise, 'bigint');
        assert.strictEqual(migrated.principalPaise, 5000050n); // Exact paise conversion
        assert.strictEqual(migrated.outstandingPrincipalPaise, 2500025n);
        assert.strictEqual(migrated.amountPaise, 5000050n);
        assert.strictEqual(migrated.debitPaise, 5000050n);
        assert.strictEqual(migrated.creditPaise, 0n);
    });

    // 4. Corrupt and Malformed Record Recovery
    it('hydrateP2PData gracefully recovers from corrupt or non-numeric BigInt strings without panic', () => {
        const corruptPayload = {
            id: 'corrupt_loan_1',
            principalPaise: 'CORRUPT_NOT_A_NUMBER',
            outstandingPrincipalPaise: 'null',
            validPaise: '100000'
        };

        const recovered = hydrateP2PData(corruptPayload);
        assert.strictEqual(recovered.principalPaise, 0n);
        assert.strictEqual(recovered.outstandingPrincipalPaise, 0n);
        assert.strictEqual(recovered.validPaise, 100000n);
        assert.strictEqual(recovered._corruptionRecovered, true);
    });

    // 5. End-to-End Cold Storage Persistence and Reload
    await itAsync('P2PService survives cold memory wipe and restores exact BigInt state from disk storage', async () => {
        P2PService.clearMemoryCache();
        await P2PService.resetToCleanState();

        const person = await P2PService.addPerson({
            id: 'persist_person_1',
            name: 'Anjali Verma',
            phone: '+91 99999 11111'
        });

        const loan = await P2PService.addLoan({
            id: 'persist_loan_1',
            personId: person.id,
            principal: 100000,
            interestRate: 12,
            startDate: '2026-01-01'
        });

        await P2PService.recordRepayment({
            loanId: loan.id,
            amount: 25000,
            date: '2026-02-01'
        });

        // Wipe in-memory query cache completely (cold restart simulation)
        P2PService.clearMemoryCache();

        // Reload fresh from storage
        const reloadedLoans = await P2PService.getLoans();
        const reloadedLoan = reloadedLoans.find(l => l.id === loan.id);

        assert.ok(reloadedLoan, 'Reloaded loan must exist');
        assert.strictEqual(typeof reloadedLoan.principalPaise, 'bigint');
        assert.strictEqual(reloadedLoan.principalPaise, 10000000n); // ₹1,00,000 * 100

        const reloadedRepayments = await P2PService.getRepayments(loan.id);
        assert.strictEqual(reloadedRepayments.length, 1);
        assert.strictEqual(typeof reloadedRepayments[0].amountPaise, 'bigint');
        assert.strictEqual(reloadedRepayments[0].amountPaise, 2500000n);
    });

    // 6. Full Backup Export and Snapshot Restoration under Live Mutations
    await itAsync('Full portfolio backup snapshot can be exported, mutated, and restored with 100% fidelity', async () => {
        P2PService.clearMemoryCache();
        await P2PService.resetToCleanState();

        const person = await P2PService.addPerson({ id: 'backup_p1', name: 'Rohan Mehta' });
        const loan = await P2PService.addLoan({
            id: 'backup_loan_1',
            personId: person.id,
            principal: 500000,
            interestRate: 10,
            startDate: '2026-03-01'
        });

        // Create Backup Snapshot
        const backupSnapshot = {
            persons: await P2PService.getPersons(),
            loans: await P2PService.getLoans(),
            advances: await P2PService.getAdvances(),
            repayments: await P2PService.getRepayments(),
            journal: await P2PService.getJournalEntries(),
            operations: await P2PService.getOperations()
        };

        const serializedBackup = JSON.stringify(serializeP2PData(backupSnapshot));

        // Perform aggressive live mutations
        await P2PService.addTopUpAdvance({ loanId: loan.id, amount: 200000 });
        await P2PService.recordRepayment({ loanId: loan.id, amount: 150000 });

        const mutatedLoans = await P2PService.getLoans();
        assert.strictEqual(mutatedLoans[0].principalPaise, 50000000n);
        const mutatedRepayments = await P2PService.getRepayments();
        assert.strictEqual(mutatedRepayments.length, 1);

        // Restore from backup
        const parsedBackup = JSON.parse(serializedBackup);
        const restoredBackup = hydrateP2PData(parsedBackup);

        await saveData(STORAGE_KEYS.P2P_PERSONS, serializeP2PData(restoredBackup.persons));
        await saveData(STORAGE_KEYS.P2P_LOANS, serializeP2PData(restoredBackup.loans));
        await saveData(STORAGE_KEYS.P2P_ADVANCES, serializeP2PData(restoredBackup.advances));
        await saveData(STORAGE_KEYS.P2P_REPAYMENTS, serializeP2PData(restoredBackup.repayments));
        await saveData(STORAGE_KEYS.P2P_JOURNAL, serializeP2PData(restoredBackup.journal));
        await saveData(STORAGE_KEYS.P2P_OPERATIONS, serializeP2PData(restoredBackup.operations));

        P2PService.clearMemoryCache();

        // Verify exact restoration
        const restoredRepayments = await P2PService.getRepayments();
        assert.strictEqual(restoredRepayments.length, 0, 'Restored state must have 0 repayments prior to backup');
        const restoredAdvances = await P2PService.getAdvances();
        assert.strictEqual(restoredAdvances.length, 1, 'Restored state must have initial advance only');
        assert.strictEqual(restoredAdvances[0].amountPaise, 50000000n);
    });

    return { passed, total, name: 'P2P Persistence, Storage Reload & Schema Migration' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    runPersistenceAndMigrationTests()
        .then(res => console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`))
        .catch(err => { console.error(err); process.exit(1); });
}
