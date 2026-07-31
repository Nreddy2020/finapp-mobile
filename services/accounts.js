import { StorageService, STORAGE_KEYS } from './storage';

export const AccountsService = {
    // Get all accounts
    getAccounts: async () => {
        const data = await StorageService.load(STORAGE_KEYS.ACCOUNTS);
        return data || [];
    },

    // Add a new account
    addAccount: async (account) => {
        const accounts = await AccountsService.getAccounts();
        const newAccount = {
            id: Date.now().toString(),
            bank_name: account.bankName,
            type: account.type, // 'Savings', 'Current', 'Credit Card'
            account_number: account.accountNumber,
            balance: parseFloat(account.balance) || 0,
            isHidden: account.isHidden || false,
            createdAt: new Date().toISOString(),
        };

        const updated = [newAccount, ...accounts];
        await StorageService.save(STORAGE_KEYS.ACCOUNTS, updated);
        return updated;
    },

    // Update account
    updateAccount: async (id, updates) => {
        const accounts = await AccountsService.getAccounts();
        const updated = accounts.map(acc =>
            acc.id === id ? { ...acc, ...updates } : acc
        );
        await StorageService.save(STORAGE_KEYS.ACCOUNTS, updated);
        return updated;
    },

    // Delete account
    deleteAccount: async (id) => {
        const accounts = await AccountsService.getAccounts();
        const updated = accounts.filter(acc => acc.id !== id);
        await StorageService.save(STORAGE_KEYS.ACCOUNTS, updated);
        return updated;
    },

    // Calculate total balance
    calculateTotalBalance: (accounts) => {
        return accounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0);
    }
};
