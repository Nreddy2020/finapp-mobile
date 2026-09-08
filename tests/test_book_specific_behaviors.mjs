/**
 * tests/test_book_specific_behaviors.mjs
 * 
 * Test suite for Book-Specific Financial Behaviors (Phase 3).
 * Validates:
 * 1. Handy Cash: Denomination summation counter & shortage/excess.
 * 2. Loans Taken: EMI repayment split: Principal reduces liability, Interest is period expense.
 * 3. Provident Fund: Restricted asset balance vs available liquid cash.
 * 4. Loans Given: Principal disbursed increases receivable; repayment reduces receivable.
 */

import assert from 'assert';
import {
    CashbookType,
    BalanceMode,
    TransactionType,
    TransactionStatus,
    rupeesToMoneyPaise,
    createMoneyPaise,
    createLoanRepaymentSplit,
    createPFContributionProvenance
} from '../services/cashbook/cashbookContracts.js';
import {
    calculateDenominationTotal,
    computeDailyClosingDifference,
    computeLoanRepaymentEffect,
    computePFBalances,
    computeRunningLedger
} from '../services/cashbook/cashbookEngine.js';

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

export function runBookSpecificBehaviorsTests() {
    console.log('--- START TEST SUITE: BOOK-SPECIFIC BEHAVIORS ---');

    // 1. Handy Cash Denomination Counter Summation
    check('Handy Cash: Denomination counter correctly calculates exact total', () => {
        // 10x ₹500 (₹5,000) + 5x ₹200 (₹1,000) + 12x ₹100 (₹1,200) + 20x ₹50 (₹1,000) + 15x Coins (₹15) = ₹8,215
        const denoms = {
            d500: 10,
            d200: 5,
            d100: 12,
            d50: 20,
            coins: 15
        };

        const result = calculateDenominationTotal(denoms);
        assert.strictEqual(result.bigIntPaise, 821500n);
        assert.strictEqual(result.paise, '821500');
        assert.strictEqual(result.formatted, '₹8,215');
        assert.strictEqual(result.totalCount, 62);
    });

    // 2. Handy Cash Shortage & Excess Detection
    check('Handy Cash: Daily closing difference detects exact shortage or excess', () => {
        // Scenario A: Calculated ₹10,000, physical counted ₹9,800 -> Shortage of ₹200
        const shortage = computeDailyClosingDifference({
            calculatedClosingPaise: '1000000',
            countedClosingPaise: '980000'
        });
        assert.strictEqual(shortage.differenceType, 'SHORTAGE');
        assert.strictEqual(shortage.isShortage, true);
        assert.strictEqual(shortage.differencePaise, '-20000');
        assert.strictEqual(shortage.formatted, '-₹200');

        // Scenario B: Calculated ₹10,000, physical counted ₹10,150 -> Excess of ₹150
        const excess = computeDailyClosingDifference({
            calculatedClosingPaise: '1000000',
            countedClosingPaise: '1015000'
        });
        assert.strictEqual(excess.differenceType, 'EXCESS');
        assert.strictEqual(excess.isExcess, true);
        assert.strictEqual(excess.differencePaise, '15000');
        assert.strictEqual(excess.formatted, '+₹150');

        // Scenario C: Balanced
        const balanced = computeDailyClosingDifference({
            calculatedClosingPaise: '1000000',
            countedClosingPaise: '1000000'
        });
        assert.strictEqual(balanced.differenceType, 'BALANCED');
        assert.strictEqual(balanced.isBalanced, true);
        assert.strictEqual(balanced.differencePaise, '0');
    });

    // 3. Loans Taken: EMI Repayment Split Math
    check('Loans Taken: EMI ₹1,30,000 splits into ₹90,000 principal reduction and ₹40,000 interest expense', () => {
        const split = createLoanRepaymentSplit({
            principal: rupeesToMoneyPaise(90000),
            interest: rupeesToMoneyPaise(40000),
            fees: '0'
        });

        assert.strictEqual(split.total.paise, '13000000'); // ₹1,30,000

        // Initial outstanding loan principal: ₹50,00,000
        const effect = computeLoanRepaymentEffect({
            split,
            currentOutstandingPrincipalPaise: rupeesToMoneyPaise(5000000).paise
        });

        assert.strictEqual(effect.principalReductionPaise, '9000000'); // ₹90,000 reduces principal
        assert.strictEqual(effect.interestExpensePaise, '4000000');    // ₹40,000 period expense
        assert.strictEqual(effect.remainingPrincipalPaise, '491000000'); // ₹49,10,000
        assert.strictEqual(effect.remainingPrincipalFormatted, '₹49,10,000');

        // In Loan Liability Ledger: Running balance tracks outstanding debt
        const loanTxn = {
            id: 'txn_emi_1',
            date: '2026-09-05',
            transactionType: TransactionType.EXPENSE,
            amount: split.total,
            loanSplit: split,
            description: 'SBI Home Loan EMI',
            status: TransactionStatus.POSTED
        };

        const loanLedger = computeRunningLedger({
            openingBalance: rupeesToMoneyPaise(5000000),
            transactions: [loanTxn],
            bookType: CashbookType.LOANS_TAKEN
        });

        // Opening debt: ₹50,00,000 -> EMI paid with ₹90,000 principal -> Closing debt: ₹49,10,000
        assert.strictEqual(loanLedger.rows[0].runningBalancePaise, '500000000');
        assert.strictEqual(loanLedger.rows[1].runningBalancePaise, '491000000');
        assert.strictEqual(loanLedger.summary.closingBalancePaise, '491000000');
    });

    // 4. Provident Fund (PF): Restricted Asset vs Liquid Cash Split
    check('Provident Fund: Aggregates contributions into restricted asset with ₹0 liquid cash', () => {
        const prov = createPFContributionProvenance({
            employee: rupeesToMoneyPaise(1800),
            employer: rupeesToMoneyPaise(1800),
            pension: rupeesToMoneyPaise(1250),
            interest: rupeesToMoneyPaise(650)
        });

        const pfTxn = {
            id: 'txn_pf_aug',
            date: '2026-08-31',
            transactionType: TransactionType.INCOME,
            amount: prov.total,
            provenance: prov,
            description: 'August PF Contribution',
            status: TransactionStatus.POSTED
        };

        const pfBalances = computePFBalances({
            openingBalance: rupeesToMoneyPaise(840000), // ₹8,40,000 opening
            transactions: [pfTxn]
        });

        // 840,000 + (1800 + 1800 + 1250 + 650 = 5500) = ₹8,45,500
        assert.strictEqual(pfBalances.totalAssetPaise, '84550000');
        assert.strictEqual(pfBalances.totalAssetFormatted, '₹8,45,500');
        assert.strictEqual(pfBalances.restrictedPaise, '84550000'); // 100% restricted asset
        assert.strictEqual(pfBalances.availableLiquidPaise, '0');    // Zero liquid cash
    });

    // 5. Loans Given: Disbursement increases receivable, repayment decreases receivable
    check('Loans Given: Disbursing loan increases receivable, repayment reduces receivable', () => {
        const txns = [
            {
                id: 't_disburse',
                date: '2026-09-01',
                transactionType: TransactionType.EXPENSE,
                amount: rupeesToMoneyPaise(50000),
                description: 'Personal Loan to Rahul',
                status: TransactionStatus.POSTED
            },
            {
                id: 't_repay',
                date: '2026-09-15',
                transactionType: TransactionType.INCOME,
                amount: rupeesToMoneyPaise(20000),
                description: 'Rahul Partial Repayment',
                status: TransactionStatus.POSTED
            }
        ];

        const ledger = computeRunningLedger({
            openingBalance: '0',
            transactions: txns,
            bookType: CashbookType.LOANS_GIVEN
        });

        // Disbursement: ₹50,000 receivable
        assert.strictEqual(ledger.rows[0].runningBalancePaise, '5000000');
        // Repayment: ₹50,000 - ₹20,000 = ₹30,000 remaining receivable
        assert.strictEqual(ledger.rows[1].runningBalancePaise, '3000000');
        assert.strictEqual(ledger.summary.closingBalancePaise, '3000000');
    });

    console.log(`--- BOOK-SPECIFIC BEHAVIORS SUITE PASSED (${passedChecks} assertions) ---\n`);
}

if (process.argv[1]?.endsWith('test_book_specific_behaviors.mjs')) {
    runBookSpecificBehaviorsTests();
}
