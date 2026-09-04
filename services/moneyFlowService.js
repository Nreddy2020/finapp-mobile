/**
 * moneyFlowService.js
 * 
 * COORDINATED SERVICE FOR MONEY FLOW & SMS INGESTION
 * 
 * Invariants:
 * - SMS-01: Maintains complete provenance and confidence score for all ingested messages.
 * - SMS-02: Strict idempotency via fingerprinting to reject duplicate SMS records.
 * - SMS-03: Low-confidence transactions are quarantined in NEEDS_REVIEW.
 * - SMS-04: Conforms to unified canonical ledger schema.
 * - SMS-05: Zero presentation bias in data layer.
 * - SMS-06: Journal immutability; manual corrections create reviewed records.
 * - SMS-07: Safe parsing fault isolation.
 */

import { loadData, saveData } from './storage.js';
import { parseRawSMS } from './sms/smsParser.js';
import { normalizeSMSTransaction } from './sms/smsTransactionNormalizer.js';
import { isDuplicateTransaction } from './sms/smsDuplicateDetector.js';
import { partitionTransactionsByReviewStatus, confirmReviewTransaction } from './sms/smsReviewService.js';

export const STORAGE_KEY_MONEY_FLOW = 'FINLIFE_MF_TRANSACTIONS_V2';

// Rich realistic seed transactions showcasing SMS imports, reviews, manual cash, and transfers
export const SEED_MONEY_FLOW_TRANSACTIONS = [
    {
        id: 'tx_mf_sms_1',
        source: 'SMS',
        amount: 185000,
        type: 'INCOME',
        category: 'Salary / Income',
        categoryEmoji: '💰',
        merchant: 'Infosys Payroll',
        account: 'HDFC Savings Account',
        accountName: 'HDFC Savings Account',
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        status: 'COMMITTED',
        confidence: 0.98,
        rawSource: {
            sender: 'AD-HDFCBK',
            rawBody: 'Dear Customer, your A/C ending XX4821 has been credited with INR 1,85,000.00 on 04-Sep-26 towards INFOSYS TECH SALARY. Ref: UTR982103445.',
            referenceNumber: 'UTR982103445',
            maskedAccountNumber: '•••• 4821'
        }
    },
    {
        id: 'tx_mf_sms_2',
        source: 'SMS',
        amount: 28000,
        type: 'EXPENSE',
        category: 'Rent & Housing',
        categoryEmoji: '🏠',
        merchant: 'Prestige Society',
        account: 'HDFC Savings Account',
        accountName: 'HDFC Savings Account',
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        status: 'COMMITTED',
        confidence: 0.95,
        rawSource: {
            sender: 'AD-HDFCBK',
            rawBody: 'INR 28,000.00 debited from A/C **4821 to PRESTIGE MGT on 03-Sep-26. UPI Ref 382910384.',
            referenceNumber: '382910384',
            maskedAccountNumber: '•••• 4821'
        }
    },
    {
        id: 'tx_mf_sms_3',
        source: 'SMS',
        amount: 45000,
        type: 'INCOME',
        category: 'Salary / Income',
        categoryEmoji: '💰',
        merchant: 'Zerodha Broking',
        account: 'ICICI Current Account',
        accountName: 'ICICI Current Account',
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        status: 'COMMITTED',
        confidence: 0.95,
        rawSource: {
            sender: 'VM-ICICIB',
            rawBody: 'Account XX9901 credited with INR 45,000.00 via IMPS from ZERODHA BROKING on 02-Sep-26.',
            referenceNumber: 'IMPS3948102',
            maskedAccountNumber: '•••• 9901'
        }
    },
    {
        id: 'tx_mf_sms_4',
        source: 'SMS',
        amount: 18500,
        type: 'EXPENSE',
        category: 'Groceries & Food',
        categoryEmoji: '🍔',
        merchant: 'BigBasket Fresh',
        account: 'HDFC Savings Account',
        accountName: 'HDFC Savings Account',
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        status: 'COMMITTED',
        confidence: 0.92,
        rawSource: {
            sender: 'AD-HDFCBK',
            rawBody: 'Rs. 18500.00 spent on your Card ending 4821 at BIGBASKET BLR on 04-Sep-26. Ref: 984723.',
            referenceNumber: '984723',
            maskedAccountNumber: '•••• 4821'
        }
    },
    {
        id: 'tx_mf_sms_5',
        source: 'SMS',
        amount: 8999,
        type: 'EXPENSE',
        category: 'Utilities',
        categoryEmoji: '⚡',
        merchant: 'BESCOM Electricity',
        account: 'HDFC Savings Account',
        accountName: 'HDFC Savings Account',
        date: new Date(Date.now() - 4 * 86400000).toISOString(),
        status: 'COMMITTED',
        confidence: 0.95,
        rawSource: {
            sender: 'AD-HDFCBK',
            rawBody: 'Paid Rs. 8,999 to BESCOM POWER CORP via UPI from A/C XX4821 on 01-Sep-26.',
            referenceNumber: 'UPI948271',
            maskedAccountNumber: '•••• 4821'
        }
    },
    {
        id: 'tx_mf_sms_6',
        source: 'SMS',
        amount: 12400,
        type: 'EXPENSE',
        category: 'Travel & Transport',
        categoryEmoji: '✈️',
        merchant: 'Uber India',
        account: 'HDFC Savings Account',
        accountName: 'HDFC Savings Account',
        date: new Date(Date.now() - 2 * 86400000).toISOString(),
        status: 'COMMITTED',
        confidence: 0.90,
        rawSource: {
            sender: 'AD-HDFCBK',
            rawBody: 'Rs 12400.00 debited from A/C **4821 towards UBER INDIA RIDES. Ref TXN782103.',
            referenceNumber: 'TXN782103',
            maskedAccountNumber: '•••• 4821'
        }
    },
    {
        id: 'tx_mf_sms_7',
        source: 'SMS',
        amount: 10000,
        type: 'EXPENSE',
        category: 'Shopping',
        categoryEmoji: '🛍️',
        merchant: 'Amazon India',
        account: 'HDFC Savings Account',
        accountName: 'HDFC Savings Account',
        date: new Date(Date.now() - 3 * 86400000).toISOString(),
        status: 'COMMITTED',
        confidence: 0.95,
        rawSource: {
            sender: 'AD-HDFCBK',
            rawBody: 'Rs 10,000.00 spent on HDFC Card 4821 at AMAZON INDIA on 02-Sep-26. Ref AMZ98471.',
            referenceNumber: 'AMZ98471',
            maskedAccountNumber: '•••• 4821'
        }
    },
    // Needs Review Item 1: High-value unclassified transfer/payment
    {
        id: 'tx_mf_sms_rev_1',
        source: 'SMS',
        amount: 55000,
        type: 'INCOME',
        category: 'Needs Review',
        categoryEmoji: '❓',
        merchant: 'Direct UPI Transfer',
        account: 'SBI Savings Account',
        accountName: 'SBI Savings Account',
        date: new Date(Date.now() - 1 * 86400000).toISOString(),
        status: 'NEEDS_REVIEW',
        needsSort: true,
        confidence: 0.45,
        rawSource: {
            sender: 'AD-SBIUPI',
            rawBody: 'Your A/C XX3021 credited by Rs. 55,000.00 on 04-Sep-26 by UPI/TRANSFER/REF78921. What was this?',
            referenceNumber: 'REF78921',
            maskedAccountNumber: '•••• 3021'
        }
    },
    // Needs Review Item 2: Ambiguous merchant debit
    {
        id: 'tx_mf_sms_rev_2',
        source: 'SMS',
        amount: 4200,
        type: 'EXPENSE',
        category: 'Needs Review',
        categoryEmoji: '❓',
        merchant: 'POS 9482 Merchant',
        account: 'HDFC Savings Account',
        accountName: 'HDFC Savings Account',
        date: new Date().toISOString(),
        status: 'NEEDS_REVIEW',
        needsSort: true,
        confidence: 0.40,
        rawSource: {
            sender: 'AD-HDFCBK',
            rawBody: 'INR 4,200.00 debited from A/C XX4821 at POS 9482 VENDOR on 05-Sep-26. Ref: 482910.',
            referenceNumber: '482910',
            maskedAccountNumber: '•••• 4821'
        }
    },
    // Internal transfer: Zero income/expense impact
    {
        id: 'tx_mf_tr_1',
        source: 'MANUAL',
        amount: 25000,
        type: 'TRANSFER',
        category: 'Transfer',
        categoryEmoji: '🔄',
        merchant: 'HDFC to SBI Reserve Transfer',
        account: 'HDFC Savings Account',
        accountName: 'HDFC Savings Account',
        destinationAccountName: 'SBI Savings Account',
        date: new Date(Date.now() - 5 * 86400000).toISOString(),
        status: 'COMMITTED',
        confidence: 1.0
    }
];

let _storageMutationQueue = Promise.resolve();

export async function getStoredTransactions() {
    try {
        const stored = await loadData(STORAGE_KEY_MONEY_FLOW);
        if (stored && Array.isArray(stored) && stored.length > 0) {
            return stored;
        }
    } catch (e) {
        console.warn('[MoneyFlowService] Error loading stored transactions:', e);
    }
    return SEED_MONEY_FLOW_TRANSACTIONS;
}

export async function persistTransactions(transactions) {
    try {
        await saveData(STORAGE_KEY_MONEY_FLOW, transactions);
    } catch (e) {
        console.warn('[MoneyFlowService] Error persisting transactions:', e);
    }
}

/**
 * Executes an atomic mutation on the persisted transaction journal within a serialized queue.
 */
export async function executeAtomicJournalMutation(mutationFn) {
    return new Promise((resolve, reject) => {
        _storageMutationQueue = _storageMutationQueue
            .then(async () => {
                const currentJournal = await getStoredTransactions();
                const updatedJournal = await mutationFn(currentJournal);
                if (updatedJournal && Array.isArray(updatedJournal)) {
                    await persistTransactions(updatedJournal);
                    resolve(updatedJournal);
                } else {
                    resolve(currentJournal);
                }
            })
            .catch((err) => {
                console.warn('[MoneyFlowService] Atomic mutation error:', err);
                reject(err);
            });
    });
}

/**
 * Ingests an array of raw SMS messages into existing transactions ledger.
 */
export function ingestSMSMessages(smsMessages = [], existingTransactions = [], liquidAccounts = []) {
    const newTransactions = [];
    const seenFingerprints = new Set();

    for (const msg of smsMessages) {
        try {
            const parsed = parseRawSMS(msg.body || msg.text || msg.message, msg.sender || msg.address, msg.date || msg.timestamp);
            if (!parsed) continue;

            const normalized = normalizeSMSTransaction(parsed, liquidAccounts);
            if (!normalized) continue;

            if (isDuplicateTransaction(normalized, existingTransactions, seenFingerprints)) {
                continue;
            }

            newTransactions.push(normalized);
        } catch (err) {
            // Fault isolation (SMS-07)
            console.warn('[MoneyFlowService] Failed to ingest message safely:', err);
        }
    }

    return {
        importedTransactions: newTransactions,
        mergedTransactions: [...newTransactions, ...existingTransactions],
        count: newTransactions.length
    };
}

/**
 * Resolves a transaction from the NEEDS_REVIEW queue.
 */
export function resolveTransaction(transactions, txId, newCategory, newType = null) {
    return transactions.map(tx => {
        if (tx.id === txId) {
            return confirmReviewTransaction(tx, newCategory, newType);
        }
        return tx;
    });
}
