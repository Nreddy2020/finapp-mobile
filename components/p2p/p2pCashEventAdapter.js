/**
 * FinLife P2P Loans — Cash Event Adapter
 * Bridges P2P Double-Entry Journal Events to Money Flow Cash Truth transactions.
 * Enforces zero-burn asset swap tagging, idempotency, and semantic financial classification.
 */

import { JOURNAL_EVENT_TYPES } from './p2pDomainModel.js';

/**
 * Converts a single P2P Journal Entry into one or more Money Flow Transaction records
 */
export function convertJournalEntryToMoneyFlowTransactions(journalEntry, personsMap = {}, loansMap = {}) {
    if (!journalEntry || !journalEntry.eventType) return [];

    const loan = loansMap[journalEntry.sourceEntityId] || {};
    const person = personsMap[loan.personId] || { name: 'P2P Counterparty' };
    const dateStr = (journalEntry.timestamp || '').split('T')[0] || new Date().toISOString().split('T')[0];
    const baseId = `mf_${journalEntry.journalEntryId}`;

    const transactions = [];

    switch (journalEntry.eventType) {
        case JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN:
        case JOURNAL_EVENT_TYPES.P2P_ADVANCE_GIVEN: {
            // Cash Outflow: Asset swap (Cash -> P2P Receivable). NOT a lifestyle/burn expense!
            transactions.push({
                id: `${baseId}_disb`,
                journalEntryId: journalEntry.journalEntryId,
                amount: journalEntry.amount,
                date: dateStr,
                type: 'EXPENSE', // Outflow from cash account
                category: 'P2P Loan Given',
                merchant: person.name,
                account: journalEntry.accountFrom || loan.accountId || 'HDFC Savings Account',
                desc: `P2P Loan Given to ${person.name}`,
                notes: journalEntry.note,
                isP2P: true,
                isBurnExpense: false, // NON-BURN: Asset swap
                isExcludedFromBurn: true,
                needsSort: false,
                status: 'PARSED'
            });
            break;
        }

        case JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN:
        case JOURNAL_EVENT_TYPES.P2P_ADVANCE_TAKEN: {
            // Cash Inflow: Liability creation (P2P Payable -> Cash). NOT ordinary income!
            transactions.push({
                id: `${baseId}_borrow`,
                journalEntryId: journalEntry.journalEntryId,
                amount: journalEntry.amount,
                date: dateStr,
                type: 'INCOME', // Inflow into cash account
                category: 'P2P Loan Taken',
                merchant: person.name,
                account: journalEntry.accountTo || loan.accountId || 'HDFC Savings Account',
                desc: `P2P Loan Borrowed from ${person.name}`,
                notes: journalEntry.note,
                isP2P: true,
                isOrdinaryIncome: false, // NON-REVENUE: Debt inflow
                needsSort: false,
                status: 'PARSED'
            });
            break;
        }

        case JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED: {
            // Cash Inflow split into: Principal portion (Asset reduction) + Interest portion (Income)
            const pCredit = (journalEntry.credits || []).find(c => c.account === 'ASSET_P2P_RECEIVABLE' || c.account === 'P2P_RECEIVABLE');
            const iCredit = (journalEntry.credits || []).find(c => c.account === 'INCOME_P2P_INTEREST' || c.account === 'INTEREST_INCOME');
            const pAmt = pCredit ? pCredit.amount : journalEntry.amount;
            const iAmt = iCredit ? iCredit.amount : 0;

            if (pAmt > 0) {
                transactions.push({
                    id: `${baseId}_prin`,
                    journalEntryId: journalEntry.journalEntryId,
                    amount: pAmt,
                    date: dateStr,
                    type: 'INCOME',
                    category: 'P2P Principal Repaid',
                    merchant: person.name,
                    account: journalEntry.accountTo || loan.accountId || 'HDFC Savings Account',
                    desc: `Principal Repayment from ${person.name}`,
                    isP2P: true,
                    isOrdinaryIncome: false, // Return of capital, not ordinary income
                    needsSort: false,
                    status: 'PARSED'
                });
            }

            if (iAmt > 0) {
                transactions.push({
                    id: `${baseId}_int`,
                    journalEntryId: journalEntry.journalEntryId,
                    amount: iAmt,
                    date: dateStr,
                    type: 'INCOME',
                    category: 'P2P Interest Income',
                    merchant: person.name,
                    account: journalEntry.accountTo || loan.accountId || 'HDFC Savings Account',
                    desc: `Interest Earned from ${person.name}`,
                    isP2P: true,
                    isOrdinaryIncome: true, // Taxable P&L income
                    needsSort: false,
                    status: 'PARSED'
                });
            }
            break;
        }

        case JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID: {
            // Cash Outflow split into: Principal portion (Liability reduction) + Interest portion (Financing Expense)
            const pDebit = (journalEntry.debits || []).find(d => d.account === 'LIABILITY_P2P_PAYABLE' || d.account === 'P2P_PAYABLE');
            const iDebit = (journalEntry.debits || []).find(d => d.account === 'EXPENSE_P2P_INTEREST' || d.account === 'INTEREST_EXPENSE');
            const pAmt = pDebit ? pDebit.amount : journalEntry.amount;
            const iAmt = iDebit ? iDebit.amount : 0;

            if (pAmt > 0) {
                transactions.push({
                    id: `${baseId}_prin`,
                    journalEntryId: journalEntry.journalEntryId,
                    amount: pAmt,
                    date: dateStr,
                    type: 'EXPENSE',
                    category: 'P2P Principal Repayment',
                    merchant: person.name,
                    account: journalEntry.accountFrom || loan.accountId || 'HDFC Savings Account',
                    desc: `Principal Repayment to ${person.name}`,
                    isP2P: true,
                    isBurnExpense: false, // Debt reduction, not burn
                    isExcludedFromBurn: true,
                    needsSort: false,
                    status: 'PARSED'
                });
            }

            if (iAmt > 0) {
                transactions.push({
                    id: `${baseId}_int`,
                    journalEntryId: journalEntry.journalEntryId,
                    amount: iAmt,
                    date: dateStr,
                    type: 'EXPENSE',
                    category: 'P2P Interest Expense',
                    merchant: person.name,
                    account: journalEntry.accountFrom || loan.accountId || 'HDFC Savings Account',
                    desc: `Interest Paid to ${person.name}`,
                    isP2P: true,
                    isBurnExpense: true, // Financing cost
                    needsSort: false,
                    status: 'PARSED'
                });
            }
            break;
        }

        case JOURNAL_EVENT_TYPES.P2P_SETTLEMENT: {
            const isGiven = loan.direction === 'GIVEN';
            transactions.push({
                id: `${baseId}_settle`,
                journalEntryId: journalEntry.journalEntryId,
                amount: journalEntry.amount,
                date: dateStr,
                type: isGiven ? 'INCOME' : 'EXPENSE',
                category: isGiven ? 'P2P Settlement Received' : 'P2P Settlement Paid',
                merchant: person.name,
                account: isGiven ? journalEntry.accountTo : journalEntry.accountFrom,
                desc: `Full Settlement with ${person.name}`,
                isP2P: true,
                isBurnExpense: false,
                isExcludedFromBurn: true,
                needsSort: false,
                status: 'PARSED'
            });
            break;
        }

        default:
            break;
    }

    return transactions;
}

/**
 * Single journal entry adapter helper
 */
export function adaptJournalEntryToMoneyFlowTx(journalEntry) {
    if (!journalEntry) return null;
    const dateStr = (journalEntry.timestamp || '').split('T')[0] || new Date().toISOString().split('T')[0];
    const isOutflow = journalEntry.eventType === 'P2P_LOAN_GIVEN' || journalEntry.eventType === 'P2P_REPAYMENT_PAID';

    let principalAmount = 0;
    let interestAmount = 0;

    if (journalEntry.credits) {
        const pCredit = journalEntry.credits.find(c => c.account === 'ASSET_P2P_RECEIVABLE' || c.account === 'P2P_RECEIVABLE' || c.account === 'LIABILITY_P2P_PAYABLE');
        if (pCredit) principalAmount = pCredit.amount;
        const iCredit = journalEntry.credits.find(c => c.account === 'INCOME_P2P_INTEREST' || c.account === 'INTEREST_INCOME');
        if (iCredit) interestAmount = iCredit.amount;
    }
    if (journalEntry.debits) {
        const pDebit = journalEntry.debits.find(d => d.account === 'LIABILITY_P2P_PAYABLE' || d.account === 'P2P_PAYABLE');
        if (pDebit) principalAmount = pDebit.amount;
        const iDebit = journalEntry.debits.find(d => d.account === 'EXPENSE_P2P_INTEREST' || d.account === 'INTEREST_EXPENSE');
        if (iDebit) interestAmount = iDebit.amount;
    }

    return {
        id: `mf_${journalEntry.journalEntryId || Date.now()}`,
        journalEntryId: journalEntry.journalEntryId,
        amount: journalEntry.amount,
        date: dateStr,
        type: isOutflow ? 'EXPENSE' : 'INCOME',
        category: journalEntry.eventType,
        isP2P: true,
        isBurnExpense: false,
        isOrdinaryIncome: false,
        principalAmount,
        interestAmount,
        notes: journalEntry.note || ''
    };
}

/**
 * Batch journal entries adapter helper
 */
export function generateMoneyFlowTransactionsForLoan(journalEntries = []) {
    return journalEntries.map(adaptJournalEntryToMoneyFlowTx).filter(Boolean);
}

/**
 * Idempotently maps a collection of P2P Journal Entries to Money Flow transaction records
 */
export function mapP2PJournalToMoneyFlowTransactions(journalEntries = [], persons = [], loans = []) {
    const personsMap = {};
    (persons || []).forEach(p => { personsMap[p.id] = p; });

    const loansMap = {};
    (loans || []).forEach(l => { loansMap[l.id] = l; });

    const seenJournalIds = new Set();
    const allTransactions = [];

    (journalEntries || []).forEach(je => {
        if (!je || seenJournalIds.has(je.journalEntryId)) return;
        seenJournalIds.add(je.journalEntryId);

        const txs = convertJournalEntryToMoneyFlowTransactions(je, personsMap, loansMap);
        allTransactions.push(...txs);
    });

    return allTransactions;
}
