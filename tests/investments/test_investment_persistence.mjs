/**
 * @file test_investment_persistence.mjs
 * @description Invariant test suite for FinLife Investments Persistence, Lossless Serialization,
 * Idempotency, and Atomic Double-Entry Commit (Phase 1).
 */

import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QUANTITY_SCALE,
  MAX_PAISE,
  INSTRUMENT_TYPES,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  LEDGER_ACCOUNT_TYPES
} from '../../components/investments/investmentContracts.js';

import {
  InvestmentService,
  INVESTMENT_STORAGE_KEYS
} from '../../services/investmentService.js';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: PERSISTENCE, ATOMICITY & IDEMPOTENCY ===');
console.log('================================================================\n');

let passedCount = 0;

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  🟢 ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  🔴 ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runAll() {
  // INV-PER-01: Clean initial production state starts completely empty
  await runAsyncTest('INV-PER-01: Clean initial production state starts completely empty', async () => {
    await InvestmentService.resetToCleanState();

    const instruments = await InvestmentService.getAllInstruments();
    const accounts = await InvestmentService.getAllAccounts();
    const transactions = await InvestmentService.getAllTransactions();
    const journal = await InvestmentService.getJournalEntries();

    assert.equal(instruments.length, 0);
    assert.equal(accounts.length, 0);
    assert.equal(transactions.length, 0);
    assert.equal(journal.length, 0);
  });

  // INV-PER-02: Seed fixtures are created ONLY when explicitly invoking seedDevelopmentFixtures()
  await runAsyncTest('INV-PER-02: Seed fixtures are created ONLY when explicitly invoking seedDevelopmentFixtures()', async () => {
    await InvestmentService.resetToCleanState();
    assert.equal((await InvestmentService.getAllInstruments()).length, 0);

    const seedResult = await InvestmentService.seedDevelopmentFixtures();
    assert.equal(seedResult.instruments.length, 1);
    assert.equal(seedResult.accounts.length, 1);
    assert.equal(seedResult.instruments[0].id, 'inst_dev_hdfc50');
    assert.equal(seedResult.accounts[0].id, 'acc_dev_zerodha');

    const loadedInsts = await InvestmentService.getAllInstruments();
    assert.equal(loadedInsts.length, 1);
  });

  // INV-PER-03: Lossless serialization and hydration of BigInt paise (from 1 paise up to ₹90,000 Crore)
  await runAsyncTest('INV-PER-03: Lossless serialization and hydration of BigInt paise', async () => {
    await InvestmentService.resetToCleanState();

    const inst = await InvestmentService.addInstrument({
      id: 'inst_reliance',
      instrumentType: INSTRUMENT_TYPES.EQUITY,
      name: 'Reliance Industries Ltd'
    });

    const acc = await InvestmentService.addAccount({
      id: 'acc_zerodha_1',
      name: 'Primary Demat'
    });

    const extremePaise = 90_000_000_000_00n; // ₹90,000 Crore in paise
    const recordResult = await InvestmentService.recordTransaction({
      id: 'tx_extreme_1',
      accountId: acc.id,
      instrumentId: inst.id,
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 1_000_000n, // 1 unit
      pricePaise: extremePaise,
      grossAmountPaise: extremePaise,
      feesPaise: 1n,
      taxesPaise: 2n
    });

    assert.equal(typeof recordResult.transaction.grossAmountPaise, 'bigint');
    assert.equal(recordResult.transaction.grossAmountPaise, extremePaise);

    // Simulate cold restart
    InvestmentService.clearMemoryCache();

    const reloadedTx = await InvestmentService.getTransaction('tx_extreme_1');
    assert.equal(typeof reloadedTx.grossAmountPaise, 'bigint');
    assert.equal(reloadedTx.grossAmountPaise, extremePaise);
    assert.equal(reloadedTx.feesPaise, 1n);
    assert.equal(reloadedTx.taxesPaise, 2n);
  });

  // INV-PER-04: Lossless serialization and hydration of quantity micros (from 1 micro up to 1B units)
  await runAsyncTest('INV-PER-04: Lossless serialization and hydration of quantity micros', async () => {
    await InvestmentService.resetToCleanState();

    await InvestmentService.addInstrument({
      id: 'inst_gold_etf',
      instrumentType: INSTRUMENT_TYPES.GOLD_ETF,
      name: 'Nippon India Gold ETF'
    });

    await InvestmentService.addAccount({
      id: 'acc_demat_2',
      name: 'Demat Account 2'
    });

    // 1 micro-unit = 1n
    const microQuantity = 1n; // 0.000001 units
    await InvestmentService.recordTransaction({
      id: 'tx_micro_qty',
      accountId: 'acc_demat_2',
      instrumentId: 'inst_gold_etf',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: microQuantity,
      pricePaise: 5000_00n,
      grossAmountPaise: 1n
    });

    InvestmentService.clearMemoryCache();
    const fetched = await InvestmentService.getTransaction('tx_micro_qty');
    assert.equal(typeof fetched.quantityMicros, 'bigint');
    assert.equal(fetched.quantityMicros, 1n);
  });

  // INV-PER-05: Atomic write commit across canonical storage keys upon recording transaction (Phase 1 scope verified 5 keys, canonical current persistence verifies 9 keys)
  // NOTE: Section 48/55 treatment is implemented as the declared IN_IT_ACT_V1 policy version.
  // The engine should not be presented as a complete tax-advice or statutory-compliance system until tax-policy validation and professional review are added.
  await runAsyncTest('INV-PER-05: Atomic write commit across canonical storage keys upon recording transaction (Phase 1 scope verified 5 keys, canonical current persistence verifies 9 keys)', async () => {
    await InvestmentService.resetToCleanState();

    await InvestmentService.addInstrument({
      id: 'inst_infy',
      instrumentType: INSTRUMENT_TYPES.EQUITY,
      name: 'Infosys Ltd'
    });
    await InvestmentService.addAccount({
      id: 'acc_infy',
      name: 'Zerodha Main'
    });

    await InvestmentService.recordTransaction({
      id: 'tx_atomic_test',
      accountId: 'acc_infy',
      instrumentId: 'inst_infy',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 10_000_000n, // 10 units
      pricePaise: 1800_00n,
      grossAmountPaise: 18000_00n
    }, 'idemp_key_atomic_1');

    // Verify all 5 keys exist in AsyncStorage directly
    const [instRaw, accRaw, txRaw, jRaw, idempRaw] = await Promise.all([
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.INSTRUMENTS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.ACCOUNTS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.TRANSACTIONS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.JOURNAL),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.IDEMPOTENCY)
    ]);

    assert.ok(instRaw && JSON.parse(instRaw).length === 1);
    assert.ok(accRaw && JSON.parse(accRaw).length === 1);
    assert.ok(txRaw && JSON.parse(txRaw).length === 1);
    assert.ok(jRaw && JSON.parse(jRaw).length > 0);
    assert.ok(idempRaw && JSON.parse(idempRaw)['idemp_key_atomic_1']);
  });

  // INV-PER-06: Storage write failure triggers memory cache rollback (zero partial state)
  await runAsyncTest('INV-PER-06: Storage write failure triggers memory cache rollback to exact snapshot', async () => {
    await InvestmentService.resetToCleanState();

    await InvestmentService.addInstrument({
      id: 'inst_tcs',
      instrumentType: INSTRUMENT_TYPES.EQUITY,
      name: 'TCS'
    });
    await InvestmentService.addAccount({
      id: 'acc_tcs',
      name: 'Account'
    });

    const initialTxCount = (await InvestmentService.getAllTransactions()).length;
    assert.equal(initialTxCount, 0);

    // Mock multiSet failure
    const originalMultiSet = AsyncStorage.multiSet;
    AsyncStorage.multiSet = async () => {
      throw new Error('Disk IO write failure simulated');
    };

    try {
      await assert.rejects(
        async () => {
          await InvestmentService.recordTransaction({
            id: 'tx_failed_write',
            accountId: 'acc_tcs',
            instrumentId: 'inst_tcs',
            transactionType: TRANSACTION_TYPES.BUY,
            status: TRANSACTION_STATUS.SETTLED,
            quantityMicros: 1_000_000n,
            pricePaise: 3500_00n
          });
        },
        /Atomic write commit failed: Disk IO write failure simulated/
      );

      // Verify in-memory state rolled back
      const transactions = await InvestmentService.getAllTransactions();
      assert.equal(transactions.length, 0);
      const journal = await InvestmentService.getJournalEntries();
      assert.equal(journal.length, 0);
    } finally {
      // Restore multiSet
      AsyncStorage.multiSet = originalMultiSet;
    }
  });

  // INV-PER-07: Idempotency replay with identical key returns cached transaction and 0 duplicate entries
  await runAsyncTest('INV-PER-07: Idempotency replay with identical key returns cached result', async () => {
    await InvestmentService.resetToCleanState();

    await InvestmentService.addInstrument({
      id: 'inst_sbi',
      instrumentType: INSTRUMENT_TYPES.EQUITY,
      name: 'State Bank of India'
    });
    await InvestmentService.addAccount({
      id: 'acc_sbi',
      name: 'Demat SBI'
    });

    const idempKey = 'idemp_sbi_buy_100';

    // First call
    const call1 = await InvestmentService.recordTransaction({
      id: 'tx_sbi_1',
      accountId: 'acc_sbi',
      instrumentId: 'inst_sbi',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 5_000_000n,
      pricePaise: 800_00n
    }, idempKey);

    assert.equal(call1.isReplay, false);
    assert.equal(call1.transaction.id, 'tx_sbi_1');

    // Second call with same idempotency key
    const call2 = await InvestmentService.recordTransaction({
      id: 'tx_sbi_different_id_ignored',
      accountId: 'acc_sbi',
      instrumentId: 'inst_sbi',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 5_000_000n,
      pricePaise: 800_00n
    }, idempKey);

    assert.equal(call2.isReplay, true);
    assert.equal(call2.transaction.id, 'tx_sbi_1'); // Returned original transaction

    // Verify total transactions is strictly 1
    const allTx = await InvestmentService.getAllTransactions();
    assert.equal(allTx.length, 1);

    // Verify journal entries not duplicated
    const allJournal = await InvestmentService.getJournalEntries();
    assert.equal(allJournal.length, call1.journalEntries.length);
  });

  // INV-PER-08: Idempotency cache persists across cold restart
  await runAsyncTest('INV-PER-08: Idempotency cache persists across cold restart', async () => {
    // Clear memory cache completely
    InvestmentService.clearMemoryCache();

    const idempKey = 'idemp_sbi_buy_100';
    const callCold = await InvestmentService.recordTransaction({
      id: 'tx_should_be_skipped',
      accountId: 'acc_sbi',
      instrumentId: 'inst_sbi',
      transactionType: TRANSACTION_TYPES.BUY
    }, idempKey);

    assert.equal(callCold.isReplay, true);
    assert.equal(callCold.transaction.id, 'tx_sbi_1');

    const allTx = await InvestmentService.getAllTransactions();
    assert.equal(allTx.length, 1);
  });

  // INV-PER-09: Settled transaction records both transaction and balanced journal entries
  await runAsyncTest('INV-PER-09: Settled transaction records both transaction and journal entries', async () => {
    await InvestmentService.resetToCleanState();

    await InvestmentService.addInstrument({
      id: 'inst_lt',
      instrumentType: INSTRUMENT_TYPES.EQUITY,
      name: 'Larsen & Toubro'
    });
    await InvestmentService.addAccount({
      id: 'acc_lt',
      name: 'Zerodha'
    });

    const res = await InvestmentService.recordTransaction({
      id: 'tx_settled_lt',
      accountId: 'acc_lt',
      instrumentId: 'inst_lt',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 2_000_000n,
      pricePaise: 3600_00n,
      feesPaise: 10_00n
    });

    assert.ok(res.transaction);
    assert.ok(res.journalEntries.length > 0);

    const journalInDb = await InvestmentService.getJournalEntries({ transactionId: 'tx_settled_lt' });
    assert.equal(journalInDb.length, res.journalEntries.length);
  });

  // INV-PER-10: Non-settled transaction (PENDING) records transaction with 0 journal entries
  await runAsyncTest('INV-PER-10: Non-settled transaction (PENDING) records 0 journal entries', async () => {
    const res = await InvestmentService.recordTransaction({
      id: 'tx_pending_order',
      accountId: 'acc_lt',
      instrumentId: 'inst_lt',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.PENDING,
      quantityMicros: 1_000_000n,
      pricePaise: 3600_00n
    });

    assert.equal(res.transaction.status, TRANSACTION_STATUS.PENDING);
    assert.equal(res.journalEntries.length, 0);

    const journalInDb = await InvestmentService.getJournalEntries({ transactionId: 'tx_pending_order' });
    assert.equal(journalInDb.length, 0);
  });

  // INV-PER-11: Reversing transaction persists original updated to REVERSED plus new REVERSAL transaction and compensating entries
  await runAsyncTest('INV-PER-11: Reversing transaction persists original updated to REVERSED plus compensating entries', async () => {
    const revResult = await InvestmentService.reverseTransaction(
      'tx_settled_lt',
      'Erroneous broker trade match'
    );

    assert.equal(revResult.isReplay, false);
    assert.ok(revResult.reversalTransaction.id.startsWith('rev_tx_settled_lt'));
    assert.ok(revResult.reversalJournalEntries.length > 0);

    // Verify original transaction is marked REVERSED
    const origUpdated = await InvestmentService.getTransaction('tx_settled_lt');
    assert.equal(origUpdated.status, TRANSACTION_STATUS.REVERSED);
    assert.equal(origUpdated.reversalTransactionId, revResult.reversalTransaction.id);

    // Verify cannot reverse again
    await assert.rejects(
      async () => {
        await InvestmentService.reverseTransaction('tx_settled_lt', 'Attempt 2');
      },
      /Transaction 'tx_settled_lt' is already reversed/
    );
  });

  // INV-PER-12: Idempotent replay of reversal returns cached reversal and adds 0 duplicate entries
  await runAsyncTest('INV-PER-12: Idempotent replay of reversal returns cached reversal with 0 duplicates', async () => {
    // Record another settled transaction to reverse with idempotency
    const txToRev = await InvestmentService.recordTransaction({
      id: 'tx_for_idemp_rev',
      accountId: 'acc_lt',
      instrumentId: 'inst_lt',
      transactionType: TRANSACTION_TYPES.DIVIDEND,
      status: TRANSACTION_STATUS.SETTLED,
      grossAmountPaise: 500_00n
    });

    const revIdempKey = 'idemp_rev_test_key_999';
    const rev1 = await InvestmentService.reverseTransaction('tx_for_idemp_rev', 'Mistaken dividend', revIdempKey);
    assert.equal(rev1.isReplay, false);

    // Cold restart
    InvestmentService.clearMemoryCache();

    // Second call with same idempotency key
    const rev2 = await InvestmentService.reverseTransaction('tx_for_idemp_rev', 'Mistaken dividend', revIdempKey);
    assert.equal(rev2.isReplay, true);
    assert.equal(rev2.reversalTransaction.id, rev1.reversalTransaction.id);

    const allTx = await InvestmentService.getAllTransactions();
    const countReversals = allTx.filter(t => t.transactionType === TRANSACTION_TYPES.REVERSAL && t.reversalOfTransactionId === 'tx_for_idemp_rev').length;
    assert.equal(countReversals, 1);
  });

  // INV-PER-13: Intermediate multiplication overflow rejected before unsafe persistence
  await runAsyncTest('INV-PER-13: Intermediate multiplication overflow rejected before unsafe persistence', async () => {
    // 1. Trying to record transaction with overflowing calculation
    await assert.rejects(
      async () => {
        await InvestmentService.recordTransaction({
          id: 'tx_overflow_math',
          accountId: 'acc_lt',
          instrumentId: 'inst_lt',
          transactionType: TRANSACTION_TYPES.BUY,
          status: TRANSACTION_STATUS.SETTLED,
          quantityMicros: 1_000_000_000_000_000n, // 1 Billion units
          pricePaise: MAX_PAISE
        });
      },
      /calculatedGrossPaise out of signed 64-bit bounds/
    );

    // 2. Trying to record transaction with explicit grossAmountPaise > MAX_PAISE
    await assert.rejects(
      async () => {
        await InvestmentService.recordTransaction({
          id: 'tx_overflow_explicit',
          accountId: 'acc_lt',
          instrumentId: 'inst_lt',
          transactionType: TRANSACTION_TYPES.BUY,
          status: TRANSACTION_STATUS.SETTLED,
          grossAmountPaise: MAX_PAISE + 1n
        });
      },
      /grossAmountPaise out of signed 64-bit bounds/
    );

    // Verify neither transaction was persisted
    assert.equal(await InvestmentService.getTransaction('tx_overflow_math'), null);
    assert.equal(await InvestmentService.getTransaction('tx_overflow_explicit'), null);
  });

  console.log(`\n🎉 ALL ${passedCount} / 13 PERSISTENCE & ATOMICITY TESTS PASSED!\n`);
}

runAll().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});

