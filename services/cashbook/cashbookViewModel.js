/**
 * services/cashbook/cashbookViewModel.js
 * 
 * View Model presentation layer for FinLife Cashbook UI.
 * Pure transformation from repository/engine ledger data into UI-ready models.
 * 
 * Invariants:
 * - UI never performs raw currency math or balance aggregation.
 * - All display strings, Indian currency formats, colors, and section groups
 *   are deterministically pre-computed.
 */

import {
    AccountNature,
    TransactionType,
    TransactionStatus,
    formatMoneyPaise,
    createMoneyPaise,
    moneyToBigInt
} from './cashbookContracts.js';
import { computeAccountBalances, computePeriodSummary } from './cashbookEngine.js';

export const FilterType = Object.freeze({
    ALL: 'ALL',
    INCOME: 'INCOME',
    EXPENSE: 'EXPENSE',
    TRANSFER: 'TRANSFER'
});

/**
 * Builds the complete presentation View Model for the Cashbook screen.
 */
export function buildCashbookViewModel({ accounts, transactions, activeFilter = FilterType.ALL, selectedAccountId = null, searchQuery = '' }) {
    // 1. Account Balances
    const accountBalances = computeAccountBalances(accounts, transactions);
    const accountList = accounts.map(acc => {
        const bal = accountBalances[acc.id] || { paise: '0', formatted: '₹0', isNegative: false };
        return {
            id: acc.id,
            name: acc.name,
            type: acc.type,
            nature: acc.nature,
            institution: acc.institution || '',
            accountNumberLast4: acc.accountNumberLast4 || '',
            formattedBalance: bal.formatted,
            isNegative: bal.isNegative,
            isActive: acc.isActive
        };
    });

    // 2. Period Summary (Opening, Income, Expense, Transfers, Closing)
    const summary = computePeriodSummary(transactions);

    // Calculate total opening balance across asset accounts
    let openingPaise = 0n;
    for (const txn of transactions) {
        if (txn.transactionType === TransactionType.OPENING_BALANCE && txn.status !== TransactionStatus.VOIDED) {
            const acc = accounts.find(a => a.id === txn.accountId);
            if (!acc || acc.nature === AccountNature.ASSET) {
                openingPaise += moneyToBigInt(txn.amount);
            }
        }
    }
    const openingFormatted = formatMoneyPaise(createMoneyPaise(openingPaise));

    // Calculate aggregate closing balance across asset accounts
    let closingPaise = 0n;
    for (const acc of accounts) {
        if (acc.nature === AccountNature.ASSET) {
            const bal = accountBalances[acc.id];
            if (bal) {
                closingPaise += bal.bigIntPaise;
            }
        }
    }
    const isClosingNegative = closingPaise < 0n;
    const closingAbs = isClosingNegative ? -closingPaise : closingPaise;
    const closingFormatted = (isClosingNegative ? '-' : '') + formatMoneyPaise(createMoneyPaise(closingAbs));

    const balanceSummaryCard = {
        openingBalanceFormatted: openingFormatted,
        totalIncomeFormatted: summary.income.formatted,
        totalExpenseFormatted: summary.expense.formatted,
        netCashFlowFormatted: summary.netCashFlow.formatted,
        isNetPositive: summary.netCashFlow.isPositive,
        transferVolumeFormatted: summary.transfers.volumeFormatted,
        transferCount: summary.transfers.count,
        closingBalanceFormatted: closingFormatted
    };

    // 3. Filter Transactions
    const accountMap = new Map(accounts.map(a => [a.id, a]));
    let filteredTxns = transactions.filter(txn => {
        // Type filter
        if (activeFilter !== FilterType.ALL) {
            if (txn.transactionType !== activeFilter) return false;
        }

        // Account filter
        if (selectedAccountId) {
            const matchesAcc = txn.accountId === selectedAccountId ||
                txn.sourceAccountId === selectedAccountId ||
                txn.destinationAccountId === selectedAccountId;
            if (!matchesAcc) return false;
        }

        // Search query
        if (searchQuery && searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const matchDesc = (txn.description || '').toLowerCase().includes(q);
            const matchCat = (txn.category || '').toLowerCase().includes(q);
            const matchNote = (txn.notes || '').toLowerCase().includes(q);
            if (!matchDesc && !matchCat && !matchNote) return false;
        }

        return true;
    });

    // 4. Sort chronologically descending for display (most recent first)
    filteredTxns.sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date);
        if (dateComp !== 0) return dateComp;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

    // 5. Format Row Items
    const formattedRows = filteredTxns.map(t => {
        const isVoided = t.status === TransactionStatus.VOIDED;
        const amountPaise = createMoneyPaise(t.amount.paise);
        const rawFormatted = formatMoneyPaise(amountPaise);

        let formattedAmount = rawFormatted;
        let amountColor = '#94A3B8'; // default slate
        let accountDisplay = '';
        let typeBadge = { label: t.transactionType, color: '#64748B' };

        if (t.transactionType === TransactionType.INCOME) {
            formattedAmount = `+${rawFormatted}`;
            amountColor = isVoided ? '#94A3B8' : '#10B981'; // emerald
            const dest = accountMap.get(t.destinationAccountId || t.accountId);
            accountDisplay = dest ? dest.name : 'Income';
            typeBadge = { label: 'Income', color: '#10B981' };
        } else if (t.transactionType === TransactionType.EXPENSE) {
            formattedAmount = `-${rawFormatted}`;
            amountColor = isVoided ? '#94A3B8' : '#EF4444'; // rose
            const src = accountMap.get(t.sourceAccountId || t.accountId);
            accountDisplay = src ? src.name : 'Expense';
            typeBadge = { label: 'Expense', color: '#EF4444' };
        } else if (t.transactionType === TransactionType.TRANSFER) {
            formattedAmount = rawFormatted;
            amountColor = isVoided ? '#94A3B8' : '#3B82F6'; // blue
            const src = accountMap.get(t.sourceAccountId);
            const dest = accountMap.get(t.destinationAccountId);
            accountDisplay = `${src ? src.name : 'Source'} → ${dest ? dest.name : 'Dest'}`;
            typeBadge = { label: 'Transfer', color: '#3B82F6' };
        } else if (t.transactionType === TransactionType.OPENING_BALANCE) {
            formattedAmount = rawFormatted;
            amountColor = isVoided ? '#94A3B8' : '#8B5CF6'; // purple
            const acc = accountMap.get(t.accountId);
            accountDisplay = acc ? acc.name : 'Opening Balance';
            typeBadge = { label: 'Opening Balance', color: '#8B5CF6' };
        } else if (t.transactionType === TransactionType.ADJUSTMENT) {
            formattedAmount = (t.balanceEffect === 'INCREASE' ? '+' : '-') + rawFormatted;
            amountColor = isVoided ? '#94A3B8' : '#F59E0B'; // amber
            const acc = accountMap.get(t.accountId);
            accountDisplay = acc ? acc.name : 'Adjustment';
            typeBadge = { label: 'Adjustment', color: '#F59E0B' };
        }

        return {
            id: t.id,
            rawTxn: t,
            date: t.date,
            description: t.description || 'Transaction',
            category: t.category || '',
            subcategory: t.subcategory || '',
            notes: t.notes || '',
            accountDisplay,
            formattedAmount,
            amountColor,
            typeBadge,
            isVoided,
            voidReason: t.voidReason || '',
            voidedAt: t.voidedAt || null,
            source: t.source || 'MANUAL',
            idempotencyKey: t.idempotencyKey || ''
        };
    });

    // 6. Group into Date Sections
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sectionMap = new Map();
    for (const row of formattedRows) {
        let sectionTitle = row.date;
        if (row.date === todayStr) {
            sectionTitle = 'Today';
        } else if (row.date === yesterdayStr) {
            sectionTitle = 'Yesterday';
        }

        if (!sectionMap.has(sectionTitle)) {
            sectionMap.set(sectionTitle, []);
        }
        sectionMap.get(sectionTitle).push(row);
    }

    const sections = [];
    for (const [title, data] of sectionMap.entries()) {
        sections.push({ title, data });
    }

    return {
        accounts: accountList,
        balanceSummaryCard,
        sections,
        totalTransactionCount: transactions.length,
        filteredCount: formattedRows.length
    };
}
