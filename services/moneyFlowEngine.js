import { loadData, saveData, STORAGE_KEYS } from './storage';
import { ClassificationEngine } from './classificationEngine';
import { AccountsService } from './accounts';

const generateId = () => Date.now().toString() + Math.random().toString(36).substr(2, 9);

/**
 * Normalizes legacy records into the canonical Money Flow schema
 * @param {Object} record - The raw stored record
 * @param {string} sourceKey - STORAGE_KEYS.TRANSACTIONS or STORAGE_KEYS.INCOME
 */
const normalizeTransaction = (record, sourceKey) => {
    // Determine the type safely based on its origin or saved type
    let type = record.type;
    if (!type) {
        if (sourceKey === STORAGE_KEYS.INCOME) type = 'income';
        else type = 'expense'; // default for STORAGE_KEYS.TRANSACTIONS
    }

    // Amount can be in value (legacy) or amount (new)
    let amount = 0;
    if (record.amount !== undefined) amount = parseFloat(record.amount);
    else if (record.value !== undefined) amount = parseFloat(record.value);

    // Date can be in timestamp (legacy) or date (new) or createdAt
    const date = record.date || record.timestamp || record.createdAt || new Date().toISOString();

    return {
        id: record.id || record.transaction_id || generateId(),
        date,
        amount,
        currency: record.currency || 'INR',
        type,
        category: record.category || 'unknown',
        sourceAccountId: record.sourceAccountId || (type !== 'income' ? record.accountId || record.paymentMethod : undefined),
        destinationAccountId: record.destinationAccountId || (type === 'income' ? record.accountId || record.paymentMethod : undefined),
        merchant: record.merchant || '',
        description: record.description || record.title || '',
        source: record.source || 'manual',
        status: record.status || 'classified',
        linkedEntityType: record.linkedEntityType || null,
        linkedEntityId: record.linkedEntityId || null,
        createdAt: record.createdAt || date,
        updatedAt: record.updatedAt || record.createdAt || date,
        // Internal metadata for update/delete routing
        _storageSource: sourceKey
    };
};

export const MoneyFlowEngine = {
    /**
     * Unified read layer combining legacy incomes and expenses
     */
    getTransactions: async () => {
        try {
            const [legacyExpenses, legacyIncomes] = await Promise.all([
                loadData(STORAGE_KEYS.TRANSACTIONS, []),
                loadData(STORAGE_KEYS.INCOME, [])
            ]);

            const normalizedExpenses = (Array.isArray(legacyExpenses) ? legacyExpenses : [])
                .map(t => normalizeTransaction(t, STORAGE_KEYS.TRANSACTIONS));

            const normalizedIncomes = (Array.isArray(legacyIncomes) ? legacyIncomes : [])
                .map(t => normalizeTransaction(t, STORAGE_KEYS.INCOME));

            // Merge, sort by date descending
            const allTransactions = [...normalizedExpenses, ...normalizedIncomes].sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });

            return allTransactions;
        } catch (error) {
            console.error('Error in MoneyFlowEngine.getTransactions:', error);
            return [];
        }
    },

    /**
     * Aggregates balances from accounts and transaction history
     */
    getBalances: async () => {
        // Balances calculation is delegated to the AccountsService to maintain DRY principles
        // as AccountsService implements the ledger/reported balance logic.
        const accounts = await AccountsService.getAccounts();
        const totalReported = accounts.reduce((sum, acc) => sum + (parseFloat(acc.reportedBalance) || 0), 0);
        const totalLedger = accounts.reduce((sum, acc) => sum + (parseFloat(acc.ledgerBalance) || 0), 0);

        return {
            totalReported,
            totalLedger,
            accounts
        };
    },

    /**
     * Unified write layer
     */
    addTransaction: async (transactionData) => {
        const {
            amount,
            type, // 'income' | 'expense' | 'transfer'
            category,
            sourceAccountId,
            destinationAccountId,
            merchant,
            description,
            linkedEntityType,
            linkedEntityId
        } = transactionData;

        // Auto-classify if category is missing
        let finalCategory = category;
        if (!finalCategory) {
            const suggestion = ClassificationEngine.suggestClassification(description || merchant || '');
            finalCategory = suggestion.category;
            // Only override type if not explicitly set
            if (!type) transactionData.type = suggestion.type;
        }

        const newTransaction = {
            id: generateId(),
            date: transactionData.date || new Date().toISOString(),
            amount: parseFloat(amount),
            type: transactionData.type || 'expense',
            category: finalCategory || 'unknown',
            sourceAccountId: sourceAccountId || null,
            destinationAccountId: destinationAccountId || null,
            merchant: merchant || '',
            description: description || '',
            linkedEntityType: linkedEntityType || null,
            linkedEntityId: linkedEntityId || null,
            status: transactionData.status || 'classified',
            source: transactionData.source || 'manual',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Preserve backward compatibility by splitting writes
        if (newTransaction.type === 'income') {
            const incomes = await loadData(STORAGE_KEYS.INCOME, []);
            incomes.push(newTransaction);
            await saveData(STORAGE_KEYS.INCOME, incomes);
        } else {
            // Expenses and Transfers go to TRANSACTIONS
            const expenses = await loadData(STORAGE_KEYS.TRANSACTIONS, []);
            expenses.push(newTransaction);
            await saveData(STORAGE_KEYS.TRANSACTIONS, expenses);
        }

        return normalizeTransaction(newTransaction, newTransaction.type === 'income' ? STORAGE_KEYS.INCOME : STORAGE_KEYS.TRANSACTIONS);
    },

    /**
     * Update an existing transaction safely
     */
    updateTransaction: async (id, updates) => {
        let transactions = await loadData(STORAGE_KEYS.TRANSACTIONS, []);
        let incomes = await loadData(STORAGE_KEYS.INCOME, []);
        
        let foundIn = null;
        let index = transactions.findIndex(t => (t.id || t.transaction_id) === id);
        if (index !== -1) foundIn = STORAGE_KEYS.TRANSACTIONS;
        
        let incomeIndex = -1;
        if (!foundIn) {
            incomeIndex = incomes.findIndex(t => (t.id || t.transaction_id) === id);
            if (incomeIndex !== -1) foundIn = STORAGE_KEYS.INCOME;
        }

        if (!foundIn) throw new Error('Transaction not found');

        let updatedRecord = null;
        let isTypeChanged = false;

        if (foundIn === STORAGE_KEYS.TRANSACTIONS) {
            updatedRecord = { ...transactions[index], ...updates, updatedAt: new Date().toISOString() };
            // Check if type changed from expense/transfer to income
            if (updates.type && updates.type === 'income' && transactions[index].type !== 'income') {
                isTypeChanged = true;
                transactions.splice(index, 1);
                incomes.push(updatedRecord);
            } else {
                transactions[index] = updatedRecord;
            }
        } else {
            updatedRecord = { ...incomes[incomeIndex], ...updates, updatedAt: new Date().toISOString() };
            // Check if type changed from income to expense/transfer
            if (updates.type && updates.type !== 'income' && incomes[incomeIndex].type === 'income') {
                isTypeChanged = true;
                incomes.splice(incomeIndex, 1);
                transactions.push(updatedRecord);
            } else {
                incomes[incomeIndex] = updatedRecord;
            }
        }

        if (isTypeChanged || foundIn === STORAGE_KEYS.TRANSACTIONS) await saveData(STORAGE_KEYS.TRANSACTIONS, transactions);
        if (isTypeChanged || foundIn === STORAGE_KEYS.INCOME) await saveData(STORAGE_KEYS.INCOME, incomes);

        return normalizeTransaction(updatedRecord, foundIn);
    },

    /**
     * Delete a transaction safely
     */
    deleteTransaction: async (id) => {
        let transactions = await loadData(STORAGE_KEYS.TRANSACTIONS, []);
        const originalLength = transactions.length;
        transactions = transactions.filter(t => (t.id || t.transaction_id) !== id);
        
        if (transactions.length < originalLength) {
            await saveData(STORAGE_KEYS.TRANSACTIONS, transactions);
            return true;
        }

        let incomes = await loadData(STORAGE_KEYS.INCOME, []);
        const originalIncomeLength = incomes.length;
        incomes = incomes.filter(t => (t.id || t.transaction_id) !== id);
        
        if (incomes.length < originalIncomeLength) {
            await saveData(STORAGE_KEYS.INCOME, incomes);
            return true;
        }

        return false;
    }
};

export default MoneyFlowEngine;
