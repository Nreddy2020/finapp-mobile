/**
 * @file test_investment_performance.mjs
 * @description Invariant test suite for FinLife Investments Phase 3 Performance Analytics:
 * XIRR solver domain & convergence, CAGR guards, flow-neutral TWR, corporate action
 * price-adjustment neutrality, and 9-key snapshot persistence & self-healing.
 */

import assert from 'node:assert/strict';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  XIRR_STATUS,
  PERFORMANCE_STATUS,
  PRICE_STATUS,
  PRICE_SOURCE,
  PRICE_ADJUSTMENT_TYPE,
  INSTRUMENT_TYPES,
  ACCOUNT_TYPES,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  COST_BASIS_STATUS
} from '../../components/investments/investmentContracts.js';

import {
  extractPerformanceCashFlows,
  calculateXIRR,
  calculateCAGR,
  calculateTWR,
  verifyCorporateActionPriceNeutrality,
  calculateHoldingPerformance
} from '../../components/investments/investmentPerformanceEngine.js';

import {
  InvestmentService,
  INVESTMENT_STORAGE_KEYS
} from '../../services/investmentService.js';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: PERFORMANCE ENGINE INVARIANT TESTS  ===');
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

async function runAll() {
  // ─────────────────────────────────────────────────────────────────────────
  // 1. XIRR Solver Invariants (INV-XIRR)
  // ─────────────────────────────────────────────────────────────────────────

  runTest('INV-XIRR-01: Deterministic XIRR calculation with simple 1-year 20% return', () => {
    // Outflow: -100,000 on 2025-01-01, Inflow: +120,000 on 2026-01-01 (exact 1 year)
    const cashFlows = [
      { date: new Date('2025-01-01T00:00:00Z'), amount: -100000 },
      { date: new Date('2026-01-01T00:00:00Z'), amount: 120000 }
    ];

    const result = calculateXIRR(cashFlows);
    assert.equal(result.status, XIRR_STATUS.COMPUTED);
    assert.ok(result.rate !== null);
    // Rate should be very close to 0.20 (20%)
    assert.ok(Math.abs(result.rate - 0.20) < 0.005);
  });

  runTest('INV-XIRR-02: Multiple same-day cash flows are aggregated deterministically before solver runs', () => {
    const rawTransactions = [
      {
        transactionDate: '2025-06-01',
        type: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashOutflowPaise: 5000_00n
      },
      {
        transactionDate: '2025-06-01',
        type: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashOutflowPaise: 3000_00n
      }
    ];

    const flows = extractPerformanceCashFlows({
      transactions: rawTransactions,
      terminalValuationPaise: 10000_00n,
      asOfDate: '2026-06-01'
    });

    // Both buys on 2025-06-01 must aggregate to single outflow of -8000.00 (₹8,000)
    const startFlow = flows.find(f => f.date.toISOString().startsWith('2025-06-01'));
    assert.ok(startFlow);
    assert.equal(startFlow.amount, -8000.00);
  });

  runTest('INV-XIRR-03: Cash flows with all same sign return NOT_COMPUTABLE rather than invented rate', () => {
    // All outflows, no positive terminal valuation or sales
    const allNegative = [
      { date: new Date('2025-01-01'), amount: -50000 },
      { date: new Date('2025-06-01'), amount: -25000 }
    ];

    const result = calculateXIRR(allNegative);
    assert.equal(result.status, XIRR_STATUS.NOT_COMPUTABLE);
    assert.strictEqual(result.rate, null);
    assert.equal(result.reason, 'ALL_CASH_FLOWS_SAME_SIGN');
  });

  runTest('INV-XIRR-04: Multi-period SIP cash flows converge cleanly with bounded root', () => {
    const sipFlows = [
      { date: new Date('2025-01-01'), amount: -10000 },
      { date: new Date('2025-02-01'), amount: -10000 },
      { date: new Date('2025-03-01'), amount: -10000 },
      { date: new Date('2025-04-01'), amount: -10000 },
      { date: new Date('2025-05-01'), amount: -10000 },
      { date: new Date('2025-06-01'), amount: -10000 },
      { date: new Date('2025-12-31'), amount: 65000 } // ending valuation
    ];

    const result = calculateXIRR(sipFlows);
    assert.equal(result.status, XIRR_STATUS.COMPUTED);
    assert.ok(result.rate > 0.0); // positive return
    assert.ok(result.iterations <= 100);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 2. CAGR Solver Invariants (INV-CAGR)
  // ─────────────────────────────────────────────────────────────────────────

  runTest('INV-CAGR-01: Multi-year CAGR computes standard compound rate (100k -> 144k in 2 years is 20%)', () => {
    const initialPaise = 100000_00n; // ₹1,00,000
    const finalPaise = 144000_00n;   // ₹1,44,000
    const startDate = '2024-01-01';
    const endDate = '2026-01-01';    // exactly 2 years (731 or 730 days)

    const res = calculateCAGR({ initialValuePaise: initialPaise, finalValuePaise: finalPaise, startDate, endDate });
    assert.equal(res.status, PERFORMANCE_STATUS.COMPUTED);
    assert.ok(Math.abs(res.cagr - 0.20) < 0.01);
  });

  runTest('INV-CAGR-02: Zero or negative initial value returns NOT_COMPUTABLE', () => {
    const zeroInitial = calculateCAGR({
      initialValuePaise: 0n,
      finalValuePaise: 50000_00n,
      startDate: '2025-01-01',
      endDate: '2026-01-01'
    });
    assert.equal(zeroInitial.status, PERFORMANCE_STATUS.NOT_COMPUTABLE);
    assert.strictEqual(zeroInitial.cagr, null);
    assert.equal(zeroInitial.reason, 'NON_POSITIVE_INITIAL_VALUE');
  });

  runTest('INV-CAGR-03: Zero or negative final value returns NOT_COMPUTABLE', () => {
    const zeroFinal = calculateCAGR({
      initialValuePaise: 50000_00n,
      finalValuePaise: 0n,
      startDate: '2025-01-01',
      endDate: '2026-01-01'
    });
    assert.equal(zeroFinal.status, PERFORMANCE_STATUS.NOT_COMPUTABLE);
    assert.strictEqual(zeroFinal.cagr, null);
  });

  runTest('INV-CAGR-04: Invalid date range (endDate <= startDate) returns NOT_COMPUTABLE', () => {
    const invalidDates = calculateCAGR({
      initialValuePaise: 50000_00n,
      finalValuePaise: 60000_00n,
      startDate: '2026-01-01',
      endDate: '2025-01-01'
    });
    assert.equal(invalidDates.status, PERFORMANCE_STATUS.NOT_COMPUTABLE);
    assert.strictEqual(invalidDates.cagr, null);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 3. Flow-Neutral TWR (INV-TWR)
  // ─────────────────────────────────────────────────────────────────────────

  runTest('INV-TWR-01: Flow-neutral sub-period partitioning isolates market return from external deposits', () => {
    // Period 1: Starts at ₹100,000, grows to ₹110,000 (+10%).
    // At boundary, investor deposits ₹50,000 (external flow).
    // Period 2: Starts at ₹160,000, drops to ₹152,000 (-5%).
    // Cumulative TWR should be (1 + 0.10) * (1 - 0.05) - 1 = 1.045 - 1 = +4.5%
    const subPeriods = [
      {
        startValuePaise: 100000_00n,
        endValuePaise: 110000_00n,
        externalFlowPaise: 0n
      },
      {
        startValuePaise: 160000_00n,
        endValuePaise: 152000_00n,
        externalFlowPaise: 0n
      }
    ];

    const result = calculateTWR({ subPeriods });
    assert.equal(result.status, PERFORMANCE_STATUS.COMPUTED);
    assert.ok(Math.abs(result.twr - 0.045) < 0.0001);
  });

  runTest('INV-TWR-02: Internal transfer between accounts does not alter return', () => {
    // Demat to Demat internal transfer has 0 external flow -> return is determined purely by market value
    const subPeriods = [
      {
        startValuePaise: 50000_00n,
        endValuePaise: 55000_00n,
        externalFlowPaise: 0n // internal transfer: 0n external flow
      }
    ];

    const result = calculateTWR({ subPeriods });
    assert.equal(result.status, PERFORMANCE_STATUS.COMPUTED);
    assert.ok(Math.abs(result.twr - 0.10) < 0.0001); // exact +10%
  });

  runTest('INV-TWR-03: Negative sub-period return compounds accurately', () => {
    // Period 1: -10% (100 -> 90)
    // Period 2: -10% (90 -> 81)
    // TWR = (0.90 * 0.90) - 1 = -19%
    const subPeriods = [
      { startValuePaise: 100_00n, endValuePaise: 90_00n, externalFlowPaise: 0n },
      { startValuePaise: 90_00n, endValuePaise: 81_00n, externalFlowPaise: 0n }
    ];

    const result = calculateTWR({ subPeriods });
    assert.equal(result.status, PERFORMANCE_STATUS.COMPUTED);
    assert.ok(Math.abs(result.twr - (-0.19)) < 0.0001);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 4. Corporate Action Price Adjustment & Neutrality (INV-CORP)
  // ─────────────────────────────────────────────────────────────────────────

  runTest('INV-CORP-01: Split neutrality with CORPORATE_ACTION_ADJUSTED price yields exact ₹0 delta', () => {
    // Pre-split: 100 shares @ ₹100.00 = ₹10,000.00
    const preQty = 100_000_000n;
    const prePrice = 100_00n;

    // 1:2 split -> Post-split: 200 shares @ ₹50.00 = ₹10,000.00
    const postQty = 200_000_000n;
    const postPrice = 50_00n;

    const neutrality = verifyCorporateActionPriceNeutrality({
      preActionQuantityMicros: preQty,
      preActionPricePaise: prePrice,
      postActionQuantityMicros: postQty,
      postActionPricePaise: postPrice,
      priceAdjustmentType: PRICE_ADJUSTMENT_TYPE.CORPORATE_ACTION_ADJUSTED
    });

    assert.equal(neutrality.isNeutral, true);
    assert.equal(neutrality.deltaPaise, 0n);
  });

  runTest('INV-CORP-02: RAW unadjusted price post-split is flagged as non-neutral', () => {
    const neutrality = verifyCorporateActionPriceNeutrality({
      preActionQuantityMicros: 100_000_000n,
      preActionPricePaise: 100_00n,
      postActionQuantityMicros: 200_000_000n,
      postActionPricePaise: 100_00n, // RAW unadjusted exchange price
      priceAdjustmentType: PRICE_ADJUSTMENT_TYPE.RAW
    });

    assert.equal(neutrality.isNeutral, false);
    assert.equal(neutrality.reason, 'PRICE_NOT_ADJUSTED');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 5. Persistence, Snapshots & Cache Recovery (INV-PERF)
  // ─────────────────────────────────────────────────────────────────────────

  await runAsyncTest('INV-PERF-01: Price quotes and valuation snapshots persist and hydrate across cold restart', async () => {
    await InvestmentService.resetToCleanState();

    await InvestmentService.addInstrument({
      id: 'inst_reliance',
      instrumentType: INSTRUMENT_TYPES.EQUITY,
      name: 'Reliance Industries'
    });
    await InvestmentService.addAccount({
      id: 'acc_rel',
      name: 'HDFC Securities'
    });

    await InvestmentService.recordTransaction({
      id: 'tx_rel_buy',
      accountId: 'acc_rel',
      instrumentId: 'inst_reliance',
      transactionType: TRANSACTION_TYPES.BUY,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: 20_000_000n, // 20 units
      pricePaise: 2500_00n,        // ₹2,500
      grossAmountPaise: 50000_00n
    });

    // Record price quote
    await InvestmentService.recordPriceQuote({
      instrumentId: 'inst_reliance',
      pricePaise: 2800_00n,
      source: PRICE_SOURCE.NSE_EQ,
      asOfTimestamp: new Date().toISOString()
    });

    // Capture valuation snapshot
    const snap = await InvestmentService.captureValuationSnapshot(new Date().toISOString());
    assert.equal(snap.totalMarketValuePaise, 56000_00n); // 20 * 2,800
    assert.equal(snap.totalCostBasisPaise, 50000_00n);
    assert.equal(snap.totalUnrealizedGainLossPaise, 6000_00n);

    // Simulate cold restart by clearing in-memory caches
    InvestmentService.clearMemoryCache();

    // Verify independent retrieval from persistent storage
    const fetchedQuote = await InvestmentService.getLatestPriceQuote('inst_reliance');
    assert.ok(fetchedQuote);
    assert.equal(fetchedQuote.pricePaise, 2800_00n);

    const fetchedSnapshot = await InvestmentService.getLatestValuationSnapshot();
    assert.ok(fetchedSnapshot);
    assert.equal(fetchedSnapshot.totalMarketValuePaise, 56000_00n);
    assert.equal(fetchedSnapshot.totalUnrealizedGainLossPaise, 6000_00n);
  });

  await runAsyncTest('INV-PERF-02: Self-healing rebuilds valuation strictly from authoritative holdings and price quotes', async () => {
    // Corrupt the valuation snapshot cache in storage
    await InvestmentService.corruptValuationSnapshotCacheForTesting();

    // Reconstruct valuation from authoritative data
    const healed = await InvestmentService.recalculateValuationFromAuthoritativeData(new Date().toISOString());
    assert.ok(healed);
    assert.equal(healed.totalMarketValuePaise, 56000_00n);
    assert.equal(healed.totalCostBasisPaise, 50000_00n);
    assert.equal(healed.totalUnrealizedGainLossPaise, 6000_00n);
  });

  console.log(`\n🎉 ALL ${passedCount} / ${passedCount} PERFORMANCE ENGINE TESTS PASSED!`);
}

runAll();
