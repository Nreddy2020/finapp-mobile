/**
 * @file test_investment_valuation.mjs
 * @description Invariant test suite for FinLife Investments Phase 3 Valuation Engine:
 * Valuation contracts, price freshness, explicit STALE vs UNAVAILABLE semantics,
 * missing-price handling, unrealized gain/loss, and holdings reconciliation.
 */

import assert from 'node:assert/strict';
import {
  QUANTITY_SCALE,
  MAX_PAISE,
  MIN_PAISE,
  PRICE_STATUS,
  PRICE_SOURCE,
  PRICE_ADJUSTMENT_TYPE,
  COST_BASIS_STATUS,
  INSTRUMENT_TYPES,
  validatePriceQuote
} from '../../components/investments/investmentContracts.js';

import {
  checkPriceFreshness,
  calculateHoldingValuation,
  calculatePortfolioValuation,
  reconcileValuationWithHoldings
} from '../../components/investments/investmentValuationEngine.js';

import {
  formatPaiseToINR,
  formatQuantityMicros,
  formatBasisPoints,
  formatPercentage,
  getPriceStatusBadge,
  adaptHoldingValuationForDisplay
} from '../../components/investments/investmentValuationAdapter.js';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: VALUATION ENGINE INVARIANT TESTS    ===');
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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Valuation Contracts & Bounds (INV-VAL)
// ─────────────────────────────────────────────────────────────────────────────

runTest('INV-VAL-01: Valuation DTO enforces BigInt paise and micros with frozen immutability', () => {
  const holding = {
    id: 'hld_test_1',
    accountId: 'acc_1',
    instrumentId: 'inst_tcs',
    quantityMicros: 10_000_000n, // 10 units
    costBasisPaise: 35000_00n,    // ₹35,000
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };

  const quote = {
    id: 'q_1',
    instrumentId: 'inst_tcs',
    pricePaise: 3800_00n,        // ₹3,800
    source: PRICE_SOURCE.NSE_EQ,
    status: PRICE_STATUS.AVAILABLE,
    asOfTimestamp: new Date().toISOString()
  };

  const val = calculateHoldingValuation({ holding, priceQuote: quote });
  assert.equal(typeof val.marketValuePaise, 'bigint');
  assert.equal(typeof val.unrealizedGainLossPaise, 'bigint');
  assert.equal(val.marketValuePaise, 38000_00n); // 10 * 3,800 = ₹38,000
  assert.equal(val.unrealizedGainLossPaise, 3000_00n); // +₹3,000 gain
  assert.equal(val.unrealizedGainLossBps, 857n); // 3000/35000 = 8.5714% -> 857 BPS
  assert.ok(Object.isFrozen(val));
});

runTest('INV-VAL-02: Deterministic half-up rounding computes exact gross paise with zero drift', () => {
  const holding = {
    quantityMicros: 333_333n, // 0.333333 units
    costBasisPaise: 1000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };
  // 0.333333 * 3,000.00 = 999.999000 -> rounds up to 1000.00 (100000 paise)
  const quote = {
    instrumentId: 'inst_mf',
    pricePaise: 3000_00n,
    source: PRICE_SOURCE.AMFI_NAV,
    asOfTimestamp: new Date().toISOString()
  };

  const val = calculateHoldingValuation({ holding, priceQuote: quote });
  assert.equal(val.marketValuePaise, 1000_00n);
});

runTest('INV-VAL-03: Zero quantity or zero price yields strictly 0n market value', () => {
  const holdingZeroQty = {
    quantityMicros: 0n,
    costBasisPaise: 0n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };
  const quote = {
    instrumentId: 'inst_1',
    pricePaise: 1500_00n,
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: new Date().toISOString()
  };

  const val = calculateHoldingValuation({ holding: holdingZeroQty, priceQuote: quote });
  assert.equal(val.marketValuePaise, 0n);
  assert.equal(val.unrealizedGainLossPaise, 0n);
});

runTest('INV-VAL-04: Cost basis UNAVAILABLE produces strictly null unrealized gain/loss and BPS', () => {
  const holdingNoBasis = {
    quantityMicros: 50_000_000n, // 50 units
    costBasisPaise: null,
    costBasisStatus: COST_BASIS_STATUS.UNAVAILABLE
  };
  const quote = {
    instrumentId: 'inst_gift',
    pricePaise: 200_00n,
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: new Date().toISOString()
  };

  const val = calculateHoldingValuation({ holding: holdingNoBasis, priceQuote: quote });
  assert.equal(val.marketValuePaise, 10000_00n);
  assert.strictEqual(val.unrealizedGainLossPaise, null);
  assert.strictEqual(val.unrealizedGainLossBps, null);
});

runTest('INV-VAL-05: Portfolio aggregation correctly computes total values and preserves status hierarchy', () => {
  const h1 = {
    instrumentId: 'inst_1',
    quantityMicros: 10_000_000n,
    costBasisPaise: 1000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };
  const h2 = {
    instrumentId: 'inst_2',
    quantityMicros: 20_000_000n,
    costBasisPaise: 2000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };

  const quotesMap = {
    inst_1: { instrumentId: 'inst_1', pricePaise: 120_00n, source: PRICE_SOURCE.NSE_EQ, asOfTimestamp: new Date().toISOString() },
    inst_2: { instrumentId: 'inst_2', pricePaise: 110_00n, source: PRICE_SOURCE.NSE_EQ, asOfTimestamp: new Date().toISOString() }
  };

  const portVal = calculatePortfolioValuation({ holdings: [h1, h2], priceQuotesMap: quotesMap });
  assert.equal(portVal.totalCostBasisPaise, 3000_00n);
  assert.equal(portVal.totalMarketValuePaise, 3400_00n); // 1200 + 2200
  assert.equal(portVal.totalUnrealizedGainLossPaise, 400_00n);
  assert.equal(portVal.aggregateUnrealizedBps, 1333n); // 400/3000 = 13.33% -> 1333 BPS
  assert.equal(portVal.valuationStatus, PRICE_STATUS.AVAILABLE);
  assert.equal(portVal.costBasisStatus, COST_BASIS_STATUS.AVAILABLE);
});

runTest('INV-VAL-06: Portfolio aggregation excludes null valuations without treating them as zero', () => {
  const h1 = {
    instrumentId: 'inst_has_price',
    quantityMicros: 10_000_000n,
    costBasisPaise: 1000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };
  const h2 = {
    instrumentId: 'inst_missing_price',
    quantityMicros: 20_000_000n,
    costBasisPaise: 2000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };

  // Only inst_has_price has a quote
  const quotesMap = {
    inst_has_price: { instrumentId: 'inst_has_price', pricePaise: 150_00n, source: PRICE_SOURCE.NSE_EQ, asOfTimestamp: new Date().toISOString() }
  };

  const portVal = calculatePortfolioValuation({ holdings: [h1, h2], priceQuotesMap: quotesMap });
  // Total market value sums ONLY available valuations: 1500_00n (NOT 1500 + 0)
  assert.equal(portVal.totalMarketValuePaise, 1500_00n);
  assert.equal(portVal.valuationStatus, 'PARTIAL');
  assert.equal(portVal.evaluatedHoldingsCount, 1);
  assert.equal(portVal.holdingsCount, 2);
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Price Freshness & Source States (INV-PRICE)
// ─────────────────────────────────────────────────────────────────────────────

runTest('INV-PRICE-01: Fresh price within window produces AVAILABLE status', () => {
  const now = new Date();
  const quote = {
    instrumentId: 'inst_fresh',
    pricePaise: 500_00n,
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: new Date(now.getTime() - 2 * 3600 * 1000).toISOString() // 2 hours old
  };

  const freshness = checkPriceFreshness({
    priceQuote: quote,
    instrumentType: INSTRUMENT_TYPES.EQUITY,
    valuationTimestamp: now.toISOString()
  });

  assert.equal(freshness.status, PRICE_STATUS.AVAILABLE);
  assert.equal(freshness.isStale, false);
});

runTest('INV-PRICE-02: Price older than threshold window produces STALE status and isStale: true', () => {
  const now = new Date();
  const quote = {
    instrumentId: 'inst_old',
    pricePaise: 500_00n,
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: new Date(now.getTime() - 30 * 3600 * 1000).toISOString() // 30 hours old (threshold is 24h)
  };

  const freshness = checkPriceFreshness({
    priceQuote: quote,
    instrumentType: INSTRUMENT_TYPES.EQUITY,
    valuationTimestamp: now.toISOString()
  });

  assert.equal(freshness.status, PRICE_STATUS.STALE);
  assert.equal(freshness.isStale, true);
});

runTest('INV-PRICE-03: STALE price remains mathematically computable but carries explicit stale flag', () => {
  const now = new Date();
  const holding = {
    quantityMicros: 10_000_000n,
    costBasisPaise: 4000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };
  const staleQuote = {
    instrumentId: 'inst_stale',
    pricePaise: 500_00n,
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: new Date(now.getTime() - 48 * 3600 * 1000).toISOString() // 48h old
  };

  const val = calculateHoldingValuation({
    holding,
    priceQuote: staleQuote,
    instrumentType: INSTRUMENT_TYPES.EQUITY,
    valuationTimestamp: now.toISOString(),
    allowStale: true
  });

  assert.equal(val.priceStatus, PRICE_STATUS.STALE);
  assert.equal(val.isStale, true);
  assert.equal(val.marketValuePaise, 5000_00n); // Computable
  assert.equal(val.unrealizedGainLossPaise, 1000_00n);
});

runTest('INV-PRICE-04: Missing price quote produces UNAVAILABLE status and strictly null valuation (never 0n)', () => {
  const holding = {
    quantityMicros: 10_000_000n,
    costBasisPaise: 4000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };

  const val = calculateHoldingValuation({ holding, priceQuote: null });
  assert.equal(val.priceStatus, PRICE_STATUS.UNAVAILABLE);
  assert.strictEqual(val.marketValuePaise, null);
  assert.strictEqual(val.unrealizedGainLossPaise, null);
  assert.strictEqual(val.unrealizedGainLossBps, null);
});

runTest('INV-PRICE-05: Malformed, negative, or INVALID price produces INVALID status and strictly null valuation (never 0n)', () => {
  const holding = {
    quantityMicros: 10_000_000n,
    costBasisPaise: 4000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };
  const invalidQuote = {
    instrumentId: 'inst_bad',
    pricePaise: -100_00n, // negative price
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: new Date().toISOString()
  };

  const val = calculateHoldingValuation({ holding, priceQuote: invalidQuote });
  assert.equal(val.priceStatus, PRICE_STATUS.INVALID);
  assert.strictEqual(val.marketValuePaise, null);
  assert.strictEqual(val.unrealizedGainLossPaise, null);
});

runTest('INV-PRICE-06: Historical asOfDate cannot use a future price quote and throws RangeError', () => {
  const pastAsOfDate = '2026-01-15';
  const futureQuote = {
    instrumentId: 'inst_infy',
    pricePaise: 1800_00n,
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: '2026-02-01T10:00:00Z' // Later than asOfDate!
  };

  assert.throws(
    () => {
      checkPriceFreshness({
        priceQuote: futureQuote,
        asOfDate: pastAsOfDate,
        valuationTimestamp: '2026-03-01T10:00:00Z'
      });
    },
    RangeError,
    /Historical asOfDate .* cannot use a future price quote/
  );
});

runTest('INV-PRICE-07: Asset class specific freshness thresholds are strictly respected', () => {
  const now = new Date();
  // 36 hours old quote:
  // For MUTUAL_FUND threshold is 48h -> FRESH (AVAILABLE)
  // For EQUITY threshold is 24h -> STALE
  const quote = {
    instrumentId: 'inst_asset_test',
    pricePaise: 100_00n,
    source: PRICE_SOURCE.AMFI_NAV,
    asOfTimestamp: new Date(now.getTime() - 36 * 3600 * 1000).toISOString()
  };

  const mfFreshness = checkPriceFreshness({
    priceQuote: quote,
    instrumentType: INSTRUMENT_TYPES.MUTUAL_FUND,
    valuationTimestamp: now.toISOString()
  });
  assert.equal(mfFreshness.status, PRICE_STATUS.AVAILABLE);

  const eqFreshness = checkPriceFreshness({
    priceQuote: quote,
    instrumentType: INSTRUMENT_TYPES.EQUITY,
    valuationTimestamp: now.toISOString()
  });
  assert.equal(eqFreshness.status, PRICE_STATUS.STALE);
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Holdings & Valuation Reconciliation (INV-REC)
// ─────────────────────────────────────────────────────────────────────────────

runTest('INV-REC-01: reconcileValuationWithHoldings confirms exact ₹0 deviation on consistent valuation', () => {
  const holding = {
    quantityMicros: 15_000_000n, // 15 units
    costBasisPaise: 45000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  };
  const quote = {
    instrumentId: 'inst_1',
    pricePaise: 3200_00n,
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: new Date().toISOString()
  };

  const val = calculateHoldingValuation({ holding, priceQuote: quote });
  const isReconciled = reconcileValuationWithHoldings(val, holding);
  assert.equal(isReconciled, true);
});

runTest('INV-REC-02: reconcileValuationWithHoldings throws on artificial quantity mismatch', () => {
  const holding = {
    quantityMicros: 15_000_000n,
    costBasisPaise: 45000_00n
  };
  const fakeVal = {
    quantityMicros: 14_000_000n, // Tampered quantity
    marketPricePaise: 3200_00n,
    marketValuePaise: 44800_00n,
    unrealizedGainLossPaise: null
  };

  assert.throws(
    () => reconcileValuationWithHoldings(fakeVal, holding),
    /Reconciliation mismatch: holding quantity/
  );
});

runTest('INV-REC-03: reconcileValuationWithHoldings throws on artificial market value rounding error', () => {
  const holding = {
    quantityMicros: 10_000_000n,
    costBasisPaise: 20000_00n
  };
  const fakeVal = {
    quantityMicros: 10_000_000n,
    marketPricePaise: 2500_00n,
    marketValuePaise: 25000_01n, // 1 paise artificial drift!
    unrealizedGainLossPaise: null
  };

  assert.throws(
    () => reconcileValuationWithHoldings(fakeVal, holding),
    /Reconciliation mismatch: marketValuePaise/
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Strict Read-Only Boundary (INV-RO)
// ─────────────────────────────────────────────────────────────────────────────

runTest('INV-RO-01: Valuation calculation guarantees zero mutation of input holding and quote objects', () => {
  const holding = Object.freeze({
    accountId: 'acc_ro',
    instrumentId: 'inst_ro',
    quantityMicros: 25_000_000n,
    costBasisPaise: 50000_00n,
    costBasisStatus: COST_BASIS_STATUS.AVAILABLE
  });

  const quote = Object.freeze({
    instrumentId: 'inst_ro',
    pricePaise: 2200_00n,
    source: PRICE_SOURCE.NSE_EQ,
    asOfTimestamp: new Date().toISOString()
  });

  // Calculate holding valuation - should succeed without attempting to modify frozen inputs
  const val = calculateHoldingValuation({ holding, priceQuote: quote });
  assert.equal(val.marketValuePaise, 55000_00n);
  assert.equal(holding.quantityMicros, 25_000_000n);
  assert.equal(holding.costBasisPaise, 50000_00n);
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Presentation Adapter Boundary & Formatting (INV-ADAPT)
// ─────────────────────────────────────────────────────────────────────────────

runTest('INV-ADAPT-01: formatPaiseToINR converts BigInt paise to Indian notation (₹6,60,00,000.00)', () => {
  const paise = 66000000_00n; // ₹6,60,00,000
  const formatted = formatPaiseToINR(paise);
  assert.equal(formatted, '₹6,60,00,000.00');

  const smallPaise = 150000_00n; // ₹1,50,000
  assert.equal(formatPaiseToINR(smallPaise), '₹1,50,000.00');

  const negativePaise = -45000_50n;
  assert.equal(formatPaiseToINR(negativePaise), '-₹45,000.50');
});

runTest('INV-ADAPT-02: formatQuantityMicros formats micro units and trims trailing zeros cleanly', () => {
  const wholeUnits = 100_000_000n; // 100.000000 -> 100
  assert.equal(formatQuantityMicros(wholeUnits), '100');

  const fractionalUnits = 333_333n; // 0.333333
  assert.equal(formatQuantityMicros(fractionalUnits), '0.333333');

  const partialUnits = 10_500_000n; // 10.5
  assert.equal(formatQuantityMicros(partialUnits), '10.5');
});

runTest('INV-ADAPT-03: formatBasisPoints formats integer BPS into standard display (+34.66%)', () => {
  const bps = 3466n; // 3466 BPS -> +34.66%
  assert.equal(formatBasisPoints(bps), '+34.66%');

  const negBps = -125n; // -1.25%
  assert.equal(formatBasisPoints(negBps), '-1.25%');

  const zeroBps = 0n;
  assert.equal(formatBasisPoints(zeroBps, { showPlusSign: false }), '0.00%');
});

runTest('INV-ADAPT-04: Nullable valuation and basis values produce safe fallback strings with zero crash', () => {
  assert.equal(formatPaiseToINR(null), '₹ --');
  assert.equal(formatQuantityMicros(null), '--');
  assert.equal(formatBasisPoints(null), '--');
  assert.equal(formatPercentage(null), '--');
});

runTest('INV-ADAPT-05: Status badges correctly reflect AVAILABLE, STALE, UNAVAILABLE without performing math', () => {
  const freshBadge = getPriceStatusBadge(PRICE_STATUS.AVAILABLE, false);
  assert.equal(freshBadge.variant, 'success');

  const staleBadge = getPriceStatusBadge(PRICE_STATUS.STALE, true);
  assert.equal(staleBadge.variant, 'warning');
  assert.equal(staleBadge.label, 'STALE PRICE');

  const unavailBadge = getPriceStatusBadge(PRICE_STATUS.UNAVAILABLE, false);
  assert.equal(unavailBadge.variant, 'neutral');
  assert.equal(unavailBadge.label, 'PRICE UNAVAILABLE');
});

console.log(`\n🎉 ALL ${passedCount} / ${passedCount} VALUATION ENGINE TESTS PASSED!`);
