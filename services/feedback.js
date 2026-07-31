import { StorageService, STORAGE_KEYS } from './storage';

export const FeedbackService = {
    submitFeedback: async (rating, text) => {
        const logs = await StorageService.load(STORAGE_KEYS.FEEDBACK_LOGS) || [];
        const newLog = {
            id: Date.now().toString(),
            rating,
            text,
            timestamp: new Date().toISOString()
        };
        const updated = [...logs, newLog];
        await StorageService.save(STORAGE_KEYS.FEEDBACK_LOGS, updated);
        return true;
    }
};
