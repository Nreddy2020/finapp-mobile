/**
 * FinLife Banking Relationship Intelligence — Cash Event & Money Flow Adapter
 * 
 * Bridges Banking double-entry journal entries into canonical Money Flow transactions.
 * Guarantees zero lifestyle burn for principal movements, strict expense classification for interest/fees,
 * debt-service tagging (isDebtService: true), and deterministic idempotency (BANK-33).
 */

import { fromPaise } from './bankingDomainModel.js';

/**
 * Converts a single BankingJournalEntry into an array of Money Flow transactions.
 */
export function convertBankingJournalEntryToMoneyFlowTransactions(journalEntry, banksMap = {}, accountsMap = {}, loansMap = {}) {
    if (!journalEntry || !Array.isArray(journalEntry.lines)) return [];

    const transactions = [];
    const entryId = journalEntry.id;
    const date = journalEntry.eventDate || journalEntry.effectiveDate || new Date().toISOString().split('T')[0];

    const bank = banksMap[journalEntry.metadata?.bankId] || null;
    const loan = loansMap[journalEntry.entityId] || null;
    const bankName = bank?.name || loan?.loanName || 'Bank';

    // Find Cash Line
    const cashLine = journalEntry.lines.find(l => l.component === 'CASH');
    const cashAccountId = cashLine?.bankAccountId || (cashLine?.accountId ? cashLine.accountId.replace('ASSET_BANK_CASH_', '') : 'bank_account_primary');
    const cashAccount = accountsMap[cashAccountId] || null;
    const accountLabel = cashAccount?.accountName || 'Bank Account';

    journalEntry.lines.forEach(line => {
        // We project money flow from non-cash balancing lines to correctly classify intent
        if (line.component === 'PRINCIPAL') {
            if (line.debitPaise > 0) {
                // Principal paid by user (EMI / Prepayment / Foreclosure) -> Capital outflow / Transfer
                transactions.push({
                    id: `mf_bank_${entryId}_principal`,
                    journalEntryId: entryId,
                    date,
                    amount: fromPaise(line.debitPaise),
                    amountPaise: line.debitPaise,
                    type: 'TRANSFER',
                    transferType: 'BANK_LOAN_PRINCIPAL',
                    category: 'Bank Loan Principal Repayment',
                    merchant: bankName,
                    description: `Principal repayment for ${loan?.loanName || 'Loan'}`,
                    account: accountLabel,
                    accountId: cashAccountId,
                    isBurnExpense: false,     // ZERO LIFESTYLE BURN
                    isOrdinaryIncome: false,
                    isDebtService: true,      // DEBT SERVICE TRACKING
                    linkedEntityType: 'BANK_LOAN',
                    linkedEntityId: line.loanId || journalEntry.entityId,
                    status: 'cleared',
                    source: 'banking_journal'
                });
            } else if (line.creditPaise > 0 && journalEntry.eventType === 'BANK_LOAN_DISBURSED') {
                // Loan disbursed to user -> Capital inflow / Transfer (NOT income)
                transactions.push({
                    id: `mf_bank_${entryId}_disbursement`,
                    journalEntryId: entryId,
                    date,
                    amount: fromPaise(line.creditPaise),
                    amountPaise: line.creditPaise,
                    type: 'TRANSFER',
                    transferType: 'BANK_LOAN_DISBURSEMENT',
                    category: 'Bank Loan Disbursement',
                    merchant: bankName,
                    description: `Loan disbursement for ${loan?.loanName || 'Loan'}`,
                    account: accountLabel,
                    accountId: cashAccountId,
                    isBurnExpense: false,
                    isOrdinaryIncome: false,  // NOT ORDINARY INCOME
                    isDebtService: false,
                    linkedEntityType: 'BANK_LOAN',
                    linkedEntityId: line.loanId || journalEntry.entityId,
                    status: 'cleared',
                    source: 'banking_journal'
                });
            }
        } else if (line.component === 'INTEREST') {
            if (line.debitPaise > 0) {
                // Interest paid by user -> REAL EXPENSE
                transactions.push({
                    id: `mf_bank_${entryId}_interest`,
                    journalEntryId: entryId,
                    date,
                    amount: fromPaise(line.debitPaise),
                    amountPaise: line.debitPaise,
                    type: 'EXPENSE',
                    category: 'Bank Loan Interest',
                    merchant: bankName,
                    description: `Interest charge on ${loan?.loanName || 'Loan'}`,
                    account: accountLabel,
                    accountId: cashAccountId,
                    isBurnExpense: true,      // REAL FINANCIAL COST
                    isOrdinaryIncome: false,
                    isDebtService: true,
                    linkedEntityType: 'BANK_LOAN',
                    linkedEntityId: line.loanId || journalEntry.entityId,
                    status: 'cleared',
                    source: 'banking_journal'
                });
            }
        } else if (line.component === 'FEE' || line.component === 'PENALTY') {
            if (line.debitPaise > 0) {
                transactions.push({
                    id: `mf_bank_${entryId}_${line.component.toLowerCase()}`,
                    journalEntryId: entryId,
                    date,
                    amount: fromPaise(line.debitPaise),
                    amountPaise: line.debitPaise,
                    type: 'EXPENSE',
                    category: line.component === 'PENALTY' ? 'Bank Loan Penalty' : 'Bank Loan Fee',
                    merchant: bankName,
                    description: `${line.component === 'PENALTY' ? 'Penalty' : 'Fee'} on ${loan?.loanName || 'Loan'}`,
                    account: accountLabel,
                    accountId: cashAccountId,
                    isBurnExpense: true,
                    isOrdinaryIncome: false,
                    isDebtService: true,
                    linkedEntityType: 'BANK_LOAN',
                    linkedEntityId: line.loanId || journalEntry.entityId,
                    status: 'cleared',
                    source: 'banking_journal'
                });
            }
        }
    });

    return transactions;
}

/**
 * Maps a full list of BankingJournalEntries to Money Flow transactions.
 */
export function mapBankingJournalToMoneyFlowTransactions(journalEntries = [], banks = [], accounts = [], loans = []) {
    const banksMap = {};
    (banks || []).forEach(b => { banksMap[b.id] = b; });

    const accountsMap = {};
    (accounts || []).forEach(a => { accountsMap[a.id] = a; });

    const loansMap = {};
    (loans || []).forEach(l => { loansMap[l.id] = l; });

    const allTxs = [];
    (journalEntries || []).forEach(entry => {
        const txs = convertBankingJournalEntryToMoneyFlowTransactions(entry, banksMap, accountsMap, loansMap);
        allTxs.push(...txs);
    });

    // Sort descending by date
    return allTxs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}
