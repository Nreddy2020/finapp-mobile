/**
 * @file test_investment_holdings.mjs
 * @description Invariant test suite for FinLife Investments Derived Holdings, Reconciliation,
 * Service Integration, and Cache Corruption Auto-Recovery (Phase 2).
 */

import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QUANTITY_SCALE,
  MAX_PAISE,
  MIN_PAISE,
  INSTRUMENT_TYPES,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  TAX_LOT_STATUS,
  COST_BASIS_STATUS,
  HOLDING_STATUS,
  DEPLETION_METHOD
} from '../../components/investments/investmentContracts.js';

import {
  projectHoldingsFromLots,
  reconcileHoldingWithLots
} from '../../components/investments/investmentHoldingsEngine.js';

import {
  createTaxLot
} from '../../components/investments/investmentTaxLotEngine.js';

import {
  InvestmentService,
  INVESTMENT_STORAGE_KEYS
} from '../../services/investmentService.js';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: HOLDINGS & SERVICE INTEGRATION TESTS ===');
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
  // INV-HLD-01: Holdings derived strictly from active lots
  await runAsyncTest('INV-HLD-01: Holdings are derived strictly from active tax lots', async () => {
    const lot1 = createTaxLot({
      transactionId: 'tx_1',
      accountId: 'acc_A',
      instrumentId: 'inst_1',
      quantityMicros: 10_000_000n,
      costBasisPaise: 10_000_00n
    });
    const lot2 = createTaxLot({
      transactionId: 'tx_2',
      accountId: 'acc_A',
      instrumentId: 'inst_1',
      quantityMicros: 5_000_000n,
      costBasisPaise: 5_500_00n
    });

    const holdings = projectHoldingsFromLots({ lots: [lot1, lot2] });
    assert.equal(holdings.length, 1);
    assert.equal(holdings[0].totalQuantityMicros, 15_000_000n);
    assert.equal(holdings[0].totalCostBasisPaise, 15_500_00n);
    assert.equal(holdings[0].lotCount, 2);
    assert.equal(holdings[0].status, HOLDING_STATUS.ACTIVE);
  });

  // INV-HLD-02: Depleted lots do not contribute to holding quantity or basis
  await runAsyncTest('INV-HLD-02: Depleted lots do not contribute to active holding', async () => {
    const lotActive = createTaxLot({
      transactionId: 'tx_act',
      accountId: 'acc_A',
      instrumentId: 'inst_1',
      quantityMicros: 8_000_000n,
      costBasisPaise: 8_000_00n
    });
    const lotClosed = createTaxLot({
      transactionId: 'tx_closed',
      accountId: 'acc_A',
      instrumentId: 'inst_1',
      quantityMicros: 5_000_000n,
      costBasisPaise: 5_000_00n
    });
    lotClosed.status = TAX_LOT_STATUS.DEPLETED;
    lotClosed.remainingQuantityMicros = 0n;
    lotClosed.remainingCostBasisPaise = 0n;

    const holdings = projectHoldingsFromLots({ lots: [lotActive, lotClosed] });
    assert.equal(holdings.length, 1);
    assert.equal(holdings[0].totalQuantityMicros, 8_000_000n);
    assert.equal(holdings[0].totalCostBasisPaise, 8_000_00n);
    assert.equal(holdings[0].lotCount, 1);
  });

  // INV-HLD-03: Cost basis status hierarchy: all available -> AVAILABLE; mixed -> PARTIAL; all unavailable -> UNAVAILABLE
  await runAsyncTest('INV-HLD-03: Cost basis status hierarchy behaves correctly', async () => {
    const lotKnown = createTaxLot({
      transactionId: 'tx_k',
      accountId: 'acc_A',
      instrumentId: 'inst_mix',
      quantityMicros: 5_000_000n,
      costBasisPaise: 5_000_00n,
      costBasisStatus: COST_BASIS_STATUS.AVAILABLE
    });
    const lotUnknown = createTaxLot({
      transactionId: 'tx_u',
      accountId: 'acc_A',
      instrumentId: 'inst_mix',
      quantityMicros: 5_000_000n,
      costBasisStatus: COST_BASIS_STATUS.UNAVAILABLE,
      costBasisPaise: null
    });

    // Mixed
    const mixedHoldings = projectHoldingsFromLots({ lots: [lotKnown, lotUnknown] });
    assert.equal(mixedHoldings[0].costBasisStatus, COST_BASIS_STATUS.PARTIAL);
    assert.equal(mixedHoldings[0].totalCostBasisPaise, 5_000_00n); // known partial sum

    // Pure unavailable
    const pureUnkHoldings = projectHoldingsFromLots({ lots: [lotUnknown] });
    assert.equal(pureUnkHoldings[0].costBasisStatus, COST_BASIS_STATUS.UNAVAILABLE);
    assert.equal(pureUnkHoldings[0].totalCostBasisPaise, null); // Strictly null!
  });

  // INV-HLD-04: Average cost per unit uses deterministic half-up micro-scale math
  await runAsyncTest('INV-HLD-04: Average cost per unit uses deterministic half-up math', async () => {
    // 3 units for ₹100.00 = 10,000 paise -> avg = 3,333.3333 -> 3,333 paise
    const lot = createTaxLot({
      transactionId: 'tx_avg',
      accountId: 'acc_A',
      instrumentId: 'inst_1',
      quantityMicros: 3_000_000n,
      costBasisPaise: 100_00n
    });

    const holdings = projectHoldingsFromLots({ lots: [lot] });
    assert.equal(holdings[0].averageCostPerUnitPaise, 33_33n); // ₹33.33 per unit
  });

  // INV-HLD-05: Holding reconciles with active lots with exact ₹0 deviation
  await runAsyncTest('INV-HLD-05: reconcileHoldingWithLots confirms exact ₹0 deviation', async () => {
    const lot = createTaxLot({
      transactionId: 'tx_rec',
      accountId: 'acc_A',
      instrumentId: 'inst_1',
      quantityMicros: 10_000_000n,
      costBasisPaise: 50_000_00n
    });

    const holdings = projectHoldingsFromLots({ lots: [lot] });
    assert.equal(reconcileHoldingWithLots(holdings[0], [lot]), true);
  });

  // INV-HLD-06: End-to-end Service Buy -> Tax lot created -> Holding projected
  await runAsyncTest('INV-HLD-06: Service Buy records transaction, creates tax lot, and projects holding', async () => {
    await InvestmentService.resetToCleanState();

    const inst = await InvestmentService.addInstrument({
      id: 'inst_tcs',
      instrumentType: INSTRUMENT_TYPES.EQUITY,
      name: 'Tata Consultancy Services'
    });
    const acc = await InvestmentService.addAccount({
      id: 'acc_zerodha',
      name: 'Zerodha Main'
    });

    const res = await InvestmentService.recordTransaction({
      id: 'tx_buy_tcs_1',
      accountId: acc.id,
      instrumentId: inst.id,
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 10_000_000n, // 10 shares
      pricePaise: 3500_00n,        // ₹3,500
      feesPaise: 20_00n,           // ₹20
      taxesPaise: 10_00n            // ₹10
    });

    assert.equal(res.taxLots.length, 1);
    const lot = res.taxLots[0];
    assert.equal(lot.initialQuantityMicros, 10_000_000n);
    // Cost basis capitalized = 35000_00 + 20_00 + 10_00 = 35030_00n
    assert.equal(lot.initialCostBasisPaise, 35030_00n);

    assert.equal(res.holdings.length, 1);
    const holding = res.holdings[0];
    assert.equal(holding.totalQuantityMicros, 10_000_000n);
    assert.equal(holding.totalCostBasisPaise, 35030_00n);
    assert.equal(holding.status, HOLDING_STATUS.ACTIVE);
  });

  // INV-HLD-07: Non-settled transactions (PENDING) produce 0 lots and 0 holding changes
  await runAsyncTest('INV-HLD-07: PENDING transaction produces 0 lots and 0 holding changes', async () => {
    const res = await InvestmentService.recordTransaction({
      id: 'tx_pending_tcs',
      accountId: 'acc_zerodha',
      instrumentId: 'inst_tcs',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.PENDING,
      quantityMicros: 5_000_000n,
      pricePaise: 3500_00n
    });

    const holding = await InvestmentService.getHolding('acc_zerodha', 'inst_tcs');
    // Holding remains unchanged at 10 shares from previous test
    assert.equal(holding.totalQuantityMicros, 10_000_000n);
    assert.equal(res.taxLots.length, 1); // Only original lot
  });

  // INV-HLD-08: End-to-end FIFO Sell depletes lot and updates holding
  await runAsyncTest('INV-HLD-08: Service FIFO Sell depletes lot, records realized gain, and updates holding', async () => {
    const res = await InvestmentService.recordTransaction({
      id: 'tx_sell_tcs_1',
      accountId: 'acc_zerodha',
      instrumentId: 'inst_tcs',
      transactionType: TRANSACTION_TYPES.SELL,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 4_000_000n, // Sell 4 shares
      pricePaise: 4000_00n,        // ₹4,000 per share = ₹16,000 gross
      feesPaise: 15_00n,
      taxesPaise: 5_00n
    });

    // Net proceeds: 16000_00 - 20_00 = 15980_00n
    // Depleted cost basis for 4/10 of 35030_00 = 14012_00n
    // Realized gain: 15980_00 - 14012_00 = 1968_00n
    assert.equal(res.transaction.realizedGainLossPaise, 1968_00n);

    const holding = await InvestmentService.getHolding('acc_zerodha', 'inst_tcs');
    assert.equal(holding.totalQuantityMicros, 6_000_000n); // 6 shares remaining
    assert.equal(holding.totalCostBasisPaise, 21018_00n); // 35030_00 - 14012_00 = 21018_00n
  });

  // INV-HLD-09: End-to-end Bonus corporate action creates zero-cost lot
  await runAsyncTest('INV-HLD-09: Bonus corporate action increases quantity with 0 added cost basis', async () => {
    // 1:1 bonus on remaining 6 shares -> 6 bonus shares
    const res = await InvestmentService.recordTransaction({
      id: 'tx_bonus_tcs',
      accountId: 'acc_zerodha',
      instrumentId: 'inst_tcs',
      transactionType: TRANSACTION_TYPES.BONUS,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 6_000_000n
    });

    const holding = await InvestmentService.getHolding('acc_zerodha', 'inst_tcs');
    assert.equal(holding.totalQuantityMicros, 12_000_000n); // 6 + 6 = 12 shares
    // Total cost basis remains strictly unchanged at ₹21,018
    assert.equal(holding.totalCostBasisPaise, 21018_00n);
    assert.equal(holding.lotCount, 2); // 1 original partially depleted + 1 bonus lot
  });

  // INV-HLD-10: End-to-end Stock Split multiplies quantity and preserves total basis
  await runAsyncTest('INV-HLD-10: Stock Split multiplies quantity and preserves exact total cost basis', async () => {
    // 1:2 split (numerator 2, denominator 1) -> 12 shares becomes 24 shares
    const res = await InvestmentService.recordTransaction({
      id: 'tx_split_tcs',
      accountId: 'acc_zerodha',
      instrumentId: 'inst_tcs',
      transactionType: TRANSACTION_TYPES.STOCK_SPLIT,
      status: TRANSACTION_STATUS.SETTLED,
      metadata: {
        splitNumerator: 2,
        splitDenominator: 1
      }
    });

    const holding = await InvestmentService.getHolding('acc_zerodha', 'inst_tcs');
    assert.equal(holding.totalQuantityMicros, 24_000_000n); // 24 shares
    // Cost basis remains invariant!
    assert.equal(holding.totalCostBasisPaise, 21018_00n);
  });

  // INV-HLD-11: End-to-end Sale Reversal restores lots and holding
  await runAsyncTest('INV-HLD-11: Reversing sale restores depleted lots and holding quantity', async () => {
    // Record another purchase and sale to reverse cleanly
    const buy2 = await InvestmentService.recordTransaction({
      id: 'tx_buy_rev_test',
      accountId: 'acc_zerodha',
      instrumentId: 'inst_tcs',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 5_000_00n, // 0.5 shares
      pricePaise: 4000_00n
    });

    const sell2 = await InvestmentService.recordTransaction({
      id: 'tx_sell_rev_test',
      accountId: 'acc_zerodha',
      instrumentId: 'inst_tcs',
      transactionType: TRANSACTION_TYPES.SELL,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 5_000_00n,
      pricePaise: 4200_00n
    });

    const qtyBeforeRev = (await InvestmentService.getHolding('acc_zerodha', 'inst_tcs')).totalQuantityMicros;

    // Reverse sell2
    const revResult = await InvestmentService.reverseTransaction('tx_sell_rev_test', 'Mistaken sell');
    assert.equal(revResult.isReplay, false);

    const qtyAfterRev = (await InvestmentService.getHolding('acc_zerodha', 'inst_tcs')).totalQuantityMicros;
    assert.equal(qtyAfterRev, qtyBeforeRev + 5_000_00n); // Restored 0.5 shares
  });

  // INV-HLD-12: Purchase reversal blocked when lot has active downstream depletions
  await runAsyncTest('INV-HLD-12: Purchase reversal blocked when lot has active downstream depletions', async () => {
    // Trying to reverse original buy (tx_buy_tcs_1) which was partially depleted by tx_sell_tcs_1
    await assert.rejects(
      async () => {
        await InvestmentService.reverseTransaction('tx_buy_tcs_1', 'Attempting illegal purchase reversal');
      },
      /has been partially or fully depleted. Downstream sales must be reversed first/
    );
  });

  // INV-HLD-13: Idempotent replay returns cached holding with 0 duplicate lots
  await runAsyncTest('INV-HLD-13: Idempotency replay returns cached holding with 0 duplicate lots', async () => {
    const idempKey = 'idemp_key_holding_dup_check';

    const call1 = await InvestmentService.recordTransaction({
      id: 'tx_idemp_buy',
      accountId: 'acc_zerodha',
      instrumentId: 'inst_tcs',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 1_000_000n,
      pricePaise: 3000_00n
    }, idempKey);

    assert.equal(call1.isReplay, false);
    const lotsCount1 = (await InvestmentService.getTaxLots({ accountId: 'acc_zerodha', instrumentId: 'inst_tcs' })).length;

    // Second call
    const call2 = await InvestmentService.recordTransaction({
      id: 'tx_idemp_buy_ignored',
      accountId: 'acc_zerodha',
      instrumentId: 'inst_tcs',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 1_000_000n,
      pricePaise: 3000_00n
    }, idempKey);

    assert.equal(call2.isReplay, true);
    const lotsCount2 = (await InvestmentService.getTaxLots({ accountId: 'acc_zerodha', instrumentId: 'inst_tcs' })).length;
    assert.equal(lotsCount1, lotsCount2);
  });

  // INV-HLD-14: Cold restart preserves exact holding BigInt paise and micros
  await runAsyncTest('INV-HLD-14: Cold restart preserves exact holding BigInt paise and micros', async () => {
    const preHolding = await InvestmentService.getHolding('acc_zerodha', 'inst_tcs');

    // Simulate cold app restart
    InvestmentService.clearMemoryCache();

    const postHolding = await InvestmentService.getHolding('acc_zerodha', 'inst_tcs');
    assert.equal(postHolding.totalQuantityMicros, preHolding.totalQuantityMicros);
    assert.equal(postHolding.totalCostBasisPaise, preHolding.totalCostBasisPaise);
    assert.equal(typeof postHolding.totalQuantityMicros, 'bigint');
    assert.equal(typeof postHolding.totalCostBasisPaise, 'bigint');
  });

  // INV-HLD-15: Cache corruption auto-recovery: corrupting storage holdings is repaired from tax lots
  await runAsyncTest('INV-HLD-15: Corrupted holdings cache is auto-repaired from authoritative tax lots', async () => {
    const trueHolding = await InvestmentService.getHolding('acc_zerodha', 'inst_tcs');

    // Deliberately corrupt holdings key in storage
    await InvestmentService.corruptHoldingsCacheForTesting();

    // Next access must rebuild directly from authoritative tax lots
    const repairedHolding = await InvestmentService.getHolding('acc_zerodha', 'inst_tcs');
    assert.equal(repairedHolding.totalQuantityMicros, trueHolding.totalQuantityMicros);
    assert.equal(repairedHolding.totalCostBasisPaise, trueHolding.totalCostBasisPaise);
    assert.notEqual(repairedHolding.totalQuantityMicros, 999999999n);
  });

  // INV-HLD-16: Atomic write failure rollback across all 7 storage keys
  await runAsyncTest('INV-HLD-16: Atomic write failure rollback across all 7 storage keys', async () => {
    const prevHoldings = await InvestmentService.getHoldings();
    const prevLots = await InvestmentService.getTaxLots();

    const originalMultiSet = AsyncStorage.multiSet;
    AsyncStorage.multiSet = async () => {
      throw new Error('Disk IO failure during 7-key multiSet');
    };

    try {
      await assert.rejects(
        async () => {
          await InvestmentService.recordTransaction({
            id: 'tx_doomed',
            accountId: 'acc_zerodha',
            instrumentId: 'inst_tcs',
            transactionType: TRANSACTION_TYPES.BUY,
            status: TRANSACTION_STATUS.SETTLED,
            quantityMicros: 1_000_000n,
            pricePaise: 3000_00n
          });
        },
        /Atomic write commit failed: Disk IO failure during 7-key multiSet/
      );

      // Verify in-memory state rolled back to exact snapshot
      const lotsAfter = await InvestmentService.getTaxLots();
      const holdingsAfter = await InvestmentService.getHoldings();
      assert.equal(lotsAfter.length, prevLots.length);
      assert.equal(holdingsAfter.length, prevHoldings.length);
    } finally {
      AsyncStorage.multiSet = originalMultiSet;
    }
  });

  console.log(`\n🎉 ALL ${passedCount} / 16 HOLDINGS & SERVICE TESTS PASSED!\n`);
}

runAll().catch(err => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
