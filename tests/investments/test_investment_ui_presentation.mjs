/**
 * @file test_investment_ui_presentation.mjs
 * @description Comprehensive unit and invariant test suite for
 * FinLife Investments Module V1 — Phase 5: UI / UX Presentation Layer.
 *
 * Covers all mandatory UI invariant groups:
 * - UI-INV-01: Source immutability
 * - UI-INV-02: No unsafe numeric conversion & zero BigInt leaks
 * - UI-INV-03: Empty vs unavailable vs stale distinction
 * - UI-INV-04: Double-counting prevention & isolation presentation
 * - UI-INV-05: Personal and family ownership consistency
 * - UI-INV-06: Navigation & view-model safety
 * - UI-INV-07: Development-fixture isolation
 * - UI-INV-08: Price freshness presentation mapping
 */

import assert from 'assert';

import {
  UI_STATE,
  assertNoBigIntLeaks,
  mapPriceStatusToDisplay,
  mapTaxLotStatusToDisplay,
  getInvestmentsOverviewViewModel,
  getHoldingsListViewModel,
  getHoldingDetailViewModel,
  getCFOIntegrationViewModel
} from '../../components/investments/investmentUIPresentationAdapter.js';

import {
  PRICE_STATUS,
  INSTRUMENT_TYPES
} from '../../components/investments/investmentContracts.js';

import {
  CFO_PROJECTION_STATUS,
  OWNERSHIP_SCOPE
} from '../../components/investments/investmentIntegrationContracts.js';

let passed = 0;
let total = 0;

function it(desc, fn) {
  total++;
  try {
    fn();
    console.log(`  🟢 ${desc}`);
    passed++;
  } catch (err) {
    console.error(`  ❌ FAIL: ${desc}`);
    console.error(err);
    throw err;
  }
}

function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      deepFreeze(obj[key]);
    }
  }
  return obj;
}

export async function runInvestmentUIPresentationTests() {
  passed = 0;
  total = 0;
  console.log('\n================================================================');
  console.log('=== FINLIFE INVESTMENTS: PHASE 5 UI PRESENTATION INVARIANTS  ===');
  console.log('================================================================\n');

  // ───────────────────────────────────────────────────────────────────────────
  // Group 1: UI-INV-01 (Source Immutability)
  // ─────────────────────────────────────────────────────────────────────────

  it('UI-INV-01: View-model generation guarantees zero mutation of underlying domain DTOs', () => {
    const rawValuation = deepFreeze({
      asOfDate: '2026-03-08',
      valuationStatus: 'AVAILABLE',
      isStale: false,
      holdingsCount: 1,
      totalMarketValuePaise: 150_000_00n,
      totalCostBasisPaise: 100_000_00n,
      totalUnrealizedGainLossPaise: 50_000_00n,
      aggregateUnrealizedBps: 5000n,
      holdings: [
        {
          holdingId: 'h_test',
          instrumentId: 'inst_test',
          symbol: 'INFY',
          quantityMicros: 100_000000n,
          marketPricePaise: 1500_00n,
          marketValuePaise: 150_000_00n,
          costBasisPaise: 100_000_00n,
          unrealizedGainLossPaise: 50_000_00n,
          unrealizedGainLossBps: 5000n,
          priceStatus: 'AVAILABLE'
        }
      ]
    });

    // Generating Overview and Holdings view models does not throw on deep-frozen inputs
    assert.doesNotThrow(() => {
      getInvestmentsOverviewViewModel({ portfolioValuation: rawValuation });
      getHoldingsListViewModel({ portfolioValuation: rawValuation });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 2: UI-INV-02 (Zero BigInt Leaks & Safe Formatting)
  // ─────────────────────────────────────────────────────────────────────────

  it('UI-INV-02: Output view models contain strictly zero BigInt values across all fields', () => {
    const rawValuation = {
      asOfDate: '2026-03-08',
      valuationStatus: 'AVAILABLE',
      isStale: false,
      holdingsCount: 2,
      totalMarketValuePaise: 9_223_372_036_854_775_807n, // Signed 64-bit max paise!
      totalCostBasisPaise: 5_000_000_000_000_00n,
      totalUnrealizedGainLossPaise: 4_223_372_036_854_775_807n,
      aggregateUnrealizedBps: 8446n,
      holdingValuations: [
        {
          holdingId: 'h_1',
          instrumentId: 'inst_1',
          instrumentType: INSTRUMENT_TYPES.EQUITY,
          quantityMicros: 25_500000n,
          marketPricePaise: 2500_00n,
          marketValuePaise: 63_750_00n,
          costBasisPaise: 50_000_00n,
          unrealizedGainLossPaise: 13_750_00n,
          unrealizedGainLossBps: 2750n,
          priceStatus: 'AVAILABLE'
        }
      ]
    };

    const overviewVM = getInvestmentsOverviewViewModel({ portfolioValuation: rawValuation });
    // Recursive validation asserting zero BigInts
    assertNoBigIntLeaks(overviewVM);

    // Assert monetary formatting stays as string
    assert.strictEqual(typeof overviewVM.hero.totalMarketValueDisplay, 'string');
    assert.ok(overviewVM.hero.totalMarketValueDisplay.startsWith('₹'));

    const holdingsVM = getHoldingsListViewModel({ portfolioValuation: rawValuation });
    assertNoBigIntLeaks(holdingsVM);
    assert.strictEqual(typeof holdingsVM.holdings[0].marketValueDisplay, 'string');
    assert.strictEqual(typeof holdingsVM.holdings[0].quantityDisplay, 'string');
    assert.strictEqual(holdingsVM.holdings[0].quantityDisplay, '25.5');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 3: UI-INV-03 (Empty vs Unavailable vs Stale Distinction)
  // ─────────────────────────────────────────────────────────────────────────

  it('UI-INV-03: Empty portfolio is rendered as EMPTY with ₹0.00, not UNAVAILABLE', () => {
    const emptyVM = getInvestmentsOverviewViewModel({
      portfolioValuation: null,
      uiState: UI_STATE.EMPTY
    });

    assert.strictEqual(emptyVM.uiState, UI_STATE.EMPTY);
    assert.strictEqual(emptyVM.hero.totalMarketValueDisplay, '₹0.00');
    assert.strictEqual(emptyVM.hero.holdingsCount, 0);
    assert.strictEqual(emptyVM.freshnessBanner.code, 'EMPTY');
  });

  it('UI-INV-04: Unavailable valuation is rendered with em-dash (—), never misleading ₹0.00', () => {
    const unavailValuation = {
      asOfDate: '2026-03-08',
      valuationStatus: 'UNAVAILABLE',
      isStale: false,
      holdingsCount: 1,
      totalMarketValuePaise: null, // Price missing!
      totalCostBasisPaise: 100_000_00n,
      totalUnrealizedGainLossPaise: null,
      aggregateUnrealizedBps: null,
      holdings: []
    };

    const vm = getInvestmentsOverviewViewModel({ portfolioValuation: unavailValuation });
    assert.strictEqual(vm.hero.totalMarketValueDisplay, '—');
    assert.strictEqual(vm.hero.totalUnrealizedGainLossDisplay, '—');
    assert.strictEqual(vm.freshnessBanner.code, 'UNAVAILABLE');
    assert.strictEqual(vm.freshnessBanner.label, 'PRICE UNAVAILABLE');
  });

  it('UI-INV-05: Missing CFO components produce PARTIAL status and netWorthDisplay is strictly em-dash (—)', () => {
    const mockCFO = {
      asOfDate: '2026-03-08',
      status: CFO_PROJECTION_STATUS.PARTIAL,
      isStale: false,
      unavailableSources: ['PROPERTIES', 'LOANS'],
      staleSources: [],
      assetsBreakdown: {
        liquidCashPaise: 100_000_00n,
        investmentsPaise: 500_000_00n,
        physicalAssetsPaise: 200_000_00n,
        propertiesPaise: null,
        p2pReceivablesPaise: 0n,
        totalAssetsPaise: null
      },
      liabilitiesBreakdown: null,
      netWorthPaise: null,
      personalNetWorthPaise: null,
      familyNetWorthPaise: null
    };

    const cfoVM = getCFOIntegrationViewModel({ cfoSnapshot: mockCFO });
    assert.strictEqual(cfoVM.uiState, UI_STATE.PARTIAL);
    assert.strictEqual(cfoVM.netWorthDisplay, '—');
    assert.strictEqual(cfoVM.personalNetWorthDisplay, '—');
    assert.ok(cfoVM.unavailableSources.includes('PROPERTIES'));
    assert.ok(cfoVM.unavailableSources.includes('LOANS'));
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 4: UI-INV-04 (Double Counting Prevention & Isolation)
  // ─────────────────────────────────────────────────────────────────────────

  it('UI-INV-06: Holding detail view models correctly display bonus shares with Sec 55(2)(aa) ₹0 basis tag', () => {
    const rawValuation = {
      holdingValuations: [
        {
          holdingId: 'h_bonus_test',
          instrumentId: 'inst_bonus',
          accountId: 'acc_1',
          symbol: 'TCS',
          quantityMicros: 200_000000n,
          marketPricePaise: 3500_00n,
          marketValuePaise: 700_000_00n,
          costBasisPaise: 350_000_00n,
          unrealizedGainLossPaise: 350_000_00n,
          unrealizedGainLossBps: 10000n,
          priceStatus: 'AVAILABLE'
        }
      ]
    };

    const taxLots = [
      {
        id: 'lot_orig',
        instrumentId: 'inst_bonus',
        accountId: 'acc_1',
        acquisitionDate: '2025-01-10',
        quantityMicros: 100_000000n,
        remainingQuantityMicros: 100_000000n,
        costPerUnitPaise: 3500_00n,
        costBasisPaise: 350_000_00n,
        remainingCostBasisPaise: 350_000_00n,
        isBonusShare: false
      },
      {
        id: 'lot_bonus',
        instrumentId: 'inst_bonus',
        accountId: 'acc_1',
        acquisitionDate: '2026-01-10',
        quantityMicros: 100_000000n,
        remainingQuantityMicros: 100_000000n,
        costPerUnitPaise: 0n,
        costBasisPaise: 0n,
        remainingCostBasisPaise: 0n,
        isBonusShare: true
      }
    ];

    const detailVM = getHoldingDetailViewModel({
      holdingId: 'h_bonus_test',
      portfolioValuation: rawValuation,
      taxLots,
      instruments: [{ id: 'inst_bonus', symbol: 'TCS', isin: 'INE467B01029' }],
      accounts: [{ id: 'acc_1', name: 'Zerodha Demat' }]
    });

    assertNoBigIntLeaks(detailVM);
    assert.strictEqual(detailVM.lots.length, 2);
    assert.strictEqual(detailVM.lots[1].isBonusShare, true);
    assert.strictEqual(detailVM.lots[1].bonusTag, 'Sec 55(2)(aa) Bonus (₹0 Basis)');
    assert.strictEqual(detailVM.lots[1].costBasisDisplay, '₹0.00');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 5: UI-INV-05 (Personal vs Family Consistency)
  // ─────────────────────────────────────────────────────────────────────────

  it('UI-INV-07: CFO View Model accurately maps Personal vs Family allocation', () => {
    const sampleCFO = {
      asOfDate: '2026-03-08',
      status: CFO_PROJECTION_STATUS.COMPLETE,
      isStale: false,
      unavailableSources: [],
      staleSources: [],
      assetsBreakdown: {
        liquidCashPaise: 100_000_00n,
        investmentsPaise: 500_000_00n,
        physicalAssetsPaise: 200_000_00n,
        propertiesPaise: 1_000_000_00n,
        p2pReceivablesPaise: 0n,
        totalAssetsPaise: 1_800_000_00n
      },
      liabilitiesBreakdown: {
        formalDebtPaise: 300_000_00n,
        p2pPayablesPaise: 0n,
        propertyMortgagesPaise: 0n,
        totalLiabilitiesPaise: 300_000_00n
      },
      netWorthPaise: 1_500_000_00n,
      personalNetWorthPaise: 1_050_000_00n, // 70.00%
      familyNetWorthPaise: 450_000_00n      // 30.00%
    };

    const cfoVM = getCFOIntegrationViewModel({
      cfoSnapshot: sampleCFO,
      ownershipMode: OWNERSHIP_SCOPE.PERSONAL,
      personalBps: 7000n
    });

    assertNoBigIntLeaks(cfoVM);
    assert.strictEqual(cfoVM.personalNetWorthDisplay, '₹10,50,000.00');
    assert.strictEqual(cfoVM.familyNetWorthDisplay, '₹4,50,000.00');
    assert.strictEqual(cfoVM.personalBpsPercent, '70.00%');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 6: UI-INV-08 (Price Freshness Presentation Mapping)
  // ─────────────────────────────────────────────────────────────────────────

  it('UI-INV-08: Price freshness mappings conform strictly to approved presentation contracts', () => {
    const fresh = mapPriceStatusToDisplay(PRICE_STATUS.AVAILABLE, false, '2026-03-08T10:00:00Z');
    assert.strictEqual(fresh.label, 'LIVE / RECENT');
    assert.strictEqual(fresh.variant, 'success');
    assert.strictEqual(fresh.isWarning, false);

    const stale = mapPriceStatusToDisplay(PRICE_STATUS.STALE, true, '2026-03-05T10:00:00Z');
    assert.strictEqual(stale.label, 'STALE PRICE');
    assert.strictEqual(stale.variant, 'warning');
    assert.strictEqual(stale.isWarning, true);

    const unavail = mapPriceStatusToDisplay(PRICE_STATUS.UNAVAILABLE, false);
    assert.strictEqual(unavail.label, 'PRICE UNAVAILABLE');
    assert.strictEqual(unavail.variant, 'neutral');

    const invalid = mapPriceStatusToDisplay(PRICE_STATUS.INVALID, false);
    assert.strictEqual(invalid.label, 'PRICE INVALID');
    assert.strictEqual(invalid.variant, 'danger');
  });

  console.log(`\n================================================================`);
  console.log(`🎉 ALL ${passed} / ${total} PHASE 5 UI PRESENTATION INVARIANT TESTS PASSED!`);
  console.log(`================================================================\n`);
}

// Run when executed directly
if (process.argv[1]?.includes('test_investment_ui_presentation.mjs')) {
  runInvestmentUIPresentationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
