/**
 * @file investmentBankingAdapter.js
 * @description Read-only banking integration adapter for FinLife Investments Module V1 (Phase 4).
 *
 * Invariants & Guarantees:
 * - Read-only projection: Never mutates investment transactions or bank accounts.
 * - Zero synthetic cash entries: Reconciles actual records without inventing duplicate transactions.
 * - Exact ₹0 discrepancy reported ONLY when both sides are settled, verified, and matched.
 * - Explicit statuses: MATCHED, PENDING_SETTLEMENT, MISSING_BANK_MOVEMENT, MISSING_INVESTMENT_MOVEMENT,
 *   AMOUNT_MISMATCH, UNLINKED_ACCOUNT, UNAVAILABLE, PARTIAL.
 */

import {
  BANKING_RECONCILIATION_STATUS
} from './investmentIntegrationContracts.js';
import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  validateBoundedPaise,
  validateNonNegativePaise
} from './investmentContracts.js';

/**
 * Reconciles investment cash movements against bank statement records.
 *
 * @param {Object} params
 * @param {Array<Object>} params.investmentTransactions
 * @param {Array<Object>} params.bankTransactions
 * @param {string} [params.linkedBankAccountId]
 * @param {boolean} [params.isAvailable=true]
 * @returns {Object} BankingReconciliationDTO
 */
export function reconcileInvestmentBankingCashFlows({
  investmentTransactions = [],
  bankTransactions = [],
  linkedBankAccountId = null,
  isAvailable = true
} = {}) {
  if (!isAvailable) {
    return Object.freeze({
      status: BANKING_RECONCILIATION_STATUS.UNAVAILABLE,
      isReconciled: false,
      totalDiscrepancyPaise: null,
      matchedCount: 0,
      unmatchedCount: 0,
      items: [],
      reason: 'BANKING_SOURCE_UNAVAILABLE'
    });
  }

  if (!linkedBankAccountId || typeof linkedBankAccountId !== 'string' || linkedBankAccountId.trim().length === 0) {
    return Object.freeze({
      status: BANKING_RECONCILIATION_STATUS.UNLINKED_ACCOUNT,
      isReconciled: false,
      totalDiscrepancyPaise: null,
      matchedCount: 0,
      unmatchedCount: 0,
      items: [],
      reason: 'NO_LINKED_BANK_ACCOUNT'
    });
  }

  // Filter bank transactions for the linked account
  const bankAccountTx = bankTransactions.filter(bt => bt.accountId === linkedBankAccountId);

  // Index bank transactions by referenceId or composite key
  const bankTxMap = new Map();
  for (const bt of bankAccountTx) {
    if (bt.referenceId) {
      bankTxMap.set(bt.referenceId, bt);
    }
    // Also index by transaction ID
    bankTxMap.set(bt.id, bt);
  }

  const items = [];
  let totalDiscrepancyPaise = 0n;
  let matchedCount = 0;
  let hasPendingSettlement = false;
  let hasMissingBankMovement = false;
  let hasAmountMismatch = false;

  for (const invTx of investmentTransactions) {
    // Only cash-moving investment transactions are subject to banking reconciliation
    const isCashMovement = [
      TRANSACTION_TYPES.BUY,
      TRANSACTION_TYPES.SIP_PURCHASE,
      TRANSACTION_TYPES.SELL,
      TRANSACTION_TYPES.REDEMPTION,
      TRANSACTION_TYPES.DIVIDEND,
      TRANSACTION_TYPES.INTEREST
    ].includes(invTx.transactionType);

    if (!isCashMovement) continue;

    // Check transaction status: unsettled/pending transactions cannot report ₹0 gap
    if (invTx.status === TRANSACTION_STATUS.PENDING || invTx.status === TRANSACTION_STATUS.DRAFT) {
      hasPendingSettlement = true;
      items.push(Object.freeze({
        investmentTransactionId: invTx.id,
        transactionType: invTx.transactionType,
        expectedPaise: invTx.netCashAmountPaise || invTx.grossAmountPaise,
        bankTransactionId: null,
        bankAmountPaise: null,
        discrepancyPaise: null,
        status: BANKING_RECONCILIATION_STATUS.PENDING_SETTLEMENT
      }));
      continue;
    }

    if (invTx.status !== TRANSACTION_STATUS.SETTLED) {
      continue; // FAILED, CANCELLED, REVERSED handled separately
    }

    const expectedPaise = invTx.netCashAmountPaise || invTx.grossAmountPaise;

    // Look for matching bank transaction by referenceId or invTx.id
    const matchedBankTx = bankTxMap.get(invTx.id) || bankTxMap.get(invTx.sourceReference);

    if (!matchedBankTx) {
      hasMissingBankMovement = true;
      items.push(Object.freeze({
        investmentTransactionId: invTx.id,
        transactionType: invTx.transactionType,
        expectedPaise,
        bankTransactionId: null,
        bankAmountPaise: null,
        discrepancyPaise: expectedPaise,
        status: BANKING_RECONCILIATION_STATUS.MISSING_BANK_MOVEMENT
      }));
      totalDiscrepancyPaise += expectedPaise;
      continue;
    }

    const bankAmountPaise = validateNonNegativePaise(BigInt(matchedBankTx.amountPaise ?? 0n), 'bankAmountPaise');
    const diffPaise = expectedPaise > bankAmountPaise ? expectedPaise - bankAmountPaise : bankAmountPaise - expectedPaise;

    if (diffPaise === 0n) {
      matchedCount++;
      items.push(Object.freeze({
        investmentTransactionId: invTx.id,
        transactionType: invTx.transactionType,
        expectedPaise,
        bankTransactionId: matchedBankTx.id,
        bankAmountPaise,
        discrepancyPaise: 0n,
        status: BANKING_RECONCILIATION_STATUS.MATCHED
      }));
    } else {
      hasAmountMismatch = true;
      totalDiscrepancyPaise += diffPaise;
      items.push(Object.freeze({
        investmentTransactionId: invTx.id,
        transactionType: invTx.transactionType,
        expectedPaise,
        bankTransactionId: matchedBankTx.id,
        bankAmountPaise,
        discrepancyPaise: diffPaise,
        status: BANKING_RECONCILIATION_STATUS.AMOUNT_MISMATCH
      }));
    }
  }

  // Determine aggregate reconciliation status
  let status = BANKING_RECONCILIATION_STATUS.MATCHED;
  let isReconciled = false;

  if (items.length === 0) {
    status = BANKING_RECONCILIATION_STATUS.MATCHED;
    isReconciled = true;
  } else if (hasMissingBankMovement && matchedCount === 0) {
    status = BANKING_RECONCILIATION_STATUS.MISSING_BANK_MOVEMENT;
  } else if (hasPendingSettlement && matchedCount === 0) {
    status = BANKING_RECONCILIATION_STATUS.PENDING_SETTLEMENT;
  } else if (hasAmountMismatch || hasMissingBankMovement || hasPendingSettlement) {
    status = BANKING_RECONCILIATION_STATUS.PARTIAL;
  } else {
    status = BANKING_RECONCILIATION_STATUS.MATCHED;
    isReconciled = true;
  }

  let reportedDiscrepancyPaise = isReconciled ? 0n : totalDiscrepancyPaise;
  if (status === BANKING_RECONCILIATION_STATUS.PENDING_SETTLEMENT) {
    reportedDiscrepancyPaise = null;
  }

  return Object.freeze({
    status,
    isReconciled,
    totalDiscrepancyPaise: reportedDiscrepancyPaise,
    matchedCount,
    unmatchedCount: items.length - matchedCount,
    items
  });
}
