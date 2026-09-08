/**
 * tests/test_cashbook_cross_book_recovery.mjs
 * 
 * Gate 8: Cross-Book Crash & Interruption Recovery Test Suite
 * 
 * Invariants & Coverage:
 * 1. The 7 Interruption Lifecycle Stages:
 *    - Stage 1: Pre-write (no ledger mutation)
 *    - Stage 2: After source WAL (safe rollback)
 *    - Stage 3: After destination WAL / Dual prepared (forward-reconcile both legs)
 *    - Stage 4: After source commit (forward-reconcile destination leg)
 *    - Stage 5: After destination commit (reconcile completion, clear WAL, deduplicate)
 *    - Stage 6: Before ack (idempotent retry)
 *    - Stage 7: Cold restart recovery before consumer read
 * 
 * 2. Edge Cases & Safety Gates:
 *    - Cross-book same book rejection
 *    - Zero and negative amount rejection
 *    - Currency mismatch rejection
 *    - Duplicate transaction ID rejection
 *    - Malformed WAL quarantine & fail-closed
 *    - Payload hash mismatch quarantine
 *    - Ledger conflict detection (RECOVERY_CONFLICT, no overwrite)
 *    - Idempotency collision rejection
 *    - Successive double recovery idempotency
 *    - Production fault injection rejection security
 *    - Strict DEMO vs PRODUCTION storage isolation
 *    - Tamper-evident audit continuity verification
 *    - Exact BigInt integer paise precision (zero float loss)
 */

import assert from 'assert';
import { StorageService } from '../services/storage.js';
import {
    CashbookAppMode,
    CashbookType,
    AccountType,
    CrossBookWALState,
    DailyClosingStatus,
    createCashbook,
    createAccount,
    createCrossBookTransfer,
    createDailyClosingRecord,
    rupeesToMoneyPaise,
    canonicalJsonStringify
} from '../services/cashbook/cashbookContracts.js';
import { CashbookRepository } from '../services/cashbook/cashbookRepository.js';
import { verifyAuditTrail, sha256 } from '../services/cashbook/cashbookAuditTrail.js';

let passedChecks = 0;

function check(title, fn) {
    process.stdout.write(`  [RUN] ${title}...`);
    try {
        fn();
        console.log('\r  [PASS] ' + title);
        passedChecks++;
    } catch (err) {
        console.log('\r  [FAIL] ' + title);
        console.error(err);
        process.exit(1);
    }
}

async function checkAsync(title, fn) {
    process.stdout.write(`  [RUN] ${title}...`);
    try {
        await fn();
        console.log('\r  [PASS] ' + title);
        passedChecks++;
    } catch (err) {
        console.log('\r  [FAIL] ' + title);
        console.error(err);
        process.exit(1);
    }
}

async function resetTestLedger(mode = CashbookAppMode.PRODUCTION) {
    await CashbookRepository.clearLedger(mode);
    const envelope = await CashbookRepository.load({ mode });

    // Ensure Book 1 and Book 2 exist
    const book1 = createCashbook({
        id: 'book_personal_savings',
        name: 'Personal Savings',
        type: CashbookType.SAVINGS,
        isDefault: true
    });
    const book2 = createCashbook({
        id: 'book_till_register',
        name: 'Handy Till Register',
        type: CashbookType.HANDY_CASH
    });

    await CashbookRepository.saveBook(book1, { mode });
    await CashbookRepository.saveBook(book2, { mode });

    // Ensure test accounts exist
    const acc1 = createAccount({
        id: 'acc_bank_test',
        name: 'Primary Bank',
        type: AccountType.BANK,
        institution: 'HDFC'
    });
    const acc2 = createAccount({
        id: 'acc_cash_test',
        name: 'Handy Cash Till',
        type: AccountType.CASH
    });

    await CashbookRepository.saveAccount(acc1, { mode });
    await CashbookRepository.saveAccount(acc2, { mode });

    return { book1, book2, acc1, acc2 };
}

console.log('--- START TEST SUITE: GATE 8 CROSS-BOOK CRASH & INTERRUPTION RECOVERY ---');

// =========================================================================
// PART 1: THE 7 INTERRUPTION LIFECYCLE STAGES
// =========================================================================

await checkAsync('Stage 1 (Pre-write): Interruption before WAL write leaves ledger untouched', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_stage1_pre_write',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1000),
        date: '2026-09-01',
        description: 'Test Stage 1 Pre-write'
    });

    let threw = false;
    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'PRE_WRITE',
                __testRunnerHarness: true
            }
        );
    } catch (err) {
        threw = true;
        assert.ok(err.message.includes('FAULT_INJECTED: Crash before any ledger mutation'));
    }
    assert.strictEqual(threw, true, 'Pre-write fault injection must throw');

    const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(env.preparedOperation, null, 'WAL must be null');
    assert.strictEqual(env.transactions.length, 0, 'No transactions should be recorded');
    assert.strictEqual(verifyAuditTrail(env.auditLog).isValid, true, 'Audit log remains consistent');
});

await checkAsync('Stage 2 (After source WAL): Safe rollback when interrupted at SOURCE_PREPARED', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_stage2_src_wal',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(2000),
        date: '2026-09-01',
        description: 'Test Stage 2 After Source WAL'
    });

    let threw = false;
    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_SOURCE_PREPARED',
                __testRunnerHarness: true
            }
        );
    } catch (err) {
        threw = true;
        assert.ok(err.message.includes('FAULT_INJECTED: Crash after source WAL prepared'));
    }
    assert.strictEqual(threw, true);

    // Verify raw storage has SOURCE_PREPARED WAL
    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const rawEnv = await StorageService.load(rawKey);
    assert.ok(rawEnv.preparedOperation, 'Prepared operation must exist in raw storage');
    assert.strictEqual(rawEnv.preparedOperation.state, CrossBookWALState.SOURCE_PREPARED);
    assert.strictEqual(rawEnv.transactions.length, 0, 'No transactions in raw storage');

    // Simulate recovery upon restart / load
    const recoveredEnv = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(recoveredEnv.preparedOperation, null, 'WAL must be cleared after rollback');
    assert.strictEqual(recoveredEnv.transactions.length, 0, 'No transactions committed');
    assert.strictEqual(verifyAuditTrail(recoveredEnv.auditLog).isValid, true);
});

await checkAsync('Stage 3 (After dest WAL): Forward-reconciles both legs when interrupted at DUAL_PREPARED', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_stage3_dual_wal',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(3000),
        date: '2026-09-01',
        description: 'Test Stage 3 After Dual WAL'
    });

    let threw = false;
    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_DUAL_PREPARED',
                __testRunnerHarness: true
            }
        );
    } catch (err) {
        threw = true;
        assert.ok(err.message.includes('FAULT_INJECTED: Crash after dual WAL prepared'));
    }
    assert.strictEqual(threw, true);

    // Verify raw storage has DUAL_PREPARED WAL
    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const rawEnv = await StorageService.load(rawKey);
    assert.strictEqual(rawEnv.preparedOperation.state, CrossBookWALState.DUAL_PREPARED);
    assert.strictEqual(rawEnv.transactions.length, 0);

    // Simulate restart and recovery
    const recoveredEnv = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(recoveredEnv.preparedOperation, null, 'WAL must be cleared after forward reconciliation');
    assert.strictEqual(recoveredEnv.transactions.length, 2, 'Both legs forward-reconciled');
    assert.strictEqual(recoveredEnv.transactions[0].id, sourceTxn.id);
    assert.strictEqual(recoveredEnv.transactions[1].id, destTxn.id);
    assert.strictEqual(verifyAuditTrail(recoveredEnv.auditLog).isValid, true, 'Audit log chain unbroken');
});

await checkAsync('Stage 4 (After source commit): Forward-reconciles destination leg when interrupted at SOURCE_COMMITTED', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_stage4_src_commit',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(4000),
        date: '2026-09-01',
        description: 'Test Stage 4 After Source Commit'
    });

    let threw = false;
    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_SOURCE_COMMITTED',
                __testRunnerHarness: true
            }
        );
    } catch (err) {
        threw = true;
        assert.ok(err.message.includes('FAULT_INJECTED: Crash after source leg committed'));
    }
    assert.strictEqual(threw, true);

    // Verify raw storage has source leg only
    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const rawEnv = await StorageService.load(rawKey);
    assert.strictEqual(rawEnv.preparedOperation.state, CrossBookWALState.SOURCE_COMMITTED);
    assert.strictEqual(rawEnv.transactions.length, 1, 'Source leg already present');

    // Simulate restart recovery
    const recoveredEnv = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(recoveredEnv.preparedOperation, null);
    assert.strictEqual(recoveredEnv.transactions.length, 2, 'Destination leg reconciled');
    assert.strictEqual(recoveredEnv.transactions[0].id, sourceTxn.id);
    assert.strictEqual(recoveredEnv.transactions[1].id, destTxn.id);
    assert.strictEqual(verifyAuditTrail(recoveredEnv.auditLog).isValid, true);
});

await checkAsync('Stage 5 (After dest commit): Completes WAL cleanly when interrupted at COMMITTED', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_stage5_dst_commit',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(5000),
        date: '2026-09-01',
        description: 'Test Stage 5 After Dest Commit'
    });

    let threw = false;
    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_DEST_COMMITTED',
                __testRunnerHarness: true
            }
        );
    } catch (err) {
        threw = true;
        assert.ok(err.message.includes('FAULT_INJECTED: Crash after destination leg committed'));
    }
    assert.strictEqual(threw, true);

    // Verify raw storage has COMMITTED WAL and both transactions
    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const rawEnv = await StorageService.load(rawKey);
    assert.strictEqual(rawEnv.preparedOperation.state, CrossBookWALState.COMMITTED);
    assert.strictEqual(rawEnv.transactions.length, 2);

    // Simulate restart recovery
    const recoveredEnv = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(recoveredEnv.preparedOperation, null);
    assert.strictEqual(recoveredEnv.transactions.length, 2, 'No duplicate transactions added');
    assert.strictEqual(verifyAuditTrail(recoveredEnv.auditLog).isValid, true);
});

await checkAsync('Stage 6 (Before ack): Idempotent retry returns existing transfer without duplicates', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_stage6_before_ack',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(6000),
        date: '2026-09-01',
        description: 'Test Stage 6 Before Ack'
    });

    let threw = false;
    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'BEFORE_ACK',
                __testRunnerHarness: true
            }
        );
    } catch (err) {
        threw = true;
        assert.ok(err.message.includes('FAULT_INJECTED: Crash before final ack'));
    }
    assert.strictEqual(threw, true);

    // Client retries exact same transfer
    const retryResult = await CashbookRepository.saveCrossBookTransfer(
        { sourceTxn, destTxn },
        { mode: CashbookAppMode.PRODUCTION }
    );
    assert.strictEqual(retryResult.sourceTxn.id, sourceTxn.id);
    assert.strictEqual(retryResult.destTxn.id, destTxn.id);

    const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(env.transactions.length, 2, 'Exactly 2 transactions exist (no duplicates)');
    assert.strictEqual(verifyAuditTrail(env.auditLog).isValid, true);
});

await checkAsync('Stage 7 (Cold restart recovery): Repository load recovers ledger before any consumer read', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_stage7_cold_restart',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(7000),
        date: '2026-09-01',
        description: 'Test Stage 7 Cold Restart'
    });

    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_SOURCE_COMMITTED',
                __testRunnerHarness: true
            }
        );
    } catch (e) {
        // Expected crash
    }

    // Consumer invokes high-level getActiveBook() or getTransactionsByBook()
    const activeBook = await CashbookRepository.getActiveBook({ mode: CashbookAppMode.PRODUCTION });
    assert.ok(activeBook, 'Active book returned');

    // Ledger should now be fully recovered
    const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(env.preparedOperation, null, 'WAL reconciled prior to consumer read');
    assert.strictEqual(env.transactions.length, 2, 'Both transfer legs present');
    assert.strictEqual(verifyAuditTrail(env.auditLog).isValid, true);
});

// =========================================================================
// PART 2: THE 18+ EDGE CASES & SAFETY GATES
// =========================================================================

check('Edge 1: Same source and destination book is rejected', () => {
    assert.throws(() => {
        createCrossBookTransfer({
            transferGroupId: 'grp_same_book',
            sourceBookId: 'book_same',
            sourceAccountId: 'acc_bank_test',
            destinationBookId: 'book_same',
            destinationAccountId: 'acc_cash_test',
            amount: rupeesToMoneyPaise(1000)
        });
    }, /Source and destination books cannot be the same/);
});

check('Edge 2: Zero transfer amount is rejected', () => {
    assert.throws(() => {
        createCrossBookTransfer({
            transferGroupId: 'grp_zero_amt',
            sourceBookId: 'book_personal_savings',
            sourceAccountId: 'acc_bank_test',
            destinationBookId: 'book_till_register',
            destinationAccountId: 'acc_cash_test',
            amount: rupeesToMoneyPaise(0)
        });
    }, /Transfer amount must be strictly greater than zero/);
});

check('Edge 3: Negative transfer amount is rejected', () => {
    assert.throws(() => {
        createCrossBookTransfer({
            transferGroupId: 'grp_neg_amt',
            sourceBookId: 'book_personal_savings',
            sourceAccountId: 'acc_bank_test',
            destinationBookId: 'book_till_register',
            destinationAccountId: 'acc_cash_test',
            amount: { paise: '-50000', currency: 'INR' }
        });
    }, /Invalid MoneyPaise object|Transfer amount must be strictly greater than zero/);
});

await checkAsync('Edge 4: Currency mismatch between transfer legs is rejected', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_curr_mismatch',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1000)
    });
    destTxn.currency = 'USD';
    destTxn.amount.currency = 'USD';

    await assert.rejects(async () => {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            { mode: CashbookAppMode.PRODUCTION }
        );
    }, /Transfer currency mismatch: both legs must be INR/);
});

await checkAsync('Edge 5: Missing counterparty account is rejected', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_missing_acc',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_non_existent',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1000)
    });

    await assert.rejects(async () => {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            { mode: CashbookAppMode.PRODUCTION }
        );
    }, /Referenced account does not exist/);
});

await checkAsync('Edge 6: Identical transaction IDs on both legs is rejected', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_dup_id',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1000)
    });
    destTxn.id = sourceTxn.id;

    await assert.rejects(async () => {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            { mode: CashbookAppMode.PRODUCTION }
        );
    }, /Source and destination transaction IDs must be distinct/);
});

await checkAsync('Edge 7: Malformed/unknown WAL state machine state enters QUARANTINED and fails closed', async () => {
    await resetTestLedger();
    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const env = await StorageService.load(rawKey);

    env.preparedOperation = {
        operationType: 'CROSS_BOOK_TRANSFER',
        transferGroupId: 'grp_malformed_state',
        state: 'UNKNOWN_CORRUPT_STATE',
        sourceTxn: { id: 's1' },
        destTxn: { id: 'd1' }
    };
    await StorageService.save(rawKey, env);

    await assert.rejects(async () => {
        await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    }, /WAL_QUARANTINED: Malformed WAL record/);

    const checkEnv = await StorageService.load(rawKey);
    assert.strictEqual(checkEnv.preparedOperation.state, CrossBookWALState.QUARANTINED);
});

await checkAsync('Edge 8: Corrupted source payload hash enters QUARANTINED and fails closed', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_corrupt_src_hash',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1500)
    });

    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const env = await StorageService.load(rawKey);
    env.preparedOperation = {
        operationType: 'CROSS_BOOK_TRANSFER',
        transferGroupId: 'grp_corrupt_src_hash',
        state: CrossBookWALState.DUAL_PREPARED,
        sourceTxn,
        destTxn,
        sourcePayloadHash: '0000000000000000000000000000000000000000000000000000000000000000', // tampered hash
        destinationPayloadHash: sha256(canonicalJsonStringify(destTxn))
    };
    await StorageService.save(rawKey, env);

    await assert.rejects(async () => {
        await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    }, /WAL_QUARANTINED: Source payload hash mismatch/);

    const checkEnv = await StorageService.load(rawKey);
    assert.strictEqual(checkEnv.preparedOperation.state, CrossBookWALState.QUARANTINED);
});

await checkAsync('Edge 9: Corrupted destination payload hash enters QUARANTINED and fails closed', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_corrupt_dst_hash',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1500)
    });

    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const env = await StorageService.load(rawKey);
    env.preparedOperation = {
        operationType: 'CROSS_BOOK_TRANSFER',
        transferGroupId: 'grp_corrupt_dst_hash',
        state: CrossBookWALState.DUAL_PREPARED,
        sourceTxn,
        destTxn,
        sourcePayloadHash: sha256(canonicalJsonStringify(sourceTxn)),
        destinationPayloadHash: '0000000000000000000000000000000000000000000000000000000000000000' // tampered hash
    };
    await StorageService.save(rawKey, env);

    await assert.rejects(async () => {
        await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    }, /WAL_QUARANTINED: Destination payload hash mismatch/);

    const checkEnv = await StorageService.load(rawKey);
    assert.strictEqual(checkEnv.preparedOperation.state, CrossBookWALState.QUARANTINED);
});

await checkAsync('Edge 10: Ledger payload divergence triggers RECOVERY_CONFLICT and never overwrites', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_conflict_divergence',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(2500)
    });

    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const env = await StorageService.load(rawKey);

    // Plant sourceTxn into ledger but with an altered amount
    const alteredSourceTxn = {
        ...sourceTxn,
        amount: rupeesToMoneyPaise(9999)
    };
    env.transactions.push(alteredSourceTxn);

    // Plant WAL record expecting original amount
    env.preparedOperation = {
        operationType: 'CROSS_BOOK_TRANSFER',
        transferGroupId: 'grp_conflict_divergence',
        state: CrossBookWALState.SOURCE_COMMITTED,
        sourceTxn,
        destTxn,
        sourcePayloadHash: sha256(canonicalJsonStringify(sourceTxn)),
        destinationPayloadHash: sha256(canonicalJsonStringify(destTxn))
    };
    await StorageService.save(rawKey, env);

    // Recovery must fail closed with RECOVERY_CONFLICT
    await assert.rejects(async () => {
        await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    }, /RECOVERY_CONFLICT: Existing source leg payload differs from WAL record/);

    // Verify existing altered transaction was not modified or overwritten
    const checkEnv = await StorageService.load(rawKey);
    assert.strictEqual(checkEnv.transactions.length, 1);
    assert.strictEqual(checkEnv.transactions[0].amount.paise, rupeesToMoneyPaise(9999).paise);
    assert.strictEqual(checkEnv.preparedOperation.state, CrossBookWALState.RECOVERY_CONFLICT);
});

await checkAsync('Edge 11: Idempotency conflict rejects when same key used with different payload', async () => {
    await resetTestLedger();
    const { sourceTxn: src1, destTxn: dst1 } = createCrossBookTransfer({
        transferGroupId: 'grp_idem_conflict_1',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1000)
    });
    src1.idempotencyKey = 'idem_unique_key_101';
    dst1.idempotencyKey = 'idem_unique_key_101_dst';

    await CashbookRepository.saveCrossBookTransfer({ sourceTxn: src1, destTxn: dst1 }, { mode: CashbookAppMode.PRODUCTION });

    // Same idempotencyKey, different amount
    const { sourceTxn: src2, destTxn: dst2 } = createCrossBookTransfer({
        transferGroupId: 'grp_idem_conflict_2',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(2000)
    });
    src2.idempotencyKey = 'idem_unique_key_101';
    dst2.idempotencyKey = 'idem_unique_key_101_dst';

    await assert.rejects(async () => {
        await CashbookRepository.saveCrossBookTransfer({ sourceTxn: src2, destTxn: dst2 }, { mode: CashbookAppMode.PRODUCTION });
    }, /IDENTITY_CONFLICT: Idempotency key "idem_unique_key_101" already exists with different transaction payload/);
});

await checkAsync('Edge 12: Successive double recovery calls are completely idempotent', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_double_recovery',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(3500)
    });

    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_SOURCE_COMMITTED',
                __testRunnerHarness: true
            }
        );
    } catch (e) {
        // Expected
    }

    // First recovery
    const env1 = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(env1.transactions.length, 2);
    assert.strictEqual(env1.preparedOperation, null);

    // Second recovery
    const env2 = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(env2.transactions.length, 2);
    assert.strictEqual(env2.preparedOperation, null);
    assert.strictEqual(verifyAuditTrail(env2.auditLog).isValid, true);
});

await checkAsync('Edge 13: Production fault injection without test bypass token is rejected', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_prod_sec_fail',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1000)
    });

    // Attempt fault injection without test harness activation
    await assert.rejects(async () => {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_SOURCE_PREPARED'
                // note: no __testRunnerHarness
            }
        );
    }, /FAULT_INJECTION_REJECTED: Fault injection requires explicit test harness activation/);
});

await checkAsync('Edge 14: Strict isolation: DEMO recovery never touches PRODUCTION envelope', async () => {
    await resetTestLedger(CashbookAppMode.PRODUCTION);
    await resetTestLedger(CashbookAppMode.DEMO);

    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_demo_isolation',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1200)
    });

    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.DEMO,
                _faultInjection: 'AFTER_DUAL_PREPARED',
                __testRunnerHarness: true
            }
        );
    } catch (e) {
        // Expected
    }

    // Recover DEMO
    const demoEnv = await CashbookRepository.load({ mode: CashbookAppMode.DEMO });
    assert.ok(demoEnv.transactions.some(t => t.id === sourceTxn.id), 'DEMO contains source leg');
    assert.ok(demoEnv.transactions.some(t => t.id === destTxn.id), 'DEMO contains dest leg');

    // Verify PRODUCTION remains clean
    const prodEnv = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    assert.strictEqual(prodEnv.transactions.length, 0, 'PRODUCTION has 0 transactions');
    assert.ok(!prodEnv.transactions.some(t => t.id === sourceTxn.id), 'PRODUCTION does not contain source leg');
});

await checkAsync('Edge 15: Exact BigInt integer paise math across large transfers (zero float loss)', async () => {
    await resetTestLedger();
    // ₹5,00,00,000.00 = 50,000,000.00 = 5000000000 paise (Fifty Crores paise)
    const largePaise = '5000000000';
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_bigint_paise',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: { paise: largePaise, currency: 'INR' },
        description: 'Large Value Transfer 50M INR'
    });

    await CashbookRepository.saveCrossBookTransfer(
        { sourceTxn, destTxn },
        { mode: CashbookAppMode.PRODUCTION }
    );

    const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });
    const savedSrc = env.transactions.find(t => t.id === sourceTxn.id);
    const savedDst = env.transactions.find(t => t.id === destTxn.id);

    assert.strictEqual(savedSrc.amount.paise, largePaise);
    assert.strictEqual(savedDst.amount.paise, largePaise);
    assert.strictEqual(BigInt(savedSrc.amount.paise), 5000000000n);
    assert.strictEqual(verifyAuditTrail(env.auditLog).isValid, true);
});

await checkAsync('Edge 16: Period locking prevents transfer posting to locked dates', async () => {
    await resetTestLedger();
    // Save and lock a daily closing for 2026-08-31
    const closingRecord = createDailyClosingRecord({
        id: 'dc_lock_20260831',
        bookId: 'book_personal_savings',
        date: '2026-08-31',
        openingBalance: rupeesToMoneyPaise(0),
        totalMoneyIn: rupeesToMoneyPaise(0),
        totalMoneyOut: rupeesToMoneyPaise(0),
        calculatedClosing: rupeesToMoneyPaise(0),
        countedClosing: rupeesToMoneyPaise(0),
        difference: rupeesToMoneyPaise(0),
        status: DailyClosingStatus.CLOSED,
        notes: 'Month end lock'
    });
    await CashbookRepository.saveDailyClosing(closingRecord, { mode: CashbookAppMode.PRODUCTION });

    await CashbookRepository.lockDailyClosing('dc_lock_20260831', { mode: CashbookAppMode.PRODUCTION });

    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_period_lock_test',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(1000),
        date: '2026-08-31'
    });

    await assert.rejects(async () => {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            { mode: CashbookAppMode.PRODUCTION }
        );
    }, /PERIOD_LOCKED: Cannot post transfer from locked date "2026-08-31" in book "book_personal_savings"/);
});

await checkAsync('Edge 17: Tamper-evident cryptographic audit continuity verified after multi-stage recovery', async () => {
    await resetTestLedger();
    // Execute a regular transfer
    const { sourceTxn: s1, destTxn: d1 } = createCrossBookTransfer({
        transferGroupId: 'grp_audit_seq_1',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(500)
    });
    await CashbookRepository.saveCrossBookTransfer({ sourceTxn: s1, destTxn: d1 }, { mode: CashbookAppMode.PRODUCTION });

    // Execute an interrupted transfer at Stage 4 (source committed)
    const { sourceTxn: s2, destTxn: d2 } = createCrossBookTransfer({
        transferGroupId: 'grp_audit_seq_2',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(750)
    });
    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn: s2, destTxn: d2 },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_SOURCE_COMMITTED',
                __testRunnerHarness: true
            }
        );
    } catch (e) {
        // Interrupted
    }

    // Recover
    const env = await CashbookRepository.load({ mode: CashbookAppMode.PRODUCTION });

    // Verify audit log sequence numbers and hash links
    const auditResult = verifyAuditTrail(env.auditLog);
    assert.strictEqual(auditResult.isValid, true, 'Audit log must be cryptographically valid');
    assert.strictEqual(env.transactions.length, 4, 'All 4 transaction legs present');
});

await checkAsync('Edge 18: Authoritative transfer record contains pre- and post-transfer balances', async () => {
    await resetTestLedger();
    const { sourceTxn, destTxn } = createCrossBookTransfer({
        transferGroupId: 'grp_balance_snapshot',
        sourceBookId: 'book_personal_savings',
        sourceAccountId: 'acc_bank_test',
        destinationBookId: 'book_till_register',
        destinationAccountId: 'acc_cash_test',
        amount: rupeesToMoneyPaise(2500)
    });

    try {
        await CashbookRepository.saveCrossBookTransfer(
            { sourceTxn, destTxn },
            {
                mode: CashbookAppMode.PRODUCTION,
                _faultInjection: 'AFTER_SOURCE_PREPARED',
                __testRunnerHarness: true
            }
        );
    } catch (e) {
        // Interrupted
    }

    const rawKey = CashbookRepository._getStorageKey(CashbookAppMode.PRODUCTION);
    const rawEnv = await StorageService.load(rawKey);
    const op = rawEnv.preparedOperation;

    assert.strictEqual(op.sourceBeforeBalance, '0');
    assert.strictEqual(op.sourceAfterBalance, '-250000');
    assert.strictEqual(op.destinationBeforeBalance, '0');
    assert.strictEqual(op.destinationAfterBalance, '250000');
    assert.strictEqual(op.amountPaise, '250000');
    assert.strictEqual(op.currency, 'INR');
    assert.ok(op.sourcePayloadHash);
    assert.ok(op.destinationPayloadHash);
});

console.log(`--- GATE 8 SUITE PASSED (${passedChecks} assertions) ---`);
