/**
 * FinLife P2P Loans — Cash Event Adapter
 * Bridges P2P Double-Entry Journal Events to Money Flow Cash Truth transactions.
 * Enforces zero-burn asset swap tagging, composite-key idempotency, and semantic financial classification.
 */

import { JOURNAL_EVENT_TYPES, LOAN_DIRECTION } from './p2pDomainModel.js';

/**
 * Converts a single P2P Journal Entry into one or more Money Flow Transaction records
 * Each transaction has a deterministic composite ID: mf_p2p_${journalEntryId}_${component}
 * Zero-value components are strictly omitted!
 */
export function convertJournalEntryToMoneyFlowTransactions(journalEntry, personsMap = {}, loansMap = {}) {
    if (!journalEntry || !journalEntry.eventType) return [];

    const jeId = journalEntry.id || journalEntry.journalEntryId || 'je';
    const loan = loansMap[journalEntry.entityId || journalEntry.sourceEntityId] || {};
    const personId = journalEntry.entityType === 'PERSON_RELATIONSHIP'
        ? (journalEntry.entityId || journalEntry.sourceEntityId)
        : (loan.personId || journalEntry.entityId);
    const person = personsMap[personId] || { name: 'P2P Counterparty' };
    const dateStr = journalEntry.eventDate || (journalEntry.timestamp || '').split('T')[0] || new Date().toISOString().split('T')[0];

    const transactions = [];

    // Derive cash account from lines or fallback
    const cashLine = (journalEntry.lines || []).find(l => !l.accountId.includes('P2P_') && !l.accountId.includes('INCOME') && !l.accountId.includes('EXPENSE'));
    const resolvedAccount = cashLine?.accountId || journalEntry.accountFrom || journalEntry.accountTo || loan.accountId || 'HDFC Savings Account';

    switch (journalEntry.eventType) {
        case JOURNAL_EVENT_TYPES.P2P_LOAN_GIVEN:
        case JOURNAL_EVENT_TYPES.P2P_ADVANCE_GIVEN: {
            // Cash Outflow: Asset swap (Cash -> P2P Receivable). STRICTLY A TRANSFER!
            const amt = Number(journalEntry.amount) || (journalEntry.lines ? journalEntry.lines.find(l => l.credit > 0)?.credit : 0) || 0;
            if (amt > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_capital`,
                    journalEntryId: jeId,
                    amount: amt,
                    date: dateStr,
                    type: 'TRANSFER', // Strictly TRANSFER so it never distorts lifestyle burn
                    transferType: 'P2P_OUTFLOW',
                    category: 'P2P Loan Given',
                    merchant: person.name,
                    account: resolvedAccount,
                    desc: `P2P Loan Given to ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: false,
                    isOrdinaryIncome: false,
                    isExcludedFromBurn: true,
                    needsSort: false,
                    status: 'PARSED'
                });
            }
            break;
        }

        case JOURNAL_EVENT_TYPES.P2P_LOAN_TAKEN:
        case JOURNAL_EVENT_TYPES.P2P_ADVANCE_TAKEN: {
            // Cash Inflow: Liability creation (P2P Payable -> Cash). STRICTLY A TRANSFER!
            const amt = Number(journalEntry.amount) || (journalEntry.lines ? journalEntry.lines.find(l => l.debit > 0)?.debit : 0) || 0;
            if (amt > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_capital`,
                    journalEntryId: jeId,
                    amount: amt,
                    date: dateStr,
                    type: 'TRANSFER', // Strictly TRANSFER so it never distorts ordinary income
                    transferType: 'P2P_INFLOW',
                    category: 'P2P Loan Taken',
                    merchant: person.name,
                    account: resolvedAccount,
                    desc: `P2P Loan Borrowed from ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: false,
                    isOrdinaryIncome: false,
                    isExcludedFromBurn: true,
                    needsSort: false,
                    status: 'PARSED'
                });
            }
            break;
        }

        case JOURNAL_EVENT_TYPES.P2P_REPAYMENT_RECEIVED:
        case JOURNAL_EVENT_TYPES.P2P_PREPAYMENT_RECEIVED: {
            // Cash Inflow split into: Principal (TRANSFER) + Interest (INCOME)
            let pAmt = 0;
            let iAmt = 0;

            if (Array.isArray(journalEntry.lines)) {
                const pLine = journalEntry.lines.find(l => l.accountId === 'ASSET_P2P_RECEIVABLE' && l.credit > 0);
                if (pLine) pAmt = pLine.credit;
                const iLine = journalEntry.lines.find(l => l.accountId === 'INCOME_P2P_INTEREST' && l.credit > 0);
                if (iLine) iAmt = iLine.credit;
            } else if (Array.isArray(journalEntry.credits)) {
                const pCredit = journalEntry.credits.find(c => c.account === 'ASSET_P2P_RECEIVABLE');
                if (pCredit) pAmt = pCredit.amount;
                const iCredit = journalEntry.credits.find(c => c.account === 'INCOME_P2P_INTEREST');
                if (iCredit) iAmt = iCredit.amount;
            }

            if (pAmt > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_principal`,
                    journalEntryId: jeId,
                    amount: pAmt,
                    date: dateStr,
                    type: 'TRANSFER',
                    transferType: 'P2P_INFLOW',
                    category: 'P2P Principal Inflow',
                    merchant: person.name,
                    account: resolvedAccount,
                    desc: `Principal Repayment from ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: false,
                    isOrdinaryIncome: false,
                    isExcludedFromBurn: true,
                    needsSort: false,
                    status: 'PARSED'
                });
            }

            if (iAmt > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_interest`,
                    journalEntryId: jeId,
                    amount: iAmt,
                    date: dateStr,
                    type: 'INCOME',
                    category: 'P2P Interest Income',
                    merchant: person.name,
                    account: resolvedAccount,
                    desc: `Interest Earned from ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: false,
                    isOrdinaryIncome: true, // Taxable financial revenue
                    needsSort: false,
                    status: 'PARSED'
                });
            }
            break;
        }

        case JOURNAL_EVENT_TYPES.P2P_REPAYMENT_PAID:
        case JOURNAL_EVENT_TYPES.P2P_PREPAYMENT_PAID: {
            // Cash Outflow split into: Principal (TRANSFER) + Interest (EXPENSE)
            let pAmt = 0;
            let iAmt = 0;

            if (Array.isArray(journalEntry.lines)) {
                const pLine = journalEntry.lines.find(l => l.accountId === 'LIABILITY_P2P_PAYABLE' && l.debit > 0);
                if (pLine) pAmt = pLine.debit;
                const iLine = journalEntry.lines.find(l => l.accountId === 'EXPENSE_P2P_INTEREST' && l.debit > 0);
                if (iLine) iAmt = iLine.debit;
            } else if (Array.isArray(journalEntry.debits)) {
                const pDebit = journalEntry.debits.find(d => d.account === 'LIABILITY_P2P_PAYABLE');
                if (pDebit) pAmt = pDebit.amount;
                const iDebit = journalEntry.debits.find(d => d.account === 'EXPENSE_P2P_INTEREST');
                if (iDebit) iAmt = iDebit.amount;
            }

            if (pAmt > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_principal`,
                    journalEntryId: jeId,
                    amount: pAmt,
                    date: dateStr,
                    type: 'TRANSFER',
                    transferType: 'P2P_OUTFLOW',
                    category: 'P2P Principal Outflow',
                    merchant: person.name,
                    account: resolvedAccount,
                    desc: `Principal Repayment to ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: false,
                    isOrdinaryIncome: false,
                    isExcludedFromBurn: true,
                    needsSort: false,
                    status: 'PARSED'
                });
            }

            if (iAmt > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_interest`,
                    journalEntryId: jeId,
                    amount: iAmt,
                    date: dateStr,
                    type: 'EXPENSE',
                    category: 'P2P Interest Expense',
                    merchant: person.name,
                    account: resolvedAccount,
                    desc: `Interest Paid to ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: true, // Financing cost
                    isOrdinaryIncome: false,
                    needsSort: false,
                    status: 'PARSED'
                });
            }
            break;
        }

        case JOURNAL_EVENT_TYPES.RELATIONSHIP_SETTLEMENT: {
            // Net cash movement from multi-loan person level settlement
            const cashLineIn = (journalEntry.lines || []).find(l => !l.accountId.includes('P2P_') && l.debit > 0);
            const cashLineOut = (journalEntry.lines || []).find(l => !l.accountId.includes('P2P_') && l.credit > 0);

            if (cashLineIn && cashLineIn.debit > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_capital`,
                    journalEntryId: jeId,
                    amount: cashLineIn.debit,
                    date: dateStr,
                    type: 'TRANSFER',
                    transferType: 'P2P_INFLOW',
                    category: 'P2P Settlement Inflow',
                    merchant: person.name,
                    account: cashLineIn.accountId || resolvedAccount,
                    desc: `Net Relationship Settlement from ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: false,
                    isOrdinaryIncome: false,
                    isExcludedFromBurn: true,
                    needsSort: false,
                    status: 'PARSED'
                });
            } else if (cashLineOut && cashLineOut.credit > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_capital`,
                    journalEntryId: jeId,
                    amount: cashLineOut.credit,
                    date: dateStr,
                    type: 'TRANSFER',
                    transferType: 'P2P_OUTFLOW',
                    category: 'P2P Settlement Outflow',
                    merchant: person.name,
                    account: cashLineOut.accountId || resolvedAccount,
                    desc: `Net Relationship Settlement to ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: false,
                    isOrdinaryIncome: false,
                    isExcludedFromBurn: true,
                    needsSort: false,
                    status: 'PARSED'
                });
            }
            break;
        }

        case JOURNAL_EVENT_TYPES.P2P_SETTLEMENT: {
            const isGiven = (loan.direction === LOAN_DIRECTION.GIVEN || journalEntry.direction === 'GIVEN');
            const cashDebit = (journalEntry.lines || []).find(l => !l.accountId.includes('P2P_') && !l.accountId.includes('WAIVER') && l.debit > 0);
            const cashCredit = (journalEntry.lines || []).find(l => !l.accountId.includes('P2P_') && !l.accountId.includes('WAIVER') && l.credit > 0);
            const cashAmt = cashDebit ? cashDebit.debit : (cashCredit ? cashCredit.credit : journalEntry.amount);

            if (cashAmt > 0) {
                transactions.push({
                    id: `mf_p2p_${jeId}_capital`,
                    journalEntryId: jeId,
                    amount: cashAmt,
                    date: dateStr,
                    type: 'TRANSFER',
                    transferType: isGiven ? 'P2P_INFLOW' : 'P2P_OUTFLOW',
                    category: isGiven ? 'P2P Settlement Received' : 'P2P Settlement Paid',
                    merchant: person.name,
                    account: resolvedAccount,
                    desc: `Full Settlement of Loan with ${person.name}`,
                    notes: journalEntry.note || '',
                    isP2P: true,
                    isBurnExpense: false,
                    isOrdinaryIncome: false,
                    isExcludedFromBurn: true,
                    needsSort: false,
                    status: 'PARSED'
                });
            }
            break;
        }

        default:
            break;
    }

    return transactions;
}

/**
 * Idempotently maps a collection of P2P Journal Entries to Money Flow transaction records
 */
export function mapP2PJournalToMoneyFlowTransactions(journalEntries = [], persons = [], loans = []) {
    const personsMap = {};
    (persons || []).forEach(p => { personsMap[p.id] = p; });

    const loansMap = {};
    (loans || []).forEach(l => { loansMap[l.id] = l; });

    const seenTxIds = new Set();
    const allTransactions = [];

    (journalEntries || []).forEach(je => {
        if (!je) return;
        const txs = convertJournalEntryToMoneyFlowTransactions(je, personsMap, loansMap);
        txs.forEach(tx => {
            if (!seenTxIds.has(tx.id)) {
                seenTxIds.add(tx.id);
                allTransactions.push(tx);
            }
        });
    });

    return allTransactions;
}

