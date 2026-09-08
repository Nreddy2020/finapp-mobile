/**
 * @file investmentCashbookAdapter.js
 * @description Read-only Cashbook integration adapter for FinLife Investments Module V1 (Phase 4).
 *
 * Invariants & Guarantees:
 * - Read-only projection: Never mutates investment transactions or creates synthetic records in Cashbook.
 * - Symmetrical reversal reflection: Compensating reversal transactions reflect exact inverse cash flow.
 * - Internal transfer neutrality: Inter-account transfers project balanced legs with net ₹0 cash impact.
 * - Exact signed 64-bit BigInt paise arithmetic.
 */

import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  validateBoundedPaise,
  validateNonNegativePaise
} from './investmentContracts.js';

/**
 * Projects authoritative investment transactions into cashbook-compatible projection entries.
 *
 * @param {Object} params
 * @param {Array<Object>} params.transactions - Authoritative investment transactions.
 * @param {string} [params.asOfDate] - ISO date string filter (inclusive).
 * @returns {Object} CashbookProjectionDTO
 */
export function projectInvestmentCashbookEntries({
  transactions = [],
  asOfDate = null
} = {}) {
  if (!Array.isArray(transactions)) {
    throw new TypeError('transactions must be an Array');
  }

  const entries = [];
  let totalInflowsPaise = 0n;
  let totalOutflowsPaise = 0n;

  for (const tx of transactions) {
    if (!tx || typeof tx !== 'object') continue;

    const txDate = tx.settlementDate || tx.transactionDate;
    if (asOfDate && txDate && txDate > asOfDate) {
      continue; // Exclude transactions after asOfDate
    }

    // Ignore non-settled, non-reversal transactions
    if (
      tx.status === TRANSACTION_STATUS.DRAFT ||
      tx.status === TRANSACTION_STATUS.FAILED ||
      tx.status === TRANSACTION_STATUS.CANCELLED
    ) {
      continue;
    }

    const isReversal = tx.transactionType === TRANSACTION_TYPES.REVERSAL || Boolean(tx.reversalOfTransactionId);
    const amountPaise = validateBoundedPaise(
      BigInt(tx.netCashAmountPaise ?? tx.grossAmountPaise ?? 0n),
      'amountPaise'
    );

    // Map transaction type to cashbook entry projection
    switch (tx.transactionType) {
      case TRANSACTION_TYPES.BUY:
      case TRANSACTION_TYPES.SIP_PURCHASE: {
        const cashOutflow = amountPaise >= 0n ? amountPaise : -amountPaise;
        totalOutflowsPaise += cashOutflow;
        entries.push(Object.freeze({
          id: `cb_proj_${tx.id}`,
          sourceTransactionId: tx.id,
          sourceType: 'INVESTMENTS',
          transactionType: tx.transactionType,
          date: txDate,
          type: 'EXPENSE',
          category: 'INVESTMENTS_OUTLAY',
          amountPaise: cashOutflow,
          netCashImpactPaise: -cashOutflow,
          accountId: tx.fundingAccountId || tx.accountId || null,
          description: `Investment purchase: ${tx.instrumentSymbol || tx.instrumentId || 'Securities'}`,
          isReversal: false
        }));
        break;
      }

      case TRANSACTION_TYPES.SELL:
      case TRANSACTION_TYPES.REDEMPTION: {
        const cashInflow = amountPaise >= 0n ? amountPaise : -amountPaise;
        totalInflowsPaise += cashInflow;
        entries.push(Object.freeze({
          id: `cb_proj_${tx.id}`,
          sourceTransactionId: tx.id,
          sourceType: 'INVESTMENTS',
          transactionType: tx.transactionType,
          date: txDate,
          type: 'INCOME',
          category: 'INVESTMENTS_PROCEEDS',
          amountPaise: cashInflow,
          netCashImpactPaise: cashInflow,
          accountId: tx.fundingAccountId || tx.accountId || null,
          description: `Investment sale proceeds: ${tx.instrumentSymbol || tx.instrumentId || 'Securities'}`,
          isReversal: false
        }));
        break;
      }

      case TRANSACTION_TYPES.DIVIDEND: {
        const cashInflow = amountPaise >= 0n ? amountPaise : -amountPaise;
        totalInflowsPaise += cashInflow;
        entries.push(Object.freeze({
          id: `cb_proj_${tx.id}`,
          sourceTransactionId: tx.id,
          sourceType: 'INVESTMENTS',
          transactionType: tx.transactionType,
          date: txDate,
          type: 'INCOME',
          category: 'DIVIDEND_INCOME',
          amountPaise: cashInflow,
          netCashImpactPaise: cashInflow,
          accountId: tx.fundingAccountId || tx.accountId || null,
          description: `Dividend: ${tx.instrumentSymbol || tx.instrumentId || 'Securities'}`,
          isReversal: false
        }));
        break;
      }

      case TRANSACTION_TYPES.INTEREST: {
        const cashInflow = amountPaise >= 0n ? amountPaise : -amountPaise;
        totalInflowsPaise += cashInflow;
        entries.push(Object.freeze({
          id: `cb_proj_${tx.id}`,
          sourceTransactionId: tx.id,
          sourceType: 'INVESTMENTS',
          transactionType: tx.transactionType,
          date: txDate,
          type: 'INCOME',
          category: 'INTEREST_INCOME',
          amountPaise: cashInflow,
          netCashImpactPaise: cashInflow,
          accountId: tx.fundingAccountId || tx.accountId || null,
          description: `Interest income: ${tx.instrumentSymbol || tx.instrumentId || 'Securities'}`,
          isReversal: false
        }));
        break;
      }

      case TRANSACTION_TYPES.FEE:
      case TRANSACTION_TYPES.TAX: {
        const cashOutflow = amountPaise >= 0n ? amountPaise : -amountPaise;
        totalOutflowsPaise += cashOutflow;
        entries.push(Object.freeze({
          id: `cb_proj_${tx.id}`,
          sourceTransactionId: tx.id,
          sourceType: 'INVESTMENTS',
          transactionType: tx.transactionType,
          date: txDate,
          type: 'EXPENSE',
          category: tx.transactionType === TRANSACTION_TYPES.TAX ? 'INVESTMENT_TAXES' : 'INVESTMENT_FEES',
          amountPaise: cashOutflow,
          netCashImpactPaise: -cashOutflow,
          accountId: tx.fundingAccountId || tx.accountId || null,
          description: `${tx.transactionType}: ${tx.instrumentSymbol || tx.instrumentId || 'Brokerage charges'}`,
          isReversal: false
        }));
        break;
      }

      case TRANSACTION_TYPES.TRANSFER_IN:
      case TRANSACTION_TYPES.TRANSFER_OUT: {
        // Inter-account transfer neutrality:
        // TRANSFER_IN: +amountPaise to destination account
        // TRANSFER_OUT: -amountPaise from source account
        // When combined, net impact is 0n paise
        const isTransferIn = tx.transactionType === TRANSACTION_TYPES.TRANSFER_IN;
        const transferAmount = amountPaise >= 0n ? amountPaise : -amountPaise;
        const netImpact = isTransferIn ? transferAmount : -transferAmount;

        if (isTransferIn) {
          totalInflowsPaise += transferAmount;
        } else {
          totalOutflowsPaise += transferAmount;
        }

        entries.push(Object.freeze({
          id: `cb_proj_${tx.id}`,
          sourceTransactionId: tx.id,
          sourceType: 'INVESTMENTS',
          transactionType: tx.transactionType,
          date: txDate,
          type: 'TRANSFER',
          category: 'INTERNAL_TRANSFER',
          amountPaise: transferAmount,
          netCashImpactPaise: netImpact,
          accountId: tx.accountId || null,
          destinationAccountId: tx.destinationAccountId || null,
          description: `Transfer ${isTransferIn ? 'in' : 'out'}: ${tx.instrumentSymbol || 'Securities'}`,
          isReversal: false
        }));
        break;
      }

      case TRANSACTION_TYPES.REVERSAL: {
        // Reversal of a prior transaction: inverse sign
        // Original direction determines the reversal effect
        const originalDirection = tx.originalCashDirection || tx.cashDirection;
        const reversalAmount = amountPaise >= 0n ? amountPaise : -amountPaise;

        let netImpact = 0n;
        let reversalType = 'ADJUSTMENT';

        if (originalDirection === 'OUTFLOW' || tx.originalTransactionType === TRANSACTION_TYPES.BUY) {
          // Reversing an outflow is an inflow back to the cashbook
          netImpact = reversalAmount;
          totalInflowsPaise += reversalAmount;
          reversalType = 'REFUND';
        } else if (originalDirection === 'INFLOW' || tx.originalTransactionType === TRANSACTION_TYPES.SELL) {
          // Reversing an inflow is an outflow from the cashbook
          netImpact = -reversalAmount;
          totalOutflowsPaise += reversalAmount;
          reversalType = 'ADJUSTMENT';
        }

        entries.push(Object.freeze({
          id: `cb_proj_${tx.id}`,
          sourceTransactionId: tx.id,
          reversalOfTransactionId: tx.reversalOfTransactionId || null,
          sourceType: 'INVESTMENTS',
          transactionType: TRANSACTION_TYPES.REVERSAL,
          date: txDate,
          type: reversalType,
          category: 'INVESTMENT_REVERSAL',
          amountPaise: reversalAmount,
          netCashImpactPaise: netImpact,
          accountId: tx.fundingAccountId || tx.accountId || null,
          description: `Compensating reversal of ${tx.reversalOfTransactionId || 'prior transaction'}`,
          isReversal: true
        }));
        break;
      }

      default:
        // Corporate actions without cash movement (BONUS, STOCK_SPLIT, MERGER) are cash neutral
        break;
    }
  }

  const netCashFlowPaise = totalInflowsPaise - totalOutflowsPaise;

  validateBoundedPaise(totalInflowsPaise, 'totalInflowsPaise');
  validateBoundedPaise(totalOutflowsPaise, 'totalOutflowsPaise');
  validateBoundedPaise(netCashFlowPaise, 'netCashFlowPaise');

  return Object.freeze({
    entries: Object.freeze(entries),
    summary: Object.freeze({
      totalInflowsPaise,
      totalOutflowsPaise,
      netCashFlowPaise,
      totalEntriesCount: entries.length
    }),
    asOfDate
  });
}
