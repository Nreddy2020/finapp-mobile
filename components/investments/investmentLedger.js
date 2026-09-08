/**
 * @file investmentLedger.js
 * @description Pure double-entry balanced journal engine for the FinLife Investments Module V1 (Phase 1).
 *
 * Invariants & Guarantees:
 * - Balanced Entry Rule: For every posted transaction, sum(debits) === sum(credits).
 * - Only SETTLED transactions affect the ledger. DRAFT, PENDING, FAILED, CANCELLED produce zero journal entries.
 * - Compensating Reversal: Reversals create exact symmetric inverted entries. Original records remain immutable.
 * - CASH_SETTLEMENT represents the internal clearing account, isolated from external Banking records.
 */

import {
  TRANSACTION_TYPES,
  TRANSACTION_STATUS,
  LEDGER_ACCOUNT_TYPES,
  validateBoundedPaise,
  validateNonNegativePaise
} from './investmentContracts.js';

import { calculateCashMovement } from './investmentCalculations.js';

/**
 * Validates that an array of journal entries is perfectly balanced.
 *
 * @param {Array<Object>} entries
 * @returns {boolean}
 * @throws {Error} If unbalanced
 */
export function assertJournalBalanced(entries) {
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error('assertJournalBalanced: entries array must be non-empty');
  }

  let totalDebits = 0n;
  let totalCredits = 0n;

  for (const entry of entries) {
    validateNonNegativePaise(entry.debitPaise, `debitPaise for ${entry.entryId || entry.account}`);
    validateNonNegativePaise(entry.creditPaise, `creditPaise for ${entry.entryId || entry.account}`);

    totalDebits += entry.debitPaise;
    totalCredits += entry.creditPaise;
  }

  if (totalDebits !== totalCredits) {
    throw new Error(
      `assertJournalBalanced: Unbalanced journal entry detected. Total Debits: ${totalDebits}, Total Credits: ${totalCredits}`
    );
  }

  return true;
}

/**
 * Generates double-entry journal entries for a settled investment transaction.
 *
 * @param {Object} tx InvestmentTransaction
 * @returns {Array<Object>} Array of journal entries
 */
export function generateJournalEntries(tx) {
  if (!tx || typeof tx !== 'object') {
    throw new TypeError('generateJournalEntries: transaction must be an object');
  }

  // Authoritative status rule: Only SETTLED transactions generate journal entries
  if (tx.status !== TRANSACTION_STATUS.SETTLED) {
    return [];
  }

  const grossPaise = BigInt(tx.grossAmountPaise ?? 0n);
  const feesPaise = BigInt(tx.feesPaise ?? 0n);
  const taxesPaise = BigInt(tx.taxesPaise ?? 0n);
  const timestamp = tx.settlementDate || tx.transactionDate || new Date().toISOString();
  const txId = tx.id;

  const cashMovement = calculateCashMovement({
    transactionType: tx.transactionType,
    grossPaise,
    feesPaise,
    taxesPaise
  });

  const entries = [];

  switch (tx.transactionType) {
    case TRANSACTION_TYPES.BUY:
    case TRANSACTION_TYPES.SIP_PURCHASE: {
      // Debit: Asset Investment (gross)
      entries.push({
        entryId: `j_${txId}_dr_asset`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.ASSET_INVESTMENT,
        debitPaise: grossPaise,
        creditPaise: 0n,
        description: `Acquisition of ${tx.instrumentId || 'asset'}`
      });

      // Debit: Fees Expense (if any)
      if (feesPaise > 0n) {
        entries.push({
          entryId: `j_${txId}_dr_fee`,
          transactionId: txId,
          timestamp,
          account: LEDGER_ACCOUNT_TYPES.FEES_EXPENSE,
          debitPaise: feesPaise,
          creditPaise: 0n,
          description: `Brokerage / fee for ${txId}`
        });
      }

      // Debit: Tax Expense (if any)
      if (taxesPaise > 0n) {
        entries.push({
          entryId: `j_${txId}_dr_tax`,
          transactionId: txId,
          timestamp,
          account: LEDGER_ACCOUNT_TYPES.TAX_EXPENSE,
          debitPaise: taxesPaise,
          creditPaise: 0n,
          description: `STT / statutory tax for ${txId}`
        });
      }

      // Credit: Cash Settlement (net cash outflow)
      entries.push({
        entryId: `j_${txId}_cr_cash`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT,
        debitPaise: 0n,
        creditPaise: cashMovement.netCashAmountPaise,
        description: `Cash outflow for purchase of ${tx.instrumentId || 'asset'}`
      });
      break;
    }

    case TRANSACTION_TYPES.SELL:
    case TRANSACTION_TYPES.REDEMPTION:
    case TRANSACTION_TYPES.MATURITY: {
      // Debit: Cash Settlement (net cash inflow)
      entries.push({
        entryId: `j_${txId}_dr_cash`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT,
        debitPaise: cashMovement.netCashAmountPaise,
        creditPaise: 0n,
        description: `Cash inflow from sale of ${tx.instrumentId || 'asset'}`
      });

      // Debit: Fees Expense (if any)
      if (feesPaise > 0n) {
        entries.push({
          entryId: `j_${txId}_dr_fee`,
          transactionId: txId,
          timestamp,
          account: LEDGER_ACCOUNT_TYPES.FEES_EXPENSE,
          debitPaise: feesPaise,
          creditPaise: 0n,
          description: `Brokerage / fee on sale of ${txId}`
        });
      }

      // Debit: Tax Expense (if any)
      if (taxesPaise > 0n) {
        entries.push({
          entryId: `j_${txId}_dr_tax`,
          transactionId: txId,
          timestamp,
          account: LEDGER_ACCOUNT_TYPES.TAX_EXPENSE,
          debitPaise: taxesPaise,
          creditPaise: 0n,
          description: `STT / capital gains tax withheld on ${txId}`
        });
      }

      // Credit: Asset Investment (gross liquidation)
      entries.push({
        entryId: `j_${txId}_cr_asset`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.ASSET_INVESTMENT,
        debitPaise: 0n,
        creditPaise: grossPaise,
        description: `Disposal of ${tx.instrumentId || 'asset'}`
      });
      break;
    }

    case TRANSACTION_TYPES.DIVIDEND: {
      // Debit: Cash Settlement (net dividend received)
      entries.push({
        entryId: `j_${txId}_dr_cash`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT,
        debitPaise: cashMovement.netCashAmountPaise,
        creditPaise: 0n,
        description: `Dividend receipt from ${tx.instrumentId || 'asset'}`
      });

      if (taxesPaise > 0n) {
        entries.push({
          entryId: `j_${txId}_dr_tax`,
          transactionId: txId,
          timestamp,
          account: LEDGER_ACCOUNT_TYPES.TAX_EXPENSE,
          debitPaise: taxesPaise,
          creditPaise: 0n,
          description: `TDS on dividend for ${txId}`
        });
      }

      // Credit: Dividend Income (gross)
      entries.push({
        entryId: `j_${txId}_cr_income`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.DIVIDEND_INCOME,
        debitPaise: 0n,
        creditPaise: grossPaise,
        description: `Gross dividend income from ${tx.instrumentId || 'asset'}`
      });
      break;
    }

    case TRANSACTION_TYPES.INTEREST: {
      // Debit: Cash Settlement (net interest received)
      entries.push({
        entryId: `j_${txId}_dr_cash`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT,
        debitPaise: cashMovement.netCashAmountPaise,
        creditPaise: 0n,
        description: `Coupon / interest receipt from ${tx.instrumentId || 'asset'}`
      });

      if (taxesPaise > 0n) {
        entries.push({
          entryId: `j_${txId}_dr_tax`,
          transactionId: txId,
          timestamp,
          account: LEDGER_ACCOUNT_TYPES.TAX_EXPENSE,
          debitPaise: taxesPaise,
          creditPaise: 0n,
          description: `TDS on coupon for ${txId}`
        });
      }

      // Credit: Interest Income (gross)
      entries.push({
        entryId: `j_${txId}_cr_income`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.INTEREST_INCOME,
        debitPaise: 0n,
        creditPaise: grossPaise,
        description: `Gross interest income from ${tx.instrumentId || 'asset'}`
      });
      break;
    }

    case TRANSACTION_TYPES.FEE: {
      // Debit: Fees Expense
      entries.push({
        entryId: `j_${txId}_dr_fee`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.FEES_EXPENSE,
        debitPaise: grossPaise,
        creditPaise: 0n,
        description: `Depository / maintenance fee for ${tx.instrumentId || tx.accountId}`
      });
      // Credit: Cash Settlement
      entries.push({
        entryId: `j_${txId}_cr_cash`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT,
        debitPaise: 0n,
        creditPaise: grossPaise,
        description: `Cash payment for fee on ${txId}`
      });
      break;
    }

    case TRANSACTION_TYPES.TAX: {
      // Debit: Tax Expense
      entries.push({
        entryId: `j_${txId}_dr_tax`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.TAX_EXPENSE,
        debitPaise: grossPaise,
        creditPaise: 0n,
        description: `Direct tax payment for ${tx.instrumentId || tx.accountId}`
      });
      // Credit: Cash Settlement
      entries.push({
        entryId: `j_${txId}_cr_cash`,
        transactionId: txId,
        timestamp,
        account: LEDGER_ACCOUNT_TYPES.CASH_SETTLEMENT,
        debitPaise: 0n,
        creditPaise: grossPaise,
        description: `Cash payment for tax on ${txId}`
      });
      break;
    }

    case TRANSACTION_TYPES.BONUS:
    case TRANSACTION_TYPES.STOCK_SPLIT:
    case TRANSACTION_TYPES.MERGER:
    case TRANSACTION_TYPES.TRANSFER_IN:
    case TRANSACTION_TYPES.TRANSFER_OUT: {
      // Pure quantity-based corporate actions/transfers have zero cash balance impact in basic ledger
      // Recorded in transaction journal for audit provenance
      break;
    }

    default:
      throw new Error(`Unsupported transaction type for journal generation: ${tx.transactionType}`);
  }

  if (entries.length > 0) {
    assertJournalBalanced(entries);
  }

  return entries;
}

/**
 * Creates exact symmetric compensating reversal entries for an original journal entry array.
 *
 * @param {Array<Object>} originalEntries
 * @param {string} reversalTxId
 * @returns {Array<Object>} Inverted balanced compensating entries
 */
export function createReversalJournalEntries(originalEntries, reversalTxId) {
  if (!Array.isArray(originalEntries) || originalEntries.length === 0) {
    return [];
  }

  assertJournalBalanced(originalEntries);

  const timestamp = new Date().toISOString();
  const compensatingEntries = originalEntries.map((entry, idx) => ({
    entryId: `j_rev_${reversalTxId}_${idx}`,
    transactionId: reversalTxId,
    timestamp,
    account: entry.account,
    debitPaise: entry.creditPaise,   // Swapped
    creditPaise: entry.debitPaise,   // Swapped
    description: `Compensating reversal of ${entry.entryId}: ${entry.description || ''}`
  }));

  assertJournalBalanced(compensatingEntries);
  return compensatingEntries;
}

/**
 * Computes net balances per ledger account from an array of journal entries.
 *
 * @param {Array<Object>} journalEntries
 * @returns {Record<string, { debitsPaise: bigint, creditsPaise: bigint, netDebitPaise: bigint, netCreditPaise: bigint }>}
 */
export function calculateLedgerBalances(journalEntries) {
  const accounts = {};

  for (const entry of journalEntries) {
    const acc = entry.account;
    if (!accounts[acc]) {
      accounts[acc] = {
        account: acc,
        debitsPaise: 0n,
        creditsPaise: 0n,
        netDebitPaise: 0n,
        netCreditPaise: 0n
      };
    }
    accounts[acc].debitsPaise += BigInt(entry.debitPaise || 0n);
    accounts[acc].creditsPaise += BigInt(entry.creditPaise || 0n);
  }

  for (const acc of Object.values(accounts)) {
    acc.netDebitPaise = acc.debitsPaise - acc.creditsPaise;
    acc.netCreditPaise = acc.creditsPaise - acc.debitsPaise;
  }

  return accounts;
}
