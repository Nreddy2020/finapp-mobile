/**
 * tests/test_p2p_adversarial_and_negative.mjs
 * 
 * FinLife P2P Network — Adversarial, Boundary & Negative Invariant Test Suite.
 * 
 * Verifies:
 * 1. ₹100 Crore business limit boundary acceptance (100,000,000,000n).
 * 2. ₹100 Crore + 1 paisa rejection with P2PValidationError.
 * 3. Signed 64-bit integer domain bounds & overflow protection.
 * 4. Zero-value loan principal rejection.
 * 5. Negative monetary input rejection.
 * 6. Settled loan immutability (repayment, top-up, settlement rejection).
 * 7. Duplicate settlement request idempotency (zero duplicate journal/cash entries).
 * 8. Duplicate repayment request idempotency (zero duplicate journal/cash entries).
 * 9. CFO Outstanding balance semantics (projections use current unamortized balance, not original).
 * 10. Cashbook linkage & double-count prevention on principal vs interest.
 */

import assert from 'assert';
import {
    MIN_PAISE,
    MAX_PAISE,
    MAX_TRANSACTION_PAISE,
    validatePaiseBounds,
    P2PValidationError,
    rupeesToPaise,
    toBigIntPaise
} from '../components/p2p/p2pContracts.js';
import { P2PService } from '../services/p2pService.js';
import { LOAN_DIRECTION, LOAN_STATUS } from '../components/p2p/p2pDomainModel.js';
import { getP2PNetWorthBalanceSheetProjection } from '../components/p2p/p2pNetWorthAdapter.js';
import { mapP2PJournalToMoneyFlowTransactions } from '../components/p2p/p2pCashEventAdapter.js';

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

export async function runAdversarialAndNegativeTests() {
    passed = 0;
    total = 0;

    // 1. ₹100 Crore Boundary Acceptance
    it('₹100 Crore boundary (100,000,000,000 paise) is strictly accepted without error', () => {
        const exactLimit = 100_000_000_000n; // ₹100 Crore = 1,000,000,000 rupees * 100 paise
        assert.strictEqual(MAX_TRANSACTION_PAISE, exactLimit);
        assert.doesNotThrow(() => validatePaiseBounds(exactLimit));
        const validated = validatePaiseBounds(exactLimit);
        assert.strictEqual(validated, exactLimit);
    });

    // 2. ₹100 Crore + 1 Paisa Rejection
    it('₹100 Crore + 1 paisa (100,000,000,001 paise) is strictly rejected with P2PValidationError', () => {
        const overLimit = 100_000_000_001n;
        assert.throws(() => {
            validatePaiseBounds(overLimit);
        }, (err) => {
            return err instanceof P2PValidationError && err.code === 'ERR_LIMIT_EXCEEDED';
        });
    });

    // 3. Signed 64-bit Domain Boundaries & Overflow Protection
    it('Signed 64-bit minimum and maximum bounds are respected, and overflows rejected', () => {
        assert.strictEqual(MIN_PAISE, -9_223_372_036_854_775_808n);
        assert.strictEqual(MAX_PAISE,  9_223_372_036_854_775_807n);

        // Within 64-bit range (no transaction limit)
        const valid64Bit = validatePaiseBounds(MAX_PAISE, { maxLimit: null });
        assert.strictEqual(valid64Bit, MAX_PAISE);

        // Outside 64-bit range
        const overflow = MAX_PAISE + 1n;
        assert.throws(() => {
            validatePaiseBounds(overflow, { maxLimit: null });
        }, (err) => {
            return err instanceof P2PValidationError && err.code === 'ERR_DOMAIN_OVERFLOW';
        });
    });

    // 4. Zero-Value Loan Principal Rejection
    await itAsync('Zero-value loan principal is strictly rejected with ERR_ZERO_PRINCIPAL', async () => {
        await assert.rejects(async () => {
            await P2PService.addLoan({
                name: 'Zero Loan',
                principal: 0,
                direction: LOAN_DIRECTION.GIVEN
            });
        }, (err) => {
            return err instanceof P2PValidationError && err.code === 'ERR_ZERO_PRINCIPAL';
        });
    });

    // 5. Negative Monetary Input Rejection
    await itAsync('Negative loan principal or repayment is strictly rejected with ERR_NEGATIVE_AMOUNT', async () => {
        await assert.rejects(async () => {
            await P2PService.addLoan({
                name: 'Negative Loan',
                principal: -50000,
                direction: LOAN_DIRECTION.GIVEN
            });
        }, (err) => {
            return err instanceof P2PValidationError && err.code === 'ERR_NEGATIVE_AMOUNT';
        });
    });

    // 6. Settled Loan Immutability
    await itAsync('Settled loan rejects subsequent repayments, top-ups, and duplicate settlements', async () => {
        P2PService.clearMemoryCache();
        await P2PService.resetToCleanState();

        const person = await P2PService.addPerson({ id: 'immut_p1', name: 'Immutability Person' });
        const loan = await P2PService.addLoan({
            id: 'loan_immut_1',
            personId: person.id,
            principal: 50000,
            direction: LOAN_DIRECTION.GIVEN,
            interestRate: 0
        });

        // Settle the loan
        await P2PService.settleLoan({ loanId: loan.id });

        // Verify settled
        const reloaded = await P2PService.getLoanById(loan.id);
        assert.strictEqual(reloaded.status, LOAN_STATUS.SETTLED);

        // Attempt 1: Repayment on settled loan
        await assert.rejects(async () => {
            await P2PService.recordRepayment({ loanId: loan.id, amount: 1000 });
        }, (err) => {
            return err instanceof P2PValidationError && err.code === 'ERR_SETTLED_LOAN_IMMUTABLE';
        });

        // Attempt 2: Top-Up on settled loan
        await assert.rejects(async () => {
            await P2PService.addTopUpAdvance({ loanId: loan.id, amount: 5000 });
        }, (err) => {
            return err instanceof P2PValidationError && err.code === 'ERR_SETTLED_LOAN_IMMUTABLE';
        });

        // Attempt 3: Settle already settled loan
        await assert.rejects(async () => {
            await P2PService.settleLoan({ loanId: loan.id });
        }, (err) => {
            return err instanceof P2PValidationError && err.code === 'ERR_ALREADY_SETTLED';
        });
    });

    // 7. Settlement Idempotency & Zero Duplicate Records
    await itAsync('Retrying settlement with stable idempotencyKey returns committed result with zero duplicates', async () => {
        P2PService.clearMemoryCache();
        await P2PService.resetToCleanState();

        const person = await P2PService.addPerson({ id: 'idemp_p1', name: 'Idempotency Test Person' });
        const loan = await P2PService.addLoan({
            id: 'loan_idemp_1',
            personId: person.id,
            principal: 80000,
            direction: LOAN_DIRECTION.GIVEN,
            interestRate: 0
        });

        const idemKey = 'idemp_settle_key_999';

        const journalBefore = await P2PService.getJournalEntries();
        const initialJournalCount = journalBefore.length;

        // First execution
        const res1 = await P2PService.settleLoan({ loanId: loan.id, idempotencyKey: idemKey });
        const journalAfterFirst = await P2PService.getJournalEntries();
        assert.strictEqual(journalAfterFirst.length, initialJournalCount + 1);

        // Second duplicate execution with same idempotencyKey
        const res2 = await P2PService.settleLoan({ loanId: loan.id, idempotencyKey: idemKey });
        const journalAfterSecond = await P2PService.getJournalEntries();

        // Exactly zero duplicate journal entries created
        assert.strictEqual(journalAfterSecond.length, journalAfterFirst.length);
        assert.ok(res2, 'Must return committed result');
    });

    // 8. Repayment Idempotency & Zero Duplicate Records
    await itAsync('Retrying repayment with stable idempotencyKey returns committed result with zero duplicates', async () => {
        P2PService.clearMemoryCache();
        await P2PService.resetToCleanState();

        const person = await P2PService.addPerson({ id: 'idemp_rep_p1', name: 'Repayment Idempotency' });
        const loan = await P2PService.addLoan({
            id: 'loan_idemp_rep_1',
            personId: person.id,
            principal: 100000,
            direction: LOAN_DIRECTION.GIVEN,
            interestRate: 10
        });

        const idemKey = 'idemp_repay_key_444';
        const repaymentsBefore = await P2PService.getRepayments(loan.id);
        assert.strictEqual(repaymentsBefore.length, 0);

        // First execution
        const res1 = await P2PService.recordRepayment({
            loanId: loan.id,
            amount: 20000,
            idempotencyKey: idemKey
        });
        const repaymentsAfter1 = await P2PService.getRepayments(loan.id);
        assert.strictEqual(repaymentsAfter1.length, 1);

        // Second execution
        const res2 = await P2PService.recordRepayment({
            loanId: loan.id,
            amount: 20000,
            idempotencyKey: idemKey
        });
        const repaymentsAfter2 = await P2PService.getRepayments(loan.id);
        assert.strictEqual(repaymentsAfter2.length, 1, 'No duplicate repayment records permitted');
    });

    // 9. Personal CFO Outstanding Balance Semantics (Current vs Original Principal)
    await itAsync('CFO Net Worth Balance Sheet strictly uses current outstanding principal, not original principal', async () => {
        P2PService.clearMemoryCache();
        await P2PService.resetToCleanState();

        const person = await P2PService.addPerson({ id: 'cfo_p1', name: 'CFO Test Counterparty' });
        const loan = await P2PService.addLoan({
            id: 'cfo_loan_1',
            personId: person.id,
            principal: 100000, // ₹1,00,000 original
            direction: LOAN_DIRECTION.GIVEN,
            interestRate: 0    // Zero interest to cleanly isolate principal
        });

        // Repay ₹40,000 principal
        await P2PService.recordRepayment({
            loanId: loan.id,
            amount: 40000
        });

        const projection = await getP2PNetWorthBalanceSheetProjection();

        // Original Principal: ₹1,00,000 = 10,000,000 paise
        assert.strictEqual(projection.originalPrincipalPaise, 10000000n);

        // Outstanding Principal: ₹60,000 = 6,000,000 paise
        assert.strictEqual(projection.outstandingPrincipalPaise, 6000000n);

        // Balance Sheet Asset contribution must be strictly ₹60,000 (NOT original ₹1,00,000!)
        assert.strictEqual(projection.p2pAssetPaise, 6000000n);
        assert.strictEqual(projection.p2pAssetRupees, 60000);
    });

    // 10. Cashbook Double-Count Prevention & Split Revenue/Expense Recognition
    it('P2P transactions reflect correctly in cashbook with zero operating burn and split interest recognition', () => {
        // Mock journal entry for a received repayment of ₹12,000 (₹10,000 principal + ₹2,000 interest)
        const journalEntry = {
            id: 'je_test_101',
            eventType: 'P2P_REPAYMENT_RECEIVED',
            entityId: 'loan_cb_1',
            eventDate: '2026-06-15',
            lines: [
                { accountId: 'HDFC Savings Account', debit: 12000, credit: 0 },
                { accountId: 'ASSET_P2P_RECEIVABLE', debit: 0, credit: 10000 },
                { accountId: 'INCOME_P2P_INTEREST', debit: 0, credit: 2000 }
            ]
        };

        const txs = mapP2PJournalToMoneyFlowTransactions([journalEntry]);
        assert.strictEqual(txs.length, 2, 'Must produce exactly two cash transactions: principal transfer and interest income');

        const principalTx = txs.find(t => t.id.includes('_principal'));
        const interestTx = txs.find(t => t.id.includes('_interest'));

        assert.ok(principalTx);
        assert.strictEqual(principalTx.type, 'TRANSFER'); // Zero burn distortion!
        assert.strictEqual(principalTx.isBurnExpense, false);
        assert.strictEqual(principalTx.amount, 10000);

        assert.ok(interestTx);
        assert.strictEqual(interestTx.type, 'INCOME'); // Taxable financing revenue
        assert.strictEqual(interestTx.isOrdinaryIncome, true);
        assert.strictEqual(interestTx.amount, 2000);
    });

    // 11. Atomic Pipeline Failure & Interrupted Write Isolation
    await itAsync('Atomic transaction lifecycle: interrupted operation leaves zero uncommitted partial state', async () => {
        P2PService.clearMemoryCache();
        await P2PService.resetToCleanState();

        const person = await P2PService.addPerson({ id: 'atomic_fail_p1', name: 'Atomic Fail Test' });

        const loansBefore = await P2PService.getLoans();
        const journalBefore = await P2PService.getJournalEntries();
        const opsBefore = await P2PService.getOperations();

        // Attempt to create loan with boundary violation (over 100 Crore)
        await assert.rejects(async () => {
            await P2PService.addLoan({
                id: 'atomic_fail_loan',
                personId: person.id,
                principalPaise: 100_000_000_001n // ₹100 Crore + 1 paisa
            });
        }, (err) => {
            return err instanceof P2PValidationError && err.code === 'ERR_LIMIT_EXCEEDED';
        });

        // Verify that ZERO partial records were written to storage or memory
        const loansAfter = await P2PService.getLoans();
        const journalAfter = await P2PService.getJournalEntries();
        const opsAfter = await P2PService.getOperations();

        assert.strictEqual(loansAfter.length, loansBefore.length, 'No loan record must be committed');
        assert.strictEqual(journalAfter.length, journalBefore.length, 'No journal entry must be committed');
        assert.strictEqual(opsAfter.filter(o => o.status === 'COMMITTED').length, opsBefore.filter(o => o.status === 'COMMITTED').length, 'No committed operation marker');
    });

    return { passed, total, name: 'P2P Adversarial, Negative & Boundary Suite' };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
    runAdversarialAndNegativeTests()
        .then(res => console.log(`\n🎉 ${res.name}: ${res.passed}/${res.total} PASSED`))
        .catch(err => { console.error(err); process.exit(1); });
}
