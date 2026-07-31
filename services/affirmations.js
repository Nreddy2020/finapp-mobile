import { StorageService, STORAGE_KEYS } from './storage';

export const AffirmationService = {
    getData: async () => {
        return await StorageService.load(STORAGE_KEYS.AFFIRMATIONS_DATA) || {
            journalEntries: [],
            gratitudeLogs: []
        };
    },

    saveJournalEntry: async (entry) => {
        const data = await AffirmationService.getData();
        const newEntry = {
            id: Date.now().toString(),
            text: entry,
            date: new Date().toISOString()
        };
        const updated = {
            ...data,
            journalEntries: [newEntry, ...data.journalEntries]
        };
        await StorageService.save(STORAGE_KEYS.AFFIRMATIONS_DATA, updated);
        return updated;
    },

    saveGratitudeLog: async (log) => {
        const data = await AffirmationService.getData();
        const newLog = {
            id: Date.now().toString(),
            items: log,
            date: new Date().toISOString()
        };
        const updated = {
            ...data,
            gratitudeLogs: [newLog, ...data.gratitudeLogs]
        };
        await StorageService.save(STORAGE_KEYS.AFFIRMATIONS_DATA, updated);
        return updated;
    }
};
