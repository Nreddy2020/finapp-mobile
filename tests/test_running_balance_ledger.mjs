/**
 * tests/test_running_balance_ledger.mjs
 * 
 * Test suite for Running Balance Ledger Calculations (Phase 3).
 * Validates:
 * 1. Strict chronological running balance calculation with integer BigInt paise.
 * 2. Continuity across opening balance, receipts, payments, and transfers.
 * 3. Correct row formatting across Mode A (Simple Cashbook) and Mode B (Account Ledger).
 * 4. Reversals/voids correctly update running balance from point of entry onwards.
 */

import assert from 'assert';
import {
    CashbookType,
    BalanceMode,
    TransactionType,
    TransactionStatus,
    rupeesToMoneyPaise,
    createMoneyPaise
} from '../services/cashbook/cashbookContracts.js';
import { computeRunningLedger } from '../services/cashbook/cashbookEngine.js';

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

export function runRunningBalanceLedgerTests() {
    console.log('--- START TEST SUITE: RUNNING BALANCE LEDGER ---');

    // 1. Chronological running balance progression
    check('Chronological progression: Opening ₹25,000 + ₹75,000 - ₹22,000 = ₹78,000', () => {
        const txns = [
            {
                id: 't1',
                date: '2026-09-01',
                transactionType: TransactionType.INCOME,
                amount: rupeesToMoneyPaise(75000),
                description: 'Salary',
                status: TransactionStatus.POSTED
            },
            {
                id: 't2',
                date: '2026-09-03',
                transactionType: TransactionType.EXPENSE,
                amount: rupeesToMoneyPaise(22000),
                description: 'House Rent',
                status: TransactionStatus.POSTED
            }
        ];

        const ledger = computeRunningLedger({
            openingBalance: rupeesToMoneyPaise(25000),
            transactions: txns,
            bookType: CashbookType.SAVINGS
        });

        assert.strictEqual(ledger.rows.length, 3); // 1 opening + 2 txns

        // Row 0: Opening
        assert.strictEqual(ledger.rows[0].isOpening, true);
        assert.strictEqual(ledger.rows[0].runningBalancePaise, '2500000'); // ₹25,000

        // Row 1: Salary Income
        assert.strictEqual(ledger.rows[1].particulars, 'Salary');
        assert.strictEqual(ledger.rows[1].moneyInPaise, '7500000');
        assert.strictEqual(ledger.rows[1].runningBalancePaise, '10000000'); // ₹1,00,000
        assert.strictEqual(ledger.rows[1].runningBalanceFormatted, '₹1,00,000');

        // Row 2: Rent Expense
        assert.strictEqual(ledger.rows[2].particulars, 'House Rent');
        assert.strictEqual(ledger.rows[2].moneyOutPaise, '2200000');
        assert.strictEqual(ledger.rows[2].runningBalancePaise, '7800000'); // ₹78,000
        assert.strictEqual(ledger.rows[2].runningBalanceFormatted, '₹78,000');

        // Summary
        assert.strictEqual(ledger.summary.closingBalancePaise, '7800000');
        assert.strictEqual(ledger.summary.closingBalanceFormatted, '₹78,000');
    });

    // 2. Out of order date inputs are automatically sorted chronologically
    check('Auto-sorts chronologically regardless of insertion order', () => {
        const unorderedTxns = [
            { id: 't3', date: '2026-09-10', transactionType: TransactionType.EXPENSE, amount: rupeesToMoneyPaise(500), status: TransactionStatus.POSTED },
            { id: 't1', date: '2026-09-02', transactionType: TransactionType.INCOME, amount: rupeesToMoneyPaise(2000), status: TransactionStatus.POSTED },
            { id: 't2', date: '2026-09-05', transactionType: TransactionType.EXPENSE, amount: rupeesToMoneyPaise(300), status: TransactionStatus.POSTED }
        ];

        const ledger = computeRunningLedger({
            openingBalance: rupeesToMoneyPaise(1000),
            transactions: unorderedTxns
        });

        assert.strictEqual(ledger.rows[1].transactionId, 't1'); // Sep 02: 1000 + 2000 = 3000
        assert.strictEqual(ledger.rows[1].runningBalancePaise, '300000');

        assert.strictEqual(ledger.rows[2].transactionId, 't2'); // Sep 05: 3000 - 300 = 2700
        assert.strictEqual(ledger.rows[2].runningBalancePaise, '270000');

        assert.strictEqual(ledger.rows[3].transactionId, 't3'); // Sep 10: 2700 - 500 = 2200
        assert.strictEqual(ledger.rows[3].runningBalancePaise, '220000');
    });

    // 3. Voided transaction does not mutate running balance
    check('Voided transaction preserves continuity without affecting active balance', () => {
        const txns = [
            { id: 't1', date: '2026-09-01', transactionType: TransactionType.INCOME, amount: rupeesToMoneyPaise(5000), status: TransactionStatus.POSTED },
            { id: 't2_voided', date: '2026-09-02', transactionType: TransactionType.EXPENSE, amount: rupeesToMoneyPaise(2000), status: TransactionStatus.VOIDED, voidReason: 'Duplicate entry' },
            { id: 't3', date: '2026-09-03', transactionType: TransactionType.EXPENSE, amount: rupeesToMoneyPaise(1000), status: TransactionStatus.POSTED }
        ];

        const ledger = computeRunningLedger({
            openingBalance: '0',
            transactions: txns
        });

        // t1: balance = 5000
        assert.strictEqual(ledger.rows[0].runningBalancePaise, '500000');

        // t2_voided: row exists with isVoided=true, running balance remains 5000
        assert.strictEqual(ledger.rows[1].isVoided, true);
        assert.strictEqual(ledger.rows[1].voidReason, 'Duplicate entry');
        assert.strictEqual(ledger.rows[1].runningBalancePaise, '500000');

        // t3: 5000 - 1000 = 4000
        assert.strictEqual(ledger.rows[2].runningBalancePaise, '400000');
        assert.strictEqual(ledger.summary.closingBalancePaise, '400000');
    });

    // 4. Debit and Credit column outputs (Mode B)
    check('Debit / Credit output fields strictly balance with Money In / Out', () => {
        const txns = [
            { id: 't1', date: '2026-09-01', transactionType: TransactionType.INCOME, amount: rupeesToMoneyPaise(10000), status: TransactionStatus.POSTED },
            { id: 't2', date: '2026-09-02', transactionType: TransactionType.EXPENSE, amount: rupeesToMoneyPaise(4000), status: TransactionStatus.POSTED }
        ];

        const ledger = computeRunningLedger({
            transactions: txns,
            bookType: CashbookType.BUSINESS_CASH_AND_OBLIGATIONS
        });

        assert.strictEqual(ledger.rows[0].creditPaise, '1000000');
        assert.strictEqual(ledger.rows[0].debitPaise, '0');

        assert.strictEqual(ledger.rows[1].debitPaise, '400000');
        assert.strictEqual(ledger.rows[1].creditPaise, '0');

        assert.strictEqual(ledger.summary.totalCreditPaise, '1000000');
        assert.strictEqual(ledger.summary.totalDebitPaise, '400000');
    });

    console.log(`--- RUNNING BALANCE LEDGER SUITE PASSED (${passedChecks} assertions) ---\n`);
}

if (process.argv[1]?.endsWith('test_running_balance_ledger.mjs')) {
    runRunningBalanceLedgerTests();
}
