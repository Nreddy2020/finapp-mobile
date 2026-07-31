import { StorageService, STORAGE_KEYS } from './storage';

export const IncomeCalendarService = {
    // Get all income entries
    getEntries: async () => {
        return await StorageService.load(STORAGE_KEYS.INCOME_CALENDAR) || [];
    },

    // Add a new income entry
    addEntry: async (entry) => {
        const entries = await IncomeCalendarService.getEntries();
        const newEntry = {
            id: Date.now().toString(),
            date: entry.date, // YYYY-MM-DD
            amount: parseFloat(entry.amount),
            source: entry.source || 'Gig',
            note: entry.note || '',
            timestamp: new Date().toISOString()
        };
        const updated = [...entries, newEntry];
        await StorageService.save(STORAGE_KEYS.INCOME_CALENDAR, updated);
        return updated;
    },

    // Delete an entry
    deleteEntry: async (id) => {
        const entries = await IncomeCalendarService.getEntries();
        const updated = entries.filter(e => e.id !== id);
        await StorageService.save(STORAGE_KEYS.INCOME_CALENDAR, updated);
        return updated;
    },

    // Get stats for a specific month (YYYY-MM)
    getMonthStats: async (monthStr) => {
        const entries = await IncomeCalendarService.getEntries();
        // Filter by month string prefix (e.g., "2025-10")
        const monthEntries = entries.filter(e => e.date.startsWith(monthStr));

        const totalIncome = monthEntries.reduce((sum, e) => sum + e.amount, 0);
        // Count unique days with income
        const uniqueDays = new Set(monthEntries.map(e => e.date)).size;

        return {
            totalIncome,
            workDays: uniqueDays,
            avgDaily: uniqueDays > 0 ? totalIncome / uniqueDays : 0,
            entries: monthEntries
        };
    }
};
