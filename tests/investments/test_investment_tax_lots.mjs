/**
 * @file test_investment_tax_lots.mjs
 * @description Invariant test suite for FinLife Investments Tax Lot Engine (Phase 2).
 */

import assert from 'node:assert/strict';
import {
  QUANTITY_SCALE,
  MAX_PAISE,
  MIN_PAISE,
  MAX_QUANTITY_MICROS,
  MIN_QUANTITY_MICROS,
  TAX_LOT_STATUS,
  DEPLETION_METHOD,
  COST_BASIS_STATUS,
  TAX_POLICY_VERSIONS
} from '../../components/investments/investmentContracts.js';

import {
  calculateAcquisitionCost,
  createTaxLot,
  calculateLotDepletion,
  depleteLotsFIFO,
  depleteSpecificLots,
  applyBonusToLots,
  applyStockSplitToLots,
  rejectMergerCorporateAction,
  restoreLotsFromSaleReversal,
  assertCanReversePurchaseLot
} from '../../components/investments/investmentTaxLotEngine.js';

console.log('================================================================');
console.log('=== FINLIFE INVESTMENTS: TAX LOT ENGINE INVARIANT TESTS       ===');
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

// INV-LOT-01: One purchase -> one lot with exact initial/remaining quantity and cost basis
runTest('INV-LOT-01: One purchase -> one lot with exact quantity and basis', () => {
  const lot = createTaxLot({
    transactionId: 'tx_b1',
    accountId: 'acc_1',
    instrumentId: 'inst_hdfc',
    acquisitionDate: '2026-01-15',
    quantityMicros: 10_000_000n, // 10 units
    costBasisPaise: 15_000_00n   // ₹15,000
  });

  assert.equal(lot.initialQuantityMicros, 10_000_000n);
  assert.equal(lot.remainingQuantityMicros, 10_000_000n);
  assert.equal(lot.initialCostBasisPaise, 15_000_00n);
  assert.equal(lot.remainingCostBasisPaise, 15_000_00n);
  assert.equal(lot.status, TAX_LOT_STATUS.OPEN);
  assert.equal(lot.costBasisStatus, COST_BASIS_STATUS.AVAILABLE);
});

// INV-LOT-02: Configurable acquisition cost calculation distinguishes tax cost from accounting cost
runTest('INV-LOT-02: Configurable acquisition cost distinguishes tax and accounting costs', () => {
  const cost = calculateAcquisitionCost({
    purchaseAmountPaise: 100_000_00n,
    eligibleAcquisitionExpensesPaise: 50_00n, // Brokerage + stamp duty
    excludedTransactionTaxesPaise: 10_00n,    // Excluded tax
    taxPolicyVersion: TAX_POLICY_VERSIONS.IN_IT_ACT_V1
  });

  assert.equal(cost.taxAcquisitionCostPaise, 100_050_00n);
  assert.equal(cost.accountingAcquisitionCostPaise, 100_060_00n);
  assert.equal(cost.nonCapitalizedExpensePaise, 10_00n);
  assert.equal(cost.taxPolicyVersion, TAX_POLICY_VERSIONS.IN_IT_ACT_V1);
});

// INV-LOT-03: Remainder-preserving FIFO partial sale: depletedBasis + remainingBasis === originalBasis
runTest('INV-LOT-03: Remainder-preserving FIFO partial sale preserves exact cost basis', () => {
  const lot = createTaxLot({
    transactionId: 'tx_b2',
    accountId: 'acc_1',
    instrumentId: 'inst_tcs',
    acquisitionDate: '2026-02-01',
    quantityMicros: 10_000_000n, // 10 units
    costBasisPaise: 35_000_00n   // ₹35,000
  });

  const res = depleteLotsFIFO({
    availableLots: [lot],
    sellQuantityMicros: 3_000_000n, // Sell 3 units
    sellProceedsPaise: 12_000_00n,  // ₹12,000 proceeds
    sellTransactionId: 'tx_s1'
  });

  assert.equal(res.updatedLots.length, 1);
  const updatedLot = res.updatedLots[0];
  assert.equal(updatedLot.remainingQuantityMicros, 7_000_000n);
  assert.equal(updatedLot.status, TAX_LOT_STATUS.PARTIALLY_DEPLETED);

  const dep = res.depletionRecords[0];
  assert.equal(dep.depletedQuantityMicros, 3_000_000n);

  // Exact remainder-preserving invariant:
  assert.equal(dep.depletedCostBasisPaise + updatedLot.remainingCostBasisPaise, lot.initialCostBasisPaise);
  assert.equal(dep.depletedCostBasisPaise, 10_500_00n); // 3/10 of 35,000
  assert.equal(updatedLot.remainingCostBasisPaise, 24_500_00n); // 7/10 of 35,000

  // Realized gain: 12,000_00 - 10,500_00 = 1,500_00n
  assert.equal(res.realizedGainLossPaise, 1_500_00n);
});

// INV-LOT-04: Remainder-preserving zero-paise leakage across repeated partial sales
runTest('INV-LOT-04: Repeated partial sales result in zero-paise residual leakage', () => {
  // Odd amount: 10 units for ₹100.01 = 10,001 paise (1,000.1 paise per unit)
  const lot = createTaxLot({
    transactionId: 'tx_odd',
    accountId: 'acc_1',
    instrumentId: 'inst_odd',
    acquisitionDate: '2026-01-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 10_001n
  });

  let currentLots = [lot];
  let totalDepletedBasis = 0n;

  // Sell 1 unit at a time for 10 times
  for (let i = 1; i <= 10; i++) {
    const res = depleteLotsFIFO({
      availableLots: currentLots,
      sellQuantityMicros: 1_000_000n,
      sellProceedsPaise: 2000n,
      sellTransactionId: `tx_step_${i}`
    });
    totalDepletedBasis += res.totalDepletedCostBasisPaise;
    currentLots = res.updatedLots;
  }

  // Entire initial cost basis must be depleted with exact zero-paise leakage
  assert.equal(totalDepletedBasis, 10_001n);
  assert.equal(currentLots[0].remainingQuantityMicros, 0n);
  assert.equal(currentLots[0].remainingCostBasisPaise, 0n);
  assert.equal(currentLots[0].status, TAX_LOT_STATUS.DEPLETED);
});

// INV-LOT-05: Sale spanning 3 or more lots (multi-lot FIFO depletion)
runTest('INV-LOT-05: Sale spanning 3 or more lots deploys FIFO order and reconciles', () => {
  const lot1 = createTaxLot({
    transactionId: 'tx_p1',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 5_000_000n, // 5 units
    costBasisPaise: 5_000_00n   // ₹5,000
  });
  const lot2 = createTaxLot({
    transactionId: 'tx_p2',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-02-01',
    quantityMicros: 5_000_000n, // 5 units
    costBasisPaise: 6_000_00n   // ₹6,000
  });
  const lot3 = createTaxLot({
    transactionId: 'tx_p3',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-03-01',
    quantityMicros: 5_000_000n, // 5 units
    costBasisPaise: 7_000_00n   // ₹7,000
  });

  // Sell 12 units (depletes all of lot1, all of lot2, and 2 units of lot3)
  const res = depleteLotsFIFO({
    availableLots: [lot1, lot2, lot3],
    sellQuantityMicros: 12_000_000n,
    sellProceedsPaise: 20_000_00n,
    sellTransactionId: 'tx_multi_sell'
  });

  assert.equal(res.depletionRecords.length, 3);
  assert.equal(res.depletionRecords[0].sourceLotId, lot1.id);
  assert.equal(res.depletionRecords[0].depletedQuantityMicros, 5_000_000n);
  assert.equal(res.depletionRecords[1].sourceLotId, lot2.id);
  assert.equal(res.depletionRecords[1].depletedQuantityMicros, 5_000_000n);
  assert.equal(res.depletionRecords[2].sourceLotId, lot3.id);
  assert.equal(res.depletionRecords[2].depletedQuantityMicros, 2_000_000n);

  const uLot1 = res.updatedLots.find(l => l.id === lot1.id);
  const uLot2 = res.updatedLots.find(l => l.id === lot2.id);
  const uLot3 = res.updatedLots.find(l => l.id === lot3.id);

  assert.equal(uLot1.status, TAX_LOT_STATUS.DEPLETED);
  assert.equal(uLot2.status, TAX_LOT_STATUS.DEPLETED);
  assert.equal(uLot3.status, TAX_LOT_STATUS.PARTIALLY_DEPLETED);
  assert.equal(uLot3.remainingQuantityMicros, 3_000_000n);

  // Total depleted cost basis: 5,000 + 6,000 + (2/5 * 7,000 = 2,800) = 13,800_00n
  assert.equal(res.totalDepletedCostBasisPaise, 13_800_00n);
  assert.equal(res.realizedGainLossPaise, 20_000_00n - 13_800_00n); // 6,200_00n
});

// INV-LOT-06: Complete lot closure (remaining quantity & basis === 0)
runTest('INV-LOT-06: Complete lot closure sets remaining quantity and basis to exactly 0n', () => {
  const lot = createTaxLot({
    transactionId: 'tx_full',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 4_000_000n,
    costBasisPaise: 8_000_00n
  });

  const res = depleteLotsFIFO({
    availableLots: [lot],
    sellQuantityMicros: 4_000_000n,
    sellProceedsPaise: 9_000_00n,
    sellTransactionId: 'tx_s_full'
  });

  const closedLot = res.updatedLots[0];
  assert.equal(closedLot.remainingQuantityMicros, 0n);
  assert.equal(closedLot.remainingCostBasisPaise, 0n);
  assert.equal(closedLot.status, TAX_LOT_STATUS.DEPLETED);
});

// INV-LOT-07: Residual 1-micro-unit sale without underflow
runTest('INV-LOT-07: Residual 1-micro-unit sale executes without underflow', () => {
  const lot = createTaxLot({
    transactionId: 'tx_micro',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 1n, // 0.000001 units
    costBasisPaise: 5n   // 5 paise
  });

  const res = depleteLotsFIFO({
    availableLots: [lot],
    sellQuantityMicros: 1n,
    sellProceedsPaise: 10n,
    sellTransactionId: 'tx_s_micro'
  });

  assert.equal(res.totalDepletedCostBasisPaise, 5n);
  assert.equal(res.realizedGainLossPaise, 5n);
  assert.equal(res.updatedLots[0].remainingQuantityMicros, 0n);
  assert.equal(res.updatedLots[0].remainingCostBasisPaise, 0n);
});

// INV-LOT-08: Over-sale rejection by 1 micro-unit throws RangeError
runTest('INV-LOT-08: Sale exceeding available quantity by 1 micro-unit throws RangeError', () => {
  const lot = createTaxLot({
    transactionId: 'tx_avail',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 100_00n
  });

  assert.throws(() => {
    depleteLotsFIFO({
      availableLots: [lot],
      sellQuantityMicros: 10_000_001n, // 1 micro-unit over available
      sellProceedsPaise: 200_00n,
      sellTransactionId: 'tx_oversell'
    });
  }, /exceeds available holding quantity/);
});

// INV-LOT-09: Specific-lot selection sale depletes explicitly designated lot
runTest('INV-LOT-09: Specific-lot selection sale depletes explicitly designated lot', () => {
  const lotA = createTaxLot({
    id: 'lot_A',
    transactionId: 'tx_A',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 10_000_00n
  });
  const lotB = createTaxLot({
    id: 'lot_B',
    transactionId: 'tx_B',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-02-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 20_000_00n
  });

  // Explicitly deplete lot_B (bypassing FIFO lot_A)
  const res = depleteSpecificLots({
    availableLots: [lotA, lotB],
    specificAllocations: [{ lotId: 'lot_B', quantityMicros: 5_000_000n }],
    sellProceedsPaise: 15_000_00n,
    sellTransactionId: 'tx_specific',
    accountId: 'acc_1',
    instrumentId: 'inst_1'
  });

  const uLotA = res.updatedLots.find(l => l.id === 'lot_A');
  const uLotB = res.updatedLots.find(l => l.id === 'lot_B');

  // lot_A is completely untouched
  assert.equal(uLotA.remainingQuantityMicros, 10_000_000n);
  assert.equal(uLotA.status, TAX_LOT_STATUS.OPEN);

  // lot_B is partially depleted
  assert.equal(uLotB.remainingQuantityMicros, 5_000_000n);
  assert.equal(uLotB.remainingCostBasisPaise, 10_000_00n);
  assert.equal(res.totalDepletedCostBasisPaise, 10_000_00n);
});

// INV-LOT-10: Specific-lot from wrong account throws Error
runTest('INV-LOT-10: Specific-lot from wrong account throws Error', () => {
  const lot = createTaxLot({
    id: 'lot_wrong_acc',
    transactionId: 'tx_1',
    accountId: 'acc_A',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 10_000_00n
  });

  assert.throws(() => {
    depleteSpecificLots({
      availableLots: [lot],
      specificAllocations: [{ lotId: 'lot_wrong_acc', quantityMicros: 1_000_000n }],
      sellTransactionId: 'tx_s',
      accountId: 'acc_B', // Wrong account
      instrumentId: 'inst_1'
    });
  }, /belongs to account 'acc_A', not 'acc_B'/);
});

// INV-LOT-11: Specific-lot from wrong instrument throws Error
runTest('INV-LOT-11: Specific-lot from wrong instrument throws Error', () => {
  const lot = createTaxLot({
    id: 'lot_wrong_inst',
    transactionId: 'tx_1',
    accountId: 'acc_1',
    instrumentId: 'inst_INFY',
    acquisitionDate: '2026-01-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 10_000_00n
  });

  assert.throws(() => {
    depleteSpecificLots({
      availableLots: [lot],
      specificAllocations: [{ lotId: 'lot_wrong_inst', quantityMicros: 1_000_000n }],
      sellTransactionId: 'tx_s',
      accountId: 'acc_1',
      instrumentId: 'inst_TCS' // Wrong instrument
    });
  }, /is for instrument 'inst_INFY', not 'inst_TCS'/);
});

// INV-LOT-12: Specific-lot of depleted lot throws Error
runTest('INV-LOT-12: Specific-lot of depleted lot throws Error', () => {
  const lot = createTaxLot({
    id: 'lot_depleted',
    transactionId: 'tx_1',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 10_000_00n
  });
  lot.status = TAX_LOT_STATUS.DEPLETED;
  lot.remainingQuantityMicros = 0n;

  assert.throws(() => {
    depleteSpecificLots({
      availableLots: [lot],
      specificAllocations: [{ lotId: 'lot_depleted', quantityMicros: 1_000_000n }],
      sellTransactionId: 'tx_s',
      accountId: 'acc_1',
      instrumentId: 'inst_1'
    });
  }, /is not active, status is DEPLETED/);
});

// INV-LOT-13: Bonus shares corporate action creates zero-cost lot per Sec 55(2)(aa)
runTest('INV-LOT-13: Bonus shares creates zero-cost lot and preserves original lots', () => {
  const origLot = createTaxLot({
    transactionId: 'tx_orig',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2025-01-01',
    quantityMicros: 10_000_000n, // 10 shares
    costBasisPaise: 50_000_00n   // ₹50,000
  });

  // 1:1 bonus issue (10 new shares)
  const res = applyBonusToLots({
    activeLots: [origLot],
    bonusQuantityMicros: 10_000_000n,
    allotmentDate: '2026-03-01',
    corporateActionTxId: 'tx_bonus',
    accountId: 'acc_1',
    instrumentId: 'inst_1'
  });

  assert.equal(res.allLots.length, 2);
  const bonusLot = res.newBonusLot;
  assert.equal(bonusLot.quantityMicros || bonusLot.remainingQuantityMicros, 10_000_000n);
  assert.equal(bonusLot.costBasisPaise || bonusLot.remainingCostBasisPaise, 0n);
  assert.equal(bonusLot.acquisitionDate, '2026-03-01');

  // Original lot basis and quantity are strictly unchanged
  assert.equal(origLot.remainingQuantityMicros, 10_000_000n);
  assert.equal(origLot.remainingCostBasisPaise, 50_000_00n);
});

// INV-LOT-14: Stock split corporate action multiplies quantity and preserves total basis
runTest('INV-LOT-14: Stock split multiplies quantity and preserves exact total cost basis', () => {
  const origLot = createTaxLot({
    transactionId: 'tx_split_orig',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2025-01-01',
    quantityMicros: 5_000_000n, // 5 shares
    costBasisPaise: 25_000_00n  // ₹25,000
  });

  // 1:2 split (numerator = 2, denominator = 1) -> 10 shares
  const res = applyStockSplitToLots({
    activeLots: [origLot],
    numerator: 2,
    denominator: 1,
    corporateActionTxId: 'tx_split_1'
  });

  const splitLot = res.updatedLots[0];
  assert.equal(splitLot.remainingQuantityMicros, 10_000_000n);
  // Total cost basis remains strictly unchanged!
  assert.equal(splitLot.remainingCostBasisPaise, 25_000_00n);
});

// INV-LOT-15: Stock split with sub-micro fractional quantity throws RangeError
runTest('INV-LOT-15: Stock split with sub-micro fractional quantity throws RangeError', () => {
  const lot = createTaxLot({
    transactionId: 'tx_split_frac',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2025-01-01',
    quantityMicros: 1n, // 1 micro-unit
    costBasisPaise: 100n
  });

  // 1:2 split cannot split 1 micro-unit cleanly into 2 (would produce 0.5 micros)
  assert.throws(() => {
    applyStockSplitToLots({
      activeLots: [lot],
      numerator: 1,
      denominator: 2,
      corporateActionTxId: 'tx_split_fail'
    });
  }, /Split produces fractional micro-units/);
});

// INV-LOT-16: Stock split with zero numerator or denominator throws RangeError
runTest('INV-LOT-16: Stock split with zero numerator or denominator throws RangeError', () => {
  assert.throws(() => {
    applyStockSplitToLots({
      activeLots: [],
      numerator: 0,
      denominator: 1,
      corporateActionTxId: 'tx_split_zero'
    });
  }, /positive integers/);
});

// INV-LOT-17: MERGER corporate action explicitly rejected with informative Error
runTest('INV-LOT-17: MERGER corporate action explicitly rejected in V1 execution path', () => {
  assert.throws(() => {
    rejectMergerCorporateAction();
  }, /MERGER corporate action is not supported in V1 execution path/);
});

// INV-LOT-18: Sale reversal restores exact lot quantities and cost basis in reverse sequence
runTest('INV-LOT-18: Sale reversal restores exact lot quantities and cost basis', () => {
  const lot = createTaxLot({
    id: 'lot_rev_test',
    transactionId: 'tx_orig_buy',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 10_000_00n
  });

  // Deplete 4 units
  const depRes = depleteLotsFIFO({
    availableLots: [lot],
    sellQuantityMicros: 4_000_000n,
    sellProceedsPaise: 5_000_00n,
    sellTransactionId: 'tx_sale_to_reverse'
  });

  const depletedLot = depRes.updatedLots[0];
  assert.equal(depletedLot.remainingQuantityMicros, 6_000_000n);

  // Reverse sale
  const restoredLots = restoreLotsFromSaleReversal({
    currentLots: [depletedLot],
    depletionsForSale: depRes.depletionRecords
  });

  const finalLot = restoredLots[0];
  assert.equal(finalLot.remainingQuantityMicros, 10_000_000n);
  assert.equal(finalLot.remainingCostBasisPaise, 10_000_00n);
  assert.equal(finalLot.status, TAX_LOT_STATUS.OPEN);
});

// INV-LOT-19: Purchase reversal blocked when tax lot has active downstream depletions
runTest('INV-LOT-19: Purchase reversal blocked when tax lot has active downstream depletions', () => {
  const lot = createTaxLot({
    id: 'lot_blocked_rev',
    transactionId: 'tx_buy_blocked',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2026-01-01',
    quantityMicros: 10_000_000n,
    costBasisPaise: 10_000_00n
  });
  lot.remainingQuantityMicros = 6_000_000n; // partially depleted

  assert.throws(() => {
    assertCanReversePurchaseLot(lot, []);
  }, /has been partially or fully depleted. Downstream sales must be reversed first/);
});

// INV-LOT-20: Missing acquisition history produces COST_UNAVAILABLE, never 0n basis
runTest('INV-LOT-20: Missing acquisition history produces COST_UNAVAILABLE, never 0n basis', () => {
  const unkLot = createTaxLot({
    transactionId: 'tx_migrated',
    accountId: 'acc_1',
    instrumentId: 'inst_1',
    acquisitionDate: '2020-01-01',
    quantityMicros: 10_000_000n,
    costBasisStatus: COST_BASIS_STATUS.UNAVAILABLE,
    costBasisPaise: null
  });

  assert.equal(unkLot.costBasisStatus, COST_BASIS_STATUS.UNAVAILABLE);
  assert.equal(unkLot.remainingCostBasisPaise, null);
  assert.notEqual(unkLot.remainingCostBasisPaise, 0n);

  // Deplete from unavailable lot
  const res = depleteLotsFIFO({
    availableLots: [unkLot],
    sellQuantityMicros: 2_000_000n,
    sellProceedsPaise: 5_000_00n,
    sellTransactionId: 'tx_s_unk'
  });

  assert.equal(res.totalDepletedCostBasisPaise, null);
  assert.equal(res.realizedGainLossPaise, null); // Cannot compute realized gain without cost basis
});

console.log(`\n🎉 ALL ${passedCount} / 20 TAX LOT ENGINE TESTS PASSED!\n`);
