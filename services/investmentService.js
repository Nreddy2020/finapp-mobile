/**
 * @file investmentService.js
 * @description Core service, persistence, serialization, idempotency manager,
 * and atomic double-entry ledger orchestrator for FinLife Investments Module V1 (Phase 1).
 *
 * Invariants & Guarantees:
 * - Lossless BigInt paise and quantity micros string serialization.
 * - Atomic write commits across all 5 keys with rollback on failure (zero partial state).
 * - Multi-attribute idempotency tracking: key, source, reference, type, account, instrument.
 * - Authoritative posting rule: only SETTLED transactions generate journal entries.
 * - Compensating reversal engine: original records remain immutable.
 * - Seed policy: Dev/test fixtures only created via explicit seedDevelopmentFixtures();
 *   production installation starts completely empty.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  QUANTITY_SCALE,
  INSTRUMENT_TYPES,
  INSTRUMENT_STATUS,
  ACCOUNT_TYPES,
  ACCOUNT_STATUS,
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  TAX_LOT_STATUS,
  DEPLETION_METHOD,
  COST_BASIS_STATUS,
  HOLDING_STATUS,
  TAX_POLICY_VERSIONS,
  validateBoundedPaise,
  validateNonNegativePaise,
  validateBoundedQuantityMicros,
  validateInstrumentType,
  validateAccountType,
  validateTransactionType,
  validateTransactionStatus,
  validateIdempotencyKey
} from '../components/investments/investmentContracts.js';

import {
  calculateGrossAmountPaise,
  calculateCashMovement
} from '../components/investments/investmentCalculations.js';

import {
  generateJournalEntries,
  createReversalJournalEntries,
  assertJournalBalanced
} from '../components/investments/investmentLedger.js';

import {
  calculateAcquisitionCost,
  createTaxLot,
  depleteLotsFIFO,
  depleteSpecificLots,
  applyBonusToLots,
  applyStockSplitToLots,
  rejectMergerCorporateAction,
  restoreLotsFromSaleReversal,
  assertCanReversePurchaseLot
} from '../components/investments/investmentTaxLotEngine.js';

import {
  projectHoldingsFromLots,
  reconcileHoldingWithLots
} from '../components/investments/investmentHoldingsEngine.js';

import {
  PRICE_STATUS,
  PRICE_SOURCE,
  PRICE_ADJUSTMENT_TYPE,
  validatePriceStatus,
  validatePriceSource,
  validatePriceAdjustmentType,
  validatePriceQuote
} from '../components/investments/investmentContracts.js';

import {
  calculatePortfolioValuation,
  calculateHoldingValuation,
  reconcileValuationWithHoldings
} from '../components/investments/investmentValuationEngine.js';

import {
  getConsolidatedCFOBalanceSheet
} from '../components/investments/investmentCFOAdapter.js';

export const INVESTMENT_STORAGE_KEYS = Object.freeze({
  INSTRUMENTS: '@finlife_investments_instruments_v1',
  ACCOUNTS: '@finlife_investments_accounts_v1',
  TRANSACTIONS: '@finlife_investments_transactions_v1',
  JOURNAL: '@finlife_investments_journal_v1',
  TAX_LOTS: '@finlife_investments_tax_lots_v1',
  HOLDINGS: '@finlife_investments_holdings_v1',
  IDEMPOTENCY: '@finlife_investments_idempotency_v1',
  PRICE_QUOTES: '@finlife_investments_price_quotes_v1',
  VALUATION_SNAPSHOTS: '@finlife_investments_valuation_snapshots_v1',
  CFO_SNAPSHOTS: '@finlife_investments_cfo_snapshots_v1'
});

export const INVESTMENT_SCHEMA_VERSION = 4;

export class InvestmentService {
  static _instrumentsCache = null;
  static _accountsCache = null;
  static _transactionsCache = null;
  static _journalCache = null;
  static _taxLotsCache = null;
  static _holdingsCache = null;
  static _idempotencyCache = null;
  static _priceQuotesCache = null;
  static _valuationSnapshotsCache = null;
  static _cfoSnapshotsCache = null;

  /**
   * Clears in-memory caches to simulate cold app restart / harness reset.
   */
  static clearMemoryCache() {
    this._instrumentsCache = null;
    this._accountsCache = null;
    this._transactionsCache = null;
    this._journalCache = null;
    this._taxLotsCache = null;
    this._holdingsCache = null;
    this._idempotencyCache = null;
    this._priceQuotesCache = null;
    this._valuationSnapshotsCache = null;
    this._cfoSnapshotsCache = null;
  }

  static async _safeMultiRemove(keys) {
    if (typeof AsyncStorage.multiRemove === 'function') {
      await AsyncStorage.multiRemove(keys);
    } else if (typeof AsyncStorage.removeItem === 'function') {
      await Promise.all(keys.map(k => AsyncStorage.removeItem(k)));
    }
  }

  static async _safeMultiSet(pairs) {
    if (typeof AsyncStorage.multiSet === 'function') {
      await AsyncStorage.multiSet(pairs);
    } else if (typeof AsyncStorage.setItem === 'function') {
      await Promise.all(pairs.map(([k, v]) => AsyncStorage.setItem(k, v)));
    }
  }

  /**
   * Resets all investment storage keys to a clean state across all 10 canonical keys.
   */
  static async resetToCleanState() {
    this.clearMemoryCache();
    await this._safeMultiRemove([
      INVESTMENT_STORAGE_KEYS.INSTRUMENTS,
      INVESTMENT_STORAGE_KEYS.ACCOUNTS,
      INVESTMENT_STORAGE_KEYS.TRANSACTIONS,
      INVESTMENT_STORAGE_KEYS.JOURNAL,
      INVESTMENT_STORAGE_KEYS.TAX_LOTS,
      INVESTMENT_STORAGE_KEYS.HOLDINGS,
      INVESTMENT_STORAGE_KEYS.IDEMPOTENCY,
      INVESTMENT_STORAGE_KEYS.PRICE_QUOTES,
      INVESTMENT_STORAGE_KEYS.VALUATION_SNAPSHOTS,
      INVESTMENT_STORAGE_KEYS.CFO_SNAPSHOTS
    ]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Serialization & Lossless BigInt Hydration
  // ─────────────────────────────────────────────────────────────────────────

  static serializeInstrument(inst) {
    return {
      ...inst,
      schemaVersion: INVESTMENT_SCHEMA_VERSION
    };
  }

  static hydrateInstrument(dto) {
    return {
      ...dto,
      id: String(dto.id || '').trim(),
      instrumentType: validateInstrumentType(dto.instrumentType),
      name: String(dto.name || '').trim(),
      status: dto.status || INSTRUMENT_STATUS.ACTIVE
    };
  }

  static serializeAccount(acc) {
    return {
      ...acc,
      schemaVersion: INVESTMENT_SCHEMA_VERSION
    };
  }

  static hydrateAccount(dto) {
    return {
      ...dto,
      id: String(dto.id || '').trim(),
      name: String(dto.name || '').trim(),
      accountType: validateAccountType(dto.accountType),
      status: dto.status || ACCOUNT_STATUS.ACTIVE
    };
  }

  static serializeTransaction(tx) {
    return {
      ...tx,
      schemaVersion: INVESTMENT_SCHEMA_VERSION,
      quantityMicros: tx.quantityMicros != null ? tx.quantityMicros.toString() : '0',
      pricePaise: tx.pricePaise != null ? tx.pricePaise.toString() : '0',
      grossAmountPaise: tx.grossAmountPaise != null ? tx.grossAmountPaise.toString() : '0',
      feesPaise: tx.feesPaise != null ? tx.feesPaise.toString() : '0',
      taxesPaise: tx.taxesPaise != null ? tx.taxesPaise.toString() : '0',
      netCashAmountPaise: tx.netCashAmountPaise != null ? tx.netCashAmountPaise.toString() : '0',
      realizedGainLossPaise: tx.realizedGainLossPaise != null ? tx.realizedGainLossPaise.toString() : null,
      depletionRecords: Array.isArray(tx.depletionRecords)
        ? tx.depletionRecords.map(d => ({
            ...d,
            depletedQuantityMicros: d.depletedQuantityMicros != null ? d.depletedQuantityMicros.toString() : '0',
            depletedCostBasisPaise: d.depletedCostBasisPaise != null ? d.depletedCostBasisPaise.toString() : null,
            previousLotRemainingQty: d.previousLotRemainingQty != null ? d.previousLotRemainingQty.toString() : '0',
            previousLotRemainingBasis: d.previousLotRemainingBasis != null ? d.previousLotRemainingBasis.toString() : null
          }))
        : []
    };
  }

  static hydrateTransaction(dto) {
    return {
      ...dto,
      id: String(dto.id || '').trim(),
      accountId: String(dto.accountId || '').trim(),
      instrumentId: String(dto.instrumentId || '').trim(),
      transactionType: validateTransactionType(dto.transactionType),
      status: validateTransactionStatus(dto.status),
      quantityMicros: validateBoundedQuantityMicros(BigInt(dto.quantityMicros ?? '0'), 'quantityMicros'),
      pricePaise: validateNonNegativePaise(BigInt(dto.pricePaise ?? '0'), 'pricePaise'),
      grossAmountPaise: validateNonNegativePaise(BigInt(dto.grossAmountPaise ?? '0'), 'grossAmountPaise'),
      feesPaise: validateNonNegativePaise(BigInt(dto.feesPaise ?? '0'), 'feesPaise'),
      taxesPaise: validateNonNegativePaise(BigInt(dto.taxesPaise ?? '0'), 'taxesPaise'),
      netCashAmountPaise: validateNonNegativePaise(BigInt(dto.netCashAmountPaise ?? '0'), 'netCashAmountPaise'),
      realizedGainLossPaise: dto.realizedGainLossPaise != null ? validateBoundedPaise(BigInt(dto.realizedGainLossPaise), 'realizedGainLossPaise') : null,
      depletionRecords: Array.isArray(dto.depletionRecords)
        ? dto.depletionRecords.map(d => ({
            ...d,
            depletedQuantityMicros: validateBoundedQuantityMicros(BigInt(d.depletedQuantityMicros ?? '0'), 'depletedQuantityMicros'),
            depletedCostBasisPaise: d.depletedCostBasisPaise != null ? validateNonNegativePaise(BigInt(d.depletedCostBasisPaise), 'depletedCostBasisPaise') : null,
            previousLotRemainingQty: validateBoundedQuantityMicros(BigInt(d.previousLotRemainingQty ?? '0'), 'previousLotRemainingQty'),
            previousLotRemainingBasis: d.previousLotRemainingBasis != null ? validateNonNegativePaise(BigInt(d.previousLotRemainingBasis), 'previousLotRemainingBasis') : null
          }))
        : []
    };
  }

  static serializeJournalEntry(entry) {
    return {
      ...entry,
      debitPaise: entry.debitPaise != null ? entry.debitPaise.toString() : '0',
      creditPaise: entry.creditPaise != null ? entry.creditPaise.toString() : '0'
    };
  }

  static hydrateJournalEntry(dto) {
    return {
      ...dto,
      debitPaise: validateNonNegativePaise(BigInt(dto.debitPaise ?? '0'), 'debitPaise'),
      creditPaise: validateNonNegativePaise(BigInt(dto.creditPaise ?? '0'), 'creditPaise')
    };
  }

  static serializeTaxLot(lot) {
    return {
      ...lot,
      schemaVersion: INVESTMENT_SCHEMA_VERSION,
      initialQuantityMicros: lot.initialQuantityMicros != null ? lot.initialQuantityMicros.toString() : '0',
      remainingQuantityMicros: lot.remainingQuantityMicros != null ? lot.remainingQuantityMicros.toString() : '0',
      initialCostBasisPaise: lot.initialCostBasisPaise != null ? lot.initialCostBasisPaise.toString() : null,
      remainingCostBasisPaise: lot.remainingCostBasisPaise != null ? lot.remainingCostBasisPaise.toString() : null
    };
  }

  static hydrateTaxLot(dto) {
    return {
      ...dto,
      id: String(dto.id || '').trim(),
      transactionId: String(dto.transactionId || '').trim(),
      accountId: String(dto.accountId || '').trim(),
      instrumentId: String(dto.instrumentId || '').trim(),
      initialQuantityMicros: validateBoundedQuantityMicros(BigInt(dto.initialQuantityMicros ?? '0'), 'initialQuantityMicros'),
      remainingQuantityMicros: validateBoundedQuantityMicros(BigInt(dto.remainingQuantityMicros ?? '0'), 'remainingQuantityMicros'),
      initialCostBasisPaise: dto.initialCostBasisPaise != null ? validateNonNegativePaise(BigInt(dto.initialCostBasisPaise), 'initialCostBasisPaise') : null,
      remainingCostBasisPaise: dto.remainingCostBasisPaise != null ? validateNonNegativePaise(BigInt(dto.remainingCostBasisPaise), 'remainingCostBasisPaise') : null,
      status: dto.status || TAX_LOT_STATUS.OPEN,
      costBasisStatus: dto.costBasisStatus || COST_BASIS_STATUS.AVAILABLE
    };
  }

  static serializeHolding(h) {
    return {
      ...h,
      schemaVersion: INVESTMENT_SCHEMA_VERSION,
      totalQuantityMicros: h.totalQuantityMicros != null ? h.totalQuantityMicros.toString() : '0',
      totalCostBasisPaise: h.totalCostBasisPaise != null ? h.totalCostBasisPaise.toString() : null,
      averageCostPerUnitPaise: h.averageCostPerUnitPaise != null ? h.averageCostPerUnitPaise.toString() : null
    };
  }

  static hydrateHolding(dto) {
    return {
      ...dto,
      id: String(dto.id || '').trim(),
      accountId: String(dto.accountId || '').trim(),
      instrumentId: String(dto.instrumentId || '').trim(),
      totalQuantityMicros: validateBoundedQuantityMicros(BigInt(dto.totalQuantityMicros ?? '0'), 'totalQuantityMicros'),
      totalCostBasisPaise: dto.totalCostBasisPaise != null ? validateNonNegativePaise(BigInt(dto.totalCostBasisPaise), 'totalCostBasisPaise') : null,
      averageCostPerUnitPaise: dto.averageCostPerUnitPaise != null ? validateBoundedPaise(BigInt(dto.averageCostPerUnitPaise), 'averageCostPerUnitPaise') : null,
      costBasisStatus: dto.costBasisStatus || COST_BASIS_STATUS.AVAILABLE,
      status: dto.status || HOLDING_STATUS.ACTIVE
    };
  }

  static serializePriceQuote(q) {
    return {
      ...q,
      schemaVersion: INVESTMENT_SCHEMA_VERSION,
      pricePaise: q.pricePaise != null ? q.pricePaise.toString() : '0'
    };
  }

  static hydratePriceQuote(dto) {
    return {
      ...dto,
      id: String(dto.id || '').trim(),
      instrumentId: String(dto.instrumentId || '').trim(),
      pricePaise: validateNonNegativePaise(BigInt(dto.pricePaise ?? '0'), 'pricePaise'),
      source: validatePriceSource(dto.source),
      status: dto.status ? validatePriceStatus(dto.status) : PRICE_STATUS.AVAILABLE,
      adjustmentType: dto.adjustmentType ? validatePriceAdjustmentType(dto.adjustmentType) : PRICE_ADJUSTMENT_TYPE.RAW,
      asOfTimestamp: String(dto.asOfTimestamp || '').trim()
    };
  }

  static serializeValuationSnapshot(snap) {
    return {
      ...snap,
      schemaVersion: INVESTMENT_SCHEMA_VERSION,
      totalCostBasisPaise: snap.totalCostBasisPaise != null ? snap.totalCostBasisPaise.toString() : null,
      totalMarketValuePaise: snap.totalMarketValuePaise != null ? snap.totalMarketValuePaise.toString() : null,
      totalUnrealizedGainLossPaise: snap.totalUnrealizedGainLossPaise != null ? snap.totalUnrealizedGainLossPaise.toString() : null,
      aggregateUnrealizedBps: snap.aggregateUnrealizedBps != null ? snap.aggregateUnrealizedBps.toString() : null,
      holdings: Array.isArray(snap.holdings)
        ? snap.holdings.map(h => ({
            ...h,
            quantityMicros: h.quantityMicros != null ? h.quantityMicros.toString() : '0',
            costBasisPaise: h.costBasisPaise != null ? h.costBasisPaise.toString() : null,
            marketPricePaise: h.marketPricePaise != null ? h.marketPricePaise.toString() : null,
            marketValuePaise: h.marketValuePaise != null ? h.marketValuePaise.toString() : null,
            unrealizedGainLossPaise: h.unrealizedGainLossPaise != null ? h.unrealizedGainLossPaise.toString() : null,
            unrealizedGainLossBps: h.unrealizedGainLossBps != null ? h.unrealizedGainLossBps.toString() : null
          }))
        : []
    };
  }

  static hydrateValuationSnapshot(dto) {
    return {
      ...dto,
      id: String(dto.id || '').trim(),
      asOfDate: String(dto.asOfDate || '').trim(),
      valuationTimestamp: String(dto.valuationTimestamp || '').trim(),
      totalCostBasisPaise: dto.totalCostBasisPaise != null ? validateBoundedPaise(BigInt(dto.totalCostBasisPaise)) : null,
      totalMarketValuePaise: dto.totalMarketValuePaise != null ? validateBoundedPaise(BigInt(dto.totalMarketValuePaise)) : null,
      totalUnrealizedGainLossPaise: dto.totalUnrealizedGainLossPaise != null ? validateBoundedPaise(BigInt(dto.totalUnrealizedGainLossPaise)) : null,
      aggregateUnrealizedBps: dto.aggregateUnrealizedBps != null ? BigInt(dto.aggregateUnrealizedBps) : null,
      holdings: Array.isArray(dto.holdings)
        ? dto.holdings.map(h => ({
            ...h,
            quantityMicros: validateBoundedQuantityMicros(BigInt(h.quantityMicros ?? '0')),
            costBasisPaise: h.costBasisPaise != null ? validateBoundedPaise(BigInt(h.costBasisPaise)) : null,
            marketPricePaise: h.marketPricePaise != null ? validateNonNegativePaise(BigInt(h.marketPricePaise)) : null,
            marketValuePaise: h.marketValuePaise != null ? validateBoundedPaise(BigInt(h.marketValuePaise)) : null,
            unrealizedGainLossPaise: h.unrealizedGainLossPaise != null ? validateBoundedPaise(BigInt(h.unrealizedGainLossPaise)) : null,
            unrealizedGainLossBps: h.unrealizedGainLossBps != null ? BigInt(h.unrealizedGainLossBps) : null
          }))
        : []
    };
  }

  static serializeCFOSnapshot(snap) {
    return {
      ...snap,
      schemaVersion: INVESTMENT_SCHEMA_VERSION,
      personalBps: snap.personalBps != null ? snap.personalBps.toString() : null,
      assetsBreakdown: snap.assetsBreakdown
        ? {
            liquidCashPaise: snap.assetsBreakdown.liquidCashPaise != null ? snap.assetsBreakdown.liquidCashPaise.toString() : null,
            investmentsPaise: snap.assetsBreakdown.investmentsPaise != null ? snap.assetsBreakdown.investmentsPaise.toString() : null,
            physicalAssetsPaise: snap.assetsBreakdown.physicalAssetsPaise != null ? snap.assetsBreakdown.physicalAssetsPaise.toString() : null,
            propertiesPaise: snap.assetsBreakdown.propertiesPaise != null ? snap.assetsBreakdown.propertiesPaise.toString() : null,
            p2pReceivablesPaise: snap.assetsBreakdown.p2pReceivablesPaise != null ? snap.assetsBreakdown.p2pReceivablesPaise.toString() : null,
            totalAssetsPaise: snap.assetsBreakdown.totalAssetsPaise != null ? snap.assetsBreakdown.totalAssetsPaise.toString() : null
          }
        : null,
      liabilitiesBreakdown: snap.liabilitiesBreakdown
        ? {
            formalDebtPaise: snap.liabilitiesBreakdown.formalDebtPaise != null ? snap.liabilitiesBreakdown.formalDebtPaise.toString() : null,
            p2pPayablesPaise: snap.liabilitiesBreakdown.p2pPayablesPaise != null ? snap.liabilitiesBreakdown.p2pPayablesPaise.toString() : null,
            propertyMortgagesPaise: snap.liabilitiesBreakdown.propertyMortgagesPaise != null ? snap.liabilitiesBreakdown.propertyMortgagesPaise.toString() : null,
            totalLiabilitiesPaise: snap.liabilitiesBreakdown.totalLiabilitiesPaise != null ? snap.liabilitiesBreakdown.totalLiabilitiesPaise.toString() : null
          }
        : null,
      netWorthPaise: snap.netWorthPaise != null ? snap.netWorthPaise.toString() : null,
      personalNetWorthPaise: snap.personalNetWorthPaise != null ? snap.personalNetWorthPaise.toString() : null,
      familyNetWorthPaise: snap.familyNetWorthPaise != null ? snap.familyNetWorthPaise.toString() : null
    };
  }

  static hydrateCFOSnapshot(dto) {
    return {
      ...dto,
      id: String(dto.id || dto.snapshotId || '').trim(),
      snapshotId: String(dto.snapshotId || dto.id || '').trim(),
      asOfDate: String(dto.asOfDate || '').trim(),
      personalBps: dto.personalBps != null ? BigInt(dto.personalBps) : 10000n,
      assetsBreakdown: dto.assetsBreakdown
        ? {
            liquidCashPaise: dto.assetsBreakdown.liquidCashPaise != null ? validateNonNegativePaise(BigInt(dto.assetsBreakdown.liquidCashPaise)) : null,
            investmentsPaise: dto.assetsBreakdown.investmentsPaise != null ? validateBoundedPaise(BigInt(dto.assetsBreakdown.investmentsPaise)) : null,
            physicalAssetsPaise: dto.assetsBreakdown.physicalAssetsPaise != null ? validateNonNegativePaise(BigInt(dto.assetsBreakdown.physicalAssetsPaise)) : null,
            propertiesPaise: dto.assetsBreakdown.propertiesPaise != null ? validateNonNegativePaise(BigInt(dto.assetsBreakdown.propertiesPaise)) : null,
            p2pReceivablesPaise: dto.assetsBreakdown.p2pReceivablesPaise != null ? validateNonNegativePaise(BigInt(dto.assetsBreakdown.p2pReceivablesPaise)) : null,
            totalAssetsPaise: dto.assetsBreakdown.totalAssetsPaise != null ? validateBoundedPaise(BigInt(dto.assetsBreakdown.totalAssetsPaise)) : null
          }
        : null,
      liabilitiesBreakdown: dto.liabilitiesBreakdown
        ? {
            formalDebtPaise: dto.liabilitiesBreakdown.formalDebtPaise != null ? validateNonNegativePaise(BigInt(dto.liabilitiesBreakdown.formalDebtPaise)) : null,
            p2pPayablesPaise: dto.liabilitiesBreakdown.p2pPayablesPaise != null ? validateNonNegativePaise(BigInt(dto.liabilitiesBreakdown.p2pPayablesPaise)) : 0n,
            propertyMortgagesPaise: dto.liabilitiesBreakdown.propertyMortgagesPaise != null ? validateNonNegativePaise(BigInt(dto.liabilitiesBreakdown.propertyMortgagesPaise)) : 0n,
            totalLiabilitiesPaise: dto.liabilitiesBreakdown.totalLiabilitiesPaise != null ? validateBoundedPaise(BigInt(dto.liabilitiesBreakdown.totalLiabilitiesPaise)) : null
          }
        : null,
      netWorthPaise: dto.netWorthPaise != null ? validateBoundedPaise(BigInt(dto.netWorthPaise)) : null,
      personalNetWorthPaise: dto.personalNetWorthPaise != null ? validateBoundedPaise(BigInt(dto.personalNetWorthPaise)) : null,
      familyNetWorthPaise: dto.familyNetWorthPaise != null ? validateBoundedPaise(BigInt(dto.familyNetWorthPaise)) : null
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Cache Loading Pipeline
  // ─────────────────────────────────────────────────────────────────────────

  static async _ensureLoaded() {
    if (
      this._instrumentsCache !== null &&
      this._accountsCache !== null &&
      this._transactionsCache !== null &&
      this._journalCache !== null &&
      this._taxLotsCache !== null &&
      this._holdingsCache !== null &&
      this._idempotencyCache !== null &&
      this._priceQuotesCache !== null &&
      this._valuationSnapshotsCache !== null &&
      this._cfoSnapshotsCache !== null
    ) {
      return;
    }

    const [instRaw, accRaw, txRaw, jRaw, lotRaw, hldRaw, idempRaw, quotesRaw, snapRaw, cfoRaw] = await Promise.all([
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.INSTRUMENTS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.ACCOUNTS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.TRANSACTIONS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.JOURNAL),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.TAX_LOTS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.HOLDINGS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.IDEMPOTENCY),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.PRICE_QUOTES),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.VALUATION_SNAPSHOTS),
      AsyncStorage.getItem(INVESTMENT_STORAGE_KEYS.CFO_SNAPSHOTS)
    ]);

    this._instrumentsCache = instRaw ? JSON.parse(instRaw).map(d => this.hydrateInstrument(d)) : [];
    this._accountsCache = accRaw ? JSON.parse(accRaw).map(d => this.hydrateAccount(d)) : [];
    this._transactionsCache = txRaw ? JSON.parse(txRaw).map(d => this.hydrateTransaction(d)) : [];
    this._journalCache = jRaw ? JSON.parse(jRaw).map(d => this.hydrateJournalEntry(d)) : [];
    this._taxLotsCache = lotRaw ? JSON.parse(lotRaw).map(d => this.hydrateTaxLot(d)) : [];
    this._idempotencyCache = idempRaw ? JSON.parse(idempRaw) : {};
    this._priceQuotesCache = quotesRaw ? JSON.parse(quotesRaw).map(q => this.hydratePriceQuote(q)) : [];
    try {
      this._valuationSnapshotsCache = snapRaw ? JSON.parse(snapRaw).map(s => this.hydrateValuationSnapshot(s)) : [];
    } catch {
      // Valuation snapshots are derived cache: auto-reset on corruption to allow authoritative recalculation
      this._valuationSnapshotsCache = [];
    }
    try {
      this._cfoSnapshotsCache = cfoRaw ? JSON.parse(cfoRaw).map(s => this.hydrateCFOSnapshot(s)) : [];
    } catch {
      // CFO snapshots are derived cache: auto-reset on corruption to allow authoritative recalculation
      this._cfoSnapshotsCache = [];
    }

    // Derived holdings: Rebuild from authoritative tax lots to ensure resilience against cache drift/corruption
    this._holdingsCache = projectHoldingsFromLots({
      lots: this._taxLotsCache,
      accounts: this._accountsCache,
      instruments: this._instrumentsCache
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Atomic Commitment Pipeline across all 10 Canonical Keys
  // ─────────────────────────────────────────────────────────────────────────

  static async _commitState(
    newInst,
    newAcc,
    newTx,
    newJournal,
    newLots,
    newHoldings,
    newIdemp,
    arg8,
    arg9,
    arg10,
    arg11
  ) {
    let newQuotes = this._priceQuotesCache || [];
    let newSnapshots = this._valuationSnapshotsCache || [];
    let newCfoSnapshots = this._cfoSnapshotsCache || [];
    let snapshot;

    if (arg11 !== undefined) {
      newQuotes = arg8;
      newSnapshots = arg9;
      newCfoSnapshots = arg10;
      snapshot = arg11;
    } else if (arg10 !== undefined) {
      newQuotes = arg8;
      newSnapshots = arg9;
      newCfoSnapshots = this._cfoSnapshotsCache || [];
      snapshot = arg10;
    } else if (arg9 !== undefined) {
      newQuotes = arg8;
      newSnapshots = this._valuationSnapshotsCache || [];
      newCfoSnapshots = this._cfoSnapshotsCache || [];
      snapshot = arg9;
    } else {
      newQuotes = this._priceQuotesCache || [];
      newSnapshots = this._valuationSnapshotsCache || [];
      newCfoSnapshots = this._cfoSnapshotsCache || [];
      snapshot = arg8;
    }

    const serializedInst = JSON.stringify(newInst.map(i => this.serializeInstrument(i)));
    const serializedAcc = JSON.stringify(newAcc.map(a => this.serializeAccount(a)));
    const serializedTx = JSON.stringify(newTx.map(t => this.serializeTransaction(t)));
    const serializedJournal = JSON.stringify(newJournal.map(j => this.serializeJournalEntry(j)));
    const serializedLots = JSON.stringify(newLots.map(l => this.serializeTaxLot(l)));
    const serializedHoldings = JSON.stringify(newHoldings.map(h => this.serializeHolding(h)));
    const serializedIdemp = JSON.stringify(newIdemp);
    const serializedQuotes = JSON.stringify(newQuotes.map(q => this.serializePriceQuote(q)));
    const serializedSnapshots = JSON.stringify(newSnapshots.map(s => this.serializeValuationSnapshot(s)));
    const serializedCfoSnapshots = JSON.stringify(newCfoSnapshots.map(s => this.serializeCFOSnapshot(s)));

    try {
      await this._safeMultiSet([
        [INVESTMENT_STORAGE_KEYS.INSTRUMENTS, serializedInst],
        [INVESTMENT_STORAGE_KEYS.ACCOUNTS, serializedAcc],
        [INVESTMENT_STORAGE_KEYS.TRANSACTIONS, serializedTx],
        [INVESTMENT_STORAGE_KEYS.JOURNAL, serializedJournal],
        [INVESTMENT_STORAGE_KEYS.TAX_LOTS, serializedLots],
        [INVESTMENT_STORAGE_KEYS.HOLDINGS, serializedHoldings],
        [INVESTMENT_STORAGE_KEYS.IDEMPOTENCY, serializedIdemp],
        [INVESTMENT_STORAGE_KEYS.PRICE_QUOTES, serializedQuotes],
        [INVESTMENT_STORAGE_KEYS.VALUATION_SNAPSHOTS, serializedSnapshots],
        [INVESTMENT_STORAGE_KEYS.CFO_SNAPSHOTS, serializedCfoSnapshots]
      ]);

      this._instrumentsCache = newInst;
      this._accountsCache = newAcc;
      this._transactionsCache = newTx;
      this._journalCache = newJournal;
      this._taxLotsCache = newLots;
      this._holdingsCache = newHoldings;
      this._idempotencyCache = newIdemp;
      this._priceQuotesCache = newQuotes;
      this._valuationSnapshotsCache = newSnapshots;
      this._cfoSnapshotsCache = newCfoSnapshots;
    } catch (writeErr) {
      // Memory cache rollback on failure across all 10 canonical keys
      this._instrumentsCache = snapshot.instruments;
      this._accountsCache = snapshot.accounts;
      this._transactionsCache = snapshot.transactions;
      this._journalCache = snapshot.journal;
      this._taxLotsCache = snapshot.taxLots;
      this._holdingsCache = snapshot.holdings;
      this._idempotencyCache = snapshot.idempotency;
      this._priceQuotesCache = snapshot.priceQuotes || [];
      this._valuationSnapshotsCache = snapshot.valuationSnapshots || [];
      this._cfoSnapshotsCache = snapshot.cfoSnapshots || [];
      throw new Error(`[InvestmentService] Atomic write commit failed: ${writeErr.message}`);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Public Business Operations
  // ─────────────────────────────────────────────────────────────────────────

  static async addInstrument(instrumentInput) {
    await this._ensureLoaded();
    const id = String(instrumentInput.id || `inst_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();

    if (this._instrumentsCache.some(i => i.id === id)) {
      throw new Error(`Instrument with ID '${id}' already exists`);
    }

    const instrument = {
      id,
      instrumentType: validateInstrumentType(instrumentInput.instrumentType),
      name: String(instrumentInput.name || 'Untitled Instrument').trim(),
      symbol: instrumentInput.symbol ? String(instrumentInput.symbol).trim() : null,
      isin: instrumentInput.isin ? String(instrumentInput.isin).trim() : null,
      exchange: instrumentInput.exchange || null,
      currency: instrumentInput.currency || 'INR',
      assetClass: instrumentInput.assetClass || 'EQUITY',
      issuer: instrumentInput.issuer || null,
      riskCategory: instrumentInput.riskCategory || 'MODERATE',
      status: instrumentInput.status || INSTRUMENT_STATUS.ACTIVE,
      metadata: instrumentInput.metadata || {},
      createdAt: new Date().toISOString()
    };

    const snapshot = {
      instruments: [...this._instrumentsCache],
      accounts: [...this._accountsCache],
      transactions: [...this._transactionsCache],
      journal: [...this._journalCache],
      taxLots: [...this._taxLotsCache],
      holdings: [...this._holdingsCache],
      idempotency: { ...this._idempotencyCache },
      priceQuotes: [...(this._priceQuotesCache || [])],
      valuationSnapshots: [...(this._valuationSnapshotsCache || [])]
    };

    const nextInst = [instrument, ...this._instrumentsCache];
    await this._commitState(
      nextInst,
      this._accountsCache,
      this._transactionsCache,
      this._journalCache,
      this._taxLotsCache,
      this._holdingsCache,
      this._idempotencyCache,
      snapshot
    );
    return instrument;
  }

  static async getInstrument(id) {
    await this._ensureLoaded();
    const found = this._instrumentsCache.find(i => i.id === id);
    return found ? { ...found } : null;
  }

  static async getAllInstruments() {
    await this._ensureLoaded();
    return [...this._instrumentsCache];
  }

  static async getInstruments() {
    return this.getAllInstruments();
  }

  static async addAccount(accountInput) {
    await this._ensureLoaded();
    const id = String(accountInput.id || `acc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();

    if (this._accountsCache.some(a => a.id === id)) {
      throw new Error(`Account with ID '${id}' already exists`);
    }

    const account = {
      id,
      name: String(accountInput.name || 'Investment Account').trim(),
      provider: accountInput.provider ? String(accountInput.provider).trim() : 'Self',
      accountType: validateAccountType(accountInput.accountType || ACCOUNT_TYPES.DEMAT),
      ownerId: accountInput.ownerId || 'self',
      ownershipType: accountInput.ownershipType || 'INDIVIDUAL_SELF',
      status: accountInput.status || ACCOUNT_STATUS.ACTIVE,
      metadata: accountInput.metadata || {},
      createdAt: new Date().toISOString()
    };

    const snapshot = {
      instruments: [...this._instrumentsCache],
      accounts: [...this._accountsCache],
      transactions: [...this._transactionsCache],
      journal: [...this._journalCache],
      taxLots: [...this._taxLotsCache],
      holdings: [...this._holdingsCache],
      idempotency: { ...this._idempotencyCache },
      priceQuotes: [...(this._priceQuotesCache || [])],
      valuationSnapshots: [...(this._valuationSnapshotsCache || [])]
    };

    const nextAcc = [account, ...this._accountsCache];
    await this._commitState(
      this._instrumentsCache,
      nextAcc,
      this._transactionsCache,
      this._journalCache,
      this._taxLotsCache,
      this._holdingsCache,
      this._idempotencyCache,
      snapshot
    );
    return account;
  }

  static async getAccount(id) {
    await this._ensureLoaded();
    const found = this._accountsCache.find(a => a.id === id);
    return found ? { ...found } : null;
  }

  static async getAllAccounts() {
    await this._ensureLoaded();
    return [...this._accountsCache];
  }

  static async getAccounts() {
    return this.getAllAccounts();
  }

  /**
   * Records an investment transaction atomically and posts double-entry journal entries.
   *
   * @param {Object} txInput
   * @param {string} [idempotencyKey]
   * @returns {Promise<{ transaction: Object, journalEntries: Array<Object>, isReplay: boolean }>}
   */
  static async recordTransaction(txInput, idempotencyKey = null) {
    await this._ensureLoaded();

    // Idempotency check across cold restart
    if (idempotencyKey) {
      const validatedKey = validateIdempotencyKey(idempotencyKey);
      if (this._idempotencyCache[validatedKey]) {
        const cached = this._idempotencyCache[validatedKey];
        const existingTx = this._transactionsCache.find(t => t.id === cached.transactionId);
        const existingJournal = this._journalCache.filter(j => j.transactionId === cached.transactionId);
        return {
          transaction: existingTx,
          journalEntries: existingJournal,
          isReplay: true
        };
      }
    }

    const accountId = String(txInput.accountId || '').trim();
    const instrumentId = String(txInput.instrumentId || '').trim();

    if (!this._accountsCache.some(a => a.id === accountId)) {
      throw new Error(`Account '${accountId}' does not exist`);
    }
    if (!this._instrumentsCache.some(i => i.id === instrumentId)) {
      throw new Error(`Instrument '${instrumentId}' does not exist`);
    }

    const transactionType = validateTransactionType(txInput.transactionType);
    const status = validateTransactionStatus(txInput.status || TRANSACTION_STATUS.SETTLED);

    // Explicitly reject MERGER corporate actions in V1
    if (transactionType === TRANSACTION_TYPES.MERGER) {
      rejectMergerCorporateAction();
    }

    const quantityMicros = validateBoundedQuantityMicros(BigInt(txInput.quantityMicros ?? '0'), 'quantityMicros');
    const pricePaise = validateNonNegativePaise(BigInt(txInput.pricePaise ?? '0'), 'pricePaise');

    // Deterministic half-up gross calculation if not manually provided
    const grossAmountPaise = txInput.grossAmountPaise != null
      ? validateNonNegativePaise(BigInt(txInput.grossAmountPaise), 'grossAmountPaise')
      : calculateGrossAmountPaise(quantityMicros, pricePaise);

    const feesPaise = validateNonNegativePaise(BigInt(txInput.feesPaise ?? '0'), 'feesPaise');
    const taxesPaise = validateNonNegativePaise(BigInt(txInput.taxesPaise ?? '0'), 'taxesPaise');

    const cashMovement = calculateCashMovement({
      transactionType,
      grossPaise: grossAmountPaise,
      feesPaise,
      taxesPaise
    });

    const txId = String(txInput.id || `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();

    if (this._transactionsCache.some(t => t.id === txId)) {
      throw new Error(`Transaction with ID '${txId}' already exists`);
    }

    let updatedLots = [...this._taxLotsCache];
    let depletionRecords = [];
    let realizedGainLossPaise = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Tax Lot Engine Execution (Only when SETTLED)
    // ─────────────────────────────────────────────────────────────────────────
    if (status === TRANSACTION_STATUS.SETTLED) {
      switch (transactionType) {
        case TRANSACTION_TYPES.BUY:
        case TRANSACTION_TYPES.SIP_PURCHASE: {
          if (quantityMicros <= 0n) {
            throw new RangeError(`Purchase quantity must be strictly positive: ${quantityMicros.toString()}`);
          }

          const taxCost = calculateAcquisitionCost({
            purchaseAmountPaise: grossAmountPaise,
            eligibleAcquisitionExpensesPaise: feesPaise + taxesPaise,
            excludedTransactionTaxesPaise: 0n,
            taxPolicyVersion: txInput.taxPolicyVersion || TAX_POLICY_VERSIONS.IN_IT_ACT_V1
          });

          const lot = createTaxLot({
            transactionId: txId,
            accountId,
            instrumentId,
            acquisitionDate: txInput.transactionDate || new Date().toISOString().split('T')[0],
            quantityMicros,
            costBasisPaise: taxCost.taxAcquisitionCostPaise,
            taxPolicyVersion: taxCost.taxPolicyVersion,
            costBasisStatus: txInput.costBasisStatus || COST_BASIS_STATUS.AVAILABLE,
            metadata: txInput.metadata || {}
          });

          updatedLots = [lot, ...updatedLots];
          break;
        }

        case TRANSACTION_TYPES.SELL:
        case TRANSACTION_TYPES.REDEMPTION:
        case TRANSACTION_TYPES.MATURITY: {
          if (quantityMicros <= 0n) {
            throw new RangeError(`Sale quantity must be strictly positive: ${quantityMicros.toString()}`);
          }

          const relevantLots = updatedLots.filter(
            l => l.accountId === accountId && l.instrumentId === instrumentId
          );

          if (txInput.depletionMethod === DEPLETION_METHOD.SPECIFIC_LOT) {
            const res = depleteSpecificLots({
              availableLots: relevantLots,
              specificAllocations: txInput.specificAllocations,
              sellProceedsPaise: cashMovement.netCashAmountPaise,
              sellTransactionId: txId,
              accountId,
              instrumentId
            });
            depletionRecords = res.depletionRecords;
            realizedGainLossPaise = res.realizedGainLossPaise;
            updatedLots = updatedLots.map(l => res.updatedLots.find(u => u.id === l.id) || l);
          } else {
            // Default FIFO depletion
            const res = depleteLotsFIFO({
              availableLots: relevantLots,
              sellQuantityMicros: quantityMicros,
              sellProceedsPaise: cashMovement.netCashAmountPaise,
              sellTransactionId: txId
            });
            depletionRecords = res.depletionRecords;
            realizedGainLossPaise = res.realizedGainLossPaise;
            updatedLots = updatedLots.map(l => res.updatedLots.find(u => u.id === l.id) || l);
          }
          break;
        }

        case TRANSACTION_TYPES.BONUS: {
          if (quantityMicros <= 0n) {
            throw new RangeError(`Bonus quantity must be strictly positive: ${quantityMicros.toString()}`);
          }
          const relevantLots = updatedLots.filter(
            l => l.accountId === accountId && l.instrumentId === instrumentId
          );
          const res = applyBonusToLots({
            activeLots: relevantLots,
            bonusQuantityMicros: quantityMicros,
            allotmentDate: txInput.transactionDate || new Date().toISOString().split('T')[0],
            corporateActionTxId: txId,
            accountId,
            instrumentId
          });
          updatedLots = [res.newBonusLot, ...updatedLots];
          break;
        }

        case TRANSACTION_TYPES.STOCK_SPLIT: {
          const num = txInput.metadata?.splitNumerator || txInput.splitNumerator;
          const den = txInput.metadata?.splitDenominator || txInput.splitDenominator;
          if (!num || !den) {
            throw new RangeError('Stock split requires splitNumerator and splitDenominator in metadata');
          }
          const relevantLots = updatedLots.filter(
            l => l.accountId === accountId && l.instrumentId === instrumentId
          );
          const res = applyStockSplitToLots({
            activeLots: relevantLots,
            numerator: num,
            denominator: den,
            corporateActionTxId: txId
          });
          updatedLots = updatedLots.map(l => res.updatedLots.find(u => u.id === l.id) || l);
          break;
        }

        default:
          break;
      }
    }

    const transaction = {
      id: txId,
      accountId,
      instrumentId,
      transactionType,
      status,
      quantityMicros,
      pricePaise,
      grossAmountPaise,
      feesPaise,
      taxesPaise,
      netCashAmountPaise: cashMovement.netCashAmountPaise,
      cashDirection: cashMovement.direction,
      transactionDate: txInput.transactionDate || new Date().toISOString().split('T')[0],
      settlementDate: txInput.settlementDate || txInput.transactionDate || new Date().toISOString().split('T')[0],
      source: txInput.source || 'MANUAL',
      sourceReference: txInput.sourceReference || null,
      bankingTransactionId: txInput.bankingTransactionId || null,
      depletionMethod: txInput.depletionMethod || (transactionType === TRANSACTION_TYPES.SELL ? DEPLETION_METHOD.FIFO : null),
      depletionRecords,
      realizedGainLossPaise,
      metadata: txInput.metadata || {},
      createdAt: new Date().toISOString()
    };

    // Authoritative posting rule: only SETTLED transactions generate journal entries
    const newJournalEntries = status === TRANSACTION_STATUS.SETTLED
      ? generateJournalEntries(transaction)
      : [];

    if (newJournalEntries.length > 0) {
      assertJournalBalanced(newJournalEntries);
    }

    // Rebuild derived holdings projection
    const nextHoldings = projectHoldingsFromLots({
      lots: updatedLots,
      accounts: this._accountsCache,
      instruments: this._instrumentsCache
    });

    // Strictly reconcile each holding
    for (const h of nextHoldings) {
      const lotsForH = updatedLots.filter(l => l.accountId === h.accountId && l.instrumentId === h.instrumentId);
      reconcileHoldingWithLots(h, lotsForH);
    }

    const nextTransactions = [transaction, ...this._transactionsCache];
    const nextJournal = [...newJournalEntries, ...this._journalCache];
    const nextIdemp = { ...this._idempotencyCache };

    if (idempotencyKey) {
      nextIdemp[idempotencyKey.trim()] = {
        transactionId: txId,
        source: transaction.source,
        sourceReference: transaction.sourceReference,
        transactionType: transaction.transactionType,
        accountId: transaction.accountId,
        instrumentId: transaction.instrumentId,
        timestamp: new Date().toISOString()
      };
    }

    const snapshot = {
      instruments: [...this._instrumentsCache],
      accounts: [...this._accountsCache],
      transactions: [...this._transactionsCache],
      journal: [...this._journalCache],
      taxLots: [...this._taxLotsCache],
      holdings: [...this._holdingsCache],
      idempotency: { ...this._idempotencyCache },
      priceQuotes: [...(this._priceQuotesCache || [])],
      valuationSnapshots: [...(this._valuationSnapshotsCache || [])]
    };

    await this._commitState(
      this._instrumentsCache,
      this._accountsCache,
      nextTransactions,
      nextJournal,
      updatedLots,
      nextHoldings,
      nextIdemp,
      snapshot
    );

    return {
      transaction,
      journalEntries: newJournalEntries,
      taxLots: updatedLots.filter(l => l.accountId === accountId && l.instrumentId === instrumentId),
      holdings: nextHoldings.filter(h => h.accountId === accountId && h.instrumentId === instrumentId),
      isReplay: false
    };
  }

  /**
   * Reverses an existing settled transaction with compensating balanced entries.
   *
   * @param {string} originalTxId
   * @param {string} reason
   * @param {string} [idempotencyKey]
   * @returns {Promise<{ reversalTransaction: Object, reversalJournalEntries: Array<Object>, isReplay: boolean }>}
   */
  static async reverseTransaction(originalTxId, reason = 'Transaction reversed', idempotencyKey = null) {
    await this._ensureLoaded();

    if (idempotencyKey) {
      const validatedKey = validateIdempotencyKey(idempotencyKey);
      if (this._idempotencyCache[validatedKey]) {
        const cached = this._idempotencyCache[validatedKey];
        const existingTx = this._transactionsCache.find(t => t.id === cached.transactionId);
        const existingJournal = this._journalCache.filter(j => j.transactionId === cached.transactionId);
        return {
          reversalTransaction: existingTx,
          reversalJournalEntries: existingJournal,
          isReplay: true
        };
      }
    }

    const originalTx = this._transactionsCache.find(t => t.id === originalTxId);
    if (!originalTx) {
      throw new Error(`Original transaction '${originalTxId}' not found`);
    }
    if (originalTx.status === TRANSACTION_STATUS.REVERSED) {
      throw new Error(`Transaction '${originalTxId}' is already reversed`);
    }
    if (originalTx.status !== TRANSACTION_STATUS.SETTLED) {
      throw new Error(`Only SETTLED transactions can be reversed, current: ${originalTx.status}`);
    }

    const reversalTxId = `rev_${originalTxId}_${Date.now()}`;
    let nextLots = [...this._taxLotsCache];

    // ─────────────────────────────────────────────────────────────────────────
    // Causal Tax-Lot Reversal Restoration
    // ─────────────────────────────────────────────────────────────────────────
    if (originalTx.transactionType === TRANSACTION_TYPES.BUY || originalTx.transactionType === TRANSACTION_TYPES.SIP_PURCHASE) {
      const lot = nextLots.find(l => l.transactionId === originalTxId);
      if (lot) {
        // Collect all active depletions across all transactions
        const allDepletions = this._transactionsCache.flatMap(t => t.depletionRecords || []);
        assertCanReversePurchaseLot(lot, allDepletions);

        nextLots = nextLots.map(l => l.id === lot.id ? { ...l, status: TAX_LOT_STATUS.REVERSED, updatedAt: new Date().toISOString() } : l);
      }
    } else if (originalTx.transactionType === TRANSACTION_TYPES.SELL ||
               originalTx.transactionType === TRANSACTION_TYPES.REDEMPTION ||
               originalTx.transactionType === TRANSACTION_TYPES.MATURITY) {
      const depletionsForSale = originalTx.depletionRecords || [];
      nextLots = restoreLotsFromSaleReversal({
        currentLots: nextLots,
        depletionsForSale
      });
    }

    const originalJournal = this._journalCache.filter(j => j.transactionId === originalTxId);
    const compensatingJournal = createReversalJournalEntries(originalJournal, reversalTxId);

    // Update original transaction state to REVERSED
    const updatedOriginal = {
      ...originalTx,
      status: TRANSACTION_STATUS.REVERSED,
      reversalTransactionId: reversalTxId,
      reversalReason: reason,
      reversedAt: new Date().toISOString()
    };

    const reversalTx = {
      id: reversalTxId,
      accountId: originalTx.accountId,
      instrumentId: originalTx.instrumentId,
      transactionType: TRANSACTION_TYPES.REVERSAL,
      status: TRANSACTION_STATUS.SETTLED,
      quantityMicros: originalTx.quantityMicros,
      pricePaise: originalTx.pricePaise,
      grossAmountPaise: originalTx.grossAmountPaise,
      feesPaise: originalTx.feesPaise,
      taxesPaise: originalTx.taxesPaise,
      netCashAmountPaise: originalTx.netCashAmountPaise,
      cashDirection: originalTx.cashDirection,
      transactionDate: new Date().toISOString().split('T')[0],
      settlementDate: new Date().toISOString().split('T')[0],
      source: 'REVERSAL',
      sourceReference: originalTxId,
      reversalOfTransactionId: originalTxId,
      metadata: { reason },
      createdAt: new Date().toISOString()
    };

    const nextTransactions = this._transactionsCache.map(t => t.id === originalTxId ? updatedOriginal : t);
    nextTransactions.unshift(reversalTx);

    const nextJournal = [...compensatingJournal, ...this._journalCache];
    const nextHoldings = projectHoldingsFromLots({
      lots: nextLots,
      accounts: this._accountsCache,
      instruments: this._instrumentsCache
    });

    const nextIdemp = { ...this._idempotencyCache };

    if (idempotencyKey) {
      nextIdemp[idempotencyKey.trim()] = {
        transactionId: reversalTxId,
        source: 'REVERSAL',
        sourceReference: originalTxId,
        transactionType: TRANSACTION_TYPES.REVERSAL,
        accountId: originalTx.accountId,
        instrumentId: originalTx.instrumentId,
        timestamp: new Date().toISOString()
      };
    }

    const snapshot = {
      instruments: [...this._instrumentsCache],
      accounts: [...this._accountsCache],
      transactions: [...this._transactionsCache],
      journal: [...this._journalCache],
      taxLots: [...this._taxLotsCache],
      holdings: [...this._holdingsCache],
      idempotency: { ...this._idempotencyCache },
      priceQuotes: [...(this._priceQuotesCache || [])],
      valuationSnapshots: [...(this._valuationSnapshotsCache || [])]
    };

    await this._commitState(
      this._instrumentsCache,
      this._accountsCache,
      nextTransactions,
      nextJournal,
      nextLots,
      nextHoldings,
      nextIdemp,
      snapshot
    );

    return {
      reversalTransaction: reversalTx,
      reversalJournalEntries: compensatingJournal,
      isReplay: false
    };
  }

  static async getTransaction(id) {
    await this._ensureLoaded();
    const found = this._transactionsCache.find(t => t.id === id);
    return found ? { ...found } : null;
  }

  static async getAllTransactions() {
    await this._ensureLoaded();
    return [...this._transactionsCache];
  }

  static async getJournalEntries(filter = {}) {
    await this._ensureLoaded();
    let entries = [...this._journalCache];
    if (filter.transactionId) {
      entries = entries.filter(e => e.transactionId === filter.transactionId);
    }
    if (filter.account) {
      entries = entries.filter(e => e.account === filter.account);
    }
    return entries;
  }

  static async getTaxLots(filter = {}) {
    await this._ensureLoaded();
    let lots = [...this._taxLotsCache];
    if (filter.accountId) {
      lots = lots.filter(l => l.accountId === filter.accountId);
    }
    if (filter.instrumentId) {
      lots = lots.filter(l => l.instrumentId === filter.instrumentId);
    }
    if (filter.status) {
      lots = lots.filter(l => l.status === filter.status);
    }
    return lots;
  }

  static async getTaxLot(id) {
    await this._ensureLoaded();
    const found = this._taxLotsCache.find(l => l.id === id);
    return found ? { ...found } : null;
  }

  static async getHoldings(filter = {}) {
    await this._ensureLoaded();
    let holdings = [...this._holdingsCache];
    if (filter.accountId) {
      holdings = holdings.filter(h => h.accountId === filter.accountId);
    }
    if (filter.instrumentId) {
      holdings = holdings.filter(h => h.instrumentId === filter.instrumentId);
    }
    if (filter.status) {
      holdings = holdings.filter(h => h.status === filter.status);
    }
    return holdings;
  }

  static async getHolding(accountId, instrumentId) {
    await this._ensureLoaded();
    const found = this._holdingsCache.find(
      h => h.accountId === accountId && h.instrumentId === instrumentId
    );
    return found ? { ...found } : null;
  }

  /**
   * Explicitly corrupts the persisted holdings cache to verify auto-rebuild resilience.
   */
  static async corruptHoldingsCacheForTesting() {
    await AsyncStorage.setItem(
      INVESTMENT_STORAGE_KEYS.HOLDINGS,
      JSON.stringify([{ id: 'hld_corrupted', totalQuantityMicros: '999999999' }])
    );
    this._holdingsCache = null; // force reload from storage
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phase 3: Price Quotes & Valuation Snapshots Operations
  // ─────────────────────────────────────────────────────────────────────────

  static async recordPriceQuote(quoteInput) {
    await this._ensureLoaded();
    const validated = validatePriceQuote(quoteInput);
    const id = String(validated.id || `quote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();

    const quote = {
      id,
      instrumentId: validated.instrumentId,
      pricePaise: validated.pricePaise,
      source: validated.source,
      status: validated.status || PRICE_STATUS.AVAILABLE,
      adjustmentType: validated.adjustmentType || PRICE_ADJUSTMENT_TYPE.RAW,
      asOfTimestamp: validated.asOfTimestamp,
      createdAt: new Date().toISOString()
    };

    const snapshot = {
      instruments: [...this._instrumentsCache],
      accounts: [...this._accountsCache],
      transactions: [...this._transactionsCache],
      journal: [...this._journalCache],
      taxLots: [...this._taxLotsCache],
      holdings: [...this._holdingsCache],
      idempotency: { ...this._idempotencyCache },
      priceQuotes: [...this._priceQuotesCache],
      valuationSnapshots: [...this._valuationSnapshotsCache]
    };

    const nextQuotes = [quote, ...this._priceQuotesCache];

    await this._commitState(
      this._instrumentsCache,
      this._accountsCache,
      this._transactionsCache,
      this._journalCache,
      this._taxLotsCache,
      this._holdingsCache,
      this._idempotencyCache,
      nextQuotes,
      this._valuationSnapshotsCache,
      snapshot
    );

    return quote;
  }

  static async recordBatchPriceQuotes(quotesList) {
    await this._ensureLoaded();
    if (!Array.isArray(quotesList) || quotesList.length === 0) {
      return [];
    }

    const validatedQuotes = quotesList.map(quoteInput => {
      const validated = validatePriceQuote(quoteInput);
      const id = String(validated.id || `quote_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`).trim();
      return {
        id,
        instrumentId: validated.instrumentId,
        pricePaise: validated.pricePaise,
        source: validated.source,
        status: validated.status || PRICE_STATUS.AVAILABLE,
        adjustmentType: validated.adjustmentType || PRICE_ADJUSTMENT_TYPE.RAW,
        asOfTimestamp: validated.asOfTimestamp,
        createdAt: new Date().toISOString()
      };
    });

    const snapshot = {
      instruments: [...this._instrumentsCache],
      accounts: [...this._accountsCache],
      transactions: [...this._transactionsCache],
      journal: [...this._journalCache],
      taxLots: [...this._taxLotsCache],
      holdings: [...this._holdingsCache],
      idempotency: { ...this._idempotencyCache },
      priceQuotes: [...this._priceQuotesCache],
      valuationSnapshots: [...this._valuationSnapshotsCache]
    };

    const nextQuotes = [...validatedQuotes, ...this._priceQuotesCache];

    await this._commitState(
      this._instrumentsCache,
      this._accountsCache,
      this._transactionsCache,
      this._journalCache,
      this._taxLotsCache,
      this._holdingsCache,
      this._idempotencyCache,
      nextQuotes,
      this._valuationSnapshotsCache,
      snapshot
    );

    return validatedQuotes;
  }

  static async getLatestPriceQuote(instrumentId, asOfDate) {
    await this._ensureLoaded();
    const targetInstId = String(instrumentId).trim();

    let matching = this._priceQuotesCache.filter(q => q.instrumentId === targetInstId);
    if (matching.length === 0) return null;

    if (asOfDate) {
      const asOfTime = new Date(asOfDate).getTime();
      if (!isNaN(asOfTime)) {
        // End-of-day boundary for asOfDate
        const asOfEndOfDay = new Date(asOfDate);
        asOfEndOfDay.setHours(23, 59, 59, 999);
        matching = matching.filter(q => {
          const qTime = new Date(q.asOfTimestamp).getTime();
          return qTime <= asOfEndOfDay.getTime();
        });
      }
    }

    if (matching.length === 0) return null;

    // Sort descending by asOfTimestamp
    matching.sort((a, b) => new Date(b.asOfTimestamp).getTime() - new Date(a.asOfTimestamp).getTime());
    return { ...matching[0] };
  }

  static async getAllPriceQuotes(filter = {}) {
    await this._ensureLoaded();
    let quotes = [...this._priceQuotesCache];
    if (filter.instrumentId) {
      quotes = quotes.filter(q => q.instrumentId === filter.instrumentId);
    }
    if (filter.source) {
      quotes = quotes.filter(q => q.source === filter.source);
    }
    if (filter.status) {
      quotes = quotes.filter(q => q.status === filter.status);
    }
    return quotes;
  }

  static async captureValuationSnapshot(asOfDate, options = {}) {
    await this._ensureLoaded();
    const holdings = await this.getHoldings({ status: HOLDING_STATUS.ACTIVE });

    const priceQuotesMap = {};
    const instrumentsMap = {};

    for (const inst of this._instrumentsCache) {
      instrumentsMap[inst.id] = inst;
    }

    for (const h of holdings) {
      const quote = await this.getLatestPriceQuote(h.instrumentId, asOfDate);
      if (quote) {
        priceQuotesMap[h.instrumentId] = quote;
      }
    }

    const valuation = calculatePortfolioValuation({
      holdings,
      priceQuotesMap,
      instrumentsMap,
      asOfDate,
      allowStale: options.allowStale !== false
    });

    const id = `val_snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const snapshotDTO = {
      id,
      ...valuation
    };

    const rollbackSnapshot = {
      instruments: [...this._instrumentsCache],
      accounts: [...this._accountsCache],
      transactions: [...this._transactionsCache],
      journal: [...this._journalCache],
      taxLots: [...this._taxLotsCache],
      holdings: [...this._holdingsCache],
      idempotency: { ...this._idempotencyCache },
      priceQuotes: [...this._priceQuotesCache],
      valuationSnapshots: [...this._valuationSnapshotsCache],
      cfoSnapshots: [...this._cfoSnapshotsCache]
    };

    const nextSnapshots = [snapshotDTO, ...this._valuationSnapshotsCache];

    await this._commitState(
      this._instrumentsCache,
      this._accountsCache,
      this._transactionsCache,
      this._journalCache,
      this._taxLotsCache,
      this._holdingsCache,
      this._idempotencyCache,
      this._priceQuotesCache,
      nextSnapshots,
      this._cfoSnapshotsCache,
      rollbackSnapshot
    );

    return snapshotDTO;
  }

  static async getLatestValuationSnapshot() {
    await this._ensureLoaded();
    if (this._valuationSnapshotsCache.length === 0) return null;
    return { ...this._valuationSnapshotsCache[0] };
  }

  static async getAllValuationSnapshots() {
    await this._ensureLoaded();
    return [...this._valuationSnapshotsCache];
  }

  /**
   * Self-healing: reconstructs valuation from authoritative holdings and authoritative price quotes.
   * Never rebuilds from a previous stale snapshot.
   */
  static async recalculateValuationFromAuthoritativeData(asOfDate, options = {}) {
    await this._ensureLoaded();
    return this.captureValuationSnapshot(asOfDate, options);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Personal CFO Snapshots Pipeline (Phase 4)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Captures an atomic Personal CFO consolidated balance sheet snapshot.
   *
   * @param {Object} balanceSheetOrParams - Precomputed balance sheet DTO or parameters for getConsolidatedCFOBalanceSheet
   * @returns {Promise<Object>} Captured CFO snapshot DTO
   */
  static async captureCFOSnapshot(balanceSheetOrParams = {}) {
    await this._ensureLoaded();

    let balanceSheetDTO;
    if (balanceSheetOrParams && balanceSheetOrParams.calculationPolicyVersion) {
      balanceSheetDTO = balanceSheetOrParams;
    } else {
      balanceSheetDTO = getConsolidatedCFOBalanceSheet(balanceSheetOrParams);
    }

    const snapshotId = `cfo_snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const snapshotDTO = Object.freeze({
      id: snapshotId,
      snapshotId,
      createdAt: new Date().toISOString(),
      ...balanceSheetDTO,
      sourceVersions: {
        investments: INVESTMENT_SCHEMA_VERSION,
        banking: 1,
        assets: 2,
        properties: 3,
        loans: 1,
        p2p: 1
      }
    });

    const rollbackSnapshot = {
      instruments: [...this._instrumentsCache],
      accounts: [...this._accountsCache],
      transactions: [...this._transactionsCache],
      journal: [...this._journalCache],
      taxLots: [...this._taxLotsCache],
      holdings: [...this._holdingsCache],
      idempotency: { ...this._idempotencyCache },
      priceQuotes: [...this._priceQuotesCache],
      valuationSnapshots: [...this._valuationSnapshotsCache],
      cfoSnapshots: [...this._cfoSnapshotsCache]
    };

    const nextCfoSnapshots = [snapshotDTO, ...this._cfoSnapshotsCache];

    await this._commitState(
      this._instrumentsCache,
      this._accountsCache,
      this._transactionsCache,
      this._journalCache,
      this._taxLotsCache,
      this._holdingsCache,
      this._idempotencyCache,
      this._priceQuotesCache,
      this._valuationSnapshotsCache,
      nextCfoSnapshots,
      rollbackSnapshot
    );

    return snapshotDTO;
  }

  static async getLatestCFOSnapshot() {
    await this._ensureLoaded();
    if (this._cfoSnapshotsCache.length === 0) return null;
    return { ...this._cfoSnapshotsCache[0] };
  }

  static async getAllCFOSnapshots() {
    await this._ensureLoaded();
    return [...this._cfoSnapshotsCache];
  }

  /**
   * Recalculates and persists a fresh CFO snapshot from authoritative sources.
   */
  static async recalculateCFOFromAuthoritativeData(params = {}) {
    await this._ensureLoaded();
    return this.captureCFOSnapshot(params);
  }

  static async corruptCFOSnapshotCacheForTesting() {
    await AsyncStorage.setItem(
      INVESTMENT_STORAGE_KEYS.CFO_SNAPSHOTS,
      JSON.stringify([{ id: 'cfo_snap_corrupt', netWorthPaise: 'invalid_number' }])
    );
    this._cfoSnapshotsCache = null;
  }

  static async corruptPriceQuotesCacheForTesting() {
    await AsyncStorage.setItem(
      INVESTMENT_STORAGE_KEYS.PRICE_QUOTES,
      JSON.stringify([{ id: 'quote_corrupt', pricePaise: 'invalid_number' }])
    );
    this._priceQuotesCache = null;
  }

  static async corruptValuationSnapshotCacheForTesting() {
    await AsyncStorage.setItem(
      INVESTMENT_STORAGE_KEYS.VALUATION_SNAPSHOTS,
      JSON.stringify([{ id: 'snap_corrupt', totalMarketValuePaise: 'invalid_number' }])
    );
    this._valuationSnapshotsCache = null;
  }


  /**
   * Seeds development / test fixtures explicitly.
   * NEVER called automatically in production release.
   */
  static async seedDevelopmentFixtures(options = {}) {
    await this._ensureLoaded();
    if (this._instrumentsCache.length > 0) {
      if (options.withTransactions && this._transactionsCache.length === 0) {
        const devAcc = this._accountsCache[0];
        const devInst = this._instrumentsCache[0];
        await this.recordTransaction({
          id: 'tx_seed_hdfc',
          accountId: devAcc.id,
          instrumentId: devInst.id,
          transactionType: TRANSACTION_TYPES.BUY,
          quantityMicros: 100000000n,
          pricePaise: 15000n,
          tradeDate: '2025-01-10',
          settlementDate: '2025-01-11',
          status: TRANSACTION_STATUS.SETTLED
        });

        const nowIso = new Date().toISOString();
        await this.recordPriceQuote({
          id: 'quote_seed_hdfc',
          instrumentId: devInst.id,
          pricePaise: 18500n,
          source: PRICE_SOURCE.AMFI_NAV,
          status: PRICE_STATUS.AVAILABLE,
          asOfTimestamp: nowIso
        });

        const today = nowIso.split('T')[0];
        await this.captureValuationSnapshot(today);
      }
      return {
        instruments: this._instrumentsCache,
        accounts: this._accountsCache,
        transactions: this._transactionsCache
      };
    }

    const devInst = await this.addInstrument({
      id: 'inst_dev_hdfc50',
      instrumentType: INSTRUMENT_TYPES.MUTUAL_FUND,
      name: 'HDFC Index Fund - Nifty 50 Plan',
      symbol: 'HDFC-NIFTY50',
      isin: 'INF179K01BE2',
      isSeed: true
    });

    const devAcc = await this.addAccount({
      id: 'acc_dev_zerodha',
      name: 'Zerodha Demat Account',
      provider: 'Zerodha',
      accountType: ACCOUNT_TYPES.DEMAT,
      isSeed: true
    });

    if (options.withTransactions) {
      await this.recordTransaction({
        id: 'tx_seed_hdfc',
        accountId: devAcc.id,
        instrumentId: devInst.id,
        transactionType: TRANSACTION_TYPES.BUY,
        quantityMicros: 100000000n,
        pricePaise: 15000n,
        tradeDate: '2025-01-10',
        settlementDate: '2025-01-11',
        status: TRANSACTION_STATUS.SETTLED
      });

      const nowIso = new Date().toISOString();
      await this.recordPriceQuote({
        id: 'quote_seed_hdfc',
        instrumentId: devInst.id,
        pricePaise: 18500n,
        source: PRICE_SOURCE.AMFI_NAV,
        status: PRICE_STATUS.AVAILABLE,
        asOfTimestamp: nowIso
      });

      const today = nowIso.split('T')[0];
      await this.captureValuationSnapshot(today);
    }

    return {
      instruments: [devInst],
      accounts: [devAcc],
      transactions: this._transactionsCache
    };
  }

  static async seedDemoPortfolio() {
    return this.seedDevelopmentFixtures({ withTransactions: true });
  }
}

