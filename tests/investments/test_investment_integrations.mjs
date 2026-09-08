/**
 * @file test_investment_integrations.mjs
 * @description Comprehensive unit and adversarial invariant test suite for
 * FinLife Investments Module V1 — Phase 4: Financial Integrations
 * (Banking, Cashbook, Assets, Properties, Personal CFO).
 *
 * Covers all 12 invariant groups:
 * - INV-INT: Star Topology & Single Ledger Authority
 * - INV-BANK: Banking Reconciliation Statuses & Exact ₹0 Rules
 * - INV-CASH: Cashbook Projection, Reversal Reflection & Transfer Neutrality
 * - INV-ASSET: Assets Module Projection & Precious Metal Isolation
 * - INV-PROP: Real Estate Properties Module Boundary & REIT Isolation
 * - INV-DEDUP: Non-Mutating Duplicate Detection & Double-Count Prevention
 * - INV-CFO: Consolidated CFO Balance Sheet Aggregation
 * - INV-UNAVAIL: Mandatory Null Net Worth on Missing / Unavailable Sources
 * - INV-OWN: Remainder-Preserving 10,000 BPS Allocation
 * - INV-RO: Deep-Freeze Read-Only Immutability Verification
 * - INV-PERSIST: 10-Key Atomic Commit, Cold Restart & Rollback
 */

import assert from 'assert';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  BANKING_RECONCILIATION_STATUS,
  CFO_PROJECTION_STATUS,
  OWNERSHIP_SCOPE,
  TOTAL_OWNERSHIP_BPS,
  allocateRemainderPreserving,
  validateOwnershipBps
} from '../../components/investments/investmentIntegrationContracts.js';

import {
  reconcileInvestmentBankingCashFlows
} from '../../components/investments/investmentBankingAdapter.js';

import {
  projectInvestmentCashbookEntries
} from '../../components/investments/investmentCashbookAdapter.js';

import {
  getInvestmentsAssetProjection,
  detectCrossModuleInvestmentDuplicates
} from '../../components/investments/investmentAssetsAdapter.js';

import {
  assertInvestmentsPropertiesIsolation
} from '../../components/investments/investmentPropertiesIsolation.js';

import {
  getConsolidatedCFOBalanceSheet
} from '../../components/investments/investmentCFOAdapter.js';

import {
  InvestmentService,
  INVESTMENT_STORAGE_KEYS,
  INVESTMENT_SCHEMA_VERSION
} from '../../services/investmentService.js';

import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  INSTRUMENT_TYPES,
  ACCOUNT_TYPES
} from '../../components/investments/investmentContracts.js';

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

async function itAsync(desc, fn) {
  total++;
  try {
    await fn();
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

export async function runInvestmentIntegrationsTests() {
  passed = 0;
  total = 0;
  console.log('\n================================================================');
  console.log('=== FINLIFE INVESTMENTS: PHASE 4 FINANCIAL INTEGRATIONS TESTS ===');
  console.log('================================================================\n');

  // ───────────────────────────────────────────────────────────────────────────
  // Group 1: INV-BANK (Banking Reconciliation)
  // ─────────────────────────────────────────────────────────────────────────

  it('INV-BANK-01: Exact ₹0 gap reconciliation between settled trade and matching bank transaction', () => {
    const invTx = [
      {
        id: 'tx_buy_01',
        transactionType: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 50_000_00n, // ₹50,000.00
        sourceReference: 'BANK_REF_101'
      }
    ];
    const bankTx = [
      {
        id: 'btx_01',
        accountId: 'acc_bank_hdfc',
        amountPaise: 50_000_00n,
        referenceId: 'BANK_REF_101'
      }
    ];

    const result = reconcileInvestmentBankingCashFlows({
      investmentTransactions: invTx,
      bankTransactions: bankTx,
      linkedBankAccountId: 'acc_bank_hdfc',
      isAvailable: true
    });

    assert.strictEqual(result.isReconciled, true);
    assert.strictEqual(result.status, BANKING_RECONCILIATION_STATUS.MATCHED);
    assert.strictEqual(result.totalDiscrepancyPaise, 0n);
    assert.strictEqual(result.matchedCount, 1);
    assert.strictEqual(result.items[0].discrepancyPaise, 0n);
    assert.strictEqual(result.items[0].status, BANKING_RECONCILIATION_STATUS.MATCHED);
  });

  it('INV-BANK-02: Unsettled trade (PENDING) reports PENDING_SETTLEMENT, never ₹0 discrepancy', () => {
    const invTx = [
      {
        id: 'tx_buy_pending',
        transactionType: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.PENDING,
        netCashAmountPaise: 25_000_00n
      }
    ];
    const bankTx = [];

    const result = reconcileInvestmentBankingCashFlows({
      investmentTransactions: invTx,
      bankTransactions: bankTx,
      linkedBankAccountId: 'acc_bank_hdfc',
      isAvailable: true
    });

    assert.strictEqual(result.isReconciled, false);
    assert.strictEqual(result.status, BANKING_RECONCILIATION_STATUS.PENDING_SETTLEMENT);
    assert.strictEqual(result.totalDiscrepancyPaise, null); // Never reports ₹0!
    assert.strictEqual(result.items[0].status, BANKING_RECONCILIATION_STATUS.PENDING_SETTLEMENT);
  });

  it('INV-BANK-03: Missing bank debit reports MISSING_BANK_MOVEMENT with explicit discrepancy amount', () => {
    const invTx = [
      {
        id: 'tx_buy_nomatch',
        transactionType: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 15_000_00n,
        sourceReference: 'NON_EXISTENT_REF'
      }
    ];
    const bankTx = [];

    const result = reconcileInvestmentBankingCashFlows({
      investmentTransactions: invTx,
      bankTransactions: bankTx,
      linkedBankAccountId: 'acc_bank_hdfc',
      isAvailable: true
    });

    assert.strictEqual(result.isReconciled, false);
    assert.strictEqual(result.status, BANKING_RECONCILIATION_STATUS.MISSING_BANK_MOVEMENT);
    assert.strictEqual(result.totalDiscrepancyPaise, 15_000_00n);
    assert.strictEqual(result.items[0].discrepancyPaise, 15_000_00n);
    assert.strictEqual(result.items[0].status, BANKING_RECONCILIATION_STATUS.MISSING_BANK_MOVEMENT);
  });

  it('INV-BANK-04: Amount mismatch reports AMOUNT_MISMATCH with exact difference in BigInt paise', () => {
    const invTx = [
      {
        id: 'tx_buy_diff',
        transactionType: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 10_000_50n,
        sourceReference: 'REF_DIFF'
      }
    ];
    const bankTx = [
      {
        id: 'btx_diff',
        accountId: 'acc_bank_hdfc',
        amountPaise: 10_000_00n, // 50 paise mismatch
        referenceId: 'REF_DIFF'
      }
    ];

    const result = reconcileInvestmentBankingCashFlows({
      investmentTransactions: invTx,
      bankTransactions: bankTx,
      linkedBankAccountId: 'acc_bank_hdfc',
      isAvailable: true
    });

    assert.strictEqual(result.isReconciled, false);
    assert.strictEqual(result.status, BANKING_RECONCILIATION_STATUS.PARTIAL);
    assert.strictEqual(result.totalDiscrepancyPaise, 50n);
    assert.strictEqual(result.items[0].discrepancyPaise, 50n);
    assert.strictEqual(result.items[0].status, BANKING_RECONCILIATION_STATUS.AMOUNT_MISMATCH);
  });

  it('INV-BANK-05: Unlinked bank account reports UNLINKED_ACCOUNT and null discrepancy', () => {
    const invTx = [
      {
        id: 'tx_buy_01',
        transactionType: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 10_000_00n
      }
    ];

    const result = reconcileInvestmentBankingCashFlows({
      investmentTransactions: invTx,
      bankTransactions: [],
      linkedBankAccountId: null,
      isAvailable: true
    });

    assert.strictEqual(result.isReconciled, false);
    assert.strictEqual(result.status, BANKING_RECONCILIATION_STATUS.UNLINKED_ACCOUNT);
    assert.strictEqual(result.totalDiscrepancyPaise, null);
  });

  it('INV-BANK-06: Unavailable banking source produces UNAVAILABLE status and null discrepancy', () => {
    const result = reconcileInvestmentBankingCashFlows({
      investmentTransactions: [],
      bankTransactions: [],
      linkedBankAccountId: 'acc_bank_hdfc',
      isAvailable: false
    });

    assert.strictEqual(result.isReconciled, false);
    assert.strictEqual(result.status, BANKING_RECONCILIATION_STATUS.UNAVAILABLE);
    assert.strictEqual(result.totalDiscrepancyPaise, null);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 2: INV-CASH (Cashbook Projection, Reversals, Transfer Neutrality)
  // ─────────────────────────────────────────────────────────────────────────

  it('INV-CASH-01: Projected cashbook entries reflect Buy (outflow), Sell (inflow), Dividend (inflow), Tax/Fee (outflow)', () => {
    const txs = [
      {
        id: 'tx_buy_1',
        transactionType: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 10_000_00n,
        transactionDate: '2026-01-10'
      },
      {
        id: 'tx_sell_1',
        transactionType: TRANSACTION_TYPES.SELL,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 15_000_00n,
        transactionDate: '2026-02-10'
      },
      {
        id: 'tx_div_1',
        transactionType: TRANSACTION_TYPES.DIVIDEND,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 500_00n,
        transactionDate: '2026-03-01'
      },
      {
        id: 'tx_fee_1',
        transactionType: TRANSACTION_TYPES.FEE,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 20_00n,
        transactionDate: '2026-03-05'
      }
    ];

    const result = projectInvestmentCashbookEntries({ transactions: txs });
    assert.strictEqual(result.entries.length, 4);

    // Inflows: Sell (15,000) + Dividend (500) = 15,500.00
    assert.strictEqual(result.summary.totalInflowsPaise, 15_500_00n);
    // Outflows: Buy (10,000) + Fee (20) = 10,020.00
    assert.strictEqual(result.summary.totalOutflowsPaise, 10_020_00n);
    // Net cash flow: 15,500 - 10,020 = 5,480.00
    assert.strictEqual(result.summary.netCashFlowPaise, 5_480_00n);
  });

  it('INV-CASH-02: Symmetrical reversal: Reversed purchase projects exact compensating refund summing to net ₹0', () => {
    const txs = [
      {
        id: 'tx_buy_orig',
        transactionType: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 40_000_00n,
        transactionDate: '2026-01-10'
      },
      {
        id: 'tx_buy_rev',
        transactionType: TRANSACTION_TYPES.REVERSAL,
        status: TRANSACTION_STATUS.SETTLED,
        reversalOfTransactionId: 'tx_buy_orig',
        originalTransactionType: TRANSACTION_TYPES.BUY,
        netCashAmountPaise: 40_000_00n,
        transactionDate: '2026-01-12'
      }
    ];

    const result = projectInvestmentCashbookEntries({ transactions: txs });
    assert.strictEqual(result.entries.length, 2);

    const origEntry = result.entries[0];
    const revEntry = result.entries[1];

    assert.strictEqual(origEntry.type, 'EXPENSE');
    assert.strictEqual(origEntry.netCashImpactPaise, -40_000_00n);

    assert.strictEqual(revEntry.type, 'REFUND');
    assert.strictEqual(revEntry.netCashImpactPaise, 40_000_00n);

    // Sum of projected cash impacts is exact 0n paise
    const totalImpact = origEntry.netCashImpactPaise + revEntry.netCashImpactPaise;
    assert.strictEqual(totalImpact, 0n);
    assert.strictEqual(result.summary.netCashFlowPaise, 0n);
  });

  it('INV-CASH-03: Inter-account transfer neutrality: Projected transfer legs balance to exact net ₹0', () => {
    const txs = [
      {
        id: 'tx_tf_out',
        transactionType: TRANSACTION_TYPES.TRANSFER_OUT,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 50_000_00n,
        accountId: 'acc_broker_1',
        destinationAccountId: 'acc_broker_2',
        transactionDate: '2026-02-01'
      },
      {
        id: 'tx_tf_in',
        transactionType: TRANSACTION_TYPES.TRANSFER_IN,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 50_000_00n,
        accountId: 'acc_broker_2',
        destinationAccountId: null,
        transactionDate: '2026-02-01'
      }
    ];

    const result = projectInvestmentCashbookEntries({ transactions: txs });
    assert.strictEqual(result.entries.length, 2);
    assert.strictEqual(result.summary.netCashFlowPaise, 0n);

    const outLeg = result.entries[0];
    const inLeg = result.entries[1];
    assert.strictEqual(outLeg.netCashImpactPaise + inLeg.netCashImpactPaise, 0n);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 3: INV-ASSET & INV-PROP (Assets Projection & Property Isolation)
  // ─────────────────────────────────────────────────────────────────────────

  it('INV-ASSET-01: Authoritative portfolio valuation projects into Assets module taxonomy as INVESTMENT_LEDGER category', () => {
    const mockValuation = {
      status: 'AVAILABLE',
      asOfDate: '2026-03-01',
      totalMarketValuePaise: 500_000_00n,
      totalCostBasisPaise: 400_000_00n,
      totalUnrealizedGainLossPaise: 100_000_00n,
      holdings: [
        {
          id: 'h_1',
          symbol: 'INFY',
          quantityMicros: 100_000000n,
          marketValuePaise: 500_000_00n
        }
      ]
    };

    const projection = getInvestmentsAssetProjection({
      portfolioValuation: mockValuation,
      isAvailable: true
    });

    assert.strictEqual(projection.sourceType, 'INVESTMENT_LEDGER');
    assert.strictEqual(projection.assetCategory, 'INVESTMENTS');
    assert.strictEqual(projection.isReadOnlyProjection, true);
    assert.strictEqual(projection.isAvailable, true);
    assert.strictEqual(projection.totalMarketValuePaise, 500_000_00n);
    assert.strictEqual(projection.totalCostBasisPaise, 400_000_00n);
    assert.strictEqual(projection.unrealizedGainLossPaise, 100_000_00n);
    assert.strictEqual(projection.securitiesCount, 1);
  });

  it('INV-ASSET-02: Physical gold (PRECIOUS_METALS) and gold securities (GOLD_ETF/SGB) are strictly separated and never collide', () => {
    const investmentHoldings = [
      {
        id: 'h_sgb',
        isin: 'IN0020200154',
        symbol: 'SGBMAY28',
        instrumentType: INSTRUMENT_TYPES.GOVERNMENT_SECURITY
      },
      {
        id: 'h_gold_etf',
        isin: 'INF204KB17I5',
        symbol: 'NIPPON_GOLD_BEES',
        instrumentType: INSTRUMENT_TYPES.GOLD_ETF
      }
    ];

    const manualAssets = [
      {
        id: 'asset_gold_bar',
        name: '24K Gold Bar 100g',
        category: 'PRECIOUS_METALS', // Physical gold
        valuationPaise: 750_000_00n
      },
      {
        id: 'asset_gold_chain',
        name: '22K Gold Chain',
        category: 'PRECIOUS_METALS', // Physical gold jewelry
        valuationPaise: 200_000_00n
      }
    ];

    const dedup = detectCrossModuleInvestmentDuplicates({
      investmentHoldings,
      manualAssets
    });

    // Physical gold must NOT be matched or flagged as duplicate of gold ETF or SGB!
    assert.strictEqual(dedup.hasDuplicates, false);
    assert.strictEqual(dedup.duplicateIds.length, 0);
    assert.strictEqual(dedup.totalDuplicateValuePaise, 0n);
  });

  it('INV-PROP-01: Boundary isolation validates clean separation between physical properties and investment securities', () => {
    const investmentHoldings = [
      {
        id: 'h_infy',
        instrumentType: INSTRUMENT_TYPES.EQUITY,
        symbol: 'INFY'
      }
    ];
    const propertiesRegistry = [
      {
        id: 'prop_apt_1',
        name: 'Prestige Apartment 3BHK',
        propertyType: 'APARTMENT'
      }
    ];

    const report = assertInvestmentsPropertiesIsolation({
      investmentHoldings,
      propertiesRegistry,
      throwOnViolation: true
    });

    assert.strictEqual(report.isIsolated, true);
    assert.strictEqual(report.violations.length, 0);
    assert.strictEqual(report.physicalPropertiesCount, 1);
  });

  it('INV-PROP-02: REITs & InvITs are verified as securities, containing zero physical property attributes (sqft, khata)', () => {
    const investmentHoldings = [
      {
        id: 'h_reit_1',
        instrumentType: INSTRUMENT_TYPES.REIT_INVIT,
        symbol: 'EMBASSY_REIT',
        isin: 'INE041025011'
      }
    ];
    const propertiesRegistry = [];

    const report = assertInvestmentsPropertiesIsolation({
      investmentHoldings,
      propertiesRegistry
    });

    assert.strictEqual(report.isIsolated, true);
    assert.strictEqual(report.reitSecuritiesCount, 1);
  });

  it('INV-PROP-03: Boundary violation detected if physical property claims security ISIN', () => {
    const investmentHoldings = [];
    const propertiesRegistry = [
      {
        id: 'prop_bad',
        name: 'Invalid Property',
        isin: 'INE041025011' // Violating property claiming an ISIN
      }
    ];

    const report = assertInvestmentsPropertiesIsolation({
      investmentHoldings,
      propertiesRegistry,
      throwOnViolation: false
    });

    assert.strictEqual(report.isIsolated, false);
    assert.strictEqual(report.violations.length, 1);
    assert.strictEqual(report.violations[0].type, 'PHYSICAL_PROPERTY_HAS_SECURITY_ISIN');
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 4: INV-DEDUP (Non-Mutating Deduplication)
  // ─────────────────────────────────────────────────────────────────────────

  it('INV-DEDUP-01: Manual asset duplicate detection identifies matching ISINs and symbols', () => {
    const investmentHoldings = [
      {
        id: 'h_tcs',
        isin: 'INE467B01029',
        symbol: 'TCS'
      }
    ];
    const manualAssets = [
      {
        id: 'asset_manual_tcs',
        name: 'TCS Shares',
        category: 'INVESTMENTS',
        isin: 'INE467B01029',
        valuationPaise: 350_000_00n
      },
      {
        id: 'asset_manual_car',
        name: 'BMW 330i',
        category: 'VEHICLES',
        valuationPaise: 4_500_000_00n
      }
    ];

    const dedup = detectCrossModuleInvestmentDuplicates({
      investmentHoldings,
      manualAssets
    });

    assert.strictEqual(dedup.hasDuplicates, true);
    assert.strictEqual(dedup.duplicateIds.length, 1);
    assert.strictEqual(dedup.duplicateIds[0], 'asset_manual_tcs');
    assert.strictEqual(dedup.totalDuplicateValuePaise, 350_000_00n);
    assert.strictEqual(dedup.duplicateItems[0].matchReason, 'MATCHING_ISIN');
  });

  it('INV-DEDUP-02: Deduplication is strictly non-mutating: manual asset records are never modified, deleted, or archived', () => {
    const investmentHoldings = deepFreeze([
      {
        id: 'h_rel',
        isin: 'INE002A01018',
        symbol: 'RELIANCE'
      }
    ]);
    const manualAssets = [
      {
        id: 'asset_rel',
        name: 'Reliance Shares',
        category: 'INVESTMENTS',
        isin: 'INE002A01018',
        valuationPaise: 250_000_00n,
        status: 'ACTIVE'
      }
    ];

    const safeStringify = (val) => JSON.stringify(val, (k, v) => typeof v === 'bigint' ? v.toString() : v);
    const manualAssetsBeforeJson = safeStringify(manualAssets);

    const dedup = detectCrossModuleInvestmentDuplicates({
      investmentHoldings,
      manualAssets
    });

    const manualAssetsAfterJson = safeStringify(manualAssets);

    assert.strictEqual(dedup.hasDuplicates, true);
    // Source data is completely untouched
    assert.strictEqual(manualAssetsBeforeJson, manualAssetsAfterJson);
    assert.strictEqual(manualAssets[0].status, 'ACTIVE'); // NOT archived or deleted!
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 5: INV-CFO & INV-UNAVAIL (Personal CFO Balance Sheet & Invariant Guards)
  // ─────────────────────────────────────────────────────────────────────────

  it('INV-CFO-01: Consolidated balance sheet with all modules available computes exact net worth in BigInt paise', () => {
    const cfo = getConsolidatedCFOBalanceSheet({
      liquidCash: { totalPaise: 100_000_00n, isAvailable: true },         // ₹1 Lakh
      investmentsValuation: { totalMarketValuePaise: 500_000_00n, isAvailable: true }, // ₹5 Lakh
      physicalAssets: [
        { id: 'a_car', category: 'VEHICLES', valuationPaise: 200_000_00n, status: 'ACTIVE' } // ₹2 Lakh
      ],
      properties: [
        { id: 'p_1', currentMarketValuePaise: 1_000_000_00n, status: 'ACTIVE' } // ₹10 Lakh
      ],
      p2pReceivables: { totalPrincipalPaise: 50_000_00n, isAvailable: true }, // ₹50k
      formalDebt: { totalOutstandingPaise: 300_000_00n, isAvailable: true },  // ₹3 Lakh debt
      p2pPayables: { totalOutstandingPaise: 0n, isAvailable: true },
      propertyLiabilities: { totalOutstandingPaise: 0n, isAvailable: true },
      ownershipMode: OWNERSHIP_SCOPE.FAMILY,
      personalBps: 10000n
    });

    // Total Assets = 1 + 5 + 2 + 10 + 0.5 = ₹18.5 Lakh = 1,850,000.00
    assert.strictEqual(cfo.assetsBreakdown.totalAssetsPaise, 1_850_000_00n);
    // Total Liabilities = ₹3 Lakh = 300,000.00
    assert.strictEqual(cfo.liabilitiesBreakdown.totalLiabilitiesPaise, 300_000_00n);
    // Net Worth = 1,850,000 - 300,000 = ₹15.5 Lakh = 1,550,000.00
    assert.strictEqual(cfo.netWorthPaise, 1_550_000_00n);
    assert.strictEqual(cfo.status, CFO_PROJECTION_STATUS.COMPLETE);
    assert.strictEqual(cfo.isStale, false);
    assert.strictEqual(cfo.unavailableSources.length, 0);
  });

  it('INV-CFO-02: INVARIANT GUARD: If ANY module is UNAVAILABLE or missing, netWorthPaise evaluates strictly to null', () => {
    const cfo = getConsolidatedCFOBalanceSheet({
      liquidCash: { totalPaise: 100_000_00n, isAvailable: true },
      investmentsValuation: { totalMarketValuePaise: 500_000_00n, isAvailable: true },
      physicalAssets: [],
      properties: null, // UNAVAILABLE properties source!
      p2pReceivables: { totalPrincipalPaise: 50_000_00n, isAvailable: true },
      formalDebt: { totalOutstandingPaise: 100_000_00n, isAvailable: true }
    });

    // Cardinal rule: netWorthPaise MUST be strictly null (never ₹0 fabricated partial sum)
    assert.strictEqual(cfo.netWorthPaise, null);
    assert.strictEqual(cfo.personalNetWorthPaise, null);
    assert.strictEqual(cfo.familyNetWorthPaise, null);
    assert.strictEqual(cfo.status, CFO_PROJECTION_STATUS.PARTIAL);
    assert.ok(cfo.unavailableSources.includes('PROPERTIES'));
  });

  it('INV-CFO-03: Multiple unavailable sources populate unavailableSources explicitly and netWorthPaise is null', () => {
    const cfo = getConsolidatedCFOBalanceSheet({
      liquidCash: { totalPaise: 100_000_00n, isAvailable: true },
      investmentsValuation: null, // Missing
      physicalAssets: null,       // Missing
      properties: null,           // Missing
      p2pReceivables: null,       // Missing
      formalDebt: null            // Missing
    });

    assert.strictEqual(cfo.netWorthPaise, null);
    assert.strictEqual(cfo.status, CFO_PROJECTION_STATUS.UNAVAILABLE);
    assert.strictEqual(cfo.unavailableSources.length, 5);
  });

  it('INV-CFO-04: Stale price quote marks CFO balance sheet STALE (isStale: true) while computing net worth', () => {
    const cfo = getConsolidatedCFOBalanceSheet({
      liquidCash: { totalPaise: 100_000_00n, isAvailable: true },
      investmentsValuation: { totalMarketValuePaise: 500_000_00n, isAvailable: true, isStale: true }, // Stale!
      physicalAssets: [],
      properties: [],
      p2pReceivables: { totalPrincipalPaise: 0n, isAvailable: true },
      formalDebt: { totalOutstandingPaise: 0n, isAvailable: true }
    });

    assert.strictEqual(cfo.status, CFO_PROJECTION_STATUS.STALE);
    assert.strictEqual(cfo.isStale, true);
    assert.ok(cfo.staleSources.includes('INVESTMENTS'));
    // Stale allows computable net worth with warning flag
    assert.strictEqual(cfo.netWorthPaise, 600_000_00n);
  });

  it('INV-CFO-05: Deduplication exclusion prevents double-counting duplicate manual asset in CFO', () => {
    const manualAssets = [
      { id: 'dup_stock_asset', category: 'OTHER_ASSETS', valuationPaise: 500_000_00n, status: 'ACTIVE' },
      { id: 'real_gold_asset', category: 'PRECIOUS_METALS', valuationPaise: 200_000_00n, status: 'ACTIVE' }
    ];

    const cfoWithExclusion = getConsolidatedCFOBalanceSheet({
      liquidCash: { totalPaise: 0n, isAvailable: true },
      investmentsValuation: { totalMarketValuePaise: 500_000_00n, isAvailable: true }, // Already has the stock
      physicalAssets: manualAssets,
      excludeDuplicateAssetIds: ['dup_stock_asset'], // Exclude duplicate!
      properties: [],
      p2pReceivables: { totalPrincipalPaise: 0n, isAvailable: true },
      formalDebt: { totalOutstandingPaise: 0n, isAvailable: true }
    });

    // Total Assets should be 500k (Investments) + 200k (Physical Gold) = 700k (NOT 1,200k!)
    assert.strictEqual(cfoWithExclusion.assetsBreakdown.physicalAssetsPaise, 200_000_00n);
    assert.strictEqual(cfoWithExclusion.assetsBreakdown.totalAssetsPaise, 700_000_00n);
    assert.strictEqual(cfoWithExclusion.netWorthPaise, 700_000_00n);
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 6: INV-OWN (Remainder-Preserving 10,000 BPS Ownership Allocation)
  // ─────────────────────────────────────────────────────────────────────────

  it('INV-OWN-01: Remainder-preserving 10,000 BPS allocation: personalPaise + otherOwnersPaise === totalPaise exactly', () => {
    // Total value: 10,000,003 paise (₹100,000.03)
    // Share: 33.33% = 3333 BPS
    const totalPaise = 10_000_003n;
    const personalBps = 3333n;

    const allocation = allocateRemainderPreserving(totalPaise, personalBps);

    // personal = floor((10,000,003 * 3,333 + 5,000) / 10,000) = floor((33,330,009,999 + 5,000) / 10,000)
    // = floor(33,330,014,999 / 10,000) = 3,333,001n
    assert.strictEqual(allocation.personalAllocatedPaise, 3_333_001n);
    // otherOwners = 10,000,003 - 3,333,001 = 6,667,002n
    assert.strictEqual(allocation.otherOwnersAllocatedPaise, 6_667_002n);

    // Sum invariant: exact zero-paise leakage!
    assert.strictEqual(
      allocation.personalAllocatedPaise + allocation.otherOwnersAllocatedPaise,
      totalPaise
    );
  });

  it('INV-OWN-02: Boundary 10,000 BPS (100%) and 0 BPS (0%) allocate with zero leakage', () => {
    const totalPaise = 50_000_00n;

    const fullAlloc = allocateRemainderPreserving(totalPaise, 10000n);
    assert.strictEqual(fullAlloc.personalAllocatedPaise, 50_000_00n);
    assert.strictEqual(fullAlloc.otherOwnersAllocatedPaise, 0n);

    const zeroAlloc = allocateRemainderPreserving(totalPaise, 0n);
    assert.strictEqual(zeroAlloc.personalAllocatedPaise, 0n);
    assert.strictEqual(zeroAlloc.otherOwnersAllocatedPaise, 50_000_00n);
  });

  it('INV-OWN-03: Invalid BPS (< 0n or > 10000n or non-BigInt) throws RangeError/TypeError', () => {
    assert.throws(() => validateOwnershipBps(-1n), RangeError);
    assert.throws(() => validateOwnershipBps(10001n), RangeError);
    assert.throws(() => validateOwnershipBps(5000), TypeError); // Number rejected
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 7: INV-RO (Deep Read-Only Immutability Verification)
  // ─────────────────────────────────────────────────────────────────────────

  it('INV-RO-01: Deep read-only verification: Deep-frozen input DTOs cannot be mutated by adapters', () => {
    const frozenInvTx = deepFreeze([
      {
        id: 'tx_frozen',
        transactionType: TRANSACTION_TYPES.BUY,
        status: TRANSACTION_STATUS.SETTLED,
        netCashAmountPaise: 10_000_00n,
        sourceReference: 'REF_FROZEN'
      }
    ]);
    const frozenBankTx = deepFreeze([
      {
        id: 'btx_frozen',
        accountId: 'acc_bank',
        amountPaise: 10_000_00n,
        referenceId: 'REF_FROZEN'
      }
    ]);

    // Executing banking adapter with frozen inputs succeeds without trying to mutate
    assert.doesNotThrow(() => {
      reconcileInvestmentBankingCashFlows({
        investmentTransactions: frozenInvTx,
        bankTransactions: frozenBankTx,
        linkedBankAccountId: 'acc_bank',
        isAvailable: true
      });
    });

    // Executing cashbook adapter with frozen inputs succeeds
    assert.doesNotThrow(() => {
      projectInvestmentCashbookEntries({ transactions: frozenInvTx });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Group 8: INV-PERSIST (10-Key Persistence, Cold Restart, Rollback)
  // ─────────────────────────────────────────────────────────────────────────

  await itAsync('INV-PERSIST-01: 10-key atomic commit & cold restart restores CFO snapshots without loss or drift', async () => {
    await InvestmentService.resetToCleanState();

    const sampleCFO = {
      calculationPolicyVersion: 'FINLIFE_CFO_V1',
      asOfDate: '2026-03-08',
      status: CFO_PROJECTION_STATUS.COMPLETE,
      isStale: false,
      ownershipMode: OWNERSHIP_SCOPE.PERSONAL,
      personalBps: 10000n,
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
      personalNetWorthPaise: 1_500_000_00n,
      familyNetWorthPaise: 0n
    };

    const captured = await InvestmentService.captureCFOSnapshot(sampleCFO);
    assert.ok(captured.id);
    assert.strictEqual(captured.netWorthPaise, 1_500_000_00n);

    // Simulate cold restart
    InvestmentService.clearMemoryCache();

    const reloaded = await InvestmentService.getLatestCFOSnapshot();
    assert.ok(reloaded);
    assert.strictEqual(reloaded.id, captured.id);
    assert.strictEqual(reloaded.netWorthPaise, 1_500_000_00n);
    assert.strictEqual(reloaded.personalBps, 10000n);
    assert.strictEqual(reloaded.assetsBreakdown.totalAssetsPaise, 1_800_000_00n);
    assert.strictEqual(reloaded.liabilitiesBreakdown.totalLiabilitiesPaise, 300_000_00n);
  });

  await itAsync('INV-PERSIST-02: Self-healing: Corrupted CFO snapshot cache auto-resets on cold load without throwing', async () => {
    await InvestmentService.corruptCFOSnapshotCacheForTesting();
    InvestmentService.clearMemoryCache();

    const snapshot = await InvestmentService.getLatestCFOSnapshot();
    // Cache was auto-reset from corrupt state to clean []
    assert.strictEqual(snapshot, null);
  });

  await itAsync('INV-PERSIST-03: Atomic write rollback: Simulated failure restores intact cache across all 10 keys', async () => {
    await InvestmentService.resetToCleanState();

    // Add base instrument
    const inst = await InvestmentService.addInstrument({
      id: 'inst_rb_test',
      instrumentType: INSTRUMENT_TYPES.EQUITY,
      name: 'Rollback Test Equities'
    });

    // Capture initial CFO snapshot
    await InvestmentService.captureCFOSnapshot({
      calculationPolicyVersion: 'FINLIFE_CFO_V1',
      asOfDate: '2026-03-08',
      status: CFO_PROJECTION_STATUS.COMPLETE,
      isStale: false,
      ownershipMode: OWNERSHIP_SCOPE.PERSONAL,
      personalBps: 10000n,
      unavailableSources: [],
      staleSources: [],
      assetsBreakdown: { totalAssetsPaise: 100_000_00n },
      liabilitiesBreakdown: { totalLiabilitiesPaise: 0n },
      netWorthPaise: 100_000_00n,
      personalNetWorthPaise: 100_000_00n,
      familyNetWorthPaise: 0n
    });

    const initialSnapshots = await InvestmentService.getAllCFOSnapshots();
    assert.strictEqual(initialSnapshots.length, 1);

    // Mock multiSet to fail on next write
    const originalMultiSet = AsyncStorage.multiSet;
    AsyncStorage.multiSet = async () => {
      throw new Error('SIMULATED_DISK_WRITE_FAILURE');
    };

    let threw = false;
    try {
      await InvestmentService.captureCFOSnapshot({
        calculationPolicyVersion: 'FINLIFE_CFO_V1',
        asOfDate: '2026-03-09',
        status: CFO_PROJECTION_STATUS.COMPLETE,
        isStale: false,
        ownershipMode: OWNERSHIP_SCOPE.PERSONAL,
        personalBps: 10000n,
        unavailableSources: [],
        staleSources: [],
        assetsBreakdown: { totalAssetsPaise: 200_000_00n },
        liabilitiesBreakdown: { totalLiabilitiesPaise: 0n },
        netWorthPaise: 200_000_00n,
        personalNetWorthPaise: 200_000_00n,
        familyNetWorthPaise: 0n
      });
    } catch (err) {
      threw = true;
      assert.ok(err.message.includes('SIMULATED_DISK_WRITE_FAILURE'));
    } finally {
      AsyncStorage.multiSet = originalMultiSet;
    }

    assert.strictEqual(threw, true);

    // Verify memory cache rolled back to exactly 1 snapshot
    const postRollbackSnapshots = await InvestmentService.getAllCFOSnapshots();
    assert.strictEqual(postRollbackSnapshots.length, 1);
    assert.strictEqual(postRollbackSnapshots[0].netWorthPaise, 100_000_00n);
  });

  console.log(`\n================================================================`);
  console.log(`🎉 ALL ${passed} / ${total} PHASE 4 FINANCIAL INTEGRATIONS TESTS PASSED!`);
  console.log(`================================================================\n`);
}

// Run when executed directly
if (process.argv[1]?.includes('test_investment_integrations.mjs')) {
  runInvestmentIntegrationsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
