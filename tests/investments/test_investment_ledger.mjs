/**
 * @file test_investment_ledger.mjs
 * @description Invariant test suite for FinLife Investments Double-Entry Journal Engine (Phase 1).
 */

import assert from 'node:assert/strict';
import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  LEDGER_ACCOUNT_TYPES
} from '../../components/investments/investmentContracts.js';

import {
  generateJournalEntries,
  createReversalJournalEntries,
  assertJournalBalanced,
  calculateLedgerBalances
} from '../../components/investments/investmentLedger.js';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: DOUBLE-ENTRY BALANCED JOURNAL TESTS ===');
console.log('================================================================\n');

let passedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  🟢 ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  🔴 ${name}`);
    console.error(err);
    process.exit(1);
  }
}

// INV-LED-01: BUY transaction generates balanced journal entries
runTest('INV-LED-01: BUY transaction generates balanced journal entries', () => {
  const buyTx = {
    id: 'tx_buy_1',
    instrumentId: 'inst_tcs',
    accountId: 'acc_zerodha',
    transactionType: TRANSACTION_TYPES.BUY,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 100_000_00n, // ₹1,00,000
    feesPaise: 2000n,              // ₹20 brokerage
    taxesPaise: 1000n,             // ₹10 STT
    settlementDate: '2026-09-08'
  };

  const entries = generateJournalEntries(buyTx);
  assert.equal(entries.length, 4); // Asset, Fee, Tax, Cash
  assert.equal(assertJournalBalanced(entries), true);

  const assetEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.ASSET_INVESTMENT);
  const feeEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.FEES_EXPENSE);
  const taxEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.TAX_EXPENSE);
  const cashEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT);

  assert.equal(assetEntry.debitPaise, 100_000_00n);
  assert.equal(feeEntry.debitPaise, 2000n);
  assert.equal(taxEntry.debitPaise, 1000n);
  assert.equal(cashEntry.creditPaise, 100_030_00n); // 10000000 + 2000 + 1000
});

// INV-LED-02: SELL transaction generates balanced journal entries
runTest('INV-LED-02: SELL transaction generates balanced journal entries', () => {
  const sellTx = {
    id: 'tx_sell_1',
    instrumentId: 'inst_tcs',
    accountId: 'acc_zerodha',
    transactionType: TRANSACTION_TYPES.SELL,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 150_000_00n, // ₹1,50,000
    feesPaise: 3000n,              // ₹30
    taxesPaise: 1500n,             // ₹15
    settlementDate: '2026-09-08'
  };

  const entries = generateJournalEntries(sellTx);
  assert.equal(entries.length, 4);
  assert.equal(assertJournalBalanced(entries), true);

  const assetEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.ASSET_INVESTMENT);
  const feeEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.FEES_EXPENSE);
  const taxEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.TAX_EXPENSE);
  const cashEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT);

  assert.equal(assetEntry.creditPaise, 150_000_00n);
  assert.equal(feeEntry.debitPaise, 3000n);
  assert.equal(taxEntry.debitPaise, 1500n);
  assert.equal(cashEntry.debitPaise, 149_955_00n); // 15000000 - 3000 - 1500
});

// INV-LED-03: DIVIDEND transaction generates balanced journal entries
runTest('INV-LED-03: DIVIDEND transaction generates balanced journal entries', () => {
  const divTx = {
    id: 'tx_div_1',
    instrumentId: 'inst_infy',
    accountId: 'acc_zerodha',
    transactionType: TRANSACTION_TYPES.DIVIDEND,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 5000_00n, // ₹5,000
    taxesPaise: 500_00n,        // ₹500 TDS (10%)
    settlementDate: '2026-09-08'
  };

  const entries = generateJournalEntries(divTx);
  assert.equal(entries.length, 3);
  assert.equal(assertJournalBalanced(entries), true);

  const cashEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT);
  const taxEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.TAX_EXPENSE);
  const incomeEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.DIVIDEND_INCOME);

  assert.equal(cashEntry.debitPaise, 4500_00n);
  assert.equal(taxEntry.debitPaise, 500_00n);
  assert.equal(incomeEntry.creditPaise, 5000_00n);
});

// INV-LED-04: INTEREST transaction generates balanced journal entries
runTest('INV-LED-04: INTEREST transaction generates balanced journal entries', () => {
  const intTx = {
    id: 'tx_int_1',
    instrumentId: 'inst_gsec',
    accountId: 'acc_rbi',
    transactionType: TRANSACTION_TYPES.INTEREST,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 7500_00n, // ₹7,500
    taxesPaise: 750_00n,        // ₹750 TDS
    settlementDate: '2026-09-08'
  };

  const entries = generateJournalEntries(intTx);
  assert.equal(entries.length, 3);
  assert.equal(assertJournalBalanced(entries), true);

  const cashEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT);
  const taxEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.TAX_EXPENSE);
  const incomeEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.INTEREST_INCOME);

  assert.equal(cashEntry.debitPaise, 6750_00n);
  assert.equal(taxEntry.debitPaise, 750_00n);
  assert.equal(incomeEntry.creditPaise, 7500_00n);
});

// INV-LED-05: FEE transaction generates balanced journal entries
runTest('INV-LED-05: FEE transaction generates balanced journal entries', () => {
  const feeTx = {
    id: 'tx_fee_1',
    instrumentId: 'inst_demat',
    accountId: 'acc_zerodha',
    transactionType: TRANSACTION_TYPES.FEE,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 350_00n, // ₹350 AMC
    settlementDate: '2026-09-08'
  };

  const entries = generateJournalEntries(feeTx);
  assert.equal(entries.length, 2);
  assert.equal(assertJournalBalanced(entries), true);

  const feeEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.FEES_EXPENSE);
  const cashEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT);

  assert.equal(feeEntry.debitPaise, 350_00n);
  assert.equal(cashEntry.creditPaise, 350_00n);
});

// INV-LED-06: TAX transaction generates balanced journal entries
runTest('INV-LED-06: TAX transaction generates balanced journal entries', () => {
  const taxTx = {
    id: 'tx_tax_1',
    instrumentId: 'inst_tcs',
    accountId: 'acc_zerodha',
    transactionType: TRANSACTION_TYPES.TAX,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 1200_00n, // ₹1,200 direct advance tax
    settlementDate: '2026-09-08'
  };

  const entries = generateJournalEntries(taxTx);
  assert.equal(entries.length, 2);
  assert.equal(assertJournalBalanced(entries), true);

  const taxEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.TAX_EXPENSE);
  const cashEntry = entries.find(e => e.account === LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT);

  assert.equal(taxEntry.debitPaise, 1200_00n);
  assert.equal(cashEntry.creditPaise, 1200_00n);
});

// INV-LED-07: Authoritative rule: non-settled status produces strictly 0 entries
runTest('INV-LED-07: DRAFT, PENDING, FAILED, CANCELLED produce strictly 0 entries', () => {
  const nonSettledStatuses = [
    TRANSACTION_STATUS.DRAFT,
    TRANSACTION_STATUS.PENDING,
    TRANSACTION_STATUS.FAILED,
    TRANSACTION_STATUS.CANCELLED
  ];

  for (const status of nonSettledStatuses) {
    const tx = {
      id: `tx_${status}`,
      instrumentId: 'inst_test',
      accountId: 'acc_test',
      transactionType: TRANSACTION_TYPES.BUY,
      status,
      grossAmountPaise: 50_000_00n
    };
    const entries = generateJournalEntries(tx);
    assert.deepEqual(entries, []);
  }
});

// INV-LED-08: Reversal generates exact symmetric inverted journal entries
runTest('INV-LED-08: Reversal generates exact symmetric inverted journal entries', () => {
  const buyTx = {
    id: 'tx_orig_buy',
    instrumentId: 'inst_tcs',
    accountId: 'acc_zerodha',
    transactionType: TRANSACTION_TYPES.BUY,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 10_000_00n,
    feesPaise: 500n,
    taxesPaise: 200n
  };

  const originalEntries = generateJournalEntries(buyTx);
  const reversalEntries = createReversalJournalEntries(originalEntries, 'tx_rev_buy');

  assert.equal(reversalEntries.length, originalEntries.length);
  for (let i = 0; i < originalEntries.length; i++) {
    const orig = originalEntries[i];
    const rev = reversalEntries[i];
    assert.equal(rev.account, orig.account);
    assert.equal(rev.debitPaise, orig.creditPaise);
    assert.equal(rev.creditPaise, orig.debitPaise);
  }
});

// INV-LED-09: Reversal journal entries remain perfectly balanced
runTest('INV-LED-09: Reversal journal entries remain perfectly balanced', () => {
  const sellTx = {
    id: 'tx_orig_sell',
    instrumentId: 'inst_tcs',
    accountId: 'acc_zerodha',
    transactionType: TRANSACTION_TYPES.SELL,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 25_000_00n,
    feesPaise: 1000n,
    taxesPaise: 500n
  };

  const orig = generateJournalEntries(sellTx);
  const rev = createReversalJournalEntries(orig, 'tx_rev_sell');
  assert.equal(assertJournalBalanced(rev), true);
});

// INV-LED-10: Running ledger balance calculation correctly reconciles
runTest('INV-LED-10: Running ledger balance calculation correctly reconciles', () => {
  const buyTx = {
    id: 'tx_b1',
    instrumentId: 'inst_1',
    accountId: 'acc_1',
    transactionType: TRANSACTION_TYPES.BUY,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 10_000_00n, // ₹10,000
    feesPaise: 100n,
    taxesPaise: 50n
  };

  const sellTx = {
    id: 'tx_s1',
    instrumentId: 'inst_1',
    accountId: 'acc_1',
    transactionType: TRANSACTION_TYPES.SELL,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 6_000_00n, // ₹6,000
    feesPaise: 60n,
    taxesPaise: 30n
  };

  const buyEntries = generateJournalEntries(buyTx);
  const sellEntries = generateJournalEntries(sellTx);
  const allEntries = [...buyEntries, ...sellEntries];

  const balances = calculateLedgerBalances(allEntries);

  // Asset Investment: Debited 10,000_00, Credited 6,000_00 => netDebit 4,000_00n
  assert.equal(balances[LEDGER_ACCOUNT_TYPES.ASSET_INVESTMENT].netDebitPaise, 4_000_00n);

  // Fees: Debited 100 + 60 = 160n
  assert.equal(balances[LEDGER_ACCOUNT_TYPES.FEES_EXPENSE].netDebitPaise, 160n);

  // Taxes: Debited 50 + 30 = 80n
  assert.equal(balances[LEDGER_ACCOUNT_TYPES.TAX_EXPENSE].netDebitPaise, 80n);

  // Cash: Credited (1000000 + 100 + 50) = 1000150n. Debited (600000 - 60 - 30) = 599910n.
  // netCredit = 1000150 - 599910 = 400240n.
  assert.equal(balances[LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT].netCreditPaise, 400_240n);

  // Total debits across all accounts must equal total credits across all accounts
  let grandDebits = 0n;
  let grandCredits = 0n;
  for (const acc of Object.values(balances)) {
    grandDebits += acc.debitsPaise;
    grandCredits += acc.creditsPaise;
  }
  assert.equal(grandDebits, grandCredits);
});

// INV-LED-11: Corporate actions produce 0 entries in basic monetary journal
runTest('INV-LED-11: Corporate actions produce 0 entries in basic monetary journal', () => {
  const bonusTx = {
    id: 'tx_bonus_1',
    instrumentId: 'inst_tcs',
    accountId: 'acc_zerodha',
    transactionType: TRANSACTION_TYPES.BONUS,
    status: TRANSACTION_STATUS.SETTLED,
    grossAmountPaise: 0n
  };

  const entries = generateJournalEntries(bonusTx);
  assert.deepEqual(entries, []);
});

// INV-LED-12: Unbalanced journal entry detection throws an error
runTest('INV-LED-12: assertJournalBalanced throws on artificially unbalanced entry', () => {
  const badEntries = [
    {
      entryId: 'bad_1',
      account: LEDGER_ACCOUNT_TYPES.ASSET_INVESTMENT,
      debitPaise: 1000n,
      creditPaise: 0n
    },
    {
      entryId: 'bad_2',
      account: LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT,
      debitPaise: 0n,
      creditPaise: 999n // Unbalanced by 1 paise
    }
  ];

  assert.throws(() => {
    assertJournalBalanced(badEntries);
  }, /Unbalanced journal entry detected/);
});

console.log(`\n🎉 ALL ${passedCount} / 12 DOUBLE-ENTRY JOURNAL TESTS PASSED!\n`);
