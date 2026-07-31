import { StorageService, STORAGE_KEYS } from './storage';

export const SettingsService = {
    // Get settings
    getSettings: async () => {
        const data = await StorageService.load(STORAGE_KEYS.USER_SETTINGS);
        return data || {
            name: 'User',
            email: '',
            phone: '',
            notifications: {
                push: true,
                email: false,
                offers: true
            },
            currency: 'INR',
            theme: 'Dark'
        };
    },

    // Save settings
    saveSettings: async (settings) => {
        await StorageService.save(STORAGE_KEYS.USER_SETTINGS, settings);
        return settings;
    },

    // Update specific field
    updateProfile: async (updates) => {
        const current = await SettingsService.getSettings();
        const updated = { ...current, ...updates };
        await StorageService.save(STORAGE_KEYS.USER_SETTINGS, updated);
        return updated;
    }
};
